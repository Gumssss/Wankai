/** Reimport the prepared GLB with the installed game loader and verify control frames. */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import * as THREE from 'three';
import {loadGeometry} from './model-geometry.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const PREP=path.join(ROOT,'assets/concepts/orange-tabby/prepared-v01');
const DATA=path.join(ROOT,'assets/concepts/orange-tabby/motion-v05');
const {ArenaPhysics,CONFIG,v3,weaponPointFrame,bodyRadius}=await import(pathToFileURL(path.join(ROOT,'output/orange-tabby-v05/isolated-game-physics.mjs')));
const checks=[];
function check(name,ok,detail){checks.push({name,passed:!!ok,detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));}
const bytes=await readFile(path.join(PREP,'orange-tabby-prepared-v01.glb'));
const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const model=await loadGeometry(path.join(PREP,'orange-tabby-prepared-v01.glb'));
const root=model.getObjectByName('CTRL_Root');
const paws=['CTRL_Paw_L','CTRL_Paw_R'].map(n=>model.getObjectByName(n));
check('minimal rigid hierarchy has body and independent paw controls',root&&paws.every(p=>p?.parent===root)&&model.getObjectByName('SM_Body')?.parent===root,paws.map(p=>p?.name));
check('no baked clips compete with physical controls',!(doc.animations?.length||doc.skins?.length),{animations:doc.animations?.length||0,skins:doc.skins?.length||0});
check('one original atlas and one material are retained',doc.images?.length===1&&doc.materials?.length===1&&doc.materials[0].pbrMetallicRoughness.baseColorTexture.index===0,{images:doc.images?.length,materials:doc.materials?.length});
let triangles=0;model.traverse(o=>{if(o.isMesh)triangles+=o.geometry.index.count/3;});
check('optimized geometry meets the selected budget',triangles===25000&&bytes.length<4e6,{triangles,bytes:bytes.length});
const samples=[];model.updateMatrixWorld(true);
for(const name of ['SM_Paw_L','SM_Paw_R']){
 const mesh=model.getObjectByName(name),positions=mesh.geometry.attributes.position;
 for(let i=0;i<positions.count;i+=Math.ceil(positions.count/150)){
  const point=new THREE.Vector3().fromBufferAttribute(positions,i);const rest=mesh.localToWorld(point.clone());
  samples.push({mesh,point,local:v3(.8-rest.y,rest.x,rest.z)});
 }
}
let maxError=0;
for(const theta of [-Math.PI,-1.2,0,Math.PI/2,2.9,Math.PI*2])for(const phi of [-1.1,0,.7]){
 const p={p:v3(.7,1.4,-.3),v:v3(),theta,phi,wt:0,wp:0,weapon:'catproto'};
 root.position.set(p.p.x,p.p.y-CONFIG.bodyFloor,p.p.z);root.rotation.set(0,-phi,0);
 for(const paw of paws)paw.rotation.z=Math.PI/2-theta;
 model.updateMatrixWorld(true);
 for(const sample of samples){
  const physical=weaponPointFrame(p,sample.local).point;
  maxError=Math.max(maxError,sample.mesh.localToWorld(sample.point.clone()).distanceTo(new THREE.Vector3(physical.x,physical.y,physical.z)));
 }
}
check('loaded mesh and contact transforms match throughout full pitch/yaw sweeps',maxError<1e-6,{poses:18,sampledVertices:samples.length,maxError});
const clone=model.clone(true);clone.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
const clonePaw=clone.getObjectByName('CTRL_Paw_L'),originalAngle=paws[0].rotation.z;clonePaw.rotation.z+=.8;
clone.getObjectByName('SM_Body').material.color.set('red');
check('two players have independent controls and material instances',paws[0].rotation.z===originalAngle&&clone.getObjectByName('SM_Body').material!==model.getObjectByName('SM_Body').material,'Geometry/atlas may share; controls/material state are independent.');
const measurements=JSON.parse(await readFile(path.join(PREP,'measurements.json')));
const body=measurements.parts.find(p=>p.name==='SM_Body');
const gap=Math.min(...measurements.parts.filter(p=>p.name!=='SM_Body').map(p=>p.minimum[1]>0?p.minimum[1]-body.maximum[1]:body.minimum[1]-p.maximum[1]));
check('detached paws retain body clearance through the complete pitch sweep',gap>.05,{minimumLateralAabbGap:gap,note:'Pitch preserves lateral coordinates; common yaw preserves separation.'});
function trial(theta,phi,seconds=3){
 const arena=new ArenaPhysics();arena.reset(false,true,'catproto','dummy',5);const p=arena.players[0];p.p=v3(0,.94,0);p.theta=Math.PI/2;p.phi=0;
 for(let t=0;t<seconds;t+=CONFIG.step)arena.step([{theta,phi}],CONFIG.step);
 return {arena,p};
}
const idle=trial(0,0,4).p;
check('body collision radius follows measured cat rather than default fighter',bodyRadius(idle)===.58,bodyRadius(idle));
check('ordinary idle hover is stable with no stamina cost',Math.abs(idle.p.y-.94)<1e-6&&Math.hypot(idle.p.x,idle.p.z)<1e-6&&idle.stamina===200,{position:idle.p,stamina:idle.stamina});
const left=trial(0,-1).p,right=trial(0,1).p;
check('A/D steer oppositely without invented lateral travel',left.phi<-.5&&right.phi>.5&&Math.hypot(left.p.x,left.p.z,right.p.x,right.p.z)<1e-6,{left:left.phi,right:right.phi});
const forward=trial(1,0),backward=trial(-1,0);
check('W/S produce opposite contact-driven travel',forward.p.p.x>1&&backward.p.p.x<-1,{forward:forward.p.p,backward:backward.p.p});
const before=forward.p.theta;forward.arena.step([{theta:0,phi:0}],CONFIG.step);
check('release coasts instead of snapping to a pose',Math.abs(forward.p.theta-before)>1e-4,{before,after:forward.p.theta});
const replay=JSON.parse(await readFile(path.join(DATA,'game-solver-replay.json')));
for(const id of ['w','s','a','d','wa','wd','sa','sd','release-reverse','yaw-reverse','landing','opposites'])check('motion coverage: '+id,replay.shots.some(s=>s.id===id),id);
check('positive hits, clash and a miss start without body-proxy overlap',replay.shots.filter(s=>s.group==='combat').every(s=>s.stats.initialOverlap===0)&&replay.shots.find(s=>s.id==='vertical-hit').stats.hits>0&&replay.shots.find(s=>s.id==='horizontal-hit').stats.hits>0&&replay.shots.find(s=>s.id==='sword-clash').stats.clashes>0&&replay.shots.find(s=>s.id==='near-miss').stats.hits===0,replay.candidates);
const source=await readFile(path.join(ROOT,'assets/concepts/orange-tabby/tripo-v01/orange-tabby-tripo-v01-source.glb'));
check('original Tripo export remains byte-identical',createHash('sha256').update(source).digest('hex')==='4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912','Source preserved.');
const report={version:'orange-tabby-prepared-v01-motion-v05',date:'2026-10-20',loader:'Installed Three.js '+THREE.REVISION+' GLTFLoader, geometry in Node; original atlas separately verified in browser',checks,productionIntegration:false,userAcceptance:'pending'};
await writeFile(path.join(PREP,'loader-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checksPassed:checks.length,triangles,bytes:bytes.length,maxMeshContactFrameError:maxError,minimumBodyGap:gap},null,2));
