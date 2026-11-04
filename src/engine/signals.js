// Field signals: the six NASA-based signals for one field on one screen (rain, soil moisture, heat, green cover,
// water stored under the land, and the soil's organic matter over the coming ten years), the trade-offs between
// rotations on four axes, how weather and water uncertainty move the season plan, and "what comes next".
// Pure functions: the page hands in records the app already loads (NASA POWER climate and its time machine, POWER
// soil wetness, SMAP and GRACE through GIBS, MODIS NDVI, Field Future's rotation runs); nothing is fetched here and
// nothing is made up. Each signal says what produced it (tags) and how sure the trend is.
import { bnDigits } from './dates.js';
import { evalRule, plantDate, backtest, whatIf, NOW, SEASONS, THEN } from './climate.js';
import { seasonNeeds } from './cropwater.js';
import { RABI_CROPS } from './crops.js';
import { cropOf, omPctOf, socStock, YEARS } from './soilfuture.js';

const both = (en, bn = en) => ({ bn: bnDigits(bn), en });
const r0 = (x) => Math.round(x);
const r1 = (x) => Math.round(x * 10) / 10;
const sgn = (x, f = r0) => `${f(x) > 0 ? '+' : f(x) < 0 ? '−' : ''}${Math.abs(f(x))}`;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export const LEVELS = [{ bn: 'ভালো', en: 'Fine' }, { bn: 'নজর রাখুন', en: 'Watch' }, { bn: 'ঝুঁকি', en: 'Risk' }];

// Monsoon (June–September) rain each season from the daily record, the season the Aman crop and the next Rabi's
// soil water both depend on.
export function monsoonRain(clim) {
  const series = SEASONS.map((y) => {
    let s = 0;
    for (let m = 5; m <= 8; m++) {
      const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) { const x = clim.val('prec', Date.UTC(y, m, d)); if (x === undefined) return { season: y, value: null }; s += x ?? 0; }
    }
    return { season: y, value: s };
  });
  const avg = (ys) => mean(series.filter((p) => ys.includes(p.season) && p.value != null).map((p) => p.value));
  const then = avg(THEN), now = avg(NOW);
  return { series, then, now, pct: then ? ((now - then) / then) * 100 : null };
}

