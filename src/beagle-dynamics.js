import { BEAGLE } from './beagle-profile.js';

// The body-pitch bone is 0.85 above the feet; player.p retains the game's
// original origin at 0.59. All physical and skinned points use this same pivot.
export const BEAGLE_MOTION = Object.freeze({
  pivotHeight: .85 - BEAGLE.bodyFloor,
  bodyMass: 1.2, earMass: .12, bodyInertia: .48, yawInertia: .46,
  jointDamping: .45, airDamping: .045, maxBodySpeed: 8, vaultSpeed: 7.8,
  sweepTorqueScale: 3, vaultTorqueScale: 4, takeoffHeight: 1.8,
});
const { pivotHeight: pivot } = BEAGLE_MOTION;
const vec = (x=0,y=0,z=0) => ({x,y,z});
const dot = (a,b) => a.x*b.x+a.y*b.y+a.z*b.z;
const turn = (p,angle) => {
  const s=Math.sin(angle),c=Math.cos(angle);
  return vec(p.x*c+p.y*s,-p.x*s+p.y*c,p.z);
};
const yaw = (p,angle) => {
  const s=Math.sin(angle),c=Math.cos(angle);
  return vec(p.x*c-p.z*s,p.y,p.x*s+p.z*c);
};
const derivative = p => vec(p.y,-p.x,0);
export const beagleVelocity = p => [p.v.x,p.v.y,p.v.z,p.bodyRate||0,p.wt,p.wp];
export function setBeagleVelocity(p,v) {
  p.v=vec(v[0],v[1],v[2]);p.bodyRate=v[3];p.wt=v[4];p.wp=v[5];
}

export function beaglePointFrame(p,local,anchor) {
  const beta=p.bodyPitch||0;
  const ear=anchor ? turn(local,p.theta) : vec();
  const inner=anchor ? vec(anchor[0]+ear.x,anchor[1]-pivot+ear.y,anchor[2]+ear.z)
    : vec(local.x,local.y-pivot,local.z);
  const body=turn(inner,beta),r=yaw(vec(body.x,body.y+pivot,body.z),p.phi);
  const jb=yaw(derivative(body),p.phi);
  const jt=anchor ? yaw(turn(derivative(ear),beta),p.phi) : vec();
  const jp=vec(-r.z,0,r.x),velocity=vec(
    p.v.x+jb.x*(p.bodyRate||0)+jt.x*p.wt+jp.x*p.wp,
    p.v.y+jb.y*(p.bodyRate||0)+jt.y*p.wt+jp.y*p.wp,
    p.v.z+jb.z*(p.bodyRate||0)+jt.z*p.wt+jp.z*p.wp);
  return {r,jb,jt,jp,point:vec(p.p.x+r.x,p.p.y+r.y,p.p.z+r.z),velocity};
}
const jacobian = f => [vec(1,0,0),vec(0,1,0),vec(0,0,1),f.jb,f.jt,f.jp];
const samples = [];
for(const anchor of Object.values(BEAGLE.anchors)) for(const sign of [-1,1])
  samples.push({anchor,local:vec(0,BEAGLE.length*(.5+sign/Math.sqrt(12)),0),mass:BEAGLE_MOTION.earMass/2});
const cache=new WeakMap();

