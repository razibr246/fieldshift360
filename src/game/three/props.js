// Low-poly builders for everything that stands in the five worlds: houses in each local style, the seed shop and the
// FieldShift kiosk, water sources, markets, shelters, trees, animals and landmarks. Each builder returns a Group whose
// origin is on the ground at the object's centre, facing +z. Things that move (flags, animals, flowing water) are
// tagged in userData so world.js can animate them; everything else is merged into a few big meshes after building.
import * as THREE from 'three';
import { mat, canvasTex } from './people';

const M = (c, o = {}) => mat(c, { flat: true, ...o });
function put(p, g, c, pos = [0, 0, 0], rot = [0, 0, 0], scale) {
  const m = new THREE.Mesh(g, typeof c === 'string' ? M(c) : c);
  m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
}
const box = (p, w, h, d, c, pos, rot) => put(p, new THREE.BoxGeometry(w, h, d), c, pos, rot);
const cyl = (p, rt, rb, h, c, pos, rot, seg = 8) => put(p, new THREE.CylinderGeometry(rt, rb, h, seg), c, pos, rot);
const cone = (p, r, h, c, pos, rot, seg = 8) => put(p, new THREE.ConeGeometry(r, h, seg), c, pos, rot);
const blob = (p, r, c, pos, scale, detail = 1) => put(p, new THREE.IcosahedronGeometry(r, detail), c, pos, [0, 0, 0], scale);
const half = (p, r, c, pos, scale) => put(p, new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c, pos, [0, 0, 0], scale);
// a gable roof along x: length, width, height, with its eaves at y
function gable(p, len, wid, h, c, y, pos = [0, 0]) {
  const g = new THREE.CylinderGeometry(1, 1, len, 3, 1, false, Math.PI / 2); g.rotateZ(Math.PI / 2);
  return put(p, g, c, [pos[0], y + h / 3, pos[1]], [0, 0, 0], [1, h / 1.5, wid / 1.732]);
}
const pyramid = (p, w, h, c, y, seg = 4) => put(p, new THREE.ConeGeometry(w * 0.72, h, seg), c, [0, y + h / 2, 0], [0, Math.PI / 4, 0]);
const G = () => new THREE.Group();
const door = (p, w, h, x, z, c = '#4a3020', y = 0) => box(p, w, h, 0.06, c, [x, y + h / 2, z]);
const win = (p, w, h, x, y, z, c = '#2a2420', frame = '#e9e2d0') => { box(p, w + 0.12, h + 0.12, 0.05, frame, [x, y, z]); box(p, w, h, 0.07, c, [x, y, z + 0.01]); };

// ---- patterns ----
const brickTex = () => canvasTex('brick', 64, 64, (c, w, h) => {
  c.fillStyle = '#a9502f'; c.fillRect(0, 0, w, h); c.fillStyle = '#c96a45';
  for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < w; x += 16) c.fillRect(x + 1, y + 1, 14, 6);
}, [3, 2]);
const tharuTex = () => canvasTex('tharu', 128, 64, (c, w, h) => {
  c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h); c.fillStyle = '#9e5a34'; c.fillRect(0, h - 14, w, 14);
  c.fillStyle = '#b8322a'; for (let x = 0; x < w; x += 16) { c.beginPath(); c.moveTo(x, h - 14); c.lineTo(x + 8, h - 24); c.lineTo(x + 16, h - 14); c.fill(); }
  c.fillStyle = '#1e1a18'; for (let x = 4; x < w; x += 16) { c.fillRect(x, 10, 2, 14); c.fillRect(x - 4, 16, 10, 2); }
  c.fillStyle = '#ffffff'; for (let x = 10; x < w; x += 16) { c.beginPath(); c.arc(x, 30, 2.5, 0, Math.PI * 2); c.fill(); }
}, [2, 1]);
const wovenTex = () => canvasTex('woven', 64, 64, (c, w, h) => {
  c.fillStyle = '#c9a66b'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8834c';
  for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) if (((x + y) / 8) % 2) c.fillRect(x, y, 8, 4); else c.fillRect(x, y + 4, 8, 4);
}, [3, 2]);
const truckTex = () => canvasTex('truckart', 128, 64, (c, w, h) => {
  const cols = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#264653', '#ff66c4', '#3a86ff'];
  c.fillStyle = '#f1faee'; c.fillRect(0, 0, w, h);
  for (let k = 0; k < 7; k++) { c.fillStyle = cols[k]; c.fillRect(0, k * 9, w, 5); }
  for (let x = 8; x < w; x += 22) { c.fillStyle = cols[(x / 22) % 7 | 0]; c.beginPath(); c.arc(x, 32, 8, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, 32, 3, 0, Math.PI * 2); c.fill(); }
});
const leafTex = () => canvasTex('fsleaf', 64, 64, (c, w, h) => {
  c.fillStyle = '#123d24'; c.fillRect(0, 0, w, h);
  c.save(); c.translate(32, 30); c.rotate(-0.6); c.fillStyle = '#7fd36b'; c.beginPath(); c.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#123d24'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, 0); c.stroke(); c.restore();
  c.fillStyle = '#e9f5e3'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('FieldShift', 32, 56);
});

