// Field Future: ten years of one field under a rotation, today's weather and NASA's 2040s projections. [REAL in, RULE]
//
// A rotation is a cycle of years, each a Rabi crop and a Kharif-1 crop (or fallow), with T. Aman every monsoon, and a
// choice of what happens to the straw. For each year it works out:
//   Soil carbon  ICBM, the Introductory Carbon Balance Model (Andrén & Kätterer 1997, Ecol. Appl. 7:1226): a young
//                and an old pool, k1 = 0.8 and k2 = 0.006 a year, humification 0.125 for straw and stubble and 0.29 for
//                roots (2.3 times straw: Kätterer et al. 2011, Agric. Ecosyst. Environ. 141:184). Carbon going in comes
//                from the yield, the harvest index and the root-to-shoot ratio, with 65% of root carbon again as root
//                exudates (Bolinder et al. 2007, Agric. Ecosyst. Environ. 118:29), and only the straw left on the field.
//                Decay speeds up with warmth (Ratkowsky form, Tmin −3.8 °C: Andrén et al. 2004, Nutr. Cycl.
//                Agroecosyst. 70:231) and slows to a fifth while a paddy is flooded (Shirato & Yokozawa 2005, Soil Sci.
//                Plant Nutr. 51:405). The field's own SoilGrids carbon is taken as the level its usual rotation holds
//                (the usual way to start ICBM or RothC without a long record), so a rotation is judged by how it moves
//                the carbon away from where the field is today, not by an absolute number.
//   Water        FAO-56 Kc × ET₀ less usable rain (cropwater.js), on the upazila's station-corrected NASA POWER days.
//   Weather      each crop's own failure rules (crops.js) replayed over 2013–2025 at its sowing day.
//   Money        FAOSTAT yield × (price − full cost) per bigha (economics.js), where a sourced price exists.
//   Soil health  the four soil-health principles of USDA NRCS: keep the soil covered with living roots, grow many
//                kinds of crops, disturb the soil less, and build organic matter.
// The 2040s: the same 2013–2025 days shifted month by month by NASA NEX-GDDP-CMIP6 v2.0 (eight models, 2041–2050 against
// 2005–2014, cmip6_deltas.json), the "delta change" method, so the place keeps its real weather and only moves by what
// the models project. Model numbers below are STARTING VALUES from the literature; an agronomist should check them.
import { RABI_CROPS, ROTATION_CROPS, BIGHA_HA, WATER_CLASS, withBoroHeat } from './crops.js';
import { cropWaterNeed } from './cropwater.js';
import { evalRule, plantDate, NOW, PLAN_SEASON } from './climate.js';
import { cropMoney } from './economics.js';
import { ymd, addDays, DAY, monthOf, dayOf } from './dates.js';
import yieldHistory from '../data/market/yield_history.json' with { type: 'json' };

export const YEARS = 10;
export const FIRST_YEAR = PLAN_SEASON; // Rabi 2026–27 is year one
export const RABI_OPTS = ['boro', 'wheat', 'lentil', 'mustard', 'tomato', 'fallow'];
export const K1_OPTS = ['mungbean', 'sesame', 'jute', 'aus', 'fallow'];
const AMAN_PREP = 10; // as rotation.js: days to plough and puddle before the Aman goes in
const AMAN_DAYS = 120; // BRRI dhan49 / dhan75 class, transplanting to harvest

export const FALLOW = { id: 'fallow', family: null, name: { bn: 'পতিত', en: 'Fallow' }, days: 0 };
export const AMAN = { id: 'aman', family: 'Poaceae', name: { bn: 'রোপা আমন', en: 'T. Aman' }, days: AMAN_DAYS };
export const cropOf = (id) => (id === 'fallow' ? FALLOW : id === 'aman' ? AMAN : RABI_CROPS[id] ?? ROTATION_CROPS[id]);

// Yields (t/ha, as harvested) for crops crops.js does not carry.
const fao = (id) => yieldHistory.crops[id]?.tHa?.['2024'];
export const YIELDS = {
  aman: { tHa: 3.83, src: 'USDA FAS GAIN BG2026-0002 (DAE data), MY2025/26: 14.8 Mt milled on 5.8 Mha, ÷ 0.6666 milling rate' },
  aus: { tHa: 3.36, src: 'USDA FAS GAIN BG2026-0002 (DAE data), MY2025/26: 2.35 Mt milled on 1.05 Mha, ÷ 0.6666 milling rate' },
  mungbean: { tHa: 0.82, src: 'BBS national average 2018–19 (41,340 ha), via Bangladesh J. Agric. Res.' },
  sesame: { tHa: fao('sesame') ?? 0.98, src: 'FAOSTAT 2024, Bangladesh' },
  jute: { tHa: fao('jute') ?? 2.88, src: 'FAOSTAT 2024, Bangladesh (fibre)' },
};
const yieldOf = (id, econ) => econ?.prices?.crops?.[id]?.yieldTHa ?? RABI_CROPS[id]?.yieldTHa?.[0] ?? YIELDS[id]?.tHa ?? 0;

