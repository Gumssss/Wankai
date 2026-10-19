---
name: game-character-pipeline
description: "Develop or revise playable 3D game characters from references through Tripo generation, Blender refinement, required move videos, user reviews, project records and runtime verification. Use for character production or a requested stage of it; preserve the endpoint of image-only and model-only requests."
---

# Game Character Pipeline

Turn the selected character identity into an asset and behavior that fit the actual game. Resume accepted work rather than restarting production. A concept image, 3D base, rig, implemented move and accepted playable character are distinct milestones.

## Required choices

- **Generate every new production character base in Tripo.** Refine, optimize and rig the selected Tripo result in Blender. Primitive blockouts are allowed for motion previews, but cannot replace the production base. An existing approved Tripo base can be reused for local edits. Do not substitute another generator or a Blender-only base unless the user explicitly changes this requirement.
- **Always present the understanding of every move through video.** Before implementing a new or changed move, show a labeled motion video for review. Include familiar controls, combined inputs, abilities, transitions and recovery. After implementation, capture actual gameplay covering the agreed actions. Prose, poses, screenshots and interactive previews can accompany videos but cannot replace them. An unchanged move may reuse its matching approved video.
- Preserve accepted identity, proportions and markings outside the requested edit. Keep visible weapons, attachment points, contacts and their velocities consistent. Separate cosmetic motion from physical control explicitly.
- Use the smallest rig/controller that satisfies the action. Do not assume soft appearance requires fur, extra joints or soft-body simulation. Do not impose the beagle's dimensions, bone count, controls or resources on other characters.
- Keep originals, editable sources, accepted exports and rejected studies distinct. Technical checks do not substitute for visual or playable acceptance.

## Start or resume

Read repository instructions, current status/handoff/control documents, existing character records and relevant assets/source. Identify the requested endpoint, selected identity, approved model and move versions, engine/camera conventions, technical budget, input/combat rules, current work and authorization already given. Preserve unrelated changes.

Write a provisional design brief and manifest before generating concepts. Accept a supplied reference, search with source links, or generate a seed as requested. Do not create a second selection process if the user already chose the reference. Record visual locks and unresolved choices; ask only for missing decisions that affect the work.

For record outlines and templates, read [documents.md](references/documents.md) when creating or updating the character records. Keep records proportional to the task; combine related sections for a small edit and retain the existing document layout.

## Execute the appropriate stages

| Stage | Outcome and review |
| --- | --- |
| 1. Direction | Character brief plus selected reference/seed, appearance locks, gameplay role and normal/ability distinction. Review A selects that direction. |
| 2. Motion | Gameplay contract and videos explaining every move. Prototype unfamiliar mechanics cheaply before locking geometry. Review B agrees on new/changed motion. |
| 3. Reconstruction inputs | Consistent clean images from the selected seed and validated proportions, with a Tripo operation/spending plan. Review C approves the exact packet and operation. |
| 4. Tripo base | Preserve the download, inspect actual geometry and open the real 3D candidate. Review D selects its appearance and proposed Blender work. |
| 5. Blender preparation | Cleanup, measured optimization, detail edits, appropriate rig and fitted contacts; export and reimport with the game's loader. Review E approves the actual asset, move videos and extreme-pose checks for integration. |
| 6. Integration | Implement the accepted behavior, selection/input/reset paths, contacts, cameras and UI. Verify and provide actual gameplay videos. Review F assesses playable behavior and recovery. |
| 7. Handoff | Update current-state records, decisions, provenance, verification and delivery status. Push/merge/release within the user's authorization. |

Read [motion-and-reviews.md](references/motion-and-reviews.md) before presenting or changing motion, preparing an approval milestone or handling a rejected result. It defines video coverage, review boundaries, spending/retry behavior and return paths.

Read [production.md](references/production.md) before preparing reconstruction inputs, using Tripo, editing/rigging in Blender or integrating the export. Inspect current tool capabilities and Tripo settings instead of assuming historical versions or prices. One input view or multi-view can be appropriate; three views are not compulsory.

For new weapon anatomy, prove its functions before final mesh work. In Wankai, demonstrate ordinary W/S and A/D, all four combinations, support-driven travel, release/reversal, hits, blocks/clashes and recovery; add the approved ability lifecycle. In other games, adapt the action matrix to their actual rules. Authored concept motion must be identified as such, with remaining solver work explicit.

## Reviews without repeated permission requests

Prepare the concrete reviewable result before asking. Identify the exact artifact/version, decision needed and next action. Combine reviews when they address one completed packet. Reuse approval and delegated choices already given within scope; do not stop for each routine repair, export, test or documentation update. Silence is not approval for dependent work.

Keep appearance selection, credit authorization, technical verification and playable acceptance separate. A new candidate or changed mechanic only reopens affected decisions. Ordinary character work does not authorize unrelated global balance changes or publishing. Existing scoped authorization remains valid.

If a required tool or video capability is missing, report the exact gap and continue independent permitted work. Do not silently replace Tripo, omit required videos or declare a review complete. Use available specialists and tools; a Blender MCP bridge, API key or automatic rigging service is not inherently required.

## Verify and deliver

Check the actual exported asset: scale/axes/rest transforms, deformation at extremes, attachments, contacts, materials, independent instances and clips that do not override physical controls. Test implemented transitions and velocities, not just static poses. Run relevant regression checks and the build, inspect the real game and show gameplay video against the approved motion preview.

If a move looks wrong despite passing tests, reproduce the reported input/view/state and return to the affected contract, rig or controller. Do not fix a physical error only by moving the render mesh. Preserve the accepted appearance while diagnosing mechanics.

Update the selected/current version pointers, source/archive paths, provenance, motion reviews, model/runtime handoffs, verification and decision history. Say which results are local, verified, accepted, pushed/merged or released. A merged source checkpoint is not an installer.

Read [beagle-lessons.md](references/beagle-lessons.md) when weapon anatomy, soft appearance, motion rejection or conflicting controller coverage needs a worked example. Its lessons are self-contained; if this is Wankai, locate docs/BEAGLE_DESIGN_PROCESS.md for the full project history.
