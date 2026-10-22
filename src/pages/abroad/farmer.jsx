// The sample farmer's tabs in a neighbouring country, laid out like the Bangladesh farmer app: Home (today's call and
// the live sky), My field (satellite and season), Season plan (the next crop and its water), Risks (the big problem
// in real numbers, and fires), Field future (2040s and the data check) and Help (ask the local office).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudSun, CalendarDays, Satellite, BookOpen, Flame, Telescope, Scale, MapPin, Droplets, Sprout, CheckCircle2, PauseCircle, AlertTriangle, Building2, Info, ArrowRight, Send, Phone, MessageSquareReply, Clock, Waves } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { weatherOf } from '../../engine/forecast';
import { todaysCall, PLANS, seasonWater, addDaysIso } from '../../engine/abroad';
import { areaIn } from '../../data/abroad';
import { useAbroad } from '../../layouts/AbroadLayout';
import { WeatherIcon } from '../../components/charts/LiveWeather';
import FarmerAvatar from '../../components/brand/FarmerAvatar';
import SatWater from '../../components/charts/SatWater';
import AbroadRotations from '../../components/charts/AbroadRotations';
import { Section, SourceTag, Stat, Sources, WeekStrip, SeasonCharts, RecordCheck, EventChart, FieldPanel, FiresPanel, FuturePanel, fullDate, dayMonth, baseText, baseYears, BoardChip } from './parts';

const EVENTS = {
  india: [{ key: 'heat2022', kind: 'heat', title: { bn: 'মার্চ ২০২২: যে গরমে গমের দানা চুপসে গেল', en: 'March 2022: the heat that shrivelled the wheat' } }],
  pakistan: [{ key: 'flood2022', kind: 'rain', title: { bn: 'আগস্ট ২০২২: যে মাসে আকাশ ভেঙে পড়ল', en: 'August 2022: the month the sky broke' } }],
  nepal: [{ key: 'rain2021', kind: 'rain', title: { bn: '১৭–২০ অক্টোবর ২০২১: কাটা ধানের ওপর বৃষ্টি', en: '17–20 October 2021: rain on the cut paddy' } }],
  bhutan: [{ key: 'rain2025', kind: 'rain', title: { bn: '৩–৬ অক্টোবর ২০২৫: ফসল তোলার মুখে ভারী বৃষ্টি', en: '3–6 October 2025: heavy rain on the eve of harvest' } }],
  myanmar: [{ key: 'heat2024', kind: 'heat', title: { bn: 'এপ্রিল ২০২৪: মিয়ানমারের সবচেয়ে গরম এপ্রিল', en: 'April 2024: Myanmar’s hottest April' } }, { key: 'yagi2024', kind: 'rain', title: { bn: 'সেপ্টেম্বর ২০২৪: টাইফুন ইয়াগির বৃষ্টি', en: 'September 2024: the rain of Typhoon Yagi' } }],
};
const TONE = {
  go: { icon: CheckCircle2, ring: 'ring-primary-300', bg: 'from-primary-50 to-white', text: 'text-primary-800', chip: 'bg-primary-600' },
  wait: { icon: PauseCircle, ring: 'ring-sky-300', bg: 'from-sky-50 to-white', text: 'text-sky-800', chip: 'bg-sky-600' },
  warn: { icon: AlertTriangle, ring: 'ring-clay-300', bg: 'from-clay-50 to-white', text: 'text-clay-700', chip: 'bg-clay-500' },
};
const bnd = (x) => ({ bn: bnDigits(x.bn), en: x.en });

