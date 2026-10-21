// Seven Divisions: the mission engine behind the division farmer stories. [REAL weather in, RULE outcomes]
//
// Each mission is one farm with two or three plots in a real upazila. The player picks varieties, dates and practices;
// the season is then replayed through a REAL past year of that place's NASA data (stories_climate.json: NASA POWER
// temperature, rain and humidity; NASA/JAXA GPM IMERG rain), or through all 25 years at once. The hazards come from
// the data, with open rules checked against what is known:
//   Sylhet     flash flood: the first 48 hours with ≥120 mm of IMERG rain at Sohra (Cherrapunji), 1 March–31 May.
//              In 2001–2025 this falls on 14 Apr 2004, 30 Mar 2010, 31 Mar 2017 and 15 Apr 2022, the four big haor
//              flash floods of those years. Neck-blast weather: ≥4 days with Tmin 16–24 °C and RH ≥80% at heading.
//   Rangpur    late-blight spell: ≥3 days running with RH ≥80%, Tmin ≥7 °C and Tmax ≤24 °C (20 Dec–10 Feb), a
//              daily-data version of the blight weather rules (fog keeps leaves wet); cold-wave days by BMD bands.
//   Khulna     dry-season salt: soil EC rises with the running water deficit (Hargreaves ET₀ − rain) from mid-November,
//              set so a bare field in a median year reaches the story's 12 dS/m by mid-April; straw mulch cuts the
//              rise (less evaporation pulling salt up), brackish river irrigation adds salt. Yield: Maas–Hoffman,
//              FAO Irrigation and Drainage Paper 29/61 thresholds and slopes.
//   Barishal   spring tides (kotal): the moon's age from the mean synodic month, 0–2 days after new and full moon;
//              a submergence day is a spring-tide day with ≥50 mm of rain over three days (Aug–Oct). Stem-borer year:
//              ≥40 humid warm nights (RH ≥85%, Tmin ≥24 °C) in Sep–Oct. Mungbean: its own rules in crops.js.
//   Chattogram October cloudburst: ≥150 mm of IMERG rain in three days, 1 Oct–15 Nov. Pod-borer year: ≥15 days with
//              Tmin ≥18 °C and RH ≥75% at flowering (15 Nov–15 Jan).
// What each choice does to yield is a STARTING VALUE from the extension literature, not a measurement, and is labelled
// so on the page. The score follows the FieldShift Score: 0.25 yield + 0.20 soil + 0.20 resilience + 0.20 IPM +
// 0.15 market, −15 for blind spraying, ×1.1 for acting on a FieldShift alert; and four Danger Ends.
import { hargreaves } from './agroclimate.js';
import { ROTATION_CROPS } from './crops.js';

export const YEARS = Array.from({ length: 25 }, (_, i) => 2001 + i);
const T0 = Date.UTC(2001, 0, 1);
const DAYMS = 864e5;
const ix = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - T0) / DAYMS);
const dateOf = (i) => T0 + i * DAYMS;
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const L = (bn, en) => ({ bn, en });

// ---- shared science ----
// First index from a..b where an n-day IMERG sum reaches thr.
function firstBurst(arr, a, b, n, thr) {
  for (let i = a; i <= b; i++) { let s = 0; for (let k = 0; k < n; k++) s += arr[i + k] ?? 0; if (s >= thr) return { i, mm: Math.round(s) }; }
  return null;
}
const countDays = (pl, a, b, f) => { let c = 0; for (let i = a; i <= b; i++) if (pl.tmax[i] != null && f(pl, i)) c++; return c; };
const longestRun = (pl, a, b, f) => { let c = 0, m = 0; for (let i = a; i <= b; i++) { if (pl.tmax[i] != null && f(pl, i)) m = Math.max(m, ++c); else c = 0; } return m; };

// The moon's age in days (0 = new moon), from the mean synodic month and the new moon of 6 Jan 2000, 18:14 UTC.
export const SYNODIC = 29.530588;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
export const moonAge = (t) => (((t - NEW_MOON) / DAYMS) % SYNODIC + SYNODIC) % SYNODIC;
// Spring tides come a day or two after new and full moon (the "age of the tide").
export const isKotal = (t) => { const a = moonAge(t); return (a >= 0.5 && a <= 2.5) || (a >= 15.3 && a <= 17.3); };
export const isDark = (t) => { const a = moonAge(t); return a >= 26.5 || a <= 3; };

// Maas–Hoffman relative yield (%) at a root-zone ECe (dS/m). FAO-29 Table A1.1; BRRI salt-tolerant rice from trials.
export const SALT = {
  boro: { t: 3.0, b: 12, src: 'FAO-29: rice, paddy' },
  dhan67: { t: 6.0, b: 8, src: 'BRRI dhan67: 3.0–6.1 t/ha at 4–12 dS/m in 2012–22 trials (Bangladesh Rice J.); fitted, a starting value' },
  dhan97: { t: 8.0, b: 7, src: 'BRRI dhan97: strong tolerance at 8–12 dS/m at reproductive stage (BINA screening); fitted, a starting value' },
  sunflower: { t: 4.8, b: 5.0, src: 'FAO-29: sunflower' },
  sesame: { t: 1.0, b: 19, src: 'FAO-29 rates sesame sensitive without numbers; bean (1.0, 19) stands in' },
  watermelon: { t: 2.5, b: 13, src: 'FAO-29 rates watermelon moderately sensitive without numbers; cucumber (2.5, 13) stands in' },
};
export const relYield = (crop, ec) => { const s = SALT[crop]; return s ? clamp(100 - s.b * Math.max(0, ec - s.t)) : 100; };

// Dolomite for an acid soil, t/ha: BARC Fertilizer Recommendation Guide style, 1 t/ha on light soil and 2 t/ha on
// heavy soil where pH < 5.5, half as much again below pH 4.8, at most 3 t/ha, once in three to four years.
export function limeDose(ph, clay = 25) {
  if (ph == null || ph >= 5.5) return 0;
  return Math.min(3, (clay >= 30 ? 2 : 1) * (ph < 4.8 ? 1.5 : 1));
}
export const T_HA_TO_KG_BIGHA = 133.6;

// The FieldShift Score.
export const WEIGHTS = { Y: 0.25, E: 0.20, C: 0.20, B: 0.20, M: 0.15 };
export function scoreOf(p, { blind = false, bonus = false } = {}) {
  const base = Object.entries(WEIGHTS).reduce((a, [k, w]) => a + w * clamp(p[k]), 0);
  return clamp((base - (blind ? 15 : 0)) * (bonus ? 1.1 : 1), 0, 110); // 100 points, and the ×1.1 bonus on top
}

