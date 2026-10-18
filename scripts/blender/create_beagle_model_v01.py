"""Author the first editable beagle mesh, custom rig, GLB, and studio views.

Native Blender geometry; reference-informed draft, not approved shipping art.
Paddles retain the functional preview's length, width, thickness, and sockets.
"""
from pathlib import Path
import bpy, bmesh, json, math, sys
from mathutils import Matrix, Vector

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/source/blender/beagle-ear-duelist-v01.blend'
EXPORT=ROOT/'public/models/beagle-ear-duelist-v01.glb'
OUT=ROOT/'output/blender/beagle-model-v01'
OUT.mkdir(parents=True,exist_ok=True)
if SOURCE.exists() and '--replace-generated' not in sys.argv:
    raise FileExistsError('Preserving '+str(SOURCE))
LENGTH,ANCHOR,SIDE,BIND=3.6,1.43,.66,-1.55
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene
s.unit_settings.system='METRIC';s.unit_settings.scale_length=1
s.render.engine='BLENDER_EEVEE'
s.render.resolution_x,s.render.resolution_y=1600,1000
s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG'
s.render.film_transparent=False
s.render.fps=30;s.frame_start=1;s.frame_end=31
s.view_settings.view_transform='Standard'
collections={}
for name in ['00_Reference','02_Working_Assets','03_Collision_Proxies','90_Presentation']:
    c=bpy.data.collections.new(name);s.collection.children.link(c);collections[name]=c


def move_to(obj,collection):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    collection.objects.link(obj)


def srgb(hex):return tuple(int(hex[i:i+2],16)/255 for i in (0,2,4))
PALETTE={'tan':srgb('CC9854'),'white':srgb('FFF7E8'),'dark':srgb('302922'),'accent':srgb('C4684F')}
coat=bpy.data.materials.new('MAT_Beagle_Coat');coat.use_nodes=True
bsdf=coat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value=.88
bsdf.inputs['Specular IOR Level'].default_value=.18
attribute=coat.node_tree.nodes.new('ShaderNodeVertexColor');attribute.layer_name='Col'
coat.node_tree.links.new(attribute.outputs['Color'],bsdf.inputs['Base Color'])
accent=bpy.data.materials.new('MAT_Player_Accent');accent.use_nodes=True
ab=accent.node_tree.nodes.get('Principled BSDF')
# Color() handles scene-linear material values consistently with glTF export.
from mathutils import Color
accent_color=Color(PALETTE['accent']).from_srgb_to_scene_linear()
ab.inputs['Base Color'].default_value=(*accent_color,1)
ab.inputs['Roughness'].default_value=.9
parts={name:[] for name in ('Body','Face','Ears','Accent')}


def finish(obj,name,bone,color='tan',category='Body'):
    obj.name=name
    converted_curve=obj.type=='CURVE'
    if obj.type=='CURVE':
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH');obj=bpy.context.object
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bm=bmesh.new();bm.from_mesh(obj.data)
    if converted_curve:
        # Blender's converted bevel caps duplicate the end-ring vertices.
        # Weld only coincident curve-cap vertices so the tube is closed.
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    assert not obj.data.validate(),name
    audit=bmesh.new();audit.from_mesh(obj.data)
    bad_edges=sum(not edge.is_manifold for edge in audit.edges)
    if bad_edges:print('PART_TOPOLOGY',name,bad_edges)
    audit.free()
    layer=obj.data.color_attributes.new(name='Col',type='BYTE_COLOR',domain='CORNER')
    rgb=(1,1,1) if category=='Accent' else PALETTE[color]
    for datum in layer.data:datum.color_srgb=(*rgb,1)
    obj.data.color_attributes.active_color=layer
    obj.data.materials.append(accent if category=='Accent' else coat)
    group=obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    for face in obj.data.polygons:face.use_smooth=True
    move_to(obj,collections['02_Working_Assets'])
    parts[category].append(obj)
    return obj


def ellipsoid(name,loc,scale,bone,color='tan',category='Body',segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.scale=scale
    return finish(o,name,bone,color,category)


def rounded(name,loc,dimensions,bevel,bone,color='tan',category='Body'):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    mod=o.modifiers.new('Authored rounded silhouette','BEVEL');mod.width=bevel;mod.segments=5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,bone,color,category)


