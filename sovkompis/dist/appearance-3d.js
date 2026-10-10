import * as THREE from './vendor/three/build/three.module.min.js';

export const HAIRSTYLES = [
  ['original', 'Original'], ['short', 'Kort'], ['bob', 'Page'],
  ['long', 'Långt'], ['buns', 'Två knutar'], ['ponytail', 'Hästsvans'],
];

// All measurements use the supplied GLBs' source coordinates. Keeping these
// separate from the rig makes future artist-made hair/face assets replaceable.
export const APPEARANCE = {
  boy: { crown: [0, .805, .014], radius: [.145, .161, .131], frontEdge: 1.43, fringe: .49, eye: [.055, .754, .116], eyeSize: [.036, .033], skin: '#d7a88e' },
  girl: { crown: [0, .765, .298], radius: [.146, .158, .144], frontEdge: 1.76, fringe: .25, eye: [.042, .682, .382], eyeSize: [.033, .034], skin: '#e2af91' },
};

export function prepareAppearance(geometry) {
  // Preserve source positions before normalization so the eyelid mask remains
  // attached to the face through skeletal animation and camera rotation.
  geometry.setAttribute('facePosition', geometry.attributes.position.clone());
}

export function createAppearance(rig, name) {
  const profile = APPEARANCE[name], geo = rig.mesh.geometry;
  const originalIndex = Array.from(geo.index.array), mask = geo.attributes.regionMask;
  const croppedIndex = [];
  for (let i = 0; i < originalIndex.length; i += 3) {
    const tri = originalIndex.slice(i, i + 3);
    const p = geo.attributes.facePosition;
    const keep = tri.every(vertex => mask.getX(vertex) < .5 && (name !== 'girl' || (p.getY(vertex) < .747 && !(p.getX(vertex) < -.135 && p.getY(vertex) > .55 && p.getZ(vertex) < .30))));
    if (keep) croppedIndex.push(...tri);
  }
  const root = new THREE.Group(); root.name = 'appearance';
  // Permanent head attachments are deliberately outside clearEquipment().
  root.position.copy(rig.rest.head).multiplyScalar(-1); rig.bones.head.add(root);
  const hair = new THREE.Group(); hair.name = 'hairstyle'; root.add(hair);
  const lids = new THREE.Group(); lids.name = 'closed-eyes'; root.add(lids); lids.visible = false;
  const hairMaterial = new THREE.MeshStandardMaterial({ color: '#594238', roughness: .8 });
  const detailMaterial = new THREE.MeshStandardMaterial({ color: '#e1b690', roughness: .9 });
  const lashMaterial = new THREE.MeshStandardMaterial({ color: '#49332e', roughness: .95 });
  const scalpMaterial = new THREE.MeshStandardMaterial({ color: '#e9bd9e', roughness: .88 });
  let style = 'original';

  function ellipsoid(parent, center, radius, mat = hairMaterial, rotation = 0) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), mat);
    mesh.position.copy(rig.point(center)); mesh.scale.set(...radius.map(n => n * rig.scale)); mesh.rotation.z = rotation;
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function strand(points, radius, mat = hairMaterial, parent = hair) {
    const curve = new THREE.CatmullRomCurve3(points.map(rig.point));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius * rig.scale, 6, false), mat);
    mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  function scalp() {
    // A fitted cap with an open face, lower at the back and temples. Unlike a
    // full sphere it cannot cover the eyes, eyebrows or cannula.
    const [cx, cy, cz] = profile.crown, [rx, ry, rz] = profile.radius;
    const vertices = [], indices = [], rings = 16, segments = 64;
    for (let row = 0; row <= rings; row++) for (let col = 0; col <= segments; col++) {
      const phi = col / segments * Math.PI * 2;
      const front = Math.max(0, Math.cos(phi));
      const edge = 1.99 + .4 * Math.max(0, -Math.cos(phi)) ** 2 - (1.99 - profile.frontEdge) * front ** 4;
      const theta = row / rings * edge;
      const ripple = 1 + .012 * Math.cos(phi * 12) * Math.sin(theta);
      vertices.push(...rig.point([cx + rx * Math.sin(theta) * Math.sin(phi) * ripple, cy + ry * Math.cos(theta), cz + rz * Math.sin(theta) * Math.cos(phi) * ripple]).toArray());
      if (row < rings && col < segments) { const a = row * (segments + 1) + col, b = a + segments + 1; indices.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const cap = new THREE.Mesh(geometry, hairMaterial); cap.castShadow = true; cap.receiveShadow = true; hair.add(cap);
    // Three overlapping swept locks soften the hairline.
    for (let i = 0; i < 3; i++) ellipsoid(hair, [cx + (i - 1) * .06, cy + ry * profile.fringe + (i === 0 ? .018 : 0), cz + rz * .87], [.064, .045, .032], hairMaterial, -.32);
  }
  function setStyle(value) {
    const next = HAIRSTYLES.some(([id]) => id === value) ? value : 'original';
    if (style === next && (next === 'original' || hair.children.length)) return;
    style = next;
    for (const child of [...hair.children]) { child.geometry?.dispose(); hair.remove(child); }
    const indices = style === 'original' ? originalIndex : croppedIndex;
    geo.index.array.set(indices); geo.index.needsUpdate = true; geo.setDrawRange(0, indices.length);
    hair.visible = style !== 'original';
    if (style === 'original') return;
    // The girl's hair shares its surface with the head. Its removal exposes
    // an open back/temple edge; an inset skull closes that cavity while staying
    // behind the original eyes, nose and mouth. The boy already has a full head.
    if (name === 'girl') ellipsoid(hair, [0, .704, .304], [.116, .095, .075], scalpMaterial);
    scalp();
    const [x, y, z] = profile.crown, [rx, ry, rz] = profile.radius;
    if (style === 'short') {
      for (let i = -1; i <= 1; i++) ellipsoid(hair, [x + i * .056, y + ry * .90, z + .02], [.057, .044, .064], hairMaterial, i * -.22);
    }
    if (style === 'bob' || style === 'long') {
      const long = style === 'long', length = long ? .162 : .078;
      for (const sign of [-1, 1]) {
        ellipsoid(hair, [sign * rx * .89, y - length * .66, z - .008], [.035, length, .079], hairMaterial, sign * -.08);
        ellipsoid(hair, [sign * rx * .71, y - length * .62, z - rz * .64], [.061, length * 1.07, .048], hairMaterial, sign * .08);
      }
      ellipsoid(hair, [0, y - length * .53, z - rz * .84], [.12, length * 1.12, .038]);
    }
    if (style === 'buns') for (const sign of [-1, 1]) {
      ellipsoid(hair, [sign * (rx + .017), y + .071, z - .035], [.065, .065, .059]);
      ellipsoid(hair, [sign * (rx + .012), y + .036, z - .019], [.056, .012, .055], detailMaterial, sign * .3);
    }
    if (style === 'ponytail') {
      ellipsoid(hair, [.045, y + .086, z - rz * .88], [.051, .022, .05], detailMaterial, -.2);
      ellipsoid(hair, [.068, y + .016, z - rz * 1.27], [.062, .11, .06], hairMaterial, -.30);
      ellipsoid(hair, [.095, y - .102, z - rz * 1.23], [.046, .095, .048], hairMaterial, -.16);
    }
  }
  const [ex, ey, ez] = profile.eye;
  for (const sign of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, dx = (t - .5) * profile.eyeSize[0] * 1.55;
      points.push([sign * ex + dx, ey - .002 - .007 * Math.sin(t * Math.PI), ez + .007 - .010 * (2 * t - 1) ** 2]);
    }
    strand(points, .0017, lashMaterial, lids);
  }
  function setColor(color, preview = false) { hairMaterial.color.set(preview ? '#e591e5' : color || '#594238'); }
  function setSleep(amount) { lids.visible = amount > .8; }
  // Shared materials need only one disposal; geometry is disposed by the owner.
  function dispose() { hairMaterial.dispose(); detailMaterial.dispose(); lashMaterial.dispose(); scalpMaterial.dispose(); }
  return { setStyle, setColor, setSleep, dispose, root, hair, lids, originalIndex, croppedIndex };
}
