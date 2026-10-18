# Beagle Character and Weapon Ear Design

**18 October 2026 implementation:** The approved smooth Tripo v05 model is now
playable as **比格犬·双耳** in the armory. Its upright movement/combat baseline
matches the latest functional v07 videos. See [current model and runtime
handoff](BEAGLE_MODEL_V05.md) for actual files, controls, contacts and remaining
body-flip/balance work. The design stages below preserve the earlier plan.

Design draft · first rigged model created 18 October 2026

[Model 01](BEAGLE_MODEL_V01.md) now provides the editable Blender source, skinned GLB, turnaround views, and an interactive pose viewer. The approved functional-preview ear dimensions are retained. The first head is narrowed to 0.90 units for full-swing clearance, and the custom rig includes physical ear/body controls plus a separate blink clip. Visual review and gameplay integration remain open.

**A tiny, unimpressed beagle fights and moves on two oversized ears.** Keep the tan ears, white forehead stripe, small white body, and expressive eyelids from the supplied reference. Make the ears the character's defining action: they sweep, block, plant, and carry the body through Wankai's continuous swings.

The recommended direction is natural tan ears with broad, firm striking surfaces, controlled together through the existing four weapon keys. This is a character and gameplay proposal; the current prototype still has one floating weapon per fighter. The dimensions and ear rules below are starting points for concept art and a future greybox.

**The ears are the equipped weapon and must support the same mechanics as the sword, polearm, and hammer.** Player input actively drives them; their actual solid surfaces attack, block, clash, and push against the arena. Natural follow-through must preserve that control and use the same physical pose as the weapon contacts. Passive swinging alone does not meet this requirement.

Revision 07 now provides an offline functional preview: an experimental anatomical ear frame runs through the current game's powered controller, ground contacts, stamina, damage, and clash rules. Its [movement and combat videos](BEAGLE_MOTION_STUDY.md#revision-07--powered-weapon-ears-with-game-contact-and-combat-rules) show the pair moving the body, responding to combined inputs, hitting a dummy, and clashing with a sword. The preview retains the current upright body model; it is not a production loadout or an implemented aerial body-pitch controller.

The creator agreed to start with an upright physical body that can move and rise through ear contact, with a lightweight visual skeleton added after a primitive movement test. The [beagle prototype plan](BEAGLE_PROTOTYPE_PLAN.md) sets out that implementation sequence and its review checks.

The revised [motion study](BEAGLE_MOTION_STUDY.md) tests a higher body vault and all four simultaneous swing/turn inputs. The creator rejected the first study's small lift. Longer active ear reach is now a candidate for review; final ear proportions remain open.

Revision 06 isolates how body and ears can influence each other under momentum. Each ear remains one rigid paddle with one head hinge. Its two airborne comparisons use a test launch and passive hinge braking; they do not demonstrate W/S drive, A/D steering, weapon damage, or an ear-powered takeoff. The creator clarified afterward that the ears must retain all ordinary weapon functions. Treat these clips as secondary-motion references, not accepted weapon controllers. The next prototype must combine powered ear control with contact-driven body movement and combat. Earlier folding, counter-rotation, and fixed-relative-angle studies remain for comparison.

## Reference and design intent

![User supplied beagle expression reference](reference/beagle-reference-sheet.png)

The user's supplied collage is the visual reference. Matching images are indexed as 比格多栋 in this [reference collection](https://www.sohu.com/a/889492617_121123944). The collage establishes appearance and expression; its varied costumes are examples, rather than a combined outfit.

Working design label: **双耳剑客 / Beagle Ear Duelist**. The role is a mischievous close-range fighter whose apparent laziness contrasts with committed, sweeping ear attacks. Its ambition is simple: look entirely unbothered while trying very hard to win. Show that through lowered eyelids, a slight smirk, tucked paws, and ears that visibly do the work.

| Preserve from the reference | Adapt for Wankai |
| --- | --- |
| Broad tan drooping ears attached to the sides of the head | Extend their usable length and define firm contact surfaces for movement and combat |
| Oversized head, short muzzle, white forehead blaze | Keep the head readable from the rear and avoid an oversized invisible hurtbox mismatch |
| Half-lidded eyes with large black pupils | Use simple eyelid shapes that also support surprise, strain, and victory |
| Very small white torso and tiny paws | Keep the torso upright; paws emote while ears provide locomotion |
| Minimal linework and flat color regions | Translate to smooth 3D volumes, matte surfaces, and broad color blocks |

## Recommended silhouette

