import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,STAMINA,WEAPONS,makePlayer,hurtSegments,closestSegments,v3,staminaPower,arenaScaleForMode} from '../src/physics.js';
import {GameSession} from '../src/game-session.js';
import {updateRound} from '../src/round-rules.js';

const cat={characterId:'orange-tabby',weaponId:'cat-paws'};
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
function advance(w,seconds,input={}){for(let i=0;i<Math.round(seconds/CONFIG.step);i++)w.step([input,{}]);}
function air(selection,stamina=200){const w=new ArenaPhysics();w.reset(false,true,selection);Object.assign(w.players[0],{p:v3(0,1000,0),stamina,theta:0});return w;}

test('rotor pays 80 stamina for five seconds and cannot activate empty or auto-repeat',()=>{
 const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];
 advance(w,5,{skill:true});near(p.stamina,120);assert.equal(p.skillActive,false);
 advance(w,1,{skill:true});assert.equal(p.skillActive,false);
 const empty=air('beagle',0);advance(empty,.1,{skill:true});assert.equal(empty.players[0].skillActive,false);
 const low=air('beagle',39);advance(low,.1,{skill:true});assert.equal(low.players[0].skillActive,false);
});
test('rotor exhausts, retracts and blocks regeneration through retraction',()=>{
 const w=new ArenaPhysics();w.reset(false,true,'beagle');const p=w.players[0];p.stamina=40;
 advance(w,2,{skill:true});assert.ok(p.skillActive);assert.ok(p.wp<3,'fatigue must slow the rotor');
 advance(w,.5,{skill:true});near(p.stamina,0);assert.equal(p.skillActive,false);
 advance(w,.3,{});near(p.stamina,0);assert.ok(p.earSpread>0);
 advance(w,1.2,{});assert.ok(p.stamina>0);assert.equal(p.earSpread,0);
});
test('supported hover loses about half its horizontal speed; ordinary airborne coasting stays free',()=>{
 const w=new ArenaPhysics();w.reset(false,true,cat);const p=w.players[0];p.v.x=4;
 advance(w,.5);near(p.v.x/4,Math.exp(-1.5*.5),.015);
 const high=air(cat);high.players[0].v.x=4;advance(high,.5);near(high.players[0].v.x/4,Math.exp(-.15*.5));
});
test('cat and normal ears steering targets weaken with fatigue rather than just acceleration',()=>{
 for(const selection of [cat,'beagle']){
  const fresh=air(selection),tired=air(selection,0);
  advance(fresh,2,{phi:1});advance(tired,2,{phi:1});
  assert.ok(tired.players[0].wp<fresh.players[0].wp*.6);
 }
});
test('shared fatigue and recovery use the complete candidate pacing',()=>{
 assert.equal(STAMINA.turnDrain,10);assert.equal(STAMINA.lowThreshold,60);
 near(staminaPower(30),.7);near(staminaPower(0),.4);
 const w=air('sword',0);advance(w,3);assert.ok(w.players[0].stamina<60);advance(w,.1);near(w.players[0].stamina,60);
});
test('large hurtbox characters have an explicit capped durability trial and reset their own maximum',()=>{
 for(const [characterId,weaponId,hp]of [['basic-fighter','sword',100],['beagle','sword',80],['yellow-blob','yellow-staff',110],['orange-tabby','cat-paws',150]]){
  const p=makePlayer(0,{characterId,weaponId});assert.equal(p.maxHealth,hp);assert.equal(p.health,hp);
  for(const s of hurtSegments(p))for(const q of [s.a,s.b])assert.ok(q.y-s.radius>=-.001,'upright solid must not extend below its rendered floor');
 }
});

