import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../dist/vendor/three/build/three.module.min.js';
import { createAvatarRig, BONE_NAMES, ANATOMY } from '../dist/rig-3d.js';
import { createEquipment, attachmentFor } from '../dist/equipment-3d.js';
import { bedtimeFrame, gazeFor } from '../dist/motion-3d.js';
import { createAppearance, prepareAppearance, HAIRSTYLES } from '../dist/appearance-3d.js';

async function loadRig(name) {
  const raw = await readFile(new URL(`../dist/models/${name}.glb`, import.meta.url));
  const metadata = JSON.parse(await readFile(new URL(`../dist/models/${name}-mask.json`, import.meta.url), 'utf8'));
  const mask = await readFile(new URL(`../dist/models/${name}-mask.bin`, import.meta.url));
  const length = raw.readUInt32LE(12), gltf = JSON.parse(raw.toString('utf8', 20, 20 + length));
  const binary = raw.subarray(28 + length);
  const primitive = gltf.meshes[0].primitives[0];
  const attribute = index => {
    const acc = gltf.accessors[index], view = gltf.bufferViews[acc.bufferView];
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3 }[acc.type], bytes = acc.componentType === 5123 ? 2 : 4, array = [];
    for (let i = 0; i < acc.count; i++) for (let axis = 0; axis < width; axis++) {
      const at = (view.byteOffset || 0) + (acc.byteOffset || 0) + i * (view.byteStride || bytes * width) + axis * bytes;
      array.push(acc.componentType === 5126 ? binary.readFloatLE(at) : bytes === 2 ? binary.readUInt16LE(at) : binary.readUInt32LE(at));
    }
    return array;
  };
  const geometry = new THREE.BufferGeometry(), source = attribute(primitive.attributes.POSITION);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(source, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(attribute(primitive.attributes.NORMAL), 3));
  geometry.setAttribute('regionMask', new THREE.Float32BufferAttribute(Array.from({ length: mask.length / 4 }, (_, i) => mask.readFloatLE(i * 4)), 2));
  geometry.setIndex(attribute(primitive.indices).filter((_, i) => !metadata.excludedTriangles.includes(Math.floor(i / 3))));
  prepareAppearance(geometry);
  return { rig: createAvatarRig(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()), name, metadata), source };
}
for (const name of ['boy', 'girl']) {
  test(`${name}: hairstyles restore the original mesh and survive an equipment reset`, async () => {
    const { rig } = await loadRig(name), appearance = createAppearance(rig, name), kit = createEquipment(rig);
    const index = rig.mesh.geometry.index, original = Array.from(index.array);
    for (const [style] of HAIRSTYLES) {
      appearance.setStyle(style);
      assert.equal(rig.mesh.geometry.index, index, 'changing hair should reuse its GPU index buffer');
      if (style !== 'original') {
        assert.ok(rig.mesh.geometry.drawRange.count < original.length);
        assert.ok(appearance.hair.children.length > 0);
      }
      kit.place('oximeter'); kit.clear();
      assert.equal(appearance.root.parent, rig.bones.head, 'restarting practice must preserve the hairstyle and eyelids');
    }
    appearance.setStyle('original');
    assert.deepEqual(Array.from(index.array), original);
    assert.equal(rig.mesh.geometry.drawRange.count, original.length);
    assert.equal(appearance.hair.visible, false);
    appearance.setSleep(1); assert.equal(appearance.lids.visible, true);
    appearance.setSleep(0); assert.equal(appearance.lids.visible, false);
    appearance.dispose(); appearance.root.traverse(o => o.geometry?.dispose());
    rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.mesh.material.dispose();
  });
  test(`${name}: normalized 15-bone rig preserves the original mesh at rest`, async () => {
    const { rig, source } = await loadRig(name);
    assert.deepEqual(rig.skeleton.bones.map(b => b.name), BONE_NAMES);
    rig.pose();
    const pos = rig.mesh.geometry.attributes.position, weight = rig.mesh.geometry.attributes.skinWeight, indices = rig.mesh.geometry.attributes.skinIndex;
    for (let i = 0; i < pos.count; i++) {
      let sum = 0;
      for (let slot = 0; slot < 4; slot++) { const w = weight.array[i * 4 + slot]; assert.ok(w >= 0 && w <= 1); sum += w; assert.ok(indices.array[i * 4 + slot] < BONE_NAMES.length); }
      assert.ok(Math.abs(sum - 1) < 1e-6);
      const expected = rig.point(source.slice(i * 3, i * 3 + 3));
      const skinned = rig.mesh.applyBoneTransform(i, new THREE.Vector3().fromBufferAttribute(pos, i));
      assert.ok(skinned.distanceTo(expected) < 1e-5, `rest vertex ${i} drifted`);
    }
    rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.mesh.material.dispose();
  });
  for (const site of ['finger', 'toe']) test(`${name}: ${site} sensor and cable ends follow the gaze, giggle and bedtime sequence`, async () => {
    const { rig } = await loadRig(name), kit = createEquipment(rig);
    kit.place('oximeter', site);
    const sensor = kit.anchor('oximeter', site);
    const p = rig.profile.recorder;
    const end = rig.attach(new THREE.Object3D(), 'hips', [p[0], p[1] + .044, p[2] + .012]);
    const wire = rig.group.getObjectByName('equipment').children.find(child => child.isSkinnedMesh);
    function ringCenter(ring) {
      const center = new THREE.Vector3(), positions = wire.geometry.attributes.position;
      for (let n = 0; n < 7; n++) center.add(wire.applyBoneTransform(ring * 8 + n, new THREE.Vector3().fromBufferAttribute(positions, ring * 8 + n)).applyMatrix4(wire.matrixWorld));
      return center.divideScalar(7);
    }
    for (const time of [0, .12, .32, .50, .72, .88, 1]) {
      const frame = bedtimeFrame(time, rig.rest.hips.toArray());
      const gaze = gazeFor(rig.profile, rig.profile[site]);
      rig.group.rotation.set(frame.rootX, frame.rootY, 0);
      rig.group.position.fromArray(frame.hip).sub(rig.rest.hips.clone().applyQuaternion(rig.group.quaternion));
      rig.pose({ ...frame, breath: .8, lookPitch: time === 0 ? gaze.pitch : 0, lookYaw: time === 0 ? gaze.yaw : 0, giggle: time === 0 ? .8 : 0 });
      rig.group.updateMatrixWorld(true); rig.skeleton.update();
      assert.ok(ringCenter(0).distanceTo(sensor.getWorldPosition(new THREE.Vector3())) < 1e-5);
      assert.ok(ringCenter(48).distanceTo(end.getWorldPosition(new THREE.Vector3())) < 1e-5);
    }
    kit.clear(); assert.equal(kit.placed.size, 0); assert.equal(rig.group.getObjectByName('equipment').children.length, 0);
    rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.mesh.material.dispose();
  });
  test(`${name}: anatomy keeps the three ECG leads on the specified patient sides`, async () => {
    const { rig } = await loadRig(name);
    const right = attachmentFor(rig, 'ecg-right'), left = attachmentFor(rig, 'ecg-left'), lower = attachmentFor(rig, 'ecg-lower');
    assert.ok(right.point[0] < 0 && left.point[0] > 0 && lower.point[0] > 0);
    assert.ok(lower.point[1] < left.point[1]);
    assert.equal(attachmentFor(rig, 'oximeter', 'finger').bone, 'handR');
    assert.equal(attachmentFor(rig, 'oximeter', 'toe').bone, 'footL');
    assert.ok(ANATOMY[name].nose[1] > ANATOMY[name].sentec[1]);
    rig.skeleton.dispose(); rig.mesh.geometry.dispose(); rig.mesh.material.dispose();
  });
}
