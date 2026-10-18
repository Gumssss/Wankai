"""Physics-driven airborne ear response comparison, revision 06.

Reuses the revision 02 primitive character. Visual poses replay sampled Bullet rigid-body results.
The launch is a test impulse; airborne rotation is not scripted.
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
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
VARIANT = args[0] if args else "soft"
assert VARIANT in ("soft", "loose")
SOURCE = ROOT / f"assets/source/blender/beagle-ear-motion-study-v06-{VARIANT}.blend"
OUT = ROOT / f"output/blender/beagle-motion-study-v06-{VARIANT}"
FPS, DURATION = 30, 12
physics = {direction: json.loads((ROOT / "output/blender/beagle-airborne-physics" /
            f"{VARIANT}-{'forward' if direction > 0 else 'backward'}.json").read_text())
           for direction in (-1, 1)}
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
scene.render.resolution_x, scene.render.resolution_y = 1600, 900
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


def sample(t, direction):
    record = physics[direction]
    index = min(max(0,t*record['fps']),len(record['motion'])-1)
    lo,hi = math.floor(index),min(math.floor(index)+1,len(record['motion'])-1)
    a,b = record['motion'][lo],record['motion'][hi]
    u = index-lo
    return {'body_position':[mix(x,y,u) for x,y in zip(a['body_position'],b['body_position'])],
            'body_pitch':mix(a['body_pitch'],b['body_pitch'],u),
            'ear_relative_pitch':[mix(x,y,u) for x,y in zip(a['ear_relative_pitch'],b['ear_relative_pitch'])],
            'min_height':mix(a['min_height'],b['min_height'],u)}


hud = empty('Revision 06 Captions',camera,(0,0,-.5))
font = bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial.ttf')


def label(name,text,xy,size=.017):
    data = bpy.data.curves.new(name,'FONT')
    data.body,data.size,data.font = text,size,font
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.parent,obj.location=hud,(*xy,.003)
    obj.data.materials.append(ink)
    return obj


box('Top Caption Panel',(0,.245,-.008),(.96,.065,.001),panel_mat,hud,.003)
box('Bottom Caption Panel',(0,-.235,-.008),(.96,.070,.001),panel_mat,hud,.003)
heading = 'A / SOFT BRAKE - EARS LAG AND FOLLOW THROUGH' if VARIANT == 'soft' else 'B / LOOSER HINGES - MORE SWING AND TUMBLING'
label('Title',heading,(-.46,.251),.020)
label('Notice','Airborne physics test / common test launch / rigid ears, one hinge each',(-.46,-.254),.012)
chapters = [(0,2,-1,False),(2,6,-1,True),(6,8,1,False),(8,12,1,True)]
chapter_labels=[]
for index,(_a,_b,direction,slow) in enumerate(chapters):
    text = ('BACKWARD' if direction<0 else 'FORWARD') + (' / 0.35x slow motion - same simulation' if slow else ' / normal speed')
    chapter_labels.append(label('Chapter '+str(index),text,(-.46,.219),.016))
phases = {phrase:label('Phase '+str(i),phrase,(-.46,-.216),.015)
          for i,phrase in enumerate(['TEST LAUNCH / brief impulse supplies the starting momentum',
                                     'FREE FLIGHT / the head hinges allow the ear angle to change',
                                     'GROUND CONTACT / no automatic upright reset'])}
label('Lag Label','EAR ANGLE CHANGE',(.292,.168),.011)
box('Lag Track',(.387,.143,0),(.18,.011,.001),panel_mat,hud,.001)
lagbar=box('Lag Amount',(.297,.143,.001),(.18,.011,.001),teal,hud,.001)
# Move the mesh origin to its left edge for a readable zero-to-180-degree bar.
for v in lagbar.data.vertices:v.co.x += .09
label('Zero','0',(.292,.118),.010)
label('Max','180 deg',(.445,.118),.010)
label('Bar Context','relative to take-off pose',(.292,.098),.010)

metadata=[]
for frame in range(1,scene.frame_end+1):
    time=(frame-1)/FPS
    chapter_index=next(i for i,c in enumerate(chapters) if c[0]<=time<c[1])
    start,end,direction,slow=chapters[chapter_index]
    physical_time=(time-start)*(.35 if slow else 1)
    row=sample(physical_time,direction)
    p=Vector(row['body_position'])-Vector((0,0,CENTER))
    root.location,root.rotation_euler=p,(0,0,0)
    flip.rotation_euler.y=row['body_pitch']
    root.keyframe_insert(data_path='location',frame=frame)
    flip.keyframe_insert(data_path='rotation_euler',frame=frame)
    for hinge,relative in zip(hinges,row['ear_relative_pitch']):
        hinge.rotation_euler.y=relative
        hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
    bpy.context.view_layer.update()
    for cue,paddle in zip(contacts,paddles):
        low=min((paddle.matrix_world@v.co for v in paddle.data.vertices),key=lambda v:v.z)
        cue.location=(low.x,low.y,.012)
        cue.scale=(1,1,1) if low.z<.035 else (0,0,0)
        cue.keyframe_insert(data_path='location',frame=frame)
        cue.keyframe_insert(data_path='scale',frame=frame)
    target=Vector((p.x,0,3.65))
    offset=Vector((.2,-20,2.2)) if slow else Vector((4.2,-18,3.0))
    camera.location=target+offset
    camera.rotation_euler=(-offset).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=20
    camera.keyframe_insert(data_path='location',frame=frame)
    camera.keyframe_insert(data_path='rotation_euler',frame=frame)
    hud.scale=(20,)*3
    phrase=('TEST LAUNCH / brief impulse supplies the starting momentum' if physical_time<7/120 else
            'GROUND CONTACT / no automatic upright reset' if row['min_height']<.04 else
            'FREE FLIGHT / the head hinges allow the ear angle to change')
    for i,obj in enumerate(chapter_labels):
        obj.hide_render=i!=chapter_index
        obj.keyframe_insert(data_path='hide_render',frame=frame)
    for text,obj in phases.items():
        obj.hide_render=text!=phrase
        obj.keyframe_insert(data_path='hide_render',frame=frame)
    lag=abs(row['ear_relative_pitch'][0]-physics[direction]['motion'][0]['ear_relative_pitch'][0])
    lagbar.scale.x=max(.001,min(1,lag/math.pi))
    lagbar.keyframe_insert(data_path='scale',frame=frame)
    metadata.append({'frame':frame,'physical_time':physical_time,'direction':direction,'slow':slow,
                     **row,'ear_angle_change_degrees':math.degrees(lag)})

for obj in bpy.data.objects:
    ancestor=obj.parent
    while ancestor:
        if ancestor==hud:
            obj.display.show_shadows=False
            break
        ancestor=ancestor.parent
    if obj.type=='MESH':assert not obj.data.validate(),obj.name

scene['purpose']='Airborne hinge physics comparison; launch impulse seeded; no scripted full flip or upright landing'
scene['variant']=VARIANT
scene['simulation_source']='scripts/blender/beagle_airborne_physics.py'
scene['ear_geometry']='Two rigid 3.60 h paddles, one head hinge each, fixed length'
model=[o for o in root.children_recursive if o.type=='MESH']
verification={'frames_checked':0,'min_floor_clearance':1e9,'camera_min':[1,1],'camera_max':[0,0],
              'rigid_ear_lengths':True,'stable_head_attachments':True,
              'physics_stats':{str(d):physics[d]['stats'] for d in (-1,1)}}
if '--verify' in sys.argv:
    for row in metadata:
        scene.frame_set(row['frame']);bpy.context.view_layer.update()
        verification['frames_checked']+=1
        for obj in model:
            verification['min_floor_clearance']=min(verification['min_floor_clearance'],min((obj.matrix_world@v.co).z for v in obj.data.vertices))
            for corner in obj.bound_box:
                projected=world_to_camera_view(scene,camera,obj.matrix_world@Vector(corner))
                for i in (0,1):
                    verification['camera_min'][i]=min(verification['camera_min'][i],projected[i])
                    verification['camera_max'][i]=max(verification['camera_max'][i],projected[i])
        for paddle,hinge in zip(paddles,hinges):
            anchor=hinge.matrix_world.translation
            assert abs((paddle.matrix_world@Vector((0,0,LENGTH))-anchor).length-LENGTH)<1e-5
            assert (paddle.matrix_world@Vector((0,0,0))-anchor).length<1e-6
            assert tuple(paddle.scale)==(1,1,1)
    (OUT/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
    print('PHYSICS_VIDEO_CHECKS',json.dumps(verification))
    assert verification['min_floor_clearance']>-.005
    assert verification['camera_min'][0]>.03 and verification['camera_max'][0]<.90
    assert verification['camera_min'][1]>.14 and verification['camera_max'][1]<.88
    for d in (-1,1):
        assert physics[d]['stats']['max_hinge_error']<.001
        assert physics[d]['stats']['min_height']>-.005
        assert abs(physics[d]['motion'][90]['ear_relative_pitch'][0]-physics[d]['motion'][7]['ear_relative_pitch'][0])>.1
scene.frame_set(1)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
(OUT/'motion-record.json').write_text(json.dumps({'variant':VARIANT,'fps':FPS,'duration':DURATION,'motion':metadata},indent=2)+'\n')
print('PHYSICS_VIDEO_SOURCE_READY',SOURCE)
if '--render' in sys.argv:bpy.ops.render.render(animation=True)
