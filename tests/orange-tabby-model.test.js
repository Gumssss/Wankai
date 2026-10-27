import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Group,Vector3,PerspectiveCamera} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CAT} from '../src/orange-tabby-profile.js';
import {instantiateOrangeTabby,poseOrangeTabby,makeOrangeTabbyFallback,poseOrangeTabbyFallback} from '../src/orange-tabby-model.js';
import {makePlayer,weaponPointFrame,v3} from '../src/physics.js';
import {resolveLoadout} from '../src/loadouts.js';
import {ArenaView} from '../src/scene.js';
import {createFreeCameraRig,updateFreeCamera,orbitFreeCamera} from '../src/free-camera.js';

async function loadGeometry(){
 const bytes=await readFile(new URL('../public/models/'+CAT.model,import.meta.url));
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length));
 assert.equal(doc.images.length,1);assert.equal(doc.meshes.length,3);
 // Browser integration checks the original embedded atlas. Node checks the
 // actual exported geometry/control hierarchy without a DOM image decoder.
 delete doc.images;delete doc.textures;delete doc.samplers;
 for(const material of doc.materials){
  for(const name of ['normalTexture','occlusionTexture','emissiveTexture'])delete material[name];
  if(material.pbrMetallicRoughness){delete material.pbrMetallicRoughness.baseColorTexture;delete material.pbrMetallicRoughness.metallicRoughnessTexture;}
 }
 const json=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);
 const bin=bytes.subarray(20+length),header=Buffer.alloc(20);
 for(const [offset,value]of [[0,0x46546c67],[4,2],[8,20+pad.length+bin.length],[12,pad.length],[16,0x4e4f534a]])header.writeUInt32LE(value,offset);
 const data=Buffer.concat([header,pad,bin]);
 return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;
}
const asset=loadGeometry(),up=new Vector3(0,1,0);
function frame(player,local){
 const [x,y,z]=local,st=Math.sin(player.theta),ct=Math.cos(player.theta);
 return new Vector3(x*ct+y*st,-x*st+y*ct,z).applyAxisAngle(up,-player.phi).add(new Vector3(player.p.x,player.p.y-CAT.bodyFloor,player.p.z));
}
function meshPoints(mesh){return Array.from({length:mesh.geometry.attributes.position.count},(_,index)=>mesh.getVertexPosition(index,new Vector3()).applyMatrix4(mesh.matrixWorld));}

test('runtime cat GLB is the exact approved prepared-v02 export',async()=>{
 const [source,runtime]=await Promise.all(['../assets/concepts/orange-tabby/prepared-v02/'+CAT.model,'../public/models/'+CAT.model].map(p=>readFile(new URL(p,import.meta.url))));
 assert.deepEqual(runtime,source);
 assert.equal(createHash('sha256').update(runtime).digest('hex'),'3b3893335848deb1d65280e70eabad94005f4c532cd42f7720f92008dbf6cc00');
});

test('actual rigid paw vertices match the accepted physical frame through pitch and heading',async()=>{
 const instance=instantiateOrangeTabby(await asset),outer=new Group();outer.add(instance.host);
 outer.position.y=CAT.bodyFloor;poseOrangeTabby(instance,{theta:CAT.restTheta});outer.updateMatrixWorld(true);
 const samples={};
 for(const side of ['L','R']){
  const mesh=instance.model.getObjectByName('SM_Paw_'+side);
  samples[side]={mesh,local:meshPoints(mesh).map(p=>[-p.y,p.x,p.z])};
  assert.deepEqual(instance.controls[side].position.toArray(),CAT.pawAnchors[side]);
 }
 const body=instance.model.getObjectByName('SM_Body'),bodyRest=meshPoints(body);
 const player=makePlayer(0,{characterId:'orange-tabby',weaponId:'cat-paws'});player.p=v3(.4,3,-.7);
 for(const theta of [-Math.PI,-1.55,0,.8,Math.PI/2,Math.PI,2*Math.PI])for(const phi of [-2,0,.7]){
  Object.assign(player,{theta,phi});outer.position.set(player.p.x,player.p.y,player.p.z);outer.rotation.y=-phi;
  poseOrangeTabby(instance,player);outer.updateMatrixWorld(true);
  for(const {mesh,local} of Object.values(samples))for(let index=0;index<local.length;index+=37){
   const actual=mesh.getVertexPosition(index,new Vector3()).applyMatrix4(mesh.matrixWorld);
   const physical=weaponPointFrame(player,v3(...local[index])).point;
   assert.ok(actual.distanceTo(new Vector3(physical.x,physical.y,physical.z))<3e-6,'visible paw differs from actual gameplay controller frame');
  }
  for(let index=0;index<bodyRest.length;index+=71){
   const expected=bodyRest[index].clone().applyAxisAngle(up,-phi).add(new Vector3(player.p.x,player.p.y-CAT.bodyFloor,player.p.z));
   const actual=body.getVertexPosition(index,new Vector3()).applyMatrix4(body.matrixWorld);
   assert.ok(actual.distanceTo(expected)<3e-6,'seated body tilts or heading is applied twice');
  }
 }
});

