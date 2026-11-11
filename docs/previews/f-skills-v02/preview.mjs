// Authored feasibility storyboard only. No production gameplay changes.
import * as T from 'three';
import {preloadCharacterModels,buildCharacter} from '../../../src/models/characters.js';
import {buildWeapon} from '../../../src/models/weapons.js';
const out=document.querySelector('canvas'),ctx=out.getContext('2d');
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(1280,720);r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#ebe5d9');scene.add(new T.HemisphereLight(0xfff2e5,0x687e86,3));const light=new T.DirectionalLight(0xfff0da,2);light.position.set(3,8,5);scene.add(light);
const camera=new T.PerspectiveCamera(37,1280/720,.1,80);camera.position.set(3,7,13);camera.lookAt(0,.5,0);
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:0xcbd4c9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);scene.add(new T.GridHelper(30,30,0x81968f,0xb6c1b5));
const props=new T.Group();scene.add(props);for(const x of [-5,5]){const rail=new T.Mesh(new T.BoxGeometry(.16,.4,7),new T.MeshStandardMaterial({color:0x749b99}));rail.position.set(x,.2,0);props.add(rail);}
await preloadCharacterModels();
const data=[['mean-girl','crowned-heart'],['cr7','soccer-ball']];const actors=data.map(([characterId,weaponId])=>{const b=buildCharacter({characterId,weaponId});scene.add(b.root);const g=new T.Group();g.add(buildWeapon(weaponId).root);scene.add(g);return {b,g};});
const opponent=buildCharacter({characterId:'stickman',weaponId:'sword'},1);scene.add(opponent.root);
const bottle=new T.Group();scene.add(bottle);
const glass=new T.Mesh(new T.BoxGeometry(.3,.42,.27),new T.MeshStandardMaterial({color:0xff65b0,transparent:true,opacity:.8}));bottle.add(glass);const cap=new T.Mesh(new T.CylinderGeometry(.09,.09,.1,16),new T.MeshStandardMaterial({color:0xcba658}));cap.position.y=.26;bottle.add(cap);const nozzle=new T.Mesh(new T.BoxGeometry(.15,.05,.06),new T.MeshStandardMaterial({color:0xf2cf73}));nozzle.position.set(.1,.30,0);bottle.add(nozzle);
const plume=new T.Group();scene.add(plume);const puffGeometry=new T.SphereGeometry(1,10,8);const puffs=[];for(let i=0;i<70;i++){const m=new T.Mesh(puffGeometry,new T.MeshBasicMaterial({color:i%3?0xf792bb:0xe8b5dd,transparent:true,opacity:.13,depthWrite:false}));plume.add(m);puffs.push(m);}
const wedge=new T.Mesh(new T.CircleGeometry(3.4,50,-35*Math.PI/180,70*Math.PI/180),new T.MeshBasicMaterial({color:0xff70ad,transparent:true,opacity:.19,side:T.DoubleSide}));wedge.rotation.x=-Math.PI/2;wedge.position.set(-1.8,.025,0);scene.add(wedge);
const skillBall=new T.Group(),ballMesh=buildWeapon('soccer-ball').root;ballMesh.position.sub(new T.Box3().setFromObject(ballMesh).getCenter(new T.Vector3()));skillBall.add(ballMesh);scene.add(skillBall);
const shield=new T.Mesh(new T.SphereGeometry(1,28,20),new T.MeshBasicMaterial({color:0xffdc78,transparent:true,opacity:.2,depthWrite:false,wireframe:false}));shield.scale.set(.75,1.2,.75);scene.add(shield);
const spark=new T.Mesh(new T.SphereGeometry(.14,12,8),new T.MeshBasicMaterial({color:0xfff9c6}));scene.add(spark);
const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xc18421}));scene.add(trail);
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const chapters=[{start:0,end:6,label:'完整动作 / 1x',mode:'normal'},{start:6,end:12,label:'同一事件慢放 / 0.25x',mode:'replay'},{start:12,end:18,label:'对手离开范围 / 1x',mode:'miss'},{start:18,end:24,label:'F + W + D / 输入与恢复 / 1x',mode:'combo'}];
window.reviewManifest={entries:[{id:'mean-girl',name:'喷香水'},{id:'cr7',name:'反弹足球 + 无敌'}],duration:24,fps:15,chapters,replay:{sourceStart:1.1,sourceEnd:2.6,outputStart:6,outputEnd:12,speed:.25},type:'authored concept, compressed ball lane; not game solver'};
function label(s,x,y,size=23,color='#173139'){ctx.fillStyle=color;ctx.font=`${size}px Arial, "PingFang SC"`;ctx.fillText(s,x,y);}
function ballX(t,miss){if(t<.9)return -2.3;const speed=10.5;let x=-2.3+(t-.9)*speed;if(miss){const u=(x+4.5)%18;return u<9?u-4.5:13.5-u;}const points=[[.9,-2.3],[1.25,1.0],[1.85,-4.5],[2.45,1.0],[3.05,-4.5],[3.65,1.0],[3.9,-1.2]];for(let i=1;i<points.length;i++)if(t<=points[i][0]){const[a,x1]=points[i-1],[b,x2]=points[i];return x1+(x2-x1)*cl((t-a)/(b-a));}return -1.2;}
window.renderFrame=(idx,time)=>{
const ch=chapters.find(c=>time>=c.start&&time<c.end)||chapters.at(-1),t=ch.mode==='replay'?1.1+(time-6)*.25:time-ch.start,miss=ch.mode==='miss',combo=ch.mode==='combo';
const a=actors[idx];actors.forEach((b,i)=>{b.b.root.visible=i===idx;b.g.visible=i===idx;});props.visible=idx===1;
a.b.root.position.set(-2.5,.59,-.8);a.b.root.rotation.set(0,0,0);a.b.pose({hitFlash:0},t);
const begin=idx===0?.85:.9,end=idx===0?3.35:3.9,active=t>=begin&&t<end,wind=t>=.5&&t<begin;
const keys=[];if(t>=.5&&t<(combo?1.4:.7))keys.push('F');if(combo&&t>=.5&&t<4.8)keys.push('W','D');
a.g.visible=idx===0||(!active&&!wind);a.g.position.copy(a.b.root.position);a.g.rotation.set(0,combo?-.2*Math.sin(t*2):0,-(combo?1+.6*Math.sin(t*3):1.3));a.g.children[0].position.set(0,1.45,0);
const targetZ=miss?-.8+cl((t-.6)*2)*3:-.8;opponent.root.position.set(1.7,.59,targetZ);opponent.root.rotation.y=Math.PI;
const exposure=idx===0&&t>=begin&&!miss?Math.min(10,Math.floor((Math.min(t,end)-begin+.0001)/.25)):0;
const hits=idx===1&&!miss?[1.25,2.45,3.65].filter(h=>t>=h).length:0;const flash=idx===0?active&&exposure>0&&((t-begin)%.25)<.08:!miss&&[1.25,2.45,3.65].some(h=>t>=h&&t<h+.16);
opponent.pose({v:{x:0,z:0},hitFlash:flash?1:0},t);
bottle.visible=idx===0&&t>=.5&&t<3.6;bottle.position.set(-1.8,1.2,-.8);bottle.rotation.z=wind?-.15:0;
plume.visible=idx===0&&active;wedge.visible=idx===0&&(wind||active);wedge.position.z=-.8;
puffs.forEach((p,i)=>{const f=((t-begin)*1.6+i/70)%1,spread=f*1.5,angle=i*2.399;p.position.set(-1.65+f*3.4,1.35+Math.sin(angle)*spread*.45,-.8+Math.cos(angle)*spread);p.scale.setScalar(.08+f*.25);});
skillBall.visible=idx===1&&(wind||active);skillBall.position.set(ballX(t,miss),.49,-.8);skillBall.rotation.z=active?-t*12:0;
shield.visible=idx===1&&active;shield.position.set(-2.5,1,-.8);
spark.visible=idx===1&&active&&flash;spark.position.set(1.15,.65,-.8);
trail.visible=idx===1&&active;trail.geometry.dispose();trail.geometry=new T.BufferGeometry().setFromPoints(Array.from({length:25},(_,i)=>new T.Vector3(ballX(Math.max(.9,t-.35+i*.35/24),miss),.05,-.8)));
r.render(scene,camera);ctx.drawImage(r.domElement,0,0);
ctx.fillStyle='#152f35';ctx.fillRect(0,0,1280,100);label(idx===0?'MEAN GIRL · 喷香水':'CR7 · 反弹足球 + 自身无敌',25,40,30,'#fff2dc');label(ch.label,25,78,22,'#a9e0d4');
label('v02 手工动作示意 / 非正式游戏物理 / 数值待测试',25,128,19,'#8b443e');
if(idx===1)label('压缩示意场地；反弹路线为脚本。现有角色尚无腿部踢球动画。',25,155,18,'#8b443e');
const phase=t<.5?'准备':wind?'前摇：可打断':active?(idx===0?'持续喷雾':'球活动 + 本体无敌'):t<end+.35?'收招：可受伤':'恢复普通控制';
ctx.fillStyle='#fff7e6e8';ctx.fillRect(24,180,335,115);label(phase,38,210,22);label(`体力示意 ${200-(t>=.5?(idx===0?35:40):0)} / 200`,38,244,20);label(`对手 HP ${100-exposure*2-hits*6} / 100`,38,277,20);
const positions={W:[75,488],A:[24,538],S:[75,538],D:[126,538],F:[197,538]};for(const[k,[x,y]]of Object.entries(positions)){ctx.fillStyle=keys.includes(k)?'#ffd27d':'#17383e';ctx.fillRect(x,y,43,42);label(k,x+12,y+29,22,keys.includes(k)?'#17383e':'white');}
label('脚本输入高亮',25,609,17);
ctx.fillStyle='#152f35';ctx.fillRect(0,632,1280,88);
const line=idx===0?'身前香水瓶 + 前方扇形：持续 2.5 s，每 0.25 s 造成 2 HP':'球碰人后继续反弹；同目标分离且间隔 0.6 s 才再次扣血';
label(line,25,664,23,'#fff2dc');label(idx===0?'离开范围即停止伤害；普通武器与撑地保留':'建议：出球后收起普通武器；球到期与无敌结束同步',25,699,21,'#b6ddd3');
if(miss)label(idx===0?'侧绕喷头 / 退到射程外':'离开球路；等待保护结束',660,206,24);
if(combo)label(idx===0?'W/D 仍控制武器，喷头跟随身体朝向':active?'W/D 暂停武器控制，不能无敌挥锤':'W/D 恢复普通武器控制',500,206,23);
return out.toDataURL('image/jpeg',.9).split(',')[1];
};window.reviewReady=true;window.renderFrame(0,0);
