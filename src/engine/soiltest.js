// The farmer's own soil test (an SRDI lab or mobile-lab report), entered by hand. Where it exists it replaces the
// SoilGrids estimate for pH, organic matter and total nitrogen, so the season plan, Field Future and the soil fit
// all run on the measured field; the SRDI land type on the report picks the right row of the SRDI fertiliser guide.
// The estimate is kept beside it, so the farmer (and we) can see how far the satellite-era soil map was off.
// Idea from Smart Farming Advisor (crop advice from N, P, K and pH); here the numbers come from a real test, not a
// benchmark table. Pure.
import { bnDigits } from './dates.js';

export const LAND = {
  high: { bn: 'উঁচু জমি', en: 'High land' },
  medium_high: { bn: 'মাঝারি উঁচু জমি', en: 'Medium-high land' },
  medium_low: { bn: 'মাঝারি নিচু জমি', en: 'Medium-low land' },
};
// Plausible ranges for a field soil; anything outside is a typing slip (e.g. 65 for 6.5).
export const LIMITS = {
  ph: { min: 3.5, max: 9.5, name: { bn: 'পিএইচ (pH)', en: 'pH' }, unit: '' },
  om: { min: 0, max: 15, name: { bn: 'জৈব পদার্থ', en: 'Organic matter' }, unit: '%' },
  n: { min: 0, max: 1, name: { bn: 'মোট নাইট্রোজেন', en: 'Total nitrogen' }, unit: '%' },
};
export const RETEST_YEARS = 3; // advice: test again every 2–3 years, or after a big change in cropping

const numOrNull = (x) => (x === '' || x == null || Number.isNaN(+x) ? null : +x);

// { ok, errors: [{ k, bn, en }], test } — the cleaned test when ok.
export function checkTest(raw, today = Date.now()) {
  const errors = [];
  const t = { date: raw.date || null, lab: (raw.lab || '').trim().slice(0, 80), land: LAND[raw.land] ? raw.land : null };
  for (const k of Object.keys(LIMITS)) {
    const v = numOrNull(raw[k]);
    t[k] = v;
    const L = LIMITS[k];
    if (v != null && (v < L.min || v > L.max)) errors.push({ k, bn: bnDigits(`${L.name.bn} ${L.min}–${L.max}${L.unit}-এর মধ্যে হওয়ার কথা; রিপোর্টটা আবার দেখুন`), en: `${L.name.en} should be between ${L.min} and ${L.max}${L.unit}; check the report again` });
  }
  if (t.ph == null) errors.push({ k: 'ph', bn: 'অন্তত pH লিখুন', en: 'Enter at least the pH' });
  if (!t.date) errors.push({ k: 'date', bn: 'পরীক্ষার তারিখ দিন', en: 'Give the test date' });
  else if (Date.parse(t.date) > today) errors.push({ k: 'date', bn: 'তারিখ ভবিষ্যতের হতে পারে না', en: 'The date cannot be in the future' });
  return { ok: errors.length === 0, errors, test: t };
}

// The soil the engine reads, with the test laid over it. The estimate stays in `tested.estimate`.
export function applyTest(soil, test) {
  if (!test || test.ph == null) return soil;
  return {
    ...soil,
    ph: test.ph,
    ph_range: null, // the map's uncertainty no longer applies to a measured pH
    om_pct: test.om ?? soil.om_pct,
    n_total_pct: test.n ?? soil.n_total_pct,
    tested: { date: test.date, lab: test.lab, land: test.land, estimate: { ph: soil.ph, ph_range: soil.ph_range ?? null, om_pct: soil.om_pct, n_total_pct: soil.n_total_pct } },
  };
}

// Measured against estimated, per value given: { k, name, test, est, diff }.
export function testVsEstimate(soil) {
  const t = soil?.tested;
  if (!t) return [];
  const pairs = [['ph', 'ph', soil.ph], ['om', 'om_pct', soil.om_pct], ['n', 'n_total_pct', soil.n_total_pct]];
  return pairs.filter(([, key]) => t.estimate[key] != null && soil[key] != null && !(key !== 'ph' && soil[key] === t.estimate[key]))
    .map(([k, key, v]) => ({ k, name: LIMITS[k].name, unit: LIMITS[k].unit, test: v, est: t.estimate[key], diff: +(v - t.estimate[key]).toFixed(k === 'n' ? 3 : 2) }));
}

export const testAgeYears = (date, today = Date.now()) => (date ? (today - Date.parse(date)) / (365.25 * 864e5) : null);
export const isStale = (date, today) => (testAgeYears(date, today) ?? 0) > RETEST_YEARS;
