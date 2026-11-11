// Presentation tuning only. Damage, hit acceptance and timers remain host-owned.
export const FEEDBACK = Object.freeze({
  HEAVY_DAMAGE: 22, DIRECT_HIT_GAIN: 10 ** (3 / 20),
  BURST_LIFE: 0.18, HEAVY_RING_LIFE: 0.3, RECOIL_LIFE: 0.2,
  RECOIL_ANGLE: 4 * Math.PI / 180, HEAVY_RECOIL_ANGLE: 8 * Math.PI / 180,
  SQUASH: 0.06, KICK_LIFE: 0.28, KICK_ANGLE: 2.4 * Math.PI / 180, KICK_TRANSLATION: 0.18,
  FINISH_LIFE: 0.6, FINISH_HOLD: 0.14, NUMBER_MERGE_WINDOW: 0.45,
  MAX_PARTICLES: 256, MAX_BURSTS: 8, MAX_ACCENTS: 16, MAX_RINGS: 16,
  PERFUME_RATE: 30, HEAL_LIFE: 0.25, TRAIL_POINTS: 12,
});
export const WEAPON_FAMILIES = Object.freeze({
  sword: 'slash', polearm: 'slash', axe: 'slash', hammer: 'heavy', mace: 'heavy',
  pan: 'pan', 'cat-paws': 'paw', 'happy-paws': 'paw', 'maodie-paw': 'paw',
  'long-ears': 'ear', 'yellow-staff': 'blunt', 'takeout-box': 'box',
  'crowned-heart': 'heart', 'soccer-ball': 'ball',
});
export function classifyImpact(event = {}) {
  let kind = 'other';
  if (event.type === 'hit' && event.damage > 0) kind = event.source === 'bleed' || event.source === 'perfume' ? 'bleed' : 'direct';
  else if (event.type === 'clash') kind = 'clash';
  else if (event.type === 'soccer-bounce') kind = 'bounce';
  else if (event.type === 'bleed-stack') kind = 'stack';
  else if (event.type === 'heal' && event.amount > 0) kind = 'heal';
  const family = event.source === 'soccer' ? 'ball' : event.source === 'delivery' ? 'box' : WEAPON_FAMILIES[event.weapon] ?? 'blunt';
  return { kind, family, heavy: kind === 'direct' && event.damage >= FEEDBACK.HEAVY_DAMAGE,
    strength: Math.min(1, Math.max(0, Number.isFinite(event.strength) ? event.strength : 0)),
    gain: kind === 'direct' ? FEEDBACK.DIRECT_HIT_GAIN : 1 };
}
export function damagePopScale(age) {
  if (!(age >= 0)) return 0.75;
  if (age < 0.045) return 0.75 + 0.4 * (1 - (1 - age / 0.045) ** 2);
  if (age < 0.12) return 1.15 - 0.15 * ((age - 0.045) / 0.075);
  return 1;
}
export function recoilEnvelope(age) {
  if (!(age > 0) || age >= FEEDBACK.RECOIL_LIFE) return 0;
  if (age < 0.04) return Math.sin(age / 0.04 * Math.PI / 2);
  if (age < 0.13) return 1 - 1.18 * (age - 0.04) / 0.09;
  return -0.18 * (1 - (age - 0.13) / 0.07);
}
export function damageCameraKick(damage) {
  if (!Number.isFinite(damage) || damage <= 0) return null;
  const strength = Math.sqrt(Math.min(1, damage / 30));
  return { duration: .12 + .16 * strength,
    angle: (.2 + 2.2 * strength) * Math.PI / 180,
    translation: .015 + .165 * strength };
}
export function kickEnvelope(age, duration = FEEDBACK.KICK_LIFE) {
  if (!(age >= 0) || age >= duration) return 0;
  const t = age / duration;
  return Math.sin(Math.PI / 2 * Math.min(1, t / .12)) * (1 - t) ** 2;
}
