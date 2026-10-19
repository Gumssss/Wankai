"""Authored horizontal-ear spin concept on the approved smooth v05 beagle.

This is a motion proposal, not a gameplay simulation. It changes no game asset
or controller. Body yaw and both attached ears turn together; body pitch is zero.
"""
from pathlib import Path
import json, math, sys
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
VIEW='top' if 'top' in args else 'three'
FPS=24
DURATION=10 if VIEW=='top' else 14
OUT=ROOT/f'output/beagle-helicopter/{VIEW}'
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'frames').mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/blender/beagle-smooth-ear-duelist-v05.blend'))
s=bpy.context.scene
rig=bpy.data.objects['ARM_BeagleSmoothDuelist']
rig.animation_data_clear()
for bone in rig.pose.bones:
    bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion();bone.scale=(1,1,1)
meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig and not o.name.startswith('COL_')]
keep={rig,*meshes}
for obj in list(bpy.data.objects):
    if obj not in keep:bpy.data.objects.remove(obj,do_unlink=True)
s.render.engine='BLENDER_EEVEE'
for attribute in ['taa_render_samples','taa_samples']:
    if hasattr(s.eevee,attribute):setattr(s.eevee,attribute,16)
s.render.resolution_x=1080 if VIEW=='top' else 1280
s.render.resolution_y=1080 if VIEW=='top' else 720
s.render.resolution_percentage=100;s.render.fps=FPS
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
s.render.image_settings.compression=15
s.render.film_transparent=False;s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('Helicopter soft studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.74,.76,.80,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65

def mat(name,hex_color,emission=False):
    rgb=tuple(int(hex_color[i:i+2],16)/255 for i in (0,2,4))
    if emission:
        rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    nodes=m.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial')
    if emission:
        shader=nodes.new('ShaderNodeEmission');shader.inputs['Color'].default_value=(*rgb,1)
    else:
        shader=nodes.new('ShaderNodeBsdfPrincipled');shader.inputs['Base Color'].default_value=(*rgb,1)
        shader.inputs['Roughness'].default_value=.82
    m.node_tree.links.new(shader.outputs[0],out.inputs['Surface']);return m

ink=mat('Preview ink','353630',True);muted=mat('Preview secondary','7D8178',True)
cream=mat('Preview paper','F4F1E8',True);red=mat('D input','B05F46',True)
teal=mat('A input','467F82',True);line=mat('Rotor path','CDCABF')
floor_mat=mat('Studio floor','E9E6DC')
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));bpy.context.object.data.materials.append(floor_mat)
for name,position,power,size in [('Key',(5,-6,10),1100,7),('Fill',(-3,6,7),850,7),('Rim',(-6,-2,7),650,5)]:
    bpy.ops.object.light_add(type='AREA',location=position);o=bpy.context.object;o.name=name
    o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()

def curve(name,points,material,radius=.012,cyclic=False):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for item,p in zip(spline.points,points):item.co=(*p,1)
    spline.use_cyclic_u=cyclic;o=bpy.data.objects.new(name,data);s.collection.objects.link(o);data.materials.append(material);return o

# The ground circle gives an unambiguous horizontal plane and scale reference.
for index in range(48):
    a=index*math.tau/48;b=a+math.tau/48*.52
    curve('Rotor footprint',[(4.4*math.cos(t),4.4*math.sin(t),.008) for t in [a,b]],line,.012)
curve('Facing reference',[(0,0,.009),(1.15,0,.009)],line,.018)

bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=13.4
target=Vector((0,0,1.6))
camera.location=target+Vector((0,0,16) if VIEW=='top' else (9,-12,9))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
half_w=camera.data.ortho_scale/2
half_h=half_w*s.render.resolution_y/s.render.resolution_x

def text(name,value,x,y,size,material=ink):
    data=bpy.data.curves.new(name,'FONT');data.body=value;data.size=size;data.align_y='CENTER'
    data.space_character=1.08;o=bpy.data.objects.new(name,data);s.collection.objects.link(o)
    o.parent=camera;o.location=(x,y,-8);data.materials.append(material);return o

