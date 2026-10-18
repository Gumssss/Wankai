# Beagle Ear Movement Prototype Plan

**18 October 2026 implementation:** The approved smooth Tripo v05 model is now
playable as **比格犬·双耳** in the armory. Its upright movement/combat baseline
matches the latest functional v07 videos. See [current model and runtime
handoff](BEAGLE_MODEL_V05.md) for actual files, controls, contacts and remaining
body-flip/balance work. The design stages below preserve the earlier plan.

Prepared 17 October 2026 · Status: planned

Update 18 October: [Model 01](BEAGLE_MODEL_V01.md) is built and exported. It has four skinned meshes, two materials, thirteen controls, firm 3.60-unit ears, and independent head hinges. Topology, weights, imported full rotations, body-pitch sockets, and separate skeleton instances pass the asset checks. This is an editable model and offline review viewer; the playable test entry and integration stages below remain pending. The actual model's thirteen-bone hierarchy supersedes the illustrative twelve-bone proposal in Stage 4.

Build a playable untextured beagle to establish that two attached ears can swing, support, and move an upright body. Use the resulting dimensions and movement to guide the finished model and skeleton. The [character design brief](BEAGLE_CHARACTER_DESIGN.md) supplies appearance and initial proportions.

The creator's latest clarification makes ordinary weapon functionality a requirement: the ears must retain powered W/S swings, simultaneous A/D steering, ground-driven locomotion, damage, blocking, clashes, release/reversal behavior, and the existing stamina rules. Revision 06's passive airborne comparisons are motion references only. A functional prototype must demonstrate the ears themselves producing movement and combat under player input.

Revision 07 supplies an offline simulation and rendered movement/combat preview using an adapter to the current game solver. It produces contact-driven body rise, all four combined inputs, vertical/horizontal damage, and a sword clash. It preserves the production source and the current upright body model. This provides initial contact/control evidence for Stages 1–3, while the developer-only playable scene, actual integration, beagle hurtboxes, body-pitch extension, and hands-on acceptance remain to be built.

The [Blender and Tripo environment](BLENDER_SETUP.md) is configured: Blender 5.2.2 LTS, a project asset stage, and a verified skinned-GLB export/import check. The movement stages below remain to be implemented.

## Agreed starting behavior

- The body can translate, rise, fall, and recoil. Its physical orientation stays upright; horizontal facing follows the existing heading control.
- W/S drive continuous forward/back ear rotation. A/D steer the shared heading. Release retains momentum, and opposite input brakes before reversal.
- Both ears share one powered input command and one stamina budget. Begin with a shared swing state for the upright baseline; the later coupled body/ear extension may have separate physical angular states. They have separate anatomical attachment points and contact surfaces.
- Ground contact supplies movement. Swinging in the air adds no separate travel force.
- A small skeleton eventually controls appearance. Body position and active ear motion remain driven by the game physics.
- Downward ear contact should lift and carry the whole body substantially, comparable in scale to the existing weapon-driven movement. The first preview's approximately 0.22 h lift was insufficient.

The revised [motion study](BEAGLE_MOTION_STUDY.md) tests 3.60 h active ear reach, 2.17 h of static support rise, and W+A / W+D / S+A / S+D. These dimensions are a review candidate. Its simplified driven-angle contact model is not the gameplay solver or a balance result.

Revision 06 explores natural ear/body coupling after the upright baseline works. Add a body pitch state, separate ear angular states and inertia, finite hinge motor torque, and damping. Apply equal and opposite hinge reactions; a common input command must not hard-lock the ears to the body or prescribe a full revolution. Keep the paddles rigid with one hinge each. Match head/socket/ear contact transforms to the physical pose. The two Blender comparisons isolate airborne response using a brief test launch pulse, then allow free flight and floor contacts. They do not establish an ear-powered ground launch or an automatic upright landing. Final W/S activation, launch energy, landing recovery, and any posture assistance need an in-game test and review.

Retain active swing authority throughout the coupled extension. W/S supplies continuous hinge drive, release preserves momentum under damping, and reverse input brakes before changing direction, as in `drivePolarAngle` and `motorAcceleration` in `src/physics.js`. A/D steering remains simultaneous. The passive zero-relative-velocity hinge brakes used in revision 06 are not a substitute for this controller. Inputs must move the physical collision shapes, and contact impulses must react on the same ear/body states that are rendered.

The first milestone is **one beagle in a solo test scene that can deliberately move using its ears**. Detailed fur, costumes, facial animation, whole-body tumbling, independently controlled ears, and a general character-selection system can follow once this works.

