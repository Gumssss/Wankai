import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, WEAPONS, closestSegments, staffFrame, weaponSegments, v3 } from '../src/physics.js';
import {sandbox,sparring} from './sandbox.js';
import { CHARACTERS } from '../src/character-catalog.js';

const idle = [{}, {}];
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);

test('the shortened polearm cannot hit a head beyond its visible tip', () => {
  const world = new ArenaPhysics(); sparring(world,'polearm','sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, v: v3(6, 0, 0) });
  b.p = v3(4.02, 10 - .76, 0);
  assert.ok(b.p.x - staffFrame(a).point.x > CONFIG.bodyRadius + WEAPONS.polearm.radius,
    'target must be clearly beyond the visible polearm');
  world.solveAttack(a, b, CONFIG.step);
  assert.equal(b.health, 100, 'old longer contact geometry must not cause an invisible hit');
});

test('the half-speed trial limits both axes while retaining responsive starts and reverse braking', () => {
  for (const [weapon, cap] of [['sword', 6.1], ['polearm', 4.25], ['hammer', 3.4]]) {
    const world = new ArenaPhysics(); sandbox(world,weapon);
    const p = world.players[0]; p.p.y = 10000; p.theta = 0;
    world.step([{ theta: 1, phi: 1 }]);
    near(p.wp, WEAPONS[weapon].motorAcceleration * CONFIG.step * Math.exp(-CONFIG.damping * CONFIG.step));
    for (let step = 0; step < 180; step++) {
      world.step([{ theta: 1, phi: 1 }]);
      assert.ok(Math.abs(p.wp) <= cap && Math.abs(p.wt) <= cap);
    }
    near(p.wp, cap); near(p.wt, cap);
    const before = p.wt;
    world.step([{ theta: -1 }]);
    assert.ok(p.wt < before && p.wt > 0, 'reversal brakes without instantly flipping');
  }
});

function crossing(gap = 0.17) {
  const world = new ArenaPhysics(); world.reset('sword','sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, v: v3(0, 0, -12) });
  Object.assign(b, { p: v3(2.65 + gap, 8, -0.06), theta: 0, phi: 0, v: v3(0, 0, 12) });
  return world;
}

function weaponClearance(world) {
  const [a, b] = world.players;
  return Math.min(...weaponSegments(a).flatMap(sa => weaponSegments(b).map(sb =>
    closestSegments(sa.a, sa.b, sb.a, sb.b).distance - sa.radius - sb.radius)));
}

test('a weapon crossing between two separated 180 Hz poses registers and deflects both fighters', () => {
  const world = crossing();
  assert.ok(weaponClearance(world) > 0, 'start pose must be separated');
  world.step(idle);
  assert.ok(weaponClearance(world) > 0, 'end pose must also be separated');
  assert.equal(world.events.filter(event => event.type === 'clash').length, 1);
  assert.ok(Math.abs(world.players[0].wp) > 0.01 && Math.abs(world.players[1].wt) > 0.01,
    'the contact must deflect both weapons even when both fighters recoil along their own heading');
  near(world.time, CONFIG.step);
});

test('a nearby swept weapon miss stays a miss without a forgiving collision margin', () => {
  const world = crossing(0.2);
  world.step(idle);
  assert.equal(world.events.length, 0);
  near(world.players[0].v.x, 0); near(world.players[1].v.x, 0);
});

// The stickman's torso capsule; gaps are measured from its surface.
const TORSO = CHARACTERS.stickman.hurtShapes[0];
function passingBody(gap = TORSO.radius + 0.085) {
  const world = new ArenaPhysics(); world.reset('sword','sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: 0, v: v3(0, 0, -15) });
  Object.assign(b, { p: v3(2.65 + gap, 10, -0.08), theta: 0, phi: Math.PI, v: v3(0, 0, 15) });
  return world;
}

function bodyClearance(world) {
  const [a, b] = world.players;
  return Math.min(...weaponSegments(a).map(segment => closestSegments(segment.a, segment.b,
    v3(b.p.x, b.p.y + TORSO.a[1], b.p.z), v3(b.p.x, b.p.y + TORSO.b[1], b.p.z)).distance - TORSO.radius - segment.radius));
}

test('a blade passing a body between separated poses still records one hit', () => {
  const world = passingBody();
  assert.ok(bodyClearance(world) > 0);
  world.step(idle);
  assert.ok(bodyClearance(world) > 0);
  assert.equal(world.events.filter(event => event.type === 'hit' && event.attacker === 0).length, 1);
  assert.ok(world.players[1].health < 100);
  const miss = passingBody(TORSO.radius + 0.11); miss.step(idle);
  assert.equal(miss.players[1].health, 100, 'nearby body misses must remain misses');
});

test('heading wrap does not sweep a weapon the long way around into an opponent behind it', () => {
  const world = new ArenaPhysics(); world.reset('sword','sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 10, 0), theta: Math.PI / 2, phi: Math.PI * 2 - 0.004, wp: 1.5 });
  Object.assign(b, { p: v3(-2.6, 8, 0), theta: 0, phi: 0 });
  world.step(idle);
  assert.ok(a.phi >= 0 && a.phi < 0.01, 'fixture must cross the heading wrap');
  assert.equal(world.events.length, 0);
  assert.equal(b.health, 100);
});

test('measured sword guard and curved polearm tip can hit beyond their old thin shaft proxies', () => {
  const tip = WEAPONS.polearm.colliders[3];
  for (const [weapon, target] of [
    ['sword', v3(-0.52, 10 + 1.2 + 0.428 - 0.76, 0.009696)],
    ['polearm', v3(tip.b[0] - CONFIG.bodyRadius - tip.radius + .01,
      10 + WEAPONS.polearm.offset + tip.b[1] - .76, tip.b[2])],
  ]) {
    const world = new ArenaPhysics(); sparring(world,weapon,'sword');
    const [a, b] = world.players;
    Object.assign(a, { p: v3(0, 10, 0), theta: 0, phi: 0, v: v3(-6, 0, 0) });
    b.p = target;
    const head = v3(b.p.x, b.p.y + 0.76, b.p.z);
    assert.ok(closestSegments(staffFrame(a, 0).point, staffFrame(a).point, head, head).distance >
      CONFIG.bodyRadius + WEAPONS[weapon].radius, 'old shaft approximation must miss');
    world.solveAttack(a, b, CONFIG.step);
    assert.ok(world.lastHit?.damage > 0, `${weapon} solid outer feature must hit`);
  }
});

test('solid guard and curved-tip features also block beyond the old shaft-only contact', () => {
  const guard = WEAPONS.sword.colliders[1], tip = WEAPONS.polearm.colliders[3];
  for (const [weapon, position] of [
    ['sword', v3(guard.a[0] - guard.radius - WEAPONS.polearm.radius + .01, 10.02, guard.a[2])],
    ['polearm', v3(tip.b[0] - tip.radius - WEAPONS.polearm.radius + .01,
      10 + tip.b[1] - .05, tip.b[2])],
  ]) {
    const world = new ArenaPhysics(); world.reset(weapon,'polearm');
    const [a, b] = world.players;
    Object.assign(a, { p: v3(0, 10, 0), theta: 0, phi: 0, v: v3(-6, 0, 0) });
    Object.assign(b, { p: position, theta: 0, phi: 0 });
    assert.ok(closestSegments(staffFrame(a, 0).point, staffFrame(a).point,
      staffFrame(b, 0).point, staffFrame(b).point).distance > WEAPONS[weapon].radius + WEAPONS.polearm.radius);
    world.solveStaffClash(CONFIG.step);
    assert.ok(world.events.some(event => event.type === 'clash'), `${weapon} outer solid feature must block`);
    assert.ok(b.v.x < 0, 'the block must transfer contact impulse');
  }
});

test('all three weapons can still support movement through the lower-speed swing in either direction', () => {
  for (const weapon of Object.keys(WEAPONS)) for (const direction of [-1, 1]) {
    const world = new ArenaPhysics(); sandbox(world,weapon);
    const p = world.players[0]; p.theta = 0;
    let highest = p.p.y, furthest = 0;
    for (let step = 0; step < 270; step++) {
      world.step([{ theta: direction }]);
      highest = Math.max(highest, p.p.y); furthest = Math.max(furthest, direction * p.p.x);
      assert.ok(Math.abs(p.wt) <= WEAPONS[weapon].maxAngularSpeed);
      for (const segment of weaponSegments(p)) for (const point of [segment.a, segment.b]) {
        assert.ok(point.y - segment.radius > -0.1, 'solid feature penetrated the floor');
      }
    }
    assert.ok(direction * p.theta > Math.PI + 0.3, `${weapon} stopped below the fighter`);
    assert.ok(furthest > 0.5 && highest > CONFIG.bodyFloor + 0.8, `${weapon} lost ground-driven movement`);
  }
});