// ── the six signals ──
// tm: timeMachine(clim); wet: rabiWetness(); smap: smapNow(); grace: graceRecord(); land: landSummary();
// field: fieldGreen() (null without enough years); habit/best/drain: Field Future evaluations (drain: the rotation
// that loses the most soil carbon); soil: the field's soil.
export function fieldSignals({ tm, clim, wet, smap, grace, land, field, habit, best, drain = null, soil }) {
  const out = [];

  // 1. Rain (NASA POWER, checked against GPM IMERG elsewhere in the app)
  if (tm?.rabiRain) {
    const rr = tm.rabiRain, mon = clim ? monsoonRain(clim) : null;
    // Rabi rain is small, so a big share can be a few mm: it counts only with a real change in mm as well.
    const dR = Math.abs((rr.now ?? 0) - (rr.then ?? 0)), pR = Math.abs(rr.pct ?? 0), pM = Math.abs(mon?.pct ?? 0);
    const big = pM >= 15 || (dR >= 40 && pR >= 30);
    const some = pM >= 7 || (dR >= 15 && pR >= 20);
    out.push({
      id: 'rain', level: big ? 2 : some ? 1 : 0, tags: ['MODEL', 'SAT'], source: 'NASA POWER · GPM IMERG',
      title: both('Rainfall', 'বৃষ্টি'),
      value: both(`Rabi rain ${r0(rr.now)} mm (was ${r0(rr.then)})`, `রবির বৃষ্টি ${r0(rr.now)} মিমি (আগে ছিল ${r0(rr.then)})`),
      detail: mon?.now != null
        ? both(`Nov–Feb rain ${sgn(rr.pct)}% and Jun–Sep monsoon ${sgn(mon.pct)}%, 2013–2025 against 2001–2012.`, `নভেম্বর–ফেব্রুয়ারির বৃষ্টি ${sgn(rr.pct)}% আর জুন–সেপ্টেম্বরের বর্ষা ${sgn(mon.pct)}%, ২০০১–২০১২-র তুলনায় ২০১৩–২০২৫।`)
        : both(`Nov–Feb rain ${sgn(rr.pct)}%, 2013–2025 against 2001–2012.`, `নভেম্বর–ফেব্রুয়ারির বৃষ্টি ${sgn(rr.pct)}%, ২০০১–২০১২-র তুলনায় ২০১৩–২০২৫।`),
      series: rr.series.filter((p) => p.value != null).map((p) => ({ x: p.season, y: r0(p.value) })), unit: 'mm',
    });
  }

  // 2. Soil moisture (POWER root-zone wetness through each Rabi; SMAP L4 this month against its own past)
  if (wet || smap) {
    const pct = smap?.pct ?? null;
    const drying = wet?.trend && wet.trend.perDecade < 0 && wet.trend.sure !== 'unclear';
    const level = pct != null && pct <= -30 ? 2 : (pct != null && pct <= -15) || drying ? 1 : 0;
    out.push({
      id: 'soil', level, tags: ['MODEL', 'SAT'], source: 'NASA SMAP L4 · NASA POWER (MERRA-2)',
      title: both('Soil moisture', 'মাটির আর্দ্রতা'),
      value: pct != null ? both(`SMAP ${smap.month}: ${sgn(pct)}% against normal`, `SMAP ${smap.month}: স্বাভাবিকের চেয়ে ${sgn(pct)}%`)
        : both(`Rabi root zone ${r0(wet.now * 100)}% wet`, `রবিতে শিকড়ের মাটি ${r0(wet.now * 100)}% ভেজা`),
      detail: wet ? both(`Rabi root-zone wetness ${r0(wet.then * 100)}% → ${r0(wet.now * 100)}%${wet.trend ? `; trend ${sgn(wet.trend.perDecade * 100, r1)} points a decade (${wet.trend.sure})` : ''}.`,
        `রবিতে শিকড়ের মাটির আর্দ্রতা ${r0(wet.then * 100)}% থেকে ${r0(wet.now * 100)}%${wet.trend ? `; প্রতি দশকে ${sgn(wet.trend.perDecade * 100, r1)} পয়েন্ট (${{ sure: 'নিশ্চিত', likely: 'সম্ভবত', unclear: 'অনিশ্চিত' }[wet.trend.sure]})` : ''}।`) : both('Only this month from SMAP.', 'শুধু এই মাসের SMAP তথ্য।'),
      series: (wet?.series ?? []).map((p) => ({ x: p.season, y: r0(p.root * 100) })), unit: '%',
    });
  }

  // 3. Heat (NASA POWER, corrected to the BMD station normals)
  if (tm?.hotMarApr) {
    const h = tm.hotMarApr, late = tm.lateHeat;
    out.push({
      id: 'heat', level: h.change >= 6 ? 2 : h.change >= 2 || (late?.change ?? 0) >= 4 ? 1 : 0, tags: ['MODEL', 'STATION'], source: 'NASA POWER · BMD station normals',
      title: both('Heat', 'গরম'),
      value: both(`${r1(h.now)} days ≥35 °C in Mar–Apr (was ${r1(h.then)})`, `মার্চ–এপ্রিলে ৩৫°-এর দিন ${r1(h.now)} (আগে ${r1(h.then)})`),
      detail: both(`Boro flowers in these weeks.${late ? ` Late-winter days ≥32 °C: ${r1(late.then)} → ${r1(late.now)}.` : ''}`, `এই সময়ে বোরোতে ফুল আসে।${late ? ` শীতের শেষে ৩২°-এর দিন: ${r1(late.then)} থেকে ${r1(late.now)}।` : ''}`),
      series: h.series.filter((p) => p.value != null).map((p) => ({ x: p.season, y: p.value })), unit: 'd',
    });
  }

  // 4. Green cover (MODIS NDVI: the area's Rabi greenness against its own trend; the field's own 250 m pixel)
  if (land?.rabi?.length) {
    const recent = land.rabi.slice(-3).filter((r) => r.stress).map((r) => r.y);
    const mine = field?.stressYears?.filter((y) => y >= land.rabi[land.rabi.length - 1].y - 2) ?? [];
    const lastY = land.rabi[land.rabi.length - 1];
    out.push({
      id: 'ndvi', level: recent.length + mine.length >= 2 ? 2 : recent.length + mine.length ? 1 : 0, tags: ['SAT'], source: 'NASA MODIS NDVI (250 m and 5 km)',
      title: both('Vegetation health (NDVI)', 'ফসলের সবুজ (NDVI)'),
      value: both(`${land.stressYears.length} stressed Rabi seasons since ${land.years[0]}`, `${land.years[0]} থেকে ${land.stressYears.length}টি রবিতে ফসলে চাপ`),
      detail: both(`Latest Rabi (${lastY.y}) ${lastY.stress ? 'was a stressed season' : 'was normal'} for the area${field ? `; your field's own pixel: ${field.stressYears.length} stressed seasons` : ''}.`,
        `শেষ রবি (${lastY.y}) এলাকায় ${lastY.stress ? 'চাপের মৌসুম ছিল' : 'স্বাভাবিক ছিল'}${field ? `; আপনার জমির নিজের পিক্সেলে ${field.stressYears.length}টি চাপের মৌসুম` : ''}।`),
      series: land.rabi.map((r) => ({ x: r.y, y: Math.round(r.v * 100) / 100, flag: r.stress })), unit: 'NDVI',
    });
  }

  // 5. Water stored under the land (GRACE/GRACE-FO: the region's water, ~300 km across, not one field's)
  if (grace?.years?.length) {
    const t = grace.trend;
    const falling = t && t.perDecade < 0;
    out.push({
      id: 'water', level: falling && t.sure === 'sure' && t.perDecade <= -5 ? 2 : falling && t.sure !== 'unclear' ? 1 : 0, tags: ['SAT'], source: 'NASA GRACE / GRACE-FO',
      title: both('Water availability', 'পানির মজুদ'),
      value: t ? both(`${sgn(t.perDecade, r1)} cm of water a decade`, `প্রতি দশকে ${sgn(t.perDecade, r1)} সেমি পানি`) : both('No trend yet', 'এখনো প্রবণতা নেই'),
      detail: both(`Water in soil, groundwater, rivers and ponds of the region, ${grace.first}–${grace.last}${t ? ` (${t.sure})` : ''}. A falling store means deep tubewells work harder each Boro.`,
        `এলাকার মাটি, ভূগর্ভ, নদী আর পুকুরের পানি, ${grace.first}–${grace.last}${t ? ` (${{ sure: 'নিশ্চিত', likely: 'সম্ভবত', unclear: 'অনিশ্চিত' }[t.sure]})` : ''}। মজুদ কমলে প্রতি বোরোতে গভীর নলকূপে চাপ বাড়ে।`),
      series: grace.years.map((y) => ({ x: y.year, y: r1(y.cm) })), unit: 'cm',
    });
  }

  // 6. Soil nutrients: organic matter over ten years (ICBM on the SoilGrids estimate). The model is calibrated so
  // the field's usual rotation holds today's carbon (there is no measured history to say otherwise), so "as now" is
  // flat by construction; what it can show is which change runs the soil down and which builds it back.
  if (habit?.now && soil) {
    const path = nutrientPath(habit, soil), bestPath = best ? nutrientPath(best, soil) : null;
    const drainPath = drain && drain.sNow.dSoc < 0 ? nutrientPath(drain, soil) : null;
    const end = (p) => r1(p[p.length - 1].om);
    const level = drainPath && drain.sNow.dSoc <= -3 ? 1 : 0;
    out.push({
      id: 'nutrient', level, tags: ['MODEL'], source: 'ICBM soil carbon on ISRIC SoilGrids',
      title: both('Soil nutrient depletion', 'মাটির পুষ্টি ক্ষয়'),
      value: drainPath
        ? both(`Organic matter ${r1(path[0].om)}% today: ${end(drainPath)}% to ${bestPath ? end(bestPath) : end(path)}% in ${YEARS} years, by rotation`, `জৈব পদার্থ আজ ${r1(path[0].om)}%: ${YEARS} বছরে ফসলচক্রভেদে ${end(drainPath)}% থেকে ${bestPath ? end(bestPath) : end(path)}%`)
        : both(`Organic matter ${r1(path[0].om)}% today; no rotation here runs it down`, `জৈব পদার্থ আজ ${r1(path[0].om)}%; এখানে কোনো ফসলচক্রে কমে না`),
      detail: both(`Grey: as now (the model starts from it holding steady). Green dashed: the best rotation${best?.sNow.nFix > 0 ? `, whose legumes add about ${r0(best.sNow.nFix)} kg of nitrogen per hectare a year` : ''}.${drainPath ? ` Red dashed: the rotation that drains it most (${rotName(drain.rot, 'en')}).` : ''} An estimate from a 250 m soil model, not a soil test.`,
        `ধূসর: এখনকার মতো (মডেল ধরে নেয় এতে মাটি স্থির থাকে)। সবুজ দাগ: সেরা ফসলচক্র${best?.sNow.nFix > 0 ? `, যার ডাল ফসল বছরে হেক্টরে প্রায় ${r0(best.sNow.nFix)} কেজি নাইট্রোজেন যোগ করে` : ''}।${drainPath ? ` লাল দাগ: যে ফসলচক্রে মাটি সবচেয়ে বেশি ক্ষয় হয় (${rotName(drain.rot, 'bn')})।` : ''} ২৫০ মিটারের মাটির মডেলের হিসাব, মাটি পরীক্ষা নয়।`),
      series: path.map((p) => ({ x: p.year, y: Math.round(p.om * 100) / 100 })), compare: bestPath?.map((p) => ({ x: p.year, y: Math.round(p.om * 100) / 100 })) ?? null,
      drain: drainPath?.map((p) => ({ x: p.year, y: Math.round(p.om * 100) / 100 })) ?? null, unit: '%', flatByDesign: true,
    });
  }
  return out;
}

