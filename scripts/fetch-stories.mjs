#!/usr/bin/env node
// Download REAL daily NASA data and soil for the five division story places (Chattogram, Khulna, Barishal, Rangpur,
// Sylhet) and the hill catchment upstream of Sylhet, into src/data/stories_climate.json. No login needed.
//
//   npm run fetch:stories
//
// NASA POWER daily point (community AG): T2M_MAX, T2M_MIN (°C), PRECTOTCORR (mm/day), RH2M (%), and NASA/JAXA GPM
// IMERG daily rain (IMERG_PRECTOT, UTC days, native 0.1°). ISRIC SoilGrids 2.0 at each point: pH (H₂O), organic
// carbon, clay and sand, top 0–30 cm. Values are rounded to 0.1 to keep the file small.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'stories_climate.json');
const API = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const START = '20010101', END = '20251231';
// Upazila centres (Survey of Bangladesh / geoBoundaries), and Sohra (Cherrapunji) on the Meghalaya plateau, where the
// Sari-Gowain flash floods that reach Gowainghat begin.
const POINTS = {
  sitakunda: { lat: 22.6167, lon: 91.6667, soil: true },
  dacope: { lat: 22.5726, lon: 89.5115, soil: true },
  bakerganj: { lat: 22.55, lon: 90.3333, soil: true },
  gangachara: { lat: 25.85, lon: 89.2167, soil: true },
  gowainghat: { lat: 25.105, lon: 91.967, soil: true },
  sohra: { lat: 25.2702, lon: 91.7323, soil: false },
};

const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
const keys = [];
for (let d = new Date(`${iso(START)}T00:00:00Z`), e = new Date(`${iso(END)}T00:00:00Z`); d <= e; d.setUTCDate(d.getUTCDate() + 1)) keys.push(d.toISOString().slice(0, 10).replaceAll('-', ''));

async function power(lat, lon, params, extra = {}) {
  const q = new URLSearchParams({ parameters: params, community: 'AG', latitude: lat, longitude: lon, start: START, end: END, format: 'JSON', ...extra });
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(300_000) }).catch(() => null);
    if (r?.ok) { const j = await r.json(); return { p: j.properties.parameter, fill: j.header?.fill_value ?? -999, version: j.header?.api?.version }; }
    await new Promise((res) => setTimeout(res, 3000 * (k + 1)));
  }
  throw new Error(`NASA POWER failed for ${lat},${lon} ${params}`);
}
const series = (p, name, fill) => keys.map((k) => { const v = p[name]?.[k]; return v == null || v === fill || v <= -998 ? null : Math.round(v * 10) / 10; });

// SoilGrids: thickness-weighted 0–30 cm mean of the 0–5, 5–15 and 15–30 cm layers.
async function soil(lat, lon) {
  const q = new URLSearchParams({ lon, lat, value: 'mean' });
  for (const p of ['phh2o', 'soc', 'clay', 'sand']) q.append('property', p);
  for (const d of ['0-5cm', '5-15cm', '15-30cm']) q.append('depth', d);
  try {
    const r = await fetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?${q}`, { signal: AbortSignal.timeout(60_000) });
    if (!r.ok) return null;
    const j = await r.json();
    const out = {};
    const w = { '0-5cm': 5, '5-15cm': 10, '15-30cm': 15 };
    for (const layer of j.properties.layers) {
      const f = layer.unit_measure.d_factor;
      let s = 0, n = 0;
      for (const d of layer.depths) if (d.values.mean != null) { s += (d.values.mean / f) * w[d.label]; n += w[d.label]; }
      out[{ phh2o: 'ph', soc: 'soc_g_kg', clay: 'clay', sand: 'sand' }[layer.name]] = n ? Math.round((s / n) * 10) / 10 : null;
    }
    return Object.values(out).some((v) => v != null) ? out : null;
  } catch { return null; }
}

const places = {};
let version = null;
for (const [id, pt] of Object.entries(POINTS)) {
  console.log(`${id}: NASA POWER ...`);
  const a = await power(pt.lat, pt.lon, 'T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M');
  version ??= a.version;
  console.log(`${id}: GPM IMERG ...`);
  const b = await power(pt.lat, pt.lon, 'IMERG_PRECTOT', { 'time-standard': 'UTC' });
  const s = pt.soil ? await soil(pt.lat, pt.lon) : null;
  console.log(`${id}: soil ${s ? JSON.stringify(s) : 'not available'}`);
  places[id] = {
    lat: pt.lat, lon: pt.lon,
    tmax: series(a.p, 'T2M_MAX', a.fill), tmin: series(a.p, 'T2M_MIN', a.fill), prec: series(a.p, 'PRECTOTCORR', a.fill),
    rh: series(a.p, 'RH2M', a.fill), imerg: series(b.p, 'IMERG_PRECTOT', b.fill), soil: s,
  };
}
await writeFile(OUT, JSON.stringify({
  provenance: {
    status: 'REAL',
    dataset: 'NASA POWER daily point (community AG): T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M; NASA/JAXA GPM IMERG daily (IMERG_PRECTOT, UTC days)',
    soil: 'ISRIC SoilGrids 2.0, 250 m, thickness-weighted 0–30 cm (pH H₂O, organic carbon g/kg, clay %, sand %); a model estimate, not a soil test',
    version, start: iso(START), end: iso(END), retrieved: new Date().toISOString().slice(0, 10),
    url: API,
  },
  start: iso(START),
  places,
}));
console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
