// Bangladesh, season by season: which crops take the most land across the country (national bars) and where that
// season's rice is grown (district map). District rice: BBS Yearbook of Agricultural Statistics 2023 (2022-23);
// other crops: FAOSTAT 2024. Sources are in src/data/bangladesh_crops.json.
import { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Segmented } from '../ui';
import { num, monthOf, todayDhaka } from '../../engine/dates';
import BD from '../../data/geo/bangladesh_crops.json';

const SEASONS = [
  { key: 'kharif1', rice: 'aus', bn: 'খরিফ-১', en: 'Kharif-1', months: { bn: 'ফাল্গুন–আষাঢ় (মার্চ–জুন)', en: 'March–June' } },
  { key: 'kharif2', rice: 'aman', bn: 'খরিফ-২', en: 'Kharif-2', months: { bn: 'আষাঢ়–কার্তিক (জুলাই–নভেম্বর)', en: 'July–November' } },
  { key: 'rabi', rice: 'boro', bn: 'রবি', en: 'Rabi', months: { bn: 'কার্তিক–চৈত্র (নভেম্বর–এপ্রিল)', en: 'November–April' } },
];
const seasonNow = () => { const m = monthOf(todayDhaka()); return m >= 3 && m <= 6 ? 'kharif1' : m >= 7 && m <= 10 ? 'kharif2' : 'rabi'; };

// Brand green, light → dark; validated as an ordered ramp against the card surface (light end 2.09:1).
const RAMP = ['#8dbe78', '#62a04f', '#43863a', '#245a28', '#0d2614'];
const BAR = '#2f6e2f';
const HOME_DISTRICT = 'Rajshahi';

const area = (ha, lang) => (lang === 'bn'
  ? (ha >= 1e5 ? `${num(ha / 1e5, 'bn', { dp: 1 })} লাখ হেক্টর` : `${num(ha / 1e3, 'bn', { dp: ha < 1e4 ? 1 : 0 })} হাজার হেক্টর`)
  : (ha >= 1e6 ? `${num(ha / 1e6, 'en', { dp: 2 })} M ha` : `${num(ha / 1e3, 'en', { dp: 0 })}k ha`));

