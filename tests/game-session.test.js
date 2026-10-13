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
