"""Lower the invisible rigid paw pivots; preserve every neutral-pose world vertex."""
from pathlib import Path
import bpy,json,hashlib
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OLD=ROOT/'assets/concepts/orange-tabby/prepared-v01';NEW=ROOT/'assets/concepts/orange-tabby/prepared-v02';NEW.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OLD/'orange-tabby-prepared-v01.blend'))
bpy.context.view_layer.update()
before={name:[bpy.data.objects[name].matrix_world@v.co for v in bpy.data.objects[name].data.vertices] for name in ['SM_Body','SM_Paw_L','SM_Paw_R']}
for name in ['CTRL_Paw_L','CTRL_Paw_R']:
 ctrl=bpy.data.objects[name];delta=ctrl.location.z;ctrl.location.z=0
 for child in ctrl.children:
  assert child.type=='MESH'
  for v in child.data.vertices:v.co.z+=delta
  child.data.update()
bpy.context.view_layer.update()
error=max((bpy.data.objects[name].matrix_world@v.co-old).length for name,points in before.items() for v,old in zip(bpy.data.objects[name].data.vertices,points))
assert error<1e-6,error
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(NEW/'orange-tabby-prepared-v02.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(NEW/'orange-tabby-prepared-v02.blend'),compress=True)
m=json.loads((OLD/'measurements.json').read_text());m.update({'version':'orange-tabby-prepared-v02','virtual_pivot_height':0,'date':'2026-10-20','edit':'Lower virtual paw pivots from 0.8 to the seated body base; preserve neutral geometry, texture and appearance.','neutral_pose_max_vertex_error':error,'parent_candidate':'prepared-v01'})
for part in m['parts']:
 if part['name']!='SM_Body':part['pivot'][2]=0
m['export_bytes']=(NEW/'orange-tabby-prepared-v02.glb').stat().st_size;m['export_sha256']=hashlib.sha256((NEW/'orange-tabby-prepared-v02.glb').read_bytes()).hexdigest()
(NEW/'measurements.json').write_text(json.dumps(m,indent=2)+'\n')
fit=json.loads((OLD/'contact-fit.json').read_text())
for shape in fit['colliders']+[c for part in fit['parts'] for c in part['contacts']]:
 for key in ['a','b']:shape[key][0]=round(shape[key][0]-.8,6)
fit['frame']='Game contact coordinates: [-Blender world Z, Blender world X, -Blender world Y]. Virtual pitch pivot is at body base; theta pi/2 is the unchanged neutral pose.'
fit['source_fit']='prepared-v01/contact-fit.json; same world-space contact volumes, expressed about the lower pivot.'
(NEW/'contact-fit.json').write_text(json.dumps(fit,indent=2)+'\n')
print('CAT_REPIVOTED',json.dumps({'neutralPoseMaxVertexError':error,'triangles':m['total_triangles'],'bytes':m['export_bytes']}),flush=True)
