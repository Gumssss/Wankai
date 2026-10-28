import * as THREE from 'three';
import { createKit, geometry as G, PALETTE as C } from './toy-kit.js';

// Floating weapons are authored along +Y with the butt at the origin and the
// leading (W-swing) side on +X, in the same local space as their contact
// capsules (physics.js WEAPONS), so the visible blade, head and shaft sit
// exactly on what collides.
const ring = (kit, parent, mat, y, radius, tube = 0.022) =>
  kit.part(parent, G.torus(radius, tube), mat, { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
const metal = (kit, color, extra = {}) => kit.material(color, { metalness: 0.4, roughness: 0.32, sheen: 0, clearcoat: 0.3, ...extra });

// A flat blade outline in the weapon's X/Y plane, given its thickness.
function blade(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function yellowStaff(kit, root) {
  const yellow = kit.material(C.yellow), deep = kit.material(C.yellowDeep);
  kit.between(root, [0, 0.115, 0], [0, 1.685, 0], 0.115, yellow);
  for (const y of [0.45, 1.35]) ring(kit, root, deep, y, 0.117, 0.03);
}

function sword(kit, root, id) {
  const wood = kit.material(C.woodDark), steel = kit.material(0xece4cf), edge = kit.material(C.steelDark);
  const gold = metal(kit, C.gold), guard = kit.material(C.players[id]);
  kit.part(root, G.cylinder(0.05, 0.055, 0.36), wood, { position: [0, 0.23, 0] });
  kit.part(root, G.sphere(), gold, { position: [0, 0.04, 0], scale: 0.075 });
  kit.between(root, [-0.105, 0.425, 0], [0.115, 0.425, 0], 0.05, guard);
  kit.part(root, G.box(0.17, 0.88, 0.05, 0.025), steel, { position: [0, 0.89, 0] });
  kit.part(root, G.box(0.03, 0.7, 0.056, 0.012), edge, { position: [0, 0.85, 0], outline: 0 });
  kit.part(root, G.box(0.12, 0.12, 0.05, 0.02), steel, { position: [0, 1.365, 0], rotation: [0, 0, Math.PI / 4] });
}

function polearm(kit, root, id) {
  // 偃月刀: red lacquered pole, gold collar, a broad crescent blade whose tip
  // curls back over the straight spine, a spine barb and a tassel.
  const lacquer = kit.material(0x8a3426), gold = metal(kit, C.gold), steel = metal(kit, 0xcfd7d9);
  const spine = metal(kit, 0x8f9a9c), tassel = kit.material(C.players[id], { sheen: 0.6 });
  kit.part(root, G.sphere(), gold, { position: [0, 0.05, 0], scale: [0.075, 0.06, 0.075] });
  kit.between(root, [0, 0.05, 0], [0, 1.42, 0], 0.06, lacquer);
  for (const y of [0.32, 0.5, 0.68]) ring(kit, root, gold, y, 0.062, 0.016);
  kit.part(root, G.cylinder(0.085, 0.095, 0.1), gold, { position: [0, 1.38, 0] });
  kit.part(root, G.torus(0.088, 0.02), gold, { position: [0, 1.44, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
  for (const z of [-0.025, 0.025]) kit.part(root, G.cone(0.03, 0.2, 8), tassel, { position: [-0.07, 1.26, z], rotation: [0, 0, 0.2 + Math.PI], outline: 0 });
  const shape = new THREE.Shape();
  shape.moveTo(-0.035, 1.42);
  shape.lineTo(-0.035, 1.86);
  shape.quadraticCurveTo(-0.04, 2.02, -0.07, 2.12);
  shape.quadraticCurveTo(0.08, 2.05, 0.17, 1.86);
  shape.quadraticCurveTo(0.25, 1.66, 0.18, 1.5);
  shape.quadraticCurveTo(0.13, 1.42, 0.05, 1.42);
  shape.lineTo(-0.035, 1.42);
  kit.part(root, blade(shape, 0.04), steel, { outline: 0.015 });
  // A darker fuller along the spine.
  kit.part(root, G.box(0.03, 0.4, 0.07, 0.01), spine, { position: [-0.01, 1.66, 0], outline: 0 });
  kit.between(root, [-0.035, 1.52, 0], [-0.15, 1.6, 0], 0.03, steel, { outline: 0.012 });
  kit.part(root, G.cone(0.03, 0.08, 10), steel, { position: [-0.17, 1.63, 0], rotation: [0, 0, 0.95], outline: 0 });
}

function hammer(kit, root, id) {
  // 铁战锤: the head sits across the haft — flat striking face forward, a
  // curved pick behind and a short spike on top — with iron langets below.
  const wood = kit.material(C.wood), leather = kit.material(0x5b3b26, { roughness: 0.85 });
  const iron = metal(kit, 0x9aa3a5), ironDark = metal(kit, 0x6f7a7c), gold = metal(kit, C.gold), wrap = kit.material(C.players[id]);
  kit.part(root, G.sphere(), ironDark, { position: [0, 0.08, 0], scale: 0.08 });
  kit.between(root, [0, 0.08, 0], [0, 1.62, 0], 0.062, wood);
  for (const y of [0.2, 0.3, 0.4, 0.5]) ring(kit, root, leather, y, 0.064, 0.018);
  ring(kit, root, wrap, 0.6, 0.066, 0.02);
  for (const z of [-1, 1]) kit.part(root, G.box(0.05, 0.36, 0.02, 0.008), ironDark, { position: [0, 1.22, z * 0.062], outline: 0 });
  kit.part(root, G.cylinder(0.15, 0.15, 0.54, 28), iron, { position: [0.03, 1.52, 0], rotation: [0, 0, Math.PI / 2] });
  kit.part(root, G.cylinder(0.17, 0.165, 0.07, 28), ironDark, { position: [0.27, 1.52, 0], rotation: [0, 0, Math.PI / 2] });
  for (const x of [-0.15, 0.17]) kit.part(root, G.torus(0.152, 0.018), gold, { position: [x, 1.52, 0], rotation: [0, Math.PI / 2, 0], outline: 0 });
  kit.part(root, G.cone(0.075, 0.3, 14), ironDark, { position: [-0.38, 1.49, 0], rotation: [0, 0, Math.PI / 2 + 0.24] });
  kit.part(root, G.cone(0.05, 0.24, 12), ironDark, { position: [0, 1.74, 0] });
}

function axe(kit, root, id) {
  // 战斧: a crescent bit on the leading side, a socket collar and a back spike.
  const wood = kit.material(C.woodDark), steel = metal(kit, 0xc3ced1), cheek = metal(kit, 0x7f8b8d), wrap = kit.material(C.players[id]);
  kit.part(root, G.sphere(), cheek, { position: [0, 0.05, 0], scale: 0.07 });
  kit.between(root, [0, 0.05, 0], [0, 1.72, 0], 0.056, wood);
  for (const y of [0.22, 0.34, 0.46]) ring(kit, root, wrap, y, 0.058, 0.018);
  kit.part(root, G.cylinder(0.082, 0.082, 0.34, 20), cheek, { position: [0, 1.44, 0] });
  const shape = new THREE.Shape();
  shape.moveTo(0.05, 1.53);
  shape.lineTo(0.24, 1.6);
  shape.quadraticCurveTo(0.3, 1.7, 0.33, 1.79);
  shape.quadraticCurveTo(0.48, 1.44, 0.33, 1.09);
  shape.quadraticCurveTo(0.3, 1.18, 0.24, 1.28);
  shape.lineTo(0.05, 1.35);
  shape.lineTo(0.05, 1.53);
  kit.part(root, blade(shape, 0.05), steel, { outline: 0.015 });
  kit.part(root, G.box(0.12, 0.2, 0.075, 0.02), cheek, { position: [0.13, 1.44, 0], outline: 0 });
  kit.part(root, G.cone(0.055, 0.2, 12), cheek, { position: [-0.14, 1.44, 0], rotation: [0, 0, Math.PI / 2] });
}

function mace(kit, root, id) {
  // 狼牙棒: a stout club whose barrel head is studded with iron spikes.
  const wood = kit.material(0x9a6a3c), woodDark = kit.material(0x6e4526), iron = metal(kit, 0x7c8587), wrap = kit.material(C.players[id]);
  kit.part(root, G.torus(0.05, 0.018), iron, { position: [0, 0.05, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
  kit.between(root, [0, 0.06, 0], [0, 1.2, 0], 0.06, wood);
  for (const y of [0.2, 0.32, 0.44]) ring(kit, root, wrap, y, 0.062, 0.018);
  kit.part(root, G.sphere(), woodDark, { position: [0, 1.46, 0], scale: [0.23, 0.29, 0.23] });
  for (const y of [1.28, 1.64]) kit.part(root, G.torus(0.17, 0.025), iron, { position: [0, y, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
  const count = 30, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i + 0.5) / count * 2, r = Math.sqrt(1 - y * y), a = i * golden;
    if (y < -0.55) continue;
    const normal = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    const surface = new THREE.Vector3(normal.x * 0.23, 1.46 + normal.y * 0.29, normal.z * 0.23);
    const spike = kit.part(root, G.cone(0.032, 0.11, 8), iron, { position: surface.addScaledVector(normal, 0.04).toArray(), outline: 0 });
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }
}

function pan(kit, root) {
  // 平底锅: a cast-iron skillet with a wooden grip; the round pan faces the swing.
  const iron = metal(kit, 0x3a3f42, { metalness: 0.5, roughness: 0.45 }), inside = kit.material(0x24282a, { roughness: 0.6, sheen: 0 });
  const wood = kit.material(C.woodDark), rivet = metal(kit, 0xb9c2c0);
  kit.between(root, [0, 0.04, 0], [0, 0.42, 0], 0.055, wood);
  kit.part(root, G.torus(0.03, 0.012), rivet, { position: [0, 0.07, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
  kit.between(root, [0, 0.42, 0], [0, 0.78, 0], 0.038, iron);
  kit.part(root, G.cylinder(0.4, 0.36, 0.07, 40), iron, { position: [0, 1.12, 0], rotation: [0, 0, Math.PI / 2] });
  kit.part(root, G.cylinder(0.35, 0.35, 0.02, 40), inside, { position: [0.03, 1.12, 0], rotation: [0, 0, Math.PI / 2], outline: 0 });
  kit.part(root, G.torus(0.385, 0.028, Math.PI * 2), iron, { position: [0.03, 1.12, 0], rotation: [0, Math.PI / 2, 0], outline: 0 });
  for (const z of [-0.05, 0.05]) kit.part(root, G.lowSphere(), rivet, { position: [0, 0.76, z], scale: 0.025, outline: 0 });
}

// A cheerful decal for the delivery box: yellow badge, kangaroo face, 外卖.
function boxDecal() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#f5c518'; c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(128, 104, 66, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#f5c518';
  c.beginPath(); c.ellipse(100, 58, 13, 32, -0.25, 0, Math.PI * 2); c.ellipse(156, 58, 13, 32, 0.25, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(128, 112, 42, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#30372e';
  c.beginPath(); c.arc(112, 104, 6, 0, Math.PI * 2); c.arc(144, 104, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#7c2f15'; c.beginPath(); c.ellipse(128, 124, 10, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#30372e'; c.font = 'bold 54px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('外卖', 128, 212);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function takeoutBox(kit, root) {
  // 美团外卖盒: the insulated yellow delivery box itself, no handle — a padded
  // box with a darker lid band, corner bumpers, a carry strap and the badge.
  const yellow = kit.material(0xf5c518, { roughness: 0.55 }), band = kit.material(0xd9a10c), strap = kit.material(0x2f3437);
  kit.part(root, G.box(0.6, 0.8, 0.8, 0.09), yellow, { position: [0, 0.4, 0] });
  kit.part(root, G.box(0.62, 0.09, 0.82, 0.035), band, { position: [0, 0.68, 0], outline: 0 });
  kit.part(root, G.box(0.62, 0.06, 0.82, 0.025), band, { position: [0, 0.12, 0], outline: 0 });
  kit.part(root, G.torus(0.09, 0.025, Math.PI), strap, { position: [0, 0.78, 0], scale: [1, 0.25, 1], outline: 0 });
  const decal = boxDecal();
  if (decal) {
    const material = kit.material(0xffffff, { map: decal, sheen: 0, clearcoat: 0.2 });
    for (const side of [-1, 1]) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), material);
      plane.position.set(side * 0.302, 0.4, 0);
      plane.rotation.y = side * Math.PI / 2;
      root.add(plane);
    }
  }
}

function catPaw(kit, root, id) {
  // 开心猫爪: one big tabby paw on a short furry wrist with a bow, the pink
  // toe beans and palm pad on the leading face that lands the swat.
  const fur = kit.material(0xe8e0d2, { roughness: 0.8, sheen: 0.6 }), tabby = kit.material(0x8d8070, { roughness: 0.8, sheen: 0.5 });
  const stripe = kit.material(0x5d554b, { roughness: 0.85, sheen: 0.3 }), bean = kit.material(0xf29aa6, { roughness: 0.45, sheen: 0.2, clearcoat: 0.3 });
  const bow = kit.material(C.players[id], { sheen: 0.6 });
  kit.between(root, [0, 0.05, 0], [0, 0.44, 0], 0.095, tabby);
  for (const y of [0.16, 0.27]) ring(kit, root, stripe, y, 0.094, 0.018);
  kit.part(root, G.torus(0.1, 0.028), bow, { position: [0, 0.38, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
  for (const z of [-1, 1]) kit.part(root, G.lowSphere(), bow, { position: [-0.1, 0.38, z * 0.06], scale: [0.03, 0.05, 0.06], rotation: [z * 0.5, 0, 0], outline: 0 });
  // The palm, broad across the swing, and four round toes across the tip.
  kit.part(root, G.sphere(), fur, { position: [0, 0.62, 0], scale: [0.23, 0.25, 0.35] });
  kit.part(root, G.lowSphere(), bean, { position: [0.2, 0.6, 0], scale: [0.055, 0.12, 0.17], outline: 0 });
  for (const z of [-0.21, -0.07, 0.07, 0.21]) {
    const y = Math.abs(z) > 0.1 ? 0.84 : 0.87;
    kit.part(root, G.sphere(), fur, { position: [0.02, y, z], scale: [0.12, 0.1, 0.085], outline: 0.014 });
    kit.part(root, G.lowSphere(), bean, { position: [0.125, y + 0.005, z], scale: [0.03, 0.05, 0.042], outline: 0 });
  }
}

const BUILDERS = { 'yellow-staff': yellowStaff, 'takeout-box': takeoutBox, 'happy-paws': catPaw, sword, polearm, hammer, axe, mace, pan };
export const FLOATING_WEAPONS = Object.freeze(Object.keys(BUILDERS));

export function buildWeapon(type, id = 0) {
  const builder = BUILDERS[type];
  if (!builder) throw new Error(`No floating weapon model: ${type}`);
  const kit = createKit(), root = new THREE.Group();
  root.name = `${type}-${id}`;
  builder(kit, root, id);
  return { root, kit, flash: amount => kit.flash(amount) };
}
