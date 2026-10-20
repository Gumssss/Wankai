# Project review — 20 October 2026

**GitHub delivery branch:** the creator requested publishing the current work on `feat/orange-tabby-preparation`, based on merged PR #2 (`a591070`). Before committing this delivery, the complete suite passed **143/143 tests**, `npm run build` passed (existing large-chunk advisory), and the diff check passed. The branch includes the playable cat, selection/preparation flow, assets/evidence, stage-scoped skill and handoff updates. Use the remote branch/PR's actual head SHA for review. Merge remains the creator-side integration agent's responsibility; no merge or packaged release is included. Earlier local-only and scoped verification descriptions below retain their dated context.

New collaborators and agents should start with the [project handoff](COLLABORATOR_AGENT_HANDOFF.md), which consolidates setup, architecture, current rules, active/deferred work and the contribution workflow. The approved orange-tabby model and giant-paw movement are now integrated locally; see [cat gameplay handoff](characters/orange-tabby/GAMEPLAY.md).

The current local state is a playable two-player prototype with a dedicated full-window preparation page: P1 left/P2 right, choices above each player's actual-model preview, independent Ready buttons and a shared Start. Back/Escape returns to the menu without committing drafts. Basic fighter has three ordinary weapons, beagle has those three or long ears, and orange tabby has its giant paws (eight valid loadouts). The selection feature is not yet pushed/merged; the prior timed-hover baseline is merged PR #2 at `a591070`. Automated checks cover the implemented rules; control feel and weapon balance still require hands-on acceptance.

The two-player layout update passed 14 scoped draft/loadout/session tests, the production build and live start/save/cancel/solo/practice checks. Its full-window follow-up passed 17 focused draft/resize/camera checks and the production build, including safe hidden-arena sizing. Compact desktop and stacked phone layouts were checked without horizontal overflow. [Current selection screenshot](screenshots/preparation-stage-v04.jpg) and [verification](selection-concepts/v04-preparation-stage/verification.json). Models and gameplay are unchanged by these UI updates.

The original upright source checkpoint was merged into `main` as PR #1. The creator later reported the flip experiment lying down and set flips aside; that code is retained as inactive history. This source checkpoint adds upright normal movement, timed hover and the character-production skill. The half-speed/contact trial is included and still needs balance playtesting. It halves both weapon-axis limits, adds measured solid blade/guard coverage, and samples contacts between physics poses while preserving model size/reach and the ground timestep. See [download and update instructions](../README.md) and the dated [changelog](../CHANGELOG.md).

The creator approved the normal-controls proposal and requested a low-hover spin skill on 19 October. The game now uses upright parallel-ear W/S+A/D movement and **press F** (P2 **Right Shift**) to spread, spin and hover slightly. The separate five-second timer removes lift and retracts the ears on expiry; the skill costs no stamina. Hits, blocks and ordinary shared stamina remain functional. See [current skill handoff](BEAGLE_SPIN_SKILL.md). Ordinary stamina is 200 for every loadout.

## Orange tabby integration — 20 October 2026

The creator approved the complete v07 movement review and requested implementation. The live picker enables orange tabby + cat paws, preserving the exact prepared-v02 GLB and v06 finite physical controls. W/S pitches both detached paws, A/D steers, and all four combinations work. Low rest hover is separate from contact-driven lift: S paw-floor support raises the seated body. P1/P2 controls/materials, fallback/loading, shared stamina, pause/rematch/reset and camera framing follow the existing game architecture. This change adds no cat ability or global balance adjustment. At this integration checkpoint, 132 tests, the production build and 73 actual-game capture checks passed. The [complete gameplay video](previews/orange-tabby/review-gameplay-v01.html) records every direction and combined move, recovery and combat; current user-facing review takes place in the live game. Local implementation and dated verification are recorded in [GAMEPLAY](characters/orange-tabby/GAMEPLAY.md); it is not pushed, merged or released.

## Historical selection checkpoint — 19 October 2026

At this checkpoint the approved left-boxes/right-model picker was implemented; the 20 October full-window preparation page above supersedes that UI. Character identity owns body geometry independently of equipment; beagle with ordinary weapons keeps natural cosmetic ears and cannot activate hover. The accepted long-ear rig/controller is retained. Atomic lobby commits, independent drafts/confirmation/cancellation, solo/practice, rematch and model fallback/retry were verified. Full-swing clearance increases only the beagle sword offset to 1.34, shared by rendering and contacts.

