import * as THREE from 'three';
import { CONFIG, arenaScaleForMode, WEAPONS, weaponStats, staffFrame, fighterHeading, clamp } from './physics.js';
import { WEAPON_VISUALS, setWeaponRotation } from './weapon-visuals.js';
import { createFreeCameraRig, updateFreeCamera, resetFreeCamera, orbitFreeCamera, zoomFreeCamera, turnFreeCamera } from './free-camera.js';
import { BEAGLE } from './beagle-profile.js';
import {beagleEarYaw} from './beagle-skill.js';
import { instantiateBeagle, poseBeagle, makeBeagleFallback } from './beagle-model.js';
import { weaponPointFrame, v3 } from './physics.js';
import {resolveLoadout} from './loadouts.js';
import {CAT} from './orange-tabby-profile.js';
import {instantiateOrangeTabby,poseOrangeTabby,makeOrangeTabbyFallback,poseOrangeTabbyFallback} from './orange-tabby-model.js';
import { ARENA_PROFILE } from './arena-profile.js';
import { attachArenaModel, prepareArenaCamera, restoreArenaOpacity } from './arena-model.js';
import { FIXED_CAMERA } from './fixed-camera.js';
import {applyArenaFloorTexture,setArenaFloorPatternEnabled,disposeArenaFloorTexture} from './arena-floor.js';

const UP = new THREE.Vector3(0, 1, 0);
const PALETTE = [0xc4684f, 0x568d92];
const vec = p => new THREE.Vector3(p.x, p.y, p.z);
const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...extra });

export class ArenaView {
  constructor(renderer, camera, mode = 'duel', weapon = 'polearm', secondWeapon = 'polearm') {
    // R3F owns the renderer, camera, frame loop and canvas. These groups keep
    // the existing meshes and their appearance while R3F manages each layer.
    this.arena = new THREE.Group();
    this.arenaGeometry = new THREE.Group();
    this.arena.add(this.arenaGeometry);
    this.actors = new THREE.Group();
    this.effectsRoot = new THREE.Group();
    this.meshRoot = this.arenaGeometry;
    this.renderer = renderer;
    this.camera = camera;
    this.solo = mode === 'solo';
    this.fixed = mode === 'duel-fixed';
    this.duel = mode === 'duel';
    // Apply one display basis to bodies, weapons, contacts, trails and impacts.
    // The circular physics arena and both players' control state stay shared.
    this.fixedDisplayRotation = this.fixed ? FIXED_CAMERA.actorRotation : 0;
    this.actors.rotation.y = this.effectsRoot.rotation.y = this.fixedDisplayRotation;
    this.loadouts=[resolveLoadout(weapon),resolveLoadout(secondWeapon)];
    this.weapon = this.loadouts[0].weaponId;
    this.secondWeapon = this.loadouts[1].weaponId;
    this.characterLoaded=new Set();
    this.swordPitch = new THREE.Quaternion();
    this.weaponLoaded = new Set();
    this.arenaScale = arenaScaleForMode(mode);
    this.arenaGeometry.scale.setScalar(this.arenaScale);
    this.environmentState = 'loading';
    this.colosseum = null;
    this.cameraBase = this.fixed ? new THREE.Vector3(...FIXED_CAMERA.position) : new THREE.Vector3(0, 15.4, 21);
    this.target = this.fixed ? new THREE.Vector3(...FIXED_CAMERA.target) : new THREE.Vector3(0, 0, -0.3);
    this.camera.position.copy(this.solo ? new THREE.Vector3(-4, 3, -4) : this.cameraBase);
    this.camera.lookAt(this.target);
    this.soloCamera = this.solo ? createFreeCameraRig(camera) : null;
    this.duelCameras = this.duel ? [0, 1].map(() => createFreeCameraRig(undefined, true)) : [];
    this.particles = [];
    this.rings = [];
    this.trailTime = 0;
    this.shake = 0;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.makeLighting();
    this.makeArena();
    this.meshRoot = this.actors;
    this.players = this.solo ? [this.makeFighter(0)] : [this.makeFighter(0), this.makeFighter(1)];
  }

