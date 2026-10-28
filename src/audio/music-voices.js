// Warm, organic instrument voices for the background music. Every note plays
// into a "bus" ({ ctx, dry, verb, delay }) through its own pan + effect sends,
// and disconnects itself when its source ends.
import { noiseBuffer, rand } from './core.js';

const WAVES = {
  felt: [0, 1, 0.5, 0.26, 0.15, 0.08, 0.045, 0.025, 0.012],
  upright: [0, 1, 0.5, 0.2, 0.09, 0.04],
  reed: Array.from({ length: 24 }, (_, n) => (n === 0 ? 0 : 1 / n ** 1.3)),
};
const waveCache = new WeakMap();
function wave(ctx, name) {
  let cache = waveCache.get(ctx);
  if (!cache) waveCache.set(ctx, cache = {});
  if (!cache[name]) {
    const amps = WAVES[name];
    cache[name] = ctx.createPeriodicWave(new Float32Array(amps.length), Float32Array.from(amps));
  }
  return cache[name];
}

/** Pan + effect sends for one note. Returns { input, release() }. */
function patch(bus, pan = 0, verb = 0, delay = 0) {
  const { ctx } = bus;
  const input = ctx.createGain();
  const nodes = [input];
  let head = input;
  if (pan && ctx.createStereoPanner) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    input.connect(panner); head = panner; nodes.push(panner);
  }
  head.connect(bus.dry);
  for (const [amount, target] of [[verb, bus.verb], [delay, bus.delay]]) {
    if (!(amount > 0) || !target) continue;
    const send = ctx.createGain(); send.gain.value = amount;
    head.connect(send); send.connect(target); nodes.push(send);
  }
  return { input, release: () => { for (const node of nodes) node.disconnect(); } };
}

function finish(sources, nodes, out, end) {
  sources[0].onended = () => {
    for (const node of [...sources, ...nodes]) node.disconnect();
    out.release();
  };
  for (const source of sources) source.stop(end);
}

/**
 * Struck/plucked envelope: soft attack, fast initial drop to `body`, natural decay,
 * damped release at note-off (`length`). Returns the time the voice is silent.
 */
function strike(param, t, { attack, peak, body = 0.4, drop = 0.12, decay, length, release = 0.07 }) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  const settle = t + attack + drop * 2;
  const off = t + Math.max(attack + 0.02, length);
  if (off <= settle) {
    param.setTargetAtTime(peak * body, t + attack, drop);
    param.setTargetAtTime(0, off, release);
    return off + release * 7;
  }
  param.setTargetAtTime(peak * body, t + attack, drop);
  param.setTargetAtTime(0, settle, decay / 6);
  const end = Math.min(settle + decay, off + release * 7);
  if (off < settle + decay) param.setTargetAtTime(0, off, release);
  return end;
}

// Static filters only: an automated biquad recomputes its coefficients every
// sample, which is the most expensive thing a note could do.
function lowpass(ctx, cutoff, q = 0.4) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = q;
  filter.frequency.value = Math.min(16000, cutoff);
  return filter;
}

/** Felt piano: two slightly detuned strings, soft hammer, brightness tied to velocity. */
export function feltPiano(bus, t, freq, { vel = 0.7, length = 0.6, pan = 0, verb = 0.3, delay = 0 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, delay);
  const decay = Math.max(1.1, Math.min(3.4, 3.4 - Math.log2(freq / 110) * 0.65));
  const filter = lowpass(ctx, freq * (2 + 3.5 * vel) + 300);
  const amp = ctx.createGain();
  const end = strike(amp.gain, t, { attack: 0.006 + (1 - vel) * 0.008, peak: 0.11 * vel, body: 0.45, drop: 0.14, decay, length, release: 0.09 });
  const sources = [-1, 1].map(side => {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave(ctx, 'felt'));
    osc.frequency.value = freq;
    osc.detune.value = side * rand(1.5, 4.5);
    osc.connect(filter);
    osc.start(t);
    return osc;
  });
  filter.connect(amp); amp.connect(out.input);
  finish(sources, [filter, amp], out, end);
}

