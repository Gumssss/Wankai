# Beagle Ear Motion Studies

Current status (18 October): the [approved smooth v05 beagle](BEAGLE_MODEL_V05.md) is playable with the upright v07 rules. Earlier front/back flips below remain motion studies; body-pitch physics has not yet been integrated. These historical videos use the earlier proxy proportions.

## Revision 07 — powered weapon ears with game contact and combat rules

[Movement and simultaneous controls](beagle-functional-movement-v07.mp4) · [Vertical hit, horizontal hit, and sword clash](beagle-functional-combat-v07.mp4).

These clips address the creator's requirement that the ears function as ordinary weapons. An offline adapter reads the current `src/physics.js`, adds an experimental attached-ear profile and contact frame, and runs the existing controller and combat solver. It does not change the production game. The body stays upright, as it does for the current sword, polearm, and hammer. Whole-body flips remain a separate body-pitch extension; these clips establish powered ear function first.

W/S actively accelerates continuous ear rotation; release retains momentum under gravity and damping, and opposite input brakes before reversing. A/D controls heading simultaneously. The same ear pose and rounded solid proxies supply ground support, damage, and clashes. There is no authored body path, artificial takeoff impulse, walking force, or pose-driven launch.

The adapter reuses 180 Hz integration, motor acceleration/braking/speed limits, stamina/fatigue, ground/rim impulses, swept weapon/body and weapon/weapon contacts, damage, repeat-hit gates, and clash recoil. It replaces the floating weapon offset with fixed sockets 1.43 h above the feet and 0.66 h to either side. Each rigid paddle is 3.60 h long, approximated by three narrow capsule strips. The pair shares one pitch/yaw state, one motor profile, one stamina charge, and the ordinary attack gate. Initial tuning uses the polearm's 24 rad/s² acceleration, 30 rad/s² reverse braking, 4.25 rad/s axis limit, and inertia parameter 4.1. This is a comparison baseline, not accepted beagle balance.

Both videos are 1600 × 900, 30 fps. Teal dots trace the actual body travel projected onto the floor; teal rings mark near-contact ear surfaces. Highlighted keys and the stamina bar follow recorded simulation state. The combat dummy is drawn from the game's torso/head hurtbox shapes; the sword is a solid collision-proxy preview rather than the production art. Damage numbers, health changes, impact markers, deflection, and recoil come from recorded game events.

| Movement video | Segment |
| --- | --- |
| 0–4.8 s | W drive, release, then S reversal at normal speed |
| 4.8–8.8 s | The same supporting push and reversal at 0.5× speed |
| 8.8–11.4 s | W+A |
| 11.4–14 s | W+D |
| 14–16.6 s | S+A |
| 16.6–19.2 s | S+D |

| Combat video | Segment |
| --- | --- |
| 0–2.6 s | Vertical W attack and resulting knockback |
| 2.6–6.2 s | First vertical hit replay at 0.25× speed |
| 6.2–8.8 s | Horizontal D sweep |
| 8.8–12.4 s | Horizontal hit replay at 0.25× speed |
| 12.4–15.4 s | Ear versus sword clash |
| 15.4–19.4 s | The same clash at 0.25× speed |

The solo sequences produce about 2.18–2.27 h of body rise through real contact. The first vertical hit deals 29 damage at simulation time 0.3278 s; continued motion produces a separate 32-damage hit at 1.7556 s under the existing gate. The horizontal hit deals 9 damage at 0.1611 s and has a pure-yaw closing contribution. The sword clash occurs at 0.4222 s and triggers the ordinary 3.2 m/s recoil setting. These are outcomes of separate review setups, not matched-speed damage or balance comparisons.

Verification includes numerical contact-velocity agreement (error below 0.000008), finite states, fixed anatomical sockets, constant ear length, matching input overlays, and camera framing for all 1,158 rendered poses. The current capsule/contact approximation permits about 0.022 h of visible ear floor penetration in the movement sequence and 0.005 h in combat; no render-only position correction is applied. The existing 77-test game baseline passes. Game integration, beagle hurtbox fitting, playable control feel, body pitch, and final proportions remain open.