## Stage 1 Build the blockout and inspect its motion

Create a simple rounded head, small torso, and two rigid ear paddles from primitive geometry. Put visible pivot markers beside the head and draw the intended contact shapes. Start from the brief's proportions, keeping lengths, attachment heights, and lateral clearance adjustable in the prototype.

Provide a developer-only entry to the test scene, using Wankai's existing keyboard conventions and solo camera behavior. Include a fixed side inspection view so attachment and ground-contact errors can be judged without camera motion. Keep the prototype out of the public armory until its preview, loading, and match paths are ready.

First inspect prescribed ear poses with the body held for inspection. Exercise overhead, forward, straight down, backward, and a complete rotation in either direction. This establishes geometry; the next stage enables physical movement.

**Ready to proceed when:** both roots stay beside the head, both paddles clear the skull/muzzle/body through a complete rotation, and the visible paddles agree with the displayed contact shapes. A narrow overlapping root fold should conceal the rotating seam without requiring the head surface to twist through 360 degrees.

## Stage 2 Make planted ears move the body

Implement the attached-ear frame as a separate contact model. Each ear root remains fixed in the character's local head space while its paddle rotates around that root. Yaw moves the character heading and both attachment positions together; pitch rotates the ears without rotating the torso.

The current floating-weapon transform rotates its offset around the body pivot. The new frame must account for the fixed attachment, paddle orientation, contact velocity, and the corresponding impulse response. Review the geometry-dependent gravity torque and inertia as part of this change rather than copying the floating sword's values.

Use the same authoritative pose description to update the visible paddles and their collision proxies. Solve the two ears against one body and the shared angular state. Multiple contacts must not create two copies of motor power or two unrelated body movements.

Enable gravity, floor contacts, and arena bounds. Check one-tip and two-tip support, continuous follow-through after planting, mixed swing/steering, release, reversal, and exhaustion. Ear length and attachment height must supply substantial lift and useful leverage. Start the reach comparison with the revised 3.60 h span at 1.43 h attachment height, then tune from the game solver. Record the actual body rise and travel beside an equivalent sword trial.

Exercise W+A, W+D, S+A, and S+D individually with a camera whose heading stays fixed. The ears must rotate and steer simultaneously while the body follows the contact response. Turning may transfer load to one tip or permit sliding; do not constrain both tips to fixed floor points while changing heading.

**Ready to proceed when:** the player can repeat an intended ground-supported movement with substantial body rise, combine both control axes in all four directions, reverse without an angle flip, and recover a stable pose. The body stays upright, airborne swings do not add horizontal thrust, and neither one-tip nor two-tip support causes persistent floor sinking, jitter, or unexplained launches. Review the long-ear resting pose and coverage before accepting final dimensions.

## Stage 3 Verify hits and clashes

Add an idle opponent, then a controlled weapon clash. Fit rounded collision proxies to the solid paddle surfaces and tips. Keep the small attachment fold clear of the weapon proxies, and review the head/body hurtboxes against the broader beagle blockout.

Treat the two ears as one equipped attack for damage and stamina. Simultaneous contact with an opponent should follow the existing repeat-hit gate, rather than apply the same strike twice. Both ears can physically meet the ground or another weapon, with the response applied to their shared motion.

Use the current stamina costs, fatigue, directional damage, and clash recoil as the initial rules. Start response tuning near the current polearm for comparison, then adjust from observations of the attached-ear geometry. Record chosen dimensions and parameters together.

**Ready to proceed when:** visible hits, nearby misses, blocks, and ground contacts agree; a double-ear strike produces one logical damage event; held input charges stamina once; clashes deflect the pair and recoil the body in the expected heading-relative direction.

## Stage 4 Finalize the model sheet and author a small rig

Update front, side, rear, and action references to the dimensions that worked in the blockout. Finish the model's topology before production rigging. Keep the natural tan paddle direction and the supplied beagle's head, forehead stripe, and expression.

A suitable initial hierarchy is:

```text
root
├── torso
│   ├── L_paw
│   ├── R_paw
│   └── tail
└── head
    ├── L_ear_swing → L_ear_paddle → L_ear_tip
    └── R_ear_swing → R_ear_paddle → R_ear_tip
```

This is twelve bones including the root; the two tip bones are optional. Keep the head stable initially so cosmetic torso lean does not move the ear sockets away from their physical anchors. Any later head motion that moves a socket must also update the corresponding contact frame.

