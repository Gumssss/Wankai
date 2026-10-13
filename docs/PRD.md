# Wankai Weapon Duel PRD

Status: Draft for review, updated 14 October 2026. The first playable demo remains small; a growing set of weapons with distinct gameplay effects is the longer-term product direction. Unresolved decisions are recorded in the [design handoff](DESIGN_HANDOFF.md).

## 1. Executive summary

### Problem statement

Wankai has an unusual combat rule: a fighter with no feet uses a floating weapon for both movement and attacks. The current prototype is playable, but we have not yet shown that two new players can learn to move and land hits deliberately without a live explanation. The first Tripo polearm proved that a generated model can appear in game; the newer sword tests whether different weapons can change reach and swing feel without losing the core movement rule.

### Proposed solution

Build a small local two-player demo on one Mac, using the existing Electron, React, React Three Fiber, Three.js, and custom physics project. Keep the weapon-based movement and current controls, improve the Up-to-Down swing, and test generated 3D weapons in real matches. The current local build defaults to player one's shorter, faster sword against player two's curved polearm. The long-term game plan is a roster of weapons with meaningfully different behavior and effects; the sword is one example, not the final set.

### Product direction and staged scope

1. **Original appearance trial:** Place the same generated polearm model on both fighters without changing its physics. This showed the basic Tripo-to-GLB-to-game workflow.
2. **Current two-weapon prototype:** Give the sword shorter reach and faster swings, keep the polearm's existing profile, and compare them in a local duel. The sword's downward support direction still needs investigation before this prototype is accepted.
3. **Future weapon roster:** Add further weapons with their own readable appearance and gameplay effects. Reach, swing response, ground contact, damage, and any special visual or mechanical effects must be designed and tested per weapon. The exact roster, effects, selection rules, and balance targets are not decided yet.

### Success criteria

1. In a playtest with two people who have not played Wankai before, likely friends of the creator, both start and complete a local match using the on-screen controls and help panel without live instruction. Record where either player needs help; this is a proposed first-playtest check, not a claim already validated.
2. Each player can choose and repeat a staff movement or swing on purpose during the playtest. Record whether they can aim and land hits deliberately; merely finishing a match through accidental movement and contact does not count as success.
3. Each selected weapon looks and behaves consistently through a match and rematch. Two first-time players can notice the sword's shorter reach and faster swing response compared with the polearm. The original same-polearm trial remains available by selecting the polearm for player one.
4. The Up-to-Down transition meets the swing acceptance checks below in an unimpeded case and feels continuous in a hands-on playtest.
5. The app launches and plays with local assets while offline; repeated rematches do not accumulate listeners or 3D resources.

## 2. User experience and functionality

### Target users

**Primary players:** Likely two of the creator's friends at one Mac, ideally people who have never played Wankai. They need to discover the controls, understand that the staff is also their means of movement, and see whether an action caused a hit or block.

**Demo owner:** The project creator uses short local matches to judge whether the mechanic is learnable and whether a generated weapon looks convincing in motion. This is a learning prototype, not a content-complete release.

### User flow

1. Open the Electron development app, choose player one's available weapon, and choose a two-player match or practice mode. The current default is sword versus polearm; solo exploration is also available.
2. Read the visible controls or help panel. Both players use the same keyboard and the current shared elevated camera.
3. Push against the ground, swing, strike, and block with the staff. The HUD shows health and match time; hits produce the current visual and sound feedback.
4. Pause, resume, or rematch as needed. The app pauses and clears input on focus loss.

### User stories and acceptance criteria

**First-time player:** As a new player, I want visible controls and feedback so I can learn how to move and fight without a live explanation.

- The menu offers two-player and practice modes, and the current controls and help panel remain accessible.
- HUD, hit effects, sound, pause/resume, rematch, and focus-loss behavior work in both relevant modes.
- The first playtest records whether two new players can start, repeat an intended movement or swing, attempt a targeted hit, and finish a match without guidance. Accidental match completion alone does not satisfy the learning goal.

**Player controlling a staff:** As a player, I want an upward swing to flow into a downward swing so the staff does not unexpectedly reverse at vertical.

- Holding Up aims to straight up and stops there.
- Releasing Up while the staff is still moving may allow up to about ten degrees of follow-through under ordinary, unimpeded motion. Releasing after it stops adds no motion.
- Pressing Down at straight up continues the direction of the preceding upward swing, even if Up was held until the staff stopped.
- Collisions can still alter the swing as they do today. Playtesting informs final tuning.

**Player trying different weapons:** As a player, I want each weapon to have a recognizable strength, limitation, and effect on play so choosing one changes my approach.

- In the current prototype, the sword's shorter reach and quicker swing response are visible and felt; the polearm keeps its longer reach and existing swing response.
- The sword uses the same contact-driven movement system. It does not grant an unrelated running-speed bonus.
- The visible weapon direction and collision path should agree well enough that players can predict support, blocks, and hits. The sword's downward support direction remains an open issue.
- Later weapons require a short design specification and playtest for each proposed effect before implementation. No particular special ability is approved by this PRD.

