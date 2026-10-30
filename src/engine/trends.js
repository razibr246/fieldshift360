// Long-term trends on a map, year by year, for the seven upazilas and the five neighbouring-country farms: the water
// stored on and under the land (GRACE/GRACE-FO), the Rabi greenness against each place's own trend (MODIS NDVI), and
// the root-zone soil moisture against each place's own normal (SMAP L4). Each layer is per place per year, with a
// diverging scale centred on zero (below normal / above normal). Pure: the data comes in, nothing is fetched.
import { graceRecord } from './soilwater.js';
import { landSummary } from './landsat.js';

export const TREND_LAYERS = {
  grace: { bn: 'মাটির ওপরে-নিচে জমা পানি', en: 'Water stored on and under the land', unit: { bn: 'সেমি', en: 'cm' }, src: 'GRACE / GRACE-FO', kind: 'SAT', span: 20,
    note: { bn: '২০০৪–২০০৯-এর গড়ের তুলনায়; কয়েকশো কিমি এলাকার গড়, একটা জমির নয়।', en: 'Against the 2004–2009 mean; an average over hundreds of km, not one field.' } },
  green: { bn: 'রবির সবুজ, নিজের ধারার তুলনায়', en: 'Rabi greenness against its own trend', unit: { bn: 'z', en: 'z' }, src: 'MODIS NDVI', kind: 'SAT', span: 2.5,
    note: { bn: 'জানুয়ারি-ফেব্রুয়ারির সবুজ; শূন্যের নিচে মানে সেবার ফসল চাপে ছিল।', en: 'January–February greenness; below zero means the crops were under stress that year.' } },
  smap: { bn: 'শিকড়ের মাটির পানি, স্বাভাবিকের তুলনায়', en: 'Root-zone soil water against normal', unit: { bn: '%', en: '%' }, src: 'SMAP L4', kind: 'MODEL', span: 25,
    note: { bn: 'বছরের গড়, সেই জায়গার ২০১৫–২০২৬-এর গড়ের তুলনায়; ৯ কিমি ঘর।', en: 'The year’s mean against that place’s 2015–2026 mean; a 9 km cell.' } },
};

const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

// { years: [..], values: { place: { year: value } } } for one layer. ws: water_sat.json.
export function trendLayer(kind, ws, places) {
  const values = {};
  for (const id of places) {
    const out = {};
    if (kind === 'grace') for (const r of graceRecord(ws, id)?.years ?? []) out[r.year] = r.cm;
    if (kind === 'green') for (const r of landSummary(id)?.rabi ?? []) out[r.y] = r.z;
    if (kind === 'smap') {
      const by = {};
      for (const [m, v] of Object.entries(ws?.points?.[id]?.smap ?? {})) (by[m.slice(0, 4)] ??= []).push(v);
      const yearly = Object.entries(by).filter(([, v]) => v.length >= 10).map(([y, v]) => [+y, mean(v)]);
      const all = mean(yearly.map(([, v]) => v));
      for (const [y, v] of yearly) out[y] = all ? ((v - all) / all) * 100 : null;
    }
    values[id] = out;
  }
  const years = [...new Set(Object.values(values).flatMap((v) => Object.keys(v).map(Number)))].sort((a, b) => a - b);
  return { years, values };
}

// A diverging colour for a value: brown below normal, white at normal, blue-green above; grey when missing.
export function trendColor(v, span) {
  if (v == null || Number.isNaN(v)) return '#9aa59e';
  const t = Math.max(-1, Math.min(1, v / span));
  const mix = (a, b, f) => Math.round(a + (b - a) * f);
  const [lo, mid, hi] = [[166, 97, 26], [245, 245, 240], [1, 133, 113]];
  const [c1, c2, f] = t < 0 ? [mid, lo, -t] : [mid, hi, t];
  return `rgb(${mix(c1[0], c2[0], f)},${mix(c1[1], c2[1], f)},${mix(c1[2], c2[2], f)})`;
}
