import { ARENA_SKINS, DEFAULT_ARENA_SKIN, isArenaSkin } from './arena-skins.js';
import { buildCourtyard } from './arenas/courtyard.js';
import { buildColosseum } from './arenas/colosseum.js';
import { buildLakeside } from './arenas/lakeside.js';

// Match arena: picks the skin builder. Every skin keeps the same world facts
// (floor at y = 0, rim at `radius`, solid up to `rimHeight`, props on the
// obstacle volumes) and returns { group, fog, props, update(dt, camera, focus, fighters) };
// fighters (both players' positions, or null) aim the see-through cut-outs.
// Without an explicit rimHeight the skin's own (src/arena-skins.js) is used.
const BUILDERS = Object.freeze({ courtyard: buildCourtyard, colosseum: buildColosseum, lakeside: buildLakeside });

export function buildArena({ skin = DEFAULT_ARENA_SKIN, radius, rimHeight, obstacles, anisotropy = 4 }) {
  const id = isArenaSkin(skin) ? skin : DEFAULT_ARENA_SKIN;
  const builder = BUILDERS[id] ?? BUILDERS[DEFAULT_ARENA_SKIN];
  return builder({ radius, rimHeight: rimHeight ?? ARENA_SKINS.find(entry => entry.id === id)?.rimHeight, obstacles, anisotropy });
}
