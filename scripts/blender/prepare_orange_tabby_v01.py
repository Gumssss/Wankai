"""Prepare the selected Tripo mesh; never alter the original or runtime sources."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/concepts/orange-tabby/prepared-v01';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets/concepts/orange-tabby/tripo-v01/orange-tabby-tripo-v01-source.glb'
EXPECTED='4241a26dbfb8f87e4c16c34b07c9319dd368523263b18b50ae3cdaa2e0485912'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE),merge_vertices=True)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)==1
obj=meshes[0];bpy.context.view_layer.objects.active=obj
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=.000001)
bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
parts=sorted([o for o in bpy.context.scene.objects if o.type=='MESH'],key=lambda o:sum(v.co.x for v in o.data.vertices)/len(o.data.vertices))
assert len(parts)==3, len(parts)
body=parts[1]
def bounds(ob):
    pts=[ob.matrix_world@v.co for v in ob.data.vertices]
    return [Vector([min(p[i] for p in pts) for i in range(3)]),Vector([max(p[i] for p in pts) for i in range(3)])]
bmin,bmax=bounds(body)
origin=Vector(((bmin.x+bmax.x)/2,(bmin.y+bmax.y)/2,bmin.z))
scale=1.45/(bmax.z-bmin.z)
convert=Matrix.Rotation(math.pi/2,4,'Z')
for ob in parts:
    for v in ob.data.vertices:v.co=(convert@(v.co-origin))*scale
    ob.data.update()
def empty(name,parent=None,loc=(0,0,0)):
    ob=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(ob);ob.parent=parent;ob.location=loc;return ob
root=empty('CTRL_Root')
report={'version':'orange-tabby-prepared-v01','source_sha256':EXPECTED,'blender':bpy.app.version_string,
 'scale_factor':scale,'body_height':1.45,'forward':'+X','up':'Blender +Z / glTF +Y',
 'rest_theta':math.pi/2,'virtual_pivot_height':.8,'body_base_to_physics_pivot':.59,
 'controls':{'CTRL_Root':'translation from solver body base and common heading',
             'CTRL_Paw_L':'rigid pitch, Blender Y = theta - pi/2; game Z = pi/2 - theta',
             'CTRL_Paw_R':'same finite paired pitch; no independent extra motor or stamina'},
 'clips':[],'skins':0,'parts':[]}
for ob,label,target in zip(parts,['Paw_R','Body','Paw_L'],[7000,11000,7000]):
    ob.name='SM_'+label
    before=len(ob.data.polygons)
    modifier=ob.modifiers.new('Measured game reduction','DECIMATE');modifier.ratio=min(1,target/before)
    modifier.use_collapse_triangulate=True
    bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in ob.data.polygons:poly.use_smooth=True
    minimum,maximum=bounds(ob)
    pivot=Vector((0,(minimum.y+maximum.y)/2,.8)) if label!='Body' else Vector((0,0,0))
    ctrl=empty('CTRL_'+label,root,pivot) if label!='Body' else root
    ob.parent=ctrl
    for v in ob.data.vertices:v.co-=pivot
    ob.data.update()
    pts=[v.co+pivot for v in ob.data.vertices]
    rows=[]
    for height in [.12,.30,.48,.66,.84,1.02,1.20,1.38,1.56,1.70]:
        band=[p for p in pts if abs(p.z-height)<.075]
        if band:rows.append({'height':height,'min':[min(p[i] for p in band) for i in range(3)],'max':[max(p[i] for p in band) for i in range(3)]})
    report['parts'].append({'name':ob.name,'control':ctrl.name,'triangles_before':before,'triangles':len(ob.data.polygons),
       'vertices':len(ob.data.vertices),'minimum':list(minimum),'maximum':list(maximum),'pivot':list(pivot),'sections':rows})
    ob['role']='rigid independent paw weapon' if label!='Body' else 'upright seated body; no baked controls'
for ob in list(bpy.context.scene.objects):
    if ob not in [root,*root.children_recursive]:bpy.data.objects.remove(ob,do_unlink=True)
for image in bpy.data.images:
    if image.source=='FILE' and not image.packed_file:image.pack()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(OUT/'orange-tabby-prepared-v01.glb'),export_format='GLB',use_selection=True,
 export_animations=False,export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'orange-tabby-prepared-v01.blend'),compress=True)
report['total_triangles']=sum(p['triangles'] for p in report['parts'])
report['export_bytes']=(OUT/'orange-tabby-prepared-v01.glb').stat().st_size
report['export_sha256']=hashlib.sha256((OUT/'orange-tabby-prepared-v01.glb').read_bytes()).hexdigest()
report['source_unchanged']=hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED
(OUT/'measurements.json').write_text(json.dumps(report,indent=2)+'\n')
print('CAT_PREPARED',json.dumps({k:report[k] for k in ['total_triangles','export_bytes','source_unchanged']}),flush=True)