// A rotation in words: each year's crops, with "fallow" for an empty slot.
export function rotName(rot, lang = 'en') {
  return rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].map((id) => cropOf(id).name[lang]).join(' → ')).join(' | ');
}

// Organic matter (%) year by year along one rotation's ten-year run, from the field's carbon stock today (socStock).
export function nutrientPath(e, soil) {
  return [{ year: e.now[0].year - 1, om: omPctOf(socStock(soil), soil) }, ...e.now.map((r) => ({ year: r.year, om: omPctOf(r.soc, soil) }))];
}

// ── trade-offs between rotations ──
// Share of recent seasons in which a crop's heat rules fire (only the rules on daily maximum temperature).
export function heatShare(clim, crop, t0) {
  const rules = (crop?.rules ?? []).filter((r) => r.v === 'tmax');
  if (!clim || !rules.length || t0 == null) return 0;
  const rabi = !!RABI_CROPS[crop.id], m = new Date(t0).getUTCMonth() + 1, d = new Date(t0).getUTCDate();
  let bad = 0, n = 0;
  for (const y of NOW) {
    const t = rabi ? plantDate(crop, y) : Date.UTC(y, m - 1, d);
    const res = rules.map((r) => evalRule(clim, r, t));
    if (res.some((r) => r.ok === null)) continue;
    n++; if (res.some((r) => !r.ok)) bad++;
  }
  return n ? bad / n : 0;
}

