import { Component, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArenaCanvas } from './ArenaCanvas.jsx';
import { CONTROL_KEYS, GameSession } from './game-session.js';
import { Armory } from './Armory.jsx';
import {loadoutName,loadoutKey,isEarLoadout,isPawLoadout} from './loadouts.js';
import {CHARACTERS,characterName} from './character-catalog.js';
import {CharacterPortrait} from './selection-icons.jsx';
import { STAMINA } from './physics.js';
import './style.css';

const defaultSession = new GameSession();

// Capture the mouse for free-look. Called from clicks, which grant the needed user activation;
// the arena may still be hidden behind the preparation page for a frame or two.
const lockView = () => requestAnimationFrame(() => requestAnimationFrame(() =>
  document.querySelector('#viewport canvas')?.requestPointerLock?.()?.catch?.(() => {})));

class CanvasBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error(error); this.props.onError(error); }
  render() {
    if (this.state.error) return <div className="error-panel"><h2>角斗场暂时无法载入</h2><p>请使用支持 WebGL 2 的现代浏览器，并开启硬件加速。</p><button className="primary-button" onClick={() => location.reload()}>重新加载 ↗</button></div>;
    return this.props.children;
  }
}

function Modal({ children, onCancel, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return <dialog ref={ref} className={`modal ${className}`} onCancel={event => { event.preventDefault(); onCancel?.(); }}>{children}</dialog>;
}

const FIGHTER_LABELS = ['你', 'AI'];

function FighterScore({ id, health, stamina, loadout }) {
  const isSecond = id === 1;
  const staminaState = stamina <= 1e-8 ? 'empty' : stamina < STAMINA.lowThreshold ? 'low' : 'ready';
  const staminaLabel = staminaState === 'empty' ? '力竭 · 弱控' : staminaState === 'low' ? '耐力不足' : '耐力';
  return <div className={`fighter fighter-${isSecond ? 'two' : 'one'}`}>
    <div className="fighter-avatar"><CharacterPortrait id={loadout.characterId} critical={health < 10}/></div>
    <div className="fighter-info">
      <div className="fighter-heading"><span><b>{characterName(loadout.characterId)}</b></span><strong aria-label={`生命 ${health} / 100`}>{health}<small>/100</small></strong></div>
      <div className="health-track" role="progressbar" aria-label={`${FIGHTER_LABELS[id]} 生命`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={health}><div className="health-ghost" style={{ transform: `scaleX(${health / 100})` }}></div><div className="health-fill" style={{ transform: `scaleX(${health / 100})` }}></div></div>
      <div className={`stamina-meter stamina-${staminaState}`}>
        <div className="stamina-heading"><span>{staminaLabel}</span><span>{Math.ceil(stamina - 1e-8)} / {STAMINA.max}</span></div>
        <div className="stamina-track" role="progressbar" aria-label={`${FIGHTER_LABELS[id]} 耐力`} aria-valuemin={0} aria-valuemax={STAMINA.max} aria-valuenow={Math.round(stamina)} aria-valuetext={`${Math.round(stamina)} / ${STAMINA.max}，${staminaLabel}`}><div className="stamina-fill" style={{ transform: `scaleX(${stamina / STAMINA.max})` }}></div></div>
      </div>
    </div>
  </div>;
}

function KeyGrid({ codes, labels, pressed }) {
  return <div className="key-grid">{codes.map((code, i) => <kbd key={code} data-key={code} className={pressed.includes(code) ? 'pressed' : ''}>{labels[i]}</kbd>)}</div>;
}

function HeadingGuide() {
  return <div className="heading-guide" aria-label="武器挥动平面，相对当前视角。">
    <strong>武器朝向</strong><span>相对当前视角</span>
    <div className="heading-dial"><div id="staff-heading-arrow" className="heading-arrow">↑</div></div>
    <small>A / D 转动武器</small>
  </div>;
}

function HelpContent({ close }) {
  return <>
    <button className="modal-close" onClick={close} aria-label="关闭玩法说明">×</button>
    <span className="eyebrow">A LITTLE FIELD GUIDE</span><h2>四个按键，转动武器。</h2>
    <p className="modal-intro">你控制的是兵器、双耳或巨爪的转动力。角色与武器分别选择：基础丸人和比格犬均可使用漂浮的短剑、长柄刀或战锤。橘猫装备巨爪，低空悬浮时可按 W / S 挥爪，S 触地后撑起身体；A / D 转向，也可与 W / S 组合。巨爪共用耐力，没有额外技能。只有比格犬装备长耳时，W / S 前后挥耳撑地，A / D 同时转向，普通转向时双耳保持并列。按 F 启动 5 秒旋耳悬停，不消耗耐力，时间到后自动收耳落地。松开技能键不会提前结束。悬停时 W / S 暂停挥耳，A / D 可改变旋转方向。点击画面锁定鼠标后，移动鼠标转动视角，角色的身体和脸始终朝向视角方向，滚轮调整远近，Esc 释放鼠标并暂停。A / D 只转动武器，不会带着镜头或身体转向。</p>
    <div className="guide-steps">
      <article><span>01</span><div><h3>撑地，才走得动</h3><p>用 A / D 调整水平方向，再用 W 或 S 选择挥动方向。武器触地后，继续挥动可撑起并带动身体；角色没有独立行走按键。</p></div></article>
      <article><span>02</span><div><h3>选择挥动方向</h3><p>W 让武器向角色正面旋转，S 向背面旋转；在头顶可以选前后，触地后继续按住可撑起身体并转到另一侧。A / D 只改变水平方向，也可与 W 或 S 同时按。松手后保留惯性，并受重力和阻尼影响。</p></div></article>
      <article><span>03</span><div><h3>竖挥重击，横转轻打</h3><p>武器撞中头部或躯干都会扣血，伤害相同。相同碰撞速度与发力下，纯横转命中伤害为竖挥的一半；组合挥动按实际碰撞方向混合计算。松手后的惯性命中也遵循此规则。武器之间可以互相格挡，有力相撞会让双方沿各自面向的反方向后退；轻触和持续贴住不会反复触发。</p></div></article>
      <article><span>04</span><div><h3>留些耐力，再挥下一棍</h3><p>每人 200 耐力。竖挥每秒消耗 20，横转每秒消耗 8，同时操作叠加。比格犬装备长耳时，旋耳悬停使用独立的 5 秒计时，不消耗耐力，低耐力也可发动。放开武器操作半秒后，每秒恢复 30。耐力低于 25 时逐渐变慢；耗尽仍可弱控、撑地与格挡，反向刹车保持灵敏。转动镜头不耗耐力。</p></div></article>
    </div>
    <div className="guide-note"><b>100 HP · 血量归零判负</b><span>圆台有边界，不会掉落。</span></div>
    <button className="primary-button" onClick={close}>明白了，抡起来 <span>↗</span></button>
  </>;
}

function App({session=defaultSession}) {
  const game = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [helpOpen, setHelpOpen] = useState(false);
  const optionsRef = useRef(null);
  useEffect(() => {
    const closeOutside = event => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) optionsRef.current.open = false;
    };
    window.addEventListener('pointerdown', closeOutside);
    return () => window.removeEventListener('pointerdown', closeOutside);
  }, []);
  const [armoryMode, setArmoryMode] = useState(null);
  const [mouseLocked, setMouseLocked] = useState(false);
  useEffect(() => {
    const change = () => setMouseLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', change);
    return () => document.removeEventListener('pointerlockchange', change);
  }, []);
  const [ready, setReady] = useState(false);
  const [introPhase, setIntroPhase] = useState('cover');
  const intro = useRef({ phase: 'cover', elapsed: 0, transition: 0, angle: -.72 });
  const finishIntro = () => {
    if (intro.current.phase === 'returning') {
      intro.current.orbitBase = intro.current.angle;
      intro.current.elapsed = 0;
      intro.current.phase = 'cover';
      setIntroPhase('cover');
    } else {
      intro.current.idle = 0;
      intro.current.phase = 'done';
      setIntroPhase('done');
    }
  };
  const beginIntro = () => {
    if (!ready || intro.current.phase !== 'cover') return;
    intro.current.transition = 0;
    intro.current.phase = 'transition';
    intro.current.startAngle = Math.atan2(Math.sin(intro.current.angle), Math.cos(intro.current.angle));
    session.clearKeys();
    setIntroPhase('transition');
  };
  useEffect(() => {
    const onPointer = event => {
      if (intro.current.phase === 'done' || session.error) return;
      event.preventDefault(); event.stopPropagation(); beginIntro();
    };
    window.addEventListener('pointerdown', onPointer, true);
    return () => window.removeEventListener('pointerdown', onPointer, true);
  }, [ready]);
  const helpResume = useRef(false);
  const preparationTrigger = useRef(null);
  const active = game.state !== 'lobby';

  const openPreparation = mode => {
    preparationTrigger.current = document.activeElement;
    session.clearKeys();
    setArmoryMode(mode);
  };
  useEffect(() => {
    if (armoryMode === null && preparationTrigger.current) {
      const trigger = preparationTrigger.current;
      preparationTrigger.current = null;
      if (trigger.isConnected) trigger.focus({preventScroll:true});
    }
  }, [armoryMode]);

  const openHelp = () => {
    helpResume.current = session.state === 'playing' || session.state === 'countdown';
    if (helpResume.current) session.pause();
    session.clearKeys();
    setHelpOpen(true);
  };
  const closeHelp = () => {
    setHelpOpen(false);
    if (helpResume.current) { helpResume.current = false; session.resume(); }
  };

  useEffect(() => {
    const onKeyDown = event => {
      if (intro.current.phase !== 'done' && !session.error) {
        event.preventDefault();
        if (!event.repeat) beginIntro();
        return;
      }
      if (armoryMode !== null) {
        if (event.code === 'Escape') { event.preventDefault(); setArmoryMode(null); }
        return;
      }
      if (CONTROL_KEYS.has(event.code)) {
        event.preventDefault();
        if (!helpOpen) session.keyDown(event.code);
      }
      if (event.repeat || helpOpen || event.target.closest?.('dialog')) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        if (session.state === 'lobby' && intro.current.lastPose) {
          intro.current.returnFrom = {...intro.current.lastPose};
          intro.current.returnTime = 0;
          intro.current.returnAngle = Math.atan2(intro.current.lastPose.x, intro.current.lastPose.z);
          intro.current.phase = 'returning';
          session.clearKeys();
          if (optionsRef.current) optionsRef.current.open = false;
          setIntroPhase('returning');
        } else session.pause();
      }
      if (event.code === 'KeyR' && session.state === 'playing') session.startRound();
      if (event.code === 'Enter' && session.state === 'lobby' && event.target.tagName !== 'BUTTON') {
        event.preventDefault(); openPreparation('ai');
      }
    };
    const onKeyUp = event => session.keyUp(event.code);
    const onBlur = () => { session.clearKeys(); session.pause(); };
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
  }, [helpOpen, armoryMode, ready]);

  useEffect(() => {
    Object.defineProperty(window, '__arena', { configurable: true, value: Object.freeze({
      snapshot: () => JSON.parse(JSON.stringify({ state: session.state, mode: session.mode, loadouts: session.loadouts.map(p=>({...p})), time: session.world.time, winner: session.world.winner, players: session.world.players, lastHit: session.world.lastHit })),
      rendererInfo: () => session.renderer ? ({ geometries: session.renderer.info.memory.geometries, textures: session.renderer.info.memory.textures, calls: session.renderer.info.render.calls }) : null,
    }) });
    return () => { delete window.__arena; };
  }, []);

  const winner = game.winner;
  const resultTitle = winner === -1 ? '平局' : winner === game.localPlayerId ? '你赢了' : `${FIGHTER_LABELS[winner]} 获胜`;
  const winningCharacter = winner >= 0 ? CHARACTERS[game.loadouts[winner]?.characterId] : null;

  return <>
    <div className={`arena-screen${active ? '' : ' lobby-screen'} intro-${introPhase}`} hidden={armoryMode !== null}>
    <header className="topbar">
      <a className="brand" href="./" aria-label="丸棍竞技场首页" onClick={event => { event.preventDefault(); session.goHome(); }}><span className="brand-mark"><i></i><b></b></span><span><span className="brand-name">木昆</span><span className="brand-light">竞技场</span><small> MU KUN / ARENA</small></span></a>
      <nav aria-label="游戏选项">
        <details className="options-menu" ref={optionsRef} onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); optionsRef.current.open = false; optionsRef.current.querySelector('summary').focus(); }
        }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
          <summary className="options-toggle" aria-label="展开游戏选项" title="游戏选项">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </summary>
          <div className="options-dropdown">
            <button onClick={() => session.toggleSound()} aria-pressed={game.soundEnabled}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{game.soundEnabled && <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>}</svg>
              {game.soundEnabled ? '关闭声音' : '开启声音'}
            </button>
            <button onClick={() => { optionsRef.current.open = false; openHelp(); }}><span className="help-icon">?</span>玩法说明</button>
          </div>
        </details>
      </nav>
    </header>

    <main id="game-shell">
      <div id="viewport"><CanvasBoundary onError={() => { session.error = '3D 场景无法载入，请检查 WebGL 2 和硬件加速。'; session.publish(); setReady(true); }}><ArenaCanvas key={game.loadouts.map(loadoutKey).join('-')} session={session} loadouts={game.loadouts} intro={intro.current} onIntroComplete={finishIntro} onReady={() => setReady(true)} /></CanvasBoundary></div>
      <div className="arena-caption"><span className="eyebrow">THE PIT / 01</span><span>兵器与双耳，各有所长。</span></div>
      <div className="arena-coordinate" aria-hidden="true">{active ? '自由视角' : 'N ↑'}<br/><span>{active ? 'MOUSE LOOK' : '35° / FIXED VIEW'}</span></div>
      {active && !mouseLocked && (game.state === 'playing' || game.state === 'countdown') && <div className="look-hint" aria-live="polite">点击画面锁定鼠标 · 移动鼠标转动视角</div>}
      {active && <HeadingGuide />}
      <section className="scoreboard" aria-label="对战血量">
        <FighterScore id={0} health={game.health[0]} stamina={game.stamina[0]} loadout={game.loadouts[0]} />
        <FighterScore id={1} health={game.health[1]} stamina={game.stamina[1]} loadout={game.loadouts[1]} />
      </section>
      <div id="effects" aria-hidden="true">{game.effects.map(effect => <div key={effect.id} id={`effect-${effect.id}`} className="damage-number">{effect.damage >= 22 && <span className="impact-word">重 击 !</span>}−{effect.damage}</div>)}</div>
      <div key={game.countdownText} id="countdown" className={/^[1-9]$/.test(game.countdownText) ? 'pop' : ''} style={game.countdownText === '抡起来' ? { fontSize: 56 } : undefined} aria-live="polite">{game.countdownText}</div>
      <div className={`hit-readout${game.readout ? ' visible' : ''}`}><span>{game.readout?.label ?? '有效命中'}</span><strong>−{game.readout?.damage ?? 0}</strong><small>{game.readout?.detail ?? ''}</small></div>

      {(introPhase === 'cover' || introPhase === 'transition') && ready && !game.error && <>
        <h1 className={`intro-title ${introPhase === 'transition' ? 'leaving' : ''}`}>Gun !</h1>
        <div className={`intro-prompt ${introPhase === 'transition' ? 'leaving' : ''}`}>按下任意地方开始游戏</div>
      </>}
      {game.state === 'lobby' && <nav className="lobby-actions" aria-label="主菜单">
        <button className="secondary-button" onClick={() => openPreparation('browse')}><span className="lobby-button-content">角色与武器</span></button>
        <button className="primary-button" onClick={() => openPreparation('ai')}><span className="lobby-button-content">AI 对战</span></button>
      </nav>}
      {active && <div className="match-tools"><button className="pill-button" onClick={() => session.pause()}>Ⅱ 暂停 <kbd>ESC</kbd></button><button className="pill-button" onClick={() => session.startRound()} title="重新开始当前对局">↻ 重开</button><button className="pill-button" onClick={() => session.goHome()} title="回到主菜单">返回</button></div>}
      {active && <div className="live-tip"><span className="status-dot"></span><span>W / S 前后挥动 · A / D 转动武器 · 鼠标转动视角与身体朝向 · Esc 释放鼠标</span></div>}
      {!ready && !game.error && <div className="loading"><span className="loader"></span><p>正在布置角斗场…</p></div>}
      {game.error && <div className="error-panel"><h2>角斗场暂时无法载入</h2><p>{game.error}</p><button className="primary-button" onClick={() => location.reload()}>重新加载 ↗</button></div>}
    </main>

    <footer className="controls-bar">
      <div className="control-block"><span className="player-chip red">你</span><KeyGrid codes={['KeyW', 'KeyA', 'KeyS', 'KeyD']} labels={['W', 'A', 'S', 'D']} pressed={game.pressed}/><div className="control-copy"><b>{loadoutName(game.loadouts[0])}</b><span>W 朝正面挥 <i>·</i> S 朝背面挥 <i>·</i> A / D 水平转向 · 可组合{isPawLoadout(game.loadouts[0])&&<><br/>S 触地撑起身体 · 巨爪共用耐力</>}{isEarLoadout(game.loadouts[0])&&<><br/><kbd data-key="KeyF" className={game.pressed.includes('KeyF')?'pressed':''}>F</kbd> 旋耳悬停{game.skills[0]?.active?` · ${game.skills[0].remaining.toFixed(1)} 秒`:''}</>}</span></div></div>
      <div className="control-motto"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/><path d="m10 30 20-20M9 27l4 4M27 9l4 4"/></svg><span>身体不听指挥<br/><b>武器才是主角</b></span></div>
      <div className="control-copy view-help"><b>鼠标控制视角</b><span>移动鼠标转动视角 <i>·</i> 身体朝向视角 <i>·</i> 滚轮缩放</span></div>
    </footer>
    </div>

    {helpOpen && <Modal onCancel={closeHelp}><HelpContent close={closeHelp}/></Modal>}
    {armoryMode !== null && <main className={`preparation-stage${armoryMode === 'ai' ? ' styled-versus' : ''}`} aria-labelledby={armoryMode==='ai'?undefined:'preparation-title'} aria-label={armoryMode==='ai'?'AI 对战出战配置':undefined}><Armory game={game} session={session} mode={armoryMode} close={() => setArmoryMode(null)} start={() => { session.startRound(armoryMode); setArmoryMode(null); lockView(); }}/></main>}
    {game.state === 'paused' && !helpOpen && !game.error && <Modal className="pause-menu" onCancel={() => session.resume()}>
      <h2>停！</h2>
      <div className="pause-actions">
        <button onClick={() => { session.resume(); lockView(); }}><span className="lobby-button-content">继续对战</span></button>
        <button onClick={() => session.goHome()}><span className="lobby-button-content">回到主菜单</span></button>
      </div>
    </Modal>}
    {game.state === 'result' && <section className="victory-overlay" aria-label="对战结果">
      <h2>{resultTitle}</h2>
      {winningCharacter&&<div className="victory-portrait" key={winningCharacter.id}>
        {winningCharacter.victoryPortrait?<img src={`${import.meta.env.BASE_URL}${winningCharacter.victoryPortrait}`} alt={`${winningCharacter.name}胜利姿态`}/>:<CharacterPortrait id={winningCharacter.id}/>}
      </div>}
      <div className="victory-actions">
        <button type="button" onClick={() => { session.startRound(); lockView(); }}><span className="lobby-button-content">再战一局</span></button>
        <button type="button" onClick={() => session.goHome()}><span className="lobby-button-content">回到主菜单</span></button>
      </div>
    </section>}

  </>;
}

export default App;
