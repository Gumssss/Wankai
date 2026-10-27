import {BEAGLE} from './beagle-profile.js';

export const BEAGLE_SKILL=Object.freeze({
 normalTurnSpeed:1.15, steeringGain:.7, spinSpeed:4.25,
 duration:5, hoverHeight:.35,
 spreadSpeed:2.8, pitchAcceleration:40, hoverGain:25, hoverDamping:9,
});
const v=(x=0,y=0,z=0)=>({x,y,z});
const turn=(p,a)=>v(p.x*Math.cos(a)+p.y*Math.sin(a),-p.x*Math.sin(a)+p.y*Math.cos(a),p.z);
const yaw=(p,a)=>v(p.x*Math.cos(a)-p.z*Math.sin(a),p.y,p.x*Math.sin(a)+p.z*Math.cos(a));
const dyaw=p=>v(-p.z,0,p.x);
const dturn=p=>v(p.y,-p.x,0);
export const beagleEarYaw=(p,anchor)=>-(Math.sign(anchor[2])||1)*(p.earSpread||0)+(p.earLag||0);

// The same composed transform drives skinning, fallback and contact queries.
// Splay and lag are finite actuators, with their rates included in hit velocity.
export function beaglePointFrame(p,local,anchor){
 const pivot=.85-BEAGLE.bodyFloor;
 const a=anchor?beagleEarYaw(p,anchor):0;
 const ear=anchor?yaw(turn(local,p.theta),a):v();
 const inner=anchor?v(anchor[0]+ear.x,anchor[1]-pivot+ear.y,anchor[2]+ear.z):v(local.x,local.y-pivot,local.z);
 const r=yaw(v(inner.x,inner.y+pivot,inner.z),p.phi);
 const world=q=>yaw(q,p.phi);
 const jt=anchor?world(yaw(dturn(turn(local,p.theta)),a)):v();
 const jl=anchor?world(dyaw(ear)):v(),sign=anchor?-(Math.sign(anchor[2])||1):0;
 const js=v(jl.x*sign,jl.y*sign,jl.z*sign),jp=dyaw(r);
 const velocity=v(...['x','y','z'].map(k=>p.v[k]+jt[k]*p.wt+jp[k]*p.wp+
   js[k]*(p.earSpreadRate||0)+jl[k]*(p.earLagRate||0)));
 return {r,jt,jp,js,jl,point:v(p.p.x+r.x,p.p.y+r.y,p.p.z+r.z),velocity};
}

export function updateBeagleSkill(p,held,dt){
 const wants=!!held;
 const trigger=p.skillRequested || (wants&&!p.skillWasHeld);
 p.skillRequested=false;p.skillWasHeld=wants;
 if(trigger&&!p.skillActive&&(p.earSpread||0)<.001){p.skillActive=true;p.skillRemaining=BEAGLE_SKILL.duration;}
 if(p.skillActive){p.skillRemaining=Math.max(0,p.skillRemaining-dt);p.skillActive=p.skillRemaining>1e-8;}
 const ready=Math.abs(Math.atan2(Math.sin(p.theta+Math.PI/2),Math.cos(p.theta+Math.PI/2)))<.3;
 const target=p.skillActive&&ready?Math.PI/2:0;
 const before=p.earSpread||0,amount=Math.min(BEAGLE_SKILL.spreadSpeed*dt,Math.abs(target-before));
 p.earSpread=before+Math.sign(target-before)*amount;p.earSpreadRate=(p.earSpread-before)/dt;
 const lagTarget=p.earSpread>0?-.028*p.wp:0;
 p.earLagRate=(p.earLagRate||0)+(55*(lagTarget-(p.earLag||0))-12*(p.earLagRate||0))*dt;
 p.earLag=(p.earLag||0)+p.earLagRate*dt;
}

export function applyBeagleHover(p,dt,gravity){
 if(!p.skillActive)return;
 const speed=Math.min(1,Math.abs(p.wp)/3);
 const ready=Math.max(0,(p.earSpread/(Math.PI/2)-.65)/.35)*speed;
 const target=BEAGLE.bodyFloor+BEAGLE_SKILL.hoverHeight;
 const thrust=Math.max(0,Math.min(gravity+12,gravity+BEAGLE_SKILL.hoverGain*(target-p.p.y)-BEAGLE_SKILL.hoverDamping*p.v.y));
 p.v.y+=thrust*ready*dt;
}
