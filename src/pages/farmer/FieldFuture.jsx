// Field Future: this field over the next ten years under its usual rotation, the best rotation found for it, and the
// farmer's own, in today's weather and in NASA's projections for the 2040s. Engine: engine/soilfuture.js.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts';
import { Play, Pause, RotateCcw, Telescope, Leaf, Droplets, Coins, Bug, Thermometer, CloudRain, Recycle, CheckCircle2, Sprout, FlaskConical, Wand2, Flame, Scale, ShieldCheck, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, PageHeader, Segmented, Note, Badge, Tags, ScoreRing, Button } from '../../components/ui';
import { SectionNav } from '../../components/SectionNav';
import SoilColumn, { SoilLegend } from '../../components/charts/SoilColumn';
import CropPhoto from '../../components/CropPhoto';
import deltas from '../../data/cmip6_deltas.json';
import soilWetness from '../../data/soil_wetness.json';
import { rabiWetness } from '../../engine/soilwater';
import { bnOf } from '../../engine/text';
import SatWater from '../../components/charts/SatWater';
import { num, bnDigits } from '../../engine/dates';
import { scrollToEl } from '../../components/Motion';
import {
  climateChange, fieldContext, fieldFuture, cropOf, omPctOf, co2PerBigha, ureaSavedKgPerBigha, WATER_M3_PER_MM_BIGHA,
  RABI_OPTS, K1_OPTS, RESIDUE, YEARS, FIRST_YEAR, YIELDS, ICBM, CH4, climateLedger, modelTest,
} from '../../engine/soilfuture';
import { BIGHA_HA } from '../../engine/crops';

const GREEN = '#2f6e2f', GOLD = '#b8761b', SLATE = '#6b7a72', TEAL = '#2f8a8f', MUTED = '#5d6a63', GRID = '#eef0ec';
const tick = { fontSize: 11, fill: MUTED };
const SEASON_NAMES = [{ bn: 'রবি', en: 'Rabi' }, { bn: 'খরিফ-১', en: 'Kharif-1' }, { bn: 'আমন', en: 'Aman' }];
const SCEN = { ssp245: { bn: 'মাঝারি পথ (SSP2-4.5)', en: 'Middle road (SSP2-4.5)' }, ssp585: { bn: 'বেশি নিঃসরণ (SSP5-8.5)', en: 'High emissions (SSP5-8.5)' } };
// Rounded first, so a tiny change reads 0, not −0.
const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };
const keyOf = (rot) => `${rot.residue}|${rot.cycle.map((y) => `${y.rabi}-${y.k1}`).join('|')}`;

function useRotName() {
  const { L, T } = useStore();
  return (rot, { short = false } = {}) => {
    const years = rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].map((id) => L(cropOf(id).name)).join(' → '));
    const body = years.length > 1 ? years.map((x, i) => `${T(i ? 'পরের বছর' : 'এক বছর', i ? 'Next year' : 'One year')}: ${x}`).join(short ? ' | ' : '\n') : years[0];
    return rot.residue === 'retain' ? `${body}${short ? '' : '\n'}${T(' + খড় জমিতে', ' + straw kept')}` : body;
  };
}

export default function FieldFuture() {
  const { s, T, L, farmer, soil, clim, econ, chosen, rotation, upazila } = useStore();
  const lang = s.lang;
  const rotName = useRotName();
  const [world, setWorld] = useState('now');
  const [scen, setScen] = useState('ssp245');
  const [own, setOwn] = useState(null);
  const change = useMemo(() => climateChange(deltas, upazila.id, scen), [upazila.id, scen]);
  const ctx = useMemo(() => fieldContext({ clim, change, soil, plot: farmer, amanT: rotation.amanMeasured ? rotation.amanT : null, econ }),
    [clim, change, soil, farmer, rotation.amanMeasured, rotation.amanT, econ]);
  const planRabi = chosen.crop.id, planK1 = rotation.best?.crop.id ?? 'fallow';
  const ff = useMemo(() => fieldFuture({ ctx, lastCrop: farmer.last_crop, plan: { rabi: planRabi, k1: planK1 }, priorities: s.priorities }),
    [ctx, farmer.last_crop, planRabi, planK1, s.priorities]);
  const ownRot = own ?? ff.plan?.rot ?? ff.best.rot;
  const ownE = useMemo(() => ff.evaluateOwn(ownRot), [ff, ownRot]);
  const w = world === 'fut' && ctx.climF ? 'fut' : 'now';
  const rowsOf = (e) => (w === 'fut' ? e.fut : e.now);
  const sumOf = (e) => (w === 'fut' ? e.sFut : e.sNow);
  const cols = [
    { id: 'habit', e: ff.habit, tone: SLATE, title: T('এখনকার মতো', 'As now') },
    { id: 'best', e: ff.best, tone: GREEN, title: T('সেরা ফসলচক্র', 'Best rotation') },
    { id: 'own', e: ownE, tone: GOLD, title: T('আপনার বানানো', 'Your own') },
  ];
  const base = useMemo(() => ({ clim, soil, plot: farmer, amanT: rotation.amanMeasured ? rotation.amanT : null, econ }), [clim, soil, farmer, rotation.amanMeasured, rotation.amanT, econ]);
  const builder = useRef(null);
  const editFrom = (rot) => { setOwn({ cycle: rot.cycle.map((y) => ({ ...y })), residue: rot.residue }); scrollToEl(builder.current); };

  return (
    <div>
      <PageHeader eyebrow={T(`${farmer.villageBn}, ${L(upazila.name)} · ${num(farmer.area_dec, 'bn')} শতক`, `${farmer.village}, ${upazila.name.en} · ${farmer.area_dec} decimal`)}
        title={T('জমির ভবিষ্যৎ: ১০ বছরের ফসলচক্র', 'Field future: ten years of rotation')}
        subtitle={T(`আপনার জমির নিজের মাটি, এলাকার নাসা আবহাওয়া আর নাসার জলবায়ু মডেল দিয়ে ${num(ff.count, 'bn')}টি ফসলচক্র দশ বছর করে চালিয়ে দেখা হয়েছে: মাটির জৈব পদার্থ, সেচের পানি, আয়, আবহাওয়ার ঝুঁকি আর রোগ-পোকা।`,
          `${ff.count} rotations run for ten years each on your field's own soil, your area's NASA weather and NASA's climate models: soil organic matter, irrigation water, income, weather risk and pests.`)}
        tags={['REAL', 'RULE']} />
      <SectionNav label={T('পাতার অংশ', 'Page sections')} sections={[
        { id: 'ff-time', label: T('মাটির টাইম মেশিন', 'Soil time machine') },
        { id: 'ff-best', label: T('সেরা ফসলচক্র', 'Best rotation') },
        { id: 'ff-compare', label: T('পাশাপাশি', 'Side by side') },
        { id: 'ff-ledger', label: T('জলবায়ু খাতা', 'Climate account') },
        { id: 'ff-water', label: T('মাটির পানি', 'Soil water') },
        { id: 'ff-build', label: T('নিজে বানান', 'Build your own') },
        { id: 'ff-all', label: T('সব ফসলচক্র', 'Every rotation') },
        { id: 'ff-climate', label: T('২০৪০-এর দশক', 'The 2040s') },
        { id: 'ff-robust', label: T('৮ মডেলের পরীক্ষা', 'Eight-model test') },
        { id: 'ff-method', label: T('কীভাবে হিসাব', 'How it works') },
      ]} />

      <div className="my-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white/95 p-2 shadow-[var(--shadow-card)] backdrop-blur">
        <Segmented value={w} onChange={setWorld} options={[
          { value: 'now', label: T('আজকের আবহাওয়া', 'Today’s weather'), icon: Sprout },
          { value: 'fut', label: T('২০৪০-এর দশক', 'The 2040s'), icon: Telescope },
        ]} />
        {w === 'fut' && <Segmented value={scen} onChange={setScen} options={Object.entries(SCEN).map(([k, v]) => ({ value: k, label: L(v) }))} />}
        {!ctx.climF && <span className="text-[13px] text-muted">{T('এই এলাকার জলবায়ু মডেলের তথ্য নেই', 'No climate projections for this area')}</span>}
      </div>

      <TimeMachine cols={cols} rowsOf={rowsOf} sumOf={sumOf} ctx={ctx} w={w} />
      <BestCard ff={ff} sumOf={sumOf} rotName={rotName} onEdit={editFrom} w={w} />
      <Compare ff={ff} ownE={ownE} sumOf={sumOf} ctx={ctx} rotName={rotName} />
      <Ledger ff={ff} ownE={ownE} ctx={ctx} w={w} rotName={rotName} />
      <SoilWater ff={ff} sumOf={sumOf} />
      <div ref={builder}><Builder ctx={ctx} rot={ownRot} setRot={setOwn} e={ownE} sumOf={sumOf} best={ff.best} /></div>
      <Charts ff={ff} ownE={ownE} rowsOf={rowsOf} sumOf={sumOf} ctx={ctx} rotName={rotName} w={w} />
      <Climate change={change} ctx={ctx} ff={ff} ownE={ownE} scen={scen} />
      {change && <Robust ff={ff} ownE={ownE} base={base} scen={scen} rotName={rotName} onEdit={editFrom} />}
      <Method ctx={ctx} ff={ff} />
    </div>
  );
}

