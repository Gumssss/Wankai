import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera,Vector3,Mesh,BoxGeometry,Box3,Raycaster,MeshBasicMaterial} from 'three';
import {ArenaView} from '../src/scene.js';
import {FIXED_CAMERA} from '../src/fixed-camera.js';
import {prepareArenaCamera} from '../src/arena-model.js';
import {ARENA_PROFILE} from '../src/arena-profile.js';

// Exercise the real view constructor without creating browser-backed assets.
class DisplayView extends ArenaView {
  makeLighting() {}
  makeArena() {}
  makeFighter() { return {}; }
}
function viewFor(mode){
  const previous=globalThis.matchMedia;
  globalThis.matchMedia=()=>({matches:false});
  try{return new DisplayView({},new PerspectiveCamera(55,1.8,.1,120),mode);}
  finally{if(previous)globalThis.matchMedia=previous;else delete globalThis.matchMedia;}
}

test('fixed actors, impacts and HUD share the approved display basis while other modes retain world coordinates',()=>{
  const point={x:3,y:1.8,z:-2};
  for(const mode of ['duel-fixed','duel','solo','practice']){
    const view=viewFor(mode),fixed=mode==='duel-fixed';
    const expected=fixed?new Vector3(1/Math.sqrt(2),1.8,-5/Math.sqrt(2)):new Vector3(3,1.8,-2);
    for(const root of [view.actors,view.effectsRoot]){
      const marker=new Group();marker.position.set(point.x,point.y,point.z);root.add(marker);root.updateMatrixWorld(true);
      assert.ok(marker.getWorldPosition(new Vector3()).distanceTo(expected)<1e-12,'visible root must match the display coordinate frame');
    }
    view.camera.updateMatrixWorld();
    const projected=expected.clone().project(view.camera);
    const label=view.project(point,view.camera,{x:20,width:900,height:500});
    assert.ok(Math.abs(label.x-(20+(projected.x*.5+.5)*900))<1e-9);
    assert.ok(Math.abs(label.y-(-projected.y*.5+.5)*500)<1e-9);
    assert.deepEqual(point,{x:3,y:1.8,z:-2},'presentation must not mutate simulation positions');
  }
});

test('fixed wall visibility rays follow displayed fighters rather than the original solver positions',()=>{
  const view=viewFor('duel-fixed'),scene=new Group();
  // A small obstruction lies on the ray to the rotated fighter only.
  const players=[{p:{x:4*Math.SQRT2,y:.59,z:0}}];
  const wall=new Mesh(new BoxGeometry(.6,3,.6),new MeshBasicMaterial());
  wall.name=ARENA_PROFILE.sectorPrefix+'00';
  wall.position.copy(view.camera.position).lerp(view.displayPoint(players[0].p),.5);
  scene.add(wall);scene.updateMatrixWorld(true);
  view.colosseum={root:scene,sectors:[{mesh:wall,box:new Box3().setFromObject(wall)}],
    raycaster:new Raycaster(),cache:new Map(),point:new Vector3(),direction:new Vector3(),
    origin:new Vector3(),cameraDirection:new Vector3(),lastOcclusion:new Map()};
  assert.ok(view.prepareArenaCamera(view.camera,players).includes(wall.name),'wall covering the displayed fighter must clear');
  assert.ok(!prepareArenaCamera(view.colosseum,view.camera.clone(),players).includes(wall.name),'unrotated rays should miss the deliberately offset wall');
  assert.deepEqual(players,[{p:{x:4*Math.SQRT2,y:.59,z:0}}]);
  wall.geometry.dispose();wall.material.dispose();
});

test('fixed camera exactly matches the approved lower closer preview',()=>{
  assert.deepEqual(FIXED_CAMERA.position,[22.802009683082648,12,9.77228986417828]);
  assert.deepEqual(FIXED_CAMERA.target,[0,1.4,0]);
  const range=new Vector3(...FIXED_CAMERA.position).distanceTo(new Vector3(...FIXED_CAMERA.target));
  assert.ok(Math.abs(range-30.831508818660758*.875)<1e-12);
});
