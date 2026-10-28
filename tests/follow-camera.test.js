import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CONFIG, MATCH_ARENA_SCALE, makePlayer, weaponStats } from '../src/physics.js';
import { FOLLOW_CAMERA, LOOK_SPEED, SENSITIVITY_RANGE, cameraYaw, createFreeCameraRig, updateFreeCamera, resetFreeCamera, orbitFreeCamera, zoomFreeCamera } from '../src/free-camera.js';

function assertFighterVisible(camera, player) {
  // Enclose the rendered head, body and name-label anchor, independently of
  // the more conservative camera fitting box.
  for (const x of [-0.4, 0.4]) for (const y of [-0.55, 1.56]) for (const z of [-0.4, 0.4]) {
    const screen = new Vector3(player.p.x + x, player.p.y + y, player.p.z + z).project(camera);
    assert.ok(Math.abs(screen.x) <= 0.73, `fighter left the horizontal safe area: ${screen.x}`);
    assert.ok(screen.y >= -0.73 && screen.y <= 0.51, `fighter left the vertical safe area: ${screen.y}`);
    assert.ok(screen.z > -1 && screen.z < 1, 'fighter was clipped in front of or behind the camera');
  }
}

test('fast turns, mouse orbit, jumps and knockback keep the fighter inside the follow view', () => {
  for (const weapon of ['sword', 'polearm', 'hammer']) for (const id of [0, 1]) for (const aspect of [0.3, 0.65, 1.4]) {
    const player = makePlayer(id, weapon);
    const rig = createFreeCameraRig();
    rig.camera.aspect = aspect;
    rig.camera.updateProjectionMatrix();
    let time = 0;
    for (let frame = 0; frame < 240; frame++) {
      const dt = frame % 5 === 0 ? 0.06 : 1 / 60;
      time += dt;
      player.phi += (frame < 120 ? 1 : -1) * weaponStats(player).maxAngularSpeed * dt;
      player.theta += 8 * dt;
      orbitFreeCamera(rig, frame < 120 ? 6 : -6, 0);
      player.p.x = Math.sin(time * 3) * 6;
      player.p.z = Math.cos(time * 2) * 6;
      player.p.y = 0.59 + Math.abs(Math.sin(time * 4)) * 5;
      updateFreeCamera(rig, player, dt, Math.sin(time) * 0.15, Math.cos(time) * 0.1);
      assertFighterVisible(rig.camera, player);
    }
  }
});

test('the follow view sits close behind at a raised angle, while weapon turning leaves camera azimuth alone', () => {
  const player = makePlayer(0, 'sword');
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.camera.fov, 55);
  assert.equal(rig.pitch, FOLLOW_CAMERA.pitch);
  assert.equal(rig.distance, 13);
  const rear = rig.position.clone().sub(new Vector3(player.p.x, player.p.y, player.p.z));
  assert.ok(Math.abs(Math.atan2(-rear.z, -rear.x) - player.phi) < 1e-8, 'starts straight behind, facing the opponent');
  assert.ok(Math.abs(rear.y - (Math.sin(FOLLOW_CAMERA.pitch) * 13 + 1.2)) < 1e-10);
  const yaw = rig.yaw, position = rig.position.clone();
  player.phi += Math.PI;
  player.theta = Math.PI;
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.yaw, yaw, 'weapon steering must not orbit the view');
  assert.ok(rig.position.distanceTo(position) < 1e-8);
  const before = rig.position.clone();
  player.p.x += 5; player.p.y += 9; player.p.z -= 3;
  updateFreeCamera(rig, player, 0);
  assert.ok(rig.position.clone().sub(before).distanceTo(new Vector3(5, 9, -3)) < 1e-8);
  assertFighterVisible(rig.camera, player);
});