// strategies: [{ id, name, e }] (Field Future evaluations); ctx: fieldContext(). Per strategy and per world:
// irrigation (mm a year), soil carbon change (% in ten years), heat (share of seasons a heat rule fires, worst
// slot of the year), typical harvest (t/ha a year, FAOSTAT yields, no weather loss taken off) and net income.
export function tradeoffs(strategies, ctx) {
  const heatOf = (rot, world) => {
    const c = world === 'fut' ? ctx.climF : ctx.clim;
    if (!c) return null;
    return mean(rot.cycle.map((y) => {
      const R = ctx.rabi[y.rabi], K = ctx.k1[y.rabi]?.[y.k1];
      return Math.max(y.rabi === 'fallow' ? 0 : heatShare(c, cropOf(y.rabi), R?.t0), y.k1 === 'fallow' || !K?.t0 ? 0 : heatShare(c, cropOf(y.k1), K.t0));
    }));
  };
  const yieldOf = (rot) => mean(rot.cycle.map((y) => (ctx.rabi[y.rabi]?.tHa ?? 0) * (y.rabi === 'fallow' ? 0 : 1) + (y.k1 === 'fallow' ? 0 : ctx.k1[y.rabi]?.[y.k1]?.tHa ?? 0) + (ctx.amanSlot?.tHa ?? 0)));
  return strategies.filter((s) => s.e).map((s) => ({
    id: s.id, name: s.name, rot: s.e.rot,
    water: { now: s.e.sNow.waterMm, fut: s.e.sFut?.waterMm ?? null },
    soil: { now: s.e.sNow.dSoc, fut: s.e.sFut?.dSoc ?? null, health: s.e.sNow.health.score },
    heat: { now: heatOf(s.e.rot, 'now'), fut: heatOf(s.e.rot, 'fut') },
    yield: yieldOf(s.e.rot), money: s.e.sNow.money, nFix: s.e.sNow.nFix,
  }));
}

