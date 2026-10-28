# 木昆竞技场

一款用武器「撑地走路」的 3D 物理对战小游戏：角色没有走路键，只能挥动武器、触地借力来移动和攻击，每个角色还有一个 F 技能。React + react-three-fiber + Electron；所有角色、武器和竞技场都在代码里用 Three.js 程序化建模：奶蛙、胆子肥嘟嘟、开心小猫按项目根目录的参考图用有符号距离场雕塑（`src/models/sculpt.js`），火柴人按动画画风做成平涂描边。

## 运行

```bash
npm install
npm start          # 启动开发服务器 + 桌面版（联机需要桌面版和正在运行的 Steam）
npm test           # 全部单元测试
npm run build      # 生产构建到 dist/
npm run preview:electron   # 用 dist/ 运行桌面版
npm run dist:win   # 打包 Windows 版到 release/（见下文）
```

`npm start` 会自动启动开发服务器（127.0.0.1:5173）再打开窗口，关闭窗口时一并退出；若该端口已由本游戏占用则直接复用。可在任何终端运行，包括 VS Code 扩展终端。

### 本机联机测试（仅开发用，不需要 Steam）

开两个终端：

```bash
npm run dev:host   # 窗口 A：在 127.0.0.1:47123 开房间
npm run dev:join   # 窗口 B：独立的用户数据（.local/second-player），自动连上 A
```

两个窗口启动后会自动打开联机面板并配对，进入共同的准备页；之后的准备、开始、对局、再战、离开与 Steam 联机完全相同（同一个 `NetSession`）。面板上会显示「开发模式 · 本机联机」提示；断开后点「快速匹配」或「邀请好友」即可重新开房 / 加入。B 可以先于 A 启动，会一直重试到 A 开好房间。端口被占用时用环境变量 `WANKAI_LOCAL_PORT` 换一个（两边都要设）；也可用 `WANKAI_LOCAL_NET=host|join` 代替命令行参数。

这条链路在 `electron/local-link.cjs`，只在未打包时（`!app.isPackaged`）且显式要求时启用，打包产物里不包含这个文件；默认仍然走 Steam。

## 模式

- **AI 对战**：在准备页选择你的角色与武器、AI 难度和竞技场。AI 的角色与武器每局开战时随机抽取，不能指定。
- **联机对战**（1v1，走 Steam，没有自己的服务器）：
  - 「快速匹配」寻找同版本、正在等待的玩家并加入其房间；没有就开一个公开房间等待。
  - 「邀请好友」创建仅好友可加入的房间并打开 Steam 邀请窗口；好友在 Steam 里接受邀请（游戏没开时 Steam 会启动它）就会进入。
  - 房间创建者是房主（红方）。双方各自选角色与武器，房主选竞技场，双方点「准备」后由房主开始。再战需双方确认。
  - 数据经 Steam P2P 传输，打不通直连时自动走 Steam Datagram Relay 中继，不需要端口转发或同一局域网。

### 用测试 AppID 480 联机自测

开发期使用 Valve 的公共测试应用 Spacewar（AppID 480），不需要 `steam_appid.txt`（AppID 在代码里传给 Steam）。

1. 准备两台电脑、两个 Steam 账号（同一账号不能和自己匹配；一台电脑只能登录一个 Steam），两边都开着并登录 Steam。
2. 两边都 `npm install` 后 `npm start`（或拷贝同一份构建）。两边的 `package.json` 版本必须相同，否则快速匹配找不到对方、邀请加入时会提示版本不一致。
3. 快速匹配：两边都点「快速匹配」。或邀请：A 点「邀请好友」并在 Steam 窗口里邀请 B（两个账号需互为好友），B 在 Steam 聊天/通知里接受。
4. 480 是全世界开发者共用的，搜索结果里会混有别人的房间；本游戏只认带 `mukun_arena_*` 标签且版本相同的房间。Steam 每次最多返回 50 个附近房间，480 上偶尔可能搜不到对方，这时用「邀请好友」最可靠（换成自己的 AppID 后没有这个问题）。

### 换成正式 AppID

- 修改 `electron/steam-link.cjs` 顶部的 `STEAM_APP_ID`（唯一的一处）。
- 打包后的正式版如果不是从 Steam 启动，会通过 `restartAppIfNecessary` 交给 Steam 重新启动（480 时不启用）。
- 大厅和 P2P 不需要在 Steamworks 后台额外配置。换 AppID 后两边都要拥有该 App（测试期可用开发者账号或发放的 key），并用两个账号再测一次。

