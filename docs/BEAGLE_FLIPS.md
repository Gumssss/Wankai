# Beagle front/back flips — local extension, 18 October 2026

**Historical experiment, inactive as of 19 October.** The creator reported that the character was lying down and later set front/back flips aside. The active game uses upright normal movement and a separate timed hover skill. See the [current skill handoff](BEAGLE_SPIN_SKILL.md) and [complete design process](BEAGLE_DESIGN_PROCESS.md). The remainder of this page records the experiment at its original checkpoint.

The approved smooth v05 model received experimental playable body rotation. This followed the
upright checkpoint merged in [PR #1](https://github.com/Gumssss/Wankai/pull/1).
The extension is local and has not been pushed or packaged.

## Controls

- Hold **W / ↑** to plant the ears, push upward and drive a forward vault.
- Hold **S / ↓** for the backward stroke and backflip.
- **A/D / ←/→** continues steering during the push, flip and landing. The camera
  retains its independent orientation and controls.
- Releasing removes powered swing input and retains body/ear momentum under
  gravity and damping. Reversing brakes the controlled rotation first.
- Both ears share the existing stamina budget and repeat-hit gate. Low stamina
  reduces motor power and target speed. A short stroke, tired motor or collision
  can produce a partial turn; there is no guaranteed 360° animation.

Live solo checks: [forward rotation](screenshots/beagle-frontflip.png) and [backward rotation with D steering](screenshots/beagle-backflip-turn.png). The latter consumed the combined 28 stamina/s, confirming both inputs were active.

## Physics and rig

`src/beagle-dynamics.js` uses generalized coordinates for translation, body pitch,
relative ear swing and yaw. A coupled mass matrix includes a 1.2-unit body and
two 0.12-unit ears, with distributed ear mass. Gravity, moving-joint inertial
terms, damping and finite hinge torque affect those coordinates together. The
internal swing motor reacts on both body and ears; no launch impulse is added.

The loading stance is assisted: while the body or ears support the character,
the initial push can brace body pitch. A sufficiently raised ear push releases
that stance and the same hinge motor drives body rotation against the ears.
The airborne body has no upright constraint. This support/control handoff makes
the four-button game playable; it is not an unrestricted passive ragdoll.

The body bone pivot is 0.85 units above the model's feet, 0.26 above `player.p`.
`bodyPitch` rotates the body, head, paws and measured ear sockets. `theta` stays
relative to that body, allowing the ears to lag and counter-rotate naturally.
The imported resting bone quaternions and unit bind scales are retained.
The approved geometry, textures and one rigid hinge per ear are unchanged.

The sweep motor targets 4.25 rad/s; the vault body target is 7.8 rad/s before
fatigue. Angular safeguards act through generalized impulses rather than
clipping one bone and discarding its reaction. Airborne relative ear speed can
exceed the sweep motor target as the body rotates. Tuning is in `BEAGLE_MOTION`.

## Contacts and rendering

Ear contacts and body/head/paw hurt shapes share the same rotated frames and
point-velocity derivatives. Ground/rim response, body separation, hits and
blocks transfer impulses back into the articulated state. Swept-contact samples
interpolate body pitch as well as ear angle and yaw. Split position impulses
correct discrete floor overlap without adding takeoff velocity. Ordinary
upright opponents regain their floor constraint after mixed-body separation.

The GLB `body_pitch` bone and the fallback geometry follow those physical
angles. Solo/split camera framing includes both rotated body shapes and ears.
Hit gating, directional damage, ordinary clash recoil and shared stamina remain.

## Verification and limits

- **92 tests passed**, including full airborne front/back turns with both A/D
  directions, release/reversal, fatigue, motor momentum reaction, point-velocity
  agreement, rotated-head hits, floor separation and all sixteen loadout pairs.
- Actual exported mesh vertices and ear sockets agree with physics through
  inverted body poses, combined yaw and full relative ear sweeps.
- Ground regression permits less than 0.035 units of capsule overlap; shapes
  remain rounded approximations. Small gaps/overlaps and grazing-contact limits
  still require visual judgment.

This is a controlled pitch/yaw character, with no free sideways roll. Both ears
still share one swing coordinate; independent left/right responses, soft-body
deformation and automatic landing recovery are future design choices. Landing
can tumble or settle on the rounded head instead of always returning upright.
Two-person feel, takeoff strength, ear lag and combat balance need playtesting.
