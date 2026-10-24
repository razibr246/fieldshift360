#!/usr/bin/env node
// Download REAL daily climate for an upazila from NASA POWER (no login needed) and
// write src/data/climate/climate_<upazila>.json in the format the app reads.
//
//   npm run fetch:power                                              # Godagari upazila centre
//   npm run fetch:power -- --upazila dhamrai --lat 23.93 --lon 90.14   # Dhamrai upazila centre
//
// Parameters (community AG): T2M_MAX, T2M_MIN (°C), PRECTOTCORR (mm/day), RH2M (%), ALLSKY_SFC_SW_DWN (MJ/m²/day) and
// IMERG_PRECTOT (mm/day, NASA/JAXA GPM IMERG satellite rainfall served through POWER, used as an independent
// cross-check of PRECTOTCORR).
// Needs Node 18+ (built-in fetch). Docs: https://power.larc.nasa.gov/docs/
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const PARAMS = ['T2M_MAX', 'T2M_MIN', 'PRECTOTCORR', 'RH2M', 'ALLSKY_SFC_SW_DWN'];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const UPAZILA = arg('upazila', 'godagari');
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'climate', `climate_${UPAZILA}.json`);
const lat = Number(arg('lat', 24.4667));
const lon = Number(arg('lon', 88.3306));
const start = arg('start', '20001001'); // Oct 2000 so the 2001 Rabi season is complete
const end = arg('end', '20261015');
const iso = (k) => `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;

const q = new URLSearchParams({ parameters: PARAMS.join(','), community: 'AG', latitude: lat, longitude: lon, start, end, format: 'JSON' });
const url = `${API}?${q}`;
console.log('Requesting NASA POWER ...');
const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
if (!res.ok) { console.error(`NASA POWER answered ${res.status} ${res.statusText}`); process.exit(1); }
const js = await res.json();
const header = js.header ?? {};
const fill = header.fill_value ?? -999;
const p = js.properties.parameter;

// IMERG is published on UTC days only (POWER refuses it in local solar time), so it comes in a second request.
// The six-hour shift does not matter for the season totals it is compared on.
console.log('Requesting NASA/JAXA GPM IMERG through POWER (UTC days) ...');
const qi = new URLSearchParams({ parameters: 'IMERG_PRECTOT', community: 'AG', latitude: lat, longitude: lon, start, end, format: 'JSON', 'time-standard': 'UTC' });
const ri = await fetch(`${API}?${qi}`, { signal: AbortSignal.timeout(300_000) });
if (!ri.ok) { console.error(`IMERG request answered ${ri.status} ${ri.statusText}`); process.exit(1); }
Object.assign(p, (await ri.json()).properties.parameter);

const keys = [];
for (let d = new Date(`${iso(start)}T00:00:00Z`), e = new Date(`${iso(end)}T00:00:00Z`); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
  keys.push(d.toISOString().slice(0, 10).replaceAll('-', ''));
}
const series = (name) => {
  let missing = 0;
  const vals = keys.map((k) => {
    const v = p[name]?.[k];
    if (v == null || v === fill || v <= -998) { missing++; return null; }
    return Math.round(v * 100) / 100;
  });
  console.log(`  ${name}: ${vals.length} days, ${missing} missing`);
  return vals;
};

const out = {
  provenance: {
    status: 'REAL',
    dataset: 'NASA POWER daily point (community AG)',
    version: header.api?.version ?? 'unknown',
    parameters: { tmax: 'T2M_MAX °C', tmin: 'T2M_MIN °C', prec: 'PRECTOTCORR mm/day', rh: 'RH2M %', srad: 'ALLSKY_SFC_SW_DWN MJ/m²/day', prec_imerg: 'IMERG_PRECTOT mm/day (NASA/JAXA GPM IMERG, cross-check)' },
    request: { endpoint: API, community: 'AG', parameters: PARAMS, timeStandard: 'LST', imerg: { parameters: ['IMERG_PRECTOT'], timeStandard: 'UTC' } },
    lat, lon, start: iso(start), end: iso(end),
    retrieved: new Date().toISOString().slice(0, 19) + 'Z',
    url,
    sources: header.sources ?? null,
    coordinates: arg('coord-note', null),
    notes: 'Grid cell about 0.5° x 0.625°: an area-level signal, not a field measurement.',
  },
  start: iso(start),
  tmax: series('T2M_MAX'),
  tmin: series('T2M_MIN'),
  prec: series('PRECTOTCORR'),
  rh: series('RH2M'),
  srad: series('ALLSKY_SFC_SW_DWN'),
  prec_imerg: series('IMERG_PRECTOT'),
};
await writeFile(OUT, JSON.stringify(out));
console.log(`wrote ${OUT}  status=REAL\nRebuild the app: npm run build`);
