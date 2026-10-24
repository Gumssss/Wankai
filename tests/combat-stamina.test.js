import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, STAMINA, WEAPONS, damageForImpact, staffFrame, v3 } from '../src/physics.js';
import { GameSession } from '../src/game-session.js';
import {WEAPON_CATALOG} from '../src/weapon-catalog.js';
const selection=weaponId=>({characterId:WEAPON_CATALOG.find(w=>w.id===weaponId).characterId||'basic-fighter',weaponId});

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance,
  `Expected ${actual} to be near ${expected}`);

function solo(weapon = 'polearm', stamina = STAMINA.max) {
  const world = new ArenaPhysics();
  world.reset(false, true, selection(weapon));
  Object.assign(world.players[0], { p: v3(0, 10000, 0), theta: 0, stamina });
  return world;
}

function advance(world, seconds, input = {}, dt = CONFIG.step) {
  for (let step = 0; step < Math.round(seconds / dt); step++) world.step([input], dt);
}

function contact(weapon, turnShare, speed = 8, heading = 0, attackInput = 0) {
  const world = new ArenaPhysics();
  world.reset(true, false, weapon, 'polearm');
  const [attacker, target] = world.players;
  Object.assign(attacker, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: heading, polarInput: attackInput });
  const frame = staffFrame(attacker, 0.6);
  const radius = Math.hypot(frame.r.x, frame.r.z);
  const vertical = Math.sqrt(1 - turnShare), horizontal = Math.sqrt(turnShare);
  attacker.wt = speed * vertical / radius;
  attacker.wp = speed * horizontal / radius;
  // Put the target's head in the incoming path at the same contact distance.
  target.p = v3(frame.point.x - Math.sin(heading) * 0.24 * horizontal,
    frame.point.y - 0.76 - 0.24 * vertical, frame.point.z + Math.cos(heading) * 0.24 * horizontal);
  world.solveAttack(attacker, target, CONFIG.step);
  return world;
}

test('coasting turning hits deal half the equivalent vertical damage for every floating weapon and heading', () => {
  // This fixture places a target beside a single floating shaft. Attached ears
  // have their own measured socket/contact fixture in beagle-gameplay.test.js.
  for (const weapon of Object.keys(WEAPONS).filter(id => !WEAPONS[id].attachment)) for (const heading of [0, 0.7, Math.PI]) {
    const vertical = contact(weapon, 0, 8, heading).lastHit;
    const turning = contact(weapon, 1, 8, heading).lastHit;
    near(vertical.speed, 8); near(turning.speed, 8);
    assert.equal(vertical.damage, damageForImpact(8, 0));
    assert.equal(turning.damage, Math.round(vertical.damage * 0.5));
    near(turning.turnShare, 1);
    assert.equal(contact(weapon, 1, 8, heading, 1).lastHit.damage, turning.damage,
      'pressing a vertical key without vertical motion cannot disguise a turning hit');
  }
});

test('mixed hits blend the incoming motion and sideways turning cannot weaken an unrelated vertical contact', () => {
  const vertical = contact('polearm', 0).lastHit;
  const mixed = contact('polearm', 0.5).lastHit;
  const turning = contact('polearm', 1).lastHit;
  near(mixed.speed, vertical.speed);
  near(mixed.turnShare, 0.5);
  assert.ok(turning.damage < mixed.damage && mixed.damage < vertical.damage);
  const world = contact('polearm', 0);
  world.reset(true);
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, wp: 10 });
  const frame = staffFrame(a, 0.6);
  a.wt = 8 / frame.r.x;
  b.p = v3(frame.point.x, frame.point.y - 1, frame.point.z);
  world.solveAttack(a, b, CONFIG.step);
  near(world.lastHit.turnShare, 0);
  assert.equal(world.lastHit.damage, vertical.damage);
});

test('body-driven impacts retain their damage and slow touches still cause no damage', () => {
  const world = solo();
  world.reset(true);
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, v: v3(0, 0, 8) });
  const frame = staffFrame(a, 0.6);
  b.p = v3(frame.point.x, frame.point.y - 0.76, frame.point.z + 0.24);
  world.solveAttack(a, b, CONFIG.step);
  assert.equal(world.lastHit.damage, damageForImpact(8, 0));
  near(world.lastHit.turnShare, 0);
  for (const share of [0, 0.5, 1]) assert.equal(contact('polearm', share, 1).lastHit, null);
});

test('swing stamina lasts ten seconds, turning is cheaper, and simultaneous inputs add costs', () => {
  for (const weapon of Object.keys(WEAPONS)) {
    for (const [input, afterOneSecond] of [[{ theta: 1 }, 180], [{ phi: -1 }, 190], [{ theta: -1, phi: 1 }, 170]]) {
      const world = solo(weapon);
      advance(world, 1, input);
      near(world.players[0].stamina, afterOneSecond);
    }
    const world = solo(weapon);
    advance(world, 10, { theta: 1 });
    near(world.players[0].stamina, 0);
    advance(world, 1, { theta: 1 });
    assert.equal(world.players[0].stamina, 0, 'continued input cannot regenerate stamina');
  }
});

