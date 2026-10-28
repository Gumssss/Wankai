import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createKit, geometry as G, PALETTE as C } from '../models/toy-kit.js';
import {
  TAU, seeded, smoothstep, createNoise, skyDome, addLights, createBatch, coloredGeometry, instanced, terrainRing, latheBands,
  canvasTexture, fallingFlakes, cloudLayer, birdFlock, createProp, finishProp, fadeProps, softMaterial, farMaterial,
  createLayout, groundUnder, pebbleGeometry, findSite, horizonNoise, ridgeRanges, mistLayers, canopyGeometry, createSeeThrough,
} from './common.js';

// 玩具庭院: a cream sand ring inside a low wall stacked from toy blocks
// (towers, bricks, arches, wedges, domes...), with bunting and paper lanterns on poles outside it, stacking-ring
// pillars and toy-block walls as obstacles and drifting confetti, set in a
// calm patchwork toy countryside: rolling meadows, groves of lollipop trees,
// a few candy hamlets, a windmill, a castle, hot-air balloons and mountains.
const BUNTING = [0xc4684f, 0x568d92, 0xe9c46a, 0xf3ead3, 0x8fae7e];
const HORIZON = 0xf4e9d3;
const RANGE_FOOT = 116; // the nearest range starts rising here
const STONE_TONES = [0xc9bfae, 0xb3a996, 0xd5c19c, 0xa69d8c];

function floorTexture(radius, anisotropy) {
  return canvasTexture(1024, (c, size) => {
    const k = size / 2 / radius;
    c.fillStyle = '#efe4c8';
    c.fillRect(0, 0, size, size);
    const random = seeded(913);
    for (let i = 0; i < 26000; i++) {
      c.fillStyle = random() > 0.5 ? '#fff8e414' : '#8a76420f';
      c.fillRect(random() * size, random() * size, random() * 2.4 + 0.4, random() * 2.4 + 0.4);
    }
    c.translate(size / 2, size / 2);
    const ring = (r, width, color) => { c.strokeStyle = color; c.lineWidth = width * k; c.beginPath(); c.arc(0, 0, r * k, 0, TAU); c.stroke(); };
    ring(radius - 0.9, 0.5, '#d9a77f');
    ring(radius - 1.6, 0.14, '#c4684f80');
    ring(8.2, 0.32, '#8fb1b0a0');
    ring(4.1, 0.16, '#c4684f70');
    // Scalloped centre medallion and an eight-point star.
    c.fillStyle = '#f7eedb';
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU, r = (2.6 + Math.cos(a * 8) * 0.18) * k;
      i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.fill();
    c.fillStyle = '#e9c46ab0';
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * TAU, r = (i % 2 ? 0.75 : 1.9) * k;
      i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.fill();
    // Petal dots scattered in the outer band.
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * TAU, r = (radius - 4.6 + (i % 3) * 0.9) * k;
      c.fillStyle = ['#c4684f55', '#568d9255', '#e9c46a66'][i % 3];
      c.beginPath(); c.arc(Math.cos(a) * r, Math.sin(a) * r, 0.16 * k, 0, TAU); c.fill();
    }
  }, anisotropy);
}

// Soft rolling meadows: gentle swells near the ring, bigger hills further
// out, flattening into a hazy plain where the mountain ranges rise.
function landscape(radius) {
  const noise = createNoise(41), ground = -1.2;
  const height = (x, z, r = Math.hypot(x, z)) => {
    const hills = smoothstep(radius + 12, radius + 40, r) * (noise.fbm(x / 26, z / 26, 3) * 11 - 1.5)
      + smoothstep(radius + 45, radius + 95, r) * noise.fbm(x / 45 + 7, z / 45, 3) * 18;
    return ground + Math.max(0, hills) * (1 - smoothstep(112, 135, r) * 0.85);
  };
  const lawn = new THREE.Color(0xbfd09a), low = new THREE.Color(0x98b77f), high = new THREE.Color(0xbdd38b), warm = new THREE.Color(0xd6d08e), cool = new THREE.Color(0xa6c08f);
  const paint = (x, y, z, r, color) => {
    // Valleys deeper green, crowns of the hills sunlit and warm, with broad soft patches.
    color.copy(low).lerp(high, smoothstep(-0.5, 9, y));
    color.lerp(warm, smoothstep(0.55, 0.8, noise(x / 38 + 31, z / 38 - 17)) * 0.3);
    color.lerp(cool, smoothstep(0.55, 0.8, noise(x / 30 - 12, z / 30 + 40)) * 0.4);
    color.lerp(lawn, 1 - smoothstep(radius + 10, radius + 22, r));
  };
  const geometry = terrainRing({ inner: radius + 1.6, outer: 180, rings: 60, segments: 220, height, paint, power: 1.45 });
  const mesh = new THREE.Mesh(geometry, farMaterial());
  mesh.receiveShadow = true;
  mesh.name = 'courtyard-landscape';
  return { mesh, height };
}

