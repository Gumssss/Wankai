import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,weaponPointFrame,weaponSegments,v3} from '../src/physics.js';
import {BEAGLE} from '../src/beagle-profile.js';
import {BEAGLE_SKILL} from '../src/beagle-skill.js';
import {GameSession} from '../src/game-session.js';
import {sandbox,sparring} from './sandbox.js';
const advance=(w,seconds,input={})=>{for(let i=0;i<Math.round(seconds/CONFIG.step);i++)w.step([input]);};

test('only F skill spreads the ears; normal W/S with A/D remains upright and drives through ground contact',()=>{
 for(const theta of [-1,1])for(const phi of [-1,1]){
  const w=new ArenaPhysics();sandbox(w,'beagle');const p=w.players[0];let rise=0;
  for(let i=0;i<540;i++){w.step([{theta,phi}]);rise=Math.max(rise,p.p.y-CONFIG.bodyFloor);assert.equal(p.earSpread,0);}
  assert.ok(rise>.4);assert.ok(Math.hypot(p.p.x,p.p.z)>.25);
 }
});

test('a tap starts a fixed-duration rotor and low hover; timer expiry lands and retracts',()=>{
 const w=new ArenaPhysics();sandbox(w,'beagle');const p=w.players[0];
 advance(w,CONFIG.step,{skill:true});advance(w,2,{});
 assert.equal(p.skillActive,true);assert.ok(p.earSpread>1.56);assert.ok(p.wp>3);
 assert.ok(Math.abs(p.p.y-(CONFIG.bodyFloor+BEAGLE_SKILL.hoverHeight))<.035,`hover height ${p.p.y}`);
 assert.equal(p.stamina,200);
 const tips=Object.values(BEAGLE.anchors).map(a=>weaponPointFrame(p,v3(0,3.6,0),a).point);
 assert.ok(Math.abs(tips[0].y-tips[1].y)<.002);
 assert.ok(Math.hypot(tips[0].x-tips[1].x,tips[0].z-tips[1].z)>8);
 advance(w,3.1,{});assert.equal(p.skillActive,false);
 let landed=false;
 for(let i=0;i<360;i++){w.step([{}]);landed ||= p.grounded&&p.p.y<=CONFIG.bodyFloor+.03;}
 assert.equal(p.earSpread,0);assert.ok(landed,'timer expiry did not return the beagle to ground contact');
});

test('skill has no stamina cost or fatigue gate, repeated input cannot extend it, and holding cannot auto-recast',()=>{
 const w=new ArenaPhysics();sandbox(w,'beagle');const p=w.players[0];p.stamina=0;
 advance(w,1,{skill:true,phi:1});assert.equal(p.skillActive,true);assert.ok(p.wp>4);
 const remaining=p.skillRemaining;p.skillRequested=true;advance(w,.5,{skill:true});
 assert.ok(p.skillRemaining<remaining-.49,'repeated activation extended the timer');
 advance(w,4.5,{skill:true});assert.equal(p.skillActive,false);
 advance(w,2,{skill:true});assert.equal(p.skillActive,false);
 advance(w,.1,{});advance(w,.2,{skill:true});assert.equal(p.skillActive,true);
 sandbox(w,'beagle');assert.equal(w.players[0].skillActive,false);assert.equal(w.players[0].skillRemaining,0);
 assert.equal(w.players[0].stamina,200);
 const free=new ArenaPhysics();sandbox(free,'beagle');
 advance(free,4,{skill:true,theta:1,phi:1});assert.equal(free.players[0].stamina,200,'skill and its steering consumed stamina');
});

test('A/D can reverse the rotor; ordinary weapons do not hover or spend skill stamina',()=>{
 const w=new ArenaPhysics();sandbox(w,'beagle');const p=w.players[0];
 advance(w,1,{skill:true});advance(w,.8,{skill:true,phi:-1});assert.ok(p.wp<0);
 const plain=new ArenaPhysics();sandbox(plain,'sword');advance(plain,2,{skill:true});
 assert.equal(plain.players[0].skillActive,false);assert.equal(plain.players[0].stamina,200);
});

