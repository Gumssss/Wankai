import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createKit, geometry as G } from '../models/toy-kit.js';
import { createSculpt, shape, smin } from '../models/sculpt.js';
import {
  TAU, INK, seeded, smoothstep, clamp01, createNoise, addLights, createBatch, coloredGeometry, instanced, latheBands, terrainRing,
  canvasTexture, fallingFlakes, birdFlock, createProp, finishProp, fadeProps, softMaterial, farMaterial,
  createLayout, groundUnder, pebbleGeometry, horizonNoise, canopyGeometry, NOISE_GLSL, paintedSky, paintedRanges, featherMist,
  createSeeThrough,
} from './common.js';

// 湖中庭院: a white-marble waterside terrace in the middle of a lotus lake.
// A pale jade terrazzo floor inlaid with a lotus medallion, cloud scrolls and
// a band of sea waves; a carved white-marble balustrade with lotus-capped
// posts on a moulded plinth stepping down into the water, with four
// vermilion lanterns. Taihu scholar rocks and carved marble planters are the
// obstacles. Around it: lotus leaves, flowers and buds, koi, a zig-zag
// bridge to a hexagonal pavilion on a willow islet. Beyond the open water a
// wooded shore of willows, camphors, pines and peach blossom, a vermilion
// pagoda on a knoll, a moon bridge over an inlet and a pavilion islet; then
// layered karst ranges rising out of drifting mist, mirrored in the lake.
const HORIZON = 0xe9ede4, SKY_MID = 0xbcd2d4, SKY_TOP = 0x86adc0;
const WATER_Y = -0.9;
const SUN = [-24, 30, 18];
// The painted sun sits low in the sky on the same side as the light.
const SKY_SUN = [Math.cos(2.5), 0.24, Math.sin(2.5)];
const PAGODA_ANGLE = -0.25, MOON_ANGLE = Math.PI - 0.32, ISLE_ANGLE = 1.75;
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const MARBLE = 0xebe9e1, MARBLE_SHADE = 0xd4d6cc, MARBLE_WET = 0xa9bfb2;
const VERMILION = 0xc4473a, GOLD = 0xe2b04f, ROOF = 0x56636b;
const BRIDGE_ANGLE = -0.55;

// ---------------------------------------------------------------- floor ---

// A ruyi cloud scroll (祥云) in local units: three lobes with curls and a tail.
function cloudScroll(c, s, fill, line) {
  const lobes = [[0, 0, 0.5], [0.72, 0.16, 0.36], [-0.66, 0.14, 0.34]];
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(0.9 * s, 0.4 * s);
  c.quadraticCurveTo(1.6 * s, 0.5 * s, 2.1 * s, 0.1 * s);
  c.quadraticCurveTo(1.6 * s, 0.32 * s, 0.9 * s, 0.24 * s);
  c.fill();
  for (const [x, y, r] of lobes) { c.beginPath(); c.arc(x * s, y * s, r * s, 0, TAU); c.fill(); }
  c.strokeStyle = line; c.lineWidth = Math.max(1, s * 0.06); c.lineCap = 'round';
  for (const [x, y, r] of lobes) {
    c.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const a = Math.PI * 0.75 - t * TAU * 1.15, rr = r * (0.82 - t * 0.62) * s;
      const px = x * s + Math.cos(a) * rr, py = y * s + Math.sin(a) * rr;
      t ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
  }
  c.beginPath(); c.moveTo(0.95 * s, 0.33 * s); c.quadraticCurveTo(1.6 * s, 0.42 * s, 2.05 * s, 0.12 * s); c.stroke();
}

// A pointed lotus petal from radius r0 to r1 along +x, half width w.
function petal(c, r0, r1, w) {
  c.beginPath();
  c.moveTo(r0, 0);
  c.bezierCurveTo(r0 + (r1 - r0) * 0.25, -w * 1.1, r0 + (r1 - r0) * 0.8, -w * 0.8, r1, 0);
  c.bezierCurveTo(r0 + (r1 - r0) * 0.8, w * 0.8, r0 + (r1 - r0) * 0.25, w * 1.1, r0, 0);
}

function terraceTexture(radius, R, anisotropy) {
  return canvasTexture(2048, (c, size) => {
    const k = size / 2 / radius, random = seeded(88);
    const base = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    base.addColorStop(0, '#bccdc1'); base.addColorStop(0.75, '#abc3b5'); base.addColorStop(1, '#a6bfb0');
    c.fillStyle = base; c.fillRect(0, 0, size, size);
    // Soft clouding in the polished stone, then terrazzo chips.
    for (let i = 0; i < 70; i++) {
      const x = random() * size, y = random() * size, r = (1.5 + random() * 4) * k, g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, random() > 0.5 ? '#ffffff22' : '#b9cfc214'); g.addColorStop(1, '#ffffff00');
      c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const chips = ['#f4f6ef66', '#9cb4a74a', '#e3ebe266', '#7f9a8c40', '#e2d6c055', '#aabbb24a', '#d4b0a438'];
    for (let i = 0; i < 120000; i++) {
      const s = 0.8 + random() * random() * 3.4;
      c.fillStyle = chips[i % chips.length];
      c.fillRect(random() * size, random() * size, s, s * (0.6 + random() * 0.8));
    }
    c.translate(size / 2, size / 2);
    const ring = (r, width, color) => { c.strokeStyle = color; c.lineWidth = width * k; c.beginPath(); c.arc(0, 0, r * k, 0, TAU); c.stroke(); };
    const seam = (r0, r1, step) => {
      // Paving courses between r0 and r1: ring seams and staggered joints.
      const rings = Math.max(1, Math.round((r1 - r0) / step));
      for (let i = 0; i <= rings; i++) { ring(r0 + (r1 - r0) * i / rings, 0.035, '#7f978a38'); ring(r0 + (r1 - r0) * i / rings + 0.03, 0.02, '#ffffff40'); }
      for (let i = 0; i < rings; i++) {
        const ra = r0 + (r1 - r0) * i / rings, rb = r0 + (r1 - r0) * (i + 1) / rings, n = Math.round(TAU * (ra + rb) / 2 / 1.7);
        for (let j = 0; j < n; j++) {
          const a = (j + (i % 2) * 0.5) / n * TAU;
          c.strokeStyle = '#7f978a38'; c.lineWidth = 0.035 * k;
          c.beginPath(); c.moveTo(Math.cos(a) * ra * k, Math.sin(a) * ra * k); c.lineTo(Math.cos(a) * rb * k, Math.sin(a) * rb * k); c.stroke();
        }
      }
    };
    const waveIn = R - 3.1, waveOut = R - 1.0;
    seam(3.3, 8.0, 1.2);
    seam(8.6, waveIn - 0.15, 1.35);

    // Sea-wave band (海水): rows of fish-scale waves, outer rows first.
    c.save();
    c.beginPath(); c.arc(0, 0, waveOut * k, 0, TAU); c.arc(0, 0, waveIn * k, 0, TAU, true); c.clip();
    c.fillStyle = '#a6c1b3'; c.fillRect(-size / 2, -size / 2, size, size);
    const s = 0.5;
    for (let row = 0, r = waveOut + s * 0.6; r > waveIn - s; row++, r -= s * 0.5) {
      const n = Math.round(TAU * r / (s * 2));
      for (let j = 0; j < n; j++) {
        const a = (j + (row % 2) * 0.5) / n * TAU, x = Math.cos(a) * r * k, y = Math.sin(a) * r * k;
        c.fillStyle = '#adc8ba'; c.beginPath(); c.arc(x, y, s * k, 0, TAU); c.fill();
        for (const [f, color] of [[0.96, '#5f8c7bd0'], [0.74, '#7da393c0'], [0.52, '#98b9aab0'], [0.3, '#d6e4dac0']]) {
          c.strokeStyle = color; c.lineWidth = 0.045 * k; c.beginPath(); c.arc(x, y, s * f * k, 0, TAU); c.stroke();
        }
      }
    }
    c.restore();
    ring(waveIn, 0.09, '#b99a5c90'); ring(waveIn - 0.16, 0.035, '#b99a5c70');
    ring(waveOut, 0.09, '#b99a5c90');
    // The polished border inside the balustrade.
    c.fillStyle = '#c4d2c7';
    c.beginPath(); c.arc(0, 0, (R + 0.3) * k, 0, TAU); c.arc(0, 0, (waveOut + 0.05) * k, 0, TAU, true); c.fill();
    ring(R - 0.55, 0.05, '#b4574a40');

    // A double ring with little four-petal flowers at r = 8.3.
    ring(8.0, 0.06, '#86ab9c90'); ring(8.6, 0.06, '#86ab9c90');
    c.fillStyle = '#a9c3b5';
    c.beginPath(); c.arc(0, 0, 8.6 * k, 0, TAU); c.arc(0, 0, 8.0 * k, 0, TAU, true); c.fill();
    for (let i = 0; i < 72; i++) {
      const a = (i + 0.5) / 72 * TAU;
      c.fillStyle = i % 2 ? '#e8eee8' : '#8fb2a2';
      c.beginPath(); c.arc(Math.cos(a) * 8.3 * k, Math.sin(a) * 8.3 * k, (i % 2 ? 0.07 : 0.1) * k, 0, TAU); c.fill();
    }
    // Eight cloud scrolls drifting round the inner court.
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) / 8 * TAU;
      c.save(); c.rotate(a); c.translate(5.7 * k, 0); c.rotate(Math.PI / 2);
      c.translate(-0.4 * k, 0);
      cloudScroll(c, 0.62 * k, '#a6c2b3e0', '#5f8c7bd0');
      c.restore();
    }

    // Lotus medallion.
    c.fillStyle = '#d2dad0'; c.beginPath(); c.arc(0, 0, 3.15 * k, 0, TAU); c.fill();
    ring(3.15, 0.07, '#86ab9cb0'); ring(2.98, 0.03, '#86ab9c90');
    for (let i = 0; i < 12; i++) {
      c.save(); c.rotate(i / 12 * TAU);
      petal(c, 1.0 * k, 2.85 * k, 0.62 * k);
      c.fillStyle = '#ddb2a8f0'; c.fill(); c.strokeStyle = '#a8746ac0'; c.lineWidth = 0.04 * k; c.stroke();
      c.strokeStyle = '#d8b2a880'; c.beginPath(); c.moveTo(1.3 * k, 0); c.lineTo(2.5 * k, 0); c.stroke();
      c.restore();
    }
    for (let i = 0; i < 12; i++) {
      c.save(); c.rotate((i + 0.5) / 12 * TAU);
      petal(c, 0.7 * k, 2.1 * k, 0.48 * k);
      c.fillStyle = '#e9cbc3f0'; c.fill(); c.strokeStyle = '#b8877dc0'; c.lineWidth = 0.035 * k; c.stroke();
      c.restore();
    }
    c.fillStyle = '#e2d29e'; c.beginPath(); c.arc(0, 0, 0.82 * k, 0, TAU); c.fill();
    c.strokeStyle = '#bfa66a'; c.lineWidth = 0.05 * k; c.beginPath(); c.arc(0, 0, 0.82 * k, 0, TAU); c.stroke();
    c.fillStyle = '#c4ab6c';
    for (const [x, y] of [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * TAU) * 0.45, Math.sin(i / 6 * TAU) * 0.45])]) {
      c.beginPath(); c.arc(x * k, y * k, 0.09 * k, 0, TAU); c.fill();
    }
  }, anisotropy);
}

// ----------------------------------------------------------- balustrade ---

