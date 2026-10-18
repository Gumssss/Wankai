"""Inspect native Tripo parts before any editing, with optional normalized copy."""
from pathlib import Path
import bpy,bmesh,json,sys,math
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:]
source=ROOT/args[0];out=ROOT/args[1];out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
corners=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
k=1.7/(hi.z-lo.z);center=Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z))
normal=Matrix.Diagonal((k,k,k,1))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(-center)
report=[]
for obj in objects:
    transform=normal@obj.matrix_world;obj.data.transform(transform);obj.parent=None;obj.matrix_world=Matrix.Identity(4)
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-8)
    vertices=list(bm.verts)
    row={'name':obj.name,'vertices':len(vertices),'faces':len(bm.faces),
         'triangles':sum(len(f.verts)-2 for f in bm.faces),'boundary_edges':sum(e.is_boundary for e in bm.edges),
         'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),
         'min':[min(v.co[i] for v in vertices) for i in range(3)],
         'max':[max(v.co[i] for v in vertices) for i in range(3)]}
    report.append(row);bm.free()
print('PARTS_REPORT',json.dumps(report),flush=True)
(out/'parts-report.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'normalized-source.blend'),compress=True)
