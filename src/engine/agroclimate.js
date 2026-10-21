// Agro-climate indicators for the Rabi–Boro year, read from the (station-corrected) NASA POWER daily record.
// [REAL data in, RULE logic]. Each indicator is a count or total a farmer can picture ("nights at 10 °C or colder in
// Poush–Magh"), uses a published threshold (`src` says whose), and carries what to do about it.
// Trend statistics are the ones climatologists use for short, noisy series: Sen's slope (the median of all
// year-to-year slopes, so one odd year cannot swing it) and the Mann–Kendall test (is there a steady rise or fall
// at all, or is it just year-to-year scatter?).
import { DAY, ymd } from './dates.js';

// Seasons by harvest year: 2001 = Rabi 2000–01 … 2026 = Rabi 2025–26 (the record runs to October 2026).
export const AC_SEASONS = Array.from({ length: 26 }, (_, i) => 2001 + i);
export const AC_THEN = AC_SEASONS.filter((y) => y <= 2013); // first 13
export const AC_NOW = AC_SEASONS.filter((y) => y >= 2014); // last 13

function days(clim, a, b, fn) {
  const out = [];
  for (let t = a; t <= b; t += DAY) {
    const x = fn(t);
    if (x === undefined) return null; // outside the record
    out.push(x);
  }
  return out;
}
const tv = (c, v) => (t) => c.val(v, t);
const count = (arr, p) => (arr ? arr.filter((x) => x != null && p(x)).length : null);
const total = (arr) => (arr ? Math.round(arr.reduce((s, x) => s + (x ?? 0), 0)) : null);

// Hargreaves reference evapotranspiration (FAO-56 eq. 52), mm/day, from Tmax, Tmin and extra-terrestrial radiation.
export function hargreaves(tmax, tmin, latDeg, t) {
  const J = Math.round((t - Date.UTC(new Date(t).getUTCFullYear(), 0, 1)) / DAY) + 1;
  const phi = (latDeg * Math.PI) / 180, dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365), d = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39);
  const ws = Math.acos(-Math.tan(phi) * Math.tan(d));
  const Ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.sin(ws)); // MJ/m²/day
  return 0.0023 * 0.408 * Ra * ((tmax + tmin) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin));
}

// Monsoon onset: first day from 15 May with 40 mm or more over five days, not followed by a 10-day spell under 5 mm
// within the next 30 days (a common agronomic onset rule for South Asia). Day of year, or null.
function monsoonOnset(c, y) {
  const p = (t) => c.val('prec', t) ?? 0;
  for (let t = ymd(y, 5, 15); t <= ymd(y, 7, 31); t += DAY) {
    if (c.val('prec', t + 34 * DAY) === undefined) return null;
    let s5 = 0; for (let k = 0; k < 5; k++) s5 += p(t + k * DAY);
    if (s5 < 40) continue;
    let dry = false;
    for (let k = 5; k <= 25 && !dry; k++) { let s = 0; for (let j = 0; j < 10; j++) s += p(t + (k + j) * DAY); if (s < 5) dry = true; }
    if (!dry) return Math.round((t - ymd(y, 1, 1)) / DAY) + 1;
  }
  return null;
}

export const GROUPS = {
  heat: { bn: 'গরম', en: 'Heat' },
  cold: { bn: 'ঠান্ডা', en: 'Cold' },
  water: { bn: 'পানি ও বৃষ্টি', en: 'Water and rain' },
  timing: { bn: 'মৌসুমের সময়', en: 'Season timing' },
};

