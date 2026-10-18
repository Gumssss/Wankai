"""Build a rigid ear-weapon rig from the preferred original Tripo model, separated into parts.

Preserves the downloaded original GLB and v01 source.
Blender +X = forward, +Z = up. Runtime glTF +Y = up.
"""
from pathlib import Path
import bpy, bmesh, json, math, sys
from mathutils import Matrix, Vector, Color
from mathutils.bvhtree import BVHTree

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/blender/beagle-tripo-v05';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets/source/tripo/beagle-v05/original-separated.glb'
DEST=ROOT/'assets/source/blender/beagle-smooth-ear-duelist-v05.blend'
GLB=ROOT/'public/models/beagle-smooth-ear-duelist-v05.glb'
TEX=ROOT/'assets/source/textures/beagle-tripo-v05';TEX.mkdir(parents=True,exist_ok=True)
REACH,BIND=3.6,-1.55
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s=bpy.context.scene
parts={int(o.name.split('tripo_part_')[-1].split('.')[0]):o for o in s.objects if o.type=='MESH' and 'tripo_part_' in o.name}
assert set(parts)==set(range(13)),list(parts)
corners=[o.matrix_world@Vector(c) for o in parts.values() for c in o.bound_box]
lo=Vector(tuple(min(v[i] for v in corners) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in corners) for i in range(3)))
k=1.7/(hi.z-lo.z)
normal=Matrix.Diagonal((k,k,k,1))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(Vector((-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z)))
for obj in parts.values():
    obj.data.transform(normal@obj.matrix_world);obj.parent=None;obj.matrix_world=Matrix.Identity(4)
for o in list(s.objects):
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
collections={}
for name in ('02_Working_Assets','03_Collision_Proxies','90_Presentation'):
    c=bpy.data.collections.new(name);s.collection.children.link(c);collections[name]=c
def move(obj,c):
    for col in list(obj.users_collection):col.objects.unlink(obj)
    collections[c].objects.link(obj)
for obj in parts.values():move(obj,'02_Working_Assets')

cap_tan=bpy.data.materials.new('TEMP_Cap_Tan');cap_tan.use_nodes=True
cap_white=bpy.data.materials.new('TEMP_Cap_White');cap_white.use_nodes=True
for mat,color in ((cap_tan,'C6803D'),(cap_white,'FFF7E8')):
    c=Color(tuple(int(color[i:i+2],16)/255 for i in (0,2,4))).from_srgb_to_scene_linear()
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*c,1)

