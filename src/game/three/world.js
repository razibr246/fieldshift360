// The 3D world around the field: terrain shaped and coloured by layout.js (soil, paths, sand, neighbours' fields,
// Punakha's terraces), water, the sky through the day and night, distant scenery for each place, every prop, the
// animals, and the weather — rain, hail, heat haze, lightning and rising flood water — plus the storm's safe zone
// and the quest marker. Static props are merged into a few large meshes so the scene draws quickly on phones.
// Each place has its own air (layout.js `air`: haze, dust, sea air or winter fog) and its own smoke — kiln chimneys,
// burning straw, the cooking fire at home in the morning and evening.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BUILD, M, blob, cone, box, cyl } from './props';
import { FIELD_W, FIELD_D } from '../regions';
import { inWater } from '../layout';
import { createNature } from './nature';

const C = (h) => new THREE.Color(h);
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const PATCH = { wheat: '#7fa84a', stubble: '#c9b06a', mustard: '#e3c93a', paddy: '#a9b44a', bare: '#b39466', sunflower: '#d9b43a', sesame: '#9aa45a', groundnut: '#7c9a4a' };

function terrain(L) {
  const size = 340, seg = 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
  const ground = C(L.grass), soil = C(L.soil), path = C(L.path), sand = C(L.sand ?? '#d9c79c'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const far = Math.hypot(x, z);
    let h = L.ground(x, z);
    const wet = L.water.some((w) => (w.r ? Math.hypot(x - w.cx, z - w.cz) < w.r + 2 : x > w.x0 - 2 && x < w.x1 + 2 && z > w.z0 - 2 && z < w.z1 + 2));
    if (far > 70 && !wet) h += (far - 70) * 0.045 * (L.far === 'himalaya' ? 3.2 : (L.far === 'churia' || L.far === 'meghalaya') && z < 0 ? 1.7 : L.far === 'chittagong' && x > 0 ? 2.3 : 0.25);
    pos.setY(i, h);
    const n = hash(Math.floor(x / 2), Math.floor(z / 2));
    tmp.copy(ground).offsetHSL((n - 0.5) * 0.03, (n - 0.5) * 0.08, (n - 0.5) * 0.06);
    if (L.patches) for (const [x0, x1, z0, z1, k] of L.patches) if (x > x0 && x < x1 && z > z0 && z < z1) { tmp.set(PATCH[k]).offsetHSL(0, 0, (n - 0.5) * 0.05 + (k === 'stubble' && Math.floor(x) % 2 ? 0.04 : 0)); break; }
    if (L.terraces) { const d = Math.max(0, Math.abs(x) - 26, -z - 18); if (d > 0) tmp.set(Math.floor(d / 3.2) % 2 ? '#b5a84a' : '#8fb24a').offsetHSL(0, 0, (n - 0.5) * 0.05); if (d % 3.2 > 2.6) tmp.set('#7a6a4a'); }
    if (L.sandbank && z > L.sandbank.z0 && z < L.sandbank.z1 + 4) tmp.lerp(sand, 0.85);
    let pd = 99; for (const p of L.paths) for (let k = 1; k < p.length; k++) pd = Math.min(pd, segDist(x, z, p[k - 1], p[k]));
    if (pd < 1.3) tmp.lerp(path, 0.85 * (1 - pd / 1.3) + 0.15);
    if (Math.abs(x) < FIELD_W / 2 + 1 && Math.abs(z) < FIELD_D / 2 + 1) tmp.copy(soil);
    for (const w of L.water) { const d = w.r ? w.r - Math.hypot(x - w.cx, z - w.cz) : Math.min(x - w.x0, w.x1 - x, z - w.z0, w.z1 - z); if (d > -1.5) tmp.lerp(C('#6b5a42'), 0.7); }
    cols[i * 3] = tmp.r; cols[i * 3 + 1] = tmp.g; cols[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
  m.receiveShadow = true;
  return m;
}

function waters(L) {
  const list = [];
  for (const w of L.water) {
    const geo = w.r ? new THREE.CircleGeometry(w.r + 0.4, 40) : new THREE.PlaneGeometry(w.x1 - w.x0, w.z1 - w.z0, Math.min(80, Math.ceil((w.x1 - w.x0) / 3)), Math.min(80, Math.ceil((w.z1 - w.z0) / 3)));
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: w.color, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.9, flatShading: true }));
    m.position.set(w.r ? w.cx : (w.x0 + w.x1) / 2, w.y, w.r ? w.cz : (w.z0 + w.z1) / 2);
    m.receiveShadow = true; m.userData.base = geo.attributes.position.array.slice();
    list.push(m);
  }
  return list;
}

