"""Reference maquette ONLY. Render consistent Tripo inputs; never a production base.

This is an interpreted stylized study, not a surveyed architectural reconstruction.
See docs/environments/colosseum/HANDOFF.md for facts and game adaptations.
"""
from pathlib import Path
import bpy, math, json
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/concepts/colosseum/input-v01'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, rgb):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*rgb, 1)
    p.inputs['Roughness'].default_value = .88
    return m
STONE = mat('warm cream travertine', (.72,.52,.30))
TRIM = mat('soft honey cornices', (.83,.65,.41))
BRICK = mat('muted terracotta inner masonry', (.52,.31,.20))
SAND = mat('covered playable arena - game adaptation', (.72,.55,.35))
SEAT = mat('warm pale cavea', (.70,.55,.36))
BASE = mat('muted stone footprint', (.58,.47,.34))

def mesh(name, vs, fs, material, bevel=.10):
    me=bpy.data.meshes.new(name); me.from_pydata(vs, [], fs); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    if bevel:
        mod=ob.modifiers.new('softened toy edges','BEVEL'); mod.width=bevel; mod.segments=3
        mod=ob.modifiers.new('weighted corner normals','WEIGHTED_NORMAL'); mod.keep_sharp=True
    return ob

def frame(a,b,t):
    p=Vector((a*math.cos(t),b*math.sin(t),0))
    tan=Vector((-a*math.sin(t),b*math.cos(t),0)).normalized()
    n=Vector((tan.y,-tan.x,0))
    return p,tan,n

def panel(name,a,b,t,points,depth,material,bevel=.10):
    p,tan,n=frame(a,b,t)
    vs=[]
    for d in [-depth/2,depth/2]:
        for x,z in points:
            v=p+tan*x+n*d; vs.append((v.x,v.y,z))
    k=len(points)
    fs=[tuple(reversed(range(k))), tuple(range(k,2*k))]
    fs += [(i,(i+1)%k,(i+1)%k+k,i+k) for i in range(k)]
    return mesh(name,vs,fs,material,bevel)

def box(name,a,b,t,x0,x1,z0,z1,depth,material,bevel=.10):
    return panel(name,a,b,t,[(x0,z0),(x1,z0),(x1,z1),(x0,z1)],depth,material,bevel)

def ring(name,ai,bi,ao,bo,z0,z1,material,start=0,end=2*math.pi,segments=160,bevel=.10):
    vs=[]
    for i in range(segments+1):
        t=start+(end-start)*i/segments
        for a,b,z in [(ai,bi,z0),(ao,bo,z0),(ao,bo,z1),(ai,bi,z1)]:
            vs.append((a*math.cos(t),b*math.sin(t),z))
    fs=[]
    for i in range(segments):
        q=i*4
        for j in range(4): fs.append((q+j,q+(j+1)%4,q+4+(j+1)%4,q+4+j))
    fs.extend([(3,2,1,0),tuple(range(segments*4,segments*4+4))])
    return mesh(name,vs,fs,material,bevel)

def arcade(name,a,b,t,bay,z0,z1,width,spring,material,depth=2.5,columns=False):
    r=width/2
    # Piers and spandrel create an actual open arch through the wall.
    box(name+' left pier',a,b,t,-bay/2,-r,z0,z1,depth,material)
    box(name+' right pier',a,b,t,r,bay/2,z0,z1,depth,material)
    curve=[]
    for j in range(19):
        ang=math.pi-j*math.pi/18
        curve.append((r*math.cos(ang),z0+spring+r*math.sin(ang)))
    panel(name+' arch spandrel',a,b,t,curve+[(r,z1),(-r,z1)],depth,material)
    if columns:
        p,tan,n=frame(a,b,t)
        for x in [-bay/2]:
            pos=p+tan*x+n*(depth/2+.18)
            bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.46,depth=z1-z0-.8,location=(pos.x,pos.y,(z1+z0)/2))
            ob=bpy.context.object; ob.name=name+' engaged column'; ob.data.materials.append(TRIM)
            for face in ob.data.polygons: face.use_smooth=True
            for zh in [z0+.25,z1-.25]:
                box(name+' capital or base',a+.25,b+.25,t,x-.68,x+.68,zh-.22,zh+.22,depth+.65,TRIM)

N=80; STEP=2*math.pi/N
# A continuous low footprint records the missing southern outer rings without rebuilding them.
ring('two-step foundation',.1,.1,95,79,-1.2,-.6,BASE,segments=240)
ring('outer footprint shallow step',80,64,94,78,-.6,0,TRIM,segments=240)
# Center arena, consciously re-covered for gameplay. Not the exposed modern hypogeum.
ring('covered unobstructed arena',.01,.01,41.5,24,-.5,.10,SAND,segments=240,bevel=.08)
ring('arena podium',41.7,24.2,43.3,25.8,0,3.3,STONE,segments=240)
ring('podium coping',41.45,23.95,43.55,26.05,3.3,3.75,TRIM,segments=240)

# Simplified cavea terraces with radial gaps and irregular survival.
# These are a game interpretation; not a claim of intact present-day seating.
for wedge in range(24):
    t0=2*math.pi*wedge/24+.014; t1=2*math.pi*(wedge+1)/24-.014
    restored = wedge in [0,1,4,5,10,11,15,16,21,22]
    for row in range(16):
        if not restored and row%4 not in [0,1]: continue
        if not restored and row>11 and wedge%3==0: continue
        ai=43.5+row*1.94; bi=26+row*1.94
        z=3.7+row*1.36
        ring('interpreted cavea %02d row %02d'%(wedge,row),ai,bi,ai+1.94,bi+1.94,z-1.7,z,SEAT,start=t0,end=t1,segments=8,bevel=.13)
    # Thin rising radial support walls remain visible where seats are omitted.
    for t in [t0,t1]:
        p0=Vector((43.5*math.cos(t),26*math.sin(t),0))
        p1=Vector((76*math.cos(t),58.5*math.sin(t),0))
        v=p1-p0; n=Vector((-v.y,v.x,0)).normalized()*.5
        vs=[]
        for s in [-1,1]:
            for p,z in [(p0,0),(p1,0),(p1,25),(p0,3.7)]:
                q=p+n*s; vs.append((q.x,q.y,z))
        mesh('exposed radial cavea support',vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],BRICK,.10)

