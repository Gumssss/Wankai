import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../src/game-session.js';
import { CONFIG, SOLO_ARENA_SCALE } from '../src/physics.js';

function createSession() {
  const session = new GameSession();
  for (const method of ['unlock', 'tick', 'swing', 'impact', 'tone']) session.sound[method] = () => {};
  return session;
}

function advance(session, seconds) {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) session.tick(0.05);
}

test('the session advances fixed-step physics, pauses on lost focus, and resumes', () => {
  const session = createSession();
  session.startRound(false);
  advance(session, 2.5);
  assert.equal(session.state, 'playing');
  session.keyDown('KeyS');
  assert.ok(session.getSnapshot().pressed.includes('KeyS'));
  advance(session, 0.5);
  assert.ok(session.world.time > 0);
  const time = session.world.time;
  session.pause();
  assert.equal(session.state, 'paused');
  assert.deepEqual(session.getSnapshot().pressed, []);
  advance(session, 1);
  assert.equal(session.world.time, time);
  session.resume();
  advance(session, 0.2);
  assert.ok(session.world.time > time);
});

test('practice uses an idle second player and rematches reset transient state', () => {
  const session = createSession();
  session.startRound(true);
  advance(session, 2.5);
  session.keyDown('ArrowDown');
  assert.deepEqual(session.getInputs()[1], { theta: 0, phi: 0 });
  session.impact({ type: 'hit', strength: 1, damage: 12, point: { x: 0, y: 1, z: 0 }, speed: 3, acceleration: 0 });
  assert.equal(session.getSnapshot().effects.length, 1);
  session.startRound();
  assert.equal(session.practice, true);
  assert.equal(session.world.time, 0);
  assert.equal(session.getSnapshot().effects.length, 0);
  assert.deepEqual(session.getSnapshot().pressed, []);
  session.goHome();
  assert.equal(session.state, 'lobby');
});

test('fixed-camera duel keeps both players active, matches physics away from the boundary, and retains its mode on rematch', () => {
  const split = createSession();
  const fixed = createSession();
  split.startRound('duel');
  fixed.startRound('duel-fixed');
  assert.equal(fixed.getSnapshot().mode, 'duel-fixed');
  assert.equal(fixed.world.players.length, 2);
  assert.equal(fixed.practice, false);
  assert.equal(fixed.world.arenaRadius, CONFIG.arenaRadius * SOLO_ARENA_SCALE);
  assert.equal(fixed.world.arenaRimHeight, split.world.arenaRimHeight);
  assert.equal(split.world.arenaRadius, CONFIG.arenaRadius * SOLO_ARENA_SCALE);
  for (const session of [split, fixed]) {
    advance(session, 2.5);
    for (const key of ['KeyW', 'KeyA', 'ArrowDown', 'ArrowRight']) session.keyDown(key);
    assert.deepEqual(session.getInputs(), [{ theta: 1, phi: -1 }, { theta: -1, phi: 1 }]);
    advance(session, 0.5);
  }
  assert.deepEqual(fixed.world.players, split.world.players, 'camera mode must not change simulation or input');
  fixed.pause();
  assert.deepEqual(fixed.getSnapshot().pressed, []);
  fixed.resume();
  fixed.startRound();
  assert.equal(fixed.getSnapshot().mode, 'duel-fixed');
  assert.equal(fixed.world.time, 0);
  assert.equal(fixed.world.arenaRadius, split.world.arenaRadius, 'rematch retains the larger fixed arena');
  fixed.goHome();
  assert.equal(fixed.getSnapshot().mode, 'duel');
});

test('solo keeps the staff physics with one fighter and survives rematch and return home', () => {
  const session = createSession();
  session.startRound('solo');
  assert.equal(session.world.players.length, 1);
  assert.equal(session.world.players[0].p.x, 0);
  session.world.players[0].p.x = 12;
  session.world.step([{ theta: 0, phi: 0 }]);
  assert.ok(session.world.players[0].p.x > 10, 'solo fighter can move beyond the duel boundary');
  session.world.players[0].p.x = 30;
  session.world.step([{ theta: 0, phi: 0 }]);
  assert.ok(session.world.players[0].p.x <= CONFIG.arenaRadius * SOLO_ARENA_SCALE - CONFIG.bodyRadius + 1e-6);
  session.world.reset(false, true);
  advance(session, 2.5);
  session.keyDown('ArrowDown');
  assert.deepEqual(session.getSnapshot().pressed, []);
  session.keyDown('KeyS');
  advance(session, 1);
  assert.ok(session.world.time > 0);
  assert.ok(Number.isFinite(session.world.players[0].p.x));
  assert.equal(session.world.winner, null);
  session.startRound();
  assert.equal(session.getSnapshot().mode, 'solo');
  assert.equal(session.world.players.length, 1);
  session.goHome();
  assert.equal(session.getSnapshot().mode, 'duel');
  assert.equal(session.world.players.length, 2);
});

