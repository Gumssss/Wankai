# Wankai Weapon Duel PRD

Status: Local implementation reviewed 20 October 2026. The source has eight validated character/equipment loadouts, a full-window preparation page, four play modes, independent duel cameras, stamina and directional damage. Basic fighter supports three common weapons, beagle supports those plus long ears, and orange tabby supports giant paws. The character/selection extensions are not yet pushed, merged or released; the prior merged baseline is PR #2 (`a591070`). First-time-player acceptance and final balance remain open. See the [project status](PROJECT_STATUS.md), [changelog](../CHANGELOG.md), and [design handoff](DESIGN_HANDOFF.md).

The creator subsequently approved the included half-speed/contact trial: keep weapon appearance/reach, halve maximum swing and turn speeds, retain acceleration/braking and initial damage/stamina settings, improve solid shape coverage, and detect between-pose crossings. This is a playtest configuration, not final balance.

## 1. Executive summary

### Problem statement

Wankai has an unusual combat rule: equipment provides both movement and attacks, with no independent walking control. The current prototype is playable, but we have not yet shown that two new players can learn to move and land hits deliberately without a live explanation. The polearm, short sword, iron hammer, paired ears and giant paws test different silhouettes, response and contact shapes while retaining that movement rule.

### Proposed solution

The current source demo runs on one Mac using Electron, React, React Three Fiber, Three.js, and custom physics. Players choose a mode, including separate following views or a shared fixed duel view, then enter a full-window preparation page. Each player chooses a compatible character/equipment pair above their own actual-model preview and readies independently; a shared Start commits both selections. Movement remains driven by equipment contact; stamina rewards resting, and horizontal-turn hits deal less damage than equivalent vertical strikes. The default pairing is basic fighter + short sword against basic fighter + curved polearm. Further weapons and effects are a longer-term direction.

The beagle can equip any common weapon with compact cosmetic ears, or long ears with the accepted paired controller. Long-ear movement keeps the body upright with parallel W/S ear strokes and slower combined A/D steering. Only this equipment enables F (P2 Right Shift), the five-second full-spread spinning skill with a small hover; expiry retracts and lands, without stamina use. The skin and contact queries share the deployment/lag transform. This supersedes the rejected flip experiment and earlier hover deferral. See [current skill handoff](BEAGLE_SPIN_SKILL.md).

The orange tabby uses its approved seated model and detached giant paws. W/S drives paired paw rotation, A/D steers, and all four combinations work. S/Down paw-floor contact raises the seated body above its low rest hover; movement is driven by finite controls and physical support. It shares normal stamina/combat rules and has no F/Right Shift ability. Common-weapon cat combinations are not exposed. See the [cat gameplay handoff](characters/orange-tabby/GAMEPLAY.md).

### Product direction and staged scope

1. **Original appearance trial:** Place the same generated polearm model on both fighters without changing its physics. This showed the basic Tripo-to-GLB-to-game workflow.
2. **Differentiated sword trial:** Implement shorter reach and faster swings alongside the polearm. This is playable, but the sword's downward support direction still needs hands-on acceptance.
3. **Three-common-weapon foundation:** The approved iron/red-cloth hammer was exported for 5 credits and integrated. It contrasts through slower response, greater inertia, broad head contacts, and 30% stronger metal-head damage. Both players choose independently, using the same four weapon controls. Stamina, directional damage, enlarged split-screen arena, and the approved rear cameras are implemented; balance remains open.
4. **Current character and preparation extension:** Separate character/equipment catalogues support eight valid loadouts and 64 ordered pairings, including ordinary-weapon beagles and the approved cat/paws. The full-window preparation page shows P1/P2 together with independent Ready buttons and one Start/save action. This extends the earlier ordinary-weapon prototype without changing its combat tuning.
5. **Deferred roster work:** The fourth precision weapon is recorded in [PRECISION_WEAPON.md](PRECISION_WEAPON.md). Its appearance and purchase remain unapproved; the precision weapon and 30% speed setting remain deferred. The local trial adds the separately requested clash recoil; extra clash pause/readout remains deferred.

### Success criteria