cleanup={}
for idx,obj in parts.items():
    bm=bmesh.new();bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7)
    # Tiny disconnected floating fragments are reconstruction noise, not anatomy.
    unseen=set(bm.verts);components=[]
    while unseen:
        seed=unseen.pop();comp={seed};queue=[seed]
        while queue:
            current=queue.pop()
            for e in current.link_edges:
                v=e.other_vert(current)
                if v in unseen:unseen.remove(v);comp.add(v);queue.append(v)
        components.append(comp)
    fragments=[v for c in components if len(c)<8 for v in c]
    bmesh.ops.delete(bm,geom=fragments,context='VERTS')
    spurs=[]
    fan_repairs=0
    for attempt in range(30):
        fans=[e for e in bm.edges if len(e.link_faces)>2]
        if not fans:break
        face=min(fans[0].link_faces,key=lambda f:f.calc_area())
        bmesh.ops.delete(bm,geom=[face],context='FACES_ONLY');fan_repairs+=1
    boundaries=[e for e in bm.edges if e.is_boundary]
    capped=bmesh.ops.holes_fill(bm,edges=boundaries,sides=0).get('faces',[]) if boundaries else []
    for f in capped:f.material_index=1
    if idx in (1,2):
        # Rebuild the previously hidden inner surface with a softly rounded
        # dome instead of stretching one flat cap along the entire weapon.
        direction=Vector((0,-1 if idx==1 else 1,0))
        for face in capped:
            boundary=list(face.verts)
            center=sum((v.co for v in boundary),Vector())/len(boundary)
            previous=boundary
            bmesh.ops.delete(bm,geom=[face],context='FACES_ONLY')
            for factor in (.67,.33):
                ring=[bm.verts.new(center+(v.co-center)*factor+direction*.09*(1-factor*factor)) for v in boundary]
                for i in range(len(ring)):
                    f=bm.faces.new((previous[i],previous[(i+1)%len(ring)],ring[(i+1)%len(ring)],ring[i]));f.material_index=1
                previous=ring
            tip=bm.verts.new(center+direction*.09)
            for i in range(len(previous)):
                f=bm.faces.new((previous[i],previous[(i+1)%len(previous)],tip));f.material_index=1
    obj.data.materials.append(cap_tan if idx in (0,1,2,6,10,12) else cap_white)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    cleanup[idx]={'tiny_fragment_vertices_removed':len(fragments),'hidden_fill_spur_vertices_removed':len(spurs),'cap_faces':len(capped),'fan_faces_removed':fan_repairs}
    bm.to_mesh(obj.data);obj.data.update()
    bm.free()
    if idx in (0,1,2):
        # Regularize the new closed inner surfaces. The fine voxel size keeps
        # the original exterior silhouette while removing long cap fans.
        source_surface=BVHTree.FromPolygons([v.co.copy() for v in obj.data.vertices],
            [list(p.vertices) for p in obj.data.polygons],all_triangles=True)
        source_materials=[p.material_index for p in obj.data.polygons]
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Smooth Closed Attachment Surfaces','REMESH');mod.mode='VOXEL';mod.voxel_size=.008
        mod.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=mod.name)
        smooth=obj.modifiers.new('Soft Surface Relaxation','SMOOTH');smooth.factor=.4;smooth.iterations=3
        bpy.ops.object.modifier_apply(modifier=smooth.name)
        for p in obj.data.polygons:
            _,_,nearest,_=source_surface.find_nearest(p.center)
            if nearest is not None:p.material_index=source_materials[nearest]
        bm=bmesh.new();bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    budgets={0:10000,1:3500,2:3500,3:2000,4:700,5:600,6:1200,7:600,8:500,9:800,10:1200,11:500,12:400}
    if len(obj.data.polygons)>budgets[idx]:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Game Resolution','DECIMATE');mod.ratio=budgets[idx]/len(obj.data.polygons)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    # Remove tiny defective fans inherited from the AI source/reduction and
    # close each local neighbourhood before rigging, not after skin weights.
    bm=bmesh.new();bm.from_mesh(obj.data)
    for attempt in range(4):
        bad=[e for e in bm.edges if not e.is_manifold]
        if not bad:break
        centers=[sum((v.co for v in e.verts),Vector())/2 for e in bad]
        patch=[f for f in bm.faces if any((v.co-c).length<.008 for v in f.verts for c in centers)]
        bmesh.ops.delete(bm,geom=patch,context='FACES_ONLY')
        bmesh.ops.delete(bm,geom=[e for e in bm.edges if not e.link_faces],context='EDGES')
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_edges],context='VERTS')
        bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=0)
        bmesh.ops.triangulate(bm,faces=list(bm.faces))
    assert all(e.is_manifold for e in bm.edges),(idx,'unresolved topology')
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(obj.data);bm.free()
    obj.vertex_groups.new(name='PART_'+str(idx)).add(list(range(len(obj.data.vertices))),1,'REPLACE')


def material(name,hexcolor):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    c=Color(tuple(int(hexcolor[i:i+2],16)/255 for i in (0,2,4))).from_srgb_to_scene_linear()
    p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.88
    p.inputs['Specular IOR Level'].default_value=.18
    return m
tan=material('MAT_Beagle_Joint_Soft','C6803D')
accent=material('MAT_Player_Accent','C4684F')

def assign(obj,bone):
    obj.vertex_groups.clear();obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    for p in obj.data.polygons:p.use_smooth=True

