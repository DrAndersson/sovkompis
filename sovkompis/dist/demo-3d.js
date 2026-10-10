import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'sovkompis-demo3d-v1';
const modelNames = { boy: 'Din sovkompis · Pojke', girl: 'Din sovkompis · Flicka' };
const palettes = {
  hair: [['Brunt', '#594238'], ['Svart', '#292733'], ['Blont', '#d9b86b'], ['Koppar', '#af5936'], ['Rosa', '#d88cb1'], ['Lila', '#8d79b5']],
  clothes: [['Salvia', '#7fa99b'], ['Blått', '#6f9fd3'], ['Rosa', '#d99fab'], ['Lila', '#a58bc9'], ['Gult', '#e2bd67'], ['Korall', '#da8774']],
};
const state = { model: 'boy', boy: { hair: null, clothes: null }, girl: { hair: null, clothes: null } };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (['boy', 'girl'].includes(saved?.model)) state.model = saved.model;
  for (const model of ['boy', 'girl']) for (const part of ['hair', 'clothes']) {
    if (/^#[\da-f]{6}$/i.test(saved?.[model]?.[part])) state[model][part] = saved[model][part];
  }
} catch { /* Storage is optional; the demo works without it. */ }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { $('#save-note').textContent = 'Du kan prova färger här, men webbläsaren kan inte spara dem.'; }
}

const uniforms = {
  hairTint: { value: new THREE.Color() }, clothesTint: { value: new THREE.Color() },
  hairAmount: { value: 0 }, clothesAmount: { value: 0 }, maskPreview: { value: 0 },
};
let renderer, scene, camera, controls, currentModel, loadVersion = 0;
const host = $('#three-container');
const loader = new GLTFLoader();
let renderQueued = false;
function render() {
  if (!renderer || renderQueued || document.hidden) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderer.render(scene, camera); });
}
function syncColors() {
  for (const part of ['hair', 'clothes']) {
    const color = state[state.model][part];
    uniforms[`${part}Amount`].value = color ? 1 : 0;
    uniforms[`${part}Tint`].value.set(color || palettes[part][0][1]);
    $(`#${part}-color`).value = color || palettes[part][0][1];
    document.querySelectorAll(`[data-part="${part}"]`).forEach(button => {
      const active = button.dataset.color === color;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '✓' : '';
    });
  }
  render();
}
function setColor(part, color) { state[state.model][part] = color; syncColors(); save(); }
for (const [part, palette] of Object.entries(palettes)) {
  for (const [name, color] of palette) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.part = part; button.dataset.color = color;
    button.style.setProperty('--swatch', color);
    button.setAttribute('aria-label', `${part === 'hair' ? 'Hårfärg' : 'Klädfärg'}: ${name}`);
    button.setAttribute('aria-pressed', 'false'); button.title = name;
    button.addEventListener('click', () => setColor(part, color));
    $(`#${part}-swatches`).append(button);
  }
  $(`#${part}-color`).addEventListener('input', event => setColor(part, event.target.value));
}
$('#reset-colors').addEventListener('click', () => {
  state[state.model] = { hair: null, clothes: null }; syncColors(); save();
});
$('#show-masks').addEventListener('change', event => { uniforms.maskPreview.value = Number(event.target.checked); render(); });

