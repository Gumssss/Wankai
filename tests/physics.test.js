import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cases } from './physics-cases.js';
import { ArenaPhysics, CONFIG, WEAPONS, fighterHeading, staffFrame } from '../src/physics.js';
import { duelCameraTarget, shortestAngle } from '../src/scene.js';

for (const [name, run] of cases) test(name, run);

test('sword shortens reach and responds faster to the same swing input without adding locomotion', () => {
  const polearm = new ArenaPhysics();
  const sword = new ArenaPhysics();
  polearm.reset(false, true);
  sword.reset(false, true, 'sword');
  const a = polearm.players[0], b = sword.players[0];
  assert.ok(WEAPONS.sword.length < CONFIG.staffLength);
  assert.equal(b.theta, Math.PI / 2, 'sword starts level');
  assert.equal(b.phi, 0, 'sword starts toward player two');
  const reach = player => {
    const tip = staffFrame(player).point;
    return Math.hypot(tip.x - player.p.x, tip.y - player.p.y, tip.z - player.p.z);
  };
  assert.ok(reach(b) < reach(a));
  for (const player of [a, b]) {
    player.p.y = 10;
    player.theta = 1.32;
    player.phi = 0;
  }
  for (let i = 0; i < 30; i++) {
    polearm.step([{ theta: 1, phi: 1 }]);
    sword.step([{ theta: 1, phi: 1 }]);
  }
  assert.ok(b.theta > a.theta, 'sword pitches farther for the same input');
  assert.ok(b.phi > a.phi, 'sword turns farther for the same input');
  assert.equal(b.p.x, 0, 'there is no direct movement input');
  assert.equal(b.p.z, 0, 'there is no direct movement input');
});

test('sword cannot make a body contact that the longer polearm can reach', () => {
  const polearm = new ArenaPhysics();
  const sword = new ArenaPhysics();
  polearm.reset(true);
  sword.reset(true, false, 'sword');
  for (const world of [polearm, sword]) {
    const [attacker, target] = world.players;
    attacker.p.x = 0;
    attacker.p.z = 0;
    attacker.theta = Math.PI / 2;
    attacker.phi = 0;
    target.p.x = 3.2;
    target.p.z = 0;
    world.solveAttack(attacker, target, CONFIG.step);
  }
  assert.equal(polearm.contacts[0].separated, 0, 'polearm reaches the target');
  assert.ok(sword.contacts[0].separated > 0, 'sword leaves a gap');
});

test('each fighter starts facing the opponent and weapon pitch cannot flip camera heading', () => {
  const world = new ArenaPhysics();
  const [first, second] = world.players;
  assert.ok(Math.abs(fighterHeading(first)) < 1e-8);
  assert.ok(Math.abs(fighterHeading(second) - Math.PI) < 1e-8);
  const heading = duelCameraTarget(first).heading;
  first.theta = 0;
  const raised = duelCameraTarget(first);
  first.theta = Math.PI / 2;
  const level = duelCameraTarget(first);
  first.theta = -Math.PI;
  const lowered = duelCameraTarget(first);
  assert.equal(raised.heading, heading);
  assert.equal(level.heading, heading);
  assert.equal(lowered.heading, heading);
  assert.ok(raised.height > level.height);
  assert.ok(level.height > lowered.height);
  first.phi += 0.4;
  assert.ok(Math.abs(duelCameraTarget(first).heading - heading - 0.4) < 1e-8);
  assert.ok(Math.abs(shortestAngle(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-8);
});