// Distant scenery for each place, beyond the walkable circle.
function scenery(kind, group) {
  const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
  const ridge = (n, r0, r1, a0, a1, hMin, hMax, col, snow) => {
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * (k / n) + rnd() * 0.1, r = r0 + rnd() * (r1 - r0), h = hMin + rnd() * (hMax - hMin);
      const m = cone(group, h * (0.9 + rnd() * 0.6), h, col, [Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r], [0, rnd() * 3, 0], 6);
      m.castShadow = false;
      if (snow && h > hMax * 0.6) { const s = cone(group, h * 0.38, h * 0.3, '#f4f6f8', [Math.cos(a) * r, h - 2 - h * 0.15 + 0.2, Math.sin(a) * r], [0, rnd() * 3, 0], 6); s.castShadow = false; }
    }
  };
  if (kind === 'plain') {
    for (let k = 0; k < 120; k++) {
      const a = rnd() * Math.PI * 2, r = 85 + rnd() * 65, b = blob(group, 3.2 + rnd() * 3.5, '#4f7a3f', [Math.cos(a) * r, 3.2, Math.sin(a) * r], [1.1, 1.5, 1.1], 0);
      b.castShadow = false;
    }
  }
  if (kind === 'kirthar') { ridge(32, 120, 180, Math.PI * 0.75, Math.PI * 1.25, 20, 48, '#9a7a56'); for (let k = 0; k < 55; k++) { const a = rnd() * Math.PI * 2, r = 80 + rnd() * 60; blob(group, 2.2 + rnd() * 2.2, '#7d8a4a', [Math.cos(a) * r, 2, Math.sin(a) * r], [1.3, 0.5, 1.2], 0).castShadow = false; } }
  if (kind === 'churia') { ridge(38, 110, 160, -Math.PI * 0.95, -Math.PI * 0.05, 22, 50, '#3f6a3a'); ridge(25, 160, 220, -Math.PI * 0.9, -Math.PI * 0.1, 45, 78, '#5b7a76'); }
  if (kind === 'himalaya') {
    ridge(40, 75, 120, -Math.PI, Math.PI, 28, 56, '#355f40');
    ridge(28, 150, 220, -Math.PI * 0.85, -Math.PI * 0.15, 75, 135, '#6a7f8e', true);
    // Punakha Dzong where the rivers meet, down the valley to the south-west
    const d = new THREE.Group(); d.position.set(-62, 0, 72); d.scale.setScalar(2.6); group.add(d);
    box(d, 14, 5, 7, '#f2ede2', [0, 2.5, 0]); box(d, 14.4, 1, 7.4, '#8a2a20', [0, 5.3, 0]); box(d, 5, 4, 5, '#f2ede2', [1, 7.5, 0]); box(d, 5.4, 0.8, 5.4, '#8a2a20', [1, 9.7, 0]);
    cone(d, 4, 1.6, '#d4a73a', [1, 10.9, 0], [0, Math.PI / 4, 0], 4); cone(d, 10, 1.4, '#7d838a', [-3, 6.4, 0], [0, Math.PI / 4, 0], 4);
  }

  if (kind === 'dhaka') {
    for (let k = 0; k < 85; k++) { const a = rnd() * Math.PI * 2, r = 85 + rnd() * 60; blob(group, 3.2 + rnd() * 3.5, '#5f8f45', [Math.cos(a) * r, 3, Math.sin(a) * r], [1, 1.4, 1], 0).castShadow = false; }
    for (let k = 0; k < 12; k++) { const a = -Math.PI * 0.85 + k * 0.18, r = 110 + rnd() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r;
      box(group, 18, 7, 10, k % 2 ? '#9aa4ad' : '#b7aa96', [x, 3.5, z]).castShadow = false; cyl(group, 0.8, 1, 16, '#8a8178', [x + 6, 8, z], [0, 0, 0], 8).castShadow = false; }
  }
  if (kind === 'chittagong') {
    ridge(34, 85, 140, -Math.PI * 0.45, Math.PI * 0.45, 24, 52, '#3d6a3a');
    const t = new THREE.Group(); t.position.set(110, 34, -10); group.add(t); box(t, 3, 4, 3, '#f2ede2', [0, 2, 0]); cone(t, 2, 3, '#c9482e', [0, 5.5, 0], [0, Math.PI / 4, 0], 4); // Chandranath on its hill
    for (let k = 0; k < 7; k++) { const z = -60 + k * 26, x = -110 - rnd() * 35; box(group, 6, 4, 26, k % 2 ? '#8a3a2a' : '#4a5a6a', [x, 1, z]).castShadow = false; box(group, 4, 5, 6, '#e8e4da', [x, 5, z - 8]).castShadow = false; cyl(group, 0.2, 0.2, 18, '#d6a020', [x + 10, 9, z + 4], [0, 0, 0], 5).castShadow = false; }
  }
  if (kind === 'rivers' || kind === 'char') for (let k = 0; k < 95; k++) { const a = rnd() * Math.PI * 2, r = 80 + rnd() * 70; blob(group, 3.2 + rnd() * 3.5, kind === 'char' ? '#7f9f55' : '#4f8a3c', [Math.cos(a) * r, 3, Math.sin(a) * r], [1, 1.4, 1], 0).castShadow = false; }
  if (kind === 'char') for (let k = 0; k < 180; k++) { const x = -70 + rnd() * 140, z = 26 + rnd() * 18; cone(group, 0.35, 1.6, '#e9e4d6', [x, 0.8, z], [0, 0, (rnd() - 0.5) * 0.4], 4).castShadow = false; }
  if (kind === 'meghalaya') {
    ridge(38, 110, 160, -Math.PI * 0.95, -Math.PI * 0.05, 34, 68, '#3a6a4a'); ridge(26, 160, 220, -Math.PI * 0.9, -Math.PI * 0.1, 68, 102, '#6a8a96');
    box(group, 4, 40, 1, '#e8f4f8', [-30, 18, -128], [0.15, 0, 0]).castShadow = false; // a waterfall down the hills
  }
  if (kind === 'bagan') {
    // brick temples and white stupas across the plain, as at Bagan
    for (let k = 0; k < 34; k++) {
      const a = rnd() * Math.PI * 2, r = 75 + rnd() * 85, s = 1 + rnd() * 2.2, x = Math.cos(a) * r, z = Math.sin(a) * r, white = rnd() < 0.25;
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); group.add(t);
      const col = white ? '#f2ede2' : '#a8593a';
      box(t, 6, 3, 6, col, [0, 1.5, 0]); box(t, 4.4, 1.6, 4.4, col, [0, 3.8, 0]); box(t, 3, 1.2, 3, col, [0, 5.2, 0]);
      cone(t, 1.4, 4, white ? '#e2b84a' : col, [0, 7.8, 0], [0, 0, 0], 8);
    }
    ridge(22, 170, 230, -Math.PI * 0.4, Math.PI * 0.4, 16, 28, '#8a8a7a');
  }
}

