// Today's water for one field: the FAO-56 daily root-zone water balance (Allen et al. 1998, FAO Irrigation and
// Drainage Paper 56, ch. 8). [REAL in, RULE]
//   Weather: Open-Meteo daily rain and FAO-56 Penman–Monteith ET₀ at the field, the last 92 days and 7 ahead.
//   Soil: the field's own SoilGrids sand, clay and organic matter → field capacity and wilting point by the
//     Saxton & Rawls (2006) equations → total available water (TAW) in the root zone.
//   Crop: Kc by growth stage (FAO-56 Table 12, cropwater.js); rooting depth growing from 0.15 m to its full depth
//     by the end of the development stage, and the share of TAW the crop can use before it suffers, p (Table 22).
// Each day: depletion Dr = previous Dr − rain + Kc·ET₀ (held between 0 = field capacity and TAW). The balance starts at
// field capacity on the planting day (seed goes in on "জো" or after a pre-sowing irrigation), or on the day the
// farmer last irrigated or said the soil was wet. Boro is grown ponded, so it gets the BRRI alternate wetting and
// drying (AWD) rule instead of a soil-water balance.
import { FAO56, kcOn } from './cropwater.js';
import { DAY, parseISO, daysBetween, bnDigits } from './dates.js';
import { bnIn } from './text.js';

// FAO-56 Table 22: maximum effective rooting depth (m) for smallholder fields, and p.
export const ROOTS = {
  tomato: { zr: 0.7, p: 0.4 }, wheat: { zr: 1.0, p: 0.55 }, lentil: { zr: 0.7, p: 0.5 }, mustard: { zr: 1.0, p: 0.6 },
  mungbean: { zr: 0.7, p: 0.45 }, sesame: { zr: 1.0, p: 0.6 },
};
const ZR0 = 0.15; // effective rooting depth at sowing (FAO-56: 0.15–0.20 m)
export const FIELD_EFF = 0.6; // share of the water pumped that reaches the roots in furrow / basin irrigation (FAO)
const DEC_M2 = 40.4686;

// Saxton & Rawls (2006), eqs. 1–2: soil water at −1500 kPa (wilting point) and −33 kPa (field capacity), m³/m³.
export function soilWaterLimits(soil) {
  if (soil?.sand == null || soil?.clay == null) return null;
  const S = soil.sand / 100, C = soil.clay / 100, OM = Math.min(8, soil.om_pct ?? 2); // the equations hold to 8% OM
  const w1500t = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const w33t = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const wp = w1500t + (0.14 * w1500t - 0.02);
  const fc = w33t + (1.283 * w33t * w33t - 0.374 * w33t - 0.015);
  return { fc, wp, awc: Math.max(0.05, fc - wp) }; // awc: m³ of usable water per m³ of soil
}

// Root depth on day d of a crop whose stage shares are in FAO56[cropId].stages.
function rootDepth(cropId, d, days) {
  const r = ROOTS[cropId], f = FAO56[cropId];
  if (!r || !f) return null;
  const grow = (f.stages[0] + f.stages[1]) * days;
  return ZR0 + (r.zr - ZR0) * Math.min(1, Math.max(0, d / grow));
}

// FAO-56 stage names for the screen.
export function faoStage(cropId, d, days) {
  const f = FAO56[cropId];
  if (!f || d < 0) return null;
  const [a, b, c] = f.stages.map((x) => x * days);
  if (d < a) return { id: 'ini', bn: 'শুরুর সময় (চারা ছোট)', en: 'Initial stage (small plants)' };
  if (d < a + b) return { id: 'dev', bn: 'গাছ দ্রুত বাড়ছে', en: 'Development stage (growing fast)' };
  if (d < a + b + c) return { id: 'mid', bn: 'ফুল-ফল ধরার মূল সময়', en: 'Mid-season (flowering and fruiting)' };
  if (d <= days) return { id: 'late', bn: 'পাকার সময়', en: 'Late season (ripening)' };
  return { id: 'done', bn: 'মৌসুম শেষ', en: 'Season over' };
}

