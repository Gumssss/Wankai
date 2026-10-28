import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, STAMINA, WEAPONS, damageForImpact, staffFrame, bodyRadius, v3, CLASH } from '../src/physics.js';
import { WEAPON_CATALOG } from '../src/weapon-catalog.js';
import { sandbox, sparring, quietSession } from './sandbox.js';

const selection=weaponId=>({characterId:WEAPON_CATALOG.find(w=>w.id===weaponId).characterId||'stickman',weaponId});

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance,
  `Expected ${actual} to be near ${expected}`);

function solo(weapon = 'polearm', stamina = STAMINA.max) {
  const world = new ArenaPhysics();
  sandbox(world,selection(weapon));
  Object.assign(world.players[0], { p: v3(0, 10000, 0), theta: 0, stamina });
  return world;
}

function advance(world, seconds, input = {}, dt = CONFIG.step) {
  for (let step = 0; step < Math.round(seconds / dt); step++) world.step([input], dt);
}

function contact(weapon, turnShare, speed = 8, heading = 0, attackInput = 0) {
  const world = new ArenaPhysics();
  sparring(world,weapon,'polearm');
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
  // This fixture places a target beside a single floating shaft. The takeout
  // box and the cat paw are broad across the turning direction, so a sideways
  // strike meets them first at a different radius.
  for (const weapon of Object.keys(WEAPONS).filter(id => id !== 'takeout-box' && id !== 'happy-paws')) for (const heading of [0, 0.7, Math.PI]) {
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
  sparring(world);
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
  sparring(world);
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, v: v3(0, 0, 8) });
  const frame = staffFrame(a, 0.6);
  b.p = v3(frame.point.x, frame.point.y - 0.76, frame.point.z + 0.24);
  world.solveAttack(a, b, CONFIG.step);
  assert.equal(world.lastHit.damage, damageForImpact(8, 0));
  near(world.lastHit.turnShare, 0);
  for (const share of [0, 0.5, 1]) assert.equal(contact('polearm', share, 1).lastHit, null);
});

test('swing stamina lasts a long while, turning is cheaper, and simultaneous inputs add costs', () => {
  const { max, swingDrain, turnDrain } = STAMINA;
  assert.ok(max / swingDrain > 15, 'a full bar lasts over 15 s of swinging');
  for (const weapon of Object.keys(WEAPONS)) {
    for (const [input, afterOneSecond] of [[{ theta: 1 }, max - swingDrain], [{ phi: -1 }, max - turnDrain], [{ theta: -1, phi: 1 }, max - swingDrain - turnDrain]]) {
      const world = solo(weapon);
      advance(world, 1, input);
      near(world.players[0].stamina, afterOneSecond);
    }
    const world = solo(weapon);
    advance(world, max / swingDrain, { theta: 1 });
    near(world.players[0].stamina, 0, 1e-6);
    advance(world, 1, { theta: 1 });
    assert.equal(world.players[0].stamina, 0, 'continued input cannot regenerate stamina');
  }
});

test('stamina recovery observes the release delay, clamps at full, and is independent of step size', () => {
  const { max, swingDrain, turnDrain, recoveryRate } = STAMINA;
  for (const dt of [1 / 180, 1 / 90, 1 / 60]) {
    const world = solo();
    advance(world, 5, { theta: 1 }, dt);
    near(world.players[0].stamina, max - 5 * swingDrain);
    advance(world, 0.5, {}, dt);
    near(world.players[0].stamina, max - 5 * swingDrain);
    advance(world, 0.5, {}, dt);
    near(world.players[0].stamina, max - 5 * swingDrain + 0.5 * recoveryRate);
    advance(world, 2, {}, dt);
    assert.equal(world.players[0].stamina, max);
    advance(world, 0.5, { phi: 1 }, dt);
    near(world.players[0].stamina, max - 0.5 * turnDrain);
    advance(world, 0.25, {}, dt);
    near(world.players[0].stamina, max - 0.5 * turnDrain, 0.1);
  }
});

test('exhaustion weakens floating-weapon acceleration and turning while preserving coasting and reverse braking', () => {
  for (const weapon of Object.keys(WEAPONS)) {
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
    const world = new ArenaPhysics(); sandbox(world,selection(weapon));
    const p = world.players[0]; p.stamina = 0; p.theta = 1.6;
    advance(world, 2, { theta: 1 });
    assert.equal(p.stamina, 0);
    assert.ok(Math.abs(p.p.x) > 0.05 || p.p.y > CONFIG.bodyFloor + 0.05, `${weapon} lost support movement`);
  }
});

const session = () => quietSession();

test('cancelling weapon keys costs nothing, and each fighter spends stamina independently', () => {
  const game = session(); game.startRound('ai'); game.tick(0.06);
  game.state = 'playing';
  for (const key of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) game.keyDown(key);
  for (let step = 0; step < 10; step++) game.tick(0.05);
  assert.deepEqual(game.getSnapshot().stamina, [200, 200]);
  game.clearKeys(); game.keyDown('KeyS');
  for (let step = 0; step < 10; step++) game.tick(0.05);
  assert.ok(game.getSnapshot().stamina[0] < 200);
  assert.equal(game.getSnapshot().stamina[1], 200);
});

test('countdown, pause, hit pause and result freeze stamina; rematches restore it', () => {
  {
    const game = session(); game.startRound('ai');
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
    assert.deepEqual(game.getSnapshot().stamina, [200, 200]);
    assert.ok(game.world.players.every(p => p.staminaRestTime === 0));
  }
});

