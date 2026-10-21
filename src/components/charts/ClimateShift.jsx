// "The weather is not what it used to be": four crop-relevant measures from 25 seasons, the first 12 against the last
// 13, each with all 25 seasons drawn so the swings show. Bangladesh (Godagari or Dhamrai) reads NASA POWER; the five
// neighbouring countries read ERA5 at their sample farm (POWER's rain record breaks at those cells; see
// scripts/data/build_neighbours.py). The words are written from the numbers, so they always say what the data says.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { useStore, climates, tms, loadClimate } from '../../store';
import { Tags } from '../ui';
import Photo from '../Photo';
import { TM_METRICS, THEN, NOW } from '../../engine/climate';
import { ABROAD, ABROAD_ORDER } from '../../data/abroad';

// A neighbouring country's data file loads only when its chip is chosen.
const ABROAD_FILES = import.meta.glob('../../data/abroad/*.json', { import: 'default' });
import { num } from '../../engine/dates';

const ORDER = ['coldNights', 'lateHeat', 'hotMarApr', 'rabiRain'];
const SHORT = {
  coldNights: { bn: 'শীতের কনকনে রাত', en: 'cold winter nights' },
  lateHeat: { bn: 'ফাল্গুন-চৈত্রের গরম দিন', en: 'warm late-winter days' },
  hotMarApr: { bn: 'চৈত্র-বৈশাখের খুব গরম দিন', en: 'very hot March–April days' },
  rabiRain: { bn: 'রবি মৌসুমের বৃষ্টি', en: 'Rabi-season rain' },
};
// Bangladesh as a whole: the seven upazilas the app follows, one in each division, each measure averaged season by
// season over them (Godagari, Dhamrai, Sitakunda, Dacope, Bakerganj, Gangachara, Gowainghat).
const BD = ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'];
let bdCache = null;
function bdAverage() {
  if (bdCache) return bdCache;
  const avg = (xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  bdCache = Object.fromEntries(ORDER.map((k) => {
    const per = BD.map((id) => tms[id][k]);
    const series = per[0].series.map((x, i) => ({ season: x.season, value: avg(per.map((p) => p.series[i]?.value)) }));
    const then = avg(per.map((p) => p.then)), now = avg(per.map((p) => p.now));
    return [k, { series, then, now, change: then != null && now != null ? now - then : null }];
  }));
  return bdCache;
}

function Spark({ m, k }) {
  const vals = m.series.map((x) => x.value ?? 0);
  const max = Math.max(...vals, 1);
  const W = 128, H = 36, bw = W / vals.length;
  const y = (v) => H - (v / max) * (H - 2);
  const nThen = THEN.length;
  const color = k === 'rabiRain' ? '#2f8a8f' : k === 'coldNights' ? '#5b7fa3' : '#c98a4b';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden="true">
      {vals.map((v, i) => (
        <rect key={i} x={i * bw + 0.6} y={y(v)} width={bw - 1.2} height={H - y(v)} rx="1" fill={i < nThen ? '#c3cbc5' : color}
          style={{ transformOrigin: `0 ${H}px`, animation: `clim-bar .5s ${i * 14}ms both cubic-bezier(.22,1,.36,1)` }} />
      ))}
      <line x1="0" x2={nThen * bw} y1={y(m.then)} y2={y(m.then)} stroke="#5d6a63" strokeWidth="1.4" strokeDasharray="3 2" />
      <line x1={nThen * bw} x2={W} y1={y(m.now)} y2={y(m.now)} stroke="#13261b" strokeWidth="1.6" strokeDasharray="3 2" />
    </svg>
  );
}

// The seven upazilas' climate files load when this section is first shown (LazyMount on the Home page).
export default function ClimateShift() {
  const [bdReady, setBdReady] = useState(() => BD.every((id) => climates[id]));
  useEffect(() => { if (!bdReady) Promise.all(BD.map(loadClimate)).then(() => setBdReady(true), () => {}); }, [bdReady]);
  if (!bdReady) return <section className="py-16 sm:py-20"><div className="page-shell"><div className="skeleton min-h-[620px] rounded-[26px]" aria-hidden="true" /></div></section>;
  return <ClimateShiftView />;
}

