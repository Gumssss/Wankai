# Orange tabby gameplay v01

20 October 2026. The creator approved the actual-model complete movement video v07 and requested implementation. This local integration uses the selected Tripo source, prepared asset v02 and accepted physical motion v06. Playable feel and balance remain a separate review; no push, merge or release occurred.

## Play and controls

Open the [live game](http://127.0.0.1:5173/) and enter a mode or the character/weapon menu. The full-window preparation stage places P1 left and P2 right, with character/weapon choices above each player's rotatable actual-model preview. Choose **橘猫 → 猫爪** for either or both players, mark each visible player Ready, then use the shared Start or Save action. Ready alone does not commit. Editing one player resets only that player's readiness; Back or Escape discards uncommitted drafts. Solo configures P1 only; practice also configures its passive P2 dummy. Narrow screens stack complete player panels with vertical scrolling.

There are **eight valid loadouts and 64 ordered two-player pairings**. Basic fighter and beagle remain available; the cat supports its approved giant paws. Unreviewed common-weapon cat combinations are not exposed. See the [current preparation screen and verification](../../selection-concepts/v04-preparation-stage/verification.json).

| Action | P1 | P2 |
| --- | --- | --- |
| Continuous paired paw swing | W / S | Up / Down |
| Common left/right heading | A / D | Left / Right |
| Both axes together | W+A, W+D, S+A, S+D | Corresponding arrow combinations |
| Camera in split duel | Q / E | Period / Slash |

The seated body remains upright. S/Down paw-floor contact lifts it into the air. Ordinary rest hover targets 0.35 units above the floor using the declared bounded spring/damper; extra support rise comes from the physical paw contacts. Release preserves momentum and gravity brings the cat back toward rest. The paw pair uses one shared 200 stamina budget and the existing damage, repeat-hit and clash/recoil rules. There is no cat F/Right Shift ability.

## Runtime implementation

- `src/orange-tabby-profile.js` contains the exact 48 fitted paw spheres, body hurt shapes, low pivots and accepted finite motor/steering/hover parameters.
- `src/physics.js` uses the measured paw transform and analytical pitch/yaw point velocities. The existing 180 Hz ground/combat solver owns travel, launch, damage and recoil. No authored body path is used.
- `src/orange-tabby-model.js` clones rigid controls and materials per player. The arena root owns translation and heading once, the model host offsets by −0.59, and paw controls rotate Z by pi/2 − theta. No baked animation competes with physical controls.
- The catalogues/resolver/picker expose the matching character and equipment. The real asset is hidden while loading; a matching physical fallback is shown only after failure. Preview retry and resource disposal retain the selected IDs.
- `scene.js` draws the actual textured model, independent paw trails and fitted support cues. `free-camera.js` includes the cat body and dynamic paw envelope, allowing the known 0.14-unit cosmetic contact undercoverage when framing.
- Existing GameSession input, pause/focus, rematch/reset, modes and HUD paths are reused. Reset restores neutral paw phase, zero velocities, low rest hover, shared resources and cleared input/skill state. Practice preserves a cat dummy's neutral paw pose.

## Accepted source and archived evidence

The runtime asset `public/models/orange-tabby-prepared-v02.glb` is byte-identical to the approved prepared export: SHA256 `3b3893335848deb1d65280e70eabad94005f4c532cd42f7720f92008dbf6cc00`, 25,000 triangles, three meshes and one original 2K atlas/material. The original Tripo download and packed Blender source remain preserved; there is no new generation or service charge.

The creator prefers reviewing the **live game after implementation**. Open the actual game for current playable review. The [approved before video](../../previews/orange-tabby/review-v07.html) and [recorded actual-game evidence](../../previews/orange-tabby/review-gameplay-v01.html) remain available as dated reproducible records; they do not replace current hands-on review.

Actual-game capture mounts App, GameSession, ArenaPhysics and ArenaView. It injects declared key sequences and resets to labeled fixtures; it does not substitute the isolated preview adapter or replay body poses. Compact recording overlays show held keys/resources, contact rings, travel and body height. A fixed-height review camera makes lift readable; ordinary solo and split cameras are checked separately. Capture timecodes and source hashes are recorded in `assets/concepts/orange-tabby/gameplay-v01/`.

## Verification and limits

`tests/orange-tabby-gameplay.test.js` compares every saved 60 Hz sample of all 13 approved ordinary/recovery scenarios against the actual production solver at 180 Hz, including positions, velocities, paw angles, stamina and support flags. S reproduces the approved 2.20087-unit peak base height from 0.35 rest. Other checks cover real sword hits/clashes/misses, derivative agreement, both players' keys, opposite cancellation, ignored skill input and mode/pause/reset lifecycle.

`tests/orange-tabby-model.test.js` checks exact export bytes, independent materials/controls, actual paw vertices through extreme poses, upright body, matching fallback, scene cues and camera bounds. At the gameplay-v01 integration checkpoint, **132/132 regression tests passed**, the production build passed, **73 live-capture checks passed**, and all three encoded media files fully decoded at 1600×900/30 fps. Actual picker flow reaches orange tabby + cat paws and starts a solo round; the actual-game recording mounts and loads the selected textured model for every chapter. The primary video is 63.13 seconds, with all eight directions/combinations first, recovery/combat afterward and an identical recorded S contact replay last. The fixed-height gameplay review camera is declared. An independent audit found old-fighter state/events unchanged over 14 scenarios/5,040 steps. Solver-only stress timings were median 1.36–2.28 ms/step and p95 2.81–5.13 ms with occasional spikes; these exclude rendering and do not establish target FPS. Reports and logs are saved beside the dated gameplay evidence.

Subsequent UI-only passes verified the two-player layout with 14 focused tests, then the full-window preparation stage with **17 focused draft/resize/camera tests** and the production build. Browser checks covered Ready/Start, Back/Escape and focus return, actual arena restoration, both loaded previews and desktop/phone bounds. These later passes **did not rerun the full historical physics suite**. Latest scope and evidence: [preparation-stage verification](../../selection-concepts/v04-preparation-stage/verification.json).

Contacts remain interior rounded approximations with about 0.14 units of cosmetic undercoverage; ears/tail are cosmetic. The existing bundle-size advisory, selection loading optimization and hands-on balance work remain. Technical evidence does not imply human playable acceptance or a released installer.

Run `npm test` and `npm run build` for a new full-source check. `node scripts/preview/orange-tabby-gameplay-v01.mjs verify` validates the archived capture against its pinned sources; a source-hash difference after later work requires explanation and does not create new gameplay evidence. Rebuild the final video from the saved original capture with `python3 scripts/preview/finish-orange-tabby-gameplay-v01.py`. Capture source hashes and chapter inputs remain beside the original WebM; the normal recording is preserved as its own file.
