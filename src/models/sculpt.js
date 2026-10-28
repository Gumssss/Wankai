import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Organic characters as signed distance fields: primitives smoothly unioned
// (so arms grow out of bodies the way a sculpted model does), coloured by
// region and paint strokes, then turned into a smooth vertex-coloured mesh
// with marching cubes. Distances are in metres in the authoring frame.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const length3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

// Polynomial smooth minimum: blends two surfaces within distance k.
export const smin = (a, b, k) => {
  if (k <= 0) return Math.min(a, b);
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b + (a - b) * h - k * h * (1 - h);
};

// A rotation (Euler XYZ, radians) applied to a primitive about its centre.
function inverseRotation(rotation) {
  if (!rotation) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)).invert().elements;
  return [m[0], m[4], m[8], m[1], m[5], m[9], m[2], m[6], m[10]];
}

export const shape = {
  sphere: ([cx, cy, cz], r) => (x, y, z) => length3(x - cx, y - cy, z - cz) - r,
  // Approximate ellipsoid distance (Quilez), optionally rotated.
  ellipsoid: ([cx, cy, cz], [rx, ry, rz], rotation) => {
    const m = inverseRotation(rotation);
    return (x, y, z) => {
      let px = x - cx, py = y - cy, pz = z - cz;
      if (m) [px, py, pz] = [m[0] * px + m[1] * py + m[2] * pz, m[3] * px + m[4] * py + m[5] * pz, m[6] * px + m[7] * py + m[8] * pz];
      const k0 = length3(px / rx, py / ry, pz / rz), k1 = length3(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
      return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
    };
  },
  // A capsule whose radius tapers from ra at a to rb at b (a "round cone").
  limb: ([ax, ay, az], [bx, by, bz], ra, rb = ra) => {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz;
    return (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const t = l2 > 0 ? clamp((px * dx + py * dy + pz * dz) / l2, 0, 1) : 0;
      return length3(px - dx * t, py - dy * t, pz - dz * t) - (ra + (rb - ra) * t);
    };
  },
  box: ([cx, cy, cz], [hx, hy, hz], r = 0) => (x, y, z) => {
    const qx = Math.abs(x - cx) - hx + r, qy = Math.abs(y - cy) - hy + r, qz = Math.abs(z - cz) - hz + r;
    return length3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
  },
};

// parts: [{ d, color, blend = 0.05, cut = false }] unioned in order (cut
//   subtracts); paints: [{ d, color, edge = 0.02 }] recolour where d < 0.
// Returns the distance function, a colour function and the mesh builder.
export function createSculpt(parts, paints = []) {
  const colors = parts.map(part => new THREE.Color(part.color ?? 0xffffff));
  const paintColors = paints.map(paint => new THREE.Color(paint.color));
  const distance = (x, y, z) => {
    let d = Infinity;
    for (const part of parts) {
      const di = part.d(x, y, z);
      d = part.cut ? Math.max(d, -di) : d === Infinity ? di : smin(d, di, part.blend ?? 0.05);
    }
    return d;
  };
  const scratch = new THREE.Color();
  const color = (x, y, z, out) => {
    // Each part tints the surface by closeness, so seams blend softly.
    let best = Infinity;
    const ds = parts.map(part => part.cut ? Infinity : part.d(x, y, z));
    for (const d of ds) best = Math.min(best, d);
    let total = 0;
    out.setRGB(0, 0, 0);
    ds.forEach((d, i) => {
      if (d === Infinity) return;
      const w = Math.exp(-(d - best) / 0.012);
      out.r += colors[i].r * w; out.g += colors[i].g * w; out.b += colors[i].b * w; total += w;
    });
    out.multiplyScalar(1 / total);
    paints.forEach((paint, i) => {
      const t = clamp(-paint.d(x, y, z) / (paint.edge ?? 0.02) + 0.5, 0, 1);
      if (t > 0) out.lerp(scratch.copy(paintColors[i]), t);
    });
    return out;
  };
  // March from `from` along `direction` to the surface; returns the hit point.
  const surface = (from, direction) => {
    const dir = new THREE.Vector3(...direction).normalize(), p = new THREE.Vector3(...from);
    for (let i = 0; i < 200; i++) {
      const d = distance(p.x, p.y, p.z);
      if (d > -1e-4) return p;
      p.addScaledVector(dir, Math.max(-d, 0.002));
    }
    return p;
  };
  return { distance, color, surface, build: options => buildMesh(distance, color, options) };
}

// Sample the field on a cube grid over [min, max] and extract the surface.
function buildMesh(distance, color, { min, max, resolution = 72 }) {
  const centre = min.map((v, i) => (v + max[i]) / 2);
  const half = Math.max(...max.map((v, i) => v - min[i])) / 2 * 1.08;
  const mc = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, true, 120000);
  mc.isolation = 0;
  const size = mc.size, rgb = new THREE.Color();
  for (let k = 0; k < size; k++) for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = centre[0] + ((i - size / 2) / (size / 2)) * half;
    const y = centre[1] + ((j - size / 2) / (size / 2)) * half;
    const z = centre[2] + ((k - size / 2) / (size / 2)) * half;
    const q = i + j * size + k * size * size, d = distance(x, y, z);
    mc.field[q] = -d;
    if (d < 0.08) {
      color(x, y, z, rgb);
      mc.palette[q * 3] = rgb.r; mc.palette[q * 3 + 1] = rgb.g; mc.palette[q * 3 + 2] = rgb.b;
    }
  }
  mc.update();
  const count = mc.count, source = mc.geometry;
  const position = source.getAttribute('position').array.slice(0, count * 3);
  for (let v = 0; v < count * 3; v += 3) {
    position[v] = centre[0] + position[v] * half;
    position[v + 1] = centre[1] + position[v + 1] * half;
    position[v + 2] = centre[2] + position[v + 2] * half;
  }
  const soup = new THREE.BufferGeometry();
  soup.setAttribute('position', new THREE.BufferAttribute(position, 3));
  soup.setAttribute('color', new THREE.BufferAttribute(source.getAttribute('color').array.slice(0, count * 3), 3));
  // Weld the triangle soup and take normals from the surface itself: the
  // grid-gradient normals marching cubes provides are noisy at cell scale.
  const geometry = mergeVertices(soup, 1e-5);
  soup.dispose();
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  mc.geometry.dispose();
  mc.material.dispose();
  return geometry;
}

// Bend everything above `pivot` back about the z axis (a neck), weighted by
// smoothstep(from, to, height) so the body curves instead of creasing.
export function bendable(geometry, { pivot, from, to }) {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const rest = position.array.slice(), restNormal = normal.array.slice();
  let current = 0;
  return angle => {
    if (Math.abs(angle - current) < 1e-4) return;
    current = angle;
    const p = position.array, n = normal.array;
    for (let v = 0; v < rest.length; v += 3) {
      const x = rest[v], y = rest[v + 1], t = clamp((y - from) / (to - from), 0, 1);
      const a = angle * t * t * (3 - 2 * t), c = Math.cos(a), s = Math.sin(a), dy = y - pivot;
      p[v] = x * c - dy * s;
      p[v + 1] = pivot + x * s + dy * c;
      n[v] = restNormal[v] * c - restNormal[v + 1] * s;
      n[v + 1] = restNormal[v] * s + restNormal[v + 1] * c;
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
    geometry.computeBoundingSphere();
  };
}
