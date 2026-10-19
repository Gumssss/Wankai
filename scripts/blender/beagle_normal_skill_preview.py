"""Replay compact normal controls on v05, then compare an authored rotor skill.

Generate replay data with scripts/preview/beagle-normal-skill-preview.mjs first.
No production asset, controller, or previous preview is overwritten.
"""
from pathlib import Path
import json, math, sys
import bpy
from mathutils import Matrix, Quaternion, Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/beagle-normal-skill';(OUT/'frames').mkdir(parents=True,exist_ok=True)
report=json.loads((OUT/'motion.json').read_text())
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
FPS=24;ASPECT=1280/720;BIND=-1.55
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/blender/beagle-smooth-ear-duelist-v05.blend'))
s=bpy.context.scene;rig=bpy.data.objects['ARM_BeagleSmoothDuelist'];rig.animation_data_clear()
for b in rig.pose.bones:
    b.rotation_mode='QUATERNION';b.rotation_quaternion=Quaternion();b.scale=(1,1,1)
meshes=[o for o in bpy.data.objects if o.type=='MESH' and o.parent==rig and not o.name.startswith('COL_')]
for mesh in meshes:
    deform={g.index for g in mesh.vertex_groups if g.name in rig.pose.bones}
    assert all(sum(g.group in deform and g.weight>1e-6 for g in v.groups)<=4 for v in mesh.data.vertices)
for o in list(bpy.data.objects):
    if o not in {rig,*meshes}:bpy.data.objects.remove(o,do_unlink=True)
s.render.engine='BLENDER_EEVEE'
for attr in ['taa_render_samples','taa_samples']:
    if hasattr(s.eevee,attr):setattr(s.eevee,attr,16)
