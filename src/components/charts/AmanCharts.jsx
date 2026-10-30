// Charts for the real Aman data (src/radar/aman.js): one season's radar curve with the rain under it, the radar
// time-lapse with the field points lighting up as transplanting is detected, ten seasons of transplanting dates,
// 26 years of June–July rain, and the district map. Every value drawn here comes from the data files.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceArea, CartesianGrid, Cell } from 'recharts';
import { Pause, Play, SkipBack } from 'lucide-react';
import { useStore } from '../../store';
import { fmtDate, num } from '../../engine/dates';
import { CAT, SHIFT_DAYS, RAIN_FINAL_TO, doyToMs, frameUrl } from '../../radar/aman';

const TEAL = '#2f8a8f', GOLD = '#d08f26', GREEN = '#2f6e2f', INK = '#13261b', MUTED = '#5d6a63', GRID = '#eef0ec';
const tick = { fontSize: 11, fill: MUTED };
const monthStarts = (year, from, to) => [4, 5, 6, 7, 8, 9, 10].map((m) => Math.round((Date.UTC(year, m, 1) - Date.UTC(year, 0, 1)) / 864e5) + 1).filter((d) => d >= from && d <= to);

// ───────── one season: radar VH (median and middle half of the 36 fields) over daily IMERG rain ─────────
export function SeasonChart({ detail, row, year, height = 320 }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const season = detail.seasons[year];
  const rain = detail.rain.seasons[year] ?? [];
  const from = detail.rain.from;
  const data = useMemo(() => {
    const byDoy = new Map(season.curve.map((c) => [c.doy, c]));
    return rain.map((mm, i) => {
      const doy = from + i, c = byDoy.get(doy);
      return { doy, rain: mm, med: c ? c.med : null, band: c ? [c.p25, c.p75] : null };
    });
  }, [season, rain, from]);
  const sum = row.seasons[year];
  const vh = season.curve.flatMap((c) => [c.p25, c.p75]);
  const lo = Math.floor(Math.min(...vh) - 1), hi = Math.ceil(Math.max(...vh) + 1);
  const rainMax = Math.max(40, ...rain.filter((v) => v !== null));
  const day = (d) => fmtDate(doyToMs(year, Math.round(d)), lang);
  return (
    <div style={{ height }} className="aman-fade">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={`${row.id}-${year}`} data={data} margin={{ top: 22, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          {row.transplantNormal !== null && (
            <ReferenceArea x1={row.transplantNormal - SHIFT_DAYS} x2={row.transplantNormal + SHIFT_DAYS} yAxisId="vh" fill={GREEN} fillOpacity={0.07} />
          )}
          {sum.iqr && sum.reliable && <ReferenceArea x1={sum.iqr[0]} x2={sum.iqr[1]} yAxisId="vh" fill={GOLD} fillOpacity={0.14} />}
          <XAxis dataKey="doy" type="number" domain={[from, from + rain.length - 1]} ticks={monthStarts(year, from, from + rain.length - 1)} tickFormatter={day} tick={tick} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} />
          <YAxis yAxisId="vh" domain={[lo, hi]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} width={46} />
          <YAxis yAxisId="rain" orientation="right" domain={[0, rainMax * 2.6]} hide />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={(d) => day(d)}
            formatter={(v, n) => (n === 'rain' ? [`${num(v, lang, { dp: 1 })} ${T('মিমি', 'mm')}`, T('বৃষ্টি (আইমার্জ)', 'Rain (IMERG)')]
              : n === 'band' ? [`${num(v[0], lang, { dp: 1 })} – ${num(v[1], lang, { dp: 1 })} dB`, T('মাঝের অর্ধেক জমি', 'Middle half of fields')]
                : [`${num(v, lang, { dp: 1 })} dB`, T('রাডার সংকেত (মধ্যমা)', 'Radar signal (median)')])} />
          <Bar yAxisId="rain" dataKey="rain" fill={TEAL} fillOpacity={0.45} radius={[2, 2, 0, 0]} animationDuration={900} />
          <Area yAxisId="vh" dataKey="band" stroke="none" fill={GREEN} fillOpacity={0.14} connectNulls animationDuration={1200} />
          <Line yAxisId="vh" dataKey="med" stroke={GREEN} strokeWidth={2.6} dot={{ r: 2.6, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls animationDuration={1600} />
          {row.transplantNormal !== null && <ReferenceLine yAxisId="vh" x={row.transplantNormal} stroke={MUTED} strokeDasharray="5 4" label={{ value: T('স্বাভাবিক', 'Usual'), position: 'insideTopLeft', fontSize: 11, fill: MUTED, dy: -18 }} />}
          {sum.transplantDoy !== null && sum.reliable && <ReferenceLine yAxisId="vh" x={sum.transplantDoy} stroke={GOLD} strokeWidth={2.4} label={{ value: T(`রোপণ ${day(sum.transplantDoy)}`, `Transplanting ${day(sum.transplantDoy)}`), position: 'insideTopRight', fontSize: 11.5, fontWeight: 700, fill: '#87580e', dy: -18 }} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────── radar time-lapse: the real Sentinel-1 frames of the latest season, fields lighting up when transplanted ─────────
function project(box, w, h) {
  const [x0, y0, x1, y1] = box;
  return ([lon, lat]) => [((lon - x0) / (x1 - x0)) * w, ((y1 - lat) / (y1 - y0)) * h];
}
// The season's timeline under the radar pictures: three bands on one time axis (no second y-scale) -
// the 36 fields' median radar signal (flooding makes it dip), how many fields have been transplanted so far, and daily
// IMERG rain. Tap or drag anywhere to jump to the nearest pass.
function SeasonTimeline({ detail, year, frames, i, onSeek }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const se = detail.seasons[year];
  // A narrow canvas, so the labels stay readable when the card is narrow (it is drawn at the card's width).
  const W = 560, L = 88, R = 8, bands = [{ h: 44 }, { h: 34 }, { h: 34 }], gap = 7, top = 6;
  const H = top + bands.reduce((a, b) => a + b.h + gap, 0) + 22;
  const doys = frames.map((f) => Math.round((Date.parse(f.date) - Date.UTC(year, 0, 1)) / 864e5) + 1);
  const d0 = doys[0] - 3, d1 = doys[doys.length - 1] + 3;
  const x = (d) => L + ((d - d0) / (d1 - d0)) * (W - L - R);
  const ys = [top, top + bands[0].h + gap, top + bands[0].h + bands[1].h + 2 * gap];
  const curve = (se?.curve ?? []).filter((c) => c.med != null && c.doy >= d0 && c.doy <= d1);
  const vhLo = Math.min(...curve.map((c) => c.p25 ?? c.med)), vhHi = Math.max(...curve.map((c) => c.p75 ?? c.med));
  const yVh = (v) => ys[0] + bands[0].h - ((v - vhLo) / Math.max(0.1, vhHi - vhLo)) * bands[0].h;
  const fieldsT = se?.fields ?? [];
  const total = fieldsT.length;
  const cum = (d) => fieldsT.filter((t) => t !== null && t <= d).length;
  const stepPts = []; for (let d = d0; d <= d1; d += 2) stepPts.push(`${x(d).toFixed(1)},${(ys[1] + bands[1].h - (cum(d) / Math.max(1, total)) * bands[1].h).toFixed(1)}`);
  const rainArr = detail.rain?.seasons?.[year] ?? [], rFrom = detail.rain?.from ?? 105;
  const rain = rainArr.map((mm, k) => ({ d: rFrom + k, mm })).filter((r) => r.d >= d0 && r.d <= d1 && r.mm != null);
  const rMax = Math.max(20, ...rain.map((r) => r.mm));
  const now = doys[Math.min(i, doys.length - 1)];
  const ref = useRef(null);
  const seekAt = (clientX) => {
    const box = ref.current.getBoundingClientRect();
    const d = d0 + ((clientX - box.left) / box.width * W - L) / (W - L - R) * (d1 - d0);
    let best = 0; doys.forEach((v, k) => { if (Math.abs(v - d) < Math.abs(doys[best] - d)) best = k; });
    onSeek(best);
  };
  const months = monthStarts(year, d0, d1);
  const label = (k, bn, en) => <text x={L - 7} y={ys[k] + bands[k].h / 2 + 4.5} textAnchor="end" fontSize="13" fill={MUTED}>{T(bn, en)}</text>;
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full cursor-pointer touch-none select-none" role="group" tabIndex={0}
      aria-label={T(`মৌসুমের সময়রেখা: ${num(i + 1, 'bn')}/${num(doys.length, 'bn')} · ${fmtDate(doyToMs(year, now), 'bn')}। তীরচিহ্ন দিয়ে পাস বদলান।`, `Season timeline: pass ${i + 1} of ${doys.length} · ${fmtDate(doyToMs(year, now), 'en')}. Use arrow keys to change passes.`)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onSeek(Math.min(doys.length - 1, i + 1)); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onSeek(Math.max(0, i - 1)); }
        else if (e.key === 'Home') { e.preventDefault(); onSeek(0); }
        else if (e.key === 'End') { e.preventDefault(); onSeek(doys.length - 1); }
      }}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); seekAt(e.clientX); }} onPointerMove={(e) => { if (e.buttons) seekAt(e.clientX); }}>
      {bands.map((b, k) => <rect key={k} x={L} y={ys[k]} width={W - L - R} height={b.h} rx="6" fill="#f4f6f2" />)}
      {months.map((m) => <g key={m}><line x1={x(m)} x2={x(m)} y1={top} y2={H - 16} stroke={GRID} strokeWidth="1.5" /><text x={x(m) + 3} y={H - 3} fontSize="13" fill={MUTED}>{fmtDate(doyToMs(year, m), lang).replace(/^[০-৯\d]+\s/, '')}</text></g>)}
      {label(0, 'রাডার সংকেত', 'Radar signal')}{label(1, 'রোপণ হওয়া জমি', 'Fields planted')}{label(2, 'দৈনিক বৃষ্টি', 'Daily rain')}
      {curve.length > 1 && <polyline points={curve.map((c) => `${x(c.doy).toFixed(1)},${yVh(c.med).toFixed(1)}`).join(' ')} fill="none" stroke={GREEN} strokeWidth="2.4" strokeLinejoin="round" />}
      {curve.map((c) => <circle key={c.doy} cx={x(c.doy)} cy={yVh(c.med)} r="2.6" fill={GREEN} />)}
      <polyline points={`${x(d0)},${ys[1] + bands[1].h} ${stepPts.join(' ')} ${x(d1)},${ys[1] + bands[1].h}`} fill={GOLD} fillOpacity="0.28" stroke={GOLD} strokeWidth="2" />
      {rain.map((r) => <rect key={r.d} x={x(r.d) - 1.1} y={ys[2] + bands[2].h - (r.mm / rMax) * bands[2].h} width="2.2" height={(r.mm / rMax) * bands[2].h} fill={TEAL} rx="1" />)}
      {doys.map((d, k) => <circle key={k} cx={x(d)} cy={H - 17} r={k === i ? 4 : 2.2} fill={k === i ? INK : '#b8c2bb'} />)}
      <line x1={x(now)} x2={x(now)} y1={top - 2} y2={H - 17} stroke={INK} strokeWidth="1.8" />
      <text x={x(now) > W - 90 ? x(now) - 5 : x(now) + 5} y={ys[1] + 14} fontSize="13.5" fontWeight="700" fill={INK} textAnchor={x(now) > W - 90 ? 'end' : 'start'}>{T(`${num(cum(now), 'bn')}/${num(total, 'bn')}`, `${cum(now)}/${total}`)}</text>
    </svg>
  );
}

