import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,WEAPONS,v3,weaponPointFrame,weaponSegments,damageForImpact,hurtSegments} from '../src/physics.js';
import {BEAGLE} from '../src/beagle-profile.js';
import {createFreeCameraRig,updateFreeCamera} from '../src/free-camera.js';
import {Vector3} from 'three';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

test('ear sockets stay on the head through complete swings and their Jacobians match combined motion',()=>{
 const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];
 Object.assign(p,{p:v3(.2,5,-.3),v:v3(.4,.1,-.2),wt:2.3,wp:-1.2});
 for(const theta of [-Math.PI*2,-Math.PI,0,.9,Math.PI,Math.PI*2])for(const phi of [-2,.8,3]){
  Object.assign(p,{theta,phi});
  for(const anchor of Object.values(BEAGLE.anchors)){
   const socket=weaponPointFrame(p,v3(),anchor);
   assert.ok(Math.abs(socket.point.y-p.p.y-anchor[1])<1e-10);
   assert.ok(Math.hypot(socket.jt.x,socket.jt.y,socket.jt.z)<1e-10,'hinge location must not orbit in pitch');
   const h=1e-6,f=weaponPointFrame(p,v3(.12,2.1,.05),anchor),next=weaponPointFrame({...p,
    p:v3(p.p.x+p.v.x*h,p.p.y+p.v.y*h,p.p.z+p.v.z*h),theta:theta+p.wt*h,phi:phi+p.wp*h},v3(.12,2.1,.05),anchor);
   assert.ok(dist(v3((next.point.x-f.point.x)/h,(next.point.y-f.point.y)/h,(next.point.z-f.point.z)/h),f.velocity)<1e-4);
  }
 }
});

test('W/S with either turn direction produces real grounded lift and travel, never an airborne movement force',()=>{
 for(const theta of [-1,1])for(const phi of [-1,1]){
  const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];let rise=0;
  for(let i=0;i<540;i++){w.step([{theta,phi}]);rise=Math.max(rise,p.p.y-CONFIG.bodyFloor);}
  assert.ok(rise>.4,`missing substantial lift for ${theta}/${phi}: ${rise}`);
  assert.ok(Math.hypot(p.p.x,p.p.z)>.25,'ears must carry the body through contact');
  const air=new ArenaPhysics();air.reset(false,true,'beagle');air.players[0].p.y=1000;
  for(let i=0;i<180;i++)air.step([{theta,phi}]);
  assert.equal(air.players[0].p.x,0);assert.equal(air.players[0].p.z,0);
 }
});

test('both ears use one stamina budget and release/reverse retain the ordinary controller rules',()=>{
 const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];p.p.y=1000;p.theta=0;
 for(let i=0;i<180;i++)w.step([{theta:1,phi:1}]);
 assert.ok(Math.abs(p.stamina-72)<1e-7,'the pair must not charge twice');
 const before=p.wt;w.step([{}]);assert.ok(p.wt>0&&p.wt<=BEAGLE.maxAngularSpeed);
 assert.ok(p.wt>before*.8,'release must coast');
 p.theta=0;p.wt=3;
 w.step([{theta:-1}]);assert.ok(p.wt>0&&p.wt<3,'reverse must brake before reversing');
 for(let i=0;i<90;i++)w.step([{theta:-1}]);assert.ok(p.wt<0);
});

function impact(horizontal){
 const w=new ArenaPhysics();w.reset(true,false,'beagle','polearm');const [a,b]=w.players;
 Object.assign(a,{p:v3(0,10,0),theta:Math.PI/2,phi:.3,wt:horizontal?0:4,wp:horizontal?4:0});
 const c=BEAGLE.colliders[7],point=v3(...c.b),f=weaponPointFrame(a,point,c.anchor);
 const speed=Math.hypot(f.velocity.x,f.velocity.y,f.velocity.z),n=v3(-f.velocity.x/speed,-f.velocity.y/speed,-f.velocity.z/speed);
 const gap=c.radius+CONFIG.bodyRadius-.025;
 b.p=v3(f.point.x-n.x*gap,f.point.y-n.y*gap-.76,f.point.z-n.z*gap);
 w.solveAttack(a,b,CONFIG.step);return w;
}

test('vertical and horizontal ears deal ordinary directional damage, with one pair-level hit event',()=>{
 for(const horizontal of [false,true]){
  const w=impact(horizontal),hit=w.lastHit;assert.ok(hit,'ear contact did not register');
  assert.ok(Math.abs(hit.turnShare-(horizontal?1:0))<1e-8);
  assert.equal(hit.damage,Math.round(damageForImpact(hit.speed,hit.acceleration)*(horizontal?.5:1)));
  assert.equal(w.events.filter(e=>e.type==='hit').length,1);
  const health=w.players[1].health;w.solveAttack(...w.players,CONFIG.step);
  assert.equal(w.players[1].health,health,'second ear/overlapping contacts must not double hit');
 }
});

test('head hurtbox follows the broader beagle and its camera contains the full ear envelope',()=>{
 const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];
 assert.ok(hurtSegments(p).some(s=>s.radius>=.55));
 for(const aspect of [.3,.7,1.5])for(const theta of [-2.8,-1.55,0,1.8,Math.PI]){
  p.theta=theta;p.phi=.6;const rig=createFreeCameraRig(undefined,true);rig.camera.aspect=aspect;rig.camera.updateProjectionMatrix();
  updateFreeCamera(rig,p,1/60);
  for(const s of weaponSegments(p))for(const point of [s.a,s.b]){
   const screen=new Vector3(point.x,point.y,point.z).project(rig.camera);
   assert.ok(Math.abs(screen.x)<.75&&screen.y<.53&&screen.y>-.75,'ear left its pane');
  }
 }
 assert.equal(WEAPONS.beagle,BEAGLE);
});

test('a powered ear meets a sword under the ordinary clash and recoil rules',()=>{
 const w=new ArenaPhysics();w.reset(true,false,'beagle','sword');
 Object.assign(w.players[0],{p:v3(0,CONFIG.bodyFloor,0),theta:.4});
 Object.assign(w.players[1],{p:v3(4.3,CONFIG.bodyFloor,.78),theta:1.25});
 let clash;
 for(let i=0;i<540;i++){
  w.step([{theta:i<252?1:0},{}]);clash=w.events.find(e=>e.type==='clash');
  if(clash)break;
 }
 assert.ok(clash,'ear must block and deflect an ordinary weapon');
 for(const p of w.players){
  const forward=p.v.x*Math.cos(p.phi)+p.v.z*Math.sin(p.phi);
  assert.ok(forward<=-clash.recoilSpeed+1e-6,'both fighters must recoil opposite their facing');
 }
});
