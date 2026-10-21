// Next-season (Kharif-1) crop for this field, between this Rabi crop and T. Aman. [RULE on REAL climate, soil, radar]
//   1. When it can go in: the land is free a week after this Rabi crop's last picking; each crop is then sown no
//      earlier than its recommended window opens and no later than it closes (crops.js, ROTATION_CROPS.sow).
//   2. When it must be off: the upazila's usual T. Aman transplanting day, measured by Sentinel-1 radar (2017–2025
//      median, aman_radar.json), less AMAN_PREP days to plough and puddle. A crop that cannot be picked by then would
//      push the Aman late, so it is closed, not just marked down.
//   3. Weather: each crop's risk rules replayed on that sowing day over 25 seasons of station-corrected NASA POWER.
//   4. Water: FAO-56 crop water need on the same weather (cropwater.js), with how dear water is from this farmer's
//      source. Jute has no FAO-56 coefficients, so only its water class is used.
//   5. Soil: the field's own SoilGrids pH and drainage against what each crop tolerates, plus what it gives back.
import { ROTATION_CROPS, RABI_CROPS } from './crops.js';
import { backtest, PLAN_SEASON } from './climate.js';
import { cropWaterNeed } from './cropwater.js';
import { ymd, addDays, daysBetween, monthOf, dayOf, bnDigits } from './dates.js';
import { waterFit } from './decision.js';
import { bnOf } from './text.js';

export const AMAN_PREP = 10; // days to plough and puddle before Aman seedlings go in
const AMAN_FALLBACK = { m: 7, d: 15 }; // only when no radar date is passed in (tests, other regions)
const RW = { soil: 0.30, family: 0.25, water: 0.20, climate: 0.15, window: 0.10 };
const PRIO = {
  water: (w) => { w.water *= 2.5; },
  soil: (w) => { w.soil *= 2; w.family *= 1.5; },
  risk: (w) => { w.climate *= 1.6; },
  early: (w) => { w.window *= 1.5; },
  income: () => {},
};
// Standing water on a poorly drained field, by how much the crop minds it.
const WATERLOG_PEN = { high: { poor: 35, imperfect: 15 }, low: { poor: 5, imperfect: 0 }, none: { poor: 0, imperfect: 0 } };
const LOW_OM = 1.5; // % organic matter; below this the soil is low (SRDI / BARC interpretation)

const n1 = (x) => Math.round(x * 10) / 10;

// How well the field's soil suits the crop (0–100), with the reasons in words.
function soilSuit(rc, soil) {
  const notes = [];
  let fit = 100;
  const [lo, hi] = rc.ph;
  if (soil.ph != null) {
    if (soil.ph < lo - 0.5 || soil.ph > hi + 0.5) { fit -= 45; notes.push({ bn: bnDigits(`মাটির pH ${n1(soil.ph)}, এই ফসলের সীমার (${lo}–${hi}) বেশ বাইরে`), en: `Soil pH ${n1(soil.ph)} is well outside this crop's range (${lo}–${hi})` }); }
    else if (soil.ph < lo || soil.ph > hi) { fit -= 20; notes.push({ bn: bnDigits(`মাটির pH ${n1(soil.ph)}, সীমার (${lo}–${hi}) একটু বাইরে`), en: `Soil pH ${n1(soil.ph)} is just outside the range (${lo}–${hi})` }); }
    else notes.push({ bn: bnDigits(`মাটির pH ${n1(soil.ph)}, এই ফসলের জন্য ঠিক (${lo}–${hi})`), en: `Soil pH ${n1(soil.ph)} suits it (${lo}–${hi})` });
  }
  const pen = WATERLOG_PEN[rc.waterlog]?.[soil.drainage] ?? 0;
  if (pen) {
    fit -= pen;
    notes.push(soil.drainage === 'poor'
      ? { bn: 'এই মাটিতে পানি নামে না; কালবৈশাখীর বৃষ্টিতে পানি জমলে এই ফসল মরে যায়, তাই উঁচু বেড আর নালা লাগবে', en: 'This soil drains badly; standing water after a nor’wester kills this crop, so it needs raised beds and drains' }
      : { bn: 'এই মাটিতে পানি ধীরে নামে; জমির চারপাশে নালা রাখুন', en: 'This soil drains slowly; keep drains round the field' });
  }
  const lowOM = soil.om_pct != null && soil.om_pct < LOW_OM;
  if (lowOM && rc.soilBenefit >= 60) notes.push({ bn: bnDigits(`মাটিতে জৈব পদার্থ কম (${n1(soil.om_pct)}%), এই ফসল তা বাড়াতে সাহায্য করে`), en: `Organic matter is low (${n1(soil.om_pct)}%) and this crop helps rebuild it` });
  return { fit: Math.max(0, fit), notes };
}

