import { Component, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArenaCanvas, LOOK_STATES, requestLook } from './ArenaCanvas.jsx';
import { CONTROL_KEYS, GameSession } from './game-session.js';
import { MatchSetup } from './MatchSetup.jsx';
import { loadoutName } from './loadouts.js';
import { CHARACTER_CATALOG, characterName } from './character-catalog.js';
import { CharacterPortrait, SkillIcon } from './selection-icons.jsx';
import { STAMINA } from './physics.js';
import { SKILLS } from './skills.js';
import { AI_DIFFICULTIES } from './ai-opponent.js';
import { SENSITIVITY_RANGE } from './free-camera.js';
import { loadSettings, saveSettings } from './settings.js';
import { MUSIC_CREDITS, MUSIC_LICENSE, MUSIC_CHANGES } from './audio/credits.js';
import { onlineAvailable, steamStatus, quickMatch, inviteFriend, joinInvite, openInviteDialog, cancelOnline } from './online.js';
import { loadArenaPreviews } from './models/arena-previews.js';
import './style.css';

const defaultSession = new GameSession();

// Capture the mouse for free-look. Called from clicks, which grant the needed
// user activation; the arena may still be hidden for a frame or two.
const lockView = () => requestAnimationFrame(() => requestAnimationFrame(() => requestLook(document.querySelector('#viewport canvas'))));

class CanvasBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error(error); this.props.onError(error); }
  render() {
    if (this.state.error) return <div className="error-panel"><h2>竞技场暂时无法载入</h2><p>请使用支持 WebGL 2 的环境，并开启硬件加速。</p><button className="primary-button" onClick={() => location.reload()}>重新加载</button></div>;
    return this.props.children;
  }
}

function Modal({ children, onCancel, className = '', label }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} aria-label={label} className={`modal ${className}`} onCancel={event => { event.preventDefault(); onCancel?.(); }}>{children}</dialog>;
}

const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

function FighterCard({ id, tag, health, stamina, loadout, skill, side }) {
  const staminaState = stamina <= 1e-8 ? 'empty' : stamina < STAMINA.lowThreshold ? 'low' : 'ready';
  const staminaLabel = staminaState === 'empty' ? '力竭' : staminaState === 'low' ? '体力低' : '体力';
  const info = SKILLS[skill?.id];
  return <div className={`fighter-card ${side} player-${id}`}>
    <div className="fighter-avatar"><CharacterPortrait id={loadout.characterId} playerId={id} critical={health < 15} /></div>
    <div className="fighter-body">
      <div className="fighter-name"><span className="fighter-tag">{tag}</span><b>{characterName(loadout.characterId)}</b><strong>{health}</strong></div>
      <div className="health-track" role="progressbar" aria-label={`${tag} 生命`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={health}>
        <div className="health-ghost" style={{ transform: `scaleX(${health / 100})` }} />
        <div className="health-fill" style={{ transform: `scaleX(${health / 100})` }} />
      </div>
      <div className={`stamina-row stamina-${staminaState}`}>
        <span>{staminaLabel}</span>
        <div className="stamina-track" role="progressbar" aria-label={`${tag} ${staminaLabel}`} aria-valuemin={0} aria-valuemax={STAMINA.max} aria-valuenow={Math.round(stamina)}>
          <div className="stamina-fill" style={{ transform: `scaleX(${stamina / STAMINA.max})` }} />
        </div>
      </div>
      {info && <div className={`skill-chip${skill.active ? ' active' : skill.cooldown > 0 ? ' cooling' : ' ready'}`}>
        <SkillIcon id={info.id} />{info.name}<span>{skill.active ? '发动中' : skill.cooldown > 0 ? `${Math.ceil(skill.cooldown)}s` : '就绪'}</span>
      </div>}
    </div>
  </div>;
}

// Bottom-right: the local fighter's F skill with a cooldown ring.
function SkillWidget({ skill, pressed }) {
  const info = SKILLS[skill?.id];
  if (!info) return null;
  const state = skill.active ? 'active' : skill.cooldown > 0 ? 'cooling' : 'ready';
  const progress = skill.active ? skill.time / info.duration : 1 - skill.cooldown / info.cooldown;
  return <div className={`skill-widget ${state}${pressed ? ' pressed' : ''}`} style={{ '--progress': progress }} aria-label={`技能 ${info.name}`}>
    <div className="skill-ring"><SkillIcon id={info.id} />{state === 'cooling' && <b>{Math.ceil(skill.cooldown)}</b>}</div>
    <div className="skill-text">
      <span><kbd>F</kbd>{info.name}</span>
      <small>{state === 'active' ? `生效中 ${skill.time.toFixed(1)}s` : state === 'cooling' ? `冷却 ${skill.cooldown.toFixed(1)}s` : '就绪 · 按 F 发动'}</small>
    </div>
  </div>;
}

function HeadingGuide() {
  return <div className="heading-guide" aria-label="武器朝向，相对当前视角">
    <div className="heading-dial"><div id="staff-heading-arrow" className="heading-arrow" /></div>
    <span>武器朝向</span>
  </div>;
}

function Keys({ game }) {
  const pressed = code => game.pressed.includes(code) ? ' pressed' : '';
  return <div className="key-hints" aria-label="操作提示">
    <span><kbd className={pressed('KeyW')}>W</kbd><kbd className={pressed('KeyS')}>S</kbd>挥动</span>
    <span><kbd className={pressed('KeyA')}>A</kbd><kbd className={pressed('KeyD')}>D</kbd>转动武器</span>
    <span><kbd className="mouse">鼠标</kbd>视角</span>
    <span><kbd>Esc</kbd>菜单</span>
  </div>;
}

function Slider({ label, value, display, min, max, step, onChange }) {
  return <label className="setting">
    <span>{label}<b>{display}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} style={{ '--fill': `${(value - min) / (max - min) * 100}%` }}
      onChange={event => onChange(Number(event.target.value))} />
  </label>;
}

