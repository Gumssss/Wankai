# Beagle normal controls and separate spin skill — proposal v01

**Implementation update — 19 October 2026:** The creator approved the normal-controls proposal and requested low hover now on F. See [current playable skill](BEAGLE_SPIN_SKILL.md); the earlier deferral/proposal wording below records the preview stage.

19 October 2026. This video presents a proposed alternative to making every A/D turn use the fully spread helicopter pose. It is for motion review, not an accepted control change or a runtime implementation.

[Watch the video](beagle-normal-skill-v01.mp4) · [Browser review player](previews/beagle-normal-skill-v01.html)

## Examples in the 25-second video

| Time | Input | Idea |
| --- | --- | --- |
| 0–4 s | W | Parallel ears swing forward; ear-ground contacts lift and carry the upright body. |
| 4–8 s | S | Reverse ear drive, retaining the same physical ear surfaces. |
| 8–11 s | D | Normal turning changes the heading without opening the ears into opposing rotor blades. A is the mirrored direction. |
| 11–15.5 s | W+D | Continue the forward stroke while turning its vertical plane to the right. |
| 15.5–20 s | S+A | Continue the backward stroke while steering left. |
| 20–25 s | Proposed spin skill | Spread both ears fully sideways and rotate the body and ears together. This illustrates the separate-skill option; no activation binding, cooldown or balance has been selected. |

The approved smooth v05 model and its ear lengths are identical throughout. Every example uses the same camera direction and orthographic scale; the camera follows horizontal travel. Examples reset independently. Teal floor lines show body paths; the final circle is a spatial reference for the skill, not a damage indicator.

Keeping the ears parallel reduces instantaneous width, but it does not shorten the long tips' turning radius. The video should be judged with that remaining reach in mind. No opponent, damage, blocking outcome, or skill balance is demonstrated here.

Helicopter hover remains a separate character skill reserved for later development. No hover or body flips are included. Ordinary contact-driven rises in the normal examples are not sustained flight.

## What generates the movement

The normal examples run an isolated copy of the merged upright beagle solver at commit `aa3e4c6c27ba2f56c6b173adf94987f7802467f5`, with the measured v05 contact profile. W/S motor drive, gravity and ground impulses produce body travel and lift. There is no scripted translation or launch impulse. Playback is 0.8× speed for readability.

One proposed steering adjustment is included only in this preview: A/D targets a slower 1.15 rad/s yaw rate, using finite motor feedback, while W/S-only input counteracts incidental yaw. Ground contacts can still deflect the heading. This differs from the existing direct yaw input and is a design candidate, not accepted tuning. The wide-spin skill is authored animation rather than a gameplay simulation.

The Blender replay keeps body pitch upright, uses the actual source meshes and measured sockets, and retains the original bone scales. A small presentation correction prevents sampled visible geometry from crossing the floor during interpolation; its measured maximum is about 0.0071 units. The normal replay produces roughly 2.2 units of maximum contact-driven body rise; this strength still needs visual acceptance and playtesting.

## Rebuild and verification

Source model: `assets/source/blender/beagle-smooth-ear-duelist-v05.blend`.

```sh
node scripts/preview/beagle-normal-skill-preview.mjs
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 --python scripts/blender/beagle_normal_skill_preview.py -- --render
ffmpeg -y -framerate 24 -start_number 1 -i output/beagle-normal-skill/frames/%05d.png -frames:v 600 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart docs/beagle-normal-skill-v01.mp4
```

The scripts write snapshots, replay data, generated scenes and images under ignored `output/beagle-normal-skill/`. Production source, the approved model and earlier previews are preserved. The replay records source hashes and motor inputs; the Blender build checks all 600 frame poses for stable attachments, parallel normal ear axes, sampled floor clearance and sampled framing. It also checks no vertex has more than four bone influences. Delivery is a silent 1280×720 H.264 video at 24 fps.

Review the normal movement, steering speed, body rise and the transition in coverage before deciding whether the whole wide spin should become a skill. This proposal does not supersede the previously recorded controls by itself.
