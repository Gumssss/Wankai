"""Seated detached-paw primitive study, replaying the isolated game solver.
Reuses the v01 primitive builder, never modifies the production beagle or cat base.
"""
from pathlib import Path
import sys,json,math
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
# Reuse only constructors, not the v01 scene/motion/save/render stages.
builder=(ROOT/'scripts/blender/orange_tabby_motion_v01.py').read_text().split("catA=cat('A compact cat');catB=cat('B taller cat',.35)")[0]
exec(compile(builder,'orange_tabby_v01_primitive_constructors','exec'),globals())
OUT=ROOT/'output/orange-tabby-v03';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'assets/concepts/orange-tabby/motion-v03'
replay=json.loads((DATA/'game-solver-replay.json').read_text());FPS=24
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
g=replay['geometry'];bodyFloor=g['bodyFloor']
hero=cat('Seated floating-paw cat',0)
hands=[]
for arm in hero['arms']:
 paw=arm['paw'];paw.name='Detached giant paw '+str(arm['side']);paw.scale=g['pawScale'];hands.append({'side':arm['side'],'paw':paw})
 for key in ['upper','elbow','fore','wrist']:bpy.data.objects.remove(arm[key],do_unlink=True)
for ob in list(hero['root'].children):
 if ' shoulder' in ob.name or ob.name.startswith('Seated floating-paw cat ear') or 'curved tail' in ob.name or 'tail ring' in ob.name:bpy.data.objects.remove(ob,do_unlink=True)
for side in [-1,1]:
 verts=[(.20,side*.24,1.83),(.20,side*.66,1.83),(.20,side*.55,2.36),(-.12,side*.24,1.83),(-.12,side*.66,1.83),(-.12,side*.55,2.36)]
 mesh=bpy.data.meshes.new('Seated triangular ear');mesh.from_pydata(verts,[],[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)])
 ob=bpy.data.objects.new('Seated triangular ear',mesh);s.collection.objects.link(ob);ob.parent=hero['root'];mesh.materials.append(orange)
 mesh=bpy.data.meshes.new('Inner ear triangle');mesh.from_pydata([(.218,side*.33,1.92),(.218,side*.59,1.92),(.218,side*.54,2.24)],[],[(0,1,2)])
 ob=bpy.data.objects.new('Inner ear triangle',mesh);s.collection.objects.link(ob);ob.parent=hero['root'];mesh.materials.append(pink)
line('Seated curled tail',[(-.55,.12,.28),(-.92,.20,.16),(-1.00,.52,.13),(-.73,.75,.12),(-.28,.80,.12),(.10,.72,.12)],orange,.12,hero['root'])
for p in [(-.94,.29,.15),(-.88,.62,.13),(-.48,.79,.12)]:uv('Curled tail stripe',p,(.06,.126,.125),dark,hero['root'])
def pose(p,theta,phi):
 hero['root'].location=p;hero['root'].rotation_euler=(0,0,-phi)
 for hand in hands:
  ob=hand['paw'];ob.location=(.04+g['radialWristReach']*math.sin(theta),hand['side']*g['pawHalfSpacing'],g['virtualPivotHeight']+g['radialWristReach']*math.cos(theta))
  ob.rotation_euler=(0,theta-math.pi/2,0)

bpy.ops.mesh.primitive_plane_add(size=100,location=(0,0,-.04));bpy.context.object.data.materials.append(paper)
for x in range(-30,31):
 line('One-unit world grid',[(x,-30,-.03),(x,30,-.03)],gridmat,.008)
 line('One-unit world grid',[(-30,x,-.03),(30,x,-.03)],gridmat,.008)
target=empty('Solver opponent body')
uv('Opponent torso',(0,0,.60),(.38,.38,.40),targetmat,target)
uv('Opponent head',(0,0,1.35),(.38,.38,.38),targetmat,target)
blade=empty('Solver sword',target)
blade.location=(0,0,bodyFloor)
bpy.ops.mesh.primitive_cube_add();o=bpy.context.object;o.name='Sword blade';o.parent=blade;o.location=(0,0,2.08);o.scale=(.075,.035,.58);o.data.materials.append(metal)
rod('Sword guard',(-.27,0,1.64),(.27,0,1.64),.05,ink,blade)
rod('Sword hilt',(0,0,1.27),(0,0,1.62),.07,dark,blade)
marker=uv('Actual solver event point',(0,0,0),(.13,.13,.13),red)
bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=10
def camera_at(center,offset=(8,-12,6.0)):
 camera.location=Vector(center)+Vector(offset);camera.rotation_euler=(Vector(center)-camera.location).to_track_quat('-Z','Y').to_euler()
