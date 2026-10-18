"""Refine the approved Tripo mesh into an independently hinged long-ear asset.

Retains source UVs and face/body surfaces. New seams are capped, and only the
middle of each ear is lengthened; the source root/tip curvature is retained.
"""
from pathlib import Path
import bpy, bmesh, json, math, sys
import numpy as np
from mathutils import Vector, Matrix, Color

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/blender/beagle-tripo-v03'
SOURCE = ROOT / 'assets/source/blender/beagle-ear-duelist-tripo-v03.blend'
EXPORT = ROOT / 'public/models/beagle-ear-duelist-tripo-v03.glb'
LENGTH, ANCHOR, SIDE, BIND = 3.6, 1.55, .66, -1.55
PREVIEW = '--preview-only' in sys.argv
if SOURCE.exists() and not PREVIEW and '--replace-generated' not in sys.argv:
    raise FileExistsError('Preserving ' + str(SOURCE))
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'base-repaired-40k.blend'))
s = bpy.context.scene
base = next(o for o in s.objects if o.type == 'MESH')
base.parent = None
base.matrix_world = Matrix.Identity(4)
for o in list(s.objects):
    if o != base: bpy.data.objects.remove(o, do_unlink=True)
base.name = 'REF_Tripo_Reduced_Original'
collections = {}
for name in ['00_Reference', '01_Tripo_Imports', '02_Working_Assets', '03_Collision_Proxies', '90_Presentation']:
    c = bpy.data.collections.new(name); s.collection.children.link(c); collections[name] = c

def move(obj, name):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collections[name].objects.link(obj)

move(base, '01_Tripo_Imports')
coat = base.data.materials[0]
coat.name = 'MAT_Beagle_Tripo_Coat'
coat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .85
texture = next(n.image for n in coat.node_tree.nodes if n.type == 'TEX_IMAGE')
tan = bpy.data.materials.new('MAT_Beagle_Ear_Tan'); tan.use_nodes = True
tan_color = Color((194/255, 125/255, 59/255)).from_srgb_to_scene_linear()
tan.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*tan_color,1)
tan.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .86
ear_uv = None
uvs = base.data.uv_layers.active
closest = min(base.data.polygons, key=lambda f: (f.center - Vector((.30, .82, .8))).length)
ear_uv = sum((uvs.data[i].uv for i in closest.loop_indices), Vector((0, 0))) / len(closest.loop_indices)

def threshold(z):
    # Keep feet/tail and the tiny torso; follow the inner ear groove above it.
    if z < .3: return .65
    if z < .42: return .65 + (.42 - .65) * ((z - .3) / .12)
    if z < .76: return .42
    if z < 1.0: return .42 + (.57 - .42) * ((z - .76) / .24)
    return .57

def audit(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    result = {'boundary_edges':sum(e.is_boundary for e in bm.edges),
              'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges),
              'nonmanifold_vertices':sum(not v.is_manifold for v in bm.verts)}
    bm.free(); obj.data.calc_loop_triangles()
    return dict(result, vertices=len(obj.data.vertices), triangles=len(obj.data.loop_triangles))

def repair_tiny_pinch(bm):
    # Tripo has one sub-millimetre edge with four adjacent faces at the left
    # cheek. Collapse that tiny edge and weld the resulting coincident seam
    # vertices. Splitting face fans here would reopen the coincident seam.
    bad = [e for e in bm.edges if not e.is_manifold and not e.is_boundary]
    for e in bad:
        assert e.calc_length() < .002, 'Unexpected large nonmanifold feature'
        verts = list(e.verts)
        bmesh.ops.pointmerge(bm, verts=verts, merge_co=(verts[0].co + verts[1].co) / 2)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-8, edges=list(bm.edges))
    seam = [v for v in bm.verts if not v.is_manifold]
    if seam:
        bmesh.ops.remove_doubles(bm, verts=seam, dist=1e-7)

def split_closed_fans(bm):
    # Once every edge has two faces, a remaining non-manifold vertex is two
    # closed face fans touching at a point. Separating those fans keeps both
    # surfaces closed; doing it earlier on open seams would create holes.
    for v in list(bm.verts):
        if v.is_manifold or not all(e.is_manifold for e in v.link_edges): continue
        pending = set(v.link_faces); fans = []
        while pending:
            seed = pending.pop(); fan = {seed}; stack = [seed]
            while stack:
                f = stack.pop()
                for e in f.edges:
                    if v not in e.verts: continue
                    for n in e.link_faces:
                        if n in pending: pending.remove(n); fan.add(n); stack.append(n)
            fans.append(fan)
        for fan in fans[1:]:
            edges = list({e for f in fan for e in f.edges if v in e.verts})
            bmesh.utils.vert_separate(v, edges)

