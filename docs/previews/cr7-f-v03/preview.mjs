// Isolated motion-review controller. Scripted ball/impacts; NOT production physics.
import * as T from 'three';
import {preloadCharacterModels,buildCharacter} from '../../../src/models/characters.js';
import {buildWeapon} from '../../../src/models/weapons.js';
const out=document.querySelector('canvas'),ctx=out.getContext('2d');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#ece8df');scene.add(new T.HemisphereLight(0xfff7e9,0x6c8c85,3));const light=new T.DirectionalLight(0xffedd5,2.5);light.position.set(3,8,5);scene.add(light);
const camera=new T.PerspectiveCamera(39,1280/720,.1,80);camera.position.set(0,9,14);camera.lookAt(0,.5,0);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0xcdd8cf}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);scene.add(new T.GridHelper(30,30,0x7e9d94,0xb8c6be));
const railMaterial=new T.MeshStandardMaterial({color:0x7ba6a0});for(const x of [-5,5]){const m=new T.Mesh(new T.BoxGeometry(.16,.25,8),railMaterial);m.position.set(x,.125,0);scene.add(m);}for(const z of [-4,4]){const m=new T.Mesh(new T.BoxGeometry(10,.25,.16),railMaterial);m.position.set(0,.125,z);scene.add(m);}
const obstacle=new T.Mesh(new T.CylinderGeometry(.55,.55,.65,24),new T.MeshStandardMaterial({color:0xa4b7af}));obstacle.position.set(-.2,.325,2.2);scene.add(obstacle);
await preloadCharacterModels();
const actor=buildCharacter({characterId:'cr7',weaponId:'soccer-ball'});scene.add(actor.root);
const held=new T.Group();held.add(buildWeapon('soccer-ball').root);scene.add(held);
const ball=new T.Group(),mesh=buildWeapon('soccer-ball').root;mesh.position.sub(new T.Box3().setFromObject(mesh).getCenter(new T.Vector3()));ball.add(mesh);scene.add(ball);
const target=buildCharacter({characterId:'stickman',weaponId:'sword'},1);scene.add(target.root);
const shield=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshBasicMaterial({color:0xffd371,transparent:true,opacity:.21,depthWrite:false}));shield.scale.set(.78,1.25,.78);scene.add(shield);
const origin=new T.Mesh(new T.RingGeometry(.42,.47,48),new T.MeshBasicMaterial({color:0x386c8a,side:T.DoubleSide}));origin.rotation.x=-Math.PI/2;origin.position.set(-2.5,.025,0);scene.add(origin);
const heroTrail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x157991}));scene.add(heroTrail);
const ballTrail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xb97d25}));scene.add(ballTrail);
const flash=new T.Mesh(new T.SphereGeometry(.18,16,12),new T.MeshBasicMaterial({color:0xfff4ae}));scene.add(flash);
const matrix=['W','S','A','D','W+A','W+D','S+A','S+D'];
const chapters=[{start:0,end:7,mode:'main',label:'出球后自由走位 · 1x'},{start:7,end:15,mode:'replay',label:'同一事件慢放 · 0.25x'},{start:15,end:22,mode:'gate',label:'结束仍按住 W：不误挥 · 1x'},{start:22,end:28,mode:'reverse',label:'松开 / 反向 / 对向键抵消 · 1x'},{start:28,end:33,mode:'interrupt',label:'前摇被打断：没有无敌 · 1x'},{start:33,end:38,mode:'miss',label:'对手躲开球路 · 1x'},...matrix.map((keys,i)=>({start:38+i*5,end:43+i*5,mode:'matrix',keys,label:`技能移动 ${keys} · 1x`}))];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function inputs(mode,t,combo){
 let k=[];
 if(t>=.5&&t<(mode==='matrix'?1.25:.7))k.push('F');
 if(mode==='matrix'&&t>=.5&&t<4.5)k.push(...combo.split('+'));
 else if(mode==='gate'&&((t>=.5&&t<4.8)||(t>=5.2&&t<6.8)))k.push('W');
 else if(mode==='reverse'){if(t>=.9&&t<1.7)k.push('W');else if(t>=2.1&&t<3)k.push('S');else if(t>=3&&t<3.9)k.push('W','S');}
 else if(['main','miss'].includes(mode)){if(t>=.9&&t<1.7)k.push('W','D');else if(t>=1.7&&t<2.5)k.push('S','D');else if(t>=2.5&&t<3.1)k.push('S','A');else if(t>=3.1&&t<4.6)k.push('W','A');else if(t>=5.2&&t<6.8)k.push('W');}
 return k;
}
// Preview-only planar motion, fixed camera: W=-Z, D=+X. No engine state changed.
function path(mode,t,combo){let x=-2.5,z=0;const points=[new T.Vector3(x,.03,z)],end=Math.min(t,3.9),dt=1/120;
 for(let s=.9;s<end-1e-7;s+=dt){const h=Math.min(dt,end-s),k=inputs(mode,s+1e-6,combo);let dx=Number(k.includes('D'))-Number(k.includes('A')),dz=Number(k.includes('S'))-Number(k.includes('W'));const len=Math.hypot(dx,dz);if(len){x+=dx/len*2.2*h;z+=dz/len*2.2*h;}
 x=clamp(x,-4.42,4.42);z=clamp(z,-3.42,3.42);
 for(const[cx,cz,r]of [[-.2,2.2,1.05],[1.7,-1,.95]]){const ex=x-cx,ez=z-cz,d=Math.hypot(ex,ez);if(d<r&&d>1e-6){x=cx+ex/d*r;z=cz+ez/d*r;}}
 if(points.length===1||s%(.08)<dt)points.push(new T.Vector3(x,.03,z));}
 points.push(new T.Vector3(x,.03,z));return {x,z,points};}
