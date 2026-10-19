# Character Creation Workflow Skill Specification

Prepared 19 October 2026. Status: implemented as the [game-character-pipeline skill](../skills/game-character-pipeline/SKILL.md), with the user's required Tripo generation and move-video rules. A matching copy is installed in the account's Codex skills directory. This document retains the detailed workflow specification.

The intended skill takes a character idea, supplied reference, image-search request or image-generation request through design, motion validation, reconstruction references, a Tripo-generated 3D base, Blender preparation and playable integration. It preserves the user’s visual choices and the game’s mechanical rules at every stage.

This specification generalizes the [beagle design record](BEAGLE_DESIGN_PROCESS.md). The improved sequence is **understand the game → define the character → present every proposed move through video and validate unfamiliar mechanics → approve reconstruction inputs → generate the base in Tripo or resume its approved Tripo base → prepare and approve the actual asset in Blender → integrate → playtest and record**. Appearance and mechanics can develop in parallel, but geometry-dependent movement must be demonstrated before final proportions and rigging are locked.

**User requirement, 19 October:** always use videos to present the assistant’s understanding of any character move. This applies to ordinary moves, combined inputs, abilities, transitions and recovery, including moves that reuse an existing controller.

**User requirement, 19 October:** always use Tripo to generate a new character’s 3D base. Blender refines, optimizes and rigs that selected base. An approved existing Tripo base can be retained for revisions; a local edit does not automatically require generating the character again.

Skill name: **game-character-pipeline**. Its role is to coordinate the complete production workflow. Existing character-design, create-game-assets, rigging and model-loading skills remain focused supporting capabilities. Its entrypoint contains the essential rules and routes to four supporting references for production, motion/reviews, document templates and beagle lessons.

## Scope and starting point

The workflow applies to a new playable 3D character, a substantial revision to an existing one, or a requested stage of that production process. Tripo is the required base-generation step, followed by Blender preparation as needed, a compatible runtime export and inspection in the actual game. Primitive Blender blockouts remain useful for motion videos; they do not replace the Tripo-generated production base.

Respect the requested endpoint. A concept request ends with a concept; a model request does not automatically authorize gameplay changes. A complete character implementation includes the relevant asset, controls, contacts, selection/reset paths and playable verification. Resume an existing character at its earliest unfinished stage rather than generating a new design every time.

Read the repository instructions, current design/status/control documents, existing assets and relevant source before choosing the route. Identify the engine, platform, camera, world scale, import conventions, performance budget, ordinary movement/combat rules and player controls. Preserve local changes and established approved choices.

For Wankai, the minimum context is [project status](PROJECT_STATUS.md), [design handoff](DESIGN_HANDOFF.md), [control system](CONTROL_SYSTEM.md), [PRD](PRD.md) and [skills guide](SKILLS.md), plus the selected character’s current records. Use the [beagle history](BEAGLE_DESIGN_PROCESS.md) as a worked example rather than treating its dimensions and controls as defaults for other characters.

## Rules that govern the workflow

