"""Normalize and inspect a reduced working copy of the original Tripo mesh."""
from pathlib import Path
import bpy, bmesh, json, math
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/blender/beagle-tripo-v03'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/source/tripo/beagle-v02/original.glb'))
mesh = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bpy.context.view_layer.objects.active = mesh
mesh.select_set(True)
world = mesh.matrix_world.copy()
points = [world @ v.co for v in mesh.data.vertices]
low = Vector(tuple(min(v[i] for v in points) for i in range(3)))
high = Vector(tuple(max(v[i] for v in points) for i in range(3)))
scale = 1.7 / (high.z - low.z)
rot = Matrix.Rotation(math.pi / 2, 4, 'Z')
center = Vector(((high.x + low.x) / 2, (high.y + low.y) / 2, low.z))
for v, p in zip(mesh.data.vertices, points):
    v.co = (rot @ (p - center)) * scale
mesh.matrix_world = Matrix.Identity(4)
bm = bmesh.new(); bm.from_mesh(mesh.data)
original_edges = {'boundary':sum(e.is_boundary for e in bm.edges), 'nonmanifold':sum(not e.is_manifold for e in bm.edges)}
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bmesh.ops.dissolve_degenerate(bm, dist=1e-8, edges=list(bm.edges))
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
welded_edges = {'boundary':sum(e.is_boundary for e in bm.edges), 'nonmanifold':sum(not e.is_manifold for e in bm.edges)}
bm.to_mesh(mesh.data); bm.free()
dec = mesh.modifiers.new('Working Copy Reduction', 'DECIMATE')
dec.ratio = 40000 / len(mesh.data.polygons)
bpy.ops.object.modifier_apply(modifier=dec.name)
mesh.name = 'Tripo_40k_Working_Copy'
for p in mesh.data.polygons: p.use_smooth = True
bm = bmesh.new(); bm.from_mesh(mesh.data)
components=[]
seen=set()
for seed in bm.verts:
    if seed in seen: continue
    group=[]; stack=[seed]; seen.add(seed)
    while stack:
        v=stack.pop();group.append(v)
        for e in v.link_edges:
            n=e.other_vert(v)
            if n not in seen: seen.add(n);stack.append(n)
    if len(group)>10:
        components.append({'vertices':len(group),'min':[min(v.co[i] for v in group) for i in range(3)],'max':[max(v.co[i] for v in group) for i in range(3)]})
final_edges={'boundary':sum(e.is_boundary for e in bm.edges), 'nonmanifold':sum(not e.is_manifold for e in bm.edges)}
bm.free()
slices=[]
for z in [.6,.8,1,1.2,1.35,1.43,1.5,1.6]:
    group=[v.co for v in mesh.data.vertices if abs(v.co.z-z)<.02]
    lateral=[p for p in group if abs(p.y)>.6]
    slices.append({'z':z,'count':len(group),'lateral_count':len(lateral),
                   'x_min':min((p.x for p in lateral),default=0),'x_max':max((p.x for p in lateral),default=0),
                   'y_abs_min':min((abs(p.y) for p in lateral),default=0),'y_abs_max':max((abs(p.y) for p in lateral),default=0)})
report={'original_edges':original_edges,'welded_edges':welded_edges,'reduced_edges':final_edges,
        'vertices':len(mesh.data.vertices),'faces':len(mesh.data.polygons),
        'components':sorted(components,key=lambda c:c['vertices'],reverse=True),'slices':slices}
(OUT/'topology-analysis.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'base-40k.blend'),compress=True)
print(json.dumps(report))
