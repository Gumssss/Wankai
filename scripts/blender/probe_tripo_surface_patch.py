"""Test a bounded source-surface repair independently of ear editing."""
from pathlib import Path
import bpy, bmesh, json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/blender/beagle-tripo-v03'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'base-40k.blend'))
o=next(o for o in bpy.context.scene.objects if o.type=='MESH')
b=bmesh.new();b.from_mesh(o.data)
bad=[e for e in b.edges if not e.is_manifold]
assert len(bad)==1
center=sum((v.co for v in bad[0].verts),Vector())/2
faces=[f for f in b.faces if any((v.co-center).length<.012 for v in f.verts)]
count=len(faces)
uv=b.loops.layers.uv.active
bmesh.ops.delete(b,geom=faces,context='FACES')
edges=[e for e in b.edges if e.is_boundary]
before=len(edges)
old_uv={v:next((l[uv].uv.copy() for f in v.link_faces for l in f.loops if l.vert==v),Vector((0,0))) for e in edges for v in e.verts}
filled=bmesh.ops.holes_fill(b,edges=edges,sides=0).get('faces',[])
for f in filled:
    for l in f.loops:l[uv].uv=old_uv[l.vert]
bmesh.ops.triangulate(b,faces=list(filled));bmesh.ops.recalc_face_normals(b,faces=list(b.faces))
result={'center':list(center),'radius':.012,'removed_faces':count,'patch_boundary_edges':before,
        'boundary_edges':sum(e.is_boundary for e in b.edges),'nonmanifold_edges':sum(not e.is_manifold for e in b.edges),
        'nonmanifold_vertices':sum(not v.is_manifold for v in b.verts)}
(OUT/'surface-repair-report.json').write_text(json.dumps(result,indent=2)+'\n')
print('PATCH_RESULT',json.dumps(result))
assert result['nonmanifold_edges']==0 and result['nonmanifold_vertices']==0
b.to_mesh(o.data);b.free();o.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'base-repaired-40k.blend'),compress=True)