// Which strategy is best on each axis (lower water and heat, higher soil and yield), for the "best here" marks.
export function bestOn(rows) {
  const pick = (f, hi) => rows.reduce((a, r) => (a == null || (hi ? f(r) > f(a) : f(r) < f(a)) ? r : a), null)?.id ?? null;
  return { water: pick((r) => r.water.now, false), soil: pick((r) => r.soil.now, true), heat: pick((r) => r.heat.now ?? 1, false), yield: pick((r) => r.yield, true) };
}

// ── weather and water uncertainty ──
export const SCENARIOS = [
  { key: 'normal', dT: 0, rain: 1, bn: 'যেমন মাপা হয়েছে', en: 'As measured' },
  { key: 'drought', dT: 1, rain: 0.7, bn: 'খরা (বৃষ্টি −৩০%, +১°)', en: 'Drought (rain −30%, +1 °C)' },
  { key: 'hot', dT: 2, rain: 1, bn: 'বেশি গরম (+২°)', en: 'Hotter (+2 °C)' },
  { key: 'wet', dT: 0, rain: 1.3, bn: 'ভারী বৃষ্টি (+৩০%)', en: 'Heavy rain (+30%)' },
];
const q = (v, p) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const i = (s.length - 1) * p, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo); };

// One scenario for the season plan's crop: the spread of its irrigation need over the recent seasons (10th, 50th
// and 90th percentile) and in how many of the recent seasons its failure rules stay quiet.
export function scenarioRun(clim, crop, t0, { dT = 0, rain = 1 } = {}, shift = 0) {
  const c = dT || rain !== 1 ? whatIf(clim, `c:${dT}:${rain}`) : clim;
  const needs = seasonNeeds(c, crop, t0).map((r) => r.mm);
  const bt = backtest(c, crop, shift);
  return { dT, rain, p10: q(needs, 0.1), p50: q(needs, 0.5), p90: q(needs, 0.9), min: needs.length ? Math.min(...needs) : null, max: needs.length ? Math.max(...needs) : null, n: needs.length, safe: bt.now.safe, of: bt.now.n };
}
export function uncertainty(clim, crop, t0, custom = null, shift = 0) {
  const rows = SCENARIOS.map((s) => ({ ...s, ...scenarioRun(clim, crop, t0, s, shift) }));
  if (custom && (custom.dT || custom.rain !== 1)) rows.push({ key: 'custom', bn: 'আপনার বাছাই', en: 'Your setting', ...scenarioRun(clim, crop, t0, custom, shift) });
  return rows;
}

