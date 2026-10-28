#!/usr/bin/env python3
"""Turns the Tripo character exports into compact game GLBs.

    python -I tools/import-characters.py [ids...]

Reads .local/models-src/<id>/{model.obj, basecolor.JPEG, normal.JPEG, ...}
(the zips in the project root, extracted) and writes
public/models/characters/<id>.glb:

  * decimated to a game budget with meshoptimizer's attribute-aware
    simplifier (UV seams kept), welded, smooth normals recomputed;
  * turned to face +X with the feet at y = 0, centred on the trunk and
    scaled to metres (CONFIG below);
  * base colour (and optionally the normal map) as 1024 px JPEG, metallic 0
    (soft toys); 奶蛙's normal pose recoloured to the laughing model's yellow.

Needs numpy, scipy, Pillow and meshoptimizer (pip). Parsed OBJs are cached
as .npz next to the sources, so re-runs only redo the cheap steps.
"""
import io, json, struct, sys
from pathlib import Path

import numpy as np
import meshoptimizer as mo
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / '.local' / 'models-src'
OUT = ROOT / 'public' / 'models' / 'characters'

# Per output GLB, all lengths in the source's units unless noted:
#   source     folder in .local/models-src
#   scale      source units -> metres (both 奶蛙 poses share one, so the body
#              keeps its size when the laugh swaps in)
#   band       source heights whose trunk bounding box is centred on x = z = 0
#   roughness  one constant for the whole toy (Tripo's maps disagree between
#              the two 奶蛙 poses, which would make the same yellow read
#              differently); metallic is always 0
#   recolour   take this other model's skin colour (see match_yellow)
#   grade      (lightness, chroma, hue) for the game lighting (see grade); the
#              two 奶蛙 poses share one, after matching, so they stay identical
#   arms       limb planes [(axis, sign, limit, y_min, y_max)]: the arm lies
#              beyond `limit` on that side within the height range. They only
#              measure the shoulders (where the arm meets the trunk), stored
#              in the GLB's extras; the game flaps the arms about them
# The models face +Z in the export; yaw 90 turns that onto +X.
NAIWA_GRADE = (-5, 1.4, 0)
CAT_ARMS = [(0, -1, -0.235, 0.55, 0.755), (0, 1, 0.105, 0.47, 0.75)]
CONFIG = {
    'naiwa': dict(source='naiwa', scale=1.78 / 0.98, band=(0.3, 0.5), roughness=0.66, recolour='naiwa-laugh', grade=NAIWA_GRADE),
    'naiwa-laugh': dict(source='naiwa-laugh', scale=1.78 / 0.98, band=(0.3, 0.5), roughness=0.66, grade=NAIWA_GRADE),
    'dudu': dict(source='dudu', scale=2.0, band=(0.3, 0.5), roughness=0.8, grade=(-14, 1.2, -8)),
    # 1.85 m tall: between 奶蛙 and 胆子肥嘟嘟.
    'happy-cat': dict(source='happy-cat', scale=1.85 / 0.98, band=(0.3, 0.5), roughness=0.82, arms=CAT_ARMS),
}
YAW = 90
TRIANGLES = 24000


def parse_obj(path):
    """v / vt / f (v/vt triangles) of a Blender OBJ, as numpy arrays."""
    cache = path.with_suffix('.npz')
    if cache.exists() and cache.stat().st_mtime > path.stat().st_mtime:
        data = np.load(cache)
        return data['v'], data['vt'], data['f']
    lines = path.read_bytes().split(b'\n')
    v = [l[2:] for l in lines if l.startswith(b'v ')]
    vt = [l[3:] for l in lines if l.startswith(b'vt ')]
    f = [l[2:] for l in lines if l.startswith(b'f ')]
    del lines
    v = np.array(b' '.join(v).split(), dtype=np.float64).reshape(-1, 3)
    vt = np.array(b' '.join(vt).split(), dtype=np.float64).reshape(-1, 2)
    f = np.array(b' '.join(f).replace(b'/', b' ').split(), dtype=np.int64)
    assert f.size % 6 == 0, 'expected triangles with v/vt indices'
    f = f.reshape(-1, 6) - 1
    np.savez(cache, v=v, vt=vt, f=f)
    return v, vt, f


