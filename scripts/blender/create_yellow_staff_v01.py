"""User-requested smooth yellow staff with ellipsoidal ends; Blender native mesh."""
import bpy,bmesh,math,json,statistics
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/source/yellow-staff/v01';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'assets/source/yellow-blob/prepared-v03/yellow-blob-static-v03.blend'))
scene=bpy.context.scene
character=[o for o in scene.objects if o.type=='MESH']
obj=character[0];mat=obj.data.materials[0]
shader=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
texture=shader.inputs['Base Color'].links[0].from_node.image
w,h=texture.size;pixels=np.empty(w*h*4,dtype=np.float32);texture.pixels.foreach_get(pixels);pixels=pixels.reshape(h,w,4)
uv=obj.data.uv_layers.active.data;samples=[]
for p in obj.data.polygons:
    q=obj.matrix_world@p.center
    if .35<q.z<.55 and q.y<0 and abs(q.x)<.15:
        u,v=uv[p.loop_indices[0]].uv;samples.append(pixels[min(h-1,max(0,int(v*h))),min(w-1,max(0,int(u*w))),:3])
rgb=np.median(samples,axis=0).tolist()
linear=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
gold=bpy.data.materials.new('Character yellow — sampled torso');gold.use_nodes=True
bsdf=gold.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*linear,1);bsdf.inputs['Roughness'].default_value=.65;bsdf.inputs['Metallic'].default_value=0
L,R,CAP,N=1.8,.115,.19,64
verts=[(0,0,0)];rings=[]
for i in range(1,17):
    a=-math.pi/2+(math.pi/2)*i/16;r=R*math.cos(a);z=CAP+CAP*math.sin(a)
    rings.append((r,z))
rings.append((R,L-CAP))
for i in range(1,16):
    a=(math.pi/2)*i/16;r=R*math.cos(a);z=L-CAP+CAP*math.sin(a);rings.append((r,z))
for r,z in rings:
    for j in range(N):
        a=2*math.pi*j/N;verts.append((r*math.cos(a),r*math.sin(a),z))
top=len(verts);verts.append((0,0,L));faces=[]
for j in range(N):faces.append((0,1+(j+1)%N,1+j))
for k in range(len(rings)-1):
    lo=1+k*N;hi=lo+N
    for j in range(N):faces.append((lo+j,lo+(j+1)%N,hi+(j+1)%N,hi+j))
lo=1+(len(rings)-1)*N
for j in range(N):faces.append((lo+j,lo+(j+1)%N,top))
mesh=bpy.data.meshes.new('Ellipsoid-ended continuous staff');mesh.from_pydata(verts,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));boundary=sum(e.is_boundary for e in bm.edges);bm.to_mesh(mesh);bm.free()
staff=bpy.data.objects.new('YellowStaff',mesh);scene.collection.objects.link(staff);staff.data.materials.append(gold)
for face in mesh.polygons:face.use_smooth=True
for o in scene.objects:o.select_set(False)
staff.select_set(True);bpy.context.view_layer.objects.active=staff
bpy.ops.export_scene.gltf(filepath=str(OUT/'yellow-staff-v01.glb'),use_selection=True,export_format='GLB')
for o in character:o.scale*=1.7
staff.location.x=1.05
scene.camera.data.ortho_scale=2.55
for label,pos in [('front',(0.35,-5,.95)),('three-quarter',(3,-5,2.4))]:
    scene.camera.location=pos;scene.camera.rotation_euler=(Vector((.35,0,.90))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'yellow-staff-v01.blend'))
report={'length':L,'radius':R,'cap_axial_radius':CAP,'character_preview_height':1.7,'color_sample_srgb':rgb,'material_linear_color':linear,'boundary_edges':boundary,'vertices':len(verts),'quads_and_triangles':len(faces),'export_axis':'+Y','export_origin':'bottom end','scope':'weapon mesh and proportion review; no gameplay integration'}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'yellow-staff-v01.glb'))
report['reimport_meshes']=len([o for o in bpy.context.scene.objects if o.type=='MESH']);report['bytes']=(OUT/'yellow-staff-v01.glb').stat().st_size
(OUT/'verification.json').write_text(json.dumps(report,indent=2))
