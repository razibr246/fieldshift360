// The home page's way into Field Future: the active farmer's own field over ten years, the usual rotation against
// the best one found for it, worked out with the same engine as the Field Future page (engine/soilfuture.js).
// Loaded on its own after the top of the page, so the first load stays small.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Droplets, Scale, Telescope } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import SoilColumn from './SoilColumn';
import deltas from '../../data/climate/cmip6_deltas.json';
import { num } from '../../engine/dates';
import { climateChange, fieldContext, fieldFuture, cropOf, omPctOf, climateLedger, WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';
import { BIGHA_HA } from '../../engine/crops';
import { useSeenRotation } from '../fields/useSeenRotation';

const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

export default function RotationTeaser() {
  const { s, T, L, farmer, soil, clim, econ, chosen, rotation, upazila, activeParcel } = useStore();
  const seen = useSeenRotation(activeParcel);
  const lastCrop = seen?.usable ? seen.rabiCrop : farmer.last_crop; // as Field Future: what the satellite saw
  const lang = s.lang;
  const change = useMemo(() => climateChange(deltas, upazila.id, 'ssp245'), [upazila.id]);
  const ctx = useMemo(() => fieldContext({ clim, change, soil, plot: farmer, amanT: rotation.amanMeasured ? rotation.amanT : null, econ }),
    [clim, change, soil, farmer, rotation.amanMeasured, rotation.amanT, econ]);
  const ff = useMemo(() => fieldFuture({ ctx, lastCrop, plan: { rabi: chosen.crop.id, k1: rotation.best?.crop.id ?? 'fallow' }, priorities: s.priorities }),
    [ctx, lastCrop, chosen.crop.id, rotation.best, s.priorities]);
  const name = (rot) => rot.cycle.map((y) => [y.rabi, y.k1].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name)).concat(L(cropOf('aman').name)).join(' → ')).join(' | ');
  const cols = [
    { e: ff.habit, title: seen?.usable ? T('এখনকার মতো (উপগ্রহে দেখা)', 'As now (seen from space)') : T('এখনকার মতো', 'As now'), tone: '#6b7a72' },
    { e: ff.best, title: T('সেরা ফসলচক্র', 'Best rotation'), tone: '#2f6e2f' },
  ];
  const facts = (e) => {
    const sm = e.sNow, l = climateLedger(ctx, e.rot, e.now);
    return [
      [Leaf, T('মাটির জৈব পদার্থ, ১০ বছরে', 'Soil organic matter, 10 years'), `${num(omPctOf(sm.socEnd, ctx.soil), lang, { dp: 2 })}% (${signed(sm.dSoc, lang)}%)`],
      [Droplets, T('সেচের পানি, বিঘায় বছরে', 'Irrigation, per bigha a year'), `${num(sm.waterMm * WATER_M3_PER_MM_BIGHA, lang)} ${T('ঘনমিটার', 'm³')}`],
      [Scale, T('নিট গ্রিনহাউস গ্যাস', 'Net greenhouse gas'), `${signed(l.net * BIGHA_HA, lang, 2)} ${T('টন CO₂e', 't CO₂e')}`],
      [Telescope, T('২০৪০-এর দশকে মাটি', 'Soil in the 2040s'), e.sFut ? `${signed(e.sFut.dSoc, lang)}%` : '–'],
    ];
  };
  const last = ff.habit.now.length - 1;
  return (
    <section id="rotations" className="scroll-mt-20 py-14 sm:py-16">
      <div className="page-shell">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-[13.5px] font-semibold text-primary-700">{T(`${farmer.villageBn}, ${L(upazila.name)} · নাসার আবহাওয়া, জমির নিজের মাটি`, `${farmer.village}, ${upazila.name.en} · NASA weather, the field’s own soil`)}</p>
            <h2 className="mt-1 text-[30px] font-bold leading-tight sm:text-[38px]">{T('এক মৌসুম নয়, দশ বছরের ফসলচক্র', 'Not one season: ten years of rotation')}</h2>
            <p className="mt-2 text-[16px] leading-7 text-muted">{T(`এই জমিতে ${num(ff.count, 'bn')}টি ফসলচক্র দশ বছর করে চালিয়ে দেখা হয়েছে: মাটির স্বাস্থ্য, সেচের পানি, লাভ, আবহাওয়ার ঝুঁকি, আর নাসার ৮টি জলবায়ু মডেলে ২০৪০-এর দশক। ক্রম ঠিক হয় কৃষকের নিজের চাওয়ায়।`, `${ff.count} rotations run for ten years on this field: soil health, irrigation water, profit, weather risk, and the 2040s in NASA’s eight climate models. The ranking follows the farmer’s own priorities.`)}</p>
          </div>
          <Tags list={['REAL', 'RULE']} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cols.map((c) => (
            <div key={c.title} className="glass flat spotlight-card lift grid grid-cols-[minmax(0,.8fr)_minmax(0,1fr)] gap-3 rounded-[24px] p-3 sm:p-4 transition-all hover:border-primary-300">
              <SoilColumn row={c.e.now[last]} season={0} soc0={ctx.soc0} soil={ctx.soil} health={c.e.sNow.health.score} title={c.title} tone={c.tone} residue={c.e.rot.residue} />
              <div className="min-w-0 pt-6">
                <p className="text-[12.5px] leading-5 text-muted">{name(c.e.rot)}{c.e.rot.residue === 'retain' ? T(' · খড় জমিতে', ' · straw kept') : ''}</p>
                <dl className="mt-2 space-y-2">
                  {facts(c.e).map(([Icon, k, v]) => (
                    <div key={k}><dt className="flex items-center gap-1.5 text-[12px] text-muted"><Icon size={14} className="text-primary-700" />{k}</dt><dd className="font-display text-[17px] font-bold tabular">{v}</dd></div>
                  ))}
                </dl>
              </div>
            </div>
          ))}
        </div>
        <Link to="/farmer/future" className="btn-gloss group mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white transition-transform hover:scale-105 active:scale-95">{T('পুরো ১০ বছরের হিসাব দেখুন', 'See the full ten years')}<ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" /></Link>
      </div>
    </section>
  );
}
