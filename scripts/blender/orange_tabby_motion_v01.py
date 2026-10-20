"""Primitive motion blockout ONLY; Tripo remains required for production.

Rebuild: node scripts/preview/orange-tabby-motion-v01.mjs
  bash scripts/blender.sh -b --factory-startup --python-exit-code 1 \
    --python scripts/blender/orange_tabby_motion_v01.py -- --posters
Use --render after inspecting posters. All study data stays outside runtime src.
"""
from pathlib import Path
import bpy, json, math, sys
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/orange-tabby-v01';OUT.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'assets/concepts/orange-tabby/motion-v01'
replay=json.loads((DATA/'support-replay.json').read_text())
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
FPS=24
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
s=bpy.context.scene
s.render.engine='BLENDER_WORKBENCH'
s.render.resolution_x=1280;s.render.resolution_y=720;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
s.render.image_settings.compression=12;s.render.fps=FPS
s.display.shading.light='STUDIO';s.display.shading.studio_light='paint.sl'
s.display.shading.color_type='MATERIAL';s.display.shading.show_shadows=True
s.display.shading.show_cavity=True;s.display.shading.cavity_type='BOTH'
s.display.shading.show_specular_highlight=True
s.display.shading.background_type='WORLD';s.world.color=(.79,.82,.82)
s.view_settings.view_transform='Standard'
def mat(name,h):
 rgb=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 m=bpy.data.materials.new(name);m.diffuse_color=tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)+(1,);return m
orange=mat('Orange reference volume','EDA34F');dark=mat('Tabby stripes','C56D2E')
white=mat('Warm white muzzle and paws','FFF4DC');pink=mat('Pink paw pads','EAA8AA')
ink=mat('Facial landmarks','39352F');green=mat('Green eyes','86A465')
teal=mat('Contact and direction','387F82');paper=mat('Studio floor','DFE5E3')
gridmat=mat('One-unit grid','C3CECC');metal=mat('Opponent blade','7D959D')
targetmat=mat('Practice target','B4C2B9');red=mat('Authored contact indication','CF775F')
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=parent;return o
def uv(name,loc,scale,material,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=(0,0,0))
 o=bpy.context.object;o.name=name;o.parent=parent;o.location=loc;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def cylinder(name,a,b,r,material,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=1)
 o=bpy.context.object;o.name=name;o.parent=parent;o.data.materials.append(material);segment(o,a,b,r);return o
def segment(o,a,b,r):
 a,b=Vector(a),Vector(b);v=b-a;o.location=(a+b)/2;o.rotation_mode='QUATERNION'
 o.rotation_quaternion=v.to_track_quat('Z','Y');o.scale=(r,r,v.length)
 # Unit-radius cylinders; scale must not multiply the construction radius.
def rod(name,a,b,r,material,parent=None):
 o=cylinder(name,a,b,1,material,parent);segment(o,a,b,r);return o
def line(name,points,material,r=.012,parent=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
 sp=c.splines.new('POLY');sp.points.add(len(points)-1)
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);s.collection.objects.link(o);o.parent=parent;c.materials.append(material);return o
def ear(name,side,parent,h):
 verts=[(-.08,side*.29,1.72+h),(.25,side*.33,1.81+h),(.02,side*.56,2.30+h),(-.21,side*.40,1.80+h)]
 verts += [(x-.15,y,z) for x,y,z in verts]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
 o=bpy.data.objects.new(name,mesh);s.collection.objects.link(o);o.parent=parent;mesh.materials.append(orange)
 uv(name+' pink',(.065,side*.445,2.04+h),(.033,.09,.15),pink,parent)
 return o
