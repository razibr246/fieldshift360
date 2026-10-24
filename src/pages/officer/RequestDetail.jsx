import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Camera, CheckCircle2, MapPin, Send, UserRound, Footprints, Droplets, Sprout, Layers, Phone, History, CloudRain, Users, AlertTriangle, ChevronRight, Wheat } from 'lucide-react';
import { useStore, soilData, demo } from '../../store';
import { PageHeader, Card, Badge, Button, Tags, Note, EmptyState, SmsMeter } from '../../components/ui';
import MapView from '../../components/map/MapView';
import { SYMPTOMS, DISEASES, aiLabel, DEMO_TODAY, upazilaOfUnion } from '../../data/demo';
import { cropName, IRRIGATION } from '../../engine/crops';
import { num, fmtDate, bnDigits, daysBetween, todayDhaka, parseISO } from '../../engine/dates';
import { haversineKm } from '../../engine/cluster';
import { fetchForecast, weatherOf } from '../../engine/forecast';
import { PRIORITY, REQ_STATUS, ageLabel, sortRequests } from './shared';
import { replyOptions } from '../../engine/advice';
import { bnOf } from '../../engine/text';
import FarmerAvatar from '../../components/brand/FarmerAvatar';

const NEAR_KM = 3; // "nearby" for the same problem
const NEAR_DAYS = 14;

export default function RequestDetail() {
  const { id } = useParams();
  return <RequestDetailInner key={id} id={id} />;
}

// The next three days at the field (Open-Meteo), for advice that depends on rain.
function useFieldWeather(lat, lon) {
  const [w, setW] = useState(null);
  useEffect(() => {
    let alive = true;
    // one retry after a short wait, as the main weather card does
    fetchForecast(lat, lon).catch(() => new Promise((ok) => setTimeout(ok, 2500)).then(() => fetchForecast(lat, lon)))
      .then((d) => { if (alive) setW(d); }).catch(() => { if (alive) setW(false); });
    return () => { alive = false; };
  }, [lat, lon]);
  return w;
}

