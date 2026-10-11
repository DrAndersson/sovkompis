import * as THREE from './vendor/three/build/three.module.min.js';

const material = color => new THREE.MeshStandardMaterial({ color, roughness: .72 });
const tube = (points, radius, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, 'catmullrom', .35), 48, radius, 7, closed);
const box = (size, color) => new THREE.Mesh(new THREE.BoxGeometry(...size), material(color));

export function attachmentFor(rig, id, site = 'finger') {
  const p = rig.profile;
  if (id === 'cannula') return { point: p.nose, bone: 'head' };
  if (id === 'thorax' || id === 'abdomen') {
    const band = p[id]; return { point: [0, band.y, band.z + band.depth + .01], bone: id === 'thorax' ? 'spine' : 'hips' };
  }
  if (id === 'oximeter') return { point: p[site], bone: site === 'toe' ? 'footL' : 'handR' };
  return { point: p[id], bone: id === 'ecg-lower' ? 'hips' : 'spine' };
}
export function createEquipment(rig) {
  const anchors = new Map(), placed = new Set();
  let recorderReady = false;
  const p = rig.profile, scale = rig.scale;
  const recorder = [...p.recorder];
  function anchor(id, site = 'finger') {
    const key = `${id}-${site}`;
    if (!anchors.has(key)) {
      const target = attachmentFor(rig, id, site), object = new THREE.Object3D();
      object.name = `target-${id}`; rig.attach(object, target.bone, target.point); anchors.set(key, object);
    }
    return anchors.get(key);
  }
  function cable(points, color, fromBone, toBone = 'hips') {
    const geo = tube(points.map(rig.point), .0028 * scale);
    // TubeGeometry emits eight vertices per ring. The lead blends between its
    // sensor bone and the recorder bone, so both ends remain attached in a pose.
    return rig.skinGeometry(geo, material(color), fromBone, toBone, i => THREE.MathUtils.smoothstep(Math.floor(i / 8) / 48, .15, .9));
  }
  function fixedTube(points, color, bone, radius = .003) {
    return rig.skinGeometry(tube(points.map(rig.point), radius * scale), material(color), bone);
  }
  function recorderBox(position, color, label) {
    const unit = new THREE.Group(); unit.name = label;
    const shell = box([.071 * scale, .087 * scale, .031 * scale], '#f8f8ed'); unit.add(shell);
    const display = box([.048 * scale, .031 * scale, .003 * scale], color); display.position.set(0, .012 * scale, .017 * scale); unit.add(display);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.0045 * scale, 10, 8), material(color)); dot.position.set(0, -.025 * scale, .019 * scale); unit.add(dot);
    rig.attach(unit, 'hips', position);
  }
  function makeRecorders() {
    if (recorderReady) return;
    recorderReady = true; recorderBox(recorder, '#497a83', 'Registreringsenhet');
  }
  function leadToRecorder(point, color, bone, offset = 0, end = recorder) {
    cable([point, [point[0] + offset, point[1] + (point[1] < .11 ? .14 : -.085), point[2] + .025], [end[0] - .04, end[1] - .04, end[2] + .04], [end[0], end[1] + .044, end[2] + .012]], color, bone);
  }
  function disc(radius, color, number) {
    const group = new THREE.Group();
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(radius * scale, radius * scale, .004 * scale, 24), material('#fffdf4'));
    pad.rotation.x = Math.PI / 2; group.add(pad);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * .66 * scale, radius * .66 * scale, .007 * scale, 24), material(color));
    cap.rotation.x = Math.PI / 2; cap.position.z = .005 * scale; group.add(cap);
    if (number) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.font = 'bold 46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(number), 32, 34);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const digit = new THREE.Mesh(new THREE.PlaneGeometry(radius * scale, radius * scale), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      digit.position.z = .009 * scale; group.add(digit);
    }
    return group;
  }
  function band(id, color) {
    const b = p[id], bone = id === 'thorax' ? 'spine' : 'hips';
    const vertices = [], indices = [], segments = 64, width = .028;
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2;
      for (const dy of [-width / 2, width / 2]) vertices.push(...rig.point([Math.cos(angle) * b.x, b.y + dy, b.z + Math.sin(angle) * b.depth]).toArray());
      if (i < segments) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const mat = material(color); mat.side = THREE.DoubleSide; rig.skinGeometry(geo, mat, bone);
    const front = [0, b.y, b.z + b.depth + .005];
    rig.attach(box([.037 * scale, .034 * scale, .014 * scale], '#f3f0dd'), bone, front);
    leadToRecorder(front, color, bone, .035);
  }
  function place(id, site = 'finger') {
    if (placed.has(id)) return;
    placed.add(id); makeRecorders();
    const target = attachmentFor(rig, id, site), pos = target.point;
    if (id === 'thorax' || id === 'abdomen') { band(id, id === 'thorax' ? '#6f91b2' : '#a185b6'); return; }
    if (id === 'cannula') {
      const [x, y, z] = p.nose, [ex, ey, ez] = p.ear;
      fixedTube([[-ex, ey, ez], [-ex * .68, y - .011, z - .018], [-.025, y, z], [.025, y, z], [ex * .68, y - .011, z - .018], [ex, ey, ez]], '#9cdeea', 'head');
      for (const dx of [-.009, .009]) fixedTube([[dx, y, z], [dx, y + .01, z - .003]], '#b9eaf1', 'head', .0025);
      leadToRecorder([-ex, ey, ez], '#9cdeea', 'head', -.025); return;
    }
    if (id === 'oximeter') {
      const sensor = new THREE.Group();
      sensor.add(box([.027 * scale, .042 * scale, .026 * scale], '#e3ae7b'));
      const light = box([.016 * scale, .014 * scale, .003 * scale], '#f7ece1'); light.position.z = .014 * scale; sensor.add(light);
      rig.attach(sensor, target.bone, pos); leadToRecorder(pos, '#d7a16d', target.bone, -.016); return;
    }
    if (id === 'sentec') {
      rig.attach(disc(.022, '#96ad72'), 'spine', pos);
      const sentecBox = [recorder[0] + .085, recorder[1] - .085, recorder[2]];
      recorderBox(sentecBox, '#8fa76b', 'Koldioxidmätare'); leadToRecorder(pos, '#a8bc83', 'spine', .06, sentecBox); return;
    }
    const number = { 'ecg-right': 1, 'ecg-left': 2, 'ecg-lower': 3 }[id];
    const color = ['#bd9c55', '#6da7ae', '#b08baa'][number - 1];
    rig.attach(disc(.019, color, number), target.bone, pos); leadToRecorder(pos, color, target.bone, pos[0] < 0 ? -.026 : .024);
  }
  function clear() { rig.clearEquipment(); anchors.clear(); placed.clear(); recorderReady = false; }
  return { anchor, place, clear, placed };
}