def stroke(name,points,radius,bone,color='dark',category='Face'):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D'
    data.resolution_u=8;data.bevel_depth=radius;data.bevel_resolution=2;data.use_fill_caps=True
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for b,p in zip(spline.bezier_points,points):
        b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,data);s.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True)
    return finish(obj,name,bone,color,category)


def shell(name,outline,depth,bone,color,category='Face'):
    # A closed thin volume, rather than a floating one-sided decal.
    verts=[(x,y,z) for x,y,z in outline]+[(x-depth,y,z) for x,y,z in outline]
    n=len(outline)
    faces=[tuple(range(n)),tuple(reversed(range(n,2*n)))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);s.collection.objects.link(obj)
    obj=finish(obj,name,bone,color,category)
    for face in obj.data.polygons:face.use_smooth=False
    return obj


# Clean primary volumes. The head is narrower than the preview proxy so the
# ear lanes retain clearance during complete rotations.
rounded('Head',(0,0,1.20),(.72,.90,1.0),.17,'head')
rounded('Torso',(-.025,0,.425),(.46,.58,.74),.18,'body_pitch','white')
for side,name in [(-1,'L'),(1,'R')]:
    ellipsoid(name+' foot',(.07,side*.17,.075),(.14,.125,.075),'body_pitch','white')
    ellipsoid(name+' tucked paw',(.155,side*.295,.52),(.105,.075,.145),name+'_paw','white')
    ellipsoid(name+' root fold',(0,side*.535,ANCHOR),(.10,.135,.125),'head')
ellipsoid('Muzzle',(.37,0,1.045),(.15,.33,.185),'head','white')
ellipsoid('Chin',(.375,0,.935),(.13,.25,.10),'jaw','white')
ellipsoid('Nose',(.519,0,1.10),(.032,.086,.053),'head','dark','Face')
stroke('Smirk',[(.509,-.105,.974),(.514,-.035,.955),(.512,.035,.955),(.505,.09,.981)],.009,'jaw')
stroke('Nose to lip',[(.524,0,1.063),(.518,0,1.025),(.514,0,.985)],.006,'jaw')
stroke('Short tail',[(-.24,0,.29),(-.37,0,.33),(-.44,0,.42),(-.41,0,.48)],.052,'tail','tan','Body')

# White blaze follows the rounded head surface with short quads to avoid
# interpolation cutting through the curved top of the skull.
blaze_rows=[(1.13,.075),(1.25,.057),(1.40,.060),(1.51,.065),
            (1.56,.064),(1.60,.058),(1.635,.050),(1.665,.031)]
verts=[]
for z,width in blaze_rows:
    x=.36 if z<=1.53 else .19+math.sqrt(max(0,.17**2-(z-1.53)**2))
    verts.extend([(x+.006,-width,z),(x+.006,width,z)])
verts += [(x-.009,y,z) for x,y,z in verts]
n=len(blaze_rows)*2
faces=[]
for i in range(len(blaze_rows)-1):
    a=2*i;faces.extend([(a,a+1,a+3,a+2),(n+a+2,n+a+3,n+a+1,n+a)])
for side in (0,1):
    for i in range(len(blaze_rows)-1):
        a=2*i+side;b=a+2;faces.append((a,b,n+b,n+a))
faces.extend([(0,n,n+1,1),(n-2,n-1,2*n-1,2*n-2)])
data=bpy.data.meshes.new('Blaze');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('Blaze',data);s.collection.objects.link(obj)
finish(obj,'Blaze','head','white')
for face in obj.data.polygons:face.use_smooth=False