// Carbon from each crop. dm: dry share of what is harvested; hi: harvested share of above-ground dry matter;
// rs: root to shoot; keep: share of the rest left on the field, as usually done here and when kept on purpose.
// flood: days the field stands under water; puddle: the field is puddled (the heaviest tillage there is).
// Grains and oilseeds from Bolinder et al. 2007; legumes from Unkovich et al. 2010 (Field Crops Res. 119:2); jute from
// BJRI (leaves shed before harvest, sticks taken for fuel). nFix: nitrogen a legume leaves for the next crop, kg/ha
// (BARI/BRRI trials of mungbean ploughed in before T. Aman report 20–40; Herridge et al. 2008, Plant Soil 311:1).
export const CARBON = {
  boro: { dm: 0.86, hi: 0.45, rs: 0.15, keep: [0.25, 0.6], flood: 95, puddle: true },
  aman: { dm: 0.86, hi: 0.42, rs: 0.15, keep: [0.25, 0.6], flood: 90, puddle: true },
  aus: { dm: 0.86, hi: 0.40, rs: 0.18, keep: [0.25, 0.6], flood: 30, puddle: false },
  wheat: { dm: 0.87, hi: 0.40, rs: 0.25, keep: [0.3, 0.7] },
  lentil: { dm: 0.88, hi: 0.35, rs: 0.30, keep: [0.2, 0.8], nFix: [15, 25] },
  mustard: { dm: 0.92, hi: 0.25, rs: 0.20, keep: [0.4, 0.8] },
  tomato: { dm: 0.06, hi: 0.55, rs: 0.15, keep: [0.6, 0.9] },
  mungbean: { dm: 0.88, hi: 0.30, rs: 0.30, keep: [0.5, 1.0], nFix: [15, 30] },
  sesame: { dm: 0.94, hi: 0.25, rs: 0.20, keep: [0.3, 0.7] },
  jute: { dm: 0.90, hi: 0.25, rs: 0.12, keep: [0.3, 0.4] },
};
export const ICBM = { k1: 0.8, k2: 0.006, hAbove: 0.125, hRoot: 0.29, exud: 0.65, cFrac: 0.45, floodRate: 0.2, tMin: -3.8 };
export const RESIDUE = {
  habit: { bn: 'খড় তুলে নেওয়া (এখনকার মতো)', en: 'Straw taken off (as now)' },
  retain: { bn: 'খড়-নাড়া জমিতে মিশিয়ে দেওয়া', en: 'Straw and stubble ploughed back' },
};

// Carbon (t C/ha) a crop puts into the soil in a year, split by how readily it turns into lasting humus.
export function cropCarbon(id, tHa, residue) {
  const c = CARBON[id];
  if (!c || !tHa) return { above: 0, root: 0, total: 0, h: ICBM.hAbove };
  const product = tHa * c.dm, shoot = product / c.hi;
  const above = (shoot - product) * c.keep[residue === 'retain' ? 1 : 0] * ICBM.cFrac;
  const root = shoot * c.rs * (1 + ICBM.exud) * ICBM.cFrac;
  const total = above + root;
  return { above, root, total, h: total ? (above * ICBM.hAbove + root * ICBM.hRoot) / total : ICBM.hAbove };
}

// Decay speed at a mean temperature, relative units (Ratkowsky square-root form).
const rT = (t) => (t <= ICBM.tMin ? 0 : ((t - ICBM.tMin) / (30 - ICBM.tMin)) ** 2);

