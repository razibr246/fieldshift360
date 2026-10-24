#!/usr/bin/env node
// Aman weather hazards, 2001 to now, for Godagari and every Dhaka district upazila (Ropan Radar shows them all):
//   node scripts/build/build_aman_hazards.mjs        (run after build_aman_radar.mjs)
//
// Inputs, all already in the repo or its cache:
//   * NASA POWER daily rain (PRECTOTCORR), Tmax, Tmin: src/data/climate/climate_<upazila>.json (0.5° cell, area-level); dry
//     spells use the same file's NASA/JAXA GPM IMERG rain, which counts dry days far better than the model rain.
//   * Each upazila's usual Aman transplanting day, measured by Sentinel-1: src/data/radar/aman_radar.json.
//   * Raw Sentinel-1 VH at the 36 sample fields per pass: .cache/data/aman/vh (from build_aman_radar.mjs).
// The season windows hang on the measured transplanting day T: the 30 days before T (seedbed, land preparation), T to
// T+55 (tillering), T+55 to T+85 (flowering, when heat and cold sterilise spikelets) and T+55 to T+95 (grain filling).
// Indices and thresholds, with their sources, are in INDICES below; each gets a Mann-Kendall test and Sen's slope over
// 2001–2025, with Benjamini-Hochberg across the indices of an upazila (the radar's own stats.js).
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mannKendall, senSlope, benjaminiHochberg, median, normInv, normCdf } from '../../public/radar/js/stats.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const UPAZILAS = ['godagari', 'dhamrai', 'savar', 'keraniganj', 'dohar', 'nawabganj'];
const FROM = 2001, REF_TO = 2025;
const WATER_DB = -20; // Sentinel-1 VH below about −20 dB looks like open water (smooth surface, little backscatter)

// ───────── gamma-based SPI (McKee et al. 1993; WMO-No. 1090, 2012) ─────────
function gammaFit(x) { // Thom (1958) maximum-likelihood approximation
  const m = x.reduce((a, b) => a + b, 0) / x.length;
  const A = Math.log(m) - x.reduce((a, b) => a + Math.log(b), 0) / x.length;
  const a = (1 + Math.sqrt(1 + (4 * A) / 3)) / (4 * A);
  return { a, b: m / a };
}
function lnGamma(z) { // Lanczos
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log((2.5066282746310005 * s) / x);
}
function gammaP(a, x) { // regularised lower incomplete gamma (Numerical Recipes gser / gcf)
  if (x <= 0) return 0;
  if (x < a + 1) { let sum = 1 / a, del = sum, ap = a; for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-12) break; } return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a)); }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-12) break; }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}
const spiOf = (fit, v) => normInv(Math.min(1 - 1e-9, Math.max(1e-9, gammaP(fit.a, v / fit.b))));

// ───────── daily climate access ─────────
async function climate(id) {
  const c = JSON.parse(await readFile(path.join(REPO, 'src', 'data', 'climate', `climate_${id}.json`), 'utf8'));
  const t0 = Date.parse(`${c.start}T00:00:00Z`);
  const at = (k, y, doy) => { const i = Math.round((Date.UTC(y, 0, doy) - t0) / 864e5); return i >= 0 && i < c[k].length ? c[k][i] : undefined; };
  return { prov: c.provenance, end: c.provenance.end, at };
}
const doyOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;

// window values, or null when any day is missing (so a partial season never counts as a full one)
function win(cl, k, y, a, b) {
  const v = [];
  for (let d = a; d <= b; d++) { const x = cl.at(k, y, d); if (x === undefined || x === null) return null; v.push(x); }
  return v;
}
const sum = (v) => (v ? v.reduce((p, q) => p + q, 0) : null);
const longestRun = (v, f) => { if (!v) return null; let r = 0, best = 0; for (const x of v) { r = f(x) ? r + 1 : 0; best = Math.max(best, r); } return best; };
const count = (v, f) => (v ? v.filter(f).length : null);
const maxRoll = (v, n) => { if (!v) return null; let best = 0; for (let i = 0; i + n <= v.length; i++) best = Math.max(best, v.slice(i, i + n).reduce((a, b) => a + b, 0)); return best; };
const round1 = (v) => (v === null ? null : Math.round(v * 10) / 10);