1. In a playtest with two people who have not played Wankai before, likely friends of the creator, both start and complete a local match using the on-screen controls and help panel without live instruction. Record where either player needs help; this is a proposed first-playtest check, not a claim already validated.
2. Each player can choose and repeat a weapon movement or swing on purpose during the playtest. Record whether they can aim and land hits deliberately; merely finishing a match through accidental movement and contact does not count as success.
3. Each selected weapon looks and behaves consistently through a match and rematch. Two first-time players can notice the sword's quick response, polearm's reach, and hammer's slower broad-head strikes. The original same-polearm trial remains available by selecting the polearm for both players.
4. From overhead, Forward and Back choose opposite descent paths; continued input can carry the weapon through ground support and around the other side. Horizontal steering works at the same time. Each view follows its own fighter without doubling simulation speed.
5. The app launches and plays with local assets while offline; repeated rematches do not accumulate listeners or 3D resources.

## 2. User experience and functionality

### Target users

**Primary players:** Likely two of the creator's friends at one Mac, ideally people who have never played Wankai. They need to discover the controls, understand that the weapon is also their means of movement, and see whether an action caused a hit or block.

**Demo owner:** The project creator uses short local matches to judge whether the mechanic is learnable and whether a generated weapon looks convincing in motion. This is a learning prototype, not a content-complete release.

### User flow

1. Open the local game and choose a two-player, practice or solo mode to enter the full-window preparation page. P1's character/equipment choices sit on the left above its actual-model preview; P2 has the matching panel on the right. Narrow screens stack complete P1 then P2 panels. Both players may select the same valid loadout. Each readies independently, then a shared Start applies both drafts atomically. Editing one choice resets only that player's readiness. Back/Escape returns to the menu without saving; focus enters the preparation heading and returns to the triggering menu control. Solo shows P1 only and preserves P2's committed configuration; practice also configures its passive dummy. The browse entry uses shared Save instead of starting a match. Defaults remain basic sword versus basic polearm.
2. Read the visible controls or help panel. Both players use the same keyboard and choose either separate following views or one fixed, elevated shared view of the match inside one Electron window.
3. Push against the ground, swing, strike, and block with the selected weapon. The HUD shows health, stamina, and match time; body hits produce pause, damage numbers, sound, and effects. Clear weapon clashes have sound/particles and make both fighters retreat opposite their own current headings. Resting contact cannot repeatedly trigger that recoil. Weapon input spends stamina, resting restores it, and low stamina weakens powered control while preserving contact-based movement and defense.
4. Pause, resume, or rematch as needed. The app pauses and clears input on focus loss.

### User stories and acceptance criteria

**First-time player:** As a new player, I want visible controls and feedback so I can learn how to move and fight without a live explanation.

- The menu offers two-player and practice modes, and the current controls and help panel remain accessible.
- HUD, hit effects, sound, pause/resume, rematch, and focus-loss behavior work in both relevant modes.
- The first playtest records whether two new players can start, repeat an intended movement or swing, attempt a targeted hit, and finish a match without guidance. Accidental match completion alone does not satisfy the learning goal.

**Player controlling a weapon:** As a player, I want to choose which side of my facing direction the weapon swings toward, so I can predict its path and ground contact.

- W / S (↑ / ↓) drive continuous, opposite rotation in the fighter's vertical facing plane. From overhead, W swings toward the front and S toward the back; neither key has a fixed up or down angle target.
- Holding the chosen key can carry the weapon past straight down. Ground contact can support and move the fighter as the weapon continues; the visible weapon must not pass through the floor.
- A / D (← / →) turn only the horizontal heading and can be pressed together with W or S. The fighter has no separate walking control.
- Releasing a key preserves angular momentum under gravity and damping. Reversing input brakes before changing swing direction.
- The [approved control animation](control-concept-combinations.mp4) illustrates the intended motion; playtesting is still needed to assess its feel in the game.
- Collisions can still alter the swing as they do today. Playtesting informs final tuning.

**Two local players:** As a player, I want to choose separate free views or a shared fixed view so I can judge the fight from the perspective I prefer.