// Three pastel ranges behind the hills, lighter and bluer with distance, the
// furthest snow-capped; each rises out of the warm haze at its foot.
function ranges() {
  const ridge = horizonNoise(52), sun = [-0.55, 0.62, 0.45];
  const layers = [
    { radius: 132, depth: 16, lo: 7, hi: 19, scale: 2.6, body: 0x93b39a, top: 0x7ea58e, fade: 0.3, mistTop: 8 },
    { radius: 158, depth: 24, lo: 12, hi: 30, scale: 3.6, body: 0x9aa9cf, top: 0x8494c4, fade: 0.45, mistTop: 12 },
    { radius: 186, depth: 28, lo: 18, hi: 46, scale: 5, body: 0xaab2da, top: 0x9aa3d4, fade: 0.55, mistTop: 16, snow: 34 },
  ];
  const snow = new THREE.Color(0xfbf8f4);
  return ridgeRanges(layers.map((layer, i) => {
    const height = a => {
      const n = smoothstep(0.22, 0.78, ridge(a, layer.scale, 4, i * 13));
      return layer.lo + (layer.hi - layer.lo) * Math.pow(n, 1.35);
    };
    return { radius: layer.radius, depth: layer.depth, height, haze: HORIZON, fade: layer.fade, mistTop: layer.mistTop,
      colors: { body: layer.body, ridge: layer.top }, crest: [0.5, 1], shade: { direction: sun, amount: 0.3 },
      tint: layer.snow ? (color, a, t, y) => color.lerp(snow, smoothstep(layer.snow - 3, layer.snow + 4, y) * 0.9) : null };
  }), 'courtyard-ranges');
}

