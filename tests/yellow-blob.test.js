import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Vector3,Box3} from 'three';
import {ArenaPhysics,makePlayer,weaponPointFrame,weaponSegments,closestSegments,v3} from '../src/physics.js';
import {GameSession} from '../src/game-session.js';
import {resolveLoadout,canEquip} from '../src/loadouts.js';
import {instantiateYellowBlob,poseYellowBlob,makeYellowBlobFallback} from '../src/yellow-blob-model.js';
import {createWeaponModel} from '../src/model-assets.js';
import {setWeaponRotation} from '../src/weapon-visuals.js';
import {loadGeometry} from '../scripts/preview/model-geometry.mjs';
import {ArenaView} from '../src/scene.js';
const yellow={characterId:'yellow-blob',weaponId:'yellow-staff'},sword={characterId:'basic-fighter',weaponId:'sword'};
const approved=JSON.parse(await readFile(new URL('../assets/concepts/yellow-blob/motion-v02/replay.json',import.meta.url)));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function input(id,t){
 if(id==='Opposite keys cancel')return {theta:0,phi:0};
 if(id==='FACE FRONT / OVERHEAD / BACK')return {theta:t<1.2?-1:0,phi:0};
 if(id==='W / release / S / recovery')return {theta:t<1?1:t<1.5?0:t<2.8?-1:0,phi:0};
 if(['vertical-hit','horizontal-hit','clash'].includes(id))return {theta:t<1.5&&id!=='horizontal-hit'?1:0,phi:t<1.5&&id==='horizontal-hit'?1:0};
 return {theta:t<1.8?(id.includes('W')?1:id.includes('S')?-1:0):0,phi:t<1.8?(id.includes('D')?1:id.includes('A')?-1:0):0};
}
for(const chapter of approved.chapters.filter(c=>c.speed===1))test(`yellow ${chapter.id}: approved movement and chronological combat`,()=>{
 const rows=approved.frames.filter(f=>f.scenario===chapter.id&&f.speed===1),world=new ArenaPhysics(),combat=rows[0].players.length===2;
 world.reset(combat,!combat,yellow,sword,3);
 rows[0].players.forEach((p,i)=>Object.assign(world.players[i],{p:{...p.p},theta:p.theta,phi:p.phi}));
 let previous=0,hits=[],contactOccurred=false,spent=0,lastActive=0;
 for(const row of rows){
  const end=Math.round(row.time*180);
  for(let tick=previous+1;tick<=end;tick++){
   const action=input(chapter.id,tick/180);
   spent+=(Math.abs(action.theta)*20+Math.abs(action.phi)*10)/180;
   if(action.theta||action.phi)lastActive=tick/180;
   world.step([action,{theta:0,phi:0}]);hits.push(...world.events);
   contactOccurred ||= (world.combat.lastStep?.physicalContacts||0)>0||world.bodyContacts>0;
  }
  previous=end;
  row.players.forEach((expected,i)=>{
   const p=world.players[i];near(p.stamina,i===1?200:Math.min(200,200-spent+(lastActive?Math.max(0,world.time-lastActive-.6)*24:0)));
   // Retain exact approved movement, including all pre-contact frames. The
   // archived combat trajectory used clash-first/P1-first resolution and is
   // intentionally superseded; do not rewrite that historical evidence.
   if(!combat||!contactOccurred){
    for(const axis of ['x','y','z'])near(p.p[axis],expected.p[axis]);
    for(const key of ['theta','phi'])near(p[key],expected[key]);
    assert.equal(p.health,p.maxHealth);
    assert.equal(p.staffGrounded,expected.contact);
   }else{
    assert.ok(Number.isFinite(p.p.x+p.p.y+p.p.z+p.wt+p.wp));
    assert.ok(p.p.y>=.59-1e-8&&Math.hypot(p.p.x,p.p.z)<=world.arenaRadius+1e-8);
    assert.ok(p.health>=1&&p.health<=p.maxHealth);
   }
  });
 }
 if(chapter.id.endsWith('-hit'))assert.ok(hits.some(e=>e.type==='hit'&&e.attacker===0));
 if(chapter.id==='vertical-hit')assert.ok(hits.some(e=>e.type==='hit'&&e.attacker===0&&e.turnShare<.1));
 if(chapter.id==='horizontal-hit')assert.ok(hits.some(e=>e.type==='hit'&&e.attacker===0&&e.turnShare>.9));
 if(chapter.id==='clash'){
  // This historical setup mixes body/weapon contacts. Revised impulses can
  // prevent its later clash; do not force the old event order to reproduce
  // that recording. A clean, separated weapon crossing is tested below.
  assert.ok(contactOccurred&&hits.length>0);
 }
});
test('yellow staff cleanly blocks a sword crossing between separated poses',()=>{
 const world=new ArenaPhysics();world.reset(false,false,yellow,sword,3);
 const [a,b]=world.players;
 Object.assign(a,{p:v3(0,10,0),theta:Math.PI/2,phi:0,v:v3(0,0,-12)});
 Object.assign(b,{p:v3(3.137,8,-.06),theta:0,phi:0,v:v3(0,0,12)});
 const clearance=()=>Math.min(...weaponSegments(a).flatMap(sa=>weaponSegments(b).map(sb=>
  closestSegments(sa.a,sa.b,sb.a,sb.b).distance-sa.radius-sb.radius)));
 assert.ok(clearance()>0);world.step([{},{}]);assert.ok(clearance()>0);
 assert.equal(world.events.filter(e=>e.type==='clash').length,1);
 assert.deepEqual(world.players.map(p=>p.health),[110,100]);
});
test('approved actual GLBs align face with swing plane, feet with floor, and preserve independent materials',async()=>{
 const source=await loadGeometry(new URL('../public/models/yellow-blob-static-v03.glb',import.meta.url));
 const a=instantiateYellowBlob(source),b=instantiateYellowBlob(source,1),root=new Group();root.add(a.host);root.position.y=.59;root.updateMatrixWorld(true);
 const bounds=new Box3().setFromObject(root);assert.ok(Math.abs(bounds.min.y)<.001);assert.ok(Math.abs(bounds.max.y-1.7)<.002);
 assert.notEqual(a.materials[0],b.materials[0]);const before=b.materials[0].color.clone();poseYellowBlob(a,{hitFlash:1});assert.deepEqual(b.materials[0].color,before);
 const staff=createWeaponModel(await loadGeometry(new URL('../public/models/yellow-staff.glb',import.meta.url)),'yellow-staff'),carrier=new Group();carrier.add(staff);
 for(const phi of [0,Math.PI/2,Math.PI,-.7])for(const theta of [-Math.PI,-1.2,0,.8,Math.PI/2,Math.PI]){
  root.rotation.y=-phi;root.updateMatrixWorld(true);
  const front=new Vector3(0,0,1).transformDirection(a.host.matrixWorld);near(front.x,Math.cos(phi));near(front.z,Math.sin(phi));
  const p=makePlayer(0,yellow);Object.assign(p,{theta,phi});const base=weaponPointFrame(p,v3()).point;carrier.position.set(base.x,base.y,base.z);setWeaponRotation(carrier.quaternion,theta,phi);carrier.updateMatrixWorld(true);
  const tip=new Vector3(0,1.8,0).applyMatrix4(carrier.matrixWorld),expected=weaponPointFrame(p,v3(0,1.8,0)).point;for(const axis of ['x','y','z'])near(tip[axis],expected[axis]);
 }
 assert.ok(makeYellowBlobFallback().root.children.length>5);
});
test('yellow dedicated loadout works for both players across modes and resets',()=>{
 assert.equal(resolveLoadout(yellow).bodyModel,'yellow-blob-static-v03.glb');assert.equal(resolveLoadout(yellow).weaponModel,'yellow-staff.glb');
 assert.equal(canEquip('basic-fighter','yellow-staff'),false);assert.equal(canEquip('yellow-blob','sword'),false);
 const game=new GameSession();for(const k of ['unlock','tick','tone','swing','impact'])game.sound[k]=()=>{};
 assert.equal(game.setLoadouts([yellow,yellow]),true);
 for(const mode of ['solo','practice','duel']){
  game.startRound(mode);assert.ok(game.world.players.every(p=>p.characterId==='yellow-blob'&&p.weapon==='yellow-staff'));
  game.state='playing';game.keyDown('KeyS');game.keyDown('ArrowDown');assert.equal(game.getInputs()[0].theta,-1);
  if(mode==='duel')assert.equal(game.getInputs()[1].theta,-1);
  game.pause();assert.equal(game.keys.size,0);game.startRound(mode);assert.ok(game.world.players.every(p=>p.health===p.maxHealth&&p.stamina===200));
 }
});
test('arena attaches both yellow models independently and replaces failed-load fallbacks on retry',async()=>{
 const view=Object.create(ArenaView.prototype);view.actors=new Group();view.meshRoot=view.actors;
 view.loadouts=[resolveLoadout(yellow),resolveLoadout(yellow)];view.characterLoaded=new Set();view.weaponLoaded=new Set();
 view.players=[view.makeFighter(0),view.makeFighter(1)];
 view.showCharacterFallback('yellow-blob-static-v03.glb');assert.ok(view.players.every(p=>p.yellowFallback.root.visible&&p.weaponBackup.visible));
 view.setCharacterModel(await loadGeometry(new URL('../public/models/yellow-blob-static-v03.glb',import.meta.url)),'yellow-blob-static-v03.glb');
 view.setWeaponModel(await loadGeometry(new URL('../public/models/yellow-staff.glb',import.meta.url)),'yellow-staff');
 assert.ok(view.players.every(p=>p.yellow&&!p.yellowFallback.root.visible&&!p.weaponBackup.visible&&!p.grip.visible));
 assert.notEqual(view.players[0].yellow.materials[0],view.players[1].yellow.materials[0]);
 const count=view.players[0].root.children.length;view.setCharacterModel(new Group(),'yellow-blob-static-v03.glb');assert.equal(view.players[0].root.children.length,count);
});
