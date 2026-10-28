import * as THREE from '../vendor/three/three.module.min.js';
import { OBJLoader } from '../vendor/three/OBJLoader.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';

const stage = document.getElementById('characterViewerStage');
const statusEl = document.getElementById('viewerStatus');
const partsEl = document.getElementById('viewerPartsList');
const meshCountEl = document.getElementById('viewerMeshCount');
const modelRoot = new THREE.Group();
modelRoot.name = 'AuroraImportedCharacter';

let scene;
let camera;
let renderer;
let controls;
let grid;
let hemiLight;
let keyLight;
let fillLight;
let lastBounds = null;
let loadedParts = [];

const textures = {
  originalHead: null,
  replacementHead: null,
  originalBody: null,
  replacementBody: null,
  headNormal: null,
  bodyNormal: null,
  eye: null,
  other: null
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error-status', isError);
}

function initViewer() {
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080d16);
    scene.fog = new THREE.FogExp2(0x080d16, 0.0009);

    camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100000);
    camera.position.set(0, 130, 420);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    stage.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 100, 0);
    controls.update();

    hemiLight = new THREE.HemisphereLight(0xbfdcff, 0x1c1320, 2.25);
    keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    fillLight = new THREE.DirectionalLight(0x7b8cff, 1.25);
    keyLight.position.set(220, 300, 260);
    fillLight.position.set(-220, 120, -180);
    scene.add(hemiLight, keyLight, fillLight);

    grid = new THREE.GridHelper(600, 30, 0x376b92, 0x18283a);
    grid.material.opacity = 0.38;
    grid.material.transparent = true;
    scene.add(grid);
    scene.add(modelRoot);

    const observer = new ResizeObserver(resizeViewer);
    observer.observe(stage);
    resizeViewer();
    applyLighting();
    animate();
  } catch (error) {
    setStatus('The 3D viewer could not start: ' + error.message, true);
    stage.innerHTML = '<div class="viewer-error">WebGL could not be started on this system.</div>';
  }
}

function resizeViewer() {
  if (!renderer || !camera) return;
  const width = Math.max(stage.clientWidth, 320);
  const height = Math.max(stage.clientHeight, 460);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

function disposeMaterial(material) {
  if (!material) return;
  const materials = Array.isArray(material) ? material : [material];
  materials.forEach((item) => item.dispose());
}

function clearModel() {
  while (modelRoot.children.length) {
    const item = modelRoot.children.pop();
    item.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) disposeMaterial(child.material);
    });
  }
  loadedParts = [];
  lastBounds = null;
  renderPartsList();
  setStatus('Model cleared. Select OBJ files to begin.');
}

function classifyPart(name) {
  const value = String(name || '').toLowerCase();
  if (/eyelash|lash/.test(value)) return 'eyelash';
  if (/caruncle/.test(value)) return 'caruncle';
  if (/eye/.test(value)) return 'eye';
  if (/teeth|tooth/.test(value)) return 'teeth';
  if (/tongue/.test(value)) return 'tongue';
  if (/mouth|oral|gum/.test(value)) return 'mouth';
  if (/head|face/.test(value)) return 'head';
  if (/body|skin|torso/.test(value)) return 'body';
  if (/hair|beard|mustache|moustache/.test(value)) return 'hair';
  if (/attire|cloth|shirt|trunk|tight|boot|shoe|knee|elbow|glove|jacket|robe/.test(value)) return 'attire';
  return 'other';
}

function materialFor(partType) {
  let color = 0x8a94a7;
  let roughness = 0.72;
  let metalness = 0.02;
  let transparent = false;
  let side = THREE.FrontSide;
  if (partType === 'head' || partType === 'body') color = 0xb7907b;
  if (partType === 'eye') { color = 0xf3f5f7; roughness = 0.22; }
  if (partType === 'caruncle' || partType === 'mouth' || partType === 'tongue') color = 0x7d3039;
  if (partType === 'teeth') color = 0xe8e0cf;
  if (partType === 'eyelash' || partType === 'hair') { color = 0x17171b; transparent = true; side = THREE.DoubleSide; }
  const material = new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent, alphaTest: transparent ? 0.22 : 0, side });
  material.userData.partType = partType;
  return material;
}

