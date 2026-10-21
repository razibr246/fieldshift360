// Harvest timing for a whole district, from real satellites, and what to grow after the Aman in each upazila.
// The numbers come from src/engine/outlook.js; every source and every estimate is named on screen.
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Satellite, CalendarClock, Sprout, Wheat, TrendingUp, Droplets, AlertTriangle, ExternalLink, Repeat } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Badge, Tags } from '../../components/ui';
import { AMAN, THROUGH, doyToMs } from '../../radar/aman';
import { AMAN_YIELD, BORO_BY, HARVEST_AFTER, LAND_PREP_DAYS, SOW_BY, harvestState, weeklyHarvest } from '../../engine/outlook';
import { UPAZILA_FACTS } from '../../data/upazila_facts';
import { UPAZILAS } from '../../data/upazilas';
import { fmtDate, num, todayDhaka } from '../../engine/dates';

const MINE = '#2f6e2f', REST = '#c9cfc6';
const WATER = { High: { bn: 'অনেক', en: 'High' }, Medium: { bn: 'মাঝারি', en: 'Medium' }, 'Low-Medium': { bn: 'কম-মাঝারি', en: 'Low–medium' }, Low: { bn: 'কম', en: 'Low' } };
const MONTH = { bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
// Bangla case endings for an upazila name: the hand-written forms where the app has them (ধামরাইয়ের, ধামরাইয়ে),
// otherwise by the last letter: সাভারের / সাভারে, বাঘার / বাঘায়, ধামরাইয়ের / ধামরাইয়ে.
const bnOf = (u) => UPAZILAS[u.id]?.name.bnOf ?? (/া$/.test(u.bn) ? `${u.bn}র` : /[ইিীুূেৈোৌ]$/.test(u.bn) ? `${u.bn}য়ের` : `${u.bn}ের`);
const bnIn = (u) => UPAZILAS[u.id]?.name.bnIn ?? (/া$/.test(u.bn) ? `${u.bn}য়` : /[ইিীুূেৈোৌ]$/.test(u.bn) ? `${u.bn}য়ে` : `${u.bn}ে`);

export const todayDoy = (year) => Math.floor((todayDhaka() - Date.UTC(year, 0, 1)) / 864e5) + 1;

function Src({ children, url }) {
  const { T } = useStore();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {children}
      {url && <a href={url} target="_blank" rel="noreferrer" className="-my-1.5 inline-flex min-h-8 items-center gap-0.5 px-1 font-semibold text-primary-700 hover:underline"><ExternalLink size={11} />{T('উৎস', 'Source')}</a>}
    </span>
  );
}

// ───────── the district's upazilas as a row of pills; the officer's own comes first ─────────
export function UpazilaPicker({ outlook, value, home, onPick }) {
  const { T, L } = useStore();
  const rows = [...outlook.rows].sort((a, b) => (b.id === home) - (a.id === home));
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={T(`${outlook.district.bn} জেলার উপজেলা`, `Upazilas of ${outlook.district.en} district`)}>
      <span className="text-[13px] font-semibold text-muted">{T(`${outlook.district.bn} জেলার উপজেলা:`, `${outlook.district.en} district:`)}</span>
      {rows.map((r) => (
        <button key={r.id} type="button" onClick={() => onPick(r.id)} aria-pressed={r.id === value}
          className={`h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition ${r.id === value ? 'bg-primary-700 text-white shadow-[0_4px_12px_-6px_rgba(36,90,40,.7)]' : 'border border-border bg-white text-ink/75 hover:border-primary-300 hover:text-ink'}`}>
          {L(r.u)}{r.id === home && <span className={`ml-1.5 text-[11.5px] ${r.id === value ? 'text-white/80' : 'text-paddy-700'}`}>{T('আপনার', 'yours')}</span>}
        </button>
      ))}
    </div>
  );
}

