import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession } from '../src/game-session.js';

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
