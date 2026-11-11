import * as T from 'three';
import {ArenaPhysics,CONFIG} from '../../../src/physics.js';
import {ArenaView} from '../../../src/scene.js';
import {preloadCharacterModels} from '../../../src/models/characters.js';
import {ARENA_OBSTACLES} from '../../../src/arena-obstacles.js';
const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
await preloadCharacterModels();
const chapters=[],matrix=[1,4,2,8,3,9,6,12],names=['W','S','A','D','W+A','W+D','S+A','S+D'];const loadouts=[{characterId:'cr7',weaponId:'soccer-ball'},{characterId:'mean-girl',weaponId:'crowned-heart'}];
const views=loadouts.map(l=>{const camera=new T.PerspectiveCamera(45,1280/720,.1,100);const view=new ArenaView(renderer,camera,l,{characterId:'stickman',weaponId:'sword'});const scene=new T.Scene();scene.background=new T.Color('#eee9db');scene.add(view.arena,view.actors,view.effectsRoot,new T.HemisphereLight(0xfff6e5,0x647b79,3));const sun=new T.DirectionalLight(0xfff0d5,2.5);sun.position.set(4,8,5);scene.add(sun);return {view,camera,scene};});
let start=0;
for(let id=0;id<2;id++)for(let chapter=0;chapter<9;chapter++){
 const duration=chapter===0?6:4,mask=chapter===0?0:matrix[chapter-1],world=new ArenaPhysics();world.reset(loadouts[id],{characterId:'stickman',weaponId:'sword'},{obstacles:ARENA_OBSTACLES});world.players[0].p.x=0;world.players[0].grounded=true;world.players[1].p.x=2.8;
 const frames=[];
 for(let f=0;f<duration*30;f++){
  const t=f/30,m=chapter===0&&id===0?(t<.7?0:t<1.4?1:t<2.1?8:t<2.6?4:t<3.2?2:t<4.4?1:t<4.8?0:t<5.4?1:0):t>=.4&&t<3.9?mask:0;
  const input={heldMask:m,theta:Number(!!(m&1))-Number(!!(m&4)),phi:Number(!!(m&8))-Number(!!(m&2)),faceYaw:0};
  for(let step=0;step<6;step++){world.step([{...input,skillTap:f===6&&step===0},{}]);}
  frames.push(JSON.parse(JSON.stringify({players:world.players,projectiles:world.projectiles,time:world.time,mask:m,f:f===6,events:world.events})));
 }
 chapters.push({start,end:start+duration,id,label:`${loadouts[id].characterId} / ${chapter===0?'完整技能':names[chapter-1]} / 真实物理 1x`,frames});start+=duration;
 if(chapter===0){chapters.push({start,end:start+4,id,label:`${loadouts[id].characterId} / 同一事件 0.25x`,frames:frames.slice(12,42).flatMap(f=>[f,f,f,f])});start+=4;}
}
window.reviewManifest={entries:[{id:'runtime-skills',name:'实际物理技能检查'}],duration:start,fps:30,chapters:chapters.map(({frames,...c})=>c),note:'Shipping physics and ArenaView with CR7 skeletal clips; scripted input fixtures, not manual play'};
window.renderFrame=(idx,time)=>{const c=chapters.find(c=>time>=c.start&&time<c.end)||chapters.at(-1),f=c.frames[Math.min(c.frames.length-1,Math.floor((time-c.start)*30+1e-6))],{view,camera,scene}=views[c.id];
 view.update(f.players,1/30,{active:true,view:'playing',projectiles:f.projectiles,localPlayerId:0});const p=f.players[0];camera.position.set(p.p.x+4.5,3.5,p.p.z+5.8);camera.lookAt(p.p.x+.7,.9,p.p.z);camera.updateProjectionMatrix();renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 ctx.fillStyle='#19383f';ctx.fillRect(0,0,1280,100);ctx.fillRect(0,635,1280,85);ctx.fillStyle='white';ctx.font='25px Arial,"PingFang SC"';ctx.fillText(c.label,24,36);ctx.font='19px Arial,"PingFang SC"';ctx.fillText('正式物理 / 正式渲染器 · 脚本输入测试 · CR7 骨骼动作',24,74);
 ctx.fillText(`阶段 ${p.abilityPhase}  |  体力 ${p.stamina.toFixed(0)}  |  对手 HP ${f.players[1].health}  |  等待松键 ${p.releaseGate?'是':'否'}`,24,670);
 ['W','A','S','D','F'].forEach((k,i)=>{const held=i===4?f.f:!!(f.mask&(1<<i));ctx.fillStyle=held?'#ffd179':'#49666b';ctx.fillRect(24+i*52,688,44,28);ctx.fillStyle=held?'#17383f':'white';ctx.fillText(k,36+i*52,710);});
 // Fixed-scale overhead ball map; the real arena is not compressed in physics.
 ctx.fillStyle='#17383fcc';ctx.fillRect(1060,110,200,200);ctx.strokeStyle='#b9ddd1';ctx.beginPath();ctx.arc(1160,210,90,0,Math.PI*2);ctx.stroke();for(const q of f.players){ctx.fillStyle=q.id?'#ff8274':'#6fe0d5';ctx.beginPath();ctx.arc(1160+q.p.x*4.5,210+q.p.z*4.5,4,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#ffe099';for(const q of f.projectiles){ctx.beginPath();ctx.arc(1160+q.p.x*4.5,210+q.p.z*4.5,4,0,Math.PI*2);ctx.fill();}
 return canvas.toDataURL('image/jpeg',.88).split(',')[1];};window.reviewReady=true;window.renderFrame(0,0);
