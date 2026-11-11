# Restored animals — 2 November 2026

5 November 2026 adds three independent imported characters and signature weapons. The roster has nine characters and 56 loadouts. CR7 and Mean Girl now have F skills; their ordinary weapon controls retain the fitted attachment offsets. CR7 has a dedicated skinned loader with independent skeletons and rotation-only leg clips. Mean Girl and Maodie retain their static body meshes; Maodie now has the lifesteal F skill. The shared loader now supports both UV textures and linear vertex colours. Network protocol is **15**. [Source, model and runtime handoff](characters/drive-packet-2026-11-05.md).

See [RESTORED_ANIMALS.md](RESTORED_ANIMALS.md) for the two additional GLB characters, paired anatomical contacts, Beagle resource skill, character-specific health, preview/portrait behavior and protocol-4 pose state. Earlier statements below about every weapon floating, every body following the view and all models being procedural apply to the original four-character implementation; Beagle long ears and orange-cat paws use the documented anatomical exceptions. Existing fighters retain their current behavior.

# 架构与约定

## 坐标与角色框架

- 世界 Y 向上，地面 y = 0；比赛场地半径 19.35（`ARENA_PROFILE.radius × MATCH_ARENA_SCALE`），围边高 2.52。
- 每个角色有一个**身体枢轴** `p`，位于地面上方 `bodyFloor`（0.59）。模型根节点放在枢轴上，`rotation.y = -fighterHeading(p)`，脸朝本地 +X。
- `fighterHeading`：所有角色都返回 `bodyYaw`（以有限角速度追随鼠标视角 `faceYaw`）。
- 浮空武器姿态由 `theta`（竖直挥动角，0 = 朝上，π/2 = 朝前水平）和 `phi`（水平方位角）决定。`weaponStats(player)` 也提供适配身体大小的偏移量，供渲染和碰撞共用。`weaponPointFrame(player, local)` 把武器局部点转换到世界，并给出雅可比，接触冲量同时作用于角度和身体。

## 外观 = 碰撞

所有模型都在 `src/models/` 中用代码生成，并直接复用碰撞数据：

- 漂浮武器沿 +Y 建模、握柄末端在原点、+X 为 W 挥动的前缘，长度等于 `WEAPONS[type].length`，造型骨架就是碰撞胶囊（`physics.js`）。
- 专属武器也是普通的漂浮武器：外卖盒（胆子肥嘟嘟）和开心猫爪（开心小猫，一只带肉垫的大猫爪，腕部 + 掌面 + 脚趾三个胶囊）。开心小猫也可使用通用武器。
- 角色身体保持在 `CHARACTERS[id].bounds` 内，受击形状 `hurtShapes` 的中心都在可见身体内；`models.test.js` 校验这两点。
- `models/character-assets.js` 缓存导入网格与纹理，`character-parts.js` 为每个实例克隆网格并创建独立材质。CR7、Mean Girl 使用原始 UV 基色纹理，Maodie 与其猫爪保留线性顶点色。奶蛙使用导入模型并通过 `bendable` 和姿态模型混合表现大笑。
- 火柴人用不受光照的平涂材质（`kit.flat`）加粗描边，模仿《氰化欢乐秀》的 2D 画风。

修改造型时先改碰撞数据，再让模型跟随；`npm test` 会检查二者是否对齐。

## 物理（`physics.js`）

- 固定步长 1/180 s。每步：输入 → 马达 / 重力 / 耐力 → 积分 → 5 轮接触求解（地面撑地、围边、障碍物、身体分离）→ 武器格挡与攻击（在两步之间扫掠采样，防止高速穿透）→ 胜负判定。
- 障碍物（`arena-obstacles.js`）只有两种：竖直圆柱和可旋转的盒体，都在 XZ 平面内做最近点推出；高度以上不碰撞。武器沿胶囊每 0.35 采样一次接触障碍，冲量模型与围边一致，所以能「借力撑开」。
- 分出胜负后，胜者仍可活动，败者冻结且不再产生命中。

## 技能（`skills.js`、`physics.js`）

