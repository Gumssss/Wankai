// Prepare Tripo's single-mesh GLB for this small real-time arena.
// Usage: node scripts/optimize-weapon.mjs input.glb public/models/polearm.glb
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { MeshoptSimplifier } from 'three/addons/libs/meshopt_simplifier.module.js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error('Expected input and output GLB paths');
const input = await readFile(inputPath);
if (input.toString('ascii', 0, 4) !== 'glTF' || input.readUInt32LE(4) !== 2) throw new Error('Expected a glTF 2.0 GLB');
const jsonLength = input.readUInt32LE(12);
const source = JSON.parse(input.toString('utf8', 20, 20 + jsonLength));
const binaryHeader = 20 + jsonLength;
if (input.readUInt32LE(binaryHeader + 4) !== 0x004e4942) throw new Error('Expected one BIN chunk');
const binary = input.subarray(binaryHeader + 8);
const primitive = source.meshes?.[0]?.primitives?.[0];
if (source.meshes?.length !== 1 || source.meshes[0].primitives.length !== 1 ||
    primitive?.mode && primitive.mode !== 4 ||
    primitive?.attributes?.POSITION === undefined || primitive?.attributes?.NORMAL === undefined || primitive.indices === undefined) {
  throw new Error('Expected one indexed triangle mesh with positions and normals');
}

function attribute(index, components, type) {
  const accessor = source.accessors[index];
  const view = source.bufferViews[accessor.bufferView];
  if (accessor.type !== (components === 3 ? 'VEC3' : 'SCALAR') ||
      accessor.componentType !== (type === Float32Array ? 5126 : 5125) ||
      accessor.sparse || view.byteStride) throw new Error('Unexpected packed attribute layout');
  const offset = view.byteOffset + (accessor.byteOffset || 0);
  const count = accessor.count * components;
  return new type(binary.buffer, binary.byteOffset + offset, count);
}

const positions = attribute(primitive.attributes.POSITION, 3, Float32Array);
const normals = attribute(primitive.attributes.NORMAL, 3, Float32Array);
const indices = attribute(primitive.indices, 1, Uint32Array);
if (positions.length !== normals.length) throw new Error('Position and normal counts differ');

await MeshoptSimplifier.ready;
const targetTriangles = 80000;
const [simplified, error] = MeshoptSimplifier.simplify(
  indices, positions, 3, targetTriangles * 3, 0.012, ['LockBorder']
);
if (simplified.length === 0) throw new Error('Simplification produced no triangles');

const remap = new Map();
const compactIndices = new Uint32Array(simplified.length);
const compactPositions = [];
const compactNormals = [];
for (let i = 0; i < simplified.length; i++) {
  const old = simplified[i];
  let next = remap.get(old);
  if (next === undefined) {
    next = remap.size;
    remap.set(old, next);
    for (let j = 0; j < 3; j++) {
      compactPositions.push(positions[old * 3 + j]);
      compactNormals.push(normals[old * 3 + j]);
    }
  }
  compactIndices[i] = next;
}

const positionBytes = Buffer.from(new Float32Array(compactPositions).buffer);
const normalBytes = Buffer.from(new Float32Array(compactNormals).buffer);
const indexBytes = Buffer.from(compactIndices.buffer);
const content = Buffer.concat([positionBytes, normalBytes, indexBytes]);
const bounds = [0, 1, 2].map(axis => {
  let min = Infinity, max = -Infinity;
  for (let i = axis; i < compactPositions.length; i += 3) {
    min = Math.min(min, compactPositions[i]);
    max = Math.max(max, compactPositions[i]);
  }
  return [min, max];
});
const output = {
  asset: { version: '2.0', generator: 'Wankai MeshoptSimplifier from Tripo export' },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'Polearm' }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
  materials: source.materials,
  accessors: [
    { bufferView: 0, componentType: 5126, count: compactPositions.length / 3, type: 'VEC3', min: bounds.map(x => x[0]), max: bounds.map(x => x[1]) },
    { bufferView: 1, componentType: 5126, count: compactNormals.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5125, count: compactIndices.length, type: 'SCALAR', min: [0], max: [remap.size - 1] },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
    { buffer: 0, byteOffset: positionBytes.length, byteLength: normalBytes.length, target: 34962 },
    { buffer: 0, byteOffset: positionBytes.length + normalBytes.length, byteLength: indexBytes.length, target: 34963 },
  ],
  buffers: [{ byteLength: content.length }],
};
const jsonBytes = Buffer.from(JSON.stringify(output));
const paddedJson = Buffer.alloc(Math.ceil(jsonBytes.length / 4) * 4, 0x20);
jsonBytes.copy(paddedJson);
const header = Buffer.alloc(12);
header.write('glTF'); header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + paddedJson.length + 8 + content.length, 8);
const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(paddedJson.length); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(content.length); binHeader.writeUInt32LE(0x004e4942, 4);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, Buffer.concat([header, jsonHeader, paddedJson, binHeader, content]));
console.log(`${indices.length / 3} -> ${simplified.length / 3} triangles; ${remap.size} vertices; error ${error.toFixed(5)}`);