// A castle, a windmill, three hamlets, groves of trees and balloons, all
// placed through one collision layout so nothing grows out of anything.
function countryside(group, height, radius, layout) {
  const random = seeded(77);
  // Nothing stands where the first range's slope rises out of the plain.
  layout.block({ rMin: RANGE_FOOT, rMax: 1e4 });

  // A little castle on the far hills, its walls sunk into the slope.
  const castleSite = findSite(layout, height, random, { angle: 3.9, distance: 96, r: 10.5, base: 7.5, slope: 6, spread: 0.4, depth: 20, tries: 200 });
  if (castleSite) {
    const castleParts = [{ geometry: new THREE.BoxGeometry(7, 10, 7), color: 0xf1e6d0, position: [0, 1, 0] },
      { geometry: new THREE.CylinderGeometry(1.9, 1.9, 9, 14), color: 0xf6efe0, position: [0, 7.5, 0] },
      { geometry: new THREE.ConeGeometry(2.4, 4, 14), color: 0x568d92, position: [0, 14, 0] }];
    for (const [dx, dz] of [[-3.8, -3.8], [3.8, -3.8], [-3.8, 3.8], [3.8, 3.8]]) {
      castleParts.push({ geometry: new THREE.CylinderGeometry(1.25, 1.35, 12, 12), color: 0xf6efe0, position: [dx, 2, dz] });
      castleParts.push({ geometry: new THREE.ConeGeometry(1.7, 3, 12), color: 0xc4684f, position: [dx, 9.5, dz] });
    }
    const castle = new THREE.Mesh(coloredGeometry(castleParts), softMaterial());
    castle.position.set(castleSite.x, castleSite.ground.max - 0.4, castleSite.z);
    castle.rotation.y = -castleSite.a + Math.PI / 4;
    castle.scale.setScalar(1.5);
    castle.name = 'castle';
    group.add(castle);
  }

  // Windmill on a rise, sails facing the arena. Its footprint covers the
  // whole sail disc so no tree grows into the turning sails.
  const mill = new THREE.Group(), sails = new THREE.Group();
  const millSite = findSite(layout, height, random, { angle: 1.55, distance: 70, r: 7.4, base: 3.4, slope: 2.2, spread: 0.4, depth: 14, tries: 200 });
  if (millSite) {
    mill.position.set(millSite.x, (millSite.ground.min + millSite.ground.max) / 2 - 0.05, millSite.z);
    mill.rotation.y = -Math.PI / 2 - millSite.a;
    mill.scale.setScalar(1.5);
    mill.name = 'windmill';
    mill.add(new THREE.Mesh(coloredGeometry([
      { geometry: new THREE.CylinderGeometry(1.3, 2.25, 8, 12), color: 0xf3ead3, position: [0, 3, 0] },
      { geometry: new THREE.ConeGeometry(1.75, 2.2, 12), color: 0xc4684f, position: [0, 8.1, 0] },
      { geometry: new THREE.BoxGeometry(0.9, 1.4, 0.2), color: 0x7a4a2a, position: [0, 0.7, 2.0], rotation: [-0.12, 0, 0] },
      { geometry: new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10), color: 0x6d93a6, position: [0, 4.6, 1.62], rotation: [Math.PI / 2 - 0.12, 0, 0] },
      { geometry: new THREE.CylinderGeometry(0.18, 0.18, 1.2, 8), color: 0x7a4a2a, position: [0, 6.6, 1.5], rotation: [Math.PI / 2, 0, 0] },
    ]), softMaterial()));
    sails.position.set(0, 6.6, 2.15);
    const sailParts = [{ geometry: new THREE.SphereGeometry(0.35, 10, 8), color: 0xe9c46a }];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU;
      sailParts.push({ geometry: new THREE.BoxGeometry(0.16, 4.4, 0.12), color: 0x8a5d3b, position: [Math.sin(a) * 2.2, Math.cos(a) * 2.2, 0], rotation: [0, 0, -a] });
      sailParts.push({ geometry: new THREE.BoxGeometry(1.1, 3.4, 0.06), color: i % 2 ? 0xfbf6e8 : 0xf0c9b8, position: [Math.sin(a) * 2.5 + Math.cos(a) * 0.62, Math.cos(a) * 2.5 - Math.sin(a) * 0.62, -0.05], rotation: [0, 0, -a] });
    }
    sails.add(new THREE.Mesh(coloredGeometry(sailParts), softMaterial({ side: THREE.DoubleSide })));
    mill.add(sails);
    group.add(mill);
  }

  // Candy hamlets: four houses each on gentle ground, set halfway into the
  // slope on a deep footing so no side floats.
  const houses = [];
  for (const [angle, distance] of [[0.6, 62], [2.75, 74], [4.35, 58]]) {
    for (let i = 0; i < 4; i++) {
      const s = 1.1 + random() * 0.5, site = findSite(layout, height, random, { angle, distance, spread: 0.32, depth: 14, r: 2.1 * s, slope: 0.8 });
      if (site) houses.push({ x: site.x, z: site.z, y: (site.ground.min + site.ground.max) / 2 - 0.05, ry: random() * TAU, s });
    }
  }
  const body = coloredGeometry([
    { geometry: new THREE.BoxGeometry(2.4, 2.6, 2), color: 0xffffff, position: [0, 0.7, 0] },
    { geometry: new THREE.BoxGeometry(0.6, 1, 0.08), color: 0x7a4a2a, position: [0, 0.5, 1.02] },
    { geometry: new THREE.BoxGeometry(0.5, 0.5, 0.08), color: 0x6d93a6, position: [-0.75, 1.25, 1.02] },
    { geometry: new THREE.BoxGeometry(0.5, 0.5, 0.08), color: 0x6d93a6, position: [0.75, 1.25, 1.02] },
    { geometry: new THREE.BoxGeometry(0.08, 0.5, 0.5), color: 0x6d93a6, position: [1.22, 1.2, 0] },
  ]);
  group.add(instanced(body, softMaterial(), houses.map((h, i) => ({ ...h, color: [0xfbf1dc, 0xf6d9c4, 0xfbe7a1, 0xd9ead6, 0xf3e3ef][i % 5] }))));
  const roof = new THREE.CylinderGeometry(1.25, 1.25, 2.6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6);
  roof.scale(1.06, 1.05, 1.12).translate(0, 2.55, 0);
  const chimney = new THREE.BoxGeometry(0.35, 0.8, 0.35).translate(0.7, 3.1, -0.4);
  const roofs = coloredGeometry([{ geometry: roof, color: 0xffffff }, { geometry: chimney, color: 0xd8cbbb }]);
  group.add(instanced(roofs, softMaterial(), houses.map((h, i) => ({ ...h, color: [0xc4684f, 0x568d92, 0xe2ad2b, 0xb35d6a][i % 4] }))));

  // Groves: soft round canopy masses where the grove noise allows, a few
  // pointed pine clumps and autumn accents, crowns never touching.
  const groves = createNoise(19), kinds = [
    { geometry: canopyGeometry({ seed: 3, crowns: 5, spread: 2.6, radius: 1.35, top: 0xb2d18a, under: 0x5d8a5f }), items: [], r: 3.2 },
    { geometry: canopyGeometry({ seed: 8, crowns: 4, spread: 2.2, radius: 1.25, top: 0xcdd88d, under: 0x7b9a5d }), items: [], r: 2.8 },
    { geometry: canopyGeometry({ seed: 13, crowns: 3, spread: 1.8, radius: 1.15, top: 0xf2c072, under: 0xb27a4f }), items: [], r: 2.4 },
    { geometry: canopyGeometry({ seed: 21, crowns: 4, spread: 2.0, radius: 0.95, top: 0x8db886, under: 0x46705a, cone: 2.8, trunkHeight: 0.8, detail: [9, 1] }), items: [], r: 2.5 },
    { geometry: canopyGeometry({ seed: 34, crowns: 1, spread: 0, radius: 1.3, top: 0xa9cc85, under: 0x5f8a5e, trunkHeight: 1.5 }), items: [], r: 1.4 },
  ];
  for (let tries = 0, placed = 0; placed < 70 && tries < 9000; tries++) {
    const a = random() * TAU, r = radius + 15 + (115 - radius - 15) * Math.sqrt(random()), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const near = r < radius + 30, density = groves(x / 18, z / 18);
    if (density < (near ? 0.56 : 0.46)) continue;
    const pick = near ? (random() < 0.5 ? 4 : Math.floor(random() * 3)) : [0, 0, 1, 1, 2, 3, 3, 4][Math.floor(random() * 8)];
    const kind = kinds[pick], s = (near ? 0.75 : 0.95) + random() * 0.6;
    if (!layout.fits(x, z, kind.r * s, 0.5)) continue;
    const under = groundUnder(height, x, z, kind.r * s * 0.6, 6);
    if (under.max - under.min > 2.6 * s) continue;
    layout.add(x, z, kind.r * s);
    kind.items.push({ x, z, y: under.min - 0.15, s, ry: random() * TAU, color: [0xffffff, 0xf4f8ea, 0xfdf6ea][placed % 3] });
    placed++;
  }
  for (const kind of kinds) if (kind.items.length) group.add(instanced(kind.geometry, softMaterial({ roughness: 0.9 }), kind.items));

  // Hot-air balloons drift well above the groves, inside the windmill's ring
  // (its footprint starts beyond r = 54) and far below the clouds.
  const balloons = [];
  [[0xc4684f, 0xfbf6e8], [0x568d92, 0xe9c46a], [0xe9c46a, 0xd98c6c]].forEach(([a, b], index) => {
    const envelope = new THREE.SphereGeometry(2.2, 16, 12).toNonIndexed();
    envelope.scale(1, 1.15, 1);
    const pos = envelope.attributes.position, colors = new Float32Array(pos.count * 3), ca = new THREE.Color(a), cb = new THREE.Color(b);
    for (let i = 0; i < pos.count; i += 3) {
      const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
      const pick = Math.floor((Math.atan2(z, x) + Math.PI) / TAU * 8) % 2 ? ca : cb;
      for (let j = 0; j < 3; j++) pick.toArray(colors, (i + j) * 3);
    }
    envelope.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    envelope.deleteAttribute('uv');
    const rest = coloredGeometry([
      { geometry: new THREE.CylinderGeometry(0.55, 0.45, 0.6, 10), color: 0x9b6a3f, position: [0, -3.9, 0] },
      ...[0, 1, 2, 3].map(i => ({ geometry: new THREE.CylinderGeometry(0.03, 0.03, 1.5, 4), color: 0x5a4632,
        position: [Math.cos(i * Math.PI / 2 + 0.78) * 0.5, -3.0, Math.sin(i * Math.PI / 2 + 0.78) * 0.5] })),
    ]);
    rest.deleteAttribute('uv');
    const balloon = new THREE.Group();
    balloon.add(new THREE.Mesh(envelope, softMaterial({ flatShading: false })));
    balloon.add(new THREE.Mesh(rest, softMaterial()));
    balloon.userData = { angle: index / 3 * TAU + 0.9, r: 38 + index * 6, y: 28 + index * 3, phase: index * 1.9 };
    balloon.scale.setScalar(1.3);
    group.add(balloon);
    balloons.push(balloon);
  });
  return { sails, balloons };
}

