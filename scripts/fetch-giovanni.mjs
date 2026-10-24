#!/usr/bin/env node
// NASA Giovanni (GES DISC) monthly rain for each of the app's seven upazilas, checked against the NASA POWER rain the
// app plans with, and written to src/data/giovanni.json:
//
//   node scripts/fetch-giovanni.mjs            (needs EARTHDATA_TOKEN in .env.local)
//
// Giovanni's time-series service returns a variable at a point. GPM_3IMERGM_07_precipitation is the GPM IMERG Final
// Run V07 monthly mean rain rate (mm/hr, 0.1°), which is turned into mm a month. It reaches the app by a different
// road from POWER's own IMERG series, so agreement here is an independent check on the rain behind every plan.
// The token: a free Earthdata Login account (urs.earthdata.nasa.gov) → Generate Token. Put it in .env.local as
// EARTHDATA_TOKEN=...; it is never committed or sent anywhere but api.giovanni.earthdata.nasa.gov.
// Service docs: https://api.giovanni.earthdata.nasa.gov/
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { UPAZILAS } from '../src/data/upazilas.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VAR = 'GPM_3IMERGM_07_precipitation';
const FROM = '2001-01-01', TO = '2025-12-31';
const IDS = ['dhamrai', 'godagari', 'bakerganj', 'sitakunda', 'dacope', 'gangachara', 'gowainghat'];

async function token() {
  if (process.env.EARTHDATA_TOKEN) return process.env.EARTHDATA_TOKEN.trim();
  const env = await readFile(path.join(ROOT, '.env.local'), 'utf8').catch(() => '');
  const m = env.match(/^EARTHDATA_TOKEN=(.+)$/m);
  if (!m) throw new Error('No EARTHDATA_TOKEN: make one at urs.earthdata.nasa.gov (Generate Token) and add it to .env.local');
  return m[1].trim();
}

// Giovanni answers with a short header and then "timestamp,value" lines.
async function series(tok, [lat, lon]) {
  const q = `data=${VAR}&location=${encodeURIComponent(`[${lat},${lon}]`)}&time=${encodeURIComponent(`${FROM}T00:00:00/${TO}T23:59:59`)}`;
  for (let k = 0; k < 4; k++) {
    const r = await fetch(`https://api.giovanni.earthdata.nasa.gov/timeseries?${q}`, { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(180_000) }).catch(() => null);
    if (r?.status === 401 || r?.status === 403) throw new Error(`Giovanni refused the token (${r.status}); make a new one`);
    if (r?.ok) {
      const out = {};
      for (const line of (await r.text()).split('\n')) {
        const m = line.match(/^(\d{4})-(\d{2})-\d{2}[T ][^,]*,\s*(-?[\d.eE+-]+)/);
        if (!m) continue;
        const y = +m[1], mo = +m[2], days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
        out[`${m[1]}-${m[2]}`] = Math.round(Number(m[3]) * 24 * days * 10) / 10; // mm/hr → mm in the month
      }
      return out;
    }
    await new Promise((res) => setTimeout(res, 3000 * (k + 1)));
  }
  throw new Error('Giovanni did not answer');
}

// The app's own NASA POWER daily rain (PRECTOTCORR), summed into months.
async function powerMonths(id) {
  const c = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', `climate_${id}.json`), 'utf8'));
  const t0 = Date.parse(`${c.start}T00:00:00Z`), out = {};
  c.prec.forEach((v, i) => {
    if (v == null) return;
    const k = new Date(t0 + i * 864e5).toISOString().slice(0, 7);
    out[k] = (out[k] ?? 0) + v;
  });
  return out;
}

const pearson = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) ** 2; sbb += (b[i] - mb) ** 2; }
  return sab / Math.sqrt(saa * sbb);
};

const tok = await token();
const out = {
  provenance: {
    status: 'REAL', service: 'NASA Giovanni time-series service (GES DISC)', url: 'https://api.giovanni.earthdata.nasa.gov/',
    variable: VAR, dataset: 'GPM IMERG Final Run V07, monthly (GPM_3IMERGM), 0.1°', unit: 'mm a month (from the mean rate in mm/hr)',
    compared: 'NASA POWER PRECTOTCORR daily rain at the upazila centre, summed by month', retrieved: new Date().toISOString().slice(0, 10),
  },
  upazilas: {},
};
for (const id of IDS) {
  const g = await series(tok, UPAZILAS[id].center), p = await powerMonths(id);
  const months = Object.keys(g).filter((m) => p[m] != null && m <= TO.slice(0, 7)).sort();
  const a = months.map((m) => g[m]), b = months.map((m) => p[m]);
  const sum = (v) => v.reduce((x, y) => x + y, 0);
  out.upazilas[id] = { months: months.length, r: Math.round(pearson(a, b) * 1000) / 1000, biasPct: Math.round((sum(b) / sum(a) - 1) * 1000) / 10, giovanni: g };
  console.log(`${id.padEnd(11)} ${months.length} months · r = ${out.upazilas[id].r} · POWER vs Giovanni total ${out.upazilas[id].biasPct > 0 ? '+' : ''}${out.upazilas[id].biasPct}%`);
}
await writeFile(path.join(ROOT, 'src', 'data', 'giovanni.json'), JSON.stringify(out));
