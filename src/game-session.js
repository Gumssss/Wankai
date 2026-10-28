import { ArenaPhysics, CONFIG, MATCH_ARENA_SCALE } from './physics.js';
import { GameAudio, battleMusic } from './audio.js';
import { DEFAULT_LOADOUTS, PLAYABLE_LOADOUTS, normalizeLoadout } from './loadouts.js';
import { ARENA_OBSTACLES } from './arena-obstacles.js';
import { ARENA_SKINS, DEFAULT_ARENA_SKIN, isArenaSkin } from './arena-skins.js';
import { createAi, AI_DIFFICULTIES } from './ai-opponent.js';
import { SKILLS } from './skills.js';

// Floating words for skills, shown above the fighter like damage numbers.
const SKILL_WORDS = { laugh: '哈哈哈哈!', twist: '绕后!', delivery: '你的胆子真的肥嘟嘟的!', happy: 'Happy Happy!' };

// One local fighter per machine. The opponent is the AI or, online, the other
// player. Online, the host simulates (authority) and the guest only displays
// snapshots (replica); a NetSession attached as `net` carries the messages.
export const MATCH_MODES = Object.freeze(['ai', 'online']);
export const CONTROL_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF']);
const MATCH_STATES = new Set(['countdown', 'playing', 'result']);

export class GameSession {
  // makeAi lets tools and tests swap the opponent's brain (e.g. an idle one).
  // randomOpponent: every AI round draws the AI's character and weapon at
  // random (players never pick them); tests turn it off to fix both fighters.
  constructor({ audio = new GameAudio(), makeAi = createAi, randomOpponent = true } = {}) {
    this.makeAi = makeAi;
    this.randomOpponent = randomOpponent;
    this.world = new ArenaPhysics();
    this.sound = audio;
    this.keys = new Set();
    this.listeners = new Set();
    this.state = 'lobby';
    this.previousState = 'playing';
    this.mode = MATCH_MODES[0];
    this.localPlayerId = 0;
    // Camera yaw the local body turns toward; written by the renderer each frame.
    this.localFaceYaw = null;
    // The setup screen's draft { id, characterId, weaponId }; the renderer
    // shows it alone in the arena while set. Not part of the snapshot.
    this.setupPreview = null;
    // A skill press between frames still triggers on the next physics step.
    this.skillTap = false;
    this.aiDifficulty = 'normal';
    this.arenaSkin = DEFAULT_ARENA_SKIN;
    this.aiSeed = 1;
    this.ai = this.makeAi({ difficulty: this.aiDifficulty, seed: this.aiSeed });
    // Online: latest input from the remote player (host side only).
    this.remoteInput = { theta: 0, phi: 0 };
    this.replica = false;
    this.net = null;
    this.netInfo = null;
    // Online matches never pause; Esc only opens this local menu.
    this.menuOpen = false;
    this.loadouts = DEFAULT_LOADOUTS.map(p => Object.freeze({ ...p }));
    this.resetWorld();
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.countdownNumber = -1;
    this.readoutTimer = 0;
    this.nextEffectId = 0;
    this.effects = [];
    this.readout = null;
    this.visualRevision = 0;
    this.error = null;
    this.snapshot = this.makeSnapshot();
  }

  subscribe = listener => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  resetWorld() {
    // Each skin's visible rim sets how high weapons meet it.
    const rimHeight = ARENA_SKINS.find(skin => skin.id === this.arenaSkin)?.rimHeight;
    this.world.reset(...this.loadouts, { arenaScale: MATCH_ARENA_SCALE, obstacles: ARENA_OBSTACLES, rimHeight });
  }

  get opponentId() { return 1 - this.localPlayerId; }

  makeSnapshot() {
    return {
      state: this.state,
      mode: this.mode,
      localPlayerId: this.localPlayerId,
      loadouts: Object.freeze(this.loadouts.map(p => Object.freeze({ ...p }))),
      pressed: [...this.keys],
      // Healing is continuous; the HUD shows whole points.
      health: this.world.players.map(player => Math.ceil(player.health)),
      stamina: this.world.players.map(player => player.stamina),
      skills: this.world.players.map(player => ({ id: player.skill, active: player.skillActive,
        time: Math.ceil(player.skillTime * 10) / 10, cooldown: Math.ceil(player.skillCooldown * 10) / 10 })),
      seconds: Math.floor(this.world.time),
      winner: this.world.winner,
      countdownText: this.state === 'countdown' ? (this.countdownNumber > 0 ? String(this.countdownNumber) : '') :
        this.state === 'playing' && this.countdown < 0 ? '抡起来' : '',
      readout: this.readout,
      effects: [...this.effects],
      soundEnabled: this.sound.enabled,
      aiDifficulty: this.aiDifficulty,
      arenaSkin: this.arenaSkin,
      menuOpen: this.menuOpen,
      net: this.netInfo,
      error: this.error,
    };
  }

