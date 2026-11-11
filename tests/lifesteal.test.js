import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, v3 } from '../src/physics.js';
import { NetSession } from '../src/net-session.js';
import { SKILLS } from '../src/skills.js';
import { quietSession } from './sandbox.js';

const MAODIE = { characterId: 'maodie', weaponId: 'maodie-paw' };
const STICKMAN = { characterId: 'stickman', weaponId: 'sword' };
const CR7 = { characterId: 'cr7', weaponId: 'soccer-ball' };
const FRAME = 1 / 60;

function placeForHit(attacker, target, speed = 7) {
  Object.assign(attacker, { p: v3(0, 5, 0), v: v3(speed, 0, 0), theta: 0, phi: 0, wt: 0, wp: 0 });
  Object.assign(target, { p: v3(0.42, 7.03, 0), v: v3(), bodyYaw: 0 });
}

function attackSetup({ active = true, defender = STICKMAN, speed } = {}) {
  const world = new ArenaPhysics();
  world.reset(MAODIE, defender);
  const [attacker, target] = world.players;
  placeForHit(attacker, target, speed);
  if (active) world.updateSkill(attacker, true, CONFIG.step);
  world.events.length = 0;
  const hit = () => world.solveAttack(attacker, target, CONFIG.step);
  return { world, attacker, target, hit };
}

const heals = world => world.events.filter(event => event.type === 'heal');
const hitEvent = world => world.events.find(event => event.type === 'hit');

test('Maodie heals twice the HP actually removed by an active melee hit', () => {
  for (const initialHP of [100, 1.25]) {
    const { world, attacker, target, hit } = attackSetup();
    attacker.health = 10;
    target.health = initialHP;
    hit();
    assert.ok(hitEvent(world)?.damage > 0, 'the fixture must land a damaging melee hit');
    if (initialHP < 2) {
      assert.ok(hitEvent(world).damage > initialHP, 'the fractional case must overkill');
      assert.equal(target.health, 0);
    }
    const expected = 2 * (initialHP - target.health);
    assert.equal(attacker.health, 10 + expected);
    assert.deepEqual(heals(world), [{ type: 'heal', player: attacker.id, amount: expected, point: attacker.p, sourcePoint: hitEvent(world).point, source: 'lifesteal' }]);
  }
});

test('lifesteal caps at max HP and reports only the recovery applied', () => {
  for (const missingHP of [0.5, 0]) {
    const { world, attacker, hit } = attackSetup();
    attacker.health = attacker.maxHealth - missingHP;
    hit();
    assert.ok(hitEvent(world)?.damage > 0);
    assert.equal(attacker.health, attacker.maxHealth);
    assert.deepEqual(heals(world).map(event => event.amount), missingHP ? [missingHP] : []);
  }
});

test('inactive, immune, sustained, slow, and lethal-trade contacts cannot heal Maodie', () => {
  const cases = [
    { setup: { active: false }, damages: true },
    { setup: { defender: CR7 }, arrange: ({ target }) => { target.abilityPhase = 'active'; }, damages: false },
    { arrange: ({ world, attacker }) => { world.contacts[attacker.id].separated = 0; }, damages: false },
    { setup: { speed: 0 }, damages: false },
    { arrange: ({ attacker }) => { attacker.health = 0; } },
  ];
  for (const { setup, arrange, damages } of cases) {
    const fixture = attackSetup(setup);
    fixture.attacker.health = 10;
    arrange?.(fixture);
    const before = fixture.attacker.health;
    fixture.hit();
    if (damages !== undefined) assert.equal(Boolean(hitEvent(fixture.world)), damages);
    assert.equal(fixture.attacker.health, before);
    assert.deepEqual(heals(fixture.world), []);
  }
});

test('lifesteal applies to melee damage only', () => {
  const { world, attacker, target } = attackSetup();
  attacker.health = 10;
  world.throwDelivery(attacker, SKILLS.delivery);
  const [shot] = world.projectiles;
  shot.p = { ...target.p };
  world.stepProjectiles(CONFIG.step);
  assert.equal(hitEvent(world)?.source, 'delivery');
  assert.equal(attacker.health, 10);
  assert.deepEqual(heals(world), []);
});

test('weapon clashes and floor support do not heal Maodie', () => {
  const { world, attacker, target } = attackSetup();
  attacker.health = 10;
  attacker.v = v3(0, 0, 7);
  Object.assign(target, { p: v3(0, 5, 0.5), theta: 0 });
  world.solveStaffClash(CONFIG.step);
  assert.ok(world.events.some(event => event.type === 'clash'));
  Object.assign(attacker, { p: v3(0, CONFIG.bodyFloor, 0), theta: Math.PI, v: v3(), wt: 0, wp: 0 });
  world.solveStaffGround(attacker, CONFIG.step);
  assert.ok(attacker.staffGrounded && attacker.v.y > 0);
  assert.equal(attacker.health, 10);
  assert.deepEqual(heals(world), []);
});

test('a live knockout applies its final heal and clears the active lifesteal state', () => {
  const { world, attacker, target } = attackSetup();
  attacker.health = 10;
  target.health = 1.25;
  target.theta = 0;
  world.step([{}, {}]);
  assert.equal(world.winner, attacker.id);
  assert.equal(attacker.health, 12.5);
  assert.equal(attacker.skillActive, false);
  assert.equal(attacker.skillTime, 0);
  assert.deepEqual(heals(world).map(event => event.amount), [2.5]);
});

