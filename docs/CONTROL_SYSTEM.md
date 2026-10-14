# Weapon control system

The [approved motion video](control-concept-combinations.mp4) shows the intended input rule, including continued motion after ground contact and simultaneous swing and horizontal steering. It is a concept animation; the game uses its own physics and camera rendering.

| Motion | Player 1 | Player 2 | Result |
| --- | --- | --- | --- |
| Swing toward the fighter's front | W | ↑ | Rotates the weapon forward in its vertical plane. From overhead, it descends in front. |
| Swing toward the fighter's back | S | ↓ | Rotates the weapon backward in the same plane. From overhead, it descends behind. |
| Turn weapon heading left | A | ← | Changes only the horizontal direction. |
| Turn weapon heading right | D | → | Changes only the horizontal direction. |

W or S can be held with A or D. Swinging does not stop at an up or down angle target; the weapon can continue past the floor-facing pose while ground contact pushes the fighter. Opposite swing inputs brake before reversing. Releasing keys removes motor input but preserves momentum under gravity, damping, and collision. Pressing both opposite keys on the same axis cancels that axis's input.

Each fighter starts facing the opponent. The polearm begins raised to avoid initial weapon overlap, while the sword begins level. Horizontal weapon heading, fighter face, and each player's duel camera turn together; the camera follows changes in weapon height without pitching up or down. Solo mode still allows mouse orbit and zoom. The physics simulation and its collision segments determine actual movement and hits, so the animation is a design reference rather than a promise of a scripted path.

The previous fixed up/down target controller is available in the earlier local Git checkpoint. The new rule needs hands-on playtesting with the short sword and polearm, especially while standing on the weapon and while turning and swinging together.
