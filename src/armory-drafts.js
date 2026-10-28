import { CHARACTERS } from './character-catalog.js';
import { DEFAULT_LOADOUTS, normalizeLoadout, canEquip, isValidLoadout, weaponsFor } from './loadouts.js';

// Slot 0 is the local fighter, slot 1 the AI opponent. Picker choices remain
// local until the start action commits them to the session.
export function createDrafts(loadouts = DEFAULT_LOADOUTS) {
  return loadouts.map(loadout => ({ ...normalizeLoadout(loadout), ready: false }));
}
export function updateDraft(drafts, id, patch) {
  const current = drafts[id];
  if (!current) return drafts;
  const characterId = patch.characterId ?? current.characterId;
  if (!CHARACTERS[characterId]?.available) return drafts;
  // Keep the weapon when the new character can hold it; otherwise take its
  // first weapon (the catalog lists exclusive weapons first).
  const weaponId = Object.hasOwn(patch, 'weaponId') ? patch.weaponId
    : canEquip(characterId, current.weaponId) ? current.weaponId : weaponsFor(characterId)[0]?.id ?? null;
  if (weaponId !== null && !canEquip(characterId, weaponId)) return drafts;
  if (characterId === current.characterId && weaponId === current.weaponId) return drafts;
  return drafts.map((draft, index) => index === id ? { characterId, weaponId, ready: false } : draft);
}
export function toggleReady(drafts, id) {
  if (id !== 0 || !isValidLoadout(drafts[id])) return drafts;
  return drafts.map((draft, index) => index === id ? { ...draft, ready: !draft.ready } : draft);
}
