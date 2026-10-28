// Small WebAudio building blocks shared by the SFX, voice and music synths.
// Every helper takes (ctx, out, t, options): it schedules a short-lived node
// chain that starts at time t, plays into `out`, and disconnects itself when
// its source ends, so nothing accumulates on long sessions.

export const rand = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = list => list[Math.floor(Math.random() * list.length)];
export const clamp01 = value => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
/** Random pitch factor within +/- cents, so repeats never sound identical. */
export const vary = (cents = 30) => 2 ** (rand(-cents, cents) / 1200);
export const midiHz = midi => 440 * 2 ** ((midi - 69) / 12);

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'C4' / 'F#5' / 'Bb3' -> MIDI number. */
export function noteMidi(name) {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) return null;
  return NOTE_INDEX[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + (Number(match[3]) + 1) * 12;
}

const noiseCache = new WeakMap();
/** Two seconds of white noise, generated once per context and reused everywhere. */
export function noiseBuffer(ctx) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    const length = Math.floor(ctx.sampleRate * 2);
    buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
}

const waveCache = new WeakMap();
/** Soft glottal-like source: harmonic amplitudes fall faster than a sawtooth. */
export function glottalWave(ctx) {
  let wave = waveCache.get(ctx);
  if (!wave) {
    const count = 48, real = new Float32Array(count), imag = new Float32Array(count);
    for (let n = 1; n < count; n++) imag[n] = 1 / n ** 1.15;
    wave = ctx.createPeriodicWave(real, imag);
    waveCache.set(ctx, wave);
  }
  return wave;
}

/** Click-free attack / hold / exponential decay on an AudioParam. Returns the end time. */
export function envelope(param, t, { attack = 0.003, peak = 1, hold = 0, decay = 0.2 }) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  if (hold > 0) param.setValueAtTime(peak, t + attack + hold);
  param.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay);
  param.linearRampToValueAtTime(0, t + attack + hold + decay + 0.01);
  return t + attack + hold + decay + 0.01;
}

function chain(source, nodes, out) {
  let previous = source;
  for (const node of nodes) { previous.connect(node); previous = node; }
  previous.connect(out);
  source.onended = () => { source.disconnect(); for (const node of nodes) node.disconnect(); };
}

function makeFilter(ctx, { type = 'lowpass', freq = 1000, freqEnd, glide, q = 0.7 }, t) {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + glide);
  filter.Q.value = q;
  return filter;
}

/**
 * One oscillator with a pitch glide and an amplitude envelope.
 * opts: type|wave, freq, freqEnd, glide, attack, peak, hold, decay, filter, detune, vibrato {rate, depth}
 */
export function osc(ctx, out, t, opts) {
  const source = ctx.createOscillator();
  if (opts.wave) source.setPeriodicWave(opts.wave); else source.type = opts.type ?? 'sine';
  source.frequency.setValueAtTime(opts.freq, t);
  const decay = opts.decay ?? 0.2;
  if (opts.freqEnd) source.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t + (opts.glide ?? decay));
  if (opts.detune) source.detune.value = opts.detune;
  const gain = ctx.createGain();
  const end = envelope(gain.gain, t, { attack: opts.attack ?? 0.002, peak: opts.peak ?? 0.3, hold: opts.hold ?? 0, decay });
  const nodes = [];
  if (opts.filter) nodes.push(makeFilter(ctx, opts.filter, t));
  nodes.push(gain);
  let lfo, lfoGain;
  if (opts.vibrato) {
    lfo = ctx.createOscillator(); lfoGain = ctx.createGain();
    lfo.frequency.value = opts.vibrato.rate; lfoGain.gain.value = opts.vibrato.depth;
    lfo.connect(lfoGain); lfoGain.connect(source.frequency);
    lfo.start(t); lfo.stop(end);
    lfo.onended = () => { lfo.disconnect(); lfoGain.disconnect(); };
  }
  chain(source, nodes, out);
  source.start(t); source.stop(end);
  return end;
}

/**
 * Filtered noise burst from the shared buffer (random offset per call).
 * opts: type, freq, freqEnd, glide, q, attack, peak, hold, decay, highpass
 */
export function noise(ctx, out, t, opts) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  if (opts.rate) source.playbackRate.value = opts.rate;
  const decay = opts.decay ?? 0.1;
  const gain = ctx.createGain();
  const end = envelope(gain.gain, t, { attack: opts.attack ?? 0.002, peak: opts.peak ?? 0.3, hold: opts.hold ?? 0, decay });
  const nodes = [makeFilter(ctx, { type: opts.type ?? 'bandpass', freq: opts.freq ?? 1000, freqEnd: opts.freqEnd, glide: opts.glide ?? decay, q: opts.q ?? 0.8 }, t)];
  if (opts.highpass) nodes.push(makeFilter(ctx, { type: 'highpass', freq: opts.highpass }, t));
  nodes.push(gain);
  chain(source, nodes, out);
  source.start(t, Math.random() * 1.5); source.stop(end);
  return end;
}

/**
 * Modal resonator: a bank of decaying sine partials (metal, wood, glass).
 * partials: [[ratio, amplitude, decayScale]]; opts: f0, peak, decay, attack, bend (pitch factor over the decay)
 */
export function modal(ctx, out, t, { f0, partials, peak = 0.3, decay = 0.6, attack = 0.001, bend = 1 }) {
  const bus = ctx.createGain();
  bus.gain.value = peak;
  bus.connect(out);
  let last = t;
  for (const [ratio, amplitude, decayScale = 1] of partials) {
    const freq = f0 * ratio;
    if (freq > ctx.sampleRate * 0.45) continue;
    const end = osc(ctx, bus, t, { freq, freqEnd: bend !== 1 ? freq * bend : undefined, glide: decay * decayScale,
      attack, peak: amplitude, decay: decay * decayScale * (freq > 4000 ? 0.5 : 1) });
    last = Math.max(last, end);
  }
  // Disconnect the shared bus once every partial has ended.
  const keeper = ctx.createConstantSource ? ctx.createConstantSource() : null;
  if (keeper) {
    const silent = ctx.createGain(); silent.gain.value = 0;
    keeper.connect(silent); silent.connect(bus);
    keeper.onended = () => { keeper.disconnect(); silent.disconnect(); bus.disconnect(); };
    keeper.start(t); keeper.stop(last + 0.05);
  }
  return last;
}
