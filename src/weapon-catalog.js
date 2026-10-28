// color: the weapon's dominant colour, used for its swing trail and UI accents.
export const WEAPON_CATALOG = Object.freeze([
  { id: 'yellow-staff', name: '奶木昆', english: 'YELLOW STAFF', role: '圆棍 · 撑地', available: true, characterId: 'naiwa', color: 0xf6cf45,
    description: '奶蛙的同色软胶圆棍。中等长度，挥击、撑地与格挡兼顾。',
    strength: '均衡顺手', weakness: '伤害中规中矩', reach: '中', response: '稳' },
  { id: 'takeout-box', name: '美团外卖盒', english: 'TAKEOUT BOX', role: '盒子 · 重拍', available: true, characterId: 'dudu', color: 0xf5c518,
    description: '胆子肥嘟嘟的专属保温外卖箱，直接整个抡起来拍，盒面宽大，拍中很疼。',
    strength: '盒面宽，容易命中和格挡', weakness: '短，需要贴近', reach: '短', response: '中' },
  { id: 'happy-paws', name: '开心猫爪', english: 'HAPPY PAW', role: '肉垫 · 拍击', available: true, characterId: 'happy-cat', color: 0xf29aa6,
    description: '开心小猫的专属大猫爪，悬浮在身旁，带着粉色肉垫整只拍下去，爪面宽大又软乎乎。',
    strength: '爪面宽，容易命中和格挡', weakness: '短，需要贴近', reach: '短', response: '中' },
  { id: 'sword', name: '短剑', english: 'SHORT SWORD', role: '近身 · 快挥', available: true, color: 0xdfe8ec,
    description: '起挥快，刹车和换向也更灵活。靠近对手，抓住空隙连续变招。',
    strength: '快速起挥与调整', weakness: '距离短，需要贴近对手', reach: '短', response: '快' },
  { id: 'polearm', name: '长柄刀', english: 'GUANDAO', role: '长距 · 控场', available: true, color: 0xc9d4d6,
    description: '偃月形的宽刀头装在长杆上，提前挥动，封住对手靠近的路线。',
    strength: '最长的触及范围', weakness: '起挥与反向调整较慢', reach: '长', response: '稳' },
  { id: 'hammer', name: '铁战锤', english: 'WAR HAMMER', role: '重击 · 破势', available: true, color: 0x8d979a,
    description: '横置的铁锤头一面平砸、一面尖啄。提前蓄势，抓准一击的时机。',
    strength: '锤头重击伤害高', weakness: '起挥和收招慢', reach: '中', response: '慢' },
  { id: 'axe', name: '战斧', english: 'BATTLE AXE', role: '劈砍 · 爆发', available: true, color: 0xb7c3c6,
    description: '月牙形的宽斧刃，下劈威力大，比铁锤稍快。',
    strength: '斧刃劈砍伤害高', weakness: '斧刃偏在一侧，横扫较弱', reach: '中', response: '中' },
  { id: 'mace', name: '狼牙棒', english: 'SPIKED MACE', role: '钝击 · 稳重', available: true, color: 0x9a6a3c,
    description: '粗木棒头上镶满铁钉，任何角度砸中都同样疼。',
    strength: '球形棒头全方位命中', weakness: '较重，换向偏慢', reach: '中', response: '慢' },
  { id: 'pan', name: '平底锅', english: 'FRYING PAN', role: '轻快 · 拍击', available: true, color: 0x3a3f42,
    description: '厨房神器。最轻最快，锅底拍中发出清脆的「当」。',
    strength: '起挥极快，锅面宽', weakness: '单次伤害较低', reach: '短', response: '快' },
].map(weapon => Object.freeze(weapon)));

export const weaponName = id => WEAPON_CATALOG.find(weapon => weapon.id === id)?.name ?? '武器';
export const weaponColor = id => WEAPON_CATALOG.find(weapon => weapon.id === id)?.color ?? 0xf3ead3;