// One carved balustrade panel (between two posts): a vase-baluster frieze
// under the handrail and a recessed panel with a lotus-and-cloud relief.
function panelTexture(anisotropy) {
  const texture = canvasTexture(512, (c, w) => {
    const h = 192, random = seeded(5);
    c.fillStyle = '#eceae2'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) {
      c.strokeStyle = '#d7dbd420'; c.lineWidth = 1 + random() * 2;
      c.beginPath(); c.moveTo(random() * w, 0); c.bezierCurveTo(random() * w, h * 0.3, random() * w, h * 0.7, random() * w, h); c.stroke();
    }
    // Relief helper: shadow below-right, highlight above-left, then body.
    const relief = (draw, body = '#f6f4ee') => {
      c.save(); c.translate(2, 3); c.fillStyle = '#8e978f'; c.globalAlpha = 0.6; draw(); c.restore();
      c.save(); c.translate(-1, -1); c.fillStyle = '#ffffff'; c.globalAlpha = 0.9; draw(); c.restore();
      c.fillStyle = body; draw();
    };
    const recess = (x, y, rw, rh) => {
      c.fillStyle = '#dcddd4'; c.fillRect(x, y, rw, rh);
      c.fillStyle = '#a3aaa2'; c.fillRect(x, y, rw, 4); c.fillRect(x, y, 3, rh);
      c.fillStyle = '#ffffff'; c.fillRect(x, y + rh - 3, rw, 3); c.fillRect(x + rw - 2, y, 2, rh);
    };
    // Upper frieze: three vase balusters (净瓶) in shallow niches.
    recess(46, 10, w - 92, 58);
    for (let i = 0; i < 3; i++) {
      const x = 46 + (w - 92) * (i + 0.5) / 3;
      relief(() => {
        c.beginPath();
        c.moveTo(x - 9, 66); c.bezierCurveTo(x - 30, 52, x - 22, 34, x - 6, 28); c.lineTo(x - 5, 16); c.lineTo(x - 12, 12);
        c.lineTo(x + 12, 12); c.lineTo(x + 5, 16); c.lineTo(x + 6, 28); c.bezierCurveTo(x + 22, 34, x + 30, 52, x + 9, 66); c.closePath(); c.fill();
      });
    }
    // Lower panel: a lotus with leaves and two cloud curls.
    recess(46, 84, w - 92, 92);
    const cx = w / 2, cy = 136;
    relief(() => { c.beginPath(); c.ellipse(cx - 70, cy + 14, 52, 18, -0.15, 0, TAU); c.fill(); c.beginPath(); c.ellipse(cx + 72, cy + 12, 48, 17, 0.18, 0, TAU); c.fill(); }, '#eceee6');
    relief(() => {
      for (let i = -2; i <= 2; i++) {
        c.save(); c.translate(cx, cy + 22); c.rotate(-Math.PI / 2 + i * 0.36);
        petal(c, 0, 42 - Math.abs(i) * 5, 11); c.fill(); c.restore();
      }
    }, '#f6efe9');
    relief(() => {
      for (const side of [-1, 1]) {
        c.save(); c.translate(cx + side * 150, cy - 8); c.scale(side, 1);
        c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.arc(18, 6, 10, 0, TAU); c.arc(-16, 6, 9, 0, TAU); c.fill();
        c.restore();
      }
    });
    c.strokeStyle = '#c3c8c0'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 76); c.lineTo(w, 76); c.stroke();
    c.fillStyle = '#ffffff'; c.fillRect(0, 77, w, 2);
  }, anisotropy, 192);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

// Square posts with a collar and a carved lotus cap, every panel length.
function lotusCap() {
  const profile = [[0, 0], [0.19, 0], [0.215, 0.035], [0.21, 0.085], [0.16, 0.12], [0.12, 0.13], [0.135, 0.155], [0.13, 0.19], [0.09, 0.225], [0.04, 0.24], [0, 0.243]];
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 16);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x);
    const lobe = y < 0.125 ? 1 + 0.09 * Math.pow(Math.abs(Math.cos(a * 4)), 2) * smoothstep(0.0, 0.06, y) : 1;
    pos.setXYZ(i, x * lobe, y, z * lobe);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function balustrade(group, kit, R, anisotropy, see) {
  const POSTS = 48, r = d => R + d;
  const marble = see.patch(kit.material(0xffffff, { vertexColors: true, sheen: 0.25, sheenRoughness: 0.6, clearcoat: 0.18, clearcoatRoughness: 0.4, roughness: 0.55 }));
  const segments = POSTS * 5;
  // Kerb, handrail, outer kerb, ledge and the moulded plinth (须弥座) that
  // steps down into the lake. Walked from the inside outwards.
  const mould = new THREE.Mesh(latheBands([
    [r(0.04), 0, r(0.04), 0.2, MARBLE_SHADE],
    [r(0.04), 0.2, r(0.19), 0.2, MARBLE],
    [r(0.19), 0.95, r(0.15), 0.99, MARBLE_SHADE],
    [r(0.15), 0.99, r(0.15), 1.09, MARBLE],
    [r(0.15), 1.09, r(0.21), 1.15, MARBLE],
    [r(0.21), 1.15, r(0.43), 1.15, MARBLE],
    [r(0.43), 1.15, r(0.49), 1.09, MARBLE],
    [r(0.49), 1.09, r(0.49), 0.99, MARBLE],
    [r(0.49), 0.99, r(0.45), 0.95, MARBLE_SHADE],
    [r(0.45), 0.2, r(0.62), 0.2, MARBLE],
    [r(0.62), 0.2, r(0.62), 0, MARBLE_SHADE],
    [r(0.62), 0, r(0.98), 0, MARBLE],
    [r(0.98), 0, r(0.98), -0.09, MARBLE],
    [r(0.98), -0.09, r(0.9), -0.17, MARBLE_SHADE],
    [r(0.9), -0.17, r(0.9), -0.48, 0xd9dbd2],
    [r(0.9), -0.48, r(1.02), -0.56, MARBLE],
    [r(1.02), -0.56, r(1.02), -0.7, MARBLE_SHADE],
    [r(1.02), -0.7, r(1.5), -0.7, MARBLE],
    [r(1.5), -0.7, r(1.5), -0.86, MARBLE_SHADE],
    [r(1.5), -0.86, r(1.5), -1.8, MARBLE_WET],
  ], { segments }), marble);
  mould.castShadow = true; mould.receiveShadow = true;
  mould.name = 'balustrade';
  group.add(mould);

  // The carved panels: one texture repeat per bay, the outer face flipped.
  const inner = panelTexture(anisotropy), outer = inner.clone();
  inner.repeat.set(POSTS, 1);
  outer.repeat.set(POSTS, -1); outer.offset.set(0, 1);
  outer.wrapS = THREE.RepeatWrapping;
  outer.needsUpdate = true;
  for (const [band, map] of [[[r(0.19), 0.2, r(0.19), 0.95, 0xffffff], inner], [[r(0.45), 0.95, r(0.45), 0.2, 0xffffff], outer]]) {
    const panel = new THREE.Mesh(latheBands([band], { segments }), see.patch(kit.material(0xffffff, { map, sheen: 0.2, clearcoat: 0.12, roughness: 0.6 })));
    panel.castShadow = true; panel.receiveShadow = true;
    panel.name = 'balustrade';
    group.add(panel);
  }

  // Posts: a carved shaft, collar and lotus cap, all marble.
  const posts = createBatch(), postStone = see.patch(kit.material(MARBLE, { sheen: 0.25, clearcoat: 0.18, roughness: 0.55 }));
  const cap = lotusCap(), postR = r(0.32);
  for (let i = 0; i < POSTS; i++) {
    const a = i / POSTS * TAU, x = Math.cos(a) * postR, z = Math.sin(a) * postR, ry = -a;
    posts.add(new THREE.BoxGeometry(0.36, 1.0, 0.36), postStone, { position: [x, 0.7, z], rotation: [0, ry, 0], outline: 0.02 });
    posts.add(new THREE.BoxGeometry(0.42, 0.06, 0.42), postStone, { position: [x, 1.23, z], rotation: [0, ry, 0], outline: 0.02 });
    posts.add(cap, postStone, { position: [x, 1.26, z], rotation: [0, ry, 0], scale: [1, 0.92, 1], outline: 0.02 });
  }
  for (const mesh of posts.build(group, { inkMaterial: see.ink() })) mesh.name = 'balustrade';
  return { POSTS, postR };
}

// Four vermilion lantern poles on the ledge, each with a crook carrying a
// red silk lantern over the rail.
function lanterns(group, kit, R) {
  const batch = createBatch(), lacquer = kit.material(VERMILION, { sheen: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const gold = kit.material(GOLD, { metalness: 0.3, roughness: 0.4, sheen: 0 });
  const silk = kit.material(0xc93a2e, { emissive: new THREE.Color(0xff5a2a), emissiveIntensity: 0.4, sheen: 0.3, clearcoat: 0, flatShading: true });
  const hung = [];
  for (let i = 0; i < 4; i++) {
    const a = BRIDGE_ANGLE + Math.PI / 4 + i * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), pr = R + 0.82, hang = R + 0.42;
    batch.add(G.cylinder(0.09, 0.11, 2.9, 12), lacquer, { position: [c * pr, 1.45, s * pr], outline: 0.025 });
    batch.add(G.cylinder(0.17, 0.17, 0.1, 12), gold, { position: [c * pr, 0.05, s * pr] });
    batch.add(G.sphere(), gold, { position: [c * pr, 2.98, s * pr], scale: 0.11 });
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(c * pr, 2.7, s * pr), new THREE.Vector3(c * (pr - 0.1), 3.05, s * (pr - 0.1)), new THREE.Vector3(c * hang, 2.85, s * hang));
    batch.add(new THREE.TubeGeometry(curve, 10, 0.045, 6), lacquer);
    const lantern = new THREE.Group(), parts = createBatch();
    lantern.position.set(c * hang, 2.85, s * hang);
    parts.add(G.cylinder(0.008, 0.008, 0.3, 4), gold, { position: [0, -0.15, 0] });
    parts.add(new THREE.SphereGeometry(1, 12, 8), silk, { position: [0, -0.66, 0], scale: [0.38, 0.34, 0.38], outline: 0.025 });
    parts.add(G.cylinder(0.2, 0.24, 0.09, 16), gold, { position: [0, -0.34, 0], outline: 0.015 });
    parts.add(G.cylinder(0.24, 0.2, 0.09, 16), gold, { position: [0, -0.98, 0], outline: 0.015 });
    parts.add(G.cone(0.08, 0.38, 8), silk, { position: [0, -1.2, 0], rotation: [Math.PI, 0, 0] });
    parts.build(lantern);
    lantern.userData.phase = i * 1.7;
    group.add(lantern);
    hung.push(lantern);
  }
  batch.build(group);
  return hung;
}

// ---------------------------------------------------------------- water ---

