#!/usr/bin/env node
// Learns, from 24 seasons of NASA data, how the weather of a Rabi season moves the greenness of the crops, and tests
// whether that beats the simplest honest guess. Two questions, both from NASA records only:
//   area   each upazila's Rabi greenness (MODIS NDVI, about 5 km, January–February) against its own trend, as a
//          z-score (engine/landsat.js landSummary), from that season's weather; 7 upazilas × 24 seasons. The main model.
//   field  a registered field's own MODIS 250 m Rabi greenness below its trend (a stressed season) from the same
//          weather; 19 fields × 24 seasons. Reported as a finding: at one field, weather explains little.
// Clues, all known by the end of February and each as the difference from that place's own normal (so one model fits
// seven very different places): Rabi rain, the heaviest three-day rain, cold nights, warm days, root-zone soil wetness
// (NASA POWER GWETROOT, MERRA-2) and the monsoon before; weather from NASA POWER, corrected to BMD station normals.
// Approaches, scored the same way (leave one season out: every year is predicted by a model that never saw it):
//   base rate / normal   always the average (the floor any model must beat)
//   ridge                a linear regression on the standardised clues with a penalty that keeps it modest
//   logistic             a logistic regression for "stressed or not"
//   tree                 a decision tree two levels deep (one or two plain questions about the weather)
// Scores: correlation and error skill (greenness), AUC and Brier skill (stressed seasons; AUC 0.5 is chance).
// Writes src/data/models/stress_model.json. Usage: npm run train:stress
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeClimate, SEASONS } from '../../src/engine/climate.js';
import { fieldGreen, landSummary } from '../../src/engine/landsat.js';
import { ymd, addDays } from '../../src/engine/dates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p)));
const { parcels } = read('src/data/fields/parcels.json');
const wet = read('src/data/water/soil_wetness.json').upazilas;

export const FEATURES = [
  { k: 'rabiRain', bn: 'রবির বৃষ্টি (নভেম্বর-ফেব্রুয়ারি, মিমি)', en: 'Rabi rain (Nov–Feb, mm)' },
  { k: 'burst', bn: 'সবচেয়ে ভারী টানা তিন দিনের বৃষ্টি (মিমি)', en: 'Heaviest three-day rain (mm)' },
  { k: 'coldNights', bn: 'ঠান্ডা রাত (ডিসেম্বর-জানুয়ারি, ১০° বা নিচে)', en: 'Cold nights (Dec–Jan, 10 °C or below)' },
  { k: 'warmDays', bn: 'গরম দিন (জানুয়ারি-ফেব্রুয়ারি, ২৮° বা বেশি)', en: 'Warm days (Jan–Feb, 28 °C or more)' },
  { k: 'soilWet', bn: 'শিকড়ের মাটির ভেজা ভাব (নভেম্বর-ফেব্রুয়ারি)', en: 'Root-zone soil wetness (Nov–Feb)' },
  { k: 'monsoon', bn: 'আগের বর্ষার বৃষ্টি (জুন-সেপ্টেম্বর, মিমি)', en: 'Previous monsoon rain (Jun–Sep, mm)' },
];

function sum(clim, v, a, b, f = (x) => x) { let s = 0, n = 0; for (let t = a; t <= b; t = addDays(t, 1)) { const x = clim.val(v, t); if (x != null) { s += f(x); n++; } } return n ? s : null; }
function seasonFeatures(clim, wetness, y) {
  const a = ymd(y - 1, 11, 1), b = ymd(y, 2, 28);
  let burst = 0;
  for (let t = a; t <= addDays(b, -2); t = addDays(t, 1)) { const r = [0, 1, 2].reduce((s, k) => s + (clim.val('prec', addDays(t, k)) ?? 0), 0); if (r > burst) burst = r; }
  const w = [[y - 1, 10], [y - 1, 11], [y, 0], [y, 1]].map(([yy, m]) => wetness?.[yy]?.[m]).filter((x) => x != null);
  return {
    rabiRain: sum(clim, 'prec', a, b),
    burst,
    coldNights: sum(clim, 'tmin', ymd(y - 1, 12, 1), ymd(y, 1, 31), (x) => (x <= 10 ? 1 : 0)),
    warmDays: sum(clim, 'tmax', ymd(y, 1, 1), b, (x) => (x >= 28 ? 1 : 0)),
    soilWet: w.length ? w.reduce((p, q) => p + q, 0) / w.length : null,
    monsoon: sum(clim, 'prec', ymd(y - 1, 6, 1), ymd(y - 1, 9, 30)),
  };
}

