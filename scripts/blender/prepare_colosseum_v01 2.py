"""Prepare the selected Tripo source, preserving its overall layout and texture.

Only inner-floor/podium alignment, tiny topology cleanup, named static sectors,
packed materials, explicit game scale and non-render collision guides.
"""
from pathlib import Path
import bpy,bmesh,json,math,hashlib,numpy as np
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/concepts/colosseum/prepared-v01';OUT.mkdir(parents=True,exist_ok=True)
BLEND=ROOT/'assets/source/blender/colosseum-prepared-v01.blend'
EXPORT=ROOT/'public/models/colosseum-prepared-v01.glb'
SRC=ROOT/'assets/source/tripo/colosseum-v01/colosseum-tripo-v01-source.glb'
measure=json.loads((OUT/'raw-measurements.json').read_text());fz=measure['floor_median_z']
# Fit the inner masonry face, excluding the open entrance tunnels.
samples=list(measure['radial_at_height'].values())[1]
p=np.array([s['hit'][:2] for s in samples if s['distance']<.353]);x,y=p.T
A,B,C,D,E=np.linalg.lstsq(np.c_[x*x,x*y,y*y,x,y],np.ones(len(x)),rcond=None)[0]
M=np.array([[A,B/2],[B/2,C]]); center=-.5*np.linalg.solve(M,[D,E]);k=1+center@M@center
values,basis=np.linalg.eigh(M);axes=np.sqrt(k/values)
# Keep source orientation and the entire outer footprint. Regularize only the
# small inner podium contact face to the game's existing circle. The measured
# source ellipse remains in the report; never stretch the arena shell.
unit_scale=6.45/math.sqrt(float(axes[0]*axes[1]))
angle=math.atan2(float(basis[1,0]),float(basis[0,0]))
contact_raw_radius=6.45/unit_scale
def elliptical_norm(v):
 q=np.array([v.x-center[0],v.y-center[1]])
 return math.sqrt(float(q@M@q/k))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SRC))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH'); source.name='Tripo_Selected_Source_Working_Copy'
mat=source.data.materials[0];mat.name='MAT_Colosseum_Warm_Stone_Atlas'
mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.88
for im in bpy.data.images:
 if im.source=='FILE' and not im.packed_file:im.pack()

bm=bmesh.new();bm.from_mesh(source.data)
raw_counts={'vertices':len(bm.verts),'faces':len(bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges)}
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
before_degenerate=len(bm.faces);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-8)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table()
# Isolated reconstruction fragments are removed only after coincident UV seam
# vertices have been welded. Keep every substantive connected component.
unseen=set(bm.verts);comps=[]
while unseen:
 seed=unseen.pop();comp={seed};queue=[seed]
 while queue:
  q=queue.pop()
  for e in q.link_edges:
   other=e.other_vert(q)
   if other in unseen:unseen.remove(other);comp.add(other);queue.append(other)
 comps.append(comp)
tiny=[v for c in comps if len(c)<4 for v in c]
if tiny:bmesh.ops.delete(bm,geom=tiny,context='VERTS')
bm.normal_update()
# Regularize only the inward podium face at floor level, leaving the stands,
# arches, banners and entire external silhouette in their source positions.
podium_verts=set()
for f in bm.faces:
 c=f.calc_center_median();n=Vector((c.x-center[0],c.y-center[1],0));n.normalize()
 if fz-.003<c.z<fz+.035 and .93<elliptical_norm(c)<1.065 and f.normal.dot(n)<-.35:
  podium_verts.update(f.verts)
podium_displacements=[]
for v in podium_verts:
 if v.co.z>fz+.044:continue
 rho=math.hypot(v.co.x-center[0],v.co.y-center[1])/contact_raw_radius
 old=v.co.copy();v.co.x=center[0]+(v.co.x-center[0])/rho;v.co.y=center[1]+(v.co.y-center[1])/rho
 podium_displacements.append((v.co-old).length*unit_scale)
bm.normal_update()
# Reuse original floor topology/UVs so the selected sand/stone texture survives.
floor_faces=[]
for f in bm.faces:
 c=f.calc_center_median()
 if f.normal.z>.30 and elliptical_norm(c)<1.075 and all(fz-.012<v.co.z<fz+.006 for v in f.verts):floor_faces.append(f)
