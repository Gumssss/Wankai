"""Create a reusable asset stage; run through scripts/blender.sh."""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / "assets/source/blender/wankai-asset-stage.blend"
if DESTINATION.exists():
    raise FileExistsError(f"Refusing to overwrite the existing stage: {DESTINATION}")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 1.0
scene.render.fps = 60
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Wankai Studio World")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.17, 0.17, 0.17, 1)

collections = {}
for name in ("00_Reference", "01_Tripo_Imports", "02_Working_Assets", "03_Collision_Proxies", "90_Presentation"):
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    collections[name] = collection

reference = ROOT / "docs/reference/beagle-reference-sheet.png"
if reference.exists():
    image = bpy.data.images.load(str(reference))
    image.pack()
    empty = bpy.data.objects.new("Beagle Appearance Reference", None)
    empty.empty_display_type = "IMAGE"
    empty.data = image
    empty.empty_display_size = 3.2
    empty.location = (0, 2.2, 1.8)
    empty.rotation_euler = (math.pi / 2, 0, 0)
    collections["00_Reference"].objects.link(empty)

guide = bpy.data.objects.new("Body Height Guide 1.70m", None)
guide.empty_display_type = "CUBE"
guide.empty_display_size = 1
guide.location = (0, 0, 0.85)
guide.scale = (0.45, 0.35, 0.85)
collections["00_Reference"].objects.link(guide)

floor_mesh = bpy.data.meshes.new("Preview Floor Mesh")
floor_mesh.from_pydata([(-3, -3, -0.01), (3, -3, -0.01), (3, 3, -0.01), (-3, 3, -0.01)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("Preview Floor", floor_mesh)
collections["90_Presentation"].objects.link(floor)
floor_material = bpy.data.materials.new("Preview Floor Matte")
floor_material.diffuse_color = (0.35, 0.35, 0.35, 1)
floor.data.materials.append(floor_material)

camera_data = bpy.data.cameras.new("Preview Camera")
camera = bpy.data.objects.new("Preview Camera", camera_data)
collections["90_Presentation"].objects.link(camera)
camera.location = (4.5, -7, 3.8)
camera.rotation_euler = (Vector((0, 0, 1.1)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.lens = 45
scene.camera = camera
for name, location, power, size in (
    ("Key Softbox", (3, -4, 6), 900, 4),
    ("Fill Softbox", (-4, -1, 3), 500, 4),
    ("Rim Softbox", (0, 4, 5), 700, 3),
):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = power
    light_data.shape = "DISK"
    light_data.size = size
    light = bpy.data.objects.new(name, light_data)
    collections["90_Presentation"].objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()

notes = bpy.data.texts.new("START_HERE")
notes.write("""Wankai asset workspace

This stage contains references and presentation helpers, not a finished character.
Blender: Z up, +X forward. GLB export: export_yup=True; +X remains forward.
One Blender unit represents one game unit. The 1.70m guide is provisional.
Import downloaded Tripo GLBs into 01_Tripo_Imports and preserve the source file.
Author cleaned meshes and rigs in 02_Working_Assets.
Use 03_Collision_Proxies for deliberately simplified contact shapes.
Export only the intended asset selection, with skins enabled and at most four
bone influences. Do not apply the existing static-weapon optimizer to a rigged GLB.
See docs/BEAGLE_PROTOTYPE_PLAN.md and docs/BLENDER_SETUP.md.
""")

layer = bpy.context.view_layer.layer_collection.children.get("02_Working_Assets")
if layer:
    bpy.context.view_layer.active_layer_collection = layer
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_location = (0, 0, 1.2)
            area.spaces.active.region_3d.view_distance = 7
DESTINATION.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(DESTINATION))
print(f"Wankai asset workspace saved: {DESTINATION}")
