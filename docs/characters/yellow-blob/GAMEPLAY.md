# 黄团子与黄色圆棍：本地游戏接入

**Combined integration, 22 October:** the yellow-character/menu update is already merged into main through [the character delivery](https://github.com/Gumssss/Wankai/pull/5). Its approved model, staff, motion and new defaults are preserved in the Colosseum integration. The former polearm failure is fixed by matching its contacts to the retained 2.00-unit model; the combined 179-test suite and build pass. See [arena integration status](https://github.com/Gumssss/Wankai/pull/4). Earlier local-only statements and counts below describe their dated checkpoints.

2026-10-21。用户审阅 motion-v02 后明确同意：“没问题，可以接入游戏”。当前分支 `codex/character-and-weapon-design`，本次已完成本地接入，未提交、推送、合并或发布安装包。

## 游戏行为

- 角色选择新增“黄团子”（临时显示名），专属武器为“黄色圆棍”。P1/P2 均可选择；普通角色不能装备该专属棍，黄团子也不默认获得其他武器。
- 真实模型使用 `public/models/yellow-blob-static-v03.glb` 与 `public/models/yellow-staff.glb`，分别原样复制自 prepared-v03 和 yellow-staff/v01。突出嘴部保留。角色缩放 1.7，脚底对应地面，身体物理枢轴高度 0.59。
- GLB 原始面部朝 +Z，通过独立父节点绕 Y 转 90° 对齐求解器 +X；外层角色根节点统一拥有位移和朝向。W/S 始终沿面部正前方、头顶、背后所在竖直平面旋转，A/D 改变该平面的朝向。圆棍沿用已确认的悬浮方式，无手握动作或新增技能。
- 保留 motion-v02 的圆棍长度、偏移、惯量、电机、体力及胶囊接触参数；在实际生产求解器中逐帧复现已确认轨迹。
- 接入模型预览、加载失败备用显示、独立材质与受击反馈、各游戏模式、暂停/重开/选择保持。四角色和六武器卡片适配准备页；小屏布局保持可滚动。

## 检查与证据

- `node --test tests/yellow-blob.test.js`：17/17 通过，含已确认动作逐帧对比、真实 GLB 朝向/脚底/武器端点、P1/P2 独立材质、模式与重开、备用模型与重试。
- 完整回归：159 项中的 158 项通过；随后新增的第 17 项黄色角色场景测试单独通过。唯一已知失败仍为本次接入前的 `tests/character-model.test.js:32`：用户现有长柄刀长度 2.00 与旧测试期望 2.35 不一致。未擅自改回该数值或修改此测试。
- Vite 生产构建通过；保留已有的大包体提示。`git diff --check` 通过。
- 在本机内置浏览器运行真实 App，检查准备页选择/模型预览，保留实际游戏页面。录制使用真实 `GameSession`、`ArenaPhysics` 和 `ArenaView`，每章只重置初始状态并注入按键；只调整录像审阅相机，没有替换物理或预设身体轨迹。
- 实际录像记录全部八种输入、前→头顶→后、松手/反向、反向键抵消、恢复、竖向命中 19 点、横向命中 12 点（水平贡献 1.0）及真实格挡。全部章节真实角色模型加载成功。
- 原始录像与报告：`output/yellow-blob-gameplay-v01/actual-gameplay.webm`、`capture-report.json`。含同次事件慢放的交付录像：`actual-gameplay-with-replays.mp4`。验证及源文件哈希：`assets/concepts/yellow-blob/gameplay-v01/verification.json`。
- 录像页面：`docs/previews/yellow-blob/gameplay-v01.html`，本机接收端：`node scripts/preview/yellow-blob-gameplay-v01.mjs serve`（127.0.0.1:8768）；该页为开发验证工具，不是生产导航入口。

## 限制与后续

身体仍为静态网格，没有独立肢体动画；备用模型是外形近似。伤害胶囊和椭圆棍头采用已确认的简化近似。背部上方极淡点状痕迹仍保留，避免压扁轮廓。浏览器实机已验证；本轮未单独验证 Electron 安装包。最终手感和平衡留给用户实际试玩，不把自动检查视为试玩验收。

当前工作仅在本地。后续若需提交或协作交付，先按用户授权整理当前分支和资源；不要将历史其他角色的推送授权用于本分支。
