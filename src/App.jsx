import { Component, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArenaCanvas } from './ArenaCanvas.jsx';
import { CONTROL_KEYS, GameSession } from './game-session.js';
import './style.css';

const session = new GameSession();

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

function FighterScore({ id, health, practice }) {
  const isSecond = id === 1;
  return <div className={`fighter fighter-${isSecond ? 'two' : 'one'}`}>
    <div className="fighter-avatar"><span></span><i></i></div>
    <div className="fighter-info">
      <div className="fighter-heading"><span><b>{isSecond ? (practice ? '木桩' : '青丸') : '赤丸'}</b> <small>{isSecond ? (practice ? 'TRAINING' : 'PLAYER 02') : 'PLAYER 01'}</small></span><strong>{health}<small>/100</small></strong></div>
      <div className="health-track"><div className="health-ghost" style={{ transform: `scaleX(${health / 100})` }}></div><div className="health-fill" style={{ transform: `scaleX(${health / 100})` }}></div></div>
    </div>
  </div>;
}

function KeyGrid({ codes, labels, pressed }) {
  return <div className="key-grid">{codes.map((code, i) => <kbd key={code} data-key={code} className={pressed.includes(code) ? 'pressed' : ''}>{labels[i]}</kbd>)}</div>;
}

function HelpContent({ close }) {
  return <>
    <button className="modal-close" onClick={close} aria-label="关闭玩法说明">×</button>
    <span className="eyebrow">A LITTLE FIELD GUIDE</span><h2>四个按键，转动武器。</h2>
    <p className="modal-intro">你控制的是悬空武器的转动力。武器与身体保持间距，绕身体旋转；身体始终直立，由撑地或碰撞带动。</p>
    <div className="guide-steps">
      <article><span>01</span><div><h3>撑地，才走得动</h3><p>用 A / D（← / →）把武器伸向想去的方向，再按 S（↓）向下压。武器触地，身体会被撑起并靠近落点。按 W（↑）收回武器，再来一次。</p></div></article>
      <article><span>02</span><div><h3>松手，自然下落</h3><p>按住 W（↑）向上甩，按住 S（↓）向下砸；松手后保留惯性并受重力下落，可越过竖直方向继续摆动，再由阻尼逐渐减速。按住时仍向 0° / 180° 运动并主动减速。A / D（← / →）左右扫转仍保留惯性与阻尼。</p></div></article>
      <article><span>03</span><div><h3>挥起来，才打得疼</h3><p>武器撞中头部或躯干都会扣血，伤害相同。撞得越快、命中前加速越充分，伤害越高；贴着不动不会持续扣血。武器之间可以互相格挡。</p></div></article>
    </div>
    <div className="guide-note"><b>100 HP · 血量归零判负</b><span>圆台有边界，不会掉落。练习木桩会在受击停止后恢复血量。</span></div>
    <button className="primary-button" onClick={close}>明白了，抡起来 <span>↗</span></button>
  </>;
}

