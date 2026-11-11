import test from 'node:test';
import assert from 'node:assert/strict';
import { ArenaPhysics, CONFIG, BODY_HIT_ASSIST, bodyHitSegments, weaponSegments, makePlayer, v3 } from '../src/physics.js';
import { PLAYABLE_LOADOUTS } from '../src/loadouts.js';
import { segmentIntersectsObstacle } from '../src/arena-obstacles.js';

const near = (a, b, epsilon = 1e-8) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
function fixture(weapon = 'sword', x = .7, speed = 7) {
  const world = new ArenaPhysics(); world.reset(weapon, 'sword');
  const [attacker, target] = world.players;
  Object.assign(attacker, { p:v3(0,5,0),v:v3(speed,0,0),theta:0,phi:0,wt:0,wp:0 });
  Object.assign(target, { p:v3(x,6.9,0),v:v3(),theta:0,phi:0,bodyYaw:0 });
  const hit = (dt=CONFIG.step) => world.solveAttack(attacker,target,dt);
  return {world,attacker,target,hit};
}
const hits = w => w.events.filter(e=>e.type==='hit');

test('assistance scales only weapon radii after dynamic poses for all loadouts',()=>{
  const seen = new Set();
  for(const loadout of PLAYABLE_LOADOUTS) for(const scale of [1,3]) for(const pawScale of [1,1.3]) {
    const p=makePlayer(0,loadout);Object.assign(p,{scale,pawScale,theta:.7,earSpread:.5,earLag:.1});
    const physical=weaponSegments(p),assisted=bodyHitSegments(p);
    assert.equal(assisted.length,physical.length);
    assert.deepEqual(weaponSegments(p),physical);
    for(let i=0;i<physical.length;i++){
      assert.deepEqual(assisted[i].a,physical[i].a);assert.deepEqual(assisted[i].b,physical[i].b);
      near(assisted[i].radius,physical[i].radius*(p.weapon==='pan'?1.15:1.5));
      assert.equal(assisted[i].physicalRadius,physical[i].radius);
    }
    if(p.weapon==='long-ears')assert.equal(assisted.length,12,'cosmetic inner ears stay non-solid');
    seen.add(p.weapon);
  }
  assert.equal(seen.size,14);assert.equal(BODY_HIT_ASSIST.pan,1.15);
});

test('near misses become accepted body hits, with the smaller pan allowance',()=>{
  for(const [weapon,inside,outside] of [['sword',.7,.8],['pan',.58,.62]]){
    const f=fixture(weapon,inside);f.hit();assert.equal(hits(f.world).length,1);assert(f.target.health<100);
    assert.equal(f.attacker.v.x,7,'assisted-only hit applies no contact impulse to attacker');
    near(Math.hypot(f.target.v.x,f.target.v.y,f.target.v.z),hits(f.world)[0].damage*.07);
    const miss=fixture(weapon,outside);miss.hit();assert.equal(miss.target.health,100);
    assert.deepEqual(miss.target.v,v3());
  }
});

test('stationary and zero-damage assisted overlaps do not push or consume a genuine strike',()=>{
  const f=fixture('sword',.7,0);
  for(let i=0;i<90;i++){f.world.time+=CONFIG.step;f.hit();}
  assert.equal(f.target.health,100);assert.deepEqual(f.attacker.v,v3());assert.deepEqual(f.target.v,v3());
  assert.equal(f.world.events.length,0);assert(f.world.contacts[0].separated>.045);
  f.target.p.x=.5;f.attacker.v.x=7;f.hit();
  assert.equal(hits(f.world).length,1);assert(f.target.health<100);
});