// worse: which direction hurts the farmer ('up' | 'down' | null when it depends).
// crops: the Rabi crops (and Aman) this matters most for.
export const INDICATORS = {
  boroHeat: {
    group: 'heat', crops: ['boro'], worse: 'up', unit: { bn: 'দিন', en: 'days' },
    bn: 'বোরোর ফুল আসার সময় ৩৫°-এর দিন', en: 'Days at 35 °C while Boro flowers',
    detail: { bn: '২৫ মার্চ থেকে ৩০ এপ্রিল, যেসব দিনে সর্বোচ্চ তাপমাত্রা ৩৫° সেলসিয়াস বা বেশি', en: 'Days from 25 March to 30 April with a maximum of 35 °C or more' },
    why: { bn: 'ফুল ফোটার সময় (সকাল ১০টা–দুপুর ১২টা) ৩৫°-এর বেশি গরমে পরাগ নষ্ট হয়, ধান চিটা হয়।', en: 'Above 35 °C at flowering (10 am to noon) pollen fails and the grains stay empty.' },
    act: [{ bn: 'বীজতলা ১৫ নভেম্বর–১৫ ডিসেম্বরে, রোপণ জানুয়ারির মাঝামাঝির মধ্যে, যাতে এপ্রিলের তীব্র গরমের আগেই ফুল আসা শেষ হয়।', en: 'Sow the seedbed 15 Nov–15 Dec and transplant by mid-January, so flowering is over before April’s worst heat.' },
      { bn: 'ফুল আসার সময় জমিতে ৫–৭ সেমি পানি রাখুন; পাতার শ্বাসে গাছ ৪–৬° ঠান্ডা থাকে।', en: 'Keep 5–7 cm of water in the field at flowering; transpiration keeps the panicles 4–6 °C cooler.' }],
    src: ['heatRice'],
    f: (c, y) => count(days(c, ymd(y, 3, 25), ymd(y, 4, 30), tv(c, 'tmax')), (x) => x >= 35),
  },
  wheatHeat: {
    group: 'heat', crops: ['wheat', 'lentil', 'mustard'], worse: 'up', unit: { bn: 'দিন', en: 'days' },
    bn: 'গমের দানা পুষ্ট হওয়ার সময় ৩০°-এর দিন', en: 'Days over 30 °C while wheat fills its grain',
    detail: { bn: '১৫ ফেব্রুয়ারি থেকে ২০ মার্চ, যেসব দিনে সর্বোচ্চ তাপমাত্রা ৩০° সেলসিয়াসের বেশি', en: 'Days from 15 February to 20 March with a maximum above 30 °C' },
    why: { bn: 'গমের জন্য ১২–২৫° ভালো; ৩০°-এর বেশি হলে দানা ছোট হয়, ফলন কমে। দেরিতে বোনা গমে ক্ষতি সবচেয়ে বেশি।', en: 'Wheat does best at 12–25 °C; above 30 °C the grains shrink and yield falls, worst in late-sown wheat.' },
    act: [{ bn: 'গম ১৫–৩০ নভেম্বরে বুনুন (উত্তরে ৭ ডিসেম্বর পর্যন্ত)। দেরিতে বুনলে ফলন ২০–৫৭% কমে যেতে পারে।', en: 'Sow wheat 15–30 November (to 7 December in the cooler north). Late sowing has cut yields by 20–57%.' },
      { bn: 'আমন তাড়াতাড়ি কাটা যায় এমন জাত বাছলে গম সময়মতো বোনা যায়।', en: 'A shorter-duration Aman lets the wheat go in on time.' }],
    src: ['wheatSow', 'wheatLate'],
    f: (c, y) => count(days(c, ymd(y, 2, 15), ymd(y, 3, 20), tv(c, 'tmax')), (x) => x > 30),
  },
  heatwave: {
    group: 'heat', crops: ['boro', 'aman', 'tomato'], worse: 'up', unit: { bn: 'দিন', en: 'days' },
    bn: 'তাপপ্রবাহের দিন', en: 'Heat-wave days',
    detail: { bn: 'মার্চ থেকে মে, যেসব দিনে সর্বোচ্চ তাপমাত্রা ৩৬° বা বেশি (আবহাওয়া অধিদপ্তরের মৃদু তাপপ্রবাহ)', en: 'Days from March to May at 36 °C or more (a mild heat wave by BMD’s definition)' },
    why: { bn: 'তাপপ্রবাহে মাটি দ্রুত শুকায়, সেচ বেশি লাগে, মাঠে কাজ করাও বিপজ্জনক।', en: 'Heat waves dry the soil fast, raise irrigation needs and make fieldwork dangerous.' },
    act: [{ bn: 'সেচ দিন বিকেলে বা সন্ধ্যায়; মাঠের কাজ সকাল ১০টার আগে শেষ করুন, পানি খান।', en: 'Irrigate in the late afternoon or evening; finish field work before 10 am and keep drinking water.' }],
    src: ['bmdHeat'],
    f: (c, y) => count(days(c, ymd(y, 3, 1), ymd(y, 5, 31), tv(c, 'tmax')), (x) => x >= 36),
  },
  coldWave: {
    group: 'cold', crops: ['boro', 'tomato', 'mustard'], worse: 'up', unit: { bn: 'রাত', en: 'nights' },
    bn: 'শৈত্যপ্রবাহের রাত', en: 'Cold-wave nights',
    detail: { bn: 'ডিসেম্বর থেকে ফেব্রুয়ারি, যেসব রাতে সর্বনিম্ন তাপমাত্রা ১০° বা কম (আবহাওয়া অধিদপ্তরের শৈত্যপ্রবাহ)', en: 'Nights from December to February at 10 °C or colder (a cold wave by BMD’s definition)' },
    why: { bn: '১৩°-এর নিচে বোরোর বীজতলার পাতা হলুদ হয়; টানা কয়েক দিন ১০°-এর নিচে থাকলে চারা মরে। কুয়াশায় সরিষায় জাব পোকা আর টমেটোয় নাবি ধসা বাড়ে।', en: 'Below 13 °C Boro seedbeds yellow; several nights under 10 °C kill seedlings. Fog brings aphids on mustard and late blight on tomato.' },
    act: [{ bn: 'শৈত্যপ্রবাহে বীজতলা রাতে স্বচ্ছ পলিথিনে ঢাকুন, দিনে খুলে দিন; বীজতলায় ৩–৫ সেমি পানি রাখুন, সকালে পানি বদলান, চারার শিশির ঝেড়ে দিন।', en: 'In a cold wave cover the seedbed with clear polythene at night and open it by day; keep 3–5 cm of water, change it in the morning and shake the dew off.' }],
    src: ['bmdCold', 'seedbed'],
    f: (c, y) => count(days(c, ymd(y - 1, 12, 1), ymd(y, 2, 28), tv(c, 'tmin')), (x) => x <= 10),
  },
  winterLength: {
    group: 'cold', crops: ['wheat', 'mustard', 'lentil', 'tomato'], worse: 'down', unit: { bn: 'দিন', en: 'days' },
    bn: 'শীত কত দিন থাকে', en: 'Length of the cool season',
    detail: { bn: 'নভেম্বর থেকে মার্চ, যেসব দিনের গড় তাপমাত্রা ২০° বা কম', en: 'Days from November to March with a daily mean of 20 °C or less' },
    why: { bn: 'গম, সরিষা আর মসুরের ফলন ঠান্ডা দিনের সংখ্যার ওপর নির্ভর করে; শীত ছোট হলে গাছ তাড়াতাড়ি পেকে যায়, দানা কম হয়।', en: 'Wheat, mustard and lentil yields ride on the number of cool days; a short winter rushes the crop and the grain stays small.' },
    act: [{ bn: 'শীত ছোট হয়ে আসলে সময়মতো (নভেম্বরে) বোনা আরও জরুরি, আর কম দিনের জাত বেছে নিন।', en: 'As winter shortens, sowing on time (in November) matters more; choose shorter-duration varieties.' }],
    src: ['wheatSow'],
    f: (c, y) => {
      const a = days(c, ymd(y - 1, 11, 1), ymd(y, 3, 31), (t) => { const x = c.val('tmax', t), n = c.val('tmin', t); return x === undefined || n === undefined ? undefined : x == null || n == null ? null : (x + n) / 2; });
      return count(a, (x) => x <= 20);
    },
  },
  rabiRain: {
    group: 'water', crops: ['mustard', 'lentil', 'wheat', 'tomato'], worse: null, unit: { bn: 'মিমি', en: 'mm' },
    bn: 'রবি মৌসুমের মোট বৃষ্টি', en: 'Rabi-season rain',
    detail: { bn: 'নভেম্বর থেকে ফেব্রুয়ারির মোট বৃষ্টি', en: 'All rain from November to February' },
    why: { bn: 'রবিতে বৃষ্টি কম, তাই সেচই ভরসা। অসময়ের ভারী বৃষ্টিতে সরিষা-মসুরে পাতা ঝলসানো রোগ আর জাব পোকা বাড়ে।', en: 'Rabi is mostly dry, so irrigation carries the crop. Untimely heavy rain brings blight and aphids to mustard and lentil.' },
    act: [{ bn: 'বৃষ্টির পর জমিতে পানি জমতে দেবেন না; সরিষা ও মসুরে দাগ দেখলে পাতার ছবি পাঠান।', en: 'Do not let water stand after rain; send a leaf photo if spots appear on mustard or lentil.' }],
    src: [],
    f: (c, y) => total(days(c, ymd(y - 1, 11, 1), ymd(y, 2, 28), tv(c, 'prec'))),
  },
  boroWater: {
    group: 'water', crops: ['boro'], worse: 'up', unit: { bn: 'মিমি', en: 'mm' },
    bn: 'বোরোর সেচের চাহিদা', en: 'Boro irrigation need',
    detail: { bn: '১৫ জানুয়ারি থেকে ৩০ এপ্রিল: ফসল যত পানি বাতাসে ছাড়ে (হারগ্রিভস ET₀ × ১.১৫) থেকে কাজে লাগা বৃষ্টি বাদ দিয়ে', en: '15 January to 30 April: what the crop gives off to the air (Hargreaves ET₀ × 1.15) minus the rain it can use' },
    why: { bn: 'বোরোর পানির প্রায় সবটাই নলকূপ থেকে আসে; চাহিদা বাড়লে খরচ বাড়ে, বরেন্দ্রে পানির স্তর আরও নামে। জমি তৈরি ও চুইয়ে যাওয়া পানি এর বাইরে।', en: 'Nearly all Boro water comes from tube wells; a higher need means higher costs and, in the Barind, a falling water table. Land preparation and seepage come on top.' },
    act: [{ bn: 'পর্যায়ক্রমে ভেজানো ও শুকানো (AWD) পদ্ধতিতে ফলন না কমিয়ে ২০–২৫% পানি বাঁচে: ছিদ্রওয়ালা পাইপে পানি ১৫ সেমি নামলে তবে সেচ দিন।', en: 'Alternate wetting and drying (AWD) saves 20–25% of the water with no loss of yield: irrigate only when the water in a perforated pipe drops 15 cm.' }],
    src: ['awd'],
    f: (c, y) => {
      let s = 0;
      for (let t = ymd(y, 1, 15); t <= ymd(y, 4, 30); t += DAY) {
        const x = c.val('tmax', t), n = c.val('tmin', t), p = c.val('prec', t);
        if (x === undefined || n === undefined || p === undefined) return null;
        if (x == null || n == null) continue;
        const peff = (p ?? 0) > 5 ? 0.8 * p : 0;
        s += Math.max(0, 1.15 * hargreaves(x, n, c.prov.lat, t) - peff);
      }
      return Math.round(s);
    },
  },
  stormRain: {
    group: 'water', crops: ['boro', 'mustard', 'wheat'], worse: 'up', unit: { bn: 'দিন', en: 'days' },
    bn: 'কালবৈশাখীর ভারী বৃষ্টির দিন', en: 'Nor’wester downpour days',
    detail: { bn: '১৫ মার্চ থেকে ১৫ মে, যেসব দিনে ২৫ মিমি বা বেশি বৃষ্টি (ঝড়-শিলাবৃষ্টির মৌসুম)', en: 'Days from 15 March to 15 May with 25 mm or more of rain (the storm and hail season)' },
    why: { bn: 'এই সময়ের ঝড়ে পাকা বোরো হেলে পড়ে, শিলায় দানা ঝরে, কাটা ধান ভিজে নষ্ট হয়।', en: 'Storms in these weeks flatten ripe Boro, hail knocks the grain out and cut paddy gets soaked.' },
    act: [{ bn: 'বোরোর শিষের ৮০% দানা পাকলেই কেটে ফেলুন; ঝড়ের পূর্বাভাস থাকলে আগে কাটুন।', en: 'Cut Boro as soon as 80% of the grains are ripe, and earlier if a storm is forecast.' }],
    src: ['norwester'],
    f: (c, y) => count(days(c, ymd(y, 3, 15), ymd(y, 5, 15), tv(c, 'prec')), (x) => x >= 25),
  },
  monsoonOnset: {
    group: 'timing', crops: ['aman', 'boro'], worse: null, unit: { bn: 'তারিখ', en: 'date' }, date: true,
    bn: 'বর্ষা শুরুর তারিখ', en: 'Monsoon onset',
    detail: { bn: '১৫ মের পর প্রথম দিন, যখন পাঁচ দিনে ৪০ মিমি বৃষ্টি হয় আর পরের এক মাসে টানা ১০ দিনের খরা আসে না', en: 'The first day after 15 May with 40 mm in five days and no 10-day dry spell in the month after' },
    why: { bn: 'বর্ষা আগে এলে পাকা বোরো কাটার সময় বৃষ্টিতে ভেজে; দেরিতে এলে আমনের বীজতলা আর রোপণ পিছিয়ে যায়, তাতে পরের রবিও দেরি হয়।', en: 'An early monsoon soaks the Boro harvest; a late one delays the Aman seedbed and transplanting, and so the next Rabi.' },
    act: [{ bn: 'বর্ষা দেরিতে এলে আমনের বীজতলা সম্পূরক সেচে করুন, যাতে রোপণ পিছিয়ে না যায়।', en: 'If the monsoon is late, raise the Aman seedbed with a little irrigation so transplanting is not delayed.' }],
    src: [],
    f: (c, y) => monsoonOnset(c, y),
  },
};

