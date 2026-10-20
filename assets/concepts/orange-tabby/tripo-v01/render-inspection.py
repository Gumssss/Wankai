import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path("/Users/haojun/Desktop/Game developing/Wankai")
FOLDER = ROOT / "assets/concepts/orange-tabby/tripo-v01"
SOURCE = FOLDER / "orange-tabby-tripo-v01-source.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
minimum = Vector(tuple(min(p[k] for p in points) for k in range(3)))
maximum = Vector(tuple(max(p[k] for p in points) for k in range(3)))
center = (minimum + maximum) * 0.5
span = maximum - minimum
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 1536
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("Inspection world")
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.13, 0.14, 0.16, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7
scene.view_settings.view_transform = 'Standard'
def light(name, location, energy, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = center + Vector(location)
    obj.rotation_euler = (center - obj.location).to_track_quat('-Z', 'Y').to_euler()
light("Key", (2, -3, 4), 180, 3)
light("Fill", (-3, -1, 2), 100, 3)
light("Rear", (0, 3, 3), 140, 3)
cam_data = bpy.data.cameras.new("Inspection camera")
camera = bpy.data.objects.new("Inspection camera", cam_data)
scene.collection.objects.link(camera)
cam_data.type = 'ORTHO'
cam_data.ortho_scale = max(span.x, span.y, span.z) * 1.3
cam_data.lens = 50
scene.camera = camera
for name, direction in [('front', (0, -3, 0)), ('left', (3, 0, 0)), ('back', (0, 3, 0))]:
    camera.location = center + Vector(direction)
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(FOLDER / ("mesh-" + name + ".png"))
    bpy.ops.render.render(write_still=True)
camera.location = center + Vector((0, -3, 0))
camera.rotation_euler = (center-camera.location).to_track_quat('-Z', 'Y').to_euler()
for image in bpy.data.images:
    if image.source == 'FILE' and not image.packed_file:
        try:
            image.pack()
        except RuntimeError:
            pass
bpy.ops.wm.save_as_mainfile(filepath=str(FOLDER / "source-inspection.blend"))
report = {
    "source": str(SOURCE),
    "purpose": "Read-only imported-mesh appearance review; original GLB unchanged. No topology, material, rig, or runtime edits.",
    "blender_version": bpy.app.version_string,
    "mesh_objects": [{"name":o.name,"vertices":len(o.data.vertices),"polygons":len(o.data.polygons),"dimensions":list(o.dimensions),"matrix_world":[list(row) for row in o.matrix_world]} for o in meshes],
    "world_bounds_min": list(minimum),
    "world_bounds_max": list(maximum),
    "world_dimensions": list(span),
    "front_convention": "Imported glTF +Z front maps to Blender -Y; left camera +X; up +Z.",
    "renders": ["mesh-front.png", "mesh-left.png", "mesh-back.png"],
    "inspection_scene": "source-inspection.blend"
}
(FOLDER / "blender-inspection.json").write_text(json.dumps(report, indent=2) + "\n")
print("ORANGE_TABBY_TRIPO_INSPECTION_COMPLETE")
