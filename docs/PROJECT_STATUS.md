# Project review — 18 October 2026

The current state is a playable local two-player prototype, ready for focused playtesting. It has a complete weapon-selection-to-match flow, three distinct weapons and a paired beagle/twin-ear loadout. Automated checks cover the implemented rules; control feel and weapon balance still require hands-on acceptance.

This is the 18 October source checkpoint for default `main`, requested by the creator. The half-speed/contact trial is included and still needs balance playtesting. It halves both weapon-axis limits, adds measured solid blade/guard coverage, and samples contacts between physics poses while preserving model size/reach and the ground timestep. See [download and update instructions](../README.md) and the dated [changelog](../CHANGELOG.md).

## Implemented

| Area | Current behavior |
| --- | --- |
| Movement and combat | Weapons drive the upright fighter through ground contact. W / S and the arrow equivalents apply continuous front/back swing torque; A / D and left/right steer weapon heading. Hits, blocks, support, knockback, health, pause, and rematch are implemented. |
| Weapon roster | Quick short sword, long-reach curved polearm, slower iron hammer, and the approved beagle/twin-ear character loadout. The hammer has broad solid-head contacts and 30% stronger metal-head damage. |
| Armory | Actual 3D previews, descriptions, strengths, and tradeoffs. Both players choose independently before matches and may choose the same weapon; rematches keep their choices. |
| Split-screen duel | One simulation rendered through two independent cameras. Approved rear framing starts 15° off each fighter's heading, with 0.35-radian orbit pitch and 10.5-unit distance. The far rim is visible from the starting positions. |
| Camera controls | P1 uses Q / E; P2 uses period / slash (the ? key, without Shift). The corrected turn directions are applied. Releasing keeps the selected angle; rematches restore the approved defaults. |
| Arena and modes | Split-screen and solo use a 19.35-unit arena radius, three times the original. Fixed-camera duel and dummy practice retain the original arena. Solo retains mouse orbit and wheel zoom. |
| Asset import | Local GLBs with measured native axes and grip origins. Continuous yaw/pitch drives visuals and off-axis hammer collision shapes. The hammer was reduced from a 13.2 MB export to a 2.8 MB game copy with a 1K texture. |

## Latest combat prototype

The requested stamina system, separate HUD bars, reduced horizontal-turn damage, and their documentation are included in the source checkpoint. Nine combat regression checks pass alongside the existing checks. Body hits have hit pause and a damage readout. The contact trial adds backward recoil for both fighters on a clear weapon clash, opposite each fighter's current heading, alongside physical deflection, sound, and particles. Separation/cooldown prevents repeated recoil from resting contact. Final pacing and hands-on acceptance remain open.

The current implementation starts each fighter with 100 stamina, drains 20 points per second for swing input and 8 for horizontal turning, and recovers 30 per second after 0.5 seconds without weapon input. Below 25 stamina, powered control weakens toward 40% at zero while retaining reversal braking. Pure turning damage starts at 50% of an equivalent vertical strike, with mixed-contact damage blended by closing motion. These are initial tuning choices under active verification, not accepted final balance.

## Verified for this checkpoint

- `npm test`: **85 passed, 0 failed** on 18 October 2026, also verified in an isolated export of the staged source and assets. Coverage includes all sixteen loadout pairings, support, speed limits, guard/blade/ear contacts, between-pose crossings, near misses, heading wrap, independent selection and skeletons, rematches, cameras, arena bounds, stamina/fatigue, directional damage, actual beagle GLB/physics alignment and recoil. The half-speed/recoil trial previously passed 77 checks; the earlier published checkpoint passed 63.
- `npm run build`: successful. The renderer JavaScript bundle is approximately 1.24 MB before gzip; Vite still reports its existing bundle-size warning.
- `git diff --check`: successful.
- Previous in-game checks verified armory selections, the actual hammer model, camera key direction, and the approved rear view. See [armory](screenshots/armory.jpg) and [applied rear cameras](screenshots/approved-rear-duel.jpg). Those checks are evidence of implementation, not a new two-person playtest on this review date.
- Before this trial, the documentation-only audit on 17 October checked all 11 repository Markdown documents against source controls, mode settings, weapon profiles, asset scripts, GLB sizes/mesh counts, and 73 local links. Historical screenshots predate some current HUD/features. The half-speed/contact changes are a later local gameplay trial, not new playtest acceptance.