floor_verts={v for f in floor_faces for v in f.verts}
floor_before=[v.co.z for v in floor_verts]
for v in floor_verts:v.co.z=fz
bm.normal_update();bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.faces.ensure_lookup_table();bm.verts.ensure_lookup_table()
# Reclassify after triangulation using flatness, not source face handles.
uv_layer=bm.loops.layers.uv.active
groups={'SM_Arena_Floor':[]}
for i in range(8):groups[f'SM_Arena_Shell_{i:02d}']=[]
for f in bm.faces:
 c=f.calc_center_median()
 isfloor=all(abs(v.co.z-fz)<1e-7 for v in f.verts) and f.normal.z>.9 and elliptical_norm(c)<1.09
 if isfloor:name='SM_Arena_Floor'
 else:
  a=math.atan2(c.y-center[1],c.x-center[0])%math.tau;name=f'SM_Arena_Shell_{int(a/math.tau*8)%8:02d}'
 groups[name].append(f)
collection=bpy.data.collections.new('02_Prepared_Render_Meshes');bpy.context.scene.collection.children.link(collection)
objects=[]
aprons={f'SM_Arena_Shell_{i:02d}':[] for i in range(8)}
def clip_half(polygon,nx,ny,limit,inside=True):
 result=[]
 for j,P in enumerate(polygon):
  Q=polygon[(j+1)%len(polygon)];dp=P[0]*nx+P[1]*ny-limit;dq=Q[0]*nx+Q[1]*ny-limit
  if not inside:dp=-dp;dq=-dq
  if dp<=1e-9:result.append(P)
  if (dp<0)!=(dq<0):
   t=dp/(dp-dq);result.append(tuple(P[k]+(Q[k]-P[k])*t for k in range(5)))
 return result
for name,faces in groups.items():
 vs=[];fs=[];uvs=[];normals=[]
 for f in faces:
  polygon=[]
  for loop in f.loops:
   v=loop.vert.co;uv=loop[uv_layer].uv
   polygon.append(((v.x-center[0])*unit_scale,(v.y-center[1])*unit_scale,(v.z-fz)*unit_scale,float(uv.x),float(uv.y)))
  if name=='SM_Arena_Floor' and any(math.hypot(p[0],p[1])>6.49 for p in polygon):
   # Clip the level surface to a clean circular outline. Interpolate UVs within
   # each original triangle, preserving the selected atlas rather than repainting.
   limit=6.49*math.cos(math.pi/192)
   for side in range(192):
    if not polygon:break
    a=(side+.5)*math.tau/192;nx,ny=math.cos(a),math.sin(a)
    outside=clip_half(polygon,nx,ny,limit,False)
    if len(outside)>=3:
     px=sum(p[0] for p in outside)/len(outside);py=sum(p[1] for p in outside)/len(outside)
     sector=int((math.atan2(py,px)%math.tau)/math.tau*8)%8
     aprons[f'SM_Arena_Shell_{sector:02d}'].append(outside)
    polygon=clip_half(polygon,nx,ny,limit)
  if len(polygon)<3:continue
  fs.append(tuple(range(len(vs),len(vs)+len(polygon))))
  for p in polygon:vs.append(p[:3]);uvs.append(p[3:5]);normals.append(tuple(f.normal))
 for polygon in aprons.get(name,[]):
  fs.append(tuple(range(len(vs),len(vs)+len(polygon))))
  for p in polygon:vs.append(p[:3]);uvs.append(p[3:5]);normals.append((0,0,1))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update()
 ob=bpy.data.objects.new(name,me);collection.objects.link(ob);me.materials.append(mat)
 uv=me.uv_layers.new(name='UVMap')
 for polygon in me.polygons:
  polygon.use_smooth=name!='SM_Arena_Floor'
  for li in polygon.loop_indices:uv.data[li].uv=uvs[me.loops[li].vertex_index]
 # Weld within each group to avoid duplicating every triangle vertex in GLB.
 b=bmesh.new();b.from_mesh(me);bmesh.ops.remove_doubles(b,verts=list(b.verts),dist=1e-6);bmesh.ops.recalc_face_normals(b,faces=list(b.faces));b.to_mesh(me);b.free();me.update()
 ob['role']='playable_floor' if name=='SM_Arena_Floor' else 'decorative_shell_sector'
 ob['collision']='explicit runtime analytic profile; render triangles are not colliders'
 if name!='SM_Arena_Floor':ob['sector_index']=int(name[-2:])
 objects.append(ob)
bpy.data.objects.remove(source,do_unlink=True);bm.free()

