import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameSession, MATCH_MODES } from '../src/game-session.js';
import { CONFIG, MATCH_ARENA_SCALE, ArenaPhysics, WEAPONS, weaponStats, weaponSegments, hurtSegments, closestSegments, v3 } from '../src/physics.js';
import { normalizeLoadout, resolveLoadout, PLAYABLE_LOADOUTS, canEquip } from '../src/loadouts.js';
import { ARENA_OBSTACLES } from '../src/arena-obstacles.js';
import { CHARACTER_CATALOG } from '../src/character-catalog.js';
import { SKILLS } from '../src/skills.js';
import { sandbox, quietSession as createSession, silentAudio } from './sandbox.js';

const advance = (session, seconds) => { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) session.tick(0.05); };
const basic = weaponId => ({ characterId: 'stickman', weaponId }), dudu = weaponId => ({ characterId: 'dudu', weaponId });
const startIdle = session => session.startRound('ai');

test('the session advances fixed-step physics, pauses, and resumes', () => {
  const session = createSession();
  startIdle(session);
  advance(session, 2.5);
  assert.equal(session.state, 'playing');
  session.keyDown('KeyS');
  assert.ok(session.getSnapshot().pressed.includes('KeyS'));
  advance(session, 0.5);
  const time = session.world.time;
  assert.ok(time > 0);
  session.pause();
  assert.equal(session.state, 'paused');
  assert.deepEqual(session.getSnapshot().pressed, []);
  advance(session, 1);
  assert.equal(session.world.time, time);
  session.resume();
  advance(session, 0.2);
  assert.ok(session.world.time > time);
});

test('only AI and online matches start, and rematches reset transient state', () => {
  assert.deepEqual([...MATCH_MODES], ['ai', 'online']);
  const session = createSession();
  for (const removed of ['duel', 'practice', 'solo', true]) assert.throws(() => session.startRound(removed), /Unknown game mode/);
  startIdle(session);
  advance(session, 2.5);
  session.impact({ type: 'hit', strength: 1, damage: 12, point: { x: 0, y: 1, z: 0 }, speed: 3, acceleration: 0 });
  assert.equal(session.getSnapshot().effects.length, 1);
  session.startRound();
  assert.equal(session.world.time, 0);
  assert.equal(session.getSnapshot().effects.length, 0);
  session.goHome();
  assert.equal(session.state, 'lobby');
});

test('loadouts commit atomically for both fighters and survive rematch and return home', () => {
  const session = createSession(), before = session.getSnapshot();
  for (const value of [[dudu('happy-paws'), basic('yellow-staff')], [basic('takeout-box'), basic('sword')], [dudu('sword')]]) {
    assert.equal(session.setLoadouts(value), false);
    assert.equal(session.getSnapshot(), before);
  }
  assert.equal(session.setLoadouts([basic('sword'), basic('polearm')]), true);
  assert.ok(Object.isFrozen(session.getSnapshot().loadouts[0]), 'snapshot selections cannot mutate session state');
  startIdle(session);
  session.startRound();
  assert.deepEqual(session.world.players.map(p => p.weapon), ['sword', 'polearm']);
  assert.equal(session.setLoadouts([basic('hammer'), basic('sword')]), false, 'no changes mid-match');
  session.goHome();
  assert.equal(session.getSnapshot().loadouts[0].weaponId, 'sword');
});

