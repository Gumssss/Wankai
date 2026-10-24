import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,STAMINA,v3,damageForImpact} from '../src/physics.js';
import {PLAYABLE_LOADOUTS} from '../src/loadouts.js';

const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const tradePoses=[
  {p:v3(0,3,.3),v:v3(5,2.4,1),theta:1.68,phi:-.19,wt:4,wp:4.1},
  {p:v3(1.5,2.75,.1),v:v3(4.4,-.7,2.1),theta:1.19,phi:3.13,wt:-6,wp:-3.6},
];
function trade(swapped=false,health=100){
  const world=new ArenaPhysics();world.reset(false,false,'sword','sword');
  world.players.forEach((p,id)=>{
    const pose=tradePoses[swapped?1-id:id];
    Object.assign(p,pose,{p:{...pose.p},v:{...pose.v},health});
  });
  world.step([{},{}]);
  return {world,physical:swapped?[...world.players].reverse():world.players};
}

test('the same physical trade has identical damage and momentum after swapping player slots',()=>{
  const first=trade(),swapped=trade(true);
  assert.ok(first.world.events.some(e=>e.type==='hit'));
  for(let id=0;id<2;id++){
    const a=first.physical[id],b=swapped.physical[id];
    assert.equal(a.health,b.health);
    for(const axis of ['x','y','z']){near(a.p[axis],b.p[axis]);near(a.v[axis],b.v[axis]);}
    near(a.wt,b.wt);near(a.wp,b.wp);
  }
});

test('genuinely simultaneous lethal trades can draw',()=>{
  for(const swapped of [false,true]){
    const {world}=trade(swapped,1);
    assert.deepEqual(world.players.map(p=>p.health),[0,0]);
    assert.equal(world.winner,-1);
  }
});

test('a slow deep paw overlap cannot mask a separate approaching damaging paw contact',()=>{
  const world=new ArenaPhysics();
  world.reset(false,false,{characterId:'orange-tabby',weaponId:'cat-paws'},'sword');
  Object.assign(world.players[0],{p:v3(0,5,0),theta:2.13,phi:0,wt:-3.27,wp:-3.33});
  Object.assign(world.players[1],{p:v3(1.76,3.62,.99),theta:Math.PI/2,phi:0});
  world.step([{},{}]);
  const hits=world.events.filter(e=>e.type==='hit'&&e.attacker===0);
  assert.equal(hits.length,1);
  assert.ok(world.players[1].health<100);
});

function touching(){
  const world=new ArenaPhysics();world.reset(false,false,'sword','sword');
  const [a,b]=world.players;
  Object.assign(a,{p:v3(0,3,0),theta:Math.PI/2,phi:0});
  Object.assign(b,{p:v3(2.9,3,0),theta:0,phi:Math.PI});
  return world;
}

test('a harmless ongoing touch can accelerate into one hit without first separating',()=>{
  const world=touching(),[a,b]=world.players;
  world.solveAttack(a,b,CONFIG.step);
  assert.equal(b.health,100);
  a.v=v3(6,0,0);b.v=v3();world.time=1;
  world.solveAttack(a,b,CONFIG.step);
  assert.ok(b.health<100);
  const health=b.health;
  for(let repeat=0;repeat<3;repeat++){
    world.time+=1;a.v=v3(6,0,0);b.v=v3();
    world.solveAttack(a,b,CONFIG.step);
    assert.equal(b.health,health,'sustained contact must not grind health after cooldown expires');
  }
});

test('a qualifying impact suppressed by cooldown cannot become delayed damage',()=>{
  const world=touching(),[a,b]=world.players;
  a.lastAttackAt=0;world.time=.1;a.v=v3(6,0,0);
  world.solveAttack(a,b,CONFIG.step);
  assert.equal(b.health,100);
  assert.equal(a.lastAttackAt,0,'a suppressed impact must not extend the shared cooldown');
  world.time=.5;a.v=v3(6,0,0);b.v=v3();
  world.solveAttack(a,b,CONFIG.step);
  assert.equal(b.health,100,'remaining in the same contact episode must not defer damage');
});

test('rematch clears processed impact episodes and restores hit eligibility',()=>{
  const world=touching();world.time=1;world.players[0].v=v3(6,0,0);
  world.solveAttack(...world.players,CONFIG.step);
  assert.ok(world.players[1].health<100);
  const fresh=touching();
  world.reset(false,false,'sword','sword');
  world.players.forEach((p,id)=>Object.assign(p,fresh.players[id]));
  world.time=1;world.players[0].v=v3(6,0,0);
  world.solveAttack(...world.players,CONFIG.step);
  assert.ok(world.players[1].health<100);
});

