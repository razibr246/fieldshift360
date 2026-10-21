// Climate access, season statistics and the 25-season backtest. [REAL data in, RULE logic]
import { DAY, ymd, addDays, parseISO } from './dates.js';

export const SEASONS = Array.from({ length: 25 }, (_, i) => 2001 + i); // harvest years 2001–2025
export const THEN = SEASONS.filter((y) => y <= 2012); // 12 seasons
export const NOW = SEASONS.filter((y) => y >= 2013); // 13 seasons
export const PLAN_SEASON = 2027; // Rabi 2026–27

export function makeClimate(json) {
  const start = parseISO(json.start);
  const n = json.tmax.length;
  const end = addDays(start, n - 1);
  const idx = (t) => Math.round((t - start) / DAY);
  const val = (v, t) => {
    const i = idx(t);
    if (i < 0 || i >= n) return undefined; // outside data
    const x = json[v][i];
    return x === null ? null : x;
  };
  return { prov: json.provenance, start, end, n, val, idx, raw: json };
}

// values of variable v from t0+from .. t0+to (inclusive). Returns null if any day is outside the data.
export function windowVals(clim, v, t0, from, to) {
  const out = [];
  for (let k = from; k <= to; k++) {
    const x = clim.val(v, addDays(t0, k));
    if (x === undefined) return null;
    if (x !== null) out.push(x);
  }
  return out;
}

export function evalRule(clim, rule, t0) {
  const w = windowVals(clim, rule.v, t0, rule.from, rule.to);
  if (w === null) return { ok: null }; // not evaluable
  if (rule.type === 'any') {
    const hit = w.filter((x) => x >= rule.thr).length;
    return { ok: hit === 0, value: Math.max(0, ...w) };
  }
  if (rule.type === 'count') {
    const c = w.filter((x) => x >= rule.thr).length;
    return { ok: c < rule.min, value: c };
  }
  if (rule.type === 'total_below') {
    const s = w.reduce((a, b) => a + b, 0);
    return { ok: s >= rule.thr, value: Math.round(s) };
  }
  return { ok: null };
}

// Planting date for a crop in a given harvest-season year, shifted by `shift` days.
export function plantDate(crop, season, shift = 0) {
  const y = crop.plant.prevYear ? season - 1 : season;
  return addDays(ymd(y, crop.plant.m, crop.plant.d), shift);
}

// Replay one crop+date through every season. Returns per-season results and then/now safe rates.
export function backtest(clim, crop, shift = 0, plantFn = null) {
  const seasons = SEASONS.map((y) => {
    const t0 = plantFn ? plantFn(y) : plantDate(crop, y, shift);
    const res = crop.rules.map((r) => ({ id: r.id, ...evalRule(clim, r, t0) }));
    if (res.some((r) => r.ok === null)) return { season: y, safe: null, fired: [] };
    const fired = res.filter((r) => !r.ok).map((r) => r.id);
    return { season: y, safe: fired.length === 0, fired, values: Object.fromEntries(res.map((r) => [r.id, r.value])) };
  });
  const rate = (ys) => {
    const s = seasons.filter((x) => ys.includes(x.season) && x.safe !== null);
    return s.length ? { safe: s.filter((x) => x.safe).length, n: s.length } : { safe: 0, n: 0 };
  };
  return { seasons, then: rate(THEN), now: rate(NOW) };
}

// ---- Climate Time Machine statistics (per season) ----
const sumRange = (clim, v, a, b) => {
  let s = 0;
  for (let t = a; t <= b; t += DAY) {
    const x = clim.val(v, t);
    if (x === undefined) return null;
    if (x !== null) s += x;
  }
  return s;
};
const countRange = (clim, v, a, b, pred) => {
  let c = 0;
  for (let t = a; t <= b; t += DAY) {
    const x = clim.val(v, t);
    if (x === undefined) return null;
    if (x !== null && pred(x)) c++;
  }
  return c;
};

