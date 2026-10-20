# Character records and templates

These are logical records, not a requirement to make nine separate documents for a small edit. Reuse repository conventions and existing records. Record facts and actual decisions; leave unknown data explicitly unknown instead of inventing measurements, costs or approvals.

## Required records

| Record | Required content and update point |
| --- | --- |
| DESIGN | Draft before new concept generation: identity, appearance locks, references, proportions, materials, expression, game/camera context and requested changes. Refine after selections. |
| PLAN | Before unfamiliar mechanics/final proportions: normal and combined controls, weapon functions, movement source, ability lifecycle/resources, geometry, motion ownership and acceptance cases. |
| MOTION | Whenever moves are proposed/changed/implemented: every move and relevant input combination, mandatory before/after videos, timecodes, versions, motion type, results and decisions. |
| Manifest/reference packet | Start with the brief: stable character/asset IDs, selected/current pointers, inputs/views, source/export/archive paths, target conventions/budgets and separate review states. |
| Provenance | At source acquisition/generation/edit: original URLs/files/hashes, prompts, tools/settings/operation IDs, observed charges, edits and reuse information. |
| MODEL | Selected base and finished asset: measured geometry/material/texture/rig data, axes, pivots, sockets, bind pose, ownership, clips, contact fit, rebuild/export steps and limitations. |
| Verification | During motion/asset/game checks: exact artifact/version, commands/results, measured errors, videos/screenshots and separate user acceptance. |
| GAMEPLAY | During integration: current controls, implementation/state machine, tuning/resources, reset behavior, source paths, tested modes, limitations and delivery status. |
| HISTORY | Append decisions and feedback: accepted/rejected versions, reason for changes, superseded choices, approvals and lessons. |

Update shared project status, controls/help and changelog at a playable handoff. Reuse an existing environment setup record instead of reinstalling tools for each character.

## Stage checkpoints

For a stage-only task or explicit stop, add a short entry to the existing handoff/manifest with the requested endpoint, current stage, delivered artifact/version, approvals and constraints already in force, unfinished work/pending decisions and next action. A few lines suffice; do not create a new document or populate every record above for each stop. Preserve partial work honestly without marking the whole character complete. On resume, use this checkpoint and selected/current pointers to continue the requested range without repeating completed work or re-requesting existing approval. Once an authorized production task can continue, a stage boundary alone is not a reason to stop.

## Suggested layout

Follow existing conventions first. A new layout can place DESIGN.md, PLAN.md, MOTION.md, MODEL.md, GAMEPLAY.md and HISTORY.md under docs/characters/character-id/. Keep the manifest and per-version provenance/verification beside concepts/inputs, editable Blender files and raw downloads in the authoring/archive area, runtime exports in the game's asset area and review videos/pages in its preview area.

Do not infer selection from the highest version number. Store explicit selected-base, selected-model and current-runtime pointers. A motion revision and model revision have different version sequences.

## Design brief outline

```markdown
# Character name and design

Status and requested endpoint

## Game context
Engine, platform, cameras, game-scale read, units, import conventions and budget.

## Identity and references
Selected source/seed, recognizable landmarks, personality and source records.

## Appearance locks and permitted changes
Preserve versus change, proportions, palette, materials and expressions.

## Gameplay role
Normal actions, weapon anatomy, special abilities and proposed tradeoffs.

## Geometry constraints
Reach, attachments, clearance and any validated support dimensions.

## Review and current selection
Artifact/version, actual user decision and remaining choices.
```

## Plan and motion record outline

```markdown
# Character movement and implementation

## Gameplay contract
Inputs, combinations, movement source, physical/cosmetic ownership and recovery.

## Ability lifecycle
Activation, duration, resource source, cancellation/interruption, expiry,
rearming/cooldown and normal-input compatibility. Mark inapplicable parts.

## Implementation stages
Blockout, functional solver proof, production geometry, rig and integration.

## Move videos
| Move/input | Before video and segment | Motion type | Model/controller | User decision | Actual gameplay video |
| --- | --- | --- | --- | --- | --- |

## Acceptance scenarios
Ground/contact behavior, combinations, release/reverse, impacts, interruptions,
landing/recovery, reset and relevant opponent/mode combinations.

## Findings and next decision
What was demonstrated, what remains unproven, and affected scope.
```

