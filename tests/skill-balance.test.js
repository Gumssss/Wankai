import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,hurtSegments} from '../src/physics.js';
import {SKILLS} from '../src/skills.js';
import {SOCCER_RADIUS,updateAbility,finishAbilityTick,stepSoccer,soccerSpawn,occluded} from '../src/arena-skills.js';
import {obstacleContact} from '../src/arena-obstacles.js';
const CR7={characterId:'cr7',weaponId:'soccer-ball'};
const STICK={characterId:'stickman',weaponId:'sword'};
function setup(scale=1){const w=new ArenaPhysics();w.reset(CR7,STICK,{arenaScale:3});const p=w.players[0];p.p={x:0,y:.59*scale,z:0};p.bodyYaw=0;p.scale=scale;p.damageScale=scale===3?1.25:1;w.players[1].p={x:12,y:.59,z:0};return w;}
function launch(w){const p=w.players[0];updateAbility(w,p,true,CONFIG.step);for(let i=0;i<90&&p.abilityPhase==='windup';i++){updateAbility(w,p,false,CONFIG.step);finishAbilityTick(w,p);}return w.projectiles[0];}
test('CR7 doubles the skill ball with speed 75.6 and damage 8/10 while preserving the model baseline',()=>{
 assert.equal(SOCCER_RADIUS,.46);
 for(const scale of [1,3]){const w=setup(scale),p=w.players[0],ball=launch(w);assert.ok(ball);assert.equal(Math.hypot(ball.v.x,ball.v.z),75.6);assert.equal(ball.radius,.92*scale);assert.equal(ball.damage,scale===1?8:10);assert.equal(ball.life,3);assert.equal(p.stamina,160);assert.ok(p.skillCooldown>29&&p.skillCooldown<=30);assert.equal(p.abilityPhase,'active');const before=ball.spin;stepSoccer(w,ball,CONFIG.step,hurtSegments);assert.ok(Math.abs(ball.spin-before-75.6/ball.radius*CONFIG.step)<1e-9);}
});
test('CR7 enlarged ball uses continuous body sweeps and keeps the accepted-hit interval',()=>{
 const w=setup(),ball=launch(w),q=w.players[1];q.p={x:3,y:.59,z:0};ball.p={x:0,y:ball.radius,z:0};w.time=1;stepSoccer(w,ball,.1,hurtSegments);assert.equal(q.health,92);assert.ok(ball.v.x<0);
 const hitAgain=()=>{ball.p={x:0,y:ball.radius,z:0};ball.v={x:75.6,y:0,z:0};ball.touching=false;stepSoccer(w,ball,.1,hurtSegments);};
 w.time=1.2;hitAgain();assert.equal(q.health,92);
 w.time=1.61;hitAgain();assert.equal(q.health,84);
});
test('CR7 launches clear of nearby props and the rim without crossing a wall',()=>{
 for(const scale of [1,3]){const w=setup(scale),p=w.players[0],radius=.92*scale;p.p.x=w.arenaRadius-radius-.15;p.bodyYaw=0;const spawn=soccerSpawn(w,p,radius);assert.ok(spawn);assert.ok(Math.hypot(spawn.x,spawn.z)+radius<w.arenaRadius);
 p.p.x=0;w.obstacles=[{kind:'wall',x:1.1,z:0,angle:0,halfX:.15,halfZ:5,height:3}];const around=soccerSpawn(w,p,radius);assert.ok(around);assert.ok(around.x<1.1);assert.ok(!obstacleContact(w.obstacles[0],around.x,around.z,radius));assert.equal(occluded({x:0,y:.01,z:0},{...around,y:.01},w.obstacles),false);}
});
test('CR7 refunds an activation when the arena cannot fit the enlarged ball',()=>{
 const w=setup(),p=w.players[0];w.arenaRadius=.5;assert.equal(launch(w),undefined);assert.equal(p.stamina,200);assert.equal(p.skillCooldown,0);assert.equal(p.skillActive,false);assert.equal(p.abilityPhase,'idle');assert.equal(w.events.filter(e=>e.type==='skill-release').length,0);
});
test('CR7 high-speed wall bounces remain bounded at normal and grown size',()=>{
 for(const scale of [1,3]){const w=setup(scale),ball=launch(w);w.players[1].p={x:0,y:20,z:0};ball.p.x=w.arenaRadius-ball.radius-.02;ball.v={x:75.6,y:0,z:0};stepSoccer(w,ball,CONFIG.step,hurtSegments);assert.ok(ball.v.x<0);assert.ok(Math.hypot(ball.p.x,ball.p.z)+ball.radius<=w.arenaRadius+1e-6);assert.ok(Number.isFinite(ball.p.x));const e=w.events.find(e=>e.type==='soccer-bounce');assert.equal(e?.strength,1);}
});
