import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap, Vector3 } from 'three';
import { ArenaView } from './scene.js';
import { createDeathPortraits } from './death-portrait.js';
import { loadoutKey } from './loadouts.js';
import { cameraYaw } from './free-camera.js';
import { preloadCharacterModels, characterModelsReady } from './models/character-assets.js';

// The imported character models start downloading as soon as the game loads;
// the arena (and the loading screen) waits for them.
const modelsLoading = preloadCharacterModels();
modelsLoading.catch(() => {});

// States in which the mouse steers the view and should stay captured.
export const LOOK_STATES = new Set(['countdown', 'playing']);

// Pointer lock with raw (unaccelerated) mouse input where the platform allows it.
// Overlapping requests make Chromium reject the lock, so only one is in flight.
let lookPending = false;
export function requestLook(canvas) {
  if (!canvas?.requestPointerLock || lookPending || document.pointerLockElement === canvas) return;
  lookPending = true;
  const done = () => { lookPending = false; };
  const plain = () => Promise.resolve(canvas.requestPointerLock()).catch(() => {}).finally(done);
  try {
    Promise.resolve(canvas.requestPointerLock({ unadjustedMovement: true })).then(done, error => {
      // Raw input is not supported everywhere; fall back to the ordinary lock.
      if (error?.name === 'NotSupportedError') plain(); else done();
    });
  } catch { plain(); }
}

