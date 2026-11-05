# Beagle and orange cat restored — 2 November 2026

Local implementation on `feat/restore-beagle-orange-cat`, based on the downloaded online/AI game at `227c07a`. This restores the accepted characters rather than replacing the newer game. 奶蛙, 火柴人, 胆子肥嘟嘟 and 开心小猫 remain, with their current models/controllers/skills. No Tripo generation, Blender reshaping, GitHub push or merge is part of this task.

## Selected source and behavior

The selected animal source is the published combat/performance checkpoint `ca12b8ea93fa50dec0012211956dde7095033841`. It supersedes the earlier fluffy ears, flip controller and 2× paw trial. The old game is separately restorable from GitHub branch `backup/pre-update-2026-10-30-201cbfc` at `17cafc2`.

| Selection | Restored behavior |
| --- | --- |
| Beagle + long ears | Exact smooth v05 Tripo/Blender rig; parallel W/S strokes and slower A/D steering, upright body following the anatomical weapon heading. Twelve radius-inset distal ear capsules in local range 1.8–3.6 provide hits/blocks/floor/rim/obstacle support. All eighteen complete-ear visual capsules remain for fallback and camera fitting. No flips. |
| Beagle + common weapon | Exact compact v05 model, natural cosmetic ears and the current ordinary floating-weapon controller. Body follows the mouse view as other current fighters do. Shared visible/physical offsets preserve the measured sword/polearm/hammer placement; axe/mace/pan use a conservative 1.6-unit offset. F does not activate rotor. |
| Orange cat + cat paws | Exact seated prepared-v02 Tripo/Blender export; paired detached paws retain the selected 1.3× linear dimensions, 0.02 floor and 0.08 body clearance. W/S rotates both paws; A/D turns body/paws together. Rest hover is 0.35; actual paw-floor contacts can push the body higher. No additional F skill. This is a separate character/weapon from 开心小猫 / 开心猫爪. |

Maximum health is Beagle 80, orange cat 150, existing fighters 100. UI, reset and network clients retain those maxima. Ordinary stamina uses the **current game's** 200-point bar, swing 12/s, turn 5/s and recovery 60/s after 0.5 seconds; paired appendages share a single charge. Anatomical motor fatigue/steering retain the saved animal controller. The earlier global chronological-contact, pressure-ring, arena and balance trial is not imported into this newer solver.

Beagle F is available only with long ears: activation requires 40 stamina; duration is at most five seconds including spin-up; use costs 16/s. There is no additional normal-input charge during the active skill. Deployment/spinning/retraction block recovery. Whole body and ears rotate together, with controlled spread/lag and powered low hover. A/D can reverse; W/S pauses during deployment/retraction. Releasing F does not cancel it. Exhaustion or expiry removes lift and retracts the ears; a new key edge after retraction may activate again. Pause freezes simulation time and rematch clears all pose/resource state. Other loadouts ignore F for this skill.

## Runtime responsibilities

- `src/beagle-profile.js`, `beagle-model.js`, `beagle-skill.js`, `orange-tabby-profile.js`, `orange-tabby-model.js` and `character-attachments.js` recover the selected measurements, transforms and instance isolation. `animal-settings.js` contains only the restored rotor/fatigue constants.
- `src/models/restored-animals.js` caches the original GLTF scenes, preloads all three exports before the arena appears and creates independent skeleton/material instances. Fallbacks are used after load failure, with matching contact frames. Node checks use the same GLTF geometry/skeletons with image decoding omitted. Cached geometry/textures survive preview disposal; individual skeleton resources/materials are released.
- Physics dispatches anatomical points through their actual head/paw transforms, including contact derivatives, anchors, spread/lag sweeps and obstacle samples. Both sides share normal hit gates and resource charging. Common weapons retain current behavior. Body faces the weapon only for the anatomical loadouts, so a rigid imported body is never tilted to imitate a flip.
- Current preparation, AI random choices, player/weapon compatibility, HUD, portraits, pause, rematch, victory and all three arenas remain. The character-only Beagle preview uses normal ears until long ears are selected. Cat portraits omit the weapon paws so the actual cat is readable; the combined setup preview includes them.
- Network **protocol 4** sends compact, quantized ear pose arrays only for long-ear Beagle. Authoritative simulation retains full precision; guests interpolate visual spread/lag. Ordinary snapshots retain their packet budget. Both machines must use this protocol; Steam itself has not been live-tested for this restoration.

## Evidence and review

The pre-integration motion contract reuses the matching approved animal footage from the saved design checkpoints. Actual new-game footage, full normal-input matrix, release/reversal, paw support, hover/expiry/landing, real hits/clashes and common-weapon appearances are recorded in [the restoration evidence folder](../assets/concepts/restored-animals-v01/). Chapters use labelled independent fixtures and normal controls, with same-event slow replays for support and contact/expiry. They are regression demonstrations rather than human matchup-balance evidence.

To reproduce the actual-game capture, start Vite on 127.0.0.1:5195, run `node tools/restored-animals-receiver.mjs`, and open `/docs/previews/restored-animals-v01/index.html`. Its recorder mounts the shipping App/GameSession/ArenaView; it does not animate a substitute character or apply kinematic locomotion. The local receiver saves only its video and JSON report. Stop it after capture.

Current verification and source hashes are recorded in [verification.json](../assets/concepts/restored-animals-v01/verification.json). Asset hashes are checked against `ca12b8e`. Real exported ear skinning/paw vertices are compared against contact frames through extremes; instance disposal, complete input combinations, paid rotor, pause/reset, body facing, camera fitting, host/guest replication, packet size and AI are covered by tests. Browser evidence verifies the current picker and actual models. No new visual redesign or final human balance acceptance is claimed.

Obsolete untracked tests that had reappeared from the old game were moved intact to `.local/restoration-2026-11-02/legacy-tests/`; tracked current tests remain and are updated where their old four-character/floating-only assumptions no longer apply. Other unrelated local source/assets and icon variants are preserved. Only the explicitly restored files and new integration files belong to this change.

## GitHub update — 5 November 2026

Merged `origin/feat/online-ai-arena` at `8d1ab77` into this local restoration branch. The incoming setup simplification, expanded PF font, renamed 外卖盒, stronger 奶蛙 laugh and 10-HP 开心小猫 heal are integrated with both restored animals. The setup skill card combines the incoming layout with the Beagle long-ear requirement and stamina label. The pre-update restoration is saved at local checkpoint `fde9161`, also named `backup/restored-animals-before-update-2026-11-05`.

The combined version passes all 169 tests and the production build. Browser checks cover the six-character picker, updated skill cards, orange-cat controls, ordinary-weapon hover gating, Beagle F+D hover, pause and all three original animal GLBs. Validation logs are stored locally under `.local/update-2026-11-05/`.