// ---- houses ----
function brickhouse() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 6.6, 3.1, 5, bm, [0, 1.55, 0]); box(g, 4.2, 2.6, 4, '#efe6d6', [-1.1, 4.4, -0.3]);
  box(g, 6.9, 0.18, 5.3, '#d9cfbd', [0, 3.15, 0]); box(g, 4.4, 0.16, 4.2, '#d9cfbd', [-1.1, 5.75, -0.3]);
  for (const [x, z, w, d] of [[0, 2.6, 6.9, 0.12], [0, -2.6, 6.9, 0.12], [3.4, 0, 0.12, 5.3]]) box(g, w, 0.5, d, '#e8dfcf', [x, 3.5, z]);
  cyl(g, 0.55, 0.55, 1, '#1a1a1a', [-2.4, 6.35, -1.2], [0, 0, 0], 12); // the black roof water tank
  door(g, 1.2, 2.2, 1.4, 2.51, '#2f5f8f'); win(g, 1, 0.9, -1.4, 1.7, 2.52, '#283844', '#efe6d6'); win(g, 0.9, 0.8, -1.1, 4.4, 1.72, '#283844');
  box(g, 1, 0.2, 2.6, '#cfc5b3', [3.9, 1.6, -0.6], [0.9, 0, 0]);
  return g;
}
function mudhouse() {
  const g = G();
  box(g, 6.2, 2.7, 4.6, '#c4a370', [0, 1.35, 0]);
  box(g, 6.5, 0.16, 4.9, '#9c7a4c', [0, 2.75, 0]); for (const z of [2.4, -2.4]) box(g, 6.5, 0.35, 0.14, '#b8955f', [0, 3, z]);
  box(g, 0.9, 1.2, 0.9, '#b8955f', [1.8, 3.4, -1], [0, 0.3, 0]); box(g, 0.7, 0.5, 0.06, '#3a2a1e', [1.86, 3.6, -0.55], [0, 0.3, 0]); // a mangh (wind catcher)
  door(g, 1.1, 2, 0.8, 2.31, '#6b4a2b'); win(g, 0.6, 0.6, -1.6, 1.7, 2.31, '#2a2420', '#8a6a42');
  // a reed shade in front, on posts
  for (const x of [-2.6, 0, 2.6]) cyl(g, 0.06, 0.06, 2.3, '#7a5a38', [x, 1.15, 4]);
  box(g, 6, 0.12, 2.1, '#c9b07a', [0, 2.3, 3.2], [0.08, 0, 0]);
  return g;
}
function tharuhouse() {
  const g = G(); const tm = M('#fff', { map: tharuTex() });
  box(g, 0.3 + 7.6, 0.3, 4.6, '#8e6a48', [0, 0.15, 0]);
  box(g, 7.6, 2.2, 4.2, tm, [0, 1.4, 0]);
  gable(g, 8.8, 6, 2.4, '#b89a5a', 2.45);
  door(g, 1, 1.9, -1.2, 2.11, '#5a3a22', 0.3); door(g, 1, 1.9, 2, 2.11, '#5a3a22', 0.3);
  for (const x of [-3.5, 0, 3.5]) cyl(g, 0.07, 0.07, 2.2, '#6b4a2b', [x, 1.4, 2.9]);
  return g;
}
function bhutanhouse() {
  const g = G();
  box(g, 6.4, 2.8, 5.2, '#f2ede2', [0, 1.4, 0]);
  box(g, 6.6, 2.2, 5.4, '#f2ede2', [0, 3.9, 0]);
  box(g, 6.7, 0.35, 5.5, '#7a3b22', [0, 2.95, 0]); box(g, 6.8, 0.3, 5.6, '#7a3b22', [0, 5.05, 0]);
  // the rabsel: a projecting painted wooden window bay
  box(g, 3, 1.5, 0.5, '#8a3f22', [0, 3.95, 2.85]); for (let k = -1; k <= 1; k++) win(g, 0.7, 0.9, k * 0.95, 3.95, 3.12, '#2b1d16', '#d8a33a');
  win(g, 0.7, 0.8, -2.2, 1.6, 2.62, '#2b1d16', '#7a3b22'); win(g, 0.7, 0.8, 2.2, 1.6, 2.62, '#2b1d16', '#7a3b22');
  door(g, 1.1, 2, 0.3, 2.62, '#7a3b22');
  for (const [x, z] of [[-3, -2.4], [3, -2.4], [-3, 2.4], [3, 2.4]]) cyl(g, 0.08, 0.08, 0.8, '#6b3a22', [x, 5.6, z]);
  gable(g, 7.6, 6.6, 1.2, '#7d838a', 6);
  // red chillies drying on the roof
  for (let k = 0; k < 40; k++) blob(g, 0.07, '#c92a1e', [-2.6 + (k % 10) * 0.55, 6.62 + Math.floor(k / 10) * 0.02, -1.6 + Math.floor(k / 10) * 0.32], [1.6, 0.6, 0.6], 0);
  return g;
}
function stilthouse() {
  const g = G(); const wm = M('#fff', { map: wovenTex() });
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) cyl(g, 0.1, 0.1, 1.5, '#6b4a2b', [x, 0.75, z]);
  box(g, 6, 0.2, 4.6, '#7a5a38', [0, 1.5, 0]);
  box(g, 5.6, 2, 4, wm, [0, 2.6, 0]);
  gable(g, 7, 5.6, 2.6, '#b8995a', 3.55);
  door(g, 1, 1.7, 0.8, 2.01, '#5a3a22', 1.6);
  for (let k = 0; k < 5; k++) box(g, 1, 0.06, 0.25, '#6b4a2b', [0.8, 0.3 * k + 0.1, 3 - k * 0.22]);
  return g;
}

// ---- the seed shop and the FieldShift kiosk ----
function shed(p) {
  const g = G();
  const wall = { brick: M('#fff', { map: brickTex() }), mud: '#c4a370', thatch: '#d9c79c', bhutan: '#f2ede2' }[p.style] ?? '#d9c79c';
  box(g, 4.4, 2.6, 0.2, wall, [0, 1.3, -2.5]); box(g, 0.2, 2.6, 5, wall, [-2.1, 1.3, 0]); box(g, 0.2, 2.6, 5, wall, [2.1, 1.3, 0]);
  if (p.style === 'thatch') gable(g, 5.4, 5.6, 1.6, '#b89a5a', 2.6); else box(g, 4.9, 0.12, 5.6, p.style === 'bhutan' ? '#7d838a' : '#8c9aa4', [0, 2.7, 0.1], [-0.1, 0, 0]);
  for (let k = 0; k < 6; k++) cyl(g, 0.32, 0.36, 0.8, k % 2 ? '#e2d3a8' : '#cdb985', [-1.4 + (k % 3) * 0.75, 0.4 + Math.floor(k / 3) * 0.75, -1.8 + (k % 2) * 0.2]);
  box(g, 3.2, 0.9, 0.9, '#7a5a38', [0, 0.45, 1.4]);
  for (let k = 0; k < 4; k++) blob(g, 0.25, ['#e5b416', '#c9952a', '#5a9a3c', '#e0452c'][k], [-1.1 + k * 0.72, 1.05, 1.4], [1, 0.6, 1], 0);
  const sign = box(g, 2.6, 0.7, 0.08, M('#fff', { map: leafTex() }), [0, 3.1, 2.5]);
  sign.material = M('#fff', { map: leafTex() });
  return g;
}
function kiosk() {
  const g = G();
  box(g, 3, 2.6, 2.6, '#efe8d8', [0, 1.3, 0]); box(g, 3.3, 0.2, 2.9, '#2f6b3d', [0, 2.7, 0]);
  door(g, 0.9, 2, -0.7, 1.31, '#2f6b3d');
  const s = box(g, 1.2, 0.9, 0.06, M('#fff', { map: leafTex() }), [0.7, 1.6, 1.32]); s.material = new THREE.MeshStandardMaterial({ map: leafTex(), emissive: '#ffffff', emissiveMap: leafTex(), emissiveIntensity: 0.6 });
  box(g, 0.08, 1.5, 0.08, '#555', [1.6, 3.4, 0.9]); box(g, 0.5, 0.8, 0.05, '#2b6cb0', [1.6, 3.9, 0.9]); // the dish
  return g;
}