// ───────── the indices ─────────
// hazard: the yearly condition counted as "a hazard year"; dir: +1 if larger is worse, −1 if smaller is worse.
const INDICES = [
  { key: 'spi', group: 'drought', dir: -1, unit: '', hazard: (v) => v <= -1,
    bn: 'বর্ষার বৃষ্টির মান (এসপিআই, জুন–সেপ্টেম্বর)', en: 'Monsoon rain index (SPI, June–September)',
    rule: { bn: '−১ বা তার নিচে = মাঝারি থেকে চরম খরা (বিশ্ব আবহাওয়া সংস্থার শ্রেণি)', en: '−1 or below = moderately to extremely dry (WMO classes)' } },
  { key: 'seedRain', group: 'drought', dir: -1, unit: 'mm', hazard: (v, n) => v < 0.5 * n,
    bn: 'রোপণের আগের ৩০ দিনের বৃষ্টি', en: 'Rain in the 30 days before transplanting',
    rule: { bn: 'স্বাভাবিকের অর্ধেকের কম = জমি তৈরি আর রোপণে পানির টান', en: 'Under half of normal = too little water to puddle and transplant' } },
  { key: 'drySpell', group: 'drought', dir: 1, unit: 'days', hazard: (v) => v >= 15, imerg: true,
    bn: 'কুশি গজানোর সময়ে সবচেয়ে লম্বা শুকনো টানা (১ মিমির কম বৃষ্টি)', en: 'Longest dry spell while tillering (days under 1 mm)',
    rule: { bn: '১৫ দিন বা বেশি = বৃষ্টিনির্ভর আমনে খরার চাপ', en: '15 days or more = drought stress on rainfed Aman' } },
  // No hazard line: this window falls after the monsoon withdraws, when long dry spells are the norm and the harm
  // depends on the soil water left (high in floodplains, low on the Barind); it is shown against its own normal.
  { key: 'lateDry', group: 'drought', dir: 1, unit: 'days', hazard: null, imerg: true,
    bn: 'ফুল ও দানা গঠনের সময়ে সবচেয়ে লম্বা শুকনো টানা', en: 'Longest dry spell while flowering and filling grain',
    rule: { bn: 'বর্ষা চলে যাওয়ার পর লম্বা শুকনো টানা স্বাভাবিক; ক্ষতি নির্ভর করে মাটিতে কতটা পানি আছে তার ওপর (বরেন্দ্রে কম, নদীর পলিতে বেশি)', en: 'Long dry spells are normal once the monsoon withdraws; the harm depends on the water left in the soil (little on the Barind, more on floodplains)' } },
  { key: 'lateRain', group: 'drought', dir: -1, unit: 'mm', hazard: (v, n) => v < 0.5 * n,
    bn: 'ফুল আর দানা গঠনের সময়ের বৃষ্টি', en: 'Rain while flowering and filling grain',
    rule: { bn: 'স্বাভাবিকের অর্ধেকের কম = শেষ মৌসুমের খরা, চিটা বাড়ে', en: 'Under half of normal = terminal drought, more empty grains' } },
  { key: 'heat', group: 'heat', dir: 1, unit: 'days', hazard: (v) => v >= 5,
    bn: 'ফুল আসার সময়ে ৩৫° সেলসিয়াস বা বেশি গরম দিন', en: 'Days at 35 °C or more while flowering',
    rule: { bn: '৩৫°-এর ওপরে ৫ দিন ফুলে পরাগ নষ্ট করে, ধান চিটা হয় (জগদীশ ও অন্যান্য ২০০৭)', en: 'Five days above 35 °C at flowering kill pollen and leave empty grains (Jagadish et al. 2007)' } },
  { key: 'veryHeavy', group: 'flood', dir: 1, unit: 'days', hazard: (v) => v >= 1,
    bn: 'অতি ভারী বৃষ্টির দিন (৮৯ মিমি বা বেশি, জুন–সেপ্টেম্বর)', en: 'Very heavy rain days (89 mm or more, June–September)',
    rule: { bn: 'আবহাওয়া অধিদপ্তরের শ্রেণিতে এক দিনে ৮৯ মিমি বা বেশি = অতি ভারী বৃষ্টি; এমন একটি দিনই চারা ডুবিয়ে দিতে পারে', en: 'Bangladesh Meteorological Department: 89 mm or more in a day is very heavy rain; one such day can drown young plants' } },
  { key: 'heavy', group: 'flood', dir: 1, unit: 'days', hazard: null,
    bn: 'ভারী বৃষ্টির দিন (৪৪ মিমি বা বেশি, জুন–সেপ্টেম্বর)', en: 'Heavy-rain days (44 mm or more, June–September)',
    rule: { bn: 'আবহাওয়া অধিদপ্তরের শ্রেণিতে ৪৪–৮৮ মিমি ভারী; বর্ষায় কয়েকটি এমন দিন স্বাভাবিক', en: 'Bangladesh Meteorological Department: 44–88 mm is heavy; a few such days are normal in the monsoon' } },
  { key: 'rx5', group: 'flood', dir: 1, unit: 'mm', hazard: (v, n, p90) => v >= p90,
    bn: 'সবচেয়ে ভেজা টানা ৫ দিনের বৃষ্টি (Rx5day)', en: 'Wettest 5 days in a row (Rx5day)',
    rule: { bn: '২০০১–২০২৫-এর ওপরের ১০%-এ পড়লে = জলাবদ্ধতা আর ফ্ল্যাশ বন্যার ঝুঁকি', en: 'In the top 10% of 2001–2025 = waterlogging and flash-flood risk' } },
  { key: 'water', group: 'flood', dir: 1, unit: '%', hazard: (v) => v >= 30, radar: true,
    bn: 'রাডারে পানিতে ডোবা নমুনা জমি (মৌসুমের সর্বোচ্চ)', en: 'Sample fields under water on radar (season peak)',
    rule: { bn: 'একই পাসে ৩০% বা বেশি জমি −২০ ডিবির নিচে = এলাকাজুড়ে পানি জমা', en: '30% or more of fields below −20 dB on one pass = widespread standing water' } },
  { key: 'cold', group: 'cold', dir: 1, unit: 'days', hazard: (v) => v >= 7,
    bn: 'ফুল আসার সময়ে গড় তাপমাত্রা ২০° সেলসিয়াসের নিচে', en: 'Days with mean below 20 °C while flowering',
    rule: { bn: 'এক সপ্তাহ ২০°-এর নিচে থাকলে ফুলে চিটা হয় (বোরোর গবেষণা থেকে নেওয়া; আমনের নিজস্ব সীমা নিশ্চিত নয়)', en: 'A week below 20 °C sterilises flowers (taken from Boro research; no confirmed Aman threshold)' } },
];

