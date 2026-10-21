// Pieces shared by the neighbouring countries' farmer and officer pages.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_PREFIX } from '../../config/brand';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Flame, Satellite, Telescope, ShieldAlert, ExternalLink } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { fetchForecast, weatherOf } from '../../engine/forecast';
// Each country's data file (about 120 KB) loads only when that country is opened.
const FILES = import.meta.glob('../../data/abroad/*.json', { import: 'default' });
const loadCountry = (id) => FILES[`../../data/abroad/${id}.json`]?.() ?? Promise.reject(new Error(`no data for ${id}`));
import { climateChange } from '../../engine/soilfuture';
import { WeatherIcon } from '../../components/charts/LiveWeather';
import NdviChart from '../../components/fields/NdviChart';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
export const monthName = (m, lang) => (lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m - 1];
export const dayMonth = (iso, lang) => (lang === 'bn' ? `${bnDigits(+iso.slice(8, 10))} ${MONTHS_BN[+iso.slice(5, 7) - 1]}` : `${+iso.slice(8, 10)} ${MONTHS_EN[+iso.slice(5, 7) - 1]}`);
// The years a point's normal is taken from (2001–2025, or 2017–2025 where the record breaks), as text.
export const baseText = (pt, lang) => { const [a, b] = pt.base ?? [2001, 2025]; return lang === 'bn' ? `${bnDigits(a)}–${bnDigits(b)}` : `${a}–${b}`; };
export const baseYears = (pt) => { const [a, b] = pt.base ?? [2001, 2025]; return b - a + 1; };
export const fullDate = (iso, lang) => `${dayMonth(iso, lang)} ${lang === 'bn' ? bnDigits(iso.slice(0, 4)) : iso.slice(0, 4)}`;
const AXIS = { fontSize: 11, fill: '#566a5e' };
const RAIN = '#2f7fb8', NORMAL = '#c9d3c4', HEAT = '#c2562b', IMERG = '#6a4fb3', POWERC = '#b0892a';

// ---- data ----
export function useCountry(id) {
  const [st, setSt] = useState({ id, data: null, error: null });
  useEffect(() => {
    let live = true;
    setSt({ id, data: null, error: null });
    loadCountry(id).then((data) => live && setSt({ id, data, error: null }), (error) => live && setSt({ id, data: null, error }));
    return () => { live = false; };
  }, [id]);
  return st.id === id ? st : { id, data: null, error: null };
}

// The live forecast for a point on the country's own clock, refreshed every 10 minutes.
export function useLiveForecast(lat, lon, tz) {
  const [st, setSt] = useState({ fc: null, status: 'loading' });
  useEffect(() => {
    if (lat == null) return undefined;
    let live = true;
    const go = () => fetchForecast(lat, lon, { tz }).then((fc) => live && setSt({ fc, status: 'ok' }), () => live && setSt((p) => ({ fc: p.fc, status: p.fc ? 'ok' : 'error' })));
    go();
    const t = setInterval(go, 10 * 60 * 1000);
    return () => { live = false; clearInterval(t); };
  }, [lat, lon, tz]);
  return st;
}

// ---- the board: the farmer's requests, the officer's replies and the officer's advisories ----
// Shared through api/abroad.js (Upstash Redis when deployed, an in-memory board under npm run dev), so a request sent
// from the farmer's phone reaches the officer's. Where that store is not switched on (a static host), the board is
// kept in this browser instead and the farmer and officer views share it there.
const API = `${import.meta.env?.BASE_URL || './'}api/abroad`;
const localKey = (id, k) => `${STORAGE_PREFIX}.abroad.${k}.${id}`;
const readLocal = (id, k) => { try { return JSON.parse(localStorage.getItem(localKey(id, k)) || '[]'); } catch { return []; } };
const writeLocal = (id, k, v) => { try { localStorage.setItem(localKey(id, k), JSON.stringify(v)); } catch { /* storage blocked */ } };
const stamp = (p) => `${p}${Date.now().toString(36)}`;

