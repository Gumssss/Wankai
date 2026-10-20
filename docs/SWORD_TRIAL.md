# Short sword trial

Status: Playable source experiment on `main`, reviewed 20 October 2026. Historical controller and visual discontinuities have regression coverage, but the creator's unexpected direction change while standing on the sword still needs hands-on acceptance. Balance and redistribution permission remain open. See [project status](PROJECT_STATUS.md).

The approved half-speed/contact trial is included in merged baseline PR #2, `a591070`: it halves speed limits and adds solid guard proxies while retaining appearance, reach, acceleration/braking and the damage formula. The merged baseline has 200 stamina. The later character/weapon separation, orange tabby and full-window preparation page are local changes beyond that baseline and remain unpushed. The table below records the ordinary weapon profile.

## Purpose

Test the first weapon in a planned roster with a clear tradeoff: less reach than the polearm, but quicker swings. The default two-player match gives player one the sword and player two the existing curved polearm model. Both players can choose these three common weapons on either the basic fighter or beagle through the [full-window preparation page](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md), including matching loadouts. The complete current roster has eight valid loadouts, including the beagle's long ears and orange tabby's paws. Choices carry into practice and rematches; solo uses P1 and preserves P2's configuration. Movement still comes from weapon contact with the ground; there is no separate run-speed bonus.

## Asset

- Source: [“fiery sword” by Joehino in Tripo's public gallery](https://studio.tripo3d.ai/3d-model/fiery-sword-with-blazing-blade-ornate-crossguard-dark-hilt-and-metal-7d8f2b1a-0a38-4a80-b639-6fea05867560). Exporting a GLB used five account credits, with the creator's approval. The original download remains in the local Downloads folder.
- The original is about 66 MB with 1,909,322 triangles and three texture images. `node scripts/prepare-sword.mjs /path/to/original.glb public/models/sword.glb` preserves those images and reduces the game copy to about 17 MB and 180,000 triangles. The original sword download is not in this repository; the prepared game copy is included, so players do not need to run this script.
- The gallery model's exact reuse terms have not been established. The creator authorized the current source checkpoint and its merge to `main`; that does not verify asset redistribution permission. Resolve the original creator's permission and applicable terms before broader distribution or a packaged release.

## Current tuning

| Property | Polearm | Sword |
| --- | ---: | ---: |
| Solid weapon length | 2.35 | 1.45 |
| Gap from body pivot | 1.35 | 1.20 |
| Swing motor acceleration | 24 | 38 |
| Pitch reversal brake acceleration | 30 | 48 |
| Local trial axis speed limit | 4.25 | 6.1 |

The listed offset is the basic fighter's profile. The local separated beagle+sword loadout uses a measured 1.34 offset for body clearance; rendering and contacts share that value. No other sword tuning changed for the preparation-page update.

The local sword proxy retains its original 0.09-radius shaft and adds two capsules following the solid crossguard. The polearm retains its shaft with four additions following its collar/blade/tip/barb. Measured sword vertex coverage rises from 94.18% to 99.08%, with guard-band coverage rising from 85.60% to 99.10%. Rounded capsules remain approximate; no extra proxy was added for flame wisps. Rendering scale and reach are unchanged.

Damage depends on contact speed and acceleration, plus the shared direction weighting: pure horizontal hits use 50% of equivalent vertical damage. There is no sword-specific multiplier. Stamina weakens powered control below 25; yaw reversal uses motor acceleration and pitch uses the listed brake value. Both axes now cap at half their previous limits before integration and after contacts. See [control system](CONTROL_SYSTEM.md) for motion sampling, limits, and limitations. Lower speed can change movement and impact strength; the separate 30% speed option remains unapplied.

The sword begins level and points toward the opponent; either player may equip it. The default duel has separate player cameras, with a shared fixed-camera duel also available. Its hilt-to-tip axis is aligned with the collision segment. Continuous yaw × pitch keeps the flat blade's facing continuous through the downward pose. This has **not** settled the creator's report that the sword or movement changes direction unexpectedly when standing on it; reproduce and compare with the polearm before further tuning.

## Checks

### Review of the first import problems — 15 October 2026

The earlier chat records two separate complaints: the sword initially sat at a slant, and later changed direction unexpectedly while supporting the fighter. The latter was explicitly left unresolved by the creator.

- The old fixed-angle controller at checkpoint `8cc6441` chose the nearest upright target. At `theta = pi - 0.001`, holding Up drove negative angular velocity; at `pi` or `pi + 0.001`, the same input drove positive velocity. This is a reproducible historical discontinuity and a likely contributor, not proof of the entire reported symptom. The newer continuous torque controller already removes that target switch. A regression now checks identical input direction on either side of straight down.
- Direction-only quaternion alignment leaves blade roll ambiguous at the downward pole. All weapon visuals now use the same continuous yaw-and-pitch rotation, with regression checks that their longitudinal axes track physics through overhead and downward poses. Native model axis, grip, and blade-facing decisions remain separate import checks.
- At the first review, the sword's axial bounds matched its 1.45-unit collider, but its blade and crossguard extended beyond the 0.09-unit radius. The later local trial adds measured guard and polearm-blade shapes; solid capsule endpoints now participate in floor/rim contact for all weapons. The hammer retains its separate broad-head proxy and support checks.
- The optimized sword is 16,812,104 bytes and 179,996 triangles, with three 4096-square textures. Those textures are approximately 192 MiB decoded RGBA, or 256 MiB with mipmaps; this is a resource estimate, not a measured frame-rate result. The next import must reduce textures as well as geometry where needed, and inspect material arrays instead of assuming a single mesh/material.

Automated checks guard the identified discontinuities; only hands-on comparison can settle the creator's original support-direction concern.

Earlier in-game checks loaded the textured sword in practice with the default sword-versus-polearm pairing. That ordinary-weapon checkpoint covered nine ordered pairings, shorter reach, quicker response, visual rotation, rematches, no direct airborne movement, half-speed limits, sampled crossings/near misses, solid guard hits/blocks and shared clash recoil; its 77-check result is historical. Current dated full-suite and focused UI results are in the [selection handoff](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md#current-verification-and-next-work) and [project status](PROJECT_STATUS.md). They are separate runs, not cumulative test totals. Sword support direction, two-person balance, repeated mode switching, and offline Electron play still need hands-on checks. Record the mode, camera angle, held keys, before/after pose, and expected support movement as described in the [design handoff](DESIGN_HANDOFF.md).
