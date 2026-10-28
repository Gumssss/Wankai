// Upright bodies + two angular degrees of freedom per staff.
// Contact impulses use the staff Jacobian: rotation and translation respond
// together. No locomotion force is added by the input controller.
import {CHARACTERS} from './character-catalog.js';
import {normalizeLoadout} from './loadouts.js';
import { obstacleContact } from './arena-obstacles.js';
import { SKILLS, skillFor } from './skills.js';
import { ARENA_PROFILE, arenaPlacement } from './arena-profile.js';
export const CONFIG = Object.freeze({
  step: 1 / 180,
  arenaRadius: ARENA_PROFILE.radius,
  // Distance from the body pivot to the floating staff's inner end. This clears
  // the entire head (0.76 + 0.4) even when the staff points straight upward.
  staffOffset: 1.35,
  staffLength: 2.00,
  staffRadius: 0.085,
  bodyRadius: 0.38,
  bodyFloor: 0.59,
  gravity: 19,
  mass: 1.2,
  // Preserve ground-driving leverage after moving the same-length staff outward.
  inertia: 4.1,
  damping: 1.15,
  motorAcceleration: 24,
  polarBrakeAcceleration: 30,
  maxAngularSpeed: 4.25,
  // Sample weapon contact paths within the 180 Hz tick without changing the
  // existing ground solver's timestep or adding a forgiving collision margin.
  contactTravelFraction: 0.5,
  maxContactSubsteps: 64,
  grip: 1.28,
  maxHealth: 100,
  turnDamageScale: 0.5,
  // The body turns toward the view direction at a bounded rate, so hurt
  // capsules never jump and both networked ends integrate the same motion.
  bodyTurnRate: 12,
  // Thrown takeout bags fall a little slower than fighters so the arc reads.
  projectileGravity: 13,
});
export const STAMINA = Object.freeze({
  max: 200,
  swingDrain: 12,
  turnDrain: 5,
  recoveryDelay: 0.5,
  recoveryRate: 60,
  lowThreshold: 25,
  minPower: 0.4,
});
export const CLASH = Object.freeze({
  minSpeed: 2.5,
  fullSpeed: 12,
  cooldown: 0.18,
  separationDelay: 0.05,
  minRecoilSpeed: 1.8,
  maxRecoilSpeed: 3.2,
});
// Every match uses the enlarged arena; bare physics worlds keep the measured 1x podium.
export const MATCH_ARENA_SCALE = 3;

const capsule = (a, b, radius, damageScale) => Object.freeze({ a: Object.freeze(a), b: Object.freeze(b), radius, ...(damageScale ? { damageScale } : {}) });
const weapon = ({ colliders, ...stats }) => Object.freeze({ ...stats, radius: colliders[0].radius, colliders: Object.freeze(colliders) });

// Floating weapons in their local frame: +Y runs from the butt (at `offset`
// from the body pivot) to the tip, +X is the leading side of a W swing. The
// models in models/weapons.js are built on exactly these capsules.
export const WEAPONS = Object.freeze({
  'yellow-staff': weapon({ length: 1.8, offset: 1.25, inertia: 3.5, motorAcceleration: 28, brakeAcceleration: 36, maxAngularSpeed: 5,
    colliders: [capsule([0, .115, 0], [0, 1.685, 0], .115)] }),
  'takeout-box': weapon({ length: 0.85, offset: 1.5, inertia: 4.4, motorAcceleration: 24, brakeAcceleration: 30, maxAngularSpeed: 4.4,
    // The insulated box itself floats beside 肥嘟嘟 — no handle — as two
    // stacked rounded slabs across its width.
    colliders: [capsule([0, .25, -.1], [0, .25, .1], .3, 1.15), capsule([0, .55, -.1], [0, .55, .1], .3, 1.15)] }),
  sword: weapon({ length: 1.45, offset: 1.2, inertia: 2.8, motorAcceleration: 38, brakeAcceleration: 48, maxAngularSpeed: 6.1,
    colliders: [capsule([0, 0, 0], [0, 1.45, 0], .09), capsule([-.105, .425, 0], [.115, .425, 0], .045)] }),
  polearm: weapon({ length: 2.16, offset: CONFIG.staffOffset, inertia: CONFIG.inertia, motorAcceleration: CONFIG.motorAcceleration,
    brakeAcceleration: CONFIG.polarBrakeAcceleration, maxAngularSpeed: CONFIG.maxAngularSpeed,
    // Shaft, the broad crescent blade, its back-curving tip and the rear barb.
    colliders: [capsule([0, 0, 0], [0, 1.42, 0], .065), capsule([.07, 1.42, 0], [.1, 1.8, 0], .12, 1.1),
      capsule([.09, 1.8, 0], [-.01, 2.08, 0], .08, 1.1), capsule([-.04, 1.52, 0], [-.17, 1.62, 0], .045)] }),
  hammer: weapon({ length: 1.9, offset: 1.3, inertia: 5.8, motorAcceleration: 18, brakeAcceleration: 22, maxAngularSpeed: 3.4,
    // Shaft, the cross-mounted head (flat face forward), rear pick and top spike.
    colliders: [capsule([0, .08, 0], [0, 1.62, 0], .075), capsule([-.24, 1.52, 0], [.3, 1.52, 0], .17, 1.3),
      capsule([-.24, 1.52, 0], [-.5, 1.45, 0], .07, 1.3), capsule([0, 1.62, 0], [0, 1.85, 0], .05)] }),
  axe: weapon({ length: 1.8, offset: 1.25, inertia: 4.6, motorAcceleration: 22, brakeAcceleration: 28, maxAngularSpeed: 3.9,
    // Haft, the crescent blade on the leading side, its neck and the back spike.
    colliders: [capsule([0, .05, 0], [0, 1.7, 0], .065), capsule([.31, 1.2, 0], [.33, 1.68, 0], .11, 1.25),
      capsule([.05, 1.44, 0], [.26, 1.44, 0], .09, 1.1), capsule([-.04, 1.44, 0], [-.2, 1.44, 0], .06)] }),
  mace: weapon({ length: 1.84, offset: 1.25, inertia: 5.0, motorAcceleration: 20, brakeAcceleration: 26, maxAngularSpeed: 3.7,
    colliders: [capsule([0, .05, 0], [0, 1.18, 0], .07), capsule([0, 1.4, 0], [0, 1.52, 0], .27, 1.2)] }),
  pan: weapon({ length: 1.52, offset: 1.15, inertia: 2.6, motorAcceleration: 36, brakeAcceleration: 46, maxAngularSpeed: 5.9,
    // Handle, then the round pan as a cross of two capsules in its own plane.
    colliders: [capsule([0, 0, 0], [0, .78, 0], .055), capsule([0, 1.12, -.17], [0, 1.12, .17], .24, .9), capsule([0, .96, 0], [0, 1.28, 0], .24, .9)] }),
  'happy-paws': weapon({ length: 1.0, offset: 1.45, inertia: 4.2, motorAcceleration: 25, brakeAcceleration: 31, maxAngularSpeed: 4.5,
    // 开心小猫's one big paw on a short furry wrist: the wrist, the round
    // palm across the weapon's width (toe beans on the leading face) and the
    // row of four toes at the tip.
    colliders: [capsule([0, .62, -.12], [0, .62, .12], .25, 1.1), capsule([0, .06, 0], [0, .38, 0], .1),
      capsule([.02, .87, -.16], [.02, .87, .16], .13, 1.1)] }),
});

