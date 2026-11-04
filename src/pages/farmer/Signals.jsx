// মাঠের সংকেত (Field signals): one screen for the farmer's field. What comes next, the six NASA-based signals (rain,
// soil moisture, heat, green cover, water stored under the land, soil organic matter over ten years), rotations
// side by side on water, soil, heat and harvest, weather and water uncertainty with sliders, and the maps.
// Every number comes from engine/signals.js on the records the app already holds; nothing here is sample data
// except the farmer and their field, which are the demo's.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { CloudRain, Droplets, Thermometer, Leaf, Waves, FlaskConical, ArrowRight, Star, SlidersHorizontal, Map as MapIcon, Sprout, Telescope } from 'lucide-react';
import { useStore } from '../../store';
import { Card, PageHeader, Segmented, Note, Tags } from '../../components/ui';
import { SectionNav, LazyMount } from '../../components/SectionNav';
import FieldRiskMap from '../../components/fields/FieldRiskMap';
import TrendMap from '../../components/map/TrendMap';
import deltas from '../../data/climate/cmip6_deltas.json';
import soilWetness from '../../data/water/soil_wetness.json';
import waterSat from '../../data/water/water_sat.json';
import { rabiWetness, graceRecord, smapNow } from '../../engine/soilwater';
import { landSummary, fieldGreen } from '../../engine/landsat';
import { climateChange, fieldContext, fieldFuture, cropOf } from '../../engine/soilfuture';
import { runnerUp } from '../../engine/explain';
import { fieldSignals, tradeoffs, bestOn, uncertainty, whatNext, LEVELS } from '../../engine/signals';
import { num } from '../../engine/dates';

const TONE = ['#43863a', '#c99a3a', '#b42318'];
const TONE_BG = ['bg-[#eef6ea]', 'bg-[#fbf3e3]', 'bg-[#fdecea]'];
const ICON = { rain: CloudRain, soil: Droplets, heat: Thermometer, ndvi: Leaf, water: Waves, nutrient: FlaskConical };
const STRAT_COLOR = { habit: '#6b7a72', best: '#2f6e2f', alt: '#2f8a8f', plan: '#b8761b' };