test('stamina recovery observes the release delay, clamps at full, and is independent of step size', () => {
  for (const dt of [1 / 180, 1 / 90, 1 / 60]) {
    const world = solo();
    advance(world, 2, { theta: 1 }, dt);
    near(world.players[0].stamina, 160);
    advance(world, 0.5, {}, dt);
    near(world.players[0].stamina, 160);
    advance(world, 0.5, {}, dt);
    near(world.players[0].stamina, 169.6);
    advance(world, 2, {}, dt);
    assert.equal(world.players[0].stamina, 200);
    advance(world, 0.5, { phi: 1 }, dt);
    near(world.players[0].stamina, 195);
    advance(world, 0.25, {}, dt);
    near(world.players[0].stamina, 195, 0.1);
  }
});

test('exhaustion weakens floating-weapon acceleration and turning while preserving coasting and reverse braking', () => {
  // Articulated body/ear fatigue and reaction are covered in beagle-flips/gameplay.
  for (const weapon of Object.keys(WEAPONS).filter(id=>!WEAPONS[id].attachment)) {
    const fresh = solo(weapon), tired = solo(weapon, 0);
    for (const world of [fresh, tired]) world.step([{ theta: 1, phi: 1 }]);
    near(tired.players[0].wt / fresh.players[0].wt, 0.4);
    near(tired.players[0].wp / fresh.players[0].wp, 0.4);
    advance(fresh, 2, { phi: 1 }); advance(tired, 2, { phi: 1 });
    assert.ok(tired.players[0].wp < fresh.players[0].wp * 0.65);
    for (const input of [{}, { theta: -1, phi: -1 }]) {
      const a = solo(weapon), b = solo(weapon, 0);
      for (const world of [a, b]) Object.assign(world.players[0], { wt: 5, wp: 5 });
      a.step([input]); b.step([input]);
      near(a.players[0].wt, b.players[0].wt);
      near(a.players[0].wp, b.players[0].wp);
    }
    const fast = solo(weapon, 0);
    fast.players[0].wp = WEAPONS[weapon].maxAngularSpeed;
    fast.step([{ phi: 1 }]);
    assert.ok(fast.players[0].wp > WEAPONS[weapon].maxAngularSpeed * 0.9,
      'exhaustion must brake progressively instead of snapping to the reduced speed cap');
  }
});

test('an exhausted fighter can still move through ground support with every weapon', () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const world = new ArenaPhysics(); world.reset(false, true, selection(weapon));
    const p = world.players[0]; p.stamina = 0; p.theta = 1.6;
    advance(world, 2, { theta: 1 });
    assert.equal(p.stamina, 0);
    assert.ok(Math.abs(p.p.x) > 0.05 || p.p.y > CONFIG.bodyFloor + 0.05, `${weapon} lost support movement`);
  }
});

function session() {
  const game = new GameSession();
  for (const method of ['unlock', 'tick', 'swing', 'impact', 'tone']) game.sound[method] = () => {};
  return game;
}

test('camera keys and cancelling weapon keys cost nothing, and each fighter spends stamina independently', () => {
  const game = session(); game.startRound('duel'); game.tick(0.06);
  game.state = 'playing';
  for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'Slash']) game.keyDown(key);
  for (let step = 0; step < 10; step++) game.tick(0.05);
  assert.deepEqual(game.getSnapshot().stamina, [200, 200]);
  game.clearKeys(); game.keyDown('ArrowDown');
  for (let step = 0; step < 10; step++) game.tick(0.05);
  assert.equal(game.getSnapshot().stamina[0], 200);
  assert.ok(game.getSnapshot().stamina[1] < 200);
});

test('countdown, pause, hit pause and result freeze stamina; rematches restore it in every mode', () => {
  for (const mode of ['duel', 'duel-fixed', 'practice', 'solo']) {
    const game = session(); game.startRound(mode);
    game.world.players[0].stamina = 40;
    game.keyDown('KeyW'); game.tick(0.05);
    assert.equal(game.world.players[0].stamina, 40, 'countdown must freeze stamina');
    game.state = 'playing'; game.tick(0.05);
    assert.ok(game.getSnapshot().stamina[0] < 40);
    game.pause();
    const before = game.world.players[0].stamina;
    for (let step = 0; step < 30; step++) game.tick(0.05);
    near(game.world.players[0].stamina, before);
    game.resume(); game.freeze = 0.5; game.tick(0.05);
    near(game.world.players[0].stamina, before);
    game.state = 'result'; game.tick(0.05);
    near(game.world.players[0].stamina, before);
    game.startRound();
    assert.deepEqual(game.getSnapshot().stamina, mode === 'solo' ? [200] : [200, 200]);
    assert.ok(game.world.players.every(p => p.staminaRestTime === 0));
  }
});
