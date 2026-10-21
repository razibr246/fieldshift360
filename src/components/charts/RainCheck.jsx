// Two NASA rainfall sources side by side, season by season: NASA POWER (what every recommendation uses) and
// NASA/JAXA GPM IMERG satellite rainfall (an independent check). Drawn for the dark data section of the home page.
import { useMemo, useState } from 'react';
import { useStore, clim } from '../../store';
import { rainCrossCheck } from '../../engine/climate';
import { num } from '../../engine/dates';

// Validated as a pair against the dark panel (both inside the dark lightness band, CVD ΔE 17.8, ≥ 3:1).
const C = { power: '#c98500', imerg: '#1a9cb0' };
const H = 150, W = 600, PAD_L = 34, PAD_B = 22;

export default function RainCheck() {
  const { s, T } = useStore();
  const lang = s.lang;
  const check = useMemo(() => rainCrossCheck(clim), []);
  const [which, setWhich] = useState('rabi');
  const [hover, setHover] = useState(null);
  if (!check) return null;
  const d = check[which];
  const max = Math.max(...d.rows.flatMap((x) => [x.power, x.imerg])) * 1.08;
  const step = (W - PAD_L) / d.rows.length;
  const bw = Math.max(3, (step - 6) / 2);
  const y = (v) => (H - PAD_B) - (v / max) * (H - PAD_B - 8);
  const ticks = [0, 0.5, 1].map((f) => Math.round((max * f) / 50) * 50);
  const h = hover != null ? d.rows[hover] : null;
  const yr = (v) => (lang === 'bn' ? num(v, 'bn').replace(/,/g, '') : v);

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[.07] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-md sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-white">{T('দুই নাসা উৎসের বৃষ্টি মিলিয়ে দেখা', 'Two NASA rainfall sources, checked against each other')}</p>
          <p className="mt-0.5 text-[13px] text-white/70">
            {T(`২৫ মৌসুমে মিল r = ${num(d.r, 'bn', { dp: 2 })} · গড় ${num(d.power, 'bn')} বনাম ${num(d.imerg, 'bn')} মিমি`, `Agreement over 25 seasons r = ${d.r.toFixed(2)} · mean ${Math.round(d.power)} vs ${Math.round(d.imerg)} mm`)}
          </p>
        </div>
        <div className="inline-flex rounded-xl bg-white/10 p-0.5" role="group" aria-label={T('মৌসুম', 'Season')}>
          {[['rabi', T('রবি (নভে–এপ্রি)', 'Rabi (Nov–Apr)')], ['monsoon', T('বর্ষা (জুন–সেপ্টে)', 'Monsoon (Jun–Sep)')]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => { setWhich(k); setHover(null); }} aria-pressed={which === k}
              className={`h-8 rounded-[10px] px-3 text-[12.5px] font-semibold transition-colors duration-300 ${which === k ? 'bg-white text-primary-900' : 'text-white/90 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="relative mt-3" onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={T('মৌসুমওয়ারি বৃষ্টি: নাসা POWER আর GPM IMERG', 'Seasonal rainfall: NASA POWER and GPM IMERG')}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.12)" />
              <text x={PAD_L - 6} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="rgba(255,255,255,.6)">{num(t, lang)}</text>
            </g>
          ))}
          {d.rows.map((r, i) => {
            const x0 = PAD_L + i * step + (step - (bw * 2 + 2)) / 2;
            return (
              <g key={`${which}-${r.y}`} onMouseEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.4} style={{ transition: 'opacity .2s' }}>
                <rect x={PAD_L + i * step} y={0} width={step} height={H - PAD_B} fill="transparent" />
                <rect className="bar-rise" x={x0} y={y(r.power)} width={bw} height={(H - PAD_B) - y(r.power)} rx={2} fill={C.power} style={{ animationDelay: `${i * 18}ms` }} />
                <rect className="bar-rise" x={x0 + bw + 2} y={y(r.imerg)} width={bw} height={(H - PAD_B) - y(r.imerg)} rx={2} fill={C.imerg} style={{ animationDelay: `${i * 18 + 40}ms` }} />
                {(i % 4 === 0 || i === d.rows.length - 1) && <text x={PAD_L + i * step + step / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,.6)">{yr(r.y)}</text>}
              </g>
            );
          })}
        </svg>
        {h && (
          <div className="pointer-events-none absolute top-0 z-10 rounded-lg bg-white px-3 py-2 text-[12.5px] leading-5 text-ink shadow-lg"
            style={{ left: `${Math.min(70, ((PAD_L + hover * step) / W) * 100)}%` }}>
            <div className="font-semibold">{which === 'rabi' ? T(`রবি ${yr(h.y - 1)}–${yr(h.y)}`, `Rabi ${h.y - 1}–${h.y}`) : T(`বর্ষা ${yr(h.y)}`, `Monsoon ${h.y}`)}</div>
            <div className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: C.power }} />{T('নাসা POWER', 'NASA POWER')}: {num(h.power, lang)} {T('মিমি', 'mm')}</div>
            <div className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: C.imerg }} />GPM IMERG: {num(h.imerg, lang)} {T('মিমি', 'mm')}</div>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-white/75">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-3.5 rounded-sm" style={{ background: C.power }} />{T('নাসা POWER (হিসাবে যা ব্যবহার হয়)', 'NASA POWER (used in every answer)')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-3.5 rounded-sm" style={{ background: C.imerg }} />{T('নাসা/জাক্সা GPM IMERG উপগ্রহের বৃষ্টি (মিলিয়ে দেখার জন্য)', 'NASA/JAXA GPM IMERG satellite rain (independent check)')}</span>
      </div>
    </div>
  );
}
