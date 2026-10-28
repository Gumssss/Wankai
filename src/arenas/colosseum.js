import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createKit, geometry as G } from '../models/toy-kit.js';
import {
  TAU, seeded, smoothstep, createNoise, skyDome, addLights, createBatch, coloredGeometry, instanced, latheBands, terrainRing,
  canvasTexture, fallingFlakes, cloudLayer, birdFlock, createProp, finishProp, fadeProps, softMaterial, farMaterial,
  createLayout, groundUnder, findSite, pebbleGeometry, horizonNoise, ridgeRanges, mistLayers, canopyGeometry, createSeeThrough,
} from './common.js';

// 罗马角斗场: a toy Roman amphitheatre in warm late-afternoon light. A raked
// sand floor inside a low marble podium, braziers and banners on the podium,
// a gentle lower bowl of seats full of 火柴人 stick-figure spectators, a steeper upper bowl
// crowned by an open arcade with velarium masts and striped awnings. One side
// has crumbled, opening the view to cypresses, a terracotta city, an
// aqueduct and lavender hills.
const HORIZON = 0xf2d2a4;
const MARBLE = 0xf1e6d0, TRAVERTINE = 0xe2d3b5, STONE = 0xd5c3a1, SHADE = 0xc7b48f;
const RUIN = Object.freeze({ start: -0.42, end: 1.18 });
const inRuin = a => { const t = ((a - RUIN.start) % TAU + TAU) % TAU; return t < RUIN.end - RUIN.start; };
// Cross-section of the stands (radii relative to the arena, heights absolute).
const LOWER = Object.freeze({ start: 2.6, rows: 8, tread: 1.3, rise: 0.42, floor: 2.92 });
const UPPER = Object.freeze({ rows: 7, tread: 1.2, rise: 0.85 });

function sandTexture(radius, anisotropy) {
  return canvasTexture(1024, (c, size) => {
    const k = size / 2 / radius, random = seeded(311);
    c.fillStyle = '#e6c891';
    c.fillRect(0, 0, size, size);
    for (let i = 0; i < 34000; i++) {
      c.fillStyle = ['#fff3d21a', '#a5824a16', '#c99a5a14'][i % 3];
      c.fillRect(random() * size, random() * size, random() * 2.6 + 0.4, random() * 2.6 + 0.4);
    }
    c.translate(size / 2, size / 2);
    // Raked rings and a darker scuffed band along the podium.
    for (let r = 2.4; r < radius - 1.6; r += 0.55) {
      c.strokeStyle = '#b48f5a14'; c.lineWidth = 0.07 * k;
      c.beginPath(); c.arc(0, 0, r * k, 0, TAU); c.stroke();
    }
    const band = c.createRadialGradient(0, 0, (radius - 3.2) * k, 0, 0, radius * k);
    band.addColorStop(0, '#c99a5a00'); band.addColorStop(1, '#a8794455');
    c.fillStyle = band; c.beginPath(); c.arc(0, 0, radius * k, 0, TAU); c.fill();
    const ring = (r, width, color) => { c.strokeStyle = color; c.lineWidth = width * k; c.beginPath(); c.arc(0, 0, r * k, 0, TAU); c.stroke(); };
    ring(radius - 1.4, 0.18, '#b5523b70');
    ring(8.2, 0.28, '#c8a06a90');
    // Laurel wreath and a sun-burst medallion in the centre.
    ring(3.3, 0.1, '#7f8f4e90');
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * TAU;
      for (const side of [-1, 1]) {
        c.save(); c.rotate(a); c.translate(3.3 * k, 0); c.rotate(side * 0.7);
        c.fillStyle = i % 2 ? '#7f8f4ea8' : '#94a35ca8';
        c.beginPath(); c.ellipse(0.22 * k * side, 0, 0.28 * k, 0.1 * k, 0, 0, TAU); c.fill();
        c.restore();
      }
    }
    c.fillStyle = '#f2ddb0';
    c.beginPath(); c.arc(0, 0, 2.2 * k, 0, TAU); c.fill();
    c.fillStyle = '#d9a95ab0';
    c.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = i / 24 * TAU, r = (i % 2 ? 0.8 : 1.85) * k;
      i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.fill();
    c.fillStyle = '#b5523bb0';
    c.beginPath(); c.arc(0, 0, 0.55 * k, 0, TAU); c.fill();
  }, anisotropy);
}

function bannerTexture() {
  return canvasTexture(128, (c, size) => {
    c.fillStyle = '#9d3b2c'; c.fillRect(0, 0, size, size);
    c.fillStyle = '#e2b04f'; c.fillRect(0, 0, size, size * 0.08); c.fillRect(size * 0.06, 0, size * 0.05, size); c.fillRect(size * 0.89, 0, size * 0.05, size);
    c.strokeStyle = '#e8bf62'; c.lineWidth = size * 0.05;
    c.beginPath(); c.arc(size / 2, size * 0.45, size * 0.2, 0, TAU); c.stroke();
    c.fillStyle = '#e8bf62';
    c.beginPath(); c.moveTo(size * 0.5, size * 0.33); c.lineTo(size * 0.58, size * 0.52); c.lineTo(size * 0.42, size * 0.52); c.fill();
    // Swallow-tail cut-out at the bottom.
    c.globalCompositeOperation = 'destination-out';
    c.beginPath(); c.moveTo(size * 0.2, size); c.lineTo(size * 0.5, size * 0.8); c.lineTo(size * 0.8, size); c.fill();
  });
}

// Painted podium frieze: framed red and ochre panels between fluted pilasters.
function friezeTexture(anisotropy) {
  const texture = canvasTexture(512, c => {
    c.fillStyle = '#efe3cb'; c.fillRect(0, 0, 512, 256);
    const panel = (x, color, wreath) => {
      c.fillStyle = '#d6a85a'; c.fillRect(x - 92, 46, 184, 158);
      c.fillStyle = color; c.fillRect(x - 86, 52, 172, 146);
      c.strokeStyle = '#e7c27c'; c.lineWidth = 3; c.strokeRect(x - 72, 66, 144, 118);
      c.strokeStyle = c.fillStyle = '#ecc87c';
      if (wreath) { c.lineWidth = 6; c.beginPath(); c.arc(x, 125, 28, Math.PI * 0.65, Math.PI * 2.35); c.stroke(); }
      else { c.beginPath(); c.moveTo(x, 95); c.lineTo(x + 24, 125); c.lineTo(x, 155); c.lineTo(x - 24, 125); c.fill(); }
    };
    panel(128, '#a4483a', true);
    panel(384, '#c98f4a', false);
    for (const x of [0, 256, 512]) {
      c.fillStyle = '#f7efdf'; c.fillRect(x - 20, 26, 40, 196);
      c.strokeStyle = '#d9c7a5'; c.lineWidth = 3;
      for (const dx of [-10, 0, 10]) { c.beginPath(); c.moveTo(x + dx, 36); c.lineTo(x + dx, 212); c.stroke(); }
    }
    c.fillStyle = '#d9c7a5'; c.fillRect(0, 16, 512, 7);
    for (let x = 4; x < 512; x += 16) { c.fillStyle = '#e2d1af'; c.fillRect(x, 0, 9, 13); }
    c.fillStyle = '#c2ab86'; c.fillRect(0, 228, 512, 28);
    c.fillStyle = '#ad9470'; c.fillRect(0, 224, 512, 5);
  }, anisotropy, 256);
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(26, 1);
  return texture;
}

