/** Isolated research only. Does not import, patch or replace production source.
 * Reduced coordinates: translating upright body + inertial paw-cycle + yaw.
 * Paw geometry is procedural; impulses act through the same Jacobians.
 * This is NOT Wankai combat, full articulated dynamics or final motor tuning.
 */
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'assets/concepts/orange-tabby/motion-v01');
await mkdir(out,{recursive:true});
const dt=1/360, fps=24, G=19;
const inv=[1/1.2,1/1.2,1/1.2,1/.36,1/.85];
const geom={shoulder:[.18,.65,1.02],upper:.62,lower:.66,pawRadius:.20,
  ellipseCenter:[.18,0,-.72],ellipseRadius:[.62,0,.32],stanceBHeight:.35};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function endpoint(q,yaw,side,height=0){
  const a=q+(side<0?Math.PI:0), x=.18-.62*Math.cos(a), z=-.72+.32*Math.sin(a);
  const local=[geom.shoulder[0]+x,side*.65,geom.shoulder[2]+height+z];
  const c=Math.cos(yaw),s=Math.sin(yaw),world=[c*local[0]-s*local[1],s*local[0]+c*local[1],local[2]];
  const dx=.62*Math.sin(a),dq=[c*dx,s*dx,.32*Math.cos(a)];
  return {local,world,dq,dyaw:[-world[1],world[0],0]};
}
function row(state,time,input,contacts){
  return {time,input,p:state.x.slice(0,3),q:state.x[3],yaw:state.x[4],
    v:state.v.slice(0,3),qdot:state.v[3],yawdot:state.v[4],contacts};
}
const definitions=[
  ...[['w',1,0,'W'],['s',-1,0,'S'],['a',0,1,'A'],['d',0,-1,'D'],
    ['wa',1,1,'W + A'],['wd',1,-1,'W + D'],['sa',-1,1,'S + A'],['sd',-1,-1,'S + D']]
    .map(([id,stroke,turn,key])=>({id,stroke,turn,key,duration:3.5,kind:'support',group:'controls',
      title:stroke?`${key} / ${stroke>0?'forward':'reverse'} rake${turn?' + steering':''}`:`${key} / ${turn>0?'left':'right'} heading sweep`,
      detail:stroke?'Alternating paws; floor reaction supplies travel':'Turn heading with attached paws; no walking drive'})),
  {id:'release-reverse',duration:6,kind:'support',group:'controls',title:'Release, coast, brake, reverse',detail:'W -> release -> S -> release; continuous phase and velocity'},
  {id:'yaw-reverse',duration:5,kind:'support',group:'controls',title:'Steering release and reversal',detail:'A -> release -> D -> release; attached paws keep their heading'},
  {id:'opposites',duration:4,kind:'support',group:'controls',title:'Opposite keys cancel their axis',detail:'W + S, then A + D; no powered phase or heading change'},
  {id:'landing',duration:4,kind:'support',group:'controls',title:'Landing and return to useful control',detail:'External 0.75-unit drop setup; no jump or special ability'},
];
const shots=[];
for(const def of definitions){
 const state={x:[0,0,def.id==='landing'?.75:0,0,0],v:[0,0,0,0,0]};
 for(const side of [-1,1])if(state.x[2]+endpoint(state.x[3],state.x[4],side).world[2]<geom.pawRadius)
   throw Error('Initial paw penetrates floor: '+def.id);
 const rows=[];let normalImpulse=0,minGap=1e6,maxAttachmentReach=0;
 for(let tick=0;tick<=Math.round(def.duration/dt);tick++){
  const time=tick*dt;
  let stroke=def.stroke??0,turn=def.turn??0,keys=def.key??'';
  if(def.id==='release-reverse'){
   stroke=time<.25?0:time<1.8?1:time<2.7?0:time<4.7?-1:0;
   keys=stroke>0?'W':stroke<0?'S':'RELEASE';
  }else if(def.id==='yaw-reverse'){
   stroke=0;turn=time<.25?0:time<1.65?1:time<2.2?0:time<3.7?-1:0;
   keys=turn>0?'A':turn<0?'D':'RELEASE';
  }else if(def.id==='opposites'){
   stroke=0;turn=0;keys=time<.25||time>3.5?'RELEASE':time<2?'W + S':'A + D';
  }else if(def.id==='landing'){
   stroke=time>1.5&&time<3.1?1:0;turn=0;keys=stroke?'W':'RELEASE';
  }else if(time<.3||time>def.duration-.65){stroke=0;turn=0;keys='RELEASE';}
  if(tick){
   // Bounded input torques; release retains phase/yaw momentum under damping.
   state.v[3]+=clamp((stroke*3.0-state.v[3])*12,-55,55)*dt*(stroke?1:0);
   state.v[3]*=Math.exp(-(stroke?.20:1.8)*dt);
   state.v[4]+=clamp((turn*1.15-state.v[4])*5,-8,8)*dt*(turn?1:0);
   state.v[4]*=Math.exp(-(turn?.25:2.2)*dt);
   state.v[2]-=G*dt;
   state.v[0]*=Math.exp(-.12*dt);state.v[1]*=Math.exp(-.12*dt);
   let contactCount=0;
   // Projected sequential point impulses, Coulomb friction, upright base support.
   for(let iteration=0;iteration<6;iteration++){
    if(state.x[2]<.006){
     state.v[2]=Math.max(state.v[2],Math.max(0,-state.x[2]*.18/dt));
     const friction=1.1*dt/6;
     state.v[0]*=Math.exp(-friction);state.v[1]*=Math.exp(-friction);
    }
    for(const side of [-1,1]){
     const e=endpoint(state.x[3],state.x[4],side),gap=state.x[2]+e.world[2]-geom.pawRadius;
     minGap=Math.min(minGap,gap);
     maxAttachmentReach=Math.max(maxAttachmentReach,Math.hypot(e.local[0]-.18,e.local[2]-1.02));
     if(gap>.012)continue;
     const jac=axis=>[axis===0?1:0,axis===1?1:0,axis===2?1:0,e.dq[axis],e.dyaw[axis]];
     const impulse=(j,lambda)=>j.forEach((v,i)=>state.v[i]+=v*inv[i]*lambda);
     const effective=j=>j.reduce((sum,v,i)=>sum+v*v*inv[i],0);
     const jn=jac(2),target=Math.max(0,-gap*.18/dt);
     const lambda=Math.max(0,(target-dot(jn,state.v))/effective(jn));
     impulse(jn,lambda);normalImpulse+=lambda;
     for(const axis of [0,1]){
      const jt=jac(axis),f=clamp(-dot(jt,state.v)/effective(jt),-.9*lambda,.9*lambda);impulse(jt,f);
     }
     if(iteration===0)contactCount++;
    }
   }
   for(let i=0;i<5;i++)state.x[i]+=state.v[i]*dt;
   // Small residual base-floor penetration correction, never a paw floor lift.
   if(state.x[2]<-.001){state.x[2]=0;state.v[2]=Math.max(0,state.v[2]);}
   if(tick%15===0)rows.push(row(state,time,keys,contactCount));
  }else rows.push(row(state,time,keys,0));
 }
 const end=rows.at(-1);
 const metrics={travel:end.p.slice(0,2),maxRise:Math.max(...rows.map(r=>r.p[2])),
  finalHeight:end.p[2],minimumPawFloorGap:minGap,totalNormalImpulse:normalImpulse,
  maxShoulderToPawDistance:maxAttachmentReach,contactSamples:rows.filter(r=>r.contacts).length,
  maxPhaseSpeed:Math.max(...rows.map(r=>Math.abs(r.qdot)))};
 if(!rows.every(r=>[...r.p,r.q,r.yaw,...r.v].every(Number.isFinite)))throw Error('Non-finite study '+def.id);
 if(maxAttachmentReach>geom.upper+geom.lower)throw Error('Unreachable wrist '+def.id);
 shots.push({...def,rows,metrics});
}
const data={version:'orange-tabby-motion-v01',date:'2026-10-19',fps,simulationHz:1/dt,geometry:geom,
 motor:{bodyMass:1.2,gravity:G,phaseInertia:.36,phaseTargetSpeed:3,phaseFeedback:12,phaseMaxAcceleration:55,
  phaseDamping:{powered:.20,released:1.8},yawInertia:.85,yawTargetSpeed:1.15,yawFeedback:5,yawMaxAcceleration:8},
 evidence:'Isolated reduced-coordinate support experiment, not Wankai gameplay. Upright base and yaw stabilization are approximations. Procedural paw-cycle path with finite generalized motor; point impulses react on translation and cycle/yaw.',
 limitations:['No damage, block or clash game solver is implemented. Combat shots are authored concepts.',
 'Not full two-link rigid-body dynamics; limb phase controls an elliptical endpoint path.',
 'No production geometry/rig or user motion acceptance; no gameplay source modified.'],shots};
await writeFile(path.join(out,'support-replay.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(shots.map(s=>({id:s.id,...s.metrics})),null,2));
