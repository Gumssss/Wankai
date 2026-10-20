"""Actual Tripo cat in the user-selected beagle v07 functional video format."""
from pathlib import Path
import bpy,json,math,sys
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

# Reuse audited stage/model/sample helpers only; no v05 shots, framing or animation.
ROOT=Path(__file__).resolve().parents[2]
prefix=(ROOT/'scripts/blender/orange_tabby_motion_v05.py').read_text().split('shots=[];frames=[]')[0]
prefix=prefix.replace('motion-v05','motion-v06').replace('orange-tabby-v05','orange-tabby-v06').replace('prepared-v01','prepared-v02')
prefix=prefix.replace('FPS=24','FPS=30').replace('resolution_x=1280;s.render.resolution_y=720','resolution_x=1600;s.render.resolution_y=900')
exec(compile(prefix,'orange_tabby_v06_stage_helpers','exec'),globals())
s.world.color=(.78,.76,.68);paper.diffuse_color=(.64,.62,.52,1);grid.diffuse_color=(.47,.47,.39,1)
green.diffuse_color=(.79,.79,.70,1)
bpy.data.objects['Target head'].data.materials.clear();bpy.data.objects['Target head'].data.materials.append(material('Target amber',(.72,.46,.12)))
bpy.data.objects.remove(bpy.data.objects['Target torso'],do_unlink=True)
line('Actual torso capsule',(0,0,.40),(0,0,.77),.38,green,target)
sphere('Torso cap low',(0,0,.40),(.38,)*3,green,target);sphere('Torso cap high',(0,0,.77),(.38,)*3,green,target)
teal=material('Registered paw support',(.08,.40,.36));ink=material('Dummy eyes',(.08,.07,.05))
for side in [-1,1]:sphere('Target eye '+str(side),(.34,side*.12,1.39),(.035,)*3,ink,target)
marker.hide_render=True
support_cues=[]
for i in range(2):
 bpy.ops.mesh.primitive_torus_add(major_radius=.18,minor_radius=.018,major_segments=24,minor_segments=6)
 ob=bpy.context.object;ob.name='Registered paw-floor contact '+str(i);ob.data.materials.append(teal);support_cues.append(ob)
trail=[sphere('World travel trace '+str(i),(0,0,.016),(.025,.025,.012),teal) for i in range(35)]

records={r['id']:r for r in replay['shots']}
shots=[];frames=[]
def add(record,speed=1,duration=None,offset=0):
 duration=duration or record['duration'];shot={k:record[k] for k in ['id','group','title','detail']}
 shot.update({'speed':speed,'offset':offset,'duration':duration,'start':len(frames)+1,'bounds':[1e6,-1e6,1e6,-1e6]})
 if speed!=1:shot['id']+='-slow';shot['title']+=' / same event, 0.25x'
 for f in range(round(duration*FPS)):
  t=offset+f/FPS*speed;frames.append({'shot':len(shots),'time':t,'row':sample(record,t)})
 shot['end']=len(frames);shots.append(shot)
for record in replay['shots']:
 add(record)
 if record['id']=='s':add(record,.25,4.8,max(0,replay['verification']['liftProof']['firstSupportTime']-.15))
 elif record['id'] in ['vertical-hit','horizontal-hit','sword-clash']:
  event=next(e for e in record['events'] if e['type'] in ['hit','clash'])
  add(record,.25,4 if record['id']=='sword-clash' else 3.6,max(0,event['time']-.15))

def phase(shot,p,event,keys):
 if event:return ('HIT / '+str(event['damage'])+' damage and knockback') if event['type']=='hit' else 'CLASH / paw and sword deflect; fighters recoil'
 height=p['p']['y']-floor
 if p['contact']:return 'GROUND SUPPORT / planted paws lift and carry the cat'
 if height>.8:return 'AIRBORNE / rising on paw-contact momentum' if p['v']['y']>.2 else 'DESCENT / gravity returns the seated cat'
 if shot['id'].startswith('opposites'):return 'OPPOSITE KEYS / powered input cancels'
 return 'POWERED / finite paw swing and heading control' if keys!='RELEASE' else 'RELEASE / coasting and low-hover recovery'

def setframe(f,bake=False):
 fr=frames[f-1];shot=shots[fr['shot']];record=records[shot['id'].removesuffix('-slow')];row=fr['row'];p=row['players'][0]
 pose(p);loc=root.location.copy();has_opponent=len(row['players'])>1
 visible(target,has_opponent);visible(blade,has_opponent and row['players'][1]['weapon']=='sword')
 if has_opponent:
  other=row['players'][1];target.location=point(other['p']);target.rotation_euler=(0,0,-other['phi']);blade.rotation_euler=(0,other['theta'],0)
  center=(loc+target.location)/2
 else:center=loc.copy()
 # Follow only horizontal travel. The world floor and camera height stay stable.
 center.z=1.85
 offset=Vector((.25,-20,2.8)) if shot['speed']!=1 else Vector((5,-18,9))
 camera.location=center+offset;camera.rotation_euler=(-offset).to_track_quat('-Z','Y').to_euler()
 for i,cue in enumerate(support_cues):
  points=p.get('supportPoints',[]);cue.hide_render=i>=len(points)
  if i<len(points):cue.location=(points[i]['x'],-points[i]['z'],.016)
 for i,dot in enumerate(trail):
  past=fr['time']-i*.09;dot.hide_render=past<0
  if past>=0:
   previous=sample(record,past)['players'][0]['p'];dot.location=(previous['x'],-previous['z'],.016)
 event=next((e for e in reversed(record['events']) if 0<=fr['time']-e['time']<.45),None)
 if bake:
  for ob in [root,*hands,target,blade,*support_cues,*trail]:
   ob.keyframe_insert('location',frame=f);ob.keyframe_insert('rotation_euler',frame=f)
  for ob in [target,*target.children_recursive,*support_cues,*trail]:ob.keyframe_insert('hide_render',frame=f)
 return {'frame':f,'shot_id':shot['id'],'record_id':record['id'],'group':shot['group'],'title':shot['title'],'detail':shot['detail'],
  'input':row['input'],'physical_time':fr['time'],'speed':shot['speed'],'status':phase(shot,p,event,row['input']),
  'base_height':p['p']['y']-floor,'height_above_rest':p['p']['y']-floor-.35,'stamina':p['stamina'],
  'opponent_health':row['players'][1]['health'] if has_opponent else None,'event':event,
  'chapter':f"{fr['shot']+1:02}/{len(shots):02}", 'camera_z':camera.location.z}

