// Synthesized one-shot effects: weapon hits, clashes, splats, skills, UI and jingles.
import { osc, noise, noiseBuffer, modal, rand, vary, clamp01, midiHz, noteMidi } from './core.js';
import { mallet, bell, toyLead, kick } from './instruments.js';

const STEEL = [[1, 1, 1], [2.756, 0.55, 0.7], [5.404, 0.3, 0.45], [8.933, 0.16, 0.3]];
const PLATE = [[1, 1, 1], [1.594, 0.62, 0.85], [2.136, 0.5, 0.75], [2.296, 0.36, 0.7], [2.653, 0.3, 0.55], [3.156, 0.2, 0.45], [3.5, 0.14, 0.4]];
const PLATE_SHIMMER = [[4.06, 0.14, 0.35], [4.95, 0.11, 0.3], [6.21, 0.08, 0.22], [7.83, 0.05, 0.16]];
const WOOD = [[1, 1, 1], [2.57, 0.45, 0.5], [4.2, 0.2, 0.3]];
const STONE = [[1, 1, 1], [1.91, 0.38, 0.58], [3.72, 0.17, 0.34]];

const note = name => midiHz(noteMidi(name));

/** Wobbly cast-iron pan "BONG": plate modes doubled with slightly detuned twins so they beat. */
function panBong(ctx, out, t, s, a) {
  const f0 = 262 * vary(45);
  const decay = 1.1 + s * 0.8;
  modal(ctx, out, t, { f0, partials: [...PLATE, ...PLATE_SHIMMER], peak: 0.15 * a, decay, bend: 0.985 });
  modal(ctx, out, t, { f0: f0 * 1.009, partials: PLATE.slice(0, 4), peak: 0.1 * a, decay: decay * 0.9, bend: 0.985 });
  // Cartoon "wom-wom" undertone, a little flat so it wobbles against the plate.
  osc(ctx, out, t, { freq: f0 * 0.5, freqEnd: f0 * 0.47, peak: 0.16 * a, attack: 0.004, decay: decay * 0.7,
    vibrato: { rate: 7.5, depth: f0 * 0.012 } });
  noise(ctx, out, t, { type: 'bandpass', freq: 2400 * (0.7 + s * 0.6), q: 0.9, peak: 0.32 * a, decay: 0.045 });
  osc(ctx, out, t, { type: 'triangle', freq: 180, freqEnd: 70, peak: 0.3 * a, attack: 0.002, decay: 0.12 });
}

function rustle(ctx, out, t, length, grains, peak) {
  for (let i = 0; i < grains; i++) noise(ctx, out, t + rand(0, length), { type: 'bandpass', freq: rand(2500, 7000), q: rand(1, 3),
    peak: peak * rand(0.4, 1), attack: 0.001, decay: rand(0.008, 0.03) });
}

function squeak(ctx, out, t, a, pitch) {
  const lp = { type: 'lowpass', freq: 3600, q: 0.7 };
  osc(ctx, out, t, { type: 'triangle', freq: 980 * pitch, freqEnd: 1620 * pitch, glide: 0.06, peak: 0.16 * a, attack: 0.008, hold: 0.03, decay: 0.07,
    filter: lp, vibrato: { rate: 31, depth: 45 } });
  osc(ctx, out, t + 0.085, { type: 'triangle', freq: 1560 * pitch, freqEnd: 1080 * pitch, glide: 0.11, peak: 0.13 * a, attack: 0.006, hold: 0.04, decay: 0.09,
    filter: lp, vibrato: { rate: 27, depth: 40 } });
}

function ballPop(ctx, out, t, s, a) {
  const pitch = vary(80);
  osc(ctx, out, t, { type: 'triangle', freq: (215 + s * 50) * pitch, freqEnd: 92 * pitch, glide: 0.09, peak: 0.43 * a, decay: 0.14 });
  modal(ctx, out, t + 0.004, { f0: 355 * pitch, partials: WOOD, peak: 0.13 * a, decay: 0.095 });
  noise(ctx, out, t, { type: 'bandpass', freq: 1270 * pitch, q: 1.15, peak: 0.22 * a, decay: 0.035 });
}

