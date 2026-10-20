"""Actual optimized Tripo cat replaying the isolated current-game solver."""
from pathlib import Path
import bpy,json,math,sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'assets/concepts/orange-tabby/motion-v05';OUT=ROOT/'output/orange-tabby-v05';OUT.mkdir(parents=True,exist_ok=True)
PREP=ROOT/'assets/concepts/orange-tabby/prepared-v01'
replay=json.loads((DATA/'game-solver-replay.json').read_text());FPS=24;g=replay['geometry'];floor=g['bodyFloor']
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
bpy.ops.wm.open_mainfile(filepath=str(PREP/'orange-tabby-prepared-v01.blend'))
s=bpy.context.scene;s.render.engine='BLENDER_WORKBENCH'
s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB';s.render.image_settings.compression=10;s.render.fps=FPS
s.display.shading.light='STUDIO';s.display.shading.studio_light='paint.sl';s.display.shading.color_type='TEXTURE'
s.display.shading.show_shadows=True;s.display.shading.show_cavity=True;s.display.shading.cavity_type='WORLD'
s.display.shading.background_type='WORLD';s.world=bpy.data.worlds.new('Motion review world');s.world.color=(.79,.82,.82)
s.view_settings.view_transform='Standard'
root=bpy.data.objects['CTRL_Root'];hands=[bpy.data.objects['CTRL_Paw_L'],bpy.data.objects['CTRL_Paw_R']]
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=parent;return o
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);return m
paper=material('Floor',(.71,.77,.74));grid=material('Grid',(.54,.64,.59));green=material('Opponent',(.41,.57,.51))
metal=material('Sword contact proxy',(.28,.38,.43));red=material('Solver contact event',(.90,.21,.10))
def line(name,a,b,r,mat,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 sp=c.splines.new('POLY');sp.points.add(1);sp.points[0].co=(*a,1);sp.points[1].co=(*b,1)
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.parent=parent;c.materials.append(mat);return o
def sphere(name,loc,scale,mat,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10)
 o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
bpy.ops.mesh.primitive_plane_add(size=180,location=(0,0,-.04));bpy.context.object.data.materials.append(paper)
for i in range(-30,31):
 line('One-unit grid',(i,-30,-.032),(i,30,-.032),.008,grid)
 line('One-unit grid',(-30,i,-.032),(30,i,-.032),.008,grid)
target=empty('Solver target proxy')
sphere('Target torso',(0,0,.60),(.38,.38,.40),green,target)
sphere('Target head',(0,0,1.35),(.38,.38,.38),green,target)
blade=empty('Sword physical proxy',target);blade.location.z=floor
line('Blade',(0,0,1.2),(0,0,2.65),.09,metal,blade)
line('Guard',(-.15,0,1.61),(.15,0,1.61),.045,metal,blade)
marker=sphere('Actual solver event',(0,0,0),(.13,.13,.13),red);marker.show_in_front=True
bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera;camera.data.type='ORTHO'
def visible(ob,value):
 for n in [ob,*ob.children_recursive]:n.hide_render=not value
def point(p):return Vector((p['x'],-p['z'],p['y']-floor))
def pose(p):
 root.location=point(p['p']);root.rotation_euler=(0,0,-p['phi'])
 for hand in hands:hand.rotation_euler=(0,p['theta']-math.pi/2,0)
def sample(shot,t):
 rows=shot['rows'];ix=min(len(rows)-2,int(t*60));a,b=rows[ix:ix+2];u=max(0,min(1,(t-a['time'])/(b['time']-a['time'])))
 result={'input':a['input'],'players':[]}
 for x,y in zip(a['players'],b['players']):
  p={**x};p['p']={k:x['p'][k]+(y['p'][k]-x['p'][k])*u for k in ['x','y','z']}
  p['theta']=x['theta']+(y['theta']-x['theta'])*u
  p['phi']=x['phi']+math.atan2(math.sin(y['phi']-x['phi']),math.cos(y['phi']-x['phi']))*u
  result['players'].append(p)
 return result
shots=[];frames=[]
for record in replay['shots']:
 shot={k:record[k] for k in ['id','group','title','detail','duration']};shot['start']=len(frames)+1;shot['bounds']=[1e6,-1e6,1e6,-1e6]
 for f in range(round(record['duration']*FPS)):frames.append({'shot':len(shots),'time':f/FPS,'row':sample(record,f/FPS)})
 shot['end']=len(frames);shots.append(shot)
shot={'id':'actual-tripo-cat','group':'design','title':'Selected Tripo cat / prepared asset','detail':'Original appearance / independent floating paws / 25,000 triangles',
 'duration':4,'start':len(frames)+1,'bounds':[1e6,-1e6,1e6,-1e6]}
for f in range(4*FPS):
 t=f/FPS;frames.append({'shot':len(shots),'time':t,'row':{'input':'TURNAROUND','players':[{'p':{'x':0,'y':floor+.35,'z':0},'theta':math.pi/2,'phi':t*math.tau/4,'contact':False,'stamina':200}]}})
shot['end']=len(frames);shots.append(shot)
def setframe(f,bake=False):
 fr=frames[f-1];shot=shots[fr['shot']];r=fr['row'];p=r['players'][0];pose(p);loc=root.location.copy()
 visible(target,len(r['players'])>1);visible(blade,len(r['players'])>1 and r['players'][1]['weapon']=='sword')
 if len(r['players'])>1:
  other=r['players'][1];target.location=point(other['p']);target.rotation_euler=(0,0,-other['phi']);blade.rotation_euler=(0,other['theta'],0)
  center=(loc+target.location)/2+Vector((.2,0,.8))
 else:center=loc+Vector((.2,0,.9))
 camera.location=center+Vector((12,-1.5,5.3) if shot['group']=='controls' else (8,-12,6));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
 record=next((x for x in replay['shots'] if x['id']==shot['id']),None)
 event=next((e for e in reversed(record['events']) if 0<=fr['time']-e['time']<.16),None) if record else None
 marker.hide_render=event is None
 if event:
  ep=event['point'];marker.location=(ep['x'],-ep['z'],ep['y'])
 if bake:
  for ob in [root,*hands,target,blade,marker]:
   ob.keyframe_insert('location',frame=f);ob.keyframe_insert('rotation_euler',frame=f)
  for ob in [target,*target.children_recursive,marker]:ob.keyframe_insert('hide_render',frame=f)
 status='PAW-FLOOR CONTACT / reaction moves the hovering cat' if p['contact'] else 'AIRBORNE / bounded lift + momentum + finite paw motors'
 if shot['group']=='combat':status=('HIT / '+str(event['damage'])+' damage') if event and event['type']=='hit' else 'CLASH / deflection and recoil' if event and event['type']=='clash' else 'PREPARE / CONTACT / RECOVERY'
 if shot['group']=='design':status='ACTUAL OPTIMIZED TRIPO MESH / original face and markings'
 return {'frame':f,'shot_id':shot['id'],'group':shot['group'],'title':shot['title'],'detail':shot['detail'],'input':r['input'],'local_time':fr['time'],
  'status':status,'metric':f"body base {loc.z:.2f} u  /  ordinary stamina {p['stamina']:.0f}  /  seated body upright",
  'evidence':'AUTHORED ASSET TURNTABLE / not gameplay' if shot['group']=='design' else 'ACTUAL TRIPO ASSET + ISOLATED GAME SOLVER / 1x / not game footage',
  'chapter':f"{fr['shot']+1:02} / {len(shots):02}"}
captions=[]
for f in range(1,len(frames)+1):
 s.frame_set(f);captions.append(setframe(f));bpy.context.view_layer.update();shot=shots[frames[f-1]['shot']];inv=camera.matrix_world.inverted();b=shot['bounds']
 for parent in [root,target]:
  if parent.hide_render:continue
  for ob in parent.children_recursive:
   if ob.type not in ['MESH','CURVE'] or ob.hide_render:continue
   for corner in ob.bound_box:
    p=inv@(ob.matrix_world@Vector(corner));b[0]=min(b[0],p.x);b[1]=max(b[1],p.x);b[2]=min(b[2],p.y);b[3]=max(b[3],p.y)
for shot in shots:
 x0,x1,y0,y1=shot['bounds'];shot['scale']=max((x1-x0)/.90,(y1-y0)*1280/720/.53);shot['center']=[(x0+x1)/2,(y0+y1)/2]
for group in ['controls','design']:
 scale=max(x['scale'] for x in shots if x['group']==group)
 for shot in shots:
  if shot['group']==group:shot['scale']=scale
def fit(f):
 shot=shots[frames[f-1]['shot']];cx,cy=shot['center'];scale=shot['scale']
 camera.location+=camera.rotation_euler.to_matrix()@Vector((cx,cy-.012*scale/(1280/720),0));camera.data.ortho_scale=scale
for f in range(1,len(frames)+1):
 s.frame_set(f);setframe(f,True);fit(f);camera.keyframe_insert('location',frame=f);camera.keyframe_insert('rotation_euler',frame=f);camera.data.keyframe_insert('ortho_scale',frame=f)
s.frame_start=1;s.frame_end=len(frames);s['stage']='Actual optimized Tripo cat, isolated solver replay. Motion and asset review pending. No runtime integration.'
bpy.ops.wm.save_as_mainfile(filepath=str(DATA/'orange-tabby-motion-v05.blend'),compress=True)
(DATA/'chapters.json').write_text(json.dumps(shots,indent=2)+'\n');(OUT/'frame-captions.json').write_text(json.dumps(captions,indent=2)+'\n')
if '--posters' in args:
 picks={}
 for shot in shots:
  record=next((x for x in replay['shots'] if x['id']==shot['id']),None)
  event=next((e for e in record['events'] if e['type'] in ['hit','clash']),None) if record else None
  offset=math.ceil(event['time']*FPS) if event else 24
  f=shot['start']+min(offset,shot['end']-shot['start']);picks[shot['id']]=f;s.frame_set(f);setframe(f);fit(f)
  s.render.filepath=str(OUT/f"poster-{shot['id']}.png");bpy.ops.render.render(write_still=True)
 (OUT/'poster-frames.json').write_text(json.dumps(picks,indent=2)+'\n')
if '--render' in args:
 dest=OUT/'raw-frames';dest.mkdir(exist_ok=True)
 for f in range(1,len(frames)+1):
  if '--combat-only' in args and shots[frames[f-1]['shot']]['group']!='combat':continue
  if '--controls-only' in args and shots[frames[f-1]['shot']]['group']!='controls':continue
  s.frame_set(f);setframe(f);fit(f);s.render.filepath=str(dest/f'{f:05d}.png');bpy.ops.render.render(write_still=True)
  if f%120==0:print('ACTUAL_CAT_RENDER',f,'/',len(frames),flush=True)
print('ACTUAL_CAT_MOTION_DONE',len(frames),flush=True)
