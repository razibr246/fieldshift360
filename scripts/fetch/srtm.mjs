#!/usr/bin/env node
// The lie of the land at every registered field, from NASA SRTM (Shuttle Radar Topography Mission, 1 arc-second,
// about 30 m), read through the free Open Topo Data API (no key, 100 points a request, one request a second):
//   elev    height above sea level at the field, m
//   relief  the field's height minus the mean of a ring 500 m round it: below zero the field sits in a hollow where
//           water gathers (waterlogging and flood risk); above zero it sheds water
//   slope   the steepest fall to a ring 150 m round it, per cent: steeper ground loses more soil to rain (erosion)
// SRTM measured the top of whatever stood there in February 2000 (crops, trees, roofs), with a few metres of error,
// so these are coarse classes for local review, not a survey. Writes src/data/land/field_terrain.json.
// Usage: npm run fetch:terrain
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://api.opentopodata.org/v1/srtm30m';
const { parcels } = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'fields', 'parcels.json')));

// metres to degrees at this latitude
const off = (lat, lon, dn, de) => [lat + dn / 111320, lon + de / (111320 * Math.cos((lat * Math.PI) / 180))];
const ring = (lat, lon, r) => Array.from({ length: 8 }, (_, k) => off(lat, lon, r * Math.cos((k * Math.PI) / 4), r * Math.sin((k * Math.PI) / 4)));

const asks = []; // [field id, role, lat, lon]
for (const p of parcels) {
  asks.push([p.id, 'c', p.lat, p.lon]);
  for (const [a, b] of ring(p.lat, p.lon, 150)) asks.push([p.id, 'r150', a, b]);
  for (const [a, b] of ring(p.lat, p.lon, 500)) asks.push([p.id, 'r500', a, b]);
}
const heights = [];
for (let i = 0; i < asks.length; i += 100) {
  const part = asks.slice(i, i + 100);
  const loc = part.map(([, , a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join('|');
  let js = null;
  for (let k = 0; k < 4 && !js; k++) {
    try { const r = await fetch(`${API}?locations=${loc}`, { signal: AbortSignal.timeout(60_000) }); if (r.ok) js = await r.json(); } catch { /* retry */ }
    if (!js) await new Promise((res) => setTimeout(res, 2000 * (k + 1)));
  }
  if (!js || js.status !== 'OK') { console.error(`Open Topo Data did not answer for points ${i}–${i + part.length}; nothing written`); process.exit(1); }
  heights.push(...js.results.map((r) => r.elevation));
  console.log(`  ${Math.min(i + 100, asks.length)}/${asks.length} points`);
  await new Promise((res) => setTimeout(res, 1100));
}
const fields = {};
asks.forEach(([id, role], k) => { const h = heights[k]; if (h == null) return; ((fields[id] ??= { r150: [], r500: [] })[role] ??= []); if (role === 'c') fields[id].c = h; else fields[id][role].push(h); });
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const out = {
  provenance: {
    status: 'REAL', dataset: 'NASA SRTM 1 arc-second global (SRTMGL1, about 30 m), via Open Topo Data', url: 'https://www.opentopodata.org/datasets/srtm/',
    nasa: 'https://lpdaac.usgs.gov/products/srtmgl1v003/', retrieved: new Date().toISOString().slice(0, 10),
    method: 'height at the field; relief = field height − mean of 8 points 500 m round it; slope = steepest fall to 8 points 150 m round it',
    caveat: 'SRTM is the surface in February 2000 (crop, tree and roof tops included) with a few metres of error: coarse classes for local review, not a survey',
  },
  fields: Object.fromEntries(Object.entries(fields).map(([id, f]) => [id, {
    elev: Math.round(f.c * 10) / 10,
    relief: Math.round((f.c - mean(f.r500)) * 10) / 10,
    slope: Math.round((Math.max(...f.r150.map((h) => Math.abs(f.c - h))) / 150) * 1000) / 10,
  }])),
};
await mkdir(path.join(ROOT, 'src', 'data', 'land'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'land', 'field_terrain.json'), `${JSON.stringify(out, null, 1)}\n`);
for (const [id, f] of Object.entries(out.fields)) console.log(`  ${id}: ${f.elev} m, relief ${f.relief} m, slope ${f.slope}%`);
