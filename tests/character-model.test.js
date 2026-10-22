import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {loadGeometry} from '../scripts/preview/model-geometry.mjs';
import {instantiateBeagle,poseBeagle,makeBeagleFallback} from '../src/beagle-model.js';
import {createWeaponModel} from '../src/model-assets.js';
import {makePlayer,weaponPointFrame,v3,weaponStats,weaponSegments} from '../src/physics.js';
import {setWeaponRotation} from '../src/weapon-visuals.js';
const root=new URL('../',import.meta.url),body=loadGeometry(new URL('public/models/beagle-smooth-appearance-v05.glb',root));
test('the compact Tripo body preserves its natural ears independent of weapon pitch and independent player materials',async()=>{
 const source=await body,a=instantiateBeagle(source,0,{rigged:false}),b=instantiateBeagle(source,1,{rigged:false});
 const mesh=a.model.getObjectByName('tripo_part_1'),before=mesh.geometry.attributes.position.array.slice();
 for(const theta of [-Math.PI,-1.55,0,Math.PI/2,Math.PI])poseBeagle(a,{theta,hitFlash:0},1);
 assert.deepEqual(mesh.geometry.attributes.position.array,before);assert.equal(Object.keys(a.bones).length,0);
 assert.notEqual(a.materials[0],b.materials[0]);
 assert.notDeepEqual(a.materials.find(m=>m.name==='MAT_Player_Accent').color,b.materials.find(m=>m.name==='MAT_Player_Accent').color);
 const beforeB=b.materials.map(m=>m.color.clone()),accent=a.materials.find(m=>m.name==='MAT_Player_Accent'),beforeAccent=accent.color.clone();
 poseBeagle(a,{hitFlash:1});assert.notDeepEqual(accent.color,beforeAccent);assert.deepEqual(b.materials.map(m=>m.color),beforeB);
 assert.equal(Object.keys(makeBeagleFallback(0,false).hinges).length,0,'natural-ear fallback must not have attack hinges');
});
test('actual ordinary weapon geometry and capsule profiles remain outside the compact character through full pitch/yaw sweeps',async()=>{
 const dog=await body;dog.updateMatrixWorld(true);let envelope=0;
 dog.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i++){const p=o.getVertexPosition(i,new Vector3()).applyMatrix4(o.matrixWorld);p.y-=.59;envelope=Math.max(envelope,p.length());}});
 for(const type of ['sword','polearm','hammer']){
  const source=await loadGeometry(new URL(`public/models/${type}.glb`,root)),item=createWeaponModel(source,type),carrier=new Group();carrier.add(item);
  const p=makePlayer(0,{characterId:'beagle',weaponId:type});p.p=v3();
  for(const theta of [-Math.PI,-1.55,0,.7,Math.PI/2,Math.PI,2*Math.PI])for(const phi of [-1.3,0,.8]){
   Object.assign(p,{theta,phi});const base=weaponPointFrame(p,v3()).point;carrier.position.set(base.x,base.y,base.z);setWeaponRotation(carrier.quaternion,theta,phi);carrier.updateMatrixWorld(true);
   item.traverse(o=>{if(o.isMesh)for(let i=0;i<o.geometry.attributes.position.count;i+=9){const vertex=o.getVertexPosition(i,new Vector3()).applyMatrix4(o.matrixWorld);assert.ok(vertex.length()>envelope+.035-1e-6,`${type} mesh clips body`);}});
   for(const s of weaponSegments(p)){const a=new Vector3(s.a.x,s.a.y,s.a.z),b=new Vector3(s.b.x,s.b.y,s.b.z),d=b.clone().sub(a),t=Math.max(0,Math.min(1,-a.dot(d)/d.lengthSq()));assert.ok(a.addScaledVector(d,t).length()-s.radius>envelope+.035-1e-6,`${type} capsule clips body`);}
  }
  assert.equal(weaponStats(p).length,{sword:1.45,polearm:2,hammer:1.9}[type]);
 }
});
