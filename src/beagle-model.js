import {Group,Mesh,SphereGeometry,CapsuleGeometry,MeshStandardMaterial,Vector3,Quaternion,Color} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {BEAGLE} from './beagle-profile.js';
import {beagleEarYaw} from './beagle-skill.js';

const HINGE_AXIS=new Vector3(0,1,0),UP=new Vector3(0,1,0),WHITE=new Color(0xffffff);
const PLAYER_COLORS=[0xc4684f,0x568d92];
const SPREAD_AXIS=new Vector3(0,0,1),PIVOT_HEIGHT=.85-BEAGLE.bodyFloor;

// SkeletonUtils is essential: ordinary Object3D.clone shares skinned controls.
export function instantiateBeagle(source,id=0,{rigged=true}={}){
 const model=clone(source),host=new Group(),materials=new Map(),bones={},rest={};
 host.name='Beagle_Character';host.position.y=-BEAGLE.bodyFloor;host.add(model);
 model.traverse(o=>{
  if(o.isBone){bones[o.name]=o;rest[o.name]=o.quaternion.clone();}
  if(!o.isMesh)return;
  o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
  const own=mat=>{
   if(!materials.has(mat)){
    const copy=mat.clone();
    if(copy.name==='MAT_Player_Accent')copy.color.set(PLAYER_COLORS[id]);
    materials.set(mat,copy);
   }
   return materials.get(mat);
  };
  o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
 });
 for(const name of rigged?['L_ear_swing','R_ear_swing','body_pitch','L_lid','R_lid']:[])
  if(!bones[name])throw Error('Beagle control missing: '+name);
 return {host,model,bones,rest,id,rigged,rotation:new Quaternion(),materials:[...materials.values()],
  colors:[...materials.values()].map(m=>m.color.clone()),pitch:new Quaternion()};
}

export function poseBeagle(instance,player,time=0){
 const {bones,rest,rotation,pitch}=instance;
 if(!instance.rigged){instance.materials.forEach((m,i)=>m.color.copy(instance.colors[i]).lerp(WHITE,(player.hitFlash||0)*.65));return;}
 for(const side of ['L','R'])bones[side+'_ear_swing'].quaternion.copy(rest[side+'_ear_swing'])
  .multiply(rotation.setFromAxisAngle(SPREAD_AXIS,-beagleEarYaw(player,BEAGLE.anchors[side])))
  .multiply(pitch.setFromAxisAngle(HINGE_AXIS,player.theta-BEAGLE.earBindPitch));
 bones.body_pitch.quaternion.copy(rest.body_pitch);
 const phase=(time+instance.id*1.7)%4.3;
 const blink=phase<.18?Math.sin(Math.PI*phase/.18)**2:0;
 for(const side of ['L','R'])bones[side+'_lid'].scale.z=1-.965*blink;
 instance.materials.forEach((m,i)=>m.color.copy(instance.colors[i]).lerp(WHITE,(player.hitFlash||0)*.65));
}

// A local geometric fallback uses the same anchored contact profile if an
// exported asset cannot be read offline. Keep it hidden during normal loading.
export function makeBeagleFallback(id=0,weaponEars=true){
 const root=new Group(),body=new Group(),tan=new MeshStandardMaterial({color:0xc6803d,roughness:.9}),
 white=new MeshStandardMaterial({color:0xfff7e8,roughness:.9}),dark=new MeshStandardMaterial({color:0x29231f}),
 accent=new MeshStandardMaterial({color:PLAYER_COLORS[id],roughness:.9});
 body.position.y=PIVOT_HEIGHT;root.add(body);
 const volume=(p,scale,mat)=>{
  const mesh=new Mesh(new SphereGeometry(1,20,14),mat);mesh.position.set(...p);mesh.scale.set(...scale);
  mesh.position.y-=PIVOT_HEIGHT;
  mesh.castShadow=true;mesh.receiveShadow=true;body.add(mesh);return mesh;
 };
 volume([0,1.15-BEAGLE.bodyFloor,0],[.53,.55,.58],tan);
 volume([0,.3-BEAGLE.bodyFloor,0],[.23,.30,.29],white);
 volume([.49,.83-BEAGLE.bodyFloor,0],[.15,.17,.34],white);
 volume([.635,.86-BEAGLE.bodyFloor,0],[.03,.045,.065],dark);
 volume([.21,.51-BEAGLE.bodyFloor,0],[.03,.13,.24],accent);
 for(const side of [-1,1]){
  volume([.53,1.14-BEAGLE.bodyFloor,side*.28],[.025,.10,.13],dark);
  volume([.08,.07-BEAGLE.bodyFloor,side*.19],[.14,.07,.13],white);
 }
 const hinges={};
 if(!weaponEars){
  for(const side of [-1,1])volume([0,.95-BEAGLE.bodyFloor,side*.73],[.25,.60,.23],tan);
  return {root,body,hinges};
 }
 for(const side of ['L','R']){
  const hinge=new Group();hinge.position.set(...BEAGLE.anchors[side]);hinge.position.y-=PIVOT_HEIGHT;body.add(hinge);hinges[side]=hinge;
  for(const c of BEAGLE.colliders.filter(c=>c.ear===side)){
   const a=new Vector3(...c.a),b=new Vector3(...c.b),d=b.clone().sub(a);
   const mesh=new Mesh(new CapsuleGeometry(c.radius,d.length(),4,8),tan);
   mesh.position.copy(a.add(b).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(UP,d.normalize());
   mesh.castShadow=true;mesh.receiveShadow=true;hinge.add(mesh);
  }
 }
 return {root,body,hinges};
}