Describe the character using three shape families: a rounded rectangular head, a small bean-shaped torso, and two long paddle-shaped ears. Rounded edges keep its dog identity; the long, flatter ear surfaces make its fighting role clear.

The three landmarks are **the wide head**, **the two hanging ear paddles**, and **the tiny body suspended between them**. In color, the white forehead stripe supplies a fourth identity cue. Preserve a visible gap between each ear and the lower torso. Use expression and pose for asymmetry; keep the ears equal in length and mass.

Three directions were considered for the brief:

| Direction | Ear silhouette | Benefit | Tradeoff |
| --- | --- | --- | --- |
| **A · Broad natural ears · recommended** | Long tan paddles, narrow attachment, rounded ends | Closest to the reference; broad surfaces explain support and blocking | Needs careful clearance beside the head during a full rotation |
| B · Narrow saber ears | Slender ears with a curved outer edge | Strong cutting silhouette and clearer space around the body | Loses some of the reference's broad, floppy-ear identity |
| C · Ribbon ears | Very long ears with several visible bends | Exaggerated, expressive movement | Flexible-looking curves make reach and solid contact harder to judge |

Develop A first. Keep the natural ear material and rounded tips. The weapon quality comes from their shape and motion; a metal transformation is an optional later direction.

## Proportions for the first model sheet

Use **h = skull height**, excluding ears. These are proposed construction measurements, not measurements extracted from the collage.

| Feature | Starting measurement |
| --- | --- |
| Body and skull together | 1.70 h tall, excluding raised ears and expressive squash |
| Skull | 1.00 h high × 1.00 h wide × 0.72 h deep |
| Torso | 0.80 h high × 0.58 h wide × 0.48 h deep; overlaps the skull by 0.10 h |
| Muzzle | 0.52 h wide; projects 0.16 h beyond the face |
| Forehead stripe | Approximately 0.15 h wide, widening into the muzzle |
| Each ear, revised active-reach candidate | 3.60 h along its centerline × 0.40 h at its broadest × approximately 0.11 h thick; proportion test, not approved final art |
| Ear attachment height | Approximately 1.43 h above the unlifted body base |
| Downward reach in the revised support pose | 3.60 h when straight down; approximately 2.17 h of body rise above the unlifted base |
| Whole resting silhouette | Head and side attachments approximately 1.70 h wide; the revised long-ear resting pose still needs design |
| Paws | 0.16 h long, tucked beside the torso; no locomotion animation |
| Tail | One short upward curve, approximately 0.22 h long |

Use ±5% as the concept-sheet tolerance for the skull and torso. Keep both ear lengths equal and their attachment points fixed across views. In a game model, the active striking sections keep constant dimensions; expression may change eyelids, mouth, paws, and a small amount of cosmetic body squash.

Start a future greybox with h near 1 game unit. The resulting body height is close to the current visible fighter's roughly 1.71-unit extent, but the broader skull will require a hurtbox review. This is a scale comparison, not a drop-in collider fit.

## Palette and materials

Use three main value groups: tan ears/head, a light muzzle/body, and dark facial features. The hex values are proposed art swatches chosen from the reference's appearance. Player accent colors come from the current arena code.

| Role | Color | Use |
| --- | --- | --- |
| Tan | `#CC9854` | Ears and upper head; the dominant identity color |
| Warm white | `#FFF7E8` | Forehead stripe, muzzle, belly, paws |
| Dark brown | `#302922` | Eyes, nose, mouth, restrained edge definition |
| P1 terracotta | `#C4684F` | Broad bib or collar panel, including the back |
| P2 teal | `#568D92` | Same areas on the second player's variant |

Keep fur smooth and matte, with no individual hair strands or noisy fur normal map. The ears are slightly thicker than a paper cutout, with a soft bevel that catches arena light. Eyes and nose may have a small highlight; avoid polished metal reflections on the ears.

A small triangular bib is the only main accessory. Carry its player color around the neck and onto a broad upper-back panel so it reads from Wankai's rear cameras. Give P1 a large round patch and P2 a large chevron on that panel as additional identification cues. The tan/white identity stays consistent for both players.

The arena's cream floor is close in value to the white body. Judge body separation through tan framing, the colored back panel, and the existing contact shadow. Dark edge definition is a fallback to evaluate in the renderer; a new outline effect is not a requirement of this design.

## How the weapon ears work

Each ear has a short, visibly attached hinge and a broad paddle that reads as a solid weapon. The hinge bends enough to clear the skull; the main striking surface stays firm during gameplay. Expressive follow-through must remain close to the actual contact shape. Both ears retain their length and stay attached throughout a swing.

