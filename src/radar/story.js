// The numbers behind the district story on the Ropan Radar page, from the real data files (aman_radar.json for the
// district, public/aman/<upazila>.json for the officer's own upazila). Pure functions, so they can be tested.
//
// Usable-rain onset, as defined in the first Ropon Radar prototype (public/radar/js/detect.js): the first day from
// 1 June that starts at least 20 mm of rain over 3 days and is not followed, in the next 30 days, by a dry spell
// (days under 1 mm) longer than 7 days. Here it runs on real daily NASA/JAXA GPM IMERG rain, not synthetic rain.
// Adaptation gap: radar transplanting day minus usable-rain onset.
export const ONSET_RULE = { m: 6, d: 1, wetMm: 20, wetDays: 3, dryMm: 1, maxDry: 7, lookahead: 30 };

const doyOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;

// rain: daily mm starting at day-of-year `from`.
export function onsetDoy(rain, from, year, r = ONSET_RULE) {
  const d0 = doyOf(year, r.m, r.d);
  for (let doy = d0; doy - from + r.lookahead < rain.length; doy++) {
    const i = doy - from;
    if (i < 0) continue;
    let sum = 0;
    for (let k = 0; k < r.wetDays; k++) sum += rain[i + k] ?? 0;
    if (sum < r.wetMm) continue;
    let run = 0, longest = 0;
    for (let k = i + 1; k <= i + r.lookahead; k++) { run = (rain[k] ?? 0) < r.dryMm ? run + 1 : 0; longest = Math.max(longest, run); }
    if (longest <= r.maxDry) return doy;
  }
  return null;
}

// Each radar season for the officer's upazila: onset, transplanting day, gap.
export function gapSeries(detail, row) {
  const rs = detail?.rain?.seasons ?? {}, from = detail?.rain?.from ?? 105;
  return Object.keys(row.seasons).map(Number).sort().map((y) => {
    const onset = rs[y] ? onsetDoy(rs[y], from, y) : null;
    const t = row.seasons[y]?.transplantDoy ?? null;
    return { year: y, onset, transplant: t, gap: onset != null && t != null ? t - onset : null, complete: row.seasons[y]?.complete !== false };
  });
}

const median = (v) => { const a = v.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
export { median };

// How much of Sentinel-2's optical passes over the upazila's registered fields were too cloudy to use.
export function cloudShare(watchParcels, ids) {
  let passes = 0, clear = 0;
  for (const id of ids) { const p = watchParcels[id]; if (p) { passes += p.passes ?? 0; clear += p.clear ?? 0; } }
  return passes ? { passes, clear, share: 1 - clear / passes } : null;
}
