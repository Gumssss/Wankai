// Upright bodies + two angular degrees of freedom per staff.
// Contact impulses use the staff Jacobian: rotation and translation respond
// together. No locomotion force is added by the input controller.
export const CONFIG = Object.freeze({
  step: 1 / 180,
  arenaRadius: 6.45,
  // Distance from the body pivot to the floating staff's inner end. This clears
  // the entire head (0.76 + 0.4) even when the staff points straight upward.
  staffOffset: 1.35,
  staffLength: 2.35,
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
  polarAngleTolerance: 0.0005,
  polarSpeedTolerance: 0.08,
  upFollowThrough: Math.PI / 18,
  maxAngularSpeed: 8.5,
  grip: 1.28,
  maxHealth: 100,
});
export const SOLO_ARENA_SCALE = 3;

export const WEAPONS = Object.freeze({
  polearm: Object.freeze({ length: CONFIG.staffLength, offset: CONFIG.staffOffset, radius: CONFIG.staffRadius,
    inertia: CONFIG.inertia, motorAcceleration: CONFIG.motorAcceleration,
    brakeAcceleration: CONFIG.polarBrakeAcceleration, maxAngularSpeed: CONFIG.maxAngularSpeed }),
  sword: Object.freeze({ length: 1.45, offset: 1.2, radius: 0.09,
    inertia: 2.8, motorAcceleration: 38,
    brakeAcceleration: 48, maxAngularSpeed: 12.2 }),
});

export const weaponStats = player => WEAPONS[player.weapon] || WEAPONS.polearm;

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a) => Math.hypot(a.x, a.y, a.z);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const unit = (a, fallback = v3(1, 0, 0)) => length(a) > 1e-8 ? mul(a, 1 / length(a)) : fallback;
const invMass = 1 / CONFIG.mass;

export function makePlayer(id, weapon = 'polearm') {
  const phi = id === 0 ? (weapon === 'sword' ? 0 : 0.95) : Math.PI - 0.95;
  return {
    id,
    weapon,
    p: v3(id === 0 ? -2.2 : 2.2, CONFIG.bodyFloor, 0),
    v: v3(),
    theta: weapon === 'sword' ? Math.PI / 2 : 1.32,
    thetaTarget: null,
    polarInput: 0,
    lastUpPole: null,
    upwardSwingSign: 0,
    followThrough: null,
    phi,
    // Both fighters face each other at the start. Their visual/camera heading
    // then follows the weapon's azimuth without altering contact physics.
    facingOffset: (id === 0 ? 0 : Math.PI) - phi,
    wt: 0,
    wp: 0,
    driveT: 0,
    driveP: 0,
    health: CONFIG.maxHealth,
    grounded: true,
    staffGrounded: false,
    contactSpeed: 0,
    lastHitAt: -10,
    lastAttackAt: -10,
    hitFlash: 0,
    lastDamage: 0,
    totalDamage: 0,
  };
}

export const fighterHeading = player => player.phi + player.facingOffset;

// distance is measured along the solid staff, from its floating inner end.
// The invisible constraint still transmits contact impulses to the body pivot.
export function staffFrame(player, distance = weaponStats(player).length) {
  const radius = weaponStats(player).offset + distance;
  const st = Math.sin(player.theta), ct = Math.cos(player.theta);
  const sp = Math.sin(player.phi), cp = Math.cos(player.phi);
  const r = v3(radius * st * cp, radius * ct, radius * st * sp);
  const jt = v3(radius * ct * cp, -radius * st, radius * ct * sp);
  const jp = v3(-radius * st * sp, 0, radius * st * cp);
  return {
    r, jt, jp,
    point: add(player.p, r),
    velocity: add(player.v, add(mul(jt, player.wt), mul(jp, player.wp))),
  };
}

function phiInertia(p) {
  return weaponStats(p).inertia * Math.max(0.15, Math.sin(p.theta) ** 2);
}

function effectiveMass(p, frame, n) {
  return invMass + dot(frame.jt, n) ** 2 / weaponStats(p).inertia + dot(frame.jp, n) ** 2 / phiInertia(p);
}

function impulse(p, frame, force) {
  p.v = add(p.v, mul(force, invMass));
  p.wt += dot(frame.jt, force) / weaponStats(p).inertia;
  p.wp += dot(frame.jp, force) / phiInertia(p);
}

