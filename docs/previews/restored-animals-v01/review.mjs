// Real App / GameSession / renderer. Chapters reset independent, labelled test
// fixtures; all movement thereafter comes from ordinary player/AI inputs.
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../../../src/App.jsx';
import {GameSession} from '../../../src/game-session.js';
import {animalModelsReady,animalAssetStatus} from '../../../src/models/restored-animals.js';
import '../../../src/style.css';
let opponentInput={};
const session=new GameSession({randomOpponent:false,makeAi:()=>({think:()=>opponentInput})});
createRoot(document.getElementById('root')).render(React.createElement(App,{session}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const dog={characterId:'beagle',weaponId:'long-ears'},cat={characterId:'orange-tabby',weaponId:'cat-paws'},target={characterId:'stickman',weaponId:'polearm'};
const keyMap={W:'KeyW',S:'KeyS',A:'KeyA',D:'KeyD',F:'KeyF'};
let chapter=null,current=null,chapterWall=0,live=true;
const report={format:'actual current App, scripted ordinary inputs, independent fixtures',chapters:[],errors:[]};
const surface=document.createElement('canvas');surface.width=1280;surface.height=900;const ctx=surface.getContext('2d');
function draw(){
 if(!live)return;
 const canvas=document.querySelector('#viewport canvas');if(!canvas)return;
 ctx.fillStyle='#f5f0df';ctx.fillRect(0,0,1280,900);ctx.drawImage(canvas,0,96,1280,720);
 ctx.fillStyle='#30372e';ctx.font='bold 24px system-ui';ctx.fillText(chapter?.title??'RESTORED ANIMALS / ACTUAL GAME',24,34);
 ctx.font='15px system-ui';ctx.fillText('Same shipping models, world, obstacles and controls · each labelled chapter resets its fixture',24,64);
 const p=session.world.players[0],other=session.world.players[1];if(!p)return;
 let x=24;for(const [label,key]of Object.entries(keyMap)){
  const held=session.keys.has(key);ctx.fillStyle=held?'#be6147':'#deded0';ctx.fillRect(x,834,42,40);ctx.fillStyle=held?'#fff8e9':'#30372e';ctx.font='bold 23px system-ui';ctx.fillText(label,x+12,862);x+=52;
 }
 ctx.fillStyle='#30372e';ctx.font='17px system-ui';ctx.fillText(`HP ${Math.ceil(p.health)}/${p.maxHealth}   stamina ${p.stamina.toFixed(0)}/200   height ${(p.p.y-.59).toFixed(2)}   floor support ${p.staffGrounded?'YES':'—'}`,360,850);
 ctx.fillText(`Rotor ${p.skillActive?p.skillTime.toFixed(1)+'s':'off'}   hits ${current?.hits??0}   clashes ${current?.clashes??0}   target HP ${Math.ceil(other?.health??0)}`,360,878);
 if(current&&session.state==='playing'){
  const t=(performance.now()-chapterWall)/1000;
  if(p.p.y>current.peak){current.peak=p.p.y;current.peakAt=t;}
  if(p.staffGrounded)current.groundFrames++;
 }
}
requestAnimationFrame(draw);
const keys=names=>{session.clearKeys();for(const name of names)session.keyDown(keyMap[name]);};
const originalImpact=session.impact.bind(session);session.impact=e=>{
 if(current){if(e.type==='hit')current.hits++;if(e.type==='clash')current.clashes++;if((e.type==='hit'||e.type==='clash')&&current.firstContactAt===undefined)current.firstContactAt=(performance.now()-chapterWall)/1000;}
 originalImpact(e);
};
async function prepare(c){
 session.goHome();session.setLoadouts([c.loadout,c.target??target]);session.startRound('ai');
 session.state='paused';session.menuOpen=false;session.countdown=0;session.freeze=0;session.accumulator=0;
 session.world.endless=true;session.world.players[0].p.x=c.distance?-c.distance/2:0;session.world.players[1].p.x=c.distance?c.distance/2:12;
 opponentInput=c.otherInput??{};session.publish();await wait(450);
}
export async function run(){
 while(!session.renderer||!animalModelsReady())await wait(100);
 report.assets=animalAssetStatus();if(Object.values(report.assets).some(v=>v!=='ready'))throw Error('Actual animal model unavailable');
 const matrix=[['W'],['S'],['A'],['D'],['W','A'],['W','D'],['S','A'],['S','D']];
 const chapters=[];
 for(const [name,loadout]of [['BEAGLE',dog],['ORANGE CAT',cat]]){
  for(const input of matrix)chapters.push({title:`${name} / ${input.join(' + ')} / 1x`,loadout,keys:input,duration:2.5});
  chapters.push({title:`${name} / W → release → S / 1x`,loadout,keys:['W'],duration:4,release:true});
 }
 chapters.push({title:'BEAGLE / F rotor + D / expiry and landing / 1x',loadout:dog,keys:['F','D'],duration:8,rotor:true});
 for(const fixture of await fetch('./contact-fixtures.json').then(r=>r.json()))chapters.push({...fixture,title:`${fixture.loadout.characterId.toUpperCase()} / physical hit, block, clash / 1x`,keys:[fixture.input.theta>0?'W':'S'],duration:3.2});
 for(const weaponId of ['sword','polearm','hammer','axe','mace','pan'])chapters.push({title:`BEAGLE / natural ears + ${weaponId} / 1x`,loadout:{characterId:'beagle',weaponId},keys:['W','D'],duration:1.2});
 // Copy immediately after the actual renderer finishes, before WebGL clears
 // its default drawing buffer at the end of the animation frame.
 const renderer=session.renderer,render=renderer.render;
 renderer.render=function(...args){const result=render.apply(this,args);draw();return result;};
 const stream=surface.captureStream(30),chunks=[];
 const mimeType=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm;codecs=vp8';
 const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:4500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.start(1000);recorder.pause();let offset=0;
 for(const c of chapters){
  chapter=c;current=null;await prepare(c);current={title:c.title,loadout:c.loadout,offset,duration:0,hits:0,clashes:0,groundFrames:0,peak:session.world.players[0].p.y};
  session.state='playing';session.publish();keys(c.keys);chapterWall=performance.now();recorder.resume();
  const start=session.world.time;
  while(session.world.time-start<c.duration){
   const t=session.world.time-start;
   if(c.release&&t>1.1&&t<2)keys([]);else if(c.release&&t>=2&& !session.keys.has('KeyS'))keys(['S']);
   if(c.rotor&&t>.12&&session.keys.has('KeyF'))session.keyUp('KeyF');
   if(c.rotor&&t>2&&t<4&&!session.keys.has('KeyA'))keys(['A']);
   if(c.rotor&&t>=4)keys([]);
   await wait(25);
  }
  current.duration=(performance.now()-chapterWall)/1000;offset+=current.duration;recorder.pause();
  report.chapters.push(current);session.state='paused';session.clearKeys();session.publish();
 }
 const done=new Promise(r=>recorder.onstop=r);recorder.stop();await done;renderer.render=render;stream.getTracks().forEach(t=>t.stop());
 const blob=new Blob(chunks,{type:mimeType}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='restored-animals-actual-gameplay.webm';
 await fetch('http://127.0.0.1:8789/video',{method:'POST',body:blob}).then(r=>{if(!r.ok)throw Error('Capture save failed');});
 report.recordedDuration=offset;report.models='accepted Tripo Beagle v05 / Cat prepared-v02 with 1.3x paws';report.size=blob.size;
 await fetch('http://127.0.0.1:8789/report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(report)});
 window.animalReview.report=report;window.animalReview.done=true;return report;
}
window.animalReview={run,session,report,surface};document.getElementById('record').onclick=()=>run();