def clip(obj, side, outer):
    bm = bmesh.new(); bm.from_mesh(obj.data)
    for v in bm.verts: v.co.y += side * (.57 - threshold(v.co.z))
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces),
        plane_co=(0, side * .57, 0), plane_no=(0, side, 0),
        dist=1e-7, clear_inner=outer, clear_outer=not outer)
    boundary = [e for e in bm.edges if e.is_boundary]
    filled = bmesh.ops.holes_fill(bm, edges=boundary, sides=0).get('faces', [])
    uv = bm.loops.layers.uv.active
    for f in filled:
        f.smooth = True
        if not outer: f.material_index = 1
        for loop in f.loops: loop[uv].uv = ear_uv
    capverts = set()
    if not outer and filled:
        poked = bmesh.ops.poke(bm, faces=filled)
        capfaces = poked['faces']
        edges = list({e for f in capfaces for e in f.edges})
        result = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True)
        capverts = {v for f in bm.faces if f.material_index == 1 for v in f.verts if v.co.y * side > 0}
    for v in bm.verts: v.co.y -= side * (.57 - threshold(v.co.z))
    for v in capverts:
        t = max(0, min(1, (v.co.z - .80) / .90))
        bulge = .055 * max(0, 1 - (v.co.x/.48)**2) * math.sin(math.pi*t)**2
        v.co.y += side * bulge
    repair_tiny_pinch(bm)
    # Collapsing the source pinch can expose a single tiny triangle. Close
    # only that bounded local repair after the main section has been capped.
    gaps = [e for e in bm.edges if e.is_boundary]
    assert len(gaps) <= 12, ('Unexpected repair boundary', len(gaps))
    for f in bmesh.ops.holes_fill(bm, edges=gaps, sides=0).get('faces', []):
        for loop in f.loops: loop[uv].uv = ear_uv
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    split_closed_fans(bm)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data); bm.free(); obj.data.update()

def duplicate(name):
    obj = bpy.data.objects.new(name, base.data.copy())
    collections['02_Working_Assets'].objects.link(obj)
    return obj

body = duplicate('SM_Beagle_Body')
body.data.materials.append(tan)
clip(body, 1, False); clip(body, -1, False)
ears = []
ear_reports = []
for side, name in [(-1, 'L'), (1, 'R')]:
    # Fit smooth cross-sections to the unaltered outer ear. This excludes the
    # head/ear intersection, which cannot be stretched as part of the paddle.
    points = np.array([tuple(v.co) for v in base.data.vertices if v.co.y*side>.64 and v.co.z>.30])
    z_low, z_top = float(points[:,2].min()), float(points[:,2].max())
    original_span = z_top - z_low
    anchor = Vector((0, side * SIDE, ANCHOR))
    rotation = Matrix.Rotation(BIND, 3, 'Y')
    profile = []
    for z in np.linspace(z_top-.025, z_low+.025, 43):
        band = points[np.abs(points[:,2]-z)<.025]
        if len(band)<8: band = points[np.argsort(np.abs(points[:,2]-z))[:20]]
        xmin, xmax = float(band[:,0].min()), float(band[:,0].max())
        cx, rx = (xmin+xmax)/2, (xmax-xmin)/2
        ends = band[np.abs(band[:,0]-cx)>.85*rx]
        cy = float(np.median(ends[:,1]*side))
        ry = max(.012, float((band[:,1]*side).max())-cy)
        profile.append([float(z),cx,cy,rx,ry])
    # Remove small sampling ripples without flattening the bowed lobe.
    for _ in range(4):
        prev = [row[:] for row in profile]
        for i in range(1,len(profile)-1):
            for j in range(1,5): profile[i][j]=(prev[i-1][j]+2*prev[i][j]+prev[i+1][j])/4
    inner = min(row[2]-row[4] for row in profile)
    radial = 28
    local = []
    for z,cx,cy,rx,ry in profile:
        distance = z_top-z
        t = max(0,min(1,(distance-.18)/(original_span-.36)))
        new_distance = distance+(LENGTH-original_span)*t*t*(3-2*t)
        for j in range(radial):
            a=j*math.tau/radial
            local.append(Vector((cx+rx*math.cos(a),side*(cy-inner+ry*math.sin(a)),new_distance)))
    root_center=Vector((profile[0][1],side*(profile[0][2]-inner),0))
    tip_center=Vector((profile[-1][1],side*(profile[-1][2]-inner),LENGTH))
    local.extend([root_center,tip_center])
    reach = max(v.length for v in local)
    reach_scale = LENGTH / reach
    vertices = [anchor+rotation@(p*reach_scale) for p in local]
    faces=[]
    for i in range(len(profile)-1):
        for j in range(radial):
            a=i*radial+j;b=i*radial+(j+1)%radial
            faces.append((a,b,b+radial,a+radial))
    for j in range(radial):
        faces.append((len(local)-2,(j+1)%radial,j))
        k=(len(profile)-1)*radial
        faces.append((k+j,k+(j+1)%radial,len(local)-1))
    data=bpy.data.meshes.new(name+'_Tripo_Ear_Profile');data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new('SM_Beagle_'+name+'_Ear',data);collections['02_Working_Assets'].objects.link(obj)
    obj.data.materials.append(tan)
    obj.data.uv_layers.new(name='UVMap')
    for p in obj.data.polygons:p.use_smooth=True
    bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    obj['source_ear_span'] = original_span
    obj['ear_reach'] = LENGTH
    obj['ear_bind_pitch'] = BIND
    obj['source_shape_preservation'] = 'Smooth cross-sections fitted to original ear; middle lengthened; rounded volume and bow retained'
    ear_reports.append({'side':name, 'original_span':original_span, 'reach_scale':reach_scale,
                        'local_source_vertices':[list(p * reach_scale) for p in local],
                        'socket':list(anchor), 'source_shape_retained':True,'source_cross_sections':profile})
    ears.append(obj)

