"""Preserve and render the static Tripo candidate; do not rig or alter its mesh."""
from pathlib import Path
import bpy, json
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/source/tripo/beagle-v02/original.glb'
DEST = ROOT / 'assets/source/blender/beagle-tripo-appearance-v02.blend'
OUT = ROOT / 'output/blender/beagle-tripo-v02'
OUT.mkdir(parents=True, exist_ok=True)
if DEST.exists():
    raise FileExistsError('Preserving ' + str(DEST))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
imported = list(bpy.context.scene.objects)
meshes = [o for o in imported if o.type == 'MESH']
assert meshes, 'No imported geometry'
original = bpy.data.collections.new('01_Tripo_Imports')
bpy.context.scene.collection.children.link(original)
for obj in imported:
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    original.objects.link(obj)

corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi = Vector(tuple(max(v[i] for v in corners) for i in range(3)))
report = {
    'source': str(SOURCE.relative_to(ROOT)),
    'geometry_modified': False,
    'mesh_count': len(meshes),
    'triangles': sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes),
    'vertices': sum(len(o.data.vertices) for o in meshes),
    'uv_layers': {o.name: len(o.data.uv_layers) for o in meshes},
    'armatures': sum(o.type == 'ARMATURE' for o in imported),
    'source_bounds': {'min': list(lo), 'max': list(hi)},
    'textures': [{'name': i.name, 'dimensions': list(i.size)} for i in bpy.data.images if i.type == 'IMAGE'],
    'status': 'Static appearance source. Needs reduction, ear separation/rebuild, and custom rig before gameplay.',
}
(OUT / 'blender-inspection.json').write_text(json.dumps(report, indent=2) + '\n')

# A display parent changes only presentation scale. The original GLB is untouched.
display = bpy.data.objects.new('Appearance_Review_Scale_Only', None)
bpy.context.scene.collection.objects.link(display)
for obj in imported:
    if obj.parent is None:
        obj.parent = display
height = hi.z - lo.z
scale = 1.70 / height
display.scale = (scale,) * 3
display.location = (-(lo.x + hi.x) * .5 * scale, -(lo.y + hi.y) * .5 * scale, -lo.z * scale)
bpy.context.view_layer.update()

s = bpy.context.scene
s.render.engine = 'BLENDER_EEVEE'
s.render.resolution_x, s.render.resolution_y = 1400, 1100
s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'
s.view_settings.view_transform = 'AgX'
s.world = bpy.data.worlds.new('Neutral Studio')
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.72, .74, .78, 1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
for name, loc, power, size in [
    ('Soft Key', (3, -4, 5), 360, 4),
    ('Soft Fill', (-3, -2, 3), 160, 4),
    ('Rim', (1, 3, 4), 280, 3),
]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.name = name
    light.data.energy, light.data.shape, light.data.size = power, 'DISK', size
    light.rotation_euler = (Vector((0, 0, .9)) - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.012))
floor = bpy.context.object
floor.name = 'Presentation Floor'
mat = bpy.data.materials.new('Neutral Floor')
mat.diffuse_color = (.72, .70, .65, 1)
mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = mat.diffuse_color
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
floor.data.materials.append(mat)
bpy.ops.object.camera_add(location=(.6, -5, 2))
camera = bpy.context.object
camera.name = 'Tripo Appearance Review'
camera.rotation_euler = (Vector((0, 0, .85)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type, camera.data.ortho_scale = 'ORTHO', 2.8
s.camera = camera
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(DEST), compress=True)
s.render.filepath = str(ROOT / 'assets/concepts/beagle/tripo-v02/blender-front-review.png')
bpy.ops.render.render(write_still=True)
print('TRIPO_INSPECTION', json.dumps(report))
