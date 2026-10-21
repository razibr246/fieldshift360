// Aman weather hazards for the officer's upazila (scripts/data/build_aman_hazards.mjs): drought, flood and heavy rain,
// heat and cold, each measured in the crop's own windows (hung on the radar-measured transplanting day), 2001 to now,
// with a trend test, and the adaptations that fit the hazards that actually occur here. Sources are listed at the end.
import { CloudRain, Droplets, Flame, Snowflake, Sprout, ShieldCheck, ExternalLink, BookOpen } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Badge, Tags } from '../ui';
import HAZ from '../../data/aman_hazards.json';
import { fmtDate, num } from '../../engine/dates';

const GROUPS = [
  { key: 'drought', icon: Droplets, color: '#c98a4b', bn: 'খরা', en: 'Drought', keys: ['spi', 'seedRain', 'drySpell', 'lateRain', 'lateDry'] },
  { key: 'flood', icon: CloudRain, color: '#2f8a8f', bn: 'বন্যা ও অতি বৃষ্টি', en: 'Flood and very heavy rain', keys: ['water', 'veryHeavy', 'rx5', 'heavy'] },
  { key: 'heat', icon: Flame, color: '#b42318', bn: 'গরম', en: 'Heat', keys: ['heat'] },
  { key: 'cold', icon: Snowflake, color: '#5b7fa3', bn: 'ঠান্ডা', en: 'Cold', keys: ['cold'] },
];
const IDX = Object.fromEntries(HAZ.indices.map((m) => [m.key, m]));
const UNIT = { mm: { bn: 'মিমি', en: 'mm' }, days: { bn: 'দিন', en: 'days' }, '%': { bn: '%', en: '%' }, '': { bn: '', en: '' } };

const REFS = [
  { bn: 'জগদীশ, ক্রাফোর্ড ও হুইলার (২০০৭): ফুল আসার সময় উচ্চ তাপমাত্রা ও ধানের চিটা', en: 'Jagadish, Craufurd & Wheeler (2007), High temperature stress and spikelet fertility in rice, J. Exp. Bot.', url: 'https://academic.oup.com/jxb/article/58/7/1627/512931' },
  { bn: 'বাংলাদেশ রাইস জার্নাল ২৪(২), ২০২০: জলমগ্নতা-সহিষ্ণু ব্রি ধান৫১, ৫২, ৭৯', en: 'Bangladesh Rice Journal 24(2), 2020: submergence-tolerant BRRI dhan51, 52, 79', url: 'https://www.banglajol.info/index.php/BRJ/article/view/53450/38801' },
  { bn: 'খরা-সহিষ্ণু আগাম জাত ব্রি ধান৭১ (আইজেপিএসএস)', en: 'Early-maturing drought-tolerant BRRI dhan71 (IJPSS)', url: 'https://journalijpss.com/index.php/IJPSS/article/view/1166' },
  { bn: 'আমনে দেরিতে রোপণ ও চিটা (বাংলাদেশ রাইস জার্নাল ১৯(২), ২০১৫)', en: 'Late transplanting and sterility in Aman (Bangladesh Rice Journal 19(2), 2015)', url: 'https://www.banglajol.info/index.php/BRJ/article/download/28161/18732' },
  { bn: 'এসপিআই: ম্যাককি ও অন্যান্য (১৯৯৩); বিশ্ব আবহাওয়া সংস্থা, এসপিআই নির্দেশিকা (WMO-No. 1090, ২০১২)', en: 'SPI: McKee et al. (1993); WMO Standardized Precipitation Index User Guide (WMO-No. 1090, 2012)' },
  { bn: 'বৃষ্টির চরম মান: ETCCDI সূচক (Rx5day); বৃষ্টির শ্রেণি: বাংলাদেশ আবহাওয়া অধিদপ্তর', en: 'Rain extremes: ETCCDI indices (Rx5day); rain classes: Bangladesh Meteorological Department' },
];