// The lake: clear jade at the terrace foot deepening to teal, then giving way
// to a mirror of the far shore and mountains towards the horizon. The
// reflection is painted, not rendered: the reflected ray is traced to the
// shoreline cylinder (radius from `shoreMap`) and looked up in a blurred
// panorama of everything on it (`pano`, height above the water on v);
// above the panorama it reflects the sky gradient and the low sun's glint.
const PANO_TOP = 34, SHORE_MIN = 40, SHORE_SPAN = 100;
function waterMaterial(radius, pano, shoreMap) {
  const material = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      time: { value: 0 }, edge: { value: radius + 1.5 },
      shallow: { value: new THREE.Color(0x7dbca4) }, deep: { value: new THREE.Color(0x3f8a7b) }, far: { value: new THREE.Color(0x5f9d94) },
      marble: { value: new THREE.Color(0xcfdcd2) },
      skyTop: { value: new THREE.Color(SKY_TOP) }, skyMid: { value: new THREE.Color(SKY_MID) }, skyHorizon: { value: new THREE.Color(HORIZON) },
      sunDir: { value: new THREE.Vector3(...SKY_SUN).normalize() }, sunColor: { value: new THREE.Color(0xfff0d4) },
      pano: { value: null }, shoreMap: { value: null }, panoTop: { value: PANO_TOP },
    }]),
    vertexShader: `#include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <fog_pars_fragment>
      uniform float time; uniform float edge; uniform vec3 shallow; uniform vec3 deep; uniform vec3 far; uniform vec3 marble;
      uniform vec3 skyTop; uniform vec3 skyMid; uniform vec3 skyHorizon; uniform vec3 sunDir; uniform vec3 sunColor;
      uniform sampler2D pano; uniform sampler2D shoreMap; uniform float panoTop;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      vec2 wave(vec2 p, vec2 d, float f, float s, float a) { return d * (a * f * cos(dot(p, d) * f + time * s)); }
      vec3 skyAt(vec3 d) {
        float h = max(d.y, 0.0);
        vec3 c = mix(skyHorizon, skyMid, smoothstep(0.0, 0.22, h));
        c = mix(c, skyTop, smoothstep(0.12, 0.75, h));
        return c + sunColor * pow(max(dot(d, sunDir), 0.0), 6.0) * 0.1;
      }
      void main() {
        vec2 p = vWorld.xz;
        float r = length(p), dRim = r - edge;
        vec2 g = wave(p, vec2(0.8, 0.6), 0.5, 0.8, 0.03) + wave(p, vec2(-0.5, 0.86), 0.85, 1.1, 0.02) + wave(p, vec2(0.2, -0.98), 2.3, 1.6, 0.007);
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = 0.05 + 0.85 * pow(1.0 - max(dot(n, v), 0.0), 4.0);

        // Painted reflection of the shore, mountains and sky.
        vec3 nr = normalize(vec3(-g.x * 0.45, 1.0, -g.y * 0.45));
        vec3 d = reflect(-v, nr);
        d.y = max(d.y, 0.002);
        float hl = max(length(d.xz), 1e-3);
        vec2 dir = d.xz / hl;
        float R0 = 84.0, t = 0.0, az = 0.0;
        for (int k = 0; k < 2; k++) {
          float b = dot(p, dir), c = dot(p, p) - R0 * R0;
          t = max(-b + sqrt(max(b * b - c, 0.0)), 0.0);
          vec2 hit = p + dir * t;
          az = atan(hit.y, hit.x);
          R0 = texture2D(shoreMap, vec2(az / 6.2831853 + 0.5, 0.5)).r * ${SHORE_SPAN.toFixed(1)} + ${SHORE_MIN.toFixed(1)};
        }
        float yHit = t * d.y / hl;
        vec2 uv = vec2(az / 6.2831853 + 0.5, yHit / panoTop);
        // A soft vertical smear, as on gently moving water.
        float smear = 0.012 + 0.03 * smoothstep(20.0, 70.0, dRim);
        vec4 scene = texture2D(pano, uv) * 0.3 + (texture2D(pano, uv + vec2(0.0, smear)) + texture2D(pano, uv - vec2(0.0, smear))) * 0.22
          + (texture2D(pano, uv + vec2(0.0, smear * 2.2)) + texture2D(pano, uv - vec2(0.0, smear * 2.2))) * 0.13;
        scene.a *= 1.0 - smoothstep(0.97, 1.0, uv.y);
        vec3 refl = mix(skyAt(d), mix(scene.rgb * 0.88, deep, 0.12), scene.a);

        // Body colour: jade shallows at the terrace, teal deeps, a paler far lake.
        vec3 base = mix(shallow, deep, smoothstep(0.0, 20.0, dRim));
        base = mix(base, far, smoothstep(25.0, 70.0, dRim));
        base *= 0.95 + 0.1 * vnoise(vec3(p * 0.06, time * 0.04));
        vec3 col = mix(base, refl, fres);

        // Broken white reflection of the marble terrace, seen at low angles.
        float graze = pow(1.0 - abs(v.y), 1.5);
        float wob = sin(atan(p.y, p.x) * 140.0 + sin(r * 3.0 - time) * 2.0) * 0.5 + 0.5;
        col = mix(col, marble, smoothstep(edge + 2.6, edge, r) * (0.25 + 0.25 * wob) * graze);
        // Calm ripple rings spreading from the terrace, broken into dashes.
        float ring = abs(fract((dRim - time * 0.35) / 2.8) - 0.5);
        float dash = smoothstep(0.1, 0.5, sin(atan(p.y, p.x) * (24.0 + floor((dRim - time * 0.35) / 2.8) * 6.0) + dRim * 0.7) * 0.5 + 0.5);
        float ripple = (1.0 - smoothstep(0.03, 0.09, ring)) * dash * smoothstep(0.0, 1.5, dRim) * smoothstep(15.0, 4.0, dRim);
        col = mix(col, vec3(0.86, 0.94, 0.9), ripple * 0.16);
        // Wind-brushed streaks of brighter water out on the open lake.
        float lane = vnoise(vec3(p.x * 0.012 + p.y * 0.03, p.y * 0.012 - p.x * 0.03, 0.0) * 3.0);
        float streak = smoothstep(0.6, 0.8, vnoise(vec3(r * 0.35, atan(p.y, p.x) * 6.0, time * 0.05))) * smoothstep(0.45, 0.7, lane);
        col = mix(col, skyAt(vec3(0.0, 0.25, 0.0)), streak * smoothstep(18.0, 40.0, dRim) * 0.18);
        // A glittering path towards the low sun.
        float sp = max(dot(reflect(-v, n), sunDir), 0.0);
        float sparkle = 0.5 + vnoise(vec3(p * 1.3, time * 0.8));
        col += sunColor * (pow(sp, 60.0) * 0.5 * sparkle + pow(sp, 10.0) * 0.03);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  // Assigned after the merge, which would otherwise clone the textures.
  material.uniforms.pano.value = pano;
  material.uniforms.shoreMap.value = shoreMap;
  return material;
}

// ------------------------------------------------------------- lotus etc ---

const gradient = (geometry, colorAt) => {
  const g = geometry.index ? geometry.toNonIndexed() : geometry, pos = g.attributes.position, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { colorAt(pos.getX(i), pos.getY(i), pos.getZ(i), c); c.toArray(colors, i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
};

function lotusLeaf({ cup = 0.25, wave = 0.05 } = {}) {
  const geometry = new THREE.CircleGeometry(1, 28, 0, TAU).rotateX(-Math.PI / 2), pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
    pos.setY(i, cup * r * r + wave * Math.sin(a * 7) * r * r);
  }
  geometry.computeVertexNormals();
  const light = new THREE.Color(0x9cc07e), dark = new THREE.Color(0x4f8a62);
  return gradient(geometry, (x, y, z, c) => c.copy(light).lerp(dark, smoothstep(0.05, 0.95, Math.hypot(x, z))));
}

function lotusFlower() {
  const parts = [];
  const petalGeometry = new THREE.SphereGeometry(1, 6, 4).translate(0, 1, 0).scale(0.15, 0.3, 0.08);
  for (const [count, tilt, offset, rad] of [[7, 0.62, 0, 0.07], [6, 0.32, 0.5, 0.04]]) {
    for (let i = 0; i < count; i++) {
      const a = (i + offset) / count * TAU, g = petalGeometry.clone().rotateZ(-tilt).rotateY(-a).translate(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      parts.push(g);
    }
  }
  const pod = new THREE.CylinderGeometry(0.09, 0.06, 0.1, 10).translate(0, 0.14, 0);
  const pink = new THREE.Color(0xe7849f), white = new THREE.Color(0xfcecef), gold = new THREE.Color(0xf0cd5a);
  const petals = parts.map(g => gradient(g, (x, y, z, c) => c.copy(white).lerp(pink, smoothstep(0.08, 0.5, y + Math.hypot(x, z) * 0.6))));
  const podColored = gradient(pod, (x, y, z, c) => c.copy(gold));
  const stem = gradient(new THREE.CylinderGeometry(0.025, 0.03, 1, 5).translate(0, -0.5, 0), (x, y, z, c) => c.set(0x6f9a5c));
  for (const g of [...petals, podColored, stem]) { g.deleteAttribute('uv'); }
  const merged = coloredMerge([...petals, podColored, stem]);
  return merged;
}

function lotusBud() {
  const bud = new THREE.SphereGeometry(1, 10, 8).scale(0.11, 0.24, 0.11).translate(0, 0.2, 0), pos = bud.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), k = y > 0.2 ? 1 - (y - 0.2) / 0.24 * 0.55 : 1;
    pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k);
  }
  bud.computeVertexNormals();
  const pink = new THREE.Color(0xe27596), pale = new THREE.Color(0xf6d6dd);
  const head = gradient(bud, (x, y, z, c) => c.copy(pale).lerp(pink, smoothstep(0.1, 0.42, y)));
  const stem = gradient(new THREE.CylinderGeometry(0.022, 0.028, 1, 5).translate(0, -0.5, 0), (x, y, z, c) => c.set(0x6f9a5c));
  head.deleteAttribute('uv'); stem.deleteAttribute('uv');
  return coloredMerge([head, stem]);
}

// Merge non-indexed geometries that already carry position/normal/color.
function coloredMerge(list) {
  let count = 0;
  for (const g of list) count += g.attributes.position.count;
  const out = new THREE.BufferGeometry(), names = ['position', 'normal', 'color'];
  for (const name of names) {
    const array = new Float32Array(count * 3);
    let offset = 0;
    for (const g of list) {
      const attr = g.index ? g.toNonIndexed().attributes[name] : g.attributes[name];
      array.set(attr.array, offset); offset += attr.array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(array, 3));
  }
  return out;
}

// ------------------------------------------------------------ pavilion ---

// A hexagonal pavilion (六角亭): marble platform, vermilion columns, beams and
// benches, and a concave tiled roof whose corners sweep up.
function pavilionRoof(eave, base, apex) {
  const steps = 14, profile = [new THREE.Vector2(eave * 0.62, base - 0.12), new THREE.Vector2(eave, base - 0.04), new THREE.Vector2(eave, base + 0.1)];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    profile.push(new THREE.Vector2(eave * (1 - t), base + 0.1 + (apex - base - 0.1) * Math.pow(t, 1.7)));
  }
  const geometry = new THREE.LatheGeometry(profile, 48), pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), r = Math.hypot(x, z), a = Math.atan2(x, z);
    const local = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
    const corner = Math.pow(1 - Math.abs(local) / (Math.PI / 6), 2), hex = Math.cos(Math.PI / 6) / Math.cos(local), rn = r / eave;
    const k = hex * (1 + 0.1 * corner * Math.pow(rn, 4));
    pos.setXYZ(i, x * k, y + 0.7 * corner * Math.pow(rn, 5), z * k);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function pavilion(kit) {
  const group = new THREE.Group(), batch = createBatch();
  const stone = kit.material(MARBLE, { sheen: 0.2, clearcoat: 0.1 }), lacquer = kit.material(VERMILION, { sheen: 0.2, clearcoat: 0.4 });
  const tiles = kit.material(ROOF, { sheen: 0.3, clearcoat: 0.1, roughness: 0.7 }), ridge = kit.material(0x3f4a52, { sheen: 0 });
  const gold = kit.material(GOLD, { metalness: 0.3, roughness: 0.4, sheen: 0 });
  batch.add(new THREE.CylinderGeometry(3.1, 3.25, 0.5, 6), stone, { position: [0, -0.35, 0], outline: 0.03 });
  batch.add(new THREE.CylinderGeometry(2.7, 2.7, 0.3, 6), stone, { position: [0, 0.05, 0], outline: 0.03 });
  const corners = Array.from({ length: 6 }, (_, i) => [Math.sin(i * Math.PI / 3) * 2.25, Math.cos(i * Math.PI / 3) * 2.25]);
  for (const [x, z] of corners) {
    batch.add(G.cylinder(0.15, 0.17, 3.1, 14), lacquer, { position: [x, 1.75, z], outline: 0.025 });
    batch.add(G.cylinder(0.24, 0.24, 0.14, 14), stone, { position: [x, 0.27, z] });
  }
  // Beams and low benches between columns (the bridge side left open).
  for (let i = 0; i < 6; i++) {
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 6], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    batch.add(G.box(2.25, 0.22, 0.16, 0.03), lacquer, { position: [mx, 3.12, mz], rotation: [0, ry, 0] });
    batch.add(G.box(2.1, 0.08, 0.1, 0.02), gold, { position: [mx * 1.01, 2.9, mz * 1.01], rotation: [0, ry, 0] });
    if (i !== 4) {
      batch.add(G.box(2.0, 0.1, 0.4, 0.03), lacquer, { position: [mx * 0.96, 0.62, mz * 0.96], rotation: [0, ry, 0] });
      batch.add(G.box(2.0, 0.42, 0.08, 0.02), lacquer, { position: [mx * 1.02, 0.45, mz * 1.02], rotation: [0, ry, 0] });
    }
  }
  batch.add(pavilionRoof(3.45, 3.25, 5.6), tiles, { outline: 0.03 });
  // Hip ridges following the swept corners, and a gilded finial.
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, points = [];
    for (let j = 0; j <= 10; j++) {
      const t = j / 10, rn = 1 - t, r = 3.45 * rn * (1 + 0.1 * Math.pow(rn, 4));
      points.push(new THREE.Vector3(Math.sin(a) * r, 3.35 + 2.25 * Math.pow(t, 1.7) + 0.7 * Math.pow(rn, 5) + 0.05, Math.cos(a) * r));
    }
    batch.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, 0.07, 6), ridge);
  }
  batch.add(G.sphere(), gold, { position: [0, 5.75, 0], scale: [0.26, 0.2, 0.26], outline: 0.02 });
  batch.add(G.cone(0.13, 0.5, 10), gold, { position: [0, 6.1, 0] });
  batch.build(group);
  return group;
}

// --------------------------------------------------------------- shore ---

function willowGeometry(seed = 17, { strands = 30, droop = 1, greens = [0x9cc16e, 0xaccf7c, 0x8fb666], crown = [0x9fc274, 0xb0cd80], detail = [12, 8] } = {}) {
  const random = seeded(seed), parts = [
    { geometry: new THREE.CylinderGeometry(0.2, 0.34, 3.4, 7), color: 0x6d5a48, position: [0.15, 1.6, 0], rotation: [0, 0, -0.08] },
    { geometry: new THREE.SphereGeometry(1, ...detail), color: crown[0], position: [0.3, 3.9, 0], scale: [1.9, 1.0, 1.8] },
    { geometry: new THREE.SphereGeometry(1, ...detail), color: crown[1], position: [0.9, 4.5, 0.4], scale: [1.2, 0.8, 1.2] },
  ];
  for (let i = 0; i < strands; i++) {
    const a = i / strands * TAU + random() * 0.15, r = 1.45 + random() * 0.6, len = (2.2 + random() * 1.6) * droop;
    parts.push({ geometry: new THREE.ConeGeometry(0.2 + random() * 0.08, len, 5, 1, true), color: greens[i % 3],
      position: [0.3 + Math.cos(a) * r, 4.1 - len / 2, Math.sin(a) * r], rotation: [Math.PI + (random() - 0.5) * 0.1, 0, Math.cos(a) * 0.08] });
  }
  return coloredGeometry(parts);
}

// Merge parts, each shaded from a cool underside to a sunlit top by its
// normals: { geometry, top, under, position, rotation | quaternion, scale }.
function shadedGeometry(parts) {
  const top = new THREE.Color(), under = new THREE.Color(), c = new THREE.Color(), t = new THREE.Object3D();
  const list = parts.map(part => {
    const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    t.position.set(...(part.position ?? [0, 0, 0]));
    t.rotation.set(...(part.rotation ?? [0, 0, 0]));
    if (part.quaternion) t.quaternion.copy(part.quaternion);
    const s = part.scale ?? 1;
    if (Array.isArray(s)) t.scale.set(...s); else t.scale.setScalar(s);
    t.updateMatrix();
    g.applyMatrix4(t.matrix);
    top.set(part.top); under.set(part.under ?? part.top);
    const normal = g.attributes.normal, colors = new Float32Array(normal.count * 3);
    for (let i = 0; i < normal.count; i++) c.copy(under).lerp(top, smoothstep(-0.6, 0.85, normal.getY(i))).toArray(colors, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(list);
  for (const g of list) g.dispose();
  return merged;
}

// A Chinese pine (松): a leaning, kinked trunk under a flat, spreading
// crown of cloud-like needle pads in three tiers, each pad a cluster of
// squashed blobs, darkest underneath.
function pineGeometry(seed) {
  const random = seeded(seed), parts = [], bark = 0x5f4b3e, lean = (random() < 0.5 ? -1 : 1) * (0.25 + random() * 0.3);
  const trunkX = y => Math.sin(y * 0.7 + seed) * 0.22 + lean * y * 0.32;
  const points = Array.from({ length: 5 }, (_, i) => new THREE.Vector3(trunkX(i * 1.3), i * 1.3, 0));
  parts.push({ geometry: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, 0.24, 5), top: 0x7a6250, under: bark });
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  const tiers = [[5.3, 0, 2.3], [4.1, 1, 1.7], [3.0, -1, 1.25]];
  for (const [y, side, w] of tiers) {
    const tx = trunkX(y), s = side || (lean > 0 ? 1 : -1), cx = tx + s * (side ? 1.1 + random() * 0.4 : 0.5), cz = (random() - 0.5) * 0.8;
    if (side) {
      dir.set(cx - tx, 0.3, cz);
      const length = dir.length();
      parts.push({ geometry: new THREE.CylinderGeometry(0.07, 0.12, length, 4, 1, true), top: bark, position: [(cx + tx) / 2, y - 0.25, cz / 2],
        quaternion: new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()) });
    }
    for (let k = 0; k < 3; k++) {
      const off = k === 0 ? 0 : (k === 1 ? -1 : 1) * w * (0.55 + random() * 0.2), r = k === 0 ? w : w * (0.55 + random() * 0.15);
      parts.push({ geometry: new THREE.SphereGeometry(1, 8, 5), top: 0x709e78, under: 0x2b4b43,
        position: [cx + off, y + (k === 0 ? 0.12 : -0.05 + random() * 0.1), cz + (random() - 0.5) * 0.6], scale: [r, r * 0.42, r * 0.85] });
    }
  }
  return shadedGeometry(parts);
}

// A clump of reeds (芦苇): leaning blades fading to straw tips, and a few
// bulrush heads.
function reedGeometry(seed) {
  const random = seeded(seed), parts = [], base = new THREE.Color(0x6c8a4c), tip = new THREE.Color(0xd2c78c), brown = new THREE.Color(0x7d5c42);
  for (let i = 0; i < 13; i++) {
    const a = random() * TAU, len = 1.2 + random() * 1.5, lean = 0.06 + random() * 0.3, d = random() * 0.4;
    const place = g => g.rotateZ(lean).rotateY(a).translate(Math.cos(a) * d, 0, Math.sin(a) * d);
    parts.push(gradient(place(new THREE.ConeGeometry(0.05, len, 3, 1, true).translate(0, len / 2, 0)), (x, y, z, c) => c.copy(base).lerp(tip, smoothstep(0.2, len, y))));
    if (i < 3) parts.push(gradient(place(new THREE.CylinderGeometry(0.07, 0.07, 0.42, 5, 1, true).translate(0, len * 0.82, 0)), (x, y, z, c) => c.copy(brown)));
  }
  for (const g of parts) if (g.attributes.uv) g.deleteAttribute('uv');
  return coloredMerge(parts);
}

// The far shore: a ring of land whose waterline wanders between bays and
// headlands, notched by the inlet under the moon bridge and rising into
// wooded hills, with a knoll for the pagoda.
function landscape() {
  const noise = createNoise(64), around = horizonNoise(64);
  const shoreBase = a => {
    const near = Math.exp(-Math.pow(angleTo(a, BRIDGE_ANGLE) / 0.5, 2));
    return Math.max(64, 80 + (around(a, 1.7, 3) - 0.5) * 46 - near * 6);
  };
  const moonR = shoreBase(MOON_ANGLE);
  const shoreAt = a => shoreBase(a) + Math.exp(-Math.pow(angleTo(a, MOON_ANGLE) * moonR / 4.2, 2)) * 15;
  const shore = (x, z) => shoreAt(Math.atan2(z, x));
  const knollR = shoreBase(PAGODA_ANGLE) + 9, knoll = { x: Math.cos(PAGODA_ANGLE) * knollR, z: Math.sin(PAGODA_ANGLE) * knollR };
  const height = (x, z, r = Math.hypot(x, z)) => {
    const d = r - shore(x, z), mound = 3.2 * Math.exp(-((x - knoll.x) ** 2 + (z - knoll.z) ** 2) / 60);
    return -2.6 + smoothstep(-7, 5, d) * 2.9 + smoothstep(6, 42, d) * (2 + noise.fbm(x / 18, z / 18, 3) * 10) * (1 - smoothstep(100, 122, r) * 0.6)
      + mound * smoothstep(0, 6, d);
  };
  const water = new THREE.Color(0x5f9a86), sand = new THREE.Color(0xd0cfbe), grass = new THREE.Color(0x86ad7a), meadow = new THREE.Color(0x6a9474), wood = new THREE.Color(0x4f7867), forest = new THREE.Color(0x3d6455);
  const paint = (x, y, z, r, color) => {
    color.copy(water).lerp(sand, smoothstep(-1.5, -0.85, y)).lerp(grass, smoothstep(-0.55, 0.1, y));
    color.lerp(meadow, smoothstep(0.4, 3, y) * (0.55 + 0.45 * noise(x / 9, z / 9)));
    color.lerp(wood, smoothstep(2.5, 8, y) * (0.55 + smoothstep(0.3, 0.7, noise(x / 16, z / 16)) * 0.45));
    // Woodland masses dabbed over the hills, like ink dots (点苔).
    const woods = noise(x / 6 + 31, z / 6 - 7) * 0.65 + noise(x / 2.2, z / 2.2) * 0.35;
    color.lerp(forest, smoothstep(0.5, 0.62, woods) * smoothstep(1, 4, y) * 0.8);
  };
  const mesh = new THREE.Mesh(terrainRing({ inner: 52, outer: 150, rings: 36, segments: 240, height, paint, power: 1.2 }), farMaterial());
  mesh.receiveShadow = true;
  mesh.name = 'lake-shore';
  return { mesh, height, shore, shoreAt, shoreBase, knoll };
}

// Karst ranges (桂林山水) in four layers. Nearest: low, rounded, wooded hills
// stippled with trees; behind them steep, round-topped limestone peaks with
// smaller shoulders, two ranks deep; last, a long pale ridge. Each is darkest
// along its crest and dissolves at a wavy mist line, hazier with distance.
const RANGE_FOOT = 110; // nothing stands where the nearest range rises
function mountainLayers() {
  const random = seeded(23), wash = horizonNoise(31), crest = horizonNoise(47), mistNoise = horizonNoise(53);
  const smax = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };
  const karst = d => Math.max(d < 1 ? Math.pow(1 - d * d, 0.6) : 0, Math.exp(-d * d * 1.8) * 0.4);
  const hill = d => d < 1 ? Math.pow(0.5 + 0.5 * Math.cos(Math.PI * d), 0.9) : 0;
  const pick = ([lo, hi]) => lo + random() * (hi - lo);
  const specs = [
    { radius: 118, depth: 16, base: 2, roll: 5, count: 11, h: [8, 14], w: [1.6, 2.6], shape: hill, ridge: 0x547c6a, body: 0x8eab9b, mist: [1.5, 4], fade: 0.03, stipple: 0.9, streaks: 0.06, feather: 0.6, segments: 720 },
    { radius: 140, depth: 18, base: 4, roll: 5, count: 12, h: [15, 30], w: [0.4, 0.75], shape: karst, ridge: 0x5f8287, body: 0x9cb5b2, mist: [5, 6], fade: 0.1, stipple: 0.35, streaks: 0.4, feather: 0.45, segments: 1200 },
    { radius: 164, depth: 20, base: 8, roll: 7, count: 14, h: [22, 42], w: [0.38, 0.7], shape: karst, ridge: 0x7f99a5, body: 0xb3c5c8, mist: [10, 7], fade: 0.26, streaks: 0.35, feather: 0.45, segments: 1200 },
    { radius: 194, depth: 24, base: 15, roll: 10, count: 7, h: [26, 38], w: [1.3, 2.1], shape: hill, ridge: 0xa6b8c4, body: 0xcad5d8, mist: [16, 8], fade: 0.4, streaks: 0.15, feather: 0.5, segments: 720 },
  ];
  return specs.map((spec, index) => {
    const peaks = [];
    for (let i = 0; i < spec.count; i++) {
      const a = (i + 0.15 + random() * 0.7) / spec.count * TAU, h = pick(spec.h), w = h * pick(spec.w);
      peaks.push({ a, h, w, lean: (random() - 0.5) * 0.5 });
      if (spec.shape === karst && random() < 0.6) {
        const side = random() < 0.5 ? -1 : 1;
        peaks.push({ a: a + side * w * (0.75 + random() * 0.5) / spec.radius, h: h * (0.5 + random() * 0.25), w: w * (0.6 + random() * 0.2), lean: (random() - 0.5) * 0.5 });
      }
    }
    const height = a => {
      let h = spec.base + spec.roll * wash(a, 3 + index, 4, index * 9);
      for (const p of peaks) {
        const s = angleTo(a, p.a) * spec.radius, d = Math.abs(s) / (p.w * (s > 0 ? 1 + p.lean : 1 - p.lean));
        if (d < 1.8) h = smax(h, p.h * spec.shape(d), 3);
      }
      return h + (crest(a, 60 + index * 10, 3) - 0.5) * (spec.shape === karst ? 2.4 : 1.2);
    };
    const mist = a => spec.mist[0] + spec.mist[1] * mistNoise(a, 4 + index, 3, index * 5);
    return { ...spec, height, mist, colors: { ridge: spec.ridge, body: spec.body } };
  });
}

// What the lake mirrors: a blurred panorama of the shore cylinder (u: angle
// round the lake, v: height above the water up to PANO_TOP) holding the
// ranges, the wooded bank and every tree and landmark on it, projected from
// the middle of the lake; and the shoreline radius per angle.
function reflectionMaps({ layers, shoreBase, height, items }) {
  const W = 2048, H = 256, haze = new THREE.Color(HORIZON), css = c => `#${c.getHexString()}`;
  const X = a => ((a / TAU + 0.5) % 1 + 1) % 1 * W, Y = y => H * (1 - y / PANO_TOP);
  const pano = canvasTexture(W, ctx => {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    for (const layer of [...layers].reverse()) {
      let top = 0, mist = 0, n = 0;
      c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 2, n++) {
        const a = (x / W - 0.5) * TAU, k = shoreBase(a) / layer.radius, y = (layer.height(a) - WATER_Y) * k;
        top = Math.max(top, y); mist += (layer.mist(a) - WATER_Y) * k;
        c.lineTo(x, Y(y));
      }
      c.lineTo(W, H); c.closePath();
      const ink = new THREE.Color(layer.colors.ridge).lerp(haze, layer.fade), body = new THREE.Color(layer.colors.body).lerp(haze, layer.fade);
      const g = c.createLinearGradient(0, Y(top), 0, Y(Math.max(0, mist / n)));
      g.addColorStop(0, css(ink)); g.addColorStop(0.45, css(body)); g.addColorStop(1, css(haze));
      c.fillStyle = g; c.fill();
    }
    const veil = c.createLinearGradient(0, Y(7), 0, H);
    veil.addColorStop(0, `${css(haze)}00`); veil.addColorStop(1, `${css(haze)}d0`);
    c.fillStyle = veil; c.fillRect(0, Y(7), W, H - Y(7));
    // The wooded bank behind the waterline.
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 2) {
      const a = (x / W - 0.5) * TAU, s = shoreBase(a), cs = Math.cos(a), sn = Math.sin(a);
      let y = 0.5;
      for (let d = 2; d <= 34; d += 4) { const r = s + d; y = Math.max(y, (height(cs * r, sn * r) + 1.6 - WATER_Y) * s / r); }
      c.lineTo(x, Y(y));
    }
    c.lineTo(W, H); c.closePath();
    c.fillStyle = '#6f957b'; c.fill();
    c.fillStyle = '#b9c2ae'; c.fillRect(0, Y(0.3), W, H - Y(0.3));
    // Trees and landmarks, far to near.
    const color = new THREE.Color();
    for (const item of [...items].sort((p, q) => q.dist - p.dist)) {
      const a = Math.atan2(item.z, item.x), s = shoreBase(a), k = s / item.dist;
      if (item.dist < s - 6) continue;
      const y0 = (item.y - WATER_Y) * k, y1 = (item.y + item.top - WATER_Y) * k, half = item.w / item.dist / TAU * W;
      for (const px of [X(a) - W, X(a), X(a) + W]) {
        if (px < -60 || px > W + 60) continue;
        if (item.kind === 'pagoda') {
          c.fillStyle = '#b8604c'; c.fillRect(px - half * 0.55, Y(y1 * 0.82), half * 1.1, Y(y0) - Y(y1 * 0.82));
          c.fillStyle = '#4d575e';
          for (let i = 0; i < 7; i++) { const y = y0 + (y1 * 0.82 - y0) * (i + 1) / 7.4; c.fillRect(px - half, Y(y), half * 2, Math.max(1.5, (Y(0) - Y(0.5)) * 0.6)); }
          c.fillStyle = '#c9a65a'; c.fillRect(px - 0.8, Y(y1), 1.6, Y(y1 * 0.82) - Y(y1));
        } else if (item.kind === 'bridge') {
          c.fillStyle = '#dedad0';
          c.beginPath();
          c.moveTo(px - half, Y(y0));
          c.quadraticCurveTo(px, Y(y0 + (y1 - y0) * 1.9), px + half, Y(y0));
          c.closePath(); c.fill();
          c.fillStyle = '#7d9c8b';
          c.beginPath(); c.ellipse(px, Y(y0), half * 0.42, (Y(y0) - Y(y0 + (y1 - y0) * 0.68)), 0, Math.PI, TAU); c.fill();
        } else {
          color.set(item.color ?? 0x6f9a7a).multiplyScalar(0.92);
          c.fillStyle = '#5a5046'; c.fillRect(px - half * 0.12, Y(y0 + (y1 - y0) * 0.5), half * 0.24, Y(y0) - Y(y0 + (y1 - y0) * 0.5));
          c.fillStyle = css(color);
          c.beginPath(); c.ellipse(px, Y(y0 + (y1 - y0) * 0.66), half, (Y(0) - Y((y1 - y0) * 0.36)), 0, 0, TAU); c.fill();
        }
      }
    }
    ctx.filter = 'blur(2px)';
    for (const dx of [-W, 0, W]) ctx.drawImage(off, dx, 0);
  }, 1, H);
  pano.wrapS = THREE.RepeatWrapping;
  pano.generateMipmaps = false;
  pano.minFilter = THREE.LinearFilter;
  const N = 512, data = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const v = Math.round(clamp01((shoreBase(((i + 0.5) / N - 0.5) * TAU) - SHORE_MIN) / SHORE_SPAN) * 255);
    data.set([v, v, v, 255], i * 4);
  }
  const shoreMap = new THREE.DataTexture(data, N, 1);
  shoreMap.wrapS = THREE.RepeatWrapping;
  shoreMap.magFilter = shoreMap.minFilter = THREE.LinearFilter;
  shoreMap.needsUpdate = true;
  return { pano, shoreMap };
}

