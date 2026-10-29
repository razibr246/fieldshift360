// Every dataset the app uses, in one list: what kind of evidence it is, where it comes from, the years and the ground
// it covers, and whether it goes into the season's calculation or is shown beside it as context. coverage() then says,
// for one field, which of them are there, stale, coarse, sample or missing. Pure; the facts come from the store.
//
// Kinds (shown as labels on the page):
//   SAT      observed by a satellite          STATION  reported by a weather station
//   MODEL    estimated by a model             RECORD   an official or published record (prices, census, yields)
//   RULE     assumed by a rule (thresholds)   DEMO     sample, made up for the demo
export const KINDS = {
  SAT: { bn: 'উপগ্রহে দেখা', en: 'Observed by satellite' },
  STATION: { bn: 'স্টেশনের মাপ', en: 'Reported by a station' },
  MODEL: { bn: 'মডেলের হিসাব', en: 'Estimated by a model' },
  RECORD: { bn: 'প্রকাশিত রেকর্ড', en: 'Published record' },
  RULE: { bn: 'নিয়মে ধরা', en: 'Assumed by a rule' },
  DEMO: { bn: 'নমুনা', en: 'Sample' },
};

const t = (bn, en) => ({ bn, en });
// use: 'calc' goes into a calculation the farmer sees; 'context' is shown beside it but does not change the answer.
export const DATASETS = [
  { id: 'power', kind: 'MODEL', use: 'calc', name: t('নাসা POWER দৈনিক আবহাওয়া', 'NASA POWER daily weather'), years: '2001–2026', scale: t('প্রায় ৫০ × ৬০ কিমি ঘর', 'a cell of about 50 × 60 km'),
    what: t('তাপ, বৃষ্টি, আর্দ্রতা; MERRA-2 মডেল আর উপগ্রহের মিশ্রণ। তাপমাত্রা BMD স্টেশনের গড়ে মেলানো।', 'Heat, rain, humidity; the MERRA-2 model blended with satellites. Temperatures matched to BMD station normals.'),
    limit: t('উপজেলার আবহাওয়া, জমির নয়', 'The upazila’s weather, not the field’s'), src: 'https://power.larc.nasa.gov/' },
  { id: 'bmd', kind: 'STATION', use: 'calc', name: t('বাংলাদেশ আবহাওয়া অধিদপ্তরের স্টেশন', 'Bangladesh Meteorological Department stations'), years: '1991–2020', scale: t('একটি স্টেশন', 'one station'),
    what: t('মাসিক গড় তাপমাত্রা, যা দিয়ে নাসা POWER-এর তাপ ঠিক করা হয়; আর বৃষ্টি শুরুর তারিখ যাচাই।', 'Monthly normal temperatures that correct NASA POWER’s heat; and the check of rain-onset dates.'),
    limit: t('নিকটতম স্টেশন, কয়েক কিমি দূরে হতে পারে', 'The nearest station, possibly tens of km away'), src: 'https://live6.bmd.gov.bd/' },
  { id: 'imerg', kind: 'SAT', use: 'calc', name: t('GPM IMERG বৃষ্টি', 'GPM IMERG rain'), years: '2001–2026', scale: t('প্রায় ১১ কিমি', 'about 11 km'),
    what: t('উপগ্রহে মাপা দৈনিক বৃষ্টি: বর্ষা শুরুর তারিখ আর নাসা POWER-এর বৃষ্টি যাচাই', 'Daily rain measured from space: the monsoon onset date, and a check on NASA POWER’s rain'),
    limit: t('ছোট ঝড়ের বৃষ্টি কম-বেশি দেখাতে পারে', 'Can miss or overstate small storms'), src: 'https://gpm.nasa.gov/data/imerg' },
  { id: 'soilgrids', kind: 'MODEL', use: 'calc', name: t('ISRIC SoilGrids মাটি', 'ISRIC SoilGrids soil'), years: t('মানচিত্র ২০২০', 'map of 2020'), scale: t('২৫০ মিটার ঘর, ওপরের ৩০ সেমি', '250 m cell, top 30 cm'),
    what: t('pH, বুনট, জৈব কার্বন, ঘনত্ব: বিশ্বের মাটির নমুনা থেকে মেশিন লার্নিং দিয়ে আনুমানিক মানচিত্র', 'pH, texture, organic carbon, density: a machine-learning estimate from soil samples worldwide'),
    limit: t('মডেলের আনুমানিক হিসাব, আপনার জমির মাটি পরীক্ষা নয়', 'A model estimate, not a test of your field’s soil'), src: 'https://soilgrids.org/' },
  { id: 'srdi', kind: 'RECORD', use: 'calc', name: t('SRDI ইউনিয়ন সহায়িকা', 'SRDI union guides'), years: t('প্রকাশের বছর ভিন্ন', 'year varies'), scale: t('ইউনিয়নের মাটির দল', 'the union’s soil groups'),
    what: t('মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউটের মাটি পরীক্ষা থেকে সারের মাত্রা', 'Fertiliser doses from the Soil Resource Development Institute’s soil tests'),
    limit: t('ইউনিয়নের গড়, আপনার জমির পরীক্ষা নয়', 'The union’s typical soil, not your field’s test'), src: 'https://srdi.gov.bd/' },
  { id: 's2', kind: 'SAT', use: 'calc', name: t('সেন্টিনেল-২ জমির সবুজ রেখা', 'Sentinel-2 field green curve'), years: '2025–2026', scale: t('১০ মিটার, জমির ভেতরের পিক্সেল', '10 m, the pixels inside the field'),
    what: t('জমিতে কোন ফসল ছিল তা সবুজের ওঠা-নামা থেকে; জমির ভবিষ্যৎ সেখান থেকে শুরু', 'Which crops grew, from how the green rose and fell; Field Future starts from it'),
    limit: t('মেঘলা দিনে ছবি নেই; ফসলের নাম অনুমান', 'No picture on cloudy days; the crop name is inferred'), src: 'https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2' },
  { id: 's1', kind: 'SAT', use: 'calc', name: t('সেন্টিনেল-১ রাডার', 'Sentinel-1 radar'), years: '2017–2026', scale: t('প্রায় ৪০ মিটার', 'about 40 m'),
    what: t('আমন রোপণের দিন (পানিতে ডোবা জমি রাডারে কালো দেখায়)', 'The day Aman is transplanted (flooded fields look dark to radar)'),
    limit: t('উপজেলার মাঝামাঝি দিন; আপনার জমির দিন আলাদা হতে পারে', 'The upazila’s middle date; yours may differ'), src: 'https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-1' },
  { id: 'cmip6', kind: 'MODEL', use: 'calc', name: t('নাসা NEX-GDDP-CMIP6', 'NASA NEX-GDDP-CMIP6'), years: '2041–2050', scale: t('প্রায় ২৫ কিমি, ৮টি মডেল', 'about 25 km, eight models'),
    what: t('২০৪০-এর দশকের তাপ আর বৃষ্টির পরিবর্তন, জমির ভবিষ্যতের দশ বছরে', 'The change in heat and rain in the 2040s, in Field Future’s ten years'),
    limit: t('মডেলগুলো একে অন্যের সঙ্গে মেলে না; তাই ৮টিই আলাদা চালানো হয়', 'The models disagree; so all eight are run separately'), src: 'https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6' },
  { id: 'faostat', kind: 'RECORD', use: 'calc', name: t('FAOSTAT ফলন', 'FAOSTAT yields'), years: '2020–2024', scale: t('দেশের গড়', 'national average'),
    what: t('প্রতিটি ফসলের হেক্টরপ্রতি ফলন', 'Each crop’s yield per hectare'), limit: t('দেশের গড়, আপনার জমির নয়', 'The national average, not your field'), src: 'https://www.fao.org/faostat/' },
  { id: 'prices', kind: 'RECORD', use: 'calc', name: t('দাম আর খরচ', 'Prices and costs'), years: t('প্রতিটির বছর আলাদা', 'each with its year'), scale: t('দেশ বা ঢাকার বাজার', 'national or Dhaka markets'),
    what: t('সরকারি সংগ্রহ মূল্য, কৃষি বিপণন অধিদপ্তর, মন্ত্রণালয় আর মাঠ গবেষণার খরচ', 'Government procurement prices, DAM, ministry and field-study costs'), limit: t('আপনার হাটের দাম আলাদা হতে পারে', 'Your local market may differ'), src: 'http://www.dam.gov.bd/' },
  { id: 'modis250', kind: 'SAT', use: 'context', name: t('MODIS জমির সবুজ (২৫০ মিটার)', 'MODIS field greenness (250 m)'), years: '2001–2026', scale: t('২৫০ মিটার, জমি আর আশপাশ', '250 m, the field and its neighbours'),
    what: t('প্রতি রবির জানুয়ারি-ফেব্রুয়ারির সবুজ: কোন বছর ফসল চাপে ছিল', 'Each Rabi’s January–February greenness: the years the crop was stressed'), limit: t('প্রায় ১৫ বিঘার এক পিক্সেল', 'One pixel is about 15 bigha'), src: 'https://modis.ornl.gov/' },
  { id: 'landsat', kind: 'SAT', use: 'context', name: t('Landsat: এক প্রজন্ম আগের সবুজ', 'Landsat: greenness a generation ago'), years: '1988–2001', scale: t('৩০ মিটার, জমির কেন্দ্রের ৯০ মিটার', '30 m, 90 m round the field’s centre'),
    what: t('প্রতিটি জমির রবির সবুজ ১৯৮৮–৯১ আর ১৯৯৮–২০০১-এ, আজকের MODIS-এর পাশে', 'Each field’s Rabi greenness in 1988–91 and 1998–2001, beside MODIS today'), limit: t('আলাদা উপগ্রহ আর মাপ: শুধু স্পষ্ট দিক বদল ধরা হয়', 'A different satellite and scale: only a clear change of direction is read'), src: 'https://nasa-gibs.github.io/gibs-api-docs/' },
  { id: 'modisMonthly', kind: 'SAT', use: 'context', name: t('MODIS মাসিক সবুজ ও মাটির তাপ', 'MODIS monthly greenness and ground heat'), years: '2001–2026', scale: t('প্রায় ৫ কিমি', 'about 5 km'),
    what: t('এলাকার বছরের সবুজ চক্র আর মাটির ওপরের তাপ', 'The area’s yearly green cycle and ground-surface heat'), limit: t('এলাকার গড়', 'An area average'), src: 'https://earthdata.nasa.gov/gibs' },
  { id: 'terrain', kind: 'SAT', use: 'context', name: t('SRTM আর ASTER উঁচু-নিচু', 'SRTM and ASTER terrain'), years: '2000–2013', scale: t('৩০ মিটার', '30 m'),
    what: t('জমি চারপাশের চেয়ে কত নিচু, ঢাল কত: পানি জমা আর মাটি ধোয়ার ঝুঁকি', 'How low the field sits and how it slopes: standing water and erosion risk'), limit: t('ফসল-গাছের মাথা দেখে; কয়েক মিটার ভুল', 'Sees crop and tree tops; metres of error'), src: 'https://lpdaac.usgs.gov/products/srtmgl1v003/' },
  { id: 'grace', kind: 'SAT', use: 'context', name: t('GRACE ভূগর্ভের পানি', 'GRACE groundwater'), years: '2002–2022', scale: t('কয়েকশো কিমি এলাকার গড়', 'an average over hundreds of km'),
    what: t('মাটির ওপরে-নিচে জমা পানির ওঠা-নামা', 'The rise and fall of all water stored on and under the land'),
    limit: t('বিশাল অঞ্চলের গড়: আপনার জমি বা নলকূপের মাপ নয়', 'A regional average: not a measurement of your field or your well'), src: 'https://grace.jpl.nasa.gov/' },
  { id: 'smap', kind: 'MODEL', use: 'context', name: t('SMAP মাটির ভেজা ভাব', 'SMAP soil moisture'), years: '2015–2026', scale: t('৯ কিমি', '9 km'),
    what: t('শিকড়ের গভীরতায় মাটির পানি (উপগ্রহের মাপ মডেলে মেলানো)', 'Root-zone soil water (satellite readings fed into a model)'), limit: t('৯ কিমি ঘরের গড়', 'The average of a 9 km cell'), src: 'https://smap.jpl.nasa.gov/' },
  { id: 'sedac', kind: 'RECORD', use: 'context', name: t('নাসা SEDAC জনসংখ্যা ও উচ্চতা', 'NASA SEDAC population and elevation'), years: '2020', scale: t('প্রায় ১ কিমি', 'about 1 km'),
    what: t('উপজেলায় কত মানুষ, কতটা জমি নিচু', 'How many people, how much land lies low'), limit: t('উপজেলার সারসংক্ষেপ', 'An upazila summary'), src: 'https://sedac.ciesin.columbia.edu/' },
  { id: 'forecast', kind: 'MODEL', use: 'calc', name: t('আজকের আবহাওয়া (Open-Meteo)', 'Today’s weather (Open-Meteo)'), years: t('আজ ও আগামী ৩ দিন', 'today and the next 3 days'), scale: t('প্রায় ১১ কিমি', 'about 11 km'),
    what: t('আজকের সেচ আর সতর্কতা', 'Today’s irrigation advice and alerts'), limit: t('পূর্বাভাস, নিশ্চয়তা নয়', 'A forecast, not a certainty'), src: 'https://open-meteo.com/' },
  { id: 'rules', kind: 'RULE', use: 'calc', name: t('ফসলের সীমা', 'Crop thresholds'), years: '—', scale: t('প্রতিটি ফসল', 'each crop'),
    what: t('কোন তাপ বা বৃষ্টিতে কোন ফসলের ক্ষতি হয়: প্রকাশিত গবেষণা থেকে শুরুর মান', 'What heat or rain harms each crop: starting values from published research'),
    limit: t('স্থানীয় কৃষিবিদের যাচাই এখনো বাকি', 'Not yet reviewed by local agronomists'), src: 'docs/THRESHOLDS.md' },
  { id: 'neighbours', kind: 'DEMO', use: 'calc', name: t('পাশের কৃষকদের পরিকল্পনা', 'Neighbours’ plans'), years: '—', scale: t('ইউনিয়ন', 'union'),
    what: t('দাম পড়ার ঝুঁকির হিসাব', 'The price-drop risk'), limit: t('নমুনা কৃষক; আসল ব্যবহারে আসল পরিকল্পনা আসবে', 'Sample farmers; real plans replace them in use'), src: null },
];
export const datasetOf = (id) => DATASETS.find((d) => d.id === id);