// Toy block shapes, each standing on y = 0 and centred in x and z (x runs
// along the wall, z through it), with a cheap low-poly twin for its ink
// outline. Edges are rounded or bevelled like real toy blocks.
export function blockShapes() {
  const cache = new Map();
  const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
  const stand = g => {
    g.computeBoundingBox();
    const b = g.boundingBox;
    return g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  };
  const extrude = (shape, depth, bevel, curveSegments) => stand(new THREE.ExtrudeGeometry(shape, bevel > 0
    ? { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments }
    : { depth, bevelEnabled: false, curveSegments }));
  // A drum whose top and bottom rims are rounded over by b.
  const lathe = (r, h, b, segments, steps) => {
    const points = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= steps; i++) { const t = -Math.PI / 2 + i / steps * Math.PI / 2; points.push(new THREE.Vector2(r - b + Math.cos(t) * b, b + Math.sin(t) * b)); }
    for (let i = 0; i <= steps; i++) { const t = i / steps * Math.PI / 2; points.push(new THREE.Vector2(r - b + Math.cos(t) * b, h - b + Math.sin(t) * b)); }
    points.push(new THREE.Vector2(0, h));
    return new THREE.LatheGeometry(points, segments);
  };
  // A stud: open bottom (it sits on a block), softened top rim.
  const stud = (r, h, b, segments) => new THREE.LatheGeometry([[r, 0], [r, h - b], [r - b * 0.3, h - b * 0.3], [r - b, h], [0, h]]
    .map(([x, y]) => new THREE.Vector2(x, y)), segments);
  const shaped = (key, depth, draw, curves = 7) => memo(key, () => {
    const shape = new THREE.Shape();
    draw(shape);
    return { kind: key.split(':')[0], g: extrude(shape, depth, 0.035, curves), hull: extrude(shape, depth, 0, 4) };
  });
  const k = x => Math.round(x * 100) / 100;
  return {
    // Cubes, bricks and planks.
    box: (w, h, d) => memo(`box:${k(w)}|${k(h)}|${k(d)}`, () => ({ kind: 'box',
      g: stand(new RoundedBoxGeometry(w, h, d, 1, 0.07)), hull: stand(new THREE.BoxGeometry(w, h, d)) })),
    // Upright cylinders: drums in the course, the round towers.
    cylinder: (r, h) => memo(`cylinder:${k(r)}|${k(h)}`, () => ({ kind: 'cylinder',
      g: lathe(r, h, Math.min(0.06, r * 0.3), 16, 1), hull: stand(new THREE.CylinderGeometry(r, r, h, 10)) })),
    // A block with a half-round cut-out through it.
    arch: (w, h, d) => shaped(`arch:${k(w)}|${k(h)}|${k(d)}`, d, s => {
      const o = Math.min(w * 0.24, h * 0.45), leg = h * 0.2;
      s.moveTo(-w / 2, 0); s.lineTo(-o, 0); s.lineTo(-o, leg); s.absarc(0, leg, o, Math.PI, 0, true); s.lineTo(o, 0);
      s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
    }),
    // A triangular prism: the roof wedge, gable towards the ring.
    wedge: (w, h, d) => shaped(`wedge:${k(w)}|${k(h)}|${k(d)}`, d, s => { s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); }),
    // A half-cylinder lying flat side down.
    halfRound: (w, d) => shaped(`halfRound:${k(w)}|${k(d)}`, d, s => { s.moveTo(-w / 2, 0); s.absarc(0, 0, w / 2, Math.PI, 0, true); s.closePath(); }),
    // A quarter-round: upright face at -x, curved face falling towards +x.
    quarter: (r, d) => shaped(`quarter:${k(r)}|${k(d)}`, d, s => { s.moveTo(0, 0); s.lineTo(r, 0); s.absarc(0, 0, r, 0, Math.PI / 2, false); s.closePath(); }, 6),
    cone: (r, h) => memo(`cone:${k(r)}|${k(h)}`, () => ({ kind: 'cone', g: stand(new THREE.ConeGeometry(r, h, 18, 2)), hull: stand(new THREE.ConeGeometry(r, h, 8)) })),
    dome: r => memo(`dome:${k(r)}`, () => ({ kind: 'dome', g: stand(new THREE.SphereGeometry(r, 14, 5, 0, TAU, 0, Math.PI / 2)),
      hull: stand(new THREE.SphereGeometry(r, 8, 3, 0, TAU, 0, Math.PI / 2)) })),
    ball: r => memo(`ball:${k(r)}`, () => ({ kind: 'ball', g: stand(new THREE.SphereGeometry(r, 12, 8)), hull: stand(new THREE.SphereGeometry(r, 7, 5)) })),
    // The little round knobs on top of a building brick.
    stud: () => memo('stud', () => ({ kind: 'stud', g: stud(0.11, 0.08, 0.025, 10), hull: null })),
  };
}

