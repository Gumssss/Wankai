import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../models/toy-kit.js';
import { obstacleBlocksSegment } from '../arena-obstacles.js';

// Shared building blocks for the arena skins: sky, lights, merged/instanced
// scenery, revolved profiles, terrain rings and the obstacle-prop fade.
export const TAU = Math.PI * 2;
export const INK = new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.BackSide });

export function seeded(seed = 1) {
  let s = Math.floor(Math.abs(seed)) % 2147483647 || 1;
  return () => (s = s * 16807 % 2147483647) / 2147483647;
}

export const clamp01 = x => Math.min(1, Math.max(0, x));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Smooth 2D value noise in [0, 1] with an fbm helper.
export function createNoise(seed = 7) {
  const random = seeded(seed), perm = new Uint8Array(512), values = new Float32Array(256);
  for (let i = 0; i < 256; i++) { values[i] = random(); perm[i] = i; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const at = (x, z) => values[perm[(x & 255) + perm[z & 255]]];
  const noise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const a = at(xi, zi), b = at(xi + 1, zi), c = at(xi, zi + 1), d = at(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  noise.fbm = (x, z, octaves = 4) => {
    let sum = 0, amp = 0.5, total = 0;
    for (let i = 0; i < octaves; i++) { sum += noise(x, z) * amp; total += amp; x = x * 2.03 + 17.1; z = z * 2.03 - 9.7; amp *= 0.5; }
    return sum / total;
  };
  return noise;
}

// A gradient sky that follows the camera, so it never meets the far plane.
// Colours are output without tone mapping, exactly like fog colour, so a
// matching horizon colour lets far scenery melt into the sky.
export function skyDome({ top, horizon, ground = horizon, sunDirection = [-0.5, 0.6, 0.4], sunColor = 0xfff2d6, glow = 0.35, disc = 0.9, radius = 200 }) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, horizon: { value: new THREE.Color(horizon) }, ground: { value: new THREE.Color(ground) },
      sunDir: { value: new THREE.Vector3(...sunDirection).normalize() }, sunColor: { value: new THREE.Color(sunColor) },
      glow: { value: glow }, disc: { value: disc },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow; uniform float disc;
      varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 sky = mix(horizon, top, pow(smoothstep(0.0, 0.5, h), 0.7));
        vec3 col = mix(ground, sky, smoothstep(-0.05, 0.01, h));
        float s = max(dot(d, sunDir), 0.0);
        col += sunColor * (pow(s, 8.0) * glow * smoothstep(-0.1, 0.2, h) + smoothstep(0.9975, 0.9988, s) * disc);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 20), material);
  dome.name = 'sky';
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.onBeforeRender = (renderer, scene, camera) => {
    dome.position.setFromMatrixPosition(camera.matrixWorld);
    dome.updateMatrixWorld();
  };
  return dome;
}

// Hemisphere fill, one shadow-casting sun covering the arena, a soft rim light.
export function addLights(group, { hemisphere, sun, rim }) {
  const hemi = new THREE.HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity);
  group.add(hemi);
  const light = new THREE.DirectionalLight(sun.color, sun.intensity);
  light.position.set(...sun.position);
  light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 110 });
  light.shadow.normalBias = 0.035;
  light.shadow.bias = -0.0003;
  group.add(light);
  let rimLight = null;
  if (rim) {
    rimLight = new THREE.DirectionalLight(rim.color, rim.intensity);
    rimLight.position.set(...rim.position);
    group.add(rimLight);
  }
  return { hemisphere: hemi, sun: light, rim: rimLight };
}

// Cheap lit materials for far scenery (vertex colours, no sheen or clearcoat).
export const farMaterial = (extra = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...extra });
export const softMaterial = (extra = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, ...extra });

// Bring any geometry to non-indexed position/normal/uv so it can be merged.
function normalised(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.morphAttributes = {};
  return g;
}

const transform = new THREE.Object3D();
function placement({ position, rotation, scale, quaternion } = {}) {
  transform.position.set(...(position ?? [0, 0, 0]));
  transform.rotation.set(...(rotation ?? [0, 0, 0]));
  if (quaternion) transform.quaternion.copy(quaternion);
  if (scale === undefined) transform.scale.set(1, 1, 1);
  else if (Array.isArray(scale)) transform.scale.set(...scale);
  else transform.scale.setScalar(scale);
  transform.updateMatrix();
  return transform;
}

// Merge geometries that share a material into one mesh per material, plus one
// merged ink-outline hull for every part that asked for an outline. A part's
// optional colour is baked into a vertex colour (white otherwise), so one
// vertexColors material can carry many tints in a single draw call.
const tint = new THREE.Color();
function paintVertices(geometry, color = 0xffffff) {
  tint.set(color);
  const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) { colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b; }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function createBatch() {
  const buckets = new Map(), ink = [];
  // `hull` optionally gives a cheaper geometry for the ink outline.
  const add = (geometry, material, { outline = 0, color, hull: hullGeometry, ...options } = {}) => {
    const t = placement(options);
    const g = paintVertices(normalised(geometry).applyMatrix4(t.matrix), color);
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(g);
    if (outline > 0) {
      const s = t.scale, hull = normalised(hullGeometry ?? geometry);
      hull.scale(1 + outline / Math.max(s.x, 1e-3), 1 + outline / Math.max(s.y, 1e-3), 1 + outline / Math.max(s.z, 1e-3));
      ink.push(hull.applyMatrix4(t.matrix));
    }
  };
  const build = (parent, { castShadow = true, receiveShadow = true, inkMaterial = INK } = {}) => {
    const meshes = [];
    for (const [material, list] of buckets) {
      const mesh = new THREE.Mesh(mergeGeometries(list), material);
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      parent.add(mesh); meshes.push(mesh);
      for (const g of list) g.dispose();
    }
    if (ink.length) {
      const outline = new THREE.Mesh(mergeGeometries(ink), inkMaterial);
      outline.userData.outline = true;
      parent.add(outline); meshes.push(outline);
      for (const g of ink) g.dispose();
    }
    buckets.clear(); ink.length = 0;
    return meshes;
  };
  return { add, build };
}