test('mouse look is gentle, turns the way the mouse moves, scales with sensitivity, ignores spikes, and resets on rematch', () => {
  const player = makePlayer(0, 'hammer');
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  assert.ok(LOOK_SPEED.yaw * 100 < 0.1, '100 px turns only a few degrees');
  // Moving the mouse right swings the rendered view toward the camera's right.
  const right = new Vector3(1, 0, 0).applyQuaternion(rig.camera.quaternion);
  const before = rig.camera.getWorldDirection(new Vector3());
  orbitFreeCamera(rig, 100, 0);
  assert.ok(Math.abs(rig.mouseYaw - 100 * LOOK_SPEED.yaw) < 1e-12);
  for (let frame = 0; frame < 120; frame++) updateFreeCamera(rig, player, 1 / 60);
  const after = rig.camera.getWorldDirection(new Vector3());
  assert.ok(after.dot(right) > before.dot(right) + 0.03, 'mouse right turns the view right');
  assert.equal(cameraYaw(rig), rig.yaw + rig.mouseYaw, 'the body faces where the camera looks');
  // Mouse down looks down (the camera rises), unless inverted.
  orbitFreeCamera(rig, 0, 50);
  assert.ok(rig.mousePitch > 0);
  rig.invertY = true;
  orbitFreeCamera(rig, 0, 50);
  assert.ok(Math.abs(rig.mousePitch) < 1e-12);
  rig.invertY = false;
  rig.sensitivity = 2;
  orbitFreeCamera(rig, -100, 0);
  assert.ok(Math.abs(rig.mouseYaw + 100 * LOOK_SPEED.yaw) < 1e-12);
  rig.sensitivity = 50;
  const clamped = rig.mouseYaw;
  orbitFreeCamera(rig, 10, 0);
  assert.ok(Math.abs(rig.mouseYaw - clamped - 10 * LOOK_SPEED.yaw * SENSITIVITY_RANGE.max) < 1e-12, 'sensitivity is bounded');
  const steady = rig.mouseYaw;
  orbitFreeCamera(rig, 900, 0);
  orbitFreeCamera(rig, NaN, 0);
  assert.equal(rig.mouseYaw, steady, 'single-event jumps are dropped');
  const forward = rig.camera.getWorldDirection(new Vector3());
  updateFreeCamera(rig, player, 10);
  rig.camera.getWorldDirection(forward);
  const rendered = Math.atan2(forward.z, forward.x);
  assert.ok(Math.abs(Math.atan2(Math.sin(rendered - cameraYaw(rig)), Math.cos(rendered - cameraYaw(rig)))) < 0.2, 'cameraYaw matches the rendered look direction');
  for (let frame = 0; frame < 300; frame++) updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.mouseYaw, steady, 'released mouse must not recenter the view');
  orbitFreeCamera(rig, 0, 200); orbitFreeCamera(rig, 0, 200); orbitFreeCamera(rig, 0, 200);
  assert.equal(rig.mousePitch, 0.6);
  zoomFreeCamera(rig, 1e6);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance * 1.4);
  zoomFreeCamera(rig, -1e6);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance * 0.45);
  resetFreeCamera(rig);
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.mouseYaw, 0);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance);
});

test('a narrow resize makes room immediately and the camera eases back after the pane widens', () => {
  const player = makePlayer(0);
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  // Squeeze the pane far enough to force the emergency pullback.
  rig.camera.aspect = 0.04;
  rig.camera.updateProjectionMatrix();
  updateFreeCamera(rig, player, 1 / 60);
  const pullback = rig.pullback;
  assert.ok(pullback > 0, 'narrow pane should trigger more framing distance');
  assertFighterVisible(rig.camera, player);
  rig.camera.aspect = 1.2;
  rig.camera.updateProjectionMatrix();
  updateFreeCamera(rig, player, 1 / 60);
  assert.ok(rig.pullback > 0 && rig.pullback < pullback, 'return to normal distance should be gradual');
  assertFighterVisible(rig.camera, player);
  resetFreeCamera(rig); // Rematch starts from the default view.
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.pullback, 0);
  assertFighterVisible(rig.camera, player);
});

test('the rear view shows the far arena rim at the start in narrow and wide windows', () => {
  for (const id of [0, 1]) for (const aspect of [0.54, 1.1]) {
    const player = makePlayer(id, id === 0 ? 'sword' : 'polearm');
    const rig = createFreeCameraRig();
    rig.camera.aspect = aspect;
    rig.camera.updateProjectionMatrix();
    updateFreeCamera(rig, player, 1 / 60);
    const forward = rig.camera.getWorldDirection(new Vector3()).setY(0).normalize();
    const radius = CONFIG.arenaRadius * MATCH_ARENA_SCALE;
    const along = player.p.x * forward.x + player.p.z * forward.z;
    const distance = -along + Math.sqrt(along ** 2 + radius ** 2 - player.p.x ** 2 - player.p.z ** 2);
    const rim = new Vector3(player.p.x + forward.x * distance, 0.2, player.p.z + forward.z * distance).project(rig.camera);
    assert.ok(Math.abs(rim.x) < 1 && rim.y > 0 && rim.y < 1, 'far rim should be visible in the upper half of the pane');
    assertFighterVisible(rig.camera, player);
  }
});
