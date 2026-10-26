"""Render the in-game model as a transparent, softly lit selection portrait."""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/models/yellow-blob-static-v03.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
lo = Vector([min(p[i] for p in points) for i in range(3)])
hi = Vector([max(p[i] for p in points) for i in range(3)])
center = (lo + hi) / 2
height = hi.z - lo.z
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.world = bpy.data.worlds.new('Portrait studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.8,.8,.8,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
scene.view_settings.view_transform = 'Standard'
for offset, power, size in [((-2,-3,4),160,3),((3,-1,2),70,3),((0,2,3),100,2)]:
    data = bpy.data.lights.new('Softbox', 'AREA')
    data.energy = power * height**2
    data.shape = 'DISK'; data.size = size * height
    lamp = bpy.data.objects.new('Softbox', data); scene.collection.objects.link(lamp)
    lamp.location = center + Vector(offset) * height
    lamp.rotation_euler = (center-lamp.location).to_track_quat('-Z','Y').to_euler()
data = bpy.data.cameras.new('Portrait camera'); data.type = 'ORTHO'; data.ortho_scale = height * 1.08
cam = bpy.data.objects.new('Portrait camera', data); scene.collection.objects.link(cam)
cam.location = center + Vector((.16,-3,.16)) * height
cam.rotation_euler = (center-cam.location).to_track_quat('-Z','Y').to_euler()
scene.camera = cam
scene.render.filepath = str(ROOT / 'public/portraits/yellow-blob.png')
bpy.ops.render.render(write_still=True)