// --------------------------------------------------------- landmarks ---

// A seven-storey octagonal pagoda (宝塔): white stone plinth, vermilion
// storeys under slate eaves with white bracket bands, and a gilded spire.
function pagodaParts(x, y, z, s) {
  const parts = [], add = (geometry, color, py, scale = [1, 1, 1]) => parts.push({ geometry, color, position: [x, y + py * s, z], scale: scale.map(v => v * s) });
  add(new THREE.CylinderGeometry(3.3, 3.7, 0.8, 8), 0xe4dfd2, 0.4);
  add(new THREE.CylinderGeometry(2.8, 2.9, 0.4, 8), 0xd3cfc2, 1.0);
  let level = 1.2;
  for (let i = 0; i < 7; i++) {
    const r = 2.15 - i * 0.18, h = 1.55 - i * 0.07;
    add(new THREE.CylinderGeometry(r, r * 1.03, h, 8), 0xb8604a, level + h / 2);
    add(new THREE.CylinderGeometry(r + 0.28, r + 0.06, 0.22, 8), 0xf0e8d8, level + h + 0.05);
    add(new THREE.CylinderGeometry(r + 0.3, r + 1.05, 0.36, 8), 0x4b555c, level + h + 0.32);
    level += h + 0.5;
  }
  add(new THREE.ConeGeometry(0.95, 1.0, 8), 0x4b555c, level + 0.4);
  add(new THREE.CylinderGeometry(0.06, 0.1, 2.4, 6), 0xd9a84a, level + 1.9);
  for (const [py, r] of [[1.3, 0.3], [1.85, 0.24], [2.4, 0.18]]) add(new THREE.SphereGeometry(1, 8, 6), 0xe2b04f, level + py, [r, r * 0.6, r]);
  return { parts, top: (level + 3.1) * s };
}

