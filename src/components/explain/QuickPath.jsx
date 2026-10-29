// The short path for a first visit, four steps and no more: choose the field, say what matters, compare the options,
// talk it over with the officer. Each opens the right place; the deeper analysis stays one tap further on.
import { useNavigate } from 'react-router-dom';
import { MapPinned, SlidersHorizontal, Columns3, UserRoundCheck, CheckCircle2, ChevronRight } from 'lucide-react';
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
    { icon: Columns3, k: T('বিকল্প মিলিয়ে দেখুন', 'Compare the options'), sub: T('এখনকার ফসল বনাম বিকল্প, কেন', 'Now against the alternatives, and why'), done: s.step >= 4, run: () => { go('/farmer/plan', 4); setTimeout(() => document.getElementById('season-compare')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400); } },
    { icon: UserRoundCheck, k: T('কর্মকর্তার সঙ্গে আলোচনা', 'Talk it over with the officer'), sub: asked ? T('পাঠানো হয়েছে', 'Sent') : T('সিদ্ধান্তের আগে', 'Before you decide'), done: asked, run: () => go('/farmer/help') },
  ];
  const n = steps.filter((x) => x.done).length;
  return (
    <section data-tour="quick-path" aria-label={T('শুরু করুন চার ধাপে', 'Start in four steps')} className="rounded-[24px] border border-primary-200 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-bold">{T('শুরু করুন চার ধাপে', 'Start in four steps')}</h2>
        <span className="text-[13px] font-semibold text-muted">{T(`৪টির মধ্যে ${num(n, 'bn')}টি হয়েছে`, `${n} of 4 done`)}</span>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((x, i) => (
          <li key={i}>
            <button type="button" onClick={x.run} className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.98] ${x.done ? 'border-primary-200 bg-primary-50/70' : 'border-border bg-canvas hover:border-primary-300'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${x.done ? 'bg-primary-700 text-white' : 'bg-white text-primary-700 ring-1 ring-primary-200'}`}>{x.done ? <CheckCircle2 size={19} /> : <x.icon size={19} />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-muted">{T(`ধাপ ${num(i + 1, 'bn')}`, `Step ${i + 1}`)}</span>
                <span className="block text-[15px] font-bold leading-tight">{x.k}</span>
                <span className="block text-[12.5px] text-muted">{x.sub}</span>
              </span>
              <ChevronRight size={17} className="shrink-0 text-ink/35" />
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[12.5px] text-muted">{T('বাকি সব (দশ বছরের ভবিষ্যৎ, উপগ্রহ, আবহাওয়ার খুঁটিনাটি) পরে, যখন দরকার।', 'Everything else (the ten-year future, satellites, weather detail) is there later, when you want it.')}</p>
    </section>
  );
}
