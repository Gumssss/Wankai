# Weapon control system

Reviewed against the source on 18 October 2026. These rules apply to the current `main` prototype; final control feel and balance still need playtesting. See the [project status](PROJECT_STATUS.md) for open work.

The [approved motion video](control-concept-combinations.mp4) shows the intended input rule, including continued motion after ground contact and simultaneous swing and horizontal steering. It is a concept animation; the game uses its own physics and camera rendering.

| Motion | Player 1 | Player 2 | Result |
| --- | --- | --- | --- |
| Swing toward the fighter's front | W | ↑ | Rotates the weapon forward in its vertical plane. From overhead, it descends in front. |
| Swing toward the fighter's back | S | ↓ | Rotates the weapon backward in the same plane. From overhead, it descends behind. |
| Turn weapon heading left | A | ← | Changes only the horizontal direction. |
| Turn weapon heading right | D | → | Changes only the horizontal direction. |

W or S can be held with A or D. Swinging does not stop at an up or down angle target; the weapon can continue past the floor-facing pose while ground contact pushes the fighter. Opposite swing inputs brake before reversing. Releasing keys removes motor input but preserves momentum under gravity, damping, and collision. Pressing both opposite keys on the same axis cancels that axis's input.

Floating weapons use the selected profile's `motorAcceleration` and `maxAngularSpeed` on both axes; the beagle's normal steering and rotor controller are described below. Pitch reversal uses its `brakeAcceleration`; yaw reversal uses `motorAcceleration`. Released motion uses damping rather than a separate release brake. The approved half-speed trial retains acceleration/braking and clamps each axis to the new limit both before angle integration and after collision response. The proposed fourth weapon would need independent yaw tuning; it is not implemented.

| Weapon | Previous axis limit | Local trial limit | Ideal full rotation at trial limit |
| --- | ---: | ---: | ---: |
| Sword | 12.2 rad/s | 6.1 rad/s | 1.03 s |
| Polearm | 8.5 rad/s | 4.25 rad/s | 1.48 s |
| Hammer | 6.8 rad/s | 3.4 rad/s | 1.85 s |

These times exclude acceleration, damping, fatigue, gravity, and contacts. Weapon size, model normalization, reach, damage formula, and stamina rules retain their settings. Slower motion can change impact damage and ground-driven travel, so this remains a playtest trial.

## Stamina and directional damage

Each fighter has 200 stamina, independent of health. Effective front/back input costs 20 points per simulation second, horizontal steering costs 8, and simultaneous inputs add their costs. Held input still costs stamina when blocked or braking. Opposite keys cancel their axis before charging; camera controls, passive motion, and collisions are free. After both weapon axes are released for 0.5 seconds, stamina recovers at 30 points per second. Continued input at zero prevents recovery.

Below 25 stamina, powered acceleration and the driven speed target decrease linearly toward 40% of each weapon's normal values at zero. Existing reverse braking strength is preserved. When driving in the current direction above the tired speed target, the motor brakes progressively using that weapon's braking acceleration; releasing input retains normal coasting. Gravity, ground support, and collision impulses continue to act. These rules apply to all weapons and modes. Countdown, pause, hit pause, and results freeze stamina with physics; rematches reset it.

At equal closing speed, acceleration, and contact surface, a pure yaw/turning hit has a 0.5 damage multiplier and a pure pitch/vertical swing retains full damage. Mixed hits blend the multiplier using the positive closing contributions of yaw, pitch, and relative body translation at the actual contact point. Body translation is neutral; motion tangential to the contact does not affect the blend. This uses pre-impact motion rather than held keys, so coasting turns remain weaker. The multiplier composes with the hammer head bonus and is rounded once after the base integer damage. Collision and blocking impulses retain their physical calculation; damage-related feedback and the additional hit knockback follow the final damage.

