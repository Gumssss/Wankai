import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OrthographicCamera} from 'three';
import {ArenaView} from '../src/scene.js';
import {createFreeCameraRig} from '../src/free-camera.js';

function resizeView(){
 const view=Object.create(ArenaView.prototype);
 view.camera=new OrthographicCamera(-1,1,1,-1,.1,120);
 view.followCamera=createFreeCameraRig();
 return view;
}
const cameras=view=>[view.camera,view.followCamera.camera];
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

test('lobby and follow cameras keep their last valid projection while the arena is hidden',()=>{
 const view=resizeView();
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
 assert.notDeepEqual(view.camera.projectionMatrix.toArray(),visible.cameras[0].projection,'restoring a different viewport must update the lobby camera');
 assert.equal(view.followCamera.camera.aspect,960/640,'the follow camera fills the whole window');
});
