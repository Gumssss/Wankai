// Procedural background music: two composed, humanised toy-box tracks played
// by warm synthesized instruments through a small room reverb and a tape-ish
// delay. A look-ahead scheduler pumps `scheduleUntil(time)` from a short timer.
import { noteMidi, midiHz, rand } from './core.js';
import { feltPiano, marimba, kalimba, upright, reedLead, softPad, kit, roomImpulse } from './music-voices.js';

// ---- shared helpers -----------------------------------------------------

/** "E5 - G5 . A5" (one token per eighth note, '-' holds, '.' rests) -> [{ pos (eighth), midi, len (eighths) }] */
function parseBar(text) {
  const tokens = text.trim().split(/\s+/);
  const notes = [];
  tokens.forEach((token, i) => {
    if (token === '-' || token === '.') return;
    let len = 1;
    while (tokens[i + len] === '-') len++;
    notes.push({ pos: i, midi: noteMidi(token), len });
  });
  return notes;
}
const bars = list => list.map(parseBar);

/** Triangular timing jitter in seconds (+/- ms). */
const jitter = ms => (Math.random() + Math.random() - 1) * ms / 1000;
/** Velocity with a little human variation. */
const human = (vel, spread = 0.12) => Math.max(0.05, Math.min(1, vel * (1 + (Math.random() * 2 - 1) * spread)));
const chance = p => Math.random() < p;

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Move a note by diatonic steps in C major / A minor (harmony lines). */
function diatonic(midi, steps) {
  const octave = Math.floor(midi / 12), pc = midi % 12;
  let degree = C_MAJOR.indexOf(pc);
  if (degree < 0) degree = C_MAJOR.indexOf((pc + 11) % 12);
  const total = degree + steps, wrapped = ((total % 7) + 7) % 7;
  return (octave + Math.floor(total / 7)) * 12 + C_MAJOR[wrapped];
}

// Chord voicings: rootless / inverted, close voice-leading around middle C.
// bass: root (MIDI), third and fifth offsets for walking lines.
const CHORDS = {
  Cmaj9: { bass: 36, third: 4, fifth: 7, voicing: [52, 55, 59, 62] },
  C69: { bass: 36, third: 4, fifth: 7, voicing: [52, 57, 62, 67] },
  C13: { bass: 36, third: 4, fifth: 7, voicing: [52, 57, 58, 62] },
  Cadd9: { bass: 36, third: 4, fifth: 7, voicing: [55, 60, 62, 64] },
  Am9: { bass: 33, third: 3, fifth: 7, voicing: [55, 59, 60, 64] },
  Dm9: { bass: 38, third: 3, fifth: 7, voicing: [53, 57, 60, 64] },
  G13: { bass: 31, third: 4, fifth: 7, voicing: [53, 57, 59, 64] },
  G6: { bass: 31, third: 4, fifth: 7, voicing: [55, 59, 62, 64] },
  Em7: { bass: 40, third: 3, fifth: 7, voicing: [55, 59, 62, 64] },
  A7: { bass: 33, third: 4, fifth: 7, voicing: [55, 61, 64, 66] },
  Fmaj9: { bass: 41, third: 4, fifth: 7, voicing: [55, 57, 60, 64] },
  Fm6: { bass: 41, third: 3, fifth: 7, voicing: [56, 60, 62, 65] },
  E7: { bass: 40, third: 4, fifth: 7, voicing: [56, 59, 62, 64] },
  E7sus: { bass: 40, third: 5, fifth: 7, voicing: [57, 59, 62, 64] },
  Bm7b5: { bass: 35, third: 3, fifth: 6, voicing: [53, 57, 59, 62] },
};

/** Chord active at an eighth position of a bar given ['A'] or ['A', 'B'] (half bars). */
const chordAt = (bar, eighth, perEighths = 8) => CHORDS[bar.length > 1 && eighth >= perEighths / 2 ? bar[1] : bar[0]];

/** Approach note into the next root: chromatic from below/above or the dominant. */
function approach(next, current) {
  const target = next.bass;
  const options = [target - 1, target + 1, target + 7 - 12 >= 28 ? target + 7 - 12 : target + 7];
  return options[Math.floor(Math.random() * (target === current.bass ? 2 : 3))];
}

