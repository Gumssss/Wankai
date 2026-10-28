import { useEffect, useRef, useState } from 'react';
import { CHARACTER_CATALOG, CHARACTERS, characterName } from './character-catalog.js';
import { weaponName } from './weapon-catalog.js';
import { isValidLoadout, weaponsFor } from './loadouts.js';
import { createDrafts, updateDraft, toggleReady } from './armory-drafts.js';
import { AI_DIFFICULTIES } from './ai-opponent.js';
import { ARENA_SKINS } from './arena-skins.js';
import { SKILLS } from './skills.js';
import { LoadoutPreview } from './LoadoutPreview.jsx';
import { CharacterPortrait, WeaponIcon, SkillIcon } from './selection-icons.jsx';
import { arenaPreview, loadArenaPreviews } from './models/arena-previews.js';

// One setup screen for AI and online: your fighter on the left, VS in the
// middle of the screen, the arena on the right. Online the opponent's live
// choice sits under the VS, and the arena is the host's to pick (the guest
// sees it change as it happens). The AI's fighter is drawn when play starts.
function SkillCard({ characterId }) {
  const skill = SKILLS[CHARACTERS[characterId]?.skill];
  if (!skill) return null;
  return <div className="skill-card">
    <SkillIcon id={skill.id} />
    <div><b><kbd>F</kbd>{skill.name}<small>冷却 {skill.cooldown}s</small></b><p>{skill.description}</p></div>
  </div>;
}

function Picker({ id, draft, label, onChange }) {
  const weapons = weaponsFor(draft.characterId);
  return <div className="picker">
    <div className="picker-characters" role="group" aria-label={`${label} 角色`}>
      {CHARACTER_CATALOG.map(character => <button key={character.id} type="button" aria-label={`${label} 选择${character.name}`}
        aria-pressed={draft.characterId === character.id} onClick={() => onChange({ characterId: character.id })}>
        <CharacterPortrait id={character.id} playerId={id} crop="full" /><b>{character.name}</b>
      </button>)}
    </div>
    <div className="picker-weapons" role="group" aria-label={`${label} 武器`}>
      {weapons.map(weapon => <button key={weapon.id} type="button" aria-label={`${label} 选择${weapon.name}`} aria-pressed={draft.weaponId === weapon.id}
        className={weapon.characterId ? 'exclusive' : undefined} title={weapon.description} onClick={() => onChange({ weaponId: weapon.id })}>
        <WeaponIcon id={weapon.id} /><span><b>{weapon.name}</b><small>{weapon.characterId ? '专属' : weapon.role}</small></span>
      </button>)}
    </div>
  </div>;
}

function FighterPanel({ id, tag, draft, ready, onChange }) {
  return <section className={`fighter-setup player-${id}`} aria-label={`${tag}的出战配置`}>
    <header>
      <b className="panel-tag">{tag}</b>
      {ready !== undefined && <span className={`ready-mark${ready ? ' on' : ''}`} role="status">{ready ? '✓ 已准备' : '未准备'}</span>}
    </header>
    <div className="setup-preview"><LoadoutPreview selection={draft} id={id} /></div>
    <h2 className="setup-name">{characterName(draft.characterId)}<small>{draft.weaponId ? weaponName(draft.weaponId) : '选择一件武器'}</small></h2>
    <Picker id={id} draft={draft} label={tag} onChange={onChange} />
    <SkillCard characterId={draft.characterId} />
  </section>;
}

// Online: the other player's live choice and readiness, under the VS.
function OpponentCard({ id, loadout, ready, ping, name }) {
  return <div className={`opponent-card player-${id}`} aria-label="对手的出战配置">
    <b className="panel-tag">对手</b>
    {name && <small title="Steam 昵称">{name}</small>}
    {loadout ? <>
      <CharacterPortrait id={loadout.characterId} playerId={id} />
      <strong>{characterName(loadout.characterId)}</strong>
      <small>{weaponName(loadout.weaponId)}</small>
    </> : <p><span className="waiting-dot" />对方正在选择…</p>}
    <span className={`ready-mark${ready ? ' on' : ''}`} role="status">{ready ? '✓ 已准备' : '未准备'}</span>
    {ping != null && <small className="ping">延迟 {ping} ms</small>}
  </div>;
}

