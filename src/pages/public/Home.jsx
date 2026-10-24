import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Pause, Play, MapPinned, Sprout, ShieldCheck, CloudSun, Layers, SlidersHorizontal, RefreshCw, TrendingDown, Droplets, Wheat, Satellite, Mic, Radar as RadarIcon, Swords, ScanLine, LifeBuoy, Clapperboard } from 'lucide-react';
import { Button, Tags, LABEL_STYLE, ScoreRing, climateTag } from '../../components/ui';
import BrandMark from '../../components/brand/BrandMark';
import { IMAGES } from '../../assets/images';
import Photo from '../../components/Photo';
import { onScroll } from '../../components/Motion';
import SeasonRibbon from '../../components/charts/SeasonRibbon';
import LiveWeather from '../../components/charts/LiveWeather';
import RainCheck from '../../components/charts/RainCheck';
// The whole-country section carries 250 KB of district data; it loads on its own, after the top of the page.
const CountryCrops = lazy(() => import('../../components/charts/CountryCrops'));
// The ten-year rotation teaser runs the Field Future engine; it loads on its own too.
const RotationTeaser = lazy(() => import('../../components/charts/RotationTeaser'));
import ClimateShift from '../../components/charts/ClimateShift';
import { LazyMount } from '../../components/SectionNav';
import NeighbourPhotos from '../../components/NeighbourPhotos';
import { useStore } from '../../store';
import { startTour } from '../../components/DemoTour';
import { num, fmtDate, fmtBangla, banglaDate, daysBetween, bnDigits } from '../../engine/dates';
import { THEN, NOW } from '../../engine/climate';
import { PROJECT_NAME, PROJECT_TAGLINE, PROJECT_EVENT, PROJECT_TEAM } from '../../config/brand';

