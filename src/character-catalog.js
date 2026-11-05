// Contact data is in the fighter frame: the pivot sits bodyFloor above the
// floor and the face looks along +X. bounds frame the visible model (the
// imported ones measured, in their rest and skill poses) for the cameras.
import {BEAGLE} from './beagle-profile.js';
import {CAT} from './orange-tabby-profile.js';
import {BEAGLE_COMPACT_BOUNDS} from './character-attachments.js';

const shape=(a,b,radius)=>Object.freeze({a:Object.freeze(a),b:Object.freeze(b),radius});
const bounds=(min,max)=>Object.freeze({min:Object.freeze(min),max:Object.freeze(max)});
export const CHARACTER_CATALOG=Object.freeze([
  Object.freeze({ id: 'cr7', name: 'CR7', english: 'CR7', available: true, bodyFollowsView: true, skill: null,
    description: '红绿球衣的球员，专属足球使用 W/S 挥动、A/D 转向与撑地移动。',
    bodyFloor: .59, bodyRadius: .44,
    bounds: bounds([-.45, 0, -.68], [.45, 1.85, .68]),
    hurtShapes: Object.freeze([shape([0, -.13, 0], [0, .33, 0], .27), shape([.04, .82, 0], [.04, .86, 0], .38)]) }),
  Object.freeze({ id: 'mean-girl', name: 'Mean Girl', english: 'MEAN GIRL', available: true, bodyFollowsView: true, skill: null,
    description: '金发粉裙的 Mean Girl，使用皇冠爱心武器与现有挥动转向操作。',
    bodyFloor: .59, bodyRadius: .50,
    bounds: bounds([-.51, 0, -.68], [.51, 1.85, .68]),
    hurtShapes: Object.freeze([shape([0, -.13, 0], [0, .30, 0], .29), shape([.05, .80, 0], [.05, .86, 0], .40)]) }),
  Object.freeze({ id: 'maodie', name: 'Maodie', english: 'MAODIE', available: true, bodyFollowsView: true, skill: null,
    description: '独立的 Maodie 角色，保留原有虎斑与表情，使用一只悬浮猫爪。',
    bodyFloor: .59, bodyRadius: .49,
    bounds: bounds([-.67, 0, -.49], [.67, 1.85, .49]),
    hurtShapes: Object.freeze([shape([0, -.13, 0], [0, .32, 0], .36), shape([.10, .76, 0], [.10, .83, 0], .40)]) }),
  Object.freeze({id:'naiwa',name:'奶蛙',english:'NAI WA',available:true,bodyFollowsView:true,skill:'laugh',
    description:'梨形的黄色奶蛙，扎着马步。按 F 仰天大笑，让对手体力不断流失。',
    bodyFloor:.59,bodyRadius:.66,
    bounds:bounds([-.7,0,-.9],[.64,1.78,.74]),
    hurtShapes:Object.freeze([shape([0,-.15,0],[0,.12,0],.55),shape([.02,.72,0],[.02,.8,0],.37)]),
  }),
  Object.freeze({id:'stickman',name:'火柴人',english:'STICKMAN',available:true,bodyFollowsView:true,skill:'twist',
    description:'圆头方身火柴腿的简笔小人。按 F 绕后，瞬移到对手身后。',
    bodyFloor:.59,bodyRadius:.4,
    bounds:bounds([-.4,0,-.44],[.4,1.78,.44]),
    hurtShapes:Object.freeze([shape([0,-.19,0],[0,.22,0],.3),shape([0,.76,0],[0,.76,0],.38)])}),
  Object.freeze({id:'dudu',name:'胆子肥嘟嘟',english:'FEI DU DU',available:true,bodyFollowsView:true,skill:'delivery',
    description:'圆滚滚的黄色袋鼠，专属武器是外卖盒子。按 F 把外卖扔向对手。',
    bodyFloor:.59,bodyRadius:.52,
    bounds:bounds([-.86,0,-.78],[.8,2,.78]),
    hurtShapes:Object.freeze([shape([0,-.08,0],[0,.1,0],.5),shape([.12,.68,0],[.2,.66,0],.35)])}),
  Object.freeze({id:'happy-cat',name:'开心小猫',english:'HAPPY CAT',available:true,bodyFollowsView:true,skill:'happy',
    description:'开心摇摆的灰色虎斑小猫，可用专属猫爪或通用武器。按 F Happy Happy 蹦跳回血。',
    // Slim and tall (1.85 m): the trunk and the round head, arms left out.
    bodyFloor:.59,bodyRadius:.42,
    bounds:bounds([-.36,0,-.88],[.36,1.9,.66]),
    hurtShapes:Object.freeze([shape([0,-.24,0],[0,.56,0],.33),shape([.02,.99,0],[.02,.99,0],.31)])}),
  Object.freeze({id:'beagle',name:'比格犬',english:'BEAGLE',available:true,bodyFollowsView:true,skill:'rotor',maxHealth:80,
    description:'回归的比格犬：长耳挥击与撑地，F 旋耳低空悬停；也能使用通用武器。',
    bodyFloor:BEAGLE.bodyFloor,bodyRadius:BEAGLE.bodyRadius,bounds:BEAGLE_COMPACT_BOUNDS,
    hurtShapes:Object.freeze([shape([0,-.32,0],[0,-.07,0],.27),shape([-.02,.57,0],[.08,.57,0],.55),...[-1,1].map(side=>shape([.16,-.13,side*.30],[.16,-.13,side*.30],.15))]),
    weaponIds:Object.freeze(['long-ears','sword','polearm','hammer','axe','mace','pan'])}),
  Object.freeze({id:'orange-tabby',name:'橘猫',english:'ORANGE TABBY',available:true,bodyFollowsView:false,skill:null,maxHealth:150,
    description:'原版橘猫和成对巨爪：W/S 挥爪撑地，A/D 同时转向；保留 1.3× 猫爪与低空休息悬浮。',
    bodyFloor:CAT.bodyFloor,bodyRadius:CAT.bodyRadius,bounds:CAT.bounds,hurtShapes:CAT.hurtShapes,
    weaponIds:Object.freeze(['cat-paws'])}),
]);
export const CHARACTERS=Object.freeze(Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c])));
export const characterName=id=>CHARACTERS[id]?.name??'角色';
