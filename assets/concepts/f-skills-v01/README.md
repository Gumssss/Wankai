# F skills v01 — local review packet

[Design](../../../docs/characters/F_SKILL_DESIGN.md) · [Motion record and exact timecodes](../../../docs/characters/F_SKILL_MOTION.md) · [Main video](movement-review.mp4).

Proposal only. Selected: none. Implemented: none. Existing five skills unchanged. Four 44-second silent authored 3D concepts use approved runtime models; scripted effects are not solver evidence. The main 5:52.37 video includes complete reused normal-control gameplay after 2:56, with clear historical-footage labels. All MP4s fully decoded successfully. Final decoded chapter sheets and assembly framing inspected.

Reproduce: run Vite on 127.0.0.1:5196, then `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron tools/render-f-skill-concepts.cjs`. Run `python3 tools/verify-f-skill-videos.py` for full decode checks and contact sheets. `timeline.json` records exact authored chapters, `media-verification.json` individual clip hashes, `assembly.json` final boundaries/hash, and `reuse-seek-checks.json` visually checked seek samples inside historical key intervals. The latter are not exact chapter boundaries.

No production geometry, controller or global balance edits; no push, merge or release. User selection is the next step before implementation and actual-game skill validation.
