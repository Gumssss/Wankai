/** Standing giant-paw study. Current game solver adapted ONLY in memory.
 * Production files are never patched. This is proxy evidence, not game footage.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const DATA=path.join(ROOT,'assets/concepts/orange-tabby/motion-v02');
const OUT=path.join(ROOT,'output/orange-tabby-v02');
await mkdir(DATA,{recursive:true});await mkdir(OUT,{recursive:true});
const source=await readFile(path.join(ROOT,'src/physics.js'),'utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const replace=(text,from,to)=>{if(text.split(from).length!==2)throw Error('Adapter source changed: '+from.slice(0,70));return text.replace(from,to);};
const geom={shoulderHeight:1.62,bodyFloor:.59,radialWristReach:1.4,shoulder:[.04,.65,1.62],
 pawHalfSpacing:1.18,upper:.78,lower:.80,pawScale:[2.5,2.3,2.7],standingHeadHeight:2.06,earTipHeight:2.96};
const shapes=[-1,1].flatMap(side=>[
 {a:[0,1.30,side*1.18],b:[0,1.50,side*1.18],radius:.50},
 ...[-.16,-.052,.052,.16].flatMap(y=>[
  {a:[0,1.78,side*1.18+y*2.3],b:[0,1.91,side*1.18+y*2.3],radius:.19},
  {a:[0,2.00,side*1.18+y*2.3],b:[0,2.15,side*1.18+y*2.3],radius:.07},
 ])]);
let code=source.replace(/from '(\.\/[^']+)'/g,(_,rel)=>`from '${new URL('../../src/'+rel.slice(2),import.meta.url).href}'`);
code=replace(code,'export const WEAPONS = Object.freeze({',`export const WEAPONS = Object.freeze({
 catproto:Object.freeze({length:2.15,offset:0,radius:.5,bodyRadius:.50,inertia:2.6,
 motorAcceleration:24,brakeAcceleration:32,maxAngularSpeed:3.4,initialTheta:1.05,
 colliders:Object.freeze(${JSON.stringify(shapes)})}),
 dummy:Object.freeze({length:.01,offset:0,radius:.01,inertia:1,motorAcceleration:0,brakeAcceleration:0,maxAngularSpeed:0,colliders:Object.freeze([])}),`);
code=replace(code,'export function weaponPointFrame(player, local, anchor) {',`export function weaponPointFrame(player, local, anchor) {
 if(player.weapon==='catproto'){
  const st=Math.sin(player.theta),ct=Math.cos(player.theta),sp=Math.sin(player.phi),cp=Math.cos(player.phi);
  const x=.04+local.x*ct+local.y*st,z=local.z;
  const r=v3(x*cp-z*sp,1.03-local.x*st+local.y*ct,x*sp+z*cp);
  const dx=-local.x*st+local.y*ct;
  const jt=v3(dx*cp,-local.x*ct-local.y*st,dx*sp),jp=v3(-r.z,0,r.x);
  return {r,jt,jp,point:add(player.p,r),velocity:add(player.v,add(mul(jt,player.wt),mul(jp,player.wp)))};
 }`);
code=replace(code,'export function hurtSegments(player) {',`export function hurtSegments(player) {
 if(player.weapon==='catproto'){
  const shapes=[{a:[-.12,.09,0],b:[-.12,.70,0],radius:.47},{a:[.09,1.47,0],b:[.09,1.47,0],radius:.59}];
  return shapes.map(shape=>({...shape,localA:v3(...shape.a),localB:v3(...shape.b),
   a:bodyPointFrame(player,v3(...shape.a)).point,b:bodyPointFrame(player,v3(...shape.b)).point}));
 }`);
// Finite rate feedback prevents normal A/D from turning the giant hands into a rotor.
code=replace(code,'const turnInput = clamp(input.phi || 0, -1, 1);',`const rawTurnInput=clamp(input.phi || 0,-1,1);
 const turnInput=p.weapon==='catproto'?(p.polarInput||rawTurnInput?clamp((rawTurnInput*.95-p.wp)*.70,-1,1):0):rawTurnInput;`);
code=replace(code,'updateStamina(p, turnInput, dt);',"updateStamina(p,p.weapon==='catproto'?rawTurnInput:turnInput,dt);");
await writeFile(path.join(OUT,'isolated-game-physics.mjs'),code);
const {ArenaPhysics,CONFIG,weaponPointFrame,weaponSegments,v3}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const zero={theta:0,phi:0};
function run(def){
 const arena=new ArenaPhysics();arena.reset(!!def.practice,def.solo!==false,'catproto',def.opponent||'dummy',5);
 const p=arena.players[0];p.p=v3(0,CONFIG.bodyFloor+(def.id==='landing'?.70:0),0);p.theta=def.theta??1.05;p.phi=def.phi??0;
 if(arena.players[1]){const b=arena.players[1];b.p=v3(...def.target);b.theta=def.targetTheta??.4;b.phi=def.targetPhi??Math.PI;}
 const rows=[],events=[];
 for(let tick=0;tick<=Math.round(def.duration/CONFIG.step);tick++){
  const t=tick*CONFIG.step,input=def.inputs(t);if(tick)arena.step(input,CONFIG.step);
  for(const e of arena.events)events.push({time:t,...e});
  if(tick%3===0)rows.push({time:t,input:def.keys(t),players:arena.players.map(p=>({id:p.id,weapon:p.weapon,p:{...p.p},v:{...p.v},
   theta:p.theta,phi:p.phi,wt:p.wt,wp:p.wp,bodyPitch:p.bodyPitch,health:p.health,stamina:p.stamina,
   contact:p.staffGrounded,grounded:p.grounded})),events:arena.events.map(e=>({...e}))});
 }
 const last=rows.at(-1).players[0];
 const stats={travel:[last.p.x,last.p.z],maxRise:Math.max(...rows.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),
  finalHeight:last.p.y-CONFIG.bodyFloor,hits:events.filter(e=>e.type==='hit'&&e.attacker===0).length,
  clashes:events.filter(e=>e.type==='clash').length,minStamina:Math.min(...rows.map(r=>r.players[0].stamina)),
  maxBodyPitch:Math.max(...rows.map(r=>Math.abs(r.players[0].bodyPitch||0))),
  contactSamples:rows.filter(r=>r.players[0].contact).length};
 if(rows.some(r=>r.players.some(p=>!Number.isFinite(p.theta+p.phi+p.p.x+p.p.y+p.p.z))))throw Error('Nonfinite: '+def.id);
 return {...Object.fromEntries(Object.entries(def).filter(([k])=>!['inputs','keys'].includes(k))),rows,events,stats};
}
const move=(theta,phi)=>[{theta,phi}];
const defs=[...[[1,0,'W'],[-1,0,'S'],[0,-1,'A'],[0,1,'D'],[1,-1,'W + A'],[1,1,'W + D'],[-1,-1,'S + A'],[-1,1,'S + D']].map(([a,b,key])=>({
 id:key.toLowerCase().replaceAll(' + ',''),group:'controls',duration:3.0,theta:a===0?Math.PI/2:a<0?-1.05:1.05,
 title:key+' / '+(a?`${a>0?'front':'back'} swing${b?' + steering':''}`:`${b<0?'left':'right'} heading sweep`),
 detail:'Both giant paws swing together; body stays standing and upright',
 inputs:t=>move(t>.25&&t<2.4?a:0,t>.25&&t<2.4?b:0),keys:t=>t>.25&&t<2.4?key:'RELEASE'})),
 {id:'release-reverse',group:'controls',duration:5,title:'Release, coast, brake, reverse',detail:'W -> release -> S -> release / same connected paw pair',
 inputs:t=>move(t<.25?0:t<1.45?1:t<2.05?0:t<3.8?-1:0,0),keys:t=>t<.25?'RELEASE':t<1.45?'W':t<2.05?'RELEASE':t<3.8?'S':'RELEASE'},
 {id:'yaw-reverse',group:'controls',duration:4,theta:Math.PI/2,title:'Steering release and reversal',detail:'A -> release -> D -> release / no body flip or rotor spread',
 inputs:t=>move(0,t<.25?0:t<1.25?-1:t<1.7?0:t<3?1:0),keys:t=>t<.25?'RELEASE':t<1.25?'A':t<1.7?'RELEASE':t<3?'D':'RELEASE'},
 {id:'landing',group:'controls',duration:4,title:'Standing landing and recovery',detail:'External 0.70-unit drop setup; land on hind feet, resume W',
 inputs:t=>move(t>1.35&&t<2.8?1:0,0),keys:t=>t>1.35&&t<2.8?'W':'RELEASE'},
 {id:'opposites',group:'controls',duration:3,title:'Opposite keys cancel powered input',detail:'W + S, then A + D / gravity and passive contacts still act',
 inputs:t=>move(0,0),keys:t=>t<1.5?'W + S':'A + D'},
 ];
const shots=defs.map(run),candidates={};
for(const horizontal of [false,true]){
 let found;const diagnostics=[];
 outer:for(const theta of horizontal?[.4,.8,1.05,1.40,Math.PI/2,1.8]:[.4,1.05,1.5])for(const x of [1.5,1.9,2.3,2.7,3.1])for(const z of [1.18,1.6,2.0,.8,.4,0]){
  const def={id:horizontal?'horizontal-hit':'vertical-hit',group:'combat',duration:3,solo:false,practice:true,opponent:'dummy',target:[x,CONFIG.bodyFloor,z],
   theta,phi:horizontal?-.65:0,title:horizontal?'Horizontal giant-paw hit / D':'Vertical giant-paw hit / W',
   detail:'Actual proxy contacts, damage and ordinary shared stamina',inputs:t=>[{theta:horizontal?0:(t>.2&&t<1.2?1:0),phi:horizontal?(t>.2&&t<1.2?1:0):0},zero],
   keys:t=>t>.2&&t<1.2?(horizontal?'D':'W'):'RELEASE'};
  const trial=run(def),hit=trial.events.find(e=>e.type==='hit'&&e.attacker===0);
  if(horizontal)diagnostics.push({theta,x,z,hits:trial.events.filter(e=>e.type==='hit'),maxYaw:Math.max(...trial.rows.map(r=>Math.abs(r.players[0].wp))),finalTheta:trial.rows.at(-1).players[0].theta});
  if(hit&&(!horizontal||hit.turnShare>.65)){found=trial;candidates[def.id]={target:def.target,theta,firstEvent:hit};break outer;}
 }
 if(!found){await writeFile(path.join(OUT,'failed-hit-search.json'),JSON.stringify(diagnostics,null,2));throw Error('No contact-confirmed '+(horizontal?'horizontal':'vertical')+' hit');}shots.push(found);
}
let clash;
outer:for(const distance of [3.4,3.7,4.0,3.1])for(const z of [1.18,.65,0])for(const targetTheta of [1.4,1.7,.8,2.0]){
 const def={id:'sword-clash',group:'combat',duration:4,solo:false,opponent:'sword',target:[distance,CONFIG.bodyFloor,z],targetTheta,
  theta:1.05,title:'Giant paw blocks sword / clash recoil',detail:'Actual weapon contact deflects; both fighters recoil and recover',
  inputs:t=>[{theta:t>.2&&t<1.4?1:0,phi:0},zero],keys:t=>t>.2&&t<1.4?'W':'RELEASE'};
 const trial=run(def);if(trial.stats.clashes){clash=trial;candidates['sword-clash']={target:def.target,targetTheta,firstEvent:trial.events.find(e=>e.type==='clash')};break outer;}
}
if(!clash)throw Error('No contact-confirmed sword clash');shots.push(clash);
const miss=run({id:'near-miss',group:'combat',duration:2.5,solo:false,practice:true,opponent:'dummy',target:[6,CONFIG.bodyFloor,4],theta:1.05,
 title:'Same giant-paw swing / clear miss',detail:'Distant target stays untouched; no invisible extra weapon reach',
 inputs:t=>[{theta:t>.2&&t<1.2?1:0,phi:0},zero],keys:t=>t>.2&&t<1.2?'W':'RELEASE'});
if(miss.stats.hits)throw Error('Unexpected distant hit');shots.push(miss);
// Point velocities must match the actual anatomical contact transform.
const sample={...new ArenaPhysics().players[0],weapon:'catproto',p:v3(.3,1.7,-.4),theta:1.1,phi:-.7,wt:2.3,wp:-1.2,v:v3(.5,.2,-.1)};
const local=v3(.18,1.9,1.18),h=1e-6,f=weaponPointFrame(sample,local);
const future=weaponPointFrame({...sample,p:v3(sample.p.x+sample.v.x*h,sample.p.y+sample.v.y*h,sample.p.z+sample.v.z*h),theta:sample.theta+sample.wt*h,phi:sample.phi+sample.wp*h},local);
const error=Math.hypot(...['x','y','z'].map(axis=>(future.point[axis]-f.point[axis])/h-f.velocity[axis]));
if(error>1e-4)throw Error('Contact velocity error '+error);
if(shots.some(s=>s.stats.maxBodyPitch!==0))throw Error('Standing body tilted');
if(shots.filter(s=>['w','s'].includes(s.id)).some(s=>s.stats.maxRise<.15))throw Error('No paw support rise');
const report={version:'orange-tabby-motion-v02',date:'2026-10-19',fps:24,sampleHz:60,simulationHz:180,geometry:geom,
 provenance:{source:'src/physics.js',sha256:hash(source),productionModified:false,
  adaptations:['standing giant-paw profile','anatomical shoulder contact frame and derivatives','provisional standing hurt capsules','bounded common-heading rate feedback'],
  reused:['current gravity/180 Hz ground support','finite swing drive and reverse braking','shared stamina/fatigue','swept damage and repeat-hit gating','directional damage','clash impulses/recoil'],
  scriptedTranslation:false,normalLaunchImpulse:false},
 limitations:['Experimental proxy solver adapter, not actual game footage or a selectable character.','Upright body is constrained, not a balance simulation.','Paw/standing hurt shapes are provisional; final Tripo mesh fit and arm clearance remain to validate.','No new cat ability or shared balance change.'],
 verification:{contactVelocityFiniteDifferenceError:error,allBodiesUpright:true},shots,candidates};
await writeFile(path.join(DATA,'game-solver-replay.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verification:report.verification,shots:shots.map(s=>({id:s.id,...s.stats})),candidates},null,2));