// ---- Home ----
export function Home() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data, fc, status, now, req, notices } = useAbroad();
  const farm = data.points.farm;
  const f = c.farmer;
  const notice = notices.list[0];
  const raw = todaysCall(c.id, data, fc, now.date);
  const call = { ...raw, title: bnd(raw.title), body: bnd(raw.body), facts: raw.facts.map(bnd) };
  const tone = TONE[call.tone];
  const cur = fc?.current;
  const w0 = cur ? weatherOf(cur.code) : null;
  const w = w0 && !cur.day && w0.kind === 'clear' ? { ...w0, bn: 'পরিষ্কার আকাশ', en: 'Clear' } : w0;
  const ser = data.field.series;
  const green = ser.length ? Math.round(ser[ser.length - 1].ndvi * 100) : null;
  const plan = PLANS[c.id];
  const replies = req.list.filter((r) => r.reply && !r.seen).length;
  return (
    <div className="page-shell space-y-5">
      <section className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-[var(--shadow-lift)] sm:p-7" style={{ background: `linear-gradient(135deg, ${c.tone} 0%, #13261b 120%)` }}>
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_310px] lg:items-end">
          <div className="scene-in">
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-white/80">
              <span className="text-[20px]" aria-hidden="true">{c.flag}</span>{L(c.name)} · {c.name.local}
              <span className="chip bg-white/15 text-white ring-1 ring-white/25">{T('নমুনা কৃষক, আসল জমি', 'Sample farmer, real field')}</span>
            </div>
            <h1 className="mt-2 flex items-center gap-3 font-display text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[42px]"><FarmerAvatar id={f.id} size={56} rounded="rounded-2xl" className="ring-2 ring-white/40" />{L(f.name)}</h1>
            <div className="mt-0.5 text-[17px] text-white/75">{f.name.local}</div>
            <p className="mt-2 flex items-start gap-1.5 text-[15px] font-semibold text-white/90"><MapPin size={17} className="mt-0.5 shrink-0" />{T(`গ্রাম ${f.village.bn}, ${f.place.bn}, ${c.name.bn}`, `${f.village.en} village, ${f.place.en}, ${c.name.en}`)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill icon={Sprout}>{T(`${num(areaIn(c, f.farmDec), lang, { dp: 1 })} ${c.unit.bn}`, `${num(areaIn(c, f.farmDec), 'en', { dp: 1 })} ${c.unit.en}${areaIn(c, f.farmDec) === 1 ? '' : 's'}`)}</Pill>
              <Pill icon={Droplets}>{L(f.water)}</Pill>
              <Pill icon={CalendarDays}>{L(f.now)}</Pill>
            </div>
          </div>
          <div className="glass lite rounded-[22px] p-4 text-ink">
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" /></span>{T('এখন, খেতে', 'Now, at the field')}</span>
              <span className="tabular">{lang === 'bn' ? `${bnDigits(now.time)} · ${c.name.bn}ের সময়` : `${now.time} · ${c.name.en} time`}</span>
            </div>
            {cur ? (
              <div className="mt-2 flex items-center gap-3">
                <WeatherIcon kind={w.kind} night={!cur.day} size={58} />
                <div><div className="font-display text-[38px] font-bold leading-none tabular">{num(Math.round(cur.temp), lang)}°</div><div className="mt-1 text-[13.5px] font-semibold">{L(w)}</div></div>
                <div className="ml-auto text-right text-[12.5px] leading-5 text-muted">
                  <div>{T('আর্দ্রতা', 'Humidity')} <b className="tabular text-ink">{num(cur.rh, lang)}%</b></div>
                  <div>{T('বাতাস', 'Wind')} <b className="tabular text-ink">{num(Math.round(cur.wind), lang)}</b> {T('কিমি/ঘ', 'km/h')}</div>
                  <div>{T('বৃষ্টির সম্ভাবনা', 'Rain chance')} <b className="tabular text-ink">{num(cur.pop, lang)}%</b></div>
                </div>
              </div>
            ) : <div className="mt-3 h-16 animate-pulse rounded-xl bg-white/60">{status === 'error' && <span className="block p-3 text-[13px] text-muted">{T('পূর্বাভাস আনা যায়নি', 'Forecast unavailable')}</span>}</div>}
            <div className="mt-2 text-[11.5px] text-muted">{T('লাইভ পূর্বাভাস: Open-Meteo, প্রতি ১০ মিনিটে নতুন', 'Live forecast: Open-Meteo, refreshed every 10 minutes')}</div>
          </div>
        </div>
      </section>

      {notice && (
        <section className="swap-in flex items-start gap-3 rounded-[22px] bg-white/80 p-4 ring-1 ring-paddy-300 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paddy-500 text-white"><Building2 size={19} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-bold text-muted">{T(`${c.local.role.bn}-এর বার্তা`, `Message from the ${c.local.role.en}`)} · {fullDate(notice.t.slice(0, 10), lang)}</div>
            <p dir="auto" className="mt-1 text-[15px] leading-7">{notice.text}</p>
          </div>
        </section>
      )}

      {!fc && status === 'loading' ? (
        <section className="flex items-center gap-3 rounded-[22px] bg-white/70 p-5 ring-1 ring-white/80 sm:p-6" aria-busy="true">
          <span className="h-11 w-11 animate-pulse rounded-2xl bg-primary-100" />
          <div className="flex-1"><div className="text-[14.5px] font-semibold text-muted">{T('আগামী তিন দিনের আকাশ দেখে আজকের সিদ্ধান্ত তৈরি হচ্ছে…', 'Reading the next three days of sky for today’s call…')}</div><div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-primary-50" /></div>
        </section>
      ) : (
        <section className={`swap-in rounded-[22px] bg-gradient-to-br p-5 ring-1 sm:p-6 ${tone.bg} ${tone.ring}`}>
          <div className="flex flex-wrap items-start gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white ${tone.chip}`}><tone.icon size={22} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-bold uppercase tracking-wide text-muted">{T('আজকের সিদ্ধান্ত', 'Today’s call')} · {fullDate(now.date, lang)}</div>
              <h2 className={`mt-0.5 font-display text-[22px] font-bold leading-snug tracking-tight ${tone.text}`}>{L(call.title)}</h2>
              <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/85">{L(call.body)}</p>
              <ul className="mt-3 flex flex-wrap gap-2">{call.facts.map((x) => <li key={x.en} className="rounded-full bg-white/80 px-3 py-1 text-[12.5px] font-semibold text-ink/80 ring-1 ring-black/5">{L(x)}</li>)}</ul>
            </div>
          </div>
        </section>
      )}

      <Section icon={CloudSun} title={T('আগামী ৭ দিনের আকাশ', 'The next 7 days')} sub={T(`${f.village.bn}-এর ওপরের আকাশ, ${c.name.bn}ের নিজের সময়ে`, `The sky over ${f.village.en}, on ${c.name.en}’s own clock`)} tag={<SourceTag>{T('লাইভ', 'Live')}</SourceTag>}>
        {fc ? <WeekStrip fc={fc} lang={lang} /> : <div className="h-28 animate-pulse rounded-2xl bg-white/50" />}
      </Section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-reveal-children>
        <Tile to={`/abroad/${c.id}/field`} icon={Satellite} title={T('আমার জমি', 'My field')} value={green == null ? '—' : num(green, lang)} sub={T('উপগ্রহে এখনকার সবুজ (NDVI×১০০)', 'Green from space now (NDVI×100)')} />
        <Tile to={`/abroad/${c.id}/plan`} icon={Sprout} title={T('পরের ফসল', 'Next crop')} value={L(plan.crop).split(' (')[0]} sub={L(f.next)} />
        <Tile to={`/abroad/${c.id}/risks`} icon={Flame} title={T('৫০ কিমিতে আগুন', 'Fires within 50 km')} value={num(farm.fires.km50, lang)} sub={T('গত ৭ দিন, নাসা FIRMS', 'Last 7 days, NASA FIRMS')} />
        <Tile to={`/abroad/${c.id}/help`} icon={MessageSquareReply} title={T('অফিসের উত্তর', 'Office replies')} value={num(replies, lang)} sub={T(`${c.local.role.bn}-এর কাছে প্রশ্ন`, `Ask the ${c.local.role.en}`)} />
      </div>
    </div>
  );
}

