// Fit a small compound capsule profile to the actual v05 ear surfaces.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const source=JSON.parse(await readFile(new URL('assets/concepts/beagle/tripo-v05/rig-report.json',root)));
const round=x=>Math.round(x*1e6)/1e6;
const distance=(p,a,b)=>{
 const ab=b.map((x,i)=>x-a[i]),ap=p.map((x,i)=>x-a[i]);
 const t=Math.max(0,Math.min(1,ap.reduce((n,x,i)=>n+x*ab[i],0)/ab.reduce((n,x)=>n+x*x,0)));
 return Math.hypot(...p.map((x,i)=>x-a[i]-t*ab[i]));
};
const colliders=[],anchors={},coverage={};
for(const side of ['L','R']){
 const src=source.ear_specs[side],p=src.pivot;
 const anchor=[p[0],p[2]-.59,-p[1]].map(round);anchors[side]=anchor;
 const points=src.local_vertices.map(([x,y,z])=>[x,z,-y]);
 for(const [low,high] of [[-.13,1.15],[.95,2.7],[2.5,3.6]]){
  const section=points.filter(p=>p[1]>=low&&p[1]<=high);
  const bounds=[0,2].map(i=>[Math.min(...section.map(p=>p[i])),Math.max(...section.map(p=>p[i]))]);
  const center=bounds.map(([a,b])=>(a+b)/2),half=bounds.map(([a,b])=>(b-a)/2);
  const major=half[0]>=half[1]?0:1,minor=1-major;
  const radius=Math.max(.08,half[minor]+.012),spread=Math.max(0,half[major]-radius*.83);
  for(const lane of [-1,0,1]){
   const cross=[...center];cross[major]+=lane*spread;
   const a=[cross[0],low+radius,cross[1]],b=[cross[0],high-radius,cross[1]];
   colliders.push({a:a.map(round),b:b.map(round),radius:round(radius),anchor,ear:side});
  }
 }
 const own=colliders.filter(c=>c.ear===side);
 const errors=points.map(p=>Math.max(0,Math.min(...own.map(c=>distance(p,c.a,c.b)-c.radius))));
 coverage[side]={vertices:points.length,maximum_uncovered_distance:Math.max(...errors),
  rms_uncovered_distance:Math.sqrt(errors.reduce((n,x)=>n+x*x,0)/errors.length)};
 if(coverage[side].maximum_uncovered_distance>.08)throw Error('Poor ear fit '+JSON.stringify(coverage[side]));
}
const profile={model:'beagle-smooth-ear-duelist-v05.glb',appearanceModel:'beagle-smooth-appearance-v05.glb',
 bodyFloor:.59,bodyHeight:1.7,earBindPitch:source.ear_bind_pitch,anchors,
 length:3.6,offset:0,radius:.25,inertia:4.1,yawAnchorInertia:.7,
 motorAcceleration:24,brakeAcceleration:30,maxAngularSpeed:4.25,
 attachment:'ears',initialTheta:source.ear_bind_pitch,bodyRadius:.58,colliders};
await writeFile(new URL('src/beagle-profile.js',root),
 '// Measured from the approved smooth v05 model. Regenerate with scripts/blender/fit-beagle-contacts.mjs.\n'+
 'export const BEAGLE = Object.freeze('+JSON.stringify(profile,null,2)+');\n');
await mkdir(new URL('output/beagle-integration/',root),{recursive:true});
await writeFile(new URL('output/beagle-integration/contact-fit.json',root),JSON.stringify({coverage,colliders:colliders.length,source:'assets/concepts/beagle/tripo-v05/rig-report.json'},null,2)+'\n');
console.log(JSON.stringify({coverage,colliders:colliders.length},null,2));