/** Marimba bar with a resonator tube: round fundamental + quick "tok" partial + soft mallet. */
export function marimba(bus, t, freq, { vel = 0.7, length = 0.5, pan = 0, verb = 0.25, delay = 0 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, delay);
  const decay = Math.max(0.5, Math.min(1.6, 1.6 - Math.log2(freq / 200) * 0.4));
  const fundamental = ctx.createOscillator(), overtone = ctx.createOscillator();
  fundamental.frequency.value = freq; overtone.frequency.value = freq * 3.94;
  fundamental.detune.value = rand(-3, 3);
  const g1 = ctx.createGain(), g2 = ctx.createGain();
  const end = strike(g1.gain, t, { attack: 0.004, peak: 0.16 * vel, body: 0.6, drop: 0.05, decay, length: Math.max(length, decay), release: 0.1 });
  strike(g2.gain, t, { attack: 0.002, peak: 0.05 * vel, body: 0.2, drop: 0.012, decay: 0.12, length: 0.1, release: 0.03 });
  fundamental.connect(g1); overtone.connect(g2); g1.connect(out.input); g2.connect(out.input);
  fundamental.start(t); overtone.start(t);
  finish([fundamental, overtone], [g1, g2], out, end);
  noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: Math.min(6000, freq * 4), q: 1 }], peak: 0.02 * vel, decay: 0.012, pan, verb: 0 });
}

/** Kalimba tine: warm sine, short bright overtone, gentle octave shimmer. */
export function kalimba(bus, t, freq, { vel = 0.7, length = 1, pan = 0, verb = 0.3, delay = 0 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, delay);
  const oscs = [[1, 0.14, 1.4], [5.95, 0.025, 0.1], [2.01, 0.02, 0.5]].map(([ratio, peak, decay]) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.value = freq * ratio;
    strike(gain.gain, t, { attack: 0.003, peak: peak * vel, body: 0.55, drop: 0.04, decay, length: Math.max(length, decay), release: 0.12 });
    osc.connect(gain); gain.connect(out.input); osc.start(t);
    return { osc, gain };
  });
  finish(oscs.map(o => o.osc), oscs.map(o => o.gain), out, t + 1.6);
}

/** Upright-ish bass: round plucked string, slight pitch settle, finger noise. */
export function upright(bus, t, freq, { vel = 0.7, length = 0.4, pan = 0, verb = 0.08, bright = 1 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, 0);
  const string = ctx.createOscillator(), sub = ctx.createOscillator();
  string.setPeriodicWave(wave(ctx, 'upright'));
  string.frequency.setValueAtTime(freq * 1.015, t);
  string.frequency.setTargetAtTime(freq, t, 0.025);
  sub.frequency.value = freq;
  const filter = lowpass(ctx, (380 + 420 * vel) * bright, 0.6);
  const amp = ctx.createGain(), subGain = ctx.createGain();
  subGain.gain.value = 0.5;
  const end = strike(amp.gain, t, { attack: 0.01, peak: 0.34 * vel, body: 0.55, drop: 0.09, decay: 1.6, length, release: 0.06 });
  string.connect(filter); sub.connect(subGain); subGain.connect(filter); filter.connect(amp); amp.connect(out.input);
  string.start(t); sub.start(t);
  finish([string, sub], [filter, amp, subGain], out, end);
  noiseHit(bus, t, { filters: [{ type: 'lowpass', freq: 420 }], peak: 0.07 * vel, decay: 0.035, verb: 0 });
}