- The duel is divided into two labeled views inside one Electron window, with player one on the left and player two on the right. Both views show the same world, hits, and health state; the fixed-step match advances once per frame.
- Each camera adopts the approved rear-view framing: start behind its fighter with a small 15° heading offset, a shallow 0.35-radian orbit pitch, 55° perspective, a 10.5-unit distance, and smooth weapon-relative composition. The far arena edge should be visible at the starting positions while fighters remain readable. Weapon steering does not rotate the view. P1 holds Q / E to turn their camera left / right; P2 holds period / slash (the ? key, without Shift). Releasing keeps that angle, opposite keys cancel, and rematches reset both views. Camera and weapon inputs can be held together. The duel uses no mouse camera controls.
- Translation remains anchored to the fighter so jumps or knockback cannot leave the camera behind. A projected body/head framing check pulls the camera back if the fighter approaches their pane's safe edges, then eases inward. Focus height follows the fighter vertically. Each pane has the solo-style direction indicator relative to its own camera. The split-screen arena and its physical boundary match solo at three times the original radius (19.35 units). The rendered floor, rim contacts, and lighting must match that boundary; starting marks remain aligned with fighters. Combat rules stay the same.
- The visible fighter face follows weapon heading even when the view points elsewhere. When the weapon points vertically, the stored horizontal heading remains defined.
- An additional fixed-camera duel uses the original elevated arena camera and one full-width viewport showing both players. Both players remain active with the same controls, weapons, collision, health, and victory rules; the camera does not follow either fighter. Rematches keep the selected camera mode.
- Practice retains the shared arena camera. Solo mode retains its mouse orbit and larger arena.

**Player choosing a loadout:** As a player, I want to choose a character and compatible equipment without confusing the two player slots.

- Characters own body appearance, bounds and hurt shapes; equipment owns attack contacts, powered controls and approved abilities. Red/blue identity belongs to P1/P2 independently of character.
- There are eight valid loadouts: basic fighter + sword/polearm/hammer; beagle + those three or long ears; orange tabby + giant paws. Only compatible equipment can be selected.
- Both players remain visible during preparation, with choices above their independent rotatable actual-model previews. Ready alone neither saves nor starts. Final Start/save requires every visible participant to be ready and commits the canonical `{ characterId, weaponId }` pairs together.
- Compatible equipment survives a character change; incompatible equipment clears and requires a new choice. An actual edit resets only that player's readiness; selecting the same choice preserves it. Back/Escape discards drafts. Rematch preserves committed selections.
- Hide the arena/HUD during preparation while keeping the arena mounted. Ignore zero/invalid hidden-container resize dimensions and restore valid camera framing when returning. Loading, fallback/retry and selected IDs must remain consistent.

**Player trying different weapons:** As a player, I want each weapon to have a recognizable strength, limitation, and effect on play so choosing one changes my approach.

- In the current prototype, the sword has shorter reach and quicker swing response; the polearm keeps longer reach. The iron hammer has intermediate reach, higher inertia, slower response, and 30% stronger metal-head damage at the same impact speed. Its broad head participates in hits, blocks, and ground support; cloth is decorative.
- Both players choose independently in the armory before fighting. Rematches preserve both selections; returning to the menu allows changing them. The selected iron hammer is also playable, with slower response and stronger head strikes.
- The local trial halves each weapon's axis speed limit to 6.1 / 4.25 / 3.4 rad/s for sword / polearm / hammer while retaining response settings and reach. Existing stamina and speed-based damage rules remain, so movement and damage also need reassessment.
- The sword uses the same contact-driven movement system. It does not grant an unrelated running-speed bonus.
- The visible weapon direction and collision path should agree well enough that players can predict support, blocks, and hits. The sword's downward support direction remains an open issue.
- Later weapons require a short design specification and playtest for each proposed effect before implementation. The current separate ability remains restricted to beagle + long ears; additional abilities require their own review.

**Player managing combat effort:** As a player, I want sustained swinging to create a reason to rest while retaining enough control to reposition and defend.