**Player viewing the weapon:** As a player, I want the generated weapon to follow its collision path and make each fighter easy to identify during a fight.

- The first Tripo polearm model can be attached to both moving weapons and remain visible during hits and rematches. In the current default pairing, player one instead has the short-sword model and player two has the polearm model.
- Player color accents and the different weapon silhouettes help identify the players.
- Importing the polearm model changes appearance only. The short sword is a separate experiment with its own shorter collision length and faster swing parameters; each selected physics profile remains authoritative over its visual model.
- If the model fails to load, the current procedural staff remains visible and the match remains playable; development output identifies the loading problem.

### Non-goals for the first demo

- Two player-specific views in one window; the first demo keeps one shared camera.
- A guided tutorial; use the controls, help panel, and practice mode first.
- A complete weapon roster, final balance, final weapon art, character model replacement, AI opponents, online play, new arenas, progression, or a packaged macOS app. A roster is a planned direction, but the first playable demo only needs a small, testable set.

## 3. Generated-asset requirements

Tripo is an external **asset creation step**, not an AI feature running inside Wankai. The [supplied polearm image](reference/polearm.png) started the first trial; its result and workflow are in the [first weapon trial guide](TRIPO_WEAPON_TRIAL.md). The [short sword trial](SWORD_TRIAL.md) records the second asset and its different physics profile. Future assets can be generated or sourced individually, but each must be reviewed for shape, orientation, performance, and reuse rights before distribution.

Evaluate the first model by checking that its shaft and blade are recognizable from multiple views, that it can be aligned with the staff, and that it remains readable while moving. A single image may leave hidden surfaces uncertain. Exact style and alignment can be refined after the first in-game test.

## 4. Technical specifications

### Architecture and integration

- `src/physics.js` owns fixed-step movement, weapon profiles, collision shapes, and damage rules. Rendering must not change those calculations. Future weapon-specific effects belong in explicit gameplay rules, with visuals following those rules.
- React owns menus, HUD, dialogs, and input indicators. React Three Fiber and Three.js render the arena, fighters, staffs, camera, trails, and effects in Electron's sandboxed renderer.
- Load the exported GLB as a local asset, attach a visual copy to each existing moving staff group, and align its grip end, orientation, and approximate length. Retain the procedural staff as a fallback.
- Keep the renderer isolated from Node.js and IPC. The running game needs no Tripo account, API key, or network connection. Generation and export happen outside the game in the creator's Tripo account.

### Verification

- Run the existing physics regression suite and a production renderer build.
- In Electron, check two-player and practice matches, the swing transition, hits and blocks, sound, pause/resume, rematch, window resizing, focus loss, and offline operation.
- Check that importing or removing the model does not change collision or damage outcomes, and that rematches do not duplicate listeners or 3D resources.

## 5. Risks and roadmap

### First demo

The swing refinement and original polearm import are implemented. The current local demo also has the sword-versus-polearm default, but the sword's downward support direction remains unresolved. Verify existing game behavior and observe a first-time two-player playtest. Curved or wide blades may extend beyond the current straight collision segments; inspect that mismatch during playtesting.

The first generation may have an unclear rear surface or a broken shaft because it starts from one image. A large GLB may also reduce frame rate. Review the exported model before importing it, then check game performance in a match. Tripo generation may use account credits; the exact cost is determined in Tripo before generation.

### Later iterations

Use playtest findings to tune controls and feedback. If friends struggle to control the weapon deliberately, consider lowering the execution difficulty while preserving weapon-based movement and combat. Design further weapons with distinct effects, including how their visuals, reach, swing response, ground support, and collision behavior fit together; exact effects are still open. Consider two player-specific camera views within the same Electron window and a guided tutorial. Refine weapon art and collision design as the weapon set grows.

### Solo camera experiment

A separate local prototype offers one fighter with the existing staff movement rules, no opponent, and a circular arena with three times the duel radius. The raised view starts from the weapon's side, softly keeps it in frame, and follows the fighter's position. A / D still rotate the staff; mouse drag changes the camera angle and the wheel changes distance. A small dial shows the staff's horizontal direction relative to the current camera, since the fighter has no fixed facing direction. This mode is for exploring movement and camera feel and does not replace the first demo's two-player playtest criteria. Its camera and arena size remain open to hands-on tuning.

### Short sword experiment

As the first differentiated weapon, a local weapon-selection prototype gives player one a short sword by default while player two keeps the curved polearm; player one can choose the polearm instead. The sword has shorter physical reach and faster swing acceleration, braking, and angular speed. It does not add independent character movement; the same ground-contact rules move the fighter. Its direction during downward support is still disputed and needs reproduction and playtesting. See the [short sword trial](SWORD_TRIAL.md) for the asset source, tuning, and checks, and the [design handoff](DESIGN_HANDOFF.md) for the unresolved questions.

### Open dependencies

- The first Tripo GLB is available locally. A two-player playtest is needed to judge its visibility, collision mismatch, and performance.
- The first-time-player success checks and swing feel are proposed evaluation criteria until observed in playtesting.
- Further weapon types, their specific effects, how both players will select them, and balance targets need design decisions after the current sword-versus-polearm behavior is understood.
