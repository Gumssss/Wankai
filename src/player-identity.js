import {characterName} from './character-catalog.js';

export const damageOwnerLabel=id=>id===0?'P1':id===1?'P2':'环境';
export function playerDisplayName(id,selection,practice=false){
 const characterId=typeof selection==='string'?selection:selection?.characterId;
 return `${damageOwnerLabel(id)} · ${characterName(characterId)}${practice&&id===1?' 木桩':''}`;
}
