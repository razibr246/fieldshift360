// The land seen from space, month by month since 2001 (src/data/land/land_sat.json, scripts/fetch/gibs-land.mjs):
// MODIS NDVI (how green), MODIS daytime land surface temperature (heat at the ground) and MERRA-2 evaporation, at the
// upazila centre (about 5 km round it, so the area's fields, not one field). From them: the year's green cycle and its
// leanest months (when the area's fields most often lie bare), each Rabi season's greenness against its usual (years of
// vegetation stress), and how the ground heat of the hot months has changed. Pure. [REAL data in, RULE logic]
import LAND from '../data/land/land_sat.json' with { type: 'json' };
import FIELDS from '../data/land/field_ndvi.json' with { type: 'json' };
import LANDSAT from '../data/land/field_landsat.json' with { type: 'json' };

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

// ── each registered field's own record: MODIS 250 m NDVI (scripts/fetch/modis-fields.mjs) ──
export const FIELD_NDVI_SOURCE = FIELDS.provenance;

// One field's Rabi greenness year by year (January–February, against its own trend), its stressed seasons, and how
// green its Rabi runs against the area's (the 5 km record). Null until enough years have been fetched.
export function fieldGreen(fieldId, upazilaId) {
  const s = FIELDS.fields?.[fieldId];
  if (!s) return null;
  const rabi = rabiGreenness(s, [1, 2]);
  if (rabi.length < 12) return null;
  const area = LAND.points[upazilaId]?.ndvi;
  const janFeb = (ser) => mean(Object.entries(ser).filter(([k]) => ['01', '02'].includes(k.slice(5, 7)) && +k.slice(0, 4) >= 2016).map(([, v]) => v));
  const mine = janFeb(s), theirs = area ? janFeb(area) : null;
  return {
    rabi, stressYears: rabi.filter((r) => r.stress).map((r) => r.y), years: [rabi[0].y, rabi[rabi.length - 1].y],
    rabiNdvi: mine, areaNdvi: theirs, vsArea: theirs != null ? mine - theirs : null,
  };
}

// Three statistical ways to name a field's stressed Rabi seasons from the same MODIS record, side by side, so the
// choice of method is visible rather than hidden:
//   trend  the method the app uses: below its own long-term trend by one standard deviation or more (a field that has
//          been greening for twenty years is not called stressed just for an ordinary early year)
//   low    the plain rule: the lowest fifth of the raw values, no trend removed (early years dominate when a field
//          greens over time)
//   area   the field against its area in the same season, lowest fifth of the difference (weather that hit the whole
//          area cancels out; what is left is the field's own trouble: water, pests, late sowing)
// field: fieldGreen(); areaNdvi: the upazila's monthly NDVI (land_sat.json). Years each method names, and where all agree.
export function stressMethods(field, areaNdvi = null) {
  if (!field?.rabi?.length) return null;
  const rows = field.rabi, k = Math.max(1, Math.round(rows.length / 5));
  const lowest = (xs) => new Set([...xs].sort((a, b) => a.v - b.v).slice(0, k).map((x) => x.y));
  const trend = new Set(rows.filter((r) => r.stress).map((r) => r.y));
  const low = lowest(rows);
  let area = null;
  if (areaNdvi) {
    const a = Object.fromEntries(rabiGreenness(areaNdvi, [1, 2]).map((r) => [r.y, r.v]));
    const d = rows.filter((r) => a[r.y] != null).map((r) => ({ y: r.y, v: r.v - a[r.y] }));
    if (d.length >= 8) area = lowest(d);
  }
  const sets = { trend, low, ...(area ? { area } : {}) };
  const years = [...new Set(Object.values(sets).flatMap((x) => [...x]))].sort((a, b) => a - b);
  const all = years.filter((y) => Object.values(sets).every((x) => x.has(y)));
  const jac = (x, y) => { const u = new Set([...x, ...y]); return u.size ? [...x].filter((v) => y.has(v)).length / u.size : 1; };
  return { n: rows.length, k, years, sets: Object.fromEntries(Object.entries(sets).map(([m, x]) => [m, [...x].sort((a, b) => a - b)])), all, agreeTrendLow: jac(trend, low), perDecade: rows.perDecade };
}

// A field's Rabi greenness a generation ago (Landsat WELD, 30 m, December–March of three epochs) beside today's
// (MODIS 250 m, January–February since 2016). Different sensors at different scales: only a clear change in
// direction (more than 0.05 NDVI) is called, never a small difference. null when Landsat has no clear pixels there.
export const LANDSAT_SOURCE = LANDSAT.provenance;
const EPOCHS = [['1984–86', 1984, 1986], ['1988–91', 1988, 1991], ['1998–2001', 1998, 2001]];
export function landsatThenNow(fieldId, upazilaId) {
  const s = LANDSAT.fields?.[fieldId];
  if (!s) return null;
  const season = (k) => (+k.slice(5, 7) === 12 ? +k.slice(0, 4) + 1 : +k.slice(0, 4)); // December counts with the next year
  const then = EPOCHS.map(([label, a, b]) => {
    const v = Object.entries(s).filter(([k]) => season(k) >= a && season(k) <= b).map(([, x]) => x);
    return { label, ndvi: mean(v), n: v.length };
  }).filter((e) => e.n >= 2);
  if (!then.length) return null;
  const now = fieldGreen(fieldId, upazilaId)?.rabiNdvi ?? null;
  const last = then[then.length - 1], change = now != null ? now - last.ndvi : null;
  return { then, now, change, direction: change == null ? null : change > 0.05 ? 'greener' : change < -0.05 ? 'browner' : 'similar' };
}
