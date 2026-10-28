import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_OBSTACLES, obstacleContact, obstacleBlocksSegment } from '../src/arena-obstacles.js';
import { ArenaPhysics, CONFIG, MATCH_ARENA_SCALE, weaponSegments, bodyRadius, v3 } from '../src/physics.js';
import { PLAYABLE_LOADOUTS } from '../src/loadouts.js';

const arena = (first = 'polearm', second = 'polearm', obstacles = ARENA_OBSTACLES) => {
  const world = new ArenaPhysics();
  world.reset(first, second, { arenaScale: MATCH_ARENA_SCALE, obstacles, endless: true });
  return world;
};
const pillar = ARENA_OBSTACLES.find(o => o.kind === 'pillar');
const wall = ARENA_OBSTACLES.find(o => o.kind === 'wall' && o.angle === 0);
const inside = (o, p, radius) => o && p.y - CONFIG.bodyFloor < o.height && obstacleContact(o, p.x, p.z, radius);

test('the layout is point-symmetric, inside the rim, and leaves both start positions open', () => {
  const radius = CONFIG.arenaRadius * MATCH_ARENA_SCALE;
  for (const o of ARENA_OBSTACLES) {
    assert.ok(ARENA_OBSTACLES.some(other => other.kind === o.kind && Math.abs(other.x + o.x) < 1e-9 && Math.abs(other.z + o.z) < 1e-9), 'mirrored');
    assert.ok(Math.hypot(o.x, o.z) + o.extent < radius - 2, 'room to pass behind every prop');
    for (const x of [-2.2, 2.2]) assert.equal(obstacleContact(o, x, 0, 3.5), null, 'start positions stay open');
  }
});

test('contact normals point out of pillars and walls with the right depth', () => {
  const p = obstacleContact(pillar, pillar.x + 1.2, pillar.z, 0.5);
  assert.ok(Math.abs(p.depth - 0.2) < 1e-9);
  assert.ok(Math.abs(Math.hypot(p.nx, p.nz) - 1) < 1e-12);
  const side = obstacleContact(wall, wall.x + 0.5, wall.z + 0.6, 0.3);
  assert.ok(Math.abs(side.nz - 1) < 1e-12 && Math.abs(side.depth - 0.15) < 1e-9);
  const centre = obstacleContact(wall, wall.x + 2.3, wall.z, 0.2);
  assert.ok(centre.nx > 0.99 && Math.abs(centre.depth - 0.3) < 1e-9, 'a point inside leaves through the nearest face');
  const turned = ARENA_OBSTACLES.find(o => o.kind === 'wall' && o.angle !== 0);
  const along = obstacleContact(turned, turned.x, turned.z + 2.6, 0.3);
  assert.ok(along && along.nz > 0.99, 'rotated walls run along their angle');
  assert.equal(obstacleBlocksSegment(pillar, { x: 0, y: 1, z: 0 }, { x: pillar.x * 2, y: 1, z: pillar.z * 2 }), true);
  assert.equal(obstacleBlocksSegment(pillar, { x: 0, y: 9, z: 0 }, { x: pillar.x * 2, y: 9, z: pillar.z * 2 }), false, 'clear above the top');
});

test('bodies slide around props instead of passing through them', () => {
  for (const target of [pillar, wall]) {
    const world = arena('sword', 'sword');
    const [p] = world.players;
    const approach = target.kind === 'pillar' ? { x: target.x / Math.hypot(target.x, target.z), z: target.z / Math.hypot(target.x, target.z) } : { x: 0, z: Math.sign(target.z) };
    p.p = v3(target.x - approach.x * 3, CONFIG.bodyFloor, target.z - approach.z * 3);
    world.players[1].p = v3(-target.x, CONFIG.bodyFloor, -target.z);
    for (let i = 0; i < 360; i++) {
      p.v.x = approach.x * 8; p.v.z = approach.z * 8;
      world.step([{}, {}]);
      assert.ok(!inside(target, p.p, bodyRadius(p) - 1e-6), 'body entered a prop');
    }
  }
});