export const characterStats=player=>CHARACTERS[player.characterId] || CHARACTERS.stickman;
export const weaponStats=player=>WEAPONS[player.weapon] || WEAPONS.polearm;

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a) => Math.hypot(a.x, a.y, a.z);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const unit = (a, fallback = v3(1, 0, 0)) => length(a) > 1e-8 ? mul(a, 1 / length(a)) : fallback;
const invMass = 1 / CONFIG.mass;

// A bare weapon id picks its natural character; tests and tools use the shorthand.
const NATURAL_CHARACTER = { 'yellow-staff': 'naiwa', 'takeout-box': 'dudu', 'happy-paws': 'happy-cat' };
const asLoadout = value => typeof value === 'string'
  ? { characterId: NATURAL_CHARACTER[value] || 'stickman', weaponId: value } : value;

export function makePlayer(id, selection = 'polearm') {
  const {characterId,weaponId:weapon}=normalizeLoadout(asLoadout(selection));
  const phi = id === 0 ? 0 : Math.PI;
  return {
    id,
    characterId,
    weapon,
    p: v3(id === 0 ? -2.2 : 2.2, CONFIG.bodyFloor, 0),
    v: v3(),
    // The long polearm starts raised so two fighters can face each other
    // without their weapons overlapping before either player acts.
    theta: weapon === 'sword' ? Math.PI / 2 : 0.4,
    polarInput: 0,
    phi,
    // Body/face yaw, steered toward the player's view.
    bodyYaw: phi,
    wt: 0,
    wp: 0,
    // F skill: skillTime counts down the active effect, skillCooldown the wait.
    skill: skillFor(characterId)?.id ?? null, skillActive: false, skillTime: 0, skillCooldown: 0,
    driveT: 0,
    driveP: 0,
    health: CONFIG.maxHealth,
    stamina: STAMINA.max,
    staminaRestTime: 0,
    grounded: true,
    staffGrounded: false,
    contactSpeed: 0,
    lastAttackAt: -10,
    hitFlash: 0,
  };
}

export const bodyFollowsView = player => !!characterStats(player).bodyFollowsView;
export const fighterHeading = player => bodyFollowsView(player) ? player.bodyYaw : player.phi;

// Step the body toward the view yaw along the shortest arc.
function turnBody(player, faceYaw, dt) {
  if (!Number.isFinite(faceYaw)) return;
  const error = Math.atan2(Math.sin(faceYaw - player.bodyYaw), Math.cos(faceYaw - player.bodyYaw));
  const limit = CONFIG.bodyTurnRate * dt;
  player.bodyYaw += clamp(error, -limit, limit);
}

function recoilFromClash(player, speed) {
  // Back away from the weapon's facing, independent of where the player looks.
  const heading = player.phi;
  const forward = v3(Math.cos(heading), 0, Math.sin(heading));
  // Guarantee a readable backward step, even if the fighter was moving forward.
  // Keep lateral/vertical motion and any already faster backward momentum.
  const correction = Math.max(0, dot(player.v, forward) + speed);
  player.v = sub(player.v, mul(forward, correction));
}

// distance is measured along the solid staff, from its floating inner end.
// The invisible constraint still transmits contact impulses to the body pivot.
export function staffFrame(player, distance = weaponStats(player).length) {
  return weaponPointFrame(player, v3(0, distance, 0));
}

