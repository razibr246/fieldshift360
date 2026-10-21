// Aman harvest outlook for a district, and what to grow on the land after it. [REAL in, RULE]
//
// In (all real, each with its source):
//   * each upazila's Aman transplanting day, cropland share and outline: Sentinel-1 radar and Sentinel-2 land cover
//     (src/data/aman_radar.json, scripts/data/build_aman_radar.mjs)
//   * the district's Aman rice area: BBS Yearbook of Agricultural Statistics 2023, 2022-23 (bangladesh_crops.json)
//   * the national Aman yield: BBS, FY2024-25 (AMAN_YIELD below)
//   * yield, farm price and full cost of each Rabi crop: FAOSTAT 2024, DAM, ministries and field studies
//     (price_seasons.json, crop_economics.json)
//   * sowing deadlines: the field trials and BRRI guidance in SOW_BY / BORO_BY below
// Worked out here (rules, stated on screen):
//   * harvest window = transplanting + 95 to 120 days (modern high-yielding Aman, as on the upazila page)
//   * BBS publishes Aman area per district, not per upazila, so the district area is shared out in proportion to each
//     upazila's measured cropland x the share of its radar sample fields that show Aman (an estimate, labelled so)
//   * land is ready for the next crop a week after the Aman is cut (LAND_PREP_DAYS)
import AMAN from '../data/aman_radar.json' with { type: 'json' };
import CROPS_BD from '../data/geo/bangladesh_crops.json' with { type: 'json' };
import SEASONS from '../data/price_seasons.json' with { type: 'json' };
import ECON from '../data/crop_economics.json' with { type: 'json' };
import { BIGHA_HA, RABI_CROPS } from './crops.js';

export const HARVEST_AFTER = [95, 120];
export const LAND_PREP_DAYS = 7;
export const AMAN_YIELD = {
  tHa: 2.95, year: 'FY2024-25',
  what: { bn: 'বিবিএস: আমনের জাতীয় গড় ফলন, হেক্টরে ২.৯৫ টন চাল (২০২৪-২৫)', en: 'BBS: national average Aman yield, 2.95 t of rice per hectare (FY2024-25)' },
  url: 'https://thefinancialexpress.com.bd/national/aman-yield-defies-floods-in-fy25-keeps-output-steady',
};
// The last sowing date that still gives a good crop after Aman. Tomato has no trial behind it here: it uses the app's
// own planting date (RABI_CROPS) plus a fortnight, and says so.
export const SOW_BY = {
  mustard: { m: 11, d: 20, src: { bn: 'বারি সরিষা-১৪: ২১ অক্টোবরে বুনলে সবচেয়ে বেশি ফলন, ২০ নভেম্বর পর্যন্ত মোটামুটি ফলন (মাঠ গবেষণা, ২০২০)', en: 'BARI Sarisha-14: best yield sown 21 October, fair yields to 20 November (field trial, 2020)' }, url: 'https://www.pakbs.org/pjbot/papers/1590018991.pdf' },
  wheat: { m: 11, d: 30, src: { bn: '২০–৩০ নভেম্বর বোনা ভালো; ৩০ নভেম্বরের পর প্রতিদিন দেরিতে ফলন প্রায় ১.৩% কমে', en: 'Sow 20–30 November; after 30 November yield falls about 1.3% a day' }, url: 'https://banglajol.info/index.php/BAJ/article/view/52454/37128' },
  lentil: { m: 11, d: 15, src: { bn: 'বারি মসুর: ৮–১৫ নভেম্বর বোনা সবচেয়ে ভালো (ঈশ্বরদী ও সিলেট কৃষি বিশ্ববিদ্যালয়ের মাঠ গবেষণা)', en: 'BARI lentil: 8–15 November is best (Ishwardi and Sylhet Agricultural University trials)' }, url: 'https://jsau.sau.ac.bd/effect-of-sowing-dates-and-varieties-on-stemphylium-blight-of-lentil/' },
  tomato: { m: 11, d: 30, rule: true, src: { bn: 'অ্যাপের হিসাব: চারা লাগানোর তারিখ ১৫ নভেম্বর, তার পরে দুই সপ্তাহ', en: 'App rule: planting date 15 November, plus two weeks' } },
};
export const BORO_BY = { m: 1, d: 30, src: { bn: 'ব্রি: বোরোর চারা রোপণ ৩০ জানুয়ারির (১৫ মাঘ) মধ্যে শেষ করলে বড় ক্ষতি এড়ানো যায়', en: 'BRRI: finish Boro transplanting by 30 January (15 Magh) to avoid heavy losses' }, url: 'https://banglajol.info/index.php/BRJ/article/view/62704/43437' };
export const RABI_IDS = ['mustard', 'lentil', 'wheat', 'tomato', 'boro'];

const doyOf = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// Geodesic area of a [lon, lat] ring, km².
export function ringKm2(ring) {
  const R = 6371.0088, rad = Math.PI / 180;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j], [x2, y2] = ring[i];
    a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((a * R * R) / 2);
}

