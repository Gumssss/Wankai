import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// One visual language for every character, weapon and prop: soft vinyl toys.
// Matte satin surfaces, saturated flat colours, rounded volumes and a thin
// dark ink outline. Everything is built in code from a handful of primitives.
export const PALETTE = Object.freeze({
  cream: 0xf3ead3, paper: 0xfbf6e8, ink: 0x30372e,
  players: Object.freeze([0xc4684f, 0x568d92]),
  yellow: 0xf6cf45, yellowDeep: 0xe2ad2b, belly: 0xfbe7a1,
  skin: 0xedc8a2, blush: 0xf09a8c, pink: 0xeea0a6,
  tan: 0xc98a45, brown: 0x7a4a2a, black: 0x2c2724, white: 0xfbf8f0,
  wood: 0xd9b27c, woodDark: 0xa4733f, steel: 0xb9c2c0, steelDark: 0x7f8a8a, gold: 0xe8b54a,
  grey: 0x9a9893, greyDark: 0x6f6c68,
});
const WHITE = new THREE.Color(0xffffff);
const OUTLINE = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });

export const geometry = {
  sphere: () => new THREE.SphereGeometry(1, 32, 22),
  lowSphere: () => new THREE.SphereGeometry(1, 16, 12),
  capsule: (radius, length) => new THREE.CapsuleGeometry(radius, Math.max(1e-4, length), 6, 16),
  cylinder: (top, bottom, height, segments = 24) => new THREE.CylinderGeometry(top, bottom, height, segments),
  box: (x, y, z, radius = 0.06) => new RoundedBoxGeometry(x, y, z, 3, Math.min(radius, x / 2, y / 2, z / 2)),
  cone: (radius, height, segments = 20) => new THREE.ConeGeometry(radius, height, segments),
  torus: (radius, tube, arc = Math.PI * 2) => new THREE.TorusGeometry(radius, tube, 12, 32, arc),
};

// Collects one instance's materials so hit flashes and disposal stay per fighter.
export function createKit() {
  const materials = [], colors = [], emissives = [];
  const register = mat => {
    materials.push(mat); colors.push(mat.color.clone()); emissives.push(mat.emissive?.clone() ?? null);
    return mat;
  };
  const material = (color, extra = {}) => register(new THREE.MeshPhysicalMaterial({ color, roughness: 0.58, metalness: 0, sheen: 0.4,
    sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.12, clearcoatRoughness: 0.55, ...extra }));
  // Unlit flat colour, for cartoon characters drawn like 2D animation.
  const flat = color => register(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  // A mesh with optional ink outline: a slightly larger back-faced copy.
  const part = (parent, geo, mat, { position, scale, rotation, quaternion, outline = 0.035, shadow = true } = {}) => {
    const mesh = new THREE.Mesh(geo, mat);
    if (position) mesh.position.set(...position);
    if (scale) Array.isArray(scale) ? mesh.scale.set(...scale) : mesh.scale.setScalar(scale);
    if (rotation) mesh.rotation.set(...rotation);
    if (quaternion) mesh.quaternion.copy(quaternion);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    if (outline > 0) {
      const ink = new THREE.Mesh(geo, OUTLINE);
      const s = mesh.scale;
      // Keep the ink line roughly even on squashed volumes.
      ink.scale.set(1 + outline / Math.max(s.x, 1e-3), 1 + outline / Math.max(s.y, 1e-3), 1 + outline / Math.max(s.z, 1e-3));
      ink.castShadow = false; ink.receiveShadow = false;
      ink.userData.outline = true;
      mesh.add(ink);
    }
    parent.add(mesh);
    return mesh;
  };
  // Capsule between two points, in the parent's frame.
  const between = (parent, a, b, radius, mat, options = {}) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const length = direction.length();
    const mesh = part(parent, geometry.capsule(radius, length), mat, { ...options,
      position: start.clone().add(end).multiplyScalar(0.5).toArray(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        length > 1e-6 ? direction.normalize() : new THREE.Vector3(0, 1, 0)) });
    return mesh;
  };
  // A pair of glossy cartoon eyes on a face pointing along +X.
  const eyes = (parent, { x, y, z, size = 1, shine = true }) => {
    const black = material(PALETTE.black, { roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0 });
    const white = material(PALETTE.white, { roughness: 0.3, sheen: 0 });
    for (const side of [-1, 1]) {
      part(parent, geometry.lowSphere(), black, { position: [x, y, side * z], scale: [0.05 * size, 0.1 * size, 0.075 * size], outline: 0 });
      if (shine) part(parent, geometry.lowSphere(), white, { position: [x + 0.035 * size, y + 0.035 * size, side * z - 0.02 * size], scale: 0.022 * size, outline: 0, shadow: false });
    }
  };
  // Vertex-coloured sculpts have a white base colour, so they flash through emission.
  const flash = amount => {
    for (let i = 0; i < materials.length; i++) {
      materials[i].color.copy(colors[i]).lerp(WHITE, amount * 0.65);
      if (emissives[i]) materials[i].emissive.copy(emissives[i]).lerp(WHITE, amount * 0.35);
    }
  };
  return { material, flat, part, between, eyes, flash, materials };
}

export function disposeObject(root) {
  const geometries = new Set(), mats = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) if (mat && mat !== OUTLINE) mats.add(mat);
  });
  for (const geo of geometries) geo.dispose();
  for (const mat of mats) { for (const value of Object.values(mat)) if (value?.isTexture && !value.userData.shared) value.dispose(); mat.dispose(); }
}