def cat(name,h=0):
 root=empty(name);uv(name+' round torso',(-.16,0,.59+h*.46),(.60,.57,.61+h*.46),orange,root)
 uv(name+' white chest',(.34,0,.75+h*.50),(.19,.38,.43),white,root)
 for side in [-1,1]:
  uv(name+' haunch',(-.37,side*.38,.36),(.40,.34,.34),orange,root)
  uv(name+' tucked hind paw',(.02,side*.40,.13),(.22,.21,.13),white,root)
 uv(name+' head',(.09,0,1.46+h),(.60,.59,.51),orange,root)
 for side in [-1,1]:
  ear(name+' ear',side,root,h)
  uv(name+' cheek',(.51,side*.22,1.32+h),(.23,.29,.22),white,root)
  uv(name+' eye rim',(.586,side*.265,1.59+h),(.06,.146,.16),ink,root)
  uv(name+' green eye',(.635,side*.265,1.59+h),(.038,.123,.138),green,root)
  uv(name+' pupil',(.668,side*.27,1.59+h),(.025,.039,.106),ink,root)
  uv(name+' eye glint',(.687,side*.245,1.64+h),(.012,.025,.031),white,root)
  for j in range(3):
   line(name+' whisker',[(.655,side*.30,1.30+h),(.69,side*(.60+j*.025),1.29+(j-1)*.10+h)],ink,.008,root)
  for j in range(3):
   pts=[]
   for k in range(8):
    z=1.46+(j-1)*.10+.025*math.sin(k/7*math.pi);ang=.58+k/7*.65
    f=math.sqrt(max(0,1-((z-1.46)/.51)**2))
    pts.append((.09+.605*f*math.cos(ang),side*.595*f*math.sin(ang),z+h))
   line(name+' cheek stripe',pts,dark,.025,root)
  for j in range(3):
   x=-.16-j*.14;f=math.sqrt(max(0,1-((x+.16)/.60)**2));zc=.59+h*.46;zr=.615+h*.46
   line(name+' flank stripe',[(x,side*.575*f*math.sin(.65+k*.13),zc+zr*f*math.cos(.65+k*.13)) for k in range(10)],dark,.035,root)
 uv(name+' pink nose',(.75,0,1.37+h),(.055,.08,.05),pink,root)
 line(name+' mouth',[(.745,-.08,1.25+h),(.76,0,1.29+h),(.745,.08,1.25+h)],ink,.012,root)
 for y in [-.17,0,.17]:
  pts=[]
  for k in range(9):
   z=1.74+k*.024;x=.09+.606*math.sqrt(max(0,1-(y/.59)**2-((z-1.46)/.51)**2))
   pts.append((x,y,z+h))
  line(name+' forehead stripe',pts,dark,.027,root)
 tailpts=[(-.58,.08,.40),(-.95,.08,.35),(-1.20,.10,.48),(-1.28,.12,.78),(-1.22,.12,1.0)]
 line(name+' curved tail',tailpts,orange,.12,root)
 for p in [(-.98,.08,.38),(-1.23,.11,.59),(-1.27,.12,.83)]:uv(name+' tail ring',p,(.125,.125,.045),dark,root)
 arms=[]
 for side in [-1,1]:
  shoulder=Vector((.18,side*.65,1.02+h))
  uv(name+' shoulder',shoulder,(.17,.17,.18),orange,root)
  upper=rod(name+' upper limb',shoulder,shoulder+Vector((0,0,-.5)),.13,orange,root)
  elbow=uv(name+' elbow',shoulder,(.14,.14,.14),orange,root)
  fore=rod(name+' striped forearm',shoulder,shoulder+Vector((0,0,-.5)),.115,orange,root)
  wrist=uv(name+' wrist',shoulder,(.12,.12,.13),orange,root)
  paw=empty(name+' attached white paw',root)
  uv(name+' palm',(0,0,0),(.22,.22,.18),white,paw)
  uv(name+' central pink pad',(-.03,0,-.164),(.09,.12,.025),pink,paw)
  for y in [-.16,-.052,.052,.16]:
   uv(name+' toe',(.13,y,-.025),(.12,.073,.125),white,paw)
   uv(name+' toe pad',(.14,y,-.14),(.045,.043,.022),pink,paw)
   bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=.027,radius2=0,depth=.10)
   claw=bpy.context.object;claw.name=name+' small claw';claw.parent=paw;claw.location=(.27,y,-.02)
   claw.rotation_euler=(0,math.pi/2,0);claw.data.materials.append(white)
  arms.append(dict(side=side,shoulder=shoulder,upper=upper,elbow=elbow,fore=fore,wrist=wrist,paw=paw))
 arrow=line(name+' heading',[(.4,0,.025),(1.38,0,.025),(1.15,-.12,.025),(1.38,0,.025),(1.15,.12,.025)],teal,.017,root)
 return dict(root=root,arms=arms,h=h,arrow=arrow)