// ---- water sources ----
function pumphouse() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 2.6, 2.3, 2.6, bm, [0, 1.15, 0]); box(g, 2.9, 0.16, 2.9, '#cfc5b3', [0, 2.35, 0]); door(g, 0.8, 1.7, -0.6, 1.31, '#2f5f8f');
  cyl(g, 0.16, 0.16, 1, '#5f6a70', [0.5, 0.9, 1.6], [Math.PI / 2, 0, 0]);
  box(g, 1.6, 0.5, 1.4, '#bdb3a2', [0.5, 0.25, 2.6]);
  const jet = box(g, 0.3, 0.6, 0.5, new THREE.MeshStandardMaterial({ color: '#bfe6f6', transparent: true, opacity: 0.75, roughness: 0.1 }), [0.5, 0.6, 2.2]);
  jet.userData.flow = true; jet.castShadow = false;
  return g;
}
function channel(p) {
  const g = G();
  box(g, 0.7, 0.25, p.len, '#c2b8a6', [0, 0.12, 0]);
  const w = box(g, 0.45, 0.06, p.len, new THREE.MeshStandardMaterial({ color: '#7fb9cc', roughness: 0.1 }), [0, 0.24, 0]); w.castShadow = false;
  return g;
}
function mogha() {
  const g = G();
  box(g, 2.4, 1, 0.5, '#bdb3a2', [0, 0.3, 0]); cyl(g, 0.2, 0.2, 1.4, '#6f7a80', [0, 0.25, 0.9], [Math.PI / 2, 0, 0], 10);
  box(g, 1, 0.3, 3, '#a89272', [0, -0.05, 2.4]);
  return g;
}
function stw() {
  const g = G();
  box(g, 1.8, 0.2, 1.4, '#bdb3a2', [0, 0.1, 0]); box(g, 1, 0.7, 0.6, '#c62a2a', [0, 0.55, 0]);
  cyl(g, 0.25, 0.25, 0.12, '#333', [0.55, 0.6, 0], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.08, 0.08, 1.8, '#3a8bd1', [0, 0.4, 1.2], [Math.PI / 2, 0, 0]);
  box(g, 1.4, 0.3, 1.2, '#a89272', [0, 0.05, 2.4]);
  return g;
}
function stream() {
  const g = G();
  for (let k = 0; k < 8; k++) blob(g, 0.35, '#8b8f8c', [-0.6 + (k % 2) * 1.2, 0.15, -1.6 + Math.floor(k / 2) * 0.9], [1, 0.6, 1], 0);
  cyl(g, 0.07, 0.07, 1.5, '#9c8a4a', [0, 0.8, 0.4], [1.2, 0, 0]);
  const w = box(g, 0.5, 0.08, 4, new THREE.MeshStandardMaterial({ color: '#8fd3e6', roughness: 0.1, transparent: true, opacity: 0.85 }), [0, 0.18, -0.5]); w.castShadow = false; w.userData.flow = true;
  return g;
}

// ---- markets ----
function tractor(p) {
  const g = G();
  const body = p?.red ? '#c62a2a' : '#2f5fa8';
  box(g, 1.4, 1, 2.6, body, [0, 1.1, 0]); box(g, 1.2, 0.6, 1.2, body, [0, 1.7, 0.6]);
  cyl(g, 0.05, 0.05, 1, '#333', [0.4, 2.1, 1]);
  box(g, 1.3, 1, 1, '#2a2a2a', [0, 2.1, -0.6]); box(g, 1.5, 0.1, 1.3, body, [0, 2.65, -0.5]);
  for (const s of [-1, 1]) { cyl(g, 0.8, 0.8, 0.45, '#1c1c1c', [s * 0.85, 0.8, -0.8], [0, 0, Math.PI / 2], 14); cyl(g, 0.45, 0.45, 0.3, '#1c1c1c', [s * 0.75, 0.45, 1.1], [0, 0, Math.PI / 2], 12); }
  return g;
}
function trolley() {
  const g = G();
  const t = tractor({}); t.position.z = 3.2; g.add(t);
  box(g, 2.2, 0.15, 3.6, '#8a5a2b', [0, 0.95, -0.9]); for (const s of [-1, 1]) box(g, 0.1, 0.8, 3.6, '#c62a2a', [s * 1.1, 1.4, -0.9]);
  for (const s of [-1, 1]) cyl(g, 0.5, 0.5, 0.35, '#1c1c1c', [s * 1.25, 0.5, -0.9], [0, 0, Math.PI / 2], 12);
  for (let k = 0; k < 6; k++) cyl(g, 0.32, 0.36, 0.8, '#e2d3a8', [-0.5 + (k % 2) * 1, 1.45, -2.2 + Math.floor(k / 2) * 0.9], [Math.PI / 2, 0, 0]);
  return g;
}
function donkeycart() {
  const g = G();
  box(g, 1.8, 0.12, 2.4, '#8a6a42', [0, 0.85, -0.5]); for (const s of [-1, 1]) cyl(g, 0.55, 0.55, 0.1, '#5a3a22', [s * 1, 0.55, -0.5], [0, 0, Math.PI / 2], 12);
  for (const s of [-1, 1]) box(g, 0.08, 0.08, 2.4, '#6b4a2b', [s * 0.45, 0.9, 1.5]);
  const d = animal('donkey'); d.position.set(0, 0, 1.9); g.add(d);
  for (let k = 0; k < 4; k++) cyl(g, 0.3, 0.33, 0.7, '#e2d3a8', [-0.4 + (k % 2) * 0.8, 1.2, -1 + Math.floor(k / 2) * 0.9], [Math.PI / 2, 0, 0]);
  return g;
}
function oxcart() {
  const g = G();
  box(g, 1.7, 0.12, 2.8, '#8a6a42', [0, 1.05, -0.6]);
  for (const s of [-1, 1]) { const w = cyl(g, 0.85, 0.85, 0.12, '#6b4a2b', [s * 1, 0.85, -0.6], [0, 0, Math.PI / 2], 14); w.userData.wheel = true; }
  const hood = new THREE.CylinderGeometry(0.9, 0.9, 2, 12, 1, true, -Math.PI / 2, Math.PI); hood.rotateX(Math.PI / 2); hood.rotateZ(0);
  put(g, hood, M('#c9a66b', { side: THREE.DoubleSide }), [0, 1.15, -0.8], [0, 0, 0]);
  box(g, 0.1, 0.1, 2.6, '#6b4a2b', [0, 1.1, 1.6]);
  for (const s of [-1, 1]) { const o = animal('ox'); o.position.set(s * 0.6, 0, 2.6); g.add(o); }
  return g;
}
function stall(p) {
  const g = G();
  for (const [x, z] of [[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]]) cyl(g, 0.06, 0.06, 2.4, '#9c8a4a', [x, 1.2, z]);
  box(g, 3.6, 0.1, 2.8, '#8c9aa4', [0, 2.45, 0], [0.08, 0, 0]);
  box(g, 3, 0.8, 1.2, '#7a5a38', [0, 0.4, 0.3]);
  for (let k = 0; k < 6; k++) { box(g, 0.8, 0.35, 0.6, '#a8834c', [-1.05 + (k % 3) * 1.05, 0.98, 0.0 + Math.floor(k / 3) * 0.62]); for (let j = 0; j < 3; j++) blob(g, 0.13, p.crates ?? '#d6402e', [-1.25 + (k % 3) * 1.05 + j * 0.2, 1.2, Math.floor(k / 3) * 0.62], [1, 1, 1], 0); }
  return g;
}

