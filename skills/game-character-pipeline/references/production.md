# Reference to production asset

Read only the relevant sections for the requested stage/range: reconstruction images, Tripo, Blender or engine integration. These are independently deliverable stages. Retain a checkpoint at the requested endpoint rather than automatically starting the next section. The selected identity, approved motion contract and accepted Tripo source remain authoritative across stages; an approved-base edit or integration does not restart generation.

## Reconstruction images

Always prepare three clean views—front, one side and back—before generating a new model in Tripo. This is the user's required workflow, even when the service could accept a single image. Create the views from the selected seed, not independent redesigns for each angle. Reuse matching approved views and generate missing ones. Keep proportions, markings, clothing, pose, style, camera magnification and illumination consistent. Expose moving parts and attachment areas; avoid unnecessary overlap between weapons/body parts that must later separate. Inspect generated hidden views for invented or contradictory details before submission.

Separate a design-review sheet from machine input. A labeled turnaround or collage can explain the design to the user, but submit individual clean subject images in the selected Tripo mode's expected slots. Avoid cropped extremities, extra characters, labels, dramatic perspective and obstructed parts. Use background/alpha appropriate to the actual tool requirements; inspect the resulting files rather than trusting prompt wording.

Inspect the current Tripo UI or official documentation, then prepare and map the required views:

- Front: preserve the selected face, expression, silhouette and visible markings. A selected near-frontal or front three-quarter view may be reused without regenerating its identity.
- Side: reveal depth, appendage thickness, seated/standing posture and attachment gaps. Keep the world pose and relative part positions fixed while changing the camera; do not turn individual parts toward the camera just to show them. Record natural occlusion in a true profile and add a useful extra angle or component view if essential geometry remains hidden.
- Back: specify the rear silhouette, markings, tail and backs of weapons consistently with the front and side. Treat newly inferred hidden details as reconstruction proposals, not evidence from an existing mesh.
- Submit individual front/side/back files through a compatible multi-view mode for one model. Verify which side each slot expects. Distinguish multi-view from batch-image generation, which creates separate models and can multiply the charge. If the current tool cannot accept the set, report the concrete gap before a paid submission rather than silently falling back to one image.
- Add a fourth view when relevant asymmetry or occlusion justifies it and the selected mode supports it. A design-review sheet can contain additional views but does not replace the individual inputs.
- If a feature is intentionally compact or simplified for generation, document its exact planned Blender correction and the approved functional dimensions.
- Reuse an already selected Tripo source for edits instead of making a replacement automatically.

Tripo's [multi-view help](https://www.tripo3d.ai/help/features/how-to-use-multi-view-input-effectively) describes consistency across views and current slot options. The front/side/back rule above is a user preference, not a claim that Tripo universally requires three images. Recheck supported modes, settings and prices before a paid operation.

Review the exact input packet and generation/spending scope before submitting. Image approval does not select an unseen 3D reconstruction.

## Required Tripo generation

Generate each new production character base in Tripo. Access it with available authorized tooling, including the signed-in browser through computer use. Do not require a particular automation bridge or an API key when browser access already works. Follow the chosen tool's operating instructions.

Use the current selected settings, preserve approved credit authorization and record observed charges. Start with the selected direction rather than speculative batches. If another attempt is needed, diagnose the failure and change the relevant input/settings deliberately. Stop paid retries when there is no justified correction or the authorized budget/scope would be exceeded; prepare a concrete alternative for the user instead.

Preserve the original downloaded GLB or other export before modification. Record the input files, prompts, mode/version, operation ID, source URL, date, output/hash and charges. Inspect the actual model, including hidden surfaces, fused moving parts, silhouette, textures, material count, triangles, file size and whether bones/animations exist.

Open the real textured candidate in a browser viewer or Blender for user review. State what is shown: concept image, service preview, downloaded mesh or optimized runtime export. Do not use a pleasing concept image as evidence that the mesh is good.

