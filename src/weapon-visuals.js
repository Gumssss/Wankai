import { Quaternion, Vector3 } from 'three';

const UP = new Vector3(0, 1, 0);
const Z_AXIS = new Vector3(0, 0, 1);

// A direction vector alone cannot define roll at the downward pole. Preserve
// both input angles so wide blades and hammer heads never acquire a pole flip.
export function setWeaponRotation(rotation, theta, phi, pitch = new Quaternion()) {
  return rotation.setFromAxisAngle(UP, -phi)
    .multiply(pitch.setFromAxisAngle(Z_AXIS, -theta));
}