// ---- shelters and landmarks ----
function gurdwara() {
  const g = G();
  box(g, 8.4, 0.4, 6.4, '#e9e4da', [0, 0.2, 0]); box(g, 7.6, 3.6, 5.6, '#f7f4ee', [0, 2.2, 0]);
  box(g, 7.9, 0.3, 5.9, '#e2d6b6', [0, 4.1, 0]);
  half(g, 1.6, '#f7f4ee', [0, 4.2, 0], [1, 1.2, 1]); cone(g, 0.18, 0.9, '#e2b84a', [0, 6.5, 0]);
  for (const [x, z] of [[-3.4, -2.4], [3.4, -2.4], [-3.4, 2.4], [3.4, 2.4]]) { for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) cyl(g, 0.05, 0.05, 0.8, '#f7f4ee', [x + dx, 4.65, z + dz]); half(g, 0.55, '#f7f4ee', [x, 5.05, z]); }
  for (let k = -1; k <= 1; k++) { box(g, 1.1, 2, 0.08, '#c9a24a', [k * 2.2, 1.4, 2.82]); half(g, 0.55, '#c9a24a', [k * 2.2, 2.4, 2.82], [1, 0.8, 0.1]); }
  // the Nishan Sahib: a tall pole with the saffron flag
  cyl(g, 0.08, 0.1, 9, '#e98a1c', [5.6, 4.5, 3]); cone(g, 0.2, 0.6, '#c9ced3', [5.6, 9.3, 3]);
  const f = box(g, 1.8, 1, 0.03, '#f08a12', [6.5, 8.3, 3]); f.userData.wave = true;
  return g;
}
function dhaba() {
  const g = G();
  for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.2], [1.5, 1.2]]) cyl(g, 0.06, 0.06, 2.3, '#7a5a38', [x, 1.15, z]);
  box(g, 3.6, 0.1, 3, '#8c9aa4', [0, 2.35, 0]); box(g, 2.4, 0.9, 0.8, '#7a5a38', [0, 0.45, -0.7]);
  cyl(g, 0.2, 0.25, 0.4, '#5f6a70', [0.6, 1.1, -0.7]); const c = charpai(); c.position.set(0, 0, 2.2); g.add(c);
  return g;
}
function truck() {
  const g = G(); const art = M('#fff', { map: truckTex() });
  box(g, 2.3, 0.4, 7, '#2a2a2a', [0, 0.9, 0]);
  box(g, 2.3, 1.7, 1.8, art, [0, 1.95, 2.6]); box(g, 2.2, 0.8, 0.06, '#9cc9e8', [0, 2.3, 3.52]);
  box(g, 2.5, 1, 0.5, art, [0, 3.2, 2.9], [-0.25, 0, 0]); // the carved crown over the cab
  box(g, 2.4, 2, 4.6, art, [0, 2.1, -1.1]);
  for (const z of [2.4, -1.4, -2.8]) for (const s of [-1, 1]) cyl(g, 0.5, 0.5, 0.35, '#1c1c1c', [s * 1.05, 0.5, z], [0, 0, Math.PI / 2], 12);
  return g;
}
function wardoffice() {
  const g = G();
  box(g, 10.4, 0.4, 4.4, '#cfc5b3', [0, 0.2, 0]); box(g, 10, 3, 3.6, '#efe6d0', [0, 1.9, -0.2]);
  box(g, 10.6, 0.25, 4.6, '#3a6fa8', [0, 3.5, 0]);
  for (let k = -2; k <= 2; k++) { cyl(g, 0.14, 0.14, 3, '#f5f0e6', [k * 2.3, 1.9, 1.9]); if (k) win(g, 0.9, 0.9, k * 2.3 - 1.1, 2, 1.62, '#2a3a4a', '#3a6fa8'); }
  door(g, 1.2, 2.2, 0, 1.62, '#3a6fa8', 0.4);
  // Nepal's flag: two stacked crimson pennants with a blue border
  cyl(g, 0.05, 0.05, 6, '#cfd4d8', [6, 3, 2.4]);
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(0, 1.4); fl.lineTo(1, 0.75); fl.lineTo(0.45, 0.75); fl.lineTo(1, 0); fl.closePath();
  const f = put(g, new THREE.ShapeGeometry(fl), M('#d0102a', { side: THREE.DoubleSide }), [6.05, 4.4, 2.4]); f.userData.wave = true;
  return g;
}
function lhakhang() {
  const g = G();
  box(g, 5.6, 0.5, 4.6, '#d9d2c2', [0, 0.25, 0]); box(g, 5, 3, 4, '#f4efe4', [0, 2, 0]);
  box(g, 5.1, 0.6, 4.1, '#8a2a20', [0, 3.3, 0]); // the red kemar band
  pyramid(g, 6, 1.4, '#d4a73a', 3.6); cone(g, 0.3, 1, '#e2b84a', [0, 5.4, 0]);
  door(g, 1.2, 2, 0, 2.01, '#8a2a20', 0.5);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(g, 0.04, 0.04, 5, '#d9d2c2', [Math.cos(a) * 4.4, 2.5, Math.sin(a) * 4.4]); const f = box(g, 0.4, 3.4, 0.02, ['#2b6cb0', '#f4efe4', '#c62a2a', '#2e8b57', '#e2b84a', '#f4efe4'][k], [Math.cos(a) * 4.4 + 0.22, 3.2, Math.sin(a) * 4.4]); f.userData.wave = true; }
  return g;
}
function kyaung() {
  const g = G();
  for (const x of [-2.6, 0, 2.6]) for (const z of [-2, 2]) cyl(g, 0.15, 0.15, 1.4, '#5a3a22', [x, 0.7, z]);
  box(g, 6.6, 0.3, 5, '#6b4a2b', [0, 1.5, 0]); box(g, 5.6, 2.2, 4, '#7a4a28', [0, 2.75, 0]);
  for (let k = 0; k < 3; k++) pyramid(g, 7 - k * 1.8, 1, '#4f3a2a', 3.85 + k * 1.05);
  cone(g, 0.2, 1.6, '#e2b84a', [0, 7.8, 0]);
  for (let k = 0; k < 6; k++) box(g, 1.4, 0.1, 0.3, '#6b4a2b', [0, 0.25 * k + 0.1, 3.8 - k * 0.25]);
  return g;
}
function chorten(p) {
  const g = G();
  box(g, 2.4, 0.6, 2.4, '#f4efe4', [0, 0.3, 0]); box(g, 1.9, 0.5, 1.9, '#f4efe4', [0, 0.85, 0]);
  half(g, 0.9, '#f4efe4', [0, 1.1, 0], [1, 1.1, 1]);
  box(g, 0.7, 0.4, 0.7, '#8a2a20', [0, 2.15, 0]); cone(g, 0.3, 1.2, '#e2b84a', [0, 2.95, 0], [0, 0, 0], 10);
  return g;
}
function zedi() {
  const g = G();
  for (let k = 0; k < 3; k++) box(g, 4.6 - k * 1.1, 0.6, 4.6 - k * 1.1, '#f5f1e8', [0, 0.3 + k * 0.6, 0]);
  put(g, new THREE.SphereGeometry(1.3, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), '#f5f1e8', [0, 1.8, 0], [0, 0, 0], [1, 1.25, 1]);
  cone(g, 0.6, 3.4, '#e2b84a', [0, 4.5, 0], [0, 0, 0], 12); blob(g, 0.15, '#f7e08a', [0, 6.3, 0], [1, 1, 1], 0);
  return g;
}
function waterpots() {
  const g = G();
  for (const x of [-0.8, 0.8]) cyl(g, 0.06, 0.06, 1.8, '#6b4a2b', [x, 0.9, 0]);
  box(g, 2, 0.08, 0.9, '#6b4a2b', [0, 0.8, 0]); gable(g, 2.2, 1.2, 0.5, '#9c7a4c', 1.8);
  for (let k = 0; k < 3; k++) blob(g, 0.26, '#a65731', [-0.55 + k * 0.55, 1.08, 0], [1, 1.1, 1], 1);
  return g;
}

