import { clamp, importedMesh, skillBlend } from '../character-parts.js';
import { characterModel } from '../character-assets.js';
import * as THREE from 'three';

/* ---------------- 开心小猫 ---------------- */
// The imported grey tabby from the happy-cat meme (tools/import-characters.py),
// up on its hind legs with its arms out. It sways on the spot and flaps its
// arms; during Happy Happy it hops. Its paw weapon floats beside it like
// every other weapon.

// Flaps an arm of the imported mesh about the x axis through its shoulder:
// the vertices beyond the shoulder (within the arm's height span) turn fully,
// the shoulder blends in over a few centimetres.
function flapper(geometry, side, { at, span }) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const sign = side === 'L' ? -1 : 1, picked = [], weights = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i), out = sign * (position.getZ(i) - at[2]);
    if (y < span[0] - 0.02 || y > span[1] + 0.02 || out < -0.04) continue;
    const t = clamp((out + 0.04) / 0.12, 0, 1);
    picked.push(i);
    weights.push(t * t * (3 - 2 * t));
  }
  const rest = picked.map(i => [position.getY(i), position.getZ(i), normal.getY(i), normal.getZ(i)]);
  let current = 0;
  return angle => {
    if (Math.abs(angle - current) < 1e-4) return;
    current = angle;
    picked.forEach((i, k) => {
      const a = angle * weights[k] * sign, c = Math.cos(a), s = Math.sin(a), [y, z, ny, nz] = rest[k];
      const dy = y - at[1], dz = z - at[2];
      position.setY(i, at[1] + dy * c - dz * s).setZ(i, at[2] + dy * s + dz * c);
      normal.setY(i, ny * c - nz * s).setZ(i, ny * s + nz * c);
    });
    position.needsUpdate = true;
    normal.needsUpdate = true;
  };
}

export function happyCat(kit) {
  const body = new THREE.Group();
  const part = importedMesh(kit, body, 'happy-cat');
  const shoulders = characterModel('happy-cat').extras.shoulders;
  const flaps = ['L', 'R'].map(side => ({ side, flap: flapper(part.geometry, side, shoulders[side]) }));
  const happy = skillBlend('happy');
  return { body, pose: (player, time) => {
    // The meme's dance, purely visual so the contact volumes never move: a
    // side-to-side sway with a little squash, feet on the floor, flapping
    // arms; Happy Happy adds hops and bigger, faster flaps.
    const weight = happy(player, time);
    const beat = Math.abs(Math.sin(time * (5.2 + weight * 2.4)));
    body.position.y = beat * 0.14 * weight;
    body.rotation.x = Math.sin(time * (2.6 + weight * 1.2)) * (0.05 + 0.1 * weight);
    body.scale.set(1 + (1 - beat) * 0.02, 1 - (1 - beat) * 0.03, 1 + (1 - beat) * 0.02);
    for (const { side, flap } of flaps) flap((side === 'L' ? 1 : -1) * Math.sin(time * 5.2) * (0.15 + weight * 0.35));
  } };
}
