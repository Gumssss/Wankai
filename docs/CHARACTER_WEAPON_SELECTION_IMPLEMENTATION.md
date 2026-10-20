# Character and weapon separation: implementation handoff

Updated 20 October 2026. **Delivery branch: `feat/orange-tabby-preparation`; unmerged.** The prior GitHub baseline is merged PR #2, `a591070fff8a64709dd0d775c140988e3d9b4ff1`. This branch contains the selection feature; default `main` does not yet contain it. The latest delivery run passed the complete **143-test suite** and production build. Earlier per-stage results below remain separate dated records.

## Current behavior

The live armory is a dedicated full-window preparation page, following the approved [two-player layout](selection-concepts/v03-dual-player/dual-player-selection-v03.png): P1 on the left and P2 on the right, with character/weapon choices above each player's rotatable actual-model preview. The arena and HUD are hidden while preparing. Back or Escape returns to the menu and discards drafts; keyboard focus enters the preparation heading and returns to the menu trigger. Each player has an independent Ready button, followed by one shared Start action. Editing a choice resets only that player's readiness; reselecting the same choice keeps it. Narrow screens stack each complete player panel in P1/P2 order with vertical scrolling. Basic fighter can equip sword/polearm/hammer; beagle can equip all three plus long ears; orange tabby can equip its giant paws.

The full-window follow-up passed 17 focused draft, resize and camera checks plus the production build. Browser checks covered heading/return focus, Back/Escape cancellation, shared Start, actual arena restoration and desktop/phone bounds. The arena remains mounted to retain its resources; zero/invalid resize dimensions preserve its last valid camera projection while hidden. [Current screenshot](screenshots/preparation-stage-v04.jpg), [verification](selection-concepts/v04-preparation-stage/verification.json).

P1/P2 keep separate drafts and readiness. Changing character retains compatible equipment and clears incompatible equipment. Start/save requires all visible players to be ready and commits both selections atomically. Ready alone does not save or start. Back/Escape discards drafts. Solo configures P1 only and preserves the hidden P2 selection; practice retains equipment configuration for its idle dummy. Rematch preserves committed loadouts. Defaults remain basic fighter + sword versus basic fighter + polearm, with red/blue player identity. The roster has eight valid loadouts and 64 ordered two-player pairings.

The layout update changes no models, movement, contacts, skills or combat tuning. Its scoped verification passed 14 tests (draft/readiness state plus the existing loadout/session checks), the production build and browser start/save/cancel/solo/practice checks. Both actual previews loaded; changing P1 left P2 ready; Start produced the selected beagle+sword versus cat+paws HUD. At a 1280×800 CSS viewport both panels and the footer fit without scrolling; at 390×844 the panels stack without horizontal overflow. Temporary viewport overrides were reset. See the [live screenshot](screenshots/dual-player-selection-v03.jpg) and [verification record](selection-concepts/v03-dual-player/verification.json). Earlier verification below describes its dated checkpoint.

The same beagle retains its broad body hurt shapes and boundary checks with every weapon. Ordinary equipment uses the compact, rigid natural-ear model; its ears are cosmetic. Long ears use the accepted rig, eighteen physical ear capsules, ear motors and five-second stamina-free F / Right Shift hover. Ordinary weapons neither activate hover nor retain hidden ear attack contacts. Flips are inactive.

Orange tabby + cat paws is enabled for either or both players. The prepared-v02 asset and accepted v06 controller preserve the seated body, detached giant paws, low rest hover and contact-driven S lift. W/S drives the paired paw swing, A/D steers and all four combinations work; both paws share normal stamina and combat rules. There is no cat F/Right Shift ability. See the [cat integration handoff](characters/orange-tabby/GAMEPLAY.md) for exact asset provenance, fitted contacts and approved motion parity.

## Where to develop

