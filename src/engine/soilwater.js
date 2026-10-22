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