# Determine one safe frame for each complete shot, including a floor reference.
for f in range(1,len(frames)+1):
 s.frame_set(f);setframe(f);bpy.context.view_layer.update();shot=shots[frames[f-1]['shot']];inv=camera.matrix_world.inverted();b=shot['bounds']
 points=[]
 for parent in [root,target]:
  if parent.hide_render:continue
  for ob in parent.children_recursive:
   if ob.type not in ['MESH','CURVE'] or ob.hide_render:continue
   points.extend(ob.matrix_world@Vector(c) for c in ob.bound_box)
 points.append(Vector((root.location.x,root.location.y,0)))
 for pt in points:
  p=inv@pt;b[0]=min(b[0],p.x);b[1]=max(b[1],p.x);b[2]=min(b[2],p.y);b[3]=max(b[3],p.y)
for shot in shots:
 x0,x1,y0,y1=shot['bounds'];shot['scale']=max(9,(x1-x0)/.66,(y1-y0)*1600/900/.74);shot['center']=[(x0+x1)/2,(y0+y1)/2]
# Normal/slow pairs use the same scale; unrelated fixtures may frame independently.
for record in replay['shots']:
 pair=[shot for shot in shots if shot['id'].removesuffix('-slow')==record['id']];scale=max(x['scale'] for x in pair)
 for shot in pair:shot['scale']=scale
def fit(f):
 shot=shots[frames[f-1]['shot']];cx,cy=shot['center'];scale=shot['scale']
 camera.location+=camera.rotation_euler.to_matrix()@Vector((cx+.02*scale,cy,0));camera.data.ortho_scale=scale
def screen(v):
 p=world_to_camera_view(s,camera,Vector(v));return [p.x*1600,(1-p.y)*900]
captions=[]
for f in range(1,len(frames)+1):
 s.frame_set(f);r=setframe(f,True);fit(f);bpy.context.view_layer.update()
 camera.keyframe_insert('location',frame=f);camera.keyframe_insert('rotation_euler',frame=f);camera.data.keyframe_insert('ortho_scale',frame=f)
 r['camera_z']=camera.location.z
 if r['event']:
  ep=r['event']['point'];r['event_screen']=screen((ep['x'],-ep['z'],ep['y']))
 # Height ruler is projected from world points; it never changes the physical pose.
 right=camera.rotation_euler.to_matrix()@Vector((-.95,0,0));origin=root.location+right
 r['ruler']=[screen((origin.x,origin.y,h)) for h in [0,.35,max(.35,root.location.z)]]
 captions.append(r)
s.frame_start=1;s.frame_end=len(frames);s['stage']='Actual Tripo cat, lower virtual paw pivots, beagle v07 functional video format; not integrated gameplay.'
bpy.ops.wm.save_as_mainfile(filepath=str(DATA/'orange-tabby-functional-v06.blend'),compress=True)
(DATA/'chapters.json').write_text(json.dumps(shots,indent=2)+'\n');(OUT/'frame-captions.json').write_text(json.dumps(captions,indent=2)+'\n')
print('FUNCTIONAL_CAT_READY',len(frames),flush=True)
if '--posters' in args:
 picks={}
 for shot in shots:
  record=records[shot['id'].removesuffix('-slow')]
  if record['id']=='s':target_time=1.52
  elif shot['group']=='combat' and record['events']:target_time=record['events'][0]['time']+.08
  else:target_time=shot['offset']+.95*shot['speed']
  f=shot['start']+max(0,min(shot['end']-shot['start'],round((target_time-shot['offset'])/shot['speed']*FPS)))
  picks[shot['id']]=f;s.frame_set(f);setframe(f);fit(f);s.render.filepath=str(OUT/f"poster-{shot['id']}.png");bpy.ops.render.render(write_still=True)
 (OUT/'poster-frames.json').write_text(json.dumps(picks,indent=2)+'\n')
if '--render' in args:
 dest=OUT/'raw-frames';dest.mkdir(exist_ok=True)
 for f in range(1,len(frames)+1):
  group=shots[frames[f-1]['shot']]['group']
  if '--lift-only' in args and group!='lift':continue
  if '--rest-only' in args and group=='lift':continue
  s.frame_set(f);setframe(f);fit(f);s.render.filepath=str(dest/f'{f:05d}.png');bpy.ops.render.render(write_still=True)
  if f%150==0:print('FUNCTIONAL_CAT_RENDER',f,'/',len(frames),flush=True)
print('FUNCTIONAL_CAT_DONE',len(frames),flush=True)