// ---- small things ----
function kup(p) {
  const g = G();
  cyl(g, 1.3, 1.4, 1.2, '#d9b866', [0, 0.6, 0], [0, 0, 0], 12); half(g, 1.32, '#cfa957', [0, 1.2, 0], [1, 1.1, 1]); cone(g, 0.2, 0.5, '#a8833e', [0, 2.7, 0]);
  return g;
}
function charpai() {
  const g = G();
  const weave = canvasTex('weave', 32, 32, (c) => { c.fillStyle = '#d9c393'; c.fillRect(0, 0, 32, 32); c.strokeStyle = '#a8834c'; for (let k = 0; k < 32; k += 4) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k, 32); c.moveTo(0, k); c.lineTo(32, k); c.stroke(); } }, [3, 2]);
  box(g, 1.9, 0.1, 0.9, M('#fff', { map: weave }), [0, 0.5, 0]);
  for (const [x, z] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) cyl(g, 0.05, 0.05, 0.5, '#6b4a2b', [x, 0.25, z]);
  return g;
}
function pots() { const g = G(); for (let k = 0; k < 4; k++) blob(g, 0.28 - k * 0.03, '#a65731', [(k % 2) * 0.55, 0.28, Math.floor(k / 2) * 0.55], [1, 1.1, 1], 1); return g; }
function dehari() { const g = G(); cyl(g, 0.3, 0.34, 1.7, '#b07a4a', [0, 0.85, 0], [0, 0, 0], 10); cone(g, 0.36, 0.3, '#9a6a3f', [0, 1.85, 0]); return g; }
function machan() {
  const g = G();
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) cyl(g, 0.07, 0.07, 3.6, '#9c8a4a', [x, 1.8, z]);
  box(g, 2.2, 0.12, 2.2, '#8a6a42', [0, 2.6, 0]); pyramid(g, 2.8, 1, '#b89a5a', 3.6);
  for (let k = 0; k < 6; k++) box(g, 0.6, 0.05, 0.08, '#8a6a42', [0, 0.4 + k * 0.4, 1.1]);
  return g;
}
function pole() { const g = G(); cyl(g, 0.1, 0.13, 7, '#9a9a90', [0, 3.5, 0]); box(g, 1.6, 0.1, 0.1, '#7a7a70', [0, 6.6, 0]); return g; }
function lungdar() { const g = G(); cyl(g, 0.04, 0.05, 5.5, '#d9d2c2', [0, 2.75, 0]); const f = box(g, 0.45, 3.6, 0.02, '#f4efe4', [0.24, 3.4, 0]); f.userData.wave = true; return g; }
function flagline(p) {
  const g = G(); const n = 18, cols = ['#2b6cb0', '#f4efe4', '#c62a2a', '#2e8b57', '#e2b84a'];
  for (const x of [-p.len / 2, p.len / 2]) cyl(g, 0.05, 0.05, 3.6, '#7a5a38', [x, 1.8, 0]);
  for (let k = 0; k < n; k++) { const x = -p.len / 2 + (k + 0.5) * (p.len / n), y = 3.4 - Math.sin(((k + 0.5) / n) * Math.PI) * 0.5; const f = box(g, 0.32, 0.36, 0.01, cols[k % 5], [x, y - 0.2, 0]); f.userData.wave = true; f.castShadow = false; }
  return g;
}