// Weapon-side voices. a = loudness (0.35..1), s = strength (0..1), b = brightness multiplier.
const WEAPON_VOICES = {
  'soccer-ball': ballPop,
  'crowned-heart': (ctx, out, t, s, a) => {
    modal(ctx, out, t, { f0: 1500 * vary(55), partials: PLATE.slice(0, 3), peak: 0.17 * a, decay: 0.16 + 0.14 * s });
    osc(ctx, out, t, { type: 'triangle', freq: 490 * vary(55), freqEnd: 265, peak: 0.23 * a, decay: 0.065 });
    noise(ctx, out, t, { freq: 2400, q: 2.1, peak: 0.23 * a, decay: 0.035 });
  },
  'maodie-paw': (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 215 * vary(75), freqEnd: 108, peak: 0.37 * a, decay: 0.10 });
    noise(ctx, out, t + 0.008, { type: 'bandpass', freq: 760, q: 0.9, peak: 0.28 * a, decay: 0.065 });
    osc(ctx, out, t + 0.023, { type: 'triangle', freq: 1140 * vary(60), freqEnd: 795, peak: 0.065 * a, decay: 0.06 });
  },
  'long-ears': (ctx, out, t, s, a) => {
    noise(ctx, out, t, { freq: 1450 * vary(120), freqEnd: 470, q: 1.0, peak: 0.42 * a, attack: 0.009, decay: 0.10 });
    noise(ctx, out, t + 0.039, { freq: 650 * vary(70), q: 0.7, peak: 0.27 * a, decay: 0.085 });
    osc(ctx, out, t + 0.014, { freq: 195, freqEnd: 105, peak: 0.24 * a, decay: 0.12 });
  },
  'cat-paws': (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 137 * vary(60), freqEnd: 53, peak: 0.50 * a, decay: 0.18 });
    noise(ctx, out, t, { type: 'lowpass', freq: 780, q: 0.55, peak: 0.33 * a, decay: 0.085 });
    noise(ctx, out, t + 0.032, { freq: 2700 * vary(100), q: 1.35, peak: 0.15 * a, decay: 0.04 });
  },
  'yellow-staff': (ctx, out, t, s, a) => {
    squeak(ctx, out, t, a, vary(90));
    osc(ctx, out, t, { freq: 270 * vary(40), freqEnd: 140, peak: 0.32 * a, attack: 0.003, decay: 0.13 });
    noise(ctx, out, t, { type: 'lowpass', freq: 900, q: 0.5, peak: 0.22 * a, decay: 0.05 });
  },
  sword: (ctx, out, t, s, a, b) => {
    modal(ctx, out, t, { f0: 1250 * vary(60), partials: STEEL, peak: 0.13 * a, decay: 0.35 + s * 0.35 });
    noise(ctx, out, t, { type: 'bandpass', freq: 7200 * b, freqEnd: 3200, glide: 0.12, q: 1.2, peak: 0.3 * a, decay: 0.13 });
    noise(ctx, out, t, { type: 'highpass', freq: 3000, peak: 0.18 * a, decay: 0.02 });
  },
  polearm: (ctx, out, t, s, a, b) => {
    modal(ctx, out, t, { f0: 830 * vary(60), partials: STEEL, peak: 0.12 * a, decay: 0.45 + s * 0.3 });
    modal(ctx, out, t, { f0: 205 * vary(40), partials: WOOD, peak: 0.24 * a, decay: 0.14 });
    noise(ctx, out, t, { type: 'bandpass', freq: 1800 * b, q: 1, peak: 0.3 * a, decay: 0.05 });
  },
  hammer: (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 125 * vary(40), freqEnd: 42, glide: 0.18, peak: 0.6 * a, attack: 0.002, decay: 0.32 });
    noise(ctx, out, t, { type: 'lowpass', freq: 700, q: 0.6, peak: 0.5 * a, decay: 0.13 });
    modal(ctx, out, t, { f0: 390 * vary(50), partials: PLATE.slice(0, 5), peak: 0.07 * a, decay: 0.9 });
    noise(ctx, out, t, { type: 'bandpass', freq: 1600, q: 1, peak: 0.2 * a, decay: 0.03 });
  },
  axe: (ctx, out, t, s, a, b) => {
    noise(ctx, out, t, { type: 'bandpass', freq: 1350 * b, q: 1.6, peak: 0.55 * a, decay: 0.075 });
    noise(ctx, out, t, { type: 'highpass', freq: 4200, peak: 0.25 * a, decay: 0.035 });
    osc(ctx, out, t, { freq: 420 * vary(50), freqEnd: 240, peak: 0.3 * a, attack: 0.001, decay: 0.07 });
    modal(ctx, out, t, { f0: 960 * vary(60), partials: STEEL, peak: 0.09 * a, decay: 0.25 });
  },
  mace: (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 108 * vary(40), freqEnd: 46, glide: 0.15, peak: 0.55 * a, attack: 0.002, decay: 0.27 });
    modal(ctx, out, t, { f0: 158 * vary(50), partials: WOOD, peak: 0.32 * a, decay: 0.2 });
    modal(ctx, out, t, { f0: 1720 * vary(80), partials: STEEL.slice(0, 3), peak: 0.05 * a, decay: 0.14 });
    noise(ctx, out, t, { type: 'lowpass', freq: 1100, q: 0.6, peak: 0.4 * a, decay: 0.09 });
  },
  pan: (ctx, out, t, s, a) => panBong(ctx, out, t, s, a),
  'takeout-box': (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 190 * vary(50), freqEnd: 105, peak: 0.42 * a, attack: 0.002, decay: 0.11 });
    noise(ctx, out, t, { type: 'bandpass', freq: 430 * vary(60), q: 3, peak: 0.55 * a, decay: 0.12 });
    noise(ctx, out, t, { type: 'bandpass', freq: 1150, q: 2, peak: 0.25 * a, decay: 0.06 });
    rustle(ctx, out, t, 0.09, 4, 0.12 * a);
  },
  'happy-paws': (ctx, out, t, s, a) => {
    osc(ctx, out, t, { freq: 175 * vary(60), freqEnd: 92, peak: 0.42 * a, attack: 0.007, decay: 0.11 });
    noise(ctx, out, t, { type: 'lowpass', freq: 650, q: 0.5, peak: 0.36 * a, attack: 0.005, decay: 0.07 });
    osc(ctx, out, t + 0.012, { freq: 1900 * vary(80), freqEnd: 2500, peak: 0.035 * a, attack: 0.003, decay: 0.05 });
  },
  generic: (ctx, out, t, s, a, b) => {
    osc(ctx, out, t, { freq: 160 * vary(40), freqEnd: 60, peak: 0.42 * a, attack: 0.002, decay: 0.16 });
    noise(ctx, out, t, { type: 'bandpass', freq: 900 * b, q: 0.8, peak: 0.4 * a, decay: 0.09 });
  },
};

