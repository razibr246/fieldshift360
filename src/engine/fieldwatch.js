// What a field looks like from space, in plain words. Input: one field's Sentinel-2 series from field_watch.json
// (real passes, each with NDVI = green cover, NDMI = moisture, NDWI and `water` = standing water, `sd` = how uneven
// the green is inside the field).
//
// Two parts, labelled separately in the app:
//   [AI]   matchSeason(): a pattern matcher. The season's green-cover curve is compared with the typical curve of
//          each way of using a field here (Aman rice, mustard then Boro, wheat, …), sliding each typical curve up
//          to three weeks earlier or later. The closest ones come back with a confidence (softmax of the fit error).
//   [RULE] readField(): open rules on the latest passes: stage, green cover against a typical crop and against
//          last year, uneven patches, a sudden drop, standing water, dryness. Thresholds are starting values for an
//          agronomist to check, like those in crops.js.
// A satellite cannot name a disease or a pest; it can only show where the crop is weaker. Every warning says so
// and points to a field visit or the crop doctor.
import { DAY, parseISO, iso, daysBetween, bnDigits, todayDhaka } from './dates.js';

// ---- typical green-cover curves (NDVI) ----
// pts: [month, day, NDVI] through the season; a point in an earlier month than the first is in the next year.
// wet: [from, to] (month, day) when the field is normally under water (rice puddling and transplanting).
// stages: [month, day, bn, en] from that day on.
const AMAN = 'aman', RABI = 'rabi';
export const PATTERNS = {
  aman: {
    season: AMAN, crops: ['aman'], name: { bn: 'রোপা আমন ধান', en: 'Transplanted Aman rice' },
    pts: [[6, 15, 0.32], [7, 20, 0.22], [8, 10, 0.3], [9, 1, 0.55], [9, 25, 0.78], [10, 20, 0.8], [11, 10, 0.62], [11, 30, 0.32], [12, 20, 0.28]],
    wet: [[7, 5], [8, 25]],
    stages: [[6, 1, 'জমি তৈরি ও চারা রোপণ', 'Land preparation and transplanting'], [8, 5, 'কুশি গজানোর সময়', 'Tillering'],
      [9, 10, 'থোড় আসার সময়', 'Booting'], [10, 1, 'ফুল ও দানা পুষ্ট হওয়ার সময়', 'Flowering and grain filling'],
      [10, 30, 'ধান পাকছে', 'Ripening'], [11, 20, 'কাটা হয়ে গেছে বা কাটার সময়', 'Harvest time or harvested']],
  },
  aman_late: {
    season: AMAN, crops: ['aman'], name: { bn: 'নাবি আমন ধান (বন্যার পানি নামার পর)', en: 'Late Aman rice (after the flood water goes down)' },
    pts: [[6, 15, 0.25], [7, 25, 0.08], [8, 25, 0.12], [9, 15, 0.38], [10, 10, 0.65], [11, 5, 0.8], [11, 30, 0.6], [12, 20, 0.32]],
    wet: [[7, 10], [9, 15]],
    stages: [[6, 1, 'বন্যার পানি', 'Flood water'], [8, 25, 'চারা রোপণ', 'Transplanting'], [9, 20, 'কুশি গজানোর সময়', 'Tillering'],
      [10, 15, 'থোড় ও ফুল আসার সময়', 'Booting and flowering'], [11, 15, 'ধান পাকছে', 'Ripening'], [12, 5, 'কাটার সময়', 'Harvest time']],
  },
  kharif_fallow: {
    season: AMAN, crops: [], name: { bn: 'বর্ষায় পতিত বা ঘাস', en: 'Fallow or grass in the monsoon' },
    pts: [[6, 15, 0.42], [8, 1, 0.48], [9, 15, 0.5], [10, 20, 0.45], [11, 20, 0.35], [12, 20, 0.3]],
    stages: [[6, 1, 'পতিত, ঘাস বা আগাছা', 'Fallow, grass or weeds']],
  },
  deep_water: {
    season: AMAN, crops: [], name: { bn: 'বর্ষায় পানির নিচে', en: 'Under water in the monsoon' },
    pts: [[6, 15, 0.15], [7, 15, 0.0], [9, 15, -0.05], [10, 25, 0.05], [11, 20, 0.2], [12, 20, 0.3]],
    wet: [[6, 25], [11, 5]],
    stages: [[6, 1, 'বর্ষার পানির নিচে', 'Under monsoon water'], [11, 5, 'পানি নামছে', 'Water going down']],
  },
  mustard_boro: {
    season: RABI, crops: ['mustard', 'boro'], name: { bn: 'সরিষা, তারপর বোরো ধান', en: 'Mustard, then Boro rice' },
    pts: [[11, 1, 0.3], [11, 20, 0.28], [12, 15, 0.62], [1, 5, 0.66], [1, 25, 0.45], [2, 10, 0.24], [3, 1, 0.24], [3, 25, 0.5], [4, 15, 0.76], [5, 5, 0.7], [5, 25, 0.35]],
    wet: [[2, 10], [3, 5]],
    stages: [[11, 1, 'সরিষা বোনা', 'Mustard sowing'], [12, 1, 'সরিষার ফুল', 'Mustard flowering'], [1, 20, 'সরিষা কাটা', 'Mustard harvest'],
      [2, 10, 'বোরো রোপণ', 'Boro transplanting'], [3, 10, 'বোরোর কুশি', 'Boro tillering'], [4, 5, 'বোরোর থোড় ও ফুল', 'Boro booting and flowering'], [5, 1, 'বোরো পাকছে বা কাটা', 'Boro ripening or harvest']],
  },
  boro: {
    season: RABI, crops: ['boro'], name: { bn: 'বোরো ধান', en: 'Boro rice' },
    pts: [[11, 1, 0.4], [12, 1, 0.3], [12, 31, 0.24], [1, 25, 0.2], [2, 20, 0.38], [3, 15, 0.62], [4, 5, 0.8], [4, 25, 0.74], [5, 15, 0.4], [5, 31, 0.3]],
    wet: [[1, 5], [2, 15]],
    stages: [[11, 1, 'আমনের নাড়া, জমি ফাঁকা', 'Aman stubble, field empty'], [1, 1, 'বোরো রোপণ', 'Boro transplanting'], [2, 10, 'কুশি গজানোর সময়', 'Tillering'],
      [3, 20, 'থোড় ও ফুল', 'Booting and flowering'], [4, 20, 'ধান পাকছে', 'Ripening'], [5, 10, 'কাটা হয়ে গেছে', 'Harvested']],
  },
  wheat: {
    season: RABI, crops: ['wheat'], name: { bn: 'গম', en: 'Wheat' },
    pts: [[11, 1, 0.32], [11, 25, 0.24], [12, 25, 0.42], [1, 25, 0.74], [2, 20, 0.74], [3, 15, 0.42], [4, 1, 0.25], [5, 31, 0.28]],
    stages: [[11, 1, 'জমি তৈরি ও বোনা', 'Land preparation and sowing'], [12, 15, 'চারা বাড়ছে', 'Young crop'], [1, 20, 'শিষ আসার সময়', 'Heading'],
      [2, 25, 'দানা পাকছে', 'Ripening'], [3, 20, 'কাটা হয়ে গেছে', 'Harvested']],
  },
  lentil: {
    season: RABI, crops: ['lentil'], name: { bn: 'মসুর ডাল', en: 'Lentil' },
    pts: [[11, 1, 0.28], [11, 15, 0.2], [12, 15, 0.38], [1, 15, 0.55], [2, 10, 0.5], [3, 1, 0.3], [3, 31, 0.2], [5, 31, 0.22]],
    stages: [[11, 1, 'বোনা', 'Sowing'], [12, 10, 'চারা বাড়ছে', 'Young crop'], [1, 10, 'ফুল ও ফল', 'Flowering and pods'], [2, 20, 'কাটা', 'Harvest']],
  },
  vegetables: {
    season: RABI, crops: ['tomato'], name: { bn: 'টমেটো বা শীতের সবজি', en: 'Tomato or winter vegetables' },
    pts: [[11, 1, 0.3], [11, 25, 0.3], [12, 25, 0.46], [1, 25, 0.6], [2, 25, 0.58], [3, 25, 0.4], [4, 20, 0.3], [5, 31, 0.3]],
    stages: [[11, 1, 'চারা লাগানো', 'Transplanting'], [12, 15, 'গাছ বাড়ছে', 'Growing'], [1, 20, 'ফুল ও ফল', 'Flowering and fruiting'], [3, 1, 'ফল তোলা', 'Picking']],
  },
  rabi_fallow: {
    season: RABI, crops: [], name: { bn: 'রবিতে পতিত', en: 'Fallow in Rabi' },
    pts: [[11, 1, 0.3], [12, 15, 0.24], [2, 15, 0.2], [4, 15, 0.2], [5, 31, 0.25]],
    stages: [[11, 1, 'পতিত', 'Fallow']],
  },
  // Not a field: trees, bamboo and houses stay green all year. Found by looksLikeField(), not by the matcher.
  trees: {
    season: 'any', crops: [], notField: true, name: { bn: 'গাছপালা বা বসতবাড়ি (মাঠ নয়)', en: 'Trees or homesteads (not a field)' },
    pts: [[1, 1, 0.66], [4, 1, 0.62], [7, 1, 0.72], [10, 1, 0.74], [12, 31, 0.68]],
    stages: [[1, 1, 'সারা বছর গাছপালা', 'Trees all year']],
  },
};

