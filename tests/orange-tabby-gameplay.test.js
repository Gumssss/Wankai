import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ArenaPhysics,CONFIG,makePlayer,weaponPointFrame,weaponSegments,hurtSegments,closestSegments,v3} from '../src/physics.js';
import {GameSession} from '../src/game-session.js';
import {isPawLoadout,normalizeLoadout} from '../src/loadouts.js';
import {sandbox,sparring} from './sandbox.js';

const CAT=Object.freeze({characterId:'orange-tabby',weaponId:'cat-paws'});
const SWORD=Object.freeze({characterId:'basic-fighter',weaponId:'sword'});
const reference=JSON.parse(await readFile(new URL('../assets/concepts/orange-tabby/motion-v06/game-solver-replay.json',import.meta.url)));
const ordinary=reference.shots.filter(shot=>shot.group!=='combat');
const near=(actual,expected,context,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${context}: ${actual} differs from accepted ${expected}`);
const zero={theta:0,phi:0};

// These are the reviewed recording's actual key intervals, sampled at the
// production 180 Hz step rather than rounded to its 60 Hz evidence frames.
function keysAt(id,t){
 if(id==='s')return t>.4&&t<3.3?'S':'';
 if(id==='hover-idle'||id==='opposites')return '';
 if(id==='release-reverse')return t<.25?'':t<1.45?'W':t<2.05?'':t<3.8?'S':'';
 if(id==='yaw-reverse')return t<.25?'':t<1.25?'A':t<1.7?'':t<3?'D':'';
 if(id==='landing')return t>1.35&&t<2.8?'W':'';
 return t>.25&&t<2.4?id.toUpperCase():'';
}
function inputAt(id,t){
 const keys=keysAt(id,t);
 return {theta:Number(keys.includes('W'))-Number(keys.includes('S')),phi:Number(keys.includes('D'))-Number(keys.includes('A'))};
}
function replay(shot,onSample){
 const world=new ArenaPhysics();sandbox(world,CAT,5);
 const p=world.players[0],initial=shot.rows[0].players[0];
 Object.assign(p,{p:{...initial.p},v:{...initial.v},theta:initial.theta,phi:initial.phi,wt:initial.wt,wp:initial.wp});
 for(let tick=0;tick<=Math.round(shot.duration/CONFIG.step);tick++){
  if(tick)world.step([inputAt(shot.id,tick*CONFIG.step)],CONFIG.step);
  if(tick%3===0)onSample(p,shot.rows[tick/3].players[0],tick*CONFIG.step,tick);
 }
 return world;
}

assert.equal(ordinary.length,13,'the accepted matrix includes all directions and recovery cases');
for(const shot of ordinary)test(`production cat reproduces accepted ${shot.id} motion, contacts and shared stamina`,()=>{
 let firstSupport=null,highest=.35,maxBeforeSupport=.35,airborneAscent=false;
 const world=replay(shot,(p,expected,time,tick)=>{
  for(const vector of ['p','v'])for(const axis of ['x','y','z'])near(p[vector][axis],expected[vector][axis],`${shot.id} at ${time}: ${vector}.${axis}`);
  for(const key of ['theta','phi','wt','wp','health','stamina'])near(p[key],expected[key],`${shot.id} at ${time}: ${key}`);
  assert.equal(p.staffGrounded,expected.contact,`${shot.id} at ${time}: paw-floor contact`);
  // The old prototype marked its hand-positioned initial player grounded.
  // Compare solved states; the production spawn must report airborne below.
  if(tick)assert.equal(p.grounded,expected.grounded,`${shot.id} at ${time}: body grounded`);
  assert.ok(p.stamina>=0&&p.stamina<=200);
  const base=p.p.y-CONFIG.bodyFloor;highest=Math.max(highest,base);
  if(firstSupport===null){if(p.staffGrounded)firstSupport=time;else maxBeforeSupport=Math.max(maxBeforeSupport,base);}
  if(!p.staffGrounded&&base>1&&p.v.y>0)airborneAscent=true;
 });
 assert.equal(world.events.length,0,'ordinary movement has no invented impacts');
 if(shot.id==='s'){
  near(firstSupport,reference.verification.liftProof.firstSupportTime,'S contact time');
  near(maxBeforeSupport,.35,'S has no ascent before contact');
  near(highest,reference.verification.liftProof.maximumBaseHeight,'accepted S peak');
  assert.ok(highest-.35>1.5&&airborneAscent,'planted paws must produce a clear airborne phase');
  assert.ok(world.players[0].p.y-CONFIG.bodyFloor<.45,'S release must settle back to hover');
 }
});

test('paw contact velocities match the moving visible frame through pitch and yaw',()=>{
 const p=makePlayer(0,CAT);Object.assign(p,{p:v3(.3,1.7,-.4),v:v3(.5,.2,-.1),theta:1.1,phi:-.7,wt:2.3,wp:-1.2});
 const h=1e-7,future={...p,p:v3(p.p.x+p.v.x*h,p.p.y+p.v.y*h,p.p.z+p.v.z*h),theta:p.theta+p.wt*h,phi:p.phi+p.wp*h};
 for(const segment of weaponSegments(p)){
  const frame=weaponPointFrame(p,segment.localA,segment.anchor),next=weaponPointFrame(future,segment.localA,segment.anchor);
  for(const axis of ['x','y','z'])near((next.point[axis]-frame.point[axis])/h,frame.velocity[axis],`contact ${axis}`,1e-5);
 }
});

function session(){
 const game=new GameSession();for(const key of ['unlock','tick','tone','swing','impact'])game.sound[key]=()=>{};
 assert.equal(game.setLoadouts([CAT,CAT]),true);return game;
}
test('the local cat receives every paired direction, while opposite keys cancel and cat skills stay disabled',()=>{
 const game=session();game.startRound('ai');game.state='playing';
 for(const [keys,input] of [[['KeyW'],{theta:1,phi:0}],[['KeyS'],{theta:-1,phi:0}],
  [['KeyA'],{theta:0,phi:-1}],[['KeyD'],{theta:0,phi:1}],
  [['KeyW','KeyA'],{theta:1,phi:-1}],[['KeyW','KeyD'],{theta:1,phi:1}],
  [['KeyS','KeyA'],{theta:-1,phi:-1}],[['KeyS','KeyD'],{theta:-1,phi:1}],
  [['KeyW','KeyS','KeyA','KeyD'],zero]]){
  game.clearKeys();keys.forEach(key=>game.keyDown(key));assert.deepEqual(game.getInputs(),[input,zero]);
 }
 game.keyDown('KeyF');
 assert.ok(!game.keys.has('KeyF'));
 assert.ok(game.world.players.every(p=>!p.skillRequested&&!p.skillActive));
 for(let tick=0;tick<90;tick++)game.world.step([{theta:0,phi:0,skill:true},{theta:0,phi:0,skill:true}]);
 assert.ok(game.world.players.every(p=>!p.skillActive&&p.skillRemaining===0));
});

test('pause, rematch and return home preserve the cat loadout and reset motion/resources',()=>{
 const game=session();
 for(let round=0;round<2;round++){
  game.startRound('ai');game.state='playing';game.keyDown('KeyS');
  for(let tick=0;tick<60;tick++)game.world.step(game.getInputs());
  game.pause();const before=JSON.stringify(game.world.players),time=game.world.time;
  assert.equal(game.keys.size,0);game.tick(.04);assert.equal(game.world.time,time);assert.equal(JSON.stringify(game.world.players),before);
  game.resume();assert.deepEqual(game.getInputs(),[zero,zero]);
  game.world.players[0].health=31;game.world.players[0].stamina=18;
  game.startRound();assert.equal(game.mode,'ai');assert.equal(game.world.time,0);assert.deepEqual(game.getSnapshot().pressed,[]);
  for(const p of game.world.players){
   assert.ok(isPawLoadout(p));assert.equal(p.health,100);assert.equal(p.stamina,200);
   near(p.p.y,CONFIG.bodyFloor+.35,'cat spawn hover');near(p.theta,Math.PI/2,'neutral paw pose');
   for(const value of [p.v.x,p.v.y,p.v.z,p.wt,p.wp,p.driveT,p.driveP,p.polarInput])near(value,0,'reset motion');
   assert.equal(p.staffGrounded,false);assert.equal(p.grounded,false);assert.equal(p.skillActive,false);
  }
  game.goHome();assert.deepEqual(game.getSnapshot().loadouts,[CAT,CAT]);
 }
 assert.deepEqual(normalizeLoadout(CAT),CAT);
});

function combat({target,theta=.4,phi=0,targetTheta=.4,duration=3,turn=false}){
 const world=new ArenaPhysics();sparring(world,CAT,SWORD,5);
 const [a,b]=world.players;Object.assign(a,{p:v3(0,CONFIG.bodyFloor+.35,0),theta,phi});
 Object.assign(b,{p:v3(...target),theta:targetTheta,phi:Math.PI});
 const overlap=Math.max(...weaponSegments(a).flatMap(s=>hurtSegments(b).map(h=>s.radius+h.radius-closestSegments(s.a,s.b,h.a,h.b).distance)));
 assert.ok(overlap<1e-6,'combat fixture must begin without a paw inside the target');
 const events=[];
 for(let tick=1;tick<=Math.round(duration/CONFIG.step);tick++){
  const active=tick*CONFIG.step>.2&&tick*CONFIG.step<1.2;
  world.step([{theta:active&&!turn?1:0,phi:active&&turn?1:0},zero]);
  events.push(...world.events.map(e=>({...e,time:world.time})));
 }
 return {world,events};
}
test('actual paw and sword profiles produce vertical/horizontal hits, clash recoil and a clean miss',()=>{
 const vertical=combat({target:[1.8,CONFIG.bodyFloor,1.5]});
 // The old dummy had no weapon. An upright sword keeps the real target's
 // defense clear of this body-hit fixture; the separate fixture tests blocks.
 const horizontal=combat({target:[1.8,CONFIG.bodyFloor,-1],theta:1.05,phi:-.65,targetTheta:0,turn:true});
 const clash=combat({target:[3,CONFIG.bodyFloor,1.5],theta:1.05,targetTheta:1.4,duration:4});
 const miss=combat({target:[7,CONFIG.bodyFloor,6],theta:1.05,duration:2.5});
 const hits=result=>result.events.filter(e=>e.type==='hit'&&e.attacker===0);
 assert.ok(hits(vertical).length>0,'vertical paw swing must damage the actual fighter');
 assert.ok(hits(horizontal).some(e=>e.turnShare>.65),'horizontal steering must produce a turning hit');
 assert.ok(clash.events.some(e=>e.type==='clash'&&e.recoilSpeed>0),'actual paw/sword contact must deflect with recoil');
 assert.equal(hits(miss).length,0);assert.equal(miss.world.players[1].health,100);
 for(const result of [vertical,horizontal,clash,miss])for(const p of result.world.players){
  assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z+p.wt+p.wp));assert.ok(p.stamina>=0&&p.stamina<=200);assert.ok(p.health>=0&&p.health<=100);
 }
 for(const result of [vertical,horizontal])for(const hit of hits(result))assert.ok(hit.damage>0&&hit.speed>=1.65&&hit.strength>0);
});
