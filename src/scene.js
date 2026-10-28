import * as THREE from 'three';
import { CONFIG, MATCH_ARENA_SCALE, weaponStats, staffFrame, fighterHeading, clamp, makePlayer, v3 } from './physics.js';
import { CHARACTERS } from './character-catalog.js';
import { setWeaponRotation } from './weapon-visuals.js';
import { createFreeCameraRig, updateFreeCamera, updateVictoryCamera, updateShowcaseCamera, resetFreeCamera, orbitFreeCamera,
  zoomFreeCamera, faceFreeCamera } from './free-camera.js';
import { resolveLoadout } from './loadouts.js';
import { weaponColor } from './weapon-catalog.js';
import { arenaPlacement } from './arena-profile.js';
import { ARENA_OBSTACLES } from './arena-obstacles.js';
import { buildArena } from './arena.js';
import { ARENA_SKINS } from './arena-skins.js';
import { buildCharacter } from './models/characters.js';
import { buildWeapon } from './models/weapons.js';
import { PALETTE, disposeObject } from './models/toy-kit.js';

const PLAYER_COLORS = PALETTE.players;
const vec = p => new THREE.Vector3(p.x, p.y, p.z);
const TRAIL_LENGTH = 22;

// The thrown takeout: the same delivery box as the weapon, scaled so it fills
// the projectile's contact sphere, centred on its own middle.
function buildDeliveryBag(radius) {
  const root = new THREE.Group(), box = buildWeapon('takeout-box', 0).root, scale = radius / 0.42;
  box.scale.setScalar(scale);
  box.position.y = -0.4 * scale;
  root.add(box);
  return root;
}

// Where the setup screen's fighter stands, as a fraction of the window width:
// midway between the choices on the left and the side column on the right.
const SETUP_FRAME_X = 0.54;
// Camera flights between screens, in seconds.
const FLIGHTS = { 'lobby>setup': 1.25, 'setup>lobby': 1.05 };
// Changing the arena on the setup screen rebuilds the whole view. The fighter
// already standing there must not spring up again, and the camera's sway
// carries on where it was, so both outlive a single view.
let shownPreviewKey = '';
let viewClock = 0;
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOutBack = t => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
// aim: the point the camera looks at, as far along its view as the pivot is.
function cameraPose(camera, pivot) {
  const view = camera.view?.enabled ? camera.view : null;
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const aim = camera.position.clone().addScaledVector(forward, Math.max(1, camera.position.distanceTo(pivot)));
  return { position: camera.position.clone(), aim, fov: camera.fov, offsetX: view ? view.offsetX : 0, offsetY: view ? view.offsetY : 0 };
}