## Remaining work, in recommended order

1. **Finish the beagle body flips requested in the earlier studies.** Add physically coupled body pitch and ear hinge reactions, rotated contacts/hurt shapes and camera coverage. Verify backward and forward support, release/reversal and simultaneous A/D. The current merge preserves the working upright checkpoint; it does not claim the flip design is complete.
2. **Accept the sword support behavior.** The creator's original direction-change complaint is still open. A historical fixed-target discontinuity was reproduced, and continuous controls plus visual-axis regressions cover the identified causes. Reproduce the reported key sequence with a fixed camera, compare the polearm, and obtain hands-on acceptance before calling the issue solved. See [sword trial](SWORD_TRIAL.md).
3. **Playtest the half-speed/contact/recoil trial.** Sword, polearm, and hammer cap each axis at 6.1 / 4.25 / 3.4 rad/s. Acceleration, braking, damage, and stamina settings remain. Intermediate sampling and measured proxies catch regression crossings and preserve nearby misses. Clear clashes now make both fighters retreat opposite their own headings; judge recoil strength, movement, impact strength, block readability, and performance in matches. Sampling and proxies remain approximate. The 30% speed option, extra block allowance, and clash pause/readout remain proposals.
4. **Run a two-person control and camera playtest.** Observe whether movement, aiming, and hits are deliberate without live instruction. Assess stamina recovery, exhausted movement, horizontal/vertical damage, and whether each player can find the opponent while turning the camera near the larger arena's edge. The framing guard protects the player's own fighter; it does not guarantee the opponent or whole weapon stays visible.
5. **Measure performance and tune the existing weapons.** Start with sword texture memory and repeated armory/mode switches, then compare sword, polearm, and hammer matches. The sword game asset remains about 16.8 MB with three 4K textures (roughly 256 MiB decoded RGBA including mipmaps). The hammer is already substantially lighter. File sizes and memory estimates do not establish a measured frame rate or a memory leak.
6. **Keep the fourth precision weapon deferred.** Its accepted direction is slower horizontal steering with quick response and stronger release braking. The proposed staff appearance, remaining balance choices, and its inspected 5-credit export are not approved. No staff export has been bought or downloaded. Resume through [precision weapon side project](PRECISION_WEAPON.md) when requested.

The renderer, fixed-step physics, match session, weapon metadata, and asset preparation are separate modules, so the next work can stay focused on acceptance, tuning, and performance. There is no multiplayer networking, AI opponent, guided tutorial, or installer in this checkpoint.

## Repository and asset notes

The creator requested a checkpoint in [Gumssss/Wankai](https://github.com/Gumssss/Wankai) on 17 October 2026. It was first pushed to the existing `solo-camera-mode` branch, then merged into the default `main` branch at the creator's request. GitHub confirmed write access and no rule requiring another review. Both branches contained checkpoint `2ca081a` after that merge; subsequent documentation updates continue on `main`. This supersedes the earlier local-only instruction. No installer or packaged release has been published.

The public Tripo sword and hammer models' redistribution terms remain unverified. The checkpoint request does not resolve that open asset-permission item. The unused `index 2.html` is retained as an existing legacy prototype file; the active Vite entry is `index.html`. Dependencies and generated build output stay excluded by `.gitignore`.

## Beagle gameplay checkpoint — 18 October 2026

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
push and merge on 18 October. **The previously requested backflip and front flip
are still missing:** S currently rotates the ears backward with the body upright.
Next add body-pitch dynamics, hinge reactions and matching rotated contact/hurt
shapes, preserving ear momentum and simultaneous A/D. A complete flip depends
on support and angular momentum. Coverage/inertia balance and a two-person
keyboard playtest also remain open; no packaged release is included.

Validation for this integration: **85 tests passed, 0 failed** on 18 October
2026; production build and `git diff --check` passed. The existing Vite bundle
size warning remains. Selected screenshots are in `docs/screenshots/beagle-*.png`; tracked rig/contact
verification is in `assets/concepts/beagle/tripo-v05/verification.json`. Fresh
diagnostic output remains under ignored `output/`.
