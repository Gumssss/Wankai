import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

let asset, pending;
export const cr7RigReady=()=>!!asset;
export function preloadCr7Rig(){
  pending??=(async()=>{
    const loader=new GLTFLoader();
    let bytes;
    if(typeof window==='undefined'){
      const file=globalThis.process.getBuiltinModule('node:fs').readFileSync(new URL('../../public/models/characters/cr7-rig-v01.glb',import.meta.url));
      bytes=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
      loader.register(()=>({name:'NodeCR7Textures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
    }else{
      const url=`${import.meta.env?.BASE_URL??'./'}models/characters/cr7-rig-v01.glb`;
      bytes=await fetch(url).then(r=>{if(!r.ok)throw Error(`CR7 rig: ${r.status}`);return r.arrayBuffer();},()=>new Promise((resolve,reject)=>{
        const r=new XMLHttpRequest();r.open('GET',url);r.responseType='arraybuffer';
        r.onload=()=>r.response?.byteLength?resolve(r.response):reject(Error('Empty CR7 rig'));r.onerror=()=>reject(Error('CR7 rig unavailable'));r.send();
      }));
    }
    asset=await loader.parseAsync(bytes,'');
    asset.scene.traverse(o=>{if(!o.isMesh)return;o.geometry.userData.shared=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material])for(const v of Object.values(m))if(v?.isTexture)v.userData.shared=true;
    });
  })().catch(e=>{pending=null;throw e;});
  return pending;
}

// Each fighter owns bones, mixer and materials. Root motion is never animated.
export function buildCr7Rig(kit){
  if(!asset)return null; // Synchronous Node geometry callers use the original mesh.
  const body=clone(asset.scene),mixer=new THREE.AnimationMixer(body);
  body.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
    const original=o.material;o.material=kit.material(0xffffff,{map:original.map,normalMap:original.normalMap,roughness:original.roughness,metalness:0,sheen:0,clearcoat:0});
    o.frustumCulled=false;
  });
  const kick=mixer.clipAction(THREE.AnimationClip.findByName(asset.animations,'CR7_Kick'));
  const walk=mixer.clipAction(THREE.AnimationClip.findByName(asset.animations,'CR7_Step'));
  for(const action of [kick,walk]){action.play();action.paused=true;action.setEffectiveWeight(0);}
  return {body,mixer,pose(p){
    const active=p.abilityPhase==='active',elapsed=3-(p.abilityTime??3);
    const speed=active?Math.min(2.2,Math.hypot(p.v?.x??0,p.v?.z??0)):0;
    const kicking=p.abilityPhase==='windup'||(active&&elapsed<.2);
    kick.time=p.abilityPhase==='windup'?Math.max(0,.4-p.abilityTime):.4+elapsed;
    const k=kicking?(active?Math.max(0,1-elapsed/.2):1):0;
    // Sample authoritative skill time, so pause, network snapshots and slow
    // replays show the same pose instead of advancing a second visual clock.
    kick.setEffectiveWeight(k);walk.time=Math.max(0,elapsed)%.6;walk.setEffectiveWeight(speed/2.2*(1-k));
    mixer.update(0);
  }};
}
