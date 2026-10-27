import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CLASH, CONFIG, fighterHeading, v3 } from '../src/physics.js';

const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const project = (velocity, heading) => velocity.x * Math.cos(heading) + velocity.z * Math.sin(heading);

function poseClash(world, rotation = 0, forwardSpeed = 2) {
  for (const [id, player] of world.players.entries()) {
    const x = id === 0 ? -1.5 : 1.5;
    player.p = v3(x * Math.cos(rotation), id === 0 ? 1 : 1.03, x * Math.sin(rotation));
    player.theta = Math.PI / 2;
    player.phi = (id === 0 ? 0.5 : Math.PI - 0.5) + rotation;
    player.facingOffset = id === 0 ? 0.3 : -0.4;
    player.wt = id === 0 ? -3 : 3;
    player.wp = 0;
    const heading = fighterHeading(player);
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
      const heading = fighterHeading(player), baseline = physicalOnly.players[id];
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
      assert.ok(Math.hypot(player.p.x, player.p.z) <= world.arenaRadius - CONFIG.bodyRadius + 1e-7);
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