// The broad hammer head needs off-axis contacts. These derivatives use the
// same yaw × pitch rotation as the visible model, including at either pole.
export function weaponPointFrame(player, local) {
  const y = weaponStats(player).offset + local.y;
  const st = Math.sin(player.theta), ct = Math.cos(player.theta);
  const sp = Math.sin(player.phi), cp = Math.cos(player.phi);
  const x = local.x * ct + y * st, z = local.z;
  const r = v3(x * cp - z * sp, -local.x * st + y * ct, x * sp + z * cp);
  const dx = -local.x * st + y * ct;
  const jt = v3(dx * cp, -local.x * ct - y * st, dx * sp);
  const jp = v3(-r.z, 0, r.x);
  return {
    r, jt, jp,
    point: add(player.p, r),
    velocity: add(player.v, add(mul(jt, player.wt), mul(jp, player.wp))),
  };
}

export function weaponSegments(player) {
  const weapon = weaponStats(player);
  const colliders = weapon.colliders || [{ a: [0, 0, 0], b: [0, weapon.length, 0], radius: weapon.radius }];
  return colliders.map(collider => {
    const localA = v3(...collider.a), localB = v3(...collider.b);
    return { ...collider, localA, localB,
      a: weaponPointFrame(player, localA).point, b: weaponPointFrame(player, localB).point };
  });
}

const segmentFrame = (player, segment, fraction) => weaponPointFrame(player,
  add(segment.localA, mul(sub(segment.localB, segment.localA), fraction)));

export function bodyRadius(player) { return characterStats(player).bodyRadius; }

export function bodyPointFrame(player, local) {
  const heading=fighterHeading(player),cp=Math.cos(heading),sp=Math.sin(heading);
  const r=v3(local.x*cp-local.z*sp,local.y,local.x*sp+local.z*cp);
  return {r,point:add(player.p,r),velocity:player.v,jt:v3(),jp:v3()};
}

export function hurtSegments(player) {
  const local = characterStats(player).hurtShapes;
  return local.map(shape => ({ ...shape, localA: v3(...shape.a), localB: v3(...shape.b),
    a: bodyPointFrame(player,v3(...shape.a)).point, b: bodyPointFrame(player,v3(...shape.b)).point }));
}

// Solid capsule endpoints can support the fighter or meet the low arena rim.
function surfacePoints(player) {
  if (!weaponStats(player).colliders) return [{ local: v3(0, weaponStats(player).length, 0), radius: weaponStats(player).radius }];
  return weaponSegments(player).flatMap(segment => [
    { local: segment.localA, radius: segment.radius },
    { local: segment.localB, radius: segment.radius },
  ]);
}

// Props are tall enough to meet a weapon anywhere along it, so sample each
// capsule at short intervals (closer than any wall is thick) instead of only
// at its ends.
function obstaclePoints(player) {
  const weapon = weaponStats(player);
  const colliders = weapon.colliders || [{ a: [0, 0, 0], b: [0, weapon.length, 0], radius: weapon.radius }];
  return colliders.flatMap(collider => {
    const a = v3(...collider.a), b = v3(...collider.b), span = length(sub(b, a));
    const count = Math.max(1, Math.ceil(span / 0.2));
    return Array.from({ length: count + 1 }, (_, index) =>
      ({ local: add(a, mul(sub(b, a), index / count)), radius: collider.radius }));
  });
}

function phiInertia(p) {
  const weapon = weaponStats(p);
  return weapon.inertia * Math.max(0.15, Math.sin(p.theta) ** 2);
}

function effectiveMass(p, frame, n) {
  return invMass + dot(frame.jt, n) ** 2 / weaponStats(p).inertia + dot(frame.jp, n) ** 2 / phiInertia(p);
}

function impulse(p, frame, force, pose = p) {
  p.v = add(p.v, mul(force, invMass));
  p.wt += dot(frame.jt, force) / weaponStats(p).inertia;
  p.wp += dot(frame.jp, force) / phiInertia(pose);
}

export const staminaPower = stamina => STAMINA.minPower + (1 - STAMINA.minPower) *
  clamp(stamina / STAMINA.lowThreshold, 0, 1);

function updateStamina(p, turnInput, dt) {
  const cost = Math.abs(p.polarInput) * STAMINA.swingDrain + Math.abs(turnInput) * STAMINA.turnDrain;
  if (cost > 0) {
    p.stamina = Math.max(0, p.stamina - cost * dt);
    p.staminaRestTime = 0;
  } else {
    // Only the part of this step after the recovery delay can refill stamina.
    const restTime = p.staminaRestTime + dt;
    const recoveryTime = Math.max(0, restTime - STAMINA.recoveryDelay);
    p.stamina = Math.min(STAMINA.max, p.stamina + recoveryTime * STAMINA.recoveryRate);
    p.staminaRestTime = Math.min(STAMINA.recoveryDelay, restTime);
  }
}

function motorAcceleration(speed, direction, weapon, power, dt, reverseAcceleration) {
  if (direction === 0) return 0;
  // Preserve the existing braking response even when exhausted. Once reversed,
  // acceleration in the new direction uses the reduced strength again.
  if (speed * direction < 0) return direction * reverseAcceleration;
  const drivenLimit = weapon.maxAngularSpeed * power;
  if (power < 1 && Math.abs(speed) > drivenLimit) {
    // Ease down toward the tired motor's speed instead of cutting momentum.
    return -Math.sign(speed) * Math.min(weapon.brakeAcceleration, (Math.abs(speed) - drivenLimit) / dt);
  }
  return direction * weapon.motorAcceleration * power;
}