// ── what comes next ──
// water: the store's field water result ({ color, reasons }); plan: { crop, t0 } of this season; unc: uncertainty();
// trade: tradeoffs() rows (habit first, best second); signals: fieldSignals(). Up to four steps, most urgent first.
export function whatNext({ water, plan, unc, trade, signals }) {
  const steps = [];
  if (water?.color) {
    const go = water.color === 'ORANGE' || water.color === 'RED';
    steps.push({ id: 'week', when: both('This week', 'এই সপ্তাহে'), tone: go ? 2 : water.color === 'YELLOW' ? 1 : 0, tags: ['MODEL', 'RULE'], to: '/farmer/today',
      text: go ? both('Irrigate the field: the crop has used the water it can reach easily.', 'জমিতে সেচ দিন: শিকড়ের নাগালের সহজ পানি ফুরিয়েছে।')
        : water.color === 'YELLOW' ? both('Check the soil by hand; water soon unless the forecast rain comes.', 'হাতে মাটি দেখুন; পূর্বাভাসের বৃষ্টি না এলে শিগগির সেচ দিন।')
          : both('No irrigation needed yet: the soil still holds enough water.', 'এখনো সেচ লাগবে না: মাটিতে যথেষ্ট পানি আছে।'),
      why: water.reasons?.[0] ?? null });
  }
  const base = unc?.find((r) => r.key === 'normal'), dry = unc?.find((r) => r.key === 'drought');
  if (plan?.crop && base) {
    const holds = dry && dry.of ? dry.safe / dry.of >= 0.6 : true;
    steps.push({ id: 'season', when: both('This season', 'এই মৌসুমে'), tone: holds ? 0 : 1, tags: ['MODEL', 'RULE'], to: '/farmer/plan',
      text: both(`Grow ${plan.crop.name.en.toLowerCase()}: the weather suited it in ${base.safe} of ${base.of} recent seasons${dry ? `, and ${dry.safe} of ${dry.of} in a drought year` : ''}.`,
        `${plan.crop.name.bn} করুন: সাম্প্রতিক ${base.of}টি মৌসুমের ${base.safe}টিতে আবহাওয়া ঠিক ছিল${dry ? `, খরার বছরে ${dry.of}টির ${dry.safe}টিতে` : ''}।`),
      why: base.p50 != null ? both(`Irrigation usually ${r0(base.p50)} mm, between ${r0(base.p10)} and ${r0(base.p90)} mm in nine years of ten.`, `সেচ সাধারণত ${r0(base.p50)} মিমি, দশ বছরের নয় বছরে ${r0(base.p10)} থেকে ${r0(base.p90)} মিমি।`) : null });
  }
  const [habit, best] = trade ?? [];
  if (habit && best && habit.id !== best.id) {
    const saved = habit.water.now - best.water.now, soil = best.soil.now - habit.soil.now;
    steps.push({ id: 'years', when: both('Next years', 'সামনের বছরগুলোয়'), tone: 0, tags: ['MODEL'], to: '/farmer/future',
      text: both(`Move towards the best rotation: ${soil >= 0 ? `${sgn(soil, r1)}% more soil carbon in ten years` : `${sgn(soil, r1)}% soil carbon`}${saved > 0 ? ` and ${r0(saved)} mm less irrigation a year` : ''}.`,
        `সেরা ফসলচক্রের দিকে যান: দশ বছরে মাটির জৈব কার্বন ${sgn(soil, r1)}%${saved > 0 ? `, আর বছরে ${r0(saved)} মিমি কম সেচ` : ''}।`),
      why: null });
  }
  const worst = [...(signals ?? [])].filter((s) => s.level === 2).sort((a, b) => b.level - a.level)[0];
  if (worst) {
    const act = {
      water: both('Ask the officer about AWD for Boro and a pulse in place of one Boro: the water under the area is falling.', 'বোরোতে AWD আর এক বোরোর বদলে ডাল ফসল নিয়ে অফিসারের সাথে কথা বলুন: এলাকার মাটির নিচের পানি কমছে।'),
      heat: both('Plant Boro early or choose a heat-tolerant variety: hot days at flowering have become more common.', 'বোরো আগে লাগান বা গরম সহনশীল জাত নিন: ফুল আসার সময় গরম দিন বেড়েছে।'),
      nutrient: both('Keep the straw in the field or add a legume: the soil is losing organic matter as now.', 'খড় জমিতে রাখুন বা ডাল ফসল যোগ করুন: এখনকার চাষে মাটির জৈব পদার্থ কমছে।'),
      soil: both('The soil is drier than usual: plan a crop that needs less water this Rabi.', 'মাটি স্বাভাবিকের চেয়ে শুকনো: এবারের রবিতে কম পানির ফসল ভাবুন।'),
      rain: both('Rain has shifted a lot: check the sowing date against the radar onset each year.', 'বৃষ্টি অনেক বদলেছে: প্রতি বছর রাডারের বর্ষা শুরুর দিন দেখে বোনার দিন ঠিক করুন।'),
      ndvi: both('Crops here were stressed in recent seasons: walk the field and ask the officer what held it back.', 'সাম্প্রতিক মৌসুমে এখানে ফসলে চাপ ছিল: জমি ঘুরে দেখুন আর কারণ নিয়ে অফিসারকে জিজ্ঞেস করুন।'),
    }[worst.id];
    if (act) steps.push({ id: 'watch', when: both('Keep watching', 'নজরে রাখুন'), tone: 2, tags: worst.tags, to: '/farmer/farm', text: act, why: worst.value });
  }
  return steps;
}
