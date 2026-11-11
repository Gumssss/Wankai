export const GROWTH_START = 30;
export const GROWTH_END = 60;
export const MAX_FIGHTER_SCALE = 3;

export function growthAt(roundTime, enabled = true) {
  const progress = enabled ? Math.max(0, Math.min(1, (roundTime - GROWTH_START) / (GROWTH_END - GROWTH_START))) : 0;
  return { scale: 1 + (MAX_FIGHTER_SCALE - 1) * progress, damageScale: 1 + 0.25 * progress };
}

export const fighterScale = player => player.scale ?? 1;
export const fighterDamageScale = player => player.damageScale ?? 1;
