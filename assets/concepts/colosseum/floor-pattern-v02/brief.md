# Roman-inspired arena floor texture v02

The creator authorized implementing the floor-pattern plan on 21 October 2026. Reuse the existing Colosseum model, current cameras and circular solver. Deliver a dedicated floor material, an actual-game comparison and the working game.

Visual target: floor-pattern-v01 concept. Narrow the faded terracotta/ochre meander border, keep sparse laurel accents and a mostly plain pale sandy centre. This is Roman-inspired game ornament, not a historical reconstruction.

Generate a standalone opaque square 2048px top-down base-color texture using built-in imagegen. Uniform albedo only: no perspective, baked shadows, scene, UI or characters. Keep the complete circular design inside the square with cream corners. Source and prompt remain beside this brief.

Runtime: clone only floor geometry for planar XZ UVs and give it an independent material/map. Preserve the embedded atlas on the walls. Use sRGB, mipmaps, linear filtering and capped anisotropy. Retain the original floor until texture loading succeeds; release canceled loads and owned resources. No extra collision or raised geometry.

Validate in fixed, split, solo and practice modes, with loading fallback and cleanup checks, relevant regressions and production build. Inspect actual lighting, near-edge cropping, contact readability and texture sharpness. No Git delivery authorized.

Completed locally: texture installed in all modes, actual-game comparison and per-mode captures saved, 158 tests/build/diff check pass. See `manifest.json`, `verification.json` and `actual-geometry-verification.json`. Source remains 1254px native; runtime was normalized to 2048px, with no claim of additional generated detail. No model/camera/physics changes or Git delivery.
