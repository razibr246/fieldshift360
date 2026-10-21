import { bnDigits } from './dates.js';
// Keep / Adjust / Shift decision engine [RULE on REAL climate + soil + DEMO economics].
import { RABI_CROPS, IRRIGATION } from './crops.js';
import { backtest, plantDate, PLAN_SEASON } from './climate.js';
import { harvestWindow } from './harvest.js';
import { cropWaterNeed } from './cropwater.js';
import { cropMoney } from './economics.js';
import { glutRisk, GLUT_SCORE } from './glut.js';

export const SHIFTS = [-14, 0, 14];
export const BASE_WEIGHTS = { C: 0.30, W: 0.20, S: 0.15, P: 0.15, R: 0.10, G: 0.10, E: 0 };
export const PRIORITIES = {
  water: { bn: 'সেচ কম লাগুক', en: 'Use less water', hint: { bn: 'কম পানির ফসল আগে আসবে', en: 'Crops that need less irrigation rank higher' }, icon: 'droplets', apply: (w) => { w.W *= 2.5; } },
  income: { bn: 'আয় বেশি হোক', en: 'Earn more', hint: { bn: 'বেশি লাভের ফসল আগে আসবে', en: 'More profitable crops rank higher' }, icon: 'coins', apply: (w) => { w.P *= 2.5; } },
  risk: { bn: 'ঝুঁকি কম থাকুক', en: 'Play it safe', hint: { bn: 'আবহাওয়া আর দাম পড়ার ঝুঁকি কম এমন ফসল', en: 'Less weather and price risk' }, icon: 'shield', apply: (w) => { w.C *= 1.6; w.G *= 1.6; } },
  soil: { bn: 'মাটি ভালো হোক', en: 'Build up the soil', hint: { bn: 'মাটির উপকার করে এমন ফসল ও ফসলচক্র', en: 'Crops and rotations that feed the soil' }, icon: 'sprout', apply: (w) => { w.S *= 2; w.R *= 2.5; } },
  early: { bn: 'তাড়াতাড়ি ঘরে তুলি', en: 'Harvest sooner', hint: { bn: 'যে ফসল আগে ওঠে', en: 'Crops that are ready sooner' }, icon: 'timer', apply: (w) => { w.E += 0.15; } },
};

export function weightsFor(priorities) {
  const w = { ...BASE_WEIGHTS };
  for (const p of priorities) PRIORITIES[p]?.apply(w);
  const sum = Object.values(w).reduce((a, b) => a + b, 0);
  for (const k of Object.keys(w)) w[k] = w[k] / sum;
  return w;
}

const LOW = ['very low', 'low'];

export function soilFit(crop, soil) {
  const notes = [];
  const [lo, hi] = crop.ph;
  let s;
  if (soil.ph >= lo && soil.ph <= hi) { s = 100; notes.push({ bn: bnDigits(`মাটির pH ${soil.ph}, এই ফসলের জন্য ঠিক আছে (${lo}–${hi})`), en: `Soil pH ${soil.ph} suits this crop (${lo}–${hi})` }); }
  else if (soil.ph >= lo - 0.5 && soil.ph < lo) { s = 65; notes.push({ bn: bnDigits(`মাটির pH ${soil.ph}, একটু টক (দরকার ${lo}–${hi}); চুন বা জৈব সার দিলে ভালো`), en: `Soil pH ${soil.ph} is a little acidic (needs ${lo}–${hi}); lime or compost helps` }); }
  else if (soil.ph > hi && soil.ph <= hi + 0.5) { s = 65; notes.push({ bn: bnDigits(`মাটির pH ${soil.ph}, একটু ক্ষারীয় (দরকার ${lo}–${hi}); চুন দেবেন না, জৈব সার দিলে ভালো`), en: `Soil pH ${soil.ph} is a little alkaline (needs ${lo}–${hi}); no lime, compost helps` }); }
  else { s = 30; notes.push({ bn: bnDigits(`মাটির pH ${soil.ph}, এই ফসলের জন্য মানানসই নয় (দরকার ${lo}–${hi})`), en: `Soil pH ${soil.ph} does not suit this crop (needs ${lo}–${hi})` }); }
  // The same score either way; the wording follows the land (SRDI's soil physiography: Barind or river silt).
  if (crop.wellDrained && soil.drainage === 'poor') {
    s -= 10;
    notes.push(soil.landform === 'barind' ? { bn: 'বরেন্দ্রের শক্ত মাটিতে পানি নামে না, তাই উঁচু বেড করে লাগাতে হবে', en: 'Water sits on the Barind hardpan, so plant on raised beds' }
      : { bn: 'এই মাটিতে পানি সহজে নামে না, তাই উঁচু বেড আর নালা করে লাগাতে হবে', en: 'Water drains slowly in this soil, so plant on raised beds with drains' });
  }
  if (!crop.wellDrained && soil.drainage === 'good') {
    s -= 10;
    notes.push(String(soil.texture).includes('sand') ? { bn: 'বেলে মাটিতে পানি ধরে রাখা কঠিন, সেচ বেশি লাগবে', en: 'Sandy soil does not hold standing water, so it needs more irrigation' }
      : { bn: 'উঁচু জমিতে পানি দাঁড়ায় না, তাই সেচ বেশি লাগবে', en: 'Water does not stand on this higher land, so it needs more irrigation' });
  }
  if (crop.heavyFeeder && (LOW.includes(soil.p_level) || LOW.includes(soil.k_level))) { s -= 10; notes.push({ bn: 'মাটিতে ফসফরাস বা পটাশ কম, সার খরচ বাড়বে', en: 'Soil is low in phosphorus or potash, so fertiliser costs more' }); }
  if (crop.legume && soil.calcareous) { s += 10; notes.push({ bn: 'চুনযুক্ত মাটিতে ডাল ভালো হয়', en: 'Limey soil suits pulses' }); }
  return { score: Math.max(0, Math.min(100, s)), notes };
}