// ---- the 2040s ----
const med = (a) => { const v = a.filter((x) => x != null).sort((x, y) => x - y); const n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// The models' monthly change at this upazila: ensemble median per month, and each model's whole-year change.
export function climateChange(deltas, upazilaId, scenario = 'ssp245') {
  const cellKey = deltas?.upazilas?.[upazilaId];
  const models = cellKey && deltas.cells[cellKey]?.scenarios?.[scenario];
  if (!models) return null;
  const list = Object.entries(models);
  const month = (k) => Array.from({ length: 12 }, (_, m) => med(list.map(([, d]) => d[k][m])));
  const perModel = list.map(([name, d]) => ({
    name,
    dT: mean(d.dTmax.map((x, m) => (x + d.dTmin[m]) / 2)),
    dTmax: mean(d.dTmax),
    rainPct: d.histRainMm ? (d.futRainMm / d.histRainMm - 1) * 100 : 0,
    season: seasonChange(d),
  }));
  const spread = (k) => ({ med: med(perModel.map((p) => p[k])), min: Math.min(...perModel.map((p) => p[k])), max: Math.max(...perModel.map((p) => p[k])) });
  const seasons = Object.fromEntries(Object.keys(SEASON_MONTHS).map((s) => [s, {
    dTmax: spread2(perModel.map((p) => p.season[s].dTmax)),
    rainPct: spread2(perModel.map((p) => p.season[s].rainPct)),
  }]));
  return {
    scenario, cell: deltas.cells[cellKey].cell, n: list.length,
    dTmax: month('dTmax'), dTmin: month('dTmin'), rain: month('rain'),
    dT: spread('dT'), rainPct: spread('rainPct'), perModel, seasons,
    prov: deltas.provenance,
  };
}
const spread2 = (v) => ({ med: med(v), min: Math.min(...v), max: Math.max(...v) });
export const SEASON_MONTHS = { rabi: [10, 11, 0, 1, 2], kharif1: [2, 3, 4, 5], aman: [6, 7, 8, 9] };
function seasonChange(d) {
  return Object.fromEntries(Object.entries(SEASON_MONTHS).map(([s, ms]) => {
    const w = ms.map((m) => DIM[m]);
    const h = ms.reduce((a, m, k) => a + w[k] * (d.histRainMm ? 1 : 0) * d.rain[m], 0);
    return [s, { dTmax: mean(ms.map((m) => d.dTmax[m])), rainPct: (h / w.reduce((a, b) => a + b, 0) - 1) * 100 }];
  }));
}

// Where day t falls between two mid-months: [earlier month, later month, share of the later]. The same days are asked
// for by every future climate (eight models, five yield years), so each day is worked out once.
const BLEND = new Map();
const blendAt = (t) => {
  let b = BLEND.get(t);
  if (!b) {
    const d = new Date(t), m = d.getUTCMonth(), pos = m + (d.getUTCDate() - 0.5) / DIM[m] - 0.5, a = Math.floor(pos);
    BLEND.set(t, (b = [(a + 12) % 12, (a + 13) % 12, pos - a]));
  }
  return b;
};

// The upazila's measured days, moved by the models' change for that time of year (blended between mid-months).
export function futureClimate(clim, change) {
  if (!change) return null;
  const at = (arr, t) => { const [i, j, f] = blendAt(t); return arr[i] * (1 - f) + arr[j] * f; };
  const val = (v, t) => {
    const x = clim.val(v, t);
    if (x == null) return x;
    if (v === 'tmax') return x + at(change.dTmax, t);
    if (v === 'tmin') return x + at(change.dTmin, t);
    if (v === 'prec') return x * at(change.rain, t);
    return x;
  };
  return { ...clim, val, future: change.scenario };
}

// Monthly mean temperature over 2013–2025 (for the decay factor).
function monthlyMeanT(clim) {
  const sum = new Array(12).fill(0), n = new Array(12).fill(0);
  for (let t = ymd(2013, 1, 1); t <= ymd(2025, 12, 31); t += DAY) {
    const x = clim.val('tmax', t), y = clim.val('tmin', t);
    if (x == null || y == null) continue;
    const m = new Date(t).getUTCMonth();
    sum[m] += (x + y) / 2; n[m]++;
  }
  return sum.map((s, m) => (n[m] ? s / n[m] : 25));
}
const tempFactor = (mT, change) => (change ? mean(mT.map((t, m) => rT(t + (change.dTmax[m] + change.dTmin[m]) / 2))) / mean(mT.map(rT)) : 1);

// ---- what each crop does on this field, worked out once ----
function rabiWindow(id) {
  if (id === 'fallow') return { t0: null, end: null, ready: ymd(PLAN_SEASON, 2, 1) };
  const c = RABI_CROPS[id], t0 = plantDate(c, PLAN_SEASON);
  return { t0, end: addDays(t0, c.days), ready: addDays(t0, c.days + 7) };
}
function k1Window(id, ready, clearBy) {
  if (id === 'fallow') return { fits: true };
  const rc = ROTATION_CROPS[id];
  const open = ymd(PLAN_SEASON, rc.sow.from.m, rc.sow.from.d), close = ymd(PLAN_SEASON, rc.sow.to.m, rc.sow.to.d);
  const t0 = Math.max(ready, open), end = addDays(t0, rc.days);
  const reason = t0 > close ? 'window' : end > clearBy ? 'aman' : null;
  return { fits: !reason, reason, t0, end };
}
// Share of 2013–2025 seasons in which one of the crop's heat or rain limits was crossed, sowing on that day of the
// year: a warning of weather damage, not a count of lost crops.
function riskShare(clim, crop, t0, boroHeat = null) {
  if (!clim || !crop.rules?.length || t0 == null) return 0;
  const rulesCrop = withBoroHeat(crop, boroHeat);
  const m = monthOf(t0), d = dayOf(t0), rabi = !!RABI_CROPS[crop.id];
  let bad = 0, n = 0;
  for (const y of NOW) {
    const t = rabi ? plantDate(crop, y) : ymd(y, m, d);
    const res = rulesCrop.rules.map((r) => evalRule(clim, r, t));
    if (res.some((r) => r.ok === null)) continue;
    n++; if (res.some((r) => !r.ok)) bad++;
  }
  return n ? bad / n : 0;
}

// Everything the simulation needs, computed once per field: each slot's dates, water, weather risk and money,
// for today's weather and, when the projections are in, the 2040s.
export function fieldContext({ clim, change, soil, plot, amanT, econ, boroHeat = null, labReport = null }) {
  const effectiveSoil = calibrateSoilWithLab(soil, labReport);
  const climF = futureClimate(clim, change);
  const aman = amanT ?? ymd(PLAN_SEASON, 7, 15);
  const clearBy = addDays(aman, -AMAN_PREP);
  const noWater = plot.irrigation === 'none';
  const slot = (crop, t0) => {
    const wNow = crop.id !== 'fallow' && t0 != null ? cropWaterNeed(clim, crop, t0) : null;
    const wFut = climF && wNow ? cropWaterNeed(climF, crop, t0) : null;
    return {
      water: { now: crop.id === 'fallow' ? 0 : wNow?.mm ?? null, fut: crop.id === 'fallow' ? 0 : wFut?.mm ?? wNow?.mm ?? null },
      risk: { now: riskShare(clim, crop, t0, boroHeat), fut: climF ? riskShare(climF, crop, t0, boroHeat) : null },
      money: crop.id === 'fallow' ? { net: 0 } : cropMoney(econ, crop),
      tHa: yieldOf(crop.id, econ),
    };
  };
  const rabi = {}, k1 = {};
  for (const id of RABI_OPTS) {
    const w = rabiWindow(id);
    const blocked = id === 'boro' && noWater ? 'water' : null;
    rabi[id] = { id, crop: cropOf(id), ...w, blocked, ...slot(cropOf(id), w.t0) };
    k1[id] = {};
    for (const kid of K1_OPTS) {
      const kw = k1Window(kid, w.ready, clearBy);
      k1[id][kid] = { id: kid, crop: cropOf(kid), ...kw, ...(kw.fits ? slot(cropOf(kid), kw.t0) : {}) };
    }
  }
  // Jute has no FAO-56 coefficients: its water is not credited as low; the dearest known Kharif-1 need stands in.
  for (const id of RABI_OPTS) {
    const known = Object.values(k1[id]).filter((s) => s.fits && s.id !== 'fallow' && s.water?.now != null);
    const j = k1[id].jute;
    if (j.fits && j.water.now == null && known.length) {
      j.water = { now: Math.max(...known.map((s) => s.water.now)), fut: Math.max(...known.map((s) => s.water.fut ?? s.water.now)), proxy: true };
    }
  }
  const mT = monthlyMeanT(clim);
  return {
    clim, climF, change, soil: effectiveSoil, plot, econ, boroHeat, aman, clearBy, rabi, k1,
    amanSlot: { risk: { now: 0, fut: 0 }, tHa: YIELDS.aman.tHa },
    temp: { now: 1, fut: tempFactor(mT, change) }, monthlyT: mT,
    soc0: socStock(effectiveSoil),
  };
}

// Calibrate modeled SoilGrids data with an official SRDI (Soil Resource Development Institute) physical lab test.
// labReport: { ph?: number, om_pct?: number, ec_ds_m?: number, n_kg_ha?: number, p_ppm?: number, k_meq?: number, date?: string }
export function calibrateSoilWithLab(soil, labReport = null) {
  if (!labReport || !soil) return soil;
  const out = { ...soil, calibratedWithLab: true, labDate: labReport.date ?? null };
  if (labReport.ph != null && !isNaN(Number(labReport.ph))) out.ph = Number(labReport.ph);
  if (labReport.om_pct != null && !isNaN(Number(labReport.om_pct))) {
    out.om_pct = Number(labReport.om_pct);
    out.soc_g_kg = (out.om_pct * 10) / 1.724; // Van Bemmelen conversion: OM% = SOC% * 1.724
  }
  if (labReport.ec_ds_m != null && !isNaN(Number(labReport.ec_ds_m))) out.ec_ds_m = Number(labReport.ec_ds_m);
  if (labReport.n_kg_ha != null && !isNaN(Number(labReport.n_kg_ha))) out.n_kg_ha = Number(labReport.n_kg_ha);
  if (labReport.p_ppm != null && !isNaN(Number(labReport.p_ppm))) out.p_ppm = Number(labReport.p_ppm);
  if (labReport.k_meq != null && !isNaN(Number(labReport.k_meq))) out.k_meq = Number(labReport.k_meq);
  return out;
}

// Topsoil (0–30 cm) carbon stock, t C/ha, from the field's SoilGrids organic carbon and bulk density.
export function socStock(soil) {
  const soc = soil.soc_g_kg ?? (soil.om_pct != null ? (soil.om_pct * 10) / 1.724 : 10);
  const bd = soil.bulk_density ?? 1.4;
  return soc * bd * 30 * 0.1;
}
export const omPctOf = (stock, soil) => ((stock / ((soil.bulk_density ?? 1.4) * 30 * 0.1)) * 1.724) / 10;

// A rotation: { cycle: [{ rabi, k1 }, ...], residue: 'habit' | 'retain' }.
export const yearOf = (rot, k) => rot.cycle[k % rot.cycle.length];
export function feasible(ctx, y) {
  const r = ctx.rabi[y.rabi], k = ctx.k1[y.rabi]?.[y.k1];
  return !!r && !r.blocked && !!k && k.fits;
}

// One year's carbon input and how much of it lasts.
function yearInput(ctx, y, residue) {
  const parts = [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => {
    const tHa = id === 'aman' ? ctx.amanSlot.tHa : id === y.rabi ? ctx.rabi[id].tHa : ctx.k1[y.rabi][id].tHa;
    return cropCarbon(id, tHa, residue);
  });
  const total = parts.reduce((a, p) => a + p.total, 0);
  const h = total ? parts.reduce((a, p) => a + p.total * p.h, 0) / total : ICBM.hAbove;
  const floodDays = [y.rabi, y.k1, 'aman'].reduce((a, id) => a + (CARBON[id]?.flood ?? 0), 0);
  return { total, h, flood: 1 - (1 - ICBM.floodRate) * Math.min(1, floodDays / 365) };
}

// Decay rate for the field's usual rotation, set so that rotation holds today's carbon (steady state).
function calibrate(ctx, habit) {
  const ins = habit.cycle.map((y) => yearInput(ctx, y, habit.residue));
  const I = mean(ins.map((x) => x.total)), h = mean(ins.map((x) => x.h)), f = mean(ins.map((x) => x.flood));
  const r = (I * (1 / ICBM.k1 + h / ICBM.k2)) / ctx.soc0; // effective rate at the habit's flooding
  return { r0: r / f, Y0: I / (ICBM.k1 * r), I };
}

const familyOf = (id) => cropOf(id)?.family ?? null;

// Ten years of one rotation. world: 'now' (2013–2025 weather) or 'fut' (the same days moved to the 2040s).
export function simulate(ctx, rot, world = 'now', cal) {
  const { r0, Y0 } = cal;
  let Y = Y0, O = ctx.soc0 - Y0;
  const tf = ctx.temp[world] ?? 1;
  const out = [];
  const hist = [null, null, familyOf('aman')]; // the dry seasons and the Aman before year one, as the habit had them
  for (let k = 0; k < YEARS; k++) {
    const y = yearOf(rot, k);
    const inp = yearInput(ctx, y, rot.residue);
    const r = r0 * inp.flood * tf;
    for (let m = 0; m < 12; m++) {
      const dt = 1 / 12, dY = inp.total * dt - ICBM.k1 * r * Y * dt, dO = inp.h * ICBM.k1 * r * Y * dt - ICBM.k2 * r * O * dt;
      Y += dY; O += dO;
    }
    const R = ctx.rabi[y.rabi], K = ctx.k1[y.rabi][y.k1];
    const water = (R.water[world] ?? R.water.now ?? 0) + (K.water?.[world] ?? K.water?.now ?? 0);
    const risk = Math.max(R.risk[world] ?? R.risk.now ?? 0, K.risk?.[world] ?? K.risk?.now ?? 0);
    const money = (R.money?.net ?? 0) + (K.money?.net ?? 0);
    const unpriced = [R, K].filter((s) => s.id !== 'fallow' && !s.money).map((s) => s.id);
    // Crop-family repeats: the same family straight after itself counts in full, the same family again within a
    // year (the same slot last year, say tomato every Rabi) counts half, since soil-borne pests and diseases wait.
    let repeats = 0, slots = 0;
    const rep = [];
    for (const id of [y.rabi, y.k1, 'aman']) {
      const f = familyOf(id);
      hist.push(f);
      if (!f) { rep.push(0); continue; }
      slots++;
      const back = hist.slice(-4, -1).filter(Boolean);
      const r = back[back.length - 1] === f ? 1 : back.includes(f) ? 0.5 : 0;
      repeats += r; rep.push(r);
    }
    const nFix = [y.rabi, y.k1].reduce((a, id) => a + (CARBON[id]?.nFix?.[rot.residue === 'retain' ? 1 : 0] ?? 0), 0);
    const coverDays = [y.rabi, y.k1].reduce((a, id) => a + (cropOf(id)?.days ?? 0), 0) + AMAN_DAYS;
    const puddles = [y.rabi, y.k1, 'aman'].filter((id) => CARBON[id]?.puddle).length;
    const tills = [y.rabi, y.k1].filter((id) => id !== 'fallow' && !CARBON[id]?.puddle).length;
    const slotWater = [R.water[world] ?? R.water.now ?? 0, K.water?.[world] ?? K.water?.now ?? 0, 0];
    out.push({ year: FIRST_YEAR + k, rabi: y.rabi, k1: y.k1, soc: Y + O, rep, slotWater, input: inp.total, water, risk, money, unpriced, repeats, slots, nFix, coverDays, puddles, tills });
  }
  return out;
}

// The four NRCS soil-health principles, each 0–100, and their mean.
export function soilHealth(rows, soc0, rot) {
  const avg = (k) => mean(rows.map((r) => r[k]));
  const fams = new Set(rot.cycle.flatMap((y) => [y.rabi, y.k1]).map(familyOf).filter(Boolean));
  fams.add('Poaceae');
  const legume = rot.cycle.some((y) => [y.rabi, y.k1].some((id) => cropOf(id)?.legume));
  const dSoc = (rows[rows.length - 1].soc / soc0 - 1) * 100;
  const parts = {
    cover: Math.min(100, (avg('coverDays') / 330) * 100),
    diversity: Math.min(100, ({ 1: 25, 2: 55, 3: 80 }[fams.size] ?? 100) + (legume ? 10 : 0)),
    disturbance: Math.max(0, 100 - 25 * avg('puddles') - 10 * avg('tills')),
    carbon: Math.max(0, Math.min(100, 50 + 5 * dSoc)), // ±10% in ten years spans the scale
  };
  return { parts, score: mean(Object.values(parts)), dSoc, legume, families: fams.size };
}

// One rotation's ten-year story in both worlds, with the totals a farmer compares.
export function evaluate(ctx, rot, cal) {
  const now = simulate(ctx, rot, 'now', cal);
  const fut = ctx.climF ? simulate(ctx, rot, 'fut', cal) : null;
  const sum = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
  const summary = (rows) => {
    if (!rows) return null;
    const h = soilHealth(rows, ctx.soc0, rot);
    return {
      health: h, dSoc: h.dSoc, socEnd: rows[rows.length - 1].soc,
      waterMm: sum(rows, 'water') / YEARS, money: sum(rows, 'money') / YEARS,
      risk: mean(rows.map((r) => r.risk)), pest: (sum(rows, 'repeats') / Math.max(1, sum(rows, 'slots'))) * 100,
      nFix: sum(rows, 'nFix') / YEARS, unpriced: [...new Set(rows.flatMap((r) => r.unpriced))],
      // fodder: crops a year that leave straw or haulm for cattle (a third as much when the straw is ploughed in);
      // cover: days a year the field has a crop on it, against the bare days that let rain wash the soil away
      fodder: mean(rows.map((r) => [r.rabi, r.k1, 'aman'].filter((id) => FODDER[id]).length)) * (rot.residue === 'retain' ? 0.33 : 1),
      cover: mean(rows.map((r) => r.coverDays)),
    };
  };
  return { rot, now, fut, sNow: summary(now), sFut: summary(fut) };
}

// How much each part counts, before and after the farmer's priorities (the same priorities as the season plan).
const BASE_W = { soil: 0.30, water: 0.20, money: 0.20, risk: 0.15, pest: 0.15, fodder: 0, cover: 0 };
const PRIO_W = { water: (w) => { w.water *= 2.5; }, soil: (w) => { w.soil *= 2; w.pest *= 1.5; }, risk: (w) => { w.risk *= 1.8; }, income: (w) => { w.money *= 2; }, early: () => {}, fodder: (w) => { w.fodder += 0.3; }, cover: (w) => { w.cover += 0.3; } };
export function futureWeights(priorities = []) {
  const w = { ...BASE_W };
  priorities.forEach((p) => PRIO_W[p]?.(w));
  const s = Object.values(w).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(w).map(([k, x]) => [k, x / s]));
}

