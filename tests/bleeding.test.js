import test from 'node:test';
import assert from 'node:assert/strict';
import { applyPerfume, stepBleeding, updateAbility, finishAbilityTick } from '../src/arena-skills.js';
import { NetSession } from '../src/net-session.js';
import { ArenaPhysics, bodyFloor, CONFIG, hurtSegments, v3 } from '../src/physics.js';
import { SKILLS } from '../src/skills.js';
import { quietSession } from './sandbox.js';

const MEAN_GIRL = { characterId: 'mean-girl', weaponId: 'crowned-heart' };
const STICKMAN = { characterId: 'stickman', weaponId: 'sword' };
const CR7 = { characterId: 'cr7', weaponId: 'soccer-ball' };
const FRAME = 1 / 60;
const INTERVAL = SKILLS.perfume.bleedInterval;

function placeForPerfume([caster, target]) {
  Object.assign(caster, { p: v3(0, bodyFloor(caster), 0), v: v3(), theta: 0, phi: 0, wt: 0, wp: 0, bodyYaw: 0, sprayYaw: 0 });
  Object.assign(target, { p: v3(2.75 * (caster.scale ?? 1), bodyFloor(target), 0), v: v3(), theta: 0, phi: 0, wt: 0, wp: 0 });
}

function expose(world) {
  const [caster] = world.players;
  caster.perfumeStep = CONFIG.step;
  applyPerfume(world, caster, CONFIG.step, hurtSegments);
}

function setup({ defender = STICKMAN, endless = false, scale = 1 } = {}) {
  const world = new ArenaPhysics();
  world.reset(MEAN_GIRL, defender, { endless, arenaScale: 3 });
  const [caster, target] = world.players;
  if (scale !== 1) for (const p of world.players) Object.assign(p, { scale, damageScale: 1.25 });
  placeForPerfume(world.players);
  return { world, caster, target };
}

const bleedEvents = events => events.filter(event => event.type === 'hit' && event.source === 'bleed');
const bleedState = player => [player.bleedStacks, player.bleedTick, player.bleedOwner];

test('the first bleed tick waits two seconds and bleeding continues after perfume ends', () => {
  const { world, caster, target } = setup();
  assert.equal(INTERVAL, 2);
  expose(world);
  assert.equal(target.bleedStacks, 1);
  assert.equal(target.bleedOwner, caster.id);
  assert.equal(target.health, 100);
  target.p.x = -6;

  stepBleeding(world, target, INTERVAL - CONFIG.step);
  assert.equal(target.health, 100);
  assert.deepEqual(bleedEvents(world.events), []);
  stepBleeding(world, target, CONFIG.step);
  assert.equal(target.health, 99);
  stepBleeding(world, target, INTERVAL * 4);
  assert.equal(target.bleedStacks, 1);
  assert.equal(target.health, 95);
  assert.deepEqual(bleedEvents(world.events).map(event => [event.attacker, event.target, event.damage]),
    Array.from({ length: 5 }, () => [caster.id, target.id, 1]));
});

test('repeat exposure does not stack damage or reset an existing tick', () => {
  const { world, target } = setup();
  expose(world);
  stepBleeding(world, target, INTERVAL * 0.75);
  target.p.x = -2;
  expose(world);
  placeForPerfume(world.players);
  for (let i = 0; i < 5; i++) expose(world);
  assert.equal(target.health, 100);
  stepBleeding(world, target, INTERVAL * 0.25);
  assert.equal(target.health, 99);
  assert.deepEqual(bleedEvents(world.events).map(event => event.damage), [1]);
});

test('fighter growth does not increase the one-HP bleed tick', () => {
  const { world, target } = setup({ scale: 3 });
  expose(world);
  assert.equal(target.bleedStacks, 1);
  stepBleeding(world, target, INTERVAL);
  assert.equal(target.health, 99);
  assert.deepEqual(bleedEvents(world.events).map(event => event.damage), [1]);
});

test('CR7 immunity prevents application and skips due ticks without shifting the cadence', () => {
  const { world, target } = setup({ defender: CR7 });
  target.abilityPhase = 'active';
  expose(world);
  assert.deepEqual(bleedState(target), [0, 0, null]);

  target.abilityPhase = 'idle';
  expose(world);
  stepBleeding(world, target, INTERVAL * 0.75);
  target.abilityPhase = 'active';
  stepBleeding(world, target, INTERVAL * 0.5);
  assert.equal(target.health, 100);
  assert.equal(target.bleedStacks, 1);
  assert.deepEqual(bleedEvents(world.events), []);

  target.abilityPhase = 'idle';
  stepBleeding(world, target, INTERVAL * 0.5);
  assert.equal(target.health, 100, 'the skipped tick is not paid after immunity');
  stepBleeding(world, target, INTERVAL * 0.25);
  assert.equal(target.health, 99);
  assert.equal(bleedEvents(world.events).length, 1);
});

