"""Locally smooth body artifacts, with the complete face/mouth geometry locked."""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/source/yellow-blob/prepared-v03'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/yellow-blob/prepared-v02/yellow-blob-static-v02.blend'))
scene=bpy.context.scene
saved_material=next(o for o in scene.objects if o.type=='MESH').data.materials[0]
for o in list(scene.objects):
    if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/source/yellow-blob/tripo-v01/original.glb'))
for o in scene.objects:
    if o.type=='MESH':o.data.materials.clear();o.data.materials.append(saved_material)
report={'scope':'body surface refinement only; protruding mouth preserved','objects':[]}
for obj in [o for o in scene.objects if o.type=='MESH']:
    bpy.context.view_layer.objects.active=obj
    # GLB splits vertices at UV seams. Weld coincident geometry first while
    # preserving per-loop UVs, otherwise smoothing opens the texture islands.
    bm=bmesh.new(); bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.00001)
    bm.to_mesh(obj.data);bm.free();obj.data.update()
    dec=obj.modifiers.new('Reduce continuous welded mesh','DECIMATE');dec.ratio=120000/len(obj.data.polygons);dec.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=dec.name)
    before=[v.co.copy() for v in obj.data.vertices]
    group=obj.vertex_groups.new(name='Body surface only — face locked')
    protected=[]
    for v in obj.data.vertices:
        x,y,z=v.co
        # Imported GLB is converted to Blender world axes by the object matrix.
        p=obj.matrix_world@v.co
        front=1.0-min(1.0,max(0.0,(p.y+0.02)/0.12))
        face=min(1.0,max(0.0,(p.z-0.62)/0.08))*front
        weight=1.0-face
        # Keep soles and the foot/body transition crisp.
        weight*=min(1.0,max(0.0,(p.z-0.10)/0.12))
        if face>=0.999: protected.append(v.index)
        if weight>0: group.add([v.index],weight,'REPLACE')
    mod=obj.modifiers.new('Remove shallow body reconstruction marks','SMOOTH')
    mod.vertex_group=group.name; mod.factor=0.65; mod.iterations=90
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Explicitly restore locked facial vertices, including protruding mouth.
    for i in protected: obj.data.vertices[i].co=before[i]
    # Imported custom normals no longer match the smoothed positions.
    if obj.data.has_custom_normals:
        obj.data.normals_split_custom_set([(0.0,0.0,0.0)]*len(obj.data.loops))
    for poly in obj.data.polygons:poly.use_smooth=True
    obj.data.update()
    report['objects'].append({'faces':len(obj.data.polygons),'protected_face_vertices':len(protected),'max_protected_displacement':max(((obj.data.vertices[i].co-before[i]).length for i in protected),default=0),'max_body_displacement':max((v.co-before[v.index]).length for v in obj.data.vertices)})
    # The generated normal map contains surface artifacts; remove it only on body polygons.
    base=obj.data.materials[0]; body=base.copy(); body.name='Smooth yellow body'
    for node in body.node_tree.nodes:
        if node.type=='NORMAL_MAP': node.inputs['Strength'].default_value=0
    obj.data.materials.append(body)
    for poly in obj.data.polygons:
        p=obj.matrix_world@poly.center
        if p.z<0.62 or p.y>0.02: poly.material_index=len(obj.data.materials)-1
for o in scene.objects:o.select_set(o.type=='MESH')
bpy.ops.export_scene.gltf(filepath=str(OUT/'yellow-blob-static-v03.glb'),use_selection=True,export_format='GLB')
for label,pos in [('front',(0,-3,0.5)),('side',(3,0,0.5)),('back',(0,3,0.5)),('three-quarter',(2,-3,1.2))]:
    scene.camera.location=pos;scene.camera.rotation_euler=(Vector((0,0,0.5))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yellow-blob-static-v03.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'yellow-blob-static-v03.glb'))
report['reimport_faces']=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
report['bytes']=(OUT/'yellow-blob-static-v03.glb').stat().st_size
(OUT/'verification.json').write_text(json.dumps(report,indent=2))
