"""Seed a common take-off state, then simulate independent body/ear dynamics.

A brief external test motor pulse supplies momentum, not a flight trajectory.
After release Bullet integrates gravity, hinge forces, a finite hinge brake,
and floor contacts. This is an airborne response study, not a launch solver.
"""
from pathlib import Path
import json
import math
import sys
import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/blender/beagle-airborne-physics'
OUT.mkdir(parents=True, exist_ok=True)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
NAME = args[0] if args else 'soft-forward'
DIRECTION = int(args[1]) if len(args) > 1 else 1
BRAKE = float(args[2]) if len(args) > 2 else 1.3
FPS, DURATION = 120, 3
LENGTH, CENTER, ANCHOR = 3.6, .85, 1.43
HEIGHT, VERTICAL_SPEED, TRAVEL_SPEED, SPIN = 3.72, 7.0, 5.5, 7.5
EAR_MASS = .055

bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'assets/source/blender/beagle-ear-motion-study-v02.blend'))
s = bpy.context.scene
s.frame_set(1)
root = bpy.data.objects['CTRL_Beagle_Root']
root.animation_data_clear()
root.location, root.rotation_euler = (0, 0, 0), (0, 0, 0)
paddles = [bpy.data.objects[f'{side} Ear Paddle'] for side in ('L', 'R')]
verts = []
bpy.context.view_layer.update()
for obj in root.children_recursive:
    if obj.type == 'MESH' and obj not in paddles:
        verts.extend(tuple(obj.matrix_world @ v.co - Vector((0, 0, CENTER))) for v in obj.data.vertices)
ear_meshes = [obj.data.copy() for obj in paddles]
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
s.render.fps = FPS
s.frame_start, s.frame_end = 1, FPS * DURATION
s.gravity = (0, 0, -19)

mesh = bpy.data.meshes.new('Body Collision Hull')
mesh.from_pydata(verts, [], [])
bm = bmesh.new(); bm.from_mesh(mesh)
bmesh.ops.convex_hull(bm, input=list(bm.verts), use_existing_faces=False)
bm.to_mesh(mesh); bm.free(); mesh.update()
assert not mesh.validate()


def active(name, mesh, mass):
    obj = bpy.data.objects.new(name, mesh)
    s.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.rigidbody.object_add()
    obj.select_set(False)
    rb = obj.rigid_body
    rb.mass, rb.collision_shape = mass, 'CONVEX_HULL'
    rb.friction, rb.restitution = .85, .03
    rb.use_margin, rb.collision_margin = True, .008
    rb.linear_damping, rb.angular_damping = .015, .015
    rb.use_deactivation = False
    return obj


body = active('SIM_Beagle_Body', mesh, 1.2)
ears = []
for side, mesh in zip((-1, 1), ear_meshes):
    for v in mesh.vertices: v.co.z -= LENGTH / 2
    ears.append(active(f'SIM_Ear_{side}', mesh, EAR_MASS))

# Place a common launch pose. A brief finite motor pulse below supplies the
# initial velocities; all three bodies remain dynamic throughout the test.
beta, rel = 0, DIRECTION * 2.55
p = Vector((0,0,HEIGHT))
body.location, body.rotation_euler = p, (0,beta,0)
for side,ear in zip((-1,1),ears):
    anchor = p + Vector((0,side*.66,ANCHOR-CENTER))
    ear.location = anchor + Matrix.Rotation(rel,3,'Y') @ Vector((0,0,LENGTH/2))
    ear.rotation_euler = (0,rel,0)
bpy.context.view_layer.update()

bpy.ops.mesh.primitive_cube_add(size=.1, location=(0,10,-5))
world_anchor = bpy.context.object
world_anchor.name = 'SIM_Static_World_Anchor'
bpy.ops.rigidbody.object_add()
world_anchor.rigid_body.type = 'PASSIVE'


def constraint(name, kind, location, object1, object2=None, rotation=(0, 0, 0)):
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=location, rotation=rotation)
    obj = bpy.context.object; obj.name = name
    bpy.ops.rigidbody.constraint_add()
    c = obj.rigid_body_constraint
    c.type, c.object1, c.object2 = kind, object1, object2 or world_anchor
    c.disable_collisions = True
    c.use_override_solver_iterations, c.solver_iterations = True, 100
    return obj, c


_, guide = constraint('Planar Guide', 'GENERIC', (0, 0, HEIGHT), body,
                      rotation=(-math.pi/2,0,0))
for axis in ('x', 'y', 'z'):
    setattr(guide, 'use_limit_lin_' + axis, axis == 'z')
    setattr(guide, 'limit_lin_' + axis + '_lower', 0)
    setattr(guide, 'limit_lin_' + axis + '_upper', 0)
    setattr(guide, 'use_limit_ang_' + axis, axis != 'z')
    setattr(guide, 'limit_ang_' + axis + '_lower', 0)
    setattr(guide, 'limit_ang_' + axis + '_upper', 0)
for side, ear in zip((-1, 1), ears):
    anchor = (0, side * .66, HEIGHT + ANCHOR - CENTER)
    constraint(f'Head Hinge {side}', 'HINGE', anchor, body, ear, (-math.pi/2, 0, 0))
    _, c = constraint(f'Finite Hinge Brake {side}', 'MOTOR', anchor, body, ear, (0, 0, math.pi/2))
    c.use_motor_ang, c.use_motor_lin = True, False
    c.motor_ang_target_velocity, c.motor_ang_max_impulse = 0, BRAKE