test('catalogues expose every loadout and keep signature weapons exclusive', () => {
  // 奶蛙, 胆子肥嘟嘟 and 开心小猫: signature + 6 common weapons; 火柴人: 6 common.
  assert.equal(PLAYABLE_LOADOUTS.length, 7 + 6 + 7 + 7);
  assert.equal(canEquip('stickman', 'takeout-box'), false);
  assert.equal(canEquip('dudu', 'takeout-box'), true);
  assert.equal(canEquip('naiwa', 'yellow-staff'), true);
  assert.equal(canEquip('dudu', 'yellow-staff'), false);
  assert.equal(canEquip('happy-cat', 'sword'), true);
  assert.equal(canEquip('naiwa', 'happy-paws'), false);
  for (const c of ['stickman', 'dudu', 'naiwa', 'happy-cat']) for (const w of ['sword', 'polearm', 'hammer', 'axe', 'mace', 'pan']) assert.equal(canEquip(c, w), true);
  for (const removed of [{ characterId: 'beagle', weaponId: 'long-ears' }, { characterId: 'yellow-blob', weaponId: 'yellow-staff' }])
    assert.throws(() => normalizeLoadout(removed));
  assert.equal(canEquip('happy-cat', 'happy-paws'), true);
  assert.equal(resolveLoadout({ characterId: 'happy-cat', weaponId: 'happy-paws' }).weapon.characterId, 'happy-cat');
  for (const character of CHARACTER_CATALOG) assert.ok(SKILLS[character.skill], `${character.name} has a skill`);
  assert.equal(resolveLoadout(dudu('sword')).skill.id, 'delivery');
});

test('every pairing starts with separated weapons and clear of the props', () => {
  for (const first of PLAYABLE_LOADOUTS) for (const second of PLAYABLE_LOADOUTS) {
    const world = new ArenaPhysics();
    world.reset(first, second, { arenaScale: MATCH_ARENA_SCALE, obstacles: ARENA_OBSTACLES });
    const [a, b] = world.players;
    for (const x of weaponSegments(a)) for (const y of weaponSegments(b))
      assert.ok(closestSegments(x.a, x.b, y.a, y.b).distance > x.radius + y.radius, JSON.stringify([first, second]));
  }
});

test('WASD drives only the local fighter; opposite keys cancel; old keys are ignored', () => {
  const session = createSession();
  startIdle(session);
  advance(session, 2.5);
  for (const key of ['KeyW', 'KeyA']) session.keyDown(key);
  assert.deepEqual(session.getInputs(), [{ theta: 1, phi: -1 }, { theta: 0, phi: 0 }]);
  session.keyDown('KeyS');
  session.keyDown('KeyD');
  assert.deepEqual(session.getInputs()[0], { theta: 0, phi: 0 });
  for (const removed of ['ArrowUp', 'ShiftRight', 'KeyQ', 'KeyE']) session.keyDown(removed);
  assert.deepEqual(session.getSnapshot().pressed.sort(), ['KeyA', 'KeyD', 'KeyS', 'KeyW']);
});

test('F starts the character skill on exactly one physics step, then the cooldown blocks it', () => {
  for (const characterId of ['naiwa', 'stickman', 'dudu', 'happy-cat']) {
    const session = createSession();
    session.setLoadouts([{ characterId, weaponId: characterId === 'happy-cat' ? 'happy-paws' : 'sword' }, basic('sword')]);
    startIdle(session);
    advance(session, 2.5);
    session.world.players[0].health = 60;
    session.keyDown('KeyF');
    assert.equal(session.getInputs()[0].skillTap, true);
    session.tick(1 / 60);
    const player = session.world.players[0], skill = SKILLS[player.skill];
    assert.ok(player.skillActive || skill.id === 'twist', `${characterId} skill started`);
    assert.ok(player.skillCooldown > skill.cooldown - 0.1);
    assert.equal(session.getInputs()[0].skillTap, undefined);
    assert.equal(session.getSnapshot().skills[0].id, skill.id);
    session.keyUp('KeyF'); session.keyDown('KeyF'); session.tick(1 / 60);
    assert.ok(player.skillCooldown > skill.cooldown - 0.2, 'no restart during the cooldown');
  }
});

