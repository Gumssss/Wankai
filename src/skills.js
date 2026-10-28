// One skill per character, triggered with F and gated by a cooldown.
// Physics applies the effects (physics.js); the scene and audio react to the
// 'skill' events it emits.
export const SKILLS = Object.freeze({
  laugh: Object.freeze({ id: 'laugh', name: '大笑', cooldown: 35, duration: 4,
    // Extra stamina the opponent loses per second while the laugh lasts.
    drain: 38,
    description: '仰天大笑 4 秒：对手体力持续流失，且无法恢复。' }),
  twist: Object.freeze({ id: 'twist', name: '绕后', cooldown: 28, duration: 0.45,
    // Lands this far behind the opponent's facing direction.
    behind: 2.7,
    description: '一阵烟雾后瞬移到对手身后，并转身面向对手。' }),
  delivery: Object.freeze({ id: 'delivery', name: '外卖投掷', cooldown: 22, duration: 0.5,
    // A full-size delivery box: big enough to read across the arena.
    speed: 17, lift: 3.4, radius: 0.55, damage: 14, knockback: 3.2, life: 2.5,
    description: '把一整个大外卖箱朝面前扔出去，命中造成 14 点伤害并击退。' }),
  happy: Object.freeze({ id: 'happy', name: 'Happy Happy', cooldown: 40, duration: 1.6, heal: 22,
    description: '开心地蹦跳 1.6 秒，共恢复 22 点生命。' }),
});

export const skillFor = characterId => SKILLS[{ naiwa: 'laugh', stickman: 'twist', dudu: 'delivery', 'happy-cat': 'happy' }[characterId]] ?? null;