# Bake the exact earlier Tripo paint onto a new game-resolution UV atlas.
# Segmentation/reduction changes topology; reprojecting avoids damaged face UVs.
bpy.ops.object.select_all(action='DESELECT')
for o in parts.values():o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();target=bpy.context.object
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.008)
bpy.ops.object.mode_set(mode='OBJECT')
albedo=bpy.data.images.new('Beagle_v05_BaseColor_2K',width=2048,height=2048,alpha=False)
coat=material('MAT_Beagle_Smooth_Coat','FFFFFF')
texture=coat.node_tree.nodes.new('ShaderNodeTexImage');texture.image=albedo
coat.node_tree.nodes.active=texture
cap_indices={p.index:(1 if target.data.materials[p.material_index]==cap_tan else 2)
    for p in target.data.polygons if target.data.materials[p.material_index] in (cap_tan,cap_white)}
target.data.materials.clear()
for mat in (coat,cap_tan,cap_white):target.data.materials.append(mat)
for f in target.data.polygons:f.material_index=cap_indices.get(f.index,0)
for mat in (cap_tan,cap_white):
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=albedo;mat.node_tree.nodes.active=node
before=set(s.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/tripo/beagle-v02/original.glb'))
imported=[o for o in s.objects if o not in before];high=next(o for o in imported if o.type=='MESH')
cs=[high.matrix_world@Vector(c) for c in high.bound_box]
low=Vector(tuple(min(v[i] for v in cs) for i in range(3)));upper=Vector(tuple(max(v[i] for v in cs) for i in range(3)))
scale=1.7/(upper.z-low.z)
transform=Matrix.Diagonal((scale,scale,scale,1))@Matrix.Rotation(math.pi/2,4,'Z')@Matrix.Translation(Vector((-(upper.x+low.x)/2,-(upper.y+low.y)/2,-low.z)))@high.matrix_world
high.data.transform(transform);high.parent=None;high.matrix_world=Matrix.Identity(4)
source_image=next(n.image for n in high.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE' and n.image.colorspace_settings.name=='sRGB')
em=bpy.data.materials.new('TEMP_Original_Coat');em.use_nodes=True;nodes=em.node_tree.nodes;nodes.clear()
im=nodes.new('ShaderNodeTexImage');im.image=source_image
emission=nodes.new('ShaderNodeEmission');output=nodes.new('ShaderNodeOutputMaterial')
em.node_tree.links.new(im.outputs['Color'],emission.inputs['Color']);em.node_tree.links.new(emission.outputs[0],output.inputs['Surface'])
high.data.materials.clear();high.data.materials.append(em)
s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=1
s.render.bake.use_selected_to_active=True;s.render.bake.cage_extrusion=.025
s.render.bake.max_ray_distance=.09;s.render.bake.margin=10
bpy.ops.object.select_all(action='DESELECT');target.select_set(True);high.select_set(True);bpy.context.view_layer.objects.active=target
bpy.ops.object.bake(type='EMIT')
for o in imported:bpy.data.objects.remove(o,do_unlink=True)
# Composite uniform closed inner surfaces over the projected source paint.
# This is a UV-to-UV bake, so it does not alter any painted facial features.
final_atlas=bpy.data.images.new('Beagle_v05_Final_BaseColor_2K',width=2048,height=2048,alpha=False)
temporary=[]
for mat in (coat,cap_tan,cap_white):
    nodes=mat.node_tree.nodes;emit=nodes.new('ShaderNodeEmission')
    if mat==coat:mat.node_tree.links.new(texture.outputs['Color'],emit.inputs['Color'])
    else:emit.inputs['Color'].default_value=nodes.get('Principled BSDF').inputs['Base Color'].default_value
    mat.node_tree.links.new(emit.outputs[0],nodes.get('Material Output').inputs['Surface'])
    target_node=nodes.new('ShaderNodeTexImage');target_node.image=final_atlas;nodes.active=target_node
    temporary.append((mat,emit,target_node))
s.render.bake.use_selected_to_active=False
bpy.ops.object.select_all(action='DESELECT');target.select_set(True);bpy.context.view_layer.objects.active=target
bpy.ops.object.bake(type='EMIT')
for mat,emit,target_node in temporary:
    mat.node_tree.nodes.remove(emit);mat.node_tree.nodes.remove(target_node)
    mat.node_tree.links.new(mat.node_tree.nodes.get('Principled BSDF').outputs[0],mat.node_tree.nodes.get('Material Output').inputs['Surface'])
texture.image=final_atlas
coat.node_tree.links.new(texture.outputs['Color'],coat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
final_atlas.filepath_raw=str(TEX/'basecolor.png');final_atlas.file_format='PNG';final_atlas.save();final_atlas.pack()
target.data.materials.clear();target.data.materials.append(coat)
for f in target.data.polygons:f.material_index=0
# Recover independently selectable native parts from their retained group IDs.
parts={}
for idx in range(13):
    group=target.vertex_groups['PART_'+str(idx)]
    wanted={v.index for v in target.data.vertices if any(g.group==group.index for g in v.groups)}
    copy=target.copy();copy.data=target.data.copy();collections['02_Working_Assets'].objects.link(copy)
    bm=bmesh.new();bm.from_mesh(copy.data);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in wanted],context='VERTS')
    bm.to_mesh(copy.data);bm.free();copy.name='tripo_part_'+str(idx);copy.vertex_groups.clear();parts[idx]=copy
bpy.data.objects.remove(target,do_unlink=True)
parts[9].data.materials.clear();parts[9].data.materials.append(accent)
print('ORIGINAL_COAT_REPROJECTED',flush=True)

mapping={0:'head',3:'body_pitch',4:'tail',5:'R_paw',6:'L_lid',7:'L_paw',8:'body_pitch',9:'body_pitch',10:'R_lid',11:'body_pitch',12:'head'}
for idx,bone in mapping.items():assign(parts[idx],bone)

# Small facial controls use the original surfaces. Existing eye volumes retract
# under the upper lids for a blink; the neutral paint/face is unchanged.
head_mesh=parts[0]
for name in ('jaw','L_brow','R_brow'):head_mesh.vertex_groups.new(name=name)
def clamp(v):return max(0,min(1,v))
for v in head_mesh.data.vertices:
    x,y,z=v.co
    jaw=.85*clamp((.95-z)/.18)*clamp((x-.28)/.20)
    brow=max(0,1-abs(abs(y)-.30)/.20)*max(0,1-abs(z-1.32)/.17)*clamp((x-.25)/.20)*.75
    weight=max(jaw,brow)
    if weight>.001:
        group='jaw' if jaw>=brow else ('L_brow' if y<0 else 'R_brow')
        head_mesh.vertex_groups['head'].add([v.index],1-weight,'REPLACE')
        head_mesh.vertex_groups[group].add([v.index],weight,'REPLACE')

# Keep a light, compact comparison of the Tripo appearance before weapon edits.
bpy.ops.object.select_all(action='DESELECT')
for o in parts.values():o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/beagle-smooth-appearance-v05.glb'),
    export_format='GLB',use_selection=True,export_yup=True,export_skins=False,export_animations=False)

