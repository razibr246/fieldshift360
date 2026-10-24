// Season planner: field → weather → soil → priorities → recommendation → next crop → price-drop check.
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, LineChart, Layers, SlidersHorizontal, Sprout, RefreshCw, TrendingDown, Droplets, Wheat, Check } from 'lucide-react';
import { useStore } from '../../store';
import { StepField, StepClimate, StepSoil, StepPriorities } from './steps/StepsA';
import { StepDecision, StepRotation, StepGlut } from './steps/StepsB';
import { LABEL_STYLE, RISK_STYLE, WATER_STYLE } from '../../components/ui';
import { PRIORITIES } from '../../engine/decision';
import { num, fmtDate } from '../../engine/dates';
import { scrollToTop } from '../../components/Motion';

export function usePlanSteps() {
  const { T } = useStore();
  return [
    { c: StepField, icon: MapPin, label: T('জমি', 'Field') },
    { c: StepClimate, icon: LineChart, label: T('আবহাওয়া', 'Weather') },
    { c: StepSoil, icon: Layers, label: T('মাটি', 'Soil') },
    { c: StepPriorities, icon: SlidersHorizontal, label: T('আপনার চাওয়া', 'Priorities') },
    { c: StepDecision, icon: Sprout, label: T('পরামর্শ', 'Recommendation') },
    { c: StepRotation, icon: RefreshCw, label: T('পরের ফসল', 'Next crop') },
    { c: StepGlut, icon: TrendingDown, label: T('দাম পড়ার ঝুঁকি', 'Price check') },
  ];
}