// Season windows: Aman (kharif-2) 15 Jun – 20 Dec of year Y; Rabi 1 Nov of Y – 31 May of Y+1.
export function seasonOf(t) {
  const d = new Date(t), m = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  if (m >= 6 && m <= 11) return { key: AMAN, year: y, start: Date.UTC(y, 5, 15), end: Date.UTC(y, 11, 20) };
  const ry = m === 12 ? y : y - 1;
  return { key: RABI, year: ry, start: Date.UTC(ry, 10, 1), end: Date.UTC(ry + 1, 4, 31) };
}
// The Rabi season before the one `t` is in (for an Aman date: the Rabi that ended that May).
export const previousRabi = (t) => { const ry = seasonOf(t).year - 1; return { key: RABI, year: ry, start: Date.UTC(ry, 10, 1), end: Date.UTC(ry + 1, 4, 31) }; };

// A pattern's points as dates in the given season (year = season start year), shifted by `shift` days.
function curve(p, season, shift = 0) {
  const startM = new Date(season.start).getUTCMonth() + 1;
  return p.pts.map(([m, d, v]) => [Date.UTC(m < startM && p.season !== 'any' ? season.year + 1 : season.year, m - 1, d) + shift * DAY, v]);
}
function at(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  return pts[pts.length - 1][1];
}
const inWet = (p, season, t, shift) => {
  if (!p.wet) return false;
  const [[m0, d0], [m1, d1]] = p.wet, startM = new Date(season.start).getUTCMonth() + 1;
  const yr = (m) => (m < startM ? season.year + 1 : season.year);
  return t >= Date.UTC(yr(m0), m0 - 1, d0) + shift * DAY && t <= Date.UTC(yr(m1), m1 - 1, d1) + shift * DAY;
};
const wetObs = (o) => o.water >= 0.3 || o.ndwi > 0.05;

