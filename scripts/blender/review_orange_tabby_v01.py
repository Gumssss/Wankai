"""Fast textured renders of the actual prepared Tripo mesh, not a blockout."""
from pathlib import Path
import bpy, math, sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'assets/concepts/orange-tabby/prepared-v01'
bpy.ops.wm.open_mainfile(filepath=str(DATA/'orange-tabby-prepared-v01.blend'))
s=bpy.context.scene;s.render.engine='BLENDER_WORKBENCH'
s.render.resolution_x=1280;s.render.resolution_y=800;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
s.display.shading.light='STUDIO';s.display.shading.studio_light='paint.sl'
s.display.shading.color_type='TEXTURE';s.display.shading.show_shadows=True
s.display.shading.show_cavity=True;s.display.shading.cavity_type='WORLD'
s.display.shading.curvature_ridge_factor=1.1;s.display.shading.curvature_valley_factor=.8
s.display.shading.show_specular_highlight=True
s.display.shading.background_type='WORLD'
s.world=bpy.data.worlds.new('Review world');s.world.color=(.8,.83,.82)
s.view_settings.view_transform='Standard';s.render.film_transparent=False
root=bpy.data.objects['CTRL_Root'];root.location.z=.35
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';cam.data.ortho_scale=5.7;s.camera=cam
center=Vector((.3,0,1.25))
for name,offset in [('front',(9,0,.0)),('side',(0,9,.0)),('back',(-9,0,.0)),('three-quarter',(9,-7,4))]:
 cam.location=center+Vector(offset);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
 s.render.filepath=str(DATA/f'prepared-{name}.png');bpy.ops.render.render(write_still=True)
print('ACTUAL_PREPARED_MESH_RENDERS_COMPLETE',flush=True)
