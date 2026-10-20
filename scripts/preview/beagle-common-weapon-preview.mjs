/** Before-integration compatibility replay. Only an isolated source copy is
 * adapted; character geometry and the existing weapon controller are reused. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {BEAGLE_COMMON_OFFSETS} from '../../src/character-attachments.js';
const root=new URL('../../',import.meta.url),out=new URL('output/character-weapon-selection/before/',root);
const dest=new URL('docs/previews/character-weapon-motion/',root);await mkdir(out,{recursive:true});await mkdir(dest,{recursive:true});
const baselineCommit='a591070fff8a64709dd0d775c140988e3d9b4ff1';
const source=execFileSync('git',['show',`${baselineCommit}:src/physics.js`],{cwd:root,encoding:'utf8'});
let code=source.replaceAll("from './beagle-profile.js'",`from '${new URL('src/beagle-profile.js',root).href}'`)
  .replaceAll("from './beagle-skill.js'",`from '${new URL('src/beagle-skill.js',root).href}'`);
const original="export const weaponStats = player => WEAPONS[player.weapon] || WEAPONS.polearm;";
if(!code.includes(original))throw Error('Before-integration snapshot changed; use the preserved baseline to regenerate.');
code=code.replace(original,`const commonOffsets=${JSON.stringify(BEAGLE_COMMON_OFFSETS)};
export const weaponStats = player => {
 const w=WEAPONS[player.weapon] || WEAPONS.polearm;
 return player.characterId==='beagle'&&commonOffsets[player.weapon]?{...w,offset:commonOffsets[player.weapon]}:w;
};`);
code=code.replace('export const WEAPONS = Object.freeze({',`export const WEAPONS = Object.freeze({
 dummy:Object.freeze({length:.01,offset:0,radius:.01,inertia:1,motorAcceleration:0,brakeAcceleration:0,maxAngularSpeed:0,colliders:[]}),`);
code=code.replace('return weaponStats(player).bodyRadius || CONFIG.bodyRadius','return player.characterId===\'beagle\' ? .58 : CONFIG.bodyRadius');
code=code.replace("const local = player.weapon === 'beagle' ? [","const local = player.characterId === 'beagle' ? [");
code=code.replace("if(p.weapon==='beagle'){\n      for(const shape of hurtSegments(p))","if(p.characterId==='beagle'){\n      for(const shape of hurtSegments(p))");
await writeFile(new URL('isolated-physics.mjs',out),code);
const {ArenaPhysics,CONFIG,v3,weaponSegments,staffFrame}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const zero={theta:0,phi:0};
function run(weapon,def){
 const w=new ArenaPhysics();w.reset(!!def.combat,!def.combat,weapon,def.clash?'polearm':'dummy',6);
 const a=w.players[0];a.characterId='beagle';a.p=v3(0,CONFIG.bodyFloor,0);a.theta=def.theta??.65;a.phi=def.phi??0;
 if(def.combat){const b=w.players[1];b.p=v3(...def.target);b.theta=def.targetTheta??.3;b.phi=Math.PI;}
 const rows=[],events=[];let touches=0;
 for(let tick=0;tick<=Math.round(def.duration/CONFIG.step);tick++){
  const time=tick*CONFIG.step,input=def.input(time);
  if(tick)w.step([input,zero],CONFIG.step);
  const segments=w.players.map(weaponSegments);
  if(w.players.length===2)for(const sa of segments[0])for(const sb of segments[1]){
   // Blocking contact count is captured separately from the stronger clash event.
   const {closestSegments}=awaitedHelpers;
   if(closestSegments(sa.a,sa.b,sb.a,sb.b).distance<=sa.radius+sb.radius)touches++;
  }
  for(const event of w.events)events.push({time,...event});
  if(tick%3===0)rows.push({time,input,players:w.players.map((p,i)=>({id:p.id,weapon:p.weapon,characterId:p.id===0?'beagle':'basic-fighter',p:{...p.p},theta:p.theta,phi:p.phi,stamina:p.stamina,health:p.health,
   segments:segments[i].map(s=>({a:s.a,b:s.b,radius:s.radius})),base:staffFrame(p,0).point})),events:w.events.map(e=>({...e}))});
 }
 return {id:def.id,title:def.title,duration:def.duration,rows,stats:{rise:Math.max(...rows.map(r=>r.players[0].p.y-CONFIG.bodyFloor)),hits:events.filter(e=>e.type==='hit'&&e.attacker===0).length,clashes:events.filter(e=>e.type==='clash').length,blockingContactSamples:touches},events};
}
const awaitedHelpers=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const packs=[];
for(const weapon of ['sword','polearm','hammer']){
 const definitions=[...[['W',1,0],['S',-1,0],['A',0,-1],['D',0,1],['W+A',1,-1],['W+D',1,1],['S+A',-1,-1],['S+D',-1,1]].map(([id,theta,phi])=>({id,title:`${id} / ordinary floating weapon`,duration:2.2,theta:theta<0?-.65:.65,input:t=>t<1.65?{theta,phi}:zero})),
 {id:'release-reverse',title:'W / release / S reversal / recover',duration:4,input:t=>({theta:t<1.3?1:t<1.8?0:t<3.3?-1:0,phi:0})},
 {id:'no-hover',title:'F / ordinary weapon has no hover skill',duration:1.5,input:()=>({theta:0,phi:0,skill:true})}];
 const scenarios=definitions.map(d=>run(weapon,d));
 for(const horizontal of [false,true]){
  let selected;
  outer:for(const distance of [2.6,3,3.4,2.2,3.8])for(const z of [0,.3,-.4,.7]){
   const def={id:horizontal?'horizontal-hit':'vertical-hit',title:horizontal?'A/D horizontal hit / actual contact damage':'W vertical hit / actual contact damage',duration:2.5,combat:true,target:[distance,CONFIG.bodyFloor,z],targetTheta:2.8,
    theta:horizontal?Math.PI/2:.65,phi:horizontal?-.6:0,input:t=>t<1.3?{theta:horizontal?0:1,phi:horizontal?1:0}:zero};
   const r=run(weapon,def);
   if(r.events.some(e=>e.type==='hit'&&e.attacker===0&&(!horizontal||e.turnShare>.5))){selected=r;break outer;}
  }
  if(!selected)throw Error(`Missing ${weapon} ${horizontal?'horizontal':'vertical'} hit`);
  scenarios.push(selected);
 }
 let clash;
 outer:for(const distance of [3.6,4,4.4,3.2,4.8])for(const targetTheta of [1.5,1.1,.7,2]){
  const r=run(weapon,{id:'block-clash',title:'Weapon block / clash / recoil / recovery',duration:3,combat:true,clash:true,target:[distance,CONFIG.bodyFloor,0],targetTheta,input:t=>t<1.8?{theta:1,phi:0}:zero});
  if(r.stats.clashes&&r.stats.blockingContactSamples){clash=r;break outer;}
 }
 if(!clash)throw Error('Missing verified block/clash '+weapon);
 scenarios.push(clash);
 const pack={weapon,type:'Before-integration isolated solver replay',fps:60,simulationHz:180,productionModified:false,noAuthoredTravel:true,
  baselineCommit,sourceSha256:createHash('sha256').update(source).digest('hex'),adaptations:['measured common weapon offsets','beagle body radius and hurt geometry'],scenarios};
 await writeFile(new URL(`before-${weapon}.json`,dest),JSON.stringify(pack));
 packs.push({weapon,duration:scenarios.reduce((s,r)=>s+r.duration,0),scenarios:scenarios.map(({id,stats})=>({id,...stats}))});
}
await writeFile(new URL('before-verification.json',dest),JSON.stringify({baselineCommit,sourceSha256:createHash('sha256').update(source).digest('hex'),packs},null,2)+'\n');
console.log(JSON.stringify(packs,null,2));
