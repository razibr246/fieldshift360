// Season planner step 2: how the farmer's season has really changed over 26 Rabi seasons, read the way a
// climatologist would: NASA POWER corrected to the nearest BMD station, crop-specific indicators with published
// thresholds, a trend test that separates a steady change from year-to-year scatter, and what to do about each.
import { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Thermometer, Snowflake, CloudRain, CalendarClock, Sprout, ExternalLink, ShieldCheck, ChevronDown } from 'lucide-react';
import { useStore } from '../../../store';
import { StepHeader, Card, Tags, climateTag } from '../../../components/ui';
import Photo from '../../../components/Photo';
import { agroClimate, rabiWarming, extremes, INDICATORS, GROUPS, SOURCES, doyDate } from '../../../engine/agroclimate.js';
import { rainCrossCheck } from '../../../engine/climate.js';
import { cropName } from '../../../engine/crops.js';
import { num, bnDigits, fmtDate } from '../../../engine/dates.js';

const GROUP_ICON = { heat: Thermometer, cold: Snowflake, water: CloudRain, timing: CalendarClock };
const MONTHS_BN = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলা', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SURE = {
  sure: { bn: 'নিশ্চিত প্রবণতা', en: 'Clear trend' },
  likely: { bn: 'সম্ভবত', en: 'Likely' },
  unclear: { bn: 'ওঠানামা, নিশ্চিত নয়', en: 'Ups and downs, no clear trend' },
};
const season = (y, lang) => (lang === 'bn' ? `${bnDigits(y - 1)}–${bnDigits(String(y).slice(2))}` : `${y - 1}–${String(y).slice(2)}`);

// Good, bad or neutral for the farmer, from the indicator's harmful direction and how sure the trend is.
function verdict(x) {
  const t = x.trend;
  if (!t || t.sure === 'unclear' || Math.abs(t.perDecade) < 1e-9) return 'flat';
  if (!x.def.worse) return 'shift';
  const up = t.perDecade > 0;
  return (x.def.worse === 'up') === up ? 'worse' : 'better';
}
const VERDICT = {
  worse: { cls: 'bg-red-50 text-red-800 ring-red-200', bar: '#b42318' },
  better: { cls: 'bg-primary-50 text-primary-800 ring-primary-200', bar: '#2f6e2f' },
  shift: { cls: 'bg-sky-50 text-sky-800 ring-sky-200', bar: '#237479' },
  flat: { cls: 'bg-black/[.04] text-ink/70 ring-border', bar: '#8a9a8f' },
};

