// FieldShift inside "মাঠের মানুষ": what the game's FieldShift station shows about the player's own place, built only
// from the app's real records and engine. Each game farmer farms a real place: the seven Bangladesh farmers their
// upazila, the five neighbours their country's farm point. For that place:
//   from space   MODIS NDVI (the green cycle, when fields lie bare, Rabi seasons of vegetation stress), MODIS ground
//                heat, MERRA-2 evapotranspiration, SMAP root-zone soil moisture against its usual, GRACE / GRACE-FO
//                stored water and its trend, GPM IMERG rain (the monsoon's start, or the year's rain), cold and heat
//                from BMD station normals or NASA POWER, and how the satellite records compare with the ground.
//   what if      a temperature and rain change for the sliders, in the shape Field Future and the abroad engine take.
//   the season   how the player's own rotation went: crops kept turning or repeated, legumes, bare soil in the storm.
// The rotation strategies themselves come from engine/soilfuture.js (Bangladesh) and engine/rotationAbroad.js.
// Pure (no React, no drawing), so Node tests can run it. [REAL data in, RULE logic]
import { landSummary } from '../engine/landsat.js';
import { graceRecord, smapNow, smapVsPower } from '../engine/soilwater.js';
import { num, MONTHS_BN, MONTHS_EN } from '../engine/dates.js';
import WATER from '../data/water/water_sat.json' with { type: 'json' };
import WET from '../data/water/soil_wetness.json' with { type: 'json' };
import STATIONS from '../data/climate/station_normals.json' with { type: 'json' };
import VALID from '../data/radar/onset_validation.json' with { type: 'json' };
import O_GDG from '../data/radar/onset_godagari.json' with { type: 'json' };
import O_DHM from '../data/radar/onset_dhamrai.json' with { type: 'json' };
import O_STK from '../data/radar/onset_sitakunda.json' with { type: 'json' };
import O_DCP from '../data/radar/onset_dacope.json' with { type: 'json' };
import O_BKG from '../data/radar/onset_bakerganj.json' with { type: 'json' };
import O_GNC from '../data/radar/onset_gangachara.json' with { type: 'json' };
import O_GWG from '../data/radar/onset_gowainghat.json' with { type: 'json' };

const q = (bn, en) => ({ bn, en });
const ONSET = { godagari: O_GDG, dhamrai: O_DHM, sitakunda: O_STK, dacope: O_DCP, bakerganj: O_BKG, gangachara: O_GNC, gowainghat: O_GWG };
const n = (v, dp = 0) => q(num(v, 'bn', { dp }), num(v, 'en', { dp }));
const month = (m) => q(MONTHS_BN[m - 1], MONTHS_EN[m - 1]);
const months = (ms) => q(ms.map((m) => MONTHS_BN[m - 1]).join(', '), ms.map((m) => MONTHS_EN[m - 1]).join(', '));
const signed = (v, dp = 1) => { const r = Math.round(v * 10 ** dp) / 10 ** dp; return q(`${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), 'bn', { dp })}`, `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), 'en', { dp })}`); };
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);
const join = (...parts) => q(parts.map((p) => (typeof p === 'string' ? p : p.bn)).join(''), parts.map((p) => (typeof p === 'string' ? p : p.en)).join(''));

// ── where each game farmer farms ──
// The Bangladesh farmers are the app's sample farms, one per upazila (src/data/demo.js); the neighbours farm the
// country's farm point in src/data/abroad/<country>.json.
export const UPAZILA_OF = { razib: 'dhamrai', rahimu: 'godagari', didarul: 'sitakunda', prahlad: 'dacope', kader: 'bakerganj', mofizul: 'gangachara', rahima: 'gowainghat' };
// ...and their own sample farm there (demo.js farmers): its union's soil, its irrigation and last season's Rabi crop
export const FARM_OF = { razib: 'RAZIB', rahimu: 'RAHIM', didarul: 'DIDARUL', prahlad: 'PRAHLAD', kader: 'KADER', mofizul: 'MOFIZUL', rahima: 'RAHIMA' };
export function placeOf(R, id) {
  if (UPAZILA_OF[id]) return { kind: 'bd', id: UPAZILA_OF[id], name: R.place };
  return { kind: 'abroad', id: R.country, name: R.place };
}

