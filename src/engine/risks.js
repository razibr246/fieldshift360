// What threatens one field, in one place: water gathering (NASA SRTM terrain), soil washing off (SRTM slope and the
// area's bare months from MODIS), heat at Boro flowering and cold nights for seedlings (NASA POWER, station-corrected,
// the last 13 seasons against the 12 before), how dry the Rabi runs (NASA POWER), and how often the area's crops came
// under stress (MODIS NDVI). Each is 0 (low), 1 (some) or 2 (high), with the numbers behind it. Pure. [REAL data in, RULE]
import { num } from './dates.js';
import { terrainRisk } from './briefs.js';

const t = (bn, en) => ({ bn, en });
const lvl = (v, some, high) => (v >= high ? 2 : v >= some ? 1 : 0);
const n = (v, dp = 0) => ({ bn: num(v, 'bn', { dp }), en: num(v, 'en', { dp }) });

// terrain: field_terrain.json row or null; tm: timeMachine(clim) of the field's upazila; land: landSummary(upazila)
// field: fieldGreen(fieldId, upazilaId) or null; when present the stressed seasons are the field's own (250 m).
export function fieldRisks({ terrain, tm, land, field = null }) {
  const out = [];
  const tr = terrainRisk(terrain);
  if (tr) {
    const level = tr.wet === 'coast' || tr.wet === 'hollow' ? 2 : tr.wet === 'some' ? 1 : 0;
    out.push({ k: 'wet', level, src: 'SRTM · ASTER',
      title: t('পানি জমা, বন্যা', 'Water gathering, flooding'),
      value: t(`সমুদ্র থেকে ${n(tr.elev).bn} মিটার, চারপাশের চেয়ে ${n(Math.abs(tr.relief), 1).bn} মিটার ${tr.relief < 0 ? 'নিচু' : 'উঁচু'} (দুই মডেলের অমিল ±${n((tr.spread ?? 0) / 2, 1).bn} মিটার)`, `${n(tr.elev).en} m above sea level, ${n(Math.abs(tr.relief), 1).en} m ${tr.relief < 0 ? 'below' : 'above'} the land round it (the two models differ by ±${n((tr.spread ?? 0) / 2, 1).en} m)`),
      note: level === 2 ? t(tr.wet === 'coast' ? 'নিচু জমি: জোয়ার, বন্যা বা বর্ষার পানি জমার ঝুঁকি; উপকূলে লবণও। নালা আর উঁচু বেড ভেবে দেখুন।' : 'জমি চারপাশের চেয়ে নিচু: ভারী বৃষ্টির পর পানি জমে। সরিষা, ডাল, তিলের মতো ফসলে নালা দরকার।', tr.wet === 'coast' ? 'Low land: tide, flood or monsoon water can stand here, and salt near the coast. Consider drains and raised beds.' : 'The field sits lower than the land round it: water stands after heavy rain. Mustard, pulses and sesame need drains here.')
        : level === 1 ? t('সামান্য নিচু: বড় বৃষ্টির পর নজর রাখুন।', 'Slightly low: watch it after heavy rain.') : t('পানি সহজে নেমে যায়।', 'Water runs off easily.') });
    const bare = land?.green.lean.length ?? 0;
    const elevel = tr.erosion === 'high' ? 2 : tr.erosion === 'some' ? 1 : 0;
    out.push({ k: 'erosion', level: elevel, src: 'SRTM · ASTER · MODIS',
      title: t('মাটি ধুয়ে যাওয়া', 'Soil washing away'),
      value: t(`ঢাল ${n(tr.slope, 2).bn}%; এলাকার জমি বছরে প্রায় ${n(bare).bn} মাস কম সবুজ`, `slope ${n(tr.slope, 2).en}%; the area’s fields are least green about ${bare} months a year`),
      note: elevel ? t('ঢালু জমি: খালি মাসে মাটি ঢেকে রাখুন, ঢাল বরাবর নয়, আড়াআড়ি চাষ দিন।', 'Sloping land: keep it covered in the bare months, and plough across the slope, not down it.')
        : t('সমতল জমি, ধুয়ে যাওয়ার ঝুঁকি কম; তবু খালি মাসে একটা ফসল মাটিকে ভালো রাখে।', 'Flat land, little risk of washing away; still, a crop in the bare months keeps the soil better.') });
  }
  if (tm?.hotMarApr) {
    const now = tm.hotMarApr.now, then = tm.hotMarApr.then;
    out.push({ k: 'heat', level: lvl(now, 5, 15), src: 'NASA POWER',
      title: t('ফুলের সময় গরম', 'Heat at flowering'),
      value: t(`মার্চ-এপ্রিলে বছরে ${n(now, 1).bn} দিন ৩৫°+ (আগে ${n(then, 1).bn})`, `${n(now, 1).en} days of 35 °C+ in March–April a year (${n(then, 1).en} before)`),
      note: t('বোরোর ফুল এই সময়ে আসে; বেশি গরমে ধান চিটা হয়। আগে রোপণ বা তাপ-সহিষ্ণু জাত ভাবুন।', 'Boro flowers in these weeks, and heat leaves the grains empty. Consider earlier transplanting or a heat-tolerant variety.') });
  }
  if (tm?.coldNights) {
    const now = tm.coldNights.now;
    out.push({ k: 'cold', level: lvl(now, 3, 10), src: 'NASA POWER',
      title: t('ঠান্ডা রাত, কুয়াশা', 'Cold nights and fog'),
      value: t(`ডিসেম্বর-জানুয়ারিতে বছরে ${n(now, 1).bn} রাত ১০° বা তার নিচে`, `${n(now, 1).en} nights a year at 10 °C or below in December–January`),
      note: t('বোরোর বীজতলা ঢেকে রাখুন; কুয়াশার ভোরে আলু-সরিষার পাতায় ছত্রাক দেখুন।', 'Cover Boro seedbeds; on foggy mornings check potato and mustard leaves for fungus.') });
  }
  if (tm?.rabiRain) {
    const now = tm.rabiRain.now;
    out.push({ k: 'dry', level: now < 40 ? 2 : now < 100 ? 1 : 0, src: 'NASA POWER',
      title: t('শুকনো রবি', 'A dry Rabi'),
      value: t(`নভেম্বর-ফেব্রুয়ারিতে গড়ে ${n(now).bn} মিমি বৃষ্টি`, `${n(now).en} mm of rain on average from November to February`),
      note: t('রবির ফসল প্রায় পুরোটাই সেচে চলে: কম পানির ফসল আর পাম্পের পালা খরচ বাঁচায়।', 'The Rabi crop runs almost wholly on irrigation: low-water crops and shared pump turns save money.') });
  }
  if (field) {
    const recent = field.stressYears.filter((y) => y >= field.years[1] - 15);
    const vs = field.vsArea;
    out.push({ k: 'stress', level: lvl(recent.length, 1, 3), src: 'MODIS 250 m',
      title: t('এই জমির ফসলের চাপের বছর', 'Years this field’s crop was stressed'),
      value: t(`গত ১৫ বছরে ${n(recent.length).bn}টি রবিতে জমি স্পষ্ট কম সবুজ${vs != null ? `; রবিতে এলাকার চেয়ে ${vs >= 0 ? 'বেশি' : 'কম'} সবুজ (NDVI ${vs >= 0 ? '+' : '−'}${n(Math.abs(vs), 2).bn})` : ''}`, `${recent.length} Rabi seasons in the last 15 years clearly less green${vs != null ? `; ${vs >= 0 ? 'greener' : 'less green'} than the area in the Rabi (NDVI ${vs >= 0 ? '+' : '−'}${n(Math.abs(vs), 2).en})` : ''}`),
      note: recent.length ? t(`বছরগুলো: ${recent.map((y) => n(y).bn.replace(',', '')).join(', ')}। খরা, গরম বা দেরিতে লাগানোর মৌসুম মনে পড়ে কি? এমন বছরে কম ঝুঁকির ফসলচক্র কাজে দেয়।`, `The years: ${recent.join(', ')}. Do you remember drought, heat or late sowing then? A lower-risk rotation pays in such years.`) : t('গত ১৫ বছরে এই জমির কোনো রবি স্পষ্ট চাপে ছিল না।', 'No Rabi in the last 15 years left this field clearly stressed.') });
  } else if (land) {
    const recent = land.stressYears.filter((y) => y >= land.years[1] - 15);
    out.push({ k: 'stress', level: lvl(recent.length, 1, 3), src: 'MODIS',
      title: t('ফসলের চাপের বছর', 'Years the crops were stressed'),
      value: t(`গত ১৫ বছরে ${n(recent.length).bn}টি রবিতে এলাকা স্পষ্ট কম সবুজ`, `${recent.length} Rabi seasons in the last 15 years clearly less green`),
      note: recent.length ? t('খরা, গরম বা দেরিতে লাগানোর মৌসুম: এমন বছরে কম ঝুঁকির ফসলচক্র কাজে দেয়।', 'Seasons of drought, heat or late sowing: a lower-risk rotation pays in such years.') : t('গত ১৫ বছরে স্পষ্ট চাপের রবি দেখা যায়নি।', 'No clearly stressed Rabi in the last 15 years.') });
  }
  return out;
}