catA=cat('A compact cat');catB=cat('B taller cat',.35)
bpy.ops.mesh.primitive_plane_add(size=80,location=(0,0,-.045));bpy.context.object.data.materials.append(paper)
for x in range(-15,16):
 line('Fixed world grid',[(x,-15,-.035),(x,15,-.035)],gridmat,.008)
 line('Fixed world grid',[(-15,x,-.035),(15,x,-.035)],gridmat,.008)
target=empty('Authored practice dummy')
dummy=uv('Practice target body',(0,0,.8),(.28,.28,.60),targetmat,target)
uv('Practice target head',(0,0,1.5),(.25,.25,.25),targetmat,target)
blade=empty('Authored opponent blade')
bpy.ops.mesh.primitive_cube_add();bladeMesh=bpy.context.object;bladeMesh.name='Practice blade';bladeMesh.parent=blade
bladeMesh.location=(-.42,0,0);bladeMesh.scale=(.45,.055,.07);bladeMesh.data.materials.append(metal)
rod('Practice crossguard',(-.02,-.23,0),(-.02,.23,0),.045,ink,blade)
rod('Practice grip',(.02,0,0),(.30,0,0),.055,dark,blade)
bpy.ops.object.camera_add();camera=bpy.context.object;s.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=7.6
def camera_at(target,offset=(6,-9,6),scale=7.6):
 camera.location=Vector(target)+Vector(offset);camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
def visibility(ob,visible):
 ob.hide_render=not visible
 for child in ob.children_recursive:child.hide_render=not visible
def pose(c,p,q,yaw,custom=None):
 c['root'].location=p;c['root'].rotation_euler=(0,0,yaw)
 for arm in c['arms']:
  side=arm['side'];a=q+(math.pi if side<0 else 0)
  w=arm['shoulder']+Vector((.18-.62*math.cos(a),0,-.72+.32*math.sin(a)))
  if custom and side in custom:w=Vector(custom[side])
  sh=arm['shoulder'];delta=w-sh;d=delta.length;u=delta.normalized()
  if d>1.28:raise ValueError(('unreachable',d,custom))
  along=(.62**2-.66**2+d*d)/(2*d);offset=math.sqrt(max(0,.62**2-along**2))
  # Sagittal elbow bend, with outboard shoulders keeping the chain clear.
  pole=Vector((-u.z,0,u.x)).normalized()
  el=sh+u*along+pole*offset
  segment(arm['upper'],sh,el,.13);arm['elbow'].location=el
  segment(arm['fore'],el,w,.115);arm['wrist'].location=w
  arm['paw'].location=w;arm['paw'].rotation_euler=(0,-math.pi/2 if custom else -.5*max(0,math.sin(a)),0)
def bake(c,f):
 objects=[c['root']]+[arm[k] for arm in c['arms'] for k in ['upper','elbow','fore','wrist','paw']]
 for o in objects:
  o.keyframe_insert('location',frame=f);o.keyframe_insert('scale',frame=f)
  o.keyframe_insert('rotation_quaternion' if o.rotation_mode=='QUATERNION' else 'rotation_euler',frame=f)

shots=[];frames=[]
for shot in replay['shots']:
 entry={k:shot[k] for k in ['id','duration','title','detail','group','kind']};entry['start']=len(frames)+1
 for row in shot['rows'][:-1]:frames.append(dict(row,shot=len(shots)))
 entry['end']=len(frames);shots.append(entry)