- Start at 200 stamina. Front/back input drains 20/s and horizontal steering drains 8/s, with additive costs. Begin recovering 30/s after 0.5 seconds without either weapon input. Passive motion and camera input are free; continued input at zero does not recover stamina.
- Below 25 stamina, progressively reduce powered strength and driven speed toward 40% of normal at zero. Preserve reverse braking and normal released inertia. All modes use the same initial stamina rules and show separately labeled health and stamina bars; rematches refill stamina.
- At matched impact speed, acceleration, and contact surface, pure horizontal-turn hits deal 50% of vertical-swing damage before final rounding. Mixed hits blend by actual incoming yaw/pitch/body motion rather than current keys; physical blocking and collision impulse calculations remain unchanged. The hammer head bonus still applies.
- Verify deliberate ground-supported movement and defense at exhaustion during hands-on playtesting; the initial stamina costs and damage multiplier remain tunable.

**Player viewing the weapon:** As a player, I want the generated weapon to follow its collision path and make each fighter easy to identify during a fight.

- The selected sword, polearm, or hammer model loads for each fighter and remains aligned during hits and rematches. Matching weapons remain distinguishable by player-color accents; the default pairing is sword versus polearm.
- Player color accents and the different weapon silhouettes help identify the players.
- Importing the polearm model changes appearance only. The short sword is a separate experiment with its own shorter collision length and faster swing parameters; each selected physics profile remains authoritative over its visual model.
- If the model fails to load, the procedural weapon remains visible (including a broad head proxy for the hammer) and the match remains playable; development output identifies the loading problem.

### Non-goals for the first demo

- A guided tutorial; use the controls, help panel, and practice mode first.
- A complete weapon/character roster, final balance, final art, AI opponents, online play, new arenas, progression, or a packaged macOS app. Further content should follow review of the current small, testable set.

## 3. Generated-asset requirements

Tripo is an external **asset creation step**, not an AI feature running inside Wankai. The [supplied polearm image](reference/polearm.png) started the first trial; its result and workflow are in the [first weapon trial guide](TRIPO_WEAPON_TRIAL.md). The [short sword trial](SWORD_TRIAL.md) records the second asset and its different physics profile. The [iron hammer trial](HAMMER_TRIAL.md) records the approved third weapon, import checks, and armory. Future assets can be generated or sourced individually, but each must be reviewed for shape, orientation, performance, and reuse rights before distribution.

For new Tripo character reconstruction, prepare consistent front/side/back images from the approved design, inspect the current multi-view inputs and identify any unsupported slots. A single historical reference leaves hidden surfaces uncertain. Evaluate the exported model from multiple views; measure weapon axes, grips, character pivots and contacts, then inspect readability in motion. Check geometry and decoded texture memory before integration; the current sword's three 4K textures remain costly even after geometry reduction. Existing preparation scripts target inspected layouts and are not universal importers.

## 4. Technical specifications

### Architecture and integration

- `src/physics.js` owns fixed-step movement, weapon profiles, collision shapes, and damage rules. Rendering must not change those calculations. Future weapon-specific effects belong in explicit gameplay rules, with visuals following those rules.
- React owns menus, the preparation page, HUD, dialogs and input indicators. The preparation page hides the mounted arena screen and has separate demand-rendered model previews. React Three Fiber and Three.js render the arena, fighters, equipment, cameras, trails and effects in Electron's sandboxed renderer. One arena Canvas renders the same scene into two scissored viewports for split-screen duel, or one full-width viewport for fixed-camera duel; its frame loop advances the game session once.
- Separate character and equipment catalogues feed a shared loadout resolver. Load body/equipment assets independently, clone player materials/controls, and align visuals with the same pivots and contact profiles used by the solver. Display loading while pending and matching fallback geometry after failure; retry retains selected IDs. `GameSession.setLoadouts` atomically validates both slots while in the lobby.
- Keep the renderer isolated from Node.js and IPC. The running game needs no Tripo account, API key, or network connection. Generation and export happen outside the game in the creator's Tripo account.

### Verification

