/** Experimental attached-ear adapter for the CURRENT game's control/contact code.
 * The production source is read, asserted, and adapted only in memory.
 * Inputs, not authored poses or launch impulses, drive these review sequences.
 */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'output/beagle-functional-preview');
await mkdir(OUT,{recursive:true});
const source=await readFile(path.join(ROOT,'src/physics.js'),'utf8');
function replaceOnce(text,from,to){
 if(text.split(from).length!==2)throw Error('Prototype adapter source changed: '+from.slice(0,70));
 return text.replace(from,to);
}
// The adapter runs in a data URL, so resolve the game's local profile import.
const portableSource=replaceOnce(source,"from './beagle-profile.js'",
  "from '"+new URL('../../src/beagle-profile.js',import.meta.url).href+"'");
let code=replaceOnce(portableSource,'export const WEAPONS = Object.freeze({',`export const WEAPONS = Object.freeze({
  ears: Object.freeze({length:3.6,offset:0,radius:.055,inertia:4.1,
    motorAcceleration:24,brakeAcceleration:30,maxAngularSpeed:4.25,
    colliders:Object.freeze([-1,1].flatMap(side=>[
      {a:[0,.055,side*.66],b:[0,3.545,side*.66],radius:.055},
      {a:[0,.38,side*.66-.12],b:[0,3.36,side*.66-.12],radius:.055},
      {a:[0,.38,side*.66+.12],b:[0,3.36,side*.66+.12],radius:.055}]))}),
  dummy: Object.freeze({length:.01,offset:0,radius:.01,inertia:1,
    motorAcceleration:0,brakeAcceleration:0,maxAngularSpeed:0,colliders:Object.freeze([])}),`);
code=replaceOnce(code,'export function weaponPointFrame(player, local, anchor) {',`export function weaponPointFrame(player, local, anchor) {
  if(player.weapon==='ears'){
    const st=Math.sin(player.theta),ct=Math.cos(player.theta);
    const sp=Math.sin(player.phi),cp=Math.cos(player.phi);
    const x=local.x*ct+local.y*st;
    const r=v3(x*cp-local.z*sp, .84-local.x*st+local.y*ct, x*sp+local.z*cp);
    const dx=-local.x*st+local.y*ct;
    const jt=v3(dx*cp,-local.x*ct-local.y*st,dx*sp);
    const jp=v3(-r.z,0,r.x);
    return {r,jt,jp,point:add(player.p,r),
      velocity:add(player.v,add(mul(jt,player.wt),mul(jp,player.wp)))};
  }`);