{
// Recoil follows the weapon azimuth; the body may be looking elsewhere.
const weaponHeading = player => player.phi;

const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const project = (velocity, heading) => velocity.x * Math.cos(heading) + velocity.z * Math.sin(heading);

function poseClash(world, rotation = 0, forwardSpeed = 2) {
  for (const [id, player] of world.players.entries()) {
    const x = id === 0 ? -1.5 : 1.5;
    player.p = v3(x * Math.cos(rotation), id === 0 ? 1 : 1.03, x * Math.sin(rotation));
    player.theta = Math.PI / 2;
    player.phi = (id === 0 ? 0.5 : Math.PI - 0.5) + rotation;
    player.bodyYaw = player.phi + (id === 0 ? 0.3 : -0.4);
    player.wt = id === 0 ? -3 : 3;
    player.wp = 0;
    const heading = weaponHeading(player);
    player.v = v3(forwardSpeed * Math.cos(heading) - 0.75 * Math.sin(heading), 0.2,
      forwardSpeed * Math.sin(heading) + 0.75 * Math.cos(heading));
  }
}

function clash(rotation = 0, forwardSpeed = 2) {
  const world = new ArenaPhysics();
  poseClash(world, rotation, forwardSpeed);
  return world;
}

test('a strong weapon clash sends each fighter backward along their own facing while preserving lateral and vertical motion', () => {
  for (const rotation of [0, 0.7, 2.4]) {
    const world = clash(rotation), physicalOnly = clash(rotation);
    physicalOnly.clashArmed = false;
    physicalOnly.solveStaffClash(CONFIG.step);
    world.solveStaffClash(CONFIG.step);
    const event = world.events.find(event => event.type === 'clash');
    assert.ok(event && event.recoilSpeed >= CLASH.minRecoilSpeed && event.recoilSpeed <= CLASH.maxRecoilSpeed);
    for (const [id, player] of world.players.entries()) {
      const heading = weaponHeading(player), baseline = physicalOnly.players[id];
      assert.ok(project(player.v, heading) <= -event.recoilSpeed + 1e-8, 'forward momentum must become a backward step');
      assert.ok(project(player.v, heading) < project(baseline.v, heading), 'both fighters must receive recoil');
      near(project(player.v, heading + Math.PI / 2), project(baseline.v, heading + Math.PI / 2));
      near(player.v.y, baseline.v.y);
      assert.equal(player.health, 100); assert.equal(player.stamina, 200);
    }
  }
});

test('resting and gentle weapon contact do not trigger repeated backward steps', () => {
  const world = clash();
  for (let step = 0; step < 100; step++) {
    for (const player of world.players) { player.v = v3(); player.wt = 0; player.wp = 0; }
    world.time += CONFIG.step;
    world.solveStaffClash(CONFIG.step);
    assert.equal(world.events.length, 0);
    for (const player of world.players) { near(player.v.x, 0); near(player.v.z, 0); }
  }
});

test('one sustained clash gives one recoil and another needs separation plus cooldown', () => {
  const world = clash();
  world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 1);
  world.events.length = 0;
  for (let repeat = 0; repeat < 4; repeat++) {
    world.time += CLASH.cooldown + 0.01;
    poseClash(world);
    world.solveStaffClash(CONFIG.step);
    assert.equal(world.events.length, 0, 'continued contact must not repeat recoil, even after cooldown');
  }
  world.players[1].p.x += 20;
  world.time += CLASH.separationDelay / 2;
  world.solveStaffClash(CLASH.separationDelay / 2);
  poseClash(world); world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 0, 'a tiny gap must not rearm the clash');
  world.players[1].p.x += 20;
  world.time += CLASH.separationDelay + 0.001;
  world.solveStaffClash(CLASH.separationDelay + 0.001);
  poseClash(world); world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 1, 'separating and meeting again must produce a new recoil');
  world.events.length = 0;
  world.players[1].p.x += 20;
  world.time += CLASH.separationDelay + 0.001;
  world.solveStaffClash(CLASH.separationDelay + 0.001);
  poseClash(world); world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 0, 'rapid new contact must still obey the impact cooldown');
});

test('clash recoil does not erase a fighter\'s already faster backward momentum', () => {
  const world = clash(0.3, -10), physicalOnly = clash(0.3, -10);
  physicalOnly.clashArmed = false;
  physicalOnly.solveStaffClash(CONFIG.step);
  world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 1);
  for (const [id, player] of world.players.entries()) {
    for (const axis of ['x', 'y', 'z']) near(player.v[axis], physicalOnly.players[id].v[axis]);
  }
});

test('backward recoil remains inside the arena boundary with finite motion', () => {
  const world = clash(); world.endless = true;
  for (const player of world.players) player.p.x += 4.5;
  world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 1);
  for (let step = 0; step < 90; step++) {
    world.step([{}, {}]);
    for (const player of world.players) {
      assert.ok(Math.hypot(player.p.x, player.p.z) <= world.arenaRadius - bodyRadius(player) + 1e-7);
      assert.ok([player.p.x, player.p.y, player.p.z, player.v.x, player.v.y, player.v.z].every(Number.isFinite));
    }
  }
});

test('rematching clears the clash cooldown and rearms recoil for the new round', () => {
  const world = clash(); world.solveStaffClash(CONFIG.step);
  assert.equal(world.clashArmed, false);
  world.reset(); poseClash(world);
  world.solveStaffClash(CONFIG.step);
  assert.equal(world.events.length, 1);
  assert.ok(world.events[0].recoilSpeed > 0);
});
}