export const TM_METRICS = {
  hotMarApr: {
    bn: 'মার্চ-এপ্রিলের (ফাল্গুন-বৈশাখ) খুব গরম দিন', en: 'Very hot days in March–April', unit: { bn: 'দিন', en: 'days' },
    detail: { bn: '১ মার্চ থেকে ৩০ এপ্রিলের মধ্যে যেসব দিনে তাপমাত্রা ৩৫° সেলসিয়াস ছুঁয়েছে', en: 'Days from 1 March to 30 April that reached 35 °C' },
    why: { bn: 'এই সময়ে বোরো ধানে ফুল আসে; বেশি গরমে ধান চিটা হয়', en: 'Boro flowers in these weeks, and heat leaves the grains empty' },
    f: (c, y) => countRange(c, 'tmax', ymd(y, 3, 1), ymd(y, 4, 30), (x) => x >= 35),
  },
  rabiRain: {
    bn: 'রবি মৌসুমের মোট বৃষ্টি', en: 'Total Rabi-season rain', unit: { bn: 'মিলিমিটার', en: 'mm' },
    detail: { bn: 'নভেম্বর থেকে ফেব্রুয়ারি পর্যন্ত মোট বৃষ্টি', en: 'All rain from November to February' },
    why: { bn: 'বৃষ্টি কম হলে সেচের খরচ বাড়ে; হঠাৎ ভারী বৃষ্টি চারা আর ফুল নষ্ট করে', en: 'Less rain means more irrigation; a sudden downpour damages seedlings and flowers' },
    f: (c, y) => sumRange(c, 'prec', ymd(y - 1, 11, 1), ymd(y, 2, 28)),
  },
  lateHeat: {
    bn: 'ফাল্গুন-চৈত্রের গরম দিন', en: 'Warm days in late winter', unit: { bn: 'দিন', en: 'days' },
    detail: { bn: '১৫ ফেব্রুয়ারি থেকে ৩১ মার্চের মধ্যে যেসব দিনে তাপমাত্রা ৩২° সেলসিয়াস ছুঁয়েছে', en: 'Days from 15 February to 31 March that reached 32 °C' },
    why: { bn: 'গমের দানা পুষ্ট হয় আর দেরিতে লাগানো টমেটোয় ফল ধরে এই সময়ে', en: 'Wheat fills its grain and late tomatoes set fruit in these weeks' },
    f: (c, y) => countRange(c, 'tmax', ymd(y, 2, 15), ymd(y, 3, 31), (x) => x >= 32),
  },
  coldNights: {
    bn: 'পৌষ-মাঘের কনকনে ঠান্ডা রাত', en: 'Cold nights in December–January', unit: { bn: 'রাত', en: 'nights' },
    detail: { bn: 'ডিসেম্বর-জানুয়ারির যেসব রাতে তাপমাত্রা ১০° সেলসিয়াস বা তার নিচে নেমেছে', en: 'Nights in December and January at 10 °C or below' },
    why: { bn: 'বেশি ঠান্ডায় বোরোর বীজতলা আর চারা হলুদ হয়ে মরে যায়', en: 'Hard cold yellows and kills Boro seedbeds and young plants' },
    f: (c, y) => countRange(c, 'tmin', ymd(y - 1, 12, 1), ymd(y, 1, 31), (x) => x <= 10),
  },
};

