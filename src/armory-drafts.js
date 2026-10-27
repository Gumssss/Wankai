import {CHARACTERS} from './character-catalog.js';
import {DEFAULT_LOADOUTS,normalizeLoadout,canEquip,isValidLoadout} from './loadouts.js';

// Slot 0 is the local fighter, slot 1 the opponent (the AI in an AI match).
// Picker choices remain local until the shared action commits them.
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
  if(id!==0||!isValidLoadout(drafts[id]))return drafts;
  return drafts.map((draft,index)=>index===id?{...draft,ready:!draft.ready}:draft);
}
// An AI match configures both fighters; browsing edits only your own.
export const visiblePlayers=mode=>mode==='ai'?[0,1]:[0];
export const canConfirm=(drafts,mode)=>!!drafts[0]?.ready&&visiblePlayers(mode).every(id=>isValidLoadout(drafts[id]));
export function confirmedLoadouts(drafts,mode){
  if(!canConfirm(drafts,mode))return null;
  try{return drafts.map(normalizeLoadout);}catch{return null;}
}