test('one accepted hit holds rearm across assisted and physical overlap until separation',()=>{
  const f=fixture();f.hit();const health=f.target.health;
  f.world.time=.5;f.target.p.x=.5;f.attacker.v=v3(7,0,0);f.target.v=v3();f.hit();
  assert.equal(f.target.health,health);assert.equal(hits(f.world).length,1);
  f.target.p.x=.7;
  for(let i=0;i<12;i++){f.world.time+=CONFIG.step;f.attacker.v=v3(7,0,0);f.target.v=v3();f.hit();}
  assert.equal(hits(f.world).length,1);
  f.target.p.x=3;
  for(let i=0;i<10;i++){f.world.time+=CONFIG.step;f.hit();}
  f.target.p.x=.7;f.attacker.v=v3(7,0,0);f.attacker.wt=f.attacker.wp=0;f.target.v=v3();f.hit();
  assert.equal(hits(f.world).length,2);
});

test('thin walls and pillars occlude assistance, while their open tops do not',()=>{
  for(const obstacle of [
    {kind:'wall',x:.29,z:0,angle:0,halfX:.001,halfZ:.3,height:10},
    {kind:'pillar',x:.29,z:0,radius:.005,height:10},
  ]){
    const f=fixture();f.world.obstacles=[obstacle];f.hit();assert.equal(f.target.health,100);
    assert.deepEqual(f.target.v,v3());assert.equal(f.attacker.v.x,7);
    obstacle.height=1;f.hit();assert.equal(hits(f.world).length,1);
  }
});

test('a defending physical weapon blocks assistance even without an audible clash',()=>{
  const f=fixture();f.target.theta=-.65;f.world.clashArmed=false;
  f.world.solveStaffClash(CONFIG.step);
  assert(f.world.stepClashContact,'fixture must have a physical weapon interception');
  assert(!f.world.events.some(e=>e.type==='clash'));
  f.attacker.v=v3(7,0,0);f.target.v=v3();f.hit();
  assert.equal(f.target.health,100);assert.equal(hits(f.world).length,0);
  assert(f.world.contacts[0].separated>.045,'rejected assist does not consume rearm');
});

test('finite obstacle intersection covers rotated boxes, thin shapes, and height crossings',()=>{
  const wall={kind:'wall',x:0,z:0,angle:Math.PI/4,halfX:.001,halfZ:1,height:1};
  assert(segmentIntersectsObstacle(wall,v3(-1,.5,0),v3(1,.5,0)));
  assert(!segmentIntersectsObstacle(wall,v3(-1,2,0),v3(1,2,0)));
  const pillar={kind:'pillar',x:0,z:0,radius:.1,height:1};
  assert(segmentIntersectsObstacle(pillar,v3(0,2,0),v3(0,-1,0)));
  assert(!segmentIntersectsObstacle(pillar,v3(0,2,0),v3(0,3,0)));
  assert(!segmentIntersectsObstacle(pillar,v3(.2,2,0),v3(.2,-1,0)));
});

test('a real swept body contact takes priority over the earlier forgiveness shell',()=>{
  const f=fixture();const previous=f.world.players.map(p=>({...p,p:{...p.p},v:{...p.v}}));
  f.attacker.p.x=.25;
  f.world.solveAttack(f.attacker,f.target,CONFIG.step,previous);
  const [event]=hits(f.world);assert(event);assert(f.attacker.v.x<7,'real-contact impulse remains active');
  assert(event.point.x>.04,'damage uses the real-contact time, not the earlier assistance entry');
});

test('an assisted Maodie strike grants one heal with the contact source for presentation',()=>{
  const f=fixture({characterId:'maodie',weaponId:'sword'});f.attacker.health=10;
  f.world.updateSkill(f.attacker,true,CONFIG.step);f.world.events=[];f.hit();
  const [event]=hits(f.world),heals=f.world.events.filter(e=>e.type==='heal');
  assert(event);assert.equal(heals.length,1);assert.equal(heals[0].amount,2*event.damage);
  assert.deepEqual(heals[0].point,f.attacker.p);assert(Number.isFinite(heals[0].sourcePoint.x));
  f.world.time=.5;f.attacker.v=v3(7,0,0);f.target.v=v3();f.hit();
  assert.equal(f.world.events.filter(e=>e.type==='heal').length,1);
});
