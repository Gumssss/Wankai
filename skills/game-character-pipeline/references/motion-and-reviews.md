# Move videos and review decisions

## Mandatory video presentation

Every proposed or changed character move must be presented through video before its runtime implementation. This includes standard movement reused by a new character, simultaneous inputs, attacks, abilities and transitions. After implementation, provide actual gameplay footage of the same behavior. Images, prose and an interactive prototype supplement the video; none replaces it.

An appearance-only request does not require inventing gameplay. For an unchanged move, a matching previously approved video can be reused with its model/controller version identified. Update affected segments when geometry or behavior changes enough to alter the action.

Before final modeling, use a cheap blockout, solver replay or authored concept to explain the intended action. Investigate unfamiliar mechanics with functional simulation before locking geometry. A standard controller may only need a short compatibility video; it is not exempt from video presentation.

## What the video must show

- Label the move, input/action, travel/turn direction and ordinary-versus-ability role.
- Show which body and weapon parts move and how attachments stay connected. Use a side, top or rear view when needed to explain leverage, coverage or facing.
- Show preparation, active motion and return to useful control at normal speed. Include release/reversal, interruptions, expiry, landing and recovery where relevant. Add slow motion for unclear contacts without replacing normal speed.
- Cover relevant simultaneous inputs, not only isolated keys. A single video with clearly labeled time segments can cover multiple actions.
- Keep camera direction and scale comparable when comparing options; identify independent shots/resets.
- Label authored concept, blockout simulation, solver replay and actual gameplay distinctly. Disclose scripted travel, test-launch forces or pose-viewer floor adjustments where they affect interpretation.
- After implementation, capture the actual game with matching input examples and enough framing to judge contact and recovery. Compare any deviation with the approved preview.
- Save a playable file/link and inspect the encoded result for framing, timing, input captions and successful playback. Record move/input coverage, timecodes, model/controller versions, simulation type and review decision.

If video generation/capture is unavailable, report the missing deliverable and continue independent permitted work. Do not pass the motion review using only static poses, text or an interactive scene.

## Gameplay contract before the video

Define ordinary actions and special abilities separately. Identify moving/striking surfaces, joints, body response, source of locomotion/lift, contact/hurt shapes and movement ownership. Estimate geometry-dependent reach, attachment clearance and support leverage before production proportions are locked.

Specify input combinations, release/reverse behavior and recovery. For abilities, state activation, duration, resource source, cancellation/interruption, expiry, rearming/cooldown and interaction with normal input. Do not introduce global balance changes merely to make a new character work.

For Wankai, cover W, S, A, D, W+A, W+D, S+A and S+D, release/reversal, ground support and travel, vertical/horizontal damage, blocks, a clash and recovery. Add ability activation, relevant combinations, interruption/expiry and landing. In a different game, use its actual action matrix instead of imposing WASD semantics.

A prescribed body path or test launch can explain a pose but cannot prove contact-driven travel. A finite hinge motor, passive hinge and fixed relative-angle animation produce different control behavior; identify the one being demonstrated.

## Review milestones

Prepare concrete review artifacts first, then request the decision needed before dependent work. Record artifact/version, user instruction, accepted scope and constraints. Reuse existing approvals and delegated choices. Combine reviews when the same completed artifact answers them together; avoid repeated permission for routine cleanup, export or tests.

| Review | Concrete result | Decision covered |
| --- | --- | --- |
| A Direction | Selected image/reference and brief with identity locks and gameplay role. | Character direction and intended ordinary/ability distinction. |
| B Motion | Labeled move videos, demonstrated functions, dimensions and unproven mechanics. | New or changed motion before runtime implementation/final geometry. |
| C Reconstruction | Exact generation images, selected Tripo operation and spending scope. | Inputs and operation, not an unseen output's appearance. |
| D Base | Actual downloaded textured 3D candidate and proposed Blender edits. | Selected base appearance. |
| E Asset | Reimported runtime asset, viewer, move videos/extreme checks and measured report. | Finished asset for integration. |
| F Playable | Actual local game and gameplay videos, test results and known limitations. | Playable behavior and recovery; balance can remain a stated trial. |

Image approval does not imply rig or playable acceptance. Spending authorization does not imply appearance approval. Silence, dismissal or elapsed time does not supply required approval. Independent read-only checks and already authorized reversible work can continue while a decision is pending.

Do not reopen accepted decisions merely because an export or contact fit was corrected. Reopen the affected scope when visible identity, motion or required spending changes. Carry publishing authorization only within its actual scope.

## Spending and retry boundaries

Inspect current charges before submitting and honor the existing task/character authorization. Do not ask for credit approval again within a granted scope. Authorization for another character or for base generation is not automatically an unlimited budget for unrelated operations.

Record attempted inputs/settings, observed charges and results. Before another paid retry, identify the cause and the deliberate correction. Stop unproductive repeated spending or attempts outside the authorized scope and prepare a concrete decision with alternatives. A user can authorize a broader batch or budget explicitly; do not invent one.

## Return to the affected stage

| Report | Investigate or revise |
| --- | --- |
| Wrong face, expression, style or proportions | Seed/brief and reconstruction inputs; keep approved identity features. |
| Fused parts, missing hidden geometry or bad base volume | Base inspection, segmentation, repair or corrected Tripo inputs. |
| Clipping joints, bad skinning or wrong axes | Blender rig/topology and import transforms. |
| Weak support, conflicting inputs, excessive coverage or lying down | Gameplay contract, geometry/leverage, controller and recovery; make a revised motion video. |
| Model looks right in a viewer but contacts do not match | Runtime attachment transforms, measured profiles and point velocities. |
| Tests pass but the user rejects the action | Reproduce the specific state/input/view, address the observed behavior and capture the revised footage. |

Do not change approved art to hide a control failure or move only the render mesh to disguise a physical error. Preserve the accepted checkpoint and label superseded experiments.