1. **Function and appearance are designed together.** Features that attack, block, support weight or affect reach need a gameplay contract before their final geometry is approved.
2. **Approved identity is preserved.** List the face, proportions, markings, palette and other landmarks to retain. An ear-width edit must not silently redesign the face or body.
3. **A visual reference is not a functioning character.** Images establish appearance; a generated mesh establishes a candidate surface; a rig establishes controls for that surface. Movement, damage and contacts require runtime implementation.
4. **Use the game’s authoritative motion.** Visible weapons, sockets, hurt shapes and contacts must agree in pose and velocity. Cosmetic motion must stay within the declared contact tolerance or participate in the physical transform.
5. **Add only the complexity needed.** Soft-looking shapes do not automatically require fur, soft-body simulation, flexible chains, IK or a full ragdoll. Choose the smallest rig and controller that meet the intended action.
6. **Validate the complete action.** Preparation, input combinations, release, reversal, interruption, landing and recovery matter as much as the most attractive mid-action pose.
7. **Treat approvals as specific decisions.** Record the exact artifact and version, the accepted scope and any constraints. Appearance approval does not establish gameplay acceptance; credit authorization does not establish visual acceptance.
8. **Keep authorization persistent within its scope.** Reuse already given approvals and budgets. Do not repeatedly ask for permission to inspect, repair, export, test or document work already authorized.
9. **Preserve sources and accepted checkpoints.** Keep originals, editable files, export versions and rejected studies distinct. Current-model and current-runtime pointers must be explicit.
10. **Make completion verifiable.** Technical checks, visual review and hands-on acceptance answer different questions. Report each separately, including the remaining limitations.
11. **Present every proposed move through video.** Before implementing a new or changed move, show the intended behavior in a labeled video for motion review. Written descriptions, static poses and interactive prototypes may accompany it but do not replace the video. Show actual gameplay video again after implementation.
12. **Generate production character bases in Tripo.** Do not substitute a Blender-only character or another generator because the form looks easy to model. Use Blender for the required refinement and rigging of the selected Tripo base. Resume an already approved Tripo source for later edits rather than regenerating it without a reason.

These rules do not impose the beagle’s one-hinge construction, thirteen bones, 3.60-unit ears, F binding, five-second skill or 200 stamina on other characters. Those were project-specific outcomes. A new character inherits the game’s current defaults unless the user approves changing them.

## Production stages and review points

### Stage 1 Understand the request and assemble references

Resolve whether the user is supplying an identity reference, requesting image search, requesting generation, or asking to revise an existing asset. Preserve supplied originals before editing. For a collage, choose the intended character/expression/outfit and derive a clean individual subject; do not combine every pose and costume.

Write a provisional design brief and create the asset manifest before generating new concepts. Infer routine implementation details from the project; ask only for missing choices that materially affect identity, controls, scope or spending. Keep unknowns as proposed choices rather than silently recording them as approved.

For search, present a small relevant selection with original-source links and identify the selected reference. For generation, create a coherent initial concept from the provisional brief. Refine the brief after selecting the seed. If an exact supplied image is already the chosen direction, record that choice instead of reopening selection.

**Review A — design direction:** show the reference or seed concept with a short visual/gameplay brief. The user chooses or approves the identity, the features that must remain unchanged and the intended normal/skill distinction. If these decisions are already explicit, proceed using that authorization.

### Stage 2 Define the gameplay contract and present every move through video

Before final production geometry, specify the normal actions, combined inputs, active weapon surfaces, body response, movement source, resource rules, and recovery behavior. Separate ordinary moves from special abilities. State whether an ability uses a tap, hold, duration, stamina, charges or cooldown, and how it ends or is interrupted.

Where a body feature is a weapon or support, estimate reach, attachment height, clearance and leverage. A skeleton does not supply missing leverage or thrust. Establish which motion is physics-driven, procedural, authored or cosmetic.

For a new mechanical idea, build a cheap blockout or solver replay before expensive modeling. In Wankai, demonstrate W and S, A and D, W+A, W+D, S+A and S+D, release, reversal, ground support, vertical/horizontal hits, a weapon clash and return to a controllable stance. Add the proposed skill and its interaction with normal input when relevant. For another game, adapt this matrix to its actual controls.

For every proposed move, produce a short labeled video presenting the intended behavior, whether the controller is new or reused. An interactive prototype may accompany the video. Keep comparable camera views and scales, show input state, include slow motion where contact is unclear, and label any scripted travel or test-launch force. If an authored clip is used to communicate an idea, also identify what still needs proving in the runtime solver. Use the detailed video requirements below.

**Review B — motion understanding:** show videos covering all proposed moves, their demonstrated functions, unproven parts and relevant dimensions. Obtain agreement on new or changed motion before implementing it or locking production geometry around it. A character using an accepted standard controller can use a short compatibility video instead of a new physics-research phase; it still needs video presentation. An unchanged move may reuse its matching, previously approved video with its version clearly identified.

