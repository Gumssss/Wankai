import * as THREE from 'three';
import { createKit, geometry as G, PALETTE as C } from './toy-kit.js';
import { SIDES, clamp, skillBlend } from './character-parts.js';
import { naiwa } from './characters/naiwa.js';
import { dudu } from './characters/dudu.js';
import { happyCat } from './characters/happy-cat.js';
import { resolveLoadout } from '../loadouts.js';
export { preloadCharacterModels, characterModelsReady } from './character-assets.js';

// Every character is built in the fighter frame: the returned root sits on the
// body pivot (bodyFloor above the floor) and the face looks along +X. Inside,
// a host group drops back to floor level so each design is authored with its
// feet at y = 0 and its silhouette inside the catalog bounds.
//
// 奶蛙, 胆子肥嘟嘟 and 开心小猫 are the user's imported models
// (character-assets.js, preloaded once before the arena renders), one module
// each in ./characters/; 火柴人 is drawn flat like the 2D cartoon.

/* ---------------- 火柴人 ---------------- */
// Shirt colours: the players' red and teal pushed to the cartoon's bright
// flat fills (the reference wears a mint-green or a red shirt).
const STICK = { skin: 0xf6c491, ink: 0x161616, shirts: [0xd23f3a, 0x27d3a2], head: 0.4, headY: 1.38 };
// The shirt is a plain block that flares a little towards the hem.
let shirtGeometry = null;
const shirtShape = () => {
  if (shirtGeometry) return shirtGeometry;
  shirtGeometry = G.box(0.3, 0.54, 0.6, 0.06);
  const position = shirtGeometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const t = (position.getY(i) + 0.27) / 0.54;
    position.setZ(i, position.getZ(i) * (1.08 - 0.16 * t));
    position.setX(i, position.getX(i) * (1.04 - 0.08 * t));
  }
  shirtGeometry.computeVertexNormals();
  return shirtGeometry;
};

function stickman(kit, id) {
  // 火柴人, drawn like 《氰化欢乐秀》 (reference: image.png): flat unlit fills
  // with thin even ink lines — a huge peach round head resting straight on a
  // bright plain shirt, line arms and legs with no hands or feet, two big dot
  // eyes and a short straight mouth set a little off-centre.
  const body = new THREE.Group(), r = STICK.head;
  const shirt = kit.flat(STICK.shirts[id] ?? STICK.shirts[0]), head = kit.flat(STICK.skin), ink = kit.flat(STICK.ink);
  const legs = SIDES.map(side => {
    const leg = new THREE.Group();
    leg.position.set(0, 0.53, side * 0.13);
    body.add(leg);
    kit.between(leg, [0, 0, 0], [0.03, -0.51, side * 0.02], 0.022, ink, { outline: 0 });
    return leg;
  });
  kit.part(body, shirtShape(), shirt, { position: [0, 0.77, 0], outline: 0.026 });
  const arms = SIDES.map(side => {
    const arm = new THREE.Group();
    arm.position.set(0, 0.96, side * 0.29);
    body.add(arm);
    kit.between(arm, [0, 0, 0], [0.1, -0.36, side * 0.08], 0.02, ink, { outline: 0 });
    arm.userData.side = side;
    return arm;
  });
  kit.part(body, G.sphere(), head, { position: [0, STICK.headY, 0], scale: r, outline: 0.02 });
  // Face features sit on the sphere: x is pushed out to the surface.
  const onHead = (y, z, lift = 0) => [Math.sqrt(r * r - y * y - z * z) + lift, STICK.headY + y, z];
  for (const side of SIDES) kit.part(body, G.lowSphere(), ink, { position: onHead(0.05, side * 0.125, -0.006), scale: [0.016, 0.043, 0.043], outline: 0 });
  kit.between(body, onHead(-0.1, -0.075, 0.001), onHead(-0.105, 0.045, 0.001), 0.0085, ink, { outline: 0 });

  const twist = skillBlend('twist');
  let step = 0, last = null;
  return { body, pose: (player, time) => {
    const dt = last === null ? 0 : clamp(time - last, 0, 0.1);
    last = time;
    const speed = Math.hypot(player.v?.x ?? 0, player.v?.z ?? 0);
    step += dt * (4 + speed * 2.5);
    const stride = Math.min(1, speed / 3) * 0.45;
    legs.forEach((leg, index) => { leg.rotation.z = Math.sin(step + index * Math.PI) * stride; });
    for (const arm of arms) arm.rotation.z = Math.sin(time * 1.6 + arm.userData.side) * 0.08 - Math.sin(step) * stride * 0.6 * arm.userData.side;
    // Arriving from the teleport: one quick pirouette with a squash.
    const weight = twist(player, time);
    const progress = player.skillActive && player.skill === 'twist' ? 1 - player.skillTime / 0.45 : 1;
    body.rotation.y = weight * (1 - progress) * Math.PI * 2;
    body.scale.set(1 + weight * 0.08, 1 - weight * 0.1, 1 + weight * 0.08);
  } };
}

export function buildCharacter(selection, id = 0) {
  const loadout = resolveLoadout(selection);
  const kit = createKit(), root = new THREE.Group(), host = new THREE.Group();
  host.position.y = -loadout.character.bodyFloor;
  root.add(host);
  root.name = `${loadout.characterId}-${id}`;
  let built;
  if (loadout.characterId === 'naiwa') built = naiwa(kit);
  else if (loadout.characterId === 'dudu') built = dudu(kit);
  else if (loadout.characterId === 'happy-cat') built = happyCat(kit);
  else built = stickman(kit, id);
  host.add(built.body);
  return { root, kit, face: built.face,
    pose(player, time = 0) { built.pose(player, time + id * 1.7); kit.flash(player.hitFlash || 0); } };
}