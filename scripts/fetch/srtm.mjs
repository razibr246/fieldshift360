#!/usr/bin/env node
// The lie of the land at every registered field, from two independent NASA elevation models, both about 30 m:
// SRTM (Shuttle Radar Topography Mission, radar, February 2000) and ASTER GDEM v3 (NASA and Japan's METI, stereo
// images 2000–2013), read through the free Open Topo Data API (no key, 100 points a request, one a second).
// Each point's height is the mean of the two models, which halves much of their random error:
//   elev    height above sea level at the field (the mean of the centre and four points 30 m round it), m
//   relief  the field's height minus the mean of a ring 500 m round it: below zero the field sits in a hollow where
//           water gathers (waterlogging and flood risk); above zero it sheds water
//   slope   the tilt of a plane fitted through all 25 points out to 500 m, per cent (a fit, not the single steepest
//           step, so one noisy point does not make a slope): steeper ground loses more soil to rain (erosion)
//   spread  how far the two models disagree at these points on average, m: this field's own uncertainty
// Both models see the top of whatever stood there (crops, trees, roofs), so these are classes for local review, not a
// survey. Writes src/data/land/field_terrain.json.
// Usage: npm run fetch:terrain
import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const API = 'https://api.opentopodata.org/v1';
const MODELS = ['srtm30m', 'aster30m'];
const { parcels } = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', 'fields', 'parcels.json')));

// metres to degrees at this latitude
const off = (lat, lon, dn, de) => [lat + dn / 111320, lon + de / (111320 * Math.cos((lat * Math.PI) / 180))];
const ring = (lat, lon, r) => Array.from({ length: 8 }, (_, k) => off(lat, lon, r * Math.cos((k * Math.PI) / 4), r * Math.sin((k * Math.PI) / 4)));

const asks = []; // [field id, role, lat, lon, east m, north m]
for (const p of parcels) {
  asks.push([p.id, 'c', p.lat, p.lon, 0, 0]);
  for (const r of [30, 100, 250, 500]) for (let k = 0; k < (r === 30 ? 4 : 8); k++) {
    const ang = (k * Math.PI * 2) / (r === 30 ? 4 : 8), dn = r * Math.cos(ang), de = r * Math.sin(ang);
    const [a, b] = off(p.lat, p.lon, dn, de);
    asks.push([p.id, r === 30 ? 'c' : `r${r}`, a, b, de, dn]);
  }
}
async function heightsOf(model) {
  const out = [];
  for (let i = 0; i < asks.length; i += 100) {
    const part = asks.slice(i, i + 100);
    const loc = part.map(([, , a, b]) => `${a.toFixed(6)},${b.toFixed(6)}`).join('|');
    let js = null;
    for (let k = 0; k < 4 && !js; k++) {
      try { const r = await fetch(`${API}/${model}?locations=${loc}`, { signal: AbortSignal.timeout(60_000) }); if (r.ok) js = await r.json(); } catch { /* retry */ }
      if (!js) await new Promise((res) => setTimeout(res, 2000 * (k + 1)));
    }
    if (!js || js.status !== 'OK') { console.error(`Open Topo Data (${model}) did not answer for points ${i}–${i + part.length}; nothing written`); process.exit(1); }
    out.push(...js.results.map((r) => r.elevation));
    console.log(`  ${model}: ${Math.min(i + 100, asks.length)}/${asks.length} points`);
    await new Promise((res) => setTimeout(res, 1100));
  }
  return out;
}
const [srtm, aster] = [await heightsOf(MODELS[0]), await heightsOf(MODELS[1])];
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
const fields = {};
asks.forEach(([id, role, , , x, y], k) => {
  const both = [srtm[k], aster[k]].filter((h) => h != null);
  if (!both.length) return;
  const f = (fields[id] ??= { c: [], r500: [], pts: [], spread: [] });
  const h = mean(both);
  if (role === 'c') f.c.push(h);
  if (role === 'r500') f.r500.push(h);
  f.pts.push([x, y, h]);
  if (both.length === 2) f.spread.push(Math.abs(srtm[k] - aster[k]));
});
// least-squares plane h = a + b·x + c·y through the points; its tilt is the slope
function tilt(pts) {
  const n = pts.length, mx = mean(pts.map((p) => p[0])), my = mean(pts.map((p) => p[1])), mh = mean(pts.map((p) => p[2]));
  let sxx = 0, syy = 0, sxy = 0, sxh = 0, syh = 0;
  for (const [x, y, h] of pts) { const dx = x - mx, dy = y - my, dh = h - mh; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; sxh += dx * dh; syh += dy * dh; }
  const det = sxx * syy - sxy * sxy || 1, b = (sxh * syy - syh * sxy) / det, c = (syh * sxx - sxh * sxy) / det;
  return n ? Math.hypot(b, c) * 100 : 0;
}
const out = {
  provenance: {
    status: 'REAL', dataset: 'NASA SRTM 1 arc-second (SRTMGL1, February 2000) and NASA/METI ASTER GDEM v3 (2000–2013), both about 30 m, via Open Topo Data',
    url: 'https://www.opentopodata.org/', nasa: ['https://lpdaac.usgs.gov/products/srtmgl1v003/', 'https://lpdaac.usgs.gov/products/astgtmv003/'], retrieved: new Date().toISOString().slice(0, 10),
    method: 'each point is the mean of the two models; elev = centre and 4 points 30 m round it; relief = elev − mean of 8 points 500 m round it; slope = tilt of a least-squares plane through all 25 points out to 500 m; spread = mean disagreement of the two models',
    caveat: 'both models see the surface (crop, tree and roof tops) with metres of error, shown per field as spread: coarse classes for local review, not a survey',
  },
  fields: Object.fromEntries(Object.entries(fields).map(([id, f]) => [id, {
    elev: Math.round(mean(f.c) * 10) / 10,
    relief: Math.round((mean(f.c) - mean(f.r500)) * 10) / 10,
    slope: Math.round(tilt(f.pts) * 100) / 100,
    spread: Math.round(mean(f.spread) * 10) / 10,
  }])),
};
await mkdir(path.join(ROOT, 'src', 'data', 'land'), { recursive: true });
await writeFile(path.join(ROOT, 'src', 'data', 'land', 'field_terrain.json'), `${JSON.stringify(out, null, 1)}\n`);
for (const [id, f] of Object.entries(out.fields)) console.log(`  ${id}: ${f.elev} m, relief ${f.relief} m, slope ${f.slope}%, models differ by ${f.spread} m`);