# Scene helpers are intentionally excluded from the rendered/exported asset.
helpers=bpy.data.collections.new('03_Collision_Helpers_NOT_EXPORTED');bpy.context.scene.collection.children.link(helpers)
def helper(name,vertices,edges):
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,edges,[]);me.update();ob=bpy.data.objects.new(name,me);helpers.objects.link(ob);ob.display_type='WIRE';ob.hide_render=True;ob.color=(.1,1,.5,1);return ob
a=b=6.45;rim_height=.84;helper_angle=0
def ringpoints(z):
 return [(a*math.cos(t),b*math.sin(t),z) for t in [i*math.tau/96 for i in range(96)]]
helper('COL_Floor_Plane_Y0_Runtime',ringpoints(0),[(i,(i+1)%96) for i in range(96)])
helper('COL_Inner_Boundary_Body',ringpoints(0)+ringpoints(rim_height),[(i,(i+1)%96) for i in range(96)]+[(i+96,(i+1)%96+96) for i in range(96)]+[(i,i+96) for i in range(0,96,8)])
helper('COL_Legacy_Weapon_Height_0p48',ringpoints(.48),[(i,(i+1)%96) for i in range(96)])
helpers['note']='Blender guides only. Physics must explicitly read the matching analytic profile.'

profile={'schema_version':1,'asset_id':'colosseum-prepared-v01','source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'units':'one prepared Blender unit = one game unit','authoring_up':'Z','runtime_up':'Y','runtime_origin':[0,0,0],'floor':{'kind':'plane','height':0,'mesh':'SM_Arena_Floor'},'inner_boundary':{'kind':'circle','equivalent_radius':6.45,'radius':6.45,'semi_axes':[a,b],'rotation_blender_radians':0,'rotation_runtime_xz_radians':0,'center':[0,0],'body':'existing circular body constraint, no access to stands; body radius offsets the circle','weapon_contact_height':rim_height,'legacy_weapon_contact_height':.48,'mode_scale':{'practice':1,'duel-fixed':1,'solo':3,'duel':3},'mode_scale_axes_runtime':[1,1,1],'note':'Inner podium face locally regularized to existing radius; outer shell not stretched. Uniform mode scaling preserves arches/columns; height scales with the building.'},'raw_fit':{'center_xy':list(map(float,center)),'semi_axes':list(map(float,axes)),'rotation':angle,'uniform_scale':unit_scale,'floor_z':fz,'outer_footprint':[1,.97015380859375],'shape_note':'nearly round stylized concept; not historical oval reconstruction'},'roles':{'floor':'flat support and weapon-ground plane','inner_podium':'active low boundary through .84 units; explicit solver mapping','shell_sectors':'decorative/inaccessible; view-dependent occlusion groups','upper_stands_arches':'decorative; no triangle collision'},'modifications':{'floor_vertices_leveled':len(floor_verts),'floor_raw_z_range':[min(floor_before),max(floor_before)],'podium_vertices_regularized':len(podium_displacements),'podium_displacement_world_max':max(podium_displacements,default=0),'podium_displacement_world_p95':float(np.percentile(podium_displacements,95)) if podium_displacements else 0,'raw_topology':raw_counts,'welded_components':len(comps),'tiny_fragment_vertices_removed':len(tiny),'floor_material':'original atlas retained','roughness':.88},'integration_status':'explicit runtime mapping in src/arena-profile.js and src/physics.js; validate runtime separately'}
(OUT/'collision-placement-profile.json').write_text(json.dumps(profile,indent=2)+'\n')
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
scene['asset_profile']='assets/concepts/colosseum/prepared-v01/collision-placement-profile.json'
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=str(EXPORT),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_animations=False,export_image_format='AUTO')
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
metrics={'export':str(EXPORT.relative_to(ROOT)),'blend':str(BLEND.relative_to(ROOT)),'bytes':EXPORT.stat().st_size,'sha256':hashlib.sha256(EXPORT.read_bytes()).hexdigest(),'mesh_triangles':{},'floor_level_max_error':max(abs(v.co.z) for v in bpy.data.objects['SM_Arena_Floor'].data.vertices),'profile':profile}
for ob in objects:ob.data.calc_loop_triangles();metrics['mesh_triangles'][ob.name]=len(ob.data.loop_triangles)
(OUT/'preparation-report.json').write_text(json.dumps(metrics,indent=2)+'\n')
print('PREPARED',metrics['bytes'],'triangles',sum(metrics['mesh_triangles'].values()),'axes',a,b,'angle',-angle,'scale',unit_scale,'floor_error',metrics['floor_level_max_error'],flush=True)