// ---- trees ----
const trunk = (g, h, r, c = '#6b4a2b') => cyl(g, r * 0.7, r, h, c, [0, h / 2, 0], [0, 0, 0], 7);
function tree(type) {
  const g = G();
  if (type === 'mango' || type === 'sal' || type === 'tamarind') {
    const h = type === 'sal' ? 5.5 : type === 'tamarind' ? 2.6 : 2.2, col = type === 'sal' ? '#2f5d2a' : type === 'tamarind' ? '#5b7f3a' : '#2f6a2e';
    trunk(g, h, type === 'tamarind' ? 0.4 : 0.28, type === 'sal' ? '#5a4632' : '#6b4a2b');
    const R = type === 'tamarind' ? 3 : type === 'sal' ? 1.9 : 2.1;
    blob(g, R, col, [0, h + R * 0.6, 0], [1, type === 'tamarind' ? 0.55 : 0.8, 1]); blob(g, R * 0.7, col, [R * 0.6, h + R * 0.3, 0.3], [1, 0.75, 1]); blob(g, R * 0.65, col, [-R * 0.55, h + R * 0.4, -0.3], [1, 0.75, 1]);
  } else if (type === 'eucalyptus') {
    trunk(g, 9, 0.2, '#d9d2c2'); blob(g, 1.2, '#6f8f5a', [0, 8.5, 0], [0.8, 1.6, 0.8]); blob(g, 0.9, '#6f8f5a', [0.4, 6.8, 0.2], [0.8, 1.4, 0.8]);
  } else if (type === 'poplar') {
    trunk(g, 2, 0.14, '#9a9488'); blob(g, 0.9, '#7f9f4a', [0, 4.6, 0], [0.75, 3.2, 0.75]);
  } else if (type === 'kikar') {
    const t = trunk(g, 2.4, 0.16, '#5a4632'); t.rotation.z = 0.15;
    blob(g, 2.2, '#7d8a4a', [0.3, 2.9, 0], [1.3, 0.35, 1.2]); blob(g, 1.3, '#7d8a4a', [-1, 2.6, 0.6], [1.2, 0.35, 1.1]);
  } else if (type === 'bluepine') {
    trunk(g, 1.2, 0.18, '#4a3628'); for (let k = 0; k < 4; k++) cone(g, 1.7 - k * 0.35, 2.2, '#2a5a48', [0, 1.6 + k * 1.35, 0], [0, 0, 0], 8);
  } else if (type === 'banana') {
    trunk(g, 1.6, 0.16, '#6f8a3a'); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; box(g, 0.45, 0.04, 2, '#6aa13a', [Math.cos(a) * 0.8, 1.9, Math.sin(a) * 0.8], [0.5, -a + Math.PI / 2, 0]); }
  } else { // palms: date, toddy (palmyra)
    const toddy = type === 'toddy', h = toddy ? 10 : 6;
    cyl(g, 0.22, toddy ? 0.34 : 0.3, h, '#6b5340', [0, h / 2, 0], [0, 0, 0], 7);
    if (toddy) { blob(g, 0.6, '#3d3226', [0, h + 0.1, 0], [1, 0.8, 1], 0); for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, e = (k % 2) * 0.5; put(g, new THREE.CircleGeometry(1.1, 8, 0, Math.PI), M('#5c7d3a', { side: THREE.DoubleSide }), [Math.cos(a) * 0.9, h + 0.4 + e * 0.4, Math.sin(a) * 0.9], [-1.2 + e, -a + Math.PI / 2, 0]); } }
    else { for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; box(g, 0.35, 0.04, 2.6, '#5f7f38', [Math.cos(a) * 1.1, h - 0.1, Math.sin(a) * 1.1], [0.55, -a + Math.PI / 2, 0]); } for (let k = 0; k < 3; k++) blob(g, 0.3, '#c96f1e', [Math.cos(k * 2.1) * 0.4, h - 0.6, Math.sin(k * 2.1) * 0.4], [1, 1.3, 1], 0); }
  }
  return g;
}

// ---- animals ----
export function animal(type) {
  const g = G();
  const col = { buffalo: '#2a2624', cow: '#c9a27a', ox: '#e8e2d6', goat: '#7a5638', donkey: '#8c8680', chicken: '#f1ece2' }[type];
  if (type === 'chicken') {
    blob(g, 0.17, col, [0, 0.25, 0], [1, 0.9, 1.3], 0); blob(g, 0.09, col, [0, 0.42, 0.16], [1, 1, 1], 0);
    cone(g, 0.03, 0.08, '#e2a020', [0, 0.42, 0.27], [Math.PI / 2, 0, 0], 4); box(g, 0.03, 0.06, 0.08, '#d62a2a', [0, 0.52, 0.16]);
    g.userData.animal = { kind: 'chicken' }; return g;
  }
  const big = type === 'buffalo' ? 1.15 : type === 'goat' ? 0.55 : type === 'donkey' ? 0.75 : 1;
  const b = G(); b.scale.setScalar(big); g.add(b);
  box(b, 0.75, 0.75, 1.7, col, [0, 1.05, 0]);
  if (type === 'ox') blob(b, 0.3, col, [0, 1.5, 0.45], [1, 1, 1.2], 0); // the zebu hump
  for (const [x, z] of [[-0.25, 0.65], [0.25, 0.65], [-0.25, -0.65], [0.25, -0.65]]) box(b, 0.17, 0.75, 0.17, col, [x, 0.38, z]);
  const head = G(); head.position.set(0, 1.3, 0.95); b.add(head);
  box(head, 0.4, 0.4, 0.6, col, [0, 0, 0.2], [0.35, 0, 0]);
  if (type === 'donkey') { box(head, 0.08, 0.35, 0.06, col, [-0.12, 0.35, 0.05]); box(head, 0.08, 0.35, 0.06, col, [0.12, 0.35, 0.05]); }
  else if (type === 'buffalo') for (const s of [-1, 1]) put(head, new THREE.TorusGeometry(0.25, 0.05, 5, 10, Math.PI), M('#1a1716'), [s * 0.28, 0.15, 0], [0, s * 0.5, s * 0.5]);
  else for (const s of [-1, 1]) cone(head, 0.05, 0.3, '#d9d0bd', [s * 0.18, 0.3, 0], [0, 0, -s * 0.5], 5);
  const tail = G(); tail.position.set(0, 1.3, -0.85); b.add(tail); box(tail, 0.06, 0.7, 0.06, col, [0, -0.35, 0]);
  g.userData.animal = { kind: 'grazer', head, tail };
  return g;
}