/** Reedy lead (battle hook): detuned soft saws, filter swell, delayed vibrato on long notes. */
export function reedLead(bus, t, freq, { vel = 0.7, length = 0.25, pan = 0, verb = 0.18, delay = 0.22 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, delay);
  const filter = lowpass(ctx, freq * (2.4 + 1.6 * vel), 1);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.06 * vel, t + 0.014);
  amp.gain.setTargetAtTime(0.045 * vel, t + 0.014, 0.08);
  const off = t + Math.max(0.05, length);
  amp.gain.setTargetAtTime(0, off, 0.05);
  const end = off + 0.35;
  const sources = [-1, 1].map(side => {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(wave(ctx, 'reed'));
    osc.frequency.value = freq;
    osc.detune.value = side * rand(4, 8);
    osc.connect(filter);
    osc.start(t);
    return osc;
  });
  const nodes = [filter, amp];
  if (length > 0.28) {
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = rand(5, 6);
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(0, t + 0.16);
    depth.gain.linearRampToValueAtTime(18, t + 0.4);
    lfo.connect(depth);
    for (const osc of sources) depth.connect(osc.detune);
    lfo.start(t);
    sources.push(lfo); nodes.push(depth);
  }
  filter.connect(amp); amp.connect(out.input);
  finish(sources, nodes, out, end);
}

/** Soft sustained pad (reed wave, slow attack, dark). */
export function softPad(bus, t, freq, { vel = 0.5, length = 2, pan = 0, verb = 0.4 } = {}) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, 0);
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave(ctx, 'reed'));
  osc.frequency.value = freq;
  osc.detune.value = rand(-7, 7);
  const filter = lowpass(ctx, 1100, 0.3);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.025 * vel, t + length * 0.35);
  amp.gain.setTargetAtTime(0, t + length * 0.75, length * 0.12);
  osc.connect(filter); filter.connect(amp); amp.connect(out.input);
  osc.start(t);
  finish([osc], [filter, amp], out, t + length * 1.4);
}

/** Shaped noise hit. filters: [{ type, freq, freqEnd, glide, q }] */
export function noiseHit(bus, t, { filters, attack = 0.002, peak = 0.1, decay = 0.1, pan = 0, verb = 0 }) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, 0);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  const nodes = filters.map(f => {
    const filter = ctx.createBiquadFilter();
    filter.type = f.type; filter.Q.value = f.q ?? 0.7;
    filter.frequency.setValueAtTime(f.freq, t);
    if (f.freqEnd) filter.frequency.exponentialRampToValueAtTime(f.freqEnd, t + (f.glide ?? decay));
    return filter;
  });
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + attack);
  amp.gain.setTargetAtTime(0, t + attack, decay / 5);
  let head = source;
  for (const node of nodes) { head.connect(node); head = node; }
  head.connect(amp); amp.connect(out.input);
  source.start(t, rand(0, 1.5));
  finish([source], [...nodes, amp], out, t + attack + decay + 0.02);
}

/** Pitched drum body (kick, toms, snare shell). */
export function drumTone(bus, t, { from, to, tau = 0.04, peak = 0.3, decay = 0.25, pan = 0, verb = 0, type = 'sine' }) {
  const { ctx } = bus;
  const out = patch(bus, pan, verb, 0);
  const osc = ctx.createOscillator(), amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.setTargetAtTime(to, t, tau);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.002);
  amp.gain.setTargetAtTime(0, t + 0.002, decay / 5);
  osc.connect(amp); amp.connect(out.input);
  osc.start(t);
  finish([osc], [amp], out, t + decay + 0.02);
}

// ---- kit ----------------------------------------------------------------

