"""Coupled body-and-ear backward and forward flips, revision 05.

Reuses the revision 02 primitive character. All motion is authored for review;
the flip controller and launch tuning are proposals. Ears and body share the full airborne rotation.
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
SOURCE = ROOT / "assets/source/blender/beagle-ear-motion-study-v05.blend"
OUT = ROOT / "output/blender/beagle-motion-study-v05"
FPS, DURATION = 24, 24
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
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
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


def support_angle(height, direction):
    lo, hi = math.pi / 2, math.pi
    for _ in range(50):
        middle = (lo + hi) / 2
        if low_point(direction * middle).z + height > 0:
            lo = middle
        else:
            hi = middle
    return direction * (lo + hi) / 2


GRAVITY = 19.0
DRIVE_START, DRIVE_TIME, CATCH_TIME = .35, .165, .55
LAUNCH = DRIVE_START + DRIVE_TIME


def launch_profile(direction):
    entry, release = support_angle(0, direction), direction * 2.55
    start_contact, last_contact = low_point(entry), low_point(release)
    position = Vector((start_contact.x - last_contact.x, 0, -last_contact.z))
    speed = (release - entry) / DRIVE_TIME
    epsilon = 1e-5
    derivative = (low_point(release + epsilon) - low_point(release - epsilon)) / (2 * epsilon)
    velocity = -derivative * speed
    velocity.y = 0
    # Return to the same support height. The stronger, shorter planted push
    # supplies clearance for the full rigid silhouette to revolve together.
    air_time = 2 * velocity.z / GRAVITY
    landing = position + velocity * air_time + Vector((0, 0, -.5 * GRAVITY * air_time ** 2))
    landing_contact = landing + low_point(direction * TAU + release, direction * TAU)
    return {"direction": direction, "entry": entry, "release": release,
            "start_contact": start_contact, "position": position, "velocity": velocity,
            "air_time": air_time, "landing": landing, "landing_contact": landing_contact}


profiles = {direction: launch_profile(direction) for direction in (-1, 1)}


def flip_pose(t, direction):
    profile = profiles[direction]
    key = "S" if direction < 0 else "W"
    if t < DRIVE_START:
        relative = mix(direction * 1.55, profile["entry"], smooth(t / DRIVE_START))
        return Vector(), 0, relative, "PLANT / prepare the ear-powered launch", False, key, "plant"
    if t < LAUNCH:
        relative = mix(profile["entry"], profile["release"], (t - DRIVE_START) / DRIVE_TIME)
        low = low_point(relative)
        position = Vector((profile["start_contact"].x - low.x, 0, -low.z))
        return position, 0, relative, "PUSH / ear contact launches the whole character", True, key, "push"
    elapsed = t - LAUNCH
    if elapsed < profile["air_time"]:
        phase = elapsed / profile["air_time"]
        position = profile["position"] + profile["velocity"] * elapsed + Vector((0, 0, -.5 * GRAVITY * elapsed ** 2))
        body_pitch = direction * TAU * smooth((phase - .10) / .74)
        # This is the requested coupling: no compensating head-hinge motion.
        # Body and ears share the same rotation, with the launch ear pose held.
        relative = profile["release"]
        return position, body_pitch, relative, "FLIP TOGETHER / body and both ears share the full turn", False, "", "air"
    settle = smooth((elapsed - profile["air_time"]) / CATCH_TIME)
    z = profile["landing"].z * (1 - settle)
    relative = support_angle(z, direction)
    body_pitch = direction * TAU
    low = low_point(body_pitch + relative, body_pitch)
    position = Vector((profile["landing_contact"].x - low.x, 0, z))
    phrase = "CATCH / ear tips meet the floor" if settle < .75 else "SETTLE / return to the upright stance"
    return position, body_pitch, relative, phrase, True, "", "catch" if settle < .75 else "settle"


hud = empty("Revision 05 Captions", camera, (0, 0, -.5))
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
label("Title", "BEAGLE / BODY + EARS FLIP TOGETHER", (-.46, .251), .022)
label("Notice", "Rigid ears rotate with the body / stronger planted launch / authored motion concept", (-.46, -.253), .012)
chapters = [
    (0, 4, "BACKFLIP / whole character rotates backward / normal speed", -1, False),
    (4, 12, "BACKFLIP / same body-and-ear rotation / 0.25x slow motion", -1, True),
    (12, 16, "FRONT FLIP / whole character rotates forward / normal speed", 1, False),
    (16, 24, "FRONT FLIP / same body-and-ear rotation / 0.25x slow motion", 1, True),
]
for index, (start, end, caption, _direction, _slow) in enumerate(chapters):
    visible_in(label(f"Chapter {index}", caption, (-.46, .219), .016),
               round(start * FPS) + 1, round(end * FPS))

key_active = {}
for key, x in (("S", .415), ("W", .461)):
    box(f"Key {key}", (x, .133, 0), (.036, .036, .001), panel_mat, hud, .003)
    key_active[key] = box(f"Key {key} Held", (x, .133, .001), (.036, .036, .001), teal, hud, .003)
    label(f"Key {key} Ink", key, (x - .009, .124), .022)
label("Keys Label", "PLANTED DRIVE", (.384, .096), .010)
phase_objects = {}
for phrase in ("PLANT / prepare the ear-powered launch",
               "PUSH / ear contact launches the whole character",
               "FLIP TOGETHER / body and both ears share the full turn",
               "CATCH / ear tips meet the floor",
               "SETTLE / return to the upright stance"):
    phase_objects[phrase] = label(f"Phase {len(phase_objects)}", phrase, (-.46, -.218), .016)

frames_meta = []
for frame in range(1, scene.frame_end + 1):
    t = (frame - 1) / FPS
    chapter = next(c for c in chapters if c[0] <= t < c[1])
    start, end, _caption, direction, slow = chapter
    u = t - start
    physical_time = u * .25 if slow else max(0, u - .25)
    p, beta, relative, phase_caption, contact, keys, phase = flip_pose(physical_time, direction)
    alpha = beta + relative
    root.location, root.rotation_euler = p, (0, 0, 0)
    flip.rotation_euler.y = beta
    for obj, properties in ((root, ("location", "rotation_euler")), (flip, ("rotation_euler",))):
        for prop in properties:
            obj.keyframe_insert(data_path=prop, frame=frame)
    for hinge in hinges:
        hinge.rotation_euler.y = relative
        hinge.keyframe_insert(data_path="rotation_euler", frame=frame)
    for side, cue in zip((-1, 1), contacts):
        point = low_point(alpha, beta, side) + p
        cue.location = (point.x, point.y, .012)
        cue.scale = (1, 1, 1) if contact else (0, 0, 0)
        cue.keyframe_insert(data_path="location", frame=frame)
        cue.keyframe_insert(data_path="scale", frame=frame)
    target = Vector((p.x, p.y, 3.10))
    offset = Vector((.2, -18, 2.5)) if slow else Vector((5, -16, 4.0))
    camera.location = target + offset
    camera.rotation_euler = (-offset).to_track_quat("-Z", "Y").to_euler()
    camera.data.ortho_scale = 20.0
    camera.keyframe_insert(data_path="location", frame=frame)
    camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    hud.scale = (20,) * 3
    hud.keyframe_insert(data_path="scale", frame=frame)
    for key, obj in key_active.items():
        obj.hide_render = key not in keys
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    for phrase, obj in phase_objects.items():
        obj.hide_render = phrase != phase_caption
        obj.keyframe_insert(data_path="hide_render", frame=frame)
    frames_meta.append({"frame": frame, "time": t, "direction": direction, "slow_motion": slow,
                        "phase": phase, "keys": keys, "position": list(p),
                        "body_pitch": beta, "ear_relative_pitch": relative,
                        "ear_world_pitch": alpha, "contact": contact})

for obj in bpy.data.objects:
    ancestor = obj.parent
    while ancestor:
        if ancestor == hud:
            obj.display.show_shadows = False
            break
        ancestor = ancestor.parent
    if obj.type == "MESH":
        assert not obj.data.validate(), obj.name
scene["purpose"] = "Coupled rigid body-and-ear back/front flip concept; authored motion, not gameplay physics"
scene["controls"] = "S backward planted launch; W forward planted launch; held relative ear pose throughout flight"
scene["ear_length"] = LENGTH
scene["ear_joint_count"] = 2
scene["ear_geometry"] = "Two rigid paddles rotate with the body; no airborne counter-rotation"

if "--verify" in sys.argv:
    model = [o for o in root.children_recursive if o.type == "MESH"]
    floor_min, camera_min, camera_max = 1e9, [1, 1], [0, 0]
    peak_camera_detail = None
    for row in frames_meta:
        scene.frame_set(row["frame"])
        bpy.context.view_layer.update()
        for obj in model:
            floor_min = min(floor_min, min((obj.matrix_world @ v.co).z for v in obj.data.vertices))
            for corner in obj.bound_box:
                projected = world_to_camera_view(scene, camera, obj.matrix_world @ Vector(corner))
                if projected.y > camera_max[1]:
                    peak_camera_detail = {"frame": row["frame"], "object": obj.name}
                camera_min = [min(camera_min[i], projected[i]) for i in (0, 1)]
                camera_max = [max(camera_max[i], projected[i]) for i in (0, 1)]
        if row["phase"] == "air":
            assert abs(row["ear_relative_pitch"] - profiles[row["direction"]]["release"]) < 1e-7
            assert abs(row["ear_world_pitch"] - row["body_pitch"] - row["ear_relative_pitch"]) < 1e-7
        if row["contact"]:
            assert abs(math.sin(row["body_pitch"])) < 1e-6
        for side, paddle, hinge in zip((-1, 1), paddles, hinges):
            anchor = root.matrix_world @ (Vector((0, 0, CENTER)) + ry(row["body_pitch"]) @
                                         Vector((0, side * .66, ANCHOR - CENTER)))
            assert (anchor - hinge.matrix_world.translation).length < 1e-5
            assert abs(((paddle.matrix_world @ Vector((0, 0, LENGTH))) - anchor).length - LENGTH) < 1e-5
            assert tuple(paddle.scale) == (1, 1, 1) and len(hinge.children) == 1
        for key, obj in key_active.items():
            assert (not obj.hide_render) == (key in row["keys"])
    for direction in (-1, 1):
        for slow in (False, True):
            rows = [r for r in frames_meta if r["direction"] == direction and r["slow_motion"] == slow]
            assert abs(rows[-1]["body_pitch"] - direction * TAU) < 1e-6
            assert abs(rows[0]["body_pitch"]) < 1e-6
            assert rows[-1]["position"][0] * direction > 0
    verification = {"frames_checked": len(frames_meta), "min_model_floor_clearance": floor_min,
                    "model_camera_bounds": {"min": camera_min, "max": camera_max},
                    "peak_camera_detail": peak_camera_detail,
                    "constant_relative_ear_pose_in_flight": True, "body_and_ears_share_rotation": True,
                    "full_front_and_back_rotation_verified": True, "rigid_ear_lengths_preserved": True,
                    "stable_head_attachments": True, "matching_input_overlays": True}
    (OUT / "verification.json").write_text(json.dumps(verification, indent=2) + "\n")
    print("MOTION_CHECKS", json.dumps(verification))
    assert floor_min > -.0001, f"Model penetrates floor: {floor_min}"
    assert camera_min[0] > .02 and camera_max[0] < .87, (camera_min, camera_max)
    assert camera_min[1] > .145 and camera_max[1] < .875, (camera_min, camera_max)

scene.frame_set(1)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report = {"fps": FPS, "duration": DURATION, "frames": scene.frame_end,
          "source": str(SOURCE), "purpose": scene["purpose"], "ear_length": LENGTH,
          "chapters": [{"start": a, "end": b, "caption": c, "direction": d, "slow": e}
                       for a, b, c, d, e in chapters],
          "launch_profiles": {str(d): {k: list(v) if isinstance(v, Vector) else v
                                        for k, v in profile.items()} for d, profile in profiles.items()},
          "motion": frames_meta}
(OUT / "motion-record.json").write_text(json.dumps(report, indent=2) + "\n")
print("MOTION_SOURCE_READY", SOURCE)
if "--render" in sys.argv:
    bpy.ops.render.render(animation=True)
