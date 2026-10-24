// Rain onset per year for the app's seven upazilas, one per division (src/data/radar/onset_<upazila>.json, built by scripts/onset/onset.mjs
// from NASA/JAXA GPM IMERG daily rain, with NASA POWER PRECTOTCORR alongside). The rule is in docs/RADAR.md.
// Pure, so the voice assistant and Node tests can use it.
import godagari from '../data/radar/onset_godagari.json' with { type: 'json' };
import dhamrai from '../data/radar/onset_dhamrai.json' with { type: 'json' };
import sitakunda from '../data/radar/onset_sitakunda.json' with { type: 'json' };
import dacope from '../data/radar/onset_dacope.json' with { type: 'json' };
import bakerganj from '../data/radar/onset_bakerganj.json' with { type: 'json' };
import gangachara from '../data/radar/onset_gangachara.json' with { type: 'json' };
import gowainghat from '../data/radar/onset_gowainghat.json' with { type: 'json' };

export const ONSET = { godagari, dhamrai, sitakunda, dacope, bakerganj, gangachara, gowainghat };

function fromRow(upazila, o) {
  const years = Object.entries(o.years).map(([y, doy]) => ({ year: +y, imerg: { doy, complete: +y <= o.finalTo, ...(o.atStart?.includes(+y) ? { atStart: true } : {}) }, power: { doy: null } }));
  const ref = years.filter((r) => r.imerg.complete && r.imerg.doy != null);
  const last = years[years.length - 1];
  return {
    upazila, rule: null, thresholdMm: o.thresholdMm, usual: o.usual, usualPower: null,
    earliest: Math.min(...ref.map((r) => r.imerg.doy)), latestDoy: Math.max(...ref.map((r) => r.imerg.doy)),
    trend: o.trend, trendPower: null, latest: ref.length ? { year: ref[ref.length - 1].year, doy: ref[ref.length - 1].imerg.doy } : null,
    current: last && !last.imerg.complete ? { year: last.year, doy: last.imerg.doy } : null, rows: years, imergOnly: true,
    atStartYears: ref.filter((r) => r.imerg.atStart).length, refYears: ref.length,
  };
}

const median = (v) => { const a = v.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; const n = a.length; return n % 2 ? a[(n - 1) / 2] : Math.round((a[n / 2 - 1] + a[n / 2]) / 2); };

// { usual (median day of year over the reference years), latest final year, trend, rows } or null where there is none.
// For the radar-only upazilas the same rule runs inside the radar build on their IMERG rain (`row.onset` in
// aman_radar.json); pass the district row to use it.
export function onsetSummary(upazila, row = null, file = ONSET[upazila]) {
  if (!file) return row?.onset ? fromRow(upazila, row.onset) : null;
  const { rule, sources } = file.provenance;
  const ref = file.years.filter((r) => r.year >= rule.refYears[0] && r.year <= rule.refYears[1]);
  const finals = file.years.filter((r) => r.imerg.complete && r.imerg.doy != null);
  const latest = finals[finals.length - 1] ?? null;
  const current = file.years[file.years.length - 1];
  return {
    upazila, rule, thresholdMm: sources.imerg.thresholdMm,
    usual: median(ref.map((r) => r.imerg.doy)), usualPower: median(ref.map((r) => r.power.doy)),
    earliest: Math.min(...ref.map((r) => r.imerg.doy ?? 999)), latestDoy: Math.max(...ref.map((r) => r.imerg.doy ?? 0)),
    trend: sources.imerg.trend, trendPower: sources.power.trend,
    latest: latest && { year: latest.year, doy: latest.imerg.doy },
    current: current && !current.imerg.complete ? { year: current.year, doy: current.imerg.doy } : null,
    rows: file.years, atStartYears: ref.filter((r) => r.imerg.atStart).length, refYears: ref.length,
  };
}
