"""Build a rigid ear-weapon rig from the preserved, separately generated Tripo parts.

Run only after texturing/retopology. Never edits the downloaded GLB or v01 source.
Blender +X = forward, +Z = up. Runtime glTF +Y = up.
"""
from pathlib import Path
import bpy, bmesh, json, math, sys
import numpy as np
from mathutils import Matrix, Vector, Color

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/blender/beagle-tripo-v04';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets/source/tripo/beagle-v04/textured-parts.glb'
DEST=ROOT/'assets/source/blender/beagle-plush-ear-duelist-v04.blend'
GLB=ROOT/'public/models/beagle-plush-ear-duelist-v04.glb'
TEX=ROOT/'assets/source/textures/beagle-tripo-v04';TEX.mkdir(parents=True,exist_ok=True)
REACH,BIND=3.6,-1.55
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s=bpy.context.scene
parts={int(o.name.split('tripo_part_')[-1].split('.')[0]):o for o in s.objects if o.type=='MESH' and 'tripo_part_' in o.name}
assert set(parts)==set(range(11)),list(parts)
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
    # AI completion introduced a small hidden attachment spur on the left of
    # the head. Bound only that generated fill to the original skull width.
    spurs=[v for v in bm.verts if idx==0 and abs(v.co.y)>.64]
    bmesh.ops.delete(bm,geom=spurs,context='VERTS')
    fan_repairs=0
    for attempt in range(30):
        fans=[e for e in bm.edges if len(e.link_faces)>2]
        if not fans:break
        face=min(fans[0].link_faces,key=lambda f:f.calc_area())
        bmesh.ops.delete(bm,geom=[face],context='FACES_ONLY');fan_repairs+=1
    boundaries=[e for e in bm.edges if e.is_boundary]
    capped=bmesh.ops.holes_fill(bm,edges=boundaries,sides=0).get('faces',[]) if boundaries else []
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bmesh.ops.triangulate(bm,faces=list(bm.faces))
    cleanup[idx]={'tiny_fragment_vertices_removed':len(fragments),'hidden_fill_spur_vertices_removed':len(spurs),'cap_faces':len(capped),'fan_faces_removed':fan_repairs}
    bm.to_mesh(obj.data);obj.data.update()
    bm.free()
    # Full topology validation occurs after optional source-specific repairs.

def material(name,hexcolor):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    c=Color(tuple(int(hexcolor[i:i+2],16)/255 for i in (0,2,4))).from_srgb_to_scene_linear()
    p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.88
    p.inputs['Specular IOR Level'].default_value=.18
    return m
tan=material('MAT_Beagle_Joint_Plush','D3A45F')
accent=material('MAT_Player_Accent','C4684F')

def assign(obj,bone):
    obj.vertex_groups.clear();obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE')
    for p in obj.data.polygons:p.use_smooth=True

# Consolidate source base-colour images into one atlas without rebaking/shifting
# any painted facial features. Each original UV island stays within its tile.
source_mats=[]
for idx,obj in parts.items():
    if idx==5:continue
    for m in obj.data.materials:
        if m not in source_mats:source_mats.append(m)
images_by_material={}
for m in source_mats:
    image_nodes=[n for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.colorspace_settings.name=='sRGB']
    images_by_material[m]=image_nodes[0].image if image_nodes else None
tile_keys=[]
for m,img in images_by_material.items():
    key=img if img else m
    if key not in tile_keys:tile_keys.append(key)
tiles=math.ceil(math.sqrt(len(tile_keys)));resolution=2048
tile=resolution//tiles
atlas_pixels=np.ones((resolution,resolution,4),dtype=np.float32)
slots={}
for m in source_mats:
    image=images_by_material[m];key=image if image else m;i=tile_keys.index(key)
    nodes=m.node_tree.nodes
    bsdf=nodes.get('Principled BSDF')
    x,y=i%tiles,i//tiles;slots[m]=(x,y)
    if image:
        image=image.copy();image.scale(tile,tile)
        pix=np.array(image.pixels[:],dtype=np.float32).reshape(tile,tile,4)
    else:
        rgba=bsdf.inputs['Base Color'].default_value[:] if bsdf else (1,1,1,1)
        pix=np.broadcast_to(rgba,(tile,tile,4))
    atlas_pixels[y*tile:(y+1)*tile,x*tile:(x+1)*tile]=pix