function SettingsPanel({ settings, update }) {
  return <div className="settings-panel">
    <h3>操控</h3>
    <Slider label="鼠标灵敏度" value={settings.sensitivity} display={`${settings.sensitivity.toFixed(2)}×`}
      min={SENSITIVITY_RANGE.min} max={SENSITIVITY_RANGE.max} step={0.05} onChange={sensitivity => update({ sensitivity })} />
    <label className="setting toggle">
      <span>反转上下视角<small>开启后鼠标上推为向下看</small></span>
      <input type="checkbox" checked={settings.invertY} onChange={event => update({ invertY: event.target.checked })} />
    </label>
    <h3>声音</h3>
    <label className="setting toggle">
      <span>声音总开关</span>
      <input type="checkbox" checked={settings.sound} onChange={event => update({ sound: event.target.checked })} />
    </label>
    <Slider label="背景音乐" value={settings.music} display={`${Math.round(settings.music * 100)}%`} min={0} max={1} step={0.05} onChange={music => update({ music })} />
    <Slider label="音效" value={settings.sfx} display={`${Math.round(settings.sfx * 100)}%`} min={0} max={1} step={0.05} onChange={sfx => update({ sfx })} />
    <h3>音乐署名</h3>
    <div className="credits">
      {MUSIC_CREDITS.map(credit => <p key={credit.file}>
        <span><b>“{credit.title}”</b> {credit.author}</span><small>{credit.use}</small>
      </p>)}
      <small>Licensed under {MUSIC_LICENSE.name}<br />{MUSIC_LICENSE.url}<br />{MUSIC_CHANGES}</small>
    </div>
  </div>;
}