/** Strum a voicing: low to high with a few ms between notes, top voice slightly accented. */
function comp(bus, t, chord, { vel, length, instrument = feltPiano, spread = 0.012, octave = 0, verb = 0.3 }) {
  chord.voicing.forEach((midi, i, all) => {
    const accent = i === all.length - 1 ? 1.12 : 0.9;
    instrument(bus, t + i * spread * rand(0.6, 1.2) + jitter(3), midiHz(midi + octave),
      { vel: human(vel * accent, 0.1), length: length * rand(0.85, 1.05), pan: (i / (all.length - 1) - 0.5) * 0.5, verb });
  });
}

// ---- menu: "Toy Box Afternoon" — swung, cosy, ~96 BPM, 32-bar A A' B A'' --------

const MENU_CHORDS = [
  // A
  ['Cmaj9'], ['Am9'], ['Dm9'], ['G13'], ['Cmaj9'], ['Em7', 'A7'], ['Dm9', 'G13'], ['Cmaj9'],
  // A' (last bar turns toward F for the bridge)
  ['Cmaj9'], ['Am9'], ['Dm9'], ['G13'], ['Cmaj9'], ['Em7', 'A7'], ['Dm9', 'G13'], ['Cmaj9', 'C13'],
  // B (bridge)
  ['Fmaj9'], ['Fm6'], ['Em7'], ['A7'], ['Dm9'], ['G13'], ['Em7', 'A7'], ['Dm9', 'G13'],
  // A''
  ['Cmaj9'], ['Am9'], ['Dm9'], ['G13'], ['Cmaj9'], ['Em7', 'A7'], ['Dm9', 'G13'], ['C69'],
];

const MENU_MELODY = [
  ...bars([ // A: call (1-2) / answer (3-4), call again (5-6) / cadence (7-8)
    '.  E5 G5 A5 G5 -  E5 D5',
    'E5 -  -  -  .  C5 D5 E5',
    'F5 -  A5 -  G5 F5 E5 D5',
    'D5 -  -  -  .  .  .  .',
    '.  E5 G5 A5 G5 -  E5 G5',
    'B5 -  A5 G5 .  E5 G5 A5',
    'F5 -  E5 D5 .  B4 D5 F5',
    'E5 -  -  -  .  .  .  .',
  ]),
  ...bars([ // A': the second statement climbs higher and ornaments the answer
    '.  E5 G5 A5 C6 -  A5 G5',
    'E5 -  -  -  .  D5 E5 G5',
    'A5 -  F5 -  G5 F5 E5 D5',
    'D5 -  -  -  .  G4 A4 B4',
    'C5 E5 G5 A5 G5 -  E5 G5',
    'B5 -  C6 B5 A5 -  G5 A5',
    'F5 -  A5 G5 .  F5 E5 D5',
    'C5 -  -  -  .  .  .  .',
  ]),
  ...bars([ // B: long singing notes over the bridge
    'A5 -  -  -  C6 -  A5 G5',
    'Ab5 - -  -  F5 -  -  .',
    'G5 -  -  -  B5 -  G5 E5',
    'C#6 - -  -  A5 -  .  .',
    'D6 -  C6 A5 F5 -  A5 -',
    'B5 -  -  -  G5 -  F5 E5',
    'G5 -  E5 G5 A5 -  E5 -',
    'F5 -  D5 -  B4 -  D5 -',
  ]),
  ...bars([ // A'': home again, with a new turn in bars 5-7
    '.  E5 G5 A5 G5 -  E5 D5',
    'E5 -  -  -  .  C5 D5 E5',
    'F5 -  A5 -  G5 F5 E5 D5',
    'D5 -  -  -  .  G4 A4 B4',
    'C6 -  B5 A5 G5 -  E5 G5',
    'A5 -  G5 E5 .  C#5 E5 G5',
    'F5 -  A5 -  G5 -  B4 D5',
    'C5 -  -  -  -  -  -  -',
  ]),
];

// Kalimba answers in the gaps the melody leaves (call and response).
const MENU_ANSWERS = {
  3: parseBar('.  .  .  .  F5 E5 D5 B4'),
  7: parseBar('.  .  .  .  G5 A5 C6 E6'),
  11: parseBar('.  .  .  .  .  F5 G5 .'),
  15: parseBar('.  .  .  .  Bb5 A5 G5 E5'),
  31: parseBar('.  .  .  .  E6 D6 A5 G5'),
};

