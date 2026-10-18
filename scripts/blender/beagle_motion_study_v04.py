"""Horizontal ear attacks and a controlled aerial backflip, revision 04.

Reuses the revision 02 primitive character. All motion is authored for review;
the backflip controller and trigger are proposals. Each ear stays rigid and uses one head hinge.
"""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "assets/source/blender/beagle-ear-motion-study-v02.blend"
SOURCE = ROOT / "assets/source/blender/beagle-ear-motion-study-v04.blend"
OUT = ROOT / "output/blender/beagle-motion-study-v04"
FPS, DURATION = 24, 27
LENGTH, ANCHOR, CENTER = 3.60, 1.43, 0.85
TAU = math.tau
if SOURCE.exists() and "--replace-generated" not in sys.argv:
    raise FileExistsError(f"Preserving existing source: {SOURCE}")
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "frames").mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BASE))
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
root = bpy.data.objects["CTRL_Beagle_Root"]
camera = scene.camera
keep = {root, camera, *root.children_recursive}
keep.update(o for o in bpy.data.objects if o.name == "Arena Floor"
            or o.name.startswith(("Distance Mark ", "Lane Mark ")))
for obj in list(bpy.data.objects):
    if obj not in keep:
        bpy.data.objects.remove(obj, do_unlink=True)
for obj in bpy.data.objects:
    obj.animation_data_clear()
camera.data.animation_data_clear()
root.location, root.rotation_euler = (0, 0, 0), (0, 0, 0)
scene.frame_start, scene.frame_end = 1, FPS * DURATION
scene.render.fps = FPS
scene.render.filepath = str(OUT / "frames/#####")
scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.display.shading.show_shadows = True

tan = bpy.data.materials["Ear Tan"]
cream = bpy.data.materials["Warm White"]
dark = bpy.data.materials["Face Dark"]
red = bpy.data.materials["P1 Terracotta"]
teal = bpy.data.materials["Contact Teal"]
ink = bpy.data.materials["Caption Ink"]
panel_mat = bpy.data.materials["Caption Panel"]
amber = bpy.data.materials["Sliding Contact Amber"]


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent, obj.location = parent, location
    return obj


