import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Inspect exact GLB buffers in Node; browsers verify the unmodified textures.
export async function loadGeometry(file) {
  const bytes=await readFile(file),length=bytes.readUInt32LE(12);
  const doc=JSON.parse(bytes.subarray(20,20+length));
  delete doc.images;delete doc.textures;delete doc.samplers;
  for(const material of doc.materials||[]) {
    for(const key of ['normalTexture','occlusionTexture','emissiveTexture'])delete material[key];
    if(material.pbrMetallicRoughness)for(const key of ['baseColorTexture','metallicRoughnessTexture'])delete material.pbrMetallicRoughness[key];
  }
  const json=Buffer.from(JSON.stringify(doc)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
  const bin=bytes.subarray(20+length),header=Buffer.alloc(20);
  for(const [offset,value]of [[0,0x46546c67],[4,2],[8,20+padded.length+bin.length],[12,padded.length],[16,0x4e4f534a]])header.writeUInt32LE(value,offset);
  const data=Buffer.concat([header,padded,bin]);
  return (await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;
}