// A pass far below both neighbours (within 25 days each side) is cloud shadow the masks missed, not the crop:
// green cover does not fall and come back in a few days. The last pass has no later neighbour and always stays.
export function despike(series) {
  return series.filter((o, i) => {
    const a = series[i - 1], b = series[i + 1];
    if (!a || !b) return true;
    const t = parseISO(o.d);
    return !((t - parseISO(a.d)) / DAY <= 25 && (parseISO(b.d) - t) / DAY <= 25 && o.ndvi < Math.min(a.ndvi, b.ndvi) - 0.15);
  });
}

// A field goes bare or under water at least once a year (land preparation, harvest); trees and homesteads never do.
// Needs passes spread over most of the year before `t`.
export function looksLikeField(series, t) {
  const yr = series.filter((o) => { const x = parseISO(o.d); return x <= t && x > t - 365 * DAY; });
  if (yr.length < 8) return true;
  return Math.min(...yr.map((o) => o.ndvi)) < 0.45;
}

// [AI] Which typical curve fits this season's passes best. Returns [{id, pattern, p, rmse, shift, n}] best first,
// or [] when there are fewer than two clear passes in the season so far.
export function matchSeason(series, season, { upTo = Infinity } = {}) {
  const obs = series.map((o) => ({ ...o, t: parseISO(o.d) })).filter((o) => o.t >= season.start && o.t <= season.end && o.t <= upTo);
  if (obs.length < 2) return [];
  const fits = Object.entries(PATTERNS).filter(([, p]) => p.season === season.key).map(([id, p]) => {
    let best = null;
    for (let shift = -21; shift <= 21; shift += 7) {
      const pts = curve(p, season, shift);
      let e = 0;
      for (const o of obs) {
        const r = o.ndvi - at(pts, o.t);
        e += Math.abs(r) < 0.15 ? r * r : 0.15 * (2 * Math.abs(r) - 0.15); // Huber: one odd pass cannot decide
        const wetNow = inWet(p, season, o.t, shift);
        if (wetObs(o) !== wetNow && (wetObs(o) || p.wet)) e += wetObs(o) ? 0.02 : 0.004; // water where none is expected costs more
      }
      const rmse = Math.sqrt(e / obs.length) + Math.abs(shift) * 0.0004; // a small cost for sliding the calendar
      if (!best || rmse < best.rmse) best = { id, pattern: p, rmse, shift };
    }
    return best;
  });
  const TAU = 0.03;
  const w = fits.map((f) => Math.exp(-f.rmse / TAU));
  const sum = w.reduce((a, b) => a + b, 0);
  // With only two passes the curve is barely seen: the confidence is pulled towards an even split.
  const k = obs.length < 3 ? 0.5 : 1;
  return fits.map((f, i) => ({ ...f, p: k * (w[i] / sum) + (1 - k) / fits.length, n: obs.length })).sort((a, b) => b.p - a.p);
}

