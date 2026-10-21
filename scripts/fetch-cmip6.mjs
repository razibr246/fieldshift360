#!/usr/bin/env node
// Download REAL future-climate change signals for each upazila from NASA NEX-GDDP-CMIP6 v2.0 (no login needed) and
// write src/data/cmip6_deltas.json for the Field Future page.
//
//   npm run fetch:cmip6
//   npm run fetch:cmip6 -- --assemble   # only write the file from what is already downloaded
//
// NEX-GDDP-CMIP6 (NASA Center for Climate Simulation; Thrasher et al. 2022, Scientific Data 9:262) is CMIP6 daily
// climate, bias-corrected and downscaled to 0.25°. For each upazila's 0.25° cell this reads daily tasmax, tasmin and pr
// from NASA's THREDDS server (NetCDF Subset Service, one point, one year per request) for:
//   historical 2005–2014 (the last ten years of the CMIP6 historical run) and
//   SSP2-4.5 and SSP5-8.5, 2041–2050,
// for eight models, and keeps each model's monthly change: Tmax and Tmin in °C (future minus historical) and rain as a
// ratio (future over historical). The app adds these to the upazila's own measured NASA POWER days ("delta change"),
// so the future keeps the real day-to-day weather of the place and only shifts its level by what the models project.
// Requests are cached in scripts/.cache/cmip6, so a stopped run picks up where it left off.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'scripts', '.cache', 'cmip6');
const OUT = path.join(ROOT, 'src', 'data', 'cmip6_deltas.json');
const BASE = 'https://ds.nccs.nasa.gov/thredds';
const DS = 'AMES/NEX/GDDP-CMIP6';

// Models with an r1i1p1f1 run of all three variables, from different modelling centres.
const MODELS = ['ACCESS-CM2', 'EC-Earth3', 'GFDL-ESM4', 'IPSL-CM6A-LR', 'MIROC6', 'MPI-ESM1-2-HR', 'MRI-ESM2-0', 'NorESM2-MM'];
const VARS = ['tasmax', 'tasmin', 'pr'];
const HIST = [2005, 2014];
const FUT = [2041, 2050];
const SCEN = ['ssp245', 'ssp585'];
// The upazilas the app has NASA POWER records for (same points as src/data/climate_<id>.json).
const UPAZILAS = {
  godagari: [24.4667, 88.3306], dhamrai: [23.93, 90.14], dohar: [23.6063, 90.0882],
  keraniganj: [23.7015, 90.3224], nawabganj: [23.663, 90.1991], savar: [23.8859, 90.2906],
  sitakunda: [22.6167, 91.6667], dacope: [22.5726, 89.5115], bakerganj: [22.55, 90.3333], gangachara: [25.85, 89.2167], gowainghat: [25.105, 91.967],
  // The sample farms of the neighbouring countries (src/data/abroad.js).
  abroad_india: [30.26, 75.8], abroad_pakistan: [26.8, 67.72], abroad_nepal: [28.56, 81.1], abroad_bhutan: [27.5208, 89.8808], abroad_myanmar: [20.93, 94.864],
};
const cellOf = ([lat, lon]) => [Math.floor(lat * 4) / 4 + 0.125, Math.floor(lon * 4) / 4 + 0.125];
const CONC = Number(process.env.CMIP6_CONC ?? 8);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 5) {
  for (let k = 0; k < tries; k++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      if (r.ok) return await r.text();
      if (r.status === 404) throw Object.assign(new Error(`404 ${url}`), { fatal: true });
    } catch (e) { if (e.fatal) throw e; }
    await sleep(2000 * (k + 1));
  }
  throw new Error(`failed: ${url}`);
}

// File names differ between models and versions (_v2.0, _v1.1), so they are read from the catalogue.
const catalogs = new Map();
async function fileFor(model, scen, v, year) {
  const key = `${model}/${scen}/${v}`;
  if (!catalogs.has(key)) {
    const xml = await get(`${BASE}/catalog/${DS}/${model}/${scen}/r1i1p1f1/${v}/catalog.xml`);
    const names = [...xml.matchAll(/<dataset name="([^"]+\.nc)"/g)].map((m) => m[1]);
    catalogs.set(key, names);
  }
  const names = catalogs.get(key).filter((n) => n.includes(`_${year}`));
  return names.find((n) => n.includes('_v2.0')) ?? names.find((n) => n.includes('_v1.1')) ?? names[0] ?? null;
}

// Monthly sums and counts of one variable for one year at one cell.
async function monthly(model, scen, v, year, [lat, lon], cachedOnly = false) {
  const cf = path.join(CACHE, `${model}_${scen}_${v}_${year}_${lat}_${lon}.json`);
  try { return JSON.parse(await readFile(cf, 'utf8')); } catch { if (cachedOnly) return null; }
  const f = await fileFor(model, scen, v, year);
  if (!f) throw new Error(`no file for ${model} ${scen} ${v} ${year}`);
  const q = new URLSearchParams({ var: v, latitude: lat, longitude: lon, time_start: `${year}-01-01T00:00:00Z`, time_end: `${year}-12-31T23:59:59Z`, accept: 'csv' });
  const csv = await get(`${BASE}/ncss/grid/${DS}/${model}/${scen}/r1i1p1f1/${v}/${f}?${q}`);
  const sum = new Array(12).fill(0), n = new Array(12).fill(0);
  let at = null;
  for (const line of csv.split('\n').slice(1)) {
    const c = line.split(',');
    if (c.length < 5) continue;
    const m = Number(c[0].slice(5, 7)) - 1, x = Number(c[4]);
    if (!Number.isFinite(x)) continue;
    at ??= [Number(c[2]), Number(c[3])];
    sum[m] += v === 'pr' ? x * 86400 : x - 273.15; n[m]++; // kg m⁻² s⁻¹ → mm/day; K → °C
  }
  const out = { sum, n, at };
  await writeFile(cf, JSON.stringify(out));
  return out;
}