export default function Home() {
  const { s, T, L, decision: d, dispatch, today } = useStore();
  const navigate = useNavigate();
  const lang = s.lang;
  const st = LABEL_STYLE[d.label];
  const gallery = useHeroGallery();
  const steps = [
    [MapPinned, T('জমি দেখান', 'Mark your field'), T('মানচিত্রে পিন বসিয়ে জমির জায়গা, মাপ আর সেচের উৎস দিন।', 'Drop a pin on the map and add the size and water source.')],
    [CloudSun, T('আবহাওয়ার আগে-পরে', 'See how the weather changed'), T('২০০১ থেকে ২০২৫ পর্যন্ত ২৫ মৌসুমের নাসার তথ্যে আপনার এলাকা।', 'Your area in 25 seasons of NASA weather, 2001 to 2025.')],
    [Layers, T('মাটি বুঝে নিন', 'Know your soil'), T('এলাকার মাটি টক না ক্ষারীয়, জৈব পদার্থ কতটা, পানি নামে কিনা।', 'How acidic the soil is, how much organic matter, how it drains.')],
    [SlidersHorizontal, T('আপনার চাওয়া বলুন', 'Say what matters to you'), T('কম সেচ, বেশি আয়, কম ঝুঁকি, ভালো মাটি, নাকি আগাম ফসল।', 'Less water, more income, less risk, better soil or an early harvest.')],
    [Sprout, T('সুপারিশ আর কারণ', 'Get a recommendation'), T('একই ফসল, সময় বদল, না অন্য ফসল — প্রতিটির পেছনের হিসাব সহ।', 'Keep, adjust or shift — with the working behind each one.')],
    [RefreshCw, T('পরের মৌসুম', 'Plan the next crop'), T('এই ফসলের পর কী লাগালে মাটির উপকার হয়, আর পাশের সবাই কী লাগাচ্ছে।', 'What to grow after this crop, and what your neighbours are planting.')],
  ];
  return (
    <>
      {/* Hero: the dawn aerial with its open haze on the left for the headline. */}
      <section className="relative isolate overflow-hidden" {...swipe(gallery)}>
        <HeroBackdrop gallery={gallery} />
        <div className="page-shell pb-10 pt-[120px] sm:pt-[140px]">
          <div className="hero-rise max-w-[600px]">
            <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shadow-[0_0_0_3px_rgba(67,134,58,.18)]" />{T('রবি মৌসুম ২০২৬–২৭', 'Rabi season 2026–27')}
            </p>
            {/* Apple-style headline: two short lines, the second in a soft green gradient. */}
            <h1 className="mt-5 text-[46px] font-semibold leading-[1.12] tracking-[-0.03em] text-primary-950 sm:text-[62px] lg:text-[76px]">
              <span className="block">{T('ঠিক ফসল।', 'The right crop.')}</span>
              <span className="block bg-[linear-gradient(100deg,#245a28_0%,#43863a_45%,#237479_100%)] bg-clip-text pb-2 text-transparent">{T('ঠিক সময়ে।', 'At the right time.')}</span>
            </h1>
            <p className="mt-5 max-w-[33rem] text-[18px] leading-[1.65] tracking-[-0.005em] text-ink/70 sm:text-[20px]">
              {T(<>আপনার জমির মাটি, <span className="font-medium text-ink">২৫ বছরের নাসার আবহাওয়া</span> আর পাশের কৃষকেরা কী লাগাচ্ছেন — সব মিলিয়ে {PROJECT_NAME} বলে দেয় কোন ফসল, কবে লাগালে <span className="font-medium text-ink">লাভ বেশি, ঝুঁকি কম</span>।</>,
                <>Your soil, <span className="font-medium text-ink">25 years of NASA weather</span> and what your neighbours are planting — {PROJECT_NAME} weighs it all and tells you which crop to sow, and when, for <span className="font-medium text-ink">more profit and less risk</span>.</>)}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button to="/farmer/plan" className="btn-gloss !rounded-full px-6 py-3 text-[16px]"><Sprout size={19} />{T('আমার জমির হিসাব দেখুন', 'Work out my field')}</Button>
              <Button to="/officer" variant="ghost" className="glass-pill !rounded-full px-6 py-3 text-[16px]"><ShieldCheck size={19} />{T('কৃষি কর্মকর্তার পাতা', 'Officer view')}</Button>
              <button type="button" onClick={() => startTour(dispatch, navigate)} className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-primary-800"><Clapperboard size={19} />{T('৩ মিনিটের ডেমো গল্প', '3-minute demo story')}</button>
            </div>
            <HeroGalleryPill gallery={gallery} />
          </div>

          <LiveWeather className="mt-12 lg:mt-16" />

          <div className="glass lite mt-5 rounded-[26px] !bg-white/75 p-5 sm:p-6" style={{ animation: 'rise 1.2s var(--ease-smooth) .65s both' }}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center"><ScoreRing value={d.rec.score} size={58} /><span className="mt-0.5 whitespace-nowrap text-[11px] text-muted">{T('১০০-এর মধ্যে', 'out of 100')}</span></div>
                <div>
                  <p className="font-display text-[22px] font-bold leading-tight sm:text-[26px]"><span className={st.text}>{L(st)}</span>: {L(d.rec.crop.name)}</p>
                  <p className="mt-1 text-[15px] font-semibold text-ink/85">{(() => {
                    const left = daysBetween(today, d.rec.t0), y = banglaDate(d.rec.t0).year;
                    const when = T(`লাগানোর দিন ${fmtBangla(d.rec.t0, 'bn')} ${bnDigits(y)} (${fmtDate(d.rec.t0, 'bn')})`, `Plant on ${fmtDate(d.rec.t0, 'en')} (${fmtBangla(d.rec.t0, 'en')} ${y})`);
                    const cd = left > 0 ? T(`আর ${num(left, 'bn')} দিন`, `${left} days to go`) : left === 0 ? T('আজই', 'today') : T(`${num(-left, 'bn')} দিন আগে পেরিয়েছে`, `${-left} days ago`);
                    return <>{when} · <span className={left < 0 ? 'text-clay-700' : 'text-paddy-700'}>{cd}</span></>;
                  })()}</p>
                  <p className="mt-1 text-[13.5px] text-muted">{(() => {
                    const r = (a) => `${a[0]}–${a[a.length - 1]}`, { then, now } = d.rec.bt;
                    return T(`এই দিনে লাগালে আবহাওয়া ঠিক ছিল: এখন (${bnDigits(r(NOW))}) ${num(now.n, 'bn')} মৌসুমের ${num(now.safe, 'bn')}টিতে, আগে (${bnDigits(r(THEN))}) ${num(then.n, 'bn')}টির ${num(then.safe, 'bn')}টিতে`,
                      `Planted on this day, the weather was fine in ${now.safe} of ${now.n} seasons now (${r(NOW)}) and ${then.safe} of ${then.n} before (${r(THEN)})`);
                  })()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2"><Tags list={[climateTag(), 'RULE']} /><Link to="/farmer/plan" className="text-[14.5px] font-semibold text-primary-700 underline-offset-4 hover:underline">{T('পুরো হিসাব দেখুন', 'See the full working')}</Link></div>
            </div>
            <div className="mt-5"><SeasonRibbon /></div>
          </div>
        </div>
      </section>

      <LazyMount height={640}><Suspense fallback={<section className="py-14"><div className="page-shell min-h-[600px]" /></section>}><RotationTeaser /></Suspense></LazyMount>

      <Suspense fallback={<section className="py-16 sm:py-20"><div className="page-shell min-h-[760px]" /></section>}><CountryCrops /></Suspense>

      {/* Climate risk: the drought/flood split photo beside 25 seasons of NASA data for Godagari or Dhamrai. */}
      <div id="climate-shift" className="scroll-mt-20"><LazyMount height={720}><ClimateShift /></LazyMount></div>
      <NeighbourPhotos />

      {/* How it works: a real sequence, so it is numbered. */}
      <section id="how" className="scroll-mt-20 py-16 sm:py-20">
        <div className="page-shell">
          <div data-reveal className="max-w-2xl">
            <h2 className="text-[32px] font-bold sm:text-[40px]">{T('ছয় ধাপে পুরো মৌসুমের হিসাব', 'The whole season in six steps')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('প্রতিটি ধাপের উত্তর পরের ধাপে কাজে লাগে। আপনার কোনো পছন্দ বদলালে বাকি সব হিসাব সঙ্গে সঙ্গে নতুন করে হয়।', 'Each answer feeds the next step. Change any choice and everything after it is worked out again straight away.')}</p>
          </div>
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map(([Icon, t, d2], i) => (
              <li key={t} data-reveal style={{ '--d': `${(i % 3) * 110}ms` }} className="lift glass flat spotlight-card group relative rounded-[24px] p-6 pr-16 transition-all hover:border-primary-300">
                <span className="btn-gloss font-display absolute right-5 top-5 grid h-8 min-w-8 place-items-center rounded-full px-2 text-[14px] font-bold text-white shadow-md transition-transform duration-300 group-hover:scale-110">{num(i + 1, lang)}</span>
                <div className="flex items-center gap-2"><Icon size={19} className="text-primary-600 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary-700" /><h3 className="text-[19px] font-bold">{t}</h3></div>
                <p className="mt-1.5 text-[15px] leading-7 text-muted">{d2}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Game teaser: learn the tools by living one season of problems. */}
      <section className="py-8 sm:py-12">
        <div className="page-shell">
          <div data-reveal className="glass flat spotlight-card relative overflow-hidden rounded-[30px] p-7 sm:p-10">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(237,192,103,.45),transparent_70%)]" />
            <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(67,134,58,.28),transparent_70%)]" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Swords size={15} />{T('খেলে শিখুন', 'Learn by playing')}</p>
                <h2 className="mt-4 text-[32px] font-semibold tracking-[-0.025em] sm:text-[42px]">{T('মাঠের লড়াই: এক মৌসুমের গল্প', 'Field Fight: one season\'s story')}</h2>
                <p className="mt-3 max-w-xl text-[17px] leading-8 text-ink/70">{T('খরা, কুয়াশা, পোকা, দাম পড়া — রহিম ভাইয়ের মাঠে ছয় মাসে ছয়টা বিপদ। আগের অভ্যাসে চলবেন, নাকি FieldShift-এর হাতিয়ার দিয়ে লড়বেন? খেলতে খেলতেই শিখে যান কোন সমস্যায় কোন পাতা।', 'Drought, fog, pests, a price crash — six problems in six months on Rahim\'s field. Follow the old habit, or fight back with FieldShift\'s tools? Learn which page solves which problem, just by playing.')}</p>
                <div className="mt-6 flex flex-wrap gap-3"><Link to="/farm" className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white transition-transform hover:scale-105 active:scale-95"><Sprout size={18} />{T('খামারের খেলা — মাঠের মানুষ', 'Farm game — Field Folk')}</Link><Link to="/play" className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold transition-transform hover:scale-105 active:scale-95"><Swords size={18} />{T('গল্পের খেলা', 'Story game')}</Link></div>
              </div>
              <div className="flex flex-wrap justify-center gap-2.5 lg:justify-end">
                {[[CloudSun, T('খরা', 'Drought'), 'from-amber-300 to-orange-500'], [Layers, T('কুয়াশা', 'Fog'), 'from-slate-300 to-slate-500'], [ScanLine, T('পাতায় দাগ', 'Leaf spots'), 'from-violet-400 to-violet-700'], [TrendingDown, T('দাম পড়া', 'Price crash'), 'from-paddy-300 to-clay-500'], [Droplets, T('সেচ', 'Irrigation'), 'from-sky-300 to-sky-700'], [LifeBuoy, T('পোকা', 'Pests'), 'from-rose-400 to-red-600']].map(([Icon, l, g], k) => (
                  <span key={l} className="lift glass-pill drift group inline-flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-[15px] font-semibold transition-all hover:scale-105 active:scale-95" style={{ animationDelay: `${k * -0.9}s` }}>
                    <span className={`grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br ${g} text-white shadow-sm transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110`}><Icon size={16} /></span>{l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Your field: the aerial with outlined plots. */}
      <section id="land" className="scroll-mt-20 py-16 sm:py-20">
        <div className="page-shell">
          <div data-reveal className="relative overflow-hidden rounded-[26px] bg-primary-950">
            <div className="relative aspect-[16/11] sm:aspect-[16/8] lg:aspect-[16/7]">
              <Photo name="landParcels" fill sizes="(min-width: 1200px) 1200px, 100vw" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,38,20,0)_45%,rgba(13,38,20,.75)_100%)] lg:bg-[linear-gradient(90deg,rgba(13,38,20,.0)_40%,rgba(13,38,20,.82)_100%)]" />
            </div>
            <div className="relative bg-primary-950 p-6 text-white sm:p-8 lg:absolute lg:inset-y-6 lg:right-6 lg:flex lg:w-[40%] lg:flex-col lg:justify-center lg:rounded-[24px] lg:border lg:border-white/20 lg:bg-primary-950/35 lg:shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_20px_50px_-20px_rgba(0,0,0,.6)] lg:backdrop-blur-2xl lg:backdrop-saturate-150">
              <h2 className="text-[30px] font-bold sm:text-[36px]">{T('আগে নিজের জমিটা দেখিয়ে দিন', 'Start by showing us your field')}</h2>
              <p className="mt-3 text-[16px] leading-8 text-white/85">{T('উপগ্রহের ছবিতে নিজের জমি খুঁজে পিন বসান, অথবা গ্রামের নাম লিখে খুঁজুন। জমি কোন ইউনিয়নে, সেখানকার মাটি কেমন — সব এখান থেকেই ঠিক হয়।', 'Find your field on the satellite map and drop a pin, or search by village name. Your union and its soil are worked out from there.')}</p>
              <ul className="mt-4 space-y-1.5 text-[15px] text-white/85">
                <li>{T('পিন টেনে সরানো যায়, মানচিত্রে চাপ দিলেও বসে', 'Drag the pin, or tap the map to place it')}</li>
                <li>{T('জমির মাপ শতক বা বিঘায় দিন', 'Enter the size in decimal or bigha')}</li>
                <li>{T('ফোনের লোকেশন দিয়েও খোঁজা যায়', 'Or use your phone’s location')}</li>
              </ul>
              <div className="mt-6"><Button to="/farmer/farm" variant="light" className="px-5 py-3"><MapPinned size={18} />{T('মানচিত্রে জমি বাছাই করুন', 'Mark my field on the map')}</Button></div>
            </div>
          </div>
        </div>
      </section>

      {/* Recommendation: the seedlings photo beside the three possible answers. */}
      <section className="py-16 sm:py-20">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
          <div data-reveal className="order-2 lg:order-1">
            <h2 className="text-[32px] font-bold sm:text-[40px]">{T('তিনটির একটি পরামর্শ, সঙ্গে কারণ', 'One of three answers, always with the reason')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('পাঁচটি রবি ফসল, প্রতিটি তিনটি আলাদা তারিখে লাগালে গত ২৫ মৌসুমে কী হতো — সেই হিসাব, আপনার মাটি, সেচ, লাভ আর চাওয়ার সঙ্গে মিলিয়ে।', 'Five Rabi crops, each at three planting dates, replayed through the last 25 seasons and weighed against your soil, water, profit and priorities.')}</p>
            <div className="mt-6 space-y-3">
              {['KEEP', 'ADJUST', 'SHIFT'].map((k) => {
                const x = LABEL_STYLE[k];
                const body = { KEEP: T('আপনার আগের ফসলই এখনও সবচেয়ে ভালো, স্বাভাবিক সময়ে।', 'Your usual crop at the usual time is still the best choice.'), ADJUST: T('একই ফসল, তবে দুই সপ্তাহ আগে বা পরে লাগালে ঝুঁকি কমে।', 'Same crop, but two weeks earlier or later lowers the risk.'), SHIFT: T('অন্য একটি ফসল এই মৌসুমে আপনার জমিতে স্পষ্টভাবে ভালো।', 'Another crop clearly does better on your field this season.') }[k];
                return (
                  <div key={k} className="lift glass flat spotlight-card group flex gap-4 rounded-[20px] p-4 transition-all hover:border-primary-300">
                    <span className={`mt-1 h-10 w-1.5 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-y-110 ${x.bg}`} />
                    <div><div className={`font-display text-[19px] font-bold transition-transform duration-300 group-hover:translate-x-0.5 ${x.text}`}>{L(x)}</div><p className="text-[15px] leading-7 text-muted">{body}</p></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-[14px] text-muted"><TrendingDown size={16} className="text-paddy-700" />{T('সবাই একসঙ্গে একই ফসল লাগালে দাম পড়ে যায় — সেই ঝুঁকিও দেখানো হয়।', 'When everyone plants the same crop at once prices fall — that risk is shown too.')}</div>
          </div>
          <figure data-reveal style={{ '--d': '120ms' }} className="order-1 overflow-hidden rounded-[22px] shadow-[var(--shadow-card)] lg:order-2">
            <Photo name="seedlings" sizes="(min-width: 1024px) 600px, 100vw" />
          </figure>
        </div>
      </section>

      {/* Data sources over the satellite patchwork. */}
      <section id="data" className="relative isolate scroll-mt-20 overflow-hidden py-16 text-white sm:py-24">
        <div className="absolute inset-0 -z-10"><Photo name="satellite" fill sizes="100vw" decorative /><div className="absolute inset-0 bg-primary-950/85" /></div>
        <div className="page-shell grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
          <div data-reveal>
            <Satellite size={30} className="text-paddy-300" />
            <h2 className="mt-4 text-[32px] font-bold sm:text-[40px]">{T('যে তথ্য দিয়ে হিসাব হয়', 'The data behind every answer')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-white/80">{T('প্রতিটি ফলাফলের পাশে লেখা থাকে সেটা আসল তথ্য, নিয়মে হিসাব, AI, না নমুনা। উপগ্রহ আপনার জমির মাটি মাপে না — এলাকার মাপ এলাকার মাপ হিসেবেই দেখাই।', 'Every result is marked as real data, rule-based, AI or demo. Satellites do not measure your own plot’s soil, so area-level numbers are shown as exactly that.')}</p>
          </div>
          <div data-reveal style={{ '--d': '120ms' }} className="space-y-5">
          <div className="overflow-x-auto rounded-2xl border border-white/15 bg-white/[.07] shadow-[inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-md">
            <table className="w-full min-w-[520px] text-left text-[14.5px]">
              <thead className="text-[13px] text-white/80"><tr><th className="px-4 py-3 font-semibold">{T('তথ্য', 'Dataset')}</th><th className="px-4 py-3 font-semibold">{T('কত বড় এলাকার', 'Scale')}</th><th className="px-4 py-3 font-semibold">{T('কী কাজে লাগে', 'Used for')}</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {[
                  [T('নাসা POWER', 'NASA POWER'), T('প্রায় ৫০ কিলোমিটার', 'about 50 km'), T('তাপমাত্রা, বৃষ্টি, ২৫ মৌসুমের হিসাব, ফসল তোলার সময়', 'Temperature, rain, the 25-season check, harvest timing')],
                  [T('নাসা/জাক্সা GPM IMERG', 'NASA/JAXA GPM IMERG'), T('প্রায় ১১ কিলোমিটার', 'about 11 km'), T('উপগ্রহের বৃষ্টি দিয়ে নাসা POWER-এর বৃষ্টি মিলিয়ে দেখা (নিচের চার্ট)', 'Independent satellite rainfall that checks NASA POWER (chart below)')],
                  [T('নাসা GIBS · HLS (ল্যান্ডস্যাট-সেন্টিনেল)', 'NASA GIBS · HLS (Landsat-Sentinel)'), T('৩০ মিটার', '30 m'), T('মানচিত্রে মৌসুমভর জমির উপগ্রহ ছবি', 'Satellite photos of the fields through the season, on the map')],
                  [T('মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট', 'SRDI soil guide'), T('ইউনিয়ন', 'union'), T('মাটির pH, জৈব পদার্থ, নাইট্রোজেন-ফসফরাস-পটাশ', 'Soil pH, organic matter, NPK')],
                  ['Open-Meteo', T('প্রায় ১০ কিলোমিটার', 'about 10 km'), T('লাইভ আবহাওয়া, ৮ দিনের পূর্বাভাস আর আজকের সেচের পরামর্শ (ইন্টারনেট থাকলে)', 'Live weather, the 8-day forecast and today’s irrigation advice (when online)')],
                  [T('নমুনা কৃষক ও পরিকল্পনা', 'Sample farmers and plans'), '—', T('দাম পড়ার সতর্কতা, কর্মকর্তার কাজ দেখানো', 'Price-drop warning and the officer workflow')],
                ].map((r2) => <tr key={r2[0]}>{r2.map((c, i) => <td key={i} className={`px-4 py-3 ${i === 0 ? 'font-semibold' : 'text-white/75'}`}>{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <RainCheck />
          </div>
        </div>
      </section>

      {/* People: the farmer photo with the officer support story. */}
      <section id="officer" className="scroll-mt-20 py-16 sm:py-20">
        <div className="page-shell grid items-stretch gap-8 lg:grid-cols-[1.05fr_1fr]">
          <figure data-reveal className="relative min-h-[320px] overflow-hidden rounded-[22px] shadow-[var(--shadow-card)]">
            <Photo name="farmer" fill sizes="(min-width: 1024px) 620px, 100vw" />
          </figure>
          <div data-reveal style={{ '--d': '120ms' }} className="flex flex-col justify-center">
            <h2 className="text-[32px] font-bold sm:text-[40px]">{T('কৃষকের পাশে কৃষি কর্মকর্তা', 'Your agriculture officer, in the loop')}</h2>
            <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('অ্যাপ সব প্রশ্নের উত্তর দেয় না, দেওয়ার কথাও না। পাতার দাগ নিয়ে সন্দেহ, সেচের পানি না পাওয়া, যেকোনো সমস্যা ছবি আর জায়গাসহ সরাসরি গোদাগাড়ী উপজেলা কৃষি অফিসে যায়।', 'An app cannot answer everything and should not try. Unsure about leaf spots, not getting irrigation water — any problem goes straight to the Godagari upazila agriculture office with a photo and location.')}</p>
            <ul className="mt-5 space-y-3 text-[15.5px] leading-7">
              <li className="flex gap-3"><LifeDot />{T('কাছাকাছি কয়েকজন একই সমস্যা জানালে কর্মকর্তা এলাকার সতর্কতা পান, আর একবারে সবাইকে পরামর্শ পাঠাতে পারেন।', 'When several nearby farmers report the same problem, the officer gets an area alert and can advise all of them at once.')}</li>
              <li className="flex gap-3"><LifeDot />{T('উপজেলা কৃষি অফিসার একজনই — তিনি এক জায়গা থেকে উপজেলার সব ইউনিয়ন আর গ্রাম দেখেন।', 'One upazila agriculture officer sees every union and village in the upazila from one place.')}</li>
              <li className="flex gap-3"><LifeDot />{T('কোন সপ্তাহে কোন ইউনিয়নে কত ফসল উঠবে, সেটাও আগে থেকে জানা যায়।', 'Officers can also see how much crop each union will harvest, week by week.')}</li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button to="/officer/upazila"><ShieldCheck size={18} />{T('উপজেলা কৃষি অফিসারের পাতা', 'Upazila agriculture officer view')}</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Voice + Aman radar: the two modules merged into the main app. */}
      <section id="voice-radar" className="scroll-mt-20 py-16 sm:py-20">
        <div className="page-shell grid gap-6 md:grid-cols-2">
          <div data-reveal className="lift glass flat rounded-[26px] p-7">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-700"><Mic size={24} /></span>
            <h2 className="mt-4 text-[28px] font-bold">{T('বাংলায় কথা বলে জানুন', 'Just ask, in Bangla')}</h2>
            <p className="mt-2 text-[16px] leading-8 text-muted">{T('পড়তে অসুবিধা হলেও চলবে। মাইক চেপে বলুন "কী লাগাব?", "আজ সেচ লাগবে?" বা মাঠের সমস্যা। কর্মকর্তাও বলে অনুরোধ শোনেন, উত্তর আর এলাকার পরামর্শ পাঠান। কিছু পাঠানোর আগে সবসময় আপনার "হ্যাঁ" লাগে।', 'No reading needed. Tap the mic and say what to plant, whether to water, or what is wrong in the field. Officers hear requests and send replies and area advice by voice. Nothing is sent without your “yes”.')}</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button to="/farmer/voice"><Mic size={17} />{T('কৃষক হিসেবে বলুন', 'Try as a farmer')}</Button><Button to="/officer/voice" variant="secondary">{T('কর্মকর্তা হিসেবে', 'Try as an officer')}</Button></div>
          </div>
          <div data-reveal style={{ '--d': '120ms' }} className="lift glass flat rounded-[26px] p-7">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-700"><RadarIcon size={24} /></span>
            <h2 className="mt-4 text-[28px] font-bold">{T('এবার ফসল রোপণ সময়মতো হচ্ছে কি?', 'Is planting on time this year?')}</h2>
            <p className="mt-2 text-[16px] leading-8 text-muted">{T('রবির হিসাব নাসা পাওয়ার থেকে। বর্ষার আমনে মেঘের নিচেও সেন্টিনেল-১ রাডার দেখে কোন জমিতে কবে চারা রোপণ হলো, আর নাসা আইমার্জের বৃষ্টির সঙ্গে মিলিয়ে দেখায় এবার কোন উপজেলা দেরিতে। রাজশাহী আর ঢাকা জেলার প্রতিটি গ্রামীণ উপজেলার আসল উপগ্রহ তথ্য, ২০১৭ থেকে চলতি মৌসুম পর্যন্ত।', 'Rabi planning uses NASA POWER. For monsoon Aman, Sentinel-1 radar sees through cloud when each field is transplanted, and NASA IMERG rain shows the season behind it, so you can see which upazila is late this year. Real satellite data for every rural upazila of Rajshahi and Dhaka districts, 2017 to the current season.')}</p>
            <div className="mt-5 flex flex-wrap gap-3"><Button to="/officer/radar"><RadarIcon size={17} />{T('রোপণ রাডার দেখুন', 'Open Ropan Radar')}</Button></div>
          </div>
        </div>
      </section>

      <footer className="bg-primary-950 pb-16 pt-12 text-primary-100">
        <div className="page-shell grid gap-8 sm:grid-cols-[1.2fr_1fr]">
          <div>
            <BrandMark inverse />
            <p className="mt-4 max-w-md text-[14.5px] leading-7 text-primary-200">{L(PROJECT_TAGLINE)}</p>
          </div>
          <div className="space-y-2 text-[14px] leading-6 text-primary-200 sm:text-right">
            <p>{L(PROJECT_EVENT)}</p>
            <p>{T('এটি সিদ্ধান্ত নিতে সাহায্যের একটি নমুনা প্রকল্প, কোনো নিশ্চয়তা নয়। ফসলের হিসাবের সীমাগুলো কৃষিবিদ দিয়ে যাচাই করে নিতে হবে।', 'A decision-support prototype, not a guarantee. Crop thresholds still need checking by an agronomist.')}</p>
            <p className="text-primary-300">© {new Date().getFullYear()} {PROJECT_NAME} by {PROJECT_TEAM}</p>
          </div>
        </div>
        <div className="page-shell mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-[14px]">
          <Link to="/farmer" className="hover:text-white transition-colors duration-150"><Droplets size={14} className="mr-1.5 inline text-sky-400" />{T('কৃষকের পাতা', 'Farmer view')}</Link>
          <Link to="/farmer/doctor" className="hover:text-white transition-colors duration-150"><ScanLine size={14} className="mr-1.5 inline text-violet-400" />{T('ফসলের ডাক্তার', 'Crop Doctor')}</Link>
          <Link to="/farmer/future" className="hover:text-white transition-colors duration-150"><Sprout size={14} className="mr-1.5 inline text-primary-400" />{T('জমির ভবিষ্যৎ', 'Field Future')}</Link>
          <Link to="/farmer/harvest" className="hover:text-white transition-colors duration-150"><Wheat size={14} className="mr-1.5 inline text-amber-400" />{T('ফসল তোলার হিসাব', 'Harvest timing')}</Link>
          <Link to="/officer" className="hover:text-white transition-colors duration-150"><ShieldCheck size={14} className="mr-1.5 inline text-primary-400" />{T('কর্মকর্তার পাতা', 'Officer view')}</Link>
          <Link to="/officer/radar" className="hover:text-white transition-colors duration-150"><RadarIcon size={14} className="mr-1.5 inline text-sky-400" />{T('রোপণ রাডার', 'Ropan Radar')}</Link>
          <Link to="/games" className="hover:text-white transition-colors duration-150"><Swords size={14} className="mr-1.5 inline text-amber-300" />{T('খেলে শিখুন', 'Games')}</Link>
        </div>
      </footer>
    </>
  );
}

function LifeDot() {
  return <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />;
}

// Hero gallery. The first photo is picked for the time of day in Bangladesh (seedlings at sunrise in the early
// morning, the bullock cart under a blue sky by day, the fields at sunset in the late afternoon, the fields from orbit
// at night), then the photos crossfade every few seconds, each with its own slow pan and zoom.
const SLIDES = [
  // Village Bangladesh first, the strongest wide scenes leading: the cart, the harvest, the bridge, the boat; then the
  // close-ups and the farmer's own photos, ending on new seedlings. Wide scenes and close-ups alternate so no two
  // neighbouring photos look alike.
  // `screen`: sized to the first screen instead of the whole (much taller) hero, so what matters in the lower half of
  // the photo sits above the weather card rather than under it.
  { name: 'bullockCart', screen: true, bn: 'গরুর গাড়িতে ধান নিয়ে বাড়ি ফেরা', en: 'Taking the paddy home by bullock cart', from: 'scale(1.12) translate3d(-1%, 0, 0)', to: 'scale(1.03) translate3d(1%, .5%, 0)' },
  { name: 'riceHarvest', screen: true, bn: 'সোনালি ধান কাটা ও মাড়াই', en: 'Cutting and threshing golden paddy', from: 'scale(1.05) translate3d(1%, .5%, 0)', to: 'scale(1.15) translate3d(-1.5%, -1%, 0)' },
  { name: 'dhamraiBridge', screen: true, bn: 'ধামরাইয়ে বালিয়া-চৌহাট সেতু', en: 'Balia–Chauhat bridge, Dhamrai', from: 'scale(1.04) translate3d(-1%, .5%, 0)', to: 'scale(1.14) translate3d(1.5%, -1%, 0)' },
  { name: 'guavaBoat', screen: true, bn: 'নৌকাভরা পেয়ারা, বরিশাল অঞ্চলের খালে', en: 'A boat full of guavas on a Barishal canal', from: 'scale(1.03) translate3d(0, .5%, 0)', to: 'scale(1.12) translate3d(-1.5%, -.5%, 0)' },
  { name: 'rajshahiMango', screen: true, bn: 'রাজশাহীর বিখ্যাত ও সুস্বাদু আম', en: 'Rajshahi’s famous, delicious mangoes', from: 'scale(1.14) translate3d(-1%, -.5%, 0)', to: 'scale(1.04) translate3d(1%, .5%, 0)' },
  { name: 'villageSky', screen: true, bn: 'গ্রামের মাঠে বিকেলের আকাশ', en: 'Afternoon sky over the village fields', from: 'scale(1.03) translate3d(0, 0, 0)', to: 'scale(1.12) translate3d(-1.5%, -1%, 0)' },
  { name: 'sunsetFields', screen: true, bn: 'সূর্য ডোবার সময় খেতের ধারে', en: 'Beside the fields at sunset', from: 'scale(1.12) translate3d(1%, 0, 0)', to: 'scale(1.03) translate3d(-1%, .5%, 0)' },
  { name: 'mantisPaddy', screen: true, bn: 'ধানক্ষেতের বন্ধু: ম্যান্টিস ক্ষতিকর পোকা খায়', en: 'A friend of the paddy: the mantis eats pests', from: 'scale(1.02) translate3d(0, 0, 0)', to: 'scale(1.1) translate3d(-1%, 0, 0)' },
  { name: 'seedlings', bn: 'নতুন চারা, নতুন মৌসুম', en: 'New seedlings, a new season', from: 'scale(1.18) translate3d(1%, 1.5%, 0)', to: 'scale(1.05) translate3d(-1%, 0, 0)' },
  // Bangladesh beyond the two upazilas: the rivers, wetlands and hills of the other divisions.
  { name: 'teestaBarrage', screen: true, bn: 'তিস্তা ব্যারেজ, ডালিয়া, লালমনিরহাট', en: 'Teesta Barrage, Dalia, Lalmonirhat', from: 'scale(1.04) translate3d(1%, 0, 0)', to: 'scale(1.13) translate3d(-1.5%, -.5%, 0)' },
  { name: 'wetlandBoardwalk', screen: true, bn: 'বিলের ওপর আঁকাবাঁকা কাঠের সাঁকো', en: 'A zigzag walkway over the wetland', from: 'scale(1.04) translate3d(0, 0, 0)', to: 'scale(1.14) translate3d(1%, -1%, 0)' },
  { name: 'stonyRiver', screen: true, bn: 'পাথুরে নদী আর সবুজ পাহাড়, সিলেট', en: 'A stony river under green hills, Sylhet', from: 'scale(1.12) translate3d(1%, .5%, 0)', to: 'scale(1.03) translate3d(-1%, 0, 0)' },
  { name: 'hillClouds', screen: true, bn: 'মেঘের ওপরে পাহাড়ি ঘর, পার্বত্য চট্টগ্রাম', en: 'A hill cottage above the clouds, Chittagong Hill Tracts', from: 'scale(1.13) translate3d(-1%, -.5%, 0)', to: 'scale(1.04) translate3d(1%, .5%, 0)' },
  { name: 'hillWaterfall', screen: true, bn: 'পাহাড়ি বনে পাথুরে ঝরনা', en: 'A rocky waterfall in the hill forest', from: 'scale(1.03) translate3d(0, 0, 0)', to: 'scale(1.12) translate3d(-1%, -1%, 0)' },
  // The neighbours who share the same rivers, monsoon and mountains: a landscape from each (their farms are on the
  // country cards further down). Bhutan's river and Nepal's sunset peak sit between the lakes, so no two look alike.
  { name: 'viewBhutan', screen: true, bn: 'পুনাখা জং, দুই নদীর মিলনে, ভুটান', en: 'Punakha Dzong where two rivers meet, Bhutan', from: 'scale(1.04) translate3d(1%, 0, 0)', to: 'scale(1.13) translate3d(-1.5%, -.5%, 0)' },
  { name: 'viewPakistan', screen: true, bn: 'সাইফুল মুলুক হ্রদ, কাগান উপত্যকা, পাকিস্তান', en: 'Lake Saiful Muluk, Kaghan valley, Pakistan', from: 'scale(1.13) translate3d(-1%, -.5%, 0)', to: 'scale(1.04) translate3d(1%, .5%, 0)' },
  { name: 'viewNepal', screen: true, bn: 'সূর্যাস্তে আমা দাবলাম, হিমালয়, নেপাল', en: 'Ama Dablam at sunset, Himalaya, Nepal', from: 'scale(1.03) translate3d(0, .5%, 0)', to: 'scale(1.12) translate3d(0, -1%, 0)' },
  { name: 'viewIndia', screen: true, bn: 'মেঘে ঢাকা পাহাড়ে চা-বাগান, ভারত', en: 'Tea gardens on misty hills, India', from: 'scale(1.12) translate3d(1%, 0, 0)', to: 'scale(1.03) translate3d(-1%, .5%, 0)' },
  { name: 'viewAfghanistan', screen: true, bn: 'বান্দ-ই-আমির হ্রদ, বামিয়ান, আফগানিস্তান', en: 'The Band-e-Amir lakes, Bamyan, Afghanistan', from: 'scale(1.04) translate3d(0, 0, 0)', to: 'scale(1.13) translate3d(-1.5%, -1%, 0)' },
  // From above: the plots, then the whole patchwork as the satellite sees it.
  { name: 'landParcels', bn: 'আকাশ থেকে আপনার জমি', en: 'Your plots from above', from: 'scale(1.05) translate3d(1.5%, 0, 0)', to: 'scale(1.17) translate3d(-1.5%, -1%, 0)' },
  { name: 'satellite', bn: 'উপগ্রহের চোখে মাঠ', en: 'The fields from orbit', from: 'scale(1.06) rotate(-.6deg)', to: 'scale(1.16) rotate(.6deg) translate3d(-1%, -1%, 0)' },
];
// The photos fall into four chapters; the pill shows which one is on and how far through it the slideshow is.
const CHAPTERS = [
  { from: 'bullockCart', bn: 'আমাদের মাঠ', en: 'Our fields' },
  { from: 'teestaBarrage', bn: 'বাংলাদেশের নানা প্রান্ত', en: 'Across Bangladesh' },
  { from: 'viewBhutan', bn: 'প্রতিবেশী দেশ', en: 'The neighbours' },
  { from: 'landParcels', bn: 'আকাশ থেকে', en: 'From above' },
].map((c, k, all) => {
  const start = SLIDES.findIndex((sl) => sl.name === c.from);
  const end = k + 1 < all.length ? SLIDES.findIndex((sl) => sl.name === all[k + 1].from) : SLIDES.length;
  return { ...c, start, count: end - start };
});
const chapterOf = (i) => CHAPTERS.findLast((c) => i >= c.start);
const SLIDE_MS = 7000;
const dhakaHour = () => +new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }).format(new Date()) % 24;
const slideForNow = () => {
  const h = dhakaHour();
  const name = h >= 4 && h < 8 ? 'seedlings' : h >= 8 && h < 15 ? 'bullockCart' : h >= 15 && h < 19 ? 'sunsetFields' : 'satellite';
  return Math.max(0, SLIDES.findIndex((sl) => sl.name === name));
};

function useHeroGallery() {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [g, setG] = useState(() => { const i = slideForNow(); return { i, prev: null, dir: 1, loaded: false }; });
  // dir: which way the caption slides in (1 = from the right, as when moving forward; -1 = from the left).
  const go = (i, dir) => setG((p) => (i === p.i ? p : { ...p, i, prev: p.i, dir: dir ?? (i > p.i ? 1 : -1) }));
  const step = (d) => setG((p) => { const i = (p.i + d + SLIDES.length) % SLIDES.length; return { ...p, i, prev: p.i, dir: d, loaded: true }; });
  // Load the other photos only once the first one is on screen.
  useEffect(() => { const t = setTimeout(() => setG((p) => ({ ...p, loaded: true })), 1800); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (reduce || !g.loaded || g.paused) return undefined;
    const t = setTimeout(() => { if (document.visibilityState === 'visible') go((g.i + 1) % SLIDES.length); else setG((p) => ({ ...p })); }, SLIDE_MS);
    return () => clearTimeout(t);
  }, [g, reduce]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = () => setG((p) => ({ ...p, paused: !p.paused, loaded: true }));
  return { ...g, go, step, toggle, reduce };
}

// On a touch screen the hero photos change with a sideways swipe (a mostly vertical drag still scrolls the page).
function swipe(gallery) {
  let x0 = null, y0 = null;
  return {
    onTouchStart: (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; },
    onTouchEnd: (e) => {
      if (x0 == null) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && !e.target.closest('a, button, input, textarea, select')) gallery.step(dx < 0 ? 1 : -1);
    },
  };
}

function HeroBackdrop({ gallery }) {
  const layer = useRef(null);
  useEffect(() => {
    if (gallery.reduce) return undefined;
    // Follows the smoothed scroll, so the photo glides in the same frame as the page.
    return onScroll((y0) => {
      const y = Math.min(y0, 900);
      if (layer.current) layer.current.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0) scale(${(1 + y * 0.00012).toFixed(4)})`;
    });
  }, [gallery.reduce]);
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-[#dfe8da]">
      <div ref={layer} className="absolute inset-0 will-change-transform">
        {SLIDES.map((sl, k) => {
          // Only the photo on show, the one fading out and the next one (loading quietly, unseen) are mounted, so the
          // browser holds three decoded photos instead of every one.
          const on = k === gallery.i, fading = k === gallery.prev, next = gallery.loaded && k === (gallery.i + 1) % SLIDES.length;
          if (!on && !fading && !next) return null;
          return (
            <div key={sl.name} className={`hero-slide absolute inset-0 ${on ? 'is-on' : ''}`} style={{ zIndex: on ? 2 : fading ? 1 : 0 }}>
              <div className={`absolute ${sl.screen ? 'inset-x-0 top-0 h-[100svh] min-h-[620px] [mask-image:linear-gradient(to_bottom,#000_78%,transparent)]' : 'inset-0'} ${on || fading ? 'kenburns' : ''}`} style={{ '--kb-from': sl.from, '--kb-to': sl.to }}>
                <Photo name={sl.name} fill priority={k === gallery.i && !gallery.loaded} sizes="100vw" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_12%,rgba(255,206,120,.16),rgba(255,206,120,0)_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(243,246,240,.9)_0%,rgba(243,246,240,.84)_60%,rgba(243,246,240,.6)_100%)] sm:hidden" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(243,246,240,.93)_0%,rgba(243,246,240,.84)_36%,rgba(243,246,240,.18)_58%,rgba(243,246,240,0)_72%)] sm:block" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_55%,rgba(13,38,20,.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-canvas via-canvas/70 to-transparent" />
    </div>
  );
}

// Glass pill under the hero buttons: back and forward arrows, the photo's name (sliding in from the side it came
// from) and one bar per photo; the current bar fills while it shows. Left and right arrow keys work on the pill too.
function HeroGalleryPill({ gallery }) {
  const { s, L, T } = useStore();
  const arrow = 'group/arrow grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/60 transition duration-300 hover:bg-white/80 hover:text-primary-800 hover:shadow-[0_2px_8px_-2px_rgba(13,38,20,.25)] active:scale-[.86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400';
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); gallery.step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); gallery.step(1); }
  };
  const ch = chapterOf(gallery.i);
  const running = gallery.loaded && !gallery.paused && !gallery.reduce;
  return (
    <>
    <div className="glass-pill mt-8 flex max-w-full items-center gap-1 rounded-full py-1.5 pl-1.5 pr-1.5 sm:inline-flex" role="group" aria-label={T('ছবি বদলান', 'Change photo')} onKeyDown={onKey}>
      <button type="button" onClick={() => gallery.step(-1)} className={arrow} aria-label={T('আগের ছবি', 'Previous photo')}>
        <ChevronLeft size={16} strokeWidth={2.4} className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover/arrow:-translate-x-0.5" />
      </button>
      {/* A fixed width, so the pill does not grow and shrink with each caption. */}
      <span className="relative min-w-0 flex-1 overflow-hidden px-1 sm:w-[18.5rem] sm:flex-none" aria-live="polite">
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold leading-4 text-primary-700">
          <span key={ch.from} className="caption-in truncate">{L(ch)}</span>
          <span className="shrink-0 tabular text-muted">· {num(gallery.i + 1, s.lang)}/{num(SLIDES.length, s.lang)}</span>
        </span>
        <span key={gallery.i} className={`${gallery.dir < 0 ? 'caption-in-prev' : 'caption-in-next'} block truncate text-[14px] font-semibold leading-5 text-ink/85`}>{L(SLIDES[gallery.i])}</span>
      </span>
      <button type="button" onClick={() => gallery.step(1)} className={arrow} aria-label={T('পরের ছবি', 'Next photo')}>
        <ChevronRight size={16} strokeWidth={2.4} className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover/arrow:translate-x-0.5" />
      </button>
      {/* Four chapter bars instead of a dot per photo: each fills as the slideshow moves through it; a tap jumps to its first photo. */}
      <span className="mx-2 hidden h-7 w-px bg-ink/10 sm:block" aria-hidden="true" />
      <span className="hidden items-center gap-1 sm:flex">
        {CHAPTERS.map((c) => {
          const on = c === ch, done = gallery.i >= c.start + c.count;
          const fill = done ? 1 : on ? (gallery.i - c.start + 1) / c.count : 0;
          return (
            <button key={c.from} type="button" onClick={() => gallery.go(c.start)} aria-label={L(c)} aria-current={on} title={L(c)} className="group/seg -my-3 flex items-center py-3">
              <span className="relative block h-1.5 overflow-hidden rounded-full bg-ink/12 transition-colors group-hover/seg:bg-ink/20" style={{ width: `${10 + c.count * 3.2}px` }}>
                <span className={`absolute inset-0 origin-left rounded-full transition-transform duration-700 ease-[var(--ease-smooth)] ${on ? 'bg-primary-600' : 'bg-primary-600/45'}`} style={{ transform: `scaleX(${fill})` }} />
              </span>
            </button>
          );
        })}
      </span>
      {/* Pause and play; the ring around it counts down to the next photo. */}
      {!gallery.reduce && (
        <button type="button" onClick={gallery.toggle} className={`${arrow} relative ml-1`} aria-label={gallery.paused ? T('ছবি চালু করুন', 'Play the photos') : T('ছবি থামান', 'Pause the photos')} aria-pressed={!!gallery.paused}>
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="2" />
            {running && <circle key={gallery.i} cx="18" cy="18" r="16" fill="none" pathLength="100" strokeDasharray="100" strokeLinecap="round" strokeWidth="2" className="ring-count stroke-primary-600" style={{ '--slide-ms': `${SLIDE_MS}ms` }} />}
          </svg>
          {gallery.paused ? <Play size={13} strokeWidth={2.6} className="translate-x-px fill-current" /> : <Pause size={13} strokeWidth={2.6} className="fill-current" />}
        </button>
      )}
    </div>
    {/* Photos from Wikimedia Commons carry their author and licence, as the licence asks. */}
    {/* The line keeps its height when a photo has no credit, so the weather card below does not jump. */}
    <div className="mt-2 h-6">
    {IMAGES[SLIDES[gallery.i].name]?.credit && (() => { const c = IMAGES[SLIDES[gallery.i].name].credit; return (
      <a key={gallery.i} href={c.page} target="_blank" rel="noopener noreferrer" className="caption-in block w-fit max-w-full truncate rounded-full bg-white/55 px-3 py-1 text-[11.5px] font-semibold text-ink/65 backdrop-blur hover:text-ink">
        {T('ছবি', 'Photo')}: {c.artist} · {c.license} · Wikimedia Commons
      </a>
    ); })()}
    </div>
    </>
  );
}
