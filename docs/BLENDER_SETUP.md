# Blender and Tripo Asset Environment

Configured 17 October 2026 for the beagle ear-duelist project.

Blender 5.2.2 LTS for Apple Silicon is installed at `/Applications/Blender.app`. The official installer matched its published SHA-256 checksum, and macOS accepted its notarized developer signature. The desktop application starts successfully.

## Project workspace

Open [wankai-asset-stage.blend](../assets/source/blender/wankai-asset-stage.blend) to work on assets. It contains the supplied beagle reference, a provisional 1.70-unit body-height guide, a preview camera, soft lights, a floor, and these collections:

- `00_Reference`: packed reference image and scale guide.
- `01_Tripo_Imports`: original imported models.
- `02_Working_Assets`: cleaned meshes and rigs.
- `03_Collision_Proxies`: simplified contact shapes.
- `90_Presentation`: camera, lights, and preview floor.

Blender uses Z up; model the character facing +X. Export with glTF's Y-up conversion enabled, retaining +X as forward. One Blender unit represents one game unit. The scale guide is a starting target from the [character brief](BEAGLE_CHARACTER_DESIGN.md), not final collider calibration.

The stage is a reusable source file, not the finished beagle or a playable physics prototype. Save new working versions beside it instead of overwriting the template.

## Launcher and scripts

Run these commands from the Wankai directory:

```sh
# Open the asset stage in Blender with the project's separate preferences.
bash scripts/blender.sh assets/source/blender/wankai-asset-stage.blend

# Verify Blender Python, a synthetic skeleton, GLB export, and a CPU render.
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/check_environment.py

# Load the exported skeleton and exercise its animation in Wankai's Three.js.
node scripts/blender/verify-export.mjs
```

The launcher detects the macOS application or accepts `BLENDER_BIN` pointing to another Blender executable. Its preferences live under `.local/blender/config`, separate from the regular Blender profile. It disables automatic execution of scripts embedded in opened assets; explicitly supplied project scripts still run.

The template generator is `scripts/blender/create_workspace.py`. It refuses to overwrite an existing stage. No additional Python packages or external Python environment are needed for these scripts; they use Blender's bundled Python.

Blender's Metal detection failed when launched inside the restricted command sandbox, before project Python executed. The same startup and scripts passed with normal graphics access. When operating through the coding assistant, use an approved execution context with hardware access for Blender commands. Do not change macOS security settings to work around that sandbox restriction.

## Verified environment checks

The setup check exported a two-bone synthetic skinned paddle and an animation, rendered it, and loaded the GLB using this project's Three.js revision 186. The animation displaced the test vertices by approximately 0.766 units, confirming that bone animation survived export and import.

| Check | Result |
| --- | --- |
| Blender | 5.2.2 LTS, native arm64 |
| Bundled Python | 3.13.13 |
| GLB skin and animation export | Passed |
| CPU test render | Passed |
| Three.js skinned-mesh import | Passed; one skinned mesh, two bones |
| Three.js animation deformation | Passed |

Generated results are in `output/blender/environment-check/`, including `blender-report.json`, `three-report.json`, `setup-render.png`, and the test `.blend` and `.glb`. These generated checks and local preferences are ignored by Git. They validate the environment, not beagle movement, ear clearance, balance, or production topology.

## Tripo workflow

The existing Chrome session can access [Tripo's model-generation workspace](https://studio.tripo3d.ai/workspace/generate) while signed in. Browser control can inspect generation settings and later download selected assets. No Tripo model was generated or exported during environment setup.

For a new base, establish proportions and contact leverage before generation; the [beagle prototype plan](BEAGLE_PROTOTYPE_PLAN.md) is one historical example. Prepare the user's required **three separate, consistent front/side/back images** from the selected identity. A collage or single front reference alone is not the current production packet. Inspect the available Tripo multi-view slots/settings before submission; see the [current workflow](CHARACTER_CREATION_WORKFLOW_SPEC.md). Reuse an approved Tripo base for local revisions instead of generating it again.

1. Use Tripo to produce a candidate base mesh after the matching three-view packet and operation/cost are approved. The following ear-refinement steps describe the original beagle workflow; adapt them to another character's accepted anatomy and controller.
2. Keep the original export and generation details with the asset source record.
3. Import the GLB into Blender, inspect topology and separation around the ears, and refine the ear paddles and root folds to the proven dimensions.
4. Author the custom ear rig and clean skin weights. Validate complete rotations and the ground-support pose.
5. Export only the intended model/armature selection as GLB, with skins, Y-up conversion, and at most four bone influences per vertex.
6. Load the result in the game; let its physics drive the root and ear swings.

During the 17 October environment inspection, the default Tripo HD workspace displayed H3.1 generation at 30 credits. That is one historical observed configuration, not a current quote for generation modes or exports; inspect the final selected settings before spending credits.

Browser use for Tripo plus Blender's Python tools is the recommended initial workflow. A bridge add-on or live automation server is not required for these checks. Existing static-weapon preparation scripts reject skinned meshes; do not use them to optimize a rigged character.

## Source records

- [Official Blender download](https://www.blender.org/download/) and [5.2 release notes](https://www.blender.org/releases/5-2/).
- Installer: `https://download.blender.org/release/Blender5.2/blender-5.2.2-macos-arm64.dmg`.
- Published checksums: `https://download.blender.org/release/Blender5.2/blender-5.2.2.sha256`.
- Verified SHA-256: `dc4125399b8bfefe283cc1624d6cfc7809d1cac20ace51072127eb371f31f210`.
- [Blender glTF export API](https://docs.blender.org/api/main/bpy.ops.export_scene.html).