test('lifesteal expires after eight seconds, then remains on its forty-second cooldown', () => {
  const { world, attacker, hit } = attackSetup();
  const advanceSkill = seconds => {
    for (let i = 0; i < Math.round(seconds / CONFIG.step); i++) world.updateSkill(attacker, false, CONFIG.step);
  };
  assert.equal(attacker.skill, 'lifesteal');
  assert.equal(attacker.skillActive, true);
  assert.equal(attacker.skillCooldown, 40);
  advanceSkill(7.9);
  assert.equal(attacker.skillActive, true);
  advanceSkill(0.2);
  assert.equal(attacker.skillActive, false);
  assert.ok(attacker.skillCooldown > 31 && attacker.skillCooldown < 32);
  world.updateSkill(attacker, true, CONFIG.step);
  assert.equal(attacker.skillActive, false, 'a tap during cooldown cannot reactivate');
  attacker.health = 10;
  hit();
  assert.ok(hitEvent(world)?.damage > 0);
  assert.equal(attacker.health, 10, 'a hit after expiry cannot heal');
  advanceSkill(32);
  world.updateSkill(attacker, true, CONFIG.step);
  assert.equal(attacker.skillActive, true);
  assert.equal(attacker.skillCooldown, 40);
});

function tickSession(session, seconds) {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) session.tick(FRAME);
}

test('offline pause freezes lifesteal and a fresh round clears its state', () => {
  const session = quietSession();
  session.setLoadouts([MAODIE, STICKMAN]);
  session.startRound('ai');
  tickSession(session, 2.5);
  session.keyDown('KeyF');
  tickSession(session, 0.05);
  const [player] = session.world.players;
  assert.equal(player.skillActive, true);
  const before = [player.skillTime, player.skillCooldown];
  session.pause();
  tickSession(session, 2);
  assert.deepEqual([player.skillTime, player.skillCooldown], before);
  session.resume();
  tickSession(session, 0.1);
  assert.ok(player.skillTime < before[0] && player.skillCooldown < before[1]);
  session.startRound('ai');
  assert.deepEqual(session.world.players.map(p => [p.skillActive, p.skillTime, p.skillCooldown]), [[false, 0, 0], [false, 0, 0]]);
  tickSession(session, 2.5);
  session.keyDown('KeyF');
  tickSession(session, 0.05);
  assert.equal(session.world.players[0].skillActive, true);
  session.goHome();
  assert.equal(session.state, 'lobby');
  assert.deepEqual(session.world.players.map(p => [p.skillActive, p.skillTime, p.skillCooldown]), [[false, 0, 0], [false, 0, 0]]);
});

test('a guest Maodie gets authoritative HP and one copy of the heal event', () => {
  const sessions = [quietSession(), quietSession()];
  const queues = [[], []];
  const peers = sessions.map((session, side) => new NetSession(session, {
    send: message => queues[1 - side].push(JSON.parse(JSON.stringify(message))), close() {},
  }, { role: side ? 'guest' : 'host', version: 'test' }));
  const [host, guest] = peers;
  const [authority, replica] = sessions;
  const flush = () => {
    for (let round = 0; round < 8 && queues.some(queue => queue.length); round++) {
      peers.forEach((peer, side) => queues[side].splice(0).forEach(message => peer.receive(message)));
    }
  };
  const tickBoth = seconds => {
    for (let i = 0; i < Math.round(seconds / FRAME); i++) {
      authority.tick(FRAME);
      flush();
      replica.tick(FRAME);
      flush();
    }
  };
  guest.hello();
  flush();
  host.setLoadout(STICKMAN, true);
  guest.setLoadout(MAODIE, true);
  flush();
  assert.equal(host.start(), true);
  flush();
  tickBoth(2.6);
  replica.keyDown('KeyF');
  tickBoth(0.12);
  const [target, attacker] = authority.world.players;
  assert.equal(attacker.skillActive, true);
  assert.equal(replica.world.players[1].skillActive, true);

  const received = [];
  const impact = replica.impact.bind(replica);
  replica.impact = event => { received.push(event); impact(event); };
  attacker.health = 10;
  placeForHit(attacker, target);
  authority.world.events.length = 0;
  authority.world.solveAttack(attacker, target, CONFIG.step);
  const [heal] = heals(authority.world);
  assert.ok(heal?.amount > 0);
  host.afterTick(FRAME, authority.world.events);
  flush();
  for (let i = 0; i < 8; i++) replica.tick(FRAME);
  assert.deepEqual(replica.world.players.map(p => p.health), authority.world.players.map(p => p.health));
  assert.deepEqual(received.filter(event => event.type === 'heal'), [heal]);

  assert.equal(authority.world.players[1].skillActive, true);
  assert.equal(replica.world.players[1].skillActive, true);
  host.closed();
  guest.closed();
  for (const session of sessions) {
    assert.equal(session.world.players[1].skillActive, false);
    assert.equal(session.world.players[1].skillTime, 0);
  }
});