export const DANGERS = {
  1: { icon: 'skull', title: L('বিষাক্ত মাটি ধসে পড়া', 'Toxic soil collapse'), text: L('নিরাপদ মাত্রার তিন গুণের বেশি ইউরিয়া আর অন্ধভাবে কীটনাশক, অথবা চুন ছাড়া pH ৪-এর নিচে: মাটির উপকারী জীবাণু মরে যায়, পোকা ওষুধ সয়ে নেয়, দুই মৌসুম জমি বন্ধ্যা।', 'Urea and pesticide past three times the safe dose, or pH under 4 with no lime: the soil’s useful microbes die, pests stop responding, and the land is barren for two seasons.') },
  2: { icon: 'salt', title: L('লবণে মরুভূমি', 'Osmotic desertification'), text: L('ফেব্রুয়ারি–এপ্রিলে খালি মাটি আর নোনা নদীর পানিতে সেচ: মাটির লবণ ১৬ dS/m ছাড়িয়ে যায়, ফসল পুরো ঝলসে মরে।', 'Bare soil in February–April and brackish river water: soil salt passes 16 dS/m and the crop burns off completely.') },
  3: { icon: 'flood', title: L('ডুবে যাওয়া ফসল', 'The submerged harvest'), text: L('পাহাড়ি ঢল, জোয়ার বা মেঘভাঙা বৃষ্টি এল ফসল তোলার আগেই; সতর্কতার পরও না সরে বা না কেটে পুরো ফসল পানির নিচে।', 'The flash flood, tide or cloudburst came before the harvest; with no drain, early harvest or tolerant seed, the crop went under.') },
  4: { icon: 'debt', title: L('দালালের ঋণের ফাঁদ', 'The syndicate debt trap'), text: L('কম ফলন, ভেজা বা রোগা ফসল, আর তাড়াহুড়ায় ফড়িয়ার কাছে খরচের চেয়ে অনেক কমে বিক্রি: ঋণ শোধ হয় না, জমির দলিল বন্ধক।', 'A poor, wet or diseased crop panic-sold to middlemen far below its cost: the loan cannot be paid and the land deed is pledged.') },
};

// ---- the five missions ----
const opt = (id, bn, en, note) => ({ id, label: L(bn, en), note: note ? L(...note) : null });
const fmt = (i) => dateOf(i);