function invert(a) {
  const rows=a.map((r,i)=>[...r,...Array.from({length:6},(_,j)=>+(i===j))]);
  for(let i=0;i<6;i++) {
    let best=i;for(let j=i+1;j<6;j++)if(Math.abs(rows[j][i])>Math.abs(rows[best][i]))best=j;
    [rows[i],rows[best]]=[rows[best],rows[i]];
    const divisor=rows[i][i];
    if(Math.abs(divisor)<1e-10)throw Error('Singular beagle mass matrix');
    for(let k=0;k<12;k++)rows[i][k]/=divisor;
    for(let j=0;j<6;j++)if(j!==i){const gain=rows[j][i];for(let k=0;k<12;k++)rows[j][k]-=gain*rows[i][k];}
  }
  return rows.map(r=>r.slice(6));
}
function mass(p) {
  const key=[p.bodyPitch||0,p.theta,p.phi,!!p.braced],previous=cache.get(p);
  if(previous&&key.every((v,i)=>v===previous.key[i]))return previous;
  const matrix=Array.from({length:6},()=>Array(6).fill(0));
  for(let i=0;i<3;i++)matrix[i][i]=BEAGLE_MOTION.bodyMass;
  matrix[3][3]=BEAGLE_MOTION.bodyInertia;
  const s=Math.sin(key[0]),c=Math.cos(key[0]);
  matrix[5][5]=BEAGLE_MOTION.yawInertia*c*c+BEAGLE_MOTION.bodyInertia*s*s;
  const points=samples.map(sample=>({...sample,frame:beaglePointFrame(p,sample.local,sample.anchor)}));
  for(const sample of points){
    sample.j=jacobian(sample.frame);
    for(let i=0;i<6;i++)for(let j=0;j<6;j++)matrix[i][j]+=sample.mass*dot(sample.j[i],sample.j[j]);
  }
  const inverse=invert(matrix);
  if(p.braced) {
    const column=inverse.map(row=>row[3]),denominator=inverse[3][3];
    for(let i=0;i<6;i++)for(let j=0;j<6;j++)inverse[i][j]-=column[i]*column[j]/denominator;
  }
  const result={key,matrix,inverse,points};cache.set(p,result);return result;
}
const multiply = (matrix,v) => matrix.map(row=>row.reduce((sum,x,i)=>sum+x*v[i],0));
function projected(frame,n) {return [n.x,n.y,n.z,dot(frame.jb,n),dot(frame.jt,n),dot(frame.jp,n)];}
export function beagleInverseMass(p,frame,n) {
  const j=projected(frame,n),response=multiply(mass(p).inverse,j);
  return j.reduce((sum,x,i)=>sum+x*response[i],0);
}
export function beagleImpulse(p,frame,force,pose=p) {
  const change=multiply(mass(pose).inverse,projected(frame,force)),v=beagleVelocity(p);
  setBeagleVelocity(p,v.map((x,i)=>x+change[i]));
}
export function projectBeagleContact(p,frame,normal,depth) {
  const j=projected(frame,normal),response=multiply(mass(p).inverse,j);
  const effective=j.reduce((sum,x,i)=>sum+x*response[i],0),gain=depth/effective;
  p.p.x+=response[0]*gain;p.p.y+=response[1]*gain;p.p.z+=response[2]*gain;
  p.bodyPitch+=response[3]*gain;p.theta+=response[4]*gain;p.phi+=response[5]*gain;
}
export function limitBeagleVelocity(p) {
  // Limit generalized speeds through impulses, preserving linear momentum.
  // Clipping just a bone's velocity would break its reaction on the body.
  for(let pass=0;pass<2;pass++)for(const [axis,limit] of [[4,24],[3,BEAGLE_MOTION.maxBodySpeed],[5,BEAGLE.maxAngularSpeed]]) {
    const velocity=beagleVelocity(p),speed=velocity[axis];
    if(Math.abs(speed)<=limit)continue;
    const inverse=mass(p).inverse,response=inverse[axis][axis];
    if(response<1e-10)continue;
    const impulse=(Math.sign(speed)*limit-speed)/response;
    setBeagleVelocity(p,velocity.map((x,i)=>x+inverse[i][axis]*impulse));
  }
  const {linear,totalMass}=beagleMomentum(p),speed=Math.hypot(...linear)/totalMass;
  if(speed>15) {
    const gain=(15/speed-1)/totalMass;
    p.v.x+=linear[0]*gain;p.v.y+=linear[1]*gain;p.v.z+=linear[2]*gain;
  }
}