export function RadarTimelapse({ detail, row, year }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const frames = detail.frames.list;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [sel, setSel] = useState(null); // index of a tapped sample field
  const timer = useRef(null);
  const [x0, y0, x1, y1] = detail.box;
  const W = 1000, H = Math.round((W * (y1 - y0) * 110.57) / ((x1 - x0) * 111.32 * Math.cos(((y0 + y1) / 2) * Math.PI / 180)));
  const p = project(detail.box, W, H);
  const ring = row.ring.map(p).map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const fields = detail.fields.map(p);
  const transplanted = detail.seasons[year]?.fields ?? [];
  const everSeen = transplanted.filter((t) => t !== null).length;
  useEffect(() => { frames.forEach((f) => { const im = new Image(); im.src = frameUrl(f.file); }); }, [frames]);
  useEffect(() => {
    if (!playing) return undefined;
    timer.current = setInterval(() => setI((k) => { if (k >= frames.length - 1) { setPlaying(false); return k; } return k + 1; }), 650 / speed);
    return () => clearInterval(timer.current);
  }, [playing, frames.length, speed]);
  useEffect(() => { setI(0); setPlaying(false); setSel(null); }, [row.id]);
  if (!frames.length) return null;
  const f = frames[Math.min(i, frames.length - 1)];
  const doyNow = Math.round((Date.parse(f.date) - Date.UTC(year, 0, 1)) / 864e5) + 1;
  const done = transplanted.filter((d) => d !== null && d <= doyNow).length;
  const seek = (k) => { setPlaying(false); setI(Math.max(0, Math.min(frames.length - 1, k))); };
  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); seek(i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); seek(i - 1); }
    if (e.key === ' ') { e.preventDefault(); if (i >= frames.length - 1) setI(0); setPlaying(!playing); }
  };
  const unionOf = (j) => { const u = detail.unions?.find((x) => x.en === detail.fieldUnion?.[j]); return u ? L(u) : null; };
  return (
    <div tabIndex={0} onKeyDown={onKey} className="rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-primary-100" aria-label={T('রাডার টাইম-ল্যাপস: বাঁ-ডান তীর দিয়ে পাস বদলান, স্পেস দিয়ে চালান', 'Radar time-lapse: left and right arrows change the pass, space plays')}>
      <div className="relative overflow-hidden rounded-2xl bg-primary-950" style={{ aspectRatio: `${W} / ${H}` }}>
        {/* Duotone keeps the radar honest (one band, no false colour) but in the app's greens. */}
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id="aman-duo"><feColorMatrix type="matrix" values="0.86 0 0 0 0.05  0.84 0 0 0 0.12  0.78 0 0 0 0.08  0 0 0 1 0" /></filter>
        </svg>
        {frames.map((fr, k) => (
          <img key={fr.file} src={frameUrl(fr.file)} alt={k === i ? T(`সেন্টিনেল-১ রাডার ছবি, ${fmtDate(Date.parse(fr.date), 'bn')}`, `Sentinel-1 radar image, ${fmtDate(Date.parse(fr.date), 'en')}`) : ''}
            className="absolute inset-0 h-full w-full transition-opacity duration-500" style={{ opacity: k === i ? 1 : 0, filter: 'url(#aman-duo) contrast(1.25) brightness(1.05)' }} />
        ))}
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
          <path d={`M0,0H${W}V${H}H0Z M${ring.replaceAll(' ', 'L')}Z`} fill="#0d2614" fillOpacity="0.62" fillRule="evenodd" pointerEvents="none" />
          <polygon points={ring} fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="3" strokeLinejoin="round" pointerEvents="none" />
          {fields.map(([cx, cy], k) => {
            const t = transplanted[k];
            const never = t === null || t === undefined;
            const on = !never && t <= doyNow;
            const picked = sel === k;
            return (
              <g key={k} className="aman-field cursor-pointer" onClick={() => setSel(picked ? null : k)} role="button" tabIndex={0} aria-pressed={picked}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setSel(picked ? null : k); } }}
                aria-label={T(`নমুনা জমি ${num(k + 1, 'bn')}${never ? ', এ মৌসুমে রোপণ ধরা পড়েনি' : on ? `, রোপণ ধরা পড়েছে ${fmtDate(doyToMs(year, t), 'bn')}` : ''}`, `Sample field ${k + 1}${never ? ', no transplanting seen this season' : on ? `, transplanted ${fmtDate(doyToMs(year, t), 'en')}` : ''}`)}>
                <circle cx={cx} cy={cy} r="20" fill="transparent" />
                {on && <circle cx={cx} cy={cy} r="22" fill={GOLD} fillOpacity="0.25" className="aman-ping" />}
                {picked && <circle cx={cx} cy={cy} r="15" fill="none" stroke="#fff" strokeWidth="3" />}
                <circle cx={cx} cy={cy} r={on ? 9 : 6.5} fill={on ? GOLD : 'none'} stroke="#ffffff" strokeOpacity={never ? 0.45 : on ? 1 : 0.8} strokeWidth="2.5" strokeDasharray={never ? '3 3' : undefined} style={{ transition: 'r .4s, fill .4s' }} />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-black/50 px-3 py-1.5 text-white backdrop-blur">
          <div className="text-[15px] font-bold tabular">{fmtDate(Date.parse(f.date), lang)}</div>
          <div className="text-[11.5px] text-white/80">{T(`সেন্টিনেল-${f.platform.slice(-2).toUpperCase()} · ${f.orbit === 'ascending' ? 'সন্ধ্যার পাস' : 'ভোরের পাস'} · ${num(i + 1, 'bn')}/${num(frames.length, 'bn')}`, `Sentinel-${f.platform.slice(-2).toUpperCase()} · ${f.orbit} pass · ${i + 1}/${frames.length}`)}</div>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 w-[170px] rounded-xl bg-black/50 px-3 py-2 text-white backdrop-blur">
          <div className="flex items-baseline justify-between"><span className="text-[11.5px] text-white/80">{T('রোপণ ধরা পড়েছে', 'Transplanted')}</span><b className="text-[15px] tabular">{num(done, lang)}/{num(fields.length, lang)}</b></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(done / Math.max(1, fields.length)) * 100}%`, background: GOLD }} /></div>
          <div className="mt-1 text-[10.5px] text-white/65">{T(`পুরো মৌসুমে ${num(everSeen, 'bn')}টিতে`, `${everSeen} by the season's end`)}</div>
        </div>
      </div>
      <SeasonTimeline detail={detail} year={year} frames={frames} i={i} onSeek={seek} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { if (i >= frames.length - 1) setI(0); setPlaying(!playing); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-700 text-white hover:bg-primary-800" aria-label={playing ? T('থামান', 'Pause') : T('চালান', 'Play')}>
          {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
        </button>
        <button type="button" onClick={() => seek(0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-white text-ink/70 hover:bg-primary-50" aria-label={T('শুরুতে যান', 'Back to start')}><SkipBack size={16} /></button>
        <button type="button" onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-pressed={speed === 2} className="h-10 rounded-full border border-border bg-white px-3.5 text-[13.5px] font-semibold tabular hover:bg-primary-50">{T(`${num(speed, 'bn')}× গতি`, `${speed}× speed`)}</button>
        <span className="ml-auto text-[12.5px] text-muted">{T('সময়রেখায় ছুঁয়ে বা টেনে তারিখ বদলান · জমির বিন্দু ছুঁলে সেই জমির হিসাব', 'Tap or drag the timeline to change date · tap a field dot for its own curve')}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-[#0d2614] ring-1 ring-black/10" />{T('কালো: পানি বা পানিতে ডোবা জমি', 'Dark: water or flooded fields')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-[#dfe6d6] ring-1 ring-black/10" />{T('উজ্জ্বল: বাড়ন্ত ফসল, গাছ, ঘরবাড়ি', 'Bright: growing crops, trees, houses')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border-2 border-white bg-[#d08f26]" />{T('রোপণ ধরা পড়েছে', 'Transplanting detected')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border-2 border-[#8a9a8f]" />{T('এখনো হয়নি', 'Not yet')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border-2 border-dashed border-[#8a9a8f]" />{T('পুরো মৌসুমে ধরা পড়েনি', 'Not seen all season')}</span>
      </div>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('কেন কাজ করে: রোপণের আগে জমিতে পানি দিলে মসৃণ পানির ওপর রাডারের সংকেত (VH) ফিরে আসে না, তাই সংকেত হঠাৎ কমে; চারা বড় হলে আবার বাড়ে। মেঘ রাডার আটকাতে পারে না, তাই বর্ষাতেও প্রতি পাসে দেখা যায়।', 'Why it works: flooding a field before transplanting turns it into smooth water that sends little radar (VH) back, so the signal drops; it rises again as the seedlings grow. Cloud does not block radar, so every monsoon pass counts.')}</p>
      {sel !== null && (
        <div className="mt-4 rounded-2xl border border-border bg-white p-4">
          <div className="mb-1 flex justify-end"><button type="button" onClick={() => setSel(null)} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-muted hover:bg-canvas">{T('বন্ধ করুন', 'Close')}</button></div>
          <FieldCurve detail={detail} year={year} j={sel} unionName={unionOf(sel)} />
        </div>
      )}
    </div>
  );
}

// ───────── ten seasons: radar transplanting date (median, middle half) against the upazila's own normal ─────────
export function YearsStrip({ row, year, onPick }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const years = Object.keys(row.seasons).map(Number);
  const vals = years.flatMap((y) => row.seasons[y].iqr ?? []).concat(row.transplantNormal ?? []);
  const lo = Math.min(...vals) - 10, hi = Math.max(...vals) + 10;
  const W = 640, rowH = 34, top = 26, H = top + years.length * rowH + 22, L0 = 64, R0 = 92;
  const x = (d) => L0 + ((d - lo) / (hi - lo)) * (W - L0 - R0);
  const n = row.transplantNormal;
  const ticks = monthStarts(2025, lo, hi);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role={onPick ? 'group' : 'img'} aria-label={T('প্রতি বছরের রোপণের সময়', 'Transplanting date each year')}>
      {n !== null && <rect x={x(n - SHIFT_DAYS)} y={top - 8} width={x(n + SHIFT_DAYS) - x(n - SHIFT_DAYS)} height={H - top - 12} fill={GREEN} fillOpacity="0.08" rx="6" />}
      {n !== null && <line x1={x(n)} x2={x(n)} y1={top - 8} y2={H - 20} stroke={MUTED} strokeDasharray="5 4" />}
      {n !== null && <text x={x(n)} y={14} textAnchor="middle" fontSize="12" fill={MUTED}>{T(`স্বাভাবিক ${fmtDate(doyToMs(2025, n), 'bn')}`, `Usual ${fmtDate(doyToMs(2025, n), 'en')}`)}</text>}
      {years.map((y, k) => {
        const se = row.seasons[y];
        const cy = top + k * rowH + rowH / 2;
        const cat = CAT[se.shift === null ? 'none' : se.shift < -SHIFT_DAYS ? 'early' : se.shift > SHIFT_DAYS ? 'late' : 'on track'];
        const on = y === year;
        const yearStatus = se.shift === null ? T('হিসাব নেই', 'no estimate')
          : se.shift === 0 ? T('স্বাভাবিক দিনে', 'on the usual day')
            : T(`${num(Math.abs(se.shift), 'bn')} দিন ${se.shift < 0 ? 'আগে' : 'পরে'}`, `${Math.abs(se.shift)} days ${se.shift < 0 ? 'early' : 'late'}`);
        return (
          <g key={y} onClick={() => onPick?.(y)} className="aman-year cursor-pointer" role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-pressed={onPick ? on : undefined}
            aria-label={onPick ? `${num(y, lang)}: ${yearStatus}` : undefined}
            onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(y); } } : undefined}
            style={{ animation: `aman-row .7s ${k * 60}ms both cubic-bezier(.22,1,.36,1)` }}>
            <rect x="0" y={cy - rowH / 2 + 2} width={W} height={rowH - 4} rx="10" fill={on ? '#eef5e8' : 'transparent'} className="transition-colors hover:fill-[#f3f7ef]" />
            <text x="10" y={cy + 4} fontSize="13" fontWeight={on ? 700 : 500} fill={INK}>{num(y, lang).replace(/,/g, '')}</text>
            {se.iqr && <rect x={x(se.iqr[0])} y={cy - 5} width={Math.max(4, x(se.iqr[1]) - x(se.iqr[0]))} height="10" rx="5" fill={GOLD} fillOpacity="0.3" />}
            {se.transplantDoy !== null && <circle cx={x(se.transplantDoy)} cy={cy} r={on ? 7.5 : 6} fill={se.reliable ? cat.color : '#ffffff'} stroke={se.reliable ? '#fff' : '#9aa79f'} strokeWidth="2" strokeDasharray={se.reliable ? undefined : '3 2'} />}
            {se.transplantDoy === null && <text x={x((lo + hi) / 2)} y={cy + 4} textAnchor="middle" fontSize="12" fill={MUTED}>{T('ধরা পড়েনি', 'not detected')}</text>}
            <text x={W - 8} y={cy + 4} textAnchor="end" fontSize="12" fill={MUTED}>
              {!se.reliable && se.transplantDoy !== null ? T(`মাত্র ${num(se.nDetected, 'bn')}টি জমি`, `only ${se.nDetected} fields`) : se.shift === null ? '' : se.shift === 0 ? T('স্বাভাবিক দিনে', 'on the usual day') : T(`${num(Math.abs(se.shift), 'bn')} দিন ${se.shift < 0 ? 'আগে' : 'পরে'}`, `${Math.abs(se.shift)} d ${se.shift < 0 ? 'early' : 'late'}`)}{!se.complete ? T(' *', ' *') : ''}
            </text>
          </g>
        );
      })}
      {ticks.map((d) => (
        <g key={d}>
          <line x1={x(d)} x2={x(d)} y1={H - 18} y2={H - 13} stroke="#cfd6d1" />
          <text x={x(d)} y={H - 2} textAnchor="middle" fontSize="11" fill={MUTED}>{fmtDate(doyToMs(2025, d), lang)}</text>
        </g>
      ))}
    </svg>
  );
}

