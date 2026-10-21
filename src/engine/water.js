import { bnDigits } from './dates.js';
import { bnIn } from './text.js';
// Today card: water + weather advice [RULE]. Inputs may be live (Open-Meteo) or a DEMO scenario.

export function cropStage(crop, daysAfter) {
  const f = daysAfter / crop.days;
  if (daysAfter < 0) return { id: 'before', sens: 0, bn: 'এখনো লাগানো হয়নি', en: 'Not planted yet' };
  if (f < 0.2) return { id: 'establish', sens: 1.5, bn: 'চারা মাটিতে লেগে যাচ্ছে', en: 'Seedlings settling in' };
  if (f < 0.5) return { id: 'veg', sens: 1, bn: 'গাছ বাড়ছে', en: 'Growing' };
  if (f < 0.85) return { id: 'flower', sens: 2, bn: 'ফুল আর ফল ধরছে', en: 'Flowering and fruiting' };
  return { id: 'mature', sens: 1, bn: 'পাকছে, তোলার সময় কাছে', en: 'Ripening, nearly ready' };
}

export const WATER_COLORS = {
  GREEN: { bn: 'আজ সেচ লাগবে না', en: 'No need to irrigate today' },
  YELLOW: { bn: 'জমিতে গিয়ে মাটি দেখুন', en: 'Go and check the soil' },
  ORANGE: { bn: 'আজ সেচ দিন', en: 'Irrigate today' },
  RED: { bn: 'জমি খুব শুকনো, এখনই সেচ দিন', en: 'Field is very dry, irrigate now' },
};

const mm = (x) => Math.round(x);
export function waterAdvice({ crop, stage, rain7, rainNext3, tmax, fieldCheck }) {
  const reasons = [];
  if (fieldCheck === 'wet') {
    return { color: 'GREEN', points: 0, reasons: [{ bn: 'আপনি বলেছেন মাটি ভেজা আছে। দুই দিন পর আবার দেখুন।', en: 'You said the soil is still wet. Check again in two days.' }] };
  }
  let pts = 0;
  if (rain7 < 5) { pts += 2; reasons.push({ bn: bnDigits(`গত এক সপ্তাহে বৃষ্টি হয়নি বললেই চলে (${mm(rain7)} মিলিমিটার)`), en: `Hardly any rain in the past week (${mm(rain7)} mm)` }); }
  else if (rain7 < 15) { pts += 1; reasons.push({ bn: bnDigits(`গত এক সপ্তাহে সামান্য বৃষ্টি হয়েছে (${mm(rain7)} মিলিমিটার)`), en: `Only a little rain in the past week (${mm(rain7)} mm)` }); }
  if (tmax >= 35) { pts += 2; reasons.push({ bn: bnDigits(`আজ খুব গরম, ${mm(tmax)}° সেলসিয়াস`), en: `Very hot today, ${mm(tmax)} °C` }); }
  else if (tmax >= 32) { pts += 1; reasons.push({ bn: bnDigits(`আজ বেশ গরম, ${mm(tmax)}° সেলসিয়াস`), en: `Hot today, ${mm(tmax)} °C` }); }
  if (stage.sens >= 1.5) { pts += 1; reasons.push({ bn: `এখন ${stage.bn} — এই সময়ে পানির টান পড়লে ক্ষতি বেশি`, en: `${stage.en} — a dry spell now does the most harm` }); }
  if (crop.water === 'High') { pts += 1; reasons.push({ bn: `${bnIn(crop.name.bn)} পানি বেশি লাগে`, en: `${crop.name.en} needs a lot of water` }); }
  if (fieldCheck === 'dry') { pts += 2; reasons.push({ bn: 'আপনি বলেছেন মাটি শুকনো', en: 'You said the soil is dry' }); }
  if (rainNext3 >= 15) { pts -= 3; reasons.push({ bn: bnDigits(`আগামী তিন দিনে বৃষ্টি আসছে (${mm(rainNext3)} মিলিমিটার), তাই সেচ একটু পিছিয়ে দিন`), en: `Rain is coming in the next three days (${mm(rainNext3)} mm), so hold off irrigating` }); }
  else if (rainNext3 >= 5) { pts -= 1; reasons.push({ bn: bnDigits(`আগামী তিন দিনে হালকা বৃষ্টি হতে পারে (${mm(rainNext3)} মিলিমিটার)`), en: `Light rain is possible in the next three days (${mm(rainNext3)} mm)` }); }
  const color = pts <= 1 ? 'GREEN' : pts <= 3 ? 'YELLOW' : pts <= 5 ? 'ORANGE' : 'RED';
  return { color, points: pts, reasons };
}

export function weatherAlerts({ tmax, rainNext3 }) {
  const a = [];
  if (tmax >= 35) a.push({ level: 'warn', bn: 'খুব গরম পড়ছে। ভরদুপুরে সেচ না দিয়ে সকালে বা বিকেলে দিন।', en: 'It is very hot. Irrigate in the morning or evening, not at midday.' });
  if (rainNext3 >= 40) a.push({ level: 'warn', bn: 'ভারী বৃষ্টি আসছে। জমির নালা পরিষ্কার রাখুন, এখন ওষুধ স্প্রে করবেন না।', en: 'Heavy rain is coming. Clear the field drains and do not spray now.' });
  return a;
}

// DEMO scenarios used when live weather is not available
export const DEMO_SCENARIOS = {
  dry: { bn: 'শুকনো সপ্তাহ', en: 'Dry week', rain7: 0, rainNext3: 0, tmax: 27 },
  hot: { bn: 'চৈত্রের গরম', en: 'Early heatwave', rain7: 2, rainNext3: 0, tmax: 34 },
  rain: { bn: 'বৃষ্টি আসছে', en: 'Rain on the way', rain7: 4, rainNext3: 45, tmax: 25 },
};

// Live weather at the field from Open-Meteo (non-NASA): daily rain, temperature and FAO-56 Penman–Monteith ET₀ for the
// last 92 days (the most it gives) and the next 7, for the field water balance (fieldwater.js). Null on any failure.
export const PAST_DAYS = 92;
export async function fetchLiveWeather(lat, lon) {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min&past_days=${PAST_DAYS}&forecast_days=8&timezone=Asia%2FDhaka`;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(u, { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const j = await r.json();
    const D = j.daily, p = D.precipitation_sum, t = D.temperature_2m_max, k = PAST_DAYS; // index k = today
    const days = D.time.map((d, i) => ({ d, rain: p[i], et0: D.et0_fao_evapotranspiration[i], tmax: t[i], tmin: D.temperature_2m_min[i] }));
    const rain7 = p.slice(k - 7, k).reduce((a, b) => a + (b || 0), 0);
    const rainNext3 = p.slice(k + 1, k + 4).reduce((a, b) => a + (b || 0), 0);
    return { rain7, rainNext3, tmax: t[k], date: D.time[k], days, today: k, lat: j.latitude, lon: j.longitude, fetched: Date.now(), url: u };
  } catch {
    return null;
  }
}
