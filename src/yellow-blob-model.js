import {Group,Mesh,SphereGeometry,MeshStandardMaterial,Color} from 'three';

const WHITE=new Color(0xffffff);
export function instantiateYellowBlob(source,id=0){
  const host=new Group(),model=source.clone(true),materials=new Map();
  host.name='YellowBlob_Character';host.position.y=-.59;
  // The approved GLB faces +Z. This parent aligns its face with solver +X.
  // Keep imported quaternion transforms intact; arena root owns yaw and travel.
  host.rotation.y=Math.PI/2;host.scale.setScalar(1.7);host.add(model);
  model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=o.receiveShadow=true;
    const own=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};
    o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
  });
  const owned=[...materials.values()];
  return {host,model,id,materials:owned,colors:owned.map(m=>m.color.clone())};
}
export function poseYellowBlob(instance,player){
  instance.materials.forEach((m,i)=>m.color.copy(instance.colors[i]).lerp(WHITE,(player.hitFlash||0)*.65));
}
export function makeYellowBlobFallback(id=0){
  const root=new Group(),gold=new MeshStandardMaterial({color:0xfdce3a,roughness:.8}),green=new MeshStandardMaterial({color:0x88a64b}),black=new MeshStandardMaterial({color:0x111511});
  const sphere=(p,s,m)=>{const o=new Mesh(new SphereGeometry(1,20,14),m);o.position.set(...p);o.scale.set(...s);o.castShadow=o.receiveShadow=true;root.add(o);};
  sphere([0,.03,0],[.56,.62,.67],gold);sphere([0,.69,0],[.42,.42,.43],gold);
  for(const side of [-1,1]){
    sphere([0,-.46,side*.31],[.24,.13,.23],gold);
    sphere([0,.06,side*.64],[.15,.30,.12],gold);
    sphere([.36,.79,side*.23],[.065,.105,.09],green);
    sphere([.415,.79,side*.23],[.025,.065,.05],black);
  }
  sphere([.425,.55,0],[.06,.025,.15],gold);
  const materials=[gold,green,black];
  return {root,id,materials,colors:materials.map(m=>m.color.clone())};
}
