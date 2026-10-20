import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLoadout,resolveLoadout,PLAYABLE_LOADOUTS,canEquip,isEarLoadout} from '../src/loadouts.js';
import {GameSession} from '../src/game-session.js';
import {ArenaPhysics,CONFIG,WEAPONS,weaponStats,weaponSegments,hurtSegments,closestSegments,v3} from '../src/physics.js';
import {BEAGLE_COMMON_OFFSETS} from '../src/character-attachments.js';

const basic=weaponId=>({characterId:'basic-fighter',weaponId}),beagle=weaponId=>({characterId:'beagle',weaponId});
function session(){const game=new GameSession();for(const name of ['unlock','tick','tone','swing','impact'])game.sound[name]=()=>{};return game;}
test('separate catalogues expose eight valid loadouts and enforce signature ownership',()=>{
 assert.equal(PLAYABLE_LOADOUTS.length,8);
 assert.deepEqual(normalizeLoadout('beagle'),beagle('long-ears'));
 assert.deepEqual(normalizeLoadout('sword'),basic('sword'));
 assert.equal(canEquip('basic-fighter','long-ears'),false);
 assert.equal(canEquip('beagle','long-ears'),true);
 assert.equal(canEquip('orange-tabby','cat-paws'),true);
 for(const c of ['basic-fighter','beagle'])for(const w of ['sword','polearm','hammer'])assert.equal(canEquip(c,w),true);
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
 game.startRound('duel');const committed=game.getSnapshot().loadouts;
 assert.equal(game.setLoadouts([basic('polearm'),basic('sword')]),false);assert.deepEqual(game.getSnapshot().loadouts,committed);
});
test('64 canonical pairings retain character and weapon choices through all modes and resets',()=>{
 for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const game=session();assert.equal(game.setLoadouts([first,second]),true);
  for(const mode of ['solo','practice','duel-fixed','duel']){
   game.startRound(mode);
   assert.deepEqual(game.world.players.map(p=>({characterId:p.characterId,weaponId:p.weapon})),mode==='solo'?[first]:[first,second]);
   game.pause();game.resume();game.startRound();game.goHome();assert.deepEqual(game.getSnapshot().loadouts,[first,second]);
  }
  game.world.reset(false,false,first,second);
  const [a,b]=game.world.players;
  for(const x of weaponSegments(a))for(const y of weaponSegments(b))assert.ok(closestSegments(x.a,x.b,y.a,y.b).distance>x.radius+y.radius,JSON.stringify([first,second]));
 }
});
test('beagle body geometry is independent of ordinary weapon identity and has no long-ear weapon capsules',()=>{
 for(const id of ['sword','polearm','hammer']){
  const world=new ArenaPhysics();world.reset(false,true,beagle(id));const p=world.players[0];
  assert.equal(p.characterId,'beagle');assert.equal(hurtSegments(p).length,4);
  assert.equal(weaponSegments(p).length,WEAPONS[id].colliders.length);assert.ok(weaponSegments(p).every(s=>!s.anchor));
  assert.equal(weaponStats(p).offset,BEAGLE_COMMON_OFFSETS[id]);
  for(let i=0;i<360;i++)world.step([{theta:1,phi:i%2?1:-1,skill:true}],CONFIG.step);
  assert.equal(p.skillActive,false);assert.equal(p.earSpread,0);assert.equal(p.bodyPitch,0);
  assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z));
  p.p=v3(world.arenaRadius+1,CONFIG.bodyFloor,0);world.solveBodyWall(p);
  for(const shape of hurtSegments(p))for(const q of [shape.a,shape.b])assert.ok(Math.hypot(q.x,q.z)+shape.radius<=world.arenaRadius+1e-6);
 }
});
test('skill input gates follow the complete loadout rather than the beagle character alone',()=>{
 const game=session();game.setLoadouts([beagle('sword'),beagle('long-ears')]);game.startRound('duel');game.state='playing';
 game.keyDown('KeyF');assert.equal(game.keys.has('KeyF'),false);assert.equal(game.world.players[0].skillRequested,false);
 game.keyDown('ShiftRight');assert.equal(game.world.players[1].skillRequested,true);
 game.tick(1/60);assert.equal(game.world.players[1].skillActive,true);assert.equal(game.world.players[0].skillActive,false);
 assert.equal(isEarLoadout(game.world.players[1]),true);
});
test('all 64 mixed-character matchups stay finite, bounded and within resource limits under combined controls and skills',()=>{
 for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const world=new ArenaPhysics();world.reset(false,false,first,second,3);
  for(let tick=0;tick<360;tick++){
   world.step([{theta:tick<180?1:-1,phi:tick%120<60?1:-1,skill:tick<180},{theta:tick<120?-1:1,phi:tick%90<45?-1:1,skill:tick<180}]);
   for(const p of world.players){
    assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z+p.wt+p.wp));assert.ok(p.stamina>=0&&p.stamina<=200);assert.ok(p.health>=0&&p.health<=100);assert.ok(p.p.y>=CONFIG.bodyFloor-1e-8);
    for(const s of hurtSegments(p))for(const q of [s.a,s.b])assert.ok(Math.hypot(q.x,q.z)+s.radius<world.arenaRadius+.02);
    if(!isEarLoadout(p)){assert.equal(p.skillActive,false);assert.equal(p.earSpread,0);}
   }
  }
 }
});