export class ArenaView {
  constructor(renderer, camera, first, second, skin = 'courtyard') {
    this.renderer = renderer;
    this.camera = camera;
    this.loadouts = [resolveLoadout(first), resolveLoadout(second)];
    const placement = arenaPlacement(MATCH_ARENA_SCALE);
    const rimHeight = ARENA_SKINS.find(entry => entry.id === skin)?.rimHeight ?? placement.weaponContactHeight;
    this.arenaBuild = buildArena({ skin, radius: placement.radius, rimHeight,
      obstacles: ARENA_OBSTACLES, anisotropy: renderer?.capabilities?.getMaxAnisotropy?.() ?? 4 });
    this.arena = this.arenaBuild.group;
    this.fog = this.arenaBuild.fog;
    this.actors = new THREE.Group();
    this.effectsRoot = new THREE.Group();
    this.swordPitch = new THREE.Quaternion();
    this.followCamera = createFreeCameraRig();
    // Title screen: a perspective orbit so the scenery beyond the wall shows.
    this.showcaseCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 320);
    // Setup screen: a close shot of the draft fighter, between the two columns.
    this.setupCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 320);
    this.preview = null;
    // Title ↔ setup: instead of cutting, a camera flies from the last shot drawn to the new one.
    this.flightCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 320);
    this.flight = null;
    this.lastView = null;
    // What the flight keeps in frame: the setup fighter, or the arena's middle before there is one.
    this.flightPivot = new THREE.Vector3(0, 1, 0);
    this.focus = new THREE.Vector3();
    this.particles = [];
    this.rings = [];
    this.bags = new Map();
    this.laughPulse = [0, 0];
    this.trailTime = 0;
    this.time = viewClock;
    this.shake = 0;
    this.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.players = [this.makeFighter(0), this.makeFighter(1)];
  }

  flatMesh(geometry, material, parent = this.actors) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.castShadow = false;
    parent.add(mesh);
    return mesh;
  }

  // A ribbon behind the weapon tip in the weapon's own colour, fading out
  // toward its tail through per-vertex alpha.
  makeTrail(weaponType) {
    const geometry = new THREE.BufferGeometry(), positions = new Float32Array(TRAIL_LENGTH * 2 * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 2 * 4), color = new THREE.Color(weaponColor(weaponType));
    for (let i = 0; i < TRAIL_LENGTH * 2; i++) color.toArray(colors, i * 4);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    const indices = [];
    for (let i = 0; i < TRAIL_LENGTH - 1; i++) { const j = i * 2; indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    geometry.setIndex(indices);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true,
      side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    mesh.frustumCulled = false;
    this.actors.add(mesh);
    return { mesh, positions, colors, history: [] };
  }

  makeFighter(id) {
    const loadout = this.loadouts[id], weaponType = loadout.weaponId;
    const character = buildCharacter(loadout, id);
    this.actors.add(character.root);
    const weapon = buildWeapon(weaponType, id), staff = new THREE.Group();
    staff.add(weapon.root);
    this.actors.add(staff);
    const marker = this.flatMesh(new THREE.RingGeometry(0.47, 0.51, 40), new THREE.MeshBasicMaterial({ color: PLAYER_COLORS[id], transparent: true, opacity: 0.48, depthWrite: false }));
    const cue = () => this.flatMesh(new THREE.RingGeometry(0.12, 0.155, 24), new THREE.MeshBasicMaterial({ color: 0xf5efd6, transparent: true, opacity: 0.75, depthWrite: false }));
    const contact = cue();
    contact.visible = false;
    return { character, weapon, staff, marker, contact, trails: [this.makeTrail(weaponType)], weaponType };
  }

  resize(width, height) {
    // The arena stays mounted while the preparation page hides its container.
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    const aspect = width / Math.max(1, height);
    for (const camera of [this.followCamera.camera, this.showcaseCamera, this.setupCamera, this.flightCamera]) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    // The setup screen's columns cover the left and right of the window: shift
    // the image so the fighter in the middle of the shot lands between them.
    this.setupCamera.setViewOffset(width, height, -width * (SETUP_FRAME_X - 0.5), height * 0.02, width, height);
  }

  // The setup screen's fighter: the draft character with its weapon raised
  // beside it, the same pose as the old turntable preview. Rebuilt on change.
  // keep: leave shownPreviewKey alone (the view is only being rebuilt).
  showPreview(selection, keep = false) {
    const key = selection ? `${selection.id}:${selection.characterId}:${selection.weaponId}` : '';
    if (!key && !keep) shownPreviewKey = '';
    if (this.preview?.key === key) return;
    if (this.preview) { this.actors.remove(this.preview.root); disposeObject(this.preview.root); this.preview = null; }
    if (!selection) return;
    const { id, characterId, weaponId } = selection, character = CHARACTERS[characterId];
    if (!character) return;
    const full = weaponId ? resolveLoadout({ characterId, weaponId }) : null;
    const loadout = full ?? { characterId, weaponId: character.weaponIds?.[0] ?? 'sword' };
    const root = new THREE.Group(), player = makePlayer(id, loadout);
    player.p = v3(0, character.bodyFloor, 0);
    player.phi = player.bodyYaw = 0;
    player.theta = 0.82;
    const body = buildCharacter(loadout, id);
    body.root.position.set(player.p.x, player.p.y, player.p.z);
    root.add(body.root);
    if (full) {
      const holder = new THREE.Group();
      holder.position.copy(vec(staffFrame(player, 0).point));
      setWeaponRotation(holder.quaternion, player.theta, player.phi, this.swordPitch);
      holder.add(buildWeapon(full.weaponId, id).root);
      root.add(holder);
    }
    root.traverse(object => { if (object.isMesh && !object.userData.outline) object.castShadow = true; });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    this.actors.add(root);
    // It springs up from the floor when it appears (the box above is its full
    // size), but not when the same fighter is only moved into a rebuilt view.
    const fresh = key !== shownPreviewKey;
    shownPreviewKey = key;
    root.scale.setScalar(fresh ? 0.001 : 1);
    this.preview = { key, root, body, player, box, center: box.getCenter(new THREE.Vector3()), born: fresh ? this.time : -Infinity };
  }

  // Three-quarter front view of the preview, swaying gently so the arena
  // behind it moves. Distance fits the whole silhouette between the columns.
  updateSetupCamera(time) {
    const camera = this.setupCamera, preview = this.preview;
    if (!preview) return;
    // Looks past the fighter between a pillar and a low wall, so the arena's edge shows behind it.
    const angle = 0.3 + Math.sin(time * 0.23) * 0.1;
    const direction = new THREE.Vector3(Math.cos(angle), 0.2, Math.sin(angle)).normalize();
    const right = new THREE.Vector3(-direction.z, 0, direction.x).normalize(), up = new THREE.Vector3().crossVectors(right, direction).negate();
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * camera.aspect;
    const { box, center } = preview, corner = new THREE.Vector3();
    let distance = 2;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      corner.set(x, y, z).sub(center);
      const depth = corner.dot(direction);
      distance = Math.max(distance, depth + Math.abs(corner.dot(right)) / (tanH * 0.32), depth + Math.abs(corner.dot(up)) / (tanV * 0.74));
    }
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.lookAt(center);
    camera.updateMatrixWorld();
  }

  // view: 'lobby' | 'setup' | 'match' | 'victory'. winner: the fighter the victory camera frames.
  update(players, dt, { active = false, cameraDt = dt, view = 'lobby', localPlayerId = 0, winner = null, projectiles = [], preview = null } = {}) {
    const setup = view === 'setup';
    this.showPreview(setup ? preview : null);
    // Flying back to the title shot, the fighters there would fill the lens
    // while the camera is still close in: they show once it has pulled back.
    const returning = view === 'lobby' && (this.lastView === 'setup' || (this.flight?.view === 'lobby' && this.flight.time < this.flight.duration * 0.5));
    const hidden = setup || returning;
    for (const model of this.players) {
      model.character.root.visible = model.staff.visible = model.marker.visible = !hidden;
      if (hidden) model.contact.visible = false;
    }
    if (this.preview) {
      this.preview.body.pose(this.preview.player, this.time);
      const grow = this.reducedMotion ? 1 : Math.min(1, (this.time - this.preview.born) / 0.5);
      this.preview.root.scale.setScalar(grow >= 1 ? 1 : Math.max(0.001, easeOutBack(grow)));
    }
    this.time += dt;
    viewClock = this.time;
    this.trailTime += dt;
    const recordTrail = this.trailTime > 1 / 90;
    if (recordTrail) this.trailTime = 0;
    for (const p of players) {
      const model = this.players[p.id];
      model.character.root.position.copy(vec(p.p));
      model.character.root.rotation.y = -fighterHeading(p);
      model.character.pose(p, this.time);
      model.staff.position.copy(vec(staffFrame(p, 0).point));
      setWeaponRotation(model.staff.quaternion, p.theta, p.phi, this.swordPitch);
      model.weapon.flash(p.hitFlash * 0.4);
      model.marker.position.set(p.p.x, 0.02, p.p.z);
      model.marker.material.opacity = clamp(0.5 - (p.p.y - CONFIG.bodyFloor) * 0.09, 0.16, 0.5);
      const frame = staffFrame(p);
      model.contact.visible = !hidden && p.staffGrounded;
      model.contact.position.set(frame.point.x, 0.023, frame.point.z);
      const strength = clamp((p.contactSpeed - 3) / 9, 0, 1);
      for (const trail of model.trails) {
        if (recordTrail) {
          const near = staffFrame(p, weaponStats(p).length * 0.55).point, tip = staffFrame(p).point;
          trail.history.unshift([vec(near), vec(tip)]);
          if (trail.history.length > TRAIL_LENGTH) trail.history.pop();
        }
        trail.mesh.visible = active && strength > 0 && trail.history.length > 1;
        for (let i = 0; i < TRAIL_LENGTH; i++) {
          const points = trail.history[Math.min(i, trail.history.length - 1)];
          if (points) { points[0].toArray(trail.positions, i * 6); points[1].toArray(trail.positions, i * 6 + 3); }
          const fade = (1 - i / (TRAIL_LENGTH - 1)) ** 1.6 * (0.18 + strength * 0.4);
          trail.colors[i * 8 + 3] = fade * 0.35;
          trail.colors[i * 8 + 7] = fade;
        }
        trail.mesh.geometry.attributes.position.needsUpdate = true;
        trail.mesh.geometry.attributes.color.needsUpdate = true;
      }
      // While 奶蛙 laughs, shock rings pulse out from the head.
      if (p.skillActive && p.skill === 'laugh' && dt > 0) {
        this.laughPulse[p.id] -= dt;
        if (this.laughPulse[p.id] <= 0) {
          this.laughPulse[p.id] = 0.32;
          this.addRing({ x: p.p.x, y: p.p.y + 1.1, z: p.p.z }, 0xf6dc6a, { radius: 0.6, flat: false, life: 0.6, grow: 2.6, opacity: 0.55, facing: fighterHeading(p) });
        }
      }
      if (p.skillActive && p.skill === 'happy' && dt > 0 && Math.random() < dt * 16) {
        const angle = Math.random() * Math.PI * 2;
        this.addParticle({ x: p.p.x + Math.cos(angle) * 0.7, y: p.p.y + 0.2, z: p.p.z + Math.sin(angle) * 0.7 },
          new THREE.Vector3(Math.cos(angle) * 0.4, 1.8 + Math.random(), Math.sin(angle) * 0.4), Math.random() < 0.5 ? 0xf28fa3 : 0x8fd27a,
          { size: 0.11, life: 1.1, float: true, shape: 'heart' });
      }
    }
    this.updateBags(projectiles, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.float) p.velocity.multiplyScalar(Math.exp(-1.2 * dt));
      else p.velocity.y -= 9 * dt;
      const left = Math.max(0, p.life / p.maxLife);
      if (p.grow) { p.mesh.scale.setScalar(p.size * (1 + (1 - left) * p.grow)); p.mesh.material.opacity = left * 0.7; }
      else p.mesh.scale.setScalar(p.size * left);
      if (!p.float && p.mesh.position.y < 0.025) { p.mesh.position.y = 0.025; p.velocity.y *= -0.3; }
      if (p.life <= 0) { this.removeEffect(p.mesh); this.particles.splice(i, 1); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      const progress = 1 - r.life / r.maxLife;
      r.mesh.scale.setScalar(1 + progress * r.grow);
      r.mesh.material.opacity = Math.max(0, r.life / r.maxLife * r.opacity);
      if (r.life <= 0) { this.removeEffect(r.mesh); this.rings.splice(i, 1); }
    }
    this.shake *= Math.exp(-16 * dt);
    const shake = !this.reducedMotion && this.shake > 0.003 ? this.shake : 0;
    const local = players[localPlayerId];
    if (view === 'victory' && players[winner]) {
      updateVictoryCamera(this.followCamera, players[winner], cameraDt, players.find(p => p.id !== winner));
      this.focus.copy(this.followCamera.focus);
    } else if (view === 'match' && local) {
      updateFreeCamera(this.followCamera, local, cameraDt, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.65);
      this.focus.set(local.p.x, local.p.y + 0.6, local.p.z);
    } else if (setup) {
      this.updateSetupCamera(this.reducedMotion ? 0 : this.time);
    } else {
      updateShowcaseCamera(this.showcaseCamera, this.reducedMotion ? 0 : this.time);
    }
    this.updateFlight(view, cameraDt);
    const camera = this.activeCamera(view);
    // Both fighters, so occluding walls and props open up for either; off on the title orbit.
    const fighters = view === 'match' || view === 'victory' ? players.map(p => p.p) : null;
    this.arenaBuild.update(dt || cameraDt, camera, view === 'match' ? this.focus : null, fighters);
  }

  baseCamera(view) { return view === 'lobby' ? this.showcaseCamera : view === 'setup' ? this.setupCamera : this.followCamera.camera; }

  activeCamera(view) { return this.flight && this.flight.view === view ? this.flightCamera : this.baseCamera(view); }

  // Between the title orbit and the setup close-up the camera flies: from the
  // pose last drawn (mid-flight too, if the player turns back) to the new
  // shot, which keeps moving underneath, so the flight lands on it exactly.
  // Position and aim point are blended (not the rotation), so the fighter
  // stays in the picture the whole way.
  updateFlight(view, dt) {
    const last = this.lastView;
    this.lastView = view;
    if (this.preview) this.flightPivot.copy(this.preview.center);
    if (last && last !== view && !this.reducedMotion && FLIGHTS[`${last}>${view}`]) {
      const from = this.activeCamera(last);
      this.flight = { view, time: 0, duration: FLIGHTS[`${last}>${view}`], from: cameraPose(from, this.flightPivot) };
    }
    if (!this.flight) return;
    if (this.flight.view !== view) { this.flight = null; return; }
    const flight = this.flight;
    flight.time += dt;
    const t = Math.min(1, flight.time / flight.duration);
    if (t >= 1) { this.flight = null; return; }
    const to = cameraPose(this.baseCamera(view), this.flightPivot), from = flight.from, k = easeInOutCubic(t);
    const camera = this.flightCamera;
    camera.position.lerpVectors(from.position, to.position, k);
    // A slight rise mid-flight, so the push reads as a swoop rather than a slide.
    camera.position.y += Math.sin(Math.PI * k) * from.position.distanceTo(to.position) * 0.06;
    camera.lookAt(new THREE.Vector3().lerpVectors(from.aim, to.aim, k));
    camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, k);
    if (this.width && this.height) camera.setViewOffset(this.width, this.height,
      THREE.MathUtils.lerp(from.offsetX, to.offsetX, k), THREE.MathUtils.lerp(from.offsetY, to.offsetY, k), this.width, this.height);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  updateBags(projectiles, dt) {
    const seen = new Set();
    for (const shot of projectiles) {
      seen.add(shot.id);
      let bag = this.bags.get(shot.id);
      if (!bag) { bag = buildDeliveryBag(shot.radius ?? 0.55); this.effectsRoot.add(bag); this.bags.set(shot.id, bag); }
      bag.position.copy(vec(shot.p));
      bag.rotation.set(shot.spin * 0.7, Math.atan2(-shot.v.z, shot.v.x), shot.spin);
    }
    for (const [id, bag] of this.bags) if (!seen.has(id)) {
      this.effectsRoot.remove(bag);
      disposeObject(bag);
      this.bags.delete(id);
    }
  }

  resetCamera() { resetFreeCamera(this.followCamera); }
  orbit(dx, dy) { orbitFreeCamera(this.followCamera, dx, dy); }
  zoom(delta) { zoomFreeCamera(this.followCamera, delta); }
  faceTowards(heading) { faceFreeCamera(this.followCamera, heading); }
  set sensitivity(value) { this.followCamera.sensitivity = value; }
  set invertY(value) { this.followCamera.invertY = !!value; }

  removeEffect(mesh) {
    this.effectsRoot.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  addParticle(point, velocity, color, { size = 1, life = 0.5, float = false, grow = 0, shape = 'box', opacity = 1 } = {}) {
    const geometry = shape === 'puff' ? new THREE.SphereGeometry(1, 10, 8)
      : shape === 'heart' ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1 + Math.random(), 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: grow > 0 || opacity < 1, opacity, depthWrite: grow === 0 }));
    mesh.position.copy(vec(point));
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    mesh.scale.setScalar(size);
    this.effectsRoot.add(mesh);
    this.particles.push({ mesh, velocity, life, maxLife: life, size, float, grow });
  }

  addRing(point, color, { radius = 0.5, flat = true, life = 0.55, grow = 3, opacity = 0.6, facing = 0 } = {}) {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(radius, radius * 1.22, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
    if (flat) mesh.rotation.x = -Math.PI / 2;
    else mesh.rotation.y = -facing + Math.PI / 2;
    mesh.position.copy(vec(point));
    this.effectsRoot.add(mesh);
    this.rings.push({ mesh, life, maxLife: life, grow, opacity });
  }

  impact(event) {
    if (event.type === 'skill') return this.skillEffect(event);
    if (event.type === 'splat') {
      for (let i = 0; i < 14; i++) this.addParticle(event.point, new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4),
        i % 3 ? 0xf5c518 : 0xfbf8f0, { size: 0.08, life: 0.5 + Math.random() * 0.3 });
      this.addRing({ ...event.point, y: 0.03 }, 0xf5c518, { radius: 0.3, grow: 2.5, life: 0.5 });
      return;
    }
    const isHit = event.type === 'hit';
    this.shake = Math.max(this.shake, event.strength * (isHit ? 0.3 : 0.1));
    const count = isHit ? Math.round(10 + event.strength * 14) : 9;
    const accent = weaponColor(event.weapon ?? event.weapons?.[0]);
    for (let i = 0; i < count; i++) {
      const normal = event.normal || { x: 0, y: 0.5, z: 0 };
      const velocity = new THREE.Vector3((Math.random() - 0.5) * 5 + normal.x * 2, Math.random() * 4 + 1, (Math.random() - 0.5) * 5 + normal.z * 2);
      const color = i % 3 === 0 && isHit ? PLAYER_COLORS[event.target] : i % 2 === 0 ? 0xfff9de : accent;
      this.addParticle(event.point, velocity, color, { size: 0.06, life: 0.3 + Math.random() * 0.35 });
    }
    // A wire burst at the contact and, for hits, a shockwave ring on the floor.
    const burst = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff8df, transparent: true, opacity: 0.8, wireframe: true, depthWrite: false }));
    burst.position.copy(vec(event.point));
    this.effectsRoot.add(burst);
    this.rings.push({ mesh: burst, life: 0.3, maxLife: 0.3, grow: 3, opacity: 0.8 });
    if (isHit) this.addRing({ x: event.point.x, y: 0.03, z: event.point.z }, PLAYER_COLORS[event.attacker] ?? 0xffffff,
      { grow: 2.5 + event.strength * 3, life: 0.55 });
  }

  skillEffect(event) {
    const puff = point => {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.addParticle({ x: point.x + Math.cos(angle) * 0.3, y: point.y - 0.2 + Math.random() * 1.2, z: point.z + Math.sin(angle) * 0.3 },
          new THREE.Vector3(Math.cos(angle) * 1.6, 0.6 + Math.random(), Math.sin(angle) * 1.6), i % 4 ? 0xe9e4d8 : 0xb8b2a6,
          { size: 0.22, life: 0.55 + Math.random() * 0.3, float: true, grow: 1.4, shape: 'puff', opacity: 0.7 });
      }
    };
    if (event.skill === 'twist') { puff(event.point); if (event.to) puff(event.to); }
    if (event.skill === 'happy') this.addRing({ x: event.point.x, y: 0.04, z: event.point.z }, 0x8fd27a, { radius: 0.7, grow: 2, life: 0.9 });
    if (event.skill === 'laugh') this.shake = Math.max(this.shake, 0.12);
  }

  project(point, camera = this.camera, viewport = { x: 0, width: this.width, height: this.height }) {
    const p = vec(point).project(camera);
    return {
      x: viewport.x + (p.x * 0.5 + 0.5) * viewport.width,
      y: (-p.y * 0.5 + 0.5) * viewport.height,
      visible: p.z >= -1 && p.z <= 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05,
    };
  }

  clearEffects() {
    for (const p of [...this.particles, ...this.rings]) this.removeEffect(p.mesh);
    this.particles = [];
    this.rings = [];
    this.updateBags([], 0);
    this.shake = 0;
    for (const p of this.players) for (const trail of p.trails) trail.history.length = 0;
  }

  dispose() {
    this.disposed = true;
    this.clearEffects();
    this.showPreview(null, true);
    for (const root of [this.arena, this.actors, this.effectsRoot]) disposeObject(root);
  }
}
