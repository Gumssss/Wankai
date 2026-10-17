# Weapon control system

Reviewed against the source on 17 October 2026. These rules apply to the current `main` prototype; final control feel and balance still need playtesting. See the [project status](PROJECT_STATUS.md) for open work.

The [approved motion video](control-concept-combinations.mp4) shows the intended input rule, including continued motion after ground contact and simultaneous swing and horizontal steering. It is a concept animation; the game uses its own physics and camera rendering.

| Motion | Player 1 | Player 2 | Result |
| --- | --- | --- | --- |
| Swing toward the fighter's front | W | ↑ | Rotates the weapon forward in its vertical plane. From overhead, it descends in front. |
| Swing toward the fighter's back | S | ↓ | Rotates the weapon backward in the same plane. From overhead, it descends behind. |
| Turn weapon heading left | A | ← | Changes only the horizontal direction. |
| Turn weapon heading right | D | → | Changes only the horizontal direction. |

W or S can be held with A or D. Swinging does not stop at an up or down angle target; the weapon can continue past the floor-facing pose while ground contact pushes the fighter. Opposite swing inputs brake before reversing. Releasing keys removes motor input but preserves momentum under gravity, damping, and collision. Pressing both opposite keys on the same axis cancels that axis's input.

Both axes use the selected weapon's `motorAcceleration` and `maxAngularSpeed`. Pitch reversal uses its `brakeAcceleration`; yaw reversal uses `motorAcceleration`. Released motion uses damping rather than a separate release brake. These are motor settings: gravity and collision can affect actual angular velocity. The proposed fourth weapon would need independent yaw tuning; it is not implemented.

## Stamina and directional damage

Each fighter has 100 stamina, independent of health. Effective front/back input costs 20 points per simulation second, horizontal steering costs 8, and simultaneous inputs add their costs. Held input still costs stamina when blocked or braking. Opposite keys cancel their axis before charging; camera controls, passive motion, and collisions are free. After both weapon axes are released for 0.5 seconds, stamina recovers at 30 points per second. Continued input at zero prevents recovery.

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

Physics uses 180 Hz discrete overlap checks. Sword and polearm use straight contact segments, while the hammer uses five solid capsules. A diagnostic reported fast weapon-tip crossings missed between samples; smaller collision steps caught the contact. Swept collision detection and a proposed 30% speed cap are not implemented. Current motor settings remain unchanged.

Weapon clashes apply physical impulses; sufficiently fast clashes emit sound and particles. Body hits additionally trigger hit pause, damage numbers, a readout, and damage-based knockback. Stronger clash feedback remains a proposal. See [project status](PROJECT_STATUS.md) for the investigation and playtest priorities.

The previous fixed-target controller is retained at Git checkpoint `8cc6441`; the current continuous controller predates the armory checkpoint. Current controls need hands-on playtesting with all three weapons, especially while standing on the weapon and while turning and swinging together. The sword complaint remains open in [SWORD_TRIAL.md](SWORD_TRIAL.md).
