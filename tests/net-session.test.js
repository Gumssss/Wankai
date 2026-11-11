import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NetSession, PROTOCOL, sanitizeInput } from '../src/net-session.js';
import { quietSession } from './sandbox.js';

// Two sessions joined by an in-memory link. Messages are queued and only
// delivered by flush(), so ordering and latency are under test control.
function link() {
  const queues = [[], []], ends = [];
  const transport = side => ({ send: message => queues[1 - side].push(JSON.parse(JSON.stringify(message))), close: () => ends[side]?.closed() });
  const flush = () => {
    for (let round = 0; round < 10 && (queues[0].length || queues[1].length); round++)
      for (const side of [0, 1]) for (const message of queues[side].splice(0)) ends[side].receive(message);
  };
  return { transport, flush, ends, queues };
}
function pair({ hostVersion = '1.0', guestVersion = '1.0', hostName = 'Red', guestName = 'Blue' } = {}) {
  const net = link();
  const hostSession = quietSession(), guestSession = quietSession();
  let clock = 0;
  const now = () => clock;
  const host = new NetSession(hostSession, net.transport(0), { role: 'host', version: hostVersion, name: hostName, now });
  const guest = new NetSession(guestSession, net.transport(1), { role: 'guest', version: guestVersion, name: guestName, now });
  net.ends.push(host, guest);
  guest.hello();
  net.flush();
  const tick = (seconds, steps = Math.round(seconds * 60)) => {
    for (let i = 0; i < steps; i++) { clock += 1 / 60; hostSession.tick(1 / 60); net.flush(); guestSession.tick(1 / 60); net.flush(); }
  };
  return { host, guest, hostSession, guestSession, net, tick };
}
const ready = ({ host, guest, net }, a = { characterId: 'naiwa', weaponId: 'yellow-staff' }, b = { characterId: 'dudu', weaponId: 'takeout-box' }) => {
  host.setLoadout(a, true); guest.setLoadout(b, true); net.flush();
};

test('handshake connects matching builds and assigns host red, guest blue', () => {
  const { host, guest, hostSession, guestSession } = pair();
  assert.equal(host.phase, 'connected');
  assert.equal(guest.phase, 'connected');
  assert.equal(hostSession.localPlayerId, 0);
  assert.equal(guestSession.localPlayerId, 1);
  assert.equal(guestSession.replica, true);
  assert.equal(hostSession.mode, 'online');
});

test('the Drive character loadouts synchronize and both players can control them online', () => {
  const choices = [
    { characterId: 'cr7', weaponId: 'soccer-ball' },
    { characterId: 'mean-girl', weaponId: 'crowned-heart' },
    { characterId: 'maodie', weaponId: 'maodie-paw' },
  ];
  for (let i = 0; i < choices.length; i++) {
    const game = pair();
    ready(game, choices[i], choices[(i + 1) % choices.length]);
    assert.equal(game.host.start(), true);
    game.net.flush();
    game.tick(2.6);
    game.hostSession.keyDown('KeyW');
    game.guestSession.keyDown('KeyS');
    game.guestSession.keyDown('KeyD');
    game.tick(.6);
    assert.deepEqual(game.guestSession.loadouts, game.hostSession.loadouts);
    for (const p of game.hostSession.world.players) {
      assert.ok(Math.abs(p.wt) > .1);
      assert.equal(p.skill,({cr7:'ricochet','mean-girl':'perfume',maodie:'lifesteal'})[p.characterId]??null);
    }
    assert.equal(game.guestSession.world.players[1].characterId, choices[(i + 1) % choices.length].characterId);
  }
});

test('a version mismatch is refused with a reason, and the host keeps waiting', () => {
  const versions = pair({ guestVersion: '0.9' });
  assert.equal(versions.guest.phase, 'closed');
  assert.match(versions.guest.message, /版本不一致/);
  assert.equal(versions.host.phase, 'waiting', 'the host keeps its room open');
  assert.equal(PROTOCOL, 16);
});

