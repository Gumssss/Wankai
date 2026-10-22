import bpy,json,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/concepts/yellow-blob/motion-v02';OUT.mkdir(parents=True,exist_ok=True)
data=json.loads((OUT/'replay.json').read_text());rows=data['frames']
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;return m
def sphere(name,scale,m,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(m);o.parent=parent;return o
def point(p):return Vector((p['x'],-p['z'],p['y']))
def asset(path):
 before=set(s.objects);bpy.ops.import_scene.gltf(filepath=str(path));return [o for o in s.objects if o not in before and o.parent is None]
root=bpy.data.objects.new('Player pivot',None);s.collection.objects.link(root)
art=bpy.data.objects.new('Face forward alignment +X',None);s.collection.objects.link(art);art.parent=root;art.rotation_euler.z=math.pi/2
for o in asset(ROOT/'assets/source/yellow-blob/prepared-v03/yellow-blob-static-v03.glb'):
 print('IMPORTED_CHARACTER_ROTATION',o.name,o.rotation_mode,list(o.rotation_quaternion))
 o.parent=art;o.scale*=1.7;o.location.z=-.59
staff=asset(ROOT/'assets/source/yellow-staff/v01/yellow-staff-v01.glb')[0]
bpy.ops.object.select_all(action='DESELECT');staff.select_set(True);bpy.context.view_layer.objects.active=staff;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
target=bpy.data.objects.new('Opponent',None);s.collection.objects.link(target)
red=mat('Opponent red',(.4,.12,.08));skin=mat('Opponent head',(.8,.6,.35));gray=mat('Opponent weapon proxy',(.25,.28,.32));teal=mat('Contact',(.02,.55,.40))
torso=sphere('Opponent torso',(.38,.38,.55),red,target);head=sphere('Opponent head',(.37,.37,.4),skin,target);head.location.z=.76
bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.09,depth=1.45);blade=bpy.context.object;blade.data.materials.append(gray)
bpy.ops.mesh.primitive_plane_add(size=100);floor=bpy.context.object;floor.data.materials.append(mat('Floor',(.55,.58,.55)))
gridmat=mat('Grid',(.32,.37,.34))
for axis in [0,1]:
 for i in range(-25,26):
  bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.location=(i if axis==0 else 0,i if axis==1 else 0,.002);o.scale=(.008 if axis==0 else 50,.008 if axis==1 else 50,.002);o.data.materials.append(gridmat)