export const WEAPON_IDS = Object.keys(WEAPON_VOICES).filter(id => id !== 'generic');
const METAL = new Set(['sword', 'polearm', 'hammer', 'axe', 'mace', 'pan']);
const RING_PITCH = { sword: 1250, polearm: 900, axe: 1000, hammer: 520, mace: 700, pan: 300 };
export const isMetal = id => METAL.has(id);

const level = strength => { const s = clamp01(strength); return { s, a: 0.35 + 0.65 * s, b: 0.6 + 0.8 * s }; };

function weaponVoice(ctx, out, t, id, s, a, b) {
  const play = Object.hasOwn(WEAPON_VOICES, id) ? WEAPON_VOICES[id] : WEAPON_VOICES.generic;
  play(ctx, out, t, s, a, b);
}

/** Plush body taking the blow + a sub-bass punch on big hits. */
function bodyThud(ctx, out, t, s, a) {
  osc(ctx, out, t, { freq: 140 * vary(50), freqEnd: 58, peak: 0.38 * a, attack: 0.002, decay: 0.15 });
  noise(ctx, out, t, { type: 'lowpass', freq: 500 + 900 * s, q: 0.5, peak: 0.26 * a, decay: 0.07 });
  if (s > 0.55) {
    const k = (s - 0.55) / 0.45;
    osc(ctx, out, t, { freq: 82, freqEnd: 36, glide: 0.2, peak: 0.25 + 0.35 * k, attack: 0.004, decay: 0.3 });
  }
}

