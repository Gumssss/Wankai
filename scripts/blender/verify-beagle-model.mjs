import{readFile,writeFile}from'node:fs/promises';
import{Vector3,Quaternion,AnimationMixer,LoopOnce,REVISION}from'three';
import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
import{clone}from'three/addons/utils/SkeletonUtils.js';
const root=new URL('../../',import.meta.url),out=new URL('output/blender/beagle-model-v01/',root);
const bytes=await readFile(new URL('public/models/beagle-ear-duelist-v01.glb',root));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=gltf.scene,meshes=[],materials=new Set();
scene.traverse(o=>{if(o.isSkinnedMesh){meshes.push(o);materials.add(o.material);}});
function assert(ok,msg){if(!ok)throw Error(msg);}
assert(meshes.length===4,'Expected four skinned meshes');
assert(materials.size===2,'Expected two shared materials');
const bones=meshes[0].skeleton.bones;
assert(bones.length===13,'Expected thirteen controls');
const rest=new Map(bones.map(b=>[b.name,{q:b.quaternion.clone(),s:b.scale.clone(),p:b.position.clone()}]));
function reset(){for(const b of bones){const r=rest.get(b.name);b.quaternion.copy(r.q);b.scale.copy(r.s);b.position.copy(r.p);}scene.position.set(0,0,0);update();}
function update(){scene.updateMatrixWorld(true);for(const mesh of meshes)mesh.skeleton.update();}
const ear=meshes.find(m=>m.name==='SM_Beagle_Ears');
const face=meshes.find(m=>m.name==='SM_Beagle_Face');
let triangles=0,maxWeights=0;
for(const mesh of meshes){
 const g=mesh.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;
 assert(g.attributes.color&&g.attributes.uv,'Color or UV missing');
 for(const name of ['position','normal','color','uv'])assert([...g.attributes[name].array].every(Number.isFinite),'Nonfinite '+name);
 for(let i=0;i<g.attributes.position.count;i++){
  const w=g.attributes.skinWeight;
  const vals=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];
  maxWeights=Math.max(maxWeights,vals.filter(v=>v>1e-8).length);
  assert(Math.abs(vals.reduce((a,b)=>a+b,0)-1)<1e-6,'Unnormalized skin weight');
 }
}
assert(triangles<20000&&maxWeights<=4,'Model budget exceeded');
function vertices(mesh,boneName){
 const joint=mesh.skeleton.bones.findIndex(b=>b.name===boneName),indices=mesh.geometry.attributes.skinIndex;
 const verts=[];
 for(let i=0;i<indices.count;i++)if(indices.getX(i)===joint)verts.push(mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));
 return verts;
}
let maxSocketError=0,maxLengthError=0,maxTipError=0;
for(const theta of [-2*Math.PI,-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI,2*Math.PI]){
 reset();
 for(const [name,side]of[['L',1],['R',-1]]){
  const b=scene.getObjectByName(name+'_ear_swing');
  b.quaternion.copy(rest.get(b.name).q).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),theta+1.55));
 }
 update();
 for(const [name,side]of[['L',1],['R',-1]]){
  const b=scene.getObjectByName(name+'_ear_swing'),socket=b.getWorldPosition(new Vector3());
  const expectedSocket=new Vector3(0,1.43,side*.66);
  maxSocketError=Math.max(maxSocketError,socket.distanceTo(expectedSocket));
  const verts=vertices(ear,b.name);
  const lengths=verts.map(v=>v.distanceTo(socket));const length=Math.max(...lengths);
  maxLengthError=Math.max(maxLengthError,Math.abs(length-3.6));
  const tip=verts[lengths.indexOf(length)];
  const expected=socket.clone().add(new Vector3(Math.sin(theta)*3.6,Math.cos(theta)*3.6,0));
  maxTipError=Math.max(maxTipError,tip.distanceTo(expected));
 }
}
assert(maxSocketError<1e-4&&maxLengthError<1e-4&&maxTipError<1e-4,JSON.stringify({maxSocketError,maxLengthError,maxTipError}));
reset();
const pitch=scene.getObjectByName('body_pitch');pitch.quaternion.copy(rest.get('body_pitch').q).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.65));
update();
let bodyPitchSocketError=0;
for(const [name,side]of[['L',1],['R',-1]]){
 const expected=new Vector3(0,.58,side*.66).applyAxisAngle(new Vector3(0,0,-1),.65).add(new Vector3(0,.85,0));
 bodyPitchSocketError=Math.max(bodyPitchSocketError,scene.getObjectByName(name+'_ear_swing').getWorldPosition(new Vector3()).distanceTo(expected));
}
assert(bodyPitchSocketError<1e-4,'Body pitch breaks socket positions');
reset();
for(const name of['L','R']){
 const b=scene.getObjectByName(name+'_ear_swing');b.quaternion.copy(rest.get(b.name).q).multiply(new Quaternion().setFromAxisAngle(new Vector3(0,1,0),Math.PI+1.55));
}
scene.position.y=2.17;update();
let supportTipError=0;
for(const name of['L','R'])supportTipError=Math.max(supportTipError,Math.abs(Math.min(...vertices(ear,name+'_ear_swing').map(v=>v.y))));
assert(supportTipError<1e-4,'Support height changed');
reset();
assert(gltf.animations.length===1,'Expected the optional blink clip');
const clip=gltf.animations[0];
assert(clip.tracks.every(t=>/^[LR]_lid\./.test(t.name)),'Cosmetic clip overrides a physical control: '+clip.tracks.map(t=>t.name).join(','));
const before=vertices(face,'L_lid');
const mixer=new AnimationMixer(scene);const action=mixer.clipAction(clip).setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(.5);update();
const after=vertices(face,'L_lid');
const blinkDisplacement=Math.max(...before.map((v,i)=>v.distanceTo(after[i])));
assert(blinkDisplacement>.1,'Blink does not move eyelid geometry');mixer.stopAllAction();reset();
const a=clone(scene),b=clone(scene);
assert(a.getObjectByName('L_ear_swing')!==b.getObjectByName('L_ear_swing'),'Skeleton clone shares controls');
const untouched=b.getObjectByName('L_ear_swing').quaternion.clone();a.getObjectByName('L_ear_swing').rotateY(1);
assert(b.getObjectByName('L_ear_swing').quaternion.angleTo(untouched)<1e-8,'One player changes the other skeleton');
const report={status:'passed',three_revision:REVISION,bytes:bytes.length,triangles,skinned_meshes:meshes.length,materials:materials.size,bones:bones.map(b=>b.name),maximum_vertex_influences:maxWeights,uv_and_vertex_colors:true,full_rotation_test_angles:7,maximum_socket_error:maxSocketError,maximum_length_error:maxLengthError,maximum_tip_position_error:maxTipError,body_pitch_socket_error:bodyPitchSocketError,support_tip_height_error:supportTipError,blink_tracks:clip.tracks.map(t=>t.name),blink_vertex_displacement:blinkDisplacement,independent_skeleton_clones:true,note:'Export/import and rig geometry checks; gameplay integration and balance remain separate'};
await writeFile(new URL('three-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