test('a weapon swung into a pillar is stopped by it, and levers the fighter away', () => {
  const run = obstacles => {
    const world = arena('polearm', 'polearm', obstacles);
    const [p] = world.players;
    // Level weapon pointing sideways (+z), then turned toward the pillar (+x).
    p.p = v3(pillar.x - 2.6, CONFIG.bodyFloor, pillar.z);
    p.theta = Math.PI / 2; p.phi = Math.PI / 2;
    world.players[1].p = v3(-pillar.x, CONFIG.bodyFloor, -pillar.z);
    let deepest = 0;
    for (let i = 0; i < 180; i++) {
      world.step([{ theta: 0, phi: -1 }, {}]);
      for (const segment of weaponSegments(p)) for (const point of [segment.a, segment.b]) {
        const contact = point.y < pillar.height && obstacleContact(pillar, point.x, point.z, segment.radius);
        if (contact) deepest = Math.max(deepest, contact.depth);
      }
    }
    return { p, deepest };
  };
  const blocked = run(ARENA_OBSTACLES), open = run([]);
  assert.ok(blocked.deepest < 0.25, `the shaft sank ${blocked.deepest} into the pillar`);
  assert.ok(Math.hypot(blocked.p.p.x - open.p.p.x, blocked.p.p.z - open.p.p.z) > 0.05, 'pushing on the prop moved the body');
});

test('every loadout stays finite, inside the rim and outside props under random play', () => {
  let seed = 9;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const first of PLAYABLE_LOADOUTS) {
    const second = PLAYABLE_LOADOUTS[Math.floor(random() * PLAYABLE_LOADOUTS.length)];
    const world = arena(first, second);
    let inputs = [{}, {}];
    for (let i = 0; i < 180 * 12; i++) {
      if (i % 45 === 0) inputs = [0, 1].map(() => ({ theta: Math.round(random() * 2 - 1), phi: Math.round(random() * 2 - 1), skill: random() < 0.05 }));
      world.step(inputs);
    }
    for (const p of world.players) {
      assert.ok(Number.isFinite(p.p.x + p.p.y + p.p.z + p.theta + p.phi), JSON.stringify(first));
      assert.ok(Math.hypot(p.p.x, p.p.z) <= world.arenaRadius + 1e-6);
      for (const o of ARENA_OBSTACLES) assert.ok(!inside(o, p.p, bodyRadius(p) - 0.05), `${p.characterId} ended inside a prop`);
    }
  }
});

test('a weapon coming down onto a wall or pillar rests on its top instead of wedging inside', () => {
  for (const kind of ['wall', 'pillar']) {
    const obstacle = ARENA_OBSTACLES.find(o => o.kind === kind);
    const world = arena('polearm', 'polearm', [obstacle]);
    const [p, other] = world.players;
    other.p.x = 15; other.p.z = 15;
    // Stand beside the prop with the weapon raised, facing across it, then
    // chop down onto it and keep pushing.
    const out = Math.hypot(obstacle.x, obstacle.z), ux = obstacle.x / out, uz = obstacle.z / out;
    Object.assign(p, { p: v3(obstacle.x - ux * 2.4, CONFIG.bodyFloor, obstacle.z - uz * 2.4), theta: 0, phi: Math.atan2(uz, ux), wt: 0, wp: 0 });
    let wedged = 0;
    for (let i = 0; i < 180 * 3; i++) {
      world.step([{ theta: 1, phi: 0 }, {}]);
      for (const segment of weaponSegments(p)) for (let t = 0; t <= 1; t += 0.1) {
        const x = segment.a.x + (segment.b.x - segment.a.x) * t, y = segment.a.y + (segment.b.y - segment.a.y) * t, z = segment.a.z + (segment.b.z - segment.a.z) * t;
        const contact = obstacleContact(obstacle, x, z, 0);
        if (contact && y < obstacle.height - 0.25 && contact.depth > 0.2) wedged++;
      }
    }
    assert.ok(wedged < 20, `${kind}: weapon stayed wedged inside the prop (${wedged})`);
    for (const value of [p.p.x, p.p.y, p.p.z, p.wt, p.wp]) assert.ok(Number.isFinite(value));
  }
});
