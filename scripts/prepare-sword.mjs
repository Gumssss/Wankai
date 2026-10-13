// Reduce a Tripo GLB's triangle count while preserving its texture images.
// Usage: node scripts/prepare-sword.mjs input.glb public/models/sword.glb
import { readFile, writeFile } from 'node:fs/promises';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Expected input and output GLB paths');
const input = await readFile(inputPath);
if (input.toString('ascii', 0, 4) !== 'glTF') throw new Error('Input is not a GLB');
let cursor = 12;
const chunks = [];
while (cursor < input.length) {
  const length = input.readUInt32LE(cursor);
  chunks.push({ type: input.readUInt32LE(cursor + 4), data: input.subarray(cursor + 8, cursor + 8 + length) });
  cursor += length + 8;
}
const document = JSON.parse(chunks.find(chunk => chunk.type === 0x4e4f534a).data.toString('utf8'));
const binary = chunks.find(chunk => chunk.type === 0x004e4942).data;
const primitive = document.meshes[0].primitives[0];
if (document.meshes.length !== 1 || document.meshes[0].primitives.length !== 1) {
  throw new Error('This preparation script expects one mesh and one primitive');
}
function accessorData(index, Type, components) {
  const accessor = document.accessors[index];
  const view = document.bufferViews[accessor.bufferView];
  if (accessor.byteOffset || view.byteStride) throw new Error('Interleaved accessors are unsupported');
  const start = view.byteOffset || 0;
  const bytes = binary.subarray(start, start + accessor.count * components * Type.BYTES_PER_ELEMENT);
  return new Type(bytes.buffer, bytes.byteOffset, accessor.count * components);
}
const positions = accessorData(primitive.attributes.POSITION, Float32Array, 3);
const normals = accessorData(primitive.attributes.NORMAL, Float32Array, 3);
const uv = accessorData(primitive.attributes.TEXCOORD_0, Float32Array, 2);
const indices = accessorData(primitive.indices, Uint32Array, 1);
await MeshoptSimplifier.ready;
const targetIndexCount = Math.floor(Math.min(indices.length, 180_000 * 3) / 3) * 3;
const [reduced, error] = MeshoptSimplifier.simplify(indices, positions, 3, targetIndexCount, 0.02);
const oldToNew = new Map();
const used = [];
const remapped = new Uint32Array(reduced.length);
for (let i = 0; i < reduced.length; i++) {
  const old = reduced[i];
  if (!oldToNew.has(old)) { oldToNew.set(old, used.length); used.push(old); }
  remapped[i] = oldToNew.get(old);
}
function compact(data, components) {
  const output = new Float32Array(used.length * components);
  used.forEach((old, next) => {
    for (let component = 0; component < components; component++) {
      output[next * components + component] = data[old * components + component];
    }
  });
  return Buffer.from(output.buffer);
}
const parts = [];
let binaryLength = 0;
function append(viewIndex, data) {
  const padding = (4 - binaryLength % 4) % 4;
  if (padding) { parts.push(Buffer.alloc(padding)); binaryLength += padding; }
  document.bufferViews[viewIndex].byteOffset = binaryLength;
  document.bufferViews[viewIndex].byteLength = data.length;
  parts.push(data);
  binaryLength += data.length;
}
for (const image of document.images) {
  const view = document.bufferViews[image.bufferView];
  append(image.bufferView, binary.subarray(view.byteOffset, view.byteOffset + view.byteLength));
}
const compactPositions = compact(positions, 3);
append(document.accessors[primitive.attributes.POSITION].bufferView, compactPositions);
append(document.accessors[primitive.attributes.NORMAL].bufferView, compact(normals, 3));
append(document.accessors[primitive.attributes.TEXCOORD_0].bufferView, compact(uv, 2));
append(document.accessors[primitive.indices].bufferView, Buffer.from(remapped.buffer));
for (const index of Object.values(primitive.attributes)) document.accessors[index].count = used.length;
document.accessors[primitive.indices].count = remapped.length;
document.buffers[0].byteLength = binaryLength;
const reducedPositions = new Float32Array(compactPositions.buffer, compactPositions.byteOffset, compactPositions.length / 4);
const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (let i = 0; i < reducedPositions.length; i++) {
  const axis = i % 3;
  bounds.min[axis] = Math.min(bounds.min[axis], reducedPositions[i]);
  bounds.max[axis] = Math.max(bounds.max[axis], reducedPositions[i]);
}
Object.assign(document.accessors[primitive.attributes.POSITION], bounds);
const json = Buffer.from(JSON.stringify(document));
const jsonPadding = (4 - json.length % 4) % 4;
const binPadding = (4 - binaryLength % 4) % 4;
const total = 12 + 8 + json.length + jsonPadding + 8 + binaryLength + binPadding;
const header = Buffer.alloc(20);
header.write('glTF', 0, 'ascii'); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
header.writeUInt32LE(json.length + jsonPadding, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binaryLength + binPadding, 0); binHeader.writeUInt32LE(0x004e4942, 4);
await writeFile(outputPath, Buffer.concat([header, json, Buffer.alloc(jsonPadding, 0x20), binHeader, ...parts, Buffer.alloc(binPadding)]));
console.log(`Reduced ${indices.length / 3} triangles to ${remapped.length / 3}; ${used.length} vertices; error ${error.toFixed(4)}`);
