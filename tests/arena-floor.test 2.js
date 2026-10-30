import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,PlaneGeometry,MeshStandardMaterial,Texture,Vector3,SRGBColorSpace,LinearMipmapLinearFilter} from 'three';
import {applyArenaFloorTexture,setArenaFloorPatternEnabled,disposeArenaFloorTexture,loadArenaFloorTexture} from '../src/arena-floor.js';

function fixture(){
  const map=new Texture(),material=new MeshStandardMaterial({map,roughness:.88});
  const geometry=new PlaneGeometry(12.98,12.98).rotateX(-Math.PI/2);
  const floor=new Mesh(geometry,material.clone()),wall=new Mesh(geometry,material.clone());
  const root=new Group();root.add(floor,wall);
  return {root,floor,wall};
}
const disposalCount=resource=>{let count=0;resource.addEventListener('dispose',()=>count++);return ()=>count;};

test('floor artwork gets planar coordinates while positions, architecture atlas and source geometry remain intact',()=>{
  for(const scale of [1,3]){
    const arena=fixture();arena.root.scale.setScalar(scale);
    const original=arena.floor.geometry,sourceUv=original.attributes.uv.array.slice(),positions=original.attributes.position.array.slice();
    const atlas=arena.wall.material.map,wallGeometry=arena.wall.geometry,wallUv=wallGeometry.attributes.uv.array.slice();
    const texture=new Texture();
    assert.equal(applyArenaFloorTexture(arena,texture,16),true);
    assert.notEqual(arena.floor.geometry,original);
    assert.deepEqual(original.attributes.uv.array,sourceUv);
    assert.deepEqual(arena.floor.geometry.attributes.position.array,positions);
    assert.equal(arena.wall.material.map,atlas);
    assert.deepEqual(wallGeometry.attributes.uv.array,wallUv);
    const p=arena.floor.geometry.attributes.position,uv=arena.floor.geometry.attributes.uv;
    for(let i=0;i<p.count;i++){
      assert.ok(Math.abs(uv.getX(i)-(.5+p.getX(i)/12.98))<1e-6);
      assert.ok(Math.abs(uv.getY(i)-(.5-p.getZ(i)/12.98))<1e-6);
      assert.ok(Math.abs(p.getY(i))<1e-6);
    }
    assert.equal(texture.colorSpace,SRGBColorSpace);assert.equal(texture.minFilter,LinearMipmapLinearFilter);
    assert.equal(texture.anisotropy,8);assert.equal(arena.floor.material.map,texture);
    arena.root.updateMatrixWorld(true);
    const corner=new Vector3().fromBufferAttribute(p,0).applyMatrix4(arena.floor.matrixWorld);
    assert.ok(Math.abs(Math.abs(corner.x)-6.49*scale)<1e-6);
    setArenaFloorPatternEnabled(arena,false);
    assert.equal(arena.floor.geometry,original);assert.equal(arena.floor.material.map,atlas);
    setArenaFloorPatternEnabled(arena,true);assert.equal(arena.floor.material.map,texture);
    disposeArenaFloorTexture(arena);
  }
});

test('floor cleanup releases only the new resources and restores the source before normal scene disposal',()=>{
  const arena=fixture(),base=arena.floor.geometry,atlas=arena.floor.material.map,texture=new Texture();
  const baseDisposed=disposalCount(base),atlasDisposed=disposalCount(atlas),textureDisposed=disposalCount(texture);
  applyArenaFloorTexture(arena,texture);
  const geometryDisposed=disposalCount(arena.floor.geometry),materialDisposed=disposalCount(arena.floor.material);
  disposeArenaFloorTexture(arena);disposeArenaFloorTexture(arena);
  assert.equal(baseDisposed(),0);assert.equal(atlasDisposed(),0);
  assert.equal(textureDisposed(),1);assert.equal(geometryDisposed(),1);assert.equal(materialDisposed(),1);
  assert.equal(arena.floor.geometry,base);assert.equal(arena.floor.material.map,atlas);
});

test('texture loading retains the old floor on error and discards canceled or late results',()=>{
  for(const result of ['ready','error','cancel','disposed']){
    const arena=fixture(),atlas=arena.floor.material.map,texture=new Texture(),disposed=disposalCount(texture);
    const view={disposed:false,setArenaFloorTexture:(map,anisotropy)=>applyArenaFloorTexture(arena,map,anisotropy)};
    let loaded,failed;
    const loader={load(url,onLoad,progress,onError){assert.equal(url,'floor.jpg');loaded=onLoad;failed=onError;return texture;}};
    const cancel=loadArenaFloorTexture(view,'floor.jpg',4,loader);
    assert.equal(view.floorTextureState,'loading');assert.equal(arena.floor.material.map,atlas);
    if(result==='ready'){
      loaded(texture);cancel();assert.equal(view.floorTextureState,'ready');assert.equal(arena.floor.material.map,texture);
      assert.equal(disposed(),0);disposeArenaFloorTexture(arena);assert.equal(disposed(),1);
    }else{
      if(result==='error')failed(new Error('Unavailable'));
      if(result==='cancel'){cancel();loaded(texture);}
      if(result==='disposed'){view.disposed=true;loaded(texture);}
      assert.equal(arena.floor.material.map,atlas);assert.equal(disposed(),1);
      if(result==='error')assert.equal(view.floorTextureState,'fallback');
    }
  }
});