async function radarWater(id) {
  // Peak share of the 36 sample fields reading like open water on one pass, July–September, per year (raw VH, no orbit shift).
  const out = {};
  const dir = path.join(REPO, '.cache', 'data', 'aman', 'items');
  if (!existsSync(dir)) return out;
  for (const f of await readdir(dir)) {
    const m = f.match(new RegExp(`^${id}-(\\d{4})-`));
    if (!m) continue;
    const y = +m[1];
    const items = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
    const byPass = new Map();
    for (const it of items) {
      const doy = doyOf(y, +it.dt.slice(5, 7), +it.dt.slice(8, 10));
      if (doy < doyOf(y, 7, 1) || doy > doyOf(y, 9, 30)) continue;
      const file = path.join(REPO, '.cache', 'data', 'aman', 'vh', id, `${it.id}.json`);
      if (!existsSync(file)) continue;
      const { vals } = JSON.parse(await readFile(file, 'utf8'));
      const k = `${it.dt.slice(0, 10)}|${it.rel}`;
      const prev = byPass.get(k);
      byPass.set(k, prev ? prev.map((v, j) => v ?? vals[j]) : [...vals]);
    }
    let peak = null, peakDate = null;
    for (const [k, vals] of byPass) {
      const v = vals.filter((x) => x !== null);
      if (v.length < 24) continue;
      const share = (v.filter((x) => x < WATER_DB).length / v.length) * 100;
      if (peak === null || share > peak) { peak = share; peakDate = k.slice(0, 10); }
    }
    out[y] = peak === null ? null : { v: Math.round(peak), date: peakDate };
  }
  return out;
}

const AMAN = JSON.parse(await readFile(path.join(REPO, 'src', 'data', 'radar', 'aman_radar.json'), 'utf8'));
const row = (id) => Object.values(AMAN.districts).flatMap((d) => d.upazilas).find((u) => u.id === id);
const result = { generated: new Date().toISOString().slice(0, 10), refYears: [FROM, REF_TO], waterDb: WATER_DB, indices: INDICES.map(({ hazard, ...m }) => ({ ...m, hasHazard: !!hazard })), upazilas: {} };

