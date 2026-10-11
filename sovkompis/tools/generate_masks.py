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
    filename = {'boy': 'body-1', 'girl': 'body-2'}[name]
    raw, pos, faces, rgb = read_glb(MODELS / f'{filename}.glb')
    groups = components(pos, faces)
    hair = np.zeros(len(pos), dtype=bool)
    clothes = np.zeros(len(pos), dtype=bool)
    skin = np.zeros(len(pos), dtype=bool)
    if name == 'boy':
        for i in [1, 2, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18]:
            clothes[groups[i]] = True
        for i in [0, 3, 4, 19, 20]:
            skin[groups[i]] = True
    else:
        # This export joins head, neck and pyjamas into one surface. Split at
        # the neckline; eyes, brows, mouth, ears and hands remain independent.
        main = np.array(groups[0])
        skin[main[pos[main, 1] >= .702]] = True
        clothes[main[pos[main, 1] < .702]] = True
        for i in [1, 2, 11, 12, 13, 14, 16, 20, 21, 22, 23, 24, 25]:
            clothes[groups[i]] = True
        for i in [3, 4, 7, 8, 9, 10]:
            skin[groups[i]] = True
    mask = np.stack([hair, clothes, skin], axis=1).astype('<f4')
    mask.tofile(MODELS / f'{filename}-mask.bin')
    metadata = {'version': 2, 'model': f'{filename}.glb', 'sha256': hashlib.sha256(raw).hexdigest(),
                'vertexCount': len(pos), 'triangleCount': len(faces),
                'format': 'float32-le-interleaved-hair-clothes-skin',
                'excludedTriangles': [],
                'visibleBounds': {'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()},
                'maskedVertices': {'hair': int(hair.sum()), 'clothes': int(clothes.sum()), 'skin': int(skin.sum())}}
    (MODELS / f'{filename}-mask.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(filename, metadata['maskedVertices'])


if __name__ == '__main__':
    for model in ('boy', 'girl'):
        generate(model)
