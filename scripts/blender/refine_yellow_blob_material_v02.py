import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OLD=ROOT/'assets/source/yellow-blob/prepared-v01'
OUT=ROOT/'assets/source/yellow-blob/prepared-v02'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(OLD/'yellow-blob-static-v01.blend'))
for mat in bpy.data.materials:
    if not mat.use_nodes: continue
    for node in mat.node_tree.nodes:
        if node.type=='NORMAL_MAP': node.inputs['Strength'].default_value=0.15
        if node.type=='BSDF_PRINCIPLED':
            for name,value in [('Metallic',0.0),('Roughness',0.65)]:
                for link in list(node.inputs[name].links): mat.node_tree.links.remove(link)
                node.inputs[name].default_value=value
scene=bpy.context.scene
for o in scene.objects: o.select_set(o.type=='MESH')
bpy.ops.export_scene.gltf(filepath=str(OUT/'yellow-blob-static-v02.glb'),use_selection=True,export_format='GLB')
for label,pos in [('front',(0,-3,0.5)),('side',(3,0,0.5)),('back',(0,3,0.5)),('three-quarter',(2,-3,1.2))]:
    scene.camera.location=pos
    scene.camera.rotation_euler=(Vector((0,0,0.5))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(label+'.png')); bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yellow-blob-static-v02.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT/'yellow-blob-static-v02.glb'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
r={'reimport_meshes':len(meshes),'faces':sum(len(o.data.polygons) for o in meshes),'bytes':(OUT/'yellow-blob-static-v02.glb').stat().st_size,'changes':['normal map strength 0.15','nonmetallic surface','roughness 0.65'],'appearance_acceptance':'pending','scope':'static model only'}
(OUT/'verification.json').write_text(json.dumps(r,indent=2))
