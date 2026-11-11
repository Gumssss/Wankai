# F abilities — proposal v01 (partially superseded)

**8 November update:** Mean Girl and CR7 now follow the user-requested perfume / ricochet-ball directions in [v02 feasibility record](F_SKILL_DESIGN_V02.md). Their v01 proposals and videos are historical; neither was selected or implemented. Orange Tabby / Maodie remain unchanged and are deferred.

7 November 2026 · local design/motion review · baseline `42bc52b` on `feat/drive-characters`.
**Current proposal:** v01. **Selected:** none. **Implemented:** none of these four proposals. Existing five skills stay unchanged. No publishing or global balance changes authorized. Numbers below are hypotheses, not measured balance.

## Roster audit

Source checked: skills/loadouts/character and weapon catalogues, physics fixed-step/contact and skill paths, animal profiles, session/network/AI/event consumers; current architecture/restoration/Drive records.

| Fighter | Identity / normal weapon strengths and liabilities | Existing role / proposed gap |
|---|---|---|
| Naiwa | Playful laugh; balanced medium staff; common equipment changes reach | Existing stamina denial: 400/s for .5 s then 2 s recovery suppression, 35 s CD |
| Stickman | Mischievous; six common weapons, no anatomical signature | Existing behind-target teleport, 2.7 offset, .45 s active, 28 s CD |
| Dudu | Delivery gag; broad short box, needs approach | Existing thrown box: 14 damage, 17 speed, 2.5 s life, 22 s CD |
| Happy Cat | Cheerful sustain; broad short paw or common weapon | Existing 10 HP / 1.6 s heal, 40 s CD |
| Beagle | Fragile 80 HP, long distal ears/support; compact body with common weapon | Existing paid rotor only with long ears: 40 minimum, 16/s, up to 5 s, no extra CD. No flips |
| Orange Tabby | Seated stubborn heavyweight, 150 HP, paired 1.3× paws; broad medium reach and slower control | **Stand Your Ground / 不动如橘**: short knockback resistance; no heal or immunity |
| CR7 | Confident precision striker, short round football; common weapons change handling | **Clean Strike / 临门一击**: one manually aimed contact gets a capped bonus |
| Mean Girl | Territorial pink/gold attitude, short broad crowned heart | **Personal Space / 生人勿近**: one delayed, stationary exclusion pulse |
| Maodie | Watchful, unimpressed single-paw cat; short reach, broad clash face | **Not Today / 拍回去**: directional weapon-contact parry, no automatic attack |

Orange Tabby, Happy Cat and Maodie are separate characters. W/S always controls weapon pitch, A/D weapon yaw; no walk/dash input remapping. Current stamina 200 and ordinary input costs remain. Body translation must arise from the existing solver or an explicitly identified skill impulse.

## Recommended contracts

All four use a **fresh F tap**; holding/releasing F has no additional effect and cannot rearm. Spend stamina and start cooldown at accepted activation, including misses/interruption; invalid inputs spend nothing. No refund. Ordinary input costs continue. Suppress stamina regeneration during wind-up/active/recovery, then resume the existing .5 s recovery delay. All cooldowns use simulation time. The existing five skills retain their own resource rules.

| Stable ID | Wind-up / active / recovery | Cost / cooldown | Effect | Equipment |
|---|---|---|---|---|
| `tabby-brace-v01` | .25 / 1.25 / .25 s | 25 / 12 s | Incoming horizontal combat knockback ×.4 while supported near floor; full HP damage; no reduction to gravity, collision separation, floor/rim impulses | Paired cat paws only (only legal current equipment). Other equipment is invalid; do not expand catalogue |
| `cr7-clean-strike-v01` | .30 / 1.20 maximum / .30 s | 30 / 16 s | First eligible weapon-body hit adds **6 HP**, total hit capped at 20; knockback ×1.2 capped at ordinary impulse +1 m/s equivalent. No projectile, no speed boost | Football and all six common weapons; same additive cap, normal reach/speed retained |
| `mean-space-v01` | .60 / one pulse / .30 s | 35 / 20 s | Radius 2.6 m telegraph planted at activation ground point. At .60 s, one visible outward horizontal +2 m/s impulse, **0 damage**, once per enemy; no stun | Crowned heart and all common weapons; floor glyph is character-owned |
| `maodie-parry-v01` | .12 / .28 / .45 s | 20 / 12 s | First qualifying incoming weapon clash in a front ±55° cone consumes parry. No HP bonus; cancel that attack's same-tick body hit and cap extra separating velocity at 1.5 m/s. No auto riposte | Single paw and all common weapons; actual equipped weapon must intersect |

### Orange Tabby — stubborn anchor, not a second shield/healer

F shows an amber segmented footprint and rigid-body lean; paws remain under ordinary pitch/yaw. Active only when the body is within .10 m of its normal .35 idle hover reference OR a valid floor-support contact exists; no magnet-to-floor and no forced descent. Airborne activation rejected. Losing support suspends resistance; regain support during the window restores it. W/S, A/D and all four combinations work with existing motor parameters; movement is not artificially slowed. Taking damage does not break brace; death cancels it. Release/reverse normally. Expiry removes resistance immediately with .25 s visible fade; ordinary control never locks. Counter: full-damage hits, wait 1.25 s, attack from range, or knock it airborne. Existing 150 HP is already strong, so no damage reduction. Alternative for later comparison only: paw-assisted vault; overlaps Beagle vertical mobility and needs new support proof, so not recommended or motion-selected.

