// "This season so far": the last 60 days of NASA POWER (fetched live in the browser) against the same 60 days in
// each of the 25 past seasons. If NASA does not answer, or its rain does not agree with the saved record where they
// overlap (rainAgrees), the saved data file is used and the card says so, with its date.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useStore, clim as godagariClim } from '../../store';
import { seasonSoFar, rainAgrees } from '../../engine/climate';
import { num, fmtDate, fmtBangla, todayDhaka, addDays, iso } from '../../engine/dates';

const DAYS = 60;
const W = 900, H = 200, PL = 40, PB = 22, PT = 8;

async function fetchPower(lat, lon) {
  const end = todayDhaka(), start = addDays(end, -(DAYS + 20));
  const q = new URLSearchParams({ parameters: 'T2M_MAX,PRECTOTCORR', community: 'AG', latitude: lat, longitude: lon, start: iso(start).replaceAll('-', ''), end: iso(end).replaceAll('-', ''), format: 'JSON' });
  const r = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${q}`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`POWER ${r.status}`);
  const p = (await r.json()).properties.parameter;
  const keys = Object.keys(p.PRECTOTCORR).sort();
  const val = (k, d) => { const v = p[k][d]; return v == null || v <= -998 ? null : v; };
  return { start: Date.parse(`${keys[0].slice(0, 4)}-${keys[0].slice(4, 6)}-${keys[0].slice(6, 8)}T00:00:00Z`), prec: keys.map((d) => val('PRECTOTCORR', d)), tmax: keys.map((d) => val('T2M_MAX', d)) };
}

// clim: the upazila record the season is compared with (Godagari on the public pages, the farmer's own elsewhere).
// place: optional { bn, en } name shown in the title.
export default function SeasonSoFar({ clim = godagariClim, lat = clim.prov.lat, lon = clim.prov.lon, place, className = '' }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [st, setSt] = useState({ series: null, live: false, loading: true });
  const load = useCallback(async () => {
    setSt((p) => ({ ...p, loading: true }));
    try {
      const series = await fetchPower(lat, lon);
      if (!rainAgrees(clim, series)) throw new Error('POWER rain disagrees with the saved record');
      setSt({ series, live: true, loading: false });
    }
    catch { setSt({ series: { start: clim.start, prec: clim.raw.prec, tmax: clim.raw.tmax }, live: false, loading: false }); }
  }, [clim, lat, lon]);
  useEffect(() => { load(); }, [load]);
  const r = useMemo(() => (st.series ? seasonSoFar(clim, st.series, DAYS) : null), [clim, st.series]);

  if (!r) {
    return <div className={`glass flat animate-pulse rounded-[22px] p-5 ${className}`}><div className="h-5 w-56 rounded bg-primary-100" /><div className="mt-4 h-28 rounded-xl bg-primary-50" /></div>;
  }
  const rain = r.now.cum[DAYS - 1];
  const rainDiff = r.normal.rain > 0 ? ((rain - r.normal.rain) / r.normal.rain) * 100 : 0;
  const tDiff = r.now.tmax - r.normal.tmax;
  const max = Math.max(rain, ...r.band.map((b) => b.hi)) * 1.1 || 1;
  const x = (k) => PL + (k / (DAYS - 1)) * (W - PL - 4);
  const y = (v) => H - PB - (v / max) * (H - PB - PT);
  const path = (get) => r.band.map((b, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(get(b, k)).toFixed(1)}`).join('');
  const area = `${path((b) => b.hi)}${[...r.band].reverse().map((b, i) => `L${x(DAYS - 1 - i).toFixed(1)},${y(b.lo).toFixed(1)}`).join('')}Z`;
  const day = (t) => (lang === 'bn' ? fmtBangla(t, 'bn') : fmtDate(t, 'en'));
  const sign = (v, dp = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), lang, { dp })}`;
  const word = (v, small) => (Math.abs(v) < small ? T('স্বাভাবিকের কাছাকাছি', 'about normal') : v > 0 ? T('স্বাভাবিকের চেয়ে বেশি', 'above normal') : T('স্বাভাবিকের চেয়ে কম', 'below normal'));
  const ticks = [0, max / 2, max].map((v) => Math.round(v / 50) * 50);
  const dayTicks = [0, 15, 30, 45, DAYS - 1];
  const hotMatters = r.now.hot > 0 || r.normal.hot >= 0.5; // 35° days only mean something in the hot months
  // Where this year's rain sits among the past years, said plainly at the two ends.
  const rank = r.drierYears === 0
    ? T(`আগের ${num(r.years, 'bn')} বছরের কোনোটিতেই একই সময়ে এত কম বৃষ্টি হয়নি`, `drier than the same weeks in every one of the past ${r.years} years`)
    : r.drierYears === r.years
      ? T(`আগের ${num(r.years, 'bn')} বছরের কোনোটিতেই একই সময়ে এত বেশি বৃষ্টি হয়নি`, `wetter than the same weeks in every one of the past ${r.years} years`)
      : T(`আগের ${num(r.years, 'bn')} বছরের ${num(r.drierYears, 'bn')}টিতে একই সময়ে এর চেয়ে কম বৃষ্টি হয়েছিল`, `in ${r.drierYears} of the past ${r.years} years the same weeks were drier`);
  const lead = T(
    `গত ${num(DAYS, 'bn')} দিনে বৃষ্টি ${num(rain, 'bn')} মিমি, ${word(rainDiff, 10)}: ${rank}। দিনের গড় সর্বোচ্চ তাপমাত্রা ${num(r.now.tmax, 'bn', { dp: 1 })}°, ${word(tDiff, 0.5)}।`,
    `In the last ${DAYS} days ${Math.round(rain)} mm of rain fell, ${word(rainDiff, 10)}: ${rank}. Daily highs averaged ${r.now.tmax.toFixed(1)}°, ${word(tDiff, 0.5)}.`,
  );

  return (
    <div id="season-so-far" className={`glass flat rounded-[22px] p-5 sm:p-6 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-bold">{T(`এই মৌসুমে এখন পর্যন্ত: গত ${num(DAYS, 'bn')} দিন`, `This season so far: the last ${DAYS} days`)}{place && <span className="text-primary-700"> · {L(place)}</span>}</h3>
          <p className="mt-0.5 text-[13.5px] text-muted">{T(`${day(r.from)} থেকে ${day(r.end)} (${fmtDate(r.end, 'bn')}), আগের ${num(r.years, 'bn')} বছরের একই সময়ের সঙ্গে তুলনা`, `${day(r.from)} to ${day(r.end)}, against the same weeks in the past ${r.years} years`)}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${st.live ? 'bg-primary-50 text-primary-800' : 'bg-clay-50 text-clay-700'}`}>
          {st.live ? <><span className="h-1.5 w-1.5 rounded-full bg-primary-500" />{T('লাইভ · নাসা POWER', 'Live · NASA POWER')}</> : <><WifiOff size={13} />{T(`সংরক্ষিত তথ্য · ${day(r.end)} পর্যন্ত`, `Saved data · up to ${day(r.end)}`)}</>}
          <button type="button" onClick={load} disabled={st.loading} className="-my-2 -mr-1.5 ml-0.5 grid h-8 w-8 place-items-center rounded-full hover:bg-black/5 disabled:opacity-50" aria-label={T('আবার আনুন', 'Reload')}><RefreshCw size={12} className={st.loading ? 'animate-spin' : ''} /></button>
        </span>
      </div>

      <p className="mt-3 max-w-3xl text-[14.5px] leading-7 text-ink/85">{lead}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:items-center">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
        {[
          [T('বৃষ্টি', 'Rain'), `${num(rain, lang)} ${T('মিমি', 'mm')}`, `${sign(rainDiff)}% · ${word(rainDiff, 10)}`, T(`স্বাভাবিক ${num(r.normal.rain, 'bn')} মিমি`, `normal ${Math.round(r.normal.rain)} mm`)],
          [T('গড় সর্বোচ্চ তাপমাত্রা', 'Average daily high'), `${num(r.now.tmax, lang, { dp: 1 })}°`, `${sign(tDiff, 1)}° · ${word(tDiff, 0.5)}`, T(`স্বাভাবিক ${num(r.normal.tmax, 'bn', { dp: 1 })}°`, `normal ${r.normal.tmax.toFixed(1)}°`)],
          hotMatters
            ? [T('৩৫°-এর বেশি গরম দিন', 'Days above 35°'), num(r.now.hot, lang), T(`স্বাভাবিক ${num(r.normal.hot, 'bn', { dp: 1 })} দিন`, `normal ${r.normal.hot.toFixed(1)} days`), '']
            : [T('বৃষ্টির দিন (১ মিমি বা বেশি)', 'Rainy days (1 mm or more)'), num(r.now.wet, lang), `${sign(r.now.wet - r.normal.wet, 0)} ${T('দিন', 'days')} · ${word(r.now.wet - r.normal.wet, 3)}`, T(`স্বাভাবিক ${num(r.normal.wet, 'bn', { dp: 0 })} দিন`, `normal ${Math.round(r.normal.wet)} days`)],
        ].map(([label, v, note, sub]) => (
          <div key={label} className="rounded-2xl bg-white/70 p-3.5 ring-1 ring-black/[.05]">
            <div className="text-[13px] text-muted">{label}</div>
            <div className="font-display mt-0.5 text-[24px] font-bold tabular text-ink">{v}</div>
            <div className="text-[12.5px] text-ink/80">{note}</div>
            {sub && <div className="text-[12px] text-muted">{sub}</div>}
          </div>
        ))}
      </div>

      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={T('জমা বৃষ্টি: এ বছর বনাম আগের বছরগুলো', 'Rain so far: this year against past years')}>
          {ticks.map((t) => (
            <g key={t}><line x1={PL} x2={W} y1={y(t)} y2={y(t)} stroke="#e7ece4" /><text x={PL - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#566a5e">{num(t, lang)}</text></g>
          ))}
          <path d={area} fill="#c9cfc6" opacity=".45" />
          <path d={path((b) => b.mid)} fill="none" stroke="#8a9a8f" strokeWidth="1.5" strokeDasharray="4 4" />
          <path className="line-draw" d={r.now.cum.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join('')} fill="none" stroke="#237479" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pathLength="1" />
          <circle cx={x(DAYS - 1)} cy={y(rain)} r="4" fill="#237479" stroke="#fff" strokeWidth="2" />
          {dayTicks.map((k, i) => (
            <text key={k} x={x(k)} y={H - 6} textAnchor={i === 0 ? 'start' : i === dayTicks.length - 1 ? 'end' : 'middle'} fontSize="10.5" fill="#566a5e">{day(addDays(r.from, k))}</text>
          ))}
        </svg>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-[#237479]" />{T('এ বছর জমা বৃষ্টি', 'Rain so far this year')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-4 border-t-[1.5px] border-dashed border-[#8a9a8f]" />{T('আগের বছরগুলোর মাঝামাঝি', 'Middle of past years')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-4 rounded-sm bg-[#c9cfc6]/70" />{T('বেশির ভাগ বছর যে সীমায় থাকে', 'Where most years fall')}</span>
        </div>
      </div>
      </div>
      <p className="mt-3 text-[12.5px] text-muted">{T(`উৎস: নাসা পাওয়ার দৈনিক তথ্য (${num(lat, 'bn', { dp: 2 })}, ${num(lon, 'bn', { dp: 2 })}), ${fmtDate(r.end, 'bn')} পর্যন্ত; নাসা সাধারণত ২–৩ দিন পিছিয়ে তথ্য দেয়। বৃষ্টি নাসা পাওয়ারের সংশোধিত হিসাব (PRECTOTCORR)।`, `Source: NASA POWER daily data (${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}), to ${fmtDate(r.end, 'en')}; NASA usually runs 2–3 days behind. Rain is NASA POWER’s corrected estimate (PRECTOTCORR).`)}</p>
      {!st.live && <p className="mt-2 text-[12.5px] text-clay-700">{T('নাসা থেকে এখন তথ্য আনা যায়নি, তাই অ্যাপে রাখা সংরক্ষিত তথ্য দেখানো হচ্ছে।', 'NASA could not be reached just now, so the data saved in the app is shown.')}</p>}
    </div>
  );
}
