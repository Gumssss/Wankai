# Orange tabby: current playable handoff

**Latest paw-size revision — 23 October 2026:** Cat paws are now **1.3× the original width, height and depth**, replacing the earlier 2× trial. Cat remains 150 HP. The same shared transform updates visible meshes, fitted contacts, fallback, trails and camera margins. Neutral floor/body clearances remain 0.02/0.08 units; body size, hover height and control/resource/damage tuning remain unchanged. The revised exact-model, movement, collision and swapped-slot matchup checks pass (49 focused tests); production build passes. Evidence is retained in `output/cat-paws-v3/`.


**Earlier 2× trial — 23 October 2026:** Cat has 150 HP. Both paw dimensions are doubled about their own measured neutral centers, then moved upward/outward beside the unchanged body for 0.02 floor/0.08 body clearance. Visible models, contacts, fallback, trails, cues and cameras share that geometry. The shared controller/resource/skill/damage rules remain; larger leverage intentionally changes support timing and lift. The complete 96-second pre-integration comparison and actual-game evidence are retained in `output/beagle-cat-balance-v2/`. The live game is [port 5187](http://127.0.0.1:5187/). All 224 tests and the production build pass. The roster now has nine loadouts/81 ordered pairings including Yellow Blob. Earlier v01 measurements and recordings below describe the historical 20 October checkpoint; current details are in [combat rules](../../CONTROL_SYSTEM.md#beaglecat-balance-and-damage-ownership--23-october-2026).


Updated 20 October 2026. **Orange tabby + cat paws is playable locally.** The user approved complete movement video v07 and requested integration. Runtime uses the unchanged prepared-v02 Tripo export and accepted v06 controller. No new generation, paid retry, extra ability, push, merge or release is implied.

## Open and prepare a match

Open the [live game](http://127.0.0.1:5173/) and choose a play mode or the character/weapon menu. Preparation fills the window: P1 is left and P2 right, with each player's character and weapon choices above their own rotatable actual-model preview. Choose **橘猫 → 猫爪** for either or both players, mark the visible players Ready, then use the shared Start or Save action. Ready alone does not commit. Editing one player's choice clears only that player's readiness. Back or Escape cancels uncommitted drafts and returns focus to the launching menu button. Solo configures P1; practice also configures its passive P2 dummy. Narrow screens stack the complete P1/P2 panels with vertical scrolling.

The current roster has **eight valid loadouts and 64 ordered two-player pairings**: basic fighter with sword/polearm/hammer, beagle with those three or long ears, and orange tabby with cat paws. The cat's unreviewed common-weapon combinations remain unavailable.

The creator prefers reviewing the live game after implementation. Open the actual game for the next playable check; keep existing recordings as reproducible historical evidence. New or changed motion still requires the approved complete explanation before integration. See [current gameplay and verification](GAMEPLAY.md), [selection implementation](../../CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md) and [latest preparation verification](../../selection-concepts/v04-preparation-stage/verification.json).

## Accepted model and movement

- Source: original Tripo v01, SHA256 `4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912`.
- Runtime: `public/models/orange-tabby-prepared-v02.glb`, byte-identical to prepared v02, SHA256 `3b3893335848deb1d65280e70eabad94005f4c532cd42f7720f92008dbf6cc00`; 25,000 triangles, three meshes, one original 2K atlas/material. Editable sources, measurements and fitted contacts remain in `assets/concepts/orange-tabby/prepared-v02/`.
- Body stays seated and upright. W/S drives both detached paws continuously; A/D steers the common heading. W+A, W+D, S+A and S+D combine both axes; opposite keys cancel their axis. P2 uses the corresponding arrow keys.
- Rest hover targets 0.35 using declared bounded lift. Additional travel and rise come from paw-floor reactions. The accepted S timeline reaches base height 2.20087 after support, with no pre-contact rise or authored launch. Release retains momentum, followed by descent and recovery.
- The pair shares the ordinary 200 stamina, hit gates, damage and clash/recoil rules. F/Right Shift does not activate a cat ability.
- CTRL_Root uses position Y = solver p.y − 0.59 and yaw −phi. Both paw pivots are at body-base height **0**, with game Z rotation pi/2 − theta and rest theta pi/2. Do not copy prepared-v01's 0.8-high pivots or primitive-study offsets.
- Forty-eight interior paw spheres and conservative torso/head hurt shapes use the same transforms and velocities as the visible mesh. Cosmetic surface undercoverage is about 0.14; ears/tail are cosmetic. Independent P1/P2 model/control/material instances are retained.

## Verification and next work

The integration checkpoint passed 132/132 tests, the build and 73 capture checks; its actual-game recordings and exact source hashes are preserved under `assets/concepts/orange-tabby/gameplay-v01/`. Later selection work passed 14 focused checks, then the full-window preparation pass passed 17 focused draft/resize/camera checks and the build. **Those UI passes did not rerun the full historical physics suite.** See GAMEPLAY.md for the dated evidence and limits.

Continue hands-on review of control feel, recovery, camera comfort, both-player combinations and balance in the live game. Asset loading latency, bundle size and sustained two-player rendering performance remain open. Preserve the accepted identity/controller and unrelated work; reopen only the affected decision if play reveals a problem. Do not restart Tripo or seek the already-given v07 approval again.

Historical motion/model packets and rebuild recipes remain in [MODEL](MODEL.md), [MOTION](MOTION.md) and [HISTORY](HISTORY.md). They document their original review stages rather than the current availability.
