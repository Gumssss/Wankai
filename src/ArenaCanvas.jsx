import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaView } from './scene.js';
import {createDeathPortraits} from './death-portrait.js';
import { advanceLobbyCamera } from './lobby-camera.js';
import { FREE_CAMERA } from './free-camera.js';
import { FIXED_CAMERA } from './fixed-camera.js';
import {resolveLoadout,loadoutKey} from './loadouts.js';
import { ARENA_PROFILE, ACTIVE_ARENA_STYLE } from './arena-profile.js';
import {loadArenaFloorTexture} from './arena-floor.js';

function ArenaEnvironment({ group }) { return <primitive object={group} dispose={null} />; }
function FighterModels({ group }) { return <primitive object={group} dispose={null} />; }
function ImpactEffects({ group }) { return <primitive object={group} dispose={null} />; }

function ArenaScene({ session, mode, loadouts, intro, onIntroComplete }) {
  const [first,second]=loadouts;
  const { gl, camera, scene, size } = useThree();
  const view = useMemo(() => new ArenaView(gl, camera, mode, first, second), [gl, camera, mode, first, second]);
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

  // Local review recorders may inspect the actual game view without replacing
  // the runtime renderer or advancing a second physics world.
  useEffect(() => {
    if (ACTIVE_ARENA_STYLE === 'classic') {
      view.environmentState = 'ready';
      return;
    }
    let cancelled = false;
    let cancelFloorTexture;
    const dispose = source => {
      const resources = new Set();
      source.traverse(o => { if(o.geometry) resources.add(o.geometry);
        for(const mat of Array.isArray(o.material)?o.material:[o.material]) if(mat) {
          resources.add(mat); for(const value of Object.values(mat)) if(value?.isTexture) resources.add(value);
        }
      });
      for(const item of resources) item.dispose();
    };
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${ARENA_PROFILE.model}`, gltf => {
      if(cancelled) { dispose(gltf.scene); return; }
      try {
        if(!view.setArenaModel(gltf.scene)) dispose(gltf.scene);
        else cancelFloorTexture = loadArenaFloorTexture(view,`${import.meta.env.BASE_URL}textures/${ARENA_PROFILE.floorTexture}`,gl.capabilities.getMaxAnisotropy());
      }
      catch(error) { dispose(gltf.scene); view.showArenaFallback(); console.warn('Colosseum unavailable; using the local arena fallback.', error); }
    }, undefined, error => { if(!cancelled) { view.showArenaFallback(); console.warn('Colosseum unavailable; using the local arena fallback.', error); } });
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
    for(const selection of mode==='solo'?[first]:[first,second]){
      const resolved=resolveLoadout(selection);
      if(resolved.bodyModel)jobs.set(resolved.bodyModel,{kind:'character',id:resolved.bodyModel});
      if(resolved.weaponModel)jobs.set(resolved.weaponModel,{kind:'weapon',id:resolved.weaponId});
    }
    for(const [filename,job] of jobs){
      new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${filename}`,gltf=>{
        if(cancelled){
          const resources=new Set();gltf.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat){resources.add(mat);for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);}});resources.forEach(r=>r.dispose());return;
        }
        try{
          if(job.kind==='character')view.setCharacterModel(gltf.scene,job.id);else view.setWeaponModel(gltf.scene,job.id);
          gltf.scene.traverse(o=>{for(const mat of Array.isArray(o.material)?o.material:[o.material])mat?.dispose();});
        }catch(error){if(job.kind==='character')view.showCharacterFallback(job.id);console.warn(`Could not attach ${filename}; using its fallback.`,error);}
      },undefined,error=>{if(!cancelled){if(job.kind==='character')view.showCharacterFallback(job.id);console.warn(`Could not load ${filename}; using its fallback.`,error);}});
    }
    return () => { cancelled = true; };
  }, [view, mode, first, second]);

  useEffect(() => {
    const onContextLost = event => { event.preventDefault(); session.contextLost(); };
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
      view.dispose();
    };
  }, [gl, session, view]);

  useEffect(() => {
    if (mode !== 'solo') return;
    const canvas = gl.domElement;
    let dragging = false;
    const down = event => {
      if (event.button !== 0) return;
      dragging = true;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const move = event => { if (dragging) view.orbit(event.movementX, event.movementY); };
    const up = event => {
      dragging = false;
      if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = 'grab';
    };
    const wheel = event => { event.preventDefault(); view.zoom(event.deltaY); };
    canvas.style.cursor = 'grab';
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
  }, [gl, mode, session, view]);

  useFrame((_, delta) => {
    const impacts = session.tick(delta);
    deathPortraits.current?.update(session.world.players, session.world.winner, session.state, Math.min(delta, .06));
    const splitView = mode === 'duel' && session.state !== 'lobby';
    if (revision.current !== session.visualRevision) {
      view.clearEffects();
      view.resetCamera();
      revision.current = session.visualRevision;
    }
    for (const event of impacts) view.impact(event);
    const effectDelta = session.state === 'paused' ? 0 : Math.min(delta, 0.06);
    view.update(session.world.players, effectDelta, session.state === 'playing' || session.state === 'ending' || session.state === 'result', Math.min(delta, 0.06), splitView, session.getCameraInputs());

    // Keep the same viewport and camera controller through the menu handoff.
    if (intro && session.state === 'lobby' && camera.isOrthographicCamera) {
      const pose = advanceLobbyCamera(intro, delta, view.reducedMotion);
      camera.position.set(pose.x, pose.y, pose.z);
      camera.lookAt(view.target);
      camera.zoom = pose.zoom;
      camera.updateProjectionMatrix();
      if (pose.complete || pose.returned) onIntroComplete?.();
    } else if (camera.isOrthographicCamera && camera.zoom !== 1) {
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    }

    // Advance the one match once, then draw that same scene through both cameras.
    if (splitView) {
      const leftWidth = size.width / 2;
      const shadowAutoUpdate = gl.shadowMap.autoUpdate;
      gl.setScissorTest(true);
      for (let id = 0; id < 2; id++) {
        const x = id === 0 ? 0 : leftWidth;
        const width = id === 0 ? leftWidth : size.width - leftWidth;
        gl.setViewport(x, 0, width, size.height);
        gl.setScissor(x, 0, width, size.height);
        if (id === 1) gl.shadowMap.autoUpdate = false;
        view.prepareArenaCamera(view.duelCameras[id].camera, session.world.players);
        gl.render(scene, view.duelCameras[id].camera);
      }
      gl.shadowMap.autoUpdate = shadowAutoUpdate;
      gl.setScissorTest(false);
    } else {
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
      view.prepareArenaCamera(camera, session.world.players);
      gl.render(scene, camera);
    }
    gl.setViewport(0, 0, size.width, size.height);
    view.restoreArenaCamera();

    const panes = splitView ? [
      { id: 0, camera: view.duelCameras[0].camera, viewport: { x: 0, width: size.width / 2, height: size.height } },
      { id: 1, camera: view.duelCameras[1].camera, viewport: { x: size.width / 2, width: size.width / 2, height: size.height } },
    ] : [{ id: 0, camera, viewport: { x: 0, width: size.width, height: size.height } }];
    for (const pane of panes) {
      if (mode === 'solo' || splitView) {
        const arrow = document.getElementById(`staff-heading-arrow-${pane.id}`);
        const player = session.world.players[pane.id];
        if (arrow && player) {
          headingForward.set(0, 0, -1).applyQuaternion(pane.camera.quaternion).setY(0).normalize();
          headingRight.set(1, 0, 0).applyQuaternion(pane.camera.quaternion).setY(0).normalize();
          const x = Math.cos(player.phi), z = Math.sin(player.phi);
          const angle = Math.atan2(x * headingRight.x + z * headingRight.z, x * headingForward.x + z * headingForward.z);
          arrow.style.transform = `rotate(${angle}rad)`;
        }
      }
      for (const effect of session.effects) {
        const element = document.getElementById(`effect-${pane.id}-${effect.id}`);
        if (!element) continue;
        point.set(effect.point.x, effect.point.y + 0.5 + (effect.maxLife - effect.life) * 1.4, effect.point.z);
        const screen = view.project(point, pane.camera, pane.viewport);
        element.style.visibility = screen.visible ? 'visible' : 'hidden';
        element.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-50%)`;
        element.style.opacity = String(Math.min(1, effect.life * 3));
      }
    }
  }, 1);

  return <>
    <ArenaEnvironment group={view.arena} />
    <FighterModels group={view.actors} />
    <ImpactEffects group={view.effectsRoot} />
  </>;
}

export function ArenaCanvas({ session, mode, loadouts, onReady, intro, onIntroComplete }) {
  const fixed = mode === 'duel-fixed';
  const key=loadouts.map(loadoutKey).join('|');
  const selections=useMemo(()=>loadouts.map(p=>({...p})),[key]);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={mode === 'solo' ? { position: [-4, 3, -4], fov: FREE_CAMERA.fov, near: 0.1, far: 120 } : fixed ?
        { position: [...FIXED_CAMERA.position], fov: FIXED_CAMERA.fov, near: FIXED_CAMERA.near, far: FIXED_CAMERA.far } :
        { position: [0, 15.4, 21], near: 0.1, far: 120 }}
      orthographic={mode !== 'solo' && !fixed}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        session.renderer = gl;
        gl.shadowMap.type = PCFShadowMap;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.28;
        gl.domElement.setAttribute('aria-label', mode === 'solo' ? '赤丸的可旋转三维视角' : '赤丸与青丸的三维圆形角斗场');
        onReady();
      }}
    >
      <color attach="background" args={[0xebe9dc]} />
      <ArenaScene session={session} mode={mode} loadouts={selections} intro={intro} onIntroComplete={onIntroComplete} />
    </Canvas>
  );
}
