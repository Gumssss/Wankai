import * as THREE from 'three';

// The imported character models (tools/import-characters.py writes them to
// public/models/characters/). Each GLB holds one textured mesh already in the
// body frame: face along +X, feet at y = 0, metres. The game preloads them
// once before the arena first renders (preloadCharacterModels), so building
// a character stays synchronous; under Node (tests) they are read from disk
// on first use instead.
export const CHARACTER_MODELS = Object.freeze(['naiwa', 'naiwa-laugh', 'dudu', 'happy-cat']);
const assets = new Map();
let loading = null;

const url = id => `${import.meta.env?.BASE_URL ?? './'}models/characters/${id}.glb`;
const COMPONENTS = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const SIZES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

// Reads the single-mesh GLBs the import tool writes: geometry, the material's
// constants and the raw image bytes.
export function parseCharacterGlb(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('not a GLB');
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
  const binStart = 20 + jsonLength + 8;
  const bytes = index => {
    const entry = json.bufferViews[index];
    return new Uint8Array(buffer, binStart + (entry.byteOffset ?? 0), entry.byteLength);
  };
  const accessor = index => {
    const entry = json.accessors[index], Type = COMPONENTS[entry.componentType], view = json.bufferViews[entry.bufferView];
    const array = new Type(buffer, binStart + (view.byteOffset ?? 0) + (entry.byteOffset ?? 0), entry.count * SIZES[entry.type]);
    return new THREE.BufferAttribute(array.slice(), SIZES[entry.type]);
  };
  const primitive = json.meshes[0].primitives[0], geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', accessor(primitive.attributes.POSITION));
  geometry.setAttribute('normal', accessor(primitive.attributes.NORMAL));
  geometry.setAttribute('uv', accessor(primitive.attributes.TEXCOORD_0));
  geometry.setIndex(accessor(primitive.indices));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = json.materials[primitive.material], pbr = material.pbrMetallicRoughness ?? {};
  const image = texture => texture ? bytes(json.images[json.textures[texture.index].source].bufferView) : null;
  return { geometry, roughness: pbr.roughnessFactor ?? 0.7, baseColor: image(pbr.baseColorTexture), normal: image(material.normalTexture),
    extras: json.meshes[0].extras ?? {} };
}

async function decodeTexture(data, colorSpace) {
  if (!data || typeof createImageBitmap !== 'function') return null;
  const bitmap = await createImageBitmap(new Blob([data], { type: 'image/jpeg' }), { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const texture = new THREE.Texture(bitmap);
  // glTF UVs have their origin top-left: no flip.
  texture.flipY = false;
  texture.colorSpace = colorSpace;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  // Shared by every fighter and portrait: disposeObject leaves it alone.
  texture.userData.shared = true;
  texture.needsUpdate = true;
  return texture;
}

// The packaged game runs from file://, where fetch() is refused: fall back to XHR.
function bytesOf(address) {
  return fetch(address).then(response => {
    if (!response.ok) throw new Error(`${address}: ${response.status}`);
    return response.arrayBuffer();
  }, () => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', address);
    request.responseType = 'arraybuffer';
    request.onload = () => request.response?.byteLength ? resolve(request.response) : reject(new Error(`${address}: empty`));
    request.onerror = () => reject(new Error(`${address}: unreachable`));
    request.send();
  }));
}

async function load(id) {
  const parsed = parseCharacterGlb(await bytesOf(url(id)));
  const [map, normalMap] = await Promise.all([decodeTexture(parsed.baseColor, THREE.SRGBColorSpace), decodeTexture(parsed.normal, THREE.NoColorSpace)]);
  assets.set(id, { ...parsed, map, normalMap });
}

// Fetch and decode every character model once; resolves when all are ready.
export function preloadCharacterModels() {
  loading ??= Promise.all(CHARACTER_MODELS.filter(id => !assets.has(id)).map(load)).catch(error => { loading = null; throw error; });
  return loading;
}
export const characterModelsReady = () => CHARACTER_MODELS.every(id => assets.has(id));

// Synchronous, from disk, when running under Node without a DOM (tests, tools).
function loadFromDisk(id) {
  const fs = globalThis.process?.getBuiltinModule?.('node:fs');
  if (!fs) return false;
  // Through a variable, so the bundler does not copy the GLBs into its assets.
  const relative = ['..', '..', 'public', 'models', 'characters', `${id}.glb`].join('/');
  const file = new URL(relative, import.meta.url);
  const data = fs.readFileSync(file);
  assets.set(id, { ...parseCharacterGlb(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)), map: null, normalMap: null });
  return true;
}

// The loaded model: { geometry (shared, clone before changing it), map,
// normalMap, roughness }.
export function characterModel(id) {
  if (!assets.has(id) && !(typeof window === 'undefined' && loadFromDisk(id)))
    throw new Error(`character model ${id} is not loaded: await preloadCharacterModels() first`);
  return assets.get(id);
}
