import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, v3 } from '../src/physics.js';
import { NetSession } from '../src/net-session.js';
import { quietSession, sandbox } from './sandbox.js';

const BEAGLE = { characterId: 'beagle', weaponId: 'long-ears' };
const STICKMAN = { characterId: 'stickman', weaponId: 'sword' };
const FRAME = 1 / 60;
const W = 1, A = 2, S = 4, D = 8;
const FLIGHT_SPEED = 2.2;

function worldWithBeagle() {
  const world = sandbox(new ArenaPhysics(), BEAGLE);
  const [player] = world.players;
  player.p = v3(0, 20, 0);
  return { world, player };
}

function stepFor(world, seconds, input = {}) {
  for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) world.step([input]);
}

function tickFor(session, seconds) {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) session.tick(FRAME);
}

function assertHorizontalVelocity(player, x, z, message) {
  assert.ok(Math.abs(player.v.x - x) < 1e-9 && Math.abs(player.v.z - z) < 1e-9,
    `${message ?? 'flight velocity'}: got (${player.v.x}, ${player.v.z}), expected (${x}, ${z})`);
}

test('Beagle flight uses camera-relative WASD, with normalized diagonals and cancelling opposites', () => {
  const diagonal = FLIGHT_SPEED / Math.SQRT2;
  const cases = [
    [W, 0, FLIGHT_SPEED, 0], [S, 0, -FLIGHT_SPEED, 0], [A, 0, 0, -FLIGHT_SPEED], [D, 0, 0, FLIGHT_SPEED],
    [W | D, 0, diagonal, diagonal], [S | A, 0, -diagonal, -diagonal],
    [W | S, 0, 0, 0], [A | D, 0, 0, 0], [W | A | S | D, 0, 0, 0],
    [W, Math.PI / 2, 0, FLIGHT_SPEED], [D, Math.PI / 2, -FLIGHT_SPEED, 0],
    [W | D, Math.PI / 2, -diagonal, diagonal],
  ];
  for (const [heldMask, faceYaw, x, z] of cases) {
    const { world, player } = worldWithBeagle();
    world.step([{ skillTap: true, heldMask, faceYaw }]);
    assert.equal(player.skillActive, true);
    assertHorizontalVelocity(player, x, z, `mask ${heldMask} at yaw ${faceYaw}`);
    assert.ok(player.v.y < 0, 'flight input leaves vertical gravity intact');
  }
});

test('the rotor spins automatically in one direction while A/D strafe', () => {
  const yawRates = [];
  for (const [heldMask, phi] of [[0, 0], [A, -1], [D, 1]]) {
    const { world, player } = worldWithBeagle();
    player.wp = -2;
    world.step([{ skillTap: true, heldMask, phi, faceYaw: 0 }]);
    stepFor(world, 0.4, { heldMask, phi, faceYaw: 0 });
    yawRates.push(player.wp);
    assertHorizontalVelocity(player, 0, phi * FLIGHT_SPEED);
  }
  assert.deepEqual(yawRates, [4.25, 4.25, 4.25]);
});

test('a full rotor activation lasts five seconds, drains 80 stamina, and starts a thirty-second cooldown', () => {
  const { world, player } = worldWithBeagle();
  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, true);
  assert.ok(player.skillCooldown > 29.99 && player.skillCooldown <= 30);
  stepFor(world, 4.9);
  assert.equal(player.skillActive, true);
  stepFor(world, 0.2);
  assert.equal(player.skillActive, false);
  assert.equal(player.skillTime, 0);
  assert.ok(Math.abs(player.stamina - 120) < 1e-7);
  assert.ok(player.skillCooldown > 24.8 && player.skillCooldown < 25.1);

  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, false);
  stepFor(world, 24.7);
  assert.ok(player.skillCooldown > 0);
  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, false);
  stepFor(world, 0.4);
  assert.equal(player.skillCooldown, 0);
  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, true);
});

test('Beagle cannot start under 40 stamina and exhaustion ends flight without clearing its cooldown', () => {
  const { world, player } = worldWithBeagle();
  player.stamina = 39;
  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, false);
  assert.equal(player.skillCooldown, 0);

  player.stamina = 40;
  world.step([{ skillTap: true }]);
  assert.equal(player.skillActive, true);
  stepFor(world, 2.4);
  assert.equal(player.skillActive, true);
  stepFor(world, 0.2);
  assert.equal(player.skillActive, false);
  assert.ok(player.stamina < 0.01);
  assert.ok(player.skillCooldown > 27);
});

