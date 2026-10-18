"""Revision 02: high body vaults and simultaneous swing/heading controls.

This is a reach study with driven angles and simplified support/flight, not the game solver.
Run with Blender, then render its saved .blend and encode the PNG sequence.
"""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output/blender/beagle-motion-study-v02"
SOURCE = ROOT / "assets/source/blender/beagle-ear-motion-study-v02.blend"
FPS, DURATION = 24, 32
EAR_LENGTH, EAR_HEIGHT = 3.60, 1.43
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
scene.render.filepath = str(OUT / "frames/#####")
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
line_mat = material("Floor Marks", "CEC7B7")
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
    rings = [(0, 0.055, 0.065), (0.14, 0.055, 0.11), (0.38, 0.055, 0.20),
             (EAR_LENGTH - 0.24, 0.055, 0.20), (EAR_LENGTH - 0.07, 0.045, 0.115)]
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
for x in range(-45, 46):
    rounded_box(f"Distance Mark {x}", (x, 0, -0.002), (0.012, 90, 0.004), line_mat, bevel=0.001)
for y in range(-45, 46):
    rounded_box(f"Lane Mark {y}", (0, y, -0.002), (90, 0.012, 0.004), line_mat, bevel=0.001)

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


label("Title", "BEAGLE / HIGH VAULT + COMBINED CONTROLS", (-0.46, 0.235, 0), 0.022)
label("Concept Notice", "Motion proposal / longer 3.60h ears / simplified contact, not game physics",
      (-0.46, -0.252, 0), 0.013)
panel_mat = material("Caption Panel", "EEEBDD")
for name, xy, dimensions in (
        ("Title Panel", (0, 0.222), (0.96, 0.087, 0.001)),
        ("Trace Panel", (-0.38, 0.065), (0.18, 0.19, 0.001)),
        ("Keys Panel", (0.38, 0.102), (0.19, 0.17, 0.001)),
        ("Legend Panel", (0, -0.232), (0.96, 0.078, 0.001))):
    rounded_box(name, (*xy, -0.007), dimensions, panel_mat, hud, 0.004)
chapters = [
    (0, 6, "W / plant, lift the whole body, carry, descend", "W", 1, 0, "side"),
    (6, 11, "W + A / forward swing while turning LEFT", "WA", 1, 1, "three-quarter"),
    (11, 16, "W + D / forward swing while turning RIGHT", "WD", 1, -1, "three-quarter"),
    (16, 21, "S + A / backward swing while turning LEFT", "SA", -1, 1, "three-quarter"),
    (21, 26, "S + D / backward swing while turning RIGHT", "SD", -1, -1, "three-quarter"),
    (26, 32, "REAR VIEW / W + D / swing and steer together", "WD", 1, -1, "rear"),
]


def visible_in(obj, start, end):
    for frame, hidden in ((1, start > 0), (round(start * FPS) + 1, False),
                          (round(end * FPS) + 1, True)):
        obj.hide_render = hidden
        obj.keyframe_insert(data_path="hide_render", frame=frame)


for index, (start, end, caption, keys, *_rest) in enumerate(chapters):
    visible_in(label(f"Chapter {index + 1}", caption, (-0.46, 0.197, 0), 0.017), start, end)

# The displayed key state uses the same input mapping as Wankai. Positive
# Blender yaw turns left because Blender +Y exports to game -Z (Y-up GLB).
for key, xy in {"W": (0.38, 0.135), "A": (0.335, 0.09),
                "S": (0.38, 0.09), "D": (0.425, 0.09)}.items():
    obj = rounded_box(f"Key {key} background", (*xy, 0), (0.036, 0.036, 0.001),
                      line_mat, hud, 0.004)
    label(f"Key {key} ink", key, (xy[0] - 0.009, xy[1] - 0.008, 0.002), 0.023)
    for index, (start, end, _caption, keys, *_rest) in enumerate(chapters):
        if key in keys:
            active = rounded_box(f"Key {key} active {index}", (*xy, 0.001),
                                 (0.036, 0.036, 0.001), teal, hud, 0.004)
            visible_in(active, start, end)
label("Key notice", "HELD TOGETHER", (0.296, 0.055, 0), 0.012)
label("Contact legend", "TEAL = planted ear    AMBER = sliding ear", (-0.46, -0.215, 0), 0.013)
label("Ruler legend", "Ruler: 1 tick = 1 skull height", (0.17, -0.215, 0), 0.013)
label("View legend", "Camera heading stays fixed within each shot", (-0.46, -0.235, 0), 0.013)

