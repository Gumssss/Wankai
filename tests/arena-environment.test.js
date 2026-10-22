import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,PlaneGeometry,MeshStandardMaterial,PerspectiveCamera,Vector3} from 'three';
import {ARENA_PROFILE,arenaPlacement} from '../src/arena-profile.js';
import {attachArenaModel,prepareArenaCamera,restoreArenaOpacity} from '../src/arena-model.js';
import {ArenaPhysics,CONFIG,arenaScaleForMode} from '../src/physics.js';

function fixture(){
 const group=new Group(),material=new MeshStandardMaterial();
 const floor=new Mesh(new PlaneGeometry(12.9,12.9),material);floor.rotateX(-Math.PI/2);floor.name=ARENA_PROFILE.floorMesh;group.add(floor);
 for(let i=0;i<8;i++){const mesh=new Mesh(new BoxGeometry(2,4,.5),material);mesh.name=ARENA_PROFILE.sectorPrefix+String(i).padStart(2,'0');const a=-(i+.5)*Math.PI/4;mesh.position.set(Math.cos(a)*8,2,Math.sin(a)*8);mesh.rotation.y=Math.PI/2-a;group.add(mesh);}
 return group;
}
test('all modes preserve nominal play radius and uniformly scaled podium height',()=>{
 for(const mode of ['practice','duel-fixed','solo','duel']){const scale=arenaScaleForMode(mode),world=new ArenaPhysics();world.reset(false,false,'sword','polearm',scale);assert.equal(world.arenaRadius,6.45*scale);assert.equal(world.arenaRimHeight,.84*scale);assert.equal(arenaPlacement(scale).floorHeight,0);}
});
test('per-camera arena cutaway is independent and restores the full source architecture',()=>{
 const arena=attachArenaModel(fixture()),p=[{p:{x:0,y:.59,z:0}}];
 const front=new PerspectiveCamera(),back=new PerspectiveCamera(),angle=-Math.PI/8;front.position.set(Math.cos(angle)*12,2,Math.sin(angle)*12);back.position.copy(front.position).multiplyScalar(-1);back.position.y=2;
 // Sector names follow Blender XY; runtime Z reverses the authoring Y axis.
 const a=prepareArenaCamera(arena,front,p);assert(a.length>0);
 const b=prepareArenaCamera(arena,back,p);assert(b.length>0);assert.notDeepEqual(a,b);
 for(const sector of arena.sectors)assert.equal(sector.mesh.material.opacity,b.includes(sector.mesh.name)?0:1,'first pane state leaked');
 assert(arena.sectors.every(s=>s.mesh.visible&&s.mesh.castShadow));assert.equal(arena.floor.material.opacity,1);
 restoreArenaOpacity(arena);assert(arena.sectors.every(s=>s.mesh.material.opacity===1&&s.mesh.material.depthWrite));
});
test('a camera inside the bowl does not fade walls behind its fighter',()=>{
 const arena=attachArenaModel(fixture()),camera=new PerspectiveCamera();camera.position.set(0,2,4);
 assert.deepEqual(prepareArenaCamera(arena,camera,[{p:{x:0,y:.59,z:0}}]),[]);
});
test('a low pulled-back camera inside a wall sector clears the containing stonework',()=>{
 const arena=attachArenaModel(fixture()),camera=new PerspectiveCamera();
 camera.position.copy(arena.sectors[0].mesh.position);
 const names=prepareArenaCamera(arena,camera,[{p:{x:0,y:.59,z:0}}]);
 assert(names.includes(arena.sectors[0].mesh.name),'rays from inside front-sided stone can miss the enclosing wall');
 assert(!names.includes(arena.sectors[4].mesh.name),'far-side architecture should remain');
});
test('large arena keeps arch proportions and independent per-sector materials',()=>{
 const source=fixture(),arena=attachArenaModel(source,3);assert.deepEqual(source.scale.toArray(),[3,3,3]);assert.equal(new Set(arena.sectors.map(s=>s.mesh.material)).size,8);assert.equal(arena.floor.material.transparent,false);
});
test('weapons meet the taller prepared low rim but can pass above it',()=>{
 for(const scale of [1,3]){
  function response(y){const w=new ArenaPhysics();w.reset(false,true,'polearm','polearm',scale);const p=w.players[0];p.p.x=w.arenaRadius-1;p.p.y=y;p.phi=0;p.theta=Math.PI/2;p.v={x:2,y:0,z:0};p.wt=p.wp=0;w.solveWall(p,CONFIG.step);return p.v.x;}
  assert(response(.6*scale)<2,'weapon passed through visible low podium');
  assert.equal(response(ARENA_PROFILE.weaponContactHeight*scale+1),2,'decorative upper architecture became an extra collider');
 }
});
test('incomplete or misaligned arena exports are rejected for the usable fallback',()=>{
 const source=fixture();source.remove(source.children[2]);assert.throws(()=>attachArenaModel(source),/Incomplete/);
 const bad=fixture();bad.children[0].position.y=.05;assert.throws(()=>attachArenaModel(bad),/not aligned/);
});
