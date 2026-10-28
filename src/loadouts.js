import {CHARACTERS,characterName} from './character-catalog.js';
import {WEAPON_CATALOG,weaponName} from './weapon-catalog.js';
import {skillFor} from './skills.js';

export const DEFAULT_LOADOUTS=Object.freeze([
  Object.freeze({characterId:'naiwa',weaponId:'yellow-staff'}),
  Object.freeze({characterId:'dudu',weaponId:'takeout-box'}),
]);
const weapons=new Map(WEAPON_CATALOG.map(w=>[w.id,w]));

export function normalizeLoadout(value){
  const {characterId,weaponId}=value||{};
  const character=CHARACTERS[characterId],weapon=weapons.get(weaponId);
  if(!character?.available)throw new Error(`Unknown or unavailable character: ${characterId}`);
  if(!weapon)throw new Error(`Unknown weapon: ${weaponId}`);
  if(!weapon.available)throw new Error(`Unavailable weapon: ${weaponId}`);
  if(weapon.characterId&&weapon.characterId!==characterId)throw new Error(`${weapon.name} is unavailable for ${characterId}`);
  if(character.weaponIds&&!character.weaponIds.includes(weaponId))throw new Error(`${weapon.name} is unavailable for ${characterId}`);
  return {characterId,weaponId};
}
export function isValidLoadout(value){try{normalizeLoadout(value);return true;}catch{return false;}}
export function canEquip(characterId,weaponId){return isValidLoadout({characterId,weaponId});}
export const loadoutKey=p=>`${p.characterId}:${p.weaponId??p.weapon??'none'}`;
export const loadoutName=p=>`${characterName(p.characterId)} · ${weaponName(p.weaponId??p.weapon)}`;
// Every weapon, exclusive or common, floats beside the body under the same controller.
export function resolveLoadout(value){
  const loadout=normalizeLoadout(value);
  return {...loadout,character:CHARACTERS[loadout.characterId],weapon:weapons.get(loadout.weaponId),skill:skillFor(loadout.characterId)};
}
export const weaponsFor=characterId=>WEAPON_CATALOG.filter(w=>canEquip(characterId,w.id));
export const PLAYABLE_LOADOUTS=Object.freeze(Object.values(CHARACTERS).filter(c=>c.available)
  .flatMap(c=>weaponsFor(c.id).map(w=>Object.freeze({characterId:c.id,weaponId:w.id}))));
