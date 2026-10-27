import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ArenaPhysics,CONFIG,bodyFollowsView,fighterHeading,hurtSegments,weaponSegments,makePlayer} from '../src/physics.js';
import {PLAYABLE_LOADOUTS,isEarLoadout,isPawLoadout} from '../src/loadouts.js';
import {sandbox,sparring} from './sandbox.js';

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const yellow={characterId:'yellow-blob',weaponId:'yellow-staff'};

test('the body turns toward the view yaw at a bounded rate along the shortest arc',()=>{
 const world=sandbox(new ArenaPhysics(),yellow),p=world.players[0];
 p.bodyYaw=Math.PI-.1;
 world.step([{faceYaw:-Math.PI+.1}]);
 assert.ok(Math.abs(wrap(p.bodyYaw-(Math.PI-.1+CONFIG.bodyTurnRate*CONFIG.step)))<1e-9||Math.abs(wrap(p.bodyYaw+Math.PI-.1))<1e-9,'turns across the ±π seam');
 p.bodyYaw=0;
 world.step([{faceYaw:2}]);
 assert.ok(Math.abs(p.bodyYaw-CONFIG.bodyTurnRate*CONFIG.step)<1e-12,'one tick never exceeds the turn rate');
 for(let i=0;i<180;i++)world.step([{faceYaw:2}]);
 assert.ok(Math.abs(p.bodyYaw-2)<1e-9,'settles exactly on the view yaw');
 const before=p.bodyYaw;world.step([{}]);world.step([{faceYaw:NaN}]);
 assert.equal(p.bodyYaw,before,'missing view input keeps the current facing');
});

test('looking around never steers the weapon, and A/D never turns the body',()=>{
 const looking=sandbox(new ArenaPhysics(),yellow),still=sandbox(new ArenaPhysics(),yellow);
 for(let i=0;i<120;i++){looking.step([{theta:1,phi:1,faceYaw:i*.05}]);still.step([{theta:1,phi:1}]);}
 const [a,b]=[looking.players[0],still.players[0]];
 for(const key of ['theta','phi','wt','wp'])assert.equal(a[key],b[key],key);
 assert.notEqual(a.bodyYaw,b.bodyYaw);
 assert.equal(b.bodyYaw,makePlayer(0,yellow).bodyYaw,'weapon steering alone leaves the body where it was');
});

test('ordinary fighters face their view; ears and paws keep the body on the weapon azimuth',()=>{
 for(const loadout of PLAYABLE_LOADOUTS){
  const p=makePlayer(0,loadout);p.phi=.4;p.bodyYaw=1.9;
  const anatomical=isEarLoadout(p)||isPawLoadout(p);
  assert.equal(bodyFollowsView(p),!anatomical,JSON.stringify(loadout));
  assert.equal(fighterHeading(p),anatomical?.4:1.9,JSON.stringify(loadout));
 }
});

test('hurt capsules rotate with the body while weapon capsules ignore it',()=>{
 const beagleSword={characterId:'beagle',weaponId:'sword'};
 const a=makePlayer(0,beagleSword),b=makePlayer(0,beagleSword);b.bodyYaw=a.bodyYaw+1.2;
 const moved=(x,y)=>x.some((s,i)=>Math.hypot(s.a.x-y[i].a.x,s.a.z-y[i].a.z)>1e-3);
 assert.ok(moved(hurtSegments(a),hurtSegments(b)),'the asymmetric beagle body must turn');
 assert.deepEqual(weaponSegments(a),weaponSegments(b));
});

test('a body turning during a tick is still swept for contact',()=>{
 // The target spins its body as the sword arrives; hits must still register.
 for(const turn of [0,1,-1]){
  const world=sparring(new ArenaPhysics(),{characterId:'basic-fighter',weaponId:'sword'},{characterId:'beagle',weaponId:'sword'});
  for(let i=0;i<360&&!world.lastHit;i++)world.step([{theta:1},{faceYaw:world.players[1].bodyYaw+turn*2}]);
  assert.ok(world.lastHit,`no hit while the target turned ${turn}`);
 }
});
