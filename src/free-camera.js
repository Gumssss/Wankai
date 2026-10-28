import { PerspectiveCamera, Vector3, MathUtils } from 'three';
import { CHARACTERS } from './character-catalog.js';
import { CONFIG, clamp, staffFrame, weaponStats, fighterHeading } from './physics.js';

// Third-person follow camera for the local fighter: a close, tilted rear view
// that the mouse orbits freely. The look direction also steers the body.
export const FOLLOW_CAMERA = Object.freeze({ fov: 55, pitch: 0.36, distance: 13, yawOffset: 0 });
// Radians per pixel of pointer-lock movement at sensitivity 1 (100 px ≈ 5°).
export const LOOK_SPEED = Object.freeze({ yaw: 0.0009, pitch: 0.0007 });
export const SENSITIVITY_RANGE = Object.freeze({ min: 0.2, max: 3 });
// Chromium occasionally reports a huge jump on a single locked mouse event.
const MAX_LOOK_STEP = 250;

export function createFreeCameraRig(camera = new PerspectiveCamera(FOLLOW_CAMERA.fov, 1, 0.1, 260)) {
  const settings = FOLLOW_CAMERA;
  return {
    camera, settings, yaw: null, pitch: settings.pitch, distance: settings.distance,
    mouseYaw: 0, mousePitch: 0, pullback: 0, sensitivity: 1, invertY: false,
    focus: new Vector3(), position: new Vector3(), desired: new Vector3(),
    anchor: new Vector3(), framePoint: new Vector3(), victory: 0,
  };
}

// Horizontal direction the camera looks along, in the physics heading convention.
export const cameraYaw = rig => rig.yaw === null ? null : rig.yaw + rig.mouseYaw;

export function resetFreeCamera(rig) {
  rig.yaw = null;
  rig.mouseYaw = rig.mousePitch = rig.pullback = rig.victory = 0;
  rig.distance = rig.settings.distance;
}

// Mouse right turns the view right; mouse down looks down (unless inverted).
export function orbitFreeCamera(rig, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > MAX_LOOK_STEP || Math.abs(dy) > MAX_LOOK_STEP) return;
  const scale = clamp(rig.sensitivity, SENSITIVITY_RANGE.min, SENSITIVITY_RANGE.max);
  rig.mouseYaw += dx * LOOK_SPEED.yaw * scale;
  rig.mousePitch = clamp(rig.mousePitch + (rig.invertY ? -dy : dy) * LOOK_SPEED.pitch * scale, -0.3, 0.6);
}

// Turn the view to look along a heading (e.g. after teleporting behind someone).
export function faceFreeCamera(rig, heading) {
  if (rig.yaw === null || !Number.isFinite(heading)) return;
  rig.mouseYaw = heading - rig.yaw;
}

export function zoomFreeCamera(rig, delta) {
  rig.distance = clamp(rig.distance * Math.exp(delta * 0.001), rig.settings.distance * 0.45, rig.settings.distance * 1.4);
}

export function updateFreeCamera(rig, player, dt, shakeX = 0, shakeY = 0) {
  const { camera } = rig;
  const firstFrame = rig.yaw === null;
  const elapsed = Math.max(0, dt);
  rig.victory = 0;
  const aim = staffFrame(player, weaponStats(player).length * 0.55).point;
  if (firstFrame) rig.yaw = fighterHeading(player) + rig.settings.yawOffset;
  // Weapon A/D never changes the camera azimuth; only the mouse does.
  const yaw = rig.yaw + rig.mouseYaw;
  const pitch = clamp(rig.pitch + rig.mousePitch, 0.06, 0.9);
  if (!firstFrame) {
    // Follow translation immediately in the duel, so knockback cannot leave
    // the fighter behind. Smooth the weapon-relative composition separately.
    rig.desired.set(player.p.x, player.p.y, player.p.z).sub(rig.anchor);
    rig.position.add(rig.desired);
    rig.focus.add(rig.desired);
  }
  rig.anchor.set(player.p.x, player.p.y, player.p.z);
  const focusY = player.p.y + clamp((aim.y - player.p.y) * 0.4, 0.45 - CONFIG.bodyFloor, 2.6 - CONFIG.bodyFloor);
  rig.desired.set(player.p.x * 0.75 + aim.x * 0.25, focusY, player.p.z * 0.75 + aim.z * 0.25);
  const blend = 1 - Math.exp(-5 * elapsed);
  if (firstFrame) rig.focus.copy(rig.desired);
  else rig.focus.lerp(rig.desired, blend);
  const horizontal = Math.cos(pitch) * rig.distance;
  rig.desired.set(player.p.x - Math.cos(yaw) * horizontal,
    player.p.y + Math.sin(pitch) * rig.distance + 1.2,
    player.p.z - Math.sin(yaw) * horizontal);
  if (firstFrame) rig.position.copy(rig.desired);
  else rig.position.lerp(rig.desired, blend);
  camera.position.copy(rig.position);
  camera.position.x += shakeX;
  camera.position.y += shakeY;
  camera.lookAt(rig.focus);
  camera.updateMatrixWorld();
  fitFighter(rig, player, elapsed, firstFrame);
}