test('P1/P2 controls and hit-flash materials are independent while original appearance stays unchanged',async()=>{
 const source=await asset,a=instantiateOrangeTabby(source,0),b=instantiateOrangeTabby(source,1);
 assert.notEqual(a.controls.L,b.controls.L);assert.notEqual(a.controls.root,b.controls.root);
 for(const material of a.materials)assert.ok(!b.materials.includes(material));
 const originalColor=source.getObjectByName('SM_Body').material.color.clone(),before=b.controls.L.quaternion.clone();
 assert.ok(a.materials.every(m=>m.color.equals(originalColor)));
 poseOrangeTabby(a,{theta:-1,phi:1,hitFlash:1});
 assert.ok(before.equals(b.controls.L.quaternion));assert.ok(b.materials.every(m=>m.color.equals(originalColor)));
 assert.ok(source.getObjectByName('SM_Body').material.color.equals(originalColor));
 poseOrangeTabby(a,{theta:CAT.restTheta,hitFlash:0});
 assert.equal(a.controls.L.rotation.z,0);assert.ok(a.materials.every(m=>m.color.equals(originalColor)));
});

test('failed-load fallback paw volumes use the same lowered physical pivots',()=>{
 const fallback=makeOrangeTabbyFallback(),outer=new Group();outer.add(fallback.root);
 const player={p:{x:.4,y:2.2,z:-.7},phi:.7,theta:-.6};
 outer.position.set(player.p.x,player.p.y,player.p.z);outer.rotation.y=-player.phi;poseOrangeTabbyFallback(fallback,player);outer.updateMatrixWorld(true);
 for(const [side,start] of [['L',0],['R',24]])fallback.paws[side].children.forEach((mesh,index)=>{
  assert.ok(mesh.getWorldPosition(new Vector3()).distanceTo(frame(player,CAT.colliders[start+index].a))<3e-6);
  assert.equal(mesh.scale.x,CAT.colliders[start+index].radius);
 });
});


test('actual scene attaches independent cat instances and uses two paw cues without a floating staff',async()=>{
 const loadout=resolveLoadout({characterId:'orange-tabby',weaponId:'cat-paws'}),view=Object.create(ArenaView.prototype);
 view.actors=new Group();view.meshRoot=view.actors;view.loadouts=[loadout,loadout];view.characterLoaded=new Set();
 view.players=[view.makeFighter(0),view.makeFighter(1)];
 for(const fighter of view.players){
  assert.equal(fighter.staff.visible,false);assert.equal(fighter.contact.visible,false);
  assert.equal(fighter.catFallback.root.visible,false,'fallback must remain hidden during loading');
  assert.equal(fighter.trails.length,2);assert.deepEqual(fighter.pawContacts.map(c=>c.side),['L','R']);
 }
 view.showCharacterFallback(CAT.model);assert.ok(view.players.every(f=>f.catFallback.root.visible));
 view.setCharacterModel(await asset,CAT.model);
 assert.ok(view.players.every(f=>f.cat&&!f.catFallback.root.visible));
 assert.notEqual(view.players[0].cat.controls.L,view.players[1].cat.controls.L);
 const children=view.players[0].root.children.length;view.setCharacterModel(await asset,CAT.model);
 assert.equal(view.players[0].root.children.length,children,'model loading is idempotent');
});