### CR7 — finish the chance

Gold outline on the equipped weapon builds for .30 s; a single bright notch then signals the 1.20 s opportunity. Aim with current weapon pitch/yaw, not target homing. W/S/A/D continue unchanged through all phases. First eligible body hit spends the charge; a qualifying weapon clash also spends it **without bonus**. Floor/rim/prop contact neither spends charge nor gets bonus. Minimum eligibility uses the existing damaging-hit gate; a motionless touch cannot score. Damage received during wind-up cancels; after arming, damage does not extend or erase the charge. Expiry/failure uses full cooldown. Air activation is allowed but supplies no lift; landing remains ordinary solver behavior. Counter: clash, evade, pressure the wind-up. Common hammer cannot multiply its base damage beyond the 20 total cap; polearm keeps its reach but same +6 cap. Alternative: kick a free ball; not recommended because Dudu already owns the projectile role and the rigid footballer has no leg rig.

### Mean Girl — a readable boundary

The pink ring is fixed at the activation point, not dragged with the character. Ground activation only, same near-floor/support gate as Tabby. A dashed .60 s warning fills clockwise; the pulse then expands visually over .15 s but applies one authoritative impulse at the scheduled tick. Affected opponent must be within 2.6 m horizontally, within 1.5 m vertically of the ground plane, and have unobstructed line of sight from ring centre. Solid props occlude; ring is clipped visually to arena boundaries. Does not push through props or bypass rim/body collision resolution. Self unaffected; no damage, stamina drain, healing or persistent debuff. Received damage during warning cancels the pulse; leaving the planted area does not cancel. All normal inputs continue. Counter: hit during warning, leave ring, shelter behind solid geometry, or attack from beyond it. Mirror rings resolve both impulses from the same pre-effect state, not player-index order. Alternative: forced camera/aim taunt rejected as disruptive to physical control; not a proposed move.

### Maodie — timing and contact

Cyan weapon rim indicates .12 s tell, then .28 s white/cyan parry window. Front cone uses body heading at activation (latched), displayed as a floor wedge; turning the weapon with A/D does not silently rotate the protected sector. Requires a real weapon-weapon contact and approaching relative velocity through the normal clash gate; no body-only force field, rear guard or projectile reflection. Resolve parry before ordinary same-tick body hit; consume one event and separate/rearm under existing contact rules. Simultaneous mirror parries use ordinary clash only and consume both, without double impulse. Incoming projectile/body hit is not parried and interrupts the window; valid weapon clash succeeds before its possible body hit. W/S and A/D still operate; player must aim the weapon. Miss leaves .45 s recovery telegraph (no forced motor lock); no automatic counterattack. Air use allowed, no lift; normal landing. Counter: delay strike, hit rear/body around the weapon, throw a box. Alternative: teleport dodge rejected for overlap with Stickman.

## Ownership, reset, network and AI proposal

- **Authoritative host / fixed 1/180 s:** activation validity, costs, phases, contact eligibility, damage/impulses, cooldowns, ring occlusion and reset. Renderer/audio consume identified events only. Preview poses/positions are authored, not a second shipping simulation.
- Preserve visible weapon/contact frames, shape dimensions, point velocities and current shared motors. Tabby resistance scales only the combat knockback component, not general inverse mass. CR7 bonus attaches once to an existing eligible contact. Maodie requires explicit same-tick clash/body-hit ordering work. These are implementation risks to prove after selection.
- Use per-fighter phase, activation tick, cooldown, consumed flag; ring adds quantized centre and due tick; parry adds latched heading. Event IDs deduplicate guest feedback. Guest sends fresh skill edge through existing reliable input path; duplicate/old edges cannot spend twice. Extend snapshots and increment protocol from current 5 on implementation; reject mismatched peers. Never let client visuals decide hits.
- Offline pause freezes all timers. Focus loss clears held normal inputs and queued F; online simulation continues when a local menu opens. Reset/rematch clears all phases, planted rings, charges, contact gates and presentation. Death/result cancels pending effects; delayed ring cannot score after death. Invalid activation during recovery/cooldown/insufficient stamina/unsupported loadout has no side effects. Stamina falling to zero after an upfront payment uses normal exhausted motors; it does not invent a refund or extend the skill.
- AI uses the same input contract and observable information: Tabby braces before a visible close approach while supported; CR7 arms within reach with a likely strike in 1.2 s; Mean Girl warns when an opponent is close and not already retreating; Maodie reacts to visible approach with difficulty-dependent delay, never reads future inputs. Reserve ordinary movement stamina, avoid retry spam; seeded reproducibility.
- Obstacles/rim use existing solver; no teleportation, obstacle tunnelling or artificial landing. Check both fighter indices and mirrors; effect enumeration must not privilege player 0.

## Motion evidence and review state

See [motion record](F_SKILL_MOTION.md). Existing approved model exports are reused. The proposed skill clips are **authored 3D concepts**, including scripted body/contact response and illustrative resource/impact numbers. They do not prove physics, balance, online behavior or rig deformation. Imported rigid bodies remain rigid.

**Pending decision:** select/refine each v01 contract after viewing. No production skill code is changed. Next authorized stage, only after selection: implement chosen scope and capture actual-game counterparts, affected contact sweeps, normal matrix/combos, interruption/reset/resources, AI and host/guest. Native Steam and MacBook execution remain unverified. Prior 177 tests/build are historical; not newly run for this packet.