// ── from space: one card per question the challenge asks of the data ──
// normals: for a neighbour, its farm point's monthly NASA POWER normals ({ m, tmax, tmin, rain, rainImerg, et0 }).
// Each card: { id, sat, title, value, detail, term, tag, bars?, hi? } with bilingual text; bars are twelve monthly
// values (January first) and hi the months to highlight.
export function spaceFacts(place, normals = null) {
  const id = place.id, cards = [];
  const land = landSummary(id);
  if (land) {
    const { cycle, lean } = land.green;
    const low = Math.min(...cycle.filter((v) => v != null));
    const stress = land.stressYears.slice(-4);
    cards.push({
      id: 'bare', sat: 'MODIS NDVI', tag: 'REAL', bars: cycle, hi: lean,
      title: q('জমি কখন খালি থাকে', 'When the fields lie bare'),
      value: join(q('সবচেয়ে কম সবুজ: ', 'Least green: '), months(lean), q(` (NDVI প্রায় ${num(low, 'bn', { dp: 2 })})`, ` (NDVI about ${num(low, 'en', { dp: 2 })})`)),
      detail: stress.length
        ? join(q('রবি মৌসুমে গাছ স্বাভাবিকের চেয়ে অনেক কম সবুজ ছিল: ', 'Rabi seasons when the crops were far less green than usual: '), q(stress.map((y) => num(y, 'bn')).join(', '), stress.join(', ')), q('। এমন বছরে খরা, গরম বা দেরিতে বোনা ফসল খুঁজুন।', '. Look for drought, heat or a late crop in those years.'))
        : q('গত মৌসুমগুলোতে বড় কোনো চাপের বছর দেখা যায়নি।', 'No season of clear vegetation stress in the record.'),
      term: q('NDVI: পাতা লাল আলো শুষে নেয় আর অদৃশ্য অবলোহিত আলো ফিরিয়ে দেয়; উপগ্রহ দুটোর তফাত মেপে বলে মাঠ কতটা সবুজ (০ খালি মাটি, ০.৮ ঘন ফসল)। খালি মাসগুলোই আবরণ ফসল বা ডাল বোনার সুযোগ।', 'NDVI: leaves soak up red light and reflect invisible near-infrared; the satellite measures the difference to tell how green the land is (0 bare soil, 0.8 a dense crop). The bare months are the chance for a cover crop or a pulse.'),
    });
    const h = land.heat;
    if (h.then != null && h.now != null) {
      const hot = land.lstCycle.map((v, i) => [v, i + 1]).filter(([v]) => v != null).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, m]) => m).sort((a, b) => a - b);
      cards.push({
        id: 'heat', sat: 'MODIS LST', tag: 'REAL', bars: land.lstCycle, hi: hot,
        title: q('মাটির ওপরের গরম', 'Heat at the ground'),
        value: join(q('চৈত্র-বৈশাখে (মার্চ–মে) দুপুরের মাটি ', 'March–May midday ground '), n(h.then, 1), q(' থেকে ', ' → '), n(h.now, 1), q(' °সে', ' °C'), q(` (${signed(h.change).bn})`, ` (${signed(h.change).en})`)),
        detail: join(q('সবচেয়ে গরম মাস: ', 'Hottest months: '), months(hot), q('। এ সময় যে ফসলে ফুল আসে, সেটাই সবচেয়ে বেশি ঝুঁকিতে।', '. A crop that flowers then is most at risk.')),
        term: q('ভূপৃষ্ঠের তাপমাত্রা (LST): বাতাস নয়, মাটি আর পাতার নিজের তাপ, যা গাছ সরাসরি টের পায়। নাসার ECOSTRESS একই তাপ ৭০ মিটারে, জমি ধরে মাপে, তবে ২০১৮ থেকে; এখানে MODIS-এর ২৫ বছরের রেকর্ড।', 'Land surface temperature (LST): not the air but the soil and leaves themselves, the heat a crop feels. NASA’s ECOSTRESS measures the same heat field by field at 70 m, but only since 2018; this card uses MODIS’s 25-year record.'),
      });
    }
    const year = Math.round(land.evapYear);
    cards.push({
      id: 'et', sat: 'MERRA-2', tag: 'REAL', bars: land.evapCycle,
      hi: land.evapCycle.map((v, i) => [v, i + 1]).filter(([v]) => v != null).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, m]) => m),
      title: q('মাটি আর গাছ থেকে কত পানি উড়ে যায়', 'How much water the land breathes out'),
      value: q(`বছরে প্রায় ${num(year, 'bn')} মিমি`, `About ${num(year, 'en')} mm a year`),
      detail: q('যে মাসে বেশি উড়ে যায়, সে মাসে সেচের ফসলের খরচও বেশি।', 'The months that lose the most are the months an irrigated crop costs most.'),
      term: q('বাষ্পীভবন-প্রস্বেদন (ET): মাটি থেকে বাষ্প আর পাতা থেকে প্রস্বেদন মিলিয়ে যত পানি বাতাসে যায়। বৃষ্টি বিয়োগ ET = জমির পানির হিসাব।', 'Evapotranspiration (ET): the water that leaves as vapour from the soil and through the leaves together. Rain minus ET is the field’s water balance.'),
    });
  }
  const sm = smapNow(WATER, id);
  if (sm) {
    const check = place.kind === 'bd' ? smapVsPower(WATER, WET, id) : null;
    const [y, m] = sm.month.split('-').map(Number);
    cards.push({
      id: 'soil', sat: 'SMAP', tag: 'REAL',
      title: q('শিকড়ের কাছে মাটির পানি', 'Water in the root zone'),
      value: join(month(m), q(` ${num(y, 'bn')}: `, ` ${y}: `), n(sm.value, 2), q(' m³/m³', ' m³/m³'), sm.pct != null ? q(` · স্বাভাবিকের চেয়ে ${signed(sm.pct, 0).bn}%`, ` · ${signed(sm.pct, 0).en}% against the usual`) : q('', '')),
      detail: check
        ? q(`যাচাই: নাসা POWER-এর আলাদা মডেলের সঙ্গে ${num(check.n, 'bn')} মাসে মিল r = ${num(check.r, 'bn', { dp: 2 })}।`, `Check: against NASA POWER’s separate model over ${check.n} months, r = ${check.r.toFixed(2)}.`)
        : q(`একই মাসের আগের ${num(sm.n, 'bn')} বছরের সঙ্গে তুলনা।`, `Compared with the same month in ${sm.n} earlier years.`),
      term: q('মাটির আর্দ্রতার অসঙ্গতি (anomaly): আজকের ভেজা ভাব ওই মাসের স্বাভাবিকের চেয়ে কত বেশি বা কম। কম মানে সেচ বা খরা-সহনশীল ফসলের কথা ভাবার সময়।', 'Soil moisture anomaly: how much wetter or drier the soil is than that month usually is. Below the usual is the time to think of irrigation or a drought-tolerant crop.'),
    });
  }
  const gr = graceRecord(WATER, id);
  if (gr?.trend) {
    const sure = { sure: q('প্রায় নিশ্চিত', 'almost certain'), likely: q('সম্ভবত', 'likely'), unclear: q('অনিশ্চিত', 'uncertain') }[gr.trend.sure];
    cards.push({
      id: 'grace', sat: 'GRACE / GRACE-FO', tag: 'REAL',
      title: q('মাটির নিচে জমা পানি', 'Water stored under the land'),
      value: q(`প্রতি দশকে ${signed(gr.trend.perDecade).bn} সেমি পানি (${sure.bn})`, `${signed(gr.trend.perDecade).en} cm of water a decade (${sure.en})`),
      detail: gr.change != null ? q(`২০০৩–০৭ থেকে ২০১৬-এর পরে: ${signed(gr.change).bn} সেমি।${gr.trend.perDecade < 0 ? ' পানি কমছে: কম পানির ফসলচক্র এখানে বেশি জরুরি।' : ''}`, `2003–07 to after 2016: ${signed(gr.change).en} cm.${gr.trend.perDecade < 0 ? ' The water is falling: a thriftier rotation matters more here.' : ''}`) : q('', ''),
      term: q('GRACE: দুটি উপগ্রহ একে অপরের দূরত্ব মেপে পৃথিবীর টান বোঝে; পানি বাড়লে টান বাড়ে। এতে নদী, মাটি আর মাটির নিচের সব পানি মিলিয়ে বিশাল এলাকার হিসাব আসে, এক জমির নয়। প্রবণতার নিশ্চয়তা Mann-Kendall পরীক্ষায়।', 'GRACE: two satellites measure the distance between them to feel Earth’s pull; more water pulls harder. It sums the rivers, soil and groundwater of a wide area, not one field. The trend’s confidence is a Mann-Kendall test.'),
    });
  }
  // rain: the monsoon's start each year from GPM IMERG (Bangladesh), or the year's rain in two NASA records (abroad)
  const on = ONSET[id];
  if (on) {
    const days = on.years.map((r) => r.imerg).filter((x) => x?.complete).map((x) => x.doy);
    const sorted = [...days].sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    const last = on.years.filter((r) => r.imerg?.complete).slice(-1)[0];
    const date = (doy) => { const d = new Date(Date.UTC(2001, 0, doy)); return q(`${num(d.getUTCDate(), 'bn')} ${MONTHS_BN[d.getUTCMonth()]}`, `${d.getUTCDate()} ${MONTHS_EN[d.getUTCMonth()]}`); };
    cards.push({
      id: 'rain', sat: 'GPM IMERG', tag: 'REAL',
      title: q('বর্ষা কবে আসে', 'When the monsoon arrives'),
      value: join(q('সাধারণত ', 'Usually '), date(med), q(`; ${num(last.year, 'bn')}-এ `, `; in ${last.year} `), date(last.imerg.doy)),
      detail: q(`${num(sorted.length, 'bn')} বছরে আগে-পরে ${num(Math.round((sorted[Math.floor(sorted.length * 0.9)] - sorted[Math.floor(sorted.length * 0.1)]) / 7), 'bn')} সপ্তাহ পর্যন্ত সরে যায়: আউশ আর আমন বোনার দিন এর ওপর।`, `It shifts by up to ${Math.round((sorted[Math.floor(sorted.length * 0.9)] - sorted[Math.floor(sorted.length * 0.1)]) / 7)} weeks over ${sorted.length} years: Aus and Aman sowing depend on it.`),
      term: q('GPM IMERG: অনেকগুলো উপগ্রহের রাডার আর মাইক্রোওয়েভ মিলিয়ে প্রতি আধা ঘণ্টায় ১০ কিমি ঘরে বৃষ্টির হিসাব। বর্ষা শুরু = টানা ভেজা দিন, তার পরে বড় শুকনো ফাঁক নেই।', 'GPM IMERG: rain every half hour on a 10 km grid, from many satellites’ radar and microwave sensors together. Monsoon onset = a run of wet days with no long dry gap after it.'),
    });
  } else if (normals?.length === 12) {
    const imerg = normals.reduce((a, x) => a + (x.rainImerg ?? 0), 0), power = normals.reduce((a, x) => a + (x.rain ?? 0), 0);
    const wet = normals.map((x) => [x.rainImerg ?? x.rain, x.m]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, m]) => m).sort((a, b) => a - b);
    cards.push({
      id: 'rain', sat: 'GPM IMERG', tag: 'REAL', bars: normals.map((x) => x.rainImerg ?? x.rain), hi: wet,
      title: q('বছরের বৃষ্টি', 'The year’s rain'),
      value: q(`বছরে প্রায় ${num(Math.round(imerg), 'bn')} মিমি; সবচেয়ে বেশি ${months(wet).bn}`, `About ${num(Math.round(imerg), 'en')} mm a year; most in ${months(wet).en}`),
      detail: q(`ইউরোপের ERA5 আবহাওয়া-মডেল বলে ${num(Math.round(power), 'bn')} মিমি: দুটি রেকর্ডে ${num(Math.abs(Math.round((imerg / power - 1) * 100)), 'bn')}% তফাত।`, `Europe’s ERA5 weather reanalysis says ${num(Math.round(power), 'en')} mm: the two records differ by ${Math.abs(Math.round((imerg / power - 1) * 100))}%.`),
      term: q('GPM IMERG: অনেকগুলো উপগ্রহের রাডার আর মাইক্রোওয়েভ মিলিয়ে বৃষ্টির হিসাব; ERA5 একটি আবহাওয়া-মডেল, মাপা তথ্যের সঙ্গে মেলানো। দুটোর তফাতই অনিশ্চয়তার মাপ।', 'GPM IMERG: rain from many satellites’ radar and microwave sensors; ERA5 is a weather model fitted to observations. The gap between them is a measure of the uncertainty.'),
    });
  }
  // cold and heat for the crops: BMD's own station normals in Bangladesh (ground truth), NASA POWER abroad
  const st = place.kind === 'bd' ? STATIONS.stations[id] : null;
  const tmin = st ? st.tmin : normals?.map((x) => x.tmin), tmax = st ? st.tmax : normals?.map((x) => x.tmax);
  if (tmin?.length === 12) {
    const cold = tmin.indexOf(Math.min(...tmin)) + 1, coldT = Math.min(...tmin), hot = tmax.indexOf(Math.max(...tmax)) + 1, hotT = Math.max(...tmax);
    const frost = coldT <= 3 ? 'likely' : coldT <= 8 ? 'rare' : 'none';
    cards.push({
      id: 'frost', sat: st ? 'BMD' : 'ERA5', tag: 'REAL',
      title: q('তুষারপাত আর তাপের চাপ', 'Frost and heat stress'),
      value: q(`সবচেয়ে ঠান্ডা ${MONTHS_BN[cold - 1]}: রাতে গড়ে ${num(coldT, 'bn', { dp: 1 })} °সে · সবচেয়ে গরম ${MONTHS_BN[hot - 1]}: দিনে ${num(hotT, 'bn', { dp: 1 })} °সে`, `Coldest ${MONTHS_EN[cold - 1]}: nights average ${coldT.toFixed(1)} °C · hottest ${MONTHS_EN[hot - 1]}: days ${hotT.toFixed(1)} °C`),
      detail: {
        likely: q('শীতের রাতে তুষারপাতের ঝুঁকি আছে: আলু, ডাল আর ফুল আসা ফসল ঢেকে রাখুন, দেরিতে বুনুন।', 'Frost is likely on winter nights: cover potatoes, pulses and flowering crops, or sow later.'),
        rare: q('তুষারপাত বিরল, তবে কুয়াশা আর ঠান্ডা ঢেউয়ে চারা আর ফুল ক্ষতিগ্রস্ত হতে পারে।', 'Frost is rare, but fog and cold waves can still hurt seedlings and flowers.'),
        none: q('তুষারপাতের ঝুঁকি নেই।', 'No frost risk.'),
      }[frost],
      frost,
      term: q(`তুষারপাতের ঝুঁকি: পাতার ওপর তাপ ০ °সে-এ নামলে কোষ জমে ফেটে যায়; মাসের রাতের গড় ৩ °সে-এর নিচে মানে এমন রাত প্রায়ই আসে (নিয়ম)। ${st ? 'এই সংখ্যা বাংলাদেশ আবহাওয়া অধিদপ্তরের মাটির কেন্দ্রের (৩০ বছরের গড়)।' : 'এই সংখ্যা ERA5 আবহাওয়া-মডেলের (২০০১–২০২৫)।'}`, `Frost risk: when a leaf falls to 0 °C its cells freeze and burst; a month whose nights average below 3 °C has such nights often (a rule). ${st ? 'These numbers are the Bangladesh Meteorological Department’s ground station (30-year normals).' : 'These numbers are from the ERA5 reanalysis (2001–2025).'}`),
    });
  }
  // satellites against the ground
  const v = VALID.rows.find((r) => r.upazila === id);
  cards.push({
    id: 'truth', sat: q('উপগ্রহ বনাম মাটি', 'Satellite vs ground'), tag: v ? 'REAL' : 'RULE',
    title: q('উপগ্রহ আর মাটির মাপ কেন মেলাতে হয়', 'Why satellites and the ground are combined'),
    value: v
      ? q(`${v.station} কেন্দ্র: বর্ষা শুরু মাটির মাপে গড়ে দিন ${num(v.bmdD1, 'bn')}, উপগ্রহে ${num(Math.round(v.ours.mean), 'bn')}: তফাত ${num(Math.abs(v.diffOurs), 'bn')} দিন।`, `${v.station} station: the monsoon starts on day ${v.bmdD1} by the rain gauge and day ${Math.round(v.ours.mean)} by satellite: ${Math.abs(v.diffOurs)} days apart.`)
      : st ? q(`এই অ্যাপ নাসা POWER-এর তাপমাত্রা ${st.name.bn}-এর মাপে সংশোধন করে নেয়।`, `This app corrects NASA POWER’s temperatures to ${st.name.en}.`) : q('উপগ্রহের হিসাব মাঠের মাপের সঙ্গে মিলিয়ে নিতে হয়।', 'Satellite estimates need checking against measurements on the ground.'),
    detail: q('উপগ্রহ পুরো এলাকা প্রতিদিন দেখে, কিন্তু এক ঘরে কয়েক কিলোমিটার গড়ে; মাটির যন্ত্র এক জায়গায় ঠিক মাপে, কিন্তু দূরে কম। দুটো মিলিয়েই সবচেয়ে ভালো হিসাব।', 'A satellite sees the whole area every day but averages kilometres in one pixel; a ground gauge is exact at one spot but says less about the next village. Combined, they give the best estimate.'),
    term: q('তাই এই হিসাব আপনার জমির নিজের মাপ নয়: একটা মাটি পরীক্ষা, একটা বৃষ্টি-মাপক আর আপনার অভিজ্ঞতা এটাকে ঠিক করবে।', 'So these numbers are not your own field’s measurements: a soil test, a rain gauge and your own experience will correct them.'),
  });
  return cards;
}

