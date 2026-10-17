# Project review — 17 October 2026

The current state is a playable local two-player prototype, ready for focused playtesting. It has a complete weapon-selection-to-match flow and three distinct weapon profiles. Automated checks cover the implemented rules; control feel and weapon balance still require hands-on acceptance.

The current source is available from the default `main` branch. See [download and update instructions](../README.md) and the dated [changelog](../CHANGELOG.md).

## Implemented

| Area | Current behavior |
| --- | --- |
| Movement and combat | Weapons drive the upright fighter through ground contact. W / S and the arrow equivalents apply continuous front/back swing torque; A / D and left/right steer weapon heading. Hits, blocks, support, knockback, health, pause, and rematch are implemented. |
| Weapon roster | Quick short sword, long-reach curved polearm, and slower iron hammer. The hammer has broad solid-head contacts and 30% stronger metal-head damage. |
| Armory | Actual 3D previews, descriptions, strengths, and tradeoffs. Both players choose independently before matches and may choose the same weapon; rematches keep their choices. |
| Split-screen duel | One simulation rendered through two independent cameras. Approved rear framing starts 15° off each fighter's heading, with 0.35-radian orbit pitch and 10.5-unit distance. The far rim is visible from the starting positions. |
| Camera controls | P1 uses Q / E; P2 uses period / slash (the ? key, without Shift). The corrected turn directions are applied. Releasing keeps the selected angle; rematches restore the approved defaults. |
| Arena and modes | Split-screen and solo use a 19.35-unit arena radius, three times the original. Fixed-camera duel and dummy practice retain the original arena. Solo retains mouse orbit and wheel zoom. |
| Asset import | Local GLBs with measured native axes and grip origins. Continuous yaw/pitch drives visuals and off-axis hammer collision shapes. The hammer was reduced from a 13.2 MB export to a 2.8 MB game copy with a 1K texture. |

## Latest combat prototype

The requested stamina system, separate HUD bars, reduced horizontal-turn damage, and their documentation are included in the source checkpoint. Nine combat regression checks pass alongside the existing checks. Final pacing and hands-on acceptance remain open; implementation and automated checks do not establish acceptance of the new combat feel.

The current implementation starts each fighter with 100 stamina, drains 20 points per second for swing input and 8 for horizontal turning, and recovers 30 per second after 0.5 seconds without weapon input. Below 25 stamina, powered control weakens toward 40% at zero while retaining reversal braking. Pure turning damage starts at 50% of an equivalent vertical strike, with mixed-contact damage blended by closing motion. These are initial tuning choices under active verification, not accepted final balance.

## Verified for this checkpoint

- `npm test`: **63 passed, 0 failed**, verified in an isolated export of the staged snapshot on 17 October 2026. Coverage includes all nine weapon pairings, continuous rotation through support, hammer head contacts and damage, independent selection, rematches, camera input, framing under movement, the enlarged arena boundary, stamina depletion/recovery and fatigue, and direction-weighted impact damage.
- `npm run build`: successful. The renderer JavaScript bundle is approximately 1.24 MB before gzip; Vite still reports its existing bundle-size warning.
- `git diff --check`: successful.
- Previous in-game checks verified armory selections, the actual hammer model, camera key direction, and the approved rear view. See [armory](screenshots/armory.jpg) and [applied rear cameras](screenshots/approved-rear-duel.jpg). Those checks are evidence of implementation, not a new two-person playtest on this review date.

## Remaining work, in recommended order

1. **Accept the sword support behavior.** The creator's original direction-change complaint is still open. A historical fixed-target discontinuity was reproduced, and continuous controls plus visual-axis regressions cover the identified causes. Reproduce the reported key sequence with a fixed camera, compare the polearm, and obtain hands-on acceptance before calling the issue solved. See [sword trial](SWORD_TRIAL.md).
2. **Investigate missed weapon clashes.** The 17 October diagnostic review reported a controlled case where fast weapon tips cross between the 180 Hz overlap checks; smaller collision steps catch the contact. Establish regression coverage and assess swept contacts or collision substeps. A 30% speed cap and clearer clash pause/readout were discussed, but are not implemented. Current speed settings remain unchanged.
3. **Run a two-person control and camera playtest.** Observe whether movement, aiming, and hits are deliberate without live instruction. Assess stamina recovery, exhausted movement, horizontal/vertical damage, and whether each player can find the opponent while turning the camera near the larger arena's edge. The framing guard protects the player's own fighter; it does not guarantee the opponent or whole weapon stays visible.
4. **Measure performance and tune the existing weapons.** Start with sword texture memory and repeated armory/mode switches, then compare sword, polearm, and hammer matches. The sword game asset remains about 16.8 MB with three 4K textures (roughly 256 MiB decoded RGBA including mipmaps). The hammer is already substantially lighter. File sizes and memory estimates do not establish a measured frame rate or a memory leak.
5. **Keep the fourth precision weapon deferred.** Its accepted direction is slower horizontal steering with quick response and stronger release braking. The proposed staff appearance, remaining balance choices, and its inspected 5-credit export are not approved. No staff export has been bought or downloaded. Resume through [precision weapon side project](PRECISION_WEAPON.md) when requested.

The renderer, fixed-step physics, match session, weapon metadata, and asset preparation are separate modules, so the next work can stay focused on acceptance, tuning, and performance. There is no multiplayer networking, AI opponent, guided tutorial, or installer in this checkpoint.

## Repository and asset notes

The creator requested a checkpoint in [Gumssss/Wankai](https://github.com/Gumssss/Wankai) on 17 October 2026. It was first pushed to the existing `solo-camera-mode` branch, then merged into the default `main` branch at the creator's request. GitHub confirmed write access and no rule requiring another review. Both branches contained checkpoint `2ca081a` after that merge; subsequent documentation updates continue on `main`. This supersedes the earlier local-only instruction. No installer or packaged release has been published.

The public Tripo sword and hammer models' redistribution terms remain unverified. The checkpoint request does not resolve that open asset-permission item. The unused `index 2.html` is retained as an existing legacy prototype file; the active Vite entry is `index.html`. Dependencies and generated build output stay excluded by `.gitignore`.
