# Beagle production lessons

The Wankai beagle was developed on 17–19 October 2026 from a supplied tan/white cartoon reference. Its long ears had to be both weapons and ground supports. The selected outcome used a smooth Tripo base refined in Blender, upright normal movement and a separate low-hover spinning ability. These are examples of decisions, not universal character defaults.

## Evidence that changed the design

| Experience | Reusable decision |
| --- | --- |
| First short ears produced little body rise. | Check attachment height, reach and leverage before adding skeleton complexity. |
| Early videos omitted W/S plus A/D combinations. | Present simultaneous inputs explicitly, with their body/contact response. |
| Folding ears made a flip fit but added complexity. | Extra joints need controls, clearance, contact and export justification. |
| Counter-rotating ears seemed detached from the body's action; locked relative angles then looked rigid. | Define moving together separately from being rigidly locked; choose controlled lag without losing weapon authority. |
| Passive hinge simulations looked physical but lacked player drive, hits and clashes. | Demonstrate the complete functional chain with the game solver. Label external test launches honestly. |
| A Blender-only model proved the rig but lacked the preferred appeal. | The user selected Tripo for production bases, with Blender supplying exact refinements. |
| The generated concept was called cute before the actual mesh was inspected. | Review the reconstructed model separately from the image. |
| Wider fluffy/scalloped ears were rejected. | Preserve approved identity; do not equate soft-looking volumes with fur contours or extra deformation. |
| The earlier smooth Tripo source was segmented and reused. | Repair/segment a selected base rather than repeatedly regenerating its face. |
| A coupled flip passed numerical tests but the creator found the character lying down. | Test and show landing/recovery; passing selected test cases does not establish playable acceptance. |
| Full helicopter spread on ordinary A/D created a large area and conflicted with W/S. | Separate a dominant area move into an ability when it overloads normal steering. |
| The user separated skill duration from ordinary stamina. | Specify ability lifecycle/resources explicitly; do not impose a resource cost or change shared balance without agreement. |

## Technical distinctions to preserve

Soft smooth surfaces and a firm physical paddle can coexist. One root hinge was sufficient for the selected beagle, but another character may need different joints. Both ears shared a swing command, stamina budget and repeat-hit gate while keeping separate sockets and contact surfaces. This avoided accidental duplicate damage/cost.

The final rig used measured geometry, fitted simplified contacts, shared pose/velocity transforms and independent player skeleton/material instances. A body-mounted weapon required anatomical attachment transforms, not the old floating weapon offset. Cosmetic blink tracks were kept away from physically controlled bones.

The source image, downloaded Tripo model, Blender rig, motion revision and runtime controller were separate artifacts. Explicit current pointers mattered because motion v05 and model v05 meant different things. Rejected branches were preserved and labeled historical.

The upright integration was the source checkpoint merged in PR #1. Later flip and hover experiments were local at the time of the record. This demonstrates why local, verified, accepted, merged and released must be reported separately.

## Apply the lessons without copying the character

The beagle's ear reach, thirteen bones, capsule count, F binding, stamina capacity and hover duration were task-specific. Do not copy them into another character. Reuse the production strategy: approved identity, cheap mechanical proof, mandatory move videos, selected Tripo base, precise Blender work, shared physical/visual state and actual-game review.

If this is the Wankai repository, read docs/BEAGLE_DESIGN_PROCESS.md for the complete history, docs/CHARACTER_CREATION_WORKFLOW_SPEC.md for the agreed workflow and docs/BEAGLE_SPIN_SKILL.md for its dated active runtime. This skill remains usable when those project files are absent.