**Treat the pair as one equipped weapon with one shared input phase.** Both ears sweep in the same direction through parallel lanes outside the head. A slight difference in pose can add personality in portraits, but gameplay should avoid large untracked delays between the two visible weapons.

| Existing input convention | Proposed ear action |
| --- | --- |
| W / ↑ | Drive both ears forward in their vertical swing planes; from overhead, descend toward the face side |
| S / ↓ | Drive both ears backward through the same continuous rotation |
| A / ← and D / → | Steer the shared heading and the character's facing |
| Release | Preserve momentum; damp gradually according to the eventual weapon profile |
| Reverse direction | Brake before reversing, following the existing control rule |
| Combine swing and steering | Curve the swing/contact path; keep camera direction independent |

### Functional weapon requirements

Use the existing continuous weapon controller as the starting behavior. Holding W/S applies powered angular acceleration through the head hinges; it does not select an ear pose or play a flip animation. Holding A/D drives horizontal steering at the same time. Releasing input removes motor drive while gravity, damping, and contact impulses continue. Opposite input brakes before reversing. Keep the paddles firm and solid during every phase, including exhaustion and flight.

| Existing weapon function | Required ear behavior |
| --- | --- |
| Vertical attacks | W/S continuously drive both paddles through the front, down, rear, and overhead poses |
| Horizontal attacks | A/D sweeps the actual ear surfaces through opponents; retain the game's directional damage weighting |
| Combined inputs | W+A, W+D, S+A, and S+D affect the same physical motion simultaneously |
| Ground-driven movement | A planted paddle transmits contact impulses to lift and carry the body; no separate walking force or test launch pulse |
| Blocks and clashes | Both paddles have solid contact shapes; impacts deflect their motion and recoil the fighter under the ordinary clash rules |
| Damage | Use actual contact-point motion and the existing damage/repeat-hit rules; two ear contacts do not automatically produce two damage awards |
| Stamina | One shared swing/turn cost, fatigue response, and recovery schedule for the pair |
| Airborne control | Input continues to drive the ears during body rotation; internal reactions may change orientation but do not supply free translational thrust |
| Visual agreement | Render the same ear angles, sockets, and solid dimensions used for ground, hit, and clash queries |

Natural motion comes from finite motor strength, inertia, damping, and contact deflection. The body and ears can rotate together while their relative angle still changes. Do not replace the player's swing with a weak passive hinge, and do not hide a rigid collision weapon under independently swinging ear art. Any visible tip flex must stay small enough to preserve contact agreement. Body pitch is an extension to the current upright solver and must be included in contact transforms and velocities before aerial flips become gameplay.

The shared weapon rules are required; the pair's length, inertia, acceleration, braking strength, and speed limit still need their own balance profile. Sharing one input command and stamina budget does not require hard-locking two physical ears to the same angle after different contacts. Divide the intended pair-level drive budget deliberately so adding a second paddle does not double motor power.

With the ears approximately level, A/D sweeps them horizontally through an opponent. The target demonstration isolates this pose; it does not establish a new automatic pitch-hold mechanic. Forward and backward aerial rotation are proposed extensions with a centered body pitch state. Apply finite motor torque and damping at each head hinge so the ears can lag, swing, and transfer reaction torque to the body. Keep each paddle rigid. Rotate the head hurtbox, sockets, and ear contacts with the displayed body pose. The pair shares an input command; that need not force their physical angles to be identical after different contacts.

The ears must pass through overhead, front, downward, and rear poses continuously. Show both attachment lanes in the model sheet so this full rotation does not cut through the skull, muzzle, bib, or paws. A slash is driven by the visible ear motion. The body stays upright, matching the current game.

Natural-looking ears should still read as contact-capable when resting. The revised motion study shows active, extended ears; it does not settle the compact resting pose. Folding the longer ears at rest would require articulated visible geometry and matching contact shapes. Do not show a deeply curled idle ear while using a straight invisible collision segment underneath it.

### Ground support geometry

The first 1.65 h ears only raised the body about **0.22 h** in the rendered straight-down pose. The earlier conservative estimate was 0.18 h. The creator requested a much higher rise, comparable to the existing weapon-driven characters, so that geometry is no longer the movement target.

Revision 02 tests a **3.60 h active ear span** with the same 1.43 h attachment height. Straight-down support can raise the base by **3.60 − 1.43 = 2.17 h**. For comparison, the existing sword's nominal tip support gives approximately **1.20 + 1.45 + 0.09 − 0.59 = 2.15 game units** of rise above its normal body-pivot height. These are geometric comparisons at h ≈ 1 unit, not measured gameplay jump heights. The revised simplified animation reaches about 2.36 h with launch momentum.