base.hide_render = True; base.hide_set(True)
collections['01_Tripo_Imports'].hide_viewport = True

def reduce(obj, target):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    count = len(obj.data.polygons)
    if count > target:
        mod = obj.modifiers.new('Game Mesh Reduction', 'DECIMATE'); mod.ratio = target / count
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for f in obj.data.polygons: f.use_smooth = True

before_reduction = {o.name:audit(o) for o in [body] + ears}
print('BEFORE_REDUCTION', json.dumps(before_reduction), flush=True)
debug = {}
for obj in [body] + ears:
    bm = bmesh.new(); bm.from_mesh(obj.data)
    debug[obj.name] = [{'v':[list(v.co) for v in e.verts], 'faces':len(e.link_faces)} for e in bm.edges if not e.is_manifold]
    bm.free()
(OUT/'boundary-diagnostic.json').write_text(json.dumps(debug,indent=2)+'\n')
reduce(body, 18000)

def ellipsoid(name, center, scale, bone, material=coat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1, location=center)
    obj = bpy.context.object; obj.name = name; obj.scale = scale
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.clear(); obj.data.materials.append(material)
    if material == coat:
        for loop in obj.data.uv_layers.active.data: loop.uv = ear_uv
    for f in obj.data.polygons: f.use_smooth = True
    move(obj, '02_Working_Assets'); obj['rigid_bone'] = bone
    return obj

# Small rounded overlaps hide the unavoidable split of the joined generated
# head/ear surface. Their overlap is intentional and cosmetic.
covers = []
for side, name in [(-1,'L'),(1,'R')]:
    covers.append(ellipsoid(name + '_Ear_Root_Cover', (0, side * .635, ANCHOR - .035), (.16,.15,.17), 'head',tan))

meshes = [body] + ears + covers
geometry = {o.name:audit(o) for o in meshes}
for name, item in geometry.items():
    assert item['boundary_edges'] == 0 and item['nonmanifold_edges'] == 0, (name, item)
    assert item['nonmanifold_vertices'] == 0, (name, item)

