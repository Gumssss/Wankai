# Orange tabby — Tripo source v01 and prepared asset v02

## Selected runtime — 20 October 2026

The creator approved complete actual-model video v07 and requested game implementation. Prepared v02 is selected for runtime without geometry or texture changes. The live game loads `public/models/orange-tabby-prepared-v02.glb`, SHA256 `3b3893335848deb1d65280e70eabad94005f4c532cd42f7720f92008dbf6cc00`. The exact v06 controller and fitted contacts are implemented in `src/orange-tabby-profile.js` and `src/physics.js`; `src/orange-tabby-model.js` owns independent rigid instances. See [current gameplay and verification](GAMEPLAY.md). Older appearance/motion review notes below describe preceding checkpoints.

---

20 October 2026. **Historical preparation checkpoint:** selected source continued into reversible asset preparation under the user’s “cool … implement it in the game” instruction. Asset/motion review was still pending at that stage; v07 was later approved and integrated as recorded above. The user selected the cute-smile v03 image, requested front/side/back inputs as a permanent workflow rule, and explicitly requested upload and model generation through computer use.

## Prepared asset v02 / accepted functional motion v06

The user rejected v05’s motion/readability and asked for S-driven paw lift plus the beagle v07 functional video standard. [Asset v02](../../../assets/concepts/orange-tabby/prepared-v02/orange-tabby-prepared-v02.glb) lowers the two invisible paw pivots from 0.8 to the seated body base; its [editable packed Blender source](../../../assets/concepts/orange-tabby/prepared-v02/orange-tabby-prepared-v02.blend) preserves the exact neutral world geometry. The original atlas bytes, material, face, paw proportions, tail and 25,000 triangles are unchanged. Export size: 1,135,212 bytes. No new Tripo work or mesh redesign.

Runtime frame: CTRL_Root at solver p.y − 0.59, game yaw −phi. CTRL_Paw_L/R retain lateral positions, now with pivot height **0**, and game Z rotation pi/2 − theta. Rest theta pi/2. Fitted contact local X is old X − 0.8, preserving its neutral world volumes; derivatives match the new full pitch/yaw sweep. There is no skin or baked control clip.

The revised S fixture raises the body base to 2.20087 from 0.35 through paw-floor support, with no pre-contact rise or normal launch impulse. See [v06 motion/review](MOTION_V06.md). Installed Three.js checks verify neutral geometry, byte-identical texture, full-sweep contact alignment, independent copies and functional support. The user subsequently approved the same asset and motion through complete v07. Runtime availability follows that approval, rather than the technical checks alone.

[Measurements](../../../assets/concepts/orange-tabby/prepared-v02/measurements.json) · [contacts](../../../assets/concepts/orange-tabby/prepared-v02/contact-fit.json) · [loader checks](../../../assets/concepts/orange-tabby/prepared-v02/loader-verification.json) · [review](../../previews/orange-tabby/review-v06.html)

## Previous prepared v01 / rejected v05 motion

[Prepared GLB](../../../assets/concepts/orange-tabby/prepared-v01/orange-tabby-prepared-v01.glb) · [Editable packed Blender source](../../../assets/concepts/orange-tabby/prepared-v01/orange-tabby-prepared-v01.blend) · [Motion/asset review](../../previews/orange-tabby/review-v05.html)

The original is untouched. Its three disconnected pieces were separated and reduced to 11,000 body triangles plus 7,000 per paw: **25,000 triangles total, 1,135,244 bytes**, one original 2048 atlas/material. Source seams were merged before splitting; all UV/texture appearance is retained. The seated body is calibrated to 1.45 units (actual reduced bounds 1.45045); Blender +X forward/+Z up exports to game +X/+Y.

`CTRL_Root` owns body-base translation and common heading. `CTRL_Paw_L/R` are independent rigid pitch controls with pivots at 0.8 above the body base and the measured lateral centers. The cat and paws have no mesh connectors, skins or baked clips. Blender Y rotation is theta − pi/2; exported game Z rotation is pi/2 − theta. Root game yaw is −phi, and root Y is solver pivot Y − 0.59. No render-only pose correction is used.

[Measurements](../../../assets/concepts/orange-tabby/prepared-v01/measurements.json), [contact fit](../../../assets/concepts/orange-tabby/prepared-v01/contact-fit.json) and [loader checks](../../../assets/concepts/orange-tabby/prepared-v01/loader-verification.json) record the budget, axes, controls and fitted spheres. Whole-pitch body/paw separation is at least 0.05996 laterally. Cosmetic surface undercoverage reaches approximately 0.14; conservative hurt shapes exclude ear tips/tail. Review these contacts and motion before runtime selection. No special ability was invented.

[Front](../../../assets/concepts/orange-tabby/prepared-v01/prepared-front.png) / [side](../../../assets/concepts/orange-tabby/prepared-v01/prepared-side.png) / [back](../../../assets/concepts/orange-tabby/prepared-v01/prepared-back.png) show the actual optimized mesh. Textured Three.js loading and keyboard movement/reset were inspected in the browser. Maximum sampled loaded-mesh/contact frame discrepancy across 18 extreme poses is 2.34e−8.

