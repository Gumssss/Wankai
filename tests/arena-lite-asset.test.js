import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Box3,Vector3,Raycaster,PerspectiveCamera} from 'three';
import {loadGeometry} from '../scripts/preview/model-geometry.mjs';
import {attachArenaModel,prepareArenaCamera} from '../src/arena-model.js';
import {ARENA_PROFILE,COMBAT_ARENA} from '../src/arena-profile.js';

const root=new URL('../',import.meta.url),model='colosseum-prepared-v01.glb';
const sourcePath=new URL('assets/source/colosseum-runtime-v01/'+model,root),runtimePath=new URL('public/models/'+ARENA_PROFILE.model,root);
const [before,after,sourceBytes,runtimeBytes]=await Promise.all([loadGeometry(sourcePath),loadGeometry(runtimePath),readFile(sourcePath),readFile(runtimePath)]);
const byName=scene=>{const meshes=new Map();scene.traverse(o=>{if(o.isMesh)meshes.set(o.name,o);});return meshes;};
const original=byName(before),lighter=byName(after);
const bytes=values=>Buffer.from(values.buffer,values.byteOffset,values.byteLength);
const vertexKey=(attribute,index)=>[attribute.getX(index),attribute.getY(index),attribute.getZ(index)].join(',');
function jpegSize(buffer){
  assert.equal(buffer.readUInt16BE(0),0xffd8);let cursor=2;
  while(cursor<buffer.length){assert.equal(buffer[cursor],255);const marker=buffer[cursor+1];cursor+=2;const length=buffer.readUInt16BE(cursor);if([0xc0,0xc1,0xc2].includes(marker))return [buffer.readUInt16BE(cursor+5),buffer.readUInt16BE(cursor+3)];cursor+=length;}
  throw Error('Missing JPEG frame');
}

test('lighter Colosseum halves geometry cost while retaining all sector names, transforms and world bounds',()=>{
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),'b15375cfff789df19bb587c84b6ef838287e306382f897d5f645f5a7c0857584');
  assert.deepEqual([...lighter.keys()],[...original.keys()]);assert.equal(lighter.size,9);
  let triangles=0;
  for(const [name,mesh]of lighter){
    assert.deepEqual(mesh.matrix.toArray(),original.get(name).matrix.toArray());
    for(const attribute of Object.values(mesh.geometry.attributes))assert(attribute.array.every(Number.isFinite));
    triangles+=mesh.geometry.index.count/3;
  }
  assert(triangles<50000);assert(runtimeBytes.length<sourceBytes.length/2);
  const oldBox=new Box3().setFromObject(before),newBox=new Box3().setFromObject(after);
  assert.deepEqual(newBox.min.toArray(),oldBox.min.toArray());assert.deepEqual(newBox.max.toArray(),oldBox.max.toArray());
  assert.equal(COMBAT_ARENA.scale,3);assert.equal(ARENA_PROFILE.radius,6.45);
});

test('playable floor positions, indices, normals and fallback UVs are byte-for-byte unchanged',()=>{
  const a=original.get(ARENA_PROFILE.floorMesh).geometry,b=lighter.get(ARENA_PROFILE.floorMesh).geometry;
  for(const name of ['position','normal','uv'])assert.deepEqual(bytes(a.attributes[name].array),bytes(b.attributes[name].array));
  assert.deepEqual(bytes(a.index.array),bytes(b.index.array));
});

test('low rim and open sector borders retain their original vertex positions',()=>{
  for(const [name,mesh]of original){
    if(name===ARENA_PROFILE.floorMesh)continue;
    const g=mesh.geometry,position=g.attributes.position,edges=new Map(),required=new Set();
    for(let i=0;i<position.count;i++)if(position.getY(i)<.94&&Math.hypot(position.getX(i),position.getZ(i))<6.75)required.add(vertexKey(position,i));
    for(let i=0;i<g.index.count;i+=3)for(const [a,b]of [[0,1],[1,2],[2,0]]){
      const ends=[vertexKey(position,g.index.getX(i+a)),vertexKey(position,g.index.getX(i+b))].sort(),key=ends.join('|');
      const edge=edges.get(key)||{ends,count:0};edge.count++;edges.set(key,edge);
    }
    for(const edge of edges.values())if(edge.count===1)edge.ends.forEach(p=>required.add(p));
    const kept=lighter.get(name).geometry.attributes.position,vertices=new Set();for(let i=0;i<kept.count;i++)vertices.add(vertexKey(kept,i));
    for(const point of required)assert(vertices.has(point),name+' lost a locked border/rim vertex');
  }
});

test('both runtime textures are 1K and the saved files match the inspected candidate',async()=>{
  const jsonLength=runtimeBytes.readUInt32LE(12),doc=JSON.parse(runtimeBytes.subarray(20,20+jsonLength));
  assert.equal(doc.images.length,1);assert.equal(doc.materials.length,1);
  const view=doc.bufferViews[doc.images[0].bufferView],start=28+jsonLength+(view.byteOffset||0);
  assert.deepEqual(jpegSize(runtimeBytes.subarray(start,start+view.byteLength)),[1024,1024]);
  assert.deepEqual(jpegSize(await readFile(new URL('public/textures/'+ARENA_PROFILE.floorTexture,root))),[1024,1024]);
  assert.deepEqual(runtimeBytes,await readFile(new URL('assets/concepts/colosseum/lite-v01/candidate/'+model,root)));
});

test('protected low-rim hits and representative game camera cutaways are unchanged',()=>{
  const old=attachArenaModel(before.clone(true)),current=attachArenaModel(after.clone(true));
  const ray=new Raycaster();
  // The analytic arena stops fighters at 6.45. Farther entrance/stand masonry
  // is decorative and deliberately simplified; compare the protected rim.
  ray.far=6.75;
  for(let i=0;i<180;i++){
    const angle=i*Math.PI/90;ray.set(new Vector3(0,.25,0),new Vector3(Math.cos(angle),0,Math.sin(angle)));
    const hits=[old,current].map(instance=>ray.intersectObjects(instance.sectors.map(s=>s.mesh),false)[0]);
    assert.equal(!!hits[0],!!hits[1]);if(hits[0])assert(Math.abs(hits[0].distance-hits[1].distance)<1e-6);
  }
  for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,camera=new PerspectiveCamera(55,1,.1,120);camera.position.set(Math.cos(angle)*9,4,Math.sin(angle)*9);camera.lookAt(0,1,0);camera.updateMatrixWorld(true);
    const players=[{p:{x:-.75,y:.59,z:0}},{p:{x:.75,y:.59,z:0}}];
    assert.deepEqual([...prepareArenaCamera(current,camera,players)].sort(),[...prepareArenaCamera(old,camera,players)].sort());
  }
});