// Status of each dataset for one field: 'ok', 'coarse' (only an area value), 'stale', 'sample' or 'missing'.
// facts: { today (ms), climEnd ('YYYY-MM-DD'), soilScope ('field' | 'union'), terrain, fieldNdvi, watch, cmip6,
//          priceYearMin, radarThrough } — every one optional; a missing fact is reported as missing.
const DAY = 864e5;
export function coverage(facts = {}) {
  const now = facts.today ?? Date.now();
  const age = (iso) => (iso ? (now - Date.parse(iso)) / DAY : Infinity);
  const yearNow = new Date(now).getUTCFullYear();
  const st = {
    power: !facts.climEnd ? 'missing' : age(facts.climEnd) > 45 ? 'stale' : 'coarse',
    bmd: 'ok',
    imerg: !facts.climEnd ? 'missing' : 'coarse',
    soilgrids: facts.soilScope === 'field' ? 'ok' : facts.soilScope ? 'coarse' : 'missing',
    srdi: facts.srdi ? 'coarse' : 'missing',
    s2: facts.watch ? (age(facts.watchEnd) > 60 ? 'stale' : 'ok') : 'missing',
    s1: facts.radarThrough ? 'coarse' : 'missing',
    cmip6: facts.cmip6 ? 'ok' : 'missing',
    faostat: 'coarse',
    prices: facts.priceYearMin == null ? 'missing' : yearNow - facts.priceYearMin > 2 ? 'stale' : 'ok',
    modis250: facts.fieldNdvi ? 'ok' : 'missing',
    landsat: facts.landsat ? 'ok' : 'missing',
    modisMonthly: 'coarse',
    terrain: facts.terrain ? 'ok' : 'missing',
    grace: 'coarse',
    smap: 'coarse',
    sedac: 'coarse',
    forecast: facts.liveWeather ? 'ok' : 'missing',
    rules: 'unreviewed',
    neighbours: 'sample',
  };
  return DATASETS.map((d) => ({ ...d, status: st[d.id] ?? 'missing' }));
}
export const STATUS = {
  ok: t('আছে, জমির মাপে', 'Present, at field scale'),
  coarse: t('আছে, তবে এলাকার মাপে', 'Present, but area-scale'),
  stale: t('পুরোনো', 'Out of date'),
  missing: t('নেই', 'Missing'),
  sample: t('নমুনা', 'Sample'),
  unreviewed: t('যাচাই বাকি', 'Not yet reviewed'),
};

