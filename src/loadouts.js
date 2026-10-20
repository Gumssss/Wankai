import {CHARACTERS,characterName} from './character-catalog.js';
import {WEAPON_CATALOG,weaponName} from './weapon-catalog.js';
import {BEAGLE} from './beagle-profile.js';
import {CAT} from './orange-tabby-profile.js';

export const DEFAULT_LOADOUTS=Object.freeze([
  Object.freeze({characterId:'basic-fighter',weaponId:'sword'}),
  Object.freeze({characterId:'basic-fighter',weaponId:'polearm'}),
]);
const weapons=new Map(WEAPON_CATALOG.map(w=>[w.id,w]));

// Legacy string values are accepted only at boundary methods used by earlier
// scripts. Runtime state and the new picker always carry both canonical IDs.
export function normalizeLoadout(value){
  if(typeof value==='string')value=value==='beagle'||value==='long-ears'
    ?{characterId:'beagle',weaponId:'long-ears'}:{characterId:'basic-fighter',weaponId:value};
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
export const isEarLoadout=p=>p?.characterId==='beagle'&&(p.weaponId??p.weapon)==='long-ears';
export const isPawLoadout=p=>p?.characterId==='orange-tabby'&&(p.weaponId??p.weapon)==='cat-paws';
export const loadoutKey=p=>`${p.characterId}:${p.weaponId??p.weapon??'none'}`;
export const loadoutName=p=>`${characterName(p.characterId)} · ${weaponName(p.weaponId??p.weapon)}`;
export function resolveLoadout(value){
  const loadout=normalizeLoadout(value),ears=isEarLoadout(loadout),paws=isPawLoadout(loadout);
  return {...loadout,character:CHARACTERS[loadout.characterId],weapon:weapons.get(loadout.weaponId),
    bodyModel:paws?CAT.model:loadout.characterId==='beagle'?(ears?BEAGLE.model:BEAGLE.appearanceModel):null,
    weaponModel:ears||paws?null:`${loadout.weaponId}.glb`,controller:paws?'paws':ears?'ears':'floating',skill:ears?'ear-hover':null};
}
export const PLAYABLE_LOADOUTS=Object.freeze(Object.values(CHARACTERS).filter(c=>c.available)
  .flatMap(c=>WEAPON_CATALOG.filter(w=>canEquip(c.id,w.id)).map(w=>Object.freeze({characterId:c.id,weaponId:w.id}))));
