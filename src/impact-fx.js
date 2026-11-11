import * as THREE from 'three';
import { CHARACTERS } from './character-catalog.js';
import { FEEDBACK } from './impact-feedback.js';

const v = p => new THREE.Vector3(p.x, p.y, p.z);
export function screenSizedRadius(camera, point, radius, minimum=.025, maximum=.06) {
  if (!camera?.isPerspectiveCamera) return radius;
  camera.updateMatrixWorld();
  const depth = Math.max(camera.near, -v(point).applyMatrix4(camera.matrixWorldInverse).z);
  const height = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom;
  return THREE.MathUtils.clamp(radius, height * minimum, height * maximum);
}
const finitePoint = p => p && ['x', 'y', 'z'].every(k => Number.isFinite(p[k]));
const starShape = () => {
  const shape = new THREE.Shape();
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10, radius = i % 2 ? 0.43 : (i % 4 ? 0.87 : 1);
    const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
    if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath(); return new THREE.ShapeGeometry(shape);
};
const dropletShape = () => {
  const shape = new THREE.Shape();shape.moveTo(0, 0.8);
  shape.bezierCurveTo(-0.2, 0.42, -0.55, 0.04, -0.48, -0.25);
  shape.bezierCurveTo(-0.4, -0.75, 0.4, -0.75, 0.48, -0.25);
  shape.bezierCurveTo(0.55, 0.04, 0.2, 0.42, 0, 0.8);
  return new THREE.ShapeGeometry(shape);
};

