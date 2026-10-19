# 更新记录 / Changelog

## 2026-10-19 — Timed hover and character-production source checkpoint

- Include the five-second F / P2 Right Shift hover skill, upright parallel-ear W/S+A/D movement and 200 ordinary stamina in the playable source. The skill costs no stamina; the rejected flip controller remains inactive.
- Include `game-character-pipeline` and its production, move-video, review, documentation and beagle-lesson references. New character bases use Tripo; proposed moves require videos before implementation and actual gameplay footage afterward.
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