// The boundary: a low wall stacked from toy blocks just outside the ring,
// solid to the weapon contact height all the way round, on a sandy berm
// that falls to the lawn. Round towers (with a spire, a dome or a ball on
// top) split it into bays; each bay is a course of bricks, cubes, drums and
// arches under an offset course of bricks, cubes and planks, topped here and
// there with roof wedges, half-rounds, quarter-round crenels, cones, domes,
// balls and studs. One draw call for the blocks and one for their outlines,
// both see-through where they hide a fighter.
export const BLOCK_WALL = Object.freeze({ inner: 0.14, depth: 0.78, low: 0.62, high: 0.55, towers: 16, towerRadius: 0.44, towerHeight: 1.32 });
const BLOCK_COLORS = [...BUNTING, 0xd98c6c, 0x6d93a6, 0xeea0a6, 0xd9b27c, 0xd7c2ea];

export function blockWall(group, kit, radius, see) {
  const R = radius, W = BLOCK_WALL, random = seeded(29), shapes = blockShapes();
  const berm = new THREE.Mesh(latheBands([
    [R + 0.2, 0, R + 1.3, 0, 0xd8d2c2],
    [R + 1.3, 0, R + 2.6, -1.2, 0xb6ca90],
  ], { segments: 160 }), kit.material(0xffffff, { vertexColors: true, sheen: 0, clearcoat: 0, roughness: 0.95 }));
  berm.receiveShadow = true;
  berm.name = 'block-ring';
  group.add(berm);

  const plastic = see.patch(kit.material(0xffffff, { vertexColors: true, sheen: 0.18, sheenRoughness: 0.8, clearcoat: 0.04, roughness: 0.7 }));
  const batch = createBatch(), used = {}, GAP = 0.035, D = W.depth, rc = R + W.inner + D / 2;
  const pick = list => list[Math.floor(random() * list.length)];
  const colorNot = (...avoid) => { let c; do c = pick(BLOCK_COLORS); while (avoid.includes(c)); return c; };
  const jitter = amount => (random() - 0.5) * amount;
  // s is the arc length round the wall's centre line; local +x points back along it.
  const put = (shape, s, y, { color, flip = false, yaw = 0, dz = 0, sx = 1, outline = 0.025 }) => {
    const a = s / rc, r = rc + dz;
    used[shape.kind] = (used[shape.kind] ?? 0) + 1;
    batch.add(shape.g, plastic, { color, hull: shape.hull ?? undefined, outline: shape.hull ? outline : 0,
      position: [Math.cos(a) * r, y, Math.sin(a) * r], rotation: [0, Math.PI / 2 - a + yaw + (flip ? Math.PI : 0), 0], scale: [sx, 1, 1] });
  };
  // Split a run into weighted pieces scaled to fill it exactly.
  const fill = (length, kinds) => {
    const items = [];
    let sum = 0;
    while (sum < length) {
      const last = items[items.length - 1]?.kind, options = kinds.filter(k => !(k.single && k.kind === last));
      let roll = random() * options.reduce((t, k) => t + k.weight, 0);
      const kind = options.find(k => (roll -= k.weight) < 0) ?? options[0];
      items.push({ kind: kind.kind, w: kind.w * (0.92 + random() * 0.16) });
      sum += items[items.length - 1].w;
    }
    if (items.length > 1 && sum - length > items[items.length - 1].w * 0.5) sum -= items.pop().w;
    let s = 0;
    return items.map(item => { const w = item.w * length / sum, out = { ...item, w, at: s + w / 2 }; s += w; return out; });
  };
  const LOW = [{ kind: 'brick', w: 1.25, weight: 3 }, { kind: 'cube', w: 0.66, weight: 2 }, { kind: 'arch', w: 1.3, weight: 1.3, single: true }, { kind: 'drum', w: 0.7, weight: 1, single: true }];
  const HIGH = [{ kind: 'brick', w: 1.1, weight: 3 }, { kind: 'cube', w: 0.62, weight: 2 }, { kind: 'plank', w: 1.7, weight: 1.2, single: true }];
  const bay = TAU * rc / W.towers, run = bay - W.towerRadius * 2 - GAP * 2, top = W.low + W.high, toppers = 0.56;

  for (let t = 0; t < W.towers; t++) {
    const s0 = t * bay, towerColor = colorNot();
    // The round tower and its crown.
    put(shapes.cylinder(W.towerRadius, W.towerHeight), s0, 0, { color: towerColor });
    const crown = random();
    if (crown < 0.5) put(shapes.cone(W.towerRadius + 0.02, 0.5), s0, W.towerHeight, { color: colorNot(towerColor) });
    else if (crown < 0.75) put(shapes.dome(W.towerRadius), s0, W.towerHeight, { color: colorNot(towerColor) });
    else {
      const disc = colorNot(towerColor);
      put(shapes.cylinder(0.3, 0.12), s0, W.towerHeight, { color: disc, outline: 0.02 });
      put(shapes.ball(0.17), s0, W.towerHeight + 0.12, { color: colorNot(disc), outline: 0.02 });
    }
    const start = s0 + W.towerRadius + GAP;
    // Bottom course.
    let previous = towerColor;
    const low = fill(run, LOW).map(item => {
      const s = start + item.at, w = item.w - GAP, color = colorNot(previous);
      previous = color;
      const options = { color, yaw: jitter(0.05), dz: jitter(0.04) };
      if (item.kind === 'arch') put(shapes.arch(w, W.low, D), s, 0, options);
      else if (item.kind === 'drum') put(shapes.cylinder(Math.min(w, D) / 2, W.low), s, 0, options);
      else put(shapes.box(w, W.low, D), s, 0, options);
      return { ...item, s, color };
    });
    // Top course, offset from the joints below.
    previous = towerColor;
    for (const item of fill(run, HIGH)) {
      const s = start + item.at, w = item.w - GAP, under = low.find(b => Math.abs(b.s - s) < b.w / 2)?.color;
      const color = colorNot(previous, under);
      previous = color;
      put(shapes.box(w, W.high, D), s, W.low + 0.004, { color, yaw: jitter(0.05), dz: jitter(0.03) });
      if (random() > 0.62) continue;
      const y = top + 0.004, accent = colorNot(color), roll = random();
      if (item.kind === 'cube') {
        if (roll < 0.35) put(shapes.dome(Math.min(w, D) * 0.36), s, y, { color: accent, outline: 0.02 });
        else if (roll < 0.65) put(shapes.cone(0.24, 0.42), s, y, { color: accent, outline: 0.02 });
        else if (roll < 0.85) put(shapes.ball(0.15), s, y, { color: accent, outline: 0.02 });
        else for (const dx of [-0.15, 0.15]) for (const dz of [-0.18, 0.18]) put(shapes.stud(), s + dx, y, { color, dz });
      } else if (roll < 0.3) put(shapes.wedge(w * 0.84, 0.34, toppers), s, y, { color: accent, outline: 0.02 });
      else if (roll < 0.55) put(shapes.halfRound(Math.min(w * 0.7, 0.8), toppers), s, y, { color: accent, outline: 0.02 });
      else if (roll < 0.75 && w > 0.9) {
        // Quarter-round crenels at both ends, curves facing each other.
        for (const side of [-1, 1]) put(shapes.quarter(0.3, toppers), s + side * (w / 2 - 0.15), y, { color: accent, flip: side < 0, outline: 0.02 });
      } else {
        const n = Math.max(2, Math.round(w / 0.42));
        for (let i = 0; i < n; i++) for (const dz of [-0.18, 0.18]) put(shapes.stud(), s + (i - (n - 1) / 2) * (w / n), y, { color, dz });
      }
    }
  }
  const meshes = batch.build(group, { inkMaterial: see.ink() });
  for (const mesh of meshes) mesh.name = 'block-ring';
  return { kinds: used, meshes };
}