| Module | Responsibility |
| --- | --- |
| `src/character-catalog.js` | Character identity, availability, body dimensions, hurt shapes and compact bounds. |
| `src/weapon-catalog.js` | Equipment identity, availability, owner restriction and player-facing descriptions. |
| `src/loadouts.js` | Validation, defaults, legacy normalization, names, stable keys and appearance/controller resolution. `PLAYABLE_LOADOUTS` enumerates eight valid choices. |
| `src/game-session.js` | Canonical two-slot loadouts, lobby-only atomic `setLoadouts`, derived legacy snapshot fields, input/skill gating and lifecycle. |
| `src/physics.js` | Body versus weapon geometry, character boundary checks, shared offsets and authoritative controls/contacts. One shared simulation still ticks at 180 Hz. |
| `src/character-attachments.js` | Generated compact bounds and measured ordinary-weapon offsets for beagle. |
| `src/Armory.jsx`, `src/armory.css`, `src/selection-icons.jsx`, `src/armory-drafts.js` | Two-player picker, local drafts, independent readiness, shared confirmation and responsive layout. |
| `src/LoadoutPreview.jsx`, `src/model-assets.js` | Combined actual-model preview, normalization, framing, fallback/retry and disposal. |
| `src/ArenaCanvas.jsx`, `src/scene.js` | Independent body/equipment loading and player instances, actual game view and one shared tick. |
| `src/beagle-model.js` | Static compact versus rigged long-ear instances, independent materials/skeletons and matching fallbacks. |
| `src/orange-tabby-profile.js`, `src/orange-tabby-model.js` | Approved cat parameters, fitted body/paw contacts, independent rigid controls/materials and matching fallback. |
| `src/free-camera.js`, `src/App.jsx` | Combined body/weapon framing, preparation/menu navigation, focus/input handling, summaries, HUD and help. |

```js
session.setLoadouts([
  { characterId: 'beagle', weaponId: 'sword' },
  { characterId: 'beagle', weaponId: 'long-ears' },
]); // true only for valid selections while in the lobby
```

Invalid arrays are rejected without partial mutation or notifications. Snapshots expose `loadouts`; `weapon` / `weapons` remain derived compatibility fields. Old `"beagle"` input normalizes to beagle + long ears. Ordinary legacy strings normalize to basic fighter + that weapon; the old `setWeapon` convenience method preserves an already-selected compatible character. No persistent save migration is needed.

Use `isEarLoadout` for paired-ear mechanics and skill checks. Use character metadata for body appearance/hurt/bounds. Do not infer beagle identity from weapon ID. New entries also need resolver, asset and physics support plus compatibility tests; a visible card alone does not make a loadout playable.

## Assets and measured clearance

Both variants reuse the selected Tripo identity: `public/models/beagle-smooth-appearance-v05.glb` for ordinary equipment and `beagle-smooth-ear-duelist-v05.glb` for long ears. No new Tripo job, credit spend, Blender rebuild or full skeleton was needed. Accepted face/body/coat and long-ear rig are unchanged.

`node scripts/preview/measure-character-clearance.mjs` generates `src/character-attachments.js` and `assets/concepts/beagle/common-weapon-clearance-v01.json`. A conservative sphere encloses the actual compact model at the body pivot (radius about 1.21479; clearance margin .035). Separating the entire weapon mesh and capsule profile from that envelope covers continuous pitch/yaw, including triangle interiors. Beagle sword offset becomes 1.34; polearm stays 1.35 and hammer 1.30. Rendering and contacts use the same resolved profile. This is conservative clearance, not exact mesh collision or a balance claim.

Bodies and equipment load independently. Player materials/skeletons are cloned. Fallbacks preserve selected IDs and controllers. Preview failure/retry and repeated open/close disposal were browser-tested. Existing sword texture memory and bundle size remain performance work.

The cat uses `public/models/orange-tabby-prepared-v02.glb`, byte-identical to its approved prepared export. Its 48 fitted paw spheres, low pivots and finite controls are recorded in `src/orange-tabby-profile.js`; ears/tail remain cosmetic and paw contacts have known cosmetic undercoverage. The [cat model/gameplay records](characters/orange-tabby/GAMEPLAY.md) retain the source hashes and limits. No new generation or charge was needed for the selection-page changes.

## Motion evidence

The cat's approved before-integration v07 video, actual-game capture and solver/model checks are linked from its [gameplay handoff](characters/orange-tabby/GAMEPLAY.md). The complete review includes W, S, A, D, all four combinations and recovery/combat, with readable S support lift. These assets remain evidence of the approved controller; the full-window UI follow-up changes no motion. The creator prefers opening the implemented live game instead of being shown a new recording for these follow-up changes.

[Open the 19 October ordinary-weapon beagle gallery](previews/character-weapon-motion/index.html). Sword, polearm and hammer each cover W, S, A, D, W+A, W+D, S+A, S+D, release/reversal, F ignored, vertical/horizontal hits, and block/clash/recoil/recovery. Independent resets are labelled. Ordinary ground contact drives travel; no authored launch or translation is added.