function Spark({ id, k, color, latest }) {
  const years = HAZ.upazilas[id].years;
  const st = HAZ.upazilas[id].stats[k];
  const ys = Object.keys(years).map(Number).filter((y) => years[y][k] !== null && years[y][k] !== undefined && y >= (st.from ?? 2001));
  const vals = ys.map((y) => years[y][k]);
  if (!vals.length) return null;
  const neg = k === 'spi';
  const lo = Math.min(0, ...vals), hi = Math.max(...vals, neg ? 0.5 : 1);
  const W = 230, H = 46, bw = W / ys.length;
  const y = (v) => H - ((v - lo) / (hi - lo || 1)) * (H - 4) - 2;
  const zero = y(0);
  const hit = new Set(st.hazardYears);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[46px] w-full" aria-hidden="true">
      {ys.map((yr, i) => {
        const v = vals[i], top = Math.min(y(v), zero), h = Math.max(1.2, Math.abs(y(v) - zero));
        return <rect key={yr} x={i * bw + 0.6} y={top} width={bw - 1.2} height={h} rx="1" fill={hit.has(yr) ? color : '#c8d0ca'} stroke={yr === latest ? '#13261b' : 'none'} strokeWidth="1.2"
          style={{ transformOrigin: `0 ${zero}px`, animation: `clim-bar .7s ${i * 18}ms both cubic-bezier(.22,1,.36,1)` }}><title>{`${yr}: ${v}`}</title></rect>;
      })}
      {st.normal !== null && <line x1="0" x2={W} y1={y(st.normal)} y2={y(st.normal)} stroke="#5d6a63" strokeDasharray="3 2" strokeWidth="1" />}
    </svg>
  );
}

function windowsLine(id, T, lang) {
  const yr = 2025, d = (o) => fmtDate(Date.UTC(yr, 0, T + o), lang);
  return [
    { bn: 'বীজতলা ও জমি তৈরি', en: 'Seedbed and land preparation', from: d(-30), to: d(-1), color: '#d9a93b', a: -30, b: -1 },
    { bn: 'কুশি গজানো', en: 'Tillering', from: d(0), to: d(55), color: '#7fb069', a: 0, b: 55 },
    { bn: 'ফুল আসা', en: 'Flowering', from: d(55), to: d(85), color: '#c98a4b', a: 55, b: 85 },
    { bn: 'দানা গঠন', en: 'Grain filling', from: d(85), to: d(95), color: '#a8552a', a: 85, b: 95 },
  ];
}

