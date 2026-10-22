"""Preserve the selected Tripo appearance; prepare a static model and review renders."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/source/yellow-blob/prepared-v01'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'assets/source/yellow-blob/tripo-v01/original.glb'))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
report = {'scope': 'static model only; no rig, weapons or integration', 'objects': []}
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    before = len(obj.data.polygons)
    mod = obj.modifiers.new('Conservative reduction', 'DECIMATE')
    mod.ratio = min(1.0, 120000 / before)
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    report['objects'].append({'name': obj.name, 'faces_before': before, 'faces_after': len(obj.data.polygons)})
    obj.select_set(False)
for image in bpy.data.images:
    if image.size[0] and image.size[1]:
        image.pack()
for obj in meshes:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'yellow-blob-static-v01.glb'), use_selection=True, export_format='GLB')
report['export_bytes'] = (OUT / 'yellow-blob-static-v01.glb').stat().st_size

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Neutral studio')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (0.65, 0.65, 0.65, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
for pos, power, size in [((2,-3,4),180,4),((-3,-1,2),100,3),((0,3,3),120,3)]:
    data = bpy.data.lights.new('Softbox', 'AREA'); data.energy = power; data.shape = 'DISK'; data.size = size
    obj = bpy.data.objects.new('Softbox', data); scene.collection.objects.link(obj); obj.location = pos
    obj.rotation_euler = (Vector((0,0,0.5))-obj.location).to_track_quat('-Z','Y').to_euler()
camdata = bpy.data.cameras.new('Review camera'); camdata.type = 'ORTHO'; camdata.ortho_scale = 1.3
cam = bpy.data.objects.new('Review camera',camdata); scene.collection.objects.link(cam); scene.camera=cam
for label, pos in [('front',(0,-3,0.5)),('side',(3,0,0.5)),('back',(0,3,0.5)),('three-quarter',(2,-3,1.2))]:
    cam.location=pos; cam.rotation_euler=(Vector((0,0,0.5))-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT / (label+'.png')); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yellow-blob-static-v01.blend'))
(OUT/'verification.json').write_text(json.dumps(report,indent=2))
# Verify the exported static GLB can be imported independently.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'yellow-blob-static-v01.glb'))
report['reimport_meshes']=len([o for o in bpy.context.scene.objects if o.type=='MESH'])
report['reimport_faces']=sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH')
(OUT/'verification.json').write_text(json.dumps(report,indent=2))
