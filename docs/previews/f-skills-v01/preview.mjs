// Review-only authored timeline. No production physics/skill mutations.
import * as T from 'three';
import {preloadCharacterModels,buildCharacter} from '../../../src/models/characters.js';
import {buildWeapon} from '../../../src/models/weapons.js';
import {weaponStats,makePlayer} from '../../../src/physics.js';
const entries=[['orange-tabby','cat-paws','ORANGE TABBY','Stand Your Ground',0xffb454,.25,1.25,.25,25,12],['cr7','soccer-ball','CR7','Clean Strike',0xffd260,.30,1.2,.30,30,16],['mean-girl','crowned-heart','MEAN GIRL','Personal Space',0xf278ac,.60,.15,.30,35,20],['maodie','maodie-paw','MAODIE','Not Today',0x66d9df,.12,.28,.45,20,12]];
const canvas=document.querySelector('#out'),ctx=canvas.getContext('2d');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
const scene=new T.Scene();scene.background=new T.Color('#e9e4d8');scene.add(new T.HemisphereLight(0xfff6e3,0x647b7c,3));const light=new T.DirectionalLight(0xfff4dc,3);light.position.set(3,8,5);scene.add(light);
const camera=new T.PerspectiveCamera(34,1280/720,.1,80);camera.position.set(6,5.5,12);camera.lookAt(.5,.5,0);
const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:0xd5d4c3,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);scene.add(new T.GridHelper(30,30,0x829793,0xb5b9aa));
const ring=new T.Mesh(new T.RingGeometry(.96,1,96),new T.MeshBasicMaterial({color:0xffb454,transparent:true,opacity:.8,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;scene.add(ring);
const wedge=new T.Mesh(new T.CircleGeometry(2,48,-55*Math.PI/180,110*Math.PI/180),new T.MeshBasicMaterial({color:0x66d9df,transparent:true,opacity:.25,side:T.DoubleSide}));wedge.rotation.x=-Math.PI/2;wedge.position.y=.03;scene.add(wedge);
const flash=new T.Mesh(new T.SphereGeometry(.18,16,12),new T.MeshBasicMaterial({color:0xfff6a0}));scene.add(flash);
const trace=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x086c6a}));scene.add(trace);
await preloadCharacterModels();
const actors=entries.map(([id,w])=>{const p=makePlayer(0,{characterId:id,weaponId:w}),b=buildCharacter({characterId:id,weaponId:w});scene.add(b.root);const g=new T.Group(),weapon=buildWeapon(w);g.add(weapon.root);scene.add(g);const common=new T.Group();common.add(buildWeapon('sword').root);scene.add(common);return {p,b,g,weapon,common};});
const target=buildCharacter({characterId:'stickman',weaponId:'sword'},1);scene.add(target.root);const targetWeapon=buildWeapon('sword',1).root;scene.add(targetWeapon);
const matrix=['W','S','A','D','W+A','W+D','S+A','S+D'];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function text(s,x,y,size=22,color='#172b31'){ctx.fillStyle=color;ctx.font=`${size}px Arial`;ctx.fillText(s,x,y);}
function project(x,y,z){return new T.Vector3(x,y,z).project(camera).multiply(new T.Vector3(640,-360,1)).add(new T.Vector3(640,360,0));}
const chapters=[{start:0,end:4,label:'SUCCESS / complete action',mode:'success'},{start:4,end:8,label:'SAME EVENT / 0.25x',mode:'replay'},{start:8,end:12,label:'MISS / COUNTERPLAY',mode:'miss'},{start:12,end:16,label:'INTERRUPTION / DAMAGE',mode:'interrupt'},{start:16,end:20,label:'RELEASE / REVERSE / RETURN',mode:'reverse'},{start:20,end:24,label:'AIR / EXPIRY / LANDING',mode:'air'},{start:24,end:28,label:'COMMON WEAPON / COMPATIBILITY',mode:'common'},...matrix.map((k,i)=>({start:28+i*2,end:30+i*2,label:`F + ${k} / simultaneous`,mode:'matrix',keys:k}))];
window.reviewManifest={entries:entries.map(e=>({id:e[0],name:e[3]})),duration:44,fps:15,chapters,replay:{sourceStart:.5,sourceEnd:1.5,outputStart:4,outputEnd:8,speed:.25},type:'authored concept; all motion and feedback illustrative'};
window.renderFrame=(idx,time)=>{
 const e=entries[idx],a=actors[idx];camera.position.set(idx===0?11:6,5.5,idx===0?5:12);camera.lookAt(.5,idx===0?1.2:.5,0);actors.forEach((b,i)=>{b.b.root.visible=i===idx;b.g.visible=i===idx;b.common.visible=false;});
 const ch=chapters.find(c=>time>=c.start&&time<c.end)||chapters.at(-1),mode=ch.mode==='replay'?'success':ch.mode;
 let t=ch.mode==='replay'?.5+(time-4)*.25:time-ch.start;
 const start=.5,age=t-start,wind=e[5],active=e[6],recovery=e[7];
 const groundOnly=idx===0||idx===2,invalid=mode==='air'&&groundOnly,interrupted=mode==='interrupt'&&idx!==0&&t>.58;
 const ready=age>=wind&&age<wind+active&&!interrupted&&!invalid;
 const effectAt=idx===3?.76:idx===2?1.10:1.05;
 const hit=mode!=='miss'&&mode!=='matrix'&&mode!=='reverse'&&!invalid&&!interrupted&&t>=effectAt;
 let keys=t>=.42&&t<(mode==='matrix'?1.45:.68)?['F']:[];
 let norm=mode==='matrix'?ch.keys.split('+'):mode==='reverse'?(t<1.4?['W','A']:t<2?[]:['S','D']):idx===2?['A']:['W'];
 if(t>(mode==='matrix'?.42:.68)&&t<2.8)keys.push(...norm);
 const pitch=(norm.includes('W')?1:norm.includes('S')?-1:0),yaw=(norm.includes('A')?1:norm.includes('D')?-1:0);
 const move=clamp((t-.7)/1.4),travel=mode==='matrix'||mode==='reverse'?.45*move:0;
 const lift=mode==='air'?1.1*Math.sin(Math.PI*clamp(t/2.4)):0;
 a.p.theta=.85+(keys.includes('W')?1:keys.includes('S')?-1:0)*Math.sin(move*2.8)*.7;
 a.p.phi=yaw*move*.7;a.p.hitFlash=mode==='interrupt'&&t>.58&&t<.85?1:0;
 a.b.root.position.set(-1.9+travel,.59+(idx===0?.35:0)+lift,0);a.b.root.rotation.y=idx===0?-a.p.phi:0;a.b.pose(a.p,t);
 const usedCommon=mode==='common'&&idx!==0;a.g.visible=!usedCommon;a.common.visible=usedCommon;
 for(const g of [a.g,a.common]){g.position.copy(a.b.root.position);g.rotation.set(0,-a.p.phi,-a.p.theta,'YXZ');g.children[0].position.y=usedCommon?1.45:weaponStats(a.p).offset;}
 // Authored opponent motion and outcome: intentionally not solver evidence.
 let tx=idx===2?.1:idx===0?.7:1.4;let tz=0;
 if(mode==='miss')tz=clamp((t-.6)*2)*2.8;
 if(hit&&idx===2)tx+=clamp((t-effectAt)*2)*1.2;
 if(hit&&idx===1)tx+=clamp((t-effectAt)*2)*.75;
 if(hit&&idx===3)tx+=clamp((t-effectAt)*3)*.55;
 if(hit&&idx===0)a.b.root.position.x-=clamp((t-effectAt)*2)*.15;
 target.root.position.set(tx,.59,tz);target.root.rotation.y=Math.PI;target.pose({v:{x:0,z:0},hitFlash:hit&&t<effectAt+.2?1:0},t);
 targetWeapon.position.set(tx-.7,1.15,tz);targetWeapon.rotation.z=-.6+(idx===0||idx===3?Math.sin(clamp((t-.45)*2)*Math.PI)*1.3:0);
 ring.position.x=-1.9;ring.scale.setScalar(idx===2?2.6:idx===0?1.1:.65);ring.material.color.setHex(e[4]);ring.visible=age>=0&&age<wind+active+recovery&&!invalid&&!interrupted;ring.material.opacity=ready?.85:.3;
 wedge.visible=idx===3&&ring.visible;wedge.position.x=-1.9;
 flash.visible=hit&&t<effectAt+.22;flash.position.set(idx===0?-.7:idx===3?-.2:1,1.1,0);
 trace.geometry.dispose();trace.geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-1.9,.04,0),new T.Vector3(a.b.root.position.x,.04,0)]);
 renderer.render(scene,camera);ctx.drawImage(renderer.domElement,0,0);
 ctx.fillStyle='#14282f';ctx.fillRect(0,0,1280,94);text(`${e[2]}  /  ${e[3]}`,26,36,28,'#fff3db');text(`${ch.label}  |  ${ch.mode==='replay'?'0.25x':'1x'}  |  independent fixture`,26,72,20,'#a7dfda');
 ctx.fillStyle='#14282f';ctx.fillRect(0,626,1280,94);
 const phase=invalid?'F REJECTED: airborne':interrupted?'INTERRUPTED: cost + cooldown retained':age<0?'READY':age<wind?'WIND-UP':age<wind+active?'ACTIVE':age<wind+active+recovery?'RECOVERY':'ORDINARY CONTROL';
 text(phase,26,656,21,'#ffffff');
 const notes=idx===0?'Full damage; horizontal knockback x0.4 only while supported':idx===1?'One real hit: +6 HP (20 total cap); a clash spends the charge':idx===2?'Fixed 2.6 m warning ring; one outward pulse; 0 damage':'Real weapon clash + front cone; no automatic counterattack';
 text(notes,26,687,20,'#d6ded7');
 text('AUTHORED CONCEPT v01 — scripted poses, travel and impacts; NOT GAMEPLAY',24,121,18,'#7b3332');
 const spent=age>=0&&!invalid?e[8]:0;const stamina=200-spent-(t>.7?Math.min(t-.7,2.1)*(pitch?12:0):0)-(t>.7?Math.min(t-.7,2.1)*(yaw?5:0):0);
 ctx.fillStyle='#f5f1e7dd';ctx.fillRect(25,143,310,89);text(`Illustrative stamina: ${Math.round(stamina)} / 200`,38,172,18);text(`Cooldown: ${spent?Math.max(0,e[9]-age).toFixed(1):'ready'} s`,38,201,18);ctx.fillStyle='#489c91';ctx.fillRect(38,215,280*stamina/200,5);
 text(idx===0?`Example HP ${hit?140:150} / 150`:idx===1?`Example target HP ${hit?84:100} / 100`:idx===2?'Opponent HP unchanged':hit?'PARRY / no bonus damage':'Await weapon clash',890,173,18);
 const positions={W:[80,483],A:[25,535],S:[80,535],D:[135,535],F:[211,535]};
 for(const [k,[x,y]]of Object.entries(positions)){ctx.fillStyle=keys.includes(k)?'#ffc56b':'#243a40';ctx.fillRect(x,y,46,43);text(k,x+14,y+29,23,keys.includes(k)?'#172b31':'#ffffff');}
 text('Scripted input track',25,606,17);const pp=project(a.b.root.position.x,0,0);text(`height +${(a.b.root.position.y-.59).toFixed(2)} m`,Math.max(340,pp.x-60),585,18);
 if(idx===0)text('0.35 m is existing idle hover; F adds no lift',400,608,18);
 if(mode==='common')text(idx===0?'Only paired paws are legal; common equipment unavailable':'Common sword: identical skill contract, ordinary reach',450,205,21);
 if(mode==='miss')text(idx===2?'Opponent exits warning ring':idx===3?'Bait the timing; move outside the front cone':'Evade / wait out the active window',450,205,21);
 if(mode==='interrupt')text(idx===0?'Damage does not cancel brace':'Hit during wind-up cancels; no refund',450,205,21);
 if(mode==='air')text(groundOnly?'Air F rejected; land, then use a fresh tap':'Air F allowed; no powered lift; ordinary landing',450,205,21);
 return canvas.toDataURL('image/jpeg',.88).split(',')[1];
};
window.reviewReady=true;window.renderFrame(0,0);
