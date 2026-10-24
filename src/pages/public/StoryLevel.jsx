// One division's story level: the farmer's story in eight pillars, the region's hazard measured on real NASA data with
// a live forecast check, and the mission: pick what to do on each plot and play it through a real past year.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell, LineChart, Line } from 'recharts';
import { History, CloudLightning, Bug, CalendarClock, Shovel, Wheat, Thermometer, Store, Swords, Sparkles, Play, RotateCcw, Dices, ArrowLeft, ArrowRight, Skull, Flame, Waves, Landmark, Radar, Moon, Lightbulb, HeartHandshake, Info, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react';
import { useStore } from '../../store';
import CropPhoto from '../../components/CropPhoto';
import { ScoreRing, Segmented } from '../../components/ui';
import { LEVELS, PILLARS, levelOf } from '../../data/stories';
import { UPAZILAS } from '../../data/upazilas';
import { MISSIONS, DANGERS, history, moonAge, isKotal, isDark, limeDose, T_HA_TO_KG_BIGHA, SALT, relYield } from '../../engine/missions';
import { bnDigits, fmtDate, num } from '../../engine/dates';
import { bnIn } from '../../engine/text';

const PILLAR_ICONS = [History, CloudLightning, Bug, CalendarClock, Shovel, Wheat, Thermometer, Store];
const DANGER_ICON = { 1: Skull, 2: Flame, 3: Waves, 4: Landmark };
const STORY_YEAR = { sylhet: 2022, chattogram: 2020, khulna: 2021, barishal: 2019, rangpur: 2021 };
const MUTED = '#5d6a63', GRID = '#eef0ec';
const tick = { fontSize: 11, fill: MUTED };
const yr = (y, lang) => (lang === 'bn' ? bnDigits(y) : String(y));

let dataPromise = null;
const loadData = () => (dataPromise ??= import('../../data/stories_climate.json').then((m) => m.default));

export default function StoryLevel() {
  const { id } = useParams();
  const lv = levelOf(id);
  const { T, L, s } = useStore();
  const [D, setD] = useState(null);
  useEffect(() => { if (lv?.mission) loadData().then(setD); }, [lv?.mission]);
  if (!lv) return <Navigate to="/stories" replace />; // an unknown story id goes back to the list
  const i = LEVELS.indexOf(lv), prev = LEVELS[i - 1], next = LEVELS[i + 1];
  const m = lv.mission ? MISSIONS[lv.mission] : null;
  return (
    <div className="page-shell pb-24 pt-[100px] sm:pt-[112px]">
      <Link to="/stories" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-700"><ArrowLeft size={16} />{T('সাত বিভাগের গল্প', 'Seven divisions')}</Link>
      <Hero lv={lv} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <section className="glass flat rounded-[24px] p-5 sm:p-6">
          <h2 className="text-[20px] font-bold">{T('গল্প', 'The story')}</h2>
          <p className="mt-2 whitespace-pre-line text-[16px] leading-8 text-ink/85">{L(lv.story)}</p>
        </section>
        <section className="glass flat rounded-[24px] p-5">
          <div className="space-y-3">
            <Boss icon={Swords} tone="text-red-700 bg-red-50" k={T('পরিবেশের দানব', 'Environmental boss')} v={L(lv.hazard)} />
            <Boss icon={Bug} tone="text-paddy-700 bg-paddy-50" k={T('রোগ-পোকার দানব', 'Biological boss')} v={L(lv.bio)} />
            <Boss icon={Sparkles} tone="text-primary-700 bg-primary-50" k={T('FieldShift আর কর্মকর্তার পাওয়ার-আপ', 'FieldShift and officer power-up')} v={L(lv.power)} />
          </div>
          {UPAZILAS[lv.upz] && <OfficerCard u={UPAZILAS[lv.upz]} />}
          {m && <div className="mt-4 border-t border-border pt-3">
            <div className="text-[13px] font-semibold text-muted">{T('জমি', 'Plots')}</div>
            <ul className="mt-1 space-y-1 text-[14px]">{m.plots.map((p) => <li key={p.id} className="flex justify-between gap-2"><span>{L(p.name)}</span><b className="tabular">{num(p.area, s.lang, { dp: 1 })} {T('একর', 'ac')}</b></li>)}</ul>
          </div>}
        </section>
      </div>
      {lv.pillars && (
        <section className="mt-6">
          <h2 className="text-[20px] font-bold">{T('আট স্তম্ভে জীবন', 'Eight pillars of a farming life')}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lv.pillars.map((p, k) => { const Icon = PILLAR_ICONS[k]; return (
              <div key={k} className="glass flat rounded-2xl p-4">
                <div className="flex items-center gap-2 text-[14px] font-bold" style={{ color: lv.tone }}><Icon size={17} />{L(PILLARS[k])}</div>
                <p className="mt-1.5 text-[14px] leading-6 text-ink/80">{L(p)}</p>
              </div>
            ); })}
          </div>
        </section>
      )}
      {lv.live && <LiveLevel lv={lv} />}
      {m && (!D ? <div className="mt-8 h-64 animate-pulse rounded-[24px] bg-black/[.04]" /> : (
        <>
          <Hazard m={m} D={D} lv={lv} />
          <Mission m={m} D={D} lv={lv} />
        </>
      ))}
      {lv.resolution && (
        <section className="mt-6 rounded-[24px] border border-primary-200 bg-primary-50/70 p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[20px] font-bold text-primary-900"><HeartHandshake size={20} />{T('FieldShift আর উপজেলা কৃষি অফিসার যা বদলালেন', 'What FieldShift and the upazila officer changed')}</h2>
          <p className="mt-2 text-[15.5px] leading-8 text-primary-950/85">{L(lv.resolution)}</p>
        </section>
      )}
      <nav className="mt-8 flex justify-between gap-3">
        {prev ? <Link to={`/stories/${prev.id}`} className="flex items-center gap-1.5 font-semibold text-primary-700"><ArrowLeft size={16} />{T(`স্তর ${bnDigits(prev.n)}`, `Level ${prev.n}`)}: {L(prev.division)}</Link> : <span />}
        {next && <Link to={`/stories/${next.id}`} className="flex items-center gap-1.5 font-semibold text-primary-700">{T(`স্তর ${bnDigits(next.n)}`, `Level ${next.n}`)}: {L(next.division)}<ArrowRight size={16} /></Link>}
      </nav>
    </div>
  );
}