// Merge every non-moving mesh into one mesh per material.
function bake(group) {
  group.updateMatrixWorld(true);
  const byMat = new Map(), keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    let moving = false; for (let p = o; p; p = p.parent) if (p.userData.wave || p.userData.flow || p.userData.animal || p.userData.wheel || p.userData.live) { moving = true; break; }
    if (moving) { keep.push(o); return; }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const key = o.material.uuid;
    if (!byMat.has(key)) byMat.set(key, { m: o.material, list: [], shadow: o.castShadow });
    byMat.get(key).list.push(g);
  });
  const out = new THREE.Group();
  for (const { m, list, shadow } of byMat.values()) {
    const mm = new THREE.Mesh(mergeGeometries(list), m); mm.castShadow = shadow; mm.receiveShadow = true; out.add(mm);
  }
  return { baked: out, keep };
}

// Sky dome with a vertical gradient and a glow round the sun.
function sky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C('#5aa0e0') }, mid: { value: C('#cfe6f2') }, low: { value: C('#e8efe6') }, sun: { value: new THREE.Vector3(0, 1, 0) }, glow: { value: C('#fff1c4') }, stars: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, low, glow, sun; uniform float stars; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){ float y = vP.y; vec3 c = y > 0.0 ? mix(mid, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(mid, low, clamp(-y*4.0,0.0,1.0));
        float s = max(0.0, dot(vP, normalize(sun))); c += glow * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.35);
        vec3 q = floor(vP * 260.0); float st = step(0.9975, h(q)) * stars * smoothstep(0.0, 0.25, y); c += vec3(st);
        gl_FragColor = vec4(c, 1.0); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), mat);
}

