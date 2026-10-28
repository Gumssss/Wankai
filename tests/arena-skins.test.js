import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_SKINS, DEFAULT_ARENA_SKIN, isArenaSkin } from '../src/arena-skins.js';
import { latheBands, seeded, createNoise, createLayout, groundUnder, pebbleGeometry, horizonNoise, ridgeRange, ridgeRanges, mistRing, canopyGeometry,
  paintedRanges, featherMist, paintedSky } from '../src/arenas/common.js';

test('arena skins are frozen data with unique ids, names and swatches', () => {
  assert.ok(Object.isFrozen(ARENA_SKINS));
  assert.deepEqual(ARENA_SKINS.map(skin => skin.id), ['courtyard', 'colosseum', 'lakeside']);
  for (const skin of ARENA_SKINS) {
    assert.ok(Object.isFrozen(skin) && Object.isFrozen(skin.swatch), `${skin.id} is frozen`);
    for (const key of ['name', 'english', 'description']) assert.ok(typeof skin[key] === 'string' && skin[key].length > 0, `${skin.id}.${key}`);
    assert.equal(skin.swatch.length, 3);
    for (const color of skin.swatch) assert.match(color, /^#[0-9a-f]{6}$/i);
  }
  assert.deepEqual(Object.fromEntries(ARENA_SKINS.map(skin => [skin.id, skin.rimHeight])), { courtyard: 1.2, colosseum: 2.52, lakeside: 1.1 });
  assert.ok(isArenaSkin(DEFAULT_ARENA_SKIN));
  assert.equal(isArenaSkin('moon'), false);
  assert.equal(isArenaSkin(undefined), false);
});

test('revolved bands light treads from above and risers from the arena side', () => {
  const geometry = latheBands([[20, 0, 20, 1, 0xffffff], [20, 1, 21, 1, 0xffffff], [22, 3, 22, 0, 0xffffff]], { segments: 8 });
  const normal = geometry.attributes.normal, position = geometry.attributes.position, perBand = 2 * 9;
  const at = (band, i = 0) => {
    const k = band * perBand + i;
    return { n: [normal.getX(k), normal.getY(k), normal.getZ(k)], p: [position.getX(k), position.getY(k), position.getZ(k)] };
  };
  const riser = at(0), tread = at(1), back = at(2, 6);
  assert.ok(riser.n[0] * riser.p[0] + riser.n[2] * riser.p[2] < 0, 'riser faces the centre');
  assert.ok(tread.n[1] > 0.99, 'tread faces up');
  assert.ok(back.n[0] * back.p[0] + back.n[2] * back.p[2] > 0, 'a band walked downwards faces outwards');
  // Every triangle's winding agrees with its normal, so front faces are lit.
  const index = geometry.index;
  for (let t = 0; t < index.count; t += 3) {
    const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)].map(i => [position.getX(i), position.getY(i), position.getZ(i)]);
    const u = b.map((v, i) => v - a[i]), v = c.map((w, i) => w - a[i]);
    const cross = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const n = index.getX(t);
    assert.ok(cross[0] * normal.getX(n) + cross[1] * normal.getY(n) + cross[2] * normal.getZ(n) > 0, `triangle ${t / 3} winding`);
  }
});

test('scenery randomness is deterministic and noise stays in range', () => {
  const a = seeded(42), b = seeded(42);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
  const noise = createNoise(5);
  for (let i = 0; i < 400; i++) {
    const x = (i * 7.31) % 97 - 48, z = (i * 3.17) % 61 - 30, value = noise(x, z), fbm = noise.fbm(x, z);
    assert.ok(value >= 0 && value <= 1 && fbm >= 0 && fbm <= 1);
  }
});

test('scenery layout never accepts overlapping footprints or keep-out zones', () => {
  const layout = createLayout();
  layout.block({ rMin: 0, rMax: 20 });
  layout.block({ x: 40, z: 0, r: 5 });
  layout.block({ ax: 0, az: 30, bx: 60, bz: 30, r: 2 });
  layout.block({ test: (x, z) => z < -50 });
  assert.equal(layout.take(10, 0, 1), false, 'inside the arena ring');
  assert.equal(layout.take(21.5, 0, 2), false, 'footprint reaches into the ring');
  assert.equal(layout.take(44, 0, 1), false, 'inside a building zone');
  assert.equal(layout.take(30, 31, 1), false, 'on the road');
  assert.equal(layout.take(0, -60, 1), false, 'predicate zone');
  assert.equal(layout.take(30, 10, 2), true);
  assert.equal(layout.take(33, 10, 2), false, 'overlaps the first footprint');
  assert.equal(layout.take(34.5, 10, 2, 0.2), true, 'clear of it with the gap');
  // A random scatter keeps every pair apart.
  const random = seeded(3);
  for (let i = 0; i < 2000; i++) layout.take(random() * 200 - 100, random() * 200 - 100, 0.5 + random() * 3, 0.1);
  const placed = layout.placed;
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.r + b.r - 1e-9, `footprints ${i} and ${j} overlap`);
  }
});