for id,title,detail in [
 ('vertical','Vertical paw rake / W','Prepare, downward contact, then folded recovery'),
 ('horizontal','Horizontal paw swipe / D','Heading sweep with paws extended; body turns together'),
 ('block','Pad-facing interception / W then release','Position a paw in the blade path; no automatic guard'),
 ('clash','Weapon clash and recovery / W + D','Paw/blade meet; both recoil, then return to control'),
 ('postures','A compact / B taller posture','Same arm lengths and relative stroke; B needs a deeper reach path'),
]:
 duration=6 if id=='postures' else 4;entry=dict(id=id,title=title,detail=detail,duration=duration,kind='authored',group='comparison' if id=='postures' else 'combat',start=len(frames)+1)
 for i in range(int(duration*FPS)):
  t=i/FPS;frames.append(dict(time=t,input=('W / S CYCLE' if id=='postures' else 'RELEASE' if t>2.7 else 'W + D' if id=='clash' else 'D' if id=='horizontal' else 'W'),p=[0,0,0],q=t*2.1,yaw=0,contacts=0,shot=len(shots)))
 entry['end']=len(frames);shots.append(entry)

metadata=[];maxreach=0;max_foot_penetration=0
def set_frame(f,baking=False):
 global maxreach,max_foot_penetration
 row=frames[f-1];shot=shots[row['shot']];id=shot['id'];t=row['time'];p=row['p'];q=row['q'];yaw=row['yaw']
 visibility(catB['root'],id=='postures');visibility(target,id in ['vertical','horizontal']);visibility(blade,id in ['block','clash'])
 custom=None
 if shot['kind']=='support':
  pose(catA,p,q,yaw);camera_at((p[0],p[1],1.0+p[2]*.4))
  status=('PAW CONTACT / reaction drives body' if row['contacts'] else 'COAST / gravity + damping + base support')
  evidence='REDUCED SUPPORT SOLVER / 1x / upright base; procedural limb path; not game footage'
  metric=f"body ({p[0]:+.2f}, {p[1]:+.2f})   rise {p[2]:.2f} u"
 else:
  evidence='AUTHORED CONCEPT / 1x / scripted motion and contacts; not solver or game evidence'
  if id=='postures':
   right=Vector((9,7,0)).normalized()*1.70
   pose(catA,-right,q,0);pose(catB,right,q,0)
   camera_at((0,0,1.1),(7,-9,5.5),8.8)
   status='A: low seated support     |     B: taller body, less floor reach'
   metric='0.62 upper + 0.66 forelimb / attached paws / no production geometry'
  else:
   a=max(0,min(1,(t-.5)/1.3));hit=1.25;recovery=max(0,min(1,(t-2.1)/1.3))
   stroke=math.sin(math.pi*min(1,max(0,(t-.4)/2.4)))
   near=[.55+.52*stroke,-.65,1.02+.40*math.sin(math.pi*2*a)]
   if id in ['block','clash']:near=[.65+.38*stroke,-.65,1.12]
   custom={-1:near,1:[.40,.65,.75]}
   yaw=(-.55+1.10*a)*(1-recovery) if id=='horizontal' else -.25*stroke if id=='clash' else 0
   rootx=-.30*max(0,min(1,(t-1.55)/.40))*(1-recovery) if id=='clash' else 0
   pose(catA,[rootx,0,0],0,yaw,custom);camera_at((.50,-.15,1.05),(6,-9,5.3),6.8)
   target.location=(1.30,-.65,0);dummy.data.materials[0]=red if 1.15<t<1.6 else targetmat
   if id=='horizontal':target.location=(1.20,-.42,0)
   blade.location=(1.94-.22*stroke+(.35*max(0,min(1,(t-1.55)/.4)) if id=='clash' else 0),-.65,1.12)
   blade.rotation_euler=(0,0,.08*math.sin(t*2))
   status='PREPARE' if t<.6 else 'CONTACT INTENT / authored' if t<1.8 else 'FOLDED RETURN / useful control'
   metric='Target/weapon paths and recoil are scripted; game collision proof remains open'
 if baking:
  bake(catA,f)
  if id=='postures':bake(catB,f)
 return dict(frame=f,shot_id=id,group=shot['group'],title=shot['title'],detail=shot['detail'],input=row['input'],
  evidence=evidence,status=status,metric=metric,local_time=t,chapter=f"{row['shot']+1:02} / {len(shots):02}")