function RequestDetailInner({ id }) {
  const navigate = useNavigate();
  const { s, dispatch, T, L, toast, unionsAll, farmerOf, hotspots, confirmedAll } = useStore();
  const lang = s.lang;
  const r = s.requests.find((x) => x.id === id);
  const [text, setText] = useState(null);
  const [opt, setOpt] = useState('answer');
  const f = r ? farmerOf(r.farmerId) : null;
  const weather = useFieldWeather(f?.lat, f?.lon);
  const nearby = useMemo(() => (r ? s.requests.filter((x) => x.id !== r.id && x.symptom === r.symptom && x.crop === r.crop && x.status !== 'resolved'
    && Math.abs(daysBetween(x.created, r.created)) <= NEAR_DAYS && haversineKm(x, r) <= NEAR_KM) : []), [r, s.requests]);
  if (!r) return <EmptyState title={T('অনুরোধটি পাওয়া যায়নি', 'Request not found')} text={T('হয়তো নমুনা আবার শুরু করা হয়েছে।', 'The demo may have been restarted.')} action={<Button to="/officer/requests">{T('অনুরোধের তালিকায় ফিরুন', 'Back to requests')}</Button>} />;

  const upz = upazilaOfUnion(r.union);
  // A request can come from a union outside this officer's upazila list; its name still comes from the union table.
  const unionMeta = unionsAll[r.union]?.meta ?? demo.unions.find((u) => u.id === r.union);
  const plan = unionsAll[r.union]?.plans.find((p) => p.plot_id === r.farmerId) ?? confirmedAll.find((p) => p.plot_id === r.farmerId);
  const soil = soilData.unions[r.union];
  const profile = s.profiles[r.farmerId] ?? {};
  const sign = T(`উপজেলা কৃষি অফিস, ${upz.name.bn}`, `Upazila agriculture office, ${upz.name.en}`);
  const options = replyOptions(r, T, sign);
  const draft = text ?? options.find((o) => o.key === opt).text;
  const others = s.requests.filter((x) => x.farmerId === r.farmerId && x.id !== r.id).sort((a, b) => b.created - a.created);
  const sent = s.advisories.filter((a) => a.request === r.id);
  const cluster = hotspots.find((h) => h.members.some((m) => m.id === r.id));
  const queue = sortRequests(s.requests.filter((x) => x.union === r.union && x.status === 'open' && x.id !== r.id));
  const next = queue[0];
  const done = r.status === 'resolved';
  const update = (patch, bn, en) => { dispatch({ type: 'updateRequest', ids: [r.id], patch }); toast(bn, en); };
  const reply = () => {
    if (!draft.trim()) return;
    dispatch({ type: 'addAdvisory', adv: { id: `A-${r.id}-${Date.now().toString(36)}`, text: draft.trim(), to: [r.farmerId], at: todayDhaka(), request: r.id } });
    update({ status: 'answered' }, 'কৃষকের কাছে উত্তর গেছে', 'Reply sent to the farmer');
  };
  const askInfo = () => {
    dispatch({ type: 'addAdvisory', adv: { id: `I-${r.id}-${Date.now().toString(36)}`, text: T('পাতার ওপর আর নিচ দুই দিকের আরও পরিষ্কার ছবি পাঠান, দিনের আলোয় তুলবেন।', 'Please send clearer photos of both sides of the leaf, taken in daylight.'), to: [r.farmerId], at: todayDhaka(), request: r.id } });
    update({ status: 'need_info' }, 'আরও ছবি চাওয়া হয়েছে', 'Asked for more photos');
  };
  const days3 = weather ? weather.days.slice(0, 3) : [];
  const wetSoon = days3.slice(0, 2).some((d) => d.pop >= 60);
  const place = T(`গ্রাম ${r.villageBn}, ${unionMeta?.full.bn ?? ''}, ${upz.name.bn} উপজেলা`, `${r.village} village, ${unionMeta?.full.en ?? ''}, ${upz.name.en} upazila`);
  const points = [
    ...nearby.map((x) => ({ id: x.id, lat: x.lat, lon: x.lon, color: '#b42318', r: 6, ring: '#ffffff', label: `${L(farmerOf(x.farmerId)?.name)}: ${L(SYMPTOMS[x.symptom])}`, onClick: () => navigate(`/officer/requests/${x.id}`) })),
    { id: f.id, lat: f.lat, lon: f.lon, color: '#d08f26', r: 10, ring: '#ffffff', label: L(f.name) },
  ];

  return (
    <div>
      <Link to="/officer/requests" className="mb-4 inline-flex items-center gap-2 text-[14.5px] font-semibold text-muted hover:text-primary-700"><ArrowLeft size={16} />{T('সব অনুরোধ', 'All requests')}</Link>
      <PageHeader eyebrow={T(`অনুরোধ নম্বর ${r.id}`, `Request ${r.id}`)} title={`${L(f.name)}: ${L(SYMPTOMS[r.symptom])}`}
        subtitle={`${place} · ${cropName(r.crop, lang)} · ${ageLabel(r.created, T)}`}
        action={<><Badge tone={PRIORITY[r.priority].tone}>{L(PRIORITY[r.priority])}</Badge><Badge tone={REQ_STATUS[r.status].tone}>{L(REQ_STATUS[r.status])}</Badge></>} />

      {cluster && (
        <Note tone="warn" className="mb-6"><AlertTriangle size={15} className="mr-1 inline" />
          {T(`এই অনুরোধ একটি এলাকার সতর্কতার অংশ: কাছাকাছি ${num(cluster.members.length, 'bn')}টি জমি থেকে একই সমস্যা। একজনকে উত্তর দেওয়ার চেয়ে সবাইকে একসঙ্গে পরামর্শ পাঠানো ভালো।`, `This request is part of an area alert: ${cluster.members.length} nearby fields report the same problem. Advising them all at once beats answering one.`)}{' '}
          <Link to="/officer/alerts" className="font-semibold underline underline-offset-2">{T('এলাকার সতর্কতা খুলুন', 'Open area alerts')}</Link>
        </Note>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <FarmerAvatar id={f.id} size={48} fallback={<div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-[18px] font-bold text-primary-800">{L(f.name).slice(0, 1)}</div>} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-bold">{L(f.name)}</h2>
                <p className="text-[13.5px] text-muted">{place}</p>
              </div>
              {profile.mobile && (
                <a href={`tel:${profile.mobile}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-700 px-3 py-2 text-[13.5px] font-semibold text-white hover:bg-primary-800"><Phone size={15} />{lang === 'bn' ? bnDigits(profile.mobile) : profile.mobile}</a>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
              {[[Wheat, T('জমি', 'Land'), T(`${num(f.area_dec, 'bn')} শতক (${num(f.area_dec / 33, 'bn', { dp: 1 })} বিঘা)`, `${f.area_dec} dec (${num(f.area_dec / 33, 'en', { dp: 1 })} bigha)`)],
                [Sprout, T('গতবার', 'Last Rabi'), cropName(f.last_crop, lang)],
                [Droplets, T('সেচ', 'Water'), L(IRRIGATION[f.irrigation])],
                [Layers, T('মাটি', 'Soil'), `pH ${num(soil.ph, lang, { dp: 1 })} · ${T('জৈব', 'OM')} ${num(soil.om_pct, lang, { dp: 1 })}%`]].map(([Icon, k, v]) => (
                <div key={k} className="rounded-xl bg-canvas p-2.5"><div className="flex items-center gap-1 text-muted"><Icon size={13} />{k}</div><div className="mt-0.5 font-semibold">{v}</div></div>
              ))}
            </div>
            <h3 className="mt-5 text-[14.5px] font-bold">{T('কৃষক যা লিখেছেন', 'What the farmer wrote')}</h3>
            <p className="mt-2 rounded-xl bg-canvas p-4 text-[16px] leading-7">“{L(r.text)}”</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
              <span className="chip bg-black/[.04] text-ink/75"><Camera size={13} />{r.image ? T('ছবি আছে', 'Photo') : r.ai && !r.doctor ? T('ছবি (নমুনা)', 'Photo (sample)') : r.imageDropped ? T('ছবি সংরক্ষিত হয়নি', 'Photo not kept') : T('ছবি নেই', 'No photo')}</span>
              <span className="chip bg-black/[.04] text-ink/75"><MapPin size={13} />{T('জায়গা জানা', 'Location known')}</span>
              <span className="chip bg-black/[.04] text-ink/75"><Sprout size={13} />{plan ? `${cropName(plan.crop, lang)}, ${fmtDate(plan.date, lang)}` : T('মৌসুমের পরিকল্পনা পাকা হয়নি', 'Season plan not confirmed')}</span>
              {profile.contact && <span className="chip bg-black/[.04] text-ink/75">{T('জানাতে চান', 'Prefers')}: {{ app: T('অ্যাপে', 'app'), sms: T('এসএমএসে', 'SMS'), call: T('ফোনে', 'phone call') }[profile.contact]}</span>}
            </div>
            {(r.spread || r.since) && (
              <div className="mt-2 flex flex-wrap gap-2 text-[12.5px]">
                {r.spread && <span className="chip bg-amber-50 text-amber-900 ring-1 ring-amber-200">{{ few: T('কয়েকটা গাছে', 'a few plants'), part: T('জমির একাংশে', 'part of the field'), whole: T('প্রায় পুরো জমিতে', 'most of the field') }[r.spread]}</span>}
                {r.since && <span className="chip bg-amber-50 text-amber-900 ring-1 ring-amber-200">{{ today: T('আজ দেখেছেন', 'seen today'), days: T('২–৩ দিন ধরে', 'for 2–3 days'), week: T('এক সপ্তাহের বেশি', 'over a week') }[r.since]}</span>}
              </div>
            )}
            {r.context && (
              <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 text-[13.5px] leading-6">
                <div className="flex items-center justify-between gap-2"><b className="text-sky-950">{T('কৃষকের জমি থেকে সঙ্গে এসেছে', 'Sent from the farmer’s field')}</b><Tags list={['REAL']} /></div>
                <ul className="mt-1 space-y-0.5 text-ink/80">
                  <li>{r.context.dAfter >= 0 ? T(`লাগানোর ${bnDigits(r.context.dAfter)} দিন পর: ${r.context.stage.bn}`, `${r.context.dAfter} days after planting: ${r.context.stage.en.toLowerCase()}`) : T(`এখনো লাগানো হয়নি (আর ${bnDigits(-r.context.dAfter)} দিন)`, `Not planted yet (${-r.context.dAfter} days to go)`)}{r.context.field?.area_dec ? T(`, ${bnDigits(r.context.field.area_dec)} শতক`, `, ${r.context.field.area_dec} decimal`) : ''}</li>
                  {r.context.water && <li>{T('মাটির পানি (FAO-56 হিসাব): ', 'Soil water (FAO-56 balance): ')}{{ GREEN: T('সবুজ', 'green'), YELLOW: T('হলুদ', 'yellow'), ORANGE: T('কমলা, সেচ দরকার', 'orange, needs water'), RED: T('লাল, খুব শুকনো', 'red, very dry') }[r.context.water]}</li>}
                  {r.context.sat && <li>{T(`উপগ্রহ ${fmtDate(parseISO(r.context.sat.d), 'bn')}: সবুজ (NDVI) ${num(r.context.sat.ndvi, 'bn', { dp: 2 })}, আর্দ্রতা ${num(r.context.sat.ndmi, 'bn', { dp: 2 })}`, `Satellite ${fmtDate(parseISO(r.context.sat.d), 'en')}: NDVI ${num(r.context.sat.ndvi, 'en', { dp: 2 })}, NDMI ${num(r.context.sat.ndmi, 'en', { dp: 2 })}`)}{r.context.sat.finding ? ` · ${L(r.context.sat.finding)}` : ''}</li>}
                  {r.context.weather && <li>{T(`বৃষ্টি: গত ৭ দিনে ${num(r.context.weather.rain7, 'bn')} মিমি, পরের ৩ দিনে ${num(r.context.weather.rainNext3, 'bn')} মিমি পূর্বাভাস; সর্বোচ্চ ${num(r.context.weather.tmax, 'bn')}°`, `Rain: ${num(r.context.weather.rain7, 'en')} mm in the last 7 days, ${num(r.context.weather.rainNext3, 'en')} mm forecast for 3; high ${num(r.context.weather.tmax, 'en')}°`)}</li>}
                </ul>
              </div>
            )}
            {r.image && <img src={r.image} alt={T('কৃষকের পাঠানো ছবি', 'Photo from the farmer')} className="mt-4 max-h-64 rounded-xl object-contain" />}
            {r.ai && (
              <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-bold text-violet-900"><Bot size={18} />{T('ফসলের ডাক্তারের ধারণা', 'Crop doctor’s first look')}</div><Tags list={[r.doctor ? 'AI' : 'DEMO']} /></div>
                <div className="mt-3 space-y-1.5">{r.ai.map((a) => <div key={a.k} className="grid grid-cols-[minmax(0,1fr)_90px_44px] items-center gap-2 text-[13.5px]"><span className="text-violet-950">{L(aiLabel(a))}</span><div className="h-1.5 rounded-full bg-white"><div className="h-full rounded-full bg-violet-500" style={{ width: `${a.p * 100}%` }} /></div><b className="text-right tabular">{num(a.p * 100, lang)}%</b></div>)}</div>
                {r.doctor && (
                  <div className="mt-3 space-y-1.5 border-t border-violet-200 pt-3 text-[13.5px] leading-5 text-violet-950">
                    <p>{r.doctor.report.summary}</p>
                    {r.doctor.report.findings.map((f, i) => <p key={i} className="text-violet-900/80"><b>{lang === 'bn' ? f.name_bn : f.name_en}:</b> {f.evidence}</p>)}
                    {r.doctor.report.treatment_note && <p className="text-amber-900"><b>{T('ওষুধ নিয়ে', 'On chemicals')}:</b> {r.doctor.report.treatment_note}</p>}
                    <p className="text-[12px] text-violet-800/70">{T(`জরুরিতা: ${{ low: 'কম', medium: 'মাঝারি', high: 'বেশি' }[r.doctor.report.urgency]} · AI ডাক্তার`, `Urgency: ${r.doctor.report.urgency} · AI doctor`)}{r.doctor.sources?.length ? T(` · ${bnDigits(r.doctor.sources.length)}টি সূত্র`, ` · ${r.doctor.sources.length} sources`) : ''}</p>
                  </div>
                )}
                {r.ai[0].p < 0.7 && <p className="mt-3 text-[13.5px] leading-5 text-violet-800">{T('সম্ভাবনা ৭০ শতাংশের কম, তাই আপনার চোখে দেখে নেওয়া দরকার।', 'The top match is under 70%, so it needs your judgement.')}</p>}
              </div>
            )}
            {others.length > 0 && (
              <div className="mt-5">
                <h3 className="flex items-center gap-1.5 text-[14.5px] font-bold"><History size={15} className="text-primary-600" />{T(`এই কৃষকের আরও ${num(others.length, 'bn')}টি অনুরোধ`, `${others.length} more from this farmer`)}</h3>
                <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {others.map((x) => (
                    <Link key={x.id} to={`/officer/requests/${x.id}`} className="flex items-center gap-3 px-3 py-2.5 text-[13.5px] hover:bg-primary-50/60">
                      <span className="min-w-0 flex-1"><span className="font-semibold">{L(SYMPTOMS[x.symptom])}</span><span className="text-muted"> · {cropName(x.crop, lang)} · {ageLabel(x.created, T)}</span></span>
                      <Badge tone={REQ_STATUS[x.status].tone}>{L(REQ_STATUS[x.status])}</Badge><ChevronRight size={15} className="text-muted" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <MapView center={[f.lat, f.lon]} zoom={14} basemap="satellite" points={points} height={280} className="!rounded-none !border-0" label={T('কৃষকের জমি', 'Farmer’s field')} />
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <h3 className="flex items-center gap-1.5 text-[14px] font-bold"><Users size={15} className="text-red-700" />{T('আশপাশে একই সমস্যা', 'Same problem nearby')}</h3>
                <p className="mt-1 text-[13.5px] leading-6 text-muted">{nearby.length
                  ? T(`${num(NEAR_KM, 'bn')} কিমির মধ্যে, ${num(NEAR_DAYS, 'bn')} দিনে আরও ${num(nearby.length, 'bn')}টি ${bnOf(cropName(r.crop, 'bn'))} একই খবর (মানচিত্রে লাল বিন্দু)।`, `${nearby.length} more ${cropName(r.crop, 'en').toLowerCase()} reports of the same within ${NEAR_KM} km and ${NEAR_DAYS} days (red dots).`)
                  : T(`${num(NEAR_KM, 'bn')} কিমির মধ্যে আর কেউ একই সমস্যা জানাননি।`, `No one else within ${NEAR_KM} km has reported the same.`)}</p>
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-[14px] font-bold"><CloudRain size={15} className="text-sky-700" />{T('জমিতে আগামী ৩ দিন', 'The next 3 days at the field')}</h3>
                {weather === null ? <p className="mt-1 text-[13px] text-muted">{T('আবহাওয়া আসছে…', 'Loading the weather…')}</p>
                  : weather === false ? <p className="mt-1 text-[13px] text-muted">{T('এখন আবহাওয়া আনা যায়নি।', 'Could not load the weather.')}</p>
                    : (
                      <>
                        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-[12px]">
                          {days3.map((d, i) => (
                            <div key={d.date} className="rounded-lg bg-canvas px-1 py-1.5">
                              <div className="font-semibold">{i === 0 ? T('আজ', 'Today') : fmtDate(Date.parse(d.date), lang)}</div>
                              <div className="text-muted">{L(weatherOf(d.code))}</div>
                              <div className="tabular">{num(Math.round(d.max), lang)}° · <span className={d.pop >= 60 ? 'font-semibold text-sky-700' : ''}>{num(d.pop, lang)}%</span></div>
                            </div>
                          ))}
                        </div>
                        <p className={`mt-2 text-[12.5px] leading-5 ${wetSoon ? 'font-semibold text-sky-800' : 'text-muted'}`}>{wetSoon ? T('দুই দিনের মধ্যে বৃষ্টির সম্ভাবনা বেশি: এখন ওষুধ বা সার দিতে মানা করুন, ধুয়ে যাবে।', 'Rain is likely within two days: advise against spraying or fertilising now, it would wash off.') : T('দুই দিনে বৃষ্টির সম্ভাবনা কম; দরকার হলে ওষুধ বা সার দেওয়া যায়।', 'Rain is unlikely for two days; spraying or fertilising can go ahead if needed.')} <span className="font-normal text-muted">({T('ওপেন-মেটিও, লাইভ', 'Open-Meteo, live')})</span></p>
                      </>
                    )}
              </div>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5 sm:p-6 xl:sticky xl:top-24">
          <h2 className="text-[20px] font-bold">{T('আপনার উত্তর', 'Your reply')}</h2>
          {(r.status === 'answered' || done) && <Note tone="ok" className="mt-3">{T('উত্তর পাঠানো হয়েছে। কৃষক তাঁর "সাহায্য" পাতায় দেখবেন।', 'Reply sent. The farmer will see it on their Help page.')}</Note>}
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label={T('খসড়া বাছুন', 'Pick a draft')}>
            {options.map((o) => (
              <button key={o.key} type="button" aria-pressed={opt === o.key && text === null} disabled={done} onClick={() => { setOpt(o.key); setText(null); }}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${opt === o.key && text === null ? 'border-primary-700 bg-primary-700 text-white' : 'border-border bg-white text-ink/75 hover:border-primary-300'}`}>{L(o)}</button>
            ))}
          </div>
          <label className="mt-3 block text-[14.5px] font-semibold" htmlFor="reply">{T('কৃষককে কী বলবেন', 'What to tell the farmer')}</label>
          <textarea id="reply" rows={8} value={draft} onChange={(e) => setText(e.target.value)} disabled={done} className="mt-2 w-full rounded-xl border border-border p-3 text-[15px] leading-7 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 disabled:bg-canvas" />
          <SmsMeter text={draft} className="mt-1" />
          <p className="mt-1 text-[12.5px] leading-5 text-muted">{T('খসড়াটি প্রশ্ন আর সমস্যার ধরন দেখে বানানো, প্রচলিত কৃষি পরামর্শ থেকে; পাঠানোর আগে পড়ে দরকারমতো বদলে নিন।', 'The draft is built from the question and problem type, using standard extension advice; read it and change it as needed before sending.')}</p>
          <Button onClick={reply} disabled={done || !draft.trim()} className="mt-3 w-full py-3"><Send size={16} />{T('কৃষককে উত্তর পাঠান', 'Send reply')}</Button>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={askInfo} disabled={done}><Camera size={16} />{T('আরও ছবি চান', 'Ask for photos')}</Button>
            <Button variant="secondary" onClick={() => update({ visit: !r.visit, priority: r.visit ? r.priority : 'High' }, r.visit ? 'জমিতে যাওয়ার তালিকা থেকে বাদ' : 'জমিতে যাওয়ার তালিকায় রাখা হলো', r.visit ? 'Removed from visits' : 'Added to field visits')} disabled={done}><Footprints size={16} />{r.visit ? T('জমিতে যাবেন ✓', 'Visiting ✓') : T('জমিতে যাবেন', 'Plan a visit')}</Button>
            <Button variant="ghost" className="col-span-2 text-primary-700" onClick={() => update({ status: 'resolved' }, 'মিটে গেছে বলে রাখা হলো', 'Marked as resolved')} disabled={done}><CheckCircle2 size={16} />{T('মিটে গেছে', 'Resolved')}</Button>
          </div>
          {sent.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="flex items-center gap-1.5 text-[14px] font-bold"><History size={15} className="text-primary-600" />{T('এই অনুরোধে পাঠানো', 'Sent on this request')}</h3>
              <ul className="mt-2 space-y-2">
                {sent.map((a) => <li key={a.id} className="rounded-xl bg-primary-50 p-3 text-[13.5px] leading-6 whitespace-pre-line">{a.text}</li>)}
              </ul>
            </div>
          )}
          {next && <Button variant="ghost" onClick={() => navigate(`/officer/requests/${next.id}`)} className="mt-4 w-full border border-dashed border-border">{T('পরের খোলা অনুরোধ', 'Next open request')}<ChevronRight size={15} /></Button>}
        </Card>
      </div>
    </div>
  );
}
