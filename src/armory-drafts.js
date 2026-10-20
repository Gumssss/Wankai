import {CHARACTERS} from './character-catalog.js';
import {DEFAULT_LOADOUTS,normalizeLoadout,canEquip,isValidLoadout} from './loadouts.js';

// Picker choices remain local until the shared action commits both players.
export function createDrafts(loadouts=DEFAULT_LOADOUTS){
  return loadouts.map(loadout=>({...normalizeLoadout(loadout),ready:false}));
}
export function updateDraft(drafts,id,patch){
  const current=drafts[id];
  if(!current||![0,1].includes(id))return drafts;
  const characterId=patch.characterId??current.characterId;
  if(!CHARACTERS[characterId]?.available)return drafts;
  const weaponId=Object.hasOwn(patch,'weaponId')?patch.weaponId:canEquip(characterId,current.weaponId)?current.weaponId:null;
  if(weaponId!==null&&!canEquip(characterId,weaponId))return drafts;
  if(characterId===current.characterId&&weaponId===current.weaponId)return drafts;
  return drafts.map((draft,index)=>index===id?{characterId,weaponId,ready:false}:draft);
}
export function toggleReady(drafts,id){
  if(![0,1].includes(id)||!isValidLoadout(drafts[id]))return drafts;
  return drafts.map((draft,index)=>index===id?{...draft,ready:!draft.ready}:draft);
}
export const requiredPlayers=mode=>mode==='solo'?[0]:[0,1];
export const canConfirm=(drafts,mode)=>requiredPlayers(mode).every(id=>drafts[id]?.ready&&isValidLoadout(drafts[id]));
export function confirmedLoadouts(drafts,mode){
  if(!canConfirm(drafts,mode))return null;
  try{return drafts.map(normalizeLoadout);}catch{return null;}
}