export default function Plan() {
  const { s, dispatch, T } = useStore();
  const steps = usePlanSteps();
  const navigate = useNavigate();
  const i = Math.min(s.step, steps.length - 1);
  const Step = steps[i].c;
  const go = (n) => dispatch({ type: 'set', patch: { step: Math.max(0, Math.min(steps.length - 1, n)) } });
  useEffect(() => { scrollToTop(true); }, [i]);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="text-[24px] font-bold sm:text-[28px]">{T('রবি ২০২৬–২৭ মৌসুমের পরিকল্পনা', 'Plan for Rabi 2026–27')}</h1>
          <span className="shrink-0 text-[14px] text-muted">{T(`${num(steps.length, 'bn')} ধাপের ${num(i + 1, 'bn')} নম্বর`, `Step ${i + 1} of ${steps.length}`)}</span>
        </div>
        <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-black/[.06]" aria-hidden="true"><div className="progress-sheen h-full rounded-full bg-primary-600 transition-all duration-500 ease-[var(--ease-gentle)]" style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
        <ol className="hide-scrollbar -mx-1 mb-6 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label={T('ধাপগুলো', 'Steps')}>
          {steps.map((st, k) => (
            <li key={k} className="shrink-0">
              <button type="button" onClick={() => go(k)} aria-current={k === i ? 'step' : undefined}
                className={`group flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-95 ${k === i ? 'border-primary-700 bg-primary-700 text-white shadow-sm' : k < i ? 'border-primary-200 bg-primary-50 text-primary-800 hover:bg-primary-100 hover:border-primary-300' : 'border-border bg-white text-ink/75 hover:text-ink hover:border-primary-200'}`}>
                {k < i ? <Check size={14} className="transition-transform duration-200 group-hover:scale-110" /> : <st.icon size={14} className="transition-transform duration-200 group-hover:scale-110" />}{st.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mx-auto max-w-[740px]">
          <div key={i} className="swap-in">
            <Step />
          </div>
          <div className="sticky bottom-20 z-10 mt-8 flex gap-2 rounded-2xl border border-border bg-white/95 p-2 shadow-[var(--shadow-card)] backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <button type="button" className="btn-ghost shrink-0 whitespace-nowrap sm:flex-1" disabled={i === 0} onClick={() => go(i - 1)}><ArrowLeft size={16} />{T('আগের ধাপ', 'Back')}</button>
            {i < steps.length - 1
              ? <button type="button" className="btn-primary min-w-0 flex-[2] text-center" onClick={() => go(i + 1)}>{T(`পরের ধাপ: ${steps[i + 1].label}`, `Next: ${steps[i + 1].label}`)}<ArrowRight size={16} /></button>
              : <button type="button" className="btn-primary min-w-0 flex-[2] text-center" onClick={() => navigate('/farmer/today')}>{T('আজকের কাজ দেখুন', 'See today’s tasks')}<ArrowRight size={16} /></button>}
          </div>
        </div>
      </div>
      <StoryRail current={i} go={go} steps={steps} />
    </div>
  );
}

function StoryRail({ current, go, steps }) {
  const { s, T, L, decision: d, chosen, rotation: r, farmer, soil, water, tm } = useStore();
  const lang = s.lang;
  const out = [
    T(`${farmer.villageBn}, ${num(farmer.area_dec, 'bn')} শতক`, `${farmer.village}, ${farmer.area_dec} decimal`),
    T(`মার্চ-এপ্রিলে ৩৫°+ দিন: আগে ${num(tm.hotMarApr.then, 'bn', { dp: 1 })}, এখন ${num(tm.hotMarApr.now, 'bn', { dp: 1 })}`, `Days of 35 °C+ in Mar–Apr: ${num(tm.hotMarApr.then, 'en', { dp: 1 })} before, ${num(tm.hotMarApr.now, 'en', { dp: 1 })} now`),
    T(`pH ${num(soil.ph, 'bn', { dp: 1 })}, জৈব পদার্থ ${num(soil.om_pct, 'bn', { dp: 1 })}%`, `pH ${num(soil.ph, 'en', { dp: 1 })}, organic matter ${num(soil.om_pct, 'en', { dp: 1 })}%`),
    s.priorities.length ? s.priorities.map((p) => L(PRIORITIES[p])).join(T(' আর ', ' and ')) : T('সব দিক সমান', 'Everything equal'),
    `${L(LABEL_STYLE[d.label].short)}: ${L(d.rec.crop.name)}`,
    r.best ? `${L(chosen.crop.name)}, ${T('তারপর', 'then')} ${L(r.best.crop.name)}` : T('সরাসরি রোপা আমন', 'Straight to Aman'),
    T(`ঝুঁকি ${RISK_STYLE[chosen.glut.level].bn}`, `${chosen.glut.level} risk`),
  ];
  const after = [
    { to: '/farmer/today', icon: Droplets, label: T('আজকের কাজ', 'Today'), out: L(WATER_STYLE[water.color]) },
    { to: '/farmer/harvest', icon: Wheat, label: T('ফসল তোলা ও বিক্রি', 'Harvest and sale'), out: `${fmtDate(chosen.hw.start, lang)} – ${fmtDate(chosen.hw.end, lang)}` },
  ];
  return (
    <aside className="hidden lg:sticky lg:top-32 lg:block">
      <div className="surface-card spotlight-card lift rounded-[20px] p-5">
        <div className="font-display text-[18px] font-bold">{T('আপনার হিসাব এক নজরে', 'Your plan at a glance')}</div>
        <p className="mt-0.5 text-[13.5px] leading-5 text-muted">{T('যেকোনো ধাপে কিছু বদলালে বাকিগুলো নিজে থেকে নতুন করে হিসাব হয়।', 'Change anything and the rest is worked out again.')}</p>
        <ol className="relative ml-3 mt-4 space-y-3 border-l-2 border-primary-100">
          {steps.map((st, k) => (
            <li key={k} className="relative pl-5">
              <span className={`absolute -left-[11px] top-0.5 grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold transition-all duration-300 ${k === current ? 'bg-primary-800 text-white ring-4 ring-primary-100 scale-110 shadow-sm' : k < current ? 'bg-primary-600 text-white' : 'border-2 border-primary-200 bg-white text-muted'}`}>{num(k + 1, lang)}</span>
              <button type="button" onClick={() => go(k)} className="group text-left transition-transform duration-200 active:scale-[0.98]">
                <div className={`text-[14.5px] font-semibold transition-colors duration-200 ${k === current ? 'text-primary-800' : 'text-ink/80 group-hover:text-primary-700'}`}>{st.label}</div>
                <div className="text-[13px] text-muted transition-colors group-hover:text-ink/70">{out[k]}</div>
              </button>
            </li>
          ))}
          {after.map((a, k) => (
            <li key={a.to} className="relative pl-5">
              <span className="absolute -left-[11px] top-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-primary-200 bg-white text-[11px] font-bold text-ink/40 transition-transform duration-200 hover:scale-110">{num(steps.length + k + 1, lang)}</span>
              <Link to={a.to} className="group block transition-transform duration-200 active:scale-[0.98]">
                <div className="text-[14.5px] font-semibold text-ink/80 transition-colors group-hover:text-primary-700">{a.label}</div>
                <div className="text-[13px] text-muted transition-colors group-hover:text-ink/70">{a.out}</div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
