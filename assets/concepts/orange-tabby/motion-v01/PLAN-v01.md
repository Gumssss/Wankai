# Orange tabby gameplay and implementation plan

19 October 2026. Provisional contract v01. No production source changes are authorized by a technical preview alone.

## Ordinary control proposal

| Input | Intended action | Movement source / limits |
| --- | --- | --- |
| W / ↑ | Downstroke in front, rake toward the rear, bent-elbow return | Paw-floor reaction can push body forward; no keyboard translation force |
| S / ↓ | Reverse cycle: descend behind, rake toward front, return | Paw-floor reaction can retreat; brake phase momentum before reversal |
| A / ← | Steer common heading left | Finite yaw drive; paws sweep horizontally and can slip/deflect |
| D / → | Steer common heading right | Same construction with opposite yaw |
| W+A, W+D | Forward rake plus left/right steering | Curved contact-driven travel; no two-paw pinned constraint |
| S+A, S+D | Reverse rake plus left/right steering | Same combined axes during retreat |
| Release | Remove powered input | Momentum decays under gravity, damping and contacts; no instant frozen pose |
| W↔S or A↔D | Brake then reverse | No phase/heading snap |
| Opposite keys together | Cancel the corresponding axis | Retain other axis and ordinary shared rules |

P1/P2 mappings are the existing four-key axes, subject to review of this character's stroke interpretation. Cat W/S means a repeating anatomical stroke, not unlimited shoulder rotation. Show this distinction explicitly. Ability lifecycle is inapplicable: none selected. Camera keys remain distinct from weapon controls.

## Contact and rig proposal

Two front limbs attach at fixed outboard shoulder sockets. A shoulder drive supplies sweep, an elbow supplies folded recovery, and a paw frame keeps pads useful at support/guard. Start with two articulated controls per arm; add wrist articulation only if pad/claw orientation cannot be maintained without it. Prototype IK is a pose construction, not a promise that exported Blender constraints become a runtime solver.

Only solid paw/toe/claw envelopes supply weapon contacts in v01. Forearms are visually attached and use body hurt/clearance treatment; whether to make them blocking surfaces is an open reach/coverage decision. No invisible long weapon proxy. Fit contacts to the selected Tripo/Blender asset after selection.

Propose ordinary paw slaps/rakes for vertical hits, heading sweeps for horizontal hits, a pad-facing interception for a block, and contact/recoil for clashes. Retain the game's shared hit gate, stamina, directional damage and clash rule. No new damage multipliers, automatic defense, dash, grip or balance changes are selected.

## Ownership and evidence

In production, solver owns body position/velocity, heading and physically driven joint coordinates. Render geometry, hurt shapes, contact points and point velocities must use that same frame. Cosmetic tail/blink may not override physical bones. Ground support needs coupled reaction and finite motor authority; animation alone cannot prove travel.

The v01 research harness uses a reduced upright translating body, an inertial stroke phase and a yaw coordinate. Penalty floor contacts apply reactions through paw point Jacobians. It is not Wankai's combat solver, a full articulated ragdoll, or final balance. Authored combat shots use scripted target motion and translation and are labeled accordingly. A separate collision/impulse proof and game-solver adapter remain required before motion can be treated as functionally validated.

## Stages and acceptance

1. Save selected originals, design/manifest, proposed controls and geometry. Create comprehensive authored move clips, plus cheap isolated support research and a posture comparison.
2. Review A/B: decide posture and ordinary move interpretation; record unproven support/combat and revise if needed. Prove any retained unfamiliar mechanism using a game-solver adapter before final geometry.
3. Prepare exact clean reconstruction input files from the selected cat identity and validated dimensions. Inspect current Tripo view modes and final operation charges. Present the packet and bounded operation/spending request. No paid operation before that approval.
4. Generate new production base in Tripo, preserve raw result/provenance and inspect/open the actual textured mesh for Review D. Repair selected base in Blender; do not silently redesign it.
5. Optimize/rig, measure joint clearance and contacts, reimport through Three.js, inspect extreme poses and independent clones. Review E includes actual asset and move videos.
6. Add a cat loadout, preserving all existing weapons/beagle. Verify P1/P2 independent selection and identical-cat instances, inputs, mixed inputs, held-opposites, pause/focus, reset/rematch, hurt shapes, cameras, hits/near misses, blocks/clashes and all loadout pairings. Run meaningful regression/build checks and capture actual-game move videos for Review F.

Landing/recovery must return useful control after support, release, reversing, deflection and a knockback drop. An external test drop must be identified as a setup, not a cat ability. Do not promise upright recovery based solely on a model-viewer floor correction.

## Spending and delivery

Cat Tripo budget and exact packet are not yet selected. Existing beagle credit decisions do not authorize cat operations. Do routine local study/export/repair within the requested scope; combine reviews at concrete milestones. Publishing/pushing is outside this request. Maintain explicit selected/current pointers, local/verified/accepted states and evidence after each stage.
