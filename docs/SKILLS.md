# Wankai development skills guide

Updated 20 October 2026.

Wankai uses Electron, React, React Three Fiber, Three.js, and a custom fixed-step physics system. The current local prototype includes the orange tabby and the full-window P1/P2 preparation page. Current priorities are hands-on selection/control/camera acceptance, the unresolved sword support-direction report and combat balance. Model-loading optimization remains deferred until requested; its costs still need measurement. The skills below help with that work.

This guide covers the **eight project skills installed in this workspace**, the new globally installed `game-character-pipeline`, and the globally installed `find-skills` used for discovery. A skill supplies instructions and sometimes helper scripts to the coding assistant; it does not add a gameplay feature or become a runtime dependency of Wankai.

## Installation and scope

The project skills live in the parent workspace:

```text
Game developing/
  .agents/skills/
    character-design/
    create-game-assets/
    grill-me/
    grilling/
    playwright/
    rigging/
    systematic-debugging/
    threejs-loaders/
  Wankai/
    docs/SKILLS.md
    skills/game-character-pipeline/
```

`grilling` and `grill-me` were already present. `systematic-debugging`, `threejs-loaders`, `playwright`, `create-game-assets`, `character-design`, and `rigging` were installed on 17 October 2026. New installations become available on the next assistant turn in this workspace.

The parent `.agents` directory is outside the nested Wankai Git repository. Cloning Wankai alone therefore does not copy these skills. Installation commands for another checkout are provided below. Other account-wide skills and plugin-provided capabilities are separate from this project's installed inventory.

`game-character-pipeline` was created and installed in the account's Codex skills directory on 19 October. Its portable source is included under `Wankai/skills/game-character-pipeline/`. It does not modify the parent `.agents` skills.

## Skills at a glance

| Skill | Main purpose | Useful Wankai task | Availability |
| --- | --- | --- | --- |
| `game-character-pipeline` | Coordinate the requested stage or authorized production range, reusing accepted references, assets and decisions | Deliver references only, prepare a Tripo model, revise an approved asset or integrate it into gameplay | Global; source included in this repository |
| `systematic-debugging` | Reproduce a problem and identify its cause before fixing it | Investigate sword support direction, collision misses, and camera/input confusion | Project |
| `threejs-loaders` | Load models and textures, handle failures, and manage loading patterns | Improve the GLB pipeline and investigate repeated armory loading | Project |
| `playwright` | Operate a browser and capture screenshots and traces | Check menus, weapon selection, pause, rematch, and viewport layouts | Project |
| `grilling` | Stress-test a design through structured questions | Decide weapon tradeoffs or evaluate a proposed control change | Project |
| `grill-me` | Explicit shortcut to the grilling workflow | Start a design interview deliberately | Project |
| `create-game-assets` | Define a consistent art direction and asset production pipeline | Keep the beagle and Three Kingdoms cast coherent and suitable for the game renderer | Project |
| `character-design` | Develop readable silhouettes, proportions, palettes, and character sheets | Explore the beagle's twin weapon ears and distinct designs for 刘备、关羽、张飞、吕布 | Project |
| `rigging` | Author skeletons, constraints, and skin weights in Blender | Prepare deforming ears and character animation for GLB export | Project; Blender authoring connection required |
| `find-skills` | Discover and evaluate additional skills | Find a focused skill when a new development need appears | Global |

## Game character pipeline

**Source:** [included skill instructions](../skills/game-character-pipeline/SKILL.md). The installed account copy is under `~/.codex/skills/game-character-pipeline/`. The [workflow specification](CHARACTER_CREATION_WORKFLOW_SPEC.md) and [beagle design history](BEAGLE_DESIGN_PROCESS.md) record the decisions behind it.

Invoke it with `$game-character-pipeline`. It handles the requested stage or authorized range of character production: references, motion review, reconstruction inputs, Tripo bases, Blender refinement, integration and handoff. Infer the endpoint from the request, reuse approved work and enter the earliest unfinished stage in scope. A concept-only request remains concept-only; integrating an approved model does not restart reference selection or generation. When the user authorizes a playable character or several stages, continue through that range without an automatic stop at every stage.

### Collaborator quickstart

