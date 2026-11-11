import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Vector3 } from 'three';
import { CHARACTERS } from '../src/character-catalog.js';
import { PLAYABLE_LOADOUTS, canEquip, resolveLoadout } from '../src/loadouts.js';
import { ArenaPhysics, CONFIG, makePlayer, v3, weaponSegments, hurtSegments, closestSegments } from '../src/physics.js';
import { buildCharacter } from '../src/models/characters.js';
import { buildWeapon } from '../src/models/weapons.js';
import { characterModel } from '../src/models/character-assets.js';
import { disposeObject } from '../src/models/toy-kit.js';

const choices = [
  { characterId: 'cr7', weaponId: 'soccer-ball' },
  { characterId: 'mean-girl', weaponId: 'crowned-heart' },
  { characterId: 'maodie', weaponId: 'maodie-paw' },
];
const common = ['sword', 'polearm', 'hammer', 'axe', 'mace', 'pan'];

test('three distinct Drive characters equip their signatures and common weapons with character-owned F skills', () => {
  assert.equal(PLAYABLE_LOADOUTS.length, 56);
  for (const choice of choices) {
    for (const weaponId of [choice.weaponId, ...common]) {
      const loadout = { ...choice, weaponId };
      assert.equal(resolveLoadout(loadout).skill?.id??null,({cr7:'ricochet','mean-girl':'perfume',maodie:'lifesteal'})[choice.characterId]??null);
      const world = new ArenaPhysics();
      world.reset(loadout, { characterId: 'stickman', weaponId: 'sword' });
      world.players[0].grounded=true;
      world.step([{ skillTap: true }, {}]);
      assert.equal(world.players[0].skillActive, true);
      assert.equal(world.players[0].maxHealth, 100);
    }
    for (const other of choices.filter(other => other !== choice)) assert.equal(canEquip(other.characterId, choice.weaponId), false);
  }
  assert.equal(canEquip('happy-cat', 'maodie-paw'), false);
  assert.equal(canEquip('orange-tabby', 'maodie-paw'), false);
});

test('OBJ UVs retain the original CR7 texture registration after glTF conversion', () => {
  // The first original OBJ corner has vt 0.980712891 0.783691406.
  // glTF's image origin is opposite OBJ's vertical UV convention.
  const uv = characterModel('cr7').geometry.getAttribute('uv');
  assert.ok(Math.abs(uv.getX(0) - .980712891) < 1e-6);
  assert.ok(Math.abs(uv.getY(0) - .216308594) < 1e-6);
});

test('Maodie preserves linear vertex colours and independent player materials', () => {
  for (const id of ['maodie', 'maodie-paw']) {
    const geometry = characterModel(id).geometry;
    const colors = geometry.getAttribute('color');
    assert.ok(colors && colors.count === geometry.getAttribute('position').count);
    assert.ok(colors.array.every(value => value >= 0 && value <= 1));
    assert.ok(Math.max(...colors.array) - Math.min(...colors.array) > .5);
  }
  const first = buildCharacter(choices[2], 0), second = buildCharacter(choices[2], 1);
  assert.notEqual(first.kit.materials[0], second.kit.materials[0]);
  assert.equal(first.kit.materials[0].vertexColors, true);
  const p = makePlayer(0, choices[2]);
  p.hitFlash = 1;
  first.pose(p, 0);
  assert.notEqual(first.kit.materials[0].emissive.getHex(), second.kit.materials[0].emissive.getHex());
  disposeObject(first.root);
  const third = buildCharacter(choices[2], 0);
  assert.ok(third.root.children.length);
});

test('all imported body silhouettes and hurt centres fit the measured character frame', () => {
  for (const choice of choices) {
    const built = buildCharacter(choice), stats = CHARACTERS[choice.characterId];
    const box = new Box3().setFromObject(built.root);
    assert.ok(Math.abs(box.min.y + stats.bodyFloor) < .01);
    const expected = new Box3(new Vector3(...stats.bounds.min), new Vector3(...stats.bounds.max));
    expected.translate(new Vector3(0, -stats.bodyFloor, 0)).expandByScalar(.01);
    assert.ok(expected.containsBox(box));
    const p = makePlayer(0, choice);
    p.p = v3(); p.phi = p.bodyYaw = 0;
    for (const hurt of hurtSegments(p)) for (const q of [hurt.a, hurt.b]) assert.ok(box.containsPoint(new Vector3(q.x, q.y, q.z)));
    const weapon = buildWeapon(choice.weaponId);
    assert.ok(new Box3().setFromObject(weapon.root).max.y > .9);
  }
});

test('new character equipment clears body contacts throughout full swing and yaw sweeps', () => {
  for (const choice of choices) for (const weaponId of [choice.weaponId, ...common]) {
    const p = makePlayer(0, { ...choice, weaponId }); p.p = v3(); p.bodyYaw = .31;
    for (let pitch = 0; pitch < 24; pitch++) for (let yaw = 0; yaw < 12; yaw++) {
      p.theta = pitch * Math.PI / 12; p.phi = yaw * Math.PI / 6;
      for (const weapon of weaponSegments(p)) for (const hurt of hurtSegments(p)) {
        const gap = closestSegments(weapon.a, weapon.b, hurt.a, hurt.b).distance - weapon.radius - hurt.radius;
        assert.ok(gap >= .015, `${choice.characterId}/${weaponId} overlaps at ${pitch}/${yaw}: ${gap}`);
      }
    }
  }
});

test('each new signature supports all eight normal input combinations and real floor-driven travel', () => {
  const matrix = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for (const choice of choices) {
    let supported = false, moved = false;
    for (const [theta, phi] of matrix) {
      const world = new ArenaPhysics();
      world.reset(choice, { characterId: 'stickman', weaponId: 'sword' }, { endless: true });
      world.players[1].p.x = 12;
      const start = { ...world.players[0].p };
      for (let i = 0; i < 360; i++) {
        world.step([{ theta, phi }, {}]);
        const p = world.players[0];
        supported ||= p.staffGrounded;
        moved ||= Math.hypot(p.p.x - start.x, p.p.z - start.z) > .1;
        assert.ok(Object.values(p.p).every(Number.isFinite));
        assert.equal(p.skillActive, false);
      }
    }
    assert.ok(supported && moved, `${choice.characterId} has physical support and travel`);
  }
});
