// How firm a recommendation is, and why the options rank as they do. Pure: it reads decide() and fieldFuture() results
// and never changes them. Used by the season plan's "how this was made" panel, the rotation comparison, voice and SMS.
import { WHAT_IFS, whatIf } from './climate.js';
import { decide } from './decision.js';
import { bnOf } from './text.js';

export const FACTORS = ['C', 'W', 'S', 'P', 'R', 'G', 'E', 'F'];
// Two options whose scores are this close (of 100) are a tie for practical purposes: the inputs (25 seasons of
// weather, a 250 m soil estimate, national yields) are not exact enough to split them.
export const CLOSE = 5;

// One option's score, factor by factor: weight × the option's score on it (the parts add up to the total), and what it
// gave up against a perfect 100 on each.
export function contributions(o, weights) {
  return FACTORS.filter((k) => weights[k] > 0).map((k) => ({ k, w: weights[k], score: o.comp[k], add: weights[k] * o.comp[k], lost: weights[k] * (100 - o.comp[k]) }));
}

// The gap between the first and second option; under CLOSE it is a close call.
export function margin(options) {
  const s = [...options].sort((a, b) => b.score - a.score);
  if (s.length < 2) return { first: s[0] ?? null, second: null, gap: Infinity, close: false };
  const gap = s[0].score - s[1].score;
  return { first: s[0], second: s[1], gap, close: gap < CLOSE };
}

// Does the same crop stay first if any one weight were half or one and a half times what it is? Each trial rescales one
// weight and renormalises; the options keep their own factor scores. pct is the share of trials with the same winner.
export function weightStability(options, weights) {
  if (!options.length) return { trials: 0, same: 0, pct: 1, rivals: [] };
  const first = [...options].sort((a, b) => b.score - a.score)[0].crop.id;
  let trials = 0, same = 0;
  const rivals = new Set();
  for (const k of FACTORS) {
    if (!(weights[k] > 0)) continue;
    for (const f of [0.5, 1.5]) {
      const w = { ...weights, [k]: weights[k] * f };
      const tot = Object.values(w).reduce((a, b) => a + b, 0);
      const score = (o) => FACTORS.reduce((a, j) => a + ((w[j] ?? 0) / tot) * (o.comp[j] ?? 0), 0);
      const win = options.reduce((a, o) => (score(o) > score(a) ? o : a), options[0]).crop.id;
      trials++;
      if (win === first) same++; else rivals.add(win);
    }
  }
  return { trials, same, pct: trials ? same / trials : 1, rivals: [...rivals] };
}

// The same decision re-run in each what-if climate (drier, +1 °C, +2 °C): which crop it recommends in each.
// args: what decide() was given, with the measured climate as `clim`.
export function climateStability(args) {
  const runs = Object.keys(WHAT_IFS).map((key) => {
    const d = decide({ ...args, clim: whatIf(args.clim, key) });
    return { key, crop: d.rec.crop.id, label: d.label, score: d.rec.score };
  });
  const base = runs[0].crop;
  return { runs, same: runs.filter((r) => r.crop === base).length, n: runs.length, holds: runs.every((r) => r.crop === base) };
}

// How firm, in one word: 'firm' (clear lead, holds under other weights and climates), 'fair', or 'close'.
export function firmness({ gap, weightPct, climateHolds }) {
  if (gap < CLOSE || weightPct < 0.6) return 'close';
  if (gap >= 2 * CLOSE && weightPct >= 0.9 && climateHolds) return 'firm';
  return 'fair';
}

