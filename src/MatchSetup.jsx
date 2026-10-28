import { useEffect, useRef, useState } from 'react';
import { CHARACTER_CATALOG, CHARACTERS, characterName } from './character-catalog.js';
import { weaponName } from './weapon-catalog.js';
import { isValidLoadout, weaponsFor } from './loadouts.js';
import { createDrafts, updateDraft, toggleReady } from './armory-drafts.js';
import { AI_DIFFICULTIES } from './ai-opponent.js';
import { ARENA_SKINS } from './arena-skins.js';
import { SKILLS } from './skills.js';
import { CharacterPortrait, WeaponIcon, SkillIcon } from './selection-icons.jsx';
import { arenaPreview, loadArenaPreviews } from './models/arena-previews.js';

// One setup screen for AI and online, laid out like the title screen: the
// choices in a column on the left, the live arena behind them with only your
// own fighter in it, close up in the middle (ArenaView's 'setup' view, fed by
// session.setupPreview), and a column on the right with the opponent at the
// top and your fighter's card and the start button at the bottom. Online the
// arena is the host's to pick (the guest sees it change as it happens). The
// AI's fighter is drawn when play starts.
function SkillCard({ characterId }) {
  const skill = SKILLS[CHARACTERS[characterId]?.skill];
  if (!skill) return null;
  return <div className="skill-card">
    <SkillIcon id={skill.id} />
    <div><b><kbd>F</kbd>{skill.name}<small>冷却 {skill.cooldown}s</small></b><p>{skill.description}</p></div>
  </div>;
}

function CharacterChoice({ id, draft, onChange }) {
  return <div className="picker-characters" role="group" aria-label="角色">
    {CHARACTER_CATALOG.map(character => <button key={character.id} type="button" aria-label={`选择${character.name}`}
      aria-pressed={draft.characterId === character.id} onClick={() => onChange({ characterId: character.id })}>
      <CharacterPortrait id={character.id} playerId={id} crop="full" /><b>{character.name}</b>
    </button>)}
  </div>;
}

function WeaponChoice({ draft, onChange }) {
  return <div className="picker-weapons" role="group" aria-label="武器">
    {weaponsFor(draft.characterId).map(weapon => <button key={weapon.id} type="button" aria-label={`选择${weapon.name}`} aria-pressed={draft.weaponId === weapon.id}
      className={weapon.characterId ? 'exclusive' : undefined} title={weapon.description} onClick={() => onChange({ weaponId: weapon.id })}>
      <WeaponIcon id={weapon.id} /><span><b>{weapon.name}</b><small>{weapon.characterId ? '专属' : weapon.role}</small></span>
    </button>)}
  </div>;
}

// Online: the other player's live choice and readiness.
function OpponentCard({ id, loadout, ready, ping, name }) {
  return <div className={`opponent-card player-${id}`} aria-label="对手的出战配置">
    <div className="opponent-face">{loadout ? <CharacterPortrait id={loadout.characterId} playerId={id} /> : <span className="waiting-dot" />}</div>
    <div className="opponent-text">
      <span className="opponent-tags"><b className="panel-tag">对手</b>{name && <small title="Steam 昵称">{name}</small>}</span>
      <strong>{loadout ? characterName(loadout.characterId) : '正在选择…'}</strong>
      <small>{loadout ? weaponName(loadout.weaponId) : '对方还没有选好'}</small>
    </div>
    <div className="opponent-status">
      <span className={`ready-mark${ready ? ' on' : ''}`} role="status">{ready ? '✓ 已准备' : '未准备'}</span>
      {ping != null && <small className="ping">延迟 {ping} ms</small>}
    </div>
  </div>;
}

// AI: the fighter is drawn at random when the round starts; only the
// difficulty is yours to set.
function AiCard({ difficulty, onChange }) {
  return <div className="opponent-card ai-card player-1" aria-label="AI 对手">
    <div className="opponent-face"><span className="mystery">?</span></div>
    <div className="opponent-text">
      <span className="opponent-tags"><b className="panel-tag">对手 · AI</b></span>
      <strong>随机对手</strong>
      <small>角色与武器每局随机</small>
    </div>
    <div className="difficulty" role="radiogroup" aria-label="AI 难度">
      {Object.entries(AI_DIFFICULTIES).map(([key, value]) => <button key={key} type="button" role="radio"
        aria-checked={difficulty === key} onClick={() => onChange(key)}>{value.label}</button>)}
    </div>
  </div>;
}

function ArenaPicker({ value, onChange, locked }) {
  const [, redraw] = useState(0);
  useEffect(() => loadArenaPreviews(() => redraw(n => n + 1)), []);
  return <div className="arena-picker" role="radiogroup" aria-label="竞技场">
    {ARENA_SKINS.map(skin => {
      const picture = arenaPreview(skin.id);
      return <button key={skin.id} type="button" role="radio" aria-checked={value === skin.id} aria-disabled={locked}
        className={locked ? 'locked' : undefined} title={skin.description} onClick={() => !locked && onChange(skin.id)}>
        <span className="arena-shot" style={picture ? { backgroundImage: `url(${picture})` }
          : { background: `linear-gradient(135deg, ${skin.swatch[0]} 0 45%, ${skin.swatch[1]} 45% 72%, ${skin.swatch[2]} 72%)` }}>
          {!picture && <span className="arena-shot-loading">正在生成预览…</span>}
        </span>
        <span className="arena-text"><b>{skin.name}</b><small>{skin.english}</small></span>
      </button>;
    })}
  </div>;
}