- [Simulation adapter and scenarios](../scripts/preview/beagle-functional-preview.mjs).
- [Blender replay renderer](../scripts/blender/beagle_functional_v07.py).
- [Movement Blender source](../assets/source/blender/beagle-ear-functional-v07-movement.blend).
- [Combat Blender source](../assets/source/blender/beagle-ear-functional-v07-combat.blend).
- Simulation records, adapted physics snapshot, source fingerprint, and baseline test log: `output/beagle-functional-preview/`.
- Render frames and verification: `output/blender/beagle-functional-v07-movement/` and `output/blender/beagle-functional-v07-combat/`.

Rebuild from the Wankai directory:

```sh
node scripts/preview/beagle-functional-preview.mjs

bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_functional_v07.py \
  -- movement --replace-generated --verify --render

ffmpeg -framerate 30 -start_number 1 \
  -i output/blender/beagle-functional-v07-movement/frames/%05d.png -frames:v 576 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-functional-movement-v07.mp4
```

Substitute `combat` and 582 frames for the second render and export.

## Revision 06 — independent hinge physics, forward and backward

[A: soft brake](beagle-ear-physics-soft-v06.mp4) · [B: looser hinges](beagle-ear-physics-loose-v06.mp4).

**Scope clarified after review:** the creator requires fully functional weapon ears under the same controls and combat rules as the other weapons. These clips contain no player-driven swing/steering, attack damage, or weapon clashes. Their passive hinge settings are secondary-motion references, not the proposed gameplay controller. The next functional preview must demonstrate powered ear swings, contact-driven movement, horizontal and vertical hits, and a clash; see the [functional requirements](BEAGLE_CHARACTER_DESIGN.md#functional-weapon-requirements).

The creator found the fixed ear/body angle in revision 05 too rigid. Revision 06 uses Blender Bullet rigid bodies for the body and both uninterrupted 3.60 h ear paddles. Each ear has one head hinge and a finite motor brake targeting zero relative angular velocity. Its angle is free to change when momentum and contact overcome that brake. There are no folding joints, animated scales, prescribed full turns, or automatic upright landings.

These clips isolate **airborne response**. They begin just after a hypothetical launch: the body starts at 3.72 h, and an external test motor pulse supplies linear and angular momentum for the first seven 120 Hz simulation frames. Those launch constraints are disabled at frame 8. Afterward, gravity, joint reactions, finite braking, and floor contacts determine the motion. No body or ear transform is keyed in the simulation. The renderer replays its sampled poses. This is not yet the game's ear-powered launch solver, and the unassisted landing can continue into a ground tumble.

Both variants receive the same launch commands. A uses brake cap 1.3 and B uses 0.4, in Blender's motor impulse setting. At 0.75 seconds the ear angle has changed by about 58 degrees relative to the take-off pose in A, and 170 degrees in B. A shows less passive lag; B exposes the stronger lag and tumble when braking is reduced. Neither setting establishes controllable weapon behavior or has been approved for gameplay.

Each video is 12 seconds at 1600 × 900 and 30 fps:

| Time | View |
| --- | --- |
| 0–2 s | Backward motion, normal speed |
| 2–6 s | Same backward simulation, 0.35× speed |
| 6–8 s | Forward motion, normal speed |
| 8–12 s | Same forward simulation, 0.35× speed |

The small bar measures change in ear angle relative to the body from the take-off pose, capped at 180 degrees. Teal floor rings mark near-contact ear surfaces. There is no W/S overlay because the launch pulse is a test fixture rather than an implemented player action.

The simulations run at 120 fps with 12 substeps per frame, 100 solver iterations, gravity 19, body mass 1.2, and mass 0.055 per ear. Each uses a planar guide with its free rotation on the constraint's local Z axis, avoiding the middle-axis singularity during full rotations. A passive world anchor explicitly supplies world-referenced constraints. Maximum head-hinge error is below 0.00018 h across the four selected simulations. All 720 rendered poses pass fixed-length, attachment, floor-clearance, and camera-framing checks.

- [Simulation script](../scripts/blender/beagle_airborne_physics.py).
- [Rendering script](../scripts/blender/beagle_motion_study_v06.py).
- [A editable source](../assets/source/blender/beagle-ear-motion-study-v06-soft.blend).
- [B editable source](../assets/source/blender/beagle-ear-motion-study-v06-loose.blend).
- Physics records and proxy scenes: `output/blender/beagle-airborne-physics/`.
- Render frames and verification: `output/blender/beagle-motion-study-v06-soft/` and `output/blender/beagle-motion-study-v06-loose/`.

Rebuild from the Wankai directory, substituting `backward -1` for `forward 1` and `loose` / `0.4` for `soft` / `1.3` to produce all four simulations:

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_airborne_physics.py -- soft-forward 1 1.3

bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_motion_study_v06.py \
  -- soft --replace-generated --verify --render

ffmpeg -framerate 30 -start_number 1 \
  -i output/blender/beagle-motion-study-v06-soft/frames/%05d.png -frames:v 360 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-ear-physics-soft-v06.mp4
```

## Revision 05 — body and ears rotate together, backward and forward

[Backflip — normal speed and slow motion](beagle-backflip-together-v05.mp4) · [Front flip — normal speed and slow motion](beagle-frontflip-together-v05.mp4).

The creator clarified that the ears should participate in the flip rather than remain aimed backward as the body rotates. Revision 05 holds each ear's angle relative to the head during the entire airborne phase. The whole body and both rigid ears share the same complete revolution, with no folding, scaling, or compensating hinge motion. The forward version mirrors the backward version and travels in the facing direction.

Each video is 12 seconds at 1920 × 1080 and 24 fps: four seconds containing the normal-speed action, followed by eight seconds at 0.25× speed. The normal view is three-quarter; the slow view is from the side. Source frames 1–288 form the backward clip and 289–576 form the forward clip.

The long rigid silhouette needs more clearance than the earlier counter-rotating-ear version. The authored planted push takes 0.165 seconds instead of 0.21 seconds, reaches roughly 2.87 h of body-base rise, and provides about 0.74 seconds of ballistic flight under gravity 19. The ear pose stays fixed relative to the body throughout that flight. The hinges move during preparation, the planted push, and settling after the catch. These are visual and geometry targets; the coupled gameplay solver, energy budget, angular response, and final input mapping remain to be prototyped.

All 576 frames were checked for ground clearance, unchanged ear length, stable head sockets, a constant relative ear pose in the air, one full backward/forward revolution, travel direction, input overlays, and camera framing. Camera heading stays fixed within each shot and position follows horizontal travel.

- [Editable Blender source](../assets/source/blender/beagle-ear-motion-study-v05.blend).
- [Authoring script](../scripts/blender/beagle_motion_study_v05.py).
- Frames, pose records, and verification: `output/blender/beagle-motion-study-v05/`.

Rebuild and render from the Wankai directory:

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_motion_study_v05.py \
  -- --replace-generated --verify --render

ffmpeg -framerate 24 -start_number 1 \
  -i output/blender/beagle-motion-study-v05/frames/%05d.png -frames:v 288 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-backflip-together-v05.mp4

ffmpeg -framerate 24 -start_number 289 \
  -i output/blender/beagle-motion-study-v05/frames/%05d.png -frames:v 288 \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-frontflip-together-v05.mp4
```

## Revision 04 — rigid ears with airborne counter-rotation, superseded by revision 05

[Full action preview — 27 seconds](beagle-ear-motion-study-v04.mp4) · [Backflip slow motion — 8 seconds](beagle-backflip-rigid-ears-slow.mp4).

This earlier direction removed the folding from revision 03. Each ear is one uninterrupted 3.60 h paddle with one hinge at the head. There are no midpoint joints, folds, scaling, or deformation. The body makes one backward revolution while the existing ear hinges counter-rotate to keep both paddles swept back and clear of the floor. The ears then swing down to catch the landing.

| Time in full preview | Motion |
| --- | --- |
| 0–4.5 s | A: level-ear horizontal strike to the left |
| 4.5–9 s | D: level-ear horizontal strike to the right |
| 9–13 s | Rigid-ear backflip at normal speed |
| 13–21 s | The same flip at 0.25× speed; also exported as a standalone clip |
| 21–27 s | Three-quarter view, landing, and horizontal attack recovery |

The scene retains the previous launch path and body pivot so the ear change can be compared directly. Head sockets move with the rotating body. Counter-rotation uses the two existing ear hinges, with no extra input key. Final flip activation and coordinated hinge control still need the game prototype; this is authored motion with a ballistic flight segment, not the Wankai impulse solver.

All 648 frames were checked for ground clearance, camera bounds, matching input overlays, fixed ear length, stable head attachments, and exactly one hinge per ear. The earlier folding version is preserved below as a discarded complexity experiment.

- [Editable Blender source](../assets/source/blender/beagle-ear-motion-study-v04.blend).
- [Authoring script](../scripts/blender/beagle_motion_study_v04.py).
- Frames, pose record, and verification: `output/blender/beagle-motion-study-v04/`.

Rebuild and render from the Wankai directory:

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_motion_study_v04.py \
  -- --replace-generated --verify --render

ffmpeg -framerate 24 -start_number 1 \
  -i output/blender/beagle-motion-study-v04/frames/%05d.png \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-ear-motion-study-v04.mp4

ffmpeg -i docs/beagle-ear-motion-study-v04.mp4 -ss 13 -t 8 \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart \
  docs/beagle-backflip-rigid-ears-slow.mp4
```

## Revision 03 — folding experiment, superseded by revision 04

Created 17 October 2026 · 27 seconds · 1280 × 720 · 24 fps

[Play horizontal attacks and the backflip](beagle-ear-motion-study-v03.mp4).

| Time | Motion to review |
| --- | --- |
| 0–4.5 s | A sweeps level ears left through a foam target |
| 4.5–9 s | D sweeps level ears right through the same target |
| 9–13 s | Side view of a backward ear plant, airborne backflip, and landing at normal speed |
| 13–21 s | The same backflip at 0.25× speed, with plant/push/tuck/flip/reach/catch captions |
| 21–27 s | Three-quarter view: backflip, landing, W raises the ears, then D sweeps horizontally |

A/D are both heading control and horizontal striking motion. The first shots isolate a level ear pose to show that sweep. They do not add an automatic pitch lock to the game. The foam target changes color and displays an amber ring when the authored ear path overlaps it; this is contact visualization, not damage validation.

The flip keeps the 3.60 h total ear length from revision 02, split into two rigid 1.80 h sections with an articulated midpoint. During flight the ears fold up to 150 degrees, rotate with the body, and open for landing. No segment scales or shortens. A body pitch pivot at 0.85 h allows one backward revolution around the character's center while the world root follows the authored travel path. The ears catch first and the character returns upright.

The proposed trigger is a strong S-driven planted launch followed by an aerial flip assist. Final input mapping, launch threshold, motor strength, folding contact shapes, hitboxes, and landing response remain gameplay decisions. This video is an authored proposal with a ballistic flight segment using gravity 19; it does not run Wankai's coupled impulse solver. Camera heading stays fixed within each shot and camera position follows horizontal travel.

- [Editable Blender source](../assets/source/blender/beagle-ear-motion-study-v03.blend).
- [Scene authoring script](../scripts/blender/beagle_motion_study_v03.py), which reuses the revision 02 primitive scene.
- Frames, motion record, and all-frame verification: `output/blender/beagle-motion-study-v03/`.
- [Asset record](../assets/concepts/beagle/manifest.json).

Rebuild, check, and render from the Wankai directory:

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/beagle_motion_study_v03.py \
  -- --replace-generated --verify --render

ffmpeg -framerate 24 -start_number 1 \
  -i output/blender/beagle-motion-study-v03/frames/%05d.png \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-ear-motion-study-v03.mp4
```

The earlier combined-control study remains useful for W+A / W+D / S+A / S+D and high body travel:

## Revision 02 — high vault and combined controls

Revision 02 · 17 October 2026 · 32 seconds · 1280 × 720 · 24 fps

[Play the revised motion concept](beagle-ear-motion-study-v02.mp4).

The body rises and travels as the ears press against the floor. It stays upright while W/S rotate the ears and A/D turn the heading simultaneously. Highlighted keys identify the held inputs, and the top-down trace shows the body's curved path and facing. Camera position tracks horizontal travel; camera heading stays fixed within each shot.

| Time | Motion to review |
| --- | --- |
| 0–6 s | Slow side view: W plants the ears, raises the whole body, carries it forward, and lowers it |
| 6–11 s | W+A: forward swing and left turn together |
| 11–16 s | W+D: forward swing and right turn together |
| 16–21 s | S+A: backward swing and left turn together |
| 21–26 s | S+D: backward swing and right turn together |
| 26–32 s | Rear view of W+D with both axes active |

Teal marks the load-bearing ear contact. Amber marks the other ear, which is allowed to slide during turning. Two rigid ear tips cannot both remain fixed to the floor while their shared heading changes. The ruler's ticks are one skull height apart, measured from the unlifted body base.

## Reach change and remaining decisions

The first preview's 1.65 h ears only lifted the body about 0.22 h. That was too small for the requested movement. Revision 02 tests **3.60 h active ear reach** at the same **1.43 h attachment height**, allowing **2.17 h** of straight-down supported rise. The faster shots reach about **2.36 h** with retained launch momentum. At h near one game unit, the supported rise is comparable to the existing sword's nominal geometric rise of approximately 2.15 units; actual gameplay jump height has not been measured here.

The longer span is a proportion candidate, not approved character art. It changes the silhouette, attack coverage, and resting pose. This video shows extended active ears. A compact folded resting pose would need visible articulated geometry and matching contact shapes; that problem remains open in the [design brief](BEAGLE_CHARACTER_DESIGN.md).

## What the preview establishes

A small authored model drives the ear pitch and heading, prevents floor penetration, carries the body through one supporting tip, and retains linear velocity under gravity after contact releases. Ear length stays constant. Their side attachments stay with the upright body. The primitive model represents the reference's tan ears, white muzzle/blaze, tiny torso, and unimpressed face.

This is a simplified motion proposal, **not Wankai's coupled impulse solver or a finished rig**. The [gameplay prototype](BEAGLE_PROTOTYPE_PLAN.md) must verify motor strength, friction, one/two-tip support, launch height, reversal braking, inertia, exhaustion, combat, and stability. Cuts between labeled shots reset the scene for comparison.

## Editable source

- [Revision 02 Blender source](../assets/source/blender/beagle-ear-motion-study-v02.blend).
- [Revision 02 authoring script](../scripts/blender/beagle_motion_study_v02.py).
- Intermediate frames and motion record: `output/blender/beagle-motion-study-v02/`.
- [Asset record](../assets/concepts/beagle/manifest.json).
- [Previous video](beagle-ear-motion-study.mp4) and [previous Blender source](../assets/source/blender/beagle-ear-motion-study-v01.blend) are preserved for comparison. Revision 01 was superseded because lift was too small and combined controls were missing.

Render from the Wankai directory:

```sh
bash scripts/blender.sh --background \
  assets/source/blender/beagle-ear-motion-study-v02.blend \
  --render-output '//../../../output/blender/beagle-motion-study-v02/frames/#####' \
  --render-anim

ffmpeg -framerate 24 -start_number 1 \
  -i output/blender/beagle-motion-study-v02/frames/%05d.png \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -movflags +faststart docs/beagle-ear-motion-study-v02.mp4
```

The authoring script preserves its existing source by default. `-- --replace-generated` explicitly rebuilds that generated scene; save manual changes to another version before using it.