- 角色可有一个 F 技能，`skill: null` 的配置忽略 F。`skillTap` 只被一个物理步消费；`updateSkill` 在每步开头处理冷却与持续效果（大笑抽体力、Happy Happy 回血），在采样扫掠之前完成瞬移，避免瞬移被当成一次横扫命中。
- 外卖投掷生成 `world.projectiles`，按抛物线飞行，命中对手受击形状造成伤害，落地 / 撞墙 / 撞障碍物时产生 `splat` 事件。
- 橘猫「巨爪」将成对猫爪从原版 1× 放大到之前的 1.3× 尺寸，持续 8 秒，冷却 30 秒。模型与接触形状一起变化，爪部倍率叠乘全局体型成长。技能本身仅改变尺寸。
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
- 握手：加入者发送 `hello { protocol, version, name }`，房主校验协议号（当前 12）与版本，回 `welcome { name }`；双方昵称显示在准备页对手卡片上。快照按 `seq` 丢弃过期包（不可靠通道可能乱序），但其中的事件照常播放。
- 主机（红方，id 0）运行物理；加入者（蓝方，id 1）只发送输入（变化即发 + 30 Hz 心跳），接收 60 Hz 快照（含技能冷却与投掷物），以约 50 ms 延迟插值显示；位移超过 1.5 的帧（瞬移）直接跳转。所有事件随快照转发用于音效、特效和伤害数字。
- 竞技场由房主选择，通过 `arena` 消息和 `start` 消息同步给加入者。
- 对局中 Esc 只打开本地菜单，不暂停；任一方离开或断线，另一方收到提示并回到主菜单。
- 本机联机（仅开发）：`npm run dev:host` / `dev:join`（`--local-net=host|join` 或 `WANKAI_LOCAL_NET`）让 `main.cjs` 用 `electron/local-link.cjs` 代替 Steam。它与 `SteamService` / `SteamLink` 接口相同、向页面发同样的状态和消息：房主在 127.0.0.1:47123（`WANKAI_LOCAL_PORT`）监听，加入者连过去（没连上就每 0.5 秒重试），消息是按行分隔的 JSON；启动时两个窗口都像收到邀请一样自动打开联机面板。加入者使用 `.local/second-player` 作为 userData。只在 `!app.isPackaged` 时加载，打包配置也排除了这个文件。

## 打包（`package.json` 的 `build`）

- electron-builder：Windows 出 `dir` + `nsis`，macOS 出 arm64 / x64 的 `dmg` + `zip`（ad-hoc 签名）。各平台的 `files` 会替换顶层列表，所以每个平台都完整列出，并去掉其他平台的 Steam 二进制。
- 打包后 `main.cjs` 按 `app.isPackaged` 加载 `dist/index.html`；`steamworks.js` 通过 `asarUnpack` 解包；Windows / Linux 打包版没有菜单栏，macOS 有标准应用菜单（Cmd+Q / W / C / V、全屏）。
- 图标由 `tools/make-icon.mjs` 生成：`tools/icon-render.html` 用真实模型离屏渲染奶蛙与奶木昆（整身 + 头部特写两张），`tools/make-icon.py` 合成圆角奶油色底板、墨色描边，48 px 以下用头部特写。`tests/packaging.test.js` 检查这些配置。

## CR7 / Mean Girl (8 November 2026)

`arena-skills.js` owns windup / active / recovery, skill damage, soccer sweeps and perfume exposure. The 180 Hz host remains authoritative. Mean Girl windup completion is deferred until after damage and can be interrupted on the last tick. CR7 has zero windup: successful activation launches and grants protection before incoming collisions in that physics step. Dead players or a finished round cannot activate. Perfume tests the existing hurt capsules against a finite 70-degree sector (3.4 m, nozzle height +/- .55 m), then checks analytic obstacle occlusion. Soccer sweeps a sphere against hurt capsules, the circular arena and expanded obstacle shapes; it retains velocity magnitude on reflection. Expanded box corners are conservative.

Each accepted perfume activation can add one bleeding stack per opponent, tracked with a host-only target mask. `bleedStacks` persists for the rest of the round; the host applies one HP per stack every two seconds, capped to actual HP loss. New stacks preserve the original tick cadence. Invulnerability skips due damage without later catch-up. Protocol 12 replicates the discrete stack count and `bleed-stack` events; ticks remain `hit` events with `source: 'bleed'` and bypass hitstop. Knockout, round end, exit, rematch and disconnect clear the effect. AI may recast against a bleeding opponent.