- **Before integration:** actual model and isolated baseline solver replay. Generator: `scripts/preview/beagle-common-weapon-preview.mjs`, pinned to the merged baseline. Body/attachment adaptations are explicit.
- **After integration:** real App/GameSession/ArenaPhysics/ArenaView through `gameplay-recorder.html`. `scripts/preview/character-gameplay-fixtures.mjs` produces reproducible initial contact fixtures and input sequences. Injected keys and fixture placement are labelled. Hit/clash events and source hashes are recorded.
- **Unchanged long-ear motion:** the gallery links the historical approved normal/skill explanation. Current regressions cover expiry, landing, pause/reset and zero-stamina activation. Flip footage remains inactive history.

Recorded wall-clock windows can contain less simulation time during hit-freeze, rendering delays and the session's bounded accumulator; reports preserve actual simulation time. Videos do not establish target FPS, subjective feel, balance or human acceptance.

## Current verification and next work

| Checkpoint | Recorded result | Evidence |
| --- | --- | --- |
| 20 October cat integration | 132 full-suite regression tests and 73 actual-game capture checks passed; production build passed. Includes eight valid loadouts/64 ordered pairings. | [Cat gameplay](characters/orange-tabby/GAMEPLAY.md) |
| 20 October simultaneous two-player layout | 14 scoped draft/loadout/session checks and production build passed; browser Start/save/cancel/solo/practice and responsive checks passed. | [v03 verification](selection-concepts/v03-dual-player/verification.json) |
| 20 October full-window preparation stage | 17 focused draft/resize/camera checks and production build passed; Back/Escape/focus, shared Start, arena restoration and desktop/phone bounds checked. | [v04 verification](selection-concepts/v04-preparation-stage/verification.json) |

These are separate recorded runs; the scoped UI results are not a new full-suite total. No full historical physics rerun was claimed for the page-only changes. The existing large-chunk warning remains. Browser validation does not establish complete native Electron match coverage, target FPS, leak freedom or human acceptance.

Next: creator playtest of the full-window preparation flow and all eight loadouts, cat support lift/steering, beagle clearance/reach, camera comfort and balance. Preserve the approved models and controllers while responding to observed issues. Selection-loading optimization remains deferred until measured and requested. Follow the [collaborator workflow](COLLABORATOR_AGENT_HANDOFF.md) for an authorized push/merge and verify the remote result before updating delivery status.

## Historical selection checkpoint — 19 October 2026

The results below describe the earlier boxed, sequential selector before cat integration and the two-player/full-window revisions. They do not describe the current screen or roster.

- `npm test`: **108 passed, zero failures**. New checks cover canonical/legacy selection, atomic commits, all seven loadouts/all 49 pairings, modes/reset, independent beagle hurt geometry, skill gating, all-pair combined-input stress, actual GLB cosmetic-ear invariance, independent materials and continuous clearance. Existing camera/contact/combat/skill regressions pass.
- `npm run build`: passes; existing large-chunk warning remains. Existing beagle rig import/alignment verification passes.
- Browser checks cover independent drafts, P1→P2 confirmation, atomic save, cancellation, invalid-owner clearing, disabled cat choices, solo/practice, actual combined keyboard input, rematch and menu return. Beagle sword ignores F while the other player's long ears can hover; pause freezes and reset clears the skill.
- Desktop/mobile layout has no horizontal overflow and the approved side order. Forced compact-asset failure shows fallback; retry recovers without changing IDs. Three repeated open/close cycles retained the same main-renderer resource counts; this is a smoke check, not comprehensive memory profiling.
- Built Electron: the actual built game opens, the new picker is present, and the local compact beagle loads. Native screenshot/input automation timed out later; a full native match was not independently verified. Browser match and control checks passed.
- [Verification JSON](previews/character-weapon-motion/verification.json) records evidence, hashes and recording outcomes. Selected screenshots are linked from the [design record](CHARACTER_WEAPON_SELECTION_DESIGN.md).

## Loading appearance correction — 19 October 2026

The creator noticed a simple beagle briefly turning into the selected Tripo model. The preview and ArenaView initially showed procedural fallback geometry before the asynchronous GLB completed. The preview now shows a centred loading label until its assets settle; runtime beagle backups remain hidden during normal loading. Only a failed load/attachment exposes the backup. A delayed-request browser check verified loading → actual model, forced failure → backup, and retry → actual model. Both compact and long-ear runtime variants passed the same visibility transitions. This changes loading presentation only; model assets, controls, physics and the recorded motion are unchanged. The gallery retains its exact earlier capture hashes, and verification JSON records this follow-up separately.
