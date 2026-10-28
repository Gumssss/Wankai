import * as THREE from 'three';
import { buildCharacter } from './characters.js';
import { disposeObject } from './toy-kit.js';
import { characterModelsReady } from './character-assets.js';
import { makePlayer, v3 } from '../physics.js';

// UI portraits are rendered from the same models as the arena (the imported
// ones once preloaded; until then the caller shows its lettered disc), so
// menus, HUD and the 3D scene always agree. Rendered once per character,
// player colour and crop, then cached as data URLs.
const PORTRAIT_LOADOUT = {
  naiwa: { characterId: 'naiwa', weaponId: 'yellow-staff' },
  stickman: { characterId: 'stickman', weaponId: 'sword' },
  dudu: { characterId: 'dudu', weaponId: 'takeout-box' },
  'happy-cat': { characterId: 'happy-cat', weaponId: 'sword' },
};
const CROPS = {
  // Head and shoulders, looking slightly up at the face.
  bust: { width: 192, height: 192, target: [0, 0.66, 0], from: [3.2, 0.95, 1.5], span: 1.3 },
  // The whole character from a three-quarter front view, framed on its own
  // silhouette with a small margin (the picker buttons; 4:5 portrait).
  full: { width: 208, height: 260, from: [4.2, 0.9, 2.6], margin: 1.08 },
};
// The imported characters carry their heads higher: lift the bust aim.
const BUST_HEIGHT = { naiwa: 0.84, dudu: 0.84, 'happy-cat': 0.98 };
const FOV = 26;

// Distance along `direction` from the box centre at which every corner of
// `box` fits the camera's frame.
function fitDistance(box, direction, aspect, margin) {
  const center = box.getCenter(new THREE.Vector3()), tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const right = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize().negate();
  const up = new THREE.Vector3().crossVectors(right, direction).normalize().negate();
  let distance = 0;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new THREE.Vector3(x, y, z).sub(center), depth = p.dot(direction);
    distance = Math.max(distance, depth + Math.abs(p.dot(right)) * margin / (tan * aspect), depth + Math.abs(p.dot(up)) * margin / tan);
  }
  return { center, distance };
}
const cache = new Map();
let renderer = null, failed = false;

function getRenderer() {
  if (renderer || failed) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch { failed = true; }
  return renderer;
}

export function characterPortrait(characterId, playerId = 0, crop = 'bust') {
  const key = `${characterId}:${playerId}:${crop}`;
  if (cache.has(key)) return cache.get(key);
  const gl = typeof document === 'undefined' ? null : getRenderer();
  const loadout = PORTRAIT_LOADOUT[characterId];
  if (!gl || !loadout || !characterModelsReady()) return null;
  const settings = CROPS[crop] || CROPS.bust;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e4, 0x9aa48a, 2.4));
  const key1 = new THREE.DirectionalLight(0xffe9c8, 2.6);
  key1.position.set(4, 6, 3);
  scene.add(key1);
  const rim = new THREE.DirectionalLight(0xcfe6ff, 0.9);
  rim.position.set(-3, 3, -4);
  scene.add(rim);
  const player = makePlayer(playerId, loadout);
  player.p = v3(0, 0, 0);
  player.phi = player.bodyYaw = 0;
  player.theta = 0.55;
  const character = buildCharacter(loadout, playerId);
  character.pose(player, 0.3);
  scene.add(character.root);
  const aspect = settings.width / settings.height, camera = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 50);
  const direction = new THREE.Vector3(...settings.from).normalize();
  let target, distance;
  if (settings.margin) {
    character.root.updateMatrixWorld(true);
    ({ center: target, distance } = fitDistance(new THREE.Box3().setFromObject(character.root), direction, aspect, settings.margin));
  } else {
    target = new THREE.Vector3(...settings.target);
    if (BUST_HEIGHT[characterId]) target.y = BUST_HEIGHT[characterId];
    distance = settings.span / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  }
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  gl.setSize(settings.width, settings.height, false);
  gl.setClearColor(0x000000, 0);
  gl.render(scene, camera);
  const url = gl.domElement.toDataURL('image/png');
  disposeObject(scene);
  cache.set(key, url);
  return url;
}