def visible(root,value):
 root.hide_render=not value
 for child in root.children_recursive:child.hide_render=not value
def mix(a,b,u):return a+(b-a)*u
def sample(shot,t):
 rows=shot['rows'];ix=min(len(rows)-2,int(t*60));a,b=rows[ix:ix+2];u=max(0,min(1,(t-a['time'])/(b['time']-a['time'])))
 result={'players':[],'input':a['input'],'events':a['events']}
 for x,y in zip(a['players'],b['players']):
  p={**x};p['p']={k:mix(x['p'][k],y['p'][k],u) for k in ['x','y','z']}
  p['theta']=mix(x['theta'],y['theta'],u)
  p['phi']=x['phi']+math.atan2(math.sin(y['phi']-x['phi']),math.cos(y['phi']-x['phi']))*u
  result['players'].append(p)
 return result
def point(p):return Vector((p['x'],-p['z'],p['y']-bodyFloor))
shots=[];frames=[]
for record in replay['shots']:
 shot={k:record[k] for k in ['id','group','title','detail','duration']};shot['start']=len(frames)+1
 for f in range(round(record['duration']*FPS)):frames.append({'shot':len(shots),'time':f/FPS,'row':sample(record,f/FPS)})
 shot['end']=len(frames);shots.append(shot)
shot={'id':'seated-floating-paws','group':'design','title':'Seated cat / enormous detached paws','detail':'Almost 2x previous hand width; sitting body; no arms or connectors','duration':4,'start':len(frames)+1}
for f in range(4*FPS):
 t=f/FPS;frames.append({'shot':len(shots),'time':t,'row':{'input':'REST POSE','players':[{'p':{'x':0,'z':0,'y':bodyFloor},'theta':1.45,'phi':t*math.tau/4,'contact':False,'stamina':200}],'events':[]}})
shot['end']=len(frames);shots.append(shot)
for shot in shots:shot['bounds']=[1e6,-1e6,1e6,-1e6]

validation={'connector_mesh_count':sum(ob.type=='MESH' and any(part in ob.name for part in [' upper limb',' forearm',' shoulder',' wrist']) for ob in hero['root'].children_recursive),
 'minimum_lateral_hand_body_gap':g['pawHalfSpacing']-(.16+.073)*g['pawScale'][1]-.72,'palm_to_head_lateral_gap':g['pawHalfSpacing']-.22*g['pawScale'][1]-.60,'palm_width':.44*g['pawScale'][1],
 'previous_palm_width':.44*2.3,'hand_scale':g['pawScale'],'body_posture':'seated',
 'note':'Paws are deliberately detached. Invisible solver constraints couple their contacts to the seated body. Final mesh fit is unperformed.'}
def setframe(f,bake=False):
 row=frames[f-1];shot=shots[row['shot']];r=row['row'];p=r['players'][0];loc=point(p['p'])
 pose(loc,p['theta'],p['phi']);visible(target,len(r['players'])>1);visible(blade,len(r['players'])>1 and r['players'][1]['weapon']=='sword')
 marker.hide_render=True
 if len(r['players'])>1:
  other=r['players'][1];target.location=point(other['p']);target.rotation_euler=(0,0,-other['phi'])
  blade.rotation_euler=(0,other['theta'],0)
  camera_at((loc+target.location)/2+Vector((0,0,1.0)))
 else:camera_at(loc+Vector((0,0,1.0)))
 shotdef=next((x for x in replay['shots'] if x['id']==shot['id']),None)
 latest=next((e for e in reversed(shotdef['events']) if 0<=row['time']-e['time']<.16),None) if shotdef else None
 if latest:
  marker.hide_render=False;ep=latest['point'];marker.location=(ep['x'],-ep['z'],ep['y']-bodyFloor)
 status='PAW SUPPORT / body keeps its seated pose' if p['contact'] else 'SEATED BODY / momentum, gravity and passive base support'
 if shot['group']=='combat':status='HIT / damage '+str(latest['damage']) if latest and latest['type']=='hit' else 'CLASH / deflection + backward recoil' if latest and latest['type']=='clash' else 'PREPARE / CONTACT / RECOVERY'
 if shot['group']=='design':status='SITTING BODY + DETACHED HANDS / no arms or connectors'
 if bake:
  for ob in [hero['root'],target,blade,marker]+[hand['paw'] for hand in hands]:
   ob.keyframe_insert('location',frame=f);ob.keyframe_insert('scale',frame=f)
   ob.keyframe_insert('rotation_quaternion' if ob.rotation_mode=='QUATERNION' else 'rotation_euler',frame=f)
 return {'frame':f,'shot_id':shot['id'],'group':shot['group'],'title':shot['title'],'detail':shot['detail'],
  'input':r['input'],'local_time':row['time'],'status':status,
  'metric':f"body rise {loc.z:.2f} u  /  ordinary stamina {p['stamina']:.0f}  /  body pitch 0 deg" if shot['group']!='design' else '1.98-unit palm width / larger than the head / same orange-tabby identity',
  'evidence':'AUTHORED DESIGN TURNTABLE / not gameplay' if shot['group']=='design' else 'CURRENT GAME SOLVER + PROXY ADAPTER / 1x / not actual game footage',
  'chapter':f"{row['shot']+1:02} / {len(shots):02}"}