  publish() {
    const next = this.makeSnapshot();
    if (JSON.stringify(next) === JSON.stringify(this.snapshot)) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  // W swings toward where you look and S away, whichever way A/D has turned
  // the weapon: when a swing starts with the weapon facing behind the view,
  // the rotation is mirrored. The choice holds until W/S are released, so
  // turning mid-swing never reverses it.
  localInput() {
    const swing = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    if (!swing) this.swingSign = 0;
    else if (!this.swingSign) {
      const player = this.world.players[this.localPlayerId];
      this.swingSign = player && Number.isFinite(this.localFaceYaw) && Math.cos(player.phi - this.localFaceYaw) < 0 ? -1 : 1;
    }
    const input = { theta: swing * (this.swingSign || 1), phi: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) };
    if (this.skillTap) input.skillTap = true;
    if (Number.isFinite(this.localFaceYaw)) input.faceYaw = this.localFaceYaw;
    return input;
  }

  opponentInput() {
    if (this.mode === 'online') return { ...this.remoteInput };
    if (this.state !== 'playing') return { theta: 0, phi: 0 };
    return this.ai.think(this.world, this.opponentId);
  }

  getInputs() {
    const inputs = [];
    inputs[this.localPlayerId] = this.menuOpen ? { theta: 0, phi: 0 } : this.localInput();
    inputs[this.opponentId] = this.opponentInput();
    return inputs;
  }

  syncPolarInputs() {
    if (this.replica) return;
    this.getInputs().forEach((input, id) => {
      if (this.world.winner === null || id === this.world.winner) this.world.setPolarInput(id, input.theta);
    });
  }

  keyDown(code) {
    if (!CONTROL_KEYS.has(code) || !MATCH_STATES.has(this.state) || this.menuOpen) return;
    // After the round only the winner keeps moving.
    if (this.state === 'result' && this.world.winner !== this.localPlayerId) return;
    if (this.keys.has(code)) return;
    this.keys.add(code);
    if (code === 'KeyF') this.skillTap = true;
    this.syncPolarInputs();
    this.publish();
  }

  keyUp(code) {
    if (!this.keys.delete(code)) return;
    this.syncPolarInputs();
    this.publish();
  }

  clearKeys() {
    this.skillTap = false;
    this.swingSign = 0;
    if (this.keys.size === 0) return;
    this.keys.clear();
    this.syncPolarInputs();
    this.publish();
  }

  setLoadouts(values) {
    if (this.state !== 'lobby' || !Array.isArray(values) || values.length !== 2) return false;
    let next;
    try { next = values.map(value => Object.freeze(normalizeLoadout(value))); } catch { return false; }
    if (next.every((p, id) => p.characterId === this.loadouts[id].characterId && p.weaponId === this.loadouts[id].weaponId)) return true;
    this.loadouts = next;
    this.resetWorld();
    this.visualRevision++;
    this.publish();
    return true;
  }

  setAiDifficulty(difficulty) {
    if (!AI_DIFFICULTIES[difficulty]) return;
    this.aiDifficulty = difficulty;
    this.ai = this.makeAi({ difficulty, seed: this.aiSeed });
    this.publish();
  }

  setArenaSkin(skin) {
    if (!isArenaSkin(skin) || skin === this.arenaSkin) return;
    this.arenaSkin = skin;
    if (this.state === 'lobby') this.resetWorld();
    this.visualRevision++;
    this.publish();
  }

  startRound(mode = this.mode) {
    if (!MATCH_MODES.includes(mode)) throw new Error(`Unknown game mode: ${mode}`);
    this.mode = mode;
    void this.sound.unlock();
    this.clearKeys();
    if (mode === 'ai' && this.randomOpponent) {
      const pick = PLAYABLE_LOADOUTS[Math.floor(Math.random() * PLAYABLE_LOADOUTS.length)];
      this.loadouts = [this.loadouts[0], Object.freeze({ ...pick })];
    }
    this.resetWorld();
    this.aiSeed++;
    this.ai = this.makeAi({ difficulty: this.aiDifficulty, seed: this.aiSeed });
    this.remoteInput = { theta: 0, phi: 0 };
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.readoutTimer = 0;
    this.accumulator = 0;
    this.freeze = 0;
    this.menuOpen = false;
    this.state = 'countdown';
    this.sound.playMusic?.(battleMusic(this.arenaSkin));
    this.countdown = 2.4;
    this.countdownNumber = -1;
    this.error = null;
    this.publish();
  }

  goHome() {
    this.state = 'lobby';
    this.sound.playMusic?.('menu');
    this.menuOpen = false;
    this.clearKeys();
    this.resetWorld();
    this.visualRevision++;
    this.effects = [];
    this.readout = null;
    this.accumulator = 0;
    this.freeze = 0;
    this.countdown = 0;
    this.publish();
  }

  pause() {
    if (!MATCH_STATES.has(this.state)) return;
    this.clearKeys();
    if (this.mode === 'online') { this.menuOpen = true; this.publish(); return; }
    this.previousState = this.state;
    this.state = 'paused';
    this.accumulator = 0;
    this.publish();
  }

