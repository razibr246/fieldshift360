// The short path for a first visit, four steps and no more: choose the field, say what matters, compare the options,
// talk it over with the officer. Each opens the right place; the deeper analysis stays one tap further on.
import { useNavigate } from 'react-router-dom';
import { MapPinned, SlidersHorizontal, Columns3, UserRoundCheck, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { num } from '../../engine/dates';

export default function QuickPath() {
  const { s, T, dispatch, activeParcel, farmer } = useStore();
  const nav = useNavigate();
  const go = (path, step) => { if (step != null) dispatch({ type: 'set', patch: { step } }); nav(path); };
  const asked = s.requests.some((r) => r.farmerId === farmer.id && r.mine);
  const steps = [
    { icon: MapPinned, k: T('জমি বাছুন', 'Choose your field'), sub: activeParcel ? T('বাছা হয়েছে', 'Done') : T('মানচিত্রে জমি দিন', 'Put it on the map'), done: !!activeParcel, run: () => go('/farmer/plan', 0) },
    { icon: SlidersHorizontal, k: T('কী চান বলুন', 'Say what matters'), sub: s.priorities.length ? T('বাছা হয়েছে', 'Done') : T('পানি, আয়, ঝুঁকি, মাটি...', 'Water, income, risk, soil…'), done: s.priorities.length > 0, run: () => go('/farmer/plan', 3) },
    { icon: Columns3, k: T('ফসলচক্র মিলিয়ে দেখুন', 'Compare the rotations'), sub: T('এখনকার চাষ বনাম বিকল্প: কেন, ঝুঁকি, কী যাচাই', 'Now against the alternatives: why, risks, what to check'), done: !!s.sawStrategies, run: () => { nav('/farmer/future'); setTimeout(() => document.getElementById('ff-strategies')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 900); } },
    { icon: UserRoundCheck, k: T('কর্মকর্তার সঙ্গে আলোচনা', 'Talk it over with the officer'), sub: asked ? T('পাঠানো হয়েছে', 'Sent') : T('সিদ্ধান্তের আগে', 'Before you decide'), done: asked, run: () => go('/farmer/help') },
  ];
  const n = steps.filter((x) => x.done).length;
  const pct = Math.round((n / steps.length) * 100);

  return (
    <section data-tour="quick-path" aria-label={T('শুরু করুন চার ধাপে', 'Start in four steps')} className="surface-card rounded-[26px] border border-primary-200/90 bg-white/95 p-4 shadow-[var(--shadow-card)] backdrop-blur-md transition-all duration-300 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-bold text-ink">{T('শুরু করুন চার ধাপে', 'Start in four steps')}</h2>
          {n === steps.length && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-800 shadow-2xs">
              <Sparkles size={12} className="text-emerald-700" />
              {T('সব ধাপ সম্পন্ন!', 'All steps complete!')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <span className="tabular font-bold text-primary-800">{T(`৪টির মধ্যে ${num(n, 'bn')}টি হয়েছে`, `${n} of 4 done`)}</span>
          <span className="text-muted/40">·</span>
          <span className="tabular font-bold text-primary-700">{pct}%</span>
        </div>
      </div>

      {/* Fluid progress track */}
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06] shadow-inner" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-paddy-500 transition-all duration-500 ease-[var(--ease-spring)]" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <ol className="mt-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((x, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={x.run}
              className={`group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[.97] cursor-pointer ${
                x.done
                  ? 'border-primary-300/80 bg-primary-50/70 shadow-2xs'
                  : 'border-border/80 bg-canvas/80 hover:border-primary-300 hover:bg-white'
              }`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-2xs transition-transform duration-300 group-hover:scale-105 ${
                  x.done
                    ? 'bg-primary-700 text-white shadow-primary-700/30'
                    : 'bg-white text-primary-700 ring-1 ring-primary-200'
                }`}
              >
                {x.done ? <CheckCircle2 size={19} className="text-white" /> : <x.icon size={19} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted">
                  {T(`ধাপ ${num(i + 1, 'bn')}`, `Step ${i + 1}`)}
                </span>
                <span className="block text-[15px] font-bold leading-tight text-ink group-hover:text-primary-900 transition-colors">
                  {x.k}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {x.sub}
                </span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-muted/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary-700" />
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted">
        {T('বাকি সব (দশ বছরের ভবিষ্যৎ, উপগ্রহ, আবহাওয়ার খুঁটিনাটি) পরে, যখন দরকার।', 'Everything else (the ten-year future, satellites, weather detail) is there later, when you want it.')}
      </p>
    </section>
  );
}