export function recommendRotation({ clim, soil, plot, chosen, priorities = [], amanT = null }) {
  const w = { ...RW };
  priorities.forEach((p) => PRIO[p]?.(w));
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach((k) => (w[k] /= sum));

  const current = chosen.crop;
  const readyT = addDays(chosen.hw.end, 7); // a week to clear and prepare the land
  const aman = amanT ?? ymd(PLAN_SEASON, AMAN_FALLBACK.m, AMAN_FALLBACK.d);
  const clearBy = addDays(aman, -AMAN_PREP);

  const options = Object.values(ROTATION_CROPS).map((rc) => {
    const open = ymd(PLAN_SEASON, rc.sow.from.m, rc.sow.from.d), close = ymd(PLAN_SEASON, rc.sow.to.m, rc.sow.to.d);
    const sowT = Math.max(readyT, open);
    const endT = addDays(sowT, rc.days);
    const wait = daysBetween(readyT, sowT); // days the land sits empty waiting for the window to open
    const spare = daysBetween(endT, clearBy); // days to spare before the Aman land has to be ready
    const reason = sowT > close ? 'window' : spare < 0 ? 'aman' : null;
    const m = monthOf(sowT), d = dayOf(sowT);
    const bt = rc.rules.length ? backtest(clim, rc, 0, (y) => ymd(y, m, d)) : null;
    const bad = bt ? bt.seasons.filter((x) => x.safe === false) : [];
    const fired = rc.rules.map((r) => ({ rule: r, years: bad.filter((x) => x.fired.includes(r.id)).map((x) => x.season) }));
    const water = cropWaterNeed(clim, rc, sowT);
    const ss = soilSuit(rc, soil);
    const comp = {
      soil: Math.round(0.5 * rc.soilBenefit + 0.5 * ss.fit),
      family: rc.family === current.family ? 30 : 100,
      water: waterFit(rc.water, plot.irrigation), // replaced below where FAO-56 gives millimetres
      climate: bt && bt.now.n ? (bt.now.safe / bt.now.n) * 100 : 70,
      window: Math.max(20, Math.min(100, 100 - 1.5 * wait - (spare < 10 ? 25 : 0))),
    };
    return { crop: rc, fits: !reason, reason, sowT, endT, open, close, wait, spare, comp, bt, fired, water, soilNotes: ss.notes, score: 0, why: [] };
  });

  // Water: the FAO-56 need, scaled across the crops it covers, weighted with how dear water is from this source.
  const mm = options.map((o) => o.water?.mm).filter((x) => x != null);
  const [wMin, wMax] = [Math.min(...mm), Math.max(...mm)];
  for (const o of options) {
    if (o.water && wMax > wMin) o.comp.water = Math.round(0.6 * (100 - (80 * (o.water.mm - wMin)) / (wMax - wMin)) + 0.4 * o.comp.water);
    o.score = o.fits ? Object.entries(w).reduce((a, [k, x]) => a + x * o.comp[k], 0) : 0;
    o.why = whyOf(o, current);
  }

  const feasible = options.filter((o) => o.fits).sort((a, b) => b.score - a.score);
  const best = feasible[0] ?? null;
  const nextRabiCaution = current.family === 'Solanaceae'
    ? { bn: 'আগামী রবিতে এই জমিতে আবার টমেটো, বেগুন বা আলু না করাই ভালো। এগুলো একই গোত্রের, ঢলে পড়া (ব্যাকটেরিয়াল উইল্ট) রোগের জীবাণু মাটিতে জমে যায়।', en: 'Next Rabi, avoid tomato, brinjal or potato on this plot. They are one family, and bacterial wilt builds up in the soil.' }
    : current.family === 'Poaceae'
      ? { bn: 'বছরে তিনবার ধান করলে মাটি দুর্বল হয়ে যায়। আগামী রবিতে মসুর বা সরিষা ভেবে দেখুন।', en: 'Rice after rice after rice wears the soil out. Think about lentil or mustard next Rabi.' }
      : { bn: 'আগামী রবিতে অন্য গোত্রের কোনো ফসল ভেবে দেখুন।', en: 'Next Rabi, think about a crop from a different family.' };
  return {
    current, readyT, amanT: aman, amanMeasured: amanT != null, clearBy, weights: w,
    sowT: best ? best.sowT : readyT,
    best,
    alternatives: feasible.slice(1, 3),
    closed: options.filter((o) => !o.fits),
    directAman: feasible.length === 0,
    nextRabiCaution,
  };
}

