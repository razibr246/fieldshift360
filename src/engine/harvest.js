// Harvest window and yield range: a PLANNING ESTIMATE [RULE on REAL temperature + REAL FAOSTAT yields].
// Growing degree days (GDD) target is calibrated at runtime: the GDD a crop accumulates over its
// typical duration from its normal date, using the 2001–2025 average. A warmer recent climate or a
// different planting date then changes the estimated duration.
import { ymd, addDays, daysBetween, parseISO } from './dates.js';
import HIST from '../data/market/yield_history.json' with { type: 'json' };
import { SEASONS, NOW, tmeanClimatology } from './climate.js';
import { BIGHA_HA, DECIMAL_HA, MAUND_KG } from './crops.js';

const cache = new WeakMap();
function clims(clim) {
  if (!cache.has(clim)) cache.set(clim, { all: tmeanClimatology(clim, SEASONS), now: tmeanClimatology(clim, NOW) });
  return cache.get(clim);
}

// crop-year index: days since 1 Jul of the previous calendar year relative to the harvest season
const cyIndex = (t, season) => daysBetween(ymd(season - 1, 7, 1), t);

function gdd(tm, base, k0, days) {
  let s = 0;
  for (let k = k0; k < k0 + days && k < tm.length; k++) if (tm[k] != null) s += Math.max(0, tm[k] - base);
  return s;
}

export function harvestWindow(clim, crop, plantT, season) {
  const { all, now } = clims(clim);
  const normalT = ymd(crop.plant.prevYear ? season - 1 : season, crop.plant.m, crop.plant.d);
  const target = gdd(all, crop.gddBase, cyIndex(normalT, season), crop.days);
  let k = cyIndex(plantT, season), acc = 0, d = 0;
  while (acc < target && k < now.length) {
    if (now[k] != null) acc += Math.max(0, now[k] - crop.gddBase);
    k++; d++;
  }
  if (acc < target) d = crop.days; // fallback
  const start = addDays(plantT, d);
  const end = addDays(start, crop.harvestWeeks.length * 7 - 1);
  return { start, end, days: d, gddTarget: Math.round(target) };
}

export function yieldRange(crop, areaDecimal, safetyNow = 1) {
  const ha = areaDecimal * DECIMAL_HA;
  const stress = safetyNow < 0.6 ? 0.85 : 1; // high-risk climate trims the upper end
  const lo = crop.yieldTHa[0] * ha * 1000;
  const hi = crop.yieldTHa[1] * ha * 1000 * stress;
  return { kgLow: lo, kgHigh: Math.max(lo, hi), maundLow: lo / MAUND_KG, maundHigh: Math.max(lo, hi) / MAUND_KG };
}

// Live harvest date once the crop is in: the warmth it has actually had since planting (daily mean of Open-Meteo
// max and min at the field, for the up to 92 days it gives), then the 2013–2025 average for the days still to come.
// Same heat target as harvestWindow, so a warm or cold spell moves the date by as much as it really did.
export function liveHarvest(clim, crop, plantT, season, wx, today) {
  const base = harvestWindow(clim, crop, plantT, season);
  if (!wx?.days || today <= plantT) return { ...base, observed: 0, progress: 0, live: false };
  const { now } = clims(clim);
  const obs = new Map(wx.days.map((x) => [parseISO(x.d), x]));
  let acc = 0, d = 0, k = cyIndex(plantT, season), observed = 0, accToday = 0;
  while (acc < base.gddTarget && d < crop.days * 2) {
    const t = addDays(plantT, d);
    const x = t <= today ? obs.get(t) : null;
    const tm = x && x.tmax != null && x.tmin != null ? (x.tmax + x.tmin) / 2 : now[k];
    if (x) observed++;
    if (tm != null) acc += Math.max(0, tm - crop.gddBase);
    if (t <= today) accToday = acc;
    k++; d++;
  }
  const start = addDays(plantT, d), end = addDays(start, crop.harvestWeeks.length * 7 - 1);
  return { start, end, days: d, gddTarget: base.gddTarget, observed, progress: Math.min(1, accToday / base.gddTarget), shift: daysBetween(base.start, start), live: observed > 0 };
}

// Yield from the last five years of FAOSTAT national yields (lowest to highest year), on this field's area.
// A high weather risk on this date trims the top end, as in yieldRange.
export const YIELD_YEARS = HIST.years;
export function yieldFromHistory(crop, areaDecimal, safetyNow = 1) {
  const h = HIST.crops[crop.id];
  if (!h) return { ...yieldRange(crop, areaDecimal, safetyNow), years: null };
  const v = Object.values(h.tHa), ha = areaDecimal * DECIMAL_HA, stress = safetyNow < 0.6 ? 0.85 : 1;
  const lo = Math.min(...v) * ha * 1000, hi = Math.max(lo, Math.max(...v) * ha * 1000 * stress);
  const latestYear = Math.max(...Object.keys(h.tHa).map(Number));
  return { kgLow: lo, kgHigh: hi, maundLow: lo / MAUND_KG, maundHigh: hi / MAUND_KG, years: HIST.years, tHa: h.tHa, latest: { year: latestYear, tHa: h.tHa[latestYear] }, item: h.item };
}