// Piano comping rhythms ([eighth, length in eighths]); varied bar to bar.
const MENU_COMP = [
  [[0, 3], [3, 2], [6, 2]],
  [[0, 4], [4, 3]],
  [[1, 2], [4, 1], [5, 3]],
  [[0, 2], [3, 3], [7, 1]],
  [[0, 6], [7, 1]],
];

const MENU_SWING = 0.62; // swung eighths (2:1 is 0.667)

const menu = {
  bpm: 96,
  stepsPerBeat: 2,
  play(bus, step, gridTime, sd) {
    const beat = sd * 2;
    const bar = Math.floor(step / 8) % 32, pass = Math.floor(step / 256), eighth = step % 8;
    const t = gridTime + (eighth % 2 ? (MENU_SWING - 0.5) * beat : 0);
    const section = Math.floor(bar / 8), inBar = bar % 8;
    const chords = MENU_CHORDS[bar], chord = chordAt(chords, eighth);
    const next = chordAt(MENU_CHORDS[(bar + 1) % 32], 0);
    // Phrase dynamics: A soft, A' warmer, crescendo through the bridge, A'' full then easing off.
    const dyn = [0.78, 0.86, 0.84 + inBar * 0.03, section === 3 && inBar === 7 ? 0.85 : 0.95][section];

    // Melody (laid back a few ms, never quite on the grid).
    for (const n of MENU_MELODY[bar]) {
      if (n.pos !== eighth) continue;
      const at = t + 0.006 + jitter(7), f = midiHz(n.midi), length = n.len * beat * 0.5 * rand(0.85, 1);
      const vel = human(dyn * (eighth === 0 || n.len > 2 ? 0.92 : 0.78));
      if (section === 0) marimba(bus, at, f, { vel, length, pan: 0.08, verb: 0.28, delay: 0.1 });
      else if (section === 1) { kalimba(bus, at, f, { vel, length, pan: 0.05, verb: 0.3, delay: 0.12 }); marimba(bus, at + 0.004, midiHz(diatonic(n.midi, -2)), { vel: vel * 0.45, length, pan: -0.2 }); }
      else if (section === 2) { feltPiano(bus, at, f, { vel: vel * 0.9, length: length + 0.3, pan: 0.1, verb: 0.38, delay: 0.1 }); marimba(bus, at, f / 2, { vel: vel * 0.4, length, pan: -0.15 }); }
      else { marimba(bus, at, f, { vel, length, pan: 0.08, verb: 0.28, delay: 0.1 }); if (n.len >= 2) kalimba(bus, at + 0.01, f * 2, { vel: vel * 0.35, length, pan: 0.3 }); }
    }
    const answer = MENU_ANSWERS[bar];
    if (answer) for (const n of answer) if (n.pos === eighth)
      kalimba(bus, t + jitter(8), midiHz(n.midi), { vel: human(dyn * 0.6), length: beat, pan: -0.32, verb: 0.35, delay: 0.15 });

    // Felt-piano comping, rhythm varied per bar and per pass.
    const pattern = section === 2 && inBar < 4 ? [[0, 8]] : MENU_COMP[(bar * 3 + pass + (section === 1 ? 2 : 0)) % MENU_COMP.length];
    for (const [pos, len] of pattern) if (pos === eighth)
      comp(bus, t + jitter(6), chord, { vel: dyn * (pos === 0 ? 0.55 : 0.45), length: len * beat * 0.5 });
    if (section === 2 && eighth === 0) for (const midi of chord.voicing.slice(1)) softPad(bus, t, midiHz(midi), { vel: dyn * 0.9, length: beat * 4.2, pan: rand(-0.4, 0.4) });

    // Bass: two-feel in A sections, walking quarters in the bridge, approach notes into changes.
    const walk = section === 2;
    if (eighth % 2 === 0) {
      const quarter = eighth / 2;
      let midi = null, len = beat * 0.9;
      if (walk) {
        midi = quarter === 0 ? chord.bass : quarter === 1 ? chord.bass + (chance(0.5) ? chord.third : 12) : quarter === 2 ? chord.bass + chord.fifth : approach(next, chord);
      } else if (quarter === 0) { midi = chord.bass; len = beat * 1.8; }
      else if (quarter === 2) { midi = chords.length > 1 ? chord.bass : chord.bass + chord.fifth; len = beat * (chance(0.5) ? 1.8 : 0.9); }
      else if (quarter === 3 && chance(0.4) && next !== chord) { midi = approach(next, chord); len = beat * 0.8; }
      if (midi !== null) upright(bus, t + jitter(5), midiHz(midi), { vel: human(dyn * (quarter === 0 ? 0.85 : 0.72)), length: len });
    }
    if (!walk && eighth === 7 && chance(0.18)) upright(bus, t, midiHz(chord.bass + 12), { vel: 0.3, length: beat * 0.3 }); // ghost

    // Brushes: swirl per beat, taps on 2 & 4, ghost taps on swung off-beats, small fills at phrase ends.
    if (pass === 0 && bar < 2) return;
    if (eighth % 2 === 0) kit.brushSwirl(bus, t, beat * 0.95, dyn * 0.8, eighth % 4 ? 0.25 : -0.25);
    if (eighth === 2 || eighth === 6) kit.brushTap(bus, t + jitter(5), human(dyn * 0.65), 0.12);
    if ((eighth === 7 && chance(0.4)) || (eighth === 3 && chance(0.25))) kit.brushTap(bus, t + jitter(6), human(dyn * 0.25), 0.18);
    if (eighth === 0 && (inBar % 2 === 0 || chance(0.4))) kit.kick(bus, t + jitter(4), human(dyn * 0.55), true);
    if (walk && eighth === 3 && chance(0.4)) kit.kick(bus, t, human(dyn * 0.35), true);
    if (inBar === 7 && eighth >= 5) kit.brushTap(bus, t + jitter(4), human(dyn * (0.35 + (eighth - 5) * 0.15)), -0.15);
    if (inBar === 0 && eighth === 0 && (section > 0 || pass > 0)) kit.ride(bus, t, dyn * 0.8);
  },
};