# Independent lower inner oval wall, exposed to south. Less ornate than north outer façade.
for i in range(N):
    t=(i+.5)*STEP
    speed=math.hypot(80*math.sin(t),64*math.cos(t)); bay=speed*STEP
    for lev,(z0,z1,spr) in enumerate([(0,11.2,5.6),(11.2,22.4,5.0)]):
        arcade('inner %02d level %d'%(i,lev),80,64,t,bay,z0,z1,bay*.59,spr,BRICK,depth=2.6)
    top=31.5-(1.5 if i%11 in [0,1] else .0)-(2 if i%17==0 else 0)
    # Small rectangular apertures on upper surviving inner wall.
    for x0,x1,z0,z1 in [(-bay/2,bay/2,22.4,24.1),(-bay/2,-.70,24.1,top),(.70,bay/2,24.1,top),(-.70,.70,27.3,top)]:
        box('inner upper masonry',80,64,t,x0,x1,z0,z1,2.6,BRICK)
    for z in [11.2,22.4]:
        box('inner travertine band',80,64,t,-bay/2,bay/2,z-.3,z+.3,2.9,STONE)

# Northern outer 38 of 80 bays; opposite sector deliberately absent.
START=STEP/2; END=START+38*STEP
for i in range(38):
    t=START+(i+.5)*STEP
    speed=math.hypot(92.6*math.sin(t),76.6*math.cos(t)); bay=speed*STEP
    for lev,(z0,z1,spr) in enumerate([(0,12.0,5.5),(12,23.3,4.9),(23.3,34.3,4.6)]):
        arcade('north outer bay %02d order %d'%(i,lev+1),92.6,76.6,t,bay,z0,z1,bay*.63,spr,STONE,columns=True)
    # Windowed solid attic; never a fourth row of arches or a crenellated fantasy wall.
    if i%2==0:
        for x0,x1,z0,z1 in [(-bay/2,bay/2,34.3,38.6),(-bay/2,-.85,38.6,46.9),(.85,bay/2,38.6,46.9),(-.85,.85,41.4,46.9)]:
            box('attic rectangular window',92.6,76.6,t,x0,x1,z0,z1,2.6,STONE)
    else:
        box('solid attic bay',92.6,76.6,t,-bay/2,bay/2,34.3,46.9,2.6,STONE)
    box('attic pilaster',94.1,78.1,t,-bay/2-.28,-bay/2+.28,35,46.7,.6,TRIM)
for z in [0.3,11.7,23.0,34.0,47.4]:
    ring('north cornice',90.8,74.8,94.2,78.2,z-.4,z+.4,TRIM,start=START,end=END,segments=150)

# The two end restorations differ: one broad solid brick wedge, one stepped arcade support.
for side,t in enumerate([START,END]):
    p,tan,n=frame(92.6,76.6,t)
    sign=-1 if side==0 else 1
    if side==0:
        panel('interpreted Stern solid restoration spur',92.6,76.6,t,[(0,0),(sign*8,0),(sign*1.5,45),(0,47)],4.6,BRICK,.18)
    else:
        for j in range(4):
            box('interpreted Valadier stepped restoration',92.6,76.6,t,0,sign*(7.5-j*1.6),j*10,(j+1)*10,4.3,STONE,.18)

# Restrained stone block seams only on the attic, not dense photo noise.
for j in range(5):
    ring('attic horizontal joint',91.2,75.2,94.0,78.0,36+j*2,36.12+j*2,TRIM,start=START,end=END,segments=150,bevel=.025)

scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1536; scene.render.resolution_y=1024; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.world.color=(.7,.7,.7)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.83,.80,.74,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.8
scene.view_settings.view_transform='AgX'

for name,pos,power,size in [('large softbox',(-80,-120,180),1800000,140),('fill',(100,20,150),1100000,120)]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    ob=bpy.context.object; ob.name=name; ob.data.energy=power; ob.data.shape='DISK'; ob.data.size=size
    ob.rotation_euler=(Vector((0,0,12))-ob.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
cam=bpy.context.object; scene.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=222
target=Vector((0,0,15))
views={
    'front':(0,-280,118),
    'left':(-280,0,118),
    'back':(0,280,118),
    'right':(280,0,118),
    'interior-review':(145,-220,190),
    'plan-review':(0,0,330),
}
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'colosseum-reference-maquette-v01.blend'))
for name,pos in views.items():
    cam.location=pos; cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'colosseum-{name}-v01.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED',name,flush=True)
report={'role':'Tripo reconstruction reference maquette only; not production base','outer_plan_guide':[188,156], 'arena_plan_guide':[83,48], 'north_outer_arc_bays':38,'bay_grid':80,'assumptions':'elliptical approximation, schematic survival profile and inner wall, simplified cavea; covered game floor', 'views':views,'projection':'orthographic; four slot images at matching ~20 degree elevation, same camera scale 222','objects':len(bpy.data.objects)}
(OUT/'reference-maquette-report.json').write_text(json.dumps(report,indent=2)+'\n')