def corner_mesh(v, vt, f):
    """One vertex per distinct (position, uv) pair; indices into it."""
    pairs = np.stack([f[:, 0::2].ravel(), f[:, 1::2].ravel()], axis=1)
    unique, inverse = np.unique(pairs, axis=0, return_inverse=True)
    return v[unique[:, 0]].astype(np.float32), vt[unique[:, 1]].astype(np.float32), inverse.reshape(-1).astype(np.uint32), unique[:, 0]


def simplify(positions, uvs, indices, triangles, error=0.05):
    """meshopt_simplifyWithAttributes (UVs weighted in, seams may slide along
    themselves). The python wrapper passes floats untyped, so call the C
    function with its signature declared."""
    import ctypes
    from meshoptimizer.simplifier import lib
    P = lambda t: ctypes.POINTER(t)
    fn = lib.meshopt_simplifyWithAttributes
    fn.restype = ctypes.c_size_t
    fn.argtypes = [P(ctypes.c_uint), P(ctypes.c_uint), ctypes.c_size_t, P(ctypes.c_float), ctypes.c_size_t, ctypes.c_size_t,
                   P(ctypes.c_float), ctypes.c_size_t, P(ctypes.c_float), ctypes.c_size_t, P(ctypes.c_ubyte),
                   ctypes.c_size_t, ctypes.c_float, ctypes.c_uint, P(ctypes.c_float)]
    indices = np.ascontiguousarray(indices, dtype=np.uint32)
    positions = np.ascontiguousarray(positions, dtype=np.float32)
    attributes = np.ascontiguousarray(uvs, dtype=np.float32)
    weights = np.array([0.5, 0.5], dtype=np.float32)
    out = np.zeros(indices.size, dtype=np.uint32)
    result_error = ctypes.c_float(0)
    count = fn(out.ctypes.data_as(P(ctypes.c_uint)), indices.ctypes.data_as(P(ctypes.c_uint)), indices.size,
               positions.ctypes.data_as(P(ctypes.c_float)), len(positions), 12, attributes.ctypes.data_as(P(ctypes.c_float)), 8,
               weights.ctypes.data_as(P(ctypes.c_float)), 2, None, triangles * 3, error, 0, ctypes.byref(result_error))
    out = out[:count]
    used, remap = np.unique(out, return_inverse=True)
    print(f'  simplified with relative error {result_error.value:.4f}')
    return positions[used], uvs[used], remap.astype(np.uint32), used


def smooth_normals(positions, indices, position_ids):
    """Area-weighted normals shared by every vertex at the same source position
    (so UV seams do not show as creases)."""
    tri = indices.reshape(-1, 3)
    a, b, c = positions[tri[:, 0]], positions[tri[:, 1]], positions[tri[:, 2]]
    face = np.cross(b - a, c - a)
    keys, group = np.unique(position_ids, return_inverse=True)
    acc = np.zeros((keys.size, 3))
    for k in range(3):
        np.add.at(acc, group[tri[:, k]], face)
    n = acc[group]
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return n.astype(np.float32)


