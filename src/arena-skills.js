// Host-owned CR7 / Mean Girl abilities. Rendering never decides damage.
import {obstacleContact} from './arena-obstacles.js';
import {SKILLS} from './skills.js';
import {ARENA_PROFILE} from './arena-profile.js';
import {fighterScale, fighterDamageScale} from './match-growth.js';
import {CHARACTERS} from './character-catalog.js';

export const SOCCER_RADIUS = 0.46;
export const modernSkill=p=>p.skill==='ricochet'||p.skill==='perfume';
// CR7 commits to the kick once accepted; only perfume startup is interruptible.
export const interruptibleWindup=p=>p.skill==='perfume'&&p.abilityPhase==='windup';
export const protectedPlayer=p=>p.skill==='ricochet'&&p.abilityPhase==='active';
export const stowed=p=>p.skill==='ricochet'&&['active','recovery'].includes(p.abilityPhase);
export function clearBleeding(p){p.bleedStacks=0;p.bleedTick=0;p.bleedOwner=null;}
export function stepBleeding(world,p,dt){
 if(p.health<=0||world.winner!==null){clearBleeding(p);return;}
 if(!(p.bleedStacks>0))return;
 p.bleedTick+=dt;
 const interval=SKILLS.perfume.bleedInterval;
 // Exposure never resets the tick clock or adds another stack.
 while(p.bleedTick>=interval-1e-9&&p.health>0){
  p.bleedTick=Math.max(0,p.bleedTick-interval);
  const damage=Math.min(p.bleedStacks,Math.max(0,p.health-(world.endless?1:0)));
  if(damage>0)abilityHit(world,p,damage,p.bleedOwner,'bleed',p.p);
 }
 if(p.health<=0)clearBleeding(p);
}
export function cancelAbility(world,p){
 p.abilityPhase='idle';p.skillActive=false;p.skillTime=0;p.abilityTime=0;p.launchPending=false;p.perfumeHitTargets=0;p.perfumeStep=0;
 world.projectiles=world.projectiles.filter(s=>s.type!=='soccer'||s.owner!==p.id);
}
export function abilityHit(world,target,damage,owner,source,point){
 if(protectedPlayer(target)||target.health<=0)return false;
 target.health=Math.max(world.endless?1:0,target.health-damage);target.hitFlash=1;
 world.lastHit={damage,speed:0,acceleration:0,turnShare:0,attacker:owner,source};
 if(interruptibleWindup(target))cancelAbility(world,target);
 world.events.push({type:'hit',source,weapon:source,attacker:owner,target:target.id,damage,point:{...point},normal:{x:0,y:1,z:0},speed:0,acceleration:0,turnShare:0,strength:source==='bleed'?0:.25});
 return true;
}
export function updateAbility(world,p,tap,dt){
 p.perfumeStep=p.skill==='perfume'&&p.abilityPhase==='active'?Math.min(dt,Math.max(0,p.abilityTime)):0;
 const s=SKILLS[p.skill];p.skillCooldown=Math.max(0,p.skillCooldown-dt);
 if(p.health<=0||world.winner!==null){cancelAbility(world,p);return;}
 if(tap&&p.skillCooldown===0&&p.abilityPhase==='idle'&&p.stamina>=s.cost&&(p.skill!=='ricochet'||p.grounded||p.staffGrounded)){
  p.stamina-=s.cost;p.staminaRestTime=0;p.skillCooldown=s.cooldown;p.abilityPhase='windup';p.abilityTime=s.windup;p.skillTime=s.windup+s.duration+s.recovery;p.skillActive=true;p.abilityHealth=p.health;p.sprayYaw=p.bodyYaw;p.perfumeHitTargets=0;
  world.events.push({type:'skill',skill:p.skill,player:p.id,characterId:p.characterId,point:{...p.p}});
  // Commit instant abilities before this step's incoming collision damage.
  // Only CR7 grants protection, after safe projectile placement succeeds.
  if(s.windup===0){
   p.launchPending=true;finishAbilityTick(world,p);
   if(p.skill==='perfume'&&p.abilityPhase==='active')p.perfumeStep=Math.min(dt,p.abilityTime);
   return;
  }
 }
 if(!p.skillActive)return;
 p.staminaRestTime=0;p.skillTime=Math.max(0,p.skillTime-dt);p.abilityTime-=dt;
 if(interruptibleWindup(p)&&p.health<p.abilityHealth){cancelAbility(world,p);return;}
 if(p.abilityPhase==='active'&&p.skill==='perfume'){
  const delta=Math.atan2(Math.sin(p.bodyYaw-p.sprayYaw),Math.cos(p.bodyYaw-p.sprayYaw));p.sprayYaw+=Math.max(-Math.PI/2*dt,Math.min(Math.PI/2*dt,delta));
 }
 if(p.abilityTime>1e-8)return;
 if(p.abilityPhase==='windup')p.launchPending=true;
 else if(p.abilityPhase==='active'){
  world.projectiles=world.projectiles.filter(q=>q.type!=='soccer'||q.owner!==p.id);
  p.abilityPhase='recovery';p.abilityTime=s.recovery;if(p.skill==='ricochet'){p.releaseGate=true;p.v.x=p.v.z=0;}
 }else{p.abilityPhase='idle';p.skillActive=false;p.skillTime=0;}
}
export function finishAbilityTick(world,p){
 if(!p.launchPending)return;p.launchPending=false;
 if(p.abilityPhase!=='windup'||(interruptibleWindup(p)&&p.health<p.abilityHealth)||p.health<=0||world.winner!==null){if(p.abilityPhase==='windup')cancelAbility(world,p);return;}
 const skill=SKILLS[p.skill],scale=fighterScale(p);
 const radius=SOCCER_RADIUS*(skill.sizeMultiplier??1)*scale;
 const launch=p.skill==='ricochet'?soccerSpawn(world,p,radius):null;
 if(p.skill==='ricochet'&&!launch){
  // A huge ball may not fit beside a corner. No projectile is placed through
  // a prop; return the reserved cost and cooldown so the player can reposition.
  p.stamina+=skill.cost;p.skillCooldown=0;cancelAbility(world,p);return;
 }
 p.abilityPhase='active';p.abilityTime=SKILLS[p.skill].duration;
 world.events.push({type:'skill-release',skill:p.skill,player:p.id,point:{...p.p}});
 if(p.skill==='ricochet'){
  p.wt=p.wp=p.driveT=p.driveP=0;p.releaseGate=true;p.abilityAttackGate=true;
  const c = Math.cos(p.bodyYaw), s = Math.sin(p.bodyYaw);
  world.projectiles.push({id:++world.projectileId,type:'soccer',owner:p.id,
   p:launch,v:{x:c*skill.speed,y:0,z:s*skill.speed},
   radius,damage:skill.damage*fighterDamageScale(p),life:skill.duration,spin:0,bounce:0,lastHit:-Infinity,touching:false});
 }
}

