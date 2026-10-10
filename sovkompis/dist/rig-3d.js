import * as THREE from './vendor/three/build/three.module.min.js';

// Coordinates are in each original GLB's space. Right/left mean the patient's
// sides: negative X is the patient's right in the front view.
export const ANATOMY = {
  boy: {
    hips: [0, .37, .02], spine: [0, .54, .02], head: [0, .65, .025],
    shoulder: [.105, .60, .015], elbow: [.193, .49, .025], hand: [.267, .395, .04],
    leg: [.08, .365, .02], knee: [.10, .21, .025], foot: [.12, .075, .055], headStart: .66,
    nose: [0, .714, .134], ear: [.123, .746, .035],
    thorax: { y: .551, x: .119, z: .02, depth: .086 },
    abdomen: { y: .442, x: .14, z: .027, depth: .091 },
    sentec: [0, .609, .10], 'ecg-right': [-.073, .595, .103], 'ecg-left': [.073, .595, .103], 'ecg-lower': [.079, .495, .114],
    finger: [-.292, .368, .065], toe: [.13, .046, .171], recorder: [.197, .315, .096],
  },
  girl: {
    hips: [0, .354, .29], spine: [0, .493, .29], head: [0, .604, .30],
    shoulder: [.093, .565, .29], elbow: [.165, .455, .30], hand: [.221, .371, .313],
    leg: [.075, .351, .29], knee: [.093, .205, .297], foot: [.107, .078, .31], headStart: .615,
    nose: [0, .648, .404], ear: [.117, .691, .325],
    thorax: { y: .527, x: .107, z: .297, depth: .075 },
    abdomen: { y: .433, x: .13, z: .300, depth: .092 },
    sentec: [0, .578, .359], 'ecg-right': [-.067, .567, .36], 'ecg-left': [.067, .567, .36], 'ecg-lower': [.075, .477, .381],
    finger: [-.247, .343, .345], toe: [.113, .036, .412], recorder: [.174, .316, .379],
  },
};
export const BONE_NAMES = ['hips', 'spine', 'head', 'upperArmR', 'forearmR', 'handR', 'upperArmL', 'forearmL', 'handL', 'legR', 'kneeR', 'footR', 'legL', 'kneeL', 'footL'];
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

export function vertexWeights(name, point, hair = 0) {
  const p = ANATOMY[name], [x, y] = point, side = x < 0 ? 'R' : 'L', ax = Math.abs(x);
  // Hair may hang below the neck; it must follow the head, never the sleeve.
  if (hair > .5 || y >= p.headStart) return [['head', 1]];
  const head = smooth(p.headStart - .035, p.headStart, y);
  if (head > 0) return [['spine', 1 - head], ['head', head]];
  if (y > p.hips[1] - .06) {
    const arm = smooth(p.shoulder[0] * .85, p.shoulder[0] * 1.5, ax);
    const hand = 1 - smooth(p.hand[1] + .015, p.hand[1] + .065, y);
    const forearm = 1 - smooth(p.elbow[1] - .015, p.elbow[1] + .065, y);
    if (arm > 0) return [['spine', 1 - arm], [`upperArm${side}`, arm * (1 - forearm)], [`forearm${side}`, arm * forearm * (1 - hand)], [`hand${side}`, arm * forearm * hand]];
  }
  if (y < p.hips[1]) {
    const leg = 1 - smooth(p.hips[1] - .065, p.hips[1], y);
    const knee = 1 - smooth(p.knee[1] - .035, p.knee[1] + .035, y);
    const foot = 1 - smooth(p.foot[1] + .015, p.foot[1] + .075, y);
    return [['hips', 1 - leg], [`leg${side}`, leg * (1 - knee)], [`knee${side}`, leg * knee * (1 - foot)], [`foot${side}`, leg * knee * foot]];
  }
  const spine = smooth(p.hips[1], p.hips[1] + .11, y);
  return [['hips', 1 - spine], ['spine', spine]];
}

// A welded connected component keeps the girl's long hair and head rigid even
// where a bright texture highlight falls outside the hair color mask.
function headComponent(geometry) {
  const p = geometry.attributes.position, parent = new Int32Array(p.count);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const root = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const join = (a, b) => { parent[root(a)] = root(b); };
  const welded = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(value => Math.round(value * 100000)).join(',');
    if (welded.has(key)) join(i, welded.get(key)); else welded.set(key, i);
  }
  const faces = geometry.index.array; let top = faces[0];
  for (let i = 0; i < faces.length; i += 3) {
    join(faces[i], faces[i + 1]); join(faces[i + 1], faces[i + 2]);
    for (let j = 0; j < 3; j++) if (p.getY(faces[i + j]) > p.getY(top)) top = faces[i + j];
  }
  const result = new Uint8Array(p.count), component = root(top);
  for (let i = 0; i < p.count; i++) result[i] = Number(root(i) === component);
  return result;
}

