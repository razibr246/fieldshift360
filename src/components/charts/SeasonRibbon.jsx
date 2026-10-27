// The season on a Bangla-month calendar (Kartik → Bhadra), in Bangladesh's three cropping seasons: this Rabi crop,
// the next crop in Kharif-1, then T. Aman in Kharif-2. The six ritus (seasons) run above the months. Farmers plan by the Bangla month, so this is the main way the plan is drawn.
// Layout: a fixed label column on the left, the timeline on the right. "Today" sits in its own lane above the months
// with the current month tinted down the whole chart; key dates are spelled out as chips underneath. A bar opens a
// small card with its dates on hover, focus or tap (so it works by touch too), and the chips light up their own bar.
import { useCallback, useEffect, useState } from 'react';
import { Sprout, Wheat, ArrowRight, CloudRain } from 'lucide-react';
import { useStore } from '../../store';
import { BN_MONTHS, BN_MONTHS_EN, banglaMonthStart, banglaDate, fmtDate, fmtBangla, addDays, daysBetween, num, bnDigits } from '../../engine/dates';
import { PLAN_SEASON } from '../../engine/climate';
import TomatoHarvestScene from './TomatoHarvestScene';
import CropActivityScene from './CropActivityScene';

const Y0 = PLAN_SEASON - 1; // Bangla year that starts on 14 April 2026
const MONTHS = [
  ...[6, 7, 8, 9, 10, 11].map((m) => ({ m, start: banglaMonthStart(Y0, m) })),
  ...[0, 1, 2, 3, 4].map((m) => ({ m, start: banglaMonthStart(Y0 + 1, m) })),
];
const START = MONTHS[0].start;
const END = banglaMonthStart(Y0 + 1, 5); // through Bhadra, so a mid-August Aman (Dhamrai, by radar) still shows
// The six ritus, two Bangla months each from Boishakh: index = Math.floor(month / 2).
const RITU = [['গ্রীষ্ম', 'Summer'], ['বর্ষা', 'Monsoon'], ['শরৎ', 'Autumn'], ['হেমন্ত', 'Late autumn'], ['শীত', 'Winter'], ['বসন্ত', 'Spring']];
const RITUS = MONTHS.reduce((out, mo) => {
  const k = Math.floor(mo.m / 2);
  if (out.length && out[out.length - 1].k === k) out[out.length - 1].n += 1; else out.push({ k, n: 1 });
  return out;
}, []);
const pct = (t) => Math.max(0, Math.min(100, ((t - START) / (END - START)) * 100));

