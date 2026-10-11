"""Generate geometry masks for the two supplied, unrigged GLB demo models.

Requires numpy and Pillow. Run from any directory; generated files are committed.
Each vertex stores three little-endian float32 weights: hair, clothing, skin.
Original GLBs and their embedded textures remain unchanged.
"""
from pathlib import Path
import hashlib
import io
import json
import struct
import numpy as np
from PIL import Image

MODELS = Path(__file__).resolve().parents[1] / 'dist' / 'models'


def read_glb(path):
    raw = path.read_bytes()
    length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + length])
    data = raw[28 + length:]

    def accessor(index):
        acc = doc['accessors'][index]
        view = doc['bufferViews'][acc['bufferView']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[acc['type']]
        dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[acc['componentType']]
        offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
        item = np.dtype(dtype).itemsize
        return np.ndarray((acc['count'], width), dtype, buffer=data,
                          offset=offset, strides=(view.get('byteStride', width * item), item)).copy()

    prim = doc['meshes'][0]['primitives'][0]
    pos = accessor(prim['attributes']['POSITION'])
    uv = accessor(prim['attributes']['TEXCOORD_0'])
    faces = accessor(prim['indices']).reshape(-1, 3)
    image_view = doc['bufferViews'][doc['images'][0]['bufferView']]
    start = image_view.get('byteOffset', 0)
    image = np.asarray(Image.open(io.BytesIO(data[start:start + image_view['byteLength']])).convert('RGB')) / 255
    # glTF texture coordinates originate at the top left (flipY=false in Three).
    xy = np.clip(uv, 0, 1) * [image.shape[1] - 1, image.shape[0] - 1]
    rgb = image[np.rint(xy[:, 1]).astype(int), np.rint(xy[:, 0]).astype(int)]
    return raw, pos, faces, rgb


def largest_region(candidate, pos, faces):
    """Join UV seams and retain the main hair surface, excluding eyes/brows."""
    parent = list(range(len(pos)))
    def root(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    def join(a, b):
        if candidate[a] and candidate[b]:
            parent[root(a)] = root(b)
    welded = {}
    for i, p in enumerate(np.round(pos, 5)):
        key = tuple(p)
        if key in welded:
            join(i, welded[key])
        else:
            welded[key] = i
    for a, b, c in faces:
        join(a, b); join(b, c); join(c, a)
    groups = {}
    for i in np.flatnonzero(candidate):
        groups.setdefault(root(i), []).append(i)
    regions = sorted(groups.values(), key=len, reverse=True)
    out = np.zeros(len(pos), dtype=bool)
    if regions:
        # Long hair can have disconnected locks. Keep substantial components.
        for group in regions:
            if len(group) >= max(45, len(regions[0]) * .012):
                out[group] = True
    return out


def components(pos, faces):
    parent = list(range(len(pos)))
    def root(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    def join(a, b):
        parent[root(a)] = root(b)
    welded = {}
    for i, p in enumerate(np.round(pos, 5)):
        key = tuple(p)
        if key in welded:
            join(i, welded[key])
        else:
            welded[key] = i
    for a, b, c in faces:
        join(a, b); join(b, c)
    groups = {}
    for i in range(len(pos)):
        groups.setdefault(root(i), []).append(i)
    return sorted(groups.values(), key=len, reverse=True)


def generate(name):
    raw, pos, faces, rgb = read_glb(MODELS / f'{name}.glb')
    groups = components(pos, faces)
    r, g, b = rgb.T
    y = pos[:, 1]
    hair = np.zeros(len(pos), dtype=bool)
    clothes = np.zeros(len(pos), dtype=bool)
    if name == 'boy':
        # The supplied boy has a separate connected hair shell. Clothing shells
        # are shirt, trousers, slippers, cuffs, pocket and buttons. Hands, ankles,
        # face, brows and eyes have their own connected components.
        hair[groups[0]] = True
        clothing_groups = [2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 19, 22, 23, 24]
    else:
        # Hair and face are joined in the girl mesh. Segment brown within the
        # head shell, retaining the main hair region and protecting peach skin.
        brown = (r > g * 1.13) & (g > b * 1.03) & (r < .67) & (g < .48)
        head = np.zeros(len(pos), dtype=bool)
        head[groups[0]] = True
        hair = largest_region(brown & head, pos, faces)
        clothing_groups = [1, 2, 3, 4, 7, 8, 9, 10, 11, 16, 17, 26]
    for group in clothing_groups:
        clothes[groups[group]] = True
    # Only verified skin surfaces are eligible. Separate eyebrows, eye meshes,
    # teeth, mouth parts and slippers are never recolored. The shared girl
    # head additionally uses per-fragment texture protection in the shader.
    skin = np.zeros(len(pos), dtype=bool)
    for group in ([1, 4, 5, 25, 26] if name == 'boy' else [0, 5, 6, 12, 13]):
        skin[groups[group]] = True
    skin &= ~(hair | clothes)
    # Both source exports include an isolated quad above the character. Exclude
    # only that verified export artifact; original files stay untouched.
    artifact = groups[30 if name == 'boy' else 25]
    excluded = np.flatnonzero(np.isin(faces, artifact).any(axis=1))
    visible_vertices = np.unique(np.delete(faces, excluded, axis=0))
    mask = np.stack([hair, clothes, skin], axis=1).astype('<f4')
    mask.tofile(MODELS / f'{name}-mask-v2.bin')
    metadata = {'version': 2, 'model': f'{name}.glb', 'sha256': hashlib.sha256(raw).hexdigest(),
                'vertexCount': len(pos), 'triangleCount': len(faces),
                'format': 'float32-le-interleaved-hair-clothes-skin',
                'excludedTriangles': excluded.tolist(),
                'visibleBounds': {'min': pos[visible_vertices].min(0).tolist(), 'max': pos[visible_vertices].max(0).tolist()},
                'maskedVertices': {'hair': int(hair.sum()), 'clothes': int(clothes.sum()), 'skin': int(skin.sum())}}
    (MODELS / f'{name}-mask-v2.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(name, metadata['maskedVertices'], 'excluded triangles', len(excluded))


if __name__ == '__main__':
    for model in ('boy', 'girl'):
        generate(model)
