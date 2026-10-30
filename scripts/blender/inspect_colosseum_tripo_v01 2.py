"""Inspect and render the untouched downloaded Tripo candidate; no finishing edits."""
from pathlib import Path
import bpy, json, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/concepts/colosseum/tripo-v01'
SRC=ROOT/'assets/source/tripo/colosseum-v01/colosseum-tripo-v01-source.glb'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SRC))
models=[o for o in bpy.context.scene.objects if o.type=='MESH']
coords=[o.matrix_world@Vector(c) for o in models for c in o.bound_box]
lo=Vector([min(v[i] for v in coords) for i in range(3)])
hi=Vector([max(v[i] for v in coords) for i in range(3)])
center=(hi+lo)*.5; dims=hi-lo; width=max(dims.x,dims.y)
stats=[]
for ob in models:
    me=ob.data; me.calc_loop_triangles()
    stats.append({'name':ob.name,'vertices':len(me.vertices),'triangles':len(me.loop_triangles),'materials':len(me.materials),'world_matrix':[list(row) for row in ob.matrix_world]})

# Sample the central floor without changing vertices/topology. Findings are geometric only.
world_vertices=[]; world_triangles=[]
for ob in models:
    start=len(world_vertices); me=ob.data
    world_vertices.extend([ob.matrix_world@v.co for v in me.vertices])
    world_triangles.extend([tuple(start+i for i in t.vertices) for t in me.loop_triangles])
bvh=BVHTree.FromPolygons(world_vertices,world_triangles,all_triangles=True)
floor=[]
for ix in range(-2,3):
 for iy in range(-2,3):
    x=center.x+ix*dims.x*.07; y=center.y+iy*dims.y*.07
    hit,normal,_,distance=bvh.ray_cast(Vector((x,y,hi.z+width)),Vector((0,0,-1)),width*3)
    floor.append({'xy':[x,y],'z':hit.z if hit else None,'normal_z':normal.z if normal else None})
report={'source':str(SRC.relative_to(ROOT)),'source_unchanged':True,'purpose':'candidate inspection only; no cleanup, decimation, material edits or integration','blender_version':bpy.app.version_string,'bounds_min':list(lo),'bounds_max':list(hi),'dimensions_blender_z_up':list(dims),'horizontal_extent_ratio':max(dims.x,dims.y)/min(dims.x,dims.y),'meshes':stats,'materials':len({ma for ob in models for ma in ob.data.materials}),'images':[{'name':im.name,'size':list(im.size),'packed':bool(im.packed_file)} for im in bpy.data.images if im.source=='FILE'],'armatures':sum(o.type=='ARMATURE' for o in bpy.context.scene.objects),'actions':len(bpy.data.actions),'central_floor_rays':floor,'limitations':'central rays do not establish collider fit, whole-floor flatness, manifoldness, arch passability or performance; candidate remains unselected'}
(OUT/'blender-inspection.json').write_text(json.dumps(report,indent=2)+'\n')
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True; scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.58,.56,.51,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene.view_settings.view_transform='AgX'
for name,offset,power in [('soft key',(-1.3,-1.8,2.8),200),('fill',(1.8,.7,2.0),110)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*width)
 light=bpy.context.object;light.name=name;light.data.energy=power*width**2;light.data.shape='DISK';light.data.size=width*1.8
 light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(); cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=width*1.36
views={'hero':(1,-1.6,1.45),'reverse':(-1,1.6,1.30),'side':(-1.8,-.4,.7),'overhead':(.01,0,3)}
target=Vector((center.x,center.y,lo.z+dims.z*.42))
for name,offset in views.items():
 cam.location=center+Vector(offset)*width;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(OUT/f'actual-model-{name}.png');bpy.ops.render.render(write_still=True);print('RENDERED',name,flush=True)
cam.location=center+Vector(views['hero'])*width;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'colosseum-tripo-v01-inspection.blend'))
print('INSPECTION_COMPLETE',flush=True)