export default function Signals() {
  const { s, T, L, farmer, soil, clim, tm, econ, chosen, rotation, upazila, activeParcel, water } = useStore();
  const lang = s.lang;
  const n = (v, dp = 0) => (v == null ? '–' : num(v, lang, { dp }));

  // Field Future's ten-year runs for this field (the same call as /farmer/future).
  const ctx = useMemo(() => fieldContext({ clim, change: climateChange(deltas, upazila.id, 'ssp245'), soil, plot: farmer, amanT: rotation.amanMeasured ? rotation.amanT : null, econ }),
    [clim, upazila.id, soil, farmer, rotation.amanMeasured, rotation.amanT, econ]);
  const ff = useMemo(() => fieldFuture({ ctx, lastCrop: farmer.last_crop, plan: { rabi: chosen.crop.id, k1: rotation.best?.crop.id ?? 'fallow' }, priorities: s.priorities, exclude: s.exclude ?? [] }),
    [ctx, farmer.last_crop, chosen.crop.id, rotation.best, s.priorities, s.exclude]);
  const signals = useMemo(() => fieldSignals({
    tm, clim, wet: rabiWetness(soilWetness, upazila.id), smap: smapNow(waterSat, upazila.id), grace: graceRecord(waterSat, upazila.id),
    land: landSummary(upazila.id), field: activeParcel ? fieldGreen(activeParcel.id, upazila.id) : null, habit: ff.habit, best: ff.best,
    drain: ff.all.reduce((a, e) => (e.sNow.dSoc < a.sNow.dSoc ? e : a), ff.all[0]), soil: ctx.soil,
  }), [tm, clim, upazila.id, activeParcel, ff, ctx.soil]);

  // Strategies to compare: as now, the best, the next real alternative, and this season's plan every year.
  const second = useMemo(() => runnerUp(ff.top, ff.best), [ff]);
  const all = useMemo(() => [
    { id: 'habit', name: T('এখন যেমন চাষ', 'As now'), e: ff.habit },
    { id: 'best', name: T('সেরা ফসলচক্র', 'Best rotation'), e: ff.best },
    ...(second ? [{ id: 'alt', name: T('পরের বিকল্প', 'Next alternative'), e: second }] : []),
    ...(ff.plan ? [{ id: 'plan', name: T('এবারের পরিকল্পনা প্রতি বছর', 'This season’s plan, every year'), e: ff.plan }] : []),
  ], [ff, second, T]);
  const trade = useMemo(() => tradeoffs(all, ctx), [all, ctx]);

  // Uncertainty for this season's crop: the four scenarios and the farmer's own slider setting.
  const [dT, setDT] = useState(0);
  const [rainPct, setRainPct] = useState(0);
  const unc = useMemo(() => uncertainty(clim, chosen.crop, chosen.t0, { dT, rain: 1 + rainPct / 100 }, chosen.shift ?? 0), [clim, chosen.crop, chosen.t0, chosen.shift, dT, rainPct]);

  const steps = useMemo(() => whatNext({ water, plan: { crop: chosen.crop, t0: chosen.t0 }, unc, trade, signals }), [water, chosen.crop, chosen.t0, unc, trade, signals]);

  return (
    <div>
      <PageHeader eyebrow={T(`${farmer.villageBn}, ${L(upazila.name)}`, `${farmer.village}, ${upazila.name.en}`)}
        title={T('মাঠের সংকেত', 'Field signals')}
        subtitle={T('নাসার উপগ্রহ আর আবহাওয়ার তথ্যে আপনার জমির ছয়টি সংকেত, ফসলচক্রের লাভ-ক্ষতি পাশাপাশি, আবহাওয়ার অনিশ্চয়তা আর এরপর কী করবেন। এটি পরামর্শ, সিদ্ধান্ত আপনার আর কৃষি অফিসারের।',
          'Six signals for your field from NASA satellites and weather, rotations side by side, how uncertain the weather is, and what to do next. This supports your judgement and your agriculture officer’s; it does not replace them.')}
        tags={['SAT', 'MODEL', 'RULE']} />
      <SectionNav label={T('পাতার অংশ', 'Page sections')} sections={[
        { id: 'sg-next', label: T('এরপর কী', 'What next') },
        { id: 'sg-signals', label: T('ছয় সংকেত', 'Six signals') },
        { id: 'sg-compare', label: T('ফসলচক্র পাশাপাশি', 'Compare rotations') },
        { id: 'sg-risk', label: T('ঝুঁকি ও অনিশ্চয়তা', 'Risk and uncertainty') },
        { id: 'sg-map', label: T('মানচিত্র', 'Map') },
      ]} />

      <WhatNext steps={steps} />
      <SignalGrid signals={signals} />
      <Compare rows={trade} ctx={ctx} n={n} />
      <Uncertainty rows={unc} crop={chosen.crop} dT={dT} setDT={setDT} rainPct={rainPct} setRainPct={setRainPct} n={n} />
      <MapSection highlight={activeParcel?.id ?? null} upazilaId={upazila.id} />
    </div>
  );
}

