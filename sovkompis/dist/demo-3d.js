import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAvatarRig } from './rig-3d.js?v=20261011-skin';
import { createEquipment, createBedroom, attachmentFor } from './equipment-3d.js?v=20261011-skin';
import { BEDTIME_DURATION, REACTION_DURATION, bedtimeFrame, reactionFrame, gazeFor, idleFrame } from './motion-3d.js?v=20261011-skin';
import { HAIRSTYLES, APPEARANCE, prepareAppearance, createAppearance } from './appearance-3d.js?v=20261011-skin';
import { EQUIPMENT, XP_PER_PART, ROUND_XP, loadProgress, saveProgress, placeEquipment, completeRound, availableTargets } from './model.js?v=20261011-skin';
import { equipmentSVG } from './avatar.js?v=20261011-skin';

const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'sovkompis-demo3d-v1';
const modelNames = { boy: 'Din sovkompis · Pojke', girl: 'Din sovkompis · Flicka' };
const palettes = {
  hair: [['Brunt', '#594238'], ['Svart', '#292733'], ['Blont', '#d9b86b'], ['Koppar', '#af5936'], ['Rosa', '#d88cb1'], ['Lila', '#8d79b5']],
  skin: [['Ljus', '#f5d5bd'], ['Ljusbeige', '#e8b693'], ['Varmbeige', '#cc956d'], ['Mellanbrun', '#a96f4c'], ['Brun', '#7c4d34'], ['Mörkbrun', '#503021']],
  clothes: [['Salvia', '#7fa99b'], ['Blått', '#6f9fd3'], ['Rosa', '#d99fab'], ['Lila', '#a58bc9'], ['Gult', '#e2bd67'], ['Korall', '#da8774']],
};
const state = { model: 'boy', boy: { hair: null, clothes: null, skin: null, hairstyle: 'original' }, girl: { hair: null, clothes: null, skin: null, hairstyle: 'original' } };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (['boy', 'girl'].includes(saved?.model)) state.model = saved.model;
  for (const model of ['boy', 'girl']) for (const part of ['hair', 'clothes', 'skin']) {
    if (/^#[\da-f]{6}$/i.test(saved?.[model]?.[part])) state[model][part] = saved[model][part];
  }
  for (const model of ['boy', 'girl']) state[model].stars = saved?.[model]?.stars === true;
  for (const model of ['boy', 'girl']) if (HAIRSTYLES.some(([id]) => id === saved?.[model]?.hairstyle)) state[model].hairstyle = saved[model].hairstyle;
} catch { /* Storage is optional; the demo works without it. */ }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { $('#save-note').textContent = 'Du kan prova färger här, men webbläsaren kan inte spara dem.'; }
}

