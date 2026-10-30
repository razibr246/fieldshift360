// The FieldShift station inside "মাঠের মানুষ": the village kiosk (and the phone button) open the same decision-support
// tool the app gives a farmer, for the player's own real place. Four tabs:
//   Today       the weather and prices of the season being played (the kiosk as it was)
//   From space  that place in NASA records: bare months, ground heat, evapotranspiration, soil moisture, stored water,
//               the monsoon's start or the year's rain, frost and heat, and satellites against the ground (game/fieldshift.js)
//   Rotations   at least three rotation strategies, farming as now among them, from Field Future (Bangladesh,
//               engine/soilfuture.js) or the neighbours' engine (engine/rotationAbroad.js), ranked by the priorities and
//               limits the player sets, each with why, evidence, benefits, gaps and what to check locally
//   What if     temperature and rain sliders that re-run the rotations, and can replay the season under that weather
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Satellite, Sprout, SlidersHorizontal, Smartphone, Lightbulb, FileSearch, ThumbsUp, HelpCircle, ShieldAlert, Users, Play, Loader2 } from 'lucide-react';
import { useStore, loadClimate, soilData, srdi, demo } from '../../store';
import { num, MONTHS_BN, MONTHS_EN } from '../../engine/dates';
import { fieldContext, fieldFuture, climateChange, cropOf, RABI_OPTS, K1_OPTS, WATER_M3_PER_MM_BIGHA, ureaSavedKgPerBigha } from '../../engine/soilfuture';
import { strategyBrief } from '../../engine/briefs';
import { srdiUnionOf } from '../../engine/soil';
import { abroadRotations, cropAbroad } from '../../engine/rotationAbroad';
import { unionsOf } from '../../data/demo';
import priceSeasons from '../../data/market/price_seasons.json';
import cropEconomics from '../../data/market/crop_economics.json';
import { placeOf, spaceFacts, sliderChange, sliderMods, abroadBrief, FARM_OF } from '../../game/fieldshift';

const ABROAD = import.meta.glob('../../data/abroad/*.json', { import: 'default' });
const median = (a) => { const v = [...a].sort((x, y) => x - y); return v[v.length >> 1]; };
const PARTS = [
  { k: 'why', icon: Lightbulb, bn: 'কেন এই পথ', en: 'Why this one' },
  { k: 'evidence', icon: FileSearch, bn: 'কোন তথ্যে', en: 'The evidence' },
  { k: 'benefits', icon: ThumbsUp, bn: 'কী পেতে পারেন', en: 'What it may offer' },
  { k: 'gaps', icon: HelpCircle, bn: 'যা এখনো জানা নেই', en: 'What is not known yet' },
  { k: 'risks', icon: ShieldAlert, bn: 'স্থানীয়ভাবে যাচাই করুন', en: 'Check locally' },
];
// the farmer's priorities, as Field Future weighs them (soilfuture.js PRIO_W)
const PRIOS = [
  ['water', 'পানি বাঁচানো', 'Save water'], ['soil', 'মাটির স্বাস্থ্য', 'Soil health'], ['income', 'বেশি আয়', 'More income'],
  ['risk', 'কম ঝুঁকি', 'Less weather risk'], ['fodder', 'গোখাদ্য', 'Fodder'], ['cover', 'জমি ঢাকা রাখা', 'Keep the soil covered'],
];
const IRRIGATION = [['none', 'সেচ নেই', 'No irrigation'], ['stw', 'শ্যালো পাম্প', 'Shallow pump'], ['dtw', 'গভীর নলকূপ', 'Deep tube well']];
const TAG = { REAL: ['আসল তথ্য', 'Real data', 'bg-sky-400/15 text-sky-200 ring-sky-300/30'], RULE: ['নিয়মে হিসাব', 'Rule-based', 'bg-amber-400/15 text-amber-200 ring-amber-300/30'] };

function Tag({ k }) {
  const { T } = useStore();
  const [bn, en, tone] = TAG[k];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${tone}`}>{T(bn, en)}</span>;
}
const Box = ({ children, className = '' }) => <div className={`rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 ${className}`}>{children}</div>;
const Chip = ({ on, onClick, children }) => <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${on ? 'bg-emerald-500 text-white ring-emerald-300' : 'bg-white/[.07] text-white/80 ring-white/15 hover:bg-white/[.12]'}`}>{children}</button>;

