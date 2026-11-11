# F skills v02 — feasibility concepts

8 November 2026. User requested Mean Girl perfume damage and CR7 ricochet ball with invulnerability; detailed rules remain proposals, not shipping approval. Orange Tabby/Maodie deferred.

[Design and technical feasibility](../../../docs/characters/F_SKILL_DESIGN_V02.md). Each 24-second clip: 0–6 normal speed, 6–12 same event at .25x (original action 1.1–2.6 s), 12–18 evade, 18–24 simultaneous F/W/D and return. All positions, impacts, damage numbers and input highlights are authored. Ball court is compressed and trajectories scripted; this does not establish actual-arena hit frequency or collision correctness. Perfume bottle is a temporary primitive blockout. The actual character models are reused; CR7 remains rigid without a leg kick rig.

Muted Electron rendering, H.264, no audio. Full decode verified; encoded sample sheets inspected. Corrected preview ball pivot from bottom origin to its measured centre to prevent spin below the floor. No production sources changed. No production tests claimed. Reproduce with Vite port 5196 and `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron tools/render-f-skill-v02.cjs`.
