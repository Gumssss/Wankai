// Upright bodies + two angular degrees of freedom per staff.
// Contact impulses use the staff Jacobian: rotation and translation respond
// together. No locomotion force is added by the input controller.
import { BEAGLE } from './beagle-profile.js';
import {CHARACTERS} from './character-catalog.js';
import {normalizeLoadout,isEarLoadout,isPawLoadout} from './loadouts.js';
import {CAT} from './orange-tabby-profile.js';
import {BEAGLE_COMMON_OFFSETS} from './character-attachments.js';
import { BEAGLE_SKILL, beaglePointFrame, updateBeagleSkill, applyBeagleHover } from './beagle-skill.js';
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
});
export const STAMINA = Object.freeze({
  max: 200,
  swingDrain: 20,
  turnDrain: 8,
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
export const SOLO_ARENA_SCALE = 3;
export const arenaScaleForMode = mode => mode === 'solo' || mode === 'duel' || mode === 'duel-fixed' ? SOLO_ARENA_SCALE : 1;

// These measured contacts were authored for the 2.35-unit model. The renderer
// normalizes the unchanged GLB to staffLength, so scale its contacts identically.
const polearmModelScale = CONFIG.staffLength / 2.35;

export const WEAPONS = Object.freeze({
  'yellow-staff':Object.freeze({length:1.8,offset:1.25,radius:.115,inertia:3.5,
    motorAcceleration:28,brakeAcceleration:36,maxAngularSpeed:5,
    colliders:Object.freeze([{a:[0,.115,0],b:[0,1.685,0],radius:.115}])}),
  'cat-paws': CAT.weapon,
  'long-ears': BEAGLE,
  polearm: Object.freeze({ length: CONFIG.staffLength, offset: CONFIG.staffOffset, radius: CONFIG.staffRadius * polearmModelScale,
    inertia: CONFIG.inertia, motorAcceleration: CONFIG.motorAcceleration,
    brakeAcceleration: CONFIG.polarBrakeAcceleration, maxAngularSpeed: CONFIG.maxAngularSpeed,
    // Keep the original shaft; measured additions follow the collar, blade,
    // curved tip and rear barb in the unchanged GLB's normalized local space.
    colliders: Object.freeze([
      { a: [0, 0, 0], b: [0, 2.35, 0], radius: 0.085 },
      { a: [0.015287, 1.455, -0.007369], b: [0.036999, 1.560, 0.000220], radius: 0.070 },
      { a: [0.041059, 1.640, 0.003758], b: [0.039410, 2.040, 0.008478], radius: 0.060 },
      { a: [-0.044368, 2.130, -0.015507], b: [-0.103840, 2.238, -0.036294], radius: 0.045 },
      { a: [-0.061360, 1.990, -0.021446], b: [-0.052864, 2.080, -0.018477], radius: 0.045 },
    ].map(({a,b,radius,...contact}) => ({...contact,
      a:a.map(value=>value*polearmModelScale), b:b.map(value=>value*polearmModelScale), radius:radius*polearmModelScale}))) }),
  sword: Object.freeze({ length: 1.45, offset: 1.2, radius: 0.09,
    inertia: 2.8, motorAcceleration: 38,
    brakeAcceleration: 48, maxAngularSpeed: 6.1,
    // The broad solid guard needs coverage; decorative flame wisps do not.
    colliders: Object.freeze([
      { a: [0, 0, 0], b: [0, 1.45, 0], radius: 0.09 },
      { a: [-0.104551, 0.428, 0.009696], b: [-0.019915, 0.402, 0.001847], radius: 0.045 },
      { a: [-0.019915, 0.402, 0.001847], b: [0.114509, 0.424, -0.010619], radius: 0.045 },
    ]) }),
  hammer: Object.freeze({ length: 1.9, offset: 1.3, radius: 0.09,
    inertia: 5.8, motorAcceleration: 18,
    brakeAcceleration: 22, maxAngularSpeed: 3.4,
    // Native +Y coordinates, normalized to 1.9 units. The hanging cloth is visual only.
    colliders: Object.freeze([
      { a: [0, 0.0951, 0], b: [0, 1.2746, 0], radius: 0.0951 },
      { a: [0.019, 1.2175, 0], b: [-0.019, 1.7692, 0], radius: 0.1427, damageScale: 1.3 },
      { a: [-0.3805, 1.5029, 0], b: [-0.2473, 1.8358, 0], radius: 0.1046, damageScale: 1.3 },
      { a: [-0.3805, 1.5029, 0], b: [-0.1997, 1.2175, 0], radius: 0.0951, damageScale: 1.3 },
      { a: [0.1807, 1.4363, 0], b: [0.2188, 1.6646, 0], radius: 0.1332, damageScale: 1.3 },
    ]) }),
});

const beagleFloating=Object.freeze(Object.fromEntries(Object.entries(BEAGLE_COMMON_OFFSETS).map(([id,offset])=>[id,Object.freeze({...WEAPONS[id],offset})])));
export const characterStats=player=>CHARACTERS[player.characterId] || CHARACTERS['basic-fighter'];
export const weaponStats=player=>player.characterId==='beagle'&&beagleFloating[player.weapon] ? beagleFloating[player.weapon] : WEAPONS[player.weapon] || WEAPONS.polearm;

export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
const add = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a) => Math.hypot(a.x, a.y, a.z);
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const unit = (a, fallback = v3(1, 0, 0)) => length(a) > 1e-8 ? mul(a, 1 / length(a)) : fallback;
const invMass = 1 / CONFIG.mass;

export function makePlayer(id, selection = 'polearm') {
  const {characterId,weaponId:weapon}=normalizeLoadout(selection);
  const paws=isPawLoadout({characterId,weapon});
  const phi = id === 0 ? 0 : Math.PI;
  return {
    id,
    characterId,
    weapon,
    p: v3(id === 0 ? -2.2 : 2.2, CONFIG.bodyFloor+(paws?CAT.hoverHeight:0), 0),
    v: v3(),
    // The long polearm starts raised so two fighters can face each other
    // without their weapons overlapping before either player acts.
    theta: WEAPONS[weapon]?.initialTheta ?? (weapon === 'sword' ? Math.PI / 2 : 0.4),
    polarInput: 0,
    phi,
    // The fighter's face follows the weapon's horizontal direction.
    facingOffset: 0,
    wt: 0,
    wp: 0,
    bodyPitch: 0, bodyRate: 0, vaulting: false, earPush: false,
    skillActive: false, skillRemaining: 0, skillWasHeld: false, skillRequested: false,
    earSpread: 0, earSpreadRate: 0, earLag: 0, earLagRate: 0,
    driveT: 0,
    driveP: 0,
    health: CONFIG.maxHealth,
    stamina: STAMINA.max,
    staminaRestTime: 0,
    grounded: !paws,
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

function recoilFromClash(player, speed) {
  const heading = fighterHeading(player);
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
export function weaponPointFrame(player, local, anchor) {
  if(isPawLoadout(player)){
    const st=Math.sin(player.theta),ct=Math.cos(player.theta),sp=Math.sin(player.phi),cp=Math.cos(player.phi);
    const x=local.x*ct+local.y*st,z=local.z;
    const r=v3(x*cp-z*sp,-CAT.bodyFloor-local.x*st+local.y*ct,x*sp+z*cp);
    const dx=-local.x*st+local.y*ct;
    const jt=v3(dx*cp,-local.x*ct-local.y*st,dx*sp),jp=v3(-r.z,0,r.x);
    return {r,jt,jp,point:add(player.p,r),velocity:add(player.v,add(mul(jt,player.wt),mul(jp,player.wp)))};
  }
  const weapon = weaponStats(player);
  const attached = weapon.attachment === 'ears';
  const socket = attached ? (anchor || [0, (weapon.anchors.L[1] + weapon.anchors.R[1]) / 2, 0]) : [0, 0, 0];
  if (attached) return beaglePointFrame(player, local, socket);
  const y = weapon.offset + local.y;
  const st = Math.sin(player.theta), ct = Math.cos(player.theta);
  const sp = Math.sin(player.phi), cp = Math.cos(player.phi);
  const x = local.x * ct + y * st + socket[0], z = local.z + socket[2];
  const r = v3(x * cp - z * sp, socket[1] - local.x * st + y * ct, x * sp + z * cp);
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
      a: weaponPointFrame(player, localA, collider.anchor).point, b: weaponPointFrame(player, localB, collider.anchor).point };
  });
}

const segmentFrame = (player, segment, fraction) => weaponPointFrame(player,
  add(segment.localA, mul(sub(segment.localB, segment.localA), fraction)), segment.anchor);

export function bodyRadius(player) { return characterStats(player).bodyRadius; }

export function bodyPointFrame(player, local) {
  if (isEarLoadout(player)) return beaglePointFrame(player, local);
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
    { local: segment.localA, radius: segment.radius, anchor: segment.anchor },
    { local: segment.localB, radius: segment.radius, anchor: segment.anchor },
  ]);
}

