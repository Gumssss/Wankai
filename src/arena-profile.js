// Base podium measurements. Matches scale them with MATCH_ARENA_SCALE.
export const ARENA_PROFILE = Object.freeze({
  floorHeight: 0,
  radius: 6.45,
  weaponContactHeight: 0.84,
});

export function arenaPlacement(scale = 1) {
  return { scale, floorHeight: ARENA_PROFILE.floorHeight,
    radius: ARENA_PROFILE.radius * scale,
    weaponContactHeight: ARENA_PROFILE.weaponContactHeight * scale };
}
