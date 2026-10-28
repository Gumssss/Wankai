// Game audio: synthesized SFX, formant placeholder voices and procedural music.
// Real clips in public/audio/sfx/, voices/ and music/ replace the synthesized
// versions when present (see public/audio/README.md).
// Safe to import and call in Node (no AudioContext): every method becomes a no-op.
import { clamp01 } from './audio/core.js';
import { hitSound, clashSound, splatSound, SKILL_SFX, tickSound, uiSound, resultSound } from './audio/sfx.js';
import { speakSkill } from './audio/voice.js';
import { MusicPlayer, BufferMusicPlayer, TRACKS } from './audio/music.js';

const EXTENSIONS = ['mp3', 'm4a', 'ogg', 'wav'];
export const VOICE_FILES = { laugh: 'naiwa-laugh', delivery: 'dudu-feidudu', happy: 'happy-cat', twist: 'stickman-twist' };
// Arena battle themes are file-only and decoded the first time they are wanted;
// without a file the arena plays the 'battle' music (its file, else procedural).
export const ARENA_MUSIC = Object.freeze({ colosseum: 'battle-colosseum', lakeside: 'battle-lakeside' });
const MUSIC_FALLBACK = Object.fromEntries(Object.values(ARENA_MUSIC).map(track => [track, 'battle']));
export const MUSIC_TRACKS = [...Object.keys(TRACKS), ...Object.keys(MUSIC_FALLBACK)];
/** The music track for a match in the given arena skin. */
export const battleMusic = skin => (Object.hasOwn(ARENA_MUSIC, skin ?? '') ? ARENA_MUSIC[skin] : 'battle');
const LOADING = Symbol('music file loading');
// Seconds after the skill SFX at which the voice line starts.
const VOICE_DELAY = { laugh: 0.27, delivery: 0.12, happy: 0.05, twist: 0 };
const CROSSFADE = 1;
const LOOKAHEAD = 0.2;
const TIMER_MS = 30;
const MUSIC_LEVEL = 0.75; // procedural mix headroom relative to the user music volume

function baseUrl() {
  try { return import.meta.env?.BASE_URL ?? './'; } catch { return './'; }
}

/** Fetch a file's bytes, or null when it is missing (the dev server answers missing files with index.html). */
async function loadBytes(url) {
  let response;
  try { response = await fetch(url); } catch { return readFileUrl(url); }
  try {
    if (!response.ok) return null;
    if ((response.headers.get('content-type') ?? '').includes('text/html')) return null;
    return await response.arrayBuffer();
  } catch { return null; }
}

// The packaged desktop game runs from file://, where fetch() is refused: XHR can still read it.
function readFileUrl(url) {
  if (typeof XMLHttpRequest === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'arraybuffer';
    request.onload = () => resolve(request.response?.byteLength ? request.response : null);
    request.onerror = () => resolve(null);
    request.send();
  });
}

export class GameAudio {
  /** options.context: inject an (Offline)AudioContext, used by render checks. */
  constructor(options = {}) {
    this._enabled = true;
    this.volumes = { music: 0.5, sfx: 0.8 };
    this.context = null;
    this.offline = false;
    this.clashBuffer = null;
    this.voiceBuffers = {};
    this.musicBuffers = {};
    this.musicLoads = new Map(); // track -> { done, promise }
    this.musicRequest = null;
    this.player = null;       // current music player
    this.fading = [];         // players fading out
    this.timer = null;
    this.activeVoices = new Map();
    this.assets = null;
    this.lastImpact = new Map();
    if (options.context) {
      this.context = options.context;
      this.offline = typeof options.context.startRendering === 'function';
      this.build();
    }
  }

  get enabled() { return this._enabled; }

  set enabled(value) {
    const next = Boolean(value);
    if (next === this._enabled) return;
    this._enabled = next;
    if (this.master) {
      const t = this.context.currentTime, param = this.master.gain;
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(next ? 1 : 0, t + 0.12);
    }
    this.syncMusic();
  }

  async unlock() {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    try {
      if (!this.context) {
        if (!Context) return;
        this.context = new Context();
        this.build();
      }
      if (!this.assets && !this.offline) this.assets = this.loadAssets();
      if (this.context.state === 'suspended' && !this.offline) await this.context.resume();
    } catch { /* Audio is optional; denied audio permissions never block play. */ }
    this.syncMusic();
  }

