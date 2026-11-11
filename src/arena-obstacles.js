// Solid props on the match floor, in world units (the match arena radius is
// 19.35). The layout is point-symmetric about the centre so neither start
// mark is favoured, and both fighters start on open ground at x = ±2.2.
const pillar = (x, z) => Object.freeze({ kind: 'pillar', x, z, radius: 0.9, height: 2.6, extent: 0.9 });
const wall = (x, z, angle) => Object.freeze({ kind: 'wall', x, z, angle, halfX: 2.4, halfZ: 0.45, height: 1.2,
  extent: Math.hypot(2.4, 0.45) });

const PILLAR_RING = 9.5;
export const ARENA_OBSTACLES = Object.freeze([
  ...[1, 3, 5, 7].map(octant => pillar(Math.cos(octant * Math.PI / 4) * PILLAR_RING, Math.sin(octant * Math.PI / 4) * PILLAR_RING)),
  wall(0, 11, 0),
  wall(0, -11, 0),
  wall(13.5, 0, Math.PI / 2),
  wall(-13.5, 0, Math.PI / 2),
]);

// Horizontal push-out for a circle of `radius` at (x, z): the outward normal
// and penetration depth, or null when clear. Heights are checked by callers.
export function obstacleContact(obstacle, x, z, radius) {
  const dx = x - obstacle.x, dz = z - obstacle.z;
  if (obstacle.kind === 'pillar') {
    const distance = Math.hypot(dx, dz), depth = obstacle.radius + radius - distance;
    if (depth <= 0) return null;
    return distance > 1e-9 ? { nx: dx / distance, nz: dz / distance, depth } : { nx: 1, nz: 0, depth };
  }
  // Wall: a box rotated by angle about Y. Work in its local frame.
  const c = Math.cos(obstacle.angle), s = Math.sin(obstacle.angle);
  const lx = dx * c + dz * s, lz = -dx * s + dz * c;
  const cx = Math.max(-obstacle.halfX, Math.min(obstacle.halfX, lx));
  const cz = Math.max(-obstacle.halfZ, Math.min(obstacle.halfZ, lz));
  let nx, nz, depth;
  if (cx === lx && cz === lz) {
    // Centre inside the box: leave through the nearest face.
    const outX = obstacle.halfX - Math.abs(lx), outZ = obstacle.halfZ - Math.abs(lz);
    if (outX < outZ) { nx = Math.sign(lx) || 1; nz = 0; depth = outX + radius; }
    else { nx = 0; nz = Math.sign(lz) || 1; depth = outZ + radius; }
  } else {
    const ex = lx - cx, ez = lz - cz, distance = Math.hypot(ex, ez);
    depth = radius - distance;
    if (depth <= 0) return null;
    nx = ex / distance; nz = ez / distance;
  }
  return { nx: nx * c - nz * s, nz: nx * s + nz * c, depth };
}

// Exact finite-height visibility test for combat assistance. Unlike the camera
// sampler below, thin props must not fall between sample points.
export function segmentIntersectsObstacle(obstacle, a, b) {
  let enter = 0, leave = 1;
  const slab = (start, delta, low, high) => {
    if (Math.abs(delta) < 1e-12) return start >= low && start <= high;
    let first = (low - start) / delta, last = (high - start) / delta;
    if (first > last) [first, last] = [last, first];
    enter = Math.max(enter, first); leave = Math.min(leave, last);
    return enter <= leave;
  };
  if (!slab(a.y, b.y - a.y, 0, obstacle.height)) return false;
  const x = a.x - obstacle.x, z = a.z - obstacle.z, dx = b.x - a.x, dz = b.z - a.z;
  if (obstacle.kind === 'pillar') {
    const aa = dx * dx + dz * dz, bb = x * dx + z * dz, cc = x * x + z * z - obstacle.radius ** 2;
    if (aa < 1e-12) return cc <= 0;
    const disc = bb * bb - aa * cc;
    if (disc < 0) return false;
    enter = Math.max(enter, (-bb - Math.sqrt(disc)) / aa);
    leave = Math.min(leave, (-bb + Math.sqrt(disc)) / aa);
    return enter <= leave;
  }
  const c = Math.cos(obstacle.angle), s = Math.sin(obstacle.angle);
  return slab(x * c + z * s, dx * c + dz * s, -obstacle.halfX, obstacle.halfX) &&
    slab(-x * s + z * c, -dx * s + dz * c, -obstacle.halfZ, obstacle.halfZ);
}

// True when the segment from a to b passes through the prop below its top.
// The camera uses this to fade props that hide the local fighter.
export function obstacleBlocksSegment(obstacle, a, b, margin = 0.2) {
  for (let i = 1; i < 16; i++) {
    const t = i / 16, y = a.y + (b.y - a.y) * t;
    if (y > obstacle.height + margin) continue;
    if (obstacleContact(obstacle, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, margin)) return true;
  }
  return false;
}