test('the handshake carries both Steam names, cleaned for display', () => {
  const game = pair({ hostName: 'Red\u0007 Cat', guestName: 'x'.repeat(80) });
  assert.equal(game.guest.peer.name, 'Red Cat');
  assert.equal(game.host.peer.name, 'x'.repeat(32));
  assert.equal(game.hostSession.netInfo.peer.name, 'x'.repeat(32));
});

test('loadouts and ready flags sync; only the host starts, and only when both are ready', () => {
  const game = pair();
  assert.equal(game.host.start(), false);
  game.host.setLoadout({ characterId: 'naiwa', weaponId: 'yellow-staff' }, true);
  game.net.flush();
  assert.deepEqual(game.guest.peer.loadout, { characterId: 'naiwa', weaponId: 'yellow-staff' });
  assert.equal(game.host.canStart(), false);
  game.guest.setLoadout({ characterId: 'naiwa', weaponId: 'happy-paws' }, true);
  game.net.flush();
  assert.equal(game.host.peer.loadout, null, 'invalid loadouts never travel as valid');
  ready(game);
  assert.equal(game.guest.canStart(), false);
  assert.equal(game.host.start(), true);
  game.net.flush();
  for (const session of [game.hostSession, game.guestSession]) {
    assert.equal(session.state, 'countdown');
    assert.deepEqual(session.loadouts.map(l => l.weaponId), ['yellow-staff', 'takeout-box']);
  }
});

test('the guest steers its fighter through the host, and sees the host world', () => {
  const game = pair();
  ready(game);
  game.host.start();
  game.net.flush();
  game.tick(2.6);
  assert.equal(game.hostSession.state, 'playing');
  assert.equal(game.guestSession.state, 'playing');
  game.guestSession.keyDown('KeyW');
  game.guestSession.localFaceYaw = 2;
  game.tick(1);
  const authority = game.hostSession.world.players[1], replica = game.guestSession.world.players[1];
  assert.ok(authority.stamina < 200, 'host simulated the guest input');
  assert.ok(Math.abs(authority.bodyYaw - 2) < 0.6 || Math.abs(authority.bodyYaw - Math.PI) > 0.5, 'guest view turns its body');
  assert.ok(Math.hypot(replica.p.x - authority.p.x, replica.p.z - authority.p.z) < 1.5, 'replica follows within interpolation delay');
  assert.equal(game.guestSession.world.players[0].health, game.hostSession.world.players[0].health);
});

test('a guest skill tap is never lost, even if a newer input arrives first', () => {
  const game = pair();
  ready(game, { characterId: 'naiwa', weaponId: 'yellow-staff' }, { characterId: 'happy-cat', weaponId: 'happy-paws' });
  game.host.start();
  game.net.flush();
  game.tick(4.6);
  game.host.receive({ type: 'input', theta: 0, phi: 0, skillTap: true });
  game.host.receive({ type: 'input', theta: 0, phi: 0 });
  assert.equal(game.hostSession.remoteInput.skillTap, true);
  game.tick(0.1);
  assert.equal(game.hostSession.world.players[1].skillActive, true);
  assert.equal(game.hostSession.remoteInput.skillTap, undefined, 'consumed by one step');
});

test('remote input is bounded before it reaches the simulation', () => {
  assert.deepEqual(sanitizeInput({ theta: 5, phi: -9, faceYaw: 'x', skill: 1, extra: 3 }), { theta: 1, phi: -1 });
  assert.deepEqual(sanitizeInput({ theta: 0, phi: 0, skillTap: 1, faceYaw: 2 }), { theta: 0, phi: 0, skillTap: true, faceYaw: 2 });
  assert.deepEqual(sanitizeInput(null), { theta: 0, phi: 0 });
});

