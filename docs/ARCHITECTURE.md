# 架构与约定

## 坐标与角色框架

- 世界 Y 向上，地面 y = 0；比赛场地半径 19.35（`ARENA_PROFILE.radius × MATCH_ARENA_SCALE`），围边高 2.52。
- 每个角色有一个**身体枢轴** `p`，位于地面上方 `bodyFloor`（0.59）。模型根节点放在枢轴上，`rotation.y = -fighterHeading(p)`，脸朝本地 +X。
- `fighterHeading`：所有角色都返回 `bodyYaw`（以有限角速度追随鼠标视角 `faceYaw`）。
- 武器姿态由 `theta`（竖直挥动角，0 = 朝上，π/2 = 朝前水平）和 `phi`（水平方位角）决定，与角色无关：同一件武器在任何角色身旁的位置和朝向都相同。`weaponPointFrame(player, local)` 把武器局部点转换到世界，并给出雅可比，接触冲量同时作用于角度和身体。

## 外观 = 碰撞

所有模型都在 `src/models/` 中用代码生成，并直接复用碰撞数据：

- 漂浮武器沿 +Y 建模、握柄末端在原点、+X 为 W 挥动的前缘，长度等于 `WEAPONS[type].length`，造型骨架就是碰撞胶囊（`physics.js`）。
- 专属武器也是普通的漂浮武器：外卖盒（胆子肥嘟嘟）和开心猫爪（开心小猫，一只带肉垫的大猫爪，腕部 + 掌面 + 脚趾三个胶囊）。开心小猫也可使用通用武器。
- 角色身体保持在 `CHARACTERS[id].bounds` 内，受击形状 `hurtShapes` 的中心都在可见身体内；`models.test.js` 校验这两点。
- 奶蛙、胆子肥嘟嘟、开心小猫用有符号距离场雕塑（`models/sculpt.js`）：基本形体平滑并集、按区域与「涂色」上色，再用 marching cubes 生成带顶点色的网格（按角色缓存，每个实例克隆）。五官等细节用 `surface()` 沿射线找到皮肤表面后贴放。奶蛙大笑时整块身体按高度平滑弯折（`bendable`），不会出现接缝。
- 火柴人用不受光照的平涂材质（`kit.flat`）加粗描边，模仿《氰化欢乐秀》的 2D 画风。

修改造型时先改碰撞数据，再让模型跟随；`npm test` 会检查二者是否对齐。

## 物理（`physics.js`）

- 固定步长 1/180 s。每步：输入 → 马达 / 重力 / 耐力 → 积分 → 5 轮接触求解（地面撑地、围边、障碍物、身体分离）→ 武器格挡与攻击（在两步之间扫掠采样，防止高速穿透）→ 胜负判定。
- 障碍物（`arena-obstacles.js`）只有两种：竖直圆柱和可旋转的盒体，都在 XZ 平面内做最近点推出；高度以上不碰撞。武器沿胶囊每 0.35 采样一次接触障碍，冲量模型与围边一致，所以能「借力撑开」。
- 分出胜负后，胜者仍可活动，败者冻结且不再产生命中。

## 技能（`skills.js`、`physics.js`）

- 每个角色一个 F 技能。`skillTap` 只被一个物理步消费；`updateSkill` 在每步开头处理冷却与持续效果（大笑抽体力、Happy Happy 回血），在采样扫掠之前完成瞬移，避免瞬移被当成一次横扫命中。
- 外卖投掷生成 `world.projectiles`，按抛物线飞行，命中对手受击形状造成伤害，落地 / 撞墙 / 撞障碍物时产生 `splat` 事件。
- 技能触发产生 `{ type: 'skill', skill, player, point, to? }` 事件，供音效、特效和联机转发使用。

## 对局（`game-session.js`）

状态：`lobby → countdown → playing → result`，AI 模式可 `paused`。输入结构 `{ theta, phi, skillTap?, faceYaw? }` 对本地玩家、AI 和远端玩家完全相同。竞技场皮肤 `arenaSkin` 是会话状态，只影响画面，碰撞布局相同。

## AI（`ai-opponent.js`）

只读世界、输出与玩家相同的输入。按反应间隔刷新感知（难度决定反应、瞄准误差、体力保留线、格挡与技能概率）。技能按角色判断时机：近身且对手体力充足时大笑、离得远或卡住时绕后、朝向对准且距离 3–11 时扔外卖、生命低于 70 时回血：远距离对准方位按住 W/S 翻滚前进并绕开障碍；进入攻击距离后原地 W 劈下、S 收回循环；耐力低于保留线完全停手恢复；3 秒没有接近也没有造成伤害时反向翻滚脱困再侧向绕行。相同种子结果可复现。

## 联机（`net-session.js`、`electron/`）