export function createAvatarRig(sourceMesh, name, metadata) {
  const profile = ANATOMY[name];
  const min = new THREE.Vector3().fromArray(metadata.visibleBounds.min);
  const max = new THREE.Vector3().fromArray(metadata.visibleBounds.max);
  const center = min.clone().add(max).multiplyScalar(.5);
  const scale = 2 / (max.y - min.y);
  const origin = new THREE.Vector3(center.x, min.y, center.z);
  const point = xyz => new THREE.Vector3().fromArray(xyz).sub(origin).multiplyScalar(scale);
  const group = new THREE.Group(); group.name = `${name}-rigged-avatar`;
  const geometry = sourceMesh.geometry;
  const indices = [], weights = [], head = headComponent(geometry);
  const positions = geometry.attributes.position, mask = geometry.attributes.regionMask;
  for (let i = 0; i < positions.count; i++) {
    const entries = vertexWeights(name, [positions.getX(i), positions.getY(i), positions.getZ(i)], Math.max(mask.getX(i), head[i]));
    for (let slot = 0; slot < 4; slot++) {
      indices.push(entries[slot] ? BONE_NAMES.indexOf(entries[slot][0]) : 0);
      weights.push(entries[slot]?.[1] || 0);
    }
  }
  geometry.translate(-origin.x, -origin.y, -origin.z); geometry.scale(scale, scale, scale);
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const bones = {}, rest = {}, boneList = [];
  const definitions = [['hips', null, profile.hips], ['spine', 'hips', profile.spine], ['head', 'spine', profile.head]];
  for (const [side, sign] of [['R', -1], ['L', 1]]) {
    const mirrored = value => [sign * value[0], value[1], value[2]];
    definitions.push([`upperArm${side}`, 'spine', mirrored(profile.shoulder)], [`forearm${side}`, `upperArm${side}`, mirrored(profile.elbow)], [`hand${side}`, `forearm${side}`, mirrored(profile.hand)]);
  }
  for (const [side, sign] of [['R', -1], ['L', 1]]) {
    const mirrored = value => [sign * value[0], value[1], value[2]];
    definitions.push([`leg${side}`, 'hips', mirrored(profile.leg)], [`knee${side}`, `leg${side}`, mirrored(profile.knee)], [`foot${side}`, `knee${side}`, mirrored(profile.foot)]);
  }
  const mesh = new THREE.SkinnedMesh(geometry, sourceMesh.material); mesh.name = `${name}-body`;
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  group.add(mesh);
  for (const [boneName, parent, position] of definitions) {
    const bone = new THREE.Bone(); bone.name = boneName;
    rest[boneName] = point(position);
    bone.position.copy(rest[boneName]).sub(parent ? rest[parent] : new THREE.Vector3());
    (parent ? bones[parent] : mesh).add(bone);
    bones[boneName] = bone; boneList.push(bone);
  }
  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(boneList); mesh.bind(skeleton);
  const restLocal = Object.fromEntries(boneList.map(bone => [bone.name, bone.position.clone()]));
  const attachments = new THREE.Group(); attachments.name = 'equipment'; group.add(attachments);
  const objects = [];
  function attach(object, boneName, originalPosition) {
    object.position.copy(point(originalPosition)).sub(rest[boneName]);
    bones[boneName].add(object); objects.push(object); return object;
  }
  function skinGeometry(geo, material, fromBone, toBone = fromBone, blendAt = () => 0) {
    const ids = [], values = [];
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const t = THREE.MathUtils.clamp(blendAt(i), 0, 1);
      ids.push(BONE_NAMES.indexOf(fromBone), BONE_NAMES.indexOf(toBone), 0, 0);
      values.push(1 - t, t, 0, 0);
    }
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(ids, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(values, 4));
    const item = new THREE.SkinnedMesh(geo, material); item.frustumCulled = false;
    attachments.add(item); group.updateMatrixWorld(true); item.bind(skeleton, mesh.bindMatrix); objects.push(item); return item;
  }
  function pose({ sleep = 0, breath = 0, greet = 0, lookPitch = 0, lookYaw = 0, giggle = 0, legR = 0, legL = 0, kneeR = 0, kneeL = 0, curl = 0, support = 0, tuck = 0 } = {}) {
    for (const bone of boneList) { bone.rotation.set(0, 0, 0); bone.position.copy(restLocal[bone.name]); }
    bones.spine.rotation.x = breath * .006 + curl + giggle * .024;
    bones.spine.rotation.z = giggle * .015;
    bones.spine.position.y += Math.abs(giggle) * .007;
    bones.head.rotation.z = sleep * .06 + giggle * .035;
    // Head movement carries hair, eyelids and the cannula with it.
    bones.head.position.z += sleep * .06;
    bones.head.rotation.x = sleep * .1 + lookPitch + curl * .35;
    bones.head.rotation.y = lookYaw;
    bones.upperArmR.rotation.z = sleep * .23 + support * .36 + Math.abs(giggle) * .055;
    bones.upperArmL.rotation.z = -sleep * .23 - support * .30 - Math.abs(giggle) * .055;
    bones.upperArmR.rotation.x = support * .30 - tuck * .50;
    bones.upperArmL.rotation.x = support * .25 - tuck * .44;
    bones.forearmR.rotation.y = -sleep * .10;
    bones.forearmL.rotation.y = sleep * .10;
    bones.forearmR.rotation.x = -tuck * .40;
    bones.forearmL.rotation.x = -tuck * .36;
    bones.upperArmL.rotation.z += greet * .8;
    bones.forearmL.rotation.z += greet * 1.05;
    bones.handL.rotation.y += greet * .3;
    bones.legR.rotation.x = legR; bones.legL.rotation.x = legL;
    bones.kneeR.rotation.x = kneeR; bones.kneeL.rotation.x = kneeL;
    group.updateMatrixWorld(true); skeleton.update();
  }
  function clearEquipment() {
    for (const object of objects.splice(0)) {
      object.removeFromParent();
      object.traverse(child => {
        child.geometry?.dispose();
        if (child.material) for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          material.map?.dispose(); material.dispose();
        }
      });
    }
  }
  return { group, mesh, skeleton, bones, rest, point, scale, profile, attach, skinGeometry, pose, clearEquipment };
}