amber = material("Sliding Contact Amber", "D19B3E")
for side, marker in zip((-1, 1), contacts):
    marker.data.materials.clear()
    marker.data.materials.append(teal if side == -1 else amber)

# A small top-down trace makes combined input visible despite camera tracking.
# It displays body position and facing, not an extra locomotion controller.
label("Trace heading", "TOP VIEW / BODY PATH", (-0.455, 0.135, 0), 0.012)
trace_origin = Vector((-0.38, 0.047, 0.003))
trace_span = 0.135
trace_marker = sphere("Top View Body", tuple(trace_origin), (0.004,) * 3, red, hud)
trace_nose = rounded_box("Top View Facing", tuple(trace_origin), (0.014, 0.0025, 0.001),
                         dark, hud, 0.001)

# World-space vertical ruler follows horizontal travel but never body height.
# The zero line is the body's unlifted base; h is one skull height.
ruler = empty("Body Lift Ruler")
rounded_box("Ruler Stem", (-1.65, -0.90, 1.14), (0.018, 0.018, 2.30), teal, ruler, 0.002)
for height in (0, 1, 2):
    rounded_box(f"Height Tick {height}", (-1.65, -0.90, height),
                (0.23, 0.018, 0.018), teal, ruler, 0.002)

# This deliberately small preview model drives the ear angles and projects
# penetration out of the floor. Free motion retains velocity with gravity.
# It demonstrates contact -> rise -> release, without pretending to validate
# Wankai's coupled angular impulse solver, stamina, friction, or balance.
ear_vertices = [v.co.copy() for v in paddle_mesh.vertices]
DT, GRAVITY = 1 / 240, 19.0


def low_point(theta):
    ct, st = math.cos(theta), math.sin(theta)
    return min(((v.x * ct + v.z * st, v.y, -v.x * st + v.z * ct)
                for v in ear_vertices), key=lambda p: p[2])


def rotated_xy(point, yaw, side=-1):
    x, y = point[0], point[1] + side * 0.66
    return Vector((x * math.cos(yaw) - y * math.sin(yaw),
                   x * math.sin(yaw) + y * math.cos(yaw), 0))


def make_shot(start, end, swing_sign, yaw_sign, kind):
    frames = []
    p, velocity = Vector((0, 0, 0)), Vector((0, 0, 0))
    theta0 = 1.98 if swing_sign > 0 else -1.98
    omega = swing_sign * (0.39 if kind == "side" else 2.70)
    yaw_rate = yaw_sign * (0 if kind == "side" else 0.49)
    previous_q = rotated_xy(low_point(theta0), 0)
    previous_bound = max(0, -EAR_HEIGHT - low_point(theta0)[2])
    p.z = previous_bound
    previous_planted = previous_bound > 0
    total_steps = round((end - start) / DT)
    for step in range(total_steps):
        u = step * DT
        theta, yaw = theta0 + omega * u, yaw_rate * u
        low = low_point(theta)
        q = rotated_xy(low, yaw)
        bound = max(0, -EAR_HEIGHT - low[2])
        old = p.copy()
        velocity.z -= GRAVITY * DT
        p += velocity * DT
        planted = p.z <= bound + 1e-8 and bound > 1e-5
        if planted:
            p.z = bound
            velocity.z = (bound - previous_bound) / DT
            if previous_planted:
                p.x, p.y = old.x - (q.x - previous_q.x), old.y - (q.y - previous_q.y)
                velocity.x, velocity.y = (p.x - old.x) / DT, (p.y - old.y) / DT
        elif p.z < 0:
            p.z, velocity.z = 0, 0
            # Floor damping only; no horizontal force comes from air swings.
            velocity.x *= math.exp(-5 * DT)
            velocity.y *= math.exp(-5 * DT)
        previous_q, previous_bound, previous_planted = q, bound, planted
        if step % 10 == 0:
            frames.append({"time": start + u, "theta": theta, "yaw": yaw,
                           "position": list(p), "planted": planted, "low": low})
    return frames


shots = [make_shot(start, end, swing, turn, kind)
         for start, end, _caption, _keys, swing, turn, kind in chapters]

