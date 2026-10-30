# Combat and performance delivery — 24 October 2026

Delivery branch: [`feat/combat-balance-performance-update`](https://github.com/Gumssss/Wankai/tree/feat/combat-balance-performance-update), based on merged main `018c39b`. The creator requested a GitHub push; this checkpoint does not merge main or create an installer. Existing 23–24 October implementation work is being published, with fresh verification and handoff corrections. The earlier original authoring checkout and loose suffix-2 duplicate files are outside this delivery.

## Current behavior

- Four characters and nine valid loadouts remain. Character-specific maximum HP: Basic 100, Beagle 80, Yellow 110, Cat 150. Cat paws are **1.3× original linear dimensions**, superseding the historical 2× trial. The body and low hover are unchanged; visible geometry, contacts, fallback, trails and camera margins share one transform.
- Long ears retain their complete accepted appearance. Only the radius-inset distal 1.8–3.6 range is solid for damage, blocks, floor and rim response. F/Right Shift needs 40 stamina, spends 16/s for at most five seconds, shares fatigue and blocks recovery through deployment/retraction. Exhaustion or expiry ends the skill. Flips remain inactive.
- Shared ordinary stamina remains 200: swing 20/s, turn 10/s, recovery 24/s after 0.6 seconds; fatigue starts below 60 with 40% minimum power. Hammer heads use 1.45 damage scaling. Supported hover receives stronger horizontal damping.
- The common chronological contact resolver batches simultaneous incoming damage, resolves independent meaningful contact patches and resweeps changed motion. Per-part damage episodes prevent duplicate/delayed hits; forces, resource spending and skill clocks still advance once per fixed tick. Clashes add outward recoil along the pair's separation axis. Upright 3D body capsules govern aerial collisions, landing and boundaries.
- Competitive rounds last at most 120 simulation seconds. Pressure starts at 45 seconds, contracts toward 32% radius and causes 10%-maximum-HP/s loss after a two-second outside warning. Timeout compares remaining HP fractions. Practice/solo are untimed and pressure-free; practice shares duel arena geometry/spawns and retains passive-dummy health rules.
- Character/player names and attacker-owned colored damage/readouts remain visible, including trades and narrow screens. The shared tactical camera centers/pulls back, split fits nearby opponents and shows distant direction indicators, and all framing uses full visual equipment bounds.
- Main-canvas rendering is capped at 1920×1080 total pixels and DPR 1.5, with resize/density tracking. Contact preparation is deferred until broad-phase overlap. The lite arena uses 46,280 triangles and 1024² textures; model plus floor download is about 1.74 MB instead of 4.62 MB. Exact floor geometry and protected borders are preserved; the previous runtime assets are archived.

## Code entry points

`src/combat-settings.js` owns shared numerical rules, `src/combat-contacts.js` owns chronological weapon contacts, and `src/round-rules.js` owns competitive outcomes. `src/physics.js` remains the fixed-step world. `src/combat-camera.js`, `src/free-camera.js`, `src/render-resolution.js` and `src/player-identity.js` provide framing, rendering limits and display identity. Catalogues and `loadouts.js` retain character/weapon separation. No dependency changes are required.

Run `npm ci`, `npm test`, `npm run build`, then `npm start` from a clean checkout. To play this branch before merging, fetch origin and check out its delivery branch in a clean checkout; preserve unrelated local changes. Source delivery is separate from merging and packaging.

## Verification and motion evidence

Fresh publication checks: **234 passing tests, zero failures**, production build passing with its existing large-chunk advisory, and `git diff --check` passing. The suite includes every ordered loadout pairing at full/low/empty stamina with reversed slots, current model/contact geometry, chronological solver regressions, resource/health/round lifecycle and cameras. [Source hashes, validation and logs](../../assets/concepts/publish-2026-10-24/verification.json) identify this checkpoint.

A fresh real-browser smoke check passed intro/menu entry, independent Beagle/Cat preparation with actual loaded models, shared tactical combat, both players' combined inputs, 80/150 maximum health, paid rotor activation and a frozen pause clock. It recorded no page/console errors; existing Three.Clock deprecation warnings remain. [Shared-match screenshot](../../assets/concepts/publish-2026-10-24/shared-match.png). The temporary test browser and server are closed after verification.

- [Current Cat 1.3× comparison and actual-game videos](../../assets/concepts/cat-paws-v3/README.md): complete input matrix, support, release/reversal, contacts and same-event slow replays.
- [Historical Beagle/Cat comparison and actual-game videos](../../assets/concepts/beagle-cat-balance-v2/README.md): preserved Beagle/resource/ownership evidence; the Cat is 2× in this earlier recording, superseded by the current Cat packet.
- [Arena-lite method, before/after screenshots and synthetic raycast benchmark](../../assets/concepts/colosseum/lite-v01/verification.json).
- [Earlier render/contact optimization measurements](../performance-trial-2026-10-23.json). Its “meshes unchanged” and local-publishing notes describe that earlier pass; the lite arena and this branch publication supersede them.

The publication task reuses these existing recordings and does not claim a new motion review. Historical comparison generators require their local baseline/staged snapshots; completed films and real-game fixture pages are checked in. Native Electron gameplay was not reverified. Automated fixtures and synthetic CPU timings do not establish human matchup fairness, measured browser FPS, total RAM use or elimination of every freeze. Counterbalanced human matches and the conditional defense/hammer experiments remain open.