// One geometry with per-vertex colours from coloured parts (for instancing).
export function coloredGeometry(parts) {
  const color = new THREE.Color(), list = parts.map(part => {
    const g = normalised(part.geometry).applyMatrix4(placement(part).matrix);
    color.set(part.color);
    const count = g.attributes.position.count, colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(list);
  for (const g of list) g.dispose();
  return merged;
}

// Instanced copies: items are { x, y, z, ry, rx, rz, s | sx, sy, sz, color }.
export function instanced(geometry, material, items, { castShadow = false, receiveShadow = true } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  mesh.count = items.length;
  const color = new THREE.Color();
  items.forEach((item, i) => {
    transform.position.set(item.x ?? 0, item.y ?? 0, item.z ?? 0);
    transform.rotation.set(item.rx ?? 0, item.ry ?? 0, item.rz ?? 0);
    transform.scale.set(item.sx ?? item.s ?? 1, item.sy ?? item.s ?? 1, item.sz ?? item.s ?? 1);
    transform.updateMatrix();
    mesh.setMatrixAt(i, transform.matrix);
    if (item.color !== undefined) mesh.setColorAt(i, color.set(item.color));
  });
  mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
  mesh.computeBoundingSphere();
  return mesh;
}

// Revolve flat bands [r0, y0, r1, y1, color] around Y with crisp normals
// (u runs once around the sweep, v from the band's first to second point).
// Walk the profile from the inside outwards: the lit side is on the left
// (treads face up, risers face the centre).
export function latheBands(bands, { segments = 128, thetaStart = 0, thetaLength = TAU } = {}) {
  const positions = [], normals = [], colors = [], uvs = [], indices = [], color = new THREE.Color();
  for (const [r0, y0, r1, y1, hex] of bands) {
    const dr = r1 - r0, dy = y1 - y0, length = Math.hypot(dr, dy) || 1, nr = -dy / length, ny = dr / length;
    color.set(hex);
    const base = positions.length / 3;
    for (let j = 0; j <= segments; j++) {
      const a = thetaStart + j / segments * thetaLength, c = Math.cos(a), s = Math.sin(a);
      positions.push(r0 * c, y0, r0 * s, r1 * c, y1, r1 * s);
      uvs.push(j / segments, 0, j / segments, 1);
      normals.push(nr * c, ny, nr * s, nr * c, ny, nr * s);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
    // Pick a winding whose front face agrees with the band normal.
    const a = Math.cos(thetaStart), b = Math.sin(thetaStart), a2 = Math.cos(thetaStart + thetaLength / segments), b2 = Math.sin(thetaStart + thetaLength / segments);
    const p0 = new THREE.Vector3(r0 * a, y0, r0 * b), p1 = new THREE.Vector3(r1 * a, y1, r1 * b), p2 = new THREE.Vector3(r0 * a2, y0, r0 * b2);
    const face = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const flip = face.dot(new THREE.Vector3(nr * a, ny, nr * b)) < 0;
    for (let j = 0; j < segments; j++) {
      const i0 = base + j * 2, i1 = i0 + 1, i2 = i0 + 2, i3 = i0 + 3;
      if (flip) indices.push(i0, i2, i1, i1, i2, i3);
      else indices.push(i0, i1, i2, i1, i3, i2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// A polar height-field ring (hills, shores, mountains) with vertex colours.
// height(x, z, r) → y; paint(x, y, z, r, color) fills the colour.
export function terrainRing({ inner, outer, rings = 40, segments = 160, height, paint, power = 1.6 }) {
  const positions = [], colors = [], indices = [], color = new THREE.Color();
  for (let i = 0; i <= rings; i++) {
    const r = inner + (outer - inner) * Math.pow(i / rings, power);
    for (let j = 0; j <= segments; j++) {
      const a = j / segments * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r, y = height(x, z, r);
      positions.push(x, y, z);
      paint(x, y, z, r, color);
      colors.push(color.r, color.g, color.b);
    }
  }
  const row = segments + 1;
  for (let i = 0; i < rings; i++) for (let j = 0; j < segments; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// Canvas texture (square unless a height is given) painted by draw(context, size).
export function canvasTexture(size, draw, anisotropy = 4, height = size) {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = height;
  draw(canvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

// Puffy clouds in one instanced mesh, in a group that update() can spin.
export function cloudLayer({ count = 8, radius = 95, height = 32, seed = 3, color = 0xffffff, emissive = 0xfff8ec, scale = 3.2 }) {
  const random = seeded(seed), puffs = [];
  for (let i = 0; i < count; i++) {
    const a = i / count * TAU + random() * 0.5, r = radius * (0.85 + random() * 0.3), y = height + random() * 14, s = scale * (0.7 + random() * 0.6);
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, tangent = a + Math.PI / 2;
    for (const [dx, dy, pr] of [[0, 0, 1.4], [1.4, -0.2, 1], [-1.4, -0.25, 1.05], [0.6, 0.6, 0.9], [-0.7, 0.45, 0.8]]) {
      puffs.push({ x: cx + Math.cos(tangent) * dx * s, y: y + dy * s, z: cz + Math.sin(tangent) * dx * s, sx: pr * s, sy: pr * s * 0.78, sz: pr * s });
    }
  }
  const material = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity: 0.45, fog: false });
  const mesh = instanced(new THREE.SphereGeometry(1, 14, 10), material, puffs, { receiveShadow: false });
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

// A loose flock of little birds wheeling far above the arena.
export function birdFlock({ count = 9, radius = 46, height = 26, color = 0x4d4a46, seed = 11 }) {
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -0.9, 0.25, 0, 0, 0, -0.1, 0, 0, 0.35, 0.9, 0.25, 0, 0, 0, -0.1], 3));
  shape.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(shape, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), count);
  mesh.frustumCulled = false;
  const random = seeded(seed), birds = Array.from({ length: count }, () => ({ a: random() * 0.9, r: radius + random() * 10, y: height + random() * 6, phase: random() * TAU, s: 0.8 + random() * 0.5 }));
  const update = time => {
    birds.forEach((bird, i) => {
      const a = bird.a + time * 0.05;
      transform.position.set(Math.cos(a) * bird.r, bird.y + Math.sin(time * 0.6 + bird.phase) * 1.2, Math.sin(a) * bird.r);
      transform.rotation.set(0, -a, 0);
      const flap = 0.35 + Math.abs(Math.sin(time * 5 + bird.phase)) * 0.9;
      transform.scale.set(bird.s, bird.s * flap, bird.s);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

// Little flat things drifting down over the ring (confetti, petals, ribbons):
// one instanced mesh, each piece circling slowly, swaying and tumbling as it
// falls from base + span back to base, then wrapping to the top again.
// Pieces passing within a few metres of the camera shrink away instead of
// filling the screen.
export function fallingFlakes({ geometry, colors, count = 140, radius, base = 2, span = 14,
  speed = 0.25, speedStep = 0.08, spin = 0.6, spinStep = 0.25, sway = 0.4, swirl = 0.03, tumble = 0.7 }) {
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), count);
  mesh.frustumCulled = false;
  const pieces = [], color = new THREE.Color(), euler = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    pieces.push({ a: i * 2.39996, r: 3 + (i * 7.3) % radius, y: (i * 3.7) % span, speed: speed + (i % 5) * speedStep, spin: spin + (i % 7) * spinStep });
    mesh.setColorAt(i, color.set(colors[i % colors.length]));
  }
  const update = (time, eye = null) => {
    pieces.forEach((s, i) => {
      const y = base + ((s.y + span - time * s.speed) % span + span) % span, a = s.a + time * swirl;
      transform.position.set(Math.cos(a) * s.r + Math.sin(time * 0.7 + i) * sway, y, Math.sin(a) * s.r + Math.cos(time * 0.55 + i) * sway * 0.5);
      transform.rotation.copy(euler.set(time * s.spin + i, time * s.spin * tumble, i));
      transform.scale.setScalar(eye ? smoothstep(1.5, 4, transform.position.distanceTo(eye)) : 1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}

// Obstacle props: a group per obstacle with its own transparent-capable
// materials, faded when it hides the local fighter from the camera.
export function createProp(kit, obstacle) {
  const prop = new THREE.Group(), materials = [], cache = new Map();
  prop.position.set(obstacle.x, 0, obstacle.z);
  if (obstacle.kind === 'wall') prop.rotation.y = -obstacle.angle;
  const own = (color, extra = {}) => {
    const key = `${color}|${JSON.stringify(extra)}`;
    if (!cache.has(key)) {
      const mat = kit.material(color, { transparent: true, ...extra });
      materials.push(mat); cache.set(key, mat);
    }
    return cache.get(key);
  };
  return { obstacle, prop, materials, own, batch: createBatch(), opacity: 1 };
}

export function finishProp(group, entry) {
  entry.batch.build(entry.prop);
  delete entry.batch; delete entry.own;
  group.add(entry.prop);
  return entry;
}

// Fades a prop that hides the camera's focus or either fighter (positions
// { x, y, z } at body height, see FIGHTER_CENTRE).
const fadeFocus = new THREE.Vector3();
export function fadeProps(props, dt, camera, focus, fighters = null) {
  const blocks = (obstacle, point) => obstacleBlocksSegment(obstacle, camera.position, point, 0.35);
  for (const entry of props) {
    const hidden = camera ? (focus ? blocks(entry.obstacle, fadeFocus.copy(focus)) : false)
      || (fighters ?? []).some(p => p && blocks(entry.obstacle, fadeFocus.set(p.x, p.y + FIGHTER_CENTRE, p.z))) : false;
    const target = hidden ? 0.28 : 1;
    entry.opacity += (target - entry.opacity) * (1 - Math.exp(-10 * dt));
    for (const mat of entry.materials) { mat.opacity = entry.opacity; mat.depthWrite = entry.opacity > 0.95; }
    entry.prop.traverse(object => { if (object.userData.outline) object.visible = entry.opacity > 0.95; });
  }
}

// ------------------------------------------------------- see-through ---
// Big merged occluders (rims, walls, stands) cannot fade per object, so their
// materials are patched to cut a soft hole where they hide a fighter: for
// each of up to two targets, fragments inside a cone round the segment from
// the camera to the fighter's body (radius `near` at the camera growing to
// `far` at the fighter, a little taller than wide) are discarded, with an
// ordered-dither (screen-door) falloff at the edge and a strength that ramps
// in and out over `fade` seconds. The cone stops `stop` metres short of the
// fighter, so nothing at or behind them is cut. Only the colour pass is
// patched: shadow and depth passes use three's own depth materials, so
// shadows stay solid.
export const FIGHTER_CENTRE = 0.3; // body centre above a fighter's p.y (p.y rests at 0.59)
const SEE_DEFINE = 'SEE_THROUGH';
const SEE_VERTEX = `
  vec4 seeWorld = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    seeWorld = batchingMatrix * seeWorld;
  #endif
  #ifdef USE_INSTANCING
    seeWorld = instanceMatrix * seeWorld;
  #endif
  vSeeWorld = ( modelMatrix * seeWorld ).xyz;`;
const SEE_FRAGMENT_HEAD = `
  uniform vec3 seeCamera;
  uniform vec3 seeTargets[ 2 ];
  uniform vec2 seeStrength;
  uniform vec3 seeShape; // near radius, far radius, stop short of the target
  varying vec3 vSeeWorld;
  // 4x4 ordered (Bayer) threshold in (0, 1) from two nested 2x2 levels.
  float seeBayer( vec2 p ) {
    vec2 q = mod( floor( p ), 4.0 ), a = mod( q, 2.0 ), b = floor( q / 2.0 );
    float low = 2.0 * a.x + 3.0 * a.y - 4.0 * a.x * a.y, high = 2.0 * b.x + 3.0 * b.y - 4.0 * b.x * b.y;
    return ( 4.0 * low + high + 0.5 ) / 16.0;
  }
  float seeCut( vec3 target, float strength ) {
    vec3 axis = target - seeCamera;
    float len = length( axis );
    if ( strength <= 0.0 || len < 0.5 ) return 0.0;
    vec3 dir = axis / len, rel = vSeeWorld - seeCamera;
    float along = dot( rel, dir );
    float radius = mix( seeShape.x, seeShape.y, clamp( along / len, 0.0, 1.0 ) );
    vec3 off = rel - dir * along;
    off.y *= 0.78;
    float inside = 1.0 - smoothstep( radius * 0.6, radius, length( off ) );
    float span = smoothstep( 0.05, 0.35, along ) * ( 1.0 - smoothstep( len - seeShape.z - 0.3, len - seeShape.z, along ) );
    return strength * inside * span;
  }`;
const SEE_FRAGMENT = `
  #ifdef ${SEE_DEFINE}
    float seeAmount = max( seeCut( seeTargets[ 0 ], seeStrength.x ), seeCut( seeTargets[ 1 ], seeStrength.y ) );
    if ( seeAmount > seeBayer( gl_FragCoord.xy ) ) discard;
  #endif`;

export function seeThroughUniforms({ near = 0.25, far = 1.2, stop = 0.4 } = {}) {
  return {
    seeCamera: { value: new THREE.Vector3() },
    seeTargets: { value: [new THREE.Vector3(), new THREE.Vector3()] },
    seeStrength: { value: new THREE.Vector2() },
    seeShape: { value: new THREE.Vector3(near, far, stop) },
  };
}

// Patch a material (in place) to read the shared see-through uniforms.
export function seeThrough(material, uniforms) {
  if (material.userData.seeThrough) return material;
  const previous = material.onBeforeCompile;
  material.defines = { ...(material.defines ?? {}), [SEE_DEFINE]: '' };
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec3 vSeeWorld;\n' + shader.vertexShader
      .replace('#include <project_vertex>', '#include <project_vertex>\n' + SEE_VERTEX);
    shader.fragmentShader = SEE_FRAGMENT_HEAD + '\n' + shader.fragmentShader
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + SEE_FRAGMENT);
  };
  // Never share a compiled program with an unpatched twin.
  material.customProgramCacheKey = () => 'see-through-v1';
  material.userData.seeThrough = true;
  material.needsUpdate = true;
  return material;
}

// One arena's see-through state: patch(material) and an ink-outline twin,
// and update(dt, camera, fighters) to aim the cut at both fighters. `solid`
// (x, y, z) → true inside the patched occluders: a fighter's hole only opens
// while a sight line from the camera to its feet, body or head passes
// through them (without it the hole is always armed).
export function createSeeThrough({ solid = null, fade = 0.15, ...shape } = {}) {
  const uniforms = seeThroughUniforms(shape), strengths = [0, 0];
  const point = new THREE.Vector3();
  const hidden = (eye, p) => {
    if (!solid) return true;
    for (const dy of [-0.45, FIGHTER_CENTRE, 1.1]) {
      point.set(p.x, p.y + dy, p.z);
      // Steps of about 8 cm, so even a thin wall is never stepped over.
      const len = eye.distanceTo(point), end = 1 - Math.min(0.9, uniforms.seeShape.value.z / Math.max(len, 1e-3)), steps = Math.ceil(len / 0.08);
      for (let i = 1; i <= steps; i++) {
        const t = i / steps * end;
        if (solid(eye.x + (point.x - eye.x) * t, eye.y + (point.y - eye.y) * t, eye.z + (point.z - eye.z) * t)) return true;
      }
    }
    return false;
  };
  const update = (dt, camera, fighters) => {
    const eye = camera?.position;
    if (eye) uniforms.seeCamera.value.copy(eye);
    for (let i = 0; i < 2; i++) {
      const p = eye && fighters?.[i];
      if (p) uniforms.seeTargets.value[i].set(p.x, p.y + FIGHTER_CENTRE, p.z);
      const target = p && hidden(eye, p) ? 1 : 0, step = Math.max(0, dt) / fade;
      strengths[i] = target > strengths[i] ? Math.min(target, strengths[i] + step) : Math.max(target, strengths[i] - step);
      // Without fighters (title orbit, previews) the cut is simply off.
      if (!p) strengths[i] = 0;
    }
    uniforms.seeStrength.value.set(strengths[0], strengths[1]);
  };
  return { uniforms, update, patch: material => seeThrough(material, uniforms), ink: () => seeThrough(INK.clone(), uniforms) };
}


// Collision-aware scenery layout. Every footprint is a circle on the ground
// plane; keep-out zones are circles { x, z, r }, capsules { ax, az, bx, bz, r }
// (roads, aqueducts, docks), annuli { rMin, rMax } (walls, shorelines) or
// predicates { test(x, z, r) }. Nothing is accepted that overlaps a zone or
// an earlier footprint, so instances never grow out of one another.
export function createLayout() {
  const placed = [], zones = [];
  const inZone = (zone, x, z, r) => {
    if (zone.test) return zone.test(x, z, r);
    if (zone.rMin !== undefined) {
      const d = Math.hypot(x - (zone.x ?? 0), z - (zone.z ?? 0));
      return d + r > zone.rMin && d - r < zone.rMax;
    }
    if (zone.ax !== undefined) {
      const dx = zone.bx - zone.ax, dz = zone.bz - zone.az, t = clamp01(((x - zone.ax) * dx + (z - zone.az) * dz) / (dx * dx + dz * dz || 1));
      return Math.hypot(x - zone.ax - dx * t, z - zone.az - dz * t) < zone.r + r;
    }
    return Math.hypot(x - zone.x, z - zone.z) < zone.r + r;
  };
  const fits = (x, z, r, gap = 0.2) => !zones.some(zone => inZone(zone, x, z, r))
    && placed.every(p => (x - p.x) ** 2 + (z - p.z) ** 2 >= (p.r + r + gap) ** 2);
  const add = (x, z, r) => { placed.push({ x, z, r }); };
  const take = (x, z, r, gap) => { if (!fits(x, z, r, gap)) return false; add(x, z, r); return true; };
  const block = zone => { zones.push(zone); };
  return { fits, add, take, block, placed };
}

// Lowest and highest ground under a circular footprint (centre plus a ring).
export function groundUnder(height, x, z, r, samples = 8) {
  let min = height(x, z), max = min;
  for (let i = 0; i < samples; i++) {
    const a = i / samples * TAU;
    for (const k of [0.55, 1]) {
      const y = height(x + Math.cos(a) * r * k, z + Math.sin(a) * r * k);
      if (y < min) min = y; if (y > max) max = y;
    }
  }
  return { min, max };
}

// Try sites around a preferred spot until one fits the layout and the ground
// under it is level enough; the footprint is then reserved.
// `base` is the radius whose ground must be level (defaults to most of r).
export function findSite(layout, height, random, { angle, distance, spread = 0.2, depth = 8, r, base = r * 0.8, slope = 1, tries = 80 }) {
  for (let i = 0; i < tries; i++) {
    const k = i / tries, a = angle + (random() - 0.5) * spread * (0.3 + k), d = distance + (random() - 0.5) * depth * (0.3 + k);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (!layout.fits(x, z, r, 0.4)) continue;
    const ground = groundUnder(height, x, z, base);
    if (ground.max - ground.min > slope) continue;
    layout.add(x, z, r);
    return { x, z, a, ground };
  }
  return null;
}

// Chunky low-poly stone: a noisy superellipsoid normalised to [-1, 1] on
// every axis (so instance scale = half extents). `power` 2 is round, 3-4 is
// a rounded block; `cylinder` keeps the plan circular (standing stones).
export function pebbleGeometry({ seed = 1, detail = 1, power = 2.6, roughness = 0.3, flatBase = 0.35, cylinder = false } = {}) {
  const geometry = new THREE.IcosahedronGeometry(1, detail), pos = geometry.attributes.position, noise = createNoise(seed);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = power;
    const norm = cylinder ? Math.pow(Math.pow(Math.hypot(x, z), n) + Math.pow(Math.abs(y), n), 1 / n)
      : Math.pow(Math.pow(Math.abs(x), n) + Math.pow(Math.abs(y), n) + Math.pow(Math.abs(z), n), 1 / n);
    x /= norm; y /= norm; z /= norm;
    const bump = 1 + (noise(x * 1.7 + y * 1.1 + seed * 0.37, z * 1.7 - y * 0.9) - 0.5) * roughness;
    x *= bump; z *= bump; y *= cylinder ? 1 : bump;
    if (y < -1 + flatBase) y = -1 + flatBase + (y + 1 - flatBase) * 0.25;
    pos.setXYZ(i, x, y, z);
  }
  geometry.computeBoundingBox();
  const box = geometry.boundingBox, centre = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z).scale(2 / size.x, 2 / size.y, 2 / size.z);
  geometry.computeVertexNormals();
  return geometry;
}

// ------------------------------------------------------ distant scenery ---
// Aerial perspective is baked: far layers are unlit, unfogged meshes whose
// vertex colours already fade towards the haze colour (which matches the fog
// and the sky's horizon), so each skin controls exactly how its distance
// dissolves. Mist rings veil the feet of each layer.

// Seamless fbm round the horizon: f(angle) in [0, 1].
export function horizonNoise(seed = 1) {
  const noise = createNoise(seed);
  return (a, scale = 1, octaves = 4, offset = 0) => noise.fbm(Math.cos(a) * scale + 40 + offset, Math.sin(a) * scale + 40 - offset, octaves);
}

// A mountain range as a ring: a front slope rising from a buried foot to the
// ridgeline height(a) at `radius`, and a back slope falling away behind it,
// so it reads as a range from the aerial views too. Colours run from `body`
// on the slopes to `ridge` along the crest, take a soft baked sun (`shade`)
// and fade into `haze` by `fade` overall and fully below `mistTop`.
export function ridgeRange({ radius, height, depth = 22, back = 0.6, foot = -3, segments = 240, rows = 5, arc = [0, TAU],
  colors, haze, fade = 0, mistBase = foot, mistTop = 6, crest = [0.62, 1], shade = null, tint = null }) {
  const positions = [], vertexColors = [], indices = [], hazeColor = new THREE.Color(haze), body = new THREE.Color(colors.body), ridge = new THREE.Color(colors.ridge);
  const color = new THREE.Color(), sun = shade ? new THREE.Vector3(...shade.direction).normalize() : null;
  const profile = [], backRows = Math.ceil(rows / 2);
  for (let i = 0; i <= rows; i++) profile.push({ t: i / rows, front: true });
  for (let i = 1; i <= backRows; i++) profile.push({ t: 1 - i / backRows, front: false });
  const [a0, a1] = arc, row = profile.length;
  for (let j = 0; j <= segments; j++) {
    const a = a0 + (a1 - a0) * j / segments, c = Math.cos(a), s = Math.sin(a), h = height(a);
    for (const p of profile) {
      const k = Math.pow(p.t, 1.45), r = p.front ? radius - depth * (1 - p.t) : radius + depth * back * (1 - p.t);
      positions.push(c * r, foot + (h - foot) * k, s * r);
    }
  }
  for (let j = 0; j < segments; j++) for (let i = 0; i < row - 1; i++) {
    const a = j * row + i, b = a + 1, d = a + row, e = d + 1;
    indices.push(a, d, b, b, d, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const pos = geometry.attributes.position, normal = geometry.attributes.normal, n = new THREE.Vector3();
  for (let v = 0; v < pos.count; v++) {
    const j = Math.floor(v / row), p = profile[v % row], a = a0 + (a1 - a0) * j / segments, y = pos.getY(v);
    color.copy(body).lerp(ridge, smoothstep(crest[0], crest[1], p.t));
    if (tint) tint(color, a, p.t, y);
    if (sun) {
      n.fromBufferAttribute(normal, v);
      color.multiplyScalar(1 - shade.amount + shade.amount * 1.3 * smoothstep(-0.45, 0.9, n.dot(sun)));
    }
    color.lerp(hazeColor, fade);
    color.lerp(hazeColor, 1 - smoothstep(mistBase, mistTop, y));
    vertexColors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }));
  mesh.name = 'ridge-range';
  return mesh;
}

// Several ranges (ridgeRange options each) merged into one draw call.
export function ridgeRanges(layers, name = 'ridge-ranges') {
  const meshes = layers.map(options => ridgeRange(options));
  const mesh = new THREE.Mesh(mergeGeometries(meshes.map(m => m.geometry)), meshes[0].material);
  for (const m of meshes) m.geometry.dispose();
  mesh.name = name;
  return mesh;
}

// Soft horizontal wisps (white, alpha) that tile round a mist ring.
let wispTexture = null;
export function mistTexture() {
  if (wispTexture || typeof document === 'undefined') return wispTexture;
  const w = 512, h = 128, noise = createNoise(91);
  wispTexture = canvasTexture(w, c => {
    const image = c.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w * TAU, v = y / h;
      const n = noise.fbm(Math.cos(u) * 2.2 + v * 0.9, Math.sin(u) * 2.2 + v * 3.4, 5);
      const i = (y * w + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(255 * (0.4 + 0.6 * smoothstep(0.3, 0.72, n)));
    }
    c.putImageData(image, 0, 0);
  }, 1, h);
  wispTexture.wrapS = THREE.RepeatWrapping;
  return wispTexture;
}

// A ring of drifting mist: a band from (radius, y0) out to (radius + spread,
// y1). 'foot' mist is densest at its buried bottom and thins upwards (fog
// pooled at the foot of hills or over water); 'band' mist is a floating
// cloud-belt, clear at both edges. Density varies round the ring.
export function mistRing({ radius, spread = 0, y0, y1, color, opacity = 0.6, profile = 'foot', segments = 160, rows = 6,
  seed = 1, patchiness = 0.55, repeat = 5, speed = 0.004, arc = [0, TAU] }) {
  const along = horizonNoise(seed), base = new THREE.Color(color), [a0, a1] = arc, partial = a1 - a0 < TAU - 1e-3;
  const positions = [], colors = [], uvs = [], indices = [];
  for (let j = 0; j <= segments; j++) {
    const a = a0 + (a1 - a0) * j / segments, c = Math.cos(a), s = Math.sin(a), u = j / segments;
    const density = (1 - patchiness + patchiness * smoothstep(0.3, 0.68, along(a, 2.6))) * (partial ? smoothstep(0, 0.15, u) * smoothstep(1, 0.85, u) : 1);
    for (let i = 0; i <= rows; i++) {
      const v = i / rows, r = radius + spread * v, y = y0 + (y1 - y0) * v;
      const shape = profile === 'foot' ? Math.pow(1 - smoothstep(0.04, 1, v), 1.5) : Math.pow(Math.sin(Math.PI * v), 1.6);
      positions.push(c * r, y, s * r);
      colors.push(base.r, base.g, base.b, opacity * shape * density);
      uvs.push((a - a0) / TAU * repeat, v);
    }
  }
  const row = rows + 1;
  for (let j = 0; j < segments; j++) for (let i = 0; i < rows; i++) {
    const a = j * row + i;
    indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: mistTexture(), vertexColors: true, transparent: true,
    depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false }));
  mesh.name = 'mist';
  mesh.frustumCulled = false;
  mesh.userData.speed = speed;
  return mesh;
}

// Several mist rings drawn far to near, each drifting at its own speed.
export function mistLayers(list) {
  const group = new THREE.Group();
  group.name = 'mist-layers';
  const rings = [...list].sort((a, b) => b.radius - a.radius).map((options, i) => {
    const ring = mistRing(options);
    ring.renderOrder = 3 + i;
    group.add(ring);
    return ring;
  });
  return { group, update(dt) { for (const ring of rings) ring.rotation.y += ring.userData.speed * dt; } };
}

// A grove of round crowns merged into one soft canopy mass, with short
// trunks under the crowns (or one central trunk). Crowns shade from a dark,
// cool underside to a sunlit top. `cone` > 0 makes pointed crowns of that
// height/radius ratio.
export function canopyGeometry({ seed = 1, crowns = 5, spread = 2.4, radius = 1.2, top = 0x9cc27e, under = 0x55785a,
  trunk = 0x7a5a3e, trunkHeight = 1.2, detail = [10, 7], squash = 0.9, cone = 0, lift = 0.5, oneTrunk = false }) {
  const random = seeded(seed), parts = [], cTop = new THREE.Color(top), cUnder = new THREE.Color(under), cTrunk = new THREE.Color(trunk), c = new THREE.Color();
  for (let i = 0; i < crowns; i++) {
    const a = i / crowns * TAU + random() * 0.8, d = i === 0 ? 0 : spread * (0.3 + random() * 0.35);
    const r = radius * (i === 0 ? 1.12 : 0.72 + random() * 0.32);
    const tall = cone > 0 ? r * cone * 0.3 : r * squash * 0.8;
    const s = { x: Math.cos(a) * d, z: Math.sin(a) * d, r, y: trunkHeight + tall + (i === 0 ? lift : random() * lift * 0.6) };
    if (trunkHeight > 0 && (i === 0 || !oneTrunk)) {
      const t = new THREE.CylinderGeometry(0.07 * r + 0.05, 0.12 * r + 0.07, s.y, 6).translate(s.x, s.y / 2 - 0.1, s.z);
      parts.push(paintBy(t, () => cTrunk));
    }
    const crown = cone > 0 ? new THREE.ConeGeometry(r, r * cone, detail[0], 4).translate(0, r * cone * 0.2, 0)
      : new THREE.SphereGeometry(r, detail[0], detail[1]).scale(1, squash, 1);
    crown.translate(s.x, s.y, s.z);
    parts.push(paintBy(crown, (x, y, z, nx, ny) => c.copy(cUnder).lerp(cTop, smoothstep(-0.7, 0.8, ny) * 0.7 + smoothstep(s.y - r, s.y + r * 0.7, y) * 0.3)));
  }
  const merged = mergeGeometries(parts.map(g => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  for (const g of parts) g.dispose();
  return merged;
}

function paintBy(geometry, colorAt) {
  const pos = geometry.attributes.position, normal = geometry.attributes.normal, colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    colorAt(pos.getX(i), pos.getY(i), pos.getZ(i), normal.getX(i), normal.getY(i), normal.getZ(i)).toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

// ------------------------------------------------- painted backdrops ---
// Shader-painted distant scenery: gradients, mist and brush texture are
// worked out per pixel, so silhouettes stay crisp while every wash is smooth
// (no vertex-colour banding). All of it is unlit and unfogged like the sky.

// Hash-based 3D value noise and fbm, shared by the painted shaders.
export const NOISE_GLSL = `
  float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
  float vnoise(vec3 p) {
    vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1.0, 0.0, 0.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), u.x), mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
  }
  float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec3(17.1, -9.7, 4.3); a *= 0.5; } return s / 0.9375; }
`;

// A three-stop sky (horizon, mid, zenith) with a soft, feathered sun disc
// and glow, and faint streaks of high cloud. Like skyDome it follows the
// camera and is not tone mapped, so a matching fog/haze colour melts into
// its horizon.
export function paintedSky({ top, mid, horizon, sunDirection = [-0.5, 0.3, 0.4], sunColor = 0xfff0d8, glow = 0.3, disc = 0.6,
  discSize = 0.012, clouds = 0.25, cloudColor = 0xffffff, radius = 200 }) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, horizon: { value: new THREE.Color(horizon) },
      sunDir: { value: new THREE.Vector3(...sunDirection).normalize() }, sunColor: { value: new THREE.Color(sunColor) },
      glow: { value: glow }, disc: { value: disc }, discSize: { value: discSize }, clouds: { value: clouds }, cloudColor: { value: new THREE.Color(cloudColor) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;
      uniform float glow; uniform float disc; uniform float discSize; uniform float clouds; uniform vec3 cloudColor;
      varying vec3 vDir;
      ${NOISE_GLSL}
      void main(){
        vec3 d = normalize(vDir);
        float h = max(d.y, 0.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.12, 0.75, h));
        // High cloud streaks, stretched along one axis.
        vec2 q = d.xz / (h + 0.12);
        float c = fbm(vec3(q.x * 0.55, q.y * 1.9, 3.0));
        col = mix(col, cloudColor, smoothstep(0.52, 0.78, c) * smoothstep(0.03, 0.14, h) * smoothstep(0.7, 0.2, h) * clouds);
        float s = max(dot(d, sunDir), 0.0), r = acos(min(s, 1.0));
        col += sunColor * (pow(s, 6.0) * glow * 0.6 + pow(s, 48.0) * glow + (1.0 - smoothstep(discSize * 0.55, discSize, r)) * disc);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 20), material);
  dome.name = 'sky';
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  dome.onBeforeRender = (renderer, scene, camera) => {
    dome.position.setFromMatrixPosition(camera.matrixWorld);
    dome.updateMatrixWorld();
  };
  return dome;
}

// Painted mountain ranges, merged into one draw call. Each layer is a sheet
// leaning back from a buried foot to its ridgeline height(a) at `radius`.
// Per pixel: `colors.body` low on the slopes washes up to `colors.ridge`
// along the crest, a soft sun side and shadow side follow each slope,
// dry-brush streaks (and `stipple` tree dots) texture the face, and below a
// wavy, feathered mist line mist(a) the range dissolves into `haze`; `fade`
// hazes the whole layer for distance.
export function paintedRanges(layers, { haze, sun = [0, 1, 0], light = 0.16, name = 'painted-ranges' } = {}) {
  const positions = [], inks = [], bodies = [], params = [], extras = [], indices = [];
  const sunDir = new THREE.Vector3(...sun).normalize(), n = new THREE.Vector3(), ink = new THREE.Color(), body = new THREE.Color();
  for (const layer of layers) {
    const { radius, depth = 18, height, foot = -6, segments = 480, rows = 3, arc = [0, TAU], mist, fade = 0, colors, stipple = 0, streaks = 0.3, feather = 0.4 } = layer;
    ink.set(colors.ridge); body.set(colors.body);
    const base = positions.length / 3, row = rows + 1, [a0, a1] = arc;
    for (let j = 0; j <= segments; j++) {
      const a = a0 + (a1 - a0) * j / segments, h = height(a), c = Math.cos(a), s = Math.sin(a), da = 0.003;
      const slope = (height(a + da) - height(a - da)) / (2 * da * radius);
      // Inward face tilted down the local slope, lit by the sun.
      n.set(-c + s * slope, 0.45, -s - c * slope).normalize();
      const lit = n.dot(sunDir), mistY = typeof mist === 'function' ? mist(a) : mist;
      for (let i = 0; i <= rows; i++) {
        const t = i / rows, k = Math.pow(t, 1.45), r = radius - depth * (1 - t);
        positions.push(c * r, foot + (h - foot) * k, s * r);
        inks.push(ink.r, ink.g, ink.b); bodies.push(body.r, body.g, body.b);
        params.push(h, mistY, fade, lit); extras.push(stipple, streaks, feather);
      }
    }
    for (let j = 0; j < segments; j++) for (let i = 0; i < rows; i++) {
      const a = base + j * row + i, b = a + 1, d = a + row, e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aInk', new THREE.Float32BufferAttribute(inks, 3));
  geometry.setAttribute('aBody', new THREE.Float32BufferAttribute(bodies, 3));
  geometry.setAttribute('aRange', new THREE.Float32BufferAttribute(params, 4));
  geometry.setAttribute('aBrush', new THREE.Float32BufferAttribute(extras, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const material = new THREE.ShaderMaterial({
    fog: false, toneMapped: false,
    uniforms: { haze: { value: new THREE.Color(haze) }, light: { value: light } },
    vertexShader: `attribute vec3 aInk; attribute vec3 aBody; attribute vec4 aRange; attribute vec3 aBrush;
      varying vec3 vInk; varying vec3 vBody; varying vec4 vRange; varying vec3 vBrush; varying vec3 vWorld;
      void main() {
        vInk = aInk; vBody = aBody; vRange = aRange; vBrush = aBrush;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `uniform vec3 haze; uniform float light;
      varying vec3 vInk; varying vec3 vBody; varying vec4 vRange; varying vec3 vBrush; varying vec3 vWorld;
      ${NOISE_GLSL}
      void main() {
        float y = vWorld.y, crest = vRange.x, mistY = vRange.y, span = max(crest - mistY, 3.0);
        float t = clamp((y - mistY) / span, 0.0, 1.0);
        float wash = fbm(vWorld * vec3(0.05, 0.03, 0.05));
        vec3 col = mix(vBody, vInk, smoothstep(0.05, 1.0, t + (wash - 0.5) * 0.5));
        // Sun side and shadow side, strongest up the slope.
        float fold = fbm(vWorld * vec3(0.09, 0.05, 0.09) + 7.0) - 0.5;
        col *= 1.0 + (vRange.w + fold * 0.8) * light * smoothstep(0.0, 0.5, t);
        // Dry-brush streaks running down from the crest, and tree stipple.
        float streak = vnoise(vWorld * vec3(0.32, 0.045, 0.32));
        col = mix(col, vInk * 0.82, smoothstep(0.55, 0.85, streak) * vBrush.y * smoothstep(0.2, 0.9, t));
        float dots = vnoise(vWorld * 1.3) * 0.7 + vnoise(vWorld * 0.35) * 0.3;
        col = mix(col, vInk * 0.8, smoothstep(0.6, 0.78, dots) * vBrush.x * 0.75 * smoothstep(0.1, 0.6, t));
        // Wavy, feathered mist line; the whole layer hazes with distance.
        float wisp = fbm(vWorld * vec3(0.03, 0.16, 0.03) + vec3(3.0, 0.0, 1.0));
        float feather = span * vBrush.z;
        float m = smoothstep(mistY - feather * 0.4, mistY + feather, y + (wisp - 0.5) * feather * 1.6);
        col = mix(haze, col, m);
        col = mix(col, haze, vRange.z);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  return mesh;
}

// Feathered mist: rings of drifting cloud whose alpha comes from world-space
// fbm, so wisps break up and dissolve with no hard edge anywhere. `foot`
// mist is densest at its buried bottom and thins upwards; `band` mist is a
// floating belt clear at both edges; `cover` (0..1) sets how much of the
// ring is cloud. All rings share one draw call, drawn far to near;
// update(dt) drifts the wisps.
export function featherMist(list, { name = 'feather-mist' } = {}) {
  const positions = [], colors = [], shapes = [], indices = [], color = new THREE.Color();
  for (const options of [...list].sort((a, b) => b.radius - a.radius)) {
    const { radius, spread = 0, y0, y1, opacity = 0.6, profile = 'foot', segments = 128, rows = 5, scale = 1, cover = 0.5, arc = [0, TAU] } = options;
    color.set(options.color);
    const [a0, a1] = arc, partial = a1 - a0 < TAU - 1e-3, base = positions.length / 3, row = rows + 1;
    for (let j = 0; j <= segments; j++) {
      const u = j / segments, a = a0 + (a1 - a0) * u, c = Math.cos(a), s = Math.sin(a);
      const ends = partial ? smoothstep(0, 0.15, u) * smoothstep(1, 0.85, u) : 1;
      for (let i = 0; i <= rows; i++) {
        const v = i / rows, r = radius + spread * v, y = y0 + (y1 - y0) * v;
        const shape = profile === 'foot' ? Math.pow(1 - smoothstep(0.02, 1, v), 1.6) : Math.pow(Math.sin(Math.PI * v), 1.5);
        positions.push(c * r, y, s * r);
        colors.push(color.r, color.g, color.b, opacity * shape * ends);
        shapes.push(scale, cover);
      }
    }
    for (let j = 0; j < segments; j++) for (let i = 0; i < rows; i++) {
      const a = base + j * row + i;
      indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setAttribute('aShape', new THREE.Float32BufferAttribute(shapes, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `attribute vec4 color; attribute vec2 aShape; varying vec4 vColor; varying vec2 vShape; varying vec3 vWorld;
      void main() {
        vColor = color; vShape = aShape;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `uniform float time; varying vec4 vColor; varying vec2 vShape; varying vec3 vWorld;
      ${NOISE_GLSL}
      void main() {
        vec3 q = vWorld * vec3(0.024, 0.11, 0.024) * vShape.x + vec3(time * 0.021, 0.0, time * 0.013);
        float w = fbm(q);
        float cover = vShape.y;
        float a = vColor.a * smoothstep(0.62 - cover * 0.5, 0.95 - cover * 0.5, w);
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor.rgb, a);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  return { mesh, update(dt) { material.uniforms.time.value += dt; } };
}