function Hero({ lv }) {
  const { T, L, s } = useStore();
  return (
    <header className="relative mt-3 overflow-hidden rounded-[28px] bg-primary-950 text-white">
      <div className="grid h-[260px] grid-cols-4 gap-0.5 sm:h-[320px]">
        {lv.crops.slice(0, 3).map((c, k) => <div key={c.id} className={`relative ${k === 0 ? 'col-span-2' : ''}`}><CropPhoto crop={c} width={700} sizes="400px" creditTop /></div>)}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,14,.15)_0%,rgba(8,26,14,.88)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: lv.tone }}>{T(`স্তর ${bnDigits(lv.n)}`, `Level ${lv.n}`)}</span>
          <span className="text-[14px] font-semibold text-white/85">{L(lv.division)} {T('বিভাগ', 'division')} · {L(lv.upazila)}{lv.union ? `, ${L(lv.union)}` : ''}</span>
          {lv.woman && <span className="rounded-full bg-violet-200 px-2.5 py-0.5 text-[12px] font-bold text-violet-900">{T('নারী কৃষক', 'Woman farmer')}</span>}
        </div>
        <h1 className="font-display mt-2 text-[34px] font-semibold leading-tight sm:text-[46px]">{L(lv.farmer)}{lv.age ? <span className="text-white/70">, {T(`${bnDigits(lv.age)} বছর`, `${lv.age}`)}</span> : null}</h1>
        <p className="mt-1 text-[14px] text-white/80">{T('সই ফসল', 'Signature crops')}: {lv.crops.map((c) => L(c.name)).join(' · ')}{lv.acres ? T(` · মোট ${num(lv.acres, 'bn', { dp: 1 })} একর`, ` · ${lv.acres} acres in all`) : ''}</p>
      </div>
    </header>
  );
}
function Boss({ icon: Icon, tone, k, v }) {
  return <div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={19} /></span><span><span className="block text-[12.5px] font-semibold text-muted">{k}</span><span className="block text-[15px] font-semibold leading-6">{v}</span></span></div>;
}

// The real head of the upazila agriculture office, as the office's DAE portal lists them.
function OfficerCard({ u }) {
  const { T, L } = useStore();
  return (
    <div className="mt-4 rounded-xl bg-primary-50/70 p-3 ring-1 ring-primary-100">
      <div className="text-[12.5px] font-semibold text-muted">{T('উপজেলা কৃষি অফিসার', 'Upazila agriculture officer')}</div>
      <div className="text-[15.5px] font-bold text-primary-900">{L(u.officer)}</div>
      <div className="text-[12.5px] text-primary-800">{T(`উপজেলা কৃষি অফিস, ${u.name.bn}, ${u.district.bn}`, `Upazila agriculture office, ${u.name.en}, ${u.district.en}`)}</div>
      <p className="mt-1 text-[11.5px] leading-5 text-muted">{u.officerSource
        ? <>{T('নাম অফিসের DAE বাতায়ন থেকে, ১৯ অক্টোবর ২০২৬।', 'Name from the office’s DAE portal, 19 October 2026.')} <a href={u.officerSource} target="_blank" rel="noreferrer" className="font-semibold text-primary-700 hover:underline">{T('উৎস', 'Source')}</a>. </>
        : null}{T('গল্পের ঘটনা কাল্পনিক, তাঁকে নিয়ে নয়।', 'The story’s events are fiction and not about them.')}</p>
    </div>
  );
}