export function hitSound(ctx, out, t, event) {
  const { s, a, b } = level(event.strength ?? 0.5);
  if (event.source === 'perfume' || event.source === 'bleed') {
    noise(ctx, out, t, { type: 'bandpass', freq: 3600 * vary(100), freqEnd: 1900, peak: 0.14 * a, attack: 0.01, decay: 0.14 });
    osc(ctx, out, t + 0.018, { type: 'triangle', freq: 1175 * vary(80), freqEnd: 680, peak: 0.095 * a, decay: 0.09 });
    return;
  }
  if (event.source === 'soccer') {
    ballPop(ctx, out, t, s, a * 1.25);
    bodyThud(ctx, out, t + 0.012, s, a * 0.48);
    return;
  }
  if (event.source === 'delivery') {
    WEAPON_VOICES['takeout-box'](ctx, out, t, s, a, b);
    splatSound(ctx, out, t + 0.01, { strength: s * 0.8 });
  } else weaponVoice(ctx, out, t, event.weapon, s, a, b);
  bodyThud(ctx, out, t, s, a);
}

/** Synth fallback for a metal-on-metal clash (also layered when the pan is involved). */
function metalClash(ctx, out, t, ids, s, a, recorded = false) {
  for (const id of ids) {
    if (id === 'pan') continue;
    modal(ctx, out, t, { f0: RING_PITCH[id] * vary(70), partials: STEEL, peak: (recorded ? 0.078 : 0.12) * a, decay: 0.4 + 0.35 * s });
  }
  if (recorded) return;
  noise(ctx, out, t, { type: 'highpass', freq: 2800, peak: 0.35 * a, decay: 0.05 });
  noise(ctx, out, t, { type: 'bandpass', freq: 5200, q: 2, peak: 0.15 * a, decay: 0.18 });
}

/** playBuffer(rate, gain) plays the recorded clash; returns false when unavailable. */
export function clashSound(ctx, out, t, event, playBuffer) {
  const { s, a, b } = level(event.strength ?? 0.5);
  const ids = Array.isArray(event.weapons) ? event.weapons.slice(0, 2) : [];
  const metal = ids.length > 0 && ids.every(isMetal);
  if (metal) {
    const meanPitch = ids.reduce((total, id) => total + RING_PITCH[id], 0) / ids.length;
    const recorded = playBuffer((0.83 + meanPitch / 6500) * vary(85), 0.51 + s * 0.36);
    metalClash(ctx, out, t, [...new Set(ids)], s, a, recorded);
    if (ids.includes('pan')) panBong(ctx, out, t, s, a * 0.8);
    return;
  }
  if (ids.length === 0) { metalClash(ctx, out, t, ['sword', 'axe'], s, a); return; }
  // Mixed or soft pairs: each side contributes its own material, slightly softened.
  for (const id of ids) weaponVoice(ctx, out, t, id, s, a * 0.75, b);
  if (ids.some(isMetal)) noise(ctx, out, t, { type: 'highpass', freq: 2500, peak: 0.18 * a, decay: 0.04 });
}