// A small pool so NASA's server is not hit with hundreds of requests at once.
async function pool(jobs, conc) {
  let i = 0, done = 0, failed = 0;
  const results = new Array(jobs.length);
  await Promise.all(Array.from({ length: conc }, async () => {
    while (i < jobs.length) {
      const k = i++;
      // One request that keeps failing does not stop the rest; it is left out and a rerun fetches it.
      try { results[k] = await jobs[k](); } catch (e) { failed++; console.log(`  skipped: ${String(e.message).slice(0, 160)}`); }
      if (++done % 25 === 0 || done === jobs.length) console.log(`  ${done}/${jobs.length}`);
    }
  }));
  if (failed) console.log(`${failed} request(s) failed; run again to fetch them`);
  return results;
}

await mkdir(CACHE, { recursive: true });
const cells = new Map(); // "lat,lon" -> [lat, lon]
for (const p of Object.values(UPAZILAS)) { const c = cellOf(p); cells.set(c.join(','), c); }
console.log(`NEX-GDDP-CMIP6: ${MODELS.length} models, ${cells.size} cells`);

const years = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const jobs = [];
for (const cell of cells.values()) for (const model of MODELS) for (const v of VARS) {
  for (const y of years(...HIST)) jobs.push(() => monthly(model, 'historical', v, y, cell));
  for (const s of SCEN) for (const y of years(...FUT)) jobs.push(() => monthly(model, s, v, y, cell));
}
const ASSEMBLE = process.argv.includes('--assemble');
if (!ASSEMBLE) {
  console.log(`${jobs.length} point-year requests (cached ones are instant)`);
  await pool(jobs, CONC);
}

// Monthly means over a period, then each model's change.
async function meanOf(model, scen, v, [a, b], cell) {
  const sum = new Array(12).fill(0), n = new Array(12).fill(0);
  for (const y of years(a, b)) {
    const r = await monthly(model, scen, v, y, cell, true);
    if (!r) throw Object.assign(new Error('incomplete'), { incomplete: true });
    r.sum.forEach((x, m) => { sum[m] += x; n[m] += r.n[m]; });
  }
  return sum.map((x, m) => x / n[m]);
}
const r2 = (x) => Math.round(x * 100) / 100;
const out = {};
for (const [key, cell] of cells) {
  const c = { cell, scenarios: {} };
  try {
  for (const s of SCEN) {
    const models = {};
    for (const model of MODELS) {
      const h = { tmax: await meanOf(model, 'historical', 'tasmax', HIST, cell), tmin: await meanOf(model, 'historical', 'tasmin', HIST, cell), pr: await meanOf(model, 'historical', 'pr', HIST, cell) };
      const f = { tmax: await meanOf(model, s, 'tasmax', FUT, cell), tmin: await meanOf(model, s, 'tasmin', FUT, cell), pr: await meanOf(model, s, 'pr', FUT, cell) };
      models[model] = {
        dTmax: f.tmax.map((x, m) => r2(x - h.tmax[m])),
        dTmin: f.tmin.map((x, m) => r2(x - h.tmin[m])),
        // Dry-season months have almost no rain, where a ratio means little; it is kept between 0.5 and 2.
        rain: f.pr.map((x, m) => r2(h.pr[m] < 0.05 ? 1 : Math.min(2, Math.max(0.5, x / h.pr[m])))),
        histRainMm: r2(h.pr.reduce((a, x, m) => a + x * [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m], 0)),
        futRainMm: r2(f.pr.reduce((a, x, m) => a + x * [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m], 0)),
      };
    }
    c.scenarios[s] = models;
  }
  out[key] = c;
  } catch (e) { if (!e.incomplete) throw e; console.log(`cell ${key} not complete yet, left out`); }
}
if (!Object.keys(out).length) { console.error('no complete cell yet'); process.exit(1); }
// Each upazila's own cell, or (while a download is unfinished) the nearest complete one, which the file says.
const nearest = (p) => Object.values(out).map((c) => c.cell).sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1]))[0].join(',');
const upazilas = Object.fromEntries(Object.entries(UPAZILAS).map(([id, p]) => [id, out[cellOf(p).join(',')] ? cellOf(p).join(',') : nearest(p)]));
const borrowed = Object.entries(UPAZILAS).filter(([, p]) => !out[cellOf(p).join(',')]).map(([id]) => id);
const json = {
  provenance: {
    status: 'REAL',
    dataset: 'NASA NEX-GDDP-CMIP6 v2.0 (NASA Center for Climate Simulation), daily, 0.25°, bias-corrected and statistically downscaled CMIP6',
    citation: 'Thrasher, B. et al. (2022) NASA Global Daily Downscaled Projections, CMIP6. Scientific Data 9, 262',
    url: 'https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6',
    access: `${BASE}/ncss/grid/${DS}`,
    models: MODELS, baseline: HIST, future: FUT, scenarios: SCEN,
    method: 'Monthly delta change per model: Tmax/Tmin future minus historical (°C); rain future over historical (ratio, 0.5–2).',
    retrieved: new Date().toISOString().slice(0, 10),
    ...(borrowed.length ? { nearestCell: borrowed } : {}),
  },
  cells: out,
  upazilas,
};
await writeFile(OUT, JSON.stringify(json));
console.log(`wrote ${path.relative(ROOT, OUT)}`);