test('ground sampling brackets the terrain under a footprint and stones are unit sized', () => {
  const slope = (x, z) => x * 0.5 + z * 0.1;
  const { min, max } = groundUnder(slope, 10, 0, 2);
  assert.ok(min <= slope(8, 0) + 1e-9 && max >= slope(12, 0) - 1e-9);
  const stone = pebbleGeometry({ seed: 4, detail: 1 });
  stone.computeBoundingBox();
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(stone.boundingBox.min[axis] + 1) < 1e-6 && Math.abs(stone.boundingBox.max[axis] - 1) < 1e-6, axis);
  }
});

test('horizon noise wraps seamlessly round the circle', () => {
  const ridge = horizonNoise(9);
  for (const scale of [1, 3.4]) {
    assert.ok(Math.abs(ridge(0, scale) - ridge(Math.PI * 2, scale)) < 1e-9);
    for (let i = 0; i < 64; i++) { const v = ridge(i * 0.1, scale); assert.ok(v >= 0 && v <= 1); }
  }
});

test('mountain ranges rise from a buried, fully hazed foot to their ridgeline', () => {
  const haze = 0xe2e9e4, height = a => 20 + 10 * Math.sin(a * 3);
  const mesh = ridgeRange({ radius: 150, depth: 20, height, haze, colors: { body: 0x6f8f88, ridge: 0x40585a }, fade: 0.3, foot: -3, mistTop: 12, segments: 64 });
  const pos = mesh.geometry.attributes.position, color = mesh.geometry.attributes.color, hazeColor = mesh.material.color.clone().set(haze);
  let top = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i));
    assert.ok(r >= 130 - 1e-3 && r <= 150 + 20 * 0.6 + 1e-3, 'stays inside its band');
    assert.ok(y >= -3 - 1e-4 && y <= 30 + 1e-4);
    top = Math.max(top, y);
    if (y <= -3 + 1e-4) for (const [k, c] of ['r', 'g', 'b'].entries()) assert.ok(Math.abs(color.array[i * 3 + k] - hazeColor[c]) < 1e-6, 'foot dissolves into the haze');
  }
  assert.ok(Math.abs(top - 30) < 0.5, 'reaches the ridgeline');
  assert.equal(mesh.material.fog, false);
  const merged = ridgeRanges([{ radius: 150, height, haze, colors: { body: 0x777777, ridge: 0x333333 } }, { radius: 180, height, haze, colors: { body: 0x888888, ridge: 0x444444 } }]);
  assert.equal(merged.geometry.attributes.position.count, 2 * ridgeRange({ radius: 150, height, haze, colors: { body: 0x777777, ridge: 0x333333 } }).geometry.attributes.position.count);
});

test('mist rings fade out at their top and never write depth', () => {
  const ring = mistRing({ radius: 100, spread: 10, y0: -2, y1: 14, color: 0xffffff, opacity: 0.8, segments: 32, rows: 4 });
  const pos = ring.geometry.attributes.position, color = ring.geometry.attributes.color;
  assert.equal(color.itemSize, 4);
  let bottom = 0;
  for (let i = 0; i < pos.count; i++) {
    const alpha = color.getW(i), y = pos.getY(i);
    assert.ok(alpha >= 0 && alpha <= 0.8 + 1e-6);
    if (y > 14 - 1e-6) assert.ok(alpha < 1e-6, 'clear at the top edge');
    if (y < -2 + 1e-6) bottom = Math.max(bottom, alpha);
  }
  assert.ok(bottom > 0.3, 'dense at the foot');
  assert.equal(ring.material.depthWrite, false);
  assert.ok(ring.material.transparent);
  const band = mistRing({ radius: 100, y0: 10, y1: 30, color: 0xffffff, profile: 'band', segments: 16, rows: 4 });
  for (let i = 0; i < band.geometry.attributes.position.count; i++) {
    const y = band.geometry.attributes.position.getY(i);
    if (y < 10 + 1e-6 || y > 30 - 1e-6) assert.ok(band.geometry.attributes.color.getW(i) < 1e-6, 'a band is clear at both edges');
  }
});

