import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3,Group} from 'three';
import {BEAGLE} from '../src/beagle-profile.js';
import {CAT,CAT_PAW_TRANSFORMS,transformCatPawPoint} from '../src/orange-tabby-profile.js';
import {instantiateOrangeTabby,poseOrangeTabby} from '../src/orange-tabby-model.js';
import {makeBeagleFallback} from '../src/beagle-model.js';
import {ArenaPhysics,CONFIG,makePlayer,weaponSegments,weaponPointFrame,closestSegments,v3} from '../src/physics.js';
import {loadGeometry} from '../scripts/preview/model-geometry.mjs';
import {PLAYABLE_LOADOUTS} from '../src/loadouts.js';
import {GameSession} from '../src/game-session.js';
import {updateRound} from '../src/round-rules.js';
import {playerDisplayName,damageOwnerLabel} from '../src/player-identity.js';
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const cat={characterId:'orange-tabby',weaponId:'cat-paws'};

test('distal ear capsules contain their caps within 1.8–3.6; fallback retains full ears',()=>{
 assert.equal(BEAGLE.colliders.length,12);assert.equal(BEAGLE.visualColliders.length,18);
 for(const s of BEAGLE.colliders){assert.ok(Math.min(s.a[1],s.b[1])-s.radius>=1.8-1e-10);assert.ok(Math.max(s.a[1],s.b[1])+s.radius<=3.6+1e-10);}
 const fallback=makeBeagleFallback();for(const side of ['L','R'])assert.equal(fallback.hinges[side].children.length,9);
});

test('inner-ear passes cannot hit or clash, while distal contacts do, including deployed rotor',()=>{
 for(const spread of [0,.8,Math.PI/2])for(const distal of [false,true])for(const clash of [false,true]){
  const w=new ArenaPhysics();w.reset(false,false,'beagle','sword');const [a,b]=w.players;
  Object.assign(a,{p:v3(0,10,0),theta:1.2,phi:.4,earSpread:spread,earLag:.03,skillActive:spread>0,wt:4,wp:3});
  const s=BEAGLE.colliders[3],local=distal?v3(...s.b):v3(s.a[0],1,s.a[2]),f=weaponPointFrame(a,local,s.anchor);
  const speed=Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z),normal=v3(f.velocity.x/speed,f.velocity.y/speed,f.velocity.z/speed);
  const radius=.04,gap=distal?s.radius+radius-.008:0;
  b.p=v3(f.point.x+normal.x*gap,f.point.y+normal.y*gap,f.point.z+normal.z*gap);
  const target=()=>({a:{...b.p},b:{...b.p},localA:v3(),localB:v3(),radius});
  w.combat.physics={...w.combat.physics,
   hurtSegments:p=>p.id===1?[target()]:[],
   weaponSegments:p=>p.id===0?weaponSegments(p):(clash?[target()]:[])};
  if(clash)w.solveStaffClash(CONFIG.step);else w.solveAttack(a,b,CONFIG.step);
  assert.equal(w.events.some(e=>e.type===(clash?'clash':'hit')),distal,`spread=${spread}, distal=${distal}, clash=${clash}`);
 }
});

test('ground and rim use only active ear geometry in ordinary and rotor frames',()=>{
 for(const earSpread of [0,Math.PI/2]){
  const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];p.earSpread=earSpread;
  const sampled=[];w.solveWeaponGroundPoint=(_,s)=>sampled.push(s);w.solveStaffGround(p,CONFIG.step);
  assert.equal(sampled.length,24);for(const s of sampled)assert.ok(s.local.y-s.radius>=1.8-1e-10);
  // The proximal visual ear alone crosses this raised rim; distal ends lie
  // above it. No weapon impulse may arise from that visible inner section.
  p.p=v3(w.arenaRadius-.2,2,0);p.theta=0;p.phi=0;p.v=v3();p.wt=p.wp=0;
  w.arenaRimHeight=3.8;w.solveBodyWall=()=>{};
  const before=JSON.stringify([p.v,p.wt,p.wp]);w.solveWall(p,CONFIG.step);
  assert.equal(JSON.stringify([p.v,p.wt,p.wp]),before);
 }
});

