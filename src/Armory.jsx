import { useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPON_CATALOG, weaponName } from './weapon-catalog.js';
import { WEAPON_VISUALS } from './weapon-visuals.js';
import { WEAPONS } from './physics.js';

function disposeModel(root) {
  const resources = new Set();
  root.traverse(object => {
    if (object.geometry) resources.add(object.geometry);
    for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!mat) continue;
      resources.add(mat);
      for (const value of Object.values(mat)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}

function PreviewModel({ weapon, onError, onLoaded }) {
  const { camera, size, invalidate } = useThree();
  const [root, setRoot] = useState(null);
  useEffect(() => {
    let cancelled = false;
    let owned;
    setRoot(null);
    new GLTFLoader().load(`${import.meta.env.BASE_URL}models/${weapon}.glb`, gltf => {
      if (cancelled) { disposeModel(gltf.scene); return; }
      owned = new Group();
      const model = gltf.scene;
      model.quaternion.setFromUnitVectors(new Vector3(...WEAPON_VISUALS[weapon].axis).normalize(), new Vector3(0, 1, 0));
      const bounds = new Box3().setFromObject(model);
      model.scale.setScalar(WEAPONS[weapon].length / (bounds.max.y - bounds.min.y));
      if (weapon === 'polearm') model.traverse(object => {
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!mat?.color) continue;
          mat.color.set(0x70797c); mat.metalness = 0.24; mat.roughness = 0.62;
        }
      });
      owned.add(model);
      owned.rotation.z = -0.4;
      owned.rotation.y = 0.25;
      owned.updateMatrixWorld(true);
      owned.position.sub(new Box3().setFromObject(owned).getCenter(new Vector3()));
      setRoot(owned);
      onLoaded();
      invalidate();
    }, undefined, () => { if (!cancelled) onError(); });
    return () => { cancelled = true; if (owned) disposeModel(owned); };
  }, [weapon, invalidate, onError, onLoaded]);
  useEffect(() => {
    if (!root) return;
    const extent = new Box3().setFromObject(root).getSize(new Vector3());
    camera.zoom = Math.min(size.width / Math.max(0.1, extent.x), size.height / Math.max(0.1, extent.y)) / 1.1;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [root, camera, size.width, size.height, invalidate]);
  return root ? <primitive object={root} dispose={null} /> : null;
}

const MODES = { duel: '双人对战 · 分屏视角', 'duel-fixed': '双人对战 · 固定视角', practice: '木桩练习', solo: '单人自由视角' };

export function Armory({ game, session, mode, close, start }) {
  const [viewed, setViewed] = useState(game.weapons[0]);
  const [previewState, setPreviewState] = useState('loading');
  const [onError] = useState(() => () => setPreviewState('error'));
  const [onLoaded] = useState(() => () => setPreviewState('ready'));
  const solo = mode === 'solo';
  const practice = mode === 'practice';
  const viewing = WEAPON_CATALOG.find(weapon => weapon.id === viewed);
  const choose = (weapon, id) => {
    session.setWeapon(weapon, id);
    if (viewed !== weapon) setPreviewState('loading');
    setViewed(weapon);
  };
  const preview = weapon => { if (viewed !== weapon) setPreviewState('loading'); setViewed(weapon); };

  return <>
    <button className="modal-close" onClick={close} aria-label="关闭兵器库">×</button>
    <div className="armory-heading"><span className="eyebrow">THE ARMORY / 兵器库</span><h2>选一把，找到你的打法<span>。</span></h2><p>看兵器，读特点。开打之前，各选所长。</p></div>
    <div className="armory-loadouts" aria-live="polite">
      <div className="loadout-one"><span>P1 · 赤丸</span><strong>{weaponName(game.weapons[0])}</strong></div>
      {!solo && <><span className="armory-versus">VS</span><div className="loadout-two"><span>{practice ? 'P2 · 木桩' : 'P2 · 青丸'}</span><strong>{weaponName(game.weapons[1])}</strong></div></>}
    </div>
    <div className="armory-layout">
      <div className="weapon-library">
      <div className="weapon-tabs" role="group" aria-label="兵器种类">
        {WEAPON_CATALOG.map(weapon => <button key={weapon.id} aria-pressed={viewed === weapon.id} onClick={() => preview(weapon.id)}><b>{weapon.name}</b><small>{weapon.role}</small></button>)}
      </div>
      <div className="weapon-cards" aria-label="可选兵器">
        {WEAPON_CATALOG.filter(weapon => weapon.id === viewed).map(weapon => <article key={weapon.id} className="weapon-card viewing">
          <button className="weapon-inspect" aria-pressed={viewed === weapon.id} onClick={() => preview(weapon.id)}><span><small>{weapon.english}</small><b>{weapon.name}</b></span><em>{weapon.role}</em><span className="inspect-arrow">↗</span></button>
          <p>{weapon.description}</p>
          <div className="weapon-traits"><span>距离 <b>{weapon.reach}</b></span><span>起挥 <b>{weapon.response}</b></span></div>
          <dl><div><dt>所长</dt><dd>{weapon.strength}</dd></div><div><dt>取舍</dt><dd>{weapon.weakness}</dd></div></dl>
          <div className="weapon-equip">
            {[0, ...(solo ? [] : [1])].map(id => <button key={id} type="button" className={id === 0 ? 'equip-one' : 'equip-two'} aria-label={`P${id + 1}选择${weapon.name}`} aria-pressed={game.weapons[id] === weapon.id} onClick={() => choose(weapon.id, id)}>P{id + 1} {game.weapons[id] === weapon.id ? '已装备 ✓' : '选择'}</button>)}
          </div>
        </article>)}
      </div>
      </div>
      <div className="weapon-showcase">
        <div className="showcase-caption"><span className="eyebrow">WEAPON STUDY</span><strong>{viewing.name}</strong><small>游戏中的实际模型</small></div>
        <div className="weapon-preview">
          <Canvas orthographic frameloop="demand" dpr={[1, 1.5]} camera={{position:[0, 0, 5], near:0.01, far:50, zoom:80}} gl={{alpha:true, antialias:true}}>
            <ambientLight intensity={2}/><hemisphereLight args={[0xfff9e9, 0x849079, 2]}/><directionalLight position={[3, 5, 4]} intensity={3}/>
            <PreviewModel weapon={viewed} onError={onError} onLoaded={onLoaded}/>
          </Canvas>
          {previewState !== 'ready' && <div className="preview-message">{previewState === 'error' ? '模型预览暂时不可用，仍可选择兵器。' : '正在取出兵器…'}</div>}
        </div>
        <div className="showcase-rule"><b>武器，也是你的脚。</b><span>W / S 前后挥动 · A / D 水平转向<br/>所有兵器都靠触地与碰撞带动身体。</span></div>
      </div>
    </div>
    <div className="armory-footer"><span>{mode === 'browse' ? '双方可以选用同一种兵器。选择会保留到重开。' : `${MODES[mode]} · ${solo ? '赤丸独自探索' : practice ? '木桩不主动出招' : '双方可以选用相同兵器'}`}</span><button className="primary-button" onClick={mode === 'browse' ? close : start}>{mode === 'browse' ? '保存选择，回到菜单' : '就用这套，开始'} <span>↗</span></button></div>
  </>;
}
