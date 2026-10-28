// Formant "voices": placeholder character lines synthesized from a glottal
// source, three vowel formant filters, aspiration and frication noise.
// They stand in until real clips are dropped into public/audio/voices/.
import { glottalWave, noiseBuffer, rand, vary } from './core.js';

const VOWELS = {
  a: [800, 1150, 2900],
  ae: [700, 1700, 2500],
  e: [520, 1400, 2500],
  i: [290, 2250, 3000],
  u: [330, 760, 2400],
  o: [480, 820, 2700],
  z: [380, 1500, 2700], // the buzzy apical vowel in "zi"
  n: [260, 1900, 2700], // nasal murmur
};
const FORMANT_LEVEL = [1, 0.6, 0.25];
const FORMANT_Q = [5, 9, 13];

// Consonant onsets: duration, frication band, frication level, aspiration, voiced murmur.
const CONSONANTS = {
  h: { dur: 0.055, asp: 1 },
  n: { dur: 0.05, nasal: true },
  m: { dur: 0.05, nasal: true },
  d: { dur: 0.025, fric: [3600, 1.2, 0.5, 0.012] },
  t: { dur: 0.04, fric: [4200, 1.2, 0.5, 0.012], asp: 0.4 },
  p: { dur: 0.035, fric: [1300, 0.8, 0.55, 0.012], asp: 0.45 },
  z: { dur: 0.07, fric: [6500, 1.6, 0.3, 0.06] },
  zh: { dur: 0.065, fric: [3200, 1.6, 0.32, 0.055] },
  f: { dur: 0.07, fric: [5200, 0.6, 0.2, 0.06] },
};

/**
 * Schedule a phrase. syllables: [{ c, v (vowel or [from, to]), coda: 'n', f0: [Hz...], dur, gap, amp, asp }]
 * voice: { scale, gain, breath, body, vibrato: { rate, cents }, jitter }
 * Returns { end } (absolute time the phrase finishes).
 */