export default function CountryCrops() {
  const { s, T } = useStore();
  const lang = s.lang;
  const now = seasonNow();
  const [season, setSeason] = useState(now);
  const [hover, setHover] = useState(null); // { d, x, y }
  const [barHover, setBarHover] = useState(null);
  const S = SEASONS.find((x) => x.key === season);
  const crops = BD.national[season];
  const max = crops[0].ha;

  // Share of each district's land under this season's rice, cut into five equal-count bands.
  const { rows, breaks } = useMemo(() => {
    const r = BD.districts.map((d) => ({ ...d, ha: d.rice[S.rice], pct: (d.rice[S.rice] / d.areaHa) * 100 }));
    const v = r.map((x) => x.pct).sort((a, b) => a - b);
    const q = [0.2, 0.4, 0.6, 0.8].map((p) => v[Math.floor(p * (v.length - 1))]);
    return { rows: r, breaks: q };
  }, [S.rice]);
  const bin = (pct) => breaks.filter((b) => pct > b).length;
  const top = [...rows].sort((a, b) => b.ha - a.ha).slice(0, 5);
  const totalRice = rows.reduce((a, x) => a + x.ha, 0);
  const [W, H] = BD.viewBox;
  const name = (d) => (lang === 'bn' ? d.bn : d.en);

  return (
    <section id="bangladesh" className="scroll-mt-20 py-16 sm:py-20">
      <div className="page-shell">
        <div data-reveal className="max-w-3xl">
          <h2 className="text-[32px] font-bold sm:text-[40px]">{T('সারা বাংলাদেশে কোন মৌসুমে কী ফসল', 'What Bangladesh grows, season by season')}</h2>
          <p className="mt-3 text-[16.5px] leading-8 text-muted">{T('দেশের ৬৪ জেলায় কোন মৌসুমে কোন ফসলে সবচেয়ে বেশি জমি যায়, আর সেই মৌসুমের ধান কোথায় বেশি হয়। সংখ্যাগুলো সরকারি পরিসংখ্যান (বিবিএস) আর জাতিসংঘের খাদ্য ও কৃষি সংস্থার (FAO) প্রকাশিত হিসাব থেকে।', 'Which crops take the most land in each season across all 64 districts, and where that season’s rice is grown. Figures are from the Bangladesh Bureau of Statistics (BBS) and the UN Food and Agriculture Organization (FAO).')}</p>
        </div>

        <div data-reveal className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented value={season} onChange={(v) => { setSeason(v); setHover(null); }}
            options={SEASONS.map((x) => ({ value: x.key, label: <>{T(x.bn, x.en)}{x.key === now && <span className="ml-1.5 rounded-full bg-paddy-300/80 px-1.5 text-[11px] font-bold text-primary-950">{T('এখন', 'now')}</span>}</> }))} />
          <span className="text-[14px] text-muted">{T(S.months.bn, S.months.en)}</span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {/* National ranking: one series, one colour; the value sits at the end of each bar. */}
          <div data-reveal className="glass flat rounded-[22px] p-5 sm:p-6">
            <h3 key={`t-${season}`} className="swap-in text-[18px] font-bold">{T(`${S.bn} মৌসুমে সারা দেশে কোন ফসলে কত জমি`, `Land under each crop across Bangladesh, ${S.en}`)}</h3>
            <ul key={season} className="swap-in mt-4 space-y-2.5" onMouseLeave={() => setBarHover(null)}>
              {crops.map((c, i) => (
                <li key={c.key} className="relative grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)]"
                  onMouseEnter={() => setBarHover(c.key)} onFocus={() => setBarHover(c.key)} tabIndex={0}
                  aria-label={`${T(c.bn, c.en)}: ${area(c.ha, lang)} (${c.src})`}>
                  <span className="truncate text-[14.5px] text-ink">{T(c.bn, c.en)}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="bar-grow h-[18px] shrink-0 rounded-r-[4px] transition-opacity duration-300" style={{ width: `${Math.max(1.5, (c.ha / max) * 78)}%`, background: BAR, opacity: barHover && barHover !== c.key ? 0.45 : 1, animationDelay: `${i * 45}ms` }} />
                    <span className="whitespace-nowrap text-[13px] tabular text-muted">{area(c.ha, lang)}</span>
                  </span>
                  {barHover === c.key && (
                    <span className="pointer-events-none absolute -top-9 left-24 z-10 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12.5px] text-white shadow-lg">
                      {T(c.bn, c.en)} · {num(c.ha, lang)} {T('হেক্টর', 'ha')} · {c.src}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {season === 'kharif2' && <p className="mt-4 text-[13.5px] leading-6 text-muted">{T('বর্ষায় দেশের প্রায় সব আবাদি জমিতে আমন ধান। এই মৌসুমের অন্য ফসলের (সবজি ইত্যাদি) আলাদা দেশজোড়া হিসাব প্রকাশিত নেই।', 'In the monsoon almost all farmland is under Aman rice. Other crops of this season (vegetables etc.) have no separate national figure.')}</p>}
            {season === 'rabi' && <p className="mt-4 text-[13.5px] leading-6 text-muted">{T('ভুট্টা আর মরিচের বেশির ভাগ রবিতে হয়, কিছু খরিফেও; FAO সারা বছরের মোট দেয়।', 'Most maize and chilli is grown in Rabi, some in Kharif; FAO gives the whole-year total.')}</p>}
            {/* The three rice crops of the year side by side; the selected season is the one in colour. */}
            <div className="mt-6 border-t border-black/[.06] pt-4">
              <h4 className="text-[15px] font-semibold text-ink">{T('এক বছরে তিন মৌসুমের ধান', 'The year’s three rice crops')}</h4>
              <ul className="mt-3 space-y-2">
                {SEASONS.map((x) => {
                  const r = BD.national[x.key][0];
                  const on = x.key === season;
                  return (
                    <li key={x.key} className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
                      <button type="button" onClick={() => setSeason(x.key)} className={`truncate text-left text-[14px] ${on ? 'font-semibold text-ink' : 'text-muted hover:text-ink'}`}>{T(r.bn, r.en)}</button>
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-3.5 shrink-0 rounded-r-[4px] transition-colors duration-500" style={{ width: `${(r.ha / BD.national.kharif2[0].ha) * 78}%`, background: on ? BAR : '#c9cfc6' }} />
                        <span className="whitespace-nowrap text-[13px] tabular text-muted">{area(r.ha, lang)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <p className="mt-4 text-[12.5px] text-muted">{T('ধান: বিবিএস ২০২২-২৩। অন্য ফসল: FAO ২০২৪ (সবশেষ প্রকাশিত)।', 'Rice: BBS 2022-23. Other crops: FAO 2024 (latest published).')}</p>
          </div>

          {/* District map: share of each district's land under this season's rice. */}
          <div data-reveal style={{ '--d': '120ms' }} className="glass flat rounded-[22px] p-5 sm:p-6">
            <h3 key={`m-${season}`} className="swap-in text-[18px] font-bold">{T(`${S.bn} মৌসুমের ধান কোন জেলায় বেশি`, `Where ${S.en} rice is grown`)}</h3>
            <p className="mt-1 text-[13.5px] text-muted">{T(`জেলার মোট জমির কত ভাগে ${crops[0].bn}। সারা দেশে মোট ${area(totalRice, 'bn')}।`, `Share of each district’s land under ${crops[0].en.toLowerCase()}. ${area(totalRice, 'en')} nationally.`)}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
              <div className="relative mx-auto w-full max-w-[380px]" onMouseLeave={() => setHover(null)}>
                <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={T(`${S.bn} মৌসুমের ধানের জেলাভিত্তিক মানচিত্র`, `District map of ${S.en} rice`)}>
                  {rows.map((d) => (
                    <path key={d.id} d={d.d} fill={RAMP[bin(d.pct)]} stroke="#fcfcfb" strokeWidth={hover?.d.id === d.id ? 0 : 1.2} strokeLinejoin="round"
                      onMouseMove={(e) => { const r = e.currentTarget.ownerSVGElement.getBoundingClientRect(); setHover({ d, x: e.clientX - r.left, y: e.clientY - r.top }); }}
                      className="cursor-pointer transition-[fill] duration-500" />
                  ))}
                  {hover && <path d={hover.d.d} fill="none" stroke="#13261b" strokeWidth={2.5} pointerEvents="none" />}
                  {(() => { const h = rows.find((d) => d.id === HOME_DISTRICT); return h && <path d={h.d} fill="none" stroke="#e0a12b" strokeWidth={2.5} strokeDasharray="5 4" pointerEvents="none" />; })()}
                </svg>
                {hover && (
                  <div className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg bg-ink px-3 py-2 text-[12.5px] leading-5 text-white shadow-lg"
                    style={{ left: Math.min(hover.x + 12, 220), top: Math.max(hover.y - 64, 0) }}>
                    <div className="font-semibold">{name(hover.d)}</div>
                    <div>{crops[0][lang === 'bn' ? 'bn' : 'en']}: {num(hover.d.ha, lang)} {T('হেক্টর', 'ha')}</div>
                    <div className="text-white/75">{T(`জেলার জমির ${num(hover.d.pct, 'bn', { dp: 1 })}%`, `${num(hover.d.pct, 'en', { dp: 1 })}% of the district`)}</div>
                  </div>
                )}
              </div>
              <div className="text-[13px]">
                <p className="font-semibold text-ink">{T('জেলার জমির ভাগ', 'Share of district land')}</p>
                <ul className="mt-2 space-y-1.5">
                  {RAMP.map((c, i) => (
                    <li key={c} className="flex items-center gap-2 tabular text-muted">
                      <i className="h-3.5 w-5 shrink-0 rounded-[3px]" style={{ background: c }} />
                      {i === 0 ? `≤ ${num(breaks[0], lang, { dp: 0 })}%` : i === 4 ? `> ${num(breaks[3], lang, { dp: 0 })}%` : `${num(breaks[i - 1], lang, { dp: 0 })}–${num(breaks[i], lang, { dp: 0 })}%`}
                    </li>
                  ))}
                  <li className="flex items-center gap-2 pt-1 text-muted"><i className="h-0 w-5 shrink-0 border-t-[2.5px] border-dashed border-[#e0a12b]" />{T('রাজশাহী (গোদাগাড়ী)', 'Rajshahi (Godagari)')}</li>
                </ul>
                <p className="mt-4 font-semibold text-ink">{T('সবচেয়ে বেশি', 'Largest')}</p>
                <ol key={season} className="swap-in mt-1.5 space-y-1">
                  {top.map((d, i) => (
                    <li key={d.id} className="flex justify-between gap-2"><span className="text-ink">{num(i + 1, lang)}. {name(d)}</span><span className="tabular text-muted">{area(d.ha, lang)}</span></li>
                  ))}
                </ol>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-muted">{T('উৎস: বিবিএস কৃষি পরিসংখ্যান বর্ষগ্রন্থ ২০২৩ (২০২২-২৩ মৌসুম); জেলার সীমানা বিবিএস/OCHA।', 'Source: BBS Yearbook of Agricultural Statistics 2023 (2022-23 season); district boundaries BBS/OCHA.')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