test('actual paw meshes use 1.3x original dimensions, clear floor/body, leave source and body unchanged',async()=>{
 const source=await loadGeometry(new URL('../public/models/'+CAT.model,import.meta.url));source.updateMatrixWorld(true);
 const instance=instantiateOrangeTabby(source),other=instantiateOrangeTabby(source,1),outer=new Group();outer.add(instance.host);
 outer.position.y=CAT.bodyFloor+CAT.hoverHeight;poseOrangeTabby(instance,{theta:CAT.restTheta});outer.updateMatrixWorld(true);
 for(const side of ['L','R']){
  const raw=new Box3().setFromObject(source.getObjectByName('SM_Paw_'+side)),box=new Box3().setFromObject(instance.model.getObjectByName('SM_Paw_'+side));
  const rawSize=raw.getSize(new Vector3()),size=box.getSize(new Vector3());
  for(const axis of ['x','y','z'])near(size[axis],rawSize[axis]*1.3);
  near(box.min.y,.02);near(side==='L'?-box.max.z:box.min.z,.5733+.08);
  const {center,size:measured}=CAT_PAW_TRANSFORMS[side];raw.getCenter(new Vector3()).toArray().forEach((v,i)=>near(v,center[i]));rawSize.toArray().forEach((v,i)=>near(v,measured[i]));
  assert.notEqual(instance.controls[side].children[0],other.controls[side].children[0]);
 }
 near(instance.host.position.y,-CAT.bodyFloor);near(CAT.hoverHeight,.35);
 const bodyA=new Box3().setFromObject(source.getObjectByName('SM_Body')),bodyB=new Box3().setFromObject(instance.model.getObjectByName('SM_Body'));
 bodyB.translate(new Vector3(0,-CAT.hoverHeight,0));near(bodyA.min.distanceTo(bodyB.min),0);near(bodyA.max.distanceTo(bodyB.max),0);
 assert.equal(source.getObjectByName('PawScale_L'),undefined);
});

test('paw contact centers/radii use the same affine map as neutral mesh and trails',async()=>{
 const fit=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../assets/concepts/orange-tabby/prepared-v02/contact-fit.json',import.meta.url)));
 for(const [i,s]of fit.colliders.entries()){
  assert.deepEqual(CAT.colliders[i].a,transformCatPawPoint(s.a,CAT.colliders[i].side));near(CAT.colliders[i].radius,s.radius*1.3);
 }
 near(CAT.contactUndercoverage,.14*1.3);
});

test('all Beagle loadouts reset to 80; Cat resets/heals to 150; proportional pressure and timeout use maxima',()=>{
 for(const selection of PLAYABLE_LOADOUTS){const p=makePlayer(0,selection);if(selection.characterId==='beagle')assert.equal(p.health,80);if(selection.characterId==='orange-tabby')assert.equal(p.health,150);}
 for(const selection of [{characterId:'beagle',weaponId:'long-ears'},cat]){
  const w=new ArenaPhysics();w.reset(true,false,'sword',selection);const p=w.players[1];p.health=1;w.time=3;w.step([{},{}]);assert.equal(p.health,p.maxHealth);
  w.reset(false,false,selection,'sword');w.time=100;w.players.forEach(p=>{p.zoneOutside=3;p.p=v3(17,4,0);});
  updateRound(w,.5);near(w.players[0].health/w.players[0].maxHealth,.95);assert.equal(w.events.length,0);assert.equal(w.lastHit,null);
  w.reset(false,false,selection,'sword');w.players[0].health=w.players[0].maxHealth*.5;w.players[1].health=50;w.time=120;updateRound(w,0);assert.equal(w.winner,-1);
 }
});

test('shared names distinguish same-character players and keep selected dummy identity',()=>{
 assert.equal(playerDisplayName(0,cat),'P1 · 橘猫');assert.equal(playerDisplayName(1,cat),'P2 · 橘猫');
 assert.equal(playerDisplayName(1,cat,true),'P2 · 橘猫 木桩');
 assert.equal(damageOwnerLabel(1),'P2');assert.equal(damageOwnerLabel(null),'环境');
});

test('trades preserve attacker/target IDs, independent timers, pause, and rematch reset',()=>{
 const game=new GameSession();for(const method of ['unlock','tick','swing','impact','tone'])game.sound[method]=()=>{};
 game.setLoadouts([cat,cat]);game.startRound();game.state='playing';
 const hit={type:'hit',strength:.5,damage:15,point:v3(),speed:4,acceleration:0,turnShare:0};
 game.impact({...hit,attacker:0,target:1});game.freeze=10;game.tick(.05);
 game.impact({...hit,attacker:1,target:0});let snapshot=game.getSnapshot();
 assert.deepEqual(snapshot.effects.map(e=>[e.attacker,e.target]),[[0,1],[1,0]]);
 assert.deepEqual(snapshot.readouts.map(r=>[r.attacker,r.target]),[[0,1],[1,0]]);assert.equal(snapshot.readout.attacker,1);
 assert.ok(game.readoutTimers[0]<game.readoutTimers[1]);game.pause();const timers=[...game.readoutTimers];game.tick(.05);assert.deepEqual(game.readoutTimers,timers);
 game.resume();game.readoutTimers[0]=.01;game.tick(.05);snapshot=game.getSnapshot();assert.equal(snapshot.readouts[0],null);assert.ok(snapshot.readouts[1]);
 game.startRound();assert.deepEqual(game.getSnapshot().readouts,[null,null]);assert.deepEqual(game.getSnapshot().effects,[]);assert.equal(game.getSnapshot().readout,null);
 game.goHome();assert.deepEqual(game.readoutTimers,[0,0]);
});
