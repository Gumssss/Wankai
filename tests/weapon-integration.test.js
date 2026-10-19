import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import { GameSession } from '../src/game-session.js';
import { ArenaPhysics, CONFIG, closestSegments, staffFrame, weaponSegments, weaponPointFrame, hurtSegments, WEAPONS, v3 } from '../src/physics.js';
import { setWeaponRotation } from '../src/weapon-visuals.js';

function sessionWithoutAudio() {
  const session = new GameSession();
  for (const method of ['unlock', 'tick', 'tone', 'swing', 'impact']) session.sound[method] = () => {};
  return session;
}

test('players select independently, including matching weapons, and retain selections in every mode', () => {
  for (const first of Object.keys(WEAPONS)) for (const second of Object.keys(WEAPONS)) {
    const session = sessionWithoutAudio();
    session.setWeapon(first, 0);
    session.setWeapon(second, 1);
    assert.deepEqual(session.getSnapshot().weapons, [first, second]);
    for (const mode of ['duel', 'duel-fixed', 'practice', 'solo']) {
      session.startRound(mode);
      assert.deepEqual(session.world.players.map(player => player.weapon), mode === 'solo' ? [first] : [first, second]);
      session.setWeapon(first === 'sword' ? 'polearm' : 'sword', 0);
      assert.deepEqual(session.getSnapshot().weapons, [first, second], 'equipment cannot change during a round');
      session.startRound();
      assert.equal(session.mode, mode);
      assert.deepEqual(session.getSnapshot().weapons, [first, second]);
      session.goHome();
      assert.deepEqual(session.world.players.map(player => player.weapon), [first, second]);
    }
  }
});

test('all duel loadouts begin with separated weapons, including two level swords', () => {
  for (const first of Object.keys(WEAPONS)) for (const second of Object.keys(WEAPONS)) {
    const world = new ArenaPhysics();
    world.reset(false, false, first, second);
    const [a, b] = world.players;
    for (const sa of weaponSegments(a)) for (const sb of weaponSegments(b)) {
      const separation = closestSegments(sa.a, sa.b, sb.a, sb.b).distance;
      assert.ok(separation > sa.radius + sb.radius, `${first}/${second} overlaps before input`);
    }
  }
});

test('unknown weapon choices and player ids leave the chosen loadout intact', () => {
  const session = sessionWithoutAudio();
  const before = session.getSnapshot();
  session.setWeapon('unknown', 1);
  session.setWeapon('sword', 2);
  assert.equal(session.getSnapshot(), before);
  assert.throws(() => session.world.reset(false, false, 'sword', 'unknown'), /Unknown weapon/);
});

test('every floating weapon visual tracks its physical axis continuously through overhead and support', () => {
  for (const weapon of Object.keys(WEAPONS).filter(id => !WEAPONS[id].attachment)) for (const phi of [-Math.PI, 0, 0.73, 3.8]) {
    const world = new ArenaPhysics();
    world.reset(false, true, weapon);
    const p = world.players[0]; p.phi = phi;
    for (const pole of [-Math.PI * 2, -Math.PI, 0, Math.PI, Math.PI * 2]) {
      let previous;
      for (const offset of [-0.002, -0.001, 0, 0.001, 0.002]) {
        p.theta = pole + offset;
        const rotation = setWeaponRotation(new Quaternion(), p.theta, p.phi);
        const visibleAxis = new Vector3(0, 1, 0).applyQuaternion(rotation);
        const r = staffFrame(p).r;
        assert.ok(visibleAxis.distanceTo(new Vector3(r.x, r.y, r.z).normalize()) < 1e-10);
        if (previous) assert.ok(previous.angleTo(rotation) < 0.00101, 'visual orientation jumped at a pole');
        previous = rotation;
      }
    }
  }
});

test('the same swing input has the same angular direction on either side of straight down', () => {
  for (const weapon of Object.keys(WEAPONS)) for (const direction of [-1, 1]) {
    const velocities = [];
    for (const offset of [-0.001, 0, 0.001]) {
      const world = new ArenaPhysics(); world.reset(false, true, weapon);
      const p = world.players[0]; p.p.y = 1000; p.theta = Math.PI + offset;
      for (let step = 0; step < 18; step++) world.step([{ theta: direction }], CONFIG.step);
      assert.ok(direction * p.wt > 0, 'the chosen swing direction changed near ground support');
      velocities.push(p.wt);
    }
    assert.ok(Math.max(...velocities) - Math.min(...velocities) < 0.01);
  }
});

test('off-axis contact positions and velocities agree with the rendered rotation', () => {
  const world = new ArenaPhysics(); world.reset(false, true, 'hammer');
  const p = world.players[0], local = v3(-0.38, 1.5, 0.05);
  for (const theta of [0, 0.7, Math.PI, Math.PI * 2]) for (const phi of [0, 0.73, Math.PI]) {
    p.theta = theta; p.phi = phi; p.wt = 2; p.wp = -3;
    const frame = weaponPointFrame(p, local);
    const visible = new Vector3(local.x, local.y + WEAPONS.hammer.offset, local.z)
      .applyQuaternion(setWeaponRotation(new Quaternion(), theta, phi));
    assert.ok(visible.distanceTo(new Vector3(frame.r.x, frame.r.y, frame.r.z)) < 1e-10);
    const epsilon = 1e-6;
    p.theta += p.wt * epsilon; p.phi += p.wp * epsilon;
    const next = weaponPointFrame(p, local);
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Math.abs((next.point[axis] - frame.point[axis]) / epsilon - frame.velocity[axis]) < 0.0001);
    }
  }
});