When the base is selected, prefer repair or segmentation for controllable local edits. Regenerate when the underlying shape is wrong or repair is impractical, with the changed direction and spending scope addressed. Do not repaint or regenerate an approved face/body just to change one weapon feature.

If Tripo is unavailable, preserve the brief, approved inputs and motion work and report the access gap. Do not create a finished Blender-only base or substitute another generator unless the user changes the required route. A previously approved Tripo base does not require another generation for every revision.

## Blender refinement and rigging

Keep the selected original untouched. Save a working version and make the authorized edits while retaining identity locks. Repair reconstruction defects, normals, accidental internal geometry and inappropriate open boundaries. Close intended solid volumes; deliberately open clothing or other valid surfaces need not become watertight.

Measure and optimize toward the project's budget. Preserve silhouette, paint and useful deformation topology; inspect texture rebaking/reprojection. Record actual triangles, texture dimensions, materials/draw groups and file size. A reduced byte count is not a frame-rate or memory benchmark.

Finalize affected topology before production skinning. Choose the smallest hierarchy suited to the action, with stable names, useful pivots, clear world scale and forward/up axes. Preserve correct bind transforms, document rest orientations, normalize weights and respect engine influence limits. Automatic weights need inspection/cleanup; rigid components may use intentional rigid weights while deforming joints need suitable transitions.

Test required extreme poses, continuous sweeps and deployment/retraction. Verify attachments and body clearance. Do not add folding joints, fur or passive motion merely because the surface should look soft.

Document ownership for root/body motion, physical weapon controls, authored clips and cosmetic controls. Exclude runtime-controlled bones from competing baked tracks. Blender constraints and drivers need baking or explicit runtime implementation; they are not automatically a live solver after export.

Fit simplified weapon contacts and hurt shapes from the selected asset. Establish the allowance for cosmetic secondary motion or include it in the contact transform. Do not conceal a mismatched physical weapon under unrelated animated art.

Export the selected runtime meshes/rig using the game's interchange format, GLB for Wankai. Keep the editable source and textures packed or recoverably archived. Reimport with the actual engine/loader, exercise bones and clips, and compare skinned positions/attachments with physical geometry. Check independent cloned skeletons/materials for multiple players. Provide videos of the rigged moves and a viewer before the integration review.

## Runtime integration and verification

Reuse the accepted controller and measured dimensions. Anatomical weapons need correct sockets and contact-point derivatives rather than a floating weapon's offset. Position, velocity and impulse response must agree with the rendered pose, including transitions and secondary motion. Validate sweeps between poses where fast movement can skip contacts.

Use the smallest suitable loadout/character entry. Include the requested selection/loading/fallback flow, P1/P2 instances and materials, controls/help/HUD, pause/focus handling, rematch/reset and camera bounds. Do not build a general equipment system or change other fighters' rules unless requested.

Account deliberately for pair-level motors, stamina, damage and repeat-hit gates when multiple appendages form one weapon. Specify ability activation, duration, cost source, interruption, cancellation, expiry, rearming and compatibility with ordinary actions; preserve shared defaults outside the approved scope.

For character/motion integration, verify relevant positive hits and near misses, contacts, movement, reversal, abilities, recovery, modes and opponent combinations. Run meaningful focused tests, the required regression suite and build. Inspect actual game-scale appearance and camera behavior, then capture and retain gameplay footage corresponding to the approved moves. When the user prefers inspecting the implemented game, open it instead of presenting another recording; keep the footage linked in the records.

For UI-only selection/navigation changes with unchanged character assets, controls and contacts, verify the actual screen, interaction/readiness/cancellation flow, focus/navigation, responsive bounds, preview loading and return to the arena. Use screenshots and relevant focused checks/build; reuse existing motion evidence without another Tripo/Blender pass or new movement recording. Keep project-specific screen layouts in repository docs rather than adding universal character rules.

Update the current model/runtime pointers, source and export records, commands/results and known approximations. Keep visual acceptance, technical evidence and hands-on acceptance separate. Publishing is a distinct delivery state and follows existing user authorization.
