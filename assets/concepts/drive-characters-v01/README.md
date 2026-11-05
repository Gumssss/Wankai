# CR7, Mean Girl and Maodie — 5 November 2026

[Character/model/runtime handoff](../../../docs/characters/drive-packet-2026-11-05.md) · [Verification and file manifest](verification.json) · [Original Drive sources and hashes](source-manifest.json) · [Prepared model measurements](prepared-models.json).

The user confirmed all three independent characters and their signatures, then chose existing weapon controls with no F skills. The nine-character, 56-loadout local implementation passes 177 tests, the build and normal browser UI/gameplay checks. Live Steam and human matchup fairness remain unverified.

## Original appearance

- [CR7 + soccer ball](cr7-original.png).
- [Mean Girl + crowned heart](mean-girl-original.png).
- [Maodie + cat paw](maodie-original.png).

These images use the untouched downloaded OBJ/GLB meshes, original vertex colours and original texture maps. Display scale and orientation are adjusted for viewing. The interactive viewer's `?source=original` mode reads the source intake folder locally. Its prepared mode reads the actual runtime GLBs. Original ZIPs and Maodie's `.blend`, attack and hit pose meshes remain in `.local/character-intake-2026-11-05/` and can be recovered using the Drive manifest.

## Actual gameplay

[Complete movement review](movement-review.mp4) contains 36 labelled normal-speed chapters followed by three same-event quarter-speed replays. The main chapters include W, S, A, D, WA, WD, SA and SD for every character, release/reversal, physical hits/blocks/clashes, a common sword and F having no ability. [Normal-speed source](actual-gameplay.mp4), [fixture telemetry](capture-report.json) and [exact replay source cuts](same-event-replays.json) are retained. Telemetry offsets are recorder wall-time estimates. Use video labels for source chapters and the separately validated media timestamps for replay cuts.

The capture mounts the shipping App/GameSession and renderer, resetting independent fixtures between chapters. Inputs drive the physical solver. Body travel/rise, contact cues, resources and impacts come from the actual game. The renderer is copied synchronously after drawing. Normal and slow frames were visually inspected, and the complete final file decodes without errors.

Reproduce the source with Vite on 127.0.0.1:5195 and `node tools/restored-animals-receiver.mjs ../assets/concepts/drive-characters-v01/`, then open `/docs/previews/drive-characters-v01/movement.html` and use its record button. Normalize the captured WebM to a seekable H.264 MP4 with ffmpeg, validate replay cuts against that source, and run `python3 tools/finish-restored-animals-video.py assets/concepts/drive-characters-v01 replay-plan.json`.

## Browser evidence

Each character has `<id>-picker.png` and `<id>-game.png` evidence, alongside `mobile-picker.png`, [browser checks](browser.log), [tests](tests.log) and [build](build.log). Runtime materials preserve base-colour images or linear vertex colours and use the game's matte material. The original viewer also shows the source PBR maps.
