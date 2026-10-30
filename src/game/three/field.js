// The field in 3D: 18 plots of soil that darken when watered, the earth bunds between them, a straw mulch when it is
// laid, and the crops — nine plants per plot, drawn as instanced meshes per crop and growth stage, so hundreds of
// plants cost a few draw calls. Thirsty plants yellow and droop, the wind sways them, pests hover over infested plots,
// and the satellite view (NDVI-style) tints each plot by health.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLOT, GAP, FIELD_W, FIELD_D } from '../regions';
import { ripeAt } from '../sim';

// ---- plant shapes: a list of coloured parts per crop and stage (0 sprout, 1 young, 2 grown, 3 ripe, 4 dead) ----
const C = (hex) => new THREE.Color(hex);
function part(g, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
  const ng = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m);
  const c = C(color), n = ng.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  ng.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  ng.deleteAttribute('uv');
  return ng;
}
const blade = new THREE.BoxGeometry(0.035, 1, 0.012);
const ball = new THREE.IcosahedronGeometry(1, 0);
const ball1 = new THREE.IcosahedronGeometry(1, 1);
const stick = new THREE.CylinderGeometry(0.5, 0.5, 1, 5);
const disc = new THREE.CylinderGeometry(1, 1, 0.12, 10);

function tuft(out, n, h, col, lean = 0.25) {
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; out.push(part(blade, col, [Math.cos(a) * 0.03, h / 2, Math.sin(a) * 0.03], [Math.sin(a) * lean, a, Math.cos(a) * lean], [1, h, 1])); }
}
function grain(out, st, o) {
  const h = [0.18, 0.4, 0.7, 0.8][st];
  tuft(out, st ? 9 : 5, h, st === 3 ? o.ripeLeaf : o.leaf, 0.22);
  if (st >= 2) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, x = Math.cos(a) * 0.09, z = Math.sin(a) * 0.09;
    const col = st === 3 ? o.ripe : o.head;
    if (o.droop) out.push(part(ball, col, [x * 1.6, h - 0.02, z * 1.6], [Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9], [0.035, 0.16, 0.035]));
    else out.push(part(ball, col, [x, h + 0.08, z], [Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15], [0.03, 0.11, 0.03]));
  }
}
function bush(out, st, o) {
  const r = [0.1, 0.22, 0.32, 0.34][st] * (o.size ?? 1), h = [0.12, 0.25, 0.4, 0.42][st] * (o.tall ?? 1);
  out.push(part(stick, '#5a7a2a', [0, h / 2, 0], [0, 0, 0], [0.04, h, 0.04]));
  out.push(part(ball1, st === 3 && o.ripeLeaf ? o.ripeLeaf : o.leaf, [0, h, 0], [0, 0, 0], [r, r * 0.8, r]));
  out.push(part(ball1, st === 3 && o.ripeLeaf ? o.ripeLeaf : o.leaf, [r * 0.5, h * 0.7, -r * 0.3], [0, 0, 0], [r * 0.7, r * 0.6, r * 0.7]));
  if (st >= 2 && o.flower) for (let k = 0; k < 5; k++) { const a = k * 1.3; out.push(part(ball, o.flower, [Math.cos(a) * r * 0.8, h + r * 0.55, Math.sin(a) * r * 0.8], [0, 0, 0], [0.035, 0.035, 0.035])); }
  if (st === 3 && o.fruit) for (let k = 0; k < (o.fruitN ?? 5); k++) { const a = k * 1.7; out.push(part(ball1, o.fruit, [Math.cos(a) * r * 0.85, h * (0.5 + (k % 3) * 0.25), Math.sin(a) * r * 0.85], [0.3, a, 0], o.fruitScale ?? [0.06, 0.06, 0.06])); }
}
const SHAPE = {
  wheat: (o, st) => grain(o, st, { leaf: '#5f9a3a', ripeLeaf: '#c9a748', head: '#8fb04a', ripe: '#d9b45a' }),
  redrice: (o, st) => grain(o, st, { leaf: '#4f9a3a', ripeLeaf: '#b5a14a', head: '#8fb04a', ripe: '#a8492e', droop: true }),
  mustard: (o, st) => { tuft(o, 6, [0.15, 0.4, 0.62, 0.66][st], '#5c9a3c', 0.3); if (st >= 2) for (let k = 0; k < 7; k++) o.push(part(ball, st === 3 ? '#b8a23a' : '#f2d31b', [Math.cos(k) * 0.1, [0.62, 0.66][st - 2] + (k % 3) * 0.05, Math.sin(k) * 0.1], [0, 0, 0], [0.06, 0.05, 0.06])); },
  sesame: (o, st) => { tuft(o, 5, [0.15, 0.45, 0.85, 0.9][st], st === 3 ? '#a8a14a' : '#5c9a3c', 0.12); if (st >= 2) for (let k = 0; k < 6; k++) o.push(part(ball, st === 3 ? '#8a7a3a' : '#f0d7e4', [Math.cos(k) * 0.06, 0.4 + k * 0.08, Math.sin(k) * 0.06], [0, 0, 0], [0.035, 0.06, 0.035])); },
  sunflower: (o, st) => {
    const h = [0.2, 0.6, 1.2, 1.3][st];
    o.push(part(stick, '#4f8a2a', [0, h / 2, 0], [0, 0, 0], [0.05, h, 0.05]));
    for (let k = 0; k < 4; k++) o.push(part(ball, '#4f8a2a', [Math.cos(k * 1.6) * 0.14, h * (0.3 + k * 0.15), Math.sin(k * 1.6) * 0.14], [0, k, 0], [0.16, 0.03, 0.1]));
    if (st >= 2) { o.push(part(disc, st === 3 ? '#c9a020' : '#f2c21b', [0, h, 0.04], [1.25, 0, 0], [0.2, 1, 0.2])); o.push(part(disc, '#4a2e16', [0, h + 0.005, 0.06], [1.25, 0, 0], [0.11, 1.2, 0.11])); }
  },
  potato: (o, st) => bush(o, st, { leaf: '#4f8f34', ripeLeaf: '#a7a04a', flower: '#f4efe4', fruit: st === 3 ? '#c9a46a' : null, fruitN: 3, fruitScale: [0.07, 0.05, 0.06] }),
  chickpea: (o, st) => bush(o, st, { leaf: '#6f9f4a', ripeLeaf: '#b9a764', flower: '#e5a0c0', size: 0.85 }),
  lentil: (o, st) => bush(o, st, { leaf: '#6aa14a', ripeLeaf: '#b9a764', flower: '#e8e2f2', size: 0.8, tall: 0.8 }),
  pea: (o, st) => bush(o, st, { leaf: '#5aa04a', flower: '#f4f4f4', fruit: '#7cc04a', fruitScale: [0.03, 0.08, 0.03] }),
  groundnut: (o, st) => bush(o, st, { leaf: '#5a9a3c', ripeLeaf: '#a8a04a', flower: '#f2c21b', size: 1, tall: 0.6 }),
  pigeonpea: (o, st) => bush(o, st, { leaf: '#5a8a3a', ripeLeaf: '#8a8a3a', flower: '#f2c21b', fruit: '#6a5a2a', fruitScale: [0.03, 0.09, 0.03], size: 1.2, tall: 2.6 }),
  tomato: (o, st) => bush(o, st, { leaf: '#3f8a34', flower: '#f2d31b', fruit: '#e0452c', fruitN: 6, fruitScale: [0.075, 0.07, 0.075], tall: 1.3 }),
  chili: (o, st) => bush(o, st, { leaf: '#3f8a34', flower: '#f4f4f4', fruit: '#d6281e', fruitN: 7, fruitScale: [0.025, 0.08, 0.025], tall: 1.2 }),
  rice: (o, st) => grain(o, st, { leaf: '#5aa63a', ripeLeaf: '#c9b04a', head: '#9cc04a', ripe: '#e0c05a', droop: true }),
  brinjal: (o, st) => bush(o, st, { leaf: '#3f7a34', flower: '#b48ad6', fruit: '#4a2a5e', fruitN: 4, fruitScale: [0.05, 0.11, 0.05], tall: 1.3 }),
  cauliflower: (o, st) => { bush(o, Math.min(st, 2), { leaf: '#5a9a6a', size: 1.1, tall: 0.7 }); if (st >= 2) o.push(part(ball1, st === 3 ? '#f4f0e2' : '#e6e8d0', [0, 0.32, 0], [0, 0, 0], st === 3 ? [0.16, 0.1, 0.16] : [0.1, 0.07, 0.1])); },
  bean: (o, st) => { const h = [0.2, 0.7, 1.4, 1.5][st]; o.push(part(stick, '#a8935a', [0, h / 2, 0], [0, 0, 0], [0.025, h, 0.025])); for (let k = 0; k < 4 + st * 2; k++) o.push(part(ball1, '#4f8f34', [Math.cos(k) * 0.12, h * (0.2 + (k / (4 + st * 2)) * 0.8), Math.sin(k) * 0.12], [0, 0, 0], [0.11, 0.08, 0.11])); if (st >= 2) for (let k = 0; k < 5; k++) o.push(part(ball, st === 3 ? '#6aa63a' : '#c9a0d8', [Math.cos(k * 1.3) * 0.16, h * (0.4 + k * 0.1), Math.sin(k * 1.3) * 0.16], [0, 0, 0.6], st === 3 ? [0.02, 0.09, 0.02] : [0.035, 0.035, 0.035])); },
  bittergourd: (o, st) => { bush(o, st, { leaf: '#4f8f34', flower: '#f2d31b', fruit: '#5fa03a', fruitN: 4, fruitScale: [0.05, 0.13, 0.05], size: 1.1, tall: 0.9 }); },
  grasspea: (o, st) => bush(o, st, { leaf: '#6aa14a', ripeLeaf: '#b9a764', flower: '#6a7ad6', size: 0.85, tall: 0.8 }),
  mungbean: (o, st) => bush(o, st, { leaf: '#5aa04a', ripeLeaf: '#8a8a3a', flower: '#f2d31b', fruit: '#3a3a2a', fruitScale: [0.02, 0.08, 0.02], size: 0.9 }),
  maize: (o, st) => { const h = [0.25, 0.7, 1.5, 1.6][st]; o.push(part(stick, st === 3 ? '#b9a764' : '#5f9a3a', [0, h / 2, 0], [0, 0, 0], [0.05, h, 0.05])); for (let k = 0; k < 6; k++) o.push(part(blade, st === 3 ? '#b9a764' : '#5f9a3a', [0, h * (0.25 + k * 0.12), 0], [0.9, k * 2.1, 0], [3, 0.5, 1])); if (st >= 2) { o.push(part(ball1, st === 3 ? '#e6c25a' : '#9cc04a', [0.06, h * 0.55, 0], [0, 0, 0.3], [0.05, 0.13, 0.05])); o.push(part(blade, '#d9c07a', [0, h + 0.1, 0], [0, 0, 0], [1, 0.25, 1])); } },
  pineapple: (o, st) => { for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; o.push(part(blade, '#4a7a4a', [Math.cos(a) * 0.05, 0.18 * (0.5 + st * 0.25), Math.sin(a) * 0.05], [Math.sin(a) * 0.8, a, Math.cos(a) * 0.8], [2.2, 0.45 * (0.5 + st * 0.25), 1])); } if (st >= 2) { o.push(part(ball1, st === 3 ? '#d9a02a' : '#7a9a3a', [0, 0.32, 0], [0, 0, 0], [0.08, 0.12, 0.08])); o.push(part(blade, '#3f7a3a', [0, 0.47, 0], [0, 0, 0], [2, 0.12, 1])); } },
  onion: (o, st) => { tuft(o, 7, [0.12, 0.3, 0.42, 0.36][st], st === 3 ? '#9aa04a' : '#5a9f5a', 0.18); if (st >= 2) o.push(part(ball1, '#b5574a', [0, 0.05, 0], [0, 0, 0], st === 3 ? [0.1, 0.08, 0.1] : [0.06, 0.05, 0.06])); },
};
const geoCache = new Map();
function plantGeo(kind, st) {
  const key = `${kind}:${st}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const out = [];
  if (st === 4) tuft(out, 5, 0.12, '#7a5a34', 0.9);
  else (SHAPE[kind] ?? SHAPE.lentil)(out, st);
  const g = mergeGeometries(out); g.computeVertexNormals();
  geoCache.set(key, g); return g;
}

// ---- the field ----
const CELL = PLOT + GAP;
const SPOTS9 = [-1, 0, 1].flatMap((a) => [-1, 0, 1].map((b) => [a * 1.05, b * 1.05]));
export function createField(scene, g) {
  const root = new THREE.Group(); scene.add(root);
  const plantMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  // bunds: a raised earth frame round and between the plots
  const bundM = new THREE.MeshStandardMaterial({ color: g.L.soil, roughness: 1, flatShading: true });
  const bundG = new THREE.BoxGeometry(1, 0.16, 1);
  const bunds = [];
  for (let c = 0; c <= 6; c++) bunds.push([-FIELD_W / 2 - GAP / 2 + c * CELL, 0, 0.45, FIELD_D + GAP]);
  for (let r = 0; r <= 3; r++) bunds.push([0, -FIELD_D / 2 - GAP / 2 + r * CELL, FIELD_W + GAP, 0.45]);
  for (const [x, z, w, d] of bunds) { const m = new THREE.Mesh(bundG, bundM); m.position.set(x, 0.08, z); m.scale.set(w, 1, d); m.receiveShadow = true; m.castShadow = true; root.add(m); }
  const dry = C(g.L.soil).lerp(C('#e6d6b8'), 0.35), wet = C(g.L.soil).multiplyScalar(0.55), straw = C('#d9b866');
  const soilG = new THREE.BoxGeometry(PLOT, 0.12, PLOT);
  const ndviG = new THREE.PlaneGeometry(PLOT * 0.96, PLOT * 0.96); ndviG.rotateX(-Math.PI / 2);
  const ringG = new THREE.RingGeometry(PLOT * 0.42, PLOT * 0.48, 32); ringG.rotateX(-Math.PI / 2);
  const plots = g.plots.map((p) => {
    const sm = new THREE.MeshStandardMaterial({ color: dry.clone(), roughness: 1 });
    const soil = new THREE.Mesh(soilG, sm); soil.position.set(p.x, 0.04, p.z); soil.receiveShadow = true; root.add(soil);
    const nm = new THREE.MeshBasicMaterial({ color: '#2e9d3a', transparent: true, opacity: 0.55, depthWrite: false });
    const ndvi = new THREE.Mesh(ndviG, nm); ndvi.position.set(p.x, 1.2, p.z); ndvi.visible = false; ndvi.renderOrder = 2; root.add(ndvi);
    const rm = new THREE.MeshBasicMaterial({ color: '#3aa0e0', transparent: true, opacity: 0.8, depthWrite: false });
    const ring = new THREE.Mesh(ringG, rm); ring.position.set(p.x, 0.13, p.z); ring.visible = false; root.add(ring);
    // a small swarm for pests or raiders
    const swarm = new THREE.Group(); swarm.position.set(p.x, 0, p.z); swarm.visible = false; root.add(swarm);
    for (let k = 0; k < 14; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 4, 3), new THREE.MeshBasicMaterial({ color: '#1b1b14' })); b.userData.ph = Math.random() * 10; swarm.add(b); }
    return { soil, ndvi, ring, swarm };
  });
  // the plants: one instanced mesh per crop and stage, filled each frame
  const kinds = [...new Set(Object.values(g.R.crops).map((c) => c.kind))];
  const buckets = new Map();
  for (const k of kinds) for (let st = 0; st < 5; st++) {
    const im = new THREE.InstancedMesh(plantGeo(k, st), plantMat, g.plots.length * 9);
    im.castShadow = true; im.receiveShadow = true; im.count = 0; im.frustumCulled = false;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(g.plots.length * 9 * 3), 3);
    root.add(im); buckets.set(`${k}:${st}`, im);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
  const tint = C('#c9a65a');
  return {
    root,
    // layer: what the satellite view shows: 'health' (NDVI-style greenness), 'water' (water-stress hotspots, SMAP-style)
    // or 'soil' (each plot's soil health, raised by legumes and lost when bare soil washes away)
    update(t, wind, sat, scanner, layer = 'health') {
      for (const im of buckets.values()) im.count = 0;
      const lim = ripeAt(g);
      g.plots.forEach((p, i) => {
        const P = plots[i];
        // soil: dry to dark wet, straw-coloured under mulch
        const base = P.soil.material.color;
        base.copy(dry).lerp(wet, Math.min(1, p.moist));
        if (p.mulch && p.crop) base.lerp(straw, 0.5);
        P.ring.visible = scanner && !!p.crop && !p.dead; if (P.ring.visible) P.ring.material.color.set(p.moist > 0.4 ? '#3aa0e0' : p.moist > 0.15 ? '#e0b43a' : '#e04a3a');
        P.ndvi.visible = sat;
        if (sat) {
          if (layer === 'water') {
            const growing = p.crop && !p.dead; // a hotspot is a crop short of water; bare soil stays neutral
            P.ndvi.material.color.set(!growing ? '#8a7a5a' : p.moist > 0.5 ? '#2f7fd0' : p.moist > 0.25 ? '#c9c23a' : '#d6452f');
            P.ndvi.material.opacity = growing ? 0.62 : 0.25;
          } else if (layer === 'soil') {
            const f = p.fert / 0.6;
            P.ndvi.material.color.set(f > 0.5 ? '#2e9d3a' : f > 0.15 ? '#c9a23a' : '#8a5a3a');
            P.ndvi.material.opacity = 0.6;
          } else {
            const h = !p.crop ? -1 : p.dead ? 0 : p.health * (p.moist > 0.12 ? 1 : 0.6) * (p.pests ? 0.5 : 1);
            P.ndvi.material.color.set(h < 0 ? '#8a7a5a' : h > 0.7 ? '#2e9d3a' : h > 0.4 ? '#c9c23a' : '#d6452f');
            P.ndvi.material.opacity = h < 0 ? 0.25 : 0.6;
          }
        }
        P.swarm.visible = p.pests > 0;
        if (P.swarm.visible) P.swarm.children.forEach((b, k) => { const ph = b.userData.ph + t * 3; b.position.set(Math.cos(ph + k) * 1.2, 0.5 + Math.sin(ph * 1.7) * 0.3, Math.sin(ph * 0.8 + k) * 1.2); });
        if (!p.crop) return;
        const st = p.dead ? 4 : p.g >= lim ? 3 : p.g >= 0.55 ? 2 : p.g >= 0.22 ? 1 : 0;
        const im = buckets.get(`${g.R.crops[p.crop].kind}:${st}`);
        const grow = st === 4 ? 1 : st === 3 ? 1 : 0.6 + 0.4 * Math.min(1, (p.g - [0, 0.22, 0.55][st]) / ([0.22, 0.33, 0.45][st]));
        const droop = Math.min(1, p.wilt / 10);
        col.setRGB(1, 1, 1).lerp(tint, droop * 0.8 + (p.pests ? 0.25 : 0));
        SPOTS9.forEach(([dx, dz], j) => {
          const n = im.count++;
          const sway = Math.sin(t * 1.8 + p.x * 0.7 + dx * 2) * 0.06 * wind;
          e.set(sway + droop * 0.35, (i * 9 + j) * 2.4, sway * 0.6);
          q.setFromEuler(e); v.set(p.x + dx + ((j * 37) % 7 - 3) * 0.03, 0.1, p.z + dz + ((j * 53) % 7 - 3) * 0.03);
          const s = grow * (0.9 + ((j * 13) % 5) * 0.04); sc.set(s, s * (1 - droop * 0.3), s);
          m4.compose(v, q, sc); im.setMatrixAt(n, m4); im.setColorAt(n, col);
        });
      });
      for (const im of buckets.values()) { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; }
    },
  };
}
