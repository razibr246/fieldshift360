// The officer's season brief on Ropon Radar: which weather hazard comes most often here (scripts/build/build_aman_hazards.mjs),
// the calendar for the next Aman hung on the upazila's own radar-measured transplanting day, and a short message for
// the upazila's farmers built from the same numbers the page shows. Pure (no React), so Node tests can run it.
import HAZ from '../data/radar/aman_hazards.json' with { type: 'json' };
import { HARVEST_AFTER } from '../engine/outlook.js';

// The four hazard groups and the indices behind each (the hazard component adds the icons).
export const HAZARD_GROUPS = [
  { key: 'drought', color: '#c98a4b', bn: 'খরা', en: 'Drought', keys: ['spi', 'seedRain', 'drySpell', 'lateRain', 'lateDry'] },
  { key: 'flood', color: '#2f8a8f', bn: 'বন্যা ও অতি বৃষ্টি', en: 'Flood and very heavy rain', keys: ['water', 'veryHeavy', 'rx5', 'heavy'] },
  { key: 'heat', color: '#b42318', bn: 'গরম', en: 'Heat', keys: ['heat'] },
  { key: 'cold', color: '#5b7fa3', bn: 'ঠান্ডা', en: 'Cold', keys: ['cold'] },
];

// What fits each hazard; varieties from BRRI's published trials (sources listed under the hazard cards).
export const FIT = {
  drought: {
    bn: ['খরা-সহিষ্ণু, আগাম পাকা জাত ব্রি ধান৭১: বর্ষা চলে যাওয়ার আগেই দানা ভরে।', 'ফুল আর দানা গঠনের সময় পানি কমে গেলে একটি-দুটি সম্পূরক সেচ।', 'বীজতলায় সেচের ব্যবস্থা রাখা, যাতে কম বৃষ্টির বছরেও সময়মতো রোপণ করা যায়।'],
    en: ['Drought-tolerant, early-maturing BRRI dhan71: the grain fills before the monsoon leaves.', 'One or two supplementary irrigations if water runs short at flowering and grain filling.', 'Irrigable seedbeds, so transplanting stays on time in a dry year.'],
  },
  flood: {
    bn: ['জলমগ্নতা-সহিষ্ণু জাত: ব্রি ধান৭৯ (প্রায় তিন সপ্তাহ আকস্মিক বন্যা সহ্য করে), ব্রি ধান৫১, ব্রি ধান৫২।', 'উঁচু জমিতে বীজতলা, আর বন্যার পর আবার রোপণের জন্য কিছু বাড়তি চারা রাখা।', 'নালা ও পানি নামার পথ পরিষ্কার রাখা, যাতে ভারী বৃষ্টির পানি দ্রুত নেমে যায়।'],
    en: ['Submergence-tolerant varieties: BRRI dhan79 (survives about three weeks of flash flooding), BRRI dhan51, BRRI dhan52.', 'Seedbeds on high ground, and spare seedlings to replant after a flood.', 'Clear drains and outlets so heavy rain runs off fast.'],
  },
  heat: { bn: ['ফুল আসার সময় টানা ৩৫°-এর বেশি গরম হলে জমিতে পানি রাখুন; রোপণের তারিখ এমন রাখুন যাতে ফুল সবচেয়ে গরম দিনগুলো এড়ায়।'], en: ['If it stays above 35 °C at flowering, keep water in the field; set transplanting so flowering misses the hottest days.'] },
  cold: { bn: ['দেরিতে রোপণ এড়ান: সেপ্টেম্বরের শেষে রোপণ করলে ঠান্ডায় ফুলে চিটা বাড়ে।'], en: ['Avoid late transplanting: planted after late September, cold at flowering raises sterility.'] },
};

export const hazardYears = () => HAZ.refYears;

// Each hazard group for an upazila: the years it struck, their share of the reference years, how often (0 not seen,
// 1 now and then, 2 often), whether the latest complete year was one, and which of its indices are trending worse
// with a trend that survives the district-wide correction. Most frequent first. Null where the hazards are not built.
export function hazardGroups(id) {
  const u = HAZ.upazilas[id];
  if (!u) return null;
  const n = HAZ.refYears[1] - HAZ.refYears[0] + 1;
  const dir = Object.fromEntries(HAZ.indices.map((m) => [m.key, m.dir]));
  return HAZARD_GROUPS.map((g) => {
    const years = [...new Set(g.keys.flatMap((k) => u.stats[k]?.hazardYears ?? []))].sort();
    const share = Math.round((years.length / n) * 100);
    const worsening = g.keys.filter((k) => { const st = u.stats[k]; return st?.significant && st.perDecade !== 0 && Math.sign(st.perDecade) === dir[k]; });
    return { ...g, years, share, level: share === 0 ? 0 : share < 20 ? 1 : 2, lastHit: years.includes(HAZ.refYears[1]), worsening };
  }).sort((a, b) => b.share - a.share);
}

// The next Aman around the upazila's usual transplanting day T (day of year): seedbeds 25–30 days before, the
// transplanting window ±shiftDays, flowering 55–85 days and harvest HARVEST_AFTER (95–120) days after transplanting.
export function amanCalendar(transplantDoy, year, shiftDays = 7) {
  if (transplantDoy == null) return null;
  const at = (d) => Date.UTC(year, 0, transplantDoy + d);
  return {
    year,
    seedbed: [at(-30), at(-25)],
    transplant: [at(-shiftDays), at(shiftDays)],
    flowering: [at(55), at(85)],
    harvest: [at(HARVEST_AFTER[0]), at(HARVEST_AFTER[1])],
  };
}

// The farmer message: the next season's dates and, where a hazard comes now and then or often, its first fix.
// fmt(t, lang) formats a date; place is { bn, en }. Three Bangla SMS parts (67 characters each) at most.
export function farmerMessage({ cal, groups, place, fmt }) {
  const top = groups?.find((g) => g.level > 0) ?? null;
  const span = ([a, b], lang) => `${fmt(a, lang)}–${fmt(b, lang)}`;
  const tips = top ? FIT[top.key] : null;
  return {
    bn: `রোপণ রাডার, ${place.bn}: আগামী আমনে বীজতলা ${span(cal.seedbed, 'bn')}, রোপণ ${span(cal.transplant, 'bn')}।${top ? ` এখানে ${top.bn} বেশি আসে: ${tips.bn[0]}` : ''} — উপজেলা কৃষি অফিস`,
    en: `Ropon Radar, ${place.en}: for the next Aman, seedbeds ${span(cal.seedbed, 'en')}, transplanting ${span(cal.transplant, 'en')}.${top ? ` ${top.en} comes most often here: ${tips.en[0]}` : ''} — Upazila agriculture office`,
  };
}