export function weaponContactSound(ctx, out, t, event) {
  const { s, b } = level(event.strength ?? 0.35);
  const a = 0.22 + 0.78 * s;
  const { surface, weapon, arenaSkin } = event;
  if (surface === 'weapon') {
    const weapons = Array.isArray(event.weapons) ? event.weapons.slice(0, 2) : [weapon];
    const metal = weapons.filter(isMetal);
    if (metal.length) {
      for (const id of new Set(metal)) {
        modal(ctx, out, t, { f0: RING_PITCH[id] * vary(85), partials: STEEL.slice(0, 2), peak: 0.12 * a, decay: 0.12 + 0.09 * s });
      }
    }
    for (const id of new Set(weapons)) {
      if (!isMetal(id)) weaponVoice(ctx, out, t, id, s, a * 0.30, b);
    }
    noise(ctx, out, t, { freq: (metal.length ? 3800 : 1050) * vary(120), q: 1.1, peak: 0.21 * a, decay: 0.038 });
    return;
  }
  if (surface === 'ground' && arenaSkin !== 'lakeside') {
    osc(ctx, out, t, { freq: 112 * vary(80), freqEnd: 59, peak: 0.34 * a, decay: 0.095 });
    noise(ctx, out, t, { freq: 1300 * vary(120), freqEnd: 570, q: 0.78, peak: 0.41 * a, decay: 0.09 });
    rustle(ctx, out, t + 0.016, 0.07, 3, 0.11 * a);
    weaponVoice(ctx, out, t, weapon, s, 0.19 * a, b);
    return;
  }
  if (surface === 'ground') {
    modal(ctx, out, t, { f0: 620 * vary(100), partials: STONE, peak: 0.24 * a, decay: 0.12 });
    noise(ctx, out, t, { freq: 2400 * vary(110), q: 0.95, peak: 0.34 * a, decay: 0.047 });
    weaponVoice(ctx, out, t, weapon, s, 0.26 * a, b);
    return;
  }
  if (surface === 'obstacle' || surface === 'wall') {
    const wall = surface === 'wall';
    const stone = arenaSkin === 'lakeside' || arenaSkin === 'colosseum';
    const pitch = (wall ? 170 : 335) * vary(100);
    modal(ctx, out, t, { f0: pitch, partials: stone ? STONE : WOOD, peak: (wall ? 0.30 : 0.38) * a, decay: wall ? 0.23 : 0.14 });
    noise(ctx, out, t, { freq: wall ? 1280 : 2700, q: 1.35, peak: 0.36 * a, decay: 0.055 });
    weaponVoice(ctx, out, t, weapon, s, 0.29 * a, b);
  }
}

export function soccerBounceSound(ctx, out, t, event) {
  const s = clamp01(event.strength ?? 0.5);
  const a = 0.28 + 0.55 * s;
  ballPop(ctx, out, t, s, a);
  if (event.surface === 'wall') {
    osc(ctx, out, t + 0.013, { freq: 123 * vary(65), freqEnd: 68, peak: 0.24 * a, decay: 0.11 });
  }
}

export function splatSound(ctx, out, t, event) {
  const { a } = level(event.strength ?? 0.5);
  noise(ctx, out, t, { type: 'lowpass', freq: 1000, freqEnd: 280, glide: 0.12, q: 1.5, peak: 0.5 * a, attack: 0.003, decay: 0.15 });
  noise(ctx, out, t, { type: 'bandpass', freq: 2300, q: 0.8, peak: 0.24 * a, decay: 0.04 });
  osc(ctx, out, t, { freq: 150 * vary(60), freqEnd: 88, peak: 0.34 * a, attack: 0.003, decay: 0.12 });
  rustle(ctx, out, t + 0.02, 0.18, 7, 0.1 * a);
}

// ---- skills -------------------------------------------------------------