In Blender, place the ear pivots from the validated prototype dimensions. Keep the main paddles firm, clean and normalize skin weights, and limit each vertex to four bone influences. Use the overlapping root construction to accommodate continuous rotation. Verify extreme poses and both directions through a complete rotation before adding secondary animation.

Document who controls each part:

| Part | Motion owner |
| --- | --- |
| Root position and heading | Game physics |
| Ear swing and solid contact pose | Shared ear state from game physics |
| Torso lean, paw gestures, face, and tail | Restrained visual animation |
| Tip flex | Cosmetic only where it does not contradict a visible hit or planted contact |

Export a GLB with the mesh and skeleton. Bake appropriate authored visual animation; implement live ear control in the game. Blender constraints and drivers are authoring tools, so their intended behavior needs baking or an explicit runtime equivalent. Exclude the physics-controlled ear bones from any competing baked swing track.

**Ready to proceed when:** the exported model reproduces the blockout's attachments and reach, the root fold does not collapse at the extremes, skinning preserves paddle volume, and game-driven ear motion remains authoritative after import.

## Stage 5 Integrate and evaluate in the game views

Replace the primitive beagle with the rigged model while retaining the accepted contact model and dimensions. Add both player accent variants, and show the player color on the back. Support independent skeleton instances for two beagles so one fighter's animation cannot alter the other.

Introduce the beagle-plus-ears as one paired loadout when the selection, preview, asset loading, and reset paths support it. The current armory assumes a standalone weapon GLB for every listed entry; update those assumptions deliberately. General character/weapon mixing can be designed separately.

Check solo, practice, fixed-camera duel, and rear split-screen duel. Review the broader head against the camera's current fitting bounds. Test beagle against each existing weapon and another beagle, including rematch, pause, focus loss, exhaustion, arena-edge contacts, and repeated mode changes.

**Ready for a playtest build when:** both players can identify their own beagle from the rear, the new loadout starts and resets correctly, contacts retain their accepted positions, and the complete regression suite plus renderer build pass. A hands-on playtest then judges control feel and balance.

## Code areas and verification

These are implementation targets; this plan does not create the modules or register the new loadout.

| Area | Planned work |
| --- | --- |
| New ear kinematics module | Shared attachment geometry, pose calculation, and contact derivatives; proposed filename `src/ear-kinematics.js` |
| `src/physics.js` | Dispatch the appropriate contact model; review attached-ear gravity/inertia; solve shared ear contacts and pair-level damage |
| `src/scene.js` and a prototype component | Primitive blockout, pivot/contact display, body/ear transforms, later rigged appearance |
| `src/ArenaCanvas.jsx` | Developer prototype entry and eventual character asset lifecycle; avoid a missing standalone weapon-model request |
| `src/game-session.js` | Reuse input mapping; add loadout/reset support when integration begins |
| `src/free-camera.js` | Check head/body fitting after geometry is established |
| `src/Armory.jsx` and `src/weapon-catalog.js` | Paired-loadout preview and selection in the integration stage |
| New ear regression cases | Pose/velocity consistency, continuous rotations, one/two-tip support, no airborne thrust, shared stamina/hit gating |

Before implementation, run the existing checks and record the baseline while preserving the current local changes. For the new mechanics, compare calculated contact velocity with numerical position differences, test both sides of straight down and heading wrap, and verify that rendered attachment transforms match physical points. Cover positive hits and nearby misses, not only stability under sustained input.

Run focused tests as each mechanic is introduced. Run `npm test` and `npm run build` before handing over a playable milestone. Browser inspection should capture the side contact view and the rear gameplay view; automated checks do not establish comfortable movement or final balance.

## First work session deliverable

Aim to complete Stages 1 and 2 first: a developer-only solo scene with a primitive beagle, two visible ear pivots, matching paddle/contact shapes, continuous W/S swings, simultaneous A/D steering, and ground-driven body movement. Keep the art provisional while the attachment clearance and contact leverage are being established.

The first review should establish deliberate travel, substantial body rise, stable attachments through a full swing, and understandable contact while swing and steering run together. Use those observations to decide whether geometry or response needs another pass before combat and finished rigging.

Before calling a later demo a functional weapon preview, show the complete chain: held W/S swing, release and reverse, all four combined swing/turn inputs, ear-powered takeoff from rest, a horizontal dummy hit, a vertical dummy hit, and an actual clash against an existing weapon. Show the held inputs and the physical contact shapes alongside the model. Check one shared stamina charge and one ordinary repeat-hit gate for the pair. Add forward/backward airborne rotation after those functions work, with input still active during the turn. An external launch impulse or a prescribed flip can illustrate a pose but cannot satisfy these checks.