export function waterFit(waterClass, irrigation) {
  const pen = IRRIGATION[irrigation]?.penalty[waterClass] ?? 30;
  return 100 - pen;
}

export function rotationFit(crop, lastCropId) {
  const last = RABI_CROPS[lastCropId];
  let s = last && last.family === crop.family ? 30 : 80;
  if (crop.legume) s += 20;
  return Math.min(100, s);
}

// econ: { prices: price_seasons.json (FAOSTAT yields), costs: crop_economics.json, srdiUnion } for real profit per bigha. Without it the profit
// part counts the same for every crop (nothing is made up to fill the gap).
export function decide({ clim, soil, plot, union, priorities = [], econ = null }) {
  const weights = weightsFor(priorities);
  const raw = [];
  for (const crop of Object.values(RABI_CROPS)) {
    for (const shift of SHIFTS) {
      const t0 = plantDate(crop, PLAN_SEASON, shift);
      const bt = backtest(clim, crop, shift);
      const C = bt.now.n ? (bt.now.safe / bt.now.n) * 100 : 50;
      const water = cropWaterNeed(clim, crop, t0);
      const sf = soilFit(crop, soil);
      const R = rotationFit(crop, plot.last_crop);
      const gr = glutRisk(clim, union, crop.id, t0, plot);
      const G = GLUT_SCORE[gr.level];
      const hw = harvestWindow(clim, crop, t0, PLAN_SEASON);
      const money = cropMoney(econ, crop);
      raw.push({ crop, shift, t0, bt, hw, glut: gr, money, water, comp: { C, W: 0, S: sf.score, P: 0, R, G, E: 0 }, soilNotes: sf.notes });
    }
  }
  // Scale money, water and earliness across the candidates (0–100, best = 100).
  const span = (vals) => { const v = vals.filter((x) => x != null); return [Math.min(...v), Math.max(...v)]; };
  const [pMin, pMax] = span(raw.map((r) => r.money?.net));
  const [wMin, wMax] = span(raw.map((r) => r.water?.mm));
  const hs = raw.map((r) => r.hw.start), hMin = Math.min(...hs), hMax = Math.max(...hs);
  for (const r of raw) {
    r.comp.P = r.money && pMax > pMin ? 20 + (80 * (r.money.net - pMin)) / (pMax - pMin) : 60;
    // Water: how little this crop needs (real mm), weighted with how dear water is from this farmer's source.
    const need = r.water && wMax > wMin ? 100 - (80 * (r.water.mm - wMin)) / (wMax - wMin) : 60;
    r.comp.W = Math.round(0.6 * need + 0.4 * waterFit(r.crop.water, plot.irrigation));
    r.comp.E = hMax > hMin ? 100 - (80 * (r.hw.start - hMin)) / (hMax - hMin) : 60;
    r.score = Object.entries(weights).reduce((a, [k, w]) => a + w * r.comp[k], 0);
  }
  const bestOf = (id) => raw.filter((r) => r.crop.id === id).sort((a, b) => b.score - a.score)[0];
  const cur = plot.last_crop;
  const curNormal = raw.find((r) => r.crop.id === cur && r.shift === 0);
  const curBest = bestOf(cur);
  const perCrop = Object.keys(RABI_CROPS).map(bestOf).sort((a, b) => b.score - a.score);
  const otherBest = perCrop.find((r) => r.crop.id !== cur);

  let label, rec;
  if (otherBest && otherBest.score >= curBest.score + 15) { label = 'SHIFT'; rec = otherBest; }
  else if (curBest.shift !== 0 && curBest.score >= curNormal.score + 10) { label = 'ADJUST'; rec = curBest; }
  else { label = 'KEEP'; rec = curNormal; }
  const caution = label === 'KEEP' && curNormal.score < 60;

  return { label, caution, rec, curNormal, curBest, options: perCrop, all: raw, weights, priorities };
}