The HUD shows a separate numeric stamina bar, with text for low stamina and exhaustion. Tuning lives in `STAMINA` and `CONFIG.turnDamageScale` in `src/physics.js`. Automated coverage is in `tests/combat-stamina.test.js`; final pacing and exhausted movement still need hands-on acceptance.

## Camera behavior

| Mode | Session ID | View and camera control | Arena radius |
| --- | --- | --- | ---: |
| Split-screen duel | `duel` | Two independent rear views; P1 Q / E, P2 period / slash; release keeps angle | 19.35 |
| Fixed-camera duel | `duel-fixed` | One elevated shared view; no orbit input | 6.45 |
| Dummy practice | `practice` | Shared arena camera; P2 is idle | 6.45 |
| Solo free view | `solo` | One fighter; left mouse drag and wheel; idle orbit return | 19.35 |

Each fighter starts facing the opponent. The polearm begins raised to avoid initial weapon overlap, while the sword begins level. Horizontal weapon heading and the visible fighter face turn together. Each split-screen camera starts behind its fighter with a small 15° sideways offset and smooth weapon composition; A / D and the arrow keys do not orbit the view. P1 holds Q / E to turn their own camera left / right. P2 holds period / slash (the ? key, without Shift) for the same camera actions. Releasing keeps the selected angle, and rematching resets both views. Opposite camera keys cancel, and pausing or losing focus clears held camera input. Weapon inputs still work simultaneously.

The duel camera has no mouse controls. Bindings use `KeyboardEvent.code`: `KeyQ`, `KeyE`, `Period`, and `Slash`; the slash key does not require Shift, and printed labels can vary with keyboard layout. Solo retains mouse orbit, idle return after 1.5 seconds, and wheel zoom bounded to 3.8–10 units. Its baseline pitch is 0.52 radians, distance 6.2, and heading offset 90°. Only mouse orbit offsets recenter; keyboard duel angles stay selected. The physics simulation and its collision segments determine movement and hits, so the animation is a design reference rather than a scripted path.

The menu also offers a fixed-camera two-player duel: both players share the original elevated camera, which stays over the arena instead of following their facing. All weapon inputs and gameplay rules are the same as in the split-screen duel.

In split-screen, each camera stays anchored to its own fighter's position while weapon-relative framing eases smoothly. Both views retain the solo camera's 55° field of view, with the approved rear-view framing: a shallow 0.35-radian baseline orbit pitch, a 15° heading offset, and a 10.5-unit default distance. The far arena rim is visible at the start while the fighter stays readable. Both keyboard camera directions were reversed following hands-on feedback. A framing check keeps the fighter's body, head, and label anchor inside a safe area of their pane, immediately pulling back when needed and returning gradually. The focus-height limit follows the fighter vertically during jumps. This protects the player's own fighter; it does not guarantee the opponent or entire weapon is always visible. Each pane has a direction indicator relative to its own camera. One match advances once before both views render. Split-screen uses the same three-times-radius arena as solo (19.35 units); its visual floor, physical boundary, rim contacts, and lighting cover the larger arena. Starting marks stay aligned with the fighters. Fixed-camera duel and practice keep the original arena.

Camera constants and fitting live in `src/free-camera.js`, input bindings and single-session stepping in `src/game-session.js`, and viewport rendering in `src/ArenaCanvas.jsx`. The listed pitch values are orbit settings; camera height also includes a 1.2-unit offset and the look-at point follows the weapon. They are not exact downward viewing angles.

## Contact and feedback limits

The local trial keeps 180 Hz motor, stamina, gravity, and ground integration, but checks weapon clashes and body hits along the motion between consecutive poses. A movement bound using translation, angular travel, and the thinnest capsule sets the number of samples, up to 64 intervals per contact query. The first sampled overlap is refined six times; impulses use its incoming pose and contact derivatives. Heading interpolation takes the short path through angle wrap. Contact events are delivered once through the existing session loop.