function Pill({ icon: Icon, children }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/20 backdrop-blur"><Icon size={14} />{children}</span>;
}
function Tile({ to, icon: Icon, title, value, sub }) {
  return (
    <Link to={to} className="lift surface-card group block rounded-[20px] p-4">
      <div className="flex items-center justify-between text-[13px] font-semibold text-muted"><span className="inline-flex items-center gap-1.5"><Icon size={15} />{title}</span><ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></div>
      <div className="mt-1.5 font-display text-[26px] font-bold leading-tight tabular">{value}</div>
      <div className="mt-0.5 text-[12.5px] leading-4 text-muted">{sub}</div>
    </Link>
  );
}

// ---- My field ----
export function Field() {
  const { s, T } = useStore();
  const lang = s.lang;
  const { c, data } = useAbroad();
  const farm = data.points.farm;
  const r30 = farm.rain30;
  const dT = r30.tmax - r30.tmaxNormal;
  return (
    <div className="page-shell space-y-5">
      <Section icon={Satellite} title={T('আমার জমি, উপগ্রহ থেকে', 'My field, from space')} sub={T(`জুন ২০২৫ থেকে প্রতিটি পরিষ্কার সেন্টিনেল-২ ছবিতে এই ${num(areaIn(c, data.field.area_dec), lang, { dp: 1 })} ${c.unit.bn} জমির সবুজ`, `The green of this ${num(areaIn(c, data.field.area_dec), 'en', { dp: 1 })}-${c.unit.en} field in every clear Sentinel-2 picture since June 2025`)} tag={<SourceTag tone="violet">{T('ইএসএ সেন্টিনেল-২', 'ESA Sentinel-2')}</SourceTag>}>
        <FieldPanel field={data.field} />
      </Section>
      <Section icon={CalendarDays} title={T(`এই মৌসুম, ${bnDigits(baseYears(farm))} বছরের তুলনায়`, `This season against ${baseYears(farm)} years`)} sub={T(`${fullDate(farm.last, lang)} পর্যন্ত; প্রতিটি তুলনা ${baseText(farm, 'bn')} সালের একই দিনগুলোর সঙ্গে${farm.base?.[0] >= 2017 ? ' (এখানে ২০১৭-এর আগের রেকর্ড অন্যভাবে মাপা, তাই বাদ — “জমির ভবিষ্যৎ” পাতার তথ্য যাচাই দেখুন)' : ''}`, `To ${fullDate(farm.last, 'en')}; every comparison is with the same days of ${baseText(farm, 'en')}${farm.base?.[0] >= 2017 ? ' (the record before 2017 was measured differently here, so it is left out — see the data check on Field future)' : ''}`)} tag={<SourceTag>ERA5</SourceTag>}>
        <div className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4" data-reveal-children>
          <Stat label={T('গত ৩০ দিনের বৃষ্টি', 'Rain, last 30 days')} value={`${num(r30.rain, lang)} ${T('মিমি', 'mm')}`} sub={T(`স্বাভাবিক ${num(r30.normal, lang)} মিমি · ${num(r30.of, lang)} বছরের ${num(r30.wetterThan, lang)}টির চেয়ে বেশি`, `normal ${r30.normal} mm · wetter than ${r30.wetterThan} of ${r30.of} years`)} tone={r30.pct >= 150 ? 'wet' : r30.pct <= 60 ? 'dry' : 'ink'} />
          <Stat label={T('দিনের গড় সর্বোচ্চ (৩০ দিন)', 'Mean daytime high (30 days)')} value={`${num(r30.tmax, lang, { dp: 1 })}°`} sub={T(`স্বাভাবিকের চেয়ে ${dT >= 0 ? '+' : '−'}${num(Math.abs(dT), lang, { dp: 1 })}°`, `${dT >= 0 ? '+' : '−'}${Math.abs(dT).toFixed(1)}° against normal`)} tone={dT >= 1.5 ? 'hot' : 'ink'} />
          {farm.monsoon && <Stat label={T(`বর্ষা (জুন–সেপ্টে) ${bnDigits(farm.monsoon.year)}`, `Monsoon (Jun–Sep) ${farm.monsoon.year}`)} value={`${num(farm.monsoon.rain, lang)} ${T('মিমি', 'mm')}`} sub={T(`গড় ${num(farm.monsoon.normal, lang)} মিমি (${num(Math.round((100 * farm.monsoon.rain) / farm.monsoon.normal), lang)}%)`, `average ${farm.monsoon.normal} mm (${Math.round((100 * farm.monsoon.rain) / farm.monsoon.normal)}%)`)} tone={farm.monsoon.rain < 0.75 * farm.monsoon.normal ? 'dry' : farm.monsoon.rain > 1.25 * farm.monsoon.normal ? 'wet' : 'ink'} />}
          <Stat label={T('২০০১ থেকে সবচেয়ে গরম দিন', 'Hottest day since 2001')} value={`${num(farm.records.hot.tmax, lang, { dp: 1 })}°`} sub={fullDate(farm.records.hot.d, lang)} tone="hot" />
        </div>
        <SeasonCharts point={farm} />
      </Section>
    </div>
  );
}