// Generalized forces include gravity and the moving-joint inertial terms.
// The hinge motor is internal: Q_theta acts equally and oppositely on the ear
// and body. There is no launch impulse or input-driven translation/body clip.
export function stepBeagleVelocity(p,dt,gravity,swingInput,turnInput,power=1) {
  const system=mass(p),velocity=beagleVelocity(p),force=[0,-BEAGLE_MOTION.bodyMass*gravity,0,0,0,0];
  const momentum=multiply(system.matrix,velocity);
  force[0]-=.15*momentum[0];force[2]-=.15*momentum[2];
  const epsilon=1e-5,next={...p,bodyPitch:(p.bodyPitch||0)+velocity[3]*epsilon,
    theta:p.theta+velocity[4]*epsilon,phi:p.phi+velocity[5]*epsilon};
  for(const sample of system.points) {
    const nextJ=jacobian(beaglePointFrame(next,sample.local,sample.anchor));
    const bias=vec();
    for(let i=3;i<6;i++)for(const axis of ['x','y','z'])bias[axis]+=(nextJ[i][axis]-sample.j[i][axis])*velocity[i]/epsilon;
    const external=vec(-bias.x,-gravity-bias.y,-bias.z);
    for(let i=0;i<6;i++)force[i]+=sample.mass*dot(sample.j[i],external);
  }
  const beta=p.bodyPitch||0,dyaw=2*(BEAGLE_MOTION.bodyInertia-BEAGLE_MOTION.yawInertia)*Math.sin(beta)*Math.cos(beta);
  force[3]+=.5*dyaw*p.wp*p.wp;
  force[5]-=dyaw*velocity[3]*p.wp;
  force[4]-=BEAGLE_MOTION.jointDamping*p.wt;
  force[3]-=BEAGLE_MOTION.airDamping*velocity[3];
  force[5]-=BEAGLE_MOTION.airDamping*velocity[5];
  const acceleration=multiply(system.inverse,force);
  const result=velocity.map((x,i)=>x+acceleration[i]*dt);
  // A finite velocity motor stops adding torque at its target instead of
  // clipping one coordinate and injecting energy into the coupled body.
  if(swingInput) {
    const axis=p.vaulting ? 3 : 4,target=swingInput*(p.vaulting ? BEAGLE_MOTION.vaultSpeed : BEAGLE.maxAngularSpeed)*power;
    const response=system.inverse[axis][4];
    if(Math.abs(response)>1e-8) {
      // Contact/gravity can create a tiny counter-velocity at a planted ear;
      // overcoming that load is propulsion, not a reversal of a moving swing.
      const reversing=velocity[axis]*swingInput<-.5;
      const strength=reversing ? BEAGLE.brakeAcceleration : BEAGLE.motorAcceleration*power;
      const torque=(p.vaulting ? BEAGLE_MOTION.bodyInertia*BEAGLE_MOTION.vaultTorqueScale
        : BEAGLE.inertia*BEAGLE_MOTION.sweepTorqueScale)*strength;
      const requested=(target-result[axis])/response;
      const limit=reversing ? Math.min(torque*dt,BEAGLE.brakeAcceleration*dt/Math.abs(response)) : torque*dt;
      const impulse=Math.max(-limit,Math.min(limit,requested));
      for(let i=0;i<6;i++)result[i]+=system.inverse[i][4]*impulse;
    }
  }
  if(turnInput) {
    const target=turnInput*BEAGLE.maxAngularSpeed*power;
    const acceleration=BEAGLE.motorAcceleration*(result[5]*turnInput<0 ? 1 : power);
    const delta=Math.max(-acceleration*dt,Math.min(acceleration*dt,target-result[5]));
    const impulse=delta/system.inverse[5][5];
    for(let i=0;i<6;i++)result[i]+=system.inverse[i][5]*impulse;
  }
  setBeagleVelocity(p,result);
}

// Used by conservation checks and offline previews, including the ears' mass.
export function beagleMomentum(p) {
  const {matrix,points}=mass(p),velocity=beagleVelocity(p),generalized=multiply(matrix,velocity);
  const totalMass=BEAGLE_MOTION.bodyMass+BEAGLE_MOTION.earMass*2;
  const center=vec(p.p.x*BEAGLE_MOTION.bodyMass,(p.p.y+pivot)*BEAGLE_MOTION.bodyMass,p.p.z*BEAGLE_MOTION.bodyMass);
  for(const {frame,mass:sampleMass} of points)for(const axis of ['x','y','z'])center[axis]+=(p.p[axis]+frame.r[axis])*sampleMass;
  for(const axis of ['x','y','z'])center[axis]/=totalMass;
  return {center,linear:generalized.slice(0,3),pitch:generalized[3],energy:.5*velocity.reduce((sum,x,i)=>sum+x*generalized[i],0),totalMass};
}