captions=[]
for f in range(1,len(frames)+1):
 s.frame_set(f);captions.append(setframe(f));bpy.context.view_layer.update();shot=shots[frames[f-1]['shot']]
 inv=camera.matrix_world.inverted();bounds=shot['bounds']
 for root in [hero['root'],target]:
  if root.hide_render:continue
  for ob in root.children_recursive:
   if ob.type not in ['MESH','CURVE'] or ob.hide_render:continue
   for corner in ob.bound_box:
    p=inv@(ob.matrix_world@Vector(corner));bounds[0]=min(bounds[0],p.x);bounds[1]=max(bounds[1],p.x);bounds[2]=min(bounds[2],p.y);bounds[3]=max(bounds[3],p.y)
for shot in shots:
 x0,x1,y0,y1=shot['bounds'];shot['scale']=max((x1-x0)/.90,(y1-y0)*1280/720/.53);shot['center']=[(x0+x1)/2,(y0+y1)/2]
for group in ['controls','combat','design']:
 scale=max(x['scale'] for x in shots if x['group']==group)
 for shot in shots:
  if shot['group']==group:shot['scale']=scale
def fit(f):
 shot=shots[frames[f-1]['shot']];cx,cy=shot['center'];scale=shot['scale']
 camera.location+=camera.rotation_euler.to_matrix()@Vector((cx,cy-.012*scale/(1280/720),0));camera.data.ortho_scale=scale
for f in range(1,len(frames)+1):
 s.frame_set(f);setframe(f,True);fit(f)
 camera.keyframe_insert('location',frame=f);camera.keyframe_insert('rotation_euler',frame=f);camera.data.keyframe_insert('ortho_scale',frame=f)
 if f==shots[frames[f-1]['shot']]['start']:
  for root in [target,blade,marker]:
   for ob in [root,*root.children_recursive]:ob.keyframe_insert('hide_render',frame=f)
assert validation['connector_mesh_count']==0,validation
assert validation['minimum_lateral_hand_body_gap']>.25,validation
s.frame_start=1;s.frame_end=len(frames);s['stage']='Primitive seated detached-paw study. Tripo remains required for production.'
s.frame_set(1);setframe(1);fit(1)
bpy.ops.wm.save_as_mainfile(filepath=str(DATA/'orange-tabby-seated-floating-paws-v03.blend'),compress=True)
(DATA/'chapters.json').write_text(json.dumps(shots,indent=2)+'\n')
(DATA/'geometry-verification.json').write_text(json.dumps(validation,indent=2)+'\n')
(OUT/'frame-captions.json').write_text(json.dumps(captions,indent=2)+'\n')
print('SEATED_CAT_READY',len(frames),json.dumps(validation),flush=True)
if '--posters' in args:
 posterframes={}
 for shot in shots:
  record=next((x for x in replay['shots'] if x['id']==shot['id']),None)
  event=next((e for e in record['events'] if e['type'] in ['hit','clash']),None) if record else None
  offset=math.ceil(event['time']*FPS) if event else 14 if shot['group']=='design' else 28
  f=shot['start']+min(offset,shot['end']-shot['start']);posterframes[shot['id']]=f;s.frame_set(f);setframe(f);fit(f)
  s.render.filepath=str(OUT/f"poster-{shot['id']}.png");bpy.ops.render.render(write_still=True)
 (OUT/'poster-frames.json').write_text(json.dumps(posterframes,indent=2)+'\n')
if '--render' in args:
 dest=OUT/'raw-frames';dest.mkdir(exist_ok=True)
 for f in range(1,len(frames)+1):
  if '--combat-only' in args and shots[frames[f-1]['shot']]['group']!='combat':continue
  s.frame_set(f);setframe(f);fit(f);s.render.filepath=str(dest/f'{f:05d}.png');bpy.ops.render.render(write_still=True)
  if f%24==0:print('SEATED_CAT_RENDER',f,'/',len(frames),flush=True)
print('SEATED_CAT_DONE',flush=True)