export const kit = {
  kick(bus, t, vel = 0.8, soft = false) {
    drumTone(bus, t, { from: soft ? 105 : 150, to: soft ? 52 : 47, tau: soft ? 0.035 : 0.028, peak: (soft ? 0.32 : 0.48) * vel, decay: soft ? 0.32 : 0.38 });
    noiseHit(bus, t, { filters: [{ type: 'lowpass', freq: soft ? 1400 : 3200 }], peak: (soft ? 0.05 : 0.12) * vel, decay: 0.012 });
  },
  snare(bus, t, vel = 0.8) {
    drumTone(bus, t, { from: 240, to: 180, tau: 0.03, peak: 0.13 * vel, decay: 0.11, type: 'triangle', verb: 0.12, pan: 0.04 });
    noiseHit(bus, t, { filters: [{ type: 'highpass', freq: 1100 }, { type: 'peaking', freq: 3500, q: 0.8 }], peak: 0.2 * vel, decay: 0.12 + 0.08 * vel, verb: 0.2, pan: 0.04 });
  },
  clap(bus, t, vel = 0.6) {
    for (let i = 0; i < 3; i++) noiseHit(bus, t + i * 0.009, { filters: [{ type: 'bandpass', freq: 1500, q: 1.3 }], peak: 0.12 * vel * (i === 2 ? 1 : 0.6), decay: i === 2 ? 0.14 : 0.012, verb: 0.25, pan: -0.08 });
  },
  hat(bus, t, vel = 0.6, open = false, pan = 0.28) {
    noiseHit(bus, t, { filters: [{ type: 'highpass', freq: 7000 }, { type: 'peaking', freq: 10000, q: 1 }], peak: 0.07 * vel, decay: open ? 0.3 : 0.04 + 0.02 * vel, pan, verb: 0.08 });
  },
  shaker(bus, t, vel = 0.5, pan = -0.3) {
    noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: rand(5500, 7000), q: 1.2 }], attack: 0.012, peak: 0.05 * vel, decay: 0.06, pan, verb: 0.1 });
  },
  brushTap(bus, t, vel = 0.6, pan = 0.1) {
    noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: rand(2600, 3400), q: 0.55 }], attack: 0.004, peak: 0.1 * vel, decay: 0.09 + 0.08 * vel, pan, verb: 0.25 });
    drumTone(bus, t, { from: 230, to: 200, peak: 0.03 * vel, decay: 0.06, type: 'triangle', pan });
  },
  brushSwirl(bus, t, length, vel = 0.5, pan = 0) {
    noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: rand(1500, 1900), freqEnd: rand(2400, 3000), glide: length, q: 0.8 }],
      attack: length * 0.55, peak: 0.035 * vel, decay: length * 0.7, pan, verb: 0.2 });
  },
  tom(bus, t, freq, vel = 0.7, pan = 0) {
    drumTone(bus, t, { from: freq * 1.45, to: freq, tau: 0.03, peak: 0.26 * vel, decay: 0.3, pan, verb: 0.15 });
    noiseHit(bus, t, { filters: [{ type: 'lowpass', freq: 1800 }], peak: 0.05 * vel, decay: 0.03, pan });
  },
  cymbal(bus, t, vel = 0.5, pan = 0.25) {
    noiseHit(bus, t, { filters: [{ type: 'highpass', freq: 4200 }, { type: 'peaking', freq: 8000, q: 0.6 }], peak: 0.06 * vel, decay: 1.6, pan, verb: 0.3 });
  },
  ride(bus, t, vel = 0.5, pan = 0.3) {
    noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: 7500, q: 2.5 }], peak: 0.04 * vel, decay: 0.35, pan, verb: 0.15 });
    drumTone(bus, t, { from: 5200, to: 5150, peak: 0.006 * vel, decay: 0.4, pan });
  },
  riser(bus, t, length, vel = 0.5) {
    noiseHit(bus, t, { filters: [{ type: 'bandpass', freq: 500, freqEnd: 6000, glide: length, q: 1.6 }], attack: length * 0.92, peak: 0.07 * vel, decay: 0.12, verb: 0.3 });
  },
};

// ---- room ---------------------------------------------------------------

const irCache = new WeakMap();
/** Small warm room impulse response (stereo decaying noise, darkened). */
export function roomImpulse(ctx, seconds = 1.7) {
  let ir = irCache.get(ctx);
  if (!ir) {
    const length = Math.floor(ctx.sampleRate * seconds), rate = ctx.sampleRate;
    ir = ctx.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const data = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < length; i++) {
        const time = i / rate;
        const env = time < 0.012 ? 0 : Math.exp(-(time - 0.012) / 0.38);
        const coefficient = 0.25 + 0.6 * Math.min(1, time / seconds); // darker as it decays
        lp += ((Math.random() * 2 - 1) - lp) * (1 - coefficient);
        data[i] = lp * env;
      }
    }
    irCache.set(ctx, ir);
  }
  return ir;
}