export default function AmanHazards({ id }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const u = HAZ.upazilas[id];
  if (!u) return null;
  const latest = Math.max(...Object.keys(u.years).map(Number));
  const nYears = HAZ.refYears[1] - HAZ.refYears[0] + 1;
  const wins = windowsLine(id, u.transplantDoy, lang);
  const groups = GROUPS.map((g) => {
    const years = new Set(g.keys.flatMap((k) => u.stats[k]?.hazardYears ?? []));
    const share = Math.round((years.size / nYears) * 100);
    return { ...g, years: [...years].sort(), share, level: share === 0 ? 0 : share < 20 ? 1 : 2 };
  });
  const LEVEL = [
    { bn: 'এখানে সমস্যা নয়', en: 'Not a problem here', cls: 'bg-primary-50 text-primary-800' },
    { bn: 'মাঝে মাঝে', en: 'Now and then', cls: 'bg-paddy-50 text-paddy-700' },
    { bn: 'প্রায়ই', en: 'Often', cls: 'bg-clay-50 text-clay-700' },
  ];
  const ranked = [...groups].sort((a, b) => b.share - a.share);
  const fit = {
    drought: {
      bn: ['খরা-সহিষ্ণু, আগাম পাকা জাত ব্রি ধান৭১: বর্ষা চলে যাওয়ার আগেই দানা ভরে।', 'ফুল আর দানা গঠনের সময় পানি কমে গেলে একটি-দুটি সম্পূরক সেচ।', 'বীজতলায় সেচের ব্যবস্থা রাখা, যাতে কম বৃষ্টির বছরেও সময়মতো রোপণ করা যায়।'],
      en: ['Drought-tolerant, early-maturing BRRI dhan71: the grain fills before the monsoon leaves.', 'One or two supplementary irrigations if water runs short at flowering and grain filling.', 'Irrigable seedbeds, so transplanting stays on time in a dry year.'],
    },
    flood: {
      bn: ['জলমগ্নতা-সহিষ্ণু জাত: ব্রি ধান৭৯ (প্রায় তিন সপ্তাহ আকস্মিক বন্যা সহ্য করে), ব্রি ধান৫১, ব্রি ধান৫২।', 'উঁচু জমিতে বীজতলা, আর বন্যার পর আবার রোপণের জন্য কিছু বাড়তি চারা রাখা।', 'নালা ও পানি নামার পথ পরিষ্কার রাখা, যাতে ভারী বৃষ্টির পানি দ্রুত নেমে যায়।'],
      en: ['Submergence-tolerant varieties: BRRI dhan79 (survives about three weeks of flash flooding), BRRI dhan51, BRRI dhan52.', 'Seedbeds on high ground, and spare seedlings to replant after a flood.', 'Clear drains and outlets so heavy rain runs off fast.'],
    },
    heat: { bn: ['ফুল আসার সময় টানা ৩৫°-এর বেশি গরম হলে জমিতে পানি রাখুন; রোপণের তারিখ এমন রাখুন যাতে ফুল সবচেয়ে গরম দিনগুলো এড়ায়।'], en: ['If it stays above 35 °C at flowering, keep water in the field; set transplanting so flowering misses the hottest days.'] },
    cold: { bn: ['দেরিতে রোপণ এড়ান: সেপ্টেম্বরের শেষে রোপণ করলে ঠান্ডায় ফুলে চিটা বাড়ে।'], en: ['Avoid late transplanting: planted after late September, cold at flowering raises sterility.'] },
  };
  const yr = (y) => num(y, lang).replace(/,/g, '');

  return (
    <section className="mt-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-[20px] font-bold"><ShieldCheck size={20} className="text-primary-600" />{T('আমনের আবহাওয়া-ঝুঁকি: খরা, বন্যা, গরম, ঠান্ডা', 'Aman weather hazards: drought, flood, heat, cold')}</h3>
          <Tags list={['REAL', 'RULE']} />
        </div>
        <p className="mt-1 max-w-4xl text-[13.5px] leading-6 text-muted">{T(`প্রতিটি ঝুঁকি মাপা হয়েছে ফসলের নিজের সময়ে, রাডারে মাপা স্বাভাবিক রোপণের দিন (${fmtDate(Date.UTC(2025, 0, u.transplantDoy), 'bn')}) ধরে; ${yr(HAZ.refYears[0])} থেকে এখন পর্যন্ত প্রতি বছর। আবহাওয়া নাসা পাওয়ার, শুকনো দিন নাসা-জাক্সার আইমার্জ উপগ্রহ, জমিতে পানি সেন্টিনেল-১ রাডার।`, `Each hazard is measured in the crop's own windows, hung on the radar-measured usual transplanting day (${fmtDate(Date.UTC(2025, 0, u.transplantDoy), 'en')}), every year from ${HAZ.refYears[0]}. Weather from NASA POWER, dry days from NASA/JAXA IMERG satellites, standing water from Sentinel-1 radar.`)}</p>

        {/* the crop's windows */}
        <div className="mt-4">
          <div className="flex h-3 overflow-hidden rounded-full">
            {wins.map((w) => <div key={w.en} style={{ flex: w.b - w.a + 1, background: w.color }} title={`${L(w)}: ${w.from} – ${w.to}`} />)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-4">
            {wins.map((w) => <div key={w.en} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: w.color }} /><span className="font-semibold">{L(w)}</span><span className="text-muted tabular">{w.from} – {w.to}</span></div>)}
          </div>
        </div>

        {/* the four hazards at a glance */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => (
            <div key={g.key} className="aman-fade rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[15px] font-bold"><span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${g.color}1f`, color: g.color }}><g.icon size={16} /></span>{L(g)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${LEVEL[g.level].cls}`}>{L(LEVEL[g.level])}</span>
              </div>
              <div className="mt-3 text-[26px] font-bold tabular" style={{ color: g.color }}>{T(`${num(g.years.length, 'bn')} বছর`, `${g.years.length} years`)}</div>
              <p className="text-[12.5px] leading-5 text-muted">{T(`${yr(HAZ.refYears[0])}–${yr(HAZ.refYears[1])}-এর ${num(nYears, 'bn')} বছরে`, `of ${nYears} years, ${HAZ.refYears[0]}–${HAZ.refYears[1]}`)}{g.years.length ? `: ${g.years.map(yr).join(', ')}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* every index, every year */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.key} className="p-5 sm:p-6">
            <h4 className="flex items-center gap-2 text-[17px] font-bold"><g.icon size={17} style={{ color: g.color }} />{L(g)}</h4>
            <div className="mt-2 divide-y divide-border">
              {g.keys.map((k) => {
                const m = IDX[k], st = u.stats[k];
                if (!m || !st) return null;
                const unit = UNIT[m.unit] ?? UNIT[''];
                const fmt = (v) => (v === null || v === undefined ? '—' : `${num(v, lang, { dp: k === 'spi' ? 2 : 0 })}${unit.bn ? ` ${L(unit)}` : ''}`);
                const worse = st.perDecade !== 0 && Math.sign(st.perDecade) === m.dir;
                return (
                  <div key={k} className="py-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14.5px] font-semibold">{L(m)}</span>
                      {m.hasHazard && <span className="text-[12px] font-semibold text-muted">{T(`${num(st.hazardYears.length, 'bn')}/${num(st.n, 'bn')} বছর`, `${st.hazardYears.length}/${st.n} years`)}</span>}
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{L(m.rule)}</p>
                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                      <Spark id={id} k={k} color={g.color} latest={latest} />
                      <div className="text-right text-[12.5px] leading-5">
                        <div><span className="text-muted">{T('স্বাভাবিক', 'Normal')} </span><span className="font-semibold tabular">{fmt(st.normal)}</span></div>
                        <div><span className="text-muted">{yr(latest)} </span><span className="font-semibold tabular">{st.latest === null ? T('এখনো পুরো হয়নি', 'not complete yet') : fmt(st.latest)}</span></div>
                        <div className={st.significant ? (worse ? 'font-semibold text-clay-700' : 'font-semibold text-primary-700') : 'text-muted'}>
                          {T('ধারা', 'Trend')} {st.perDecade > 0 ? '+' : st.perDecade < 0 ? '−' : ''}{num(Math.abs(st.perDecade), lang, { dp: k === 'spi' ? 1 : 0 })}{unit.bn && k !== 'spi' ? ` ${L(unit)}` : ''}/{T('দশক', 'decade')}{st.significant ? T(' · জোরালো', ' · significant') : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-muted">{T('রঙিন দণ্ড: ঝুঁকির বছর; কালো দাগ: সবচেয়ে নতুন বছর; ভাঙা রেখা: স্বাভাবিক। "জোরালো" ধারা ম্যান-কেন্ডাল ও বেনজামিনি-হকবার্গ (q = ০.১০) পরীক্ষায় টেকে।', 'Coloured bars: hazard years; outlined: the latest year; dashed line: normal. A "significant" trend survives Mann-Kendall with Benjamini-Hochberg (q = 0.10).')}</p>
          </Card>
        ))}
      </div>

      {/* what fits here */}
      <Card className="mt-6 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[19px] font-bold"><Sprout size={19} className="text-primary-600" />{T('এখানে যা সবচেয়ে মানানসই', 'What fits best here')}</h3>
        <p className="mt-1 text-[13.5px] text-muted">{T('যে ঝুঁকি এখানে সবচেয়ে বেশি বছর এসেছে, আগে সেটা। জাতের তথ্য ব্রি-র প্রকাশিত গবেষণা থেকে; চূড়ান্ত পছন্দের আগে উপজেলা কৃষি অফিসে মাঠের অবস্থা মিলিয়ে নিন।', 'The hazard that came most often here goes first. Variety facts are from published BRRI research; check them against local field conditions with the upazila agriculture office before choosing.')}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {ranked.map((g) => (
            <div key={g.key} className={`rounded-2xl border p-4 ${g.level ? 'border-border bg-white' : 'border-dashed border-border bg-black/[.015]'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold"><g.icon size={16} style={{ color: g.color }} />{L(g)}</span>
                <Badge tone={g.level === 2 ? 'red' : g.level === 1 ? 'amber' : 'green'}>{T(`${num(g.share, 'bn')}% বছর`, `${g.share}% of years`)}</Badge>
              </div>
              {g.level ? (
                <ul className="mt-2 space-y-1.5 text-[14px] leading-6">{L(fit[g.key]).map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: g.color }} />{x}</li>)}</ul>
              ) : (
                <p className="mt-2 text-[13.5px] leading-6 text-muted">{T(`${yr(HAZ.refYears[0])}–${yr(HAZ.refYears[1])}-এ এখানে এ ঝুঁকি দেখা যায়নি। তবু নজর রাখুন: `, `Not seen here in ${HAZ.refYears[0]}–${HAZ.refYears[1]}. Still worth watching: `)}{L(fit[g.key])[0]}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[17px] font-bold"><BookOpen size={17} className="text-primary-600" />{T('বিজ্ঞানের সূত্র', 'Scientific sources')}</h3>
        <ul className="mt-3 space-y-1.5 text-[13.5px] leading-6">
          {REFS.map((r) => (
            <li key={r.en} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
              <span>{L(r)}{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-primary-700 hover:underline"><ExternalLink size={11} />{T('পড়ুন', 'Read')}</a>}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] leading-6 text-muted">{T(`সীমাবদ্ধতা: নাসা পাওয়ারের আবহাওয়া প্রায় ৫০ কিলোমিটারের ঘরের গড়, এক জমির মাপ নয়। আমনের নিজস্ব ঠান্ডার সীমা গবেষণায় নিশ্চিত পাওয়া যায়নি, তাই বোরোর সীমা ব্যবহার করা হয়েছে। এসপিআই-এর গামা বণ্টন ২০০১–২০২৫ দিয়ে মেলানো (a = ${u.spiFit.a}, b = ${u.spiFit.b})।`, `Limits: NASA POWER weather is the average of a cell about 50 km across, not one field. No confirmed Aman cold threshold was found in the research, so the Boro one is used. The SPI gamma distribution is fitted on 2001–2025 (a = ${u.spiFit.a}, b = ${u.spiFit.b}).`)}</p>
      </Card>
    </section>
  );
}
