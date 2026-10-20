# Complete movement video v07

20 October 2026. The user accepted the corrected S lift (“this is correct”) and requested W, S, A, D and combined moves in the video. This presentation reuses unchanged actual-model v06 motion and prepared asset v02. No physics, geometry or runtime change was made.

[Review the complete video](../../previews/orange-tabby/review-v07.html) · [Primary MP4](../../previews/orange-tabby/orange-tabby-all-controls-v07.mp4) · [Same keyboard controls](../../previews/orange-tabby/try-v06.html)

| Encoded time | Input / action | Speed |
| --- | --- | --- |
| 0–3 s | W / forward paw drive | 1× |
| 3–9 s | S / paw support lifts the cat | 1× |
| 9–12 s | A / left steering | 1× |
| 12–15 s | D / right steering | 1× |
| 15–18 s | W+A / forward + left | 1× |
| 18–21 s | W+D / forward + right | 1× |
| 21–24 s | S+A / reverse + left | 1× |
| 24–27 s | S+D / reverse + right | 1× |
| 27–31.8 s | Accepted S support event, lower side view replay | 0.25× |
| 31.8–36.8 s | W / release / S reversal | 1× |
| 36.8–40.8 s | A / release / D reversal | 1× |
| 40.8–43.8 s | Opposite-key cancellation | 1× |
| 43.8–47.8 s | Declared drop / recovery / W resumes | 1× |
| 47.8–49.8 s | Low floating rest | 1× |

Each normal case includes preparation, a held key interval and release. Combined keys are genuinely simultaneous: 2.13 seconds per case. S is held for 2.87 seconds. Independent fixtures reset between chapters; full recovery is demonstrated in the dedicated S and drop/recovery chapters rather than every three-second diagonal shot. Existing combat v06 remains the matching supplemental video.

The complete file is H.264/YUV420p, 1600×900 at 30 fps, 1,494 frames and 49.8 seconds. All 35 presentation checks pass, including frame-by-frame source telemetry identity, input coverage, encoded timing, original/model preservation, full decode and installed/repository skill parity. Encoded samples were visually inspected. Browser playback is verified. The localhost Python server does not support byte-range seeking; the page therefore presents static timecodes and ordinary playback rather than unsupported chapter-jump buttons.

Both pipeline skill copies now require one self-contained main video with all four directions and all four combinations, live held-key highlights, visible physical response and checked encoded timecodes. Focused lift videos supplement this complete coverage.

Artifacts: `assets/concepts/orange-tabby/motion-v07/` contains the presentation plan, timecodes, coverage verification, skill update and browser evidence. `scripts/preview/assemble-orange-tabby-controls-v07.py` rebuilds from the unchanged v06 raw frames; `verify-orange-tabby-v07.py` verifies the delivery. The original Tripo source, prepared v02 model, v06 replay and accepted S event are preserved. The user subsequently approved this complete packet and requested integration. The same asset/controller is now playable locally; [GAMEPLAY.md](GAMEPLAY.md) records the implementation, current live review and remaining hands-on acceptance.