test('skills: laugh drains the opponent, Happy Happy heals, twist lands behind, takeout flies and hits', () => {
  const world = new ArenaPhysics();
  world.reset({ characterId: 'naiwa', weaponId: 'yellow-staff' }, basic('sword'), { arenaScale: MATCH_ARENA_SCALE });
  for (let i = 0; i < 180 * 4.2; i++) world.step([{ skillTap: i === 0 }, { theta: 0, phi: 0 }]);
  assert.ok(world.players[1].stamina < 60, 'the laugh drained the opponent');
  assert.equal(world.players[0].skillActive, false, 'the laugh ends');

  world.reset({ characterId: 'happy-cat', weaponId: 'happy-paws' }, basic('sword'), { arenaScale: MATCH_ARENA_SCALE });
  world.players[0].health = 50;
  for (let i = 0; i < 180 * 2; i++) world.step([{ skillTap: i === 0 }, {}]);
  assert.ok(Math.abs(world.players[0].health - 50 - SKILLS.happy.heal) < 0.01);

  world.reset(basic('sword'), dudu('sword'), { arenaScale: MATCH_ARENA_SCALE });
  world.players[1].p.x = 6;
  world.step([{ skillTap: true }, {}]);
  const [twister, target] = world.players, back = Math.atan2(twister.p.z - target.p.z, twister.p.x - target.p.x);
  assert.ok(Math.abs(Math.cos(back - target.bodyYaw) + 1) < 0.05, 'lands behind the target');
  assert.ok(Math.abs(Math.hypot(twister.p.x - target.p.x, twister.p.z - target.p.z) - SKILLS.twist.behind) < 0.05);

  world.reset(dudu('takeout-box'), basic('sword'), { arenaScale: MATCH_ARENA_SCALE });
  world.players[0].p.x = -3; world.players[1].p.x = 3;
  world.step([{ skillTap: true }, {}]);
  assert.equal(world.projectiles.length, 1);
  let hit = null;
  for (let i = 0; i < 180 && !hit; i++) { world.step([{}, {}]); hit = world.events.find(e => e.type === 'hit' && e.source === 'delivery'); }
  assert.ok(hit, 'the takeout hits');
  assert.equal(world.players[1].health, 100 - SKILLS.delivery.damage);
  assert.equal(world.projectiles.length, 0);
});

test('matches use the enlarged arena with its props, and the rim still holds', () => {
  const session = createSession();
  startIdle(session);
  const radius = CONFIG.arenaRadius * MATCH_ARENA_SCALE;
  assert.equal(session.world.arenaRadius, radius);
  assert.equal(session.world.obstacles, ARENA_OBSTACLES);
  const [first, second] = session.world.players;
  first.p.x = 30; second.p.x = -30;
  session.world.step([{ theta: 0, phi: 0 }, { theta: 0, phi: 0 }]);
  for (const player of session.world.players) assert.ok(Math.hypot(player.p.x, player.p.z) <= radius - CONFIG.bodyRadius + 1e-6);
});

test('W always swings toward the view, even with the weapon turned behind; the choice holds for the whole press', () => {
  const session = createSession();
  startIdle(session);
  advance(session, 2.5);
  const player = session.world.players[0];
  session.localFaceYaw = 0;
  player.phi = 0.3;
  session.keyDown('KeyW');
  assert.equal(session.getInputs()[0].theta, 1, 'weapon in front: plain W');
  session.keyUp('KeyW');
  player.phi = Math.PI - 0.2;
  session.keyDown('KeyW');
  assert.equal(session.getInputs()[0].theta, -1, 'weapon behind: mirrored so the swing still goes forward');
  player.phi = 0.1;
  assert.equal(session.getInputs()[0].theta, -1, 'turning mid-press never flips the swing');
  session.keyUp('KeyW');
  session.keyDown('KeyS');
  assert.equal(session.getInputs()[0].theta, -1, 'S re-decides on its own press');
});

test('the camera yaw drives the local body; looking never steers the weapon', () => {
  const session = createSession(), baseline = createSession();
  for (const game of [session, baseline]) { startIdle(game); advance(game, 2.5); }
  const local = session.world.players[0];
  session.localFaceYaw = 1.2;
  assert.equal(session.getInputs()[0].faceYaw, 1.2);
  for (const game of [session, baseline]) advance(game, 0.5);
  assert.ok(Math.abs(local.bodyYaw - 1.2) < 1e-9);
  assert.equal(local.phi, baseline.world.players[0].phi);
  session.localFaceYaw = null;
  advance(session, 0.2);
  assert.ok(Math.abs(local.bodyYaw - 1.2) < 1e-9, 'clearing the view keeps the current facing');
});