core_bound=max(abs(v.co.y) for idx,o in parts.items() if idx not in (1,2) for v in o.data.vertices)
ear_specs={};rotation=Matrix.Rotation(BIND,3,'Y')
for idx,side,label in ((2,-1,'L'),(1,1,'R')):
    obj=parts[idx];vertices=obj.data.vertices
    top=max(v.co.z for v in vertices);bottom=min(v.co.z for v in vertices)
    root=[v.co for v in vertices if v.co.z>top-.16]
    pivot=Vector((sum(v.x for v in root)/len(root),sum(v.y for v in root)/len(root),top-.13))
    inner=min(side*v.co.y for v in vertices)
    lateral=max(0,core_bound+.035-inner)
    pivot.y+=side*lateral
    old_span=pivot.z-bottom;extra=REACH-old_span;local=[]
    for v in vertices:
        distance=pivot.z-v.co.z
        t=max(0,min(1,(distance-.17)/(old_span-.17-.22)))
        extension=extra*t*t*(3-2*t)
        p=Vector((-(v.co.x-pivot.x),v.co.y+side*lateral-pivot.y,distance+extension))
        local.append(p.copy());v.co=pivot+rotation@p
    assign(obj,label+'_ear_swing')
    # The original ears are plain tan. A shared matte colour keeps newly
    # created inner surfaces visually continuous with the rounded outside.
    obj.data.materials.clear();obj.data.materials.append(tan)
    for poly in obj.data.polygons:poly.material_index=0
    obj.name='SM_Beagle_'+label+'_Ear'
    ear_specs[label]={'pivot':list(pivot),'local_vertices':[list(p) for p in local],
        'length':REACH,'lateral_shift':lateral,'source_span':old_span,
        'minimum_inner_side':min(side*v.co.y for v in vertices)}
    # Rounded root bridge lies on the hinge axis. It is head-bound and can
    # overlap the ear's round root without changing the striking silhouette.
    start=side*(core_bound-.06);end=pivot.y
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(pivot.x,(start+end)/2,pivot.z))
    bridge=bpy.context.object;bridge.name=label+'_Soft_Root_Cover'
    bridge.scale=(.14,abs(end-start)/2+.10,.14)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bridge.data.materials.append(tan);assign(bridge,'head');move(bridge,'02_Working_Assets')

