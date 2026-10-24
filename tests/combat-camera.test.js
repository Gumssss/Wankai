import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,OrthographicCamera,Vector3} from 'three';
import {makePlayer} from '../src/physics.js';
import {PLAYABLE_LOADOUTS} from '../src/loadouts.js';
import {FIXED_CAMERA} from '../src/fixed-camera.js';
import {combatFramePoints,createCombatCameraRig,resetCombatCamera,updateCombatCamera,opponentIndicator} from '../src/combat-camera.js';
import {createFreeCameraRig,updateFreeCamera,turnFreeCamera} from '../src/free-camera.js';

function visible(camera,points){
 for(const p of points){const s=p.clone().project(camera);
  assert.ok(Math.abs(s.x)<.79&&s.y<.53&&s.y>-.77&&Math.abs(s.z)<1,`clipped combat point ${s.toArray()}`);
 }
}
const display=p=>p.clone().applyAxisAngle(new Vector3(0,1,0),FIXED_CAMERA.actorRotation);

test('shared tactical camera contains every loadout at walls, during rises and after abrupt knockback/resizes',()=>{
 for(const selection of PLAYABLE_LOADOUTS)for(const aspect of [.35,1.5,2.4]){
  const camera=new PerspectiveCamera(55,aspect,.1,120),rig=createCombatCameraRig(camera,FIXED_CAMERA.position,FIXED_CAMERA.target);
  const players=[makePlayer(0,selection),makePlayer(1,{characterId:'orange-tabby',weaponId:'cat-paws'})];
  const direction=new Vector3(...FIXED_CAMERA.position).sub(new Vector3(...FIXED_CAMERA.target)).normalize();
  for(let frame=0;frame<8;frame++){
   players.forEach((p,id)=>{p.p={x:(id?1:-1)*(frame%2?18:5),y:.94+((frame+id)%3)*4,z:Math.sin(frame)*12};p.theta=frame*.9;p.phi=frame;
    if(p.weapon==='long-ears'){p.theta=-Math.PI/2;p.earSpread=Math.PI/2;}});
   const before=JSON.stringify(players);updateCombatCamera(rig,players,1/60,display);
   visible(camera,combatFramePoints(players).map(display));assert.equal(JSON.stringify(players),before);
   assert.ok(camera.position.clone().sub(rig.focus).normalize().dot(direction)>1-1e-10,'approved viewing direction stays constant');
  }
  resetCombatCamera(rig);assert.equal(rig.initialized,false);
 }
});
test('training view contains the same full-size arena wall encounters',()=>{
 const camera=new OrthographicCamera(-14,14,8,-8,.1,120),rig=createCombatCameraRig(camera,[0,15.4,21],[0,0,-.3]);
 const players=[makePlayer(0,'beagle'),makePlayer(1,'hammer')];players[0].p.x=-18;players[1].p.x=18;
 updateCombatCamera(rig,players,1/60);visible(camera,combatFramePoints(players));
});
test('both split views include nearby opponents and weapons through independent manual camera turns',()=>{
 for(const selection of PLAYABLE_LOADOUTS)for(const aspect of [.3,.7,1.5]){
  const players=[makePlayer(0,selection),makePlayer(1,'hammer')];players[1].p={x:-4,y:4,z:4};
  const rig=createFreeCameraRig(undefined,true);rig.camera.aspect=aspect;rig.camera.updateProjectionMatrix();
  for(let i=0;i<12;i++){
   players[0].theta=i*.5;players[1].phi=i*.4;turnFreeCamera(rig,1,.1);
   updateFreeCamera(rig,players[0],.1,0,0,[players[1]]);visible(rig.camera,combatFramePoints(players));
  }
 }
});
test('distant/behind-camera opponent indicators stay inside their own pane',()=>{
 const camera=new PerspectiveCamera(55,.5,.1,120);camera.position.set(0,2,10);camera.lookAt(0,2,0);camera.updateMatrixWorld();
 for(const point of [{x:100,y:2,z:0},{x:-100,y:2,z:0},{x:0,y:2,z:30},{x:0,y:200,z:0}]){
  const marker=opponentIndicator(camera,point,{x:640,width:640,height:720});
  assert.equal(marker.visible,false);assert.ok(marker.x>=675&&marker.x<=1245);assert.ok(marker.y>=125&&marker.y<=595);assert.ok(Number.isFinite(marker.angle));
 }
});
