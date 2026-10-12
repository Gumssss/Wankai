import { ArenaPhysics, CONFIG } from './physics.js';
import { GameAudio } from './audio.js';

const $ = id => document.getElementById(id);
const world = new ArenaPhysics();
const sound = new GameAudio();
const keys = new Set();
const controlKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const keyElements = [...document.querySelectorAll('[data-key]')];
const healthIds = ['one', 'two'];
let view;
let state = 'lobby';
let previousState = 'playing';
let practice = false;
let accumulator = 0;
let lastFrame = 0;
let freeze = 0;
let countdown = 0;
let countdownNumber = -1;
let endTimer = 0;
let readoutTimer = 0;
let helpResume = false;
let floating = [];
let lastHealth = [-1, -1];

function clearKeys() {
  keys.clear();
  syncPolarInputs();
  for (const element of keyElements) element.classList.remove('pressed');
}

function getInputs() {
  return [
    { theta: Number(keys.has('KeyS')) - Number(keys.has('KeyW')), phi: Number(keys.has('KeyA')) - Number(keys.has('KeyD')) },
    practice ? { theta: 0, phi: 0 } : {
      theta: Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')),
      phi: Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight')),
    },
  ];
}

function syncPolarInputs() {
  getInputs().forEach((input, id) => world.setPolarInput(id, input.theta));
}

function startRound(isPractice = practice) {
  practice = isPractice;
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  sound.unlock();
  sound.lastWhoosh = [0, 0];
  clearKeys();
  world.reset(practice);
  view.clearEffects();
  floating.forEach(f => f.element.remove()); floating = [];
  accumulator = 0; freeze = 0; lastHealth = [-1, -1];
  state = 'countdown'; countdown = 2.4; countdownNumber = -1;
  $('countdown').style.fontSize = '';
  $('welcome').hidden = true;
  $('match-tools').hidden = false;
  $('live-tip').hidden = false;
  $('hit-readout').classList.remove('visible');
  readoutTimer = 0;
  $('round-label').textContent = practice ? '自由练习' : '自由对决';
  $('name-two').textContent = practice ? '木桩' : '青丸';
  $('label-two').textContent = practice ? 'TRAINING' : 'PLAYER 02';
  $('player-label-two').innerHTML = practice ? 'P2<span>木桩</span>' : 'P2<span>青丸</span>';
  $('live-tip').lastElementChild.textContent = practice
    ? '练习模式 · 青丸不主动出招，停止受击后恢复血量'
    : '';
  updateHUD();
}

function goHome() {
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  state = 'lobby'; clearKeys();
  world.reset(); view.clearEffects();
  accumulator = 0; freeze = 0; lastHealth = [-1, -1];
  floating.forEach(f => f.element.remove()); floating = [];
  $('welcome').hidden = false;
  $('match-tools').hidden = true;
  $('live-tip').hidden = true;
  $('countdown').textContent = '';
  $('countdown').style.fontSize = '';
  $('hit-readout').classList.remove('visible');
  $('round-label').textContent = '自由对决';
  $('name-two').textContent = '青丸';
  $('label-two').textContent = 'PLAYER 02';
  $('player-label-two').innerHTML = 'P2<span>青丸</span>';
  updateHUD();
}

function pause(showDialog = true) {
  if (state !== 'playing' && state !== 'countdown') return;
  previousState = state; state = 'paused'; clearKeys(); accumulator = 0;
  if (showDialog && !$('pause-dialog').open) $('pause-dialog').showModal();
}

function resume() {
  $('pause-dialog').close();
  if (state === 'paused') { state = previousState; accumulator = 0; lastFrame = performance.now(); }
}

function showHelp() {
  helpResume = state === 'playing' || state === 'countdown';
  if (helpResume) pause(false);
  clearKeys();
  $('help-dialog').showModal();
}