const stageOf = (p, season, t, shift) => {
  const startM = new Date(season.start).getUTCMonth() + 1;
  let s = p.stages[0];
  for (const st of p.stages) {
    const [m, d] = st;
    if (t >= Date.UTC(m < startM && p.season !== 'any' ? season.year + 1 : season.year, m - 1, d) + shift * DAY) s = st;
  }
  return { bn: s[2], en: s[3] };
};

const nearest = (obs, t, within) => {
  let best = null;
  for (const o of obs) { const dd = Math.abs(o.t - t) / DAY; if (dd <= within && (!best || dd < best.dd)) best = { ...o, dd }; }
  return best;
};

// What can usually go wrong at this time of year for this crop (so the farmer knows what to look for). [RULE]
const SEASON_RISKS = {
  aman: [
    [9, 15, 11, 15, 'অক্টোবরে আমনে বাদামি গাছফড়িং (কারেন্ট পোকা) জমির ভেতরে গোল গোল জায়গা পুড়িয়ে দেয়। জমির মাঝখানে গিয়ে গাছের গোড়ায় দেখুন।', 'In October, brown planthopper burns round patches inside Aman fields. Walk into the middle of the field and look at the base of the plants.'],
    [9, 1, 10, 31, 'খোলপোড়া ও ব্লাস্ট রোগও এই সময় হয়: পাতার খোলে ছোপ ছোপ দাগ বা শিষের গোড়া কালো হলে ছবি তুলে পাঠান।', 'Sheath blight and blast also come now: blotches on the leaf sheath or a blackened neck under the panicle, send a photo.'],
  ],
  mustard_boro: [[12, 10, 1, 31, 'সরিষার ফুলের সময় জাব পোকা হয়, বিশেষ করে কুয়াশার পর।', 'Aphids come at mustard flowering, especially after fog.']],
  boro: [[3, 1, 4, 30, 'বোরোর থোড় আর ফুলের সময় ব্লাস্ট ও মাজরা পোকা দেখা দেয়।', 'Blast and stem borer show up at Boro booting and flowering.']],
};
function seasonRisks(id, t) {
  const m = new Date(t).getUTCMonth() + 1, d = new Date(t).getUTCDate(), md = m * 100 + d;
  const list = SEASON_RISKS[id === 'aman_late' ? 'aman' : id] ?? [];
  return list.filter(([m0, d0, m1, d1]) => (m0 * 100 + d0 <= m1 * 100 + d1 ? md >= m0 * 100 + d0 && md <= m1 * 100 + d1 : md >= m0 * 100 + d0 || md <= m1 * 100 + d1))
    .map(([, , , , bn, en]) => ({ bn, en }));
}

