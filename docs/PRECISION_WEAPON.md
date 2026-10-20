# Deferred side project — precision weapon

Status: **deferred at the creator's request on 15 October 2026**. This is a proposed fourth common weapon, separate from the playable sword, polearm, and iron hammer; character-specific long ears and cat paws are already available. No completion date is set. No staff export has been purchased or downloaded, and no staff has been integrated.

Reviewed 20 October 2026: still deferred. The three ordinary weapons, 200 stamina, direction-weighted damage and half-speed/contact trial are in the merged baseline. The local game additionally has eight valid character/weapon loadouts and a full-window preparation page; see [CONTROL_SYSTEM.md](CONTROL_SYSTEM.md) and the [selection handoff](CHARACTER_WEAPON_SELECTION_IMPLEMENTATION.md). Those changes do not approve this proposed common weapon or its balance.

## Agreed direction

The creator wants a weapon focused on control, with slower horizontal turning on A / D (and the equivalent arrow keys). The accepted starting direction is roughly half the sword's maximum horizontal turning speed, with quick response and stronger braking on release. This should make aiming and deliberate ground placement easier, at the cost of slower wide sweeps and slower turns toward an opponent behind the fighter. Tune W / S independently rather than slowing every movement of the weapon.

That comparison was made before the ordinary-weapon half-speed trial, when the sword limit was 12.2 rad/s. The original reference therefore suggests about 6.1 rad/s; do not silently halve the current 6.1 sword limit again. Revisit the intended relative pace when this deferred project resumes. Neither this fourth common weapon nor its final values are implemented.

## Candidate awaiting approval

The proposed appearance is [enchanted staff 3d model by cgbiw3 on Tripo](https://studio.tripo3d.ai/3d-model/wooden-staff-with-glowing-runes-wrapped-in-vine-like-bindings-carved-41879527-9b4e-45b0-bb93-6e8e591e60e5): a wooden shaft with glowing runes, vine-like bindings, an ornate upper head, and a metal-cap base.

The inspected source has 1,951,279 faces, 1,010,441 vertices, and 4K textures. Its export dialog showed **5 credits** for GLB export. That price was inspected only; the creator has **not approved this staff's appearance or export cost**. Recheck the cost and obtain approval before spending credits when this project resumes.

Medium reach, ordinary impact damage, and W / S swing pace similar to the polearm were proposed, but are **not yet agreed**.

## Resume checklist

1. Confirm the appearance and remaining reach, damage, and W / S decisions. Show any replacement model before using it.
2. Recheck the export settings and cost, then obtain approval before spending credits.
3. Inspect the exported model's grip, native axes, solid contact surfaces, and textures. Reduce the source geometry and texture budget before loading it in the game.
4. Give horizontal steering its own speed, acceleration, reversal braking, and release braking settings. The current motor speed/acceleration settings are shared by yaw and pitch; reducing those would also change W / S. Yaw reversal currently uses motor acceleration and release uses damping. Keep collision response, safety limits, stamina fatigue, and direction-weighted damage consistent with the new profile; do not use the separate unimplemented 30% global-speed proposal as this weapon's specification.
5. Align rendering and collision through continuous rotations and ground support; use the sword-import investigation and hammer trial as regression references.
6. Add the weapon's actual preview, description, strengths, and tradeoffs to the armory and both players' pre-fight selections. Verify controls, contacts, rematches, and performance before acceptance.

This note records future work only. It does not authorize a Tripo purchase or schedule a later run.
