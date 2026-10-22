import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceLobbyCamera} from '../src/lobby-camera.js';
const intro = () => ({phase:'cover',elapsed:0,angle:-.72,transition:0});
test('entrance and breathing menu meet without a camera or zoom jump at any orbit angle',()=>{
  for(const angle of [-3,-.72,0,2.9]) {
    const state={...intro(),phase:'transition',startAngle:angle,angle};
    let end; for(let i=0;i<250;i++) end=advanceLobbyCamera(state,1/60);
    assert.ok(end.complete);
    state.phase='done';const next=advanceLobbyCamera(state,1/60);
    for(const key of ['x','y','z','zoom']) assert.ok(Math.abs(next[key]-end[key])<.00001,key);
    assert.ok(Math.abs(end.z-21)<1e-10);
  }
});
test('idle breathing stays bounded and reduced motion is stationary',()=>{
  for(const reduced of [false,true]) {
    const state={...intro(),phase:'done',angle:0};let moved=false;
    for(let i=0;i<3600;i++) {
      const p=advanceLobbyCamera(state,1/60,reduced);
      assert.ok(Math.abs(p.x)<=.99&&Math.abs(p.y-15.4)<.541&&Math.abs(p.z-21)<=.72);
      assert.ok(Math.abs(p.zoom-1)<.0271);
      moved ||= Math.abs(p.x)>.01;
    }
    assert.equal(moved,!reduced);
  }
});
test('return captures breathing pose and joins the orbit continuously, then permits another entrance',()=>{
  const state={...intro(),phase:'done',angle:0};
  for(let i=0;i<330;i++) advanceLobbyCamera(state,1/60);
  const before={...state.lastPose};
  Object.assign(state,{phase:'returning',returnFrom:before,returnTime:0,returnAngle:Math.atan2(before.x,before.z)});
  const first=advanceLobbyCamera(state,0);
  for(const key of ['x','y','z','zoom']) assert.equal(first[key],before[key]);
  let end;for(let i=0;i<240;i++)end=advanceLobbyCamera(state,1/60);
  end=advanceLobbyCamera(state,1/60);assert.ok(end.returned);
  Object.assign(state,{phase:'cover',orbitBase:state.angle,elapsed:0});
  const cover=advanceLobbyCamera(state,0);
  for(const key of ['x','y','z','zoom'])assert.ok(Math.abs(cover[key]-end[key])<1e-10);
  Object.assign(state,{phase:'transition',transition:0,startAngle:state.angle});
  const entering=advanceLobbyCamera(state,0);
  for(const key of ['x','y','z','zoom'])assert.ok(Math.abs(entering[key]-cover[key])<1e-10);
});