// ── what if: a uniform change for the sliders, the same shape as climateChange() gives Field Future ──
export function sliderChange(dT, rainPct) {
  if (!dT && !rainPct) return null;
  return { scenario: 'slider', dTmax: Array(12).fill(dT), dTmin: Array(12).fill(dT), rain: Array(12).fill(1 + rainPct / 100), dT: { med: dT, min: dT, max: dT }, rainPct: { med: rainPct, min: rainPct, max: rainPct } };
}
// The same change for the 3D season: hotter heatwaves, and soil that dries faster with less rain (or slower with
// more). Game strengths, not physics: a 3 °C warmer season makes the heatwave 60% stronger.
export const sliderMods = (dT, rainPct) => ({ heat: 1 + dT * 0.2, dry: Math.max(0.6, 1 - rainPct / 100) });

// ── a brief for each neighbour's rotation option (engine/rotationAbroad.js), as briefs.js gives Bangladesh ──
const LEGUMES = ['chickpea', 'lentil', 'mungbean', 'pea', 'pigeonpea', 'groundnut', 'gram', 'soybean', 'blackgram'];
// fut: judge by the 2040s (or what-if) numbers, as the cards do when that weather is chosen. prices: the country's
// row of abroad_prices.json, to say where a price is old.
export function abroadBrief(o, habit, cropName, fut = false, prices = null) {
  const why = [], evidence = [], benefits = [], gaps = [], risks = [];
  const soil = (x) => (fut ? x.dSocFut ?? x.dSoc : x.dSoc), d = soil(o) - soil(habit);
  const water = (x) => (fut ? x.waterFut ?? x.waterMm : x.waterMm);
  const dW = water(o) != null && water(habit) != null ? water(habit) - water(o) : null; // mm a year saved (+) or used (−)
  const dG = o.gross != null && habit.gross != null ? o.gross - habit.gross : null, cur = prices?.symbol ?? '';
  const money = (v) => q(`${cur}${num(Math.round(Math.abs(v)), 'bn')}`, `${cur}${num(Math.round(Math.abs(v)), 'en')}`);
  const legume = o.crops.filter((k) => LEGUMES.includes(k));
  const names = (ks) => q(ks.map((k) => cropName(k).bn).join(', '), ks.map((k) => cropName(k).en).join(', '));
  if (o.habit) why.push(q('এখন এই খামারে যা চাষ হয়, তুলনার ভিত্তি।', 'What this farm grows now, the baseline to compare against.'));
  else {
    if (d > 0.5) why.push(q(`দশ বছরে মাটির জৈব কার্বন এখনকার চাষের চেয়ে ${num(d, 'bn', { dp: 1 })}% বেশি থাকে।`, `Over ten years the soil keeps ${d.toFixed(1)}% more organic carbon than farming as now.`));
    if (o.residue === 'retain') why.push(q('খড় পোড়ানো বা তুলে নেওয়ার বদলে জমিতে মেশানো হয়।', 'The straw is worked back in instead of burnt or removed.'));
    if (legume.length) why.push(join(q('ডাল জাতীয় ফসল (', 'A legume ('), names(legume), q(') বাতাসের নাইট্রোজেন মাটিতে ধরে।', ') fixes nitrogen from the air into the soil.')));
    if (o.families > habit.families) why.push(q('বেশি রকমের ফসল: রোগ-পোকার চক্র ভাঙে।', 'More kinds of crop: it breaks pest and disease cycles.'));
    if (dW > 20) why.push(q(`বছরে প্রায় ${num(Math.round(dW), 'bn')} মিমি কম সেচ (হেক্টরে ${num(Math.round(dW * 10), 'bn')} ঘনমিটার)।`, `About ${Math.round(dW)} mm less irrigation a year (${Math.round(dW * 10)} m³ a hectare).`));
  }
  evidence.push(q('মাটির কার্বন: ICBM মডেল, শুরু ISRIC SoilGrids-এর মাটি থেকে; ফলন FAOSTAT।', 'Soil carbon: the ICBM model, starting from ISRIC SoilGrids soil; yields from FAOSTAT.'));
  evidence.push(q('২০৪০-এর দশক: নাসা NEX-GDDP-CMIP6 আটটি মডেলের গড় পরিবর্তন, খামারের ERA5 আবহাওয়ায়।', 'The 2040s: NASA NEX-GDDP-CMIP6, the median change of eight models, on the farm’s ERA5 weather.'));
  if (o.ch4 > 0) evidence.push(q('ধানের মিথেন: IPCC ২০১৯-এর পদ্ধতি।', 'Paddy methane: the IPCC 2019 method.'));
  if (o.waterMm != null) evidence.push(q(`সেচ: FAO-56 পদ্ধতি, খামারের ERA5 বাষ্পীভবন আর নাসা GPM IMERG বৃষ্টিতে, বছরে প্রায় ${num(Math.round(water(o)), 'bn')} মিমি।`, `Irrigation: the FAO-56 method on the farm’s ERA5 evaporation and NASA GPM IMERG rain, about ${Math.round(water(o))} mm a year.`));
  if (o.gross != null) evidence.push(q(`ফসলের দাম: FAOSTAT-এর কৃষকের দাম × FAOSTAT ফলন, হেক্টরে বছরে প্রায় ${money(o.gross).bn}।`, `Harvest value: FAOSTAT farm-gate prices × FAOSTAT yields, about ${money(o.gross).en} a hectare a year.`));
  if (o.nFix > 0) benefits.push(q(`হেক্টরে বছরে প্রায় ${num(Math.round(o.nFix), 'bn')} কেজি নাইট্রোজেন বিনা খরচে।`, `About ${Math.round(o.nFix)} kg of nitrogen a hectare a year for free.`));
  if (d > 0.5) benefits.push(q('মাটি ধীরে ধীরে উর্বর আর পানি ধরে রাখতে পারে।', 'The soil slowly grows richer and holds more water.'));
  if (o.net < habit.net) benefits.push(q('গ্রিনহাউস গ্যাস কম।', 'Fewer greenhouse gases.'));
  if (o.habit) benefits.push(q('চেনা ফসল, চেনা বাজার।', 'Familiar crops and markets.'));
  if (!o.habit && dW > 20) benefits.push(q(`পানি: বছরে প্রায় ${num(Math.round(dW), 'bn')} মিমি কম সেচ, পাম্পের খরচ আর মাটির নিচের পানি বাঁচে।`, `Water: about ${Math.round(dW)} mm less irrigation a year, saving pumping and groundwater.`));
  if (!o.habit && dG > 0) benefits.push(q(`ফসলের দাম: হেক্টরে বছরে প্রায় ${money(dG).bn} বেশি।`, `Harvest value: about ${money(dG).en} more a hectare a year.`));
  gaps.push(q('উৎপাদন খরচ (বীজ, সার, সেচ, মজুরি) এই দেশের জন্য জানা নেই: দেখানো আয় ফসলের মোট দাম, লাভ নয়।', 'Production costs (seed, fertiliser, water, labour) are not known for this country: the income shown is the harvest’s gross value, not profit.'));
  const old = prices ? o.crops.filter((k) => prices.crops[k]?.indexFactor != null) : [];
  if (old.length) gaps.push(join(q('পুরোনো দাম: ', 'Old prices: '), q(old.map((k) => `${cropName(k).bn} (${num(prices.crops[k].lastYear, 'bn')})`).join(', '), old.map((k) => `${cropName(k).en} (${prices.crops[k].lastYear})`).join(', ')), q(' — শেষ জানা দাম FAOSTAT-এর দাম-সূচকে আজকের দামে আনা।', ' — the last reported price brought to today with FAOSTAT’s price index.')));
  if (o.unpriced?.length) gaps.push(join(q('দাম জানা নেই: ', 'No price known: '), names(o.unpriced), q('; আয়ে শূন্য ধরা।', '; counted as zero income.')));
  gaps.push(q('ফলন দেশের গড়, এই খামারের নয়; সেচের হিসাবে চুইয়ে যাওয়া পানি ধরা হয়নি।', 'Yields are national averages, not this farm’s; the irrigation leaves out water lost to seepage.'));
  if (!o.habit && dW < -20) risks.push(q(`এখনকার চাষের চেয়ে বছরে প্রায় ${num(Math.round(-dW), 'bn')} মিমি বেশি সেচ লাগে।`, `About ${Math.round(-dW)} mm more irrigation a year than farming as now.`));
  if (!o.habit && dG < 0) risks.push(q(`ফসলের দাম হেক্টরে বছরে প্রায় ${money(dG).bn} কম।`, `About ${money(dG).en} less harvest value a hectare a year.`));
  if (!o.habit) risks.push(q('নতুন ফসলের বাজার, বীজ আর যন্ত্র স্থানীয় কৃষি অফিসের সঙ্গে মিলিয়ে নিন।', 'Check the market, seed and machines for a new crop with the local agriculture office.'));
  risks.push(q('এটা মডেলের হিসাব, পূর্বাভাস নয়; অভিজ্ঞ কৃষক আর কৃষি কর্মকর্তার সঙ্গে কথা বলুন।', 'These are model estimates, not forecasts; talk to experienced farmers and an agriculture officer.'));
  return { why, evidence, benefits, gaps, risks };
}