// ---- Season plan ----
export function Plan() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, data, now } = useAbroad();
  const plan = PLANS[c.id];
  const farm = data.points.farm;
  // The season that starts next: this year's sowing date if it is still ahead (or within the last month), else next year's.
  const y = +now.date.slice(0, 4);
  const sowY = plan.sow && `${y}-${plan.sow}` < addDaysIso(now.date, -30) ? y + 1 : y;
  const water = seasonWater(plan, farm.normals, sowY);
  const at = (st) => {
    if (st.at != null && water) return { a: addDaysIso(water.start, st.at), b: null };
    if (st.atEnd && water) return { a: addDaysIso(water.end, -7), b: addDaysIso(water.end, 7) };
    const yy = (m) => (m < '07-01' ? y + 1 : y);
    return { a: `${yy(st.from)}-${st.from}`, b: st.to ? `${yy(st.to)}-${st.to}` : null };
  };
  const steps = plan.steps.map((st) => ({ ...st, ...at(st) })).sort((p, q) => p.a.localeCompare(q.a));
  const nowIdx = steps.findIndex((st) => (st.b ?? st.a) >= now.date);
  return (
    <div className="page-shell space-y-5">
      <Section icon={Sprout} title={T(`মৌসুমের পরিকল্পনা: ${plan.crop.bn}`, `Season plan: ${plan.crop.en}`)} sub={T('ধাপে ধাপে কী কবে — আজকের দিনটি চিহ্নিত', 'What to do when, step by step — today is marked')}>
        <ol className="relative ml-3 space-y-3 border-l-2 border-primary-100 pl-6">
          {steps.map((st, i) => {
            const past = (st.b ?? st.a) < now.date, current = i === nowIdx;
            return (
              <li key={st.en} className={`relative rounded-2xl p-3.5 ring-1 transition ${current ? 'bg-white ring-primary-300 shadow-[var(--shadow-card)]' : past ? 'bg-white/40 ring-white/60 opacity-70' : 'bg-white/70 ring-white/80'}`}>
                <span className={`absolute -left-[33px] top-4 grid h-4 w-4 place-items-center rounded-full ring-4 ring-canvas ${current ? 'bg-primary-600' : past ? 'bg-primary-300' : 'bg-white ring-primary-100'}`} />
                <div className="flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-muted">
                  <Clock size={13} />{st.b ? `${dayMonth(st.a, lang)} – ${dayMonth(st.b, lang)}` : dayMonth(st.a, lang)}
                  {current && <span className="chip bg-primary-600 text-white">{T('এখন', 'Now')}</span>}
                  {st.key && <span className="chip bg-paddy-100 text-paddy-700">{T('মূল কাজ', 'Key step')}</span>}
                </div>
                <div className="mt-1 text-[15px] font-semibold leading-6">{L(st)}</div>
              </li>
            );
          })}
        </ol>
      </Section>
      {water && (
        <Section icon={Droplets} title={T(`${plan.crop.bn}-এর পানির হিসাব`, `Water for the ${plan.crop.en.toLowerCase()}`)} sub={T(`বোনা ${fullDate(water.start, lang)}, কাটা প্রায় ${fullDate(water.end, lang)} (${num(water.days, lang)} দিন) — স্বাভাবিক বছরের আবহাওয়ায়`, `Sown ${fullDate(water.start, 'en')}, harvested around ${fullDate(water.end, 'en')} (${water.days} days) — in a normal year’s weather`)} tag={<SourceTag tone="amber">FAO-56 · ERA5</SourceTag>}>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-reveal-children>
            <Stat label={T('ফসলের মোট চাহিদা', 'Crop water need')} value={`${num(water.need, lang)} ${T('মিমি', 'mm')}`} sub={T('Kc × রেফারেন্স বাষ্পীভবন', 'Kc × reference evapotranspiration')} />
            <Stat label={T('মৌসুমের স্বাভাবিক বৃষ্টি', 'Normal rain in the season')} value={`${num(water.rain, lang)} ${T('মিমি', 'mm')}`} sub={T(`কাজে লাগে প্রায় ${num(water.eff, lang)} মিমি`, `about ${water.eff} mm of it usable`)} tone="wet" />
            <Stat label={plan.irrigated ? T('সেচে দিতে হবে', 'To come from irrigation') : T('মাটির জমা পানি থেকে আসতে হবে', 'To come from water stored in the soil')} value={`${num(water.gap, lang)} ${T('মিমি', 'mm')}`} tone={water.gap > 150 ? 'dry' : 'ink'} sub={plan.irrigated ? T(`প্রায় ${num(Math.max(1, Math.round(water.gap / 75)), lang)}টি সেচ (প্রতিবার ৭৫ মিমি)`, `about ${Math.max(1, Math.round(water.gap / 75))} irrigations of 75 mm`) : T('বৃষ্টিনির্ভর ফসল — বোনার সময় মাটির ভেজাই আসল পুঁজি', 'Rain-fed — the soil’s moisture at sowing is the real capital')} />
            <Stat label={T('জমিতে মোট', 'For this field')} value={`${num(Math.round((water.gap * data.field.area_dec * 40.4686) / 1000), lang)} ${T('ঘনমিটার', 'm³')}`} sub={T(`${num(areaIn(c, data.field.area_dec), lang, { dp: 1 })} ${c.unit.bn} জমিতে`, `on ${num(areaIn(c, data.field.area_dec), 'en', { dp: 1 })} ${c.unit.en}`)} />
          </div>
          <p className="mt-3 text-[13px] leading-6 text-muted">{T(`ফসলের ধাপের দৈর্ঘ্য আর Kc মান FAO-56-এর (Allen ও অন্যান্য, ১৯৯৮) প্রচলিত মান, এই মৌসুমের সঙ্গে মেলানো; বৃষ্টি আর বাষ্পীভবন ERA5-এর ${baseText(farm, 'bn')} মাসিক গড়। প্রতিদিনের বৃষ্টির ৮০% পর্যন্ত, সেদিনের চাহিদার বেশি নয়, কাজে লাগে ধরা হয়েছে।`, `Stage lengths and Kc are FAO-56 typical values (Allen et al., 1998) set to this season; rain and evapotranspiration are ERA5 monthly means for ${baseText(farm, 'en')}. Up to 80% of each day’s rain, never more than that day’s need, is counted as usable.`)}</p>
        </Section>
      )}
    </div>
  );
}