for shot in shots:shot['bounds']=[1e6,-1e6,1e6,-1e6]
for f in range(1,len(frames)+1):
 s.frame_set(f);metadata.append(set_frame(f));bpy.context.view_layer.update()
 shot=shots[frames[f-1]['shot']];inv=camera.matrix_world.inverted();bounds=shot['bounds']
 for root in [catA['root'],catB['root'],target,blade]:
  if root.hide_render:continue
  for obj in root.children_recursive:
   if obj.type not in ['MESH','CURVE'] or obj.hide_render:continue
   for corner in obj.bound_box:
    p=inv@(obj.matrix_world@Vector(corner));bounds[0]=min(bounds[0],p.x);bounds[1]=max(bounds[1],p.x)
    bounds[2]=min(bounds[2],p.y);bounds[3]=max(bounds[3],p.y)
for shot in shots:
 x0,x1,y0,y1=shot['bounds'];shot['scale']=max((x1-x0)/.90,(y1-y0)*(1280/720)/.53)
 shot['center']=[(x0+x1)/2,(y0+y1)/2]
for group in ['controls','combat','comparison']:
 scale=max(shot['scale'] for shot in shots if shot['group']==group)
 for shot in shots:
  if shot['group']==group:shot['scale']=scale
def fit_camera(f):
 shot=shots[frames[f-1]['shot']];scale=shot['scale'];cx,cy=shot['center'];basis=camera.rotation_euler.to_matrix()
 camera.location+=basis@Vector((cx,cy-.012*scale/(1280/720),0));camera.data.ortho_scale=scale
for f in range(1,len(frames)+1):
 s.frame_set(f);set_frame(f,True);fit_camera(f)
 camera.keyframe_insert('location',frame=f);camera.keyframe_insert('rotation_euler',frame=f);camera.data.keyframe_insert('ortho_scale',frame=f)
 if f==shots[frames[f-1]['shot']]['start']:
  for root in [catA['root'],catB['root'],target,blade]:
   for obj in [root,*root.children_recursive]:obj.keyframe_insert('hide_render',frame=f)
s.frame_start=1;s.frame_end=len(frames)
# Scene is an editable motion blockout; the script recreates shot visibility/camera.
s['stage']='Primitive motion study only. Not Tripo base or production rig.'
s['rebuild_script']='scripts/blender/orange_tabby_motion_v01.py'
s.frame_set(30);set_frame(30);fit_camera(30);bpy.ops.wm.save_as_mainfile(filepath=str(DATA/'orange-tabby-blockout-v01.blend'),compress=True)
(DATA/'chapters.json').write_text(json.dumps(shots,indent=2)+'\n')
(OUT/'frame-captions.json').write_text(json.dumps(metadata,indent=2)+'\n')
print('TABBY_SCENE_READY',len(frames),flush=True)
if '--posters' in args:
 for shot in shots:
  f=shot['start']+min(32,shot['end']-shot['start']);s.frame_set(f);set_frame(f);fit_camera(f)
  s.render.filepath=str(OUT/f"poster-{shot['id']}.png");bpy.ops.render.render(write_still=True)
if '--render' in args:
 dest=OUT/'raw-frames';dest.mkdir(exist_ok=True)
 for f in range(1,len(frames)+1):
  s.frame_set(f);set_frame(f);fit_camera(f)
  s.render.filepath=str(dest/f'{f:05d}.png');bpy.ops.render.render(write_still=True)
  if f%24==0:print('TABBY_RENDER',f,'/',len(frames),flush=True)
print('TABBY_DONE',flush=True)