If the motion fails, revise the controller or geometry before polishing the mesh. Do not keep adding animation complexity to hide insufficient lift, excessive coverage or unstable recovery.

### Stage 3 Prepare reconstruction images from the selected design

Create a reconstruction packet from the approved seed and the dimensions that survived the motion check. Keep the same character, pose, scale, markings and materials across views. Use a neutral pose that separates important body parts and exposes the intended attachment areas. Any shortened or simplified generation feature must be documented with its planned Blender correction.

Three views are useful for a design turnaround, but are not a compulsory input count. Tripo’s current help recommends a front three-quarter image for a single-view attempt, and consistent multi-view inputs when hidden geometry matters. Front, side and back are an appropriate multi-view set when rear design and proportions need specifying. Its documented multi-view workflow accepts two to four views. See [Tripo’s multi-view guidance](https://www.tripo3d.ai/help/features/how-to-use-multi-view-input-effectively), checked 19 October 2026.

Choose the actual input route after inspecting the currently available Tripo mode and requirements:

| Need | Proposed production choice |
| --- | --- |
| Simple readable design; hidden surfaces can be inferred | Start with one clean front three-quarter image. |
| Rear costume, tail, markings or weapon attachment matters | Add consistent front/side/back views in a supported multi-view mode. |
| Important asymmetry remains hidden | Include the additional relevant side if the chosen mode supports it. |
| An approved Tripo model already exists for this character | Inspect and edit or segment that source; do not generate images and a replacement model automatically. |
| An existing reference model was made elsewhere | Use it as an approved reference for Tripo generation rather than silently bypassing the required Tripo step. |
| Precise details are easier to author directly | Generate the character base in Tripo, then add or refine those details in Blender. |

Separate design presentation from machine input. A labeled turnaround or mood board can help the user, while submission images should be individual, clean files matched to the selected tool’s input slots. Do not upload a multi-character collage into a single-subject input and expect a coherent reconstruction.

Check whole-subject framing, unclipped extremities, clear separation of parts, consistent landmarks and useful background/alpha. Derive extra views from the selected seed and inspect them; do not independently regenerate the character from scratch for each angle. A plausible generated rear view is a proposed design choice until reviewed.

**Review C — reconstruction packet and generation plan:** present the exact images to be submitted, their purpose, the intended Tripo operation and the spending scope. Approval covers this packet and operation, not every later identity change. Reviews A and C may be combined when the packet is already complete and its constraints are clear.

### Stage 4 Generate the base in Tripo and review the actual 3D result

Generate each new character’s production base with Tripo, using the requested available access method, including browser/computer use. When continuing this character, reuse its selected Tripo base if generation and base approval are already complete. Inspect current options and charges; do not reuse historical prices as current quotes. Preserve existing character-specific credit authorization. A prior budget for the beagle does not become blanket authorization for future characters.

If Tripo is unavailable, report the missing capability and continue independent design or motion work. Do not silently replace it with another generator or a finished Blender-only base. A change to the required generation route needs an explicit user instruction.

Default to a candidate for the selected direction rather than a large speculative batch. Record prompts, input files, selected mode/version, operation IDs, observed charges and outputs. If an attempt fails, diagnose the cause before another paid attempt. Another attempt needs a concrete correction and must remain within the authorized scope; seek a decision if the budget or design must change. Do not loop paid generations without a reasoned change.

Download and preserve the original export. Inspect the actual mesh from multiple angles, including the back and underside where relevant. Check silhouette, identity, seams, fused parts, missing volume, topology, texture artifacts, file size and whether a rig actually exists.

Open the real model in a browser viewer or Blender and show the user a link or file they can inspect. State whether the item shown is a concept image, Tripo preview, downloaded model or runtime export.

**Review D — actual base model:** show the reconstructed 3D candidate and the specific Blender work proposed. The user approves its overall appearance before substantial finishing. Small diagnostics and reversible preparation needed to make that review usable can be completed first. A concept-image approval alone does not select a faulty reconstruction.

If local repair preserves the chosen design, prefer it. Use segmentation when parts need separation. Regenerate when the underlying form is wrong or repair is impractical, with the revised direction and spending scope made clear.

### Stage 5 Prepare the model and rig in Blender

Start with the selected Tripo source, keeping the original intact. Apply only the authorized changes and record their visual and gameplay effects. For example, extend an ear’s middle while preserving its rounded root/tip and the accepted face; do not stretch the entire character to obtain weapon reach.

Inspect and repair topology, normals, unintended holes and reconstruction noise. Close surfaces that are intended to be solid; do not force deliberately open clothing or other legitimate surfaces into a watertight requirement. Reduce geometry and textures to a measured project budget while preserving the selected silhouette and markings. Document any necessary revision to that budget.

Finalize the relevant topology before production rigging. Design a minimal hierarchy with stable names, useful pivots, explicit axes/units and normalized weights. Keep bind transforms correct, respect the target engine’s influence limits and test extreme poses. Automatic weights are a starting point when appropriate, not proof of correct deformation. Rigid weapons can use deliberate rigid weights; deforming joints need appropriate transitions.

Specify motion ownership: root/body physics, physical weapon bones, authored animation and cosmetic posing. Keep baked clips from overriding runtime-controlled bones. Blender constraints need baking or a deliberate runtime equivalent; exporting an armature does not export a live game solver.

Fit simplified weapon contacts and hurt shapes to the selected geometry. Test full required sweeps, attachments, body clearance and any skill deployment, including the transition. Decide explicitly whether secondary motion changes collision or stays within a cosmetic allowance.

Export a runtime-compatible asset, GLB for Wankai, plus the editable Blender source. Reimport with the game’s actual loader and check bones, rest transforms, skinning, material/texture appearance and independent clones. A successful Blender render is insufficient.

**Review E — finished asset before integration:** provide the actual export in a model viewer, front/side/rear inspection, videos of the required moves and extreme-pose checks, and a concise technical report. Show the changes relative to the selected base and remaining limitations. The user approves this asset for game integration. Do not interrupt for every mesh cleanup, weight correction or routine re-export already covered by the selected work.

### Stage 6 Integrate locally and prove the complete character

Use the accepted controller and asset dimensions. For body-mounted weapons, implement the attachment transform and contact velocities instead of copying a floating weapon’s offset. Drive the rendered skeleton and contacts from the same state, including any deployment and lag transitions.

Integrate the smallest appropriate character/loadout entry. Reuse the existing selection flow where possible; do not add a general equipment system unless requested. Include loading/fallback behavior, independent instances/materials, camera bounds, UI/help, P1/P2 inputs, pause/focus loss, rematch and reset handling.

Preserve shared combat and resource rules unless the user requests a change. Paired weapons need deliberate attack, motor, resource and repeat-hit budgets; their mesh count must not automatically multiply damage or cost. A character ability’s scope, duration and resource source must agree with the approved contract.

Run meaningful focused regressions, the relevant existing suite and the production build. Inspect actual gameplay in the relevant modes and against representative opponents, including another instance of the same character. Show hits and near misses, support, blocks, clashes, release/reversal, interruptions, expiry and recovery. In Wankai, include all mixed loadout pairings when contacts change, with solo/practice and both duel camera modes as relevant.

**Review F — playable acceptance:** provide a playable local scene and actual gameplay videos tied to the approved motion previews. Show each implemented move and relevant combinations, including its ending/recovery. Report verified mechanics, test/build results and what still needs hands-on judgment. A test pass cannot override a user report that the character is lying down or otherwise behaving incorrectly. Reproduce the report and return to the affected stage.

### Stage 7 Record and deliver the accepted checkpoint

Update the canonical current-state records, controls/help, model handoff, project status and changelog. Keep a concise history of decisions and rejected branches with their reasons. Identify the selected input, source model, Blender rig, runtime export and source revision.

Distinguish local implementation, technical verification, user acceptance, pushed/merged source and packaged release. Push, merge or publish only within the user’s authorization; reuse authorization already provided for that action and scope. Do not add an unnecessary new confirmation when it is already authorized.

Archive large originals and generated diagnostics according to repository policy. Keep editable sources or a documented recoverable archive. Make the included runtime asset self-contained so playing the game does not depend on Tripo, Blender, external texture URLs or a local authoring folder.

## Video requirements for every move

- **Coverage:** present every proposed new or changed move through video, including ordinary movement, attacks, steering, simultaneous inputs, abilities and their transitions. A character using familiar controls is not exempt. An appearance-only task does not require inventing new moves.
- **Before implementation:** show the assistant’s understanding of the intended motion for user review. A simple blockout is sufficient before the finished asset exists; use the selected character when available. Identify which parts move, how the body and weapons relate, and what causes travel or lift.
- **Complete action:** include preparation, active motion and return to a useful state at normal speed. Show release, reversal, interruption, ability expiry, landing and recovery where relevant. Add slow motion for difficult contacts without replacing the normal-speed example.
- **Inputs and combinations:** label keys or actions, movement direction and whether the example is ordinary movement or an ability. Show the relevant combined inputs, not only isolated single-key actions. One video may contain clearly labeled segments for several moves; separate files are not required for every input.
- **Honest representation:** label authored concepts, blockout simulation, solver replay and actual gameplay distinctly. Identify test-launch forces and scripted translation. A polished concept video does not establish functioning game physics.
- **After implementation:** capture the actual game and compare it with the approved preview, covering the same actions and recovery. A model viewer, written report, screenshots or passing tests cannot replace this footage.
- **Record and reuse:** save a playable video link/file, move and input coverage, timecodes when useful, model/controller versions, simulation type and user decision in the motion record. Reuse a previously approved video only when the relevant motion is unchanged; update affected segments when its behavior changes.
- **Missing capability:** if video production is unavailable, report the missing deliverable and preserve independent work. Do not substitute static images or an interactive scene and treat the video review as complete.

## Documents and records to create

These are logical records. They can share files for a small asset, but the information must remain identifiable. Reuse an existing character’s records rather than producing duplicate briefs. Do not copy the beagle’s many historical study files as mandatory paperwork for every character.

| Record | When and required contents | Beagle precedent |
| --- | --- | --- |
| Character design brief | Start in Stage 1. Identity landmarks, visual locks, silhouette, proportions, palette/materials, expression, reference sources, game/camera context, what changes and what stays. Update after accepted geometry changes. | [BEAGLE_CHARACTER_DESIGN.md](BEAGLE_CHARACTER_DESIGN.md) |
| Gameplay contract and implementation plan | Before unfamiliar motion or final geometry. Normal controls, combinations, mechanics, contacts, movement source, ability lifecycle/resources, dimensions, motion ownership, constraints, acceptance scenarios and integration scope. | [BEAGLE_PROTOTYPE_PLAN.md](BEAGLE_PROTOTYPE_PLAN.md), plus [BEAGLE_SPIN_SKILL.md](BEAGLE_SPIN_SKILL.md) for the later skill contract |
| Asset manifest and reference packet | Start in Stage 1; update at each selection/export. Stable IDs, input/view files, original versus derivative roles, selected/current pointers, paths, coordinate/scale/budget targets and review status. | [manifest.json](../assets/concepts/beagle/manifest.json) |
| Motion and video review record, whenever moves are in scope | Stage 2 and after implementation. Every move and relevant input combination, video links and segment timecodes, dimensions, model/controller versions, authored/simulated/gameplay status, checks, user feedback, next decision and rejected alternatives. | [BEAGLE_MOTION_STUDY.md](BEAGLE_MOTION_STUDY.md), [BEAGLE_NORMAL_SKILL_PREVIEW.md](BEAGLE_NORMAL_SKILL_PREVIEW.md) |
| Generation and provenance record | When searching, generating, downloading or editing sources. Source URL/tool, references/prompts, operation settings, date, output IDs, observed charges, original file/hash, modifications and applicable reuse information. | [v02 provenance](../assets/concepts/beagle/tripo-v02/provenance.json), [v04 provenance](../assets/concepts/beagle/tripo-v04/provenance.json), [v05 provenance](../assets/concepts/beagle/tripo-v05/provenance.json) |
| Model and rig handoff | Stages 4–5. Actual source/export, topology/texture/material/bone measurements, axes, units, origins, sockets, bind pose, control ownership, exported clips, contact fitting, rebuild steps, limitations and review links. | [BEAGLE_MODEL_V05.md](BEAGLE_MODEL_V05.md) |
| Verification record | Generated during Stages 2, 5 and 6. Artifact version/hash, commands and results, geometric/contact errors, engine import/clone checks, gameplay regressions, browser evidence, user acceptance and unresolved issues kept distinct. | [verification.json](../assets/concepts/beagle/tripo-v05/verification.json), [skill verification section](BEAGLE_SPIN_SKILL.md#verification) |
| Runtime handoff and project updates | Stage 6 onward. Current controls/state machine, integration paths, tuning, resources, reset behavior, known limitations, local versus merged status and next playtest. Update the shared status/control/changelog records. | [BEAGLE_SPIN_SKILL.md](BEAGLE_SPIN_SKILL.md), [PROJECT_STATUS.md](PROJECT_STATUS.md), [CONTROL_SYSTEM.md](CONTROL_SYSTEM.md), [CHANGELOG.md](../CHANGELOG.md) |
| Design history and decision log | Append decisions throughout; consolidate at handoff. What was tried, what the user accepted/rejected, why it changed, superseded versions and reusable lessons. | [BEAGLE_DESIGN_PROCESS.md](BEAGLE_DESIGN_PROCESS.md) |

The reconstruction packet is approved files plus a description of their views and purpose; it does not require an extra standalone document if the brief/manifest already covers it. Environment setup is likewise a shared project record: reuse [BLENDER_SETUP.md](BLENDER_SETUP.md) when the environment already works, rather than reinstalling Blender for each character.

A practical per-character layout is a documentation folder containing DESIGN.md, PLAN.md, MODEL.md, GAMEPLAY.md and HISTORY.md, with MOTION.md whenever moves are proposed, changed or implemented. Keep a manifest and per-version provenance/verification beside the concept assets, editable .blend sources in the authoring area, runtime GLBs in the game asset area and review pages/videos in the preview area. Follow repository conventions over these example names.

## Approval records and revision behavior

For each user decision, record the stage, exact artifact/version or hash, date, user instruction, accepted scope, constraints and which prior choice it supersedes. Keep separate fields for visual selection, technical verification and playable acceptance. Preserve the scope of any credit budget and publishing authorization without exposing account credentials or private financial details.

At a review, show the concrete result first. State what decision is needed and what the next action entails. Offer a clear recommended route with the actual files or playable link. If approval is required, wait for the answer before dependent work. Silence and elapsed time are not approval; independent checks and documentation may continue.

Combine reviews when one concrete approval can answer them together. Skip a redundant review when the user already approved the exact result or explicitly delegated that choice. Reopen only the affected decision if the scope changes. Do not ask the user to approve the same smooth face again just because a contact fit or export was corrected.

| Feedback or failure | Return to |
| --- | --- |
| Wrong expression, body proportions or style | The design seed and reconstruction packet; retain accepted landmarks. |
| Bad hidden geometry or fused moving parts | Inspect the base and choose repair, segmentation or revised reconstruction inputs. |
| Joint clipping, bad weights or incorrect export axes | Blender preparation and import checks. |
| Insufficient support, control conflict, lying-down recovery or excessive coverage | The gameplay contract and motion prototype before further asset polish. |
| Correct isolated model but wrong game contacts or rendering | Runtime transforms, measured profile and integration checks. |
| Budget or requested scope must change | A concrete user decision for that change, using the completed diagnosis and alternatives. |

## Steps and assumptions to avoid

- Do not start by generating an attractive model and invent its functional controls afterward. New weapon anatomy can require different length, joints or clearance.
- Do not require three views, a T-pose, a full humanoid skeleton or multi-view reconstruction for every character. Choose those details based on the design, current Tripo mode and game pipeline; Tripo base generation itself remains required.
- Do not skip Tripo base generation, replace it with another generator or build the finished character entirely in Blender without an explicit change from the user. Blockouts and later Blender detail work are separate from base generation.
- Do not send inconsistent angles, different poses/outfits, obstructed parts or a multi-character collage as one reconstruction target.
- Do not regenerate the face/body for an approved local weapon edit unless that wider redesign is necessary and authorized.
- Do not equate “soft” with fur strands, scallops, extra folds or passive physics. Establish which visual and mechanical quality the user wants.
- Do not add extra joints merely to make one authored action fit; account for their controls, contacts, export and recovery cost.
- Do not present a scripted jump or external test launch as proof of contact-driven movement. Do not present a concept image as the downloaded 3D model.
- Do not present an understanding of a character move only through prose, static poses or an interactive prototype. Always include video, including for familiar moves and combined inputs.
- Do not approve a flip by looking only at its airborne frame. Show landing and return to useful control, with simultaneous inputs still working.
- Do not leave a rigid invisible weapon behind independently animated visible ears, wings, tails or blades. Do not enlarge all hitboxes to hide a bad fit.
- Do not assume generated topology, auto-rigging, automatic weights or Blender constraints are ready for the game without inspection and engine import checks.
- Do not implement an oversized area attack on ordinary steering without resolving coverage and control conflicts. A separate ability may be more appropriate.
- Do not add or change stamina costs, cooldowns, global settings or unrelated weapon rules as a substitute for an agreed ability design. The beagle’s resource revision was explicitly requested.
- Do not hard-code the beagle’s dimensions, bone count, resource values or rejected appearance choices as universal production rules.
- Do not overwrite the selected model, discard source provenance, or infer the current approved state from a filename’s version number alone.
- Do not keep buying retries without correcting a diagnosed problem, or repeatedly ask for spending authorization already granted within scope.
- Do not call an asset accepted because tests pass, call local work merged, or call a merged source checkpoint a packaged game release.

## What the future skill package should contain

The eventual SKILL.md should describe when to use the workflow, how to resume the appropriate stage, the essential invariants, required Tripo base generation, mandatory video presentation for every move, review behavior and completion criteria. Detailed image/Tripo guidance, video requirements, Blender/runtime checks and concise document templates can live in supporting references. Read those references only when their stage applies.

Use the beagle case as a short example of decisions and failure modes, with a project-relative link where available. The skill’s essential rules and templates must remain usable without this particular repository or its raw Tripo archive. Do not make a globally installed skill depend on the author’s absolute local file paths.

Reuse relevant specialist skills when available, inspect actual tool capabilities and choose a working access route. Do not require unavailable MCP tools or install an automation bridge by default. Missing optional tools should lead to a suitable alternative; missing required capability should be reported with the remaining deliverables preserved.

Only add scripts for repeatable operations with a demonstrated benefit, such as checking an export or validating manifest paths. Avoid a generic mesh-editing script that assumes every future character has the beagle’s topology or a universal installer that changes the user’s environment.

Before adopting the skill, validate its metadata and exercise realistic scenarios: a new reference-driven character, an already approved Tripo model needing one local edit, an unusual physics weapon, a character reusing familiar controls, an image-only request, unavailable Tripo access, insufficient spending authorization and a user rejection of motion despite passing tests. The expected behavior is correct scope, required Tripo generation for new bases, required move videos, useful review artifacts and a reliable return to the affected stage.

The portable skill source is [skills/game-character-pipeline](../skills/game-character-pipeline/SKILL.md). Its metadata, internal reference links and JSON template pass validation, and the installed files match the source hashes. The skill has not yet been exercised through a full new-character production run; it does not itself install Blender, create a Tripo account or spend generation credits.