// What the season's answer was calculated from, and what is shown beside it only as context.
export const DECISION_INPUTS = {
  used: [
    { k: 'weather', bn: 'নাসা POWER-এর ২৫ মৌসুমের দৈনিক আবহাওয়া (বৃষ্টি, তাপ), প্রতিটি ফসলের নিয়মে', en: '25 seasons of daily NASA POWER weather (rain, heat), against each crop’s rules', kind: 'MODEL' },
    { k: 'soil', bn: 'জমির মাটির আনুমানিক pH, গঠন, জৈব পদার্থ (ISRIC SoilGrids, ২৫০ মিটার মডেল)', en: 'The field’s estimated soil pH, texture and organic matter (ISRIC SoilGrids, a 250 m model)', kind: 'MODEL' },
    { k: 'water', bn: 'সেচের পানি: FAO-56 ফসল-সহগ × এলাকার বাষ্পীভবন, আপনার সেচের উৎস', en: 'Irrigation water: FAO-56 crop coefficients × local evaporation, and your water source', kind: 'RULE' },
    { k: 'money', bn: 'দাম, খরচ (সরকারি ও বাজারের প্রকাশিত তথ্য) আর FAOSTAT দেশের গড় ফলন', en: 'Prices and costs (published official and market figures) and FAOSTAT national yields', kind: 'REAL' },
    { k: 'rotation', bn: 'আগের ফসল আর ফসলচক্রের নিয়ম (একই গোত্র পরপর নয়)', en: 'Your last crop and rotation rules (not the same family twice running)', kind: 'RULE' },
    { k: 'glut', bn: 'পাশের কৃষকদের পরিকল্পনা থেকে দাম পড়ার ঝুঁকি', en: 'Price-drop risk from neighbours’ plans', kind: 'DEMO' },
    { k: 'prio', bn: 'আপনার বাছাই করা চাওয়া আর বাদ দেওয়া ফসল', en: 'Your priorities and the crops you left out', kind: 'RULE' },
  ],
  context: [
    { k: 'satellite', bn: 'জমির সেন্টিনেল-২ সবুজ রেখা, MODIS চাপের বছর, SRTM/ASTER উঁচু-নিচু', en: 'The field’s Sentinel-2 green curve, MODIS stress years, SRTM/ASTER terrain', kind: 'SAT' },
    { k: 'grace', bn: 'GRACE-এর ভূগর্ভের পানি (কয়েকশো কিমি এলাকার গড়) আর SMAP মাটির ভেজা ভাব (৯ কিমি)', en: 'GRACE groundwater (an average over hundreds of km) and SMAP soil moisture (9 km)', kind: 'SAT' },
    { k: 'future', bn: 'CMIP6 জলবায়ু মডেলের ২০৪০-এর দশক (জমির ভবিষ্যৎ পাতায় দশ বছরের হিসাবে লাগে, এই মৌসুমের উত্তরে নয়)', en: 'CMIP6 climate models for the 2040s (used in Field Future’s ten-year runs, not in this season’s answer)', kind: 'MODEL' },
  ],
};

