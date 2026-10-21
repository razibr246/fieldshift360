import { clockText } from '../../engine/forecast';
// Today's work on this farmer's field, on the real date: before the crop goes in, what to get ready; once it is in,
// whether to irrigate, from the FAO-56 water balance of the field's own soil on live weather at the field (Boro:
// BRRI's alternate wetting and drying); with the field's latest Sentinel-2 picture and the week's forecast.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Droplets, SunMedium, Thermometer, Sprout, AlertTriangle, ScanLine, Satellite, Loader2, CalendarDays, Wind, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, WhyButton, Note, Tags, Segmented, WATER_STYLE } from '../../components/ui';
import { Picture, PhotoPicture } from '../../components/fields/FieldSatellite';
import { useFieldWatch } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { WATER_COLORS, fetchLiveWeather } from '../../engine/water';
import { FIELD_EFF, ROOTS } from '../../engine/fieldwater';
import { fertilizerPlan } from '../../engine/soil';
import { num, fmtDate, fmtBangla, bnDigits, iso, parseISO, daysBetween } from '../../engine/dates';

const WEEKDAY = { bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };

// What the next week holds, from the forecast at the field.
function forecastAlerts(wx, crop, dToday) {
  if (!wx?.days) return [];
  const next = wx.days.slice(wx.today + 1, wx.today + 4), week = wx.days.slice(wx.today, wx.today + 7);
  const rain3 = next.reduce((a, x) => a + (x.rain ?? 0), 0);
  const wettest = week.reduce((a, x) => ((x.rain ?? 0) > (a?.rain ?? -1) ? x : a), null);
  const hot = week.filter((x) => x.tmax >= 35), cold = week.filter((x) => x.tmin != null && x.tmin <= 10);
  const out = [];
  if (rain3 >= 40 || (wettest?.rain ?? 0) >= 40) out.push({ tone: 'warn', bn: bnDigits(`ভারী বৃষ্টির পূর্বাভাস (${fmtDate(parseISO(wettest.d), 'bn')}, ${Math.round(wettest.rain)} মিমি)। জমির নালা পরিষ্কার রাখুন, এর আগে ওষুধ বা সার ছিটাবেন না।`), en: `Heavy rain forecast (${fmtDate(parseISO(wettest.d), 'en')}, ${Math.round(wettest.rain)} mm). Clear the drains; do not spray or top-dress before it.` });
  if (dToday < 0 && dToday >= -7 && (wettest?.rain ?? 0) >= 20) out.push({ tone: 'watch', bn: bnDigits(`বোনার সময়ের কাছে ${Math.round(wettest.rain)} মিমি বৃষ্টির পূর্বাভাস। ভারী বৃষ্টির ঠিক আগে বীজ বুনলে বীজ পচতে পারে বা মাটির ওপর চটা পড়ে।`), en: `${Math.round(wettest.rain)} mm of rain forecast near sowing time. Seed sown just before heavy rain can rot, or the soil can crust over it.` });
  if (hot.length) out.push({ tone: 'warn', bn: bnDigits(`${hot.length} দিন ৩৫° বা বেশি গরমের পূর্বাভাস। সেচ দিলে সকালে বা বিকেলে দিন।`), en: `${hot.length} days at 35 °C or more forecast. Irrigate in the morning or evening.` });
  if (cold.length && ['boro', 'tomato'].includes(crop.id)) out.push({ tone: 'watch', bn: bnDigits(`${cold.length} রাত ১০° বা কম ঠান্ডার পূর্বাভাস। ${crop.id === 'boro' ? 'বীজতলা রাতে পলিথিনে ঢেকে রাখুন।' : 'চারার গোড়ায় পানি দিন, কুয়াশায় রোগ বাড়ে, পাতা দেখুন।'}`), en: `${cold.length} nights at 10 °C or below forecast. ${crop.id === 'boro' ? 'Cover the seedbed with polythene at night.' : 'Water the seedlings; fog brings disease, so watch the leaves.'}` });
  return out;
}