// ───────── the three soil columns, season by season ─────────
function TimeMachine({ cols, rowsOf, sumOf, ctx, w }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const N = YEARS * 3;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(() => typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setT((x) => { if (x >= N - 1) { setPlaying(false); return x; } return x + 1; }), 1300);
    return () => clearInterval(id);
  }, [playing, N]);
  const year = Math.floor(t / 3), season = t % 3;
  return (
    <Card id="ff-time" className="scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-bold">{T('মাটির টাইম মেশিন', 'Soil time machine')}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('একই জমি, তিন রকম চাষ। উপরে সেই মৌসুমের ফসল, নিচে আপনার জমির ০–৩০ সেমি মাটির কাটা অংশ: স্তর, শিকড়, কেঁচো আর জৈব পদার্থ, সবই হিসাব আর জমির SoilGrids তথ্য থেকে আঁকা।', 'One field, three ways of farming it. On top, that season’s crop; below, a cut through your field’s top 30 cm: its layers, roots, earthworms and organic matter, all drawn from the model and the field’s SoilGrids profile.')}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => { if (t >= N - 1) setT(0); setPlaying(!playing); }} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-700 text-white shadow hover:bg-primary-800" aria-label={playing ? T('থামান', 'Pause') : T('চালান', 'Play')}>
          {playing ? <Pause size={19} /> : <Play size={19} className="translate-x-[1px]" />}
        </button>
        <button type="button" onClick={() => { setT(0); setPlaying(false); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-white hover:bg-primary-50" aria-label={T('শুরুতে', 'Back to the start')}><RotateCcw size={16} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[22px] font-bold tabular">{lang === 'bn' ? bnDigits(FIRST_YEAR + year) : FIRST_YEAR + year}</span>
            <span className="text-[14px] font-semibold text-primary-800">{L(SEASON_NAMES[season])} {T('মৌসুম', 'season')} · {T(`${num(year + 1, 'bn')} নম্বর বছর`, `year ${year + 1}`)}</span>
          </div>
          <input type="range" min="0" max={N - 1} value={t} onChange={(e) => { setT(Number(e.target.value)); setPlaying(false); }} className="w-full accent-primary-700" aria-label={T('বছর আর মৌসুম', 'Year and season')} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
        {cols.map((c) => {
          const rows = rowsOf(c.e), sm = sumOf(c.e);
          return (
            <div key={c.id} className="min-w-0">
              <SoilColumn row={rows[year]} season={season} soc0={ctx.soc0} soil={ctx.soil} health={sm.health.score} title={c.title} tone={c.tone} residue={c.e.rot?.residue} />
              <div className="mt-2 flex items-center gap-2">
                <ScoreRing value={sm.health.score} size={42} color={c.tone} />
                <div className="min-w-0 text-[12px] leading-[1.35] text-muted">
                  <div className="font-semibold text-ink">{T('মাটির স্বাস্থ্য', 'Soil health')}</div>
                  <div>{T('১০ বছরে কার্বন', 'Carbon, 10 yrs')} <b className={sm.dSoc >= 0 ? 'text-primary-700' : 'text-red-700'}>{signed(sm.dSoc, lang)}%</b></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <SoilLegend />
      {w === 'fut' && <Note tone="gold" className="mt-3">{T(`২০৪০-এর দশকের গরমে মাটির জৈব পদার্থ প্রায় ${num((ctx.temp.fut - 1) * 100, 'bn')}% দ্রুত পচে যায়, তাই একই চাষেও মাটি দুর্বল হয়। যে ফসলচক্র শিকড় আর খড় বেশি ফেরত দেয়, সেটাই এই ক্ষতি সামলায়।`, `In the warmer 2040s organic matter breaks down about ${num((ctx.temp.fut - 1) * 100, 'en')}% faster, so even the same farming wears the soil. Rotations that put more roots and straw back are the ones that hold up.`)}</Note>}
    </Card>
  );
}

// ───────── the best rotation for this field, and why ─────────
function BestCard({ ff, sumOf, rotName, onEdit, w }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const b = sumOf(ff.best), h = sumOf(ff.habit);
  const crops = [...new Set(ff.best.rot.cycle.flatMap((y) => [y.rabi, y.k1]).filter((id) => id !== 'fallow'))];
  const dWater = (h.waterMm - b.waterMm) * WATER_M3_PER_MM_BIGHA, dMoney = b.money - h.money;
  const why = [
    dWater > 20 && { icon: Droplets, text: T(`বিঘায় বছরে প্রায় ${num(dWater, 'bn')} ঘনমিটার কম সেচ; দশ বছরে ${num(dWater * 10, 'bn')} ঘনমিটার পানি মাটির নিচে থেকে যায়`, `About ${num(dWater, 'en')} m³ less irrigation a bigha each year; ${num(dWater * 10, 'en')} m³ left underground over ten years`) },
    { icon: Leaf, text: b.dSoc >= h.dSoc
      ? T(`দশ বছরে মাটির কার্বন ${signed(b.dSoc, 'bn')}% (এখনকার চাষে ${signed(h.dSoc, 'bn')}%)`, `Soil carbon ${signed(b.dSoc, 'en')}% over ten years (${signed(h.dSoc, 'en')}% farming as now)`)
      : T(`মাটির কার্বন ${signed(b.dSoc, 'bn')}%, এখনকার চাষের (${signed(h.dSoc, 'bn')}%) চেয়ে কম; ধানের জমিতে পানি থাকলে জৈব পদার্থ ধীরে পচে`, `Soil carbon ${signed(b.dSoc, 'en')}%, below farming as now (${signed(h.dSoc, 'en')}%); flooded paddy slows the breakdown`) },
    Math.abs(dMoney) > 100 && { icon: Coins, text: dMoney > 0 ? T(`বিঘায় বছরে প্রায় ৳${num(dMoney, 'bn')} বেশি লাভ`, `About ৳${num(dMoney, 'en')} more profit a bigha each year`) : T(`বিঘায় বছরে প্রায় ৳${num(-dMoney, 'bn')} কম লাভ; বদলে মাটি আর পানি বাঁচে`, `About ৳${num(-dMoney, 'en')} less profit a bigha each year, in exchange for soil and water`) },
    b.pest < h.pest - 5 && { icon: Bug, text: T('একই গোত্রের ফসল পরপর কম, তাই রোগ-পোকার চক্র ভাঙে', 'Fewer crops of one family in a row, so pest and disease cycles break') },
    b.nFix > 0 && { icon: Sprout, text: T(`ডাল ফসলের শিকড় নাইট্রোজেন রেখে যায়: বিঘায় বছরে প্রায় ${num(ureaSavedKgPerBigha(b.nFix), 'bn', { dp: 1 })} কেজি ইউরিয়া কম লাগে`, `The legume leaves nitrogen behind: about ${num(ureaSavedKgPerBigha(b.nFix), 'en', { dp: 1 })} kg less urea a bigha a year`) },
    ff.best.rot.residue === 'retain' && { icon: Recycle, text: T('খড়-নাড়া পুড়িয়ে বা তুলে না নিয়ে চাষ দিয়ে মাটিতে মিশিয়ে দিন; এটাই মাটির কার্বনের বড় উৎস', 'Plough straw and stubble back in instead of taking or burning it; it is the soil’s main source of carbon') },
    b.risk < h.risk - 0.05 && { icon: Thermometer, text: T(`আবহাওয়ায় ফসল নষ্টের ঝুঁকি ${num(h.risk * 100, 'bn')}% থেকে ${num(b.risk * 100, 'bn')}%`, `Weather risk down from ${num(h.risk * 100, 'en')}% to ${num(b.risk * 100, 'en')}% of seasons`) },
  ].filter(Boolean);
  return (
    <Card id="ff-best" className="mt-5 scroll-mt-40 overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
        <div className="p-5">
          <div className="flex items-center gap-2"><Badge tone="dark"><CheckCircle2 size={13} />{T('আপনার জমির জন্য সেরা', 'Best for your field')}</Badge>
            <span className="text-[12.5px] text-muted">{T(`${num(ff.count, 'bn')}টির মধ্যে`, `of ${ff.count}`)}</span></div>
          <div className="mt-3 space-y-2">
            {ff.best.rot.cycle.map((y, i) => (
              <div key={i} className="rounded-xl bg-primary-50/70 px-3 py-2 ring-1 ring-primary-100">
                <div className="text-[12px] font-semibold text-primary-700">{ff.best.rot.cycle.length > 1 ? T(i ? 'পরের বছর' : 'এক বছর', i ? 'The next year' : 'One year') : T('প্রতি বছর', 'Every year')}</div>
                <div className="flex flex-wrap items-center gap-1.5 text-[16px] font-bold">
                  {[y.rabi, y.k1, 'aman'].map((id, k) => <span key={k} className="flex items-center gap-1.5">{k > 0 && <span className="text-muted">→</span>}<span className={id === 'fallow' ? 'text-muted' : ''}>{L(cropOf(id).name)}</span></span>)}
                </div>
              </div>
            ))}
            {ff.best.rot.residue === 'retain' && <div className="flex items-center gap-1.5 text-[14px] font-semibold text-primary-800"><Recycle size={15} />{L(RESIDUE.retain)}</div>}
          </div>
          <ul className="mt-4 space-y-2">
            {why.map((x, i) => <li key={i} className="flex gap-2 text-[14.5px] leading-6"><x.icon size={17} className="mt-1 shrink-0 text-primary-700" /><span>{x.text}</span></li>)}
          </ul>
          {!ff.guard && <Note tone="gold" className="mt-3">{T('এই জমিতে কোনো ফসলচক্রই মাটির কার্বন ধরে রাখতে পারেনি; সবচেয়ে কম ক্ষতির পথটি দেখানো হলো।', 'No rotation held this field’s carbon; the least harmful is shown.')}</Note>}
          <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('সেরা মানে: মাটির কার্বন কমায় না এমন ফসলচক্রগুলোর মধ্যে, আপনার বেছে নেওয়া চাওয়া অনুযায়ী মাটি, পানি, আয়, ঝুঁকি আর রোগ-পোকার মিলিত নম্বর সবচেয়ে বেশি; আজকের আর ২০৪০-এর দশকের আবহাওয়ার গড়ে।', 'Best means: among rotations that do not run the soil’s carbon down, the highest combined mark for soil, water, income, risk and pests, weighted by your priorities, averaged over today’s and the 2040s’ weather.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onEdit(ff.best.rot)}><Wand2 size={16} />{T('এটা নিয়ে নিজে বদলে দেখুন', 'Start your own from this')}</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 bg-primary-950/5 p-1">
          {crops.slice(0, 4).map((id) => (
            <div key={id} className="relative min-h-[150px] overflow-hidden rounded-xl">
              <CropPhoto crop={cropOf(id)} width={500} sizes="240px" />
              <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-bold">{L(cropOf(id).name)}</span>
            </div>
          ))}
        </div>
      </div>
      {w === 'fut' && <div className="border-t border-border px-5 py-2.5 text-[13px] text-muted">{T('দেখানো সংখ্যাগুলো ২০৪০-এর দশকের আবহাওয়ায়।', 'Figures shown are for the 2040s’ weather.')}</div>}
    </Card>
  );
}

// ───────── side by side ─────────
function Compare({ ff, ownE, sumOf, ctx, rotName }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const list = [
    { id: 'habit', e: ff.habit, name: T('এখনকার মতো', 'As now'), tone: SLATE },
    ff.plan && keyOf(ff.plan.rot) !== keyOf(ff.habit.rot) && { id: 'plan', e: ff.plan, name: T('এবারের পরিকল্পনা প্রতি বছর', 'This season’s plan, every year'), tone: TEAL },
    { id: 'best', e: ff.best, name: T('সেরা ফসলচক্র', 'Best rotation'), tone: GREEN },
    { id: 'own', e: ownE, name: T('আপনার বানানো', 'Your own'), tone: GOLD },
  ].filter(Boolean);
  const pestWord = (p) => (p < 25 ? T('কম', 'Low') : p < 60 ? T('মাঝারি', 'Medium') : T('বেশি', 'High'));
  const rows = [
    { icon: Leaf, k: T('মাটির স্বাস্থ্য (১০০-এ)', 'Soil health (of 100)'), f: (x) => num(x.health.score, lang), better: (x) => x.health.score },
    { icon: Leaf, k: T('জৈব পদার্থ, ১০ বছর পরে', 'Organic matter after 10 years'), f: (x) => `${num(omPctOf(x.socEnd, ctx.soil), lang, { dp: 2 })}% (${signed(x.dSoc, lang)}%)`, better: (x) => x.dSoc },
    { icon: Recycle, k: T('মাটিতে জমা CO₂, বিঘায়', 'CO₂ stored, per bigha'), f: (x) => `${signed(co2PerBigha(x.socEnd - ctx.soc0), lang, 2)} ${T('টন', 't')}`, better: (x) => x.socEnd },
    { icon: Droplets, k: T('সেচের পানি, বিঘায় বছরে', 'Irrigation, per bigha a year'), f: (x) => `${num(x.waterMm * WATER_M3_PER_MM_BIGHA, lang)} ${T('ঘনমিটার', 'm³')}`, better: (x) => -x.waterMm },
    { icon: Coins, k: T('লাভ, বিঘায় বছরে*', 'Profit, per bigha a year*'), f: (x) => `৳${num(x.money, lang)}`, better: (x) => x.money },
    { icon: Thermometer, k: T('আবহাওয়ায় খারাপ মৌসুম', 'Seasons the weather fails'), f: (x) => `${num(x.risk * 100, lang)}%`, better: (x) => -x.risk },
    { icon: Bug, k: T('রোগ-পোকার চাপ', 'Pest and disease pressure'), f: (x) => pestWord(x.pest), better: (x) => -x.pest },
    { icon: Sprout, k: T('ইউরিয়া কম লাগে, বিঘায় বছরে', 'Urea saved, per bigha a year'), f: (x) => `${num(ureaSavedKgPerBigha(x.nFix), lang, { dp: 1 })} ${T('কেজি', 'kg')}`, better: (x) => x.nFix },
  ];
  const unpriced = [...new Set(list.flatMap((c) => sumOf(c.e).unpriced))];
  return (
    <Card id="ff-compare" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <h2 className="text-[20px] font-bold">{T('পাশাপাশি, দশ বছরের গড়ে', 'Side by side, ten-year averages')}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-[14px]">
          <thead>
            <tr className="text-left">
              <th className="py-2 pr-2 font-semibold text-muted" />
              {list.map((c) => <th key={c.id} className="px-2 py-2 align-bottom"><div className="font-bold" style={{ color: c.tone }}>{c.name}</div><div className="mt-0.5 whitespace-pre-line text-[11.5px] font-normal leading-4 text-muted">{rotName(c.e.rot)}</div></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const vals = list.map((c) => r.better(sumOf(c.e)));
              const top = Math.max(...vals);
              return (
                <tr key={r.k} className="border-t border-border">
                  <td className="py-2 pr-2"><span className="flex items-center gap-1.5 font-semibold"><r.icon size={15} className="shrink-0 text-primary-700" />{r.k}</span></td>
                  {list.map((c, i) => <td key={c.id} className={`px-2 py-2 tabular ${vals[i] === top && new Set(vals).size > 1 ? 'font-bold text-primary-800' : ''}`}>{r.f(sumOf(c.e))}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">
        {T('* লাভ: FAOSTAT ফলন × (দাম − পুরো খরচ), প্রকাশিত সূত্র থেকে। আমন সব পথে একই, তাই বাদ।', '* Profit: FAOSTAT yield × (price − full cost), from published sources. The Aman is the same on every path, so it is left out.')}
        {unpriced.length > 0 && T(` ${unpriced.map((id) => cropOf(id).name.bn).join(', ')}-এর নির্ভরযোগ্য দাম-খরচের সূত্র নেই, তাই এদের আয় ধরা হয়নি (শূন্য ধরা)।`, ` ${unpriced.map((id) => cropOf(id).name.en).join(', ')} have no reliable published price and cost, so their income is not counted (taken as zero).`)}
      </p>
    </Card>
  );
}

// ───────── the field's climate account: carbon into the soil against methane out of the paddy ─────────
function Ledger({ ff, ownE, ctx, w, rotName }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const [awd, setAwd] = useState(false);
  const list = [
    { id: 'habit', e: ff.habit, name: T('এখনকার মতো', 'As now'), tone: SLATE },
    ff.plan && keyOf(ff.plan.rot) !== keyOf(ff.habit.rot) && { id: 'plan', e: ff.plan, name: T('এবারের পরিকল্পনা প্রতি বছর', 'This season’s plan, every year'), tone: TEAL },
    { id: 'best', e: ff.best, name: T('সেরা ফসলচক্র', 'Best rotation'), tone: GREEN },
    { id: 'own', e: ownE, name: T('আপনার বানানো', 'Your own'), tone: GOLD },
  ].filter(Boolean).map((c) => ({ ...c, l: climateLedger(ctx, c.e.rot, w === 'fut' ? c.e.fut : c.e.now, { awd }) })).filter((c) => c.l);
  const bg = (x) => x * BIGHA_HA; // per hectare to per bigha
  const out = (l) => l.ch4Co2e + Math.max(0, -l.soilCo2), inn = (l) => Math.max(0, l.soilCo2);
  const max = Math.max(0.01, ...list.flatMap((c) => [out(c.l), inn(c.l)]));
  const anyBoro = list.some((c) => c.l.hasBoro);
  const habit = list.find((c) => c.id === 'habit'), best = list.find((c) => c.id === 'best');
  const cut = habit && best && habit.l.net > 0 ? (1 - best.l.net / habit.l.net) * 100 : null;
  const t2 = (x) => num(bg(x), lang, { dp: 2 });
  return (
    <Card id="ff-ledger" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><Scale size={20} className="text-primary-700" />{T('জমির জলবায়ু খাতা', 'The field’s climate account')}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('মাটিতে কার্বন জমলে বাতাস থেকে CO₂ কমে; কিন্তু পানিতে ডোবা ধানক্ষেত মিথেন ছাড়ে, যা CO₂-এর চেয়ে ২৭ গুণ বেশি গরম করে। দুটো এক খাতায় মিলিয়ে দেখা হলো কোন চাষে জমি আসলে জলবায়ুর পক্ষে।', 'Carbon going into the soil takes CO₂ out of the air; but a flooded paddy gives off methane, which warms 27 times as much as CO₂. Both go in one account here, to see which farming is really on the climate’s side.')}</p>
        </div>
        <Tags list={['RULE']} />
      </div>
      {anyBoro && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold">{T('বোরোর সেচ:', 'Boro irrigation:')}</span>
          <Segmented value={awd ? 'awd' : 'flood'} onChange={(v) => setAwd(v === 'awd')} options={[
            { value: 'flood', label: T('একটানা পানি', 'Kept flooded') },
            { value: 'awd', label: T('AWD: ভেজানো-শুকানো', 'AWD: wet and dry') },
          ]} />
        </div>
      )}
      <div className="mt-4 space-y-3">
        {list.map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-white p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="min-w-0"><span className="font-bold" style={{ color: c.tone }}>{c.name}</span><span className="ml-2 text-[12px] text-muted">{rotName(c.e.rot, { short: true })}</span></div>
              <div className="text-[14px] font-bold tabular">{T('নিট', 'Net')} <span className={c.l.net > 0 ? 'text-red-700' : 'text-primary-800'}>{signed(bg(c.l.net), lang, 2)}</span> <span className="text-[12px] font-normal text-muted">{T('টন CO₂e, বিঘায় বছরে', 't CO₂e per bigha a year')}</span></div>
            </div>
            {/* Diverging bar: what the soil takes in to the left, what goes out (methane, and soil carbon lost) to the right. */}
            <div className="mt-2 grid grid-cols-2 gap-0.5" aria-hidden="true">
              <div className="flex justify-end"><div className="h-3.5 rounded-l-md bg-primary-600" style={{ width: `${(inn(c.l) / max) * 100}%` }} /></div>
              <div className="flex">
                <div className="h-3.5 bg-[#c4512f]" style={{ width: `${(c.l.ch4Co2e / max) * 100}%`, borderRadius: c.l.soilCo2 < 0 ? 0 : '0 6px 6px 0' }} />
                {c.l.soilCo2 < 0 && <div className="h-3.5 rounded-r-md bg-[#8a6a45]" style={{ width: `${(-c.l.soilCo2 / max) * 100}%` }} />}
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-[12.5px] text-ink/80">
              <span>{c.l.soilCo2 >= 0 ? T(`মাটিতে জমা: ${t2(c.l.soilCo2)} টন CO₂`, `Into the soil: ${t2(c.l.soilCo2)} t CO₂`) : T(`মাটি থেকে হারায়: ${t2(-c.l.soilCo2)} টন CO₂`, `Lost from the soil: ${t2(-c.l.soilCo2)} t CO₂`)}</span>
              <span>{T(`ধানক্ষেতের মিথেন: ${num(bg(c.l.ch4), lang, { dp: 1 })} কেজি = ${t2(c.l.ch4Co2e)} টন CO₂e`, `Paddy methane: ${num(bg(c.l.ch4), lang, { dp: 1 })} kg = ${t2(c.l.ch4Co2e)} t CO₂e`)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-primary-600" />{T('মাটিতে জমা কার্বন', 'Carbon into the soil')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#c4512f]" />{T('ধানক্ষেতের মিথেন', 'Paddy methane')}</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#8a6a45]" />{T('মাটি থেকে হারানো কার্বন', 'Carbon lost from the soil')}</span>
      </div>
      {cut != null && Math.abs(cut) >= 1 && <Note tone={cut > 0 ? 'ok' : 'gold'} className="mt-3">{cut > 0 ? T(`সেরা ফসলচক্রে জমির নিট গ্রিনহাউস গ্যাস এখনকার চাষের চেয়ে প্রায় ${num(cut, 'bn')}% কম।`, `The best rotation puts out about ${num(cut, 'en')}% less net greenhouse gas than farming as now.`) : T(`সেরা ফসলচক্রে জমির নিট গ্রিনহাউস গ্যাস এখনকার চাষের চেয়ে প্রায় ${num(-cut, 'bn')}% বেশি।`, `The best rotation puts out about ${num(-cut, 'en')}% more net greenhouse gas than farming as now.`)}{anyBoro && !awd && T(' বোরোতে AWD দিয়ে দেখুন: পানি আর মিথেন দুটোই কমে।', ' Try AWD on the Boro: it saves water and methane.')}</Note>}
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T(`মিথেন: আইপিসিসি ২০১৯-এর টিয়ার-১ পদ্ধতি, দক্ষিণ এশিয়ার দৈনিক হার ${num(CH4.ef, 'bn', { dp: 2 })} কেজি/হেক্টর; একটানা পানি ×১, AWD ×${num(CH4.sfw.awd, 'bn', { dp: 2 })}, বৃষ্টিনির্ভর আমন ×${num(CH4.sfw.rainfed, 'bn', { dp: 2 })}; আগের ফসলের রেখে দেওয়া খড় মিথেন বাড়ায়। মিথেনের উষ্ণায়ন ক্ষমতা ২৭ (আইপিসিসি এআর৬)। নাইট্রাস অক্সাইড ধরা হয়নি; আইপিসিসির নিজের হারেই অনিশ্চয়তা অনেক, তাই এটি তুলনার জন্য।`, `Methane: IPCC 2019 Tier 1, South Asia daily rate ${CH4.ef} kg/ha; kept flooded ×1, AWD ×${CH4.sfw.awd}, rainfed Aman ×${CH4.sfw.rainfed}; straw kept from the crop before adds methane. Methane’s warming power 27 (IPCC AR6). Nitrous oxide is not counted; the IPCC rates themselves are uncertain, so use this to compare.`)}</p>
    </Card>
  );
}

// ───────── the soil's own water through the Rabi, 2002–2025 (NASA POWER, MERRA-2) ─────────
function SoilWater({ ff, sumOf }) {
  const { s, T, L, upazila } = useStore();
  const lang = s.lang;
  const r = useMemo(() => rabiWetness(soilWetness, upazila.id), [upazila.id]);
  if (!r) return null;
  const pc = (x) => num(x * 100, lang);
  const data = r.series.map((x) => ({ season: x.season, root: Math.round(x.root * 1000) / 10, trend: r.trend ? Math.round(r.trend.line(x.season) * 1000) / 10 : null }));
  const word = { sure: T('নিশ্চিত (p < ০.০৫)', 'clear (p < 0.05)'), likely: T('সম্ভবত', 'likely'), unclear: T('পরিষ্কার নয়', 'not clear') }[r.trend?.sure ?? 'unclear'];
  const up = r.change > 0.005, down = r.change < -0.005;
  const habitW = sumOf(ff.habit).waterMm, bestW = sumOf(ff.best).waterMm;
  return (
    <Card id="ff-water" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><Droplets size={20} className="text-sky-700" />{T(`${bnOf(upazila.name.bn)} জমির পানি: ওপরের মাটি থেকে মাটির নিচে`, `${upazila.name.en}’s water: from the topsoil to underground`)}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('রবি ফসল বাঁচে বর্ষার পর মাটিতে থেকে যাওয়া পানি আর সেচে। নাসার হিসাবে প্রতি রবি মৌসুমে (নভেম্বর–মার্চ) ওপরের এক মিটার মাটি কতটা ভেজা ছিল: ০% একদম শুকনো, ১০০% পানিতে ভরা।', 'Rabi crops live on the water the monsoon leaves in the soil, and on irrigation. NASA’s record of how wet the top metre of soil was in each Rabi season (November–March): 0% bone dry, 100% saturated.')}</p>
        </div>
        <Tags list={['REAL']} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Big icon={Droplets} tone="text-sky-700" label={T(`আগে, ${bnDigits(r.first)}–২০১২`, `Before, ${r.first}–2012`)} value={`${pc(r.then)}%`} sub={T('রবি মৌসুমের গড় ভেজা ভাব', 'mean Rabi wetness')} />
        <Big icon={Droplets} tone="text-sky-700" label={T(`এখন, ২০১৩–${bnDigits(r.last)}`, `Now, 2013–${r.last}`)} value={`${pc(r.now)}%`} sub={T(`আগের চেয়ে ${signed(r.pct, 'bn')}%`, `${signed(r.pct, 'en')}% on before`)} />
        <Big icon={Thermometer} tone="text-clay-700" label={T('সবচেয়ে শুকনো রবি', 'Driest Rabi')} value={lang === 'bn' ? bnDigits(r.driest.season) : r.driest.season} sub={T(`${pc(r.driest.root)}% ভেজা`, `${pc(r.driest.root)}% wet`)} />
      </div>
      <div className="mt-4 h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="season" tick={tick} tickFormatter={(y) => (lang === 'bn' ? bnDigits(y) : y)} interval={3} />
            <YAxis tick={tick} allowDecimals={false} domain={[Math.floor((Math.min(...data.map((d) => d.root)) - 2) / 5) * 5, Math.ceil((Math.max(...data.map((d) => d.root)) + 2) / 5) * 5]} tickCount={5} tickFormatter={(v) => `${num(v, lang)}%`} />
            <Tooltip formatter={(v, n) => [`${num(v, lang, { dp: 1 })}%`, n === 'trend' ? T('ধারা', 'Trend') : T('রবির ভেজা ভাব', 'Rabi wetness')]} labelFormatter={(y) => T(`রবি ${bnDigits(y - 1)}–${bnDigits(String(y).slice(2))}`, `Rabi ${y - 1}–${String(y).slice(2)}`)} />
            <Line dataKey="root" stroke="#2f7fa8" strokeWidth={2} dot={{ r: 3, fill: '#2f7fa8', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            {r.trend && <Line dataKey="trend" stroke="#5d6a63" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Note tone={down ? 'gold' : 'info'} className="mt-3">
        {r.trend && T(`২৫ বছরের ধারা: দশকে ${signed(r.trend.perDecade * 100, 'bn')} শতাংশ-বিন্দু, ${word} (ম্যান-কেন্ডাল)। `, `25-year trend: ${signed(r.trend.perDecade * 100, 'en')} percentage points a decade, ${word} (Mann–Kendall). `)}
        {down ? T('শীতের মাটি আগের চেয়ে শুকনো হচ্ছে, তাই কম পানির ফসলচক্রের দাম আরও বেশি।', 'The winter soil is getting drier, so a low-water rotation is worth even more.')
          : up ? T('শীতের ওপরের মাটি আগের চেয়ে শুকনো হয়নি। পানির টান এখানে মাটির ওপরের স্তরে নয়, সেচের পানিতে: ', 'The winter topsoil has not got drier. The water squeeze here is not in the topsoil but in irrigation: ')
          : T('শীতের মাটির ভেজা ভাব প্রায় একই আছে। পানির টান মূলত সেচের পানিতে: ', 'Winter soil wetness has held about steady. The water squeeze is mainly in irrigation: ')}
        {!down && T(`এখনকার চাষে বিঘায় বছরে ${num(habitW * WATER_M3_PER_MM_BIGHA, 'bn')} ঘনমিটার, সেরা ফসলচক্রে ${num(bestW * WATER_M3_PER_MM_BIGHA, 'bn')} ঘনমিটার।`, `${num(habitW * WATER_M3_PER_MM_BIGHA, 'en')} m³ a bigha a year as now, ${num(bestW * WATER_M3_PER_MM_BIGHA, 'en')} m³ with the best rotation.`)}
      </Note>
      <SatWater id={upazila.id} />
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('আর্দ্রতার চার্ট: নাসা পাওয়ার মাসিক GWETROOT (নাসা জিএমএও MERRA-2, উপগ্রহ ও মাটির পর্যবেক্ষণ মেলানো মডেল), উপজেলার কেন্দ্রে, ওপরের এক মিটার মাটির। তার নিচের পানি GRACE-এর ঘরে।', 'Wetness chart: NASA POWER monthly GWETROOT (NASA GMAO MERRA-2, a model that assimilates satellite and ground observations), at the upazila centre, for the top metre of soil. The water under it is in the GRACE panel.')}</p>
    </Card>
  );
}

// ───────── robustness: every candidate under each climate model on its own ─────────
function Robust({ ff, ownE, base, scen, rotName, onEdit }) {
  const { s, T, upazila } = useStore();
  const lang = s.lang;
  const [res, setRes] = useState(null);
  const rots = useMemo(() => {
    const seen = new Map();
    for (const e of [ff.best, ...ff.top, ff.habit, ownE, ff.plan].filter(Boolean)) seen.set(keyOf(e.rot), e.rot);
    return [...seen.values()];
  }, [ff, ownE]);
  useEffect(() => {
    setRes(null);
    // About a quarter of a second of work: run it after the page has drawn.
    const id = setTimeout(() => setRes(modelTest({ base, deltas, upazilaId: upazila.id, scenario: scen, rots, habit: ff.habit.rot, cal: ff.cal, priorities: s.priorities, range: ff.range })), 60);
    return () => clearTimeout(id);
  }, [base, upazila.id, scen, rots, ff, s.priorities]);
  const tag = (rot) => {
    const k = keyOf(rot);
    return [k === keyOf(ff.best.rot) && [T('সেরা', 'Best'), GREEN], k === keyOf(ff.habit.rot) && [T('এখনকার মতো', 'As now'), SLATE], k === keyOf(ownE.rot) && [T('আপনার', 'Yours'), GOLD]].filter(Boolean);
  };
  const bestRow = res?.list.find((x) => keyOf(x.rot) === keyOf(ff.best.rot));
  const robustIsBest = !!res && keyOf(res.robust.rot) === keyOf(ff.best.rot);
  // Level with the most robust on keeping the soil and on risk: then both are safe, and the worst case decides.
  const level = !!res && !!bestRow && !robustIsBest && bestRow.keepsSoil >= res.robust.keepsSoil && bestRow.safer >= res.robust.safer;
  const rows = res ? res.list : [];
  const top = res?.robust;
  const of = (x, n) => T(`${num(x, 'bn')}/${num(n, 'bn')}`, `${x}/${n}`);
  return (
    <Card id="ff-robust" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><ShieldCheck size={20} className="text-primary-700" />{T('৮টি জলবায়ু মডেলে আলাদা পরীক্ষা', 'Tested under each of the eight climate models')}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('ওপরের ২০৪০-এর হিসাব মডেলগুলোর মাঝামাঝি পরিবর্তনে। কিন্তু কোন মডেল ঠিক হবে কেউ জানে না। তাই প্রতিটি ভালো ফসলচক্র প্রতিটি মডেলের ভবিষ্যতে আলাদা করে চালানো হলো: যেটা যেকোনো ভবিষ্যতে টেকে, সেটাই নিরাপদ বাছাই।', 'The 2040s above use the middle of the models’ change. No one knows which model will be right, so each good rotation is run again in each model’s future on its own: the one that holds up whatever happens is the safe choice.')}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>
      {!res ? (
        <div className="mt-4 flex items-center gap-2 text-[14px] text-muted"><Loader2 size={16} className="animate-spin" />{T('৮টি মডেলে চালানো হচ্ছে…', 'Running the eight models…')}</div>
      ) : <>
        <Note tone={robustIsBest || level ? 'ok' : 'gold'} className="mt-4">
          {level
            ? T(`সেরা ফসলচক্রও ${of(bestRow.keepsSoil, res.n)} মডেলে মাটির কার্বন ধরে রাখে, তাই এটি নিরাপদ বাছাই। নিচের প্রথমটিও তাই, আর সবচেয়ে খারাপ মডেলেও তাতে কার্বন একটু বেশি বাড়ে (${signed(res.robust.worstDSoc, 'bn')}% বনাম ${signed(bestRow.worstDSoc, 'bn')}%)।`, `The best rotation also keeps the soil carbon in ${of(bestRow.keepsSoil, res.n)} models, so it is a safe choice. So does the first one below, and it builds a little more carbon even under the worst model (${signed(res.robust.worstDSoc, 'en')}% against ${signed(bestRow.worstDSoc, 'en')}%).`)
            : robustIsBest
            ? T(`সেরা ফসলচক্রটিই সবচেয়ে টেকসই: ${of(bestRow.keepsSoil, res.n)} মডেলে মাটির কার্বন ধরে রাখে, ${of(bestRow.wins, res.n)} মডেলে সবার সেরা।`, `The best rotation is also the most robust: it keeps the soil carbon in ${of(bestRow.keepsSoil, res.n)} models and comes first in ${of(bestRow.wins, res.n)}.`)
            : T(`সেরা ফসলচক্র ${of(bestRow?.keepsSoil ?? 0, res.n)} মডেলে মাটির কার্বন ধরে রাখে আর ${of(bestRow?.safer ?? 0, res.n)} মডেলে ঝুঁকি বাড়ায় না। নিচের প্রথমটিতে ${of(res.robust.keepsSoil, res.n)} আর ${of(res.robust.safer, res.n)}: জলবায়ু যেদিকেই যাক, সেটি বেশি নিরাপদ বাছাই।`, `The best rotation keeps the soil carbon in ${of(bestRow?.keepsSoil ?? 0, res.n)} models and adds no risk in ${of(bestRow?.safer ?? 0, res.n)}. The first one below: ${of(res.robust.keepsSoil, res.n)} and ${of(res.robust.safer, res.n)}. Whichever way the climate goes, it is the safer choice.`)}
        </Note>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-2 pr-2 font-semibold">{T('ফসলচক্র', 'Rotation')}</th>
                <th className="px-2 py-2 font-semibold">{T('মাটির কার্বন টেকে', 'Soil carbon holds')}</th>
                <th className="px-2 py-2 font-semibold">{T('ঝুঁকি বাড়ে না', 'Risk no higher')}</th>
                <th className="px-2 py-2 font-semibold">{T('সবার সেরা', 'Comes first')}</th>
                <th className="px-2 py-2 font-semibold">{T('সবচেয়ে খারাপ মডেলে কার্বন', 'Carbon, worst model')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={keyOf(x.rot)} className={`border-t border-border ${x === top ? 'bg-primary-50/60' : ''}`}>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap items-center gap-1">{tag(x.rot).map(([l, c]) => <span key={l} className="rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: c }}>{l}</span>)}</div>
                    <div className="mt-0.5 max-w-[320px] text-[12.5px] leading-5">{rotName(x.rot, { short: true })}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex gap-0.5" aria-hidden="true">{Array.from({ length: x.n }, (_, j) => <i key={j} className={`h-2.5 w-2.5 rounded-full ${j < x.keepsSoil ? 'bg-primary-600' : 'bg-black/[.12]'}`} />)}</span>
                      <b className="tabular">{of(x.keepsSoil, x.n)}</b>
                    </div>
                  </td>
                  <td className="px-2 py-2 tabular">{of(x.safer, x.n)}</td>
                  <td className="px-2 py-2 tabular">{of(x.wins, x.n)}</td>
                  <td className={`px-2 py-2 tabular font-semibold ${x.worstDSoc >= 0 ? 'text-primary-800' : 'text-red-700'}`}>{signed(x.worstDSoc, lang)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!robustIsBest && <Button variant="ghost" className="mt-3" onClick={() => onEdit(res.robust.rot)}><Wand2 size={16} />{T('সবচেয়ে টেকসইটা নিজে বানানোয় খুলুন', 'Open the most robust one in Build your own')}</Button>}
        <p className="mt-2 text-[12.5px] leading-5 text-muted">{T(`প্রতিটি মডেলের নিজের মাসিক পরিবর্তন (নাসা NEX-GDDP-CMIP6, ২০৪১–২০৫০) আপনার এলাকার আসল দিনে বসিয়ে দশ বছর চালানো। "ঝুঁকি বাড়ে না": এখনকার চাষের চেয়ে খারাপ মৌসুম বেশি নয়। পদ্ধতি: রোবাস্ট ডিসিশন মেকিং (Lempert ও অন্যরা ২০০৬)।`, `Each model’s own monthly change (NASA NEX-GDDP-CMIP6, 2041–2050) laid on your area’s real days and run for ten years. “Risk no higher”: no more bad seasons than farming as now. Method: robust decision making (Lempert et al. 2006).`)}</p>
      </>}
    </Card>
  );
}

// ───────── build your own ─────────
function Builder({ ctx, rot, setRot, e, sumOf, best }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const sm = sumOf(e);
  const setYear = (i, patch) => {
    const cycle = rot.cycle.map((y, k) => (k === i ? { ...y, ...patch } : y));
    const y = cycle[i];
    if (patch.rabi && !ctx.k1[y.rabi][y.k1]?.fits) y.k1 = 'fallow';
    setRot({ ...rot, cycle });
  };
  const reasonText = (k) => (k.reason === 'window' ? T('বোনার সময় পেরিয়ে যায়', 'Past its sowing window') : k.reason === 'aman' ? T('আমনের আগে উঠবে না', 'Not off before the Aman') : '');
  const chip = (on, disabled, label, onClick, title) => (
    <button key={label} type="button" disabled={disabled} title={title} onClick={onClick}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-[13.5px] font-semibold transition ${on ? 'border-primary-700 bg-primary-700 text-white' : disabled ? 'cursor-not-allowed border-dashed border-border bg-transparent text-muted/60 line-through' : 'border-border bg-white hover:border-primary-300 hover:bg-primary-50'}`}>{label}</button>
  );
  return (
    <Card id="ff-build" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-bold">{T('নিজে ফসলচক্র বানান', 'Build your own rotation')}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('প্রতি মৌসুমের ফসল বেছে নিন; যা আপনার জমিতে সময়ে ধরে না, তা কাটা দেখাবে। সঙ্গে সঙ্গে দশ বছরের হিসাব বদলাবে।', 'Pick each season’s crop; what does not fit your field’s calendar is struck through. The ten-year figures update at once.')}</p>
        </div>
        <Segmented value={String(rot.cycle.length)} onChange={(v) => setRot({ ...rot, cycle: v === '2' ? [rot.cycle[0], { ...(rot.cycle[1] ?? rot.cycle[0]) }] : [rot.cycle[0]] })}
          options={[{ value: '1', label: T('প্রতি বছর একই', 'Same every year') }, { value: '2', label: T('দুই বছর পালা করে', 'Two-year cycle') }]} />
      </div>
      <div className="mt-4 space-y-4">
        {rot.cycle.map((y, i) => (
          <div key={i} className="rounded-2xl border border-border p-3">
            {rot.cycle.length > 1 && <div className="mb-2 text-[13px] font-bold text-primary-800">{T(i ? 'পরের বছর' : 'এক বছর', i ? 'Next year' : 'One year')}</div>}
            <div className="text-[12.5px] font-semibold text-muted">{T('রবি (কার্তিক–ফাল্গুন)', 'Rabi (Nov–Mar)')}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {RABI_OPTS.map((id) => chip(y.rabi === id, !!ctx.rabi[id].blocked, L(cropOf(id).name), () => setYear(i, { rabi: id }), ctx.rabi[id].blocked ? T('সেচ ছাড়া বোরো হয় না', 'No Boro without irrigation') : undefined))}
            </div>
            <div className="mt-2.5 text-[12.5px] font-semibold text-muted">{T('খরিফ-১ (চৈত্র–আষাঢ়), তারপর রোপা আমন', 'Kharif-1 (Mar–Jun), then T. Aman')}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {K1_OPTS.map((id) => { const k = ctx.k1[y.rabi][id]; return chip(y.k1 === id, !k.fits, L(cropOf(id).name), () => setYear(i, { k1: id }), k.fits ? undefined : reasonText(k)); })}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold">{T('খড়-নাড়া:', 'Straw:')}</span>
          <Segmented value={rot.residue} onChange={(v) => setRot({ ...rot, residue: v })} options={Object.entries(RESIDUE).map(([k, v]) => ({ value: k, label: L(v) }))} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Mini label={T('মাটির স্বাস্থ্য', 'Soil health')} value={num(sm.health.score, lang)} sub={T('১০০-এর মধ্যে', 'of 100')} />
        <Mini label={T('মাটির কার্বন', 'Soil carbon')} value={`${signed(sm.dSoc, lang)}%`} sub={T('১০ বছরে', 'in 10 years')} tone={sm.dSoc >= 0 ? 'text-primary-800' : 'text-red-700'} />
        <Mini label={T('সেচ', 'Irrigation')} value={`${num(sm.waterMm * WATER_M3_PER_MM_BIGHA, lang)}`} sub={T('ঘনমিটার/বিঘা/বছর', 'm³/bigha/yr')} />
        <Mini label={T('মোট নম্বর', 'Overall mark')} value={num(e.score, lang)} sub={keyOf(e.rot) === keyOf(best.rot) ? T('সেরার সমান!', 'Matches the best!') : T(`সেরা ${num(best.score, lang)}`, `best ${num(best.score, lang)}`)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(sm.health.parts).map(([k, v]) => (
          <div key={k} className="rounded-xl bg-black/[.03] px-3 py-2">
            <div className="text-[12px] font-semibold text-muted">{L(PRINCIPLES[k])}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.08]"><div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${Math.max(3, v)}%` }} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
const PRINCIPLES = {
  cover: { bn: 'সারা বছর জীবন্ত শিকড়', en: 'Living roots all year' },
  diversity: { bn: 'নানা রকম ফসল', en: 'Many kinds of crop' },
  disturbance: { bn: 'মাটি কম ঘাঁটা', en: 'Less disturbance' },
  carbon: { bn: 'জৈব পদার্থ বাড়ানো', en: 'Building organic matter' },
};
function Mini({ label, value, sub, tone = 'text-ink' }) {
  return <div className="rounded-xl border border-border bg-white px-3 py-2"><div className="text-[12px] font-semibold text-muted">{label}</div><div className={`font-display text-[20px] font-bold tabular ${tone}`}>{value}</div><div className="text-[11.5px] text-muted">{sub}</div></div>;
}

// ───────── charts: organic matter over ten years, and every rotation on money against soil ─────────
function Charts({ ff, ownE, rowsOf, sumOf, ctx, rotName, w }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const om0 = omPctOf(ctx.soc0, ctx.soil);
  const lines = [
    { k: 'habit', e: ff.habit, c: SLATE, name: T('এখনকার মতো', 'As now'), dash: '5 4' },
    { k: 'best', e: ff.best, c: GREEN, name: T('সেরা', 'Best') },
    { k: 'own', e: ownE, c: GOLD, name: T('আপনার', 'Yours') },
  ];
  const data = [{ year: FIRST_YEAR - 1, habit: om0, best: om0, own: om0 }, ...Array.from({ length: YEARS }, (_, i) => Object.fromEntries([['year', FIRST_YEAR + i], ...lines.map((l) => [l.k, omPctOf(rowsOf(l.e)[i].soc, ctx.soil)])]))];
  const vals = data.flatMap((d) => lines.map((l) => d[l.k]));
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max(0.02, (hi - lo) * 0.15);
  const pts = ff.all.map((e) => ({ x: Math.round(sumOf(e).money), y: Math.round(sumOf(e).dSoc * 10) / 10, name: rotName(e.rot, { short: true }) }));
  const mark = (e, c, label) => [{ x: Math.round(sumOf(e).money), y: Math.round(sumOf(e).dSoc * 10) / 10, name: rotName(e.rot, { short: true }), label, c }];
  const marks = [mark(ff.habit, SLATE, T('এখনকার মতো', 'As now')), mark(ff.best, GREEN, T('সেরা', 'Best')), mark(ownE, GOLD, T('আপনার', 'Yours')), mark(ff.richest, '#b3261e', T('সবচেয়ে বেশি লাভ', 'Most profit'))];
  const tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return <div className="max-w-[260px] rounded-xl border border-border bg-white px-3 py-2 text-[12.5px] shadow">{p.label && <div className="font-bold" style={{ color: p.c }}>{p.label}</div>}<div className="leading-5">{p.name}</div><div className="mt-1 text-muted">{T(`লাভ ৳${num(p.x, 'bn')}/বিঘা/বছর · কার্বন ${signed(p.y, 'bn')}%`, `Profit ৳${num(p.x, 'en')}/bigha/yr · carbon ${signed(p.y, 'en')}%`)}</div></div>;
  };
  return (
    <Card id="ff-all" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-[18px] font-bold">{T('মাটির জৈব পদার্থ, বছর ধরে', 'Soil organic matter, year by year')}</h2>
          <p className="text-[13px] leading-5 text-muted">{T('০–৩০ সেমি মাটিতে, শতাংশে। শুরু আপনার জমির SoilGrids মান।', 'Top 0–30 cm, per cent. Starts at your field’s SoilGrids value.')}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">{lines.map((l) => <span key={l.k} className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded" style={{ background: l.c }} />{l.name}</span>)}</div>
          <div className="mt-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="year" tick={tick} tickLine={false} tickFormatter={(v) => (lang === 'bn' ? bnDigits(v) : v)} />
                <YAxis domain={[lo - pad, hi + pad]} tick={tick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => num(v, lang, { dp: 2 })} />
                <ReferenceLine y={om0} stroke="#cfd6d1" strokeDasharray="3 3" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12.5, border: '1px solid #dfe7dc' }} labelFormatter={(v) => (lang === 'bn' ? bnDigits(v) : v)}
                  formatter={(v, n) => [`${num(v, lang, { dp: 3 })}%`, lines.find((l) => l.k === n)?.name ?? n]} />
                {lines.map((l) => <Line key={l.k} dataKey={l.k} stroke={l.c} strokeWidth={2.4} strokeDasharray={l.dash} dot={{ r: 2.5, strokeWidth: 0, fill: l.c }} activeDot={{ r: 5 }} animationDuration={1100} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2 className="text-[18px] font-bold">{T(`সব ${num(ff.count, 'bn')}টি ফসলচক্র: লাভ বনাম মাটি`, `All ${ff.count} rotations: profit against soil`)}</h2>
          <p className="text-[13px] leading-5 text-muted">{T('প্রতিটি বিন্দু একটি ফসলচক্র। দাগের ওপরে থাকলে মাটির কার্বন বাড়ে, ডানে গেলে লাভ বাড়ে। সেরাটা দাগের ওপরে থাকা দলের মধ্যে থেকে বাছা।', 'Each dot is a rotation. Above the line the soil gains carbon; further right, more profit. The best is chosen from those above the line.')}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">{marks.map(([m]) => <span key={m.label} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: m.c }} />{m.label}</span>)}</div>
          <div className="mt-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={GRID} />
                <XAxis type="number" dataKey="x" tick={tick} tickLine={false} tickFormatter={(v) => `৳${num(v, lang)}`} name="profit" />
                <YAxis type="number" dataKey="y" tick={tick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${num(v, lang)}%`} />
                <ZAxis range={[22, 22]} />
                <ReferenceLine y={0} stroke={MUTED} strokeDasharray="4 3" label={{ value: T('মাটি যেমন ছিল', 'Soil as it is'), position: 'insideTopLeft', fontSize: 11, fill: MUTED }} />
                <Tooltip content={tip} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={pts} fill="#9fb3a6" fillOpacity={0.45} isAnimationActive={false} />
                {marks.map((m) => <Scatter key={m[0].label} data={m} fill={m[0].c} shape={(p) => <circle cx={p.cx} cy={p.cy} r={7} fill={m[0].c} stroke="#fff" strokeWidth={2} />} />)}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {w === 'fut' && <p className="mt-2 text-[12.5px] text-muted">{T('২০৪০-এর দশকের আবহাওয়ায়।', 'In the 2040s’ weather.')}</p>}
    </Card>
  );
}

// ───────── NASA's 2040s for this upazila ─────────
function Climate({ change, ctx, ff, ownE, scen }) {
  const { s, T, L, upazila } = useStore();
  const lang = s.lang;
  if (!change) {
    return <Card id="ff-climate" className="mt-5 scroll-mt-40 p-5"><Note tone="gold">{T('এই এলাকার জন্য নাসার জলবায়ু মডেলের তথ্য এখনো নামানো হয়নি (npm run fetch:cmip6)।', 'NASA climate projections for this area are not loaded yet (npm run fetch:cmip6).')}</Note></Card>;
  }
  const crops = [...new Set([ff.habit, ff.best, ownE].flatMap((e) => e.rot.cycle.flatMap((y) => [y.rabi, y.k1])).filter((id) => id !== 'fallow'))];
  const slotOf = (id) => {
    if (ctx.rabi[id]) return ctx.rabi[id];
    for (const e of [ff.best, ownE, ff.habit]) for (const y of e.rot.cycle) if (y.k1 === id) return ctx.k1[y.rabi][id];
    return null;
  };
  const range = (r, f, unit) => `${f(r.med)}${unit} (${f(r.min)} ${T('থেকে', 'to')} ${f(r.max)})`;
  const sd = (x) => signed(x, lang);
  const maxT = Math.max(3, ...change.perModel.map((p) => p.dT));
  return (
    <Card id="ff-climate" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[20px] font-bold">{T(`নাসার জলবায়ু মডেলে ${L(upazila.name)}, ২০৪১–২০৫০`, `${upazila.name.en} in NASA’s climate models, 2041–2050`)}</h2>
          <p className="text-[14px] leading-6 text-muted">{T(`নাসা NEX-GDDP-CMIP6-এর ${num(change.n, 'bn')}টি মডেল, ${L(SCEN[scen])}; ২০০৫–২০১৪-এর তুলনায়। আপনার এলাকার আসল দিনগুলো এই পরিবর্তনে সরিয়ে আগামীর আবহাওয়া বানানো হয়েছে।`, `${change.n} models from NASA NEX-GDDP-CMIP6, ${SCEN[scen].en}; against 2005–2014. Your area’s real days are shifted by this change to make the coming weather.`)}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>
      {change.prov.nearestCell?.includes(upazila.id) && <Note tone="gold" className="mt-3">{T(`${L(upazila.name)}-এর নিজের ০.২৫° ঘরের তথ্য এখনো নামানো শেষ হয়নি, তাই কাছের ঘরের (${bnDigits(change.cell.join(', '))}) মডেল-পরিবর্তন দেখানো হচ্ছে। জলবায়ু পরিবর্তনের মাপ শত কিলোমিটারে বদলায়, তবু এটি জেনে রাখুন।`, `${upazila.name.en}'s own 0.25° cell has not finished downloading, so the models' change at the nearest cell (${change.cell.join(', ')}) is shown. Climate change varies over hundreds of kilometres, but note it.`)}</Note>}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Big icon={Thermometer} tone="text-clay-700" label={T('গড় তাপমাত্রা', 'Mean temperature')} value={`${sd(change.dT.med)}°C`} sub={T(`মডেলভেদে ${sd(change.dT.min)} থেকে ${sd(change.dT.max)}°`, `Models: ${sd(change.dT.min)} to ${sd(change.dT.max)}°`)} />
        <Big icon={CloudRain} tone="text-sky-700" label={T('বছরের বৃষ্টি', 'Yearly rain')} value={`${sd(change.rainPct.med)}%`} sub={T(`মডেলভেদে ${sd(change.rainPct.min)} থেকে ${sd(change.rainPct.max)}%`, `Models: ${sd(change.rainPct.min)} to ${sd(change.rainPct.max)}%`)} />
        <Big icon={Flame} tone="text-paddy-700" label={T('মাটির জৈব পদার্থ পচে', 'Organic matter breaks down')} value={`${sd((ctx.temp.fut - 1) * 100)}%`} sub={T('গরমে দ্রুত (র‍্যাটকোস্কি সূত্র)', 'faster in the heat (Ratkowsky form)')} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-[14px] font-bold">{T('মৌসুম ধরে', 'By season')}</div>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-muted"><th className="py-1.5 font-semibold" /><th className="py-1.5 font-semibold">{T('দিনের সর্বোচ্চ তাপ', 'Daytime high')}</th><th className="py-1.5 font-semibold">{T('বৃষ্টি', 'Rain')}</th></tr></thead>
            <tbody>
              {[['rabi', 0], ['kharif1', 1], ['aman', 2]].map(([k, i]) => (
                <tr key={k} className="border-t border-border"><td className="py-1.5 font-semibold">{L(SEASON_NAMES[i])}</td>
                  <td className="py-1.5 tabular">{range(change.seasons[k].dTmax, sd, '°')}</td>
                  <td className="py-1.5 tabular">{range(change.seasons[k].rainPct, (x) => sd(x), '%')}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-[14px] font-bold">{T('প্রতিটি মডেলের গড় উষ্ণতা', 'Each model’s warming')}</div>
          <div className="mt-2 space-y-1.5">
            {change.perModel.slice().sort((a, b) => a.dT - b.dT).map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-[12px]">
                <span className="w-[104px] shrink-0 truncate text-muted">{p.name}</span>
                <div className="relative h-2 flex-1 rounded-full bg-black/[.05]"><div className="absolute inset-y-0 left-0 rounded-full bg-clay-500/80" style={{ width: `${(Math.max(0, p.dT) / maxT) * 100}%` }} /></div>
                <span className="w-12 shrink-0 text-right font-semibold tabular">{sd(p.dT)}°</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[14px] font-bold">{T('আপনার ফসলগুলোর কী হবে', 'What happens to your crops')}</div>
          <table className="mt-1 w-full text-[13.5px]">
            <thead><tr className="text-left text-muted"><th className="py-1.5 font-semibold">{T('ফসল', 'Crop')}</th><th className="py-1.5 font-semibold">{T('খারাপ মৌসুম', 'Bad seasons')}</th><th className="py-1.5 font-semibold">{T('সেচ, মিমি', 'Irrigation, mm')}</th></tr></thead>
            <tbody>
              {crops.map((id) => {
                const sl = slotOf(id);
                if (!sl) return null;
                const up = (sl.risk.fut ?? 0) > sl.risk.now + 0.04;
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="py-1.5 font-semibold">{L(cropOf(id).name)}</td>
                    <td className={`py-1.5 tabular ${up ? 'font-bold text-red-700' : ''}`}>{num(sl.risk.now * 100, lang)}% → {num((sl.risk.fut ?? sl.risk.now) * 100, lang)}%</td>
                    <td className="py-1.5 tabular">{sl.water?.now != null ? `${num(sl.water.now, lang)} → ${num(sl.water.fut ?? sl.water.now, lang)}${sl.water.proxy ? '*' : ''}` : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('খারাপ মৌসুম: ২০১৩–২০২৫-এর ১৩ মৌসুমের যতগুলোতে ফসলের নিজের নিয়মে আবহাওয়া ফসল নষ্ট করত (যেমন ফুল আসার সময় ৩৫°-এর ওপরে গরম)। ২০৪০-এর দশকে একই দিনগুলো মডেলের পরিবর্তনে সরিয়ে আবার গোনা। * পাটের জন্য FAO-56 সহগ নেই, তাই খরিফ-১-এর সবচেয়ে পানি-খাওয়া ফসলের হিসাব ধরা।', 'Bad seasons: of the 13 seasons 2013–2025, how many the crop’s own rules say the weather would have spoiled (heat at flowering, say). For the 2040s the same days are shifted by the models’ change and counted again. * Jute has no FAO-56 coefficients, so the thirstiest Kharif-1 crop stands in.')}</p>
        </div>
      </div>
    </Card>
  );
}
function Big({ icon: Icon, label, value, sub, tone }) {
  return <div className="rounded-2xl border border-border bg-white p-3.5"><div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted"><Icon size={16} className={tone} />{label}</div><div className={`font-display mt-0.5 text-[26px] font-bold tabular ${tone}`}>{value}</div><div className="text-[12.5px] text-muted">{sub}</div></div>;
}

// ───────── method and sources ─────────
function Method({ ctx, ff }) {
  const { s, T } = useStore();
  const lang = s.lang;
  const items = [
    [T('মাটির কার্বন', 'Soil carbon'), T(`ICBM মডেল (Andrén ও Kätterer ১৯৯৭): তরুণ ও পুরোনো দুই ভাণ্ডার, k₁ = ${num(ICBM.k1, 'bn', { dp: 1 })}, k₂ = ${num(ICBM.k2, 'bn', { dp: 3 })}/বছর; খড়ের হিউমিফিকেশন ${num(ICBM.hAbove, 'bn', { dp: 3 })}, শিকড়ের ${num(ICBM.hRoot, 'bn', { dp: 2 })} (Kätterer ও অন্যরা ২০১১)। ফসলের কার্বন আসে ফলন, হারভেস্ট ইনডেক্স আর শিকড়-কাণ্ড অনুপাত থেকে (Bolinder ও অন্যরা ২০০৭)। গরমে পচন বাড়ে (Andrén ও অন্যরা ২০০৪), ধানক্ষেতে পানি থাকলে পচন পাঁচ ভাগের এক ভাগ (Shirato ও Yokozawa ২০০৫)। শুরু আপনার জমির SoilGrids কার্বন: ${num(ctx.soc0, 'bn', { dp: 1 })} টন/হেক্টর, এখনকার চাষে যা স্থির ধরা।`, `ICBM (Andrén & Kätterer 1997): young and old pools, k₁ = ${ICBM.k1}, k₂ = ${ICBM.k2} a year; humification ${ICBM.hAbove} for straw, ${ICBM.hRoot} for roots (Kätterer et al. 2011). Crop carbon from yield, harvest index and root-to-shoot ratio (Bolinder et al. 2007). Decay faster when warm (Andrén et al. 2004), a fifth as fast in a flooded paddy (Shirato & Yokozawa 2005). Starts from your field’s SoilGrids carbon, ${num(ctx.soc0, 'en', { dp: 1 })} t C/ha, taken as steady under the usual rotation.`)],
    [T('পানি', 'Water'), T('FAO-56: ফসল-সহগ × হারগ্রিভস ET₀, এলাকার স্টেশন-মেলানো নাসা POWER আবহাওয়ায়, ব্যবহারযোগ্য বৃষ্টি বাদে; ধানে কাদা করতে ২০০ মিমি।', 'FAO-56: crop coefficient × Hargreaves ET₀ on the area’s station-matched NASA POWER weather, less usable rain; 200 mm to puddle rice.')],
    [T('আবহাওয়ার ঝুঁকি', 'Weather risk'), T('প্রতিটি ফসলের নিজের নিয়ম (ফুলের সময় গরম, ভারী বৃষ্টি), ২০১৩–২০২৫-এর প্রতিটি মৌসুমে আবার চালানো।', 'Each crop’s own rules (heat at flowering, heavy rain) replayed over every season 2013–2025.')],
    [T('২০৪০-এর দশক', 'The 2040s'), T('নাসা NEX-GDDP-CMIP6 v2.0 (Thrasher ও অন্যরা ২০২২), ০.২৫° ঘর, ৮টি মডেল; ২০৪১–২০৫০ বনাম ২০০৫–২০১৪-এর মাসিক পরিবর্তন এলাকার আসল দিনে যোগ (ডেল্টা পদ্ধতি)।', 'NASA NEX-GDDP-CMIP6 v2.0 (Thrasher et al. 2022), 0.25° cell, 8 models; the monthly change 2041–2050 against 2005–2014 added to the area’s real days (delta change).')],
    [T('জলবায়ু খাতা', 'Climate account'), T(`ধানক্ষেতের মিথেন আইপিসিসি ২০১৯-এর টিয়ার-১ পদ্ধতিতে: দক্ষিণ এশিয়ার দৈনিক হার ${num(CH4.ef, 'bn', { dp: 2 })} কেজি/হেক্টর, পানির ধরন (একটানা ১, AWD ${num(CH4.sfw.awd, 'bn', { dp: 2 })}, বৃষ্টিনির্ভর ${num(CH4.sfw.rainfed, 'bn', { dp: 2 })}) আর রেখে দেওয়া খড়ের গুণক (১ + খড় × ${num(CH4.cfoa, 'bn', { dp: 2 })})^${num(CH4.exp, 'bn', { dp: 2 })}। উষ্ণায়ন ক্ষমতা ২৭ (আইপিসিসি এআর৬)। মাটির কার্বনের বদল CO₂ হিসেবে বাদ দিয়ে নিট।`, `Paddy methane by IPCC 2019 Tier 1: South Asia daily rate ${CH4.ef} kg/ha, the water regime (kept flooded 1, AWD ${CH4.sfw.awd}, rainfed ${CH4.sfw.rainfed}) and a factor for straw kept, (1 + straw × ${CH4.cfoa})^${CH4.exp}. Warming power 27 (IPCC AR6). The soil carbon change, as CO₂, is set against it for the net.`)],
    [T('৮ মডেলের পরীক্ষা', 'Eight-model test'), T('প্রতিটি ভালো ফসলচক্র প্রতিটি জলবায়ু মডেলের নিজের ভবিষ্যতে আলাদা করে দশ বছর চালানো, সব ফসলচক্রের একই মাপকাঠিতে নম্বর দিয়ে। যেটা বেশির ভাগ ভবিষ্যতে মাটি ধরে রাখে আর ঝুঁকি বাড়ায় না, সেটাই টেকসই (রোবাস্ট ডিসিশন মেকিং, Lempert ও অন্যরা ২০০৬)।', 'Each good rotation run for ten years in each climate model’s own future, scored on the same scale as every rotation. The one that keeps the soil and adds no risk in most futures is the robust one (robust decision making, Lempert et al. 2006).')],
    [T('মাটির স্বাস্থ্য', 'Soil health'), T('ইউএসডিএ এনআরসিএস-এর চার নীতি: সারা বছর জীবন্ত শিকড়, নানা রকম ফসল, মাটি কম ঘাঁটা (কাদা করা সবচেয়ে বেশি), জৈব পদার্থ বাড়ানো।', 'USDA NRCS’s four principles: living roots all year, many kinds of crop, less disturbance (puddling is the most), building organic matter.')],
    [T('ফলন', 'Yields'), T(`FAOSTAT ২০২৪; আউশ ও আমন: ইউএসডিএ এফএএস (ডিএই তথ্য) ${num(YIELDS.aus.tHa, 'bn', { dp: 2 })} ও ${num(YIELDS.aman.tHa, 'bn', { dp: 2 })} টন ধান/হেক্টর; মুগ: বিবিএস ${num(YIELDS.mungbean.tHa, 'bn', { dp: 2 })} টন/হেক্টর।`, `FAOSTAT 2024; Aus and Aman: USDA FAS (DAE data) ${YIELDS.aus.tHa} and ${YIELDS.aman.tHa} t paddy/ha; mungbean: BBS ${YIELDS.mungbean.tHa} t/ha.`)],
  ];
  const links = [
    ['NASA NEX-GDDP-CMIP6', 'https://www.nccs.nasa.gov/services/data-collections/land-based-products/nex-gddp-cmip6'],
    ['NASA POWER', 'https://power.larc.nasa.gov/'],
    ['ISRIC SoilGrids', 'https://soilgrids.org'],
    ['ICBM (Andrén & Kätterer 1997)', 'https://doi.org/10.1890/1051-0761(1997)007[1226:ITICBM]2.0.CO;2'],
    ['FAO-56', 'https://www.fao.org/4/x0490e/x0490e00.htm'],
    ['IPCC 2019 Refinement, Vol. 4 Ch. 5 (rice methane)', 'https://www.ipcc-nggip.iges.or.jp/public/2019rf/vol4.html'],
    ['NRCS soil health principles', 'https://www.nrcs.usda.gov/conservation-basics/natural-resource-concerns/soil/soil-health'],
  ];
  return (
    <Card id="ff-method" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[20px] font-bold"><FlaskConical size={20} className="text-primary-700" />{T('কীভাবে হিসাব করা', 'How it is worked out')}</h2>
      <dl className="mt-3 grid gap-3 md:grid-cols-2">
        {items.map(([k, v]) => <div key={k} className="rounded-xl bg-black/[.025] p-3"><dt className="text-[14px] font-bold">{k}</dt><dd className="mt-1 text-[13.5px] leading-6 text-muted">{v}</dd></div>)}
      </dl>
      <Note tone="gold" className="mt-3">{T('এগুলো মডেলের হিসাব, ভবিষ্যদ্বাণী নয়। মাটির কার্বনের সংখ্যাগুলো সাহিত্যের শুরুর মান দিয়ে; মাটি পরীক্ষা আর কৃষি কর্মকর্তার পরামর্শ দিয়ে মিলিয়ে নিন। ফসলচক্রগুলো তুলনা করার জন্য সবচেয়ে কাজের, একটা সংখ্যা ধরে রাখার জন্য নয়।', 'These are model estimates, not forecasts. The soil-carbon figures use starting values from the literature; check them against a soil test and your officer. They are best for comparing rotations, not for any single number.')}</Note>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {links.map(([l, u]) => <a key={u} href={u} target="_blank" rel="noreferrer" className="font-semibold text-primary-700 underline-offset-2 hover:underline">{l}</a>)}
      </div>
      {ctx.change && <p className="mt-2 text-[12px] text-muted">{T(`জলবায়ু মডেলের সূত্র: ${ctx.change.prov.citation}; নামানো ${bnDigits(ctx.change.prov.retrieved)}`, `Climate source: ${ctx.change.prov.citation}; retrieved ${ctx.change.prov.retrieved}`)}</p>}
    </Card>
  );
}
