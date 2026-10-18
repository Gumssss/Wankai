"""Author a motion concept with primitive meshes and two mechanical ear hinges.

This is an animation proposal with prescribed contact, not the game solver.
Run with Blender, then render its saved .blend and encode the PNG sequence.
"""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/blender/beagle-motion-study"
SOURCE = ROOT / "assets/source/blender/beagle-ear-motion-study-v01.blend"
FPS, DURATION = 24, 27
EAR_LENGTH, EAR_HEIGHT = 1.65, 1.43
TAU = math.tau
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "frames").mkdir(exist_ok=True)
if SOURCE.exists() and "--replace-generated" not in sys.argv:
    raise FileExistsError(f"Preserving existing motion source: {SOURCE}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.render.resolution_percentage = 100
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FPS * DURATION
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "frames/")
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "None"
scene.display.render_aa = "16"
shading = scene.display.shading
shading.light = "FLAT"
shading.color_type = "MATERIAL"
shading.show_shadows = True
shading.shadow_intensity = 0.35
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.curvature_ridge_factor = 1.2
shading.curvature_valley_factor = 0.8
shading.show_object_outline = True
shading.object_outline_color = (0.18, 0.14, 0.10)
shading.show_specular_highlight = False
shading.background_type = "WORLD"
scene.world = bpy.data.worlds.new("Motion Study World")
scene.world.color = (0.92, 0.90, 0.85)


def linear(value):
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def material(name, hex_color):
    mat = bpy.data.materials.new(name)
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    mat.diffuse_color = (*[linear(c) for c in rgb], 1)
    return mat


tan = material("Ear Tan", "CC9854")
cream = material("Warm White", "FFF7E8")
dark = material("Face Dark", "302922")
red = material("P1 Terracotta", "C4684F")
teal = material("Contact Teal", "568D92")
floor_mat = material("Arena Sand", "DED7C4")
line_mat = material("Floor Marks", "B7AF9B")
hud_mat = material("Caption Ink", "403A31")


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj


def sphere(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=1)
    obj = bpy.context.object
    obj.name, obj.parent, obj.location, obj.scale = name, parent, location, scale
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def rounded_box(name, location, dimensions, mat, parent=None, bevel=0.1):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name, obj.location, obj.dimensions = name, location, dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft Corners", "BEVEL")
    modifier.width, modifier.segments = bevel, 5
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


root = empty("CTRL_Beagle_Root")
body = rounded_box("Tiny White Body", (0, 0, 0.42), (0.48, 0.59, 0.79), cream, root, 0.19)
head = rounded_box("Broad Tan Head", (0, 0, 1.22), (0.75, 1.0, 0.95), tan, root, 0.20)
sphere("White Muzzle", (0.36, 0, 1.03), (0.18, 0.32, 0.19), cream, root)
rounded_box("White Forehead Blaze", (0.383, 0, 1.40), (0.025, 0.15, 0.43), cream, root, 0.012)
sphere("Nose", (0.532, 0, 1.06), (0.035, 0.064, 0.045), dark, root)
for side in (-1, 1):
    sphere(f"Eye White {side}", (0.382, side * 0.20, 1.30), (0.035, 0.112, 0.135), cream, root)
    sphere(f"Pupil {side}", (0.410, side * 0.20, 1.30), (0.026, 0.075, 0.096), dark, root)
    rounded_box(f"Unimpressed Lid {side}", (0.430, side * 0.20, 1.40), (0.035, 0.225, 0.145), tan, root, 0.015)
    sphere(f"Tucked Paw {side}", (0.15, side * 0.31, 0.58), (0.10, 0.07, 0.15), cream, root)
    sphere(f"Ear Root Fold {side}", (0, side * 0.53, EAR_HEIGHT), (0.10, 0.17, 0.13), tan, root)
rounded_box("Player Collar", (0, 0, 0.80), (0.49, 0.62, 0.12), red, root, 0.04)
rounded_box("Rear Player Patch", (-0.25, 0, 0.61), (0.025, 0.40, 0.32), red, root, 0.012)
sphere("Small Tail", (-0.30, 0, 0.35), (0.22, 0.07, 0.08), tan, root)