CR7's active phase removes ordinary weapon contact shapes, permits camera-relative normalized WASD movement at 2.2 m/s, and rejects HP damage / attack knockback while preserving gravity and body separation. Expiry removes the ball and immunity together. Recovery accepts key release; a press during recovery does not arm a restored weapon. A separate attack gate prevents passive weapon contact from scoring before fresh input.

Protocol 6 adds validated raw WASD bits (W=1, A=2, S=4, D=8), a compact ability tuple `[phase, remaining, releaseGate, sprayYaw]`, projectile type and bounce sequence. Bounce discontinuities snap instead of interpolating across walls. HP and damage remain host-owned; particles, rigs and audio are local presentation. `skill` and `skill-release` events distinguish activation from actual release.

`models/cr7-rig.js` preloads the original mesh's rigged derivative, uses SkeletonUtils clones and one mixer/material set per fighter, and samples clips from skill time for deterministic pause/replay. Geometry and textures are shared and retained across instance disposal. Browser preload failure is surfaced; synchronous Node geometry-only callers can still inspect the original static mesh.

[Contract, model source, verification and limitations](characters/CR7_MEANGIRL_IMPLEMENTED.md).


## Combat growth and contact audio — 11 November 2026

Production GameSession worlds enable match growth; bare physics helpers default to growth disabled. `match-growth.js` centralizes the 30–60 second linear curve, 3× size cap (`MAX_FIGHTER_SCALE`) and 1.25 damage cap. The host owns `roundTime`; countdown, offline pause and result simulation do not advance it. Snapshots have carried this clock since protocol 7, and guests interpolate growth with their buffered poses. Rematches reset it. No timeout or pressure-zone system is enabled.

Body/weapon presentation and contact transforms use the same fighter scale. The generous contact pass sets sword blade radius to .26, polearm blade/tip to .28/.20, axe blade to .27, hammer head to .23, mace head to .34 and yellow staff to .18. These shapes extend beyond the visible models and apply to hits, blocks, floor, walls and obstacles. Other weapons retain their contact profiles. Damage uses baseline-equivalent rotational motion before the explicit growth multiplier, while physical contacts use the enlarged shapes. Projectiles keep their launch size/damage, and ongoing spray follows caster growth. Protocol 8 includes Orange Tabby's temporary paw growth on top of the shared fighter scale. Paw scale ramps in/out over .2 seconds, is interpolated in contact sweeps and network snapshots, and resets on knockout/rematch; the 30-second cooldown starts at activation.

Physical contact events are coalesced on the host before networking. Sound-only contact, bounce and growth events must not trigger hit/clash particles or hitstop. Procedural material cues use the existing SFX bus and recordings; state-driven rotor/spray audio stops on pause, skill end, death or exit. No external sound downloads were added.

Implementation verification is limited to static syntax/import/diff inspection at the user's request. No gameplay tests, builds, audio listening tests or native Steam checks were performed for this update; gameplay feel and mix balance remain unverified.

## Lifesteal and Beagle Rotor — 11 November 2026

Maodie uses `lifesteal` with an 8-second active window, a 40-second cooldown from activation, and `healRatio: 2`. Only accepted melee HP loss in `solveAttack` grants healing; compute the target health delta after the health floor, then cap restoration at the living attacker’s maximum HP. No damage multiplier or stamina cost is added. Knockout, exit and rematch clear the effect; offline pause freezes it. Protocol 9 forwards `heal {player, amount, point, source}` events for presentation while HP remains host-owned. Healing creates no hitstop or damage readout.

The Beagle's long ears target 2.5 rad/s for ordinary A/D steering. Rotor requires at least 40 stamina and drains 16 per second for up to 5 seconds. Its 30-second cooldown starts at activation. The motor spins in a fixed positive direction with a full-stamina target of 4.25 rad/s. Protocol 10 uses the existing raw WASD mask and camera yaw for Beagle's normalized horizontal movement at 2.2 m/s during Rotor. The host simulates movement and cooldown and replicates the existing skill state fields to guests.


## Beginner hit assistance and impact feedback — 11 November 2026

Body-hit assistance expands world-space melee radii by 1.15 for the pan and 1.5 for every other weapon. Physical floor, prop, weapon-clash and body-contact response continue using the original radii. Assisted-only contacts receive no penetration force; an accepted hit retains the existing damage knockback. Physical candidates have priority, and geometric guard/obstacle checks reject assistance through an obstruction. Zero-damage assisted overlaps do not consume a future strike; an accepted-hit latch prevents an assisted hit followed by physical contact from damaging twice.

