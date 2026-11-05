// One skill per character, triggered with F and gated by a cooldown.
// Physics applies the effects (physics.js); the scene and audio react to the
// 'skill' events it emits.
export const SKILLS = Object.freeze({
  rotor: Object.freeze({ id: 'rotor', name: '旋耳悬停', cooldown: 0, duration: 5, activationMinimum: 40, drain: 16,
    description: '长耳专用：至少 40 体力，最多旋转悬停 5 秒，每秒消耗 16；A/D 可反向，耗尽或到时落地。' }),
  laugh: Object.freeze({ id: 'laugh', name: '大笑', cooldown: 35, duration: 2.5,
    // Empty a full 200-point bar in 0.5s, then suppress recovery for 2s.
    drain: 400,
    description: '0.5 秒内清空对手体力，保持 2 秒，随后可恢复。' }),
  twist: Object.freeze({ id: 'twist', name: '绕后', cooldown: 28, duration: 0.45,
    // Lands this far behind the opponent's facing direction.
    behind: 2.7,
    description: '一阵烟雾后瞬移到对手身后，并转身面向对手。' }),
  delivery: Object.freeze({ id: 'delivery', name: '外卖投掷', cooldown: 22, duration: 0.5,
    // A full-size delivery box: big enough to read across the arena.
    speed: 17, lift: 3.4, radius: 0.55, damage: 14, knockback: 3.2, life: 2.5,
    description: '把一整个大外卖箱朝面前扔出去，命中造成 14 点伤害并击退。' }),
  happy: Object.freeze({ id: 'happy', name: 'Happy Happy', cooldown: 40, duration: 1.6, heal: 10,
    description: '开心地蹦跳 1.6 秒，共恢复 10 点生命。' }),
});

export const skillFor = characterId => SKILLS[{ naiwa: 'laugh', stickman: 'twist', dudu: 'delivery', 'happy-cat': 'happy', beagle:'rotor' }[characterId]] ?? null;
