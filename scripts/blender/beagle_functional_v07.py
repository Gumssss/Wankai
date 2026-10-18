"""Functional weapon ears, revision 07: replay the game-physics prototype.

Reuses the revision 02 primitive character. Visual poses replay sampled Bullet rigid-body results.
Inputs, contacts, damage, and recoil come from the experimental game solver.
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
VARIANT = args[0] if args else "movement"
assert VARIANT in ("movement", "combat")
SOURCE = ROOT / f"assets/source/blender/beagle-ear-functional-v07-{VARIANT}.blend"
OUT = ROOT / f"output/blender/beagle-functional-v07-{VARIANT}"
FPS = 30
report = json.loads((ROOT / "output/beagle-functional-preview/functional-motion.json").read_text())
records = {record['id']:record for record in report['scenarios']}
if VARIANT == 'movement':
    shots = [('drive-release-reverse',4.8,1,0),('drive-release-reverse',4,.5,.15),
             ('combined-wa',2.6,1,0),('combined-wd',2.6,1,0),
             ('combined-sa',2.6,1,0),('combined-sd',2.6,1,0)]
else:
    shots = [('vertical-hit',2.6,1,0),('vertical-hit',3.6,.25,.1),
             ('horizontal-hit',2.6,1,0),('horizontal-hit',3.6,.25,0),
             ('sword-clash',3,1,0),('sword-clash',4,.25,.15)]
DURATION = sum(shot[1] for shot in shots)
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
scene.frame_start, scene.frame_end = 1, round(FPS * DURATION)
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


def to_blender(p):
    return Vector((p['x'],-p['z'],p['y']))


def sample(record,t):
    index=min(max(0,t*record['fps']),len(record['rows'])-1)
    lo,hi=math.floor(index),min(math.floor(index)+1,len(record['rows'])-1)
    a,b=record['rows'][lo],record['rows'][hi]
    u=index-lo
    result={'inputs':a['inputs'],'players':[]}
    for pa,pb in zip(a['players'],b['players']):
        p={**pa}
        for key in ('p','v'):
            p[key]={axis:mix(pa[key][axis],pb[key][axis],u) for axis in ('x','y','z')}
        for key in ('theta','wt','wp','stamina'):
            p[key]=mix(pa[key],pb[key],u)
        p['phi']=pa['phi']+((pb['phi']-pa['phi']+math.pi)%math.tau-math.pi)*u
        if p['weapon']=='ears':
            p['sockets']=[{'x':p['p']['x']-side*.66*math.sin(p['phi']),
                           'y':p['p']['y']+.84,
                           'z':p['p']['z']+side*.66*math.cos(p['phi'])} for side in (-1,1)]
        result['players'].append(p)
    return result


def set_visible(obj,visible,frame):
    obj.hide_render=not visible
    obj.keyframe_insert(data_path='hide_render',frame=frame)


def sword_point(player,local):
    y=1.2+local['y']
    st,ct=math.sin(player['theta']),math.cos(player['theta'])
    sp,cp=math.sin(player['phi']),math.cos(player['phi'])
    x=local['x']*ct+y*st
    return to_blender({'x':player['p']['x']+x*cp-local['z']*sp,
                       'y':player['p']['y']-local['x']*st+y*ct,
                       'z':player['p']['z']+x*sp+local['z']*cp})


def capsule(name,a,b,radius,mat,parent=None):
    a,b=Vector(a),Vector(b)
    control=empty(name,parent,(a+b)/2)
    delta=b-a
    control.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    length=delta.length
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=length)
    cylinder=bpy.context.object
    cylinder.name=name+' solid'
    cylinder.parent=control;cylinder.location=(0,0,0)
    cylinder.data.materials.append(mat)
    for poly in cylinder.data.polygons:poly.use_smooth=True
    sphere(name+' cap A',(0,0,-length/2),(radius,)*3,mat,control)
    sphere(name+' cap B',(0,0,length/2),(radius,)*3,mat,control)
    return control


# The other fighter is drawn from the game's actual torso/head hurtbox shapes.
opponent=empty('CTRL_Opponent')
opp_parts=[]
opp_parts.append(capsule('Dummy torso',(0,0,-.19),(0,0,.18),.38,panel_mat,opponent))
opp_parts.append(sphere('Dummy head',(0,0,.76),(.38,)*3,amber,opponent))
for side in (-1,1):
    opp_parts.append(sphere('Dummy eye '+str(side),(.335,side*.12,.80),(.045,.045,.045),dark,opponent))
sword=[]
sword_record=records['sword-clash']['rows'][0]['players'][1]
for i,seg in enumerate(sword_record['segments']):
    sword.append(capsule('Sword proxy '+str(i),to_blender(seg['a']),to_blender(seg['b']),seg['radius'],ink))

impact=sphere('Verified contact flash',(0,0,0),(.1,)*3,amber)
trail=[sphere('Travel trace '+str(i),(0,0,.018),(.028,.028,.012),teal) for i in range(35)]

hud=empty('Revision 07 Captions',camera,(0,0,-.5))
font=bpy.data.fonts.load('/System/Library/Fonts/Supplemental/Arial.ttf')


def label(name,text,xy,size=.017):
    data=bpy.data.curves.new(name,'FONT')
    data.body,data.size,data.font=text,size,font
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.parent,obj.location=hud,(*xy,.003)
    obj.data.materials.append(ink)
    return obj


box('Top Caption Panel',(0,.245,-.008),(.96,.065,.001),panel_mat,hud,.003)
box('Bottom Caption Panel',(0,-.235,-.008),(.96,.070,.001),panel_mat,hud,.003)
heading='POWERED EARS / GROUND MOVEMENT + COMBINED CONTROLS' if VARIANT=='movement' else 'WEAPON EARS / VERTICAL HIT + HORIZONTAL HIT + SWORD CLASH'
label('Title',heading,(-.46,.251),.0185)
label('Notice','Experimental ear frame + current game controller / 180 Hz physics / no scripted launch',(-.46,-.254),.0115)
label('Stamina label','SHARED STAMINA',(.32,.164),.010)
box('Stamina track',(.397,.142,0),(.16,.011,.001),panel_mat,hud,.001)
stamina_bar=box('Stamina amount',(.317,.142,.001),(.16,.011,.001),teal,hud,.001)
for vertex in stamina_bar.data.vertices:vertex.co.x+=.08
label('Health label','OPPONENT HP',(.32,.112),.010)
box('Health track',(.397,.091,0),(.16,.011,.001),panel_mat,hud,.001)
health_bar=box('Health amount',(.317,.091,.001),(.16,.011,.001),amber,hud,.001)
for vertex in health_bar.data.vertices:vertex.co.x+=.08
health_values=sorted({p['health'] for r in records.values() for row in r['rows'] for p in row['players'][1:]})
health_labels={hp:label('HP '+str(hp),str(hp),(.447,.109),.012) for hp in health_values}
chapter_labels=[]
for i,(record_id,length,speed,offset) in enumerate(shots):
    record=records[record_id]
    text=record['caption']+(' / '+str(speed)+'x' if speed!=1 else ' / normal speed')
    chapter_labels.append(label('Chapter '+str(i),text,(-.46,.219),.014))
key_highlights={}
for key,xy in [('W',(-.435,.158)),('A',(-.475,.113)),('S',(-.435,.113)),('D',(-.395,.113))]:
    box('Key '+key,(*xy,0),(.035,.035,.001),panel_mat,hud,.002)
    key_highlights[key]=box('Held '+key,(*xy,.001),(.035,.035,.001),teal,hud,.002)
    label('Key Ink '+key,key,(xy[0]-.010,xy[1]-.010),.022)
phase_labels={p:label('Phase '+str(i),p,(-.46,-.217),.014)
              for i,p in enumerate(['POWERED / input actively accelerates the solid ears',
                                    'RELEASE / momentum continues under gravity and damping',
                                    'GROUND SUPPORT / contact lifts and carries the body',
                                    'REVERSE / opposite input brakes before changing direction',
                                    'HIT / actual game damage and contact response',
                                    'CLASH / ear and sword deflect; fighters recoil'])}
damage_values=sorted({e['damage'] for r in records.values() for e in r['events'] if e['type']=='hit'})
world_texts={}
for value in [*damage_values,'CLASH']:
    data=bpy.data.curves.new('Impact '+str(value),'FONT');data.body=str(value);data.font=font;data.size=.34
    obj=bpy.data.objects.new('Contact readout '+str(value),data);scene.collection.objects.link(obj)
    obj.data.materials.append(amber);world_texts[value]=obj

starts=[]
clock=0
for shot in shots:
    starts.append(clock);clock+=shot[1]
metadata=[]
for frame in range(1,scene.frame_end+1):
    time=(frame-1)/FPS
    shot_index=max(i for i,start in enumerate(starts) if time>=start-1e-6)
    record_id,length,speed,offset=shots[shot_index]
    physical_time=offset+(time-starts[shot_index])*speed
    record=records[record_id];row=sample(record,physical_time)
    player=row['players'][0]
    root.location=to_blender(player['p'])-Vector((0,0,.59))
    root.rotation_euler=(0,0,-player['phi'])
    flip.rotation_euler=(0,0,0)
    root.keyframe_insert(data_path='location',frame=frame)
    root.keyframe_insert(data_path='rotation_euler',frame=frame)
    for hinge in hinges:
        hinge.rotation_euler=(0,player['theta'],0)
        hinge.keyframe_insert(data_path='rotation_euler',frame=frame)
    bpy.context.view_layer.update()
    for paddle,cue in zip(paddles,contacts):
        low=min((paddle.matrix_world@v.co for v in paddle.data.vertices),key=lambda v:v.z)
        cue.location=(low.x,low.y,.012)
        cue.scale=(1,1,1) if low.z<.05 else (0,0,0)
        cue.keyframe_insert(data_path='location',frame=frame);cue.keyframe_insert(data_path='scale',frame=frame)
    has_opponent=len(row['players'])>1
    if has_opponent:
        other=row['players'][1]
        opponent.location=to_blender(other['p']);opponent.rotation_euler=(0,0,-other['phi'])
        opponent.keyframe_insert(data_path='location',frame=frame);opponent.keyframe_insert(data_path='rotation_euler',frame=frame)
        for obj,seg in zip(sword,other['segments']):
            a,b=sword_point(other,seg['localA']),sword_point(other,seg['localB'])
            obj.location=(a+b)/2;obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
            obj.keyframe_insert(data_path='location',frame=frame);obj.keyframe_insert(data_path='rotation_euler',frame=frame)
    for obj in opponent.children_recursive:
        if obj.type=='MESH':set_visible(obj,has_opponent,frame)
    for obj in sword:
        for child in obj.children_recursive:
            set_visible(child,has_opponent and row['players'][1]['weapon']=='sword',frame)
    center=to_blender(player['p'])
    if has_opponent:center=(center+to_blender(row['players'][1]['p']))/2
    center.z=2.5
    offset_camera=Vector((.25,-20,2.8)) if speed!=1 else Vector((5,-18,9))
    camera.location=center+offset_camera;camera.rotation_euler=(-offset_camera).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=20
    camera.keyframe_insert(data_path='location',frame=frame);camera.keyframe_insert(data_path='rotation_euler',frame=frame)
    hud.scale=(20,)*3
    for i,dot in enumerate(trail):
        past=physical_time-i*.09
        if past>=0:
            point=sample(record,past)['players'][0]['p'];dot.location=(point['x'],-point['z'],.018)
        dot.scale=(.028,.028,.012) if past>=0 else (0,0,0)
        dot.keyframe_insert(data_path='location',frame=frame);dot.keyframe_insert(data_path='scale',frame=frame)
    inp=row['inputs'][0]
    held=('W' if inp['theta']>0 else 'S' if inp['theta']<0 else '')+('D' if inp['phi']>0 else 'A' if inp['phi']<0 else '')
    for key,obj in key_highlights.items():set_visible(obj,key in held,frame)
    stamina_bar.scale.x=max(.001,player['stamina']/100);stamina_bar.keyframe_insert(data_path='scale',frame=frame)
    health= row['players'][1]['health'] if has_opponent else 100
    health_bar.scale.x=max(.001,health/100);health_bar.keyframe_insert(data_path='scale',frame=frame)
    for hp,obj in health_labels.items():set_visible(obj,has_opponent and hp==health,frame)
    nearby=[event for event in record['events'] if 0<=physical_time-event['time']<.45]
    event=nearby[-1] if nearby else None
    phase=('CLASH / ear and sword deflect; fighters recoil' if event and event['type']=='clash' else
           'HIT / actual game damage and contact response' if event else
           'REVERSE / opposite input brakes before changing direction' if record_id=='drive-release-reverse' and 1.75<=physical_time<2.15 else
           'GROUND SUPPORT / contact lifts and carries the body' if player['staffGrounded'] else
           'POWERED / input actively accelerates the solid ears' if held else
           'RELEASE / momentum continues under gravity and damping')
    for text,obj in phase_labels.items():set_visible(obj,text==phase,frame)
    for i,obj in enumerate(chapter_labels):set_visible(obj,i==shot_index,frame)
    if event:
        age=physical_time-event['time'];point=to_blender(event['point'])
        impact.location=point;impact.scale=(max(0,.16-age*.8),)*3
    else:impact.scale=(0,0,0)
    impact.keyframe_insert(data_path='location',frame=frame);impact.keyframe_insert(data_path='scale',frame=frame)
    for value,obj in world_texts.items():
        is_active=bool(event and value==(event.get('damage') if event['type']=='hit' else 'CLASH'))
        set_visible(obj,is_active,frame)
        if is_active:
            obj.location=to_blender(event['point'])+Vector((0,0,.3+(physical_time-event['time'])*.6))
            obj.rotation_euler=camera.rotation_euler
            obj.keyframe_insert(data_path='location',frame=frame);obj.keyframe_insert(data_path='rotation_euler',frame=frame)
    metadata.append({'frame':frame,'record':record_id,'physical_time':physical_time,'keys':held,
                     'player':player,'has_opponent':has_opponent})

for obj in bpy.data.objects:
    ancestor=obj.parent
    while ancestor:
        if ancestor==hud:obj.display.show_shadows=False;break
        ancestor=ancestor.parent
    if obj.type=='MESH':assert not obj.data.validate(),obj.name
scene['purpose']='Functional ear weapon prototype replay; current game control/combat code with experimental ear contact frame'
scene['production_integrated']=False
scene['body_orientation']='Upright as current game; aerial body pitch requires a separate extension'
model=[obj for obj in root.children_recursive if obj.type=='MESH']
other_geometry=[obj for obj in opponent.children_recursive if obj.type=='MESH']
other_geometry += [obj for control in sword for obj in control.children_recursive if obj.type=='MESH']
verification={'frames_checked':0,'minimum_visible_ear_height':1e9,'camera_min':[1,1],'camera_max':[0,0],
              'fixed_ear_length':True,'stable_anatomical_sockets':True,'matching_input_overlay':True,
              'source_physics_sha256':report['provenance']['sha256']}
if '--verify' in sys.argv:
    for row in metadata:
        scene.frame_set(row['frame']);bpy.context.view_layer.update()
        verification['frames_checked']+=1
        for obj in model+[obj for obj in other_geometry if not obj.hide_render]:
            for corner in obj.bound_box:
                point=world_to_camera_view(scene,camera,obj.matrix_world@Vector(corner))
                for i in (0,1):
                    verification['camera_min'][i]=min(verification['camera_min'][i],point[i])
                    verification['camera_max'][i]=max(verification['camera_max'][i],point[i])
        for hinge,paddle,socket in zip(hinges,paddles,reversed(row['player']['sockets'])):
            assert (hinge.matrix_world.translation-to_blender(socket)).length<1e-4
            assert abs((paddle.matrix_world@Vector((0,0,LENGTH))-hinge.matrix_world.translation).length-LENGTH)<1e-5
            verification['minimum_visible_ear_height']=min(verification['minimum_visible_ear_height'],min((paddle.matrix_world@v.co).z for v in paddle.data.vertices))
        for key,obj in key_highlights.items():assert (not obj.hide_render)==(key in row['keys'])
    (OUT/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
    print('FUNCTIONAL_VIDEO_CHECKS',json.dumps(verification))
    assert verification['camera_min'][0]>.025 and verification['camera_max'][0]<.94
    assert verification['camera_min'][1]>.14 and verification['camera_max'][1]<.88
scene.frame_set(1)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
(OUT/'render-record.json').write_text(json.dumps({'variant':VARIANT,'fps':FPS,'duration':DURATION,'frames':metadata},indent=2)+'\n')
if '--render' in sys.argv:bpy.ops.render.render(animation=True)