for (const id of UPAZILAS) {
  const cl = await climate(id);
  const T = row(id).transplantNormal; // measured usual transplanting day of year
  const last = +cl.end.slice(0, 4);
  const water = await radarWater(id);
  const years = {};
  for (let y = FROM; y <= last; y++) {
    const p = (a, b) => win(cl, 'prec', y, a, b);
    const jjas = p(doyOf(y, 6, 1), doyOf(y, 9, 30));
    const flowerT = (() => { const a = win(cl, 'tmax', y, T + 55, T + 85), b = win(cl, 'tmin', y, T + 55, T + 85); return a && b ? a.map((x, i) => ({ tmax: x, tmean: (x + b[i]) / 2 })) : null; })();
    years[y] = {
      jjas: sum(jjas),
      seedRain: sum(p(T - 30, T - 1)),
      // Dry spells from satellite rain (IMERG): the POWER model rain drizzles on too many days to count dry days well.
      drySpell: longestRun(win(cl, 'prec_imerg', y, T, T + 55), (x) => x < 1),
      lateDry: longestRun(win(cl, 'prec_imerg', y, T + 55, T + 95), (x) => x < 1),
      lateRain: sum(p(T + 55, T + 95)),
      heat: flowerT ? flowerT.filter((d) => d.tmax >= 35).length : null,
      cold: flowerT ? flowerT.filter((d) => d.tmean < 20).length : null,
      heavy: count(jjas, (x) => x >= 44),
      veryHeavy: count(jjas, (x) => x >= 89),
      rx1: jjas ? Math.max(...jjas) : null,
      rx5: maxRoll(jjas, 5),
      water: water[y]?.v ?? null, waterDate: water[y]?.date ?? null,
    };
  }
  // SPI of June–September rain against the gamma fit of 2001–2025.
  const ref = Object.entries(years).filter(([y, v]) => +y <= REF_TO && v.jjas > 0).map(([, v]) => v.jjas);
  const fit = gammaFit(ref);
  for (const v of Object.values(years)) v.spi = v.jjas ? Math.round(spiOf(fit, v.jjas) * 100) / 100 : null;

  const stats = {};
  const ps = [];
  for (const m of INDICES) {
    const ser = Object.entries(years).filter(([y, v]) => +y <= REF_TO && v[m.key] !== null).map(([y, v]) => [+y, v[m.key]]);
    const vals = ser.map(([, v]) => v);
    const normal = median(vals);
    const sorted = [...vals].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
    const hits = m.hazard ? ser.filter(([, v]) => m.hazard(v, normal, p90)).map(([y]) => y) : [];
    const mk = ser.length >= 8 ? mannKendall(vals) : { p: 1, S: 0 };
    const sen = ser.length >= 8 ? senSlope(ser.map(([y]) => y), vals) : { slope: 0 };
    stats[m.key] = { normal: round1(normal), p90: round1(p90), n: ser.length, hazardYears: hits, freq: m.hazard && ser.length ? Math.round((hits.length / ser.length) * 100) : null,
      perDecade: round1(sen.slope * 10), p: Math.round(mk.p * 1e4) / 1e4, from: ser[0]?.[0] ?? null,
      latest: years[last]?.[m.key] ?? null, latestHazard: !m.hazard || years[last]?.[m.key] === null || years[last]?.[m.key] === undefined ? null : m.hazard(years[last][m.key], normal, p90) };
    ps.push(mk.p);
  }
  const bh = benjaminiHochberg(ps, 0.1);
  INDICES.forEach((m, i) => { stats[m.key].q = Math.round(bh.adjusted[i] * 1e4) / 1e4; stats[m.key].significant = !!bh.significant[i]; });

  result.upazilas[id] = {
    transplantDoy: T, climate: { lat: cl.prov.lat, lon: cl.prov.lon, end: cl.end, dataset: cl.prov.dataset }, spiFit: { a: Math.round(fit.a * 1000) / 1000, b: Math.round(fit.b * 10) / 10 },
    years: Object.fromEntries(Object.entries(years).map(([y, v]) => [y, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'number' ? round1(x) : x]))])),
    stats,
  };
  console.log(`  ${id}: T=${T}; ` + INDICES.map((m) => `${m.key} ${stats[m.key].freq}%${stats[m.key].significant ? '*' : ''}`).join(', '));
}
await writeFile(path.join(REPO, 'src', 'data', 'radar', 'aman_hazards.json'), JSON.stringify(result));
console.log('wrote src/data/radar/aman_hazards.json');
