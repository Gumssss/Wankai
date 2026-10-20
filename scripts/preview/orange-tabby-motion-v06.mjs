/** Airborne detached giant-paw study. Current game solver adapted ONLY in memory.
 * Production files are never patched. This is proxy evidence, not game footage.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATA=path.join(ROOT,'assets/concepts/orange-tabby/motion-v06');
const OUT=path.join(ROOT,'output/orange-tabby-v06');
await mkdir(DATA,{recursive:true});await mkdir(OUT,{recursive:true});
const source=await readFile(path.join(ROOT,'src/physics.js'),'utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const replace=(text,from,to)=>{if(text.split(from).length!==2)throw Error('Adapter source changed: '+from.slice(0,70));return text.replace(from,to);};
const measurement=JSON.parse(await readFile(path.join(ROOT,'assets/concepts/orange-tabby/prepared-v02/measurements.json')));
const fit=JSON.parse(await readFile(path.join(ROOT,'assets/concepts/orange-tabby/prepared-v02/contact-fit.json')));
const geom={virtualPivotHeight:0,bodyFloor:.59,bodyHeight:1.45,restTheta:Math.PI/2,hoverHeight:.35,hoverGain:25,hoverDamping:9,
 bodyPosture:'selected seated Tripo cat, upright in a low hover',visibleConnection:false,
 model:'assets/concepts/orange-tabby/prepared-v02/orange-tabby-prepared-v02.glb',modelSha256:measurement.export_sha256,
 fittedContactCount:fit.colliders.length,measuredParts:measurement.parts.map(({name,minimum,maximum,pivot})=>({name,minimum,maximum,pivot}))};
const shapes=fit.colliders;
let code=source.replace(/from '(\.\/[^']+)'/g,(_,rel)=>`from '${new URL('../../src/'+rel.slice(2),import.meta.url).href}'`);
code=replace(code,"import {normalizeLoadout,isEarLoadout} from '","import {normalizeLoadout as originalNormalizeLoadout,isEarLoadout} from '");
code+=`
function normalizeLoadout(value){
 const id=typeof value==='string'?value:value?.weaponId;
 return ['catproto','dummy'].includes(id)?{characterId:'basic-fighter',weaponId:id}:originalNormalizeLoadout(value);
}
`;
code=replace(code,'export const WEAPONS = Object.freeze({',`export const WEAPONS = Object.freeze({
 catproto:Object.freeze({length:1.7,offset:0,radius:.44,bodyRadius:.58,inertia:4.1,yawAnchorInertia:.7,
 motorAcceleration:24,brakeAcceleration:30,maxAngularSpeed:4.25,initialTheta:Math.PI/2,
 colliders:Object.freeze(${JSON.stringify(shapes)})}),
 dummy:Object.freeze({length:.01,offset:0,radius:.01,inertia:1,motorAcceleration:0,brakeAcceleration:0,maxAngularSpeed:0,colliders:Object.freeze([])}),`);
code=replace(code,"export const characterStats=player=>CHARACTERS[player.characterId] || CHARACTERS['basic-fighter'];",
 "const CAT_CHARACTER=Object.freeze({...CHARACTERS['basic-fighter'],bodyRadius:.58});\nexport const characterStats=player=>player.weapon==='catproto'?CAT_CHARACTER:CHARACTERS[player.characterId] || CHARACTERS['basic-fighter'];");
code=replace(code,'export function weaponPointFrame(player, local, anchor) {',`export function weaponPointFrame(player, local, anchor) {
 if(player.weapon==='catproto'){
  const st=Math.sin(player.theta),ct=Math.cos(player.theta),sp=Math.sin(player.phi),cp=Math.cos(player.phi);
  const x=local.x*ct+local.y*st,z=local.z;
  const r=v3(x*cp-z*sp,-.59-local.x*st+local.y*ct,x*sp+z*cp);
  const dx=-local.x*st+local.y*ct;
  const jt=v3(dx*cp,-local.x*ct-local.y*st,dx*sp),jp=v3(-r.z,0,r.x);
  return {r,jt,jp,point:add(player.p,r),velocity:add(player.v,add(mul(jt,player.wt),mul(jp,player.wp)))};
 }`);
code=replace(code,'export function hurtSegments(player) {',`export function hurtSegments(player) {
 if(player.weapon==='catproto'){
  const shapes=${JSON.stringify(fit.hurt_shapes)};
  return shapes.map(shape=>({...shape,localA:v3(...shape.a),localB:v3(...shape.b),
   a:bodyPointFrame(player,v3(...shape.a)).point,b:bodyPointFrame(player,v3(...shape.b)).point}));
 }`);
// Finite rate feedback prevents normal A/D from turning the giant hands into a rotor.
code=replace(code,'const turnInput = clamp(input.phi || 0, -1, 1);',`const rawTurnInput=clamp(input.phi || 0,-1,1);
 const turnInput=p.weapon==='catproto'?(p.polarInput||rawTurnInput?clamp((rawTurnInput*1.15-p.wp)*.70,-1,1):0):rawTurnInput;`);
code=replace(code,'updateStamina(p, turnInput, dt);',"updateStamina(p,p.weapon==='catproto'?rawTurnInput:turnInput,dt);");
// Hover uses the beagle's bounded spring/damper lift equation, continuously for
// this ordinary floating-paw concept. It is a declared external lift force.
code=replace(code,'p.v.y -= CONFIG.gravity * dt;',`if(p.weapon==='catproto'){
 const target=CONFIG.bodyFloor+.35;
 const lift=clamp(CONFIG.gravity+25*(target-p.p.y)-9*p.v.y,0,CONFIG.gravity+12);
 p.v.y+=lift*dt;
}
p.v.y -= CONFIG.gravity * dt;`);
// The floating paws are supported in air instead of sagging into a severed-hand
// pose. Finite W/S motors and damping remain exactly in the existing drive.
code=replace(code,'const gravityAcceleration = CONFIG.gravity * center / radiusSquared * Math.sin(p.theta);',
 "const gravityAcceleration = p.weapon==='catproto'?0:CONFIG.gravity * center / radiusSquared * Math.sin(p.theta);");

await writeFile(path.join(OUT,'isolated-game-physics.mjs'),code);
const {ArenaPhysics,CONFIG,weaponPointFrame,weaponSegments,hurtSegments,closestSegments,v3}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const zero={theta:0,phi:0};
function supports(p){
 if(p.weapon!=='catproto'||!p.staffGrounded)return [];
 const segments=weaponSegments(p);
 return [0,24].map(start=>segments.slice(start,start+24).sort((a,b)=>(Math.min(a.a.y,a.b.y)-a.radius)-(Math.min(b.a.y,b.b.y)-b.radius))[0])
  .filter(s=>s&&Math.min(s.a.y,s.b.y)-s.radius<.06).map(s=>({x:s.a.x,y:0,z:s.a.z}));
}

function run(def){
 const arena=new ArenaPhysics();arena.reset(!!def.practice,def.solo!==false,'catproto',def.opponent||'dummy',5);
 const p=arena.players[0];p.p=v3(0,CONFIG.bodyFloor+geom.hoverHeight+(def.id==='landing'?.70:0),0);p.theta=def.theta??Math.PI/2;p.phi=def.phi??0;
 if(arena.players[1]){const b=arena.players[1];b.p=v3(...def.target);b.theta=def.targetTheta??.4;b.phi=def.targetPhi??Math.PI;}
 const initialOverlap=arena.players[1]?Math.max(0,...weaponSegments(p).flatMap(a=>hurtSegments(arena.players[1]).map(b=>a.radius+b.radius-closestSegments(a.a,a.b,b.a,b.b).distance))):0;
 const rows=[],events=[];
 for(let tick=0;tick<=Math.round(def.duration/CONFIG.step);tick++){
  const t=tick*CONFIG.step,input=def.inputs(t);if(tick)arena.step(input,CONFIG.step);
  for(const e of arena.events)events.push({time:t,...e});
  if(tick%3===0)rows.push({time:t,input:def.keys(t),players:arena.players.map(p=>({id:p.id,weapon:p.weapon,p:{...p.p},v:{...p.v},
   theta:p.theta,phi:p.phi,wt:p.wt,wp:p.wp,bodyPitch:p.bodyPitch,health:p.health,stamina:p.stamina,
   contact:p.staffGrounded,grounded:p.grounded,supportPoints:supports(p)})),events:arena.events.map(e=>({...e}))});
 }
 const last=rows.at(-1).players[0];
 const stats={minBaseClearance:Math.min(...rows.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),travel:[last.p.x,last.p.z],maxRise:Math.max(...rows.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),
  finalHeight:last.p.y-CONFIG.bodyFloor,hits:events.filter(e=>e.type==='hit'&&e.attacker===0).length,
  clashes:events.filter(e=>e.type==='clash').length,minStamina:Math.min(...rows.map(r=>r.players[0].stamina)),
  maxBodyPitch:Math.max(...rows.map(r=>Math.abs(r.players[0].bodyPitch||0))),
  initialOverlap,contactSamples:rows.filter(r=>r.players[0].contact).length};
 if(rows.some(r=>r.players.some(p=>!Number.isFinite(p.theta+p.phi+p.p.x+p.p.y+p.p.z))))throw Error('Nonfinite: '+def.id);
 return {...Object.fromEntries(Object.entries(def).filter(([k])=>!['inputs','keys'].includes(k))),rows,events,stats};
}
const move=(theta,phi)=>[{theta,phi}];
const defs=[
 {id:'s',group:'lift',duration:6,theta:Math.PI/2,title:'S / giant paws lift the cat into the air',detail:'Hold S, plant the paws, rise, release, descend and recover',
 inputs:t=>move(t>.4&&t<3.3?-1:0,0),keys:t=>t>.4&&t<3.3?'S':'RELEASE'},
 {id:'hover-idle',group:'controls',duration:2,theta:Math.PI/2,title:'Idle / low floating rest pose',detail:'No drive or launch / original neutral appearance',inputs:t=>move(0,0),keys:t=>'RELEASE'},
 ...[[1,0,'W'],[0,-1,'A'],[0,1,'D'],[1,-1,'W + A'],[1,1,'W + D'],[-1,-1,'S + A'],[-1,1,'S + D']].map(([a,b,key])=>({
 id:key.toLowerCase().replaceAll(' + ',''),group:'controls',duration:3,theta:Math.PI/2,
 title:key+' / '+(a?`${a>0?'forward':'reverse'} paw drive${b?' + steering':''}`:`${b<0?'left':'right'} heading sweep`),
 detail:'Finite paired paw drive / contact carries the seated cat',
 inputs:t=>move(t>.25&&t<2.4?a:0,t>.25&&t<2.4?b:0),keys:t=>t>.25&&t<2.4?key:'RELEASE'})),
 {id:'release-reverse',group:'controls',duration:5,title:'W / release / S reversal',detail:'Coast, brake and reverse / support remains physical',
 inputs:t=>move(t<.25?0:t<1.45?1:t<2.05?0:t<3.8?-1:0,0),keys:t=>t<.25?'RELEASE':t<1.45?'W':t<2.05?'RELEASE':t<3.8?'S':'RELEASE'},
 {id:'yaw-reverse',group:'controls',duration:4,theta:Math.PI/2,title:'A / release / D reversal',detail:'Common heading control / finite rate and recovery',
 inputs:t=>move(0,t<.25?0:t<1.25?-1:t<1.7?0:t<3?1:0),keys:t=>t<.25?'RELEASE':t<1.25?'A':t<1.7?'RELEASE':t<3?'D':'RELEASE'},
 {id:'landing',group:'controls',duration:4,title:'Drop test / recovery / W resumes',detail:'Declared external 0.70-unit drop / not proof of a paw launch',
 inputs:t=>move(t>1.35&&t<2.8?1:0,0),keys:t=>t>1.35&&t<2.8?'W':'RELEASE'},
 {id:'opposites',group:'controls',duration:3,title:'Opposite keys cancel powered drive',detail:'W + S, then A + D / shared normal resource rules',
 inputs:t=>move(0,0),keys:t=>t<1.5?'W + S':'A + D'},
];
const shots=defs.map(run),candidates={};
for(const horizontal of [false,true]){
 let found;const diagnostics=[];
 outer:for(const theta of horizontal?[.4,.8,1.05,1.40,Math.PI/2,1.8]:[.4,1.05,1.5])for(const x of [1.8,2.3,2.8,3.3,1.4])for(const z of [1.5,2.0,.8,0,-1]){
  const def={id:horizontal?'horizontal-hit':'vertical-hit',group:'combat',duration:3,solo:false,practice:true,opponent:'dummy',target:[x,CONFIG.bodyFloor,z],
   theta,phi:horizontal?-.65:0,title:horizontal?'Horizontal giant-paw hit / D':'Vertical giant-paw hit / W',
   detail:'Actual proxy contacts, damage and ordinary shared stamina',inputs:t=>[{theta:horizontal?0:(t>.2&&t<1.2?1:0),phi:horizontal?(t>.2&&t<1.2?1:0):0},zero],
   keys:t=>t>.2&&t<1.2?(horizontal?'D':'W'):'RELEASE'};
  const trial=run(def),hit=trial.events.find(e=>e.type==='hit'&&e.attacker===0);
  if(horizontal)diagnostics.push({theta,x,z,hits:trial.events.filter(e=>e.type==='hit'),maxYaw:Math.max(...trial.rows.map(r=>Math.abs(r.players[0].wp))),finalTheta:trial.rows.at(-1).players[0].theta});
  if(hit&&trial.stats.initialOverlap<1e-6&&hit.time>.2&&(!horizontal||hit.turnShare>.65)){found=trial;candidates[def.id]={target:def.target,theta,firstEvent:hit};break outer;}
 }
 if(!found){await writeFile(path.join(OUT,'failed-hit-search.json'),JSON.stringify(diagnostics,null,2));throw Error('No contact-confirmed '+(horizontal?'horizontal':'vertical')+' hit');}shots.push(found);
}
let clash;
outer:for(const distance of [3,3.4,3.8,2.6])for(const z of [1.5,2,.8,0])for(const targetTheta of [1.4,1.7,.8,2.0]){
 const def={id:'sword-clash',group:'combat',duration:4,solo:false,opponent:'sword',target:[distance,CONFIG.bodyFloor,z],targetTheta,
  theta:1.05,title:'Giant paw blocks sword / clash recoil',detail:'Actual weapon contact deflects; both fighters recoil and recover',
  inputs:t=>[{theta:t>.2&&t<1.4?1:0,phi:0},zero],keys:t=>t>.2&&t<1.4?'W':'RELEASE'};
 const trial=run(def);if(trial.stats.clashes&&trial.stats.initialOverlap<1e-6){clash=trial;candidates['sword-clash']={target:def.target,targetTheta,firstEvent:trial.events.find(e=>e.type==='clash')};break outer;}
}
if(!clash)throw Error('No contact-confirmed sword clash');shots.push(clash);
const miss=run({id:'near-miss',group:'combat',duration:2.5,solo:false,practice:true,opponent:'dummy',target:[7,CONFIG.bodyFloor,6],theta:1.05,
 title:'Same giant-paw swing / clear miss',detail:'Distant target stays untouched; no invisible extra weapon reach',
 inputs:t=>[{theta:t>.2&&t<1.2?1:0,phi:0},zero],keys:t=>t>.2&&t<1.2?'W':'RELEASE'});
if(miss.stats.hits)throw Error('Unexpected distant hit');shots.push(miss);
// Point velocities must match the actual floating contact transform.
const sample={...new ArenaPhysics().players[0],weapon:'catproto',p:v3(.3,1.7,-.4),theta:1.1,phi:-.7,wt:2.3,wp:-1.2,v:v3(.5,.2,-.1)};
const local=v3(.25,2.5,2.05),h=1e-6,f=weaponPointFrame(sample,local);
const future=weaponPointFrame({...sample,p:v3(sample.p.x+sample.v.x*h,sample.p.y+sample.v.y*h,sample.p.z+sample.v.z*h),theta:sample.theta+sample.wt*h,phi:sample.phi+sample.wp*h},local);
const error=Math.hypot(...['x','y','z'].map(axis=>(future.point[axis]-f.point[axis])/h-f.velocity[axis]));
if(error>1e-4)throw Error('Contact velocity error '+error);
if(shots.some(s=>s.stats.maxBodyPitch!==0))throw Error('Seated body unexpectedly tilted');
if(shots.filter(s=>['w','s'].includes(s.id)).some(s=>!s.stats.contactSamples))throw Error('No paw floor support');
const liftShot=shots.find(s=>s.id==='s');
const firstSupport=liftShot.rows.find(r=>r.players[0].contact);
const beforeSupport=liftShot.rows.filter(r=>r.time<(firstSupport?.time??0));
const liftProof={firstSupportTime:firstSupport?.time,firstSupportInput:firstSupport?.input,
 maximumBaseHeight:liftShot.stats.maxRise,riseAboveRest:liftShot.stats.maxRise-geom.hoverHeight,
 maximumAscentSpeed:Math.max(...liftShot.rows.map(r=>r.players[0].v.y)),
 maximumHeightBeforeFirstContact:Math.max(...beforeSupport.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),
 finalBaseHeight:liftShot.stats.finalHeight};
if(liftProof.riseAboveRest<1.5||liftProof.firstSupportInput!=='S'||Math.abs(liftProof.maximumHeightBeforeFirstContact-.35)>.0001)throw Error('S support lift not established: '+JSON.stringify(liftProof));
const report={version:'orange-tabby-motion-v06',date:'2026-10-20',fps:30,sampleHz:60,simulationHz:180,geometry:geom,
 provenance:{source:'src/physics.js',sha256:hash(source),productionModified:false,
  adaptations:['actual optimized Tripo mesh with 48 interior fitted paw contact spheres','bounded continuous hover using beagle gain 25/damping 9/thrust cap g+12','air-supported paw gravity compensation','lower virtual paw pivot at seated body base, unchanged neutral mesh and matching derivatives','measured seated hurt capsules and 0.58-unit body collision radius','beagle normal steering target 1.15 rad/s and finite feedback .70'],
  reused:['current gravity/180 Hz ground support','finite swing drive and reverse braking','shared stamina/fatigue','swept damage and repeat-hit gating','directional damage','clash impulses/recoil'],
  scriptedTranslation:false,normalLaunchImpulse:false},
 limitations:['Actual prepared Tripo mesh replaying an isolated current-game solver adapter, not actual game footage or a selectable character.','The seated body uses continuous bounded external hover lift; paw gravity is compensated. This is a new ordinary-hover proposal, distinct from the beagle timed F skill.','Paw spheres retain their exact neutral world volumes. The lower virtual pivot increases contact leverage; appearance is unchanged. Review the revised support-driven lift and balance.','No new cat ability or shared balance change.'],
 verification:{liftProof,contactVelocityFiniteDifferenceError:error,allBodiesUpright:true,idleBaseClearance:shots.find(s=>s.id==='hover-idle').stats.minBaseClearance,idlePawGroundGap:Math.min(...weaponSegments({...new ArenaPhysics().players[0],weapon:'catproto',p:v3(0,CONFIG.bodyFloor+.35,0),theta:Math.PI/2,phi:0}).flatMap(s=>[s.a.y-s.radius,s.b.y-s.radius]))},shots,candidates};
await writeFile(path.join(DATA,'game-solver-replay.json'),JSON.stringify(report,null,2)+'\n');
const browserCode=code.replace(/file:\/\/[^']*\/src\//g,'/src/');
await writeFile(path.join(OUT,'browser-physics.mjs'),browserCode);
await writeFile(path.join(ROOT,'docs/previews/orange-tabby/physics-v06.mjs'),browserCode);
console.log(JSON.stringify({verification:report.verification,shots:shots.map(s=>({id:s.id,...s.stats})),candidates},null,2));