arm=bpy.data.armatures.new('Beagle Smooth Weapon Skeleton')
rig=bpy.data.objects.new('ARM_BeagleSmoothDuelist',arm);collections['02_Working_Assets'].objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
specs=[('root',(0,0,0),None),('body_pitch',(0,0,.85),'root'),('head',(0,0,1.18),'body_pitch'),
       ('L_ear_swing',ear_specs['L']['pivot'],'head'),('R_ear_swing',ear_specs['R']['pivot'],'head'),
       ('L_paw',(.12,-.27,.53),'body_pitch'),('R_paw',(.12,.27,.53),'body_pitch'),
       ('tail',(-.17,.20,.24),'body_pitch'),('jaw',(.45,0,.84),'head'),
       ('L_brow',(.40,-.30,1.32),'head'),('R_brow',(.40,.30,1.32),'head'),
       ('L_lid',(.40,-.30,1.30),'head'),('R_lid',(.40,.30,1.30),'head')]
for name,p,parent in specs:
    b=arm.edit_bones.new(name);b.head=p;b.tail=Vector(p)+Vector((0,.15,0))
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
meshes=list(collections['02_Working_Assets'].objects)
meshes=[o for o in meshes if o.type=='MESH']
for obj in meshes:
    obj.parent=rig;mod=obj.modifiers.new('Character Skeleton','ARMATURE');mod.object=rig
for b in rig.pose.bones:b.rotation_mode='XYZ'
rig['ear_bind_pitch']=BIND;rig['ear_length']=REACH
rig['ear_pitch_control']='local Y = physical pitch minus bind pitch'
rig['asset_status']='Rigged smooth-ear appearance draft. Runtime physics integration pending.'

for frame,value in ((1,1),(12,1),(15,.035),(17,.035),(20,1),(31,1)):
    for name in ('L_lid','R_lid'):
        rig.pose.bones[name].scale.z=value
        rig.pose.bones[name].keyframe_insert(data_path='scale',frame=frame)
rig.animation_data.action.name='Beagle_Blink'
s.frame_start=1;s.frame_end=31;s.render.fps=30;s.frame_set(1)

# Four authoring meshes, with a shared coat atlas and a separate player bib.
body_objects=[o for o in meshes if o not in (parts[1],parts[2],parts[9])]
bpy.ops.object.select_all(action='DESELECT')
for o in body_objects:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
body=bpy.context.object;body.name='SM_Beagle_Body'
parts[9].name='SM_Beagle_Player_Accent'
meshes=[body,parts[1],parts[2],parts[9]]