// ── the examples ──
const climates = {}, featCache = {};
const featOf = (upz, y) => {
  const k = `${upz}|${y}`;
  if (!(k in featCache)) { climates[upz] ??= makeClimate(read(`src/data/climate/climate_${upz}.json`)); featCache[k] = seasonFeatures(climates[upz], wet[upz]?.root, y); }
  return featCache[k];
};
const UPZ = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'];
// each clue as the difference from that place's own 24-season normal
const normal = {};
for (const u of UPZ) {
  const fs = SEASONS.filter((y) => y >= 2002).map((y) => featOf(u, y));
  normal[u] = FEATURES.map((f) => { const v = fs.map((x) => x[f.k]).filter((x) => x != null); const m = v.reduce((a, b) => a + b, 0) / v.length; return { m, s: Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1 }; });
}
const anomaly = (u, f) => FEATURES.map((x, j) => (f[x.k] - normal[u][j].m) / normal[u][j].s);
const areaRows = [], rows = [];
for (const u of UPZ) for (const r of landSummary(u).rabi) {
  if (!SEASONS.includes(r.y) || r.y < 2002) continue;
  const f = featOf(u, r.y); if (FEATURES.some((x) => f[x.k] == null)) continue;
  areaRows.push({ upazila: u, y: r.y, x: anomaly(u, f), z: r.z, stress: r.stress ? 1 : 0 });
}
for (const p of parcels) {
  const g = fieldGreen(p.id, p.upazila);
  if (!g || !UPZ.includes(p.upazila)) continue;
  for (const r of g.rabi) {
    if (!SEASONS.includes(r.y) || r.y < 2002) continue;
    const f = featOf(p.upazila, r.y); if (FEATURES.some((x) => f[x.k] == null)) continue;
    rows.push({ field: p.id, upazila: p.upazila, y: r.y, x: anomaly(p.upazila, f), z: r.z, stress: r.stress ? 1 : 0 });
  }
}

