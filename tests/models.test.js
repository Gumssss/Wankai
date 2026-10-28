import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { buildCharacter } from '../src/models/characters.js';
import { buildWeapon, FLOATING_WEAPONS } from '../src/models/weapons.js';
import { CHARACTERS } from '../src/character-catalog.js';
import { CHARACTER_MODELS, characterModel } from '../src/models/character-assets.js';
import { WEAPONS, makePlayer, fighterHeading, hurtSegments, v3 } from '../src/physics.js';

// Visible meshes only: ink outlines are deliberately a hair larger, and
// hidden ones (奶蛙's laughing pose at rest) are not seen.
const shown = object => { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; };
function meshBox(root, skip = () => false) {
  root.updateMatrixWorld(true);
  const box = new Box3();
  root.traverse(object => {
    if (!object.isMesh || object.userData.outline || skip(object) || !shown(object)) return;
    object.geometry.computeBoundingBox();
    box.union(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));
  });
  return box;
}
const posed = (loadout, setup = () => {}) => {
  const player = makePlayer(0, loadout);
  player.p = v3();
  setup(player);
  const built = buildCharacter(loadout, 0);
  built.root.rotation.y = -fighterHeading(player);
  built.pose(player, 0);
  built.root.updateMatrixWorld(true);
  return { player, built };
};

test('every body stays inside its catalogued silhouette, feet on the floor', () => {
  for (const loadout of [{ characterId: 'naiwa', weaponId: 'yellow-staff' }, { characterId: 'stickman', weaponId: 'sword' },
    { characterId: 'dudu', weaponId: 'takeout-box' }, { characterId: 'happy-cat', weaponId: 'happy-paws' }]) {
    const character = CHARACTERS[loadout.characterId];
    const { built } = posed(loadout, player => { player.phi = player.bodyYaw = 0; });
    const box = meshBox(built.root);
    const floor = -character.bodyFloor, slack = 0.08;
    assert.ok(Math.abs(box.min.y - floor) < 0.05, `${loadout.characterId} feet at ${box.min.y}`);
    assert.ok(box.max.y - floor <= character.bounds.max[1] + 0.05, `${loadout.characterId} top ${box.max.y - floor}`);
    assert.ok(box.max.y - floor >= character.bounds.max[1] - 0.15, `${loadout.characterId} is as tall as its hurt shapes`);
    for (const axis of ['x', 'z']) {
      const index = axis === 'x' ? 0 : 2;
      assert.ok(box.min[axis] >= character.bounds.min[index] - slack && box.max[axis] <= character.bounds.max[index] + slack,
        `${loadout.characterId} ${axis} ${box.min[axis]}..${box.max[axis]}`);
    }
  }
});

test('every hurt shape centre sits inside the visible body, so what is hit is what you see', () => {
  for (const loadout of [{ characterId: 'naiwa', weaponId: 'yellow-staff' }, { characterId: 'stickman', weaponId: 'sword' },
    { characterId: 'dudu', weaponId: 'takeout-box' }, { characterId: 'happy-cat', weaponId: 'happy-paws' }]) {
    const { player, built } = posed(loadout, p => { p.phi = p.bodyYaw = 0; });
    const box = meshBox(built.root);
    for (const shape of hurtSegments(player)) for (const point of [shape.a, shape.b])
      assert.ok(box.containsPoint(new Vector3(point.x, point.y, point.z)), `${loadout.characterId} hurt shape outside the model`);
  }
});

test('奶蛙 rocks its head back and forth while laughing and eases back to rest', () => {
  const { player, built } = posed({ characterId: 'naiwa', weaponId: 'yellow-staff' });
  const upper = built.face;
  let time = 0;
  const step = (laughing, seconds) => {
    const angles = [];
    Object.assign(player, { skill: 'laugh', skillActive: laughing });
    for (let i = 0; i < seconds * 60; i++) { time += 1 / 60; built.pose(player, time); angles.push(upper.rotation.z); }
    return angles;
  };
  step(false, 0.5);
  assert.equal(upper.rotation.z, 0);
  const laugh = step(true, 3);
  const steady = laugh.slice(60);
  assert.ok(Math.max(...steady) > 0.3 && Math.min(...steady) < 0.05, 'the head tips back and dips forward');
  for (let i = 1; i < laugh.length; i++) assert.ok(Math.abs(laugh[i] - laugh[i - 1]) < 0.08, 'no snapping between frames');
  const after = step(false, 2);
  for (let i = 1; i < after.length; i++) assert.ok(Math.abs(after[i] - after[i - 1]) < 0.08, 'eases out smoothly');
  assert.ok(Math.abs(after.at(-1)) < 0.01, 'back at rest');
});