await writeFile(path.join(OUT,'experimental-physics-snapshot.mjs'),code);
const sim=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const {ArenaPhysics,CONFIG,weaponPointFrame,weaponSegments,v3}=sim;
const DT=CONFIG.step;
const zero={theta:0,phi:0};
function run(def){
 const arena=new ArenaPhysics();
 arena.reset(def.practice??false,def.solo??true,'ears',def.opponent??'dummy',6);
 const a=arena.players[0];a.p=v3(0,CONFIG.bodyFloor,0);a.theta=def.theta??.4;a.phi=def.phi??0;
 if(arena.players[1]){
  const b=arena.players[1];b.p=v3(...(def.target??[2.8,CONFIG.bodyFloor,.66]));
  b.theta=def.targetTheta??.4;b.phi=def.targetPhi??Math.PI;
 }
 const rows=[],events=[];
 for(let tick=0;tick<=Math.round(def.duration/DT);tick++){
  const t=tick*DT;
  const controls=def.inputs(t);
  if(tick>0)arena.step(controls,DT);
  for(const event of arena.events)events.push({time:t,...event});
  if(tick%3===0)rows.push({time:t,inputs:controls,
   players:arena.players.map(p=>({id:p.id,weapon:p.weapon,p:{...p.p},v:{...p.v},theta:p.theta,phi:p.phi,
    wt:p.wt,wp:p.wp,stamina:p.stamina,health:p.health,grounded:p.grounded,staffGrounded:p.staffGrounded,
    lastDamage:p.lastDamage,totalDamage:p.totalDamage,
    segments:weaponSegments(p).map(s=>({a:s.a,b:s.b,localA:s.localA,localB:s.localB,radius:s.radius})),
    sockets:p.weapon==='ears'?[-1,1].map(side=>weaponPointFrame(p,v3(0,0,side*.66)).point):[]})),
   events:arena.events.map(e=>({...e}))});
 }
 return {id:def.id,duration:def.duration,caption:def.caption,mode:def.mode??'movement',
  initial:{theta:def.theta??.4,phi:def.phi??0,target:def.target},fps:60,simulationHz:180,rows,events,
  stats:{maxBodyRise:Math.max(...rows.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),
   horizontalTravel:Math.hypot(rows.at(-1).players[0].p.x,rows.at(-1).players[0].p.z),
   hits:events.filter(e=>e.type==='hit').length,clashes:events.filter(e=>e.type==='clash').length}};
}
const move=(theta,phi)=>[{theta,phi}];
const defs=[
 {id:'drive-release-reverse',duration:4.8,caption:'W powers the swing / release coasts / S brakes and reverses',
  inputs:t=>move(t<1.45?1:t<1.75?0:t<4.35?-1:0,0)},
 ...[[1,-1,'W+A'],[1,1,'W+D'],[-1,-1,'S+A'],[-1,1,'S+D']].map(([pitch,yaw,key])=>({
  id:'combined-'+key.toLowerCase().replace('+',''),duration:2.6,theta:pitch<0?-.4:.4,
  caption:key+' / powered swing and steering together',inputs:t=>move(t<2.05?pitch:0,t<2.05?yaw:0)})),
];
const candidates={};
for(const horizontal of [false,true]){
 let found;
 for(const x of [2.6,3,2.2,3.4]){
  for(const z of [.66,.3,1,0]){
   const def={id:horizontal?'horizontal-hit':'vertical-hit',duration:2.6,solo:false,practice:true,
    mode:'combat',opponent:'dummy',target:[x,CONFIG.bodyFloor,z],
    theta:horizontal?Math.PI/2:.4,phi:horizontal?-.65:0,
    caption:horizontal?'A/D sweep / real contact damage and shared stamina':'W swing / real contact damage and knockback',
    inputs:t=>[{theta:horizontal?0:(t<.95?1:0),phi:horizontal?(t<.65?1:0):0},zero]};
   const record=run(def);const hits=record.events.filter(e=>e.type==='hit'&&e.attacker===0);
   if(hits.length&&(!horizontal||hits[0].turnShare>.8)){
    found=record;candidates[def.id]={def:{...def,inputs:undefined},firstHit:hits[0]};break;
   }
  }
  if(found)break;
 }
 if(!found)throw Error('No verified '+(horizontal?'horizontal':'vertical')+' strike found');
 defs.push(found);
}
let clash;
for(const distance of [4.3,4.6,4,3.7]){
 for(const targetTheta of [1.25,1.5,.8,2.0]){
  const def={id:'sword-clash',duration:3,solo:false,opponent:'sword',mode:'combat',
   target:[distance,CONFIG.bodyFloor,.66],targetTheta,
   caption:'Ear vs sword / physical deflection and ordinary clash recoil',
   inputs:t=>[{theta:t<1.4?1:0,phi:0},zero]};
  const record=run(def);
  if(record.events.some(e=>e.type==='clash')){clash=record;candidates['sword-clash']={def:{...def,inputs:undefined},firstClash:record.events.find(e=>e.type==='clash')};break;}
 }
 if(clash)break;
}
if(!clash)throw Error('No verified sword clash found');
defs.push(clash);
const records=defs.map(def=>def.rows?def:run(def));
// Meaningful geometry and response checks on the new attached contact frame.
const p={...new ArenaPhysics().players[0],weapon:'ears',p:v3(.3,1.7,-.4),theta:1.1,phi:-.7,wt:2.3,wp:-1.2,v:v3(.5,.2,-.1)};
const local=v3(.02,2.1,.66),h=1e-6,f=weaponPointFrame(p,local);
const future=weaponPointFrame({...p,p:v3(p.p.x+p.v.x*h,p.p.y+p.v.y*h,p.p.z+p.v.z*h),theta:p.theta+p.wt*h,phi:p.phi+p.wp*h},local);
const velocityError=Math.hypot(...['x','y','z'].map(axis=>(future.point[axis]-f.point[axis])/h-f.velocity[axis]));
if(velocityError>1e-4)throw Error('Attached-ear contact velocity mismatch: '+velocityError);
for(const r of records){
 for(const row of r.rows)for(const p of row.players){
  if(!Number.isFinite(p.theta+p.phi+p.p.x+p.p.y+p.p.z+p.stamina))throw Error('Nonfinite simulation');
  if(p.weapon==='ears'&&p.sockets.some(socket=>Math.abs(socket.y-p.p.y-.84)>1e-8))throw Error('Socket drift');
 }
 if(r.mode==='movement'&&r.stats.maxBodyRise<.4)throw Error('Insufficient real contact lift: '+r.id);
}
const report={purpose:'Historical v07 proxy preview using an experimental attached-ear frame. Production now uses the measured v05 beagle profile; this replay retains the earlier proxy proportions.',
 provenance:{base:'src/physics.js',sha256:createHash('sha256').update(source).digest('hex'),
  adaptations:['experimental ears/dummy profiles','fixed anatomical head sockets instead of floating weapon offset'],
  reused:['180 Hz integration','continuous W/S and A/D motor rules','stamina/fatigue','gravity and damping','ground/rim impulses','swept contacts','damage/repeat-hit gating','weapon clashes/recoil'],
  noAuthoredMotion:true,noLaunchImpulse:true,productionSourceModified:false},
 geometry:{length:3.6,anchorAboveBody:.84,anchorAboveFeet:1.43,lateralSockets:.66,bodyFloor:CONFIG.bodyFloor},
 verification:{contactVelocityFiniteDifferenceError:velocityError,finiteStates:true,stableSockets:true},
 scenarios:records,candidates};
await writeFile(path.join(OUT,'functional-motion.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({verification:report.verification,scenarios:records.map(({id,stats})=>({id,...stats})),candidates},null,2));
