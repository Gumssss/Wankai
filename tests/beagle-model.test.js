import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {instantiateBeagle,poseBeagle} from '../src/beagle-model.js';
import {BEAGLE} from '../src/beagle-profile.js';
import {makePlayer,weaponPointFrame,bodyPointFrame,v3} from '../src/physics.js';

async function loadGeometry(){
 const bytes=await readFile(new URL('../public/models/'+BEAGLE.model,import.meta.url));
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length));
 assert.equal(doc.images.length,1); // Real texture decoding is checked in browser.
 delete doc.images;delete doc.textures;delete doc.samplers;
 for(const m of doc.materials){
  for(const name of ['normalTexture','occlusionTexture','emissiveTexture'])delete m[name];
  if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}
 }
 const json=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);
 const bin=bytes.subarray(20+length),header=Buffer.alloc(20);
 for(const [offset,value]of [[0,0x46546c67],[4,2],[8,20+pad.length+bin.length],[12,pad.length],[16,0x4e4f534a]])header.writeUInt32LE(value,offset);
 const data=Buffer.concat([header,pad,bin]);
 return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;
}
const asset=loadGeometry();
const refresh=root=>{root.updateMatrixWorld(true);root.traverse(o=>o.skeleton?.update());};

test('the actual exported skinned ears follow the same anchored frame as gameplay through swings and yaw',async()=>{
 const instance=instantiateBeagle(await asset),root=new Group();root.add(instance.host);
 root.position.y=BEAGLE.bodyFloor;refresh(root);
 const samples={};
 for(const side of ['L','R']){
  const mesh=instance.model.getObjectByName('SM_Beagle_'+side+'_Ear'),a=BEAGLE.anchors[side];
  const socket=new Vector3(a[0],a[1]+BEAGLE.bodyFloor,a[2]);
  samples[side]={mesh,local:Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>
   mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld).sub(socket)
    .applyAxisAngle(new Vector3(0,0,1),BEAGLE.earBindPitch))};
 }
 const bodyNode=instance.model.getObjectByName('SM_Beagle_Body');
 const body=bodyNode.isSkinnedMesh?bodyNode:bodyNode.children.find(o=>o.isSkinnedMesh);
 const bodyLocal=Array.from({length:body.geometry.attributes.position.count},(_,i)=>
   body.getVertexPosition(i,new Vector3()).applyMatrix4(body.matrixWorld).sub(new Vector3(0,BEAGLE.bodyFloor,0)));
 const p=makePlayer(0,'beagle');p.p=v3(.4,3,-.7);
 for(const earSpread of [0,.65,Math.PI/2])for(const theta of [-Math.PI,-1.55,0,Math.PI/2,Math.PI,2*Math.PI])for(const phi of [-2,0,.7]){
  Object.assign(p,{theta,phi,earSpread,earLag:.07*earSpread});root.position.set(p.p.x,p.p.y,p.p.z);root.rotation.y=-phi;
  poseBeagle(instance,p,1);refresh(root);
  for(const side of ['L','R']){
   const {mesh,local}=samples[side],anchor=BEAGLE.anchors[side];
   const expectedSocket=weaponPointFrame(p,v3(),anchor).point;
   assert.ok(instance.bones[side+'_ear_swing'].getWorldPosition(new Vector3()).distanceTo(new Vector3(...Object.values(expectedSocket)))<2e-6);
   for(let i=0;i<local.length;i+=7){
    const f=weaponPointFrame(p,v3(local[i].x,local[i].y,local[i].z),anchor);
    const actual=mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld);
    assert.ok(actual.distanceTo(new Vector3(f.point.x,f.point.y,f.point.z))<3e-6,'visible ear detached from physical frame');
   }
  }
  for(let i=0;i<bodyLocal.length;i+=71){
   const expected=bodyPointFrame(p,bodyLocal[i]).point,actual=body.getVertexPosition(i,new Vector3()).applyMatrix4(body.matrixWorld);
   assert.ok(actual.distanceTo(new Vector3(expected.x,expected.y,expected.z))<3e-6,'visible body differs from its physical rotation');
  }
 }
});

test('two beagles have independent skeletons, player bibs and hit-flash materials',async()=>{
 const source=await asset,a=instantiateBeagle(source,0),b=instantiateBeagle(source,1);
 assert.notEqual(a.bones.L_ear_swing,b.bones.L_ear_swing);
 const accent=x=>x.materials.find(m=>m.name==='MAT_Player_Accent');
 assert.equal(accent(a).color.getHex(),0xc4684f);assert.equal(accent(b).color.getHex(),0x568d92);
 for(const m of a.materials)assert.ok(!b.materials.includes(m));
 const before=b.bones.L_ear_swing.quaternion.clone(),color=accent(b).color.clone();
 poseBeagle(a,{theta:1.2,hitFlash:1},.09);
 assert.ok(before.angleTo(b.bones.L_ear_swing.quaternion)<1e-10);
 assert.ok(color.equals(accent(b).color));
 assert.ok(a.bones.L_lid.scale.z<.1,'cosmetic blink should still work');
});