// Scores each rotation 0–100 against the others, on the mean of today's and the 2040s' numbers.
// `fixed`: the ranges of an earlier ranking, so a few rotations can be scored on the same scale as all of them.
export function rank(evals, priorities, fixed = null) {
  const w = futureWeights(priorities);
  const m = (e, k) => { const a = e.sNow[k], b = e.sFut?.[k]; return b == null ? a : (a + b) / 2; };
  const metric = {
    soil: (e) => (e.sNow.health.score + (e.sFut?.health.score ?? e.sNow.health.score)) / 2,
    water: (e) => -m(e, 'waterMm'), money: (e) => m(e, 'money'), risk: (e) => -m(e, 'risk'), pest: (e) => -m(e, 'pest'),
    fodder: (e) => e.sNow.fodder, cover: (e) => e.sNow.cover,
  };
  const range = fixed ?? Object.fromEntries(Object.entries(metric).map(([k, f]) => { const v = evals.map(f); return [k, [Math.min(...v), Math.max(...v)]]; }));
  for (const e of evals) {
    e.parts = Object.fromEntries(Object.entries(metric).map(([k, f]) => { const [lo, hi] = range[k]; return [k, hi > lo ? ((f(e) - lo) / (hi - lo)) * 100 : 50]; }));
    e.score = Object.entries(w).reduce((a, [k, x]) => a + x * e.parts[k], 0);
  }
  return { weights: w, range, evals: evals.sort((a, b) => b.score - a.score) };
}

