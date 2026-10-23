// Live weather for where the viewer is now (browser location), or the selected farmer's field when location is
// off or refused: now, the next 24 hours (temperature, rain chance, wind) and 8 days.
// Data is Open-Meteo, refetched every 10 minutes and whenever the tab comes back into view.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { RefreshCw, ArrowUp, WifiOff, LocateFixed } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits, parseISO, fmtDate, fmtBangla } from '../../engine/dates';
import { fetchForecast, weatherOf, toF, dayShort, dayLong, hourLabel, compass } from '../../engine/forecast';
import { STORAGE_PREFIX } from '../../config/brand';

const REFRESH_MS = 10 * 60 * 1000;
const UNIT_KEY = `${STORAGE_PREFIX}.tempUnit`;

// Place name for a coordinate, in Bangla and English (BigDataCloud's free client-side lookup, no key).
async function placeName(lat, lon) {
  const one = async (lang) => {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`);
    if (!r.ok) throw new Error(`reverse geocode ${r.status}`);
    const j = await r.json();
    return j.locality || j.city || j.principalSubdivision || '';
  };
  const [bn, en] = await Promise.all([one('bn'), one('en')]);
  return { bn: bn || en, en: en || bn };
}

// The viewer's position. status: off | locating | ok | denied | failed.
function useMyPlace(on) {
  const [st, setSt] = useState({ status: on ? 'locating' : 'off', lat: null, lon: null, name: null });
  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) { setSt((p) => ({ ...p, status: 'failed' })); return; }
    setSt((p) => ({ ...p, status: 'locating' }));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = +coords.latitude.toFixed(4), lon = +coords.longitude.toFixed(4);
        setSt((p) => ({ ...p, status: 'ok', lat, lon }));
        try { const name = await placeName(lat, lon); setSt((p) => (p.lat === lat && p.lon === lon ? { ...p, name } : p)); } catch { /* keep coordinates without a name */ }
      },
      (e) => setSt((p) => ({ ...p, status: e.code === 1 ? 'denied' : 'failed' })),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    );
  }, []);
  useEffect(() => { if (on) locate(); else setSt((p) => ({ ...p, status: 'off' })); }, [on, locate]);
  return { ...st, locate };
}

function useForecast(lat, lon) {
  const [st, setSt] = useState({ data: null, error: false, loading: true, at: null });
  const seq = useRef(0);
  const load = useCallback(async () => {
    const my = ++seq.current;
    setSt((p) => ({ ...p, loading: true }));
    try {
      // One quiet retry first: slow rural connections often succeed on the second try.
      const data = await fetchForecast(lat, lon).catch(() => new Promise((r) => setTimeout(r, 2500)).then(() => fetchForecast(lat, lon)));
      if (my === seq.current) setSt({ data, error: false, loading: false, at: new Date() });
    } catch {
      if (my === seq.current) setSt((p) => ({ ...p, error: true, loading: false }));
    }
  }, [lat, lon]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const wake = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', load);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', wake); window.removeEventListener('online', load); };
  }, [load]);
  return { ...st, reload: load };
}

// place: optional fixed { lat, lon, name: { bn, en } } (e.g. an upazila centre); then the browser location is not asked for.
export default function LiveWeather({ className = '', place = null }) {
  const { s, T, farmer, union } = useStore();
  const lang = s.lang;
  const me = useMyPlace(!place);
  const here = !place && me.status === 'ok';
  const { data, error, loading, at, reload } = useForecast(place ? place.lat : here ? me.lat : farmer.lat, place ? place.lon : here ? me.lon : farmer.lon);
  const placeLabel = place ? (lang === 'bn' ? place.name.bn : place.name.en)
    : here ? (me.name ? (lang === 'bn' ? me.name.bn : me.name.en) : T('আপনার অবস্থান', 'Your location'))
      : (lang === 'bn' ? union.meta.bn : union.meta.en);
  const [unit, setUnit] = useState(() => { try { return localStorage.getItem(UNIT_KEY) || 'C'; } catch { return 'C'; } });
  const [tab, setTab] = useState('temp');
  const [dayIdx, setDayIdx] = useState(0);
  useEffect(() => { try { localStorage.setItem(UNIT_KEY, unit); } catch { /* storage unavailable */ } }, [unit]);

  const deg = useCallback((c) => num(unit === 'F' ? toF(c) : c, lang), [unit, lang]);

  // The 24 hours shown for the selected day: from now for today, from midnight for later days.
  const hours = useMemo(() => {
    if (!data) return [];
    const start = dayIdx === 0 ? data.current.hourIdx : data.hours.findIndex((h) => h.date === data.days[dayIdx].date);
    return data.hours.slice(Math.max(0, start), Math.max(0, start) + 24);
  }, [data, dayIdx]);

  if (!data) {
    return (
      <div className={`glass lite rounded-[26px] !bg-white/75 p-5 sm:p-6 ${className}`}>
        {error ? (
          <div className="flex flex-wrap items-center gap-3 text-[15px] text-muted">
            <WifiOff size={18} />{T('এখন আবহাওয়ার তথ্য আনা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।', 'Could not load the live weather. Check the connection and try again.')}
            <button type="button" onClick={reload} className="font-semibold text-primary-700 underline-offset-4 hover:underline">{T('আবার চেষ্টা', 'Try again')}</button>
          </div>
        ) : (
          <div className="space-y-4" aria-label={T('আবহাওয়া আসছে', 'Loading weather')}>
            <div className="flex items-center gap-4">
              <div className="skeleton h-16 w-16 !rounded-full" />
              <div className="skeleton h-12 w-28 !rounded-xl" />
              <div className="skeleton h-12 w-40 !rounded-xl" />
            </div>
            <div className="skeleton h-32 !rounded-2xl" />
            <div className="skeleton h-20 !rounded-2xl" />
          </div>
        )}
      </div>
    );
  }

  const day = data.days[dayIdx];
  const isToday = dayIdx === 0;
  const head = isToday
    ? { temp: data.current.temp, code: data.current.code, isDay: data.current.day, pop: data.current.pop, rh: data.current.rh, wind: data.current.wind }
    : { temp: day.max, code: day.code, isDay: true, pop: day.pop, rh: day.rh, wind: day.wind };
  // A clear night is not "sunny".
  const w = !head.isDay && weatherOf(head.code).kind === 'clear' ? { ...weatherOf(head.code), bn: 'পরিষ্কার আকাশ', en: 'Clear' } : weatherOf(head.code);
  const nowHour = +data.current.time.slice(11, 13);
  // Every third hour gets a column, lining up with the eight day buttons below.
  const cols = hours.filter((_, i) => i % 3 === 0).slice(0, 8);

  return (
    <section className={`glass lite rounded-[26px] !bg-white/75 p-5 sm:p-6 ${className}`} aria-label={T('এখনকার আবহাওয়া', 'Live weather')}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <WeatherIcon kind={w.kind} night={!head.isDay} size={84} />
          <div className="flex items-start">
            <span key={`${dayIdx}-${unit}`} className="swap-in font-display text-[60px] font-semibold leading-none tabular text-ink sm:text-[68px]">{deg(head.temp)}</span>
            <span className="ml-1.5 mt-1.5 flex items-center text-[18px] leading-none" role="group" aria-label={T('তাপমাত্রার একক', 'Temperature unit')}>
              {['C', 'F'].map((u, i) => (
                <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u}
                  className={`min-h-8 min-w-8 px-1.5 ${i ? 'border-l border-border' : ''} ${unit === u ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>°{u}</button>
              ))}
            </span>
          </div>
          <dl className="space-y-0.5 text-[14.5px] leading-6 text-muted">
            <div><dt className="inline">{T('বৃষ্টির সম্ভাবনা', 'Precipitation')}: </dt><dd className="inline tabular">{num(head.pop, lang)}%</dd></div>
            <div><dt className="inline">{T('আর্দ্রতা', 'Humidity')}: </dt><dd className="inline tabular">{num(head.rh, lang)}%</dd></div>
            <div><dt className="inline">{T('বাতাস', 'Wind')}: </dt><dd className="inline tabular">{num(head.wind, lang)} {T('কিমি/ঘণ্টা', 'km/h')}</dd></div>
          </dl>
        </div>
        <div className="w-full sm:w-auto sm:text-right">
          <p className="font-display text-[24px] font-bold leading-tight text-ink">{T('আবহাওয়া', 'Weather')} · {placeLabel}</p>
          <p className="text-[17px] text-muted">{dayLong(day.date, lang)}, {fmtDate(parseISO(day.date), lang)}{isToday ? ` · ${hourLabel(nowHour, lang, bnDigits)}` : ''}</p>
          <p className="text-[14px] text-muted">{T('বাংলা তারিখ', 'Bangla date')}: {fmtBangla(parseISO(day.date), lang)}</p>
          <p className="text-[17px] text-muted">{lang === 'bn' ? w.bn : w.en}</p>
          <p className="mt-1.5 inline-flex items-center gap-2 text-[12.5px] text-muted">
            {error
              ? <span className="inline-flex items-center gap-1 text-clay-700"><WifiOff size={13} />{T('আগের তথ্য', 'Last known')}</span>
              : <span className="inline-flex items-center gap-1.5 font-semibold text-primary-700"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" /></span>{T('লাইভ', 'Live')}</span>}
            {at && <span>{T('হালনাগাদ', 'Updated')} {clock(at, lang)}</span>}
            <button type="button" onClick={reload} disabled={loading} className="-my-2 grid h-8 w-8 place-items-center rounded-full hover:bg-primary-50 disabled:opacity-60" aria-label={T('এখনই হালনাগাদ করুন', 'Refresh now')}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted sm:justify-end">
            {me.status === 'locating' && <span>{T('আপনার অবস্থান খোঁজা হচ্ছে…', 'Finding your location…')}</span>}
            {me.status === 'denied' && <span>{T('অবস্থান জানার অনুমতি নেই, তাই জমির জায়গা দেখানো হচ্ছে', 'Location permission is off, showing the field')}</span>}
            {me.status === 'failed' && <span>{T('অবস্থান পাওয়া যায়নি, তাই জমির জায়গা দেখানো হচ্ছে', 'Could not get your location, showing the field')}</span>}
            {me.status !== 'ok' && me.status !== 'locating' && (
              <button type="button" onClick={me.locate} className="inline-flex items-center gap-1 font-semibold text-primary-700 underline-offset-4 hover:underline"><LocateFixed size={13} />{T('আবার চেষ্টা', 'Try again')}</button>
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1 text-[16px]" role="tablist">
        {[['temp', T('তাপমাত্রা', 'Temperature')], ['rain', T('বৃষ্টি', 'Precipitation')], ['wind', T('বাতাস', 'Wind')]].map(([k, label], i) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`relative px-3 pb-2 pt-1 ${i ? 'before:absolute before:left-0 before:top-1.5 before:h-5 before:w-px before:bg-border' : 'pl-0'} ${tab === k ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>
            {label}
            {tab === k && <span className={`tab-line absolute bottom-0 h-[3px] rounded-full bg-paddy-300 ${i ? 'inset-x-3' : 'left-0 right-3'}`} />}
          </button>
        ))}
      </div>

      <div className="hide-scrollbar -mx-1 mt-3 overflow-x-auto px-1">
        <div className="min-w-[640px]">
          <div key={`${tab}-${dayIdx}`} className="swap-in h-[140px]">
            {tab === 'temp' && <TempChart hours={hours} unit={unit} lang={lang} />}
            {tab === 'rain' && (
              <div className="grid h-full grid-cols-8 items-end">
                {cols.map((h) => (
                  <div key={h.time} className="flex flex-col items-center justify-end">
                    <span className="mb-1 text-[13px] font-semibold tabular text-muted">{num(h.pop, lang)}%</span>
                    <span className="w-[42%] rounded-t-md bg-sky-300" style={{ height: `${Math.max(3, h.pop * 0.95)}px` }} />
                  </div>
                ))}
              </div>
            )}
            {tab === 'wind' && (
              <div className="grid h-full grid-cols-8 items-center">
                {cols.map((h) => (
                  <div key={h.time} className="flex flex-col items-center gap-2" title={`${compass(h.dir, lang)}`}>
                    <ArrowUp size={Math.round(16 + Math.min(h.wind, 30) * 0.6)} strokeWidth={2.4} className="text-muted" style={{ transform: `rotate(${h.dir + 180}deg)` }} />
                    <span className="text-[13px] tabular text-muted">{num(h.wind, lang)} {T('কিমি/ঘ', 'km/h')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 grid grid-cols-8 text-center text-[13.5px] text-muted">
            {cols.map((h) => <span key={h.time}>{hourLabel(h.hour, lang, bnDigits)}</span>)}
          </div>

          <div className="mt-4 grid grid-cols-8 gap-1.5">
            {data.days.map((d, i) => (
              <button key={d.date} type="button" onClick={() => setDayIdx(i)} aria-pressed={dayIdx === i}
                className={`group flex flex-col items-center rounded-2xl px-1 py-2.5 transition-all duration-300 active:scale-[.95] ${dayIdx === i ? 'bg-primary-50 ring-1 ring-primary-300 shadow-[0_4px_14px_-3px_rgba(67,134,58,0.22)] scale-[1.02]' : 'hover:bg-black/[.04] hover:scale-[1.01]'}`}>
                <span className="font-display text-[17px] font-semibold text-ink">{i === 0 ? T('আজ', 'Today') : dayShort(d.date, lang)}</span>
                <span className="whitespace-nowrap text-[12.5px] leading-5 text-ink/80">{fmtDate(parseISO(d.date), lang)}</span>
                <span className="whitespace-nowrap text-[11.5px] leading-4 text-muted">{fmtBangla(parseISO(d.date), lang)}</span>
                <WeatherIcon kind={weatherOf(d.code).kind} size={52} className="my-1 transition-transform duration-300 group-hover:scale-110" />
                <span className="text-[14.5px] tabular"><span className="font-semibold text-ink">{deg(d.max)}°</span> <span className="text-muted">{deg(d.min)}°</span></span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] text-muted">{here
            ? T('উৎস: Open-Meteo, আপনি এখন যেখানে আছেন সেই জায়গা ধরে · প্রতি ১০ মিনিটে নিজে থেকে হালনাগাদ হয়', 'Source: Open-Meteo, for where you are now · refreshes itself every 10 minutes')
            : T('উৎস: Open-Meteo, আপনার জমির জায়গা ধরে · প্রতি ১০ মিনিটে নিজে থেকে হালনাগাদ হয়', 'Source: Open-Meteo, for your field’s location · refreshes itself every 10 minutes')}</p>
    </section>
  );
}

// Hourly temperature curve. The x axis runs from -1.5 to 22.5 so the hour-0, 3, 6 … points sit at the centre
// of the eight columns below; the edge points are padded so the area runs to both sides. Drawn as plain SVG at the
// container's real pixel width (no chart library), with a monotone curve that never overshoots the readings.
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Fritsch–Carlson monotone cubic through the points, as an SVG path.
function monotonePath(p) {
  const n = p.length;
  if (n < 2) return '';
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  let out = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = (p[i + 1][0] - p[i][0]) / 3;
    out += `C${(p[i][0] + dx).toFixed(1)},${(p[i][1] + m[i] * dx).toFixed(1)} ${(p[i + 1][0] - dx).toFixed(1)},${(p[i + 1][1] - m[i + 1] * dx).toFixed(1)} ${p[i + 1][0].toFixed(1)},${p[i + 1][1].toFixed(1)}`;
  }
  return out;
}

function TempChart({ hours, unit, lang }) {
  const [ref, W] = useWidth();
  const gid = useId().replace(/:/g, '');
  const conv = (c) => (unit === 'F' ? toF(c) : c);
  const pts = hours.slice(0, 23).map((h, i) => ({ x: i, v: conv(h.temp) }));
  const H = 140, TOP = 22;
  if (!pts.length) return <div ref={ref} className="h-full" />;
  const last = hours[23] ? (conv(hours[22].temp) + conv(hours[23].temp)) / 2 : pts[pts.length - 1].v;
  const data = [{ x: -1.5, v: pts[0].v }, ...pts, { x: 22.5, v: last }];
  const vals = data.map((d) => d.v);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 4);
  const y0 = lo - span * 0.9, y1 = hi + span * 0.15;
  const X = (x) => ((x + 1.5) / 24) * W;
  const Y = (v) => TOP + (1 - (v - y0) / (y1 - y0)) * (H - TOP);
  const xy = data.map((d) => [X(d.x), Y(d.v)]);
  const line = monotonePath(xy);
  return (
    <div ref={ref} className="h-full">
      {W > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" aria-hidden="true">
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#edc067" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#edc067" stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <path d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${gid})`} />
          <path className="line-draw" d={line} fill="none" stroke="#e0a12b" strokeWidth="2.5" strokeLinecap="round" pathLength="1" />
          {data.map((d, i) => (d.x >= 0 && d.x % 3 === 0
            ? <text key={i} x={xy[i][0]} y={xy[i][1] - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="#566a5e">{num(d.v, lang)}</text>
            : null))}
        </svg>
      )}
    </div>
  );
}

function clock(d, lang) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: 'Asia/Dhaka' }).formatToParts(d).map((x) => [x.type, x.value]));
  const h = +p.hour % 24, m = p.minute;
  if (lang !== 'bn') return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
  return `${hourLabel(h, 'bn', bnDigits).replace('টা', '')}:${bnDigits(m)}`;
}

