# Wankai design handoff — 14 October 2026

Status: local prototype with two player views and the new continuous front/back swing controls. The short sword's direction while supporting the fighter is **not yet accepted as solved**.

## What the demo is for

- Build a small, local macOS game for two friends sharing one keyboard. The fighter has no feet or independent walking control: the weapon is both the way to move and the way to fight.
- Test whether new players can deliberately move, repeat a swing, aim, and land a hit. An accidental win alone is not a successful playtest. Use the current controls, help panel, practice mode, HUD, sound, and hit feedback; a guided tutorial can come later.
- Try Tripo-generated 3D assets in the Electron + React + React Three Fiber game. Tripo makes assets outside the running game; the game loads local GLBs. The first polearm trial was appearance-only. The later sword trial is a separate weapon profile with shorter reach and faster swings.

## Decisions already made

- The two-player duel now uses two side-by-side views **inside the same Electron window**, one for each fighter. They render the same match through two cameras; the physics loop advances once. Practice keeps the shared camera, and solo keeps its independent mouse camera.
- Keep the custom contact-driven movement. The creator approved the [control animation](control-concept-combinations.mp4): from overhead, W (↑) swings toward the fighter's front and S (↓) toward the back. Either input can continue past the downward pose so ground contact can lift the fighter and carry the weapon around the other side. Releasing preserves momentum; reverse input brakes first. This supersedes the earlier fixed up/down targets and ten-degree follow-through rule.
- A / D (← / →) change only the weapon's horizontal direction, and can be held with W or S. The fighter has no separate walking or turning input. The visible face and camera follow weapon azimuth; the heading stays stable when the weapon points vertically. Both fighters now start with weapon heading aligned to facing; the polearm starts raised to avoid overlap.
- Each duel camera starts behind its fighter facing the opponent. It turns horizontally with weapon steering and rises or lowers with the weapon while keeping a fixed viewing pitch. Slight lag lets the swing remain visible. Neither player's camera changes the other's view.
- Solo exploration has one fighter, a larger arena, and a mouse-controlled camera. A / D rotate the weapon; mouse drag rotates the view. The camera keeps the weapon in frame smoothly, and the view starts higher than the first solo version. The heading cue shows the fighter's facing and swing-plane direction relative to the view.
- The first Tripo model came from the supplied curved-blade polearm image. It is untextured; its color and finish can be revised later. The original trial used this same model for both players with color accents.
- The current local duel defaults to player one's shorter, faster sword versus player two's existing curved polearm model. The sword has no separate fighter travel-speed bonus; movement still comes from weapon contact. Player one can switch back to the polearm in the menu. The sword's source is a public Tripo gallery model, optimized locally with its textures retained.
- The longer-term game is planned to have **multiple weapons with different gameplay effects**. The current sword is the first example, not the whole weapon system. Future weapon types, exact effects, player selection, and balance rules have not been decided; keep those as design work rather than assuming every weapon is only a length-and-speed variant.
- The sword is intended to start level and point toward the opponent. Its model has been aligned with the collision segment, and a visual rotation change was made to keep the flat blade's facing continuous through the downward pose. These code changes have **not** resolved the creator's concern to their satisfaction.

## Open questions and observations

1. **Sword direction while standing on it:** The creator still sees a direction change that feels wrong when the sword is used to support movement. Reproduce the exact input sequence and compare the sword to the old polearm with the same camera angle. Determine whether the problem is the visible blade facing, the direction of the physics movement, the camera, or a combination. Do not mark this fixed based on the current code or screenshots alone.
2. **New swing rule:** Check whether W and S feel like deliberate front/back choices from overhead, whether continued rotation through ground support is controllable, and whether combined W/S plus A/D input curves the path as expected. The earlier fixed-angle controller remains in the previous local Git checkpoint for comparison.
3. **Camera and orientation cues:** The solo direction dial shows fighter facing and swing-plane heading. Test whether the two following duel cameras remain comfortable through fast A / D sweeps and whether players can still see the moving weapon. Test whether a clearer support/contact cue is needed.
4. **Sword art:** The first public sword model looks unusual in motion to the creator. Decide whether local orientation/material adjustment is enough or whether to generate a new asset in Tripo. Do not spend more Tripo credits without discussing the intended design and cost. The current sword blade is wider than its straight collision segment.
5. **Playtest and tuning:** Have two new players try a local match without live instruction. Note when movement, aiming, and hits are deliberate. If they struggle, consider easier control tuning after observing which actions fail. Check sword-versus-polearm balance only after the direction issue is understood.
6. **Later features:** A guided beginner tutorial remains an idea for a later version. Further camera tuning can follow a two-person playtest.
7. **Weapon roster:** Decide the next weapon concepts and what each changes in movement, attacks, defense, and visual feedback. Make sure each effect is readable and the visible model agrees with its collision behavior. Decide whether both players select independently; today only player one can switch weapons in the menu.

## Next session

Play the split-view duel with two people. Check W versus S from overhead, continued motion after ground contact, simultaneous swing and horizontal turn, camera turn and height response, hits, and whether each player can judge weapon contact. Reproduce the sword support-direction issue: mode, camera angle, keys held, sword position before contact, and expected versus actual movement. Compare the same sequence using the polearm. Then decide whether further visual, input, or physics changes are needed.

The public gallery sword's reuse terms are still unverified. Keep this asset in the local prototype until permission for distribution is clear. Keep this work local; no GitHub push is requested.