function ArenaPicker({ value, onChange, locked }) {
  const [, redraw] = useState(0);
  useEffect(() => loadArenaPreviews(() => redraw(n => n + 1)), []);
  return <div className="arena-picker" role="radiogroup" aria-label="竞技场">
    {ARENA_SKINS.map(skin => {
      const picture = arenaPreview(skin.id);
      return <button key={skin.id} type="button" role="radio" aria-checked={value === skin.id} aria-disabled={locked}
        className={locked ? 'locked' : undefined} onClick={() => !locked && onChange(skin.id)}>
        <span className="arena-shot" style={picture ? { backgroundImage: `url(${picture})` }
          : { background: `linear-gradient(135deg, ${skin.swatch[0]} 0 45%, ${skin.swatch[1]} 45% 72%, ${skin.swatch[2]} 72%)` }}>
          {!picture && <span className="arena-shot-loading">正在生成预览…</span>}
        </span>
        <span className="arena-text"><b>{skin.name}</b><small>{skin.english}</small><em>{skin.description}</em></span>
      </button>;
    })}
  </div>;
}

export function MatchSetup({ game, session, net, mode, close, start, chooseArena, chooseDifficulty }) {
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus({ preventScroll: true }); }, []);
  const online = mode === 'online', netInfo = game.net, host = netInfo?.role === 'host', peer = netInfo?.peer;
  const localId = online ? session.localPlayerId : 0, otherId = 1 - localId;
  const [drafts, setDrafts] = useState(() => createDrafts(game.loadouts));
  const [error, setError] = useState('');
  const mine = drafts[0];
  // Online: every change of your own draft is mirrored to the other player.
  useEffect(() => { if (online) net?.setLoadout(isValidLoadout(mine) ? mine : null, mine.ready); }, [online, net, mine.characterId, mine.weaponId, mine.ready]);
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

  return <main className={`match-setup mode-${mode}`} aria-label="出战准备">
    <header className="setup-header">
      <button ref={backRef} type="button" className="setup-back" onClick={close}>← {online ? '离开房间' : '返回'}</button>
      <div className="setup-title"><h1>{online ? '联机对战' : 'AI 对战'}</h1><p>选择角色、武器和竞技场</p></div>
      <span className="setup-badge">{online ? (host ? '房主 · 红方' : '加入者 · 蓝方') : '你 · 红方'}</span>
    </header>
    <div className="setup-body">
      <FighterPanel id={localId} tag="你" draft={mine} ready={online ? mine.ready : undefined} onChange={patch => change(0, patch)} />
      <section className="setup-center">
        <div className="versus">VS</div>
        {online && <OpponentCard id={otherId} loadout={peer?.loadout ?? null} ready={!!peer?.ready} ping={netInfo?.ping} name={peer?.name} />}
      </section>
      <section className="arena-panel" aria-label="竞技场">
        <header>
          <b className="panel-tag">竞技场</b>
          <div className="panel-tools">
            {online ? <span className="tool-label">{host ? '由你选择，对方实时同步' : '由房主选择'}</span> : <>
              <span className="tool-label">AI 难度</span>
              <div className="difficulty" role="radiogroup" aria-label="AI 难度">
                {Object.entries(AI_DIFFICULTIES).map(([key, value]) => <button key={key} type="button" role="radio"
                  aria-checked={game.aiDifficulty === key} onClick={() => { session.sound.ui?.('click'); chooseDifficulty(key); }}>{value.label}</button>)}
              </div>
            </>}
          </div>
        </header>
        <ArenaPicker value={game.arenaSkin} onChange={pickArena} locked={online && !host} />
      </section>
    </div>
    {error && <p className="setup-error" role="alert">{error}</p>}
    <footer className="setup-footer">
      <span className="setup-hint" aria-live="polite">{hint}</span>
      <div className="footer-actions">
        {online && <button type="button" className={`secondary-button ready-button${mine.ready ? ' on' : ''}`} aria-pressed={mine.ready} disabled={!isValidLoadout(mine)}
          onClick={() => { setError(''); session.sound.ui?.('click'); setDrafts(current => toggleReady(current, 0)); }}>{mine.ready ? '✓ 已准备' : '准备'}</button>}
        <button type="button" className="primary-button start-button" disabled={!canStart} onClick={confirm}>
          {online && !host ? '等待房主开始' : '开始对战'}<span>→</span>
        </button>
      </div>
    </footer>
  </main>;
}
