// Prepare the inspected single-mesh Tripo export. Requires Python 3 + Pillow.
// node scripts/prepare-weapon.mjs input.glb output.glb [triangles=80000] [textureEdge=1024]
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [inputPath, outputPath, triangles = '80000', textureEdge = '1024'] = process.argv.slice(2);
if (!inputPath || !outputPath || !(+triangles > 0) || !(+textureEdge > 0)) throw new Error('Expected GLB paths and positive budgets');
const input = await readFile(inputPath);
if (input.toString('ascii', 0, 4) !== 'glTF' || input.readUInt32LE(4) !== 2) throw new Error('Expected a GLB v2');
const chunks = [];
for (let cursor = 12; cursor < input.length;) {
  const length = input.readUInt32LE(cursor);
  chunks.push({ type: input.readUInt32LE(cursor + 4), data: input.subarray(cursor + 8, cursor + 8 + length) });
  cursor += length + 8;
}
const document = JSON.parse(chunks.find(chunk => chunk.type === 0x4e4f534a).data.toString());
const binary = chunks.find(chunk => chunk.type === 0x004e4942).data;
const primitive = document.meshes?.[0]?.primitives[0];
if (document.meshes.length !== 1 || document.meshes[0].primitives.length !== 1 || primitive.mode !== 4 ||
    Object.keys(primitive.attributes).sort().join() !== 'NORMAL,POSITION,TEXCOORD_0' ||
    document.bufferViews.length !== 4 + document.images.length || primitive.targets || document.skins) {
  throw new Error('Inspect this asset first: expected a single static triangle mesh with position, normal, UV and embedded images');
}
function data(index, Type, components, componentType, type) {
  const accessor = document.accessors[index], view = document.bufferViews[accessor.bufferView];
  if (accessor.componentType !== componentType || accessor.type !== type || accessor.sparse || view.byteStride ||
      accessor.byteOffset || view.buffer !== 0) throw new Error('Unsupported accessor layout');
  const start = view.byteOffset || 0;
  return new Type(binary.buffer, binary.byteOffset + start, accessor.count * components);
}
const positions = data(primitive.attributes.POSITION, Float32Array, 3, 5126, 'VEC3');
const normals = data(primitive.attributes.NORMAL, Float32Array, 3, 5126, 'VEC3');
const uv = data(primitive.attributes.TEXCOORD_0, Float32Array, 2, 5126, 'VEC2');
const indices = data(primitive.indices, Uint32Array, 1, 5125, 'SCALAR');
await MeshoptSimplifier.ready;
const [reduced, error] = MeshoptSimplifier.simplify(indices, positions, 3, Math.min(indices.length, Math.floor(+triangles) * 3), 0.02);
const used = [], oldToNew = new Map(), remapped = new Uint32Array(reduced.length);
reduced.forEach((old, index) => {
  if (!oldToNew.has(old)) { oldToNew.set(old, used.length); used.push(old); }
  remapped[index] = oldToNew.get(old);
});
function compact(source, components) {
  const output = new Float32Array(used.length * components);
  used.forEach((old, next) => {
    for (let axis = 0; axis < components; axis++) output[next * components + axis] = source[old * components + axis];
  });
  return Buffer.from(output.buffer);
}
const parts = [];
let binaryLength = 0;
function append(viewIndex, bytes) {
  const padding = (4 - binaryLength % 4) % 4;
  parts.push(Buffer.alloc(padding), bytes);
  binaryLength += padding;
  Object.assign(document.bufferViews[viewIndex], { byteOffset: binaryLength, byteLength: bytes.length });
  binaryLength += bytes.length;
}
for (const image of document.images) {
  const view = document.bufferViews[image.bufferView];
  const resized = spawnSync('python3', ['-c',
    'from PIL import Image; import io,sys; im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB"); im.thumbnail((int(sys.argv[1]),)*2,Image.Resampling.LANCZOS); im.save(sys.stdout.buffer,format="JPEG",quality=90,optimize=True)', textureEdge],
  { input: binary.subarray(view.byteOffset, view.byteOffset + view.byteLength), maxBuffer: 32 * 1024 * 1024 });
  if (resized.status !== 0) throw new Error(resized.stderr.toString());
  image.mimeType = 'image/jpeg';
  append(image.bufferView, resized.stdout);
}
const compactPositions = compact(positions, 3);
append(document.accessors[primitive.attributes.POSITION].bufferView, compactPositions);
append(document.accessors[primitive.attributes.NORMAL].bufferView, compact(normals, 3));
append(document.accessors[primitive.attributes.TEXCOORD_0].bufferView, compact(uv, 2));
append(document.accessors[primitive.indices].bufferView, Buffer.from(remapped.buffer));
for (const index of Object.values(primitive.attributes)) document.accessors[index].count = used.length;
Object.assign(document.accessors[primitive.indices], { count: remapped.length, min: [0], max: [used.length - 1] });
document.buffers[0].byteLength = binaryLength;
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
const reducedPositions = new Float32Array(compactPositions.buffer, compactPositions.byteOffset, compactPositions.length / 4);
reducedPositions.forEach((value, index) => {
  const axis = index % 3;
  bounds.min[axis] = Math.min(bounds.min[axis], value); bounds.max[axis] = Math.max(bounds.max[axis], value);
});
Object.assign(document.accessors[primitive.attributes.POSITION], bounds);
// The exporter advertises ngon encoding, but these are now ordinary triangles.
document.extensionsUsed = document.extensionsUsed?.filter(name => name !== 'FB_ngon_encoding');
const json = Buffer.from(JSON.stringify(document)), jsonPadding = (4 - json.length % 4) % 4;
const binPadding = (4 - binaryLength % 4) % 4;
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + jsonPadding + binaryLength + binPadding, 8);
header.writeUInt32LE(json.length + jsonPadding, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(binaryLength + binPadding); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, json, Buffer.alloc(jsonPadding, 0x20), binHeader, ...parts, Buffer.alloc(binPadding)]);
await writeFile(outputPath, output);
console.log(`${indices.length / 3} → ${remapped.length / 3} triangles; ${used.length} vertices; error ${error.toFixed(4)}; ${input.length} → ${output.length} bytes; textures ≤${textureEdge}px`);
