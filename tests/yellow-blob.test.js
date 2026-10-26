import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Vector3,Box3} from 'three';
import {ArenaPhysics,makePlayer,weaponPointFrame,v3} from '../src/physics.js';
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
for(const chapter of approved.chapters.filter(c=>c.speed===1))test(`yellow production physics matches approved ${chapter.id}`,()=>{
 const rows=approved.frames.filter(f=>f.scenario===chapter.id&&f.speed===1),world=new ArenaPhysics(),combat=rows[0].players.length===2;
 world.reset(combat,!combat,yellow,sword,3);
 rows[0].players.forEach((p,i)=>Object.assign(world.players[i],{p:{...p.p},theta:p.theta,phi:p.phi}));
 let previous=0,hits=[];
 for(const row of rows){
  const end=Math.round(row.time*180);
  for(let tick=previous+1;tick<=end;tick++){world.step([input(chapter.id,tick/180),{theta:0,phi:0}]);hits.push(...world.events);}
  previous=end;
  row.players.forEach((expected,i)=>{const p=world.players[i];for(const axis of ['x','y','z'])near(p.p[axis],expected.p[axis]);for(const key of ['theta','phi','stamina','health'])near(p[key],expected[key]);assert.equal(p.staffGrounded,expected.contact);});
 }
 if(chapter.id.endsWith('-hit'))assert.ok(hits.some(e=>e.type==='hit'&&e.attacker===0));
 if(chapter.id==='clash')assert.ok(hits.some(e=>e.type==='clash'));
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
 assert.equal(canEquip('basic-fighter','yellow-staff'),false);assert.equal(canEquip('yellow-blob','sword'),true);
 const game=new GameSession();for(const k of ['unlock','tick','tone','swing','impact'])game.sound[k]=()=>{};
 assert.equal(game.setLoadouts([yellow,yellow]),true);
 for(const mode of ['solo','practice','duel']){
  game.startRound(mode);assert.ok(game.world.players.every(p=>p.characterId==='yellow-blob'&&p.weapon==='yellow-staff'));
  game.state='playing';game.keyDown('KeyS');game.keyDown('ArrowDown');assert.equal(game.getInputs()[0].theta,-1);
  if(mode==='duel')assert.equal(game.getInputs()[1].theta,-1);
  game.pause();assert.equal(game.keys.size,0);game.startRound(mode);assert.ok(game.world.players.every(p=>p.health===100&&p.stamina===200));
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

for(const weaponId of ['sword','polearm','hammer'])test(`yellow supports common weapon ${weaponId} in session and arena`,async()=>{
 const selection={characterId:'yellow-blob',weaponId},resolved=resolveLoadout(selection);
 assert.equal(resolved.bodyModel,'yellow-blob-static-v03.glb');
 assert.equal(resolved.weaponModel,`${weaponId}.glb`);
 assert.equal(resolved.controller,'floating');
 const game=new GameSession();for(const k of ['unlock','tick','tone','swing','impact'])game.sound[k]=()=>{};
 assert.equal(game.setLoadouts([selection,selection]),true);
 game.startRound('duel');
 assert.ok(game.world.players.every(p=>p.characterId==='yellow-blob'&&p.weapon===weaponId));
 for(let i=0;i<180;i++)game.world.step([{theta:1,phi:.5},{theta:-1,phi:-.5}]);
 assert.ok(game.world.players.every(p=>Object.values(p.p).every(Number.isFinite)));
 const view=Object.create(ArenaView.prototype);view.actors=new Group();view.meshRoot=view.actors;
 view.loadouts=[resolved,resolved];view.characterLoaded=new Set();view.weaponLoaded=new Set();
 view.players=[view.makeFighter(0),view.makeFighter(1)];
 view.setCharacterModel(await loadGeometry(new URL('../public/models/yellow-blob-static-v03.glb',import.meta.url)),'yellow-blob-static-v03.glb');
 view.setWeaponModel(await loadGeometry(new URL(`../public/models/${weaponId}.glb`,import.meta.url)),weaponId);
 assert.ok(view.players.every(p=>p.yellow&&!p.weaponBackup.visible));
 assert.equal(canEquip('yellow-blob','long-ears'),false);
 assert.equal(canEquip('yellow-blob','cat-paws'),false);
});
