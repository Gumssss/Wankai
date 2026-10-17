# Weapon control system

The [approved motion video](control-concept-combinations.mp4) shows the intended input rule, including continued motion after ground contact and simultaneous swing and horizontal steering. It is a concept animation; the game uses its own physics and camera rendering.

| Motion | Player 1 | Player 2 | Result |
| --- | --- | --- | --- |
| Swing toward the fighter's front | W | ↑ | Rotates the weapon forward in its vertical plane. From overhead, it descends in front. |
| Swing toward the fighter's back | S | ↓ | Rotates the weapon backward in the same plane. From overhead, it descends behind. |
| Turn weapon heading left | A | ← | Changes only the horizontal direction. |
| Turn weapon heading right | D | → | Changes only the horizontal direction. |

W or S can be held with A or D. Swinging does not stop at an up or down angle target; the weapon can continue past the floor-facing pose while ground contact pushes the fighter. Opposite swing inputs brake before reversing. Releasing keys removes motor input but preserves momentum under gravity, damping, and collision. Pressing both opposite keys on the same axis cancels that axis's input.

## Stamina and directional damage

Each fighter has 100 stamina, independent of health. Effective front/back input costs 20 points per simulation second, horizontal steering costs 8, and simultaneous inputs add their costs. Held input still costs stamina when blocked or braking. Opposite keys cancel their axis before charging; camera controls, passive motion, and collisions are free. After both weapon axes are released for 0.5 seconds, stamina recovers at 30 points per second. Continued input at zero prevents recovery.

Below 25 stamina, powered acceleration and the driven speed target decrease linearly toward 40% of each weapon's normal values at zero. Existing reverse braking strength is preserved. When driving in the current direction above the tired speed target, the motor brakes progressively using that weapon's braking acceleration; releasing input retains normal coasting. Gravity, ground support, and collision impulses continue to act. These rules apply to all weapons and modes. Countdown, pause, hit pause, and results freeze stamina with physics; rematches reset it.

At equal closing speed, acceleration, and contact surface, a pure yaw/turning hit has a 0.5 damage multiplier and a pure pitch/vertical swing retains full damage. Mixed hits blend the multiplier using the positive closing contributions of yaw, pitch, and relative body translation at the actual contact point. Body translation is neutral; motion tangential to the contact does not affect the blend. This uses pre-impact motion rather than held keys, so coasting turns remain weaker. The multiplier composes with the hammer head bonus and is rounded once after the base integer damage. Collision and blocking impulses retain their physical calculation; damage-related feedback and the additional hit knockback follow the final damage.

The HUD shows a separate numeric stamina bar, with text for low stamina and exhaustion. Tuning lives in `STAMINA` and `CONFIG.turnDamageScale` in `src/physics.js`. Automated coverage is in `tests/combat-stamina.test.js`; final pacing and exhausted movement still need hands-on acceptance.

## Camera behavior

Each fighter starts facing the opponent. The polearm begins raised to avoid initial weapon overlap, while the sword begins level. Horizontal weapon heading and the visible fighter face turn together. Each split-screen camera starts behind its fighter with a small 15° sideways offset and smooth weapon composition; A / D and the arrow keys do not orbit the view. P1 holds Q / E to turn their own camera left / right. P2 holds period / slash (the ? key, without Shift) for the same camera actions. Releasing keeps the selected angle, and rematching resets both views. Opposite camera keys cancel, and pausing or losing focus clears held camera input. Weapon inputs still work simultaneously.

The duel camera has no mouse controls. Solo mode retains its mouse orbit, idle return, and wheel zoom. The physics simulation and its collision segments determine movement and hits, so the animation is a design reference rather than a promise of a scripted path.

The menu also offers a fixed-camera two-player duel: both players share the original elevated camera, which stays over the arena instead of following their facing. All weapon inputs and gameplay rules are the same as in the split-screen duel.

In split-screen, each camera stays anchored to its own fighter's position while weapon-relative framing eases smoothly. Both views retain the solo camera's 55° field of view, with the approved rear-view framing: a shallow 0.35-radian baseline orbit pitch, a 15° heading offset, and a 10.5-unit default distance. The far arena rim is visible at the start while the fighter stays readable. Both keyboard camera directions were reversed following hands-on feedback. A framing check keeps the fighter's body, head, and label anchor inside a safe area of their pane, immediately pulling back when needed and returning gradually. The focus-height limit follows the fighter vertically during jumps. This protects the player's own fighter; it does not guarantee the opponent or entire weapon is always visible. Each pane has a direction indicator relative to its own camera. One match advances once before both views render. Split-screen uses the same three-times-radius arena as solo (19.35 units); its visual floor, physical boundary, rim contacts, and lighting cover the larger arena. Starting marks stay aligned with the fighters. Fixed-camera duel and practice keep the original arena.

The previous fixed up/down target controller is available in the earlier local Git checkpoint. The new rule needs hands-on playtesting with the short sword and polearm, especially while standing on the weapon and while turning and swinging together.
