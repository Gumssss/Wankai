import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLoadout,resolveLoadout,PLAYABLE_LOADOUTS,canEquip,isEarLoadout} from '../src/loadouts.js';
import {GameSession} from '../src/game-session.js';
import {ArenaPhysics,CONFIG,WEAPONS,weaponStats,weaponSegments,hurtSegments,closestSegments,v3} from '../src/physics.js';
import {BEAGLE_COMMON_OFFSETS} from '../src/character-attachments.js';
import {sandbox} from './sandbox.js';

const basic=weaponId=>({characterId:'basic-fighter',weaponId}),beagle=weaponId=>({characterId:'beagle',weaponId});
function session(){const game=new GameSession();for(const name of ['unlock','tick','tone','swing','impact'])game.sound[name]=()=>{};return game;}
test('separate catalogues expose twelve valid loadouts and enforce signature ownership',()=>{
 assert.equal(PLAYABLE_LOADOUTS.length,12);
 assert.deepEqual(normalizeLoadout('beagle'),beagle('long-ears'));
 assert.deepEqual(normalizeLoadout('sword'),basic('sword'));
 assert.equal(canEquip('basic-fighter','long-ears'),false);
 assert.equal(canEquip('beagle','long-ears'),true);
 assert.equal(canEquip('orange-tabby','cat-paws'),true);
 for(const c of ['basic-fighter','beagle','yellow-blob'])for(const w of ['sword','polearm','hammer'])assert.equal(canEquip(c,w),true);
 assert.equal(resolveLoadout(beagle('sword')).bodyModel,'beagle-smooth-appearance-v05.glb');
 assert.equal(resolveLoadout(beagle('long-ears')).bodyModel,'beagle-smooth-ear-duelist-v05.glb');
 assert.equal(resolveLoadout(beagle('sword')).skill,null);
});
test('lobby loadout commit validates both players atomically without leaking invalid drafts',()=>{
 const game=session(),before=game.getSnapshot();
 for(const value of [[beagle('sword'),basic('long-ears')],[beagle('hammer'),{characterId:'basic-fighter',weaponId:'cat-paws'}],[beagle('sword')]]){
  assert.equal(game.setLoadouts(value),false);assert.equal(game.getSnapshot(),before);
 }
 let notifications=0;game.subscribe(()=>notifications++);
 assert.equal(game.setLoadouts([beagle('sword'),basic('hammer')]),true);assert.equal(notifications,1);
 assert.deepEqual(game.getSnapshot().loadouts,[beagle('sword'),basic('hammer')]);
 const copy=game.getSnapshot().loadouts;assert.ok(Object.isFrozen(copy[0]),'snapshot selections cannot mutate session state');
 game.startRound('ai');const committed=game.getSnapshot().loadouts;
 assert.equal(game.setLoadouts([basic('polearm'),basic('sword')]),false);assert.deepEqual(game.getSnapshot().loadouts,committed);
});
test('All canonical pairings begin with separated weapons',()=>{
 for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const world=new ArenaPhysics();world.reset(first,second);
  const [a,b]=world.players;
  for(const x of weaponSegments(a))for(const y of weaponSegments(b))assert.ok(closestSegments(x.a,x.b,y.a,y.b).distance>x.radius+y.radius,JSON.stringify([first,second]));
 }
});
test('beagle body geometry is independent of ordinary weapon identity and has no long-ear weapon capsules',()=>{
 for(const id of ['sword','polearm','hammer']){
  const world=new ArenaPhysics();sandbox(world,beagle(id));const p=world.players[0];
  assert.equal(p.characterId,'beagle');assert.equal(hurtSegments(p).length,4);
  assert.equal(weaponSegments(p).length,WEAPONS[id].colliders.length);assert.ok(weaponSegments(p).every(s=>!s.anchor));
  assert.equal(weaponStats(p).offset,BEAGLE_COMMON_OFFSETS[id]);
  for(let i=0;i<360;i++)world.step([{theta:1,phi:i%2?1:-1,skill:true}],CONFIG.step);
  assert.equal(p.skillActive,false);assert.equal(p.earSpread,0);
  assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z));
  p.p=v3(world.arenaRadius+1,CONFIG.bodyFloor,0);world.solveBodyWall(p);
  for(const shape of hurtSegments(p))for(const q of [shape.a,shape.b])assert.ok(Math.hypot(q.x,q.z)+shape.radius<=world.arenaRadius+1e-6);
 }
});
test('skill input gates follow the complete loadout rather than the beagle character alone',()=>{
 const game=session();game.setLoadouts([beagle('sword'),beagle('long-ears')]);game.startRound('ai');game.state='playing';
 game.keyDown('KeyF');assert.equal(game.keys.has('KeyF'),false);assert.equal(game.world.players[0].skillRequested,false);
 game.setLoadouts;game.goHome();game.setLoadouts([beagle('long-ears'),beagle('sword')]);game.startRound('ai');game.state='playing';
 game.keyDown('KeyF');assert.equal(game.world.players[0].skillRequested,true);
 game.tick(1/60);assert.equal(game.world.players[0].skillActive,true);assert.equal(game.world.players[1].skillActive,false);
 assert.equal(isEarLoadout(game.world.players[0]),true);
});