test('bleed respects the health floor and a lethal tick clears the round’s bleed state', () => {
  const practice = setup({ endless: true });
  expose(practice.world);
  practice.target.health = 1.25;
  stepBleeding(practice.world, practice.target, INTERVAL * 2);
  assert.equal(practice.target.health, 1);
  assert.deepEqual(bleedEvents(practice.world.events).map(event => event.damage), [0.25]);

  const { world, caster, target } = setup();
  expose(world);
  target.health = 0.25;
  stepBleeding(world, target, INTERVAL - CONFIG.step);
  world.step([{}, {}]);
  assert.equal(target.health, 0);
  assert.equal(world.winner, caster.id);
  assert.ok(world.players.every(p => !p.bleedStacks && p.bleedTick === 0 && p.bleedOwner === null));
  assert.deepEqual(bleedEvents(world.events).map(event => event.damage), [0.25]);
  expose(world);
  stepBleeding(world, target, INTERVAL);
  assert.equal(target.health, 0);
  assert.deepEqual(bleedState(target), [0, 0, null]);
});

test('a knockout of the caster also clears bleeding from the surviving opponent', () => {
  const { world, caster, target } = setup();
  expose(world);
  caster.health = 0;
  world.step([{}, {}]);
  assert.equal(world.winner, target.id);
  assert.equal(target.health, 100);
  assert.deepEqual(bleedState(target), [0, 0, null]);
});

function tickSession(session, seconds) {
  for (let i = 0; i < Math.round(seconds / FRAME); i++) session.tick(FRAME);
}

test('offline pause freezes the bleed clock and rematch and home clear it', () => {
  const session = quietSession();
  session.setLoadouts([MEAN_GIRL, STICKMAN]);
  session.startRound('ai');
  tickSession(session, 2.6);
  placeForPerfume(session.world.players);
  const [, target] = session.world.players;
  expose(session.world);
  tickSession(session, INTERVAL * 0.75);
  const beforePause = bleedState(target);
  session.pause();
  tickSession(session, INTERVAL + 1);
  assert.deepEqual(bleedState(target), beforePause);
  assert.equal(target.health, 100);
  session.resume();
  tickSession(session, INTERVAL * 0.25 + 0.1);
  assert.equal(target.health, 99);

  session.startRound('ai');
  assert.deepEqual(bleedState(session.world.players[1]), [0, 0, null]);
  tickSession(session, 2.6);
  placeForPerfume(session.world.players);
  expose(session.world);
  assert.equal(session.world.players[1].bleedStacks, 1);
  session.goHome();
  assert.equal(session.state, 'lobby');
  assert.deepEqual(bleedState(session.world.players[1]), [0, 0, null]);
});

test('the guest sees the host’s bleed status, HP and one tick event, then disconnect clears both sides', () => {
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
  host.setLoadout(MEAN_GIRL, true);
  guest.setLoadout(STICKMAN, true);
  flush();
  assert.equal(host.start(), true);
  flush();
  tickBoth(2.6);

  const received = [];
  const guestImpact = guestSession.impact.bind(guestSession);
  guestSession.impact = event => { received.push(event); guestImpact(event); };
  placeForPerfume(hostSession.world.players);
  hostSession.localFaceYaw = 0;
  hostSession.keyDown('KeyF');
  tickBoth(SKILLS.perfume.windup + 0.15);
  const [caster, target] = hostSession.world.players;
  const replica = guestSession.world.players[1];
  assert.equal(target.bleedStacks, 1);
  assert.equal(replica.bleedStacks, 1);
  assert.equal(replica.health, 100);

  tickBoth(INTERVAL + 0.05);
  assert.equal(target.health, 99);
  assert.equal(replica.health, target.health);
  assert.deepEqual(bleedEvents(received).map(event => [event.attacker, event.target, event.damage]), [[0, 1, 1]]);
  assert.equal(caster.abilityPhase, 'active', 'disconnect while the original spray can still contact');
  host.closed();
  guest.closed();
  tickBoth(0.15);
  assert.deepEqual(bleedState(target), [0, 0, null]);
  assert.deepEqual(bleedState(replica), [0, 0, null]);
  assert.equal(bleedEvents(received).length, 1);
});


test('separate perfume activations add permanent stacks without resetting the tick cadence', () => {
  const {world,caster,target}=setup();
  const cast=()=>{
    caster.skillCooldown=0;caster.abilityPhase='idle';caster.skillActive=false;caster.stamina=200;
    updateAbility(world,caster,true,CONFIG.step);
    assert.equal(caster.skillCooldown,40);
    assert.equal(caster.stamina,165);
    for(let i=0;i<90&&caster.abilityPhase==='windup';i++){updateAbility(world,caster,false,CONFIG.step);finishAbilityTick(world,caster);}
    assert.equal(caster.abilityPhase,'active');expose(world);
  };
  cast();stepBleeding(world,target,1.5);
  target.p.x=-5;expose(world);placeForPerfume(world.players);expose(world);
  assert.equal(target.bleedStacks,1);assert.equal(target.bleedTick,1.5);
  cast();assert.equal(target.bleedStacks,2);assert.equal(target.bleedTick,1.5);assert.equal(target.health,100);
  stepBleeding(world,target,.5);assert.equal(target.health,98);
  cast();assert.equal(target.bleedStacks,3);stepBleeding(world,target,2);assert.equal(target.health,95);
  assert.deepEqual(world.events.filter(e=>e.type==='bleed-stack').map(e=>e.stacks),[1,2,3]);
  assert.deepEqual(bleedEvents(world.events).map(e=>e.damage),[2,3]);
});
