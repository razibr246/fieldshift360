import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CloudRain, Satellite, Sprout, CalendarClock, MapPin, Info, Layers, TrendingUp, Map as MapIcon, Rows3, Building2 } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Badge, Tags } from '../../components/ui';
import MapView from '../../components/map/MapView';
import { UnionLayer } from '../../components/map/UpazilaLayers';
import AmanHazards from '../../components/charts/AmanHazards';
import { SectionNav, LazyMount, Skeleton } from '../../components/SectionNav';
import RadarStory from '../../components/charts/RadarStory';
import { SeasonChart, RadarTimelapse, YearsStrip, RainTrend, DistrictMap, ProgressChart, progressSeries, RainBuild, FieldCurve } from '../../components/charts/AmanCharts';
import { AMAN, CAT, LATEST, SHIFT_DAYS, MIN_FIELDS, RAIN_FINAL_TO, THROUGH, catOf, districtOf, doyToMs, useAmanDetail } from '../../radar/aman';
import { fmtDate, num } from '../../engine/dates';
import { UPAZILAS } from '../../data/upazilas';
import { onsetSummary } from '../../radar/onset';
import validation from '../../data/onset_validation.json';
import { GEO, hasGeo, loadGeo } from '../../data/geo';

// Ropan Radar: rain and Aman planting, from real satellites (scripts/data/build_aman_radar.mjs). An upazila officer sees their own
// upazila in depth (season, progress, every sample field, unions, rain) and can open any other upazila of the district that
// has its maps, radar frames and hazards built (src/data/geo); the rest of the district is there for comparison.
// The season and the upazila live in the URL (?y=…&u=…) so Back works.
function RadarPage() {
  const { s, T, L, officerUpazila } = useStore();
  const lang = s.lang;
  const home = officerUpazila.id;
  const [params, setParams] = useSearchParams();
  // Every upazila of the officer's own district can be opened (?u=…); another district's never shows here.
  const homeDistrict = districtOf(home);
  const canOpen = (id) => !!id && hasGeo(id) && districtOf(id) === homeDistrict && AMAN.districts[homeDistrict]?.upazilas.some((u) => u.id === id);
  const view = canOpen(params.get('u')) ? params.get('u') : home;
  const dId = districtOf(view);
  const district = AMAN.districts[dId];
  // the district's upazilas one after another in alphabetical order (Bangla order in Bangla), the officer's own marked
  const openable = district.upazilas.filter((u) => hasGeo(u.id)).sort((a, b) => L(a).localeCompare(L(b), lang === 'bn' ? 'bn' : 'en'));
  // a radar-only upazila's map arrives when it is opened
  const [, geoArrived] = useState(0);
  useEffect(() => { if (!GEO[view]) loadGeo(view).then(() => geoArrived((n) => n + 1), () => {}); }, [view]);
  const mine = view === home;
  const row = district.upazilas.find((u) => u.id === view);
  const year = row.seasons[params.get('y')] ? +params.get('y') : LATEST;
  const go = (u, y) => setParams({ ...(u === home ? {} : { u }), ...(y === LATEST ? {} : { y: String(y) }) });
  const setYear = (y) => go(view, y);
  const setView = (u) => { if (canOpen(u)) go(u, year); };
  const detail = useAmanDetail(view);
  const se = row.seasons[year];
  const cat = CAT[catOf(se.shift)];
  const day = (doy, y = year) => fmtDate(doyToMs(y, doy), lang);
  const yr = (y) => num(y, lang).replace(/,/g, '');
  const rainDiff = se.rainJJ === null || row.rainNormal === null || se.rainProvisional ? null : Math.round(((se.rainJJ - row.rainNormal) / row.rainNormal) * 100);
  const rainThrough = row.rainThrough && `${row.rainThrough.slice(0, 4)}-${row.rainThrough.slice(4, 6)}-${row.rainThrough.slice(6)}`;
  const ready = detail.status === 'ready' && !!GEO[view]; // the season data and, for a radar-only upazila, its map

  return (
    <div>
      <PageHeader eyebrow={T(`রোপণ রাডার · বৃষ্টি ও ফসল রোপণ · ${district.bn} জেলা`, `Ropan Radar · Rain and crop planting · ${district.en} district`)}
        title={T(`${row.bn}: এবার ফসল রোপণ সময়মতো হচ্ছে কি?`, `${row.en}: is planting on time this year?`)}
        subtitle={T('মেঘের নিচেও সেন্টিনেল-১ রাডার দেখে কোন জমিতে কবে পানি দিয়ে চারা রোপণ হলো (এখন বর্ষার আমন ধান মাপা হয়, কারণ রোপণের সময় জমিতে পানি থাকে); নাসার জিপিএম আইমার্জ উপগ্রহ মাপে বৃষ্টি। প্রতিটি উপজেলাকে তার নিজের গত বছরগুলোর সঙ্গে মেলানো হয়; নিচে জেলার অন্য উপজেলার সঙ্গে তুলনা।', 'Sentinel-1 radar sees through monsoon cloud when each field is flooded and transplanted (it measures monsoon Aman rice for now, because its fields stand in water at planting); NASA’s GPM IMERG satellites measure the rain. Each upazila is compared with its own past seasons, and with the rest of the district below.')}
        tags={['REAL', 'RULE']} />

      <div className="mb-5 flex flex-wrap gap-2 text-[12.5px]">
        <span className="chip bg-sky-100 text-sky-900"><Satellite size={13} />{T(`সেন্টিনেল-১ রাডার · ${fmtDate(Date.parse(THROUGH), 'bn')} পর্যন্ত`, `Sentinel-1 radar · to ${fmtDate(Date.parse(THROUGH), 'en')}`)}</span>
        <span className="chip bg-sky-100 text-sky-900"><CloudRain size={13} />{T(`নাসা আইমার্জ বৃষ্টি · ${rainThrough ? fmtDate(Date.parse(rainThrough), 'bn') : ''} পর্যন্ত`, `NASA IMERG rain · to ${rainThrough ? fmtDate(Date.parse(rainThrough), 'en') : ''}`)}</span>
        <span className="chip bg-sky-100 text-sky-900"><Layers size={13} />{T('ফসলি জমি: সেন্টিনেল-২ ভূমি-ব্যবহার', 'Cropland: Sentinel-2 land cover')}</span>
      </div>

      {openable.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label={T(`${district.bn} জেলার উপজেলা`, `Upazilas of ${district.en} district`)}>
          <span className="text-[13px] font-semibold text-muted">{T(`${district.bn} জেলার উপজেলা:`, `${district.en} district:`)}</span>
          {openable.map((u) => (
            <button key={u.id} type="button" onClick={() => setView(u.id)} aria-pressed={u.id === view}
              className={`h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-all duration-150 active:scale-95 ${u.id === view ? 'bg-primary-700 text-white shadow-sm ring-2 ring-primary-700/20' : 'bg-black/[.04] text-ink/75 hover:bg-black/[.08]'}`}>
              {L(u)}{u.id === home && <span className={`ml-1.5 text-[11.5px] ${u.id === view ? 'text-white/80' : 'text-paddy-700'}`}>{T('আপনার', 'yours')}</span>}
            </button>
          ))}
        </div>
      )}

      <SectionNav label={T('পাতার অংশ', 'Page sections')} sections={[
        ...(onsetSummary(view, row) ? [{ id: 'rd-onset', label: T('বৃষ্টি শুরু', 'Rain onset') }] : []),
        { id: 'rd-season', label: T('এই মৌসুম', 'This season') },
        { id: 'rd-story', label: T('জেলার গল্প', 'District story') },
        { id: 'rd-progress', label: T('অগ্রগতি ও বৃষ্টি', 'Progress and rain') },
        { id: 'rd-hazards', label: T('খরা-বন্যা ঝুঁকি', 'Hazards') },
        { id: 'rd-fields', label: T('নমুনা জমি', 'Sample fields') },
        { id: 'rd-history', label: T('রাডার ছবি ও ইতিহাস', 'Radar and history') },
        { id: 'rd-rain', label: T('২৫ বছরের বৃষ্টি', '25 years of rain') },
        { id: 'rd-district', label: T('জেলার তুলনা', 'District') },
        { id: 'rd-method', label: T('পদ্ধতি', 'Method') },
      ]} />

      {/* When the rains set in (Godagari and Dhamrai), then the season at a glance */}
      <OnsetCard upazila={view} name={row} />

      <Card id="rd-season" className={`${onsetSummary(view, row) ? 'mt-6 ' : ''}p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-primary-700"><MapPin size={14} />{T(`${row.bn} উপজেলা, ${district.bn} জেলা, ${district.division.bn} বিভাগ`, `${row.en} upazila, ${district.en} district, ${district.division.en} division`)}{mine ? <Badge tone="amber" className="ml-1">{T('আপনার উপজেলা', 'Your upazila')}</Badge> : <button type="button" onClick={() => setView(home)} className="ml-1 text-[12.5px] font-semibold text-paddy-700 underline-offset-2 hover:underline">{T(`← আপনার উপজেলা (${officerUpazila.name.bn})`, `← Your upazila (${officerUpazila.name.en})`)}</button>}</p>
            <h2 className="mt-1 text-[24px] font-bold leading-tight sm:text-[28px]">{T(`${yr(year)} সালের আমন: ${cat.bn}`, `Aman ${year}: ${cat.en.toLowerCase()}`)}</h2>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={T('বছর', 'Year')}>
            {Object.keys(row.seasons).map(Number).map((y) => (
              <button key={y} type="button" onClick={() => setYear(y)} aria-pressed={y === year}
                className={`h-8 rounded-lg px-2.5 text-[13px] font-semibold tabular transition-all duration-150 active:scale-95 ${y === year ? 'bg-primary-700 text-white shadow-xs' : 'bg-black/[.04] text-ink/70 hover:bg-black/[.08]'}`}>{yr(y)}</button>
            ))}
          </div>
        </div>

        <div key={year} className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat icon={Sprout} tone={cat.color} label={T('রাডারে ধরা রোপণ', 'Transplanting seen by radar')}
            value={se.transplantDoy === null ? T('ধরা পড়েনি', 'Not detected') : !se.reliable ? T('যথেষ্ট জমিতে ধরা পড়েনি', 'Too few fields') : day(se.transplantDoy)}
            note={se.transplantDoy !== null && !se.reliable ? T(`মাত্র ${num(se.nDetected, 'bn')}টি নমুনা জমিতে সংকেত; তারিখ বলতে অন্তত ${num(MIN_FIELDS, 'bn')}টি লাগে।`, `A signal in only ${se.nDetected} sample fields; at least ${MIN_FIELDS} are needed to give a date.`)
              : se.iqr ? T(`বেশির ভাগ জমিতে ${day(se.iqr[0])} – ${day(se.iqr[1])}; ${num(se.nFields, 'bn')}টি নমুনা জমির ${num(se.nDetected, 'bn')}টিতে ধরা পড়েছে`, `Most fields ${day(se.iqr[0])} – ${day(se.iqr[1])}; seen in ${se.nDetected} of ${se.nFields} sample fields`) : T('এই মৌসুমে রোপণের স্পষ্ট সংকেত মেলেনি', 'No clear transplanting signal this season')} />
          <Stat icon={CalendarClock} tone={cat.color} label={T('স্বাভাবিকের তুলনায়', 'Against the usual date')}
            value={se.shift === null ? '—' : se.shift === 0 ? T('ঠিক স্বাভাবিক দিনে', 'On the usual day') : T(`${num(Math.abs(se.shift), 'bn')} দিন ${se.shift < 0 ? 'আগে' : 'পরে'}`, `${Math.abs(se.shift)} days ${se.shift < 0 ? 'earlier' : 'later'}`)}
            note={row.transplantNormal === null ? '' : T(`স্বাভাবিক ${day(row.transplantNormal)} (২০১৭–২০২৫-এর মধ্যমা); ±${num(SHIFT_DAYS, 'bn')} দিন স্বাভাবিক ধরা হয়`, `Usual ${day(row.transplantNormal)} (2017–2025 median); ±${SHIFT_DAYS} days counts as usual`)} />
          <Stat icon={CloudRain} tone={rainDiff !== null && rainDiff < 0 ? '#a8552a' : '#2f8a8f'} label={T('জুন–জুলাইয়ের বৃষ্টি', 'June–July rain')}
            value={se.rainJJ === null ? '—' : T(`${num(se.rainJJ, 'bn')} মিমি${se.rainProvisional ? '*' : ''}`, `${se.rainJJ} mm${se.rainProvisional ? '*' : ''}`)}
            note={se.rainProvisional ? T(`* অস্থায়ী: আইমার্জের সাম্প্রতিক মাসগুলো প্রাথমিক উপগ্রহ-হিসাব, মাপযন্ত্রে মেলানো চূড়ান্ত তথ্য ৩–৪ মাস পরে আসে। তাই স্বাভাবিকের (${num(row.rainNormal, 'bn')} মিমি) সঙ্গে তুলনা করা হয়নি।`, `* Provisional: IMERG's latest months are its early satellite-only estimate; the gauge-calibrated final arrives 3–4 months later, so it is not compared with the normal (${row.rainNormal} mm).`)
              : rainDiff === null ? '' : T(`স্বাভাবিক ${num(row.rainNormal, 'bn')} মিমি; এবার ${num(Math.abs(rainDiff), 'bn')}% ${rainDiff < 0 ? 'কম' : 'বেশি'}`, `Normal ${row.rainNormal} mm; ${Math.abs(rainDiff)}% ${rainDiff < 0 ? 'less' : 'more'} this year`)} />
        </div>

        <div className="mt-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold">{T('মৌসুমজুড়ে রাডার আর বৃষ্টি', 'Radar and rain through the season')}</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-5 rounded bg-[#2f6e2f]" />{T('রাডার সংকেত (VH)', 'Radar signal (VH)')}</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-[#2f8a8f]/50" />{T('দৈনিক বৃষ্টি', 'Daily rain')}</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-[#d08f26]/30" />{T('বেশির ভাগ জমিতে রোপণ', 'Most fields transplanted')}</span>
            </div>
          </div>
          {ready ? <SeasonChart detail={detail.data} row={row} year={year} /> : <Loading status={detail.status} T={T} />}
          <p className="mt-2 text-[13px] leading-6 text-muted">{T('জমিতে পানি দিলে রাডারের সংকেত হঠাৎ নামে (পানি আয়নার মতো), চারা বড় হলে আবার ওঠে। ৩৬টি নমুনা জমির প্রতিটিতে এই নামা-ওঠা খুঁজে রোপণের দিন ধরা হয়।', 'Flooding a field makes the radar signal drop (water acts like a mirror) and the growing crop brings it back up. The drop-and-rise is looked for in each of 36 sample fields to date the transplanting.')}</p>
        </div>
      </Card>

      {/* The first Ropon Radar's eight scenes, retold on this district's real data. */}
      <Card id="rd-story" className="mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[20px] font-bold">{T(`জেলার চোখে রোপণ রাডার: ${district.bn}`, `Ropan Radar through the district: ${district.en}`)}</h2>
            <p className="text-[14px] leading-6 text-muted">{T('প্রথম রোপণ রাডারের আটটি দৃশ্য, নমুনা রংপুরের বদলে আপনার জেলার আসল উপগ্রহ তথ্যে। নিজে থেকে চলে; দৃশ্যে চাপ দিয়ে বা তীর দিয়ে বদলান।', 'The first Ropon Radar\'s eight scenes, on your district\'s real satellite data instead of sample Rangpur data. It plays by itself; tap a scene or use the arrows.')}</p>
          </div>
          <Tags list={['REAL', 'RULE']} />
        </div>
        <RadarStory district={district} row={row} detail={ready ? detail.data : null} home={view} />
      </Card>

      {ready && (
        <>
          <div id="rd-progress" className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card className="p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-bold"><TrendingUp size={18} className="text-paddy-700" />{T('রোপণ কতটা এগোল', 'How far transplanting got')}</h3>
              <p className="mt-1 text-[13.5px] leading-6 text-muted">{progressText(detail.data, year, T, day)}</p>
              <div className="mt-3"><ProgressChart detail={detail.data} year={year} normalTo={AMAN.normalTo} /></div>
              <Legend items={[[GOLD_LINE, T(`${yr(year)} সাল`, String(year))], [DASH, T('আগের বছরগুলোর মধ্যমা', 'Past years’ median')], [BAND_GREEN, T('আগের বছরগুলোর মাঝের অর্ধেক', 'Middle half of past years')]]} />
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-bold"><CloudRain size={18} className="text-sky-700" />{T('১ জুন থেকে জমা বৃষ্টি', 'Rain added up from 1 June')}</h3>
              <p className="mt-1 text-[13.5px] leading-6 text-muted">{T(`বীজতলা আর জমি তৈরির মাসগুলোতে বৃষ্টি কেমন জমেছে, ২০০১–২০২৫-এর সঙ্গে তুলনা।${year > RAIN_FINAL_TO ? ' এ বছরের রেখা অস্থায়ী (ভাঙা দাগ); চূড়ান্ত তথ্য এলে বদলাবে।' : ''}`, `How rain built up through the seedbed and land-preparation months, against 2001–2025.${year > RAIN_FINAL_TO ? ' This year’s line is provisional (dashed) until the final data arrive.' : ''}`)}</p>
              <div className="mt-3"><RainBuild detail={detail.data} year={year} /></div>
              <Legend items={[[TEAL_LINE, T('এ বছর', 'This year')], [DASH, T('স্বাভাবিক (মধ্যমা)', 'Normal (median)')], [BAND_TEAL, T('২০০১–২০২৫-এর মাঝের অর্ধেক', 'Middle half, 2001–2025')]]} />
            </Card>
          </div>

          <div id="rd-hazards"><LazyMount height={900}><AmanHazards key={view} id={view} /></LazyMount></div>

          <div id="rd-fields"><LazyMount height={620}><FieldsSection key={view} detail={detail.data} row={row} year={year} /></LazyMount></div>

          <div id="rd-history" className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <Card className="p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-bold"><Satellite size={18} className="text-primary-600" />{T(`রাডারের চোখে ${yr(LATEST)} মৌসুম`, `The ${LATEST} season through radar`)}</h3>
              <p className="mt-1 text-[13.5px] text-muted">{T('সেন্টিনেল-১-এর আসল ছবি, প্রতিটি পাস। হলুদ বিন্দু: যে নমুনা জমিতে রোপণ ধরা পড়েছে।', 'Real Sentinel-1 images, every pass. Gold dots: sample fields where transplanting was detected.')}</p>
              <div className="mt-4"><RadarTimelapse key={view} detail={detail.data} row={row} year={LATEST} /></div>
            </Card>
            <Card className="p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-[18px] font-bold"><CalendarClock size={18} className="text-primary-600" />{T('দশ মৌসুমে রোপণের সময়', 'Transplanting over ten seasons')}</h3>
              <p className="mt-1 text-[13.5px] text-muted">{T('বিন্দু: মধ্যমা রোপণের দিন; হলুদ দাগ: বেশির ভাগ জমি; সবুজ ছায়া: স্বাভাবিক সময়। বছরে চাপ দিলে ওপরের সব চার্ট বদলাবে।', 'Dot: median transplanting day; gold bar: most fields; green shade: the usual time. Tap a year to show it everywhere above.')}</p>
              <div className="mt-3"><YearsStrip row={row} year={year} onPick={setYear} /></div>
              {!row.seasons[LATEST].complete && <p className="mt-1 text-[12px] text-muted">{T(`* ${yr(LATEST)}: চলতি মৌসুম, ${fmtDate(Date.parse(THROUGH), 'bn')} পর্যন্ত রাডারের তথ্য`, `* ${LATEST}: current season, radar to ${fmtDate(Date.parse(THROUGH), 'en')}`)}</p>}
            </Card>
          </div>
        </>
      )}

      <Card id="rd-rain" className="mt-6 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[18px] font-bold"><CloudRain size={18} className="text-sky-700" />{T(`জুন–জুলাইয়ের বৃষ্টি, ${yr(AMAN.years.rain[0])}–${yr(AMAN.years.rain[1])}`, `June–July rain, ${AMAN.years.rain[0]}–${AMAN.years.rain[1]}`)}</h3>
        <p className="mt-1 text-[13.5px] leading-6 text-muted">{rainTrendText(row, T)}</p>
        <div className="mt-3"><RainTrend row={row} /></div>
      </Card>

      {/* The rest of the district, for comparison only */}
      <div id="rd-district" className="mt-10 mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><Building2 size={20} /></span>
        <div>
          <h2 className="text-[22px] font-bold leading-tight">{T(`${district.bn} জেলার অন্য উপজেলার সঙ্গে তুলনা`, `Compared with the rest of ${district.en} district`)}</h2>
          <p className="text-[13.5px] text-muted">{T(`${yr(year)} সাল। প্রতিটি উপজেলা নিজের ২০১৭–২০২৫-এর স্বাভাবিক সময়ের সঙ্গে।${openable.length > 1 ? ' কোনো উপজেলায় চাপ দিলে ওপরে তার বিস্তারিত খুলবে।' : ''}`, `${year}. Each upazila against its own 2017–2025 usual date.${openable.length > 1 ? ' Tap an upazila to open it in full above.' : ''}`)}</p>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.25fr]">
        <Card className="p-5 sm:p-6">
          <DistrictMap district={district} year={year} selected={view} home={home} onPick={setView} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
            {['early', 'on track', 'late', 'none'].map((k) => <span key={k} className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm" style={{ background: CAT[k].color, opacity: 0.75 }} />{L(CAT[k])}</span>)}
          </div>
        </Card>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-[12.5px] text-muted"><tr>{[T('উপজেলা', 'Upazila'), T('রোপণ (রাডার)', 'Transplanting'), T('স্বাভাবিক', 'Usual'), T('অবস্থা', 'Status'), T('জুন–জুলাই বৃষ্টি', 'June–July rain')].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {district.upazilas.map((u) => {
                const x = u.seasons[year];
                const c = CAT[catOf(x.shift)];
                return (
                  <tr key={u.id} className={u.id === view ? 'bg-primary-50' : ''}>
                    <td className="px-4 py-3 font-semibold">{hasGeo(u.id) && u.id !== view
                      ? <button type="button" onClick={() => { setView(u.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="font-semibold text-primary-700 underline-offset-2 hover:underline">{L(u)}</button>
                      : L(u)}{u.id === home && <span className="ml-1.5 text-[11.5px] font-semibold text-paddy-700">{T('আপনার', 'yours')}</span>}</td>
                    <td className={`px-4 py-3 tabular ${x.reliable ? '' : 'text-muted'}`}>{x.transplantDoy === null ? '—' : x.reliable ? day(x.transplantDoy) : T('কম জমি', 'Too few')} <span className="text-[12px] text-muted">({num(x.nDetected, lang)}/{num(x.nFields, lang)})</span></td>
                    <td className="px-4 py-3 tabular text-muted">{u.transplantNormal === null ? '—' : day(u.transplantNormal)}</td>
                    <td className="px-4 py-3"><Badge tone={c.tone}>{L(c)}{x.shift ? ` ${x.shift > 0 ? '+' : '−'}${num(Math.abs(x.shift), lang)}` : ''}</Badge></td>
                    <td className="px-4 py-3 tabular">{x.rainJJ === null ? '—' : `${num(x.rainJJ, lang)} ${T('মিমি', 'mm')}`}{x.rainProvisional && <span className="ml-1 text-[11.5px] text-muted">{T('অস্থায়ী', 'provisional')}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <Card id="rd-method" className="mt-6 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[17px] font-bold"><Info size={17} className="text-primary-600" />{T('তথ্য কোথা থেকে, কীভাবে হিসাব', 'Where the data comes from and how it is worked out')}</h3>
        <ul className="mt-3 grid gap-2 text-[13.5px] leading-6 text-ink/80 md:grid-cols-2">
          <li>{T('রাডার: ইউরোপের কোপার্নিকাস সেন্টিনেল-১ (১এ, ১বি, ১ডি), প্রতিটি পাস, ১৫ এপ্রিল–৩১ অক্টোবর, ২০১৭ থেকে আজ পর্যন্ত; মাইক্রোসফট প্ল্যানেটারি কম্পিউটারের ভূমি-সংশোধিত ছবি, প্রায় ৪০ মিটারে গড় করা।', 'Radar: Copernicus Sentinel-1 (1A, 1B, 1D), every pass 15 April – 31 October, 2017 to now; terrain-corrected images from Microsoft Planetary Computer, averaged to about 40 m.')}</li>
          <li>{T(`বৃষ্টি: নাসা-জাক্সার জিপিএম আইমার্জ দৈনিক বৃষ্টি (নাসা পাওয়ার থেকে), ২০০১ থেকে। ${num(RAIN_FINAL_TO, 'bn').replace(/,/g, '')}-এর পরের বৃষ্টি অস্থায়ী: নাসা পাওয়ারের অন্য হিসাবের প্রায় অর্ধেক দেখাচ্ছে, তাই স্বাভাবিক আর ধারার হিসাবে রাখা হয়নি।`, `Rain: NASA/JAXA GPM IMERG daily rain (via NASA POWER), from 2001. Rain after ${RAIN_FINAL_TO} is provisional: it reads about half of NASA POWER's other estimate, so it is kept out of the normal and the trend.`)}</li>
          <li>{T('নমুনা জমি: প্রতি উপজেলায় ৩৬টি বিন্দু, যা সেন্টিনেল-২ ভূমি-ব্যবহার মানচিত্রে ২০১৭ ও ২০২৫ দুই বছরেই ফসলি জমি। ইউনিয়নের সীমানা বাংলাদেশ পরিসংখ্যান ব্যুরোর।', 'Sample fields: 36 points per upazila that are cropland in both 2017 and 2025 on the Sentinel-2 land-cover map. Union boundaries from the Bangladesh Bureau of Statistics.')}</li>
          <li>{T(`রোপণ ধরা হয় যখন সংকেত আগের চেয়ে অন্তত ৩ ডিবি নামে আর ৪৫ দিনের মধ্যে অন্তত ৪ ডিবি ওঠে। সব জমিতে ধরা পড়ে না: কিছু জমিতে আমন হয় না বা অন্য ফসল থাকে। অন্তত ${num(MIN_FIELDS, 'bn')}টি জমিতে ধরা পড়লে তবেই উপজেলার তারিখ বলা হয়। সকাল আর সন্ধ্যার পাসের কোণের পার্থক্য প্রতিটি জমির জন্য ঠিক করে নেওয়া হয়।`, `Transplanting is dated where the signal drops at least 3 dB and rises at least 4 dB within 45 days. Not every field shows it: some grow no Aman or another crop. An upazila date is given only when at least ${MIN_FIELDS} fields show it. The angle difference between morning and evening passes is corrected for each field.`)}</li>
          <li>{T('বৃষ্টি শুরু (জেলার প্রতিটি উপজেলা): ১৫ মে থেকে প্রথম যে দিন থেকে ৫ দিনে এলাকার বর্ষার স্বাভাবিক ৫-দিনের বৃষ্টি নামে, পরের ৩০ দিনে ১০ দিনের শুকনো ফাঁক থাকে না আর অন্তত অর্ধেক মাসের বর্ষার বৃষ্টি আসে। বিএমডি স্টেশনের হিসাবে তিন জায়গায় এক সপ্তাহের মধ্যে মেলে (Han ও অন্যরা ২০২৪; docs/RADAR.md)।', 'Rain onset (every upazila of the district): the first day from 15 May on which the next 5 days bring this place’s usual monsoon 5-day rain, with no 10-day dry gap and at least half a monsoon month’s rain in the 30 days after. Within a week of BMD station-based onsets at three places (Han et al. 2024; docs/RADAR.md).')}</li>
          <li>{T('প্রথম রোপণ রাডারের প্রোটোটাইপ (রংপুর) পুরোটাই কৃত্রিম নমুনা তথ্যে বানানো, শুধু দেখানোর জন্য: ', 'The first Ropon Radar prototype (Rangpur) runs entirely on synthetic demo data, for illustration only: ')}<a href="/radar/" className="font-semibold text-primary-700 underline-offset-2 hover:underline">{T('কৃত্রিম ডেমো খুলুন', 'open the synthetic demo')}</a></li>
          <li>{T('বৃষ্টির ধারা: ম্যান-কেন্ডাল পরীক্ষা ও সেনের ঢাল; একই জেলার উপজেলাগুলোর জন্য বেনজামিনি-হকবার্গ সংশোধন (q = ০.১০)। "জোরালো" মানে সেই সংশোধনের পরও টেকে।', 'Rain trend: Mann-Kendall test and Sen’s slope, Benjamini-Hochberg corrected across a district’s upazilas (q = 0.10). "Significant" survives that correction.')}</li>
        </ul>
      </Card>
    </div>
  );
}

// ───────── every sample field on the map, one field's own curve, and the fields by union ─────────
function FieldsSection({ detail, row, year }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const se = detail.seasons[year];
  const firstSeen = se.fields.findIndex((t) => t !== null);
  const [pick, setPick] = useState(null);
  const j = pick ?? (firstSeen > -1 ? firstSeen : 0);
  const unionOf = (k) => { const en = detail.fieldUnion?.[k]; const u = detail.unions?.find((x) => x.en === en); return u ? L(u) : null; };
  const day = (d) => fmtDate(doyToMs(year, d), lang);
  const color = (t) => (t === null ? '#ffffff' : CAT[catOf(row.transplantNormal === null ? null : t - row.transplantNormal)].color);
  const points = detail.fields.map(([lon, lat], k) => {
    const t = se.fields[k];
    return { id: `f${k}`, lat, lon, r: k === j ? 10 : 7, color: color(t), ring: k === j ? '#13261b' : t === null ? '#5d6a63' : '#ffffff',
      label: `${T(`জমি ${num(k + 1, 'bn')}`, `Field ${k + 1}`)}${unionOf(k) ? ` · ${unionOf(k)}` : ''}: ${t === null ? T('রোপণ ধরা পড়েনি', 'not detected') : day(t)}`, onClick: () => setPick(k) };
  });
  const [x0, y0, x1, y1] = detail.box;
  const bounds = useMemo(() => [[y0, x0], [y1, x1]], [x0, y0, x1, y1]);
  const byUnion = useMemo(() => {
    if (!detail.fieldUnion) return [];
    const m = new Map();
    detail.fieldUnion.forEach((en, k) => { const key = en ?? '—'; if (!m.has(key)) m.set(key, []); m.get(key).push(k); });
    return [...m.entries()].map(([en, ks]) => ({ en, ks, seen: ks.filter((k) => se.fields[k] !== null) })).sort((a, b) => b.ks.length - a.ks.length);
  }, [detail, se]);
  return (
    <>
      <Card className="mt-6 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-[18px] font-bold"><MapIcon size={18} className="text-primary-600" />{T(`${UPAZILAS[row.id]?.name.bnOf ?? `${row.bn}ের`} ৩৬টি নমুনা জমি`, `${row.en}'s 36 sample fields`)}</h3>
        <p className="mt-1 text-[13.5px] text-muted">{T('প্রতিটি বিন্দু একটি নমুনা জমি। রং: এ মৌসুমে কবে রোপণ, উপজেলার স্বাভাবিক সময়ের তুলনায়; সাদা: রোপণ ধরা পড়েনি। কোনো জমিতে চাপ দিলে তার নিজের রাডার-রেখা দেখাবে।', 'Each dot is a sample field. Colour: when it was transplanted this season against the upazila’s usual time; white: not detected. Tap a field to see its own radar line.')}</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <MapView center={[row.point[1], row.point[0]]} zoom={11} bounds={bounds} upazila={row.id} points={points} height={440} label={T('নমুনা জমির মানচিত্র', 'Sample field map')}>
              <UnionLayer upazila={row.id} lang={lang} />
            </MapView>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
              {['early', 'on track', 'late'].map((k) => <span key={k} className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full ring-2 ring-white" style={{ background: CAT[k].color }} />{L(CAT[k])}</span>)}
              <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-full border-2 border-[#5d6a63] bg-white" />{T('রোপণ ধরা পড়েনি', 'Not detected')}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4"><FieldCurve detail={detail} year={year} j={j} unionName={unionOf(j)} /></div>
        </div>
      </Card>

      {byUnion.length > 0 && (
        <Card className="mt-6 overflow-x-auto">
          <div className="px-5 pt-5 sm:px-6">
            <h3 className="flex items-center gap-2 text-[18px] font-bold"><Rows3 size={18} className="text-primary-600" />{T('ইউনিয়ন অনুযায়ী নমুনা জমি', 'Sample fields by union')}</h3>
            <p className="mt-1 text-[13.5px] text-muted">{T('প্রতিটি ইউনিয়নে নমুনা জমি অল্প, তাই এখানে গড় তারিখ নয়, প্রতিটি জমির আসল তারিখ দেখানো হলো।', 'Each union has only a few sample fields, so instead of an average each field’s own date is shown.')}</p>
          </div>
          <table className="mt-3 w-full min-w-[560px] text-left text-[14px]">
            <thead className="text-[12.5px] text-muted"><tr>{[T('ইউনিয়ন', 'Union'), T('নমুনা জমি', 'Sample fields'), T('রোপণ ধরা পড়েছে', 'Transplanting seen'), T('প্রতিটি জমির তারিখ', 'Each field’s date')].map((h) => <th key={h} className="px-5 py-2.5 font-semibold sm:px-6">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-border">
              {byUnion.map((u) => (
                <tr key={u.en}>
                  <td className="px-5 py-2.5 font-semibold sm:px-6">{u.en === '—' ? T('সীমানার কাছে', 'On a boundary') : L(detail.unions.find((x) => x.en === u.en))}</td>
                  <td className="px-5 py-2.5 tabular sm:px-6">{num(u.ks.length, lang)}</td>
                  <td className="px-5 py-2.5 tabular sm:px-6">{num(u.seen.length, lang)}</td>
                  <td className="px-5 py-2.5 sm:px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {u.ks.map((k) => (
                        <button key={k} type="button" onClick={() => setPick(k)} className={`rounded-full px-2.5 py-0.5 text-[12px] tabular transition ${k === j ? 'bg-primary-700 text-white' : se.fields[k] === null ? 'bg-black/[.04] text-muted hover:bg-black/[.08]' : 'bg-paddy-50 text-paddy-700 hover:bg-paddy-100'}`}>
                          {T(`জমি ${num(k + 1, 'bn')}`, `F${k + 1}`)}: {se.fields[k] === null ? '—' : day(se.fields[k])}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

const GOLD_LINE = 'h-[3px] w-5 rounded bg-[#d08f26]', TEAL_LINE = 'h-[3px] w-5 rounded bg-[#2f8a8f]', DASH = 'w-5 border-t-2 border-dashed border-[#5d6a63]', BAND_GREEN = 'h-3 w-5 rounded-sm bg-[#2f6e2f]/15', BAND_TEAL = 'h-3 w-5 rounded-sm bg-[#2f8a8f]/15';
function Legend({ items }) {
  return <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">{items.map(([cls, label]) => <span key={label} className="inline-flex items-center gap-1.5"><i className={`inline-block ${cls}`} />{label}</span>)}</div>;
}

function progressText(detail, year, T, day) {
  const checkpoint = Math.round((Date.UTC(year, 6, 31) - Date.UTC(year, 0, 1)) / 864e5) + 1; // 31 July
  const p = progressSeries(detail, year, AMAN.normalTo).find((x) => x.d === checkpoint);
  if (!p || p.now === null || p.mid === null) return '';
  const now = Math.round(p.now), mid = Math.round(p.mid);
  return T(
    `${day(checkpoint)} নাগাদ নমুনা জমির ${num(now, 'bn')}%-এ রোপণ ধরা পড়েছে; আগের বছরগুলোতে এই সময়ে সাধারণত ${num(mid, 'bn')}%। (সব নমুনা জমিতে আমন হয় না, তাই রেখা ১০০%-এ পৌঁছায় না।)`,
    `By ${day(checkpoint)} transplanting was seen in ${now}% of the sample fields; in past years it was usually ${mid}% by then. (Not every sample field grows Aman, so the line never reaches 100%.)`,
  );
}

// Rain onset in the officer's region, every year from 2001: when the rains set in, the usual date and the trend.
function OnsetCard({ upazila, name }) {
  const { s, T } = useStore();
  const o = onsetSummary(upazila, name);
  if (!o) return null;
  const lang = s.lang;
  const day = (y, doy) => fmtDate(doyToMs(y, doy), lang);
  const usualDay = (doy) => fmtDate(doyToMs(2001, doy), lang);
  const tr = o.trend;
  const dec = (x, d) => { const t = x.toFixed(d); return lang === 'bn' ? t.replace(/\d/g, (c) => '০১২৩৪৫৬৭৮৯'[c]) : t; }; // decimals kept in both scripts
  const W = 680, H = 190, P = { l: 52, r: 12, t: 12, b: 26 };
  const ys = o.rows.map((r) => r.year), y0 = ys[0], y1 = ys[ys.length - 1];
  const d0 = 121, d1 = 215; // 1 May .. 3 August (the search opens on 15 May)
  const X = (y) => P.l + ((y - y0) / (y1 - y0)) * (W - P.l - P.r);
  const Y = (d) => P.t + ((Math.min(d1, Math.max(d0, d)) - d0) / (d1 - d0)) * (H - P.t - P.b);
  const ticks = [[5, 1], [5, 15], [6, 1], [6, 15], [7, 1], [7, 15], [8, 1]].map(([m, d]) => Math.round((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / 864e5) + 1);
  return (
    <Card id="rd-onset" className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[17px] font-bold"><CloudRain size={17} className="text-sky-700" />{T(`${name.bn}: বর্ষার বৃষ্টি কবে থেকে টানা নামে`, `${name.en}: when the rains set in`)}</h3>
          <p className="mt-1 max-w-[70ch] text-[13.5px] leading-6 text-muted">{T('প্রতি বছরের বৃষ্টি শুরুর তারিখ, নাসা-জাক্সার জিপিএম আইমার্জ দৈনিক বৃষ্টি থেকে, ২০০১ থেকে।', 'The date the rains set in each year, from NASA/JAXA GPM IMERG daily rain, since 2001.')}{!o.imergOnly && T(' ধূসর ফাঁপা বিন্দু: নাসা পাওয়ারের নিজস্ব বৃষ্টি-হিসাবে একই নিয়ম।', ' Hollow grey dots: the same rule on NASA POWER’s own rain estimate.')}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat icon={CalendarClock} tone="#2f8a8f" label={T('সাধারণত (২০০১–২০২৫-এর মধ্যমা)', 'Usually (2001–2025 median)')} value={usualDay(o.usual)} note={o.atStartYears ? T(`${num(o.refYears, 'bn')} বছরের ${num(o.atStartYears, 'bn')}টিতে ১৫ মে বা তার আগেই শুরু; সবচেয়ে দেরিতে ${usualDay(o.latestDoy)}`, `In ${o.atStartYears} of ${o.refYears} years by 15 May or earlier; latest ${usualDay(o.latestDoy)}`) : T(`সবচেয়ে আগে ${usualDay(o.earliest)}, সবচেয়ে দেরিতে ${usualDay(o.latestDoy)}`, `Earliest ${usualDay(o.earliest)}, latest ${usualDay(o.latestDoy)}`)} />
        <Stat icon={CloudRain} tone="#2f8a8f" label={T('সর্বশেষ চূড়ান্ত বছর', 'Latest final year')} value={o.latest ? day(o.latest.year, o.latest.doy) : '—'} note={o.current ? T(`${num(o.current.year, 'bn').replace(/,/g, '')}: অস্থায়ী${o.current.doy ? `, এখন পর্যন্ত ${day(o.current.year, o.current.doy)}` : ''} — আইমার্জের চূড়ান্ত তথ্য কয়েক মাস পরে আসে`, `${o.current.year}: provisional${o.current.doy ? `, so far ${day(o.current.year, o.current.doy)}` : ''} — IMERG's final data arrives months later`) : ''} />
        <Stat icon={TrendingUp} tone={tr.significant ? '#a8552a' : '#5d6a63'} label={T('২৫ বছরের ধারা', '25-year trend')} value={T(`প্রতি দশকে ${dec(Math.abs(tr.perDecade), 1)} দিন ${tr.perDecade > 0 ? 'দেরিতে' : tr.perDecade < 0 ? 'আগে' : ''}`, `${dec(Math.abs(tr.perDecade), 1)} days ${tr.perDecade > 0 ? 'later' : tr.perDecade < 0 ? 'earlier' : ''} per decade`)}
          note={tr.significant ? T(`পরিসংখ্যানে জোরালো (p = ${dec(tr.p, 2)})`, `Statistically significant (p = ${dec(tr.p, 2)})`) : T(`পরিসংখ্যানে জোরালো নয় (p = ${dec(tr.p, 2)}); বছরে বছরে ওঠানামাই বেশি`, `Not statistically significant (p = ${dec(tr.p, 2)}); year-to-year swings dominate`)} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={T('প্রতি বছরের বৃষ্টি শুরুর তারিখ', 'Rain-onset date each year')}>
        {ticks.map((d) => <g key={d}><line x1={P.l} x2={W - P.r} y1={Y(d)} y2={Y(d)} stroke="#000" strokeOpacity=".07" /><text x={P.l - 6} y={Y(d) + 4} textAnchor="end" fontSize="10.5" fill="#5d6a63">{usualDay(d)}</text></g>)}
        <line x1={P.l} x2={W - P.r} y1={Y(o.usual)} y2={Y(o.usual)} stroke="#2f8a8f" strokeDasharray="4 4" strokeOpacity=".7" />
        {o.rows.map((r) => <g key={r.year}>
          {r.power.doy != null && <circle cx={X(r.year)} cy={Y(r.power.doy)} r="4" fill="none" stroke="#8a948e" strokeWidth="1.4" />}
          {r.imerg.doy != null && (r.imerg.atStart
            // set in by the day the search opens: drawn as a triangle pointing earlier
            ? <path d={`M${X(r.year)} ${Y(r.imerg.doy) - 6} l5 8 h-10z`} fill={r.imerg.complete ? '#2f8a8f' : '#ffffff'} stroke="#2f8a8f" strokeWidth="1.4"><title>{`${r.year}: ${T('১৫ মে বা আগে', 'by 15 May or earlier')}`}</title></path>
            : <circle cx={X(r.year)} cy={Y(r.imerg.doy)} r="5" fill={r.imerg.complete ? '#2f8a8f' : '#ffffff'} stroke="#2f8a8f" strokeWidth="1.6"><title>{`${r.year}: ${day(r.year, r.imerg.doy)}${r.imerg.complete ? '' : ' (provisional)'}`}</title></circle>)}
          {(r.year - y0) % 5 === 0 && <text x={X(r.year)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#5d6a63">{num(r.year, lang).replace(/,/g, '')}</text>}
        </g>)}
      </svg>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T(`নিয়ম: ১৫ মে থেকে প্রথম দিন যেখান থেকে ৫ দিনে অন্তত ${dec(o.thresholdMm, 1)} মিমি (এখানকার বর্ষার স্বাভাবিক ৫-দিনের বৃষ্টি), পরের ৩০ দিনে ১০ দিনের শুকনো ফাঁক নেই আর বর্ষার অর্ধেক মাসের বৃষ্টি। ত্রিভুজ: সেই বছর ১৫ মে-র আগেই বৃষ্টি টানা নেমেছিল। ড্যাশ রেখা: সাধারণ তারিখ।`, `Rule: the first day from 15 May that starts at least ${dec(o.thresholdMm, 1)} mm in 5 days (this place's usual monsoon 5-day rain), with no 10-day dry gap and at least half a monsoon month's rain in the next 30 days. Triangles: years the rains had set in before 15 May. Dashed line: the usual date.`)}</p>
      <BmdCheck />
    </Card>
  );
}

// The onset checked against Bangladesh Meteorological Department records (pipeline/onset/compare_bmd.mjs).
function BmdCheck() {
  const { s, T } = useStore();
  const lang = s.lang;
  const d = (doy) => fmtDate(doyToMs(2001, Math.round(doy)), lang);
  const sd = (x) => `${x >= 0 ? '+' : '−'}${num(Math.abs(Math.round(x)), lang)}`;
  const STN = { Rajshahi: { bn: 'রাজশাহী', up: 'গোদাগাড়ী' }, Barishal: { bn: 'বরিশাল', up: 'বাকেরগঞ্জ' }, Dinajpur: { bn: 'দিনাজপুর', up: 'গঙ্গাচড়া' } };
  return (
    <details className="mt-3 rounded-2xl border border-border bg-white p-3.5">
      <summary className="cursor-pointer text-[14px] font-bold text-primary-800">{T('আবহাওয়া অধিদপ্তরের (বিএমডি) মাপের সঙ্গে যাচাই', 'Checked against Bangladesh Meteorological Department records')}</summary>
      <p className="mt-2 text-[12.5px] leading-5 text-muted">{T('Han ও অন্যরা (২০২৪, Climatic Change) বিএমডি স্টেশনের ১৯৮১–২০১৭-এর বৃষ্টি থেকে বর্ষা শুরুর গড় তারিখ বের করেছেন (১৫ মে থেকে ৩ দিনে অন্তত ৫০ মিমি)। একই নিয়ম আইমার্জে ২০০১–২০১৭ চালিয়ে উপগ্রহ বনাম মাপযন্ত্র, আর পাশে এই পাতার নিয়ম।', 'Han et al. (2024, Climatic Change) worked out mean onset dates from BMD station rain, 1981–2017 (from 15 May, at least 50 mm in 3 days). The same rule on IMERG, 2001–2017, tests satellite against gauge; this page’s rule is beside it.')}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead><tr className="text-left text-muted">
            <th className="py-1.5 pr-2 font-semibold">{T('বিএমডি স্টেশন (কাছের উপজেলা)', 'BMD station (nearby upazila)')}</th>
            <th className="px-2 py-1.5 font-semibold">{T('বিএমডি, ৩ দিনে ৫০ মিমি', 'BMD, 50 mm in 3 days')}</th>
            <th className="px-2 py-1.5 font-semibold">{T('আইমার্জ, একই নিয়ম', 'IMERG, same rule')}</th>
            <th className="px-2 py-1.5 font-semibold">{T('এই পাতার নিয়ম', 'This page’s rule')}</th>
            <th className="px-2 py-1.5 font-semibold">{T('কৃষকের চোখে স্বাভাবিক', 'Farmers’ usual start')}</th>
          </tr></thead>
          <tbody>
            {validation.rows.map((r) => (
              <tr key={r.station} className="border-t border-border">
                <td className="py-1.5 pr-2 font-semibold">{T(`${STN[r.station].bn} (${STN[r.station].up}, প্রায় ${num(r.km, 'bn')} কিমি)`, `${r.station} (${r.upazila[0].toUpperCase()}${r.upazila.slice(1)}, about ${r.km} km)`)}</td>
                <td className="px-2 py-1.5 tabular">{d(r.bmdD1)}</td>
                <td className="px-2 py-1.5 tabular">{d(r.imergD1.mean)} <span className="text-muted">({sd(r.diffD1)} {T('দিন', 'd')})</span></td>
                <td className="px-2 py-1.5 tabular">{d(r.ours.mean)} <span className="text-muted">({sd(r.diffOurs)} {T('দিন', 'd')})</span></td>
                <td className="px-2 py-1.5 tabular">{r.farmers ? d(r.farmers) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-5 text-muted">{T('তিন জায়গাতেই ফারাক এক সপ্তাহের কম, যেখানে বছরে বছরে ওঠানামা ১০–১৫ দিন। আগে খোঁজা শুরু হতো ১৫ এপ্রিল থেকে; তাতে রংপুরের দিকে বৈশাখী ঝড়ে ১৭ দিন আগে ধরা পড়ত, তাই এই যাচাইয়ের পর (২২ অক্টোবর ২০২৬) ১৫ মে থেকে। বিএমডির আনুষ্ঠানিক "বর্ষা আগমন" (দক্ষিণ-পূর্বে প্রায় ২ জুন, উত্তর-পশ্চিমে ১৫ জুন; Ahmed ও Karmakar ১৯৯৩) বাতাসের হিসাব, চাষের বৃষ্টির নয়, তাই সেটা আরও পরে পড়ে।', 'All three are within a week, against year-to-year swings of 10–15 days. The search used to open on 15 April, which landed 17 days early near Rangpur on nor’wester storms, so after this check (22 October 2026) it opens on 15 May. BMD’s official “monsoon arrival” (about 2 June in the south-east, 15 June in the north-west; Ahmed & Karmakar 1993) tracks the winds, not the planting rains, so it falls later.')}</p>
    </details>
  );
}

function Stat({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="aman-fade lift rounded-2xl border border-border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-muted"><span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${tone}1f`, color: tone }}><Icon size={15} /></span>{label}</div>
      <div className="mt-2 text-[24px] font-bold leading-tight tabular" style={{ color: tone }}>{value}</div>
      {note && <p className="mt-1 text-[12.5px] leading-5 text-muted">{note}</p>}
    </div>
  );
}

function Loading({ status, T }) {
  if (status !== 'error') return <Skeleton height={300} />;
  return <div className="grid h-[200px] place-items-center rounded-2xl bg-black/[.03] text-[14px] text-muted">{T('উপজেলার বিস্তারিত তথ্য আনা যায়নি। অ্যাপটি সার্ভার থেকে খুলুন (npm run dev বা build করা সাইট)।', 'Could not load this upazila’s details. Open the app from a server (npm run dev or the built site).')}</div>;
}

function rainTrendText(row, T) {
  const t = row.rainTrend;
  const dir = t.perDecade > 0 ? T('বেড়েছে', 'risen') : T('কমেছে', 'fallen');
  return T(
    `২৫ বছরে জুন–জুলাইয়ের বৃষ্টি প্রতি দশকে প্রায় ${num(Math.abs(t.perDecade), 'bn')} মিমি ${dir}। ${t.significant ? 'প্রমাণ জোরালো, জেলার অন্য উপজেলার সঙ্গে মিলিয়েও টেকে।' : 'তবে প্রমাণ দুর্বল: বছরে বছরে ওঠানামা এত বেশি যে এটাকে নিশ্চিত ধারা বলা যায় না।'} বাদামি দণ্ড: স্বাভাবিকের চেয়ে কম বৃষ্টি; ধূসর দণ্ড: অস্থায়ী।`,
    `Over 25 years June–July rain has ${dir} by about ${Math.abs(t.perDecade)} mm per decade. ${t.significant ? 'The evidence is strong and survives the district-wide correction.' : 'But the evidence is weak: years swing so much that it cannot be called a sure trend.'} Brown bars: less rain than normal; grey: provisional.`,
  );
}

// The radar covers only the districts built by scripts/data/build_aman_radar.mjs; elsewhere the page says so.
export default function Radar() {
  const { T, officerUpazila } = useStore();
  if (!(AMAN.districts[districtOf(officerUpazila.id)]?.upazilas.some((u) => u.id === officerUpazila.id))) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-7 text-amber-900">{T(`${officerUpazila.name.bn} উপজেলার সেন্টিনেল-১ রাডারের তথ্য এখনো তৈরি হয়নি (scripts/data/build_aman_radar.mjs)। তৈরি হলে এখানে আমন রোপণের সময় দেখা যাবে।`, `Sentinel-1 radar data for ${officerUpazila.name.en} has not been built yet (scripts/data/build_aman_radar.mjs). Once it is, the Aman transplanting dates appear here.`)}</div>;
  }
  return <RadarPage />;
}