This longer reach visibly changes the silhouette and attack coverage. Review that tradeoff before final modeling. If compact ears are retained, a different explicit launch mechanism or faster motion would need design and testing; a whole-body skeleton alone does not create the missing leverage.

As a planted ear continues rotating, contact should carry and lift the body through the existing movement principle. Air swings provide no independent travel force. If the first greybox cannot move deliberately, revisit ear length, attachment, and contact leverage before compensating with an invisible walking force.

### Combat role and tradeoffs

The pair aims for sweeping pressure with broad, readable blocking surfaces. The revised long-ear candidate needs a fresh reach and coverage comparison with the polearm. Compared with the sword its wide pair is more exposed to clashes; compared with the hammer it has no heavy-head bonus. Its two surfaces must not grant an automatic damage multiplier.

For an initial gameplay experiment, compare a shared response profile near the current polearm before introducing special abilities. The current polearm trial caps each axis at 4.25 rad/s; that value is a comparison baseline, not accepted beagle tuning. Attached ears have different reach and leverage even at the same angular speed.

Count one logical attack when the two ears strike the same opponent together. Use one pair-level stamina cost and one damage event under the existing repeat-hit gate. Both solid ear surfaces may participate in blocks and ground support, with physical impulses solved together. Any increase in coverage is part of the balance test. Keep ordinary head/torso damage, directional damage weighting, and clash recoil as the starting rules.

Use the current shared combat rules as the initial experiment baseline:

| Rule | Starting baseline |
| --- | --- |
| Health and stamina | 100 of each, tracked separately |
| Active ear input cost | 20 stamina/s for the pair's swing input; 8/s for steering; combine the costs when both axes are active |
| Recovery | After 0.5 s without weapon input, recover 30 stamina/s |
| Exhaustion | Below 25 stamina, powered control weakens toward 40% at zero; retain reverse braking, released inertia, and solid support |
| Directional damage | Pure horizontal-turn hits use 50% of equivalent vertical-hit damage; mixed motion follows the existing weighting |
| Contact feedback | Light touches remain harmless under the existing speed threshold; clear clashes deflect the ears and recoil the fighter |

The rounded tips and broad ear surfaces remain solid at every stamina level. Tired animation must not imply that a planted support suddenly becomes limp.

## Required poses and expressions

The neutral attitude is **unimpressed, alert, and a little smug**. Keep the face broad and simple. Eyelids carry most of the acting so the character remains recognizable when the mouth changes.

| State | Face and body | Ear silhouette and gameplay read |
| --- | --- | --- |
| Neutral | Half-lidded eyes, tiny closed mouth, paws tucked | Resting pose for the longer reach remains to be resolved; preserve matching visible and physical shapes |
| Forward swing | Eyes narrow toward the intended path; small paw brace | Ears sweep from overhead toward the front, with the face unobscured |
| Backward swing | Glance slightly back while the body remains upright | Both ears pass behind through the same full rotation |
| Ground plant | Determined eyes, restrained cheek compression | Firm ear tips visibly meet the floor; tiny body rides above them |
| Lift and follow-through | Paws lift slightly; expression briefly focused | Ear roots remain attached while the body is carried through contact |
| Clear clash | Eyes widen for one beat | Ear surfaces deflect; the body recoils opposite its own heading |
| Low stamina | Lower lids, smaller mouth, effort visible in the paws | Powered motion weakens; ears retain solid support and braking behavior |
| Hit surprise | Round eyes and small open mouth | Follow the actual deflection; no head roll that obscures the next input direction |
| Happy victory | Small satisfied smile; one raised paw | A readable asymmetrical ear pose after active combat ends |
| Sad defeat | Downturned lids and mouth | Ears settle and droop; any collapse belongs to the results animation |
| Angry resolve | Angled lids, compact mouth | Ears hold an assertive pose without adding spikes or changing proportions |

Include a separate close-up expression row for neutral, happy, sad, angry, surprised, and determined. Keep skull proportions and the white stripe unchanged. Large anime eye sparkles, sweat drops, and handheld props from the collage can remain portrait embellishments; the gameplay identity must survive without them.

## Views for the concept sheet

Produce front, side, back, and three-quarter views at the same scale in the same neutral pose. Add construction lines and a simple color version. The rear view is a primary gameplay view.

