#!/usr/bin/env node
// Each registered field's own Rabi greenness from NASA MODIS (MOD13Q1 v6.1, 250 m, 16-day NDVI), through the ORNL
// DAAC MODIS web service (no login): every January–February composite since 2001. One request per upazila per year
// returns a small grid of pixels round all that upazila's fields, and each field's own pixel is picked out of it
// (MODIS sinusoidal projection). A 250 m pixel is about 15 bigha, so it is the field and its near neighbours. Clouds
// pull NDVI down, so each month keeps its highest composite. About 180 slow requests: half an hour.
// Writes src/data/land/field_ndvi.json. Usage: npm run fetch:fields-ndvi
import { readFileSync, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'src', 'data', 'land', 'field_ndvi.json');
const API = 'https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset';
const { parcels } = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'fields', 'parcels.json')));
const NOW = new Date().getUTCFullYear();
const R = 6371007.181, RAD = Math.PI / 180; // the MODIS sinusoidal sphere

// Resume: fields already in the file are kept; only the missing ones are fetched (a field that fell outside its
// upazila's grid is fetched on its own, as a grid of one).
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT)).fields ?? {} : {};
const missing = parcels.filter((p) => !Object.keys(prev[p.id] ?? {}).length);
const solo = Object.keys(prev).length > 0;
// the fields of each upazila, and a grid round them all (km each way from the middle)
const groups = {};
for (const p of missing) (groups[solo ? p.id : p.upazila] ??= []).push(p);
const boxes = Object.entries(groups).map(([u, ps]) => {
  const lat = ps.map((p) => p.lat), lon = ps.map((p) => p.lon);
  const c = [(Math.min(...lat) + Math.max(...lat)) / 2, (Math.min(...lon) + Math.max(...lon)) / 2];
  const ns = (Math.max(...lat) - Math.min(...lat)) * 111, ew = (Math.max(...lon) - Math.min(...lon)) * 111 * Math.cos(c[0] * RAD);
  return { u, ps, c, kmNS: Math.ceil(ns / 2) + 1, kmEW: Math.ceil(ew / 2) + 1 };
});
const jobs = [];
for (const b of boxes) for (let y = 2001; y <= NOW; y++) jobs.push([b, y]);

async function get(b, y) {
  const q = new URLSearchParams({ latitude: b.c[0], longitude: b.c[1], startDate: `A${y}001`, endDate: `A${y}049`, kmAboveBelow: b.kmNS, kmLeftRight: b.kmEW, band: '250m_16_days_NDVI' });
  for (let k = 0; k < 5; k++) {
    try {
      const r = await fetch(`${API}?${q}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(240_000) });
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 5000 * (k + 1)));
  }
  return null;
}
// a field's pixel in the returned grid (rows run from the top)
function pixel(js, lat, lon) {
  const x = R * lon * RAD * Math.cos(lat * RAD), y = R * lat * RAD;
  const col = Math.floor((x - Number(js.xllcorner)) / js.cellsize), up = Math.floor((y - Number(js.yllcorner)) / js.cellsize);
  if (col < 0 || col >= js.ncols || up < 0 || up >= js.nrows) return -1;
  return (js.nrows - 1 - up) * js.ncols + col;
}

const fields = { ...prev };
let n = 0, failed = 0, i = 0;
console.log(`${jobs.length} requests (${boxes.length} ${solo ? 'missing fields' : 'upazilas'} × ${NOW - 2000} years)`);
async function worker() {
  while (i < jobs.length) {
    const [b, y] = jobs[i++];
    const js = await get(b, y);
    n++;
    if (!js?.subset) { failed++; console.log(`  ${b.u} ${y}: no answer`); continue; }
    for (const c of js.subset) {
      const ym = c.calendar_date.slice(0, 7);
      for (const p of b.ps) {
        const k = pixel(js, p.lat, p.lon), v = k >= 0 ? c.data[k] : null;
        if (v == null || v <= -3000) continue;
        const ndvi = Math.round(v * Number(js.scale || 0.0001) * 1000) / 1000;
        const f = (fields[p.id] ??= {});
        f[ym] = Math.max(f[ym] ?? -1, ndvi);
      }
    }
    if (n % 20 === 0) console.log(`  ${n}/${jobs.length} (${failed} failed)`);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const out = {
  provenance: {
    status: 'REAL', dataset: 'NASA MODIS Terra MOD13Q1 v6.1, 250 m 16-day NDVI', service: 'ORNL DAAC MODIS web service', url: 'https://modis.ornl.gov/data/modis_webservice.html',
    method: 'the 250 m pixel holding each registered field’s centre, January–February of every year; each month keeps its highest composite (clouds pull NDVI down)',
    retrieved: new Date().toISOString().slice(0, 10), failedRequests: failed,
  },
  fields: Object.fromEntries(Object.entries(fields).map(([id, s]) => [id, Object.fromEntries(Object.entries(s).sort())])),
};
if (failed > jobs.length / 4) { console.error(`${failed} of ${jobs.length} requests failed; nothing written, run again later`); process.exit(1); }
await writeFile(OUT, JSON.stringify(out));
console.log(`done: ${Object.keys(out.fields).length} fields, ${failed} requests failed`);