export const SOURCES = {
  bmdCold: { label: 'BMD cold-wave bands (mild 8–10 °C, moderate 6–8, severe 4–6) as reported by Prothom Alo', url: 'https://en.prothomalo.com/environment/aup0qfizv0' },
  bmdHeat: { label: 'BMD heat-wave bands (mild 36–38 °C, moderate 38–40, severe 40–42), Dhaka Tribune', url: 'https://www.dhakatribune.com/amp/bangladesh/344509/very-severe-heatwave-hits-parts-of-bangladesh' },
  heatRice: { label: 'Rice spikelet sterility above 35 °C at anthesis; BRRI on panicle cooling (Observer; TBS)', url: 'https://observerbd.com/news/572441' },
  norwester: { label: 'Nor’westers and crop damage in Bangladesh (The Business Standard)', url: 'https://www.tbsnews.net/node/245437' },
  wheatSow: { label: 'Optimum wheat sowing 15–30 November, to 7 December in the north (Bangladesh Agronomy Journal)', url: 'https://banglajol.info/index.php/BAJ/article/view/39358/29586' },
  wheatLate: { label: 'Late sowing cut wheat yield by 20–57% (J. Bangladesh Agril. Univ. 2024)', url: 'https://baures.bau.edu.bd/wp-content/uploads/2024/03/81-91_CropScience_JBAU-2024-01-05.pdf' },
  seedbed: { label: 'Boro seedbed protection in cold waves: polythene cover, 3–5 cm water (Bangladesh Rice Journal 2022; DAE advice)', url: 'https://banglajol.info/index.php/BRJ/article/view/66595/45964' },
  awd: { label: 'Alternate wetting and drying in Boro: 20–25% less water, no yield loss (WOCAT, Bangladesh)', url: 'https://qcat.wocat.net/en/wocat/technologies/view/permalink/4671' },
  normals: { label: 'WMO climate normals 1991–2020, BMD Rajshahi and Dhaka stations (NOAA NCEI)', url: 'https://www.ncei.noaa.gov/products/wmo-climate-normals' },
  fog: { label: 'More frequent, persistent winter fog over the Indo-Gangetic Plain (NASA Earth Observatory)', url: 'https://earthobservatory.nasa.gov/images/152337/fog-blankets-the-indo-gangetic-plain' },
  hargreaves: { label: 'FAO-56, Crop evapotranspiration (Hargreaves equation, eq. 52)', url: 'https://www.fao.org/4/x0490e/x0490e00.htm' },
};