// Sky colours through the day: [phase, top, mid, low, sun light, sun intensity, hemi intensity]
const DAYCOL = [
  [0.0, '#6f8fc0', '#f2b98a', '#e9d2b8', '#ffb07a', 0.9, 0.45],
  [0.12, '#4f97dc', '#c6e0ee', '#e2ebe2', '#fff0d2', 1.9, 0.65],
  [0.6, '#4f97dc', '#cbe3ee', '#e2ebe2', '#fff0d2', 1.9, 0.65],
  [0.73, '#5d78b0', '#f0a070', '#e6b896', '#ff9a5a', 1.0, 0.45],
  [0.8, '#101a38', '#2a3560', '#1a2238', '#8fa6e0', 0.3, 0.25],
  [0.95, '#0e1630', '#243058', '#1a2238', '#8fa6e0', 0.3, 0.25],
  [1.0, '#6f8fc0', '#f2b98a', '#e9d2b8', '#ffb07a', 0.9, 0.45],
];
const SKYTINT = { hazy: ['#c9c2a6', 0.35], dusty: ['#d8c39a', 0.3], hot: ['#f2e2b8', 0.18], foggy: ['#dfe3e0', 0.45], clear: [null, 0] };

export function createWorld(scene, g, { light = false } = {}) {
  const L = g.L;
  const root = new THREE.Group(); scene.add(root);
  const groundMesh = terrain(L);
  root.add(groundMesh);
  const nature = createNature(scene, L, { light }); // grass, wildflowers, the neighbours' crops, clouds, butterflies & birds
  const water = waters(L); water.forEach((w) => root.add(w));
  const skyM = sky(); scene.add(skyM);
  const props = new THREE.Group();
  const animals = [];
  for (const p of L.props) {
    const b = BUILD[p.type]; if (!b) continue;
    const o = b(p); const wet = inWater(L, p.x, p.z); o.position.set(p.x, wet ? wet.y : L.ground(p.x, p.z), p.z); o.rotation.y = p.rot; o.scale.setScalar(p.s ?? 1);
    props.add(o);
    if (o.userData.animal) { o.userData.animal.home = [p.x, p.z]; o.userData.animal.ph = Math.random() * 10; animals.push(o); }
  }
  scenery(L.far, props);
  const { baked, keep } = bake(props);
  root.add(baked);
  // moving pieces stay live: re-parent them with their world transforms
  const waving = [], flowing = [], wheels = [], bobbing = [];
  for (const o of keep) {
    if (animals.some((a) => { for (let p = o; p; p = p.parent) if (p === a) return true; return false; })) continue;
    o.updateWorldMatrix(true, false); o.matrixWorld.decompose(o.position, o.quaternion, o.scale); root.add(o);
    if (o.userData.wave) waving.push(o); if (o.userData.flow) flowing.push(o); if (o.userData.wheel) wheels.push(o);
    for (let p = o; p; p = p.parent) if (p.userData.bob) { bobbing.push({ o, y: o.position.y, ph: Math.random() * 6 }); break; }
  }
  for (const a of animals) root.add(a);

  // lights
  const hemi = new THREE.HemisphereLight('#dfefff', '#6b5a3a', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff2d8', 2.6);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
  scene.add(sun); scene.add(sun.target);
  const lamp = new THREE.PointLight('#ffc070', 0, 18, 1.6); lamp.position.set(L.S.house.x + 1, 2.6, L.S.house.z + 3.2); scene.add(lamp);
  const air = L.air ?? { fog: '#dfe9ee', near: 70, far: 300 }, airC = C(air.fog);
  scene.fog = new THREE.Fog(air.fog, air.near, air.far);
  // smoke: soft puffs that rise, drift with the wind and fade; small ones are a home's cooking fire
  const puffTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const smoke = (L.smoke ?? []).map(([x, y, z, size]) => {
    const base = new THREE.Vector3(x, L.ground(x, z) + y, z), hearth = size < 1, puffs = [];
    for (let k = 0; k < (hearth ? 7 : 10); k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: hearth ? '#d9d4cc' : size > 2 ? '#8f877c' : '#b5aea4', transparent: true, depthWrite: false, opacity: 0, fog: true }));
      sp.renderOrder = 3; scene.add(sp); puffs.push(sp);
    }
    return { base, size, hearth, puffs };
  });

  // weather
  const RAIN = 1800;
  const rainGeo = new THREE.BufferGeometry(); const rp = new Float32Array(RAIN * 6); rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#c8d8ea', transparent: true, opacity: 0.55 }));
  rain.frustumCulled = false; rain.visible = false; scene.add(rain);
  const drops = Array.from({ length: RAIN }, () => [Math.random() * 70 - 35, Math.random() * 30, Math.random() * 70 - 35]);
  const hailGeo = new THREE.BufferGeometry(); const hp = new Float32Array(500 * 3); hailGeo.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  const hail = new THREE.Points(hailGeo, new THREE.PointsMaterial({ color: '#f4f8fb', size: 0.16 })); hail.frustumCulled = false; hail.visible = false; scene.add(hail);
  const stones = Array.from({ length: 500 }, () => [Math.random() * 50 - 25, Math.random() * 25, Math.random() * 50 - 25]);
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(300 * 3).map(() => Math.random() * 40 - 20), 3)), new THREE.PointsMaterial({ color: '#ffe0a0', size: 0.08, transparent: true, opacity: 0.6 }));
  motes.frustumCulled = false; motes.visible = false; scene.add(motes);
  const flood = new THREE.Mesh(new THREE.PlaneGeometry(90, 70).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a7a58', roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 }));
  flood.position.set(0, -1, -4); flood.visible = false; scene.add(flood);

  // the storm's safe circle: a glowing wall of light, like a closing zone, and a ring on the ground
  const zoneMat = new THREE.MeshBasicMaterial({ color: '#7fd0ff', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const zone = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 14, 48, 1, true), zoneMat); zone.visible = false; scene.add(zone);
  const zoneRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b8ecff', transparent: true, opacity: 0.85, depthWrite: false })); zoneRing.visible = false; scene.add(zoneRing);
  // the quest marker: a turning golden diamond over a beam of light
  const marker = new THREE.Group();
  const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#ffb000', emissiveIntensity: 0.9, roughness: 0.3 }));
  dia.scale.y = 1.5; marker.add(dia);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 8, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe48a', transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = -4.5; marker.add(beam); marker.visible = false; scene.add(marker);

  const cTop = new THREE.Color(), cMid = new THREE.Color(), cLow = new THREE.Color(), cSun = new THREE.Color();
  const tint = SKYTINT[L.sky] ?? SKYTINT.clear;
  let flash = 0;
  return {
    sky: skyM,
    flash() { flash = 0.35; },
    marker(pos) { marker.visible = !!pos; if (pos) marker.position.set(pos[0], L.ground(pos[0], pos[1]) + 4.6, pos[1]); },
    update(t, dt, phase, ev, camPos, focus) {
      // the sun across the sky; colours blend between the keyframes
      let i = 0; while (DAYCOL[i + 1][0] < phase) i++;
      const A = DAYCOL[i], B = DAYCOL[i + 1], f = (phase - A[0]) / (B[0] - A[0]);
      cTop.set(A[1]).lerp(C(B[1]), f); cMid.set(A[2]).lerp(C(B[2]), f); cLow.set(A[3]).lerp(C(B[3]), f); cSun.set(A[4]).lerp(C(B[4]), f);
      let sunI = A[5] + (B[5] - A[5]) * f, hemiI = A[6] + (B[6] - A[6]) * f;
      if (tint[0]) { cMid.lerp(C(tint[0]), tint[1]); cLow.lerp(C(tint[0]), tint[1]); }
      const storm = ev.storm > 0 ? 1 : ev.zone ? Math.min(1, 1 - ev.zone.left / ev.zone.total) * 0.7 : ev.shower > 0 ? 0.4 : 0;
      const heat = ev.heat > 0 ? 1 : 0;
      if (heat) { cMid.lerp(C('#f2c88a'), 0.45); cLow.lerp(C('#f0c890'), 0.45); cSun.lerp(C('#ffb060'), 0.4); sunI *= 1.15; }
      if (storm) { const s = C('#4a5566'); cTop.lerp(C('#2e3846'), storm * 0.85); cMid.lerp(s, storm * 0.8); cLow.lerp(s, storm * 0.8); sunI *= 1 - storm * 0.75; hemiI *= 1 - storm * 0.35; }
      flash = Math.max(0, flash - dt); if (flash > 0) { hemiI += flash * 6; cTop.lerp(C('#ffffff'), flash); }
      const day = phase < 0.75;
      const wet0 = ev.storm > 0, wind0 = wet0 ? 2.4 : ev.zone ? 1.5 : 0.8;
      nature.update(t, dt, wind0, cMid, storm, day, focus);

      // Dynamic wet ground sheen during rain, showers and rising water
      const wetSheen = ev.storm > 0 ? 0.85 : ev.shower > 0 ? 0.5 : ev.flood > 0.05 ? 0.65 : 0;
      groundMesh.material.roughness = THREE.MathUtils.lerp(groundMesh.material.roughness, 1.0 - wetSheen * 0.72, Math.min(1, dt * 4));
      groundMesh.material.metalness = THREE.MathUtils.lerp(groundMesh.material.metalness, wetSheen * 0.35, Math.min(1, dt * 4));
      const ang = day ? (phase / 0.75) * Math.PI : ((phase - 0.75) / 0.25) * Math.PI;
      const dir = new THREE.Vector3(Math.cos(ang) * 0.8, Math.max(0.12, Math.sin(ang)), -0.45).normalize();
      skyM.material.uniforms.top.value.copy(cTop); skyM.material.uniforms.mid.value.copy(cMid); skyM.material.uniforms.low.value.copy(cLow);
      skyM.material.uniforms.sun.value.copy(dir); skyM.material.uniforms.glow.value.copy(day ? C('#fff1c4') : C('#c8d6ff')).multiplyScalar(day ? 1 - storm : 0.5);
      skyM.material.uniforms.stars.value = day ? 0 : 1 - storm;
      skyM.position.copy(camPos);
      sun.color.copy(cSun); sun.intensity = sunI; hemi.intensity = hemiI; hemi.color.copy(cMid).lerp(C('#ffffff'), 0.3);
      sun.position.set(focus.x + dir.x * 60, focus.y + dir.y * 60, focus.z + dir.z * 60); sun.target.position.copy(focus);
      // the place's own air: its haze or fog colours the horizon and closes in the distance
      scene.fog.color.copy(cMid).lerp(airC, day ? 0.6 : 0.12); const fogStorm = storm && g.R.storm.kind === 'fog';
      const morning = phase < 0.16, evening = phase > 0.64 && phase < 0.82;
      scene.fog.near = fogStorm ? 4 : morning ? Math.min(18, air.near) : storm ? Math.min(25, air.near) : air.near;
      scene.fog.far = fogStorm ? 40 : morning ? Math.min(160, air.far) : storm ? Math.min(120, air.far) : air.far;
      for (const s of smoke) s.puffs.forEach((sp, k) => {
        const age = (t * (s.hearth ? 0.16 : 0.09) + k / s.puffs.length) % 1, h = s.hearth ? 4 : 14 * s.size;
        sp.position.set(s.base.x + age * age * h * 0.7 * wind0, s.base.y + age * h, s.base.z + Math.sin(k * 1.7 + t * 0.3) * 0.3 * s.size);
        sp.scale.setScalar(s.size * (1.2 + age * 3.2));
        sp.material.opacity = Math.sin(age * Math.PI) * (s.hearth ? (morning || evening ? 0.55 : 0.12) : 0.5) * (storm ? 0.3 : 1);
      });
      lamp.intensity = day ? 0 : 6;
      // rain or hail around the camera
      const wet = ev.storm > 0;
      rain.visible = (wet && g.R.storm.kind !== 'fog') || ev.shower > 0; // the storm's rain, or a passing shower
      if (rain.visible) {
        for (let k = 0; k < RAIN; k++) {
          const d = drops[k]; d[1] -= dt * 26; d[0] -= dt * 6; if (d[1] < -1) { d[1] = 30; d[0] = Math.random() * 70 - 35; d[2] = Math.random() * 70 - 35; }
          const x = camPos.x + d[0], y = d[1], z = camPos.z + d[2];
          rp.set([x, y, z, x + 0.25, y + 0.9, z], k * 6);
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      hail.visible = wet && g.R.storm.kind === 'hail';
      if (hail.visible) { for (let k = 0; k < 500; k++) { const s = stones[k]; s[1] -= dt * 18; if (s[1] < 0) s[1] = 25; hp.set([camPos.x + s[0], s[1], camPos.z + s[2]], k * 3); } hailGeo.attributes.position.needsUpdate = true; }
      motes.visible = heat > 0; if (heat) { motes.position.set(focus.x, 1 + Math.sin(t * 0.5) * 0.3, focus.z); motes.rotation.y = t * 0.05; }
      flood.visible = ev.flood > 0.01; flood.position.y = -0.35 + ev.flood * 0.75;
      // zone
      const z = ev.zone;
      zone.visible = zoneRing.visible = !!z;
      if (z) {
        const gy = L.ground(z.x, z.z);
        zone.position.set(z.x, gy + 5, z.z); zone.scale.set(z.r, 1, z.r); zoneMat.opacity = 0.16 + Math.sin(t * 3) * 0.06 + (z.left < 8 && z.left > 0 ? 0.12 : 0);
        zoneRing.position.set(z.x, gy + 0.15, z.z); zoneRing.scale.set(z.r, 1, z.r);
      }
      // the marker turns and bobs
      if (marker.visible) { dia.rotation.y = t * 2; dia.position.y = Math.sin(t * 3) * 0.25; }
      // water ripples, flags, flowing spouts, animals
      for (const w of water) {
        const a = w.geometry.attributes.position, b = w.userData.base;
        if (a.count > 2000) continue;
        for (let k = 0; k < a.count; k++) a.setY(k, b[k * 3 + 1] + Math.sin(t * 1.4 + b[k * 3] * 0.35 + b[k * 3 + 2] * 0.25) * 0.05 * (wet ? 3 : 1));
        a.needsUpdate = true;
      }
      const wind = wet0 ? 2.4 : 0.8;
      for (const f of waving) f.rotation.y = Math.sin(t * 3 * wind + f.position.x) * 0.25 * wind;
      for (const f of flowing) f.scale.y = 1 + Math.sin(t * 12 + f.position.x) * 0.08;
      for (const b of bobbing) b.o.position.y = b.y + Math.sin(t * 1.3 + b.ph) * 0.05;
      for (const a of animals) {
        const A = a.userData.animal; A.ph += dt;
        const dPlayer = focus ? Math.hypot(a.position.x - focus.x, a.position.z - focus.z) : 99;

        if (A.kind === 'duck') {
          // Smooth paddling with gentle wake rolling & periodic dabbling
          a.position.x = A.home[0] + Math.cos(A.ph * 0.25) * 1.6;
          a.position.z = A.home[1] + Math.sin(A.ph * 0.25) * 1.2;
          a.rotation.y = -A.ph * 0.25;
          const w = L.water.find((w2) => (w2.r ? Math.hypot(a.position.x - w2.cx, a.position.z - w2.cz) < w2.r : a.position.x > w2.x0 && a.position.x < w2.x1 && a.position.z > w2.z0 && a.position.z < w2.z1));
          a.position.y = w ? w.y + Math.sin(A.ph * 3) * 0.02 : L.ground(a.position.x, a.position.z);
          // Tail dabble dive underwater every ~12s
          const dabble = Math.sin(A.ph * 0.5);
          a.rotation.x = dabble > 0.85 ? 0.42 : 0;
          continue;
        }

        if (A.kind === 'grazer' && A.head && A.tail) {
          // Grazing head cycle + cud chewing + curious gaze toward player + ear twitches
          const grazeX = 0.05 + Math.max(0, Math.sin(A.ph * 0.5)) * 1.05 + Math.sin(A.ph * 3.1) * 0.03;
          A.head.rotation.x = grazeX;
          // Chewing cud: lateral jaw motion
          A.head.rotation.z = Math.sin(A.ph * 6.5) * 0.04;
          // Curious gaze towards player if close
          if (dPlayer < 4.5 && focus) {
            const dxP = focus.x - a.position.x, dzP = focus.z - a.position.z;
            const wantH = Math.atan2(dxP, dzP) - a.rotation.y;
            const normH = Math.atan2(Math.sin(wantH), Math.cos(wantH));
            if (Math.abs(normH) < 1.4) {
              A.head.rotation.y = THREE.MathUtils.lerp(A.head.rotation.y, normH * 0.65, Math.min(1, dt * 4));
            } else {
              A.head.rotation.y = Math.sin(A.ph * 0.35) * 0.18;
            }
          } else {
            A.head.rotation.y = Math.sin(A.ph * 0.35) * 0.18;
          }
          // Organic tail swishing
          A.tail.rotation.z = Math.sin(A.ph * 2.2) > 0.3 ? Math.sin(A.ph * 8.5) * 0.45 : Math.sin(A.ph * 1.5) * 0.08;
          continue;
        }

        // Chickens and wandering barnyard fowl
        A.scamper = Math.max(0, (A.scamper ?? 0) - dt);
        if (dPlayer < 2.4 && (A.scamper ?? 0) <= 0) {
          A.scamper = 1.6;
          // Pick escape destination directly away from player
          const awayX = a.position.x - focus.x, awayZ = a.position.z - focus.z;
          const awayLen = Math.hypot(awayX, awayZ) || 1;
          A.to = [a.position.x + (awayX / awayLen) * 3.5, a.position.z + (awayZ / awayLen) * 3.5];
        }

        const isScampering = A.scamper > 0;
        if (!A.to || Math.hypot(a.position.x - A.to[0], a.position.z - A.to[1]) < 0.25) {
          A.to = [A.home[0] + (Math.random() - 0.5) * 7, A.home[1] + (Math.random() - 0.5) * 5];
          A.peckWait = 1.0 + Math.random() * 2.0;
        }

        A.peckWait = Math.max(0, (A.peckWait ?? 0) - dt);
        if (A.peckWait > 0 && !isScampering) {
          // Pecking the ground for seeds: rapid double-peck
          const peckCycle = Math.sin(A.ph * 12);
          a.rotation.x = Math.max(0, peckCycle) * 0.35;
        } else {
          a.rotation.x = 0;
          const dx = A.to[0] - a.position.x, dz = A.to[1] - a.position.z, d = Math.hypot(dx, dz) || 1;
          const speed = isScampering ? 2.4 : 0.85;
          a.position.x += (dx / d) * dt * speed;
          a.position.z += (dz / d) * dt * speed;
          a.rotation.y = Math.atan2(dx, dz);
          // Rhythmic head bobbing while walking / scampering
          a.position.y = L.ground(a.position.x, a.position.z) + Math.abs(Math.sin(A.ph * (isScampering ? 16 : 8))) * (isScampering ? 0.08 : 0.03);
        }
      }
      return { wind };
    },
  };
}