// Bounded, pooled, procedural comic effects. No model or physics object is changed.
export class ImpactFx {
  constructor(root) {
    this.root = root;this.active = [];this.pool = new Map();this.bleeding = new Map();
    this.geometries = {
      star: starShape(), drop: dropletShape(), circle: new THREE.CircleGeometry(1, 24),
      ring: new THREE.RingGeometry(0.83, 1, 40), slash: new THREE.RingGeometry(0.82, 1, 28, 1, 0.18, Math.PI * 1.1),
      streak: new THREE.ConeGeometry(0.04, 1, 3), box: new THREE.PlaneGeometry(1, 1),
    };
  }
  mesh(shape, color, parent, scale = 1, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(this.geometries[shape], new THREE.MeshBasicMaterial({color,
      transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}));
    mesh.scale.setScalar(scale);mesh.position.set(x, y, z);mesh.userData.baseScale = mesh.scale.clone();parent.add(mesh);return mesh;
  }
  create(kind) {
    const root = new THREE.Group();
    if (kind === 'burst') {
      this.mesh('star', 0x2b1a10, root, 1.25, 0, 0, -.005);
      this.mesh('star', 0xe87725, root, 1.08);
      this.mesh('star', 0xffd956, root, 0.94, 0, 0, 0.005);
      this.mesh('star', 0xfff8db, root, 0.57, 0, 0, 0.01);
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2;
        const ray = this.mesh('streak', 0xfff2b0, root, 1, Math.cos(angle) * 1.3, Math.sin(angle) * 1.3);
        ray.scale.set(1, 0.5, 1);ray.rotation.z = angle - Math.PI / 2;
      }
    } else if (kind === 'clash') {
      this.mesh('ring', 0x7e93a8, root, .55);
      for (let i=0;i<4;i++) {
        const angle=i*Math.PI/2, ray=this.mesh('streak',0xdde8f2,root,1,Math.cos(angle)*.8,Math.sin(angle)*.8);
        ray.scale.set(.7,.45,.7);ray.rotation.z=angle-Math.PI/2;
      }
    } else if (kind === 'paw') {
      this.mesh('circle', 0xf19aa7, root, 0.38, 0, -0.2);
      for (const [x,y,r] of [[-.48,.18,.18],[-.19,.48,.20],[.19,.48,.20],[.48,.18,.18]]) this.mesh('circle',0xffcfda,root,r,x,y,.005);
    } else if (kind === 'pan') {
      const oval = this.mesh('ring',0xffdc69,root,1);oval.scale.y=.45;
      for (const side of [-1,1]) {const arc=this.mesh('slash',0xfff5cc,root,.45,side*1.1,0,.01);arc.rotation.z=side>0?-.8:2.3;}
    } else if (kind === 'slash' || kind === 'ear') {
      const slash=this.mesh('slash',kind==='ear'?0xe8c39b:0xfff7dc,root,1);slash.scale.y=kind==='ear'?.55:.8;
    } else if (kind === 'stack') this.mesh('drop',0xd43454,root,.7);
    else if (kind === 'heal') {
      for(let i=0;i<5;i++)this.mesh('circle',i%2?0xf25466:0xba2545,root,.055);
    } else if (kind === 'box') {
      this.mesh('box',0xffd34d,root,.7);const inside=this.mesh('box',0xfff8dc,root,.45,0,0,.01);inside.rotation.z=Math.PI/4;
    } else if (kind === 'heart') {
      this.mesh('circle',0xf29ac3,root,.43,-.25,.16);this.mesh('circle',0xf29ac3,root,.43,.25,.16);
      const tip=this.mesh('streak',0xf29ac3,root,1,0,-.17,.005);tip.rotation.z=Math.PI;tip.scale.set(11,.75,1);
    } else this.mesh('ring',kind==='pulse'?0xea4f67:0xffe29b,root,1);
    root.traverse(o=>{if(o.material){o.renderOrder=4;o.frustumCulled=false;}});
    return root;
  }
  acquire(kind, point, {life=.2,size=.5,angle=0,category='accent',follow=null,source=null}={}) {
    if(!finitePoint(point))return null;
    const limit=category==='burst'?FEEDBACK.MAX_BURSTS:FEEDBACK.MAX_ACCENTS;
    const same=this.active.filter(e=>e.category===category);
    if(same.length>=limit)this.release(same[0]);
    let cache=this.pool.get(kind);if(!cache){cache=[];this.pool.set(kind,cache);}
    const root=cache.pop()??this.create(kind);root.position.copy(v(point));root.scale.setScalar(size);root.visible=true;
    root.traverse(o=>{if(o.material)o.material.opacity=1;});this.root.add(root);
    const effect={kind,root,life,maxLife:life,size,angle,category,follow,source:finitePoint(source)?v(source):null,destination:v(point)};
    this.active.push(effect);return effect;
  }
  hit(event, feedback, scale=1) {
    const size=(feedback.heavy?.48:.32)*scale;
    const minimum=feedback.heavy?.04:.025;
    const normal=finitePoint(event.normal)?event.normal:{x:0,y:1,z:0};
    const burst=this.acquire('burst',event.point,{life:FEEDBACK.BURST_LIFE,size,category:'burst'});
    if(burst){burst.screenMinimum=minimum;burst.direction=v(normal);if(feedback.heavy)burst.root.children[2].material.color.setHex(0xffb03f);else burst.root.children[2].material.color.setHex(0xffd956);}
    const family=feedback.family;
    if(['slash','paw','pan','ear','box','heart'].includes(family)){
      const accent=this.acquire(family,event.point,{life:.22,size:size*1.65,angle:Math.atan2(normal.y,normal.x)});
      if(accent){accent.direction=v(normal);accent.screenMinimum=minimum*1.2;}
    }
    if(feedback.heavy)this.acquire('ring',event.point,{life:FEEDBACK.HEAVY_RING_LIFE,size:size*1.5});
  }
  clash(event, scale=1) {this.acquire('clash',event.point,{life:.12,size:.25*Math.min(2,scale)});}
  stack(event, scale=1) {const point={...event.point,y:event.point.y+1.3*scale};this.acquire('stack',point,{life:.45,size:.28*Math.min(2,scale),follow:event.target});}
  heal(event) {
    if(!(event.amount>0)||!finitePoint(event.point))return;
    const destination={...event.point,y:event.point.y+.75};
    if(finitePoint(event.sourcePoint))this.acquire('heal',destination,{life:FEEDBACK.HEAL_LIFE,size:1,follow:event.player,source:event.sourcePoint});
    else this.acquire('pulse',destination,{life:.25,size:.45,follow:event.player});
  }
  update(dt,camera,players=[],reducedMotion=false) {
    if(!camera)return;
    for(const e of [...this.active]){
      e.life-=dt;if(e.life<=0){
        if(e.kind==='heal')this.acquire('pulse',e.destination,{life:.18,size:.4,follow:e.follow});
        this.release(e);continue;
      }
      const t=1-e.life/e.maxLife;
      e.root.quaternion.copy(camera.quaternion);
      let angle=e.angle;
      if(e.direction){const d=e.direction.clone().applyQuaternion(camera.quaternion.clone().invert());angle=Math.atan2(d.y,d.x);}
      e.root.rotateZ(angle);
      const followed=players.find(p=>p.id===e.follow);
      if(e.kind==='heal'){
        if(followed)e.destination.set(followed.p.x,followed.p.y+.75*(followed.scale??1),followed.p.z);
        e.root.position.set(0,0,0);e.root.quaternion.identity();
        e.root.children.forEach((mesh,i)=>{
          const progress=Math.max(0,Math.min(1,t*1.3-i*.065));
          mesh.position.lerpVectors(e.source,e.destination,progress);mesh.position.y+=Math.sin(Math.PI*progress)*(.18+i*.025);
          mesh.quaternion.copy(camera.quaternion);mesh.material.opacity=Math.min(1,(1-progress)*5);
        });
      }else{
        if(followed&&(e.kind==='stack'||e.kind==='pulse'))e.root.position.set(followed.p.x,followed.p.y+(e.kind==='stack'?1.3:.75)*(followed.scale??1),followed.p.z);
        const growth=reducedMotion?1:e.kind==='burst'?.7+Math.min(1,t/.25)*.35:e.kind==='ring'||e.kind==='pulse'?1+t*1.5:1+t*.2;
        const size=e.screenMinimum ? screenSizedRadius(camera,e.root.position,e.size,e.screenMinimum) : e.size;
        e.root.scale.setScalar(size*growth);
        if(e.kind==='stack'&&!reducedMotion)e.root.position.y+=t*.3;
        e.root.traverse(o=>{if(o.material)o.material.opacity=Math.min(1,(1-t)*3);});
      }
    }
  }
  // Persistent, bounded status art: a blood-drop badge and trickling droplets.
  updateBleeding(players,dt,camera,visible=true,reducedMotion=false) {
    const seen=new Set();
    if (visible) for (const p of players) {
      if (!(p.bleedStacks>0) || !(p.health>0)) continue;
      seen.add(p.id);
      let status=this.bleeding.get(p.id);
      if (!status) {
        const root=new THREE.Group(),badge=new THREE.Group(),drips=new THREE.Group();
        this.mesh('drop',0x401425,badge,.25);this.mesh('drop',0xef3658,badge,.20,0,0,.008);
        this.mesh('drop',0xffb0b7,badge,.045,-.055,.05,.012);
        root.add(badge,drips);
        for(let i=0;i<6;i++){
          const drop=new THREE.Group();this.mesh('drop',0x59192b,drop,.12);this.mesh('drop',0xd92d49,drop,.09,0,0,.008);drips.add(drop);
        }
        root.traverse(o=>{if(o.material){o.material.depthTest=false;o.renderOrder=5;}});
        this.root.add(root);status={root,badge,drips,time:0};this.bleeding.set(p.id,status);
      }
      status.time+=dt;
      const scale=p.scale??1,character=CHARACTERS[p.characterId];
      const height=(character?.bounds?.max?.[1]??2)-(character?.bodyFloor??.59);
      status.root.position.copy(v(p.p));status.root.scale.setScalar(scale);
      status.root.quaternion.identity();status.badge.quaternion.copy(camera.quaternion);
      status.badge.position.set(0,height+.35,0);
      const count=Math.min(6,2+p.bleedStacks);
      status.drips.children.forEach((drop,i)=>{
        drop.visible=i<count;drop.quaternion.copy(camera.quaternion);
        const phase=reducedMotion?.4:(status.time*.85+i/6)%1;
        drop.position.set((i%2?1:-1)*(.22+(i%3)*.10),height*.6-phase*(height*.6+.2),.12);
        drop.traverse(mesh=>{if(mesh.material)mesh.material.opacity=reducedMotion?.8:Math.min(1,phase*6,(1-phase)*5);});
      });
    }
    for(const [id,status] of this.bleeding) if(!seen.has(id)) {
      this.root.remove(status.root);status.root.traverse(o=>o.material?.dispose());this.bleeding.delete(id);
    }
  }
  release(effect) {
    const index=this.active.indexOf(effect);if(index<0)return;
    this.active.splice(index,1);this.root.remove(effect.root);effect.root.visible=false;
    const cache=this.pool.get(effect.kind);if(cache.length<FEEDBACK.MAX_ACCENTS)cache.push(effect.root);
    else effect.root.traverse(o=>o.material?.dispose());
  }
  clear() {for(const e of [...this.active])this.release(e);this.updateBleeding([],0,null,false);}
  dispose() {
    this.clear();for(const cache of this.pool.values())for(const root of cache)root.traverse(o=>o.material?.dispose());
    for(const geometry of Object.values(this.geometries))geometry.dispose();this.pool.clear();
  }
}