// ---- trend statistics ----
const erf = (x) => { // Abramowitz–Stegun 7.1.26
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
};
export function mannKendall(ys, xs) {
  const n = ys.length;
  let S = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) S += Math.sign(ys[j] - ys[i]);
  const ties = {}; ys.forEach((v) => { ties[v] = (ties[v] ?? 0) + 1; });
  const tie = Object.values(ties).reduce((a, t) => a + t * (t - 1) * (2 * t + 5), 0);
  const varS = (n * (n - 1) * (2 * n + 5) - tie) / 18;
  const Z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - 0.5 * (1 + erf(Math.abs(Z) / Math.SQRT2)));
  const slopes = [];
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
  slopes.sort((a, b) => a - b);
  const m = slopes.length ? (slopes[(slopes.length - 1) >> 1] + slopes[slopes.length >> 1]) / 2 : 0;
  const xm = [...xs].sort((a, b) => a - b)[(n - 1) >> 1], ym = [...ys].sort((a, b) => a - b)[(n - 1) >> 1];
  return { S, Z, p, slope: m, intercept: ym - m * xm };
}
// How sure the trend is, in words a farmer can use.
export const confidence = (p) => (p < 0.05 ? 'sure' : p < 0.2 ? 'likely' : 'unclear');

export function indicatorSeries(clim, id) {
  const def = INDICATORS[id];
  const series = AC_SEASONS.map((y) => ({ season: y, value: def.f(clim, y) }));
  const ok = series.filter((s) => s.value != null);
  const mean = (ys) => { const v = ok.filter((s) => ys.includes(s.season)).map((s) => s.value); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const mk = ok.length >= 8 ? mannKendall(ok.map((s) => s.value), ok.map((s) => s.season)) : null;
  const last = ok[ok.length - 1] ?? null;
  // Rank of the latest season among all (1 = highest).
  const rank = last ? ok.filter((s) => s.value > last.value).length + 1 : null;
  const thenM = mean(AC_THEN), nowM = mean(AC_NOW);
  return {
    id, def, series, n: ok.length, then: thenM, now: nowM, change: thenM != null && nowM != null ? nowM - thenM : null,
    pct: thenM ? ((nowM - thenM) / Math.abs(thenM)) * 100 : null,
    trend: mk && { perDecade: mk.slope * 10, p: mk.p, sure: confidence(mk.p), line: (y) => mk.intercept + mk.slope * y },
    last, rank, min: Math.min(...ok.map((s) => s.value)), max: Math.max(...ok.map((s) => s.value)),
  };
}

export function agroClimate(clim) {
  return Object.fromEntries(Object.keys(INDICATORS).map((id) => [id, indicatorSeries(clim, id)]));
}

// Warming of the Rabi season itself (November–March), °C per decade, for days and for nights.
export function rabiWarming(clim) {
  const meanOf = (v, y) => { const a = days(clim, ymd(y - 1, 11, 1), ymd(y, 3, 31), tv(clim, v)); if (!a) return null; const b = a.filter((x) => x != null); return b.reduce((s, x) => s + x, 0) / b.length; };
  const out = {};
  for (const v of ['tmax', 'tmin']) {
    const rows = AC_SEASONS.map((y) => ({ y, m: meanOf(v, y) })).filter((r) => r.m != null);
    const mk = mannKendall(rows.map((r) => r.m), rows.map((r) => r.y));
    out[v] = { perDecade: mk.slope * 10, p: mk.p, sure: confidence(mk.p), mean: rows.reduce((s, r) => s + r.m, 0) / rows.length };
  }
  return out;
}

// The hottest day and coldest night in the record, with dates.
export function extremes(clim) {
  let hot = { v: -Infinity }, cold = { v: Infinity };
  for (let t = clim.start; t <= clim.end; t += DAY) {
    const x = clim.val('tmax', t), n = clim.val('tmin', t);
    if (x != null && x > hot.v) hot = { v: x, t };
    if (n != null && n < cold.v) cold = { v: n, t };
  }
  return { hot, cold };
}

// Day of year -> UTC date in a given year (for monsoon onset labels).
export const doyDate = (doy, y = 2025) => ymd(y, 1, 1) + (doy - 1) * DAY;