// ---- Risks ----
export function Risks() {
  const { T, L } = useStore();
  const { c, data } = useAbroad();
  const farm = data.points.farm;
  const f = c.farmer;
  return (
    <div className="page-shell space-y-5">
      <Section icon={BookOpen} title={T('এখানকার বড় সমস্যা', 'The big problem here')} sub={T(`পরের কাজ: ${f.next.bn}`, `Next job: ${f.next.en}`)}>
        <p className="max-w-3xl text-[15.5px] leading-7">{L(f.intro)}</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">{EVENTS[c.id].map((e) => <EventCard key={e.key} e={e} ev={farm.events[e.key]} />)}</div>
        <ul className="mt-5 space-y-3" data-reveal-children>
          {c.facts.map((x) => (
            <li key={x.en} className="rounded-2xl bg-white/70 p-4 ring-1 ring-white/80"><p className="text-[14.5px] leading-6">{L(x)}</p><div className="mt-1.5"><Sources list={x.src} /></div></li>
          ))}
        </ul>
      </Section>
      <Section icon={Flame} title={T('এই সপ্তাহের আগুন', 'Fires this week')} sub={T('খড়, বন বা ঝোপ পোড়ানো — উপগ্রহ রাতদিন তাপ মাপে', 'Straw, forest or scrub burning — satellites read the heat day and night')} tag={<SourceTag>NASA FIRMS</SourceTag>}>
        <FiresPanel data={data} here={farm.fires} />
      </Section>
    </div>
  );
}

