// Verify the Blender smoke export using the same Three.js dependency as Wankai.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { AnimationMixer, LoopOnce, Vector3, REVISION } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const input = new URL('../../output/blender/environment-check/setup-skin-test.glb', import.meta.url);
const bytes = await readFile(input);
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const meshes = [];
gltf.scene.traverse(object => { if (object.isSkinnedMesh) meshes.push(object); });
if (meshes.length !== 1 || !gltf.animations.length) throw new Error('Expected one skinned mesh and an animation');
const mesh = meshes[0];
if (!mesh.skeleton.bones.some(bone => bone.name === 'test_ear')) throw new Error('Ear bone did not survive export');
const mixer = new AnimationMixer(gltf.scene);
const action = mixer.clipAction(gltf.animations[0]).setLoop(LoopOnce, 1);
action.clampWhenFinished = true;
action.play();
function verticesAt(time) {
  mixer.setTime(time);
  gltf.scene.updateMatrixWorld(true);
  mesh.skeleton.update();
  return Array.from({ length: mesh.geometry.attributes.position.count }, (_, index) =>
    mesh.getVertexPosition(index, new Vector3()).applyMatrix4(mesh.matrixWorld));
}
const start = verticesAt(0), moved = verticesAt(gltf.animations[0].duration / 2);
const displacement = Math.max(...start.map((vertex, index) => vertex.distanceTo(moved[index])));
if (!(displacement > 0.05)) throw new Error('Exported animation did not deform the mesh');
const report = {
  three_revision: REVISION,
  input: fileURLToPath(input),
  skinned_meshes: meshes.length,
  bones: mesh.skeleton.bones.map(bone => bone.name),
  animations: gltf.animations.map(clip => clip.name),
  maximum_test_vertex_displacement: displacement,
  status: 'passed',
};
await writeFile(new URL('../../output/blender/environment-check/three-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