s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=100;s.render.fps=FPS
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=15
s.render.film_transparent=False;s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('Normal and skill studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.74,.76,.8,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65

def material(name,hex_value,emission=False):
    rgb=tuple(int(hex_value[i:i+2],16)/255 for i in (0,2,4))
    if emission:rgb=tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
    m=bpy.data.materials.new(name);m.use_nodes=True;nodes=m.node_tree.nodes;nodes.clear()
    out=nodes.new('ShaderNodeOutputMaterial')
    shader=nodes.new('ShaderNodeEmission' if emission else 'ShaderNodeBsdfPrincipled')
    shader.inputs['Color' if emission else 'Base Color'].default_value=(*rgb,1)
    if not emission:shader.inputs['Roughness'].default_value=.85
    m.node_tree.links.new(shader.outputs[0],out.inputs['Surface']);return m

ink=material('Caption ink','262A27',True);muted=material('Secondary ink','62695F',True)
teal=material('Normal controls','2F7775',True);red=material('Skill controls','AA5137',True)
paper=material('Input paper','F6F2E8',True);floor_mat=material('Floor','E9E6DC')
grid_mat=material('Floor grid','C7C4BB');path_mat=material('Movement path','5D9290')
bpy.ops.mesh.primitive_plane_add(size=500,location=(0,0,-.025));bpy.context.object.data.materials.append(floor_mat)
lights=[]
for name,xyz,power,size in [('Key',(8,-8,12),1300,8),('Fill',(-4,7,10),1000,8),('Rim',(-8,-3,9),800,7)]:
    bpy.ops.object.light_add(type='AREA',location=xyz);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((0,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
    lights.append((o,Vector(xyz)))

def curve(name,points,mat,radius=.015):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.bevel_depth=radius;data.bevel_resolution=2
    spline=data.splines.new('POLY');spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.data.materials.append(mat);return o

for value in range(-60,61,2):
    curve('World floor grid',[(value,-60,.003),(value,60,.003)],grid_mat,.008)
    curve('World floor grid',[(-60,value,.003),(60,value,.003)],grid_mat,.008)

shots=[];frames=[]
def interpolate(record,time):
    rows=record['rows'];index=min(len(rows)-2,max(0,int(time*60)))
    while index<len(rows)-2 and rows[index+1]['time']<time:index+=1
    a,b=rows[index:index+2];u=max(0,min(1,(time-a['time'])/(b['time']-a['time'])))
    return {'theta':a['theta']+(b['theta']-a['theta'])*u,'yaw':-(a['phi']+(b['phi']-a['phi'])*u),
            'position':[a['p']['x']+(b['p']['x']-a['p']['x'])*u,-a['p']['z']-(b['p']['z']-a['p']['z'])*u,
                        a['p']['y']+(b['p']['y']-a['p']['y'])*u-report['bodyFloor']],
            'input':a['input'],'contact':a['contact'],'deploy':0,'lag':0}

for shot_id,record in enumerate(report['scenarios']):
    shot={k:record[k] for k in ['id','title','detail','duration']};shot['start']=len(frames)+1
    for i in range(round(record['duration']*FPS)):
        row=interpolate(record,i/FPS*record['playbackSpeed']);row.update(shot=shot_id,kind='normal');frames.append(row)
    shot['end']=len(frames);shots.append(shot)

shot_id=len(shots);start=len(frames)+1;yaw=0;omega=0;deploy=0;lag=0;lag_rate=0;dt=1/FPS
for i in range(5*FPS):
    t=i/FPS;active=.3<=t<3.7
    target=1 if active or abs(omega)>.6 else 0;deploy+=(target-deploy)*(1-math.exp(-4.5*dt))
    previous=omega
    if active:omega+=max(-6,min(6,(-4.25*deploy-omega)*8))*dt
    else:omega*=math.exp(-2*dt)
    yaw+=omega*dt;lag_target=-.028*omega-.006*(omega-previous)/dt
    lag_rate+=(55*(lag_target-lag)-12*lag_rate)*dt;lag+=lag_rate*dt
    frames.append({'shot':shot_id,'kind':'skill','theta':BIND+(-math.pi/2-BIND)*deploy,'yaw':yaw,
                   'position':[0,0,0],'deploy':deploy,'lag':lag,'input':'SKILL ACTIVE' if active else 'RELEASE','contact':False})
shots.append({'id':'skill','title':'Separate skill / full horizontal spin','detail':'Wide all-round sweep; hover remains a later skill',
              'duration':5,'start':start,'end':len(frames)})

paths=[]
for index,shot in enumerate(shots):
    if shot['id']=='skill':
        points=[(4.4*math.cos(i*math.tau/96),4.4*math.sin(i*math.tau/96),.015) for i in range(97)]
    else:
        points=[(*row['position'][:2],.015) for row in frames[shot['start']-1:shot['end']:2]]
    paths.append(curve('Body path' if shot['id']!='skill' else 'Skill sweep reference',points,path_mat,.018))

bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera;camera.data.type='ORTHO'
hud=bpy.data.objects.new('Camera captions',None);s.collection.objects.link(hud);hud.parent=camera;hud.location=(0,0,-5)
def caption(name,value,x,y,size,mat=ink):
    data=bpy.data.curves.new(name,'FONT');data.body=value;data.size=size;data.align_y='CENTER'
    o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.parent=hud;o.location=(x,y,0);data.materials.append(mat);return o
caption('Eyebrow','WANKAI / NORMAL CONTROLS + SKILL PROPOSAL',-.46,.259,.0115,muted)
title=caption('Chapter title','',-.46,.225,.022)
detail=caption('Chapter detail','',-.46,.195,.0125,muted)
status=caption('Contact status','',-.46,-.222,.0165,teal)
scope=caption('Scope','',-.46,-.251,.011,muted)
keys=caption('Held input','',.30,-.231,.018,teal)
chapter=caption('Chapter number','',.395,.259,.0115,muted)

deps=bpy.context.evaluated_depsgraph_get();bind=Matrix.Rotation(BIND,3,'Y')
validation={'frames':len(frames),'minimum_mesh_z':1e6,'maximum_socket_error':0,'maximum_floor_correction':0,
            'normal_max_ear_axis_difference_degrees':0,'body_pitch_degrees':0,'hover_skill_implemented':False,
            'screen_min':[1,1],'screen_max':[0,0]}
for shot in shots:
    offset=Vector((8,-14,9))
    q=(-offset).to_track_quat('-Z','Y');shot['rotation']=q;shot['offset']=offset
    shot['right']=q@Vector((1,0,0));shot['up']=q@Vector((0,1,0));shot['bounds']=[1e6,-1e6,1e6,-1e6]

for frame,row in enumerate(frames,1):
    s.frame_set(frame);rig.location=row['position'];rig.pose.bones['root'].rotation_quaternion=Quaternion((0,0,1),row['yaw'])
    for side in ['L','R']:
        opening=(1 if side=='L' else -1)*math.pi/2*row['deploy']
        desired=Matrix.Rotation(opening+row['lag']*row['deploy'],3,'Z')@Matrix.Rotation(row['theta'],3,'Y')
        rig.pose.bones[side+'_ear_swing'].rotation_quaternion=(desired@bind.inverted()).to_quaternion()
    bpy.context.view_layer.update()
    points=[]
    for mesh in meshes:
        obj=mesh.evaluated_get(deps);geometry=obj.to_mesh()
        points.extend(obj.matrix_world@geometry.vertices[i].co for i in range(0,len(geometry.vertices),11))
        obj.to_mesh_clear()
    floor_correction=max(0,-min(p.z for p in points));rig.location.z+=floor_correction
    for p in points:p.z+=floor_correction
    validation['maximum_floor_correction']=max(validation['maximum_floor_correction'],floor_correction)
    validation['minimum_mesh_z']=min(validation['minimum_mesh_z'],min(p.z for p in points))
    rig.keyframe_insert('location',frame=frame);rig.pose.bones['root'].keyframe_insert('rotation_quaternion',frame=frame)
    for side in ['L','R']:rig.pose.bones[side+'_ear_swing'].keyframe_insert('rotation_quaternion',frame=frame)
    bpy.context.view_layer.update()
    axes=[]
    for side in ['L','R']:
        b=rig.pose.bones[side+'_ear_swing'];base=rig.data.bones[side+'_ear_swing'].head_local
        expected=rig.matrix_world@(Matrix.Rotation(row['yaw'],3,'Z')@base)
        validation['maximum_socket_error']=max(validation['maximum_socket_error'],(rig.matrix_world@b.head-expected).length)
        axes.append((b.matrix.to_3x3()@bind@Vector((0,0,1))).normalized())
    if row['kind']=='normal':
        validation['normal_max_ear_axis_difference_degrees']=max(validation['normal_max_ear_axis_difference_degrees'],math.degrees(axes[0].angle(axes[1])))
    shot=shots[row['shot']];base=Vector((*rig.location[:2],0));bounds=[1e6,-1e6,1e6,-1e6]
    for p in points:
        relative=p-base;x=relative.dot(shot['right']);y=relative.dot(shot['up'])
        bounds=[min(bounds[0],x),max(bounds[1],x),min(bounds[2],y),max(bounds[3],y)]
    row['bounds']=bounds
    shot['bounds']=[min(shot['bounds'][0],bounds[0]),max(shot['bounds'][1],bounds[1]),min(shot['bounds'][2],bounds[2]),max(shot['bounds'][3],bounds[3])]

for shot in shots:
    x0,x1,y0,y1=shot['bounds'];shot['scale']=max((x1-x0)/.78,(y1-y0)*ASPECT/.62,11)
    shot['center']=[(x0+x1)/2,(y0+y1)/2]
shared_scale=max(shot['scale'] for shot in shots)
for shot in shots:shot['scale']=shared_scale
for frame,row in enumerate(frames,1):
    shot=shots[row['shot']];scale=shot['scale'];cx,cy=shot['center'];bounds=row['bounds']
    target=Vector((*row['position'][:2],0))+shot['right']*cx+shot['up']*cy
    camera.location=target+shot['offset'];camera.rotation_quaternion=shot['rotation'];camera.rotation_mode='QUATERNION'
    camera.keyframe_insert('location',frame=frame);camera.keyframe_insert('rotation_quaternion',frame=frame)
    camera.data.ortho_scale=scale;camera.data.keyframe_insert('ortho_scale',frame=frame)
    hud.scale=(scale,scale,1);hud.keyframe_insert('scale',frame=frame)
    for light,offset in lights:
        base=Vector((*row['position'][:2],0));light.location=base+offset
        light.rotation_euler=(base+Vector((0,0,2))-light.location).to_track_quat('-Z','Y').to_euler()
        light.keyframe_insert('location',frame=frame);light.keyframe_insert('rotation_euler',frame=frame)
    for axis,lo,hi,center,extent in [(0,bounds[0],bounds[1],cx,scale),(1,bounds[2],bounds[3],cy,scale/ASPECT)]:
        validation['screen_min'][axis]=min(validation['screen_min'][axis],.5+(lo-center)/extent)
        validation['screen_max'][axis]=max(validation['screen_max'][axis],.5+(hi-center)/extent)
s.frame_start=1;s.frame_end=len(frames)
assert validation['maximum_socket_error']<1e-4,validation
assert validation['maximum_floor_correction']<.12,validation
assert validation['normal_max_ear_axis_difference_degrees']<.1,validation
assert min(validation['screen_min'])>.1 and max(validation['screen_max'])<.9,validation

def labels(frame):
    row=frames[frame-1];shot=shots[row['shot']]
    title.data.body=shot['title'];detail.data.body=shot['detail'];keys.data.body=row['input'];chapter.data.body=f'{row["shot"]+1} / {len(shots)}'
    if row['kind']=='normal':
        status.data.body='GROUND PUSH / body moves with the ear contact' if row['contact'] else 'MOMENTUM / ears and body continue moving'
        scope.data.body='0.8x contact physics + proposed steering / same ear length / game unchanged'
        keys.data.materials[0]=teal
    else:
        status.data.body='FULL SPREAD / body and ears spin together'
        scope.data.body='Authored skill concept / grounded spin / no hover'
        keys.data.materials[0]=red
    for index,path in enumerate(paths):path.hide_render=index!=row['shot']

(OUT/'verification.json').write_text(json.dumps(validation,indent=2)+'\n')
(OUT/'chapters.json').write_text(json.dumps([{k:v for k,v in shot.items() if k in ['id','title','detail','start','end','duration','scale']} for shot in shots],indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'beagle-normal-skill-concept.blend'),compress=True)
print('NORMAL_SKILL_VERIFIED',json.dumps(validation),flush=True)
if '--posters' in args:
    for shot in shots:
        for part in [.35,.65]:
            frame=shot['start']+round((shot['end']-shot['start'])*part);s.frame_set(frame);labels(frame)
            s.render.filepath=str(OUT/f'poster-{frame:04d}.png');bpy.ops.render.render(write_still=True)
if '--render' in args:
    for frame in range(1,s.frame_end+1):
        s.frame_set(frame);labels(frame);s.render.filepath=str(OUT/f'frames/{frame:05d}.png');bpy.ops.render.render(write_still=True)
print('NORMAL_SKILL_DONE',flush=True)