const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const sylhet = {
  id: 'sylhet', place: 'gowainghat', years: span(2002, 2025),
  plots: [{ id: 'A', area: 1.4, name: L('হাওরের বোরো জমি', 'Haor Boro plot') }, { id: 'B', area: 0.7, name: L('টিলার কমলা-জাতীয় বাগান', 'Tila citrus garden') }],
  choices: [
    { id: 'variety', plot: 'A', label: L('বোরো ধানের জাত', 'Boro variety'), options: [opt('dhan29', 'ব্রি ধান২৯ (১৬০ দিন)', 'BRRI dhan29 (160 days)'), opt('dhan28', 'ব্রি ধান২৮ (১৪০ দিন)', 'BRRI dhan28 (140 days)'), opt('dhan88', 'ব্রি ধান৮৮ (১৪২ দিন)', 'BRRI dhan88 (142 days)'), opt('bb100', 'বঙ্গবন্ধু ধান১০০ (১৪৮ দিন)', 'Bangabandhu dhan100 (148 days)')] },
    { id: 'sow', plot: 'A', label: L('বীজতলায় বীজ বোনা', 'Seedbed sowing'), options: [opt('nov20', '২০ নভেম্বর', '20 Nov'), opt('dec01', '১ ডিসেম্বর', '1 Dec'), opt('dec10', '১০ ডিসেম্বর', '10 Dec')] },
    { id: 'alert', plot: 'A', label: L('উজানের বৃষ্টির সতর্কতা এলে', 'When the upstream-rain alert comes'), options: [opt('ignore', 'অপেক্ষা, পাকলে হাতে কাটব', 'Wait, cut by hand when ripe'), opt('harvester', 'কর্মকর্তাকে বলে কম্বাইন হারভেস্টার আনা', 'Ask the officer for a combine harvester')] },
    { id: 'blast', plot: 'A', label: L('ব্লাস্ট রোগ', 'Blast'), options: [opt('none', 'কিছু না', 'Nothing'), opt('ipm', 'ব্লাস্টের আবহাওয়া এলে শীষ বের হওয়ার আগে ছত্রাকনাশক', 'Fungicide at booting when blast weather comes'), opt('blind', 'প্রতি সপ্তাহে স্প্রে', 'Spray every week')] },
    { id: 'lime', plot: 'B', label: L('টিলার টক মাটি', 'The acid tila soil'), options: [opt('none', 'চুন নয়', 'No lime'), opt('calc', 'হিসাব করে ডলোচুন', 'Dolomite, as calculated'), opt('over', 'চোখের আন্দাজে অনেক চুন', 'Plenty of lime, by eye')] },
    { id: 'canker', plot: 'B', label: L('সাতকরা-লেবুর ক্যাংকার', 'Citrus canker'), options: [opt('home', 'ছাই আর কেরোসিন', 'Ash and kerosene'), opt('bordeaux', 'রোগা ডাল ছেঁটে বোর্দো পেস্ট', 'Prune and Bordeaux paste')] },
    { id: 'urea', plot: 'farm', label: L('ইউরিয়া', 'Urea'), options: [opt('heavy', 'বেশি দিলে বেশি ফলন', 'More is better'), opt('balanced', 'মাটি পরীক্ষা অনুযায়ী', 'By soil test')] },
    { id: 'market', plot: 'farm', label: L('বিক্রি', 'Selling'), options: [opt('door', 'বাড়িতে আসা ফড়িয়ার কাছে', 'To the middleman at the door'), opt('coop', 'নারী সমবায় দিয়ে সিলেট শহরে', 'Through the women’s cooperative, in Sylhet city')] },
  ],
  best: { variety: 'dhan88', sow: 'nov20', alert: 'harvester', blast: 'ipm', lime: 'calc', canker: 'bordeaux', urea: 'balanced', market: 'coop' },
  start: { variety: 'dhan29', sow: 'dec10', alert: 'ignore', blast: 'none', lime: 'none', canker: 'home', urea: 'heavy', market: 'door' },
  inputs: { ph: { label: L('টিলার মাটির pH (মাটি পরীক্ষা)', 'Tila soil pH (soil test)'), min: 3.8, max: 7, step: 0.1, value: 4.3 } },
  VAR: { dhan29: { days: 160, pot: 7.5, blast: 0.65 }, dhan28: { days: 140, pot: 6.0, blast: 0.65 }, dhan88: { days: 142, pot: 7.0, blast: 0.85 }, bb100: { days: 148, pot: 7.7, blast: 0.85 } },
  hazard(D, y) {
    const up = D.places.sohra.imerg;
    const f = firstBurst(up, ix(y, 3, 1), ix(y, 5, 31) - 1, 2, 120);
    return { flood: f ? { i: f.i, mm: f.mm } : null };
  },
  run(D, c, y, inp = {}) {
    const G = D.places.gowainghat, v = this.VAR[c.variety], ev = [];
    const sowI = ix(y - 1, ...({ nov20: [11, 20], dec01: [12, 1], dec10: [12, 10] }[c.sow]));
    const mat = sowI + v.days;
    const { flood } = this.hazard(D, y);
    ev.push({ i: sowI, k: 'info', t: L(`বীজতলায় ${c.variety === 'bb100' ? 'বঙ্গবন্ধু ধান১০০' : `ব্রি ${c.variety.replace('dhan', 'ধান')}`}`, `Seedbed sown: ${c.variety}`) });
    // Neck blast at heading (about 40 to 20 days before maturity).
    const bd = countDays(G, mat - 40, mat - 20, (p, i) => p.tmin[i] >= 16 && p.tmin[i] <= 24 && p.rh[i] >= 80);
    let yA = v.pot;
    if (bd >= 4) {
      const f = c.blast === 'none' ? v.blast : 0.95;
      yA *= f;
      ev.push({ i: mat - 30, k: c.blast === 'none' ? 'bad' : 'good', t: c.blast === 'none' ? L(`শীষ বের হওয়ার সময় ${bd} দিন ব্লাস্টের আবহাওয়া (ঠান্ডা রাত, ভেজা বাতাস): শীষ মরে সাদা`, `${bd} days of blast weather at heading (cool nights, damp air): white dead panicles`) : L(`${bd} দিন ব্লাস্টের আবহাওয়া, আগেভাগে ছত্রাকনাশকে শীষ রক্ষা`, `${bd} days of blast weather; the early fungicide saved the panicles`) });
    }
    let wiped = false;
    if (flood && flood.i < mat) {
      ev.push({ i: flood.i, k: 'hazard', t: L(`সোহরায় (চেরাপুঞ্জি) ৪৮ ঘণ্টায় ${flood.mm} মিমি বৃষ্টি: পাহাড়ি ঢল নামছে`, `${flood.mm} mm in 48 hours at Sohra (Cherrapunji): a flash flood is coming down`) });
      const early = mat - flood.i; // days the crop still needed
      if (early <= 15 && c.alert === 'harvester') { yA *= 0.9; ev.push({ i: flood.i, k: 'good', t: L(`ধান ${early} দিন বাকি থাকতেই কম্বাইন হারভেস্টারে কাটা, পানি আসার আগে`, `Cut by combine harvester ${early} days early, before the water`) }); }
      else if (early <= 15) { yA *= 0.25; ev.push({ i: flood.i, k: 'bad', t: L('কাটার লোক পাওয়া গেল না, বেশির ভাগ ধান পানির নিচে', 'No harvesting hands to be had; most of the rice went under') }); }
      else { yA = 0; wiped = true; ev.push({ i: flood.i, k: 'bad', t: L(`ধান তখনো কাঁচা (${early} দিন বাকি): পুরো জমি ডুবে গেল`, `The rice was still green (${early} days to go): the whole plot went under`) }); }
    } else {
      ev.push({ i: mat, k: 'good', t: flood ? L(`পাহাড়ি ঢলের (${flood.mm} মিমি) আগেই ধান কাটা শেষ`, `All cut before the flash flood (${flood.mm} mm)`) : L('এ বছর বড় পাহাড়ি ঢল আসেনি; ধান পেকে কাটা হলো', 'No big flash flood this year; the rice ripened and was cut') });
    }
    if (c.urea === 'heavy') yA *= 0.95; // lodging and blast both rise with too much N
    const ph = inp.ph ?? 4.3;
    let yB = c.lime === 'calc' ? 0.95 : c.lime === 'over' ? 0.8 : ph < 4.5 ? 0.5 : ph < 5.5 ? 0.75 : 1;
    yB *= c.canker === 'bordeaux' ? 1 : 0.6;
    const relA = (yA / 7.7) * 100, relB = yB * 100;
    const Y = (relA * 1.4 + relB * 0.7) / 2.1;
    const dose = limeDose(ph, G.soil?.clay);
    if (c.lime === 'calc' && dose) ev.push({ i: ix(y - 1, 11, 1), k: 'good', t: L(`pH ${ph}: হেক্টরে ${dose} টন ডলোচুন (বিঘায় ${Math.round(dose * T_HA_TO_KG_BIGHA)} কেজি)`, `pH ${ph}: ${dose} t/ha of dolomite (${Math.round(dose * T_HA_TO_KG_BIGHA)} kg a bigha)`) });
    const E = clamp(60 + (c.lime === 'calc' ? 30 : c.lime === 'over' ? -20 : ph < 5.5 ? -25 : 0) + (c.urea === 'heavy' ? -30 : 10) + (c.blast === 'blind' ? -15 : 0));
    const C = clamp(30 + (c.variety === 'dhan29' ? 0 : 25) + ({ nov20: 10, dec01: 5, dec10: 0 }[c.sow]) + (c.alert === 'harvester' ? 30 : 0) - (wiped ? 30 : 0));
    const B = clamp(((c.blast === 'ipm' ? 95 : c.blast === 'none' ? 55 : 10) + (c.canker === 'bordeaux' ? 90 : 40)) / 2);
    const M = c.market === 'coop' ? clamp(55 + Y * 0.4) : clamp(15 + Y * 0.2);
    let danger = null;
    if ((ph < 4.0 && c.lime === 'none') || (c.urea === 'heavy' && c.blast === 'blind')) danger = 1;
    if (wiped) danger = 3;
    if (!danger && c.market === 'door' && Y < 35) danger = 4;
    return finish({ ev, plots: [{ id: 'A', rel: relA }, { id: 'B', rel: relB }], P: { Y, E, C, B, M }, blind: c.blast === 'blind', bonus: c.alert === 'harvester' && c.blast === 'ipm', danger });
  },
};