function drivePolarAngle(p, dt, power) {
  const weapon = weaponStats(p);
  // W and S drive opposite rotations in the fighter's vertical facing plane.
  // There is no pole target: the same input can carry the weapon past the floor
  // and lift the fighter through contact, while release preserves free motion.
  const center = weapon.offset + weapon.length / 2;
  const radiusSquared = center ** 2 + weapon.length ** 2 / 12;
  const gravityAcceleration = CONFIG.gravity * center / radiusSquared * Math.sin(p.theta);
  const motor = motorAcceleration(p.wt, p.polarInput, weapon, power, dt, weapon.brakeAcceleration);
  p.wt = clamp((p.wt + (gravityAcceleration + motor) * dt) * Math.exp(-CONFIG.damping * dt),
    -weapon.maxAngularSpeed, weapon.maxAngularSpeed);
}

// The gain only counts motor acceleration along the pre-impact swing velocity.
// Centripetal acceleration and the collision's own deceleration are excluded.
export function damageForImpact(closingSpeed, drivingAcceleration) {
  if (closingSpeed < 1.65) return 0;
  const base = (closingSpeed - 1.3) * 1.65 + closingSpeed * closingSpeed * 0.095;
  const boost = 1 + 0.3 * clamp(drivingAcceleration / 48, 0, 1);
  return Math.round(clamp(base * boost, 2, 34));
}

// Closest points on two closed line segments, including degenerate segments.
export function closestSegments(a, b, c, d) {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c);
  const aa = dot(u, u), bb = dot(u, v), cc = dot(v, v);
  const dd = dot(u, w), ee = dot(v, w);
  let s = 0, t = 0;
  if (aa < 1e-10 && cc < 1e-10) return { a, b: c, s, t, distance: length(w) };
  if (aa < 1e-10) t = clamp(ee / cc, 0, 1);
  else if (cc < 1e-10) s = clamp(-dd / aa, 0, 1);
  else {
    const denom = aa * cc - bb * bb;
    s = denom > 1e-10 ? clamp((bb * ee - cc * dd) / denom, 0, 1) : 0;
    t = (bb * s + ee) / cc;
    if (t < 0) { t = 0; s = clamp(-dd / aa, 0, 1); }
    else if (t > 1) { t = 1; s = clamp((bb - dd) / aa, 0, 1); }
  }
  const pa = add(a, mul(u, s)), pb = add(c, mul(v, t));
  return { a: pa, b: pb, s, t, distance: length(sub(pa, pb)) };
}

const headingDelta = (end, start) => Math.atan2(Math.sin(end - start), Math.cos(end - start));

function contactMotion(player, start) {
  const weapon = weaponStats(player);
  const shapes = weapon.colliders || [{ a: [0, 0, 0], b: [0, weapon.length, 0], radius: weapon.radius }];
  let reach = 0, radius = Infinity;
  for (const shape of shapes) {
    radius = Math.min(radius, shape.radius);
    for (const point of [shape.a, shape.b]) {
      reach = Math.max(reach, Math.hypot(point[0], weapon.offset + point[1], point[2]) + shape.radius);
    }
  }
  const theta = player.theta - start.theta, phi = headingDelta(player.phi, start.phi);
  const body = headingDelta(player.bodyYaw, start.bodyYaw);
  const bodyReach = Math.max(...characterStats(player).hurtShapes.flatMap(shape => [shape.a, shape.b].map(point => Math.hypot(...point) + shape.radius)));
  return { theta, phi, body, radius,
    travel: length(sub(player.p, start.p)) + reach * (Math.abs(theta) + Math.abs(phi)) + bodyReach * Math.abs(body) };
}

// Inspect intermediate rigid poses, including curved rotation and heading wrap.
// Only contacts are sampled: motors, stamina, gravity and ground support still
// advance once per fixed tick. No extra radius is added to any shape.
function contactAlongMotion(a, b, previous, detect) {
  if (!previous) {
    const contact = detect(a, b);
    return contact && { ...contact, poseA: a, poseB: b };
  }
  const startA = previous[a.id], startB = previous[b.id];
  const motionA = contactMotion(a, startA), motionB = contactMotion(b, startB);
  const samples = clamp(Math.ceil((motionA.travel + motionB.travel) /
    (Math.min(motionA.radius, motionB.radius) * CONFIG.contactTravelFraction)), 1, CONFIG.maxContactSubsteps);
  const at = (player, start, motion, t) => ({ ...player,
    p: add(start.p, mul(sub(player.p, start.p), t)),
    theta: start.theta + motion.theta * t, phi: start.phi + motion.phi * t, bodyYaw: start.bodyYaw + motion.body * t });
  const inspect = t => {
    const poseA = at(a, startA, motionA, t), poseB = at(b, startB, motionB, t);
    const contact = detect(poseA, poseB);
    return contact && { ...contact, poseA, poseB };
  };
  for (let index = 0; index <= samples; index++) {
    let contact = inspect(index / samples);
    if (!contact) continue;
    // Refine the first sampled overlap so impulses use the incoming side of
    // the surface, not a normal already flipped by a tip passing through it.
    if (index > 0) {
      let low = (index - 1) / samples, high = index / samples;
      for (let pass = 0; pass < 6; pass++) {
        const middle = (low + high) / 2, earlier = inspect(middle);
        if (earlier) { high = middle; contact = earlier; }
        else low = middle;
      }
    }
    return contact;
  }
  return null;
}

export class ArenaPhysics {
  constructor() { this.reset(); }

  setPolarInput(playerId, direction) {
    const player = this.players[playerId];
    if (!player) return;
    player.polarInput = Math.sign(direction || 0);
  }

