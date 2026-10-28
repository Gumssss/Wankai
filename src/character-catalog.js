// Contact data is in the fighter frame: the pivot sits bodyFloor above the
// floor and the face looks along +X. bounds frame the visible model (the
// imported ones measured, in their rest and skill poses) for the cameras.
const shape=(a,b,radius)=>Object.freeze({a:Object.freeze(a),b:Object.freeze(b),radius});
const bounds=(min,max)=>Object.freeze({min:Object.freeze(min),max:Object.freeze(max)});
export const CHARACTER_CATALOG=Object.freeze([
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
]);
export const CHARACTERS=Object.freeze(Object.fromEntries(CHARACTER_CATALOG.map(c=>[c.id,c])));
export const characterName=id=>CHARACTERS[id]?.name??'角色';
