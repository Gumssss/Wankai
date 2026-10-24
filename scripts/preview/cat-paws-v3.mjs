// Pre-integration solver blockout. The proposed modules live only in output/.
import * as old from '../../output/cat-paws-v3/baseline/physics.js';
import * as next from '../../output/cat-paws-v3/staged/physics.js';
import {writeFile,mkdir} from 'node:fs/promises';
const out=new URL('../../output/cat-paws-v3/',import.meta.url);await mkdir(out,{recursive:true});
const defs=[];
for(const weapon of ['cat-paws']){
 for(const [theta,phi,key]of [[1,0,'W'],[-1,0,'S'],[0,-1,'A'],[0,1,'D'],[1,-1,'W+A'],[1,1,'W+D'],[-1,-1,'S+A'],[-1,1,'S+D']])
  defs.push({weapon,key,duration:key==='S'?6:3,input:t=>({theta:t>.25&&t<2.3?theta:0,phi:t>.25&&t<2.3?phi:0})});
 defs.push({weapon,key:'W / RELEASE / S',duration:4,input:t=>({theta:t<.25?0:t<1.3?1:t<1.8?0:t<3?-1:0,phi:0})});
 defs.push({weapon,key:'OPPOSITES CANCEL',duration:1,input:()=>({theta:0,phi:0})});
}

for(const weapon of ['cat-paws'])defs.push({weapon,key:'STRIKE / CLASH / RECOVERY',combat:true,duration:5,input:t=>({theta:t>.3&&t<3?1:0,phi:t>.3&&t<3?.35:0})});
const shots=[];
for(const def of defs){
 const trials=[];
 for(const api of [old,next]){
  const w=new api.ArenaPhysics();w.reset(false,!def.combat,{characterId:def.weapon==='cat-paws'?'orange-tabby':'beagle',weaponId:def.weapon},'sword',5);
  w.players[0].p=api.v3(0,api.CONFIG.bodyFloor+(def.weapon==='cat-paws'?.35:0),0);
  if(def.combat){w.players[0].p.y=2;w.players[0].theta=1.05;const b=w.players[1];b.p=api.v3(2.7,2,.8);b.phi=Math.PI;b.theta=1.5;}
  const rows=[],recent=[];
  for(let tick=0;tick<def.duration/api.CONFIG.step;tick++){
   const t=tick*api.CONFIG.step,input=def.input(t);w.step([input,{theta:-input.theta,phi:0}]);
   recent.push(...w.events.map(e=>({...e,time:t})));while(recent.length&&recent[0].time<t-.3)recent.shift();
   if(tick%6===0)rows.push({t,input,players:w.players.map(p=>({id:p.id,p:{...p.p},theta:p.theta,phi:p.phi,
    health:p.health,maxHealth:p.maxHealth,stamina:p.stamina,support:p.staffGrounded,skill:p.skillActive,
    segments:api.weaponSegments(p),visuals:(api.weaponStats(p).visualColliders||[]).map(s=>({...s,a:api.weaponPointFrame(p,api.v3(...s.a),s.anchor).point,b:api.weaponPointFrame(p,api.v3(...s.b),s.anchor).point})),body:api.hurtSegments(p)})),events:[...recent]});
  }trials.push(rows);
 }
 shots.push({weapon:def.weapon,key:def.key,duration:def.duration,speed:1,trials});
}
// Replay the identical recorded support/combat/ability segment at quarter speed.
for(const original of shots.filter(s=>s.key==='S'||s.key.startsWith('STRIKE')||s.key.startsWith('F /'))){
 const start=original.key.startsWith('F /')?4.7:.5,end=Math.min(original.duration,start+1);
 shots.push({...original,key:original.key+' / SAME EVENT',speed:.25,duration:(end-start)/.25,
 trials:original.trials.map(rows=>rows.filter(r=>r.t>=start&&r.t<end))});
}
let elapsed=0;const checklist=shots.map(s=>{const row={weapon:s.weapon,keys:s.key,start:elapsed,end:elapsed+s.duration,speed:s.speed};elapsed+=s.duration;return row;});
await writeFile(new URL('preview-replay.json',out),JSON.stringify({fps:30,type:'isolated solver blockout, not game footage',runtimeModified:false,shots}));
await writeFile(new URL('preview-coverage.json',out),JSON.stringify(checklist,null,2));
console.log({shots:shots.length,duration:elapsed});
