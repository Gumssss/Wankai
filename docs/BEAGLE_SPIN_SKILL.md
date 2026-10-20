# Beagle normal movement and F hover skill

**Current local entry, 20 October 2026:** open the [live game](http://127.0.0.1:5173/) for implemented behavior. Preparation is a full-window P1-left/P2-right stage, with each player's choices above their own actual-model preview, independent Ready and shared Start/Save. Back/Escape cancels drafts. Beagle may equip sword, polearm, hammer or long ears; only long ears activate F/Right Shift hover. Orange tabby + cat paws is also playable, giving eight valid loadouts and 64 ordered pairings. The creator prefers live review after implementation; the dated videos below remain evidence. [Current preparation and verification](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md) · [latest UI checks](selection-concepts/v04-preparation-stage/verification.json).


**Selection update, 19 October 2026:** this controller and F/Right Shift skill apply only to **beagle + long ears**. Beagle can now choose ordinary weapons with natural cosmetic ears; those combinations ignore the skill and use the ordinary floating-weapon controller. The separation is locally verified, not yet pushed/merged. See [implementation handoff](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md).

Implemented on 19 October 2026 and included in this source checkpoint, following the normal-controls comparison video. The creator approved normal parallel-ear movement and requested that the separate spin skill now include a small hover, using F. This supersedes the earlier decision to defer all hover work. The approved smooth v05 model is unchanged. No new Tripo generation or asset export is needed.

| Input | Behavior |
| --- | --- |
| W / S | Continuous forward/backward parallel-ear strokes. Ear-ground contacts lift and carry the upright body. |
| A / D | Slower normal steering, combinable with W/S. The ears remain parallel. |
| Press F | Settle the ears toward horizontal, spread them to opposite sides, spin the whole upright body and ears, and rise into a low hover. |
| A / D during the skill | Choose the rotor's turning direction; reversal brakes before reversing. |
| Timer expires | Remove lift, retract the ears, coast down and land. Releasing F does not cancel the timer. Normal W/S resumes after retraction. |
| Player two | Arrow-key movement; **Right Shift** activates the same skill. Practice keeps the dummy idle. |

The rotor keeps its horizontal pitch while deployed, so W/S does not apply a simultaneous vertical stroke during the skill or its retraction. Horizontal momentum and collision reactions continue; there is no independent hovering travel control. Front/back flips remain inactive, preventing the earlier lying-down behavior.

## Initial tuning

`src/beagle-skill.js` defines the values for this first playable version:

- Normal steering target: 1.15 rad/s, with finite motor assistance against incidental yaw during W/S strokes. Releasing all normal controls retains momentum under damping.
- Rotor speed: up to 4.25 rad/s. Both body and ears share the same heading; the roots have a small damped yaw lag.
- Hover target: feet about **0.35 world units above the floor**. Bounded lift ramps in with ear deployment and rotor speed; it changes physical vertical velocity, not a render offset or position teleport.
- Ordinary stamina capacity: **200 for every weapon**, doubled from 100. Normal swing/turn costs remain 20/s and 8/s; recovery remains 30/s after 0.5 seconds and fatigue starts below 25.
- The skill uses a separate **five-second timer**, including spin-up, with **no stamina cost or minimum-stamina gate**. Its spin/lift is independent of normal fatigue. A/D during the skill also costs no stamina, and ordinary stamina can recover while it runs.
- Tapping F starts the full timed activation; releasing does not cancel it, and pressing again during it cannot extend it. Holding F cannot auto-repeat. After timer expiry and ear retraction, release/repress to activate again. There is no additional cooldown in this prototype.
- Pause freezes the timer; rematch/menu reset it. Short taps between render frames are latched, while pause or lost focus clears pending, unprocessed input.

These are starting playtest values, not final balance. Impacts can reduce rotor speed and lift; normal contact-driven jumps can rise higher than the hover target.

## Physics and rendering

The active game uses the upright contact solver from the accepted baseline instead of the rejected articulated flip path. Normal movement still comes from powered ear strokes and contacts. For beagle + long ears, only the F skill supplies sustained hover thrust; ordinary ear-floor reactions still provide contact-driven rise.

`beaglePointFrame` composes anchored pitch, per-ear sideways spread, damped lag and whole-body heading. Its Jacobians include deployment and lag velocities. The same pose drives skinned GLB bones, capsule fallback geometry, hits, clashes, ground/rim queries and camera framing. Contact sampling includes changes in spread and lag so deployment does not teleport a hitbox between endpoints.

Both solid ears retain ordinary directional damage, shared repeat-hit gating, blocking and clash recoil. The low hover leaves the rotor able to meet an ordinary grounded opponent's head or a raised sword. The broad head's actual hurt shapes remain constrained by the arena boundary.

The old `beagle-dynamics.js` module is retained as historical experiment code; the production controller no longer imports it. Pose-conservation unit checks for that isolated experiment remain, while gameplay regressions now require upright movement and the new skill lifecycle.

## Verification

- Tests cover W/S+A/D movement, no normal rotor deployment, low hover, timer expiry/landing, zero-cost activation at zero stamina, hold/repress behavior, rotor reversal, independent F/Right Shift input, ordinary-weapon isolation, contact velocities, pair-level damage and sword clashes.
- Actual GLB vertex tests include partial/full ear spread and lag at varied swings/headings, with sockets and body transforms compared against contact geometry.
- Browser checking exercised F on the actual model and captured the deployed low hover with the timer running and stamina unchanged at 200/200. See [timed hover screenshot](screenshots/beagle-timed-hover.png).
- At the 19 October timed-hover checkpoint, `npm test` passed **100 tests, 0 failures** and `npm run build` passed with the existing bundle-size warning. The native rig import and historical functional-preview commands also pass. This source checkpoint includes the implementation, tests, motion previews, design history and reusable character-production skill; it is not a packaged app release.

The later cat integration checkpoint passed the full 132-test suite. Subsequent selection UI work ran 14 focused checks, then the full-window preparation pass ran 17 focused checks and the build; these were not new full-suite runs. Use the [latest preparation verification](selection-concepts/v04-preparation-stage/verification.json) and [project status](PROJECT_STATUS.md) for current evidence scope.
