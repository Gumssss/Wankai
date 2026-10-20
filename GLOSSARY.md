# Wankai Game

Terms for the current local character/weapon prototype, reviewed 20 October 2026. The roster has eight valid loadouts across basic fighter, beagle and orange tabby. See the [README](README.md) for controls and the [project status](docs/PROJECT_STATUS.md) for delivery status and remaining work.

## Language

**Fighter**:
One of the contestants in a match. Fighters move through weapon contact rather than independent walking; the beagle's visible paws do not provide a walking controller. The orange tabby keeps a seated, upright body and uses detached giant paws. Only beagle + long ears has the separate timed low-hover skill. Solo mode has one fighter.

**Character / loadout**:
A character owns body appearance, dimensions and hurt shapes; its compatible equipment owns attack contacts and powered controls. A loadout is the validated `{ characterId, weaponId }` pair. Basic fighter supports three common weapons, beagle supports those three plus long ears, and orange tabby supports its giant paws: eight loadouts and 64 ordered two-player pairings.

**Weapon**:
A floating object, paired ears or paired paws used to push against the ground, strike, and block. Equipment shares the basic swing/steer inputs and contact-driven movement rule, while each profile defines reach, response and any approved controller or ability.

**Polearm**:
The first Tripo-generated curved-blade weapon, with the longest reach. The current local trial halves its original speed limit and adds solid collar/blade/tip proxies around the retained shaft capsule.

**Short sword**:
The first differentiated weapon prototype. It has shorter reach and faster swings, but no separate walking-speed bonus. Its direction while supporting the fighter is still under review.

**Iron war hammer**:
The third playable weapon. It has intermediate reach, slower response, greater inertia, and a broad solid head. Metal-head hits multiply common damage by 1.3; cloth is decorative.

**Armory**:
The dedicated full-window preparation page. P1 chooses character/equipment on the left and P2 on the right, each above its rotatable actual-model preview. Each player readies independently; the shared Start/save commits the drafts together. Editing a choice resets only that player's Ready state. Back/Escape discards drafts and returns to the menu. Solo configures P1 and preserves P2; practice also configures its passive dummy. Rematches retain committed choices.

**Weapon profile / effect**:
The gameplay behavior assigned to equipment: reach, inertia, swing response, collision surfaces and damage modifiers. The three common-weapon profiles differ in these properties; paired ears and paws have their approved controllers. Only long-ear equipment has the timed hover ability; further abilities require separate design and review.

**Weapon appearance**:
The visible 3D model of a weapon, stored locally as a GLB. The first polearm import changed appearance only. The sword and hammer also have distinct physics profiles; model geometry itself does not define collision.

**Contact proxy**:
The simplified physics shape used for hits, blocks, and support. The local trial uses three capsules for the sword shaft/guard, five for the polearm shaft/blade, and five for the hammer shaft/head. These approximate the solid model; decorations and visible edges can still differ.

**Stamina / exhaustion**:
A separate 200-point resource spent on weapon input, shared by a fighter's paired ears or paws. Rest restores it; below 25, powered control weakens, reaching 40% at zero. Reversal braking, passive motion, and collision remain active. Camera input and the beagle's timed hover skill are free.

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

The paired **比格犬·双耳** character/weapon loadout. Two long smooth ears rotate from measured head sockets and obey the shared weapon rules. W/S drives parallel ear strokes and A/D steers the upright body. Press F (P2 Right Shift) for a five-second horizontal spin and low hover, with no stamina cost; expiry retracts the ears and lands. Ordinary stamina is 200 for all loadouts. The earlier front/back flip controller is inactive.

The same beagle can instead equip a common sword, polearm or hammer. That variant keeps compact cosmetic ears and has no ear attack contacts or F ability.

## Orange tabby / giant paws

The **橘猫 · 猫爪** loadout uses the approved prepared-v02 model and v06 physical controls. W/S swings both detached giant paws, A/D steers, and all four combinations work. S/Down paw-floor support lifts the seated body from its low rest hover; release retains inertia and gravity returns it toward rest. Both paws share ordinary stamina and combat rules. There is no cat F/Right Shift ability. See the [gameplay handoff](docs/characters/orange-tabby/GAMEPLAY.md).
