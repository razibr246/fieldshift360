#!/usr/bin/env node
// Each registered field's Rabi greenness a generation ago, from NASA/USGS Landsat: the Web-Enabled Landsat Data
// (WELD) global monthly NDVI, 30 m, served by NASA GIBS (no login). WELD covers three epochs only (1984–1986,
// 1988–1991, 1998–2001); every December–March month in them is read. One GetMap request per upazila per month covers
// all its fields at about 30 m a pixel; each field is the median of the pixels within about 45 m of its centre.
// GIBS serves a colour-mapped PNG whose colours are blended between the colour map's stops, so each pixel takes the
// value of the nearest stop (the stops are 0.03 NDVI apart). Pure black is both the top stop and "no data" in this
// layer, so it is dropped. Writes src/data/land/field_landsat.json. Usage: npm run fetch:landsat
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colourMap, getMap } from '../lib/gibs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LAYER = 'Landsat_WELD_NDVI_Global_Monthly';
const RES = 0.00027; // about 30 m
const EPOCHS = [[1984, 3, 1986, 11], [1988, 12, 1991, 11], [1998, 12, 2001, 11]]; // GIBS time ranges of the layer
const { parcels } = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'fields', 'parcels.json')));

const months = [];
for (const [y0, m0, y1, m1] of EPOCHS) {
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, m = 1) : m++) {
    if ([12, 1, 2, 3].includes(m)) months.push(`${y}-${String(m).padStart(2, '0')}`);
  }
}
const groups = {};
for (const p of parcels) (groups[p.upazila] ??= []).push(p);

const cmap = await colourMap(LAYER);
const stops = [...cmap.entries()].map(([k, v]) => [k.split(',').map(Number), v]).filter(([c]) => c.some((x) => x > 0));
const nearest = (r, g, b) => {
  let best = null, bd = Infinity;
  for (const [[R, G, B], v] of stops) { const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2; if (d < bd) { bd = d; best = v; } }
  return bd <= 30 ** 2 ? best : null; // far from every stop: not part of the colour scale
};

const fields = {};
let requests = 0, empty = 0;
for (const [u, ps] of Object.entries(groups)) {
  const lat = ps.map((p) => p.lat), lon = ps.map((p) => p.lon), pad = 0.003;
  const box = { s: Math.min(...lat) - pad, n: Math.max(...lat) + pad, w: Math.min(...lon) - pad, e: Math.max(...lon) + pad };
  const W = Math.max(8, Math.round((box.e - box.w) / RES)), H = Math.max(8, Math.round((box.n - box.s) / RES));
  for (const ym of months) {
    const img = await getMap(LAYER, box, W, H, `${ym}-01`);
    requests++;
    if (!img) { empty++; continue; }
    for (const p of ps) {
      const cx = Math.floor(((p.lon - box.w) / (box.e - box.w)) * img.w), cy = Math.floor(((box.n - p.lat) / (box.n - box.s)) * img.h);
      const v = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
        const o = (y * img.w + x) * 4;
        if (img.px[o + 3] < 128 || (img.px[o] + img.px[o + 1] + img.px[o + 2]) === 0) continue;
        const val = nearest(img.px[o], img.px[o + 1], img.px[o + 2]);
        if (val != null) v.push(val);
      }
      if (v.length < 5) continue; // fewer than five usable pixels of nine: cloud, gap or edge
      v.sort((a, b) => a - b);
      (fields[p.id] ??= {})[ym] = Math.round(v[v.length >> 1] * 1000) / 1000;
    }
    if (requests % 20 === 0) console.log(`  ${requests}/${Object.keys(groups).length * months.length}`);
  }
}
const out = {
  provenance: {
    status: 'REAL', dataset: 'NASA/USGS Web-Enabled Landsat Data (WELD) global monthly NDVI, 30 m, via NASA GIBS', layer: LAYER,
    url: 'https://nasa-gibs.github.io/gibs-api-docs/', epochs: '1984–1986, 1988–1991, 1998–2001 (December–March months only)',
    method: 'median of the 3×3 pixels (about 90 m) at each registered field’s centre; each pixel decoded to the nearest stop of the layer’s GIBS colour map; black (no data) dropped; at least 5 usable pixels',
    caveat: 'Landsat (30 m) and MODIS (250 m) are different sensors at different scales: compare the direction of change, not small differences',
    retrieved: new Date().toISOString().slice(0, 10), requests, emptyRequests: empty,
  },
  fields: Object.fromEntries(Object.entries(fields).map(([id, s]) => [id, Object.fromEntries(Object.entries(s).sort())])),
};
await writeFile(path.join(ROOT, 'src', 'data', 'land', 'field_landsat.json'), JSON.stringify(out));
console.log(`done: ${Object.keys(out.fields).length} of ${parcels.length} fields, ${requests} requests (${empty} empty)`);
