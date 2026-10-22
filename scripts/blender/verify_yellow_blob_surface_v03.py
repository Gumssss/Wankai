import bpy,bmesh,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/source/yellow-blob/prepared-v03'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'yellow-blob-static-v03.glb'))
checks=[]
for obj in [o for o in bpy.context.scene.objects if o.type=='MESH']:
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001)
    checks.append({'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),'vertices_after_uv_seam_weld':len(bm.verts),'faces':len(bm.faces)})
    bm.free()
r=json.loads((OUT/'verification.json').read_text());r['surface_topology']=checks
(OUT/'verification.json').write_text(json.dumps(r,indent=2));print(json.dumps(checks))