test('pressure cannot undo an earlier knockout and simultaneous proportional pressure deaths draw',()=>{
 const w=new ArenaPhysics();w.reset(false,false,'beagle','sword');w.time=100;
 w.players.forEach((p,id)=>{p.p=v3(id?17:-17,.59,0);p.zoneOutside=2;});
 for(let i=0;i<1800&&w.winner===null;i++){w.time+=CONFIG.step;updateRound(w,CONFIG.step);}
 assert.equal(w.winner,-1);assert.equal(w.endReason,'pressure');
 w.reset();w.time=100;w.players[0].health=0;w.players[1].health=.001;
 w.players[1].p.x=18;w.players[1].zoneOutside=3;updateRound(w,CONFIG.step);
 assert.equal(w.winner,1);assert.equal(w.endReason,'knockout');
});
test('hammer head reward increases without changing its shaft or handling',()=>{
 const w=WEAPONS.hammer;assert.equal(w.maxAngularSpeed,3.4);assert.equal(w.brakeAcceleration,22);
 assert.equal(w.colliders[0].damageScale??1,1);
 assert.ok(w.colliders.slice(1).every(c=>c.damageScale===1.45));
});
test('practice and duel share arena geometry and default spawn/contact states',()=>{
 const a=new ArenaPhysics(),b=new ArenaPhysics();
 a.reset(false,false,'sword','polearm');b.reset(true,false,'sword','polearm');
 assert.equal(arenaScaleForMode('practice'),arenaScaleForMode('duel'));
 assert.equal(a.arenaRadius,b.arenaRadius);assert.equal(a.arenaRimHeight,b.arenaRimHeight);
 assert.deepEqual(a.players,b.players);
 for(let i=0;i<180;i++){a.step([{theta:1},{}]);b.step([{theta:1},{}]);}
 for(let i=0;i<2;i++){assert.deepEqual(a.players[i].p,b.players[i].p);assert.deepEqual(a.players[i].v,b.players[i].v);}
});
test('3D bodies stay solid through the former 1.35 height discontinuity and separated bodies can pass',()=>{
 const horizontal=[];
 for(const height of [1.34,1.36]){
  const w=new ArenaPhysics();w.reset(false,false,'sword','sword');
  Object.assign(w.players[0],{p:v3(0,4,0)});Object.assign(w.players[1],{p:v3(.1,4+height,0)});
  w.solveBodies();horizontal.push(w.players[1].p.x-w.players[0].p.x);
  const overlap=Math.max(...hurtSegments(w.players[0]).flatMap(a=>hurtSegments(w.players[1]).map(b=>a.radius+b.radius-closestSegments(a.a,a.b,b.a,b.b).distance)));
  assert.ok(overlap<.01,'overlapping airborne heads/torso must remain solid');
 }
 assert.ok(Math.abs(horizontal[0]-horizontal[1])<.1);
 const w=new ArenaPhysics();w.players[0].p=v3(0,4,0);w.players[1].p=v3(0,8,0);
 w.solveBodies();assert.equal(w.players[0].p.x,0);assert.equal(w.players[1].p.x,0);
});
test('coincident solid bodies choose the same physical separation after a player-slot swap',()=>{
 const runs=[false,true].map(swapped=>{
  const w=new ArenaPhysics();w.reset(false,false,'sword','sword');
  w.players.forEach((p,id)=>Object.assign(p,{p:v3(0,4,0),phi:(swapped?1-id:id)*1.2}));
  w.solveBodies();return swapped?[...w.players].reverse():w.players;
 });
 for(let id=0;id<2;id++)for(const axis of ['x','y','z'])near(runs[0][id].p[axis],runs[1][id].p[axis]);
});
test('timeout compares health percentages, supports draws, and pressure cannot affect training',()=>{
 for(const tied of [false,true]){
  const w=new ArenaPhysics();w.reset(false,false,{characterId:'beagle',weaponId:'sword'},'sword');
  w.players[0].p=v3(-4,4,0);w.players[1].p=v3(4,4,0);
  w.players[0].health=w.players[0].maxHealth*.5;w.players[1].health=tied?50:51;w.time=120-CONFIG.step;
  w.step([{},{}]);assert.equal(w.winner,tied?-1:1);assert.equal(w.endReason,'timeout');
 }
 for(const practice of [true,false]){
  const w=new ArenaPhysics();w.reset(practice,!practice,'sword','sword');w.time=119.99;
  advance(w,.1);assert.equal(w.winner,null);
 }
});
test('pressure warns before percentage damage, never moves the wall, and resets on rematch',()=>{
 const w=new ArenaPhysics();w.reset(false,false,'sword','sword');w.time=90;
 Object.assign(w.players[0],{p:v3(17,4,0),theta:0});Object.assign(w.players[1],{p:v3(0,4,0),theta:0});
 const radius=w.arenaRadius;advance(w,1);assert.equal(w.players[0].health,100);assert.ok(w.players[0].zoneOutside>0);
 advance(w,2);assert.ok(w.players[0].health<100);assert.equal(w.players[1].health,100);assert.equal(w.arenaRadius,radius);
 const current=w.pressure.radius;w.players[0].lastHitAt=w.time;advance(w,.1);assert.ok(w.pressure.radius<current,'chip hits cannot postpone contraction');
 w.reset();assert.equal(w.players[0].zoneOutside,0);assert.equal(w.pressure.active,false);
});
test('round pressure, timers and variable health snapshots pause and reset with the session',()=>{
 const game=new GameSession();for(const k of ['unlock','tick','swing','impact','tone'])game.sound[k]=()=>{};
 game.startRound('duel-fixed');game.state='playing';game.world.time=90;game.tick(.05);
 assert.deepEqual(game.getSnapshot().maxHealth,[110,110]);assert.ok(game.getSnapshot().pressure.active);
 game.pause();const before=JSON.stringify(game.world.pressure),time=game.world.time;game.tick(.05);
 assert.equal(game.world.time,time);assert.equal(JSON.stringify(game.world.pressure),before);
 game.startRound();assert.equal(game.getSnapshot().remainingSeconds,120);assert.equal(game.getSnapshot().pressure.active,false);
});
