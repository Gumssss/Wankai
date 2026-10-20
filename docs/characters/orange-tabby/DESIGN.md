# Orange tabby — floating seated body and enormous paws

## Current accepted design — 20 October 2026

The cute-smile v03 seed became selected Tripo source v01, prepared asset v02 and the local playable **orange-tabby + cat-paws** loadout. Complete motion presentation v07 was approved; runtime uses its unchanged v06 physical controller. Keep the wide rounded-square head, half-lidded graphic eyes, tiny centered rounded smile, smooth orange/cream tabby patches, compact seated body, tucked feet and curled tail. Two enormous feline paw weapons float separately, with four rounded toes/pads and a central pink pad; there are no arm/wrist connectors. Small ears remain decorative.

The body stays seated and upright in a low 0.35-unit rest hover. W/S drives both paws, A/D steers common heading and all four simultaneous combinations work. Physical paw-floor support provides additional travel/rise, including the accepted S lift. There is no cat special ability. Prepared v02 retains 25,000 triangles and the original one-material 2K atlas; its invisible paw pivots are at body-base height 0. Preserve this accepted geometry/frame rather than prototype dimensions below.

See [MODEL](MODEL.md) for exact sources/transforms and [GAMEPLAY](GAMEPLAY.md) for the live game, current preparation screen and verification. The creator prefers live review once a change is implemented. No new appearance search, Tripo job or spending approval is needed to continue the accepted cat.

## Historical design and image-preparation notes

The following notes retain the original proposals, rejections and image-only endpoints. Their “latest,” “pending” and “provisional” wording describes those earlier stages, not the playable state above.


Selected appearance seed: **cute-smile reference v03**, based on the user-liked beagle-style v02. Preserve the wide rounded-square head, tiny seated bean body, smooth matte volumes, graphic half-lidded eyes, broad orange/cream tabby patches and enormous disconnected floating paws. Latest user request: make the cat's smile slightly cuter than the beagle's cool expression. V03 replaces the one-sided smirk with a small centered rounded cat smile and gently softens the expression. The overall design received positive feedback; the user has now selected the last cute-smile image for Tripo input preparation. Selected image, exact prompt and provenance are in `assets/concepts/orange-tabby/beagle-style-reference-v03/`; the original beagle analysis and v02 generation prompts remain in `beagle-style-reference-v02/`.

Hosico remains loose golden-cat/round-cheek inspiration. The real photo was not an input to v02; the approved beagle concept and actual-model render were the style inputs. Prior v01 image and all v04 mechanical studies remain preserved as history.


19 October 2026. **Appearance review reopened:** user rejected v04 as creepy and requests a cartoon Rocky reference search first, approval second, then image creation. The v04 specification below is retained as historical/provisional, not approved appearance.

Previous direction v04 follows the user's latest instruction: return to the model, use a sitting-cat gesture reference, remove the need for any body–huge-hand connection, and enlarge the hands further. Standing v02 and floor-adjacent v03 are superseded by the floating revision. The interrupted Rocky-cartoon search is canceled; preserve the original orange-tabby identity unless the user later changes it.

## Identity and gesture

Keep the original supplied orange/white tabby reference: round cheeks, triangular ears, expressive green eyes, white muzzle/bib/paws, orange stripes, pink nose/pads and a striped tail. The original paw reference supplies four rounded toes, pink pads and small claws. Do not replace the face with the photographed cat or copy screenshot UI.

