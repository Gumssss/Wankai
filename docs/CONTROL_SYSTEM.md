# Weapon control system

Reviewed against local source and existing verification records on 20 October 2026. Character/weapon separation, orange tabby + giant paws, and the full-window preparation page are local and not yet pushed/merged; the earlier timed-hover baseline is merged in main. This documentation review does not rerun gameplay tests. These rules apply to the prototype; final control feel and balance still need playtesting. See the [project status](PROJECT_STATUS.md) for open work.

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
| Fixed-camera duel | `duel-fixed` | One shared lower/closer v09 perspective view; pair starts 45° anticlockwise; no orbit input | 19.35 |
| Dummy practice | `practice` | Shared arena camera; P2 is idle | 6.45 |
| Solo free view | `solo` | One fighter; left mouse drag and wheel; idle orbit return | 19.35 |

Each fighter starts facing the opponent. The polearm begins raised to avoid initial weapon overlap, while the sword begins level. Horizontal weapon heading and the visible fighter face turn together. Each split-screen camera starts behind its fighter with a small 15° sideways offset and smooth weapon composition; A / D and the arrow keys do not orbit the view. P1 holds Q / E to turn their own camera left / right. P2 holds period / slash (the ? key, without Shift) for the same camera actions. Releasing keeps the selected angle, and rematching resets both views. Opposite camera keys cancel, and pausing or losing focus clears held camera input. Weapon inputs still work simultaneously.

The duel camera has no mouse controls. Bindings use `KeyboardEvent.code`: `KeyQ`, `KeyE`, `Period`, and `Slash`; the slash key does not require Shift, and printed labels can vary with keyboard layout. Solo retains mouse orbit, idle return after 1.5 seconds, and wheel zoom bounded to 3.8–10 units. Its baseline pitch is 0.52 radians, distance 6.2, and heading offset 90°. Only mouse orbit offsets recenter; keyboard duel angles stay selected. The physics simulation and its collision segments determine movement and hits, so the animation is a design reference rather than a scripted path.

The fixed-camera duel uses the approved camera-study v09 view: perspective FOV 55°, position [22.802009683082648, 12, 9.77228986417828], looking at [0, 1.4, 0]. The camera is lower and closer than the previous implemented v05 and retains its azimuth. It stays in place during play and impacts, with no player-follow or orbit input. The pair’s complete rendered actors/effects rotate together 45° anticlockwise about world Y, viewed from overhead with north at -Z; HUD projection and camera cutaway ray targets use that display frame too. This preserves mutual facing and weapon/body alignment while leaving physics positions, headings, velocities and solver identical to split-screen. The view survives rematches and applies only to fixed duel; the arena model itself does not rotate. Its arena matches split-screen: uniform scale 3, playable radius 19.35 and low rim height 2.52. Weapon inputs, controllers and combat rules retain their settings. The tighter static frame can crop fighters/weapons near the foreground and side rim, including during high rises; full-boundary visibility is not guaranteed. Perspective/orthographic mode changes remount the canvas, and resize preserves the selected pose while updating the projection. All 155 tests pass, production build passes with its existing chunk-size advisory, and diff check passes. Normal-game Chrome review verified both players’ swing/turn inputs and rematch; Chrome and the open in-app game tab show the implemented fixed view without console errors.

In split-screen, each camera stays anchored to its own fighter's position while weapon-relative framing eases smoothly. Both views retain the solo camera's 55° field of view, with the closer preview approved on 21 October: a 21-unit default distance, a 15° heading offset, and baseline orbit pitch `asin(sin(0.35) * 10.5 / 21)` (approximately 0.17230016 radians). This is 12.5% closer than the preceding 24-unit view while preserving the original baseline eye height exactly: 4.80042698 units above the fighter, including the 1.2-unit camera offset. It supersedes both the 24-unit lower trial and the rejected 0.68-pitch raised view. Foreground cutaways also clear camera-containing wall sectors, since front-sided ray tests alone can miss enclosing stonework. The far arena rim is visible at the start while the fighter stays readable. Both keyboard camera directions were reversed following hands-on feedback. A framing check keeps the fighter's body, head, and label anchor inside a safe area of their pane, immediately pulling back when needed and returning gradually. The focus-height limit follows the fighter vertically during jumps. This protects the player's own fighter; it does not guarantee the opponent or entire weapon is always visible. Each pane has a direction indicator relative to its own camera. One match advances once before both views render. Split-screen uses the same three-times-radius arena as solo and fixed-camera duel (19.35 units); its visual floor, physical boundary, rim contacts, and lighting cover the larger arena. Starting marks stay aligned with the fighters. Practice keeps the original arena.