// After the round: glide to a close three-quarter shot of the winner's face
// and hold it. The angle is fixed when the round ends, so the shot never
// orbits even if the winner keeps turning. Starts from the follow camera.
export function updateVictoryCamera(rig, winner, dt, loser = null) {
  const { camera } = rig;
  const elapsed = Math.max(0, dt);
  const character = CHARACTERS[winner.characterId];
  const height = character.bounds.max[1];
  const distance = 1.2 + height * 0.9;
  if (rig.victory === 0) {
    rig.position.copy(camera.position);
    rig.victoryAngle = victoryAngle(winner, loser, distance);
  }
  rig.victory += elapsed;
  const angle = rig.victoryAngle;
  const floor = winner.p.y - character.bodyFloor;
  // Aim below the face so the winner sits in the upper half, clear of the result panel.
  rig.desired.set(winner.p.x, floor + height * 0.42, winner.p.z);
  const blend = 1 - Math.exp(-2.6 * elapsed);
  rig.focus.lerp(rig.desired, blend);
  rig.desired.set(winner.p.x + Math.cos(angle) * distance, floor + height * 0.78 + 0.2, winner.p.z + Math.sin(angle) * distance);
  rig.position.lerp(rig.desired, blend);
  camera.position.copy(rig.position);
  camera.lookAt(rig.focus);
  camera.updateMatrixWorld();
}

// Title screen: a slow orbit around the whole arena.
export function updateShowcaseCamera(camera, time) {
  const angle = -0.6 + time * 0.045;
  camera.position.set(Math.sin(angle) * 33, 12.5 + Math.sin(time * 0.21) * 1.2, Math.cos(angle) * 33);
  camera.lookAt(0, 1.2, 0);
  camera.updateMatrixWorld();
}

// The winner usually faces the loser with the weapon held out in front, so a
// plain front three-quarter view looks through one or both. Take the front
// angle nearest the face that keeps clear of the loser (when close) and of
// the floating weapon; failing that, the angle with the most clearance.
function victoryAngle(winner, loser, distance) {
  const heading = fighterHeading(winner);
  const blockers = [];
  if (loser) {
    const dx = loser.p.x - winner.p.x, dz = loser.p.z - winner.p.z;
    if (Math.hypot(dx, dz) < distance + 1.5) blockers.push({ bearing: Math.atan2(dz, dx), clearance: 1.0 });
  }
  const tip = staffFrame(winner, weaponStats(winner).length * 0.7).point;
  const wx = tip.x - winner.p.x, wz = tip.z - winner.p.z;
  if (Math.hypot(wx, wz) > 0.3) blockers.push({ bearing: Math.atan2(wz, wx), clearance: 0.8 });
  const gap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  const margin = angle => Math.min(Infinity, ...blockers.map(b => gap(angle, b.bearing) - b.clearance));
  let best = heading + 0.4;
  for (const offset of [0.4, 0.7, 1.0, 1.3, 1.6, 1.9]) for (const side of [1, -1]) {
    const angle = heading + side * offset;
    if (margin(angle) >= 0) return angle;
    if (margin(angle) > margin(best)) best = angle;
  }
  return best;
}

function fitFighter(rig, player, dt, firstFrame) {
  const { camera } = rig;
  const verticalSlope = Math.tan(MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
  const horizontalSlope = verticalSlope * Math.max(camera.aspect, 1e-6);
  let needed = 0;
  const points = [];
  for (const x of [-0.5, 0.5]) for (const y of [-0.6, 1.65]) for (const z of [-0.5, 0.5]) {
    points.push({ x: player.p.x + x, y: player.p.y + y, z: player.p.z + z });
  }
  for (const p of points) {
    const point = rig.framePoint.set(p.x, p.y, p.z)
      .applyMatrix4(camera.matrixWorldInverse);
    const depth = -point.z;
    needed = Math.max(needed,
      Math.abs(point.x) / (horizontalSlope * 0.72) - depth,
      Math.abs(point.y) / (verticalSlope * (point.y >= 0 ? 0.5 : 0.72)) - depth,
      camera.near + 0.25 - depth);
  }
  rig.pullback = firstFrame || needed > rig.pullback ? needed :
    rig.pullback + (needed - rig.pullback) * (1 - Math.exp(-4 * dt));
  camera.translateZ(rig.pullback);
  const far = Math.max(260, rig.pullback + 20);
  if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
}