Keep the plan and motion record separate when repeated iterations would bury the current contract. Every proposed/changed move in scope needs a before video; implemented motion needs retained actual-game footage. User-facing delivery may open the live game instead of presenting that footage again. An appearance-only or UI-only task has no invented motion requirement.

## Model and runtime handoff outline

```markdown
# Character model and runtime handoff

## Selected sources and exports
Tripo source operation/file, Blender file, texture sources, runtime export,
hash/version, viewer and recoverable raw-source archive.

## Actual asset measurements
Triangles, textures, materials/draw groups, bones/influences, byte size,
units, axes, origin, sockets, bind pose and budget deviations.

## Rig and contact ownership
Bone responsibilities, clip exclusions, physical/cosmetic transforms,
fitted proxies and measured fit/clearance limits.

## Current gameplay
Controls/state machine, abilities/resources/tuning, modes, clones/materials,
camera behavior, pause/focus/reset and integration source files.

## Rebuild and verification
Actual commands, import/pose/contact tests, relevant regression/build results,
before/after move videos, visual review and playable acceptance separately.

## Delivery and remaining work
Local/merged/released status, limitations and next playtest.
```

## Machine-readable record shape

Use this as a field guide; adapt it to the repository's manifest rather than replacing an established schema. Populate IDs/paths from real artifacts. Null values below represent unknown/unperformed states, not approval or a zero charge.

```json
{
  "schema_version": 1,
  "character_id": null,
  "workflow": {
    "requested_endpoint": null,
    "current_stage": null,
    "next_action": null,
    "pending_decisions": []
  },
  "selected": {
    "reference": null,
    "tripo_base": null,
    "blender_source": null,
    "runtime_export": null,
    "runtime_revision": null
  },
  "inputs": [],
  "assets": [],
  "operations": [],
  "moves": [],
  "reviews": [],
  "verification": [],
  "delivery": {"local": null, "merged_commit": null, "release": null}
}
```

Populate list entries with these fields where applicable:

- **Input:** id, repository-relative path/hash, view, pose, seed version and selection decision.
- **Asset:** id/version, source/derivative/runtime role, path/hash, archive location, measured properties and source operation.
- **Operation:** tool/model/mode, date, operation ID, prompt/input files, settings, observed credits, output files and authorized scope. Never store credentials or account secrets.
- **Move:** action/input combinations, preview file/timecodes, authored/simulated/gameplay type, model/controller version, actual-game video, demonstrated functions and open limitations.
- **Review:** stage, artifact/version/hash, date, actual user instruction or delegated authority, accepted scope, constraints and superseded decision. Do not invent approval from silence.
- **Verification:** artifact/version/hash, command/scenario, actual result and measured error, evidence paths and remaining limitations. Keep technical pass, appearance selection and playable acceptance distinct.
- **Workflow:** requested endpoint/range, actual current stage and next action, with genuinely pending decisions. Reuse the existing review/asset entries for approvals and delivered artifacts instead of duplicating them into a second schema.

Record observed credits as unknown when unavailable; do not substitute a displayed quote for a measured charge. Only mark a stage complete after the artifact/action exists and required review is satisfied.

## Beagle document mapping

When working in Wankai, locate these from its repository root:

| General record | Existing example |
| --- | --- |
| Design | docs/BEAGLE_CHARACTER_DESIGN.md |
| Plan | docs/BEAGLE_PROTOTYPE_PLAN.md |
| Motion | docs/BEAGLE_MOTION_STUDY.md and docs/BEAGLE_NORMAL_SKILL_PREVIEW.md |
| Manifest/provenance | assets/concepts/beagle/manifest.json and tripo-v02/v04/v05 provenance records |
| Model | docs/BEAGLE_MODEL_V05.md |
| Runtime | docs/BEAGLE_SPIN_SKILL.md |
| Verification | assets/concepts/beagle/tripo-v05/verification.json and current test/browser evidence |
| History | docs/BEAGLE_DESIGN_PROCESS.md |

The beagle history explains earlier experiments. Its latest runtime handoff controls current behavior; old labels and screenshots do not override it.