  // fighters: 1 gives tools and tests a lone sandbox fighter at the centre.
  // endless keeps a round running (no winner, health floor 1) for sandboxes.
  // obstacles: solid arena props (see arena-obstacles.js), world coordinates.
  // rimHeight: weapons meet the rim below this height (default: the scaled podium).
  reset(firstWeapon = 'polearm', secondWeapon = 'polearm', { fighters = 2, endless = false, arenaScale = 1, obstacles = [], rimHeight } = {}) {
    firstWeapon=normalizeLoadout(asLoadout(firstWeapon));
    secondWeapon=normalizeLoadout(asLoadout(secondWeapon));
    const solo = fighters === 1;
    this.players = solo ? [makePlayer(0, firstWeapon)] : [makePlayer(0, firstWeapon), makePlayer(1, secondWeapon)];
    // Two level swords would overlap at the original starting marks.
    if (!solo && firstWeapon.weaponId === 'sword' && secondWeapon.weaponId === 'sword') {
      const reach=this.players.map(p=>{const w=weaponStats(p);return w.offset+w.length+w.radius;});
      const separation=Math.max(2.85,(reach[0]+reach[1]+.06)/2);
      this.players[0].p.x = -separation;
      this.players[1].p.x = separation;
    }
    if (solo) this.players[0].p.x = 0;
    this.time = 0;
    this.events = [];
    this.winner = null;
    this.endless = endless;
    this.arenaRadius = CONFIG.arenaRadius * arenaScale;
    this.arenaRimHeight = rimHeight ?? arenaPlacement(arenaScale).weaponContactHeight;
    this.obstacles = obstacles;
    this.projectiles = [];
    this.projectileId = 0;
    this.contacts = this.players.map(() => ({ separated: 1 }));
    this.lastClash = -1;
    this.clashArmed = true;
    this.clashSeparated = CLASH.separationDelay;
    this.lastHit = null;
  }

  step(inputs, dt = CONFIG.step) {
    const finished = this.winner !== null;
    if (this.winner === -1) { this.events.length = 0; return; }
    this.events.length = 0;
    this.time += dt;
    // Skills first: a teleport must not be swept as motion through the target.
    for (const p of this.players) if (!finished || p.id === this.winner) this.updateSkill(p, !finished && inputs[p.id]?.skillTap, dt);
    const previous = this.players.map(p => ({ p: { ...p.p }, theta: p.theta, phi: p.phi, bodyYaw: p.bodyYaw }));
    for (const p of this.players) {
      if (finished && p.id !== this.winner) continue;
      const weapon = weaponStats(p);
      const input = inputs[p.id] || { theta: 0, phi: 0 };
      this.setPolarInput(p.id, input.theta || 0);
      turnBody(p, input.faceYaw, dt);
      const turnInput = clamp(input.phi || 0, -1, 1);
      updateStamina(p, turnInput, dt);
      const power = staminaPower(p.stamina);
      // Yaw keeps its existing reversal strength; pitch uses the stronger brake.
      const motorP = motorAcceleration(p.wp, turnInput, weapon, power, dt, weapon.motorAcceleration);
      const previousT = p.wt, previousP = p.wp;
      const damp = Math.exp(-CONFIG.damping * dt);
      drivePolarAngle(p, dt, power);
      p.wp = clamp((p.wp + motorP * dt) * damp, -weapon.maxAngularSpeed, weapon.maxAngularSpeed);
      p.theta += p.wt * dt;
      // Net angular acceleration before contact, including damping/speed limits.
      // Holding an already-max-speed motor does not award an acceleration bonus.
      const smooth = 1 - Math.exp(-dt / 0.09);
      p.driveT += ((p.wt - previousT) / dt - p.driveT) * smooth;
      p.driveP += ((p.wp - previousP) / dt - p.driveP) * smooth;
      p.v.y -= CONFIG.gravity * dt;
      p.v.x *= Math.exp(-0.15 * dt);
      p.v.z *= Math.exp(-0.15 * dt);
      // Azimuth retains free rotation and inertia independently of the up/down target.
      p.phi = (p.phi + p.wp * dt) % (Math.PI * 2);
      p.p = add(p.p, mul(p.v, dt));
      p.staffGrounded = false;
      p.hitFlash = Math.max(0, p.hitFlash - dt * 5);
      p.contactSpeed = length(staffFrame(p).velocity);
    }

    // Keep ground integration at its existing fixed timestep. Weapon/body and
    // weapon/weapon contact separately inspect the motion between these poses.
    for (let pass = 0; pass < 5; pass++) {
      for (const p of this.players) {
      if (finished && p.id !== this.winner) continue;
        this.solveBodyGround(p, dt, pass === 0);
        this.solveStaffGround(p, dt);
        this.solveWall(p, dt);
        this.solveObstacles(p, dt);
      }
      if (!finished && this.players.length > 1) this.solveBodies();
    }
    if (!finished && this.players.length > 1) {
      this.solveStaffClash(dt, previous);
      this.solveAttack(this.players[0], this.players[1], dt, previous);
      this.solveAttack(this.players[1], this.players[0], dt, previous);
    }
    this.stepProjectiles(dt);
    for (const p of this.players) {
      if (finished && p.id !== this.winner) continue;
      // Body separation can push a fighter slightly past the rim on the last
      // contact pass. Reapply the body boundary after pair contacts finish.
      this.solveBodyWall(p);
      this.solveBodyObstacles(p);
      const speed = length(p.v);
      if (speed > 15) p.v = mul(p.v, 15 / speed);
      // Contacts cannot restore the old fast spin after the motor was capped.
      const limit = weaponStats(p).maxAngularSpeed;
      p.wt = clamp(p.wt, -limit, limit);
      p.wp = clamp(p.wp, -limit, limit);
      p.contactSpeed = length(staffFrame(p).velocity);
    }
    if (!finished && !this.endless && this.players.length > 1) {
      const dead = this.players.map(p => p.health <= 0);
      if (dead[0] || dead[1]) this.winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
    }
  }

