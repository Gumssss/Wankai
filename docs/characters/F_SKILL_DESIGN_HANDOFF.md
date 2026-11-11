# Character F-skill design handoff

> **Workspace relocation — 8 November 2026:** the current game now lives at `/Users/haojun/Desktop/Game developing/Wankai-game/Wankai-arena-camera`; its older authoring checkout is `/Users/haojun/Desktop/Game developing/Wankai-game/Wankai`. Former paths remain compatibility symlinks. Use the grouped paths for new work; see the [workspace map](../../../README.md). The original baseline below is supplemented by the later implementation records and actual current source.

> 8 November 2026 更新：CR7 与 Mean Girl 已完成本地技能实现；下面保留历史设计/导入记录。当前状态见 [实现与验证](CR7_MEANGIRL_IMPLEMENTED.md)。

Prepared 7 November 2026 for a new Astra chat in the Game1 project.

## Requested work and endpoint

The user requested a dedicated chat to design other characters' F abilities, using Beagle's ability as an example. Begin with a source audit, a roster-level design proposal, and labeled motion videos. The immediate endpoint is a concrete design packet the user can review. New skill behavior is not approved for shipping merely because this handoff was created. After the user selects the proposed behavior, implement that approved scope and retain matching actual-game evidence.

Prioritize **Orange Tabby, CR7, Mean Girl and Maodie**, who currently have no F skill. Review the existing five abilities for identity, balance context and overlap; preserve them unless the user requests a revision. The earlier instruction to ship the three Drive imports without F is historical; the new request opens their skill design stage.

## Correct checkout and delivery baseline

- Project: `/Users/haojun/Desktop/Game developing` (Game1).
- Actual game checkout: `/Users/haojun/Desktop/Game developing/Wankai-game/Wankai-arena-camera`.
- Remote: `https://github.com/Gumssss/Wankai.git`.
- Current branch: `feat/drive-characters`.
- HEAD at preparation: `42bc52bc2b20e7d640a7b8570fd6f708ef4e0445`; gameplay implementation checkpoint `43e7f8e0790894728a6946441873097b60023365`.
- Published branch: https://github.com/Gumssss/Wankai/tree/feat/drive-characters . This is a feature-branch checkpoint, not a claim of merge into main or a packaged release.
- This host is **Mac mini (2)**. The user's MacBook is a separate device and is not connected for execution here. A browser URL on this host does not launch a MacBook application.
- Do not use the sibling `/Users/haojun/Desktop/Game developing/Wankai-game/Wankai` as the current implementation checkout; it contains unrelated older authoring work.
- Recheck status and applicable instructions at the beginning. Preserve the unrelated modified `build/icon-mac.png`, `build/icon.png` and `image.png`, plus the many untracked legacy assets/source files. Do not reset, clean, stage everything or switch the shared branch casually.
- `node_modules` is a symlink to `../Wankai/node_modules`. Preserve it and avoid replacing shared dependencies as a routine setup step.

## Read first

Read current runtime sources together with these records. Historical Beagle documents in older checkouts/refs explain experiments; they do not supersede this branch's current controller.

1. `README.md` — launch, controls, roster, skills and Steam limitations.
2. `docs/ARCHITECTURE.md` — simulation, input, events, AI and network ownership. Its introductory restoration/import notes qualify older procedural-only descriptions below.
3. `docs/RESTORED_ANIMALS.md` — exact selected Beagle/Orange Tabby appearance, anatomical contact frames, rotor rules and restoration history. Its protocol-4 section is historical; current protocol is 5.
4. `docs/characters/drive-packet-2026-11-05.md` — CR7, Mean Girl and Maodie sources, static-mesh limitations, controller, evidence and current 9-character/56-loadout checkpoint.
5. `src/skills.js`, `src/character-catalog.js`, `src/weapon-catalog.js`, `src/loadouts.js`, `src/character-attachments.js`.
6. `src/physics.js`, `src/beagle-skill.js`, `src/animal-settings.js`, `src/game-session.js`, `src/net-session.js`, `src/ai-opponent.js`, `src/scene.js`, `src/App.jsx`, `src/audio.js`.
7. `/Users/haojun/.codex/skills/game-character-pipeline/SKILL.md`, especially its `references/motion-and-reviews.md` and `references/documents.md`. Use relevant project character-design/rigging skills when their stages are actually in scope.

## Current playable roster and abilities