bpy.ops.mesh.primitive_torus_add(major_radius=.22,minor_radius=.025,major_segments=24,minor_segments=6);cue=bpy.context.object;cue.data.materials.append(teal)
direction=bpy.data.objects.new('Face direction cue',None);s.collection.objects.link(direction)
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.025,depth=.65);o=bpy.context.object;o.parent=direction;o.location=(.65,0,0);o.rotation_euler.y=math.pi/2;o.data.materials.append(teal)
bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=.09,radius2=0,depth=.22);o=bpy.context.object;o.parent=direction;o.location=(1.04,0,0);o.rotation_euler.y=math.pi/2;o.data.materials.append(teal)
trace=[sphere('Travel trace',(.035,.035,.015),teal) for _ in range(18)]
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=12
s.world=bpy.data.worlds.new('World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.67,.68,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
for pos,energy in [((2,-5,8),350),((-4,1,6),250)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=energy;l.data.shape='DISK';l.data.size=8
white=mat('HUD',(.04,.06,.05));active=mat('Held key',(.01,.5,.3));inactive=mat('Released key',(.25,.27,.25))
for m in [white,active,inactive]:
 n=m.node_tree.nodes;n.clear();out=n.new('ShaderNodeOutputMaterial');e=n.new('ShaderNodeEmission');e.inputs[0].default_value=m.diffuse_color;m.node_tree.links.new(e.outputs[0],out.inputs['Surface'])
def text(name,xy,size=.17):
 c=bpy.data.curves.new(name,'FONT');c.size=size;o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.parent=cam;o.location=(*xy,-5);o.data.materials.append(white);return o
title=text('Chapter',(-5.65,2.95),.22);detail=text('Evidence',(-5.65,2.62),.15);status=text('Status',(-5.65,-3.10),.18)
keys={k:text(k,(x,y),.25) for k,x,y in [('W',-5.1,2.15),('A',-5.6,1.7),('S',-5.1,1.7),('D',-4.6,1.7)]}
for k,o in keys.items():o.data.body=k
stats=text('Stats',(3.1,2.25),.17);eventLabel=text('Impact',(-.5,1.9),.25)
s.render.engine='CYCLES';s.render.use_persistent_data=True;s.cycles.samples=3;s.cycles.use_denoising=True;s.render.resolution_x=960;s.render.resolution_y=540;s.render.resolution_percentage=100;s.render.fps=data['fps'];s.view_settings.view_transform='AgX'
s.render.image_settings.file_format='FFMPEG';s.render.ffmpeg.format='MPEG4';s.render.ffmpeg.codec='H264';s.render.ffmpeg.constant_rate_factor='MEDIUM';s.render.filepath=str(OUT/'yellow-staff-motion-v02.mp4');s.frame_start=1;s.frame_end=len(rows)
def update(scene,*args):
 i=max(0,min(len(rows)-1,scene.frame_current-1));r=rows[i];a=r['players'][0];root.location=point(a['p']);root.rotation_euler.z=-a['phi']
 direction.location=(a['p']['x'],-a['p']['z'],.045);direction.rotation_euler.z=-a['phi']
 staff.location=point(a['base']);staff.rotation_mode='QUATERNION';staff.rotation_quaternion=(point(a['tip'])-point(a['base'])).to_track_quat('Z','Y')
 has=len(r['players'])>1
 for o in [torso,head,blade]:o.hide_render=not has
 center=point(a['p'])
 if has:
  b=r['players'][1];target.location=point(b['p']);target.rotation_euler.z=-b['phi'];blade.location=(point(b['base'])+point(b['tip']))/2;blade.rotation_mode='QUATERNION';blade.rotation_quaternion=(point(b['tip'])-point(b['base'])).to_track_quat('Z','Y');center=(center+target.location)/2
 center.z=2.0;offset=Vector((3,-12,5)) if r['speed']==1 else Vector((1,-14,3));cam.location=center+offset;cam.rotation_euler=(-offset).to_track_quat('-Z','Y').to_euler()
 held=[]
 if ainput:=r['input']:
  if ainput['theta']:held.append('W' if ainput['theta']>0 else 'S')
  if ainput['phi']:held.append('D' if ainput['phi']>0 else 'A')
 if r['scenario']=='Opposite keys cancel':held=['W','A','S','D']
 for k,o in keys.items():o.data.materials[0]=active if k in held else inactive
 title.data.body=r['scenario']+' | '+('1x NORMAL' if r['speed']==1 else '0.25x SAME EVENT')
 detail.data.body='V02 SOLVER PREVIEW | green arrow = face forward | W/S swing front-to-back'
 stats.data.body=f"STAMINA {a['stamina']:.0f}/200\nBASE HEIGHT {a['p']['y']-.59:.2f}\n"+(f"OPPONENT HP {r['players'][1]['health']:.0f}" if has else '')
 status.data.body=('HELD: '+'+'.join(held) if held else 'RELEASE / COAST')+(' | FLOOR SUPPORT' if a['contact'] else '')
 e=r['event'];eventLabel.data.body=('HIT '+str(e.get('damage','')) if e and e['type']=='hit' else 'CLASH / RECOIL' if e and e['type']=='clash' else '')
 cue.hide_render=not a['contact'];low=min([a['base'],a['tip']],key=lambda p:p['y']);cue.location=(low['x'],-low['z'],.03)
 for j,o in enumerate(trace):
  prev=rows[max(0,i-j*2)];o.hide_render=prev['scenario']!=r['scenario']
  p=prev['players'][0]['p'];o.location=(p['x'],-p['z'],.025)
bpy.app.handlers.frame_change_pre.append(update)
if '--eevee' in sys.argv:
 s.render.engine='BLENDER_EEVEE_NEXT';s.eevee.taa_render_samples=8
if '--benchmark' in sys.argv:s.frame_end=10;s.render.filepath='/tmp/yellow-benchmark.mp4'
if '--poster' in sys.argv:
 s.frame_set(15);s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'poster.png');bpy.ops.render.render(write_still=True)
else:
 bpy.ops.render.render(animation=True)
