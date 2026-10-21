#!/usr/bin/env node
// Monsoon rain-onset date per year for an upazila, from daily rain already in src/data/climate_<upazila>.json
// (NASA/JAXA GPM IMERG through the NASA POWER API, with POWER's own PRECTOTCORR alongside for comparison).
// Writes src/data/onset_<upazila>.json. No network needed. Definition and thresholds: docs/RADAR.md.
//
//   node pipeline/onset/onset.mjs godagari dhamrai
//
// Onset (an agronomic definition in the family of Stern et al. 1981 and Moron & Robertson 2014, thresholds to be
// validated): the first day D on or after 15 April such that
//   1. the 5 days D..D+4 bring at least the site's wet-spell threshold W, with rain (>= 1 mm) on at least 3 of them,
//      where W is the mean 5-day rain of June–September over the reference years (the site's own monsoon pentad);
//   2. no false start: in the 30 days after the wet spell there is no 10-day window with less than 5 mm in total;
//   3. the rains have set in: those 30 days bring at least half the site's mean 30-day June–September rain
//      (this is what separates the monsoon from a burst of pre-monsoon nor'wester storms in April and May).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const RULE = { searchFrom: [4, 15], wetDays: 5, minRainyDays: 3, rainyMm: 1, dryWindow: 10, dryTotalMm: 5, lookahead: 30, setInShare: 0.5, refYears: [2001, 2025], finalTo: 2025, thresholdFrom: 'mean 5-day June–September rain over the reference years' };
const DAY = 864e5;

export function series(json, key) {
  const t0 = Date.parse(`${json.start}T00:00:00Z`);
  return { t0, v: json[key] };
}
const at = (s, y, m, d) => Math.round((Date.UTC(y, m - 1, d) - s.t0) / DAY);

// The site's own wet-spell threshold: mean 5-day rain in June–September.
export function threshold(s, [y0, y1] = RULE.refYears) {
  let sum = 0, days = 0;
  for (let y = y0; y <= y1; y++) for (let i = at(s, y, 6, 1); i <= at(s, y, 9, 30); i++) { const x = s.v[i]; if (x != null) { sum += x; days++; } }
  return (sum / days) * RULE.wetDays;
}

export function onsetIndex(s, year, W, r = RULE, month = (W / r.wetDays) * r.lookahead) {
  const from = at(s, year, ...r.searchFrom), last = at(s, year, 9, 30);
  for (let i = from; i <= last && i + r.wetDays + r.lookahead < s.v.length; i++) {
    let sum = 0, rainy = 0, gap = false;
    for (let k = 0; k < r.wetDays; k++) { const x = s.v[i + k]; if (x == null) { gap = true; break; } sum += x; if (x >= r.rainyMm) rainy++; }
    if (gap || sum < W || rainy < r.minRainyDays) continue;
    let falseStart = false;
    const a = i + r.wetDays;
    for (let j = a; j + r.dryWindow <= a + r.lookahead; j++) {
      let t = 0; for (let k = 0; k < r.dryWindow; k++) t += s.v[j + k] ?? 0;
      if (t < r.dryTotalMm) { falseStart = true; break; }
    }
    let after = 0; for (let k = a; k < a + r.lookahead; k++) after += s.v[k] ?? 0;
    if (!falseStart && after >= r.setInShare * month) return i;
  }
  return null;
}

// Sen's slope (days per decade) and the Mann–Kendall test (two-sided p, normal approximation with tie correction).
export function trend(xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([, y]) => y != null), n = pts.length;
  const slopes = [];
  let S = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = pts[j][1] - pts[i][1]; S += Math.sign(d); slopes.push(d / (pts[j][0] - pts[i][0])); }
  slopes.sort((a, b) => a - b);
  const m = slopes.length, slope = m % 2 ? slopes[(m - 1) / 2] : (slopes[m / 2 - 1] + slopes[m / 2]) / 2;
  const ties = {}; for (const [, y] of pts) ties[y] = (ties[y] ?? 0) + 1;
  let v = n * (n - 1) * (2 * n + 5); for (const t of Object.values(ties)) v -= t * (t - 1) * (2 * t + 5); v /= 18;
  const z = S > 0 ? (S - 1) / Math.sqrt(v) : S < 0 ? (S + 1) / Math.sqrt(v) : 0;
  const p = 2 * (1 - phi(Math.abs(z)));
  return { n, perDecade: Math.round(slope * 100) / 10, S, z: Math.round(z * 1000) / 1000, p: Math.round(p * 10000) / 10000, significant: p < 0.05 };
}
function phi(x) { // standard normal CDF (Abramowitz & Stegun 7.1.26)
  const t = 1 / (1 + 0.3275911 * x / Math.SQRT2), e = Math.exp(-(x * x) / 2);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * e;
  return 0.5 * (1 + erf);
}