const rangpur = {
  id: 'rangpur', place: 'gangachara', years: span(2002, 2025),
  plots: [{ id: 'A', area: 1.6, name: L('মূল জমির আলু', 'Mainland potato plot') }, { id: 'B', area: 1.2, name: L('তিস্তার চরের বালু জমি', 'Teesta char sand plot') }],
  choices: [
    { id: 'seed', plot: 'A', label: L('বীজ আলু', 'Seed tubers'), options: [opt('local', 'ঘরে রাখা নিজের বীজ', 'Own seed, stored at home'), opt('certified', 'হিমাগারের প্রত্যয়িত বীজ', 'Certified cold-stored seed')] },
    { id: 'irrigation', plot: 'A', label: L('কুয়াশার আগে সেচ', 'Irrigating before fog'), options: [opt('flood', 'নালা ভরে সেচ, যখন খুশি', 'Flood the furrows whenever'), opt('stop', 'ব্লাইট সতর্কতা এলে সেচ বন্ধ', 'Stop when the blight alert comes')] },
    { id: 'fungicide', plot: 'A', label: L('লেট ব্লাইট (মড়ক)', 'Late blight'), options: [opt('after', 'কালো দাগ দেখলে তবে স্প্রে', 'Spray once black spots show'), opt('alert', 'সতর্কতায় আগেভাগে ম্যানকোজেব, দরকারে মেটালাক্সিল', 'Mancozeb ahead on the alert, metalaxyl if needed'), opt('blind', 'প্রতি সপ্তাহে কড়া ওষুধ', 'Strong spray every week')] },
    { id: 'harvest', plot: 'A', label: L('আলু তোলা', 'Lifting the potatoes'), options: [opt('panic', 'ভয়ে কাঁচা অবস্থায় তোলা', 'Lift green, in a panic'), opt('cure', 'গাছ কেটে ১০ দিন পর, খোসা শক্ত হলে', 'Cut haulms, lift 10 days later once skins set')] },
    { id: 'char', plot: 'B', label: L('চরের বালুতে', 'On the char sand'), options: [opt('maize', 'সমান জমিতে ভুট্টা', 'Maize on the flat'), opt('pit', 'গর্তে কম্পোস্ট-মাটি দিয়ে মিষ্টিকুমড়া', 'Pumpkin in compost-and-clay pits')] },
    { id: 'urea', plot: 'farm', label: L('ইউরিয়া', 'Urea'), options: [opt('heavy', 'বেশি দিলে বেশি ফলন', 'More is better'), opt('balanced', 'মাটি পরীক্ষা অনুযায়ী', 'By soil test')] },
    { id: 'market', plot: 'farm', label: L('বিক্রি', 'Selling'), options: [opt('gate', 'তোলার দিনই জমির পাশে', 'At the field gate on lifting day'), opt('store', 'সমবায়ের শীতল ঘরে রেখে পরে', 'Kept in the cooperative’s cool chamber, sold later')] },
  ],
  best: { seed: 'certified', irrigation: 'stop', fungicide: 'alert', harvest: 'cure', char: 'pit', urea: 'balanced', market: 'store' },
  start: { seed: 'local', irrigation: 'flood', fungicide: 'after', harvest: 'panic', char: 'maize', urea: 'heavy', market: 'gate' },
  hazard(D, y) {
    const R = D.places.gangachara, a = ix(y - 1, 12, 20), b = ix(y, 2, 10);
    const f = (p, i) => p.rh[i] >= 80 && p.tmin[i] >= 7 && p.tmax[i] <= 24;
    let run = 0, best = 0, at = null;
    for (let i = a; i <= b; i++) { if (R.tmax[i] != null && f(R, i)) { run++; if (run > best) { best = run; at = i - run + 1; } } else run = 0; }
    return { run: best, at, cold: countDays(R, ix(y - 1, 12, 1), ix(y, 2, 28), (p, i) => p.tmin[i] <= 10), severe: countDays(R, ix(y - 1, 12, 1), ix(y, 2, 28), (p, i) => p.tmin[i] <= 6) };
  },
  run(D, c, y) {
    const h = this.hazard(D, y), ev = [];
    ev.push({ i: ix(y - 1, 11, 20), k: 'info', t: L(c.seed === 'certified' ? 'প্রত্যয়িত বীজ আলু লাগানো' : 'ঘরের পুরোনো বীজ আলু লাগানো', c.seed === 'certified' ? 'Certified seed planted' : 'Home-kept seed planted') });
    if (h.cold) ev.push({ i: ix(y, 1, 5), k: 'hazard', t: L(`শীতে ${h.cold} দিন রাতের তাপ ১০°-এর নিচে${h.severe ? `, ${h.severe} দিন ৬°-এর নিচে (তীব্র শৈত্যপ্রবাহ)` : ''}`, `${h.cold} winter nights under 10 °C${h.severe ? `, ${h.severe} under 6 °C (severe cold wave)` : ''}`) });
    const need = c.irrigation === 'flood' ? 2 : 3; // a soaked canopy under fog lets blight start sooner
    const blight = h.run >= need;
    let yA = c.seed === 'certified' ? 1 : 0.8;
    if (blight) {
      ev.push({ i: h.at, k: 'hazard', t: L(`টানা ${h.run} দিন কুয়াশা-ভেজা ঠান্ডা আবহাওয়া: লেট ব্লাইটের সময়`, `${h.run} days running of foggy, damp cold: late-blight weather`) });
      const f = c.fungicide === 'after' ? 0.35 : c.fungicide === 'alert' ? 0.92 : 0.9;
      yA *= f;
      ev.push({ i: h.at + 3, k: f < 0.5 ? 'bad' : 'good', t: f < 0.5 ? L('দাগ দেখার পর স্প্রে, ততদিনে পাতা কালো হয়ে পচে গেছে', 'Sprayed after the spots showed; by then the leaves had rotted black') : L('আগেভাগে ওষুধে গাছ সবুজ রইল, পাশের জমি কালো', 'Sprayed ahead: the plants stayed green while the next field went black') });
    } else ev.push({ i: ix(y, 1, 20), k: 'good', t: L('এ শীতে টানা ব্লাইটের আবহাওয়া হয়নি', 'No run of blight weather this winter') });
    if (c.urea === 'heavy') yA *= 0.95;
    const store = c.harvest === 'cure' ? 0.95 : 0.6; // thin skins rot in store (40% in the story)
    ev.push({ i: ix(y, 2, 25), k: c.harvest === 'cure' ? 'good' : 'bad', t: c.harvest === 'cure' ? L('খোসা শক্ত হওয়ার পর তোলা, ঘরে পচন কম', 'Lifted once skins set; little rot in store') : L('কাঁচা খোসা ছিলে গেল, দুই সপ্তাহে অনেক আলু পচল', 'Green skins peeled off; much of the crop rotted within two weeks') });
    const yB = c.char === 'pit' ? 0.85 : 0.45;
    ev.push({ i: ix(y - 1, 11, 25), k: c.char === 'pit' ? 'good' : 'bad', t: c.char === 'pit' ? L('চরের গর্তে কম্পোস্ট-মাটি ধরে রাখে পানি ও সার: মিষ্টিকুমড়া ভালো', 'Compost and clay in the char pits hold water and feed: the pumpkins thrive') : L('বালুর ভেতর দিয়ে পানি-সার নিচে চলে যায়, ভুট্টা ভালো হয়নি', 'Water and fertiliser run straight through the sand; the maize did badly') });
    const relA = yA * store * 100, relB = yB * 100;
    const Y = (relA * 1.6 + relB * 1.2) / 2.8;
    const E = clamp(60 + (c.urea === 'heavy' ? -30 : 10) + (c.fungicide === 'blind' ? -20 : 0) + (c.char === 'pit' ? 20 : -10));
    const C = clamp(30 + (c.irrigation === 'stop' ? 25 : 0) + (c.seed === 'certified' ? 15 : 0) + (c.harvest === 'cure' ? 15 : 0) + (c.char === 'pit' ? 15 : 0));
    const B = c.fungicide === 'alert' ? 95 : c.fungicide === 'after' ? 40 : 10;
    const M = c.market === 'store' ? clamp(55 + Y * 0.4) : clamp(10 + Y * 0.2);
    let danger = null;
    if (c.urea === 'heavy' && c.fungicide === 'blind') danger = 1;
    if (!danger && c.market === 'gate' && Y < 40) danger = 4;
    return finish({ ev, plots: [{ id: 'A', rel: relA }, { id: 'B', rel: relB }], P: { Y, E, C, B, M }, blind: c.fungicide === 'blind', bonus: c.irrigation === 'stop' && c.fungicide === 'alert', danger });
  },
};