// ---- battle: "Plush Brawl" — 132 BPM, intro + 32-bar A A' B A'' ----------------

const INTRO_BARS = 4;
const BATTLE_CHORDS = [
  // A
  ['Am9'], ['Fmaj9'], ['Cadd9'], ['G6'], ['Am9'], ['Fmaj9'], ['Dm9'], ['E7'],
  // A'
  ['Am9'], ['Fmaj9'], ['Cadd9'], ['G6'], ['Am9'], ['Fmaj9'], ['Dm9'], ['E7sus', 'E7'],
  // B (bridge)
  ['Dm9'], ['G13'], ['Cmaj9'], ['Fmaj9'], ['Bm7b5'], ['E7'], ['Am9'], ['E7sus', 'E7'],
  // A''
  ['Am9'], ['Fmaj9'], ['Cadd9'], ['G6'], ['Am9'], ['Fmaj9'], ['Dm9'], ['E7'],
];
const INTRO_CHORDS = [['Am9'], ['Fmaj9'], ['Dm9'], ['E7sus', 'E7']];

const BATTLE_A = bars([
  'E5 A5 -  B5 C6 -  B5 A5',
  'G5 -  A5 -  -  -  .  .',
  'E5 G5 -  A5 C6 -  D6 E6',
  'D6 -  B5 -  G5 -  .  .',
  'E5 A5 -  B5 C6 -  E6 -',
  'D6 C6 A5 -  G5 -  A5 -',
  'F5 -  A5 -  D6 -  C6 -',
  'B5 -  -  -  G#5 - B5 -',
]);
const BATTLE_A2 = bars([
  'E5 A5 -  B5 C6 -  B5 A5',
  'G5 -  A5 -  C6 -  B5 A5',
  'E5 G5 -  A5 C6 -  D6 E6',
  'D6 -  E6 -  G6 -  .  .',
  'E6 -  D6 C6 B5 -  A5 -',
  'C6 -  -  -  A5 -  G5 -',
  'F5 -  A5 -  D6 -  F6 -',
  'E6 -  -  -  -  -  .  .',
]);
const BATTLE_B = bars([
  'A5 -  -  -  F5 -  A5 -',
  'B5 -  -  -  G5 -  -  -',
  'G5 -  -  -  E5 -  G5 -',
  'A5 -  -  -  C6 -  -  -',
  'D6 -  -  -  B5 -  A5 -',
  'G#5 - -  -  B5 -  D6 -',
  'C6 -  -  -  B5 -  A5 -',
  'B5 -  -  -  .  .  .  .',
]);
const BATTLE_A3 = bars([
  'E5 A5 -  B5 C6 -  B5 A5',
  'G5 -  A5 -  C6 -  B5 A5',
  'E5 G5 -  A5 C6 -  D6 E6',
  'G6 -  E6 -  D6 -  B5 -',
  'E6 -  D6 C6 B5 -  A5 -',
  'C6 -  -  -  A5 -  G5 -',
  'F5 -  A5 -  D6 -  F6 E6',
  'E6 -  -  -  B5 -  G#5 -',
]);
const BATTLE_MELODY = [...BATTLE_A, ...BATTLE_A2, ...BATTLE_B, ...BATTLE_A3];

