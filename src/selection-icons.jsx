import { CHARACTERS } from './character-catalog.js';
import { characterPortrait } from './models/portraits.js';

const icons = {
  'yellow-staff': '<path d="M11 45 36 9" stroke="#d7a838" stroke-width="10" stroke-linecap="round"/><path d="M11 45 36 9" stroke="#f6cf45" stroke-width="7" stroke-linecap="round"/><path d="m16 38 4 3M29 19l4 3" stroke="#e2ad2b" stroke-width="3"/>',
  // Drawn upright, then leaned like the other weapons: blade, guard, grip, pommel.
  sword: '<g transform="rotate(38 24 27)" stroke="#30372e" stroke-width="1.5" stroke-linejoin="round"><path d="M24 3 28 9v25h-8V9Z" fill="#dfe5e6"/><path d="M24 10v21" stroke="#9aa5a7"/><rect x="14" y="34" width="20" height="5" rx="2.5" fill="#c4684f"/><rect x="21.5" y="39" width="5" height="9" rx="1.5" fill="#a4733f"/><circle cx="24" cy="50.5" r="3" fill="#e9c46a"/></g>',
  polearm: '<path d="m9 49 20-34" stroke="#8a3426" stroke-width="4.5" stroke-linecap="round"/><path d="M27 18 34 6q2-4 8-5-4 6-3 11-2 9-12 11Z" fill="#cfd7d9" stroke="#30372e" stroke-width="1.5"/><path d="m26 20 3 2" stroke="#e8b54a" stroke-width="4"/><path d="m24 22-4 7" stroke="#c4684f" stroke-width="2.5"/>',
  hammer: '<path d="M22 14v36" stroke="#d9b27c" stroke-width="5" stroke-linecap="round"/><rect x="16" y="9" width="22" height="12" rx="4" fill="#9aa3a5" stroke="#30372e" stroke-width="1.5"/><rect x="37" y="7.5" width="5" height="15" rx="2" fill="#6f7a7c" stroke="#30372e" stroke-width="1.2"/><path d="M16 15 5 19" stroke="#6f7a7c" stroke-width="4" stroke-linecap="round"/><path d="M22 9V3" stroke="#6f7a7c" stroke-width="3" stroke-linecap="round"/>',
  'happy-paws': '<rect x="19" y="33" width="10" height="19" rx="4" fill="#8d8070" stroke="#30372e" stroke-width="1.5"/><path d="M19.5 44h9M19.5 48h9" stroke="#5d554b" stroke-width="2"/><path d="M17 38h14" stroke="#c4684f" stroke-width="3.5" stroke-linecap="round"/><g fill="#f3ece0" stroke="#30372e" stroke-width="1.5"><circle cx="10.5" cy="16" r="5"/><circle cx="18.5" cy="10.5" r="5.5"/><circle cx="29.5" cy="10.5" r="5.5"/><circle cx="37.5" cy="16" r="5"/><ellipse cx="24" cy="25" rx="15" ry="12"/></g><g fill="#f29aa6"><ellipse cx="10.5" cy="16" rx="2.3" ry="2.8"/><ellipse cx="18.5" cy="10" rx="2.5" ry="3"/><ellipse cx="29.5" cy="10" rx="2.5" ry="3"/><ellipse cx="37.5" cy="16" rx="2.3" ry="2.8"/><path d="M24 20c-5 0-9 4-9 8 0 3 3 4 5 3l4-1 4 1c2 1 5 0 5-3 0-4-4-8-9-8Z"/></g>',
  'takeout-box': '<path d="M18 13q5-6 10 0" fill="none" stroke="#2f3437" stroke-width="2.5" stroke-linecap="round"/><rect x="6" y="13" width="36" height="34" rx="6" fill="#f5c518" stroke="#30372e" stroke-width="1.6"/><path d="M6 20h36M6 41h36" stroke="#d9a10c" stroke-width="3.5"/><circle cx="24" cy="30.5" r="7" fill="#fff"/><circle cx="21.6" cy="30" r="1.3" fill="#30372e"/><circle cx="26.4" cy="30" r="1.3" fill="#30372e"/><ellipse cx="24" cy="33" rx="1.6" ry="1.2" fill="#7c2f15"/>',
  axe: '<path d="M14 50 30 6" stroke="#a4733f" stroke-width="5" stroke-linecap="round"/><path d="M26 12q14-6 18 6-2 14-14 16L24 26Z" fill="#c3ced1" stroke="#30372e" stroke-width="1.5"/><path d="M27 17l-9-3" stroke="#7f8b8d" stroke-width="4" stroke-linecap="round"/>',
  mace: '<path d="M18 50 28 22" stroke="#9a6a3c" stroke-width="6" stroke-linecap="round"/><ellipse cx="31" cy="14" rx="10" ry="12" fill="#6e4526" stroke="#30372e" stroke-width="1.5"/><path d="M31 0v5M42 10l-4 2M44 20l-5-1M20 8l4 3M21 20l4-1M36 26l-2-3M27 26l1-3" stroke="#7c8587" stroke-width="3" stroke-linecap="round"/>',
  pan: '<path d="M10 50 22 30" stroke="#a4733f" stroke-width="6" stroke-linecap="round"/><path d="m22 30 4-6" stroke="#3a3f42" stroke-width="4"/><circle cx="32" cy="15" r="13" fill="#3a3f42" stroke="#30372e" stroke-width="1.5"/><circle cx="32" cy="15" r="9.5" fill="#24282a"/><path d="M26 10q3-3 7-2" stroke="#7d8588" stroke-width="2" fill="none" stroke-linecap="round"/>',
};

const SKILL_GLYPHS = { laugh: '😆', twist: '🌀', delivery: '🥡', happy: '💖' };
export function SkillIcon({ id }) {
  return <span className={`skill-icon skill-${id}`} aria-hidden="true">{SKILL_GLYPHS[id] ?? '★'}</span>;
}

export function WeaponIcon({ id }) {
  return <svg viewBox="0 0 48 54" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icons[id] || '' }} />;
}

// Rendered from the 3D model; a lettered disc stands in if WebGL is missing.
export function CharacterPortrait({ id, playerId = 0, critical = false, crop = 'bust' }) {
  const character = CHARACTERS[id];
  const url = characterPortrait(id, playerId, crop);
  const label = `${character?.name ?? '角色'}${critical ? '（濒危）' : ''}`;
  if (url) return <img className={`portrait${critical ? ' critical' : ''}`} src={url} alt={label} draggable={false} />;
  return <svg className="portrait" viewBox="0 0 100 100" role="img" aria-label={label}>
    <circle cx="50" cy="50" r="44" fill={playerId ? '#568d92' : '#c4684f'} />
    <text x="50" y="62" textAnchor="middle" fontSize="36" fill="#fbf6e8">{character?.name?.[0] ?? '?'}</text>
  </svg>;
}
