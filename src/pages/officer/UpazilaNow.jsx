// The real part of the whole-upazila page: what is happening in the fields now (Sentinel-1 radar), this season's
// official crop areas where published, how the land has changed (Sentinel-2), live weather, the upazila's crops,
// official district rice areas (BBS) and this week's official market prices (DAM). Every block names its source and date.
import { Link } from 'react-router-dom';
import { Satellite, Sprout, Layers, Wheat, Store, Quote, ExternalLink, ArrowUpRight, ArrowDownRight, Minus, ChevronRight, CalendarClock } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Badge, Tags } from '../../components/ui';
import LiveWeather from '../../components/charts/LiveWeather';
import { landcoverOf } from '../../components/map/UpazilaLayers';
import { AMAN, CAT, LATEST, SHIFT_DAYS, catOf, districtOf, doyToMs } from '../../radar/aman';
import { UPAZILA_FACTS } from '../../data/upazila_facts';
import MARKET from '../../data/market/market_dhaka.json';
import CROPS from '../../data/geo/bangladesh_crops.json';
import SEDAC from '../../data/region/sedac.json';
import CENSUS from '../../data/region/census.json';
import { fmtDate, num, todayDhaka } from '../../engine/dates';
import { HARVEST_AFTER } from '../../engine/outlook';

// Modern high-yielding transplanted Aman varieties are usually cut about 95–120 days after transplanting (BRRI
// variety durations of ~125–145 days less 25–30-day seedlings); photoperiod-sensitive local varieties follow the calendar.
// The window itself lives in engine/outlook.js, which also drives the district harvest outlook.

function Src({ children, url }) {
  const { T } = useStore();
  return (
    <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] leading-5 text-muted">
      {children}
      {url && <a href={url} target="_blank" rel="noreferrer" className="-my-1.5 inline-flex min-h-8 items-center gap-0.5 px-1 font-semibold text-primary-700 hover:underline"><ExternalLink size={11} />{T('উৎস', 'Source')}</a>}
    </p>
  );
}

function Head({ icon: Icon, children, tags }) {
  return <h3 className="flex flex-wrap items-center gap-2 text-[18px] font-bold"><Icon size={18} className="text-primary-600" />{children}{tags && <Tags list={tags} />}</h3>;
}