// Bass figures in 16ths: [pos, 'R'oot | 'O'ctave | 'F'ifth | 'A'pproach, length in 16ths]
const BASS_FIGURES = [
  [[0, 'R', 3], [3, 'R', 2], [6, 'O', 2], [8, 'R', 2], [11, 'F', 2], [14, 'A', 2]],
  [[0, 'R', 2], [3, 'O', 1], [6, 'R', 2], [8, 'O', 2], [10, 'R', 2], [12, 'F', 2], [14, 'O', 1]],
  [[0, 'R', 3], [4, 'R', 2], [7, 'O', 1], [8, 'F', 3], [12, 'R', 2], [14, 'A', 2]],
];
const BASS_HALF = [[0, 'R', 6], [10, 'F', 2], [12, 'R', 3]];
// Keys comping in 16ths: [pos, length in 16ths]
const KEYS_FIGURES = [
  [[2, 2], [6, 1], [10, 2], [13, 3]],
  [[0, 3], [3, 2], [7, 2], [10, 1], [14, 2]],
  [[2, 1], [5, 2], [8, 3], [12, 1], [14, 1]],
];

const battle = {
  bpm: 132,
  stepsPerBeat: 4,
  play(bus, step, t, sd) {
    const beat = sd * 4;
    const absBar = Math.floor(step / 16), pos = step % 16;
    const intro = absBar < INTRO_BARS;
    const bar = intro ? -1 : (absBar - INTRO_BARS) % 32;
    const pass = intro ? 0 : Math.floor((absBar - INTRO_BARS) / 32);
    const section = intro ? -1 : Math.floor(bar / 8), inBar = intro ? absBar : bar % 8;
    const chords = intro ? INTRO_CHORDS[absBar] : BATTLE_CHORDS[bar];
    const chord = chordAt(chords, pos, 16);
    const nextChords = intro ? (absBar + 1 < INTRO_BARS ? INTRO_CHORDS[absBar + 1] : BATTLE_CHORDS[0]) : BATTLE_CHORDS[(bar + 1) % 32];
    const next = chordAt(nextChords, 0, 16);
    const dyn = intro ? 0.6 + absBar * 0.1 : [0.84, 0.92, 0.8 + inBar * 0.035, 1][section];
    const at = (ms = 5) => t + jitter(ms);
    const halfTime = section === 2 && inBar < 4;
    const build = (section === 2 && inBar >= 6) || (intro && absBar === 3);
    const phraseEnd = inBar === 7 || (intro && absBar === 3);

    // -- drums
    let kickHere;
    if (intro) kickHere = pos === 0 || pos === 8 || (absBar >= 2 && (pos === 4 || pos === 12));
    else if (halfTime) kickHere = pos === 0 || pos === 10 || (pos === 7 && chance(0.3));
    else if (section === 0) kickHere = pos === 0 || pos === 8 || pos === 6 || (pos === 10 && inBar % 2 === 1) || (pos === 15 && chance(0.15));
    else kickHere = pos % 4 === 0 || (pos === 14 && chance(0.2));
    if (kickHere) kit.kick(bus, at(3), human(dyn * (pos === 0 ? 1 : 0.86), 0.06));

    const backbeat = halfTime ? pos === 8 : pos === 4 || pos === 12;
    if (!intro || absBar >= 2) {
      if (backbeat && !build) { kit.snare(bus, at(4), human(dyn * 0.9, 0.06)); if (section === 3 || (section === 1 && inBar >= 4)) kit.clap(bus, at(6), dyn * 0.6); }
      else if (!build && (pos === 7 || pos === 15 || pos === 10) && chance(0.22)) kit.snare(bus, at(6), human(0.18)); // ghost notes
    }
    if (build && pos % 2 === 0 && pos >= (intro ? 8 : 0)) kit.snare(bus, at(3), human(0.2 + 0.6 * ((inBar % 2) * 16 + pos) / 32));
    // Tom fills into the next section.
    if (phraseEnd && !build && pos >= 12) kit.tom(bus, at(4), [196, 165, 131, 110][pos - 12], human(dyn * 0.8), [0.3, 0.1, -0.1, -0.3][pos - 12]);
    if (inBar === 0 && pos === 0 && section >= 0) kit.cymbal(bus, t, dyn * 0.9, chance(0.5) ? 0.25 : -0.25);
    if ((intro && absBar === 3 && pos === 0) || (section === 2 && inBar === 6 && pos === 0)) kit.riser(bus, t, beat * (intro ? 4 : 8), dyn);

    // Hats: eighths with accented off-beats, 16ths in A' and A'', opening on the "and" of 4.
    const sixteenths = section === 1 || section === 3;
    if (!(phraseEnd && pos >= 12) && (sixteenths || pos % 2 === 0) && !(intro && absBar === 0 && pos % 4)) {
      const open = pos === 14 && (inBar % 2 === 1 || section === 3);
      const accent = pos % 4 === 2 ? 0.95 : pos % 4 === 0 ? 0.7 : 0.38;
      kit.hat(bus, at(4), human(dyn * accent * (halfTime ? 0.6 : 1)), open);
    }
    if (halfTime && pos % 2 === 1) kit.shaker(bus, at(5), human(0.5));

    // -- bass
    const figure = halfTime ? BASS_HALF : BASS_FIGURES[(inBar + pass + (section === 1 ? 1 : 0)) % BASS_FIGURES.length];
    for (const [p, kind, len] of figure) {
      if (p !== pos) continue;
      const midi = kind === 'R' ? chord.bass : kind === 'O' ? chord.bass + 12 : kind === 'F' ? chord.bass + chord.fifth : approach(next, chord);
      upright(bus, at(4), midiHz(midi + 12), { vel: human(dyn * (p === 0 ? 0.95 : 0.78)), length: len * sd * 0.9, bright: 1.5 + (intro ? absBar * 0.2 : 0.6) });
    }

    // -- keys
    if (!intro || absBar >= 2) {
      if (section === 2 && pos === 0) {
        comp(bus, t, chord, { vel: dyn * 0.55, length: beat * 3.5, spread: 0.02, verb: 0.4 });
        for (const midi of chord.voicing) softPad(bus, t, midiHz(midi), { vel: dyn * 0.8, length: beat * 4.2, pan: rand(-0.5, 0.5) });
      } else if (section !== 2) {
        const keys = KEYS_FIGURES[(inBar * 2 + pass + Math.max(0, section)) % KEYS_FIGURES.length];
        for (const [p, len] of keys) if (p === pos)
          comp(bus, at(5), chord, { vel: dyn * (p % 4 === 0 ? 0.55 : 0.45), length: len * sd * 0.85, instrument: p % 4 === 0 ? feltPiano : marimba, spread: 0.006, verb: 0.2 });
      }
    }

    // -- melody
    if (intro || pos % 2) return;
    for (const n of BATTLE_MELODY[bar]) {
      if (n.pos * 2 !== pos) continue;
      const f = midiHz(n.midi), length = n.len * sd * 2 * rand(0.8, 0.95);
      const vel = human(dyn * (pos % 8 === 0 ? 0.95 : 0.8));
      if (section === 2) {
        marimba(bus, at(6), f, { vel, length, pan: -0.1, verb: 0.3, delay: 0.15 });
        feltPiano(bus, at(6), f, { vel: vel * 0.6, length: length + 0.2, pan: 0.15, verb: 0.35 });
      } else {
        reedLead(bus, at(5), f, { vel, length, pan: 0.05 });
        if (section === 1 && n.len >= 2) kalimba(bus, at(6), f * 2, { vel: vel * 0.45, length, pan: 0.35 });
        if (section === 3) marimba(bus, at(6), midiHz(diatonic(n.midi, -2)), { vel: vel * 0.6, length, pan: -0.3, verb: 0.25 });
      }
    }
  },
};