**108 tests passed at that checkpoint**, along with the production build and rig verification. Browser flow, actual keyboard gameplay, responsive layout and forced load failure/retry passed. Built Electron opened the earlier game/picker and loaded the compact model; full native match automation remained unverified after a timeout. This does not verify the later preparation page in Electron. See the [implementation handoff](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md), [design record](CHARACTER_WEAPON_SELECTION_DESIGN.md) and [before/actual-game videos](previews/character-weapon-motion/index.html). Human acceptance and balance remain open.

## Implemented

| Area | Current behavior |
| --- | --- |
| Movement and combat | Weapons drive the fighter through ground contact; beagle + long ears uses upright parallel-ear movement and a separate F low-hover rotor skill. W / S and the arrow equivalents apply continuous front/back swing torque; A / D and left/right steer weapon heading. Hits, blocks, support, knockback, health, pause, and rematch are implemented. |
| Character / weapon roster | Basic fighter: sword, polearm, hammer. Beagle: those three plus beagle-only long ears. Orange tabby: its approved paired giant paws. The hammer has broad solid-head contacts and 30% stronger metal-head damage. |
| Armory | Full-window preparation page, P1 left/P2 right, each with choices above its model preview. Independent Ready buttons, shared Start/save, local drafts, atomic commit, Back/Escape cancellation. Solo shows P1; narrow screens stack panels. Rematches keep committed choices. |
| Split-screen duel | One simulation rendered through two independent cameras. Approved rear framing starts 15° off each fighter's heading, with 0.35-radian orbit pitch and 10.5-unit distance. The far rim is visible from the starting positions. |
| Camera controls | P1 uses Q / E; P2 uses period / slash (the ? key, without Shift). The corrected turn directions are applied. Releasing keeps the selected angle; rematches restore the approved defaults. |
| Arena and modes | Split-screen and solo use a 19.35-unit arena radius, three times the original. Fixed-camera duel and dummy practice retain the original arena. Solo retains mouse orbit and wheel zoom. |
| Asset import | Local GLBs with measured native axes and grip origins. Continuous yaw/pitch drives visuals and off-axis hammer collision shapes. The hammer was reduced from a 13.2 MB export to a 2.8 MB game copy with a 1K texture. |

## Latest combat prototype

The requested stamina system, separate HUD bars, reduced horizontal-turn damage, and their documentation are included in the source checkpoint. Nine combat regression checks pass alongside the existing checks. Body hits have hit pause and a damage readout. The contact trial adds backward recoil for both fighters on a clear weapon clash, opposite each fighter's current heading, alongside physical deflection, sound, and particles. Separation/cooldown prevents repeated recoil from resting contact. Final pacing and hands-on acceptance remain open.

The current implementation starts each fighter with 200 stamina, drains 20 points per second for swing input and 8 for horizontal turning, and recovers 30 per second after 0.5 seconds without weapon input. Below 25 stamina, powered control weakens toward 40% at zero while retaining reversal braking. Pure turning damage starts at 50% of an equivalent vertical strike, with mixed-contact damage blended by closing motion. These are initial tuning choices under active verification, not accepted final balance.

## Verified for the previous merged F-skill baseline — 19 October 2026

- `npm test`: **100 passed, 0 failed**. Includes skill lifecycle, mixed-loadout rotor combat, expiry/landing, zero-stamina activation/rearm, two-player input and actual GLB alignment through spread and lag.
- `npm run build` and `git diff --check` pass; the existing bundle-size warning remains.
- Browser checks confirmed a tap of F starts the countdown while stamina remains at 200/200, plus simultaneous W+D input. The [timed-skill screenshot](screenshots/beagle-timed-hover.png) shows the actual model and timer.
- The rig import and historical functional-preview simulation also pass. The source checkpoint includes the current game, character-production skill and complete beagle design history. Height, wind-up, steering, stamina and match balance still need hands-on acceptance.

## Historical checks for the earlier flip experiment