def panel(name,x,y,w,h,material):
    bpy.ops.mesh.primitive_plane_add(size=1);o=bpy.context.object;o.name=name;o.parent=camera
    o.location=(x,y,-8.03);o.scale=(w,h,1);o.data.materials.append(material);return o

text('Eyebrow','WANKAI / MOTION CONCEPT',-half_w+.45,half_h-.35,.16,muted)
text('Title','Horizontal ears. Whole-body spin.',-half_w+.45,half_h-.72,.28 if VIEW=='three' else .25)
text('Subtitle','Body stays upright - ears spread flat to opposite sides',-half_w+.45,half_h-1.02,.16,muted)
state=text('State','READY',-half_w+.50,-half_h+.68,.23)
detail=text('Detail','',-half_w+.50,-half_h+.36,.15,muted)
panel('Input panel',half_w-1.15,-half_h+.60,1.5,.72,cream)
key=text('Input','RELEASE',half_w-1.75,-half_h+.63,.20)
speed=text('Speed','0.00 turns/s',half_w-1.75,-half_h+.34,.14,muted)
text('Scope','Authored preview - not yet gameplay',half_w-3.4,half_h-.35,.14,muted)

bind=Matrix.Rotation(-1.55,3,'Y')

def command(t):
    if VIEW=='three':
        if .75<=t<5:return -1,'D'
        if 7<=t<11.3:return 1,'A'
    else:
        if .6<=t<3.6:return -1,'D'
        if 5<=t<8.2:return 1,'A'
    return 0,'RELEASE'

dt=1/240;angle=0;omega=0;deploy=0;lag=0;lag_rate=0;rows=[]
for tick in range(round(DURATION/dt)):
    t=tick*dt;direction,key_name=command(t)
    deployment_target=1 if direction or abs(omega)>.55 else 0
    deploy+=(deployment_target-deploy)*(1-math.exp(-4.5*dt))
    previous=omega
    if direction:
        desired_speed=direction*4.25*deploy
        acceleration=max(-6.0,min(6.0,(desired_speed-omega)*8))
        omega+=acceleration*dt
    else:omega*=math.exp(-1.75*dt)
    angle+=omega*dt
    lag_target=-.028*omega-.006*(omega-previous)/dt
    lag_rate+=(55*(lag_target-lag)-12*lag_rate)*dt;lag+=lag_rate*dt
    if tick%10==0:
        rows.append({'time':t,'yaw':angle,'omega':omega,'deploy':deploy,'lag':lag,'input':key_name,
                     'height':0})

for index,row in enumerate(rows,1):
    rig.pose.bones['root'].rotation_quaternion=Quaternion((0,0,1),row['yaw'])
    rig.pose.bones['root'].keyframe_insert('rotation_quaternion',frame=index)
    rig.location.z=row['height'];rig.keyframe_insert('location',frame=index)
    for side in ['L','R']:
        # Open along the horizontal plane instead of a quaternion shortcut
        # that could arc the long ears vertically over the head.
        opening=(1 if side=='L' else -1)*math.pi/2*row['deploy']
        pitch=-1.55+(-math.pi/2+1.55)*row['deploy']
        desired=Matrix.Rotation(opening+row['lag']*row['deploy'],3,'Z')@Matrix.Rotation(pitch,3,'Y')
        q=(desired@bind.inverted()).to_quaternion()
        rig.pose.bones[side+'_ear_swing'].rotation_quaternion=q
        rig.pose.bones[side+'_ear_swing'].keyframe_insert('rotation_quaternion',frame=index)
    blink_phase=(row['time']+2)%4.5
    blink=math.sin(math.pi*blink_phase/.16)**2 if blink_phase<.16 else 0
    for side in ['L','R']:
        rig.pose.bones[side+'_lid'].scale.z=1-.965*blink
        rig.pose.bones[side+'_lid'].keyframe_insert('scale',frame=index)