// ---- Bangladesh ----
const tinTex = () => canvasTex('tin', 64, 32, (c, w, h) => { c.fillStyle = '#8f9ba3'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 4) { c.fillStyle = x % 8 ? '#a7b2b9' : '#7c8890'; c.fillRect(x, 0, 2, h); } c.fillStyle = 'rgba(150,80,40,.25)'; c.fillRect(0, h - 6, w, 6); }, [4, 2]);
function tinhouse(p) {
  const g = G(); const tm = M('#fff', { map: tinTex() });
  const plinth = p.plinth ?? 0.4;
  box(g, 7, plinth, 5.4, '#8a6a48', [0, plinth / 2, 0]);
  box(g, 6.4, 2.4, 4.8, p.mud ? '#b8956a' : tm, [0, plinth + 1.2, 0]);
  gable(g, 7.4, 6, 1.8, tm, plinth + 2.4);
  door(g, 1, 1.9, 0.6, 2.41, '#3e6fa8', plinth); win(g, 0.8, 0.7, -1.8, plinth + 1.4, 2.42, '#2a2420', '#3e6fa8');
  for (const x of [-3, 3]) cyl(g, 0.06, 0.06, 2.2, '#6b4a2b', [x, plinth + 1.1, 3.3]);
  box(g, 6.6, 0.06, 1.4, tm, [0, plinth + 2.25, 3.1], [0.18, 0, 0]);
  return g;
}
function thatchhouse(p) {
  const g = G(); const plinth = p.plinth ?? 0.7;
  box(g, 7, plinth, 5.4, '#8a6a48', [0, plinth / 2, 0]);
  box(g, 6.2, 2.2, 4.6, '#b8956a', [0, plinth + 1.1, 0]);
  gable(g, 7.6, 6.6, 2.4, '#8f7a4a', plinth + 2.2); // golpata thatch
  door(g, 1, 1.8, 0.4, 2.31, '#5a3a22', plinth);
  return g;
}
const bdFlag = (g, x, z, h = 6) => {
  cyl(g, 0.05, 0.05, h, '#cfd4d8', [x, h / 2, z]);
  const f = box(g, 1.5, 0.9, 0.02, '#006a4e', [x + 0.78, h - 0.5, z]); f.userData.wave = true;
  const d = put(g, new THREE.CircleGeometry(0.27, 16), M('#f42a41', { side: THREE.DoubleSide }), [x + 0.7, h - 0.5, z + 0.015]); d.userData.wave = true;
};
function school() {
  const g = G(); const bm = M('#fff', { map: brickTex() });
  box(g, 14.4, 0.4, 4.4, '#cfc5b3', [0, 0.2, 0]); box(g, 14, 3, 3, bm, [0, 1.9, -0.5]);
  box(g, 14.6, 0.25, 4.6, '#e8dfcf', [0, 3.5, 0]);
  for (let k = -3; k <= 3; k++) { cyl(g, 0.15, 0.15, 3, '#f1ece2', [k * 2.2, 1.9, 1.8]); if (k) door(g, 0.9, 2, k * 2.2 - 1.1, 1.01, '#2f6b3d', 0.4); }
  bdFlag(g, 7.6, 2.6);
  return g;
}
function shelter() {
  // a cyclone shelter: open on pillars at the ground, two storeys above the surge
  const g = G();
  for (const x of [-5, 0, 5]) for (const z of [-2.6, 2.6]) cyl(g, 0.3, 0.3, 3, '#e8e4da', [x, 1.5, z], [0, 0, 0], 10);
  box(g, 11.6, 0.4, 6.4, '#d9d2c2', [0, 3.2, 0]); box(g, 11, 2.8, 5.8, '#f4f1ea', [0, 4.8, 0]);
  box(g, 11.6, 0.4, 6.4, '#d9d2c2', [0, 6.4, 0]); box(g, 11, 2.6, 5.8, '#f4f1ea', [0, 7.9, 0]);
  box(g, 11.8, 0.3, 6.6, '#2f6b9a', [0, 9.35, 0]);
  for (let k = -2; k <= 2; k++) { win(g, 1.2, 1, k * 2.1, 4.9, 2.92, '#2a3a4a', '#2f6b9a'); win(g, 1.2, 1, k * 2.1, 8, 2.92, '#2a3a4a', '#2f6b9a'); }
  for (let k = 0; k < 10; k++) box(g, 1.6, 0.12, 0.45, '#cfc5b3', [6.6, 0.3 * k + 0.15, 2.4 - k * 0.42]);
  bdFlag(g, -6.6, 3.4, 11);
  return g;
}
function tilashed() {
  const g = G();
  for (const [x, z] of [[-1.6, -1.2], [1.6, -1.2], [-1.6, 1.2], [1.6, 1.2]]) cyl(g, 0.08, 0.08, 2.4, '#9c8a4a', [x, 1.2, z]);
  gable(g, 4, 3.4, 1, M('#fff', { map: tinTex() }), 2.4); box(g, 3.4, 0.2, 2.6, '#8a6a42', [0, 0.1, 0]);
  return g;
}
function kiln() {
  const g = G();
  box(g, 10, 2.2, 6, '#8a4a32', [0, 1.1, 0]); cyl(g, 0.9, 1.4, 18, '#9a5a3a', [0, 9, 0], [0, 0, 0], 10);
  for (let k = 0; k < 4; k++) { const sm = blob(g, 1.6 + k * 0.6, '#cfcac2', [0.8 * k, 19 + k * 2.2, 0], [1.4, 0.7, 1.2], 0); sm.castShadow = false; sm.userData.live = true; }
  return g;
}
function boat(p) {
  const g = G();
  const hull = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  put(g, hull, '#5a3a22', [0, 0.45, 0], [0, 0, 0], [0.9, 0.55, 3.4]);
  box(g, 1.5, 0.08, 4.6, '#7a5a38', [0, 0.45, 0]);
  const hood = new THREE.CylinderGeometry(0.85, 0.85, 2, 12, 1, true, -Math.PI / 2, Math.PI); hood.rotateX(Math.PI / 2);
  put(g, hood, M('#a8834c', { side: THREE.DoubleSide }), [0, 0.5, -0.4]);
  if (p?.cargo !== false) for (let k = 0; k < 6; k++) blob(g, 0.22, p?.cargo ?? '#9cc04a', [-0.3 + (k % 2) * 0.6, 0.62, 1.2 + Math.floor(k / 2) * 0.4], [1, 1, 1], 0);
  g.userData.live = true; g.userData.bob = true;
  return g;
}
function van() {
  const g = G();
  box(g, 1.5, 0.1, 2.2, '#8a6a42', [0, 0.85, -0.3]);
  for (const s of [-1, 1]) cyl(g, 0.42, 0.42, 0.06, '#2a2a2a', [s * 0.8, 0.42, -0.6], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.42, 0.42, 0.06, '#2a2a2a', [0, 0.42, 1.3], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.03, 0.03, 1, '#c62a2a', [0, 1, 1.2], [0.3, 0, 0]); box(g, 0.7, 0.04, 0.04, '#c62a2a', [0, 1.45, 1.35]);
  box(g, 0.35, 0.08, 0.3, '#2a2a2a', [0, 1.05, 0.9]);
  for (let k = 0; k < 4; k++) cyl(g, 0.3, 0.33, 0.7, '#e2d3a8', [-0.35 + (k % 2) * 0.7, 1.2, -0.8 + Math.floor(k / 2) * 0.8], [Math.PI / 2, 0, 0]);
  return g;
}
function llp() {
  const g = G();
  box(g, 1.6, 0.2, 1.2, '#bdb3a2', [0, 0.1, 0]); box(g, 1.1, 0.7, 0.6, '#2f7a4a', [0, 0.55, 0]);
  cyl(g, 0.3, 0.3, 0.1, '#333', [0.6, 0.6, 0], [0, 0, Math.PI / 2], 14);
  cyl(g, 0.1, 0.1, 2.8, '#2a2a2a', [0, 0.4, 1.6], [Math.PI / 2 - 0.15, 0, 0]);
  return g;
}
function ghat() { const g = G(); for (let k = 0; k < 4; k++) box(g, 2.6, 0.2, 0.5, '#bdb3a2', [0, 0.1 - k * 0.2, k * 0.5]); return g; }
function trellis() {
  const g = G();
  for (const x of [-1.4, 0, 1.4]) for (const z of [-1.4, 1.4]) cyl(g, 0.04, 0.04, 2, '#a8935a', [x, 1, z]);
  for (const z of [-1.4, 1.4]) box(g, 3, 0.04, 0.04, '#a8935a', [0, 2, z]);
  for (let k = 0; k < 8; k++) blob(g, 0.35, '#4f8f34', [-1.2 + (k % 4) * 0.8, 1.9, -1.4 + Math.floor(k / 4) * 2.8], [1.2, 0.5, 1], 0);
  return g;
}
function gher() {
  const g = G();
  for (const [x, z, w, d] of [[0, -3.9, 8.4, 0.8], [0, 3.9, 8.4, 0.8], [-3.9, 0, 0.8, 8.4], [3.9, 0, 0.8, 8.4]]) box(g, w, 0.5, d, '#7a6a4a', [x, 0.1, z]);
  return g;
}
function bamboobridge() {
  const g = G();
  for (let k = 0; k < 7; k++) { cyl(g, 0.05, 0.05, 2.4, '#a8935a', [0, 0.6, -3 + k], [0, 0, 0.1]); }
  box(g, 0.4, 0.06, 7, '#a8935a', [0, 1.2, 0]); box(g, 0.05, 0.05, 7, '#a8935a', [0.35, 1.9, 0]);
  return g;
}
function stilthut() { const g = G(); for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.06, 0.06, 1.6, '#6b4a2b', [x, 0.8, z]); box(g, 2.4, 1.6, 2.4, '#a8834c', [0, 2.3, 0]); gable(g, 3, 3, 1, '#8f7a4a', 3.1); return g; }
function stoneboat() { const g = boat({ cargo: false }); for (let k = 0; k < 8; k++) blob(g, 0.24, '#8b8f8c', [-0.3 + (k % 2) * 0.6, 0.65, -1.4 + Math.floor(k / 2) * 0.8], [1, 0.7, 1], 0); return g; }
function duck() { const g = G(); blob(g, 0.17, '#f4f1ea', [0, 0.12, 0], [1, 0.7, 1.4], 0); blob(g, 0.08, '#2e6b3a', [0, 0.28, 0.18], [1, 1, 1], 0); cone(g, 0.04, 0.1, '#e2a020', [0, 0.27, 0.28], [Math.PI / 2, 0, 0], 4); g.userData.animal = { kind: 'duck' }; return g; }
function tea() { const g = G(); blob(g, 0.6, '#3f7a34', [0, 0.45, 0], [1.2, 0.7, 1.2], 1); return g; }
function stone(p) { const g = G(); blob(g, 0.5, '#8b8f8c', [0, 0.15, 0], [1.2, 0.6, 1], 0); return g; }
function treeBD(type) {
  const g = G();
  if (type === 'coconut') {
    const t = cyl(g, 0.17, 0.26, 7, '#7a6450', [0.6, 3.5, 0], [0, 0, -0.17], 7);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; box(g, 0.32, 0.04, 2.8, '#4f8a34', [1.2 + Math.cos(a) * 1.1, 6.8, Math.sin(a) * 1.1], [0.7, -a + Math.PI / 2, 0]); }
    for (let k = 0; k < 4; k++) blob(g, 0.2, '#6b8a2a', [1.2 + Math.cos(k * 1.6) * 0.3, 6.5, Math.sin(k * 1.6) * 0.3], [1, 1, 1], 0);
  } else if (type === 'betelnut') {
    cyl(g, 0.1, 0.13, 8, '#9a9488', [0, 4, 0], [0, 0, 0], 6); for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; box(g, 0.25, 0.03, 1.8, '#5f8f38', [Math.cos(a) * 0.7, 8, Math.sin(a) * 0.7], [0.6, -a + Math.PI / 2, 0]); }
  } else if (type === 'bamboo') {
    for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 0.3 + (k % 3) * 0.2; cyl(g, 0.06, 0.07, 7, '#8aa04a', [Math.cos(a) * r, 3.5, Math.sin(a) * r], [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12], 5); }
    blob(g, 1.6, '#6f9f3a', [0, 6.6, 0], [1.2, 1.3, 1.2], 0);
  } else if (type === 'hijal') {
    trunk(g, 2.2, 0.25, '#4a3628'); blob(g, 2, '#3f7a34', [0, 3.4, 0], [1.2, 0.7, 1.2]);
  } else if (type === 'nipa') {
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; box(g, 0.3, 0.03, 3, '#5f8f38', [Math.cos(a) * 1.1, 1.2, Math.sin(a) * 1.1], [-0.9, -a + Math.PI / 2, 0]); }
  } else if (type === 'guava') {
    trunk(g, 1.4, 0.15, '#7a5a40'); blob(g, 1.3, '#5a9a3c', [0, 2.2, 0], [1, 0.8, 1]); for (let k = 0; k < 5; k++) blob(g, 0.1, '#b5d06a', [Math.cos(k) * 1, 1.9, Math.sin(k) * 1], [1, 1, 1], 0);
  } else if (type === 'mangrove') {
    trunk(g, 2.6, 0.22, '#4a3628'); blob(g, 2.2, '#24502c', [0, 3.6, 0], [1.1, 0.9, 1.1]);
    for (let k = 0; k < 6; k++) cone(g, 0.05, 0.4, '#5a4632', [Math.cos(k) * 1.2, 0.2, Math.sin(k) * 1.2], [0, 0, 0], 4);
  }
  return g;
}

