"""Blender 4.5: skin the approved mesh; no geometry, UV or texture redesign.
Run with Blender --background --python tools/rig-cr7.py. Metres, +X forward.
The FK leg clips contain no root motion; gameplay owns the body transform.
"""
import bpy, math, pathlib, json, struct
from mathutils import Vector, Quaternion

ROOT = pathlib.Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/characters/cr7.glb'))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
assert len(mesh.data.polygons) == 18978
# Imported glTF Y-up becomes Blender Z-up; its lateral Z becomes -Y.
arm = bpy.data.armatures.new('CR7_legs')
rig = bpy.data.objects.new('ARM_CR7', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name); b.head=head; b.tail=tail
    if parent: b.parent=arm.edit_bones[parent]
    b.align_roll(Vector((0,1,0)))
    return b
bone('root',(.20,0,.52),(.20,0,.80))
for side,sign in [('L',1),('R',-1)]:
    bone(side+'_leg_upper',(.20,sign*.17,.49),(.19,sign*.30,.29),'root')
    bone(side+'_leg_lower',(.19,sign*.30,.29),(.17,sign*.43,.10),side+'_leg_upper')
    bone(side+'_foot',(.17,sign*.43,.10),(.32,sign*.44,.05),side+'_leg_lower')
bpy.ops.object.mode_set(mode='OBJECT')
groups={b.name:mesh.vertex_groups.new(name=b.name) for b in arm.bones}
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)
for v in mesh.data.vertices:
    x,y,h=v.co; side='L' if y>=0 else 'R'
    # Deliberate smooth joint weights, at most four normalized influences.
    leg=1-smooth(.40,.56,h)
    shin=1-smooth(.23,.35,h); foot=1-smooth(.10,.19,h)
    weights={'root':1-leg,side+'_leg_upper':leg*(1-shin),side+'_leg_lower':leg*shin*(1-foot),side+'_foot':leg*shin*foot}
    for name,w in weights.items():
        if w>1e-7: groups[name].add([v.index],w,'REPLACE')
mod=mesh.modifiers.new('CR7 skin','ARMATURE'); mod.object=rig
mesh.parent=rig
for b in rig.pose.bones: b.rotation_mode='QUATERNION'
def pose(side,upper,lower):
    # Global lateral rotations expressed in each bone's local rest frame.
    for suffix,angle in [('leg_upper',upper),('leg_lower',lower),('foot',-upper-lower)]:
        b=rig.pose.bones[side+'_'+suffix]; rest=b.bone.matrix_local.to_quaternion()
        b.rotation_quaternion=rest.inverted() @ Quaternion((0,1,0),angle) @ rest
def keys(frame):
    for b in rig.pose.bones:
        if b.name!='root': b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
scene=bpy.context.scene; scene.render.fps=60
rig.animation_data_create()
for name,duration in [('CR7_Kick',.6),('CR7_Step',.6)]:
    action=bpy.data.actions.new(name); rig.animation_data.action=action
    for frame in range(37):
        t=frame/60
        if name=='CR7_Kick':
            # Back-swing, extension exactly at the .4 s release, then settle.
            points=[(0,0,0),(.18,.35,.25),(.28,.30,.42),(.4,-.92,.12),(.46,-.68,.1),(.6,0,0)]
            a,b=next((a,b) for a,b in zip(points,points[1:]) if a[0]<=t<=b[0])
            u=smooth(a[0],b[0],t); upper=a[1]+(b[1]-a[1])*u; lower=a[2]+(b[2]-a[2])*u
            pose('R',upper,lower); pose('L',0,0)
        else:
            for side,phase in [('L',0),('R',math.pi)]:
                s=math.sin(t/.6*2*math.pi+phase)
                pose(side,s*.38,max(0,-s)*.32)
        keys(frame)
    track=rig.animation_data.nla_tracks.new(); track.name=name
    strip=track.strips.new(name,0,action); strip.extrapolation='NOTHING'
rig.animation_data.action=None
for track in rig.animation_data.nla_tracks: track.mute=True
for b in rig.pose.bones: b.rotation_quaternion=Quaternion()
scene.frame_set(0)
mesh.data.update(); bpy.context.view_layer.update()
# Preserve all source materials/textures in an editable production file.
out=ROOT/'assets/source/cr7-rig-v01'; out.mkdir(parents=True,exist_ok=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cr7-rig.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/characters/cr7-rig-v01.glb'),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_yup=True,export_skins=True,export_all_influences=False)
print('CR7_RIG',len(arm.bones),'bones;',len(mesh.data.polygons),'triangles; no root tracks')

# Blender emits constant location/scale/root channels too. Remove them so
# the runtime animation cannot compete for the physics-owned root transform.
path=ROOT/'public/models/characters/cr7-rig-v01.glb'
data=path.read_bytes(); size=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+size]); binary=data[20+size:]
for animation in doc['animations']:
    animation['channels']=[c for c in animation['channels'] if c['target']['path']=='rotation' and doc['nodes'][c['target']['node']].get('name')!='root']
payload=json.dumps(doc,separators=(',',':')).encode(); payload+=b' ' *((-len(payload))%4)
path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(binary))+struct.pack('<II',len(payload),0x4e4f534a)+payload+binary)