function EventCard({ e, ev }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  if (!ev) return null;
  const heat = e.kind === 'heat';
  const d = ev.tmax - ev.tmaxNormal;
  return (
    <figure className="rounded-2xl bg-white/75 p-4 ring-1 ring-white/80">
      <figcaption className="text-[15px] font-bold leading-snug">{L(e.title)}</figcaption>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        {heat ? (
          <>
            <span>{T('দিনের গড় সর্বোচ্চ', 'Mean daytime high')} <b className="tabular">{num(ev.tmax, lang, { dp: 1 })}°</b> <span className="text-muted">({T('স্বাভাবিক', 'normal')} {num(ev.tmaxNormal, lang, { dp: 1 })}°, <b className="text-clay-700">{d >= 0 ? '+' : '−'}{num(Math.abs(d), lang, { dp: 1 })}°</b>)</span></span>
            <span>{T('সবচেয়ে গরম দিন', 'Hottest day')} <b className="tabular text-clay-700">{num(ev.hot, lang, { dp: 1 })}°</b></span>
          </>
        ) : (
          <>
            {ev.rainImerg != null && <span>{T('উপগ্রহে বৃষ্টি', 'Satellite rain')} <b className="tabular text-[#6a4fb3]">{num(ev.rainImerg, lang)} {T('মিমি', 'mm')}</b> <span className="text-muted">({T('স্বাভাবিক', 'normal')} {num(ev.rainImergNormal, lang)})</span></span>}
            <span>ERA5 <b className="tabular text-sky-700">{num(ev.rain, lang)} {T('মিমি', 'mm')}</b> <span className="text-muted">({T('স্বাভাবিক', 'normal')} {num(ev.rainNormal, lang)})</span></span>
          </>
        )}
      </div>
      <div className="mt-2"><EventChart ev={ev} kind={e.kind} /></div>
      <div className="mt-1 text-[11.5px] text-muted">{T(`${dayMonth(ev.start, lang)}–${fullDate(ev.end, lang)}; গ্রিডের গড় (প্রায় ২৫ কিমি বর্গ) — শহরের আবহাওয়া কেন্দ্রে এক জায়গার মাপ এর চেয়ে বেশি হতে পারে।`, `${dayMonth(ev.start, 'en')}–${fullDate(ev.end, 'en')}; a grid-square average (about 25 km) — a single town station can read higher.`)}</div>
    </figure>
  );
}