// Re-rank an existing ten-year run when only Boro's heat warning changes. Water, soil and income simulations stay
// fixed, so the sensitivity view does not repeat the expensive rotation model for each exploratory threshold.
export function rankBoroSensitivity(baseline, ctx, priorities = [], exclude = []) {
  const riskFor = (rows, world) => mean(rows.map((row) => Math.max(
    ctx.rabi[row.rabi]?.risk?.[world] ?? 0,
    ctx.k1[row.rabi]?.[row.k1]?.risk?.[world] ?? 0,
  )));
  const adjusted = baseline.all.map((e) => ({
    ...e,
    sNow: { ...e.sNow, risk: riskFor(e.now, 'now') },
    sFut: e.fut ? { ...e.sFut, risk: riskFor(e.fut, 'fut') } : null,
  }));
  const { evals } = rank(adjusted, priorities, baseline.range);
  const can = (e) => !e.rot.cycle.some((y) => exclude.includes(y.rabi) || exclude.includes(y.k1));
  const keeps = evals.filter((e) => e.sNow.dSoc >= 0 && can(e));
  const pool = keeps.length ? keeps : evals.filter(can).length ? evals.filter(can) : evals;
  return { all: evals, best: pool[0], top: pool.slice(0, 5) };
}

// Every rotation this field can take: one-year and two-year cycles of feasible years, with and without the straw.
export function allRotations(ctx) {
  const years = [];
  for (const r of RABI_OPTS) for (const k of K1_OPTS) { const y = { rabi: r, k1: k }; if (feasible(ctx, y)) years.push(y); }
  const out = [];
  for (const residue of ['habit', 'retain']) {
    years.forEach((a, i) => {
      out.push({ cycle: [a], residue });
      years.forEach((b, j) => { if (j > i) out.push({ cycle: [a, b], residue }); });
    });
  }
  return out;
}

