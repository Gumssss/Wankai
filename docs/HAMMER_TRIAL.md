# Iron war hammer and three-weapon armory — 15 October 2026

The creator selected the iron/red-cloth model after seeing its image and explicitly approved spending **5 Tripo credits** to export and integrate it. The export succeeded. No further credits were spent.

## Asset and preparation

- [Selected Tripo gallery model](https://studio.tripo3d.ai/3d-model/heavy-fantasy-war-hammer-with-iron-head-wrapped-wooden-shaft-and-red-24462042-16ba-4905-a4db-a3bfe9a6500a), creator `hmchun1214`, displayed as “fantasy war hammer 3d model.” Its iron head has a crescent cutting face and pointed back; preserve the selected appearance.
- Original: `assets/source/wankai-iron-hammer-original.glb`, 13,229,420 bytes, 390,307 triangles, 204,914 vertices, one static mesh/primitive/material.
- Export was requested as GLB with 2K textures. Inspection found one **4096 × 4096** embedded JPEG, so the selected UI setting cannot be used as proof of the actual texture budget.
- Game copy: `public/models/hammer.glb`, **2,809,052 bytes**, **79,997 triangles**, **47,250 vertices**, one **1024 × 1024** JPEG. The decoded RGBA texture budget falls from roughly 64 MiB to 4 MiB before mipmaps. This is a resource estimate, not a measured FPS gain.
- Reproduce with `node scripts/prepare-weapon.mjs assets/source/wankai-iron-hammer-original.glb public/models/hammer.glb`. Preparation requires Python 3 with Pillow, validates the inspected accessor layout, simplifies geometry with meshoptimizer, compacts vertices, and resizes the embedded texture.
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
| Reverse braking | 48 | 30 | 22 |
| Motor speed limit | 12.2 | 8.5 | 6.8 |

The hammer starts raised and takes longer to start and recover. Metal-head damage is 1.3 times the common impact damage at the same closing speed and driving acceleration; its shaft keeps ordinary damage. Maximum rounded head damage is 44 versus the common cap of 34. Touches below the common speed threshold still do no damage. Broad contact and greater inertia also affect blocks and support. No independent walking force or additional keys are introduced. This is a starting balance for playtesting.

## Armory and verification

The armory previews the actual three GLBs and describes strengths and tradeoffs. Both fighters choose independently, including matching weapons. Each mode opens selection before starting; solo exposes only P1. Rematches retain choices, and equipment cannot change during a round.

Automated coverage includes all nine loadouts across four modes, separated duel spawns, pole traversal, model/contact rotation agreement, off-axis velocity derivatives, outer-head hits and blocks, head support with the shaft clear of the floor, cloth/side misses, slower hammer response, and 30 seconds of mixed inputs for all nine pairings. The mixed-input check exposed a final body-separation pass pushing a fighter a few millimeters outside the rim; the body boundary is now reapplied after pair contacts.

Browser verification checks actual model rendering, independent choices, match start, rematch, and solo selection. See [armory screenshot](screenshots/armory.jpg).

The earlier sword support-direction concern is still awaiting the creator's hands-on acceptance. Its historical controller discontinuity and visual-axis checks are recorded in [SWORD_TRIAL.md](SWORD_TRIAL.md). Do not treat automated checks or this hammer import as acceptance of that earlier issue.
