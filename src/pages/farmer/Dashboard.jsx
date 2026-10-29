import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Droplets, ScanLine, Sprout, Wheat, TrendingDown, LifeBuoy, MapPinned, CheckCircle2, MessageSquareText, ChevronRight, Telescope } from 'lucide-react';
import { useStore, demo } from '../../store';
import { Button, StatCard, Card, Note, Tags, LABEL_STYLE, RISK_STYLE, WATER_STYLE, ScoreRing, climateTag, CountUp } from '../../components/ui';
import Photo from '../../components/Photo';
import QuickPath from '../../components/explain/QuickPath';
import SeasonRibbon from '../../components/charts/SeasonRibbon';
import SeasonSoFar from '../../components/charts/SeasonSoFar';
import { WATER_COLORS, weatherAlerts } from '../../engine/water';
import { num, fmtDate, fmtRange, fmtBangla, daysBetween } from '../../engine/dates';
import { IRRIGATION } from '../../engine/crops';
import { LEVEL_LOOK } from '../../components/fields/look';
import { seriesNow } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';

export default function Dashboard() {
  const { s, dispatch, T, L, farmer, union, decision: d, chosen, rotation: r, water, weather, stage, today, myAdvisories, unreadAdvisories, confirmedPlan, landConfirmed, clim, myParcels } = useStore();
  // How each field looks from space (saved readings plus anything fetched on the My fields page).
  const fieldLevels = useMemo(() => Object.fromEntries(myParcels.map((p) => { const series = seriesNow(p); return [p.id, series.length ? readField({ series }, { today }).level : 'none']; })), [myParcels, today]);
  const lang = s.lang;
  const st = LABEL_STYLE[d.label];
  const ws = WATER_STYLE[water.color];
  const daysTo = daysBetween(today, chosen.hw.start);
  const openReqs = s.requests.filter((q) => q.farmerId === farmer.id && q.status === 'open').length;
  const goStep = (n) => dispatch({ type: 'set', patch: { step: n } });
  const planStep = confirmedPlan ? 7 : landConfirmed ? Math.min(s.step + 1, 7) : 0;
  const planProgress = confirmedPlan ? 100 : (planStep / 7) * 100;

  // One clear next step, in the order a farmer would naturally do things.
  const next = !landConfirmed
    ? { icon: MapPinned, title: T('প্রথমে মানচিত্রে আপনার জমি দেখান', 'First, show us your field on the map'), text: T('জমির জায়গা ঠিক হলে মাটি আর ইউনিয়নের হিসাব আপনার জমি ধরেই হবে।', 'Once your field is placed, the soil and union figures are worked out for it.'), cta: T('জমি বাছাই করুন', 'Mark my field'), to: '/farmer/farm' }
    : !confirmedPlan
      ? { icon: Sprout, title: T('এই রবির পরিকল্পনা শেষ করুন', 'Finish your plan for this Rabi'), text: T(`সাত ধাপের ${num(Math.min(s.step + 1, 7), 'bn')} নম্বরে আছেন। শেষ ধাপে পরিকল্পনা পাকা করলে কৃষি কর্মকর্তা দেখতে পাবেন।`, `You are on step ${Math.min(s.step + 1, 7)} of 7. Confirm the plan at the end so your officer can see it.`), cta: T('পরিকল্পনায় যান', 'Continue planning'), to: '/farmer/plan' }
      : { icon: Droplets, title: L(WATER_COLORS[water.color]), text: water.reasons[0] ? L(water.reasons[0]) : '', cta: T('আজকের কাজ দেখুন', 'See today'), to: '/farmer/today' };

  const alerts = [
    ...weatherAlerts(weather).map((a) => ({ tone: 'warn', text: L(a), to: '/farmer/today' })),
    ...(chosen.glut.level !== 'Low' ? [{ tone: 'gold', text: T(`ফসল তোলার সময় আপনার ইউনিয়নে দাম পড়ার ঝুঁকি ${RISK_STYLE[chosen.glut.level].bn}। তারিখ বদলে দেখতে পারেন।`, `${chosen.glut.level} price-drop risk in your union at harvest. Try another planting date.`), to: '/farmer/plan', step: 6 }] : []),
    ...myAdvisories.slice(0, 2).map((a) => ({ tone: 'info', text: a.text.split('\n')[0], to: '/farmer/help' })),
  ];

  return (
    <div className="space-y-6">
      <section data-tour="dash-hero" className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-primary-950 via-primary-900 to-sky-950 text-white shadow-xl ring-1 ring-white/15">
        <div className="absolute inset-0 -z-10"><Photo name="seedlings" fill sizes="(min-width: 1200px) 1200px, 100vw" priority /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,38,20,.94)_0%,rgba(13,38,20,.82)_50%,rgba(13,38,20,.35)_100%)]" /><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-500/15 blur-3xl" /></div>
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/20">{T(`আসসালামু আলাইকুম, ${farmer.name.bn}`, `Assalamu alaikum, ${farmer.name.en}`)}</p>
            <h1 className="mt-3 text-[30px] font-bold leading-tight sm:text-[42px]">{L(st)}<span className="grad-shine block">{T(`${chosen.crop.name.bn}, ${chosen.crop.action.bn} ${fmtBangla(chosen.t0, 'bn')}`, `${chosen.crop.name.en}, ${chosen.crop.action.en.toLowerCase()} ${fmtDate(chosen.t0, 'en')}`)}</span></h1>
            <p className="mt-3.5 max-w-xl text-[15.5px] leading-7 text-white/85">{T(`${farmer.villageBn}, ${union.meta.full.bn}। আপনার জমির জায়গা, মাটি, সেচের উৎস, ২৫ মৌসুমের আবহাওয়া আর পাশের কৃষকদের পরিকল্পনা মিলিয়ে এই পরামর্শ।`, `${farmer.village}, ${union.meta.full.en}. Based on your field, soil, water source, 25 seasons of weather and your neighbours’ plans.`)}</p>
            <div className="mt-4"><Tags list={[climateTag(), 'RULE']} /></div>
          </div>
          <div data-tour="dash-next" className="keep-solid glass rounded-[24px] !bg-white/95 p-5 text-ink shadow-[0_12px_36px_rgba(0,0,0,0.18)] border border-white/90 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-800 shadow-sm transition-transform duration-300 group-hover:scale-110"><next.icon size={24} /></span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold uppercase tracking-wider text-primary-700">{T('এখন যা করবেন', 'Your next step')}</div>
                <div className="font-display mt-0.5 text-[20px] font-bold leading-tight text-ink">{next.title}</div>
                <p className="mt-1 text-[14px] leading-6 text-muted">{next.text}</p>
              </div>
            </div>
            <div className="mt-4" data-tour="plan-progress">
              <div className="mb-1.5 flex items-center justify-between gap-2 text-[12.5px] font-semibold">
                <span className="text-muted">{!landConfirmed
                  ? T('পরিকল্পনার শুরু', 'Plan progress')
                  : confirmedPlan ? T('পরিকল্পনা পাকা', 'Plan confirmed') : T(`ধাপ ${num(planStep, 'bn')} / ৭`, `Step ${planStep} of 7`)}</span>
                <span className="text-primary-800 font-bold tabular">{num(planProgress, lang)}%</span>
              </div>
              <div role="progressbar" aria-label={T('পরিকল্পনার অগ্রগতি', 'Plan progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(planProgress)}
                className="h-2.5 overflow-hidden rounded-full bg-primary-100 shadow-inner">
                <div className="plan-progress-fill h-full rounded-full bg-gradient-to-r from-primary-500 via-primary-600 to-paddy-500 shadow-sm" style={{ width: `${planProgress}%` }} />
              </div>
              {!landConfirmed && <p className="mt-1.5 text-[11.5px] text-muted">{T('জমি বাছাই করলেই পরিকল্পনার ধাপ শুরু হবে।', 'Choose your field to begin the plan steps.')}</p>}
            </div>
            <Button to={next.to} className="mt-4 w-full shadow-md py-3 text-[15px] font-semibold">{next.cta}<ChevronRight size={17} /></Button>
          </div>
        </div>
      </section>

      <QuickPath />

      <Card className="p-5" data-tour="dash-year">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[20px] font-bold tracking-tight">{T('আপনার বছর, বাংলা মাসে', 'Your year, by Bangla month')}</h2>
          <div className="flex items-center gap-3"><ScoreRing value={chosen.score} size={40} /><Link to="/farmer/plan" onClick={() => goStep(4)} className="text-[14.5px] font-semibold text-primary-700 hover:underline">{T('পরামর্শ বদলে দেখুন', 'Explore other options')}</Link></div>
        </div>
        <SeasonRibbon />
      </Card>

      <div data-tour="dash-sofar"><SeasonSoFar clim={clim} lat={farmer.lat} lon={farmer.lon} /></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-stagger data-tour="dash-stats">
        <StatCard icon={Droplets} tone={ws.tone === 'red' ? 'red' : ws.tone === 'amber' ? 'amber' : 'green'} label={T('আজ সেচ', 'Water today')} value={L(WATER_COLORS[water.color])} note={L(stage)} to="/farmer/today" />
        <StatCard icon={TrendingDown} tone={chosen.glut.level === 'High' ? 'red' : chosen.glut.level === 'Medium' ? 'amber' : 'green'} label={T('দাম পড়ার ঝুঁকি', 'Price-drop risk')} value={L(RISK_STYLE[chosen.glut.level])} note={T(`ইউনিয়নের ${num(chosen.glut.share * 100, 'bn')}% জমিতে ${chosen.crop.name.bn}`, `${num(chosen.glut.share * 100, 'en')}% of the union is ${chosen.crop.name.en.toLowerCase()}`)} to="/farmer/plan" />
        <StatCard icon={Wheat} tone="amber" label={T('ফসল তোলা', 'Harvest')} value={daysTo > 0 ? <><CountUp value={daysTo} /> {T('দিন বাকি', 'days left')}</> : T('এখন চলছে', 'under way')} note={fmtRange(chosen.hw.start, chosen.hw.end, lang)} to="/farmer/harvest" />
        <StatCard icon={LifeBuoy} tone="violet" label={T('সাহায্য', 'Help')} value={T(`${num(openReqs, 'bn')}টি অপেক্ষায়`, `${openReqs} waiting`)} note={unreadAdvisories ? T(`${num(unreadAdvisories, 'bn')}টি নতুন বার্তা`, `${unreadAdvisories} new message${unreadAdvisories > 1 ? 's' : ''}`) : T('নতুন বার্তা নেই', 'No new messages')} to="/farmer/help" />
      </div>

      <Link to="/farmer/future" data-tour="dash-future" className="lift group flex items-center gap-4 overflow-hidden rounded-[22px] bg-gradient-to-r from-primary-950 via-primary-900 to-sky-900 p-5 text-white shadow-[var(--shadow-lift)] ring-1 ring-white/15 transition-all duration-300 hover:shadow-2xl">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"><Telescope size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-bold tracking-tight">{T('জমির ভবিষ্যৎ: ১০ বছরের ফসলচক্র', 'Field future: ten years of rotation')}</span>
          <span className="block text-[13.5px] leading-6 text-white/80">{T('কোন ফসলচক্রে আপনার মাটি ভালো থাকে, পানি বাঁচে, আয় বাড়ে, আজ আর নাসার ২০৪০-এর দশকের আবহাওয়ায়', 'Which rotation keeps your soil good, saves water and pays, today and in NASA’s 2040s')}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="p-5 sm:p-6" data-tour="dash-week">
          <h2 className="text-[20px] font-bold tracking-tight">{T('এই সপ্তাহের কাজ', 'This week')}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3" data-stagger>
            {[
              [Droplets, L(WATER_COLORS[water.color]), water.reasons[0] ? L(water.reasons[0]) : '', '/farmer/today'],
              [ScanLine, T('পাতা দেখে নিন', 'Check the leaves'), T('দাগ বা পোকা দেখলে ছবি তুলে পাঠান', 'Photograph any spots or pests and send them'), '/farmer/doctor'],
              confirmedPlan
                ? [Sprout, T('পরের ফসলের কথা ভাবুন', 'Think about the next crop'), r.best ? T(`তোলার পর ${r.best.crop.name.bn}`, `${r.best.crop.name.en} after harvest`) : T('সরাসরি রোপা আমন', 'Straight to Aman'), '/farmer/plan', 5]
                : [CheckCircle2, T('পরিকল্পনা পাকা করুন', 'Confirm your plan'), T('তাহলে কৃষি কর্মকর্তা দেখতে পাবেন', 'So your officer can see it'), '/farmer/plan', 6],
            ].map(([Icon, t, dsc, to, step]) => (
              <Link key={t} to={to} onClick={() => step != null && goStep(step)} className="group flex items-start gap-3.5 rounded-2xl border border-border/80 bg-white/85 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-primary-300 hover:bg-primary-50/70 hover:shadow-md active:scale-[0.98] shadow-2xs">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-100/80 text-primary-800 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary-200/80">
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold leading-snug text-ink">{t}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-muted">{dsc}</span>
                </span>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-5 sm:p-6" data-tour="dash-alerts">
          <h2 className="text-[20px] font-bold">{T('খবর ও সতর্কতা', 'Alerts and messages')}</h2>
          <div className="mt-4 space-y-2.5">
            {alerts.length === 0 && <Note tone="ok">{T('এখন কোনো সতর্কতা নেই।', 'Nothing to worry about right now.')}</Note>}
            {alerts.map((a, i) => (
              <Link key={i} to={a.to} onClick={() => a.step != null && goStep(a.step)} className="block">
                <Note tone={a.tone}><span className="line-clamp-3">{a.text}</span></Note>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-canvas p-3.5 text-[14px] leading-6">
            {myParcels.length > 1 ? (
              <>
                <div className="font-semibold">{T(`আপনার ${num(myParcels.length, 'bn')}টি জমি, মোট ${num(myParcels.reduce((a, p) => a + p.area_dec, 0) / 33, 'bn', { dp: 1 })} বিঘা`, `Your ${myParcels.length} fields, ${num(myParcels.reduce((a, p) => a + p.area_dec, 0) / 33, 'en', { dp: 1 })} bigha`)}</div>
                <ul className="mt-1 space-y-0.5">
                  {myParcels.map((p) => { const lv = fieldLevels[p.id] ?? 'none'; const look = LEVEL_LOOK[lv]; return (
                    <li key={p.id} className="flex items-center gap-2 text-muted"><look.icon size={14} style={{ color: look.color }} aria-label={L(look)} /><span className="truncate">{L(p.name)}</span>{lv !== 'ok' && lv !== 'none' && <span className="ml-auto shrink-0 text-[12.5px] font-semibold" style={{ color: look.color }}>{L(look)}</span>}</li>
                  ); })}
                </ul>
              </>
            ) : (
              <>
                <div className="font-semibold">{T('আপনার জমি', 'Your field')}</div>
                <div className="text-muted">{T(`${num(farmer.area_dec, 'bn')} শতক, ${IRRIGATION[farmer.irrigation].bn}, ${demo.unions.find((u) => u.id === farmer.union).bn}`, `${farmer.area_dec} decimal, ${IRRIGATION[farmer.irrigation].en.toLowerCase()}, ${farmer.union}`)}</div>
              </>
            )}
            <Link to="/farmer/farm" className="mt-1 inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline">{myParcels.length > 1 ? T('উপগ্রহে সব জমি দেখুন', 'See every field from space') : T('মানচিত্রে দেখুন', 'View on the map')}<ChevronRight size={15} /></Link>
          </div>
        </Card>
      </div>

      {unreadAdvisories > 0 && (
        <Link to="/farmer/help" className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-[15px] font-semibold text-primary-900">
          <MessageSquareText size={19} />{T(`কৃষি কর্মকর্তার ${num(unreadAdvisories, 'bn')}টি নতুন বার্তা এসেছে`, `${unreadAdvisories} new message${unreadAdvisories > 1 ? 's' : ''} from your officer`)}<ChevronRight size={17} className="ml-auto" />
        </Link>
      )}
    </div>
  );
}