export function timeMachine(clim) {
  const out = {};
  for (const [k, m] of Object.entries(TM_METRICS)) {
    const series = SEASONS.map((y) => ({ season: y, value: m.f(clim, y) }));
    const mean = (ys) => {
      const v = series.filter((s) => ys.includes(s.season) && s.value !== null).map((s) => s.value);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const thenM = mean(THEN), nowM = mean(NOW);
    out[k] = { series, then: thenM, now: nowM, change: thenM !== null && nowM !== null ? nowM - thenM : null,
      pct: thenM ? ((nowM - thenM) / thenM) * 100 : null };
  }
  return out;
}

// Mean daily temperature climatology by day of a Jul–Jun "crop year", for planning estimates.
export function tmeanClimatology(clim, seasons = NOW) {
  // index 0 = 1 Jul of (season-1)
  const sums = new Array(366).fill(0), cnt = new Array(366).fill(0);
  for (const y of seasons) {
    const t0 = ymd(y - 1, 7, 1);
    for (let k = 0; k < 366; k++) {
      const t = addDays(t0, k);
      const a = clim.val('tmax', t), b = clim.val('tmin', t);
      if (a == null || b == null) continue;
      sums[k] += (a + b) / 2; cnt[k]++;
    }
  }
  return sums.map((s, k) => (cnt[k] ? s / cnt[k] : null));
}

// Independent rainfall check: NASA POWER's corrected rainfall (what the engine uses) against NASA/JAXA GPM IMERG
// satellite rainfall, season by season. Returns null when the data file has no IMERG series.
export function rainCrossCheck(clim) {
  if (!clim.raw.prec_imerg) return null;
  const total = (v, a, b) => { let s = 0; for (let t = a; t <= b; t = addDays(t, 1)) { const x = clim.val(v, t); if (x != null) s += x; } return s; };
  const r = (x, y) => {
    const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sx = 0, sy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; }
    return sxy / Math.sqrt(sx * sy);
  };
  const season = (from, to) => {
    const rows = SEASONS.map((y) => { const [a, b] = [from(y), to(y)]; return { y, power: Math.round(total('prec', a, b)), imerg: Math.round(total('prec_imerg', a, b)) }; });
    const mean = (k) => rows.reduce((a, x) => a + x[k], 0) / rows.length;
    return { rows, r: r(rows.map((x) => x.power), rows.map((x) => x.imerg)), power: mean('power'), imerg: mean('imerg') };
  };
  return {
    rabi: season((y) => ymd(y - 1, 11, 1), (y) => ymd(y, 4, 30)), // November to April, by harvest year
    monsoon: season((y) => ymd(y, 6, 1), (y) => ymd(y, 9, 30)),
  };
}

// "This season so far": the last `days` days of a daily series (live NASA POWER or the saved file) against the same
// calendar window in each of the 25 past seasons. series: { start (UTC ms), prec[], tmax[] } with null for gaps.
export function seasonSoFar(clim, series, days = 60) {
  let last = series.prec.length - 1;
  while (last >= 0 && (series.prec[last] == null || series.tmax[last] == null)) last--;
  if (last < days - 1) return null;
  const end = addDays(series.start, last), from = addDays(end, -(days - 1));
  const cum = (getP, t0) => { const out = []; let s = 0; for (let k = 0; k < days; k++) { const v = getP(addDays(t0, k)); s += v ?? 0; out.push(s); } return out; };
  const nowIdx = (t) => Math.round((t - series.start) / DAY);
  const nowPrec = Array.from({ length: days }, (_, k) => series.prec[last - days + 1 + k]);
  const now = {
    cum: cum((t) => series.prec[nowIdx(t)], from),
    tmax: avg(Array.from({ length: days }, (_, k) => series.tmax[last - days + 1 + k])),
    hot: Array.from({ length: days }, (_, k) => series.tmax[last - days + 1 + k]).filter((x) => x >= 35).length,
    wet: nowPrec.filter((x) => x != null && x >= 1).length, // rainy days: 1 mm or more
  };
  const past = SEASONS.map((y) => {
    const shift = ymd(y, new Date(from).getUTCMonth() + 1, new Date(from).getUTCDate());
    const tm = Array.from({ length: days }, (_, k) => clim.val('tmax', addDays(shift, k)));
    if (tm.some((x) => x === undefined)) return null;
    const pr = Array.from({ length: days }, (_, k) => clim.val('prec', addDays(shift, k)));
    return { y, cum: cum((t) => clim.val('prec', t), shift), tmax: avg(tm.filter((x) => x != null)), hot: tm.filter((x) => x != null && x >= 35).length, wet: pr.filter((x) => x != null && x >= 1).length };
  }).filter(Boolean);
  const q = (arr, p) => { const v = [...arr].sort((a, b) => a - b); const i = (v.length - 1) * p; return v[Math.floor(i)] + (v[Math.ceil(i)] - v[Math.floor(i)]) * (i % 1); };
  const band = Array.from({ length: days }, (_, k) => { const col = past.map((p) => p.cum[k]); return { lo: q(col, 0.25), mid: q(col, 0.5), hi: q(col, 0.75) }; });
  return {
    from, end, days, now, band, years: past.length,
    normal: { rain: q(past.map((p) => p.cum[days - 1]), 0.5), tmax: avg(past.map((p) => p.tmax)), hot: avg(past.map((p) => p.hot)), wet: avg(past.map((p) => p.wet)) },
    // How this year's rain ranks: in how many past years the same weeks were drier.
    drierYears: past.filter((p) => p.cum[days - 1] < now.cum[days - 1]).length,
  };
}
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