export default function StepClimate() {
  const { s, T, L, clim, farmer, chosen, upazila } = useStore();
  const lang = s.lang;
  const ac = useMemo(() => agroClimate(clim), [clim]);
  const warm = useMemo(() => rabiWarming(clim), [clim]);
  const ext = useMemo(() => extremes(clim), [clim]);
  const rain = useMemo(() => rainCrossCheck(clim), [clim]);
  const myCrops = useMemo(() => [...new Set([chosen.crop.id, farmer.last_crop])], [chosen.crop.id, farmer.last_crop]);
  const forMe = (id) => INDICATORS[id].crops.some((c) => myCrops.includes(c));
  const firstPick = Object.keys(INDICATORS).filter(forMe).sort((a, b) => (ac[a].trend?.p ?? 1) - (ac[b].trend?.p ?? 1))[0] ?? 'boroHeat';
  const [sel, setSel] = useState(firstPick);
  const x = ac[sel];
  const fmtVal = (v, id = sel, l = lang) => (v == null ? '–' : INDICATORS[id].date ? fmtDate(doyDate(Math.round(v)), l) : num(v, l, { dp: Math.abs(v) < 10 && v % 1 ? 1 : 0 }));
  const corr = clim.prov.corrected;

  // ---- headline: three things worth knowing ----
  const headline = useMemo(() => {
    const out = [];
    const deg = (v) => num(Math.abs(v), lang, { dp: 2 });
    const dirBn = (v) => (v > 0 ? 'বেড়েছে' : 'কমেছে'), dirEn = (v) => (v > 0 ? 'warmer' : 'cooler');
    out.push({
      icon: Thermometer,
      text: T(`রবির দিন প্রতি দশকে ${deg(warm.tmax.perDecade)}° ${dirBn(warm.tmax.perDecade)} (${L(SURE[warm.tmax.sure])}), রাত ${deg(warm.tmin.perDecade)}° ${dirBn(warm.tmin.perDecade)} (${L(SURE[warm.tmin.sure])})।${warm.tmax.perDecade < 0 && warm.tmin.perDecade > 0 ? ' দিন একটু ঠান্ডা আর রাত একটু গরম হওয়া গঙ্গা অববাহিকায় শীতের কুয়াশা বাড়ার সঙ্গে মেলে।' : ''}`,
        `Rabi days are ${deg(warm.tmax.perDecade)}° ${dirEn(warm.tmax.perDecade)} per decade (${L(SURE[warm.tmax.sure]).toLowerCase()}), nights ${deg(warm.tmin.perDecade)}° ${dirEn(warm.tmin.perDecade)} (${L(SURE[warm.tmin.sure]).toLowerCase()}).${warm.tmax.perDecade < 0 && warm.tmin.perDecade > 0 ? ' Slightly cooler days and milder nights fit the rise in winter fog across the Ganges plain.' : ''}`),
    });
    const mine = Object.keys(INDICATORS).filter(forMe).map((id) => ac[id]).filter((a) => a.trend && a.trend.sure !== 'unclear').sort((a, b) => a.trend.p - b.trend.p)[0];
    if (mine) {
      out.push({
        icon: Sprout,
        text: T(`আপনার ফসলের (${myCrops.map((c) => cropName(c, 'bn')).join(', ')}) জন্য সবচেয়ে স্পষ্ট বদল: ${mine.def.bn} — আগের ১৩ মৌসুমে গড়ে ${fmtVal(mine.then, mine.id, 'bn')}, শেষ ১৩ মৌসুমে ${fmtVal(mine.now, mine.id, 'bn')} ${mine.def.date ? '' : mine.def.unit.bn}।`,
          `The clearest change for your crops (${myCrops.map((c) => cropName(c, 'en').toLowerCase()).join(', ')}): ${mine.def.en.toLowerCase()}, from ${fmtVal(mine.then, mine.id, 'en')} to ${fmtVal(mine.now, mine.id, 'en')} ${mine.def.date ? '' : mine.def.unit.en} between the first and last 13 seasons.`),
      });
    } else {
      out.push({ icon: Sprout, text: T('আপনার ফসলের জন্য গুরুত্বপূর্ণ কোনো হিসাবে নিশ্চিত প্রবণতা নেই; বছরে বছরে ওঠানামাই বেশি। তাই প্রতি মৌসুমের পূর্বাভাস দেখে কাজ করা জরুরি।', 'None of the measures that matter for your crops shows a clear trend; the swings from year to year are bigger. Plan each season by its own forecast.') });
    }
    const odd = Object.values(ac).filter((a) => a.last && !a.def.date && a.n >= 20 && (a.rank <= 2 || a.rank >= a.n - 1) && a.max !== a.min)[0];
    if (odd) {
      const high = odd.rank <= 2;
      out.push({
        icon: CalendarClock,
        text: T(`গত মৌসুম (${season(odd.last.season, 'bn')}) ছিল আলাদা: ${odd.def.bn} ${fmtVal(odd.last.value, odd.id, 'bn')} ${odd.def.unit.bn}, ২৬ মৌসুমের মধ্যে ${high ? 'সবচেয়ে বেশিগুলোর' : 'সবচেয়ে কমগুলোর'} একটি।`,
          `Last season (${season(odd.last.season, 'en')}) stood out: ${odd.def.en.toLowerCase()} reached ${fmtVal(odd.last.value, odd.id, 'en')} ${odd.def.unit.en}, among the ${high ? 'highest' : 'lowest'} of 26 seasons.`),
      });
    }
    return out;
  }, [ac, warm, lang, myCrops]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = x.series.map((r) => ({ y: r.season, label: lang === 'bn' ? bnDigits(String(r.season).slice(2)) : `’${String(r.season).slice(2)}`, value: r.value, trend: x.trend ? x.trend.line(r.season) : null, recent: r.season >= 2014 }));
  const v = VERDICT[verdict(x)];
  const tickFmt = (val) => (x.def.date ? fmtDate(doyDate(Math.round(val)), lang) : num(val, lang));

  return (
    <div>
      <StepHeader kicker={T('ধাপ ২, আবহাওয়া', 'Step 2, weather')} title={T('আপনার মৌসুম কি বদলে গেছে?', 'Has your season changed?')}
        sub={T(`নাসার ২৬ রবি মৌসুমের প্রতিদিনের তথ্য, ${corr ? `${L(corr.station)}-এর মাপের সঙ্গে মিলিয়ে ঠিক করা।` : ''} কোনটা সত্যিই বদলাচ্ছে আর কোনটা শুধু বছরে বছরে ওঠানামা, আলাদা করে দেখানো হয়েছে।`,
          `Daily NASA data for 26 Rabi seasons${corr ? `, corrected against ${L(corr.station)}` : ''}. What is really changing is told apart from ordinary year-to-year swings.`)}
        tags={[climateTag(), 'RULE']} />
      <div className="relative mb-4 overflow-hidden rounded-2xl"><div className="relative aspect-[16/4]"><Photo name="droughtFlood" fill sizes="720px" /></div></div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-[17px] font-bold">{T(`${upazila.name.bnOf} আবহাওয়া, এক নজরে`, `${upazila.name.en}’s weather at a glance`)}</h3>
        <ul className="mt-3 space-y-2.5">
          {headline.map((h, i) => (
            <li key={i} className="flex gap-2.5 text-[14.5px] leading-6"><h.icon size={18} className="mt-0.5 shrink-0 text-primary-600" /><span>{h.text}</span></li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
          <Fact k={T('সবচেয়ে গরম দিন', 'Hottest day')} v={`${num(ext.hot.v, lang, { dp: 1 })}°`} sub={fmtDate(ext.hot.t, lang) + ' ' + (lang === 'bn' ? bnDigits(new Date(ext.hot.t).getUTCFullYear()) : new Date(ext.hot.t).getUTCFullYear())} />
          <Fact k={T('সবচেয়ে ঠান্ডা রাত', 'Coldest night')} v={`${num(ext.cold.v, lang, { dp: 1 })}°`} sub={fmtDate(ext.cold.t, lang) + ' ' + (lang === 'bn' ? bnDigits(new Date(ext.cold.t).getUTCFullYear()) : new Date(ext.cold.t).getUTCFullYear())} />
          <Fact k={T('রবির দিনের গড়', 'Rabi day average')} v={`${num(warm.tmax.mean, lang, { dp: 1 })}°`} sub={T('নভেম্বর–মার্চ', 'Nov–Mar')} />
          <Fact k={T('রবির রাতের গড়', 'Rabi night average')} v={`${num(warm.tmin.mean, lang, { dp: 1 })}°`} sub={T('নভেম্বর–মার্চ', 'Nov–Mar')} />
        </div>
      </Card>

      {Object.entries(GROUPS).map(([g, gl]) => {
        const ids = Object.keys(INDICATORS).filter((id) => INDICATORS[id].group === g);
        const Icon = GROUP_ICON[g];
        return (
          <section key={g} className="mt-5">
            <h3 className="mb-2 flex items-center gap-2 text-[15px] font-bold text-ink/80"><Icon size={17} className="text-primary-600" />{L(gl)}</h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {ids.map((id) => {
                const a = ac[id], vd = verdict(a), on = id === sel;
                const Arrow = !a.trend || vd === 'flat' ? Minus : a.trend.perDecade > 0 ? TrendingUp : TrendingDown;
                return (
                  <button key={id} type="button" onClick={() => setSel(id)} aria-pressed={on}
                    className={`rounded-xl border p-3 text-left transition ${on ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200' : 'border-border bg-white hover:border-primary-300'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] leading-snug text-ink/80">{L(INDICATORS[id])}</span>
                      {forMe(id) && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">{T('আপনার ফসল', 'Your crop')}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-[13px] text-muted">{fmtVal(a.then, id)}</span>
                      <span className="text-[12.5px] text-muted">{T('থেকে', 'to')}</span>
                      <span className="font-display text-[21px] font-bold">{fmtVal(a.now, id)}</span>
                      {!a.def.date && <span className="text-[12.5px] text-muted">{L(a.def.unit)}</span>}
                    </div>
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${VERDICT[vd].cls}`}>
                      <Arrow size={13} />{a.trend ? L(SURE[a.trend.sure]) : '–'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <Card className="mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-[18px] font-bold leading-tight">{L(x.def)}</h3>
            <p className="mt-0.5 text-[13.5px] text-muted">{L(x.def.detail)}</p>
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-semibold ring-1 ${v.cls}`}>
            {x.trend ? `${L(SURE[x.trend.sure])} · p = ${num(x.trend.p, lang, { dp: 2 })}` : ''}
          </span>
        </div>

        <figure className="mt-3">
          <div className="h-[220px]" role="img" aria-label={T(`${x.def.bn}, প্রতি মৌসুমে`, `${x.def.en}, each season`)}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 6, right: 6, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e7ede4" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#566a5e' }} interval={2} tickLine={false} axisLine={{ stroke: '#cdd8ca' }} />
                <YAxis tick={{ fontSize: 11, fill: '#566a5e' }} tickLine={false} axisLine={false} tickFormatter={tickFmt} domain={x.def.date ? ['dataMin - 5', 'dataMax + 5'] : [0, 'auto']} width={x.def.date ? 62 : 44} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} contentStyle={{ borderRadius: 12, fontSize: 13 }}
                  labelFormatter={(l, p) => (p?.[0] ? T(`${season(p[0].payload.y, 'bn')} মৌসুম`, `Season ${season(p[0].payload.y, 'en')}`) : l)}
                  formatter={(val, k) => [k === 'trend' ? `${fmtVal(val)}` : `${fmtVal(val)} ${x.def.date ? '' : L(x.def.unit)}`, k === 'trend' ? T('প্রবণতা', 'Trend') : T('এই মৌসুম', 'This season')]} />
                {x.then != null && <ReferenceLine y={x.then} stroke="#8a9a8f" strokeDasharray="4 3" ifOverflow="extendDomain" />}
                <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={18}>
                  {data.map((d) => <Cell key={d.y} fill={d.recent ? '#43863a' : '#c4d1c0'} />)}
                </Bar>
                {x.trend && <Line dataKey="trend" type="linear" stroke={v.bar} strokeWidth={2} dot={false} activeDot={false} isAnimationActive={false} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#c4d1c0]" />{T('২০০০–০১ থেকে ২০১২–১৩', '2000–01 to 2012–13')}</span>
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#43863a]" />{T('২০১৩–১৪ থেকে ২০২৫–২৬', '2013–14 to 2025–26')}</span>
            <span><i className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: v.bar }} />{T('প্রবণতা (সেন-এর ঢাল)', 'Trend (Sen’s slope)')}</span>
            <span><i className="mr-1 inline-block w-4 border-t-2 border-dashed border-[#8a9a8f] align-middle" />{T('প্রথম ১৩ মৌসুমের গড়', 'First 13 seasons’ average')}</span>
          </figcaption>
        </figure>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Fact k={T('প্রতি দশকে বদল', 'Change per decade')} v={x.trend ? (x.def.date ? T(`${num(Math.abs(x.trend.perDecade), 'bn', { dp: 1 })} দিন ${x.trend.perDecade < 0 ? 'আগে' : 'পরে'}`, `${num(Math.abs(x.trend.perDecade), 'en', { dp: 1 })} days ${x.trend.perDecade < 0 ? 'earlier' : 'later'}`) : `${x.trend.perDecade > 0 ? '+' : x.trend.perDecade < 0 ? '−' : ''}${num(Math.abs(x.trend.perDecade), lang, { dp: 1 })} ${L(x.def.unit)}`) : '–'} sub={x.trend ? L(SURE[x.trend.sure]) : ''} />
          <Fact k={T(`গত মৌসুম (${season(x.last.season, 'bn')})`, `Last season (${season(x.last.season, 'en')})`)} v={`${fmtVal(x.last.value)} ${x.def.date ? '' : L(x.def.unit)}`}
            sub={x.def.date ? '' : T(`২৬ মৌসুমের মধ্যে ${num(x.rank, 'bn')} নম্বর সর্বোচ্চ`, `${ordinal(x.rank)} highest of 26`)} />
          <Fact k={T('২৬ মৌসুমে সীমা', 'Range in 26 seasons')} v={`${fmtVal(x.min)} – ${fmtVal(x.max)}`} sub={x.def.date ? '' : L(x.def.unit)} />
        </div>

        <div className="mt-4 rounded-xl bg-canvas p-3.5 text-[14px] leading-6">
          <div className="font-semibold">{T('কেন জরুরি', 'Why it matters')}</div>
          <p className="text-ink/85">{L(x.def.why)}</p>
          <div className="mt-2.5 font-semibold">{T('কী করবেন', 'What to do')}</div>
          <ul className="list-disc space-y-1 pl-5 text-ink/85">{x.def.act.map((a, i) => <li key={i}>{L(a)}</li>)}</ul>
          {x.def.crops.length > 0 && <p className="mt-2 text-[12.5px] text-muted">{T('যে ফসলে বেশি লাগে', 'Matters most for')}: {x.def.crops.map((c) => cropName(c, lang)).join(', ')}</p>}
        </div>
        <Sources ids={[...x.def.src, ...(sel === 'boroWater' ? ['hargreaves'] : [])]} />
      </Card>

      <details className="group mt-4 rounded-2xl border border-border bg-white p-4 sm:p-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[15.5px] font-bold">
          <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-primary-600" />{T('তথ্য কতটা নির্ভরযোগ্য', 'How far to trust these numbers')}</span>
          <ChevronDown size={18} className="transition group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-3 text-[14px] leading-6 text-ink/85">
          <p>{T('নাসা POWER-এর একেকটি ঘর প্রায় ৫০ কিলোমিটার জুড়ে, আর এটা থার্মোমিটার নয়, মডেলের হিসাব। তাই কাছের আবহাওয়া কেন্দ্রের ১৯৯১–২০২০ সালের গড়ের সঙ্গে প্রতি মাসে মিলিয়ে দেখা হয়েছে:', 'Each NASA POWER cell covers about 50 km and is a model estimate, not a thermometer. So every month was checked against the nearest weather station’s 1991–2020 normals:')}</p>
          {corr && <BiasStrip bias={corr.tmax} lang={lang} T={T} />}
          {corr && <p>{T(`${L(corr.station)} (${num(corr.km, 'bn')} কিমি দূরে) অনুযায়ী মার্চ–মে মাসে নাসার দিনের তাপমাত্রা ২–৩° বেশি আর অক্টোবর–নভেম্বরে প্রায় ২° কম। গরম দিন গোনার আগে এই পার্থক্য প্রতিদিনের তাপমাত্রা থেকে বাদ দেওয়া হয়েছে; বছরে বছরে বদল আর প্রবণতা তাতে বদলায় না।`, `Against ${L(corr.station)} (${corr.km} km away), NASA’s daytime temperatures run 2–3° high in March–May and about 2° low in October–November. That difference is taken off every day before hot days are counted; year-to-year changes and trends are unaffected.`)}
            {corr.urban ? T(' রাতের তাপমাত্রা ঠিক করা হয়নি, কারণ ঢাকা কেন্দ্র শহরের ভেতরে, শহরের রাত গ্রামের চেয়ে গরম থাকে।', ' Night temperatures were not corrected, because the Dhaka station is inside the city, whose nights stay warmer than the countryside’s.') : T(' রাতের তাপমাত্রাও একইভাবে ঠিক করা হয়েছে।', ' Night temperatures were corrected the same way.')}</p>}
          {rain && <p>{T(`বৃষ্টি: নাসা POWER আর নাসা-জাক্সার উপগ্রহ (GPM IMERG) রবি মৌসুমে মিলেছে r = ${num(rain.rabi.r, 'bn', { dp: 2 })}, বর্ষায় r = ${num(rain.monsoon.r, 'bn', { dp: 2 })}; মাসিক বৃষ্টি আবহাওয়া কেন্দ্রের গড়ের কাছাকাছি।`, `Rain: NASA POWER and the NASA–JAXA GPM IMERG satellite agree at r = ${rain.rabi.r.toFixed(2)} in Rabi and r = ${rain.monsoon.r.toFixed(2)} in the monsoon; monthly rain is close to the station normals.`)}</p>}
          <p>{T('প্রবণতা মাপা হয়েছে সেন-এর ঢাল (সব বছর-জোড়ার ঢালের মধ্যমা, তাই এক অদ্ভুত বছর হিসাব ঘোরাতে পারে না) আর ম্যান-কেন্ডাল পরীক্ষা দিয়ে। p ০.০৫-এর কম হলে "নিশ্চিত প্রবণতা", ০.২-এর কম হলে "সম্ভবত", নইলে শুধু ওঠানামা। ২৬ বছর ছোট সময়, তাই "নিশ্চিত নয়" মানে বদল নেই তা নয়, শুধু এখনো প্রমাণ হয়নি।', 'Trends use Sen’s slope (the median slope over all pairs of years, so one odd year cannot swing it) and the Mann–Kendall test. p below 0.05 is a "clear trend", below 0.2 "likely", otherwise just ups and downs. 26 years is short: "no clear trend" does not mean nothing is changing, only that it is not proven yet.')}</p>
          <p className="text-[13px] text-muted">{T('এটা অতীতের হিসাব, পূর্বাভাস নয়।', 'This looks back; it is not a forecast.')} {T('উৎস', 'Sources')}: NASA POWER ({clim.prov.version}), {T('প্রতিদিনের তথ্য', 'daily')} {clim.prov.start} – {clim.prov.end}.</p>
          <Sources ids={['normals', 'fog']} />
        </div>
      </details>
    </div>
  );
}

const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const Fact = ({ k, v, sub }) => (
  <div className="rounded-xl bg-canvas px-3 py-2.5">
    <div className="text-[12.5px] text-muted">{k}</div>
    <div className="font-display text-[17px] font-bold leading-tight">{v}</div>
    {sub && <div className="text-[12px] text-muted">{sub}</div>}
  </div>
);

function Sources({ ids }) {
  const { T } = useStore();
  const list = ids.map((id) => SOURCES[id]).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="mt-3 text-[12.5px] leading-5 text-muted">
      <span className="font-semibold">{T('সূত্র', 'Sources')}: </span>
      {list.map((src, i) => (
        <span key={src.url}>{i > 0 && ' · '}<a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-primary-700">{src.label}<ExternalLink size={11} /></a></span>
      ))}
    </div>
  );
}

// NASA minus station, daytime temperature, by month: one small bar per month around a zero line.
function BiasStrip({ bias, lang, T }) {
  const max = Math.max(...bias.map((b) => Math.abs(b)), 1);
  return (
    <div className="rounded-xl bg-canvas p-3">
      <div className="mb-1 text-[12.5px] text-muted">{T('নাসা − আবহাওয়া কেন্দ্র, দিনের সর্বোচ্চ তাপমাত্রা (°সে)', 'NASA − station, daily maximum temperature (°C)')}</div>
      <div className="grid grid-cols-12 gap-1">
        {bias.map((b, m) => (
          <div key={m} className="flex flex-col items-center" title={`${(lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m]}: ${b > 0 ? '+' : ''}${b.toFixed(1)}°`}>
            <div className="relative h-16 w-full">
              <div className="absolute inset-x-0 top-1/2 border-t border-border" />
              <div className="absolute inset-x-[18%] rounded-sm" style={{ background: b > 0 ? '#c8463d' : '#237479', height: `${(Math.abs(b) / max) * 50}%`, ...(b > 0 ? { bottom: '50%' } : { top: '50%' }) }} />
            </div>
            <span className="text-[10.5px] tabular text-ink/80">{b > 0 ? '+' : ''}{num(b, lang, { dp: 1 })}</span>
            <span className="text-[10px] text-muted">{(lang === 'bn' ? MONTHS_BN : MONTHS_EN)[m]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

