// Arena skins offered in the lobby. Pure data: shared by the UI, the 3D
// builders (src/arenas/*) and Node tests, so it must not import three.js.
// rimHeight: world height below which weapons collide with the arena rim;
// each skin's visible rim reads solid up to it.
export const ARENA_SKINS = Object.freeze([
  Object.freeze({
    id: 'courtyard', name: '玩具庭院', english: 'TOY COURTYARD',
    description: '奶油沙地围着一圈彩色积木搭成的矮墙（圆塔、长砖、拱门、三角屋顶、半圆和圆顶小帽），场上立着彩色叠叠乐圆柱和积木矮墙；彩旗与纸灯笼外是起伏的草丘、糖果小镇、风车和热气球。',
    rimHeight: 1.2,
    swatch: Object.freeze(['#efe4c8', '#c4684f', '#9db986']),
  }),
  Object.freeze({
    id: 'colosseum', name: '罗马角斗场', english: 'COLOSSEUM',
    description: '午后斜阳下的大理石角斗场：黄沙场地、坐满火柴人的层层看台与拱廊、火盆和条纹遮阳篷，墙外是柏树与红瓦古城。',
    rimHeight: 2.52,
    swatch: Object.freeze(['#e3c48f', '#f1e6d0', '#b5523b']),
  }),
  Object.freeze({
    id: 'lakeside', name: '湖中庭院', english: 'LAKE GARDEN',
    description: '荷花湖中央的汉白玉水榭：青玉水磨石地面嵌着莲花与海水纹，四周莲叶田田、锦鲤游弋，九曲桥通向垂柳掩映的朱红六角亭；远岸宝塔与月牙拱桥倒映湖面，层叠山峦如水墨隐入薄雾。',
    rimHeight: 1.1,
    swatch: Object.freeze(['#b9ccc0', '#4f9a86', '#c4473a']),
  }),
]);

export const DEFAULT_ARENA_SKIN = 'courtyard';
export const isArenaSkin = id => ARENA_SKINS.some(skin => skin.id === id);
