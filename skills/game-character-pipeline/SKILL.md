---
name: game-character-pipeline
description: "Develop or revise playable 3D game characters through references, motion review, Tripo, Blender and runtime integration. Use for the whole process or any requested stage; stop at the requested endpoint and resume accepted work. UI-only changes to an existing game use screen/interaction checks rather than reopening character production."
---

# Game Character Pipeline

Guide the whole character process while doing only the work requested now. A concept image, 3D base, rig, implemented move and accepted playable character are distinct milestones; invoking this skill does not require completing them all in one task.

## Choose the working scope

Infer the requested endpoint from the user's current request and existing decisions, state it briefly and begin. Do not ask the user to select a mode when the request is already clear.

- **Stage task:** complete the requested stage or range, such as references only, motion review, three-view inputs, Tripo base only, Blender edits or integration of an approved model. Stop at that endpoint. Requirements of later stages do not become extra deliverables: a single concept-image request does not require three views unless reconstruction inputs are requested; a model-only task does not require gameplay implementation.
- **Production task:** when the user requests a playable character or authorizes several stages, continue across the authorized range. The stage table is a map, not a required pause after every row. Reuse approvals/delegated choices and complete routine work without another permission request. Stop only at the requested endpoint, an explicit user stop, a genuinely missing decision/authorization or an unresolved required capability.
- **UI-only task:** if the request changes selection layout/navigation while assets, motion and contacts stay unchanged, handle that screen directly. Use screenshots, interaction/readiness/cancellation checks, focus and responsive bounds, loading behavior and appropriate focused checks/build. Reuse accepted motion evidence; do not regenerate assets, require a motion video or reopen character reviews for this task.

On resume, read the selected/current pointers, approval scope and latest checkpoint, then enter the earliest unfinished stage within the new request. Do not repeat completed stages or infer selection from the largest version number. If a prerequisite is missing, do the authorized prerequisite work or prepare the specific missing decision; do not silently expand an image/model task into the rest of production.

At a stage endpoint or explicit stop, save a short checkpoint in the existing character record: delivered artifact/version, current stage, approvals/constraints, unfinished work and next action. Identify a suggested next stage without executing it beyond scope or requiring the user to approve that suggestion. A completed stage is a complete scoped task; it does not mean the character is integrated or accepted. Use [documents.md](references/documents.md) for checkpoint fields when needed.

## Required choices

- **Generate every new production character base in Tripo.** Refine, optimize and rig the selected Tripo result in Blender. Primitive blockouts are allowed for motion previews, but cannot replace the production base. An existing approved Tripo base can be reused for local edits. Do not substitute another generator or a Blender-only base unless the user explicitly changes this requirement.
- **Always prepare front, side and back images before generating a model in Tripo.** Derive the three separate clean views from the same selected seed and keep pose, proportions, markings, materials and scale consistent. Reuse matching approved views and generate the missing ones; do not redesign the character independently for each angle. Inspect the complete set before submission.
- **Present proposed or changed moves through video when motion is in scope.** Before their runtime implementation, show a labeled motion video for review. Include familiar controls, combined inputs, abilities, transitions and recovery. After implementation, capture and retain actual gameplay covering the agreed actions. Static evidence cannot replace this motion evidence. An unchanged move may reuse its matching approved video; unrelated UI work does not require another recording.
- **Honor the requested review format after implementation.** Keep the actual-game evidence, but when the user prefers reviewing the implemented game, open the playable game instead of presenting the recording again. Do not add a video-viewing or approval stop after the user selected live review. This does not waive required pre-implementation motion reviews or establish hands-on acceptance automatically.
- **Use the functional demonstration format selected from the beagle v07 video.** Keep live key highlights, floor/contact cues, body travel or rise, resources and impact feedback visible. Show the whole action at normal speed, then replay the same critical contact in labeled slow motion. The intended result—especially support-driven lift—must be obvious on screen. Follow the framing and evidence standard in [motion-and-reviews.md](references/motion-and-reviews.md).
- **Show the complete movement matrix in the main movement video.** For Wankai, include W, S, A, D, W+A, W+D, S+A and S+D as distinct labeled normal-speed demonstrations with live input highlights and visible body/contact response. Focused lift or attack clips supplement this complete video; they cannot replace it. Adapt the matrix to another game's actual controls.
- Preserve accepted identity, proportions and markings outside the requested edit. Keep visible weapons, attachment points, contacts and their velocities consistent. Separate cosmetic motion from physical control explicitly.
- Use the smallest rig/controller that satisfies the action. Do not assume soft appearance requires fur, extra joints or soft-body simulation. Do not impose the beagle's dimensions, bone count, controls or resources on other characters.
- Keep originals, editable sources, accepted exports and rejected studies distinct. Technical checks do not substitute for visual or playable acceptance.

## Start or resume

