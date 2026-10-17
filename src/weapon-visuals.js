import { Quaternion, Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

// Grip, longitudinal axis, and blade facing are independent import decisions.
export const WEAPON_VISUALS = Object.freeze({
  polearm: { axis: [0.556405, 0.627597, -0.544551], butt: [-0.391, 0.014, 0.418] },
  sword: { axis: [-0.703801, -0.710392, -0.002717], butt: [0.485, 0.977, 0] },
  hammer: { axis: [0, 1, 0], butt: [0, 0, 0] },
});

// A direction vector alone cannot define roll at the downward pole. Preserve
// both input angles so wide blades and hammer heads never acquire a pole flip.
export function setWeaponRotation(rotation, theta, phi, pitch = new Quaternion()) {
  return rotation.setFromAxisAngle(UP, -phi)
    .multiply(pitch.setFromAxisAngle(Z_AXIS, -theta));
}