export default function SeasonRibbon({ dark = false, compact = false, showToday = true }) {
  const { s, T, L, chosen, rotation: r, today } = useStore();
  const [animatedDates, setAnimatedDates] = useState({});
  const lang = s.lang;
  const syncTomatoDate = useCallback((date) => setAnimatedDates((dates) => ({ ...dates, rabi: date })), []);
  const syncMungbeanDate = useCallback((date) => setAnimatedDates((dates) => ({ ...dates, next: date })), []);
  const syncAmanDate = useCallback((date) => setAnimatedDates((dates) => ({ ...dates, aman: date })), []);
  useEffect(() => setAnimatedDates({}), [chosen.crop.id, chosen.t0, chosen.hw.start, chosen.hw.end]);
  const day = (t) => (lang === 'bn' ? fmtBangla(t, 'bn') : fmtDate(t, 'en'));
  const nextStart = r.best ? r.sowT : null;
  const nextEnd = r.best ? addDays(r.sowT, r.best.crop.days) : null;
  const amanStart = r.amanT; // the upazila's usual transplanting day (Sentinel-1 radar), or mid-July without it
  const tomatoExpanded = !compact && chosen.crop.id === 'tomato';
  const mungbeanExpanded = !compact && r.best?.crop.id === 'mungbean';
  const amanExpanded = !compact;
  const activityExpanded = (key) => key === 'rabi' ? tomatoExpanded : key === 'next' ? mungbeanExpanded : key === 'aman' && amanExpanded;
  const activityHeight = (key) => activityExpanded(key) ? 'h-[380px]' : 'h-10';
  const rows = [
    { key: 'rabi', label: T('রবি', 'Rabi'), sub: T(`এবার · ${num(daysBetween(chosen.t0, chosen.hw.end), 'bn')} দিন`, `this crop · ${daysBetween(chosen.t0, chosen.hw.end)} days`),
      name: L(chosen.crop.name), from: chosen.t0, to: chosen.hw.end, harvestFrom: chosen.hw.start, icon: Sprout, dot: '#3f7f39',
      note: T(`ফসল তোলা ${fmtBangla(chosen.hw.start, 'bn')} থেকে`, `Harvest from ${fmtDate(chosen.hw.start, 'en')}`),
      cls: dark ? 'bg-primary-300 text-primary-950' : 'bg-gradient-to-b from-primary-500 to-primary-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_6px_14px_-8px_rgba(36,90,40,.7)]' },
    r.best && { key: 'next', label: T('খরিফ-১', 'Kharif-1'), sub: T(`পরের ফসল · ${num(r.best.crop.days, 'bn')} দিন`, `next crop · ${r.best.crop.days} days`),
      name: L(r.best.crop.name), from: nextStart, to: nextEnd, gapFrom: chosen.hw.end, icon: ArrowRight, dot: '#3d7f8a',
      note: T(`রবি তোলার পর ${num(daysBetween(chosen.hw.end, nextStart), 'bn')} দিন জমি তৈরি`, `${daysBetween(chosen.hw.end, nextStart)} days to ready the land after the Rabi harvest`),
      cls: dark ? 'bg-sky-200 text-sky-900' : 'bg-gradient-to-b from-[#4a8a96] to-[#33707b] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_6px_14px_-8px_rgba(40,90,100,.7)]' },
    { key: 'aman', label: T('খরিফ-২', 'Kharif-2'), sub: T('বর্ষা · প্রচলিত', 'monsoon · as usual'), name: T('রোপা আমন', 'T. Aman rice'), from: amanStart, to: END, open: true, icon: CloudRain, dot: '#8dbe78',
      note: T('উপজেলায় সাধারণত এই সময়ে রোপণ শুরু (সেন্টিনেল-১ রাডার)', 'When transplanting usually starts in the upazila (Sentinel-1 radar)'),
      cls: dark ? 'bg-gradient-to-r from-white/30 to-white/0 text-white' : 'bg-gradient-to-r from-primary-200 to-primary-100/0 text-primary-900' },
  ].filter(Boolean);
  const ink = dark ? 'text-white' : 'text-ink';
  const quiet = dark ? 'text-white/70' : 'text-muted';
  const grid = dark ? 'border-white/15' : 'border-black/[.07]';
  const inRange = showToday && today >= START && today <= END;
  const cur = MONTHS.findIndex((mo, i) => today >= mo.start && today < (MONTHS[i + 1]?.start ?? END));
  const tp = pct(today);
  const head = compact ? 'h-7' : 'h-[46px]';
  const [hover, setHover] = useState(null); // the bar whose card is open (hover, focus, tap or its chip)
  const toggle = (k) => setHover((h) => (h === k ? null : k));
  const gutter = compact ? 'w-[64px]' : 'w-[104px]';
  const ritu = !compact; // the ritu band only on the full ribbon

  return (
    <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 pt-1" role="group" aria-label={T(`মৌসুমের পরিকল্পনা: ${chosen.crop.name.bn} ${fmtBangla(chosen.t0, 'bn')} থেকে ${fmtBangla(chosen.hw.end, 'bn')}`, `Season plan: ${chosen.crop.name.en} from ${fmtDate(chosen.t0, 'en')} to ${fmtDate(chosen.hw.end, 'en')}`)}>
      {!compact && <p className={`sticky left-0 mb-1 text-[11.5px] sm:hidden ${quiet}`}>{T('ডানে-বাঁয়ে সরিয়ে পুরো বছর দেখুন →', 'Swipe sideways for the whole year →')}</p>}
      <div className={`flex gap-3 ${compact ? 'min-w-[560px]' : 'min-w-[860px]'}`}>
        {/* Label column, row heights matched to the timeline */}
        <div className={`${gutter} shrink-0`}>
          {inRange && <div className="h-6" />}
          {ritu && <div className="h-6" />}
          <div className={`${head} border-b ${grid}`} />
          <div className="space-y-2.5 pt-3">
            {rows.map((row) => (
              <div key={row.key} className={`flex ${activityExpanded(row.key) ? 'h-[380px] items-start pt-2' : 'h-10 flex-col justify-center'} leading-tight`}>
                <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${ink}`}><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.dot }} />{row.label}</span>
                {!compact && <span className={`text-[11.5px] ${quiet}`}>{row.sub}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="relative min-w-0 flex-1">
          {cur >= 0 && inRange && (
            <div className={`pointer-events-none absolute bottom-0 rounded-lg ${dark ? 'bg-white/[.06]' : 'bg-paddy-300/[.14]'}`}
              style={{ top: ritu ? 48 : 24, left: `${pct(MONTHS[cur].start)}%`, width: `${pct(MONTHS[cur + 1]?.start ?? END) - pct(MONTHS[cur].start)}%` }} />
          )}
          {inRange && (
            <div className="relative h-6">
              <span className={`absolute top-0 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm ${tp < 5 ? '-translate-x-[3px]' : tp > 95 ? '-translate-x-full' : '-translate-x-1/2'} ${dark ? 'bg-paddy-300 text-primary-950' : 'bg-paddy-700 text-white'}`} style={{ left: `${tp}%` }}>
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" /></span>
                {T(`আজ · ${fmtBangla(today, 'bn')} ${bnDigits(banglaDate(today).year)}`, `Today · ${fmtDate(today, 'en')} (${fmtBangla(today, 'en')})`)}
              </span>
            </div>
          )}
          {/* Every other month faintly shaded down the chart, so a bar's months can be followed up to their names. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex" style={{ top: (inRange ? 24 : 0) + (ritu ? 24 : 0) }} aria-hidden="true">
            {MONTHS.map((mo, i) => <div key={mo.m} className={`h-full flex-1 ${i % 2 ? (dark ? 'bg-white/[.025]' : 'bg-black/[.018]') : ''}`} />)}
          </div>
          {ritu && (
            <div className="relative flex h-6 gap-1 pb-1" aria-label={T('ঋতু', 'Seasons')}>
              {RITUS.map(({ k, n }) => (
                <div key={k} style={{ flexGrow: n, flexBasis: 0 }} className={`flex items-center justify-center rounded-md text-[11.5px] font-semibold ${dark ? 'bg-white/10 text-white/80' : 'bg-primary-50 text-primary-800'}`}>{T(RITU[k][0], RITU[k][1])}</div>
              ))}
            </div>
          )}
          <div className={`relative flex ${head} border-b ${grid}`}>
            {MONTHS.map((mo, i) => (
              <div key={mo.m} className={`flex-1 border-l ${grid} ${i === 0 ? 'border-l-0' : ''} pl-1.5 pt-0.5`}>
                <div className={`font-display text-[13px] font-semibold ${i === cur && inRange ? (dark ? 'text-paddy-300' : 'text-paddy-700') : ink}`}>{lang === 'bn' ? BN_MONTHS[mo.m] : BN_MONTHS_EN[mo.m]}{mo.m === 0 && !compact && <span className={`ml-1 text-[10.5px] font-medium ${quiet}`}>{T(bnDigits(banglaDate(mo.start).year), banglaDate(mo.start).year)}</span>}</div>
                {!compact && <div className={`text-[11px] ${quiet}`}>{fmtDate(mo.start, lang)}</div>}
              </div>
            ))}
          </div>
          <div className="relative space-y-2.5 pt-3">
            {rows.map((row, ri) => {
              const left = pct(row.from), width = Math.max(2, pct(row.to) - left);
              const dates = `${day(row.from)} – ${row.open ? T('চলবে', 'onward') : day(row.to)}`;
              const roomy = width >= (compact ? 30 : 24);
              const hw = row.harvestFrom ? ((row.to - row.harvestFrom) / (row.to - row.from)) * 100 : 0;
              return (
                <div key={row.key} className={`relative ${activityHeight(row.key)}`}>
                  {row.gapFrom && (
                    <span className={`absolute top-1/2 h-0 border-t-2 border-dotted ${dark ? 'border-white/40' : 'border-black/25'}`} style={{ left: `${pct(row.gapFrom)}%`, width: `${Math.max(0, left - pct(row.gapFrom))}%` }}
                      title={T(`ফসল তোলার পর ${num(daysBetween(row.gapFrom, row.from), 'bn')} দিন জমি তৈরি`, `${daysBetween(row.gapFrom, row.from)} days to prepare the land after harvest`)} />
                  )}
                  <div role="button" tabIndex={0} aria-expanded={hover === row.key} aria-label={`${row.name}: ${dates}`}
                    onMouseEnter={() => setHover(row.key)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(row.key)} onBlur={() => setHover(null)}
                    onClick={() => toggle(row.key)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row.key); } if (e.key === 'Escape') setHover(null); }}
                    className={`bar-grow absolute top-0 flex h-10 cursor-pointer touch-manipulation items-center gap-2 overflow-hidden rounded-xl px-3 text-[13px] font-semibold outline-none transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(.34,1.3,.64,1)] focus-visible:ring-2 focus-visible:ring-paddy-500 ${row.cls} ${row.open ? 'rounded-r-none' : ''} ${hover === row.key ? '-translate-y-0.5 brightness-[1.06]' : hover ? 'opacity-80' : ''}`}
                    style={{ left: `${left}%`, width: `${width}%`, animationDelay: `${150 + ri * 110}ms` }}>
                    {!row.open && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/20 to-transparent" />}
                    {/* How much of this crop's season has already gone by. */}
                    {!row.open && today > row.from && today < row.to && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 bg-white/15" style={{ width: `${((today - row.from) / (row.to - row.from)) * 100}%` }} />}
                    <row.icon size={14} className="relative z-[1] shrink-0 opacity-90" aria-hidden="true" />
                    <span className="relative z-[1] truncate">{row.name}</span>
                    {roomy && !compact && <span className={`relative z-[1] truncate text-[11.5px] font-normal ${row.open ? 'text-primary-800/80' : 'opacity-85'}`}>{dates}</span>}
                    {hw > 0 && (
                      <span className="absolute inset-y-1 right-1 flex items-center justify-center rounded-lg bg-paddy-300 text-[11px] font-semibold text-primary-950 shadow-[inset_0_1px_0_rgba(255,255,255,.5)]" style={{ width: `${hw}%` }} aria-hidden="true">
                        {hw > 14 && !compact && T('তোলা', 'harvest')}
                      </span>
                    )}
                  </div>
                  {activityExpanded(row.key) && (
                    <div className="absolute top-[48px] z-[2]" style={{ left: `${Math.min(left, 44)}%`, width: 'clamp(300px, 38vw, 400px)' }}>
                      {row.key === 'rabi' && <TomatoHarvestScene from={chosen.hw.start} to={chosen.hw.end} lang={lang} T={T} onDateChange={syncTomatoDate} />}
                      {row.key === 'next' && nextStart != null && (
                        <CropActivityScene kind="mungbean" from={nextStart} to={nextStart} lang={lang} T={T} onDateChange={syncMungbeanDate} />
                      )}
                      {row.key === 'aman' && <CropActivityScene kind="aman" from={amanStart} to={amanStart} lang={lang} T={T} onDateChange={syncAmanDate} />}
                    </div>
                  )}
                  {hover === row.key && (
                    <div role="tooltip" className={`glass swap-in pointer-events-none absolute z-20 w-max max-w-[260px] rounded-2xl px-3.5 py-2.5 text-left ${ri === 0 ? 'top-full mt-2' : 'bottom-full mb-2'}`}
                      style={{ left: `${Math.min(78, Math.max(0, left + width / 2 - 10))}%` }}>
                      <div className={`flex items-center gap-1.5 text-[13.5px] font-bold ${dark ? 'text-ink' : 'text-ink'}`}><i className="h-2 w-2 rounded-full" style={{ background: row.dot }} />{row.name}</div>
                      <div className="mt-0.5 text-[12.5px] font-semibold text-ink/80">{dates}</div>
                      {/* The other calendar: Gregorian under Bangla months, Bangla months under Gregorian. */}
                      <div className="text-[12px] text-muted">{(() => { const o = (t) => (lang === 'bn' ? fmtDate(t, 'bn') : fmtBangla(t, 'en')); return row.open ? o(row.from) : `${o(row.from)} – ${o(row.to)} · ${num(daysBetween(row.from, row.to), lang)} ${T('দিন', 'days')}`; })()}</div>
                      {row.note && <div className="mt-1 text-[12px] leading-4 text-muted">{row.note}</div>}
                    </div>
                  )}
                  {!roomy && !compact && (
                    <span className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[11.5px] ${quiet}`} style={left + width > 72 ? { right: `${100 - left + 1}%` } : { left: `${left + width + 1}%` }}>{dates}</span>
                  )}
                  {activityExpanded(row.key) && animatedDates[row.key] != null && animatedDates[row.key] >= row.from && animatedDates[row.key] <= row.to && (
                    <>
                      <span aria-hidden="true" className="pointer-events-none absolute top-0 z-[4] h-10 border-l-2 border-sky-700" style={{ left: `${pct(animatedDates[row.key])}%` }} />
                      <span aria-hidden="true" className="pointer-events-none absolute top-[153px] z-[4] border-l-2 border-sky-700" style={{ left: `${pct(animatedDates[row.key])}%`, height: 'clamp(89px, 11.3vw, 123px)' }} />
                    </>
                  )}
                </div>
              );
            })}
            {/* Today's line runs through the crops only, so the month names above stay clear. */}
            {inRange && tomatoExpanded ? (
              <>
                <div className={`pointer-events-none absolute top-3 z-[1] h-10 border-l-2 border-dashed ${dark ? 'border-paddy-300' : 'border-paddy-500'}`} style={{ left: `${tp}%` }} />
                <div className={`pointer-events-none absolute bottom-0 z-[1] h-[100px] border-l-2 border-dashed ${dark ? 'border-paddy-300' : 'border-paddy-500'}`} style={{ left: `${tp}%` }} />
              </>
            ) : inRange && <div className={`pointer-events-none absolute top-0 bottom-0 z-[1] border-l-2 border-dashed ${dark ? 'border-paddy-300' : 'border-paddy-500'}`} style={{ left: `${tp}%` }} />}
          </div>
        </div>
      </div>

      {!compact && (
        <div className={`mt-4 flex flex-wrap gap-2 text-[12.5px] ${dark ? 'text-white/85' : 'text-ink/80'}`}>
          <button type="button" onMouseEnter={() => setHover('rabi')} onMouseLeave={() => setHover(null)} onClick={() => toggle('rabi')} className={`inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 transition ${hover === 'rabi' ? (dark ? 'bg-white/20' : 'bg-primary-100') : dark ? 'bg-white/10' : 'bg-black/[.04]'}`}><Sprout size={14} className={dark ? 'text-primary-300' : 'text-primary-600'} />{T(`লাগানো ${fmtBangla(chosen.t0, 'bn')} (${fmtDate(chosen.t0, 'bn')})`, `Plant ${fmtDate(chosen.t0, 'en')} (${fmtBangla(chosen.t0, 'en')})`)}</button>
          <button type="button" onMouseEnter={() => setHover('rabi')} onMouseLeave={() => setHover(null)} onClick={() => toggle('rabi')} className={`inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 transition ${dark ? 'bg-white/10' : 'bg-black/[.04]'}`}><Wheat size={14} className="text-paddy-700" />{T(`ফসল তোলা ${fmtBangla(chosen.hw.start, 'bn')} – ${fmtBangla(chosen.hw.end, 'bn')}`, `Harvest ${fmtDate(chosen.hw.start, 'en')} – ${fmtDate(chosen.hw.end, 'en')}`)}</button>
          {r.best && <button type="button" onMouseEnter={() => setHover('next')} onMouseLeave={() => setHover(null)} onClick={() => toggle('next')} className={`inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 transition ${hover === 'next' ? (dark ? 'bg-white/20' : 'bg-sky-100') : dark ? 'bg-white/10' : 'bg-black/[.04]'}`}><ArrowRight size={14} className="text-[#33707b]" />{T(`তারপর ${L(r.best.crop.name)}, ${fmtBangla(nextStart, 'bn')}`, `Then ${L(r.best.crop.name)}, ${fmtDate(nextStart, 'en')}`)}</button>}
        </div>
      )}
    </div>
  );
}