// Small real capsule scenes isolate event timing and limb episodes from the
// character motors. They use the production broad phase, sweep, manifold,
// impulse, damage and cooldown implementation (no mocked contact results).
function linearWorld(first=[{x:1.8}],second=[{x:10}],bodyX=2){
  const world=new ArenaPhysics();world.reset(false,false,'sword','sword',3);
  Object.assign(world.players[0],{p:v3(0,10,0),theta:0,phi:0});
  Object.assign(world.players[1],{p:v3(bodyX,10,0),theta:0,phi:Math.PI});
  const shapes=(p,definitions)=>definitions.map(d=>{
    const local=v3(d.x||0,0,d.z||0),point=v3(p.p.x+local.x,p.p.y,p.p.z+local.z);
    return {a:point,b:point,localA:local,localB:local,radius:d.radius||.1,
      side:d.side,anchor:[d.hinge||0,0,0],damageScale:d.damageScale};
  });
  world.combat.physics={...world.combat.physics,
    weaponSegments:p=>shapes(p,p.id===0?first:second),
    hurtSegments:p=>shapes(p,[{x:p.id===0?-10:0,radius:.2}]),
    weaponPointFrame:(p,local,anchor=[0])=>({point:v3(p.p.x+local.x,p.p.y+local.y,p.p.z+local.z),
      r:local,jt:v3(anchor[0],0,0),jp:v3(),velocity:v3(p.v.x+anchor[0]*p.wt,p.v.y,p.v.z)}),
  };
  return world;
}

function linearMotion(world,duration){
  const previous=world.players.map(p=>({p:{...p.p},theta:p.theta,phi:p.phi,earSpread:0,earLag:0}));
  for(const p of world.players)p.p=v3(p.p.x+p.v.x*duration,p.p.y+p.v.y*duration,p.p.z+p.v.z*duration);
  world.time+=duration;
  world.combat.resolve(previous,duration);
}

test('an earlier weapon clash deflects the remaining path before a later predicted body hit',()=>{
  const world=linearWorld([{x:1}],[{x:-.5}]);
  world.players[0].v=v3(10,0,0);
  linearMotion(world,.2);
  assert.equal(world.events.filter(e=>e.type==='clash').length,1);
  assert.equal(world.players[1].health,100);
  assert.equal(world.events.filter(e=>e.type==='hit').length,0);
});

test('an earlier body hit is not erased by a weapon clash predicted later in the tick',()=>{
  const world=linearWorld([{x:1}],[{x:.5}]);
  world.players[0].v=v3(10,0,0);
  linearMotion(world,.2);
  const hit=world.events.find(e=>e.type==='hit');
  assert.ok(hit);assert.ok(world.players[1].health<100);
  assert.ok(hit.time<.08,'the body contact is at about 0.07 seconds');
  for(const clash of world.events.filter(e=>e.type==='clash'))assert.ok(clash.time>hit.time);
});

test('separate impact times cannot turn a prior defeat into a simultaneous trade',()=>{
  const world=linearWorld([{x:1}],[{x:-2}]);
  world.combat.physics.hurtSegments=p=>{
    const point=v3(p.p.x+(p.id===0?.2:0),10,0),local=v3(p.id===0?.2:0,0,0);
    return [{a:point,b:point,localA:local,localB:local,radius:.2}];
  };
  world.players[0].v=v3(10,0,0);world.players[1].health=1;
  linearMotion(world,.2);
  assert.equal(world.players[1].health,0);
  assert.equal(world.events.filter(e=>e.type==='hit'&&e.attacker===1).length,0);
});

test('duplicating or reordering collision capsules does not change hit damage or contact momentum',()=>{
  const source=[{x:1.8,z:.1},{x:1.8,z:-.1}];
  const worlds=[linearWorld(source),linearWorld([...source].reverse()),linearWorld([...source,...source])];
  for(const world of worlds){world.time=1;world.players[0].v=v3(6,0,0);world.solveAttack(...world.players,CONFIG.step);}
  for(const world of worlds.slice(1))for(let id=0;id<2;id++){
    assert.equal(world.players[id].health,worlds[0].players[id].health);
    for(const axis of ['x','y','z'])near(world.players[id].v[axis],worlds[0].players[id].v[axis]);
  }
});

