// Small tuned-percussion voices used by the jingles, countdown and UI sounds.
import { osc, noise } from './core.js';

export function mallet(ctx, out, t, freq, peak = 0.3, decay = 0.45) {
  osc(ctx, out, t, { freq, peak, attack: 0.002, decay });
  osc(ctx, out, t, { freq: freq * 3.93, peak: peak * 0.28, attack: 0.001, decay: decay * 0.18 });
  if (freq * 9.2 < ctx.sampleRate * 0.45) osc(ctx, out, t, { freq: freq * 9.2, peak: peak * 0.06, attack: 0.001, decay: 0.03 });
  noise(ctx, out, t, { type: 'bandpass', freq: Math.min(9000, freq * 4), q: 1.2, peak: peak * 0.25, decay: 0.012 });
}

export function bell(ctx, out, t, freq, peak = 0.2, decay = 1.1) {
  osc(ctx, out, t, { freq, peak, attack: 0.002, decay });
  osc(ctx, out, t, { freq: freq * 2.76, peak: peak * 0.35, attack: 0.001, decay: decay * 0.35 });
  if (freq * 5.4 < ctx.sampleRate * 0.45) osc(ctx, out, t, { freq: freq * 5.4, peak: peak * 0.12, attack: 0.001, decay: decay * 0.15 });
}

export function kick(ctx, out, t, peak = 0.6, tight = 1) {
  osc(ctx, out, t, { freq: 155, freqEnd: 44, glide: 0.12 * tight, peak, attack: 0.002, decay: 0.28 * tight });
  osc(ctx, out, t, { type: 'triangle', freq: 600, freqEnd: 120, glide: 0.02, peak: peak * 0.18, attack: 0.001, decay: 0.025 });
}

export function toyLead(ctx, out, t, freq, peak = 0.12, length = 0.2) {
  const vibrato = length > 0.3 ? { rate: 6, depth: freq * 0.012 } : undefined;
  osc(ctx, out, t, { type: 'square', freq, peak, attack: 0.004, hold: length * 0.5, decay: length,
    filter: { type: 'lowpass', freq: Math.min(7000, freq * 5), freqEnd: freq * 2.2, glide: length, q: 2 }, vibrato });
  osc(ctx, out, t, { type: 'triangle', freq: freq * 2, peak: peak * 0.25, attack: 0.003, decay: length * 0.6 });
}