test('canopy groves are one coloured mesh, darker underneath than on top', () => {
  const geometry = canopyGeometry({ seed: 2, crowns: 4, top: 0xffffff, under: 0x000000 });
  assert.ok(geometry.attributes.color && geometry.attributes.normal);
  const pos = geometry.attributes.position, normal = geometry.attributes.normal, color = geometry.attributes.color;
  let up = 0, upN = 0, down = 0, downN = 0;
  for (let i = 0; i < pos.count; i++) {
    if (color.getX(i) === color.getY(i) && pos.getY(i) < 1) continue; // trunks
    if (normal.getY(i) > 0.8) { up += color.getX(i); upN++; } else if (normal.getY(i) < -0.8) { down += color.getX(i); downN++; }
  }
  assert.ok(upN > 0 && downN > 0 && up / upN > down / downN + 0.4);
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.min.y > -0.2, 'stands on the ground');
});

test('painted ranges are one unlit mesh rising from a buried foot to each ridgeline', () => {
  const crest = a => 20 + 10 * Math.sin(a * 3), far = a => 34 + 4 * Math.cos(a * 2);
  const layers = [
    { radius: 140, depth: 18, height: crest, mist: 6, colors: { ridge: 0x40585a, body: 0x8aa098 }, segments: 64 },
    { radius: 190, depth: 22, height: far, mist: a => 12 + Math.sin(a), fade: 0.4, colors: { ridge: 0x8899aa, body: 0xbbccdd }, segments: 48, arc: [0, Math.PI] },
  ];
  const mesh = paintedRanges(layers, { haze: 0xe9ede4, sun: [-24, 30, 18] });
  const pos = mesh.geometry.attributes.position, range = mesh.geometry.attributes.aRange;
  assert.equal(pos.count, (64 + 1) * 4 + (48 + 1) * 4, 'one column of rows + 1 vertices per segment');
  let top = [0, 0];
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i)), y = pos.getY(i), layer = i < 65 * 4 ? 0 : 1;
    const { radius, depth } = layers[layer];
    assert.ok(r >= radius - depth - 1e-3 && r <= radius + 1e-3, 'stays inside its band');
    assert.ok(y >= -6 - 1e-4 && y <= range.getX(i) + 1e-4, 'between the foot and the crest');
    assert.ok(range.getW(i) >= -1 && range.getW(i) <= 1, 'sun term is a cosine');
    top[layer] = Math.max(top[layer], y);
  }
  assert.ok(Math.abs(top[0] - 30) < 0.5 && Math.abs(top[1] - 38) < 0.5, 'reaches the ridgelines');
  assert.equal(mesh.material.fog, false);
  assert.equal(mesh.material.toneMapped, false);
});

test('feathered mist is one transparent mesh, clear where each ring thins out', () => {
  const { mesh, update } = featherMist([
    { radius: 100, spread: 10, y0: -2, y1: 14, color: 0xffffff, opacity: 0.8, segments: 32, rows: 4 },
    { radius: 150, y0: 10, y1: 30, color: 0xffffff, opacity: 0.6, profile: 'band', segments: 16, rows: 4, arc: [0, Math.PI] },
  ]);
  const pos = mesh.geometry.attributes.position, color = mesh.geometry.attributes.color;
  assert.equal(color.itemSize, 4);
  let foot = 0;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), r = Math.hypot(pos.getX(i), pos.getZ(i)), alpha = color.getW(i);
    assert.ok(alpha >= 0 && alpha <= 0.8 + 1e-6);
    if (r > 140) {
      if (y < 10 + 1e-6 || y > 30 - 1e-6) assert.ok(alpha < 1e-6, 'a band is clear at both edges');
    } else {
      if (y > 14 - 1e-6) assert.ok(alpha < 1e-6, 'foot mist is clear at its top');
      if (y < -2 + 1e-6) foot = Math.max(foot, alpha);
    }
  }
  assert.ok(foot > 0.3, 'dense at the foot');
  assert.ok(Math.hypot(pos.getX(0), pos.getZ(0)) > 140, 'far rings come first');
  assert.equal(mesh.material.depthWrite, false);
  assert.ok(mesh.material.transparent);
  update(0.5);
  assert.equal(mesh.material.uniforms.time.value, 0.5);
});

test('the painted sky follows the camera and stays untone-mapped', () => {
  const sky = paintedSky({ top: 0x86adc0, mid: 0xbcd2d4, horizon: 0xe9ede4, sunDirection: [1, 0.3, 0] });
  assert.equal(sky.material.toneMapped, false);
  assert.equal(sky.material.depthWrite, false);
  assert.equal(sky.frustumCulled, false);
  assert.ok(Math.abs(sky.material.uniforms.sunDir.value.length() - 1) < 1e-6);
});