export const SKILL_SFX = {
  'ricochet-release'(ctx,out,t){
    osc(ctx,out,t,{type:'sine',freq:160,freqEnd:65,glide:.08,peak:.3,attack:.002,decay:.12});
    noise(ctx,out,t,{type:'lowpass',freq:1800,peak:.2,decay:.04});
  },
  'perfume-release'(ctx,out,t){noise(ctx,out,t,{type:'highpass',freq:4500,peak:.14,attack:.02,decay:.3});},
  ricochet(ctx,out,t){
    noise(ctx,out,t,{type:'bandpass',freq:800,freqEnd:2200,glide:.18,peak:.18,attack:.02,decay:.18});
  },
  perfume(ctx,out,t){
    noise(ctx,out,t,{type:'highpass',freq:3500,peak:.12,attack:.015,decay:.2});
  },
  rotor(ctx, out, t) {
    for (let i = 0; i < 5; i++) {
      const at = t + 0.045 * i;
      noise(ctx, out, at, { freq: 530 + i * 205, q: 0.8, peak: 0.21, attack: 0.007, decay: 0.086 });
    }
    osc(ctx, out, t, { type: 'triangle', freq: 160, freqEnd: 405, glide: 0.23, peak: 0.12, attack: 0.012, decay: 0.26 });
  },
  'big-paws'(ctx, out, t) {
    noise(ctx, out, t, { freq: 420, freqEnd: 1720, glide: 0.19, q: 1.2, peak: 0.22, attack: 0.04, decay: 0.19 });
    osc(ctx, out, t, { type: 'triangle', freq: 128, freqEnd: 365, glide: 0.19, peak: 0.19, attack: 0.022, decay: 0.24 });
    for (const [i, pitch] of [225, 270].entries()) {
      const at = t + 0.16 + i * 0.055;
      osc(ctx, out, at, { freq: pitch, freqEnd: 80, glide: 0.055, peak: 0.22, decay: 0.095 });
      noise(ctx, out, at, { freq: 1500 + i * 450, q: 1.1, peak: 0.12, decay: 0.045 });
    }
    bell(ctx, out, t + 0.235, note('A6'), 0.082, 0.29);
  },
  lifesteal(ctx, out, t) {
    noise(ctx, out, t, { freq: 1700, freqEnd: 460, glide: 0.21, q: 1.5, peak: 0.26, attack: 0.095, decay: 0.17 });
    osc(ctx, out, t + 0.09, { type: 'triangle', freq: 184, freqEnd: 92, glide: 0.15, peak: 0.26, decay: 0.21 });
    mallet(ctx, out, t + 0.15, note('D5'), 0.16, 0.23);
    bell(ctx, out, t + 0.22, note('F5'), 0.11, 0.28);
  },
  // Frog croak "rib-bit" with a springy rising boing under it (the laugh starts right after).
  laugh(ctx, out, t) {
    for (const [offset, freq] of [[0, 118], [0.12, 132]]) {
      osc(ctx, out, t + offset, { type: 'sawtooth', freq: freq * vary(30), freqEnd: freq * 0.82, peak: 0.3, attack: 0.006, hold: 0.04, decay: 0.07,
        filter: { type: 'bandpass', freq: 650, q: 2.5 }, vibrato: { rate: 38, depth: 18 } });
    }
    osc(ctx, out, t, { freq: 160 * vary(30), freqEnd: 420, glide: 0.25, peak: 0.1, attack: 0.01, decay: 0.3, vibrato: { rate: 13, depth: 25 } });
  },
  // Cartoon poof + rising swoosh + tiny "ta-da".
  twist(ctx, out, t) {
    noise(ctx, out, t, { type: 'lowpass', freq: 1900, freqEnd: 320, glide: 0.22, q: 0.8, peak: 0.7, attack: 0.006, decay: 0.26 });
    noise(ctx, out, t, { type: 'bandpass', freq: 520, q: 1.5, peak: 0.35, attack: 0.004, decay: 0.16 });
    noise(ctx, out, t + 0.06, { type: 'bandpass', freq: 380, freqEnd: 4200, glide: 0.36, q: 2.2, peak: 0.45, attack: 0.3, decay: 0.1 });
    const ta = t + 0.47, da = t + 0.6;
    for (const name of ['G5', 'B5', 'D6']) toyLead(ctx, out, ta, note(name), 0.07, 0.08);
    for (const name of ['C6', 'E6', 'G6']) toyLead(ctx, out, da, note(name), 0.08, 0.55);
    bell(ctx, out, da, note('C7'), 0.09, 0.6);
  },
  // Throwing whoosh + paper-bag rustle.
  delivery(ctx, out, t) {
    noise(ctx, out, t, { type: 'bandpass', freq: 700, freqEnd: 2400, glide: 0.22, q: 1.6, peak: 0.36, attack: 0.12, decay: 0.2 });
    noise(ctx, out, t, { type: 'lowpass', freq: 600, q: 0.6, peak: 0.12, attack: 0.08, decay: 0.2 });
    rustle(ctx, out, t, 0.35, 12, 0.13);
  },
  // Sparkly heal chime: rising bell arpeggio over a soft swell.
  happy(ctx, out, t) {
    ['C6', 'E6', 'G6', 'C7', 'E7'].forEach((name, i) => bell(ctx, out, t + i * 0.07, note(name) * vary(8), 0.09, 0.9));
    noise(ctx, out, t + 0.1, { type: 'highpass', freq: 8500, peak: 0.05, attack: 0.15, decay: 0.45 });
    for (const name of ['C5', 'G5', 'E6']) osc(ctx, out, t, { type: 'triangle', freq: note(name), peak: 0.04, attack: 0.15, hold: 0.2, decay: 0.6 });
  },
};

