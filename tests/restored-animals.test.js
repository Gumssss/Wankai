import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,PerspectiveCamera} from 'three';
import {ArenaPhysics,makePlayer,weaponSegments,visualWeaponSegments,weaponPointFrame,staffFrame,fighterHeading,isAnatomical,CONFIG,v3} from '../src/physics.js';
import {PLAYABLE_LOADOUTS,canEquip,resolveLoadout} from '../src/loadouts.js';
import {buildCharacter} from '../src/models/characters.js';
import {preloadAnimalModels,animalAssetStatus} from '../src/models/restored-animals.js';
import {disposeObject} from '../src/models/toy-kit.js';
import {BEAGLE} from '../src/beagle-profile.js';
import {CAT,CAT_PAW_SCALE} from '../src/orange-tabby-profile.js';
import {quietSession,sandbox} from './sandbox.js';
import {createFreeCameraRig,updateFreeCamera} from '../src/free-camera.js';
await preloadAnimalModels();
const dog={characterId:'beagle',weaponId:'long-ears'},cat={characterId:'orange-tabby',weaponId:'cat-paws'};
const refresh=r=>{r.updateMatrixWorld(true);r.traverse(o=>o.skeleton?.update());};
const tick=(w,input,seconds)=>{for(let i=0;i<Math.round(seconds/CONFIG.step);i++)w.step([input,{}]);};
const point=q=>new Vector3(q.x,q.y,q.z);

test('both accepted animals extend the current roster without replacing happy cat',()=>{
 assert.equal(PLAYABLE_LOADOUTS.filter(p=>!['cr7','mean-girl','maodie'].includes(p.characterId)).length,35);
 assert.ok(canEquip('happy-cat','happy-paws'));
 for(const w of ['sword','polearm','hammer','axe','mace','pan','long-ears'])assert.ok(canEquip('beagle',w));
 for(const c of ['naiwa','dudu','stickman','happy-cat','orange-tabby'])assert.equal(canEquip(c,'long-ears'),false);
 assert.ok(canEquip('orange-tabby','cat-paws'));assert.equal(canEquip('happy-cat','cat-paws'),false);
 assert.equal(resolveLoadout({characterId:'beagle',weaponId:'sword'}).skill,null);
 assert.equal(resolveLoadout(dog).skill.id,'rotor');assert.equal(resolveLoadout(cat).skill,null);
 assert.ok(Object.values(animalAssetStatus()).every(s=>s==='ready'));
});

test('restored health, paw size and distal ear solids are retained',()=>{
 assert.equal(makePlayer(0,dog).maxHealth,80);assert.equal(makePlayer(0,cat).maxHealth,150);
 assert.equal(makePlayer(0,{characterId:'beagle',weaponId:'sword'}).health,80);
 assert.equal(CAT_PAW_SCALE,1.3);
 const p=makePlayer(0,dog);assert.equal(weaponSegments(p).length,12);assert.equal(visualWeaponSegments(p).length,18);
 for(const s of BEAGLE.colliders){assert.ok(s.a[1]-s.radius>=1.8-1e-6);assert.ok(s.b[1]+s.radius<=3.6+1e-6);}
 assert.equal(weaponSegments(makePlayer(0,cat)).length,48);
});

test('real Beagle skinning follows each anchored contact frame through strokes and rotor spread',()=>{
 const p=makePlayer(0,dog),built=buildCharacter(dog);p.theta=BEAGLE.earBindPitch;p.p=v3(0,BEAGLE.bodyFloor,0);
 built.root.position.copy(point(p.p));built.pose(p,0);refresh(built.root);
 const samples={};
 for(const side of ['L','R']){
  const mesh=built.instance.model.getObjectByName('SM_Beagle_'+side+'_Ear'),a=BEAGLE.anchors[side];
  const socket=new Vector3(a[0],a[1]+BEAGLE.bodyFloor,a[2]);
  samples[side]={mesh,local:Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld).sub(socket).applyAxisAngle(new Vector3(0,0,1),BEAGLE.earBindPitch))};
 }
 for(const earSpread of [0,.7,Math.PI/2])for(const theta of [-1.55,.4,Math.PI/2,Math.PI])for(const phi of [0,.8]){
  Object.assign(p,{earSpread,theta,phi});p.p=v3(.4,3,-.7);built.root.position.copy(point(p.p));built.root.rotation.y=-fighterHeading(p);built.pose(p,1);refresh(built.root);
  for(const side of ['L','R'])for(let i=0;i<samples[side].local.length;i+=61){
   const actual=samples[side].mesh.getVertexPosition(i,new Vector3()).applyMatrix4(samples[side].mesh.matrixWorld);
   const expected=weaponPointFrame(p,samples[side].local[i],BEAGLE.anchors[side]).point;
   assert.ok(actual.distanceTo(point(expected))<5e-6,'ear mesh/contact alignment');
  }
 }
});

test('actual scaled Cat paw vertices match contacts through all pitch/yaw extremes',()=>{
 const p=makePlayer(0,cat),built=buildCharacter(cat);p.p=v3(0,CAT.bodyFloor,0);p.theta=Math.PI/2;
 built.root.position.copy(point(p.p));built.pose(p,0);refresh(built.root);
 const samples=['L','R'].map(side=>{const mesh=built.instance.model.getObjectByName('SM_Paw_'+side);return {mesh,local:Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>{const q=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);return v3(-q.y,q.x,q.z);})};});
 for(const theta of [-Math.PI,-.8,Math.PI/2,Math.PI])for(const phi of [-2,0,.7]){
  Object.assign(p,{theta,phi});p.p=v3(.4,3,-.7);built.root.position.copy(point(p.p));built.root.rotation.y=-fighterHeading(p);built.pose(p,0);refresh(built.root);
  for(const {mesh,local}of samples)for(let i=0;i<local.length;i+=61){
   const actual=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);
   assert.ok(actual.distanceTo(point(weaponPointFrame(p,local[i]).point))<5e-6,'paw mesh/contact alignment');
  }
 }
});

