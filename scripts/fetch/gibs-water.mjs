#!/usr/bin/env node
// Download REAL satellite water records for the app's seven upazilas and five neighbouring-country farms from NASA
// GIBS (no login needed) and write src/data/water/water_sat.json.
//
//   node scripts/fetch/gibs-water.mjs
//
// GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI: GRACE and GRACE-FO (NASA JPL mascons, CRI filtered),
//   monthly anomaly of all the water stored on and under the land (soil, groundwater, surface water), in cm of
//   water, against the 2004–2009 mean. 2002–2022 as GIBS serves it.
// SMAP_L4_Analyzed_Root_Zone_Soil_Moisture: NASA SMAP Level 4, root-zone (0–100 cm) soil moisture, m³/m³, daily
//   since 31 March 2015; two days a month are read (the 8th and 22nd) and averaged into the month.
// GIBS serves both as colour-mapped PNG images; each pixel's colour is turned back into its value with the layer's
// own GIBS colour map (classes of 0.25 cm and 0.01 m³/m³ or finer), and the 3×3 pixels around each point are
// combined by their median. Docs: https://nasa-gibs.github.io/gibs-api-docs/
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UPAZILAS } from '../../src/data/upazilas.js';
import { decodePng, colourMap, WMS } from '../lib/gibs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CAPS = 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities';
const LAYERS = {
  grace: { id: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', cmap: 'GRACE_Tellus_Liquid_Water_Equivalent_Thickness_Mascon_CRI', unit: 'cm water' },
  smap: { id: 'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture', cmap: 'SMAP_Analyzed_Soil_Moisture', unit: 'm³/m³' },
};
// One image covers every point: 20–31° N, 67–96° E at 0.05° a pixel.
const BBOX = { s: 20, w: 67, n: 31, e: 96 }, RES = 0.05;
const WIDTH = Math.round((BBOX.e - BBOX.w) / RES), HEIGHT = Math.round((BBOX.n - BBOX.s) / RES);

const points = {};
for (const id of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) points[id] = UPAZILAS[id].center;
for (const c of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar']) {
  const f = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'abroad', `${c}.json`))).points.farm;
  points[c] = [f.lat, f.lon];
}

// ---- valid dates from the capabilities' time lists ----
function datesOf(caps, layer) {
  const i = caps.indexOf(`<ows:Identifier>${layer}</ows:Identifier>`), j = caps.lastIndexOf('<Layer>', i), k = caps.indexOf('</Layer>', i);
  const out = [];
  for (const [, v] of caps.slice(j, k).matchAll(/<Value>([^<]*)<\/Value>/g)) {
    const [a, b, per] = v.split('/');
    const step = per === 'P1M' ? 'm' : per === 'P1D' ? 'd' : null;
    let t = new Date(`${a}T00:00:00Z`);
    const end = new Date(`${b}T00:00:00Z`);
    if (!step) { out.push(a); continue; }
    while (t <= end) { out.push(t.toISOString().slice(0, 10)); if (step === 'm') t.setUTCMonth(t.getUTCMonth() + 1); else t.setUTCDate(t.getUTCDate() + 1); }
  }
  return out;
}

async function image(layer, date) {
  const q = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', LAYERS: layer, CRS: 'EPSG:4326', BBOX: `${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e}`, WIDTH, HEIGHT, FORMAT: 'image/png', TIME: date });
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(`${WMS}?${q}`, { signal: AbortSignal.timeout(60_000) });
      if (r.ok && r.headers.get('content-type')?.includes('png')) return decodePng(Buffer.from(await r.arrayBuffer()));
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1500 * (k + 1)));
  }
  return null;
}
function sample(img, map, [lat, lon]) {
  const cx = Math.floor((lon - BBOX.w) / RES), cy = Math.floor((BBOX.n - lat) / RES), v = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const o = (y * img.w + x) * 4;
    if (img.px[o + 3] < 128) continue;
    const val = map.get(`${img.px[o]},${img.px[o + 1]},${img.px[o + 2]}`);
    if (val != null) v.push(val);
  }
  if (!v.length) return null;
  v.sort((a, b) => a - b);
  return v[v.length >> 1];
}
async function pool(items, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await f(items[k], k); } }));
}

console.log('reading GIBS capabilities ...');
const caps = await (await fetch(CAPS)).text();
const out = {
  provenance: {
    status: 'REAL', service: 'NASA GIBS WMS (EPSG:4326, best available)', url: 'https://nasa-gibs.github.io/gibs-api-docs/',
    grace: { layer: LAYERS.grace.id, dataset: 'GRACE and GRACE-FO JPL mascons (CRI filtered), via NASA GIBS', unit: 'cm of water, anomaly against 2004–2009', what: 'all water stored on and under the land' },
    smap: { layer: LAYERS.smap.id, dataset: 'NASA SMAP Level 4 analysed root-zone soil moisture, via NASA GIBS', unit: 'm³/m³ (0–100 cm)', sampled: 'the 8th and 22nd of each month, averaged' },
    method: 'colour-mapped pixels turned back into values with the layer’s GIBS colour map; median of the 3×3 pixels (0.05°) around each point',
    retrieved: new Date().toISOString().slice(0, 10),
  },
  points: Object.fromEntries(Object.entries(points).map(([id, at]) => [id, { at, grace: {}, smap: {} }])),
};
for (const key of ['grace', 'smap']) {
  const L = LAYERS[key], map = await colourMap(L.cmap);
  let dates = datesOf(caps, L.id);
  if (key === 'smap') dates = dates.filter((d) => d.endsWith('-08') || d.endsWith('-22'));
  console.log(`${key}: ${dates.length} images`);
  const acc = {};
  let done = 0;
  await pool(dates, 6, async (d) => {
    const img = await image(L.id, d);
    done++;
    if (done % 40 === 0) console.log(`  ${done}/${dates.length}`);
    if (!img) return;
    const month = d.slice(0, 7);
    for (const [id, at] of Object.entries(points)) {
      const v = sample(img, map, at);
      if (v != null) ((acc[id] ??= {})[month] ??= []).push(v);
    }
  });
  for (const [id, months] of Object.entries(acc)) {
    for (const m of Object.keys(months).sort()) {
      const v = months[m];
      out.points[id][key][m] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000;
    }
  }
}
await writeFile(path.join(ROOT, 'src', 'data', 'water', 'water_sat.json'), JSON.stringify(out));
for (const [id, p] of Object.entries(out.points)) console.log(`  ${id}: GRACE ${Object.keys(p.grace).length} months, SMAP ${Object.keys(p.smap).length} months`);