The selected gesture photo is [Orange Tabby Cat Sitting Down](https://commons.wikimedia.org/wiki/File:Orange_Tabby_Cat_Sitting_Down.jpg), by Asabae2752 (CC BY-SA 4.0). Use low haunches, lifted chest and tucked feet. The secondary [frontal seated cat by elljay](https://pixabay.com/photos/cat-sitting-orange-tabby-orange-1114726/) helps with the compact silhouette and curled tail. Unmodified reference previews, URLs, authors, licenses and hashes are saved under motion-v03/pose-references.json. These are pose references, not a newly selected coat/face design.

## Body and hands

The body keeps a seated silhouette while hovering 0.35 units above the floor, with round haunches, two small tucked hind feet, a lifted head/chest and a low curled tail. Remove the standing hind-leg columns. The two enormous weapon paws are detached floating forms: no shoulder, upper arm, forearm, wrist bridge, cable or connecting mesh. They are the working front paws; do not add another pair of fighting arms to the seated body. The user's explicit detached-hand direction supersedes the earlier anatomical attachment requirement.

Prototype paw scale is 4.5 uniformly relative to v01, compared with v02's 2.5 / 2.3 / 2.7. Palm width is about 1.98 units versus the previous 1.01 and head width 1.18. Each paw is larger than the head and almost twice the previous width. Place centers roughly 2.05 units outboard so the gaps to the body remain visible (a conservative 0.2815-unit lateral envelope gap in v03). Resting paws hover beside/in front of the cat, with about 1.15 units of proxy clearance above the floor. Their render/contact transforms must agree despite having no visible connection.

A provisional virtual pivot is 1.35 above the body base, with 1.45 radial center reach. Large paw/toe/claw volumes provide support leverage. These are study dimensions; do not treat them as a locked final rig, reach, damage or jump target.

## Motion interpretation

Retain ordinary paired W/S swings and A/D common-heading steering using the beagle normal-drive values: 24 acceleration, 30 reverse braking, 4.25 maximum swing rate and 1.15 steering target with 0.70 feedback. Add bounded low-hover spring lift (gain 25, damping 9, cap gravity+12) and compensate the floating paws’ gravity; do not prescribe a translation path. Continue these controls, now through invisible game constraints as with floating weapons. Paw-floor impulses can lift and carry the seated body. The body keeps its seated silhouette during travel and landing; it no longer needs a standing pose. No independent walking or special ability is selected. Hover is an ordinary prototype force here; it does not copy the beagle’s timed F rotor ability. Retain the game's ordinary shared stamina, repeat-hit, directional damage and clash rules.

Author Blender +X forward / +Z up, export later as GLB +Y up. Engine/cameras and production budgets remain provisional as before (about 25k triangles, one 2K atlas, at most three materials, four influences/vertex, approximately 4 MB). No bone count is fixed. No new cat Tripo spending is authorized. Tripo remains the required production base route; this local primitive is a review study only.

## Review state

Seated gesture, disconnected hands, enlargement and the new airborne pose are explicit user directions. The user explicitly corrected “ears” to “giant paws”; small ears remain decorative. Present the actual revised model and changed moves through video. Do not ask the user to choose standing again. Validate the much larger weapon volumes and support/control behavior before final geometry, then prepare the exact Tripo input/spending packet for its separate review.


## Tripo input preparation v01

The user selected the last cute-smile image and reattached it. Preserve that exact appearance and relative scale. Prepare a single clean white-background individual reconstruction image, remove the floor/cast shadows, and uniformly reframe for safe margins. The unmodified selected attachment, brief, cleanup/framing prompts, final clean image and provenance are in `assets/concepts/orange-tabby/tripo-input-v01/`. This task ends at the reconstruction image; no production mesh or runtime change is requested at this stage.

Clean machine input: `assets/concepts/orange-tabby/tripo-input-v01/orange-tabby-tripo-input-v01.png` (1536×1024). Cleanup removed the studio floor/background; a targeted framing correction added outer side margins of approximately 8.7% and 8.9%. `verification.json` records decoded-file, source-preservation and margin/background checks. `input-plan.json` records the single-view strategy and future Tripo operation fields with settings and costs left unknown.


## Actual Tripo candidate v01

The selected image was reconstructed using the new required front/left/back packet. Original textured GLB and actual front/side/back mesh inspection are in `tripo-v01/`; see MODEL.md. One model generation cost 25 credits. The smooth seated cat, cute centered mouth and giant detached paws are retained, with slightly softened eye/muzzle contours. Actual model appearance remains pending selection; no rig or runtime integration is implied.
