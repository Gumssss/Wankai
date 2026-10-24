// Diagnostic page only; render the real ArenaView at matched camera poses.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ArenaView} from '/src/scene.js';
import {ArenaPhysics} from '/src/physics.js';
import {FIXED_CAMERA} from '/src/fixed-camera.js';
const selections=[{characterId:'basic-fighter',weaponId:'sword'},{characterId:'basic-fighter',weaponId:'polearm'}];
const world=new ArenaPhysics();world.reset(false,false,...selections,3);
const panes=[];
async function load(id,path){
  const host=document.getElementById(id),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;host.append(renderer.domElement);
  const camera=new THREE.PerspectiveCamera(55,1,.1,180),scene=new THREE.Scene();scene.background=new THREE.Color(0xebe9dc);
  const view=new ArenaView(renderer,camera,'duel-fixed',...selections);scene.add(view.arena,view.actors,view.effectsRoot);
  const source=await new GLTFLoader().loadAsync(path+'/colosseum-prepared-v01.glb');view.setArenaModel(source.scene);
  const floor=await new THREE.TextureLoader().loadAsync(path+'/colosseum-roman-floor-v01.jpg');view.setArenaFloorTexture(floor,8);
  const pane={id,host,renderer,camera,scene,view};panes.push(pane);draw(pane);
}
function draw({id,host,renderer,camera,scene,view}){
  const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);view.resize(width,height);
  const selected=document.getElementById('camera').value;
  if(selected==='overview'){camera.position.set(64,62,58);camera.lookAt(0,3,0);}
  else if(selected==='close'){camera.position.set(19,6,9);camera.lookAt(0,2,0);}
  else {camera.position.set(...FIXED_CAMERA.position);camera.lookAt(...FIXED_CAMERA.target);}
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  view.update(world.players,0,false,0,false,[0,0]);
  // update() restores the game camera; reapply only the study's extra views.
  if(selected==='overview'){camera.position.set(64,62,58);camera.lookAt(0,3,0);}
  else if(selected==='close'){camera.position.set(19,6,9);camera.lookAt(0,2,0);}
  camera.updateMatrixWorld(true);if(selected!=='overview')view.prepareArenaCamera(camera,world.players);renderer.render(scene,camera);view.restoreArenaCamera();
  let arenaTriangles=0;view.colosseum.root.traverse(o=>{if(o.isMesh)arenaTriangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
  const stats={ready:true,arenaTriangles,wallAtlas:[view.colosseum.sectors[0].mesh.material.map.image.width,view.colosseum.sectors[0].mesh.material.map.image.height],floorTexture:[view.colosseum.floor.material.map.image.width,view.colosseum.floor.material.map.image.height],visualScale:view.colosseum.root.scale.toArray(),arenaRadius:world.arenaRadius,renderCalls:renderer.info.render.calls};
  document.getElementById(id+'-stats').textContent=JSON.stringify(stats,null,2);
}
document.getElementById('camera').addEventListener('change',()=>panes.forEach(draw));
window.addEventListener('resize',()=>panes.forEach(draw));
await Promise.all([load('before','/assets/source/colosseum-runtime-v01'),load('after','/assets/concepts/colosseum/lite-v01/candidate')]);