test('the host picks the arena; the guest follows it, also at the start of a round', () => {
  const game = pair();
  game.host.setArena('colosseum');
  game.net.flush();
  assert.equal(game.guestSession.arenaSkin, 'colosseum');
  game.guest.setArena?.('lakeside');
  game.net.flush();
  assert.equal(game.hostSession.arenaSkin, 'colosseum', 'the guest cannot change it');
  game.guestSession.arenaSkin = 'courtyard';
  ready(game);
  game.host.start();
  game.net.flush();
  assert.equal(game.guestSession.arenaSkin, 'colosseum');
});

test('thrown takeouts and skill cooldowns replicate; a teleport is shown as a jump, not a slide', () => {
  const game = pair();
  ready(game, { characterId: 'dudu', weaponId: 'takeout-box' }, { characterId: 'stickman', weaponId: 'sword' });
  game.host.start();
  game.net.flush();
  game.tick(4.6);
  game.hostSession.keyDown('KeyF');
  game.tick(0.15);
  assert.equal(game.guestSession.world.projectiles.length, 1, 'the guest sees the takeout in flight');
  assert.ok(game.guestSession.world.players[0].skillCooldown > 6);
  game.tick(1.5);
  const events = [];
  const impact = game.guestSession.impact.bind(game.guestSession);
  game.guestSession.impact = event => { events.push(event); impact(event); };
  game.guestSession.keyDown('KeyF');
  game.tick(0.3);
  const authority = game.hostSession.world.players[1], replica = game.guestSession.world.players[1];
  assert.ok(events.some(event => event.type === 'skill' && event.skill === 'twist'), 'the guest hears its own skill');
  assert.ok(Math.hypot(replica.p.x - authority.p.x, replica.p.z - authority.p.z) < 0.3, 'the replica jumped with the teleport');
});

test('hits replay on the guest, rematch needs both players, and leaving closes both ends', () => {
  const game = pair();
  ready(game);
  game.host.start();
  game.net.flush();
  game.tick(2.6);
  const events = [];
  const impact = game.guestSession.impact.bind(game.guestSession);
  game.guestSession.impact = event => { events.push(event); impact(event); };
  game.hostSession.world.players[1].health = 1;
  game.hostSession.world.winner = 0;
  game.hostSession.finishRound();
  game.host.afterTick(0, [{ type: 'hit', point: { x: 0, y: 1, z: 0 }, attacker: 0, target: 1, damage: 9, speed: 4, acceleration: 0, turnShare: 0, strength: 0.3 }]);
  game.tick(0.3);
  assert.equal(events.length, 1);
  assert.equal(game.guestSession.state, 'result');
  assert.equal(game.guestSession.world.winner, 0);
  game.guest.requestRematch();
  game.net.flush();
  assert.equal(game.hostSession.state, 'result', 'one vote is not enough');
  game.host.requestRematch();
  game.net.flush();
  assert.equal(game.hostSession.state, 'countdown');
  assert.equal(game.guestSession.state, 'countdown');
  game.guest.leave();
  game.net.flush();
  assert.equal(game.host.phase, 'closed');
  assert.match(game.host.message, /离开/);
});

test('reordered or lost snapshots never step the guest back, and their events still play', () => {
  const game = pair();
  ready(game);
  game.host.start();
  game.net.flush();
  game.tick(2.6);
  const events = [];
  const impact = game.guestSession.impact.bind(game.guestSession);
  game.guestSession.impact = event => { events.push(event); impact(event); };
  const latest = game.guest.lastSeq;
  const stale = { type: 'snap', seq: latest - 5, state: 'playing', countdown: 0, countdownNumber: 0, time: 0, winner: null,
    players: game.hostSession.world.players.map(p => ({ p: { x: 99, y: 0, z: 99 }, v: { x: 0, y: 0, z: 0 } })), projectiles: [],
    events: [{ type: 'clash', point: { x: 0, y: 1, z: 0 }, strength: 0.2 }] };
  const buffered = game.guest.buffer.length;
  game.guest.receive(stale);
  assert.equal(game.guest.buffer.length, buffered, 'the stale state is dropped');
  game.tick(1 / 60, 1);
  assert.ok(events.some(event => event.type === 'clash'), 'the late event is replayed');
  assert.ok(Math.abs(game.guestSession.world.players[0].p.x) < 20, 'the world did not jump to the stale positions');
  // Drop every other snapshot: the replica still follows the host.
  const send = game.host.transport.send;
  let n = 0;
  game.host.transport.send = message => { if (message.type !== 'snap' || message.events.length || n++ % 2) send(message); };
  game.hostSession.keyDown('KeyW');
  game.tick(1);
  const authority = game.hostSession.world.players[0], replica = game.guestSession.world.players[0];
  assert.ok(Math.hypot(replica.p.x - authority.p.x, replica.p.z - authority.p.z) < 1.5);
});

