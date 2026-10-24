#!/usr/bin/env node
// Re-works the rain onset of every Ropon Radar upazila in src/data/radar/aman_radar.json after a change to the onset rule
// (scripts/onset/onset.mjs), from the IMERG rain the radar build cached in .cache/data/aman/rain/, without running
// the Sentinel-1 radar again. Same steps as the onset block of build_aman_radar.mjs.
//
//   node scripts/build/refresh_radar_onset.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onsetIndex, threshold, trend, RULE } from '../onset/onset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = path.join(ROOT, 'src', 'data', 'radar', 'aman_radar.json');
const RAIN = path.join(ROOT, '.cache', 'data', 'aman', 'rain');
const radar = JSON.parse(readFileSync(FILE, 'utf8'));
const [RAIN_FROM, END_YEAR] = radar.years.rain, RAIN_FINAL_TO = radar.rainFinalTo;
const median = (v) => { const a = v.filter((x) => x != null).sort((x, y) => x - y); const n = a.length; return n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : null; };
const files = readdirSync(RAIN);
let n = 0;
for (const d of Object.values(radar.districts)) {
  for (const u of d.upazilas) {
    const f = files.filter((x) => x.startsWith(`${u.id}-`)).sort().pop();
    if (!f) { console.log(`  ${u.id}: no cached rain, left as it was`); continue; }
    const rain = JSON.parse(readFileSync(path.join(RAIN, f), 'utf8'));
    const keys = Object.keys(rain.series).sort(), end = keys[keys.length - 1];
    const t0 = Date.UTC(RAIN_FROM, 0, 1), nDays = Math.round((Date.UTC(+end.slice(0, 4), +end.slice(4, 6) - 1, +end.slice(6, 8)) - t0) / 864e5) + 1;
    const iso = (i) => new Date(t0 + i * 864e5).toISOString().slice(0, 10).replaceAll('-', '');
    const sr = { t0, v: Array.from({ length: nDays }, (_, i) => rain.series[iso(i)] ?? null) };
    const W = threshold(sr, [RAIN_FROM, RAIN_FINAL_TO]);
    const years = {}, atStart = [];
    for (let y = RAIN_FROM; y <= END_YEAR; y++) {
      const i = onsetIndex(sr, y, W);
      years[y] = i === null ? null : Math.round((t0 + i * 864e5 - Date.UTC(y, 0, 1)) / 864e5) + 1;
      if (i !== null && i === Math.round((Date.UTC(y, RULE.searchFrom[0] - 1, RULE.searchFrom[1]) - t0) / 864e5)) atStart.push(y);
    }
    const ref = Object.entries(years).filter(([y]) => +y <= RAIN_FINAL_TO);
    const tr = trend(ref.map(([y]) => +y), ref.map(([, v]) => v));
    u.onset = { thresholdMm: Math.round(W * 10) / 10, usual: Math.round(median(ref.map(([, v]) => v))), finalTo: RAIN_FINAL_TO, years, atStart, searchFrom: RULE.searchFrom,
      trend: { perDecade: tr.perDecade, p: tr.p, significant: tr.significant } };
    n++;
  }
}
writeFileSync(FILE, JSON.stringify(radar));
console.log(`re-worked the onset of ${n} upazilas (rule from ${RULE.searchFrom.join('-')})`);
