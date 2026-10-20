# Current motion: accepted v06 controller / complete v07 review

Updated 20 October 2026. The user approved complete v07 for integration. The prepared-v02 cat is now playable locally, and the production solver reproduces all 13 accepted ordinary/recovery timelines, including the S support lift. W, S, A, D and W+A, W+D, S+A, S+D are the accepted ordinary movement matrix; there is no selected cat ability.

Open the [live game](http://127.0.0.1:5173/) for implemented behavior. The user prefers live review after implementation; the [complete before video and timecodes](MOTION_V07.md), [v06 support/combat measurements](MOTION_V06.md) and [recorded actual-game evidence](../../previews/orange-tabby/review-gameplay-v01.html) remain historical references. Current controls, preparation flow, dated verification scope and remaining hands-on acceptance are in [GAMEPLAY](GAMEPLAY.md).

## Historical studies

The v01 record below and versioned v02–v05 studies describe superseded directions or rejected motion. Their original review boundaries and measurements are preserved; they do not define current availability, controls or pending production work.

---

# Orange tabby motion review v01

19 October 2026. Direction/motion review packet; not a selectable character or a production asset. User acceptance is pending.

[Open the video review page](../../previews/orange-tabby/index.html). Files are H.264 MP4, 1280 × 720 at 24 fps and normal-speed playback.

## Evidence and proposed direction

Recommend A, the compact seated posture. W/S drives opposite cycles of attached front paws; A/D steers their common heading; hind feet provide passive support only. No cat ability is selected. The taller B comparison uses the same arm lengths and relative stroke; it needs a deeper reach path to reach the floor.

The controls video replays a reduced-coordinate support model. Body translation comes from point-contact impulses through the paw Jacobians, with finite phase/yaw motors, gravity, friction and an upright base constraint. This is not Wankai gameplay or a full two-link dynamics proof. The combat and posture videos are authored concepts with scripted target/weapon paths and recoil. They do not prove damage, blocking or clashes.

## Video coverage

| Video / time | Input and demonstrated action | Evidence type / limits |
| --- | --- | --- |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:00.0–00:03.5 | W / forward rake | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:03.5–00:07.0 | S / reverse rake | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:07.0–00:10.5 | A / left heading sweep | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:10.5–00:14.0 | D / right heading sweep | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:14.0–00:17.5 | W + A / forward rake + steering | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:17.5–00:21.0 | W + D / forward rake + steering | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:21.0–00:24.5 | S + A / reverse rake + steering | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:24.5–00:28.0 | S + D / reverse rake + steering | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:28.0–00:34.0 | Release, coast, brake, reverse | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:34.0–00:39.0 | Steering release and reversal | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:39.0–00:43.0 | Opposite keys cancel their axis | reduced support solver; not game |
| [controls](../../previews/orange-tabby/orange-tabby-controls-v01.mp4), 00:43.0–00:47.0 | Landing and return to useful control | reduced support solver; not game |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v01.mp4), 00:00.0–00:04.0 | Vertical paw rake / W | authored concept; scripted contacts |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v01.mp4), 00:04.0–00:08.0 | Horizontal paw swipe / D | authored concept; scripted contacts |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v01.mp4), 00:08.0–00:12.0 | Pad-facing interception / W then release | authored concept; scripted contacts |
| [combat](../../previews/orange-tabby/orange-tabby-combat-v01.mp4), 00:12.0–00:16.0 | Weapon clash and recovery / W + D | authored concept; scripted contacts |
| [comparison](../../previews/orange-tabby/orange-tabby-comparison-v01.mp4), 00:00.0–00:06.0 | A compact / B taller posture | authored concept; scripted contacts |

All isolated/combined inputs include preparation and release. Additional segments show W↔S and A↔D braking, opposite-key cancellation and an explicitly external drop followed by resumed W drive. Interception is a proposed phase/heading position, not an extra button or automatic guard.

## Measured research findings

| Scenario | Final X / Y travel | Maximum body rise | Final body height |
| --- | --- | --- |
| w | +2.156 / +0.574 | 0.232 | 0.005 |
| s | -2.213 / -0.669 | 0.232 | 0.006 |
| a | +0.000 / +0.000 | 0.000 | 0.000 |
| d | +0.000 / +0.000 | 0.000 | 0.000 |
| wa | +0.043 / +1.631 | 0.232 | 0.005 |
| wd | +2.075 / -1.211 | 0.232 | 0.005 |
| sa | +0.766 / -2.267 | 0.232 | 0.006 |
| sd | -1.116 / +1.819 | 0.232 | 0.005 |
| release-reverse | -1.150 / -0.833 | 0.232 | 0.004 |
| yaw-reverse | +0.000 / +0.000 | 0.000 | 0.000 |
| opposites | +0.000 / +0.000 | 0.000 | 0.000 |
| landing | +1.088 / -0.071 | 0.750 | 0.005 |

Units are game-scale research units. W/S maximum rise is approximately 0.232, with 2.16 / −2.21 X travel in separate 3.5-second setups. Straight strokes also drift laterally and yaw under alternating contact; this is an open control issue, not an accepted travel target. The drop starts 0.75 above the floor and must not be read as a jump ability.

Maximum shoulder-to-paw distance is about 1.136 against a 1.28 total chain length. This proves endpoint reach in the chosen procedural path, not final joint limits, mesh clearance or impulse robustness. Paw-floor gap remains positive in this study; the spherical support radius is not a finished claw/mesh fit.

The initial underpowered motor stalled: maximum motor torque 5.76 was below the estimated 7.30 gravity load at the largest phase lever. A deliberate finite-motor trial (maximum 19.8 torque-equivalent, target speed 3 rad/s) traverses the support phase. These research numbers do not change global game balance. A separate initial-overlap setup error was fixed by starting both paws clear of the floor; no normal shot begins with a launch.

## Remaining proof before production locks

- Wankai solver adapter: paired paw support, adequate steering authority, full articulated/finite drive behavior, release/reversal, fatigue and recovery.
- Actual combat hits and nearby misses, pad/claw blocking, clear clashes and recoil with current game rules.
- Selected production geometry and rig: extreme-pose body clearance, fitted contact envelopes/point velocities, hurt shapes and clone independence.
- Actual game camera/input/reset checks and post-implementation gameplay videos.

## Review boundary

Review A/B can select the compact seated direction and the presented ordinary motion intent. It cannot accept unimplemented game physics or an unseen Tripo model. Confirm or revise the posture/arm cycle before final proportions and reconstruction inputs are locked. Then finish the game-solver mechanical proof, prepare the exact generation images and inspect current Tripo settings/charges for a bounded operation request. Cat generation/spending remains unapproved.

## Artifact verification

All three actual MP4s passed full FFmpeg decoding, H.264/YUV420p format checks and 1280 × 720 / 24 fps / duration checks. Whole-shot bounds keep meshes clear of captions. The in-app review page played the encoded movement clip, visibly advancing from W to S; `docs/previews/orange-tabby/review-page-v01.png` records that view. Twenty research/delivery checks passed. Existing game baseline: 100 tests pass and build passes with its existing large-bundle advisory. All 154 pre-existing tracked files match their start hashes, and both original supplied image hashes remain intact. These checks do not establish cat gameplay or user acceptance.