# A common test launch supplies linear and angular momentum through six
# simulation frames, then its force caps drop to zero. No flight pose is keyed.
for obj in (body,*ears):
    offset = obj.location - body.location
    velocity = Vector((DIRECTION*TRAVEL_SPEED,0,VERTICAL_SPEED)) + Vector((0,DIRECTION*SPIN,0)).cross(offset)
    rotation = Vector((1,0,0)).rotation_difference(velocity.normalized()).to_euler()
    _,linear = constraint('Launch Linear '+obj.name,'MOTOR',tuple(obj.location),obj,rotation=rotation)
    linear.use_motor_lin, linear.use_motor_ang = True,False
    linear.motor_lin_target_velocity = velocity.length
    _,angular = constraint('Launch Spin '+obj.name,'MOTOR',tuple(obj.location),obj,rotation=(0,0,math.pi/2))
    angular.use_motor_ang,angular.use_motor_lin=True,False
    angular.motor_ang_target_velocity = DIRECTION*SPIN
    for motor,prop in ((linear,'motor_lin_max_impulse'),(angular,'motor_ang_max_impulse')):
        for frame,value in ((1,1000),(8,0)):
            setattr(motor,prop,value);motor.keyframe_insert(data_path=prop,frame=frame)
            motor.enabled = frame == 1
            motor.keyframe_insert(data_path='enabled',frame=frame)
for obj in bpy.data.objects:
    if obj.animation_data and obj.animation_data.action:
        for slot in obj.animation_data.action.slots:
            for layer in obj.animation_data.action.layers:
                for strip in layer.strips:
                    bag=strip.channelbag(slot,ensure=False)
                    if bag:
                        for curve in bag.fcurves:
                            for point in curve.keyframe_points:point.interpolation='CONSTANT'

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -.15))
floor = bpy.context.object; floor.name = 'SIM_Ground'; floor.dimensions = (200,200,.3)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.rigidbody.object_add()
floor.rigid_body.type = 'PASSIVE'
floor.rigid_body.friction, floor.rigid_body.restitution = .85, .03
floor.rigid_body.use_margin, floor.rigid_body.collision_margin = True, .002
world = s.rigidbody_world
world.substeps_per_frame, world.solver_iterations = 12, 100
world.use_split_impulse = True
world.point_cache.frame_start, world.point_cache.frame_end = 1, s.frame_end
rows, previous, angles = [], [0, DIRECTION*2.55, DIRECTION*2.55], [0, DIRECTION*2.55, DIRECTION*2.55]
for frame in range(1, s.frame_end+1):
    s.frame_set(frame)
    dg = bpy.context.evaluated_depsgraph_get()
    matrices = [o.evaluated_get(dg).matrix_world.copy() for o in (body,*ears)]
    current = [math.atan2(m[0][2],m[2][2]) for m in matrices]
    if frame == 1: angles = current.copy()
    else:
        for i in range(3):angles[i] += (current[i]-previous[i]+math.pi)%math.tau-math.pi
    previous = current
    p = matrices[0].translation
    anchors = [m @ Vector((0,0,-LENGTH/2)) for m in matrices[1:]]
    error = max((a - (p + matrices[0].to_3x3() @ Vector((0,side*.66,ANCHOR-CENTER)))).length
                for side,a in zip((-1,1),anchors))
    low = min((m @ v.co).z for m,o in zip(matrices,(body,*ears)) for v in o.data.vertices)
    rows.append({'frame':frame,'time':(frame-1)/FPS,'body_position':list(p),
                 'body_pitch':angles[0],'ear_world_pitch':angles[1:].copy(),
                 'ear_relative_pitch':[a-angles[0] for a in angles[1:]],
                 'ear_positions':[list(a) for a in anchors], 'hinge_error':error,'min_height':low})
stats = {'max_body_height':max(r['body_position'][2] for r in rows),
         'body_pitch_range':[min(r['body_pitch'] for r in rows),max(r['body_pitch'] for r in rows)],
         'relative_ear_range':[min(r['ear_relative_pitch'][0] for r in rows),max(r['ear_relative_pitch'][0] for r in rows)],
         'max_hinge_error':max(r['hinge_error'] for r in rows),
         'min_height':min(r['min_height'] for r in rows),
         'max_planar_drift':max(abs(r['body_position'][1]) for r in rows)}
report = {'name':NAME,'direction':DIRECTION,'fps':FPS,'duration':DURATION,
          'engine':'Blender Bullet rigid bodies / hinge constraints / finite motor braking',
          'seed':{'kind':'brief external motor pulse, all bodies dynamic',
                  'disabled_at_frame':8,'body_height':HEIGHT,
                  'target_vertical_speed':VERTICAL_SPEED,'target_travel_speed':TRAVEL_SPEED,'target_spin':SPIN},
          'brake':BRAKE,'ear_mass':EAR_MASS,'body_mass':1.2,
          'substeps':12,'solver_iterations':100,'motion':rows,'stats':stats}
(OUT / f'{NAME}.json').write_text(json.dumps(report,indent=2)+'\n')
s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{NAME}.blend'))
print('AIRBORNE_PHYSICS',NAME,json.dumps(stats))
