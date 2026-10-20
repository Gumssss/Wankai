import { PerspectiveCamera, Vector3, MathUtils } from 'three';
import {CHARACTERS} from './character-catalog.js';
import { CONFIG, clamp, staffFrame, weaponStats, weaponSegments, hurtSegments } from './physics.js';

// Shared by solo exploration and each player's split-screen view.
export const FREE_CAMERA = Object.freeze({ fov: 55, pitch: 0.52, distance: 6.2, yawOffset: Math.PI / 2 });
export const SPLIT_CAMERA = Object.freeze({ ...FREE_CAMERA, pitch: 0.35, distance: 10.5, yawOffset: Math.PI / 12 });

export function createFreeCameraRig(camera = new PerspectiveCamera(FREE_CAMERA.fov, 1, 0.1, 120), frameFighter = false) {
  const settings = frameFighter ? SPLIT_CAMERA : FREE_CAMERA;
  return {
    camera, frameFighter, settings, yaw: null, pitch: settings.pitch, distance: settings.distance,
    mouseYaw: 0, mousePitch: 0, mouseIdle: 0, manualYaw: 0, pullback: 0,
    focus: new Vector3(), position: new Vector3(), desired: new Vector3(),
    anchor: new Vector3(), framePoint: new Vector3(),
  };
}

export function resetFreeCamera(rig) {
  rig.yaw = null;
  rig.mouseYaw = rig.mousePitch = rig.mouseIdle = rig.manualYaw = rig.pullback = 0;
  rig.distance = rig.settings.distance;
}

export function orbitFreeCamera(rig, dx, dy) {
  rig.mouseYaw -= dx * 0.006;
  rig.mousePitch = clamp(rig.mousePitch + dy * 0.004, -0.2, 0.7);
  rig.mouseIdle = 0;
}

export function zoomFreeCamera(rig, delta) {
  rig.distance = clamp(rig.distance * Math.exp(delta * 0.001), 3.8, 10);
  rig.mouseIdle = 0;
}

export function turnFreeCamera(rig, input, dt) {
  rig.manualYaw += clamp(input, -1, 1) * Math.max(0, dt) * 1.4;
}

export function updateFreeCamera(rig, player, dt, shakeX = 0, shakeY = 0) {
  const { camera } = rig;
  const firstFrame = rig.yaw === null;
  const elapsed = Math.max(0, dt);
  const aim = staffFrame(player, weaponStats(player).length * 0.55).point;
  if (firstFrame) rig.yaw = player.phi + rig.settings.yawOffset;
  rig.mouseIdle += elapsed;
  if (rig.mouseIdle > 1.5) {
    const settle = Math.exp(-0.8 * elapsed);
    rig.mouseYaw *= settle;
    rig.mousePitch *= settle;
  }
  // Weapon A/D never changes the initialized camera azimuth. Camera input is separate.
  const yaw = rig.yaw + rig.mouseYaw + rig.manualYaw;
  const pitch = clamp(rig.pitch + rig.mousePitch, 0.06, 0.9);
  if (!firstFrame && rig.frameFighter) {
    // Follow translation immediately in the duel, so knockback cannot leave
    // the fighter behind. Smooth the weapon-relative composition separately.
    rig.desired.set(player.p.x, player.p.y, player.p.z).sub(rig.anchor);
    rig.position.add(rig.desired);
    rig.focus.add(rig.desired);
  }
  rig.anchor.set(player.p.x, player.p.y, player.p.z);
  const focusY = rig.frameFighter ? player.p.y + clamp((aim.y - player.p.y) * 0.4,
    0.45 - CONFIG.bodyFloor, 2.6 - CONFIG.bodyFloor) : clamp(player.p.y * 0.6 + aim.y * 0.4, 0.45, 2.6);
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
  if (rig.frameFighter || player.characterId === 'beagle' || player.characterId === 'orange-tabby') fitFighter(rig, player, elapsed, firstFrame);
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
  if(player.characterId==='beagle'||player.characterId==='orange-tabby'){
    const character=CHARACTERS[player.characterId],bounds=character.bounds,angle=player.phi+(player.facingOffset||0),c=Math.cos(angle),s=Math.sin(angle);
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]])points.push({x:player.p.x+x*c-z*s,y:player.p.y+y-character.bodyFloor,z:player.p.z+x*s+z*c});
  }
  if (player.characterId === 'beagle'||player.characterId==='orange-tabby') for (const s of [...weaponSegments(player),...hurtSegments(player)]) for (const p of [s.a, s.b])
    for (const x of [-s.radius-(player.characterId==='orange-tabby'?.14:0), s.radius+(player.characterId==='orange-tabby'?.14:0)]) for (const y of [-s.radius-(player.characterId==='orange-tabby'?.14:0), s.radius+(player.characterId==='orange-tabby'?.14:0)]) for (const z of [-s.radius-(player.characterId==='orange-tabby'?.14:0), s.radius+(player.characterId==='orange-tabby'?.14:0)])
      points.push({ x: p.x + x, y: p.y + y, z: p.z + z });
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
  const far = Math.max(120, rig.pullback + 20);
  if (camera.far !== far) { camera.far = far; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
}
