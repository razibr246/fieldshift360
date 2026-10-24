// Collective planting / glut warning [RULE on confirmed plans (shared board) + sample neighbours; REAL DAM prices].
import { ymd, addDays, DAY } from './dates.js';
import { RABI_CROPS, DECIMAL_HA } from './crops.js';
import { harvestWindow } from './harvest.js';
import { PLAN_SEASON } from './climate.js';
import SEASONS from '../data/market/price_seasons.json' with { type: 'json' };

export const WEEK0 = ymd(2026, 10, 5); // a Monday; week bins counted from here
export const weekOf = (t) => Math.floor((t - WEEK0) / (7 * DAY));
export const weekStart = (w) => addDays(WEEK0, w * 7);

// typical share of union farm area under each crop in a "normal" Rabi [DEMO baseline]
export const TYPICAL_SHARE = { boro: 0.35, tomato: 0.35, wheat: 0.1, lentil: 0.08, mustard: 0.12 };
// Monthly price pattern and yield per crop [REAL: DAM national monthly prices; FAOSTAT Bangladesh yield].
export const PRICE_SEASONS = SEASONS;
// Weeks when each crop's price usually falls in this Rabi's harvest: the longest run of DAM dip months between
// December and June, as one window of weeks. A crop without enough DAM data gets no window.
const HARVEST_MONTHS = [12, 1, 2, 3, 4, 5, 6];
function dipWindow(months) {
  let best = [], run = [];
  for (const m of [...HARVEST_MONTHS, 0]) {
    if (months.includes(m)) { run.push(m); continue; }
    if (run.length > best.length) best = run;
    run = [];
  }
  if (!best.length) return null;
  const yr = (m) => (m >= 10 ? 2026 : 2027);
  const a = best[0], b = best[best.length - 1];
  return [weekOf(ymd(yr(a), a, 1)), weekOf(ymd(yr(b), b + 1, 1) - DAY)];
}
// true when DAM reports too few of the harvest months (Dec–Jun) to say whether prices fall then
export const noHarvestPrices = (cropId) => {
  const c = SEASONS.crops[cropId];
  return !c || HARVEST_MONTHS.filter((m) => c.index[m - 1] != null).length < 4;
};
export const PRICE_DIP = Object.fromEntries(Object.entries(SEASONS.crops).map(([k, c]) => [k, dipWindow(c.dipMonths)]).filter(([, w]) => w));
export const HIGH_FACTOR = 1.3;

// tomato transplant slots (planting windows)
export const SLOTS = [
  { id: 'S1', from: ymd(2026, 10, 25), to: ymd(2026, 11, 7) },
  { id: 'S2', from: ymd(2026, 11, 8), to: ymd(2026, 11, 21) },
  { id: 'S3', from: ymd(2026, 11, 22), to: ymd(2026, 12, 5) },
  { id: 'S4', from: ymd(2026, 12, 6), to: ymd(2026, 12, 19) },
];
export const slotOf = (t) => SLOTS.find((s) => t >= s.from && t <= s.to)?.id ?? null;

// national average yield from FAOSTAT where we have it, else the middle of the crop's sample range
export const midYield = (crop) => SEASONS.crops[crop.id]?.yieldTHa ?? (crop.yieldTHa[0] + crop.yieldTHa[1]) / 2;

// supply (tonnes) by week for one crop in one union
export function supplyCurve(clim, plans, cropId, extra = []) {
  const crop = RABI_CROPS[cropId];
  const bins = new Map();
  for (const p of [...plans, ...extra]) {
    if (p.crop !== cropId) continue;
    const hw = p._hw ?? harvestWindow(clim, crop, p.date, PLAN_SEASON);
    const t = midYield(crop) * p.area_dec * DECIMAL_HA;
    const w0 = weekOf(hw.start);
    crop.harvestWeeks.forEach((share, i) => bins.set(w0 + i, (bins.get(w0 + i) || 0) + t * share));
  }
  return bins;
}

export function normalWeekly(unionArea, cropId) {
  const crop = RABI_CROPS[cropId];
  const totalT = unionArea * DECIMAL_HA * TYPICAL_SHARE[cropId] * midYield(crop);
  const spread = cropId === 'tomato' ? 10 : 4; // normal harvest spread in weeks
  return totalT / spread;
}

export function riskForWeeks(bins, weeks, normal, cropId) {
  const dip = PRICE_DIP[cropId];
  let level = 'Low';
  const detail = [];
  for (const w of weeks) {
    const s = bins.get(w) || 0;
    const inDip = dip ? w >= dip[0] && w <= dip[1] : false;
    const over = s > HIGH_FACTOR * normal;
    let l = 'Low';
    if (over && inDip) l = 'High';
    else if (over || (inDip && s > normal)) l = 'Medium';
    detail.push({ week: w, supply: s, inDip, level: l });
    if (l === 'High' || (l === 'Medium' && level === 'Low')) level = l;
  }
  return { level, detail };
}

