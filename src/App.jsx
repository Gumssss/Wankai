import { Component, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArenaCanvas } from './ArenaCanvas.jsx';
import { CONTROL_KEYS, GameSession } from './game-session.js';
import { Armory } from './Armory.jsx';
import { weaponName } from './weapon-catalog.js';
import {loadoutName,loadoutKey,isEarLoadout,isPawLoadout} from './loadouts.js';
import {playerDisplayName,damageOwnerLabel} from './player-identity.js';
import { STAMINA } from './physics.js';
import {ROUND_RULES,ROTOR_RESOURCE,CHARACTER_HEALTH} from './combat-settings.js';
import './style.css';

const defaultSession = new GameSession();

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

function FighterScore({ id, health, maxHealth, stamina, practice, loadout, skill }) {
  const shownHealth=Math.ceil(health-1e-8);
  const isSecond = id === 1;
  const staminaState = stamina <= 1e-8 ? 'empty' : stamina < STAMINA.lowThreshold ? 'low' : 'ready';
  const staminaLabel = staminaState === 'empty' ? '力竭 · 弱控' : staminaState === 'low' ? '耐力不足' : '耐力';
  return <div className={`fighter fighter-${isSecond ? 'two' : 'one'}`}>
    <div className="fighter-avatar"><span></span><i></i></div>
    <div className="fighter-info">
      <div className="fighter-heading"><span><b>{playerDisplayName(id,loadout,practice)}</b> <small>{loadout?weaponName(loadout.weaponId):''}</small></span><strong aria-label={`生命 ${shownHealth} / ${maxHealth}`}>{shownHealth}<small>/{maxHealth}</small></strong></div>
      <div className="health-track" role="progressbar" aria-label={`P${id + 1} 生命`} aria-valuemin={0} aria-valuemax={maxHealth} aria-valuenow={shownHealth}><div className="health-ghost" style={{ transform: `scaleX(${health / maxHealth})` }}></div><div className="health-fill" style={{ transform: `scaleX(${health / maxHealth})` }}></div></div>
      <div className={`stamina-meter stamina-${staminaState}`}>
        <div className="stamina-heading"><span>{staminaLabel}</span><span>{Math.ceil(stamina - 1e-8)} / {STAMINA.max}</span></div>
        <div className="stamina-track" role="progressbar" aria-label={`P${id + 1} 耐力`} aria-valuemin={0} aria-valuemax={STAMINA.max} aria-valuenow={Math.round(stamina)} aria-valuetext={`${Math.round(stamina)} / ${STAMINA.max}，${staminaLabel}`}><div className="stamina-fill" style={{ transform: `scaleX(${stamina / STAMINA.max})` }}></div></div>
      </div>
      <SkillStatus loadout={loadout} skill={skill}/>
    </div>
  </div>;
}

function SkillStatus({loadout,skill}) {
  if(!isEarLoadout(loadout))return null;
  return <small className="skill-status">旋耳 · {skill?.active?`${skill.remaining.toFixed(1)} 秒`:skill?.retracting?'收耳中':skill?.ready?'就绪':`需 ${ROTOR_RESOURCE.activationMinimum} 耐力`} · {ROTOR_RESOURCE.drain} 耐力/秒</small>;
}

function KeyGrid({ codes, labels, pressed }) {
  return <div className="key-grid">{codes.map((code, i) => <kbd key={code} data-key={code} className={pressed.includes(code) ? 'pressed' : ''}>{labels[i]}</kbd>)}</div>;
}

function HeadingGuide({ id, split, name }) {
  return <div className={`heading-guide${split ? ` pane-heading pane-heading-${id}` : ''}`} aria-label={`${name} 角色面向与武器挥动平面，相对自己的视角。`}>
    <strong>{name} · 面向</strong><span>相对当前视角</span>
    <div className="heading-dial"><div id={`staff-heading-arrow-${id}`} className="heading-arrow">↑</div></div>
    <small>{id === 0 ? 'A / D 转动武器' : '← / → 转动武器'}</small>{split && <small>{id === 0 ? 'Q / E 转动视角' : '. / ? 转动视角'}</small>}
  </div>;
}

