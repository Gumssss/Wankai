import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { disposeObject } from '../../../src/models/toy-kit.js';

const original = new URLSearchParams(location.search).get('source') === 'original';
const models = [
  { id: 'cr7', name: 'CR7', weapon: 'soccer-ball', label: 'Soccer ball' },
  { id: 'mean-girl', name: 'Mean Girl', weapon: 'crowned-heart', label: 'Crowned heart' },
  { id: 'maodie', name: 'Maodie', weapon: 'maodie-paw', label: 'Cat paw' },
];
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f5f0df');
scene.add(new THREE.HemisphereLight(0xfff7e6, 0x7c8b80, 2.4));
const light = new THREE.DirectionalLight(0xffead2, 2.6);
light.position.set(4, 6, 3);
scene.add(light);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.0, 0);
camera.position.set(5, 2.6, 4.7);
controls.update();
const floor = new THREE.Mesh(new THREE.CircleGeometry(3.8, 96), new THREE.MeshStandardMaterial({ color: 0xebe4cf, roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.004;
scene.add(floor);
const loader = new GLTFLoader();
const assets = new Map();
let active = null;
let revision = 0;
const address = id => `/models/characters/${id}.glb`;
const sourceRoot = '/.local/character-intake-2026-11-05/unpacked/';
const originals = {
  cr7: ['soccer-player', 'stylized_soccer_player_3d_model'],
  'soccer-ball': ['soccer-ball', 'soccer_ball_3d_model'],
  'mean-girl': ['meangirl', 'stylized_cartoon_character_3d_model'],
  'crowned-heart': ['crowned-heart', 'crowned_heart_3d_model'],
};
async function originalAsset(id) {
  let object;
  if (id === 'maodie' || id === 'maodie-paw') {
    const file = id === 'maodie' ? 'Maodie_Idle_Optimized.glb' : 'Catpaw_Optimized.glb';
    object = (await loader.loadAsync(`${sourceRoot}maodie/Maodie_optimized/${file}`)).scene;
  } else {
    const [folder, name] = originals[id];
    const base = `${sourceRoot}${folder}/${name}`;
    object = await new OBJLoader().loadAsync(`${base}.obj`, event => {
      if (event.total) document.querySelector('#status').textContent = `Loading original ${id} · ${Math.round(event.loaded / event.total * 100)}%`;
    });
    const textures = new THREE.TextureLoader();
    const [map, normalMap, roughnessMap, metalnessMap] = await Promise.all([
      textures.loadAsync(`${base}_basecolor.jpg`), textures.loadAsync(`${base}_normal.png`),
      textures.loadAsync(`${base}_roughness.png`), textures.loadAsync(`${base}_metallic.png`),
    ]);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, metalnessMap, roughness: 1, metalness: 1 });
    object.traverse(part => { if (part.isMesh) part.material = material; });
  }
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const height = id === 'soccer-ball' ? 0.92 : id === 'crowned-heart' ? 1.05 : id === 'maodie-paw' ? 1.10 : 1.85;
  const placement = new THREE.Group();
  object.position.add(new THREE.Vector3(-center.x, -box.min.y, -center.z));
  placement.add(object);
  placement.scale.setScalar(height / (box.max.y - box.min.y));
  placement.rotation.y = Math.PI / 2;
  return placement;
}
async function asset(id) {
  if (original) return originalAsset(id);
  if (!assets.has(id)) assets.set(id, loader.loadAsync(address(id)).then(gltf => gltf.scene));
  return (await assets.get(id)).clone(true);
}
export async function select(id) {
  const choice = models.find(model => model.id === id);
  const current = ++revision;
  document.querySelector('#status').textContent = 'Loading prepared model…';
  const [body, weapon] = await Promise.all([asset(id), asset(choice.weapon)]);
  if (current !== revision) return;
  if (active) {
    active.removeFromParent();
    if (original) disposeObject(active);
  }
  active = new THREE.Group();
  body.position.z = -0.65;
  weapon.position.set(0, 0.4, 1.0);
  active.add(body, weapon);
  scene.add(active);
  document.querySelector('#status').textContent = `${choice.name} + ${choice.label}${original ? ' · ORIGINAL FILES' : ''}`;
  document.querySelector('#caption').textContent = original
    ? 'Original supplied geometry, colours and material maps. Display scale and orientation adjusted for viewing.'
    : 'Prepared model inspection · standard W/S + A/D controls selected · no F skill';
  for (const button of document.querySelectorAll('nav button')) button.setAttribute('aria-pressed', button.dataset.id === id);
  window.__modelReview = { id, ready: true, body, weapon };
}
for (const choice of models) {
  const button = document.createElement('button');
  button.textContent = choice.name;
  button.dataset.id = choice.id;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => select(choice.id).catch(error => { document.querySelector('#status').textContent = error.message; }));
  document.querySelector('#choices').append(button);
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
if (original) {
  document.querySelector('h1').textContent = 'ORIGINAL DRIVE MODELS';
  document.querySelector('header p').textContent = 'Actual files from your Drive folder · drag to rotate · wheel to zoom';
}
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
select('cr7').catch(error => { document.querySelector('#status').textContent = error.message; });