| Character ID | Identity / signature weapon | Current F behavior |
| --- | --- | --- |
| `naiwa` | 奶蛙 / 奶木昆 (`yellow-staff`) | 大笑 (`laugh`): drain a full 200-point stamina bar in 0.5 s, suppress recovery for another 2 s; 35 s cooldown. |
| `stickman` | 火柴人 / common weapons | 绕后 (`twist`): short teleport behind the opponent and face them; 28 s cooldown, 0.45 s active period. |
| `dudu` | 胆子肥嘟嘟 / 外卖盒 (`takeout-box`) | 外卖投掷 (`delivery`): projectile box, 14 damage and knockback; 22 s cooldown. |
| `happy-cat` | 开心小猫 / 开心猫爪 (`happy-paws`) | Happy Happy (`happy`): heal 10 HP over 1.6 s; 40 s cooldown. |
| `beagle` | 比格犬 / 长耳 (`long-ears`) or common weapons | 旋耳悬停 (`rotor`), long-ear loadout only: up to 5 s, at least 40 stamina to activate, drain 16/s; no additional cooldown. Common-weapon Beagle does not get rotor. |
| `orange-tabby` | 橘猫 / paired giant paws (`cat-paws`) | None. Selected seated model with 1.3× paws and 0.35 idle hover. Idle hover is not an F skill or proof of a contact-driven launch. |
| `cr7` | CR7 / 足球 (`soccer-ball`) | None. Signature or any of six common weapons. |
| `mean-girl` | Mean Girl / 皇冠爱心 (`crowned-heart`) | None. Signature or any of six common weapons. |
| `maodie` | Maodie / single floating paw (`maodie-paw`) | None. Signature or any of six common weapons. Separate from both other cats. |

Beagle has 80 maximum HP, Orange Tabby 150, others 100. Stamina is 200; common swing cost 12/s, turn cost 5/s, recovery 60/s after 0.5 s. These are the current baseline, not instructions to retune everything.

An older conversation proposed a stamina-free five-second rotor. The restored/published implementation explicitly uses the paid rules above. Identify this distinction if discussing resources; do not silently reinstate an earlier experiment. Propose and review resource choices for each new ability rather than applying Beagle's costs to every character.

## Game design and technical constraints

- This is a **weapon-driven physics arena**. W/S rotates the weapon vertically; A/D rotates it horizontally. Weapon-floor contacts produce ordinary travel/rise. Do not turn WASD into a conventional walk controller or add hidden body translation to make a preview look functional.
- Characters and weapons are separate selections `{ characterId, weaponId }`. Most characters use a signature or common equipment; Orange Tabby currently only supports its paired paws. Skills are character-owned in general, with Beagle's anatomical rotor as an explicit loadout-gated exception. Every proposed skill must say whether it works with common weapons and what happens on incompatible equipment.
- Preserve accepted models and identity. Beagle uses smooth v05 long ears or compact natural ears with common weapons. The fluffy-ear version and front/back flips were rejected/superseded; flips remain inactive.
- CR7, Mean Girl and Maodie are prepared rigid imported bodies. Maodie's supplied idle/attack/hit GLBs are static poses, not animation clips or a usable skeleton. Do not promise a deforming action without identifying needed rig work.
- The single shared fixed simulation step is 1/180 s. Skill inputs enter through the same input contract as normal controls; one `skillTap` is consumed once. Actual effects belong in authoritative simulation, visual/audio feedback in scene/event consumers.
- Online host runs physics, guest sends inputs and interpolates snapshots. Current protocol is 5. A changed skill state/projectile/event must replicate and reset correctly; do not create a second independent simulation or render-only damage system.
- Existing matching evidence may be reused for unchanged normal controls. Changes to contact geometry/motion require affected clearance/contact checks. Keep visible geometry, contact positions and point velocities consistent.

## Proposed working sequence

1. Audit the current nine-character roster and five implemented skills. Summarize each character's personality, weapon reach, strengths, weaknesses and existing ability overlap.
2. Create a concise recommendation matrix for the four missing skills. Give one recommended direction per character and a meaningful alternative where the choice matters. Favor distinct roles and understandable counterplay over four variations of damage/teleport/heal. Numerical values are provisional design suggestions, not measured balance.
3. For each direction specify: tap/hold/release, aim, wind-up, active phase, recovery, cooldown, stamina or other costs, hit/contact behavior, duration/range/damage, interruption/cancellation, expiry/landing/rearming, and interactions with W/S/A/D and common weapons. Describe opponent telegraphs and counterplay, AI use, arena boundaries/obstacles, mirrors and network behavior.
4. Produce reviewable motion videos before shipping new skill logic. Label authored concepts versus solver replays honestly. Do not advertise scripted lift/travel as proven contact-driven gameplay.
5. Present the concrete designs and encoded videos for the user to select/refine. Record the selected version and unresolved decisions. The user asked for design; do not auto-publish or merge newly invented skills. Routine independent research/prototypes/video work need no repeated approval questions.
6. If the user authorizes implementation, implement the selected scope, record actual-game evidence, run meaningful regressions/build and inspect the playable result. Update the relevant records and deliver GitHub changes only within the user's authorization for that work.