// Where two sources of the same thing disagree, and by how much. Each item: what is compared, the two values, the
// difference, and how that should change confidence. Inputs are optional; an item is left out without them.
//   cross: rainCrossCheck(clim) (NASA POWER rain against GPM IMERG), terrain: field_terrain row (SRTM against ASTER),
//   field: fieldGreen() (the field's own MODIS pixel against the area's), spread: modelSpread() (the climate models).
export function disagreements({ cross = null, terrain = null, field = null, spread = null } = {}) {
  const out = [];
  if (cross) {
    const r = cross.rabi, pct = r.imerg ? ((r.power - r.imerg) / r.imerg) * 100 : null;
    out.push({ k: 'rain', a: Math.round(r.power), b: Math.round(r.imerg), unit: 'mm', pct, r: r.r,
      level: pct != null && Math.abs(pct) > 25 ? 'big' : r.r < 0.6 ? 'some' : 'small' });
  }
  if (terrain && terrain.spread != null) out.push({ k: 'terrain', spread: terrain.spread, relief: terrain.relief, level: terrain.spread > Math.abs(terrain.relief) * 2 ? 'big' : terrain.spread > 2 ? 'some' : 'small' });
  if (field && field.vsArea != null) out.push({ k: 'green', a: field.rabiNdvi, b: field.areaNdvi, diff: field.vsArea, level: Math.abs(field.vsArea) > 0.1 ? 'big' : Math.abs(field.vsArea) > 0.04 ? 'some' : 'small' });
  if (spread && spread.n) out.push({ k: 'models', ...spread, level: spread.rainMax - spread.rainMin > 30 ? 'big' : 'some' });
  return out;
}

// How far the climate models disagree for one place: each model's change in yearly rain (%) and in Rabi daytime heat
// (November–February, °C) for the 2040s. deltas: cmip6_deltas.json.
export function modelSpread(deltas, upazilaId, scenario = 'ssp245') {
  const cell = deltas?.upazilas?.[upazilaId] && deltas.cells?.[deltas.upazilas[upazilaId]]?.scenarios?.[scenario];
  if (!cell) return null;
  const rows = Object.entries(cell).map(([name, d]) => ({
    name, rainPct: d.histRainMm ? ((d.futRainMm - d.histRainMm) / d.histRainMm) * 100 : null,
    rabiTmax: [10, 11, 0, 1].reduce((a, m) => a + d.dTmax[m], 0) / 4,
  }));
  const rain = rows.map((r) => r.rainPct).filter((x) => x != null), heat = rows.map((r) => r.rabiTmax);
  return { n: rows.length, rows, rainMin: Math.min(...rain), rainMax: Math.max(...rain), heatMin: Math.min(...heat), heatMax: Math.max(...heat) };
}
