import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Box3} from 'three';
import {readFileSync} from 'node:fs';
import {preloadCr7Rig} from '../src/models/cr7-rig.js';
import {buildCharacter} from '../src/models/characters.js';
import {makePlayer} from '../src/physics.js';
import {disposeObject} from '../src/models/toy-kit.js';

await preloadCr7Rig();
const choice={characterId:'cr7',weaponId:'soccer-ball'};
const skin=root=>{let found;root.traverse(o=>{if(o.isSkinnedMesh)found=o;});return found;};
const update=b=>{b.root.updateMatrixWorld(true);skin(b.root).skeleton.update();};

test('CR7 export preserves topology and has two rotation-only leg clips',()=>{
 const bytes=readFileSync(new URL('../public/models/characters/cr7-rig-v01.glb',import.meta.url));
 const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.equal(gltf.accessors[gltf.meshes[0].primitives[0].indices].count/3,18978);
 assert.deepEqual(gltf.animations.map(a=>a.name),['CR7_Kick','CR7_Step']);
 for(const a of gltf.animations)for(const c of a.channels){assert.equal(c.target.path,'rotation');assert.notEqual(gltf.nodes[c.target.node].name,'root');}
 const b=buildCharacter(choice),m=skin(b.root),w=m.geometry.attributes.skinWeight;
 assert.equal(m.skeleton.bones.length,7);
 for(let i=0;i<w.count;i++)assert(Math.abs(w.getX(i)+w.getY(i)+w.getZ(i)+w.getW(i)-1)<1e-5);
});

test('CR7 kick and step deform legs without root motion, face changes or floor penetration',()=>{
 const b=buildCharacter(choice),p=makePlayer(0,choice),m=skin(b.root);update(b);
 const rest=Array.from({length:m.geometry.attributes.position.count},(_,i)=>m.getVertexPosition(i,new Vector3()));
 let moved=0;
 for(let i=0;i<70;i++){
  const t=i/60;p.abilityPhase=t<.4?'windup':'active';p.abilityTime=t<.4?.4-t:3-(t-.4);p.v.x=2.2;
  b.pose(p,t);update(b);
  const box=new Box3().setFromObject(b.root,true);
  assert(box.min.y>=-.60,'feet stay above floor tolerance');assert(box.max.x<.71,'kick stays within cosmetic allowance');
  for(let j=0;j<rest.length;j+=13){const v=m.getVertexPosition(j,new Vector3());assert(v.toArray().every(Number.isFinite));if(rest[j].y>1.05)assert(v.distanceTo(rest[j])<1e-5,'face and shirt fixed');else moved=Math.max(moved,v.distanceTo(rest[j]));}
  assert.deepEqual(b.root.position.toArray(),[0,0,0]);
 }
 assert(moved>.25,'a real skeletal kick is played');
});

test('two CR7 skeletons, materials, pause and deterministic replay are independent',()=>{
 const a=buildCharacter(choice,0),b=buildCharacter(choice,1),ma=skin(a.root),mb=skin(b.root),p=makePlayer(0,choice);
 assert.notEqual(ma.skeleton,mb.skeleton);assert.notEqual(ma.skeleton.bones[0],mb.skeleton.bones[0]);assert.notEqual(ma.material,mb.material);
 const before=mb.skeleton.bones.map(b=>b.quaternion.clone());
 Object.assign(p,{abilityPhase:'active',abilityTime:2.84});p.v.x=2.2;a.pose(p,1);update(a);
 const pose=ma.skeleton.bones.map(b=>b.quaternion.toArray());a.pose(p,400);update(a);
 assert.deepEqual(ma.skeleton.bones.map(b=>b.quaternion.toArray()),pose);
 assert.deepEqual(mb.skeleton.bones.map(b=>b.quaternion.toArray()),before.map(b=>b.toArray()));
 disposeObject(a.root);b.pose(p,2);update(b);assert(new Box3().setFromObject(b.root,true).min.toArray().every(Number.isFinite));
});