function configureTexture(texture, isNormal = false) {
  if (!texture) return;
  texture.flipY = document.getElementById('viewerFlipY').checked;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = isNormal ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.needsUpdate = true;
}

function selectedColorTexture(partType) {
  const modified = document.getElementById('viewerTextureMode').value === 'modified';
  if (partType === 'head') return modified && textures.replacementHead ? textures.replacementHead : textures.originalHead;
  if (partType === 'body') return modified && textures.replacementBody ? textures.replacementBody : textures.originalBody;
  if (partType === 'eye' || partType === 'caruncle') return textures.eye;
  if (partType === 'attire' || partType === 'hair' || partType === 'other' || partType === 'eyelash') return textures.other;
  return null;
}

function updateMaterials() {
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;
    const material = child.material;
    const partType = material.userData.partType || child.userData.partType || 'other';
    const colorMap = selectedColorTexture(partType);
    material.map = colorMap || null;
    if (partType === 'head') material.normalMap = textures.headNormal || null;
    else if (partType === 'body') material.normalMap = textures.bodyNormal || null;
    else material.normalMap = null;
    if (material.normalMap) material.normalScale.set(0.7, 0.7);
    material.wireframe = document.getElementById('viewerWireframe').checked;
    material.needsUpdate = true;
  });
}

function addObjText(filename, text) {
  const loader = new OBJLoader();
  const object = loader.parse(text);
  const fallbackType = classifyPart(filename);
  object.name = filename.replace(/\.obj$/i, '');
  object.traverse((child) => {
    if (!child.isMesh) return;
    const partType = classifyPart(child.name + ' ' + object.name) || fallbackType;
    child.material = materialFor(partType === 'other' ? fallbackType : partType);
    child.userData.partType = partType === 'other' ? fallbackType : partType;
    child.castShadow = false;
    child.receiveShadow = false;
  });
  modelRoot.add(object);
  loadedParts.push({ name: filename, type: fallbackType, meshes: countMeshes(object) });
}

function countMeshes(object) {
  let count = 0;
  object.traverse((child) => { if (child.isMesh) count += 1; });
  return count;
}

async function loadSelectedObjects() {
  const input = document.getElementById('viewerObjFiles');
  const files = Array.from(input.files || []);
  if (!files.length) {
    setStatus('Choose one or more OBJ files first.', true);
    return;
  }
  clearModel();
  setStatus('Reading ' + files.length + ' OBJ file' + (files.length === 1 ? '' : 's') + '…');
  try {
    const contents = await Promise.all(files.map((file) => file.text()));
    files.forEach((file, index) => addObjText(file.name, contents[index]));
    updateMaterials();
    frameModel('front');
    renderPartsList();
    setStatus('Loaded ' + files.length + ' OBJ part' + (files.length === 1 ? '' : 's') + '. Add preview textures or rotate the model.');
  } catch (error) {
    clearModel();
    setStatus('Could not read the selected OBJ export: ' + error.message, true);
  }
}

function renderPartsList() {
  if (!loadedParts.length) {
    partsEl.innerHTML = '<span class="muted">None loaded</span>';
    meshCountEl.textContent = '0 meshes';
    return;
  }
  partsEl.innerHTML = '';
  let meshCount = 0;
  loadedParts.forEach((part) => {
    meshCount += part.meshes;
    const item = document.createElement('span');
    item.className = 'viewer-part-chip';
    item.textContent = part.type + ' · ' + part.name;
    partsEl.appendChild(item);
  });
  meshCountEl.textContent = meshCount + ' mesh' + (meshCount === 1 ? '' : 'es');
}

