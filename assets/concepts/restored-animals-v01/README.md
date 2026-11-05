# Restored Beagle and orange-cat evidence

2 November 2026. [Implementation handoff](../../../docs/RESTORED_ANIMALS.md). [Verification and changed-file manifest](verification.json). Local implementation; no push/merge.

- [Movement review with same-event slow replays](movement-review.mp4): 27 labelled chapters with both complete normal-input matrices, release/reversal, Beagle F+D/A hover and expiry, real hit/block/clash fixtures, and Beagle common-weapon appearances.
- [Original actual-game capture](actual-gameplay.mp4), [telemetry and chapter offsets](capture-report.json), [same-event edit decisions](same-event-replays.json). The video uses the actual App, GameSession, world and GLB models. Chapters reset labelled independent fixtures; there is no substitute blockout or kinematic body travel.
- [Orange-cat picker](cat-picker-final.png), [Cat controls/HUD](cat-game.png), [Beagle with normal ears/common weapon](beagle-common-picker.png), [Beagle rotor](beagle-rotor.png).

The three animal exports are byte-identical to the selected Tripo/Blender source. The rejected flip/fluffy-ear/2×-paw experiments are not selected. Existing models remain in the roster. Tests/build pass; human matchup fairness and live Steam play are not established by this evidence.

The first attempt to copy the WebGL canvas after its drawing buffer cleared was rejected. This capture copies synchronously after the actual renderer draws; its rendered content, not just telemetry, was visually inspected. No capture-only code runs on the normal game page.