export function healSound(ctx, out, t, amount) {
  const level = 0.09 + 0.07 * clamp01(amount / 32);
  mallet(ctx, out, t, note('D6'), level, 0.13);
  bell(ctx, out, t + 0.062, note('A6'), level * 0.72, 0.17);
}

/** One sustained voice per active skill. The session stops it when the phase ends. */
export function startSkillLoop(ctx, out, t, skill) {
  const rotor = skill === 'rotor';
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = noiseBuffer(ctx);
  source.loop = true;
  filter.type = 'bandpass';
  filter.frequency.value = rotor ? 950 : 5400;
  filter.Q.value = rotor ? 0.72 : 0.68;
  gain.gain.value = 0;
  source.connect(filter);
  gain.connect(out);

  let lfo, depth, flutter;
  if (rotor) {
    lfo = ctx.createOscillator();
    depth = ctx.createGain();
    flutter = ctx.createGain();
    lfo.frequency.value = 9;
    depth.gain.value = 0.44;
    flutter.gain.value = 0.54;
    lfo.connect(depth);
    depth.connect(flutter.gain);
    filter.connect(flutter);
    flutter.connect(gain);
    lfo.start(t);
  } else {
    filter.connect(gain);
  }

  const disconnect = () => {
    source.onended = null;
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
    lfo?.disconnect();
    depth?.disconnect();
    flutter?.disconnect();
  };
  source.onended = disconnect;
  source.start(t, rand(0, 1.5));

  let previousPower = -1;
  return {
    skill,
    update(player, at) {
      const spread = clamp01(player.earSpread / (Math.PI / 2));
      const speed = clamp01(Math.abs(player.wp) / 5);
      const power = rotor ? spread * (0.35 + 0.65 * speed) : 1;
      if (Math.abs(power - previousPower) < 0.035) return;
      previousPower = power;
      gain.gain.setTargetAtTime(rotor ? 0.065 + 0.32 * power : 0.19, at, 0.055);
      if (rotor) {
        lfo.frequency.setTargetAtTime(9 + 16 * power, at, 0.055);
        filter.frequency.setTargetAtTime(870 + 510 * power, at, 0.055);
      }
    },
    stop(at, immediate) {
      if (immediate) disconnect();
      else gain.gain.setTargetAtTime(0, at, 0.014);
      const end = immediate ? at : at + 0.085;
      source.stop(end);
      lfo?.stop(end);
    },
  };
}

