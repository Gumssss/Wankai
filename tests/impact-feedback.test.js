import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FEEDBACK, WEAPON_FAMILIES, classifyImpact, damagePopScale, recoilEnvelope, kickEnvelope, damageCameraKick } from '../src/impact-feedback.js';
import { ImpactFx, screenSizedRadius } from '../src/impact-fx.js';

const point = { x: 1, y: 2, z: 3 };
const camera = new THREE.PerspectiveCamera();
test('only accepted direct damage gets heavy feedback and +3 dB', () => {
  for (const weapon of Object.keys(WEAPON_FAMILIES)) {
    const result = classifyImpact({ type: 'hit', damage: 22, weapon });
    assert.equal(result.heavy, true); assert.equal(result.family, WEAPON_FAMILIES[weapon]);
    assert.equal(result.gain, 10 ** (3 / 20));
  }
  assert.equal(Object.keys(WEAPON_FAMILIES).length, 14);
  assert.equal(classifyImpact({ type: 'hit', damage: 21.99 }).heavy, false);
  for (const event of [{ type: 'hit', damage: 100, source: 'bleed' }, { type: 'hit', damage: 100, source: 'perfume' },
    { type: 'clash', damage: 100 }, { type: 'bleed-stack', stacks: 20 }, { type: 'heal', amount: 20 }, { type: 'hit', damage: 0 }]) {
    assert.equal(classifyImpact(event).heavy, false); assert.equal(classifyImpact(event).gain, 1);
  }
});
test('short feedback envelopes recover fully without residual deformation', () => {
  assert.equal(damagePopScale(0), .75); assert.equal(damagePopScale(.045), 1.15); assert.equal(damagePopScale(.12), 1);
  assert.equal(recoilEnvelope(0), 0); assert.equal(recoilEnvelope(.04), 1); assert.equal(recoilEnvelope(.2), 0);
  assert.equal(kickEnvelope(FEEDBACK.KICK_LIFE), 0);
  for (let age = 0; age < 1; age += .001) {
    assert.ok(recoilEnvelope(age) >= -.181 && recoilEnvelope(age) <= 1);
    assert.ok(kickEnvelope(age) >= 0 && kickEnvelope(age) <= 1);
  }
});
test('comic effects are bounded, pause without aging, reuse pooled meshes and clear', () => {
  const root = new THREE.Group(), fx = new ImpactFx(root);
  for (let i = 0; i < 100; i++) fx.hit({ point }, { heavy: true, family: 'paw' });
  assert.equal(fx.active.filter(e => e.category === 'burst').length, FEEDBACK.MAX_BURSTS);
  assert.ok(fx.active.length <= FEEDBACK.MAX_BURSTS + FEEDBACK.MAX_ACCENTS);
  const before = fx.active.map(e => e.life), meshes = new Set(fx.active.map(e => e.root));
  fx.update(0, camera); assert.deepEqual(fx.active.map(e => e.life), before);
  fx.update(.31, camera); assert.equal(fx.active.length, 0); assert.equal(root.children.length, 0);
  fx.hit({ point }, { heavy: false, family: 'paw' }); assert.ok(fx.active.some(e => meshes.has(e.root)));
  fx.clear(); assert.equal(root.children.length, 0); fx.dispose();
});
test('healing uses five motes from the authoritative source and pulses at the receiver', () => {
  const root = new THREE.Group(), fx = new ImpactFx(root);
  const players = [{ id: 0, p: { x: 0, y: 1, z: 0 }, scale: 3 }], original = JSON.stringify(players);
  fx.heal({ amount: 0, point, sourcePoint: { x: 5, y: 2, z: 0 }, player: 0 }); assert.equal(fx.active.length, 0);
  fx.heal({ amount: 4, point, sourcePoint: { x: 5, y: 2, z: 0 }, player: 0 });
  assert.equal(fx.active[0].root.children.length, 5); fx.update(.1, camera, players);
  assert.ok(fx.active[0].root.children[0].position.x < 5);
  assert.equal(JSON.stringify(players), original);
  fx.update(.16, camera, players); assert.equal(fx.active[0].kind, 'pulse');
  fx.update(.2, camera, players); assert.equal(fx.active.length, 0); fx.dispose();
});


test('burst contrast and screen sizing remain readable at different distances; clashes use cool sparks',()=>{
 const camera=new THREE.PerspectiveCamera(55,16/9,.1,300),fx=new ImpactFx(new THREE.Group());
 for(const distance of [10,30]){
   camera.position.set(0,0,distance);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const height=2*distance*Math.tan(55*Math.PI/360);
   assert.ok(Math.abs(screenSizedRadius(camera,{x:0,y:0,z:0},.001)/height-.025)<1e-6);
   assert.ok(Math.abs(screenSizedRadius(camera,{x:0,y:0,z:0},100)/height-.06)<1e-6);
 }
 fx.hit({point},{heavy:false,family:'ball'});
 assert.equal(fx.active.length,1,'small ball hits do not borrow the heavy ring');
 const burst=fx.active[0];assert.equal(burst.root.children[0].material.color.getHex(),0x2b1a10);
 fx.clash({point});const clash=fx.active.at(-1);
 assert.equal(clash.kind,'clash');assert.equal(clash.maxLife,.12);
 assert.equal(clash.root.children[0].material.color.getHex(),0x7e93a8);fx.dispose();
});


test('every positive damage amount produces a bounded camera kick that grows with damage',()=>{
 assert.equal(damageCameraKick(0),null);assert.equal(damageCameraKick(-1),null);assert.equal(damageCameraKick(NaN),null);
 let previous={angle:0,translation:0,duration:0};
 for(const damage of [.25,1,2,8,22,30]){
   const kick=damageCameraKick(damage);assert(kick);
   for(const field of ['angle','translation','duration'])assert(kick[field]>previous[field]);
   assert.equal(kickEnvelope(kick.duration,kick.duration),0);
   previous=kick;
 }
 assert.deepEqual(damageCameraKick(1000),damageCameraKick(30));
});

test('bleeding status follows authoritative stacks, freezes, stays bounded and clears at KO/reset',()=>{
 const fx=new ImpactFx(new THREE.Group()),camera=new THREE.PerspectiveCamera();
 const p={id:0,characterId:'dudu',p:{x:0,y:1,z:0},scale:3,health:80,bleedStacks:1};
 fx.updateBleeding([p],.3,camera);const status=fx.bleeding.get(0);assert(status);
 assert.equal(status.drips.children.filter(c=>c.visible).length,3);
 const before=status.drips.children.map(c=>c.position.toArray());fx.updateBleeding([p],0,camera);
 assert.deepEqual(status.drips.children.map(c=>c.position.toArray()),before);
 p.bleedStacks=100;fx.updateBleeding([p],.1,camera);assert.equal(status.drips.children.filter(c=>c.visible).length,6);
 fx.updateBleeding([p],.1,camera,true,true);const still=status.drips.children[0].position.toArray();
 fx.updateBleeding([p],.3,camera,true,true);assert.deepEqual(status.drips.children[0].position.toArray(),still);
 p.health=0;fx.updateBleeding([p],.1,camera);assert.equal(fx.bleeding.size,0);
 p.health=80;fx.updateBleeding([p],.1,camera);fx.clear();assert.equal(fx.bleeding.size,0);fx.dispose();
});