test('a plain snapshot fits in one unreliable Steam packet', () => {
  const game = pair();
  ready(game, { characterId: 'dudu', weaponId: 'takeout-box' }, { characterId: 'stickman', weaponId: 'sword' });
  game.host.start();
  game.net.flush();
  game.tick(4.6);
  game.hostSession.keyDown('KeyF');
  let largest = 0;
  const send = game.host.transport.send;
  game.host.transport.send = message => {
    if (message.type === 'snap' && !message.events.length) largest = Math.max(largest, Buffer.byteLength(JSON.stringify(message)));
    send(message);
  };
  game.tick(0.5);
  assert.ok(largest > 0 && largest < 1150, `snapshot is ${largest} bytes`);
});

test('a peer that drops mid-match closes the session with a reason', () => {
  const game = pair();
  ready(game);
  game.host.start();
  game.net.flush();
  game.tick(1);
  game.guest.closed('与对方的连接超时。');
  assert.equal(game.guest.phase, 'closed');
  assert.match(game.guest.message, /超时/);
  game.guest.send({ type: 'input', theta: 1, phi: 0 });
  assert.equal(game.net.queues[0].length, 0, 'a closed session sends nothing');
});

test('restored animal choices and rotor pose remain synchronized through the real host/guest protocol',()=>{
 const game=pair();ready(game,{characterId:'beagle',weaponId:'long-ears'},{characterId:'orange-tabby',weaponId:'cat-paws'});
 assert.ok(game.host.start());game.net.flush();game.tick(4.6);
 game.hostSession.keyDown('KeyF');game.guestSession.keyDown('KeyS');game.tick(1.2);
 const host=game.hostSession.world.players,guest=game.guestSession.world.players;
 assert.equal(guest[0].maxHealth,100);assert.equal(guest[1].maxHealth,100);assert.equal(guest[0].skillActive,true);
 assert.ok(guest[0].earSpread>.2);assert.ok(Math.abs(host[0].earSpread-guest[0].earSpread)<.3);
 assert.ok(guest[0].stamina<200&&guest[1].stamina<200);
 assert.equal(game.guestSession.loadouts[1].characterId,'orange-tabby');
 game.tick(5);assert.equal(guest[0].skillActive,false);assert.ok(guest[0].earSpread<.01);
});

test('CR7 ability, input mask, stow and release gate replicate to guest',()=>{
 const g=pair();ready(g,{characterId:'cr7',weaponId:'soccer-ball'},{characterId:'mean-girl',weaponId:'crowned-heart'});g.host.start();g.net.flush();g.tick(5);
 g.hostSession.world.players[0].grounded=true;g.hostSession.keyDown('KeyF');g.hostSession.keyDown('KeyW');g.tick(.7);
 assert.equal(g.hostSession.world.players[0].abilityPhase,'active');assert.equal(g.guestSession.world.players[0].abilityPhase,'active');assert.equal(g.guestSession.world.projectiles[0].type,'soccer');
 g.tick(3.3);assert.equal(g.guestSession.world.players[0].releaseGate,true);g.hostSession.keyUp('KeyW');g.tick(.2);assert.equal(g.guestSession.world.players[0].releaseGate,false);
});