def sphere(name, location, scale, material, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=1)
    obj = bpy.context.object
    obj.name, obj.parent, obj.location, obj.scale = name, parent, location, scale
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def box(name, location, dimensions, material, parent=None, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name, obj.location, obj.dimensions = name, location, dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mod = obj.modifiers.new("Rounded Edges", "BEVEL")
    mod.width, mod.segments = bevel, 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.parent = parent
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def ry(angle):
    return Matrix.Rotation(angle, 3, "Y")


def smooth(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def mix(a, b, value):
    return a + (b - a) * value


# The world root owns travel/yaw. A separate centered pivot allows the body to
# rotate in flight without rotating around the fighter's feet.
flip = empty("CTRL_Beagle_BodyPitch", root, (0, 0, CENTER))
for obj in list(root.children):
    if obj == flip:
        continue
    obj.parent = flip
    obj.location.z -= CENTER


# Keep the original uninterrupted revision 02 paddle meshes. There are no
# midpoint joints, shape keys, or animated scales in this study.
hinges, paddles, contacts = [], [], []
for side, name in ((-1, "L"), (1, "R")):
    hinge = bpy.data.objects[f"CTRL_{name}_Ear_Hinge"]
    hinge.rotation_euler = (0, 0, 0)
    paddle = bpy.data.objects[f"{name} Ear Paddle"]
    assert not paddle.data.validate(), paddle.name
    hinges.append(hinge)
    paddles.append(paddle)
    bpy.ops.mesh.primitive_torus_add(major_radius=.12, minor_radius=.018,
                                    major_segments=28, minor_segments=8)
    cue = bpy.context.object
    cue.name = f"{name} Planted Ear Cue"
    cue.data.materials.append(teal)
    contacts.append(cue)

ear_vertices = [v.co.copy() for v in paddles[0].data.vertices]


def ear_points(alpha, beta=0, side=-1):
    anchor = Vector((0, 0, CENTER)) + ry(beta) @ Vector((0, side * .66, ANCHOR - CENTER))
    return [anchor + ry(alpha) @ v for v in ear_vertices]


def low_point(alpha, beta=0, side=-1):
    return min(ear_points(alpha, beta, side), key=lambda p: p.z)


def support_angle(height):
    lo, hi = math.pi / 2, math.pi
    for _ in range(50):
        middle = (lo + hi) / 2
        if low_point(-middle).z + height > 0:
            lo = middle
        else:
            hi = middle
    return -(lo + hi) / 2


ENTRY, RELEASE = support_angle(0), -2.55
DRIVE_START, DRIVE_TIME, AIR_TIME, CATCH_TIME = .35, .21, .72, .55
LAUNCH = DRIVE_START + DRIVE_TIME
LAND = LAUNCH + AIR_TIME
FINISH = LAND + CATCH_TIME
contact_start = low_point(ENTRY)
released = low_point(RELEASE)
launch_position = Vector((contact_start.x - released.x, 0, -released.z))
angular_speed = (RELEASE - ENTRY) / DRIVE_TIME
epsilon = 1e-5
derivative = (low_point(RELEASE + epsilon) - low_point(RELEASE - epsilon)) / (2 * epsilon)
launch_velocity = -derivative * angular_speed
launch_velocity.y = 0
GRAVITY = 19.0
land_position = launch_position + launch_velocity * AIR_TIME + Vector((0, 0, -.5 * GRAVITY * AIR_TIME ** 2))
LAND_ANGLE = support_angle(land_position.z)
landing_contact = land_position + low_point(LAND_ANGLE)


def flip_pose(t):
    if t < DRIVE_START:
        alpha = mix(-1.55, ENTRY, smooth(t / DRIVE_START))
        return Vector(), 0, alpha, "PLANT / S prepares the backward push", False, "S"
    if t < LAUNCH:
        alpha = mix(ENTRY, RELEASE, (t - DRIVE_START) / DRIVE_TIME)
        low = low_point(alpha)
        p = Vector((contact_start.x - low.x, 0, -low.z))
        return p, 0, alpha, "PUSH / S drives the ears against the floor", True, "S"
    if t < LAND:
        elapsed = t - LAUNCH
        phase = elapsed / AIR_TIME
        p = launch_position + launch_velocity * elapsed + Vector((0, 0, -.5 * GRAVITY * elapsed ** 2))
        beta = -TAU * smooth((phase - .10) / .74)
        # Counter-rotation at the two existing head hinges keeps the long
        # paddles swept back while the torso turns. Geometry stays unchanged.
        alpha = mix(RELEASE, -1.25, smooth(phase / .30))
        if phase > .70:
            alpha = mix(-1.25, LAND_ANGLE, smooth((phase - .70) / .30))
        caption = ("CLEAR / ears rotate only at the head attachments" if phase < .28 else
                   "FLIP / body rotates; both ears stay straight" if phase < .70 else
                   "REACH / rigid ears swing down to catch")
        return p, beta, alpha, caption, False, ""
    phase = smooth((t - LAND) / CATCH_TIME)
    z = land_position.z * (1 - phase)
    alpha = support_angle(z)
    low = low_point(alpha)
    p = Vector((landing_contact.x - low.x, 0, z))
    caption = "CATCH / ear tips meet the ground first" if phase < .75 else "SETTLE / return to the upright stance"
    return p, -TAU, alpha, caption, True, ""


# A simple foam target demonstrates that yaw sweeps are attacks as well as
# heading changes. Color/cue timing is an authored geometric overlap indicator.
target = empty("Training Target", location=(2.75, 0, 0))
box("Target Base", (0, 0, .05), (.65, .65, .10), dark, target)
box("Target Stem", (0, 0, .68), (.12, .12, 1.25), dark, target)
target_material = teal.copy()
target_material.name = "Foam Target Feedback"
sphere("Foam Target", (0, 0, ANCHOR), (.28, .28, .31), target_material, target)
bpy.ops.mesh.primitive_torus_add(major_radius=.38, minor_radius=.025,
                                major_segments=28, minor_segments=8)
hit_ring = bpy.context.object
hit_ring.name, hit_ring.location = "Horizontal Hit Cue", (2.75, 0, ANCHOR)
hit_ring.data.materials.append(amber)

# Compact overlays leave the whole silhouette visible.
hud = empty("Revision 04 Captions", camera, (0, 0, -.5))
font = bpy.data.fonts.load("/System/Library/Fonts/Supplemental/Arial.ttf")


def label(name, text, xy, size=.017):
    data = bpy.data.curves.new(name, "FONT")
    data.body, data.size, data.font = text, size, font
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.parent, obj.location = hud, (*xy, .003)
    obj.data.materials.append(ink)
    return obj


def visible_in(obj, first, last):
    for frame, hidden in ((1, first > 1), (first, False), (last + 1, True)):
        obj.hide_render = hidden
        obj.keyframe_insert(data_path="hide_render", frame=frame)


box("Top Caption Panel", (0, .245, -.008), (.96, .065, .001), panel_mat, hud, .003)
box("Bottom Caption Panel", (0, -.235, -.008), (.96, .070, .001), panel_mat, hud, .003)
label("Title", "BEAGLE / RIGID EARS + BACKFLIP", (-.46, .251), .022)
label("Notice", "Rigid ears / head hinges only / authored motion proposal; flip control needs a game prototype",
      (-.46, -.253), .012)
chapters = [
    (0, 4.5, "A / level ears sweep LEFT through the target", "horizontal-left"),
    (4.5, 9, "D / level ears sweep RIGHT through the target", "horizontal-right"),
    (9, 13, "BACKFLIP / side view at normal speed", "flip-normal"),
    (13, 21, "BACKFLIP / slow motion at 0.25x", "flip-slow"),
    (21, 27, "THREE-QUARTER / backflip, land, horizontal attack", "flip-recover"),
]
for index, (start, end, caption, _kind) in enumerate(chapters):
    obj = label(f"Chapter {index}", caption, (-.46, .219), .016)
    visible_in(obj, round(start * FPS) + 1, round(end * FPS))

key_positions = {"W": (.428, .155), "A": (.390, .116),
                 "S": (.428, .116), "D": (.466, .116)}
key_active = {}
for key, xy in key_positions.items():
    box(f"Key {key}", (*xy, 0), (.032, .032, .001), panel_mat, hud, .003)
    key_active[key] = box(f"Key {key} Held", (*xy, .001), (.032, .032, .001), teal, hud, .003)
    label(f"Key {key} Ink", key, (xy[0] - .008, xy[1] - .008), .021)
label("Keys Label", "HELD INPUT", (.375, .084), .011)

phase_objects = {}
for phrase in ("LEVEL EARS / A-D drives a horizontal strike",
               "PLANT / S prepares the backward push",
               "PUSH / S drives the ears against the floor",
               "CLEAR / ears rotate only at the head attachments",
               "FLIP / body rotates; both ears stay straight",
               "REACH / rigid ears swing down to catch",
               "CATCH / ear tips meet the ground first",
               "SETTLE / return to the upright stance",
               "RECOVER / W raises the ears, then D sweeps sideways"):
    phase_objects[phrase] = label(f"Phase {len(phase_objects)}", phrase, (-.46, -.218), .016)

frames_meta = []
for frame in range(1, scene.frame_end + 1):
    t = (frame - 1) / FPS
    chapter = next(c for c in chapters if c[0] <= t < c[1])
    start, end, _caption, kind = chapter
    u = t - start
    yaw, beta = 0, 0
    attack, contact, hit = kind.startswith("horizontal"), False, False
    if attack:
        sign = 1 if kind.endswith("left") else -1
        yaw = sign * mix(-math.radians(70), math.radians(70), smooth((u - .3) / 3.6))
        p, alpha, keys = Vector(), math.pi / 2, "A" if sign > 0 else "D"
        phase_caption = "LEVEL EARS / A-D drives a horizontal strike"
        inverse_target = Matrix.Rotation(-yaw, 3, "Z") @ Vector((2.75, 0, 0))
        hit = 0 < inverse_target.x < LENGTH and any(abs(inverse_target.y - side * .66) < .38 for side in (-1, 1))
        target_material.diffuse_color = amber.diffuse_color if hit else teal.diffuse_color
        target_material.keyframe_insert(data_path="diffuse_color", frame=frame)
        target.rotation_euler.x = .11 * math.sin(yaw) if hit else 0
        target.keyframe_insert(data_path="rotation_euler", frame=frame)
        target_visible = True
        view_target = Vector((1.20, 0, .8))
        view_offset, scale = Vector((7, -11, 10)), 13.1
    else:
        physical_time = (u - .25) if kind != "flip-slow" else u * .25
        p, beta, alpha, phase_caption, contact, keys = flip_pose(max(0, physical_time))
        if kind == "flip-recover" and u > 2.2:
            phase = smooth((u - 2.2) / 1.30)
            alpha = mix(ENTRY, math.pi / 2, phase)
            contact, keys = False, "D" if u > 3.5 else "W"
            yaw = -mix(0, math.radians(140), smooth((u - 3.5) / 2.2))
            phase_caption = "RECOVER / W raises the ears, then D sweeps sideways"
        target_visible = False
        view_target = Vector((p.x, p.y, 2.50))
        view_offset = Vector((.2, -16, 2.5)) if kind != "flip-recover" else Vector((7, -12, 4.0))
        scale = 14.8 if kind != "flip-recover" else 15.6

    root.location, root.rotation_euler = p, (0, 0, yaw)
    flip.rotation_euler.y = beta
    for obj, properties in ((root, ("location", "rotation_euler")), (flip, ("rotation_euler",))):
        for prop in properties:
            obj.keyframe_insert(data_path=prop, frame=frame)
    for hinge in hinges:
        hinge.rotation_euler.y = alpha - beta
        hinge.keyframe_insert(data_path="rotation_euler", frame=frame)
    for side, cue in zip((-1, 1), contacts):
        low = low_point(alpha, beta, side)
        q = Matrix.Rotation(yaw, 3, "Z") @ low + p
        cue.location = (q.x, q.y, .012)
        cue.scale = (1, 1, 1) if contact else (0, 0, 0)
        cue.keyframe_insert(data_path="location", frame=frame)
        cue.keyframe_insert(data_path="scale", frame=frame)
    for obj in (target, *target.children_recursive):
        obj.hide_render = not target_visible
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    hit_ring.scale = (1, 1, 1) if hit else (0, 0, 0)
    hit_ring.keyframe_insert(data_path="scale", frame=frame)
    camera.location = view_target + view_offset
    camera.rotation_euler = (-view_offset).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = scale
    camera.keyframe_insert(data_path="location", frame=frame)
    camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    camera.data.keyframe_insert(data_path="ortho_scale", frame=frame)
    hud.scale = (scale,) * 3
    hud.keyframe_insert(data_path="scale", frame=frame)
    for key, obj in key_active.items():
        obj.hide_render = key not in keys
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    for phrase, obj in phase_objects.items():
        obj.hide_render = phrase != phase_caption
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    frames_meta.append({"frame": frame, "time": t, "chapter": kind, "phase": phase_caption,
                        "keys": keys, "position": list(p), "body_pitch": beta,
                        "ear_world_pitch": alpha, "yaw": yaw,
                        "contact": contact, "target_overlap": hit})

for obj in bpy.data.objects:
    ancestor = obj.parent
    while ancestor:
        if ancestor == hud:
            obj.display.show_shadows = False
            break
        ancestor = ancestor.parent
    if obj.type == "MESH":
        assert not obj.data.validate(), obj.name
scene["purpose"] = "Horizontal strike and controlled backflip concept; authored motion, not gameplay physics"
scene["controls"] = "A/D horizontal sweeps at level pitch; S planted launch; proposed aerial flip assist"
scene["ear_length"] = LENGTH
scene["ear_joint_count"] = 2
scene["ear_geometry"] = "Two uninterrupted rigid paddles, one head hinge each"
scene["body_pitch_pivot"] = CENTER
if "--verify" in sys.argv:
    model = [o for o in root.children_recursive if o.type == "MESH"]
    floor_min, camera_min, camera_max = 1e9, [1, 1], [0, 0]
    peak_camera_detail = None
    chapter_rotations = {}
    for row in frames_meta:
        scene.frame_set(row["frame"])
        bpy.context.view_layer.update()
        for obj in model:
            floor_min = min(floor_min, min((obj.matrix_world @ v.co).z for v in obj.data.vertices))
            for corner in obj.bound_box:
                projected = world_to_camera_view(scene, camera, obj.matrix_world @ Vector(corner))
                if projected.y > camera_max[1]:
                    peak_camera_detail = {"frame": row["frame"], "object": obj.name,
                                          "world": list(obj.matrix_world @ Vector(corner))}
                camera_min = [min(camera_min[i], projected[i]) for i in (0, 1)]
                camera_max = [max(camera_max[i], projected[i]) for i in (0, 1)]
        assert abs(root.rotation_euler.x) < 1e-6 and abs(root.rotation_euler.y) < 1e-6
        if row["contact"]:
            assert abs(math.sin(row["body_pitch"])) < 1e-6
        for side, paddle, hinge in zip((-1, 1), paddles, hinges):
            assert tuple(paddle.scale) == (1, 1, 1)
            assert len(hinge.children) == 1 and hinge.children[0] == paddle
            anchor = root.matrix_world @ (Vector((0, 0, CENTER)) + ry(row["body_pitch"]) @
                                         Vector((0, side * .66, ANCHOR - CENTER)))
            assert (anchor - hinge.matrix_world.translation).length < 1e-5
            tip = paddle.matrix_world @ Vector((0, 0, LENGTH))
            assert abs((tip - anchor).length - LENGTH) < 1e-5
        for key, obj in key_active.items():
            assert (not obj.hide_render) == (key in row["keys"]), (row["frame"], key)
        if row["chapter"] in chapter_rotations:
            previous = chapter_rotations[row["chapter"]]
            assert max(abs(previous[i] - camera.rotation_euler[i]) for i in range(3)) < 1e-4
        else:
            chapter_rotations[row["chapter"]] = tuple(camera.rotation_euler)
    verification = {"frames_checked": len(frames_meta), "min_model_floor_clearance": floor_min,
                    "model_camera_bounds": {"min": camera_min, "max": camera_max},
                    "input_overlays_match": True, "camera_heading_fixed_per_shot": True,
                    "rotation_only_in_air": True, "rigid_ear_lengths_preserved": True,
                    "one_hinge_per_ear": True, "stable_head_attachments": True}
    verification["peak_camera_detail"] = peak_camera_detail
    (OUT / "verification.json").write_text(json.dumps(verification, indent=2) + "\n")
    print("MOTION_CHECKS", json.dumps(verification))
    assert floor_min > -.0001, f"Model penetrates floor: {floor_min}"
    assert camera_min[0] > .02 and camera_max[0] < .87, (camera_min, camera_max)
    assert camera_min[1] > .145 and camera_max[1] < .875, (camera_min, camera_max)
scene.frame_set(1)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report = {"fps": FPS, "duration": DURATION, "frames": scene.frame_end,
          "purpose": scene["purpose"], "source": str(SOURCE), "ear_length": LENGTH,
          "chapters": [{"start": a, "end": b, "caption": c, "kind": d} for a, b, c, d in chapters],
          "launch_position": list(launch_position), "launch_velocity": list(launch_velocity),
          "landing_position": list(land_position), "motion": frames_meta}
(OUT / "motion-record.json").write_text(json.dumps(report, indent=2) + "\n")
print("MOTION_SOURCE_READY", SOURCE)
print("LAUNCH", list(launch_position), list(launch_velocity), "LAND", list(land_position))
if "--render" in sys.argv:
    bpy.ops.render.render(animation=True)