// twelve monthly bars, the highlighted months bright
function Bars({ v, hi = [] }) {
  const { s } = useStore();
  const ok = v.filter((x) => x != null), lo = Math.min(...ok), top = Math.max(...ok);
  return (
    <div className="mt-2 flex h-14 items-end gap-[3px]" aria-hidden="true">
      {v.map((x, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-0.5">
          <div className="flex w-full flex-1 items-end"><div className={`w-full rounded-t ${hi.includes(i + 1) ? 'bg-amber-300' : 'bg-emerald-300/45'}`} style={{ height: `${x == null ? 0 : 12 + ((x - lo) / (top - lo || 1)) * 88}%` }} /></div>
          <span className="text-[9px] text-white/50">{(s.lang === 'bn' ? MONTHS_BN : MONTHS_EN)[i].slice(0, s.lang === 'bn' ? 2 : 1)}</span>
        </div>
      ))}
    </div>
  );
}

function Brief({ b }) {
  const { T, L } = useStore();
  return (
    <div className="mt-3 space-y-2">
      {PARTS.map(({ k, icon: Icon, bn, en }) => b[k].length > 0 && (
        <div key={k} className="rounded-xl bg-black/20 p-2.5">
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide text-emerald-200"><Icon size={14} />{T(bn, en)}</p>
          <ul className="mt-1 space-y-1 text-[13.5px] leading-6 text-white/85">{b[k].map((x, i) => <li key={i}>• {L(x)}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

export default function FieldStation({ g, hud, R, children, onWhatIf }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const place = useMemo(() => placeOf(R, g.id), [R, g.id]);
  // a Bangladesh farmer's own sample farm: its union's soil, its irrigation and what it grew last Rabi
  const farm = useMemo(() => demo.farmers.find((f) => f.id === FARM_OF[g.id]) ?? null, [g.id]);
  const [tab, setTab] = useState('today');
  const [abroad, setAbroad] = useState(null); // the neighbour's farm point and its soil and yields
  const [clim, setClim] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [prios, setPrios] = useState([]);
  const [exclude, setExclude] = useState([]);
  const [irr, setIrr] = useState(farm?.irrigation ?? 'stw');
  const [habit, setHabit] = useState(RABI_OPTS.includes(farm?.last_crop) ? farm.last_crop : 'boro');
  const [dT, setDT] = useState(0), [rain, setRain] = useState(0);
  const [world, setWorld] = useState('now');
  const [pick, setPick] = useState(null);
  useEffect(() => {
    let current = true;
    setAbroad(null); setClim(null); setDeltas(null); setPick(null);
    import('../../data/climate/cmip6_deltas.json').then((m) => { if (current) setDeltas(m.default); }).catch(() => { if (current) setDeltas(false); });
    if (place.kind === 'bd') {
      loadClimate(place.id).then((c) => { if (current) setClim(c); }).catch(() => { if (current) setClim(false); });
    } else {
      const loadPlace = ABROAD[`../../data/abroad/${place.id}.json`];
      if (!loadPlace) setAbroad(false);
      else Promise.all([loadPlace(), import('../../data/soil/abroad_soil_yields.json'), import('../../data/market/abroad_prices.json')])
        .then(([d, sy, pr]) => {
          if (!current) return;
          const soil = sy.default.countries[place.id], prices = pr.default.countries[place.id];
          if (!d.points?.farm?.normals || !soil || !prices) throw new Error(`incomplete FieldShift records for ${place.id}`);
          setAbroad({ normals: d.points.farm.normals, ...soil, prices });
        })
        .catch(() => { if (current) setAbroad(false); });
    }
    return () => { current = false; };
  }, [place]);
  const cards = useMemo(() => (place.kind === 'bd' || abroad ? spaceFacts(place, abroad?.normals) : null), [place, abroad]);
  const what = useDeferredValue({ prios, exclude, irr, habit, dT, rain });
  const slider = sliderChange(what.dT, what.rain);

  // Bangladesh: Field Future on the upazila's NASA POWER days and the farm's own union soil (the upazila's middle
  // union if that union has no soil reading), from what the farmer says they grow now
  const bd = useMemo(() => {
    if (place.kind !== 'bd' || !clim || !deltas) return null;
    let mid = farm && soilData.unions[farm.union]?.soc_g_kg != null ? { u: { id: farm.union }, soil: soilData.unions[farm.union] } : null;
    if (!mid) {
      const us = unionsOf(place.id).map((u) => ({ u, soil: soilData.unions[u.id] })).filter((x) => x.soil?.soc_g_kg != null);
      const m = median(us.map((x) => x.soil.soc_g_kg)); mid = us.find((x) => x.soil.soc_g_kg === m) ?? us[0];
    }
    const econ = { prices: priceSeasons, costs: cropEconomics, srdiUnion: srdiUnionOf(srdi, mid.u.id), landform: mid.soil.landform };
    const change = slider ?? climateChange(deltas, place.id, 'ssp245');
    const ctx = fieldContext({ clim, change, soil: mid.soil, plot: { irrigation: what.irr }, amanT: null, econ });
    const ff = fieldFuture({ ctx, lastCrop: what.habit, plan: null, priorities: what.prios, exclude: what.exclude });
    const others = ff.top.filter((e) => e !== ff.best && e !== ff.habit).slice(0, 2);
    return { ff, list: [{ id: 'habit', kind: 'habit', e: ff.habit }, { id: 'best', kind: 'best', e: ff.best }, ...others.map((e, i) => ({ id: `alt${i}`, kind: 'best', e }))] };
  }, [place, farm, clim, deltas, what.prios, what.exclude, what.irr, what.habit, what.dT, what.rain]); // eslint-disable-line react-hooks/exhaustive-deps
  // the neighbours: soil carbon, nitrogen and greenhouse gases over ten years, today and under the change
  const ab = useMemo(() => {
    if (place.kind !== 'abroad' || !abroad || !deltas) return null;
    const change = slider ?? climateChange(deltas, `abroad_${place.id}`, 'ssp245');
    return abroadRotations({ country: place.id, soil: abroad.soil, yields: abroad.yields, normals: abroad.normals, change, prices: abroad.prices });
  }, [place, abroad, deltas, what.dT, what.rain]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotName = (rot) => rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].filter((id) => id && id !== 'fallow').map((id) => L(cropOf(id).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year ')) + (rot.residue === 'retain' ? T(' · খড় জমিতে', ' · straw kept') : '');
  const abName = (o) => o.cycle.map((y) => y.map((k) => L(cropAbroad(k).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year ')) + (o.residue === 'retain' ? T(' · খড় জমিতে', ' · straw kept') : '');
  const sumOf = (e) => (world === 'fut' && e.sFut ? e.sFut : e.sNow);
  const futLabel = slider ? T('আপনার "যদি এমন হয়"', 'Your what-if') : T('২০৪০-এর দশক (নাসা CMIP6)', 'The 2040s (NASA CMIP6)');
  const TABS = [['today', Smartphone, 'আজ', 'Today'], ['space', Satellite, 'উপগ্রহ থেকে', 'From space'], ['rot', Sprout, 'ফসলচক্র', 'Rotations'], ['what', SlidersHorizontal, 'যদি এমন হয়', 'What if']];
  const loading = <p className="mt-4 flex items-center gap-2 text-[14px] text-white/70"><Loader2 size={16} className="animate-spin" />{T('জলবায়ু ও মাটির তথ্য খোলা হচ্ছে…', 'Loading climate and soil records…')}</p>;
  const loadError = <p role="status" className="mt-3 rounded-xl bg-red-400/10 p-3 text-[14px] leading-6 text-red-100">{T('এই জায়গার জলবায়ু বা মাটির তথ্য খোলা গেল না। পরে আবার চেষ্টা করুন।', 'Could not load this place’s climate or soil records. Try again later.')}</p>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map(([id, Icon, bn, en]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold ring-1 transition ${tab === id ? 'bg-white text-primary-950 ring-white' : 'bg-white/[.07] text-white/80 ring-white/15 hover:bg-white/[.12]'}`}><Icon size={15} />{T(bn, en)}</button>
        ))}
      </div>

      {tab === 'today' && children}

      {tab === 'space' && (<>
        <p className="font-display text-[20px] font-semibold">{T(`${L(R.place)}: উপগ্রহ যা দেখে`, `${L(R.place)}: what the satellites see`)}</p>
        <p className="mt-1 text-[13.5px] text-white/65">{T('আপনার জায়গার আসল নাসা রেকর্ড, ২০০১ থেকে। কৃষকেরা নমুনা মানুষ, জায়গা আর তথ্য সত্যি।', 'Your place’s real NASA records since 2001. The farmers are sample people; the place and the data are real.')}</p>
        {place.kind === 'abroad' && abroad === false ? loadError : !cards ? loading : <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {cards.map((c) => (
            <Box key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14.5px] font-semibold">{L(c.title)}</p>
                <span className="flex shrink-0 items-center gap-1"><span className="text-[11px] font-bold text-white/55">{typeof c.sat === 'string' ? c.sat : L(c.sat)}</span><Tag k={c.tag} /></span>
              </div>
              <p className="mt-1 text-[15px] font-semibold text-emerald-200">{L(c.value)}</p>
              {c.bars && <Bars v={c.bars} hi={c.hi} />}
              <p className="mt-1.5 text-[13px] leading-6 text-white/75">{L(c.detail)}</p>
              <details className="mt-1.5 text-[12.5px] leading-6 text-white/65"><summary className="cursor-pointer font-semibold text-white/80">{T('এর মানে কী?', 'What does this mean?')}</summary>{L(c.term)}</details>
            </Box>
          ))}
        </div>}
      </>)}

      {tab === 'rot' && (<>
        <p className="font-display text-[20px] font-semibold">{T('কোন ফসলচক্র এই জমির জন্য', 'Which rotation suits this land')}</p>
        <p className="mt-1 text-[13.5px] text-white/65">{place.kind === 'bd'
          ? T('দশ বছর ধরে প্রতিটি ফসলচক্র চালানো: মাটির কার্বন, সেচের পানি, আয়, আবহাওয়ার ঝুঁকি আর রোগ-পোকা, এখনকার চাষের পাশে।', 'Every rotation run for ten years: soil carbon, irrigation water, income, weather risk and pests, beside farming as now.')
          : T('দশ বছর ধরে প্রতিটি ফসলচক্র: মাটির জৈব কার্বন, ডালের নাইট্রোজেন, সেচের পানি আর ফসলের দাম, এখন আর ২০৪০-এর দশকে।', 'Every rotation over ten years: soil organic carbon, legume nitrogen, irrigation water and harvest value, now and in the 2040s.')}</p>
        {place.kind === 'bd' && (<>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-wide text-white/55">{T('আপনার কাছে যা জরুরি', 'What matters to you')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{PRIOS.map(([k, bn, en]) => <Chip key={k} on={prios.includes(k)} onClick={() => setPrios((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}>{T(bn, en)}</Chip>)}</div>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-wide text-white/55">{T('রবিতে এখন যা করেন (তুলনার ভিত্তি)', 'What you grow in Rabi now (the baseline)')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{RABI_OPTS.map((k) => <Chip key={k} on={habit === k} onClick={() => setHabit(k)}>{L(cropOf(k).name)}</Chip>)}</div>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-wide text-white/55">{T('আপনার সীমা: সেচ', 'Your limits: water')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{IRRIGATION.map(([k, bn, en]) => <Chip key={k} on={irr === k} onClick={() => setIrr(k)}>{T(bn, en)}</Chip>)}</div>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-wide text-white/55">{T('যে ফসল আপনি করতে পারবেন না (বীজ, যন্ত্র বা বাজার নেই)', 'Crops you cannot grow (no seed, machine or market)')}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{[...RABI_OPTS, ...K1_OPTS].filter((k) => k !== 'fallow' && k !== 'boro').map((k) => <Chip key={k} on={exclude.includes(k)} onClick={() => setExclude((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>{L(cropOf(k).name)}</Chip>)}</div>
        </>)}
        <div className="mt-3 flex flex-wrap gap-1.5"><Chip on={world === 'now'} onClick={() => setWorld('now')}>{T('আজকের আবহাওয়া (২০১৩–২০২৫)', 'Today’s weather (2013–2025)')}</Chip><Chip on={world === 'fut'} onClick={() => setWorld('fut')}>{futLabel}</Chip></div>
        {place.kind === 'bd' && (clim === false || deltas === false ? loadError : !bd ? loading : (() => {
          const at = bd.list.find((c) => c.id === pick) ?? bd.list[1], base = bd.list[0];
          const b = strategyBrief({ s: sumOf(at.e), b: sumOf(base.e), rot: at.e.rot, kind: at.kind, world });
          return (<>
            <div className="mt-3 grid gap-2">
              {bd.list.map((c) => {
                const x = sumOf(c.e);
                return (
                  <button key={c.id} type="button" onClick={() => setPick(c.id)} aria-pressed={c === at} className={`rounded-2xl p-3 text-left ring-1 transition ${c === at ? 'bg-emerald-400/15 ring-emerald-300' : 'bg-white/[.07] ring-white/10 hover:bg-white/[.1]'}`}>
                    <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/60">{c.kind === 'habit' ? T('এখন যেমন চাষ হয়', 'Farming as now') : c.id === 'best' ? T('আপনার জন্য সবচেয়ে ভালো', 'Best for you') : T('আরেকটি ভালো পথ', 'Another good option')}<span className="normal-case text-white/45">{T(`স্কোর ${num(Math.round(c.e.score), 'bn')}/১০০`, `score ${Math.round(c.e.score)}/100`)}</span><Tag k="RULE" /></p>
                    <p className="mt-1 text-[15px] font-semibold">{rotName(c.e.rot)}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px] text-white/75 sm:grid-cols-3">
                      <span>{T(`সেচ: বিঘায় ${num(Math.round(x.waterMm * WATER_M3_PER_MM_BIGHA), 'bn')} ঘনমিটার/বছর`, `Water: ${Math.round(x.waterMm * WATER_M3_PER_MM_BIGHA)} m³/bigha/yr`)}</span>
                      <span>{T(`লাভ: বিঘায় ৳${num(Math.round(x.money), 'bn')}/বছর`, `Profit: ৳${Math.round(x.money)}/bigha/yr`)}</span>
                      <span>{T(`খারাপ মৌসুম: ${num(Math.round(x.risk * 100), 'bn')}%`, `Bad seasons: ${Math.round(x.risk * 100)}%`)}</span>
                      <span>{T(`জৈব পদার্থ ১০ বছরে: ${x.dSoc >= 0 ? '+' : '−'}${num(Math.abs(x.dSoc), 'bn', { dp: 1 })}%`, `Organic matter in 10 yrs: ${x.dSoc >= 0 ? '+' : '−'}${Math.abs(x.dSoc).toFixed(1)}%`)}</span>
                      <span>{T(`ইউরিয়া বাঁচে: ${num(ureaSavedKgPerBigha(x.nFix), 'bn', { dp: 1 })} কেজি/বিঘা`, `Urea saved: ${ureaSavedKgPerBigha(x.nFix).toFixed(1)} kg/bigha`)}</span>
                      <span>{T(`জমি ঢাকা: বছরে ${num(Math.round(x.cover), 'bn')} দিন`, `Soil covered: ${Math.round(x.cover)} days/yr`)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <Brief b={b} />
          </>);
        })())}
        {place.kind === 'abroad' && (abroad === false || deltas === false ? loadError : !ab ? loading : (() => {
          const habitO = ab.options.find((o) => o.habit), at = ab.options[pick ?? 1] ?? ab.options[1];
          return (<>
            <div className="mt-3 grid gap-2">
              {ab.options.map((o, i) => {
                const d = world === 'fut' && o.dSocFut != null ? o.dSocFut : o.dSoc;
                return (
                  <button key={i} type="button" onClick={() => setPick(i)} aria-pressed={o === at} className={`rounded-2xl p-3 text-left ring-1 transition ${o === at ? 'bg-emerald-400/15 ring-emerald-300' : 'bg-white/[.07] ring-white/10 hover:bg-white/[.1]'}`}>
                    <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/60">{o.habit ? T('এখন যেমন চাষ হয়', 'Farming as now') : T(`পথ ${num(i, 'bn')}`, `Option ${i}`)}<Tag k="RULE" /></p>
                    <p className="mt-1 text-[15px] font-semibold">{abName(o)}</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[12.5px] text-white/75 sm:grid-cols-3">
                      <span>{T(`মাটির কার্বন ১০ বছরে: ${d >= 0 ? '+' : '−'}${num(Math.abs(d), 'bn', { dp: 1 })}%`, `Soil carbon in 10 yrs: ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}%`)}</span>
                      <span>{T(`নাইট্রোজেন: ${num(Math.round(o.nFix), 'bn')} কেজি/হেক্টর/বছর`, `Nitrogen: ${Math.round(o.nFix)} kg/ha/yr`)}</span>
                      <span>{T(`ফসলের গোত্র: ${num(o.families, 'bn')}`, `Crop families: ${o.families}`)}</span>
                      {o.waterMm != null && (() => { const w = world === 'fut' && o.waterFut != null ? o.waterFut : o.waterMm; return <span>{T(`সেচ: বছরে ${num(Math.round(w), 'bn')} মিমি`, `Irrigation: ${Math.round(w)} mm/yr`)}</span>; })()}
                      {o.gross != null && <span>{T(`ফসলের দাম: হেক্টরে ${abroad.prices.symbol}${num(Math.round(o.gross), 'bn')}/বছর`, `Harvest value: ${abroad.prices.symbol}${num(Math.round(o.gross), 'en')}/ha/yr`)}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <Brief b={abroadBrief(at, habitO, (k) => cropAbroad(k).name, world === 'fut', abroad.prices)} />
          </>);
        })())}
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-400/10 p-3 text-[13.5px] leading-6 text-amber-100"><Users size={16} className="mt-1 shrink-0" />{T('FieldShift পথ দেখায়, সিদ্ধান্ত আপনার। নতুন ফসল বোনার আগে উপজেলা কৃষি কর্মকর্তা আর অভিজ্ঞ কৃষকের সঙ্গে মিলিয়ে নিন।', 'FieldShift shows the options; the decision is yours. Check with your agriculture officer and experienced farmers before sowing a new crop.')}</p>
      </>)}

      {tab === 'what' && (<>
        <p className="font-display text-[20px] font-semibold">{T('যদি আবহাওয়া এমন হয়?', 'What if the weather changes?')}</p>
        <p className="mt-1 text-[13.5px] text-white/65">{T('তাপমাত্রা আর বৃষ্টি বদলে দেখুন ফসলচক্রগুলো কী করে। নাসার মডেল ২০৪০-এর দশকে এখানে যা বলে, তা পাশে।', 'Change the temperature and rain and see what the rotations do. What NASA’s models say for the 2040s here is beside it.')}</p>
        <label className="mt-4 block text-[14px] font-semibold">{T(`তাপমাত্রা: +${num(dT, 'bn', { dp: 1 })} °সে`, `Temperature: +${dT.toFixed(1)} °C`)}
          <input type="range" min="0" max="3" step="0.5" value={dT} onChange={(e) => setDT(+e.target.value)} className="mt-1 w-full accent-emerald-400" />
        </label>
        <label className="mt-3 block text-[14px] font-semibold">{T(`বৃষ্টি: ${rain > 0 ? '+' : rain < 0 ? '−' : ''}${num(Math.abs(rain), 'bn')}%`, `Rain: ${rain > 0 ? '+' : rain < 0 ? '−' : ''}${Math.abs(rain)}%`)}
          <input type="range" min="-40" max="40" step="10" value={rain} onChange={(e) => setRain(+e.target.value)} className="mt-1 w-full accent-emerald-400" />
        </label>
        {deltas && (() => {
          const cc = climateChange(deltas, place.kind === 'bd' ? place.id : `abroad_${place.id}`, 'ssp245');
          return cc && <Box className="mt-3 text-[13.5px] leading-6 text-white/80">{T(`নাসা NEX-GDDP-CMIP6 (${num(cc.n, 'bn')}টি মডেল, মাঝারি নির্গমন): ২০৪০-এর দশকে এখানে তাপমাত্রা +${num(cc.dT.med, 'bn', { dp: 1 })} °সে (${num(cc.dT.min, 'bn', { dp: 1 })} থেকে ${num(cc.dT.max, 'bn', { dp: 1 })}), বৃষ্টি ${num(Math.round(cc.rainPct.med), 'bn')}% (${num(Math.round(cc.rainPct.min), 'bn')} থেকে ${num(Math.round(cc.rainPct.max), 'bn')})। মডেলগুলোর এই অমিলই অনিশ্চয়তা।`, `NASA NEX-GDDP-CMIP6 (${cc.n} models, middle emissions): in the 2040s here +${cc.dT.med.toFixed(1)} °C (${cc.dT.min.toFixed(1)} to ${cc.dT.max.toFixed(1)}), rain ${Math.round(cc.rainPct.med)}% (${Math.round(cc.rainPct.min)} to ${Math.round(cc.rainPct.max)}). The models’ disagreement is the uncertainty.`)} <Tag k="REAL" /></Box>;
        })()}
        {deltas === false && loadError}
        {(dT || rain) ? (<>
          <Box className="mt-3 text-[13.5px] leading-6">
            {place.kind === 'bd' ? (!bd ? loading : (() => {
              const h = bd.ff.habit.sFut, b = bd.ff.best.sFut;
              return h && b && T(`এই আবহাওয়ায় এখনকার চাষ: সেচ বিঘায় ${num(Math.round(h.waterMm * WATER_M3_PER_MM_BIGHA), 'bn')} ঘনমিটার, খারাপ মৌসুম ${num(Math.round(h.risk * 100), 'bn')}%। সবচেয়ে ভালো পথ (${rotName(bd.ff.best.rot)}): সেচ ${num(Math.round(b.waterMm * WATER_M3_PER_MM_BIGHA), 'bn')} ঘনমিটার, খারাপ মৌসুম ${num(Math.round(b.risk * 100), 'bn')}%।`, `In this weather, farming as now: ${Math.round(h.waterMm * WATER_M3_PER_MM_BIGHA)} m³ of irrigation a bigha, ${Math.round(h.risk * 100)}% bad seasons. The best option (${rotName(bd.ff.best.rot)}): ${Math.round(b.waterMm * WATER_M3_PER_MM_BIGHA)} m³, ${Math.round(b.risk * 100)}% bad seasons.`);
            })()) : (!ab ? loading : (() => {
              const h = ab.options.find((o) => o.habit), best = ab.options.reduce((a, o) => ((o.dSocFut ?? o.dSoc) > (a.dSocFut ?? a.dSoc) ? o : a), ab.options[0]);
              return T(`এই আবহাওয়ায় এখনকার চাষ: সেচ বছরে ${num(Math.round(h.waterFut ?? h.waterMm), 'bn')} মিমি, দশ বছরে মাটির কার্বন ${num(h.dSocFut, 'bn', { dp: 1 })}%। মাটির জন্য সবচেয়ে ভালো পথ (${abName(best)}): সেচ ${num(Math.round(best.waterFut ?? best.waterMm), 'bn')} মিমি, কার্বন ${num(best.dSocFut, 'bn', { dp: 1 })}%।`, `In this weather, farming as now: ${Math.round(h.waterFut ?? h.waterMm)} mm of irrigation a year, soil carbon ${h.dSocFut.toFixed(1)}% over ten years. Best for the soil (${abName(best)}): ${Math.round(best.waterFut ?? best.waterMm)} mm, carbon ${best.dSocFut.toFixed(1)}%.`);
            })())}
            <span className="ml-1"><Tag k="RULE" /></span>
          </Box>
          <button type="button" onClick={() => { setWorld('fut'); setTab('rot'); }} className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 font-semibold ring-1 ring-white/15"><Sprout size={16} />{T('সব ফসলচক্র এই আবহাওয়ায় দেখুন', 'See every rotation in this weather')}</button>
          {onWhatIf && <button type="button" onClick={() => onWhatIf({ dT, rain })} className="btn-gloss ml-2 mt-3 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white"><Play size={16} />{T('এই আবহাওয়ায় মৌসুম খেলুন', 'Play the season in this weather')}</button>}
          <p className="mt-2 text-[12.5px] text-white/55">{T(`খেলায়: তাপপ্রবাহ ${num(Math.round((sliderMods(dT, rain).heat - 1) * 100), 'bn')}% কড়া, মাটি ${num(Math.round(Math.abs(sliderMods(dT, rain).dry - 1) * 100), 'bn')}% ${rain < 0 ? 'দ্রুত' : 'ধীরে'} শুকায়।`, `In the game: heatwaves ${Math.round((sliderMods(dT, rain).heat - 1) * 100)}% stronger, soil drying ${Math.round(Math.abs(sliderMods(dT, rain).dry - 1) * 100)}% ${rain < 0 ? 'faster' : 'slower'}.`)}</p>
        </>) : <p className="mt-3 text-[13.5px] text-white/60">{T('স্লাইডার সরালে ফল দেখা যাবে।', 'Move a slider to see the result.')}</p>}
      </>)}
    </div>
  );
}
