import {ClampToEdgeWrapping,Float32BufferAttribute,LinearFilter,LinearMipmapLinearFilter,SRGBColorSpace,TextureLoader} from 'three';

// The source floor uses the architecture atlas. Keep both original resources
// intact for loading fallback and the local before/after comparison.
export function applyArenaFloorTexture(instance, texture, maxAnisotropy = 1) {
  if (!instance || instance.floorAppearance) return false;
  const floor = instance.floor, baseGeometry = floor.geometry, baseMaterial = floor.material;
  const geometry = baseGeometry.clone();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const halfExtent = Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z));
  if (!(halfExtent > 0)) { geometry.dispose(); return false; }
  const positions = geometry.attributes.position, uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = .5 + positions.getX(i) / (2 * halfExtent);
    uv[i * 2 + 1] = .5 - positions.getZ(i) / (2 * halfExtent);
  }
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = true; // Top of the generated image faces local -Z.
  texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = Math.max(1,Math.min(8,maxAnisotropy || 1));
  texture.needsUpdate = true;
  const material = baseMaterial.clone();
  material.name = 'MAT_Colosseum_Roman_Floor';
  material.map = texture;
  material.color.set(0xffffff);
  material.roughness = .94;
  material.metalness = 0;
  material.needsUpdate = true;
  instance.floorAppearance = {baseGeometry,baseMaterial,geometry,material,texture,enabled:true};
  floor.geometry = geometry;
  floor.material = material;
  return true;
}

export function setArenaFloorPatternEnabled(instance, enabled) {
  const appearance = instance?.floorAppearance;
  if (!appearance) return false;
  appearance.enabled = !!enabled;
  instance.floor.geometry = enabled ? appearance.geometry : appearance.baseGeometry;
  instance.floor.material = enabled ? appearance.material : appearance.baseMaterial;
  return true;
}

export function disposeArenaFloorTexture(instance) {
  const appearance = instance?.floorAppearance;
  if (!appearance) return;
  setArenaFloorPatternEnabled(instance,false);
  appearance.geometry.dispose();
  appearance.material.dispose();
  appearance.texture.dispose();
  delete instance.floorAppearance;
}

export function loadArenaFloorTexture(view,url,maxAnisotropy = 1,loader = new TextureLoader()) {
  let cancelled = false, settled = false, pending;
  const discarded = new Set();
  const discard = texture => { if (texture && !discarded.has(texture)) { discarded.add(texture); texture.dispose(); } };
  const failed = () => {
    settled = true;
    discard(pending);
    if (!cancelled && !view.disposed) view.floorTextureState = 'fallback';
  };
  view.floorTextureState = 'loading';
  try {
    pending = loader.load(url,texture => {
      settled = true;
      if (cancelled || view.disposed) { discard(texture); return; }
      if (view.setArenaFloorTexture(texture,maxAnisotropy)) view.floorTextureState = 'ready';
      else { discard(texture); view.floorTextureState = 'fallback'; }
    },undefined,failed);
  } catch { failed(); }
  return () => { cancelled = true; if (!settled) discard(pending); };
}
