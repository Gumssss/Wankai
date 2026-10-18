"""Exercise Blender Python, skinning, GLB export and CPU rendering."""
from pathlib import Path
import json
import math
import platform
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/blender/environment-check"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 60
scene.frame_start, scene.frame_end = 1, 61

armature = bpy.data.armatures.new("Setup Test Skeleton")
rig = bpy.data.objects.new("ARM_Setup_Test", armature)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
root = armature.edit_bones.new("root")
root.head, root.tail = (0, 0, 0), (0, 0, 0.25)
ear = armature.edit_bones.new("test_ear")
ear.head, ear.tail = (0, 0, 0.25), (0, 0, 1.25)
ear.parent = root
ear.use_connect = True
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.75))
paddle = bpy.context.object
paddle.name = "Setup Test Paddle"
paddle.dimensions = (0.3, 0.12, 1.0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
assert not paddle.data.validate(), "Primitive topology needed repair"
paddle.parent = rig
group = paddle.vertex_groups.new(name="test_ear")
group.add([v.index for v in paddle.data.vertices], 1.0, "REPLACE")
modifier = paddle.modifiers.new("Setup Test Skin", "ARMATURE")
modifier.object = rig
material = bpy.data.materials.new("Setup Test Tan")
material.use_nodes = True
material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.60, 0.32, 0.12, 1)
material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
paddle.data.materials.append(material)

bone = rig.pose.bones["test_ear"]
bone.rotation_mode = "XYZ"
for frame, angle in ((1, 0), (31, math.pi / 4), (61, 0)):
    bone.rotation_euler.x = angle
    bone.keyframe_insert(data_path="rotation_euler", frame=frame)
rig.animation_data.action.name = "Setup_Ear_Bend"
scene.frame_set(1)
bpy.ops.object.select_all(action="DESELECT")
rig.select_set(True)
paddle.select_set(True)
bpy.context.view_layer.objects.active = rig
assert max(len(v.groups) for v in paddle.data.vertices) <= 4
bpy.ops.export_scene.gltf(
    filepath=str(OUT / "setup-skin-test.glb"),
    export_format="GLB", use_selection=True, export_yup=True,
    export_skins=True, export_animations=True, export_frame_range=True,
    export_influence_nb=4,
)

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.render.resolution_x, scene.render.resolution_y = 640, 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "setup-render.png")
scene.world = bpy.data.worlds.new("Setup Test World")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.18, 0.18, 1)
bpy.ops.mesh.primitive_plane_add(size=5, location=(0, 0, -0.01))
bpy.ops.object.light_add(type="AREA", location=(3, -4, 5))
light = bpy.context.object
light.data.energy, light.data.size = 600, 4
light.rotation_euler = (Vector((0, 0, 0.6)) - light.location).to_track_quat("-Z", "Y").to_euler()
bpy.ops.object.camera_add(location=(3.2, -4, 2.5))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0.6)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 55
scene.camera = camera
scene.frame_set(31)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "setup-skin-test.blend"))
bpy.ops.render.render(write_still=True)
assert (OUT / "setup-render.png").stat().st_size > 1000
report = {
    "blender_version": bpy.app.version_string,
    "python_version": platform.python_version(),
    "architecture": platform.machine(),
    "bones": list(armature.bones.keys()),
    "maximum_vertex_influences": max(len(v.groups) for v in paddle.data.vertices),
    "glb_export": "passed",
    "cpu_render": "passed",
    "note": "Synthetic environment check; not the beagle model or game physics",
}
(OUT / "blender-report.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