// Every upazila of a district: when its Aman comes in this year and roughly how much.
export function districtOutlook(districtId, year = AMAN.years.radar[1]) {
  const d = AMAN.districts[districtId];
  const bbsHa = CROPS_BD.districts.find((x) => x.en.toLowerCase() === d.en.toLowerCase())?.rice?.aman ?? null;
  const rows = d.upazilas.map((u) => {
    const se = u.seasons[year];
    const fromRadar = !!(se?.reliable && se.transplantDoy);
    const T = fromRadar ? se.transplantDoy : u.transplantNormal;
    const shares = Object.values(u.seasons).filter((s) => s.reliable).map((s) => s.nDetected / s.nFields);
    const amanShare = mean(shares);
    const areaKm2 = ringKm2(u.ring), cropKm2 = areaKm2 * u.croplandShare;
    return {
      id: u.id, u, T, fromRadar, start: T === null ? null : T + HARVEST_AFTER[0], end: T === null ? null : T + HARVEST_AFTER[1],
      areaKm2, cropKm2, amanShare, weight: cropKm2 * (amanShare ?? 0), shift: se?.shift ?? null,
    };
  });
  const W = rows.reduce((a, r) => a + r.weight, 0);
  for (const r of rows) {
    r.ha = bbsHa && W ? (bbsHa * r.weight) / W : null;
    r.tonnes = r.ha === null ? null : r.ha * AMAN_YIELD.tHa;
  }
  const tonnes = rows.reduce((a, r) => a + (r.tonnes ?? 0), 0);
  return { id: districtId, district: d, year, bbsHa, tonnes, rows };
}

// Where a harvest stands on a given day of the year: not yet (in n days), under way (share done), or over.
export function harvestState(r, todayDoy) {
  if (r.start === null) return { k: 'none' };
  if (todayDoy < r.start) return { k: 'soon', days: r.start - todayDoy };
  if (todayDoy > r.end) return { k: 'done' };
  return { k: 'now', done: (todayDoy - r.start) / (r.end - r.start) };
}

// Tonnes per week across the district, each upazila's estimate spread evenly over its window.
// Weeks start on Mondays; rows: [{ start: day of year of the Monday, [upazilaId]: tonnes }].
export function weeklyHarvest(outlook) {
  const { year, rows } = outlook;
  const live = rows.filter((r) => r.start !== null && r.tonnes);
  if (!live.length) return [];
  const monday = (doy) => doy - ((new Date(Date.UTC(year, 0, doy)).getUTCDay() + 6) % 7);
  const from = monday(Math.min(...live.map((r) => r.start))), to = Math.max(...live.map((r) => r.end));
  const weeks = [];
  for (let w = from; w <= to; w += 7) weeks.push({ start: w });
  for (const r of live) {
    const perDay = r.tonnes / (r.end - r.start + 1);
    for (let t = r.start; t <= r.end; t++) { const wk = weeks[Math.floor((t - from) / 7)]; wk[r.id] = (wk[r.id] ?? 0) + perDay; }
  }
  return weeks;
}

// What a bigha of each Rabi crop earns, nationally: FAOSTAT yield x (farm price - full cost).
export function rabiMoney(id) {
  const fao = SEASONS.crops[id], ce = ECON.crops[id];
  if (!fao || !ce) return null;
  const kg = Math.round(fao.yieldTHa * BIGHA_HA * 1000);
  return { id, kg, yieldTHa: fao.yieldTHa, priceKg: ce.price.tk, costKg: ce.cost.tk, price: ce.price, cost: ce.cost, net: Math.round(kg * (ce.price.tk - ce.cost.tk)), dipMonths: fao.dipMonths ?? [] };
}

// After this upazila's Aman: which Rabi crops still fit, what each earns per bigha against Boro, and whether a quick
// mustard crop fits between Aman and Boro (the Aman–mustard–Boro pattern: Boro stays, mustard is extra).
// fit: 'all' = even the last fields are cut in time; 'early' = only fields cut early; 'late' = the window has passed.
export function cropSwitch(row, year = AMAN.years.radar[1]) {
  if (row.start === null) return null;
  const freeEarly = row.start + LAND_PREP_DAYS, freeLate = row.end + LAND_PREP_DAYS;
  const boro = rabiMoney('boro');
  const crops = RABI_IDS.map((id) => {
    const m = rabiMoney(id);
    if (!m) return null;
    const by = id === 'boro' ? { ...BORO_BY, y: year + 1 } : { ...SOW_BY[id], y: year };
    const deadline = doyOf(by.y, by.m, by.d) + (by.y > year ? doyOf(year, 12, 31) : 0);
    const fit = freeLate <= deadline ? 'all' : freeEarly <= deadline ? 'early' : 'late';
    return { ...m, crop: RABI_CROPS[id], by, deadline, fit, vsBoro: m.net - boro.net };
  }).filter(Boolean);
  const mustard = crops.find((c) => c.id === 'mustard');
  const boroBy = doyOf(year + 1, BORO_BY.m, BORO_BY.d) + doyOf(year, 12, 31);
  const days = RABI_CROPS.mustard.days;
  const relay = {
    days, extra: mustard.net,
    fit: freeLate + days <= boroBy && mustard.fit === 'all' ? 'all' : freeEarly + days <= boroBy && mustard.fit !== 'late' ? 'early' : 'late',
    harvestEarly: freeEarly + days, harvestLate: freeLate + days, boroBy,
  };
  const best = crops.filter((c) => c.id !== 'boro' && c.fit !== 'late').sort((a, b) => b.net - a.net);
  return { freeEarly, freeLate, crops, boro, relay, best };
}