// Inner profile: podium, walkway, lower bowl, praecinctio, upper bowl, top walkway.
function standBands(radius) {
  const R = radius, bands = [];
  let r = R + LOWER.start, y = LOWER.floor;
  for (let k = 0; k < LOWER.rows; k++) {
    bands.push([r, y, r, y + LOWER.rise, k % 2 ? SHADE : STONE]);
    bands.push([r, y + LOWER.rise, r + LOWER.tread, y + LOWER.rise, k % 2 ? TRAVERTINE : MARBLE]);
    r += LOWER.tread; y += LOWER.rise;
  }
  const lowerTop = { r, y };
  bands.push([r, y, r + 1.5, y, 0xd8c6a3]);
  r += 1.5;
  bands.push([r, y, r, y + 1.22, 0xd9b48a]);
  y += 1.22;
  bands.push([r, y, r + 0.55, y, MARBLE]);
  r += 0.55;
  const upperStart = { r, y };
  for (let k = 0; k < UPPER.rows; k++) {
    bands.push([r, y, r, y + UPPER.rise, k % 2 ? SHADE : STONE]);
    bands.push([r, y + UPPER.rise, r + UPPER.tread, y + UPPER.rise, k % 2 ? TRAVERTINE : MARBLE]);
    r += UPPER.tread; y += UPPER.rise;
  }
  bands.push([r, y, r + 1.8, y, 0xd8c6a3]);
  const top = { r: r + 1.8, y };
  bands.push([top.r + 1.4, y, top.r + 1.4, 0, TRAVERTINE]);
  return { bands, lowerTop, upperStart, top, balteus: lowerTop.r + 1.5 };
}

// An arch panel: a wall slab with an arched opening, extruded along +z.
function archPanel(width, height, opening, spring, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  const hole = new THREE.Path(), r = opening / 2;
  hole.moveTo(-r, 0); hole.lineTo(-r, spring); hole.absarc(0, spring, r, Math.PI, 0, true); hole.lineTo(r, 0); hole.closePath();
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 7 }).translate(0, 0, -depth / 2);
}

function archDecal(width, height) {
  const shape = new THREE.Shape(), r = width / 2;
  shape.moveTo(-r, 0); shape.lineTo(-r, height - r); shape.absarc(0, height - r, r, Math.PI, 0, true); shape.lineTo(r, 0); shape.closePath();
  return new THREE.ShapeGeometry(shape, 8);
}