// wx: { days: [{ d: 'YYYY-MM-DD', rain, et0, tmax, tmin }], today: index of today }
// reset: 'YYYY-MM-DD' of the last irrigation (or "soil is wet"), if any.
export function fieldWater({ crop, plantT, soil, area_dec, wx, today, reset = null, fieldCheck = null }) {
  const days = crop.days;
  const dToday = daysBetween(plantT, today);
  if (!wx) return null;
  if (dToday < 0) return { mode: 'before', dToday, plantT };
  if (dToday > days + 7) return { mode: 'after', dToday };
  if (crop.id === 'boro') return awd({ crop, plantT, wx, today, dToday, reset });
  const lim = soilWaterLimits(soil);
  if (!lim || !FAO56[crop.id] || !ROOTS[crop.id]) return null;
  const { p } = ROOTS[crop.id];
  const iso = wx.days.map((x) => x.d);
  const startT = Math.max(plantT, reset ? parseISO(reset) : -Infinity, parseISO(iso[0]));
  const assumed = startT === plantT ? 'planting' : reset && startT === parseISO(reset) ? 'reset' : 'window';
  let Dr = 0;
  const trace = [];
  const step = (x, t) => {
    const d = daysBetween(plantT, t);
    const zr = rootDepth(crop.id, d, days), TAW = 1000 * lim.awc * zr, RAW = p * TAW;
    const kc = kcOn(crop.id, Math.max(0, d), days), etc0 = kc * (x.et0 ?? 0);
    const ks = Dr > RAW ? Math.max(0, (TAW - Dr) / (TAW - RAW)) : 1; // FAO-56 eq. 84: less use once stressed
    Dr = Math.min(TAW, Math.max(0, Dr - (x.rain ?? 0) + ks * etc0));
    trace.push({ d: x.d, t, rain: x.rain ?? 0, et0: x.et0 ?? 0, kc, etc: ks * etc0, Dr, TAW, RAW, zr });
  };
  let iToday = -1;
  wx.days.forEach((x, i) => {
    const t = parseISO(x.d);
    if (t < startT) return;
    if (t === today) iToday = i;
    if (t > today) return;
    step(x, t);
  });
  if (iToday < 0 || !trace.length) return null;
  // Ground truth beats the model: wet soil means field capacity now; dry soil means at least the stress point.
  const now = trace[trace.length - 1];
  if (fieldCheck === 'wet') { Dr = 0; now.Dr = 0; }
  if (fieldCheck === 'dry' && Dr < now.RAW) { Dr = now.RAW; now.Dr = Dr; }
  // Project the next 7 days on the forecast.
  const ahead = [];
  for (let i = iToday + 1; i < wx.days.length && ahead.length < 7; i++) {
    const x = wx.days[i]; const before = trace.length;
    step(x, parseISO(x.d));
    ahead.push(trace[before]);
  }
  trace.length -= ahead.length;
  const hitIn = ahead.findIndex((a) => a.Dr >= a.RAW); // days until the crop starts to suffer
  const rainNext3 = ahead.slice(0, 3).reduce((a, x) => a + x.rain, 0);
  const share = now.Dr / now.RAW; // 1 = the crop starts to suffer today
  let color;
  if (now.Dr >= now.RAW + 0.5 * (now.TAW - now.RAW)) color = 'RED';
  else if (now.Dr >= now.RAW) color = rainNext3 >= now.Dr ? 'YELLOW' : 'ORANGE';
  else if (hitIn >= 0 && hitIn <= 1 && rainNext3 < now.Dr) color = 'YELLOW';
  else color = 'GREEN';
  const net = now.Dr; // mm to bring the root zone back to field capacity
  const area = area_dec * DEC_M2;
  return {
    mode: 'balance', color, dToday, stage: faoStage(crop.id, dToday, days), now, ahead, hitIn, rainNext3, share, assumed, startT,
    lim, p, net, gross: net / FIELD_EFF, m3: (net / FIELD_EFF) * area / 1000, area_m2: area,
    rain7: trace.slice(-7).reduce((a, x) => a + x.rain, 0), et7: trace.slice(-7).reduce((a, x) => a + x.etc, 0),
    reasons: reasonsOf({ crop, color, now, hitIn, rainNext3, net, fieldCheck, trace }),
  };
}

