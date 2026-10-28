// Live forecast from Open-Meteo (free, no API key): current conditions, hourly for 8 days and the daily summary.
// Times come back as local Dhaka wall-clock strings ("2026-10-14T09:00"), so they are read as text, not as Date objects.

const HOURLY = 'temperature_2m,precipitation_probability,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day';
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max';
const CURRENT = 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day';

export const forecastUrl = (lat, lon, tz = 'Asia/Dhaka') =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${CURRENT}&hourly=${HOURLY}&daily=${DAILY}&forecast_days=8&timezone=${encodeURIComponent(tz)}`;

// Open-Meteo now and then answers 502/503 for a moment or drops the connection; one retry after a short pause saves the
// page from showing no weather until its next ten-minute refresh.
async function getOnce(url, signal, retry = 1) {
  try {
    const r = await fetch(url, { signal });
    if (r.status >= 500 && retry > 0) throw new Error(`Open-Meteo ${r.status}`);
    return r;
  } catch (e) {
    if (retry <= 0 || signal.aborted) throw e;
    await new Promise((res) => setTimeout(res, 1500));
    return getOnce(url, signal, retry - 1);
  }
}

// Returns { current, hours[], days[], url } or throws. `tz` sets whose wall clock the times are in (Dhaka by default).
export async function fetchForecast(lat, lon, { timeout = 15000, tz } = {}) {
  const url = forecastUrl(lat, lon, tz);
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await getOnce(url, ctl.signal);
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const j = await r.json();
    const h = j.hourly, d = j.daily, c = j.current;
    const hours = h.time.map((t, i) => ({
      time: t, date: t.slice(0, 10), hour: +t.slice(11, 13),
      temp: h.temperature_2m[i], pop: h.precipitation_probability[i] ?? 0, rh: h.relative_humidity_2m[i],
      wind: h.wind_speed_10m[i], dir: h.wind_direction_10m[i], code: h.weather_code[i], day: h.is_day[i] === 1,
    }));
    const days = d.time.map((t, i) => {
      const own = hours.filter((x) => x.date === t);
      return {
        date: t, code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i],
        pop: d.precipitation_probability_max[i] ?? 0, wind: d.wind_speed_10m_max[i], rain: d.precipitation_sum?.[i] ?? null,
        rh: own.length ? own.reduce((a, x) => a + x.rh, 0) / own.length : null,
      };
    });
    const current = {
      time: c.time, temp: c.temperature_2m, rh: c.relative_humidity_2m, rain: c.precipitation,
      code: c.weather_code, wind: c.wind_speed_10m, dir: c.wind_direction_10m, day: c.is_day === 1,
    };
    // Chance of rain "now" is the forecast for the current hour.
    const nowIdx = hours.findIndex((x) => x.time === `${c.time.slice(0, 13)}:00`);
    current.pop = nowIdx >= 0 ? hours[nowIdx].pop : days[0]?.pop ?? 0;
    current.hourIdx = Math.max(0, nowIdx);
    return { current, hours, days, url };
  } finally {
    clearTimeout(to);
  }
}

// WMO weather codes -> what the icon draws and the words shown.
const W = (kind, bn, en) => ({ kind, bn, en });
const CODES = {
  0: W('clear', 'রোদ ঝলমলে', 'Sunny'),
  1: W('clear', 'প্রায় পরিষ্কার', 'Mostly sunny'),
  2: W('partly', 'আংশিক মেঘলা', 'Partly cloudy'),
  3: W('cloudy', 'মেঘলা', 'Cloudy'),
  45: W('fog', 'কুয়াশা', 'Fog'),
  48: W('fog', 'ঘন কুয়াশা', 'Freezing fog'),
  51: W('drizzle', 'গুঁড়ি গুঁড়ি বৃষ্টি', 'Light drizzle'),
  53: W('drizzle', 'গুঁড়ি গুঁড়ি বৃষ্টি', 'Drizzle'),
  55: W('drizzle', 'ঘন গুঁড়ি বৃষ্টি', 'Heavy drizzle'),
  56: W('drizzle', 'ঠান্ডা গুঁড়ি বৃষ্টি', 'Freezing drizzle'),
  57: W('drizzle', 'ঠান্ডা গুঁড়ি বৃষ্টি', 'Freezing drizzle'),
  61: W('rain', 'হালকা বৃষ্টি', 'Light rain'),
  63: W('rain', 'বৃষ্টি', 'Rain'),
  65: W('rain', 'ভারী বৃষ্টি', 'Heavy rain'),
  66: W('rain', 'ঠান্ডা বৃষ্টি', 'Freezing rain'),
  67: W('rain', 'ঠান্ডা ভারী বৃষ্টি', 'Freezing rain'),
  71: W('snow', 'হালকা তুষার', 'Light snow'),
  73: W('snow', 'তুষার', 'Snow'),
  75: W('snow', 'ভারী তুষার', 'Heavy snow'),
  77: W('snow', 'তুষারকণা', 'Snow grains'),
  80: W('showers', 'থেমে থেমে বৃষ্টি', 'Showers'),
  81: W('showers', 'থেমে থেমে বৃষ্টি', 'Showers'),
  82: W('showers', 'প্রবল ঝুম বৃষ্টি', 'Heavy showers'),
  85: W('snow', 'তুষার ঝড়', 'Snow showers'),
  86: W('snow', 'তুষার ঝড়', 'Snow showers'),
  95: W('storm', 'বজ্রসহ বৃষ্টি', 'Thunderstorm'),
  96: W('storm', 'শিলাবৃষ্টি ও বজ্রঝড়', 'Thunderstorm with hail'),
  99: W('storm', 'শিলাবৃষ্টি ও বজ্রঝড়', 'Thunderstorm with hail'),
};
export const weatherOf = (code) => CODES[code] ?? W('cloudy', 'মেঘলা', 'Cloudy');

export const toF = (c) => (c * 9) / 5 + 32;

const WEEK_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const WEEK_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_EN_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekday = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay();
export const dayShort = (isoDate, lang) => (lang === 'bn' ? WEEK_BN : WEEK_EN)[weekday(isoDate)];
export const dayLong = (isoDate, lang) => (lang === 'bn' ? `${WEEK_BN[weekday(isoDate)]}বার` : WEEK_EN_LONG[weekday(isoDate)]);

// Farmers read time by part of the day: "সকাল ১০টা", "রাত ১টা".
export function hourLabel(h, lang, bnDigits) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (lang !== 'bn') return `${h12} ${h < 12 ? 'AM' : 'PM'}`;
  const part = h >= 4 && h < 6 ? 'ভোর' : h >= 6 && h < 12 ? 'সকাল' : h >= 12 && h < 15 ? 'দুপুর' : h >= 15 && h < 18 ? 'বিকেল' : h >= 18 && h < 20 ? 'সন্ধ্যা' : 'রাত';
  return `${part} ${bnDigits(h12)}টা`;
}

// A clock time on Dhaka's wall clock: "রাত ৯:৪১" in Bangla (the browser's bn-BD format still writes AM/PM in
// English), "9:41 PM" in English.
const BN_D = (x) => String(x).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
export function clockText(t, lang) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Dhaka' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const h = +p.hour % 24, m = p.minute;
  if (lang !== 'bn') return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  return `${hourLabel(h, 'bn', BN_D).replace('টা', '')}:${BN_D(m)}`;
}

const COMPASS_BN = ['উত্তর', 'উত্তর-পূর্ব', 'পূর্ব', 'দক্ষিণ-পূর্ব', 'দক্ষিণ', 'দক্ষিণ-পশ্চিম', 'পশ্চিম', 'উত্তর-পশ্চিম'];
const COMPASS_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compass = (deg, lang) => (lang === 'bn' ? COMPASS_BN : COMPASS_EN)[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
