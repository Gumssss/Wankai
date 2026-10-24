// Build a lighter runtime copy from the archived, approved arena. No new decoder.
// node scripts/prepare-colosseum-lite.mjs [source-directory] [output-directory]
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {MeshoptSimplifier} from 'three/addons/libs/meshopt_simplifier.module.js';

const source=resolve(process.argv[2]||'assets/source/colosseum-runtime-v01');
const output=resolve(process.argv[3]||'assets/concepts/colosseum/lite-v01/candidate');
assert.notEqual(source,output,'Preserve the approved source');
const model='colosseum-prepared-v01.glb',floor='colosseum-roman-floor-v01.jpg';
const input=await readFile(join(source,model)),floorInput=await readFile(join(source,floor));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(input),'b15375cfff789df19bb587c84b6ef838287e306382f897d5f645f5a7c0857584');
assert.equal(input.toString('ascii',0,4),'glTF');assert.equal(input.readUInt32LE(4),2);
const chunks=[];
for(let cursor=12;cursor<input.length;){const length=input.readUInt32LE(cursor);chunks.push({type:input.readUInt32LE(cursor+4),data:input.subarray(cursor+8,cursor+8+length)});cursor+=length+8;}
const doc=JSON.parse(chunks.find(c=>c.type===0x4e4f534a).data),binary=chunks.find(c=>c.type===0x004e4942).data;
assert.equal(doc.meshes.length,9);assert.equal(doc.materials.length,1);assert.equal(doc.images.length,1);
assert(!doc.skins?.length&&!doc.animations?.length);
function data(id){
  const a=doc.accessors[id],view=doc.bufferViews[a.bufferView];
  assert(!a.sparse&&!view.byteStride&&view.buffer===0);
  const Type=({5126:Float32Array,5123:Uint16Array,5125:Uint32Array})[a.componentType];assert(Type);
  const components=({SCALAR:1,VEC2:2,VEC3:3})[a.type];assert(components);
  return new Type(binary.buffer,binary.byteOffset+(view.byteOffset||0)+(a.byteOffset||0),a.count*components);
}
const parts=[];let length=0;
function append(id,bytes){
  const padding=(4-length%4)%4;parts.push(Buffer.alloc(padding),bytes);length+=padding;
  Object.assign(doc.bufferViews[id],{byteOffset:length,byteLength:bytes.length});length+=bytes.length;
}
function resize(bytes){
  const result=spawnSync('python3',['-c','from PIL import Image; import io,sys; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB"); im.thumbnail((1024,1024),Image.Resampling.LANCZOS); im.save(sys.stdout.buffer,format="JPEG",quality=88,optimize=True)',],{input:bytes,maxBuffer:16*1024*1024});
  if(result.status!==0)throw Error(result.stderr.toString());return result.stdout;
}
const atlas=doc.images[0],atlasView=doc.bufferViews[atlas.bufferView];
append(atlas.bufferView,resize(binary.subarray(atlasView.byteOffset,atlasView.byteOffset+atlasView.byteLength)));
atlas.mimeType='image/jpeg';
await MeshoptSimplifier.ready;
const meshes=[];
for(const mesh of doc.meshes){
  assert.equal(mesh.primitives.length,1);const primitive=mesh.primitives[0];
  assert.equal(Object.keys(primitive.attributes).sort().join(','),'NORMAL,POSITION,TEXCOORD_0');
  assert(!primitive.targets&&(primitive.mode===undefined||primitive.mode===4));
  const position=data(primitive.attributes.POSITION),normal=data(primitive.attributes.NORMAL),uv=data(primitive.attributes.TEXCOORD_0),indices=data(primitive.indices);
  const isFloor=mesh.name==='SM_Arena_Floor';
  let reduced=indices,error=0,locked=0;
  if(!isFloor){
    const attributes=new Float32Array(position.length/3*5),locks=new Uint8Array(position.length/3);
    for(let i=0;i<locks.length;i++){
      attributes.set(normal.subarray(i*3,i*3+3),i*5);attributes.set(uv.subarray(i*2,i*2+2),i*5+3);
      // Retain the podium/low rim and all sector borders. Render triangles do
      // not own physics, but keeping this masonry exact prevents visual drift.
      if(position[i*3+1]<.94&&Math.hypot(position[i*3],position[i*3+2])<6.75){locks[i]=1;locked++;}
    }
    [reduced,error]=MeshoptSimplifier.simplifyWithAttributes(indices,position,3,attributes,5,[.5,.5,.5,1,1],locks,Math.floor(indices.length/3*.4)*3,.008,['LockBorder']);
  }
  const used=[],mapping=new Map(),remapped=new indices.constructor(reduced.length);
  if(isFloor){for(let i=0;i<position.length/3;i++){used.push(i);mapping.set(i,i);}}
  for(let i=0;i<reduced.length;i++){const old=reduced[i];if(!mapping.has(old)){mapping.set(old,used.length);used.push(old);}remapped[i]=mapping.get(old);}
  function compact(values,components){const result=new Float32Array(used.length*components);for(let i=0;i<used.length;i++)result.set(values.subarray(used[i]*components,(used[i]+1)*components),i*components);return result;}
  const attributes={POSITION:compact(position,3),NORMAL:compact(normal,3),TEXCOORD_0:compact(uv,2)};
  for(const [name,values]of Object.entries(attributes)){
    const a=doc.accessors[primitive.attributes[name]];append(a.bufferView,Buffer.from(values.buffer));a.count=used.length;delete a.byteOffset;
    if(name==='POSITION'){
      a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<values.length;i++){a.min[i%3]=Math.min(a.min[i%3],values[i]);a.max[i%3]=Math.max(a.max[i%3],values[i]);}
    }
  }
  const a=doc.accessors[primitive.indices];append(a.bufferView,Buffer.from(remapped.buffer));a.count=remapped.length;delete a.byteOffset;
  if(a.min)a.min=[0];if(a.max)a.max=[used.length-1];
  meshes.push({name:mesh.name,beforeTriangles:indices.length/3,afterTriangles:reduced.length/3,beforeVertices:position.length/3,afterVertices:used.length,error,lockedVertices:locked,floorUnchanged:isFloor});
}
doc.buffers[0].byteLength=length;
const json=Buffer.from(JSON.stringify(doc)),jsonPad=(4-json.length%4)%4,binPad=(4-length%4)%4;
const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
for(const [offset,value]of [[0,0x46546c67],[4,2],[8,28+json.length+jsonPad+length+binPad],[12,json.length+jsonPad],[16,0x4e4f534a]])header.writeUInt32LE(value,offset);
binHeader.writeUInt32LE(length+binPad);binHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(jsonPad,32),binHeader,...parts,Buffer.alloc(binPad)]),floorResult=resize(floorInput);
await mkdir(output,{recursive:true});await writeFile(join(output,model),result);await writeFile(join(output,floor),floorResult);
const report={asset:'colosseum-lite-v01',source:{modelSha256:hash(input),floorSha256:hash(floorInput),modelBytes:input.length,floorBytes:floorInput.length},output:{modelSha256:hash(result),floorSha256:hash(floorResult),modelBytes:result.length,floorBytes:floorResult.length},beforeTriangles:meshes.reduce((n,m)=>n+m.beforeTriangles,0),afterTriangles:meshes.reduce((n,m)=>n+m.afterTriangles,0),textures:{beforeEdge:2048,afterEdge:1024,rgba8WithMipmapsBytesBefore:2*2048**2*4*4/3,rgba8WithMipmapsBytesAfter:2*1024**2*4*4/3},meshes,method:'Bundled MeshoptSimplifier, attribute-aware; locked sector borders and low rim; exact floor geometry/UV/normals; 1024px JPEG atlas and floor. No runtime decoding dependency.'};
await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