function App() {
  const game = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const helpResume = useRef(false);
  const active = game.state !== 'lobby';

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
      if (CONTROL_KEYS.has(event.code)) {
        event.preventDefault();
        if (!helpOpen) session.keyDown(event.code);
      }
      if (event.repeat || helpOpen || event.target.closest?.('dialog')) return;
      if (event.code === 'Escape') { event.preventDefault(); session.pause(); }
      if (event.code === 'KeyR' && session.state === 'playing') session.startRound();
      if (event.code === 'Enter' && session.state === 'lobby' && event.target.tagName !== 'BUTTON') {
        event.preventDefault(); session.startRound(false);
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
  }, [helpOpen]);

  useEffect(() => {
    Object.defineProperty(window, '__arena', { configurable: true, value: Object.freeze({
      snapshot: () => JSON.parse(JSON.stringify({ state: session.state, mode: session.mode, practice: session.practice, time: session.world.time, winner: session.world.winner, players: session.world.players, lastHit: session.world.lastHit })),
      rendererInfo: () => session.renderer ? ({ geometries: session.renderer.info.memory.geometries, textures: session.renderer.info.memory.textures, calls: session.renderer.info.render.calls }) : null,
    }) });
    return () => { delete window.__arena; };
  }, []);

  const winner = game.winner;
  const resultTitle = winner === -1 ? '平分秋色' : `${winner === 0 ? '赤丸' : '青丸'}获胜`;
  const resultDetail = `本局 ${game.seconds} 秒。${winner === -1 ? '双方同时力竭，再来一局。' : `胜者剩余 ${game.health[winner] ?? 0} 点体力。下一局，谁说了算？`}`;
  const elapsed = `${String(Math.floor(game.seconds / 60)).padStart(2, '0')}:${String(game.seconds % 60).padStart(2, '0')}`;
  const solo = game.mode === 'solo';

  return <>
    <header className="topbar">
      <a className="brand" href="./" aria-label="丸棍竞技场首页" onClick={event => { event.preventDefault(); session.goHome(); }}><span className="brand-mark"><i></i><b></b></span><span>丸棍<span className="brand-light">竞技场</span><small>WAN GUN / ARENA</small></span></a>
      <div className="header-center"><span className="status-dot"></span> 双人 · 物理 · 对战 <span className="version">VOL. 001</span></div>
      <nav aria-label="游戏选项">
        <button className="icon-button" onClick={() => session.toggleSound()} aria-label={game.soundEnabled ? '关闭声音' : '开启声音'} title="声音" aria-pressed={game.soundEnabled}>
          <svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path className="sound-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>
        </button>
        <button className="text-button" onClick={openHelp}><span className="help-icon">?</span> 玩法说明</button>
      </nav>
    </header>

    <main id="game-shell" className={solo ? 'solo-mode' : ''}>
      <div id="viewport"><CanvasBoundary onError={() => { session.error = '3D 场景无法载入，请检查 WebGL 2 和硬件加速。'; session.publish(); setReady(true); }}><ArenaCanvas key={`${solo ? 'solo' : 'shared'}-${game.weapon}`} session={session} mode={solo ? 'solo' : 'duel'} weapon={game.weapon} onReady={() => setReady(true)} /></CanvasBoundary></div>
      <div className="arena-caption"><span className="eyebrow">THE PIT / 01</span><span>{game.weapon === 'sword' ? '短剑试验 · 近身快挥。' : solo ? '只有你、武器与圆台。' : '一方圆台，两位棍客。'}</span></div>
      <div className="arena-coordinate" aria-hidden="true">{solo ? '自由视角' : 'N ↑'}<br/><span>{solo ? 'DRAG / ORBIT' : '35° / FIXED VIEW'}</span></div>
      {solo && active && <div className="heading-guide" aria-label="武器水平朝向，相对当前视角。A 和 D 旋转武器。"><strong>武器朝向</strong><span>相对当前视角</span><div className="heading-dial"><div id="staff-heading-arrow" className="heading-arrow">↑</div></div><small>A / D 绕身旋转</small></div>}
      <section className="scoreboard" aria-label={solo ? '单人状态' : '对战血量'}>
        <FighterScore id={0} health={game.health[0]} practice={game.practice} />
        <div className="match-center"><span>{game.weapon === 'sword' ? '短剑试验' : solo ? '自由视角' : game.practice ? '自由练习' : '自由对决'}</span>{!solo && <b>VS</b>}<div>{elapsed}</div></div>
        {!solo && <FighterScore id={1} health={game.health[1]} practice={game.practice} />}
      </section>
      <div id="player-label-0" className="player-label red">P1<span>赤丸</span></div>
      {!solo && <div id="player-label-1" className="player-label blue">P2<span>{game.practice ? '木桩' : '青丸'}</span></div>}
      <div id="effects" aria-hidden="true">{game.effects.map(effect => <div key={effect.id} id={`effect-${effect.id}`} className="damage-number">{effect.damage >= 22 && <span className="impact-word">重 击 !</span>}−{effect.damage}</div>)}</div>
      <div key={game.countdownText} id="countdown" className={/^[1-9]$/.test(game.countdownText) ? 'pop' : ''} style={game.countdownText === '抡起来' ? { fontSize: 56 } : undefined} aria-live="polite">{game.countdownText}</div>
      <div className={`hit-readout${game.readout ? ' visible' : ''}`}><span>{game.readout?.label ?? '有效命中'}</span><strong>−{game.readout?.damage ?? 0}</strong><small>{game.readout?.detail ?? ''}</small></div>

      {game.state === 'lobby' && <section className="welcome-panel">
        <div className="welcome-copy"><div className="eyebrow">LESS BUTTONS. MORE BONK.</div><h1>一棍定胜负<span>。</span></h1><p><br/></p></div>
        <div className="welcome-actions"><div className="weapon-choice" role="group" aria-label="赤丸武器"><span>赤丸武器</span><button type="button" aria-pressed={game.weapon === 'polearm'} onClick={() => session.setWeapon('polearm')}>长柄刀</button><button type="button" aria-pressed={game.weapon === 'sword'} onClick={() => session.setWeapon('sword')}>短剑 · 快挥</button></div><button className="primary-button" onClick={() => session.startRound('duel')}>开始双人对战 <span>↗</span></button><button className="secondary-button" onClick={() => session.startRound('practice')}>木桩练习 <span>→</span></button><button className="secondary-button" onClick={() => session.startRound('solo')}>单人自由视角 <span>→</span></button><small>默认：赤丸短剑 · 青丸长柄刀 · 双人共用键盘</small></div>
      </section>}
      {active && <div className="match-tools"><button className="pill-button" onClick={() => session.pause()}>Ⅱ 暂停 <kbd>ESC</kbd></button><button className="pill-button" onClick={() => session.startRound()} title="重新开始当前对局">↻ 重开</button><button className="pill-button" onClick={() => session.goHome()} title="回到主菜单">返回</button></div>}
      {active && <div className="live-tip"><span className="status-dot"></span><span>{solo ? 'A / D 转动武器 · 拖动鼠标转动视角 · 滚轮调远近' : game.practice ? '练习模式 · 青丸不主动出招，停止受击后恢复血量' : game.weapon === 'sword' ? '赤丸短剑：距离更近，挥动更快' : ''}</span></div>}
      {!ready && !game.error && <div className="loading"><span className="loader"></span><p>正在布置角斗场…</p></div>}
      {game.error && <div className="error-panel"><h2>角斗场暂时无法载入</h2><p>{game.error}</p><button className="primary-button" onClick={() => location.reload()}>重新加载 ↗</button></div>}
    </main>

    <footer className={`controls-bar${solo ? ' solo-controls' : ''}`}>
      <div className="control-block"><span className="player-chip red">P1</span><KeyGrid codes={['KeyW', 'KeyA', 'KeyS', 'KeyD']} labels={['W', 'A', 'S', 'D']} pressed={game.pressed}/><div className="control-copy"><b>{game.weapon === 'sword' ? '赤丸的短剑' : '赤丸的棍法'}</b><span>W / S 上甩·下砸 <i>·</i> A / D 左右扫转</span></div></div>
      <div className="control-motto"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16"/><path d="m10 30 20-20M9 27l4 4M27 9l4 4"/></svg><span>身体不听指挥<br/><b>武器才是主角</b></span></div>
      {solo ? <div className="control-copy solo-view-help"><b>鼠标控制视角</b><span>拖动旋转 <i>·</i> 滚轮缩放 <i>·</i> 视野柔和追踪武器</span></div> : <div className="control-block"><span className="player-chip blue">P2</span><KeyGrid codes={['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']} labels={['↑', '←', '↓', '→']} pressed={game.pressed}/><div className="control-copy"><b>青丸的长柄刀</b><span>↑ / ↓ 上甩·下砸 <i>·</i> ← / → 左右扫转</span></div></div>}
    </footer>

    {helpOpen && <Modal onCancel={closeHelp}><HelpContent close={closeHelp}/></Modal>}
    {game.state === 'paused' && !helpOpen && !game.error && <Modal className="compact-modal" onCancel={() => session.resume()}><span className="eyebrow">TAKE A BREATH</span><h2>歇一棍。</h2><p>对局已暂停，准备好再继续。</p><button className="primary-button" onClick={() => session.resume()}>继续对战 <span>↗</span></button><button className="secondary-button" onClick={() => session.goHome()}>回到主菜单</button></Modal>}
    {game.state === 'result' && <Modal className="compact-modal"><span className="eyebrow">A GOOD BONK, WELL PLAYED.</span><div className="winner-icon" style={{ background: winner === 1 ? '#568d92' : winner === 0 ? '#c4684f' : '#838c74' }}>{winner === -1 ? '和' : winner === 0 ? '赤' : '青'}</div><h2>{resultTitle}</h2><p>{resultDetail}</p><button className="primary-button" onClick={() => session.startRound()}>再战一局 <span>↗</span></button><button className="secondary-button" onClick={() => session.goHome()}>回到主菜单</button></Modal>}
  </>;
}

export default App;