def place(positions, scale, band, centre=None):
    """Face +X, feet on y = 0, trunk on x = z = 0, in metres. `centre` (source
    x, z of the trunk) comes from the full-resolution mesh."""
    p = positions.astype(np.float64).copy()
    floor = p[:, 1].min() if centre is None else centre[2]
    if centre is None:
        trunk = p[(p[:, 1] > band[0]) & (p[:, 1] < band[1])]
        lo, hi = trunk.min(axis=0), trunk.max(axis=0)
        centre = ((lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2, floor)
    x, z = p[:, 0] - centre[0], p[:, 2] - centre[1]
    r = np.radians(YAW)
    c, s = np.cos(r), np.sin(r)
    # Rotation about +Y (three.js convention): x' = x c + z s, z' = -x s + z c.
    out = np.stack([x * c + z * s, p[:, 1] - floor, -x * s + z * c], axis=1) * scale
    return out.astype(np.float32), centre


def measure_shoulders(v, f, cuts):
    """Where each arm meets the trunk: drops the triangles beyond each limb
    plane and takes the largest hole left on that plane (its centre and mean
    radius). The mesh itself is not changed."""
    centroid = v[f[:, 0::2]].mean(axis=1)
    drop = np.zeros(len(f), bool)
    for axis, sign, limit, y0, y1 in cuts:
        drop |= (sign * (centroid[:, axis] - limit) > 0) & (centroid[:, 1] > y0) & (centroid[:, 1] < y1)
    keep = f[~drop]
    # Boundary edges: directed edges whose reverse is missing.
    a = keep[:, [0, 2, 4]].ravel().tolist()
    b = keep[:, [2, 4, 0]].ravel().tolist()
    forward = set(zip(a, b))
    nxt = {i: j for i, j in zip(a, b) if (j, i) not in forward}
    loops, seen = [], set()
    for start in list(nxt):
        if start in seen:
            continue
        loop, k = [], start
        while k not in seen:
            seen.add(k)
            loop.append(k)
            k = nxt[k]
        if len(loop) >= 3:
            centre = v[loop].mean(axis=0)
            loops.append((centre, float(np.linalg.norm(v[loop] - centre, axis=1).mean())))
    shoulders = []
    for axis, sign, limit, y0, y1 in cuts:
        on = [(c, r) for c, r in loops if abs(c[axis] - limit) < 0.03 and y0 <= c[1] <= y1]
        shoulders.append(max(on, key=lambda entry: entry[1]))
    return shoulders


# ---------------- colour ----------------


def srgb_to_lab(rgb):
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T
    xyz /= np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116
    f = np.stack([fy + lab[..., 1] / 500, fy, fy - lab[..., 2] / 200], axis=-1)
    xyz = np.where(f > 0.206893, f ** 3, (f - 16 / 116) / 7.787) * np.array([0.95047, 1.0, 1.08883])
    c = xyz @ np.array([[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.2040, 1.0570]]).T
    c = np.where(c > 0.0031308, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055, 12.92 * c)
    return np.clip(np.round(c * 255), 0, 255).astype(np.uint8)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def skin_weight(lab):
    """How much a colour belongs to the yellow skin (body and cream belly):
    yellow hues, not the dark olive hands, feet and mouth, not the green eyes
    or the pink blush."""
    chroma = np.hypot(lab[..., 1], lab[..., 2])
    hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1]))
    return (smoothstep(40, 52, lab[..., 0]) * smoothstep(10, 18, chroma)
            * smoothstep(52, 64, hue) * (1 - smoothstep(102, 112, hue)))


def surface_colours(name, texture, count=200000, seed=1):
    """Base colours sampled uniformly over the model's surface (by area)."""
    v, vt, f = parse_obj(SRC / name / 'model.obj')
    rng = np.random.default_rng(seed)
    a, b, c = v[f[:, 0]], v[f[:, 2]], v[f[:, 4]]
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1)
    pick = rng.choice(len(f), count, p=area / area.sum())
    s, t = np.sqrt(rng.random(count)), rng.random(count)
    w = np.stack([1 - s, s * (1 - t), s * t], axis=1)
    uv = vt[f[pick, 1]] * w[:, :1] + vt[f[pick, 3]] * w[:, 1:2] + vt[f[pick, 5]] * w[:, 2:]
    pixels = np.asarray(texture, dtype=np.float64)
    h, wd = pixels.shape[:2]
    return pixels[np.clip(((1 - uv[:, 1]) * h).astype(int), 0, h - 1), np.clip((uv[:, 0] * wd).astype(int), 0, wd - 1)]


def skin_stats(lab):
    w = skin_weight(lab)
    mean = (lab * w[:, None]).sum(0) / w.sum()
    return mean, np.hypot(mean[1], mean[2]), np.degrees(np.arctan2(mean[2], mean[1]))