- `npm test`: **92 passed, 0 failed** on 18 October 2026. Includes the original 85 checks plus airborne flips with W/S+A/D, coupled point velocities and momentum reaction, release/reversal/fatigue, rotated-head hits, floor separation and all sixteen loadout pairings. Actual GLB vertex checks now include inverted body poses.
- `npm run build` and `git diff --check` pass for the local extension; the existing bundle-size warning remains.
- The earlier merged upright checkpoint passed 85 tests, an isolated staged-source export and the production build. Its rig/contact evidence is in `assets/concepts/beagle/tripo-v05/verification.json`; current diagnostics are in ignored `output/beagle-flips/`.
- Historical screenshots remain under `docs/screenshots/`; they illustrate their dated checkpoints. The [flip handoff](BEAGLE_FLIPS.md) records the inactive experiment. Current controls and physics are described in the [skill handoff](BEAGLE_SPIN_SKILL.md), and the [complete design process](BEAGLE_DESIGN_PROCESS.md) records how the direction changed.

## Remaining work, in recommended order

**Deferred TODO — selection-model loading speed (creator request, 19 October).** Record this for the next text discussion; do not start optimization yet. The placeholder flash is fixed, but loading latency has not been optimized. Measure cold/warm selection changes and separate asset fetch, GLB/texture decoding and GPU upload before choosing a fix. Consider shared asset preloading/reuse, with independent player instances and safe resource ownership; preserve error fallback/retry and selected IDs. The picker waits for both body and weapon, and the sword asset is much larger than the beagle, but the dominant delay has not been profiled. Do not promise instant loading from file size alone.

**Recorded workflow — add characters and weapons independently (creator request, 19 October).** The separate catalogues/resolver are implemented. Future contributors should create a reusable character or weapon once, then verify each supported combination: allowed choices, floating placement/clearance around that body, visible equipment versus hit/block/support contacts, camera framing and character-specific skill rules. A wider body can need an offset adjustment, as with the beagle sword; visuals and contacts must share it. This is not a requirement to rebuild every weapon for every character. New entries still need model/controller integration, and changed moves need the pipeline's before/after videos. Keep this contract in collaborator task briefs.

