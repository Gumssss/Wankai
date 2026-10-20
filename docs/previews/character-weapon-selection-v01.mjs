/** Isolated selection concept. Uses existing assets; does not alter game state. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {WEAPON_VISUALS} from '../../src/weapon-visuals.js';

const icons = {
  sword: '<path d="m8 47 8-11 18-31 7-1 1 7-22 28-8 10Z" fill="#bfc8bd" stroke="#6d7b6a" stroke-width="1.3"/><path d="m16 36 21-29" stroke="#f6f7dc" stroke-width="2"/><path d="m9 32 17 11" stroke="#b49150" stroke-width="4"/><path d="m6 45 9-12" stroke="#776a4e" stroke-width="4"/>',
  polearm: '<path d="m9 48 22-38" stroke="#8a7556" stroke-width="4"/><path d="M29 13Q39 18 43 3L46 6Q46 23 28 27L23 22Z" fill="#a4b0a0" stroke="#6d7b6a" stroke-width="1.2"/><path d="m10 45 3 2" stroke="#c7b887" stroke-width="3"/>',
  hammer: '<path d="M22 19v31" stroke="#8a7556" stroke-width="5"/><path d="M6 9h32v18H6z" fill="#98a392" stroke="#677662" stroke-width="1.2"/><path d="M11 10v16M32 10v16" stroke="#cbd0b8" stroke-width="2"/><path d="M21 32q-10 7-4 14" fill="none" stroke="#bb7860" stroke-width="3"/>',
  longEars: '<path d="M11 5q-9 5-6 29 1 15 10 15 9-1 6-13L17 8q-1-5-6-3Z" fill="#d6a55f" stroke="#b38b50"/><path d="M34 5q9 5 6 29-1 15-10 15-9-1-6-13l4-28q1-5 6-3Z" fill="#d6a55f" stroke="#b38b50"/>',
  catPaws: '<path d="M5 22Q0 6 9 8l5 7q-4-16 5-15l5 13Q24-3 32 2l1 15q8-12 13-3 4 7-5 16l-1 17H10Z" fill="#fff9e9" stroke="#b3ac94" stroke-width="1.4"/><path d="M16 30q10-9 16 0l2 10H14Z" fill="#dfa9a0"/><ellipse cx="10" cy="22" rx="4" ry="5" fill="#e4b5a8"/><ellipse cx="21" cy="18" rx="4" ry="5" fill="#e4b5a8"/><ellipse cx="32" cy="20" rx="4" ry="5" fill="#e4b5a8"/>'
};
const weapons = [
  {id:'sword',name:'短剑',tag:'通用 · 近身快挥',description:'自然长度的耳朵 + 独立短剑。保留比格犬的脸、身体和配色。'},
  {id:'polearm',name:'长柄刀',tag:'通用 · 长距控场',description:'自然长度的耳朵 + 独立长柄刀。角色不变，武器决定挥动与触地方式。'},
  {id:'hammer',name:'铁战锤',tag:'通用 · 重击破势',description:'自然长度的耳朵 + 独立战锤。角色不变，切换为重型武器。'},
  {id:'longEars',name:'长耳',tag:'比格专属 · 双耳',description:'同一个比格犬，耳朵延长成为武器。使用当前已选定的长耳模型。'},
  {id:'catPaws',name:'猫爪',tag:'橘猫专属 · 开发中',description:'开发中的橘猫专属武器。'}
];
const $ = selector => document.querySelector(selector);
const params = new URLSearchParams(location.search);
const players = [{weapon:null,step:'character'}, {weapon:null,step:'character'}];
let player = 0;
let step = ['weapon','ready'].includes(params.get('step')) ? params.get('step') : 'character';
let weapon = weapons.some(w=>w.id===params.get('weapon')&&w.id!=='catPaws') ? params.get('weapon') : null;
if(step==='character') weapon=null;
players[0]={weapon,step};
const stage=$('#stage'),canvas=$('canvas');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(31,1,.01,100);
const controls=new OrbitControls(camera,canvas);
controls.enableDamping=true;controls.enablePan=false;controls.minDistance=2;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xfff9e8,0x8d947e,2.2));
const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(4,7,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-6,near:.1,far:30});key.shadow.bias=-.00015;scene.add(key);
const fill=new THREE.DirectionalLight(0xdbe8f0,.8);fill.position.set(-3,3,-4);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({color:0x6b7356,opacity:.16}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(1.38,1.387,96),new THREE.MeshBasicMaterial({color:0xbec6a5,transparent:true,opacity:.5,side:THREE.DoubleSide}));
ring.rotation.x=-Math.PI/2;ring.position.y=-.009;scene.add(ring);
const loader=new GLTFLoader(),cache=new Map();
let current,request=0,currentState='loading',currentBounds;
function load(name){
  if(!cache.has(name))cache.set(name,loader.loadAsync(`/models/${name}.glb`));
  return cache.get(name);
}
function fit(){
  if(!current)return;
  current.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(current,true);currentBounds=box.clone();
  const center=box.getCenter(new THREE.Vector3());
  const direction=new THREE.Vector3(1,.19,weapon==='longEars'?.86:.40).normalize();
  camera.position.copy(center).add(direction);camera.lookAt(center);camera.updateMatrixWorld(true);
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),tan=Math.tan(camera.fov*Math.PI/360);
  let distance=2;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const v=new THREE.Vector3(x,y,z).sub(center),depth=v.dot(direction);
    distance=Math.max(distance,depth+Math.abs(v.dot(right))/(tan*camera.aspect),depth+Math.abs(v.dot(up))/tan);
  }
  controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance*1.16);controls.update();
}
new ResizeObserver(()=>{renderer.setSize(stage.clientWidth,stage.clientHeight,false);camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();fit();}).observe(stage);
function prepare(model){
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
  return model;
}
async function renderLoadout(){
  const token=++request;
  currentState='loading';$('#load-status').hidden=false;$('#load-status').textContent='正在载入实际模型…';
  try{
    const long=weapon==='longEars';
    const [body,gear]=await Promise.all([load(long?'beagle-smooth-ear-duelist-v05':'beagle-smooth-appearance-v05'),weapon&&!long?load(weapon):Promise.resolve(null)]);
    if(token!==request)return;
    if(current)scene.remove(current);
    current=new THREE.Group();
    const model=prepare(clone(body.scene));
    // Keep the accepted long-ear asset's bind/rest pose, matching its initial
    // runtime ear pitch (-1.55). This page does not author a new attack pose.
    const color=player===0?0xc4684f:0x568d92;
    model.traverse(o=>{if(o.isMesh)for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat.name==='MAT_Player_Accent'){o.material=mat.clone();o.material.color.set(color);}});
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model,true);
    model.position.y-=bounds.min.y;
    current.add(model);
    if(gear){
      const item=prepare(clone(gear.scene)),carrier=new THREE.Group();
      item.quaternion.setFromUnitVectors(new THREE.Vector3(...WEAPON_VISUALS[weapon].axis).normalize(),new THREE.Vector3(0,1,0));
      item.updateMatrixWorld(true);
      const b=new THREE.Box3().setFromObject(item,true),height=b.max.y-b.min.y;
      const scale={sword:1.45,polearm:2.65,hammer:1.75}[weapon]/height;
      item.scale.setScalar(scale);item.updateMatrixWorld(true);
      const normalized=new THREE.Box3().setFromObject(item,true),mid=normalized.getCenter(new THREE.Vector3());
      item.position.set(-mid.x,-normalized.min.y,-mid.z);
      carrier.add(item);
      carrier.rotation.x=-.18;carrier.rotation.z=-.06;carrier.rotation.y=.3;
      carrier.position.set(.45,.08,1.5);
      current.add(carrier);
    }
    current.updateMatrixWorld(true);
    const total=new THREE.Box3().setFromObject(current,true);current.position.y-=total.min.y;
    scene.add(current);fit();
    currentState='ready';$('#load-status').hidden=true;
    // Use the same actual compact model for the character portrait.
    if(!$('#beagle-portrait').src)createPortrait().catch(console.error);
  }catch(error){if(token!==request)return;currentState='error';$('#load-status').textContent='模型加载失败，请刷新后重试。';console.error(error);}
}
async function createPortrait(){
  const body=await load('beagle-smooth-appearance-v05');
  const portraitScene=new THREE.Scene();portraitScene.add(clone(body.scene));
  portraitScene.add(new THREE.HemisphereLight(0xfff9e8,0x8d947e,2.6));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(4,5,3);portraitScene.add(light);
  const box=new THREE.Box3().setFromObject(portraitScene,true),c=box.getCenter(new THREE.Vector3()),height=box.max.y-box.min.y;
  const cam=new THREE.PerspectiveCamera(26,1,.01,100);c.y=box.min.y+height*.64;cam.position.copy(c).add(new THREE.Vector3(3.8,.2,1.3).multiplyScalar(height/1.7));cam.lookAt(c);
  const thumb=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});thumb.setSize(240,240);thumb.outputColorSpace=THREE.SRGBColorSpace;thumb.toneMapping=THREE.ACESFilmicToneMapping;
  thumb.render(portraitScene,cam);$('#beagle-portrait').src=thumb.domElement.toDataURL('image/png');thumb.dispose();thumb.forceContextLoss();
}
function update(){
  players[player]={weapon,step};
  const info=weapons.find(w=>w.id===weapon),long=weapon==='longEars';
  document.documentElement.style.setProperty('--accent',player===0?'var(--red)':'var(--blue)');
  document.querySelectorAll('[data-player]').forEach(b=>{const id=Number(b.dataset.player);b.classList.toggle('active',id===player);b.querySelector('i').textContent=id===player?'正在配置':players[id].step==='ready'?'已选搭配':'待配置';});
  document.querySelectorAll('[data-step]').forEach(b=>{b.classList.toggle('active',b.dataset.step===step);b.classList.toggle('done',b.dataset.step==='character'&&step!=='character'||b.dataset.step==='weapon'&&step==='ready');});
  $('.player-marker').textContent=`P${player+1}`;
  $('#appearance-label').textContent=long?'角色不变 · 长耳武器形态':'原始比例 · 自然垂耳';
  $('#model-tag').textContent=info?'角色 + 已选武器':'角色本体';
  $('#loadout-title').innerHTML=`比格犬 <span>＋</span> ${info?.name??'待选武器'}`;
  $('#ear-pill').textContent=long?'长耳战斗形态':'自然长度耳朵';
  $('#step-eyebrow').textContent=step==='character'?'STEP 01 / CHARACTER':step==='weapon'?'STEP 02 / WEAPON':'STEP 03 / READY';
  $('#step-title').innerHTML=(step==='character'?'先选你喜欢的角色':step==='weapon'?'再选你的战斗方式':'这次，就用这套')+'<span>。</span>';
  $('#step-description').textContent=step==='character'?'角色决定外观，下一步再为它选择武器。':step==='weapon'?'同一个角色，可以尝试不同武器。右侧实时预览搭配。':'检查角色与武器，随时可以返回更换。';
  $('#weapon-count').textContent=step==='character'?'选择角色后挑选武器':'03 通用 / 01 比格专属';
  $('.weapon-grid').classList.toggle('pre-selection',step==='character');
  $('.weapon-grid').innerHTML=weapons.map(w=>`<button class="weapon-card ${weapon===w.id?'selected':''}" data-weapon="${w.id}" aria-pressed="${weapon===w.id}" ${step==='character'||w.id==='catPaws'?'disabled':''}><svg viewBox="0 0 48 54" aria-hidden="true">${icons[w.id]}</svg><span><strong>${w.name}</strong><small>${w.tag}</small></span>${weapon===w.id?'<span class="tick">✓</span>':''}</button>`).join('')+'<div class="weapon-card empty-weapon" aria-hidden="true">＋</div>';
  document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{weapon=b.dataset.weapon;update();renderLoadout();});
  $('#detail-category').textContent=info?long?'SIGNATURE WEAPON / 比格专属':'COMMON WEAPON / 通用武器':'CHARACTER IDENTITY';
  $('#detail-title').textContent=info?`比格犬 + ${info.name}`:'同一个比格犬，不同的打法。';
  $('#detail-copy').textContent=info?info.description:'选择普通武器时保留自然长度耳朵；选择长耳时，切换为当前的长耳战斗形态。';
  $('#next').disabled=step!=='character'&&!weapon;
  $('#next').innerHTML=step==='character'?'确认角色，选择武器 <span>→</span>':step==='weapon'?'确认搭配 <span>→</span>':'返回选择，继续比较 <span>↺</span>';
  const query=new URLSearchParams({step,...(weapon?{weapon}:{})});history.replaceState(null,'',`?${query}`);
}
$('#next').onclick=()=>{step=step==='character'?'weapon':step==='weapon'?'ready':'weapon';update();};
$('#back').onclick=()=>{step='character';weapon=null;update();renderLoadout();};
$('#choose-beagle').onclick=()=>{step='character';weapon=null;update();renderLoadout();};
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{if(b.dataset.step==='ready'&&!weapon)return;step=b.dataset.step;if(step==='character')weapon=null;update();renderLoadout();});
document.querySelectorAll('[data-player]').forEach(b=>b.onclick=()=>{players[player]={weapon,step};player=Number(b.dataset.player);({weapon,step}=players[player]);update();renderLoadout();});
$('#reset-view').onclick=fit;
window.__selectionConcept={snapshot:()=>({step,weapon,player,model:weapon==='longEars'?'long-ear-rig':'compact-original',state:currentState,bounds:currentBounds?.getSize(new THREE.Vector3()).toArray(),players:structuredClone(players),productionModified:false})};
update();renderLoadout();
function tick(){requestAnimationFrame(tick);controls.update();renderer.render(scene,camera);}tick();
