import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../../',import.meta.url),out=new URL('assets/concepts/yellow-blob/motion-v01/',root);await mkdir(out,{recursive:true});
let code=await readFile(new URL('src/physics.js',root),'utf8');
code=code.replace("import {CHARACTERS} from './character-catalog.js';",`import {CHARACTERS as BASE_CHARACTERS} from './character-catalog.js';
const CHARACTERS={...BASE_CHARACTERS,'yellow-blob':{bodyFloor:.59,bodyRadius:.70,hurtShapes:[{a:[0,-.15,0],b:[0,.18,0],radius:.55},{a:[0,.72,0],b:[0,.76,0],radius:.35}]}};`);
const stats={length:1.8,offset:1.25,radius:.115,inertia:3.5,motorAcceleration:28,brakeAcceleration:36,maxAngularSpeed:5,colliders:[{a:[0,.115,0],b:[0,1.685,0],radius:.115}]};
code=code.replace('export const WEAPONS = Object.freeze({',`export const WEAPONS = Object.freeze({'yellow-staff':Object.freeze(${JSON.stringify(stats)}),`);
code=code.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${new URL('src/'+p.slice(2),root).href}'`);
await writeFile(new URL('isolated-physics.mjs',out),code);
const {ArenaPhysics,CONFIG,staffFrame,weaponSegments,v3}=await import(new URL('isolated-physics.mjs',out));
const zero={theta:0,phi:0},fps=15;
function run(def){
 const w=new ArenaPhysics();w.reset(!!def.combat,!def.combat,'sword','sword',3);
 const a=w.players[0];a.characterId='yellow-blob';a.weapon='yellow-staff';a.p=v3(0,.59,0);a.theta=def.theta??.65;a.phi=def.phi??0;
 if(def.combat){const b=w.players[1];b.p=v3(def.distance??3,.59,def.z??0);b.theta=def.targetTheta??2.8;b.phi=Math.PI;}
 const rows=[],events=[];
 for(let i=0;i<=def.duration*180;i++){
  const t=i/180,input=def.input(t);if(i)w.step([input,zero]);
  for(const e of w.events)events.push({time:t,...e});
  if(i%3===0)rows.push({time:t,input,players:w.players.map(p=>({p:{...p.p},theta:p.theta,phi:p.phi,stamina:p.stamina,health:p.health,contact:p.staffGrounded,base:staffFrame(p,0).point,tip:staffFrame(p,p.id===0?1.8:1.45).point,segments:weaponSegments(p)}))});
 }
 return {id:def.id,duration:def.duration,rows,events,rise:Math.max(...rows.map(r=>r.players[0].p.y-.59))};
}
const scenarios=[];
for(const [id,theta,phi] of [['W',1,0],['S',-1,0],['A',0,-1],['D',0,1],['W+A',1,-1],['W+D',1,1],['S+A',-1,-1],['S+D',-1,1]])
 scenarios.push(run({id,duration:3.6,theta:theta<0?-.65:.65,input:t=>t<1.8?{theta,phi}:zero}));
scenarios.push(run({id:'W / release / S / recovery',duration:4,input:t=>t<1?{theta:1,phi:0}:t<1.5?zero:t<2.8?{theta:-1,phi:0}:zero}));
scenarios.push(run({id:'Opposite keys cancel',duration:1.6,input:()=>zero}));
for(const kind of ['vertical-hit','horizontal-hit','clash']){
 let picked;
 outer:for(const distance of [2,2.5,3,3.5,1.5,4,4.5])for(const z of [0,.4,-.4])for(const initial of [.65,1.1,1.7,2.4,-.65])for(const targetTheta of kind==='clash'?[1.5,1.1,.7,2]:[0,.3,2.8]){
  const r=run({id:kind,duration:3.6,combat:true,distance,z,targetTheta,theta:kind==='horizontal-hit'?Math.PI/2:initial,phi:kind==='horizontal-hit'?-initial:0,input:t=>t<1.5?{theta:kind==='horizontal-hit'?0:1,phi:kind==='horizontal-hit'?1:0}:zero});
  if(r.events.some(e=>kind==='clash'?e.type==='clash':e.type==='hit'&&e.attacker===0)){picked=r;break outer;}
 }
 if(!picked)throw Error('No verified scenario: '+kind);scenarios.push(picked);
}
const frames=[],chapters=[];
function append(s,speed=1,offset=0,duration=s.duration){
 const start=frames.length;
 for(let i=0;i<Math.round(duration*fps);i++){
  const t=Math.min(s.duration,offset+i/fps*speed),r=s.rows[Math.min(s.rows.length-1,Math.round(t*60))];
  frames.push({scenario:s.id,speed,...r,event:[...s.events].reverse().find(e=>t-e.time>=0&&t-e.time<.35)||null});
 }
 chapters.push({id:s.id,speed,start:start/fps,end:frames.length/fps});
}
for(const s of scenarios){append(s);if(['S','vertical-hit','horizontal-hit','clash'].includes(s.id)){const e=s.events.find(e=>e.type===(s.id==='clash'?'clash':'hit'));append(s,.25,Math.max(0,(e?.time??.5)-.15),2);}}
await writeFile(new URL('replay.json',out),JSON.stringify({fps,stats,frames,chapters,scenarios:scenarios.map(s=>({id:s.id,rise:s.rise,events:s.events})),type:'isolated current solver preview; no runtime integration; reset per chapter'}));
console.log(JSON.stringify({frames:frames.length,duration:frames.length/fps,chapters,scenarios:scenarios.map(s=>({id:s.id,rise:s.rise,events:s.events.length}))},null,2));