## 打包

### Windows

```bash
npm run dist:win   # vite build + electron-builder：免安装目录 + NSIS 安装包
npm run dist:dir   # 只要免安装目录（更快）
```

- 产物在 `release/`：`release/win-unpacked/木昆竞技场.exe` 双击即可直接游玩（整个 `win-unpacked` 文件夹约 390 MB，可整体拷贝 / 压缩分发）；`release/mukun-arena-setup-<版本>.exe` 是安装包（约 130 MB）。
- 打包后的程序自动加载 `dist/index.html`（`app.isPackaged`），不需要 `--dist`；从 `file://` 运行时模型和音频用 XHR 读取。
- 只有主进程需要的 `steamworks.js` 留在 `dependencies` 里打进包；React / three.js 由 Vite 打进 `dist/`，放在 `devDependencies`。
- `steamworks.js` 的原生文件（`.node` 与 `steam_api64.dll`）通过 `asarUnpack` 放在 `resources/app.asar.unpacked/`。Steam 没开时游戏照常启动，只有联机面板提示需要 Steam。
- 想在 Steam 外直接运行打包产物并测试联机，可在 exe 旁放一个内容为 AppID 的 `steam_appid.txt`（AppID 480 时不需要）。
- Steam 覆盖层（邀请窗口依赖它）通过 `electronEnableSteamOverlay()` 开启，它会给 Electron 加 `in-process-gpu` 与 `disable-direct-composition` 开关；设环境变量 `WANKAI_NO_STEAM_OVERLAY=1` 可关闭。macOS 上覆盖层无法挂到 Electron，因此不启用。
- 图标：`build/icon.png`（1024 px）、`build/icon.ico`（16–256 px）、`build/icon.icns`，由 `npm run icon` 重新生成（用真实奶蛙模型离屏渲染，再由 `tools/make-icon.py` 用 Pillow 合成；需要 Python 3 + Pillow）。

### macOS（必须在 Mac 上打包）

```bash
npm install
npm run dist:mac   # release/ 下生成 arm64 与 x64 的 .dmg 和 .zip
```

- electron-builder 不能在 Windows 上打 Mac 包，请在 Mac 上运行。
- 默认做 ad-hoc 签名（`mac.identity: "-"`，不开 hardened runtime）。Apple Silicon 会直接杀掉未签名或签名被改动的程序；如果手动改过 `.app` 里的文件，至少重新 ad-hoc 签名：`codesign --force --deep -s - "release/mac-arm64/木昆竞技场.app"`。
- ad-hoc 签名的包拷到别的 Mac 上会被 Gatekeeper 拦下（「已损坏」或「无法验证开发者」），测试时可用 `xattr -cr 木昆竞技场.app` 或右键「打开」。
- 正式分发需要 Apple Developer ID 证书并公证（notarization）：在 `package.json` 的 `build.mac` 里删掉 `"identity": "-"`（electron-builder 会用钥匙串里的 Developer ID 证书，或用 `CSC_NAME` / `CSC_LINK` 指定），把 `hardenedRuntime` 改为 `true` 并加上 `"notarize": true`，打包前设置 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。hardened runtime 需要的权限已在 `build/entitlements.mac.plist`。
- 上架 Steam 时，Mac 版和 Windows 版一样通过 Steamworks 的 depot 上传，由 Steam 启动。

## 操作

| 按键 | 作用 |
| --- | --- |
| W / S | 武器朝正面 / 背面翻转。触地后继续按住即可撑起身体前进 / 后退 |
| A / D | 水平转动武器（决定挥动平面，也就是前进方向） |
| F | 角色技能（右下角显示冷却） |
| 鼠标 | 点击画面锁定鼠标后转动视角；角色身体和脸朝向视角方向 |
| 滚轮 | 镜头远近 |
| Esc | 菜单（AI 对战会暂停；联机不暂停） |
| R | AI 对战中快速重开 |

鼠标灵敏度、上下反转、音乐与音效音量在「设置」中调整，保存在本机。AI 难度只在准备页选择。

## 角色与技能