test('after rotor retraction, W/S swing and A/D turn without direct movement', () => {
  for (const [swing, turn, heldMask] of [[1, -1, W | A], [-1, 1, S | D]]) {
    const { world, player } = worldWithBeagle();
    world.step([{ skillTap: true }]);
    stepFor(world, 5.7);
    assert.equal(player.skillActive, false);
    assert.ok(player.earSpread < 0.001);
    Object.assign(player, { p: v3(0, 20, 0), v: v3(), theta: 0, wt: 0, wp: 0 });
    stepFor(world, 0.15, { heldMask, theta: swing, phi: turn, faceYaw: 1.2 });
    assert.ok(swing * player.wt > 0.1);
    assert.ok(turn * player.wp > 0.1);
    assertHorizontalVelocity(player, 0, 0);
  }
});

test('offline pause freezes the rotor and restart clears its duration and cooldown', () => {
  const session = quietSession();
  session.setLoadouts([BEAGLE, STICKMAN]);
  session.startRound('ai');
  tickFor(session, 2.6);
  const [player] = session.world.players;
  player.p = v3(-3, 20, 0);
  session.localFaceYaw = Math.PI / 2;
  session.keyDown('KeyF');
  session.keyDown('KeyW');
  tickFor(session, 0.1);
  assert.equal(player.skillActive, true);
  assertHorizontalVelocity(player, 0, FLIGHT_SPEED, 'local keyboard path');

  const before = [player.skillTime, player.skillCooldown, player.stamina, player.phi];
  session.pause();
  tickFor(session, 1);
  assert.deepEqual([player.skillTime, player.skillCooldown, player.stamina, player.phi], before);
  session.resume();
  tickFor(session, 0.1);
  assert.ok(player.skillTime < before[0] && player.skillCooldown < before[1]);
  session.startRound('ai');
  const [reset] = session.world.players;
  assert.deepEqual([reset.skillActive, reset.skillTime, reset.skillCooldown, reset.earSpread], [false, 0, 0, 0]);
});

test('the host applies a guest Beagle’s F and WASD, then replicates motion and cooldown', () => {
  const [hostSession, guestSession] = [quietSession(), quietSession()];
  const queues = [[], []];
  const transport = side => ({ send: message => queues[1 - side].push(structuredClone(message)), close() {} });
  const host = new NetSession(hostSession, transport(0), { role: 'host', version: 'test' });
  const guest = new NetSession(guestSession, transport(1), { role: 'guest', version: 'test' });
  const flush = () => {
    for (let i = 0; i < 8 && queues.some(queue => queue.length); i++) {
      for (const [side, peer] of [host, guest].entries()) {
        for (const message of queues[side].splice(0)) peer.receive(message);
      }
    }
  };
  const tickBoth = seconds => {
    for (let i = 0; i < Math.round(seconds / FRAME); i++) {
      hostSession.tick(FRAME);
      flush();
      guestSession.tick(FRAME);
      flush();
    }
  };
  guest.hello();
  flush();
  host.setLoadout(STICKMAN, true);
  guest.setLoadout(BEAGLE, true);
  flush();
  assert.equal(host.start(), true);
  flush();
  tickBoth(2.6);

  const authority = hostSession.world.players[1], replica = guestSession.world.players[1];
  authority.p = v3(7, 20, 0);
  guestSession.localFaceYaw = Math.PI / 2;
  guestSession.keyDown('KeyF');
  guestSession.keyDown('KeyW');
  guestSession.keyDown('KeyD');
  tickBoth(0.35);

  const diagonal = FLIGHT_SPEED / Math.SQRT2;
  assert.equal(authority.skillActive, true);
  assert.equal(replica.skillActive, true);
  assertHorizontalVelocity(authority, -diagonal, diagonal);
  assertHorizontalVelocity(replica, -diagonal, diagonal);
  assert.ok(authority.wp > 0 && replica.wp > 0);
  assert.ok(authority.skillCooldown > 29 && Math.abs(replica.skillCooldown - authority.skillCooldown) < 0.12);
});