// ── the season the player farmed ──
// What the game's own rotation taught: crops kept turning on a plot or the same one again, legumes harvested, bare
// plots that lost topsoil in the storm, and how rich the soil ended (plot fertility 0–0.6, legumes raise it).
export function seasonReport(g) {
  const c = g.count;
  const planted = [...new Set(g.plots.map((p) => p.last).filter(Boolean).concat(g.plots.map((p) => p.crop).filter(Boolean)))];
  const soil = Math.round((mean(g.plots.map((p) => p.fert)) / 0.6) * 100);
  const tips = [];
  if (c.repeats > c.rotated) tips.push(q('একই জমিতে একই ফসল বারবার: পোকা সেই ফসলের জন্য অপেক্ষা করে থাকে। ফসল বদলালে পোকার চক্র ভাঙে।', 'The same crop on the same plot again and again: its pests wait for it. Changing the crop breaks their cycle.'));
  if (!c.legumes) tips.push(q('কোনো ডাল ফসল তোলেননি: ডাল (মসুর, ছোলা, মুগ) শিকড়ে নাইট্রোজেন ধরে, পরের ফসলের সার বাঁচায়।', 'No legume harvested: a pulse (lentil, chickpea, mungbean) fixes nitrogen in its roots and saves fertiliser for the next crop.'));
  if (c.eroded) tips.push(q('ঝড়ের সময় খালি জমির মাটি ধুয়ে গেছে: খালি মাসে আবরণ ফসল মাটি ধরে রাখে।', 'Bare plots lost soil in the storm: a cover crop in the bare months holds it.'));
  if (!tips.length) tips.push(q('ফসল ঘুরিয়েছেন, ডাল তুলেছেন, জমি ঢেকে রেখেছেন: সুস্থ মাটির চারটি নিয়মের তিনটিই।', 'You turned the crops, grew a legume and kept the soil covered: three of the four rules of healthy soil.'));
  const enriched = g.plots.filter((p) => p.fert > 0.05).length;
  return { kinds: planted.length, planted, rotated: c.rotated, repeats: c.repeats, legumes: c.legumes, eroded: c.eroded, watered: c.watered, soil, enriched, plots: g.plots.length, lost: c.lost, hurt: c.hurt, tips };
}