// Offline masks use connected geometry and texture samples to separate hair,
// clothing and skin. Tinting preserves the original texture luminance and motifs.
// The shared shader uniforms update colors without rebuilding the GLB.
function maskedMaterial(original) {
  const material = new THREE.MeshStandardMaterial({ map: original.map, roughness: .88, metalness: 0 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'attribute vec2 regionMask; varying vec2 vRegionMask;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegionMask = regionMask;');
    shader.fragmentShader = `varying vec2 vRegionMask;
      uniform vec3 hairTint; uniform vec3 clothesTint;
      uniform float hairAmount; uniform float clothesAmount; uniform float maskPreview;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 originalColor = diffuseColor.rgb;
      float hair = smoothstep(.2, .8, vRegionMask.x);
      float clothes = smoothstep(.2, .8, vRegionMask.y) * (1.0 - hair);
      float luminance = dot(originalColor, vec3(.2126, .7152, .0722));
      vec3 newHair = hairTint * clamp(luminance / .07, .25, 1.5);
      vec3 newClothes = clothesTint * clamp(luminance / .5, .12, 1.5);
      diffuseColor.rgb = mix(originalColor, newHair, hair * hairAmount);
      diffuseColor.rgb = mix(diffuseColor.rgb, newClothes, clothes * clothesAmount);
      vec3 preview = mix(vec3(.32), vec3(.8, .1, .7), hair);
      preview = mix(preview, vec3(.05, .7, .75), clothes);
      diffuseColor.rgb = mix(diffuseColor.rgb, preview, maskPreview);
    `);
  };
  material.customProgramCacheKey = () => 'sovkompis-region-mask-v1';
  return material;
}
function disposeModel(model) {
  const textures = new Set();
  model?.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
  });
  for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
}
function setLoading() {
  $('#load-state').hidden = false;
  $('#load-state').replaceChildren();
  const ring = document.createElement('span'); ring.className = 'loading-ring';
  const title = document.createElement('strong'); title.textContent = 'Laddar din sovkompis…';
  const copy = document.createElement('span'); copy.textContent = 'Modellen öppnas direkt i webbläsaren.';
  $('#load-state').append(ring, title, copy);
  host.setAttribute('aria-busy', 'true');
}
function showError(message, retry = false) {
  const title = document.createElement('strong'); title.textContent = '3D-vyn kunde inte öppnas';
  const copy = document.createElement('span'); copy.textContent = message;
  $('#load-state').replaceChildren(title, copy); $('#load-state').hidden = false;
  host.setAttribute('aria-busy', 'false');
  if (retry) {
    const button = document.createElement('button'); button.className = 'button secondary demo-retry';
    button.textContent = 'Försök igen'; button.onclick = () => loadModel(state.model);
    $('#load-state').append(button);
  }
}
async function loadModel(name) {
  const version = ++loadVersion;
  state.model = name; save(); syncColors();
  document.querySelectorAll('[data-model]').forEach(button => {
    const active = button.dataset.model === name;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  $('#model-name').textContent = modelNames[name];
  $('#model-stats').textContent = '';
  if (!renderer) return;
  setLoading();
  // Keep both promises settled, so a late GLB success can always be disposed even
  // if its companion mask request fails or another model supersedes this load.
  const results = await Promise.allSettled([
    loader.loadAsync(`./models/${name}.glb`),
    fetch(`./models/${name}-mask.bin`).then(response => {
      if (!response.ok) throw new Error('Mask download failed');
      return response.arrayBuffer();
    }),
    fetch(`./models/${name}-mask.json`).then(response => {
      if (!response.ok) throw new Error('Mask metadata unavailable');
      return response.json();
    }),
  ]);
  const gltf = results[0].status === 'fulfilled' ? results[0].value : null;
  if (version !== loadVersion) { disposeModel(gltf?.scene); return; }
  try {
    if (!gltf || results[1].status !== 'fulfilled' || results[2].status !== 'fulfilled') throw new Error('Model or mask unavailable');
    const mask = new Float32Array(results[1].value);
    const meshes = []; gltf.scene.traverse(object => { if (object.isMesh) meshes.push(object); });
    if (meshes.length !== 1 || mask.length !== meshes[0].geometry.attributes.position.count * 2) throw new Error('Mask does not match model');
    const mesh = meshes[0];
    const metadata = results[2].value;
    if (metadata.vertexCount !== mask.length / 2) throw new Error('Mask metadata does not match model');
    const excluded = new Set(metadata.excludedTriangles);
    mesh.geometry.setIndex(Array.from(mesh.geometry.index.array).filter((_, index) => !excluded.has(Math.floor(index / 3))));
    mesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(metadata.visibleBounds.min), new THREE.Vector3().fromArray(metadata.visibleBounds.max));
    mesh.geometry.boundingSphere = mesh.geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    mesh.geometry.setAttribute('regionMask', new THREE.BufferAttribute(mask, 2));
    const old = mesh.material; mesh.material = maskedMaterial(old); old.dispose();
    mesh.castShadow = true; mesh.receiveShadow = true;
    const bounds = new THREE.Box3().setFromObject(gltf.scene);
    const center = bounds.getCenter(new THREE.Vector3());
    const height = bounds.max.y - bounds.min.y;
    gltf.scene.position.set(-center.x, -bounds.min.y, -center.z);
    const group = new THREE.Group(); group.add(gltf.scene); group.scale.setScalar(2 / height);
    scene.remove(currentModel); disposeModel(currentModel); currentModel = group; scene.add(group);
    resetView();
    const triangles = (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
    $('#model-stats').textContent = `${triangles.toLocaleString('sv-SE')} trianglar · separata hår- och klädmasker.`;
    $('#load-state').hidden = true; host.setAttribute('aria-busy', 'false'); render();
  } catch (error) {
    disposeModel(gltf?.scene);
    console.error('Sovkompis 3D:', error);
    showError('Kontrollera anslutningen och prova igen. Du kan också gå tillbaka till 2D-versionen.', true);
  }
}
function resetView() {
  if (!controls) return;
  controls.target.set(0, 1, 0); camera.position.set(0, 1.12, 4.4); controls.update(); render();
}
function moveView(angle = 0, zoom = 1, vertical = 0) {
  if (!controls) return;
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta += angle;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
  spherical.radius = THREE.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update(); render();
}
$('#rotate-left').onclick = () => moveView(-Math.PI / 6);
$('#rotate-right').onclick = () => moveView(Math.PI / 6);
$('#zoom-in').onclick = () => moveView(0, .85);
$('#zoom-out').onclick = () => moveView(0, 1.18);
$('#reset-view').onclick = resetView;
host.addEventListener('keydown', event => {
  const actions = { ArrowLeft: () => moveView(-.2), ArrowRight: () => moveView(.2), ArrowUp: () => moveView(0, 1, -.15), ArrowDown: () => moveView(0, 1, .15), '+': () => moveView(0, .85), '=': () => moveView(0, .85), '-': () => moveView(0, 1.18), Home: resetView };
  if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
});
document.querySelectorAll('[data-model]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.model !== state.model) loadModel(button.dataset.model);
}));

try {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, .05, 50);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true'); host.append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa3b797, 2.2));
  const key = new THREE.DirectionalLight(0xfff4e5, 2.6); key.position.set(3, 5, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 3; key.shadow.camera.bottom = -2;
  key.shadow.normalBias = .02; key.shadow.bias = -.0002; scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6f1ff, 1.5); fill.position.set(-3, 2, -3); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), new THREE.ShadowMaterial({ opacity: .13 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.012; floor.receiveShadow = true; scene.add(floor);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = false; controls.minDistance = 2.4; controls.maxDistance = 7;
  controls.minPolarAngle = .45; controls.maxPolarAngle = Math.PI / 2 + .18;
  controls.addEventListener('change', render);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); render();
  };
  new ResizeObserver(resize).observe(host); resize(); resetView();
  document.addEventListener('visibilitychange', render);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); ++loadVersion;
    showError('3D-visningen pausades av webbläsaren. Ladda om sidan eller gå tillbaka till 2D-versionen.');
  });
  loadModel(state.model);
} catch (error) {
  console.error('Sovkompis WebGL:', error);
  renderer = null;
  showError('Din webbläsare kunde inte starta 3D. Prova en nyare webbläsare, eller fortsätt med 2D-versionen.');
  syncColors();
}