test('the follow camera keeps actual cat body and paws inside the frustum through rise, extremes and orbit',async t=>{
 const source=await asset,projection=new Vector3();let projectedVertices=0;
 for(const id of [0,1])for(const aspect of [.35,.7,1.4,2]){
  const camera=new PerspectiveCamera(55,aspect,.1,120),rig=createFreeCameraRig(camera);
  const instance=instantiateOrangeTabby(source,id),outer=new Group();outer.add(instance.host);
  const meshes=['SM_Body','SM_Paw_L','SM_Paw_R'].map(name=>instance.model.getObjectByName(name));
  // Cover the surface regularly and include each mesh's actual coordinate
  // extrema, so sparse sampling cannot omit the outer toe or ear vertices.
  const samples=meshes.map(mesh=>{
   const positions=mesh.geometry.attributes.position,indices=new Set();
   for(let index=0;index<positions.count;index+=29)indices.add(index);
   for(const axis of ['X','Y','Z']){
    let minimum=0,maximum=0;
    for(let index=1;index<positions.count;index++){
     if(positions['get'+axis](index)<positions['get'+axis](minimum))minimum=index;
     if(positions['get'+axis](index)>positions['get'+axis](maximum))maximum=index;
    }
    indices.add(minimum);indices.add(maximum);
   }
   return {mesh,indices:[...indices]};
  });
  const player=makePlayer(id,{characterId:'orange-tabby',weaponId:'cat-paws'});let state=0;
  for(const height of [CAT.bodyFloor+CAT.hoverHeight,CAT.bodyFloor+2.20,CAT.bodyFloor+5])
   for(const theta of [-Math.PI,-1.55,0,.8,CAT.restTheta,Math.PI,2*Math.PI])for(const phi of [-2,0,.7]){
    player.p=v3(id?9:-7,height,id?-6:5);Object.assign(player,{theta,phi});
    outer.position.set(player.p.x,player.p.y,player.p.z);outer.rotation.y=-phi;poseOrangeTabby(instance,player);outer.updateMatrixWorld(true);
    if(state===21)orbitFreeCamera(rig,120,-25);
    if(state===42)orbitFreeCamera(rig,id?-60:60,10);
    updateFreeCamera(rig,player,1/60);
    for(const {mesh,indices} of samples)for(const index of indices){
     mesh.getVertexPosition(index,projection).applyMatrix4(mesh.matrixWorld).project(camera);projectedVertices++;
     assert.ok(Math.abs(projection.x)<1&&Math.abs(projection.y)<1&&projection.z>-1&&projection.z<1,
      `cat clipped: P${id+1} aspect=${aspect}, height=${height}, theta=${theta}, phi=${phi}, mesh=${mesh.name}, vertex=${index}, ndc=${projection.toArray()}`);
    }
    state++;
   }
 }
 assert.ok(projectedVertices>200000,'exercise actual model surfaces across the complete framing matrix');
 t.diagnostic(`${projectedVertices} actual exported vertices projected across 504 camera/pose states`);
});

test('cat steering leaves camera azimuth independent while mouse orbit still works',()=>{
 const player=makePlayer(1,{characterId:'orange-tabby',weaponId:'cat-paws'}),rig=createFreeCameraRig();
 updateFreeCamera(rig,player,1/60);const initializedYaw=rig.yaw,before=rig.camera.quaternion.clone();
 player.phi+=1.3;updateFreeCamera(rig,player,1/60);
 assert.equal(rig.yaw,initializedYaw,'A/D steering must not drag camera azimuth');
 orbitFreeCamera(rig,190,30);
 // The established camera eases at 5/s. Observe half a second of normal
 // frames rather than assuming an instantaneous orbit after one tick.
 for(let frame=0;frame<30;frame++)updateFreeCamera(rig,player,1/60);
 assert.equal(rig.yaw,initializedYaw);assert.ok(rig.mouseYaw<-1.1);
 assert.ok(before.angleTo(rig.camera.quaternion)>.5,'independent orbit must visibly turn the camera');
});