// ---- Field future ----
export function Future() {
  const { T } = useStore();
  const { c, data } = useAbroad();
  return (
    <div className="page-shell space-y-5">
      <Section icon={Telescope} title={T('২০৪০-এর দশকে এই খামার', 'This farm in the 2040s')} sub={T('আটটি জলবায়ু মডেল, দুই পথে', 'Eight climate models, two paths')} tag={<SourceTag>NASA NEX-GDDP-CMIP6</SourceTag>}>
        <FuturePanel id={c.id} />
      </Section>
      <Section icon={Sprout} title={T('ফসলচক্র আর মাটি, ১০ বছর', 'Rotations and the soil, ten years')} sub={T('এই খামারের নিজের মাটি আর দেশের ফলনে, বাংলাদেশের একই মডেলে', 'On this farm’s own soil and its country’s yields, with the same model as Bangladesh')} tag={<SourceTag>SoilGrids · FAOSTAT · CMIP6</SourceTag>}>
        <AbroadRotations id={c.id} normals={data.points.farm.normals} />
      </Section>
      <Section icon={Waves} title={T('মাটির নিচের পানি আর শিকড়ের মাটি', 'Water underground and in the root zone')} sub={T('নাসার GRACE ও SMAP উপগ্রহ, এই খামারের অঞ্চলে', 'NASA’s GRACE and SMAP satellites, over this farm’s region')} tag={<SourceTag>NASA GRACE · SMAP</SourceTag>}>
        <SatWater id={c.id} />
      </Section>
      <Section icon={Scale} title={T('তথ্য যাচাই: বৃষ্টির তিন হিসাব', 'Data check: three records of the same rain')} sub={T('একটি উৎসকে চোখ বুজে বিশ্বাস না করে, তিনটি পাশাপাশি রাখা হয়েছে', 'Rather than trust one source blindly, three are set side by side')} tag={<SourceTag tone="amber">{T('মান যাচাই', 'Quality check')}</SourceTag>}>
        <RecordCheck point={data.points.farm} />
      </Section>
      <About c={c} />
    </div>
  );
}

function About({ c }) {
  const { T, L } = useStore();
  return (
    <div className="flex gap-2.5 rounded-2xl bg-white/70 p-4 text-[13.5px] leading-6 text-muted ring-1 ring-white/80">
      <Info size={18} className="mt-0.5 shrink-0" />
      <div>
        {T(`${L(c.farmer.name)} একজন নমুনা কৃষক — আসল মানুষ নন। কিন্তু জমিটি আসল ফসলের জমি (এসরি ১০ মিটার ভূমি-মানচিত্র), গ্রামটি আসল (GeoNames), আর প্রতিটি সংখ্যা আসল উৎস থেকে।`, `${L(c.farmer.name)} is a sample farmer, not a real person. But the field is real cropland (Esri 10 m land cover), the village is real (GeoNames), and every number comes from a real source.`)}
        <div className="mt-2"><Sources list={[...c.sources, { label: 'ERA5 (Copernicus/ECMWF) via Open-Meteo', url: 'https://open-meteo.com/en/docs/historical-weather-api' }, { label: 'NASA POWER (IMERG)', url: 'https://power.larc.nasa.gov/' }, { label: 'NASA FIRMS', url: 'https://firms.modaps.eosdis.nasa.gov/' }]} /></div>
      </div>
    </div>
  );
}

