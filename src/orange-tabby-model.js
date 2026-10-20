import {Group,Mesh,SphereGeometry,ConeGeometry,MeshStandardMaterial,Color} from 'three';
import {CAT} from './orange-tabby-profile.js';

const WHITE=new Color(0xffffff);
// This export is rigid. Clone the hierarchy and materials for each fighter;
// geometry and the approved atlas can safely be shared until view disposal.
export function instantiateOrangeTabby(source,id=0){
 const model=source.clone(true),host=new Group(),materials=new Map();
 const controls={root:model.getObjectByName('CTRL_Root'),L:model.getObjectByName('CTRL_Paw_L'),R:model.getObjectByName('CTRL_Paw_R')};
 for(const [name,node] of Object.entries(controls))if(!node)throw Error('Orange tabby control missing: '+name);
 host.name='OrangeTabby_Character';host.position.y=-CAT.bodyFloor;host.add(model);
 model.traverse(object=>{
  if(!object.isMesh)return;
  object.castShadow=object.receiveShadow=true;object.frustumCulled=false;
  const own=original=>{if(!materials.has(original))materials.set(original,original.clone());return materials.get(original);};
  object.material=Array.isArray(object.material)?object.material.map(own):own(object.material);
 });
 return {host,model,controls,id,materials:[...materials.values()],colors:[...materials.values()].map(m=>m.color.clone())};
}

export function poseOrangeTabby(instance,player){
 // The enclosing arena root owns p and -heading. Never apply either again.
 instance.controls.root.position.set(0,0,0);instance.controls.root.rotation.set(0,0,0);
 for(const side of ['L','R'])instance.controls[side].rotation.set(0,0,Math.PI/2-player.theta);
 instance.materials.forEach((material,index)=>material.color.copy(instance.colors[index]).lerp(WHITE,(player.hitFlash||0)*.65));
}

// Used only after a failed asset load. Paw spheres are the measured physical
// volumes, in the exact same lowered-pivot frame as the approved export.
export function makeOrangeTabbyFallback(id=0){
 const root=new Group(),body=new Group(),host=new Group(),paws={};root.add(host);host.position.y=-CAT.bodyFloor;host.add(body);
 const orange=new MeshStandardMaterial({color:0xffb454,roughness:.85}),cream=new MeshStandardMaterial({color:0xfff3dc,roughness:.9}),dark=new MeshStandardMaterial({color:0x29231e,roughness:.9}),pink=new MeshStandardMaterial({color:0xeaa298,roughness:.85});
 const volume=(parent,position,scale,material)=>{const mesh=new Mesh(new SphereGeometry(1,16,12),material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 volume(body,[-.15,.48,0],[.40,.50,.38],orange);volume(body,[.03,1.12,0],[.58,.48,.56],orange);
 volume(body,[.45,.95,0],[.18,.17,.34],cream);volume(body,[.59,1.02,0],[.035,.035,.05],pink);
 for(const side of [-1,1]){
  volume(body,[.51,1.18,side*.24],[.04,.095,.12],dark);volume(body,[.15,.10,side*.19],[.22,.10,.15],cream);
  const ear=new Mesh(new ConeGeometry(.18,.35,3),orange);ear.position.set(.02,1.58,side*.38);ear.rotation.x=side*.18;body.add(ear);
 }
 for(const [side,index] of [['L',0],['R',1]]){
  const paw=new Group(),anchor=CAT.pawAnchors[side];paw.position.set(...anchor);host.add(paw);paws[side]=paw;
  for(const shape of CAT.colliders.slice(index*24,index*24+24)){
   const [x,y,z]=shape.a;volume(paw,[y,-x,z-anchor[2]],[shape.radius,shape.radius,shape.radius],cream);
  }
 }
 const materials=[orange,cream,dark,pink];
 return {root,body,paws,materials,colors:materials.map(m=>m.color.clone()),id};
}
export function poseOrangeTabbyFallback(instance,player){
 for(const paw of Object.values(instance.paws))paw.rotation.z=Math.PI/2-player.theta;
 instance.materials.forEach((material,index)=>material.color.copy(instance.colors[index]).lerp(WHITE,(player.hitFlash||0)*.65));
}
