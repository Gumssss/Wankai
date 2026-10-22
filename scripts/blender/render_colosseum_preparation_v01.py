"""Matched before/after review renders. Does not change either saved asset."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/concepts/colosseum/prepared-v01'
p=json.loads((OUT/'collision-placement-profile.json').read_text())['raw_fit'];cx,cy=p['center_xy'];fz=p['floor_z'];scale=p['uniform_scale']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/tripo/colosseum-v01/colosseum-tripo-v01-source.glb'))
before=[o for o in bpy.context.scene.objects if o.type=='MESH']
for ob in before:
 for v in ob.data.vertices:v.co=Vector(((v.co.x-cx)*scale,(v.co.y-cy)*scale,(v.co.z-fz)*scale))
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/colosseum-prepared-v01.glb'))
after=[o for o in bpy.context.scene.objects if o.type=='MESH' and o not in before]
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.world=bpy.data.worlds.new('Review_World')
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.6,.57,.5,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene.view_settings.view_transform='AgX'
for pos,power in [((-25,-35,55),80000),((35,15,40),45000)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=36;light.rotation_euler=(Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(18,-28,24));camera=bpy.context.object;scene.camera=camera;camera.rotation_euler=(Vector((0,0,2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=27
for name,visible,hidden in [('before',before,after),('after',after,before)]:
 for ob in visible:ob.hide_render=False
 for ob in hidden:ob.hide_render=True
 scene.render.filepath=str(OUT/f'preparation-{name}.png');bpy.ops.render.render(write_still=True);print('RENDERED',name,flush=True)
