import { SENSITIVITY_RANGE } from './free-camera.js';
import { DEFAULT_ARENA_SKIN, isArenaSkin } from './arena-skins.js';

// Per-machine preferences. Storage can be missing or blocked (private windows,
// tests), so every read and write is guarded and defaults always apply.
// difficulty and arena remember the last choices made on the setup screen.
const KEY = 'mukun-arena-settings';
export const DEFAULT_SETTINGS = Object.freeze({ sensitivity: 1, invertY: false, sound: true, music: 0.5, sfx: 0.8,
  difficulty: 'normal', arena: DEFAULT_ARENA_SKIN });

const clampSensitivity = value => Math.min(SENSITIVITY_RANGE.max, Math.max(SENSITIVITY_RANGE.min, Number(value) || 1));
const volume = (value, fallback) => Number.isFinite(Number(value)) ? Math.min(1, Math.max(0, Number(value))) : fallback;

export function sanitizeSettings(value = {}) {
  return {
    sensitivity: clampSensitivity(value.sensitivity ?? DEFAULT_SETTINGS.sensitivity),
    invertY: value.invertY === true,
    sound: value.sound ?? DEFAULT_SETTINGS.sound,
    music: volume(value.music ?? DEFAULT_SETTINGS.music, DEFAULT_SETTINGS.music),
    sfx: volume(value.sfx ?? DEFAULT_SETTINGS.sfx, DEFAULT_SETTINGS.sfx),
    difficulty: ['easy', 'normal', 'hard'].includes(value.difficulty) ? value.difficulty : DEFAULT_SETTINGS.difficulty,
    arena: isArenaSkin(value.arena) ? value.arena : DEFAULT_SETTINGS.arena,
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  try { return sanitizeSettings(JSON.parse(storage?.getItem(KEY) || '{}')); }
  catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(settings, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, JSON.stringify(sanitizeSettings(settings))); } catch { /* Preferences are optional. */ }
}