- 传输：Electron 主进程里的 `electron/steam-link.cjs`，基于 `steamworks.js` 0.4（ISteamMatchmaking 大厅 + ISteamNetworking P2P，Steam 在打不通直连时自动走 Steam Datagram Relay）。没有自己的服务器。页面通过 `window.wankaiNet`（`preload.cjs`）访问，渲染进程保持 sandbox / contextIsolation，只拿到状态、消息和昵称，碰不到 Steam API。
- AppID 只在 `steam-link.cjs` 的 `STEAM_APP_ID` 一处设置，开发期为 480（Spacewar）。`main.cjs` 在窗口创建前初始化 Steam（覆盖层要先挂上）并调用 `electronEnableSteamOverlay()`；Steam 未运行时不崩溃，打开联机面板时显示原因，下次操作会重试初始化。
- 大厅：最多 2 人，创建者（owner）是房主。数据键 `mukun_arena_game = mukun-arena`、`mukun_arena_version = package.json 版本`、`mukun_arena_mode = quick | invite`、`mukun_arena_host = 房主昵称`。
  - 快速匹配：`getLobbies()`（steamworks.js 不提供服务端过滤，最多 50 个结果）后在客户端按上面三个键和「只有 1 人」过滤，依次尝试加入；都不行就建公开大厅等待。等待时每 5 秒再搜一次，若发现 id 更小的同类大厅就离开自己的去加入，避免两人同时建房互相等待。对手进入后 `setJoinable(false)`，对手在开局前离开则重新开放。
  - 邀请好友：建 FriendsOnly 大厅并 `overlay.activateInviteDialog`。接受邀请时 Steam 触发 `GameLobbyJoinRequested`，游戏未运行时 Steam 以 `+connect_lobby <id>` 启动；两种情况都转给窗口，打开联机面板加入。
- 消息：每条一个 JSON 对象（≤ 64 KB），发往对方 Steam ID。不带事件的快照和不带技能点击的输入用 UnreliableNoDelay（超过 1150 字节自动改为可靠）；握手、准备、竞技场、开局、再战、ping、离开、带事件的快照和带 `skillTap` 的输入用 Reliable。链路每 2 秒发一个不转给页面的 `keepalive`，15 秒收不到对方任何包、对方离开大厅或 P2P 连接失败都报告 `disconnected`。主进程在玩家处于大厅时以 4 ms 间隔读包，Steam 回调由 steamworks.js 每 33 ms 处理。
- 页面状态（`net:status`）：`connecting`、`searching`、`joining`、`waiting { mode }`、`connected { role, peer }`、`disconnected { message }`、`error { message }`。`online.js` 在 `connected` 时创建 `NetSession`（房主为 host），关窗或取消时离开大厅。
- 握手：加入者发送 `hello { protocol, version, name }`，房主校验协议号（当前 3）与版本，回 `welcome { name }`；双方昵称显示在准备页对手卡片上。快照按 `seq` 丢弃过期包（不可靠通道可能乱序），但其中的事件照常播放。
- 主机（红方，id 0）运行物理；加入者（蓝方，id 1）只发送输入（变化即发 + 30 Hz 心跳），接收 60 Hz 快照（含技能冷却与投掷物），以约 50 ms 延迟插值显示；位移超过 1.5 的帧（瞬移）直接跳转。所有事件随快照转发用于音效、特效和伤害数字。
- 竞技场由房主选择，通过 `arena` 消息和 `start` 消息同步给加入者。
- 对局中 Esc 只打开本地菜单，不暂停；任一方离开或断线，另一方收到提示并回到主菜单。
- 本机联机（仅开发）：`npm run dev:host` / `dev:join`（`--local-net=host|join` 或 `WANKAI_LOCAL_NET`）让 `main.cjs` 用 `electron/local-link.cjs` 代替 Steam。它与 `SteamService` / `SteamLink` 接口相同、向页面发同样的状态和消息：房主在 127.0.0.1:47123（`WANKAI_LOCAL_PORT`）监听，加入者连过去（没连上就每 0.5 秒重试），消息是按行分隔的 JSON；启动时两个窗口都像收到邀请一样自动打开联机面板。加入者使用 `.local/second-player` 作为 userData。只在 `!app.isPackaged` 时加载，打包配置也排除了这个文件。

## 打包（`package.json` 的 `build`）

- electron-builder：Windows 出 `dir` + `nsis`，macOS 出 arm64 / x64 的 `dmg` + `zip`（ad-hoc 签名）。各平台的 `files` 会替换顶层列表，所以每个平台都完整列出，并去掉其他平台的 Steam 二进制。
- 打包后 `main.cjs` 按 `app.isPackaged` 加载 `dist/index.html`；`steamworks.js` 通过 `asarUnpack` 解包；Windows / Linux 打包版没有菜单栏，macOS 有标准应用菜单（Cmd+Q / W / C / V、全屏）。
- 图标由 `tools/make-icon.mjs` 生成：`tools/icon-render.html` 用真实模型离屏渲染奶蛙与奶木昆（整身 + 头部特写两张），`tools/make-icon.py` 合成圆角奶油色底板、墨色描边，48 px 以下用头部特写。`tests/packaging.test.js` 检查这些配置。
