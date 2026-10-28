import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box3, Group, Vector3, PlaneGeometry, Mesh, ShadowMaterial, PCFShadowMap, ACESFilmicToneMapping } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveLoadout, loadoutKey } from './loadouts.js';
import { CHARACTERS } from './character-catalog.js';
import { makePlayer, staffFrame, v3 } from './physics.js';
import { setWeaponRotation } from './weapon-visuals.js';
import { buildCharacter } from './models/characters.js';
import { buildWeapon } from './models/weapons.js';
import { disposeObject } from './models/toy-kit.js';
import { preloadCharacterModels, characterModelsReady } from './models/character-assets.js';

// Turntable preview of a draft loadout, built from the same models as the arena.
function Preview({ selection, id }) {
  const { camera, size, gl, invalidate } = useThree();
  const controls = useRef(null);
  const built = useMemo(() => {
    const root = new Group(), character = CHARACTERS[selection.characterId];
    const full = selection.weaponId ? resolveLoadout(selection) : null;
    const loadout = full ?? { characterId: selection.characterId, weaponId: character.weaponIds?.[0] ?? 'sword' };
    // Every character shows its weapon in the same raised pose beside it.
    const player = makePlayer(id, loadout);
    player.p = v3(0, character.bodyFloor, 0);
    player.phi = player.bodyYaw = 0;
    player.theta = 0.82;
    const body = buildCharacter(loadout, id);
    body.root.position.set(player.p.x, player.p.y, player.p.z);
    root.add(body.root);
    if (full) {
      const holder = new Group(), weapon = buildWeapon(full.weaponId, id);
      holder.position.copy(staffFrame(player, 0).point);
      setWeaponRotation(holder.quaternion, player.theta, player.phi);
      holder.add(weapon.root);
      root.add(holder);
    }
    root.traverse(object => { if (object.isMesh && !object.userData.outline) object.castShadow = true; });
    return { root, body, player };
  }, [selection.characterId, selection.weaponId, id]);
  useEffect(() => () => disposeObject(built.root), [built]);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enablePan = false; orbit.minDistance = 2; orbit.maxDistance = 22; orbit.maxPolarAngle = Math.PI * 0.49;
    orbit.autoRotate = true; orbit.autoRotateSpeed = 1.2;
    orbit.addEventListener('start', () => { orbit.autoRotate = false; });
    controls.current = orbit;
    return () => orbit.dispose();
  }, [camera, gl]);
  useEffect(() => {
    // Frame the whole silhouette from a three-quarter front view.
    built.root.updateMatrixWorld(true);
    const box = new Box3().setFromObject(built.root, true), center = box.getCenter(new Vector3());
    const direction = new Vector3(1, 0.3, 0.85).normalize();
    camera.position.copy(center).add(direction);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion), up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const tan = Math.tan(camera.fov * Math.PI / 360);
    let distance = 2;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new Vector3(x, y, z).sub(center);
      distance = Math.max(distance, p.dot(direction) + Math.abs(p.dot(right)) / (tan * size.width / size.height), p.dot(direction) + Math.abs(p.dot(up)) / tan);
    }
    controls.current.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, distance * 1.15);
    controls.current.update();
    invalidate();
  }, [built, camera, size.width, size.height, invalidate]);
  useFrame((state, delta) => {
    built.body.pose(built.player, state.clock.elapsedTime);
    controls.current?.update(delta);
  });
  return <primitive object={built.root} dispose={null} />;
}

export function LoadoutPreview({ selection, id = 0 }) {
  // The arena preloads the models before anything can open this; wait anyway.
  const [models, setModels] = useState(characterModelsReady);
  useEffect(() => {
    if (models) return;
    let live = true;
    preloadCharacterModels().then(() => { if (live) setModels(true); }, () => {});
    return () => { live = false; };
  }, [models]);
  const floor = useMemo(() => {
    const mesh = new Mesh(new PlaneGeometry(100, 100), new ShadowMaterial({ opacity: 0.16 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.015;
    mesh.receiveShadow = true;
    return mesh;
  }, []);
  useEffect(() => () => { floor.geometry.dispose(); floor.material.dispose(); }, [floor]);
  return <div className="loadout-model-canvas">
    <Canvas shadows dpr={[1, 1.5]} camera={{ position: [5, 3, 7], fov: 32, near: 0.01, far: 80 }} gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => { gl.shadowMap.type = PCFShadowMap; gl.toneMapping = ACESFilmicToneMapping; }}>
      <hemisphereLight args={[0xfff6e4, 0x9aa48a, 2.4]} />
      <directionalLight position={[4, 7, 4]} intensity={2.6} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-near={0.1} shadow-camera-far={30}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-0.0002} shadow-normalBias={0.035} />
      <directionalLight position={[-3, 3, -4]} intensity={0.8} color={0xcfe6ff} />
      <primitive object={floor} dispose={null} />
      {models && <Preview key={loadoutKey(selection)} selection={selection} id={id} />}
    </Canvas>
  </div>;
}
