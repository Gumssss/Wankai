# Floating giant paws — v04 motion prototype

Historical motion study, 19 October 2026. This v04 packet is superseded by the approved v06 controller/v07 movement review and the [local playable implementation](GAMEPLAY.md). The original review descriptions below are preserved as history.

19 October 2026. User request: float the character/paws in the air so the detached hands feel less creepy, and show W/S/A/D using the beagle physical system as a reference. The user clarified that the giant paws, not the ears, drive motion. Original identity, hand size and the seated silhouette are retained.

[Try the keyboard preview](../../previews/orange-tabby/try-v04.html) · [Video review page](../../previews/orange-tabby/index.html).

## Current contract

The current active beagle controller in `src/physics.js` and `src/beagle-skill.js` supplies the reference: continuous finite W/S acceleration 24, reverse braking 30, angular speed 4.25, damping 1.15 and normal steering target 1.15 with feedback 0.70. Those values are copied only into the isolated cat adapter. Both paws share ordinary stamina, damage and repeat-hit rules.

A continuous low-hover proposal uses the beagle lift equation, with target body-base height 0.35, gain 25, damping 9 and thrust bounded between zero and gravity+12. The floating paws have gravity compensation. This is declared external support, not a claim that swinging in air alone generates levitation. No F ability or timer is added. W/S floor/contact reactions still cause translation and additional rise; A/D changes heading. Release preserves coasting rather than forcing a rest angle.

The rendered body has about 0.33 units of floor clearance at idle and the paw meshes about 1.01. Proxy clearance is about 1.15. No render-only floor correction is applied. Small ears remain decorative. Palm width remains 1.98 and both body/hand gaps remain visible.

The loaded GLB study, live page and Blender videos use the same physical transforms. It is an exported primitive review model, never the production base or an integrated loadout. The actual game source and beagle remain unchanged. Production still requires the reviewed Tripo route.

## Video coverage

All videos are 1280×720, H.264/YUV420p, 24 fps at normal speed. The four-second turntable is authored; the controls and combat are isolated current-game solver replays with the cat hover adapter.

| Video | Time | Action |
| --- | --- | --- |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 0.0–4.0s | Idle / paws floating beside the cat |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 4.0–7.0s | W / front swing |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 7.0–10.0s | S / back swing |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 10.0–13.0s | A / left heading sweep |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 13.0–16.0s | D / right heading sweep |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 16.0–19.0s | W + A / front swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 19.0–22.0s | W + D / front swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 22.0–25.0s | S + A / back swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 25.0–28.0s | S + D / back swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 28.0–33.0s | Release, coast, brake, reverse |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 33.0–37.0s | Steering release and reversal |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 37.0–41.0s | Hover recovery after a drop |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v04.mp4) | 41.0–44.0s | Opposite keys cancel powered input |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v04.mp4) | 0.0–3.0s | Vertical giant-paw hit / W |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v04.mp4) | 3.0–6.0s | Horizontal giant-paw hit / D |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v04.mp4) | 6.0–10.0s | Giant paw blocks sword / clash recoil |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v04.mp4) | 10.0–12.5s | Same giant-paw swing / clear miss |
| [design](../../previews/orange-tabby/orange-tabby-design-v04.mp4) | 0.0–4.0s | Floating cat / hovering giant paws |

## Measured prototype behavior

| Input | X / Z travel | Maximum body-base height |
| --- | --- | --- |
| hover-idle | +0.000 / +0.000 | 0.350 |
| w | +9.521 / -0.839 | 1.734 |
| s | -9.464 / -0.715 | 1.735 |
| a | +0.000 / +0.000 | 0.350 |
| d | +0.000 / +0.000 | 0.350 |
| wa | +6.747 / -7.296 | 1.633 |
| wd | +5.522 / +0.616 | 1.729 |
| sa | -5.295 / +0.640 | 1.731 |
| sd | -6.788 / -7.271 | 1.634 |
| release-reverse | +3.960 / -4.588 | 1.680 |
| yaw-reverse | +0.000 / +0.000 | 0.350 |
| landing | +7.004 / -0.763 | 1.679 |
| opposites | +0.000 / +0.000 | 0.350 |

Idle, A/D-only and opposite-input cancellation cause no translation. W/S contacts reach about 1.74 units of base height and move substantially faster than v03; these remain tuning candidates, not accepted balance. The external 0.70-unit drop tests recovery to the low hover, followed by resumed W drive. No jump button is proposed.

Vertical hit: first contact at 0.511s, pitch dominated. Horizontal hit: 0.950s, turning contribution 1.0. Sword clash: 0.528s, positive backward recoil. The distant miss causes no damage, and all combat fixtures start without weapon/hurt overlap. Proxy shapes remain approximate and do not establish final mesh coverage.

## Verification and review

Eight loader/control checks and 29 delivery checks passed. All 37 snapshotted runtime/beagle/model files were preserved. The saved loader report checks the actual exported GLB, retained orange/green identity colors, independent paw transforms through pitch/yaw, idle hover, signed controls, coasting and parity between the browser and video solver. The delivery report checks source preservation, references, input coverage, geometry, framing and full video decoding. Browser interaction checks cover keyboard steering/swinging, simultaneous input, release and Reset.

New hovering motion remains a review candidate. Actual production mesh/rig and playable-game integration are unset. No Tripo operation or spending was submitted.