test('the AI opponent is drawn at random every AI round, the player keeps their pick', () => {
  const session = new GameSession({ audio: silentAudio(), makeAi: () => ({ think: () => ({ theta: 0, phi: 0 }) }) });
  session.setLoadouts([basic('axe'), basic('sword')]);
  const drawn = new Set();
  for (let round = 0; round < 12; round++) {
    session.startRound('ai');
    assert.deepEqual(session.loadouts[0], basic('axe'));
    assert.ok(PLAYABLE_LOADOUTS.some(l => l.characterId === session.loadouts[1].characterId && l.weaponId === session.loadouts[1].weaponId));
    drawn.add(`${session.loadouts[1].characterId}:${session.loadouts[1].weaponId}`);
    session.goHome();
  }
  assert.ok(drawn.size > 3, 'different opponents come up');
});

test('skills have long cooldowns and the thrown takeout box is big', () => {
  for (const skill of Object.values(SKILLS)) assert.ok(skill.cooldown >= 20, `${skill.name} cooldown ${skill.cooldown}`);
  assert.ok(SKILLS.delivery.radius >= 0.5);
});

test('the arena skin is a session choice that only accepts known skins', () => {
  const session = createSession();
  assert.equal(session.getSnapshot().arenaSkin, 'courtyard');
  session.setArenaSkin('lakeside');
  session.setArenaSkin('moon');
  assert.equal(session.getSnapshot().arenaSkin, 'lakeside');
});

test('the AI drives the opponent during play only, at the chosen difficulty', () => {
  const session = new GameSession({ audio: silentAudio() });
  session.setAiDifficulty('hard');
  assert.equal(session.getSnapshot().aiDifficulty, 'hard');
  session.setAiDifficulty('impossible');
  assert.equal(session.aiDifficulty, 'hard');
  session.startRound('ai');
  assert.deepEqual(session.getInputs()[1], { theta: 0, phi: 0 }, 'idle during the countdown');
  advance(session, 2.5);
  advance(session, 3);
  const ai = session.world.players[1];
  assert.ok(Math.hypot(ai.p.x - 2.2, ai.p.z) > 0.5 || ai.stamina < 200, 'the AI acts once play begins');
});

test('the winner can move after victory while the defeated fighter stays frozen', () => {
  for (const winner of [0, 1]) {
    const session = createSession();
    startIdle(session);
    session.world.winner = winner;
    session.world.players[1 - winner].health = 0;
    session.finishRound();
    const dead = structuredClone(session.world.players[1 - winner]);
    const before = session.world.players[winner].phi;
    session.getInputs = () => { const inputs = [{}, {}]; inputs[winner] = { theta: 1, phi: 1 }; return inputs; };
    for (let i = 0; i < 60; i++) session.tick(1 / 60);
    assert.equal(session.state, 'result');
    assert.deepEqual(session.world.players[1 - winner], dead);
    assert.notEqual(session.world.players[winner].phi, before);
    assert.equal(session.world.events.length, 0);
    session.startRound();
    assert.equal(session.world.winner, null);
    assert.ok(session.world.players.every(p => p.health === 100));
  }
});

test('a defeated local player cannot press keys, and a draw freezes both fighters', () => {
  const session = createSession();
  startIdle(session);
  session.world.winner = 1;
  session.finishRound();
  session.keyDown('KeyW');
  assert.deepEqual(session.getSnapshot().pressed, []);
  const draw = createSession();
  draw.world.winner = -1;
  draw.finishRound();
  const before = structuredClone(draw.world.players);
  draw.tick(0.05);
  assert.deepEqual(draw.world.players, before);
});

test('online matches never pause; Esc only opens the local menu', () => {
  const session = createSession();
  session.mode = 'online';
  session.startRound('online');
  advance(session, 2.5);
  session.keyDown('KeyW');
  session.pause();
  assert.equal(session.state, 'playing');
  assert.equal(session.menuOpen, true);
  assert.deepEqual(session.getInputs()[0], { theta: 0, phi: 0 }, 'menu holds your fighter still');
  const time = session.world.time;
  advance(session, 0.3);
  assert.ok(session.world.time > time, 'the round keeps running');
  session.resume();
  assert.equal(session.menuOpen, false);
});
