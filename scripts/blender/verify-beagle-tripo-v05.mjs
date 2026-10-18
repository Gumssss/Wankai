import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Vector3,Quaternion,AnimationMixer,LoopOnce,REVISION} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const root=new URL('../../',import.meta.url),out=new URL('output/blender/beagle-tripo-v05/',root);
const report=JSON.parse(await readFile(new URL('assets/concepts/beagle/tripo-v05/rig-report.json',root)));
await mkdir(out,{recursive:true});
const bytes=await readFile(new URL('public/models/beagle-smooth-ear-duelist-v05.glb',root));
function assert(v,msg){if(!v)throw Error(msg);}
const jsonSize=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+jsonSize));
assert(document.images?.length===1,'Expected one shared coat image');
assert(document.materials.length===3,'Expected coat, root cover, player accent');
// Geometry tests use the exact exported buffers. Image decoding is checked in
// the browser; removing map references lets this run in plain Node.
const testDocument=structuredClone(document);
delete testDocument.images;delete testDocument.textures;delete testDocument.samplers;
for(const m of testDocument.materials){
 for(const key of ['normalTexture','occlusionTexture','emissiveTexture'])delete m[key];
 if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}
}
const json=Buffer.from(JSON.stringify(testDocument)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
const binary=bytes.subarray(20+jsonSize),header=Buffer.alloc(20);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+binary.length,8);
header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
const input=Buffer.concat([header,padded,binary]);
const gltf=await new GLTFLoader().parseAsync(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength),'');
const scene=gltf.scene,meshes=[];scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
assert(meshes.length>=4&&meshes.length<=6,'Unexpected runtime draw groups '+meshes.length);
const bones=meshes[0].skeleton.bones;
assert(bones.length===13,'Expected physical and facial controls');
const rest=new Map(bones.map(b=>[b.name,{q:b.quaternion.clone(),s:b.scale.clone(),p:b.position.clone()}]));
function update(){scene.updateMatrixWorld(true);for(const m of meshes)m.skeleton.update();}
function reset(){for(const b of bones){const r=rest.get(b.name);b.quaternion.copy(r.q);b.scale.copy(r.s);b.position.copy(r.p);}scene.position.set(0,0,0);update();}
function vertices(m){return Array.from({length:m.geometry.attributes.position.count},(_,i)=>m.getVertexPosition(i,new Vector3()).applyMatrix4(m.matrixWorld));}
reset();let triangles=0,maxInfluences=0;
for(const mesh of meshes){
 const g=mesh.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;
 for(const a of ['position','normal','uv','skinIndex','skinWeight'])assert(g.attributes[a]&&[...g.attributes[a].array].every(Number.isFinite),'Invalid '+a);
 const w=g.attributes.skinWeight;
 for(let i=0;i<w.count;i++){
  const weights=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];
  maxInfluences=Math.max(maxInfluences,weights.filter(v=>v>1e-8).length);
  assert(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-6,'Weight is not normalized');
 }
}
assert(triangles<35000&&maxInfluences<=4,'Runtime budget');
const ears={L:meshes.find(m=>m.name==='SM_Beagle_L_Ear'),R:meshes.find(m=>m.name==='SM_Beagle_R_Ear')};
assert(ears.L&&ears.R,'Independent ear meshes missing');
const bind={L:vertices(ears.L),R:vertices(ears.R)},axis=new Vector3(0,0,-1);
let socketError=0,rotationError=0,minimumClearance=Infinity;
for(const theta of [-Math.PI*2,-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI,Math.PI*2]){
 reset();
 for(const side of ['L','R'])scene.getObjectByName(side+'_ear_swing').quaternion.copy(rest.get(side+'_ear_swing').q).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),theta-report.ear_bind_pitch));
 update();
 for(const side of ['L','R']){
  const p=report.ear_specs[side].pivot,socket=new Vector3(p[0],p[2],-p[1]);
  socketError=Math.max(socketError,socket.distanceTo(scene.getObjectByName(side+'_ear_swing').getWorldPosition(new Vector3())));
  const actual=vertices(ears[side]);
  for(let i=0;i<actual.length;i++){
   const expected=bind[side][i].clone().sub(socket).applyAxisAngle(axis,theta-report.ear_bind_pitch).add(socket);
   rotationError=Math.max(rotationError,actual[i].distanceTo(expected));
   minimumClearance=Math.min(minimumClearance,Math.abs(actual[i].z)-report.core_lateral_bound);
  }
 }
}
assert(socketError<1e-4&&rotationError<1e-4,'Hinge transform failed '+JSON.stringify({socketError,rotationError}));
assert(minimumClearance>.03,'Ear/head lateral clearance '+minimumClearance);
reset();
const untouchedR=vertices(ears.R);scene.getObjectByName('L_ear_swing').rotateY(1.1);update();
assert(Math.max(...vertices(ears.R).map((v,i)=>v.distanceTo(untouchedR[i])))<1e-5,'Left ear changes right ear');
reset();let bodyPitchSocketError=0;
scene.getObjectByName('body_pitch').rotateY(.65);update();
for(const side of ['L','R']){
 const p=report.ear_specs[side].pivot;
 const expected=new Vector3(p[0],p[2]-.85,-p[1]).applyAxisAngle(axis,.65).add(new Vector3(0,.85,0));
 bodyPitchSocketError=Math.max(bodyPitchSocketError,expected.distanceTo(scene.getObjectByName(side+'_ear_swing').getWorldPosition(new Vector3())));
}
assert(bodyPitchSocketError<1e-4,'Body pitch loses ear sockets');
let combinedInputError=0;
for(const theta of [-2.2,.7,2.5])for(const yaw of [-1.2,0,.9]){
 reset();
 for(const side of ['L','R'])scene.getObjectByName(side+'_ear_swing').rotateY(theta-report.ear_bind_pitch);
 scene.getObjectByName('body_pitch').rotateY(.4);scene.getObjectByName('root').rotateZ(yaw);update();
 for(const side of ['L','R']){
  const p=report.ear_specs[side].pivot,socket=new Vector3(p[0],p[2],-p[1]);
  vertices(ears[side]).forEach((actual,i)=>{
   const expected=bind[side][i].clone().sub(socket).applyAxisAngle(axis,theta-report.ear_bind_pitch).add(socket)
      .sub(new Vector3(0,.85,0)).applyAxisAngle(axis,.4).add(new Vector3(0,.85,0)).applyAxisAngle(new Vector3(0,1,0),yaw);
   combinedInputError=Math.max(combinedInputError,actual.distanceTo(expected));
  });
 }
}
assert(combinedInputError<1e-4,'Combined yaw/body/ear transform');
reset();assert(gltf.animations.length===1,'Blink clip missing');
const clip=gltf.animations[0];assert(clip.tracks.every(t=>/^[LR]_lid\./.test(t.name)),'Cosmetic clip affects physical controls');
const before=meshes.map(vertices),mixer=new AnimationMixer(scene),action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.play();mixer.setTime(.5);update();
let blinkDisplacement=0;
meshes.forEach((m,j)=>vertices(m).forEach((v,i)=>blinkDisplacement=Math.max(blinkDisplacement,v.distanceTo(before[j][i]))));
assert(blinkDisplacement>.1,'Blink has no effect');mixer.stopAllAction();reset();
const a=clone(scene),b=clone(scene),qb=b.getObjectByName('L_ear_swing').quaternion.clone();a.getObjectByName('L_ear_swing').rotateY(1);
assert(b.getObjectByName('L_ear_swing').quaternion.angleTo(qb)<1e-8,'Clones share controls');
const result={status:'passed',three_revision:REVISION,bytes:bytes.length,triangles,skinned_draw_groups:meshes.length,
 materials:document.materials.length,images:document.images.length,maximum_vertex_influences:maxInfluences,
 full_rotation_angles:7,maximum_socket_error:socketError,maximum_rigid_rotation_error:rotationError,
 minimum_ear_to_core_clearance:minimumClearance,body_pitch_socket_error:bodyPitchSocketError,combined_yaw_body_ear_error:combinedInputError,
 blink_vertex_displacement:blinkDisplacement,independent_ears:true,independent_skeleton_clones:true,
 note:'Exported geometry/rig checks. Texture decoding and appearance require browser review. Runtime behavior is covered by the beagle gameplay/model tests; full-body flips remain unimplemented.'};
await writeFile(new URL('three-report.json',out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
