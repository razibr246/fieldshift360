// Area alerts for the officer's selected union, most urgent first: live weather and disease-weather warnings from the
// 8-day forecast (published BMD thresholds, the Hutton late-blight criteria), registered fields that look wrong from
// Sentinel-2, clusters of the same problem reported nearby (AI), badly dry fields, and price-drop risk.
// Nothing reaches farmers until the officer reads, edits and sends it.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, TrendingDown, Droplets, ChevronRight, CloudRain, ThermometerSun, Snowflake, Bug, Satellite, Send, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, Tags, EmptyState, Note, RISK_STYLE, SmsMeter } from '../../components/ui';
import { RABI_CROPS, cropName } from '../../engine/crops';
import { num, fmtDate, parseISO, todayDhaka, bnDigits, monthOf } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { fetchForecast, clockText } from '../../engine/forecast';
import { weatherWarnings } from '../../engine/weatherRisk';
import { seriesNow } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { weekStart } from '../../engine/glut';
import { useOfficerUnion, ClusterCard, unionGlut } from './shared';

const KIND = {
  rain: { icon: CloudRain, tone: 'sky', bar: '!border-l-sky-600', chip: 'bg-sky-50 text-sky-700' },
  heat: { icon: ThermometerSun, tone: 'red', bar: '!border-l-red-500', chip: 'bg-red-50 text-red-700' },
  cold: { icon: Snowflake, tone: 'sky', bar: '!border-l-sky-500', chip: 'bg-sky-50 text-sky-700' },
  disease: { icon: Bug, tone: 'violet', bar: '!border-l-violet-500', chip: 'bg-violet-50 text-violet-700' },
};
const LEVEL = { high: { bn: 'জরুরি', en: 'Urgent', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' }, medium: { bn: 'সাবধান', en: 'Watch', cls: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' } };

// Days before transplanting that a crop already sits in a seedbed and can be hit (tomato nursery ~30 d, Boro ~45 d).
const NURSERY = { tomato: 30, boro: 45 };
// Who a warning is for: for a crop warning, only the plots whose crop is in the seedbed or the field on a warning day;
// for general weather, every plot with a plan in the union.
export function exposedPlots(w, plans) {
  if (!w.crop) return [...new Set(plans.map((p) => p.plot_id))];
  const days = w.dates.map(parseISO);
  return [...new Set(plans.filter((p) => p.crop === w.crop && days.some((d) => d >= p.date - (NURSERY[p.crop] ?? 0) * 864e5 && d <= (p._hw?.end ?? p.date + 120 * 864e5))).map((p) => p.plot_id))];
}