def ear_mesh():
    rings = [(0, 0.055, 0.065), (0.14, 0.055, 0.11), (0.38, 0.055, 0.15),
             (EAR_LENGTH - 0.17, 0.055, 0.15), (EAR_LENGTH - 0.07, 0.045, 0.115)]
    count = 20
    vertices = [(rx * math.cos(j * TAU / count), ry * math.sin(j * TAU / count), height)
                for height, rx, ry in rings for j in range(count)]
    faces = []
    for ring in range(len(rings) - 1):
        for j in range(count):
            a, b = ring * count + j, ring * count + (j + 1) % count
            faces.append((a, b, b + count, a + count))
    vertices.extend([(0, 0, 0), (0, 0, EAR_LENGTH)])
    bottom, tip = len(vertices) - 2, len(vertices) - 1
    for j in range(count):
        faces.append((bottom, (j + 1) % count, j))
        start = (len(rings) - 1) * count
        faces.append((start + j, start + (j + 1) % count, tip))
    mesh = bpy.data.meshes.new("Constant Length Ear Paddle")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    assert not mesh.validate(), "Ear paddle topology needed repair"
    for face in mesh.polygons:
        face.use_smooth = True
    return mesh


paddle_mesh = ear_mesh()
hinges, contacts = [], []
for side, name in ((-1, "L"), (1, "R")):
    hinge = empty(f"CTRL_{name}_Ear_Hinge", root, (0, side * 0.66, EAR_HEIGHT))
    paddle = bpy.data.objects.new(f"{name} Ear Paddle", paddle_mesh.copy())
    scene.collection.objects.link(paddle)
    paddle.parent = hinge
    paddle.data.materials.append(tan)
    hinges.append(hinge)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.11, minor_radius=0.018, major_segments=32, minor_segments=8)
    ring = bpy.context.object
    ring.name = f"{name} Ground Contact Cue"
    ring.data.materials.append(teal)
    contacts.append(ring)

bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.012))
bpy.context.object.name = "Arena Floor"
bpy.context.object.data.materials.append(floor_mat)
for x in range(-5, 6):
    rounded_box(f"Distance Mark {x}", (x, 0, -0.002), (0.012, 5.5, 0.004), line_mat, bevel=0.001)
for y in (-1.4, 1.4):
    rounded_box(f"Lane Mark {y}", (0, y, -0.002), (11, 0.012, 0.004), line_mat, bevel=0.001)

bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = "Motion Review Camera"
camera.data.type = "ORTHO"
camera.data.clip_start, camera.data.clip_end = 0.01, 200
scene.camera = camera
hud = empty("Camera Captions", camera, (0, 0, -0.5))
font = bpy.data.fonts.load("/System/Library/Fonts/Supplemental/Arial.ttf")


def label(name, text, position, size):
    data = bpy.data.curves.new(name, "FONT")
    data.body, data.size, data.font = text, size, font
    data.align_x = "LEFT"
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent, obj.location = hud, position
    obj.data.materials.append(hud_mat)
    return obj


label("Title", "BEAGLE / EAR MOTION STUDY", (-0.46, 0.235, 0), 0.024)
label("Concept Notice", "Authored motion concept - not a physics simulation", (-0.46, -0.252, 0), 0.015)
chapters = [
    (0, 2.5, "REST / the ears support a small upright body"),
    (2.5, 8, "W / continuous forward swing"),
    (8, 13.5, "S / continuous backward swing"),
    (13.5, 19.5, "SLOW VIEW / plant, lift, carry, release"),
    (19.5, 24, "REAR VIEW / the same ear-driven movement"),
    (24, 27, "A / D / steer the heading; camera stays independent"),
]
for index, (start, end, caption) in enumerate(chapters):
    obj = label(f"Chapter {index + 1}", caption, (-0.46, 0.199, 0), 0.018)
    for frame, hidden in ((1, start > 0), (int(start * FPS) + 1, False), (int(end * FPS) + 1, True)):
        obj.hide_render = hidden
        obj.keyframe_insert(data_path="hide_render", frame=frame)

# Prescribed no-slip tip travel during the downward portion of a revolution.
# This draws the proposed action; it does not claim a successful dynamic solve.
entry = math.acos(-EAR_HEIGHT / EAR_LENGTH)
exit_angle = TAU - entry
stride = 2 * EAR_LENGTH * math.sin(entry)


