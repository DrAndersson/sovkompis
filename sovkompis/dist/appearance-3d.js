import * as THREE from './vendor/three/build/three.module.min.js';

export const HAIRSTYLES = [['none', 'Utan hår'], ['spiky', 'Kort & spretigt'], ['long', 'Långt'], ['pigtails', 'Två tofsar']];
// Source-space fits are independent of the rig; adding hair means adding an
// asset, label and fit here. Existing storage body IDs stay stable.
export const HAIR_ASSETS = {
  spiky: { file: 'hair-spiky.glb', scale: [.0043, .0041, .0056], position: [0, .772, -.012] },
  long: { file: 'hair-long.glb', scale: [.385, .48, .335], position: [0, .646, -.030] },
  pigtails: { file: 'hair-pigtails.glb', scale: [.0054, .0052, .0050], position: [0, .642, -.035] },
};
export const APPEARANCE = {
  boy: { eye: [.064, .831, .123], eyeSize: [.035, .032], skin: '#e5a27c', skinBase: '#f3a573', hairOffset: [0, 0, 0], hairScale: [1, 1, 1], faceWidth: .108, hairline: .889, faceFront: .030 },
  girl: { eye: [.067, .840, .097], eyeSize: [.038, .036], skin: '#e9ad87', skinBase: '#f4a970', hairOffset: [.002, .005, -.013], hairScale: [1.02, 1, 1.04], faceWidth: .112, hairline: .901, faceFront: .008 },
};
export function prepareAppearance(geometry) {
  geometry.setAttribute('facePosition', geometry.attributes.position.clone());
}
function disposeTree(object) {
  const textures = new Set(), materials = new Set();
  object.traverse(child => {
    child.geometry?.dispose();
    if (child.material) for (const m of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const m of materials) m.dispose();
  for (const t of textures) { t.dispose(); t.source?.data?.close?.(); }
  object.removeFromParent();
}
export function createAppearance(rig, name, loadHair) {
  const profile = APPEARANCE[name], root = new THREE.Group(); root.name = 'appearance';
  root.position.copy(rig.rest.head).multiplyScalar(-1); rig.bones.head.add(root);
  const hair = new THREE.Group(); hair.name = 'hairstyle'; root.add(hair);
  const lids = new THREE.Group(); lids.name = 'closed-eyes'; root.add(lids); lids.visible = false;
  const lashMaterial = new THREE.MeshStandardMaterial({ color: '#49332e', roughness: .95 });
  const uniforms = { tint: { value: new THREE.Color('#594238') }, amount: { value: 0 }, preview: { value: 0 } };
  const cache = new Map(), pending = new Map();
  let request = 0, disposed = false;
  function hairMaterial(original) {
    const material = new THREE.MeshStandardMaterial({ map: original.map, roughness: .85 });
    material.onBeforeCompile = shader => {
      shader.uniforms.hairTint = uniforms.tint; shader.uniforms.tintAmount = uniforms.amount; shader.uniforms.maskPreview = uniforms.preview;
      shader.vertexShader = 'attribute vec3 hairPosition; varying vec3 vHairPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairPosition = hairPosition;');
      shader.fragmentShader = 'varying vec3 vHairPosition; uniform vec3 hairTint; uniform float tintAmount; uniform float maskPreview;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        // Generated hair has a closed front surface. Open an arched face window
        // below the fringe so the eyes, nose and cannula remain unobstructed.
        float edge = ${profile.hairline} - .048 * pow(abs(vHairPosition.x) / ${profile.faceWidth}, 3.0);
        if (abs(vHairPosition.x) < ${profile.faceWidth} && vHairPosition.y < edge && vHairPosition.z > ${profile.faceFront}) discard;
        vec3 original = diffuseColor.rgb;
        float lightness = dot(original, vec3(.2126, .7152, .0722));
        float ribbon = step(original.g * 1.6, original.r) * step(original.g * 1.18, original.b);
        diffuseColor.rgb = mix(original, hairTint * clamp(lightness / .055, .22, 2.8), tintAmount * (1.0 - ribbon));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.8,.1,.7), maskPreview);
      `);
    };
    material.customProgramCacheKey = () => `imported-hair-${name}-v1`;
    return material;
  }
  async function getStyle(id) {
    if (cache.has(id)) return cache.get(id);
    if (pending.has(id)) return pending.get(id);
    const task = (async () => {
      const asset = HAIR_ASSETS[id], gltf = await loadHair(`./models/${asset.file}`);
      if (disposed) { disposeTree(gltf.scene); return null; }
      const group = gltf.scene; group.name = `hair-${id}`;
      group.traverse(mesh => {
        if (!mesh.isMesh) return;
        const geo = mesh.geometry, p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const source = [p.getX(i), p.getY(i), p.getZ(i)].map((v, axis) => (v * asset.scale[axis] + asset.position[axis]) * profile.hairScale[axis] + profile.hairOffset[axis]);
          p.setXYZ(i, ...source);
        }
        geo.setAttribute('hairPosition', p.clone());
        for (let i = 0; i < p.count; i++) p.setXYZ(i, ...rig.point([p.getX(i), p.getY(i), p.getZ(i)]).toArray());
        p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
        const original = mesh.material; mesh.material = hairMaterial(original); original.dispose();
        mesh.castShadow = false; // The cut face window must not cast an opaque shadow.
        mesh.receiveShadow = true;
      });
      cache.set(id, group); return group;
    })();
    pending.set(id, task);
    try { return await task; } finally { pending.delete(id); }
  }
  async function setStyle(value) {
    const id = HAIR_ASSETS[value] ? value : 'none', version = ++request;
    hair.clear(); hair.visible = id !== 'none'; hair.userData.style = id;
    if (id === 'none' || disposed) return !disposed;
    try {
      const group = await getStyle(id);
      if (disposed || version !== request) return false;
      if (group) hair.add(group);
      return Boolean(group);
    } catch { return false; }
  }
  const [ex, ey, ez] = profile.eye;
  for (const sign of [-1, 1]) {
    const points = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12, dx = (t - .5) * profile.eyeSize[0] * 1.55;
      return rig.point([sign * ex + dx, ey - .002 - .007 * Math.sin(t * Math.PI), ez + .007 - .010 * (2 * t - 1) ** 2]);
    });
    lids.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .0017 * rig.scale, 6), lashMaterial));
  }
  function setColor(color, preview = false) { uniforms.tint.value.set(color || '#594238'); uniforms.amount.value = color ? 1 : 0; uniforms.preview.value = Number(preview); }
  function setSkinColor() { /* These complete bald bodies need no synthetic scalp. */ }
  function setSleep(amount) { lids.visible = amount > .8; }
  function dispose() {
    if (disposed) return;
    disposed = true; request++;
    for (const group of cache.values()) disposeTree(group);
    cache.clear(); disposeTree(lids); root.removeFromParent();
  }
  return { setStyle, setColor, setSkinColor, setSleep, dispose, root, hair, lids };
}