export function growthSound(ctx, out, t) {
  osc(ctx, out, t, { type: 'triangle', freq: 145, freqEnd: 580, glide: 0.29, peak: 0.24, attack: 0.016, decay: 0.32 });
  noise(ctx, out, t, { freq: 570, freqEnd: 2800, glide: 0.28, peak: 0.17, attack: 0.045, decay: 0.28 });
  for (const [i, pitch] of ['D5', 'F#5', 'A5', 'D6'].entries()) {
    mallet(ctx, out, t + 0.15 + 0.065 * i, note(pitch), 0.14, 0.34);
  }
  kick(ctx, out, t + 0.33, 0.24);
}

// ---- UI, countdown, results --------------------------------------------

export function tickSound(ctx, out, t, final) {
  if (!final) { mallet(ctx, out, t, note('G5'), 0.32, 0.3); return; }
  for (const name of ['C6', 'E6', 'G6']) mallet(ctx, out, t, note(name), 0.2, 0.6);
  osc(ctx, out, t, { freq: 880, freqEnd: 1760, glide: 0.18, peak: 0.08, attack: 0.01, decay: 0.3 });
  kick(ctx, out, t, 0.35);
}

export function uiSound(ctx, out, t, kind) {
  if (kind === 'confirm') {
    mallet(ctx, out, t, note('E6') * vary(10), 0.16, 0.2);
    mallet(ctx, out, t + 0.07, note('A6') * vary(10), 0.16, 0.3);
  } else if (kind === 'back') {
    mallet(ctx, out, t, note('A5') * vary(10), 0.15, 0.2);
    mallet(ctx, out, t + 0.07, note('E5') * vary(10), 0.15, 0.28);
  } else if (kind === 'click') {
    osc(ctx, out, t, { freq: 1500 * vary(40), freqEnd: 1100, peak: 0.1, attack: 0.002, decay: 0.05 });
    noise(ctx, out, t, { type: 'bandpass', freq: 4000, q: 1, peak: 0.04, decay: 0.01 });
  }
}

/** Returns the jingle length in seconds (used to duck the music), or 0 if unknown. */
export function resultSound(ctx, out, t, outcome) {
  if (outcome === 'win') {
    ['C5', 'E5', 'G5', 'C6'].forEach((name, i) => mallet(ctx, out, t + i * 0.1, note(name), 0.3, 0.45));
    const chordAt = t + 0.42;
    for (const name of ['C6', 'E6', 'G6']) toyLead(ctx, out, chordAt, note(name), 0.06, 0.8);
    ['C7', 'G6', 'E7'].forEach((name, i) => bell(ctx, out, chordAt + 0.06 + i * 0.09, note(name), 0.1, 1));
    kick(ctx, out, chordAt, 0.3);
    return 1.7;
  }
  if (outcome === 'lose') {
    // Comedic "wah wah wah waaah".
    ['G4', 'F#4', 'F4', 'E4'].forEach((name, i) => {
      const last = i === 3, length = last ? 1.0 : 0.26;
      osc(ctx, out, t + i * 0.34, { type: 'sawtooth', freq: note(name), freqEnd: note(name) * (last ? 0.94 : 0.985), glide: length,
        peak: 0.24, attack: 0.03, hold: length * 0.6, decay: length * 0.6,
        filter: { type: 'lowpass', freq: 500, freqEnd: 1700, glide: 0.12, q: 5 },
        vibrato: last ? { rate: 6, depth: 6 } : undefined });
    });
    return 2.1;
  }
  if (outcome === 'draw') {
    mallet(ctx, out, t, note('G5'), 0.28, 0.4);
    mallet(ctx, out, t + 0.16, note('C6'), 0.28, 0.4);
    mallet(ctx, out, t + 0.38, note('D6'), 0.24, 0.6);
    osc(ctx, out, t + 0.38, { freq: note('D6'), freqEnd: note('E6'), glide: 0.2, peak: 0.05, attack: 0.02, decay: 0.35 });
    return 1.1;
  }
  return 0;
}
