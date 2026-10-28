import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAi, AI_DIFFICULTIES } from '../src/ai-opponent.js';
import { ArenaPhysics, MATCH_ARENA_SCALE, STAMINA } from '../src/physics.js';
import { ARENA_OBSTACLES } from '../src/arena-obstacles.js';
import { PLAYABLE_LOADOUTS } from '../src/loadouts.js';

const arena = (first, second) => {
  const world = new ArenaPhysics();
  world.reset(first, second, { arenaScale: MATCH_ARENA_SCALE, obstacles: ARENA_OBSTACLES });
  return world;
};
// Player 0 stands still; the AI plays player 1.
function duel(loadout, difficulty, seconds, { seed = 3, start } = {}) {
  const world = arena({ characterId: 'stickman', weaponId: 'polearm' }, loadout);
  if (start) Object.assign(world.players[0].p, start);
  const ai = createAi({ difficulty, seed }), inputs = [];
  let firstHit = null;
  for (let i = 0; i < seconds * 180 && world.winner === null; i++) {
    const input = ai.think(world, 1);
    inputs.push(input);
    world.step([{ theta: 0, phi: 0 }, input]);
    if (firstHit === null && world.players[0].health < 100) firstHit = world.time;
  }
  return { world, inputs, firstHit };
}

test('the AI only produces inputs a player could press', () => {
  const { inputs } = duel({ characterId: 'dudu', weaponId: 'takeout-box' }, 'hard', 15);
  for (const input of inputs) {
    assert.ok([-1, 0, 1].includes(input.theta));
    assert.ok(input.phi >= -1 && input.phi <= 1);
    assert.ok(Number.isFinite(input.faceYaw));
    assert.deepEqual(Object.keys(input).filter(key => !['theta', 'phi', 'faceYaw', 'skillTap'].includes(key)), []);
  }
});

test('the AI closes in around props and lands hits with every loadout', () => {
  for (const loadout of PLAYABLE_LOADOUTS) {
    const { firstHit } = duel(loadout, 'normal', 30, { start: { x: -12, z: 4 } });
    assert.ok(firstHit !== null, `${loadout.characterId}/${loadout.weaponId} never landed a hit`);
  }
});

test('the same seed replays the same match; another seed plays differently', () => {
  const loadout = { characterId: 'naiwa', weaponId: 'yellow-staff' };
  const a = duel(loadout, 'normal', 8, { seed: 5 }), b = duel(loadout, 'normal', 8, { seed: 5 }), c = duel(loadout, 'normal', 8, { seed: 6 });
  assert.deepEqual(a.world.players, b.world.players);
  assert.notDeepEqual(a.inputs, c.inputs);
});

test('a tired AI rests until its stamina has refilled', () => {
  const world = arena({ characterId: 'stickman', weaponId: 'sword' }, { characterId: 'stickman', weaponId: 'sword' });
  const ai = createAi({ difficulty: 'hard' });
  world.players[1].stamina = 5;
  for (let i = 0; i < 90; i++) {
    const input = ai.think(world, 1);
    assert.equal(input.theta, 0);
    assert.equal(input.phi, 0);
    world.step([{}, input]);
  }
  world.players[1].stamina = STAMINA.max;
  let moved = false;
  for (let i = 0; i < 180 * 2; i++) { const input = ai.think(world, 1); moved ||= input.theta !== 0; world.step([{}, input]); }
  assert.ok(moved, 'back in action once rested');
});

test('harder levels react faster and aim truer; two AIs can fight a full round', () => {
  const { easy, normal, hard } = AI_DIFFICULTIES;
  assert.ok(easy.reaction > normal.reaction && normal.reaction > hard.reaction);
  assert.ok(easy.aimError > normal.aimError && normal.aimError > hard.aimError);
  const world = arena({ characterId: 'naiwa', weaponId: 'yellow-staff' }, { characterId: 'dudu', weaponId: 'hammer' });
  const left = createAi({ difficulty: 'hard', seed: 1 }), right = createAi({ difficulty: 'hard', seed: 2 });
  for (let i = 0; i < 180 * 90 && world.winner === null; i++) {
    world.step([left.think(world, 0), right.think(world, 1)]);
    for (const p of world.players) assert.ok(Number.isFinite(p.p.x + p.p.z));
  }
  assert.ok(world.players.some(p => p.health < 100), 'the bout produced hits');
});