// A hump-backed moon bridge (拱桥): one semicircular arch, which the water
// completes into a full circle, with low parapets along the deck.
function moonBridgeParts(x, y, z, angle) {
  const span = 7.6, hole = 3.0, crown = 4.2, deck = u => 0.35 + (crown - 0.35) * Math.pow(Math.max(0, 1 - u * u), 0.7);
  const outline = (lift, inset) => {
    const shape = new THREE.Shape();
    shape.moveTo(-span + inset, deck((-span + inset) / span) + lift);
    for (let i = 1; i <= 24; i++) { const px = -span + inset + (span - inset) * 2 * i / 24; shape.lineTo(px, deck(px / span) + lift); }
    return shape;
  };
  const body = outline(0, 0);
  body.lineTo(span, -1.2); body.lineTo(hole, -1.2);
  body.absarc(0, -0.3, hole, 0, Math.PI, false);
  body.lineTo(-hole, -1.2); body.lineTo(-span, -1.2); body.closePath();
  const parapet = outline(0.5, 0.6);
  for (let i = 24; i >= 0; i--) { const px = -span + 0.6 + (span - 0.6) * 2 * i / 24; parapet.lineTo(px, deck(px / span) - 0.05); }
  parapet.closePath();
  const rotation = [0, -(angle + Math.PI / 2), 0], width = 2.6;
  const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, -depth / 2);
  return [
    { geometry: extrude(body, width), color: 0xe5e1d5, position: [x, y, z], rotation },
    ...[-1, 1].map(side => ({ geometry: extrude(parapet, 0.18).translate(0, 0, side * (width / 2 - 0.09)), color: 0xd8d5ca, position: [x, y, z], rotation })),
  ];
}

// A small square pavilion (方亭) on a rocky islet.
function islePavilionParts(x, y, z, angle) {
  const parts = [], rotation = [0, -angle, 0];
  parts.push({ geometry: new THREE.SphereGeometry(1, 24, 8), color: 0xd2d1c2, position: [x, y - 0.8, z], scale: [6.2, 1.3, 5.2], rotation });
  parts.push({ geometry: new THREE.SphereGeometry(1, 24, 8), color: 0x9fc489, position: [x, y - 0.5, z], scale: [5.4, 1.2, 4.4], rotation });
  parts.push({ geometry: new THREE.BoxGeometry(3.2, 0.4, 3.2), color: 0xe6e3d8, position: [x, y + 0.65, z], rotation });
  const c = Math.cos(angle), s = Math.sin(angle);
  for (const [u, v] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    parts.push({ geometry: new THREE.CylinderGeometry(0.12, 0.13, 2.2, 8), color: VERMILION, position: [x + (u * c - v * s) * 1.2, y + 1.95, z + (u * s + v * c) * 1.2] });
  }
  parts.push({ geometry: new THREE.BoxGeometry(2.8, 0.2, 2.8), color: VERMILION, position: [x, y + 3.05, z], rotation });
  parts.push({ geometry: new THREE.ConeGeometry(2.6, 1.5, 4, 1), color: ROOF, position: [x, y + 3.85, z], rotation: [0, -angle + Math.PI / 4, 0] });
  parts.push({ geometry: new THREE.SphereGeometry(1, 8, 6), color: GOLD, position: [x, y + 4.7, z], scale: 0.2 });
  return parts;
}

// ------------------------------------------------------------ obstacles ---

// Taihu scholar rock (太湖石): the classic "thin, perforated, open, wrinkled"
// garden stone — a tall, waisted column of offset masses that lean and twist
// along an S-curve, pierced by clean round openings, with soft wrinkle
// ripples — standing on a lotus-petal marble pedestal. Sculpted as a signed
// distance field (models/sculpt.js), built once and turned per pillar so the
// four read as one family of stones. It fills the pillar cylinder (radius 0.9,
// height 2.6) and has a flat top so weapons can rest on it.
let scholarRock = null;
function scholarRockGeometry(height) {
  if (scholarRock) return scholarRock;
  const masses = [
    [[0.02, 0.74, 0.02], [0.8, 0.46, 0.76], [0, 0, 0.12]],
    [[0.16, 1.2, -0.1], [0.6, 0.4, 0.72], [0.2, 0, -0.18]],
    [[-0.13, 1.66, 0.14], [0.76, 0.4, 0.6], [-0.16, 0, 0.22]],
    [[0.1, 2.12, -0.08], [0.62, 0.38, 0.74], [0.12, 0, -0.22]],
    [[-0.02, 2.44, 0.02], [0.58, 0.24, 0.6], [0, 0.4, 0]],
  ].map(([c, r, rot]) => shape.ellipsoid(c, r, rot));
  // Wrinkles (皱): crossing ripples plus vertical rain grooves, so the
  // surface reads as water-worn limestone rather than a smooth blob.
  const ripple = (x, y, z) => 0.034 * Math.sin(x * 7.3 + y * 4.1) * Math.sin(z * 6.7 - y * 3.3) + 0.016 * Math.sin(y * 11 + x * 3)
    + 0.022 * Math.sin(Math.atan2(z, x) * 9 + y * 1.4) * (0.6 + 0.4 * Math.sin(y * 3.1));
  const stone = (x, y, z) => {
    let d = Infinity;
    for (const mass of masses) { const di = mass(x, y, z); d = d === Infinity ? di : smin(d, di, 0.13); }
    // Flat top for resting weapons; seated into the pedestal at the bottom.
    return Math.max(d + ripple(x, y, z), y - height, 0.3 - y);
  };
  const openings = [
    [[-1, 1.0, 0.32], [1, 1.16, -0.2], 0.17], [[0.3, 1.46, -1], [-0.12, 1.56, 1], 0.15],
    [[-1, 1.94, -0.3], [1, 1.84, 0.4], 0.13], [[0.22, 0.62, 1], [-0.3, 0.76, -1], 0.11], [[0.9, 2.3, 0.6], [-0.9, 2.2, -0.6], 0.09],
    [[-0.9, 1.38, -0.8], [0.9, 1.3, 0.7], 0.08],
  ].map(([a, b, r]) => shape.limb(a, b, r));
  const sculpt = createSculpt(
    [{ d: stone, color: 0xcfd6d2 }, ...openings.map(d => ({ d, cut: true }))],
    // Blue-grey stone: dark in the wrinkle troughs and around each opening,
    // deeper toward the foot, pale on the crests.
    [{ d: (x, y, z) => ripple(x, y, z) + 0.012, color: 0x8e9a99, edge: 0.03 },
      ...openings.map(d => ({ d: (x, y, z) => d(x, y, z) - 0.08, color: 0x5f6b6b, edge: 0.08 })),
      { d: (x, y, z) => y - 0.7, color: 0x9aa5a2, edge: 0.35 }],
  );
  const geometry = sculpt.build({ min: [-0.98, 0.25, -0.98], max: [0.98, height + 0.05, 0.98], resolution: 60 });
  geometry.translate(0, -height / 2, 0);
  return scholarRock = geometry;
}