test('see-through patches a material to share the cut-out uniforms, colour pass only', async () => {
  const THREE = await import('three');
  const { seeThrough, seeThroughUniforms } = await import('../src/arenas/common.js');
  const uniforms = seeThroughUniforms(), plain = new THREE.MeshStandardMaterial(), patched = seeThrough(new THREE.MeshStandardMaterial(), uniforms);
  assert.equal(patched.defines.SEE_THROUGH, '');
  assert.equal(patched.defines.STANDARD, '', 'keeps the material\'s own defines');
  assert.notEqual(patched.customProgramCacheKey(), plain.customProgramCacheKey(), 'never shares a program with an unpatched twin');
  assert.equal(seeThrough(patched, uniforms), patched, 'patching twice is a no-op');
  for (const [name, lib] of [['standard', THREE.ShaderLib.standard], ['basic', THREE.ShaderLib.basic]]) {
    const shader = { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    seeThrough(name === 'basic' ? new THREE.MeshBasicMaterial() : new THREE.MeshStandardMaterial(), uniforms).onBeforeCompile(shader);
    for (const key of ['seeCamera', 'seeTargets', 'seeStrength', 'seeShape']) assert.equal(shader.uniforms[key], uniforms[key], `${name} shares ${key}`);
    assert.match(shader.vertexShader, /vSeeWorld = \( modelMatrix \* seeWorld \)\.xyz/, `${name} world position`);
    assert.match(shader.vertexShader, /instanceMatrix \* seeWorld/, `${name} handles instancing`);
    assert.match(shader.fragmentShader, /seeBayer\( gl_FragCoord\.xy \) \) discard/, `${name} dithered discard`);
  }
  assert.equal(patched.customDepthMaterial, undefined, 'shadows use the plain depth material');
});

test('see-through opens only while a fighter is hidden, ramping over about 0.15 s', async () => {
  const THREE = await import('three');
  const { createSeeThrough } = await import('../src/arenas/common.js');
  // A wall: the slab 9 < x < 10 up to 1.2 m.
  const see = createSeeThrough({ solid: (x, y) => x > 9 && x < 10 && y < 1.2 });
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(16, 3, 0);
  const behind = { x: 8, y: 0.59, z: 0 }, clear = { x: 2, y: 0.59, z: 8 };
  see.update(0.05, camera, [behind, clear]);
  const strength = see.uniforms.seeStrength.value;
  assert.ok(strength.x > 0.2 && strength.x < 0.5, 'ramps in');
  assert.equal(strength.y, 0, 'a fighter in plain view keeps the wall solid');
  see.update(0.2, camera, [behind, clear]);
  assert.equal(strength.x, 1);
  assert.ok(see.uniforms.seeTargets.value[0].distanceTo(new THREE.Vector3(8, 0.89, 0)) < 1e-9, 'aims at the body centre');
  see.update(0.05, camera, [clear, clear]);
  assert.ok(strength.x > 0.5 && strength.x < 1, 'ramps out');
  see.update(0.016, camera, null);
  assert.deepEqual(strength.toArray(), [0, 0], 'off without fighters (title orbit, previews)');
});

test('the courtyard boundary is a toy-block wall of many shapes, outside the ring and in budget', async () => {
  const THREE = await import('three');
  const { blockWall, BLOCK_WALL } = await import('../src/arenas/courtyard.js');
  const { createSeeThrough } = await import('../src/arenas/common.js');
  const { createKit } = await import('../src/models/toy-kit.js');
  const R = 19.35, group = new THREE.Group(), wall = blockWall(group, createKit(), R, createSeeThrough());
  const kinds = Object.keys(wall.kinds);
  for (const kind of ['box', 'cylinder', 'arch', 'wedge', 'halfRound', 'quarter', 'cone', 'dome', 'ball', 'stud']) assert.ok(wall.kinds[kind] > 0, `uses ${kind}`);
  assert.ok(kinds.length >= 8);
  assert.equal(wall.meshes.length, 2, 'one mesh for the blocks, one for their outlines');
  let triangles = 0, top = 0;
  for (const mesh of wall.meshes) {
    assert.ok(mesh.material.userData.seeThrough, 'see-through');
    const pos = mesh.geometry.attributes.position;
    triangles += pos.count / 3;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      assert.ok(r > R + 0.02, 'never intrudes into the fighting circle');
      assert.ok(r < R + 1.3, 'leaves the lawn, bunting poles and lanterns alone');
      top = Math.max(top, pos.getY(i));
    }
  }
  assert.ok(triangles < 56000, `${triangles} triangles`);
  assert.ok(BLOCK_WALL.low + BLOCK_WALL.high >= 1.15, 'solid to about the rim height');
  assert.ok(top < 2.0, 'toppers stay low');
});