function drivePolarAngle(p, dt) {
  const weapon = weaponStats(p);
  const returning = p.followThrough?.returning;
  const target = p.thetaTarget ?? (returning ? p.followThrough.pole : null);
  if (target === null) {
    // Uniform floating rod: gravity torque / inertia about the body pivot.
    const center = weapon.offset + weapon.length / 2;
    const radiusSquared = center ** 2 + weapon.length ** 2 / 12;
    const gravityAcceleration = CONFIG.gravity * center / radiusSquared * Math.sin(p.theta);
    p.wt = (p.wt + gravityAcceleration * dt) * Math.exp(-CONFIG.damping * dt);
    return;
  }
  const error = target - p.theta;
  if (Math.abs(error) <= CONFIG.polarAngleTolerance && Math.abs(p.wt) <= CONFIG.polarSpeedTolerance) {
    p.theta = target;
    p.wt = 0;
    if (returning) p.followThrough = null;
    return;
  }
  // Choose a speed we can brake to zero within the remaining angle. Reserve
  // one integration step of travel so discrete updates don't overshoot.
  const brakeStep = weapon.brakeAcceleration * dt;
  const stoppingSpeed = Math.sqrt(brakeStep ** 2 + 2 * weapon.brakeAcceleration * Math.abs(error)) - brakeStep;
  const desiredSpeed = Math.sign(error) * Math.min(weapon.maxAngularSpeed, stoppingSpeed);
  const braking = p.wt * error < 0 || Math.abs(p.wt) > Math.abs(desiredSpeed);
  const acceleration = braking ? weapon.brakeAcceleration : weapon.motorAcceleration;
  p.wt += clamp(desiredSpeed - p.wt, -acceleration * dt, acceleration * dt);
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

export class ArenaPhysics {
  constructor() { this.reset(); }

  setPolarInput(playerId, direction) {
    const player = this.players[playerId];
    if (!player) return;
    direction = Math.sign(direction || 0);
    if (direction === 0) {
      // A moving Up swing can coast briefly past vertical. If it reaches the
      // ten-degree limit, the controller settles it back to straight up.
      if (player.polarInput === -1 && player.thetaTarget !== null) {
        const sign = player.upwardSwingSign || Math.sign(player.wt) || -1;
        if (player.wt * sign > 0) {
          player.followThrough = { pole: player.thetaTarget, sign, returning: false };
        }
      }
      player.thetaTarget = null;
    } else if (direction !== player.polarInput) {
      const pole = direction < 0 ? 0 : Math.PI;
      const nearestTop = Math.round(player.theta / (2 * Math.PI)) * 2 * Math.PI;
      const nearTop = direction > 0 &&
        Math.abs(player.theta - nearestTop) <= CONFIG.upFollowThrough + 1e-6;
      // At upright, Down always chooses the back side of the stored heading.
      // Away from upright it lowers on the side the weapon is already on.
      player.thetaTarget = nearTop ? nearestTop - Math.PI :
        pole + Math.round((player.theta - pole) / (2 * Math.PI)) * 2 * Math.PI;
      player.followThrough = null;
      if (direction < 0) {
        player.lastUpPole = player.thetaTarget;
        player.upwardSwingSign = Math.sign(player.thetaTarget - player.theta) || Math.sign(player.wt) || -1;
      } else {
        player.lastUpPole = null;
      }
    }
    player.polarInput = direction;
  }

  reset(practice = false, solo = false, firstWeapon = 'polearm') {
    if (!WEAPONS[firstWeapon]) throw new Error(`Unknown weapon: ${firstWeapon}`);
    this.players = solo ? [makePlayer(0, firstWeapon)] : [makePlayer(0, firstWeapon), makePlayer(1)];
    if (solo) this.players[0].p.x = 0;
    this.time = 0;
    this.events = [];
    this.winner = null;
    this.practice = practice;
    this.solo = solo;
    this.arenaRadius = CONFIG.arenaRadius * (solo ? SOLO_ARENA_SCALE : 1);
    this.contacts = this.players.map(() => ({ separated: 1 }));
    this.lastClash = -1;
    this.lastHit = null;
    if (practice) {
      this.players[0].p.x = -1.45;
      this.players[1].p.x = 1.45;
      this.players[1].theta = 0.28;
    }
  }

  step(inputs, dt = CONFIG.step) {
    if (this.winner !== null) return;
    this.time += dt;
    this.events.length = 0;
    for (const p of this.players) {
      const weapon = weaponStats(p);
      const input = inputs[p.id] || { theta: 0, phi: 0 };
      this.setPolarInput(p.id, input.theta || 0);
      const motorP = clamp(input.phi || 0, -1, 1) * weapon.motorAcceleration;
      const previousT = p.wt, previousP = p.wp;
      const damp = Math.exp(-CONFIG.damping * dt);
      drivePolarAngle(p, dt);
      p.wp = clamp((p.wp + motorP * dt) * damp, -weapon.maxAngularSpeed, weapon.maxAngularSpeed);
      p.theta += p.wt * dt;
      if (p.followThrough && !p.followThrough.returning &&
          (p.theta - p.followThrough.pole) * p.followThrough.sign >= CONFIG.upFollowThrough) {
        p.theta = p.followThrough.pole + p.followThrough.sign * CONFIG.upFollowThrough;
        p.wt = 0;
        p.followThrough.returning = true;
      }
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

    // A small fixed step bounds rod-tip travel, avoiding tunnelling through bodies.
    // Multiple impulse passes let the body floor and rod floor share the load.
    for (let pass = 0; pass < 5; pass++) {
      for (const p of this.players) {
        this.solveBodyGround(p, dt, pass === 0);
        this.solveStaffGround(p, dt);
        this.solveWall(p, dt);
      }
      if (!this.solo) this.solveBodies();
    }
    if (!this.solo) {
      this.solveStaffClash(dt);
      this.solveAttack(this.players[0], this.players[1], dt);
      this.solveAttack(this.players[1], this.players[0], dt);
    }
    for (const p of this.players) {
      const speed = length(p.v);
      if (speed > 15) p.v = mul(p.v, 15 / speed);
      const limit = Math.max(12, weaponStats(p).maxAngularSpeed);
      p.wt = clamp(p.wt, -limit, limit);
      p.wp = clamp(p.wp, -limit, limit);
      if (this.practice && p.id === 1 && this.time - p.lastHitAt > 2.5) p.health = CONFIG.maxHealth;
    }
    if (!this.practice && !this.solo) {
      const dead = this.players.map(p => p.health <= 0);
      if (dead[0] || dead[1]) this.winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
    }
  }

  solveBodyGround(p, dt, friction) {
    p.grounded = p.p.y <= CONFIG.bodyFloor + 0.025;
    if (p.p.y < CONFIG.bodyFloor) {
      p.p.y = CONFIG.bodyFloor;
      p.v.y = Math.max(0, p.v.y);
    }
    if (p.grounded && friction) {
      const d = Math.exp(-4.3 * dt);
      p.v.x *= d;
      p.v.z *= d;
    }
  }

  solveStaffGround(p, dt) {
    let f = staffFrame(p);
    const penetration = weaponStats(p).radius - f.point.y;
    if (penetration < -0.008) return;
    p.staffGrounded = true;
    const n = v3(0, 1, 0);
    const bias = Math.max(0, penetration - 0.002) * 0.2 / dt;
    const j = Math.max(0, (bias - f.velocity.y) / effectiveMass(p, f, n));
    impulse(p, f, mul(n, j));
    f = staffFrame(p);
    const tangent = v3(f.velocity.x, 0, f.velocity.z);
    const speed = length(tangent);
    if (speed > 1e-6 && j > 0) {
      const t = mul(tangent, -1 / speed);
      const friction = Math.min(speed / effectiveMass(p, f, t), CONFIG.grip * j);
      impulse(p, f, mul(t, friction));
    }
  }

  solveWall(p, dt) {
    const bodyLimit = this.arenaRadius - CONFIG.bodyRadius;
    const distance = Math.hypot(p.p.x, p.p.z);
    if (distance > bodyLimit) {
      const n = v3(p.p.x / distance, 0, p.p.z / distance);
      p.p.x = n.x * bodyLimit;
      p.p.z = n.z * bodyLimit;
      const outward = dot(p.v, n);
      if (outward > 0) p.v = sub(p.v, mul(n, outward * 1.16));
    }
    // The rim is waist-high: elevated weapons may pass above it.
    const f = staffFrame(p);
    const r = Math.hypot(f.point.x, f.point.z);
    if (f.point.y < 0.48 && r > this.arenaRadius - weaponStats(p).radius) {
      const n = v3(-f.point.x / r, 0, -f.point.z / r);
      const bias = Math.min(4, (r - this.arenaRadius + weaponStats(p).radius) * 0.15 / dt);
      const j = Math.max(0, (bias - dot(f.velocity, n)) / effectiveMass(p, f, n));
      impulse(p, f, mul(n, j));
    }
  }

  solveBodies() {
    const [a, b] = this.players;
    if (Math.abs(a.p.y - b.p.y) > 1.35) return;
    const delta = v3(b.p.x - a.p.x, 0, b.p.z - a.p.z);
    const dist = length(delta), penetration = CONFIG.bodyRadius * 2 - dist;
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

  solveStaffClash(dt) {
    const [a, b] = this.players;
    const baseA = staffFrame(a, 0).point, baseB = staffFrame(b, 0).point;
    const tipA = staffFrame(a).point, tipB = staffFrame(b).point;
    const c = closestSegments(baseA, tipA, baseB, tipB);
    const depth = weaponStats(a).radius + weaponStats(b).radius - c.distance;
    if (depth <= 0) return;
    const n = unit(sub(c.a, c.b), v3(0, 1, 0));
    const fa = staffFrame(a, weaponStats(a).length * c.s), fb = staffFrame(b, weaponStats(b).length * c.t);
    const closing = -dot(sub(fa.velocity, fb.velocity), n);
    const j = Math.max(0, (closing * 1.35 + depth * 0.13 / dt) / (effectiveMass(a, fa, n) + effectiveMass(b, fb, n)));
    impulse(a, fa, mul(n, j));
    impulse(b, fb, mul(n, -j));
    if (closing > 2.5 && this.time - this.lastClash > 0.18) {
      this.lastClash = this.time;
      this.events.push({ type: 'clash', point: mul(add(c.a, c.b), 0.5), strength: clamp(closing / 12, 0.2, 1) });
    }
  }

  solveAttack(attacker, target, dt) {
    const base = staffFrame(attacker, 0).point;
    const tip = staffFrame(attacker).point;
    const torso = closestSegments(base, tip,
      add(target.p, v3(0, -0.19, 0)), add(target.p, v3(0, 0.18, 0)));
    const headPoint = add(target.p, v3(0, 0.76, 0));
    const head = closestSegments(base, tip, headPoint, headPoint);
    const c = torso.distance <= head.distance ? torso : head;
    const depth = CONFIG.bodyRadius + weaponStats(attacker).radius - c.distance;
    const contact = this.contacts[attacker.id];
    if (depth <= 0) { contact.separated += dt; return; }
    const n = unit(sub(c.a, c.b));
    const f = staffFrame(attacker, weaponStats(attacker).length * c.s);
    const relative = sub(f.velocity, target.v);
    const closing = -dot(relative, n);
    const driving = add(mul(f.jt, attacker.driveT), mul(f.jp, attacker.driveP));
    const swing = sub(f.velocity, attacker.v);
    const acceleration = Math.max(0, dot(driving, unit(swing, v3())));
    const damage = damageForImpact(closing, acceleration);
    const fresh = contact.separated > 0.045 && this.time - attacker.lastAttackAt > 0.28;
    contact.separated = 0;
    const j = Math.max(0, (closing * 1.12 + Math.max(0, depth - 0.008) * 0.12 / dt) /
      (effectiveMass(attacker, f, n) + invMass));
    impulse(attacker, f, mul(n, j));
    target.v = sub(target.v, mul(n, j * invMass));
    if (!fresh || damage === 0) return;
    target.health = Math.max(this.practice ? 1 : 0, target.health - damage);
    target.hitFlash = 1;
    target.lastHitAt = this.time;
    attacker.lastAttackAt = this.time;
    attacker.lastDamage = damage;
    attacker.totalDamage += damage;
    // A bounded arcade impulse makes solid hits readable without toppling bodies.
    target.v = sub(target.v, mul(n, damage * 0.07));
    this.lastHit = { damage, speed: closing, acceleration, attacker: attacker.id };
    this.events.push({
      type: 'hit', point: c.a, normal: mul(n, -1), attacker: attacker.id,
      target: target.id, damage, speed: closing, acceleration,
      strength: clamp(damage / 30, 0.12, 1),
    });
  }
}