Free-camera constants and fitting live in `src/free-camera.js`, approved shared-camera settings in `src/fixed-camera.js`, input bindings and single-session stepping in `src/game-session.js`, and viewport rendering in `src/ArenaCanvas.jsx`. The listed pitch values are orbit settings; camera height also includes a 1.2-unit offset and the look-at point follows the weapon. They are not exact downward viewing angles.

## Contact and feedback limits

The local trial keeps 180 Hz motor, stamina, gravity, and ground integration, but checks weapon clashes and body hits along the motion between consecutive poses. A movement bound using translation, angular travel, and the thinnest capsule sets the number of samples, up to 64 intervals per contact query. The first sampled overlap is refined six times; impulses use its incoming pose and contact derivatives. Heading interpolation takes the short path through angle wrap. Contact events are delivered once through the existing session loop.

This catches the reproduced crossing even when both endpoint poses are separated, without adding collision radius. It is bounded pose sampling, not an analytic continuous collision solver: very shallow grazing contacts, extreme motion beyond the sample budget, and the capsule approximations remain limitations. A 30% speed cap and an extra weapon-block allowance have not been applied.

The sword retains its original shaft capsule and adds two measured crossguard capsules. The polearm retains its shaft and adds four collar/blade/tip/barb capsules. The hammer retains its five existing solid capsules. All solid endpoints participate in ground/rim contacts; model scale and reach are unchanged. The sword's flame wisps and hammer cloth do not receive extra proxies. These remain rounded approximations and can overestimate local thickness.

Measurements reproduce the renderer's source-AABB normalization and butt/axis transform. The additions improve measured sword vertex coverage from 94.18% to 99.08%, and polearm from 94.41% to 100%; vertex-weighted coverage does not prove exact collision geometry or final balance. `tests/contact-motion.test.js` covers positive crossings, nearby misses, added solid hits/blocks, heading wrap, limits, and ground support. The original sword support-direction complaint still needs hands-on acceptance.

Weapon clashes apply physical impulses. Clear impacts also make both fighters recoil backward opposite `fighterHeading(player)`, using their current weapon/fighter azimuth plus facing offset. The camera does not determine this direction. Recoil gives each fighter at least 1.8–3.2 m/s of backward velocity according to impact speed, cancelling forward velocity as needed while preserving sideways/vertical motion and any faster existing backward motion. Normal friction, collisions, and arena boundaries then act on that motion.

`CLASH` in `src/physics.js` sets an impact threshold above 2.5 m/s, full recoil at 12 m/s, a 0.18-second event cooldown, and 0.05 seconds of weapon separation before rearming. A gentle touch or sustained overlap therefore does not repeatedly apply the extra recoil. Rematches reset these gates. Recoil itself adds no damage or stamina charge; existing weapon deflection and half-speed limits remain.

The same clear impact emits the existing sound/particles. Body hits additionally trigger hit pause, damage numbers, a readout, and damage-based knockback. Extra clash pause/readout remains a proposal. `tests/clash-recoil.test.js` checks both heading directions, momentum components, gentle/sustained contacts, separation/cooldown, arena bounds, and rematch reset. Recoil strength still needs hands-on acceptance.

The previous fixed-target controller is retained at Git checkpoint `8cc6441`; the current continuous controller predates the armory checkpoint. Current controls need hands-on playtesting with all eight valid character/weapon loadouts, especially while supported by the weapon and while turning and swinging together. The sword complaint remains open in [SWORD_TRIAL.md](SWORD_TRIAL.md).

## Character and equipment selection