## Mandatory motion-review format

The user's explicit preference is **always use videos to explain any character move**. Prose/static images are supplementary.

- Use live key highlights (including F), chapter/phase labels, floor/contact cues, body travel/height, resources and real impact feedback where applicable.
- Show a complete action at normal speed, then replay the same critical event at clearly labeled slow speed (typically 0.25×). Do not substitute a different stronger setup in the replay.
- The main movement review must include labeled W, S, A, D, W+A, W+D, S+A and S+D. Reuse matching accepted normal-control evidence when unchanged. Cover skill plus relevant simultaneous inputs, release/reversal, wind-up, success/miss, interruption, expiry, landing and return to ordinary control.
- Keep the floor/camera stable enough to assess lift. Distinguish idle hover, powered ability lift and actual weapon-contact support.
- Before presenting, inspect the encoded videos and record actual media timecodes/coverage. Wall-clock capture estimates are not exact seek points.
- All sites/game previews must be muted when opened. No autoplaying audio. Desktop launch: `npm start -- --mute-audio`.

## Records and reusable evidence

Keep this handoff as the initial baseline. Add a proportional roster skill design record, such as `docs/characters/F_SKILL_DESIGN.md`, with proposals, compatibility, tuning rationale, open decisions and acceptance history. Store motion versions/timecodes and before/after links in a companion motion record or a clearly separated section. Use stable IDs and explicit selected/current pointers. Preserve originals, accepted work and rejected experiments separately.

- `assets/concepts/restored-animals-v01/` — Beagle and Orange Tabby actual-game evidence, source hashes and verification.
- `assets/concepts/drive-characters-v01/movement-review.mp4` — 92.37 s chaptered normal controls and same-event replays for CR7, Mean Girl and Maodie.
- `assets/concepts/drive-characters-v01/README.md`, `verification.json`, `capture-report.json`, `replay-plan.json`, `same-event-replays.json` — evidence scope and known limits.
- `docs/previews/drive-characters-v01/` and `docs/previews/restored-animals-v01/` — working viewer/capture harness examples; reuse rather than installing another production stack without need.
- `tools/restored-animals-receiver.mjs`, `tools/finish-restored-animals-video.py` — recording/postprocessing helpers.

Only if new production geometry becomes necessary: reuse approved existing bases first; generate every genuinely new base through Tripo with consistent front/side/back inputs, then refine/rig in Blender as needed. Skill-only work does not require regenerating accepted characters.

## Verification, environment and outstanding limitations

The last delivered baseline passed **177 tests** and `npm run build`. This is prior checkpoint evidence, not a new run by the design chat. Relevant suites include `tests/game-session.test.js`, `tests/restored-animals.test.js`, `tests/drive-characters.test.js`, `tests/net-session.test.js`, `tests/ai-opponent.test.js`, `tests/combat.test.js`, `tests/models.test.js` and `tests/audio.test.js`. Recheck actual files before editing.

After approved implementation, cover AI and online host/guest, all affected loadouts, simultaneous normal inputs, cooldown/energy boundaries, invalid/duplicate activation, pause/focus/reset/rematch, death/result, obstacles and recovery. Run targeted meaningful checks, then the current regression suite and build. Distinguish technical pass from user acceptance and human matchup balance.

The existing two-column setup crowds the preview at 700 px width; desktop is the reviewed appearance target. Native Steam play for the imported packet has not been live-tested. Steam needs the desktop application, Steam installed/logged in and both peers on the same build; browser preview cannot do Steam networking. `steamworks.js` was missing in this host's shared dependencies at last check, and Steam was not found in the two standard Applications locations checked. Do not claim that a browser/prototype proves Steam play.

The game preview has been served at `http://127.0.0.1:5195/`; inspect whether it is still running before reusing or starting a server. Do not stop another task's server. The design chat should report its initial audit and begin the review packet, rather than just acknowledging this handoff.
