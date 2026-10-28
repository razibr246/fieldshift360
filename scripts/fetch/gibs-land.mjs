#!/usr/bin/env node
// What the land itself did, month by month, 2001 to now, at each upazila centre and each neighbouring-country farm,
// from three NASA records served by NASA GIBS (no login):
//   ndvi  MODIS Terra monthly NDVI (MOD13C2 family, MODIS_Terra_L3_NDVI_Monthly): how green the land is; low in the
//         months fields lie bare, and below its usual value in a season of vegetation stress
//   lst   MODIS Terra monthly daytime land surface temperature (MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day), in °C:
//         heat at the ground, which the crop feels, not the air temperature 2 m up
//   evap  NASA GMAO MERRA-2 monthly land evaporation (MERRA2_Evaporation_Land_Monthly), in mm a day: the water the land
//         and its plants give back to the air (evapotranspiration), a model fed by satellite and station data
// GIBS serves each as a colour-mapped PNG; each pixel is turned back into its value with the layer's own published
// colour map (scripts/lib/gibs.mjs), the median of the 3×3 pixels (0.05°, about 5 km) round each point.
// Writes src/data/land/land_sat.json. Usage: npm run fetch:land
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colourMap, getMap } from '../lib/gibs.mjs';
import { UPAZILAS } from '../../src/data/upazilas.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAYERS = {
  ndvi: { id: 'MODIS_Terra_L3_NDVI_Monthly', cmap: 'MODIS_L3_NDVI', to: (v) => Math.round(v * 1000) / 1000 },
  lst: { id: 'MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day', cmap: 'MODIS_Land_Surface_Temp', to: (v) => Math.round((v - 273.15) * 10) / 10 },
  evap: { id: 'MERRA2_Evaporation_Land_Monthly', cmap: 'MERRA2_Evaporation_Land_Monthly', to: (v) => Math.round(v * 86400 * 100) / 100 },
};
// One image covers every point: 20–31° N, 67–96° E at 0.05° a pixel.
const BBOX = { s: 20, w: 67, n: 31, e: 96 }, RES = 0.05;
const WIDTH = Math.round((BBOX.e - BBOX.w) / RES), HEIGHT = Math.round((BBOX.n - BBOX.s) / RES);
const FROM = 2001, TO = new Date().getUTCFullYear();

const points = {};
for (const id of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) points[id] = UPAZILAS[id].center;
for (const c of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar']) {
  const f = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'abroad', `${c}.json`))).points.farm;
  points[c] = [f.lat, f.lon];
}

function sample(img, map, [lat, lon]) {
  const cx = Math.floor((lon - BBOX.w) / RES), cy = Math.floor((BBOX.n - lat) / RES), v = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
    const o = (y * img.w + x) * 4;
    if (img.px[o + 3] < 128) continue;
    const val = map.get(`${img.px[o]},${img.px[o + 1]},${img.px[o + 2]}`);
    if (val != null && Number.isFinite(val)) v.push(val);
  }
  if (!v.length) return null;
  v.sort((a, b) => a - b);
  return v[v.length >> 1];
}
async function pool(items, n, f) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await f(items[k], k); } }));
}

const months = [];
for (let y = FROM; y <= TO; y++) for (let m = 1; m <= 12; m++) months.push(`${y}-${String(m).padStart(2, '0')}`);
const out = {
  provenance: {
    status: 'REAL', service: 'NASA GIBS WMS (EPSG:4326, best available)', url: 'https://nasa-gibs.github.io/gibs-api-docs/',
    ndvi: { layer: LAYERS.ndvi.id, dataset: 'NASA MODIS Terra monthly NDVI (MOD13C2 family), via NASA GIBS', unit: 'NDVI, −1 to 1' },
    lst: { layer: LAYERS.lst.id, dataset: 'NASA MODIS Terra monthly daytime land surface temperature (MOD11C3 family), via NASA GIBS', unit: '°C at the ground surface' },
    evap: { layer: LAYERS.evap.id, dataset: 'NASA GMAO MERRA-2 monthly land evaporation (evapotranspiration), via NASA GIBS', unit: 'mm a day' },
    method: 'colour-mapped pixels turned back into values with each layer’s GIBS colour map (the middle of each colour class); median of the 3×3 pixels (0.05°) round each point',
    retrieved: new Date().toISOString().slice(0, 10),
  },
  points: Object.fromEntries(Object.entries(points).map(([id, at]) => [id, { at, ndvi: {}, lst: {}, evap: {} }])),
};
for (const [key, L] of Object.entries(LAYERS)) {
  const map = await colourMap(L.cmap);
  let done = 0, empty = 0;
  console.log(`${key}: ${months.length} months`);
  await pool(months, 6, async (mo) => {
    const img = await getMap(L.id, BBOX, WIDTH, HEIGHT, `${mo}-01`);
    done++;
    if (done % 60 === 0) console.log(`  ${done}/${months.length}`);
    if (!img) { empty++; return; }
    for (const [id, at] of Object.entries(points)) {
      const v = sample(img, map, at);
      if (v != null) out.points[id][key][mo] = L.to(v);
    }
  });
  console.log(`  ${key}: ${empty} months without an image`);
}
// keep each series in month order
for (const p of Object.values(out.points)) for (const key of Object.keys(LAYERS)) p[key] = Object.fromEntries(Object.entries(p[key]).sort());
await mkdir(path.join(ROOT, 'src', 'data', 'land'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'land', 'land_sat.json'), JSON.stringify(out));
for (const [id, p] of Object.entries(out.points)) console.log(`  ${id}: NDVI ${Object.keys(p.ndvi).length}, LST ${Object.keys(p.lst).length}, evaporation ${Object.keys(p.evap).length} months`);