// What to check on the ground before acting on the advice. Each item says why it is needed for this field.
// risks: fieldRisks() items (may be empty); soilScope: 'field' | 'union'.
export function beforeYouAct({ rec, soilScope = 'field', risks = [], irrigation = null, glutLevel = 'Low' }) {
  const id = rec.crop.id;
  const out = [
    { k: 'soil', bn: 'মাটির সংখ্যাগুলো উপগ্রহ-মডেলের আনুমানিক হিসাব, আপনার জমির মাটি পরীক্ষা নয়। সার দেওয়ার আগে উপজেলা কৃষি অফিস বা SRDI-এর ভ্রাম্যমাণ ল্যাবে মাটি পরীক্ষা করিয়ে নিন।', en: 'The soil numbers are a model estimate, not a test of your field. Have the soil tested (upazila agriculture office or SRDI’s mobile lab) before you buy fertiliser.' },
    { k: 'seed', bn: `${bnOf(rec.crop.name.bn)} অনুমোদিত জাতের ভালো বীজ বা চারা কাছে পাওয়া যায় কি না, দাম কত, তা আগে জেনে নিন।`, en: `Check that good seed or seedlings of an approved ${rec.crop.name.en.toLowerCase()} variety can be had nearby, and at what price.` },
    { k: 'date', bn: 'লাগানোর তারিখে জমি খালি হবে কি না দেখুন: আগের ফসল উঠে গেছে, জমি চাষের মতো শুকিয়েছে।', en: 'Make sure the field is free on the planting date: the last crop is off and the soil is dry enough to plough.' },
  ];
  if (soilScope !== 'field') out[0] = { k: 'soil', bn: 'মাটির তথ্য ইউনিয়নের মাঝখানের, আপনার জমির নয়। জমি মানচিত্রে দিলে জমির নিজের ঘরের হিসাব আসবে; তবু সারের আগে মাটি পরীক্ষা করান।', en: 'The soil figures are for the union centre, not your field. Put your field on the map for its own cell, and still test the soil before fertilising.' };
  if (['boro', 'tomato', 'wheat'].includes(id) || irrigation === 'rain') out.push({ k: 'water', bn: 'পুরো মৌসুমে সেচের পানি পাবেন কি না, পাম্প বা গভীর নলকূপের পালা আর খরচ নিশ্চিত করুন।', en: 'Confirm you will have water all season: your pump or deep tube well turn, and its cost.' });
  const wet = risks.find((r) => r.k === 'wet' && r.level >= 1);
  if (wet && !['boro', 'aus', 'aman', 'jute'].includes(id)) out.push({ k: 'drain', bn: 'জমিতে পানি জমার ঝুঁকি আছে: ভারী বৃষ্টির পর পানি বের করার নালা আছে কি না দেখুন।', en: 'Water can stand on this field: check there is a drain to let it out after heavy rain.' });
  if (glutLevel !== 'Low') out.push({ k: 'market', bn: 'কাছাকাছি অনেকে একই ফসল একই সময়ে লাগাচ্ছেন: বাজারে দাম আর বিক্রির জায়গা খোঁজ নিন।', en: 'Many neighbours plan the same crop at the same time: ask at the market about prices and buyers.' });
  out.push({ k: 'officer', bn: 'সিদ্ধান্তের আগে ইউনিয়নের উপসহকারী কৃষি কর্মকর্তার সঙ্গে এই হিসাবটা নিয়ে কথা বলুন।', en: 'Talk this through with your union’s Sub-Assistant Agriculture Officer before you decide.' });
  return out;
}

// Does any rotation clearly do better for the soil than farming as now? dSoc is the ten-year change in soil carbon, %.
// pBeat: the share of the 40 futures in which the best keeps more soil than as now (modelTest), when it was run.
export const SOIL_CLEAR = 1; // percentage points of carbon over ten years
export function soilVerdict({ best, habit, pBeat = null }) {
  const gain = best.dSoc - habit.dSoc, health = best.health.score - habit.health.score;
  let kind;
  if (gain < SOIL_CLEAR && health < 3) kind = 'none';
  else if (best.dSoc < 0) kind = 'slower';
  else kind = 'better';
  const robust = pBeat == null ? null : pBeat >= 0.8 ? 'robust' : pBeat >= 0.5 ? 'mostly' : 'sensitive';
  return { kind, gain, health, robust };
}

// The second rotation to compare with the best: the next in the ranking that grows different crops (not just the
// same crops with the straw handled differently), so the farmer sees a real alternative.
export function runnerUp(top, best) {
  const crops = (e) => e.rot.cycle.map((y) => `${y.rabi}-${y.k1}`).join('|');
  return top.find((e) => e !== best && crops(e) !== crops(best)) ?? top.find((e) => e !== best) ?? null;
}