export function onsetFor(json, upazila) {
  const out = { upazila, years: [] }, src = {};
  const SOURCES = [['prec_imerg', 'imerg'], ['prec', 'power'], ...(json.prec_gesdisc ? [['prec_gesdisc', 'gesdisc']] : [])];
  for (const [key, name] of SOURCES) {
    const s = series(json, key), W = threshold(s);
    src[name] = { key, thresholdMm: Math.round(W * 10) / 10 };
    const endY = new Date(Date.parse(json.provenance.end)).getUTCFullYear();
    for (let y = 2001; y <= endY; y++) {
      const i = onsetIndex(s, y, W);
      let row = out.years.find((r) => r.year === y); if (!row) { row = { year: y }; out.years.push(row); }
      const date = i == null ? null : new Date(s.t0 + i * DAY).toISOString().slice(0, 10);
      // final only when every day the rule looked at is in the file (IMERG Final arrives months late)
      const lookedTo = date ? Date.parse(date) + (RULE.wetDays + RULE.lookahead) * DAY : Date.UTC(y, 8, 30) + RULE.lookahead * DAY;
      // IMERG through POWER after `finalTo` is the early satellite-only estimate (see aman_radar.json rainFinalTo)
      let complete = y <= RULE.finalTo && Date.parse(json.provenance.end) >= lookedTo;
      for (let k = at(s, y, ...RULE.searchFrom); complete && s.t0 + k * DAY <= lookedTo; k++) if (s.v[k] == null) complete = false;
      row[name] = { date, doy: date ? Math.round((Date.parse(date) - Date.UTC(y, 0, 1)) / DAY) + 1 : null, complete };
    }
  }
  const ys = out.years.filter((r) => r.year >= RULE.refYears[0] && r.year <= RULE.refYears[1]);
  for (const [, name] of SOURCES) src[name].trend = trend(ys.map((r) => r.year), ys.map((r) => r[name].doy));
  out.sources = src;
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  for (const u of process.argv.slice(2).length ? process.argv.slice(2) : ['godagari', 'dhamrai']) {
    const json = JSON.parse(readFileSync(path.join(root, 'src', 'data', `climate_${u}.json`), 'utf8'));
    // IMERG Final straight from GES DISC, when pipeline/onset/fetch_imerg_gesdisc.py has been run (same start day)
    const gd = path.join(path.dirname(fileURLToPath(import.meta.url)), `imerg_gesdisc_${u}.json`);
    if (existsSync(gd)) { const g = JSON.parse(readFileSync(gd, 'utf8')); if (g.start === json.start) json.prec_gesdisc = g.prec.concat(Array(Math.max(0, json.prec.length - g.prec.length)).fill(null)).slice(0, json.prec.length); }
    const res = onsetFor(json, u);
    const file = {
      provenance: {
        status: 'REAL',
        method: 'pipeline/onset/onset.mjs; definition in docs/RADAR.md (an assumption to be validated against BMD onset records)',
        rule: RULE,
        primary: 'imerg',
        sources: {
          imerg: { dataset: 'NASA/JAXA GPM IMERG daily precipitation (IMERG_PRECTOT, UTC days) served by the NASA POWER API', ...res.sources.imerg },
          power: { dataset: 'NASA POWER PRECTOTCORR daily (MERRA-2 bias-corrected), for comparison', ...res.sources.power },
          ...(res.sources.gesdisc ? { gesdisc: { dataset: 'NASA GPM IMERG Final daily GPM_3IMERGDF v07, straight from GES DISC (pipeline/onset/fetch_imerg_gesdisc.py)', ...res.sources.gesdisc } } : {}),
        },
        climateFile: `src/data/climate_${u}.json`,
        lat: json.provenance.lat, lon: json.provenance.lon, rainThrough: json.provenance.end,
        generated: new Date().toISOString().slice(0, 10),
      },
      years: res.years,
    };
    writeFileSync(path.join(root, 'src', 'data', `onset_${u}.json`), JSON.stringify(file, null, 1));
    const t = res.sources.imerg;
    console.log(`${u}: threshold ${t.thresholdMm} mm/5 days; IMERG trend ${t.trend.perDecade} days/decade (p=${t.trend.p})`);
    for (const r of res.years) console.log(`  ${r.year}  IMERG ${r.imerg.date ?? '—'}${r.imerg.complete ? '' : ' (season not complete)'}   POWER ${r.power.date ?? '—'}`);
  }
}