// leaving: the screen is on its way out (App unmounts it a moment later); the
// fighter leaves the arena at once so the camera can fly back to the title shot.
export function MatchSetup({ game, session, net, mode, leaving = false, close, start, chooseArena, chooseDifficulty }) {
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  const online = mode === 'online', netInfo = game.net, host = netInfo?.role === 'host', peer = netInfo?.peer;
  const localId = online ? session.localPlayerId : 0, otherId = 1 - localId;
  const [drafts, setDrafts] = useState(() => createDrafts(game.loadouts));
  const [error, setError] = useState('');
  const mine = drafts[0];
  // Online: every change of your own draft is mirrored to the other player.
  useEffect(() => { if (online) net?.setLoadout(isValidLoadout(mine) ? mine : null, mine.ready); }, [online, net, mine.characterId, mine.weaponId, mine.ready]);
  // Your draft stands alone in the live arena behind this screen.
  useEffect(() => { session.setupPreview = leaving ? null : { id: localId, characterId: mine.characterId, weaponId: mine.weaponId }; },
    [session, leaving, localId, mine.characterId, mine.weaponId]);
  useEffect(() => () => { session.setupPreview = null; }, [session]);
  const change = (slot, patch) => { setError(''); session.sound.ui?.('click'); setDrafts(current => updateDraft(current, slot, patch)); };
  const canStart = online ? host && !!(mine.ready && peer?.ready && peer?.loadout) : isValidLoadout(mine);
  const confirm = () => {
    if (online) { if (!net?.start()) setError('双方都准备好后才能开始。'); return; }
    // The AI slot is redrawn at random when the round starts.
    const { characterId, weaponId } = mine;
    if (!session.setLoadouts([{ characterId, weaponId }, game.loadouts[1]])) { setError('无法使用这个搭配，请检查角色与武器。'); return; }
    start();
  };
  const hint = online
    ? (!peer?.loadout ? '对方正在选择…' : !mine.ready ? '选好后点「准备」' : !peer.ready ? '等待对方准备' : host ? '双方已准备，可以开始' : '等待房主开始')
    : !isValidLoadout(mine) ? '为你的角色选一件武器' : '';
  const pickArena = skin => { session.sound.ui?.('click'); chooseArena(skin); };

  return <main className={`match-setup mode-${mode} player-${localId}${leaving ? ' leaving' : ''}`} aria-label="出战准备">
    <div className="setup-shade" />
    <aside className="setup-panel">
      <header className="setup-header">
        <button ref={backRef} type="button" className="setup-back" onClick={close}>← {online ? '离开房间' : '返回'}</button>
        <div className="setup-title"><h1>{online ? '联机对战' : 'AI 对战'}</h1>
          <span className="setup-badge">{online ? (host ? '房主 · 红方' : '加入者 · 蓝方') : '你 · 红方'}</span></div>
      </header>
      <div className="setup-sections">
        <section aria-label="角色"><h2>角色</h2><CharacterChoice id={localId} draft={mine} onChange={patch => change(0, patch)} /></section>
        <section aria-label="武器"><h2>武器</h2><WeaponChoice draft={mine} onChange={patch => change(0, patch)} /></section>
        <section aria-label="竞技场"><h2>竞技场{online && <small>{host ? '由你选择，对方实时同步' : '由房主选择'}</small>}</h2>
          <ArenaPicker value={game.arenaSkin} onChange={pickArena} locked={online && !host} /></section>
      </div>
    </aside>
    <aside className="setup-side" aria-label="对战双方">
      {online ? <OpponentCard id={otherId} loadout={peer?.loadout ?? null} ready={!!peer?.ready} ping={netInfo?.ping} name={peer?.name} />
        : <AiCard difficulty={game.aiDifficulty} onChange={key => { session.sound.ui?.('click'); chooseDifficulty(key); }} />}
      <div className="setup-you" aria-label="你的出战配置">
        <span className="panel-tag">你{online && mine.ready ? ' · ✓ 已准备' : ''}</span>
        <h2>{characterName(mine.characterId)}</h2>
        <p>{mine.weaponId ? weaponName(mine.weaponId) : '选择一件武器'}</p>
        <SkillCard characterId={mine.characterId} />
      </div>
      <footer className="setup-footer">
        {error ? <p className="setup-error" role="alert">{error}</p> : <span className="setup-hint" aria-live="polite">{hint}</span>}
        {online && <button type="button" className={`ready-button${mine.ready ? ' on' : ''}`} aria-pressed={mine.ready} disabled={!isValidLoadout(mine)}
          onClick={() => { setError(''); session.sound.ui?.('click'); setDrafts(current => toggleReady(current, 0)); }}>
          <b>{mine.ready ? '✓ 已准备' : '准备'}</b><small>{mine.ready ? '再点一次取消' : 'READY'}</small></button>}
        <button type="button" className="start-button" disabled={!canStart} onClick={confirm}>
          <b>{online && !host ? '等待房主' : '开始对战'}</b><small>{online && !host ? 'WAITING' : 'START'}</small>
        </button>
      </footer>
    </aside>
  </main>;
}
