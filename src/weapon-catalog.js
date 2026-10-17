export const WEAPON_CATALOG = Object.freeze([
  { id: 'sword', name: '短剑', english: 'SHORT SWORD', role: '近身 · 快挥',
    description: '起挥快，刹车和换向也更灵活。靠近对手，抓住空隙连续变招。',
    strength: '快速起挥与调整', weakness: '距离短，需要贴近对手',
    reach: '短', response: '快' },
  { id: 'polearm', name: '长柄刀', english: 'CURVED POLEARM', role: '长距 · 控场',
    description: '用更长的武器保持距离，提前挥动，封住对手靠近的路线。',
    strength: '更长的触及范围', weakness: '起挥与反向调整较慢',
    reach: '长', response: '稳' },
  { id: 'hammer', name: '铁战锤', english: 'IRON WAR HAMMER', role: '重击 · 破势',
    description: '铁制宽头带来更强的碰撞与重击。提前蓄势，抓准一击的时机。',
    strength: '锤头重击伤害更高，宽头可格挡', weakness: '起挥和收招慢，挥空后更难调整',
    reach: '中', response: '慢' },
]);

export const weaponName = id => WEAPON_CATALOG.find(weapon => weapon.id === id)?.name ?? '武器';
