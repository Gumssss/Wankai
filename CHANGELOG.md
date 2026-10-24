# 更新记录 / Changelog

## 24 October 2026 — publish combat and performance checkpoint

- Deliver the current chronological combat resolver, coordinated resource/round/body rules, character-specific health, 1.3× Cat paws, attacker-owned feedback and adaptive combat cameras on `feat/combat-balance-performance-update`; this push does not merge main.
- Cap arena rendering at 1920×1080 total pixels and DPR 1.5 with resize/density tracking; defer per-capsule preparation until broad-phase overlap. Use the lite Colosseum (46,280 triangles, 1024² textures), preserving the exact floor and protected boundaries. Archive the prior runtime assets.
- Fresh verification: 234 tests and production build pass. Retain existing motion comparisons, actual-game recordings and evidence in tracked concept folders. [Delivery details](docs/updates/2026-10-24-github-delivery.md). Earlier local-only statements are historical; final human balance and native Electron acceptance remain open.

## 23 October 2026 — Cat paws reduced to 1.3× original

- Replace the 2× trial with 1.3× width/height/depth through one shared scale. Derive placement and camera fit margins from that scale; preserve 0.02 floor and 0.08 body clearance, 150 HP, body hover and all control/combat tuning.
- Update actual-mesh size/contact checks and geometry-dependent support/contact fixtures. All 49 focused model, movement, solver and matchup checks pass; production build passes. Retain the pre-integration comparison and actual-game evidence separately in `output/cat-paws-v3/`.

## 23 October 2026 — Beagle/Cat balance and damage ownership

- Set all Beagle loadouts to 80 HP and Cat to 150 HP through shared health settings. Retain each maximum through preparation, HUD, training restoration, rematches, proportional pressure and timeout results.
- Keep full visible long ears, but restrict every physical ear response to radius-inset capsules in the distal 1.8–3.6 range. Fallbacks and cameras retain full-ear bounds.
- Double each Cat paw's three dimensions around its own neutral center, place it beside the unchanged body with 0.02 floor/0.08 body clearance, and share the transform across model, contacts, fallback, trails and cues. Preserve controls, stamina, skill and damage tuning.
- Use selected character names with P1/P2 across the game; keep names visible on narrow screens and preserve dummy identity. Retain effect attacker/target IDs, color/prefix damage by attacker, and show two independent full-name readouts for trades. Pressure stays environmental.
- Verify **224 passing tests**, including all 81 pairings with swapped slots at full/low/empty stamina, and a passing production build (existing chunk-size advisory). Preserve the pre-integration comparison, exact-model checks, actual-game capture and desktop/mobile ownership evidence in `output/beagle-cat-balance-v2/`. No commit or push.

## 23 October 2026 — coordinated balance trial (remaining 12 plan items)

- Centralize shared stamina, rotor, hover, health, hammer and round settings. Rotor requires 40 stamina, spends 16/second, stops empty and cannot regenerate through retraction; all powered controllers share fatigue. Turning costs 10/second, fatigue starts below 60, recovery is 24/second after 0.6 seconds. Supported hover uses total horizontal damping 1.5/second with an airborne fade.
- Trial 110 maximum HP for Beagle/Yellow and retain 100 for Basic/Cat with unchanged mass. Correct Yellow's below-floor torso proxy. Make HUD, healing, reset, timeout and pressure use actual maximum health. Hammer metal heads use 1.45 damage while handling and shaft scaling remain.
- Apply clash arcade recoil along the pair's separation axis through the common event batch. Replace horizontal body circles/height cutoff with authored upright 3D capsules, shape-aware boundaries and floor-supported landing response. Preserve player-slot fairness even for coincident bodies and do not repeat forces/resources during contact slices.
- Add competitive 120-second rounds, a pressure zone starting at 45 seconds and contracting toward 32% radius, a two-second outside warning, and 10%-maximum-HP/second outside loss. Timeout uses health percentages; earlier contact knockout takes priority over later pressure. Practice/solo remain untimed and pressure-free; training shares duel geometry, spawns, friction and contacts.
- Replace the static shared view with controlled centering/pullback along its approved direction/display basis. Fit bodies, labels and solid weapons, protect nearby opponents in split-screen, add distant edge indicators and fit full-size training wall encounters. Update preparation, HUD, help and results to describe the active rules.
- Preserve archived character recordings. Retain exact unchanged movement checks and replace superseded tuning expectations with control-direction, support, coasting/reversal and current-resource checks. Add regressions for all remaining problems, 81 pairings at full/low/empty stamina with slot reversal, camera visibility and round/contact priority. Record 108 constructed movement trials with the reproducible balance audit. Live checks include paid rotor activation, actual practice damage, pressure defeat and rematch.
- Final verification: **216 tests pass**, production build passes with its existing chunk-size advisory, and diff check passes. Live practice restores its 110-HP dummy and remains untimed beyond two minutes; split-screen keyboard combat/camera control and pause work with no runtime errors.
- These are first-trial balance values. Optional stationary-defense damage reduction and further hammer-braking changes remain conditional on human match evidence, as specified in the plan. Local work only; no commit/push.