test('either peer can activate both skills, including mirror matches',()=>{
 for(const characters of [['mean-girl','cr7'],['cr7','cr7'],['mean-girl','mean-girl']]){
  const g=pair(),choices=characters.map(characterId=>({characterId,weaponId:characterId==='cr7'?'soccer-ball':'crowned-heart'}));ready(g,...choices);g.host.start();g.net.flush();g.tick(5);
  for(const p of g.hostSession.world.players){p.grounded=true;p.p.x=p.id?8:-8;}
  g.hostSession.keyDown('KeyF');g.guestSession.keyDown('KeyF');g.guestSession.keyDown('KeyD');g.tick(.8);
  for(let id=0;id<2;id++){assert.equal(g.hostSession.world.players[id].abilityPhase,'active');assert.equal(g.guestSession.world.players[id].abilityPhase,'active');}
  assert.equal(g.guestSession.world.projectiles.filter(s=>s.type==='soccer').length,characters.filter(c=>c==='cr7').length);
  g.tick(3.5);assert.equal(g.guestSession.world.projectiles.length,0);assert(g.guestSession.world.players.every(p=>p.abilityPhase==='idle'));
 }
});

test('presentation packets wait for the render clock, replay late unique events once, and clear at rematch',()=>{
 const game=pair();ready(game);game.host.start();game.net.flush();game.tick(2.6);
 game.host.afterTick(1/60,[]);
 const template=game.net.queues[1].find(m=>m.type==='snap');assert.ok(template);
 game.net.queues[1].length=0;
 const received=[];game.guestSession.impact=e=>received.push(e);
 const latest=game.guest.lastSeq;
 const cue=stacks=>({type:'bleed-stack',source:'perfume',attacker:0,target:1,stacks,point:{x:1,y:1,z:0}});
 const message={...template,seq:latest+2,events:[cue(2)],players:template.players.map((p,i)=>({...p,bleedStacks:i?2:0}))};
 game.guest.receive(message);game.guest.receive(message);
 game.guest.replicaTick(.02);assert.equal(received.length,0,'future event waits for interpolated presentation time');
 assert.equal(game.guestSession.world.players[1].bleedStacks,0,'stack status waits for the same endpoint as its cue');
 game.guest.replicaTick(.031);assert.deepEqual(received,[cue(2)]);assert.equal(game.guestSession.world.players[1].bleedStacks,2);
 const late={...message,seq:latest+1,events:[cue(1)]};game.guest.receive(late);game.guest.receive(late);game.guest.replicaTick(0);
 assert.deepEqual(received,[cue(2),cue(1)]);assert.equal(game.guestSession.world.players[1].bleedStacks,2,'late event cannot roll status back');
 const oldSeq=message.seq;game.guest.on_start({loadouts:game.guestSession.loadouts,snapshotFloor:oldSeq});
 game.guest.receive(message);assert.equal(game.guest.inbox.length,0);assert.equal(game.guest.eventSequences.size,0);
 assert.deepEqual(game.guestSession.world.players.map(p=>p.bleedStacks),[0,0]);
});

test('discrete health and round outcomes reach their endpoint with cues while movement interpolates',()=>{
 const game=pair();ready(game);game.host.start();game.net.flush();game.tick(2.6);
 game.host.afterTick(1/60,[]);const template=game.net.queues[1].find(m=>m.type==='snap');assert.ok(template);
 game.net.queues[1].length=0;
 const before={...template,state:'playing',winner:null,players:template.players.map(p=>({...p,health:100,bleedStacks:0}))};
 const after={...before,state:'result',winner:0,players:before.players.map((p,i)=>({...p,health:i?0:100,bleedStacks:i?2:0,p:{...p.p,x:p.p.x+1}}))};
 game.guest.applySnapshot(before,after,.5);
 assert.equal(game.guestSession.world.players[1].health,100);
 assert.equal(game.guestSession.world.players[1].bleedStacks,0);
 assert.equal(game.guestSession.world.winner,null);assert.equal(game.guestSession.state,'playing');
 assert.equal(game.guestSession.world.players[1].p.x,before.players[1].p.x+.5);
 game.guest.applySnapshot(before,after,1);
 assert.equal(game.guestSession.world.players[1].health,0);
 assert.equal(game.guestSession.world.players[1].bleedStacks,2);
 assert.equal(game.guestSession.world.winner,0);assert.equal(game.guestSession.state,'result');
 assert.equal(game.guestSession.world.players[1].p.x,after.players[1].p.x);
});