// The reasons a farmer reads, in order: what it does, family, soil, water, weather, timing.
function whyOf(o, current) {
  const rc = o.crop;
  const out = [rc.benefit];
  out.push(rc.family !== current.family
    ? { bn: `${current.name.bn} থেকে আলাদা গোত্রের ফসল, তাই আগের রোগ-পোকা জমিতে টিকে থাকতে পারে না`, en: `A different crop family from ${current.name.en.toLowerCase()}, so its pests and diseases die out` }
    : { bn: `${bnOf(current.name.bn)} একই গোত্রের ফসল, তাই রোগ-পোকা জমে থাকার ঝুঁকি আছে`, en: `The same crop family as ${current.name.en.toLowerCase()}, so pests and diseases can build up` });
  out.push(...o.soilNotes);
  out.push(o.water
    ? { bn: bnDigits(`পুরো ফলনের জন্য বৃষ্টি বাদে পানি লাগে প্রায় ${o.water.mm} মিমি (বিঘায় ${o.water.m3PerBigha} ঘনমিটার); কম দিলে ফলন কমে`), en: `For a full yield it needs about ${o.water.mm} mm beyond the rain (${o.water.m3PerBigha} m³ a bigha); less water, less yield` }
    : { bn: `সেচ লাগে ${rc.water === 'Low' ? 'খুব কম' : rc.water === 'Medium' ? 'মাঝারি' : 'বেশি'}`, en: `Needs ${rc.water === 'Low' ? 'very little' : rc.water === 'Medium' ? 'some' : 'a lot of'} irrigation` });
  if (o.bt) out.push({ bn: bnDigits(`এই দিনে বুনলে ২০১৩–২০২৫-এর ${o.bt.now.n} মৌসুমের ${o.bt.now.safe}টিতে আবহাওয়া ঠিক ছিল (২০০১–২০১২: ${o.bt.then.n}টির ${o.bt.then.safe}টি)`), en: `Sown on this day, the weather was fine in ${o.bt.now.safe} of ${o.bt.now.n} seasons in 2013–2025 (${o.bt.then.safe} of ${o.bt.then.n} in 2001–2012)` });
  if (o.fits) out.push({ bn: bnDigits(`আমনের জমি তৈরির ${o.spare} দিন আগে তোলা শেষ`), en: `Off the land ${o.spare} days before the Aman land has to be ready` });
  return out;
}

export { RABI_CROPS };