// Toy obstacles: stacking-ring pillars (the "cakes") and toy-block walls.
function toyProp(entry, obstacle, index) {
  const { batch, own } = entry;
  if (obstacle.kind === 'pillar') {
    const colors = [0xc4684f, 0xe9c46a, 0x568d92, 0xf4ead2];
    const rings = 4, h = obstacle.height / rings;
    for (let i = 0; i < rings; i++) {
      const r = obstacle.radius * (1 - i * 0.06);
      batch.add(G.cylinder(r, r, h * 0.92, 32), own(colors[(i + index) % 4]), { position: [0, h * (i + 0.5), 0], outline: 0.03 });
      batch.add(G.torus(r - 0.02, 0.07), own(0xfbf6e8), { position: [0, h * (i + 1) - 0.04, 0], rotation: [Math.PI / 2, 0, 0], outline: 0 });
    }
    batch.add(G.sphere(), own(0xfbf6e8), { position: [0, obstacle.height + 0.18, 0], scale: [obstacle.radius * 0.55, 0.3, obstacle.radius * 0.55], outline: 0.035 });
  } else {
    const count = 3, w = obstacle.halfX * 2 / count;
    for (let i = 0; i < count; i++) {
      batch.add(G.box(w - 0.05, obstacle.height, obstacle.halfZ * 2, 0.16), own([0x568d92, 0xe9c46a, 0xc4684f][(i + index) % 3]),
        { position: [-obstacle.halfX + w * (i + 0.5), obstacle.height / 2, 0], outline: 0.03 });
      batch.add(G.sphere(), own(0xfbf6e8), { position: [-obstacle.halfX + w * (i + 0.5), obstacle.height + 0.02, 0], scale: [w * 0.28, 0.12, obstacle.halfZ * 0.6], outline: 0 });
    }
  }
}

