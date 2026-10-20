# Seated cat and detached huge paws — motion v03

Historical motion study, 19 October 2026. This v03 packet is superseded by the approved v06 controller/v07 movement review and the [local playable implementation](GAMEPLAY.md). The original review descriptions below are preserved as history.

19 October 2026. The user explicitly requested seated gesture, disconnected hands and further enlargement. This replaces the standing/attached v02 direction. The exact model/motion packet is presented for review; no playable cat or production mesh is claimed.

[Open the review page](../../previews/orange-tabby/index.html). Videos are 1280 × 720, H.264/YUV420p, 24 fps at normal speed.

## Visual change

The compact body sits on low haunches with tucked hind feet and a curled tail. No upper arms, forearms, shoulders, wrists or cables connect the two enormous white paw weapons. The palm width is 1.98 versus 1.012 in v02 and 1.18 for the head. Outboard placement leaves a conservative 0.2815-unit lateral gap between hand and body envelopes. The original orange-tabby identity remains.

Primary gesture reference: [Orange Tabby Cat Sitting Down](https://commons.wikimedia.org/wiki/File:Orange_Tabby_Cat_Sitting_Down.jpg), Asabae2752, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Secondary: [frontal seated orange tabby](https://pixabay.com/photos/cat-sitting-orange-tabby-orange-1114726/), elljay, Pixabay Content License. Both unmodified previews were inspected and preserved with attribution and hashes in `motion-v03/pose-references.json`.

## Video coverage

| Video | Time | Action |
| --- | --- | --- |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 0.0–3.0s | W / front swing |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 3.0–6.0s | S / back swing |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 6.0–9.0s | A / left heading sweep |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 9.0–12.0s | D / right heading sweep |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 12.0–15.0s | W + A / front swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 15.0–18.0s | W + D / front swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 18.0–21.0s | S + A / back swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 21.0–24.0s | S + D / back swing + steering |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 24.0–29.0s | Release, coast, brake, reverse |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 29.0–33.0s | Steering release and reversal |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 33.0–37.0s | Seated landing and recovery |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v03.mp4) | 37.0–40.0s | Opposite keys cancel powered input |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v03.mp4) | 0.0–3.0s | Vertical giant-paw hit / W |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v03.mp4) | 3.0–6.0s | Horizontal giant-paw hit / D |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v03.mp4) | 6.0–10.0s | Giant paw blocks sword / clash recoil |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v03.mp4) | 10.0–12.5s | Same giant-paw swing / clear miss |
| [design](../../previews/orange-tabby/orange-tabby-design-v03.mp4) | 0.0–4.0s | Seated cat / enormous detached paws |

Controls and combat replay the current game solver through an isolated, in-memory prototype adapter. Production source is unchanged. The design turntable is authored. No video is actual game footage. W/S drives the common paw phase; A/D steers the common heading; invisible constraints carry floor/contact reactions to the seated body. No additional cat ability is selected.

## Measured behavior

| Input | X / Z travel | Maximum rise | Minimum stamina |
| --- | --- | --- | --- |
| w | +6.037 / -1.140 | 2.117 | 157.11 |
| s | -5.966 / -1.044 | 2.119 | 157.11 |
| a | +4.822 / -1.968 | 0.931 | 182.84 |
| d | +0.508 / -5.424 | 1.214 | 182.84 |
| wa | +6.420 / -3.511 | 2.099 | 139.96 |
| wd | +3.799 / -1.346 | 2.130 | 139.96 |
| sa | -3.658 / -1.304 | 2.132 | 139.96 |
| sd | -6.450 / -3.523 | 2.099 | 139.96 |
| release-reverse | -0.294 / -3.512 | 2.115 | 144.00 |
| yaw-reverse | -0.072 / -0.260 | 0.932 | 181.60 |
| landing | +3.345 / -0.144 | 1.809 | 171.11 |
| opposites | +1.076 / +0.247 | 1.700 | 200.00 |

The very large trial volumes produce about 2.12 units of W/S rise. A/D alone also encounters gravity-driven paw contacts, and canceled input still allows passive motion. Lateral drift and large bounce remain unresolved prototype behavior, not accepted locomotion. The body shape stays seated throughout; a 0.70-unit external drop fixture is a landing test, not a jump ability.

Vertical contact first occurs at 0.411s and is pitch dominated. The selected horizontal hit first occurs at 0.60s with turning share 0.855. The sword clash occurs at 0.35s with positive recoil. All combat fixtures begin without weapon/hurt overlap; the distant miss causes no damage. Both paws share the existing repeat-hit gate and input stamina cost. Contact-velocity finite-difference error is below 0.00001.

## Verification and next boundary

Twenty-six delivery checks passed, with all 37 snapshotted runtime/model/beagle files preserved. The saved verification report checks unchanged runtime/beagle assets and original references, attributed sitting-pose sources, input/motion evidence, shared resources, detached geometry, spacing, whole-shot framing, video format and complete decoding. These checks do not accept the prototype balance or final mesh contacts.

Review the v03 proportions and changed motion before production proportions are locked. The next production stages remain the exact clean Tripo input/spending packet, actual generated mesh review, Blender refinement and fitted contacts, followed by independent loadout integration and actual gameplay evidence. No Tripo operation has been submitted.
