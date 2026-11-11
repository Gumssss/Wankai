import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics } from '../src/physics.js';
import { PLAYABLE_LOADOUTS, resolveLoadout } from '../src/loadouts.js';
import { quietSession } from './sandbox.js';

test('all nine skills reject opening taps without cost or cooldown and unlock after two seconds',()=>{
 const seen=new Set();
 for(const loadout of PLAYABLE_LOADOUTS){
   const skill=resolveLoadout(loadout).skill?.id;if(!skill||seen.has(skill))continue;seen.add(skill);
   const world=new ArenaPhysics();world.reset(loadout,{characterId:'dudu',weaponId:'takeout-box'});
   const player=world.players[0];
   for(const time of [0,1,1.98]){
     world.roundTime=time;world.step([{skillTap:true},{}]);
     assert.equal(player.skillActive,false,skill);assert.equal(player.skillCooldown,0,skill);
     assert.equal(player.stamina,200,skill);assert(!world.events.some(e=>e.type==='skill'),skill);
   }
   world.roundTime=2;world.step([{},{}]);assert.equal(player.skillActive,false,'blocked taps do not queue');
   player.grounded=true;world.step([{skillTap:true},{}]);
   assert(player.skillCooldown>0,skill);assert(world.events.some(e=>e.type==='skill'),skill);
 }
 assert.equal(seen.size,9);
});

test('opening lock excludes countdown, freezes on pause, and resets on rematch',()=>{
 const session=quietSession();session.startRound('ai');session.tick(.06);
 assert.equal(session.world.roundTime,0);assert.equal(session.makeSnapshot().skills[0].openingLock,2);
 session.state='playing';session.tick(.06);const left=session.makeSnapshot().skills[0].openingLock;
 assert(left<2&&left>1.9);session.pause();session.tick(.06);
 assert.equal(session.makeSnapshot().skills[0].openingLock,left);
 session.startRound('ai');assert.equal(session.makeSnapshot().skills[0].openingLock,2);
});
