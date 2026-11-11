import { Box3, Raycaster, Vector3 } from 'three';
import { ARENA_PROFILE } from './arena-profile.js';

export function attachArenaModel(source, scale = 1) {
  const meshes = [], sectors = [], oldMaterials = new Set();
  source.traverse(o => { if (o.isMesh) meshes.push(o); });
  const floor = meshes.find(o => o.name === ARENA_PROFILE.floorMesh);
  if (!floor || meshes.filter(o => o.name.startsWith(ARENA_PROFILE.sectorPrefix)).length !== ARENA_PROFILE.sectorCount)
    throw Error('Incomplete Colosseum floor or wall sectors');
  source.name = 'Colosseum_Environment';
  // Uniform scaling preserves the actual arches/columns in every mode.
  source.scale.setScalar(scale);
  source.updateMatrixWorld(true);
  const floorBox = new Box3().setFromObject(floor);
  if (Math.abs(floorBox.min.y) > 1e-5 || Math.abs(floorBox.max.y) > 1e-5)
    throw Error('Colosseum floor is not aligned with solver Y=0');
  for (const mesh of meshes) {
    if (Array.isArray(mesh.material)) throw Error('Expected one atlas material per arena mesh');
    oldMaterials.add(mesh.material);
    mesh.material = mesh.material.clone();
    mesh.castShadow = mesh !== floor;
    mesh.receiveShadow = true;
    if (mesh !== floor) {
      // Keep geometry visible to the shadow pass. Color opacity changes only
      // for the current camera; no shared visibility state between panes.
      mesh.material.transparent = true;
      const box = new Box3().setFromObject(mesh);
      sectors.push({ mesh, box });
    }
  }
  for (const material of oldMaterials) material.dispose();
  return { root: source, floor, sectors, raycaster: new Raycaster(), cache: new Map(), point: new Vector3(),
    direction: new Vector3(), origin: new Vector3(), cameraDirection:new Vector3(), intersection: new Vector3(), lastOcclusion: new Map() };
}

export function restoreArenaOpacity(instance) {
  if (!instance) return;
  for (const { mesh } of instance.sectors) {
    mesh.material.opacity = 1;
    mesh.material.depthWrite = true;
  }
}

export function prepareArenaCamera(instance, camera, players) {
  if (!instance) return [];
  restoreArenaOpacity(instance);
  const radius=ARENA_PROFILE.radius*instance.root.scale.x;
  const origin=instance.origin, hidden=new Set(), now=performance.now();
  const signature=[...camera.position.toArray(),...camera.quaternion.toArray(),...players.flatMap(p=>[p.p.x,p.p.y,p.p.z])].map(n=>Math.round(n*20)).join(',');
  const cached=instance.cache.get(camera.uuid);
  let names;
  if(cached && (cached.signature===signature || now-cached.time<90)) names=cached.names;
  else {
    const meshes=instance.sectors.map(s=>s.mesh);
    // A camera and fighter both inside the clear circular floor cannot have
    // decorative seating between them. Outside that region, use throttled
    // view-only rays against the actual sectors, never as physics colliders.
    if(Math.hypot(camera.position.x,camera.position.z)>=radius-.2) {
      // A low, distant camera can enter the seating or a column. Front-sided
      // ray tests from inside that stone miss its outward-facing triangles;
      // clear containing sectors before applying the usual neighboring margin.
      for(const {mesh,box} of instance.sectors)
        if(box.containsPoint(camera.position)) hidden.add(mesh.name);
      for(const player of players) for(const [dx,h,dz] of [[0,.1,0],[0,.9,0],[0,1.65,0],[-.55,1,0],[.55,1,0],[0,1,-.55],[0,1,.55]]) {
        instance.point.set(player.p.x+dx,player.p.y-.59+h,player.p.z+dz);
        origin.copy(camera.position);
        if(camera.isOrthographicCamera) {
          camera.getWorldDirection(instance.cameraDirection);
          origin.copy(instance.point).addScaledVector(instance.cameraDirection,-camera.position.distanceTo(instance.point));
        }
        instance.direction.subVectors(instance.point,origin);
        const distance=instance.direction.length();
        if(distance<.3)continue;
        instance.raycaster.set(origin,instance.direction.divideScalar(distance));
        instance.raycaster.near=0;instance.raycaster.far=distance-.2;
        for(const hit of instance.raycaster.intersectObjects(meshes,false)) hidden.add(hit.object.name);
      }
    }
    // Clear neighboring sectors as well: a center ray can clear a fighter
    // while a close wall still fills the sides of its viewport. A one-sector
    // margin gives a deliberate near-side cutaway instead of sliced fragments.
    for(const name of [...hidden]) {
      const index=Number(name.slice(-2));
      for(const neighbor of [(index+7)%8,(index+1)%8])
        hidden.add(ARENA_PROFILE.sectorPrefix+String(neighbor).padStart(2,'0'));
    }
    names=[...hidden];instance.cache.set(camera.uuid,{signature,time:now,names});
  }
  for(const {mesh} of instance.sectors) if(names.includes(mesh.name)) {
    mesh.material.opacity=0;mesh.material.depthWrite=false;
  }
  instance.lastOcclusion.set(camera.uuid,names);
  return names;
}