// ---- Help: ask the local office ----
const TOPICS = [
  { k: 'pest', bn: 'পোকা বা রোগ', en: 'Pest or disease' },
  { k: 'seed', bn: 'বীজ বা সার', en: 'Seed or fertiliser' },
  { k: 'water', bn: 'সেচ বা পানি', en: 'Irrigation or water' },
  { k: 'machine', bn: 'যন্ত্র', en: 'Machinery' },
  { k: 'loss', bn: 'ক্ষতি বা বিমা', en: 'Loss or insurance' },
  { k: 'other', bn: 'অন্য কিছু', en: 'Something else' },
];
export function Help() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const { c, req, boardMode } = useAbroad();
  const [topic, setTopic] = useState('pest');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => { req.seenAll(); }, [req.list.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; req.add(topic, text.trim()); setText(''); setSent(true); setTimeout(() => setSent(false), 2400); };
  return (
    <div className="page-shell grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Section icon={Send} title={T(`${c.local.role.bn}-কে জানান`, `Ask the ${c.local.role.en}`)} sub={L(c.local.office)}>
        <form onSubmit={send} className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map((t) => <button key={t.k} type="button" onClick={() => setTopic(t.k)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 transition ${topic === t.k ? 'bg-ink text-white ring-ink' : 'bg-white/70 text-ink ring-border hover:bg-white'}`}>{L(t)}</button>)}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-2xl border border-border bg-white p-3 text-[15px] outline-none transition focus:border-primary-400 focus:ring-4 focus:ring-primary-100" placeholder={T('কী হয়েছে লিখুন — কোন ফসল, কবে থেকে, জমির কোন অংশে', 'Say what is wrong — which crop, since when, which part of the field')} />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={!text.trim()} className="btn-gloss inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white disabled:opacity-50"><Send size={16} />{T('পাঠান', 'Send')}</button>
            {sent && <span className="swap-in text-[13.5px] font-semibold text-primary-700">{T('পাঠানো হয়েছে — কর্মকর্তার পাতায় দেখা যাবে', 'Sent — it shows on the officer’s page')}</span>}
          </div>
        </form>
        {c.local.phone && <a href={`tel:${c.local.phone}`} className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-primary-700"><Phone size={15} />{T('দপ্তরের ফোন', 'Office phone')}: {lang === 'bn' ? bnDigits(c.local.phone) : c.local.phone}</a>}
      </Section>
      <Section icon={MessageSquareReply} title={T('আমার অনুরোধ', 'My requests')} sub={T('উত্তর এলে এখানে দেখা যাবে', 'Replies appear here')} tag={<BoardChip mode={boardMode} />}>
        {req.list.length === 0 ? <p className="text-[14px] text-muted">{T('এখনো কোনো অনুরোধ নেই।', 'No requests yet.')}</p> : (
          <ul className="space-y-2.5">
            {req.list.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white/75 p-3.5 ring-1 ring-white/80">
                <div className="flex items-center justify-between text-[12px] font-semibold text-muted"><span>{L(TOPICS.find((t) => t.k === r.topic) ?? TOPICS[5])}</span><span>{fullDate(r.t.slice(0, 10), lang)}</span></div>
                <p className="mt-1 text-[14.5px] leading-6">{r.text}</p>
                {r.reply ? <div className="mt-2 rounded-xl bg-primary-50 p-2.5 text-[14px] leading-6 ring-1 ring-primary-100"><b className="text-primary-800">{L(c.local.role)}:</b> {r.reply.text}</div> : <div className="mt-1.5 text-[12.5px] font-semibold text-paddy-700">{T('উত্তরের অপেক্ষায়', 'Waiting for a reply')}</div>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Link to={`/abroad/${c.id}/officer`} className="lift flex items-center gap-3 rounded-2xl p-4 text-white lg:col-span-2" style={{ background: c.tone }}>
        <Building2 size={22} /><span className="text-[14.5px] font-bold leading-5">{T('কর্মকর্তার চোখে দেখুন', 'See it as the officer')}<span className="block text-[12.5px] font-semibold text-white/80">{L(c.local.role)}</span></span><ArrowRight size={18} className="ml-auto" />
      </Link>
    </div>
  );
}