function phiInertia(p) {
  const weapon = weaponStats(p);
  return weapon.inertia * Math.max(0.15, Math.sin(p.theta) ** 2) + (weapon.yawAnchorInertia || 0);
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
  const cost = p.skillActive ? 0 : Math.abs(p.polarInput) * STAMINA.swingDrain + Math.abs(turnInput) * STAMINA.turnDrain;
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
  const gravityAcceleration = isPawLoadout(p)?0:CONFIG.gravity * center / radiusSquared * Math.sin(p.theta);
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
      const anchorReach = shape.anchor ? Math.hypot(...shape.anchor) : 0;
      reach = Math.max(reach, Math.hypot(point[0], weapon.offset + point[1], point[2]) + anchorReach + shape.radius);
    }
  }
  const theta = player.theta - start.theta, phi = headingDelta(player.phi, start.phi);
  const spread=(player.earSpread||0)-(start.earSpread||0),lag=(player.earLag||0)-(start.earLag||0);
  return { theta, phi, spread, lag, radius,
    travel: length(sub(player.p, start.p)) + reach * (Math.abs(theta) + Math.abs(phi) + Math.abs(spread) + Math.abs(lag)) };
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
    theta: start.theta + motion.theta * t, phi: start.phi + motion.phi * t,
    earSpread:(start.earSpread||0)+motion.spread*t,earLag:(start.earLag||0)+motion.lag*t });
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

  reset(practice = false, solo = false, firstWeapon = 'polearm', secondWeapon = 'polearm', arenaScale = solo ? SOLO_ARENA_SCALE : 1) {
    firstWeapon=normalizeLoadout(firstWeapon);
    secondWeapon=normalizeLoadout(secondWeapon);
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
    this.practice = practice;
    this.solo = solo;
    this.arenaRadius = CONFIG.arenaRadius * arenaScale;
    this.arenaRimHeight = arenaPlacement(arenaScale).weaponContactHeight;
    this.contacts = this.players.map(() => ({ separated: 1 }));
    this.lastClash = -1;
    this.clashArmed = true;
    this.clashSeparated = CLASH.separationDelay;
    this.lastHit = null;
    if (practice) {
      this.players[0].p.x = -1.45;
      this.players[1].p.x = 1.45;
      if(!isPawLoadout(this.players[1]))this.players[1].theta = 0.28;
    }
  }

  step(inputs, dt = CONFIG.step) {
    const finished = this.winner !== null;
    if (this.winner === -1) { this.events.length = 0; return; }
    this.events.length = 0;
    this.time += dt;
    const previous = this.players.map(p => ({ p: { ...p.p }, theta: p.theta, phi: p.phi, earSpread:p.earSpread, earLag:p.earLag }));
    for (const p of this.players) {
      if (finished && p.id !== this.winner) continue;
      const weapon = weaponStats(p);
      const input = inputs[p.id] || { theta: 0, phi: 0 };
      this.setPolarInput(p.id, input.theta || 0);
      const rawTurnInput = clamp(input.phi || 0, -1, 1);
      const turnInput = isPawLoadout(p)?(p.polarInput||rawTurnInput?clamp((rawTurnInput*CAT.normalTurnSpeed-p.wp)*CAT.steeringGain,-1,1):0):rawTurnInput;
      if (isEarLoadout(p)) {
        p.bodyPitch=0;p.bodyRate=0;
        updateBeagleSkill(p,input.skill,dt);
        if(p.skillActive || p.earSpread>.001)p.polarInput=0;
      }
      updateStamina(p, isPawLoadout(p)?rawTurnInput:turnInput, dt);
      const power = staminaPower(p.stamina);
      // Yaw keeps its existing reversal strength; pitch uses the stronger brake.
      const motorP = motorAcceleration(p.wp, turnInput, weapon, power, dt, weapon.motorAcceleration);
      const previousT = p.wt, previousP = p.wp;
      const damp = Math.exp(-CONFIG.damping * dt);
      if(isEarLoadout(p)){
        const rotor=p.skillActive || p.earSpread>.001;
        if(rotor){
          const error=Math.atan2(Math.sin(-Math.PI/2-p.theta),Math.cos(-Math.PI/2-p.theta));
          const target=clamp(error*8,-weapon.maxAngularSpeed,weapon.maxAngularSpeed);
          p.wt+=clamp(target-p.wt,-BEAGLE_SKILL.pitchAcceleration*dt,BEAGLE_SKILL.pitchAcceleration*dt);
        }else drivePolarAngle(p,dt,power);
        if(p.skillActive){
          const target=(turnInput || Math.sign(p.wp) || 1)*BEAGLE_SKILL.spinSpeed;
          p.wp+=clamp(target-p.wp,-weapon.motorAcceleration*dt,weapon.motorAcceleration*dt);
        }else{
          const assist=(p.polarInput || turnInput) ? clamp((turnInput*BEAGLE_SKILL.normalTurnSpeed*power-p.wp)*BEAGLE_SKILL.steeringGain,-1,1) : 0;
          const motor=motorAcceleration(p.wp,assist,weapon,power,dt,weapon.motorAcceleration);
          p.wp=clamp((p.wp+motor*dt)*damp,-weapon.maxAngularSpeed,weapon.maxAngularSpeed);
        }
      }else{
        drivePolarAngle(p, dt, power);
        p.wp = clamp((p.wp + motorP * dt) * damp, -weapon.maxAngularSpeed, weapon.maxAngularSpeed);
      }
      p.theta += p.wt * dt;
      // Net angular acceleration before contact, including damping/speed limits.
      // Holding an already-max-speed motor does not award an acceleration bonus.
      const smooth = 1 - Math.exp(-dt / 0.09);
      p.driveT += ((p.wt - previousT) / dt - p.driveT) * smooth;
      p.driveP += ((p.wp - previousP) / dt - p.driveP) * smooth;
      if(isEarLoadout(p))applyBeagleHover(p,dt,CONFIG.gravity);
      if(isPawLoadout(p)){
        const lift=clamp(CONFIG.gravity+CAT.hoverGain*(CAT.bodyFloor+CAT.hoverHeight-p.p.y)-CAT.hoverDamping*p.v.y,0,CONFIG.gravity+12);
        p.v.y+=lift*dt;
      }
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
      }
      if (!finished && !this.solo) this.solveBodies();
    }
    if (!finished && !this.solo) {
      this.solveStaffClash(dt, previous);
      this.solveAttack(this.players[0], this.players[1], dt, previous);
      this.solveAttack(this.players[1], this.players[0], dt, previous);
    }
    for (const p of this.players) {
      if (finished && p.id !== this.winner) continue;
      // Body separation can push a fighter slightly past the rim on the last
      // contact pass. Reapply the body boundary after pair contacts finish.
      this.solveBodyWall(p);
      const speed = length(p.v);
      if (speed > 15) p.v = mul(p.v, 15 / speed);
      // Contacts cannot restore the old fast spin after the motor was capped.
      const limit = weaponStats(p).maxAngularSpeed;
      p.wt = clamp(p.wt, -limit, limit);
      p.wp = clamp(p.wp, -limit, limit);
      p.contactSpeed = length(staffFrame(p).velocity);
      if (this.practice && p.id === 1 && this.time - p.lastHitAt > 2.5) p.health = CONFIG.maxHealth;
    }
    if (!finished && !this.practice && !this.solo) {
      const dead = this.players.map(p => p.health <= 0);
      if (dead[0] || dead[1]) this.winner = dead[0] && dead[1] ? -1 : dead[0] ? 1 : 0;
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

  solveWeaponGroundPoint(p, { local, radius, anchor }, dt) {
    let f = weaponPointFrame(p, local, anchor);
    const penetration = radius - (f.point.y - ARENA_PROFILE.floorHeight);
    if (penetration < -0.008) return;
    p.staffGrounded = true;
    const n = v3(0, 1, 0);
    const bias = Math.max(0, penetration - 0.002) * 0.2 / dt;
    const j = Math.max(0, (bias - f.velocity.y) / effectiveMass(p, f, n));
    impulse(p, f, mul(n, j));
    f = weaponPointFrame(p, local, anchor);
    const tangent = v3(f.velocity.x, 0, f.velocity.z);
    const speed = length(tangent);
    if (speed > 1e-6 && j > 0) {
      const t = mul(tangent, -1 / speed);
      const friction = Math.min(speed / effectiveMass(p, f, t), CONFIG.grip * j);
      impulse(p, f, mul(t, friction));
    }
  }

  solveBodyWall(p) {
    if(p.characterId==='beagle'){
      for(const shape of hurtSegments(p))for(const point of [shape.a,shape.b]){
        const distance=Math.hypot(point.x,point.z),overlap=distance+shape.radius-this.arenaRadius;
        if(overlap<=0)continue;
        const n=v3(-point.x/distance,0,-point.z/distance);
        p.p=add(p.p,mul(n,overlap));
        const speed=dot(p.v,n);
        if(speed<0)p.v=sub(p.v,mul(n,1.16*speed));
      }
      return;
    }
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
    for (const { local, radius, anchor } of surfacePoints(p)) {
      const f = weaponPointFrame(p, local, anchor);
      const r = Math.hypot(f.point.x, f.point.z);
      if (f.point.y >= this.arenaRimHeight || r <= this.arenaRadius - radius) continue;
      const n = v3(-f.point.x / r, 0, -f.point.z / r);
      const bias = Math.min(4, (r - this.arenaRadius + radius) * 0.15 / dt);
      const j = Math.max(0, (bias - dot(f.velocity, n)) / effectiveMass(p, f, n));
      impulse(p, f, mul(n, j));
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
      this.events.push({ type: 'clash', point: mul(add(c.a, c.b), 0.5),
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
    target.health = Math.max(this.practice ? 1 : 0, target.health - damage);
    target.hitFlash = 1;
    target.lastHitAt = this.time;
    attacker.lastAttackAt = this.time;
    attacker.lastDamage = damage;
    attacker.totalDamage += damage;
    // A bounded arcade impulse makes solid hits readable without toppling bodies.
    target.v = sub(target.v, mul(n, damage * 0.07));
    this.lastHit = { damage, speed: closing, acceleration, turnShare, attacker: attacker.id };
    this.events.push({
      type: 'hit', point: c.a, normal: mul(n, -1), attacker: attacker.id,
      target: target.id, damage, speed: closing, acceleration, turnShare,
      strength: clamp(damage / 30, 0.12, 1),
    });
  }
}
