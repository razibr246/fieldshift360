// When is it safe to spray? Before a pesticide, fungicide or foliar feed goes on, each daylight hour of the live
// forecast (Open-Meteo, engine/forecast.js) is checked against the usual drift and wash-off rules, and the good
// windows of the next two days are named. The idea comes from AgriRemediate-AI's safety gate (it stops at wind over
// 20 km/h); here it uses the real forecast and the wider rules spray guides give:
//   wind 3–15 km/h: below 3 the air can be still with an inversion (fine drops hang and travel); above 15 they drift
//     (GRDC "Managing spray drift"; Ontario OMAFA "Pesticide drift from ground applications").
//   Delta T (air minus wet-bulb temperature) 2–8 °C is good, 8–10 marginal, over 10 the drops evaporate before they
//     land; under 2 they stay wet and run off (GRDC). Wet-bulb from temperature and humidity by Stull (2011).
//   rain: a 50% or higher chance in the next 4 hours washes most products off; 30–50% is a risk. The label's
//     rain-fast time decides in the end.
// The farmer decides and reads the label; this only says which hours the weather allows. Pure; docs/THRESHOLDS.md.
export const SPRAY = { windMin: 3, windMax: 15, dtLow: 2, dtGood: 8, dtMax: 10, rainNo: 50, rainRisk: 30, rainHours: 4 };

// Wet-bulb temperature (°C) from air temperature (°C) and relative humidity (%), Stull 2011 (J. Appl. Meteor.
// Climatol. 50:2267), valid for RH 5–99% and −20 to 50 °C, error under 1 °C.
export function wetBulb(t, rh) {
  return t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + Math.atan(t + rh) - Math.atan(rh - 1.676331)
    + 0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) - 4.686035;
}
export const deltaT = (t, rh) => t - wetBulb(t, rh);

// One hour: { ok: 'go' | 'risk' | 'no', why: [{ bn, en, k }] }. `ahead` = the next hours (for rain).
export function sprayHour(h, ahead = []) {
  const why = [];
  let level = 'go';
  const worse = (l) => { if (l === 'no' || (l === 'risk' && level === 'go')) level = l; };
  if (h.wind > SPRAY.windMax) { worse('no'); why.push({ k: 'wind', bn: `বাতাস ${Math.round(h.wind)} কিমি/ঘণ্টা: ওষুধ উড়ে পাশের জমি, পুকুর বা বাড়িতে যাবে`, en: `Wind ${Math.round(h.wind)} km/h: the spray drifts onto neighbours, ponds or homes` }); }
  else if (h.wind < SPRAY.windMin) { worse('risk'); why.push({ k: 'calm', bn: 'বাতাস প্রায় নেই: সূক্ষ্ম কণা ভেসে থাকে, দূরে সরে যেতে পারে', en: 'Almost no wind: fine drops hang in the air and can travel' }); }
  const dt = h.temp != null && h.rh != null ? deltaT(h.temp, h.rh) : null;
  if (dt != null) {
    if (dt > SPRAY.dtMax) { worse('no'); why.push({ k: 'dry', bn: 'খুব গরম ও শুকনো: ফোঁটা পাতায় পৌঁছানোর আগেই শুকিয়ে যায়', en: 'Too hot and dry: drops dry out before they reach the leaf' }); }
    else if (dt > SPRAY.dtGood) { worse('risk'); why.push({ k: 'dry', bn: 'গরম আর শুকনো হাওয়া: মোটা ফোঁটায় দিন', en: 'Warm, dry air: use coarse drops' }); }
    else if (dt < SPRAY.dtLow) { worse('risk'); why.push({ k: 'wet', bn: 'বাতাস খুব ভেজা: পাতা ভেজা থাকলে ওষুধ গড়িয়ে পড়ে', en: 'Very humid air: on wet leaves the spray runs off' }); }
  }
  const rain = Math.max(h.pop ?? 0, ...ahead.slice(0, SPRAY.rainHours).map((x) => x.pop ?? 0));
  if (rain >= SPRAY.rainNo) { worse('no'); why.push({ k: 'rain', bn: `পরের ${SPRAY.rainHours} ঘণ্টায় বৃষ্টির সম্ভাবনা ${Math.round(rain)}%: ধুয়ে যাবে`, en: `${Math.round(rain)}% chance of rain in the next ${SPRAY.rainHours} hours: it would wash off` }); }
  else if (rain >= SPRAY.rainRisk) { worse('risk'); why.push({ k: 'rain', bn: `পরের ${SPRAY.rainHours} ঘণ্টায় বৃষ্টির সম্ভাবনা ${Math.round(rain)}%`, en: `${Math.round(rain)}% chance of rain in the next ${SPRAY.rainHours} hours` }); }
  return { ok: level, why, dt };
}

// Every daylight hour from `fromTime` (ISO hour, the forecast's own clock) for `days` days, judged, plus the
// windows: runs of 2+ "go" hours in a row, best (longest, then earliest) first.
export function sprayPlan(hours, { fromTime, days = 2 } = {}) {
  const start = Math.max(0, fromTime ? hours.findIndex((h) => h.time >= fromTime) : 0);
  const lastDate = hours[start]?.date;
  if (!lastDate) return { hours: [], windows: [], best: null, nowOk: null };
  // The next `days` days that still have daylight left (after dark, today drops out and the day after comes in).
  const lit = (h) => h.day && h.hour >= 6 && h.hour <= 18; // nobody sprays in the dark
  const dates = [...new Set(hours.slice(start).filter(lit).map((h) => h.date))].slice(0, days);
  const judged = [];
  for (let i = start; i < hours.length; i++) {
    const h = hours[i];
    if (h.date > dates.at(-1)) break;
    if (!lit(h) || !dates.includes(h.date)) continue;
    judged.push({ ...h, ...sprayHour(h, hours.slice(i + 1)) });
  }
  const windows = [];
  let run = [];
  const close = () => { if (run.length >= 2) windows.push({ date: run[0].date, from: run[0].hour, to: run.at(-1).hour + 1, hours: run.length }); run = []; };
  for (const h of judged) {
    if (h.ok === 'go' && (!run.length || (run.at(-1).date === h.date && run.at(-1).hour === h.hour - 1))) run.push(h);
    else { close(); if (h.ok === 'go') run.push(h); }
  }
  close();
  const best = [...windows].sort((a, b) => b.hours - a.hours || (a.date < b.date ? -1 : a.date > b.date ? 1 : a.from - b.from))[0] ?? null;
  return { hours: judged, windows, best, nowOk: judged[0]?.time === hours[start]?.time ? judged[0] : null };
}