export function createBedroom() {
  const group = new THREE.Group(); group.name = 'bedroom';
  function softBox(size, radius, color, position) {
    const geometry = new THREE.BoxGeometry(...size, 8, 8, 8), p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i), inner = v.clone();
      for (let axis = 0; axis < 3; axis++) inner.setComponent(axis, THREE.MathUtils.clamp(v.getComponent(axis), -size[axis] / 2 + radius, size[axis] / 2 - radius));
      v.sub(inner).normalize().multiplyScalar(radius).add(inner); p.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material(color)); mesh.position.set(...position); group.add(mesh); return mesh;
  }
  softBox([1.49, .22, 2.69], .09, '#e7d6b9', [0, .53, -.15]);
  softBox([1.54, .15, 2.76], .05, '#aa8d79', [0, .36, -.15]);
  softBox([1.58, .88, .16], .075, '#8a9d94', [0, .74, -1.58]);
  softBox([1.35, .48, .09], .04, '#a5b3a5', [0, .93, -1.47]);
  const pillow = softBox([1.22, .21, .65], .095, '#fff1d4', [0, .73, -1.04]); pillow.name = 'pillow';
  const pillowSeam = new THREE.Mesh(tube(Array.from({ length: 65 }, (_, i) => { const a = i / 64 * Math.PI * 2; return new THREE.Vector3(.58 * Math.cos(a), .745, -1.04 + .29 * Math.sin(a)); }), .004, true), material('#d9c5a8')); group.add(pillowSeam);
  for (const x of [-.61, .61]) for (const z of [-1.23, .96]) { const leg = box([.095, .33, .095], '#758e7b'); leg.position.set(x, .16, z); group.add(leg); }
  const duvet = new THREE.Group(); duvet.name = 'duvet'; group.add(duvet);
  // A curved cloth surface drapes over the legs and hangs over the mattress.
  // Its top stops below the upper chest so the cannula and electrodes remain visible.
  const clothPoint = (u, v) => {
    const x = (u - .5) * 1.7, z = -.02 + v * 1.28 + .07 * (1 - (2 * u - 1) ** 2);
    const body = Math.sqrt(Math.max(0, 1 - (Math.abs(x) / .86) ** 4));
    const folds = .014 * Math.sin(u * 35 + v * 5) * Math.sin(v * Math.PI);
    const drop = .30 * THREE.MathUtils.smoothstep(v, .85, 1);
    return new THREE.Vector3(x, .57 + .64 * body - drop + folds, z);
  };
  const vertices = [], indices = [], segments = 40;
  for (let row = 0; row <= segments; row++) for (let col = 0; col <= segments; col++) {
    vertices.push(...clothPoint(col / segments, row / segments).toArray());
    if (row < segments && col < segments) { const a = row * (segments + 1) + col, b = a + segments + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#849f9c', roughness: 1, side: THREE.DoubleSide })); cloth.name = 'blanket'; duvet.add(cloth);
  for (const v of [0, .09]) {
    const edge = new THREE.Mesh(tube(Array.from({ length: 41 }, (_, i) => clothPoint(i / 40, v).add(new THREE.Vector3(0, .008, 0))), v === 0 ? .027 : .006), material(v === 0 ? '#bac6b1' : '#a9bba8')); duvet.add(edge);
  }
  // Small stitched stars sit on the cloth instead of using a remote texture.
  for (const [u, v] of [[.25, .28], [.62, .35], [.43, .63], [.76, .71], [.21, .79]]) {
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, r = i % 2 ? .015 : .039; i ? star.lineTo(Math.sin(a) * r, Math.cos(a) * r) : star.moveTo(0, r); }
    star.closePath();
    const patch = new THREE.Mesh(new THREE.ShapeGeometry(star), new THREE.MeshStandardMaterial({ color: '#ded2a8', roughness: 1, side: THREE.DoubleSide })); patch.rotation.x = -Math.PI / 2; patch.position.copy(clothPoint(u, v)).y += .012; duvet.add(patch);
  }
  // A compact bedside lamp supplies an actual warm light as the room dims.
  softBox([.45, .08, .48], .03, '#ad8b72', [-1.04, .59, -.89]);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.017, .017, .25, 12), material('#bd9c67')); stem.position.set(-1.04, .755, -.89); group.add(stem);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(.12, .195, .23, 32), new THREE.MeshStandardMaterial({ color: '#f7dfb0', emissive: '#eaa959', emissiveIntensity: .45, roughness: 1 })); shade.position.set(-1.04, .98, -.89); group.add(shade);
  const lamp = new THREE.PointLight('#ffd19a', 2.3, 4, 2); lamp.position.set(-1.04, 1.12, -.82); group.add(lamp);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1, 64), material('#6e6b73')); rug.rotation.x = -Math.PI / 2; rug.scale.set(1.32, 1.84, 1); rug.position.set(0, -.01, -.1); group.add(rug);
  group.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  group.visible = false; return group;
}
