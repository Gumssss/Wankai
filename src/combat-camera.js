import {Vector3,Box3} from 'three';
import {CAT} from './orange-tabby-profile.js';
import {CHARACTERS} from './character-catalog.js';
import {visualWeaponSegments,hurtSegments,weaponPointFrame} from './physics.js';

// Include solid bodies, labels, all weapons and a short incoming-motion margin.
// Sampling the same authored transforms avoids character-specific camera rules.
export function combatFramePoints(players){
 const points=[];
 for(const p of players){
  const c=CHARACTERS[p.characterId],bounds=c.bounds,heading=p.phi+(p.facingOffset||0),co=Math.cos(heading),si=Math.sin(heading);
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])
   points.push(new Vector3(p.p.x+x*co-z*si,p.p.y+y-c.bodyFloor,p.p.z+x*si+z*co));
  points.push(new Vector3(p.p.x,p.p.y+1.7,p.p.z));
  for(const s of [...hurtSegments(p).map(s=>({...s,body:true})),...visualWeaponSegments(p)])for(const [i,point]of [s.a,s.b].entries()){
   const velocity=s.body?p.v:weaponPointFrame(p,i?s.localB:s.localA,s.anchor).velocity;
   const radius=s.radius+(p.characterId==='orange-tabby'?CAT.contactUndercoverage+.06:.2);
   for(const t of [0,.08])for(const x of [-radius,radius])for(const y of [-radius,radius])for(const z of [-radius,radius])
    points.push(new Vector3(point.x+x+velocity.x*t,point.y+y+velocity.y*t,point.z+z+velocity.z*t));
  }
 }
 return points;
}

export function perspectivePullback(camera,points,margin={x:.78,top:.52,bottom:.76}){
 camera.updateMatrixWorld();
 const slope=Math.tan(camera.fov*Math.PI/360)/camera.zoom,horizontal=slope*Math.max(camera.aspect,1e-6);
 let needed=0;
 for(const p of points){
  const local=p.clone().applyMatrix4(camera.matrixWorldInverse),depth=-local.z;
  needed=Math.max(needed,Math.abs(local.x)/(horizontal*margin.x)-depth,
   Math.abs(local.y)/(slope*(local.y>=0?margin.top:margin.bottom))-depth,camera.near+.3-depth);
 }
 return needed;
}

export function createCombatCameraRig(camera,position,target){
 const base=new Vector3(...position),focus=new Vector3(...target);
 return {camera,focus,baseFocus:focus.clone(),direction:base.clone().sub(focus).normalize(),
  distance:base.distanceTo(focus),pullback:0,zoom:1,initialized:false};
}
export function resetCombatCamera(rig){rig.initialized=false;rig.pullback=0;rig.zoom=1;rig.focus.copy(rig.baseFocus);}

export function updateCombatCamera(rig,players,dt,displayPoint=p=>p.clone()){
 const {camera}=rig,points=combatFramePoints(players).map(displayPoint);
 if(!points.length)return;
 const center=new Box3().setFromPoints(points).getCenter(new Vector3());
 if(!rig.initialized)rig.focus.copy(center);
 else rig.focus.lerp(center,1-Math.exp(-4*Math.max(0,dt)));
 camera.position.copy(rig.focus).addScaledVector(rig.direction,rig.distance);
 camera.lookAt(rig.focus);camera.updateMatrixWorld();
 if(camera.isPerspectiveCamera){
  const needed=perspectivePullback(camera,points);
  rig.pullback=!rig.initialized||needed>rig.pullback?needed:rig.pullback+(needed-rig.pullback)*(1-Math.exp(-3*dt));
  camera.translateZ(rig.pullback);
  camera.far=Math.max(120,rig.distance+rig.pullback+50);
 }else{
  // Training uses the same arena, including its outer wall; its orthographic
  // view must make room for a dummy/fighter at that wall as well.
  let needed=1;
  for(const p of points){const local=p.clone().applyMatrix4(camera.matrixWorldInverse);
   needed=Math.min(needed,camera.right*.78/(Math.abs(local.x)||1e-8),camera.top*(local.y>0?.52:.76)/(Math.abs(local.y)||1e-8));}
  rig.zoom=!rig.initialized||needed<rig.zoom?needed:rig.zoom+(needed-rig.zoom)*(1-Math.exp(-3*dt));
  camera.zoom=rig.zoom;camera.far=Math.max(120,rig.distance+100);
 }
 camera.updateProjectionMatrix();camera.updateMatrixWorld();rig.initialized=true;
}

export function opponentIndicator(camera,point,viewport){
 const projected=new Vector3(point.x,point.y,point.z).project(camera);
 const visible=Math.abs(projected.x)<.88&&Math.abs(projected.y)<.78&&Math.abs(projected.z)<1;
 const local=new Vector3(point.x,point.y,point.z).applyMatrix4(camera.matrixWorldInverse);
 let dx=local.x,dy=-local.y;
 if(local.z>=0)dy=Math.max(Math.abs(dy),1); // Behind the camera points downward.
 const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
 const halfW=Math.max(10,viewport.width/2-35),halfH=Math.max(10,viewport.height/2-125);
 const t=Math.min(halfW/(Math.abs(dx)||1e-8),halfH/(Math.abs(dy)||1e-8));
 return {visible,x:viewport.x+viewport.width/2+dx*t,y:viewport.height/2+dy*t,angle:Math.atan2(dy,dx)};
}