export function speak(ctx, out, t0, syllables, voice) {
  const scale = voice.scale ?? 1;
  const formants = (name) => (VOWELS[name] ?? VOWELS.a).map(f => f * scale);

  const source = ctx.createOscillator();
  source.setPeriodicWave(glottalWave(ctx));
  const voicing = ctx.createGain(); voicing.gain.value = 0;
  const aspSource = ctx.createBufferSource(), fricSource = ctx.createBufferSource();
  aspSource.buffer = fricSource.buffer = noiseBuffer(ctx);
  aspSource.loop = fricSource.loop = true;
  const asp = ctx.createGain(); asp.gain.value = 0;
  const fricFilter = ctx.createBiquadFilter(); fricFilter.type = 'bandpass';
  const fric = ctx.createGain(); fric.gain.value = 0;
  const sum = ctx.createGain(); sum.gain.value = voice.gain ?? 1;
  const filters = FORMANT_Q.map((q, i) => {
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = q;
    const level = ctx.createGain(); level.gain.value = FORMANT_LEVEL[i] * (i === 0 ? 1 : 1.6);
    voicing.connect(filter); asp.connect(filter); filter.connect(level); level.connect(sum);
    return { filter, level };
  });
  // Low "body" path keeps chubby voices round.
  const body = ctx.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 450;
  const bodyGain = ctx.createGain(); bodyGain.gain.value = voice.body ?? 0.15;
  voicing.connect(body); body.connect(bodyGain); bodyGain.connect(sum);
  source.connect(voicing); aspSource.connect(asp);
  fricSource.connect(fricFilter); fricFilter.connect(fric); fric.connect(sum);
  sum.connect(out);

  let vibrato, vibratoGain;
  if (voice.vibrato) {
    vibrato = ctx.createOscillator(); vibratoGain = ctx.createGain();
    vibrato.frequency.value = voice.vibrato.rate; vibratoGain.gain.value = voice.vibrato.cents;
    vibrato.connect(vibratoGain); vibratoGain.connect(source.detune);
  }

  const setFormants = (name, time, tau) => formants(name).forEach((f, i) => filters[i].filter.frequency.setTargetAtTime(f, time, tau));
  const first = syllables[0];
  formants(Array.isArray(first.v) ? first.v[0] : first.v).forEach((f, i) => filters[i].filter.frequency.setValueAtTime(f, t0));
  source.frequency.setValueAtTime(first.f0[0], t0);

  const breath = voice.breath ?? 0.2;
  let t = t0;
  for (const syl of syllables) {
    const consonant = CONSONANTS[syl.c] ?? { dur: 0 };
    const amp = (syl.amp ?? 1) * vary(60) ** 4; // a few dB of natural level variation
    const ts = t, tv = ts + consonant.dur, te = ts + syl.dur;
    const vowels = Array.isArray(syl.v) ? syl.v : [syl.v];
    const jitter = vary(voice.jitter ?? 25);
    const f0 = syl.f0.map(f => f * jitter);

    // Formant targets.
    setFormants(consonant.nasal ? 'n' : vowels[0], ts, 0.008);
    if (consonant.nasal) setFormants(vowels[0], tv, 0.015);
    if (vowels[1]) setFormants(vowels[1], tv + (te - tv) * 0.45, 0.04);
    if (syl.coda) setFormants(syl.coda, te - (te - tv) * 0.3, 0.02);

    // Pitch contour across the voiced part.
    const vs = consonant.nasal ? ts : tv;
    source.frequency.setValueAtTime(f0[0], vs);
    f0.slice(1).forEach((f, i, rest) => source.frequency.linearRampToValueAtTime(f, vs + (te - vs) * (i + 1) / rest.length));

    // Voicing envelope.
    voicing.gain.setValueAtTime(0, vs);
    if (consonant.nasal) {
      voicing.gain.linearRampToValueAtTime(amp * 0.35, ts + 0.015);
      voicing.gain.setValueAtTime(amp * 0.35, tv);
      voicing.gain.linearRampToValueAtTime(amp, tv + 0.02);
    } else voicing.gain.linearRampToValueAtTime(amp, tv + 0.015);
    voicing.gain.setValueAtTime(amp, Math.max(tv + 0.016, te - 0.035));
    voicing.gain.linearRampToValueAtTime(0, te);

    // Aspiration (the "h" and a little breath throughout).
    const breathy = (syl.asp ?? breath) * Math.max(amp, 0.3);
    asp.gain.setValueAtTime(0, ts);
    if (consonant.asp) {
      asp.gain.linearRampToValueAtTime(consonant.asp * Math.max(amp, 0.5) * 0.9, ts + 0.012);
      asp.gain.linearRampToValueAtTime(breathy, tv + 0.02);
    } else asp.gain.linearRampToValueAtTime(breathy, tv + 0.015);
    asp.gain.setValueAtTime(breathy, Math.max(tv + 0.021, te - 0.03));
    asp.gain.linearRampToValueAtTime(0, te);

    // Frication bursts (d, z, zh, f, p...).
    fric.gain.setValueAtTime(0, ts);
    if (consonant.fric) {
      const [freq, q, level, length] = consonant.fric;
      fricFilter.frequency.setValueAtTime(freq * (scale > 1 ? 1.1 : 1), ts);
      fricFilter.Q.setValueAtTime(q, ts);
      fric.gain.linearRampToValueAtTime(level * Math.max(amp, 0.5), ts + Math.min(0.012, length * 0.4));
      fric.gain.setValueAtTime(level * Math.max(amp, 0.5), ts + Math.max(length * 0.5, 0.004));
      fric.gain.linearRampToValueAtTime(0, ts + length + 0.006);
    }
    t = te + (syl.gap ?? 0);
  }

  const end = t + 0.05;
  source.start(t0); aspSource.start(t0, rand(0, 1.5)); fricSource.start(t0, rand(0, 1.5));
  source.stop(end); aspSource.stop(end); fricSource.stop(end);
  if (vibrato) { vibrato.start(t0); vibrato.stop(end); }
  source.onended = () => {
    for (const node of [source, voicing, aspSource, asp, fricSource, fricFilter, fric, sum, body, bodyGain, vibrato, vibratoGain]) node?.disconnect();
    for (const { filter, level } of filters) { filter.disconnect(); level.disconnect(); }
  };
  return { end };
}