export function buildCourtyard({ radius, rimHeight = 1.2, obstacles, anisotropy = 4 }) {
  const kit = createKit(), group = new THREE.Group(), R = radius;
  group.name = 'toy-courtyard';
  group.add(skyDome({ top: 0x92bfd6, horizon: HORIZON, ground: HORIZON, sunDirection: [-0.55, 0.62, 0.45], glow: 0.28 }));
  // Warm haze: the ring stays crisp, the groves past ~40 soften, the far
  // hills are pale shapes and the horizon melts into the sky.
  const fog = new THREE.Fog(HORIZON, 24, 165);
  addLights(group, {
    hemisphere: { sky: 0xfff6e4, ground: 0x9aa48a, intensity: 2.6 },
    sun: { color: 0xffe9c8, intensity: 3.2, position: [-22, 34, 18] },
    rim: { color: 0xcfe6ff, intensity: 0.7, position: [18, 10, -22] },
  });

  // Ground and floor.
  const { mesh: land, height } = landscape(R);
  group.add(land);
  const lawn = kit.part(group, new THREE.CircleGeometry(R + 1.7, 64), kit.material(0xbfd09a, { sheen: 0, clearcoat: 0 }),
    { rotation: [-Math.PI / 2, 0, 0], position: [0, -1.2, 0], outline: 0, shadow: false });
  lawn.receiveShadow = true;
  const floor = kit.part(group, new THREE.CircleGeometry(R + 0.9, 128),
    kit.material(0xffffff, { map: floorTexture(R + 0.9, anisotropy), sheen: 0, clearcoat: 0, roughness: 0.9 }),
    { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.002, 0], outline: 0, shadow: false });
  floor.receiveShadow = true;

  // The block wall turns see-through where it hides a fighter from the camera.
  const see = createSeeThrough({ solid: (x, y, z) => {
    const r = Math.hypot(x, z);
    return y > -0.1 && y < BLOCK_WALL.low + BLOCK_WALL.high && r > R + BLOCK_WALL.inner - 0.05 && r < R + BLOCK_WALL.inner + BLOCK_WALL.depth;
  } });
  const wall = blockWall(group, kit, R, see);

  // Bunting on eight wooden poles standing on the lawn outside the ring.
  const poleBatch = createBatch(), poleWood = kit.material(0x9a6a42), trim = [kit.material(C.players[0]), kit.material(C.players[1])];
  const posts = [], poleR = R + 3.1, poleTop = 3.3, ball = G.sphere();
  for (let i = 0; i < 8; i++) {
    const angle = (i + 0.5) / 8 * TAU, x = Math.cos(angle) * poleR, z = Math.sin(angle) * poleR;
    poleBatch.add(G.cylinder(0.12, 0.16, poleTop + 1.2, 10), poleWood, { position: [x, (poleTop - 1.2) / 2, z], outline: 0.03 });
    poleBatch.add(ball, trim[i % 2], { position: [x, poleTop + 0.12, z], scale: 0.24, outline: 0.03 });
    posts.push(new THREE.Vector3(x, poleTop - 0.15, z));
  }
  poleBatch.build(group);
  const stringPoints = [], flagItems = [];
  for (let i = 0; i < posts.length; i++) {
    const a = posts[i], b = posts[(i + 1) % posts.length], mid = a.clone().add(b).multiplyScalar(0.5);
    mid.y -= 1.1;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b), points = curve.getPoints(24);
    for (let j = 0; j < points.length - 1; j++) stringPoints.push(points[j], points[j + 1]);
    for (let j = 1; j < 14; j++) {
      const point = curve.getPoint(j / 14), tangent = curve.getTangent(j / 14);
      flagItems.push({ position: point, yaw: -Math.atan2(tangent.z, tangent.x), phase: i * 1.7 + j * 0.6, color: BUNTING[(i * 3 + j) % BUNTING.length] });
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(stringPoints), new THREE.LineBasicMaterial({ color: 0x6f5a3e })));
  const flagGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.32, 0, 0), new THREE.Vector3(0.32, 0, 0), new THREE.Vector3(0, -0.62, 0)]);
  flagGeometry.computeVertexNormals();
  const flags = instanced(flagGeometry, kit.material(0xffffff, { side: THREE.DoubleSide, sheen: 0, clearcoat: 0 }),
    flagItems.map(f => ({ x: f.position.x, y: f.position.y, z: f.position.z, ry: f.yaw, color: f.color })), { castShadow: true });
  group.add(flags);

  // Paper lanterns hanging from four of the poles, on the ring side.
  const lanternMaterial = kit.material(0xffd28a, { emissive: new THREE.Color(0xffb35a), emissiveIntensity: 0.9, sheen: 0 });
  const capMaterial = kit.material(C.brown);
  const lanterns = [], cap = G.cylinder(0.2, 0.24, 0.12), capLow = G.cylinder(0.24, 0.2, 0.1);
  for (let i = 1; i < 8; i += 2) {
    const post = posts[i], inward = post.clone().setY(0).normalize().multiplyScalar(-0.45);
    const lantern = new THREE.Group(), batch = createBatch();
    lantern.position.set(post.x + inward.x, post.y - 0.55, post.z + inward.z);
    batch.add(ball, lanternMaterial, { scale: [0.34, 0.42, 0.34], outline: 0.02 });
    batch.add(cap, capMaterial, { position: [0, 0.42, 0], scale: [0.8, 1, 0.8] });
    batch.add(capLow, capMaterial, { position: [0, -0.42, 0], scale: [0.8, 1, 0.8] });
    batch.add(G.cylinder(0.015, 0.015, 0.5, 4), capMaterial, { position: [0, 0.7, 0] });
    batch.build(lantern);
    lantern.userData.phase = i;
    group.add(lantern);
    lanterns.push(lantern);
  }

  // One layout for everything outside: the ring, poles and lawn edge are off
  // limits, and every later footprint must clear every earlier one.
  const layout = createLayout();
  layout.block({ rMin: 0, rMax: R + 3.6 });
  for (const post of posts) layout.block({ x: post.x, z: post.z, r: 0.5 });

  const { sails, balloons } = countryside(group, height, R, layout);

  // Just outside the ring: a few bushes and stray boulders, then flowers.
  const random = seeded(5), near = createBatch(), lowBall = G.lowSphere();
  const shrub = kit.material(0x9db986), shrubDark = kit.material(0x83a46f);
  const strays = [], strayShape = pebbleGeometry({ seed: 77, detail: 1, power: 2.5, roughness: 0.34 });
  for (let tries = 0, bushes = 0; (bushes < 12 || strays.length < 8) && tries < 600; tries++) {
    const a = random() * TAU, r = R + 4.5 + random() * 7.5, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z);
    if (bushes < 12 && tries % 2 === 0) {
      const size = 0.7 + random() * 0.5;
      if (!layout.take(x, z, size * 1.6, 0.8)) continue;
      bushes++;
      for (const [dx, dz, k] of [[0, 0, 1], [0.75, 0.3, 0.75], [-0.6, 0.45, 0.7]]) {
        const ox = Math.cos(a) * dx - Math.sin(a) * dz, oz = Math.sin(a) * dx + Math.cos(a) * dz;
        near.add(lowBall, (bushes + k * 4) % 2 ? shrub : shrubDark, { position: [x + ox * size, y + size * k * 0.55, z + oz * size], scale: [size * k, size * k * 0.85, size * k], outline: 0.035 });
      }
    } else if (strays.length < 8) {
      const s = 0.4 + random() * 0.4;
      if (!layout.take(x, z, s * 1.3, 0.8)) continue;
      strays.push({ x, y: y + s * 0.6, z, sx: s * 1.3, sy: s, sz: s * 1.1, ry: random() * TAU, color: STONE_TONES[strays.length % STONE_TONES.length] });
    }
  }
  near.build(group, { castShadow: false });
  group.add(instanced(strayShape, kit.material(0xffffff, { sheen: 0.1, clearcoat: 0, roughness: 0.9 }), strays));
  const flowers = [];
  for (let tries = 0; flowers.length < 120 && tries < 2000; tries++) {
    const a = random() * TAU, r = R + 4 + random() * 14, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.14 + random() * 0.1;
    if (!layout.take(x, z, s, 0.4)) continue;
    flowers.push({ x, y: height(x, z) + 0.1, z, s, color: [0xfbf6e8, 0xeea0a6, 0xe9c46a, 0xc4684f, 0xd7c2ea][flowers.length % 5] });
  }
  group.add(instanced(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshLambertMaterial({ color: 0xffffff }), flowers));

  group.add(ranges());
  // Warm mist pooled in the valleys, at the foot of each range and as a thin
  // belt across the snowy peaks.
  const mist = mistLayers([
    { radius: 72, spread: 14, y0: -2, y1: 9, color: HORIZON, opacity: 0.42, seed: 4, patchiness: 0.7, speed: 0.006 },
    { radius: 104, spread: 10, y0: -2, y1: 15, color: HORIZON, opacity: 0.8, seed: 9, patchiness: 0.5, speed: -0.004 },
    { radius: 134, spread: 6, y0: 0, y1: 24, color: HORIZON, opacity: 0.85, seed: 17, patchiness: 0.45, speed: 0.003 },
    { radius: 168, y0: 18, y1: 40, color: 0xfaf3e6, opacity: 0.55, profile: 'band', seed: 23, patchiness: 0.6, speed: -0.002 },
  ]);
  group.add(mist.group);
  const clouds = cloudLayer({ count: 7, radius: 105, height: 34, seed: 3 });
  group.add(clouds);
  const birds = birdFlock({ count: 7, radius: 44, height: 24 });
  group.add(birds.mesh);

  // Obstacles: stacking-ring pillars and toy-block walls, fading when they hide you.
  const props = obstacles.map((obstacle, index) => {
    const entry = createProp(kit, obstacle);
    toyProp(entry, obstacle, index);
    return finishProp(group, entry);
  });

  // Confetti drifting above the ring.
  const confetti = fallingFlakes({ geometry: new THREE.PlaneGeometry(0.16, 0.24), colors: BUNTING, radius: R + 6 });
  group.add(confetti.mesh);
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);

  let time = 0;
  const flagEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  return {
    group, fog, props, blockShapes: Object.keys(wall.kinds),
    update(dt, camera, focus, fighters = null) {
      time += dt;
      flagItems.forEach((f, i) => {
        quaternion.setFromEuler(flagEuler.set(Math.sin(time * 2.2 + f.phase) * 0.25, f.yaw, 0));
        flags.setMatrixAt(i, matrix.compose(f.position, quaternion, scale));
      });
      flags.instanceMatrix.needsUpdate = true;
      for (const lantern of lanterns) lantern.rotation.z = Math.sin(time * 1.3 + lantern.userData.phase) * 0.06;
      clouds.rotation.y -= dt * 0.004;
      mist.update(dt);
      sails.rotation.z -= dt * 0.6;
      for (const balloon of balloons) {
        const { angle, r, y, phase } = balloon.userData, a = angle + time * 0.012;
        balloon.position.set(Math.cos(a) * r, y + Math.sin(time * 0.4 + phase) * 1.2, Math.sin(a) * r);
        balloon.rotation.y = time * 0.05 + phase;
      }
      birds.update(time);
      confetti.update(time, camera?.position);
      see.update(dt, camera, fighters);
      fadeProps(props, dt, camera, focus, fighters);
    },
  };
}