// ───────── 1. the district's Aman: when each upazila cuts it, and roughly how much ─────────
export function DistrictAman({ outlook, selected, home, onPick }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { year, rows, district } = outlook;
  const today = todayDoy(year);
  const day = (doy) => fmtDate(doyToMs(year, doy), lang);
  const yr = (y) => num(y, lang).replace(/,/g, '');
  const weeks = useMemo(() => weeklyHarvest(outlook), [outlook]);
  const data = weeks.map((w) => {
    const mine = w[selected] ?? 0, total = rows.reduce((a, r) => a + (w[r.id] ?? 0), 0);
    return { start: w.start, label: day(w.start), mine: Math.round(mine), rest: Math.round(total - mine), total: Math.round(total) };
  });
  const peak = data.reduce((a, d) => (d.total > (a?.total ?? -1) ? d : a), null);
  const states = rows.map((r) => ({ r, st: harvestState(r, today) }));
  const now = states.filter((x) => x.st.k === 'now'), soon = states.filter((x) => x.st.k === 'soon'), done = states.filter((x) => x.st.k === 'done');
  const live = rows.filter((r) => r.start !== null);
  const lo = Math.min(...live.map((r) => r.start), today) - 4, hi = Math.max(...live.map((r) => r.end), today) + 4;
  const pos = (doy) => `${((doy - lo) / (hi - lo)) * 100}%`;
  const ticks = [];
  for (let m = 0; m < 14; m++) {
    for (const dd of [1, 15]) {
      const d = Math.round((Date.UTC(year, m, dd) - Date.UTC(year, 0, 1)) / 864e5) + 1;
      if (d > lo && d < hi) ticks.push({ d, mid: dd === 15, label: `${num(dd, lang)} ${MONTH[lang][m % 12]}` });
    }
  }
  const stateText = (st) => (st.k === 'now' ? T(`কাটা চলছে · প্রায় ${num(Math.round(st.done * 100), 'bn')}%`, `Under way · about ${Math.round(st.done * 100)}%`)
    : st.k === 'soon' ? T(`${num(st.days, 'bn')} দিন পরে শুরু`, `Starts in ${st.days} days`) : st.k === 'done' ? T('শেষ', 'Over') : '—');
  const stateTone = (st) => (st.k === 'now' ? 'amber' : st.k === 'soon' ? 'blue' : st.k === 'done' ? 'slate' : 'slate');
  const tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const sel = rows.find((r) => r.id === selected);
    return (
      <div className="min-w-[200px] rounded-xl border border-border bg-white px-3 py-2.5 text-[12.5px] leading-6 shadow-lg">
        <p className="font-semibold text-ink">{T(`${d.label} থেকে সাত দিন`, `Week of ${d.label}`)}</p>
        <div className="flex justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-muted"><i className="h-2 w-2 rounded-full" style={{ background: MINE }} />{L(sel.u)}</span><b className="tabular">{num(d.mine, lang)} {T('টন', 't')}</b></div>
        <div className="flex justify-between gap-4"><span className="inline-flex items-center gap-1.5 text-muted"><i className="h-2 w-2 rounded-full" style={{ background: REST }} />{T('জেলার বাকি উপজেলা', 'Rest of the district')}</span><b className="tabular">{num(d.rest, lang)} {T('টন', 't')}</b></div>
        <p className="mt-1 border-t border-border pt-1 font-semibold">{T(`জেলায় মোট ${num(d.total, 'bn')} টন`, `District total ${d.total} t`)}</p>
      </div>
    );
  };

  return (
    <Card id="ho-district" className="p-5 sm:p-6">
      <h2 className="flex flex-wrap items-center gap-2 text-[20px] font-bold"><Satellite size={19} className="text-primary-600" />{T(`${district.bn} জেলার আমন ${yr(year)}: কোথায় কবে, কত ধান উঠবে`, `${district.en} district Aman ${year}: where, when and how much`)}<Tags list={['REAL', 'RULE']} /></h2>
      <p className="mt-1 text-[13.5px] leading-6 text-muted">{T(`সেন্টিনেল-১ রাডারে মাপা রোপণের দিন থেকে প্রতিটি উপজেলায় ধান কাটার সময় (রোপণের ${num(HARVEST_AFTER[0], 'bn')}–${num(HARVEST_AFTER[1], 'bn')} দিন পরে)। রাডারের তথ্য ${fmtDate(Date.parse(THROUGH), 'bn')} পর্যন্ত; "আজ" প্রতিদিন নিজে থেকে এগোয়।`, `Each upazila's harvest window from its transplanting day measured by Sentinel-1 radar (${HARVEST_AFTER[0]}–${HARVEST_AFTER[1]} days after). Radar to ${fmtDate(Date.parse(THROUGH), 'en')}; "today" moves on by itself.`)}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Kpi icon={Wheat} label={T('জেলায় আনুমানিক আমন', 'Expected Aman in the district')} value={outlook.bbsHa ? T(`${num(Math.round(outlook.tonnes / 100) * 100, 'bn')} টন চাল`, `${num(Math.round(outlook.tonnes / 100) * 100, 'en')} t of rice`) : '—'}
          note={T(`বিবিএস: জেলায় আমনের জমি ${num(outlook.bbsHa, 'bn')} হেক্টর (২০২২-২৩) × জাতীয় গড় ফলন ${num(AMAN_YIELD.tHa, 'bn', { dp: 2 })} টন/হেক্টর (২০২৪-২৫)`, `BBS: ${num(outlook.bbsHa, 'en')} ha of Aman in the district (2022-23) × national yield ${AMAN_YIELD.tHa} t/ha (FY2024-25)`)} />
        <Kpi icon={TrendingUp} label={T('সবচেয়ে বেশি ধান যে সপ্তাহে', 'Busiest week')} value={peak ? T(`${peak.label} থেকে`, `From ${peak.label}`) : '—'}
          note={peak ? T(`পুরো জেলায় প্রায় ${num(peak.total, 'bn')} টন; এ সপ্তাহে হাটে ধান বেশি, দাম চাপে থাকতে পারে`, `About ${num(peak.total, 'en')} t across the district; markets are fullest then`) : ''} />
        <Kpi icon={CalendarClock} label={T(`আজ, ${fmtDate(todayDhaka(), 'bn')}`, `Today, ${fmtDate(todayDhaka(), 'en')}`)}
          value={now.length ? T(`${num(now.length, 'bn')}টি উপজেলায় কাটা চলছে`, `Harvest under way in ${now.length}`) : soon.length ? T(`${num(Math.min(...soon.map((x) => x.st.days)), 'bn')} দিন পরে শুরু`, `Starts in ${Math.min(...soon.map((x) => x.st.days))} days`) : T('এ বছরের কাটা শেষ', 'This year’s harvest is over')}
          note={[now.length ? T(`চলছে: ${now.map((x) => x.r.u.bn).join(', ')}`, `Under way: ${now.map((x) => x.r.u.en).join(', ')}`) : '', soon.length ? T(`শুরু হয়নি: ${soon.map((x) => x.r.u.bn).join(', ')}`, `Not yet: ${soon.map((x) => x.r.u.en).join(', ')}`) : '', done.length ? T(`শেষ: ${done.map((x) => x.r.u.bn).join(', ')}`, `Over: ${done.map((x) => x.r.u.en).join(', ')}`) : ''].filter(Boolean).join(' · ')} />
      </div>

      {/* Harvest windows: one row per upazila, with today's line. */}
      <div className="mt-6">
        <h3 className="text-[15px] font-bold">{T('কোন উপজেলায় কবে ধান কাটা', 'Harvest window in each upazila')}</h3>
        <div className="relative mt-3">
          <div className="space-y-1.5" role="list">
          {[...rows].sort((a, b) => (a.start ?? 999) - (b.start ?? 999)).map((r) => {
            const on = r.id === selected;
            return (
              <button key={r.id} type="button" role="listitem" onClick={() => onPick(r.id)}
                className={`grid w-full grid-cols-[96px_1fr] items-center gap-3 rounded-xl px-2 py-1.5 text-left transition sm:grid-cols-[130px_1fr] ${on ? 'bg-primary-50' : 'hover:bg-black/[.03]'}`}
                aria-label={r.start === null ? L(r.u) : T(`${r.u.bn}: ${day(r.start)} থেকে ${day(r.end)}`, `${r.u.en}: ${day(r.start)} to ${day(r.end)}`)}>
                <span className={`truncate text-[13.5px] ${on ? 'font-bold text-primary-800' : 'font-semibold text-ink/80'}`}>{L(r.u)}{r.id === home && <span className="ml-1 text-[11px] text-paddy-700">{T('আপনার', 'yours')}</span>}</span>
                <span className="relative h-7">
                  <span className="absolute inset-y-[13px] left-0 right-0 rounded-full bg-black/[.05]" />
                  {r.start !== null && (
                    <span className="absolute inset-y-1 flex items-center justify-center rounded-md text-[11px] font-semibold tabular" title={`${day(r.start)} – ${day(r.end)}`}
                      style={{ left: pos(r.start), width: `calc(${pos(r.end)} - ${pos(r.start)})`, background: on ? MINE : '#a9b7a6', color: on ? '#fff' : '#13261b', opacity: r.fromRadar ? 1 : 0.7, backgroundImage: r.fromRadar ? undefined : 'repeating-linear-gradient(135deg, rgba(255,255,255,.35) 0 4px, transparent 4px 8px)' }}>
                      <span className="truncate px-1.5">{day(r.start)} – {day(r.end)}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          </div>
          {/* Today: a line down through every row, on the same scale as the bars. */}
          <div className="pointer-events-none absolute inset-y-0 left-[116px] right-2 sm:left-[150px]" aria-hidden="true">
            <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-red-700/80" style={{ left: pos(today) }} />
          </div>
        </div>
        <div className="relative ml-[116px] mr-2 mt-1 h-11 text-[11px] text-muted sm:ml-[150px]">
          {ticks.map((t) => <span key={t.d} className={`absolute top-0 -translate-x-1/2 whitespace-nowrap ${t.mid ? 'hidden sm:inline' : ''}`} style={{ left: pos(t.d) }}>{t.label}</span>)}
          <span className="absolute top-5 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-700 px-2 py-0.5 text-[11px] font-semibold text-white" style={{ left: pos(today) }}>{T(`আজ ${fmtDate(todayDhaka(), 'bn')}`, `Today ${fmtDate(todayDhaka(), 'en')}`)}</span>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-muted">{T('ডোরাকাটা দাগ: এ বছর যথেষ্ট নমুনা জমিতে রাডার রোপণ ধরতে পারেনি, তাই উপজেলার স্বাভাবিক রোপণের দিন (২০১৭–২০২৫) ধরে হিসাব। কোনো সারিতে চাপ দিলে নিচে সেই উপজেলার বিস্তারিত।', 'Hatched: too few sample fields showed transplanting this year, so the upazila’s usual day (2017–2025) is used. Tap a row to open that upazila below.')}</p>
      </div>

      {/* Tonnes per week: the selected upazila against the rest of the district. */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold">{T('প্রতি সপ্তাহে জেলায় কত টন চাল উঠবে (আনুমানিক)', 'Tonnes of rice coming in each week (estimate)')}</h3>
          <div className="flex gap-3 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: MINE }} />{L(rows.find((r) => r.id === selected).u)}</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: REST }} />{T('জেলার বাকি উপজেলা', 'Rest of the district')}</span>
          </div>
        </div>
        <div className="mt-2" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="#eef0ec" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5d6d66' }} tickLine={false} axisLine={{ stroke: '#cfd8d3' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5d6d66' }} tickLine={false} axisLine={false} tickFormatter={(v) => num(v, lang)} />
              <Tooltip content={tip} cursor={{ fill: 'rgba(19, 38, 27, .05)' }} />
              <Bar dataKey="mine" stackId="s" fill={MINE} stroke="#fff" strokeWidth={1} />
              <Bar dataKey="rest" stackId="s" fill={REST} radius={[4, 4, 0, 0]} stroke="#fff" strokeWidth={1} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Every upazila in numbers. */}
      <div className="-mx-5 mt-6 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead className="text-[12.5px] text-muted"><tr>{[T('উপজেলা', 'Upazila'), T('রোপণ (রাডার)', 'Transplanted (radar)'), T('কাটার সময়', 'Harvest'), T('আজ', 'Today'), T('আমনের জমি*', 'Aman land*'), T('চাল*', 'Rice*')].map((h) => <th key={h} className="px-5 py-2.5 font-semibold sm:px-6">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const st = harvestState(r, today);
              return (
                <tr key={r.id} className={r.id === selected ? 'bg-primary-50' : ''}>
                  <td className="px-5 py-2.5 sm:px-6"><button type="button" onClick={() => onPick(r.id)} className={`-my-2 inline-flex min-h-9 items-center font-semibold ${r.id === selected ? 'text-primary-800' : 'text-primary-700 hover:underline'}`}>{L(r.u)}</button>{r.id === home && <span className="ml-1.5 text-[11.5px] font-semibold text-paddy-700">{T('আপনার', 'yours')}</span>}</td>
                  <td className="px-5 py-2.5 tabular sm:px-6">{r.T === null ? '—' : day(r.T)}{!r.fromRadar && r.T !== null && <span className="ml-1 text-[11.5px] text-muted">{T('(স্বাভাবিক দিন)', '(usual day)')}</span>}</td>
                  <td className="px-5 py-2.5 tabular sm:px-6">{r.start === null ? '—' : `${day(r.start)} – ${day(r.end)}`}</td>
                  <td className="px-5 py-2.5 sm:px-6"><Badge tone={stateTone(st)}>{stateText(st)}</Badge></td>
                  <td className="px-5 py-2.5 tabular sm:px-6">{r.ha === null ? '—' : `${num(Math.round(r.ha / 10) * 10, lang)} ${T('হেক্টর', 'ha')}`}</td>
                  <td className="px-5 py-2.5 font-semibold tabular sm:px-6">{r.tonnes === null ? '—' : `${num(Math.round(r.tonnes / 10) * 10, lang)} ${T('টন', 't')}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-muted">
        <Src url={AMAN_YIELD.url}>{T(`* আনুমানিক। বিবিএস উপজেলাভিত্তিক আমনের জমি প্রকাশ করে না, তাই জেলার মোট জমি (${num(outlook.bbsHa, 'bn')} হেক্টর) উপজেলাগুলোতে ভাগ করা হয়েছে উপগ্রহে মাপা দুটি জিনিসের গুণফল অনুযায়ী: উপজেলার ফসলি জমি (সেন্টিনেল-২) আর রাডারের যত ভাগ নমুনা জমিতে আমন ধরা পড়ে (২০১৭ থেকে)। চাল = জমি × ${num(AMAN_YIELD.tHa, 'bn', { dp: 2 })} টন/হেক্টর।`, `* Estimate. BBS does not publish Aman area by upazila, so the district total (${num(outlook.bbsHa, 'en')} ha) is shared out by two satellite measures multiplied: each upazila's cropland (Sentinel-2) and the share of its radar sample fields that show Aman (since 2017). Rice = area × ${AMAN_YIELD.tHa} t/ha.`)}</Src>
      </p>
    </Card>
  );
}

function Kpi({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-50 text-primary-700"><Icon size={15} /></span>{label}</div>
      <div className="mt-2 text-[21px] font-bold leading-tight tabular">{value}</div>
      {note && <p className="mt-1 text-[12.5px] leading-5 text-muted">{note}</p>}
    </div>
  );
}

// ───────── 2. one upazila: what to grow after its Aman, and what it earns ─────────
export function CropSwitch({ row, plan, year }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const day = (doy) => fmtDate(doyToMs(year, doy), lang);
  // "টাকা" after the number: in Bangla type the ৳ sign is easy to misread as the digit ৬.
  const tk = (v) => (lang === 'bn' ? `${v < 0 ? '−' : ''}${num(Math.abs(v), 'bn')} টাকা` : `${v < 0 ? '−' : ''}Tk ${num(Math.abs(v), 'en')}`);
  const facts = UPAZILA_FACTS[row.id];
  if (!plan) return null;
  const { crops, relay, boro } = plan;
  const max = Math.max(...crops.map((c) => c.net));
  const fitText = (f) => (f === 'all' ? T('সব জমিতে মিলবে', 'Fits all fields') : f === 'early' ? T('শুধু আগে কাটা জমিতে', 'Only early-cut fields') : T('এ বছর দেরি হয়ে যাবে', 'Too late this year'));
  const fitTone = (f) => (f === 'all' ? 'green' : f === 'early' ? 'amber' : 'red');
  const sowBy = (c) => fmtDate(Date.UTC(c.by.y, c.by.m - 1, c.by.d), lang);
  const relayCut = relay.boroBy - relay.days; // land free by this day still fits mustard before Boro
  const mustardBy = crops.find((c) => c.id === 'mustard').deadline;
  const lastFree = Math.min(relayCut, mustardBy);
  const per100 = relay.extra * 100;
  const upHa = row.ha, upBigha = upHa ? upHa / 0.1336 : null;
  const bestOther = plan.best.find((c) => c.id !== 'tomato');

  return (
    <Card id="ho-switch" className="p-5 sm:p-6">
      <h2 className="flex flex-wrap items-center gap-2 text-[20px] font-bold"><Repeat size={19} className="text-primary-600" />{T(`${bnOf(row.u)} কৃষক আমনের পরে কী লাগালে বেশি লাভ`, `${row.u.en}: what to grow after the Aman for more money`)}<Tags list={['REAL', 'RULE']} /></h2>
      <p className="mt-1 text-[13.5px] leading-6 text-muted">{T(`${bnIn(row.u)} আমন কাটা হবে ${day(row.start)} – ${day(row.end)}; জমি তৈরিতে ${num(LAND_PREP_DAYS, 'bn')} দিন ধরে পরের ফসল বোনা যাবে ${day(plan.freeEarly)} থেকে ${day(plan.freeLate)}-এর মধ্যে। লাভের হিসাব দেশের গড় (ফলন × (কৃষকের দাম − পুরো খরচ)), তাই সব উপজেলায় একই; উপজেলাভেদে বদলায় সময়, অর্থাৎ কোন ফসল সময়মতো বোনা যাবে।`, `${row.u.en} cuts its Aman ${day(row.start)} – ${day(row.end)}; with ${LAND_PREP_DAYS} days to prepare the land, the next crop goes in between ${day(plan.freeEarly)} and ${day(plan.freeLate)}. Earnings are national averages (yield × (farm price − full cost)), so they are the same in every upazila; what differs is timing, which decides what can still be sown on time.`)}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Aman–mustard–Boro: keep Boro, add mustard. */}
        <div className={`rounded-2xl border p-4 ${relay.fit === 'late' ? 'border-border bg-white' : 'border-primary-200 bg-primary-50/70'}`}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-primary-800"><Sprout size={15} />{T('বোরো রেখেই বাড়তি আয়: আমন → সরিষা → বোরো', 'Keep Boro, earn more: Aman → mustard → Boro')}</div>
          <div className="mt-2 text-[24px] font-bold leading-tight tabular text-primary-800">{relay.fit === 'late' ? T('এ বছর সময় হবে না', 'No time this year') : T(`বিঘায় +${tk(relay.extra)}`, `+${tk(relay.extra)} a bigha`)}</div>
          <p className="mt-1 text-[13px] leading-6 text-ink/80">
            {relay.fit === 'all' ? T(`${bnOf(row.u)} সব আমন-জমিতে সময় মেলে: সরিষা (${num(relay.days, 'bn')} দিন) বুনে ${day(relay.harvestLate)}-এর মধ্যে তুলে ৩০ জানুয়ারির আগে বোরো লাগানো যায়।`, `Every Aman field in ${row.u.en} has time: mustard (${relay.days} days) comes off by ${day(relay.harvestLate)}, before Boro must go in by 30 January.`)
              : relay.fit === 'early' ? T(`যে জমি ${day(lastFree)}-এর মধ্যে খালি হয় সেখানে মিলবে: সরিষা (${num(relay.days, 'bn')} দিন) তুলে ৩০ জানুয়ারির আগে বোরো লাগানো যায়। দেরিতে কাটা জমিতে সরিষা দিলে বোরো পিছিয়ে যাবে।`, `Fits fields free by ${day(lastFree)}: mustard (${relay.days} days) comes off in time for Boro by 30 January. On fields cut later, mustard would push Boro late.`)
                : T('আমন দেরিতে কাটা হচ্ছে বলে সরিষা তুলে সময়মতো বোরো লাগানো যাবে না।', 'The Aman comes off too late for mustard to finish before Boro.')}
          </p>
          {relay.fit !== 'late' && (
            <p className="mt-2 rounded-xl bg-white/80 p-2.5 text-[13px] leading-6">
              {T(`১০০ বিঘায় প্রায় ${tk(per100)} বাড়তি।`, `About ${tk(per100)} more per 100 bigha.`)}
              {upBigha ? T(` ${bnOf(row.u)} আনুমানিক আমন-জমির (${num(Math.round(upBigha / 100) * 100, 'bn')} বিঘা) এক-দশমাংশে হলে প্রায় ${tk(Math.round((upBigha * 0.1 * relay.extra) / 1e5) * 1e5)}।`, ` On a tenth of ${row.u.en}'s estimated Aman land (${num(Math.round(upBigha / 100) * 100, 'en')} bigha), about ${tk(Math.round((upBigha * 0.1 * relay.extra) / 1e5) * 1e5)}.`) : ''}
            </p>
          )}
        </div>

        {/* Replacing Boro: the best crop that still fits, other than tomato (see its warning). */}
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-muted"><Droplets size={15} className="text-sky-700" />{T('বোরোর বদলে কম পানির ফসল', 'Instead of Boro: a crop that needs less water')}</div>
          {bestOther ? (
            <>
              <div className="mt-2 text-[24px] font-bold leading-tight tabular">{T(`${L(bestOther.crop.name)}: বিঘায় +${tk(bestOther.vsBoro)}`, `${L(bestOther.crop.name)}: +${tk(bestOther.vsBoro)} a bigha`)}</div>
              <p className="mt-1 text-[13px] leading-6 text-ink/80">{T(`বোরোর চেয়ে বিঘায় ${tk(bestOther.vsBoro)} বেশি লাভ (${tk(bestOther.net)} বনাম ${tk(boro.net)}), সেচ লাগে ${WATER[bestOther.crop.water].bn}। বুনতে হবে ${sowBy(bestOther)}-এর মধ্যে; ${fitText(bestOther.fit).toLowerCase()}।`, `${tk(bestOther.vsBoro)} more a bigha than Boro (${tk(bestOther.net)} against ${tk(boro.net)}), with ${WATER[bestOther.crop.water].en.toLowerCase()} water. Sow by ${sowBy(bestOther)}; ${fitText(bestOther.fit).toLowerCase()}.`)}</p>
            </>
          ) : <p className="mt-2 text-[14px] text-muted">{T('এ বছর সময়মতো বোনা যায় এমন অন্য ফসল নেই।', 'No other crop can be sown on time this year.')}</p>}
        </div>
      </div>

      {/* Every Rabi crop, ranked by what a bigha earns. */}
      <div className="-mx-5 mt-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[820px] text-left text-[14px]">
          <thead className="text-[12.5px] text-muted"><tr>{[T('ফসল', 'Crop'), T('বোনার শেষ দিন', 'Sow by'), T(`${bnIn(row.u)} সময়`, `Timing in ${row.u.en}`), T('ফলন/বিঘা', 'Yield/bigha'), T('লাভ/বিঘা', 'Profit/bigha'), T('বোরোর তুলনায়', 'vs Boro'), T('সেচ', 'Water')].map((h) => <th key={h} className="px-5 py-2.5 font-semibold sm:px-6">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {[...crops].sort((a, b) => b.net - a.net).map((c) => (
              <tr key={c.id} className={c.id === 'boro' ? 'bg-black/[.02]' : ''}>
                <td className="px-5 py-2.5 font-semibold sm:px-6">{L(c.crop.name)}{c.id === 'boro' && <span className="ml-1.5 text-[11.5px] font-normal text-muted">{T('এখনকার', 'current')}</span>}</td>
                <td className="px-5 py-2.5 tabular sm:px-6">{sowBy(c)}{c.by.rule && <span className="ml-1 text-[11px] text-muted">{T('(নিয়ম)', '(rule)')}</span>}</td>
                <td className="px-5 py-2.5 sm:px-6"><Badge tone={fitTone(c.fit)}>{fitText(c.fit)}</Badge></td>
                <td className="px-5 py-2.5 tabular sm:px-6">{num(c.kg, lang)} {T('কেজি', 'kg')}</td>
                <td className="px-5 py-2.5 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-right font-bold tabular">{tk(c.net)}</span>
                    <span className="h-2 w-28 rounded-full bg-black/[.05]"><span className="block h-full rounded-full bg-primary-600" style={{ width: `${Math.max(2, (c.net / max) * 100)}%` }} /></span>
                  </div>
                </td>
                <td className={`px-5 py-2.5 font-semibold tabular sm:px-6 ${c.vsBoro > 0 ? 'text-primary-700' : c.vsBoro < 0 ? 'text-clay-700' : 'text-muted'}`}>{c.id === 'boro' ? '—' : `${c.vsBoro > 0 ? '+' : ''}${tk(c.vsBoro)}`}</td>
                <td className="px-5 py-2.5 text-muted sm:px-6">{L(WATER[c.crop.water])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {crops.find((c) => c.id === 'tomato')?.dipMonths.length > 0 && (
        <p className="mt-3 flex gap-2 rounded-xl bg-paddy-50 p-3 text-[13px] leading-6 text-ink/85"><AlertTriangle size={16} className="mt-1 shrink-0 text-paddy-700" />
          {T(`টমেটোর লাভ কাগজে সবচেয়ে বেশি, কিন্তু নভেম্বরে লাগালে ফসল ওঠে ফেব্রুয়ারি–মার্চে, ঠিক যে মাসগুলোতে কৃষি বিপণন অধিদপ্তরের হিসাবে টমেটোর দাম সাধারণত ১০% বা বেশি পড়ে (${crops.find((c) => c.id === 'tomato').dipMonths.map((m) => MONTH.bn[m - 1]).join(', ')})। টমেটো পচনশীল, আর পাশের উপজেলাগুলো একসঙ্গে বেশি লাগালে দাম আরও পড়ে; অল্প জমিতে আর হিমাগার বা নিশ্চিত ক্রেতা থাকলে তবেই।`, `Tomato earns most on paper, but planted in November it comes in February–March, the months when DAM prices usually sit 10% or more below normal (${crops.find((c) => c.id === 'tomato').dipMonths.map((m) => MONTH.en[m - 1]).join(', ')}). It spoils fast, and if neighbouring upazilas all plant it the price falls further; only on a little land, with cold storage or a sure buyer.`)}
        </p>
      )}

      {facts?.changes && (
        <div className="mt-4 rounded-2xl border border-border bg-white p-4">
          <h3 className="text-[14.5px] font-bold">{T(`${bnOf(row.u)} কৃষি অফিসের হিসাব`, `${row.u.en} agriculture office figures`)}</h3>
          <ul className="mt-2 grid gap-1.5 text-[13.5px] leading-6 sm:grid-cols-2">
            {facts.changes.items.map((x) => <li key={x.en} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />{L(x)}</li>)}
          </ul>
          <p className="mt-2 text-[12px] text-muted"><Src url={facts.changes.source.url}>{L(facts.changes.source)}</Src></p>
        </div>
      )}

      <div className="mt-4 space-y-1 text-[12px] leading-5 text-muted">
        <p>{T('লাভ = ফলন (এফএও, ২০২৪) × (কৃষকের দাম − পুরো খরচ)। দাম আর খরচের উৎস ও বছর আলাদা (সরকারি সংগ্রহমূল্য, কৃষি বিপণন অধিদপ্তর, মন্ত্রণালয়, মাঠ গবেষণা); নতুন তথ্য এলে স্ক্রিপ্ট চালালে বদলাবে।', 'Profit = yield (FAO, 2024) × (farm price − full cost). Prices and costs come from different sources and years (procurement prices, DAM, ministries, field studies); re-running the data scripts updates them.')}</p>
        {['mustard', 'wheat', 'lentil'].map((k) => <p key={k}><Src url={SOW_BY[k].url}>{L(SOW_BY[k].src)}</Src></p>)}
        <p><Src url={BORO_BY.url}>{L(BORO_BY.src)}</Src></p>
      </div>
    </Card>
  );
}

export const radarYear = AMAN.years.radar[1];