# Each hidden convex guide is fitted to a section of the actual full-volume ear.
# They are source authoring aids, excluded from GLB; no old thin profile reused.
for label,info in ear_specs.items():
    points=[Vector(p) for p in info['local_vertices']];pivot=Vector(info['pivot'])
    info['convex_sections']=[]
    for i,(a,b) in enumerate(((-.14,.6),(.45,1.35),(1.2,2.1),(1.95,2.85),(2.7,3.61))):
        section=[p for p in points if a<=p.z<=b]
        bm=bmesh.new()
        for p in section:bm.verts.new(pivot+rotation@p)
        hull=bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False)
        unused=set(hull.get('geom_unused',[])+hull.get('geom_interior',[]))
        bmesh.ops.delete(bm,geom=[v for v in unused if isinstance(v,bmesh.types.BMVert) and v.is_valid],context='VERTS')
        mesh=bpy.data.meshes.new(f'COL_{label}_{i}');bm.to_mesh(mesh);bm.free()
        o=bpy.data.objects.new(mesh.name,mesh);collections['03_Collision_Proxies'].objects.link(o)
        o.hide_render=True;o.display_type='WIRE';assign(o,label+'_ear_swing');o.parent=rig
        mod=o.modifiers.new('Follow Ear','ARMATURE');mod.object=rig
        info['convex_sections'].append({'range':[a,b],'vertices':len(mesh.vertices)})
collections['03_Collision_Proxies'].hide_viewport=True

report={'status':'rigged-asset-measurements','source':str(SOURCE.relative_to(ROOT)),
        'blender':bpy.app.version_string,'body_height':1.7,'ear_bind_pitch':BIND,
        'bones':[x[0] for x in specs],'core_lateral_bound':core_bound,
        'ear_specs':ear_specs,'geometry':{},
        'source_cleanup':cleanup,'atlas_source_images':1,
        'note':'Asset geometry measurements for contact fitting. Runtime behavior is verified separately by the game tests.'}
for o in meshes:
    o.data.calc_loop_triangles()
    bm=bmesh.new();bm.from_mesh(o.data)
    report['geometry'][o.name]={'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),
        'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges)}
    assert all(e.is_manifold for e in bm.edges),(o.name,'nonmanifold edges')
    bm.free()
report['triangles']=sum(v['triangles'] for v in report['geometry'].values())
assert report['triangles']<35000,report['triangles']
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,
    export_skins=True,export_influence_nb=4,export_extras=True,export_animations=True,
    export_animation_mode='ACTIONS',export_force_sampling=False,export_frame_range=True,
    export_rest_position_armature=True,export_optimize_animation_keep_anim_armature=False)

# A neutral studio is stored in the editable file, not in the runtime asset.
s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1600;s.render.resolution_y=1100;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX'
s.world=bpy.data.worlds.new('Soft Studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.74,.78,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
for name,loc,power,size in [('Key',(4,-5,7),500,5),('Fill',(1,5,4),300,4),('Rim',(-5,1,6),400,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name
    o.data.energy=power;o.data.shape='DISK';o.data.size=size
    o.rotation_euler=(Vector((-.7,0,1))-o.location).to_track_quat('-Z','Y').to_euler();move(o,'90_Presentation')
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));floor=bpy.context.object
floor.data.materials.append(material('Studio Floor','E9E5DC'));move(floor,'90_Presentation')
bpy.ops.object.camera_add();camera=bpy.context.object;camera.name='Beagle Review';camera.data.type='ORTHO';s.camera=camera;move(camera,'90_Presentation')
def view(target,offset,scale):
    camera.location=Vector(target)+Vector(offset);camera.rotation_euler=(-Vector(offset)).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
view((-.9,0,1.1),(7,-10,4),5.8)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=Vector((-.9,0,1));area.spaces.active.region_3d.view_distance=6
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(DEST),compress=True)
(OUT/'blender-report.json').write_text(json.dumps(report,indent=2)+'\n')
tracked_report=ROOT/'assets/concepts/beagle/tripo-v05/rig-report.json'
tracked_report.parent.mkdir(parents=True,exist_ok=True)
tracked_report.write_text(json.dumps(report,indent=2)+'\n')
if '--render' in sys.argv:
    for name,target,offset,scale in [('review',(-.9,0,1.1),(7,-10,4),5.8),('front',(-.9,0,1.1),(10,0,1),5.8),('face',(.12,0,1.06),(10,-1,1),2.4)]:
        view(target,offset,scale);s.render.filepath=str(ROOT/f'docs/beagle-smooth-v05-{name}.png');bpy.ops.render.render(write_still=True)
print('BEAGLE_V05_READY',report['triangles'],flush=True)