  resume() {
    if (this.menuOpen) { this.menuOpen = false; this.publish(); return; }
    if (this.state !== 'paused' || this.error) return;
    this.state = this.previousState;
    this.accumulator = 0;
    this.publish();
  }

  toggleSound(enabled = !this.sound.enabled) {
    this.sound.enabled = enabled;
    if (this.sound.enabled) { void this.sound.unlock(); this.sound.tick(); }
    this.publish();
  }

  contextLost() {
    this.pause();
    this.error = '图形上下文已中断，请重新加载游戏。';
    this.publish();
  }

  impact(event) {
    if (event.type === 'skill') { this.skillCue(event); return; }
    this.sound.impact(event);
    if (event.type !== 'hit') return;
    this.freeze = Math.max(this.freeze, 0.028 + event.strength * 0.055);
    this.effects.push({ id: ++this.nextEffectId, point: { ...event.point }, damage: event.damage, life: 0.95, maxLife: 0.95 });
    this.readout = event.source === 'delivery' ? { label: '外卖送达', damage: event.damage, detail: '投掷命中 · 击退' } : {
      label: event.damage >= 22 ? '漂亮的一击' : '有效命中',
      damage: event.damage,
      detail: `${event.speed.toFixed(1)} m/s · 发力加成 ${Math.round(30 * Math.min(event.acceleration / 48, 1))}%${event.turnShare > 0.01 ? ' · 横转伤害降低' : ''}`,
    };
    this.readoutTimer = 3;
    this.publish();
  }

  skillCue(event) {
    this.sound.skill?.(event);
    const player = this.world.players[event.player];
    const at = event.to ?? event.point ?? player?.p;
    if (!at) return;
    const life = event.skill === 'laugh' ? SKILLS.laugh.duration : 1.6;
    this.effects.push({ id: ++this.nextEffectId, point: { x: at.x, y: at.y + 1.2, z: at.z }, text: SKILL_WORDS[event.skill] ?? '',
      kind: event.skill, follow: event.player, life, maxLife: life });
    this.publish();
  }

  // A tap reaches exactly one physics step.
  consumeSkillTap(inputs) {
    for (const input of inputs) if (input) delete input.skillTap;
    this.skillTap = false;
    delete this.remoteInput.skillTap;
  }

  finishRound() {
    this.state = 'result';
    this.menuOpen = false;
    this.clearKeys();
    const winner = this.world.winner;
    this.sound.result?.(winner === -1 || winner === null ? 'draw' : winner === this.localPlayerId ? 'win' : 'lose');
    this.publish();
  }

  // Advance the fixed-step world; returns this frame's impact events.
  simulate(dt, stopAtWinner) {
    const impacts = [];
    this.accumulator += dt;
    const inputs = this.getInputs();
    let steps = 0;
    while (this.accumulator >= CONFIG.step && steps++ < 12) {
      this.world.step(inputs);
      this.consumeSkillTap(inputs);
      this.accumulator -= CONFIG.step;
      for (const event of this.world.events) { impacts.push(event); if (stopAtWinner) this.impact(event); }
      if (stopAtWinner && this.world.winner !== null) { this.accumulator = 0; this.finishRound(); break; }
      if (this.freeze > 0) { this.accumulator = 0; break; }
    }
    return impacts;
  }

  tick(rawDelta) {
    const dt = Math.min(rawDelta, 0.06);
    let impacts = [];
    if (this.replica) impacts = this.net?.replicaTick(dt) ?? [];
    else if (this.state === 'countdown') {
      this.countdown -= dt;
      const number = Math.ceil(this.countdown / 0.8);
      if (number !== this.countdownNumber && number > 0) {
        this.countdownNumber = number;
        this.sound.tick();
        this.publish();
      }
      if (this.countdown <= 0) {
        this.state = 'playing';
        this.accumulator = 0;
        this.countdown = -0.55;
        this.sound.tick(true);
        this.publish();
      }
    } else if (this.state === 'playing') {
      if (this.countdown < 0) {
        this.countdown += dt;
        if (this.countdown >= 0) this.publish();
      }
      if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);
      else impacts = this.simulate(dt, true);
      this.publish();
    } else if (this.state === 'result') {
      this.simulate(dt, false);
      this.publish();
    }
    if (!this.replica) this.net?.afterTick(dt, impacts);
    const effectDt = this.state === 'paused' ? 0 : dt;
    if (this.readoutTimer > 0) {
      this.readoutTimer -= effectDt;
      if (this.readoutTimer <= 0) { this.readout = null; this.publish(); }
    }
    if (this.effects.length) {
      for (const effect of this.effects) effect.life -= effectDt;
      const before = this.effects.length;
      this.effects = this.effects.filter(effect => effect.life > 0);
      if (this.effects.length !== before) this.publish();
    }
    return impacts;
  }
}
