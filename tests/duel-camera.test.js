import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CONFIG, SOLO_ARENA_SCALE, makePlayer, weaponStats } from '../src/physics.js';
import { FREE_CAMERA, SPLIT_CAMERA, createFreeCameraRig, updateFreeCamera, turnFreeCamera, resetFreeCamera, orbitFreeCamera, zoomFreeCamera } from '../src/free-camera.js';

const createDuelCameraRig = () => createFreeCameraRig(undefined, true);

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

test('fast turns, jumps and knockback keep each fighter inside their own split-screen pane', () => {
  for (const weapon of ['sword', 'polearm', 'hammer']) for (const id of [0, 1]) for (const aspect of [0.3, 0.65, 1.4]) {
    const player = makePlayer(id, weapon);
    const rig = createDuelCameraRig();
    rig.camera.aspect = aspect;
    rig.camera.updateProjectionMatrix();
    let time = 0;
    for (let frame = 0; frame < 240; frame++) {
      const dt = frame % 5 === 0 ? 0.06 : 1 / 60;
      time += dt;
      player.phi += (frame < 120 ? 1 : -1) * weaponStats(player).maxAngularSpeed * dt;
      player.theta += 8 * dt;
      turnFreeCamera(rig, frame < 120 ? -1 : 1, dt);
      player.p.x = Math.sin(time * 3) * 6;
      player.p.z = Math.cos(time * 2) * 6;
      player.p.y = 0.59 + Math.abs(Math.sin(time * 4)) * 5;
      updateFreeCamera(rig, player, dt, Math.sin(time) * 0.15, Math.cos(time) * 0.1);
      assertFighterVisible(rig.camera, player);
    }
  }
});

test('duel pulls farther back at the original eye height, while weapon turning leaves camera azimuth alone', () => {
  const player = makePlayer(0, 'sword');
  const solo = createFreeCameraRig();
  const duel = createDuelCameraRig();
  for (const rig of [solo, duel]) updateFreeCamera(rig, player, 1 / 60);
  assert.equal(duel.camera.fov, 55);
  assert.equal(duel.pitch, SPLIT_CAMERA.pitch);
  assert.equal(duel.distance, 24 * 0.875, 'apply the reviewed 12.5% distance reduction');
  assert.ok(duel.position.x < player.p.x - 8, 'camera should sit behind the fighter');
  const rear = duel.position.clone().sub(new Vector3(player.p.x, player.p.y, player.p.z));
  assert.ok(Math.abs(Math.atan2(-rear.z, -rear.x) - SPLIT_CAMERA.yawOffset) < 1e-8,
    'wider rear view retains the small sideways offset');
  const originalHeight = Math.sin(0.35) * 10.5 + 1.2;
  assert.ok(Math.abs(rear.y - originalHeight) < 1e-10, 'closer view must retain the original eye height exactly');
  assert.ok(Math.hypot(rear.x, rear.z) > 20 && Math.hypot(rear.x, rear.z) < 21,
    'move horizontally closer than the previous 24-unit view');
  assert.ok(duel.pitch < solo.pitch, 'farther rear view keeps a low viewing angle');
  assert.ok(duel.focus.distanceTo(solo.focus) < 1e-8);
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

test('keyboard camera turning is independent for each player and keeps its angle after release', () => {
  const players = [makePlayer(0, 'hammer'), makePlayer(1, 'polearm')];
  const rigs = players.map(() => createDuelCameraRig());
  for (let id = 0; id < 2; id++) updateFreeCamera(rigs[id], players[id], 1 / 60);
  const secondPosition = rigs[1].camera.position.clone();
  for (let frame = 0; frame < 60; frame++) {
    turnFreeCamera(rigs[0], 1, 1 / 60);
    for (let id = 0; id < 2; id++) updateFreeCamera(rigs[id], players[id], 1 / 60);
  }
  const angle = rigs[0].manualYaw;
  assert.ok(angle > 1, 'right camera input must use the corrected positive orbit direction');
  assert.equal(rigs[1].manualYaw, 0);
  assert.ok(rigs[1].camera.position.distanceTo(secondPosition) < 1e-8);
  for (let frame = 0; frame < 300; frame++) {
    turnFreeCamera(rigs[0], 0, 1 / 60);
    updateFreeCamera(rigs[0], players[0], 1 / 60);
  }
  assert.equal(rigs[0].manualYaw, angle, 'released camera keys must not recenter');
  turnFreeCamera(rigs[0], -1, 0.5);
  assert.ok(rigs[0].manualYaw < angle, 'left camera input must reverse the corrected direction');
  resetFreeCamera(rigs[0]);
  updateFreeCamera(rigs[0], players[0], 1 / 60);
  assert.equal(rigs[0].manualYaw, 0);
  assert.equal(rigs[0].distance, SPLIT_CAMERA.distance);
  assert.equal(rigs[0].yaw, players[0].phi + SPLIT_CAMERA.yawOffset);
});

test('solo mouse orbit still recenters and zoom retains its bounds', () => {
  const player = makePlayer(0);
  const rig = createFreeCameraRig();
  updateFreeCamera(rig, player, 1 / 60);
  assert.equal(rig.yaw, player.phi + FREE_CAMERA.yawOffset, 'solo keeps its side-on start');
  orbitFreeCamera(rig, 100, 100);
  updateFreeCamera(rig, player, 1);
  assert.equal(rig.mouseYaw, -0.6);
  updateFreeCamera(rig, player, 1);
  assert.ok(Math.abs(rig.mouseYaw) < 0.6);
  zoomFreeCamera(rig, 1e6);
  assert.equal(rig.distance, 10);
  zoomFreeCamera(rig, -1e6);
  assert.equal(rig.distance, 3.8);
  resetFreeCamera(rig);
  assert.equal(rig.distance, FREE_CAMERA.distance);
});

test('a narrow resize makes room immediately and the camera eases back after the pane widens', () => {
  const player = makePlayer(0);
  const rig = createDuelCameraRig();
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

test('both rear views show the far arena rim at the start in narrow and wide panes', () => {
  for (const id of [0, 1]) for (const aspect of [0.54, 1.1]) {
    const player = makePlayer(id, id === 0 ? 'sword' : 'polearm');
    const rig = createDuelCameraRig();
    rig.camera.aspect = aspect;
    rig.camera.updateProjectionMatrix();
    updateFreeCamera(rig, player, 1 / 60);
    const forward = rig.camera.getWorldDirection(new Vector3()).setY(0).normalize();
    const radius = CONFIG.arenaRadius * SOLO_ARENA_SCALE;
    const along = player.p.x * forward.x + player.p.z * forward.z;
    const distance = -along + Math.sqrt(along ** 2 + radius ** 2 - player.p.x ** 2 - player.p.z ** 2);
    const rim = new Vector3(player.p.x + forward.x * distance, 0.2, player.p.z + forward.z * distance).project(rig.camera);
    assert.ok(Math.abs(rim.x) < 1 && rim.y > 0 && rim.y < 1, 'far rim should be visible in the upper half of the pane');
    assertFighterVisible(rig.camera, player);
  }
});

test('selected wider view reveals substantially more playable floor than the previous close view', () => {
  const radius = CONFIG.arenaRadius * SOLO_ARENA_SCALE;
  for (const id of [0, 1]) for (const aspect of [0.54, 1.1]) {
    const player = makePlayer(id);
    const visibleFloor = previous => {
      const rig = createDuelCameraRig();
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
