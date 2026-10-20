# Standing orange tabby with giant paws — motion v02

Historical motion study, 19 October 2026. This v02 packet is superseded by the approved v06 controller/v07 movement review and the [local playable implementation](GAMEPLAY.md). The original review descriptions below are preserved as history.

19 October 2026. This revision implements the user’s requested design direction in a primitive motion study: huge attached hands, a permanently upright standing silhouette, and ordinary weapon use similar to the beagle. V01’s seated scoot is superseded. Orange-tabby identity remains selected; this is not a Tripo production mesh or a selectable game character.

## Current review videos

| Video / segment | Input/action | Evidence |
| --- | --- | --- |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:00.0–00:03.0 | W / front swing | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:03.0–00:06.0 | S / back swing | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:06.0–00:09.0 | A / left heading sweep | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:09.0–00:12.0 | D / right heading sweep | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:12.0–00:15.0 | W + A / front swing + steering | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:15.0–00:18.0 | W + D / front swing + steering | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:18.0–00:21.0 | S + A / back swing + steering | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:21.0–00:24.0 | S + D / back swing + steering | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:24.0–00:29.0 | Release, coast, brake, reverse | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:29.0–00:33.0 | Steering release and reversal | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:33.0–00:37.0 | Standing landing and recovery | Current game solver with isolated proxy adapter |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v02.mp4), 00:37.0–00:40.0 | Opposite keys cancel powered input | Current game solver with isolated proxy adapter |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v02.mp4), 00:00.0–00:03.0 | Vertical giant-paw hit / W | Current game solver with isolated proxy adapter |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v02.mp4), 00:03.0–00:06.0 | Horizontal giant-paw hit / D | Current game solver with isolated proxy adapter |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v02.mp4), 00:06.0–00:10.0 | Giant paw blocks sword / clash recoil | Current game solver with isolated proxy adapter |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v02.mp4), 00:10.0–00:12.5 | Same giant-paw swing / clear miss | Current game solver with isolated proxy adapter |
| [design](../../previews/orange-tabby/orange-tabby-design-v02.mp4), 00:00.0–00:04.0 | Standing cat / enormous attached paws | Authored design turntable |

Normal playback is 1×, 1280 × 720 at 24 fps. All movement/combat positions come from the current game solver at 180 Hz, sampled at 60 Hz, then rendered as a primitive. No normal input shot has an authored travel path or launch impulse. The landing fixture explicitly starts 0.70 units above the floor. The four-second turntable is authored and only presents shape/attachment.

## Requested change and motion interpretation

- Hind legs remain visible in a standing pose. The body never pitches or lies down. The current game’s upright constraint enforces this; it is not a balance/ragdoll simulation.
- Each white paw is roughly head width, scaled 2.5 / 2.3 / 2.7 from the former small blockout hand. Pink pads, four toes, small claws and striped orange wrists preserve the selected weapon reference.
- Paws share one synchronized W/S swing coordinate, with anatomically attached shoulder–elbow chains and an outboard swing plane. A/D steers the common heading. All four combinations are shown.
- Continuous swings can pass the down pose; paw-floor reactions lift/carry the cat while the body stays upright. Passive hind feet support rest/landing, with no walking thrust. Gravity can move released paws and produce passive contact motion.
- Release/reversal retains physical momentum and braking. Opposite inputs cancel powered axes without disabling gravity/contact.
- Giant paws use the normal damage/repeat-hit/shared stamina/clash rules. Actual contact events are marked briefly in the combat video. The horizontal-hit fixture has a dominant turning contribution; it is not presented as a special attack.
- No cat F skill, rotor, hover, flips, extra resource or global balance change is selected.

## Proxy solver evidence

The adapter adds the candidate profile, an anatomical contact frame, provisional standing hurt shapes and bounded common-heading rate feedback in memory. It does not edit production physics or replace the current accepted beagle. Ordinary stamina charges the effective user axes, not the feedback correction; W/S and A/D retain the current shared costs. The generic weapon inertia/gravity model remains a prototype approximation rather than a measured cat mass distribution.