function HelpContent({ close }) {
  return <>
    <button className="modal-close" onClick={close} aria-label="关闭玩法说明">×</button>
    <span className="eyebrow">HOW TO PLAY</span>
    <h2>武器才是主角</h2>
    <div className="guide-steps">
      <article><span>01</span><div><h3>撑地才走得动</h3><p>角色没有走路键。按住 W 让武器朝正面翻滚撑地，身体就会向前移动；S 朝背面翻滚，向后移动。A / D 转动武器的水平方向，也就决定了前进的方向。</p></div></article>
      <article><span>02</span><div><h3>鼠标看哪，身体就朝哪</h3><p>点击画面锁定鼠标，左右移动鼠标转动视角，角色的身体和脸会转向视角方向。开心小猫的身体随猫爪转动。灵敏度和上下反转可在设置中调整。</p></div></article>
      <article><span>03</span><div><h3>竖挥重击，横转轻打</h3><p>同样速度下，纯横转命中只有竖挥一半的伤害。武器之间可以格挡。场上的障碍会挡住身体，也能用武器撑着借力。</p></div></article>
      <article><span>04</span><div><h3>F 发动角色技能</h3><p>{CHARACTER_CATALOG.map(c => `${c.name}：${SKILLS[c.skill].name}`).join('；')}。技能发动后进入冷却，右下角显示剩余时间。</p></div></article>
    </div>
    <div className="guide-note"><b>100 生命 · 200 体力 · 先归零者输</b><span>挥动和转动消耗体力，停手半秒后恢复；体力低时动作变慢。AI 对战中 AI 的角色与武器每局随机。联机通过 Steam：快速匹配或邀请好友，需要 Steam 在运行并已登录。</span></div>
    <button className="primary-button" onClick={close}>明白了，抡起来 <span>→</span></button>
  </>;
}

// What the Steam link is doing, in words (statuses from electron/steam-link.cjs).
function onlineStatusText(link) {
  if (link.type === 'searching') return '正在寻找对手…';
  if (link.type === 'joining') return '正在加入好友的房间…';
  if (link.type === 'waiting') return link.mode === 'invite' ? '房间已创建，等待好友接受邀请…' : '正在寻找对手…（已开放房间，等待其他玩家加入）';
  if (link.type === 'connected') return `已找到对手${link.peer?.name ? `：${link.peer.name}` : ''}，正在握手…`;
  return '正在连接 Steam…';
}

// Online over Steam: 快速匹配 (public lobby of the same version) or 邀请好友
// (friends-only lobby + Steam invite dialog). Once both players are in the
// lobby, the shared setup screen opens.
function OnlinePanel({ game, session, close, onConnected, invite, onInviteHandled }) {
  const [steam, setSteam] = useState(null);
  const [link, setLink] = useState(null);
  const info = game.net, available = onlineAvailable();
  useEffect(() => { if (available) steamStatus().then(setSteam); }, []);
  useEffect(() => { if (info?.phase === 'connected') onConnected(); }, [info?.phase]);
  const run = action => {
    setLink({ type: 'connecting' });
    action(status => { if (status?.type === 'connected' || status?.type === 'error') steamStatus().then(setSteam); setLink(status); })
      .catch(failure => setLink({ type: 'error', message: failure.message }));
  };
  useEffect(() => { if (invite) { onInviteHandled(); run(onStatus => joinInvite(session, invite, onStatus)); } }, [invite]);
  const cancel = () => { cancelOnline(session); close(); };
  const stop = () => { cancelOnline(session); setLink(null); };
  const closedMessage = info?.phase === 'closed' ? info.message : '';
  const idle = !link || link.type === 'error' || (link.type === 'disconnected' && !info) || !!closedMessage;
  const warning = closedMessage || (idle && link?.message) || '';
  return <>
    <button className="modal-close" onClick={cancel} aria-label="关闭联机面板">×</button>
    <span className="eyebrow">ONLINE · STEAM</span>
    <h2>联机对战</h2>
    {!available && <p className="online-note warn">联机需要桌面版（通过 Steam 启动的游戏或 npm start）。浏览器预览中无法联机。</p>}
    {available && idle && <>
      <div className="online-choices">
        <section>
          <h3>快速匹配</h3>
          <p>自动寻找正在等待的同版本玩家；暂时没有就开放一个房间，等别人加入。</p>
          <button className="primary-button" onClick={() => run(onStatus => quickMatch(session, onStatus))}>快速匹配 <span>→</span></button>
        </section>
        <section>
          <h3>邀请好友</h3>
          <p>创建只有好友能加入的房间，并打开 Steam 邀请窗口。好友接受后自动进入准备页。</p>
          <button className="primary-button" onClick={() => run(onStatus => inviteFriend(session, onStatus))}>邀请好友 <span>→</span></button>
        </section>
      </div>
      {!steam?.local && <p className={`online-note${steam && !steam.ok ? ' warn' : ''}`}>{!steam ? '正在连接 Steam…' : steam.ok ? `Steam 已连接 · ${steam.name}` : steam.message}</p>}
    </>}
    {steam?.local && <p className="online-note dev-note">开发模式 · 本机联机（不经过 Steam）：{steam.local.role === 'host' ? '房主' : '加入'} · 127.0.0.1:{steam.local.port}</p>}
    {available && !idle && <div className="online-status">
      <p className="online-note"><span className="waiting-dot" />{onlineStatusText(link)}</p>
      {link.type === 'waiting' && link.mode === 'invite' && <button className="secondary-button" onClick={openInviteDialog}>再次打开 Steam 邀请</button>}
      <button className="secondary-button" onClick={stop}>取消</button>
    </div>}
    {warning && <p className="online-note warn" role="alert">{warning}</p>}
  </>;
}