let storage;
try { storage = localStorage; } catch { storage = null; }
let progress = loadProgress(storage);
let stage = 'customize', rig, equipment, appearance, skeletonHelper, bedroom, floor;
let ambientLight, keyLight, fillLight;
let placed = [], selected = null, counted = false, hinted = false, feedback = '', feedbackKind = '';
let sleepStarted = 0, waveStarted = 0, lastAnimationFrame = 0;
let lookFocus = null, focusUntil = 0, reaction = null, reactionTimer, lastPoseTime = 0;
const gaze = { pitch: 0, yaw: 0 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const uniforms = {
  hairTint: { value: new THREE.Color() }, clothesTint: { value: new THREE.Color() }, skinTint: { value: new THREE.Color() }, skinBase: { value: new THREE.Color() },
  skinAmount: { value: 0 }, hairAmount: { value: 0 }, clothesAmount: { value: 0 }, maskPreview: { value: 0 }, starsAmount: { value: 0 },
  sleepAmount: { value: 0 }, eyeCenter: { value: new THREE.Vector3() }, eyeSize: { value: new THREE.Vector2() }, lidColor: { value: new THREE.Color() },
};
let renderer, scene, camera, controls, currentModel, loadVersion = 0;
const host = $('#three-container');
const loader = new GLTFLoader();
let renderQueued = false;
function render() {
  if (!renderer || renderQueued || document.hidden) return;
  renderQueued = true;
  requestAnimationFrame(now => {
    renderQueued = false;
    if (document.hidden) return;
    const moving = Boolean(rig);
    if (!moving || now - lastAnimationFrame > 30 || reducedMotion.matches) {
      updateAnimation(now); renderer.render(scene, camera); updateTargets(); lastAnimationFrame = now;
    }
    if (moving && !reducedMotion.matches) render();
  });
}
function syncColors() {
  uniforms.starsAmount.value = progress.rounds >= 3 && state[state.model].stars ? 1 : 0;
  const reward = $('#star-pajamas'); reward.disabled = progress.rounds < 3;
  reward.setAttribute('aria-pressed', String(Boolean(uniforms.starsAmount.value)));
  reward.textContent = progress.rounds >= 3 ? '✦ Din stjärnpyjamas' : `☆ Stjärnpyjamas · ${progress.rounds}/3 övningar`;

  for (const part of ['hair', 'clothes', 'skin']) {
    const color = state[state.model][part], fallback = part === 'skin' ? APPEARANCE[state.model].skinBase : palettes[part][0][1];
    uniforms[`${part}Amount`].value = color ? 1 : 0;
    uniforms[`${part}Tint`].value.set(color || fallback);
    $(`#${part}-color`).value = color || fallback;
    document.querySelectorAll(`[data-part="${part}"]`).forEach(button => {
      const active = button.dataset.color === color;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.textContent = active ? '✓' : '';
    });
  }
  uniforms.skinBase.value.set(APPEARANCE[state.model].skinBase);
  uniforms.lidColor.value.set(APPEARANCE[state.model].skin);
  if (state[state.model].skin) {
    const base = uniforms.skinBase.value, tint = uniforms.skinTint.value, lid = uniforms.lidColor.value;
    lid.setRGB(tint.r * lid.r / base.r, tint.g * lid.g / base.g, tint.b * lid.b / base.b);
  }
  appearance?.setSkinColor(state[state.model].skin, Boolean(uniforms.maskPreview.value));
  appearance?.setColor(state[state.model].hair, Boolean(uniforms.maskPreview.value));
  render();
}
function syncHairstyle() {
  const style = state[state.model].hairstyle;
  document.querySelectorAll('[data-hairstyle]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hairstyle === style)));
  appearance?.setStyle(style); render();
}
for (const [id, label] of HAIRSTYLES) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.hairstyle = id;
  button.textContent = label; button.setAttribute('aria-pressed', 'false');
  button.onclick = () => { state[state.model].hairstyle = id; syncHairstyle(); save(); };
  $('#hairstyles-3d').append(button);
}
function setColor(part, color) { state[state.model][part] = color; syncColors(); save(); }
for (const [part, palette] of Object.entries(palettes)) {
  for (const [name, color] of palette) {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.part = part; button.dataset.color = color;
    button.style.setProperty('--swatch', color);
    button.setAttribute('aria-label', `${{ hair: 'Hårfärg', clothes: 'Klädfärg', skin: 'Hudfärg' }[part]}: ${name}`);
    button.setAttribute('aria-pressed', 'false'); button.title = name;
    button.addEventListener('click', () => setColor(part, color));
    $(`#${part}-swatches`).append(button);
  }
  $(`#${part}-color`).addEventListener('input', event => setColor(part, event.target.value));
}
$('#reset-colors').addEventListener('click', () => {
  Object.assign(state[state.model], { hair: null, clothes: null, skin: null, stars: false }); syncColors(); save();
});
$('#show-masks').addEventListener('change', event => { uniforms.maskPreview.value = Number(event.target.checked); syncColors(); });

// Offline masks use connected geometry and texture samples to separate hair,
// clothing and skin. Tinting preserves the original texture luminance and motifs.
// The shared shader uniforms update colors without rebuilding the GLB.
function maskedMaterial(original) {
  const material = new THREE.MeshStandardMaterial({ map: original.map, roughness: .88, metalness: 0 });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'attribute vec3 regionMask; attribute vec3 facePosition; varying vec3 vRegionMask; varying vec3 vAvatarPosition; varying vec3 vFacePosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRegionMask = regionMask; vAvatarPosition = position; vFacePosition = facePosition;');
    shader.fragmentShader = `varying vec3 vRegionMask; varying vec3 vAvatarPosition;
      varying vec3 vFacePosition; uniform float sleepAmount; uniform vec3 eyeCenter; uniform vec2 eyeSize; uniform vec3 lidColor;
      uniform float starsAmount;
      uniform vec3 hairTint; uniform vec3 clothesTint; uniform vec3 skinTint; uniform vec3 skinBase;
      uniform float skinAmount; uniform float hairAmount; uniform float clothesAmount; uniform float maskPreview;
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
      // The skin geometry mask excludes separate facial details. On the girl's
      // shared head texture, protect pale sclera/teeth, dark eyes and pink lips.
      float warmth = (originalColor.r - originalColor.b) / max(originalColor.r, .001);
      float skinTexture = smoothstep(.27, .45, warmth) * smoothstep(.20, .32, originalColor.g / max(originalColor.r, .001)) * smoothstep(.06, .15, luminance);
      float skin = smoothstep(.2, .8, vRegionMask.z) * (1.0 - hair) * (1.0 - clothes) * skinTexture;
      vec3 newSkin = skinTint * clamp(originalColor / skinBase, vec3(.12), vec3(1.8));
      diffuseColor.rgb = mix(diffuseColor.rgb, newSkin, skin * skinAmount);
      vec2 cell = fract(vAvatarPosition.xy * 8.0) - .5;
      float radius = .14 + .09 * cos(atan(cell.y, cell.x) * 5.0);
      float star = 1.0 - smoothstep(radius - .02, radius, length(cell));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, .83, .38), star * clothes * starsAmount);
      vec2 eyeDistance = (vec2(abs(vFacePosition.x), vFacePosition.y) - eyeCenter.xy) / eyeSize;
      float lid = (1.0 - smoothstep(.88, 1.15, length(eyeDistance))) * step(eyeCenter.z - .037, vFacePosition.z);
      diffuseColor.rgb = mix(diffuseColor.rgb, lidColor * (1.0 + .07 * eyeDistance.y), lid * sleepAmount);
      vec3 preview = mix(vec3(.32), vec3(.8, .1, .7), hair);
      preview = mix(preview, vec3(.05, .7, .75), clothes);
      preview = mix(preview, vec3(.93, .65, .22), skin);
      diffuseColor.rgb = mix(diffuseColor.rgb, preview, maskPreview);
    `);
  };
  material.customProgramCacheKey = () => 'sovkompis-region-mask-rig-v4-skin';
  return material;
}
function disposeModel(model) {
  const textures = new Set(), skeletons = new Set();
  model?.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    if (object.skeleton) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      material.dispose();
    }
  });
  for (const skeleton of skeletons) skeleton.dispose();
  for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
}
function setLoading() {
  $('#load-state').hidden = false;
  $('#load-state').replaceChildren();
  const ring = document.createElement('span'); ring.className = 'loading-ring';
  const title = document.createElement('strong'); title.textContent = 'Laddar din sovkompis…';
  const copy = document.createElement('span'); copy.textContent = 'Modellen öppnas direkt i webbläsaren.';
  $('#load-state').append(ring, title, copy);
  host.setAttribute('aria-busy', 'true'); $('#start-practice').disabled = true;
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
  document.querySelectorAll('[data-hairstyle]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.hairstyle === state[name].hairstyle)));
  document.querySelectorAll('[data-model]').forEach(button => {
    const active = button.dataset.model === name;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  $('#model-name').textContent = modelNames[name];
  $('#model-stats').textContent = '';
  if (!renderer) return;
  setLoading();
  // Keep all promises settled, so a late GLB success can always be disposed even
  // if its companion mask request fails or another model supersedes this load.
  const results = await Promise.allSettled([
    loader.loadAsync(`./models/${name}.glb`),
    fetch(`./models/${name}-mask-v2.bin?v=20261011-skin`).then(response => {
      if (!response.ok) throw new Error('Mask download failed');
      return response.arrayBuffer();
    }),
    fetch(`./models/${name}-mask-v2.json?v=20261011-skin`).then(response => {
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
    if (meshes.length !== 1 || mask.length !== meshes[0].geometry.attributes.position.count * 3) throw new Error('Mask does not match model');
    const mesh = meshes[0];
    const metadata = results[2].value;
    if (metadata.version !== 2 || metadata.vertexCount !== mask.length / 3) throw new Error('Mask metadata does not match model');
    const excluded = new Set(metadata.excludedTriangles);
    mesh.geometry.setIndex(Array.from(mesh.geometry.index.array).filter((_, index) => !excluded.has(Math.floor(index / 3))));
    mesh.geometry.boundingBox = new THREE.Box3(new THREE.Vector3().fromArray(metadata.visibleBounds.min), new THREE.Vector3().fromArray(metadata.visibleBounds.max));
    mesh.geometry.boundingSphere = mesh.geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
    mesh.geometry.setAttribute('regionMask', new THREE.BufferAttribute(mask, 3));
    prepareAppearance(mesh.geometry);
    const old = mesh.material; mesh.material = maskedMaterial(old); old.dispose();
    mesh.castShadow = true; mesh.receiveShadow = true;
    const nextRig = createAvatarRig(mesh, name, metadata);
    if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose(); }
    scene.remove(currentModel); disposeModel(currentModel); appearance?.dispose();
    rig = nextRig; currentModel = rig.group; scene.add(currentModel);
    appearance = createAppearance(rig, name);
    uniforms.eyeCenter.value.fromArray(APPEARANCE[name].eye); uniforms.eyeSize.value.fromArray(APPEARANCE[name].eyeSize); uniforms.lidColor.value.set(APPEARANCE[name].skin);
    syncHairstyle(); syncColors();
    equipment = createEquipment(rig);
    skeletonHelper = new THREE.SkeletonHelper(rig.mesh);
    skeletonHelper.material.depthTest = false; skeletonHelper.renderOrder = 10;
    skeletonHelper.visible = $('#show-rig').checked; scene.add(skeletonHelper);
    rig.pose(); resetView();
    const triangles = (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
    $('#model-stats').textContent = `${triangles.toLocaleString('sv-SE')} trianglar · 15 ben · separata hår-, hud- och klädmasker.`;
    $('#load-state').hidden = true; host.setAttribute('aria-busy', 'false'); $('#start-practice').disabled = false; render();
  } catch (error) {
    disposeModel(gltf?.scene);
    console.error('Sovkompis 3D:', error);
    showError('Kontrollera anslutningen och prova igen. Du kan också gå tillbaka till 2D-versionen.', true);
  }
}
function resetView() {
  if (!controls) return;
  if (stage === 'sleep') {
    controls.target.set(0, .72, -.18); camera.position.set(2.5, 4.0, 3.3);
  } else { controls.target.set(0, 1, 0); camera.position.set(0, 1.12, 4.4); }
  controls.update(); render();
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

function announce(message) { $('#demo-announcer').textContent = message; }
function lookAtPart(id, site = progress.oximeterSite, duration = Infinity) {
  if (!rig) return;
  lookFocus = attachmentFor(rig, id, site).point;
  focusUntil = performance.now() + duration; render();
}
function reactToPlacement(id, site) {
  clearTimeout(reactionTimer); reaction = null;
  lookAtPart(id, site, REACTION_DURATION + 350);
  if (id === 'cannula') {
    reaction = { started: performance.now() };
    reactionTimer = setTimeout(() => { reaction = null; render(); }, REACTION_DURATION);
  }
}
function updateAnimation(now) {
  if (!rig) return;
  const sleeping = stage === 'sleep';
  const preview = $('#sleep-preview').value;
  const t = sleeping ? (preview !== 'auto' ? Number(preview) : reducedMotion.matches ? 1 : Math.min(1, (now - sleepStarted) / BEDTIME_DURATION)) : 0;
  const frame = bedtimeFrame(t, rig.rest.hips.toArray());
  const elapsed = Math.min(.05, Math.max(0, (now - lastPoseTime) / 1000)); lastPoseTime = now;
  if (now > focusUntil) lookFocus = null;
  const idle = !sleeping && !reducedMotion.matches ? idleFrame(now, state.model === 'girl' ? 7 : 0) : { pitch: 0, yaw: 0, headTilt: 0, sway: 0, shoulders: 0, blink: 0 };
  const target = !sleeping && lookFocus ? gazeFor(rig.profile, lookFocus) : idle;
  const idleAmount = selected || reaction || waveStarted ? .15 : 1;
  for (const axis of ['pitch', 'yaw']) gaze[axis] = reducedMotion.matches ? 0 : THREE.MathUtils.damp(gaze[axis], target[axis], 9, elapsed);
  const laugh = reaction && !sleeping ? reactionFrame(now - reaction.started) : { giggle: 0, eyes: 0, active: false };
  const waveTime = waveStarted ? (now - waveStarted) / 1900 : 0;
  const greet = waveStarted && waveTime < 1 && !reducedMotion.matches ? Math.sin(waveTime * Math.PI) * (.85 + .15 * Math.sin(waveTime * Math.PI * 6)) : 0;
  if (waveTime >= 1 || reducedMotion.matches) waveStarted = 0;
  rig.group.rotation.set(frame.rootX, frame.rootY, 0);
  // Preserve the pelvis anchor while the spine, knees and arms move independently.
  rig.group.position.fromArray(frame.hip).sub(rig.rest.hips.clone().applyQuaternion(rig.group.quaternion));
  rig.pose({ ...frame, breath: reducedMotion.matches ? 0 : Math.sin(now / (sleeping ? 1100 : 1550)) * (sleeping ? 1 : .6), greet, sway: idle.sway * idleAmount, headTilt: idle.headTilt * idleAmount, shoulders: idle.shoulders * idleAmount, lookPitch: gaze.pitch, lookYaw: gaze.yaw, giggle: reducedMotion.matches ? 0 : laugh.giggle });
  const eyesClosed = sleeping ? frame.eyes : reducedMotion.matches ? 0 : Math.max(laugh.eyes, idle.blink);
  uniforms.sleepAmount.value = eyesClosed; appearance?.setSleep(eyesClosed);
  ambientLight.intensity = THREE.MathUtils.lerp(2.2, .72, frame.dim);
  keyLight.intensity = THREE.MathUtils.lerp(2.6, .95, frame.dim);
  fillLight.intensity = THREE.MathUtils.lerp(1.5, .45, frame.dim);
  bedroom.position.z = sleeping ? frame.bedOffset : 0;
  const duvet = bedroom.getObjectByName('duvet'), unfold = .08 + .92 * frame.blanket;
  duvet.visible = true; duvet.scale.z = unfold; duvet.position.set(0, -.50 * (1 - frame.blanket), 1.28 * (1 - unfold));
  $('#sleep-symbols').hidden = !sleeping || t < .98;
  const caption = $('#bedtime-caption'); caption.hidden = !sleeping || t >= 1;
  caption.textContent = { sitting: 'Först sätter vi oss…', 'legs-up': 'Upp med de små fötterna…', reclining: 'Huvudet på den mjuka kudden…', 'tucking-in': 'Och filten på. God natt! 💤' }[frame.phase] || '';
  const bubble = $('#reaction-bubble'); bubble.hidden = !laugh.active;
  if (laugh.active) {
    const point = rig.bones.head.localToWorld(new THREE.Vector3(0, .53, .08)).project(camera);
    bubble.style.left = `${THREE.MathUtils.clamp((point.x * .5 + .5) * host.clientWidth, 88, host.clientWidth - 88)}px`;
    bubble.style.top = `${Math.max(44, (-point.y * .5 + .5) * host.clientHeight - 18)}px`;
  }
  host.dataset.eyes = eyesClosed > .99 ? 'closed' : 'open';
  host.dataset.pose = sleeping ? frame.phase : laugh.active ? 'giggle' : 'standing';
  host.dataset.gaze = lookFocus ? 'following' : 'rest';
}
function renderJourney() {
  $('#app').dataset.stage = stage;
  const step = stage === 'complete' ? 'practice' : stage;
  document.querySelectorAll('[data-stage-step]').forEach(item => {
    if (item.dataset.stageStep === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  for (const [id, value] of [['customize-panel-3d', 'customize'], ['practice-panel-3d', 'practice'], ['complete-panel-3d', 'complete'], ['sleep-panel-3d', 'sleep']]) $(`#${id}`).hidden = stage !== value;
  $('#demo-intro').hidden = stage === 'practice' || stage === 'sleep' || stage === 'complete';
  $('#coach-3d').hidden = stage !== 'practice';
  $('#sleep-symbols').hidden = stage !== 'sleep';
  $('#celebration-3d').hidden = stage !== 'complete';
  $('#greet-3d').disabled = stage !== 'customize';
  $('#sleep-preview').disabled = stage !== 'sleep';
  $('#demo-xp').textContent = `${progress.xp + (stage === 'practice' && !counted ? placed.length * XP_PER_PART : 0)} XP`;
  const titles = { customize: ['Träffa din kompis i 3D.', 'Välj figur, frisyr och favoritfärger. Du bestämmer.'], practice: ['En liten del i taget.', 'Dra en del till figuren. Du kan också välja del och trycka på rätt plats.'], complete: ['Bravo! Ni gjorde det tillsammans.', 'Alla åtta delarna är på plats. Nu kan din sovkompis vila.'], sleep: ['Dags för en tryggare natt.', 'En mjuk kudde, en varm filt och en kompis som somnar.'] };
  $('#demo-title').textContent = titles[stage][0]; $('#demo-subtitle').textContent = titles[stage][1];
  $('.viewer-hint').textContent = stage === 'practice' ? 'Välj del · dra eller tryck på en plats' : stage === 'sleep' ? 'Sov gott, lilla kompis · dra för att se från sidan' : 'Dra för att snurra · nyp för att zooma';
  $('#sleep-score').textContent = `${progress.rounds} ${progress.rounds === 1 ? 'övning klar' : 'övningar klara'} · ${progress.xp} XP samlade`;
  if (bedroom) bedroom.visible = stage === 'sleep';
  if (floor) floor.visible = stage !== 'sleep';
  updateInventory(); render();
}
function changeStage(next) {
  stage = next; selected = null; hinted = false;
  if (next !== 'complete') { reaction = null; clearTimeout(reactionTimer); lookFocus = null; }
  if (next === 'sleep') { sleepStarted = performance.now(); waveStarted = 0; $('#sleep-preview').value = 'auto'; }
  if (next === 'customize') { placed = []; counted = false; equipment?.clear(); }
  renderJourney(); resetView();
  $('#demo-title').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' });
}
function startPractice() {
  if (!rig || !$('#load-state').hidden) return;
  placed = []; selected = null; counted = false; feedback = ''; feedbackKind = ''; hinted = false; waveStarted = 0;
  equipment.clear(); buildInventory(); updateCoach(); changeStage('practice');
  announce('Välj en del och dra den till figuren, eller tryck på delen och sedan på en plats.');
}
function buildInventory() {
  $('#equipment-3d-list').innerHTML = EQUIPMENT.map((item, index) => `<button class="equipment-card" data-equipment="${item.id}" aria-pressed="false"><span class="equipment-image">${equipmentSVG(item.id)}</span><span class="equipment-text"><strong>${item.name}</strong><small>${item.subtitle || 'Tryck eller dra'}</small></span><span class="equipment-number">${index + 1}</span></button>`).join('');
}
function updateInventory() {
  document.querySelectorAll('#equipment-3d-list [data-equipment]').forEach(button => {
    const item = EQUIPMENT.find(item => item.id === button.dataset.equipment), done = placed.includes(item.id);
    button.disabled = done; button.classList.toggle('placed', done); button.classList.toggle('selected', item.id === selected);
    button.setAttribute('aria-pressed', String(item.id === selected));
    button.querySelector('small').textContent = done ? 'På plats!' : item.subtitle || 'Tryck eller dra';
    button.querySelector('.equipment-number').textContent = done ? '✓' : String(EQUIPMENT.indexOf(item) + 1);
  });
  $('#parts-count').textContent = `${placed.length} av ${EQUIPMENT.length}`;
  $('#progress-label-3d').textContent = `${placed.length}/${EQUIPMENT.length} delar`;
  $('#progress-fill-3d').style.width = `${placed.length / EQUIPMENT.length * 100}%`;
}
function updateCoach() {
  const item = EQUIPMENT.find(item => item.id === selected), success = feedbackKind === 'correct';
  $('#coach-card-3d').classList.toggle('success', success);
  $('#coach-overline').textContent = success ? 'FINT JOBBAT' : feedbackKind === 'retry' ? 'PROVA IGEN, I DIN TAKT' : item ? 'LÄR KÄNNA DELEN' : 'VI BÖRJAR HÄR';
  $('#coach-title').textContent = success ? 'Där satt den!' : item?.name || 'Vilken del vill du prova?';
  const instruction = item?.id === 'oximeter' ? 'Sätt pulsoximetern på fingret eller tån. Båda går bra i övningen.' : item?.instruction;
  $('#coach-copy').textContent = feedback || (item ? `${item.description} ${instruction}` : 'Välj en del i listan. Det finns ingen brådska.');
  $('#hint-3d').hidden = !item; $('#hint-3d').textContent = hinted ? 'Dölj ledtråd' : 'Visa mig var';
}
function selectPart(id) {
  if (stage !== 'practice' || placed.includes(id) || !EQUIPMENT.some(item => item.id === id)) return;
  selected = id; feedback = ''; feedbackKind = ''; hinted = false;
  lookAtPart(id);
  updateInventory(); updateCoach(); rebuildTargets(); resetView();
  announce(`${EQUIPMENT.find(item => item.id === id).name} vald. Välj en plats på figuren.`);
}
function rebuildTargets() {
  $('#targets-3d').replaceChildren();
  if (stage !== 'practice' || !selected) return;
  for (const item of availableTargets(placed, selected)) {
    const button = document.createElement('button'); button.className = 'target-3d'; button.dataset.target = item.targetId; button.dataset.equipment = item.id; button.dataset.site = item.site || '';
    const label = item.short;
    button.setAttribute('aria-label', `Placera vald del vid ${label.toLowerCase()}`);
    button.innerHTML = `<span>${item.number || '+'}</span><span class="target-name">${label}</span>`;
    button.classList.toggle('hinted', hinted && item.id === selected);
    button.addEventListener('pointerenter', () => lookAtPart(item.id, item.site));
    button.addEventListener('focus', () => lookAtPart(item.id, item.site));
    button.addEventListener('click', () => placePart(item.targetId)); $('#targets-3d').append(button);
  }
  updateTargets();
}
function updateTargets() {
  if (!equipment) return;
  if (stage !== 'practice' || !selected) { $('#targets-3d').hidden = true; return; }
  $('#targets-3d').hidden = false;
  const width = host.clientWidth, height = host.clientHeight;
  rig.group.updateMatrixWorld(true);
  for (const button of $('#targets-3d').children) {
    const point = equipment.anchor(button.dataset.equipment, button.dataset.site || progress.oximeterSite).getWorldPosition(new THREE.Vector3()).project(camera);
    button.style.left = `${(point.x * .5 + .5) * width}px`; button.style.top = `${(-point.y * .5 + .5) * height}px`;
    // Hidden from the back; selecting another item or Framifrån returns to the front.
    button.hidden = point.z < -1 || point.z > 1 || camera.position.z < -.1;
  }
}
function placePart(target) {
  if (!selected || counted || stage !== 'practice') return;
  const result = placeEquipment(placed, selected, target), item = EQUIPMENT.find(item => item.id === selected);
  if (!result.correct) {
    feedback = 'Nästan! Prova en annan plats. Du kan trycka på ”Visa mig var” om du vill ha hjälp.'; feedbackKind = 'retry'; updateCoach(); announce(feedback); return;
  }
  if (result.site) { progress.oximeterSite = result.site; saveProgress(storage, progress); }
  equipment.place(selected, progress.oximeterSite); reactToPlacement(selected, progress.oximeterSite);
  placed = result.placed; feedback = item.success; feedbackKind = 'correct'; selected = null; hinted = false;
  rebuildTargets(); updateInventory(); updateCoach();
  announce(`${feedback} Plus ${XP_PER_PART} XP. ${placed.length} av ${EQUIPMENT.length} delar på plats.`);
  if (result.complete) {
    counted = true;
    // Read the latest completed progress to preserve rounds earned in the 2D tab.
    try { if (storage?.getItem('sovkompis-v1')) progress = loadProgress(storage); } catch { /* Keep in-memory progress. */ }
    progress = completeRound(progress);
    const saved = saveProgress(storage, progress); syncColors();
    $('#reward-message').textContent = progress.rounds >= 3 ? `${progress.rounds === 3 ? 'Du låste upp' : 'Du har låst upp'} stjärnpyjamasen! Den finns bland din kompis kläder.` : `${3 - progress.rounds} ${3 - progress.rounds === 1 ? 'övning' : 'övningar'} kvar till din stjärnpyjamas.`;
    if (!saved) $('#reward-message').textContent += ' Webbläsaren kan inte spara poängen mellan besök.';
    $('#celebration-3d').innerHTML = Array.from({ length: 32 }, (_, i) => `<i style="--left:${i * 37 % 100}%;--delay:${i % 5 * .13}s;--color:${['#dcb875', '#86b3a1', '#bda3cf', '#deaa9d'][i % 4]}"></i>`).join('');
    changeStage('complete'); announce(`Bravo! Alla åtta delar är på plats. Du har fått ${ROUND_XP} XP.`);
  } else {
    renderJourney();
    document.querySelector('#equipment-3d-list [data-equipment]:not(:disabled)')?.focus({ preventScroll: true });
  }
  render();
}
$('#start-practice').onclick = startPractice;
$('#go-sleep').onclick = () => changeStage('sleep');
$('#replay-bedtime').onclick = () => { sleepStarted = performance.now(); $('#sleep-preview').value = 'auto'; resetView(); render(); };
$('#sleep-preview').onchange = () => { if ($('#sleep-preview').value === 'auto') sleepStarted = performance.now(); render(); };
$('#edit-avatar').onclick = $('#sleep-edit').onclick = () => changeStage('customize');
document.querySelectorAll('[data-replay]').forEach(button => button.onclick = startPractice);
$('#star-pajamas').onclick = () => { if (progress.rounds < 3) return; state[state.model].stars = !state[state.model].stars; save(); syncColors(); };
$('#show-rig').onchange = event => { if (skeletonHelper) skeletonHelper.visible = event.target.checked; render(); };
$('#greet-3d').onclick = () => { if (stage === 'customize') { waveStarted = performance.now(); render(); } };
$('#hint-3d').onclick = () => { hinted = !hinted; rebuildTargets(); updateCoach(); render(); };
let dragging = null, suppressClickUntil = 0;
const inventory = $('#equipment-3d-list');
inventory.addEventListener('click', event => {
  const button = event.target.closest('[data-equipment]');
  if (button && !button.disabled && performance.now() > suppressClickUntil) selectPart(button.dataset.equipment);
});
inventory.addEventListener('pointerdown', event => {
  const button = event.target.closest('[data-equipment]');
  if (!button || button.disabled || event.button !== 0 || stage !== 'practice') return;
  selectPart(button.dataset.equipment);
  dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, ghost: null };
  inventory.setPointerCapture(event.pointerId); controls.enabled = false;
});
function dropTargetAt(x, y) {
  let nearest = null, distance = 38;
  for (const button of $('#targets-3d').children) {
    if (button.hidden) continue;
    const rect = button.getBoundingClientRect(), d = Math.hypot(x - rect.x - rect.width / 2, y - rect.y - rect.height / 2);
    if (d < distance) { distance = d; nearest = button; }
  }
  return nearest;
}
inventory.addEventListener('pointermove', event => {
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  if (!dragging.moved && Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) < 7) return;
  event.preventDefault(); dragging.moved = true;
  if (!dragging.ghost) {
    dragging.ghost = document.createElement('div'); dragging.ghost.className = 'demo-drag-ghost';
    dragging.ghost.innerHTML = `${equipmentSVG(selected)}<span>${EQUIPMENT.find(item => item.id === selected).name}</span>`;
    document.body.append(dragging.ghost);
  }
  dragging.ghost.style.left = `${event.clientX}px`; dragging.ghost.style.top = `${event.clientY}px`;
  const target = dropTargetAt(event.clientX, event.clientY);
  if (target) lookAtPart(target.dataset.equipment, target.dataset.site || progress.oximeterSite);
  for (const button of $('#targets-3d').children) button.classList.toggle('drag-over', button === target);
});
function endDrag(event, cancelled = false) {
  if (!dragging || dragging.pointerId !== event.pointerId) return;
  const old = dragging; dragging = null; old.ghost?.remove(); controls.enabled = true;
  if (inventory.hasPointerCapture(event.pointerId)) inventory.releasePointerCapture(event.pointerId);
  for (const button of $('#targets-3d').children) button.classList.remove('drag-over');
  if (!cancelled && old.moved) { suppressClickUntil = performance.now() + 350; placePart(dropTargetAt(event.clientX, event.clientY)?.dataset.target || 'miss'); }
}
inventory.addEventListener('pointerup', event => endDrag(event));
inventory.addEventListener('pointercancel', event => endDrag(event, true));
inventory.addEventListener('lostpointercapture', event => endDrag(event, true));

try {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, .05, 50);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true'); host.append(renderer.domElement);
  ambientLight = new THREE.HemisphereLight(0xffffff, 0xa3b797, 2.2); scene.add(ambientLight);
  const key = keyLight = new THREE.DirectionalLight(0xfff4e5, 2.6); key.position.set(3, 5, 4);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 3; key.shadow.camera.bottom = -2;
  key.shadow.normalBias = .02; key.shadow.bias = -.0002; scene.add(key);
  const fill = fillLight = new THREE.DirectionalLight(0xe6f1ff, 1.5); fill.position.set(-3, 2, -3); scene.add(fill);
  floor = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), new THREE.ShadowMaterial({ opacity: .13 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.012; floor.receiveShadow = true; scene.add(floor);
  bedroom = createBedroom(); scene.add(bedroom);
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
  renderJourney(); loadModel(state.model);
} catch (error) {
  console.error('Sovkompis WebGL:', error);
  renderer = null;
  showError('Din webbläsare kunde inte starta 3D. Prova en nyare webbläsare, eller fortsätt med 2D-versionen.');
  syncColors();
}