const m2 = (e) => e.sNow.money;

// The three rotations the page compares: the field's usual one, this season's plan kept every year, and the best of all.
// exclude: crops the farmer cannot grow; the best is chosen from rotations without them (the usual one is kept as it is).
export function fieldFuture({ ctx, lastCrop, plan, priorities, exclude = [] }) {
  const habitYear = { rabi: RABI_OPTS.includes(lastCrop) ? lastCrop : 'boro', k1: 'fallow' };
  const habit = { cycle: [habitYear], residue: 'habit' };
  const cal = calibrate(ctx, habit);
  const all = allRotations(ctx).map((rot) => evaluate(ctx, rot, cal));
  const { weights, range, evals } = rank(all, priorities);
  const key = (rot) => `${rot.residue}|${rot.cycle.map((y) => `${y.rabi}-${y.k1}`).join('|')}`;
  const find = (rot) => evals.find((e) => key(e.rot) === key(rot)) ?? (() => { const e = evaluate(ctx, rot, cal); rank([...evals, e], priorities); return e; })();
  const planRot = plan && feasible(ctx, plan) ? { cycle: [plan], residue: 'habit' } : null;
  // The best is the highest-scoring rotation that does not run the soil down: it keeps or builds the field's carbon
  // over ten years of today's weather. Richer rotations that spend soil are still on the chart, with their cost shown.
  const can = (e) => !e.rot.cycle.some((y) => exclude.includes(y.rabi) || exclude.includes(y.k1));
  const keeps = evals.filter((e) => e.sNow.dSoc >= 0 && can(e));
  const pool = keeps.length ? keeps : evals.filter(can).length ? evals.filter(can) : evals;
  return {
    cal, weights, range, count: evals.length, all: evals, guard: keeps.length > 0,
    habit: find(habit), plan: planRot ? find(planRot) : null, best: pool[0], top: pool.slice(0, 5),
    richest: evals.reduce((a, e) => (m2(e) > m2(a) ? e : a), evals[0]),
    evaluateOwn: (rot) => { const e = evaluate(ctx, rot, cal); const all2 = rank([...evals.filter((x) => key(x.rot) !== key(rot)), e], priorities); return all2.evals.find((x) => x === e); },
  };
}