  // Count down the active effect and the cooldown, start the character's skill
  // on a tap, and apply its continuous effect (laugh drain, heal) for this step.
  updateSkill(p, tap, dt) {
    const skill = SKILLS[p.skill];
    if (!skill) return;
    p.skillCooldown = Math.max(0, p.skillCooldown - dt);
    if (tap && p.skillCooldown <= 0) this.startSkill(p, skill);
    if (!p.skillActive) return;
    const share = Math.min(dt, p.skillTime);
    p.skillTime -= dt;
    if (skill.id === 'laugh') {
      for (const other of this.players) if (other !== p) {
        other.stamina = Math.max(0, other.stamina - skill.drain * share);
        other.staminaRestTime = 0;
      }
    }
    if (skill.id === 'happy') p.health = Math.min(CONFIG.maxHealth, p.health + skill.heal / skill.duration * share);
    if (p.skillTime <= 0) { p.skillActive = false; p.skillTime = 0; }
  }

  startSkill(p, skill) {
    const other = this.players.find(q => q !== p);
    if (!other && (skill.id === 'laugh' || skill.id === 'twist')) return;
    p.skillCooldown = skill.cooldown;
    p.skillActive = true;
    p.skillTime = skill.duration;
    const event = { type: 'skill', skill: skill.id, player: p.id, characterId: p.characterId, point: { ...p.p } };
    if (skill.id === 'twist') event.to = this.teleportBehind(p, other, skill.behind);
    if (skill.id === 'delivery') this.throwDelivery(p, skill);
    this.events.push(event);
  }

  // Land behind the target, facing it, weapon raised for a chop.
  teleportBehind(p, target, behind) {
    const heading = fighterHeading(target);
    let x = target.p.x - Math.cos(heading) * behind, z = target.p.z - Math.sin(heading) * behind;
    const limit = this.arenaRadius - bodyRadius(p) - 0.4, r = Math.hypot(x, z);
    if (r > limit) { x *= limit / r; z *= limit / r; }
    p.p = v3(x, characterStats(p).bodyFloor + ARENA_PROFILE.floorHeight, z);
    for (let pass = 0; pass < 4; pass++) this.solveBodyObstacles(p);
    p.v = v3();
    const face = Math.atan2(target.p.z - p.p.z, target.p.x - p.p.x);
    p.bodyYaw = p.phi = face;
    p.theta = 0;
    p.wt = p.wp = 0;
    return { x: p.p.x, y: p.p.y, z: p.p.z, face };
  }

  throwDelivery(p, skill) {
    const heading = fighterHeading(p), forward = v3(Math.cos(heading), 0, Math.sin(heading));
    const start = add(p.p, add(mul(forward, bodyRadius(p) + skill.radius + 0.1), v3(0, 0.55, 0)));
    this.projectiles.push({ id: ++this.projectileId, owner: p.id, p: start, radius: skill.radius, life: skill.life, spin: 0,
      v: add(mul(forward, skill.speed), v3(p.v.x * 0.5, skill.lift, p.v.z * 0.5)) });
  }