test('instances own bones/materials, and disposing a preview cannot destroy another instance',()=>{
 for(const l of [dog,cat,{characterId:'beagle',weaponId:'sword'}]){
  const a=buildCharacter(l,0),b=buildCharacter(l,1);
  for(const m of a.kit.materials)assert.ok(!b.kit.materials.includes(m));
  if(l.weaponId==='long-ears')assert.notEqual(a.instance.bones.L_ear_swing,b.instance.bones.L_ear_swing);
  const shared=[];a.root.traverse(o=>{if(o.isMesh)shared.push(o.geometry);});let disposed=0;
  shared.forEach(g=>g.addEventListener('dispose',()=>disposed++));disposeObject(a.root);assert.equal(disposed,0);
  assert.equal(b.root.userData.assetReady,true);
 }
});

test('complete normal input matrix, release and reversal remain finite and physical',()=>{
 for(const l of [dog,cat])for(const [theta,phi]of [[1,0],[-1,0],[0,-1],[0,1],[1,-1],[1,1],[-1,-1],[-1,1]]){
  const w=sandbox(new ArenaPhysics(),l),p=w.players[0];tick(w,{theta,phi},.75);
  assert.ok(p.stamina<200);for(const n of [p.p.x,p.p.y,p.p.z,p.theta,p.phi,p.wt,p.wp])assert.ok(Number.isFinite(n));
  const before=p.stamina;tick(w,{},.05);assert.ok(p.stamina<=before+.001);tick(w,{theta:-theta,phi:-phi},.5);
 }
 const w=sandbox(new ArenaPhysics(),cat);let peak=w.players[0].p.y;for(let i=0;i<720;i++){w.step([{theta:-1}]);peak=Math.max(peak,w.players[0].p.y);}
 assert.ok(peak>CAT.bodyFloor+CAT.hoverHeight+.3,'paw-floor support visibly raises the body');
});

test('rotor spends stamina, does not retrigger/regen, expires, retracts and lands',()=>{
 const w=sandbox(new ArenaPhysics(),dog),p=w.players[0];w.step([{skillTap:true}]);assert.ok(p.skillActive);
 tick(w,{phi:1},1);const before=p.stamina;tick(w,{phi:-1},1);assert.ok(p.stamina<before);assert.ok(p.skillActive);
 tick(w,{},4);assert.equal(p.skillActive,false);tick(w,{},5);assert.ok(p.earSpread<.001);assert.ok(p.p.y<BEAGLE.bodyFloor+.1);
 w.reset(dog,'polearm',{fighters:1});
 const tired=w.players[0];tired.stamina=39;w.step([{skillTap:true}]);assert.equal(tired.skillActive,false);
 for(const l of [cat,{characterId:'beagle',weaponId:'sword'}]){const other=sandbox(new ArenaPhysics(),l);other.step([{skillTap:true}]);assert.equal(other.players[0].skillActive,false);}
});

test('anatomical steering turns body and attachments together while common weapons retain mouse-facing bodies',()=>{
 for(const l of [dog,cat]){const w=sandbox(new ArenaPhysics(),l),p=w.players[0];tick(w,{theta:1,phi:1,faceYaw:-2},.5);assert.equal(fighterHeading(p),p.phi);}
 const p=makePlayer(0,{characterId:'beagle',weaponId:'sword'});p.bodyYaw=1.5;p.phi=-1;assert.equal(fighterHeading(p),1.5);assert.equal(isAnatomical(p),false);
});

test('follow cameras fit both complete appendages, including cosmetic inner ears',()=>{
 for(const l of [dog,cat])for(const aspect of [.65,1.6])for(const theta of [-1.55,Math.PI/2,Math.PI]){
  const p=makePlayer(0,l);p.theta=theta;p.earSpread=Math.PI/2;const rig=createFreeCameraRig(new PerspectiveCamera(55,aspect,.1,120));updateFreeCamera(rig,p,0);
  for(const s of visualWeaponSegments(p))for(const q of [s.a,s.b]){const v=point(q).project(rig.camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1&&v.z<1,'full appendage stays in view');}
 }
});

test('session reset and pause preserve restored loadouts and clear skill state',()=>{
 const s=quietSession();assert.ok(s.setLoadouts([dog,cat]));s.startRound('ai');for(let i=0;i<200;i++)s.tick(1/60);
 s.keyDown('KeyF');s.tick(1/60);assert.ok(s.world.players[0].skillActive);s.pause();const t=s.world.time;s.tick(1);assert.equal(s.world.time,t);
 s.startRound('ai');assert.deepEqual(s.loadouts,[dog,cat]);assert.equal(s.world.players[0].health,80);assert.equal(s.world.players[1].health,150);assert.equal(s.world.players[0].earSpread,0);
});

test('restored paired motors fatigue together and share one ordinary resource budget',()=>{
 for(const l of [dog,cat]){
  const worlds=[200,0].map(stamina=>{const w=sandbox(new ArenaPhysics(),l);Object.assign(w.players[0],{stamina,p:v3(0,1000,0),theta:0});tick(w,{theta:1,phi:1},.1);return w;});
  assert.ok(Math.abs(worlds[1].players[0].wt)<Math.abs(worlds[0].players[0].wt));
  assert.ok(Math.abs(worlds[1].players[0].wp)<Math.abs(worlds[0].players[0].wp));
  assert.ok(Math.abs(worlds[0].players[0].stamina-198.3)<1e-8,'two appendages do not double charge');
 }
});
