# Beagle: preferred smooth-ear model

The selected appearance is the earlier **Tripo v02** beagle, asset
`6db09ed1-8155-4b84-8dae-fb67085c611f`. The wider, scalloped plush v04 study
was rejected by the user on 18 October 2026. Keep its files as a study; do not
use it as the character's current art direction.

## Deliverables

- Editable rig: `assets/source/blender/beagle-smooth-ear-duelist-v05.blend`
- Rigged GLB: `public/models/beagle-smooth-ear-duelist-v05.glb`
- Compact comparison: `public/models/beagle-smooth-appearance-v05.glb`
- Browser review: `docs/previews/beagle-model-v05.html`
- Shared base color: `assets/source/textures/beagle-tripo-v05/basecolor.png`
- Build script: `scripts/blender/build_beagle_tripo_v05.py`
- Import verification: `scripts/blender/verify-beagle-tripo-v05.mjs`
- Measured geometry, pivots and guide sections:
  `assets/concepts/beagle/tripo-v05/rig-report.json`
- Recorded rig/contact checks: `assets/concepts/beagle/tripo-v05/verification.json`
- Fresh Three.js checks: `output/blender/beagle-tripo-v05/three-report.json`

The game now registers **比格犬·双耳** as a paired character/weapon loadout in
the armory. P1/P2 can choose it independently in solo, practice, split-screen
and fixed-camera matches. Its actual rig follows the shared game solver.
The separate model-review page's automatic floor clearance remains a pose
inspection convenience; the game uses contact impulses to lift the body.

## Source and appearance

The original downloaded Tripo GLB and appearance Blender file are preserved in
the local authoring archive, excluded from Git because of their size. The packed
editable v05 Blender rig and both compact GLBs are included in the repository.
Tripo segmented the existing textured model into thirteen native parts for 40
credits; this step did not regenerate a character or repaint the face. The
separated download is `assets/source/tripo/beagle-v05/original-separated.glb`.

Blender closes the cut surfaces, repairs small inherited mesh defects, reduces
the geometry, and reprojects the original paint onto one 2048-pixel atlas. The
new inner attachment surfaces receive matching tan/white fill. The outer ear
contours, face, head, paws, feet, tail and neutral body proportions come from
the preferred source. Reduction and reprojection can introduce small surface
differences and should still receive an art review.

The ears keep the earlier width and smooth rounded tips. Their middle portions
are lengthened to a 3.60-unit longitudinal reach; the first root section and
rounded tip section retain their local shape. They are placed slightly farther
outboard so their actual full volume clears the original head during a complete
hinge rotation. Rounded joint covers bridge the attachment.

## Rig and coordinates

Blender uses +X forward and +Z up. glTF/Three.js uses +X forward and +Y up.
There is one rigid hinge at the root of each ear, with no midpoint joints.

| Control | Use |
| --- | --- |
| `root` | Character translation and yaw |
| `body_pitch` | Whole body pitch, carrying the head and ear sockets |
| `head` | Small cosmetic head poses |
| `L_ear_swing`, `R_ear_swing` | Independent local-Y hinge rotations |
| `L_paw`, `R_paw` | Tucked paw posing |
| `tail` | Tail pose |
| `jaw` | Small lower muzzle deformation |
| `L_lid`, `R_lid` | Eye volume retraction beneath the upper lids for blinking |
| `L_brow`, `R_brow` | Small upper lid/brow deformations |

All bones have unit bind scale. Ear geometry is authored at a bind pitch of
**−1.55 radians**. Apply `physical_theta - (-1.55)` about each ear bone's local Y
axis. Body pitch also uses local Y; Blender yaw uses local Z. The optional
`Beagle_Blink` clip only controls the two lid bones. It contains no ear, root or
body pitch tracks. Facial controls are deliberately modest and are not a dialog
or facial performance system.

## Gameplay integration

The game uses its shared W/S motor, A/D steering, simultaneous input, stamina,
inertia, reversal braking, ground reaction, damage, block and clash rules.
Each ear rotates around its measured head socket. Both use one powered swing
state, stamina budget and pair-level repeat-hit gate. The wider skull has
matching head and torso/paw hurt shapes. No authored attack animation bypasses
these rules.

Ten hidden convex source guides follow the ear volumes, five sections per ear.
They are excluded from the GLB and are authoring guides. The initial runtime
profile in `src/beagle-profile.js` fits eighteen capsules to the actual ear
surfaces and uses the measured v05 sockets. Regenerate it with
`node scripts/blender/fit-beagle-contacts.mjs`; its contact-fit report records
maximum and RMS surface gaps. The old v07 thin paddle profile and ±0.66 sockets
are not used. The first response profile retains v07's 4.25 rad/s limit and
shared motor settings, adding yaw inertia for the side anchors. Competitive
coverage and inertia tuning still need hands-on playtesting.

The rig supports full body pitch. Gameplay currently implements the upright body
baseline from the functional v07 videos, including contact-driven rise,
translation and recoil. **The earlier requested backward and forward body flips
are still missing.** Holding S rotates the ears backward; it does not yet rotate
the body. This is an implementation gap relative to the earlier flip studies.

Next, add a physical body-pitch state and hinge reaction so the body, head and
ear sockets rotate together while the ears retain their own relative momentum.
Ground contacts, hurt shapes and rendering must use the same rotated pose.
Backward support should be able to produce a backflip, and forward support a
front flip, when contact and momentum are sufficient; A/D must still work during
either. Do not force a complete somersault just because S or W is held, or play a
visual flip over upright collision shapes. Separate ear angular states and
competitive balance also remain open.

Runtime helpers live in `src/beagle-model.js`. SkeletonUtils clones keep players'
bones and materials independent; only the bib uses player colour. Solo and split
cameras fit the full ear envelope. See `tests/beagle-gameplay.test.js` and
`tests/beagle-model.test.js` for contact response, combined inputs, damage/clash
rules, actual GLB-to-physics alignment and independent instances.

## Rebuild

For normal mesh edits, open the packed v05 `.blend`, preserve the armature and
export the selected runtime meshes/rig as GLB. Players need neither Blender nor
Tripo. Rebuilding from the original Tripo segmentation requires restoring the
two locally archived source GLBs at `assets/source/tripo/beagle-v02/original.glb`
and `assets/source/tripo/beagle-v05/original-separated.glb` first:

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 \
  --python scripts/blender/build_beagle_tripo_v05.py -- --render
node scripts/blender/verify-beagle-tripo-v05.mjs
node scripts/blender/fit-beagle-contacts.mjs
npm test
```

The build refreshes the v05 generated deliverables and tracked geometry report.
The Node verification and contact-fit commands work on a fresh clone using the
included GLB/report, without the raw Tripo downloads. Generated review output is
ignored by Git.
