/** Checks the actual prototype GLB with the installed game loader. */
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const OUT=path.join(ROOT,'output/orange-tabby-v04');
const {ArenaPhysics,CONFIG,v3,weaponPointFrame}=await import(pathToFileURL(path.join(OUT,'isolated-game-physics.mjs')));
const checks=[];
function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));}
const bytes=await readFile(path.join(ROOT,'docs/previews/orange-tabby/cat-study-v04.glb'));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const body=gltf.scene.getObjectByName('FloatingCatBody');
const hands=[[-1,'FloatingPawLeft'],[1,'FloatingPawRight']].map(([side,name])=>({side,node:gltf.scene.getObjectByName(name)}));
check('real GLB has independently driven body and hands',body&&hands.every(h=>h.node?.parent===body),hands.map(h=>h.node?.name));
const colors=[];gltf.scene.traverse(o=>{if(o.isMesh){for(const m of Array.isArray(o.material)?o.material:[o.material])colors.push({name:m.name,r:m.color.r,g:m.color.g,b:m.color.b});}});
check('orange and green identity colors survived GLB export',colors.some(c=>c.name.includes('Orange')&&c.r>c.g*1.5&&c.g>c.b*1.5)&&colors.some(c=>c.name.includes('Green')&&c.g>c.r),colors.filter(c=>/Orange|Green/.test(c.name)));
let maxCenterError=0;
for(const theta of [-2,-.4,0,1.35,2.8,4.2])for(const phi of [-1.1,0,.7]){
 const p={p:v3(.7,1.4,-.3),v:v3(),theta,phi,wt:0,wp:0,weapon:'catproto'};
 body.position.set(p.p.x,p.p.y-CONFIG.bodyFloor,p.p.z);body.rotation.set(0,-phi,0);
 for(const {side,node} of hands){
  node.position.set(.04+1.45*Math.sin(theta),1.35+1.45*Math.cos(theta),-side*2.05);node.rotation.set(0,0,Math.PI/2-theta);node.scale.setScalar(4.5);
 }
 gltf.scene.updateMatrixWorld(true);
 for(const {side,node} of hands){
  const rendered=node.getWorldPosition(new THREE.Vector3()),physical=weaponPointFrame(p,v3(0,1.45,-side*2.05)).point;
  maxCenterError=Math.max(maxCenterError,rendered.distanceTo(new THREE.Vector3(physical.x,physical.y,physical.z)));
 }
}
check('loaded hand centers match physical transforms through pitch and yaw',maxCenterError<1e-6,maxCenterError);
function trial(theta,phi,seconds=2){
 const arena=new ArenaPhysics();arena.reset(false,true,'catproto','dummy',5);
 const p=arena.players[0];p.p=v3(0,CONFIG.bodyFloor+.35,0);p.theta=1.35;p.phi=0;
 for(let i=0;i<seconds/CONFIG.step;i++)arena.step([{theta,phi}],CONFIG.step);
 return {arena,p};
}
const idle=trial(0,0,4).p;
check('ordinary hover is stable without input or stamina cost',Math.abs(idle.p.y-CONFIG.bodyFloor-.35)<1e-6&&Math.hypot(idle.p.x,idle.p.z)<1e-6&&idle.stamina===200,{position:idle.p,stamina:idle.stamina});
const left=trial(0,-1).p,right=trial(0,1).p;
check('A and D steer in opposite directions while staying afloat',left.phi<-.5&&right.phi>.5&&Math.abs(left.p.x)+Math.abs(left.p.z)+Math.abs(right.p.x)+Math.abs(right.p.z)<1e-6,{left:left.phi,right:right.phi});
const forward=trial(1,0),backward=trial(-1,0);
check('W and S produce oppositely directed contact travel',forward.p.p.x>1&&backward.p.p.x<-1,{forward:forward.p.p,backward:backward.p.p});
const before=forward.p.theta;
forward.arena.step([{theta:0,phi:0}],CONFIG.step);
check('release retains motion rather than snapping to a rest angle',Math.abs(forward.p.theta-before)>1e-4&&Math.abs(forward.p.wt)>1,{before,after:forward.p.theta,rate:forward.p.wt});
const browser=await readFile(path.join(ROOT,'docs/previews/orange-tabby/physics-v04.mjs'),'utf8');
const isolated=await readFile(path.join(OUT,'isolated-game-physics.mjs'),'utf8');
check('browser and video use the same solver adapter',browser===isolated.replace(/file:\/\/[^']*\/src\//g,'/src/'),'Only import URLs differ.');
const report={version:'orange-tabby-v04-loader-and-controls',checks,productionIntegration:false};
await writeFile(path.join(ROOT,'assets/concepts/orange-tabby/motion-v04/loader-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks_passed:checks.length,maxCenterError},null,2));
