import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh, PlaneGeometry, MeshBasicMaterial, Vector3} from 'three';
import {updateDeathPortrait} from '../src/death-portrait.js';

test('death portrait rises above the body and turns toward a moving winner', () => {
  const mesh = new Mesh(new PlaneGeometry(), new MeshBasicMaterial());
  const dead = {p:{x:2,y:.59,z:3}};
  let previousY = -Infinity;
  for (const elapsed of [0,.3,1,3]) {
    const winner = {p:{x:7,y:.59,z:-2}};
    updateDeathPortrait(mesh, dead, winner, 1.7, elapsed);
    assert.ok(mesh.position.y >= previousY);
    previousY = mesh.position.y;
    const facing = new Vector3(0,0,1).applyEuler(mesh.rotation);
    const expected = new Vector3(5,0,-5).normalize();
    assert.ok(facing.dot(expected) > .9999);
  }
  updateDeathPortrait(mesh, dead, {p:{x:-5,y:2,z:8}}, 1.7, 4);
  const facing = new Vector3(0,0,1).applyEuler(mesh.rotation);
  assert.ok(facing.dot(new Vector3(-7,0,5).normalize()) > .9999);
  assert.ok(mesh.material.opacity > 0 && mesh.material.opacity < 1);
  assert.ok(mesh.position.y - .85 > dead.p.y + 1.7 - .59);
  mesh.geometry.dispose(); mesh.material.dispose();
});