const khulna = {
  id: 'khulna', place: 'dacope', years: span(2002, 2025),
  plots: [{ id: 'A', area: 1.8, name: L('পোল্ডারের ভেতরের জমি', 'Plot inside the polder') }, { id: 'B', area: 1.2, name: L('খালের পাশের মাঝারি নিচু জমি', 'Canal-side medium lowland') }],
  choices: [
    { id: 'cropA', plot: 'A', label: L('শুকনো মৌসুমের ফসল', 'Dry-season crop'), options: [opt('boro', 'সাধারণ বোরো (ব্রি ধান২৮)', 'Ordinary Boro (BRRI dhan28)'), opt('dhan67', 'লবণসহিষ্ণু ব্রি ধান৬৭', 'Salt-tolerant BRRI dhan67'), opt('dhan97', 'লবণসহিষ্ণু ব্রি ধান৯৭', 'Salt-tolerant BRRI dhan97'), opt('sunflower', 'সূর্যমুখী', 'Sunflower'), opt('fallow', 'পতিত', 'Fallow')] },
    { id: 'cropB', plot: 'B', label: L('খালপাড়ের জমিতে', 'On the canal-side plot'), options: [opt('sesame', 'ফেব্রুয়ারিতে তিল', 'Sesame in February'), opt('watermelon', 'তরমুজ', 'Watermelon'), opt('fallow', 'পতিত', 'Fallow')] },
    { id: 'beds', plot: 'B', label: L('বেড', 'Beds'), options: [opt('flat', 'সমান জমি', 'Flat'), opt('ridge', 'উঁচু আল-বেড, মালচ আর ড্রিপ', 'Raised ridges, mulch and drip')] },
    { id: 'cover', plot: 'farm', label: L('নভেম্বরের পর মাটি', 'Soil after November'), options: [opt('bare', 'খালি রোদে', 'Bare in the sun'), opt('mulch', 'খড়ের মালচে ঢাকা', 'Covered with straw mulch')] },
    { id: 'water', plot: 'farm', label: L('সেচের পানি', 'Irrigation water'), options: [opt('river', 'নদী-খালের নোনা পানি', 'Brackish river water'), opt('kuni', 'বর্ষায় কাটা মিঠা পানির কুনি পুকুর', 'A rain-fed freshwater kuni pond')] },
    { id: 'market', plot: 'farm', label: L('বিক্রি', 'Selling'), options: [opt('boat', 'নৌকায় চালনা বাজারে, সিন্ডিকেটের দামে', 'By boat to Chalna, at the syndicate’s price'), opt('direct', 'খুলনার পাইকারের সঙ্গে সরাসরি', 'Direct to a Khulna wholesaler')] },
  ],
  best: { cropA: 'dhan97', cropB: 'watermelon', beds: 'ridge', cover: 'mulch', water: 'kuni', market: 'direct' },
  start: { cropA: 'boro', cropB: 'sesame', beds: 'flat', cover: 'bare', water: 'river', market: 'boat' },
  inputs: { ec0: { label: L('বর্ষার পরে মাটির লবণ (EC মিটার, dS/m)', 'Soil salt after the monsoon (EC meter, dS/m)'), min: 0.5, max: 6, step: 0.5, value: 2 } },
  // Running water deficit from 15 Nov, mm, each day to 30 Apr.
  deficit(D, y) {
    const P = D.places.dacope, a = ix(y - 1, 11, 15), b = ix(y, 4, 30), out = [];
    let s = 0;
    for (let i = a; i <= b; i++) {
      const x = P.tmax[i], n = P.tmin[i], p = P.prec[i] ?? 0;
      if (x != null && n != null) s = Math.max(0, s + hargreaves(x, n, P.lat, dateOf(i)) - p * (p > 25 ? 2 : 1)); // a soaking rain also washes salt down
      out.push(s);
    }
    return { a, out };
  },
  kSalt(D) {
    if (this._k) return this._k;
    const v = YEARS.slice(1).map((y) => { const d = this.deficit(D, y); return d.out[ix(y, 4, 15) - d.a]; }).sort((p, q) => p - q);
    this._k = 10 / v[Math.floor(v.length / 2)]; // a bare field in a median year: 2 → 12 dS/m by mid-April
    return this._k;
  },
  ec(D, y, c, ec0 = 2) {
    const d = this.deficit(D, y), k = this.kSalt(D);
    const m = c.cover === 'mulch' ? 0.55 : 1, river = c.water === 'river' ? 1 : 0;
    return d.out.map((x, j) => ec0 + k * x * m + river * 5 * Math.max(0, (j - 60) / (d.out.length - 60))); // river water from mid-January
  },
  hazard(D, y) { const e = this.ec(D, y, { cover: 'bare', water: 'none' }); return { peak: Math.max(...e) }; },
  run(D, c, y, inp = {}) {
    const ev = [], e = this.ec(D, y, c, inp.ec0 ?? 2), d0 = ix(y - 1, 11, 15);
    const seg = (m1, d1, m2, d2) => { const a = ix(m1 > 6 ? y - 1 : y, m1, d1) - d0, b = ix(y, m2, d2) - d0; const s = e.slice(a, b + 1); return s.reduce((p, q) => p + q, 0) / s.length; };
    const peak = Math.max(...e), peakI = d0 + e.indexOf(peak);
    const ecA = seg(1, 15, 4, 15), ecB = seg(2, 1, 4, 30) * (c.beds === 'ridge' ? 0.6 : 1) * (c.water === 'kuni' && c.beds === 'ridge' ? 0.85 : 1);
    ev.push({ i: d0, k: c.cover === 'mulch' ? 'good' : 'info', t: c.cover === 'mulch' ? L('আমন কাটার পর খড়ের মালচ: রোদে পানি কম উড়বে, লবণ কম উঠবে', 'Straw mulch after the Aman: less water lost to the sun, less salt pulled up') : L('আমন কাটার পর মাটি খালি রোদে', 'Soil left bare after the Aman') });
    ev.push({ i: peakI, k: peak >= 12 ? 'hazard' : 'info', t: L(`শুকনো মৌসুমে মাটির লবণ সর্বোচ্চ ${peak.toFixed(1)} dS/m`, `Dry-season soil salt peaks at ${peak.toFixed(1)} dS/m`) });
    const relA = c.cropA === 'fallow' ? 0 : relYield(c.cropA, ecA);
    const relB = c.cropB === 'fallow' ? 0 : relYield(c.cropB, ecB);
    if (c.cropA !== 'fallow') ev.push({ i: ix(y, 4, 15), k: relA >= 60 ? 'good' : 'bad', t: L(`পোল্ডারের জমিতে গড় লবণ ${ecA.toFixed(1)} dS/m: ফলন সম্ভাব্যের ${Math.round(relA)}%`, `Mean salt ${ecA.toFixed(1)} dS/m in the polder plot: ${Math.round(relA)}% of potential yield`) });
    if (c.cropB !== 'fallow') ev.push({ i: ix(y, 4, 30), k: relB >= 60 ? 'good' : 'bad', t: L(`খালপাড়ের ${c.cropB === 'watermelon' ? 'তরমুজের' : 'তিলের'} শিকড়ে লবণ ${ecB.toFixed(1)} dS/m: ফলন ${Math.round(relB)}%`, `Salt at the ${c.cropB} roots ${ecB.toFixed(1)} dS/m: ${Math.round(relB)}% of potential`) });
    const Y = (relA * 1.8 + relB * 1.2) / 3;
    const E = clamp(40 + (c.cover === 'mulch' ? 35 : -10) + (c.water === 'kuni' ? 25 : -20));
    const C = clamp(25 + (['dhan67', 'dhan97', 'sunflower'].includes(c.cropA) ? 30 : 0) + (c.beds === 'ridge' ? 20 : 0) + (c.water === 'kuni' ? 25 : 0) - (c.cropA === 'fallow' && c.cropB === 'fallow' ? 20 : 0));
    const B = clamp(60 + (c.cover === 'mulch' ? 20 : 0) + (c.beds === 'ridge' ? 15 : 0)); // salt-stressed plants catch blight and fruit fly
    const M = c.market === 'direct' ? clamp(55 + Y * 0.4) : clamp(15 + Y * 0.2);
    let danger = null;
    if (c.cover === 'bare' && c.water === 'river' && peak >= 16) danger = 2;
    if (!danger && c.market === 'boat' && Y < 35 && (c.cropA !== 'fallow' || c.cropB !== 'fallow')) danger = 4;
    return finish({ ev, plots: [{ id: 'A', rel: relA }, { id: 'B', rel: relB }], P: { Y, E, C, B, M }, blind: false, bonus: c.cover === 'mulch' && c.water === 'kuni', danger, extra: { peak, ecA, ecB, ec: e } });
  },
};

