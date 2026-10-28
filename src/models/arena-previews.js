import * as THREE from 'three';
import { buildArena } from '../arena.js';
import { ARENA_OBSTACLES } from '../arena-obstacles.js';
import { ARENA_SKINS } from '../arena-skins.js';
import { arenaPlacement } from '../arena-profile.js';
import { MATCH_ARENA_SCALE } from '../physics.js';
import { disposeObject } from './toy-kit.js';

// Setup-screen pictures of each arena, rendered from the real arena builder
// with the title-screen orbit view, so a card always shows what you will
// fight in. Rendered once per skin on demand and cached as JPEG data URLs.
const WIDTH = 640, HEIGHT = 360;
const cache = new Map();
let renderer = null;

function render(skin) {
  if (typeof document === 'undefined') return null;
  try {
    renderer ??= new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  } catch { return null; }
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const placement = arenaPlacement(MATCH_ARENA_SCALE);
  const rimHeight = ARENA_SKINS.find(entry => entry.id === skin)?.rimHeight ?? placement.weaponContactHeight;
  const arena = buildArena({ skin, radius: placement.radius, rimHeight, obstacles: ARENA_OBSTACLES, anisotropy: 4 });
  const scene = new THREE.Scene();
  scene.fog = arena.fog;
  scene.add(arena.group);
  const camera = new THREE.PerspectiveCamera(46, WIDTH / HEIGHT, 0.1, 320);
  const angle = -0.6;
  camera.position.set(Math.sin(angle) * 31, 13.5, Math.cos(angle) * 31);
  camera.lookAt(0, 0.5, 0);
  camera.updateMatrixWorld();
  arena.update(1 / 60, camera, null);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/jpeg', 0.86);
  disposeObject(arena.group);
  return url;
}

export const arenaPreview = skin => cache.get(skin) ?? null;

// Fills the cache one skin per idle slot so the screen stays responsive. One
// shared job serves every caller; onReady(skin, url) fires as each picture
// appears. Returns an unsubscribe function.
const listeners = new Set();
let running = false;
export function loadArenaPreviews(onReady) {
  listeners.add(onReady);
  if (!running) {
    running = true;
    const queue = ARENA_SKINS.map(skin => skin.id).filter(id => !cache.has(id));
    const next = () => {
      if (!queue.length) {
        running = false;
        if (renderer) { renderer.dispose(); renderer.forceContextLoss(); renderer = null; }
        return;
      }
      const skin = queue.shift(), url = render(skin);
      if (url) { cache.set(skin, url); for (const listener of listeners) listener(skin, url); }
      setTimeout(next, 30);
    };
    setTimeout(next, 120);
  }
  return () => listeners.delete(onReady);
}
