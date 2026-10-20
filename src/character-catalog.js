import {BEAGLE_COMPACT_BOUNDS} from './character-attachments.js';
import {CAT} from './orange-tabby-profile.js';

const shape=(a,b,radius)=>Object.freeze({a:Object.freeze(a),b:Object.freeze(b),radius});
export const CHARACTER_CATALOG=Object.freeze([
  Object.freeze({id:'basic-fighter',name:'基础丸人',english:'BASIC FIGHTER',available:true,
    description:'最初的丸人，使用漂浮兵器撑地与对战。',model:null,bodyFloor:.59,bodyRadius:.38,
    bounds:{min:[-.39,0,-.335],max:[.39,1.75,.335]},
    hurtShapes:Object.freeze([shape([0,-.19,0],[0,.18,0],.38),shape([0,.76,0],[0,.76,0],.38)])}),
  Object.freeze({id:'beagle',name:'比格犬',english:'BEAGLE',available:true,
    description:'自然垂耳的比格犬，也可装备长耳变为双耳战斗形态。',model:'beagle-smooth-appearance-v05.glb',bodyFloor:.59,bodyRadius:.58,
    bounds:BEAGLE_COMPACT_BOUNDS,
    hurtShapes:Object.freeze([shape([0,-.32,0],[0,-.07,0],.27),shape([-.02,.57,0],[.08,.57,0],.55),
      ...[-1,1].map(side=>shape([.16,-.13,side*.30],[.16,-.13,side*.30],.15))])}),
  Object.freeze({id:'orange-tabby',name:'橘猫',english:'ORANGE TABBY',available:true,
    description:'坐姿悬浮的橘猫，用巨大的独立猫爪挥击、撑地与转向。',model:CAT.model,
    bodyFloor:CAT.bodyFloor,bodyRadius:CAT.bodyRadius,bounds:CAT.bounds,hurtShapes:CAT.hurtShapes,
    weaponIds:Object.freeze(['cat-paws'])}),
]);
export const CHARACTERS=Object.freeze(Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c])));
export const characterName=id=>CHARACTERS[id]?.name??'角色';
