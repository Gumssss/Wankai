# Orange tabby: functional paw lift v06

**Subsequent decision, 20 October 2026:** this corrected lift was accepted, and complete presentation v07 was approved for integration. The matching controller is now playable locally. See [current gameplay](GAMEPLAY.md); the measurements and isolated-review scope below describe this exact pre-integration packet.

20 October 2026. The user rejected v05 because S did not clearly lift the cat and required the beagle v07 functional video style. **V06 is a revised motion review, not game integration or playable acceptance.**

[S lift and full review](../../previews/orange-tabby/review-v06.html) · [Try the revised controls](../../previews/orange-tabby/try-v06.html)

## Reference analysis and permanent standard

The supplied `beagle-functional-combat-v07.mp4` is 19.4 seconds, 1600×900 at 30 fps. It demonstrates vertical W strike, horizontal D strike and sword clash: each normal-speed shot is followed by a 0.25× replay of the same event. The supplied combat clip is the presentation reference; the S-lift requirement comes from the user’s explicit instruction. Exact file hash and observations are in motion-v06/reference-analysis.json.

- Compact live WASD highlights make powered, combined and released input readable.
- Thin chapter/phase bands leave most of the view for the action. Shared stamina, opponent HP, real damage and clash/recoil cues explain function.
- A stable floor grid, support rings and ground travel trace establish body movement. A fixed camera height prevents upward tracking from hiding rise.
- Normal speed explains the complete action; a lower side-view slow replay exposes the same contact and leverage.

Both repository and installed game-character-pipeline entrypoint and motion reference now require this presentation style. They also require explicit rest/contact/ascent/air/descent/recovery evidence for a selected support-lift move. Both skills validate. These are video/evidence requirements, not a universal S mapping, beagle geometry or character balance preset.

## Physical correction

The previous 0.8-high virtual paw pivots gave insufficient downward reach; the actual v05 S maximum base height was about 0.63. Lowering only the invisible rigid pivots to the seated body base gives the existing tall paws enough ground-support leverage. Neutral body/paw positions and proportions are preserved, as are all original atlas bytes. Motor limits, shared stamina, damage/clash rules and ordinary hover law are unchanged. No launch impulse or prescribed body path was added.

Asset v02 keeps 25,000 triangles and the original one-material 2K atlas. CTRL_Root owns solver base translation and common heading. CTRL_Paw_L/R now have virtual pivot height **0**, preserving their exported lateral positions; rotate their game Z by pi/2 − theta. Root Y remains solver p.y − 0.59 and root yaw −phi. Do not reuse v01’s 0.8-high paw pivots. The fitted world contact volumes at rest are unchanged; local contact X shifts by −0.8 to express them about the lower pivot.

The model stays upright and seated. W/S continuously drives opposite paw pitch, A/D common heading, and all four combinations remain available. Both paws share ordinary stamina/hit gates. Idle low hover is a declared bounded external lift at 0.35; the additional launch is from paw-floor reactions. No cat special ability is selected.

## S lift proof

| Measurement | V06 |
| --- | --- |
| First support time in the 6 s shot (S begins at 0.4 s) | 1.01667 |
| Maximum base height above floor | 2.20087 |
| Rise above 0.35 resting hover | 1.85087 |
| Maximum ascent speed | 5.15218 |
| Maximum height before first floor contact | 0.35000 |
| Base height at end of recovery | 0.38279 |

Before first contact the cat stays at 0.35. Registered support occurs while S is held, followed by genuine airborne ascent and descent; it returns near rest. Native browser S holds also reach peak 2.20 with the actual textured model. Height ruler and support rings are computed from solver data; camera height is constant within each shot.

## Video coverage

Files use H.264/YUV420p, 1600×900 at 30 fps. Every slow replay uses the same record and explicit 0.25× physical time; 1× appears first. Each separately labeled normal fixture resets.

| Video | Time | Action / speed |
| --- | --- | --- |
| [lift](../../previews/orange-tabby/orange-tabby-lift-v06.mp4) | 00:00.0–00:06.0 | S / giant paws lift the cat into the air / 1× |
| [lift](../../previews/orange-tabby/orange-tabby-lift-v06.mp4) | 00:06.0–00:10.8 | S / giant paws lift the cat into the air / same event, 0.25x / 0.25× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:00.0–00:02.0 | Idle / low floating rest pose / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:02.0–00:05.0 | W / forward paw drive / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:05.0–00:08.0 | A / left heading sweep / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:08.0–00:11.0 | D / right heading sweep / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:11.0–00:14.0 | W + A / forward paw drive + steering / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:14.0–00:17.0 | W + D / forward paw drive + steering / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:17.0–00:20.0 | S + A / reverse paw drive + steering / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:20.0–00:23.0 | S + D / reverse paw drive + steering / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:23.0–00:28.0 | W / release / S reversal / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:28.0–00:32.0 | A / release / D reversal / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:32.0–00:36.0 | Drop test / recovery / W resumes / 1× |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v06.mp4) | 00:36.0–00:39.0 | Opposite keys cancel powered drive / 1× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:00.0–00:03.0 | Vertical giant-paw hit / W / 1× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:03.0–00:06.6 | Vertical giant-paw hit / W / same event, 0.25x / 0.25× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:06.6–00:09.6 | Horizontal giant-paw hit / D / 1× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:09.6–00:13.2 | Horizontal giant-paw hit / D / same event, 0.25x / 0.25× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:13.2–00:17.2 | Giant paw blocks sword / clash recoil / 1× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:17.2–00:21.2 | Giant paw blocks sword / clash recoil / same event, 0.25x / 0.25× |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v06.mp4) | 00:21.2–00:23.7 | Same giant-paw swing / clear miss / 1× |

## Limits and next stage

This is the actual optimized Tripo cat replaying an isolated current-game solver. Production runtime sources/loadout availability are unchanged. Conservative paw contact undercoverage remains approximately 0.14; torso/head hurt shapes exclude cosmetic ears/tail. Larger support leverage also changes travel and attacks, so the revised motion and balance require review rather than inheriting v05’s technical pass. Actual-game camera/performance, modes/reset and matching gameplay footage remain integration work.

See prepared-v02/loader-verification.json, motion-v06/verification.json and browser-verification.json. Preserve original v01 Tripo download, both prepared candidates, rejected v05 footage and this exact source/renderer/version. Do not regenerate appearance or Tripo to continue.