Read repository instructions, current status/handoff/control documents, existing character records and relevant assets/source. Identify the requested endpoint, selected identity, approved model and move versions, engine/camera conventions, technical budget, input/combat rules, current work and authorization already given. Preserve unrelated changes.

When new concepts are in scope, write a proportional provisional brief and manifest before generation. Accept a supplied reference, search with source links, or generate a seed as requested. Do not create a second selection process if the user already chose the reference. Record visual locks and unresolved choices; ask only for missing decisions that affect the work. An approved-model edit or integration resumes its existing records without requiring another concept brief.

For record outlines and templates, read [documents.md](references/documents.md) when creating or updating the character records. Keep records proportional to the task; combine related sections for a small edit and retain the existing document layout.

## Execute the appropriate stages

| Stage | Outcome and review |
| --- | --- |
| 1. Direction | Character brief plus selected reference/seed, appearance locks, gameplay role and normal/ability distinction. Review A selects that direction. |
| 2. Motion | Gameplay contract and videos explaining every move. Prototype unfamiliar mechanics cheaply before locking geometry. Review B agrees on new/changed motion. |
| 3. Reconstruction inputs | Consistent clean front, side and back images from the selected seed and validated proportions, with a Tripo operation/spending plan. Review C approves the exact packet and operation. |
| 4. Tripo base | Preserve the download, inspect actual geometry and open the real 3D candidate. Review D selects its appearance and proposed Blender work. |
| 5. Blender preparation | Cleanup, measured optimization, detail edits, appropriate rig and fitted contacts; export and reimport with the game's loader. Review E approves the actual asset, move videos and extreme-pose checks for integration. |
| 6. Integration | Implement the accepted behavior, selection/input/reset paths, contacts, cameras and UI. Verify and retain actual gameplay evidence; use the user's selected delivery format. Review F assesses playable behavior and recovery. |
| 7. Handoff | Update current-state records, decisions, provenance, verification and delivery status. Push/merge/release within the user's authorization. |

Use only the rows and reference sections relevant to the current scope. Read [motion-and-reviews.md](references/motion-and-reviews.md) before presenting or changing motion, preparing an affected approval milestone or handling a rejected result. It defines video coverage, review boundaries, spending/retry behavior and return paths.

Read [production.md](references/production.md) before preparing reconstruction inputs, using Tripo, editing/rigging in Blender or integrating the export. Prepare the required front/side/back set and inspect current multi-view slots, tool capabilities and Tripo settings instead of assuming historical versions or prices. This three-view requirement is the user's workflow standard; image-only requests still stop at their requested endpoint.

For new weapon anatomy, prove its functions before final mesh work. In Wankai, demonstrate ordinary W/S and A/D, all four combinations, support-driven travel, release/reversal, hits, blocks/clashes and recovery; add the approved ability lifecycle. In other games, adapt the action matrix to their actual rules. Authored concept motion must be identified as such, with remaining solver work explicit.

## Reviews without repeated permission requests

Prepare the concrete reviewable result before asking. Identify the exact artifact/version, decision needed and next action. Combine reviews when they address one completed packet. Reuse approval and delegated choices already given within scope; do not stop for each routine repair, export, test or documentation update. Silence is not approval for dependent work.

Keep appearance selection, credit authorization, technical verification and playable acceptance separate. A new candidate or changed mechanic only reopens affected decisions. Ordinary character work does not authorize unrelated global balance changes or publishing. Existing scoped authorization remains valid.

If a required tool or video capability is missing, report the exact gap and continue independent permitted work. Do not silently replace Tripo, omit required videos or declare a review complete. Use available specialists and tools; a Blender MCP bridge, API key or automatic rigging service is not inherently required.

## Verify and deliver

Verify the artifact delivered by the requested stage. For an exported asset, check scale/axes/rest transforms, deformation at extremes, attachments, contacts, materials, independent instances and clips that do not override physical controls. For runtime integration, test implemented transitions/velocities, run relevant regressions and the build, inspect the real game and capture matching gameplay evidence. Deliver through the user's selected format. Image/input/model-only endpoints do not require the later runtime checks; UI-only work uses its screen/interaction checks above.

If a move looks wrong despite passing tests, reproduce the reported input/view/state and return to the affected contract, rig or controller. Do not fix a physical error only by moving the render mesh. Preserve the accepted appearance while diagnosing mechanics.

Update the selected/current version pointers, source/archive paths, provenance, motion reviews, model/runtime handoffs, verification and decision history. Say which results are local, verified, accepted, pushed/merged or released. A merged source checkpoint is not an installer.

Read [beagle-lessons.md](references/beagle-lessons.md) when weapon anatomy, soft appearance, motion rejection or conflicting controller coverage needs a worked example. Its lessons are self-contained; if this is Wankai, locate docs/BEAGLE_DESIGN_PROCESS.md for the full project history.