- Run `npm test` for physics, weapon integration, contact paths, recoil, session behavior, stamina/damage and camera regressions, then `npm run build`. The cat-integration checkpoint passed 132 full-suite tests and 73 actual-game capture checks. Subsequent selection-layout and full-window work passed 14 and 17 scoped checks respectively plus the build; those are separate runs, not a newly claimed full-suite total. The earlier 100-test timed-hover, 85-test upright and 92-test flip results are historical; flips are inactive. The existing bundle-size warning remains. See [project status](PROJECT_STATUS.md) and [preparation verification](selection-concepts/v04-preparation-stage/verification.json) for evidence and limits.
- In Electron, check both duel views, two-player and practice matches, the swing transition, hits and blocks, sound, pause/resume, rematch, window resizing, focus loss, and offline operation.
- Check that importing or removing a visual model leaves the selected weapon's physics profile unchanged. Verify resource cleanup through repeated armory, match, rematch, and mode transitions; automated physics checks do not establish the absence of resource leaks.

## 5. Risks and roadmap

### First demo

The swing refinement, armory, cameras, stamina, and directional damage are implemented. The new local trial adds sword-guard and polearm-blade capsules around retained shaft proxies and samples intermediate rigid poses for weapon clashes/body hits. It catches reproduced between-step crossings and preserves nearby misses, while retaining fixed ground integration and model size/reach. Bounded samples and rounded proxies can still miss grazing contacts or overestimate local thickness. Sword support behavior and slower-speed balance still need acceptance in a first-time two-player playtest.

The first generation may have an unclear rear surface or a broken shaft because it starts from one image. A large GLB may also reduce frame rate. Review the exported model before importing it, then check game performance in a match. Tripo generation may use account credits; the exact cost is determined in Tripo before generation.

### Later iterations

Use playtest findings to tune controls and feedback. If friends struggle to control the weapon deliberately, consider lowering the execution difficulty while preserving weapon-based movement and combat. Design further weapons with distinct effects, including how their visuals, reach, swing response, ground support, and collision behavior fit together; exact effects are still open. Consider a guided tutorial. Refine weapon art and collision design as the weapon set grows.

The fourth weapon, focused on slower horizontal steering and deliberate control, is deferred at the creator's request. Its agreed direction, unapproved Tripo staff candidate, inspected export cost, and resume checklist are recorded in the [precision weapon side project](PRECISION_WEAPON.md). No staff export has been purchased.

### Solo camera experiment

Solo is a selectable mode in the same app: one fighter, the same weapon movement and stamina rules, no opponent, and a circular arena with three times the original radius, also used by split-screen duel. Fixed-camera duel and practice retain the original radius. The raised view starts from the weapon's side, softly keeps it in frame, and follows the fighter. A / D rotate the weapon; left mouse drag changes the camera angle and the wheel changes distance. Mouse orbit offsets gradually return after inactivity. A small dial shows weapon heading relative to the independent camera. This mode explores movement and camera feel; it does not replace two-player acceptance checks.

### Short sword experiment

As the first differentiated weapon, the short sword has shorter physical reach and faster swing acceleration, braking, and angular speed. Both players can select it, the polearm, or the iron hammer through the armory; the default remains sword versus polearm. It does not add independent character movement; the same ground-contact rules move the fighter. Historical investigation identified a fixed-angle controller discontinuity near straight down; the current controller avoids that switch, and automated checks now cover input direction and continuous visual rotation through the poles. The creator's overall support-direction concern still needs hands-on acceptance. See the [short sword trial](SWORD_TRIAL.md) for evidence, asset source, tuning, and checks, and the [design handoff](DESIGN_HANDOFF.md) for the unresolved questions.

### Open dependencies

- Local source includes the three common-weapon GLBs, compact/long-ear beagle assets and the approved orange-tabby prepared-v02 GLB. The current local extensions have not been pushed or merged; a fresh clone of the prior merged baseline does not include all of them. Playing available local assets needs no Tripo login or new export. A two-player playtest is needed to judge visibility, collision mismatch and performance. Sword and hammer redistribution terms remain unverified.
- The first-time-player success checks and swing feel are proposed evaluation criteria until observed in playtesting.
- The iron hammer has been exported and integrated with measured alignment, a reduced asset budget, and broad head collision coverage. Its five-capsule proxy and initial balance need hands-on playtesting; see [hammer trial](HAMMER_TRIAL.md). Further weapon types, special effects, and balance targets remain design work.