test('presentation dedup and pending event queues are bounded',()=>{
 const game=pair();ready(game);game.host.start();game.net.flush();
 game.host.afterTick(1/60,[]);const template=game.net.queues[1].find(m=>m.type==='snap');assert.ok(template);
 const start=game.guest.lastSeq;
 for(let i=1;i<=4200;i++)game.guest.on_snap({...template,seq:start+i,events:[{type:'growth'}]});
 assert.equal(game.guest.eventSequences.size,4096);assert.equal(game.guest.inbox.length,120);
 const pending=game.guest.inbox.length;game.guest.on_snap({...template,seq:start+1,events:[{type:'growth'}]});assert.equal(game.guest.inbox.length,pending);
 game.guest.closed();assert.equal(game.guest.inbox.length,0);assert.equal(game.guest.eventSequences.size,0);
});

test('both peers respect the two-second opening skill lock and early taps are discarded',()=>{
 const game=pair();ready(game,{characterId:'maodie',weaponId:'maodie-paw'},{characterId:'mean-girl',weaponId:'crowned-heart'});
 game.host.start();game.net.flush();game.tick(2.6);
 assert.equal(game.hostSession.state,'playing');assert(game.hostSession.world.roundTime<2);
 game.hostSession.keyDown('KeyF');game.guestSession.keyDown('KeyF');game.tick(.1);
 for(const p of game.hostSession.world.players)assert.equal(p.skillCooldown,0);
 game.tick(2.1);for(const p of game.hostSession.world.players)assert.equal(p.skillCooldown,0);
 for(const session of [game.hostSession,game.guestSession]){session.keyUp('KeyF');session.keyDown('KeyF');}
 game.tick(.2);for(const p of game.hostSession.world.players)assert(p.skillCooldown>0);
 game.tick(.1);for(const p of game.guestSession.world.players)assert(p.skillCooldown>0);
});


test('CR7 instant activation blocks same-step damage and replicates one ball for either peer',()=>{
 for(const owner of [0,1]){
  const g=pair(),cr7={characterId:'cr7',weaponId:'soccer-ball'},dudu={characterId:'dudu',weaponId:'takeout-box'};
  ready(g,...(owner===0?[cr7,dudu]:[dudu,cr7]));g.host.start();g.net.flush();g.tick(5);
  const w=g.hostSession.world,p=w.players[owner];
  for(const q of w.players){q.p.x=q.id?8:-8;q.grounded=true;}
  const controlling=owner===0?g.hostSession:g.guestSession;
  controlling.keyDown('KeyF');
  // Deliver guest input before the next host physics step, as in a real accepted activation.
  if(owner===1){g.guest.replicaTick(1/60);g.net.flush();}
  w.projectiles.push({id:99,owner:1-owner,p:{...p.p,x:p.p.x-.3},v:{x:18,y:0,z:0},radius:.55,damage:8,life:2,spin:0});
  g.tick(.15);
  assert.equal(p.abilityPhase,'active');assert.equal(p.health,100);
  assert.equal(g.guestSession.world.players[owner].health,100);
  assert.equal(g.guestSession.world.players[owner].abilityPhase,'active');
  for(const world of [w,g.guestSession.world])assert.equal(world.projectiles.filter(s=>s.type==='soccer'&&s.owner===owner).length,1);
 }
});
