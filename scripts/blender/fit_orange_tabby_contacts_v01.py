"""Fit conservative contact spheres inside the actual prepared paw volumes."""
from pathlib import Path
import bpy,json,math,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2];DATA=ROOT/'assets/concepts/orange-tabby/prepared-v01'
bpy.ops.wm.open_mainfile(filepath=str(DATA/'orange-tabby-prepared-v01.blend'))
bpy.context.view_layer.update()
result={'method':'Greedy interior sphere fit to the actual optimized mesh. Radius is 98% of nearest surface distance. Cosmetic surface gaps are measured, not an added invisible hit margin.',
 'frame':'Game contact coordinates: [0.8 - Blender world Z, Blender world X, -Blender world Y]. Theta pi/2 is the exported rest pose.',
 'parts':[],'colliders':[]}
for name in ['SM_Paw_L','SM_Paw_R']:
 ob=bpy.data.objects[name];pts=[ob.matrix_world@v.co for v in ob.data.vertices]
 tree=BVHTree.FromPolygons(pts,[p.vertices for p in ob.data.polygons],all_triangles=True)
 v=np.array([list(p) for p in pts]);lo=v.min(axis=0);hi=v.max(axis=0);candidates=[]
 for y in np.arange(lo[1]+.10,hi[1]-.06,.14):
  for z in np.arange(lo[2]+.10,hi[2]-.06,.14):
   start=Vector((lo[0]-1,float(y),float(z)));direction=Vector((1,0,0))
   hit=tree.ray_cast(start,direction)
   if hit[0] is None:continue
   second=tree.ray_cast(hit[0]+direction*.0001,direction)
   if second[0] is None:continue
   center=(hit[0]+second[0])*.5
   radius=tree.find_nearest(center)[3]*.98
   if radius>.09:candidates.append([*center,radius])
 c=np.array(candidates)
 gaps=np.linalg.norm(v[:,None,:]-c[None,:,:3],axis=2)-c[None,:,3]
 remaining=np.full(len(v),10.0);selected=[]
 for _ in range(24):
  gains=np.maximum(remaining[:,None]-gaps,0).sum(axis=0)
  ix=int(gains.argmax());selected.append(ix);remaining=np.minimum(remaining,gaps[:,ix])
  if np.quantile(remaining,.99)<.10:break
 spheres=[]
 for ix in selected:
  x,y,z,r=c[ix];local=[round(.8-z,6),round(x,6),round(-y,6)]
  shape={'a':local,'b':local,'radius':round(r,6)};result['colliders'].append(shape);spheres.append(shape)
 result['parts'].append({'name':name,'spheres':len(selected),'surface_gap_max':float(remaining.max()),
  'surface_gap_p99':float(np.quantile(remaining,.99)),'surface_gap_mean':float(remaining.mean()),'contacts':spheres})
result['hurt_shapes']=[{'a':[-.12,-.29,0],'b':[-.12,-.05,0],'radius':.30},
 {'a':[.02,.36,-.05],'b':[.02,.46,.05],'radius':.48}]
result['hurt_shape_note']='Two seated torso/head capsules fitted conservatively to the measured 1.45-unit body. Ear tips and tail are cosmetic. Body bottom has 0.35-unit ordinary hover clearance.'
(DATA/'contact-fit.json').write_text(json.dumps(result,indent=2)+'\n')
print('PAW_CONTACT_FIT',json.dumps(result['parts'],default=str),flush=True)