  // Thrown bags fly a ballistic arc, hit the other fighter's body, or splat on
  // the floor, the rim or a prop.
  stepProjectiles(dt) {
    const skill = SKILLS.delivery;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const shot = this.projectiles[i], from = shot.p;
      shot.v.y -= CONFIG.projectileGravity * dt;
      shot.p = add(shot.p, mul(shot.v, dt));
      shot.life -= dt;
      shot.spin += dt * 9;
      const target = this.players.find(q => q.id !== shot.owner);
      let hit = null;
      if (target && this.winner === null) for (const body of hurtSegments(target)) {
        const c = closestSegments(from, shot.p, body.a, body.b);
        if (c.distance < body.radius + shot.radius) { hit = c; break; }
      }
      const travel = unit(v3(shot.v.x, 0, shot.v.z));
      if (hit) {
        const damage = skill.damage;
        target.health = Math.max(this.endless ? 1 : 0, target.health - damage);
        target.hitFlash = 1;
        target.v = add(target.v, add(mul(travel, skill.knockback), v3(0, 2, 0)));
        const speed = length(shot.v);
        this.lastHit = { damage, speed, acceleration: 0, turnShare: 0, attacker: shot.owner, source: 'delivery' };
        this.events.push({ type: 'hit', source: 'delivery', weapon: 'takeout-box', point: hit.a, normal: travel,
          attacker: shot.owner, target: target.id, damage, speed, acceleration: 0, turnShare: 0, strength: clamp(damage / 30, 0.12, 1) });
        this.projectiles.splice(i, 1);
        continue;
      }
      const r = Math.hypot(shot.p.x, shot.p.z);
      const landed = shot.p.y - shot.radius <= ARENA_PROFILE.floorHeight ||
        (r > this.arenaRadius - shot.radius && shot.p.y < this.arenaRimHeight) ||
        this.obstacles.some(o => shot.p.y - shot.radius < o.height && obstacleContact(o, shot.p.x, shot.p.z, shot.radius));
      if (landed || shot.life <= 0) {
        if (landed) this.events.push({ type: 'splat', point: { ...shot.p, y: Math.max(shot.p.y, 0.05) }, strength: 0.5 });
        this.projectiles.splice(i, 1);
      }
    }
  }

  solveBodyGround(p, dt, friction) {
    const floor=characterStats(p).bodyFloor + ARENA_PROFILE.floorHeight;
    p.grounded = p.p.y <= floor + 0.025;
    if (p.p.y < floor) {
      p.p.y = floor;
      p.v.y = Math.max(0, p.v.y);
    }
    if (p.grounded && friction) {
      const d = Math.exp(-4.3 * dt);
      p.v.x *= d;
      p.v.z *= d;
    }
  }

  solveStaffGround(p, dt) {
    for (const point of surfacePoints(p)) this.solveWeaponGroundPoint(p, point, dt);
  }

  solveWeaponGroundPoint(p, { local, radius }, dt) {
    let f = weaponPointFrame(p, local);
    const penetration = radius - (f.point.y - ARENA_PROFILE.floorHeight);
    if (penetration < -0.008) return;
    p.staffGrounded = true;
    const n = v3(0, 1, 0);
    const bias = Math.max(0, penetration - 0.002) * 0.2 / dt;
    const j = Math.max(0, (bias - f.velocity.y) / effectiveMass(p, f, n));
    impulse(p, f, mul(n, j));
    f = weaponPointFrame(p, local);
    const tangent = v3(f.velocity.x, 0, f.velocity.z);
    const speed = length(tangent);
    if (speed > 1e-6 && j > 0) {
      const t = mul(tangent, -1 / speed);
      const friction = Math.min(speed / effectiveMass(p, f, t), CONFIG.grip * j);
      impulse(p, f, mul(t, friction));
    }
  }

  solveBodyWall(p) {
    const bodyLimit = this.arenaRadius - bodyRadius(p);
    const distance = Math.hypot(p.p.x, p.p.z);
    if (distance > bodyLimit) {
      const n = v3(p.p.x / distance, 0, p.p.z / distance);
      p.p.x = n.x * bodyLimit;
      p.p.z = n.z * bodyLimit;
      const outward = dot(p.v, n);
      if (outward > 0) p.v = sub(p.v, mul(n, outward * 1.16));
    }
  }

  solveWall(p, dt) {
    this.solveBodyWall(p);
    // The prepared podium is a low boundary. Its height scales uniformly with
    // the full building; seating and upper arches remain decorative.
    for (const { local, radius } of surfacePoints(p)) {
      const f = weaponPointFrame(p, local);
      const r = Math.hypot(f.point.x, f.point.z);
      if (f.point.y >= this.arenaRimHeight || r <= this.arenaRadius - radius) continue;
      const n = v3(-f.point.x / r, 0, -f.point.z / r);
      const bias = Math.min(4, (r - this.arenaRadius + radius) * 0.15 / dt);
      const j = Math.max(0, (bias - dot(f.velocity, n)) / effectiveMass(p, f, n));
      impulse(p, f, mul(n, j));
    }
  }

  // Bodies slide around props, or stand on a prop's top when they come down
  // onto it; weapons strike, rest on and push off sides and tops with the
  // same impulse model as the rim, so a prop can lever a fighter away.
  solveBodyObstacles(p) {
    const radius = bodyRadius(p);
    for (const obstacle of this.obstacles) {
      const feet = p.p.y - characterStats(p).bodyFloor;
      if (feet >= obstacle.height) continue;
      const contact = obstacleContact(obstacle, p.p.x, p.p.z, radius);
      if (!contact) continue;
      const below = obstacle.height - feet;
      if (below < Math.min(contact.depth, 0.35)) {
        p.p = add(p.p, v3(0, below, 0));
        if (p.v.y < 0) p.v.y = 0;
        p.grounded = true;
        continue;
      }
      const n = v3(contact.nx, 0, contact.nz);
      p.p = add(p.p, mul(n, contact.depth));
      const inward = dot(p.v, n);
      if (inward < 0) p.v = sub(p.v, mul(n, inward * 1.16));
    }
  }

  solveObstacles(p, dt) {
    if (!this.obstacles.length) return;
    this.solveBodyObstacles(p);
    const reach = weaponStats(p).offset + weaponStats(p).length + 2.5;
    const near = this.obstacles.filter(o => Math.hypot(o.x - p.p.x, o.z - p.p.z) < reach + o.extent);
    if (!near.length) return;
    for (const { local, radius } of obstaclePoints(p)) {
      for (const obstacle of near) {
        let f = weaponPointFrame(p, local);
        const below = obstacle.height - (f.point.y - radius);
        if (below <= 0) continue;
        const contact = obstacleContact(obstacle, f.point.x, f.point.z, radius);
        if (!contact) continue;
        // Leave through the nearer face: a weapon coming down onto a prop rests
        // on its top (with friction, like the floor) instead of being pushed
        // to both sides at once and wedged inside it.
        const top = below < contact.depth;
        const n = top ? v3(0, 1, 0) : v3(contact.nx, 0, contact.nz), depth = top ? below : contact.depth;
        const bias = Math.min(4, depth * 0.15 / dt);
        const j = Math.max(0, (bias - dot(f.velocity, n)) / effectiveMass(p, f, n));
        impulse(p, f, mul(n, j));
        if (!top || j <= 0) continue;
        p.staffGrounded = true;
        f = weaponPointFrame(p, local);
        const tangent = v3(f.velocity.x, 0, f.velocity.z), speed = length(tangent);
        if (speed > 1e-6) {
          const t = mul(tangent, -1 / speed);
          impulse(p, f, mul(t, Math.min(speed / effectiveMass(p, f, t), CONFIG.grip * j)));
        }
      }
    }
  }

  solveBodies() {
    const [a, b] = this.players;
    if (Math.abs(a.p.y - b.p.y) > 1.35) return;
    const delta = v3(b.p.x - a.p.x, 0, b.p.z - a.p.z);
    const dist = length(delta), penetration = bodyRadius(a) + bodyRadius(b) - dist;
    if (penetration <= 0) return;
    const n = unit(delta);
    a.p = sub(a.p, mul(n, penetration * 0.5));
    b.p = add(b.p, mul(n, penetration * 0.5));
    const closing = dot(sub(a.v, b.v), n);
    if (closing > 0) {
      a.v = sub(a.v, mul(n, closing * 0.55));
      b.v = add(b.v, mul(n, closing * 0.55));
    }
  }

  solveStaffClash(dt, previous) {
    const [a, b] = this.players;
    const best = contactAlongMotion(a, b, previous, (poseA, poseB) => {
      let contact;
      const first = weaponSegments(poseA), second = weaponSegments(poseB);
      for (const sa of first) for (const sb of second) {
        const c = closestSegments(sa.a, sa.b, sb.a, sb.b);
        const depth = sa.radius + sb.radius - c.distance;
        if (depth > 0 && (!contact || depth > contact.depth)) contact = { c, depth, sa, sb };
      }
      return contact;
    });
    if (!best) {
      this.clashSeparated += dt;
      if (this.clashSeparated >= CLASH.separationDelay) this.clashArmed = true;
      return;
    }
    this.clashSeparated = 0;
    const { c, depth, sa, sb, poseA, poseB } = best;
    const n = unit(sub(c.a, c.b), v3(0, 1, 0));
    const fa = segmentFrame(poseA, sa, c.s), fb = segmentFrame(poseB, sb, c.t);
    const closing = -dot(sub(fa.velocity, fb.velocity), n);
    const j = Math.max(0, (closing * 1.35 + depth * 0.13 / dt) / (effectiveMass(poseA, fa, n) + effectiveMass(poseB, fb, n)));
    impulse(a, fa, mul(n, j), poseA);
    impulse(b, fb, mul(n, -j), poseB);
    if (this.clashArmed && closing > CLASH.minSpeed && this.time - this.lastClash > CLASH.cooldown) {
      this.lastClash = this.time;
      this.clashArmed = false;
      const effort = clamp((closing - CLASH.minSpeed) / (CLASH.fullSpeed - CLASH.minSpeed), 0, 1);
      const recoilSpeed = CLASH.minRecoilSpeed + (CLASH.maxRecoilSpeed - CLASH.minRecoilSpeed) * effort;
      recoilFromClash(a, recoilSpeed);
      recoilFromClash(b, recoilSpeed);
      this.events.push({ type: 'clash', point: mul(add(c.a, c.b), 0.5), weapons: [a.weapon, b.weapon],
        strength: clamp(closing / CLASH.fullSpeed, 0.2, 1), recoilSpeed });
    }
  }

  solveAttack(attacker, target, dt, previous) {
    const best = contactAlongMotion(attacker, target, previous, (poseA, poseB) => {
      let contact;
      for (const segment of weaponSegments(poseA)) {
        for (const body of hurtSegments(poseB)) {
          const c = closestSegments(segment.a, segment.b, body.a, body.b);
          const depth = body.radius + segment.radius - c.distance;
          if (depth > 0 && (!contact || depth > contact.depth)) contact = { c, depth, segment };
        }
      }
      return contact;
    });
    const contact = this.contacts[attacker.id];
    if (!best) { contact.separated += dt; return; }
    const { c, depth, segment, poseA } = best;
    const n = unit(sub(c.a, c.b));
    const f = segmentFrame(poseA, segment, c.s);
    const relative = sub(f.velocity, target.v);
    const closing = -dot(relative, n);
    const driving = add(mul(f.jt, attacker.driveT), mul(f.jp, attacker.driveP));
    const swing = sub(f.velocity, attacker.v);
    const acceleration = Math.max(0, dot(driving, unit(swing, v3())));
    // Attribute only motion closing into the target. Sideways motion that does
    // not cause the contact cannot reduce a vertical hit, and released keys do
    // not disguise a coasting horizontal strike. Body translation stays neutral.
    const turnClosing = Math.max(0, -dot(mul(f.jp, attacker.wp), n));
    const swingClosing = Math.max(0, -dot(mul(f.jt, attacker.wt), n));
    const bodyClosing = Math.max(0, -dot(sub(attacker.v, target.v), n));
    const totalClosing = turnClosing + swingClosing + bodyClosing;
    const turnShare = totalClosing > 1e-8 ? turnClosing / totalClosing : 0;
    const directionScale = 1 - (1 - CONFIG.turnDamageScale) * turnShare;
    const damage = Math.round(damageForImpact(closing, acceleration) * (segment.damageScale || 1) * directionScale);
    const fresh = contact.separated > 0.045 && this.time - attacker.lastAttackAt > 0.28;
    contact.separated = 0;
    const j = Math.max(0, (closing * 1.12 + Math.max(0, depth - 0.008) * 0.12 / dt) /
      (effectiveMass(poseA, f, n) + invMass));
    impulse(attacker, f, mul(n, j), poseA);
    target.v = sub(target.v, mul(n, j * invMass));
    if (!fresh || damage === 0) return;
    target.health = Math.max(this.endless ? 1 : 0, target.health - damage);
    target.hitFlash = 1;
    attacker.lastAttackAt = this.time;
    // A bounded arcade impulse makes solid hits readable without toppling bodies.
    target.v = sub(target.v, mul(n, damage * 0.07));
    this.lastHit = { damage, speed: closing, acceleration, turnShare, attacker: attacker.id };
    this.events.push({
      type: 'hit', source: 'weapon', weapon: attacker.weapon, point: c.a, normal: mul(n, -1), attacker: attacker.id,
      target: target.id, damage, speed: closing, acceleration, turnShare,
      strength: clamp(damage / 30, 0.12, 1),
    });
  }
}