function HelpContent({ close }) {
  return <>
    <button className="modal-close" onClick={close} aria-label="关闭玩法说明">×</button>
    <span className="eyebrow">A LITTLE FIELD GUIDE</span><h2>四个按键，转动武器。</h2>
    <p className="modal-intro">你控制的是兵器、双耳或巨爪的转动力。角色与武器分别选择：基础丸人和比格犬均可使用漂浮的短剑、长柄刀或战锤。橘猫装备巨爪，低空悬浮时可按 W / S 挥爪，S 触地后撑起身体；A / D 转向，也可与 W / S 组合。巨爪共用耐力，没有额外技能。比格犬长耳只有外侧一半（1.8–3.6 单位）可命中、格挡与撑地，内侧仅作展示。只有比格犬装备长耳时，W / S 前后挥耳撑地，A / D 同时转向，普通转向时双耳保持并列。按 F（P2 右 Shift）启动最多 5 秒旋耳悬停，需要 40 耐力，每秒消耗 16；耗尽或时间到后自动收耳落地。松开技能键不会提前结束。悬停时 W / S 暂停挥耳，A / D 可改变旋转方向。分屏中 Q / E 转动 P1 视角，句号 / 问号键转动 P2 视角（无需 Shift），松开保持角度。武器转向不会带着镜头转向。</p>
    <div className="guide-steps">
      <article><span>01</span><div><h3>撑地，才走得动</h3><p>用 A / D（← / →）调整水平方向，再用 W 或 S（↑ 或 ↓）选择挥动方向。武器触地后，继续挥动可撑起并带动身体；角色没有独立行走按键。</p></div></article>
      <article><span>02</span><div><h3>选择挥动方向</h3><p>W（↑）让武器向角色正面旋转，S（↓）向背面旋转；在头顶可以选前后，触地后继续按住可撑起身体并转到另一侧。A / D（← / →）只改变水平方向，也可与 W 或 S 同时按。松手后保留惯性，并受重力和阻尼影响。</p></div></article>
      <article><span>03</span><div><h3>竖挥重击，横转轻打</h3><p>武器撞中头部或躯干都会扣血，伤害相同。相同碰撞速度与发力下，纯横转命中伤害为竖挥的一半；组合挥动按实际碰撞方向混合计算。松手后的惯性命中也遵循此规则。武器之间可以互相格挡，有力相撞会让双方沿双方连线分开；轻触和持续贴住不会反复触发。</p></div></article>
      <article><span>04</span><div><h3>留些耐力，再挥下一棍</h3><p>每人 200 耐力。竖挥每秒消耗 20，横转每秒消耗 10，同时操作叠加。旋耳悬停需 40 耐力发动，每秒消耗 16，展开、旋转与收耳期间不回复。放开武器操作 0.6 秒后，每秒恢复 24。耐力低于 60 时逐渐变慢，猫爪、普通长耳与旋耳均受影响；耗尽仍可弱控、撑地与格挡，反向刹车保持灵敏。转动镜头不耗耐力。</p></div></article>
    </div>
    <div className="guide-note"><b>基础丸人 {CHARACTER_HEALTH['basic-fighter']} HP · 比格犬 {CHARACTER_HEALTH.beagle} HP · 黄团子 {CHARACTER_HEALTH['yellow-blob']} HP · 橘猫 {CHARACTER_HEALTH['orange-tabby']} HP</b><span>对战最多 120 秒，45 秒后安全圈逐渐收缩；圈外警告 2 秒后，每秒损失最大生命的 10%。时间到按剩余生命百分比判胜，相同则平局。圆台边界固定。练习使用同一圆台与出生点，木桩停止受击后恢复至自身满血，无缩圈或限时。</span></div>
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
        event.preventDefault(); openPreparation('duel');
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
      snapshot: () => JSON.parse(JSON.stringify({ state: session.state, mode: session.mode, practice: session.practice, loadouts: session.loadouts.map(p=>({...p})), weapons: [session.weapon, session.secondWeapon], time: session.world.time, winner: session.world.winner, players: session.world.players, lastHit: session.world.lastHit })),
      rendererInfo: () => session.renderer ? ({ geometries: session.renderer.info.memory.geometries, textures: session.renderer.info.memory.textures, calls: session.renderer.info.render.calls }) : null,
    }) });
    return () => { delete window.__arena; };
  }, []);

  const winner = game.winner;
  const resultTitle = winner === -1 ? '平分秋色' : `${playerDisplayName(winner,game.loadouts[winner],game.practice)} 获胜`;
  const reason=game.endReason==='timeout'?'时间到，比较剩余生命百分比。':game.endReason==='pressure'?'安全圈外生命耗尽。':'生命归零。';
  const resultDetail = `本局 ${game.seconds} 秒。${reason}${winner === -1 ? '双方平局，再来一局。' : `胜者剩余 ${Math.ceil(game.health[winner] ?? 0)} / ${game.maxHealth[winner]} 点生命。`}`;
  const clockSeconds=game.practice||game.mode==='solo'?game.seconds:game.remainingSeconds;
  const elapsed = `${String(Math.floor(clockSeconds / 60)).padStart(2, '0')}:${String(clockSeconds % 60).padStart(2, '0')}`;
  const solo = game.mode === 'solo';
  const fixedDuel = game.mode === 'duel-fixed';
  const splitView = game.mode === 'duel' && active;
  const viewIds = splitView ? [0, 1] : [0];

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

    <main id="game-shell" className={`${solo ? 'solo-mode' : ''} ${splitView ? 'split-mode' : ''}`}>
      <div id="viewport"><CanvasBoundary onError={() => { session.error = '3D 场景无法载入，请检查 WebGL 2 和硬件加速。'; session.publish(); setReady(true); }}><ArenaCanvas key={`${solo ? 'solo' : fixedDuel ? 'fixed' : 'shared'}-${game.loadouts.map(loadoutKey).join('-')}`} session={session} mode={game.mode} loadouts={game.loadouts} intro={intro.current} onIntroComplete={finishIntro} onReady={() => setReady(true)} /></CanvasBoundary></div>
      {splitView && <><div className="view-divider" aria-hidden="true"></div><div className="view-name view-one">{playerDisplayName(0,game.loadouts[0],game.practice)} · 自由视角</div><div className="view-name view-two">{playerDisplayName(1,game.loadouts[1],game.practice)} · 自由视角</div></>}
      <div className="arena-caption"><span className="eyebrow">THE PIT / 01</span><span>{solo ? '只有你、武器与圆台。' : '兵器与双耳，各有所长。'}</span></div>
      <div className="arena-coordinate" aria-hidden="true">{solo ? '自由视角' : fixedDuel ? '共享战术视角' : 'N ↑'}<br/><span>{solo ? 'DRAG / ORBIT' : fixedDuel ? 'SHARED TACTICAL VIEW' : '35° / FIXED VIEW'}</span></div>
      {active && (solo || splitView) && viewIds.map(id => <HeadingGuide key={id} id={id} split={splitView} name={playerDisplayName(id,game.loadouts[id],game.practice)} />)}
      <section className="scoreboard" aria-label={solo ? '单人状态' : '对战血量'}>
        <FighterScore id={0} health={game.health[0]} maxHealth={game.maxHealth[0]} skill={game.skills[0]} stamina={game.stamina[0]} practice={game.practice} loadout={game.loadouts[0]} />
        <div className="match-center"><span>{solo ? '自由视角' : game.practice ? '自由练习' : fixedDuel ? '共享战术视角' : '分屏对战'}</span>{!solo && <b>VS</b>}<div>{elapsed}</div></div>
        {!solo && <FighterScore id={1} health={game.health[1]} maxHealth={game.maxHealth[1]} skill={game.skills[1]} stamina={game.stamina[1]} practice={game.practice} loadout={game.loadouts[1]} />}
      </section>
      {active&&!solo&&!game.practice&&<div className={`pressure-status${game.pressure.outside.some(t=>t>0)?' danger':''}`} role="status">
        {game.pressure.active?`安全圈 ${game.pressure.radius.toFixed(1)} m`:`${Math.ceil(game.pressure.startsIn)} 秒后缩圈`}
        {game.pressure.outside.map((t,id)=>t>0&&<span key={id}> · P{id+1} {t<ROUND_RULES.outsideGrace?`圈外警告 ${Math.ceil(ROUND_RULES.outsideGrace-t)} 秒`:'环境扣血 · 返回安全圈'}</span>)}
      </div>}
      {splitView&&viewIds.map(id=><div key={id} id={`opponent-indicator-${id}`} className="opponent-indicator" aria-label={`P${id+1} 对手方向`}><i>➜</i><span>对手</span></div>)}
      {viewIds.flatMap(viewId => (solo ? [0] : [0, 1]).map(playerId => <div key={`${viewId}-${playerId}`} id={`player-label-${viewId}-${playerId}`} className={`player-label ${playerId === 0 ? 'red' : 'blue'}`}><span>{playerDisplayName(playerId,game.loadouts[playerId],game.practice)}</span></div>))}
      <div id="effects" aria-hidden="true">{viewIds.flatMap(viewId => game.effects.map(effect => <div key={`${viewId}-${effect.id}`} id={`effect-${viewId}-${effect.id}`} className={`damage-number damage-${effect.attacker===0?'p1':effect.attacker===1?'p2':'environment'}`} data-attacker={effect.attacker} data-target={effect.target}>{effect.damage >= 22 && <span className="impact-word">重 击 !</span>}{damageOwnerLabel(effect.attacker)} −{effect.damage}</div>))}</div>
      <div key={game.countdownText} id="countdown" className={/^[1-9]$/.test(game.countdownText) ? 'pop' : ''} style={game.countdownText === '抡起来' ? { fontSize: 56 } : undefined} aria-live="polite">{game.countdownText}</div>
      <div className="hit-readouts">{game.readouts.map((readout,id)=><div key={id} className={`hit-readout hit-readout-${id} damage-${id===0?'p1':'p2'}${readout?' visible':''}`} data-attacker={id} role="status" aria-hidden={!readout}>
        <b>{readout?`${playerDisplayName(id,game.loadouts[id],game.practice)} → ${playerDisplayName(readout.target,game.loadouts[readout.target],game.practice)}`:''}</b>
        <span>{readout?.label??'有效命中'}</span><strong>−{readout?.damage??0}</strong><small>{readout?.detail??''}</small>
      </div>)}</div>

      {(introPhase === 'cover' || introPhase === 'transition') && ready && !game.error && <>
        <h1 className={`intro-title ${introPhase === 'transition' ? 'leaving' : ''}`}>Gun !</h1>
        <div className={`intro-prompt ${introPhase === 'transition' ? 'leaving' : ''}`}>按下任意地方开始游戏</div>
      </>}
      {game.state === 'lobby' && <nav className="lobby-actions" aria-label="主菜单">
        <button className="secondary-button" onClick={() => openPreparation('browse')}><span className="lobby-button-content">角色与武器</span></button>
        <button className="primary-button" onClick={() => openPreparation('duel')}><span className="lobby-button-content">双人对战·分</span></button>
        <button className="secondary-button" onClick={() => openPreparation('duel-fixed')}><span className="lobby-button-content">双人对战·同</span></button>
        <button className="secondary-button" onClick={() => openPreparation('practice')}><span className="lobby-button-content">木头练习</span></button>
        <button className="secondary-button" onClick={() => openPreparation('solo')}><span className="lobby-button-content">单人自由视角</span></button>
      </nav>}
      {active && <div className="match-tools"><button className="pill-button" onClick={() => session.pause()}>Ⅱ 暂停 <kbd>ESC</kbd></button><button className="pill-button" onClick={() => session.startRound()} title="重新开始当前对局">↻ 重开</button><button className="pill-button" onClick={() => session.goHome()} title="回到主菜单">返回</button></div>}
      {active && <div className="live-tip"><span className="status-dot"></span><span>{solo ? 'W / S 前后挥动 · A / D 水平转向 · 拖动鼠标转动视角' : game.practice ? '练习模式 · 木桩不主动出招，停止受击后恢复至自身满血' : fixedDuel ? '共享战术视角 · 两位玩家共用同一画面 · P1 WASD / P2 方向键' : '自由视角 · P1：Q / E · P2：. / ?（无需 Shift）· 松开保持角度'}</span></div>}
      {!ready && !game.error && <div className="loading"><span className="loader"></span><p>正在布置角斗场…</p></div>}
      {game.error && <div className="error-panel"><h2>角斗场暂时无法载入</h2><p>{game.error}</p><button className="primary-button" onClick={() => location.reload()}>重新加载 ↗</button></div>}
    </main>

    <footer className={`controls-bar${solo ? ' solo-controls' : ''}`}>
      <div className="control-block"><span className="player-chip red">P1</span><KeyGrid codes={['KeyW', 'KeyA', 'KeyS', 'KeyD']} labels={['W', 'A', 'S', 'D']} pressed={game.pressed}/><div className="control-copy"><b>{playerDisplayName(0,game.loadouts[0],game.practice)} · {weaponName(game.loadouts[0].weaponId)}</b><span>W 朝正面挥 <i>·</i> S 朝背面挥 <i>·</i> A / D 水平转向 · 可组合{isPawLoadout(game.loadouts[0])&&<><br/>S 触地撑起身体 · 巨爪共用耐力</>}{isEarLoadout(game.loadouts[0])&&<><br/><kbd data-key="KeyF" className={game.pressed.includes('KeyF')?'pressed':''}>F</kbd> 旋耳悬停{game.skills[0]?.active?` · ${game.skills[0].remaining.toFixed(1)} 秒`:''}</>}</span></div></div>
      <div className="control-motto"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/><path d="m10 30 20-20M9 27l4 4M27 9l4 4"/></svg><span>身体不听指挥<br/><b>武器才是主角</b></span></div>
      {solo ? <div className="control-copy solo-view-help"><b>鼠标控制视角</b><span>拖动旋转 <i>·</i> 滚轮缩放 <i>·</i> 视野柔和追踪武器</span></div> : <div className="control-block"><span className="player-chip blue">P2</span><KeyGrid codes={['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']} labels={['↑', '←', '↓', '→']} pressed={game.pressed}/><div className="control-copy"><b>{playerDisplayName(1,game.loadouts[1],game.practice)} · {weaponName(game.loadouts[1].weaponId)}</b><span>↑ 朝正面挥 <i>·</i> ↓ 朝背面挥 <i>·</i> ← / → 水平转向 · 可组合{isPawLoadout(game.loadouts[1])&&<><br/>↓ 触地撑起身体 · 巨爪共用耐力</>}{isEarLoadout(game.loadouts[1])&&<><br/><kbd data-key="ShiftRight" className={game.pressed.includes('ShiftRight')?'pressed':''}>右 Shift</kbd> 旋耳悬停{game.skills[1]?.active?` · ${game.skills[1].remaining.toFixed(1)} 秒`:''}</>}</span></div></div>}
    </footer>
    </div>

    {helpOpen && <Modal onCancel={closeHelp}><HelpContent close={closeHelp}/></Modal>}
    {armoryMode !== null && <main className="preparation-stage" aria-labelledby="preparation-title"><Armory game={game} session={session} mode={armoryMode} close={() => setArmoryMode(null)} start={() => { session.startRound(armoryMode); setArmoryMode(null); }}/></main>}
    {game.state === 'paused' && !helpOpen && !game.error && <Modal className="compact-modal" onCancel={() => session.resume()}><span className="eyebrow">TAKE A BREATH</span><h2>歇一棍。</h2><p>对局已暂停，准备好再继续。</p><button className="primary-button" onClick={() => session.resume()}>继续对战 <span>↗</span></button><button className="secondary-button" onClick={() => session.goHome()}>回到主菜单</button></Modal>}
    {game.state === 'result' && <Modal className="compact-modal"><span className="eyebrow">A GOOD BONK, WELL PLAYED.</span><div className="winner-icon" style={{ background: winner === 1 ? '#568d92' : winner === 0 ? '#c4684f' : '#838c74' }}>{winner === -1 ? '和' : winner === 0 ? 'P1' : 'P2'}</div><h2>{resultTitle}</h2><p>{resultDetail}</p><button className="primary-button" onClick={() => session.startRound()}>再战一局 <span>↗</span></button><button className="secondary-button" onClick={() => session.goHome()}>回到主菜单</button></Modal>}
  </>;
}

export default App;
