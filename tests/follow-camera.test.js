import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CONFIG, MATCH_ARENA_SCALE, makePlayer, weaponStats } from '../src/physics.js';
import { FOLLOW_CAMERA, cameraYaw, createFreeCameraRig, updateFreeCamera, resetFreeCamera, orbitFreeCamera, zoomFreeCamera } from '../src/free-camera.js';

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

test('the follow view sits far behind at the original eye height, while weapon turning leaves camera azimuth alone', () => {
  const player = makePlayer(0, 'sword');
  const duel = createFreeCameraRig();
  updateFreeCamera(duel, player, 1 / 60);
  assert.equal(duel.camera.fov, 55);
  assert.equal(duel.pitch, FOLLOW_CAMERA.pitch);
  assert.equal(duel.distance, 24 * 0.875, 'apply the reviewed 12.5% distance reduction');
  assert.ok(duel.position.x < player.p.x - 8, 'camera should sit behind the fighter');
  const rear = duel.position.clone().sub(new Vector3(player.p.x, player.p.y, player.p.z));
  assert.ok(Math.abs(Math.atan2(-rear.z, -rear.x) - FOLLOW_CAMERA.yawOffset) < 1e-8,
    'wider rear view retains the small sideways offset');
  const originalHeight = Math.sin(0.35) * 10.5 + 1.2;
  assert.ok(Math.abs(rear.y - originalHeight) < 1e-10, 'closer view must retain the original eye height exactly');
  assert.ok(Math.hypot(rear.x, rear.z) > 20 && Math.hypot(rear.x, rear.z) < 21,
    'move horizontally closer than the previous 24-unit view');
  assert.ok(duel.pitch < 0.2, 'farther rear view keeps a low viewing angle');
  const yaw = duel.yaw;
  const position = duel.position.clone();
  player.phi += Math.PI;
  player.theta = Math.PI;
  updateFreeCamera(duel, player, 1 / 60);
  assert.equal(duel.yaw, yaw, 'weapon steering must not orbit the view');
  assert.ok(duel.position.distanceTo(position) < 1e-8);
  const before = duel.position.clone();
  player.p.x += 5; player.p.y += 9; player.p.z -= 3;
  updateFreeCamera(duel, player, 0);
  assert.ok(duel.position.clone().sub(before).distanceTo(new Vector3(5, 9, -3)) < 1e-8);
  assertFighterVisible(duel.camera, player);
});

test('mouse orbit keeps its angle after release, resets on rematch, and zoom stays bounded', () => {
  const player = makePlayer(0, 'hammer');
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.yaw, player.phi + FOLLOW_CAMERA.yawOffset, 'starts behind the fighter');
  orbitFreeCamera(rig, 100, 100);
  assert.equal(rig.mouseYaw, -0.6);
  assert.equal(cameraYaw(rig), rig.yaw - 0.6, 'the body faces where the camera looks');
  const forward = rig.camera.getWorldDirection(new Vector3());
  updateFreeCamera(rig, player, 10);
  rig.camera.getWorldDirection(forward);
  assert.ok(Math.abs(Math.atan2(Math.sin(Math.atan2(forward.z, forward.x) - cameraYaw(rig)), Math.cos(Math.atan2(forward.z, forward.x) - cameraYaw(rig)))) < 0.2,
    'cameraYaw matches the rendered horizontal look direction');
  for (let frame = 0; frame < 300; frame++) updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.mouseYaw, -0.6, 'released mouse must not recenter the view');
  orbitFreeCamera(rig, 0, 1e6);
  assert.equal(rig.mousePitch, 0.7);
  zoomFreeCamera(rig, 1e6);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance * 1.4);
  zoomFreeCamera(rig, -1e6);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance * 0.45);
  resetFreeCamera(rig);
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.mouseYaw, 0);
  assert.equal(rig.distance, FOLLOW_CAMERA.distance);
  assert.equal(rig.yaw, player.phi + FOLLOW_CAMERA.yawOffset);
});

test('a narrow resize makes room immediately and the camera eases back after the pane widens', () => {
  const player = makePlayer(0);
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  // The selected wider default already fits at 0.08; squeeze farther to
  // exercise the same emergency pullback and smooth recovery behavior.
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

test('selected wider view reveals substantially more playable floor than the previous close view', () => {
  const radius = CONFIG.arenaRadius * MATCH_ARENA_SCALE;
  for (const id of [0, 1]) for (const aspect of [0.54, 1.1]) {
    const player = makePlayer(id);
    const visibleFloor = previous => {
      const rig = createFreeCameraRig();
      rig.camera.aspect = aspect;
      rig.camera.updateProjectionMatrix();
      if (previous) { rig.pitch = 0.35; rig.distance = 10.5; }
      updateFreeCamera(rig, player, 1 / 60);
      let visible = 0;
      for (let x = -19; x <= 19; x++) for (let z = -19; z <= 19; z++) {
        if (x * x + z * z > radius * radius) continue;
        const screen = new Vector3(x, 0, z).project(rig.camera);
        if (Math.abs(screen.x) < 1 && Math.abs(screen.y) < 1 && Math.abs(screen.z) < 1) visible++;
      }
      assertFighterVisible(rig.camera, player);
      return visible;
    };
    assert.ok(visibleFloor(false) > visibleFloor(true) * 1.6,
      'closer view should still reveal more floor than the original close view');
  }
});
