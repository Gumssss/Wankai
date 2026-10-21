import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,PerspectiveCamera,Vector3} from 'three';
import {ArenaView} from '../src/scene.js';
import {FIXED_CAMERA} from '../src/fixed-camera.js';
import {ARENA_PROFILE} from '../src/arena-profile.js';
import {arenaScaleForMode,makePlayer} from '../src/physics.js';

function resizeView(mode){
 const view=Object.create(ArenaView.prototype);
 view.solo=mode==='solo';
 view.fixed=mode==='duel-fixed';
 view.camera=view.fixed?new PerspectiveCamera(FIXED_CAMERA.fov,1,FIXED_CAMERA.near,FIXED_CAMERA.far):view.solo?new PerspectiveCamera(45,1,.1,120):new OrthographicCamera(-1,1,1,-1,.1,120);
 view.duelCameras=[0,1].map(()=>({camera:new PerspectiveCamera(45,1,.1,120)}));
 return view;
}
const cameras=view=>[view.camera,...view.duelCameras.map(rig=>rig.camera)];
const snapshot=view=>({width:view.width,height:view.height,cameras:cameras(view).map(camera=>({
 aspect:camera.aspect,left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom,
 projection:camera.projectionMatrix.toArray(),inverse:camera.projectionMatrixInverse.toArray()
}))});
const assertFinite=view=>{
 for(const camera of cameras(view)){
  assert.ok(camera.projectionMatrix.elements.every(Number.isFinite),'projection must remain finite');
  assert.ok(camera.projectionMatrixInverse.elements.every(Number.isFinite),'inverse projection must remain finite');
 }
};

for(const mode of ['duel-fixed','solo','duel'])test(`${mode} camera resize preserves its last valid projection while the arena is hidden`,()=>{
 const view=resizeView(mode);
 view.resize(1280,800);
 assertFinite(view);
 const visible=snapshot(view);
 // A hidden preparation-stage background may report zero dimensions.
 for(const [width,height]of [[0,0],[0,800],[1280,0],[-1,800],[1280,NaN],[Infinity,800]]){
  view.resize(width,height);
  assertFinite(view);
  assert.deepEqual(snapshot(view),visible,`invalid viewport ${width}x${height} must preserve the prior framing`);
 }
 view.resize(960,640);
 assertFinite(view);
 assert.equal(view.width,960);assert.equal(view.height,640);
 assert.notDeepEqual(view.camera.projectionMatrix.toArray(),visible.cameras[0].projection,'restoring a different viewport must update the main camera');
 if(mode==='solo'||mode==='duel-fixed')assert.equal(view.camera.aspect,960/640);
 for(const rig of view.duelCameras)assert.equal(rig.camera.aspect,480/640);
});

test('approved closer fixed view retains central fighters and most floor across desktop resizes without impact shake',()=>{
 const view=resizeView('duel-fixed');
 view.fixedDisplayRotation=FIXED_CAMERA.actorRotation;
 view.cameraBase=new Vector3(...FIXED_CAMERA.position);view.target=new Vector3(...FIXED_CAMERA.target);
 Object.assign(view,{banners:{visible:true},particles:[],rings:[],trailTime:0,reducedMotion:false,shake:1});
 view.camera.position.set(-1,2,3);
 view.update([],1/60,true,1/60,false,[1,-1]);
 assert.deepEqual(view.camera.position.toArray(),FIXED_CAMERA.position,'fixed camera must retain its selected pose even during impacts');
 view.camera.updateMatrixWorld();
 const pose=view.camera.matrixWorld.toArray(),radius=ARENA_PROFILE.radius*arenaScaleForMode('duel-fixed');
 for(const aspect of [1.5,1.8]){
  view.resize(900*aspect,900);
  assert.deepEqual(view.camera.matrixWorld.toArray(),pose,'resize must not orbit or move the shared view');
  let total=0,visible=0;
  for(let x=-radius;x<=radius;x+=.5)for(let z=-radius;z<=radius;z+=.5){
   if(x*x+z*z>radius*radius)continue;
   total++;
   const point=new Vector3(x,0,z).project(view.camera);
   if(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1)visible++;
  }
  assert.ok(visible/total>.88,'the approved central view must retain most playable floor');
  assert.ok(visible<total,'the reviewed tighter framing deliberately crops the foreground boundary');
  for(const player of [makePlayer(0,{characterId:'beagle',weaponId:'long-ears'}),makePlayer(1,{characterId:'orange-tabby',weaponId:'cat-paws'})]){
   for(const rise of [0,2.2,5])for(const x of [-.4,.4])for(const y of [-.55,1.56])for(const z of [-.4,.4]){
    const body=view.displayPoint({x:player.p.x+x,y:player.p.y+y+rise,z:player.p.z+z}).project(view.camera);
    assert.ok(Math.abs(body.x)<1&&Math.abs(body.y)<1&&Math.abs(body.z)<1,'central body/label sample left the shared frame');
   }
  }
 }
});
