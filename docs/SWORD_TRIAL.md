# Short sword trial

Status: local playable experiment. The creator still reports an unexpected direction change while standing on the sword; its cause and desired behavior need review. Balance and reuse rights also need review before release.

## Purpose

Test the first weapon in a planned roster with a clear tradeoff: less reach than the polearm, but quicker swings. The default two-player match gives player one the sword and player two the existing curved polearm model. Both players can now choose the sword, polearm, or iron hammer independently in the armory, including matching weapons; the choice carries into practice and rematches. Solo uses player one's selection. Movement still comes from weapon contact with the ground; there is no separate run-speed bonus.

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

The sword begins level and points toward player two. The duel now uses separate player cameras rather than the earlier shared camera. Its hilt-to-tip axis is aligned with the collision segment. A visual rotation change was made to keep the flat blade's facing continuous through the downward support pose. This has **not** settled the creator's report that the sword or movement changes direction unexpectedly when standing on it; reproduce and compare with the polearm before further tuning.

## Checks

### Review of the first import problems — 15 October 2026

The earlier chat records two separate complaints: the sword initially sat at a slant, and later changed direction unexpectedly while supporting the fighter. The latter was explicitly left unresolved by the creator.

- The old fixed-angle controller at checkpoint `8cc6441` chose the nearest upright target. At `theta = pi - 0.001`, holding Up drove negative angular velocity; at `pi` or `pi + 0.001`, the same input drove positive velocity. This is a reproducible historical discontinuity and a likely contributor, not proof of the entire reported symptom. The newer continuous torque controller already removes that target switch. A regression now checks identical input direction on either side of straight down.
- Direction-only quaternion alignment leaves blade roll ambiguous at the downward pole. All weapon visuals now use the same continuous yaw-and-pitch rotation, with regression checks that their longitudinal axes track physics through overhead and downward poses. Native model axis, grip, and blade-facing decisions remain separate import checks.
- The sword's normalized axial bounds closely match its 1.45-unit collider, but its blade and crossguard extend beyond the 0.09-unit collision radius. A broad hammer head must receive suitable collision coverage rather than inheriting a thin shaft approximation. The narrow weapons retain tip-driven ground contact. The new hammer instead checks its solid capsule endpoints, with outer-head support covered by regression tests.
- The optimized sword is 16,812,104 bytes and 179,996 triangles, with three 4096-square textures. Those textures are approximately 192 MiB decoded RGBA, or 256 MiB with mipmaps; this is a resource estimate, not a measured frame-rate result. The next import must reduce textures as well as geometry where needed, and inspect material arrays instead of assuming a single mesh/material.

Automated checks guard the identified discontinuities; only hands-on comparison can settle the creator's original support-direction concern.

The game loads the optimized sword with its texture in the practice scene. The sword extends from player one's weapon base toward the target, and the existing polearm remains on player two. The physics suite checks shorter reach, quicker pitch/yaw response, and no direct horizontal movement in the air. The session suite checks the default pairing, selection, and rematch persistence. Run `npm test` and `npm run build` after changes. The downward support direction, two-person balance, repeated mode switching, and offline Electron play still need hands-on checks. The [design handoff](DESIGN_HANDOFF.md) records the next reproduction to try.