export const WATER_M3_PER_MM_BIGHA = BIGHA_HA * 10; // 1 mm on a bigha = 1.336 m³
// What each crop leaves for cattle after harvest (dry fodder is scarce in the Rabi and the early monsoon).
export const FODDER = { boro: 'straw', aus: 'straw', aman: 'straw', wheat: 'straw', lentil: 'haulm', mungbean: 'haulm' };
export const ureaSavedKgPerBigha = (nKgHa) => (nKgHa / 0.46) * BIGHA_HA;
export const co2PerBigha = (dStockTHa) => dStockTHa * (44 / 12) * BIGHA_HA;
export { WATER_CLASS };

// ---- the field's climate account: soil carbon stored against paddy methane ----
// Methane from flooded rice, IPCC 2019 Refinement Tier 1 (Vol. 4, Ch. 5.5): a daily emission factor for South Asia,
// 0.85 kg CH₄/ha/day (Table 5.11A), times the water regime (continuously flooded 1.00; multiple drainage, as with
// AWD, 0.55; regular rainfed 0.54: Table 5.12), the pre-season water (not flooded for under 180 days, 1.00: Table 5.13)
// and the organic amendment SFo = (1 + ROA × 0.19)^0.59, for straw ploughed in more than 30 days before the rice
// (Table 5.14; ROA in t dry matter/ha). Over 100 years methane warms 27 times as much as CO₂ (IPCC AR6, non-fossil).
// Boro is irrigated (flooded, or AWD when chosen); T. Aman is rainfed; Aus here is direct-seeded, not flooded.
// Nitrous oxide is not counted. Soil carbon change is the model's ten-year change, as CO₂.
export const CH4 = { ef: 0.85, sfw: { flooded: 1, awd: 0.55, rainfed: 0.54 }, sfp: 1, cfoa: 0.19, exp: 0.59, gwp: 27 };
const strawT = (id, tHa, residue) => {
  const c = CARBON[id];
  if (!c || !tHa) return 0;
  return tHa * c.dm * (1 / c.hi - 1) * c.keep[residue === 'retain' ? 1 : 0];
};
// Paddy methane, kg CH₄/ha a day while the field is flooded (IPCC 2019 Tier 1): the baseline emission factor scaled by
// the water regime (Boro flooded, or AWD; Aman rainfed) and by the straw (t/ha) the field went in with.
export const methaneRate = (id, strawTHa, { awd = false } = {}) => {
  const sfw = id === 'aman' ? CH4.sfw.rainfed : awd ? CH4.sfw.awd : CH4.sfw.flooded;
  return CH4.ef * sfw * CH4.sfp * (1 + strawTHa * CH4.cfoa) ** CH4.exp;
};
export function climateLedger(ctx, rot, rows, { awd = false } = {}) {
  if (!rows?.length) return null;
  const tOf = (y, id, slot) => (slot === 2 ? ctx.amanSlot.tHa : slot === 0 ? ctx.rabi[id]?.tHa : ctx.k1[y.rabi]?.[id]?.tHa) ?? 0;
  let prev = { id: 'aman', t: ctx.amanSlot.tHa }; // the Aman before year one
  const perYear = [];
  for (let k = 0; k < YEARS; k++) {
    const y = yearOf(rot, k);
    let kg = 0;
    [[y.rabi, 0], [y.k1, 1], ['aman', 2]].forEach(([id, slot]) => {
      if (id === 'fallow') return;
      const t = tOf(y, id, slot);
      if (id === 'boro' || id === 'aman') {
        const days = id === 'aman' ? AMAN_DAYS : RABI_CROPS.boro.days;
        kg += methaneRate(id, strawT(prev.id, prev.t, rot.residue), { awd }) * days;
      }
      prev = { id, t };
    });
    perYear.push(kg);
  }
  const ch4 = mean(perYear); // kg CH₄/ha a year
  const ch4Co2e = (ch4 * CH4.gwp) / 1000; // t CO₂e/ha a year
  const soilCo2 = (((rows[rows.length - 1].soc - ctx.soc0) / YEARS) * 44) / 12; // t CO₂/ha a year taken up (+) or lost (−)
  return { ch4, ch4Co2e, soilCo2, net: ch4Co2e - soilCo2, hasBoro: rot.cycle.some((y) => y.rabi === 'boro') };
}

