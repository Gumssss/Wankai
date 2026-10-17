# Iron war hammer and three-weapon armory — 15 October 2026

The creator selected the iron/red-cloth model after seeing its image and explicitly approved spending **5 Tripo credits** to export and integrate it. The export succeeded. No further credits were spent.

Reviewed 17 October 2026: the hammer and armory are included on default `main`, now with the shared stamina and directional-damage rules. The 5-credit figure records this export, not a guaranteed future price. See [project status](PROJECT_STATUS.md) for current validation and open work.

## Asset and preparation

- [Selected Tripo gallery model](https://studio.tripo3d.ai/3d-model/heavy-fantasy-war-hammer-with-iron-head-wrapped-wooden-shaft-and-red-24462042-16ba-4905-a4db-a3bfe9a6500a), creator `hmchun1214`, displayed as “fantasy war hammer 3d model.” Its iron head has a crescent cutting face and pointed back; preserve the selected appearance.
- Original: `assets/source/wankai-iron-hammer-original.glb`, 13,229,420 bytes, 390,307 triangles, 204,914 vertices, one static mesh/primitive/material.
- Export was requested as GLB with 2K textures. Inspection found one **4096 × 4096** embedded JPEG, so the selected UI setting cannot be used as proof of the actual texture budget.
- Game copy: `public/models/hammer.glb`, **2,809,052 bytes**, **79,997 triangles**, **47,250 vertices**, one **1024 × 1024** JPEG. The decoded RGBA texture budget falls from roughly 64 MiB to 4 MiB before mipmaps. This is a resource estimate, not a measured FPS gain.
- After `npm ci`, reproduce with `node scripts/prepare-weapon.mjs assets/source/wankai-iron-hammer-original.glb public/models/hammer.glb`. Preparation requires `python3` with Pillow, validates the inspected accessor layout, simplifies geometry with meshoptimizer, compacts vertices, and resizes the embedded texture. Both original and prepared GLBs are included; playing the game requires neither Python nor asset preparation. This script targets the inspected static mesh layout, not arbitrary GLBs.
- The gallery model's redistribution permission remains unverified. The creator's later GitHub checkpoint request is recorded in the [project review](PROJECT_STATUS.md); it does not resolve that asset-permission item.

## Import and contact shape

The native shaft already points along +Y; its butt origin is `(0,0,0)`. Native Y spans 0–0.9987488. Uniform scaling to length 1.9 uses approximately 1.90238. Whole-mesh PCA would tilt the shaft about 6.8° because of the asymmetric head and cloth, so it is deliberately not used for alignment.

The metal head is about 0.85 units wide and 0.23 units deep after scaling. A narrow shaft collider would miss visible head hits and support. Five local capsules cover the shaft, head core, upper/lower crescent, and pointed back. The same continuous yaw × pitch rotates every collider and the visible model. Contact velocity and impulses use the actual off-axis contact derivatives.

These are prototype collision approximations. The 99th percentile source head vertex lies within about 0.041 game units of the proxy; the worst uncovered region is about 0.062. Capsules also overestimate thickness in places. The hanging red cloth is deliberately excluded. All solid endpoints can contact the ground and the low arena rim. A fallback head follows the same capsules while the GLB loads or if loading fails.

## Initial gameplay profile

| Property | Sword | Polearm | Iron hammer |
| --- | ---: | ---: | ---: |
| Solid length | 1.45 | 2.35 | 1.9 |
| Floating offset | 1.2 | 1.35 | 1.3 |
| Rotational inertia | 2.8 | 4.1 | 5.8 |
| Motor acceleration | 38 | 24 | 18 |
| Pitch reversal braking | 48 | 30 | 22 |
| Motor speed limit | 12.2 | 8.5 | 6.8 |

The hammer starts raised and takes longer to start and recover. Metal-head damage is 1.3 times the common damage at the same impact conditions and motion weighting; its shaft keeps the common surface multiplier. Vertical head hits can reach 44 rounded damage versus the common cap of 34. Pure horizontal hits apply the shared 0.5 direction multiplier, giving caps of 22 for the head and 17 for the shaft. Mixed hits blend by incoming motion. Touches below the common speed threshold still do no damage. Broad contact and greater inertia also affect blocks and support.

All three weapons use the shared 100-point stamina rule: swing costs 20/s, turning 8/s, and powered control weakens below 25. Pitch reversal uses the table's brake value; yaw reversal uses motor acceleration, and released motion uses damping. Contact impulses can also alter speed, so motor limits are not a promise of exact collision-driven angular velocity. See [control system](CONTROL_SYSTEM.md). No independent walking force or extra weapon keys are introduced; this remains a starting balance for playtesting.

## Armory and verification

The armory previews the actual three GLBs and describes strengths and tradeoffs. Both fighters choose independently, including matching weapons. Each mode opens selection before starting; solo exposes only P1. Rematches retain choices, and equipment cannot change during a round.

Automated coverage includes all nine loadouts across four modes, separated duel spawns, pole traversal, model/contact rotation agreement, off-axis velocity derivatives, outer-head hits and blocks, head support with the shaft clear of the floor, cloth/side misses, slower hammer response, and 30 seconds of mixed inputs for all nine pairings. The mixed-input check exposed a final body-separation pass pushing a fighter a few millimeters outside the rim; the body boundary is now reapplied after pair contacts.

Earlier browser verification checked actual model rendering, independent choices, match start, rematch, and solo selection. See [armory screenshot](screenshots/armory.jpg); this predates the stamina HUD. Current automated validation is recorded in [project status](PROJECT_STATUS.md). Fast weapon clashes can still be missed between collision samples; broad head coverage does not establish continuous collision detection or final balance.

The earlier sword support-direction concern is still awaiting the creator's hands-on acceptance. Its historical controller discontinuity and visual-axis checks are recorded in [SWORD_TRIAL.md](SWORD_TRIAL.md). Do not treat automated checks or this hammer import as acceptance of that earlier issue.