test('开心小猫 stands as tall as the other imported fighters and keeps its feet on the floor', () => {
  const height = id => { const { built } = posed({ characterId: id, weaponId: 'sword' }); const box = meshBox(built.root); return box.max.y - box.min.y; };
  const cat = height('happy-cat');
  assert.ok(cat >= height('naiwa') - 0.05 && cat <= height('dudu') + 0.05, `cat ${cat} m`);
  const { player, built } = posed({ characterId: 'happy-cat', weaponId: 'happy-paws' });
  // The idle dance sways but never leaves the floor; only Happy Happy hops.
  for (let time = 0; time < 3; time += 1 / 30) {
    built.pose(player, time);
    assert.ok(Math.abs(meshBox(built.root).min.y + CHARACTERS['happy-cat'].bodyFloor) < 0.05, `feet off the floor at ${time}`);
  }
});

test('floating weapons run from the butt at the origin to their full contact length', () => {
  for (const type of FLOATING_WEAPONS) {
    const { root } = buildWeapon(type, 0);
    const box = meshBox(root), weapon = WEAPONS[type];
    assert.ok(box.min.y > -0.12, `${type} butt sits at the origin`);
    const top = Math.max(weapon.length, ...weapon.colliders.map(c => Math.max(c.a[1], c.b[1]) + c.radius));
    assert.ok(box.max.y <= top + 0.03 && box.max.y >= weapon.length - 0.1, `${type} reaches ${box.max.y} of ${weapon.length}`);
    for (const collider of weapon.colliders) for (const point of [collider.a, collider.b])
      assert.ok(box.clone().expandByScalar(0.03).containsPoint(new Vector3(...point)), `${type} contact outside the model`);
  }
});

test('each fighter owns its materials, and the hit flash fades back to the base colours', () => {
  const loadout = { characterId: 'stickman', weaponId: 'hammer' };
  const first = buildCharacter(loadout, 0), second = buildCharacter(loadout, 1);
  const shared = first.kit.materials.filter(material => second.kit.materials.includes(material));
  assert.equal(shared.length, 0);
  assert.notEqual(first.kit.materials[0].color.getHex(), second.kit.materials[0].color.getHex(), 'player colours differ');
  const player = makePlayer(0, loadout), base = first.kit.materials.map(m => m.color.getHex());
  player.hitFlash = 1;
  first.pose(player, 0);
  assert.notDeepEqual(first.kit.materials.map(m => m.color.getHex()), base);
  player.hitFlash = 0;
  first.pose(player, 0);
  assert.deepEqual(first.kit.materials.map(m => m.color.getHex()), base);
});

test('imported fighters own their materials too, and flash through emission', () => {
  for (const loadout of [{ characterId: 'naiwa', weaponId: 'yellow-staff' }, { characterId: 'dudu', weaponId: 'takeout-box' },
    { characterId: 'happy-cat', weaponId: 'happy-paws' }]) {
    const first = buildCharacter(loadout, 0), second = buildCharacter(loadout, 1);
    assert.equal(first.kit.materials.filter(material => second.kit.materials.includes(material)).length, 0, `${loadout.characterId} shares materials`);
    const geometries = new Set();
    second.root.traverse(object => { if (object.isMesh) geometries.add(object.geometry); });
    first.root.traverse(object => { if (object.isMesh && object.name) assert.ok(!geometries.has(object.geometry), `${object.name} geometry shared (it bends per fighter)`); });
    const player = makePlayer(0, loadout), base = first.kit.materials.map(m => m.emissive.getHex());
    player.hitFlash = 1;
    first.pose(player, 0);
    assert.notDeepEqual(first.kit.materials.map(m => m.emissive.getHex()), base);
    player.hitFlash = 0;
    first.pose(player, 0);
    assert.deepEqual(first.kit.materials.map(m => m.emissive.getHex()), base);
  }
});

test('奶蛙 swaps to the laughing model while laughing and back afterwards, fading through both', () => {
  const { player, built } = posed({ characterId: 'naiwa', weaponId: 'yellow-staff' });
  const stance = built.root.getObjectByName('naiwa'), laughing = built.root.getObjectByName('naiwa-laugh');
  assert.ok(stance.visible && !laughing.visible, 'the stance at rest');
  let time = 0, both = 0;
  const run = (active, seconds) => {
    Object.assign(player, { skill: 'laugh', skillActive: active });
    for (let i = 0; i < seconds * 60; i++) {
      time += 1 / 60;
      built.pose(player, time);
      if (stance.visible && laughing.visible) both++;
      // Never a frame with neither model.
      assert.ok(stance.material.opacity + laughing.material.opacity > 0.99);
    }
  };
  run(true, 2);
  assert.ok(!stance.visible && laughing.visible && laughing.material.opacity === 1, 'laughing model while laughing');
  run(false, 2);
  assert.ok(stance.visible && !laughing.visible && stance.material.opacity === 1, 'the stance again afterwards');
  assert.ok(both > 4, 'the two poses cross-fade instead of popping');
});

test('imported models fit the game budget', () => {
  for (const id of CHARACTER_MODELS) {
    const { geometry } = characterModel(id), triangles = geometry.index.count / 3;
    assert.ok(triangles >= 15000 && triangles <= 30000, `${id}: ${triangles} triangles`);
    assert.ok(geometry.getAttribute('uv') && geometry.getAttribute('normal'), `${id} has UVs and normals`);
  }
});