// What-if seasons: the same 25 seasons replayed a little hotter or drier, so the farmer can see whether the advice
// holds up. Only the values the engine reads are shifted; the stored data is untouched.
export const WHAT_IFS = {
  normal: { dT: 0, rain: 1, bn: 'স্বাভাবিক', en: 'As measured' },
  dry: { dT: 0, rain: 0.8, bn: 'শুকনো (বৃষ্টি −২০%)', en: 'Drier (rain −20%)' },
  hot1: { dT: 1, rain: 1, bn: 'গরম (+১°)', en: 'Hotter (+1°)' },
  hot2: { dT: 2, rain: 1, bn: 'আরও গরম (+২°)', en: 'Much hotter (+2°)' },
};
export function whatIf(clim, key = 'normal') {
  const w = WHAT_IFS[key] ?? WHAT_IFS.normal;
  if (!w.dT && w.rain === 1) return clim;
  const val = (v, t) => {
    const x = clim.val(v, t);
    if (x == null) return x;
    if (v === 'tmax' || v === 'tmin') return x + w.dT;
    if (v === 'prec') return x * w.rain;
    return x;
  };
  return { ...clim, val, whatIf: key };
}

// ---- Station bias correction ----
// NASA POWER's grid cell is a model blend (MERRA-2/GEOS-IT), not a thermometer. Against the nearest BMD station's
// 1991–2020 normals it runs 2–3 °C too hot in March–May and about 2 °C too cool in October–November, which would
// inflate every count of "days at 35 °C" in exactly the weeks Boro flowers and wheat fills. Rain agrees closely, so
// only temperature is adjusted: each day gets the monthly difference (POWER 2001–2020 mean minus station normal),
// blended between mid-month anchors so there are no jumps on the 1st. Year-to-year changes and trends are untouched;
// only the level moves. Night temperatures are left alone when the station is in a city (its nights are kept warm).
export function stationCorrect(json, station) {
  if (!station) return json;
  const start = parseISO(json.start);
  const monthOf = (i) => new Date(start + i * DAY).getUTCMonth();
  const bias = (v) => {
    const sum = new Array(12).fill(0), n = new Array(12).fill(0);
    json[v].forEach((x, i) => {
      const y = new Date(start + i * DAY).getUTCFullYear();
      if (x == null || y < 2001 || y > 2020) return;
      sum[monthOf(i)] += x; n[monthOf(i)]++;
    });
    return sum.map((s, m) => Math.round((s / n[m] - station[v][m]) * 100) / 100);
  };
  // Day-of-year weight between the two nearest mid-month anchors.
  const daily = (b) => (i) => {
    const d = new Date(start + i * DAY), m = d.getUTCMonth(), day = d.getUTCDate();
    const dim = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate();
    const pos = m + (day - 0.5) / dim - 0.5; // 0 = middle of January
    const a = Math.floor(pos), f = pos - a;
    return b[(a + 12) % 12] * (1 - f) + b[(a + 13) % 12] * f;
  };
  const fix = (v, b) => json[v].map((x, i) => (x == null ? x : Math.round((x - daily(b)(i)) * 100) / 100));
  const bTmax = bias('tmax'), bTmin = station.urban ? null : bias('tmin');
  return {
    ...json, tmax: fix('tmax', bTmax), tmin: bTmin ? fix('tmin', bTmin) : json.tmin, tmax_raw: json.tmax, tmin_raw: json.tmin,
    provenance: { ...json.provenance, corrected: { station: station.name, km: station.km, urban: station.urban, tmax: bTmax, tmin: bTmin } },
  };
}