// Fluted column shaft whose top can be snapped off at an angle.
function columnShaft(radius, height, broken, seed) {
  const geometry = new THREE.CylinderGeometry(1, 1, height, 48, 6);
  const pos = geometry.attributes.position, random = seeded(seed), tilt = random() * TAU;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(z, x), side = Math.hypot(x, z);
    const flute = radius * (1 - 0.045 * Math.pow(Math.abs(Math.cos(a * 10)), 0.6));
    let ny = y + height / 2;
    if (broken && ny > height - 1e-3) ny = height - 0.42 * (0.5 + 0.5 * Math.cos(a - tilt)) - 0.06 * Math.abs(Math.sin(a * 5 + tilt));
    pos.setXYZ(i, x * flute, ny, z * flute);
    if (side < 1e-6) pos.setY(i, ny);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function landscape() {
  const noise = createNoise(23);
  const height = (x, z, r = Math.hypot(x, z)) => {
    const hills = smoothstep(58, 95, r) * (noise.fbm(x / 30, z / 30, 3) * 26 - 4) + smoothstep(100, 130, r) * noise.fbm(x / 24 + 4, z / 24, 3) * 10;
    return Math.max(0, hills) * (1 - smoothstep(118, 140, r) * 0.8) - 0.05;
  };
  const grass = new THREE.Color(), dry = new THREE.Color(0xd6c17e), green = new THREE.Color(0xa9ad6a), deep = new THREE.Color(0x8f955f);
  const plaza = new THREE.Color(0xe0cfae), sunlit = new THREE.Color(0xe2c98a);
  const paint = (x, y, z, r, color) => {
    grass.copy(green).lerp(dry, smoothstep(0.35, 0.75, noise(x / 34, z / 34))).lerp(deep, smoothstep(0.55, 0.8, noise(x / 20 + 5, z / 20)) * 0.5);
    grass.lerp(sunlit, smoothstep(6, 18, y) * 0.3);
    color.copy(plaza).lerp(grass, smoothstep(54, 60, r));
  };
  const mesh = new THREE.Mesh(terrainRing({ inner: 40, outer: 205, rings: 64, segments: 200, height, paint, power: 1.35 }), farMaterial());
  mesh.receiveShadow = true;
  mesh.name = 'colosseum-landscape';
  return { mesh, height };
}

// Olive hills, then dusty lavender ranges, softening into the golden haze.
function ranges() {
  const ridge = horizonNoise(77), sun = [-30, 25, 15];
  const layers = [
    { radius: 138, depth: 18, lo: 10, hi: 24, scale: 2.4, body: 0x9c9a6e, top: 0x7f8158, fade: 0.38, mistTop: 10 },
    { radius: 162, depth: 24, lo: 18, hi: 40, scale: 3.4, body: 0x9a96aa, top: 0x77749a, fade: 0.5, mistTop: 16 },
    { radius: 190, depth: 28, lo: 30, hi: 56, scale: 4.6, body: 0xaca7bc, top: 0x8f8bae, fade: 0.62, mistTop: 22 },
  ];
  return ridgeRanges(layers.map((layer, i) => ({ radius: layer.radius, depth: layer.depth, haze: HORIZON, fade: layer.fade, mistTop: layer.mistTop,
    height: a => layer.lo + (layer.hi - layer.lo) * Math.pow(smoothstep(0.22, 0.78, ridge(a, layer.scale, 4, i * 17)), 1.3),
    colors: { body: layer.body, ridge: layer.top }, crest: [0.5, 1], shade: { direction: sun, amount: 0.32 } })), 'colosseum-ranges');
}

// A flame-shaped Italian cypress, dark at the foot and lit towards the tip.
function cypressGeometry() {
  const profile = [[0, 0], [0.32, 0.2], [0.9, 1.1], [1.05, 2.6], [0.95, 4.4], [0.7, 6.2], [0.38, 7.6], [0.1, 8.5], [0, 8.7]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const geometry = new THREE.LatheGeometry(profile, 8), pos = geometry.attributes.position, normal = geometry.attributes.normal;
  const foot = new THREE.Color(0x2f4630), tip = new THREE.Color(0x6c8a52), c = new THREE.Color(), colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    c.copy(foot).lerp(tip, smoothstep(0.5, 8, pos.getY(i)) * 0.75 + Math.max(0, normal.getX(i) * -0.6 + normal.getZ(i) * 0.3) * 0.25);
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.deleteAttribute('uv');
  geometry.translate(0, -0.3, 0);
  return geometry;
}

// Cypresses, umbrella pines, a few terracotta quarters, temples, a domed
// hall and an aqueduct. One collision layout places everything: the
// amphitheatre, the aqueduct line and every footprint are kept clear.
function campagna(group, height) {
  const random = seeded(19), layout = createLayout();
  layout.block({ rMin: 0, rMax: 49.5 });
  layout.block({ rMin: 118, rMax: 1e4 }); // where the first range rises

  // Aqueduct marching across the hills: level top, piers sunk into the ground.
  const aqueduct = [], start = new THREE.Vector2(Math.cos(1.8) * 114, Math.sin(1.8) * 114), end = new THREE.Vector2(Math.cos(0.65) * 92, Math.sin(0.65) * 92);
  const span = 5.2, length = start.distanceTo(end), heading = Math.atan2(end.y - start.y, end.x - start.x), topY = 30;
  for (let d = 0; d < length; d += span) {
    const x = start.x + Math.cos(heading) * d, z = start.y + Math.sin(heading) * d, ground = groundUnder(height, x, z, 1.6, 6).min;
    if (topY - ground < 4) continue;
    aqueduct.push({ x, z, y: topY, ry: -heading, sy: (topY - ground + 2) / 26 });
  }
  layout.block({ ax: start.x, az: start.y, bx: end.x, bz: end.y, r: 2.4 });
  const aqueductGeometry = archPanel(span + 0.05, 26, 3.4, 20, 2.2).translate(0, -26, 0);
  group.add(instanced(aqueductGeometry, softMaterial({ vertexColors: false, color: 0xe1c9a0 }), aqueduct));

  // Temples on stepped podiums (a podium hides any slope under them).
  const templeParts = (columns) => {
    const parts = [{ geometry: new THREE.BoxGeometry(10, 5.2, 15), color: 0xe9dcc2, position: [0, -1.4, 0] },
      { geometry: new THREE.BoxGeometry(7, 5.2, 9), color: 0xf0e4cc, position: [0, 3.8, -1.6] },
      { geometry: new THREE.CylinderGeometry(5.6, 5.6, 9, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).scale(1, 0.35, 1.55).rotateY(Math.PI / 2), color: 0xc0623f, position: [0, 7.5, 0] }];
    for (let i = 0; i < columns; i++) for (const z of [6.6, 4.8]) {
      parts.push({ geometry: new THREE.CylinderGeometry(0.38, 0.42, 5.2, 10), color: 0xf6efe0, position: [-4 + i * 8 / (columns - 1), 3.8, z] });
    }
    return parts;
  };
  const templeGeometry = coloredGeometry(templeParts(6)), templeMaterial = softMaterial();
  for (const [a, r, s] of [[0.45, 84, 1.25], [3.4, 90, 1.2], [5.5, 96, 1.1]]) {
    const site = findSite(layout, height, random, { angle: a, distance: r, r: 9.2 * s, slope: 3.2, spread: 0.3, depth: 14 });
    if (!site) continue;
    const mesh = new THREE.Mesh(templeGeometry, templeMaterial);
    mesh.position.set(site.x, site.ground.max - 0.3, site.z); mesh.rotation.y = -site.a - Math.PI / 2; mesh.scale.setScalar(s);
    group.add(mesh);
  }
  const domeSite = findSite(layout, height, random, { angle: 0.15, distance: 100, r: 11.5, slope: 2.4, spread: 0.2, depth: 12 });
  if (domeSite) {
    const dome = new THREE.Mesh(coloredGeometry([
      { geometry: new THREE.CylinderGeometry(6, 6, 9, 28), color: 0xeedfc4, position: [0, 1.5, 0] },
      { geometry: new THREE.SphereGeometry(6, 28, 12, 0, TAU, 0, Math.PI / 2), color: 0xb9c3c0, position: [0, 6, 0] },
      { geometry: new THREE.CylinderGeometry(0.9, 0.9, 1, 12), color: 0xf3ead8, position: [0, 11.8, 0] },
      { geometry: new THREE.BoxGeometry(6, 8.5, 4), color: 0xf0e4cc, position: [0, 1.25, 7] },
    ]), softMaterial());
    dome.position.set(domeSite.x, domeSite.ground.max - 0.3, domeSite.z); dome.rotation.y = -domeSite.a - Math.PI / 2; dome.scale.setScalar(1.25);
    group.add(dome);
  }

  // Terracotta quarters: houses packed close on gentle ground, set halfway
  // into the slope on a deep footing, with a bell tower or two rising
  // above the roofs so each quarter reads as one massed silhouette.
  const houses = [], towers = [];
  for (const [angle, distance] of [[0.95, 76], [2.4, 82], [3.75, 74], [5.05, 80], [5.9, 70]]) {
    for (let i = 0; i < 16; i++) {
      const s = 0.85 + random() * 0.45, tower = i < 2 && random() < 0.8;
      const site = findSite(layout, height, random, { angle, distance, r: (tower ? 1.4 : 2.2) * s, slope: 1.5, spread: 0.2, depth: 14, tries: 40 });
      if (!site) continue;
      const entry = { x: site.x, z: site.z, y: (site.ground.min + site.ground.max) / 2 - 0.1, ry: -site.a + (random() < 0.5 ? 0 : Math.PI / 2), s };
      (tower ? towers : houses).push(entry);
    }
  }
  const body = coloredGeometry([
    { geometry: new THREE.BoxGeometry(3, 3.8, 2.6), color: 0xffffff, position: [0, 0.7, 0] },
    { geometry: new THREE.BoxGeometry(0.5, 0.7, 0.06), color: 0x5a4030, position: [-0.7, 1.6, 1.32] },
    { geometry: new THREE.BoxGeometry(0.5, 0.7, 0.06), color: 0x5a4030, position: [0.7, 1.6, 1.32] },
    { geometry: new THREE.BoxGeometry(0.06, 0.7, 0.5), color: 0x5a4030, position: [1.52, 1.6, 0] },
  ]);
  const storeys = i => 1 + (i % 3) * 0.45;
  group.add(instanced(body, softMaterial(), houses.map((h, i) => ({ ...h, sy: h.s * storeys(i), color: [0xf4e2c4, 0xeccfa6, 0xf0d8c0, 0xe7c08f, 0xf6ead6][i % 5] }))));
  const roof = new THREE.ConeGeometry(2.25, 1.1, 4).rotateY(Math.PI / 4).scale(1.05, 1, 0.92);
  group.add(instanced(roof, softMaterial({ vertexColors: false, color: 0xffffff }),
    houses.map((h, i) => ({ ...h, y: h.y + 2.6 * h.s * storeys(i) + 0.5 * h.s, color: [0xc0623f, 0xb5523b, 0xcf7a4f][i % 3] }))));
  group.add(instanced(coloredGeometry([
    { geometry: new THREE.BoxGeometry(2.2, 11, 2.2), color: 0xeedcbc, position: [0, 3.5, 0] },
    { geometry: new THREE.BoxGeometry(0.5, 1.1, 2.3), color: 0x5a4030, position: [0, 7.6, 0] },
    { geometry: new THREE.BoxGeometry(2.3, 1.1, 0.5), color: 0x5a4030, position: [0, 7.6, 0] },
    { geometry: new THREE.ConeGeometry(1.75, 1.6, 4).rotateY(Math.PI / 4), color: 0xb5523b, position: [0, 9.8, 0] },
  ]), softMaterial(), towers));

  // Cypresses: a calm ring round the plaza, avenues lining the roads out
  // into the campagna, and a few dark clumps on the hills. Umbrella pines
  // get room of their own for their wide, flat crowns.
  const cypress = [], pines = [];
  for (let i = 0; i < 24; i++) {
    const a = (i + 0.5) / 24 * TAU, x = Math.cos(a) * 53, z = Math.sin(a) * 53, s = 0.95 + (i % 3) * 0.12;
    if (layout.take(x, z, 1.0 * s, 0.3)) cypress.push({ x, z, y: groundUnder(height, x, z, 0.5, 4).min - 0.1, ry: a, s });
  }
  for (const road of [0.25, 1.62, 3.3, 4.75]) {
    for (let d = 60; d < 112; d += 4.2) for (const side of [-1, 1]) {
      const a = road + side * 2.4 / d, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.9 + random() * 0.25;
      if (layout.take(x, z, 0.95 * s, 0.25)) cypress.push({ x, z, y: groundUnder(height, x, z, 0.5, 4).min - 0.1, ry: random() * TAU, s });
    }
  }
  for (let tries = 0, clumps = 0; clumps < 9 && tries < 400; tries++) {
    const a = random() * TAU, d = 66 + random() * 50;
    let n = 0;
    for (let k = 0; k < 6; k++) {
      const x = Math.cos(a) * d + (random() - 0.5) * 7, z = Math.sin(a) * d + (random() - 0.5) * 7, s = 0.85 + random() * 0.35;
      if (layout.take(x, z, 0.95 * s, 0.2)) { cypress.push({ x, z, y: groundUnder(height, x, z, 0.5, 4).min - 0.1, ry: random() * TAU, s }); n++; }
    }
    if (n > 2) clumps++;
  }
  for (let tries = 0; pines.length < 20 && tries < 4000; tries++) {
    const a = random() * TAU, r = 60 + random() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.85 + random() * 0.4;
    if (layout.take(x, z, 3.6 * s, 0.4)) pines.push({ x, z, y: groundUnder(height, x, z, 0.6, 4).min - 0.1, ry: random() * TAU, s });
  }
  group.add(instanced(cypressGeometry(), softMaterial({ roughness: 0.9 }), cypress.map((t, i) => ({ ...t, color: [0xffffff, 0xeef2e4, 0xe4eadb][i % 3] }))));
  group.add(instanced(canopyGeometry({ seed: 5, crowns: 4, spread: 2.6, radius: 1.9, squash: 0.36, top: 0x8f9c5c, under: 0x45522f,
    trunk: 0x6e4c34, trunkHeight: 5.6, lift: 0.4, oneTrunk: true }), softMaterial({ roughness: 0.9 }), pines));
}

// 火柴人 spectators: the game's Cyanide-&-Happiness stick figure, seated
// and facing +x. A big white head and a boxy shirt with thick ink hulls,
// dot eyes, a line mouth and thin ink arms (down on the lap or raised in a
// cheer). Flat, unlit colours; every part is one InstancedMesh for the
// whole crowd, all sharing each spectator's matrix.
const SHIRT = Object.freeze({ width: 0.44, height: 0.5, depth: 0.24 });
const HEAD_RADIUS = SHIRT.width * 1.6 / 2;
const SHIRT_COLORS = [0xd9483b, 0xc4684f, 0x3f74c6, 0x568d92, 0x4f9a52, 0x8fae4e, 0xe9c23a, 0xf0a032, 0x8a5bb8, 0xb35d9a, 0xe0782f, 0x8f9496, 0x5f6670];

function stickFigureParts() {
  const shirtY = 0.04 + SHIRT.height / 2, headY = 0.04 + SHIRT.height + HEAD_RADIUS - 0.04;
  // Unlit, so only silhouettes matter: an 80-triangle rounded block is plenty.
  const block = (x, y, z) => pebbleGeometry({ detail: 1, power: 4.5, roughness: 0, flatBase: 0 }).scale(x / 2, y / 2, z / 2);
  const shirt = block(SHIRT.depth, SHIRT.height, SHIRT.width).translate(0, shirtY, 0);
  const head = new THREE.SphereGeometry(HEAD_RADIUS, 10, 7).translate(0, headY, 0);
  const hulls = mergeGeometries([
    block(SHIRT.depth + 0.08, SHIRT.height + 0.08, SHIRT.width + 0.08).translate(0, shirtY, 0),
    new THREE.SphereGeometry(HEAD_RADIUS + 0.05, 9, 6).translate(0, headY, 0),
  ].map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  // Face on the front (+x) of the head, eyes and mouth as small ink shapes.
  const onHead = (dy, dz) => Math.sqrt(HEAD_RADIUS ** 2 - dy * dy - dz * dz);
  const face = [];
  for (const side of [-1, 1]) {
    face.push(new THREE.OctahedronGeometry(1).scale(0.03, 0.05, 0.035).translate(onHead(0.05, 0.1) - 0.004, headY + 0.05, side * 0.1));
  }
  face.push(new THREE.BoxGeometry(0.03, 0.026, 0.13).translate(onHead(-0.1, 0) - 0.006, headY - 0.1, 0));
  // Thin ink arms from the shirt's top corners.
  const limb = (from, to) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), dir = b.clone().sub(a), length = dir.length();
    const g = new THREE.CylinderGeometry(0.026, 0.026, length, 4, 1, true);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
    return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  };
  const shoulder = 0.04 + SHIRT.height - 0.05, w = SHIRT.width / 2;
  const down = [-1, 1].map(s => limb([0.02, shoulder, s * w], [0.2, 0.12, s * (w + 0.05)]));
  const up = [-1, 1].map(s => limb([0.0, shoulder, s * w], [0.06, shoulder + 0.55, s * (w + 0.17)]));
  const ink = list => mergeGeometries([...face, ...list].map(g => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g.index ? g.toNonIndexed() : g; }));
  return { shirt, head, hulls, inkDown: ink(down), inkUp: ink(up) };
}

