import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Box3,Raycaster,Vector3,REVISION} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {attachArenaModel,prepareArenaCamera,restoreArenaOpacity} from '../../src/arena-model.js';
import {ARENA_PROFILE,arenaPlacement} from '../../src/arena-profile.js';
const root=new URL('../../',import.meta.url);
const bytes=await readFile(new URL('public/models/colosseum-prepared-v01.glb',root));
const n=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+n));
assert.equal(document.images.length,1);assert.equal(document.materials.length,1);
assert(document.images.every(im=>Number.isInteger(im.bufferView)&&!im.uri),'Textures must be embedded');
// Node checks exact exported geometry and material scalars. Actual image decode
// and rendering are separately checked in the real browser game.
const d=structuredClone(document);delete d.images;delete d.textures;delete d.samplers;
for(const material of d.materials)delete material.pbrMetallicRoughness.baseColorTexture;
const json=Buffer.from(JSON.stringify(d)),pad=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(pad);
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(20+pad.length+bytes.length-20-n,8);header.writeUInt32LE(pad.length,12);header.writeUInt32LE(0x4e4f534a,16);
const input=Buffer.concat([header,pad,bytes.subarray(20+n)]);
async function load(){return (await new GLTFLoader().parseAsync(input.buffer.slice(input.byteOffset,input.byteOffset+input.byteLength),'')).scene;}
const scene=await load(),instance=attachArenaModel(scene),meshes=[];scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
assert.equal(meshes.length,9);assert.equal(instance.sectors.length,8);
let triangles=0;for(const mesh of meshes){const g=mesh.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const key of ['position','normal','uv'])assert([...g.attributes[key].array].every(Number.isFinite));assert(Math.abs(mesh.material.roughness-.88)<1e-6);}
const floor=instance.floor,ray=new Raycaster(),samples=[];let misses=0,maxFloorError=0;
for(let ix=-14;ix<=14;ix++)for(let iz=-14;iz<=14;iz++){
 const x=ix/14*6.35,z=iz/14*6.35;if(Math.hypot(x,z)>6.35)continue;
 ray.set(new Vector3(x,2,z),new Vector3(0,-1,0));const hit=ray.intersectObject(floor,false)[0];
 if(!hit)misses++;else maxFloorError=Math.max(maxFloorError,Math.abs(hit.point.y));samples.push([x,z]);
}
assert.equal(misses,0,'Missing visible floor under playable region');assert(maxFloorError<1e-5);
let floorRadiusMax=0;for(let i=0;i<floor.geometry.attributes.position.count;i++){const v=new Vector3().fromBufferAttribute(floor.geometry.attributes.position,i);floorRadiusMax=Math.max(floorRadiusMax,Math.hypot(v.x,v.z));}assert(floorRadiusMax<6.491,'Floor outline is not clean');
const rimRays=[];for(let i=0;i<180;i++){const a=i*Math.PI*2/180;ray.set(new Vector3(0,.25,0),new Vector3(Math.cos(a),0,Math.sin(a)));const hit=ray.intersectObjects(instance.sectors.map(s=>s.mesh),false)[0];if(hit)rimRays.push({angle:a,radius:hit.distance});}
const bounds=new Box3().setFromObject(scene),large=attachArenaModel(await load(),3),largeBounds=new Box3().setFromObject(large.root);
const size=bounds.getSize(new Vector3()),largeSize=largeBounds.getSize(new Vector3());for(const key of ['x','y','z'])assert(Math.abs(largeSize[key]/size[key]-3)<1e-6,'Non-uniform architecture scaling');
assert.equal(arenaPlacement(3).radius,19.35);assert.equal(arenaPlacement(3).weaponContactHeight,2.52);
const original=await readFile(new URL('assets/source/tripo/colosseum-v01/colosseum-tripo-v01-source.glb',root));assert.equal(createHash('sha256').update(original).digest('hex'),'7890a8fda3f0bf7b24ebac3da641b2c5c15bc283030c9c026e23a1c9c72d14e2');
const report={status:'passed',three_revision:REVISION,bytes:bytes.length,triangles,render_meshes:meshes.length,shared_embedded_images:1,roughness:.88,skin_count:document.skins?.length||0,animations:document.animations?.length||0,bounds: {min:bounds.min.toArray(),max:bounds.max.toArray()},large_bounds:{min:largeBounds.min.toArray(),max:largeBounds.max.toArray()},uniform_mode_scaling:true,floor_radius_max:floorRadiusMax,rim_ray_radius_range:[Math.min(...rimRays.map(r=>r.radius)),Math.max(...rimRays.map(r=>r.radius))],rim_rays:rimRays,floor_ray_samples:samples.length,floor_misses:misses,maximum_floor_height_error:maxFloorError,source_hash_unchanged:true,texture_decode:'checked separately in browser',note:'Static asset checks; actual gameplay and camera review are separate.'};
await writeFile(new URL('assets/concepts/colosseum/prepared-v01/three-verification.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
