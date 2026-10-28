import { STAMINA, weaponStats, staffFrame, fighterHeading } from './physics.js';
import { SKILLS } from './skills.js';

// The AI plays with exactly the inputs a person has ({theta, phi, skillTap,
// faceYaw}); it only reads the world. Holding W cartwheels a fighter along its
// weapon heading, so the core loop is: steer the heading, hold W, strike, rest.
export const AI_DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ label: '简单', reaction: 0.35, aimError: 0.32, reserve: 70, rest: 150, turnGain: 1.6, sweepChance: 0.05, guardChance: 0.1, skillChance: 0.3 }),
  normal: Object.freeze({ label: '普通', reaction: 0.18, aimError: 0.16, reserve: 45, rest: 120, turnGain: 2.4, sweepChance: 0.12, guardChance: 0.35, skillChance: 0.65 }),
  hard: Object.freeze({ label: '困难', reaction: 0.08, aimError: 0.06, reserve: 30, rest: 95, turnGain: 3.2, sweepChance: 0.18, guardChance: 0.7, skillChance: 1 }),
});

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Deterministic per seed, so a replayed match makes the same choices.
function random(seed) {
  let state = (seed >>> 0) || 1;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

// Steer around a prop that sits on the straight line to the target.
function detour(self, target, bearing, obstacles) {
  let best = bearing, nearest = Infinity;
  for (const obstacle of obstacles) {
    const dx = obstacle.x - self.p.x, dz = obstacle.z - self.p.z, distance = Math.hypot(dx, dz);
    if (distance > Math.hypot(target.p.x - self.p.x, target.p.z - self.p.z) || distance >= nearest) continue;
    const clearance = obstacle.extent + 1.2;
    // Does the heading pass within clearance of the prop centre?
    const along = dx * Math.cos(bearing) + dz * Math.sin(bearing);
    const across = Math.abs(-dx * Math.sin(bearing) + dz * Math.cos(bearing));
    if (along <= 0 || across > clearance) continue;
    const toProp = Math.atan2(dz, dx), spread = Math.asin(clamp(clearance / Math.max(distance, clearance), 0, 1));
    const left = toProp + spread, right = toProp - spread;
    best = Math.abs(wrap(left - bearing)) < Math.abs(wrap(right - bearing)) ? left : right;
    nearest = distance;
  }
  return best;
}

export function createAi({ difficulty = 'normal', seed = 1 } = {}) {
  const settings = AI_DIFFICULTIES[difficulty] || AI_DIFFICULTIES.normal;
  const roll = random(seed);
  const memory = {
    perceivedAt: -Infinity, seen: null, aimError: 0, resting: false,
    sweepUntil: -1, sweepSign: 1, guardUntil: -1, detourUntil: -1, detourAngle: 0,
    progressAt: 0, progressDistance: Infinity, progressHealth: Infinity, backoffUntil: -1, lastDrive: 1, chop: 1, skillCheckAt: 0,
  };

  // When the character's F skill pays off right now.
  function wantsSkill(self, target, distance, reach, now) {
    const skill = SKILLS[self.skill];
    if (!skill || self.skillCooldown > 0 || self.skillActive || now < memory.skillCheckAt) return false;
    memory.skillCheckAt = now + Math.max(0.25, settings.reaction * 2);
    const bearing = Math.atan2(target.p.z - self.p.z, target.p.x - self.p.x);
    const useful = skill.id === 'laugh' ? distance < reach * 1.8 && target.stamina > 70
      : skill.id === 'twist' ? distance > reach * 2.4 || now - memory.progressAt > 2
      : skill.id === 'delivery' ? distance > 3 && distance < 11 && Math.abs(wrap(fighterHeading(self) - bearing)) < 0.12
      : skill.id === 'happy' ? self.health < 70 : false;
    return useful && roll() < settings.skillChance;
  }

  return {
    difficulty,
    settings,
    reset() { Object.assign(memory, { perceivedAt: -Infinity, seen: null, resting: false, sweepUntil: -1, guardUntil: -1, detourUntil: -1,
      progressAt: 0, progressDistance: Infinity, progressHealth: Infinity, backoffUntil: -1, skillCheckAt: 0 }); },
    think(world, selfId) {
      const self = world.players[selfId], target = world.players[1 - selfId];
      if (!self || !target || self.health <= 0) return { theta: 0, phi: 0 };
      const input = this.move(world, self, target);
      const reach = weaponStats(self).offset + weaponStats(self).length;
      if (wantsSkill(self, target, Math.hypot(target.p.x - self.p.x, target.p.z - self.p.z), reach, world.time)) input.skillTap = true;
      return input;
    },
    move(world, self, target) {
      const now = world.time;
      // Perception refreshes at the reaction interval; between refreshes the AI
      // acts on what it last saw, which is what makes easier levels beatable.
      if (now - memory.perceivedAt >= settings.reaction) {
        memory.perceivedAt = now;
        memory.seen = { p: { ...target.p }, v: { ...target.v }, tip: staffFrame(target).velocity, contactSpeed: target.contactSpeed };
        memory.aimError = (roll() * 2 - 1) * settings.aimError;
      }
      const seen = memory.seen;
      const lead = Math.min(0.4, settings.reaction + 0.1);
      const aimX = seen.p.x + seen.v.x * lead, aimZ = seen.p.z + seen.v.z * lead;
      const dx = aimX - self.p.x, dz = aimZ - self.p.z, distance = Math.hypot(dx, dz);
      const weapon = weaponStats(self), reach = weapon.offset + weapon.length;
      const faceYaw = Math.atan2(target.p.z - self.p.z, target.p.x - self.p.x);

      // Stamina: stop swinging below the reserve and wait to refill.
      if (self.stamina < settings.reserve) memory.resting = true;
      if (memory.resting && self.stamina >= Math.min(STAMINA.max, settings.rest)) memory.resting = false;

      let bearing = Math.atan2(dz, dx) + memory.aimError;
      if (distance > reach * 1.4) bearing = detour(self, { p: { x: aimX, z: aimZ } }, bearing, world.obstacles || []);
      // Progress is getting closer or dealing damage. A weapon wedged against a
      // prop or the rim cannot turn, so when stuck: cartwheel back out, then
      // approach from a side angle.
      if (distance < memory.progressDistance - 0.6 || target.health < memory.progressHealth) {
        memory.progressDistance = distance; memory.progressHealth = target.health; memory.progressAt = now;
      } else if (!memory.resting && now - memory.progressAt > 3 && now > memory.detourUntil) {
        memory.backoffUntil = now + 0.6;
        memory.detourUntil = distance > reach * 1.4 ? now + 2 : now;
        memory.detourAngle = (roll() < 0.5 ? -1 : 1) * (0.7 + roll() * 0.5);
        memory.progressAt = now; memory.progressDistance = distance;
      }
      if (now < memory.backoffUntil && !memory.resting) return { theta: -memory.lastDrive, phi: 0, faceYaw };
      if (now < memory.detourUntil) bearing += memory.detourAngle;
      // Never cartwheel into the rim: bias the heading back toward the centre.
      const radius = Math.hypot(self.p.x, self.p.z), rim = world.arenaRadius || 19;
      if (radius > rim - 3) {
        const inward = Math.atan2(-self.p.z, -self.p.x);
        if (Math.cos(wrap(bearing - inward)) < 0.2) bearing = inward + Math.sign(wrap(bearing - inward)) * 1.2;
      }

      // S cartwheels backward, so a target behind the weapon plane is reached by
      // reversing rather than turning all the way around.
      const forwardError = wrap(bearing - self.phi), backwardError = wrap(bearing + Math.PI - self.phi);
      const reverse = Math.abs(backwardError) + 0.35 < Math.abs(forwardError);
      const drive = reverse ? -1 : 1;
      const error = reverse ? backwardError : forwardError;
      const turnSpeed = clamp(error * settings.turnGain, -weapon.maxAngularSpeed, weapon.maxAngularSpeed);
      let phi = clamp((turnSpeed - self.wp) * 0.9, -1, 1);
      if (Math.abs(error) < 0.04 && Math.abs(self.wp) < 0.2) phi = 0;
      const input = { theta: 0, phi, faceYaw };

      if (memory.resting) {
        // Turning costs stamina too, so rest completely.
        input.phi = 0;
        return input;
      }

      const close = distance < reach * 1.4;
      // Guard: an incoming fast swing gets a reversed swing to meet it.
      if (close && now >= memory.guardUntil && seen.contactSpeed > 7 && roll() < settings.guardChance * 0.05) memory.guardUntil = now + 0.25;
      if (now < memory.guardUntil) { input.theta = -drive; return input; }
      // Occasional horizontal sweep when in range.
      if (close && now >= memory.sweepUntil && roll() < settings.sweepChance * 0.02) {
        memory.sweepUntil = now + 0.45; memory.sweepSign = roll() < 0.5 ? -1 : 1;
      }
      if (now < memory.sweepUntil) { input.phi = memory.sweepSign; input.theta = 0; return input; }

      const strike = distance < reach + 0.4;
      if (!strike) {
        // Travel: hold W (or S) along an aligned heading to cartwheel closer.
        if (Math.abs(error) < 0.55) { input.theta = drive; memory.lastDrive = drive; }
      } else if (distance < weapon.offset * 0.75) {
        // Inside the weapon's reach gap: step back out before striking.
        input.theta = -1;
        memory.lastDrive = -1;
      } else {
        // Chop in place instead of cartwheeling past: W brings the weapon down
        // through the target, S lifts it back over the top, and repeat.
        const forward = Math.abs(forwardError) < 0.8;
        const phase = wrap(self.theta);
        if (memory.chop === 1 && phase > 2.3) memory.chop = -1;
        else if (memory.chop === -1 && phase < -0.25) memory.chop = 1;
        input.phi = clamp((clamp(forwardError * settings.turnGain, -weapon.maxAngularSpeed, weapon.maxAngularSpeed) - self.wp) * 0.9, -1, 1);
        if (forward) { input.theta = memory.chop; memory.lastDrive = memory.chop; }
      }
      return input;
    },
  };
}
