# Move videos and review decisions

## Mandatory video presentation

For a task that proposes or changes character motion, present the moves through video before their runtime implementation. This includes standard movement reused by a new character, simultaneous inputs, attacks, abilities and transitions. After implementation, capture and retain actual gameplay footage of the same behavior. Images, prose and an interactive prototype supplement this motion evidence; none replaces it. These requirements do not add motion work to a reference-only, reconstruction-input-only or UI-only request.

Separate evidence capture from user-facing delivery. When the user asks to inspect the implemented game instead of another recording, open the live game and summarize the relevant verification. Keep footage available in the records without forcing it into the reply or requiring the user to watch it. Before-implementation motion approval and hands-on acceptance remain distinct.

An appearance-only request does not require inventing gameplay. For an unchanged move, a matching previously approved video can be reused with its model/controller version identified. Update affected segments when geometry or behavior changes enough to alter the action.

Before final modeling, use a cheap blockout, solver replay or authored concept to explain the intended action. Investigate unfamiliar mechanics with functional simulation before locking geometry. A standard controller may only need a short compatibility video; it is not exempt from video presentation.

## What the video must show

The user selected the **beagle functional v07 demonstration format** as the standard for character motion reviews. In Wankai, the supplied example is `beagle-functional-combat-v07.mp4`: vertical strike, horizontal strike and sword clash, each at normal speed followed by a 0.25× replay of the same recorded event. Its reference delivery is 1600×900 at 30 fps; adapt resolution when needed while preserving the evidence below.

- Use a compact live W/A/S/D diagram (or the game's actual controls), with every held key highlighted, including combined inputs. Keep the move/chapter and playback speed legible. Distinguish ordinary actions from abilities.
- Leave most of the frame for the character, weapon, opponent and floor. Prefer thin title/phase bands and small HUD elements over large explanatory panels. Keep shared stamina and opponent health visible when applicable; show recorded damage, impact flashes, deflection and recoil.
- Make the causal chain visible: **input → weapon motion → contact → body response or damage → recovery**. Show ground-support cues and a world-space travel trace. For a lift move, show the resting-height reference, paw/weapon-floor contact, ascent, clear airborne separation, descent and return to control. A small hover/bounce does not demonstrate a requested launch.
- Preserve a stable floor/grid and camera height through the lift; horizontal tracking is allowed. Do not follow vertical body motion so closely that ascent becomes ambiguous. Frame the complete action and use a lower side-view replay to reveal leverage/contact. Keep direction and scale comparable for comparisons; identify separate resets.
- Show preparation, active motion, release/reversal and useful recovery at **1× first**. Then replay the same critical contact or support phase at a clearly labeled slower speed (typically 0.25× for impacts, 0.5× for broader movement). Slow motion supplements normal speed; it must not use a different, stronger setup.
- Cover all relevant simultaneous inputs, interruptions, expiry, landing and ability lifecycle. A single chaptered video can cover multiple actions.
- Label authored concept, blockout simulation, solver replay and actual gameplay accurately. Disclose external test launches, scripted travel and render-only floor adjustments. Never use them as proof of input/contact-driven lift.
- After implementation, capture matching actions in the actual game and compare with the approved preview. Save playable files/links; inspect the encoded framing, key timing, normal/slow speed labels, feedback and successful playback. Record timecodes, exact model/controller versions and review decisions.

If video generation/capture is unavailable, report the missing deliverable and continue independent permitted work. Do not pass the motion review using only static poses, text or an interactive scene.

## Complete movement coverage

For a movement review, deliver **one self-contained main movement video** with every ordinary direction and valid simultaneous movement combination. Present it before implementation unless that exact review is already approved. A focused clip of the newly changed action is additional evidence; showing only that clip or splitting a required direction into an optional second clip does not complete the movement review. After integration, retain the matching actual-game coverage and honor the selected live-game or video delivery format.

For Wankai, the mandatory normal-speed matrix is **W, S, A, D, W+A, W+D, S+A and S+D**. Label each case separately, highlight every held key, and hold the input long enough to show the weapon action and resulting travel, turn or support/lift. Combined cases must show genuinely simultaneous inputs on the same fighter, not successive single-key shots. Include release/reversal, recovery and opposite-key cancellation as additional chapters; they do not substitute for any of the eight cases. Adapt this coverage to the actual bindings and combinations in another game.

Before presenting the main video, record a coverage checklist with encoded timecodes for every required case and verify its actual held-input interval and visible response. Present that complete file prominently for the required motion review, even when the user is discussing just W/S or one lift/attack. Preserve already accepted motion while fixing coverage or presentation. Reuse unchanged evidence for subsequent UI-only work.

## Gameplay contract before the video

Define ordinary actions and special abilities separately. Identify moving/striking surfaces, joints, body response, source of locomotion/lift, contact/hurt shapes and movement ownership. Estimate geometry-dependent reach, attachment clearance and support leverage before production proportions are locked.

Specify input combinations, release/reverse behavior and recovery. For abilities, state activation, duration, resource source, cancellation/interruption, expiry, rearming/cooldown and interaction with normal input. Do not introduce global balance changes merely to make a new character work.

For Wankai, cover W, S, A, D, W+A, W+D, S+A and S+D, release/reversal, ground support and travel, vertical/horizontal damage, blocks, a clash and recovery. Add ability activation, relevant combinations, interruption/expiry and landing. In a different game, use its actual action matrix instead of imposing WASD semantics.

A prescribed body path or test launch can explain a pose but cannot prove contact-driven travel. A finite hinge motor, passive hinge and fixed relative-angle animation produce different control behavior; identify the one being demonstrated.

When the selected move requires support-driven lift, verify the physical chain as well as its readability: contact must precede the supporting upward impulse, the body must rise visibly above its rest height, and release/landing must recover. Measure height from the floor and from the resting pose. Declared idle hover is separate from the contact-driven rise. If the user cannot see the requested lift, return to leverage/controller and camera evidence even when numerical checks passed. Preserve that character's agreed input mapping rather than assigning every character the beagle's controls or dimensions.

## Review milestones

Apply only the milestones in the requested stage/range; the table does not authorize later stages. Prepare concrete review artifacts first, then request a genuinely missing decision before dependent work. Record artifact/version, user instruction, accepted scope and constraints. Reuse existing approvals and delegated choices. Combine reviews when the same completed artifact answers them together; avoid repeated permission for routine cleanup, export or tests. For a stage-only endpoint, deliver the artifact and checkpoint without requiring approval to proceed to an unrequested stage.

| Review | Concrete result | Decision covered |
| --- | --- | --- |
| A Direction | Selected image/reference and brief with identity locks and gameplay role. | Character direction and intended ordinary/ability distinction. |
| B Motion | Labeled move videos, demonstrated functions, dimensions and unproven mechanics. | New or changed motion before runtime implementation/final geometry. |
| C Reconstruction | Exact clean front/side/back images, selected Tripo multi-view operation and spending scope. | Inputs and operation, not an unseen output's appearance. |
| D Base | Actual downloaded textured 3D candidate and proposed Blender edits. | Selected base appearance. |
| E Asset | Reimported runtime asset, viewer, move videos/extreme checks and measured report. | Finished asset for integration. |
| F Playable | Actual local game, retained gameplay evidence, test results and known limitations; present through the user's selected review format. | Playable behavior and recovery; balance can remain a stated trial. |

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