// `patch` makes the materials see-through: front-row spectators can stand
// between the follow camera and a fighter.
function stickCrowd(group, seats, patch = m => m) {
  const parts = stickFigureParts(), count = seats.length;
  const flat = (color, extra = {}) => patch(new THREE.MeshBasicMaterial({ color, ...extra }));
  const make = (geometry, material) => {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  };
  const head = make(parts.head, flat(0xfbfaf6));
  const shirt = make(parts.shirt, flat(0xffffff));
  const hull = make(parts.hulls, flat(0x1f2320, { side: THREE.BackSide }));
  const inkDown = make(parts.inkDown, flat(0x1f2320));
  const inkUp = make(parts.inkUp, flat(0x1f2320));
  const color = new THREE.Color();
  seats.forEach((seat, i) => shirt.setColorAt(i, color.set(seat.color)));
  const t = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const update = (time, eye) => {
    for (let i = 0; i < count; i++) {
      const p = seats[i];
      // A slow wave runs round the bowl; a few fans cheer all the time.
      const wave = Math.cos(p.a - time * 0.45);
      const cheering = p.fan || wave > 0.94;
      const hop = cheering ? Math.max(0, Math.sin(time * 7 + p.phase)) * 0.16 : Math.sin(time * 1.6 + p.phase) * 0.018;
      const shrink = eye ? smoothstep(4.5, 8, Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z)) : 1;
      t.position.set(p.x, p.y + hop * shrink, p.z);
      t.rotation.set(0, p.ry, Math.sin(time * (cheering ? 5 : 1.1) + p.phase) * (cheering ? 0.08 : 0.03));
      t.scale.setScalar(Math.max(1e-3, p.s * shrink));
      t.updateMatrix();
      head.setMatrixAt(i, t.matrix); shirt.setMatrixAt(i, t.matrix); hull.setMatrixAt(i, t.matrix);
      inkUp.setMatrixAt(i, cheering ? t.matrix : hidden);
      inkDown.setMatrixAt(i, cheering ? hidden : t.matrix);
    }
    for (const mesh of [head, shirt, hull, inkDown, inkUp]) mesh.instanceMatrix.needsUpdate = true;
  };
  update(0, null);
  return { update };
}

