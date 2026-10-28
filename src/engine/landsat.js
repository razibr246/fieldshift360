// The land seen from space, month by month since 2001 (src/data/land/land_sat.json, scripts/fetch/gibs-land.mjs):
// MODIS NDVI (how green), MODIS daytime land surface temperature (heat at the ground) and MERRA-2 evaporation, at the
// upazila centre (about 5 km round it, so the area's fields, not one field). From them: the year's green cycle and its
// leanest months (when the area's fields most often lie bare), each Rabi season's greenness against its usual (years of
// vegetation stress), and how the ground heat of the hot months has changed. Pure. [REAL data in, RULE logic]
import LAND from '../data/land/land_sat.json' with { type: 'json' };

export const LAND_SOURCE = LAND.provenance;
export const landRecord = (id) => LAND.points[id] ?? null;
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const sd = (v) => { const m = mean(v); return Math.sqrt(mean(v.map((x) => (x - m) ** 2))); };
const byMonth = (series, m) => Object.entries(series).filter(([k]) => +k.slice(5, 7) === m).map(([, v]) => v);
// a value per month of a season, by the Rabi's harvest year (Nov–Dec count to the next year)
const seasonOf = (key) => { const y = +key.slice(0, 4), m = +key.slice(5, 7); return m >= 11 ? y + 1 : y; };

// The usual value of each calendar month (1–12) over the whole record.
export function monthlyCycle(series) {
  return Array.from({ length: 12 }, (_, i) => mean(byMonth(series, i + 1)));
}

// The leanest months of the year: below the 30th percentile of the twelve usual NDVI values, where the green cover
// is thinnest, which in a rice landscape is when the most fields lie bare between crops.
export function leanMonths(ndvi) {
  const cyc = monthlyCycle(ndvi), sorted = cyc.filter((v) => v != null).sort((a, b) => a - b);
  const cut = sorted[Math.floor(sorted.length * 0.3)];
  return { cycle: cyc, lean: cyc.map((v, i) => (v != null && v <= cut ? i + 1 : null)).filter(Boolean), greenest: cyc.indexOf(Math.max(...sorted)) + 1 };
}

// Each Rabi season's mean NDVI (December to March) against the area's own trend line (more land under irrigated
// crops greens the Rabi year by year, so the plain mean would mark the early years stressed), in standard deviations
// of the departures: below −1 is a season of clear vegetation stress (drought, heat, a late or failed crop).
// Also the trend itself, in NDVI per decade.
export function rabiGreenness(ndvi, months = [12, 1, 2, 3]) {
  const by = {};
  for (const [k, v] of Object.entries(ndvi)) if (months.includes(+k.slice(5, 7))) (by[seasonOf(k)] ??= []).push(v);
  const rows = Object.entries(by).filter(([, v]) => v.length === months.length).map(([y, v]) => ({ y: +y, v: mean(v) }));
  const my = mean(rows.map((r) => r.y)), mv = mean(rows.map((r) => r.v));
  const slope = rows.reduce((a, r) => a + (r.y - my) * (r.v - mv), 0) / (rows.reduce((a, r) => a + (r.y - my) ** 2, 0) || 1);
  const dev = rows.map((r) => r.v - (mv + slope * (r.y - my))), s = sd(dev) || 1;
  const out = rows.map((r, i) => ({ ...r, trend: mv + slope * (r.y - my), z: dev[i] / s, stress: dev[i] / s <= -1 }));
  out.perDecade = slope * 10;
  return out;
}

// Ground heat in the hot months (March to May, when Boro flowers and fills): 2001–2012 against 2013 onwards.
export function groundHeat(lst, months = [3, 4, 5]) {
  const pick = (from, to) => Object.entries(lst).filter(([k]) => months.includes(+k.slice(5, 7)) && +k.slice(0, 4) >= from && +k.slice(0, 4) <= to).map(([, v]) => v);
  const then = mean(pick(2001, 2012)), now = mean(pick(2013, 2100));
  return { then, now, change: now - then };
}

// Everything the page shows, for one place.
export function landSummary(id) {
  const p = landRecord(id);
  if (!p) return null;
  const green = leanMonths(p.ndvi);
  const rabi = rabiGreenness(p.ndvi);
  return {
    green, rabi, stressYears: rabi.filter((r) => r.stress).map((r) => r.y), greening: rabi.perDecade,
    heat: groundHeat(p.lst), lstCycle: monthlyCycle(p.lst), evapCycle: monthlyCycle(p.evap),
    evapYear: monthlyCycle(p.evap).reduce((a, v, i) => a + (v ?? 0) * [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i], 0),
    years: [Math.min(...Object.keys(p.ndvi).map((k) => +k.slice(0, 4))), Math.max(...Object.keys(p.ndvi).map((k) => +k.slice(0, 4)))],
  };
}
