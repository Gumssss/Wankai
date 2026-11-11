import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,hurtSegments} from '../src/physics.js';
import {updateAbility,finishAbilityTick,applyPerfume as spray,stepSoccer as ball,protectedPlayer,abilityHit} from '../src/arena-skills.js';
const applyPerfume=(w,p,dt)=>spray(w,p,dt,hurtSegments),stepSoccer=(w,s,dt)=>ball(w,s,dt,hurtSegments);
const setup=(id='cr7')=>{const w=new ArenaPhysics();w.reset({characterId:id,weaponId:id==='cr7'?'soccer-ball':'crowned-heart'},'sword');w.players[0].grounded=true;return w;};
const launch=w=>{const p=w.players[0];updateAbility(w,p,true,CONFIG.step);for(let i=0;i<80;i++){updateAbility(w,p,false,CONFIG.step);finishAbilityTick(w,p);if(p.abilityPhase==='active')return;}assert.fail('not launched');};
test('CR7 pays once, stows, moves and requires a genuine release at expiry',()=>{const w=setup();launch(w);const p=w.players[0];assert.equal(p.stamina,160);assert(protectedPlayer(p));const start=p.p.x;
 for(let i=0;i<90;i++)w.step([{heldMask:1,faceYaw:0,theta:1,skillTap:true},{}]);assert(p.p.x>start+.9);assert.equal(p.stamina,160);
 for(let i=0;i<600;i++)w.step([{heldMask:5,theta:0,phi:0},{}]);assert(!protectedPlayer(p));assert.equal(w.projectiles.length,0);assert(p.releaseGate);
 w.step([{heldMask:0},{}]);assert.equal(p.releaseGate,false);
});
test('perfume contact immediately marks the target without dealing direct damage',()=>{const w=setup('mean-girl'),p=w.players[0],q=w.players[1];p.p={x:0,y:.59,z:0};q.p={x:2,y:.59,z:0};p.bodyYaw=0;launch(w);const hp=q.health;
 updateAbility(w,p,false,CONFIG.step);applyPerfume(w,p,CONFIG.step);
 assert.equal(q.bleedStacks,1);assert.equal(q.bleedOwner,p.id);assert.equal(q.health,hp);
 assert.ok(!w.events.some(event=>event.type==='hit'));
});
test('a solid wall blocks perfume from marking a target',()=>{const w=setup('mean-girl'),p=w.players[0],q=w.players[1];p.p={x:0,y:.59,z:0};q.p={x:2,y:.59,z:0};p.bodyYaw=0;w.obstacles=[{kind:'wall',x:1.5,z:0,angle:0,halfX:.1,halfZ:2,height:3}];launch(w);for(let i=0;i<450;i++){updateAbility(w,p,false,CONFIG.step);applyPerfume(w,p,CONFIG.step);}assert.equal(q.bleedStacks,0);assert.equal(q.health,100);});
test('soccer survives body contact and wall reflection; immunity covers skill damage',()=>{const w=setup();launch(w);const p=w.players[0],q=w.players[1],b=w.projectiles[0];q.p={x:1,y:.59,z:0};b.p={x:0,y:.46,z:0};b.v={x:18,y:0,z:0};
 for(let i=0;i<10;i++){w.time+=CONFIG.step;stepSoccer(w,b,CONFIG.step);}assert.equal(q.health,92);assert(b.v.x<0);assert.equal(abilityHit(w,p,50,1,'perfume',p.p),false);assert.equal(p.health,100);
 b.p.x=w.arenaRadius-.47;b.v.x=18;stepSoccer(w,b,.02);assert(b.v.x<0);assert(b.p.x<=w.arenaRadius-.46);
});
test('windup damage cancels without granting immunity or refund',()=>{const w=setup(),p=w.players[0];updateAbility(w,p,true,CONFIG.step);abilityHit(w,p,2,1,'perfume',p.p);finishAbilityTick(w,p);assert.equal(p.abilityPhase,'idle');assert.equal(p.stamina,160);assert.equal(w.projectiles.length,0);});

test('restoring the ball cannot score an automatic weapon hit before fresh input',()=>{
 const w=setup();w.players[1].p.x=2.8;w.players[0].p.x=0;launch(w);
 for(let i=0;i<800;i++){w.step([{},{}]);if(w.players[0].abilityPhase==='idle')assert(!w.events.some(e=>e.type==='hit'&&e.source==='weapon'&&e.attacker===0));}
 assert(w.players[0].abilityAttackGate);w.step([{theta:1,heldMask:1},{}]);assert.equal(w.players[0].abilityAttackGate,false);
});