CR7 uses skill speed 75.6 (4.2× the original 18), size multiplier 2, and base damage 8. The shared model radius remains 0.46; skill radius is 0.92 times fighter growth. At full growth the projectile diameter is 5.52 and damage 10. Rolling speed follows linear velocity/radius; legal launch placement checks the rim and props, with cost/cooldown refunded if no safe placement exists. Duration, movement, immunity and repeat-hit protection retain their previous rules.

Impact feedback is presentation-only, driven by accepted host events. Cartoon bursts, weapon-family accents, bounded character recoil/squash, health flashes and direct-hit number pops share a heavy-hit threshold of 22. Bleed numbers remain smaller and quiet. Lifesteal heal events include `sourcePoint` for a cosmetic transfer toward the recipient. Direct-hit audio gains 3 dB before the existing SFX volume and limiter. Reduced-motion mode suppresses recoil and camera kicks. Effect resources and labels are bounded; pause freezes animation and disconnect/reset clears it.

Protocol 12 deduplicates event-bearing snapshot sequences while preserving unseen late event packets and rejecting previous-round packets. Damage and stack counters are never simulated by guests.


### Hit-feedback readability pass

Bursts now have a dark ink outline. Perspective-aware sizing keeps their base radius at least 2.5% of viewport height for ordinary hits and 4% for heavy hits, capped at 6% before the brief pop. Clashes use blue-grey/white sparks lasting 0.12 seconds. Heavy rings are reserved for heavy damage. Direct damage numbers merge by target within 0.45 seconds; bleed numbers stay separate, with at most three damage labels per target. A merged total does not promote light hits into heavy-hit feedback.

Every positive HP-damage event, including bleed, now creates a local victim camera shake. Strength grows with the square root of damage/30 (capped at 30): duration 0.12–0.28 seconds, angular coefficient 0.2–2.4 degrees, translation coefficient 0.015–0.18 × fighter scale. A short decaying oscillation replaces the barely visible single-direction kick. Each victim has an independent envelope, so an outgoing hit cannot erase an incoming shake. Clashes and blocked/zero-damage hits do not shake. Reduced motion disables all camera shake; pause freezes the envelope and reset clears it. Finishing hits retain the incoming shake over the KO presentation.

A decisive round result starts a 0.6-second local finishing presentation: KO stamp, 0.14-second visual pose hold, a smooth pose catch-up and an 8% FOV push-in before the existing victory presentation/result sound. Authoritative winner, physics and network snapshots are not delayed. Each peer starts its own presentation when it accepts the winner. Draws skip the KO beat. Reset/home/disconnect clear it. Focused session/FX/network checks pass; the real renderer also checked camera restoration, reduced motion, and no mutation of simulation players.


### Combat lettering, bleed status and opening skill lock

Combat numbers and callouts use the bundled PF Hutu display face, tilted lettering and heavier contrasting ink outlines. Bleeding fighters have a persistent red droplet badge with 3–6 trickling droplets depending on stack count; the host's existing bleedStacks field controls it. Pause freezes motion; reduced motion keeps static droplets. KO, cleared stacks, leaving and reset remove the status art.

All nine skills are blocked by the host's input-to-physics path until two seconds of round simulation have elapsed after countdown. Rejected early taps consume no stamina/cooldown and are discarded. Movement and ordinary weapon attacks remain available. The HUD shows the opening-lock countdown, and rematches reset it. Protocol 13 requires matching builds for this rule change. Focused checks cover all skills, offline pause/reset, and host/guest input.


### Instant CR7 launch

Protocol 15 removes CR7's startup delay. Once an F input is accepted, safe placement, ball creation and the active immunity phase are resolved in the skill-update stage before melee, projectile and bleed damage. Same-step attacks cannot damage CR7 after successful activation. Existing cooldown, 40-stamina cost, grounded requirement and two-second opening lock still apply. Failed placement refunds cost/cooldown and grants no protection. Damage already processed before the host receives the input is not undone. The ball retains speed 75.6, doubled size and a three-second active phase. Mean Girl startup remains interruptible. Focused checks cover damage sources, rejected activations, actual physics-step ordering and either network peer controlling CR7.