| 角色 | 武器 | 技能（F） |
| --- | --- | --- |
| 奶蛙 | 奶木昆（专属）+ 通用武器 | **大笑**：仰天大笑 4 秒，对手体力持续流失且无法恢复。冷却 35 秒 |
| 火柴人 | 通用武器 | **绕后**：烟雾中瞬移到对手身后并转身面对对手。冷却 28 秒 |
| 胆子肥嘟嘟 | 美团外卖盒（专属，无柄）+ 通用武器 | **外卖投掷**：向面前扔出一整个大外卖箱，命中 14 伤害并击退。冷却 22 秒 |
| 开心小猫 | 开心猫爪（专属）+ 通用武器 | **Happy Happy**：蹦跳 1.6 秒，共恢复 22 生命。冷却 40 秒 |

通用近战武器：短剑、长柄刀（偃月刀）、铁战锤、战斧、狼牙棒、平底锅。挥动残影使用武器自身的颜色。

## 竞技场

准备页可选三种皮肤（缩略图为真实场景渲染），障碍物布局相同：**玩具庭院**（白色大石头围成的边界，场内是彩环柱和积木墙）、**罗马角斗场**（看台上坐满火柴人观众）、**湖中庭院**（汉白玉栏杆围着的水磨石平台，四周荷花、九曲桥和六角亭）。每种皮肤都为围墙外的远景建了模；围墙高度不同，武器碰撞高度随之变化。障碍物顶面可以架住武器和站人。

## 规则要点

- 100 生命，先归零者负。竖挥命中按碰撞速度与发力计伤；纯横转命中伤害减半。
- 200 体力：挥动 12/秒，转动 5/秒，停手 0.5 秒后每秒恢复 60；体力低时动作变慢。
- 武器之间可以格挡，有力相撞双方沿各自武器朝向反方向后退。
- 场上 4 根柱子和 4 段矮墙挡住身体，也能被武器击打、借力撑开；挡住视线时自动变淡。
- 分出胜负后镜头会转到胜利者的特写。

## 音频

音效在代码中实时合成。背景音乐使用 Kevin MacLeod（incompetech.com）的 CC BY 4.0 曲目，剪辑成无缝循环后放在 `public/audio/music/`：菜单是 “Daily Beetle”；对战按竞技场换曲，玩具庭院 “Mischief Maker”、罗马角斗场 “Bushwick Tarantella Loop”、湖中庭院 “Shenyang”。署名在「设置 → 音乐署名」；文件缺失时退回合成曲。角色语音（奶蛙大笑、「你的胆子真的肥嘟嘟的」、Happy Happy）使用你提供并经过降噪、均衡和响度处理的录音，放在 `public/audio/voices/`；详情见 [public/audio/README.md](public/audio/README.md)。

## 目录

```
electron/   launch.cjs（启动器）、main.cjs（窗口、菜单与 IPC）、steam-link.cjs（Steam 大厅 + P2P）、
            local-link.cjs（仅开发：本机联机）、preload.cjs
build/      应用图标（png / ico / icns）与 macOS 权限文件，electron-builder 使用
src/
  physics.js            固定步长 180 Hz 物理：武器、撑地、碰撞、伤害、体力、技能、投掷物、障碍物
  skills.js             四个角色技能的数值
  game-session.js       对局状态机、输入、AI 接入、联机钩子
  ai-opponent.js        AI：接近 / 原地劈砍 / 休息 / 格挡 / 绕障 / 脱困 / 技能
  net-session.js        主机权威联机：握手、准备与竞技场同步、输入、60 Hz 快照与插值、再战
  online.js             快速匹配 / 邀请好友，把 Steam 链路接到 NetSession
  arena.js arenas/ arena-skins.js arena-obstacles.js   三种竞技场与障碍物
  models/               程序化角色、武器、头像（toy-kit 统一材质与描边）
  audio.js audio/       合成音乐、音效与语音槽位
  scene.js ArenaCanvas.jsx free-camera.js   渲染、特效、自由视角、胜利特写
  App.jsx MatchSetup.jsx LoadoutPreview.jsx    界面
tools/      角色对照图、图标生成（make-icon.mjs + make-icon.py）等工具
tests/      node:test 单元测试
docs/ARCHITECTURE.md    架构与约定
```

## 版权说明

奶蛙、胆子肥嘟嘟、开心小猫来自网络梗与商业形象，火柴人仿照《氰化欢乐秀》的画风；本项目仅作非商业原型。字体「PF频凡胡涂体」的授权见 `assets/fonts/`。
