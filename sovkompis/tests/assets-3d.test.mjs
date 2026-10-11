import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

for (const name of ['body-1', 'body-2']) {
  test(`${name}: masks match the exact GLB vertex order and body geometry`, async () => {
    const base = fileURLToPath(new URL(`../dist/models/${name}`, import.meta.url));
    const [glb, mask, metadata] = await Promise.all([
      readFile(`${base}.glb`), readFile(`${base}-mask.bin`),
      readFile(`${base}-mask.json`, 'utf8').then(JSON.parse),
    ]);
    assert.equal(glb.toString('ascii', 0, 4), 'glTF');
    assert.equal(createHash('sha256').update(glb).digest('hex'), metadata.sha256, 'Rebuild and review masks when replacing a model');
    const jsonLength = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
    const primitive = gltf.meshes[0].primitives[0];
    const vertices = gltf.accessors[primitive.attributes.POSITION].count;
    const triangles = gltf.accessors[primitive.indices].count / 3;
    assert.equal(metadata.version, 2);
    assert.equal(metadata.format, 'float32-le-interleaved-hair-clothes-skin');
    assert.equal(vertices, metadata.vertexCount);
    assert.equal(triangles, metadata.triangleCount);
    assert.equal(mask.length, vertices * 3 * 4);
    const counts = [0, 0, 0];
    for (let vertex = 0; vertex < vertices; vertex++) {
      const weights = [mask.readFloatLE(vertex * 12), mask.readFloatLE(vertex * 12 + 4), mask.readFloatLE(vertex * 12 + 8)];
      weights.forEach((weight, part) => { assert.ok(weight === 0 || weight === 1); counts[part] += weight; });
      assert.ok(weights.reduce((a, b) => a + b, 0) <= 1, 'Hair, clothing and skin must not overlap');
    }
    assert.deepEqual(counts, [metadata.maskedVertices.hair, metadata.maskedVertices.clothes, metadata.maskedVertices.skin]);
    assert.equal(counts[0], 0, 'Bodies are bald; hair is a separate GLB');
    assert.ok(counts.slice(1).every(count => count > 1000 && count < vertices * .75));
    assert.equal(metadata.excludedTriangles.length, 0);
    for (const face of metadata.excludedTriangles) assert.ok(Number.isInteger(face) && face >= 0 && face < triangles);
    const positions = gltf.accessors[primitive.attributes.POSITION];
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(metadata.visibleBounds.min[axis] >= positions.min[axis]);
      assert.ok(metadata.visibleBounds.max[axis] <= positions.max[axis]);
      assert.ok(metadata.visibleBounds.min[axis] < metadata.visibleBounds.max[axis]);
    }
  });
}


test('Web hair copies match their manifests and retain textured geometry within a mobile-sized budget', async () => {
  const folder = new URL('../dist/models/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('hair-assets.json', folder), 'utf8'));
  for (const [file, entry] of Object.entries(manifest)) {
    const raw = await readFile(new URL(file, folder));
    assert.equal(createHash('sha256').update(raw).digest('hex'), entry.sha256);
    assert.ok(raw.length < 2_000_000);
    const gltf = JSON.parse(raw.toString('utf8', 20, 20 + raw.readUInt32LE(12)));
    assert.equal(gltf.images.length, 1);
    assert.ok(gltf.meshes[0].primitives[0].attributes.TEXCOORD_0 !== undefined);
    assert.ok(gltf.accessors[gltf.meshes[0].primitives[0].indices].count > 20000);
  }
});