  mesh(geometry, mat, parent = this.meshRoot) {
    const object = new THREE.Mesh(geometry, mat);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  makeLighting() {
    this.arena.add(new THREE.HemisphereLight(0xfff9e9, 0x849079, 3));
    const sun = new THREE.DirectionalLight(0xffedcd, 3.4);
    const largeArena = this.arenaScale > 1;
    sun.position.set(largeArena ? -20 : -8, largeArena ? 30 : 15, largeArena ? 20 : 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const shadowExtent = largeArena ? 25 : 11;
    Object.assign(sun.shadow.camera, { left: -shadowExtent, right: shadowExtent, top: shadowExtent, bottom: -shadowExtent, near: 1, far: largeArena ? 85 : 45 });
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0003;
    sun.shadow.radius = 4;
    this.arena.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(7, 5, -8);
    this.arena.add(fill);
  }

  floorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const c = canvas.getContext('2d');
    c.fillStyle = '#cdc1a1';
    c.fillRect(0, 0, 1024, 1024);
    let seed = 771;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 18000; i++) {
      c.fillStyle = random() > 0.5 ? '#fff5db10' : '#514f2c0d';
      c.fillRect(random() * 1024, random() * 1024, random() * 2 + 0.5, random() * 2 + 0.5);
    }
    c.translate(512, 512);
    c.strokeStyle = '#f3e8c7a0'; c.lineWidth = 2;
    for (const radius of [414, 431]) { c.beginPath(); c.arc(0, 0, radius, 0, Math.PI * 2); c.stroke(); }
    for (let i = 0; i < 72; i++) {
      const angle = i / 72 * Math.PI * 2;
      const inner = i % 6 === 0 ? 392 : 402;
      c.beginPath(); c.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      c.lineTo(Math.cos(angle) * 410, Math.sin(angle) * 410); c.stroke();
    }
    c.lineWidth = 1.5; c.strokeStyle = '#aa9e7c65';
    c.beginPath(); c.arc(0, 0, 127, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0, 0, 136, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-40, -40); c.lineTo(40, 40); c.moveTo(-40, 40); c.lineTo(40, -40); c.stroke();
    c.lineWidth = 3;
    for (const x of [-1, 1]) for (const y of [-1, 1]) {
      c.beginPath(); c.moveTo(x * 23, y * 41); c.lineTo(x * 41, y * 23); c.stroke();
    }
    // Subtle stone seams, offset so they never look like a movement grid.
    c.strokeStyle = '#8e896518'; c.lineWidth = 1;
    for (let row = -3; row <= 3; row++) {
      c.beginPath(); c.moveTo(-512, row * 147); c.lineTo(512, row * 147); c.stroke();
      for (let col = -3; col <= 3; col++) {
        const x = col * 185 + (row % 2) * 92;
        c.beginPath(); c.moveTo(x, row * 147); c.lineTo(x, row * 147 + 147); c.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  makeArena() {
    const ground = this.mesh(new THREE.PlaneGeometry(200, 200), material(0xdddccb));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.81;
    ground.castShadow = false;
    const foundation = this.mesh(new THREE.CylinderGeometry(7.07, 7.2, 0.25, 96), material(0xa6a88e));
    foundation.position.y = -0.65;
    const base = this.mesh(new THREE.CylinderGeometry(6.8, 6.99, 0.57, 96), material(0xb8b398));
    base.position.y = -0.3;
    const top = this.mesh(new THREE.CircleGeometry(6.53, 96), material(0xffffff, { map: this.floorTexture() }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.004;
    top.castShadow = false;
    const ringMat = material(0xd7d1b7);
    const ring = this.mesh(new THREE.RingGeometry(6.48, 6.78, 96), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    ring.castShadow = false;
    for (let i = 0; i < 44; i++) {
      const angle = i * Math.PI * 2 / 44;
      const height = ARENA_PROFILE.weaponContactHeight;
      const block = this.mesh(new THREE.BoxGeometry(0.84, height, 0.38),
        material([0xd1ccb1, 0xc7c4a8, 0xdad3b7][i % 3]));
      block.position.set(Math.sin(angle) * 6.64, height * 0.5, Math.cos(angle) * 6.64);
      block.rotation.y = angle;
    }
    // Inlaid starting marks.
    for (const [x, color] of this.solo ? [] : [[-2.2, PALETTE[0]], [2.2, PALETTE[1]]]) {
      const mark = this.mesh(new THREE.RingGeometry(0.58, 0.62, 48), material(color, { transparent: true, opacity: 0.42 }), this.arena);
      mark.rotation.x = -Math.PI / 2; mark.position.set(x, 0.014, 0); mark.castShadow = false;
      const dash = this.mesh(new THREE.BoxGeometry(0.14, 0.01, 0.6), material(color, { transparent: true, opacity: 0.35 }), this.arena);
      dash.position.set(x < 0 ? -3.1 : 3.1, 0.015, 0); dash.castShadow = false;
    }
    this.banners = new THREE.Group();
    this.arenaGeometry.add(this.banners);
    this.makeBanner(-7.4, -1.7, PALETTE[0], -1);
    this.makeBanner(7.4, -1.7, PALETTE[1], 1);
    // Quiet vegetation and scattered stones give the ring a sense of place.
    const rockMat = material(0xa7ad94), grassMat = material(0x8f9e79);
    for (let i = 0; i < 19; i++) {
      const a = i * 2.39996, r = 7.45 + (i % 3) * 0.54;
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      const rock = this.mesh(new THREE.DodecahedronGeometry(0.17 + (i % 3) * 0.08), rockMat);
      rock.scale.set(1.3, 0.65, 1); rock.position.set(x, -0.71, z); rock.rotation.set(i, i * 0.3, 0);
      if (i % 2 === 0) {
        for (let j = 0; j < 4; j++) {
          const blade = this.mesh(new THREE.ConeGeometry(0.035, 0.3 + j * 0.08, 3), grassMat);
          blade.position.set(x + 0.25 + j * 0.06, -0.62, z + 0.07 * j);
          blade.rotation.z = (j - 1.5) * 0.2;
        }
      }
    }
  }

  setArenaModel(source) {
    if (this.disposed || this.colosseum) return false;
    const instance = attachArenaModel(source, this.arenaScale);
    this.arena.add(instance.root);
    this.colosseum = instance;
    this.arenaGeometry.visible = false;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material(0xdddccb));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.95 * this.arenaScale;
    ground.receiveShadow = true;
    this.arena.add(ground);
    this.environmentState = 'ready';
    return true;
  }

  showArenaFallback() { if (!this.colosseum && !this.disposed) this.environmentState = 'fallback'; }

  setArenaFloorTexture(texture,maxAnisotropy) {
    return !this.disposed && applyArenaFloorTexture(this.colosseum,texture,maxAnisotropy);
  }

  setArenaFloorPatternEnabled(enabled) { return setArenaFloorPatternEnabled(this.colosseum,enabled); }

  displayPoint(point) {
    const p = vec(point);
    return this.fixedDisplayRotation ? p.applyAxisAngle(UP, this.fixedDisplayRotation) : p;
  }

  prepareArenaCamera(camera, players) {
    const displayed = this.fixedDisplayRotation ? players.map(player => ({ p: this.displayPoint(player.p) })) : players;
    return prepareArenaCamera(this.colosseum, camera, displayed);
  }
  restoreArenaCamera() { restoreArenaOpacity(this.colosseum); }

  makeBanner(x, z, color, side) {
    const pole = this.mesh(new THREE.CylinderGeometry(0.042, 0.055, 3.5, 8), material(0x726d50), this.banners);
    pole.position.set(x, 1.0, z);
    const foot = this.mesh(new THREE.BoxGeometry(0.64, 0.2, 0.6), material(0xa3a68c), this.banners);
    foot.position.set(x, -0.66, z);
    const finial = this.mesh(new THREE.SphereGeometry(0.08, 12, 8), material(0xc9b78a), this.banners);
    finial.position.set(x, 2.78, z);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(side * 0.8, 0); shape.lineTo(side * 0.82, -1.27);
    shape.lineTo(side * 0.4, -1.03); shape.lineTo(side * 0.02, -1.28); shape.closePath();
    const cloth = this.mesh(new THREE.ShapeGeometry(shape), material(color, { side: THREE.DoubleSide }), this.banners);
    cloth.position.set(x, 2.6, z);
    const badge = this.mesh(new THREE.RingGeometry(0.15, 0.18, 32), material(0xe4d8b4, { side: THREE.DoubleSide }), this.banners);
    badge.position.set(x + side * 0.4, 2.13, z + 0.007);
  }

  makeFighter(id) {
    const loadout=this.loadouts[id],weaponType=loadout.weaponId,earWeapon=loadout.controller==='ears',pawWeapon=loadout.controller==='paws';
    const weapon = WEAPONS[weaponType];
    const root = new THREE.Group();
    this.actors.add(root);
    const bodyMat = material(PALETTE[id]);
    const skinMat = material(0xe7c199);
    const body = this.mesh(new THREE.SphereGeometry(1, 32, 24), bodyMat, root);
    body.scale.set(0.39, 0.55, 0.33);
    const head = this.mesh(new THREE.SphereGeometry(1, 32, 24), skinMat, root);
    head.scale.set(0.37, 0.4, 0.335);
    head.position.y = 0.76;
    const eyeMat = material(0x343a32);
    for (const side of [-1, 1]) {
      const eye = this.mesh(new THREE.SphereGeometry(0.037, 8, 8), eyeMat, root);
      eye.position.set(0.325, 0.83, side * 0.13);
      eye.castShadow = false;
    }
    const staff = new THREE.Group();
    this.actors.add(staff);
    const rod = this.mesh(new THREE.CylinderGeometry(weapon.radius * 0.83, weapon.radius, weapon.length, 12), material(0x775339), staff);
    rod.position.y = weapon.length / 2;
    const grip = this.mesh(new THREE.CylinderGeometry(0.099, 0.099, 0.38, 12), material(PALETTE[id]), staff);
    grip.position.y = 0.43;
    const cap = this.mesh(new THREE.CylinderGeometry(0.115, 0.096, 0.22, 12), material(0xd6c6a0, { metalness: 0.3, roughness: 0.55 }), staff);
    cap.position.y = weapon.length - 0.08;
    const tip = this.mesh(new THREE.SphereGeometry(0.107, 12, 10), material(0xd6c6a0), staff);
    tip.position.y = weapon.length;
    const fallbackHead = new THREE.Group();
    staff.add(fallbackHead);
    for (const collider of earWeapon||pawWeapon ? [] : weapon.colliders?.slice(1) || []) {
      const a = new THREE.Vector3(...collider.a), b = new THREE.Vector3(...collider.b);
      const direction = b.clone().sub(a);
      const part = this.mesh(new THREE.CapsuleGeometry(collider.radius, direction.length(), 4, 8),
        material(0x7d8180, { metalness: 0.35, roughness: 0.6 }), fallbackHead);
      part.position.copy(a.add(b).multiplyScalar(0.5));
      part.quaternion.setFromUnitVectors(UP, direction.normalize());
    }
    const marker = this.mesh(new THREE.RingGeometry(0.47, 0.51, 40), new THREE.MeshBasicMaterial({ color: PALETTE[id], transparent: true, opacity: 0.48, depthWrite: false }));
    marker.rotation.x = -Math.PI / 2; marker.castShadow = false;
    const contact = this.mesh(new THREE.RingGeometry(0.12, 0.155, 24), new THREE.MeshBasicMaterial({ color: 0xf5efd6, transparent: true, opacity: 0.75, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.castShadow = false;
    const trailGeometry = new THREE.BufferGeometry();
    const maxTrail = 20;
    const positions = new Float32Array(maxTrail * 2 * 3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const indices = [];
    for (let i = 0; i < maxTrail - 1; i++) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    trailGeometry.setIndex(indices);
    const trail = new THREE.Mesh(trailGeometry, new THREE.MeshBasicMaterial({ color: weaponType === 'sword' ? 0xffa256 : PALETTE[id], transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false }));
    trail.frustumCulled = false;
    this.actors.add(trail);
    const trails = [{ mesh: trail, positions, history: [], anchor: undefined }];
    let beagleFallback,catFallback;
    if (loadout.characterId === 'beagle') {
      for (const child of root.children) child.visible = false;
      staff.visible = !earWeapon;
      beagleFallback = makeBeagleFallback(id,earWeapon);beagleFallback.root.visible=false;root.add(beagleFallback.root);
    }
    if(pawWeapon){
      for(const child of root.children)child.visible=false;
      staff.visible=false;contact.visible=false;
      catFallback=makeOrangeTabbyFallback(id);catFallback.root.visible=false;root.add(catFallback.root);
    }
    if(earWeapon||pawWeapon){
      trails[0].anchor = earWeapon?BEAGLE.anchors.L:undefined;
      if(pawWeapon)trails[0].pawSide='L';
      const other = trail.clone();other.geometry = trail.geometry.clone();other.material = trail.material.clone();
      const otherPositions = new Float32Array(positions.length);
      other.geometry.setAttribute('position', new THREE.BufferAttribute(otherPositions, 3));
      this.actors.add(other);
      trails.push({ mesh: other, positions: otherPositions, history: [], anchor:earWeapon?BEAGLE.anchors.R:undefined,pawSide:pawWeapon?'R':undefined });
    }
    const pawContacts=pawWeapon?['L','R'].map(side=>{const cue=contact.clone();cue.geometry=contact.geometry.clone();cue.material=contact.material.clone();cue.visible=false;this.actors.add(cue);return {side,mesh:cue};}):[];
    return { root, body, head, bodyMat, skinMat, staff, rod, grip, cap, tip, fallbackHead, marker, contact, trail, positions,
      trails, beagleFallback,catFallback,pawContacts,pawWeapon, maxTrail, weaponType, characterId:loadout.characterId,bodyModel:loadout.bodyModel,earWeapon,baseColor: new THREE.Color(PALETTE[id]) };
  }

  setCharacterModel(source,modelName){
    if(this.disposed||this.characterLoaded.has(modelName))return;
    for(const [id,fighter] of this.players.entries()){
      if(fighter.bodyModel!==modelName)continue;
      if(fighter.pawWeapon){
        fighter.cat=instantiateOrangeTabby(source,id);fighter.root.add(fighter.cat.host);fighter.catFallback.root.visible=false;
      }else{
        fighter.beagle=instantiateBeagle(source,id,{rigged:fighter.earWeapon});
        fighter.root.add(fighter.beagle.host);fighter.beagleFallback.root.visible=false;
      }
    }
    this.characterLoaded.add(modelName);
  }

  showCharacterFallback(modelName){
    if(this.disposed)return;
    for(const fighter of this.players)if(fighter.bodyModel===modelName&&!fighter.beagle&&!fighter.cat){
      const fallback=fighter.catFallback||fighter.beagleFallback;if(fallback)fallback.root.visible=true;
    }
  }

  setWeaponModel(source, type = 'polearm') {
    if (this.disposed || this.weaponLoaded.has(type)) return;
    if (type === 'beagle'||type==='long-ears')return this.setCharacterModel(source,BEAGLE.model);
    for (const [id, fighter] of this.players.entries()) {
      if (fighter.weaponType !== type) continue;
      const weapon = source.clone(true);
      const axis = new THREE.Vector3(...WEAPON_VISUALS[type].axis).normalize();
      const sourceButt = new THREE.Vector3(...WEAPON_VISUALS[type].butt);
      weapon.quaternion.setFromUnitVectors(axis, UP);
      weapon.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(weapon);
      const height = bounds.max.y - bounds.min.y;
      if (!Number.isFinite(height) || height <= 0) throw new Error('Weapon model has invalid bounds');
      const scale = WEAPONS[type].length / height;
      weapon.scale.setScalar(scale);
      const butt = sourceButt.clone().applyQuaternion(weapon.quaternion).multiplyScalar(scale);
      weapon.position.copy(butt.multiplyScalar(-1));
      weapon.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const copyMaterial = original => {
          const mat = original.clone();
          if (type === 'polearm') {
            mat.color.set(0x626a70).lerp(fighter.baseColor, 0.18);
            mat.metalness = 0.24;
            mat.roughness = 0.62;
          }
          return mat;
        };
        object.material = Array.isArray(object.material) ? object.material.map(copyMaterial) : copyMaterial(object.material);
      });
      fighter.staff.add(weapon);
      fighter.rod.visible = false;
      fighter.cap.visible = false;
      fighter.tip.visible = false;
      fighter.fallbackHead.visible = false;
      if (type === 'sword') fighter.grip.visible = false;
      // Keep the existing colored grip so each player can identify their weapon.
    }
    this.weaponLoaded.add(type);
  }

  resize(width, height) {
    // The arena stays mounted while the preparation page hides its container.
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    const aspect = this.width / Math.max(1, this.height);
    for (const rig of this.duelCameras) {
      rig.camera.aspect = Math.max(1, this.width / 2) / Math.max(1, this.height);
      rig.camera.updateProjectionMatrix();
    }
    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      return;
    }
    const halfHeight = Math.max(5.5, 8.9 / aspect);
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }

  update(players, dt, active = false, cameraDt = dt, splitView = false, cameraInputs = []) {
    this.banners.visible = !splitView;
    this.trailTimeTotal = (this.trailTimeTotal || 0) + dt;
    this.trailTime += dt;
    const recordTrail = this.trailTime > 1 / 90;
    if (recordTrail) this.trailTime = 0;
    for (const p of players) {
      const model = this.players[p.id];
      model.root.position.copy(vec(p.p));
      // The outer root owns common heading for body and anatomical weapons.
      model.root.rotation.y = -fighterHeading(p);
      model.bodyMat.color.copy(model.baseColor).lerp(new THREE.Color(0xffefd6), p.hitFlash * 0.8);
      model.skinMat.color.set(0xe7c199).lerp(new THREE.Color(0xffffff), p.hitFlash * 0.8);
      if(model.cat)poseOrangeTabby(model.cat,p);
      if(model.catFallback)poseOrangeTabbyFallback(model.catFallback,p);
      if (model.beagle) poseBeagle(model.beagle, p, this.trailTimeTotal || 0);
      if (model.beagleFallback) {
        model.beagleFallback.body.rotation.z = -(p.bodyPitch || 0);
        for (const [side,hinge] of Object.entries(model.beagleFallback.hinges))
          hinge.rotation.set(0,-beagleEarYaw(p,BEAGLE.anchors[side]),-p.theta,'YZX');
      }
      const frame = staffFrame(p);
      model.staff.position.copy(vec(staffFrame(p, 0).point));
      setWeaponRotation(model.staff.quaternion, p.theta, p.phi, this.swordPitch);
      model.marker.position.set(p.p.x, 0.02, p.p.z);
      model.marker.material.opacity = clamp(0.5 - (p.p.y - CONFIG.bodyFloor) * 0.09, 0.16, 0.5);
      model.contact.visible = !model.pawWeapon&&p.staffGrounded;
      model.contact.position.set(frame.point.x, 0.023, frame.point.z);
      for(const {side,mesh} of model.pawContacts){
        let lowest;
        for(const shape of CAT.colliders.slice(side==='L'?0:24,side==='L'?24:48)){
          const f=weaponPointFrame(p,v3(...shape.a)),height=f.point.y-shape.radius;
          if(!lowest||height<lowest.height)lowest={height,point:f.point};
        }
        mesh.visible=!!p.staffGrounded&&lowest?.height<.06;
        if(lowest)mesh.position.set(lowest.point.x,.023,lowest.point.z);
      }
      for (const trail of model.trails) {
        if (recordTrail) {
          const lateral=trail.pawSide?CAT.pawAnchors[trail.pawSide][2]:0;
          const near = weaponPointFrame(p, trail.pawSide?v3(-.45,.95,lateral):v3(0, weaponStats(p).length * .72, 0), trail.anchor).point;
          const tip = weaponPointFrame(p, trail.pawSide?v3(-1.4,.95,lateral):v3(0, weaponStats(p).length, 0), trail.anchor).point;
          trail.history.unshift([vec(near), vec(tip)]);
          if (trail.history.length > model.maxTrail) trail.history.pop();
        }
        trail.mesh.visible = active && p.contactSpeed > 3 && trail.history.length > 1;
        trail.mesh.material.opacity = clamp(p.contactSpeed / 100, .05, .2);
        for (let i = 0; i < model.maxTrail; i++) {
          const points = trail.history[Math.min(i, trail.history.length - 1)];
          if (points) { points[0].toArray(trail.positions, i * 6); points[1].toArray(trail.positions, i * 6 + 3); }
        }
        trail.mesh.geometry.attributes.position.needsUpdate = true;
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 9 * dt;
      p.mesh.scale.setScalar(Math.max(0, p.life / p.maxLife));
      if (p.mesh.position.y < 0.025) { p.mesh.position.y = 0.025; p.velocity.y *= -0.3; }
      if (p.life <= 0) { this.effectsRoot.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.particles.splice(i, 1); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.life -= dt;
      r.mesh.scale.setScalar(1 + (1 - r.life / 0.3) * 3);
      r.mesh.material.opacity = Math.max(0, r.life / 0.3 * 0.8);
      if (r.life <= 0) { this.effectsRoot.remove(r.mesh); r.mesh.geometry.dispose(); r.mesh.material.dispose(); this.rings.splice(i, 1); }
    }
    this.shake *= Math.exp(-16 * dt);
    if (this.solo && players[0]) updateFreeCamera(this.soloCamera, players[0], cameraDt);
    else this.camera.position.copy(this.cameraBase);
    if (!this.fixed && !this.reducedMotion && this.shake > 0.003) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.65;
    }
    this.camera.lookAt(this.solo ? this.soloCamera.focus : this.target);
    if (splitView && this.duel) this.updateDuelCameras(players, cameraDt, cameraInputs);
  }

  resetCamera() {
    if (this.soloCamera) resetFreeCamera(this.soloCamera);
    for (const rig of this.duelCameras) resetFreeCamera(rig);
  }

  updateDuelCameras(players, dt, inputs) {
    for (const player of players) {
      const rig = this.duelCameras[player.id];
      if (!rig) continue;
      const shake = !this.reducedMotion && this.shake > 0.003 ? this.shake : 0;
      turnFreeCamera(rig, inputs[player.id] || 0, dt);
      updateFreeCamera(rig, player, dt,
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake * 0.65);
    }
  }

  orbit(dx, dy, playerId = 0) {
    const rig = this.soloCamera || this.duelCameras[playerId];
    if (rig) orbitFreeCamera(rig, dx, dy);
  }

  zoom(delta, playerId = 0) {
    const rig = this.soloCamera || this.duelCameras[playerId];
    if (rig) zoomFreeCamera(rig, delta);
  }

  impact(event) {
    const isHit = event.type === 'hit';
    this.shake = Math.max(this.shake, event.strength * (isHit ? 0.3 : 0.1));
    const count = isHit ? Math.round(10 + event.strength * 14) : 9;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055 + Math.random() * 0.07, 0.055),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 && isHit ? PALETTE[event.target] : i % 2 === 0 ? 0xfff9de : 0xd4a458 }));
      mesh.position.copy(vec(event.point)); mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      this.effectsRoot.add(mesh);
      const normal = event.normal || { x: 0, y: 0.5, z: 0 };
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 5 + normal.x * 2, Math.random() * 4 + 1, (Math.random() - 0.5) * 5 + normal.z * 2);
      const life = 0.3 + Math.random() * 0.35;
      this.particles.push({ mesh, velocity, life, maxLife: life });
    }
    // A spherical flash reads from both cameras without facing only one view.
    const ring = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff8df, transparent: true, opacity: 0.8, wireframe: true, depthWrite: false }));
    ring.position.copy(vec(event.point));
    this.effectsRoot.add(ring); this.rings.push({ mesh: ring, life: 0.3 });
  }

  project(point, camera = this.camera, viewport = { x: 0, width: this.width, height: this.height }) {
    const p = this.displayPoint(point).project(camera);
    return {
      x: viewport.x + (p.x * 0.5 + 0.5) * viewport.width,
      y: (-p.y * 0.5 + 0.5) * viewport.height,
      visible: p.z >= -1 && p.z <= 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05,
    };
  }

  clearEffects() {
    for (const p of [...this.particles, ...this.rings]) { this.effectsRoot.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    this.particles = []; this.rings = []; this.shake = 0;
    for (const p of this.players) for (const trail of p.trails) trail.history.length = 0;
  }

  dispose() {
    this.disposed = true;
    this.clearEffects();
    disposeArenaFloorTexture(this.colosseum);
    const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
    for (const root of [this.arena, this.actors, this.effectsRoot]) root.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.skeleton) skeletons.add(object.skeleton);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const mat of objectMaterials) if (mat) {
        materials.add(mat);
        for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
  }
}