def match_yellow(source, target):
    """Recolours `source`'s base colour so its yellow skin takes the colour
    distribution of `target`'s skin: sliced optimal transport between the two
    surfaces' skin colours in Lab, smoothed into a 3D lookup table and applied
    to the texels by their skin weight (eyes, mouth, hands and blush keep
    their colours). Returns the new image and a report."""
    src_image = Image.open(SRC / source / 'basecolor.JPEG').convert('RGB')
    tgt_image = Image.open(SRC / target / 'basecolor.JPEG').convert('RGB')
    src = srgb_to_lab(surface_colours(source, src_image))
    tgt = srgb_to_lab(surface_colours(target, tgt_image))
    rng = np.random.default_rng(7)
    # Draw both skins with their weights, the same number of samples each.
    n = 60000
    src_skin = src[rng.choice(len(src), n, p=skin_weight(src) / skin_weight(src).sum())]
    tgt_skin = tgt[rng.choice(len(tgt), n, p=skin_weight(tgt) / skin_weight(tgt).sum())]
    moved = src_skin.copy()
    for _ in range(60):
        q, _r = np.linalg.qr(rng.normal(size=(3, 3)))
        a, b = moved @ q, tgt_skin @ q
        for k in range(3):
            order = np.argsort(a[:, k])
            a[order, k] += (np.sort(b[:, k]) - a[order, k]) * 0.5
        moved = a @ q.T
    # Converge the last steps fully along the Lab axes.
    for _ in range(20):
        q, _r = np.linalg.qr(rng.normal(size=(3, 3)))
        a, b = moved @ q, tgt_skin @ q
        for k in range(3):
            order = np.argsort(a[:, k])
            a[order, k] = np.sort(b[:, k])
        moved = a @ q.T
    shift = moved - src_skin
    # Smooth displacement field on a Lab grid (Gaussian kernel regression).
    axes = [np.linspace(0, 100, 26), np.linspace(-40, 60, 26), np.linspace(-20, 100, 31)]
    grid = np.stack(np.meshgrid(*axes, indexing='ij'), axis=-1).reshape(-1, 3)
    from scipy.spatial import cKDTree
    tree = cKDTree(src_skin)
    lut = np.zeros_like(grid)
    sigma = 6.0
    for i in range(0, len(grid), 4096):
        g = grid[i:i + 4096]
        dist, idx = tree.query(g, k=64)
        kw = np.exp(-(dist / sigma) ** 2) + 1e-12
        lut[i:i + 4096] = (shift[idx] * kw[..., None]).sum(1) / kw.sum(1)[:, None]
    lut = lut.reshape(len(axes[0]), len(axes[1]), len(axes[2]), 3)
    from scipy.interpolate import RegularGridInterpolator
    field = RegularGridInterpolator(axes, lut, bounds_error=False, fill_value=None)

    def recolour(lab):
        flat = lab.reshape(-1, 3)
        return (flat + field(np.clip(flat, [0, -40, -20], [100, 60, 100])) * skin_weight(flat)[:, None]).reshape(lab.shape)

    out = Image.fromarray(lab_to_srgb(recolour(srgb_to_lab(np.asarray(src_image)))))
    after = srgb_to_lab(surface_colours(source, out))
    report = {name: dict(zip(('mean_lab', 'chroma', 'hue'), skin_stats(lab))) for name, lab in
              (('source_before', src), ('source_after', after), ('target', tgt))}
    return out, report


def grade(image, lightness=0.0, chroma=1.0, hue=0.0):
    """Game-lighting grade: the arena's bright hemisphere/key light and ACES
    tone mapping bleach light, mid-chroma albedos (the old sculpts used deep,
    saturated yellows for this reason). Darkens by `lightness` (Lab L),
    scales chroma and turns the hue (degrees), only on the yellow skin:
    weighted by chroma and a yellow hue window, so greys, whites, black
    pupils, green eyes, the brown nose and the red mouth keep their values."""
    lab = srgb_to_lab(np.asarray(image))
    c = np.hypot(lab[..., 1], lab[..., 2])
    h = np.arctan2(lab[..., 2], lab[..., 1])
    hd = np.degrees(h)
    w = smoothstep(8, 20, c) * smoothstep(52, 64, hd) * (1 - smoothstep(108, 118, hd))
    h = h + np.radians(hue) * w
    c = c * (1 + (chroma - 1) * w)
    out = np.stack([lab[..., 0] + lightness * w, c * np.cos(h), c * np.sin(h)], axis=-1)
    return Image.fromarray(lab_to_srgb(out))


def jpeg(image, quality=88, size=1024):
    if max(image.size) > size:
        image = image.resize((size, size), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, 'JPEG', quality=quality, optimize=True, progressive=False)
    return buffer.getvalue()


