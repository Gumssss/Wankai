import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ArenaView} from '../../../src/scene.js';
import {GameSession} from '../../../src/game-session.js';
const out=document.querySelector('#film'),c=out.getContext('2d'),status=document.querySelector('#status');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
const camera=new T.OrthographicCamera(-10,10,5.5,-5.5,.1,120),session=new GameSession();
const view=new ArenaView(renderer,camera,'duel',...session.loadouts);view.resize(1280,632);
const scene=new T.Scene();scene.background=new T.Color(0xebe9dc);scene.add(view.arena,view.actors,view.effectsRoot);
const loader=new GLTFLoader();await Promise.all(['sword','polearm'].map(async id=>{const g=await loader.loadAsync('/models/'+id+'.glb');view.setWeaponModel(g.scene,id);}));
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
function text(s,x,y,size=16,color='#30372e',weight='400'){c.fillStyle=color;c.font=`${weight} ${size}px -apple-system, "PingFang SC", sans-serif`;c.fillText(s,x,y);}
function render(t){
 const u=ease((t-8)/4),ui=ease((t-11.2)/1.8),angle=t<8?-.72+t*.055:(-.28*(1-u)),distance=35+(26.04-35)*u,height=22+(15.4-22)*u;
 view.update(session.world.players,0,false,0,false);camera.position.set(Math.sin(angle)*distance,height,Math.cos(angle)*distance);camera.lookAt(0,0,-.3);
 const half=8.1+(5.5-8.1)*u;camera.top=half;camera.bottom=-half;camera.left=-half*1280/632;camera.right=-camera.left;camera.updateProjectionMatrix();
 renderer.render(scene,camera);c.fillStyle='#ebe9dc';c.fillRect(0,0,1280,720);
 c.drawImage(renderer.domElement,0,88*u,1280,720-88*u);
 if(t<10){c.save();c.globalAlpha=(.38+.62*(.5+.5*Math.sin(t*Math.PI/1.8)))*(1-ease((t-8)/1));c.textAlign='center';text('按下任意键开始游戏',640,655,21,'#59614f','500');c.restore();}
 if(ui>0){c.save();c.globalAlpha=ui;c.fillStyle='#f6f3eb';c.fillRect(0,0,1280,88);c.strokeStyle='#deddd1';c.beginPath();c.moveTo(0,87);c.lineTo(1280,87);c.stroke();
 c.fillStyle='#30372e';c.beginPath();c.arc(49,28,11,0,Math.PI*2);c.fill();c.beginPath();c.roundRect(37,43,24,23,9);c.fill();c.strokeStyle='#aa845e';c.lineWidth=4;c.beginPath();c.moveTo(31,68);c.lineTo(68,21);c.stroke();text('丸棍竞技场',83,45,25,'#30372e','750');text('W A N  G U N / A R E N A',84,65,8);text('•  双人 · 物理 · 对战',540,46,10,'#818875');text('角色与武器      ♫      ?  玩法说明',1030,46,12);
 const labels=['角色与武器 · 选择搭配','双人对战 · 分屏视角  ↗','双人对战 · 固定视角  →','木桩练习  →','单人自由视角  →'],w=(1180-56)/5;
 labels.forEach((s,i)=>{const x=50+i*(w+14),y=88+632*.72-34+10*(1-ui);c.fillStyle=i===1?'#30372e':'#faf8f0';c.strokeStyle='#deddd1';c.lineWidth=1;c.beginPath();c.roundRect(x,y,w,68,9);c.fill();c.stroke();c.textAlign='center';text(s,x+w/2,y+40,13,i===1?'#faf8f0':'#30372e',i===1?'650':'400');c.textAlign='left';});c.restore();}
}
let running=false,start=performance.now();function loop(now){if(!running)render(((now-start)/1000)%19);requestAnimationFrame(loop);}requestAnimationFrame(loop);status.textContent='8 秒环绕 · 4 秒拉近 · 主菜单淡入';
document.querySelector('#record').onclick=async()=>{if(running)return;running=true;status.textContent='录制中…';const chunks=[],rec=new MediaRecorder(out.captureStream(30),{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:6500000});rec.ondataavailable=e=>chunks.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();const begin=performance.now();await new Promise(resolve=>{function step(now){const t=(now-begin)/1000;render(Math.min(t,18));if(t<18)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});rec.stop();await done;await fetch('http://127.0.0.1:8769/recording',{method:'POST',body:new Blob(chunks,{type:'video/webm'})});status.textContent='演示已保存 · 18 秒';running=false;start=performance.now();};
