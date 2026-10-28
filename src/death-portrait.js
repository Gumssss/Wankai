import { Mesh, PlaneGeometry, MeshBasicMaterial, TextureLoader, SRGBColorSpace, DoubleSide } from 'three';
import { CHARACTERS } from './character-catalog.js';
import { characterPortrait } from './models/portraits.js';

// A greyed portrait of the defeated fighter rises above them, facing the winner.
export function updateDeathPortrait(mesh, defeated, victor, height, elapsed) {
  const rise = 1 - Math.exp(-elapsed * 2.5);
  mesh.position.set(defeated.p.x, defeated.p.y + height * (0.7 + 0.65 * rise), defeated.p.z);
  mesh.rotation.set(0, Math.atan2(victor.p.x - defeated.p.x, victor.p.z - defeated.p.z), 0);
  mesh.material.opacity = 0.82 * Math.min(1, elapsed / 0.5);
}

export function createDeathPortraits(scene, loadouts) {
  const loader = new TextureLoader();
  const entries = loadouts.map((loadout, id) => {
    const character = CHARACTERS[loadout.characterId], url = characterPortrait(loadout.characterId, id, 'bust');
    if (!character || !url) return null;
    const texture = loader.load(url);
    texture.colorSpace = SRGBColorSpace;
    const material = new MeshBasicMaterial({ map: texture, color: 0xb8b2a8, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, toneMapped: false });
    const height = character.bounds.max[1] - character.bounds.min[1];
    const mesh = new Mesh(new PlaneGeometry(height, height), material);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, texture, height, elapsed: 0 };
  });
  return {
    update(players, winner, state, dt) {
      entries.forEach((entry, id) => {
        if (!entry) return;
        const visible = state === 'result' && winner >= 0 && winner !== id && players[id].health <= 0;
        entry.mesh.visible = visible;
        if (!visible) { entry.elapsed = 0; return; }
        entry.elapsed += dt;
        updateDeathPortrait(entry.mesh, players[id], players[winner], entry.height, entry.elapsed);
      });
    },
    dispose() {
      entries.forEach(entry => {
        if (!entry) return;
        scene.remove(entry.mesh);
        entry.mesh.geometry.dispose(); entry.mesh.material.dispose(); entry.texture.dispose();
      });
    },
  };
}
