// Historical preview inputs are pinned so later product defaults cannot change
// the camera studies or apply their reviewed display rotation a second time.
export const HISTORICAL_FIXED_CAMERA = Object.freeze({
  position: Object.freeze([30.88677987096443, 24, 13.237191373270472]),
  target: Object.freeze([0, 1.4, 0]),
  actorRotation: 0,
  fov: 55,
  near: 0.1,
  far: 120,
});

export function disableFixedDisplayRotation(view) {
  view.fixedDisplayRotation = 0;
  view.actors.rotation.y = 0;
  view.effectsRoot.rotation.y = 0;
}