## 23 October 2026 — shared combat contact resolution (plan 6–8)

- Replace clash-first/P1-first queries with one chronological weapon–weapon/weapon–body resolver. Resolve simultaneous damage from a common incoming state, apply coupled physical constraints and resweep the revised remaining motion. Earlier blocks can prevent later hits; simultaneous lethal trades can draw.
- Combine redundant contact geometry without discarding independent valid impacts. Select a damage representative by incoming normal impulse and retain actual striking-surface properties. Crossing adjacent capsules on a continuing surface no longer repeats restitution.
- Separate harmless contact from processed damage episodes. Track logical paws/ears/weapons independently, retain the shared 0.28-second damage interval and require over 0.045 seconds of each part's full separation to rearm. Consume qualifying cooldown-suppressed impacts without delayed damage; simultaneous parts cannot double-hit.
- Keep forces, resources and skill timers advancing once per fixed tick. Restore environmental constraints after changed trajectories without repeating friction. Retain existing resource/weapon balance numbers and reset contact episodes on rematch.
- Add 16 regressions covering the reproduced failures, event chronology, lockouts, duplicate geometry, material scaling, resource timing and all 81 ordered loadout pairs with reversed slots. Retain exact approved yellow movement/pre-contact replay checks; replace obsolete post-contact trajectory expectations with current combat checks and a clean swept staff/sword block. Preserve archived recordings. Verify beagle recoil at its actual impact time and continued retreat at tick end.
- **196 tests pass; production build passes** with its existing chunk-size advisory. Actual-game keyboard checks verified hits, pause/resume and rematch resource/health reset. This implements the combined 6–8 specification; the other balance proposals remain pending. Local work only; no commit/push.

## 22 October 2026 — combined character, menu, arena and camera checkpoint