test('perfume misses fighters behind or above the spray',()=>{
 const w=setup('mean-girl'),p=w.players[0],q=w.players[1];p.p={x:0,y:.59,z:0};p.bodyYaw=0;launch(w);
 for(const point of [{x:-2,y:.59,z:0},{x:2,y:5,z:0}]){
  q.p=point;updateAbility(w,p,false,CONFIG.step);applyPerfume(w,p,CONFIG.step);
  assert.equal(q.bleedStacks,0);assert.equal(q.health,100);
 }
});

test('CR7 direct controls normalize diagonals, cancel opposites, rotate with camera and retain gravity',()=>{
 for(const mask of [1,2,4,8,3,9,6,12,5,10,0]){
  const w=setup();launch(w);const p=w.players[0];p.p={x:0,y:3,z:0};w.players[1].p.x=15;
  w.step([{heldMask:mask,faceYaw:Math.PI/2},{}]);const expected=[0,5,10].includes(mask)?0:2.2;
  assert(Math.abs(Math.hypot(p.v.x,p.v.z)-expected)<1e-8);assert(p.v.y<0);
  if(mask===1)assert(p.v.z>2.19&&Math.abs(p.v.x)<1e-6);
 }
});

test('activation rejection, last-tick windup interruption and result cleanup do not grant protection',()=>{
 const w=setup(),p=w.players[0];p.stamina=39;updateAbility(w,p,true,CONFIG.step);assert.equal(p.abilityPhase,'idle');assert.equal(p.stamina,39);
 p.stamina=200;p.grounded=p.staffGrounded=false;updateAbility(w,p,true,CONFIG.step);assert.equal(p.abilityPhase,'idle');
 p.grounded=true;updateAbility(w,p,true,CONFIG.step);p.abilityTime=CONFIG.step;updateAbility(w,p,false,CONFIG.step);assert(p.launchPending);
 abilityHit(w,p,1,1,'perfume',p.p);finishAbilityTick(w,p);assert.equal(w.projectiles.length,0);assert(!protectedPlayer(p));
 p.skillCooldown=0;launch(w);w.winner=1;updateAbility(w,p,false,CONFIG.step);assert.equal(w.projectiles.length,0);assert(!protectedPlayer(p));
});

test('soccer uses finite-height hurt capsules and does not hit a player above its path',()=>{
 const w=setup();launch(w);const q=w.players[1],b=w.projectiles[0];q.p={x:2,y:4,z:0};b.p={x:0,y:.46,z:0};b.v={x:18,y:0,z:0};
 assert(stepSoccer(w,b,.2));assert.equal(q.health,100);assert(b.p.x>3);
});

test('release during recovery arms only a new press after recovery',()=>{
 for(const earlyPress of [false,true]){
  const w=setup();launch(w);const p=w.players[0];p.abilityTime=CONFIG.step;
  w.step([{},{}]);assert.equal(p.abilityPhase,'recovery');assert.equal(p.releaseGate,false);
  for(let i=0;i<60;i++)w.step([earlyPress?{heldMask:1,theta:1}:{},{}]);
  assert.equal(p.abilityPhase,'idle');assert.equal(p.releaseGate,earlyPress);
  if(earlyPress)w.step([{},{}]);w.step([{heldMask:1,theta:1},{}]);assert(!p.abilityAttackGate);
 }
});

test('CR7 immunity rejects delivery and weapon damage without added knockback',()=>{
 const w=setup();launch(w);const p=w.players[0],q=w.players[1];p.p={x:0,y:.59,z:0};p.v={x:0,y:0,z:0};
 w.projectiles.push({id:99,owner:1,p:{x:-.3,y:.6,z:0},v:{x:18,y:0,z:0},radius:.55,life:2,spin:0});w.stepProjectiles(CONFIG.step);
 assert.equal(p.health,100);assert.deepEqual(p.v,{x:0,y:0,z:0});assert(!w.projectiles.some(s=>s.id===99));
 w.solveAttack(q,p,CONFIG.step,w.players.map(p=>({...p})));assert.equal(p.health,100);assert.deepEqual(p.v,{x:0,y:0,z:0});
});
