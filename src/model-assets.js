import {Group,Mesh,SphereGeometry,CapsuleGeometry,MeshStandardMaterial,Vector3,Box3,Color} from 'three';
import {WEAPON_VISUALS} from './weapon-visuals.js';
import {WEAPONS} from './physics.js';
const colors=[0xc4684f,0x568d92];

export function createBasicFighter(id=0){
 const root=new Group();
 for(const [scale,pos,color]of [[[.39,.55,.33],[0,0,0],colors[id]],[[.37,.4,.335],[0,.76,0],0xe7c199]]){
  const mesh=new Mesh(new SphereGeometry(1,32,24),new MeshStandardMaterial({color,roughness:.92}));mesh.scale.set(...scale);mesh.position.set(...pos);mesh.castShadow=true;root.add(mesh);
 }
 for(const side of [-1,1]){const eye=new Mesh(new SphereGeometry(.037,8,8),new MeshStandardMaterial({color:0x343a32}));eye.position.set(.325,.83,side*.13);root.add(eye);}
 return root;
}
export function createWeaponModel(source,type,id=0){
 const weapon=source.clone(true),visual=WEAPON_VISUALS[type];
 if(!visual)throw Error('No floating weapon visual: '+type);
 weapon.quaternion.setFromUnitVectors(new Vector3(...visual.axis).normalize(),new Vector3(0,1,0));weapon.updateMatrixWorld(true);
 const height=new Box3().setFromObject(weapon).getSize(new Vector3()).y;
 if(!Number.isFinite(height)||height<=0)throw Error('Weapon model has invalid bounds');
 const scale=WEAPONS[type].length/height,butt=new Vector3(...visual.butt).applyQuaternion(weapon.quaternion).multiplyScalar(scale);
 weapon.scale.setScalar(scale);weapon.position.copy(butt).multiplyScalar(-1);
 const materials=new Map();
 weapon.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
  const own=original=>{if(!materials.has(original)){const mat=original.clone();if(type==='polearm'){mat.color.set(0x626a70).lerp(new Color(colors[id]),.18);mat.metalness=.24;mat.roughness=.62;}materials.set(original,mat);}return materials.get(original);};
  o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
 });
 return weapon;
}
export function createWeaponFallback(type){
 const root=new Group(),material=new MeshStandardMaterial({color:type==='yellow-staff'?0xfdce3a:0x818675,roughness:.8});
 for(const c of WEAPONS[type].colliders){const a=new Vector3(...c.a),b=new Vector3(...c.b),direction=b.clone().sub(a);const m=new Mesh(new CapsuleGeometry(c.radius,direction.length(),4,8),material);m.position.copy(a.add(b).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new Vector3(0,1,0),direction.normalize());m.castShadow=true;root.add(m);}
 return root;
}
export function disposeModelResources(roots){
 const resources=new Set();
 for(const root of roots.filter(Boolean))root.traverse(o=>{
  if(o.geometry)resources.add(o.geometry);if(o.skeleton)resources.add(o.skeleton);
  for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat){resources.add(mat);for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);}
 });
 for(const resource of resources)resource.dispose();
}