export const TRACKS = { menu, battle };

// ---- players ----------------------------------------------------------

/** Per-player effects: room reverb + filtered feedback delay, all under the fade gain. */
function effectsBus(ctx, out, { level, reverb, delayTime, feedback, delayLevel }) {
  const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(out);
  const dry = ctx.createGain(); dry.gain.value = level; dry.connect(gain);
  const verb = ctx.createGain(); verb.gain.value = level;
  const convolver = ctx.createConvolver(); convolver.buffer = roomImpulse(ctx);
  const verbReturn = ctx.createGain(); verbReturn.gain.value = reverb;
  verb.connect(convolver); convolver.connect(verbReturn); verbReturn.connect(gain);
  const delay = ctx.createGain(); delay.gain.value = level;
  const line = ctx.createDelay(1.5); line.delayTime.value = delayTime;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
  const loop = ctx.createGain(); loop.gain.value = feedback;
  const delayReturn = ctx.createGain(); delayReturn.gain.value = delayLevel;
  delay.connect(line); line.connect(tone); tone.connect(loop); loop.connect(line);
  tone.connect(delayReturn); delayReturn.connect(gain); delayReturn.connect(verb);
  return { gain, bus: { ctx, dry, verb, delay }, nodes: [gain, dry, verb, convolver, verbReturn, delay, line, tone, loop, delayReturn] };
}

