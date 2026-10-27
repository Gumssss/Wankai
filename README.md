# 丸棍竞技场

**Live integration review:** browser checks pass for intro entry/Escape return, yellow defaults, independent preparation/cancellation, fixed yellow combat/rematch, split beagle/cat controls and hover ownership, pause, practice, solo polearm and mobile bounds. No page errors; existing clock-deprecation warnings remain. [Combined verification and screenshots](assets/concepts/integration-2026-10-22/verification.json).

**Combined checkpoint — 22 October 2026:** integrates the yellow character/yellow staff and animated startup/menu from latest main (`ae91c42`) with the Colosseum, Roman-inspired floor and approved arena cameras (`701b7d5`). All four characters and nine valid loadouts are retained, including the new yellow defaults. Both sides of the menu/camera conflicts are preserved. The shortened 2.00-unit polearm now scales its measured contacts with the visible model; a regression reproduces and prevents the former invisible-tip hit. Fresh checks: **179/179 tests and production build pass** (existing chunk-size advisory). [Integration/merge status](https://github.com/Gumssss/Wankai/pull/4). Earlier local-only and branch-only notes below describe their dated checkpoints.

**Fresh branch verification — 21 October:** `npm test` passed **158/158**, `npm run build` passed with the existing large-chunk advisory, the prepared-GLB verifier passed (613 floor samples, zero misses), and the staged diff check passed. Runtime source/assets match the approved working snapshot. See [delivery verification](assets/concepts/colosseum/delivery-v01/verification.json). No new browser playtest or new character integration is claimed for this publication-only task.

> **Arena/camera review branch — 21 October 2026:** `feat/arena-camera-updates` starts from the merged orange-cat/character-preparation version on `main` (`55857a0`). It contains the prepared Colosseum, Roman-inspired floor texture, approved farther split cameras and fixed-camera v09. This branch is for separate review and later character integration; it is not merged or a packaged release. [Arena handoff and evidence](docs/environments/colosseum/HANDOFF.md).

一个可以离线运行的 Electron 3D 物理对战原型。界面使用 React，角斗场由 React Three Fiber 和 Three.js 渲染，固定时间步的自定义约束物理计算撑地、挥棍与碰撞。每台电脑只操作自己的一名角色，使用第三人称跟随视角。

> **改造进行中（`feat/online-ai-arena`）：** 分屏、固定视角、木桩练习与单人自由视角已删除，主菜单目前只有「AI 对战」和「角色与武器」。鼠标视角已改为锁定式自由视角，角色身体朝向视角方向。AI 对手暂时站立不动，AI 行为、零服务器联机、新竞技场和统一美术将分阶段加入。

协作者与开发代理请从[项目交接指南 / Collaborator and agent handoff](docs/COLLABORATOR_AGENT_HANDOFF.md)开始：包含环境搭建、架构、当前玩法、已确认决定、待办、验证与 GitHub 提交合并流程。

**交接分工（2026-10-20）：** 由作者自己一侧的集成代理检查、解决冲突、验证并合并到 `main`；贡献代理按本次请求提交交付分支及 PR，保留合并给集成代理。[当前截止点与合并负责人](docs/COLLABORATOR_AGENT_HANDOFF.md#current-cutoff-and-merge-owner) · [给集成代理的提示词](docs/COLLABORATOR_AGENT_HANDOFF.md#prompt-for-the-creators-integration-agent) · [角色技能的阶段用法](docs/SKILLS.md#collaborator-quickstart)。本次不合并或发布安装包。

## 已合并角色检查点 / Merged character checkpoint — 2026-10-20

- 橘猫坐姿悬浮，装备两只无可见连接件的巨爪。W/S 挥爪、A/D 转向，可组合四个斜向操作；S 触地后撑起身体，使用统一耐力，没有额外 F 技能。[模型、动作与实玩交接](docs/characters/orange-tabby/GAMEPLAY.md)。
- 全窗口准备页保留双方独立草稿和准备状态，统一开始/保存；单人仅配置 P1，练习可配置被动木桩。页面隐藏角斗场与 HUD，返回后恢复菜单焦点，开始后恢复实际对局。[界面截图](docs/screenshots/preparation-stage-v04.jpg) · [专项验证](docs/selection-concepts/v04-preparation-stage/verification.json)。
- 上述橘猫与准备页功能已通过 [角色更新](https://github.com/Gumssss/Wankai/pull/3) 合并到 `main`。该角色检查点交付前 143 项测试和构建通过；历史检查记录保留。当前 arena/camera 分支在其上新增环境与镜头，本次不合并或发布安装包。

## 上一已合并检查点 / Previous merged checkpoint — 2026-10-19

- 当前源码已合并到默认的 `main` 分支，包含三种兵器与「比格犬·双耳」套装、双方独立选择、扩大后的分屏圆台和已确认的后方镜头。
- 新增独立耐力条与力竭弱控；纯水平转动命中伤害为同等条件下竖直挥击的 50%。数值仍待实玩调校。
- 当前实玩试验将三把武器的竖挥与横转最高角速度降至原来的 50%，保留起挥与刹车响应；武器外观尺寸和触及长度保持原样。新增贴合剑格、刀刃弯尖的接触形状，并检查两个物理时刻之间的武器路径。该试验已纳入本次源码检查点，数值仍待实玩调校。
- 新增有力格挡后的双方后退：每人沿自己当前面向的反方向退开，轻触及持续贴住不反复触发。方向与分屏镜头的朝向无关。
- 本次源码检查点加入比格犬直立普通挥耳与 F 旋耳悬停：按 F（P2 右 Shift）启动 5 秒低空悬停，不耗耐力，普通耐力统一提高至 200。通过 100 项测试与生产构建，前后翻实验保持停用。
- 仓库包含完整的比格犬设计记录与 `game-character-pipeline` 技能源码，要求新角色使用 Tripo 生成基础模型，并用视频展示每个动作。使用方法见[技能指南](docs/SKILLS.md)。下载与更新方法见下方；改动与未完成事项见[更新记录](CHANGELOG.md)。

## 下载、更新与游玩 / Download and play

目前提供可运行的源码版本，已验证的环境是 **macOS + Node.js 22.12 或更新版本**。安装 Node.js 时会附带 npm；使用下面的克隆和更新命令还需要 Git。当前没有可直接双击安装的应用包，Windows / Linux 尚未验证。

### 第一次下载 / First-time setup

在终端依次运行，默认下载 GitHub 的 `main` 分支：

```sh
git clone https://github.com/Gumssss/Wankai.git
cd Wankai
npm ci
npm start
```

`npm ci` 按仓库中的锁文件安装依赖；首次安装需要联网，并会下载 Electron。`npm start` 会启动本地服务并自动打开游戏窗口。两位玩家共用一块键盘，各自选好角色与武器后开始；按键见下方「操作」。运行资产包含在对应源码检查点中，游玩不需要 Tripo 账号、API 密钥或重新导出模型。GitHub 下载内容与当前本地新功能的差异见页首说明。

### 更新已有副本 / Pull the latest version

先在运行游戏的终端按 `Ctrl+C` 停止游戏，再进入之前下载的项目目录：

```sh
cd Wankai
git switch main
git pull --ff-only origin main
npm ci
npm start
```

如果当前终端已经在 `Wankai` 目录中，跳过 `cd Wankai`。自己修改过代码时，请先提交或备份修改，再切换分支和更新。`--ff-only` 在分支历史分叉时会停止，避免意外生成合并提交。

### 不使用 Git / Download ZIP

也可以在 [GitHub 仓库](https://github.com/Gumssss/Wankai) 选择 `main`，点击 **Code → Download ZIP**。解压后，在包含 `package.json` 的文件夹中打开终端，运行 `npm ci`，然后运行 `npm start`。ZIP 副本不能使用 `git pull`；需要更新时重新下载即可。

### 运行说明

Vite 使用 `http://127.0.0.1:5173/`，Electron 会自动打开游戏窗口；不能通过双击 `index.html` 启动游戏。启动提示 5173 端口被占用时，先关闭之前启动的游戏或开发服务。结束游玩时在启动终端按 `Ctrl+C`。依赖安装完成后，启动和游玩不需要联网。

`npm run dev` 与 `npm start` 等价，修改 React 或场景代码会热更新。开发验证可运行 `npm test` 检查物理与对局规则，运行 `npm run build` 验证渲染器构建；普通游玩不需要先构建。

## 操作

| 操作 | 按键 |
| --- | --- |
| 在角色面向的竖直平面内，向正面连续挥动 | W |
| 在同一平面内，向背面连续挥动 | S |
| 水平向左 / 向右转动武器朝向 | A / D |
| 比格犬 + 长耳的五秒旋耳悬停 | F |
| 转动视角（身体和脸随之转向） | 点击画面锁定鼠标后移动鼠标 |
| 调整镜头远近 | 滚轮 |
| 释放鼠标并暂停 / 继续 | Esc |
| 重新开始 | R |

按键根据实体键位识别。R 在正在游玩时重开；暂停或结算后使用界面按钮。准备页中的 Esc 返回主菜单并放弃草稿，准备期间不向对局传递武器输入。

两名角色默认都是奶龙 + 奶木昆。进入 AI 对战前会先进入全窗口「出战准备」页面：左侧是你，右侧是 AI，角色与武器选择在上，实际模型预览在下，可拖动旋转或滚轮缩放。点击「准备就绪」后再点击「开始对战」；AI 的搭配只需有效，不需要准备。主菜单的「角色与武器」只配置你自己的搭配并「保存搭配」。返回或 Esc 放弃草稿，重开保留已提交选择。窄屏上下排列并纵向滚动。

基础丸人可选短剑、长柄刀、铁战锤；比格犬可选这三种或专属长耳；橘猫只适配已批准的巨爪，共八种有效搭配。比格犬使用普通兵器时为自然垂耳外观，耳朵不参与攻击或撑地；长耳搭配使用已确认的光滑圆耳战斗模型，双耳从头部两侧转动。W/S 与 A/D 可组合，双耳共用耐力和单次命中门控，触地带动身体上升与移动，也可横击、格挡和碰撞后退。身体保持直立，普通 W/S 挥耳可与较慢的 A/D 转向组合；按 F（P2 右 Shift）启动 5 秒旋耳悬停，不耗耐力，时间到后收耳落地。松手保留惯性，反向输入先刹车。

橘猫保持坐姿低空悬浮，用两只独立巨爪连续挥击、撑地和转向。W/S 挥爪，A/D 转向，支持 W+A、W+D、S+A、S+D；S 时爪与地面接触后撑高身体，松手后保留惯性并下降恢复。两爪共用 200 耐力及命中规则，F 不触发额外技能。[橘猫实玩记录](docs/characters/orange-tabby/GAMEPLAY.md)保存准确模型、控制器与验证。

短剑的碰撞长度更短，转动加速、刹车和最高角速度更高；铁战锤起挥与收招更慢，宽头参与命中、格挡和撑地，金属头命中伤害提高 30%；角色没有额外移动速度，仍靠武器触地移动。短剑撑地时的手感仍待实玩确认，历史问题及检查见[短剑试验记录](docs/SWORD_TRIAL.md)。

W / S（↑ / ↓）不再指定上抬或下砸的目标角度。武器在头顶时，W 选择朝角色正面的一侧挥下，S 选择背面的一侧；继续按住同一键，可以越过竖直向下的位置，借地面接触撑起身体并转向另一侧。松手后保留角速度，受重力和阻尼影响；按反方向会先刹车再反转。W 和 S 同时按视为没有竖直方向输入。暂停、失焦会清除按键。

A / D（← / →）只改变武器的水平朝向，可以与 W 或 S 同时按。它们保留方位角的惯性控制：按住施加转动力，松手靠阻尼逐渐减速，反向按键先刹车。基础丸人与比格犬保持主体直立，橘猫保持坐姿悬浮；比格犬在普通长耳转向时保持双耳并列。主体没有独立移动操作，通过武器触地和调整方位来移动；空中普通挥棍不能凭空推动角色。

武器悬空围绕身体旋转，没有可见连接件。武器内端与身体中心保持固定距离，空隙不参与攻击或格挡判定；武器触地时仍通过游戏中的约束传力，带动身体移动。长柄武器默认悬空距离为 1.35、自身长度为 2.35；短剑的独立参数在 `src/physics.js` 的 `WEAPONS` 中。

例如，从头顶按 W（↑）让武器从正面触地，按 S（↓）则从背面触地。持续朝该方向挥动时，触地点可以撑高并移动身体；A / D（← / →）可同时调整接下来的水平方向。地面与武器碰撞仍会改变转速。批准的动作示意保存在[控制动作视频](docs/control-concept-combinations.mp4)，实现细节见[控制系统说明](docs/CONTROL_SYSTEM.md)。

## 对战规则

- 一对一，默认每方 100 HP，血量归零判负，可再战。你用 WASD 操作自己的角色；A / D 只控制武器挥动平面的水平转向，鼠标控制视角，角色身体和脸以每秒最多 12 弧度的速度转向视角方向（`CONFIG.bodyTurnRate`）。命中判定随身体朝向转动；格挡后退仍沿武器朝向。比格犬装备长耳、橘猫装备巨爪时，耳朵/爪子长在身体上，身体继续跟随武器朝向。
- 头部与躯干伤害相同；同一挥击不会因持续重叠而反复扣血。
- 伤害以接触点朝向对手的相对碰撞速度为基础，叠加命中前约 90 ms 的沿挥动方向净加速度（计入阻尼和转速上限），最高加成 30%，基础单次伤害上限 34；铁战锤的金属头在此基础上乘 1.3，四舍五入后上限 44，锤柄仍使用基础伤害。
- 相同碰撞速度、发力与命中部位下，纯水平转动命中的伤害系数为竖直挥击的 50%；组合动作按接触点朝向对手的横转、竖挥和身体相对移动贡献混合计算。松开转向键后的惯性命中仍会降低横转部分的伤害；与命中方向无关的横向运动不会削弱竖击。伤害调整不改变基础碰撞和格挡冲量。
- 每人另有 200 耐力：W / S（↑ / ↓）每秒消耗 20，A / D（← / →）每秒消耗 8，同时操作叠加。只竖挥约 10 秒耗尽；组合动作约 7.1 秒。放开两轴武器操作 0.5 秒后，每秒恢复 30。反向输入、武器受阻时继续按键仍消耗耐力；同轴相反键抵消后该轴不消耗。转动镜头、被动摆动和碰撞不消耗耐力。
- 耐力低于 25 时，主动驱动力和驱动转速逐渐降低，耗尽时保留 40% 的驱动力及驱动转速目标。反向刹车保留原有响应；松手仍有惯性，力竭不会锁住武器。继续按键不会恢复耐力；暂停、倒数与命中停顿不推进耐力，重开恢复满值。所有模式和八种有效搭配采用相同普通耐力规则，生命与耐力分别显示。
- 低于 1.65 m/s 的轻触不扣血。向心加速度、碰撞产生的骤停不参与加成。
- 武器互相碰撞可格挡，有力相撞会让双方沿各自当前面向的反方向后退，并有物理冲量、音效和粒子。轻触不触发额外后退，持续贴住只触发一次，分开后再次相撞才可重触发；圆台边界仍会阻止身体出界。击中身体另有短暂停顿、击退、数字和伤害提示。有效撞击还可产生轻微震屏；系统开启“减少动态效果”时禁用震屏。
- 角斗场边界约束主体，不以掉出场外判胜。角色被撑起后保持直立；比格犬装备长耳后按 F 可旋耳低空悬停 5 秒，不耗耐力，时间到后落地。
- 对局使用全窗口的角色后方远景：从身后略偏 15° 看向前方，较缓俯视、55° 透视，可看到圆台远侧边缘；镜头柔和追踪武器。A / D 转动武器，镜头的水平朝向保持独立；点击画面锁定鼠标后移动鼠标转动视角，Esc 或切换窗口会释放鼠标并暂停，开始、继续或再战时自动重新锁定；滚轮调整远近，重开恢复初始角度。左侧指示盘显示武器挥动平面相对当前视角的水平方向。
- 镜头位置始终跟随自己的角色。画面边缘检查会在角色头部、身体或标签锚点需要更多空间时立即拉远，空间恢复后再缓慢靠近，防止撑地跳起或击退时看丢自己；对手和整把武器不保证始终在画面内。圆台及物理边界为原圆台的三倍半径（19.35）。
- 失焦、切换标签页会自动暂停，防止卡键。

## 文件

- `src/physics.js`：与渲染无关的固定步长物理、约束冲量、伤害。
- `src/scene.js` 和 `src/ArenaCanvas.jsx`：角斗场、角色、武器、拖尾、粒子与 React Three Fiber 渲染循环。
- `src/game-session.js`：对局状态、键盘输入和固定步长物理循环。
- `src/App.jsx`：React 菜单、HUD、暂停和结算。
- `src/character-catalog.js`、`src/weapon-catalog.js` 和 `src/loadouts.js`：角色与武器独立目录、兼容校验和模型/控制器解析。
- `src/Armory.jsx`、`src/armory-drafts.js`、`src/LoadoutPreview.jsx` 和 `src/armory.css`：全窗口准备页、双方独立草稿/准备、统一提交与实际模型预览。
- `src/weapon-visuals.js`：模型轴向、握持端和连续旋转姿态。
- `src/beagle-profile.js`、`src/beagle-skill.js` 和 `src/beagle-model.js`：比格犬实测耳根、旋耳悬停技能、接触形状，以及骨骼与物理姿态同步。
- `src/orange-tabby-profile.js` 和 `src/orange-tabby-model.js`：橘猫批准模型、独立巨爪接触与实际姿态/备用外观。
- `src/free-camera.js`：第三人称跟随镜头参数、鼠标转动、柔和取景与自身角色边缘保护。
- `src/audio.js`：Web Audio 合成音效，无外部音频资源。
- `src/style.css`：界面布局与窄屏适配。
- `public/models/polearm.glb`：从 Tripo 导出的武器模型压缩后的游戏用副本；原始文件保存在 `assets/source/`。
- `public/models/sword.glb`：Tripo 公共作品的游戏试验副本，约 16.8 MB、18 万三角面和三张 4K 贴图；原始短剑下载未包含在仓库中。
- `public/models/hammer.glb`：用户选定的铁战锤，约 2.8 MB、8 万三角面、1K 贴图；原始导出保存在 `assets/source/`。
- `public/models/orange-tabby-prepared-v02.glb`：本地橘猫与巨爪的已批准运行模型。
- `scripts/prepare-weapon.mjs`：校验新导出布局、减面和缩小贴图（需要 Python 3 与 Pillow）。
- `scripts/prepare-sword.mjs`：从原始短剑 GLB 生成较轻的游戏副本。
- `electron/main.cjs`：沙盒化 Electron 开发窗口，不开放 Node.js 或 IPC 给渲染器。
- `tests/physics.test.js` 与 `tests/physics-cases.js`：基础物理、伤害和稳定性回归。
- `tests/weapon-integration.test.js`：双方选武器、模型与接触轴向、锤头命中及全部套装配对。
- `tests/game-session.test.js`、`tests/follow-camera.test.js`：对局状态、本地输入、跟随镜头、鼠标转动与取景保护。
- `tests/combat-stamina.test.js`：耐力、力竭控制与横转伤害规则。
- `tests/contact-motion.test.js`：半速上限、采样间穿越、近失、角度环绕与剑格/弯刃接触。
- `tests/clash-recoil.test.js`：双方按各自面向后退、轻触过滤、分离与冷却、惯性保留、边界和重开。
- `tests/armory-drafts.test.js`、`tests/arena-resize.test.js`：本地与 AI 搭配的准备/提交规则，以及准备页隐藏/恢复角斗场时的镜头尺寸回归。
- `tests/sandbox.js`：测试用的单角色沙盒与近距离不分胜负的对练布局。

开发者工具控制台可通过 `window.__arena.snapshot()` 只读检查当前对局，通过 `window.__arena.rendererInfo()` 查看渲染资源计数。

## 原型边界

当前仍在改造：AI 对手尚未有行为，联机尚未接入，没有手柄控制。目前有快挥短剑、长距长柄刀、慢速重击铁战锤、比格犬专属长耳与橘猫专属巨爪，可在出战准备页选择。后续武器和最终平衡仍待设计与实玩；锤头使用多个胶囊体近似，布条不参与碰撞。普通兵器采用“直立身体 + 两自由度武器”简化模型；比格犬长耳使用直立接触求解、可展耳的技能和有限升力控制；橘猫使用坐姿低空悬浮与接触驱动的巨爪撑起。角色碰撞仍使用胶囊近似。通用物理、武器、耐力和格挡后退参数分别集中在 `src/physics.js` 的 `CONFIG`、`WEAPONS`、`STAMINA` 和 `CLASH`，可在实玩后继续调校。部分键盘有多键冲突。

半速试验在 180 Hz 物理时刻之间增加了武器接触路径采样，并沿用原来的地面求解步长；它已覆盖已复现的穿越问题，但仍是有限采样和胶囊近似，不能保证所有擦边接触都不漏检。短剑增加剑格形状，长柄刀增加刃部形状，锤头沿用原有五胶囊；没有统一放大命中或格挡范围。短剑撑地手感、耐力节奏、半速后的伤害与移动、双方平衡及贴图内存仍待实玩确认。全局 30% 转速限制和更强格挡停顿尚未实现，精确控制兵器仍是待续支线。详见[当前进度](docs/PROJECT_STATUS.md)。

剑与锤的公共 Tripo 模型再分发许可仍未核实；将源码保存到 GitHub 不代表已取得这些资产的再分发许可。目前没有发布安装包。

## 设计文档

当前入口说明于 2026-10-20 对照本地源码和既有验证记录更新；这次文档更新未重新执行玩法测试。当前行为以 README、控制说明和项目进度为准；各武器试验保留来源与历史检查，旧截图和动作视频不代表最新 HUD 或完整实玩验收。

- [更新记录 / Changelog](CHANGELOG.md)
- [当前进度、验证结果与下一步](docs/PROJECT_STATUS.md)
- [双人演示版 PRD](docs/PRD.md)
- [游戏术语](GLOSSARY.md)
- [首次 Tripo 武器模型实验指南](docs/TRIPO_WEAPON_TRIAL.md)
- [短剑试验记录](docs/SWORD_TRIAL.md)
- [铁战锤导入与三武器兵器库](docs/HAMMER_TRIAL.md)
- [待续支线：精确控制武器](docs/PRECISION_WEAPON.md)
- [设计决定与下次工作交接](docs/DESIGN_HANDOFF.md)
- [当前选择界面与实现交接](docs/CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md)
- [橘猫模型、动作与实玩交接](docs/characters/orange-tabby/GAMEPLAY.md)
- [控制系统说明和动作视频](docs/CONTROL_SYSTEM.md)
- [开发技能介绍与使用指南 / Development skills guide](docs/SKILLS.md)
- [比格犬角色完整设计过程 / Beagle design process and lessons](docs/BEAGLE_DESIGN_PROCESS.md)
- [角色制作工作流规范 / Character creation workflow specification](docs/CHARACTER_CREATION_WORKFLOW_SPEC.md)
- [角色制作技能 / Game character pipeline skill](skills/game-character-pipeline/SKILL.md)

## 历史比格犬功能检查点（2026-10-18）

此前检查点用「比格犬·双耳」合并卡片分别装备 P1/P2；当前准备页改为「比格犬」角色 +「长耳」武器。可与普通兵器对战，也可双方都选比格犬，重开保留选择。模型与实现说明见[比格犬 v05](docs/BEAGLE_MODEL_V05.md)。模型、可编辑 Blender 文件、接触测量与回归测试随该源码检查点保存。当前保留直立普通挥耳与独立的 F 低空悬停技能，前后翻实验停用；见[旋耳悬停](docs/BEAGLE_SPIN_SKILL.md)。后续 19 October 悬停检查点通过 100 项测试与构建，该数量是历史结果。目前没有发布安装包。

### 比格犬旋耳悬停（2026-10-19）

普通 W/S 挥耳与 A/D 转向可组合，双耳保持并列。按 **F**（P2 **右 Shift**）启动 **5 秒**旋耳低空悬停，**不消耗耐力**，也不受低耐力影响；松开不提前结束，时间到后自动收耳落地。悬停中 A/D 可改变旋转方向，W/S 暂停普通挥耳。持续按住不会自动连发，重复按键不会延长计时。所有兵器的普通耐力提高至 **200**，普通挥动消耗与恢复速度不变。详细说明见[技能交接](docs/BEAGLE_SPIN_SKILL.md)。