// One live weather warning: what, when, the rule behind it, who grows the crop at risk, and an advice draft to send.
function WeatherCard({ w, union, sign }) {
  const { s, dispatch, T, L, toast } = useStore();
  const lang = s.lang;
  const k = KIND[w.kind];
  const to = exposedPlots(w, union.plans);
  const [open, setOpen] = useState(w.level === 'high');
  const [text, setText] = useState(null);
  const draft = text ?? `${L(w.advice)}\n— ${sign}`;
  const advId = `WX-${union.id}-${w.id}-${w.dates[0]}`;
  const sent = s.advisories.some((a) => a.id === advId);
  const when = w.dates.length > 1 ? `${fmtDate(parseISO(w.dates[0]), lang)} – ${fmtDate(parseISO(w.dates[w.dates.length - 1]), lang)}` : fmtDate(parseISO(w.dates[0]), lang);
  const ahead = Math.round((parseISO(w.dates[0]) - todayDhaka()) / 864e5);
  const value = w.kind === 'rain' ? T(`সর্বোচ্চ ${num(w.value, 'bn')} মিমি এক দিনে`, `up to ${num(w.value, 'en')} mm in a day`) : w.kind === 'heat' ? T(`সর্বোচ্চ ${num(w.value, 'bn', { dp: 1 })}°`, `highs to ${num(w.value, 'en', { dp: 1 })} °C`) : w.kind === 'cold' ? T(`সর্বনিম্ন ${num(w.value, 'bn', { dp: 1 })}°`, `lows to ${num(w.value, 'en', { dp: 1 })} °C`) : w.id === 'late_blight' ? T(`দিনে ${bnDigits(w.value)} ঘণ্টা আর্দ্রতা ৯০%+`, `${w.value} hours a day at 90%+ humidity`) : T(`${bnDigits(w.value)} দিন ঝুঁকির`, `${w.value} risky days`);
  const send = () => {
    dispatch({ type: 'addAdvisory', adv: { id: advId, text: draft, to, at: todayDhaka(), weather: w.id } });
    toast(`${num(to.length, 'bn')} জন কৃষকের কাছে সতর্কবার্তা গেছে`, `Warning sent to ${to.length} farmers`);
  };
  return (
    <Card className={`border-l-4 ${k.bar} p-5`}>
      <div className="flex flex-wrap items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.chip}`}><k.icon size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-[17px] font-bold">{L(w.title)}</h2><span className={`chip ${LEVEL[w.level].cls}`}>{L(LEVEL[w.level])}</span><Tags list={['REAL', 'RULE']} /></div>
          <p className="mt-0.5 text-[14px]">{when}{ahead > 0 ? T(` (আর ${bnDigits(ahead)} দিন পর)`, ` (in ${ahead} days)`) : T(' (আজ থেকে)', ' (from today)')} · {value}{w.crop ? ` · ${cropName(w.crop, lang)}` : ''}</p>
          <p className="mt-0.5 text-[12.5px] text-muted">{T('নিয়ম: ', 'Rule: ')}{L(w.rule)} · {T('পূর্বাভাস: Open-Meteo, ইউনিয়নের মাঝখানে', 'Forecast: Open-Meteo at the union centre')}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1.5 text-[13px] font-semibold"><Users size={14} />{T(`${num(to.length, 'bn')} জন কৃষক`, `${to.length} farmers`)}</span>
      </div>
      {!open && !sent && <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex min-h-9 items-center gap-1 text-[14px] font-semibold text-primary-700 hover:underline">{T('কৃষকদের সতর্কবার্তা পাঠান', 'Warn the farmers')}<ChevronRight size={16} /></button>}
      {(open || sent) && (
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="block" htmlFor={advId}>
            <span className="mb-1 block text-[13.5px] font-semibold text-muted">{T('সতর্কবার্তার খসড়া — দরকারমতো বদলে নিন', 'Draft warning — edit as needed')}</span>
            <textarea id={advId} value={draft} onChange={(e) => setText(e.target.value)} rows={4} disabled={sent} className="w-full rounded-xl border border-border p-3 text-[15px] leading-7 outline-none focus:border-primary-400 disabled:bg-canvas" />
            <SmsMeter text={draft} className="mt-1" />
          </label>
          <div className="flex flex-col gap-2 md:w-60">
            <Button disabled={sent || !to.length} onClick={send} className="py-3">{sent ? <><CheckCircle2 size={16} />{T('পাঠানো হয়েছে', 'Sent')}</> : <><Send size={16} />{T(`${num(to.length, 'bn')} জনকে পাঠান`, `Send to ${to.length}`)}</>}</Button>
            <p className="text-[12.5px] leading-5 text-muted">{w.crop ? T(`কারা পাবেন: এই দিনগুলোতে যাঁদের ${cropName(w.crop, 'bn')} বীজতলায় বা জমিতে থাকবে।`, `Who gets it: everyone whose ${cropName(w.crop, 'en').toLowerCase()} is in the seedbed or field on these days.`) : T('কারা পাবেন: এই ইউনিয়নের পরিকল্পনা করা সব কৃষক।', 'Who gets it: every farmer with a plan in this union.')}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Alerts() {
  const { s, T, L, hotspots, farmerOf, parcels, officerUpazila } = useStore();
  const lang = s.lang;
  const union = useOfficerUnion();
  const hs = hotspots.filter((h) => h.members.some((m) => m.union === union.id));
  const gluts = Object.keys(RABI_CROPS).map((c) => ({ c, g: unionGlut(union, c) })).filter((x) => x.g.risk.level !== 'Low').sort((a, b) => (a.g.risk.level === 'High' ? -1 : 0) - (b.g.risk.level === 'High' ? -1 : 0));
  const waterAlerts = s.requests.filter((r) => r.union === union.id && r.type === 'water_alert' && r.status === 'open');
  const sign = T(`উপজেলা কৃষি অফিস, ${officerUpazila.name.bn}`, `Upazila agriculture office, ${officerUpazila.name.en}`);
  // Live forecast at the union centre.
  const [fc, setFc] = useState({ status: 'loading' });
  const load = () => {
    if (union.meta?.lat == null) { setFc({ status: 'error' }); return; }
    setFc({ status: 'loading' });
    fetchForecast(union.meta.lat, union.meta.lon).then((d) => setFc({ status: 'ok', d, at: Date.now() })).catch(() => setFc({ status: 'error' }));
  };
  useEffect(load, [union.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const crops = useMemo(() => new Set(union.plans.map((p) => p.crop)), [union.plans]);
  // A crop warning with nobody's crop exposed on those days is dropped: there is no one it would help.
  const wx = fc.status === 'ok' ? weatherWarnings(fc.d, { crops, month: monthOf(todayDhaka()) }).filter((w) => exposedPlots(w, union.plans).length > 0) : [];
  // Registered fields in this union whose latest Sentinel-2 reading has a warning.
  const sat = useMemo(() => parcels.filter((p) => p.union === union.id).map((p) => {
    const series = seriesNow(p);
    if (!series.length) return null;
    const r = readField({ series }, { today: todayDhaka() });
    const f = r.findings.find((x) => x.tone === 'warn') ?? r.findings.find((x) => x.tone === 'watch');
    return r.level === 'ok' || !f ? null : { p, r, f };
  }).filter(Boolean).sort((a, b) => (a.r.level === 'warn' ? -1 : 1) - (b.r.level === 'warn' ? -1 : 1)), [parcels, union.id]);
  const counts = [
    [CloudRain, T('আবহাওয়া', 'Weather'), wx.filter((w) => w.kind !== 'disease').length],
    [Bug, T('রোগের আবহাওয়া', 'Disease weather'), wx.filter((w) => w.kind === 'disease').length],
    [Satellite, T('উপগ্রহে জমি', 'Fields from space'), sat.length],
    [BellRing, T('একই সমস্যার গুচ্ছ', 'Problem clusters'), hs.length],
    [Droplets, T('শুকনো জমি', 'Dry fields'), waterAlerts.length],
    [TrendingDown, T('দাম পড়ার ঝুঁকি', 'Price-drop risk'), gluts.length],
  ];
  const none = !wx.length && !sat.length && !hs.length && !gluts.length && !waterAlerts.length;
  return (
    <div>
      <PageHeader eyebrow={T(`আগাম সতর্কতা · ${L(union.meta)} ইউনিয়ন · ${fmtDate(todayDhaka(), lang)}`, `Early warnings · ${L(union.meta)} union · ${fmtDate(todayDhaka(), lang)}`)} title={T('এলাকার সতর্কতা', 'Area alerts')}
        subtitle={T('আগামী ৮ দিনের আবহাওয়া আর রোগের ঝুঁকি, উপগ্রহে দুর্বল দেখানো জমি, কাছাকাছি একই সমস্যা, খুব শুকনো জমি আর দাম পড়ার ঝুঁকি — সবচেয়ে জরুরিটা আগে।', 'Weather and disease risk for the next 8 days, fields that look weak from space, the same problem nearby, badly dry fields and price-drop risk — most urgent first.')} tags={['REAL', 'AI', 'RULE', 'DEMO']} />
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" data-stagger>
        {counts.map(([Icon, label, n]) => (
          <div key={label} className={`rounded-xl border px-3 py-2.5 ${n ? 'border-amber-200 bg-amber-50/70' : 'border-border bg-white'}`}>
            <div className="flex items-center gap-1.5 text-[12.5px] text-muted"><Icon size={14} />{label}</div>
            <div className="font-display text-[22px] font-bold tabular">{num(n, lang)}</div>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
        {fc.status === 'loading' && <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" />{T('আবহাওয়ার পূর্বাভাস আনা হচ্ছে…', 'Fetching the forecast…')}</span>}
        {fc.status === 'ok' && <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary-500" />{T(`লাইভ পূর্বাভাস, হালনাগাদ ${clockText(fc.at, 'bn')}`, `Live forecast, updated ${clockText(fc.at, 'en')}`)}{!wx.length && T(' · আগামী ৮ দিনে আবহাওয়ার কোনো সতর্কতা নেই', ' · no weather warnings in the next 8 days')}</span>}
        {fc.status === 'error' && <span>{T('পূর্বাভাস আনা যায়নি।', 'Could not fetch the forecast.')}</span>}
        {fc.status !== 'loading' && <button type="button" onClick={load} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 font-semibold text-primary-700 hover:bg-primary-50"><RefreshCw size={13} />{T('আবার আনুন', 'Refresh')}</button>}
      </div>
      <div className="space-y-4">
        {none && fc.status !== 'loading' && <EmptyState icon={BellRing} title={T('এখন কোনো সতর্কতা নেই', 'No alerts right now')} text={T('নতুন কিছু দেখা দিলে এখানে আসবে।', 'New warnings will appear here.')} />}
        {wx.filter((w) => w.level === 'high').map((w) => <WeatherCard key={w.id} w={w} union={union} sign={sign} />)}
        {hs.map((h) => <ClusterCard key={h.id} h={h} union={union} />)}
        {wx.filter((w) => w.level !== 'high').map((w) => <WeatherCard key={w.id} w={w} union={union} sign={sign} />)}
        {sat.length > 0 && (
          <Card className="border-l-4 !border-l-sky-700 p-5">
            <div className="flex flex-wrap items-center gap-2"><Satellite size={19} className="text-sky-700" /><h2 className="text-[17px] font-bold">{T(`উপগ্রহে ${num(sat.length, 'bn')}টি জমি দুর্বল বা অস্বাভাবিক দেখাচ্ছে`, `${sat.length} fields look weak or unusual from space`)}</h2><Tags list={['REAL', 'RULE']} /></div>
            <p className="mt-0.5 text-[12.5px] text-muted">{T('সেন্টিনেল-২-এর শেষ পরিষ্কার ছবি, ১০ মিটার। উপগ্রহ রোগ চিনতে পারে না, শুধু দেখায় কোথায় ফসল দুর্বল; জমিতে গিয়ে দেখা দরকার।', 'Latest clear Sentinel-2 pass, 10 m. A satellite cannot name a disease, only show where the crop is weaker; it needs a field visit.')}</p>
            <ul className="mt-3 divide-y divide-border">
              {sat.map(({ p, r, f }) => (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold">{L(farmerOf(p.owner)?.name) || p.owner} · {L(p.name)} <span className={`chip ml-1 ${r.level === 'warn' ? LEVEL.high.cls : LEVEL.medium.cls}`}>{r.level === 'warn' ? L(LEVEL.high) : L(LEVEL.medium)}</span></div>
                    <div className="text-[13.5px] leading-5 text-ink/80">{L(f)}</div>
                    <div className="text-[12px] text-muted">{T(`ছবি ${fmtDate(parseISO(r.last.d), 'bn')} · সবুজ ${num(r.last.ndvi, 'bn', { dp: 2 })}`, `Pass ${fmtDate(parseISO(r.last.d), 'en')} · NDVI ${num(r.last.ndvi, 'en', { dp: 2 })}`)}</div>
                  </div>
                  <Link to={`/officer/farmers/${p.owner}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-primary-700 hover:bg-primary-50">{T('জমি দেখুন', 'See field')}<ChevronRight size={16} /></Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {waterAlerts.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center gap-3 border-l-4 !border-l-clay-500 p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay-50 text-clay-700"><Droplets size={19} /></span>
            <div className="min-w-0 flex-1"><div className="font-bold">{T(`জমি খুব শুকনো: ${L(farmerOf(r.farmerId)?.name)}`, `Field badly dry: ${L(farmerOf(r.farmerId)?.name)}`)}</div><div className="text-[13.5px] text-muted">{cropName(r.crop, lang)}, {lang === 'bn' ? r.villageBn : r.village} · {T('FAO-56 মাটির পানির হিসাবে লাল সংকেত', 'red on the FAO-56 soil-water balance')}</div></div>
            <Link to={`/officer/requests/${r.id}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-primary-700 hover:bg-primary-50">{T('খুলুন', 'Open')}<ChevronRight size={16} /></Link>
          </Card>
        ))}
        {gluts.map(({ c, g }) => {
          const peakWeek = g.bins.size ? [...g.bins.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0] : null;
          const growers = new Set(union.plans.filter((p) => p.crop === c).map((p) => p.plot_id)).size;
          return (
            <Card key={c} className="flex flex-wrap items-center gap-3 border-l-4 !border-l-paddy-500 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-paddy-50 text-paddy-700"><TrendingDown size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-bold">{T(`${bnOf(cropName(c, 'bn'))} দাম পড়ার ঝুঁকি`, `${cropName(c, 'en')}: price-drop risk`)} <span className={`chip ${RISK_STYLE[g.risk.level].cls}`}>{L(RISK_STYLE[g.risk.level])}</span></div>
                <div className="text-[13.5px] text-muted">{T(`সবচেয়ে ব্যস্ত সপ্তাহে (${peakWeek != null ? fmtDate(weekStart(peakWeek), 'bn') : '–'}) স্বাভাবিকের ${num(g.peak, 'bn', { dp: 1 })} গুণ ফসল উঠবে · ${num(growers, 'bn')} জন কৃষক`, `The busiest week (${peakWeek != null ? fmtDate(weekStart(peakWeek), 'en') : '–'}) brings ${num(g.peak, 'en', { dp: 1 })}× the normal amount · ${growers} farmers`)}</div>
              </div>
              <Link to="/officer/planting" className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-primary-700 hover:bg-primary-50">{T('লাগানোর পালা দেখুন', 'See planting slots')}<ChevronRight size={16} /></Link>
            </Card>
          );
        })}
      </div>
      <Note className="mt-6">{T('আবহাওয়ার সতর্কতা আসে লাইভ পূর্বাভাস আর আবহাওয়া অধিদপ্তরের প্রকাশিত সীমা থেকে; কাছাকাছি একই রকম খবরগুলো AI এক গুচ্ছে ধরে। কৃষকের কাছে কিছু যাওয়ার আগে আপনি নিজে পড়ে, দরকারমতো বদলে, পাঠান।', 'Weather warnings come from the live forecast and BMD’s published limits; AI groups similar nearby reports. Nothing reaches farmers until you have read, edited and sent it.')} <Tags list={['AI']} /></Note>
    </div>
  );
}
