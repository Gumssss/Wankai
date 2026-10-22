// Measured/regularized in assets/concepts/colosseum/prepared-v01/.
// One game unit per GLB unit, Y up, level playable floor at the root origin.
export const ARENA_PROFILE = Object.freeze({
  model: 'colosseum-prepared-v01.glb',
  floorTexture: 'colosseum-roman-floor-v01.jpg',
  floorHeight: 0,
  radius: 6.45,
  weaponContactHeight: 0.84,
  floorMesh: 'SM_Arena_Floor',
  sectorPrefix: 'SM_Arena_Shell_',
  sectorCount: 8,
});

export function arenaPlacement(scale = 1) {
  return { scale, floorHeight: ARENA_PROFILE.floorHeight,
    radius: ARENA_PROFILE.radius * scale,
    weaponContactHeight: ARENA_PROFILE.weaponContactHeight * scale };
}