// Search in front first, then locally around the caster. All candidate centres
// remain on the same unobstructed side of props; only the owner is ignored.
export function soccerSpawn(world,p,radius){
 const scale=fighterScale(p),gap=.1*scale,offset=(CHARACTERS[p.characterId]?.bodyRadius??.44)*scale+radius+gap;
 const limit=world.arenaRadius-radius-.002;if(limit<=0)return null;
 const ground=ARENA_PROFILE.floorHeight+.01,origin={x:p.p.x,y:ground,z:p.p.z};
 const turns=[0];for(let i=1;i<=16;i++){turns.push(i*Math.PI/16);if(i<16)turns.push(-i*Math.PI/16);}
 for(const turn of turns){
  const yaw=p.bodyYaw+turn,x=p.p.x+Math.cos(yaw)*offset,z=p.p.z+Math.sin(yaw)*offset;
  if(Math.hypot(x,z)>limit||world.obstacles.some(o=>obstacleContact(o,x,z,radius+.002)))continue;
  if(occluded(origin,{x,y:ground,z},world.obstacles))continue;
  return {x,y:ARENA_PROFILE.floorHeight+radius,z};
 }
 return null;
}
// Segment versus expanded circular collider. t is a fraction of this sweep.
function circle(x,z,dx,dz,cx,cz,r,inside=false){
 const ox=x-cx,oz=z-cz,a=dx*dx+dz*dz,b=ox*dx+oz*dz,c=ox*ox+oz*oz-r*r;
 if(a<1e-16)return null;const disc=b*b-a*c;if(disc<0)return null;
 let t=(-b+(inside?1:-1)*Math.sqrt(disc))/a;if(!inside&&c<0)t=0;
 if(t<0||t>1)return null;let nx=ox+t*dx,nz=oz+t*dz;const d=Math.hypot(nx,nz)||1;nx/=d;nz/=d;if(inside){nx=-nx;nz=-nz;}return {t,nx,nz};
}
function box(x,z,dx,dz,o,r){
 const c=Math.cos(o.angle),s=Math.sin(o.angle),px=(x-o.x)*c+(z-o.z)*s,pz=-(x-o.x)*s+(z-o.z)*c,vx=dx*c+dz*s,vz=-dx*s+dz*c;
 let enter=0,leave=1,nx=0,nz=0;
 for(const [p,v,h,axis]of [[px,vx,o.halfX+r,0],[pz,vz,o.halfZ+r,1]]){
  if(Math.abs(v)<1e-10){if(Math.abs(p)>h)return null;continue;}
  let lo=(-h-p)/v,hi=(h-p)/v,n=-1;if(lo>hi){[lo,hi]=[hi,lo];n=1;}
  if(lo>=enter){enter=lo;nx=axis===0?n:0;nz=axis===1?n:0;}leave=Math.min(leave,hi);if(enter>leave)return null;
 }
 if(leave<0||enter>1)return null;
 if(nx===0&&nz===0){const ax=o.halfX+r-Math.abs(px),az=o.halfZ+r-Math.abs(pz);if(ax<az)nx=Math.sign(px)||1;else nz=Math.sign(pz)||1;}
 return {t:Math.max(0,enter),nx:nx*c-nz*s,nz:nx*s+nz*c};
}
export function occluded(a,b,obstacles){
 return obstacles.some(o=>Math.min(a.y,b.y)<=o.height&& (o.kind==='pillar'?circle(a.x,a.z,b.x-a.x,b.z-a.z,o.x,o.z,o.radius):box(a.x,a.z,b.x-a.x,b.z-a.z,o,0)));
}
const dot3=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const sub3=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const along=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
function closestAxis(point,body){
 const axis=sub3(body.b,body.a),delta=sub3(point,body.a),den=dot3(axis,axis);
 return along(body.a,body.b,den?Math.max(0,Math.min(1,dot3(axis,delta)/den)):0);
}
function sweepBody(point,dx,dz,body,radius){
 const axis=sub3(body.b,body.a),length2=dot3(axis,axis),w=sub3(point,body.a),v={x:dx,y:0,z:dz},r=body.radius+radius,candidates=[];
 const root=(u,d)=>{const a=dot3(d,d),b=dot3(u,d),c=dot3(u,u)-r*r,disc=b*b-a*c;if(a<1e-16||disc<0)return null;const t=c<0?0:(-b-Math.sqrt(disc))/a;return t>=0&&t<=1?t:null;};
 for(const end of [body.a,body.b]){const t=root(sub3(point,end),v);if(t!==null)candidates.push(t);}
 if(length2>1e-12){
  const wa=dot3(w,axis)/length2,va=dot3(v,axis)/length2;
  const t=root({x:w.x-axis.x*wa,y:w.y-axis.y*wa,z:w.z-axis.z*wa},{x:v.x-axis.x*va,y:-axis.y*va,z:v.z-axis.z*va});
  if(t!==null&&wa+t*va>=0&&wa+t*va<=1)candidates.push(t);
 }
 if(!candidates.length)return null;
 const t=Math.min(...candidates),hit={x:point.x+dx*t,y:point.y,z:point.z+dz*t},nearest=closestAxis(hit,body);
 let nx=hit.x-nearest.x,nz=hit.z-nearest.z,n=Math.hypot(nx,nz);if(n<1e-8){nx=-dx;nz=-dz;n=Math.hypot(dx,dz)||1;}
 return {t,nx:nx/n,nz:nz/n};
}
export function stepSoccer(world,shot,dt,hurtSegments){
 shot.life-=dt;shot.spin+=Math.hypot(shot.v.x,shot.v.z)/shot.radius*dt;
 const owner=world.players[shot.owner];if(!owner||!protectedPlayer(owner)||shot.life<=0)return false;
 const target=world.players.find(p=>p.id!==shot.owner),bodies=target?hurtSegments(target):[];
 if(bodies.every(b=>{const d=sub3(shot.p,closestAxis(shot.p,b));return dot3(d,d)>(b.radius+shot.radius+.04)**2;}))shot.touching=false;
 const limit=world.arenaRadius-shot.radius,rad=Math.hypot(shot.p.x,shot.p.z);if(rad>limit){shot.p.x*=limit/rad;shot.p.z*=limit/rad;}
 for(const o of world.obstacles){const contact=obstacleContact(o,shot.p.x,shot.p.z,shot.radius);if(contact){shot.p.x+=contact.nx*(contact.depth+.002);shot.p.z+=contact.nz*(contact.depth+.002);}}
 let left=dt, bounceEvent;
 for(let pass=0;pass<8&&left>1e-8;pass++){
  const dx=shot.v.x*left,dz=shot.v.z*left;
  let best=circle(shot.p.x,shot.p.z,dx,dz,0,0,world.arenaRadius-shot.radius,true);
  if(best)best.surface='wall';
  for(const o of world.obstacles){const hit=o.kind==='pillar'?circle(shot.p.x,shot.p.z,dx,dz,o.x,o.z,o.radius+shot.radius):box(shot.p.x,shot.p.z,dx,dz,o,shot.radius);if(hit&&(!best||hit.t<best.t))best={...hit,surface:'obstacle'};}
  for(const body of bodies){const hit=sweepBody(shot.p,dx,dz,body,shot.radius);if(hit&&(!best||hit.t<best.t))best={...hit,target,body};}
  if(!best){shot.p.x+=dx;shot.p.z+=dz;break;}
  shot.p.x+=dx*best.t;shot.p.z+=dz*best.t;
  if(best.target&&!shot.touching){if(world.time-shot.lastHit>=.6&&abilityHit(world,target,shot.damage??SKILLS.ricochet.damage,shot.owner,'soccer',shot.p))shot.lastHit=world.time;shot.touching=true;}
  const dot=shot.v.x*best.nx+shot.v.z*best.nz;
  if(dot<0){
   shot.v.x-=2*dot*best.nx;shot.v.z-=2*dot*best.nz;shot.bounce++;
   if(best.surface&&-dot>=.35){
    const strength = Math.min(1, -dot / SKILLS.ricochet.speed);
    if(!bounceEvent||strength>bounceEvent.strength)bounceEvent={type:'soccer-bounce',surface:best.surface,player:shot.owner,weapon:'soccer-ball',
     point:{x:shot.p.x-best.nx*shot.radius,y:shot.p.y,z:shot.p.z-best.nz*shot.radius},strength,time:world.time};
   }
  }
  let push=.002;
  if(best.body){const axis=closestAxis(shot.p,best.body),dy=shot.p.y-axis.y;
   push+=Math.max(0,Math.sqrt(Math.max(0,(best.body.radius+shot.radius)**2-dy*dy))-Math.hypot(shot.p.x-axis.x,shot.p.z-axis.z));
  }
  shot.p.x+=best.nx*push;shot.p.z+=best.nz*push;left*=1-best.t;
 }
 if(bounceEvent)world.events.push(bounceEvent);
 return true;
}
// Closest point to the finite sector extruded +/- .55 m around the nozzle.
// Distance to this convex volume along a capsule axis is convex as well.
export function perfumeFrame(p){
 const scale = fighterScale(p), c = Math.cos(p.sprayYaw || 0), s = Math.sin(p.sprayYaw || 0);
 const offset = 0.7 * scale;
 return {c,s,origin:{x:p.p.x+c*offset,y:p.p.y+offset,z:p.p.z+s*offset},reach:3.4*scale,halfHeight:.55*scale};
}