This catches the reproduced crossing even when both endpoint poses are separated, without adding collision radius. It is bounded pose sampling, not an analytic continuous collision solver: very shallow grazing contacts, extreme motion beyond the sample budget, and the capsule approximations remain limitations. A 30% speed cap and an extra weapon-block allowance have not been applied.

The sword retains its original shaft capsule and adds two measured crossguard capsules. The polearm retains its shaft and adds four collar/blade/tip/barb capsules. The hammer retains its five existing solid capsules. All solid endpoints participate in ground/rim contacts; model scale and reach are unchanged. The sword's flame wisps and hammer cloth do not receive extra proxies. These remain rounded approximations and can overestimate local thickness.

Measurements reproduce the renderer's source-AABB normalization and butt/axis transform. The additions improve measured sword vertex coverage from 94.18% to 99.08%, and polearm from 94.41% to 100%; vertex-weighted coverage does not prove exact collision geometry or final balance. `tests/contact-motion.test.js` covers positive crossings, nearby misses, added solid hits/blocks, heading wrap, limits, and ground support. The original sword support-direction complaint still needs hands-on acceptance.

Weapon clashes apply physical impulses. Clear impacts also make both fighters recoil backward opposite `fighterHeading(player)`, using their current weapon/fighter azimuth plus facing offset. The camera does not determine this direction. Recoil gives each fighter at least 1.8–3.2 m/s of backward velocity according to impact speed, cancelling forward velocity as needed while preserving sideways/vertical motion and any faster existing backward motion. Normal friction, collisions, and arena boundaries then act on that motion.

`CLASH` in `src/physics.js` sets an impact threshold above 2.5 m/s, full recoil at 12 m/s, a 0.18-second event cooldown, and 0.05 seconds of weapon separation before rearming. A gentle touch or sustained overlap therefore does not repeatedly apply the extra recoil. Rematches reset these gates. Recoil itself adds no damage or stamina charge; existing weapon deflection and half-speed limits remain.

The same clear impact emits the existing sound/particles. Body hits additionally trigger hit pause, damage numbers, a readout, and damage-based knockback. Extra clash pause/readout remains a proposal. `tests/clash-recoil.test.js` checks both heading directions, momentum components, gentle/sustained contacts, separation/cooldown, arena bounds, and rematch reset. Recoil strength still needs hands-on acceptance.

The previous fixed-target controller is retained at Git checkpoint `8cc6441`; the current continuous controller predates the armory checkpoint. Current controls need hands-on playtesting with all four loadouts, especially while standing on the weapon and while turning and swinging together. The sword complaint remains open in [SWORD_TRIAL.md](SWORD_TRIAL.md).

## Beagle parallel ears and hover skill — 19 October 2026

The active beagle controller keeps the body upright. W/S powers parallel-ear strokes; A/D uses a slower 1.15 rad/s steering target with finite motor assistance. Both axes combine as in the normal-controls video. The rejected flip controller is inactive.

Press **F** (P2 **Right Shift**) to activate a separate **five-second** skill: settle the ears horizontally, spread them, spin the body and ears together and rise into a low hover. A/D can reverse the rotor; W/S strokes pause during deployment/retraction. Releasing F does not cancel it; timer expiry removes lift and retracts the ears. The hover height is 0.35 world units above the floor, with bounded thrust ramping with rotor readiness. The skill and its A/D steering cost **no stamina**, work at zero stamina and do not weaken with fatigue; ordinary stamina may recover during it. Repeated presses cannot extend it, and holding cannot auto-repeat. A new activation requires an edge after retraction. Pause freezes the timer, and rematch resets it. Other loadouts ignore skill keys.

The measured sockets and all eighteen solid ear capsules follow the same pitch/spread/lag/heading frame as the actual GLB and fallback. Swept contacts include deployment motion. The ordinary hit, block, directional damage, repeat-hit and clash recoil rules remain. See [current skill handoff](BEAGLE_SPIN_SKILL.md) for tuning and checks; the older flip and motion-study files are historical.