| Scenario | X/Z travel | Max rise | Min stamina | Hits / clashes |
| --- | --- | --- | --- | --- |
| w | +2.674 / -0.553 | 0.620 | 157.1 | 0 / 0 |
| s | -2.617 / -0.493 | 0.620 | 157.1 | 0 / 0 |
| a | +2.404 / +0.264 | 0.375 | 182.8 | 0 / 0 |
| d | -0.465 / -0.607 | 0.595 | 182.8 | 0 / 0 |
| wa | +2.487 / -1.389 | 0.615 | 140.0 | 0 / 0 |
| wd | +2.053 / -0.057 | 0.625 | 140.0 | 0 / 0 |
| sa | -1.975 / -0.009 | 0.627 | 140.0 | 0 / 0 |
| sd | -2.462 / -1.336 | 0.615 | 140.0 | 0 / 0 |
| release-reverse | -0.104 / -1.965 | 0.622 | 144.0 | 0 / 0 |
| yaw-reverse | +0.588 / +0.549 | 0.375 | 181.6 | 0 / 0 |
| landing | +1.957 / +0.291 | 0.700 | 171.1 | 0 / 0 |
| opposites | +0.419 / +0.430 | 0.556 | 200.0 | 0 / 0 |
| vertical-hit | -1.848 / +0.523 | 0.976 | 180.1 | 1 / 0 |
| horizontal-hit | +0.134 / -0.607 | 0.595 | 192.0 | 1 / 0 |
| sword-clash | -1.127 / -1.099 | 0.623 | 176.1 | 0 / 1 |
| near-miss | +1.835 / -0.887 | 0.620 | 180.1 | 0 / 0 |

Contact velocity finite-difference error: 0.00000687. All recorded body pitch values are zero. W/S produces about 0.62 units of rise in separate fixtures; this is not a final jump target. Lateral drift and contact yaw deflection remain for tuning and hands-on review. Pure A/D may also travel because gravity and paw support remain active.

Upper/lower segment lengths stay within 2.9e-07 / 2.5e-07 units of 0.78 / 0.80. Paw/head lateral-envelope margin is 0.084; minimum arm/head enclosing-sphere gap is 0.0158. This validates the primitive construction only. The small arm margin must be rechecked against selected production geometry.

## Standing-cat reference question

Rocky is the real tabby in the classic Standing Cat meme, uploaded in 2009 and widely spread in 2010. He was filmed standing on his hind legs; “always standing” is not a literal real-life claim. [Internetmuseum’s history](https://internetmuseum.se/utstallningar/webbkatter/katter-pa-tva-ben/) is the verified source. This is a posture precedent only; the supplied orange cat remains our appearance identity.

## Next decision and remaining work

Huge hands and standing posture are already user-directed choices. The affected review concerns the exact new swing/steering/support/recovery motion and paw proportions. Do not ask the user to reselect seated versus standing. No motion acceptance, production mesh/rig acceptance, cat credit authorization or playable acceptance is inferred.

After motion review, refine unproven controller/clearance issues as needed, prepare the exact clean reconstruction packet and inspect current Tripo modes/charges. Generate the production base in Tripo only within approved spending scope, then Blender refinement, fitted contacts and actual-asset review. Integration and actual-game videos remain later stages.

## Delivery verification

The final 40-second controls, 12.5-second combat and four-second design files passed H.264/YUV420p, 1280 × 720, 24 fps, exact duration/frame count and full decoding checks. Twenty-three technical checks passed. All 37 pre-existing runtime/model/beagle files in the saved source baseline match their starting hashes; both supplied image hashes match. The in-app review page played the encoded turntable to its end, recorded in `docs/previews/orange-tabby/review-page-v02.png`. This is local blockout/proxy evidence, with motion acceptance, Tripo base, production rig and playable acceptance still pending.