In a checkout containing the updated package, name the installed skill explicitly in the prompt with `$game-character-pipeline` and state the requested endpoint. See [OpenAI's skill guidance](https://learn.chatgpt.com/docs/build-skills) for invocation and discovery conventions. If the skill is not installed or discoverable, tell the agent to read the repository's [skills/game-character-pipeline/SKILL.md](../skills/game-character-pipeline/SKILL.md) and use its relevant references directly; installation is not required to follow the included instructions. The repository's `skills/` folder is a portable source copy, not an automatic discovery location. The known installed path above belongs to this account; do not assume another agent has that installation.

| Goal | Example request |
| --- | --- |
| References only | `$game-character-pipeline Find reference images for this character and stop after I select one.` |
| Front/side/back inputs only | `$game-character-pipeline Create consistent front, side and back images from this approved seed; stop before Tripo generation.` |
| Model only | `$game-character-pipeline Prepare this approved Tripo model in Blender and deliver the runtime GLB only; do not integrate it into the game.` |
| Approved integration | `$game-character-pipeline Integrate this approved model and controller into Wankai, reuse the recorded approvals and open the game for review.` |
| UI only | `$game-character-pipeline Revise the selection screen while keeping assets, motion and contacts unchanged; verify screenshots and interaction flows.` |
| Authorized production range | `$game-character-pipeline Develop this selected reference into a playable character. Continue across the authorized stages, reuse approvals and ask only for genuinely missing decisions or spending scope.` |

To resume, point the agent to the existing character record and name the endpoint: “Use `$game-character-pipeline`; read the selected/current versions, approvals and latest checkpoint in this character's handoff, then resume the unfinished model work and stop at the approved export.” Keep the checkpoint in that existing record rather than creating a new document set.

The skill is the shared method; [project status](PROJECT_STATUS.md), the [collaborator handoff](COLLABORATOR_AGENT_HANDOFF.md) and character records define the actual project checkpoint, selected assets and remaining work. The current extensions and revised portable skill are collected on delivery branch `feat/orange-tabby-preparation`; use that branch until the user's integration agent merges it into `main`. That agent owns the merge and follows the handoff's cutoff/verification instructions. Invoking the character pipeline alone does not authorize a Git merge or publication.

The package contains the main instructions, UI metadata and four references for production, motion/reviews, document templates and beagle lessons. The authorized 20 October revision is synchronized to the installed account copy; the five modified files were verified byte-for-byte. The package has supported continued orange-tabby production and local integration; that does not establish an independent end-to-end trial of every branch from a fresh character.

Revision checks passed for metadata/UI YAML parsing with Ruby's standard YAML library, required names/descriptions/allowed fields, UI lengths/default prompt, internal relative links (none missing) and JSON templates. An independent read-only dry run covered four requests: image-only, approved-model integration with live review, UI-only changes and a delegated full production range. Each respected scope and review boundaries; no generation, Tripo operation or browser action was performed. The official `quick_validate.py` helper could not run because PyYAML was unavailable in the available Python environments; the structural checks above passed, but do not imply that helper or a fresh end-to-end production trial passed.

### Stage-scoped pipeline and applied refinements

The creator authorized these source changes on 20 October. Keep one umbrella pipeline with focused supporting references. Its seven stages describe the production map and decision types; they are not seven mandatory tasks or seven permission stops. Read only the references needed for the current stage. Preserve approval and spending boundaries when a decision is actually missing, and reuse approvals/delegated choices already given.

The package now distinguishes:

1. **Stage-only delivery and authorized continuation.** Stop at the requested endpoint, skip completed stages and preserve a short checkpoint in the existing record: artifact/version, completed stage, approvals/constraints, unfinished work and next action. Do not require new files or turn a suggested next stage into extra work. Resume at the unfinished work within the new request. An authorization spanning stages permits routine work across them without repeated confirmation.
2. **Motion evidence and user-facing presentation.** When motion is in scope, keep the required pre-implementation video review and capture/retain matching actual-game evidence afterward. If the user chooses live-game review, open the implemented game instead of requiring another recording presentation or approval stop. Tests and evidence do not automatically establish hands-on acceptance.
3. **UI-only verification.** With unchanged assets, controls and contacts, verify the screen using screenshots, interaction/readiness/cancellation checks, focus/navigation, responsive bounds, loading behavior and appropriate focused checks/build. Reuse accepted motion evidence; do not reopen Tripo, modeling or motion reviews for a layout change.

Splitting every stage into a new skill would duplicate shared identity, provenance and review rules and make stop/resume harder to coordinate. Extract a focused stage skill later if it repeatedly becomes an independent, complex workflow with its own useful resources. No seven-skill split or new installation is needed now. Existing specialist skills remain available for design, rigging and loading work.

Keep Wankai's exact full-window layout, P1/P2 positions, readiness rules and cancellation behavior in the [selection implementation handoff](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md). They should not become universal character-production requirements. Required Tripo bases, consistent front/side/back reconstruction inputs, before-implementation motion videos, the full W/S/A/D plus four-combination matrix and affected approval/spending boundaries remain in force for their relevant stages.

The supporting references use relative paths and can be read in place from another checkout. They do not require the original author's filesystem or a new account installation.

## Systematic debugging

**Source:** [obra/superpowers](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging). Local instructions: `.agents/skills/systematic-debugging/SKILL.md` in the parent workspace.

This skill organizes debugging into evidence gathering, pattern comparison, hypothesis testing, and implementation. It encourages one controlled change at a time and a regression case that demonstrates the original failure. After repeated failed fixes, it calls for reconsidering the approach with the user.

For Wankai, its most valuable application is the unresolved sword support-direction report. Record the mode, camera angle, exact held keys, and before/after weapon pose. Compare the polearm under the same conditions, then distinguish model rotation from physics movement and camera perception. Historical regression coverage alone does not settle the reported gameplay problem.

Relevant files include `src/physics.js`, `src/weapon-visuals.js`, `src/free-camera.js`, and the weapon/contact regression tests.

Example request:

> Use systematic-debugging to reproduce the sword changing direction while supporting the fighter. Compare it with the polearm before changing any tuning.

The upstream instructions also reference separate test-driven-development and verification skills. Those companion skills are not installed by this selection; this installation includes the debugging skill and its bundled supporting references only.

## Three.js loaders

**Source:** [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills/tree/main/skills/threejs-loaders). Local instructions: `.agents/skills/threejs-loaders/SKILL.md` in the parent workspace.

This skill covers GLTF/GLB and texture loading, loading progress, asynchronous work, caching, compressed assets, and fallback behavior. It provides implementation examples rather than an automatic model optimizer.

Wankai loads weapon GLBs in both the armory and arena. The sword currently has three 4K textures, while the hammer already uses a smaller texture budget. Useful work includes measuring repeated loading, evaluating texture compression, and defining resource ownership when models or materials are shared. A cache must be paired with a clear disposal policy.

Relevant files include `src/LoadoutPreview.jsx`, `src/model-assets.js`, `src/Armory.jsx`, `src/ArenaCanvas.jsx`, `src/scene.js`, and the asset preparation scripts. `window.__arena.rendererInfo()` exposes arena-renderer resource counts; it does not measure texture bytes or include either player's separate preview renderer. The preparation page hides the mounted arena; each actual-model preview owns independent player instances and controls.

Example request:

> Use threejs-loaders to review sword loading and texture costs. Measure repeated armory-to-match transitions before proposing compression or caching changes.

Some upstream examples load decoders from a CDN. Wankai requires offline play, so any needed decoder or transcoder must be bundled locally. Model optimization must also preserve measured axes, grip origins, appearance, and the authoritative physics profile.

## Playwright

**Source:** [openai/skills](https://github.com/openai/skills/tree/main/skills/.curated/playwright). Local instructions: `.agents/skills/playwright/SKILL.md` in the parent workspace.

This skill provides a CLI workflow for browser navigation, element snapshots, interaction, screenshots, and traces. It favors direct browser checks; it does not automatically add a Playwright test suite to the project.

Use the available browser-control route against Wankai's Vite renderer to check the full-window preparation page: independent P1/P2 drafts and previews, readiness reset after edits, shared Start/save, Back/Escape cancellation and focus return, entry into all four modes, pause/help dialogs, rematches, and narrow-window layouts. Browser screenshots can also help compare weapon poses and camera framing. Physics regressions remain in the existing Node test suite, and two-player control feel still needs hands-on testing. Browser checks do not by themselves verify Electron lifecycle, application packaging, or native-window behavior. Follow the active environment's computer-use rules when choosing between its browser tools and this skill's CLI wrapper.

Example request:

> Use playwright to check that both players can select different weapons, start a split-screen duel, pause, and rematch with their choices retained. Capture the narrow-window layout too.

### Using the project-local wrapper

The upstream instructions show a global installation path. For this workspace, use the installed local wrapper instead:

```sh
command -v npx
export PWCLI="/Users/haojun/Desktop/Game developing/.agents/skills/playwright/scripts/playwright_cli.sh"
```

Start the renderer in a separate terminal from the Wankai directory:

```sh
npm run dev:renderer
```

Then open it and capture its current state:

```sh
bash "$PWCLI" open http://127.0.0.1:5173/ --headed
bash "$PWCLI" snapshot
```

The wrapper obtains `@playwright/cli` through `npx`; initial use can require network access and browser setup. Installing the skill alone does not establish that the browser runtime is ready. Use current snapshots before referring to element IDs, refresh snapshots after significant UI changes, and save inspection artifacts under `output/playwright/` within the checkout being tested.

## Grilling

**Local instructions:** `.agents/skills/grilling/SKILL.md` in the parent workspace. This guide describes the existing local copy; its upstream source is not recorded here.

This skill examines a plan as a tree of dependent decisions. It asks the questions that can be answered now, supplies a recommended answer for each, and waits before moving to decisions that depend on those answers. Its instructions call for delegating factual investigation when needed and confirming shared understanding before acting on the resulting plan.

Use it when a design choice needs discussion: whether a fourth weapon is sufficiently different, what a slower turning profile should sacrifice, or what success means in a playtest. Routine implementation with settled requirements does not need a new design interview.

Example request:

> Grill my proposal for the fourth precision weapon. Focus on steering, release braking, reach, and how its role differs from the existing three weapons.

The precision weapon remains deferred. Discussing its design does not authorize a model purchase or resume implementation.

## Grill me

**Local instructions:** `.agents/skills/grill-me/SKILL.md` in the parent workspace.

`grill-me` is an explicitly invoked entry point that forwards to `grilling`. It is not a second design methodology. Its metadata disables automatic invocation, so use it deliberately when you want the interview workflow.

Example request:

> Use grill-me to challenge my plan for the next two-player playtest.

## Create game assets

**Source:** [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/main/skills/disciplines/create-game-assets). Local instructions: `.agents/skills/create-game-assets/SKILL.md` in the parent workspace.

This skill turns a visual idea into a coherent asset family. It supplies an art-direction brief, asset manifest, 3D production references, and raster inspection scripts. It covers concept references, game-scale readability, scale/pivots, collision roles, texture budgets, and in-engine acceptance. Its raster scripts require Python 3.10+ and Pillow.

For the beagle and Three Kingdoms characters, use it to establish shared proportions, materials, palette roles, and detail density before producing the full cast. It can hand visual creation to an available image-generation tool; installing the skill does not install a generator or create a finished 3D model.

Example request:

> Use create-game-assets to write a shared art-direction brief for the beagle, 刘备、关羽、张飞、吕布. Check their silhouettes at Wankai's split-screen camera distance.

## Character design

**Source:** [omer-metin/skills-for-antigravity](https://github.com/omer-metin/skills-for-antigravity/tree/main/skills/character-design). Local instructions: `.agents/skills/character-design/SKILL.md` in the parent workspace.

This skill provides design references for silhouette, shape language, color blocking, proportions, character lineups, expressions, and turnarounds. Use its principles as visual heuristics, and judge the results against the intended character and game view.

For the beagle, explore how two long ears read as twin weapons while preserving its dog identity. A reference sheet should show relaxed, attacking, and support poses with consistent ear lengths and attachment points. For 刘备、关羽、张飞、吕布, compare the cast together so body proportions, costumes, and weapon shapes remain distinguishable within one art direction. These are new design explorations, not implemented gameplay features.

Example request:

> Use character-design to explore three silhouettes for a beagle whose long ears act as twin swords. Include front, side, and rear reference views and an attack pose.

## Rigging

**Source:** [arjun988/blender-skills](https://github.com/arjun988/blender-skills/tree/main/.claude/skills/rigging). Local instructions: `.agents/skills/rigging/SKILL.md` in the parent workspace.

This skill guides skeleton design, bone placement, constraints, IK/FK, skin weights, and deformation checks in Blender. It includes humanoid and mechanical rigging references. Its execution workflow expects a Blender MCP connection; this installation adds the skill files, not Blender or a connection. No callable Blender tool was exposed in this session when installed.

Rigged assets are compatible with the existing Electron + React Three Fiber + Three.js stack. Author and bake the skeleton animation in Blender, export a GLB, load its skinned meshes with `GLTFLoader`, and play its clips through Three.js animation support. Blender authoring constraints and drivers are not automatically a runtime game rig; bake their intended animation or implement corresponding procedural behavior explicitly. Players do not need Blender to play an exported asset. See [Three.js SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), and [React Three Fiber model loading](https://r3f.docs.pmnd.rs/tutorials/loading-models).

For the beagle, a proposed rig can use separate left/right ear bone chains with stable names and tested extreme poses. The visual rig must agree with simplified gameplay collision proxies. Rigging alone does not add dual-weapon controls, collisions, damage, or ground-support behavior: Wankai currently drives one weapon controller per fighter, so independently controlled ears require a separate gameplay design and implementation. The existing static weapon preparation scripts are not a general skinned-character pipeline.

Example request:

> Use rigging to specify a lightweight beagle skeleton with separate ear chains, then define what must be baked into the GLB and what Wankai must drive procedurally.

## Find skills

**Source:** [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/main/skills/find-skills). Installed globally at `/Users/haojun/.codex/skills/find-skills/SKILL.md`; it is not copied into this workspace.

This skill searches the skill ecosystem, checks candidate instructions, popularity, and source reputation, and introduces suitable options before installation. It is useful when a new need falls outside the current set, such as future packaging or specialized asset processing.

Example request:

> Use find-skills to find a macOS Electron packaging skill. Check the source and explain whether it fits Wankai before installing it.

Directory entries can outlive their source files. The previously considered `develop-web-game` remains indexed but was absent from OpenAI's current repository when checked on 17 October 2026; it was not installed. The optional `threejs-fundamentals` skill was also not installed.

## Suggested workflow

1. Use the [project status](PROJECT_STATUS.md) and [design handoff](DESIGN_HANDOFF.md) to choose the next task.
2. Use `grilling` or `grill-me` when the design itself needs decisions.
3. Use `systematic-debugging` for unexpected behavior, especially support direction and contact failures.
4. Use `threejs-loaders` for model loading, compression, and asset lifecycle work.
5. Use `playwright` for browser-visible behavior, alongside `npm test` and `npm run build` for relevant code changes.
6. Use two first-time players to judge deliberate movement, aiming, camera comfort, stamina pacing, and weapon balance. Automated checks support this evaluation but cannot replace it.

For character work, use `game-character-pipeline` for the requested stage or authorized production range. It can use `create-game-assets` for the brief, `character-design` for references and `rigging` when skeleton authoring is relevant. Every new production base uses Tripo with the required front/side/back set; motion work uses the approved functional video format and full W/S/A/D plus four-combination coverage, followed by matching actual-game evidence when implemented. Honor the creator's live-game delivery preference above. Keep existing combat rules unchanged until character-specific controls and contacts are agreed. A UI-only preparation-page revision follows its screen/interaction checks and reuses unchanged motion evidence.

## Reinstalling in another checkout

Run these from the workspace where project-local skills should live. They install the six additions; they do not reinstall the existing grilling pair or the global discovery skill.

```sh
npx skills add obra/superpowers --skill systematic-debugging --agent codex -y
npx skills add cloudai-x/threejs-skills --skill threejs-loaders --agent codex -y
npx skills add openai/skills --skill playwright --agent codex -y
npx skills add gamedev-skills/awesome-gamedev-agent-skills --skill create-game-assets --agent codex -y
npx skills add omer-metin/skills-for-antigravity --skill character-design --agent codex -y
npx skills add arjun988/blender-skills --skill rigging --agent codex -y
```

Omitting `-g` requests project-local installation. Check the resulting skill location and update the Playwright wrapper path for that checkout. Game players do not need any of these skills to launch or play Wankai.