// ── what comes next ──
function WhatNext({ steps }) {
  const { T, L } = useStore();
  return (
    <Card id="sg-next" className="mt-4 scroll-mt-40 p-4 sm:p-5">
      <h2 className="text-[19px] font-bold text-ink">{T('আপনার জমিতে এরপর কী', 'What comes next for your field')}</h2>
      <ol className="mt-3 grid gap-3 md:grid-cols-2">
        {steps.map((st) => (
          <li key={st.id} className={`rounded-2xl border border-border p-3.5 ${TONE_BG[st.tone]}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: TONE[st.tone] }}>{L(st.when)}</span>
              <Tags list={st.tags} />
            </div>
            <p className="mt-1.5 text-[15.5px] font-semibold leading-6 text-ink">{L(st.text)}</p>
            {st.why && <p className="mt-1 text-[13.5px] leading-5 text-muted">{L(st.why)}</p>}
            <Link to={st.to} className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-primary-700 hover:underline">{T('বিস্তারিত', 'Details')}<ArrowRight size={14} /></Link>
          </li>
        ))}
      </ol>
      <Note className="mt-3">{T('উপগ্রহ আর মডেল এলাকার ধারা দেখায়, আপনার জমির প্রতিটি কোণ নয়। জমিতে গিয়ে দেখুন, আর বড় সিদ্ধান্তের আগে উপজেলা কৃষি অফিসারের সাথে কথা বলুন।',
        'Satellites and models show the pattern of the area, not every corner of your field. Walk the field, and talk to the upazila agriculture officer before a big change.')}</Note>
    </Card>
  );
}

// ── the six signals ──
function SignalGrid({ signals }) {
  const { T, L } = useStore();
  return (
    <section id="sg-signals" className="mt-5 scroll-mt-40">
      <h2 className="text-[19px] font-bold text-ink">{T('নাসার তথ্যে ছয়টি সংকেত', 'Six signals from NASA data')}</h2>
      <p className="mt-1 text-[14px] text-muted">{T('প্রতিটি কার্ডে: এখন কেমন, আগের তুলনায় কতটা বদলেছে, আর তথ্য কোথা থেকে।', 'Each card: how it is now, how it has changed, and where the data comes from.')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signals.map((sg) => {
          const Icon = ICON[sg.id] ?? Leaf;
          return (
            <Card key={sg.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[15.5px] font-bold text-ink"><Icon size={19} style={{ color: TONE[sg.level] }} />{L(sg.title)}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12.5px] font-bold ${TONE_BG[sg.level]}`} style={{ color: TONE[sg.level] }}>{L(LEVELS[sg.level])}</span>
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-ink">{L(sg.value)}</p>
              <Spark series={sg.series} compare={sg.compare} drain={sg.drain} color={sg.flatByDesign ? '#6b7a72' : TONE[sg.level]} unit={sg.unit} />
              <p className="text-[13.5px] leading-5 text-muted">{L(sg.detail)}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-[12px] text-muted">
                <span>{sg.source}</span><Tags list={sg.tags} />
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Spark({ series, compare, drain, color, unit }) {
  const { T, s } = useStore();
  const data = series.map((p, i) => ({ x: p.x, y: p.y, c: compare?.[i]?.y, d: drain?.[i]?.y }));
  if (data.length < 2) return null;
  return (
    <div className="my-2 h-[92px]" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
          <XAxis dataKey="x" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip formatter={(v, k) => [`${num(v, s.lang, { dp: unit === 'NDVI' ? 2 : 1 })} ${unit === 'd' ? T('দিন', 'days') : unit}`, k === 'c' ? T('সেরা ফসলচক্রে', 'Best rotation') : k === 'd' ? T('সবচেয়ে ক্ষয়ের ফসলচক্রে', 'Most draining rotation') : T('এই জমি', 'This field')]} labelFormatter={(x) => num(x, s.lang, { grouping: false })} />
          <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          {compare && <Line type="monotone" dataKey="c" stroke="#2f6e2f" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} />}
          {drain && <Line type="monotone" dataKey="d" stroke="#b42318" strokeDasharray="4 3" strokeWidth={2} dot={false} isAnimationActive={false} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── rotations side by side ──
function rotLabel(rot, L) {
  return rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name)).join(' → ')).join(' | ');
}

function Compare({ rows, ctx, n }) {
  const { T, L } = useStore();
  const [world, setWorld] = useState('now');
  const [on, setOn] = useState(() => rows.slice(0, 3).map((r) => r.id));
  const shown = rows.filter((r) => on.includes(r.id));
  const best = bestOn(shown);
  const w = world === 'fut' && ctx.climF ? 'fut' : 'now';
  const pick = (m) => (r) => (r[m][w] ?? r[m].now);
  const metrics = [
    { k: 'water', icon: Droplets, title: T('সেচের পানি', 'Irrigation water'), unit: T('মিমি/বছর', 'mm a year'), v: pick('water'), lower: true, help: T('কম হলে ভালো: পাম্পের খরচ আর মাটির নিচের পানি বাঁচে।', 'Lower is better: less pumping and less of the water under the land.') },
    { k: 'soil', icon: Sprout, title: T('মাটির জৈব কার্বন, ১০ বছরে', 'Soil carbon, ten years'), unit: '%', v: pick('soil'), signed: true, help: T('বেশি হলে ভালো: মাটির পুষ্টি ফিরছে।', 'Higher is better: the soil’s nutrients are coming back.') },
    { k: 'heat', icon: Thermometer, title: T('গরমে ক্ষতির ঝুঁকি', 'Heat damage risk'), unit: T('% মৌসুম', '% of seasons'), v: (r) => (pick('heat')(r) ?? 0) * 100, lower: true, help: T('কম হলে ভালো: ফুল বা দানার সময়ে অতিরিক্ত গরমের মৌসুমের ভাগ।', 'Lower is better: share of seasons with damaging heat at flowering or grain fill.') },
    { k: 'yield', icon: Leaf, title: T('বছরে মোট ফলন', 'Harvest a year'), unit: T('টন/হেক্টর', 't/ha'), v: (r) => r.yield, dp: 1, help: T('সব ফসল মিলিয়ে সাধারণ ফলন (FAOSTAT গড়), আবহাওয়ার ক্ষতি বাদ দেওয়া হয়নি।', 'All crops together at typical yields (FAOSTAT averages), before any weather loss.') },
  ];
  const toggle = (id) => setOn((x) => (x.includes(id) ? (x.length > 2 ? x.filter((y) => y !== id) : x) : [...x, id]));
  return (
    <Card id="sg-compare" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[19px] font-bold text-ink">{T('ফসলচক্র পাশাপাশি: কী পাবেন, কী দেবেন', 'Rotations side by side: what you gain and give up')}</h2>
          <p className="mt-1 text-[14px] text-muted">{T('দুই থেকে চারটি বেছে নিন। প্রতিটি সারিতে তারকা মানে এখানে সবচেয়ে ভালো।', 'Pick two to four. A star marks the best on that row.')}</p>
        </div>
        <Tags list={['MODEL', 'RULE', 'RECORD']} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {rows.map((r) => (
          <button key={r.id} type="button" onClick={() => toggle(r.id)} aria-pressed={on.includes(r.id)}
            className={`rounded-full border px-3 py-1.5 text-left text-[13.5px] font-semibold ${on.includes(r.id) ? 'border-transparent text-white' : 'border-border bg-white text-ink'}`}
            style={on.includes(r.id) ? { background: STRAT_COLOR[r.id] } : undefined}>{r.name}</button>
        ))}
        {ctx.climF && <Segmented className="ml-auto" value={w} onChange={setWorld} options={[{ value: 'now', label: T('এখনকার আবহাওয়া', 'Today’s weather'), icon: Sprout }, { value: 'fut', label: T('২০৪০-এর দশক', 'The 2040s'), icon: Telescope }]} />}
      </div>
      <ul className="mt-3 space-y-1 text-[13px] text-muted">
        {shown.map((r) => <li key={r.id}><span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: STRAT_COLOR[r.id] }} /><b className="text-ink">{r.name}:</b> {rotLabel(r.rot, L)}{r.rot.residue === 'retain' ? T(' + খড় জমিতে', ' + straw kept') : ''}</li>)}
      </ul>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {metrics.map((m) => {
          const vals = shown.map((r) => m.v(r));
          const top = Math.max(1e-9, ...vals.map((v) => Math.abs(v)));
          return (
            <div key={m.k} className="rounded-2xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-[14.5px] font-bold text-ink"><m.icon size={16} className="text-primary-700" />{m.title} <span className="font-normal text-muted">({m.unit})</span></p>
              <div className="mt-2 space-y-1.5">
                {shown.map((r, i) => (
                  <div key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <div className="h-5 rounded-md bg-[#eef0ec]" title={r.name}>
                      <div className="h-5 rounded-md" style={{ width: `${Math.max(3, (Math.abs(vals[i]) / top) * 100)}%`, background: STRAT_COLOR[r.id], opacity: m.signed && vals[i] < 0 ? 0.55 : 1 }} />
                    </div>
                    <span className="flex min-w-[70px] items-center justify-end gap-1 text-[13.5px] font-semibold tabular-nums text-ink">
                      {best[m.k] === r.id && <Star size={13} className="fill-[#c99a3a] text-[#c99a3a]" aria-label={T('সবচেয়ে ভালো', 'best')} />}
                      {m.signed && vals[i] > 0 ? '+' : m.signed && vals[i] < 0 ? '−' : ''}{n(Math.abs(vals[i]), m.dp ?? (m.signed ? 1 : 0))}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] leading-5 text-muted">{m.help}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-muted">{T('পুরো দশ বছরের হিসাব, কারণ, প্রমাণ আর ঝুঁকি দেখুন ', 'For the full ten-year runs, with why, evidence and risks, see ')}<Link to="/farmer/future" className="font-semibold text-primary-700 hover:underline">{T('জমির ভবিষ্যৎ', 'Field future')}</Link>.</p>
    </Card>
  );
}

// ── risk and uncertainty ──
function Uncertainty({ rows, crop, dT, setDT, rainPct, setRainPct, n }) {
  const { T, L } = useStore();
  const hi = Math.max(...rows.map((r) => r.max ?? 0), 1);
  const lo = Math.min(...rows.map((r) => r.min ?? hi));
  const span = Math.max(1, hi - lo), x = (v) => `${((v - lo) / span) * 100}%`;
  const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '');
  return (
    <Card id="sg-risk" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[19px] font-bold text-ink">{T(`ঝুঁকি ও অনিশ্চয়তা: ${L(crop.name)}`, `Risk and uncertainty: ${L(crop.name)}`)}</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-muted">{T('একই ফসল, একই বোনার দিন, সাম্প্রতিক ১৩টি মৌসুমের আসল আবহাওয়া। দাগটা দেখায় দশ বছরের নয় বছরে সেচ কত লাগে; বিন্দুটি সাধারণ বছর।',
            'The same crop and sowing day, replayed over the real weather of the last 13 seasons. Each bar shows the irrigation needed in nine years of ten; the dot is a typical year.')}</p>
        </div>
        <Tags list={['MODEL', 'RULE']} />
      </div>
      <div className="mt-4 grid gap-4 rounded-2xl bg-[#f6f7f3] p-3.5 sm:grid-cols-2">
        <label className="block text-[14px] font-semibold text-ink">
          <span className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5"><Thermometer size={15} />{T('তাপমাত্রা', 'Temperature')}</span><span className="tabular-nums">{sign(dT)}{n(Math.abs(dT), 1)}°C</span></span>
          <input type="range" min="0" max="3" step="0.5" value={dT} onChange={(e) => setDT(Number(e.target.value))} className="mt-2 w-full accent-[#b42318]" aria-label={T('তাপমাত্রা কত বাড়বে', 'Degrees warmer')} />
        </label>
        <label className="block text-[14px] font-semibold text-ink">
          <span className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5"><CloudRain size={15} />{T('বৃষ্টি', 'Rain')}</span><span className="tabular-nums">{sign(rainPct)}{n(Math.abs(rainPct))}%</span></span>
          <input type="range" min="-40" max="40" step="10" value={rainPct} onChange={(e) => setRainPct(Number(e.target.value))} className="mt-2 w-full accent-[#2f8a8f]" aria-label={T('বৃষ্টি কত বদলাবে', 'Change in rain')} />
        </label>
      </div>
      <div className="mt-4 space-y-3" role="table" aria-label={T('পরিস্থিতি অনুযায়ী সেচ আর নিরাপদ মৌসুম', 'Irrigation and safe seasons by scenario')}>
        {rows.map((r) => (
          <div key={r.key} role="row" className={`grid gap-1.5 rounded-xl p-2 sm:grid-cols-[200px_1fr_110px] sm:items-center ${r.key === 'custom' ? 'bg-[#fbf3e3]' : ''}`}>
            <span role="cell" className="text-[14px] font-semibold text-ink">{L(r)}</span>
            <div role="cell" className="relative h-6 rounded-md bg-[#eef0ec]">
              {r.p10 != null && <>
                <div className="absolute top-1.5 h-3 rounded-full bg-[#2f8a8f]/45" style={{ left: x(r.p10), width: `calc(${x(r.p90)} - ${x(r.p10)})` }} />
                <div className="absolute top-0.5 size-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#1f5f63] shadow" style={{ left: x(r.p50) }} title={`${n(r.p50)} mm`} />
              </>}
            </div>
            <span role="cell" className="text-[13px] tabular-nums text-muted sm:text-right">
              <b className="text-ink">{n(r.p50)} {T('মিমি', 'mm')}</b> · {T(`${n(r.safe)}/${n(r.of)} নিরাপদ`, `${r.safe}/${r.of} safe`)}
            </span>
          </div>
        ))}
        <div className="flex justify-between pl-0 text-[12px] text-muted sm:pl-[208px] sm:pr-[118px]"><span>{n(lo)} {T('মিমি', 'mm')}</span><span>{n(hi)} {T('মিমি', 'mm')}</span></div>
      </div>
      <Note className="mt-3" tone="gold">{T('"নিরাপদ" মানে ফসলের আবহাওয়ার নিয়মগুলো (গরম, ঠান্ডা, অসময়ের বৃষ্টি) সেই মৌসুমে ভাঙেনি। মডেল আবহাওয়ার গড় বদলায়, ঝড়ের ধরন নয়; তাই এটা দিকনির্দেশ, নিশ্চয়তা নয়।',
        '"Safe" means none of the crop’s weather rules (heat, cold, untimely rain) broke that season. The sliders shift the average weather, not the pattern of storms, so read this as a direction, not a promise.')}</Note>
    </Card>
  );
}

// ── maps ──
function MapSection({ highlight, upazilaId }) {
  const { T } = useStore();
  const [view, setView] = useState('fields');
  return (
    <section id="sg-map" className="mt-5 scroll-mt-40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-[19px] font-bold text-ink"><MapIcon size={19} className="text-primary-700" />{T('মানচিত্রে দেখুন', 'See it on the map')}</h2>
        <Segmented value={view} onChange={setView} options={[
          { value: 'fields', label: T('জমির ঝুঁকি', 'Field risks'), icon: SlidersHorizontal },
          { value: 'trends', label: T('সময়ের সাথে বদল', 'Change over time'), icon: Telescope },
        ]} />
      </div>
      <p className="mt-1 text-[14px] text-muted">{view === 'fields'
        ? T('আপনার উপজেলার নথিভুক্ত জমি, বাছাই করা ঝুঁকিতে রং করা (SRTM উচ্চতা, MODIS সবুজ, NASA POWER আবহাওয়া)। সাদা দাগ আপনার জমি।', 'Registered fields of your upazila, coloured by the risk you pick (SRTM elevation, MODIS green cover, NASA POWER weather). The white ring is your field.')
        : T('GRACE পানির মজুদ, MODIS রবির সবুজ আর SMAP মাটির পানি, বছর ধরে সাতটি উপজেলায়। চালিয়ে দেখুন।', 'GRACE water storage, MODIS Rabi greenness and SMAP soil water, year by year across the seven upazilas. Press play.')}</p>
      <div className="mt-3">
        <LazyMount height={460}>
          {view === 'fields' ? <FieldRiskMap upazilaId={upazilaId} highlight={highlight} /> : <Card className="p-4 sm:p-5"><TrendMap /></Card>}
        </LazyMount>
      </div>
    </section>
  );
}
