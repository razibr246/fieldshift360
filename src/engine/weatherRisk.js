// Weather warnings for one union from the live 8-day forecast (engine/forecast.js, Open-Meteo). [REAL forecast, RULE]
// Thresholds are published ones, named on each warning:
//   Heavy rain: BMD rainfall classes - heavy 44–88 mm in 24 h, very heavy 89 mm or more.
//   Heatwave: BMD - mild 36–37.9 °C, moderate 38–39.9 °C, severe 40 °C or more.
//   Cold wave: BMD - mild 8–10 °C, moderate 6–7.9 °C, severe below 6 °C.
//   Late blight (tomato, potato): the Hutton criteria (AHDB, 2017) - two consecutive days, each with a minimum of
//     10 °C or more and at least 6 hours at 90% relative humidity or more.
//   Wheat blast: warm, long-wet spells at heading - 25–30 °C with 10 hours or more of humidity at 90%+ (Cardoso et
//     al. 2008, Plant Pathology; BARI wheat blast advisory), February–March only.
// A forecast is not a certainty; each warning says how many days ahead it falls.

const hoursOf = (fc, date) => fc.hours.filter((h) => h.date === date);
const humidHours = (hs, rh = 90) => hs.filter((h) => h.rh >= rh).length;

export function weatherWarnings(fc, { crops = new Set(), month }) {
  if (!fc?.days?.length) return [];
  const out = [];
  const days = fc.days;
  // Heavy rain
  const wet = days.filter((d) => (d.rain ?? 0) >= 44);
  if (wet.length) {
    const top = wet.reduce((a, d) => (d.rain > a.rain ? d : a));
    out.push({ id: 'rain', kind: 'rain', level: top.rain >= 89 ? 'high' : 'medium', dates: wet.map((d) => d.date), value: top.rain, crop: null,
      title: { bn: top.rain >= 89 ? 'অতি ভারী বৃষ্টির পূর্বাভাস' : 'ভারী বৃষ্টির পূর্বাভাস', en: top.rain >= 89 ? 'Very heavy rain forecast' : 'Heavy rain forecast' },
      rule: { bn: 'আবহাওয়া অধিদপ্তরের মাপে ২৪ ঘণ্টায় ৪৪–৮৮ মিমি ভারী, ৮৯ মিমি বা বেশি অতি ভারী', en: 'BMD: 44–88 mm in 24 h is heavy, 89 mm or more very heavy' },
      advice: { bn: 'ভারী বৃষ্টির পূর্বাভাস আছে। জমির নালা খুলে রাখুন, বৃষ্টির আগে ওষুধ বা ইউরিয়া ছিটাবেন না, পাকা ফসল থাকলে আগেই কেটে শুকনো জায়গায় তুলুন।', en: 'Heavy rain is forecast. Open the field drains, do not spray or top-dress before it, and cut any ripe crop and get it under cover first.' } });
  }
  // Heat
  const hot = days.filter((d) => d.max >= 36);
  if (hot.length) {
    const top = Math.max(...hot.map((d) => d.max));
    out.push({ id: 'heat', kind: 'heat', level: top >= 38 ? 'high' : 'medium', dates: hot.map((d) => d.date), value: top, crop: null,
      title: { bn: top >= 40 ? 'তীব্র তাপপ্রবাহের পূর্বাভাস' : top >= 38 ? 'মাঝারি তাপপ্রবাহের পূর্বাভাস' : 'মৃদু তাপপ্রবাহের পূর্বাভাস', en: top >= 40 ? 'Severe heatwave forecast' : top >= 38 ? 'Moderate heatwave forecast' : 'Mild heatwave forecast' },
      rule: { bn: 'আবহাওয়া অধিদপ্তর: ৩৬–৩৭.৯° মৃদু, ৩৮–৩৯.৯° মাঝারি, ৪০° বা বেশি তীব্র তাপপ্রবাহ', en: 'BMD: 36–37.9 °C mild, 38–39.9 °C moderate, 40 °C or more severe heatwave' },
      advice: { bn: 'তাপপ্রবাহের পূর্বাভাস আছে। সেচ সকালে বা বিকেলে দিন, ধানের জমিতে ২–৩ সেমি পানি রাখুন, দুপুরে মাঠে কাজ কম করুন।', en: 'A heatwave is forecast. Irrigate morning or evening, keep 2–3 cm of water on rice, and limit midday field work.' } });
  }
  // Cold wave: matters for Boro seedbeds and tomato
  const cold = days.filter((d) => d.min <= 10);
  if (cold.length && (crops.has('boro') || crops.has('tomato'))) {
    const low = Math.min(...cold.map((d) => d.min));
    out.push({ id: 'cold', kind: 'cold', level: low < 8 ? 'high' : 'medium', dates: cold.map((d) => d.date), value: low, crop: crops.has('boro') ? 'boro' : 'tomato',
      title: { bn: low < 6 ? 'তীব্র শৈত্যপ্রবাহের পূর্বাভাস' : low < 8 ? 'মাঝারি শৈত্যপ্রবাহের পূর্বাভাস' : 'মৃদু শৈত্যপ্রবাহের পূর্বাভাস', en: low < 6 ? 'Severe cold wave forecast' : low < 8 ? 'Moderate cold wave forecast' : 'Mild cold wave forecast' },
      rule: { bn: 'আবহাওয়া অধিদপ্তর: ৮–১০° মৃদু, ৬–৭.৯° মাঝারি, ৬°-এর নিচে তীব্র শৈত্যপ্রবাহ', en: 'BMD: 8–10 °C mild, 6–7.9 °C moderate, below 6 °C severe cold wave' },
      advice: { bn: 'শৈত্যপ্রবাহের পূর্বাভাস আছে। বোরোর বীজতলা রাতে স্বচ্ছ পলিথিনে ঢেকে দিন, সকালে খুলে দিন; বীজতলায় পানি ধরে রাখুন। টমেটোর গোড়ায় হালকা সেচ দিন।', en: 'A cold wave is forecast. Cover Boro seedbeds with clear polythene at night and open them in the morning; keep water in the seedbed. Give tomatoes a light irrigation.' } });
  }
  // Late blight (Hutton criteria) on tomato
  if (crops.has('tomato')) {
    const ok = days.map((d) => { const hs = hoursOf(fc, d.date); return hs.length >= 18 && d.min >= 10 && humidHours(hs) >= 6; });
    const periods = [];
    for (let i = 1; i < days.length; i++) if (ok[i] && ok[i - 1]) periods.push(days[i].date);
    if (periods.length) {
      const first = days.findIndex((d) => d.date === periods[0]) - 1;
      const hh = humidHours(hoursOf(fc, days[first].date));
      out.push({ id: 'late_blight', kind: 'disease', level: 'high', dates: [days[first].date, ...periods], value: hh, crop: 'tomato',
        title: { bn: 'টমেটোর নাবি ধসা (মড়ক) রোগের আবহাওয়া', en: 'Late blight weather for tomato' },
        rule: { bn: 'হাটন মাপকাঠি: পরপর দুই দিন, প্রতিদিন সর্বনিম্ন তাপমাত্রা ১০° বা বেশি আর অন্তত ৬ ঘণ্টা আর্দ্রতা ৯০% বা বেশি', en: 'Hutton criteria: two days in a row, each with a minimum of 10 °C or more and at least 6 hours at 90%+ humidity' },
        advice: { bn: 'আগামী দিনগুলোতে টমেটোর নাবি ধসা রোগের উপযোগী আবহাওয়া (কুয়াশা, ভেজা পাতা)। রোজ সকালে পাতা দেখুন; কালচে ভেজা দাগ দেখলেই আক্রান্ত গাছ তুলে পুঁতে ফেলুন আর কৃষি অফিসে জানান। সেচ দিন দিনের বেলায়, পাতা ভেজাবেন না।', en: 'The coming days suit late blight on tomato (fog, wet leaves). Check leaves every morning; at the first dark water-soaked patch, pull and bury the plant and tell the agriculture office. Irrigate in daytime and keep the leaves dry.' } });
    }
  }
  // Wheat blast at heading (February–March)
  if (crops.has('wheat') && (month === 2 || month === 3)) {
    const risky = days.filter((d) => { const hs = hoursOf(fc, d.date); const mean = hs.reduce((a, h) => a + h.temp, 0) / Math.max(1, hs.length); return mean >= 25 && mean <= 30 && humidHours(hs) >= 10; });
    if (risky.length) out.push({ id: 'wheat_blast', kind: 'disease', level: 'high', dates: risky.map((d) => d.date), value: risky.length, crop: 'wheat',
      title: { bn: 'গমের ব্লাস্ট রোগের আবহাওয়া', en: 'Wheat blast weather' },
      rule: { bn: 'শিষ আসার সময় গড় তাপমাত্রা ২৫–৩০° আর ১০ ঘণ্টা বা বেশি আর্দ্রতা ৯০% বা বেশি', en: 'At heading, a mean of 25–30 °C with 10 hours or more at 90%+ humidity' },
      advice: { bn: 'গমের শিষ আসার সময় ব্লাস্ট রোগের উপযোগী গরম-ভেজা আবহাওয়া। শিষের ওপরের অংশ সাদা হয়ে শুকাচ্ছে কিনা রোজ দেখুন; দেখা দিলেই কৃষি অফিসে জানান, তাঁরা অনুমোদিত ছত্রাকনাশকের পরামর্শ দেবেন।', en: 'Warm, wet weather at heading suits wheat blast. Check daily for ears bleaching from the top; report it at once and the agriculture office will advise an approved fungicide.' } });
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1));
}