The live selector is a dedicated full-window **出战准备** page. P1 is on the left, P2 on the right; each player's character/weapon choices are above their own rotatable actual-model preview. Each player presses Ready independently, then the shared Start/save commits both drafts together. Ready alone does not commit or start. Editing a choice cancels only that player's readiness; reselecting the same choice retains it. Back or Escape returns to the menu and discards drafts; rematch retains committed choices. Solo shows/configures P1 while preserving hidden P2's committed selection; practice also configures its passive dummy. Narrow screens stack complete P1/P2 panels with vertical scrolling.

Basic fighter supports sword/polearm/hammer; beagle supports those and long ears; orange tabby supports its paired giant paws: eight valid loadouts and 64 ordered pairings. Defaults remain basic fighter + sword versus basic fighter + polearm. Player colours are independent of character. The preparation screen hides the mounted arena/HUD, clears held game inputs on entry, focuses its heading and restores the launching menu control on return. Hidden/invalid arena dimensions preserve the last valid camera projection until the arena is visible again. [Current screenshot](screenshots/preparation-stage-v04.jpg) and [screen verification](selection-concepts/v04-preparation-stage/verification.json).

Beagle with ordinary equipment uses rigid natural cosmetic ears: they follow the upright body and provide no attacks, blocks or powered support. The floating weapon keeps its original W/S+A/D motor controls and ground-driven travel. Character hurt shapes/boundaries remain beagle-sized. F/Right Shift is ignored for ordinary equipment. See [selection implementation](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md) and [chaptered gameplay videos](previews/character-weapon-motion/index.html).

## Beagle parallel ears and hover skill — 19 October 2026

The active **beagle + long ears** controller keeps the body upright. W/S powers parallel-ear strokes; A/D uses a slower 1.15 rad/s steering target with finite motor assistance. Both axes combine as in the normal-controls video. The rejected flip controller is inactive.

Press **F** (P2 **Right Shift**) to activate a separate **five-second** skill: settle the ears horizontally, spread them, spin the body and ears together and rise into a low hover. A/D can reverse the rotor; W/S strokes pause during deployment/retraction. Releasing F does not cancel it; timer expiry removes lift and retracts the ears. The hover height is 0.35 world units above the floor, with bounded thrust ramping with rotor readiness. The skill and its A/D steering cost **no stamina**, work at zero stamina and do not weaken with fatigue; ordinary stamina may recover during it. Repeated presses cannot extend it, and holding cannot auto-repeat. A new activation requires an edge after retraction. Pause freezes the timer, and rematch resets it. Other loadouts ignore skill keys.

The measured sockets and all eighteen solid ear capsules follow the same pitch/spread/lag/heading frame as the actual GLB and fallback. Swept contacts include deployment motion. The ordinary hit, block, directional damage, repeat-hit and clash recoil rules remain. See [current skill handoff](BEAGLE_SPIN_SKILL.md) for tuning and checks; the older flip and motion-study files are historical.

## Orange tabby giant paws — 20 October 2026

Choose 橘猫 → 猫爪. P1 W/S and P2 Up/Down continuously swing both detached paws; A/D and Left/Right steer the common heading. W+A, W+D, S+A and S+D combine both axes. S/Down paw-floor support visibly lifts the seated cat above its low resting hover; release preserves momentum, followed by descent and recovery. The pair shares the existing 200 stamina budget, hit gates and clash/recoil rules. F/Right Shift is ignored for this loadout. Reset/rematch restores the accepted neutral phase, low hover, resources and inputs. See [cat gameplay handoff](characters/orange-tabby/GAMEPLAY.md) for the exact model/controller and before/after evidence.

## Colosseum environment — 20 October 2026

The selected local model uses a level floor at Y=0 and the existing circular body limit: radius 6.45 in practice, 19.35 in solo/split/fixed duel. The whole building scales uniformly, so its low podium blocks weapon contact below 0.84 / 2.52 respectively. This replaces the prior 0.48 primitive rim cutoff; elevated weapons can pass above it. Stands and upper arches remain decorative and inaccessible, and entrance openings do not permit leaving the gameplay circle. Foreground wall sectors are cut away separately for each rendered camera; controls, resources and combat rules otherwise remain unchanged. See [environment handoff](environments/colosseum/HANDOFF.md).
