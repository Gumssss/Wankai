// One skill per character, triggered with F and gated by a cooldown.
// Physics applies the effects (physics.js); the scene and audio react to the
// 'skill' events it emits.
export const SKILLS = Object.freeze({
  ricochet: Object.freeze({id:'ricochet',name:'反弹足球',cooldown:30,cost:40,windup:.4,duration:3,recovery:.3,description:'踢出反弹球，3秒无敌并用WASD移动；结束松开重按恢复武器。'}),
  perfume: Object.freeze({id:'perfume',name:'喷香水',cooldown:30,cost:35,windup:.35,duration:2.5,recovery:.25,bleedInterval:2,description:'喷香水2.5秒，命中使对手持续流血至本局结束，每2秒损失1点生命；重复命中不叠加。'}),
  rotor: Object.freeze({ id: 'rotor', name: '旋耳悬停', cooldown: 30, duration: 5, activationMinimum: 40, drain: 16,
    description: '长耳自动旋转悬停，按 WASD 随视角移动。最多持续 5 秒，体力耗尽或到时落地。' }),
  laugh: Object.freeze({ id: 'laugh', name: '大笑', cooldown: 35, duration: 2.5,
    // Empty a full 200-point bar in 0.5s, then suppress recovery for 2s.
    drain: 400,
    description: '0.5 秒内清空对手体力，保持 2 秒，随后可恢复。' }),
  twist: Object.freeze({ id: 'twist', name: '绕后', cooldown: 35, duration: 0.45,
    // Lands this far behind the opponent's facing direction.
    behind: 2.7,
    description: '一阵烟雾后瞬移到对手身后，并转身面向对手。' }),
  delivery: Object.freeze({ id: 'delivery', name: '外卖投掷', cooldown: 10, duration: 0.5,
    // A full-size delivery box: big enough to read across the arena.
    speed: 17, lift: 3.4, radius: 0.55, damage: 14, knockback: 3.2, life: 2.5,
    description: '把一整个大外卖箱朝面前扔出去，命中造成 14 点伤害并击退。' }),
  happy: Object.freeze({ id: 'happy', name: 'Happy Happy', cooldown: 40, duration: 1.6, heal: 10,
    description: '开心地蹦跳 1.6 秒，共恢复 10 点生命。' }),
  'big-paws': Object.freeze({ id: 'big-paws', name: '巨爪', cooldown: 30, duration: 8,
    description: '双爪变为常态的 1.3×，持续 8 秒，冷却 30 秒。' }),
  lifesteal: Object.freeze({ id: 'lifesteal', name: '吸血', cooldown: 40, duration: 8, healRatio: 2,
    description: '8 秒内，武器命中对手时回复相当于实际伤害 2 倍的生命。冷却 40 秒。' }),
});

export const skillFor = characterId => SKILLS[{
  cr7: 'ricochet', 'mean-girl': 'perfume', naiwa: 'laugh', stickman: 'twist', dudu: 'delivery',
  'happy-cat': 'happy', beagle: 'rotor', 'orange-tabby': 'big-paws', maodie: 'lifesteal',
}[characterId]] ?? null;