if '--bake-textures' in sys.argv:
    # Reproject original high-resolution color and geometric normals onto a
    # fresh UV layout. Decimation cannot preserve the old atlas boundaries.
    texdir=ROOT/'assets/source/textures/beagle-tripo-v03';texdir.mkdir(parents=True,exist_ok=True)
    before=set(s.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/tripo/beagle-v02/original.glb'))
    imported=[o for o in s.objects if o not in before]
    high=next(o for o in imported if o.type=='MESH')
    corners=[high.matrix_world@Vector(c) for c in high.bound_box]
    lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
    k=1.7/(hi.z-lo.z)
    center=Vector(((hi.x+lo.x)/2,(hi.y+lo.y)/2,lo.z))
    transform=Matrix.Diagonal((k,k,k,1))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(-center)@high.matrix_world
    high.data.transform(transform);high.parent=None;high.matrix_world=Matrix.Identity(4);high.hide_render=False
    high.name='TEMP_Original_Tripo_Bake_Source'
    source_image=next(n.image for n in high.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
    bake_source=bpy.data.materials.new('TEMP_Bake_Emission');bake_source.use_nodes=True
    nodes=bake_source.node_tree.nodes;nodes.clear()
    im=nodes.new('ShaderNodeTexImage');im.image=source_image
    emission=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial')
    bake_source.node_tree.links.new(im.outputs['Color'],emission.inputs['Color'])
    bake_source.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
    high.data.materials.clear();high.data.materials.append(bake_source)
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012)
    bpy.ops.object.mode_set(mode='OBJECT')
    albedo=bpy.data.images.new('Beagle_v03_BaseColor',width=2048,height=2048,alpha=False)
    normals=bpy.data.images.new('Beagle_v03_Normal',width=1024,height=1024,alpha=False)
    normals.colorspace_settings.name='Non-Color'
    working=bpy.data.materials.new('MAT_Beagle_Baked_Coat');working.use_nodes=True
    bsdf=working.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Roughness'].default_value=.85
    target=working.node_tree.nodes.new('ShaderNodeTexImage');target.image=albedo
    working.node_tree.links.new(target.outputs['Color'],bsdf.inputs['Base Color'])
    working.node_tree.nodes.active=target
    body.data.materials[0]=working
    cap_target=tan.node_tree.nodes.new('ShaderNodeTexImage');cap_target.image=albedo;tan.node_tree.nodes.active=cap_target
    s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=1
    s.render.bake.use_selected_to_active=True;s.render.bake.cage_extrusion=.04
    s.render.bake.max_ray_distance=.16;s.render.bake.margin=12
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);high.select_set(True)
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.bake(type='EMIT')
    albedo.filepath_raw=str(texdir/'basecolor.png');albedo.file_format='PNG';albedo.save();albedo.pack()
    target.image=normals;cap_target.image=normals
    bpy.ops.object.bake(type='NORMAL',normal_space='TANGENT')
    normals.filepath_raw=str(texdir/'normal.png');normals.file_format='PNG';normals.save();normals.pack()
    target.image=albedo
    normal_tex=working.node_tree.nodes.new('ShaderNodeTexImage');normal_tex.image=normals
    normal_node=working.node_tree.nodes.new('ShaderNodeNormalMap')
    working.node_tree.links.new(normal_tex.outputs['Color'],normal_node.inputs['Color'])
    working.node_tree.links.new(normal_node.outputs['Normal'],bsdf.inputs['Normal'])
    tan.node_tree.nodes.remove(cap_target)
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    print('BAKE_COMPLETE',flush=True)

s.render.engine = 'BLENDER_EEVEE'
s.render.resolution_x, s.render.resolution_y = 1600, 1100
s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'
s.view_settings.view_transform = 'AgX'
s.world = bpy.data.worlds.new('Soft Neutral Studio'); s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.72,.74,.78,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
floor_mat = bpy.data.materials.new('Studio Floor'); floor_mat.use_nodes = True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.72,.70,.65,1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 1
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.012))
floor = bpy.context.object; floor.name = 'Studio Floor'; floor.data.materials.append(floor_mat); move(floor,'90_Presentation')
for name, loc, power, size in [('Soft Key',(4,-5,6),450,5),('Soft Fill',(1,4,3),220,4),('Rim',(-4,1,4),320,3)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object; light.name = name; light.data.energy = power
    light.data.shape = 'DISK'; light.data.size = size
    light.rotation_euler = (Vector((-.7,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    move(light,'90_Presentation')
bpy.ops.object.camera_add()
camera=bpy.context.object; camera.name='Beagle Tripo Review'; camera.data.type='ORTHO'; s.camera=camera; move(camera,'90_Presentation')

def camera_at(target, offset, scale):
    camera.location = Vector(target) + Vector(offset)
    camera.rotation_euler = (-Vector(offset)).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale = scale

camera_at((-.9,0,.95),(8,-10,4),5.9)
report={'source_glb':'assets/source/tripo/beagle-v02/original.glb','geometry':geometry,
        'triangles':sum(v['triangles'] for v in geometry.values()),'ear_bind_pitch':BIND,
        'ear_length':LENGTH,'ear_anchor_height':ANCHOR,'ear_socket_lateral':SIDE,'ear_details':ear_reports,
        'status':'geometry-preparation-preview'}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
if PREVIEW:
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('prepared-geometry.blend' if '--bake-textures' in sys.argv else 'geometry-preview.blend')),compress=True)
    s.render.filepath = str(OUT/'geometry-preview.png')
    bpy.ops.render.render(write_still=True)
    camera_at((.1,0,1.05),(10,-1,1.2),2.7)
    s.render.filepath = str(OUT/'face-preview.png')
    bpy.ops.render.render(write_still=True)
    print('GEOMETRY_PREVIEW',json.dumps({k:v for k,v in report.items() if k!='ear_details'}))