// What to try next season, from what this one showed: the two lessons the player has not used yet, then the
// weather. Each is { id, title, why } in both languages; 'heat' carries the what-if weather to replay with.
export function nextTry(report, R) {
  const out = [];
  const legume = Object.values(R.crops).find((c) => c.soil);
  if (report.repeats > 0 || report.rotated === 0) out.push({ id: 'rotate', title: q('প্রতিটি জমিতে ফসল বদলান', 'Change the crop on every plot'), why: q(`এবার ${num(report.repeats, 'bn')} বার একই ফসল আবার বুনেছেন; ফসল বদলালে পোকা আগে আসে না।`, `You sowed the same crop again ${report.repeats} times; rotating keeps the pests from striking first.`) });
  if (!report.legumes && legume) out.push({ id: 'legume', title: q(`${legume.bn} বুনে মাটি উর্বর করুন`, `Grow ${legume.en} to feed the soil`), why: q('ডালের শিকড় বাতাসের নাইট্রোজেন ধরে; পরের ফসল তাড়াতাড়ি বাড়ে।', 'A pulse’s roots fix nitrogen from the air; the next crop grows faster.') });
  if (report.eroded > 0) out.push({ id: 'cover', title: q('ঝড়ের আগে খালি জমি ঢাকুন', 'Cover bare plots before the storm'), why: q(`ঝড়ে ${num(report.eroded, 'bn')}টি খালি জমির মাটি ধুয়ে গেছে।`, `The storm washed the soil off ${report.eroded} bare plots.`) });
  if (report.lost > 1 || report.hurt) out.push({ id: 'warn', title: q('সতর্কতা এলেই আগে ব্যবস্থা নিন', 'Act as soon as the warning comes'), why: q(`এবার ${num(report.lost, 'bn')}টি গাছ হারিয়েছেন; FieldShift-এর সতর্কতা আর উপগ্রহ দৃশ্য আগেই বিপদ দেখায়।`, `You lost ${report.lost} plants; FieldShift’s warnings and the satellite view show the danger early.`) });
  out.splice(2);
  out.push({ id: 'heat', title: q('২ °সে গরম মৌসুমে খেলুন', 'Play a season 2 °C hotter'), why: q('নাসার মডেল যে গরম দশকের কথা বলে, সেই আবহাওয়ায় একই কৌশল টেকে কি?', 'Does the same strategy hold in the warmer decade NASA’s models describe?'), whatIf: { dT: 2, rain: -10 } });
  return out;
}