def write_glb(path, positions, normals, uvs, indices, images, roughness, extras):
    """A single textured mesh. images: {'base': bytes, 'normal': bytes|None}."""
    chunks, views, accessors = [], [], []

    def view(data, target=None):
        offset = sum(len(c) for c in chunks)
        chunks.append(data + b'\0' * (-len(data) % 4))
        entry = {'buffer': 0, 'byteOffset': offset, 'byteLength': len(data)}
        if target:
            entry['target'] = target
        views.append(entry)
        return len(views) - 1

    def accessor(array, kind, component, target, minmax=False):
        index = view(array.tobytes(), target)
        entry = {'bufferView': index, 'componentType': component, 'count': len(array), 'type': kind}
        if minmax:
            entry['min'] = array.min(axis=0).tolist()
            entry['max'] = array.max(axis=0).tolist()
        accessors.append(entry)
        return len(accessors) - 1

    attributes = {
        'POSITION': accessor(positions.astype(np.float32), 'VEC3', 5126, 34962, True),
        'NORMAL': accessor(normals.astype(np.float32), 'VEC3', 5126, 34962),
        'TEXCOORD_0': accessor(uvs.astype(np.float32), 'VEC2', 5126, 34962),
    }
    index_type = np.uint16 if len(positions) < 65536 else np.uint32
    primitive = {'attributes': attributes, 'material': 0,
                 'indices': accessor(indices.astype(index_type), 'SCALAR', 5123 if index_type == np.uint16 else 5125, 34963)}
    gltf_images, textures = [], []
    for name in ('base', 'normal'):
        if images.get(name):
            gltf_images.append({'bufferView': view(images[name]), 'mimeType': 'image/jpeg', 'name': name})
            textures.append({'source': len(gltf_images) - 1, 'sampler': 0})
    pbr = {'baseColorTexture': {'index': 0}, 'metallicFactor': 0.0, 'roughnessFactor': roughness}
    material = {'name': 'toy', 'pbrMetallicRoughness': pbr}
    if images.get('normal'):
        material['normalTexture'] = {'index': 1}
    gltf = {
        'asset': {'version': '2.0', 'generator': 'tools/import-characters.py'},
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': path.stem}],
        'meshes': [{'name': path.stem, 'primitives': [primitive], 'extras': extras}],
        'materials': [material], 'textures': textures, 'images': gltf_images,
        'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'accessors': accessors, 'bufferViews': views, 'buffers': [{'byteLength': sum(len(c) for c in chunks)}],
    }
    body = b''.join(chunks)
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(body))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(body), 0x004E4942) + body
    path.write_bytes(glb)
    return len(glb)


def convert(name, normal=False):
    config = CONFIG[name]
    folder = SRC / config['source']
    v, vt, f = parse_obj(folder / 'model.obj')
    _, centre = place(v, config['scale'], config['band'])
    shoulders = None
    if config.get('arms'):
        shoulders = measure_shoulders(v, f, config['arms'])
    positions, uvs, indices, position_ids = corner_mesh(v, vt, f)
    source_triangles = indices.size // 3
    positions, uvs, indices, used = simplify(positions, uvs, indices, TRIANGLES)
    position_ids = position_ids[used]
    positions, _ = place(positions, config['scale'], config['band'], centre)
    normals = smooth_normals(positions, indices, position_ids)
    # OBJ UVs start bottom-left, glTF's top-left.
    uvs = np.stack([uvs[:, 0], 1 - uvs[:, 1]], axis=1)
    extras = {'sourceTriangles': int(source_triangles)}
    if shoulders:
        # Game sides: L is -z, R is +z. Radius in metres.
        # span: the arm plane's height range, metres (the arm lies beyond the shoulder within it).
        placed = [(place(c[None], config['scale'], config['band'], centre)[0][0], r * config['scale'],
                   [round(float((y - centre[2]) * config['scale']), 4) for y in cut[3:5]]) for (c, r), cut in zip(shoulders, config['arms'])]
        extras['shoulders'] = {('L' if c[2] < 0 else 'R'): {'at': [round(float(x), 4) for x in c], 'radius': round(r, 4), 'span': span}
                               for c, r, span in placed}
        print('  shoulders', extras['shoulders'])
    if config.get('recolour'):
        base, report = match_yellow(config['source'], CONFIG[config['recolour']]['source'])
        extras['recolour'] = {key: {'lab': [round(float(x), 2) for x in value['mean_lab']], 'chroma': round(float(value['chroma']), 2),
                                    'hue': round(float(value['hue']), 2)} for key, value in report.items()}
        print('  skin', json.dumps(extras['recolour']))
    else:
        base = Image.open(folder / 'basecolor.JPEG').convert('RGB')
    if config.get('grade'):
        base = grade(base, *config['grade'])
        extras['grade'] = list(config['grade'])
    images = {'base': jpeg(base), 'normal': jpeg(Image.open(folder / 'normal.JPEG').convert('RGB'), 90) if normal else None}
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f'{name}.glb'
    size = write_glb(out, positions, normals, uvs, indices, images, config['roughness'], extras)
    box = positions.min(axis=0).round(3).tolist(), positions.max(axis=0).round(3).tolist()
    print(f'{name}: {source_triangles} -> {indices.size // 3} triangles, {len(positions)} vertices, {size / 1024:.0f} KB, box {box}')


if __name__ == '__main__':
    for name in sys.argv[1:] or CONFIG:
        convert(name)