# Half-lidded eyes, each with its own lid and brow controls.
for side,name in [(-1,'L'),(1,'R')]:
    cy=side*.225;cz=1.325
    ellipsoid(name+' eye rim',(.366,cy,cz),(.023,.185,.153),'head','dark','Face')
    ellipsoid(name+' eye white',(.385,cy,cz),(.024,.166,.132),'head','white','Face')
    ellipsoid(name+' pupil',(.409,cy-.012,1.292),(.017,.110,.108),'head','dark','Face')
    # A top-anchored lid stretches downward for a blink without moving sockets.
    outline=[]
    for i in range(13):
        t=math.pi*i/12
        outline.append((.431,cy+.186*math.cos(t),1.343+.145*math.sin(t)))
    shell(name+' upper lid',outline,.015,name+'_lid','tan')
    stroke(name+' lid edge',[(.442,cy-.173,1.345),(.443,cy,1.338),(.442,cy+.173,1.345)],.010,name+'_lid')
    stroke(name+' brow',[(.369,cy-.105,1.510),(.371,cy+.095,1.495)],.009,name+'_brow')

rounded('Collar',(0,0,.765),(.49,.62,.105),.045,'body_pitch','white','Accent')
rounded('Rear player panel',(-.257,0,.59),(.024,.39,.27),.025,'body_pitch','white','Accent')
# A small front bib gives the accent a readable front view too.
shell('Front bib',[(.226,-.22,.71),(.232,.22,.71),(.245,.15,.55),(.245,0,.49),(.245,-.15,.55)],.012,'body_pitch','white','Accent')

# Exactly the functional prototype's firm paddle profile; no folding joints.
ear_source_vertices=None
for side,name in [(-1,'L'),(1,'R')]:
    rings=[(0,.055,.065),(.14,.055,.11),(.38,.055,.20),(LENGTH-.24,.055,.20),(LENGTH-.07,.045,.115)]
    count=20
    local=[Vector((rx*math.cos(j*math.tau/count),ry*math.sin(j*math.tau/count),z))
           for z,rx,ry in rings for j in range(count)]
    local.extend([Vector((0,0,0)),Vector((0,0,LENGTH))])
    if ear_source_vertices is None:ear_source_vertices=[list(v) for v in local]
    anchor=Vector((0,side*SIDE,ANCHOR));rotation=Matrix.Rotation(BIND,3,'Y')
    verts=[anchor+rotation@v for v in local]
    faces=[]
    for ring in range(len(rings)-1):
        for j in range(count):
            a=ring*count+j;b=ring*count+(j+1)%count;faces.append((a,b,b+count,a+count))
    for j in range(count):
        faces.append((len(local)-2,(j+1)%count,j))
        k=(len(rings)-1)*count;faces.append((k+j,k+(j+1)%count,len(local)-1))
    mesh=bpy.data.meshes.new(name+' Paddle');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name+' Paddle',mesh);s.collection.objects.link(obj)
    finish(obj,name+' Paddle',name+'_ear_swing','tan','Ears')

# The core head/torso remains inside the ear lanes for every hinge angle.
# Only the intentional overlapping root covers are excluded from this check.
core_side_bound=max(abs(v.co.y) for category,objects in parts.items() if category!='Ears'
                    for obj in objects if 'root fold' not in obj.name for v in obj.data.vertices)
ear_inner_edge=min(abs(v.co.y) for obj in parts['Ears'] for v in obj.data.vertices)
lateral_clearance=ear_inner_edge-core_side_bound
assert lateral_clearance>.009,('Ear lane clearance',lateral_clearance)

# Merge to four draw groups, preserving exact rigid assignments and one coat
# shader. UVs are present for later art work even though this version is untextured.
meshes=[]
for category,objects in parts.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name='SM_Beagle_'+category
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.02)
    bpy.ops.object.mode_set(mode='OBJECT')
    assert not obj.data.validate(),obj.name
    meshes.append(obj)

# Validate finished geometry before adding the production control hierarchy.
geometry_report={}
for obj in meshes:
    obj.data.calc_loop_triangles()
    bm=bmesh.new();bm.from_mesh(obj.data)
    boundary=sum(1 for e in bm.edges if e.is_boundary)
    nonmanifold=sum(1 for e in bm.edges if not e.is_manifold)
    bm.free()
    influences=max(len(v.groups) for v in obj.data.vertices)
    assert boundary==0 and nonmanifold==0,(obj.name,boundary,nonmanifold)
    assert influences==1
    assert all(abs(sum(g.weight for g in v.groups)-1)<1e-7 for v in obj.data.vertices)
    geometry_report[obj.name]={'vertices':len(obj.data.vertices),'triangles':len(obj.data.loop_triangles),
        'boundary_edges':boundary,'nonmanifold_edges':nonmanifold,'maximum_influences':influences,
        'uv_layers':list(obj.data.uv_layers.keys())}
