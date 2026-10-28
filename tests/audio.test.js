import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { GameAudio, VOICE_FILES, MUSIC_TRACKS, ARENA_MUSIC, battleMusic } from '../src/audio.js';
import { MUSIC_CREDITS } from '../src/audio/credits.js';
import { isArenaSkin } from '../src/arena-skins.js';

const WEAPONS = ['yellow-staff', 'sword', 'polearm', 'hammer', 'axe', 'mace', 'pan', 'takeout-box', 'happy-paws', 'unknown-weapon'];

test('GameAudio is inert but fully callable without an AudioContext (Node)', async () => {
  assert.equal(globalThis.AudioContext, undefined);
  const audio = new GameAudio();
  assert.equal(audio.enabled, true);
  await audio.unlock();
  await audio.unlock();
  audio.setVolumes({ music: 0.3, sfx: 0.9 });
  assert.deepEqual(audio.volumes, { music: 0.3, sfx: 0.9 });
  audio.setVolumes({ music: 7 });
  audio.setVolumes({ sfx: -1 });
  audio.setVolumes();
  assert.deepEqual(audio.volumes, { music: 1, sfx: 0 });

  audio.playMusic('menu');
  audio.playMusic('menu');
  audio.playMusic('battle');
  audio.playMusic('nonsense');
  audio.playMusic(null);
  assert.equal(audio.timer, null);

  for (const strength of [0.12, 0.3, 1]) {
    for (const weapon of WEAPONS) {
      audio.impact({ type: 'hit', weapon, attacker: 0, target: 1, damage: 10, strength, speed: 3, source: 'weapon' });
    }
    audio.impact({ type: 'hit', weapon: 'takeout-box', attacker: 1, target: 0, damage: 8, strength, speed: 5, source: 'delivery' });
    for (const a of WEAPONS) for (const b of WEAPONS) audio.impact({ type: 'clash', strength, weapons: [a, b] });
    audio.impact({ type: 'clash', strength });
    audio.impact({ type: 'splat', strength });
  }
  audio.impact({ type: 'mystery' });
  audio.impact(null);
  audio.impact();

  for (const skill of ['laugh', 'twist', 'delivery', 'happy', 'unknown']) audio.skill({ skill, characterId: 'x', player: 0 });
  audio.skill();
  audio.tick();
  audio.tick(true);
  for (const outcome of ['win', 'lose', 'draw', 'other']) audio.result(outcome);
  for (const kind of ['click', 'confirm', 'back', 'other']) audio.ui(kind);
  audio.tone(440, 660, 0.4, 0.2, 'triangle');

  audio.enabled = false;
  assert.equal(audio.enabled, false);
  audio.playMusic('battle');
  audio.impact({ type: 'hit', weapon: 'pan', strength: 1 });
  audio.enabled = true;
  assert.equal(audio.musicRequest, 'battle');
  assert.equal(audio.timer, null);
});

test('voice and music override slots are named as documented', () => {
  assert.deepEqual(VOICE_FILES, { laugh: 'naiwa-laugh', delivery: 'dudu-feidudu', happy: 'happy-cat', twist: 'stickman-twist' });
  assert.deepEqual([...MUSIC_TRACKS].sort(), ['battle', 'battle-colosseum', 'battle-lakeside', 'menu']);
});

test('arena themes play their file, else the battle music, and hold the current music while decoding', () => {
  for (const skin of Object.keys(ARENA_MUSIC)) assert.ok(isArenaSkin(skin), skin);
  assert.equal(battleMusic('courtyard'), 'battle');
  assert.equal(battleMusic('colosseum'), 'battle-colosseum');
  assert.equal(battleMusic('lakeside'), 'battle-lakeside');
  assert.equal(battleMusic('toString'), 'battle');
  assert.equal(battleMusic(undefined), 'battle');

  const audio = new GameAudio();
  audio.musicLoads.set('battle-colosseum', { done: false });
  assert.equal(typeof audio.resolveMusic('battle-colosseum'), 'symbol');
  audio.musicLoads.get('battle-colosseum').done = true;
  assert.deepEqual(audio.resolveMusic('battle-colosseum'), { name: 'battle', fromFile: false });
  audio.musicBuffers.battle = {};
  assert.deepEqual(audio.resolveMusic('battle-colosseum'), { name: 'battle', fromFile: true });
  audio.musicBuffers['battle-colosseum'] = {};
  assert.deepEqual(audio.resolveMusic('battle-colosseum'), { name: 'battle-colosseum', fromFile: true });
  assert.deepEqual(audio.resolveMusic('menu'), { name: 'menu', fromFile: false });
  assert.equal(audio.resolveMusic(null), null);

  audio.playMusic('toString');
  assert.equal(audio.musicRequest, null);
  audio.playMusic('battle-lakeside');
  assert.equal(audio.musicRequest, 'battle-lakeside');
});

test('every shipped music file is credited, and every credit has a file', () => {
  const files = readdirSync(new URL('../public/audio/music/', import.meta.url))
    .filter(name => /\.(mp3|m4a|ogg|wav)$/.test(name)).map(name => name.replace(/\.[^.]+$/, '')).sort();
  assert.deepEqual(files, MUSIC_CREDITS.map(credit => credit.file).sort());
  for (const credit of MUSIC_CREDITS) assert.ok(MUSIC_TRACKS.includes(credit.file), credit.file);
});