function updateHUD() {
  world.players.forEach((p, i) => {
    if (p.health === lastHealth[i]) return;
    lastHealth[i] = p.health;
    const key = healthIds[i];
    $(`health-${key}`).innerHTML = `${p.health}<small>/100</small>`;
    $(`bar-${key}`).style.transform = `scaleX(${p.health / 100})`;
    $(`ghost-${key}`).style.transform = `scaleX(${p.health / 100})`;
  });
  const seconds = Math.floor(world.time);
  $('elapsed').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function impact(event) {
  view.impact(event); sound.impact(event);
  if (event.type !== 'hit') return;
  freeze = Math.max(freeze, 0.028 + event.strength * 0.055);
  const element = document.createElement('div');
  element.className = 'damage-number';
  element.innerHTML = `${event.damage >= 22 ? '<span class="impact-word">重 击 !</span>' : ''}−${event.damage}`;
  $('effects').appendChild(element);
  floating.push({ element, point: { ...event.point }, life: 0.95, maxLife: 0.95 });
  const readout = $('hit-readout');
  readout.classList.add('visible');
  readout.querySelector('span').textContent = event.damage >= 22 ? '漂亮的一棍' : '有效命中';
  readout.querySelector('strong').textContent = `−${event.damage}`;
  const gain = Math.round(30 * Math.min(event.acceleration / 48, 1));
  readout.querySelector('small').textContent = `${event.speed.toFixed(1)} m/s · 发力加成 ${gain}%`;
  readoutTimer = 3;
}

function finishRound() {
  state = 'result'; clearKeys();
  const winner = world.winner;
  $('result-title').textContent = winner === -1 ? '平分秋色' : `${winner === 0 ? '赤丸' : '青丸'}获胜`;
  $('winner-icon').textContent = winner === -1 ? '和' : winner === 0 ? '赤' : '青';
  $('winner-icon').style.background = winner === 1 ? '#568d92' : winner === 0 ? '#c4684f' : '#838c74';
  $('result-detail').textContent = `本局 ${Math.floor(world.time)} 秒。${winner === -1 ? '两位棍客同时力竭，再来一局。' : `胜者剩余 ${world.players[winner].health} 点体力。下一棍，谁说了算？`}`;
  $('result-dialog').showModal();
  sound.tone(440, 660, 0.4, 0.2, 'triangle');
}

function frame(now) {
  const dt = Math.min((now - (lastFrame || now)) / 1000, 0.06);
  lastFrame = now;
  if (state === 'countdown') {
    countdown -= dt;
    const n = Math.ceil(countdown / 0.8);
    if (n !== countdownNumber && n > 0) {
      countdownNumber = n;
      $('countdown').textContent = n;
      $('countdown').classList.remove('pop'); void $('countdown').offsetWidth; $('countdown').classList.add('pop');
      sound.tick();
    }
    if (countdown <= 0) {
      state = 'playing'; accumulator = 0; countdown = -0.55;
      $('countdown').textContent = '抡起来';
      $('countdown').style.fontSize = '56px';
      sound.tick(true);
    }
  } else if (state === 'playing') {
    if (countdown < 0) {
      countdown += dt;
      if (countdown >= 0) { $('countdown').textContent = ''; $('countdown').style.fontSize = ''; }
    }
    if (freeze > 0) freeze = Math.max(0, freeze - dt);
    else {
      accumulator += dt;
      const inputs = getInputs();
      let steps = 0;
      while (accumulator >= CONFIG.step && steps++ < 12) {
        world.step(inputs);
        accumulator -= CONFIG.step;
        for (const event of world.events) impact(event);
        if (world.winner !== null) { state = 'ending'; endTimer = 0.7; clearKeys(); accumulator = 0; break; }
        if (freeze > 0) { accumulator = 0; break; }
      }
      for (const p of world.players) sound.swing(p.id, p.contactSpeed, world.time);
    }
    updateHUD();
  } else if (state === 'ending') {
    endTimer -= dt;
    if (endTimer <= 0) finishRound();
  }
  const effectDt = state === 'paused' ? 0 : dt;
  readoutTimer -= effectDt;
  if (readoutTimer <= 0) $('hit-readout').classList.remove('visible');
  view.update(world.players, effectDt, state === 'playing' || state === 'ending');
  for (const p of world.players) {
    const point = view.project({ x: p.p.x, y: p.p.y + 1.53, z: p.p.z });
    const label = $(`player-label-${healthIds[p.id]}`);
    label.style.transform = `translate(${point.x}px,${point.y}px) translate(-50%,-100%)`;
  }
  for (let i = floating.length - 1; i >= 0; i--) {
    const f = floating[i]; f.life -= effectDt;
    const p = view.project({ ...f.point, y: f.point.y + 0.5 + (f.maxLife - f.life) * 1.4 });
    f.element.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
    f.element.style.opacity = Math.min(1, f.life * 3);
    if (f.life <= 0) { f.element.remove(); floating.splice(i, 1); }
  }
  view.render();
}

function bindUI() {
  $('start').onclick = () => startRound(false);
  $('practice').onclick = () => startRound(true);
  $('restart').onclick = () => startRound();
  $('rematch').onclick = () => startRound();
  $('pause').onclick = () => pause();
  $('resume').onclick = resume;
  for (const id of ['home', 'pause-home', 'result-home']) $(id).onclick = goHome;
  $('help').onclick = showHelp;
  $('sound').onclick = () => {
    sound.enabled = !sound.enabled;
    $('sound').setAttribute('aria-pressed', String(sound.enabled));
    $('sound').setAttribute('aria-label', sound.enabled ? '关闭声音' : '开启声音');
    if (sound.enabled) { sound.unlock(); sound.tick(); }
  };
  for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
  $('help-dialog').addEventListener('close', () => { if (helpResume) { helpResume = false; resume(); } });
  $('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
  $('result-dialog').addEventListener('cancel', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (controlKeys.has(e.code)) {
      e.preventDefault();
      if (state !== 'playing' && state !== 'countdown') return;
      keys.add(e.code);
      syncPolarInputs();
      for (const element of keyElements) element.classList.toggle('pressed', keys.has(element.dataset.key));
    }
    if (e.repeat || document.querySelector('dialog[open]')) return;
    if (e.code === 'Escape') { e.preventDefault(); pause(); }
    if (e.code === 'KeyR' && state === 'playing') startRound();
    if (e.code === 'Enter' && state === 'lobby' && e.target.tagName !== 'BUTTON') { e.preventDefault(); startRound(false); }
  });
  window.addEventListener('keyup', e => {
    keys.delete(e.code);
    syncPolarInputs();
    for (const element of keyElements) element.classList.toggle('pressed', keys.has(element.dataset.key));
  });
  window.addEventListener('blur', () => { clearKeys(); if (state === 'playing' || state === 'countdown') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearKeys(); pause(); } });
  view.renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); pause(false);
    $('error').hidden = false;
    $('error-message').textContent = '图形上下文已中断，请重新加载游戏。';
  });
}

async function init() {
  try {
    const { ArenaView } = await import('./scene.js');
    view = new ArenaView($('viewport'));
    bindUI();
    updateHUD();
    view.update(world.players, 0);
    view.render();
    $('loading').hidden = true;
    view.renderer.setAnimationLoop(frame);
    // Read-only observability for local debugging and smoke tests.
    Object.defineProperty(window, '__arena', { value: Object.freeze({
      snapshot: () => JSON.parse(JSON.stringify({ state, practice, time: world.time, winner: world.winner, players: world.players, lastHit: world.lastHit })),
      rendererInfo: () => ({ geometries: view.renderer.info.memory.geometries, textures: view.renderer.info.memory.textures, calls: view.renderer.info.render.calls }),
    }) });
  } catch (error) {
    console.error(error);
    $('loading').hidden = true; $('error').hidden = false;
    $('error-message').textContent = location.protocol === 'file:'
      ? '请在项目目录运行 python3 scripts/serve.py，然后打开 http://localhost:8000。游戏需要通过本地服务器加载。'
      : '请使用支持 WebGL 2 的现代浏览器，并开启硬件加速。如果问题持续，请查看浏览器控制台。';
  }
}

init();