# Mark each shot's complete body path on the floor and in the top-view inset.
for index, ((start, end, *_rest), shot) in enumerate(zip(chapters, shots)):
    positions = [Vector(record["position"]) for record in shot]
    center = sum(positions, Vector()) / len(positions)
    extent = max(max(abs(p.x - center.x), abs(p.y - center.y)) for p in positions) + 0.65
    for sample_index in range(0, len(shot), 5):
        p = positions[sample_index]
        dot = sphere(f"Ground Path {index} {sample_index}", (p.x, p.y, 0.009),
                     (0.035, 0.035, 0.006), red)
        visible_in(dot, start, end)
        xy = trace_origin + Vector(((p.x - center.x) / extent * trace_span / 2,
                                     (p.y - center.y) / extent * trace_span / 2, 0))
        dot = sphere(f"Inset Path {index} {sample_index}", tuple(xy),
                     (0.0014, 0.0014, 0.0004), red, hud)
        visible_in(dot, start, end)
    for record in shot:
        record["trace"] = list(trace_origin + Vector((
            (record["position"][0] - center.x) / extent * trace_span / 2,
            (record["position"][1] - center.y) / extent * trace_span / 2, 0)))

frames_meta = []
for chapter, shot in zip(chapters, shots):
    start, end, caption, keys, swing, turn, kind = chapter
    for record in shot:
        frame = round(record["time"] * FPS) + 1
        theta, yaw = record["theta"], record["yaw"]
        position = Vector(record["position"])
        root.location, root.rotation_euler = position, (0, 0, yaw)
        root.keyframe_insert(data_path="location", frame=frame)
        root.keyframe_insert(data_path="rotation_euler", frame=frame)
        for hinge in hinges:
            hinge.rotation_euler.y = theta
            hinge.keyframe_insert(data_path="rotation_euler", frame=frame)
        for side, marker in zip((-1, 1), contacts):
            q = rotated_xy(record["low"], yaw, side)
            marker.location = (position.x + q.x, position.y + q.y, 0.01)
            marker.scale = (1, 1, 1) if record["planted"] else (0, 0, 0)
            marker.keyframe_insert(data_path="location", frame=frame)
            marker.keyframe_insert(data_path="scale", frame=frame)
        ruler.location = (position.x, position.y, 0)
        ruler.keyframe_insert(data_path="location", frame=frame)
        # Translation follows the body; viewing direction never follows yaw.
        target = Vector((position.x, position.y, 1.95 if kind == "side" else 2.30))
        offset = {"side": (0.2, -16, 2.0), "three-quarter": (8.0, -12, 3.5),
                  "rear": (-14, -3, 3.5)}[kind]
        camera.location = target + Vector(offset)
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        camera.data.ortho_scale = 12.0 if kind == "side" else 16.8
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
        camera.data.keyframe_insert(data_path="ortho_scale", frame=frame)
        hud.scale = (camera.data.ortho_scale,) * 3
        hud.keyframe_insert(data_path="scale", frame=frame)
        trace_marker.location = record["trace"]
        trace_nose.location = Vector(record["trace"]) + Vector((
            0.007 * math.cos(yaw), 0.007 * math.sin(yaw), 0))
        trace_nose.rotation_euler.z = yaw
        for obj in (trace_marker, trace_nose):
            obj.keyframe_insert(data_path="location", frame=frame)
            obj.keyframe_insert(data_path="rotation_euler", frame=frame)
        frames_meta.append({"frame": frame, "keys": keys, "theta": round(theta, 5),
                            "yaw": round(yaw, 5), "position": list(position),
                            "body_lift": position.z, "planted": record["planted"]})

for obj in bpy.data.objects:
    ancestor = obj.parent
    while ancestor:
        if ancestor == hud:
            obj.display.show_shadows = False
            break
        ancestor = ancestor.parent
    if obj.type == "MESH":
        assert not obj.data.validate(), f"Invalid preview geometry: {obj.name}"
scene.frame_set(1)
scene["purpose"] = "Reach and combined-input motion proposal; driven angles, simplified support and flight"
scene["controls"] = "W/S shared pitch; A/D shared heading; root upright and free to translate/rise"
scene["ear_length"] = EAR_LENGTH
scene["ear_attachment_height"] = EAR_HEIGHT
scene["static_support_rise"] = EAR_LENGTH - EAR_HEIGHT
SOURCE.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report = {
    "fps": FPS, "duration": DURATION, "frames": scene.frame_end,
    "source": str(SOURCE), "purpose": scene["purpose"],
    "ear_length": EAR_LENGTH, "attachment_height": EAR_HEIGHT,
    "static_support_rise": EAR_LENGTH - EAR_HEIGHT,
    "max_body_lift": max(record["body_lift"] for record in frames_meta),
    "chapters": [{"start": a, "end": b, "caption": c, "keys": d}
                 for a, b, c, d, *_ in chapters],
    "motion": frames_meta,
}
(OUT / "motion-record.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"MOTION_SOURCE_READY {SOURCE}")
print(f"MAX_BODY_LIFT {report['max_body_lift']:.4f}")
if "--render" in sys.argv:
    bpy.ops.render.render(animation=True)
