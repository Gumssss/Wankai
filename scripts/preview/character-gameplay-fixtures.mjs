import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ArenaPhysics,CONFIG,v3} from '../../src/physics.js';
const root=new URL('../../',import.meta.url),dest=new URL('docs/previews/character-weapon-motion/',root);
function run(weapon,chapter,initial){
 const combat=chapter.id.endsWith('hit')||chapter.id==='block-clash',world=new ArenaPhysics();
 world.reset(combat,!combat,{characterId:'beagle',weaponId:weapon},{characterId:'basic-fighter',weaponId:'polearm'},combat?1:3);
 for(const [id,p]of world.players.entries()){Object.assign(p,{p:{...initial[id].p},theta:initial[id].theta,phi:initial[id].phi});}
 const events=[];
 for(let i=0;i<Math.round(chapter.duration/CONFIG.step);i++){
  const time=i*CONFIG.step,row=chapter.rows[Math.min(chapter.rows.length-1,Math.floor(time*60))];world.step([row.input,{theta:0,phi:0}]);
  for(const event of world.events)events.push({time,...event});
 }
 return {hits:events.filter(e=>e.type==='hit'&&e.attacker===0).length,clashes:events.filter(e=>e.type==='clash').length};
}
const hashes={};for(const name of ['physics.js','game-session.js','scene.js','beagle-model.js','loadouts.js','character-attachments.js'])hashes[name]=createHash('sha256').update(await readFile(new URL('src/'+name,root))).digest('hex');
for(const weapon of ['sword','polearm','hammer']){
 const before=JSON.parse(await readFile(new URL(`before-${weapon}.json`,dest))),chapters=[];
 for(const chapter of before.scenarios){
  const combat=chapter.id.endsWith('hit')||chapter.id==='block-clash';
  let initial=chapter.rows[0].players.map(p=>({p:p.p,theta:p.theta,phi:p.phi})),expected=run(weapon,chapter,initial);
  if(chapter.id.endsWith('hit')){
   let found=false;
   outer:for(const distance of [2.6,3,3.4,2.2,3.8])for(const z of [0,.3,-.4,.7]){
    const candidate=[initial[0],{p:v3(distance,CONFIG.bodyFloor,z),theta:0,phi:Math.PI}],proof=run(weapon,chapter,candidate);
    if(proof.hits){initial=candidate;expected=proof;found=true;break outer;}
   }
   if(!found)throw Error('No actual-runtime '+chapter.id+' for '+weapon);
  }
  if(chapter.id==='block-clash'&&!expected.clashes)throw Error('Missing actual-runtime clash '+weapon);
  chapters.push({id:chapter.id,title:chapter.title,duration:chapter.duration,mode:combat?'practice':'solo',initial,expected,inputs:chapter.rows.map(({time,input})=>({time,input}))});
 }
 await writeFile(new URL(`actual-${weapon}.json`,dest),JSON.stringify({weapon,type:'Actual App/GameSession/ArenaPhysics/ArenaView, scripted key inputs and labelled independent contact fixtures',hashes,chapters},null,2)+'\n');
 console.log(weapon,chapters.filter(c=>c.mode==='practice').map(c=>({id:c.id,...c.expected})));
}