function ArenaScene({ session, loadouts, skin, sensitivity, invertY }) {
  const [first, second] = loadouts;
  const { gl, scene, size } = useThree();
  const view = useMemo(() => new ArenaView(gl, null, first, second, skin), [gl, first, second, skin]);
  const deathPortraits = useRef(null);
  useEffect(() => {
    const portraits = createDeathPortraits(scene, [first, second]);
    deathPortraits.current = portraits;
    return () => { portraits.dispose(); deathPortraits.current = null; };
  }, [scene, first, second]);
  useEffect(() => { scene.fog = view.fog; return () => { scene.fog = null; }; }, [scene, view]);
  useEffect(() => { view.sensitivity = sensitivity; view.invertY = invertY; }, [view, sensitivity, invertY]);
  const revision = useRef(session.visualRevision);
  const point = useMemo(() => new Vector3(), []);
  const headingForward = useMemo(() => new Vector3(), []);
  const headingRight = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    session.view = view;
    return () => { if (session.view === view) delete session.view; };
  }, [session, view]);

  useEffect(() => { view.resize(size.width, size.height); }, [view, size.width, size.height]);

  useEffect(() => {
    const onContextLost = event => { event.preventDefault(); session.contextLost(); };
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
      view.dispose();
    };
  }, [gl, session, view]);

  // Mouse free-look: click the arena to capture the pointer, then any mouse
  // movement turns the camera (and the body follows it). Wheel zooms.
  useEffect(() => {
    const canvas = gl.domElement;
    const locked = () => document.pointerLockElement === canvas;
    const down = event => {
      if (event.button !== 0 || !LOOK_STATES.has(session.state) || session.menuOpen || locked()) return;
      requestLook(canvas);
    };
    const move = event => { if (locked()) view.orbit(event.movementX, event.movementY); };
    const wheel = event => { if (session.state === 'lobby') return; event.preventDefault(); view.zoom(event.deltaY); };
    // Leaving pointer lock (Esc, Alt+Tab) during a match opens the menu.
    const change = () => { if (!locked() && LOOK_STATES.has(session.state) && !session.menuOpen) session.pause(); };
    canvas.addEventListener('pointerdown', down);
    document.addEventListener('mousemove', move);
    document.addEventListener('pointerlockchange', change);
    canvas.addEventListener('wheel', wheel, { passive: false });
    return () => {
      canvas.removeEventListener('pointerdown', down);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('pointerlockchange', change);
      canvas.removeEventListener('wheel', wheel);
      if (locked()) document.exitPointerLock();
    };
  }, [gl, session, view]);

  useFrame((_, delta) => {
    const impacts = session.tick(delta);
    const world = session.world;
    deathPortraits.current?.update(world.players, world.winner, session.state, Math.min(delta, 0.06));
    const mode = session.state === 'lobby' ? 'lobby' : session.state === 'result' && world.winner >= 0 ? 'victory' : 'match';
    if (revision.current !== session.visualRevision) {
      view.clearEffects();
      view.resetCamera();
      revision.current = session.visualRevision;
    }
    for (const event of impacts) {
      view.impact(event);
      // After teleporting behind the opponent, turn the view to face them.
      if (event.type === 'skill' && event.skill === 'twist' && event.player === session.localPlayerId && event.to) view.faceTowards(event.to.face);
    }
    const effectDelta = session.state === 'paused' ? 0 : Math.min(delta, 0.06);
    view.update(world.players, effectDelta, { active: session.state === 'playing' || session.state === 'result', cameraDt: Math.min(delta, 0.06),
      view: mode, localPlayerId: session.localPlayerId, winner: world.winner, projectiles: world.projectiles || [] });
    session.localFaceYaw = mode === 'match' ? cameraYaw(view.followCamera) : null;
    // Hand the cursor back for menus, results and pause.
    if ((!LOOK_STATES.has(session.state) || session.menuOpen) && document.pointerLockElement === gl.domElement) document.exitPointerLock();

    const activeCamera = view.activeCamera(mode);
    gl.setViewport(0, 0, size.width, size.height);
    gl.render(scene, activeCamera);

    if (mode === 'match') {
      const arrow = document.getElementById('staff-heading-arrow');
      const player = world.players[session.localPlayerId];
      if (arrow && player) {
        headingForward.set(0, 0, -1).applyQuaternion(activeCamera.quaternion).setY(0).normalize();
        headingRight.set(1, 0, 0).applyQuaternion(activeCamera.quaternion).setY(0).normalize();
        const x = Math.cos(player.phi), z = Math.sin(player.phi);
        const angle = Math.atan2(x * headingRight.x + z * headingRight.z, x * headingForward.x + z * headingForward.z);
        arrow.style.transform = `rotate(${angle}rad)`;
      }
    }
    const viewport = { x: 0, width: size.width, height: size.height };
    for (const effect of session.effects) {
      const element = document.getElementById(`effect-${effect.id}`);
      if (!element) continue;
      const followed = effect.follow != null ? world.players[effect.follow]?.p : null;
      const rise = (effect.maxLife - effect.life) * (effect.text ? 0.35 : 1.4);
      if (followed) point.set(followed.x, followed.y + 1.9 + rise, followed.z);
      else point.set(effect.point.x, effect.point.y + 0.5 + rise, effect.point.z);
      const screen = view.project(point, activeCamera, viewport);
      element.style.visibility = screen.visible ? 'visible' : 'hidden';
      element.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-50%)`;
      element.style.opacity = String(Math.min(1, effect.life * 3));
    }
  }, 1);

  return <>
    <primitive object={view.arena} dispose={null} />
    <primitive object={view.actors} dispose={null} />
    <primitive object={view.effectsRoot} dispose={null} />
  </>;
}

export function ArenaCanvas({ session, loadouts, skin, onReady, sensitivity = 1, invertY = false }) {
  const key = loadouts.map(loadoutKey).join('|');
  const selections = useMemo(() => loadouts.map(p => ({ ...p })), [key]);
  const [models, setModels] = useState(characterModelsReady);
  const [created, setCreated] = useState(false);
  const readyCalled = useRef(false);
  const latestReady = useRef(onReady);
  latestReady.current = onReady;
  useEffect(() => {
    if (models) return;
    let live = true;
    preloadCharacterModels().then(() => { if (live) setModels(true); }, error => {
      if (!live) return;
      console.error(error);
      session.error = '角色模型无法载入，请重新加载。';
      session.publish();
      latestReady.current();
    });
    return () => { live = false; };
  }, [models, session]);
  // Ready once the canvas exists and the fighters can be built.
  useEffect(() => {
    if (!models || !created || readyCalled.current) return;
    readyCalled.current = true;
    latestReady.current();
  }, [models, created]);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        session.renderer = gl;
        gl.shadowMap.type = PCFShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
        gl.domElement.setAttribute('aria-label', '三维竞技场');
        setCreated(true);
      }}
    >
      <color attach="background" args={[0xf3e9d4]} />
      {models && <ArenaScene session={session} loadouts={selections} skin={skin} sensitivity={sensitivity} invertY={invertY} />}
    </Canvas>
  );
}
