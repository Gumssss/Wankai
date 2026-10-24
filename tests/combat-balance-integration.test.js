import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,hurtSegments,v3} from '../src/physics.js';
import {PLAYABLE_LOADOUTS} from '../src/loadouts.js';

test('all 81 matchups remain slot-fair through body contacts, recoil and skills at full/low/empty stamina',()=>{
 for(const stamina of [200,40,0])for(const first of PLAYABLE_LOADOUTS)for(const second of PLAYABLE_LOADOUTS){
  const physicalInputs=[{theta:1,phi:1,skill:true},{theta:-1,phi:-1,skill:true}];
  const runs=[false,true].map(swapped=>{
   const w=new ArenaPhysics();w.reset(false,false,...(swapped?[second,first]:[first,second]));
   w.players.forEach((p,id)=>{const physical=swapped?1-id:id;
    Object.assign(p,{stamina,p:v3(physical?.45:-.45,CONFIG.bodyFloor+(physical?.3:0),physical?.2:0),
     phi:physical?Math.PI:0,theta:physical?1.3:1.5});
   });
   for(let tick=0;tick<24;tick++){
    w.step(swapped?[...physicalInputs].reverse():physicalInputs);
    for(const p of w.players){
     assert.ok([p.p.x,p.p.y,p.p.z,p.v.x,p.v.y,p.v.z,p.wt,p.wp,p.health,p.stamina].every(Number.isFinite));
     assert.ok(p.health>=0&&p.health<=p.maxHealth&&p.stamina>=0&&p.stamina<=200);
     assert.ok(p.p.y>=CONFIG.bodyFloor-1e-7);
     for(const s of hurtSegments(p))for(const q of [s.a,s.b])assert.ok(Math.hypot(q.x,q.z)+s.radius<=w.arenaRadius+1e-6);
    }
   }
   return swapped?[...w.players].reverse():w.players;
  });
  for(let id=0;id<2;id++){
   const a=runs[0][id],b=runs[1][id],context=`${first.characterId}/${first.weaponId} vs ${second.characterId}/${second.weaponId}, ${stamina}`;
   assert.equal(a.health,b.health,context);
   for(const key of ['stamina','wt','wp'])assert.ok(Math.abs(a[key]-b[key])<1e-6,`${context}: ${key}`);
   for(const key of ['p','v'])for(const axis of ['x','y','z'])assert.ok(Math.abs(a[key][axis]-b[key][axis])<1e-6,`${context}: ${key}.${axis}`);
  }
 }
});