// Drawn weather icons: a soft orange sun, a moon at night, clouds, rain, lightning, fog and snow.
const SUN_PATH = (() => {
  const n = 120, pts = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2, r = 23 + 1.5 * Math.cos(t * 10);
    pts.push(`${(32 + r * Math.cos(t)).toFixed(2)},${(32 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();
const CLOUD = 'M19 52H47A9.5 9.5 0 0 0 48.5 33.1A12.5 12.5 0 0 0 25 30.5A10.8 10.8 0 0 0 19 52Z';

export function WeatherIcon({ kind, night = false, size = 48, className = '' }) {
  const id = useId().replace(/:/g, '');
  const wet = kind === 'rain' || kind === 'showers' || kind === 'drizzle' || kind === 'storm' || kind === 'snow';
  const showSun = kind === 'clear' || kind === 'partly' || kind === 'showers';
  const showCloud = kind !== 'clear';
  const sunT = kind === 'clear' ? '' : 'translate(-7 -9) scale(.78)';
  const cloudT = kind === 'partly' || kind === 'showers' ? 'translate(4 2)' : wet ? 'translate(0 -8)' : '';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}s`} cx="38%" cy="32%" r="75%"><stop offset="0%" stopColor="#ffd56b" /><stop offset="60%" stopColor="#f5ac3c" /><stop offset="100%" stopColor="#e07a24" /></radialGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor={kind === 'storm' ? '#a9b2bd' : '#d7dde4'} /></linearGradient>
        <linearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3f1e6" /><stop offset="100%" stopColor="#c9cfb8" /></linearGradient>
      </defs>
      {showSun && (night
        ? <path transform={sunT} d="M38 12A20 20 0 1 0 52 44A16 16 0 0 1 38 12Z" fill={`url(#${id}m)`} />
        : <path transform={sunT} d={SUN_PATH} fill={`url(#${id}s)`} />)}
      {showCloud && <path transform={cloudT} d={CLOUD} fill={`url(#${id}c)`} stroke="#c3cad3" strokeWidth=".8" />}
      {(kind === 'rain' || kind === 'showers' || kind === 'drizzle' || kind === 'storm') && (
        <g stroke="#3d8fd1" strokeWidth={kind === 'drizzle' ? 2 : 2.6} strokeLinecap="round">
          {(kind === 'drizzle' ? [[25, 49], [33, 51], [41, 49]] : [[24, 48], [32, 50], [40, 48]]).map(([x, y]) => <line key={x} x1={x} y1={y} x2={x - 2.5} y2={y + (kind === 'drizzle' ? 5 : 9)} />)}
        </g>
      )}
      {kind === 'storm' && <path d="M35 44L29 54H34L31 62L40 50H35L38 44Z" fill="#f6b73c" />}
      {kind === 'snow' && <g fill="#8fb8dc">{[[24, 52], [32, 56], [40, 52]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.4" />)}</g>}
      {kind === 'fog' && <g stroke="#a7b0ba" strokeWidth="2.6" strokeLinecap="round"><line x1="14" y1="57" x2="46" y2="57" /><line x1="20" y1="62" x2="52" y2="62" /></g>}
    </svg>
  );
}