export function buildColosseum({ radius, obstacles, anisotropy = 4 }) {
  const kit = createKit(), group = new THREE.Group(), R = radius;
  group.name = 'colosseum';
  const sunPosition = [-30, 25, 15];
  group.add(skyDome({ top: 0x6f9cc8, horizon: HORIZON, ground: HORIZON, sunDirection: sunPosition, sunColor: 0xffd59a, glow: 0.45, disc: 1.1 }));
  // Golden late-afternoon haze: the bowl stays clear, the campagna softens
  // and the far ranges are pale lavender shapes melting into the sky.
  const fog = new THREE.Fog(HORIZON, 26, 145);
  addLights(group, {
    hemisphere: { sky: 0xffe8c8, ground: 0xa88a62, intensity: 2.3 },
    sun: { color: 0xffd8a8, intensity: 3.5, position: sunPosition },
    rim: { color: 0xb8c8ff, intensity: 0.6, position: [24, 12, -20] },
  });

  // Sand floor.
  const floor = kit.part(group, new THREE.CircleGeometry(R + 0.9, 128),
    kit.material(0xffffff, { map: sandTexture(R + 0.9, anisotropy), sheen: 0, clearcoat: 0, roughness: 0.95 }),
    { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.002, 0], outline: 0, shadow: false });
  floor.receiveShadow = true;

  // Podium wall (casts shadows on the sand) and the stands (no shadows).
  // Both, and everything fixed to them, turn see-through where they hide a
  // fighter from the camera (which often sits out over the lower stands).
  const Rw = R + 0.08;
  const lowerTop = R + LOWER.start + LOWER.rows * LOWER.tread;
  const see = createSeeThrough({ solid: (x, y, z) => {
    const r = Math.hypot(x, z);
    if (r < R - 0.05 || y < -0.1) return false;
    if (r < R + LOWER.start) return y < 2.92;
    // Treads plus a seated spectator's height.
    if (r < lowerTop) return y < LOWER.floor + (Math.floor((r - R - LOWER.start) / LOWER.tread) + 1) * LOWER.rise + 0.95;
    return y < LOWER.floor + LOWER.rows * LOWER.rise + 1.22;
  } });
  const podium = new THREE.Mesh(latheBands([
    [Rw, 2.6, R - 0.05, 2.6, SHADE],
    [R - 0.05, 2.6, R - 0.05, 2.92, 0xf7efdf],
    [R - 0.05, 2.92, R + LOWER.start, 2.92, 0xdcc9a6],
  ], { segments: 160 }), see.patch(kit.material(0xffffff, { vertexColors: true, sheen: 0.2 })));
  podium.castShadow = true; podium.receiveShadow = true;
  group.add(podium);
  const frieze = new THREE.Mesh(latheBands([[Rw, 0, Rw, 2.6, 0xffffff]], { segments: 160 }),
    see.patch(kit.material(0xffffff, { map: friezeTexture(anisotropy), sheen: 0.15, clearcoat: 0 })));
  frieze.castShadow = true; frieze.receiveShadow = true;
  group.add(frieze);
  const stands = standBands(R);
  const cavea = new THREE.Mesh(latheBands(stands.bands, { segments: 160 }), see.patch(kit.material(0xffffff, { vertexColors: true, sheen: 0.15, clearcoat: 0 })));
  cavea.receiveShadow = true;
  group.add(cavea);

  // Two gates on the x axis, behind the start positions.
  const gateAngles = [0, Math.PI];
  const gateBatch = createBatch(), wood = see.patch(kit.material(0x8a5a35)), dark = see.patch(kit.material(0x3f2f25, { sheen: 0 }));
  const bronze = see.patch(kit.material(0xc08a3e, { metalness: 0.3, roughness: 0.45 })), marbleTrim = see.patch(kit.material(MARBLE));
  for (const a of gateAngles) {
    const c = Math.cos(a), s = Math.sin(a), ry = -a - Math.PI / 2;
    gateBatch.add(archDecal(3.2, 2.45), dark, { position: [c * (Rw - 0.01), 0, s * (Rw - 0.01)], rotation: [0, ry, 0] });
    gateBatch.add(G.box(2.7, 2.0, 0.1, 0.03), wood, { position: [c * (Rw - 0.03), 1.0, s * (Rw - 0.03)], rotation: [0, ry, 0], outline: 0.02 });
    gateBatch.add(G.torus(1.62, 0.13, Math.PI), marbleTrim, { position: [c * (Rw - 0.05), 0.85, s * (Rw - 0.05)], rotation: [0, ry, 0], outline: 0.02 });
    for (const dx of [-0.65, 0.65]) gateBatch.add(G.sphere(), bronze, { position: [c * (Rw - 0.1) - s * dx, 1.05, s * (Rw - 0.1) + c * dx], scale: 0.09 });
  }
  gateBatch.build(group, { castShadow: false, inkMaterial: see.ink() });

  // Dark vomitoria in the wall between the bowls.
  const vomitoria = [];
  for (let i = 0; i < 24; i++) {
    const a = (i + 0.5) / 24 * TAU;
    vomitoria.push({ x: Math.cos(a) * (stands.balteus - 0.02), y: stands.lowerTop.y, z: Math.sin(a) * (stands.balteus - 0.02), ry: -a - Math.PI / 2 });
  }
  group.add(instanced(archDecal(1.3, 1.12), see.patch(new THREE.MeshBasicMaterial({ color: 0x5a4433 })), vomitoria));

  // Open arcade crowning the stands, missing over the ruined side.
  const arcadeR = stands.top.r + 0.7, arcadeCount = 76, arcadeWidth = TAU * arcadeR / arcadeCount;
  const arches = [], piers = [], masts = [], random = seeded(7), rubbleLayout = createLayout();
  for (let i = 0; i < arcadeCount; i++) {
    const a = (i + 0.5) / arcadeCount * TAU, x = Math.cos(a) * arcadeR, z = Math.sin(a) * arcadeR, ry = Math.PI / 2 - a;
    if (inRuin(a)) {
      const t = ((a - RUIN.start) % TAU + TAU) % TAU / (RUIN.end - RUIN.start), edge = Math.pow(Math.abs(t * 2 - 1), 3);
      const h = 0.6 + edge * 4.5 + random() * 1.6;
      piers.push({ x, y: stands.top.y + h / 2, z, ry, sx: arcadeWidth * (0.35 + random() * 0.3), sy: h, sz: 1.4 });
      rubbleLayout.block({ x, z, r: 1.1 });
    } else {
      arches.push({ x, y: stands.top.y, z, ry });
      if (i % 3 === 0) masts.push({ a, x: Math.cos(a) * (arcadeR + 0.2), z: Math.sin(a) * (arcadeR + 0.2) });
    }
  }
  const archHeight = 5.8;
  group.add(instanced(archPanel(arcadeWidth + 0.04, archHeight, arcadeWidth * 0.62, 3.2, 1.4), kit.material(TRAVERTINE, { sheen: 0.1, clearcoat: 0 }), arches));
  group.add(instanced(new THREE.BoxGeometry(1, 1, 1), kit.material(0xdccaa8, { sheen: 0, clearcoat: 0 }), piers));
  const cornice = new THREE.Mesh(latheBands([
    [arcadeR - 0.8, archHeight - 0.25, arcadeR - 0.8, archHeight + 0.35, MARBLE],
    [arcadeR - 0.8, archHeight + 0.35, arcadeR + 0.8, archHeight + 0.35, 0xd8c6a3],
    [arcadeR + 0.8, archHeight + 0.35, arcadeR + 0.8, archHeight - 0.25, TRAVERTINE],
    [arcadeR + 0.8, archHeight - 0.25, arcadeR - 0.8, archHeight - 0.25, SHADE],
  ], { segments: 140, thetaStart: RUIN.end + 0.02, thetaLength: TAU - (RUIN.end - RUIN.start) - 0.04 }), kit.material(0xffffff, { vertexColors: true, sheen: 0 }));
  cornice.position.y = stands.top.y;
  group.add(cornice);
  // Rubble tumbling down the ruined stands, each block on its own patch.
  const rubble = [];
  for (let tries = 0; rubble.length < 28 && tries < 600; tries++) {
    const a = RUIN.start + 0.08 + random() * (RUIN.end - RUIN.start - 0.16), r = stands.top.r + 0.8 - Math.pow(random(), 1.6) * 6;
    const steps = Math.min(UPPER.rows, Math.max(0, Math.floor((r - stands.upperStart.r) / UPPER.tread) + 1));
    const s = 0.45 + random() * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!rubbleLayout.take(x, z, s * 0.9, 0.1)) continue;
    rubble.push({ x, y: stands.upperStart.y + steps * UPPER.rise + s * 0.3, z, ry: random() * TAU, rx: random() * 0.3, sx: s * 1.4, sy: s, sz: s, color: [MARBLE, TRAVERTINE, 0xd8c6a3][rubble.length % 3] });
  }
  group.add(instanced(G.box(1, 1, 1, 0.12), kit.material(0xffffff, { sheen: 0, clearcoat: 0 }), rubble));

  // Velarium: masts with pennants and striped awnings over the upper bowl.
  const mastTop = stands.top.y + archHeight + 5.5;
  group.add(instanced(new THREE.CylinderGeometry(0.13, 0.17, 6, 6).translate(0, 3, 0), kit.material(0x8a5a35, { sheen: 0 }),
    masts.map(m => ({ x: m.x, y: stands.top.y + archHeight - 0.2, z: m.z }))));
  const awning = [], awningColors = [], c0 = new THREE.Color(0xb5523b), c1 = new THREE.Color(0xf4e7cf);
  const innerR = stands.upperStart.r + 1.2, innerY = stands.top.y + archHeight + 1.2, steps = 6;
  for (let m = 0; m < masts.length - 1; m++) {
    const a0 = masts[m].a, a1 = masts[m + 1].a;
    if (a1 - a0 > 0.5) continue;
    const color = m % 2 ? c0 : c1;
    for (let k = 0; k < steps; k++) {
      const pts = [];
      for (const t of [k / steps, (k + 1) / steps]) {
        const r = arcadeR + (innerR - arcadeR) * t, y = mastTop - 0.4 + (innerY - mastTop + 0.4) * t - Math.sin(t * Math.PI) * 0.9;
        const sag = Math.sin(t * Math.PI) * 0.12;
        pts.push([Math.cos(a0 + sag * 0.1) * r, y, Math.sin(a0 + sag * 0.1) * r], [Math.cos(a1) * r, y, Math.sin(a1) * r]);
      }
      const [p0, p1, p2, p3] = pts;
      awning.push(...p0, ...p2, ...p1, ...p1, ...p2, ...p3);
      for (let v = 0; v < 6; v++) awningColors.push(color.r, color.g, color.b);
    }
  }
  const awningGeometry = new THREE.BufferGeometry();
  awningGeometry.setAttribute('position', new THREE.Float32BufferAttribute(awning, 3));
  awningGeometry.setAttribute('color', new THREE.Float32BufferAttribute(awningColors, 3));
  awningGeometry.computeVertexNormals();
  const awningMesh = new THREE.Mesh(awningGeometry, kit.material(0xffffff, { vertexColors: true, side: THREE.DoubleSide, sheen: 0.5, clearcoat: 0 }));
  group.add(awningMesh);
  const pennantGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(1.6, -0.35, 0)]);
  pennantGeometry.computeVertexNormals();
  const pennants = new THREE.InstancedMesh(pennantGeometry, kit.material(0xffffff, { side: THREE.DoubleSide, sheen: 0 }), masts.length);
  masts.forEach((m, i) => pennants.setColorAt(i, new THREE.Color([0xb5523b, 0xe2b04f, 0x9d3b2c][i % 3])));
  pennants.frustumCulled = false;
  group.add(pennants);

  // 火柴人 spectators seated on the treads, facing the arena (none on the
  // crumbled part or in front of the gates). Seats are at least a head apart.
  const seats = [];
  for (const [tier, startR, startY, fill] of [[LOWER, R + LOWER.start, LOWER.floor, 0.36], [UPPER, stands.upperStart.r, stands.upperStart.y, 0.26]]) {
    for (let k = 0; k < tier.rows; k++) {
      const r = startR + tier.tread * k + tier.tread * 0.6, y = startY + tier.rise * (k + 1), count = Math.floor(TAU * r / 0.95);
      for (let j = 0; j < count; j++) {
        const a = (j + 0.5 + (random() - 0.5) * 0.06) / count * TAU;
        if (tier === UPPER && inRuin(a)) continue;
        if (gateAngles.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 0.06)) continue;
        if (random() > fill) continue;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        seats.push({ a, x, y, z, ry: Math.PI - a + (random() - 0.5) * 0.3, s: 0.95 + random() * 0.12, phase: random() * TAU,
          fan: random() < 0.14, color: SHIRT_COLORS[Math.floor(random() * SHIRT_COLORS.length)] });
      }
    }
  }
  const crowd = stickCrowd(group, seats, see.patch);

  // Braziers on the podium walkway and banners hanging below them.
  const braziers = [], flames = [];
  const brazierGeometry = coloredGeometry([
    { geometry: new THREE.CylinderGeometry(0.62, 0.32, 0.42, 16), color: 0xa8733a, position: [0, 1.25, 0] },
    { geometry: new THREE.TorusGeometry(0.62, 0.06, 6, 20), color: 0xd9a24e, position: [0, 1.46, 0], rotation: [Math.PI / 2, 0, 0] },
    ...[0, 1, 2].map(i => ({ geometry: new THREE.CylinderGeometry(0.05, 0.07, 1.2, 6), color: 0x6e4a2a,
      position: [Math.cos(i * TAU / 3) * 0.32, 0.55, Math.sin(i * TAU / 3) * 0.32], rotation: [Math.sin(i * TAU / 3) * 0.3, 0, -Math.cos(i * TAU / 3) * 0.3] })),
  ]);
  const banners = [];
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) / 8 * TAU, r = R + 1.05;
    braziers.push({ x: Math.cos(a) * r, y: 2.92, z: Math.sin(a) * r });
    flames.push({ x: Math.cos(a) * r, y: 2.92 + 1.42, z: Math.sin(a) * r, phase: i * 1.3 });
    if (i % 4 !== 3) {
      const b = (i + 1) / 8 * TAU;
      if (!gateAngles.some(g => Math.abs(Math.atan2(Math.sin(b - g), Math.cos(b - g))) < 0.2)) banners.push({ a: b });
    }
  }
  group.add(instanced(brazierGeometry, see.patch(kit.material(0xffffff, { vertexColors: true, metalness: 0.25, roughness: 0.5, sheen: 0 })), braziers, { castShadow: true }));
  const teardrop = (w, h) => new THREE.LatheGeometry([[0, 0], [0.55, 0.1], [0.78, 0.28], [0.66, 0.52], [0.36, 0.78], [0, 1]]
    .map(([x, y]) => new THREE.Vector2(x * w, y * h)), 12);
  const flameOuter = new THREE.InstancedMesh(teardrop(0.5, 1.45).translate(0, -0.12, 0),
    new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.88, toneMapped: false, fog: false }), flames.length);
  const flameInner = new THREE.InstancedMesh(teardrop(0.3, 0.95).translate(0, -0.06, 0),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false, fog: false }), flames.length);
  group.add(flameOuter, flameInner);
  const bannerMaterial = see.patch(new THREE.MeshLambertMaterial({ map: bannerTexture(), side: THREE.DoubleSide, alphaTest: 0.5 }));
  const bannerGeometry = new THREE.PlaneGeometry(1.1, 1.75).translate(0, -0.875, 0);
  const bannerMesh = new THREE.InstancedMesh(bannerGeometry, bannerMaterial, banners.length);
  bannerMesh.frustumCulled = false;
  group.add(bannerMesh);

  // Outside: plaza, campagna, city and hills.
  const { mesh: land, height } = landscape();
  group.add(land);
  campagna(group, height);
  group.add(ranges());
  const mist = mistLayers([
    { radius: 92, spread: 16, y0: -2, y1: 10, color: HORIZON, opacity: 0.4, seed: 6, patchiness: 0.7, speed: 0.005 },
    { radius: 110, spread: 10, y0: -2, y1: 16, color: HORIZON, opacity: 0.75, seed: 12, patchiness: 0.5, speed: -0.004 },
    { radius: 140, spread: 6, y0: 0, y1: 26, color: HORIZON, opacity: 0.85, seed: 19, patchiness: 0.45, speed: 0.003 },
    { radius: 172, y0: 22, y1: 44, color: 0xf8e2be, opacity: 0.5, profile: 'band', seed: 27, patchiness: 0.6, speed: -0.002 },
  ]);
  group.add(mist.group);
  const clouds = cloudLayer({ count: 7, radius: 115, height: 42, seed: 8, color: 0xfff4e6, emissive: 0xffe2c0, scale: 3.6 });
  group.add(clouds);
  const birds = birdFlock({ count: 8, radius: 34, height: 30, color: 0x5a4a40, seed: 4 });
  group.add(birds.mesh);

  // Obstacles: marble columns (two snapped off) and low ashlar walls.
  const base = G.cylinder(0.97, 0.99, 0.2, 40), torus = G.torus(0.86, 0.1), block = G.box(1, 1, 1, 0.07);
  const props = obstacles.map((obstacle, index) => {
    const entry = createProp(kit, obstacle), { batch, own } = entry;
    if (obstacle.kind === 'pillar') {
      const broken = index % 2 === 1, top = broken ? obstacle.height : 2.3;
      batch.add(base, own(0xe2d3b5), { position: [0, 0.1, 0], outline: 0.03 });
      batch.add(torus, own(MARBLE), { position: [0, 0.27, 0], rotation: [Math.PI / 2, 0, 0], outline: 0.03 });
      batch.add(columnShaft(0.84, top - 0.3, broken, 11 + index), own(0xf4ecdc), { position: [0, 0.3, 0], outline: 0.03 });
      if (!broken) {
        batch.add(G.cylinder(0.94, 0.82, 0.16, 32), own(MARBLE), { position: [0, 2.38, 0], outline: 0.03 });
        batch.add(G.box(1.62, 0.16, 1.62, 0.05), own(0xe8dcc2), { position: [0, 2.53, 0], rotation: [0, Math.PI / 4 + index, 0], outline: 0.03 });
        batch.add(G.sphere(), own(0xc08a3e, { metalness: 0.3, roughness: 0.45 }), { position: [0, 2.66, 0], scale: [0.34, 0.12, 0.34] });
      }
    } else {
      const { halfX, halfZ } = obstacle, w = halfX * 2, d = halfZ * 2;
      const course = (y, h, pieces, offset) => {
        let x = -halfX;
        pieces.forEach((p, i) => {
          const len = w * p;
          batch.add(block, own(i % 2 ? TRAVERTINE : 0xebe0c8), { position: [x + len / 2, y + h / 2, (offset + i) % 2 ? 0.015 : -0.015], scale: [len - 0.04, h - 0.03, d - 0.04], outline: 0.025 });
          x += len;
        });
      };
      course(0, 0.5, [0.3, 0.42, 0.28], index);
      course(0.5, 0.5, [0.22, 0.36, 0.42], index + 1);
      batch.add(block, own(MARBLE), { position: [0, 1.1, 0], scale: [w + 0.08, 0.2, d + 0.08], outline: 0.025 });
      for (const side of [-1, 1]) {
        batch.add(G.cylinder(0.32, 0.32, 0.05, 24), own(0xc08a3e, { metalness: 0.35, roughness: 0.4 }), { position: [0, 0.62, side * (halfZ + 0.02)], rotation: [Math.PI / 2, 0, 0], outline: 0.02 });
        batch.add(G.box(0.3, 0.16, 0.04, 0.02), own(0xa4483a), { position: [-1.4, 0.75, side * (halfZ + 0.01)] });
        batch.add(G.box(0.3, 0.16, 0.04, 0.02), own(0xa4483a), { position: [1.4, 0.75, side * (halfZ + 0.01)] });
      }
    }
    return finishProp(group, entry);
  });

  // Short red ribbons thrown from the stands, fluttering down over the sand
  // a little faster than confetti and twirling along their length.
  const ribbon = new THREE.PlaneGeometry(0.08, 0.46, 1, 8), ribbonPosition = ribbon.getAttribute('position');
  for (let i = 0; i < ribbonPosition.count; i++) ribbonPosition.setZ(i, Math.sin(ribbonPosition.getY(i) * 11) * 0.035);
  ribbon.computeVertexNormals();
  const ribbons = fallingFlakes({ geometry: ribbon, colors: [0xc8362b, 0xa82820, 0xd94a3a, 0x9c2219, 0xe0624c], count: 180,
    radius: R + 8, base: 0.3, span: 13, speed: 0.4, speedStep: 0.09, spin: 1.1, spinStep: 0.3, sway: 0.55, swirl: 0.035, tumble: 0.45 });
  group.add(ribbons.mesh);

  let time = 0;
  const t = new THREE.Object3D(), flameScale = new THREE.Vector3();
  return {
    group, fog, props,
    update(dt, camera, focus, fighters = null) {
      time += dt;
      flames.forEach((f, i) => {
        const flicker = 1 + Math.sin(time * 13 + f.phase) * 0.12 + Math.sin(time * 23.7 + f.phase * 2) * 0.08;
        t.position.set(f.x, f.y, f.z); t.rotation.set(0, time * 0.8 + f.phase, Math.sin(time * 3 + f.phase) * 0.06);
        t.scale.set(1, flicker, 1); t.updateMatrix(); flameOuter.setMatrixAt(i, t.matrix);
        flameScale.set(1, 1.1 + Math.sin(time * 17 + f.phase) * 0.15, 1); t.scale.copy(flameScale); t.updateMatrix(); flameInner.setMatrixAt(i, t.matrix);
      });
      flameOuter.instanceMatrix.needsUpdate = flameInner.instanceMatrix.needsUpdate = true;
      banners.forEach((b, i) => {
        t.position.set(Math.cos(b.a) * (Rw - 0.05), 2.86, Math.sin(b.a) * (Rw - 0.05));
        t.rotation.set(Math.sin(time * 1.4 + i) * 0.05, -b.a - Math.PI / 2, 0, 'YXZ'); t.scale.set(1, 1, 1); t.updateMatrix();
        bannerMesh.setMatrixAt(i, t.matrix);
      });
      bannerMesh.instanceMatrix.needsUpdate = true;
      masts.forEach((m, i) => {
        t.position.set(m.x, mastTop - 0.2, m.z);
        t.rotation.set(0, Math.sin(time * 1.6 + i) * 0.35 + 0.6, 0); t.scale.set(1, 1 + Math.sin(time * 4 + i * 1.7) * 0.08, 1); t.updateMatrix();
        pennants.setMatrixAt(i, t.matrix);
      });
      pennants.instanceMatrix.needsUpdate = true;
      // The crowd idles and cheers; spectators right next to the follow
      // camera shrink away so they never block the view of the fighters.
      crowd.update(time, camera?.position);
      clouds.rotation.y -= dt * 0.003;
      mist.update(dt);
      birds.update(time);
      ribbons.update(time, camera?.position);
      see.update(dt, camera, fighters);
      fadeProps(props, dt, camera, focus, fighters);
    },
  };
}
