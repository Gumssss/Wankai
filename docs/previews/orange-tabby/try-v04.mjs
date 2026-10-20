import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ArenaPhysics,CONFIG,v3} from './physics-v04.mjs';

const viewport=document.querySelector('#viewport'),hint=document.querySelector('#hint');
const readout=document.querySelector('#readout'),held=new Set();
const scene=new THREE.Scene();scene.background=new THREE.Color('#dfe5e3');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
viewport.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(42,16/9,.1,130);
scene.add(new THREE.HemisphereLight('#fff6df','#9aafa4',2.3));
const key=new THREE.DirectionalLight('#fff6e5',3.2);key.position.set(7,12,9);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:35});
key.shadow.normalBias=.03;scene.add(key,key.target);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(110,110),new THREE.MeshStandardMaterial({color:'#dfe5d8',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.04;floor.receiveShadow=true;scene.add(floor);
const grid=new THREE.GridHelper(100,100,'#a7b9af','#c6d0c2');grid.position.y=-.025;scene.add(grid);
const arena=new ArenaPhysics();let catBody,paws=[],ready=false,accumulator=0,previousTime=0,paused=false;
function reset(){
 arena.reset(false,true,'catproto','dummy',5);
 const p=arena.players[0];p.p=v3(0,CONFIG.bodyFloor+.35,0);p.theta=1.35;p.phi=0;
 held.clear();accumulator=0;paused=false;paintKeys();
}
function paintKeys(){document.querySelectorAll('[data-key]').forEach(b=>b.classList.toggle('held',held.has(b.dataset.key)));}
const allowed=new Set(['KeyW','KeyS','KeyA','KeyD']);
window.addEventListener('keydown',event=>{
 if(!allowed.has(event.code)||!ready)return;
 event.preventDefault();held.add(event.code);paused=false;paintKeys();
});
window.addEventListener('keyup',event=>{held.delete(event.code);paintKeys();});
function release(){held.clear();paintKeys();paused=true;}
window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
viewport.addEventListener('pointerdown',()=>{viewport.focus();paused=false;});
document.querySelector('#reset').addEventListener('click',()=>{reset();viewport.focus();});
for(const button of document.querySelectorAll('[data-key]')){
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);held.add(button.dataset.key);paused=false;paintKeys();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{held.delete(button.dataset.key);paintKeys();});
}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);resize();
try{
 const gltf=await new GLTFLoader().loadAsync('./cat-study-v04.glb');
 catBody=gltf.scene.getObjectByName('FloatingCatBody');
 paws=[[-1,'FloatingPawLeft'],[1,'FloatingPawRight']].map(([side,name])=>({side,node:gltf.scene.getObjectByName(name)}));
 if(!catBody||paws.some(p=>!p.node))throw Error('The study model is missing its body or floating-paw nodes.');
 gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 scene.add(gltf.scene);reset();ready=true;
 hint.textContent='Click here, then hold W/S + A/D';viewport.dataset.ready='true';
}catch(error){const box=document.querySelector('#error');box.style.display='block';box.textContent='Preview could not load: '+error.message;hint.textContent='Model loading failed';}
const focus=new THREE.Vector3(),offset=new THREE.Vector3(10,4.8,1.5);
function draw(time){
 const dt=previousTime?Math.min(.05,(time-previousTime)/1000):0;previousTime=time;
 if(ready){
  if(!paused){accumulator+=dt;while(accumulator>=CONFIG.step){
   arena.step([{theta:Number(held.has('KeyW'))-Number(held.has('KeyS')),phi:Number(held.has('KeyD'))-Number(held.has('KeyA'))}],CONFIG.step);accumulator-=CONFIG.step;
  }}
  const p=arena.players[0];catBody.position.set(p.p.x,p.p.y-CONFIG.bodyFloor,p.p.z);catBody.rotation.set(0,-p.phi,0);
  for(const {side,node} of paws){node.position.set(.04+1.45*Math.sin(p.theta),1.35+1.45*Math.cos(p.theta),-side*2.05);node.rotation.set(0,0,Math.PI/2-p.theta);node.scale.setScalar(4.5);}
  focus.set(p.p.x,p.p.y-CONFIG.bodyFloor+1.1,p.p.z);camera.position.copy(focus).add(offset);camera.lookAt(focus);
  key.position.copy(focus).add(new THREE.Vector3(7,12,9));key.target.position.copy(focus);key.target.updateMatrixWorld();
  const keys=[...held].map(k=>k.slice(3)).sort().join(' + ');
  hint.textContent=paused?'Click to resume':keys?keys+' · '+(p.staffGrounded?'paw contact':'airborne swing / steering'):'Release · hovering and coasting';
  readout.textContent=`${keys||'RELEASE'} | body height ${(p.p.y-CONFIG.bodyFloor).toFixed(2)} | swing ${(p.theta*180/Math.PI).toFixed(0)}° | heading ${(p.phi*180/Math.PI).toFixed(0)}° | stamina ${p.stamina.toFixed(0)} / 200`;
  viewport.dataset.input=keys||'RELEASE';viewport.dataset.height=(p.p.y-CONFIG.bodyFloor).toFixed(3);
 }
 renderer.render(scene,camera);requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
