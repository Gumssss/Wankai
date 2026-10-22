# 黄色角色静态模型交接

当前生产版本为 prepared-v03，已由用户批准进入游戏；运行时副本为 `public/models/yellow-blob-static-v03.glb`，接入与验证见 [GAMEPLAY.md](GAMEPLAY.md)。下方 v01/v02 和“仅建模”描述为历史阶段记录。

2026-10-21。用户仅要求建模，不包含武器、攻击、骨骼动画或游戏接入。

## 当前成果

### v03 身体表面精修（2026-10-21）

用户确认突出嘴部是有意造型，要求只去除身体浅痕。新候选存于 `assets/source/yellow-blob/prepared-v03/`，文件为 `yellow-blob-static-v03.glb` 和 `.blend`，附四视角渲染与 `verification.json`。v02 及原件均保留。

从原始 Tripo 网格重新焊接重合顶点后减面，避免在已经分别减面的 UV 岛边界上平滑造成裂缝。对身体做带渐变权重的局部平滑，正面高于保护区域的面部/嘴部顶点锁定；足底保留。降低身体区域法线贴图影响，重新计算平滑后的法线。锁定面部在平滑步骤中的位移为 0；这不表示重新减面后的顶点与 v02 一一对应。

重建后的候选约 12 万三角面。接缝验证以 GLB 重新导入并合并 UV 重合顶点后统计开放边及非流形边，结果写入验证文件。首次直接平滑低面数副本导致裂缝的试验已废弃，不作为候选。

视觉复核：腹部明显线状浅痕已消除，侧面更平滑，突出嘴部保留；背部上方仍有极淡点状痕迹。更强局部平滑会压扁背部轮廓，故未采用。没有宣称完全无瑕，最终外观待用户查看。

复现脚本：`scripts/blender/smooth_yellow_blob_v03.py`；导出检查：`scripts/blender/verify_yellow_blob_surface_v03.py`。只更新本地静态模型，不涉及游戏逻辑或发布。

- 原始 Tripo GLB：`assets/source/yellow-blob/tripo-v01/original.glb`，原件未修改。
- 当前候选：`assets/source/yellow-blob/prepared-v02/yellow-blob-static-v02.glb`。
- 可编辑源：同目录 `yellow-blob-static-v02.blend`，纹理已打包。
- 正/侧/背/斜前方渲染：同目录 `front.png`、`side.png`、`back.png`、`three-quarter.png`。
- 来源任务：8d0cd07b-a2d7-4d30-964f-7dc27678540c，由用户完成 Tripo 生成后交接。页面显示 H3.0，余额差 40；未核查账单，不把余额差视作已验证扣费。

## 处理与验证

已从官方安装 Blender 4.5.14 LTS（Apple Silicon）到 `/Applications/Blender.app`，安装包 SHA256 与官方校验文件一致。

原始模型 1,582,046 三角面、802,011 顶点、49,661,984 字节，单网格单材质，无骨骼动画。基础色和法线贴图实测 4096×4096。glTF 边界高度约 0.99985，导入 Blender 后转换为 Z 向上。

v01 减面至 119,999 三角面，保留 UV/贴图和外形，不分离手臂或添加骨骼。v02 降低法线强度至 0.15，设置非金属、粗糙度 0.65，改善偏强反光。GLB 已在独立清空场景重新导入，网格数和面数正确；四个视角已渲染。未运行游戏加载器和玩法测试，因本任务仅交付静态模型。

复现：先运行 `bash scripts/blender.sh --background --python scripts/blender/prepare_yellow_blob_v01.py`，再运行 `bash scripts/blender.sh --background --python scripts/blender/refine_yellow_blob_material_v02.py`。

## 尚需外观评审

嘴部比输入参考略突出，眼圈边缘与身体局部保留少量生成浅痕。手臂紧贴身体，属于单网格静态模型；没有宣称已具备独立动作拓扑或经过水密/打印检查。当前是可审阅候选，未记录最终外观验收。

全部成果在本地分支，未提交、推送或发布。下一步仅根据用户对静态外观的反馈继续局部修形；不自动进入动作或游戏接入。