s.frame_start=1;s.frame_end=len(rows)
def labels(frame):
    row=rows[min(len(rows)-1,max(0,frame-1))]
    if row['input']=='D':
        label='D HELD - SPIN RIGHT';description='Body and ears turn together, clockwise from above';color=red
    elif row['input']=='A':
        label='A HELD - BRAKE, THEN SPIN LEFT';description='Same flat ear pose; the whole character reverses';color=teal
    elif abs(row['omega'])>.4:
        label='RELEASE - COAST DOWN';description='No instant stop; ears remain spread while spinning';color=ink
    else:
        label='READY - UPRIGHT STANCE';description='Horizontal ear deployment responds to A / D';color=ink
    if row['deploy']<.92 and row['input']!='RELEASE':label=row['input']+' HELD - SPREAD EARS FLAT'
    state.data.body=label;detail.data.body=description;key.data.body=row['input']
    key.data.materials[0]=color;speed.data.body=f'{abs(row["omega"])/math.tau:.2f} turns/s'

validation={'frames':len(rows),'view':VIEW,'hover':False,'body_pitch_degrees':0,
            'horizontal_axis_max_deviation':0,'minimum_mesh_z':float('inf'),'maximum_socket_error':0,
            'minimum_screen_x':1,'maximum_screen_x':0,'minimum_screen_y':1,'maximum_screen_y':0}
deps=bpy.context.evaluated_depsgraph_get()
projection=camera.calc_matrix_camera(deps,x=s.render.resolution_x,y=s.render.resolution_y)@camera.matrix_world.inverted()
for index,row in enumerate(rows,1):
    s.frame_set(index);bpy.context.view_layer.update()
    yaw=Matrix.Rotation(row['yaw'],3,'Z')
    for side in ['L','R']:
        bone=rig.pose.bones[side+'_ear_swing'];base=rig.data.bones[side+'_ear_swing'].head_local
        expected=rig.matrix_world@(yaw@base)
        actual=rig.matrix_world@bone.head
        validation['maximum_socket_error']=max(validation['maximum_socket_error'],(actual-expected).length)
        axis=(bone.matrix.to_3x3()@bind@Vector((0,0,1))).normalized()
        if row['deploy']>.995:
            validation['horizontal_axis_max_deviation']=max(validation['horizontal_axis_max_deviation'],math.degrees(math.asin(min(1,abs(axis.z)))))
    # Sample actual posed vertices: object AABB corners invent empty geometry
    # around a long diagonal ear and overestimate its projected height.
    for mesh in meshes:
        evaluated=mesh.evaluated_get(deps)
        geometry=evaluated.to_mesh()
        for vertex_index in range(0,len(geometry.vertices),17):
            point=evaluated.matrix_world@geometry.vertices[vertex_index].co
            clip=projection@point.to_4d();screen=Vector(((clip.x/clip.w+1)/2,(clip.y/clip.w+1)/2,0))
            validation['minimum_mesh_z']=min(validation['minimum_mesh_z'],point.z)
            for axis in ['x','y']:
                validation['minimum_screen_'+axis]=min(validation['minimum_screen_'+axis],getattr(screen,axis))
                validation['maximum_screen_'+axis]=max(validation['maximum_screen_'+axis],getattr(screen,axis))
        evaluated.to_mesh_clear()
    assert rig.pose.bones['body_pitch'].rotation_quaternion.angle<1e-6
assert validation['maximum_socket_error']<1e-4,validation
assert validation['horizontal_axis_max_deviation']<1,validation
assert validation['minimum_mesh_z']>-.015,validation
assert validation['minimum_screen_x']>.02 and validation['maximum_screen_x']<.98,validation
assert validation['minimum_screen_y']>.13 and validation['maximum_screen_y']<.84,validation
(OUT/'motion.json').write_text(json.dumps({'scope':'Authored motion concept; no gameplay controller changes',
 'body_and_ears_spin_together':True,'independent_body_pitch':False,'rows':rows,'verification':validation},indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'beagle-helicopter-concept.blend'),compress=True)
print('HELICOPTER_VERIFIED',json.dumps(validation),flush=True)

if '--posters' in args:
    for index in [1,49,85,133,181,241,301]:
        if index>s.frame_end:continue
        s.frame_set(index);labels(index);s.render.filepath=str(OUT/f'poster-{index:03d}.png');bpy.ops.render.render(write_still=True)
if '--render' in args:
    for index in range(1,s.frame_end+1):
        s.frame_set(index);labels(index);s.render.filepath=str(OUT/f'frames/{index:05d}.png');bpy.ops.render.render(write_still=True)
print('HELICOPTER_DONE',VIEW,flush=True)