// ── the approaches ──
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
function standardiser(X) {
  const mu = X[0].map((_, j) => mean(X.map((r) => r[j])));
  const sd = X[0].map((_, j) => Math.sqrt(mean(X.map((r) => (r[j] - mu[j]) ** 2))) || 1);
  return { mu, sd, z: (r) => r.map((v, j) => (v - mu[j]) / sd[j]) };
}
const sig = (s) => 1 / (1 + Math.exp(-s));
function fitLogistic(X, yv, l2 = 0.5, iters = 3000, lr = 0.1) {
  const st = standardiser(X), Z = X.map(st.z), d = Z[0].length;
  let w = new Array(d).fill(0), b = Math.log(mean(yv) / (1 - mean(yv)));
  for (let it = 0; it < iters; it++) {
    const gw = new Array(d).fill(0); let gb = 0;
    Z.forEach((z, i) => { const e = sig(b + z.reduce((s, v, j) => s + v * w[j], 0)) - yv[i]; gb += e; z.forEach((v, j) => { gw[j] += e * v; }); });
    w = w.map((wj, j) => wj - lr * (gw[j] / Z.length + (l2 * wj) / Z.length));
    b -= lr * (gb / Z.length);
  }
  return { kind: 'logistic', w, b, mu: st.mu, sd: st.sd, predict: (x) => sig(b + st.z(x).reduce((s, v, j) => s + v * w[j], 0)) };
}
function fitRidge(X, yv, l2 = 4) {
  // normal equations with a ridge penalty, solved by Gauss–Jordan (6 clues: tiny)
  const d = X[0].length, A = Array.from({ length: d + 1 }, () => new Array(d + 1).fill(0)), c = new Array(d + 1).fill(0);
  const row = (x) => [1, ...x];
  X.forEach((x, i) => { const r = row(x); for (let a = 0; a <= d; a++) { c[a] += r[a] * yv[i]; for (let b = 0; b <= d; b++) A[a][b] += r[a] * r[b]; } });
  for (let a = 1; a <= d; a++) A[a][a] += l2;
  const M = A.map((r, a) => [...r, c[a]]);
  for (let col = 0; col <= d; col++) { let piv = col; for (let r = col + 1; r <= d; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r; [M[col], M[piv]] = [M[piv], M[col]]; for (let r = 0; r <= d; r++) { if (r === col) continue; const f = M[r][col] / M[col][col]; for (let k = col; k <= d + 1; k++) M[r][k] -= f * M[col][k]; } }
  const beta = M.map((r, a) => r[d + 1] / r[a]);
  return { kind: 'ridge', b: beta[0], w: beta.slice(1), predict: (x) => beta[0] + x.reduce((s, v, j) => s + v * beta[j + 1], 0) };
}
function fitTree(X, yv, depth = 2, minLeaf = 15) {
  const gini = (ys) => { if (!ys.length) return 0; const p = mean(ys); return 2 * p * (1 - p) * ys.length; };
  function grow(idx, dep) {
    const ys = idx.map((i) => yv[i]), leaf = { p: (ys.reduce((a, b) => a + b, 0) + 1) / (ys.length + 2), n: ys.length };
    if (dep === 0 || idx.length < 2 * minLeaf) return leaf;
    let best = null;
    for (let j = 0; j < X[0].length; j++) {
      const vals = [...new Set(idx.map((i) => X[i][j]))].sort((a, b) => a - b);
      for (let q = 1; q < 10; q++) {
        const thr = vals[Math.floor((q / 10) * vals.length)];
        const L = idx.filter((i) => X[i][j] < thr), R = idx.filter((i) => X[i][j] >= thr);
        if (L.length < minLeaf || R.length < minLeaf) continue;
        const cost = gini(L.map((i) => yv[i])) + gini(R.map((i) => yv[i]));
        if (!best || cost < best.cost) best = { j, thr, L, R, cost };
      }
    }
    if (!best || best.cost >= gini(ys) - 1e-9) return leaf;
    return { j: best.j, thr: best.thr, left: grow(best.L, dep - 1), right: grow(best.R, dep - 1), n: ys.length };
  }
  const root = grow(X.map((_, i) => i), depth);
  const walk = (node, x) => (node.p != null ? node.p : walk(x[node.j] < node.thr ? node.left : node.right, x));
  return { kind: 'tree', root, predict: (x) => walk(root, x) };
}
function auc(p, y) {
  const pos = p.filter((_, i) => y[i]), neg = p.filter((_, i) => !y[i]);
  if (!pos.length || !neg.length) return null;
  let s = 0; for (const a of pos) for (const b of neg) s += a > b ? 1 : a === b ? 0.5 : 0;
  return s / (pos.length * neg.length);
}
const brier = (p, y) => mean(p.map((v, i) => (v - y[i]) ** 2));

const corr = (a, b) => { const ma = mean(a), mb = mean(b); let sab = 0, sa = 0, sb = 0; a.forEach((v, i) => { sab += (v - ma) * (b[i] - mb); sa += (v - ma) ** 2; sb += (b[i] - mb) ** 2; }); return sab / Math.sqrt(sa * sb); };
// leave one season out, for one set of examples
function evaluate(data) {
  const years = [...new Set(data.map((r) => r.y))].sort();
  const P = { base: [], ridge: [], logistic: [], tree: [] }, zT = [], sT = [], zBase = [];
  for (const y of years) {
    const train = data.filter((r) => r.y !== y), test = data.filter((r) => r.y === y);
    const X = train.map((r) => r.x), zs = train.map((r) => r.z), ss = train.map((r) => r.stress);
    const rg = fitRidge(X, zs), lg = fitLogistic(X, ss), tr = fitTree(X, ss), br = mean(ss);
    for (const r of test) { P.base.push(br); P.ridge.push(rg.predict(r.x)); P.logistic.push(lg.predict(r.x)); P.tree.push(tr.predict(r.x)); zT.push(r.z); sT.push(r.stress); zBase.push(0); }
  }
  const rmse = (p) => Math.sqrt(mean(p.map((v, i) => (v - zT[i]) ** 2)));
  const b0 = brier(P.base, sT);
  const cls = (k) => ({ auc: auc(P[k], sT), brier: brier(P[k], sT), skill: 1 - brier(P[k], sT) / b0 });
  return {
    n: data.length, positives: sT.reduce((a, b) => a + b, 0), seasons: years.length,
    greenness: { r: corr(P.ridge, zT), skill: 1 - rmse(P.ridge) ** 2 / rmse(zBase) ** 2 },
    stressed: { ridge: { auc: auc(P.ridge.map((v) => -v), sT) }, logistic: cls('logistic'), tree: cls('tree'), base: cls('base') },
  };
}
const evalArea = evaluate(areaRows), evalField = evaluate(rows);
// one small model per place (Rabi rain and warm days only), each season held out in turn: where the weather explains
// the crop and where something else (irrigation, tides, salt, management) decides
const PLACE_CLUES = ['rabiRain', 'warmDays'].map((k) => FEATURES.findIndex((f) => f.k === k));
const perPlace = Object.fromEntries(UPZ.map((u) => {
  const d = areaRows.filter((r) => r.upazila === u).map((r) => ({ ...r, x: PLACE_CLUES.map((j) => r.x[j]) }));
  const p = d.map((r) => { const m = fitRidge(d.filter((q) => q.y !== r.y).map((q) => q.x), d.filter((q) => q.y !== r.y).map((q) => q.z), 2); return m.predict(r.x); });
  const z = d.map((r) => r.z), mse = (v) => mean(v.map((x, i) => (x - z[i]) ** 2));
  const all = fitRidge(d.map((q) => q.x), z, 2);
  return [u, { n: d.length, r: corr(p, z), skill: 1 - mse(p) / mse(z.map(() => 0)), rain: all.w[0], warm: all.w[1] }];
}));

// the final models, on every season
const X = areaRows.map((r) => r.x), yv = areaRows.map((r) => r.stress);
const rg = fitRidge(X, areaRows.map((r) => r.z)), lg = fitLogistic(X, yv), tr = fitTree(X, yv);
const describeTree = (n) => (n.p != null ? { p: Math.round(n.p * 1000) / 1000, n: n.n } : { feature: FEATURES[n.j].k, below: Math.round(n.thr * 100) / 100, left: describeTree(n.left), right: describeTree(n.right), n: n.n });
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;
const r3 = (v) => (v == null ? null : round(v, 3));
const pack = (e) => ({ n: e.n, positives: e.positives, seasons: e.seasons,
  greenness: { r: r3(e.greenness.r), skill: r3(e.greenness.skill) },
  stressed: Object.fromEntries(Object.entries(e.stressed).map(([k, v]) => [k, { auc: r3(v.auc), ...(v.brier != null ? { brier: round(v.brier, 4), skill: r3(v.skill) } : {}) }])) });
const out = {
  provenance: {
    status: 'REAL', method: 'scripts/build/train_stress_model.mjs',
    area: 'each upazila’s Rabi (Jan–Feb) MODIS NDVI z-score against its own trend (engine/landsat.js landSummary)',
    field: 'a registered field’s MODIS 250 m Rabi NDVI one standard deviation or more below its own trend (fieldGreen)',
    clues: 'NASA POWER daily weather (station-corrected) and GWETROOT root-zone soil wetness (MERRA-2), each as the difference from that place’s own 2002–2025 normal',
    validation: 'leave one season out: each season is predicted by models that never saw it',
    caveat: 'seven places and 24 seasons: a guide to which weather matters, not a forecast of a field’s crop',
    built: new Date().toISOString().slice(0, 10),
  },
  features: FEATURES,
  area: pack(evalArea),
  field: pack(evalField),
  perPlace: Object.fromEntries(Object.entries(perPlace).map(([u, v]) => [u, { n: v.n, r: r3(v.r), skill: r3(v.skill), rain: r3(v.rain), warm: r3(v.warm) }])),
  ridge: { b: round(rg.b), w: rg.w.map((v) => round(v)) },
  logistic: { b: round(lg.b), w: lg.w.map((v) => round(v)), mu: lg.mu.map((v) => round(v)), sd: lg.sd.map((v) => round(v)) },
  tree: describeTree(tr.root),
  normal: Object.fromEntries(Object.entries(normal).map(([u, v]) => [u, v.map((x) => [round(x.m, 3), round(x.s, 3)])])),
  baseRate: round(mean(yv), 4),
};
await mkdir(path.join(ROOT, 'src', 'data', 'models'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'models', 'stress_model.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`area: ${out.area.n} upazila-seasons; greenness r ${out.area.greenness.r}, skill ${out.area.greenness.skill}; stressed AUC ridge ${out.area.stressed.ridge.auc} logistic ${out.area.stressed.logistic.auc} tree ${out.area.stressed.tree.auc}; Brier skill logistic ${out.area.stressed.logistic.skill} tree ${out.area.stressed.tree.skill}`);
console.log(`field: ${out.field.n} field-seasons; greenness r ${out.field.greenness.r}; stressed AUC ridge ${out.field.stressed.ridge.auc} logistic ${out.field.stressed.logistic.auc}`);
console.log('per place', JSON.stringify(out.perPlace));
console.log('ridge weights', FEATURES.map((f, j) => `${f.k} ${out.ridge.w[j]}`).join(', '));
console.log('tree', JSON.stringify(out.tree));