// What a rotation changes in the soil against farming as now, in plain words: carbon, nitrogen, straw, water, cover,
// fodder. Each line has a sign (+1 better for the soil or the farmer, -1 worse, 0 about the same).
export function soilChanges(e, habit, residue) {
  const d = (a, b) => a - b;
  const lines = [];
  const c = d(e.dSoc, habit.dSoc);
  lines.push({ k: 'carbon', sign: Math.abs(c) < 0.5 ? 0 : Math.sign(c), v: c });
  const n = d(e.nFix, habit.nFix);
  lines.push({ k: 'nitrogen', sign: Math.abs(n) < 2 ? 0 : Math.sign(n), v: n });
  const w = d(e.waterMm, habit.waterMm);
  lines.push({ k: 'water', sign: Math.abs(w) < 20 ? 0 : -Math.sign(w), v: w });
  const cv = d(e.cover, habit.cover);
  lines.push({ k: 'cover', sign: Math.abs(cv) < 10 ? 0 : Math.sign(cv), v: cv });
  const f = d(e.fodder, habit.fodder);
  lines.push({ k: 'fodder', sign: Math.abs(f) < 0.2 ? 0 : Math.sign(f), v: f, residue });
  return lines;
}

// The options to put side by side for the season: the crop grown now, the recommendation, and the best others, so
// there are always at least two alternatives to the current crop. Each appears once, in that order.
export function seasonColumns(d, lastCrop, n = 3) {
  const cur = d.options.find((o) => o.crop.id === lastCrop) ?? null;
  const rest = [...d.options].sort((a, b) => b.score - a.score).filter((o) => o !== cur && o.crop.id !== d.rec.crop.id);
  const cols = [cur && { role: 'now', o: cur }, d.rec.crop.id !== lastCrop && { role: 'rec', o: d.rec }].filter(Boolean);
  for (const o of rest) {
    if (cols.length >= n && cols.filter((c) => c.role !== 'now').length >= 2) break;
    cols.push({ role: 'alt', o });
  }
  return cols;
}

// A short text of the comparison to share or send to the officer, in the farmer's language.
export function compareText({ cols, lang, field, firm }) {
  const bn = lang === 'bn';
  const dg = (x) => (bn ? String(x).replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[c]) : String(x));
  const role = { now: bn ? 'এখনকার ফসল' : 'Now', rec: bn ? 'পরামর্শ' : 'Advised', alt: bn ? 'বিকল্প' : 'Option' };
  const line = ({ role: r, o }) => `${role[r]}: ${o.crop.name[lang]} — ${bn ? 'নম্বর' : 'score'} ${dg(Math.round(o.score))}, ${bn ? 'ঠিকঠাক মৌসুম' : 'good seasons'} ${dg(o.bt.now.safe)}/${dg(o.bt.now.n)}${o.water ? `, ${bn ? 'পানি' : 'water'} ${dg(o.water.mm)} ${bn ? 'মিমি' : 'mm'}` : ''}${o.money ? `, ${bn ? 'লাভ/বিঘা' : 'profit/bigha'} ৳${dg(Math.round(o.money.net))}` : ''}`;
  const head = bn ? `${field}: এই রবির ফসল নিয়ে FieldShift 360-এর হিসাব` : `${field}: FieldShift 360's working for this Rabi`;
  const tail = firm === 'close' ? (bn ? 'হিসাবে ফসলগুলো কাছাকাছি; আপনার মত চাই।' : 'The options are close; I would like your view.') : (bn ? 'এটা নিয়ে আপনার মত চাই।' : 'I would like your view on this.');
  return [head, ...cols.map(line), tail].join('\n');
}

// A crop the farmer already grows here, whose heat or rain limit is crossed in nearly every recent season, points to
// a limit that is too strict for local varieties rather than to a crop that fails every year (Boro's flowering-heat
// limit in Godagari is crossed in all 13 seasons 2013–2025, yet Boro is the main crop there). Flag it so its weather
// score is read with caution until an agronomist reviews the limit.
export const OVERWARN = 0.2; // share of seasons that went fine, at or below which the limit is suspect
export function calibrationFlags(options, lastCrop) {
  return options
    .filter((o) => o.crop.id === lastCrop && o.bt.now.n > 0 && o.bt.now.safe / o.bt.now.n <= OVERWARN)
    .map((o) => ({ crop: o.crop, safe: o.bt.now.safe, n: o.bt.now.n }));
}