function UpazilaNowPage() {
  const { s, T, L, officerUpazila: upz } = useStore();
  const lang = s.lang;
  const facts = UPAZILA_FACTS[upz.id];
  const district = AMAN.districts[districtOf(upz.id)];
  const row = district.upazilas.find((u) => u.id === upz.id);
  const se = row.seasons[LATEST];
  const cat = CAT[catOf(se.shift)];
  const day = (doy, y = LATEST) => fmtDate(doyToMs(y, doy), lang);
  const today = todayDhaka();
  const sinceTransplant = se.reliable && se.transplantDoy ? Math.round((today - doyToMs(LATEST, se.transplantDoy)) / 864e5) : null;
  const lc = landcoverOf(upz.id);
  const lcRow = (key) => lc?.data.classes.find((c) => c.key === key);
  const crop = lcRow('crops'), built = lcRow('built'), trees = lcRow('trees');
  const dRice = CROPS.districts.find((d) => d.en === upz.district.en)?.rice;
  const yr = (y) => num(y, lang).replace(/,/g, '');
  const km = (v) => `${num(v, lang, { dp: 1 })} ${T('বর্গ কিমি', 'km²')}`;
  const pct = (a, b) => Math.round(((b - a) / a) * 100);

  return (
    <div className="space-y-6">
      {/* What is happening in the fields now */}
      <div id="up-now" className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <Head icon={Satellite} tags={['SAT', 'RULE']}>{T(`এখন মাঠে: ${yr(LATEST)}-এর আমন`, `In the fields now: Aman ${LATEST}`)}</Head>
          {se.reliable && se.transplantDoy ? (
            <>
              <p className="mt-3 text-[15px] leading-7">{T(`সেন্টিনেল-১ রাডারে রোপণ ধরা পড়েছে ${day(se.transplantDoy)} নাগাদ`, `Sentinel-1 radar saw transplanting around ${day(se.transplantDoy)}`)}{' '}<Badge tone={cat.tone}>{L(cat)}</Badge></p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-primary-50 p-3"><div className="text-[12px] text-muted">{T('রোপণের পর', 'Since transplanting')}</div><div className="text-[20px] font-bold tabular">{T(`${num(sinceTransplant, 'bn')} দিন`, `${sinceTransplant} days`)}</div></div>
                <div className="rounded-xl bg-paddy-50 p-3"><div className="text-[12px] text-muted">{T('সম্ভাব্য কাটা', 'Likely harvest')}</div><div className="text-[15px] font-bold leading-6 tabular">{day(se.transplantDoy + HARVEST_AFTER[0])} – {day(se.transplantDoy + HARVEST_AFTER[1])}</div></div>
              </div>
              <p className="mt-2 text-[12.5px] leading-5 text-muted">{T(`কাটার সময় সাধারণ হিসাব: আধুনিক উচ্চফলনশীল আমন জাত রোপণের প্রায় ${num(HARVEST_AFTER[0], 'bn')}–${num(HARVEST_AFTER[1], 'bn')} দিন পরে কাটা হয়; জাতভেদে বদলায়।`, `Harvest timing is a rule of thumb: modern high-yielding Aman is usually cut ${HARVEST_AFTER[0]}–${HARVEST_AFTER[1]} days after transplanting, depending on the variety.`)}</p>
            </>
          ) : <p className="mt-3 text-[15px] leading-7 text-muted">{T('এ মৌসুমে যথেষ্ট নমুনা জমিতে রোপণের সংকেত মেলেনি।', 'Too few sample fields showed transplanting this season.')}</p>}
          <Link to="/officer/radar" className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-primary-700">{T('রোপণ রাডারের পুরো হিসাব', 'Full Ropan Radar view')}<ChevronRight size={14} /></Link>
          <Src>{T(`উপগ্রহ: সেন্টিনেল-১, ${fmtDate(Date.parse(AMAN.provenance.through), 'bn')} পর্যন্ত; স্বাভাবিক ${day(row.transplantNormal, 2025)} (২০১৭–২০২৫), ±${num(SHIFT_DAYS, 'bn')} দিন`, `Satellite: Sentinel-1 to ${fmtDate(Date.parse(AMAN.provenance.through), 'en')}; usual ${day(row.transplantNormal, 2025)} (2017–2025), ±${SHIFT_DAYS} days`)}</Src>
        </Card>

        <Card className="p-5 sm:p-6">
          <Head icon={Sprout} tags={['RECORD']}>{T(`এ মৌসুমের আবাদ (সরকারি হিসাব)`, 'This season’s area (official)')}</Head>
          {facts.season ? (
            <>
              <div className="mt-3 space-y-2">
                {facts.season.items.map((x) => (
                  <div key={x.key} className="flex items-baseline justify-between gap-3 rounded-xl bg-primary-50 px-3 py-2.5">
                    <span className="font-semibold">{L(x)}</span>
                    <span className="text-[19px] font-bold tabular">{num(x.ha, lang)} <span className="text-[13px] font-normal text-muted">{T('হেক্টর', 'ha')}</span></span>
                  </div>
                ))}
              </div>
              {facts.season.source.quote && (
                <blockquote className="mt-3 flex gap-2 rounded-xl bg-black/[.03] p-3 text-[13.5px] leading-6"><Quote size={15} className="mt-1 shrink-0 text-primary-600" /><span>“{facts.season.source.quote.bn}” <span className="text-muted">— {facts.season.source.quote.by}</span></span></blockquote>
              )}
              <Src url={facts.season.source.url}>{L(facts.season.source)}</Src>
            </>
          ) : (
            <>
              <p className="mt-3 text-[14.5px] leading-7 text-muted">{T(`${upz.name.bnOf} ${yr(LATEST)} মৌসুমের সরকারি আবাদ-হিসাব অনলাইনে পাওয়া যায়নি (১৮ অক্টোবর ২০২৬ পর্যন্ত খোঁজা)। উপজেলা কৃষি অফিসের হিসাব এলে এখানে বসবে।`, `No official ${LATEST} crop-area figure for ${upz.name.en} was found online (searched to 18 October 2026). It will go here once the agriculture office publishes it.`)}</p>
              {facts.changes && (
                <>
                  <h4 className="mt-4 text-[14.5px] font-bold">{T('যা বদলেছে', 'What has changed')}</h4>
                  <ul className="mt-2 space-y-1.5 text-[13.5px] leading-6">
                    {facts.changes.items.map((x) => <li key={x.en} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-500" />{L(x)}</li>)}
                  </ul>
                  <Src url={facts.changes.source.url}>{L(facts.changes.source)}</Src>
                </>
              )}
            </>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <Head icon={Layers} tags={['SAT']}>{T('জমি কীভাবে বদলাচ্ছে', 'How the land is changing')}</Head>
          {lc && crop && built ? (
            <>
              {[[crop, '#d9a93b'], [built, '#6e6e6e'], [trees, '#2f6b3a']].filter(([c]) => c).map(([c, color]) => {
                const a = c.km2['2017'], b = c.km2['2025'], max = Math.max(crop.km2['2017'], crop.km2['2025'], built.km2['2025']);
                return (
                  <div key={c.key} className="mt-3">
                    <div className="flex items-baseline justify-between gap-2 text-[14px]">
                      <span className="font-semibold">{L(c)}</span>
                      <span className={`text-[12.5px] font-semibold ${b < a ? 'text-clay-700' : 'text-primary-700'}`}>{b > a ? '+' : '−'}{num(Math.abs(pct(a, b)), lang)}%</span>
                    </div>
                    {[['2017', a, 0.45], ['2025', b, 1]].map(([y, v, o]) => (
                      <div key={y} className="mt-1 flex items-center gap-2 text-[12px] text-muted">
                        <span className="w-9 tabular">{yr(+y)}</span>
                        <div className="h-2.5 flex-1 rounded-full bg-black/[.05]"><div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: color, opacity: o, transition: 'width 1s var(--ease-smooth)' }} /></div>
                        <span className="w-24 text-right tabular">{km(v)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              <Src>{T('উপগ্রহ: সেন্টিনেল-২ ১০ মিটার ভূমি-ব্যবহার (এসরি, ইমপ্যাক্ট অবজারভেটরি, মাইক্রোসফট), পুরো উপজেলা, ২০১৭ ও ২০২৫', 'Satellite: Sentinel-2 10 m land cover (Esri, Impact Observatory, Microsoft), whole upazila, 2017 and 2025')}</Src>
            </>
          ) : <p className="mt-3 text-muted">{T('ভূমি-ব্যবহারের তথ্য নেই।', 'No land-cover data.')}</p>}
          {/* The upazila's people and land in NASA SEDAC's own measures (scripts/fetch/sedac.mjs), and the census. */}
          {SEDAC.upazilas[upz.id] && (() => {
            const sd = SEDAC.upazilas[upz.id], [lo, hi] = sd.density.medianClass, share = (x) => `${num(Math.round(x * 100), lang)}%`;
            return (
              <div className="mt-4 rounded-xl border border-border bg-canvas/70 p-3">
                <div className="flex items-center gap-1.5 text-[13px] font-semibold"><Satellite size={14} className="text-primary-700" />{T('নাসা SEDAC আর জনশুমারি', 'NASA SEDAC and the census')}</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12.5px] sm:grid-cols-4">
                  <div><dt className="text-muted">{T('মানুষ (২০২২)', 'People (2022)')}</dt><dd className="font-bold tabular">{num(CENSUS.upazilas[upz.id], lang)}</dd></div>
                  <div><dt className="text-muted">{T('প্রতি বর্গকিমিতে', 'Per km²')}</dt><dd className="font-bold tabular">{lo >= 1000 ? T(`${num(1000, 'bn')}+`, '1,000+') : `${num(lo, lang)}–${num(hi, lang)}`}</dd></div>
                  <div><dt className="text-muted">{T('১০ মিটারের নিচে নিচু জমি', 'Low land below 10 m')}</dt><dd className="font-bold tabular">{share(sd.leczShare)}</dd></div>
                  <div><dt className="text-muted">{T('ফসলি জমি (২০০০)', 'Cropland (2000)')}</dt><dd className="font-bold tabular">{share(sd.croplandShare)}</dd></div>
                </dl>
                <Src url="https://sedac.ciesin.columbia.edu">{T('নাসা SEDAC: GPW v4.11 (২০২০), LECZ v3, Global Agricultural Lands, নাসা GIBS থেকে উপজেলার সীমানার ভেতরে পড়া; মানুষ: বিবিএস জনশুমারি ২০২২', 'NASA SEDAC: GPW v4.11 (2020), LECZ v3, Global Agricultural Lands, read through NASA GIBS inside the upazila boundary; people: BBS Census 2022')}</Src>
              </div>
            );
          })()}
        </Card>
      </div>

      <div id="up-weather">
        <Head icon={CalendarClock}>{T(`${upz.name.bn} উপজেলার আবহাওয়া: এখন ও আগামী দিনগুলো`, `${upz.name.en} weather: now and the days ahead`)}</Head>
        <LiveWeather className="mt-3" place={{ lat: upz.center[0], lon: upz.center[1], name: { bn: `${upz.name.bn} উপজেলা`, en: `${upz.name.en} upazila` } }} />
      </div>

      <div id="up-crops" className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <Head icon={Wheat} tags={['RECORD']}>{T(`${upz.name.bnOf} ফসল`, `${upz.name.en}'s crops`)}</Head>
          <h4 className="mt-3 text-[13px] font-semibold text-muted">{T('প্রধান ফসল', 'Main crops')}</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{L(facts.profile.crops).map((c) => <span key={c} className="rounded-full bg-primary-50 px-3 py-1 text-[13.5px] font-semibold text-primary-800">{c}</span>)}</div>
          <h4 className="mt-3 text-[13px] font-semibold text-muted">{T('প্রধান ফল', 'Main fruits')}</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{L(facts.profile.fruits).map((c) => <span key={c} className="rounded-full bg-paddy-50 px-3 py-1 text-[13.5px] font-semibold text-paddy-700">{c}</span>)}</div>
          <h4 className="mt-3 text-[13px] font-semibold text-muted">{T('প্রায় হারিয়ে যাওয়া ফসল', 'Crops nearly gone')}</h4>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{L(facts.profile.fading).map((c) => <span key={c} className="rounded-full bg-black/[.04] px-3 py-1 text-[13px] text-muted">{c}</span>)}</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/[.03] p-3"><div className="text-[12px] text-muted">{T('কৃষি থেকে প্রধান আয়', 'Main income from farming')}</div><div className="text-[20px] font-bold tabular">{num(facts.profile.agriIncome, lang, { dp: 1 })}%</div></div>
            <div className="rounded-xl bg-black/[.03] p-3"><div className="text-[12px] text-muted">{T('ভূমিহীন পরিবার', 'Landless households')}</div><div className="text-[20px] font-bold tabular">{num(facts.profile.landless, lang, { dp: 1 })}%</div></div>
          </div>
          {facts.profile.note && <p className="mt-3 rounded-xl bg-paddy-50 p-3 text-[13px] leading-6 text-ink/85">{L(facts.profile.note)}</p>}
          <Src url={facts.profile.source.url}>{L(facts.profile.source)}</Src>
        </Card>

        <Card className="p-5 sm:p-6">
          <Head icon={Wheat} tags={['RECORD']}>{T(`${upz.district.bn} জেলায় ধানের আবাদ`, `Rice in ${upz.district.en} district`)}</Head>
          {dRice ? (
            <>
              <p className="mt-1 text-[13.5px] text-muted">{T('২০২২–২৩ সাল, তিন মৌসুম মিলিয়ে', '2022–23, the three seasons')}</p>
              {[['aus', T('আউশ', 'Aus'), '#d08f26'], ['aman', T('আমন', 'Aman'), '#43863a'], ['boro', T('বোরো', 'Boro'), '#2f8a8f']].map(([k, label, color]) => {
                const max = Math.max(...Object.values(dRice));
                return (
                  <div key={k} className="mt-3">
                    <div className="flex items-baseline justify-between text-[14px]"><span className="font-semibold">{label}</span><span className="font-bold tabular">{num(dRice[k], lang)} <span className="text-[12px] font-normal text-muted">{T('হেক্টর', 'ha')}</span></span></div>
                    <div className="mt-1 h-3 rounded-full bg-black/[.05]"><div className="h-full rounded-full" style={{ width: `${(dRice[k] / max) * 100}%`, background: color }} /></div>
                  </div>
                );
              })}
              <Src>{T('বাংলাদেশ পরিসংখ্যান ব্যুরো (বিবিএস), কৃষি পরিসংখ্যান বর্ষগ্রন্থ ২০২৩', 'Bangladesh Bureau of Statistics (BBS), Yearbook of Agricultural Statistics 2023')}</Src>
            </>
          ) : <p className="mt-3 text-muted">{T('জেলার তথ্য নেই।', 'No district data.')}</p>}
        </Card>
      </div>

      <Card id="up-prices" className="overflow-x-auto">
        <div className="px-5 pt-5 sm:px-6">
          <Head icon={Store} tags={['RECORD']}>{T('বাজারদর (সরকারি, সাপ্তাহিক)', 'Market prices (official, weekly)')}</Head>
          <p className="mt-1 text-[13.5px] text-muted">{T(`ঢাকা মহানগরীর ৪টি বাজারের গড় খুচরা দাম, ${fmtDate(Date.parse(MARKET.week), 'bn')} ${yr(+MARKET.week.slice(0, 4))}; আগের সপ্তাহ আর গত বছরের একই সপ্তাহের সঙ্গে তুলনা। গ্রামের হাটে দাম সাধারণত এর চেয়ে কম।`, `Average retail price in four Dhaka city markets, week of ${fmtDate(Date.parse(MARKET.week), 'en')} ${MARKET.week.slice(0, 4)}; against last week and the same week last year. Village markets are usually cheaper.`)}</p>
        </div>
        <table className="mt-3 w-full min-w-[560px] text-left text-[14px]">
          <thead className="text-[12.5px] text-muted"><tr>{[T('পণ্য', 'Item'), T('দাম (টাকা/কেজি)', 'Price (Tk/kg)'), T('আগের সপ্তাহ', 'Last week'), T('গত বছর', 'A year ago'), T('এক বছরে', 'Over a year')].map((h, i) => <th key={h} className={`px-3.5 py-2.5 font-semibold sm:px-6 ${i ? '' : 'sticky left-0 z-[1] bg-white sm:static sm:bg-transparent'}`}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {MARKET.items.map((x) => {
              const d = x.pctYear, Arrow = d > 0.5 ? ArrowUpRight : d < -0.5 ? ArrowDownRight : Minus;
              return (
                <tr key={x.key}>
                  <td className="sticky left-0 z-[1] bg-white px-3.5 py-2.5 font-semibold sm:static sm:bg-transparent sm:px-6">{L(x)}</td>
                  <td className="px-3.5 py-2.5 text-[15px] font-bold tabular sm:px-6">৳{num(x.price, lang, { dp: x.price % 1 ? 2 : 0 })}{x.pctWeek ? <span className={`ml-1.5 text-[11.5px] font-semibold ${x.pctWeek > 0 ? 'text-clay-700' : 'text-primary-700'}`}>{x.pctWeek > 0 ? '+' : '−'}{num(Math.abs(x.pctWeek), lang, { dp: 0 })}%</span> : null}</td>
                  <td className="px-3.5 py-2.5 tabular text-muted sm:px-6">৳{num(x.lastWeek, lang, { dp: x.lastWeek % 1 ? 2 : 0 })}</td>
                  <td className="px-3.5 py-2.5 tabular text-muted sm:px-6">{x.lastYear === null ? '—' : `৳${num(x.lastYear, lang, { dp: x.lastYear % 1 ? 2 : 0 })}`}</td>
                  <td className="px-3.5 py-2.5 sm:px-6">{d === null ? '—' : <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-semibold ${d > 0.5 ? 'bg-clay-50 text-clay-700' : d < -0.5 ? 'bg-primary-50 text-primary-800' : 'bg-black/[.04] text-muted'}`}><Arrow size={12} />{num(Math.abs(d), lang, { dp: 0 })}%</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-5 pb-5 sm:px-6"><Src url={MARKET.provenance.url}>{T('কৃষি বিপণন অধিদপ্তর (ডিএএম), সাপ্তাহিক তুলনামূলক বাজারদর প্রতিবেদন', 'Department of Agricultural Marketing (DAM), weekly comparative price report')}</Src></div>
      </Card>
    </div>
  );
}

// The radar covers only the districts built by scripts/build/build_aman_radar.mjs; elsewhere the page says so.
export default function UpazilaNow() {
  const { T, officerUpazila } = useStore();
  if (!(AMAN.districts[districtOf(officerUpazila.id)]?.upazilas.some((u) => u.id === officerUpazila.id))) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-7 text-amber-900">{T(`${officerUpazila.name.bn} উপজেলার রাডার-ভিত্তিক মাঠের তথ্য এখনো তৈরি হয়নি; অন্য পাতাগুলো দেখুন।`, `Radar-based field data for ${officerUpazila.name.en} has not been built yet; see the other pages.`)}</div>;
  }
  return <UpazilaNowPage />;
}
