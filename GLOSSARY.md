# Wankai Game

Terms for the current three-weapon plus beagle prototype, reviewed 18 October 2026. See the [README](README.md) for controls and the [project status](docs/PROJECT_STATUS.md) for remaining work.

## Language

**Fighter**:
One of the upright contestants in a match. Fighters have no feet and move by using their weapons against the ground. Solo mode has only one fighter.

**Weapon**:
A floating object used to push against the ground, strike, and block. Every weapon follows the same basic control and contact-driven movement system, but a weapon profile can change reach and response.

**Polearm**:
The first Tripo-generated curved-blade weapon, with the longest reach. The current local trial halves its original speed limit and adds solid collar/blade/tip proxies around the retained shaft capsule.

**Short sword**:
The first differentiated weapon prototype. It has shorter reach and faster swings, but no separate walking-speed bonus. Its direction while supporting the fighter is still under review.

**Iron war hammer**:
The third playable weapon. It has intermediate reach, slower response, greater inertia, and a broad solid head. Metal-head hits multiply common damage by 1.3; cloth is decorative.

**Armory**:
The model gallery and pre-match weapon selector. Both players choose independently, may choose the same weapon, and keep their choices on rematch. Solo uses P1's choice.

**Weapon profile / effect**:
The gameplay behavior assigned to a weapon: reach, inertia, swing response, collision surfaces, and damage modifiers. The three current profiles differ in these properties; further special abilities remain undesigned.

**Weapon appearance**:
The visible 3D model of a weapon, stored locally as a GLB. The first polearm import changed appearance only. The sword and hammer also have distinct physics profiles; model geometry itself does not define collision.

**Contact proxy**:
The simplified physics shape used for hits, blocks, and support. The local trial uses three capsules for the sword shaft/guard, five for the polearm shaft/blade, and five for the hammer shaft/head. These approximate the solid model; decorations and visible edges can still differ.

**Stamina / exhaustion**:
A separate 100-point resource spent on weapon input. Rest restores it; below 25, powered control weakens, reaching 40% at zero. Reversal braking, passive motion, and collision remain active. Camera input is free.

**Directional damage**:
At equivalent impact conditions, pure horizontal-turn hits deal half the vertical-swing damage. Mixed hits weight the actual incoming turn, swing, and body motion, including coasting after release.

**Match**:
A local fight between two players that ends when a fighter's health reaches zero.

**Weapon clash / block**:
A physical weapon-to-weapon collision. Clear impacts produce sound/particles and make each fighter recoil opposite their own current facing. Gentle or sustained contact cannot repeatedly trigger recoil; the weapons must separate before another impact. Hit pause and damage readouts apply to body hits. The local trial samples motion between physics poses; finite sampling can still miss grazing contacts.

**Practice mode**:
A session against a non-attacking target that recovers health after it is no longer being hit.

**Solo view**:
One-fighter exploration mode with a larger arena, mouse-controlled camera, and a weapon-heading cue.

**Shared view**:
The full-width elevated camera used by fixed-camera duel and practice. These modes use the original 6.45-unit arena radius.

**Player view**:
A camera following one fighter. Split-screen duel already shows two such views side by side in one Electron window, rendering one simulation. Q / E turns P1's camera; period / slash turns P2's; release keeps the angle.

**Expanded arena**:
The 19.35-unit-radius arena used by split-screen duel and solo: three times the original radius. Its rendered rim and physical boundary match; leaving the arena is not a victory condition.

**Precision weapon**:
The deferred fourth weapon concept with slower horizontal steering and quick response. Its staff appearance and export purchase remain unapproved; it is not in the playable roster. See the [side-project record](docs/PRECISION_WEAPON.md).

## Beagle / twin ears

The paired **比格犬·双耳** character/weapon loadout. Two long smooth ears rotate from measured head sockets and obey the shared weapon rules. The body currently stays upright; full-body backflips/front flips remain unfinished. `body_pitch` is an available rig control, not yet a physical gameplay state.
