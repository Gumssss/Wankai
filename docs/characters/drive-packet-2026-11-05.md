# Drive characters — 5 November 2026

> 8 November 2026 更新：CR7 与 Mean Girl 已完成本地技能实现；下面保留历史设计/导入记录。当前状态见 [实现与验证](CR7_MEANGIRL_IMPLEMENTED.md)。

Implemented on `feat/drive-characters`, based on integration commit `787b077`. Published to [the GitHub feature branch](https://github.com/Gumssss/Wankai/tree/feat/drive-characters) on 6 November 2026, with gameplay checkpoint `43e7f8e`. The user confirmed CR7 + soccer ball, Mean Girl + crowned heart, and a separate Maodie + cat paw. They selected existing weapon controls and no F skills. The original-model viewer was then requested and delivered. The original folder is [on Google Drive](https://drive.google.com/drive/folders/12CSIoKJHwHGyixSoFyqPES7oU29eX09k).

## Source and model records

The five original ZIPs were downloaded through the connected Drive account, checked against their reported byte counts, CRC-verified, and SHA-256 recorded. Downloads, complete unpacked originals and Maodie's supplied Blender source are retained under `.local/character-intake-2026-11-05/`. The checked-in [source manifest](../../assets/concepts/drive-characters-v01/source-manifest.json) contains canonical Drive URLs and hashes for recovery. No generation was needed for these supplied bases.

| Character | Runtime body | Signature weapon | Source preparation |
| --- | --- | --- | --- |
| CR7 | `public/models/characters/cr7.glb`, 18,978 triangles | `soccer-ball.glb`, 6,739 triangles | Original OBJ geometry retained, with body height 1.85 and ball diameter 0.92. |
| Mean Girl | `mean-girl.glb`, 23,998 triangles | `crowned-heart.glb`, 23,998 triangles | The supplied 1,964,634 / 1,970,114 triangle meshes are attribute-aware simplified. Body height 1.85, weapon height 1.05. |
| Maodie | `maodie.glb`, 23,986 triangles | `maodie-paw.glb`, 24,000 triangles | Supplied 358,292 / 278,444 triangle meshes retain linear vertex colours. Body height 1.85, paw height 1.10. |

All runtime meshes face +X with Y up and their lower surface near zero. Weapons use local +Y for length and +X for the leading face. Body hosts lower the mesh by the character's 0.59 pivot height. Source UVs are converted from OBJ's vertical convention to glTF's, including a CR7 texture-registration regression. Source texture images are kept as the runtime base-colour images. Runtime materials use the game's matte 0.72 roughness and zero metalness. Original normal, roughness and metalness maps remain in the source archives and original viewer.

Maodie's GLBs contain vertex colours and static idle/attack/hit meshes, with no skeleton or animation clips. This version uses the supplied idle mesh as the rigid body. The other poses and editable `.blend` remain recoverable in the original packet.

To rebuild, download the source manifest's ZIPs, extract them into the recorded `unpacked/<asset>` folders and install `numpy`, `Pillow` and `meshoptimizer` into the chosen Python environment. Run `python3 tools/import-drive-characters.py`. The script reuses the existing importer's smoothing, simplification and GLB writer. [Prepared dimensions, output sizes and hashes](../../assets/concepts/drive-characters-v01/prepared-models.json).

## Gameplay contract

The accepted existing controls apply to all three. W/S rotates the selected weapon vertically, A/D rotates it horizontally, and all four combinations work. Physical floor, rim and obstacle contacts produce travel and rise. Release retains angular momentum with the existing damping, and reversal uses the existing motor. Mouse view controls body facing and the camera. The three new loadouts have no F ability. They use current shared defaults of 100 HP and 200 stamina.

Each character may select its own signature or any of the six common weapons. Signature weapons are exclusive to their matching character. Maodie is distinct from 开心小猫 and 橘猫. Selection, AI random choices, portraits, HUD, pause, reset, rematch and online choices resolve through the same catalogues. The result is nine characters and 56 valid loadouts.

The shared floating-weapon controller is reused. No character-specific locomotion force or deforming rig is added. Common weapons use a 1.45 minimum offset for the three 1.85-high bodies, fitted through full pitch/yaw sweeps. Both visual equipment and physical contacts use `weaponStats`, so that adjustment stays aligned. Signature contact capsules approximate the supplied geometry, with the heart's +Z body and thin -Z crown measured separately. These are simplified contact volumes, with small surface deviations around decorative points and gaps.

`models/character-assets.js` preloads all body and weapon models. `character-parts.js` supports texture and vertex-colour materials. Instances own their cloned geometry/materials, while cached textures survive preview disposal. `models/characters.js` supplies the rigid imported body, and `models/weapons.js` builds the actual imported signature equipment.

The catalogue expansion uses network protocol **5** to reject incompatible peers. Both players need this build. In-memory host/guest control and loopback transport tests pass. Native Steam play has not been live-tested for this packet.

## Motion and verification

The user chose the existing floating-weapon movement contract. Matching accepted common-weapon movement evidence from the earlier game remains the pre-integration reference. The new actual-game recording covers W, S, A, D, WA, WD, SA and SD separately for each character, release/reversal, real hits/blocks/clashes, common-weapon appearance, and F having no effect. Three same-event slow replays show floor response. The labels and input highlights are drawn from the shipping App/GameSession, with independent fixtures reset between chapters. [Movement evidence](../../assets/concepts/drive-characters-v01/README.md).

Full verification passes **177 tests** and the production build. Coverage includes all 56-loadout pairings, AI with every loadout, imported vertex colours, exact CR7 UV registration, body bounds/hurt centres, full attachment clearance sweeps, direction-dependent contact damage, no-F behavior, network control and previous Beagle/Cat regressions. Real browser checks pass nine portraits, all three signature selections, combined inputs, actual models, 100-HP HUD, no-F UI, common equipment, pause/menu return and narrow-screen bounds.

The original viewer reads the untouched supplied OBJ/GLB files and original material maps from the local intake folder. Its `?source=original` mode preserves source geometry, with display scale and orientation adjusted for viewing. The prepared mode reads the actual runtime GLBs. [Viewer](../previews/drive-characters-v01/index.html?source=original).

At a 700-pixel browser width, the inherited two-column preparation layout crowds the model preview. The start button and scrolling remain reachable. The desktop game and original viewer are the reviewed appearance targets for this packet.

This source checkpoint is published on the feature branch. Human matchup balance and packaged releases remain future review work. The original screenshots, motion source, replay cuts, model manifest and verification logs are stored with the evidence packet.
