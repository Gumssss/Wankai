import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera,PerspectiveCamera} from 'three';
import {ArenaView} from '../src/scene.js';

function resizeView(mode){
 const view=Object.create(ArenaView.prototype);
 view.solo=mode==='solo';
 view.camera=view.solo?new PerspectiveCamera(45,1,.1,120):new OrthographicCamera(-1,1,1,-1,.1,120);
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
 if(mode==='solo')assert.equal(view.camera.aspect,960/640);
 for(const rig of view.duelCameras)assert.equal(rig.camera.aspect,480/640);
});