- Integrate latest main's yellow character/staff, yellow default loadouts and animated intro/menu with the approved Colosseum/floor and split/fixed cameras. Preserve independent preparation, existing beagle/cat controllers and the single shared tick.
- Resolve the App/Canvas conflicts by retaining the intro props and mode-specific fixed-camera canvas lifecycle together.
- Reproduce and fix a polearm mismatch inherited from main: its visible length was 2.00 while contacts retained 2.35-unit measurements. Scale the contacts to match, retain the new length and update geometric fixtures. Added a regression where the old invisible tip caused 11 damage on a visible miss.
- Fresh full suite: **179 passed, 0 failed**. Production build passes with the existing large-chunk advisory. Browser integration review and merge evidence are recorded with [the arena integration](https://github.com/Gumssss/Wankai/pull/4). Earlier verification counts and branch-only states remain historical.

## 21 October 2026 — separate arena and camera delivery

- Prepare `feat/arena-camera-updates` from merged `main` (`55857a0`) for the creator's requested push, preserving the original working folder.
- Include the selected Colosseum Tripo/Blender sources, runtime arena/floor, measured floor/podium contacts, per-camera foreground cutaways and approved split/fixed-camera settings. Keep earlier studies/evidence as dated history.
- Fresh publication checks: **158/158 tests pass**, production build passes (existing large-chunk advisory), prepared GLB verifier passes and diff check passes. This republishes the approved runtime snapshot; prior actual-game evidence is retained.
- Existing orange-cat/character-preparation work is inherited from main. Another contributor's future character is outside this change. No merge or packaged release is part of this delivery.

## 21 October 2026 — Roman-inspired arena floor texture

- Added a dedicated matte floor texture with worn mosaic border and subtle laurel accents across all modes. Original Colosseum geometry, wall atlas, current cameras and physics are preserved.
- Added planar floor UV mapping, original-floor loading fallback, canceled-load cleanup and a live original/pattern comparison page.
- All 158 tests and production build pass; actual fixed/split/solo/practice views and normal-game combat/rematch checked. Local work only; no commit/push.

## 21 October 2026 — approved lower and closer fixed-camera view v09

- Apply the accepted v09 preview in fixed duel: eye [22.802009683082648, 12, 9.77228986417828], target [0, 1.4, 0] and 55° perspective FOV. The static camera keeps the approved azimuth.
- Rotate fixed duel’s complete rendered pair/effects together 45° anticlockwise, with matching HUD/cutaway projection. Preserve the physics frame and split-screen simulation parity, the larger radius-19.35 arena, other modes, input/controllers and combat rules; rematches retain the view.
- The tighter central framing can crop foreground/side-rim fighters and weapons. All 155 tests pass, production build passes with its existing chunk-size advisory, and diff check passes. Normal-game Chrome review verified both players’ swing/turn inputs and rematch; Chrome and the open in-app game tab show the implemented fixed view without console errors. Local work only; no commit/push.

## 21 October 2026 — approved larger fixed-camera view

- Applied camera-study v05 after creator approval: one shared perspective view, raised to height 24, 12.5% closer than the raised baseline, then orbited 45° anticlockwise.
- Fixed duel now matches the split-screen arena at uniform scale 3, playable radius 19.35 and podium contact height 2.52. The camera remains still during play and impacts; its projection handles resize and mode changes.
- Retained the other modes' camera settings and the smaller practice arena. Local implementation only; no commit/push.

## 21 October 2026 — approved closer split-screen camera

- Applied the exact 12.5%-closer preview after creator approval: distance 21 and derived pitch `asin(sin(0.35) * 10.5 / 21)` (approximately 0.17230016), preserving the original baseline eye height exactly.
- Retained 55° FOV, rear azimuth, independent controls, fighter fitting, foreground cutaways and solo/fixed/practice cameras. The distance-24 lower trial remains a historical checkpoint below.
- All 34 focused checks and the production build pass (existing chunk-size advisory); the normal game was checked in Chrome and the implemented camera image was saved. Local implementation only; no commit/push.

## 21 October 2026 — farther split-screen camera at the original height

- Refined the creator-selected Wider view after feedback that it was too high: orbit pitch 0.15, distance 24 keeps approximately the original eye height while pulling back horizontally. Existing 55° FOV, 15° rear offset, independent controls and fighter fitting remain.
- Retained solo/fixed/practice views and the previous split view in the local comparison page. Camera-containing wall sectors now seed foreground cutaways so the lower view stays clear from inside stonework. 34 focused regressions, actual-game checks and production build pass. Local only.

## 20 October 2026 — Colosseum environment, local implementation

- Prepared the selected Tripo base in Blender: level floor/centered origin, packed matte materials, local podium cleanup and named wall/collision helpers.
- Integrated self-contained arena GLB in all modes, preserving play radii with uniform building scale, explicit floor/rim contacts and independent foreground cutaways for each camera.
- Verified Three.js reimport, 613 floor samples, 149 tests, build and actual gameplay/UI flows. [Evidence and limits](docs/environments/colosseum/HANDOFF.md). No Git delivery or release.

## 20 October 2026 — GitHub delivery branch

- Collect playable orange tabby + giant paws, independent character/weapon selection, full-window preparation, required source/evidence assets, updated skill and handoff records on `feat/orange-tabby-preparation` for the requested GitHub push.
- Pre-commit validation: complete **143/143 tests passed**, production build passed with the existing chunk-size advisory, and diff check passed. Blender autosave backups remain local.
- Hand the branch/PR to the creator's own integration agent. This delivery does not merge into `main` or create an installer/release. Earlier local-only statements describe their dated checkpoints.

## 20 October 2026 — user-side integration handoff

- Clarified that the creator's own integration agent owns combined review, conflict resolution, final verification and merge; contributing agents hand over their assigned changes and tested revisions.
- Added a current-cutoff packet, separate contributor/integration prompts and practical stage-scoped skill usage/resume instructions. Linked them from the README and project status.
- Documentation only: no commit, push, PR creation, merge, release, new asset generation or gameplay change was performed for this handoff update.

## 20 October 2026 — stage-scoped character pipeline refinement

- Updated the portable `game-character-pipeline` source at the creator's request. Keep one umbrella skill with stage-scoped entry, requested endpoints, authorized continuation and checkpoint/resume; skip completed work and redundant reviews instead of forcing the whole production sequence.
- Separate retained actual-game motion evidence from its presentation. Honor explicit live-game review after implementation, and use screen/interaction evidence for UI-only changes with unchanged assets and motion.
- Preserve required Tripo bases, front/side/back reconstruction inputs, before-implementation motion review, full W/S/A/D plus four-combination coverage and affected approval/spending boundaries. No seven-skill split, new gameplay or asset generation is part of this refinement. [Scope and package guidance](docs/SKILLS.md#stage-scoped-pipeline-and-applied-refinements).
- Synchronized the installed account copy and verified the five modified files byte-for-byte. Metadata/UI YAML and field checks, internal links, JSON templates and four independent read-only scope dry runs passed. The official `quick_validate.py` helper could not run because PyYAML was unavailable; no new production generation or game changes were performed.

## 20 October 2026 — documentation reconciliation

- Reconciled current README, product/design/control references, collaborator and character handoffs with the playable cat, eight loadouts/64 pairings, and full-window preparation flow. Preserved earlier concepts, motion studies and verification counts as dated history.
- Clarified merged baseline versus local unpublished changes, 200 stamina and common versus character-specific weapons. Recorded the creator's preference to review implemented work in the live game.
- At this documentation-only checkpoint, proposed honoring presentation preferences and using UI-specific evidence for UI-only work. The later authorized skill refinement above applies those changes and adds stage-scoped operation; gameplay is unchanged.

## 20 October 2026 — approved two-player selection layout

- Follow-up: make selection a dedicated full-window preparation page with larger responsive controls/previews and Back/Escape navigation. Hide the arena/HUD while preparing, restore keyboard focus on return, and preserve the last valid arena projection during hidden-container resizes. Seventeen focused draft/resize/camera checks and the build pass. [Current screenshot](docs/screenshots/preparation-stage-v04.jpg).
- Show P1 on the left and P2 on the right, each with character/weapon choices above its own rotatable model preview. Stack complete player panels on narrow screens.
- Add independent Ready buttons and a shared Start/save action. Choice edits reset only the edited player's readiness; cancel discards drafts and final confirmation commits both together.
- Preserve solo/practice configuration, committed selections and all gameplay. Fourteen scoped state/loadout tests, production build and desktop/mobile browser checks pass. [Implementation and evidence](docs/CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md).

## 20 October 2026 — approved orange tabby playable locally

- Added orange tabby + giant paws to the character/weapon picker, using the exact approved prepared-v02 Tripo/Blender asset.
- Integrated accepted v06 physical movement: paired W/S paw pitch, A/D steering, four combinations, support-driven lift, shared stamina and normal combat/recovery.
- Added independent player models/materials, fitted paw contacts and trails, loading/failure fallback, cat camera bounds, help and reset behavior.
- Added saved-preview motion parity, contact/geometry/input/lifecycle/combat and camera checks. Actual gameplay evidence and delivery results: [cat handoff](docs/characters/orange-tabby/GAMEPLAY.md).
- Local work only; no new generation/spend, push, merge or release.

## Unreleased — local character / weapon separation, 19 October 2026

- Removed the brief simple-beagle flash during loading: show a loading label in the preview, and reveal the procedural backup only on an asset failure. Delayed loading, success and failure/retry were browser-checked.
- Replaced the combined loadout picker with Character → Weapon → Confirm, boxed choices left and rotatable combined model right; responsive stacking, independent drafts, atomic save/start and cancellation.
- Basic fighter supports sword/polearm/hammer; beagle supports those plus long ears. Compact natural ears are cosmetic. Orange cat/cat paws remain disabled and separate.
- Added character/weapon catalogues and resolver, canonical selections, legacy compatibility, independent model loading and character-owned hurt shapes/boundaries. Hover remains five seconds, stamina-free and restricted to long ears; flips remain inactive.
- Measured full-swing clearance: only beagle sword attachment moves outward, using the same offset for visuals and physical contacts. Existing resources, weapon tuning, cameras and shared simulation tick remain.
- 108 tests pass, production build and rig checks pass. Browser flows/failure retry and actual gameplay recordings verified. Built Electron picker/local asset loading checked; full native match automation remains unverified. Human acceptance/balance remain open.
- [Implementation and evidence](docs/CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md). These selection changes have not yet been pushed or merged.

## 2026-10-19 — Timed hover and character-production source checkpoint

- Include the five-second F / P2 Right Shift hover skill, upright parallel-ear W/S+A/D movement and 200 ordinary stamina in the playable source. The skill costs no stamina; the rejected flip controller remains inactive.
- Include `game-character-pipeline` and its production, move-video, review, documentation and beagle-lesson references. New character bases use Tripo; proposed moves require videos before implementation and actual gameplay footage afterward.
- Add a collaborator/agent handoff with setup, architecture, current rules, accepted/deferred decisions, progress tracking and the GitHub contribution/merge process. Link it from the README and current handoffs.
- Preserve the complete beagle design history, motion previews, handoffs and current verification. Correct stale flip-status descriptions in the glossary/provenance and repair the historical functional-preview adapter's current import.
- Validation: 100 tests, production build, native rig import and historical functional-preview simulation pass. The existing bundle-size warning remains. The in-progress orange-tabby work is excluded from this checkpoint; no packaged app release is produced.

## 2026-10-19 — Double stamina and separate timed hover

- Increase ordinary stamina from 100 to 200 for every loadout, keeping attack costs, recovery and fatigue thresholds.
- Press F (P2 Right Shift) for a five-second hover activation, independent of stamina. Skill steering is free too; release does not cancel, repeated input cannot extend it, and holding cannot auto-repeat.
- Update the HUD timer, help, reset behavior and regressions. This supersedes the stamina-driven hold-to-hover prototype below.


## 2026-10-19 — Beagle normal controls and F hover skill (local)

- Replace the active flip experiment with upright parallel-ear W/S movement and slower simultaneous A/D steering, matching the approved comparison video.
- Hold F (P2 Right Shift) to spread the ears, spin the whole character and hover slightly. Release or exhaustion retracts and lands; one shared stamina bar limits use.
- Keep the actual skin, fallback, swept contacts, damage, blocking and camera aligned through deployment and lag. Update controls and regression checks. Existing source model is unchanged; no push/merge in this step.


This records changes to the playable source prototype. Dated checkpoints are not packaged app releases. Download and update instructions are in the [README](README.md); acceptance questions and next work are in the [project status](docs/PROJECT_STATUS.md).

## Unreleased — 2026-10-18 — Coupled beagle front/back flips

- Added body pitch coupled to the physical ear hinge. Grounded W/S strokes plant the ears and vault into forward/backward rotation; A/D continues steering during takeoff and flight. Release retains momentum and reversal brakes. Body and ears can change angle relative to one another.
- Added an articulated mass matrix, finite hinge motors, gravity/inertial terms and damping. A supported loading stance assists the initial push; flight has no upright constraint, fixed animation or scripted launch impulse. Both ears still share one swing control and stamina budget.
- Body/head/paw contacts, ear sockets, hits, blocks, ground/rim response, fallback geometry and camera framing follow the rotated pose. Contact position stabilization limits floor overlap. Mixed-body separation also reapplies the ordinary fighter floor constraint.
- Validation: **92 tests passed** including complete airborne flips in both directions with either A/D direction, momentum reaction, release/reversal/fatigue, inverted GLB alignment, rotated-head hits and all sixteen loadout pairings. The original smooth model is unchanged. See [flip handoff](docs/BEAGLE_FLIPS.md) for control details, assisted stance and remaining limitations.
- Originally a local follow-up to merged PR #1. Retained as inactive experiment code/history in the later source checkpoint; it does not drive current gameplay and was not released as an active flip feature.

## 2026-10-18 — Playable smooth-ear beagle checkpoint

- Added **比格犬·双耳** as a paired character/weapon loadout in every mode. Both players can select it independently, including matching beagles, and rematches retain the choices.
- Integrated the approved smooth Tripo appearance, lengthened in Blender with rounded roots/tips retained. Includes a packed editable rig, compact local GLBs, source provenance, measured geometry, and the motion-study history. The rejected fluffy appearance remains a historical study.
- Both ears use measured head sockets and eighteen fitted contact capsules. Shared W/S plus A/D, inertia, reversal braking, ground-driven lift/travel, stamina, directional damage, hit gating, blocks and clash recoil use the ordinary game solver. Wider head/paw hurt shapes, independent skeletons/materials and ear-aware camera framing accompany the character.
- Validation: **85 tests passed**, including all sixteen loadout pairings, actual GLB/physics alignment, combined inputs, contacts, damage, stamina, cloning and recoil; production build passed. Browser checks covered solo, two beagles in split screen, and practice hits. Existing bundle-size warning remains; final balance still needs playtesting.
- **Known gap:** backward/forward full-body flips from the earlier concept studies are not implemented. S rotates the ears backward while the body stays upright. The next physics extension must couple body pitch, hinge reactions, ear momentum and the rendered/contact poses; no input-triggered flip animation has been substituted.
- The creator approved the appearance and requested pushing and merging this source checkpoint. This is source delivery, with no packaged app release. Large raw Tripo downloads, local preferences, renders and diagnostic output remain in the local authoring archive.

## 2026-10-17 — Half-speed, contact, and clash-recoil trial

The creator approved a local playtest at 50% of the previous maximum swing and horizontal-turn speeds, with weapon size/reach retained. This trial awaits hands-on acceptance.

- Sword, polearm, and hammer axis limits are now 6.1, 4.25, and 3.4 rad/s. Acceleration, reversal braking, damping, stamina, and the damage formula retain their previous settings. The lower limits also apply after collision impulses. Slower impacts and ground-driven movement can therefore feel weaker; balance remains for playtesting.
- Added measured solid proxies for the sword crossguard and polearm collar, blade, curved tip, and barb. Existing shaft radii, axial reach, model transforms, and hammer shapes remain. No broad invisible collision allowance was added.
- Weapon clashes and body hits inspect intermediate rigid poses between 180 Hz states, using motion-bounded samples and refinement of the first sampled overlap. Ground integration and the simulation clock retain their fixed timestep. Regression fixtures now catch a crossing missed by endpoint-only checks and retain nearby misses.
- New checks cover half-speed limits, incoming-side contact response, body crossings, heading wrap, added solid features, and support in both directions with all three weapons. The sustained nine-loadout regression also checks post-contact speed limits. See [control system](docs/CONTROL_SYSTEM.md) for method and limitations and [project status](docs/PROJECT_STATUS.md) for validation.
- At the creator's request, clear weapon clashes now make both fighters step backward opposite their own current heading. Recoil grows with impact speed, preserves sideways/vertical and faster backward motion, and cannot repeat from held contact. Separation plus cooldown rearms it; rematches reset it. Existing particles/sound remain, with no added clash damage or stamina charge. Six recoil regressions bring the local suite to 77 checks; the in-game help describes the rule.
- A 30% speed setting, additional block allowance, stronger clash pause/readout, and the deferred precision weapon remain unimplemented. The original sword support-direction complaint still needs acceptance.

## 2026-10-17 — Combat checkpoint and GitHub setup

### Added

- Separate 100-point stamina bars for each fighter, including low-stamina and exhausted states. Swing input costs 20/s; horizontal weapon steering costs 8/s. Recovery begins after 0.5 seconds without weapon input at 30/s. Below 25 points, powered control progressively weakens toward 40% at zero while reverse braking and passive coasting remain available.
- Regression checks for stamina costs, recovery timing, exhaustion, camera inputs, pause/rematch behavior, and directional damage. The saved source checkpoint passes **63 tests** and builds successfully.
- Step-by-step README instructions for cloning, pulling updates, installing dependencies, starting the game, and downloading a ZIP. The documented platform is macOS with Node.js 22.12+.
- Repository-wide documentation review: updated the glossary, PRD, control reference, weapon trial records, deferred-weapon note, status, and handoff against current source. Clarified four modes, current versus historical screenshots, asset-preparation requirements, pitch/yaw braking, stamina/damage effects, clash feedback, and unimplemented proposals. This audit changes documentation only.

### Changed

- Pure horizontal-turn impacts use 50% of the equivalent vertical-hit damage. Mixed contacts blend according to the actual incoming motion; releasing a turn key does not bypass the reduction. Body translation remains neutral, and the iron-head bonus still applies.
- The completed source checkpoint and combat documentation are now on GitHub's default `main` branch. Ordinary clones and ZIP downloads get the current prototype; there is no installer or packaged GitHub Release yet.

### Open work

- The sword's reported support-direction behavior still needs hands-on acceptance.
- A controlled collision diagnostic reported weapon tips crossing between physics samples without registering a clash. Swept contacts or smaller collision substeps remain investigation work.
- A 30% maximum-speed experiment and stronger clash feedback were discussed, but neither change is applied in this checkpoint. Current weapon speed settings remain in effect.
- Stamina pacing, weapon balance, exhausted movement, camera comfort, and repeated mode-switch performance need playtesting. The sword's three 4K textures remain a substantial memory cost.
- The fourth precision weapon remains deferred. Its proposed staff and export cost are not approved; no staff export has been purchased. See the [deferred side project](docs/PRECISION_WEAPON.md).
- Public Tripo model redistribution terms remain unverified.

## 2026-10-15 — Armory, iron hammer, and rear-view duel

### Added

- Three-weapon armory with actual 3D previews, descriptions, strengths, and tradeoffs. Players choose independently before matches, may equip the same weapon, and retain their selections on rematch.
- Selected Tripo iron hammer, with slower handling, broad solid-head contacts, and a 30% metal-head damage bonus. Its game asset is about 2.8 MB with a 1K texture; the original export is retained for preparation.
- Approved independent rear views for split-screen: start 15° off each fighter's heading, at a 0.35-radian orbit pitch and 10.5-unit distance, showing the far arena edge.
- Keyboard camera turning: P1 uses Q / E; P2 uses period / slash (the ? key, without Shift). The corrected turn directions are applied; release keeps the angle and rematches reset it.
- A separate shared fixed-camera duel alongside split-screen duel, dummy practice, and solo exploration.

### Changed and corrected

- Split-screen arena radius now matches solo at 19.35 units, three times the original radius. Visual geometry and physical boundaries match; fixed-camera duel and practice keep the original arena.
- Weapon visuals and off-axis hammer contacts use continuous yaw/pitch rotation. Solid hammer head surfaces participate in hits, clashes, and support; decorative cloth does not.
- Final body-boundary enforcement prevents body separation from leaving a fighter slightly outside the arena. Camera framing checks protect the player's own body, head, and label during fast movement and resizing.

These checks address identified implementation problems; they do not establish final balance or acceptance of the earlier sword support complaint.
