import * as THREE from 'three';
import { bendable } from '../sculpt.js';
import { importedMesh, skillBlend } from '../character-parts.js';

/* ---------------- 胆子肥嘟嘟 ---------------- */
// The imported plasticine kangaroo (tools/import-characters.py), sitting with
// its stubby arms on the belly. Its arms are part of the body, so the
// delivery throw is a wind-up of the whole upper body: it leans back and
// twists toward the throwing (right, +z) side while the box flies.
const WAIST = { pivot: 0.75, from: 0.7, to: 1.25 };

export function dudu(kit) {
  const body = new THREE.Group();
  const clay = {};
  const part = importedMesh(kit, body, 'dudu', clay);
  const lean = bendable(part.geometry, WAIST);
  const toss = skillBlend('delivery');
  return { body, pose: (player, time) => {
    body.scale.y = 1 + Math.sin(time * 2.2) * 0.015;
    const weight = toss(player, time);
    lean(weight * 0.3);
    body.rotation.y = -weight * 0.3;
  } };
}
