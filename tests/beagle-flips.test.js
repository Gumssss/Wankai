import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,bodyPointFrame,hurtSegments,weaponPointFrame,weaponSegments,v3} from '../src/physics.js';
import {BEAGLE} from '../src/beagle-profile.js';
import {beagleMomentum,stepBeagleVelocity} from '../src/beagle-dynamics.js';

test('the superseded flip path is inactive during normal ear movement',()=>{
 for(const direction of [-1,1]){
  const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];
  for(let i=0;i<720;i++){w.step([{theta:direction,phi:1}]);assert.equal(p.bodyPitch,0);assert.equal(p.bodyRate,0);}
 }
});

test('body pitch, ear angle and yaw have matching point velocities and rotating sockets',()=>{
 const world=new ArenaPhysics();world.reset(false,true,'beagle');const p=world.players[0];
 Object.assign(p,{p:v3(.3,5,-.7),v:v3(.4,-.2,.8),bodyRate:2.1,wt:-3.2,wp:1.3});
 for(const beta of [-7,-Math.PI,-1.2,0,2,7])for(const theta of [-2.3,.6,3.7]){
  Object.assign(p,{bodyPitch:beta,theta,phi:.8});
  const h=1e-6,next={...p,p:v3(p.p.x+p.v.x*h,p.p.y+p.v.y*h,p.p.z+p.v.z*h),
   bodyPitch:beta+p.bodyRate*h,theta:theta+p.wt*h,phi:p.phi+p.wp*h};
  const points=[...Object.values(BEAGLE.anchors).map(a=>[v3(.1,2.5,-.04),a]),[v3(.1,.57,.2),null]];
  for(const [local,anchor] of points){
   const frame=anchor?weaponPointFrame(p,local,anchor):bodyPointFrame(p,local);
   const future=anchor?weaponPointFrame(next,local,anchor):bodyPointFrame(next,local);
   const error=Math.hypot(...['x','y','z'].map(axis=>(future.point[axis]-frame.point[axis])/h-frame.velocity[axis]));
   assert.ok(error<2e-4,`velocity mismatch ${error}`);
  }
 }
});

test('an airborne hinge motor reacts on the body without adding linear momentum',()=>{
 const world=new ArenaPhysics();world.reset(false,true,'beagle');const p=world.players[0];
 Object.assign(p,{p:v3(0,100,0),grounded:false,theta:0,bodyPitch:0});
 stepBeagleVelocity(p,CONFIG.step,0,1,0);
 const state=beagleMomentum(p);
 assert.ok(p.bodyRate<0&&p.wt>0,'a free hinge must push back on the body');
 assert.ok(Math.hypot(...state.linear)<1e-10,'internal motor added travel momentum');
 assert.ok(Math.abs(state.pitch)<1e-10,'internal motor added total pitch momentum');
});

test('normal release coasts, reversal brakes and rematch resets the upright state',()=>{
 const world=new ArenaPhysics();world.reset(false,true,'beagle');const p=world.players[0];
 Object.assign(p,{p:v3(0,100,0),theta:0,wt:3});
 world.step([{}]);assert.ok(p.wt>2.8);
 world.step([{theta:-1}]);assert.ok(p.wt<3&&p.wt>0);
 for(let i=0;i<90;i++)world.step([{theta:-1,phi:1}]);
 assert.ok(p.wt<0&&p.wp>0);assert.equal(p.bodyPitch,0);
 world.reset(false,true,'beagle');assert.equal(world.players[0].skillActive,false);
});

test('fatigue weakens articulated swing/turn power while keeping one shared stamina budget',()=>{
 const states=[];
 for(const stamina of [100,0]){
  const world=new ArenaPhysics();world.reset(false,true,'beagle');const p=world.players[0];
  Object.assign(p,{p:v3(0,100,0),grounded:false,theta:0,stamina});
  for(let i=0;i<90;i++)world.step([{theta:1,phi:1}]);
  states.push({speed:Math.abs(p.wt),yaw:p.wp,stamina:p.stamina});
 }
 assert.ok(states[1].speed<states[0].speed*.65);assert.ok(states[1].yaw<states[0].yaw*.65);
 assert.ok(Math.abs(states[0].stamina-85)<1e-8);assert.equal(states[1].stamina,0);
});

test('explicit body-pose geometry remains aligned while combat keeps the body upright',()=>{
 function strike(beta){
  const world=new ArenaPhysics();world.reset(true,false,'sword','beagle');const [a,b]=world.players;
  Object.assign(b,{p:v3(0,10,0),bodyPitch:beta});
  Object.assign(a,{p:v3(3.5,10.26,0),theta:Math.PI/2,phi:Math.PI,v:v3(-8,0,0)});
  world.solveAttack(a,b,CONFIG.step);return world;
 }
 const tilted=strike(Math.PI/2),upright=strike(0);
 assert.ok(tilted.lastHit&&tilted.players[1].health<100,'rotated head could not be hit');
 assert.equal(tilted.players[1].bodyRate,0,'ordinary hits must not re-enable the flip motor');
 assert.equal(upright.lastHit,null,'old upright hurtbox still received the rotated-head hit');
});

test('rotating body separation cannot push an upright opponent through the floor',()=>{
 const world=new ArenaPhysics();world.reset(true,false,'beagle','sword');
 world.players[0].p=v3(0,1,0);world.players[1].p=v3(.1,CONFIG.bodyFloor,0);
 world.step([{},{}]);assert.ok(world.players[1].p.y>=CONFIG.bodyFloor);
});
