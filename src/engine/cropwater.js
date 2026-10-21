// How much water each crop needs on this land, from the area's own (station-corrected) NASA weather. [REAL in, RULE]
// FAO-56 single crop coefficient method: daily need = Kc × ET₀ (Hargreaves, eq. 52), Kc by growth stage
// (FAO-56 Table 12; stage shares from Table 11, stretched to the crop's own duration in crops.js), minus the rain the
// crop can use (80% of any day over 5 mm). Rice also needs about 200 mm to soak and puddle the field (FAO Irrigation
// Water Management, Training Manual 3, ch. 3). Seepage and percolation are not counted: they depend on the field.
// The need is replayed over the last 13 seasons from the same planting date and the median is used.
import { DAY, ymd } from './dates.js';
import { hargreaves } from './agroclimate.js';

// [initial, development, mid, late] share of the season, and Kc initial / mid / end.
export const FAO56 = {
  boro: { stages: [0.2, 0.2, 0.4, 0.2], kc: [1.05, 1.2, 0.75], puddle: 200, name: 'Rice' },
  wheat: { stages: [0.15, 0.19, 0.44, 0.22], kc: [0.3, 1.15, 0.33], name: 'Small grains (wheat)' },
  mustard: { stages: [0.17, 0.24, 0.38, 0.21], kc: [0.35, 1.08, 0.35], name: 'Rapeseed / canola' },
  lentil: { stages: [0.13, 0.2, 0.4, 0.27], kc: [0.4, 1.1, 0.3], name: 'Lentil' },
  tomato: { stages: [0.22, 0.3, 0.3, 0.18], kc: [0.6, 1.15, 0.8], name: 'Tomato' },
  // Kharif-1, for the next crop. FAO-56 lists no jute, so its water is not estimated.
  mungbean: { stages: [0.2, 0.3, 0.3, 0.2], kc: [0.4, 1.05, 0.35], name: 'Mung bean (green gram)' },
  sesame: { stages: [0.18, 0.27, 0.37, 0.18], kc: [0.35, 1.1, 0.25], name: 'Sesame' },
  aus: { stages: [0.2, 0.2, 0.4, 0.2], kc: [1.05, 1.2, 0.75], name: 'Rice (direct-seeded, no puddling)' },
};
export const WATER_SOURCES = [
  { label: 'FAO Irrigation and Drainage Paper 56, Crop evapotranspiration (Tables 11–12, eq. 52)', url: 'https://www.fao.org/4/x0490e/x0490e00.htm' },
  { label: 'FAO Irrigation Water Management, Training Manual 3: crop water needs of rice', url: 'https://www.fao.org/4/s2022e/s2022e00.htm' },
];

export function kcOn(cropId, day, days) {
  const f = FAO56[cropId];
  const [a, b, c] = f.stages.map((s) => s * days);
  const [ini, mid, end] = f.kc;
  if (day < a) return ini;
  if (day < a + b) return ini + ((mid - ini) * (day - a)) / b;
  if (day < a + b + c) return mid;
  return mid + ((end - mid) * (day - a - b - c)) / (days - a - b - c);
}

// One season: water need (mm) from planting day t0 for `days` days.
function seasonNeed(clim, cropId, t0, days) {
  let need = 0, rain = 0, et = 0;
  for (let d = 0; d < days; d++) {
    const t = t0 + d * DAY, x = clim.val('tmax', t), n = clim.val('tmin', t), p = clim.val('prec', t);
    if (x === undefined || n === undefined || p === undefined) return null;
    if (x == null || n == null) continue;
    const etc = kcOn(cropId, d, days) * hargreaves(x, n, clim.prov.lat, t);
    const pe = (p ?? 0) > 5 ? 0.8 * p : 0;
    et += etc; rain += Math.min(pe, etc); need += Math.max(0, etc - pe);
  }
  return { need, et, rain };
}

// Median over the last 13 seasons, planting on the same day of the year as t0. mm, and m³ per bigha (1 mm = 1.338 m³).
export function cropWaterNeed(clim, crop, t0) {
  if (!FAO56[crop.id]) return null;
  const m = new Date(t0).getUTCMonth(), d = new Date(t0).getUTCDate();
  const rows = [];
  for (let y = 2013; y <= 2026; y++) {
    const r = seasonNeed(clim, crop.id, ymd(m >= 8 ? y - 1 : y, m + 1, d), crop.days);
    if (r) rows.push(r);
  }
  if (!rows.length) return null;
  const med = (k) => { const v = rows.map((r) => r[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const puddle = FAO56[crop.id].puddle ?? 0;
  const mm = Math.round(med('need') + puddle);
  return { mm, et: Math.round(med('et')), rain: Math.round(med('rain')), puddle, m3PerBigha: Math.round(mm * 1.338), seasons: rows.length };
}
