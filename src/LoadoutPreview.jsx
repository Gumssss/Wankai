import {instantiateYellowBlob,poseYellowBlob,makeYellowBlobFallback} from './yellow-blob-model.js';
import {useEffect,useMemo,useState,useRef} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {Box3,Group,Vector3,PlaneGeometry,Mesh,ShadowMaterial,PCFShadowMap,ACESFilmicToneMapping} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {resolveLoadout,loadoutKey} from './loadouts.js';
import {CHARACTERS} from './character-catalog.js';
import {instantiateBeagle,poseBeagle,makeBeagleFallback} from './beagle-model.js';
import {CAT} from './orange-tabby-profile.js';
import {instantiateOrangeTabby,poseOrangeTabby,makeOrangeTabbyFallback,poseOrangeTabbyFallback} from './orange-tabby-model.js';
import {createBasicFighter,createWeaponModel,createWeaponFallback,disposeModelResources} from './model-assets.js';
import {makePlayer,weaponPointFrame,v3} from './physics.js';
import {setWeaponRotation} from './weapon-visuals.js';

function Preview({selection,id,attempt,onStatus}){
 const {camera,size,invalidate,gl}=useThree(),[root,setRoot]=useState(null),[loadedVersion,setLoadedVersion]=useState(0),controls=useRef(null);
 const key=loadoutKey(selection);
 useEffect(()=>{
  const orbit=new OrbitControls(camera,gl.domElement);orbit.enablePan=false;orbit.minDistance=2;orbit.maxDistance=22;orbit.maxPolarAngle=Math.PI*.49;orbit.addEventListener('change',invalidate);controls.current=orbit;
  return()=>{orbit.removeEventListener('change',invalidate);orbit.dispose();};
 },[camera,gl,invalidate]);
 useEffect(()=>{
  let cancelled=false;const sources=[],owned=new Group(),character=CHARACTERS[selection.characterId];
  const full=selection.weaponId?resolveLoadout(selection):null,ears=full?.controller==='ears',cat=character.id==='orange-tabby',yellow=character.id==='yellow-blob';
  const bodyHost=new Group();bodyHost.position.y=character.bodyFloor+(cat?CAT.hoverHeight:0);owned.add(bodyHost);
  const catFallback=cat?makeOrangeTabbyFallback(id):null;
  const fallback=yellow?makeYellowBlobFallback(id).root:cat?catFallback.root:character.id==='beagle'?makeBeagleFallback(id,ears).root:createBasicFighter(id);bodyHost.add(fallback);
  const player=selection.weaponId?makePlayer(id,selection):null;
  if(player){player.p=v3(0,bodyHost.position.y,0);player.phi=0;player.theta=cat?CAT.restTheta:ears?-1.55:.82;if(cat)poseOrangeTabbyFallback(catFallback,player);}
  let floatingHost,weaponFallback;
  if(full?.weaponModel){floatingHost=new Group();const base=weaponPointFrame(player,v3()).point;floatingHost.position.set(base.x,base.y,base.z);setWeaponRotation(floatingHost.quaternion,player.theta,player.phi);weaponFallback=createWeaponFallback(selection.weaponId);floatingHost.add(weaponFallback);owned.add(floatingHost);}
  const loader=new GLTFLoader(),jobs=[];
  const bodyModel=full?.bodyModel??character.model;
  if(bodyModel)jobs.push({kind:'body',url:bodyModel});
  if(full?.weaponModel)jobs.push({kind:'weapon',url:full.weaponModel});
  // Keep the actual preview hidden until loading resolves. The geometric
  // backup is for failed assets, not a different-looking first frame.
  owned.visible=false;setRoot(owned);onStatus('loading');
  Promise.allSettled(jobs.map(job=>loader.loadAsync(`${import.meta.env.BASE_URL}models/${job.url}`))).then(results=>{
   let failed=false;
   results.forEach((result,index)=>{
    if(result.status==='rejected'){failed=true;return;}
    const source=result.value.scene;sources.push(source);if(cancelled)return;
    try{
     if(jobs[index].kind==='body'){
      const instance=yellow?instantiateYellowBlob(source,id):cat?instantiateOrangeTabby(source,id):instantiateBeagle(source,id,{rigged:ears});
      bodyHost.add(instance.host);fallback.visible=false;if(player){if(yellow)poseYellowBlob(instance,player);else if(cat)poseOrangeTabby(instance,player);else poseBeagle(instance,player,1);}
     }else{
      floatingHost.add(createWeaponModel(source,selection.weaponId,id));weaponFallback.visible=false;
     }
    }catch{failed=true;}
   });
   if(cancelled){disposeModelResources(sources);return;}
   owned.visible=true;onStatus(failed?'error':'ready');owned.updateMatrixWorld(true);setLoadedVersion(n=>n+1);invalidate();
  });
  return()=>{cancelled=true;disposeModelResources([owned,...sources]);};
 },[key,id,attempt,invalidate,onStatus]);
 useEffect(()=>{
  if(!root||!controls.current)return;
  root.updateMatrixWorld(true);const box=new Box3().setFromObject(root,true),center=box.getCenter(new Vector3());
  const direction=new Vector3(1,.30,.85).normalize();camera.position.copy(center).add(direction);camera.lookAt(center);camera.updateMatrixWorld(true);
  const right=new Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new Vector3(0,1,0).applyQuaternion(camera.quaternion),tan=Math.tan(camera.fov*Math.PI/360);let distance=2;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new Vector3(x,y,z).sub(center);distance=Math.max(distance,p.dot(direction)+Math.abs(p.dot(right))/(tan*size.width/size.height),p.dot(direction)+Math.abs(p.dot(up))/tan);}
  controls.current.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance*1.18);controls.current.update();invalidate();
 },[root,loadedVersion,camera,size.width,size.height,invalidate]);
 return root?<primitive object={root} dispose={null}/>:null;
}
export function LoadoutPreview({selection,id=0}){
 const [status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0),key=loadoutKey(selection);
 const [onStatus]=useState(()=>value=>setStatus(value));
 const floor=useMemo(()=>{const m=new Mesh(new PlaneGeometry(100,100),new ShadowMaterial({opacity:.14}));m.rotation.x=-Math.PI/2;m.position.y=-.015;m.receiveShadow=true;return m;},[]);
 useEffect(()=>()=>{floor.geometry.dispose();floor.material.dispose();},[floor]);
 return <div className="loadout-model-canvas" data-preview-state={status}>
  <Canvas shadows frameloop="demand" dpr={[1,1.5]} camera={{position:[5,3,7],fov:32,near:.01,far:80}} gl={{alpha:true,antialias:true}} onCreated={({gl})=>{gl.shadowMap.type=PCFShadowMap;gl.toneMapping=ACESFilmicToneMapping;}}>
   <ambientLight intensity={.4}/><hemisphereLight args={[0xfff9e8,0x8d947e,2.2]}/><directionalLight position={[4,7,4]} intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-near={.1} shadow-camera-far={30} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.0002} shadow-normalBias={.035}/>
   <primitive object={floor} dispose={null}/><Preview key={key} selection={selection} id={id} attempt={attempt} onStatus={onStatus}/>
  </Canvas>
  {status==='loading'&&<span className="loadout-preview-status" role="status">正在载入模型…</span>}
  {status==='error'&&<div className="loadout-preview-status" role="status">部分模型未载入，显示备用模型。<button onClick={()=>setAttempt(n=>n+1)}>重试</button></div>}
 </div>;
}
