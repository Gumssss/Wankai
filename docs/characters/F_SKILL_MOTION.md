# F-skill motion record — v01

**Current selection:** user accepted CR7 v03 preview and authorized CR7 / Mean Girl implementation. [Implementation plan](CR7_MEANGIRL_IMPLEMENTATION_PLAN.md) is current; production implementation remains unstarted.

**8 November 2026:** Mean Girl and CR7 v01 concepts are superseded as current recommendations by [v02 feasibility concepts](F_SKILL_DESIGN_V02.md). New clips explain perfume / ricochet-ball directions; neither set is implemented. Existing normal-control evidence remains reusable.

7 November 2026. **Proposal v01 / selected none / new runtime implementation none.** [Design contracts](F_SKILL_DESIGN.md). Local-only, no publish/merge. Approved models are reused without source edits.

## Main review

[Complete motion review](../../assets/concepts/f-skills-v01/movement-review.mp4): four authored concept chapters, followed by complete reused actual-game reviews. This one file retains W, S, A, D, W+A, W+D, S+A and S+D for each character, with the original input HUD and physical travel/support evidence. The reused recordings are historical evidence of unchanged controls, **not tests of the proposed skills**. Original no-F labels remain correct for those recordings.

| Main-video start | Clip | Motion type / status |
|---|---|---|
| 00:00 | [Orange Tabby](../../assets/concepts/f-skills-v01/orange-tabby.mp4) | Authored brace concept / proposed |
| 00:44 | [CR7](../../assets/concepts/f-skills-v01/cr7.mp4) | Authored strike concept / proposed |
| 01:28 | [Mean Girl](../../assets/concepts/f-skills-v01/mean-girl.mp4) | Authored zone concept / proposed |
| 02:12 | [Maodie](../../assets/concepts/f-skills-v01/maodie.mp4) | Authored parry concept / proposed |
| 02:56 | Reused animals review | Existing gameplay, including Orange Tabby full matrix and Beagle rotor |
| 04:20 | Reused Drive review | Existing gameplay, CR7 / Mean Girl / Maodie complete matrix |

Exact later assembly boundaries and duration: [assembly manifest](../../assets/concepts/f-skills-v01/assembly.json). No wall-clock estimates are used for the authored clip boundaries: deterministic 15 Hz samples encoded as 30 fps H.264, 1,320 frames / 44 seconds each, silent.

## Exact local timecodes in EACH 44-second proposal

| Range | Coverage |
|---|---|
| 00:00–00:04 | Complete normal-speed wind-up, active result, expiry/recovery and return |
| 00:04–00:08 | Same event 0.25×; source action time 00:00.50–00:01.50, identical setup and timeline |
| 00:08–00:12 | Evade/miss/wait out, no successful outcome |
| 00:12–00:16 | Incoming damage: Tabby persists; others show wind-up interruption, cost/CD retained |
| 00:16–00:20 | W+A, release, then S+D reversal; ordinary controls retained |
| 00:20–00:24 | Authored external air setup, F rejection for Tabby/Mean Girl, allowed for CR7/Maodie, landing |
| 00:24–00:28 | Common sword compatibility; Tabby explicitly has no legal common equipment |
| 00:28–00:30 | F + W |
| 00:30–00:32 | F + S |
| 00:32–00:34 | F + A |
| 00:34–00:36 | F + D |
| 00:36–00:38 | F + W+A |
| 00:38–00:40 | F + W+D |
| 00:40–00:42 | F + S+A |
| 00:42–00:44 | F + S+D |

Combined chapters highlight F and the normal keys together from local chapter .42–1.45 s (first encoded highlighted sample .4667 s). Holding F does not retrigger. Inputs are the authored timeline's live highlights, not recorded human input. All new body displacement, air arcs, recoil, damage examples and resource readouts are illustrative. No scripted support movement is claimed as real floor contact. Tabby's .35 m rest hover is separately labelled. The imported models are rigid; no kick/arm deformation is promised.

## Reused normal-input coverage

Sources: [restored animals](../../assets/concepts/restored-animals-v01/README.md) and [Drive characters](../../assets/concepts/drive-characters-v01/README.md), from the accepted restoration/Drive runtime records cited by the handoff. Same models and normal controllers; no geometry or production code changed here.

[Verified encoded seek samples](../../assets/concepts/f-skills-v01/reuse-seek-checks.json) give a seek **inside** each input interval, not a claimed exact chapter boundary. Recorder telemetry offsets are not media timestamps. Contact sheets retain the decoded labels/key HUD for inspection. Full originals, including physical contact feedback and same-event slow replays, remain unchanged in their own folders.

## Verification and limits

- Rendered locally with installed Electron and Vite on port 5196; renderer muted before navigation. No audio stream in delivered videos.
- Approved runtime builders/loaders instantiate actual GLBs; no placeholder character export or regeneration. Preview code lives only under `docs/previews/f-skills-v01/`; capture/verification scripts are in `tools/`.
- Inspected decoded chapter sheets for all four proposals: body/weapon visibility, stable floor, F and combination highlights, phase labels, common sword, miss/interruption/air-return, normal/slow labels. Adjusted Tabby camera to expose the body between paws and leave room for the external air setup.
- Each individual MP4 passed a complete FFmpeg decode and ffprobe stream/frame checks; hashes and results in [media verification](../../assets/concepts/f-skills-v01/media-verification.json). Assembly gets a separate decode check.
- These are **timing/intent blockouts**. Exact contact locations, impulses, support eligibility, defensive ordering, collision clearance during ability response, obstacle occlusion, mirrors, AI and host/guest are not validated by authored animation. Those require implementation and actual-game captures after selection. Proposed detailed gold weapon outline/segmented warning polish is not final VFX in this blockout.
- No new production regression suite/build was run because production source and assets were not edited. Prior 177-test/build result remains historical. No Steam or separate MacBook validation claimed.

## Checkpoint / next action

Delivered: local v01 contracts, encoded review clips, full review assembly, reproducible preview/capture sources and encoded verification evidence. Await user selection/refinement per fighter. Selection is not inferred from silence. After a selected contract is authorized for implementation, add matching actual-game evidence and update selected/implemented pointers; retain this concept version as the before record.