function bx(t,miss){if(t<.9)return -2.3;if(miss){const u=((-2.3+(t-.9)*10.5)+4.5)%18;return u<9?u-4.5:13.5-u;}const p=[[.9,-2.3],[1.25,1],[1.85,-4.5],[2.45,1],[3.05,-4.5],[3.65,1],[3.9,-1.2]];for(let i=1;i<p.length;i++)if(t<=p[i][0]){const[a,x]=p[i-1],[b,y]=p[i];return x+(y-x)*clamp((t-a)/(b-a));}return -1.2;}
function text(s,x,y,size=22,color='#17383f'){ctx.fillStyle=color;ctx.font=`${size}px Arial,"PingFang SC"`;ctx.fillText(s,x,y);}
window.reviewManifest={entries:[{id:'cr7-wasd-preview',name:'CR7 出球后 WASD 移动'}],duration:78,fps:30,chapters,replay:{sourceStart:.9,sourceEnd:2.9,outputStart:7,outputEnd:15,speed:.25},type:'preview-only planar movement; scripted compressed ball lane; rigid body without leg animation'};
window.renderFrame=(idx,time)=>{
 const ch=chapters.find(c=>time>=c.start&&time<c.end)||chapters.at(-1),mode=ch.mode==='replay'?'main':ch.mode,t=ch.mode==='replay'?.9+(time-7)*.25:time-ch.start;
 const cancelled=mode==='interrupt'&&t>=.7,active=!cancelled&&t>=.9&&t<3.9,wind=!cancelled&&t>=.5&&t<.9,recover=!cancelled&&t>=3.9&&t<4.2,keys=inputs(mode,t,ch.keys);
 const walk=mode==='interrupt'?{x:-2.5-clamp((t-.7)*4)*.3,z:0,points:[new T.Vector3(-2.5,.03,0)]}:path(mode,t,ch.keys);
 actor.root.position.set(walk.x,.59,walk.z);actor.root.rotation.y=0;actor.pose({hitFlash:cancelled&&t<.95?1:0},t);
 const freshW=['main','gate'].includes(mode)&&t>=5.2&&t<6.8;
 held.visible=!wind&&!active&&!recover;held.position.copy(actor.root.position);held.rotation.set(0,0,-(freshW?1.1+Math.sin((t-5.2)*5)*.8:1.1));held.children[0].position.set(0,1.45,0);
 ball.visible=wind||active;ball.position.set(bx(t,mode==='miss'),.49,-1);ball.rotation.z=active?-(t-.9)*12:0;
 shield.visible=active;shield.position.set(walk.x,1.05,walk.z);
 const hitTimes=[1.25,2.45,3.65],hits=cancelled||mode==='miss'?0:hitTimes.filter(h=>t>=h).length;
 const hit=active&&mode!=='miss'&&hitTimes.some(h=>t>=h&&t<h+.14);
 target.root.position.set(1.7,.59,mode==='miss'?-1+clamp((t-.8)*2)*3:-1);target.root.rotation.y=Math.PI;target.pose({v:{x:0,z:0},hitFlash:hit?1:0},t);
 flash.visible=hit;flash.position.set(1.1,.7,-1);
 heroTrail.geometry.dispose();heroTrail.geometry=new T.BufferGeometry().setFromPoints(walk.points);
 ballTrail.visible=active;ballTrail.geometry.dispose();ballTrail.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:22},(_,i)=>new T.Vector3(bx(Math.max(.9,t-.35+i*.35/21),mode==='miss'),.04,-1)));
 renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 ctx.fillStyle='#17363c';ctx.fillRect(0,0,1280,88);text('CR7 · 出球后 WASD 移动',24,36,29,'#fff1d1');text(ch.label+'   /   每章独立重置',24,72,21,'#b2e1d5');
 text('v03 动作预览 · 压缩场地 / 脚本球路 · 刚体角色，尚无腿部踢球和跑步动画',24,117,18,'#874b3e');
 let phase=cancelled?'前摇打断 / 无保护':t<.5?'准备':wind?'蓄力 / 可受伤':active?'WASD 直接移动 + 无敌':recover?'收招 0.3 s / 可受伤':freshW?'已松开重按 / 武器挥动':t>=4.2&&keys.some(k=>k!=='F')?'等待松开 / 不触发挥击':'普通控制 / 等待新按键';
 ctx.fillStyle='#f9f4e5ec';ctx.fillRect(22,140,310,135);text(phase,36,170,20);text(`无敌剩余 ${active?(3.9-t).toFixed(2):'0.00'} s`,36,202,20);text(`体力 ${t>=.5?160:200}/200  ·  对手 HP ${100-hits*6}`,36,234,19);text('身体轨迹：蓝色   球轨迹：金色',36,260,17);
 const positions={W:[76,490],A:[24,541],S:[76,541],D:[128,541],F:[199,541]};for(const[k,[x,y]]of Object.entries(positions)){ctx.fillStyle=keys.includes(k)?'#ffd277':'#25464c';ctx.fillRect(x,y,44,42);text(k,x+13,y+29,23,keys.includes(k)?'#17383f':'white');}
 text('脚本输入实时高亮',24,609,17);
 ctx.fillStyle='#17363c';ctx.fillRect(0,635,1280,85);text(active?'身体可走位；球独立反弹，不跟随方向键':'结束后恢复原来的挥武器 / 撑地操作',24,667,24,'#fff0cc');text('主动期收起普通武器 · 无敌结束后可被攻击 · 松开 WASD 再按才恢复挥击',24,702,21,'#b2dfd3');
 if(mode==='gate')text(t<4.8?'持续按住 W：到期后仍不挥武器':t<5.2?'现在松开 W':'重新按 W：此时才挥武器',490,166,23);
 if(mode==='reverse')text(t<1.7?'W 前进':t<2.1?'松开：停止技能移动':t<3?'S 反向':'W + S 抵消：不移动',530,166,23);
 if(mode==='interrupt')text('前摇受击：球没有发出，无敌没有开始',490,166,23);
 if(mode==='matrix')text(`当前方向 ${ch.keys} · 斜向速度与直向相同`,480,166,23);
 if(mode==='miss')text('对手移出球路；CR7 仍可自由走位',490,166,23);
 return out.toDataURL('image/jpeg',.9).split(',')[1];
};window.reviewReady=true;window.renderFrame(0,0);