test('deploying ear contact velocities include splay and lag, and sockets stay fixed',()=>{
 const w=new ArenaPhysics();sandbox(w,'beagle');const p=w.players[0];
 Object.assign(p,{p:v3(.2,4,-.3),v:v3(.2,.1,.3),theta:-1.2,phi:.4,wt:1,wp:2,
  earSpread:.7,earSpreadRate:1.3,earLag:.05,earLagRate:-.2});
 const h=1e-6,next={...p,p:v3(p.p.x+p.v.x*h,p.p.y+p.v.y*h,p.p.z+p.v.z*h),theta:p.theta+p.wt*h,
  phi:p.phi+p.wp*h,earSpread:p.earSpread+p.earSpreadRate*h,earLag:p.earLag+p.earLagRate*h};
 for(const anchor of Object.values(BEAGLE.anchors)){
  const f=weaponPointFrame(p,v3(.1,2.5,.04),anchor),g=weaponPointFrame(next,v3(.1,2.5,.04),anchor);
  assert.ok(Math.hypot(...['x','y','z'].map(k=>(g.point[k]-f.point[k])/h-f.velocity[k]))<1e-4);
  const socket=weaponPointFrame(p,v3(),anchor);assert.ok(Math.abs(socket.point.y-p.p.y-anchor[1])<1e-8);
 }
});

test('hovering rotor ears still hit once per pair and clash with a normal sword',()=>{
 const w=new ArenaPhysics();sparring(w,'beagle','sword');const [a,b]=w.players;
 Object.assign(a,{p:v3(0,.94,0),theta:-Math.PI/2,phi:0,wp:4.25,earSpread:Math.PI/2});
 const c=BEAGLE.colliders[6],f=weaponPointFrame(a,v3(...c.b),c.anchor);
 b.p=v3(f.point.x-.35,CONFIG.bodyFloor,f.point.z);
 w.solveAttack(a,b,CONFIG.step);assert.ok(w.lastHit?.damage>0);
 assert.equal(w.events.filter(e=>e.type==='hit').length,1);
 const health=b.health;w.solveAttack(a,b,CONFIG.step);assert.equal(b.health,health);
 const clash=new ArenaPhysics();sparring(clash,'beagle','sword');
 Object.assign(clash.players[0],{p:v3(0,.94,0),theta:-Math.PI/2,wp:4.25,earSpread:Math.PI/2});
 Object.assign(clash.players[1],{p:v3(.4,CONFIG.bodyFloor,4),theta:.4});
 clash.solveStaffClash(CONFIG.step);assert.ok(clash.events.some(e=>e.type==='clash'));
});

test('F drives only the local skill, and releasing focus/pause clears skill input',()=>{
 const game=new GameSession();for(const name of ['unlock','tick','swing','impact','tone'])game.sound[name]=()=>{};
 const ears={characterId:'beagle',weaponId:'long-ears'};
 game.setLoadouts([ears,ears]);game.startRound('ai');game.state='playing';
 game.keyDown('KeyF');assert.equal(game.getInputs()[0].skill,true);assert.equal(game.getInputs()[1].skill,undefined);
 game.keyDown('KeyW');game.keyDown('KeyD');assert.equal(game.getInputs()[0].theta,1);assert.equal(game.getInputs()[0].phi,1);
 game.pause();assert.ok(game.getInputs().every(i=>!i.skill));game.resume();
 game.keyDown('KeyF');game.keyUp('KeyF');game.tick(.05);
 assert.equal(game.world.players[0].skillActive,true,'a quick F tap between frames was lost');
 const remaining=game.world.players[0].skillRemaining;game.pause();game.tick(.05);
 assert.equal(game.world.players[0].skillRemaining,remaining,'pause advanced the timer');
 game.resume();game.clearKeys();assert.ok(game.getInputs().every(i=>!i.skill));
});

test('active and retracting skills stay finite against every loadout, including two independent rotors',()=>{
 for(const opponent of ['sword','polearm','hammer','beagle']){
  const w=new ArenaPhysics();sparring(w,'beagle',opponent);
  for(let i=0;i<720;i++){
   w.step([{skill:i<450,theta:i>500?1:0,phi:i>500?-1:0},opponent==='beagle'?{skill:i>120&&i<600}:{theta:-1,phi:1}]);
   for(const p of w.players){
    assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z+p.wt+p.wp));
    assert.ok(p.stamina>=0&&p.stamina<=200);
    if(p.weapon==='long-ears'){assert.ok(p.earSpread>=0&&p.earSpread<=Math.PI/2);}
   }
  }
 }
});
