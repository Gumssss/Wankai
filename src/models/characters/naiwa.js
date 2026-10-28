import * as THREE from 'three';
import { bendable } from '../sculpt.js';
import { importedMesh, skillBlend, clamp } from '../character-parts.js';

/* ---------------- 奶蛙 ---------------- */
// Two imported models (tools/import-characters.py): the kung-fu horse stance
// and, while the laugh skill runs, the laughing pose with the head thrown back
// and both hands on the belly. Both share one scale and the same recoloured
// yellow, so the swap only changes the pose.
// The neck: everything above `from` bends back about the pivot, fully above
// `to` (body frame, metres).
const NECK = { pivot: 1.05, from: 1.02, to: 1.42 };
// The swap: a short dithered cross-fade while the laugh weight passes these values.
const FADE = [0.2, 0.6];

export function naiwa(kit) {
  const body = new THREE.Group();
  // Dithered (hashed) transparency fades the two poses into each other without
  // sorting artefacts; fully opaque it costs nothing.
  const fade = { alphaHash: true, opacity: 1 };
  const stance = importedMesh(kit, body, 'naiwa', fade), laughing = importedMesh(kit, body, 'naiwa-laugh', { ...fade, opacity: 0 });
  laughing.visible = false;
  const bends = [stance, laughing].map(part => bendable(part.geometry, NECK));
  // The head frame: it turns with the full bend (anything riding on the head goes here).
  const face = new THREE.Group();
  face.position.set(0, NECK.pivot, 0);
  body.add(face);
  const tilt = angle => { for (const bend of bends) bend(angle); face.rotation.z = angle; };

  const laugh = skillBlend('laugh');
  return { body, face, pose: (player, time) => {
    const weight = laugh(player, time);
    // Laughing: the head rocks back on every "HA" and dips forward between
    // them, at a steady rhythm. Idle: a slow breath.
    const beat = Math.sin(time * Math.PI * 2 * 1.9);
    tilt(weight * (0.12 + 0.22 * beat));
    body.position.y = weight * (0.5 + 0.5 * beat) * 0.025;
    body.scale.y = 1 + Math.sin(time * 2.4) * 0.012 * (1 - weight);
    const t = clamp((weight - FADE[0]) / (FADE[1] - FADE[0]), 0, 1), mix = t * t * (3 - 2 * t);
    stance.material.opacity = 1 - mix;
    laughing.material.opacity = mix;
    stance.visible = mix < 1;
    laughing.visible = mix > 0;
  } };
}
