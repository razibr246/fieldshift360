#!/usr/bin/env node
// Download REAL monthly root-zone soil wetness for the app's seven upazilas from NASA POWER (no login needed) and
// write src/data/water/soil_wetness.json.
//
//   node scripts/fetch/soil-wetness.mjs
//
// GWETROOT: root-zone soil wetness, 0 (dry) to 1 (saturated), the top metre of soil, from NASA GMAO MERRA-2 (a
// reanalysis that assimilates satellite and ground observations), served monthly through the POWER API
// (community AG). GWETTOP (top 5 cm) comes with it. Months are 1–12; POWER's month 13 (the year's mean) is dropped.
// Docs: https://power.larc.nasa.gov/docs/
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UPAZILAS } from '../../src/data/upazilas.js';

const API = 'https://power.larc.nasa.gov/api/temporal/monthly/point';
const PARAMS = ['GWETROOT', 'GWETTOP'];
const START = 2001, END = 2025;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'water', 'soil_wetness.json');
const IDS = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'];

const out = {
  provenance: {
    status: 'REAL', dataset: 'NASA POWER monthly point (community AG)', source: 'NASA GMAO MERRA-2 via NASA POWER',
    parameters: { root: 'GWETROOT, root-zone soil wetness (0–1)', top: 'GWETTOP, surface soil wetness (0–1)' },
    endpoint: API, years: [START, END], retrieved: new Date().toISOString().slice(0, 10), url: 'https://power.larc.nasa.gov',
  },
  upazilas: {},
};
for (const id of IDS) {
  const [lat, lon] = UPAZILAS[id].center;
  const q = new URLSearchParams({ parameters: PARAMS.join(','), community: 'AG', latitude: lat, longitude: lon, start: START, end: END, format: 'JSON' });
  const res = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) { console.error(`${id}: NASA POWER answered ${res.status}`); process.exit(1); }
  const js = await res.json();
  const fill = js.header?.fill_value ?? -999;
  const series = (p) => {
    const by = {};
    for (const [k, v] of Object.entries(js.properties.parameter[p])) {
      const y = +k.slice(0, 4), m = +k.slice(4, 6);
      if (m < 1 || m > 12) continue;
      (by[y] ??= Array(12).fill(null))[m - 1] = v === fill ? null : Math.round(v * 1000) / 1000;
    }
    return by;
  };
  out.upazilas[id] = { at: [lat, lon], root: series('GWETROOT'), top: series('GWETTOP') };
  console.log(`  ${id}: ${Object.keys(out.upazilas[id].root).length} years`);
}
await writeFile(OUT, JSON.stringify(out));
console.log(`wrote ${OUT}`);