assert sum(v['triangles'] for v in geometry_report.values())<20000

arm=bpy.data.armatures.new('Beagle Ear Duelist Skeleton')
rig=bpy.data.objects.new('ARM_BeagleEarDuelist',arm);collections['02_Working_Assets'].objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
bone_specs=[('root',(0,0,0),None),('body_pitch',(0,0,.85),'root'),('head',(0,0,1.20),'body_pitch'),
 ('L_ear_swing',(0,-SIDE,ANCHOR),'head'),('R_ear_swing',(0,SIDE,ANCHOR),'head'),
 ('L_paw',(.155,-.295,.52),'body_pitch'),('R_paw',(.155,.295,.52),'body_pitch'),
 ('tail',(-.24,0,.29),'body_pitch'),('jaw',(.42,0,.98),'head')]
for name,cy in [('L',-.225),('R',.225)]:
    bone_specs.extend([(name+'_lid',(.431,cy,1.488),'head'),(name+'_brow',(.37,cy,1.50),'head')])
for name,head,parent in bone_specs:
    bone=arm.edit_bones.new(name);bone.head=head;bone.tail=Vector(head)+Vector((0,.15,0))
    if parent:bone.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for obj in meshes:
    obj.parent=rig
    mod=obj.modifiers.new('Authoritative character skeleton','ARMATURE');mod.object=rig
for bone in rig.pose.bones:
    bone.rotation_mode='XYZ'
    bone['control_note']='Physical rotation' if 'ear_swing' in bone.name or bone.name in ('root','body_pitch') else 'Cosmetic pose'
rig['ear_bind_pitch']=BIND
rig['ear_length']=LENGTH
rig['ear_pitch_control']='pose L/R_ear_swing local Y = physical pitch minus ear_bind_pitch'
rig['body_pitch_control']='pose body_pitch local Y; root local Z is Blender yaw'
rig['asset_status']='v01 review model, gameplay integration pending'
rig['player_accent_material']='MAT_Player_Accent'

# A short optional facial clip; physical ear bones have no animation track.
for frame,scale in [(1,1),(12,1),(15,2.2),(17,2.2),(20,1),(31,1)]:
    for name in ('L_lid','R_lid'):
        rig.pose.bones[name].scale.z=scale
        rig.pose.bones[name].keyframe_insert(data_path='scale',frame=frame)
rig.animation_data.action.name='Beagle_Blink'
s.frame_set(1)

# Collision source guides are excluded from the runtime mesh export.
for side,name in [(-1,'L'),(1,'R')]:
    for lane,offset in enumerate((0,-.12,.12)):
        low,high=(.055,3.545) if lane==0 else (.38,3.36)
        a=Vector((0,side*SIDE+offset,ANCHOR))+Matrix.Rotation(BIND,3,'Y')@Vector((0,0,low))
        b=Vector((0,side*SIDE+offset,ANCHOR))+Matrix.Rotation(BIND,3,'Y')@Vector((0,0,high))
        bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.055,depth=(b-a).length,location=(a+b)/2)
        obj=bpy.context.object;obj.name=f'COL_{name}_Paddle_{lane}'
        obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        group=obj.vertex_groups.new(name=name+'_ear_swing');group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        obj.parent=rig;mod=obj.modifiers.new('Follow ear','ARMATURE');mod.object=rig
        obj.display_type='WIRE';obj.hide_render=True;obj['radius']=.055
        obj['purpose']='Capsule-axis source guide; runtime profile adds rounded caps'
        move_to(obj,collections['03_Collision_Proxies'])
collections['03_Collision_Proxies'].hide_viewport=True