// The field's soil water as a bar: how full the root zone is, and where the crop starts to suffer.
function WaterGauge({ fw }) {
  const { T, s } = useStore();
  const full = Math.max(0, 1 - fw.now.Dr / fw.now.TAW), stress = 1 - fw.now.RAW / fw.now.TAW;
  return (
    <div className="mt-5 rounded-2xl bg-white/15 p-3.5">
      <div className="flex items-baseline justify-between text-[13.5px] text-white/85">
        <span>{T('শিকড়ের নাগালে মাটির পানি', 'Water within reach of the roots')}</span>
        <b className="text-[18px] text-white tabular">{num(Math.round(full * 100), s.lang)}%</b>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-black/25" role="img" aria-label={T(`মাটির পানি ${bnDigits(Math.round(full * 100))}%`, `Soil water ${Math.round(full * 100)}%`)}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${full * 100}%` }} />
        <div className="absolute -inset-y-1 w-0.5 bg-amber-200" style={{ left: `${stress * 100}%` }} />
      </div>
      <div className="relative mt-1.5 h-4 text-[11.5px] text-white/70">
        <span className="absolute left-0">{T('শুকনো', 'Dry')}</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap text-amber-100" style={{ left: `${stress * 100}%` }}>↑ {T('এর বাঁয়ে পানির টান', 'left of this: stress')}</span>
        <span className="absolute right-0">{T('পুরো ভেজা', 'Fully wet')}</span>
      </div>
    </div>
  );
}

// The field from space, three ways: the sharpest photo there is (Esri World Imagery, about 0.3–1 m a pixel here, but
// not dated to this week), that photo enlarged ×4 by AI on the device (labelled), and today's state from the latest
// clear Sentinel-2 pass (10 m). The readings under it always come from Sentinel-2.
function FieldNow({ parcel, crop, dToday }) {
  const { T, L, s, today } = useStore();
  const lang = s.lang;
  const fw = useFieldWatch(parcel);
  const r = useMemo(() => (fw.watch ? readField(fw.watch, { today }) : null), [fw.watch, today]);
  const cropStanding = r?.last && r.last.ndvi >= 0.5;
  const [view, setView] = useState('photo');
  return (
    <Card className="overflow-hidden">
      <div>
        <div className="p-4 pb-0">
          <Segmented value={view} onChange={setView} className="mb-3 grid w-full grid-cols-3 whitespace-nowrap"
            options={[{ value: 'photo', label: T('পরিষ্কার ছবি', 'Sharp photo') }, { value: 'close', icon: Sparkles, label: T('AI কাছ থেকে', 'AI close-up') }, { value: 'tc', label: T('আজকের ছবি', 'This week') }]} />
          {view === 'tc'
            ? (fw.watch?.pictures ? <><Picture key={fw.watch.pictures.date} parcel={parcel} pictures={fw.watch.pictures} kind="tc" /><p className="mt-2 text-[12.5px] leading-5 text-muted">{T('সেন্টিনেল-২-এর প্রতিটি বিন্দু ১০ মিটার, তাই ছবি ঝাপসা; কিন্তু এটা এই সপ্তাহের জমি। নিচের মাপগুলো এই ছবি থেকে।', 'Each Sentinel-2 pixel is 10 m, so it looks soft, but it is this week’s field. The readings below come from it.')}</p></>
              : <div className="grid aspect-square place-items-center rounded-2xl bg-primary-950 text-[13px] text-white/70">{fw.status === 'loading' ? <Loader2 className="animate-spin" /> : T('ছবি নেই', 'No picture')}</div>)
            : <PhotoPicture key={view} parcel={parcel} close={view === 'close'} tight={view === 'photo'} />}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[18px] font-bold"><Satellite size={18} className="text-sky-700" />{T('উপগ্রহে আপনার জমি', 'Your field from space')}</h2>
            <Tags list={['REAL']} />
          </div>
          {r ? (
            <>
              <p className="mt-1 text-[13px] text-muted">{T(`সেন্টিনেল-২, ${fmtDate(parseISO(r.last.d), 'bn')} (${bnDigits(r.ageDays)} দিন আগে), ১০ মিটার। হলুদ রেখা আপনার জমি।`, `Sentinel-2, ${fmtDate(parseISO(r.last.d), 'en')} (${r.ageDays} days ago), 10 m. The yellow line is your field.`)}
                {fw.status === 'loading' && <span className="ml-1 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" />{T('নতুন ছবি খোঁজা হচ্ছে', 'looking for a newer pass')}</span>}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[[T('সবুজ (NDVI)', 'Green (NDVI)'), num(r.last.ndvi, lang, { dp: 2 })], [T('আর্দ্রতা (NDMI)', 'Moisture (NDMI)'), num(r.last.ndmi, lang, { dp: 2 })], [T('পানি জমা', 'Standing water'), `${num(Math.round((r.last.water ?? 0) * 100), lang)}%`]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-canvas px-2 py-2"><dt className="text-[11.5px] leading-tight text-muted">{k}</dt><dd className="font-display text-[18px] font-bold tabular">{v}</dd></div>
                ))}
              </dl>
              {r.top && !r.top.pattern.notField && (
                <p className="mt-3 text-[14px] leading-6">
                  <b>{T('এখন যা দেখা যাচ্ছে:', 'What it looks like now:')}</b> {L(r.top.pattern.name)}{r.stage ? `, ${L(r.stage)}` : ''} <span className="text-[12.5px] text-muted">({T(`মিল ${bnDigits(Math.round(r.top.p * 100))}%, AI`, `${Math.round(r.top.p * 100)}% match, AI`)})</span>
                </p>
              )}
              {dToday < 0 && cropStanding && <Note tone="gold" className="mt-2">{T(`জমিতে এখনো ঘন সবুজ ফসল দাঁড়িয়ে আছে (NDVI ${num(r.last.ndvi, 'bn', { dp: 2 })})। ${crop.name.bn} ${crop.action.bn}র আগে এটা কাটা আর জমি তৈরি শেষ করতে হবে।`, `A thick green crop is still standing (NDVI ${num(r.last.ndvi, 'en', { dp: 2 })}). It must be cut and the land prepared before you ${crop.action.en.toLowerCase()} the ${crop.name.en.toLowerCase()}.`)}</Note>}
              {r.findings.filter((f) => f.tone !== 'ok').slice(0, 2).map((f, i) => <Note key={i} tone={f.tone === 'warn' ? 'warn' : 'gold'} className="mt-2">{L(f)}</Note>)}
            </>
          ) : (
            <p className="mt-2 text-[14px] text-muted">{fw.status === 'loading' ? T('উপগ্রহের ছবি আনা হচ্ছে…', 'Fetching satellite passes…') : T('এই জমির উপগ্রহ ছবি এখনো নেই।', 'No satellite passes for this field yet.')}</p>
          )}
          <Link to="/farmer/farm" className="mt-3 inline-flex text-[13.5px] font-semibold text-primary-700 hover:underline">{T('পুরো উপগ্রহ ইতিহাস দেখুন →', 'See the full satellite history →')}</Link>
        </div>
      </div>
    </Card>
  );
}