test('simultaneous paired parts share one hit and cannot collect a delayed second hit',()=>{
  const world=linearWorld([{x:1.8,side:'L'},{x:1.8,side:'R'}]);
  world.time=1;world.players[0].v=v3(6,0,0);world.solveAttack(...world.players,CONFIG.step);
  assert.equal(world.events.filter(e=>e.type==='hit').length,1);
  const health=world.players[1].health;
  world.time=2;world.players[0].v=v3(6,0,0);world.players[1].v=v3();
  world.solveAttack(...world.players,CONFIG.step);
  assert.equal(world.players[1].health,health);
});

test('a parked harmless part cannot disarm another part or consume its shared cooldown',()=>{
  const world=linearWorld([{x:1.8,side:'L',hinge:-1},{x:1.8,side:'R',hinge:1}]);
  const [a,b]=world.players;
  world.solveAttack(a,b,CONFIG.step);assert.equal(b.health,100);
  world.time=1;a.wt=6;world.solveAttack(a,b,CONFIG.step);
  assert.ok(b.health<100);const afterRight=b.health;
  world.time=2;a.v=v3();b.v=v3();a.wt=-6;
  world.solveAttack(a,b,CONFIG.step);
  assert.ok(b.health<afterRight,'the previously harmless left part can develop its own valid impact');
});

test('only continuous separation of the processed part rearms it',()=>{
  const world=linearWorld(),[a,b]=world.players;
  world.time=1;a.v=v3(6,0,0);world.solveAttack(a,b,CONFIG.step);const health=b.health;
  b.p.z=2;world.time+=.02;world.solveAttack(a,b,.02);
  b.p.z=0;a.v=v3(6,0,0);b.v=v3();world.time+=1;
  world.solveAttack(a,b,CONFIG.step);assert.equal(b.health,health,'a brief gap cannot rearm');
  b.p.z=2;world.solveAttack(a,b,.05);
  b.p.z=0;a.v=v3(6,0,0);b.v=v3();world.time+=1;
  world.solveAttack(a,b,CONFIG.step);assert.ok(b.health<health);
});

test('actual striking surface metadata retains its damage multiplier',()=>{
  const world=linearWorld([{x:1.8,damageScale:1.3}]);
  world.time=1;world.players[0].v=v3(6,0,0);world.solveAttack(...world.players,CONFIG.step);
  assert.equal(world.lastHit.damage,Math.round(damageForImpact(6,0)*1.3));
});

test('contact slices do not repeat motor, stamina or skill timer updates',()=>{
  for(const weapon of ['sword','beagle']){
    const world=new ArenaPhysics();world.reset(true,false,weapon,'sword');
    world.players[0].p=v3(0,10,0);world.players[1].p=v3(2,10,0);
    const initial=world.players[0].stamina;
    world.step([{theta:1,phi:1},{}]);
    near(world.players[0].stamina,initial-(STAMINA.swingDrain+STAMINA.turnDrain)*CONFIG.step);
    near(world.time,CONFIG.step);
  }
  const rotor=new ArenaPhysics();rotor.reset(true,false,'beagle','sword');
  rotor.step([{skill:true},{}]);
  near(rotor.players[0].skillRemaining,5-CONFIG.step);
  near(rotor.players[0].stamina,200-16*CONFIG.step);
});

test('all 81 loadout pairs retain slot symmetry across varied poses and fitted-contact density',()=>{
  let seed=73;
  const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let scenario=0;scenario<81*3;scenario++){
    const selections=[PLAYABLE_LOADOUTS[scenario%9],PLAYABLE_LOADOUTS[Math.floor(scenario/9)%9]];
    const poses=[0,1].map(id=>({p:v3((id?1:-1)*(1+random()),4+random(),random()-.5),
      v:v3(random()*8-4,random()*2-1,random()*8-4),theta:random()*6-3,phi:random()*6-3,
      wt:random()*6-3,wp:random()*4-2}));
    const runs=[false,true].map(swapped=>{
      const world=new ArenaPhysics();world.reset(false,false,...(swapped?[...selections].reverse():selections),3);
      world.players.forEach((p,id)=>{
        const source=poses[swapped?1-id:id];Object.assign(p,source,{p:{...source.p},v:{...source.v}});
      });
      world.step([{},{}]);
      assert.ok(world.combat.lastStep.batches<30,'fitted capsules must not cause repeated restitution events');
      return swapped?[...world.players].reverse():world.players;
    });
    for(let id=0;id<2;id++){
      const [a,b]=runs.map(players=>players[id]);
      assert.equal(a.health,b.health,`scenario ${scenario}, physical fighter ${id}`);
      for(const axis of ['x','y','z']){near(a.p[axis],b.p[axis]);near(a.v[axis],b.v[axis]);}
      near(a.wt,b.wt);near(a.wp,b.wp);
    }
  }
});