const barishal = {
  id: 'barishal', place: 'bakerganj', years: span(2001, 2024),
  plots: [{ id: 'A', area: 1.5, name: L('জোয়ারের ধানজমি', 'Tidal paddy land') }, { id: 'B', area: 0.6, name: L('খালপাড়ের জলাবদ্ধ জমি', 'Waterlogged canal marsh') }, { id: 'C', area: 0.4, name: L('বাড়ির উঁচু জমি (পেয়ারা, মুগ)', 'Homestead highland (guava, mungbean)') }],
  choices: [
    { id: 'aman', plot: 'A', label: L('আমনের জাত', 'Aman variety'), options: [opt('hyv', 'খাটো উফশী জাত', 'A short HYV'), opt('local', 'লম্বা দেশি (লালমোটা)', 'Tall local (Lalmota)'), opt('dhan76', 'জোয়ারসহিষ্ণু লম্বা ব্রি ধান৭৬', 'Tall tidal BRRI dhan76'), opt('dhan52', 'ডুবসহিষ্ণু ব্রি ধান৫২', 'Submergence-tolerant BRRI dhan52')] },
    { id: 'borer', plot: 'A', label: L('মাজরা পোকা', 'Stem borer'), options: [opt('none', 'কিছু না', 'Nothing'), opt('spray', 'ওপরে কীটনাশক স্প্রে', 'Spray over the top'), opt('ipm', 'অন্ধকার রাতে আলোর ফাঁদ, পাখি বসার ডাল', 'Light traps on dark nights, bird perches')] },
    { id: 'marsh', plot: 'B', label: L('জলাবদ্ধ জমি', 'The marsh plot'), options: [opt('abandon', 'পতিত রাখা', 'Leave it'), opt('dhap', 'কচুরিপানার ভাসমান ধাপে ঢেঁড়স-লাউয়ের চারা', 'Floating hyacinth beds (dhap) for okra and gourd seedlings')] },
    { id: 'mungSow', plot: 'C', label: L('মুগ বোনা', 'Mungbean sowing'), options: [opt('jan20', '২০ জানুয়ারি', '20 Jan'), opt('feb10', '১০ ফেব্রুয়ারি', '10 Feb'), opt('mar10', '১০ মার্চ', '10 Mar')] },
    { id: 'mungVar', plot: 'C', label: L('মুগের জাত', 'Mungbean variety'), options: [opt('local', 'দেশি, ৩–৪ বারে তোলা', 'Local, 3–4 pickings'), opt('bari6', 'বারি মুগ-৬, একসঙ্গে পাকে', 'BARI Mung-6, ripens together')] },
    { id: 'market', plot: 'farm', label: L('বিক্রি', 'Selling'), options: [opt('arot', 'ভরা মৌসুমে আড়তদারের কাছে', 'To the commission agent at the glut'), opt('store', 'আর্দ্রতারোধী বস্তায় রেখে পরে', 'Kept in moisture-proof bags, sold later')] },
  ],
  best: { aman: 'dhan76', borer: 'ipm', marsh: 'dhap', mungSow: 'jan20', mungVar: 'bari6', market: 'store' },
  start: { aman: 'hyv', borer: 'spray', marsh: 'abandon', mungSow: 'mar10', mungVar: 'local', market: 'arot' },
  hazard(D, y) {
    const B = D.places.bakerganj, a = ix(y, 8, 1), b = ix(y, 10, 31);
    const days = [];
    for (let i = a; i <= b; i++) { const r3 = (B.prec[i] ?? 0) + (B.prec[i - 1] ?? 0) + (B.prec[i - 2] ?? 0); if (isKotal(dateOf(i)) && r3 >= 50) days.push({ i, mm: Math.round(r3) }); }
    const borer = countDays(B, ix(y, 9, 1), ix(y, 10, 31), (p, i) => p.rh[i] >= 85 && p.tmin[i] >= 24);
    return { sub: days, borer };
  },
  // Mungbean's own weather rules (crops.js), on Bakerganj's NASA days.
  mung(D, y, sow) {
    const B = D.places.bakerganj, s = ix(y, ...({ jan20: [1, 20], feb10: [2, 10], mar10: [3, 10] }[sow]));
    const fired = [];
    for (const r of ROTATION_CROPS.mungbean.rules) {
      const w = []; for (let k = r.from; k <= r.to; k++) { const v = r.v === 'tmax' ? B.tmax[s + k] : B.prec[s + k]; if (v != null) w.push(v); }
      const bad = r.type === 'any' ? w.some((x) => x >= r.thr) : w.filter((x) => x >= r.thr).length >= r.min;
      if (bad) fired.push(r);
    }
    return { s, fired };
  },
  run(D, c, y) {
    const h = this.hazard(D, y), ev = [];
    const POT = { hyv: 5.0, local: 2.5, dhan76: 4.5, dhan52: 4.5 }, LOSS = { hyv: 0.15, local: 0.02, dhan76: 0.03, dhan52: 0.05 };
    ev.push({ i: ix(y, 8, 1), k: 'info', t: L('আমনের চারা রোপণ', 'Aman seedlings transplanted') });
    const n = h.sub.length;
    let yA = POT[c.aman] * (1 - Math.min(0.95, LOSS[c.aman] * n));
    if (n) ev.push({ i: h.sub[0].i, k: 'hazard', t: L(`জোয়ারের কোটালে আর বৃষ্টিতে ${n} দিন জমি ডুবে (প্রথমবার ৩ দিনে ${h.sub[0].mm} মিমি বৃষ্টি)`, `${n} days under spring-tide water and rain (first: ${h.sub[0].mm} mm in 3 days)`) });
    if (n && c.aman === 'hyv') ev.push({ i: h.sub[0].i + 1, k: 'bad', t: L('খাটো চারা জোয়ারের পানিতে ডুবে মরল', 'The short seedlings drowned under the tide') });
    if (n && c.aman !== 'hyv') ev.push({ i: h.sub[0].i + 1, k: 'good', t: L('লম্বা বা ডুবসহিষ্ণু ধান পানির ওপরে মাথা তুলে টিকে রইল', 'The tall or flood-tolerant rice kept its head above water') });
    if (h.borer >= 40) {
      const f = c.borer === 'ipm' ? 0.93 : c.borer === 'spray' ? 0.85 : 0.7;
      yA *= f;
      ev.push({ i: ix(y, 9, 20), k: 'hazard', t: L(`সেপ্টেম্বর–অক্টোবরে ${h.borer} রাত গুমোট গরম-ভেজা: মাজরা পোকার মথ বেড়ে গেল`, `${h.borer} warm, humid nights in Sep–Oct: stem-borer moths boomed`) });
      ev.push({ i: ix(y, 10, 5), k: c.borer === 'ipm' ? 'good' : 'bad', t: c.borer === 'ipm' ? L('অন্ধকার রাতে আলোর ফাঁদে মথ ধরা পড়ল, ডালে বসা পাখি পোকা খেল', 'Light traps caught the moths on dark nights; birds on the perches ate the larvae') : c.borer === 'spray' ? L('পোকা কাণ্ডের ভেতরে, স্প্রে ধুয়ে খালে গিয়ে মাছ মরল', 'The larvae were inside the stems; the spray washed into the canal and killed fish') : L('সাদা শীষে মাঠ ভরে গেল', 'The field filled with white heads') });
    }
    const m = this.mung(D, y + 1, c.mungSow);
    let yC = c.mungVar === 'bari6' ? 1 : 0.8;
    if (m.fired.length) { yC *= c.mungVar === 'bari6' ? 0.7 : 0.35; ev.push({ i: m.s + 55, k: 'bad', t: L(`মুগে: ${m.fired.map((r) => r.bn).join('; ')}`, `Mungbean: ${m.fired.map((r) => r.en).join('; ')}`) }); }
    else ev.push({ i: m.s + 60, k: 'good', t: L('মুগ পাকার সময় আবহাওয়া ভালো ছিল', 'The weather held while the mungbean ripened') });
    const relA = (yA / 5.0) * 100, relB = c.marsh === 'dhap' ? 80 : 0, relC = yC * 100;
    const Y = (relA * 1.5 + relB * 0.6 + relC * 0.4) / 2.5;
    const E = clamp(60 + (c.borer === 'spray' ? -25 : 10) + (c.marsh === 'dhap' ? 15 : 0) + (m.fired.length ? 0 : 5));
    const C = clamp(25 + (c.aman === 'hyv' ? 0 : c.aman === 'local' ? 15 : 35) + (c.mungSow === 'jan20' ? 15 : c.mungSow === 'feb10' ? 8 : 0) + (c.mungVar === 'bari6' ? 15 : 0) + (c.marsh === 'dhap' ? 10 : 0));
    const B = c.borer === 'ipm' ? 95 : c.borer === 'none' ? 45 : 5;
    const M = c.market === 'store' ? clamp(55 + Y * 0.4) : clamp(20 + Y * 0.25);
    let danger = null;
    if (yA / POT[c.aman] < 0.25) danger = 3;
    if (!danger && c.market === 'arot' && Y < 35) danger = 4;
    return finish({ ev, plots: [{ id: 'A', rel: relA }, { id: 'B', rel: relB }, { id: 'C', rel: relC }], P: { Y, E, C, B, M }, blind: c.borer === 'spray', bonus: c.borer === 'ipm' && c.aman !== 'hyv', danger });
  },
};