  build() {
    const ctx = this.context;
    // sfx/music buses -> master (on/off) -> limiter -> soft clip -> out
    this.sfxBus = ctx.createGain();
    this.musicBus = ctx.createGain();
    this.duck = ctx.createGain();
    this.master = ctx.createGain();
    this.master.gain.value = this._enabled ? 1 : 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.002; limiter.release.value = 0.15;
    const clip = ctx.createWaveShaper();
    const curve = new Float32Array(2049);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1, ax = Math.abs(x);
      curve[i] = Math.sign(x) * (ax < 0.7 ? ax : 0.7 + 0.28 * Math.tanh((ax - 0.7) / 0.28));
    }
    clip.curve = curve;
    this.musicBus.connect(this.duck); this.duck.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(limiter); limiter.connect(clip); clip.connect(ctx.destination);
    this.applyVolumes();
    ctx.onstatechange = () => this.syncMusic();
  }

  ready() {
    return Boolean(this.context && this.master && (this.offline || this.context.state === 'running'));
  }

  canPlay() { return this._enabled && this.ready(); }

  setVolumes({ music, sfx } = {}) {
    if (Number.isFinite(music)) this.volumes.music = clamp01(music);
    if (Number.isFinite(sfx)) this.volumes.sfx = clamp01(sfx);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.context || !this.sfxBus) return;
    const t = this.context.currentTime;
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, t, 0.03);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * MUSIC_LEVEL, t, 0.03);
  }

  // ---- assets -------------------------------------------------------------

  async loadFirst(name) {
    for (const extension of EXTENSIONS) {
      const bytes = await loadBytes(`${baseUrl()}audio/${name}.${extension}`);
      if (!bytes) continue;
      try { return await this.context.decodeAudioData(bytes); } catch { /* not audio: treat as absent */ }
    }
    return null;
  }

  async loadAssets() {
    const ctx = this.context;
    const tasks = [];
    tasks.push(loadBytes(`${baseUrl()}audio/sfx/weapon-clash.m4a`)
      .then(bytes => bytes && ctx.decodeAudioData(bytes))
      .then(buffer => { if (buffer) this.clashBuffer = buffer; })
      .catch(() => { /* keep the synthesized clash */ }));
    for (const name of new Set(Object.values(VOICE_FILES))) {
      tasks.push(this.loadFirst(`voices/${name}`).then(buffer => { if (buffer) this.voiceBuffers[name] = buffer; }).catch(() => {}));
    }
    for (const track of Object.keys(TRACKS)) tasks.push(this.loadMusic(track));
    await Promise.all(tasks);
  }

  /** Decode music/<track>.* once, then re-sync (switches to the file if the track is wanted). */
  loadMusic(track) {
    if (this.musicLoads.has(track)) return this.musicLoads.get(track).promise;
    const entry = { done: false };
    entry.promise = this.loadFirst(`music/${track}`)
      .then(buffer => { if (buffer) this.musicBuffers[track] = buffer; })
      .catch(() => {})
      .finally(() => { entry.done = true; this.syncMusic(); });
    this.musicLoads.set(track, entry);
    return entry.promise;
  }

  // ---- music --------------------------------------------------------------

  playMusic(track) {
    this.musicRequest = Object.hasOwn(TRACKS, track ?? '') || Object.hasOwn(MUSIC_FALLBACK, track ?? '') ? track : null;
    this.syncMusic();
  }

  /** What plays for a request: { name, fromFile }, null for silence, or LOADING while an arena file decodes. */
  resolveMusic(track) {
    if (!track) return null;
    if (this.musicBuffers[track]) return { name: track, fromFile: true };
    const fallback = MUSIC_FALLBACK[track];
    if (!fallback) return { name: track, fromFile: false };
    if (!this.offline) {
      if (!this.musicLoads.has(track)) this.loadMusic(track);
      if (!this.musicLoads.get(track).done) return LOADING;
    }
    return this.resolveMusic(fallback);
  }

  syncMusic() {
    if (!this.ready()) return;
    const want = this.resolveMusic(this._enabled ? this.musicRequest : null);
    if (want === LOADING) return; // keep the current music until the requested file is decoded
    const current = this.player;
    if (current && want && current.trackName === want.name && Boolean(current.fromFile) === want.fromFile) return;
    const t = this.context.currentTime;
    if (current) {
      current.fadeOut(t, want ? CROSSFADE : 0.3);
      this.fading.push(current);
      this.player = null;
    }
    if (want) {
      const start = t + 0.05;
      this.player = want.fromFile
        ? new BufferMusicPlayer(this.context, this.musicBus, want.name, this.musicBuffers[want.name], start)
        : new MusicPlayer(this.context, this.musicBus, want.name, start);
      this.player.fadeIn(t, current ? CROSSFADE : 0.6);
    }
    this.pumpMusic(t + LOOKAHEAD);
    this.ensureTimer();
  }

  /** Schedule music up to `until` and retire finished players (called by the timer). */
  pumpMusic(until) {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.player?.scheduleUntil(until);
    this.fading = this.fading.filter(player => {
      if (!player.finished(now)) { player.scheduleUntil(until); return true; }
      player.dispose();
      return false;
    });
    if (!this.player && this.fading.length === 0) this.stopTimer();
  }

  ensureTimer() {
    if (this.offline || this.timer || !this.context || (!this.player && this.fading.length === 0)) return;
    this.timer = setInterval(() => {
      if (!this.context || this.context.state === 'closed') { this.stopTimer(); return; }
      this.pumpMusic(this.context.currentTime + LOOKAHEAD);
    }, TIMER_MS);
  }

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Lower the music for `duration` seconds (voices, jingles). */
  duckMusic(level, duration) {
    if (!this.duck) return;
    const t = this.context.currentTime, param = this.duck.gain;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); }
    param.setTargetAtTime(level, t, 0.06);
    param.setTargetAtTime(1, t + duration, 0.35);
  }

  // ---- effects --------------------------------------------------------------

  now() { return this.context.currentTime + 0.005; }

  impact(event) {
    if (!event || !this.canPlay()) return;
    const type = event.type;
    if (type !== 'hit' && type !== 'clash' && type !== 'splat') return;
    const t = this.now();
    // Guard against bursts within one frame; keep the first of near-simultaneous events per attacker.
    const key = `${type}:${event.attacker ?? ''}`;
    if (t - (this.lastImpact.get(key) ?? -1) < 0.03) return;
    this.lastImpact.set(key, t);
    try {
      if (type === 'hit') hitSound(this.context, this.sfxBus, t, event);
      else if (type === 'splat') splatSound(this.context, this.sfxBus, t, event);
      else clashSound(this.context, this.sfxBus, t, event, (rate, gain) => this.playClashBuffer(t, rate, gain));
    } catch { /* never let audio break the game loop */ }
  }

  playClashBuffer(t, rate, level) {
    if (!this.clashBuffer) return false;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = this.clashBuffer;
    source.playbackRate.value = rate;
    gain.gain.value = level;
    source.connect(gain); gain.connect(this.sfxBus);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(t);
    return true;
  }

  skill(event) {
    const skill = event?.skill;
    if (!Object.hasOwn(VOICE_DELAY, skill ?? '') || !this.canPlay()) return;
    const t = this.now();
    try {
      SKILL_SFX[skill](this.context, this.sfxBus, t);
      this.voice(skill, t + VOICE_DELAY[skill]);
    } catch { /* optional */ }
  }

  /** Play the voice line for a skill: the dropped-in file if present, else the synth placeholder. */
  voice(skill, t) {
    const name = VOICE_FILES[skill];
    const buffer = this.voiceBuffers[name];
    if (!buffer && skill === 'twist') return; // the twist has no synthesized voice
    // A voice never overlaps itself: a retrigger fades the previous take out quickly.
    const previous = this.activeVoices.get(name);
    if (previous && previous.end > this.context.currentTime) {
      const param = previous.gain.gain;
      param.cancelScheduledValues(t);
      param.setValueAtTime(param.value, t);
      param.linearRampToValueAtTime(0, t + 0.05);
      try { previous.source?.stop(t + 0.06); } catch { /* already stopped */ }
    }
    const gain = this.context.createGain();
    gain.connect(this.sfxBus);
    let end, source;
    if (buffer) {
      source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(t);
      end = t + buffer.duration;
      source.onended = () => { source.disconnect(); gain.disconnect(); };
    } else {
      end = speakSkill(this.context, gain, t, skill).end;
      const keeper = this.context.createConstantSource();
      const mute = this.context.createGain(); mute.gain.value = 0;
      keeper.connect(mute); mute.connect(gain);
      keeper.onended = () => { keeper.disconnect(); mute.disconnect(); gain.disconnect(); };
      keeper.start(t); keeper.stop(end + 0.1);
    }
    this.activeVoices.set(name, { gain, end, source });
    this.duckMusic(0.4, end - this.context.currentTime);
  }

  tick(final = false) {
    if (!this.canPlay()) return;
    try { tickSound(this.context, this.sfxBus, this.now(), final); } catch { /* optional */ }
  }

  result(outcome) {
    if (!this.canPlay()) return;
    try {
      const length = resultSound(this.context, this.sfxBus, this.now(), outcome);
      if (length > 0) this.duckMusic(0.25, length);
    } catch { /* optional */ }
  }

  ui(kind) {
    if (!this.canPlay()) return;
    try { uiSound(this.context, this.sfxBus, this.now(), kind); } catch { /* optional */ }
  }

  /** Legacy simple tone (kept for compatibility). */
  tone(start, end, duration, volume = 0.3, type = 'sine') {
    if (!this.canPlay()) return;
    try {
      const ctx = this.context, t = this.now();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, start), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain); gain.connect(this.sfxBus);
      osc.start(t); osc.stop(t + duration);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch { /* optional */ }
  }
}