export const BUILD = {
  brickhouse, mudhouse, tharuhouse, bhutanhouse, stilthouse, shed, kiosk,
  pumphouse, channel, mogha, stw, stream, pond: () => G(),
  tractor, trolley, donkeycart, oxcart, stall, gurdwara, dhaba, truck, wardoffice, lhakhang, kyaung, chorten, zedi, waterpots,
  kup, charpai, pots, dehari, machan, pole, lungdar, flagline,
  mango: () => tree('mango'), sal: () => tree('sal'), tamarind: () => tree('tamarind'), eucalyptus: () => tree('eucalyptus'), poplar: () => tree('poplar'),
  kikar: () => tree('kikar'), bluepine: () => tree('bluepine'), banana: () => tree('banana'), date: () => tree('date'), toddy: () => tree('toddy'),
  tinhouse, thatchhouse, school, shelter, tilashed, kiln, boat, van, llp, ghat, trellis, gher, bamboobridge, stilthut, stoneboat, duck, tea, stone,
  coconut: () => treeBD('coconut'), betelnut: () => treeBD('betelnut'), bamboo: () => treeBD('bamboo'), hijal: () => treeBD('hijal'), nipa: () => treeBD('nipa'), guava: () => treeBD('guava'), mangrove: () => treeBD('mangrove'),
  buffalo: () => animal('buffalo'), cow: () => animal('cow'), ox: () => animal('ox'), goat: () => animal('goat'), chicken: () => animal('chicken'),
};
export { box, cyl, cone, blob, half, put, M, gable, pyramid };