function reasonsOf({ crop, color, now, hitIn, rainNext3, net, fieldCheck, trace }) {
  const r = [];
  const pct = Math.round((1 - now.Dr / now.TAW) * 100);
  const last7rain = trace.slice(-7).reduce((a, x) => a + x.rain, 0), last7et = trace.slice(-7).reduce((a, x) => a + x.etc, 0);
  r.push({ bn: bnDigits(`শিকড়ের নাগালে মাটির পানি এখন প্রায় ${pct}% (পুরো ভেজা = ১০০%)`), en: `Water within reach of the roots is about ${pct}% (fully wet = 100%)` });
  r.push({ bn: bnDigits(`গত ৭ দিনে বৃষ্টি ${Math.round(last7rain)} মিমি, ফসল আর মাটি থেকে উবে গেছে প্রায় ${Math.round(last7et)} মিমি`), en: `Last 7 days: ${Math.round(last7rain)} mm of rain, about ${Math.round(last7et)} mm used by the crop and soil` });
  if (fieldCheck === 'wet') r.push({ bn: 'আপনি বলেছেন মাটি ভেজা, তাই হিসাব আজ থেকে নতুন করে শুরু', en: 'You said the soil is wet, so the count restarts today' });
  if (fieldCheck === 'dry') r.push({ bn: 'আপনি বলেছেন মাটি শুকনো', en: 'You said the soil is dry' });
  if (color === 'GREEN' && hitIn < 0) r.push({ bn: 'পূর্বাভাস ধরে আগামী ৭ দিনেও পানির টান পড়বে না', en: 'On the forecast, no water stress in the next 7 days either' });
  else if (color === 'GREEN' || color === 'YELLOW') r.push({ bn: bnDigits(`পূর্বাভাস ধরে ${hitIn + 1} দিন পর ${bnIn(crop.name.bn)} পানির টান শুরু হবে`), en: `On the forecast, the ${crop.name.en.toLowerCase()} starts to run short in ${hitIn + 1} days` });
  if (color === 'ORANGE' || color === 'RED') r.push({ bn: bnDigits(`ফসল যতটা পানি সহজে নিতে পারে তা ফুরিয়েছে; মাটিকে পুরো ভেজাতে প্রায় ${Math.round(net)} মিমি পানি লাগবে`), en: `The easily usable water is gone; about ${Math.round(net)} mm brings the soil back to fully wet` });
  if (rainNext3 >= 5) r.push({ bn: bnDigits(`আগামী ৩ দিনে ${Math.round(rainNext3)} মিমি বৃষ্টির পূর্বাভাস${rainNext3 >= net && net > 0 ? ', যা ঘাটতি পূরণ করতে পারে' : ''}`), en: `${Math.round(rainNext3)} mm of rain forecast in the next 3 days${rainNext3 >= net && net > 0 ? ', enough to make up the shortfall' : ''}` });
  return r;
}

// Boro: BRRI alternate wetting and drying. Keep 2–5 cm of water for the first two weeks and around flowering; at
// other times let the water drop to 15 cm below the soil surface (seen in a perforated field pipe), then flood again.
function awd({ crop, plantT, wx, today, dToday, reset }) {
  const f = FAO56.boro, days = crop.days;
  const [a, b] = f.stages.map((x) => x * days);
  const keepWet = dToday <= 15 || (dToday >= a + b && dToday <= a + b + 25);
  const iT = wx.days.findIndex((x) => parseISO(x.d) === today);
  const past = wx.days.slice(Math.max(0, iT - 6), iT + 1), next = wx.days.slice(iT + 1, iT + 4);
  const etc = past.reduce((s, x) => s + kcOn('boro', Math.max(0, dToday), days) * (x.et0 ?? 0), 0);
  const rain7 = past.reduce((s, x) => s + (x.rain ?? 0), 0), rainNext3 = next.reduce((s, x) => s + (x.rain ?? 0), 0);
  // Water a 5 cm flood loses each day: crop use plus 3 mm/day seepage and percolation for heavy floodplain soils.
  const loss = etc / Math.max(1, past.length) + 3;
  const sinceReset = reset ? daysBetween(parseISO(reset), today) : null;
  const daysPerFlood = Math.max(3, Math.round(50 / loss));
  // The model cannot see the water in the field pipe, so without a logged irrigation the answer is "go and look".
  const color = keepWet ? (sinceReset != null && sinceReset < 2 ? 'GREEN' : 'YELLOW') : sinceReset == null ? 'YELLOW' : sinceReset >= daysPerFlood + 3 ? 'ORANGE' : 'GREEN';
  const reasons = [
    keepWet
      ? { bn: 'এখন জমিতে ২–৫ সেমি পানি ধরে রাখার সময় (রোপণের পর প্রথম দুই সপ্তাহ বা ফুল আসার সময়)', en: 'Now is the time to keep 2–5 cm of water standing (first two weeks after transplanting, or flowering)' }
      : { bn: 'এখন পর্যায়ক্রমে ভেজানো ও শুকানো (AWD): পাইপে পানি মাটির ১৫ সেমি নিচে নামলে তবেই আবার সেচ দিন', en: 'Now alternate wetting and drying (AWD): irrigate again only when the water in the pipe is 15 cm below the soil surface' },
    { bn: bnDigits(`৫ সেমি পানি এই আবহাওয়ায় প্রায় ${daysPerFlood} দিন টেকে (দিনে প্রায় ${Math.round(loss)} মিমি কমে)`), en: `A 5 cm flood lasts about ${daysPerFlood} days in this weather (about ${Math.round(loss)} mm a day)` },
    { bn: bnDigits(`গত ৭ দিনে বৃষ্টি ${Math.round(rain7)} মিমি; আগামী ৩ দিনে ${Math.round(rainNext3)} মিমি পূর্বাভাস`), en: `Rain: ${Math.round(rain7)} mm in the last 7 days, ${Math.round(rainNext3)} mm forecast for the next 3` },
  ];
  return { mode: 'awd', color, dToday, stage: faoStage('boro', dToday, days), keepWet, daysPerFlood, loss, rain7, rainNext3, reasons };
}

