import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, MATCH_MODES } from '../src/game-session.js';
import { CONFIG, MATCH_ARENA_SCALE } from '../src/physics.js';

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
  session.startRound('ai');
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

test('only match modes start, and rematches reset transient state', () => {
  const session = createSession();
  for (const removed of ['duel', 'duel-fixed', 'practice', 'solo', true, false]) assert.throws(() => session.startRound(removed), /Unknown game mode/);
  session.startRound('ai');
  advance(session, 2.5);
  session.impact({ type: 'hit', strength: 1, damage: 12, point: { x: 0, y: 1, z: 0 }, speed: 3, acceleration: 0 });
  assert.equal(session.getSnapshot().effects.length, 1);
  session.startRound();
  assert.equal(session.getSnapshot().mode, 'ai');
  assert.equal(session.world.time, 0);
  assert.equal(session.getSnapshot().effects.length, 0);
  assert.deepEqual(session.getSnapshot().pressed, []);
  session.goHome();
  assert.equal(session.state, 'lobby');
  assert.ok(MATCH_MODES.includes(session.getSnapshot().mode));
});

test('loadout selection applies to both fighters and survives rematch and return home', () => {
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
  session.startRound('ai');
  session.startRound();
  assert.deepEqual(session.world.players.map(p => p.weapon), ['sword', 'polearm']);
  session.goHome();
  assert.equal(session.getSnapshot().loadouts[0].weaponId, 'sword');
  assert.equal(session.setLoadouts([{characterId:'basic-fighter',weaponId:'unknown'},session.loadouts[1]]), false);
});

test('subscribers receive changed snapshots and can detach', () => {
  const session = createSession();
  let updates = 0;
  const unsubscribe = session.subscribe(() => updates++);
  const original = session.getSnapshot();
  session.publish();
  assert.equal(session.getSnapshot(), original);
  session.startRound('ai');
  assert.ok(updates > 0);
  const before = updates;
  unsubscribe();
  session.goHome();
  assert.equal(updates, before);
});

test('WASD drives only the local fighter; swing and steering combine and opposite keys cancel', () => {
  const session = createSession();
  session.startRound('ai');
  advance(session, 2.5);
  for (const key of ['KeyW', 'KeyA']) session.keyDown(key);
  assert.deepEqual(session.getInputs(), [{ theta: 1, phi: -1 }, { theta: 0, phi: 0 }]);
  session.keyDown('KeyS');
  session.keyDown('KeyD');
  assert.deepEqual(session.getInputs()[0], { theta: 0, phi: 0 }, 'opposite keys cancel on each axis');
  for (const removed of ['ArrowUp', 'ArrowLeft', 'ShiftRight', 'KeyQ', 'KeyE', 'Period', 'Slash']) session.keyDown(removed);
  assert.deepEqual(session.getSnapshot().pressed.sort(), ['KeyA', 'KeyD', 'KeyS', 'KeyW']);
});

test('every match uses the enlarged arena and keeps its boundary on rematch', () => {
  const session = createSession();
  session.startRound('ai');
  const radius = CONFIG.arenaRadius * MATCH_ARENA_SCALE;
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
  session.goHome();
  assert.equal(session.world.arenaRadius, radius);
});

test('the renderer camera yaw drives the local body facing, and clearing it keeps the current facing', () => {
  const session = createSession(), baseline = createSession();
  for (const game of [session, baseline]) { game.startRound('ai'); advance(game, 2.5); }
  const local = session.world.players[session.localPlayerId];
  session.localFaceYaw = 1.2;
  assert.equal(session.getInputs()[0].faceYaw, 1.2);
  assert.equal(session.getInputs()[1].faceYaw, undefined, 'the opponent has its own facing source');
  for (const game of [session, baseline]) advance(game, 0.5);
  assert.ok(Math.abs(local.bodyYaw - 1.2) < 1e-9);
  assert.equal(local.phi, baseline.world.players[0].phi, 'looking around never steers the weapon');
  session.localFaceYaw = null;
  assert.equal(session.getInputs()[0].faceYaw, undefined);
  advance(session, 0.2);
  assert.ok(Math.abs(local.bodyYaw - 1.2) < 1e-9);
});
