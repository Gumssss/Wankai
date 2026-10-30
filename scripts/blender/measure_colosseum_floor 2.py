"""Measure raw Tripo arena without modifying it; writes reversible preparation input."""
from pathlib import Path
import bpy,bmesh,json,math,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/concepts/colosseum/prepared-v01';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/tripo/colosseum-v01/colosseum-tripo-v01-source.glb'))
ob=next(o for o in bpy.context.scene.objects if o.type=='MESH'); me=ob.data;me.calc_loop_triangles()
verts=[v.co.copy() for v in me.vertices];tri=[tuple(t.vertices) for t in me.loop_triangles]
bvh=BVHTree.FromPolygons(verts,tri,all_triangles=True)
floor=[]
for ix in range(-4,5):
 for iy in range(-4,5):
  h,n,_,_=bvh.ray_cast(Vector((ix*.035,iy*.035,1)),Vector((0,0,-1)),2)
  if h:floor.append(h.z)
fz=float(np.median(floor))
radial={}
for z in [fz+.004,fz+.008,fz+.015,fz+.025,fz+.04,fz+.065]:
 samples=[]
 for i in range(180):
  a=i*math.tau/180;d=Vector((math.cos(a),math.sin(a),0))
  h,n,face,_=bvh.ray_cast(Vector((0,0,z)),d,1)
  samples.append({'angle':a,'distance':float(h.xy.length) if h else None,'hit':list(h) if h else None})
 radial[str(round(z,7))]=samples
vertical=[]
for i in range(180):
 a=i*math.tau/180;profile=[]
 for j in range(110):
  r=.18+j*.002
  h,n,_,_=bvh.ray_cast(Vector((r*math.cos(a),r*math.sin(a),1)),Vector((0,0,-1)),2)
  if h:profile.append([r,h.z,n.z])
 vertical.append({'angle':a,'profile':profile})
bm=bmesh.new();bm.from_mesh(me)
unseen=set(bm.verts);comps=[]
while unseen:
 v=unseen.pop();c={v};stack=[v]
 while stack:
  q=stack.pop()
  for e in q.link_edges:
   other=e.other_vert(q)
   if other in unseen:unseen.remove(other);c.add(other);stack.append(other)
 comps.append({'vertices':len(c),'zmin':min(v.co.z for v in c),'zmax':max(v.co.z for v in c)})
stats={'raw_vertices':len(bm.verts),'raw_faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'components':sorted(comps,key=lambda c:-c['vertices'])}
bm.free()
data={'floor_median_z':fz,'central_floor_z_range':[min(floor),max(floor)],'radial_at_height':radial,'vertical_rays':vertical,'topology':stats}
(OUT/'raw-measurements.json').write_text(json.dumps(data,indent=2)+'\n')
print('FLOOR',fz,'RANGE',min(floor),max(floor),flush=True)
for z,ss in radial.items():
 rr=[s['distance'] for s in ss if s['distance'] is not None];print('RADIAL',z,'n',len(rr),'min/median/max',min(rr),float(np.median(rr)),max(rr),flush=True)
print('TOPOLOGY',stats,flush=True)
