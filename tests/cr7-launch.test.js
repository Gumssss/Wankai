import test from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,v3} from '../src/physics.js';
import {abilityHit,finishAbilityTick,protectedPlayer,stowed,stepBleeding} from '../src/arena-skills.js';

function setup(characterId='cr7',activate=true){
 const w=new ArenaPhysics();w.reset('sword',{characterId,weaponId:characterId==='cr7'?'soccer-ball':'crowned-heart'});w.roundTime=2;
 const [a,p]=w.players;
 Object.assign(a,{p:v3(0,5,0),v:v3(7,0,0),theta:0,phi:0,wt:0,wp:0});
 Object.assign(p,{p:v3(.5,6.9,0),v:v3(),theta:0,phi:0,bodyYaw:0,grounded:true});
 if(activate)w.updateSkill(p,true,CONFIG.step);return {w,a,p};
}
const attacks={
 melee:({w,a,p})=>w.solveAttack(a,p,CONFIG.step),
 delivery:({w,p})=>{w.projectiles.push({id:99,owner:0,p:{...p.p,x:p.p.x-.3},v:v3(18,0,0),radius:.55,damage:8,life:2,spin:0});w.stepProjectiles(CONFIG.step);},
 soccer:({w,p})=>abilityHit(w,p,8,0,'soccer',p.p),
 bleed:({w,p})=>{p.bleedStacks=2;p.bleedTick=2-CONFIG.step;p.bleedOwner=0;stepBleeding(w,p,CONFIG.step);},
};
for(const [source,attack] of Object.entries(attacks))test(`instant CR7 activation blocks ${source} damage`,async()=>{
 const baseline=setup('cr7',false);await attack(baseline);assert(baseline.p.health<100,'fixture must damage an unprotected player');
 const f=setup(),{w,p}=f;assert.equal(p.abilityPhase,'active');assert(protectedPlayer(p));assert(stowed(p));
 await attack(f);assert.equal(p.health,100);
 assert.equal(w.projectiles.filter(s=>s.type==='soccer'&&s.owner===p.id).length,1);
 assert.equal(w.events.filter(e=>e.type==='skill-release'&&e.player===p.id).length,1);
 assert.equal(p.stamina,160);assert.equal(p.skillCooldown,30);
 w.updateSkill(p,true,CONFIG.step);assert.equal(w.projectiles.filter(s=>s.type==='soccer'&&s.owner===p.id).length,1);
});

test('dead players and finished rounds cannot activate instant protection',()=>{
 for(const reason of ['death','result']){
  const {w,p}=setup('cr7',false);if(reason==='death')p.health=0;else w.winner=0;
  w.updateSkill(p,true,CONFIG.step);
  assert.equal(p.abilityPhase,'idle');assert.equal(w.projectiles.length,0);assert(!protectedPlayer(p));
 }
});

test('Mean Girl retains her interruptible startup',()=>{
 const {w,p}=setup('mean-girl');p.abilityTime=CONFIG.step;w.updateSkill(p,false,CONFIG.step);
 abilityHit(w,p,8,0,'soccer',p.p);finishAbilityTick(w,p);
 assert.equal(p.abilityPhase,'idle');assert.equal(w.projectiles.length,0);assert(!protectedPlayer(p));
});


test('the real physics step launches and protects before simultaneous incoming damage',()=>{
 const {w,p}=setup('cr7',false);
 w.projectiles.push({id:99,owner:0,p:{...p.p,x:p.p.x-.3},v:v3(18,0,0),radius:.55,damage:100,life:2,spin:0});
 w.step([{},{skillTap:true}]);
 assert.equal(p.health,100);assert.equal(p.abilityPhase,'active');
 assert.equal(w.projectiles.filter(s=>s.type==='soccer'&&s.owner===p.id).length,1);
 assert(!w.events.some(e=>e.type==='hit'&&e.target===p.id));
});

test('rejected instant activation does not grant protection or spend resources',()=>{
 for(const reason of ['space','air','stamina','cooldown']){
  const {w,p}=setup('cr7',false);
  if(reason==='space')w.arenaRadius=.5;
  if(reason==='air')p.grounded=p.staffGrounded=false;
  if(reason==='stamina')p.stamina=39;
  if(reason==='cooldown')p.skillCooldown=2;
  const stamina=p.stamina;w.updateSkill(p,true,CONFIG.step);
  assert(!protectedPlayer(p));assert.equal(w.projectiles.length,0);assert.equal(p.stamina,stamina);
  assert(abilityHit(w,p,8,0,'soccer',p.p));assert.equal(p.health,92);
 }
});
