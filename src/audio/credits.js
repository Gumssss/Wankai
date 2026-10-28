// Attribution for the CC BY 4.0 music in public/audio/music/ (shown in Settings).
export const MUSIC_LICENSE = Object.freeze({
  name: 'Creative Commons: By Attribution 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
});

export const MUSIC_CREDITS = Object.freeze([
  { title: 'Daily Beetle', use: '标题 / 菜单', file: 'menu' },
  { title: 'Mischief Maker', use: '对战 · 玩具庭院', file: 'battle' },
  { title: 'Bushwick Tarantella Loop', use: '对战 · 罗马角斗场', file: 'battle-colosseum' },
  { title: 'Shenyang', use: '对战 · 湖中庭院', file: 'battle-lakeside' },
].map(credit => Object.freeze({ ...credit, author: 'Kevin MacLeod (incompetech.com)' })));

// CC BY asks adaptations to be marked as such.
export const MUSIC_CHANGES = '为游戏剪辑成无缝循环，并调整了响度与均衡。';