// [RULE] The whole reading of one field. `today` is used only to say how old the latest picture is.
export function readField(watch, { today = todayDhaka() } = {}) {
  const series = despike(watch.series);
  const obs = series.map((o) => ({ ...o, t: parseISO(o.d) }));
  const last = obs[obs.length - 1];
  const season = seasonOf(last.t);
  const isField = looksLikeField(series, last.t);
  const guess = isField ? matchSeason(series, season) : [{ id: 'trees', pattern: PATTERNS.trees, p: 1, rmse: 0, shift: 0 }];
  const lastRabi = matchSeason(series, previousRabi(last.t));
  const top = guess[0];
  const findings = [];

  let expected = null, stage = null;
  if (top) {
    expected = at(curve(top.pattern, season, top.shift), last.t);
    stage = stageOf(top.pattern, season, last.t, top.shift);
  }
  const prev = obs.length > 1 ? obs[obs.length - 2] : null;
  const yearAgo = nearest(obs, last.t - 365 * DAY, 15);
  const vsLastYear = yearAgo ? last.ndvi - yearAgo.ndvi : null;
  const pct = (x) => Math.round(x * 100);
  const add = (tone, kind, bn, en) => findings.push({ tone, kind, bn: bnDigits(bn), en });

  if (top?.pattern.notField) {
    add('warn', 'pin', 'সারা বছর এখানে গাছপালা বা ঘরবাড়ির মতো সবুজ দেখা যাচ্ছে, মাঠের মতো ওঠানামা নেই। জমির অবস্থান সম্ভবত ঠিক নেই, উপজেলা কৃষি অফিসকে দেখে ঠিক করে দিতে বলুন।', 'This spot stays green all year like trees or homesteads, without a field’s rise and fall. The field position is probably wrong; ask the upazila agriculture office to check it.');
  } else if (top && top.pattern.crops.length) {
    const cropNow = expected > 0.5;
    if (cropNow && last.ndvi < expected - 0.12) add('warn', 'vigour', `এই সময়ে সাধারণ ফসলের তুলনায় সবুজ কম (${pct(last.ndvi)} বনাম প্রায় ${pct(expected)})। সার, পানি বা পোকা-রোগের কারণে গাছ দুর্বল হতে পারে। জমিতে গিয়ে দেখুন।`, `Less green than a typical crop at this stage (${pct(last.ndvi)} against about ${pct(expected)}). Fertiliser, water, pests or disease may be holding it back. Go and look.`);
    else if (cropNow && last.ndvi >= expected - 0.05) add('ok', 'vigour', 'ফসল ঘন সবুজ, এই সময়ের জন্য স্বাভাবিক বা তার চেয়ে ভালো।', 'The crop is thick and green, normal or better for this stage.');
    else if (cropNow) add('watch', 'vigour', 'সবুজ এই সময়ের জন্য স্বাভাবিকের একটু নিচে। পরের ছবিতে আরও কমলে জমি ঘুরে দেখুন।', 'Green cover is a little under normal for this stage. If the next picture is lower, walk the field.');
  }
  if (vsLastYear != null && !top?.pattern.notField && Math.abs(vsLastYear) >= 0.08) {
    add(vsLastYear < -0.15 ? 'warn' : vsLastYear < 0 ? 'watch' : 'ok', 'lastyear',
      vsLastYear < 0 ? `গত বছর এই সময়ের চেয়ে সবুজ কম (${pct(last.ndvi)} বনাম ${pct(yearAgo.ndvi)})।` : `গত বছর এই সময়ের চেয়ে সবুজ বেশি (${pct(last.ndvi)} বনাম ${pct(yearAgo.ndvi)})।`,
      vsLastYear < 0 ? `Less green than this time last year (${pct(last.ndvi)} against ${pct(yearAgo.ndvi)}).` : `Greener than this time last year (${pct(last.ndvi)} against ${pct(yearAgo.ndvi)}).`);
  }
  if (prev && (last.t - prev.t) / DAY <= 30 && prev.ndvi - last.ndvi > 0.15 && top && !top.pattern.notField) {
    const expPrev = at(curve(top.pattern, season, top.shift), prev.t);
    if (expPrev - expected < 0.08) add('warn', 'drop', `${daysBetween(prev.t, last.t)} দিনে সবুজ হঠাৎ অনেক কমেছে (${pct(prev.ndvi)} থেকে ${pct(last.ndvi)}), অথচ এখন কাটার সময় নয়। বন্যা, গাছ হেলে পড়া, পোকা বা রোগ হতে পারে। দ্রুত জমি দেখুন।`, `Green cover fell sharply in ${daysBetween(prev.t, last.t)} days (${pct(prev.ndvi)} to ${pct(last.ndvi)}) although it is not harvest time. Flood, lodging, pests or disease are possible. Check the field soon.`);
  }
  // Uneven against the field's own usual spread (edges, bunds and mixed pixels make every field a little uneven).
  const sds = series.map((o) => o.sd).sort((a, b) => a - b);
  const usualSd = sds[Math.floor(sds.length / 2)];
  if (last.sd >= Math.max(0.12, 1.6 * usualSd) && last.ndvi > 0.35 && !top?.pattern.notField) add('watch', 'uneven', 'জমির সব জায়গা সমান সবুজ নয়, কিছু অংশ দুর্বল। ওই অংশে পোকা, রোগ, পানি জমা বা কম সার হতে পারে।', 'The field is not evenly green; part of it is weaker. That part may have pests, disease, standing water or too little fertiliser.');
  if (last.water >= 0.4 && expected != null && expected > 0.5 && !inWet(top.pattern, season, last.t, top.shift)) add('warn', 'flood', 'ফসল থাকার সময়ে জমির বেশির ভাগ পানির নিচে দেখা যাচ্ছে। জলাবদ্ধতা বা বন্যা হতে পারে।', 'Most of the field shows open water while a crop should be standing. Waterlogging or flooding is possible.');
  if (last.ndvi > 0.5 && last.ndmi < 0.05 && top && !top.id.startsWith('aman') && top.id !== 'boro' && !(top.id === 'mustard_boro' && new Date(last.t).getUTCMonth() + 1 >= 2 && new Date(last.t).getUTCMonth() + 1 <= 5)) add('watch', 'dry', 'পাতা ও মাটিতে আর্দ্রতা কম দেখা যাচ্ছে। সেচের দরকার আছে কিনা দেখুন।', 'Leaves and soil look dry. Check whether the field needs water.');
  if (!findings.some((f) => f.tone !== 'ok') && top && !top.pattern.notField) add('ok', 'fine', 'উপগ্রহের ছবিতে কোনো সমস্যার চিহ্ন নেই।', 'Nothing in the satellite picture points to a problem.');

  const level = findings.some((f) => f.tone === 'warn') ? 'warn' : findings.some((f) => f.tone === 'watch') ? 'watch' : 'ok';
  return {
    series, last, prev, season, guess, lastRabi, top, stage, expected, yearAgo, vsLastYear, findings, level,
    risks: top ? seasonRisks(top.id, last.t) : [],
    ageDays: daysBetween(last.t, today),
    expectedCurve: top ? curve(top.pattern, season, top.shift).map(([t, v]) => ({ d: iso(t), v })) : [],
  };
}
