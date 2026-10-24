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

// Rainfall is asked for apart from the rest, a year at a time: in October 2026 POWER answered PRECTOTCORR 24 times
// too large to many requests over the whole record (with or without the other parameters) while small requests came
// back right. Each year is checked against IMERG and asked again if the two disagree.
const OTHERS = PARAMS.filter((k) => k !== 'PRECTOTCORR');
const q = new URLSearchParams({ parameters: OTHERS.join(','), community: 'AG', latitude: lat, longitude: lon, start, end, format: 'JSON' });
const url = `${API}?${q}`;
console.log('Requesting NASA POWER ...');
const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
if (!res.ok) { console.error(`NASA POWER answered ${res.status} ${res.statusText}`); process.exit(1); }
const js = await res.json();
const header = js.header ?? {};
const fill = header.fill_value ?? -999;
const p = js.properties.parameter;

// IMERG is published on UTC days only (POWER refuses it in local solar time), so it comes in its own request.
// The six-hour shift does not matter for the season totals it is compared on.
console.log('Requesting NASA/JAXA GPM IMERG through POWER (UTC days) ...');
const qi = new URLSearchParams({ parameters: 'IMERG_PRECTOT', community: 'AG', latitude: lat, longitude: lon, start, end, format: 'JSON', 'time-standard': 'UTC' });
const ri = await fetch(`${API}?${qi}`, { signal: AbortSignal.timeout(300_000) });
if (!ri.ok) { console.error(`IMERG request answered ${ri.status} ${ri.statusText}`); process.exit(1); }
Object.assign(p, (await ri.json()).properties.parameter);

const rainUrl = `${API}?${new URLSearchParams({ parameters: 'PRECTOTCORR', community: 'AG', latitude: lat, longitude: lon, start: '<yyyy0101>', end: '<yyyy1231>', format: 'JSON' })}`;
let unit = null;
p.PRECTOTCORR = {};
const sumOf = (obj, y) => Object.entries(obj ?? {}).filter(([k, v]) => k.startsWith(y) && v > -998).reduce((t, [, v]) => t + v, 0);
for (let y = +start.slice(0, 4); y <= +end.slice(0, 4); y++) {
  const a = y === +start.slice(0, 4) ? start : `${y}0101`, b = y === +end.slice(0, 4) ? end : `${y}1231`;
  for (let tryNo = 1; ; tryNo++) {
    const r = await fetch(`${API}?${new URLSearchParams({ parameters: 'PRECTOTCORR', community: 'AG', latitude: lat, longitude: lon, start: a, end: b, format: 'JSON' })}`, { signal: AbortSignal.timeout(120_000) });
    if (!r.ok) { console.error(`PRECTOTCORR ${y} answered ${r.status} ${r.statusText}`); process.exit(1); }
    const j = await r.json();
    unit = j.parameters?.PRECTOTCORR?.units ?? unit;
    const got = j.properties.parameter.PRECTOTCORR, im = sumOf(p.IMERG_PRECTOT, String(y)), pw = sumOf(got, String(y));
    if (im < 20 || (pw / im > 1 / 3 && pw / im < 3)) { Object.assign(p.PRECTOTCORR, got); break; }
    if (tryNo >= 10) { console.error(`PRECTOTCORR ${y}: ${Math.round(pw)} mm against IMERG ${Math.round(im)} mm after ${tryNo} tries; nothing written`); process.exit(1); }
    console.log(`  PRECTOTCORR ${y}: ${Math.round(pw)} mm against IMERG ${Math.round(im)} mm, asking again`);
    await new Promise((ok) => setTimeout(ok, 20_000 * tryNo));
  }
}

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
    request: { endpoint: API, community: 'AG', parameters: PARAMS, timeStandard: 'LST', rain: { parameters: ['PRECTOTCORR'], separate: true }, imerg: { parameters: ['IMERG_PRECTOT'], timeStandard: 'UTC' } },
    lat, lon, start: iso(start), end: iso(end),
    retrieved: new Date().toISOString().slice(0, 19) + 'Z',
    url,
    rainUrl,
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
// A sanity check before writing (the 24-times rainfall reached two upazilas unnoticed once): over the whole record
// the two rainfall sources must agree within a factor of three.
const both = keys.map((_, i) => [out.prec[i], out.prec_imerg[i]]).filter(([a, b]) => a != null && b != null);
const ratio = both.reduce((s, [a]) => s + a, 0) / Math.max(1, both.reduce((s, [, b]) => s + b, 0));
if (unit && unit !== 'mm/day') { console.error(`PRECTOTCORR came in ${unit}, not mm/day; nothing written`); process.exit(1); }
if (!(ratio > 1 / 3 && ratio < 3)) { console.error(`PRECTOTCORR totals ${ratio.toFixed(1)} times IMERG; nothing written. Try again later.`); process.exit(1); }
console.log(`  rain check: PRECTOTCORR / IMERG = ${ratio.toFixed(2)}`);
await writeFile(OUT, JSON.stringify(out));
console.log(`wrote ${OUT}  status=REAL\nRebuild the app: npm run build`);