// ---- the three character lines --------------------------------------

/** 奶蛙: hearty goofy belly laugh "HA-HA-HA-HA-ha-ha" + a wheezy inhale (~2.5 s). */
function laughPhrase() {
  const syllables = [];
  for (let i = 0; i < 10; i++) {
    const f = (i === 0 ? 285 : 262 - i * 9) * vary(40);
    syllables.push({ c: 'h', v: 'a', f0: [f, f * 1.04, f * 0.8], dur: i === 0 ? 0.2 : 0.165, gap: 0.05,
      amp: i < 4 ? 1 : i < 7 ? 0.78 : 0.55 });
  }
  syllables.push({ c: 'h', v: ['e', 'i'], f0: [300, 330], dur: 0.33, amp: 0, asp: 1.2 });
  return { syllables, voice: { scale: 0.96, gain: 1.05, breath: 0.35, body: 0.35, vibrato: { rate: 9, cents: 45 }, jitter: 35 } };
}

/** 胆子肥嘟嘟: "你的胆子真的肥嘟嘟的" sung in a high chubby voice (~2 s). */
function deliveryPhrase() {
  const syllables = [
    { c: 'n', v: 'i', f0: [380, 345, 370], dur: 0.17 },
    { c: 'd', v: 'e', f0: [345, 330], dur: 0.11, amp: 0.8 },
    { c: 'd', v: 'a', coda: 'n', f0: [335, 300, 350], dur: 0.2 },
    { c: 'z', v: 'z', f0: [360, 350], dur: 0.14, amp: 0.8 },
    { c: 'zh', v: 'e', coda: 'n', f0: [470, 472], dur: 0.2 },
    { c: 'd', v: 'e', f0: [420, 400], dur: 0.11, gap: 0.03, amp: 0.8 },
    { c: 'f', v: ['e', 'i'], f0: [400, 505], dur: 0.2, gap: 0.03 },
    { c: 'd', v: 'u', f0: [540, 610], dur: 0.14, gap: 0.05, amp: 1.1 },
    { c: 'd', v: 'u', f0: [600, 680], dur: 0.14, gap: 0.05, amp: 1.1 },
    { c: 'd', v: 'e', f0: [560, 520, 410], dur: 0.27 },
  ];
  return { syllables, voice: { scale: 1.2, gain: 0.9, breath: 0.12, body: 0.3, vibrato: { rate: 6.5, cents: 22 }, jitter: 20 } };
}

/** 开心小猫: bouncy squeaky "hap-py hap-py hap-py" (~1.8 s). */
function happyPhrase() {
  const syllables = [];
  [620, 700, 800].forEach((base, i) => {
    const last = i === 2;
    syllables.push({ c: 'h', v: 'ae', f0: [base * 0.82, base * 1.1], dur: 0.19, gap: 0.04 });
    syllables.push({ c: 'p', v: 'i', f0: last ? [base * 1.3, base * 1.15, base * 0.85] : [base * 1.25, base * 0.98], dur: last ? 0.4 : 0.2, gap: last ? 0 : 0.1 });
  });
  return { syllables, voice: { scale: 1.42, gain: 1.0, breath: 0.15, body: 0.1, vibrato: { rate: 11, cents: 35 }, jitter: 25 } };
}

export const VOICE_PHRASES = { laugh: laughPhrase, delivery: deliveryPhrase, happy: happyPhrase };

/** Synthesize the placeholder line for a skill; returns { end } or null if the skill has none. */
export function speakSkill(ctx, out, t, skill) {
  const make = VOICE_PHRASES[skill];
  if (!make) return null;
  const { syllables, voice } = make();
  return speak(ctx, out, t, syllables, voice);
}
