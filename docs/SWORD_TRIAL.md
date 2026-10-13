# Short sword trial

Status: local playable experiment. The creator still reports an unexpected direction change while standing on the sword; its cause and desired behavior need review. Balance and reuse rights also need review before release.

## Purpose

Test the first weapon in a planned roster with a clear tradeoff: less reach than the polearm, but quicker swings. The default two-player match gives player one the sword and player two the existing curved polearm model. Player one can switch back to the polearm in the lobby, or try the sword against the practice dummy or in solo mode. Movement still comes from weapon contact with the ground; there is no separate run-speed bonus. Later weapons are intended to have different gameplay effects, but their exact designs are still open.

## Asset

- Source: [“fiery sword” by Joehino in Tripo's public gallery](https://studio.tripo3d.ai/3d-model/fiery-sword-with-blazing-blade-ornate-crossguard-dark-hilt-and-metal-7d8f2b1a-0a38-4a80-b639-6fea05867560). Exporting a GLB used five account credits, with the creator's approval. The original download remains in the local Downloads folder.
- The original is about 66 MB with 1,909,322 triangles and three texture images. `scripts/prepare-sword.mjs` preserves those images and reduces the game copy to about 17 MB and 180,000 triangles at `public/models/sword.glb`.
- The gallery model's exact reuse terms have not been established. This copy is for local testing; check the original creator's permission and Tripo's applicable terms before distributing the asset or publishing a build containing it.

## Current tuning

| Property | Polearm | Sword |
| --- | ---: | ---: |
| Solid weapon length | 2.35 | 1.45 |
| Gap from body pivot | 1.35 | 1.20 |
| Swing motor acceleration | 24 | 38 |
| Swing brake acceleration | 30 | 48 |
| Maximum angular speed | 8.5 | 12.2 |

The same straight-segment collision approximation is used for both weapons. The fiery blade is wider than that collision segment, so visible edge contact may not always count as a hit. Damage still depends on actual contact speed and acceleration; it has no sword-specific multiplier. These values are starting points for hands-on tuning, not a claim that either weapon is balanced.

The sword begins level and points toward player two, so its initial pose reads horizontally from the shared camera. Its hilt-to-tip axis is aligned with the collision segment. A visual rotation change was made to keep the flat blade's facing continuous through the downward support pose. This has **not** settled the creator's report that the sword or movement changes direction unexpectedly when standing on it; reproduce and compare with the polearm before further tuning.

## Checks

The game loads the optimized sword with its texture in the practice scene. The sword extends from player one's weapon base toward the target, and the existing polearm remains on player two. The physics suite checks shorter reach, quicker pitch/yaw response, and no direct horizontal movement in the air. The session suite checks the default pairing, selection, and rematch persistence. Run `npm test` and `npm run build` after changes. The downward support direction, two-person balance, repeated mode switching, and offline Electron play still need hands-on checks. The [design handoff](DESIGN_HANDOFF.md) records the next reproduction to try.
