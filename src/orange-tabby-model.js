import {Group,Mesh,SphereGeometry,ConeGeometry,MeshStandardMaterial,Color} from 'three';
import { CAT, CAT_PAW_ORIGINAL_COLLIDERS, CAT_PAW_TRANSFORMS, catPawScale, catPawTransforms } from './orange-tabby-profile.js';

const WHITE=new Color(0xffffff);
const PAW_SIDES = ['L', 'R'];

function applyPawTransforms(wrappers, transforms) {
  for (const side of PAW_SIDES) {
    const { center, offset, scale } = transforms[side];
    const anchor = CAT.pawAnchors[side];
    wrappers[side].position.set(...center.map((value, axis) => (1 - scale) * (value - anchor[axis]) + offset[axis]));
    wrappers[side].scale.setScalar(scale);
  }
}

function wrapPawControls(controls) {
  const wrappers = {};
  for (const side of PAW_SIDES) {
    const control = controls[side], wrapper = new Group();
    wrapper.name = `PawScale_${side}`;
    for (const child of [...control.children]) wrapper.add(child);
    control.add(wrapper);
    wrappers[side] = wrapper;
  }
  applyPawTransforms(wrappers, CAT_PAW_TRANSFORMS);
  return wrappers;
}

function posePaws(controls, wrappers, player) {
  applyPawTransforms(wrappers, catPawTransforms(catPawScale(player)));
  for (const side of PAW_SIDES) controls[side].rotation.set(0, 0, Math.PI / 2 - player.theta);
}

// This export is rigid. Clone the hierarchy and materials for each fighter;
// geometry and the approved atlas can safely be shared until view disposal.
export function instantiateOrangeTabby(source,id=0){
 const model=source.clone(true),host=new Group(),materials=new Map();
 const controls={root:model.getObjectByName('CTRL_Root'),L:model.getObjectByName('CTRL_Paw_L'),R:model.getObjectByName('CTRL_Paw_R')};
 for(const [name,node] of Object.entries(controls))if(!node)throw Error('Orange tabby control missing: '+name);
 // An instance-local affine wrapper leaves the source GLB and shared geometry
 // untouched. It rotates with the original virtual joint, exactly like contacts.
 const pawWrappers = wrapPawControls(controls);
 host.name='OrangeTabby_Character';host.position.y=-CAT.bodyFloor;host.add(model);
 model.traverse(object=>{
  if(!object.isMesh)return;
  object.castShadow=object.receiveShadow=true;object.frustumCulled=false;
  const own=original=>{if(!materials.has(original))materials.set(original,original.clone());return materials.get(original);};
  object.material=Array.isArray(object.material)?object.material.map(own):own(object.material);
 });
 return {host,model,controls,pawWrappers,id,materials:[...materials.values()],colors:[...materials.values()].map(m=>m.color.clone())};
}

export function poseOrangeTabby(instance,player){
 // The enclosing arena root owns p and -heading. Never apply either again.
 instance.controls.root.position.set(0,0,0);instance.controls.root.rotation.set(0,0,0);
 posePaws(instance.controls, instance.pawWrappers, player);
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
 for (const side of PAW_SIDES) {
   const paw = new Group();
   paw.position.set(...CAT.pawAnchors[side]);
   host.add(paw);
   paws[side] = paw;
 }
 for (const { a: [x, y, z], radius, side } of CAT_PAW_ORIGINAL_COLLIDERS) {
   volume(paws[side], [y, -x, z - CAT.pawAnchors[side][2]], [radius, radius, radius], cream);
 }
 const pawWrappers = wrapPawControls(paws);
 const materials=[orange,cream,dark,pink];
 return {root,body,paws,pawWrappers,materials,colors:materials.map(m=>m.color.clone()),id};
}
export function poseOrangeTabbyFallback(instance,player){
 posePaws(instance.paws, instance.pawWrappers, player);
 instance.materials.forEach((material,index)=>material.color.copy(instance.colors[index]).lerp(WHITE,(player.hitFlash||0)*.65));
}
