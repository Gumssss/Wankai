import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ArenaView } from './scene.js';

function ArenaEnvironment({ group }) { return <primitive object={group} dispose={null} />; }
function FighterModels({ group }) { return <primitive object={group} dispose={null} />; }
function ImpactEffects({ group }) { return <primitive object={group} dispose={null} />; }

function ArenaScene({ session }) {
  const { gl, camera, size } = useThree();
  const view = useMemo(() => new ArenaView(gl, camera), [gl, camera]);
  const revision = useRef(session.visualRevision);
  const point = useMemo(() => new Vector3(), []);

  useEffect(() => {
    view.resize(size.width, size.height);
  }, [view, size.width, size.height]);

  useEffect(() => {
    let cancelled = false;
    const weaponUrl = `${import.meta.env.BASE_URL}models/polearm.glb`;
    new GLTFLoader().load(weaponUrl, gltf => {
      if (cancelled) {
        gltf.scene.traverse(object => {
          object.geometry?.dispose();
          object.material?.dispose();
        });
        return;
      }
      try { view.setWeaponModel(gltf.scene); }
      catch (error) { console.warn('Could not attach the Tripo weapon; using the original staff.', error); }
    }, undefined, error => {
      if (!cancelled) console.warn('Could not load the Tripo weapon; using the original staff.', error);
    });
    return () => { cancelled = true; };
  }, [view]);

  useEffect(() => {
    const onContextLost = event => { event.preventDefault(); session.contextLost(); };
    gl.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', onContextLost);
      view.dispose();
    };
  }, [gl, session, view]);

  useFrame((_, delta) => {
    const impacts = session.tick(delta);
    if (revision.current !== session.visualRevision) {
      view.clearEffects();
      revision.current = session.visualRevision;
    }
    for (const event of impacts) view.impact(event);
    const effectDelta = session.state === 'paused' ? 0 : Math.min(delta, 0.06);
    view.update(session.world.players, effectDelta, session.state === 'playing' || session.state === 'ending');

    for (const player of session.world.players) {
      const label = document.getElementById(`player-label-${player.id}`);
      if (!label) continue;
      const screen = view.project({ x: player.p.x, y: player.p.y + 1.53, z: player.p.z });
      label.style.transform = `translate(${screen.x}px,${screen.y}px) translate(-50%,-100%)`;
    }
    for (const effect of session.effects) {
      const element = document.getElementById(`effect-${effect.id}`);
      if (!element) continue;
      point.set(effect.point.x, effect.point.y + 0.5 + (effect.maxLife - effect.life) * 1.4, effect.point.z);
      point.project(camera);
      element.style.transform = `translate(${(point.x * 0.5 + 0.5) * size.width}px,${(-point.y * 0.5 + 0.5) * size.height}px) translate(-50%,-50%)`;
      element.style.opacity = String(Math.min(1, effect.life * 3));
    }
  });

  return <>
    <ArenaEnvironment group={view.arena} />
    <FighterModels group={view.actors} />
    <ImpactEffects group={view.effectsRoot} />
  </>;
}

export function ArenaCanvas({ session, onReady }) {
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
        gl.domElement.setAttribute('aria-label', '赤丸与青丸的三维圆形角斗场');
        onReady();
      }}
    >
      <color attach="background" args={[0xebe9dc]} />
      <ArenaScene session={session} />
    </Canvas>
  );
}
