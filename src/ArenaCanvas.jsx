import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaView } from './scene.js';
import {createDeathPortraits} from './death-portrait.js';
import { advanceLobbyCamera } from './lobby-camera.js';
import {resolveLoadout,loadoutKey} from './loadouts.js';
import { ARENA_PROFILE, ACTIVE_ARENA_STYLE } from './arena-profile.js';
import {loadArenaFloorTexture} from './arena-floor.js';
import {disposeModelResources} from './model-assets.js';

function ArenaEnvironment({ group }) { return <primitive object={group} dispose={null} />; }
function FighterModels({ group }) { return <primitive object={group} dispose={null} />; }
function ImpactEffects({ group }) { return <primitive object={group} dispose={null} />; }

function ArenaScene({ session, loadouts, intro, onIntroComplete }) {
  const [first,second]=loadouts;
  const { gl, camera, scene, size } = useThree();
  const view = useMemo(() => new ArenaView(gl, camera, first, second), [gl, camera, first, second]);
  const deathPortraits = useRef(null);
  useEffect(() => {
    const portraits = createDeathPortraits(scene, [first, second], import.meta.env.BASE_URL);
    deathPortraits.current = portraits;
    return () => { portraits.dispose(); deathPortraits.current = null; };
  }, [scene, first, second]);
  const revision = useRef(session.visualRevision);
  const point = useMemo(() => new Vector3(), []);
  const headingForward = useMemo(() => new Vector3(), []);
  const headingRight = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (ACTIVE_ARENA_STYLE === 'classic') return;
    let cancelled = false;
    let cancelFloorTexture;
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${ARENA_PROFILE.model}`, gltf => {
      if(cancelled) { disposeModelResources([gltf.scene]); return; }
      try {
        if(!view.setArenaModel(gltf.scene)) disposeModelResources([gltf.scene]);
        else cancelFloorTexture = loadArenaFloorTexture(view,`${import.meta.env.BASE_URL}textures/${ARENA_PROFILE.floorTexture}`,gl.capabilities.getMaxAnisotropy());
      }
      catch(error) { disposeModelResources([gltf.scene]); console.warn('Colosseum unavailable; using the local arena fallback.', error); }
    }, undefined, error => { if(!cancelled) console.warn('Colosseum unavailable; using the local arena fallback.', error); });
    return () => { cancelled = true; cancelFloorTexture?.(); };
  }, [view]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    session.view = view;
    return () => { if (session.view === view) delete session.view; };
  }, [session, view]);

  useEffect(() => {
    view.resize(size.width, size.height);
  }, [view, size.width, size.height]);

  useEffect(() => {
    let cancelled = false;
    const jobs=new Map();
    for(const selection of [first,second]){
      const resolved=resolveLoadout(selection);
      if(resolved.bodyModel)jobs.set(resolved.bodyModel,{kind:'character',id:resolved.bodyModel});
      if(resolved.weaponModel)jobs.set(resolved.weaponModel,{kind:'weapon',id:resolved.weaponId});
    }
    for(const [filename,job] of jobs){
      new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${filename}`,gltf=>{
        if(cancelled){disposeModelResources([gltf.scene]);return;}
        try{
          if(job.kind==='character')view.setCharacterModel(gltf.scene,job.id);else view.setWeaponModel(gltf.scene,job.id);
          gltf.scene.traverse(o=>{for(const mat of Array.isArray(o.material)?o.material:[o.material])mat?.dispose();});
        }catch(error){if(job.kind==='character')view.showCharacterFallback(job.id);console.warn(`Could not attach ${filename}; using its fallback.`,error);}
      },undefined,error=>{if(!cancelled){if(job.kind==='character')view.showCharacterFallback(job.id);console.warn(`Could not load ${filename}; using its fallback.`,error);}});
    }
    return () => { cancelled = true; };
  }, [view, first, second]);

  useEffect(() => {
    const onContextLost = event => { event.preventDefault(); session.contextLost(); };
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
      view.dispose();
    };
  }, [gl, session, view]);

  // Drag to orbit the follow camera, wheel to zoom. Only during a match.
  useEffect(() => {
    const canvas = gl.domElement;
    let dragging = false;
    const inMatch = () => session.state !== 'lobby';
    const down = event => {
      if (event.button !== 0 || !inMatch()) return;
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const move = event => { if (dragging) view.orbit(event.movementX, event.movementY); };
    const up = event => {
      dragging = false;
      if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = '';
    };
    const wheel = event => { if (!inMatch()) return; event.preventDefault(); view.zoom(event.deltaY); };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', up);
    return () => {
      canvas.style.cursor = '';
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('lostpointercapture', up);
      canvas.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', up);
    };
  }, [gl, session, view]);

  useFrame((_, delta) => {
    const impacts = session.tick(delta);
    deathPortraits.current?.update(session.world.players, session.world.winner, session.state, Math.min(delta, .06));
    const matchView = session.state !== 'lobby';
    if (revision.current !== session.visualRevision) {
      view.clearEffects();
      view.resetCamera();
      revision.current = session.visualRevision;
    }
    for (const event of impacts) view.impact(event);
    const effectDelta = session.state === 'paused' ? 0 : Math.min(delta, 0.06);
    view.update(session.world.players, effectDelta, session.state === 'playing' || session.state === 'result', Math.min(delta, 0.06), matchView, session.localPlayerId);

    // Keep the same viewport and camera controller through the menu handoff.
    if (intro && session.state === 'lobby') {
      const pose = advanceLobbyCamera(intro, delta, view.reducedMotion);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(view.target);
      camera.zoom = pose.zoom;
      camera.updateProjectionMatrix();
      if (pose.complete || pose.returned) onIntroComplete?.();
    } else if (camera.zoom !== 1) {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }

    const activeCamera = matchView ? view.followCamera.camera : camera;
    gl.setViewport(0, 0, size.width, size.height);
    view.prepareArenaCamera(activeCamera, session.world.players);
    gl.render(scene, activeCamera);
    view.restoreArenaCamera();

    if (matchView) {
      const arrow = document.getElementById('staff-heading-arrow');
      const player = session.world.players[session.localPlayerId];
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
      point.set(effect.point.x, effect.point.y + 0.5 + (effect.maxLife - effect.life) * 1.4, effect.point.z);
      const screen = view.project(point, activeCamera, viewport);
      element.style.visibility = screen.visible ? 'visible' : 'hidden';
      element.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-50%)`;
      element.style.opacity = String(Math.min(1, effect.life * 3));
    }
  }, 1);

  return <>
    <ArenaEnvironment group={view.arena} />
    <FighterModels group={view.actors} />
    <ImpactEffects group={view.effectsRoot} />
  </>;
}

export function ArenaCanvas({ session, loadouts, onReady, intro, onIntroComplete }) {
  const key=loadouts.map(loadoutKey).join('|');
  const selections=useMemo(()=>loadouts.map(p=>({...p})),[key]);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 15.4, 21], near: 0.1, far: 120 }}
      orthographic
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        session.renderer = gl;
        gl.shadowMap.type = PCFShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.28;
        gl.domElement.setAttribute('aria-label', '三维圆形角斗场');
        onReady();
      }}
    >
      <color attach="background" args={[0xebe9dc]} />
      <ArenaScene session={session} loadouts={selections} intro={intro} onIntroComplete={onIntroComplete} />
    </Canvas>
  );
}