function TitleScreen({ started, leaving, openSetup, openOnline, openSettings, openHelp, openQuit }) {
  return <section className={`title-screen${started ? ' started' : ''}${leaving ? ' leaving' : ''}`} aria-label="开始界面" inert={leaving || undefined}>
    <div className="title-shade" />
    <header className="title-logo">
      <h1><span>木昆</span>竞技场</h1>
      <p>MU KUN ARENA · 挥起武器，撑地前进，把对手抡出局</p>
    </header>
    {!started && <div className="title-prompt">点击任意处开始</div>}
    {started && <>
      <nav className="title-menu" aria-label="主菜单">
        <button onClick={openSetup}><b>AI 对战</b><small>VS COMPUTER</small></button>
        <button onClick={openOnline}><b>联机对战</b><small>ONLINE · STEAM</small></button>
        <button onClick={openSettings}><b>设置</b><small>SETTINGS</small></button>
        <button onClick={openHelp}><b>玩法说明</b><small>HOW TO PLAY</small></button>
        <button className="quit" onClick={openQuit}><b>退出游戏</b><small>QUIT</small></button>
      </nav>
    </>}
  </section>;
}

function App({ session = defaultSession }) {
  const game = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [settings, setSettings] = useState(loadSettings);
  const updateSettings = patch => setSettings(current => { const next = { ...current, ...patch }; saveSettings(next); return next; });
  useEffect(() => { session.setAiDifficulty(settings.difficulty); session.setArenaSkin(settings.arena); }, []);
  useEffect(() => {
    session.toggleSound(settings.sound);
    session.sound.setVolumes?.({ music: settings.music, sfx: settings.sfx });
  }, [settings.sound, settings.music, settings.sfx]);
  const [started, setStarted] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [setupMode, setSetupMode] = useState(null);
  // Title ↔ setup: the screen being left slides away while the camera flies
  // to the next shot (ArenaView's flight), then it unmounts.
  const [titleLeaving, setTitleLeaving] = useState(false);
  const [setupLeaving, setSetupLeaving] = useState(false);
  const leaveTimer = useRef(0);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const [mouseLocked, setMouseLocked] = useState(false);
  const [ready, setReady] = useState(false);
  // Draw the arena pictures for the setup screen in the background as soon as
  // the game is up, so they are already there when the screen opens.
  useEffect(() => { if (ready) return loadArenaPreviews(() => {}); }, [ready]);
  useEffect(() => {
    const change = () => setMouseLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', change);
    return () => document.removeEventListener('pointerlockchange', change);
  }, []);

  // The first click unlocks audio (browsers require a gesture) and starts the menu music.
  const start = () => {
    if (started) return;
    setStarted(true);
    void session.sound.unlock();
    session.sound.playMusic?.('menu');
  };
  useEffect(() => {
    if (started) return;
    const onPointer = () => start();
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, [started]);

  // The online link closed (peer left, network dropped): tidy up and say why.
  useEffect(() => {
    if (game.net?.phase !== 'closed' || onlineOpen) return;
    setToast(game.net.message || '联机已结束。');
    session.net?.dispose();
    dropSetup();
    session.goHome();
  }, [game.net?.phase, onlineOpen]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  // A Steam invite accepted in the overlay, or the one Steam launched the game with.
  const [invite, setInvite] = useState(null);
  useEffect(() => {
    const api = onlineAvailable() ? window.wankaiNet : null;
    if (!api?.onInvite) return;
    const accept = lobbyId => {
      if (!lobbyId) return;
      if (session.net?.phase === 'connected') { setToast('正在联机对战中，无法接受新的邀请。'); return; }
      if (session.state !== 'lobby') session.goHome();
      dropSetup();
      setInvite(lobbyId);
      setOnlineOpen(true);
    };
    api.takeInvite?.().then(accept, () => {});
    return api.onInvite(accept);
  }, []);

  const active = game.state !== 'lobby';
  const online = game.mode === 'online' && !!game.net;
  const menuOpen = game.state === 'paused' || game.menuOpen;
  const overlayOpen = helpOpen || settingsOpen || onlineOpen || quitOpen || setupMode !== null;
  // The desktop app closes its window; a browser preview can only try.
  const quitGame = () => { if (window.wankaiApp) window.wankaiApp.quit(); else window.close(); };
  const click = () => session.sound.ui?.('click');

  const leaveOnline = () => { session.net?.leave('你离开了房间。'); session.net?.dispose(); };
  const goHome = () => { if (online) leaveOnline(); session.goHome(); };
  const openSetup = mode => {
    click(); session.clearKeys(); clearTimeout(leaveTimer.current);
    setSetupLeaving(false); setTitleLeaving(true); setSetupMode(mode);
    leaveTimer.current = setTimeout(() => setTitleLeaving(false), 340);
  };
  const closeSetup = () => {
    if (setupLeaving) return;
    session.sound.ui?.('back'); if (setupMode === 'online') leaveOnline();
    clearTimeout(leaveTimer.current); setTitleLeaving(false); setSetupLeaving(true);
    leaveTimer.current = setTimeout(() => { setSetupMode(null); setSetupLeaving(false); }, 300);
  };
  const dropSetup = () => { clearTimeout(leaveTimer.current); setSetupLeaving(false); setTitleLeaving(false); setSetupMode(null); };
  const startOrResume = () => { session.resume(); lockView(); };
  const rematch = () => { if (online) session.net?.requestRematch(); else { session.startRound(); lockView(); } };
  const chooseArena = skin => {
    if (online) session.net?.setArena(skin); else session.setArenaSkin(skin);
    if (!online || game.net?.role === 'host') updateSettings({ arena: skin });
  };
  const chooseDifficulty = difficulty => { session.setAiDifficulty(difficulty); updateSettings({ difficulty }); };

  // Round starts (including online starts sent by the host) take the mouse.
  const lastState = useRef(game.state);
  useEffect(() => {
    if (lastState.current !== 'countdown' && game.state === 'countdown') { dropSetup(); lockView(); }
    lastState.current = game.state;
  }, [game.state]);

  useEffect(() => {
    const onKeyDown = event => {
      if (!started) { event.preventDefault(); if (!event.repeat) start(); return; }
      if (setupMode !== null) {
        if (event.code === 'Escape' && !event.target.closest?.('dialog')) { event.preventDefault(); closeSetup(); }
        return;
      }
      if (CONTROL_KEYS.has(event.code)) {
        event.preventDefault();
        if (!overlayOpen) session.keyDown(event.code);
      }
      if (event.repeat || overlayOpen || event.target.closest?.('dialog')) return;
      if (event.code === 'Escape') { event.preventDefault(); session.pause(); }
      if (event.code === 'KeyR' && session.state === 'playing' && session.mode === 'ai') { session.startRound(); lockView(); }
      if (event.code === 'Enter' && session.state === 'lobby' && event.target.tagName !== 'BUTTON') { event.preventDefault(); openSetup('ai'); }
    };
    const onKeyUp = event => session.keyUp(event.code);
    const onBlur = () => { session.clearKeys(); if (LOOK_STATES.has(session.state)) session.pause(); };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [overlayOpen, setupMode, setupLeaving, started]);

  useEffect(() => {
    Object.defineProperty(window, '__arena', { configurable: true, value: Object.freeze({
      session,
      snapshot: () => JSON.parse(JSON.stringify({ state: session.state, mode: session.mode, menuOpen: session.menuOpen, localPlayerId: session.localPlayerId,
        loadouts: session.loadouts.map(p => ({ ...p })), time: session.world.time, winner: session.world.winner, players: session.world.players,
        projectiles: session.world.projectiles, arenaSkin: session.arenaSkin, lastHit: session.world.lastHit, net: session.netInfo })),
      rendererInfo: () => session.renderer ? ({ geometries: session.renderer.info.memory.geometries, textures: session.renderer.info.memory.textures, calls: session.renderer.info.render.calls }) : null,
    }) });
    return () => { delete window.__arena; };
  }, []);

  const local = game.localPlayerId, other = 1 - local;
  const winner = game.winner;
  const resultTitle = winner === -1 ? '平局' : winner === local ? '你赢了！' : online ? '对手获胜' : 'AI 获胜';
  const waitingRematch = online && game.net?.local?.rematch;

  return <>
    <div className={`arena-screen${active ? ' in-match' : ' lobby-screen'}`}>
      <main id="game-shell">
        <div id="viewport"><CanvasBoundary onError={() => { session.error = '3D 场景无法载入，请检查 WebGL 2 和硬件加速。'; session.publish(); setReady(true); }}>
          <ArenaCanvas session={session} loadouts={game.loadouts} skin={game.arenaSkin}
            onReady={() => setReady(true)} sensitivity={settings.sensitivity} invertY={settings.invertY} />
        </CanvasBoundary></div>

        {!active && ready && !game.error && (setupMode === null || titleLeaving) && <TitleScreen started={started} leaving={titleLeaving} openSetup={() => openSetup('ai')}
          openOnline={() => { click(); setOnlineOpen(true); }} openSettings={() => { click(); setSettingsOpen(true); }} openHelp={() => { click(); setHelpOpen(true); }}
          openQuit={() => { click(); setQuitOpen(true); }} />}

        {active && <>
          <section className="hud-top" aria-label="对战状态">
            <FighterCard id={local} side="left" tag="你" health={game.health[local]} stamina={game.stamina[local]} loadout={game.loadouts[local]} skill={game.skills[local]} />
            <div className="hud-center">
              <div className="match-clock"><b>{clock(game.seconds)}</b>
                <small>{online ? `联机${game.net?.ping != null ? ` · ${game.net.ping} ms` : ''}` : `AI · ${AI_DIFFICULTIES[game.aiDifficulty]?.label ?? ''}`}</small></div>
              <button className="menu-button" onClick={() => session.pause()} aria-label="打开菜单">Ⅱ</button>
            </div>
            <FighterCard id={other} side="right" tag={online ? '对手' : 'AI'} health={game.health[other]} stamina={game.stamina[other]} loadout={game.loadouts[other]} skill={game.skills[other]} />
          </section>
          {game.state !== 'result' && <>
            <HeadingGuide />
            <Keys game={game} />
            <SkillWidget skill={game.skills[local]} pressed={game.pressed.includes('KeyF')} />
          </>}
          {!mouseLocked && LOOK_STATES.has(game.state) && !menuOpen && <div className="look-hint" aria-live="polite">点击画面锁定鼠标 · 移动鼠标转动视角</div>}
        </>}
        <div id="effects" aria-hidden="true">{game.effects.map(effect => effect.text
          ? <div key={effect.id} id={`effect-${effect.id}`} className={`skill-word kind-${effect.kind}`}>{effect.text}</div>
          : <div key={effect.id} id={`effect-${effect.id}`} className="damage-number">{effect.damage >= 22 && <span className="impact-word">重击!</span>}−{effect.damage}</div>)}</div>
        <div key={game.countdownText} id="countdown" className={/^[1-9]$/.test(game.countdownText) ? 'pop' : ''} aria-live="polite">{game.countdownText}</div>
        <div className={`hit-readout${game.readout ? ' visible' : ''}`}><span>{game.readout?.label ?? '有效命中'}</span><strong>−{game.readout?.damage ?? 0}</strong><small>{game.readout?.detail ?? ''}</small></div>

        {toast && <div className="toast" role="status">{toast}</div>}
        {!ready && !game.error && <div className="loading"><span className="loader" /><p>正在布置竞技场…</p></div>}
        {game.error && <div className="error-panel"><h2>竞技场暂时无法载入</h2><p>{game.error}</p><button className="primary-button" onClick={() => location.reload()}>重新加载</button></div>}
      </main>
    </div>

    {helpOpen && <Modal label="玩法说明" onCancel={() => setHelpOpen(false)}><HelpContent close={() => setHelpOpen(false)} /></Modal>}
    {quitOpen && <Modal label="退出游戏" className="quit-modal" onCancel={() => setQuitOpen(false)}>
      <span className="eyebrow">QUIT</span>
      <h2>要退出游戏吗？</h2>
      <div className="quit-actions">
        <button className="secondary-button" onClick={() => setQuitOpen(false)}>再玩一会</button>
        <button className="primary-button" onClick={quitGame}>退出游戏<span>→</span></button>
      </div>
    </Modal>}
    {settingsOpen && <Modal label="设置" className="settings-modal" onCancel={() => setSettingsOpen(false)}>
      <button className="modal-close" onClick={() => setSettingsOpen(false)} aria-label="关闭设置">×</button>
      <span className="eyebrow">SETTINGS</span><h2>设置</h2>
      <SettingsPanel settings={settings} update={updateSettings} />
    </Modal>}
    {onlineOpen && <Modal label="联机对战" className="online-modal" onCancel={() => { if (!session.net || session.net.phase !== 'connected') cancelOnline(session); setOnlineOpen(false); }}>
      <OnlinePanel game={game} session={session} close={() => setOnlineOpen(false)} onConnected={() => { setOnlineOpen(false); openSetup('online'); }}
        invite={invite} onInviteHandled={() => setInvite(null)} />
    </Modal>}
    {setupMode !== null && <MatchSetup game={game} session={session} net={session.net} mode={setupMode} leaving={setupLeaving} close={closeSetup}
      chooseArena={chooseArena} chooseDifficulty={chooseDifficulty}
      start={() => { session.sound.ui?.('confirm'); session.startRound(setupMode); dropSetup(); lockView(); }} />}
    {menuOpen && !overlayOpen && !game.error && <Modal label="菜单" className="pause-menu" onCancel={startOrResume}>
      <span className="eyebrow">{online ? 'MENU' : 'PAUSED'}</span>
      <h2>{online ? '菜单' : '暂停'}</h2>
      {online && <p className="pause-note">联机对战不会暂停，对局仍在进行。</p>}
      <div className="pause-actions">
        <button className="menu-item" onClick={startOrResume}>继续</button>
        {!online && <button className="menu-item" onClick={() => { session.startRound(); lockView(); }}>重新开始</button>}
        <button className="menu-item" onClick={() => setSettingsOpen(true)}>设置</button>
        <button className="menu-item quiet" onClick={goHome}>{online ? '离开房间' : '回到主菜单'}</button>
      </div>
    </Modal>}
    {game.state === 'result' && !menuOpen && <section className={`victory-panel${winner === local ? ' won' : winner === -1 ? '' : ' lost'}`} aria-label="对战结果">
      <span className="eyebrow">{winner === -1 ? 'DRAW' : winner === local ? 'VICTORY' : 'DEFEAT'}</span>
      <h2>{resultTitle}</h2>
      {winner >= 0 && <p>{loadoutName(game.loadouts[winner])} · 用时 {clock(game.seconds)}</p>}
      <div className="victory-actions">
        <button type="button" className="primary-button" onClick={rematch} disabled={waitingRematch}>{waitingRematch ? '等待对方…' : online && game.net?.peer?.rematch ? '接受再战' : '再战一局'}<span>↻</span></button>
        <button type="button" className="secondary-button" onClick={goHome}>{online ? '离开房间' : '回到主菜单'}</button>
      </div>
    </section>}
  </>;
}

export default App;