// Every level is also a live sample farm in the app.
function LiveLevel({ lv }) {
  const { T, L, dispatch } = useStore();
  const navigate = useNavigate();
  const go = (to) => { dispatch({ type: 'chooseFarmer', id: lv.live }); navigate(to); };
  const tools = [
    ['/farmer', T('খামারের হোম', 'Farm home')], ['/farmer/plan', T('মৌসুমের পরিকল্পনা (নাসার ২৫ বছর)', 'Season plan (25 years of NASA weather)')],
    ['/farmer/today', T('আজকের সেচ', 'Irrigation today')], ['/farmer/future', T('জমির ভবিষ্যৎ: ২০৪০-এর দশক', 'Field future: the 2040s')], ['/farmer/doctor', T('ফসলের ডাক্তার', 'Crop doctor')],
  ];
  return (
    <section className="mt-6 rounded-[24px] bg-primary-950 p-5 text-white sm:p-6">
      <h2 className="text-[20px] font-bold">{T(`${L(lv.farmer)}-এর খামারে ঢুকুন`, `Enter ${L(lv.farmer)}’s farm`)}</h2>
      <p className="mt-1 text-[14.5px] leading-7 text-primary-100">{T('নিবন্ধিত জমি, উপগ্রহে মাঠ দেখা, এলাকার সতর্কতা আর কর্মকর্তার বার্তা, সব আসল তথ্যে চলে।', 'Registered fields, satellite field watch, area alerts and officer messages, all on real data.')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {tools.map(([to, label], k) => (
          <button key={to} type="button" onClick={() => go(to)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14.5px] font-semibold ${k === 0 ? 'bg-white text-primary-900' : 'bg-white/10 hover:bg-white/20'}`}>{k === 0 && <LogIn size={16} />}{label}</button>
        ))}
      </div>
    </section>
  );
}

// ───────── the hazard on real data, and a live check ─────────
function Hazard({ m, D, lv }) {
  const { T, s } = useStore();
  const lang = s.lang;
  const rows = useMemo(() => m.years.map((y) => ({ year: y, ...m.hazard(D, y) })), [m, D]);
  const prov = D.provenance;
  let chart = null, note = null;
  if (m.id === 'sylhet') {
    const doy = (i) => { const t = Date.UTC(2001, 0, 1) + i * 864e5; return Math.round((t - Date.UTC(new Date(t).getUTCFullYear(), 0, 1)) / 864e5) + 1; };
    const h29 = 335 + 160 - 365, h88 = 335 + 142 - 365; // sown 1 Dec
    const byYear = rows.map((r) => ({ year: r.year, y: r.flood ? doy(r.flood.i) : null, mm: r.flood?.mm }));
    chart = (
      <LineChart data={byYear} margin={{ top: 10, right: 10, left: -6, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={tick} tickLine={false} interval={0} tickFormatter={(v) => yr(v, lang).slice(-2)} />
        <YAxis domain={[60, 152]} reversed tick={tick} width={52} tickFormatter={(v) => fmtDate(Date.UTC(2021, 0, v), lang)} />
        <ReferenceLine y={h29} stroke="#b3261e" strokeDasharray="5 4" label={{ value: T('ধান২৯ পাকে (১ ডিসে. বুনলে)', 'dhan29 ripe (sown 1 Dec)'), fontSize: 11, fill: '#b3261e', position: 'insideBottomRight' }} />
        <ReferenceLine y={h88} stroke="#2f6e2f" strokeDasharray="5 4" label={{ value: T('ধান৮৮ পাকে', 'dhan88 ripe'), fontSize: 11, fill: '#2f6e2f', position: 'insideTopRight' }} />
        <Tooltip cursor={false} labelFormatter={(v) => yr(v, lang)} formatter={(v, n, p) => [v == null ? T('মার্চ–মে-তে বড় ঢল নেই', 'No big flood Mar–May') : `${fmtDate(Date.UTC(p.payload.year, 0, v), lang)} · ${lang === 'bn' ? bnDigits(p.payload.mm) : p.payload.mm} ${T('মিমি', 'mm')}`, T('ঢল', 'Flood')]} contentStyle={{ borderRadius: 12, fontSize: 12.5 }} />
        <Line dataKey="y" stroke="none" isAnimationActive={false} connectNulls={false} activeDot={{ r: 7 }}
          dot={(p) => (p.payload.y == null ? <g key={p.index} /> : <circle key={p.index} cx={p.cx} cy={p.cy} r={6} fill={p.payload.y < h29 ? '#b3261e' : lv.tone} stroke="#fff" strokeWidth={1.5} />)} />
      </LineChart>
    );
    const hit = byYear.filter((p) => p.y != null), before29 = hit.filter((p) => p.y < h29 - 15).length, before88 = hit.filter((p) => p.y < h88 - 15).length;
    note = T(`সোহরায় (চেরাপুঞ্জি) প্রথমবার ৪৮ ঘণ্টায় ১২০ মিমি বা বেশি আইমার্জ বৃষ্টির দিন, প্রতি বছর। এই নিয়ম ২০০৪, ২০১০, ২০১৭ আর ২০২২-এর চারটি বড় হাওর ঢলের দিনই ধরে (১৪ এপ্রিল, ৩০ মার্চ, ৩১ মার্চ, ১৫ এপ্রিল)। আইমার্জ পাহাড়ের চরম বৃষ্টি কিছুটা কম মাপে, তাই সীমা ১২০ মিমি। ১ ডিসেম্বর বুনলে ধান২৯ পাকার দুই সপ্তাহের বেশি আগে ঢল এসেছে ${bnDigits(before29)} বছর, ধান৮৮-এ ${bnDigits(before88)} বছর (${bnDigits(rows.length)}টির মধ্যে)।`,
      `The first 48 hours each year with 120 mm or more of IMERG rain at Sohra (Cherrapunji). The rule picks out all four big haor flash floods of 2004, 2010, 2017 and 2022 on their days (14 Apr, 30 Mar, 31 Mar, 15 Apr). IMERG reads hill extremes somewhat low, hence 120 mm. Sown on 1 December, the flood came more than two weeks before dhan29 was ripe in ${before29} years, and before dhan88 in ${before88} (of ${rows.length}).`);
  } else if (m.id === 'chattogram') {
    const data = rows.map((r) => ({ year: r.year, mm: r.burst?.mm ?? Math.round(maxRun3(D.places.sitakunda.imerg, r.year)), hit: !!r.burst }));
    chart = barChart(data, 'mm', 150, T('১৫০ মিমি', '150 mm'), (d) => (d.hit ? '#b3261e' : lv.tone), lang, T('মিমি, ৩ দিনে', 'mm in 3 days'));
    note = T(`অক্টোবর থেকে ১৫ নভেম্বরে সীতাকুণ্ডে তিন দিনের সবচেয়ে বেশি আইমার্জ বৃষ্টি। লাল: ১৫০ মিমি ছাড়ানো মেঘভাঙা বৃষ্টি, ${bnDigits(data.filter((d) => d.hit).length)} বছর।`, `The wettest three days at Sitakunda from October to 15 November (IMERG). Red: cloudbursts past 150 mm, in ${data.filter((d) => d.hit).length} years.`);
  } else if (m.id === 'khulna') {
    const data = rows.map((r) => ({ year: r.year, ec: Math.round(r.peak * 10) / 10 }));
    chart = barChart(data, 'ec', 12, '12 dS/m', (d) => (d.ec >= 16 ? '#7a1f15' : d.ec >= 12 ? '#b3261e' : lv.tone), lang, 'dS/m');
    note = T('খালি মাটিতে শুকনো মৌসুমের সর্বোচ্চ লবণ, প্রতি বছর: নভেম্বরের মাঝামাঝি থেকে দাকোপের নাসা আবহাওয়ায় পানির ঘাটতি (হারগ্রিভস ET₀ − বৃষ্টি) যত বাড়ে, লবণ তত ওঠে। মাঝারি বছরে এপ্রিলের মাঝামাঝি গল্পের ১২ dS/m-এ মেলানো; নিজের EC মিটারের মাপ দিয়ে বদলান।', 'Peak dry-season salt in bare soil, each year: as the water deficit grows from mid-November on Dacope’s NASA weather (Hargreaves ET₀ − rain), salt rises. Set so a median year reaches the story’s 12 dS/m by mid-April; put in your own EC meter reading.');
  } else if (m.id === 'barishal') {
    const data = rows.map((r) => ({ year: r.year, n: r.sub.length, borer: r.borer }));
    chart = barChart(data, 'n', null, null, (d) => (d.borer >= 40 ? '#b3261e' : lv.tone), lang, T('দিন', 'days'));
    note = T('প্রতি বছর আগস্ট–অক্টোবরে জোয়ারের কোটালের যে দিনগুলোতে তিন দিনে ৫০ মিমি বা বেশি বৃষ্টি (নাসা POWER), অর্থাৎ জমি ডোবার দিন। কোটাল: চাঁদের বয়স থেকে, অমাবস্যা-পূর্ণিমার ০.৫–২.৫ দিন পর। লাল: সেপ্টেম্বর–অক্টোবরে ৪০টির বেশি গুমোট রাত, মাজরার বছর।', 'Each year, August–October spring-tide days with 50 mm or more of rain over three days (NASA POWER): the days the fields go under. Spring tides from the moon’s age, 0.5–2.5 days after new and full moon. Red: over 40 humid, warm nights in Sep–Oct, a stem-borer year.');
  } else if (m.id === 'rangpur') {
    const data = rows.map((r) => ({ year: r.year, run: r.run, cold: r.cold }));
    chart = barChart(data, 'run', 3, T('৩ দিন', '3 days'), (d) => (d.run >= 3 ? '#b3261e' : lv.tone), lang, T('টানা দিন', 'days running'));
    note = T('প্রতি শীতে (২০ ডিসেম্বর–১০ ফেব্রুয়ারি) টানা কত দিন ব্লাইটের আবহাওয়া: দিনের গড় আর্দ্রতা ৮০% বা বেশি, রাত ৭°-এর ওপরে, দিন ২৪°-এর নিচে (নাসা POWER)। লাল: টানা ৩ দিন বা বেশি, পাতা ভিজে থাকে, মড়কের ঝুঁকি।', 'Each winter (20 Dec–10 Feb), the longest run of blight weather: daily mean humidity 80% or more, nights above 7 °C, days below 24 °C (NASA POWER). Red: three days or more running, leaves stay wet, blight risk.');
  }
  return (
    <section id="lv-hazard" className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
      <div className="glass flat rounded-[24px] p-5">
        <h2 className="flex items-center gap-2 text-[20px] font-bold"><Radar size={20} style={{ color: lv.tone }} />{T('আসল তথ্যে দানবকে মাপা', 'The boss, measured on real data')}</h2>
        <div className="mt-3 h-[260px]"><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div>
        <p className="mt-2 text-[13px] leading-6 text-muted">{note}</p>
        <p className="mt-1 text-[11.5px] text-muted">{T('সূত্র', 'Source')}: {prov.dataset}; {prov.start} – {prov.end}</p>
      </div>
      <LiveCheck m={m} D={D} lv={lv} />
    </section>
  );
}
function maxRun3(arr, y) {
  const a = Math.round((Date.UTC(y, 9, 1) - Date.UTC(2001, 0, 1)) / 864e5), b = a + 44;
  let mx = 0; for (let i = a; i <= b; i++) mx = Math.max(mx, (arr[i] ?? 0) + (arr[i + 1] ?? 0) + (arr[i + 2] ?? 0));
  return mx;
}
function barChart(data, key, ref, refLabel, color, lang, unit) {
  return (
    <BarChart data={data} margin={{ top: 14, right: 6, left: -12, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis dataKey="year" tick={tick} tickLine={false} tickFormatter={(v) => yr(v, lang).slice(-2)} interval={0} />
      <YAxis tick={tick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (lang === 'bn' ? bnDigits(v) : v)} />
      {ref != null && <ReferenceLine y={ref} stroke="#b3261e" strokeDasharray="5 4" label={{ value: refLabel, fontSize: 11, fill: '#b3261e', position: 'insideTopLeft' }} />}
      <Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} labelFormatter={(v) => yr(v, lang)} formatter={(v) => [`${lang === 'bn' ? bnDigits(v) : v} ${unit}`]} contentStyle={{ borderRadius: 12, fontSize: 12.5 }} />
      <Bar dataKey={key} radius={[4, 4, 0, 0]} isAnimationActive={false}>{data.map((d) => <Cell key={d.year} fill={color(d)} />)}</Bar>
    </BarChart>
  );
}

// Live: Open-Meteo forecast at the place (and upstream for Sylhet), read in the browser.
async function forecast(lat, lon, q) {
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&timezone=Asia%2FDhaka&forecast_days=7&${q}`);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
function LiveCheck({ m, D, lv }) {
  const { T, s } = useStore();
  const lang = s.lang;
  const [st, setSt] = useState({ loading: true });
  const P = D.places;
  useEffect(() => {
    let alive = true;
    const pt = m.id === 'sylhet' ? P.sohra : P[m.place];
    const q = m.id === 'rangpur' ? 'hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_min' : 'daily=precipitation_sum';
    forecast(pt.lat, pt.lon, q).then((j) => alive && setSt({ j })).catch(() => alive && setSt({ err: true }));
    return () => { alive = false; };
  }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const now = Date.now();
  let level = 'ok', head = '', body = '';
  if (st.j) {
    const d = st.j.daily;
    if (m.id === 'rangpur') {
      // Hutton-style: a day with ≥6 hours at RH ≥90% and a night not below 7 °C (fog-blight form for Bangladesh).
      const h = st.j.hourly, days = d.time.map((t, k) => ({ t, wet: h.relative_humidity_2m.slice(k * 24, k * 24 + 24).filter((x) => x >= 90).length, tmin: d.temperature_2m_min[k] }));
      const risk = days.map((x) => x.wet >= 6 && x.tmin >= 7);
      let run = 0, best = 0, at = null; risk.forEach((r, k) => { run = r ? run + 1 : 0; if (run > best) { best = run; at = days[k - run + 1].t; } });
      const season = [10, 11, 0, 1].includes(new Date().getMonth()); // potatoes are in the field November–February
      level = !season ? 'ok' : best >= 2 ? 'red' : best === 1 ? 'amber' : 'ok';
      head = !season ? T('এখন আলু মাঠে নেই; সতর্কতা চলে নভেম্বর–ফেব্রুয়ারি', 'No potatoes in the field now; the alert runs November–February') : level === 'red' ? T('লাল সতর্কতা: টানা ভেজা ঠান্ডা দিন আসছে', 'Red alert: damp cold days in a row are coming') : level === 'amber' ? T('সাবধান: একটি ব্লাইট-উপযোগী দিন', 'Watch: one blight-friendly day') : T('আগামী ৭ দিনে ব্লাইটের আবহাওয়া নেই', 'No blight weather in the next 7 days');
      body = T(`আগামী ৭ দিনের ঘণ্টাভিত্তিক পূর্বাভাসে ৯০%-এর বেশি আর্দ্রতা: ${days.map((x) => bnDigits(x.wet)).join(', ')} ঘণ্টা।${at ? ` শুরু ${fmtDate(Date.parse(at), 'bn')}।` : ''} লাল হলে: সেচ বন্ধ, আগেভাগে ম্যানকোজেব।`, `Hours above 90% humidity in the next 7 days: ${days.map((x) => x.wet).join(', ')}.${at ? ` From ${fmtDate(Date.parse(at), 'en')}.` : ''} On red: stop irrigating, mancozeb ahead.`);
    } else {
      const p = d.precipitation_sum.map((x) => x ?? 0);
      const two = Math.max(...p.slice(0, -1).map((x, k) => x + p[k + 1])), three = Math.max(...p.slice(0, -2).map((x, k) => x + p[k + 1] + p[k + 2]));
      const thr = m.id === 'sylhet' ? [60, 120, two] : m.id === 'chattogram' ? [60, 100, three] : [40, 80, three];
      level = thr[2] >= thr[1] ? 'red' : thr[2] >= thr[0] ? 'amber' : 'ok';
      const where = m.id === 'sylhet' ? T('উজানে সোহরায় (চেরাপুঞ্জি)', 'Upstream at Sohra (Cherrapunji)') : T(bnIn(lv.upazila.bn), `At ${lv.upazila.en}`);
      head = level === 'red' ? (m.id === 'sylhet' ? T('লাল সতর্কতা: পাহাড়ি ঢলের মতো বৃষ্টি', 'Red alert: flash-flood rain upstream') : T('লাল সতর্কতা: ভারী বৃষ্টি আসছে', 'Red alert: heavy rain coming')) : level === 'amber' ? T('সাবধান: ভারী বৃষ্টির সম্ভাবনা', 'Watch: heavy rain possible') : T('আগামী ৭ দিনে বড় বৃষ্টি নেই', 'No big rain in the next 7 days');
      body = T(`${where} আগামী ৭ দিনের বৃষ্টি (মিমি): ${p.map((x) => bnDigits(Math.round(x))).join(', ')}। সবচেয়ে ভেজা ${m.id === 'sylhet' ? 'দুই' : 'তিন'} দিন ${bnDigits(Math.round(thr[2]))} মিমি।`, `${where}, rain over the next 7 days (mm): ${p.map((x) => Math.round(x)).join(', ')}. Wettest ${m.id === 'sylhet' ? 'two' : 'three'} days: ${Math.round(thr[2])} mm.`);
    }
  }
  const tone = { red: 'border-red-300 bg-red-50 text-red-900', amber: 'border-amber-300 bg-amber-50 text-amber-900', ok: 'border-primary-200 bg-primary-50 text-primary-900' }[level];
  // Tide and moon for Barishal: the next 30 days, worked out from the moon's age.
  const moonDays = m.id === 'barishal' ? Array.from({ length: 30 }, (_, k) => { const t = now + k * 864e5; return { t, kotal: isKotal(t), dark: isDark(t), age: moonAge(t) }; }) : null;
  return (
    <div className="glass flat rounded-[24px] p-5">
      <h2 className="flex items-center gap-2 text-[18px] font-bold"><CloudLightning size={19} style={{ color: lv.tone }} />{T('আজকের সতর্কতা (সরাসরি)', 'Today’s alert (live)')}</h2>
      {lv.tools && <ul className="mt-1 text-[12.5px] text-muted">{lv.tools.map((x, k) => <li key={k}>• {lang === 'bn' ? x.bn : x.en}</li>)}</ul>}
      {st.loading && <div className="mt-3 h-24 animate-pulse rounded-xl bg-black/[.05]" />}
      {st.err && <p className="mt-3 text-[13.5px] text-muted">{T('পূর্বাভাস আনা গেল না (ইন্টারনেট?)।', 'Could not reach the forecast (offline?).')}</p>}
      {st.j && <div className={`mt-3 rounded-xl border p-3 ${tone}`}><div className="flex items-center gap-1.5 text-[15px] font-bold">{level === 'ok' ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}{head}</div><p className="mt-1 text-[13px] leading-6">{body}</p></div>}
      {moonDays && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[14px] font-bold"><Moon size={16} />{T('আগামী ৩০ দিন: কোটাল আর অন্ধকার রাত', 'Next 30 days: spring tides and dark nights')}</div>
          <div className="mt-2 grid grid-cols-10 gap-1">
            {moonDays.map((x) => (
              <div key={x.t} title={fmtDate(x.t, lang)} className={`rounded-md py-1 text-center text-[10.5px] font-semibold ${x.kotal ? 'bg-sky-600 text-white' : x.dark ? 'bg-primary-950 text-white' : 'bg-black/[.05] text-muted'}`}>{lang === 'bn' ? bnDigits(new Date(x.t).getDate()) : new Date(x.t).getDate()}</div>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] leading-5 text-muted">{T('নীল: কোটাল (জমি ডোবার ভয়, আইল উঁচু রাখুন)। কালো: অন্ধকার রাত (আলোর ফাঁদ জ্বালান, মথ বেশি ধরা পড়ে)। চাঁদের গড় চক্র (২৯.৫৩ দিন) থেকে হিসাব।', 'Blue: spring tides (fields may go under; keep the bunds high). Black: dark nights (light traps catch most moths). From the mean lunar cycle (29.53 days).')}</p>
        </div>
      )}
      {m.id === 'sylhet' && <LimeCalc D={D} />}
      {m.id === 'khulna' && <SaltCalc />}
      <p className="mt-3 text-[11.5px] text-muted">{T('পূর্বাভাস: Open-Meteo, এখনই আনা।', 'Forecast: Open-Meteo, fetched now.')}</p>
    </div>
  );
}
function LimeCalc({ D }) {
  const { T, s } = useStore();
  const soil = D.places.gowainghat.soil;
  const [ph, setPh] = useState(4.3);
  const dose = limeDose(ph, soil?.clay);
  return (
    <div className="mt-4 rounded-xl border border-border bg-white p-3">
      <div className="text-[14px] font-bold">{T('মাটির pH-চুনের হিসাব', 'Soil pH and lime')}</div>
      <label className="mt-2 block text-[12.5px] text-muted">{T('মাটি পরীক্ষার pH', 'Soil-test pH')}: <b className="text-ink">{num(ph, s.lang, { dp: 1 })}</b></label>
      <input type="range" min="3.8" max="7" step="0.1" value={ph} onChange={(e) => setPh(Number(e.target.value))} className="w-full accent-primary-700" />
      <p className="text-[13.5px] leading-6">{dose ? T(`হেক্টরে ${num(dose, 'bn', { dp: 1 })} টন ডলোচুন, বিঘায় প্রায় ${num(dose * T_HA_TO_KG_BIGHA, 'bn')} কেজি; চাষের ২–৩ সপ্তাহ আগে, তিন-চার বছরে একবার।`, `${dose} t/ha of dolomite, about ${Math.round(dose * T_HA_TO_KG_BIGHA)} kg a bigha; 2–3 weeks before planting, once in three or four years.`) : T('pH ৫.৫ বা বেশি: চুন লাগবে না।', 'pH 5.5 or more: no lime needed.')}</p>
      {soil && <p className="mt-1 text-[11.5px] text-muted">{T(`SoilGrids-এ উপজেলার মাঝখানে pH ${num(soil.ph, 'bn', { dp: 1 })}, এঁটেল ${num(soil.clay, 'bn')}%; টিলার মাটি আলাদা হতে পারে, তাই নিজের মাটি পরীক্ষা দিন।`, `SoilGrids at the upazila centre: pH ${soil.ph}, clay ${soil.clay}%; tila soil can differ, so use your own test.`)}</p>}
    </div>
  );
}
function SaltCalc() {
  const { T, s } = useStore();
  const [ec, setEc] = useState(8);
  return (
    <div className="mt-4 rounded-xl border border-border bg-white p-3">
      <div className="text-[14px] font-bold">{T('মাস–হফম্যান: এই লবণে কোন ফসল কত দেয়', 'Maas–Hoffman: what each crop gives at this salt')}</div>
      <label className="mt-2 block text-[12.5px] text-muted">{T('শিকড়ের কাছে মাটির লবণ', 'Root-zone salt')}: <b className="text-ink">{num(ec, s.lang, { dp: 1 })} dS/m</b></label>
      <input type="range" min="0" max="16" step="0.5" value={ec} onChange={(e) => setEc(Number(e.target.value))} className="w-full accent-primary-700" />
      <ul className="mt-1 space-y-1">
        {Object.keys(SALT).map((k) => { const v = relYield(k, ec); return (
          <li key={k} className="flex items-center gap-2 text-[12.5px]"><span className="w-[92px] shrink-0">{CROP_WORD[k][s.lang]}</span><div className="h-2 flex-1 rounded-full bg-black/[.06]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${v}%`, background: v > 60 ? '#2f6e2f' : v > 30 ? '#d08f26' : '#b3261e' }} /></div><b className="w-9 text-right tabular">{num(v, s.lang)}%</b></li>
        ); })}
      </ul>
      <p className="mt-1 text-[11.5px] text-muted">{T('এফএও-২৯ সারণি; লবণসহিষ্ণু ব্রি জাত আর তিল-তরমুজের মান আনুমানিক (পাতায় বলা আছে)।', 'FAO-29 table; salt-tolerant BRRI rice, sesame and watermelon are estimates (said on the page).')}</p>
    </div>
  );
}
const CROP_WORD = { boro: { bn: 'সাধারণ ধান', en: 'Ordinary rice' }, dhan67: { bn: 'ব্রি ধান৬৭', en: 'BRRI dhan67' }, dhan97: { bn: 'ব্রি ধান৯৭', en: 'BRRI dhan97' }, sunflower: { bn: 'সূর্যমুখী', en: 'Sunflower' }, sesame: { bn: 'তিল', en: 'Sesame' }, watermelon: { bn: 'তরমুজ', en: 'Watermelon' } };

// ───────── the mission ─────────
function Mission({ m, D, lv }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const [c, setC] = useState(() => ({ ...m.start }));
  const [inp, setInp] = useState(() => Object.fromEntries(Object.entries(m.inputs ?? {}).map(([k, v]) => [k, v.value])));
  const [year, setYear] = useState(STORY_YEAR[m.id] ?? m.years[m.years.length - 1]);
  const [res, setRes] = useState(null);
  const [shown, setShown] = useState(0);
  const [danger, setDanger] = useState(null);
  const [hist, setHist] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const play = (y = year) => {
    const r = m.run(D, c, y, inp);
    setRes({ ...r, year: y }); setShown(0); setDanger(null); setHist(null);
    clearInterval(timer.current);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(r.events.length); if (r.danger) setDanger(r.danger); return; }
    let k = 0;
    timer.current = setInterval(() => { k++; setShown(k); if (k >= r.events.length) { clearInterval(timer.current); if (r.danger) setTimeout(() => setDanger(r.danger), 500); } }, 650);
  };
  const runAll = () => {
    const me = history(m, D, c, inp), old = history(m, D, m.start, inp);
    setHist({ me, old });
  };
  const groups = [...m.plots.map((p) => ({ id: p.id, name: L(p.name) })), { id: 'farm', name: T('পুরো খামার', 'The whole farm') }];
  const done = res && shown >= res.events.length;
  return (
    <section id="lv-mission" className="mt-6 rounded-[28px] border border-border bg-white p-4 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-[22px] font-bold"><Swords size={22} style={{ color: lv.tone }} />{T(`মিশন: ${L(lv.farmer)}-এর মৌসুম`, `Mission: ${L(lv.farmer)}’s season`)}</h2>
          <p className="text-[14px] leading-6 text-muted">{T('প্রতিটি জমির জন্য বেছে নিন, তারপর একটা আসল পুরোনো বছরে চালিয়ে দেখুন। শুরুতে গল্পের পুরোনো অভ্যাস বসানো আছে।', 'Choose for each plot, then play it through a real past year. It starts with the old habits from the story.')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setC({ ...m.start })} className="rounded-xl border border-border px-3 py-2 text-[13.5px] font-semibold hover:bg-black/[.03]"><RotateCcw size={14} className="mr-1 inline" />{T('পুরোনো অভ্যাস', 'Old habits')}</button>
          <button type="button" onClick={() => setC({ ...m.best })} className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-[13.5px] font-semibold text-primary-800 hover:bg-primary-100"><Lightbulb size={14} className="mr-1 inline" />{T('কর্মকর্তার পরামর্শ', 'The officer’s advice')}</button>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {groups.map((g) => {
          const list = m.choices.filter((x) => x.plot === g.id);
          if (!list.length) return null;
          return (
            <div key={g.id} className="rounded-2xl bg-black/[.025] p-3.5">
              <div className="text-[14px] font-bold" style={{ color: lv.tone }}>{g.name}</div>
              <div className="mt-2 space-y-3">
                {list.map((ch) => (
                  <div key={ch.id}>
                    <div className="text-[12.5px] font-semibold text-muted">{L(ch.label)}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {ch.options.map((o) => (
                        <button key={o.id} type="button" onClick={() => setC({ ...c, [ch.id]: o.id })} aria-pressed={c[ch.id] === o.id}
                          className={`min-h-9 rounded-xl border px-2.5 py-1.5 text-left text-[13px] font-semibold leading-5 transition ${c[ch.id] === o.id ? 'border-primary-700 bg-primary-700 text-white' : 'border-border bg-white hover:border-primary-300'}`}>{L(o.label)}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.entries(m.inputs ?? {}).filter(() => (m.id === 'sylhet' ? g.id === 'B' : g.id === 'farm')).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[12.5px] font-semibold text-muted">{L(v.label)}: <b className="text-ink">{num(inp[k], lang, { dp: 1 })}</b></div>
                    <input type="range" min={v.min} max={v.max} step={v.step} value={inp[k]} onChange={(e) => setInp({ ...inp, [k]: Number(e.target.value) })} className="w-full accent-primary-700" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-primary-950 p-3 text-white">
        <span className="text-[14px] font-semibold">{T('কোন বছরে খেলবেন', 'Which year')}</span>
        <select aria-label={T('কোন বছরে খেলবেন', 'Which year')} value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-10 rounded-xl bg-white/10 px-3 text-[14px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-white/80">
          {m.years.map((y) => <option key={y} value={y} className="text-ink">{yr(y, lang)}{y === STORY_YEAR[m.id] ? T(' (গল্পের মতো বছর)', ' (like the story)') : ''}</option>)}
        </select>
        <button type="button" onClick={() => { const y = m.years[Math.floor(Math.random() * m.years.length)]; setYear(y); play(y); }} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-[14px] font-semibold hover:bg-white/20"><Dices size={16} />{T('এলোমেলো বছর', 'Random year')}</button>
        <button type="button" onClick={() => play()} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-paddy-300 px-5 text-[15px] font-bold text-primary-950 hover:bg-paddy-100"><Play size={17} />{T('মৌসুম চালান', 'Play the season')}</button>
      </div>

      {res && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
          <ol className="relative space-y-2.5 border-l-2 border-border pl-5">
            {res.events.slice(0, shown).map((e, k) => (
              <li key={k} className="story-event relative">
                <span className={`absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full ring-4 ring-white ${{ hazard: 'bg-red-600', bad: 'bg-clay-500', good: 'bg-primary-600', info: 'bg-sky-500' }[e.k]}`} />
                <div className="text-[12px] font-semibold text-muted">{fmtDate(e.t0, lang)} {yr(new Date(e.t0).getUTCFullYear(), lang)}</div>
                <div className={`text-[14.5px] leading-6 ${e.k === 'hazard' ? 'font-bold text-red-800' : ''}`}>{lang === 'bn' ? bnDigits(e.t.bn) : e.t.en}</div>
              </li>
            ))}
            {!done && <li className="text-[13px] text-muted">…</li>}
          </ol>
          {done && <Result r={res} m={m} lv={lv} onAll={runAll} />}
        </div>
      )}
      {hist && <HistoryChart hist={hist} lv={lv} />}
      {danger && <DangerEnd id={danger} onClose={() => setDanger(null)} />}
    </section>
  );
}

function Result({ r, m, lv, onAll }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const P = [['Y', T('ফলন', 'Yield')], ['E', T('মাটি ও পরিবেশ', 'Soil and earth')], ['C', T('জলবায়ু সহনশীলতা', 'Climate resilience')], ['B', T('আইপিএম', 'IPM')], ['M', T('বাজার', 'Market')]];
  const DIcon = r.danger ? DANGER_ICON[r.danger] : null;
  return (
    <div className="story-event rounded-2xl border border-border p-4">
      <div className="flex items-center gap-4">
        <ScoreRing value={Math.min(100, r.total)} size={84} color={r.danger ? '#b3261e' : lv.tone} />
        <div>
          <div className="text-[13px] font-semibold text-muted">{T(`FieldShift স্কোর, ${yr(r.year, lang)}`, `FieldShift Score, ${r.year}`)}</div>
          <div className="font-display text-[30px] font-bold tabular">{num(r.total, lang)}{r.total > 100 && <span className="ml-1 text-[14px] text-primary-700">{T('বোনাসসহ', 'with bonus')}</span>}</div>
          {r.blind && <div className="text-[12.5px] font-semibold text-red-700">{T('অন্ধ স্প্রে: −১৫', 'Blind spraying: −15')}</div>}
          {r.bonus && !r.danger && <div className="text-[12.5px] font-semibold text-primary-700">{T('সতর্কতা মেনে কাজ: ×১.১', 'Acted on the alert: ×1.1')}</div>}
        </div>
      </div>
      {r.danger && <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-[14px] font-bold text-red-800"><DIcon size={17} />{T('বিপদের শেষ', 'Danger End')}: {L(DANGERS[r.danger].title)}</div>}
      <ul className="mt-3 space-y-1.5">
        {P.map(([k, label]) => (
          <li key={k} className="flex items-center gap-2 text-[13px]"><span className="w-[118px] shrink-0">{label}</span><div className="h-2 flex-1 rounded-full bg-black/[.06]"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.P[k]}%`, background: lv.tone }} /></div><b className="w-8 text-right tabular">{num(r.P[k], lang)}</b></li>
        ))}
      </ul>
      <div className="mt-3 border-t border-border pt-2">
        <div className="text-[12.5px] font-semibold text-muted">{T('জমি অনুযায়ী ফলন (সম্ভাব্যের %)', 'Yield by plot (% of potential)')}</div>
        {r.plots.map((p) => { const pl = m.plots.find((x) => x.id === p.id); return <div key={p.id} className="mt-1 flex justify-between text-[13.5px]"><span>{L(pl.name)}</span><b className={p.rel < 40 ? 'text-red-700' : ''}>{num(p.rel, lang)}%</b></div>; })}
      </div>
      <button type="button" onClick={onAll} className="mt-3 w-full rounded-xl bg-primary-700 px-3 py-2.5 text-[14px] font-semibold text-white hover:bg-primary-800">{T('এই সিদ্ধান্ত সব বছরে চালান', 'Run these choices through every year')}</button>
    </div>
  );
}

function HistoryChart({ hist, lv }) {
  const { T, s } = useStore();
  const lang = s.lang;
  const data = hist.me.rows.map((r, k) => ({ year: r.year, me: r.total, old: hist.old.rows[k].total, danger: r.danger }));
  return (
    <div className="story-event mt-5 rounded-2xl bg-black/[.025] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[17px] font-bold">{T(`${bnDigits(data.length)} বছরে আপনার সিদ্ধান্ত`, `Your choices over ${data.length} years`)}</h3>
        <div className="flex gap-4 text-[13px]"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: lv.tone }} />{T('আপনার', 'Yours')} {num(hist.me.avg, lang)}</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-400" />{T('পুরোনো অভ্যাস', 'Old habits')} {num(hist.old.avg, lang)}</span></div>
      </div>
      <div className="mt-2 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 4, left: -16, bottom: 0 }} barGap={1}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="year" tick={tick} tickLine={false} tickFormatter={(v) => yr(v, lang).slice(-2)} interval={0} />
            <YAxis domain={[0, 110]} tick={tick} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => (lang === 'bn' ? bnDigits(v) : v)} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,.04)' }} labelFormatter={(v) => yr(v, lang)} formatter={(v, n) => [lang === 'bn' ? bnDigits(v) : v, n === 'me' ? T('আপনার', 'Yours') : T('পুরোনো অভ্যাস', 'Old habits')]} contentStyle={{ borderRadius: 12, fontSize: 12.5 }} />
            <Bar dataKey="old" fill="#a8b4ad" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="me" radius={[3, 3, 0, 0]} isAnimationActive={false}>{data.map((d) => <Cell key={d.year} fill={d.danger ? '#b3261e' : lv.tone} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[13px] text-muted">{T(`লাল দণ্ড: বিপদের শেষ, ${bnDigits(hist.me.dangers)} বছর (পুরোনো অভ্যাসে ${bnDigits(hist.old.dangers)} বছর)। সেরা বছর ${bnDigits(hist.me.best.year)}, সবচেয়ে খারাপ ${bnDigits(hist.me.worst.year)}।`, `Red bars: a Danger End, in ${hist.me.dangers} years (${hist.old.dangers} with the old habits). Best year ${hist.me.best.year}, worst ${hist.me.worst.year}.`)}</p>
    </div>
  );
}

function DangerEnd({ id, onClose }) {
  const { T, L } = useStore();
  const d = DANGERS[id], Icon = DANGER_ICON[id];
  const box = useRef(null);
  useEffect(() => { box.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-[1600] grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="danger-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="sheet-fade absolute inset-0 bg-[#2a0a07]/70 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={box} tabIndex={-1} className="danger-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white text-center shadow-2xl outline-none">
        <div className="bg-gradient-to-b from-red-700 to-red-900 px-6 pb-6 pt-7 text-white">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15"><Icon size={34} /></span>
          <div className="mt-3 text-[13px] font-bold uppercase tracking-[.12em] text-red-100">{T('বিপদের শেষ', 'Danger End')} {id}</div>
          <h2 id="danger-title" className="font-display mt-1 text-[28px] font-bold">{L(d.title)}</h2>
        </div>
        <p className="px-6 py-4 text-[15px] leading-7 text-ink/85">{L(d.text)}</p>
        <div className="px-6 pb-6"><button type="button" onClick={onClose} className="w-full rounded-xl bg-primary-700 px-4 py-3 text-[15px] font-bold text-white hover:bg-primary-800">{T('সিদ্ধান্ত বদলে আবার চেষ্টা', 'Change your choices and try again')}</button></div>
        <p className="flex items-center justify-center gap-1.5 pb-4 text-[12px] text-muted"><Info size={13} />{T('কোন সিদ্ধান্তে এমন হলো, ঘটনাগুলোয় দেখুন।', 'The events show which choice led here.')}</p>
      </div>
    </div>
  );
}