function hammerContact(targetPosition, velocity) {
  const world = new ArenaPhysics(); world.reset(true, false, 'hammer', 'sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 5, 0), theta: 0, phi: 0, wt: 0, wp: 0, v: velocity });
  b.p = targetPosition;
  world.solveAttack(a, b, CONFIG.step);
  return world;
}

test('the broad iron head hits beyond the shaft and has stronger strikes; cloth and side gaps miss', () => {
  const head = hammerContact(v3(-0.76, 7.8, 0), v3(-6, 0, 0));
  const shaft = hammerContact(v3(0.42, 6.4, 0), v3(6, 0, 0));
  assert.ok(head.lastHit?.damage > shaft.lastHit?.damage, 'a metal head hit is stronger at the same closing speed');
  assert.equal(head.lastHit.speed, shaft.lastHit.speed);
  assert.ok(closestSegments(staffFrame(head.players[0], 0).point, staffFrame(head.players[0]).point,
    head.players[1].p, head.players[1].p).distance > CONFIG.bodyRadius + WEAPONS.hammer.radius);
  for (const world of [hammerContact(v3(0.77, 6.59, 0), v3(6, 0, 0)), hammerContact(v3(-0.38, 7.8, 0.55), v3(0, 0, 6))]) {
    assert.equal(world.lastHit, null);
    assert.equal(world.players[1].health, 100);
  }
});

test('outer head contacts can block a weapon and support the fighter before the shaft reaches the floor', () => {
  const world = new ArenaPhysics(); world.reset(false, false, 'hammer', 'sword');
  const [a, b] = world.players;
  Object.assign(a, { p: v3(0, 5, 0), theta: 0, phi: 0, v: v3(-6, 0, 0) });
  Object.assign(b, { p: v3(0.7, 7.8, 0), theta: Math.PI / 2, phi: Math.PI });
  const axisGap = closestSegments(staffFrame(a, 0).point, staffFrame(a).point,
    staffFrame(b, 0).point, staffFrame(b).point).distance;
  assert.ok(axisGap > WEAPONS.hammer.radius + WEAPONS.sword.radius);
  world.solveStaffClash(CONFIG.step);
  assert.ok(Math.abs(a.wt) + Math.abs(b.wt) > 0, 'head clash changes rotation');
  Object.assign(a, { p: v3(0, CONFIG.bodyFloor, 0), theta: 1.66, phi: 0, v: v3(), wt: 0, wp: 0 });
  assert.ok(staffFrame(a).point.y > WEAPONS.hammer.radius, 'shaft tip is clear of the floor');
  world.solveStaffGround(a, CONFIG.step);
  assert.ok(a.staffGrounded && a.v.y > 0, 'right head supplies a support impulse');
});

test('hammer is slower to start and reverse than the sword without producing movement in midair', () => {
  const states = {};
  for (const weapon of ['sword', 'hammer']) {
    const world = new ArenaPhysics(); world.reset(false, true, weapon);
    const p = world.players[0]; p.p.y = 1000; p.theta = 0;
    for (let step = 0; step < 18; step++) world.step([{ theta: 1, phi: 1 }]);
    states[weapon] = { start: p.wp };
    assert.equal(p.p.x, 0); assert.equal(p.p.z, 0);
    p.wt = 4; p.wp = 0;
    for (let step = 0; step < 9; step++) world.step([{ theta: -1 }]);
    states[weapon].remaining = p.wt;
  }
  assert.ok(states.hammer.start < states.sword.start);
  assert.ok(states.hammer.remaining > states.sword.remaining);
});

test('all loadouts remain finite and within the arena under sustained mixed input', () => {
  for (const first of Object.keys(WEAPONS)) for (const second of Object.keys(WEAPONS)) {
    const world = new ArenaPhysics(); world.reset(true, false, first, second);
    for (let step = 0; step < 5400; step++) {
      const phase = Math.floor(step / 180);
      world.step([{ theta: phase % 2 ? -1 : 1, phi: phase % 3 ? 1 : -1 },
        { theta: phase % 3 ? -1 : 1, phi: phase % 2 ? -1 : 1 }]);
      for (const p of world.players) {
        for (const value of [p.p.x, p.p.y, p.p.z, p.wt, p.wp, p.health]) assert.ok(Number.isFinite(value));
        if(p.weapon==='beagle') {
          assert.ok(Number.isFinite(p.bodyPitch+p.bodyRate));
          for(const shape of hurtSegments(p))for(const point of [shape.a,shape.b]) {
            assert.ok(Math.hypot(point.x,point.z)+shape.radius<=world.arenaRadius+.02);
            assert.ok(point.y-shape.radius>-.035,'rotated body crossed the floor');
          }
          assert.ok(Math.abs(p.bodyRate)<=8.05&&Math.abs(p.wt)<24.1&&Math.abs(p.wp)<4.3);
        } else {
          assert.ok(Math.hypot(p.p.x, p.p.z) <= world.arenaRadius - CONFIG.bodyRadius + 1e-6);
          assert.ok(p.p.y >= CONFIG.bodyFloor - 1e-6);
          assert.ok(Math.abs(p.wt) <= WEAPONS[p.weapon].maxAngularSpeed &&
            Math.abs(p.wp) <= WEAPONS[p.weapon].maxAngularSpeed, 'contacts restored the old spin speed');
        }
      }
    }
  }
});