# Pack the supplied reference in the editable source, never in the game GLB.
ref=bpy.data.images.load(str(ROOT/'docs/reference/beagle-reference-sheet.png'));ref.pack()
bpy.ops.object.empty_add(type='IMAGE',location=(1.5,3,1))
ref_obj=bpy.context.object;ref_obj.name='REF_User_Beagle';ref_obj.data=ref;ref_obj.empty_display_size=2.5
move_to(ref_obj,collections['00_Reference']);ref_obj.hide_render=True
collections['00_Reference'].hide_viewport=True

# Export a zero-pose rig with baked-in resting geometry and explicit metadata.
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in meshes:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(EXPORT),export_format='GLB',use_selection=True,
    export_yup=True,export_skins=True,export_influence_nb=4,export_extras=True,
    export_vertex_color='ACTIVE',export_animations=True,export_animation_mode='ACTIONS',
    export_frame_range=True,export_rest_position_armature=True,export_force_sampling=False,
    export_optimize_animation_keep_anim_armature=False)

# Studio presentation. The neutral pose is swept back to keep long rigid ears
# clear of the floor. A compact folded idle has not been invented for the model.
s.world=bpy.data.worlds.new('Neutral studio');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.70,.73,.76,1)
s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
s.view_settings.exposure=-.5
floor_mat=bpy.data.materials.new('Studio Floor');floor_mat.use_nodes=True
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.64,.65,.66,1)
floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
floor=bpy.context.object;floor.name='Studio Floor';floor.data.materials.append(floor_mat);move_to(floor,collections['90_Presentation'])
for name,loc,power,size in [('Key',(4,-5,7),650,5),('Fill',(1,5,4),350,4),('Rim',(-5,1,6),500,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object
    light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size
    light.rotation_euler=(Vector((-.7,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
    move_to(light,collections['90_Presentation'])
bpy.ops.object.camera_add(location=(7,-9,4))
camera=bpy.context.object;camera.name='Model Review Camera';camera.data.type='ORTHO';s.camera=camera
move_to(camera,collections['90_Presentation'])


def camera_at(target,offset,scale):
    camera.location=Vector(target)+Vector(offset)
    camera.rotation_euler=(-Vector(offset)).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale


camera_at((-.9,0,.95),(7,-10,4),5.5)
s.frame_set(1)
# Keep a useful material preview when opening the source in Blender.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_distance=6
            area.spaces.active.region_3d.view_location=Vector((-.9,0,.95))
            area.spaces.active.shading.type='MATERIAL'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
report={'source':str(SOURCE),'glb':str(EXPORT),'blender':bpy.app.version_string,
 'geometry':geometry_report,'triangles':sum(v['triangles'] for v in geometry_report.values()),
 'skinned_meshes':4,'materials':2,'texture_images':0,'bones':[spec[0] for spec in bone_specs],
 'ear_length':LENGTH,'ear_bind_pitch':BIND,'ear_sockets_blender':[[0,-SIDE,ANCHOR],[0,SIDE,ANCHOR]],
 'ear_source_vertices':ear_source_vertices,'body_height':1.70,'head_width':.90,
 'ear_to_core_head_lateral_clearance':lateral_clearance,
 'controls':{'ear_axis_local':[0,1,0],'ear_pose_angle':'physical_theta - (-1.55)','body_pitch_axis_local':[0,1,0],
 'root_yaw_axis_local':[0,0,1],'root_yaw_angle':'-game_phi'},
 'status':'first-model-for-review-not-gameplay-integrated'}
(OUT/'blender-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('BEAGLE_MODEL_READY',json.dumps({k:v for k,v in report.items() if k not in ('ear_source_vertices','geometry')}))
if '--render' in sys.argv:
    views=[('review',(-.9,0,.95),(7,-10,4),5.5),
           ('front',(-.9,0,.95),(10,0,1.4),5.5),
           ('side',(-.9,0,.95),(0,-10,1.4),5.5),
           ('back',(-.9,0,.95),(-10,0,1.4),5.5),
           ('face-detail',(.2,0,1.08),(10,-2,1.5),2.45)]
    for name,target,offset,scale in views:
        camera_at(target,offset,scale)
        s.render.filepath=str(ROOT/f'docs/beagle-model-v01-{name}.png')
        bpy.ops.render.render(write_still=True)