const FX = {
  menu: beat => ({ level: 1.5, reverb: 0.55, delayTime: beat * 0.75, feedback: 0.28, delayLevel: 0.35 }),
  battle: beat => ({ level: 1, reverb: 0.35, delayTime: beat * 0.75, feedback: 0.3, delayLevel: 0.4 }),
};

/** One running procedural track with its own fade gain and effects. */
export class MusicPlayer {
  constructor(ctx, out, trackName, startTime) {
    this.ctx = ctx;
    this.trackName = trackName;
    this.track = TRACKS[trackName];
    const beat = 60 / this.track.bpm;
    this.stepDur = beat / this.track.stepsPerBeat;
    const fx = effectsBus(ctx, out, FX[trackName](beat));
    this.gain = fx.gain;
    this.bus = fx.bus;
    this.nodes = fx.nodes;
    this.step = 0;
    this.nextTime = startTime;
    this.stopAt = Infinity;
  }

  fadeIn(t, duration) {
    this.gain.gain.setValueAtTime(0, t);
    this.gain.gain.linearRampToValueAtTime(1, t + duration);
  }

  fadeOut(t, duration) {
    const param = this.gain.gain;
    if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t);
    else { param.cancelScheduledValues(t); param.setValueAtTime(param.value, t); }
    param.linearRampToValueAtTime(0, t + duration);
    this.stopAt = t + duration;
  }

  /** Schedule every step that starts before `until`. */
  scheduleUntil(until) {
    const now = this.ctx.currentTime;
    // After a long stall (suspended context, hidden tab) resync instead of bursting notes.
    if (this.nextTime < now - 0.1) this.nextTime = now + 0.03;
    while (this.nextTime < until && this.nextTime < this.stopAt) {
      this.track.play(this.bus, this.step, Math.max(this.nextTime, now + 0.015), this.stepDur);
      this.step++;
      this.nextTime += this.stepDur;
    }
  }

  finished(now) { return now > this.stopAt + 2; }

  dispose() { for (const node of this.nodes) node.disconnect(); }
}

/** A looping file override (public/audio/music/<track>.*). */
export class BufferMusicPlayer {
  constructor(ctx, out, trackName, buffer, startTime) {
    this.ctx = ctx;
    this.trackName = trackName;
    this.fromFile = true;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(out);
    this.source = ctx.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.gain);
    this.source.start(startTime);
    this.stopAt = Infinity;
  }

  fadeIn(t, duration) { MusicPlayer.prototype.fadeIn.call(this, t, duration); }

  fadeOut(t, duration) {
    MusicPlayer.prototype.fadeOut.call(this, t, duration);
    try { this.source.stop(t + duration + 0.05); } catch { /* already stopped */ }
  }

  scheduleUntil() {}

  finished(now) { return now > this.stopAt + 0.5; }

  dispose() { this.source.disconnect(); this.gain.disconnect(); }
}