function taihuRock(entry, obstacle, index) {
  const { own, prop, batch } = entry, h = obstacle.height, foot = 0.36;
  const marble = own(MARBLE, { sheen: 0.25, clearcoat: 0.15, roughness: 0.55 });
  // Pedestal: a stepped 须弥座 drum — plinth, recessed waist, moulded top.
  const drum = new THREE.LatheGeometry([[0, 0], [0.99, 0], [0.99, 0.07], [0.94, 0.09], [0.94, 0.13], [0.84, 0.16], [0.8, 0.2], [0.8, 0.25],
    [0.86, 0.28], [0.93, 0.3], [0.93, foot], [0, foot]].map(([x, y]) => new THREE.Vector2(x, y)), 64);
  batch.add(drum, marble, { outline: 0.02 });
  const rock = new THREE.Mesh(scholarRockGeometry(h), own(0xffffff, { vertexColors: true, sheen: 0.15, clearcoat: 0.08, roughness: 0.78 }));
  rock.position.y = h / 2;
  rock.rotation.y = index * 1.57 + 0.4;
  if (index % 2) rock.scale.x = -1;
  rock.castShadow = true; rock.receiveShadow = true;
  const ink = new THREE.Mesh(rock.geometry, INK);
  ink.scale.setScalar(1.022);
  ink.userData.outline = true;
  rock.add(ink);
  prop.add(rock);
}

// Planter relief: a plum branch in blossom inside a recessed frame.
function planterTexture(anisotropy, end = false) {
  return canvasTexture(end ? 256 : 1024, (c, w) => {
    const h = end ? 256 : 190, random = seeded(end ? 4 : 44);
    c.fillStyle = '#eceae2'; c.fillRect(0, 0, w, h);
    const m = end ? 22 : 26;
    c.fillStyle = '#dcdcd2'; c.fillRect(m, m, w - m * 2, h - m * 2);
    c.fillStyle = '#9fa69e'; c.fillRect(m, m, w - m * 2, 5); c.fillRect(m, m, 4, h - m * 2);
    c.fillStyle = '#ffffff'; c.fillRect(m, h - m - 4, w - m * 2, 4); c.fillRect(w - m - 3, m, 3, h - m * 2);
    const relief = (draw, body) => {
      c.save(); c.translate(2, 3); c.globalAlpha = 0.6; c.fillStyle = c.strokeStyle = '#7f877f'; draw(); c.restore();
      c.save(); c.translate(-1, -1); c.globalAlpha = 0.9; c.fillStyle = c.strokeStyle = '#ffffff'; draw(); c.restore();
      c.fillStyle = c.strokeStyle = body; draw();
    };
    if (end) {
      relief(() => { c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, 62, 0, TAU); c.stroke(); }, '#f6f4ee');
      relief(() => { c.save(); c.translate(w / 2 - 34, h / 2 + 6); cloudScroll(c, 40, c.fillStyle, c.fillStyle); c.restore(); }, '#efeee6');
      return;
    }
    // Branches.
    const branches = [];
    const grow = (x, y, a, len, width, depth) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, cx = (x + ex) / 2 + (random() - 0.5) * 30, cy = (y + ey) / 2 + (random() - 0.5) * 20;
      branches.push({ x, y, cx, cy, ex, ey, width });
      if (depth > 0) {
        grow(ex, ey, a + 0.5 + random() * 0.3, len * 0.62, width * 0.65, depth - 1);
        grow(ex, ey, a - 0.3 - random() * 0.3, len * 0.7, width * 0.7, depth - 1);
      }
    };
    grow(m + 30, h - m - 10, -0.35, 230, 12, 3);
    grow(w - m - 40, h - m - 20, Math.PI + 0.45, 170, 9, 2);
    relief(() => {
      c.lineCap = 'round';
      for (const b of branches) { c.lineWidth = b.width; c.beginPath(); c.moveTo(b.x, b.y); c.quadraticCurveTo(b.cx, b.cy, b.ex, b.ey); c.stroke(); }
    }, '#b9ab9a');
    const blossoms = branches.filter(b => b.width < 9).map(b => [b.ex, b.ey]).concat(branches.map(b => [b.cx, b.cy]));
    for (const [x, y] of blossoms) {
      if (x < m + 12 || x > w - m - 12 || y < m + 12 || y > h - m - 12) continue;
      relief(() => { for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 6, 0, TAU); c.fill(); } }, '#f1d9de');
      c.fillStyle = '#c97f90'; c.beginPath(); c.arc(x, y, 3, 0, TAU); c.fill();
    }
  }, anisotropy, end ? 256 : 190);
}

// Carved marble planter with a clipped, flowering hedge flush with its top.
function planter(entry, obstacle, index, kit, textures) {
  const { batch, own, prop } = entry, { halfX, halfZ, height } = obstacle;
  const stone = own(MARBLE, { sheen: 0.25, clearcoat: 0.15, roughness: 0.55 }), shade = own(MARBLE_SHADE, { sheen: 0.2, clearcoat: 0.1 });
  batch.add(G.box(halfX * 2, 0.16, halfZ * 2, 0.04), shade, { position: [0, 0.08, 0] });
  batch.add(G.box(halfX * 2 - 0.2, height - 0.3, halfZ * 2 - 0.16, 0.02), stone, { position: [0, 0.16 + (height - 0.3) / 2, 0] });
  // Coping frame round a flush hedge.
  const top = height - 0.075;
  batch.add(G.box(halfX * 2, 0.15, 0.2, 0.04), stone, { position: [0, top, halfZ - 0.1] });
  batch.add(G.box(halfX * 2, 0.15, 0.2, 0.04), stone, { position: [0, top, -halfZ + 0.1] });
  batch.add(G.box(0.22, 0.15, halfZ * 2 - 0.4, 0.03), stone, { position: [halfX - 0.11, top, 0] });
  batch.add(G.box(0.22, 0.15, halfZ * 2 - 0.4, 0.03), stone, { position: [-halfX + 0.11, top, 0] });
  batch.add(G.box(halfX * 2 - 0.44, 0.22, halfZ * 2 - 0.4, 0.06), own(0x6f9e6a, { sheen: 0.6, clearcoat: 0 }), { position: [0, height - 0.11, 0] });
  const random = seeded(500 + index), bloom = own(0xffffff, { vertexColors: true, sheen: 0.5, clearcoat: 0 });
  for (let i = 0; i < 22; i++) {
    batch.add(new THREE.SphereGeometry(1, 6, 3), bloom, { color: i % 3 ? 0xf2b6c2 : 0xfbf3f0, position: [(random() - 0.5) * (halfX * 2 - 0.7), height - 0.005, (random() - 0.5) * (halfZ * 2 - 0.6)], scale: [0.07, 0.015, 0.07] });
  }
  // Relief panels on all four faces.
  const make = map => { const mat = kit.material(0xffffff, { map, transparent: true, sheen: 0.2, clearcoat: 0.12, roughness: 0.6 }); entry.materials.push(mat); return mat; };
  const side = make(textures.side), end = make(textures.end), faceH = height - 0.3, cy = 0.16 + faceH / 2;
  const longPlane = new THREE.PlaneGeometry(halfX * 2 - 0.2, faceH), endPlane = new THREE.PlaneGeometry(halfZ * 2 - 0.16, faceH);
  const place = (geometry, x, z, ry) => geometry.clone().rotateY(ry).translate(x, cy, z);
  const faces = new THREE.Mesh(mergeGeometries([-1, 1].map(s => place(longPlane, 0, s * (halfZ - 0.08 + 0.003), s > 0 ? 0 : Math.PI))), side);
  const caps = new THREE.Mesh(mergeGeometries([-1, 1].map(s => place(endPlane, s * (halfX - 0.1 + 0.003), 0, s * Math.PI / 2))), end);
  for (const mesh of [faces, caps]) { mesh.receiveShadow = true; prop.add(mesh); }
}

// A single petal: a rounded teardrop about 0.26 m long, cupped across its width.
function petalGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.1);
  shape.bezierCurveTo(0.1, -0.05, 0.085, 0.07, 0.012, 0.1);
  shape.quadraticCurveTo(0, 0.088, -0.012, 0.1);
  shape.bezierCurveTo(-0.085, 0.07, -0.1, -0.05, 0, -0.1);
  const geometry = new THREE.ShapeGeometry(shape, 6), position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) position.setZ(i, (position.getX(i) / 0.09) ** 2 * 0.025);
  geometry.scale(1.3, 1.3, 1.3);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------- build ---