// ---- robustness: the same rotations under each climate model on its own ----
// The 2040s above use the models' median change. Here every candidate is run again under each of the models
// separately, and counted: in how many it keeps or builds the soil, in how many its weather risk is no worse than
// the usual rotation's, and in how many it scores best among the candidates. A choice that holds up whichever model
// turns out right is a robust one (Lempert et al. 2006, Manage. Sci. 52:514, robust decision making).
export function modelChange(deltas, upazilaId, scenario, name) {
  const cellKey = deltas?.upazilas?.[upazilaId];
  const d = cellKey && deltas.cells[cellKey]?.scenarios?.[scenario]?.[name];
  return d ? { scenario, name, dTmax: d.dTmax, dTmin: d.dTmin, rain: d.rain } : null;
}
// Each FAOSTAT year 2020–2024 as a yield factor per crop (that year's national yield over the five-year mean).
// Rice's factor goes to Boro, Aman and Aus alike; mungbean has no FAOSTAT series and stays at its mean.
export function yieldYears() {
  const years = Object.keys(yieldHistory.crops.boro.tHa);
  return years.map((y) => ({
    year: +y,
    f: Object.fromEntries(Object.entries(yieldHistory.crops).map(([id, c]) => { const v = Object.values(c.tHa); return [id, c.tHa[y] / mean(v)]; })),
  }));
}
function scaledCtx(ctx, f) {
  const k = (id) => f[id] ?? (['aman', 'aus'].includes(id) ? f.boro : 1) ?? 1;
  const slot = (x) => (x && x.tHa != null ? { ...x, tHa: x.tHa * (k(x.id) ?? 1) } : x);
  return {
    ...ctx,
    rabi: Object.fromEntries(Object.entries(ctx.rabi).map(([id, x]) => [id, slot(x)])),
    k1: Object.fromEntries(Object.entries(ctx.k1).map(([r, ks]) => [r, Object.fromEntries(Object.entries(ks).map(([id, x]) => [id, slot(x)]))])),
    amanSlot: { ...ctx.amanSlot, tHa: ctx.amanSlot.tHa * (f.boro ?? 1) },
  };
}

export function modelTest({ base, deltas, upazilaId, scenario, rots, habit, cal, priorities, range, models }) {
  const names = models ?? Object.keys(deltas?.cells?.[deltas?.upazilas?.[upazilaId]]?.scenarios?.[scenario] ?? {});
  const k = (rot) => `${rot.residue}|${rot.cycle.map((y) => `${y.rabi}-${y.k1}`).join('|')}`;
  rots = [...new Map(rots.map((r) => [k(r), r])).values()]; // each rotation once
  const tally = Object.fromEntries(rots.map((r) => [k(r), { rot: r, wins: 0, keepsSoil: 0, safer: 0, dSoc: [] }]));
  const perModel = [];
  // The ensemble: every model with every FAOSTAT yield year, so each rotation's chances rest only on real spreads.
  const years = yieldYears();
  const ens = Object.fromEntries(rots.map((r) => [k(r), { keep: 0, beat: 0, win: 0 }]));
  let runs = 0;
  for (const name of names) {
    const ctxM = fieldContext({ ...base, change: modelChange(deltas, upazilaId, scenario, name) });
    for (const y of years) {
      const ctxY = scaledCtx(ctxM, y.f);
      const ev = rots.map((r) => evaluate(ctxY, r, cal)), hy = evaluate(ctxY, habit, cal);
      const { evals: rk } = rank(ev.slice(), priorities, range);
      ens[k(rk[0].rot)].win++;
      for (const e of ev) { const t = ens[k(e.rot)]; if (e.sFut.dSoc >= 0) t.keep++; if (e.sFut.dSoc > hy.sFut.dSoc + 1e-9) t.beat++; }
      runs++;
    }
    const evals = rots.map((r) => evaluate(ctxM, r, cal));
    const h = evaluate(ctxM, habit, cal);
    const { evals: ranked } = rank(evals.slice(), priorities, range); // on the full ranking's scale
    tally[k(ranked[0].rot)].wins++;
    for (const e of evals) {
      const t = tally[k(e.rot)];
      if (e.sFut.dSoc >= 0) t.keepsSoil++;
      if (e.sFut.risk <= h.sFut.risk + 1e-9) t.safer++;
      t.dSoc.push(e.sFut.dSoc);
    }
    perModel.push({ name, winner: k(ranked[0].rot) });
  }
  const list = Object.values(tally).map((t) => { const e = ens[k(t.rot)]; return { ...t, n: names.length, worstDSoc: Math.min(...t.dSoc), runs, pKeep: e.keep / runs, pBeat: e.beat / runs, pWin: e.win / runs }; });
  // Most robust: the best chance of keeping the soil over every model and yield year, then the models, risk, wins.
  const order = (a, b) => b.pKeep - a.pKeep || b.keepsSoil - a.keepsSoil || b.safer - a.safer || b.wins - a.wins || b.worstDSoc - a.worstDSoc;
  list.sort(order);
  const robust = list[0];
  return { n: names.length, runs, years: years.map((y) => y.year), list, perModel, robust, order };
}
