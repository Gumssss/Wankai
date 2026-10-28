import { characterModel } from './character-assets.js';

// Shared building blocks for the character modules in ./characters/.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const SIDES = [-1, 1];

// An imported model (character-assets.js) in the body frame, with its own
// geometry copy (free to bend) and a material owned by this fighter's kit,
// so the hit flash and disposal stay per fighter. Soft vinyl: matte with a
// little sheen, never metallic.
export function importedMesh(kit, parent, id, extra = {}) {
  const model = characterModel(id);
  const material = kit.material(0xffffff, { map: model.map, normalMap: model.normalMap, roughness: model.roughness, metalness: 0,
    sheen: 0, clearcoat: 0, ...extra });
  const part = kit.part(parent, model.geometry.clone(), material, { outline: 0 });
  part.name = id;
  return part;
}

// Eases a 0..1 weight toward the skill state, so animations blend in and out.
export function skillBlend(skill) {
  let weight = 0, last = null;
  return (player, time) => {
    const dt = last === null ? 0 : clamp(time - last, 0, 0.1);
    last = time;
    const target = player.skillActive && player.skill === skill ? 1 : 0;
    weight += (target - weight) * (1 - Math.exp(-7 * dt));
    return weight;
  };
}