test('sword selection applies to player one and survives a rematch', () => {
  const session = createSession();
  assert.deepEqual(session.getSnapshot().loadouts, [
    {characterId:'yellow-blob',weaponId:'yellow-staff'},
    {characterId:'yellow-blob',weaponId:'yellow-staff'},
  ]);
  session.setLoadouts([
    {characterId:'basic-fighter',weaponId:'sword'},
    {characterId:'basic-fighter',weaponId:'polearm'},
  ]);
  assert.equal(session.world.players[0].weapon, 'sword');
  assert.equal(session.world.players[1].weapon, 'polearm');
  assert.equal(session.getSnapshot().weapon, 'sword');
  session.startRound('practice');
  assert.equal(session.world.players[0].weapon, 'sword');
  assert.equal(session.world.players[1].weapon, 'polearm');
  session.startRound();
  assert.equal(session.world.players[0].weapon, 'sword');
  session.goHome();
  assert.equal(session.getSnapshot().weapon, 'sword');
  session.setWeapon('polearm');
  assert.equal(session.world.players[0].weapon, 'polearm');
});

test('subscribers receive changed snapshots and can detach', () => {
  const session = createSession();
  let updates = 0;
  const unsubscribe = session.subscribe(() => updates++);
  const original = session.getSnapshot();
  session.publish();
  assert.equal(session.getSnapshot(), original);
  session.startRound(false);
  assert.ok(updates > 0);
  const before = updates;
  unsubscribe();
  session.goHome();
  assert.equal(updates, before);
});

test('left and right keys steer each weapon relative to its own facing view', () => {
  const session = createSession();
  session.startRound('duel');
  advance(session, 2.5);
  session.keyDown('KeyA');
  session.keyDown('ArrowLeft');
  assert.deepEqual(session.getInputs(), [
    { theta: 0, phi: -1 },
    { theta: 0, phi: -1 },
  ]);
  session.clearKeys();
  session.keyDown('KeyD');
  session.keyDown('ArrowRight');
  assert.deepEqual(session.getInputs(), [
    { theta: 0, phi: 1 },
    { theta: 0, phi: 1 },
  ]);
});

test('front or back swing combines with horizontal steering for both players', () => {
  const session = createSession();
  session.startRound('duel');
  advance(session, 2.5);
  for (const key of ['KeyW', 'KeyA', 'ArrowDown', 'ArrowRight']) session.keyDown(key);
  assert.deepEqual(session.getInputs(), [
    { theta: 1, phi: -1 },
    { theta: -1, phi: 1 },
  ]);
  session.keyDown('KeyS');
  session.keyDown('ArrowUp');
  assert.deepEqual(session.getInputs(), [
    { theta: 0, phi: -1 },
    { theta: 0, phi: 1 },
  ], 'opposite swing keys cancel without cancelling horizontal steering');
});

test('Q/E and period/slash steer separate cameras without changing weapon inputs or physics', () => {
  const session = createSession();
  const baseline = createSession();
  for (const game of [session, baseline]) {
    game.startRound('duel');
    advance(game, 2.5);
    game.keyDown('KeyW');
    game.keyDown('ArrowLeft');
  }
  session.keyDown('KeyQ');
  session.keyDown('Slash');
  assert.deepEqual(session.getCameraInputs(), [-1, 1]);
  assert.deepEqual(session.getInputs(), baseline.getInputs());
  for (const game of [session, baseline]) advance(game, 0.5);
  assert.deepEqual(session.world.players, baseline.world.players);
  session.keyDown('KeyE');
  session.keyDown('Period');
  assert.deepEqual(session.getCameraInputs(), [0, 0], 'opposite camera keys cancel');
  session.keyUp('KeyQ');
  session.keyUp('Slash');
  assert.deepEqual(session.getCameraInputs(), [1, -1]);
  session.pause();
  assert.deepEqual(session.getCameraInputs(), [0, 0]);
  session.resume();
  session.keyDown('KeyE');
  session.startRound();
  assert.deepEqual(session.getCameraInputs(), [0, 0], 'rematch clears held camera keys');
  for (const mode of ['duel-fixed', 'practice', 'solo']) {
    session.startRound(mode);
    session.keyDown('KeyQ');
    session.keyDown('Slash');
    assert.deepEqual(session.getSnapshot().pressed, []);
    assert.deepEqual(session.getCameraInputs(), [0, 0]);
  }
});

test('split-screen uses the solo-sized physical arena and retains its boundary on rematch', () => {
  const session = createSession();
  session.startRound('duel');
  const radius = CONFIG.arenaRadius * SOLO_ARENA_SCALE;
  assert.equal(session.world.players.length, 2);
  assert.equal(session.world.arenaRadius, radius);
  const [first, second] = session.world.players;
  first.p.x = 12;
  second.p.x = -12;
  session.world.step([{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }]);
  assert.ok(first.p.x > 10 && second.p.x < -10, 'both fighters can use ground beyond the old rim');
  first.p.x = 30;
  second.p.x = -30;
  session.world.step([{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }]);
  for (const player of session.world.players) {
    assert.ok(Math.hypot(player.p.x, player.p.z) <= radius - CONFIG.bodyRadius + 1e-6);
  }
  session.startRound();
  assert.equal(session.world.arenaRadius, radius);
  for (const mode of ['duel-fixed', 'practice', 'solo', 'duel']) {
    session.startRound(mode);
    assert.equal(session.world.arenaRadius, mode === 'practice' ? CONFIG.arenaRadius : radius);
  }
});