// Glut risk for a candidate (crop, planting date) on a plot, given the union's other plans.
// Level is judged on the share of THIS plot's harvest that lands in High / Medium weeks.
export function glutRisk(clim, union, cropId, plantT, plot) {
  const crop = RABI_CROPS[cropId];
  const others = union.plans.filter((p) => p.plot_id !== plot.id);
  const mine = { plot_id: plot.id, crop: cropId, date: plantT, area_dec: plot.area_dec };
  const bins = supplyCurve(clim, others, cropId, [mine]);
  const hw = harvestWindow(clim, crop, plantT, PLAN_SEASON);
  const w0 = weekOf(hw.start);
  const weeks = crop.harvestWeeks.map((_, i) => w0 + i);
  const normal = normalWeekly(union.area_dec, cropId);
  const r = riskForWeeks(bins, weeks, normal, cropId);
  let hiShare = 0, medShare = 0;
  r.detail.forEach((d, i) => {
    if (d.level === 'High') hiShare += crop.harvestWeeks[i];
    if (d.level === 'Medium') medShare += crop.harvestWeeks[i];
  });
  const level = hiShare >= 0.5 ? 'High' : hiShare >= 0.2 || hiShare + medShare >= 0.5 ? 'Medium' : 'Low';
  const share = others.filter((p) => p.crop === cropId).reduce((a, p) => a + p.area_dec, 0) / union.area_dec;
  return { level, detail: r.detail, hiShare, medShare, share, normal, bins, weeks };
}

export function slotLoad(union) {
  const cap = (union.area_dec * TYPICAL_SHARE.tomato / SLOTS.length) * HIGH_FACTOR;
  return SLOTS.map((s) => {
    const load = union.plans.filter((p) => p.crop === 'tomato' && p.date >= s.from && p.date <= s.to).reduce((a, p) => a + p.area_dec, 0);
    return { ...s, load, cap, full: load >= cap };
  });
}

export const GLUT_SCORE = { Low: 90, Medium: 55, High: 20 };

// ---- What the price actually did in this harvest's weeks [REAL: DAM monthly grower prices, 2008–2023] ----
const median = (v) => { const a = [...v].sort((x, y) => x - y); const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
// Crops a farmer can hold back and sell later (tomato rots within days).
export const STORABLE = new Set(['boro', 'wheat', 'lentil', 'mustard']);
// For each year DAM reported, the harvest-weighted price in this harvest's own months against that year's median
// month: below 0.9 means that year's harvest sold at least 10% under the usual price.
export function harvestPriceHistory(cropId, hw) {
  const c = SEASONS.crops[cropId], crop = RABI_CROPS[cropId];
  if (!c || !crop) return null;
  const wm = new Map(); // month index (0–11) → share of the harvest
  crop.harvestWeeks.forEach((share, i) => { const m = new Date(hw.start + (i * 7 + 3) * DAY).getUTCMonth(); wm.set(m, (wm.get(m) || 0) + share); });
  const rows = [];
  for (const [y, months] of Object.entries(c.years)) {
    const vals = months.filter((v) => v != null);
    if (vals.length < 6) continue; // too thin a year to have a "usual" price
    let sw = 0, sp = 0;
    for (const [m, w] of wm) if (months[m] != null) { sw += w; sp += w * months[m]; }
    if (sw < 0.5) continue; // DAM did not report most of the harvest months that year
    const price = sp / sw, med = median(vals);
    rows.push({ year: +y, ratio: price / med, tkKg: price / 100, usualKg: med / 100 });
  }
  const harvestMonths = [...wm.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  // Holding back: the long-run monthly pattern for the four months after the main harvest month; only a gain of
  // 5% or more is worth mentioning once storage and interest are paid.
  let hold = null;
  if (STORABLE.has(cropId) && c.index[harvestMonths[0]] != null) {
    const m0 = harvestMonths[0];
    const later = [1, 2, 3, 4].map((k) => (m0 + k) % 12).filter((m) => c.index[m] != null);
    const best = later.sort((a, b) => c.index[b] - c.index[a])[0];
    if (best != null && c.index[best] >= 1.05 * c.index[m0]) hold = { month: best, gain: c.index[best] / c.index[m0] - 1 };
  }
  return {
    rows, n: rows.length, enough: rows.length >= 4,
    below: rows.filter((r) => r.ratio <= 0.9).length, medRatio: rows.length ? median(rows.map((r) => r.ratio)) : null,
    harvestMonths, hold, priceType: c.priceType, dam: c.dam, years: rows.length ? [rows[0].year, rows[rows.length - 1].year] : null,
  };
}
