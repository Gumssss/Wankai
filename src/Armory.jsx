import {useEffect,useRef,useState} from 'react';
import {CHARACTER_CATALOG,characterName} from './character-catalog.js';
import {WEAPON_CATALOG} from './weapon-catalog.js';
import {canEquip,isValidLoadout,loadoutName,loadoutKey} from './loadouts.js';
import {createDrafts,updateDraft,toggleReady,visiblePlayers,canConfirm,confirmedLoadouts} from './armory-drafts.js';
import {LoadoutPreview} from './LoadoutPreview.jsx';
import {CharacterPortrait,WeaponIcon} from './selection-icons.jsx';
import './armory.css';

const MODES={ai:'AI 对战',browse:'出战配置'};
const PLAYER_LABELS=['你','AI'];
const selectionName=draft=>draft.weaponId?loadoutName(draft):`${characterName(draft.characterId)} · 待选武器`;

function PlayerSelection({id,draft,mode,onChange,onReady}){
  const valid=isValidLoadout(draft),player=PLAYER_LABELS[id],versus=mode==='ai';
  return <section className="loadout-player-panel" data-player={id} style={{'--selection-accent':id===0?'#bd6048':'#4f858a'}} aria-label={`${player} 出战配置`}>
    <header className="loadout-player-heading">
      <b className="loadout-player-label">{player}</b>
      <span className="loadout-ready-status" role="status" aria-live="polite" aria-label={draft.ready?`${player} 已准备`:`${player} 未准备`}>
        {draft.ready?<svg className="loadout-ready-doodle" viewBox="0 0 64 52" aria-hidden="true"><path d="M9 27 23 42 54 9"/><path d="m12 25 11 12 28-29"/><path d="m25 44 31-32"/></svg>:versus?'':'选择角色与武器'}
      </span>
    </header>
    <div className="loadout-choices">
      <div className="loadout-library-title"><b>角色</b><span>CHARACTERS</span></div>
      <div className="loadout-character-grid" role="group" aria-label={`${player} 角色选择`}>
        {CHARACTER_CATALOG.map(character=><button key={character.id} type="button" aria-label={`${player} 选择${character.name}`} aria-pressed={draft.characterId===character.id} disabled={!character.available} onClick={()=>onChange({characterId:character.id})}>
          <div className="loadout-portrait"><CharacterPortrait id={character.id}/>{!character.available&&<span>开发中</span>}</div>
          <b>{character.name}</b><small>{character.english}</small>
        </button>)}
      </div>
      <div className="loadout-library-title"><b>武器</b><span>WEAPONS</span><small>{draft.weaponId?'':'选择一件武器'}</small></div>
      <div className="loadout-weapon-grid" role="group" aria-label={`${player} 武器选择`}>
        {WEAPON_CATALOG.map(weapon=>{
          const compatible=canEquip(draft.characterId,weapon.id),reason=!weapon.available?'开发中':weapon.characterId?`${characterName(weapon.characterId)}专属`:compatible?'通用':'暂不适配';
          return <button key={weapon.id} type="button" aria-label={`${player} 选择${weapon.name}`} aria-pressed={draft.weaponId===weapon.id} disabled={!compatible} title={`${weapon.name} · ${reason}。${weapon.description}`} onClick={()=>onChange({weaponId:weapon.id})}>
            <WeaponIcon id={weapon.id}/><span><b>{weapon.name}</b><small>{reason}</small></span>{draft.weaponId===weapon.id&&<i aria-hidden="true">✓</i>}
          </button>;
        })}
      </div>
    </div>
    <div className="loadout-showcase" aria-label={`${player} 角色与武器模型预览`}>
      <LoadoutPreview key={`${id}:${loadoutKey(draft)}`} selection={draft} id={id}/>
      <div className="loadout-current" aria-live="polite"><b>{selectionName(draft)}</b></div>
      <div className="loadout-drag">↔ 拖动旋转 · 滚轮缩放</div>
    </div>
    {id===0&&<button type="button" className="loadout-ready-button" aria-label={`${player} ${draft.ready?'取消准备':'准备就绪'}`} aria-pressed={draft.ready} disabled={!valid} onClick={onReady}>
      {draft.ready?'✓ 已准备 · 取消准备':'✓ 准备就绪'}
    </button>}
  </section>;
}

export function Armory({game,session,mode,close,start}){
  const headingRef=useRef(null);
  useEffect(()=>{headingRef.current?.focus({preventScroll:true});},[]);
  const [drafts,setDrafts]=useState(()=>createDrafts(game.loadouts));
  const [error,setError]=useState(''),players=visiblePlayers(mode),ready=canConfirm(drafts,mode),versus=mode==='ai';
  const change=(id,patch)=>{setError('');setDrafts(current=>updateDraft(current,id,patch));};
  const prepare=id=>{setError('');setDrafts(current=>toggleReady(current,id));};
  const confirm=()=>{
    const selections=confirmedLoadouts(drafts,mode);
    if(!selections)return;
    if(!session.setLoadouts(selections)){setError('无法保存搭配，请检查角色与武器。');return;}
    if(mode==='browse')close();else start();
  };
  const action=mode==='browse'?'保存搭配':'开始对战';
  const hint=mode==='browse'?(ready?'已准备，可以保存':'准备后保存'):(ready?'已准备，可以开始':'准备后开始');
  return <>
    <header className="loadout-header">
      <button ref={versus?headingRef:null} type="button" className="loadout-back" onClick={close} aria-label="返回主菜单">{versus?'返回主菜单':'← 返回'}</button>
      {!versus&&<><div className="loadout-heading-copy"><h1 id="preparation-title" ref={headingRef} tabIndex={-1}>出战准备</h1><p>PREPARE / 选择角色与武器</p></div><span>{MODES[mode]}</span></>}
    </header>
    <div className={`loadout-dual-picker${players.length===1?' single':''}`}>
      {players.map(id=><PlayerSelection key={id} id={id} draft={drafts[id]} mode={mode} onChange={patch=>change(id,patch)} onReady={()=>prepare(id)}/>)}
    </div>
    {error&&<p className="loadout-form-error" role="alert">{error}</p>}
    <footer className="loadout-footer"><div className="loadout-start"><button type="button" className="primary-button" disabled={!ready} onClick={confirm}>{action}{!versus&&<span>→</span>}</button><span className="loadout-start-hint" aria-live="polite">{hint}</span></div></footer>
  </>;
}