export function useBoard(id) {
  const [mode, setMode] = useState('checking'); // checking | server | local
  const [board, setBoard] = useState(() => ({ requests: readLocal(id, 'req'), notices: readLocal(id, 'notice') }));
  const pull = useCallback(async () => {
    try {
      const r = await fetch(`${API}?cc=${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      setBoard({ requests: j.requests, notices: j.notices });
      setMode('server');
    } catch {
      setMode('local');
      setBoard({ requests: readLocal(id, 'req'), notices: readLocal(id, 'notice') });
    }
  }, [id]);
  useEffect(() => {
    pull();
    const t = setInterval(pull, 30_000);
    const vis = () => { if (document.visibilityState === 'visible') pull(); };
    const st = (e) => { if (e.key?.startsWith(`${STORAGE_PREFIX}.abroad.`)) pull(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('storage', st);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); window.removeEventListener('storage', st); };
  }, [pull]);
  // A write goes to the server when it is on, else to this browser; either way the board is re-read after.
  const write = useCallback(async (body, local) => {
    if (mode === 'server') {
      try {
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cc: id, ...body }) });
        if (r.ok) { await pull(); return; }
      } catch { /* fall through to the browser copy */ }
    }
    const req = local.req ? local.req(readLocal(id, 'req')) : null;
    const nt = local.notice ? local.notice(readLocal(id, 'notice')) : null;
    if (req) writeLocal(id, 'req', req);
    if (nt) writeLocal(id, 'notice', nt);
    setBoard({ requests: readLocal(id, 'req'), notices: readLocal(id, 'notice') });
  }, [id, mode, pull]);
  const now = () => new Date().toISOString();
  return {
    mode,
    req: {
      list: board.requests,
      add: (topic, text) => write({ op: 'request', topic, text }, { req: (p) => [{ id: stamp('R'), t: now(), topic, text, reply: null }, ...p] }),
      reply: (rid, text) => write({ op: 'reply', id: rid, text }, { req: (p) => p.map((r) => (r.id === rid ? { ...r, reply: { text, t: now() }, seen: false } : r)) }),
      seenAll: () => { if (board.requests.some((r) => r.reply && !r.seen)) write({ op: 'seen' }, { req: (p) => p.map((r) => (r.reply ? { ...r, seen: true } : r)) }); },
    },
    notices: {
      list: board.notices,
      send: (key, text) => write({ op: 'notice', key, text }, { notice: (p) => [{ id: stamp('N'), t: now(), key, text }, ...p].slice(0, 20) }),
    },
  };
}

export function BoardChip({ mode }) {
  const { T } = useStore();
  if (mode === 'checking') return null;
  return mode === 'server'
    ? <span className="chip bg-primary-50 text-primary-800 ring-1 ring-primary-200">{T('সার্ভারে শেয়ার — অন্য ফোনেও দেখা যায়', 'Shared on the server — seen on other phones')}</span>
    : <span className="chip bg-paddy-50 text-paddy-700 ring-1 ring-paddy-200">{T('শুধু এই ব্রাউজারে (সার্ভার চালু নেই)', 'This browser only (server not switched on)')}</span>;
}

// ---- layout bits ----
export function Section({ icon: Icon, title, sub, tag, children, className = '', id }) {
  return (
    <section id={id} className={`surface-card rounded-[22px] p-5 sm:p-6 ${className}`}>
      <header className="mb-4 flex flex-wrap items-start gap-3">
        {Icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-primary-700 ring-1 ring-border"><Icon size={19} /></span>}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[19px] font-bold leading-tight tracking-tight">{title}</h2>
          {sub && <p className="mt-1 text-[13.5px] leading-5 text-muted">{sub}</p>}
        </div>
        {tag}
      </header>
      {children}
    </section>
  );
}
export function SourceTag({ children, tone = 'sky' }) {
  const c = { sky: 'bg-sky-50 text-sky-800 ring-sky-200', violet: 'bg-violet-50 text-violet-800 ring-violet-200', amber: 'bg-amber-50 text-amber-800 ring-amber-200' }[tone];
  return <span className={`chip ring-1 ${c}`}>{children}</span>;
}
// A number that counts up from zero the first time it scrolls into view (Bangla or Latin digits, with its unit and
// sign kept as they are); anything that is not a plain number is shown as it is. Off when the reader asks for less motion.
const BN = '০১২৩৪৫৬৭৮৯';
function CountUp({ text }) {
  const ref = useRef(null);
  const m = typeof text === 'string' ? text.match(/^([−+-]?)([0-9০-৯][0-9০-৯,]*(?:\.[0-9০-৯]+)?)(.*)$/s) : null;
  const bn = m && /[০-৯]/.test(m[2]);
  const target = m ? +m[2].replace(/[০-৯]/g, (d) => BN.indexOf(d)).replace(/,/g, '') : null;
  const dp = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  const [v, setV] = useState(null);
  useEffect(() => {
    if (target == null || !ref.current || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => { const k = Math.min(1, (t - t0) / 750); setV(target * (1 - (1 - k) ** 3)); if (k < 1) raf = requestAnimationFrame(tick); else setV(null); };
      setV(0); raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target]);
  if (!m || v == null) return <span ref={ref}>{text}</span>;
  const n = v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return <span ref={ref}>{m[1]}{bn ? n.replace(/[0-9]/g, (d) => BN[d]) : n}{m[3]}</span>;
}

export function Stat({ label, value, sub, tone = 'ink' }) {
  const c = { ink: 'text-ink', wet: 'text-sky-700', dry: 'text-clay-700', hot: 'text-clay-700', ok: 'text-primary-700' }[tone] ?? 'text-ink';
  return (
    <div className="rounded-2xl bg-white/70 p-3.5 ring-1 ring-white/80">
      <div className="text-[12.5px] font-semibold text-muted">{label}</div>
      <div className={`mt-0.5 font-display text-[24px] font-bold leading-tight tabular ${c}`}><CountUp text={value} /></div>
      {sub && <div className="mt-0.5 text-[12.5px] leading-4 text-muted">{sub}</div>}
    </div>
  );
}
export function Sources({ list }) {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
      {list.map((s) => (
        <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary-700 underline-offset-2 hover:underline">{s.label}<ExternalLink size={11} /></a></li>
      ))}
    </ul>
  );
}

// ---- the next 7 days ----
export function WeekStrip({ fc, lang }) {
  if (!fc) return null;
  return (
    <div className="hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-reveal-children>
      {fc.days.slice(0, 7).map((d, i) => {
        const w = weatherOf(d.code);
        return (
          <div key={d.date} className="min-w-[88px] flex-1 rounded-2xl bg-white/75 p-2.5 text-center ring-1 ring-white/80">
            <div className="text-[12px] font-semibold text-muted">{i === 0 ? (lang === 'bn' ? 'আজ' : 'Today') : dayMonth(d.date, lang)}</div>
            <WeatherIcon kind={w.kind} size={40} className="mx-auto my-1" />
            <div className="text-[13.5px] font-bold tabular">{num(Math.round(d.max), lang)}° <span className="font-semibold text-muted">{num(Math.round(d.min), lang)}°</span></div>
            <div className={`mt-0.5 text-[12px] font-semibold tabular ${d.pop >= 60 ? 'text-sky-700' : 'text-muted'}`}>{num(d.pop, lang)}% · {num(Math.round(d.rain ?? 0), lang)} {lang === 'bn' ? 'মিমি' : 'mm'}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---- this year against normal, month by month (rain bars and temperature lines on separate charts) ----
function Tip({ active, payload, label, rows }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-[12.5px] shadow-[var(--shadow-lift)] ring-1 ring-border">
      <div className="font-semibold">{label}</div>
      {rows(payload[0].payload).map(([k, v]) => <div key={k}>{k}: <b className="tabular">{v}</b></div>)}
    </div>
  );
}
export function SeasonCharts({ point }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const rows = point.months.slice(-12).map((m) => {
    const n = point.normals[+m.ym.slice(5) - 1];
    const partial = m.days < 28;
    return { k: `${monthName(+m.ym.slice(5), lang)}${partial ? '*' : ''}`, rain: m.rain, normal: n.rain, tmax: m.tmax, tmaxN: n.tmax, partial };
  });
  const mm = T('মিমি', 'mm');
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <figure>
        <figcaption className="mb-1 text-[13px] font-semibold">{T(`মাসের বৃষ্টি: এ বছর বনাম ${baseText(point, 'bn')}-এর গড়`, `Monthly rain: this year against the ${baseText(point, 'en')} average`)}</figcaption>
        <div className="h-[210px]" role="img" aria-label={T('মাসিক বৃষ্টির রেখাচিত্র', 'Monthly rain chart')}>
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -14 }} barGap={2}>
              <CartesianGrid stroke="#e7ece4" vertical={false} />
              <XAxis dataKey="k" tick={AXIS} tickLine={false} axisLine={{ stroke: '#d5ddd1' }} interval={0} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} />
              <Tooltip cursor={{ fill: 'rgba(47,127,184,.06)' }} content={<Tip rows={(p) => [[T('এ বছর', 'This year'), `${num(p.rain, lang)} ${mm}`], [T('গড়', 'Average'), `${num(p.normal, lang)} ${mm}`]]} />} />
              <Bar dataKey="normal" fill={NORMAL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="rain" fill={RAIN} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: RAIN }} />{T('এ বছর', 'This year')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: NORMAL }} />{T(`${bnDigits(baseYears(point))} বছরের গড়`, `${baseYears(point)}-year average`)}</span>
          <span>{T('* মাস এখনো চলছে', '* month still running')}</span>
        </div>
      </figure>
      <figure>
        <figcaption className="mb-1 text-[13px] font-semibold">{T('দিনের সর্বোচ্চ তাপমাত্রা (মাসের গড়)', 'Daytime high (monthly mean)')}</figcaption>
        <div className="h-[210px]" role="img" aria-label={T('তাপমাত্রার রেখাচিত্র', 'Temperature chart')}>
          <ResponsiveContainer>
            <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="#e7ece4" vertical={false} />
              <XAxis dataKey="k" tick={AXIS} tickLine={false} axisLine={{ stroke: '#d5ddd1' }} interval={0} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => num(Math.round(v), lang)} />
              <Tooltip content={<Tip rows={(p) => [[T('এ বছর', 'This year'), `${num(p.tmax, lang, { dp: 1 })}°`], [T('গড়', 'Average'), `${num(p.tmaxN, lang, { dp: 1 })}°`]]} />} />
              <Line dataKey="tmaxN" stroke="#9aa89e" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="tmax" stroke={HEAT} strokeWidth={2.5} dot={{ r: 3.5, fill: HEAT, stroke: '#fff', strokeWidth: 1.5 }} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-5 rounded" style={{ background: HEAT }} />{T('এ বছর', 'This year')}</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-5 border-t-2 border-dashed border-[#9aa89e]" />{T(`${bnDigits(baseYears(point))} বছরের গড়`, `${baseYears(point)}-year average`)}</span>
        </div>
      </figure>
    </div>
  );
}

// ---- the record check: three ways of measuring the same rain ----
export function RecordCheck({ point }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const rows = point.years.map((y) => ({ y: String(y.y), era5: y.rain, imerg: y.rainImerg, power: y.powerRain }));
  const first = rows.filter((r) => +r.y <= 2007), last = rows.filter((r) => +r.y >= 2016);
  const avg = (xs, k) => Math.round(xs.reduce((a, r) => a + (r[k] ?? 0), 0) / Math.max(1, xs.filter((r) => r[k] != null).length));
  const series = [['era5', T('ERA5 (ECMWF পুনর্বিশ্লেষণ)', 'ERA5 (ECMWF reanalysis)'), '#2f7fb8'], ['imerg', T('নাসা/জাক্সা GPM IMERG (উপগ্রহ)', 'NASA/JAXA GPM IMERG (satellite)'), IMERG], ['power', T('নাসা POWER PRECTOTCORR (MERRA-2)', 'NASA POWER PRECTOTCORR (MERRA-2)'), POWERC]];
  return (
    <div>
      <div className="h-[220px]" role="img" aria-label={T('তিন উৎসের বার্ষিক বৃষ্টি', 'Yearly rain from three sources')}>
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="#e7ece4" vertical={false} />
            <XAxis dataKey="y" tick={AXIS} tickLine={false} axisLine={{ stroke: '#d5ddd1' }} interval={3} tickFormatter={(v) => (lang === 'bn' ? bnDigits(v) : v)} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} />
            <Tooltip content={<Tip rows={(p) => series.map(([k, l]) => [l, p[k] != null ? `${num(p[k], lang)} ${T('মিমি', 'mm')}` : '—'])} />} />
            {series.map(([k, , c]) => <Line key={k} dataKey={k} stroke={c} strokeWidth={k === 'power' ? 2 : 2.5} strokeDasharray={k === 'power' ? '4 3' : undefined} dot={false} connectNulls isAnimationActive={false} />)}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {series.map(([k, l, c]) => <span key={k} className="inline-flex items-center gap-1.5"><i className={k === 'power' ? 'w-5 border-t-2 border-dashed' : 'h-0.5 w-5 rounded'} style={k === 'power' ? { borderColor: c } : { background: c }} />{l}</span>)}
      </div>
      <p className="mt-3 text-[13.5px] leading-6 text-muted">
        {T(`বছরে গড় বৃষ্টি, ২০০১–২০০৭ বনাম ২০১৬–২০২৫: ERA5 ${num(avg(first, 'era5'), lang)} → ${num(avg(last, 'era5'), lang)} মিমি, IMERG ${num(avg(first, 'imerg'), lang)} → ${num(avg(last, 'imerg'), lang)} মিমি, POWER ${num(avg(first, 'power'), lang)} → ${num(avg(last, 'power'), lang)} মিমি। তিনটির মাত্রা আলাদা হতে পারে (পাহাড়ে ERA5 বেশি ভেজা দেখায়), কিন্তু যে উৎস বাকি দুটি স্থির থাকার সময় হঠাৎ লাফ দেয়, তার বদলটা মাপার, জলবায়ুর নয়। তাই প্রতিটি তুলনা একই উৎসের ভেতরে: “স্বাভাবিকের তুলনায়” ERA5 দিয়ে, উপগ্রহের রেকর্ড IMERG দিয়ে।`,
          `Average yearly rain, 2001–2007 against 2016–2025: ERA5 ${avg(first, 'era5')} → ${avg(last, 'era5')} mm, IMERG ${avg(first, 'imerg')} → ${avg(last, 'imerg')} mm, POWER ${avg(first, 'power')} → ${avg(last, 'power')} mm. The levels can differ (ERA5 runs wet in the mountains), but a source that jumps while the other two hold steady is changing how it measures, not the climate. So every comparison stays inside one source: “against normal” uses ERA5, the satellite record uses IMERG.`)}
      </p>
    </div>
  );
}

// ---- a past disaster, day by day: rain from the satellite and ERA5, or the daytime high against its normal ----
export function EventChart({ ev, kind = 'rain' }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const rows = ev.daily.map((d) => ({ k: dayMonth(d.d, lang), era5: d.rain, imerg: d.rainImerg, tmax: d.tmax }));
  const mm = T('মিমি', 'mm');
  return (
    <div className="h-[170px]" role="img" aria-label={kind === 'heat' ? T('দিনে দিনে তাপমাত্রা', 'Daytime high day by day') : T('দিনে দিনে বৃষ্টি', 'Rain day by day')}>
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: -16 }} barGap={1}>
          <CartesianGrid stroke="#e7ece4" vertical={false} />
          <XAxis dataKey="k" tick={AXIS} tickLine={false} axisLine={{ stroke: '#d5ddd1' }} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} domain={kind === 'heat' ? ['dataMin - 3', 'dataMax + 1'] : [0, 'auto']} />
          {/* Recharts reads its children directly, so the two variants are arrays, not fragments. */}
          {kind === 'heat' ? [
            <Tooltip key="t" cursor={{ fill: 'rgba(194,86,43,.06)' }} content={<Tip rows={(p) => [[T('সর্বোচ্চ', 'High'), `${num(p.tmax, lang, { dp: 1 })}°`]]} />} />,
            <ReferenceLine key="n" y={ev.tmaxNormal} stroke="#7d8b81" strokeDasharray="5 4" label={{ value: T('স্বাভাবিক', 'normal'), position: 'insideTopLeft', fontSize: 11, fill: '#566a5e' }} />,
            <Bar key="b" dataKey="tmax" fill={HEAT} radius={[3, 3, 0, 0]} isAnimationActive={false} />,
          ] : [
            <Tooltip key="t" cursor={{ fill: 'rgba(47,127,184,.06)' }} content={<Tip rows={(p) => [[T('উপগ্রহ (IMERG)', 'Satellite (IMERG)'), p.imerg != null ? `${num(Math.round(p.imerg), lang)} ${mm}` : '—'], ['ERA5', `${num(Math.round(p.era5), lang)} ${mm}`]]} />} />,
            <Bar key="i" dataKey="imerg" fill={IMERG} radius={[3, 3, 0, 0]} isAnimationActive={false} />,
            <Bar key="e" dataKey="era5" fill={RAIN} radius={[3, 3, 0, 0]} isAnimationActive={false} />,
          ]}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export const SERIES_COLORS = { RAIN, IMERG, HEAT };

// ---- the sample field from space ----
const PICS = import.meta.glob('../../assets/fields/*.{jpg,png}', { eager: true, query: '?url', import: 'default' });
export function FieldPanel({ field }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const [view, setView] = useState('tc');
  const tc = PICS[`../../assets/fields/${field.id}-tc.jpg`], nd = PICS[`../../assets/fields/${field.id}-ndvi.png`];
  const ser = field.series;
  const last = ser[ser.length - 1];
  const month = ser.filter((o) => o.d >= isoMinus(last?.d, 35) && o.d <= isoMinus(last?.d, 20));
  const before = month.length ? month[month.length - 1] : null;
  const change = last && before ? last.ndvi - before.ndvi : null;
  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-primary-950 ring-1 ring-black/5">
          {(view === 'tc' ? tc : nd) && <img key={view} src={view === 'tc' ? tc : nd} alt={T('জমির উপগ্রহ ছবি', 'Satellite picture of the field')} onLoad={(e) => e.currentTarget.classList.add('is-loaded')} className="fade-img h-full w-full object-cover" />}
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {(() => { const h = Math.min(40, Math.max(8, 100 * Math.sqrt(field.area_dec * 40.4686) / Math.max(480, 6 * Math.sqrt(field.area_dec * 40.4686)))) / 2; return <rect x={50 - h} y={50 - h} width={2 * h} height={2 * h} fill="none" stroke="#edc067" strokeWidth="0.9" strokeDasharray="2 1.4" />; })()}
          </svg>
          <div className="absolute inset-x-2 bottom-2 flex gap-1 rounded-full bg-black/45 p-1 backdrop-blur">
            {[['tc', T('আসল রঙ', 'True colour')], ['nd', T('সবুজের মাত্রা', 'Green cover')]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setView(k)} className={`flex-1 rounded-full px-2 py-1 text-[12px] font-semibold transition ${view === k ? 'bg-white text-ink' : 'text-white/85 hover:text-white'}`}>{l}</button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[12px] leading-4 text-muted">{T(`সেন্টিনেল-২, ${last ? fullDate(last.d, lang) : '—'}; হলুদ দাগ জমির সীমা।`, `Sentinel-2, ${last ? fullDate(last.d, 'en') : '—'}; the yellow outline is the field.`)}</p>
      </div>
      <div className="min-w-0">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat label={T('এখন সবুজ', 'Green now')} value={last ? num(Math.round(last.ndvi * 100), lang) : '—'} sub={T('NDVI × ১০০', 'NDVI × 100')} tone="ok" />
          <Stat label={T('এক মাসে বদল', 'Change in a month')} value={change == null ? '—' : `${change >= 0 ? '+' : '−'}${num(Math.abs(Math.round(change * 100)), lang)}`} sub={change != null && change < -0.12 ? T('সবুজ কমছে — ফসল পাকছে বা কাটা হচ্ছে', 'Falling — ripening or being cut') : change != null && change > 0.12 ? T('সবুজ বাড়ছে', 'Rising') : T('প্রায় একই', 'About the same')} />
          <Stat label={T('পরিষ্কার ছবি', 'Clear pictures')} value={num(ser.length, lang)} sub={T(`${num(field.passes, lang)}টি পাসের মধ্যে`, `of ${field.passes} passes`)} />
        </div>
        <NdviChart series={ser} />
      </div>
    </div>
  );
}
function isoMinus(iso, days) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// ---- fires this week ----
export function FiresPanel({ data, here }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const top = data.firesByProvince.slice(0, 8);
  const days = data.firesDays;
  return (
    <div className={here ? 'grid gap-5 lg:grid-cols-[1fr_1.2fr]' : ''}>
      {here && <div className="grid grid-cols-2 gap-2 self-start">
        <Stat label={T('১০ কিমির মধ্যে', 'Within 10 km')} value={num(here.km10, lang)} sub={T('৭ দিনে', 'in 7 days')} tone={here.km10 ? 'hot' : 'ok'} />
        <Stat label={T('৫০ কিমির মধ্যে', 'Within 50 km')} value={num(here.km50, lang)} sub={here.nearest != null ? T(`সবচেয়ে কাছে ${num(here.nearest, lang, { dp: 1 })} কিমি`, `nearest ${here.nearest} km`) : T('একটিও নেই', 'none')} tone={here.km50 >= 15 ? 'hot' : 'ink'} />
        <p className="col-span-2 text-[12.5px] leading-5 text-muted">{T(`নাসা FIRMS, তিনটি VIIRS উপগ্রহ (৩৭৫ মিটার), ${dayMonth(days[0], lang)}–${dayMonth(days[days.length - 1], lang)}। একই আগুন একাধিক উপগ্রহে ধরা পড়তে পারে, তাই এগুলো “ধরা পড়া”-র সংখ্যা, আগুনের নয়।`, `NASA FIRMS, three VIIRS satellites (375 m), ${dayMonth(days[0], 'en')}–${dayMonth(days[days.length - 1], 'en')}. One fire can be seen by more than one satellite, so these count detections, not fires.`)}</p>
      </div>}
      <figure>
        <figcaption className="mb-1 text-[13px] font-semibold">{T('দেশের কোন অঞ্চলে কত (৭ দিন)', 'Where in the country (7 days)')}</figcaption>
        <div className="h-[230px]" role="img" aria-label={T('অঞ্চলভেদে আগুন', 'Fires by region')}>
          <ResponsiveContainer>
            <BarChart data={top} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tick={{ ...AXIS, fontSize: 11.5 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(194,86,43,.06)' }} content={<Tip rows={(p) => [[T('ধরা পড়া', 'Detections'), num(p.n, lang)]]} />} />
              <Bar dataKey="n" radius={[0, 4, 4, 0]} isAnimationActive={false} label={{ position: 'right', fontSize: 11, fill: '#566a5e', formatter: (v) => num(v, lang) }}>
                {top.map((x, i) => <Cell key={x.name} fill={i === 0 ? '#c2562b' : '#e3a07c'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </figure>
    </div>
  );
}

// ---- 2041–2050 (NASA NEX-GDDP-CMIP6) ----
export function FuturePanel({ id }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const [deltas, setDeltas] = useState(null);
  useEffect(() => { import('../../data/cmip6_deltas.json').then((m) => setDeltas(m.default)); }, []);
  const cc = useMemo(() => deltas && ['ssp245', 'ssp585'].map((sc) => climateChange(deltas, `abroad_${id}`, sc)), [deltas, id]);
  if (!deltas) return <div className="h-24 animate-pulse rounded-2xl bg-white/50" />;
  if (!cc[0]) return <p className="text-[14px] leading-6 text-muted">{T('এই খামারের ২০৪১–২০৫০ সালের নাসা জলবায়ু অনুমান এখনো নামানো হচ্ছে (npm run fetch:cmip6)।', 'The NASA 2041–2050 projection for this farm is still being downloaded (npm run fetch:cmip6).')}</p>;
  const f1 = (x) => num(Math.round(x * 10) / 10, lang, { dp: 1 });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cc.map((c, i) => (
        <div key={c.scenario} className="rounded-2xl bg-white/70 p-4 ring-1 ring-white/80">
          <div className="text-[13px] font-bold">{i === 0 ? T('মাঝারি পথ (SSP2-4.5)', 'Middle road (SSP2-4.5)') : T('উচ্চ নিঃসরণ (SSP5-8.5)', 'High emissions (SSP5-8.5)')}</div>
          <div className="mt-2 flex items-end gap-5">
            <div><div className="font-display text-[28px] font-bold leading-none text-clay-700 tabular">+{f1(c.dT.med)}°</div><div className="mt-1 text-[12px] text-muted">{T('গড় তাপমাত্রা', 'Mean temperature')}</div></div>
            <div><div className={`font-display text-[28px] font-bold leading-none tabular ${c.rainPct.med >= 0 ? 'text-sky-700' : 'text-clay-700'}`}>{c.rainPct.med >= 0 ? '+' : '−'}{num(Math.abs(Math.round(c.rainPct.med)), lang)}%</div><div className="mt-1 text-[12px] text-muted">{T('বছরের বৃষ্টি', 'Yearly rain')}</div></div>
          </div>
          <div className="mt-2 text-[12px] leading-4 text-muted">{T(`${num(c.n, lang)}টি মডেলের মাঝামাঝি; পরিসর ${f1(c.dT.min)}° থেকে ${f1(c.dT.max)}°, বৃষ্টি ${num(Math.round(c.rainPct.min), lang)}% থেকে ${num(Math.round(c.rainPct.max), lang)}%`, `Median of ${c.n} models; range ${f1(c.dT.min)}° to ${f1(c.dT.max)}°, rain ${Math.round(c.rainPct.min)}% to ${Math.round(c.rainPct.max)}%`)}</div>
        </div>
      ))}
      <p className="text-[12.5px] leading-5 text-muted sm:col-span-2">{T('২০৪১–২০৫০ বনাম ২০০৫–২০১৪, নাসা NEX-GDDP-CMIP6 (০.২৫°, বায়াস-সংশোধিত)।', '2041–2050 against 2005–2014, NASA NEX-GDDP-CMIP6 (0.25°, bias-corrected).')}</p>
    </div>
  );
}

export const ICONS = { Flame, Satellite, Telescope, ShieldAlert };