atlas=bpy.data.images.new('Beagle_v04_BaseColor_2K',width=resolution,height=resolution,alpha=False)
atlas.pixels.foreach_set(atlas_pixels.ravel());atlas.filepath_raw=str(TEX/'basecolor.png');atlas.file_format='PNG';atlas.save();atlas.pack()
coat=material('MAT_Beagle_Plush_Coat','FFFFFF')
tex=coat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Linear'
coat.node_tree.links.new(tex.outputs['Color'],coat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for idx,obj in parts.items():
    if idx==5:
        obj.data.materials.clear();obj.data.materials.append(accent)
    else:
        uv=obj.data.uv_layers.active
        assert uv,obj.name+' missing UV'
        for poly in obj.data.polygons:
            x,y=slots[obj.data.materials[poly.material_index]]
            for loop in poly.loop_indices:uv.data[loop].uv=(uv.data[loop].uv+Vector((x,y)))/tiles
        obj.data.materials.clear();obj.data.materials.append(coat)
    for poly in obj.data.polygons:poly.material_index=0

mapping={0:'head',3:'body_pitch',4:'tail',5:'body_pitch',6:'L_paw',7:'R_paw',8:'jaw',9:'head',10:'jaw'}
for idx,bone in mapping.items():assign(parts[idx],bone)

# Keep a light, compact comparison of the Tripo appearance before weapon edits.
bpy.ops.object.select_all(action='DESELECT')
for o in parts.values():o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/beagle-plush-appearance-v04.glb'),
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

arm=bpy.data.armatures.new('Beagle Plush Weapon Skeleton')
rig=bpy.data.objects.new('ARM_BeaglePlushDuelist',arm);collections['02_Working_Assets'].objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
specs=[('root',(0,0,0),None),('body_pitch',(0,0,.85),'root'),('head',(0,0,1.18),'body_pitch'),
       ('L_ear_swing',ear_specs['L']['pivot'],'head'),('R_ear_swing',ear_specs['R']['pivot'],'head'),
       ('L_paw',(.12,-.27,.53),'body_pitch'),('R_paw',(.12,.27,.53),'body_pitch'),
       ('tail',(-.17,.20,.24),'body_pitch'),('jaw',(.43,0,.82),'head')]
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
rig['asset_status']='Rigged appearance draft. Runtime physics integration pending.'

# Four authoring meshes, with a shared coat atlas and a separate player bib.
body_objects=[o for o in meshes if o not in (parts[1],parts[2],parts[5])]
bpy.ops.object.select_all(action='DESELECT')
for o in body_objects:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
body=bpy.context.object;body.name='SM_Beagle_Body'
parts[5].name='SM_Beagle_Player_Accent'
meshes=[body,parts[1],parts[2],parts[5]]

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
        bmesh.ops.delete(bm,geom=hull.get('geom_unused',[])+hull.get('geom_interior',[]),context='VERTS')
        mesh=bpy.data.meshes.new(f'COL_{label}_{i}');bm.to_mesh(mesh);bm.free()
        o=bpy.data.objects.new(mesh.name,mesh);collections['03_Collision_Proxies'].objects.link(o)
        o.hide_render=True;o.display_type='WIRE';assign(o,label+'_ear_swing');o.parent=rig
        mod=o.modifiers.new('Follow Ear','ARMATURE');mod.object=rig
        info['convex_sections'].append({'range':[a,b],'vertices':len(mesh.vertices)})
collections['03_Collision_Proxies'].hide_viewport=True

report={'status':'rigged-appearance-review','source':str(SOURCE.relative_to(ROOT)),
        'blender':bpy.app.version_string,'body_height':1.7,'ear_bind_pitch':BIND,
        'bones':[x[0] for x in specs],'core_lateral_bound':core_bound,
        'ear_specs':ear_specs,'geometry':{},'runtime_physics_integrated':False,
        'source_cleanup':cleanup,'atlas_source_images':len(tile_keys),
        'note':'Wider ears require new collision/inertia fitting before game integration.'}
for o in meshes:
    o.data.calc_loop_triangles()
    bm=bmesh.new();bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
    report['geometry'][o.name]={'triangles':len(o.data.loop_triangles),'vertices':len(o.data.vertices),
        'boundary_edges':sum(e.is_boundary for e in bm.edges),'nonmanifold_edges':sum(not e.is_manifold for e in bm.edges)}
    bm.free()
report['triangles']=sum(v['triangles'] for v in report['geometry'].values())
assert report['triangles']<35000,report['triangles']
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(GLB),export_format='GLB',use_selection=True,export_yup=True,
    export_skins=True,export_influence_nb=4,export_extras=True,export_animations=False)

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
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(DEST),compress=True)
(OUT/'blender-report.json').write_text(json.dumps(report,indent=2)+'\n')
if '--render' in sys.argv:
    for name,target,offset,scale in [('review',(-.9,0,1.1),(7,-10,4),5.8),('front',(-.9,0,1.1),(10,0,1),5.8),('face',(.12,0,1.06),(10,-1,1),2.4)]:
        view(target,offset,scale);s.render.filepath=str(ROOT/f'docs/beagle-plush-v04-{name}.png');bpy.ops.render.render(write_still=True)
print('BEAGLE_V04_READY',report['triangles'],flush=True)