Rebuild with `prepare_orange_tabby_v01.py`, `fit_orange_tabby_contacts_v01.py`, `review_orange_tabby_v01.py` through `scripts/blender.sh`; then run `node scripts/preview/verify-orange-tabby-v05.mjs`. Source and export checksums live beside the assets. The source-generation history below remains authoritative for Tripo inputs and the 25-credit charge.

## Original Tripo model and source

- [Open the actual textured model in Tripo](https://studio.tripo3d.ai/workspace/generate/37bbff57-418a-4f36-90a7-b1f154966c9d).
- [Original unmodified GLB](../../../assets/concepts/orange-tabby/tripo-v01/orange-tabby-tripo-v01-source.glb).
- [Blender inspection scene](../../../assets/concepts/orange-tabby/tripo-v01/source-inspection.blend), with the original imported mesh and review cameras/lights. This is an inspection scene, not a refined or rigged production asset.
- [Operation and measured charge](../../../assets/concepts/orange-tabby/tripo-v01/operation.json), [provenance](../../../assets/concepts/orange-tabby/tripo-v01/provenance.json) and [verification](../../../assets/concepts/orange-tabby/tripo-v01/verification.json).

| Measurement | Actual downloaded GLB |
| --- | --- |
| File size | 3,319,720 bytes |
| Triangles / vertices | 96,044 / 51,645 |
| Mesh / material | One mesh, one material |
| Separate connected components | Three: cat body and two paw weapons |
| Texture | One embedded 2048×2048 JPEG |
| Skins / animation clips | None / none |
| Source scale | Normalized Tripo scale; not yet calibrated to game units |

Tripo used H3.1 Best Quality, multi-view Front/Left/Back, 2K texture, Triangle with a 100k target, Ultra off, PBR off and Private visibility. Texture generation disables Generate in Parts; the raw mesh nevertheless has three disconnected geometric components with no arm bridges. One generation cost **25 credits**, measured from balance 3015 to 2990. Export added no observed charge. No retries or extra service operations were submitted.

## Actual mesh review

The service viewer and the downloaded GLB both show the selected smooth cat, centered cute smile, tiny seated body, curled tail and giant separated paws. Actual Blender front/left/back renders inspect paw depth, rear markings and dorsal paw shells. Eye/muzzle contours are softer and slightly less even than the selected image; review those before selecting the base. The original remains untouched.

- [Front render](../../../assets/concepts/orange-tabby/tripo-v01/mesh-front.png)
- [Left profile render](../../../assets/concepts/orange-tabby/tripo-v01/mesh-left.png)
- [Back render](../../../assets/concepts/orange-tabby/tripo-v01/mesh-back.png)
- [Actual Tripo viewer screenshot](../../../assets/concepts/orange-tabby/tripo-v01/tripo-model-review.jpg)

## Three reconstruction inputs and exact prompts

The front image was reused without pixel edits. Missing views were generated with **built-in ImageGen**, all from the selected seed. An initial side attempt rearranged the paws and was rejected; the corrected side uses natural overlap of the outboard paws in profile. Rear surfaces are inferred design proposals, consistent with the selected front and side.

| Input | File | Prompt |
| --- | --- | --- |
| Front | [front.png](../../../assets/concepts/orange-tabby/tripo-input-v02/front.png) | Reused v01 cleanup: [initial](../../../assets/concepts/orange-tabby/tripo-input-v01/prompt.txt), [framing](../../../assets/concepts/orange-tabby/tripo-input-v01/framing-prompt.txt) |
| Left | [left.png](../../../assets/concepts/orange-tabby/tripo-input-v02/left.png) | [Side correction prompt](../../../assets/concepts/orange-tabby/tripo-input-v02/side-correction-prompt.txt) |
| Back | [back.png](../../../assets/concepts/orange-tabby/tripo-input-v02/back.png) | [Back prompt](../../../assets/concepts/orange-tabby/tripo-input-v02/back-prompt.txt) |

[Packet](../../../assets/concepts/orange-tabby/tripo-input-v02/input-plan.json), [image provenance](../../../assets/concepts/orange-tabby/tripo-input-v02/provenance.json) and [input checks](../../../assets/concepts/orange-tabby/tripo-input-v02/verification.json) preserve the exact files/settings. The skill's source and installed copies now require a front/side/back set before every new Tripo model generation.

## Reproduce the source inspection

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 --python assets/concepts/orange-tabby/tripo-v01/render-inspection.py
```

The original GLB checksum is recorded in source-inspection.json and was unchanged after Blender import/rendering. Mesh metrics match Tripo's viewer. Source axes are glTF Y-up with +Z front; Blender import gives +Z up and -Y front. Do not treat this normalized source as the final game transform.

## Current next step

Prepared v02 and v06 motion were accepted through complete v07 and are integrated locally. Continue [live gameplay review](GAMEPLAY.md) of feel, recovery and balance. V05 remains rejected for insufficient/unclear S lift; do not restore its higher pivots. Preserve the selected face, original Tripo download, editable source, earlier studies and unrelated architecture work. No additional Tripo generation or paid retry is needed; publishing remains a separate delivery action.