export default function Today() {
  const { s, dispatch, T, L, toast, chosen, farmer, today, weather, liveWeather, water, soil, srdiUnion, activeParcel } = useStore();
  const lang = s.lang;
  const crop = chosen.crop;
  const fw = water.fw;
  const dToday = daysBetween(chosen.t0, today);
  const ws = WATER_STYLE[water.color];
  const wx = liveWeather ? s.live : null;
  const alerts = forecastAlerts(wx, crop, dToday);
  const fieldName = activeParcel ? L(activeParcel.name) : T('আপনার জমি', 'your field');
  const fp = dToday < 0 ? fertilizerPlan(srdiUnion, crop.id, { areaDec: farmer.area_dec, landform: soil.landform }) : null;
  const irrigatedOn = s.irrigated[farmer.id];

  // A red signal tells the farmer's officer automatically (once per farmer).
  useEffect(() => {
    if (water.color !== 'RED') return;
    const id = `W-${farmer.id}`;
    if (s.requests.some((r) => r.id === id && r.status === 'open')) return;
    dispatch({ type: 'addRequest', req: { id, farmerId: farmer.id, union: farmer.union, village: farmer.village, villageBn: farmer.villageBn, lat: farmer.lat, lon: farmer.lon, crop: crop.id, symptom: 'water', type: 'water_alert',
      text: { bn: 'নিজে থেকে পাঠানো সতর্কতা: জমির মাটির পানি খুব কম (লাল সংকেত, FAO-56 হিসাব)', en: 'Automatic alert: field soil water very low (red signal, FAO-56 balance)' }, ai: null, created: today, status: 'open', priority: 'High', mine: true } });
    toast('আপনার কৃষি কর্মকর্তাকে জানানো হয়েছে', 'Your officer has been told');
  }, [water.color]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = () => { dispatch({ type: 'set', patch: { live: null } }); fetchLiveWeather(farmer.lat, farmer.lon).then((w) => dispatch({ type: 'set', patch: { live: w || false } })); };
  const logIrrigation = () => { dispatch({ type: 'set', patch: { irrigated: { ...s.irrigated, [farmer.id]: iso(today) }, fieldCheck: null } }); toast('আজকের সেচ লেখা হলো; হিসাব আজ থেকে নতুন করে চলবে', 'Today’s irrigation is logged; the count restarts from today'); };

  const n = fw?.now;
  const why = {
    title: T('আজকের সেচের হিসাব কীভাবে হলো', 'How today’s water is worked out'), tags: [liveWeather ? 'REAL' : 'PLACEHOLDER', 'REAL', 'RULE'],
    blocks: [
      { h: T('পদ্ধতি', 'Method'), lines: fw?.mode === 'awd'
        ? [T('বোরো ধান দাঁড়ানো পানিতে হয়, তাই মাটির পানির হিসাব নয়, ব্রির পর্যায়ক্রমে ভেজানো-শুকানো (AWD) নিয়ম: রোপণের পর দুই সপ্তাহ আর ফুল আসার সময় ২–৫ সেমি পানি রাখুন; বাকি সময় মাঠের ছিদ্রওয়ালা পাইপে পানি মাটির ১৫ সেমি নিচে নামলে আবার সেচ দিন। এতে ১৫–৩০% পানি বাঁচে, ফলন কমে না।', 'Boro is grown in standing water, so it follows BRRI’s alternate wetting and drying (AWD): keep 2–5 cm of water for two weeks after transplanting and at flowering; otherwise irrigate again when the water in a perforated field pipe drops 15 cm below the surface. It saves 15–30% of the water without losing yield.')]
        : [T('FAO-56 (জাতিসংঘের খাদ্য ও কৃষি সংস্থা) দৈনিক মাটির পানির হিসাব: প্রতিদিন ঘাটতি = আগের ঘাটতি − বৃষ্টি + ফসলের পানি খরচ (Kc × ET₀)। ঘাটতি "সহজে পাওয়া পানি" (RAW) ছাড়ালে ফসলের পানির টান শুরু হয়।', 'FAO-56 daily soil-water balance: each day, shortfall = yesterday’s shortfall − rain + crop water use (Kc × ET₀). Once the shortfall passes the readily available water (RAW), the crop starts to suffer.'),
          T('মাটি কতটা পানি ধরে রাখে, তা আপনার জমির বালি-কাদা-জৈব পদার্থ (SoilGrids) থেকে স্যাক্সটন ও রলসের (২০০৬) সূত্রে বের করা।', 'How much water the soil holds comes from your field’s sand, clay and organic matter (SoilGrids) through the Saxton & Rawls (2006) equations.'),
          T(fw?.assumed === 'reset' ? `হিসাব শুরু ${fmtDate(fw.startT, 'bn')} থেকে, যেদিন আপনি সেচ দিয়েছেন বা মাটি ভেজা বলেছেন।` : fw?.assumed === 'planting' ? `হিসাব শুরু লাগানোর দিন (${fmtDate(chosen.t0, 'bn')}) থেকে, ধরে নেওয়া হয়েছে তখন মাটি পুরো ভেজা ছিল (জো বা বোনার আগের সেচ)। সেচ দিলে "আজ সেচ দিয়েছি" চাপুন, হিসাব ঠিক থাকবে।` : 'হিসাব শুরু ৯২ দিন আগে থেকে (আবহাওয়ার তথ্য যতদূর আছে), তখন মাটি পুরো ভেজা ধরে।',
            fw?.assumed === 'reset' ? `The count starts on ${fmtDate(fw.startT, 'en')}, when you irrigated or said the soil was wet.` : fw?.assumed === 'planting' ? `The count starts on planting day (${fmtDate(chosen.t0, 'en')}), taking the soil as fully wet then (sown on good moisture or after a pre-sowing irrigation). Tap "I irrigated today" when you water, so the count stays right.` : 'The count starts 92 days back (as far as the weather goes), taking the soil as fully wet then.')] },
      ...(n ? [{ h: T('আজকের সংখ্যা', 'Today’s numbers'), table: { head: [T('কী', 'What'), T('মান', 'Value')], rows: [
        [T('মাঠ ধারণক্ষমতা / ঝিমিয়ে পড়ার বিন্দু', 'Field capacity / wilting point'), `${num(fw.lim.fc, lang, { dp: 3 })} / ${num(fw.lim.wp, lang, { dp: 3 })} m³/m³`],
        [T('শিকড়ের গভীরতা আজ', 'Root depth today'), `${num(n.zr, lang, { dp: 2 })} m (${T('পুরো', 'full')} ${num(ROOTS[crop.id].zr, lang, { dp: 1 })} m)`],
        [T('মোট পাওয়া যায় এমন পানি (TAW)', 'Total available water (TAW)'), `${num(n.TAW, lang, { dp: 0 })} ${T('মিমি', 'mm')}`],
        [T('সহজে পাওয়া পানি (RAW = p × TAW)', 'Readily available water (RAW = p × TAW)'), `${num(n.RAW, lang, { dp: 0 })} ${T('মিমি', 'mm')} (p = ${num(fw.p, lang, { dp: 2 })})`],
        [T('ফসল-সহগ Kc আজ', 'Crop coefficient Kc today'), num(n.kc, lang, { dp: 2 })],
        [T('রেফারেন্স বাষ্পীভবন ET₀ আজ', 'Reference evapotranspiration ET₀ today'), `${num(n.et0, lang, { dp: 1 })} ${T('মিমি', 'mm')}`],
        [T('ফসলের পানি খরচ আজ', 'Crop water use today'), `${num(n.etc, lang, { dp: 1 })} ${T('মিমি', 'mm')}`],
        [T('মাটির পানির ঘাটতি', 'Root-zone shortfall'), `${num(n.Dr, lang, { dp: 0 })} ${T('মিমি', 'mm')}`],
      ] } }] : []),
      { h: T('মনে রাখবেন', 'Keep in mind'), lines: [T('এটা মডেলের হিসাব। জমিতে গিয়ে মাটি হাতে নিয়ে দেখাই শেষ কথা: মাটি ভেজা বা শুকনো বললে হিসাব সেটা মেনে নেয়। উপগ্রহের আর্দ্রতা (NDMI) পাতার পানি দেখায়, মাটির নিচের পানি মাপে না।', 'This is a model. Feeling the soil in the field has the last word: say wet or dry and the count follows you. Satellite moisture (NDMI) shows water in the leaves, not in the soil below.')] },
    ],
    sources: [
      liveWeather ? T(`আবহাওয়া: Open-Meteo, আপনার জমির জায়গায় (${num(s.live.lat, 'bn', { dp: 2 })}, ${num(s.live.lon, 'bn', { dp: 2 })}), দৈনিক বৃষ্টি আর FAO-56 পেনম্যান-মন্টিথ ET₀, ${s.live.date} পর্যন্ত ও ৭ দিনের পূর্বাভাস`, `Weather: Open-Meteo at your field (${s.live.lat.toFixed(2)}, ${s.live.lon.toFixed(2)}), daily rain and FAO-56 Penman–Monteith ET₀ to ${s.live.date}, with a 7-day forecast`) : T('আবহাওয়া আনা যায়নি', 'Weather unavailable'),
      T(`মাটি: ISRIC SoilGrids ২.০, ${soil.scope === 'field' ? 'আপনার জমির ২৫০ মিটারের ঘর' : 'ইউনিয়নের মাঝখান'}; স্যাক্সটন ও রলস (২০০৬)`, `Soil: ISRIC SoilGrids 2.0, ${soil.scope === 'field' ? 'your field’s 250 m cell' : 'union centre'}; Saxton & Rawls (2006)`),
      T('FAO সেচ ও নিষ্কাশন পত্র ৫৬ (১৯৯৮), সারণি ১১, ১২, ২২; ব্রি AWD নির্দেশিকা', 'FAO Irrigation and Drainage Paper 56 (1998), Tables 11, 12, 22; BRRI AWD guide'),
    ],
  };

  const headline = fw?.mode === 'before' ? T(`${crop.name.bn} ${crop.action.bn}র প্রস্তুতি`, `Getting ready to ${crop.action.en.toLowerCase()}`)
    : fw?.mode === 'awd' ? (fw.keepWet ? T('জমিতে ২–৫ সেমি পানি রাখুন', 'Keep 2–5 cm of water standing') : T('পাইপে পানির স্তর দেখুন', 'Check the water in the field pipe'))
      : L(WATER_COLORS[water.color]);
  const nextIrr = fw?.mode === 'balance' ? (fw.now.Dr >= fw.now.RAW ? T('আজ', 'today') : fw.hitIn >= 0 ? T(`${bnDigits(fw.hitIn + 1)} দিন পর (${fmtDate(parseISO(fw.ahead[fw.hitIn].d), 'bn')})`, `in ${fw.hitIn + 1} days (${fmtDate(parseISO(fw.ahead[fw.hitIn].d), 'en')})`) : T('৭ দিনের মধ্যে নয়', 'not within 7 days')) : null;

  return (
    <div>
      <PageHeader
        eyebrow={T(`আজকের কাজ, ${fmtBangla(today, 'bn')} (${fmtDate(today, 'bn')})`, `Today, ${fmtDate(today, 'en')} (${fmtBangla(today, 'en')})`)}
        title={dToday < 0 ? T('আজ জমিতে কী করবেন?', 'What to do on the field today?') : T('আজ কি সেচ দিতে হবে?', 'Do you need to water today?')}
        subtitle={dToday < 0
          ? T(`${fieldName}, ${bnDigits(farmer.area_dec)} শতক: ${crop.name.bn} ${crop.action.bn} ${fmtDate(chosen.t0, 'bn')}, আর ${bnDigits(-dToday)} দিন বাকি।`, `${fieldName}, ${farmer.area_dec} decimal: ${crop.action.en.toLowerCase()} the ${crop.name.en.toLowerCase()} on ${fmtDate(chosen.t0, 'en')}, ${-dToday} days from now.`)
          : T(`${fieldName}, ${bnDigits(farmer.area_dec)} শতক: ${crop.name.bn}, লাগানোর ${bnDigits(dToday)} দিন পর${fw?.stage ? `, ${fw.stage.bn}` : ''}।`, `${fieldName}, ${farmer.area_dec} decimal: ${crop.name.en.toLowerCase()}, ${dToday} days after planting${fw?.stage ? `, ${fw.stage.en.toLowerCase()}` : ''}.`)}
        tags={[liveWeather ? 'REAL' : 'PLACEHOLDER', 'RULE']}
        action={<WhyButton payload={why} />}
      />

      <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
        <section className={`relative overflow-hidden rounded-[22px] bg-gradient-to-br ${dToday < 0 ? 'from-primary-700 to-primary-900' : ws.grad} p-6 text-white shadow-[var(--shadow-card)] sm:p-8 lg:sticky lg:top-32 lg:self-start`} aria-live="polite">
          <div className="flex items-center justify-between">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20">{dToday < 0 ? <Sprout size={28} /> : <Droplets size={28} />}</div>
            {dToday >= 0 && <span className="chip bg-white/20 !text-[13px] text-white">{L(ws)}</span>}
          </div>
          <div className="mt-6 text-[15px] text-white/85">{T('আজকের পরামর্শ', 'Today’s advice')}</div>
          <div className="font-display mt-1 text-[34px] font-bold leading-tight">{headline}</div>

          {dToday < 0 ? (
            <ol className="mt-4 space-y-2.5 text-[15px] leading-6 text-white/95">
              <li className="flex gap-2"><CalendarDays size={17} className="mt-1 shrink-0" />{T(`${crop.action.bn} ${fmtBangla(chosen.t0, 'bn')} (${fmtDate(chosen.t0, 'bn')}), আর ${bnDigits(-dToday)} দিন। তার আগে জমি চাষ দিয়ে ঝুরঝুরে করুন।`, `${crop.action.en} on ${fmtDate(chosen.t0, 'en')}, in ${-dToday} days. Plough the land to a fine tilth before then.`)}</li>
              <li className="flex gap-2"><Droplets size={17} className="mt-1 shrink-0" />{T('বোনার সময় মাটিতে "জো" থাকা চাই: মুঠোয় চাপলে দলা বাঁধে, আঙুলে চাপলে ভেঙে যায়। মাটি শুকনো হলে বোনার ৩–৪ দিন আগে হালকা সেচ দিন।', 'Sow on good moisture ("jo"): a handful holds together when squeezed and crumbles under a finger. If the soil is dry, give a light irrigation 3–4 days before sowing.')}</li>
              {fp && !fp.none && <li className="flex gap-2"><Sprout size={17} className="mt-1 shrink-0" />{T(`শেষ চাষে আপনার ${bnDigits(farmer.area_dec)} শতকে সার (মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট, ${fp.physiography}): ${fp.items.filter((i) => i.kg > 0).slice(0, 4).map((i) => `${i.fertilizer.replace(/\s*\(.*\)/, '')} ${num(i.kg, 'bn')} কেজি`).join(', ')}। জাত: ${fp.variety}।`, `Fertiliser at the last ploughing for your ${farmer.area_dec} decimal (SRDI, ${fp.physiography}): ${fp.items.filter((i) => i.kg > 0).slice(0, 4).map((i) => `${i.fertilizer.replace(/\s*\(.*\)/, '')} ${num(i.kg, 'en')} kg`).join(', ')}. Varieties: ${fp.variety}.`)}</li>}
              {wx && <li className="flex gap-2"><CloudRain size={17} className="mt-1 shrink-0" />{T(`গত ৭ দিনে বৃষ্টি ${num(wx.rain7, 'bn')} মিমি, আগামী ৩ দিনে ${num(wx.rainNext3, 'bn')} মিমি পূর্বাভাস।`, `Rain: ${num(wx.rain7, 'en')} mm in the last 7 days, ${num(wx.rainNext3, 'en')} mm forecast for the next 3.`)}</li>}
            </ol>
          ) : (
            <ul className="mt-4 space-y-2 text-[15px] leading-6 text-white/90">
              {water.reasons.slice(0, 4).map((r, i) => <li key={i} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />{L(r)}</li>)}
            </ul>
          )}

          {fw?.mode === 'balance' && (
            <>
              <WaterGauge fw={fw} />
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                <div className="rounded-xl bg-white/15 px-3 py-2"><dt className="text-white/75">{T('পরের সেচ', 'Next irrigation')}</dt><dd className="text-[15px] font-bold">{nextIrr}</dd></div>
                <div className="rounded-xl bg-white/15 px-3 py-2"><dt className="text-white/75">{T(`আপনার ${bnDigits(farmer.area_dec)} শতকে লাগবে`, `For your ${farmer.area_dec} decimal`)}</dt>
                  <dd className="text-[15px] font-bold tabular">{fw.net >= 5 ? T(`প্রায় ${num(fw.m3, 'bn')} ঘনমিটার`, `about ${num(fw.m3, 'en')} m³`) : T('এখন দরকার নেই', 'none needed now')}</dd>
                  {fw.net >= 5 && <dd className="text-[11.5px] leading-4 text-white/70">{T(`${num(fw.net, 'bn')} মিমি শিকড়ে পৌঁছাতে; নালার অপচয় ধরে (${num(FIELD_EFF * 100, 'bn')}% কাজে লাগে)`, `${num(fw.net, 'en')} mm to the roots, allowing for losses (${FIELD_EFF * 100}% reaches them)`)}</dd>}</div>
              </dl>
            </>
          )}

          {dToday >= 0 && fw && (
            <div className="mt-5 rounded-2xl bg-white/15 p-3.5">
              <div className="text-[14px] font-semibold text-white/90">{T('জমিতে গিয়ে মাটি হাতে নিয়ে দেখুন, তারপর জানান', 'Feel the soil in the field, then tell us')}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['wet', 'dry'].map((k) => (
                  <button key={k} type="button" onClick={() => dispatch({ type: 'set', patch: { fieldCheck: s.fieldCheck === k ? null : k } })} aria-pressed={s.fieldCheck === k}
                    className={`rounded-xl px-2 py-3 text-[14.5px] font-bold transition ${s.fieldCheck === k ? 'bg-white text-ink' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                    {k === 'wet' ? T('মাটি ভেজা', 'Soil is wet') : T('মাটি শুকনো', 'Soil is dry')}
                  </button>
                ))}
                <button type="button" onClick={logIrrigation} aria-pressed={irrigatedOn === iso(today)}
                  className={`rounded-xl px-2 py-3 text-[14.5px] font-bold transition ${irrigatedOn === iso(today) ? 'bg-white text-ink' : 'bg-white/15 text-white hover:bg-white/25'}`}>
                  {irrigatedOn === iso(today) ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={15} />{T('সেচ লেখা হলো', 'Logged')}</span> : T('আজ সেচ দিয়েছি', 'I irrigated today')}
                </button>
              </div>
              {irrigatedOn && irrigatedOn !== iso(today) && <p className="mt-2 text-[12.5px] text-white/75">{T(`শেষ সেচ লেখা আছে ${fmtDate(parseISO(irrigatedOn), 'bn')}।`, `Last irrigation logged ${fmtDate(parseISO(irrigatedOn), 'en')}.`)}</p>}
            </div>
          )}
          {water.color === 'RED' && <div className="mt-3 rounded-xl bg-white/20 p-3 text-[14.5px] font-semibold">{T('আপনার ইউনিয়নের কৃষি কর্মকর্তাকে নিজে থেকেই জানানো হয়েছে।', 'Your union’s agriculture officer has been told automatically.')}</div>}
        </section>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[20px] font-bold">{T('আপনার জমির আবহাওয়া', 'Weather at your field')}</h2>
              {liveWeather ? <Tags list={['REAL']} /> : null}
            </div>
            {wx ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[[CloudRain, T('গত ৭ দিনের বৃষ্টি', 'Rain, last 7 days'), `${num(wx.rain7, lang)} ${T('মিমি', 'mm')}`],
                    [CloudRain, T('আগামী ৩ দিন', 'Next 3 days'), `${num(wx.rainNext3, lang)} ${T('মিমি', 'mm')}`],
                    [Thermometer, T('আজ সর্বোচ্চ', 'High today'), `${num(wx.tmax, lang)}°`],
                    [Wind, T('আজ উবে যাবে (ET₀)', 'Evaporation today (ET₀)'), `${num(wx.days[wx.today].et0, lang, { dp: 1 })} ${T('মিমি', 'mm')}`]].map(([Icon, l, v]) => (
                    <div key={l} className="rounded-xl bg-canvas p-3.5">
                      <Icon size={18} className="text-sky-600" />
                      <div className="mt-2 text-[12.5px] leading-tight text-muted">{l}</div>
                      <div className="font-display mt-0.5 text-[20px] font-bold tabular">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label={T('সাত দিনের পূর্বাভাস', 'Seven-day forecast')}>
                  {wx.days.slice(wx.today, wx.today + 7).map((x, i) => {
                    const t = parseISO(x.d);
                    return (
                      <div key={x.d} className={`rounded-xl px-1 py-2 text-center ${i === 0 ? 'bg-primary-50 ring-1 ring-primary-200' : 'bg-canvas'}`} title={T(`${fmtDate(t, 'bn')}: বৃষ্টি ${num(x.rain, 'bn', { dp: 1 })} মিমি, ${num(x.tmin, 'bn')}–${num(x.tmax, 'bn')}°, ET₀ ${num(x.et0, 'bn', { dp: 1 })} মিমি`, `${fmtDate(t, 'en')}: rain ${x.rain} mm, ${x.tmin}–${x.tmax}°, ET₀ ${x.et0} mm`)}>
                        <div className="text-[11.5px] font-semibold text-muted">{i === 0 ? T('আজ', 'Today') : WEEKDAY[lang][new Date(t).getUTCDay()]}</div>
                        <div className="mt-1 text-[13px] font-bold tabular">{num(x.tmax, lang)}°</div>
                        <div className="mx-auto mt-1 flex h-8 w-2 flex-col justify-end overflow-hidden rounded-full bg-sky-100"><div className="w-full rounded-full bg-sky-500" style={{ height: `${Math.min(100, ((x.rain ?? 0) / 30) * 100)}%` }} /></div>
                        <div className="mt-1 text-[11px] tabular text-sky-800">{num(x.rain, lang, { dp: (x.rain ?? 0) < 10 ? 1 : 0 })}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[12px] text-muted">{T(`Open-Meteo, আপনার জমির জায়গায়; নীল দাগ দিনের বৃষ্টি (মিমি)। হালনাগাদ ${clockText(wx.fetched, 'bn')}।`, `Open-Meteo at your field; blue bars are the day’s rain (mm). Updated ${clockText(wx.fetched, 'en')}.`)}</p>
              </>
            ) : (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-canvas p-4 text-[14px] text-muted">
                <span className="flex items-center gap-2">{s.live === null ? <><Loader2 size={16} className="animate-spin" />{T('আপনার জমির আবহাওয়া আনা হচ্ছে…', 'Fetching the weather at your field…')}</> : T('আবহাওয়া আনা যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।', 'Could not fetch the weather. Check the internet and try again.')}</span>
                {s.live === false && <Button variant="secondary" onClick={retry}><RefreshCw size={15} />{T('আবার', 'Retry')}</Button>}
              </div>
            )}
          </Card>

          {activeParcel ? <FieldNow parcel={activeParcel} crop={crop} dToday={dToday} /> : (
            <Note tone="gold">{T('আপনার জমি এখনো উপজেলা কৃষি অফিসে নিবন্ধিত নয়, তাই উপগ্রহের ছবি দেখানো যাচ্ছে না। "আমার জমি" পাতায় জমিটা মানচিত্রে চিহ্নিত করুন।', 'Your field is not registered with the upazila office yet, so there is no satellite picture. Mark it on the map in "My farm".')}</Note>
          )}

          <Card className="p-5 sm:p-6">
            <h2 className="text-[20px] font-bold">{T('সতর্কতা', 'Alerts')}</h2>
            <div className="mt-3 space-y-2.5">
              {wx && alerts.length === 0 && <Note tone="ok">{T('আগামী সাত দিনের পূর্বাভাসে বিশেষ কোনো সতর্কতা নেই।', 'No warnings in the seven-day forecast.')}</Note>}
              {alerts.map((a, i) => <Note key={i} tone={a.tone === 'warn' ? 'warn' : 'gold'}>{L(a)}</Note>)}
              {chosen.glut.level !== 'Low' && <Note tone="gold">{T(`ফসল তোলার সময় আপনার ইউনিয়নে দাম পড়ার ঝুঁকি ${chosen.glut.level === 'High' ? 'বেশি' : 'মাঝারি'}। পরিকল্পনার শেষ ধাপে তারিখ বদলে দেখুন।`, `${chosen.glut.level} price-drop risk in your union at harvest. Try another date in the last planning step.`)}</Note>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button to="/farmer/doctor" variant="secondary"><ScanLine size={16} />{T('পাতার ছবি পরীক্ষা', 'Check a leaf photo')}</Button>
              <Button to="/farmer/help" variant="ghost"><AlertTriangle size={16} />{T('কর্মকর্তাকে জানান', 'Tell your officer')}</Button>
            </div>
          </Card>
        </div>
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
        <SunMedium size={14} />{T('গরমের দিনে ভরদুপুরে নয়, সকালে বা বিকেলে সেচ দিন: কম পানি উবে যায়।', 'On hot days water in the morning or evening, not at midday: less of it evaporates.')} <Tags list={['RULE']} />
      </p>
    </div>
  );
}