function frameModel(view = 'front') {
  if (!modelRoot.children.length) return;
  const box = new THREE.Box3().setFromObject(modelRoot);
  if (box.isEmpty()) return;
  lastBounds = box;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 1);
  const distance = radius / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5))) * 1.32;
  const offsets = {
    front: new THREE.Vector3(0, 0, distance),
    back: new THREE.Vector3(0, 0, -distance),
    left: new THREE.Vector3(-distance, 0, 0),
    right: new THREE.Vector3(distance, 0, 0),
    top: new THREE.Vector3(0, distance, 0)
  };
  const offset = offsets[view] || offsets.front;
  camera.position.copy(center).add(offset);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 20;
  camera.up.set(0, 1, 0);
  if (view === 'top') camera.up.set(0, 0, -1);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
  grid.position.y = box.min.y;
}

function applyLighting() {
  if (!renderer) return;
  const mode = document.getElementById('viewerLighting').value;
  const settings = {
    studio: { hemi: 2.25, key: 3.2, fill: 1.25, exposure: 1.05, background: 0x080d16 },
    arena: { hemi: 3.3, key: 5.2, fill: 2.1, exposure: 1.22, background: 0x0d1422 },
    dark: { hemi: 0.7, key: 2.4, fill: 0.35, exposure: 0.76, background: 0x03050a },
    flat: { hemi: 4.5, key: 0.7, fill: 0.7, exposure: 1.0, background: 0x171b22 }
  }[mode];
  hemiLight.intensity = settings.hemi;
  keyLight.intensity = settings.key;
  fillLight.intensity = settings.fill;
  renderer.toneMappingExposure = settings.exposure;
  scene.background.setHex(settings.background);
}

function readTextureFile(file, key, isNormal = false) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    new THREE.TextureLoader().load(String(reader.result), (texture) => {
      if (textures[key]) textures[key].dispose();
      textures[key] = texture;
      configureTexture(texture, isNormal);
      updateMaterials();
      setStatus(file.name + ' loaded for preview.');
    }, undefined, () => setStatus('Could not load image texture: ' + file.name, true));
  };
  reader.readAsDataURL(file);
}

function saveScreenshot() {
  if (!renderer) return;
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.href = renderer.domElement.toDataURL('image/png');
  link.download = 'aurora-forge-character-preview.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setStatus('Preview screenshot saved.');
}

document.getElementById('loadViewerModel').addEventListener('click', loadSelectedObjects);
document.getElementById('clearViewerModel').addEventListener('click', clearModel);
document.getElementById('viewerTextureMode').addEventListener('change', updateMaterials);
document.getElementById('viewerLighting').addEventListener('change', applyLighting);
document.getElementById('viewerWireframe').addEventListener('change', updateMaterials);
document.getElementById('viewerGrid').addEventListener('change', (event) => { grid.visible = event.target.checked; });
document.getElementById('viewerFlipY').addEventListener('change', () => {
  Object.values(textures).forEach((texture) => configureTexture(texture, texture === textures.headNormal || texture === textures.bodyNormal));
  updateMaterials();
});
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => frameModel(button.dataset.view === 'reset' ? 'front' : button.dataset.view)));
document.getElementById('viewerScreenshot').addEventListener('click', saveScreenshot);

[
  ['originalHeadTexture', 'originalHead', false],
  ['replacementHeadTexture', 'replacementHead', false],
  ['originalBodyTexture', 'originalBody', false],
  ['replacementBodyTexture', 'replacementBody', false],
  ['headNormalTexture', 'headNormal', true],
  ['bodyNormalTexture', 'bodyNormal', true],
  ['eyeTexture', 'eye', false],
  ['otherTexture', 'other', false]
].forEach(([inputId, key, isNormal]) => {
  document.getElementById(inputId).addEventListener('change', (event) => readTextureFile(event.target.files && event.target.files[0], key, isNormal));
});

window.AuroraViewerQA = {
  loadObjText(name, text) {
    addObjText(name, text);
    updateMaterials();
    frameModel('front');
    renderPartsList();
    return { parts: loadedParts.length, meshes: loadedParts.reduce((sum, part) => sum + part.meshes, 0) };
  },
  getState() {
    return { parts: loadedParts.slice(), hasRenderer: Boolean(renderer), hasBounds: Boolean(lastBounds) };
  }
};

initViewer();