| View | What it must resolve |
| --- | --- |
| Front | Head/body ratio, eye placement, forehead stripe, equal ears, and clear space beside the torso |
| Side | Muzzle depth, ear thickness, real attachment, and the path past the face and body |
| Back | Ear roots, unobstructed back panel, tail direction, and clear separation of the two ears |
| Rear three-quarter | Recognition from the approved camera's approximate 15° heading offset |
| Overhead and downward action views | Continuous ear rotation, outboard clearance, planted contact, and body lift |

Keep the camera-facing silhouettes of forward swing, backward swing, and ground support distinct. At a 32 px silhouette size, prioritize head, two ears, and small torso. At 64–128 px, preserve tan/white separation, facing, and the player accent. These are review sizes; actual projected gameplay size still needs measuring in Wankai's split-screen panes.

For an icon, use the face and both hanging ears with a thick white stripe. Do not shrink an entire wide attack pose into a tiny square and expect the expression to survive.

## Modeling and implementation handoff

| Topic | Required treatment |
| --- | --- |
| Root and facing | Keep the body upright and aligned to fighter heading; document the model's forward axis and origin |
| Ear attachment | Use anatomical side roots; show the clearance route around the skull in all action views |
| Deformation | Concentrate bending near the attachment; keep the striking paddle's length and volume stable |
| Contact shapes | Fit simplified proxies to the visible solid paddles and rounded tips; leave the small attachment fold clear |
| Hurtboxes | Review the wider skull against the existing head/body spheres; avoid a large decorative head that appears hittable outside its proxy |
| Shared motion | Drive visuals and contact proxies from the same state, including headings that wrap and swings past straight down |
| Camera fitting | Check the larger head against the current framing bounds; the whole ear span is not guaranteed to remain visible |
| Export | Target a skinned GLB with editable authoring sources kept separately; skeleton authoring follows concept selection |
| Initial asset budget | Aim for at most 20k triangles total, a 1K base-color atlas, and at most three material slots; revise from measured appearance and rendering cost |

**Attached ears require a new contact transform.** The current `weaponPointFrame` rotates a floating, offset weapon around the body pivot. Simply putting an ear mesh on the existing sword would separate its visible attachment from its physical pivot. The future implementation needs shared swing/heading state, two anchored contact paths, matching velocity/impulse calculations, and pair-level hit/stamina handling.

Character-specific equipment also needs a loadout decision: the current armory selects a weapon independently for each fighter and has no character selector. Prototype the beagle and ears as a dedicated paired loadout first; decide later whether that character can equip the existing weapons. Designing this pair does not reopen the deferred precision-staff project.

## Review and next production step

The brief defines a direction. Turnarounds, silhouette results, deformation, and gameplay acceptance remain to be demonstrated with art and a greybox.

- [ ] Draw A in front, side, back, and rear three-quarter views, plus forward swing and ground support.
- [ ] Compare solid black versions at 32 px and color versions at 64/128 px; retain visible negative space and facing cues.
- [ ] Check both player variants on the actual cream arena, in shadow, and under warm, neutral, and cool preview light.
- [ ] Match the visible skull and ear shapes to their proposed hurt/contact proxies.
- [ ] Sweep through a full rotation with consistent ear lengths, stable attachments, and no face/body clipping.
- [ ] Test deliberate support movement, reversal braking, released inertia, exhausted control, and clashes in a greybox.
- [ ] Show a substantial body vault and W+A, W+D, S+A, and S+D; review the 3.60 h reach candidate and its resting silhouette before final art.
- [ ] Verify that two ear contacts cannot double-charge stamina or double-apply a single attack's damage.
- [ ] Review rear-view identification and matching-beagle duels in both split-screen panes.

The next visual deliverable is one concept sheet for direction A. A suitable handoff description is: “Use the attached beagle reference for its tan drooping ears, white forehead stripe, tiny body, and unimpressed expression. Adapt it into an upright Wankai fighter whose two broad natural ears are its weapons and ground supports. Show equal-length ears with visible side attachments, a restrained player-color bib, consistent front/side/back proportions, and separate forward-swing and planted-ear support poses. Keep the body upright, surfaces matte, detail sparse, and the ears rounded and organic.”

## Project and reference records

- [Game rules and camera](CONTROL_SYSTEM.md), [design handoff](DESIGN_HANDOFF.md), and [project skill guide](SKILLS.md).
- [Current weapon profiles and contact transforms](../src/physics.js), [fighter appearance](../src/scene.js), and [camera fitting](../src/free-camera.js).
- [Local reference and planned asset manifest](../assets/concepts/beagle/manifest.json). The supplied collage is stored as a design reference, outside the runtime models directory. Original creator and reuse terms have not been established by the repost collection.
