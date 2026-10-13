# Wankai Two Player Demo PRD

Status: Draft for review

## 1. Executive summary

### Problem statement

Wankai has an unusual combat rule: a fighter with no feet uses a floating staff for both movement and attacks. The current prototype is playable, but we have not yet shown that two new players can learn to move and land hits deliberately without a live explanation. We also have not tested whether a Tripo-generated weapon can work as the staff's visible form in the game.

### Proposed solution

Build a small local two-player demo on one Mac, using the existing Electron, React, React Three Fiber, Three.js, and custom physics project. Keep the current modes and controls, make the Up-to-Down swing continuous, and attach one generated 3D weapon model to both staffs as an appearance-only asset.

### Success criteria

1. In a playtest with two people who have not played Wankai before, likely friends of the creator, both start and complete a local match using the on-screen controls and help panel without live instruction. Record where either player needs help; this is a proposed first-playtest check, not a claim already validated.
2. Each player can choose and repeat a staff movement or swing on purpose during the playtest. Record whether they can aim and land hits deliberately; merely finishing a match through accidental movement and contact does not count as success.
3. The same imported weapon is visible on both staffs throughout a match and rematch, with a player-color distinction. Physics regression outcomes remain unchanged by the visual asset.
4. The Up-to-Down transition meets the swing acceptance checks below in an unimpeded case and feels continuous in a hands-on playtest.
5. The app launches and plays with local assets while offline; repeated rematches do not accumulate listeners or 3D resources.

## 2. User experience and functionality

### Target users

**Primary players:** Likely two of the creator's friends at one Mac, ideally people who have never played Wankai. They need to discover the controls, understand that the staff is also their means of movement, and see whether an action caused a hit or block.

**Demo owner:** The project creator uses short local matches to judge whether the mechanic is learnable and whether a generated weapon looks convincing in motion. This is a learning prototype, not a content-complete release.

### User flow

1. Open the Electron development app and choose a two-player match or practice mode.
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

**Player viewing the weapon:** As a player, I want the generated weapon to follow my staff and retain my player color so I can identify it during a fight.

- One Tripo-generated 3D model is attached to both moving staffs and remains visible during hits and rematches.
- Each weapon retains a visible player-color distinction.
- The imported model changes appearance only. The current staff controls, collision shape, damage, movement, and blocking rules remain authoritative.
- If the model fails to load, the current procedural staff remains visible and the match remains playable; development output identifies the loading problem.

### Non-goals for the first demo

- Two player-specific views in one window; the first demo keeps one shared camera.
- A guided tutorial; use the controls, help panel, and practice mode first.
- Final weapon art, different weapons for each player, character model replacement, AI opponents, online play, new arenas, progression, or a packaged macOS app.

## 3. Generated-asset requirements

Tripo is an external **asset creation step**, not an AI feature running inside Wankai. Use the [supplied polearm image](reference/polearm.png) for the first trial, review the generated shape from several angles, and export a GLB. The [first weapon trial guide](TRIPO_WEAPON_TRIAL.md) gives the beginner workflow and records the first generated GLB, its game-ready copy, and known visual limits.

Evaluate the first model by checking that its shaft and blade are recognizable from multiple views, that it can be aligned with the staff, and that it remains readable while moving. A single image may leave hidden surfaces uncertain. Exact style and alignment can be refined after the first in-game test.

## 4. Technical specifications

### Architecture and integration

- `src/physics.js` owns the fixed-step movement, staff collision shape, and damage rules. Rendering must not change those calculations.
- React owns menus, HUD, dialogs, and input indicators. React Three Fiber and Three.js render the arena, fighters, staffs, camera, trails, and effects in Electron's sandboxed renderer.
- Load the exported GLB as a local asset, attach a visual copy to each existing moving staff group, and align its grip end, orientation, and approximate length. Retain the procedural staff as a fallback.
- Keep the renderer isolated from Node.js and IPC. The running game needs no Tripo account, API key, or network connection. Generation and export happen outside the game in the creator's Tripo account.

### Verification

- Run the existing physics regression suite and a production renderer build.
- In Electron, check two-player and practice matches, the swing transition, hits and blocks, sound, pause/resume, rematch, window resizing, focus loss, and offline operation.
- Check that importing or removing the model does not change collision or damage outcomes, and that rematches do not duplicate listeners or 3D resources.

## 5. Risks and roadmap

### First demo

Implement the swing refinement and import one generated weapon model for both players. Verify the existing game behavior and observe a first-time two-player playtest. The model's curved blade may extend beyond the current straight collision rod; treat this as a visible limitation of the appearance trial and inspect it during playtesting.

The first generation may have an unclear rear surface or a broken shaft because it starts from one image. A large GLB may also reduce frame rate. Review the exported model before importing it, then check game performance in a match. Tripo generation may use account credits; the exact cost is determined in Tripo before generation.

### Later iterations

Use playtest findings to tune controls and feedback. If friends struggle to control the staff deliberately, consider lowering the execution difficulty while preserving the staff-based movement and combat concept. Consider two player-specific camera views within the same Electron window and a guided tutorial. Refine weapon art and collision design only after the first visual integration shows what is needed.

### Solo camera experiment

A separate local prototype offers one fighter with the existing staff movement rules, no opponent, and a circular arena with three times the duel radius. The view starts from the weapon's side, softly keeps it in frame, and follows the fighter's position. A / D still rotate the staff; mouse drag changes the camera angle and the wheel changes distance. This mode is for exploring movement and camera feel and does not replace the first demo's two-player playtest criteria. Its camera and arena size remain open to hands-on tuning.

### Open dependencies

- The first Tripo GLB is available locally. A two-player playtest is needed to judge its visibility, collision mismatch, and performance.
- The first-time-player success checks and swing feel are proposed evaluation criteria until observed in playtesting.