// ───────── June–July rain, 2001 to now, with its Sen's-slope trend ─────────
export function RainTrend({ row, height = 230 }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const data = Object.entries(row.rainJJ).filter(([, v]) => v !== null).map(([y, v]) => ({ y: +y, v, provisional: +y > RAIN_FINAL_TO, trend: +y > RAIN_FINAL_TO ? null : Math.round(row.rainTrend.intercept + row.rainTrend.slope * +y) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={row.id} data={data} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="y" tick={tick} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} tickFormatter={(v) => num(v, lang).replace(/,/g, '')} interval="preserveStartEnd" minTickGap={18} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={(y) => num(y, lang).replace(/,/g, '')}
            formatter={(v, n, p) => [`${num(v, lang)} ${T('মিমি', 'mm')}${n !== 'trend' && p.payload.provisional ? T(' (অস্থায়ী)', ' (provisional)') : ''}`, n === 'trend' ? T('ধারা (সেনের ঢাল)', 'Trend (Sen’s slope)') : T('জুন–জুলাইয়ের বৃষ্টি', 'June–July rain')]} />
          {row.rainNormal !== null && <ReferenceLine y={row.rainNormal} stroke={MUTED} strokeDasharray="5 4" label={{ value: T('স্বাভাবিক', 'Normal'), position: 'insideTopLeft', fontSize: 11, fill: MUTED }} />}
          <Bar dataKey="v" radius={[4, 4, 0, 0]} animationDuration={1100}>
            {data.map((d) => <Cell key={d.y} fill={d.provisional ? '#b9c2bc' : d.v >= row.rainNormal ? TEAL : '#c98a4b'} fillOpacity={0.85} />)}
          </Bar>
          <Line dataKey="trend" stroke={INK} strokeWidth={2} dot={false} strokeDasharray={row.rainTrend.significant ? undefined : '6 5'} animationDuration={1400} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────── district map: every rural upazila, coloured by this season's status ─────────
export function DistrictMap({ district, year, selected, home, onPick }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const [hover, setHover] = useState(null);
  // the district's bounds, worked out once (not again for every boundary point)
  const { k, sx, H, lon0, lat1 } = useMemo(() => {
    let lon0 = Infinity, lon1 = -Infinity, lat0 = Infinity, lat1 = -Infinity;
    for (const u of district.upazilas) for (const [lon, lat] of u.ring) { if (lon < lon0) lon0 = lon; if (lon > lon1) lon1 = lon; if (lat < lat0) lat0 = lat; if (lat > lat1) lat1 = lat; }
    const k = Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180), sx = (600 - 24) / ((lon1 - lon0) * k);
    return { k, sx, H: Math.round((lat1 - lat0) * sx + 24), lon0, lat1 };
  }, [district]);
  const W = 600, pad = 12;
  const pr = ([lon, lat]) => [pad + (lon - lon0) * k * sx, pad + (lat1 - lat) * sx];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role={onPick ? 'group' : 'img'} aria-label={T(`${district.bn} জেলার মানচিত্র`, `Map of ${district.en} district`)}>
      {district.upazilas.map((u, i) => {
        const se = u.seasons[year];
        const cat = CAT[se?.shift === null || se?.shift === undefined ? 'none' : se.shift < -SHIFT_DAYS ? 'early' : se.shift > SHIFT_DAYS ? 'late' : 'on track'];
        const on = u.id === selected;
        return (
          <polygon key={u.id} points={u.ring.map(pr).map((q) => q.join(',')).join(' ')} onClick={() => onPick?.(u.id)} onMouseEnter={() => setHover(u.id)} onMouseLeave={() => setHover(null)}
            fill={cat.color} fillOpacity={on ? 0.9 : hover === u.id ? 0.72 : 0.5} stroke={on ? INK : '#ffffff'} strokeWidth={on ? 3 : 1.6} strokeLinejoin="round"
            className={onPick ? 'district-upazila cursor-pointer' : ''} role={onPick ? 'button' : undefined} tabIndex={onPick ? 0 : undefined} aria-pressed={onPick ? on : undefined}
            aria-label={onPick ? T(`${u.bn}: ${cat.bn}`, `${u.en}: ${cat.en}`) : undefined}
            onKeyDown={onPick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(u.id); } } : undefined}
            style={{ transition: 'fill .5s, fill-opacity .3s', animation: `aman-pop .6s ${i * 70}ms both cubic-bezier(.22,1,.36,1)`, transformOrigin: 'center', transformBox: 'fill-box' }} />
        );
      })}
      {district.upazilas.map((u) => {
        const [cx, cy] = pr(u.point);
        return (
          <g key={u.id} pointerEvents="none">
            <text x={cx} y={cy} textAnchor="middle" fontSize="14" fontWeight={u.id === selected ? 800 : 600} fill={INK} stroke="#fff" strokeWidth="3.5" paintOrder="stroke">{lang === 'bn' ? u.bn : u.en}</text>
            {u.id === home && <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#87580e" stroke="#fff" strokeWidth="3" paintOrder="stroke">{T('আপনার উপজেলা', 'Your upazila')}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ───────── transplanting progress: share of the 36 sample fields transplanted by each date, against past seasons ─────────
const pctl = (v, p) => { const a = v.filter((x) => x !== null).sort((x, y) => x - y); if (!a.length) return null; const h = (a.length - 1) * p, lo = Math.floor(h); return a[lo] + (h - lo) * ((a[Math.min(lo + 1, a.length - 1)]) - a[lo]); };
export function progressSeries(detail, year, normalTo) {
  const from = 152, to = 273; // 1 June – 30 September
  const share = (y, d) => { const f = detail.seasons[y]?.fields; return f ? (f.filter((t) => t !== null && t <= d).length / f.length) * 100 : null; };
  const past = Object.keys(detail.seasons).map(Number).filter((y) => y <= normalTo && y !== year);
  return Array.from({ length: to - from + 1 }, (_, i) => {
    const d = from + i, v = past.map((y) => share(y, d));
    return { d, now: share(year, d), band: [pctl(v, 0.25), pctl(v, 0.75)], mid: pctl(v, 0.5) };
  });
}
export function ProgressChart({ detail, year, normalTo, height = 250 }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const data = useMemo(() => progressSeries(detail, year, normalTo), [detail, year, normalTo]);
  const day = (d) => fmtDate(doyToMs(year, d), lang);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={year} data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="d" type="number" domain={[152, 273]} ticks={monthStarts(year, 152, 273)} tickFormatter={day} tick={tick} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} />
          <YAxis domain={[0, (max) => Math.max(40, Math.ceil(max / 10) * 10)]} tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => `${num(v, lang)}%`} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={day}
            formatter={(v, n) => (n === 'band' ? [`${num(v[0], lang, { dp: 0 })}–${num(v[1], lang, { dp: 0 })}%`, T('আগের বছরগুলোর মাঝের অর্ধেক', 'Middle half of past years')]
              : [`${num(v, lang, { dp: 0 })}%`, n === 'now' ? T(`${num(year, 'bn').replace(/,/g, '')} সাল`, String(year)) : T('আগের বছরগুলোর মধ্যমা', 'Past years’ median')])} />
          <Area dataKey="band" stroke="none" fill={GREEN} fillOpacity={0.12} animationDuration={900} />
          <Line dataKey="mid" stroke={MUTED} strokeDasharray="5 4" strokeWidth={1.6} dot={false} animationDuration={1100} />
          <Line dataKey="now" stroke={GOLD} strokeWidth={3} dot={false} type="stepAfter" animationDuration={1500} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────── rain building up from 1 June, this season against the 2001–2025 range ─────────
export function RainBuild({ detail, year, height = 250 }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const { junSep, rainFinalTo } = detail.rain;
  const data = useMemo(() => {
    const cum = (arr) => { let c = 0; return arr.map((v) => (v === null ? null : (c += v))); };
    const past = Object.entries(junSep).filter(([y]) => +y <= rainFinalTo).map(([, a]) => cum(a));
    const now = cum(junSep[year] ?? []);
    let gone = false;
    return Array.from({ length: 122 }, (_, i) => {
      const v = past.map((c) => c[i]);
      if (now[i] === null || now[i] === undefined) gone = true;
      return { i, d: 152 + i, now: gone ? null : Math.round(now[i]), band: [Math.round(pctl(v, 0.25)), Math.round(pctl(v, 0.75))], mid: Math.round(pctl(v, 0.5)) };
    });
  }, [junSep, year, rainFinalTo]);
  const provisional = year > rainFinalTo;
  const day = (d) => fmtDate(doyToMs(year, d), lang);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={year} data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="d" type="number" domain={[152, 273]} ticks={monthStarts(year, 152, 273)} tickFormatter={day} tick={tick} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} />
          <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} width={52} />
          <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={day}
            formatter={(v, n) => (n === 'band' ? [`${num(v[0], lang)}–${num(v[1], lang)} ${T('মিমি', 'mm')}`, T('২০০১–২০২৫-এর মাঝের অর্ধেক', 'Middle half, 2001–2025')]
              : [`${num(v, lang)} ${T('মিমি', 'mm')}`, n === 'now' ? T(provisional ? 'এ বছর (অস্থায়ী)' : 'এ বছর', provisional ? 'This year (provisional)' : 'This year') : T('স্বাভাবিক (মধ্যমা)', 'Normal (median)')])} />
          <Area dataKey="band" stroke="none" fill={TEAL} fillOpacity={0.13} animationDuration={900} />
          <Line dataKey="mid" stroke={MUTED} strokeDasharray="5 4" strokeWidth={1.6} dot={false} animationDuration={1100} />
          <Line dataKey="now" stroke={TEAL} strokeWidth={3} strokeDasharray={provisional ? '7 4' : undefined} dot={false} connectNulls={false} animationDuration={1500} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ───────── one sample field: its own radar series in the chosen season, and its date in every season ─────────
export function FieldCurve({ detail, year, j, unionName }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const se = detail.seasons[year];
  const data = se.passes.map((p, k) => ({ d: p.doy, vh: se.fieldVh[j][k] })).filter((x) => x.vh !== null);
  const t = se.fields[j];
  const day = (d, y = year) => fmtDate(doyToMs(y, d), lang);
  const [lon, lat] = detail.fields[j];
  const vals = data.map((x) => x.vh);
  return (
    <div className="aman-fade" key={`${j}-${year}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-[16px] font-bold">{T(`নমুনা জমি ${num(j + 1, 'bn')}`, `Sample field ${j + 1}`)}{unionName && <span className="ml-1.5 text-[13px] font-semibold text-primary-700">· {unionName}</span>}</h4>
        <span className="text-[12px] text-muted tabular">{lat.toFixed(4)}, {lon.toFixed(4)}</span>
      </div>
      <p className="mt-1 text-[14px]">{t !== null ? T(`এ মৌসুমে রোপণ ধরা পড়েছে ${day(t)} নাগাদ`, `Transplanting seen around ${day(t)}`) : T('এ মৌসুমে এই জমিতে রোপণের স্পষ্ট সংকেত নেই (আমন না-ও হতে পারে)', 'No clear transplanting signal in this field this season (it may not grow Aman)')}</p>
      <div style={{ height: 170 }} className="mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="d" type="number" domain={[105, 304]} ticks={monthStarts(year, 105, 304)} tickFormatter={(d) => day(d)} tick={tick} tickLine={false} axisLine={{ stroke: '#cfd6d1' }} />
            <YAxis domain={[Math.floor(Math.min(...vals) - 1), Math.ceil(Math.max(...vals) + 1)]} tick={tick} tickLine={false} axisLine={false} width={42} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={(d) => day(d)} formatter={(v) => [`${num(v, lang, { dp: 1 })} dB`, T('রাডার সংকেত', 'Radar signal')]} />
            {t !== null && <ReferenceLine x={t} stroke={GOLD} strokeWidth={2.2} />}
            <Line dataKey="vh" stroke={GREEN} strokeWidth={2.2} dot={{ r: 2.4, fill: GREEN, strokeWidth: 0 }} animationDuration={1000} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {Object.entries(detail.seasons).map(([y, x]) => (
          <span key={y} className={`rounded-full px-2.5 py-1 text-[12px] tabular ${+y === year ? 'bg-primary-700 text-white' : x.fields[j] === null ? 'bg-black/[.04] text-muted' : 'bg-paddy-50 text-paddy-700'}`}>
            {num(+y, lang).replace(/,/g, '')}: {x.fields[j] === null ? '—' : day(x.fields[j], +y)}
          </span>
        ))}
      </div>
    </div>
  );
}
