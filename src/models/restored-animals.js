// Accepted Tripo/Blender exports, reused without regenerating or reshaping them.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BEAGLE} from '../beagle-profile.js';
import {CAT} from '../orange-tabby-profile.js';
import {instantiateBeagle,poseBeagle,makeBeagleFallback} from '../beagle-model.js';
import {instantiateOrangeTabby,poseOrangeTabby,makeOrangeTabbyFallback,poseOrangeTabbyFallback} from '../orange-tabby-model.js';
import {beagleEarYaw} from '../beagle-skill.js';

export const ANIMAL_MODELS=Object.freeze([BEAGLE.model,BEAGLE.appearanceModel,CAT.model]);
const assets=new Map(),failures=new Map();let pending;
const shared=scene=>scene.traverse(o=>{
 if(!o.isMesh)return;
 o.geometry.userData.shared=true;
 for(const m of Array.isArray(o.material)?o.material:[o.material])
  for(const value of Object.values(m))if(value?.isTexture)value.userData.shared=true;
});
async function load(name){
 const loader=new GLTFLoader();let gltf;
 if(typeof window==='undefined'){
  // Geometry/skeletons are real in Node checks. Only image decoding is omitted.
  const fs=globalThis.process.getBuiltinModule('node:fs');
  const bytes=fs.readFileSync(new URL('../../public/models/'+name,import.meta.url));
  loader.register(()=>({name:'NodeAnimalTextures',loadTexture(){return Promise.resolve(new THREE.Texture());}}));
  gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 }else gltf=await loader.loadAsync(`${import.meta.env?.BASE_URL??'./'}models/${name}`);
 shared(gltf.scene);assets.set(name,gltf.scene);failures.delete(name);
}
export function preloadAnimalModels(){
 pending??=Promise.all(ANIMAL_MODELS.filter(n=>!assets.has(n)).map(n=>load(n).catch(error=>{
  failures.set(n,error);console.warn('Restored character model unavailable:',n,error.message);
 })));
 return pending;
}
export const animalModelsReady=()=>ANIMAL_MODELS.every(n=>assets.has(n)||failures.has(n));
export const animalAssetStatus=()=>Object.fromEntries(ANIMAL_MODELS.map(n=>[n,assets.has(n)?'ready':failures.has(n)?'failed':'pending']));

export function buildAnimal(loadout,id=0){
 const beagle=loadout.characterId==='beagle',rigged=beagle&&loadout.weaponId==='long-ears';
 const name=beagle?(rigged?BEAGLE.model:BEAGLE.appearanceModel):CAT.model;
 const source=assets.get(name);let instance,root,pose,materials;
 if(source){
  instance=beagle?instantiateBeagle(source,id,{rigged}):instantiateOrangeTabby(source,id);
  root=instance.host;materials=instance.materials;
  pose=(p,t)=>beagle?poseBeagle(instance,p,t):poseOrangeTabby(instance,p);
 }else{
  instance=beagle?makeBeagleFallback(id,rigged):makeOrangeTabbyFallback(id);
  root=instance.root;materials=instance.materials??[];
  pose=(p)=>{
   if(!beagle)return poseOrangeTabbyFallback(instance,p);
   instance.body.rotation.z=-(p.bodyPitch||0);
   for(const [side,hinge]of Object.entries(instance.hinges)){
    hinge.rotation.set(0,-beagleEarYaw(p,BEAGLE.anchors[side]),-p.theta,'YZX');
   }
  };
 }
 const host=new THREE.Group();host.name=`${loadout.characterId}-${id}`;host.add(root);
 host.userData.asset=name;host.userData.assetReady=!!source;
 return {root:host,instance,kit:{materials},pose};
}