**Planned TODO — prepare for collaborators.** Before parallel development, publish an agreed tested baseline, verify setup from a fresh checkout, assign small tasks with one owner each, and agree on feature branches/PR review and merge responsibility. Add automated test/build checks for proposed changes; no checked-in CI workflow exists yet. Agree on shared gameplay/asset conventions, large editable-source storage, credit-spend authorization and release ownership. Keep current progress and acceptance evidence in the repository. See the [collaborator preparation checklist](COLLABORATOR_AGENT_HANDOFF.md#before-collaborators-start). These preparation steps are recommendations, not completed publishing or configuration changes.

**Agreed merge responsibility, clarified 20 October:** the creator will merge using an integration agent on their own side. Contributors prepare their assigned changes and hand over the branch/PR, exact tested revision, checks and limits when delivery is authorized. The creator's integration agent reviews the combined result, resolves conflicts, verifies it and merges the identified changes, then updates this overview after confirming the remote result. See the [current cutoff and owner](COLLABORATOR_AGENT_HANDOFF.md#current-cutoff-and-merge-owner), [integration-agent prompt](COLLABORATOR_AGENT_HANDOFF.md#prompt-for-the-creators-integration-agent) and [skill quickstart](SKILLS.md#collaborator-quickstart). Keep using existing handoff/task records; no separate cutoff template is required. Loading-speed optimization remains deferred. This documentation update performs no Git delivery action.

1. **Playtest the full-window preparation page and all eight character/weapon combinations, including the cat's support-driven lift and the long-ear F hover skill.** Judge combined W/S+A/D steering, wind-up, release/landing, tired control and weapon contacts. The long-ear skill has a separate five-second timer and no stamina cost; the cat has no extra ability. Ordinary stamina is 200, with existing costs/recovery retained. Balance remains open. Flips are inactive. Review implemented behavior in the live game, as requested; retain existing recorded evidence without requiring another video presentation. See [cat gameplay](characters/orange-tabby/GAMEPLAY.md) and [long-ear handoff](BEAGLE_SPIN_SKILL.md).
2. **Accept the sword support behavior.** The creator's original direction-change complaint is still open. A historical fixed-target discontinuity was reproduced, and continuous controls plus visual-axis regressions cover the identified causes. Reproduce the reported key sequence with a fixed camera, compare the polearm, and obtain hands-on acceptance before calling the issue solved. See [sword trial](SWORD_TRIAL.md).
3. **Playtest the half-speed/contact/recoil trial.** Sword, polearm, and hammer cap each axis at 6.1 / 4.25 / 3.4 rad/s. Acceleration, braking, damage, and stamina settings remain. Intermediate sampling and measured proxies catch regression crossings and preserve nearby misses. Clear clashes now make both fighters retreat opposite their own headings; judge recoil strength, movement, impact strength, block readability, and performance in matches. Sampling and proxies remain approximate. The 30% speed option, extra block allowance, and clash pause/readout remain proposals.
4. **Run a two-person control and camera playtest.** Observe whether movement, aiming, and hits are deliberate without live instruction. Assess stamina recovery, exhausted movement, horizontal/vertical damage, and whether each player can find the opponent while turning the camera near the larger arena's edge. The framing guard protects the player's own fighter; it does not guarantee the opponent or whole weapon stays visible.
5. **Measure performance and tune the existing weapons.** Start with sword texture memory and repeated armory/mode switches, then compare sword, polearm, and hammer matches. The sword game asset remains about 16.8 MB with three 4K textures (roughly 256 MiB decoded RGBA including mipmaps). The hammer is already substantially lighter. File sizes and memory estimates do not establish a measured frame rate or a memory leak.
6. **Keep the fourth precision weapon deferred.** Its accepted direction is slower horizontal steering with quick response and stronger release braking. The proposed staff appearance, remaining balance choices, and its inspected 5-credit export are not approved. No staff export has been bought or downloaded. Resume through [precision weapon side project](PRECISION_WEAPON.md) when requested.

The renderer, fixed-step physics, match session, weapon metadata, and asset preparation are separate modules, so the next work can stay focused on acceptance, tuning, and performance. There is no multiplayer networking, AI opponent, guided tutorial, or installer in this checkpoint.

## Repository and asset notes

The creator requested a checkpoint in [Gumssss/Wankai](https://github.com/Gumssss/Wankai) on 17 October 2026. It was first pushed to the existing `solo-camera-mode` branch, then merged into the default `main` branch at the creator's request. GitHub confirmed write access and no rule requiring another review. Both branches contained checkpoint `2ca081a` after that merge; subsequent documentation updates continue on `main`. This supersedes the earlier local-only instruction. No installer or packaged release has been published.

The public Tripo sword and hammer models' redistribution terms remain unverified. The checkpoint request does not resolve that open asset-permission item. The unused `index 2.html` is retained as an existing legacy prototype file; the active Vite entry is `index.html`. Dependencies and generated build output stay excluded by `.gitignore`.

## Merged upright beagle checkpoint — historical, 18 October 2026

The approved smooth Tripo v05 model is integrated as **比格犬·双耳**.
Both players can select it in all existing modes, including matching beagles.
The actual rig is driven by the existing upright-body solver: continuous W/S,
combined A/D, ground-driven lift/travel, inertia, reverse braking, shared
stamina, directional damage and ordinary clash recoil. Eighteen fitted ear
capsules use the measured sockets; the broader head has matching hurt shapes.
Skeletons/materials are cloned independently, and solo/split cameras include
the ear envelope. The earlier fluffy study remains rejected.

Browser checks exercised solo W and W+D, separate controls for two beagles in
split screen, and beagle-versus-sword practice with a live 19-damage hit and
received damage. The native model/physics alignment is tested across full
swings and headings. See [model and runtime handoff](BEAGLE_MODEL_V05.md).

The creator accepted this appearance and playable checkpoint and requested a
push and merge on 18 October. **At that merged checkpoint, the requested backflip and front flip
were still missing:** S then rotated the ears backward with the body upright.
The later local flip experiment added body-pitch dynamics, hinge reactions and
matching rotated contact/hurt shapes, preserving ear momentum and simultaneous
A/D. It is now inactive after the creator reported a lying-down result. The current game instead uses upright movement and the separate timed hover skill. Coverage/inertia balance and a two-person
keyboard playtest also remain open; no packaged release is included.

Validation for this integration: **85 tests passed, 0 failed** on 18 October
2026; production build and `git diff --check` passed. The existing Vite bundle
size warning remains. Selected screenshots are in `docs/screenshots/beagle-*.png`; tracked rig/contact
verification is in `assets/concepts/beagle/tripo-v05/verification.json`. Fresh
diagnostic output remains under ignored `output/`.
