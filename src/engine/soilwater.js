// Root-zone soil wetness through the Rabi season, from NASA POWER (MERRA-2) monthly GWETROOT. [REAL]
// The Rabi crops live on the water left in the soil after the monsoon and on irrigation; a soil that dries faster
// each winter is a field where thirsty rotations (Boro) cost more and short, deep-rooted ones (pulses, mustard)
// make more sense. Season y is November–December of y−1 and January–March of y, so the first full one is 2002.
import { mannKendall, confidence } from './agroclimate.js';

const RABI = [[-1, 10], [-1, 11], [0, 0], [0, 1], [0, 2]]; // [year offset, month index]
const THEN_END = 2012;

export function rabiWetness(sw, upazilaId) {
  const u = sw?.upazilas?.[upazilaId];
  if (!u) return null;
  const years = Object.keys(u.root).map(Number).sort((a, b) => a - b);
  const seasonMean = (src, y) => {
    const v = RABI.map(([dy, m]) => src[y + dy]?.[m]).filter((x) => x != null);
    return v.length === RABI.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const series = years.map((y) => ({ season: y, root: seasonMean(u.root, y), top: seasonMean(u.top, y) })).filter((s) => s.root != null);
  const avg = (ss) => (ss.length ? ss.reduce((a, s) => a + s.root, 0) / ss.length : null);
  const then = avg(series.filter((s) => s.season <= THEN_END)), now = avg(series.filter((s) => s.season > THEN_END));
  const mk = series.length >= 8 ? mannKendall(series.map((s) => s.root), series.map((s) => s.season)) : null;
  const driest = series.reduce((a, s) => (s.root < a.root ? s : a), series[0]);
  return {
    series, then, now, change: now - then, pct: ((now - then) / then) * 100,
    trend: mk && { perDecade: mk.slope * 10, p: mk.p, sure: confidence(mk.p), line: (y) => mk.intercept + mk.slope * y },
    driest, first: series[0].season, last: series[series.length - 1].season, prov: sw.provenance,
  };
}

// ---- the water stored on and under the land (GRACE/GRACE-FO) and the root-zone soil now (SMAP), via NASA GIBS ----
// GRACE: monthly anomaly in cm of water against 2004–2009, from mascons about 300 km across, so it is the region's
// water (soil, groundwater, rivers and ponds), not one field's. Each year's mean is taken over the months it has
// (at least 8: GRACE ended in mid-2017 and GRACE-FO began in mid-2018). GIBS's colour scale stops at ±30 cm, so
// a value of ±30 means "that much or more".
export const GRACE_CAP = 30;
export function graceRecord(ws, id) {
  const p = ws?.points?.[id];
  if (!p || !Object.keys(p.grace).length) return null;
  const by = {};
  for (const [m, v] of Object.entries(p.grace)) (by[m.slice(0, 4)] ??= []).push(v);
  const years = Object.entries(by).filter(([, v]) => v.length >= 8).map(([y, v]) => ({ year: +y, cm: v.reduce((a, b) => a + b, 0) / v.length, capped: v.some((x) => Math.abs(x) >= GRACE_CAP) }));
  const avg = (ys) => { const v = years.filter((x) => ys(x.year)); return v.length ? v.reduce((a, x) => a + x.cm, 0) / v.length : null; };
  const mk = years.length >= 8 ? mannKendall(years.map((x) => x.cm), years.map((x) => x.year)) : null;
  const early = avg((y) => y >= 2003 && y <= 2007), late = avg((y) => y >= 2016);
  return {
    years, early, late, change: early != null && late != null ? late - early : null,
    trend: mk && { perDecade: mk.slope * 10, p: mk.p, sure: confidence(mk.p), line: (y) => mk.intercept + mk.slope * y },
    capped: years.some((x) => x.capped), first: years[0]?.year, last: years[years.length - 1]?.year, prov: ws.provenance,
  };
}
// SMAP: the latest month's root-zone soil moisture against the same month in every earlier year since 2015.
export function smapNow(ws, id) {
  const p = ws?.points?.[id];
  const months = p ? Object.keys(p.smap).sort() : [];
  if (!months.length) return null;
  const last = months[months.length - 1], mm = last.slice(5);
  const past = months.filter((m) => m.endsWith(`-${mm}`) && m !== last).map((m) => p.smap[m]);
  const normal = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;
  return { month: last, value: p.smap[last], normal, n: past.length, pct: normal ? (p.smap[last] / normal - 1) * 100 : null, min: Math.min(...past), max: Math.max(...past) };
}
// SMAP against NASA POWER's own root-zone wetness, month by month where both exist: an independent check.
export function smapVsPower(ws, sw, id) {
  const a = ws?.points?.[id]?.smap, b = sw?.upazilas?.[id]?.root;
  if (!a || !b) return null;
  const xs = [], ys = [];
  for (const [m, v] of Object.entries(a)) { const y = +m.slice(0, 4), k = +m.slice(5) - 1; const w = b[y]?.[k]; if (w != null) { xs.push(v); ys.push(w); } }
  if (xs.length < 24) return null;
  const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, x) => s + x, 0) / ys.length;
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
  return { r: sxy / Math.sqrt(sxx * syy), n: xs.length };
}