function perfumeContact({origin,c,s,reach,halfHeight},body){
 const distance=t=>{
  const q=along(body.a,body.b,t),dx=q.x-origin.x,dz=q.z-origin.z,x=dx*c+dz*s,z=-dx*s+dz*c;
  const angle=Math.max(-35*Math.PI/180,Math.min(35*Math.PI/180,Math.atan2(z,x))),ca=Math.cos(angle),sa=Math.sin(angle);
  const alongCone=Math.max(0,Math.min(reach,x*ca+z*sa)),dy=Math.max(0,Math.abs(q.y-origin.y)-halfHeight);
  return {d:(x-ca*alongCone)**2+(z-sa*alongCone)**2+dy*dy,q};
 };
 let lo=0,hi=1;for(let i=0;i<20;i++){const a=(2*lo+hi)/3,b=(lo+2*hi)/3;if(distance(a).d<distance(b).d)hi=b;else lo=a;}
 const best=[distance(0),distance(1),distance((lo+hi)/2)].sort((a,b)=>a.d-b.d)[0];
 return best.d<=body.radius**2?best.q:null;
}
export function applyPerfume(world,p,dt,hurtSegments){
 if(p.skill!=='perfume'||!p.perfumeStep||p.health<=0||world.winner!==null)return;
 p.perfumeStep=0;
 const frame=perfumeFrame(p);
 for(const q of world.players){if(q.id===p.id||q.health<=0||protectedPlayer(q))continue;
 if((p.perfumeHitTargets||0)&(1<<q.id))continue;
 if(!hurtSegments(q).some(body=>{const point=perfumeContact(frame,body);return point&&!occluded(frame.origin,point,world.obstacles);}))continue;
 if(!(q.bleedStacks>0))q.bleedTick=0;
 q.bleedStacks=(q.bleedStacks||0)+1;q.bleedOwner=p.id;p.perfumeHitTargets=(p.perfumeHitTargets||0)|(1<<q.id);
 world.events.push({type:'bleed-stack',source:'perfume',attacker:p.id,target:q.id,stacks:q.bleedStacks,point:{...q.p}});
 }
}
