// Rain onset per year for the two FieldShift regions (src/data/onset_<upazila>.json, built by pipeline/onset/onset.mjs
// from NASA/JAXA GPM IMERG daily rain, with NASA POWER PRECTOTCORR alongside). The rule is in docs/RADAR.md.
// Pure, so the voice assistant and Node tests can use it.
import godagari from '../data/onset_godagari.json' with { type: 'json' };
import dhamrai from '../data/onset_dhamrai.json' with { type: 'json' };

export const ONSET = { godagari, dhamrai };

const median = (v) => { const a = v.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; const n = a.length; return n % 2 ? a[(n - 1) / 2] : Math.round((a[n / 2 - 1] + a[n / 2]) / 2); };

// { usual (median day of year over the reference years), latest final year, trend, rows } or null outside the two regions.
export function onsetSummary(upazila, file = ONSET[upazila]) {
  if (!file) return null;
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
    rows: file.years,
  };
}