function ClimateShiftView() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [country, setCountry] = useState('bangladesh');
  const [abroad, setAbroad] = useState({});
  useEffect(() => {
    if (country === 'bangladesh' || abroad[country]) return;
    ABROAD_FILES[`../../data/abroad/${country}.json`]?.().then((d) => setAbroad((p) => ({ ...p, [country]: d })));
  }, [country, abroad]);
  const ab = country !== 'bangladesh' ? ABROAD[country] : null;
  const abData = ab ? abroad[country] : null;
  const chips = (
    <div className="hide-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={T('দেশ', 'Country')}>
      {['bangladesh', ...ABROAD_ORDER].map((id) => {
        const on = country === id;
        const label = id === 'bangladesh' ? { flag: '🇧🇩', name: T('বাংলাদেশ', 'Bangladesh') } : { flag: ABROAD[id].flag, name: L(ABROAD[id].name) };
        return (
          <button key={id} type="button" role="tab" aria-selected={on} onClick={() => setCountry(id)}
            className={`inline-flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-all duration-300 active:scale-[.97] ${on ? 'bg-ink text-white shadow-[0_6px_16px_-8px_rgba(13,38,20,.6)]' : 'bg-white/70 text-ink ring-1 ring-black/[.06] hover:bg-white'}`}>
            <span aria-hidden="true">{label.flag}</span>{label.name}
          </button>
        );
      })}
    </div>
  );
  if (ab) return <AbroadShift c={ab} data={abData} chips={chips} />;
  const tm = bdAverage();
  const real = BD.every((id) => climates[id]?.prov.status === 'REAL');
  const dir = (k) => { const m = tm[k]; const rel = Math.abs(m.change) / Math.max(m.then, 1); return rel < 0.05 ? 0 : Math.sign(m.change); };
  const said = ORDER.map((k) => {
    const d = dir(k), w = SHORT[k];
    return d === 0 ? T(`${w.bn} প্রায় একই আছে`, `${w.en} are about the same`) : T(`${w.bn} ${d > 0 ? 'বেড়েছে' : 'কমেছে'}`, `${w.en} have ${d > 0 ? 'risen' : 'fallen'}`);
  });
  const rain = tm.rabiRain.series.filter((x) => NOW.includes(x.season) && x.value !== null).map((x) => x.value);
  const lead = T(
    `দাদার আমলের ফসলের ক্যালেন্ডার এখন সবসময় খাটে না। নাসার ২৫ বছরের দৈনিক তথ্যে বাংলাদেশের সাত বিভাগের সাতটি উপজেলায় (গড়ে) আগের ১২ মৌসুমের (২০০১–২০১২) তুলনায় পরের ১৩ মৌসুমে (২০১৩–২০২৫): ${said.join(', ')}। রবির বৃষ্টি বছরে বছরে ${num(Math.min(...rain), 'bn')} থেকে ${num(Math.max(...rain), 'bn')} মিলিমিটার পর্যন্ত ওঠানামা করছে, তাই কোন বছর কেমন হবে আগে থেকে বলা কঠিন।`,
    `Grandfather’s crop calendar no longer always holds. In 25 years of NASA daily data for seven upazilas across Bangladesh's seven divisions (averaged), the last 13 seasons (2013–2025) against the first 12 (2001–2012): ${said.join(', ')}. Rabi rain swings from ${Math.round(Math.min(...rain))} to ${Math.round(Math.max(...rain))} mm from one year to the next, so no single year can be counted on.`,
  );
  return (
    <section className="py-16 sm:py-20">
      <div className="page-shell grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] [&>*]:min-w-0">
        <figure data-reveal className="overflow-hidden rounded-[22px] shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <Photo name="droughtFlood" sizes="(min-width: 1024px) 560px, 100vw" />
        </figure>
        <div data-reveal style={{ '--d': '120ms' }}>
          <h2 className="text-[32px] font-bold sm:text-[40px]">{T('আবহাওয়া আর আগের মতো নেই', 'The weather is not what it used to be')}</h2>
          {chips}
          <p className="caption-in mt-3 text-[16px] leading-8 text-muted">{lead}</p>

          <dl key="rows-bd" className="glass flat mt-6 divide-y divide-black/[.06] rounded-[22px] px-5">
            {ORDER.map((k) => {
              const m = tm[k], meta = TM_METRICS[k], d = dir(k);
              const dp = Math.max(m.then, m.now) < 20 ? 1 : 0;
              const Arrow = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
              return (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div className="min-w-0">
                    <dt className="text-[15px] font-semibold text-ink">{L(meta)}</dt>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{L(meta.detail)}{T('। ', '. ')}{L(meta.why)}{T('।', '.')}</p>
                  </div>
                  <div className="hidden sm:block" title={T('প্রতিটি দণ্ড একটি মৌসুম, ২০০১–২০২৫; ধূসর আগের ১২টি, রঙিন পরের ১৩টি; দাগ দুই সময়ের গড়', 'Each bar is a season, 2001–2025; grey the first 12, coloured the last 13; dashes are the two averages')}><Spark m={m} k={k} /></div>
                  <dd className="text-right">
                    <div className="font-display whitespace-nowrap text-[19px] font-bold tabular">
                      <span className="text-muted">{num(m.then, lang, { dp })}</span>
                      <span className="mx-1.5 text-[14px] font-normal text-muted">→</span>
                      {num(m.now, lang, { dp })} <span className="text-[13px] font-normal text-muted">{L(meta.unit)}</span>
                    </div>
                    <span className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ${d === 0 ? 'bg-black/[.05] text-muted' : 'bg-primary-50 text-primary-800'}`}>
                      <Arrow size={13} />{d === 0 ? T('প্রায় একই', 'about the same') : `${m.change > 0 ? '+' : '−'}${num(Math.abs(m.change), lang, { dp })} ${L(meta.unit)}`}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] leading-6 text-muted">
            {T('উৎস: নাসা পাওয়ার দৈনিক তথ্য, স্থানীয় আবহাওয়া কেন্দ্রের গড়ের সঙ্গে মেলানো; গোদাগাড়ী, ধামরাই, সীতাকুণ্ড, দাকোপ, বাকেরগঞ্জ, গঙ্গাচড়া ও গোয়াইনঘাট, ২০০১–২০২৫ মৌসুম। সংখ্যাগুলো সাত উপজেলার মৌসুমপ্রতি গড়; ছোট দণ্ডগুলো প্রতিটি মৌসুম (ধূসর আগের ১২টি, রঙিন পরের ১৩টি)।', 'Source: NASA POWER daily data matched to the nearest weather stations’ normals; Godagari, Dhamrai, Sitakunda, Dacope, Bakerganj, Gangachara and Gowainghat, seasons 2001–2025. Numbers are per-season averages over the seven; the small bars are each season (grey the first 12, coloured the last 13).')}
            <Tags list={[real ? 'REAL' : 'PLACEHOLDER']} />
          </p>
        </div>
      </div>
    </section>
  );
}

// One neighbouring country: the same four measures at its sample farm, from ERA5.
function AbroadShift({ c, data, chips }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const tm = data?.points.farm.shift;
  const f = c.farmer;
  const dir = (k) => { const m = tm[k]; if (m.then == null || m.now == null) return 0; const rel = Math.abs(m.change) / Math.max(m.then, 1); return rel < 0.05 || Math.max(m.then, m.now) < 1 ? 0 : Math.sign(m.change); };
  const said = tm && ORDER.map((k) => {
    const d = dir(k), w = SHORT[k];
    return d === 0 ? T(`${w.bn} প্রায় একই আছে`, `${w.en} are about the same`) : T(`${w.bn} ${d > 0 ? 'বেড়েছে' : 'কমেছে'}`, `${w.en} have ${d > 0 ? 'risen' : 'fallen'}`);
  });
  const rain = tm ? tm.rabiRain.series.filter((x) => NOW.includes(x.season) && x.value !== null).map((x) => x.value) : [];
  return (
    <section className="py-16 sm:py-20">
      <div className="page-shell grid items-start gap-10 lg:grid-cols-[1fr_1.15fr] [&>*]:min-w-0">
        <figure data-reveal className="overflow-hidden rounded-[22px] shadow-[var(--shadow-card)] lg:sticky lg:top-24">
          <Photo name="droughtFlood" sizes="(min-width: 1024px) 560px, 100vw" />
        </figure>
        <div>
          <h2 className="text-[32px] font-bold sm:text-[40px]">{T('আবহাওয়া আর আগের মতো নেই', 'The weather is not what it used to be')}</h2>
          {chips}
          {!tm ? <div className="mt-6 h-72 animate-pulse rounded-[22px] bg-white/60" aria-busy="true" /> : (
            <>
              <p key={c.id} className="caption-in mt-3 text-[16px] leading-8 text-muted">{T(
                `${c.name.bn}ের ${f.place.bn.split(',').slice(-2).join(',').trim()} এলাকায়, ২৫ বছরের দৈনিক তথ্যে আগের ১২ মৌসুমের (২০০১–২০১২) তুলনায় পরের ১৩ মৌসুমে (২০১৩–২০২৫): ${said.join(', ')}। শীতের মৌসুমের বৃষ্টি বছরে বছরে ${num(Math.min(...rain), 'bn')} থেকে ${num(Math.max(...rain), 'bn')} মিলিমিটার পর্যন্ত ওঠানামা করছে।`,
                `Around ${f.place.en.split(',').slice(-2).join(',').trim()}, ${c.name.en}, in 25 years of daily data, the last 13 seasons (2013–2025) against the first 12 (2001–2012): ${said.join(', ')}. Winter-season rain swings from ${Math.round(Math.min(...rain))} to ${Math.round(Math.max(...rain))} mm from one year to the next.`)}</p>
              <dl key={`rows-${c.id}`} className="glass flat mt-6 divide-y divide-black/[.06] rounded-[22px] px-5">
                {ORDER.map((k) => {
                  const m = tm[k], meta = TM_METRICS[k], d = dir(k);
                  const dp = Math.max(m.then ?? 0, m.now ?? 0) < 20 ? 1 : 0;
                  const Arrow = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
                  return (
                    <div key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <div className="min-w-0">
                        <dt className="text-[15px] font-semibold text-ink">{L(meta)}</dt>
                        <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{L(meta.detail)}{T('।', '.')}</p>
                      </div>
                      <div className="hidden sm:block"><Spark m={{ ...m, then: m.then ?? 0, now: m.now ?? 0 }} k={k} /></div>
                      <dd className="text-right">
                        <div className="font-display whitespace-nowrap text-[19px] font-bold tabular">
                          <span className="text-muted">{num(m.then, lang, { dp })}</span>
                          <span className="mx-1.5 text-[14px] font-normal text-muted">→</span>
                          {num(m.now, lang, { dp })} <span className="text-[13px] font-normal text-muted">{L(meta.unit)}</span>
                        </div>
                        <span className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ${d === 0 ? 'bg-black/[.05] text-muted' : 'bg-primary-50 text-primary-800'}`}>
                          <Arrow size={13} />{d === 0 ? T('প্রায় একই', 'about the same') : `${m.change > 0 ? '+' : '−'}${num(Math.abs(m.change), lang, { dp })} ${L(meta.unit)}`}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] leading-6 text-muted">
                {T(`উৎস: ERA5 দৈনিক তথ্য (ECMWF), ${c.farmer.village.bn}-এর নমুনা খামার, ২০০১–২০২৫ মৌসুম। এখানে নাসা পাওয়ারের বৃষ্টির রেকর্ড ভাঙা, তাই ERA5 — “জমির ভবিষ্যৎ” পাতায় তিন উৎসের যাচাই দেখুন।`, `Source: ERA5 daily data (ECMWF) at the ${c.farmer.village.en} sample farm, seasons 2001–2025. NASA POWER’s rain record breaks at this cell, hence ERA5 — see the three-source check on the Field future page.`)}
                <Tags list={['REAL']} />
              </p>
              <Link to={`/abroad/${c.id}`} className="lift mt-4 inline-flex h-11 touch-manipulation items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold text-white" style={{ background: c.tone }}>
                {T(`${c.farmer.name.bn}-এর খামার দেখুন`, `Open ${c.farmer.name.en}’s farm`)} →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
