import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaView } from './scene.js';
import { FREE_CAMERA } from './free-camera.js';
import { BEAGLE } from './beagle-profile.js';

function ArenaEnvironment({ group }) { return <primitive object={group} dispose={null} />; }
function FighterModels({ group }) { return <primitive object={group} dispose={null} />; }
function ImpactEffects({ group }) { return <primitive object={group} dispose={null} />; }

function ArenaScene({ session, mode, weapon, secondWeapon }) {
  const { gl, camera, scene, size } = useThree();
  const view = useMemo(() => new ArenaView(gl, camera, mode, weapon, secondWeapon), [gl, camera, mode, weapon, secondWeapon]);
  const revision = useRef(session.visualRevision);
  const point = useMemo(() => new Vector3(), []);
  const headingForward = useMemo(() => new Vector3(), []);
  const headingRight = useMemo(() => new Vector3(), []);

  useEffect(() => {
    view.resize(size.width, size.height);
  }, [view, size.width, size.height]);

  useEffect(() => {
    let cancelled = false;
    const types = [...new Set(mode === 'solo' ? [weapon] : [weapon, secondWeapon])];
    for (const type of types) {
      const weaponUrl = `${import.meta.env.BASE_URL}models/${type === 'beagle' ? BEAGLE.model : `${type}.glb`}`;
      new GLTFLoader().load(weaponUrl, gltf => {
        if (cancelled) {
          gltf.scene.traverse(object => {
            object.geometry?.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) if (material) {
              for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
              material.dispose();
            }
          });
          return;
        }
        try {
          view.setWeaponModel(gltf.scene, type);
          gltf.scene.traverse(object => {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) material?.dispose();
          });
        } catch (error) { console.warn(`Could not attach the ${type} model; using the original shape.`, error); }
      }, undefined, error => {
        if (!cancelled) console.warn(`Could not load the ${type} model; using the original shape.`, error);
      });
    }
    return () => { cancelled = true; };
  }, [view, mode, weapon, secondWeapon]);

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
    const splitView = mode === 'duel' && session.state !== 'lobby';
    if (revision.current !== session.visualRevision) {
      view.clearEffects();
      view.resetCamera();
      revision.current = session.visualRevision;
    }
    for (const event of impacts) view.impact(event);
    const effectDelta = session.state === 'paused' ? 0 : Math.min(delta, 0.06);
    view.update(session.world.players, effectDelta, session.state === 'playing' || session.state === 'ending', Math.min(delta, 0.06), splitView, session.getCameraInputs());

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
        gl.render(scene, view.duelCameras[id].camera);
      }
      gl.shadowMap.autoUpdate = shadowAutoUpdate;
      gl.setScissorTest(false);
    } else {
      gl.setScissorTest(false);
      gl.setViewport(0, 0, size.width, size.height);
      gl.render(scene, camera);
    }
    gl.setViewport(0, 0, size.width, size.height);

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
      for (const player of session.world.players) {
        const label = document.getElementById(`player-label-${pane.id}-${player.id}`);
        if (!label) continue;
        const screen = view.project({ x: player.p.x, y: player.p.y + 1.53, z: player.p.z }, pane.camera, pane.viewport);
        label.style.visibility = screen.visible ? 'visible' : 'hidden';
        label.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;
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

export function ArenaCanvas({ session, mode, weapon, secondWeapon = 'polearm', onReady }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={mode === 'solo' ? { position: [-4, 3, -4], fov: FREE_CAMERA.fov, near: 0.1, far: 120 } : { position: [0, 15.4, 21], near: 0.1, far: 120 }}
      orthographic={mode !== 'solo'}
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
      <ArenaScene session={session} mode={mode} weapon={weapon} secondWeapon={secondWeapon} />
    </Canvas>
  );
}
