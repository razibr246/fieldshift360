#!/usr/bin/env node
// Checks the app's rain onset against published onset dates from Bangladesh Meteorological Department records.
// Writes src/data/onset_validation.json and prints the table in docs/RADAR.md.
//
//   node pipeline/onset/compare_bmd.mjs
//
// 1. Same rule, two rain records. Han et al. (2024, Climatic Change 177:77) computed onset from BMD station rain,
//    1981–2017, with a simple rule ("Dynamic 1": the first day from 15 May that starts three days with at least
//    50 mm in total). The same rule is run here on NASA/JAXA GPM IMERG rain at the nearest app upazila, 2001–2017,
//    so a difference comes from the rain record (satellite against gauge, and the years), not from the rule.
// 2. The app's own rule (docs/RADAR.md) on IMERG, 2001–2017, against the same BMD-based means and against what
//    farmers there call the normal start (Stiller-Reeve et al. 2015, as quoted by Han et al.).
// 3. The meteorological monsoon arrival (Ahmed & Karmakar 1993, BMD stations 1958–1987): about 2 June on the
//    south-eastern coast and 15 June in the north-west. That marks the monsoon winds arriving, not the planting
//    rains, so the agronomic onsets are expected to come earlier.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { series, threshold, onsetIndex, RULE } from './onset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DAY = 864e5;
const YEARS = [2001, 2017];
// BMD-based published values. doy is the day of the year in a non-leap year.
const doyOf = (m, d) => Math.round((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / DAY) + 1;
const STATIONS = [
  { station: 'Rajshahi', upazila: 'godagari', km: 30, bmdD1: doyOf(6, 4), bmdD2: doyOf(6, 6), farmers: doyOf(6, 10), arrival: doyOf(6, 15), arrivalNote: 'north-west' },
  { station: 'Barishal', upazila: 'bakerganj', km: 20, bmdD1: doyOf(5, 27), bmdD2: null, farmers: doyOf(5, 31), arrival: null },
  { station: 'Dinajpur', upazila: 'gangachara', km: 70, bmdD1: doyOf(5, 27), bmdD2: doyOf(5, 30), farmers: null, arrival: doyOf(6, 15), arrivalNote: 'north-west' },
];
const SOURCES = {
  han2024: 'Han, E., Montes, C., Hussain, S. G., … Krupnik, T. J. (2024). Agronomic monsoon onset definitions to support planting decisions for rainfed rice in Bangladesh. Climatic Change 177, 77. https://doi.org/10.1007/s10584-024-03736-z (BMD station rain 1981–2017; Fig. 3, Section 4.1)',
  stillerReeve2015: 'Stiller-Reeve, M. A. et al. (2015), farmers’ perceived onset, as quoted in Han et al. (2024), Section 3.3',
  ahmedKarmakar1993: 'Ahmed, R. & Karmakar, S. (1993). Arrival and withdrawal dates of the summer monsoon in Bangladesh. International Journal of Climatology 13(7), 727–740 (19 BMD stations, 1958–1987)',
};

// Dynamic 1 (Han et al. 2024): first day from 15 May with ≥ 50 mm over it and the next two days.
function dynamic1(s, year) {
  const from = Math.round((Date.UTC(year, 4, 15) - s.t0) / DAY), last = Math.round((Date.UTC(year, 9, 31) - s.t0) / DAY);
  for (let i = from; i <= last - 2; i++) {
    const v = [s.v[i], s.v[i + 1], s.v[i + 2]];
    if (v.some((x) => x == null)) continue;
    if (v[0] + v[1] + v[2] >= 50) return i;
  }
  return null;
}
const doyAt = (s, i) => { const t = s.t0 + i * DAY, y = new Date(t).getUTCFullYear(); return Math.round((t - Date.UTC(y, 0, 1)) / DAY) + 1; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const date = (doy) => new Date(Date.UTC(2001, 0, Math.round(doy))).toISOString().slice(5, 10);

const rows = [];
for (const st of STATIONS) {
  const json = JSON.parse(readFileSync(path.join(ROOT, 'src', 'data', `climate_${st.upazila}.json`)));
  const s = series(json, 'prec_imerg'), W = threshold(s);
  const d1 = [], ours = [];
  for (let y = YEARS[0]; y <= YEARS[1]; y++) {
    const a = dynamic1(s, y); if (a != null) d1.push(doyAt(s, a));
    const b = onsetIndex(s, y, W, RULE); if (b != null) ours.push(doyAt(s, b));
  }
  const row = {
    ...st, years: YEARS, n: d1.length,
    imergD1: { mean: mean(d1), sd: sd(d1) }, ours: { mean: mean(ours), sd: sd(ours), n: ours.length },
  };
  row.diffD1 = row.imergD1.mean - st.bmdD1; // satellite against gauge, same rule
  row.diffOurs = row.ours.mean - st.bmdD1; // our rule against the BMD-based mean
  rows.push(row);
  console.log(`${st.station.padEnd(9)} (${st.upazila}, ~${st.km} km)  BMD D1 ${date(st.bmdD1)}  IMERG D1 ${date(row.imergD1.mean)} (±${row.imergD1.sd.toFixed(0)} d, ${row.diffD1 >= 0 ? '+' : ''}${row.diffD1.toFixed(1)} d)  ours ${date(row.ours.mean)} (${row.diffOurs >= 0 ? '+' : ''}${row.diffOurs.toFixed(1)} d)${st.farmers ? `  farmers ${date(st.farmers)}` : ''}`);
}
writeFileSync(path.join(ROOT, 'src', 'data', 'onset_validation.json'), JSON.stringify({
  provenance: { status: 'REAL', method: 'pipeline/onset/compare_bmd.mjs', sources: SOURCES, imergYears: YEARS, retrieved: new Date().toISOString().slice(0, 10) },
  rows,
}));
