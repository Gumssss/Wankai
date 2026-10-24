// Compare the unchanged camera-cutaway ray workload, not browser FPS.
import {loadGeometry} from './preview/model-geometry.mjs';
import {attachArenaModel} from '../src/arena-model.js';
import {Raycaster,Vector3} from 'three';
import {writeFile} from 'node:fs/promises';
const paths=['assets/source/colosseum-runtime-v01/colosseum-prepared-v01.glb','public/models/colosseum-prepared-v01.glb'];
const models=await Promise.all(paths.map(async path=>{const arena=attachArenaModel(await loadGeometry(path),3);arena.root.updateMatrixWorld(true);return arena.sectors.map(s=>s.mesh);}));
const ray=new Raycaster(),point=new Vector3(),direction=new Vector3(),origin=new Vector3();
const offsets=[[0,.1,0],[0,.9,0],[0,1.65,0],[-.55,1,0],[.55,1,0],[0,1,-.55],[0,1,.55]];
function batch(meshes){
  for(let i=0;i<24;i++){
    const angle=i*Math.PI/12;origin.set(Math.cos(angle)*27,5+(i%3)*2,Math.sin(angle)*27);
    for(const id of [0,1])for(const [dx,dy,dz]of offsets){
      point.set((id?1:-1)*2.2+dx,.59+dy,dz);direction.subVectors(point,origin);const distance=direction.length();
      ray.set(origin,direction.divideScalar(distance));ray.far=distance-.2;ray.intersectObjects(meshes,false);
    }
  }
}
const times=[[],[]];
for(let run=0;run<8;run++)for(const id of run%2?[1,0]:[0,1]){
  const start=performance.now();batch(models[id]);if(run>1)times[id].push((performance.now()-start)/24);
}
const median=a=>[...a].sort((x,y)=>x-y)[Math.floor(a.length/2)];
const report={kind:'Node Three.js raycast benchmark, existing 14-ray cutaway workload; not browser FPS',rounds:6,viewsPerRound:24,medianMsPerCutawayBefore:median(times[0]),medianMsPerCutawayAfter:median(times[1]),rawMsPerCutaway:times};
await writeFile('assets/concepts/colosseum/lite-v01/raycast-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
