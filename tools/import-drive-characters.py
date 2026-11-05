#!/usr/bin/env python3
"""Prepare the 5 November Drive character packet using the existing importer.

Original archives stay in .local/character-intake-2026-11-05/source.
Requires numpy and meshoptimizer. Run with --out to inspect before publishing
the measured exports to public/models/characters. Poses remain rigid bodies.
"""
import argparse
import ctypes
import hashlib
import importlib.util
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INTAKE = ROOT / '.local/character-intake-2026-11-05'
sys.path.insert(0, str(INTAKE / 'python'))
import numpy as np

spec = importlib.util.spec_from_file_location('character_importer', ROOT / 'tools/import-characters.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)

SOURCES = {
    'cr7': ('soccer-player', '*.obj', 1.85),
    'mean-girl': ('meangirl', '*.obj', 1.85),
    'soccer-ball': ('soccer-ball', '*.obj', 0.92),
    'crowned-heart': ('crowned-heart', '*.obj', 1.05),
    'maodie': ('maodie', '**/Maodie_Idle_Optimized.glb', 1.85),
    'maodie-paw': ('maodie', '**/Catpaw_Optimized.glb', 1.10),
}


def obj_mesh(path):
    groups = {key: [] for key in (b'v', b'vt', b'f')}
    with path.open('rb') as source:
        for line in source:
            key, _, value = line.partition(b' ')
            if key in groups:
                groups[key].append(value.strip())
    positions = np.fromstring(b' '.join(groups[b'v']).decode('ascii'), sep=' ', dtype=np.float32).reshape(-1, 3)
    uvs = np.fromstring(b' '.join(groups[b'vt']).decode('ascii'), sep=' ', dtype=np.float32).reshape(-1, 2)
    faces = np.fromstring(b' '.join(groups[b'f']).replace(b'/', b' ').decode('ascii'), sep=' ', dtype=np.int32).reshape(-1, 9)
    # These exports have triangular v/vt/vn faces. Normals are recomputed after
    # simplification, sharing source positions across UV seams as before.
    face_pairs = faces[:, [0, 1, 3, 4, 6, 7]] - 1
    p, uv, indices, position_ids = shared.corner_mesh(positions, uvs, face_pairs)
    return p, uv, indices, position_ids, None


def glb_mesh(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    start = 28 + length
    primitive = doc['meshes'][0]['primitives'][0]

    def accessor(index):
        entry = doc['accessors'][index]
        view = doc['bufferViews'][entry['bufferView']]
        dtype = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[entry['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[entry['type']]
        offset = start + view.get('byteOffset', 0) + entry.get('byteOffset', 0)
        result = np.frombuffer(raw, dtype=dtype, count=entry['count'] * width, offset=offset).reshape(-1, width).copy()
        if entry.get('normalized') and dtype != np.float32:
            result = result.astype(np.float32) / np.iinfo(dtype).max
        return result

    positions = accessor(primitive['attributes']['POSITION'])
    colors = accessor(primitive['attributes']['COLOR_0'])[:, :3]
    indices = accessor(primitive['indices']).ravel().astype(np.uint32)
    # Bake the supplied node's Blender-to-glTF orientation into the vertices.
    x, y, z, w = doc['nodes'][0].get('rotation', [0, 0, 0, 1])
    rotation = np.array([
        [1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w)],
        [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w)],
        [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y)],
    ])
    positions = (positions @ rotation.T).astype(np.float32)
    return positions, np.zeros((len(positions), 2), np.float32), indices, np.arange(len(positions)), colors


def simplify_colored(positions, colors, indices, triangles):
    from meshoptimizer.simplifier import lib
    pointer = ctypes.POINTER
    uint = pointer(ctypes.c_uint)
    floating = pointer(ctypes.c_float)
    function = lib.meshopt_simplifyWithAttributes
    function.restype = ctypes.c_size_t
    function.argtypes = [uint, uint, ctypes.c_size_t, floating, ctypes.c_size_t, ctypes.c_size_t,
                         floating, ctypes.c_size_t, floating, ctypes.c_size_t, pointer(ctypes.c_ubyte),
                         ctypes.c_size_t, ctypes.c_float, ctypes.c_uint, floating]
    positions = np.ascontiguousarray(positions, np.float32)
    colors = np.ascontiguousarray(colors, np.float32)
    indices = np.ascontiguousarray(indices, np.uint32)
    weights = np.full(3, 0.5, np.float32)
    output = np.zeros(len(indices), np.uint32)
    error = ctypes.c_float(0)
    count = function(output.ctypes.data_as(uint), indices.ctypes.data_as(uint), len(indices),
                     positions.ctypes.data_as(floating), len(positions), 12,
                     colors.ctypes.data_as(floating), 12, weights.ctypes.data_as(floating), 3,
                     None, triangles * 3, 0.05, 0, ctypes.byref(error))
    used, remap = np.unique(output[:count], return_inverse=True)
    return positions[used], colors[used], remap.astype(np.uint32), used


def convert(name, output):
    folder_name, pattern, height = SOURCES[name]
    folder = INTAKE / 'unpacked' / folder_name
    source = next(folder.glob(pattern))
    p, uv, indices, source_ids, colors = glb_mesh(source) if source.suffix == '.glb' else obj_mesh(source)
    before = len(indices) // 3
    scale = height / np.ptp(p[:, 1])
    # Use one body-frame convention throughout: +X face, feet at zero. The
    # new weapons use +Y length with their lowest surface at zero.
    centre = (p.min(0) + p.max(0)) / 2
    p -= [centre[0], p[:, 1].min(), centre[2]]
    p *= scale
    # Painted fronts face +X, also the leading side of a normal W stroke.
    p = p[:, [2, 1, 0]] * [1, 1, -1]
    p = p.astype(np.float32)
    if before > 24000:
        if colors is None:
            p, uv, indices, used = shared.simplify(p, uv, indices, 24000)
        else:
            p, colors, indices, used = simplify_colored(p, colors, indices, 24000)
            uv = uv[used]
        source_ids = source_ids[used]
    normals = shared.smooth_normals(p, indices, source_ids)
    if source.suffix == '.obj':
        uv = np.stack([uv[:, 0], 1 - uv[:, 1]], axis=1)
    base = next(folder.glob('*_basecolor.jpg'), None)
    images = {'base': base.read_bytes() if base else None}
    extras = {'sourceTriangles': before, 'driveIntake': '2026-11-05', 'role': 'static imported model'}
    output.mkdir(parents=True, exist_ok=True)
    path = output / f'{name}.glb'
    shared.write_glb(path, p, normals, uv, indices, images, 0.72, extras, colors=colors)
    result = {'id': name, 'source': str(source.relative_to(ROOT)), 'sourceTriangles': before,
              'triangles': len(indices) // 3, 'vertices': len(p), 'bytes': path.stat().st_size,
              'bounds': [p.min(0).tolist(), p.max(0).tolist()], 'vertexColors': colors is not None,
              'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
    print(json.dumps(result), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'public/models/characters')
    parser.add_argument('ids', nargs='*', choices=tuple(SOURCES))
    options = parser.parse_args()
    results = [convert(name, options.out) for name in options.ids or SOURCES]
    (INTAKE / 'prepared-models.json').write_text(json.dumps(results, indent=2) + '\n')