def travel(theta):
    if theta < 0:
        return -travel(-theta)
    cycles = math.floor(theta / TAU)
    phase = theta - cycles * TAU
    fraction = (0 if phase < entry else stride if phase > exit_angle else
                EAR_LENGTH * (math.sin(entry) - math.sin(phase)))
    return cycles * stride + fraction


ear_vertices = [v.co.copy() for v in paddle_mesh.vertices]
frames_meta = []
for frame in range(1, scene.frame_end + 1):
    t = (frame - 1) / FPS
    yaw = 0
    if t < 2.5:
        theta, x = math.pi, 0
        view, target, scale = (7, -9, 4.3), (0, 0, 1.0), 5.8
    elif t < 8:
        theta = (t - 2.5) / 5.5 * TAU * 2
        x = -stride + travel(theta)
        view, target, scale = (3.2, -12, 4.1), (0, 0, 1.35), 8.6
    elif t < 13.5:
        theta = -(t - 8) / 5.5 * TAU * 2
        x = stride + travel(theta)
        view, target, scale = (3.2, -12, 4.1), (0, 0, 1.35), 8.6
    elif t < 19.5:
        theta = 2.20 + (t - 13.5) / 6 * 1.90
        x = -stride / 2 + travel(theta)
        view, target, scale = (2.0, -12, 3.0), (0, 0, 1.1), 5.8
    elif t < 24:
        theta = (t - 19.5) / 4.5 * TAU * 1.5
        x = -stride / 2 + travel(theta)
        view, target, scale = (-10, -3.5, 4.4), (0, 0, 1.3), 8.4
    else:
        theta, x = math.pi / 2, 0
        yaw = math.radians(45) * math.sin((t - 24) / 3 * TAU)
        view, target, scale = (7, -9, 4.3), (0, 0, 1.0), 6.3

    ct, st = math.cos(theta), math.sin(theta)
    rotated = [(v.x * ct + v.z * st, v.y, -v.x * st + v.z * ct) for v in ear_vertices]
    contact_index = min(range(len(rotated)), key=lambda i: rotated[i][2])
    local_contact = rotated[contact_index]
    lift = max(0, -EAR_HEIGHT - local_contact[2])
    root.location = (x, 0, lift)
    root.rotation_euler = (0, 0, yaw)
    root.keyframe_insert(data_path="location", frame=frame)
    root.keyframe_insert(data_path="rotation_euler", frame=frame)
    for hinge in hinges:
        hinge.rotation_euler.y = theta
        hinge.keyframe_insert(data_path="rotation_euler", frame=frame)
    planted = lift > 0.002
    for side, marker in zip((-1, 1), contacts):
        local_x, local_y = local_contact[0], local_contact[1] + side * 0.66
        marker.location = (x + local_x * math.cos(yaw) - local_y * math.sin(yaw),
                           local_x * math.sin(yaw) + local_y * math.cos(yaw), 0.01)
        marker.scale = (1, 1, 1) if planted else (0, 0, 0)
        marker.keyframe_insert(data_path="location", frame=frame)
        marker.keyframe_insert(data_path="scale", frame=frame)
    camera.location = view
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    camera.keyframe_insert(data_path="location", frame=frame)
    camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    camera.data.keyframe_insert(data_path="ortho_scale", frame=frame)
    hud.scale = (scale,) * 3
    hud.keyframe_insert(data_path="scale", frame=frame)
    frames_meta.append({"frame": frame, "time": round(t, 4), "theta": round(theta, 5),
                        "body_x": round(x, 5), "body_lift": round(lift, 5), "planted": planted})

for obj in bpy.data.objects:
    if obj.type == "MESH":
        assert not obj.data.validate(), f"Invalid preview geometry: {obj.name}"
scene.frame_set(1)
scene["purpose"] = "Authored animation concept, not simulated physics or a finished asset"
scene["controls"] = "W/S coupled ear phase; A/D heading; body root remains upright"
scene["ear_length"] = EAR_LENGTH
SOURCE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
(OUT / "motion-record.json").write_text(json.dumps({
    "fps": FPS, "duration": DURATION, "frames": scene.frame_end,
    "source": str(SOURCE), "purpose": scene["purpose"],
    "chapters": [{"start": a, "end": b, "caption": c} for a, b, c in chapters],
    "motion": frames_meta,
}, indent=2) + "\n")
print(f"MOTION_SOURCE_READY {SOURCE}")
