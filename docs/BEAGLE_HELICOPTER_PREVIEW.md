# Beagle horizontal spinning attack — motion preview v01

**Implementation update — 19 October 2026:** The creator approved the normal-controls proposal and requested low hover now on F. See [current playable skill](BEAGLE_SPIN_SKILL.md); the earlier deferral/proposal wording below records the preview stage.

This is an authored Blender motion concept for review, using the approved smooth v05 beagle. It does not change the game controller, collision shapes, damage rules, or runtime model.

**19 October follow-up:** The creator questioned the full spread's coverage and its combination with W/S. A new [normal-controls versus separate-skill video](BEAGLE_NORMAL_SKILL_PREVIEW.md) presents parallel normal ear strokes with steering, followed by the wide spin as a skill proposal. That alternative is awaiting motion review; this page records the earlier direction.

## Agreed motion

- Hold **D**: spread the two ears flat to opposite sides and accelerate the whole upright character clockwise, viewed from above.
- Hold **A**: use the same horizontal ear pose and spin the whole character counterclockwise. Opposite input brakes existing rotation before reversing it.
- The body and both attached ears turn together. The ear roots have a small damped lag during acceleration and braking; the ears retain their smooth curved shape without an added middle hinge.
- Release: coast down, then bring the ears back toward their rest pose as rotation slows.
- This is a **grounded horizontal weapon attack**. Sustained rotation creates no lift or hover. Front flips and backflips are outside this proposal.

The floor circle is a spatial reference, not a damage indicator. No opponent or hit response is simulated in these clips. Foot sliding during the turn is a concept simplification; locomotion polish remains a separate implementation step.

## Deferred character skill: helicopter hover

The creator confirmed that lifting the beagle into a hover will be a separate character skill, to develop later. Ordinary A/D spinning remains a grounded horizontal attack; holding those keys alone must not automatically activate hover. The skill can build on the horizontal ear-spin motion, but its activation, height, duration, resource cost, cooldown, and combat rules are undecided. No hover implementation is included in the current preview or requested for this step.

## Review clips

- [Three-quarter view, 14 seconds](beagle-helicopter-spin-v01.mp4): rest → D → release → A → release.
- [Top view, 10 seconds](beagle-helicopter-top-v01.mp4): the same control idea, making the horizontal sweep and opposite directions easy to see.
- [Browser player](previews/beagle-helicopter-v01.html).

Both are 24 fps H.264 MP4 files. The three-quarter view is 1280 × 720; the top view is 1080 × 1080. The sampled motion accelerates toward 0.68 revolutions per second. This is a review speed, not a committed gameplay tuning value.

## Source and rebuilding

Approved source: `assets/source/blender/beagle-smooth-ear-duelist-v05.blend`.

Preview generator: `scripts/blender/beagle_helicopter_preview.py`. It opens the approved source and writes separate generated scenes, frame images, and motion measurements into ignored `output/beagle-helicopter/`. It does not overwrite the approved source.

```sh
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 --python scripts/blender/beagle_helicopter_preview.py -- three --render
bash scripts/blender.sh --background --factory-startup --python-exit-code 1 --python scripts/blender/beagle_helicopter_preview.py -- top --render

ffmpeg -y -framerate 24 -start_number 1 -i output/beagle-helicopter/three/frames/%05d.png -frames:v 336 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart docs/beagle-helicopter-spin-v01.mp4
ffmpeg -y -framerate 24 -start_number 1 -i output/beagle-helicopter/top/frames/%05d.png -frames:v 240 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -movflags +faststart docs/beagle-helicopter-top-v01.mp4
```

Each build checks the ear attachments, horizontal ear axes after deployment, upright body, sampled floor clearance, and sampled screen bounds throughout the clip. The generated `motion.json` contains the measurements and time samples.

## Subsequent gameplay work

After motion review, the game needs a lateral deployment axis at each ear root and shared body yaw driven by A/D. The existing weapon collision and damage system must follow the same poses, with swept contact handling at spinning speeds. Visual lag must stay small enough to agree with the effective weapon location. Do not make a cosmetic rotating model that leaves the weapon physics behind.

The existing local flip experiment is preserved separately. This preview neither reverts that work nor publishes any gameplay changes to GitHub.