const chattogram = {
  id: 'chattogram', place: 'sitakunda', years: span(2001, 2024),
  plots: [{ id: 'A', area: 1.4, name: L('উপকূলের নিচু আমন জমি', 'Low coastal Aman plain') }, { id: 'B', area: 1.0, name: L('পাহাড়ের ঢালের সবজি জমি', 'Hill-foot vegetable slope') }],
  choices: [
    { id: 'aman', plot: 'A', label: L('আমনের জাত', 'Aman variety'), options: [opt('local', 'দেশি লম্বা মেয়াদি (নভেম্বরের শেষে কাটা)', 'Long local (cut late November)'), opt('dhan49', 'ব্রি ধান৪৯ (১৩৫ দিন)', 'BRRI dhan49 (135 days)'), opt('dhan75', 'ব্রি ধান৭৫ (১১৫ দিন)', 'BRRI dhan75 (115 days)')] },
    { id: 'beds', plot: 'B', label: L('শিমের বেড', 'Bean beds'), options: [opt('flat', 'সমান বেড', 'Flat beds'), opt('raised', 'উঁচু বেড, মালচ', 'Raised, mulched beds')] },
    { id: 'drain', plot: 'B', label: L('মেঘভাঙা বৃষ্টির সতর্কতায়', 'On the cloudburst alert'), options: [opt('none', 'কিছু না', 'Nothing'), opt('dig', '৪৮ ঘণ্টা আগে চারপাশে নালা কাটা', 'Dig perimeter drains 48 hours ahead')] },
    { id: 'borer', plot: 'B', label: L('শিমের ফল ছিদ্রকারী পোকা', 'Bean pod borer'), options: [opt('spray3', 'তিন দিন পরপর কড়া কীটনাশক', 'Strong pesticide every three days'), opt('ipm', 'ফেরোমন ফাঁদ আর স্পিনোস্যাড', 'Pheromone traps and spinosad'), opt('none', 'কিছু না', 'Nothing')] },
    { id: 'urea', plot: 'farm', label: L('সার', 'Fertiliser'), options: [opt('heavy', 'শুধু বেশি ইউরিয়া', 'Just plenty of urea'), opt('bzn', 'সুষম সার, বোরন আর দস্তাসহ', 'Balanced, with boron and zinc')] },
    { id: 'market', plot: 'farm', label: L('বিক্রি', 'Selling'), options: [opt('bepari', 'ভোরে মহাসড়কের ব্যাপারীর কাছে', 'At dawn to the highway bepari'), opt('crates', 'বাতাস চলা ক্রেটে, রিয়াজউদ্দিন বাজারের দাম দেখে', 'In ventilated crates, at the Reazuddin Bazar price')] },
  ],
  best: { aman: 'dhan75', beds: 'raised', drain: 'dig', borer: 'ipm', urea: 'bzn', market: 'crates' },
  start: { aman: 'local', beds: 'flat', drain: 'none', borer: 'spray3', urea: 'heavy', market: 'bepari' },
  CUT: { local: [11, 25], dhan49: [11, 10], dhan75: [10, 28] }, POT: { local: 3.0, dhan49: 5.0, dhan75: 4.5 },
  hazard(D, y) {
    const S = D.places.sitakunda;
    const b = firstBurst(S.imerg, ix(y, 10, 1), ix(y, 11, 15) - 2, 3, 150);
    return { burst: b, maruca: countDays(S, ix(y, 11, 15), ix(y + 1, 1, 15), (p, i) => p.tmin[i] >= 18 && p.rh[i] >= 75) };
  },
  run(D, c, y) {
    const h = this.hazard(D, y), ev = [];
    const cut = ix(y, ...this.CUT[c.aman]);
    let yA = this.POT[c.aman], yB = 1, wiped = false;
    if (h.burst) {
      ev.push({ i: h.burst.i, k: 'hazard', t: L(`সীতাকুণ্ডে ৩ দিনে ${h.burst.mm} মিমি বৃষ্টি (আইমার্জ): পাহাড় থেকে ঢল নামল`, `${h.burst.mm} mm in 3 days at Sitakunda (IMERG): runoff came down the hills`) });
      if (h.burst.i < cut) {
        const loss = c.drain === 'dig' ? 0.15 : c.aman === 'local' ? 0.8 : 0.4;
        yA *= 1 - loss; wiped = loss >= 0.8;
        ev.push({ i: h.burst.i + 2, k: loss > 0.3 ? 'bad' : 'good', t: loss > 0.3 ? L('পাকতে থাকা আমন পাঁচ দিন পানিতে, ধান হেলে পড়ে পচল', 'The ripening Aman stood five days in water; it lodged and rotted') : L('নালা দিয়ে পানি নেমে গেল, আমন বাঁচল', 'The drains took the water away; the Aman survived') });
      } else ev.push({ i: h.burst.i, k: 'good', t: L('আমন আগেই কাটা হয়ে গিয়েছিল', 'The Aman had already been cut') });
      const bedLoss = c.beds === 'raised' ? (c.drain === 'dig' ? 0.05 : 0.15) : (c.drain === 'dig' ? 0.25 : 0.5);
      yB *= 1 - bedLoss;
      ev.push({ i: h.burst.i + 3, k: bedLoss > 0.2 ? 'bad' : 'good', t: bedLoss > 0.2 ? L('সমান বেডে পানি জমে শিমের গোড়া পচল (ফিউজেরিয়াম)', 'Water stood on the flat beds; the bean roots rotted (Fusarium)') : L('উঁচু বেডে শিকড় শুকনো রইল', 'Roots stayed dry on the raised beds') });
    } else ev.push({ i: ix(y, 10, 20), k: 'good', t: L('এ বছর অক্টোবরে মেঘভাঙা বৃষ্টি হয়নি', 'No October cloudburst this year') });
    ev.push({ i: cut, k: 'info', t: L(`আমন কাটা; শিম লাগানো ${c.aman === 'dhan75' ? 'আগেভাগে, দাম যখন বেশি' : c.aman === 'dhan49' ? 'মাঝামাঝি সময়ে' : 'দেরিতে'}`, `Aman cut; beans planted ${c.aman === 'dhan75' ? 'early, while prices are high' : c.aman === 'dhan49' ? 'in the middle of the window' : 'late'}`) });
    if (h.maruca >= 15) {
      const f = c.borer === 'ipm' ? 0.92 : c.borer === 'spray3' ? 0.75 : 0.4;
      yB *= f;
      ev.push({ i: ix(y, 12, 15), k: c.borer === 'ipm' ? 'good' : 'bad', t: c.borer === 'ipm' ? L(`ফুলের সময় ${h.maruca} দিন গরম-ভেজা, ফেরোমন ফাঁদ আর স্পিনোস্যাডে পোকা দমন`, `${h.maruca} warm, humid days at flowering; pheromone traps and spinosad held the borer`) : L(`ফুলের সময় ${h.maruca} দিন গরম-ভেজা: পোকা শিমের ভেতরে ঢুকে গেল`, `${h.maruca} warm, humid days at flowering: the larvae bored into the pods`) });
    }
    if (c.urea === 'heavy') { yA *= 0.9; yB *= 0.85; }
    const relA = (yA / 5.0) * 100, relB = yB * 100;
    const Y = (relA * 1.4 + relB * 1.0) / 2.4;
    const E = clamp(60 + (c.urea === 'heavy' ? -30 : 20) + (c.borer === 'spray3' ? -25 : 0) + (c.beds === 'raised' ? 10 : 0));
    const C = clamp(25 + ({ local: 0, dhan49: 15, dhan75: 30 }[c.aman]) + (c.beds === 'raised' ? 20 : 0) + (c.drain === 'dig' ? 25 : 0) - (wiped ? 25 : 0));
    const B = c.borer === 'ipm' ? 95 : c.borer === 'none' ? 40 : 5;
    const M = c.market === 'crates' ? clamp(55 + Y * 0.4 + (c.aman === 'dhan75' ? 5 : 0)) : clamp(10 + Y * 0.2);
    let danger = null;
    if (c.urea === 'heavy' && c.borer === 'spray3') danger = 1;
    if (wiped) danger = 3;
    if (!danger && c.market === 'bepari' && Y < 35) danger = 4;
    return finish({ ev, plots: [{ id: 'A', rel: relA }, { id: 'B', rel: relB }], P: { Y, E, C, B, M }, blind: c.borer === 'spray3', bonus: c.drain === 'dig' && c.borer === 'ipm', danger });
  },
};

function finish(r) {
  const P = Object.fromEntries(Object.entries(r.P).map(([k, v]) => [k, Math.round(clamp(v))]));
  const total = r.danger ? Math.min(25, scoreOf(P, r)) : scoreOf(P, r);
  r.ev.sort((a, b) => a.i - b.i);
  return { ...r, P, total: Math.round(total), events: r.ev.map((e) => ({ ...e, t0: fmt(e.i) })) };
}

export const MISSIONS = { chattogram, khulna, barishal, rangpur, sylhet };

// One choice set through every year: how often it would have gone well, and where it would have broken.
export function history(m, D, choice, inp) {
  const rows = m.years.map((y) => ({ year: y, ...m.run(D, choice, y, inp) }));
  const avg = rows.reduce((a, r) => a + r.total, 0) / rows.length;
  const dangers = rows.filter((r) => r.danger).length;
  return { rows, avg, dangers, best: rows.reduce((a, r) => (r.total > a.total ? r : a)), worst: rows.reduce((a, r) => (r.total < a.total ? r : a)) };
}