export function buildLakeside({ radius, rimHeight = 1.1, obstacles, anisotropy = 4 }) {
  const kit = createKit(), group = new THREE.Group(), R = radius;
  group.name = 'lotus-terrace';
  group.add(paintedSky({ top: SKY_TOP, mid: SKY_MID, horizon: HORIZON, sunDirection: SKY_SUN, sunColor: 0xfff0d4,
    glow: 0.32, disc: 0.5, discSize: 0.032, clouds: 0.28, cloudColor: 0xfbfcf8 }));
  // A light haze: the terrace and lake stay clear, the far shore softens and
  // the painted ranges carry their own aerial perspective.
  const fog = new THREE.Fog(HORIZON, 26, 215);
  addLights(group, {
    hemisphere: { sky: 0xeef4ee, ground: 0x7d9e8e, intensity: 2.0 },
    sun: { color: 0xffeed6, intensity: 3.1, position: SUN },
    rim: { color: 0xd4ecf0, intensity: 0.8, position: [20, 12, -24] },
  });

  // Terrace floor, balustrade (solid to its 1.15 rail, above rimHeight) and lanterns.
  const floor = kit.part(group, new THREE.CircleGeometry(R + 0.3, 160),
    kit.material(0xffffff, { map: terraceTexture(R + 0.3, R, anisotropy), sheen: 0, clearcoat: 0.2, clearcoatRoughness: 0.35, roughness: 0.55 }),
    { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.002, 0], outline: 0, shadow: false });
  floor.receiveShadow = true;
  floor.name = 'terrace-floor';
  // The balustrade turns see-through where it hides a fighter from the camera.
  const see = createSeeThrough({ solid: (x, y, z) => {
    const r = Math.hypot(x, z);
    return y > -0.1 && y < 1.2 && r > R + 0.02 && r < R + 0.64;
  } });
  balustrade(group, kit, R, anisotropy, see);
  const hung = lanterns(group, kit, R);


  // Zig-zag bridge (九曲桥) from the terrace ledge to the pavilion islet.
  const dir = new THREE.Vector2(Math.cos(BRIDGE_ANGLE), Math.sin(BRIDGE_ANGLE)), side = new THREE.Vector2(-dir.y, dir.x);
  const world = (u, v) => new THREE.Vector2(dir.x * u + side.x * v, dir.y * u + side.y * v);
  const turn = 0.7, leg = 5;
  const path = [[R + 0.9, 0], [R + 5.5, 0]];
  for (let i = 0; i < 3; i++) {
    const [u, v] = path[path.length - 1], s = i % 2 ? -1 : 1;
    path.push([u + Math.cos(turn) * leg, v + s * Math.sin(turn) * leg]);
  }
  const islet = { u: path[path.length - 1][0] + 9.6, v: path[path.length - 1][1] };
  path.push([islet.u - 2.7, islet.v]);
  const bridge = createBatch(), deckStone = kit.material(0xe9e6dc, { sheen: 0.2, clearcoat: 0.05 }), pier = kit.material(0xcfd2c8, { sheen: 0 });
  const rail = kit.material(VERMILION, { sheen: 0.2, clearcoat: 0.4 }), deckY = -0.22;
  const lake = createLayout();
  lake.block({ rMin: 0, rMax: R + 2.4 });
  for (let i = 0; i < path.length - 1; i++) {
    const a = world(...path[i]), b = world(...path[i + 1]), length = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const ry = -Math.atan2(b.y - a.y, b.x - a.x), t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize(), n = new THREE.Vector2(-t.y, t.x);
    lake.block({ ax: a.x, az: a.y, bx: b.x, bz: b.y, r: 1.6 });
    bridge.add(new THREE.BoxGeometry(length + 1.7, 0.2, 1.7), deckStone, { position: [mid.x, deckY, mid.y], rotation: [0, ry, 0] });
    for (let d = i === 0 ? 1.5 : 0; d <= length + 0.01; d += length / Math.max(1, Math.round(length / 2.6))) {
      const p = a.clone().addScaledVector(t, d);
      bridge.add(new THREE.BoxGeometry(0.5, 1.5, 1.5), pier, { position: [p.x, deckY - 0.85, p.y], rotation: [0, ry, 0] });
    }
    // Low vermilion rails on both sides.
    const start = i === 0 ? 1.4 : 0;
    for (const s of [-1, 1]) {
      const p0 = a.clone().addScaledVector(t, start).addScaledVector(n, s * 0.78), p1 = b.clone().addScaledVector(n, s * 0.78), span = p0.distanceTo(p1), pm = p0.clone().add(p1).multiplyScalar(0.5);
      bridge.add(new THREE.BoxGeometry(span, 0.09, 0.1), rail, { position: [pm.x, deckY + 0.62, pm.y], rotation: [0, ry, 0] });
      bridge.add(new THREE.BoxGeometry(span, 0.06, 0.06), rail, { position: [pm.x, deckY + 0.3, pm.y], rotation: [0, ry, 0] });
      const posts = Math.max(1, Math.round(span / 1.3));
      for (let j = 0; j <= posts; j++) {
        const p = p0.clone().lerp(p1, j / posts);
        bridge.add(new THREE.BoxGeometry(0.13, 0.62, 0.13), rail, { position: [p.x, deckY + 0.4, p.y], rotation: [0, ry, 0], outline: 0.02 });
      }
    }
  }
  bridge.build(group, { castShadow: false });

  // The pavilion islet: a grassy mound edged with rocks, two willows and a moored boat.
  const isletXZ = world(islet.u, islet.v), isletR = 7;
  lake.block({ x: isletXZ.x, z: isletXZ.y, r: isletR + 1.2 });
  const mound = new THREE.Mesh(coloredGeometry([
    { geometry: new THREE.SphereGeometry(1, 28, 10), color: 0xd6d4c4, position: [isletXZ.x, WATER_Y - 0.9, isletXZ.y], scale: [isletR + 0.4, 1.4, isletR + 0.4] },
    { geometry: new THREE.SphereGeometry(1, 28, 10), color: 0xa4c68c, position: [isletXZ.x, WATER_Y - 0.6, isletXZ.y], scale: [isletR - 0.4, 1.3, isletR - 0.4] },
  ]), softMaterial());
  mound.receiveShadow = true;
  group.add(mound);
  const hall = pavilion(kit);
  hall.position.set(isletXZ.x, 0.08, isletXZ.y);
  // Face the open side (corner pair 4-5) back along the bridge.
  hall.rotation.y = Math.atan2(-dir.y, dir.x);
  group.add(hall);

  const random = seeded(12), rocks = [], rockShape = (() => {
    const g = pebbleGeometry({ seed: 9, detail: 2, power: 2.2, roughness: 0.32, flatBase: 0.4 });
    g.deleteAttribute('normal'); g.deleteAttribute('uv');
    const smooth = mergeVertices(g); smooth.computeVertexNormals(); return smooth;
  })();
  for (let i = 0; i < 7; i++) {
    const a = BRIDGE_ANGLE + Math.PI + 0.9 + i / 6 * (TAU - 1.8), s = 0.55 + random() * 0.5;
    rocks.push({ x: isletXZ.x + Math.cos(a) * (isletR - 0.2), y: WATER_Y + s * 0.3, z: isletXZ.y + Math.sin(a) * (isletR - 0.2), sx: s * 1.3, sy: s * 0.9, sz: s, ry: random() * TAU, color: [0xbfc5c0, 0xb1b8b3, 0xc9cec8][i % 3] });
  }

  // The far shore, its woods and landmarks, and the painted ranges behind.
  const { mesh: land, height, shoreAt, shoreBase, knoll } = landscape();
  group.add(land);
  const layers = mountainLayers();
  group.add(paintedRanges(layers, { haze: HORIZON, sun: SUN, light: 0.2, name: 'ink-mountains' }));
  const ground = createLayout(), dry = (x, z, r) => groundUnder(height, x, z, r, 6).min > WATER_Y + 0.05;
  ground.block({ rMin: RANGE_FOOT, rMax: 1e4 });
  const mirrored = [], landmarks = [];
  const mirror = (item) => mirrored.push({ ...item, dist: Math.hypot(item.x, item.z) });

  // Pagoda on its knoll, moon bridge over the inlet, pavilion islet.
  const pagodaY = height(knoll.x, knoll.z) - 0.2, pagoda = pagodaParts(knoll.x, pagodaY, knoll.z, 0.64);
  landmarks.push(...pagoda.parts);
  ground.add(knoll.x, knoll.z, 3.6);
  mirror({ x: knoll.x, z: knoll.z, y: pagodaY, top: pagoda.top, w: 2.2, kind: 'pagoda' });
  const moonR = shoreBase(MOON_ANGLE) + 0.6, moon = { x: Math.cos(MOON_ANGLE) * moonR, z: Math.sin(MOON_ANGLE) * moonR };
  landmarks.push(...moonBridgeParts(moon.x, WATER_Y, moon.z, MOON_ANGLE));
  ground.block({ x: moon.x, z: moon.z, r: 6.5 });
  lake.block({ x: moon.x, z: moon.z, r: 9 });
  mirror({ x: moon.x, z: moon.z, y: WATER_Y, top: 4.2, w: 7.6, kind: 'bridge' });
  const isleR = Math.min(60, shoreBase(ISLE_ANGLE) - 14), isle = { x: Math.cos(ISLE_ANGLE) * isleR, z: Math.sin(ISLE_ANGLE) * isleR };
  landmarks.push(...islePavilionParts(isle.x, WATER_Y, isle.z, ISLE_ANGLE));
  lake.block({ x: isle.x, z: isle.z, r: 8 });
  const landmarkMesh = new THREE.Mesh(coloredGeometry(landmarks), softMaterial());
  landmarkMesh.name = 'landmarks';
  landmarkMesh.receiveShadow = true;
  group.add(landmarkMesh);

  // Woods: willows along the water, peach blossom by the landmarks, camphor
  // and osmanthus behind, pines on the rises, and darker groves up the hills.
  const kinds = {
    willow: { geometry: willowGeometry(17, { strands: 24, detail: [10, 6] }), items: [] },
    willowB: { geometry: willowGeometry(29, { strands: 22, droop: 1.2, greens: [0x8fb86c, 0xa3c77a, 0x82ab62], crown: [0x93bb6c, 0xa7c97c], detail: [10, 6] }), items: [] },
    blossom: { geometry: canopyGeometry({ seed: 21, crowns: 4, spread: 1.8, radius: 1.05, top: 0xf7d6dc, under: 0xd197a6, trunk: 0x5a463c, trunkHeight: 1.0, detail: [8, 5] }), items: [] },
    camphor: { geometry: canopyGeometry({ seed: 4, crowns: 5, spread: 2.6, radius: 1.45, top: 0x8db583, under: 0x45665a, trunk: 0x5d5148, trunkHeight: 1.0, detail: [8, 5] }), items: [] },
    osmanthus: { geometry: canopyGeometry({ seed: 9, crowns: 3, spread: 1.5, radius: 1.15, top: 0x7aa27a, under: 0x3a5a4f, trunk: 0x5d5148, trunkHeight: 0.6, squash: 1.0, detail: [8, 5] }), items: [] },
    pine: { geometry: pineGeometry(5), items: [] },
    pineB: { geometry: pineGeometry(12), items: [] },
    grove: { geometry: canopyGeometry({ seed: 15, crowns: 4, spread: 2.0, radius: 1.25, top: 0x6a9278, under: 0x35554b, trunk: 0x4f463e, trunkHeight: 0.4, detail: [7, 4], oneTrunk: true }), items: [] },
  };
  for (const kind of Object.values(kinds)) {
    kind.geometry.computeBoundingBox();
    const box = kind.geometry.boundingBox;
    kind.top = box.max.y; kind.r = Math.max(box.max.x, -box.min.x, box.max.z, -box.min.z);
  }
  const crownColor = { willow: 0xa2c47a, willowB: 0x96bd70, blossom: 0xeec3cb, camphor: 0x7fa77a, osmanthus: 0x6e9670, pine: 0x4f7a62, pineB: 0x4f7a62, grove: 0x5d846c };
  const plant = (name, x, y, z, s, extra = {}) => {
    const kind = kinds[name];
    kind.items.push({ x, y, z, s, ry: random() * TAU, ...extra });
    mirror({ x, z, y, top: kind.top * (extra.sy ?? s), w: kind.r * s * 0.8, color: crownColor[name] });
  };
  for (const da of [0.75, -1.05]) {
    const a = BRIDGE_ANGLE + da;
    kinds.willow.items.push({ x: isletXZ.x + Math.cos(a) * 4.9, y: WATER_Y + 0.25, z: isletXZ.y + Math.sin(a) * 4.9, s: 0.95, ry: random() * TAU });
  }
  // Scatter one kind at depth [d0, d1] behind the waterline, near `around` if given.
  // With `clump`, trees gather in groups of that size round random centres.
  const scatter = (names, count, d0, d1, { s = [0.9, 1.3], around = null, spread = 0.5, gap = 0.4, maxSlope = 1.2, fill = 1, tints = [0xffffff], clump = 0 } = {}) => {
    let centre = null, left = 0;
    for (let tries = 0, placed = 0; placed < count && tries < count * 80; tries++) {
      if (clump && (left <= 0 || tries % 40 === 39)) {
        const a = around === null ? random() * TAU : around + (random() - 0.5) * spread;
        centre = { a, r: shoreAt(a) + d0 + random() * (d1 - d0) }; left = clump;
      }
      const a = clump ? centre.a + (random() - 0.5) * 9 / centre.r : around === null ? random() * TAU : around + (random() - 0.5) * spread, x0 = Math.cos(a), z0 = Math.sin(a);
      const r = clump ? Math.max(shoreAt(a) + d0, centre.r + (random() - 0.5) * 9) : shoreAt(a) + d0 + random() * (d1 - d0);
      const x = x0 * r, z = z0 * r, name = names[Math.floor(random() * names.length)];
      const scale = s[0] + random() * (s[1] - s[0]), foot = kinds[name].r * scale * fill;
      const under = groundUnder(height, x, z, foot * 0.5, 4);
      if (under.max - under.min > maxSlope * scale || !dry(x, z, foot * 0.8)) continue;
      if (!ground.take(x, z, foot, gap)) continue;
      plant(name, x, under.min - 0.1, z, scale, { sy: scale * (0.9 + random() * 0.25), color: tints[Math.floor(random() * tints.length)] });
      placed++; left--;
    }
  };
  // Landmark plantings first, so they get their places.
  for (const side of [-1, 1]) {
    const a = MOON_ANGLE + side * 10 / moonR, r = shoreAt(a) + 2.5;
    plant(side > 0 ? 'willow' : 'willowB', Math.cos(a) * r, height(Math.cos(a) * r, Math.sin(a) * r) - 0.1, Math.sin(a) * r, 1.15);
    ground.add(Math.cos(a) * r, Math.sin(a) * r, 3);
  }
  scatter(['blossom'], 4, 2, 7, { around: MOON_ANGLE, spread: 0.3, s: [0.9, 1.2] });
  scatter(['pine', 'pineB'], 3, 6, 14, { around: PAGODA_ANGLE, spread: 0.2, s: [1.0, 1.3], gap: 0.2, fill: 0.7, maxSlope: 2 });
  scatter(['blossom'], 3, 1.5, 6, { around: PAGODA_ANGLE - 0.12, spread: 0.12 });
  scatter(['blossom'], 3, 1.5, 6, { around: BRIDGE_ANGLE + 0.9, spread: 0.2 });
  scatter(['willow', 'willowB'], 32, 1.2, 5, { s: [0.85, 1.35], gap: 0.5, maxSlope: 0.8, clump: 3, tints: [0xffffff, 0xf4f8ea, 0xeaf2e0] });
  scatter(['camphor', 'osmanthus', 'osmanthus'], 44, 3, 18, { s: [0.85, 1.7], gap: 0, fill: 0.75, clump: 5, tints: [0xffffff, 0xeef4ea, 0xf6f8ee, 0xe4eee6] });
  scatter(['pine', 'pineB'], 12, 8, 26, { s: [0.9, 1.4], gap: 0.3, fill: 0.7, maxSlope: 2, clump: 2 });
  scatter(['grove'], 72, 12, 38, { s: [1.0, 1.9], gap: 0, fill: 0.75, maxSlope: 3, clump: 7, tints: [0xffffff, 0xe8f0ea, 0xdfe9e2] });
  // The pavilion islet's pine and willow.
  kinds.pine.items.push({ x: isle.x + Math.cos(ISLE_ANGLE + 1.4) * 2.8, y: WATER_Y + 0.3, z: isle.z + Math.sin(ISLE_ANGLE + 1.4) * 2.8, s: 0.95, ry: 1.2 });
  kinds.willowB.items.push({ x: isle.x + Math.cos(ISLE_ANGLE - 1.3) * 3.2, y: WATER_Y + 0.3, z: isle.z + Math.sin(ISLE_ANGLE - 1.3) * 3.2, s: 0.8, ry: 0.4 });
  for (const kind of Object.values(kinds)) {
    if (kind.items.length) group.add(instanced(kind.geometry, softMaterial({ roughness: 0.92 }), kind.items));
  }

  // Reeds along the waterline and round both islets.
  const reeds = [];
  for (let tries = 0; reeds.length < 70 && tries < 3000; tries++) {
    const a = random() * TAU, r = shoreAt(a) - 2.5 + random() * 2.5, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z);
    if (y < WATER_Y - 0.9 || y > WATER_Y + 0.4 || Math.hypot(x - moon.x, z - moon.z) < 9) continue;
    const s = 0.8 + random() * 0.5;
    reeds.push({ x, y: Math.max(y, WATER_Y - 0.3), z, s, sy: s * (0.8 + random() * 0.5), ry: random() * TAU });
  }
  for (const [c, rr, n] of [[isletXZ, isletR + 0.2, 6], [new THREE.Vector2(isle.x, isle.z), 5.6, 5]]) {
    for (let i = 0; i < n; i++) {
      const a = random() * TAU;
      if (Math.abs(angleTo(a, BRIDGE_ANGLE + Math.PI)) < 0.5) continue;
      reeds.push({ x: c.x + Math.cos(a) * rr, y: WATER_Y - 0.2, z: c.y + Math.sin(a) * rr, s: 0.8 + random() * 0.3, ry: random() * TAU });
    }
  }
  group.add(instanced(reedGeometry(7), softMaterial({ roughness: 0.9 }), reeds));

  // Rocks on the islets and along the near shore.
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU + 0.4, s = 0.5 + random() * 0.4;
    rocks.push({ x: isle.x + Math.cos(a) * 5.2, y: WATER_Y + s * 0.3, z: isle.z + Math.sin(a) * 4.6, sx: s * 1.3, sy: s * 0.9, sz: s, ry: random() * TAU, color: 0xc4c9c3 });
  }
  for (let tries = 0, count = 0; count < 10 && tries < 600; tries++) {
    const a = random() * TAU, x0 = Math.cos(a), z0 = Math.sin(a), r = shoreAt(a) - 0.5 + random() * 2, s = 0.7 + random() * 0.8;
    const x = x0 * r, z = z0 * r;
    if (!ground.take(x, z, s * 1.3, 0.5) || !lake.take(x, z, s * 1.3, 0.3)) continue;
    rocks.push({ x, y: Math.max(WATER_Y, groundUnder(height, x, z, s, 4).min) + s * 0.35, z, sx: s * 1.3, sy: s, sz: s * 1.05, ry: random() * TAU, color: [0xb9bfba, 0xc6cbc5][count % 2] });
    count++;
  }
  group.add(instanced(rockShape, kit.material(0xffffff, { sheen: 0.15, clearcoat: 0, roughness: 0.8 }), rocks));

  // The lake, mirroring all of it.
  const { pano, shoreMap } = reflectionMaps({ layers, shoreBase, height, items: mirrored });
  const water = new THREE.Mesh(new THREE.RingGeometry(R + 1.2, 230, 160, 1), waterMaterial(R, pano, shoreMap));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  water.name = 'lake';
  group.add(water);

  // A small sampan moored off the islet.
  const boatAngle = BRIDGE_ANGLE + 1.7, boatXZ = new THREE.Vector2(isletXZ.x + Math.cos(boatAngle) * (isletR + 2.2), isletXZ.y + Math.sin(boatAngle) * (isletR + 2.2));
  lake.block({ x: boatXZ.x, z: boatXZ.y, r: 2.6 });
  const boat = new THREE.Group();
  boat.add(new THREE.Mesh(coloredGeometry([
    { geometry: new THREE.SphereGeometry(1, 18, 8, 0, TAU, Math.PI / 2, Math.PI / 2), color: 0x8a6a4c, scale: [2.3, 0.55, 0.8] },
    { geometry: new THREE.CylinderGeometry(1, 1, 0.08, 18), color: 0xb08d66, scale: [2.3, 1, 0.8], position: [0, 0.02, 0] },
    { geometry: new THREE.CylinderGeometry(0.62, 0.62, 1.5, 14, 1, true, -Math.PI / 2, Math.PI), color: 0x4c463e, rotation: [0, 0, Math.PI / 2], position: [-0.1, 0.1, 0] },
    { geometry: new THREE.CylinderGeometry(0.03, 0.03, 2.6, 5), color: 0x6d5a48, position: [1.7, 0.6, 0], rotation: [0, 0, -0.9] },
  ]), softMaterial({ side: THREE.DoubleSide })));
  boat.position.set(boatXZ.x, WATER_Y + 0.12, boatXZ.y);
  boat.rotation.y = -boatAngle + 0.4;
  group.add(boat);

  // Lotus: floating pads, raised leaves, flowers and buds in patches.
  const pads = [], leaves = [], flowers = [], buds = [];
  const patch = (cx, cz, size, density) => {
    for (let k = 0, n = Math.round(14 * density); k < 80 && n > 0; k++) {
      const a = random() * TAU, d = Math.sqrt(random()) * size, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, roll = random();
      const s = roll < 0.55 ? 0.45 + random() * 0.45 : 0.7 + random() * 0.6;
      if (!lake.take(x, z, roll < 0.55 ? s : s * 0.9, 0.05)) continue;
      n--;
      const tint = [0xffffff, 0xeef6e2, 0xe2efe4][Math.floor(random() * 3)];
      if (roll < 0.55) pads.push({ x, y: WATER_Y + 0.02, z, s, ry: random() * TAU, color: tint });
      else leaves.push({ x, y: WATER_Y + 0.35 + random() * 0.6, z, s, rx: (random() - 0.5) * 0.3, rz: (random() - 0.5) * 0.3, ry: random() * TAU, color: tint });
      if (random() < 0.28) flowers.push({ x: x + 0.35, y: WATER_Y + 0.7 + random() * 0.5, z: z - 0.2, s: 1 + random() * 0.4, ry: random() * TAU });
      else if (random() < 0.18) buds.push({ x: x - 0.3, y: WATER_Y + 0.6 + random() * 0.6, z: z + 0.25, s: 1 + random() * 0.3, ry: random() * TAU, rz: (random() - 0.5) * 0.2 });
    }
  };
  for (const [a, r, size, density] of [[0.9, R + 6, 3.6, 1.1], [1.9, R + 8.5, 4.2, 1.2], [2.9, R + 5.5, 3.2, 0.9], [3.7, R + 9, 4.5, 1.2], [4.5, R + 6, 3.4, 1], [5.2, R + 10, 3.6, 0.9], [-0.1, R + 7.5, 3, 0.9]]) {
    patch(Math.cos(a) * r, Math.sin(a) * r, size, density);
  }
  for (const da of [-0.25, 0.3]) {
    const a = BRIDGE_ANGLE + da, r = 36;
    patch(Math.cos(a) * r, Math.sin(a) * r, 3.5, 0.9);
  }
  group.add(instanced(lotusLeaf({ cup: 0.05, wave: 0.01 }), softMaterial({ side: THREE.DoubleSide }), pads));
  const raised = coloredMerge([lotusLeaf({ cup: 0.28, wave: 0.06 }).rotateY(0), gradient(new THREE.CylinderGeometry(0.025, 0.03, 1.4, 5).translate(0, -0.7, 0), (x, y, z, c) => c.set(0x6f9a5c))]);
  group.add(instanced(raised, softMaterial({ side: THREE.DoubleSide }), leaves));
  group.add(instanced(lotusFlower(), softMaterial({ roughness: 0.6 }), flowers));
  group.add(instanced(lotusBud(), softMaterial({ roughness: 0.6 }), buds));

  // Koi gliding just under the surface.
  const koiShape = coloredGeometry([
    { geometry: new THREE.SphereGeometry(1, 12, 6), color: 0xffffff, scale: [0.42, 0.07, 0.14] },
    { geometry: new THREE.ConeGeometry(0.14, 0.3, 6), color: 0xffffff, position: [-0.5, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 0.35] },
  ]);
  const koiCount = 7, koi = new THREE.InstancedMesh(koiShape, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.72, depthWrite: false }), koiCount);
  const koiPaths = Array.from({ length: koiCount }, (_, i) => ({ r: R + 3.8 + (i % 4) * 1.6, a: i * 0.9, speed: (i % 2 ? 1 : -1) * (0.035 + (i % 3) * 0.01), s: 1.1 + (i % 3) * 0.25, phase: i * 1.3 }));
  koiPaths.forEach((k, i) => koi.setColorAt(i, new THREE.Color([0xf08a3c, 0xfbf3e8, 0xe8613a, 0xf6c45a][i % 4])));
  koi.frustumCulled = false;
  koi.renderOrder = 1;
  group.add(koi);

  // Mist (云雾): a faint veil drifting low over the open lake, banks pooled
  // along the far shore and at the foot of every range, and a broken cloud
  // belt across the karst peaks. All feathered, nothing with an edge.
  const mist = featherMist([
    { radius: 38, spread: 34, y0: WATER_Y + 0.05, y1: WATER_Y + 2.6, color: 0xf3f6f1, opacity: 0.4, profile: 'band', cover: 0.42, scale: 1.5 },
    { radius: 62, spread: 24, y0: WATER_Y, y1: 7, color: HORIZON, opacity: 0.6, profile: 'band', cover: 0.5 },
    { radius: 104, spread: 6, y0: -2, y1: 13, color: HORIZON, opacity: 0.72, cover: 0.55 },
    { radius: 128, spread: 4, y0: 0, y1: 20, color: HORIZON, opacity: 0.62, cover: 0.55 },
    { radius: 152, y0: 16, y1: 31, color: 0xf6f8f4, opacity: 0.6, profile: 'band', cover: 0.42, scale: 0.8 },
    { radius: 178, spread: 4, y0: 4, y1: 28, color: HORIZON, opacity: 0.6, cover: 0.5 },
  ]);
  group.add(mist.mesh);
  const birds = birdFlock({ count: 5, radius: 42, height: 22, color: 0x4e5a58, seed: 9 });
  group.add(birds.mesh);

  // Obstacles: Taihu rocks on carved drums and marble planters.
  const textures = { side: planterTexture(anisotropy), end: planterTexture(anisotropy, true) };
  const props = obstacles.map((obstacle, index) => {
    const entry = createProp(kit, obstacle);
    if (obstacle.kind === 'pillar') taihuRock(entry, obstacle, index);
    else planter(entry, obstacle, index, kit, textures);
    return finishProp(group, entry);
  });

  // Lotus and peach-blossom petals drifting down over the terrace: slow,
  // swaying wide and turning gently like real petals in a breeze.
  const petals = fallingFlakes({ geometry: petalGeometry(), colors: [0xf3a6b9, 0xe98aa2, 0xf8c8d3, 0xf5b3c3, 0xfde6ea], count: 190,
    radius: R + 6, base: 0.3, span: 11, speed: 0.16, speedStep: 0.04, spin: 0.35, spinStep: 0.12, sway: 0.9, swirl: 0.02, tumble: 0.5 });
  group.add(petals.mesh);

  let time = 0;
  const t = new THREE.Object3D(), waterUniforms = water.material.uniforms;
  return {
    group, fog, props,
    update(dt, camera, focus, fighters = null) {
      time += dt;
      waterUniforms.time.value = time;
      for (const lantern of hung) lantern.rotation.z = Math.sin(time * 1.2 + lantern.userData.phase) * 0.05;
      koiPaths.forEach((k, i) => {
        const a = k.a + time * k.speed, wiggle = Math.sin(time * 3 + k.phase) * 0.18;
        t.position.set(Math.cos(a) * (k.r + Math.sin(time * 0.3 + k.phase) * 0.8), WATER_Y + 0.015, Math.sin(a) * (k.r + Math.sin(time * 0.3 + k.phase) * 0.8));
        t.rotation.set(0, -a - Math.sign(k.speed) * Math.PI / 2 + wiggle, 0);
        t.scale.setScalar(k.s); t.updateMatrix(); koi.setMatrixAt(i, t.matrix);
      });
      koi.instanceMatrix.needsUpdate = true;
      boat.position.y = WATER_Y + 0.12 + Math.sin(time * 1.1) * 0.04;
      boat.rotation.z = Math.sin(time * 0.8) * 0.03;
      birds.update(time);
      petals.update(time, camera?.position);
      mist.update(dt);
      see.update(dt, camera, fighters);
      fadeProps(props, dt, camera, focus, fighters);
    },
  };
}
