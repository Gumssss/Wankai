# Orange tabby: integration complete, live playtest next

Updated 20 October 2026. The user approved complete v07 movement and requested implementation. **Prepared asset v02 and physical motion v06 are now playable locally as orange-tabby + cat-paws.** Appearance, contacts and controller were preserved during integration; no extra ability, generation or service charge was added. Nothing in this work is pushed, merged or released.

## Completed contract

- W/S continuously swings the paired detached paws with finite drive, coasting and reverse braking. A/D steers the common heading, including W+A, W+D, S+A and S+D. Opposite keys cancel their axis; P2 uses matching arrows.
- The body remains upright and seated, resting in a declared bounded 0.35-unit hover. Physical paw-floor support provides travel and the accepted S rise to about 2.20 base height; no body path or launch impulse is authored.
- No arms, wrists or connecting meshes. Two rigid paw pitch controls and a common root drive the accepted 25,000-triangle Tripo export, original 2K atlas and matching contacts. Virtual paw pivots are at body-base height 0.
- One ordinary stamina budget, pair-level attack gate and shared damage/clash rules apply. F/Right Shift is ignored for the cat.
- P1/P2 selection, independent instances, loading/failure fallback, help/HUD, pause/focus, reset/rematch and cameras are integrated. All 13 approved ordinary/recovery solver timelines match the implementation.

## Current preparation and review

Use the [live game](http://127.0.0.1:5173/). The full-window preparation stage places P1 left and P2 right, with choices above each player's actual-model preview. Each visible player marks Ready before shared Start/Save commits both drafts. Editing a player resets only that player's readiness; Back/Escape discards uncommitted changes. Solo shows P1; practice also configures its passive opponent. The roster has eight valid loadouts and 64 ordered pairings, including cat+paws.

The user prefers the live game for implemented changes. Retain approved v07 and existing actual-game recordings as evidence; do not make another recording the default presentation of an unchanged playable result. See [GAMEPLAY](GAMEPLAY.md), [HANDOFF](HANDOFF.md) and the [current preparation verification](../../selection-concepts/v04-preparation-stage/verification.json).

## Remaining work

Hands-on playable feel and balance remain open, including support-driven rise, reversal/recovery, camera comfort and two-player encounters. Loading latency, bundle size and sustained browser performance remain separate work. The integration checkpoint passed the full 132-test suite; later UI passes ran 14 then 17 focused checks and the build, not a new full physics suite. Run checks appropriate to any next change and preserve the dated verification scope.

## History to preserve

Keep original Tripo v01, prepared v01 and v02, rejected v05, accepted v06 motion and complete v07 presentation. Primitive v01–v04 research is superseded: its anatomy, offsets and transforms must not be copied into the production model. The [decision history](HISTORY.md) and versioned motion records retain previous review states and videos. No new appearance selection or Tripo spending is needed to continue the accepted cat.
