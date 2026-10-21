// Ask the upazila agriculture office for help. The farmer names the problem in their own crop's terms (with what to
// look for on the plant), says how much of the field and since when, and the request carries the field's real
// evidence with it: crop stage, today's soil water, the latest satellite reading and the local weather.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MapPin, Send, UserRoundCheck, MessageSquareText, Clock, X, Bug, Leaf, Droplets, HelpCircle, Phone, ScanLine, Satellite, CloudRain, Sprout, CheckCircle2 } from 'lucide-react';
import { useStore, demo } from '../../store';
import { PageHeader, Card, Button, Badge, EmptyState, Note, Tags, Segmented, WATER_STYLE } from '../../components/ui';
import { SYMPTOMS, requestSeason } from '../../data/demo';
import { CROP_PROBLEMS } from '../../data/crop_problems';
import { useFieldWatch } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { WATER_COLORS } from '../../engine/water';
import { fmtDate, daysBetween, num, bnDigits, parseISO } from '../../engine/dates';
import { bnOf, bnIn } from '../../engine/text';

const TYPES = {
  disease: { icon: Leaf, bn: 'রোগ বা পাতায় দাগ', en: 'Disease or leaf spots', symptom: 'leaf_spot', priority: 'Medium', kinds: ['disease', 'other'] },
  pest: { icon: Bug, bn: 'পোকার আক্রমণ', en: 'Pests', symptom: 'aphid', priority: 'Medium', kinds: ['pest'] },
  water: { icon: Droplets, bn: 'সেচের পানি পাচ্ছি না', en: 'Not getting water', symptom: 'water', priority: 'High', kinds: [] },
  question: { icon: HelpCircle, bn: 'অন্য কোনো প্রশ্ন', en: 'Something else', symptom: 'question', priority: 'Low', kinds: [] },
};
const SPREAD = { few: { bn: 'কয়েকটা গাছে', en: 'A few plants', short: { bn: 'কয়েক গাছ', en: 'Few plants' } }, part: { bn: 'জমির একাংশে', en: 'Part of the field', short: { bn: 'একাংশে', en: 'Part' } }, whole: { bn: 'প্রায় পুরো জমিতে', en: 'Most of the field', short: { bn: 'প্রায় সবটা', en: 'Most' } } };
const SINCE = { today: { bn: 'আজ দেখলাম', en: 'Seen today', short: { bn: 'আজ', en: 'Today' } }, days: { bn: '২–৩ দিন ধরে', en: '2–3 days', short: { bn: '২–৩ দিন', en: '2–3 days' } }, week: { bn: 'এক সপ্তাহের বেশি', en: 'Over a week', short: { bn: '৭+ দিন', en: '7+ days' } } };
const STATUS = {
  open: { tone: 'amber', bn: 'উত্তরের অপেক্ষায়', en: 'Waiting for a reply' },
  need_info: { tone: 'blue', bn: 'আরও ছবি চেয়েছেন', en: 'Officer asked for more' },
  answered: { tone: 'green', bn: 'উত্তর দিয়েছেন', en: 'Answered' },
  resolved: { tone: 'slate', bn: 'মিটে গেছে', en: 'Resolved' },
};
const RANK = { Low: 0, Medium: 1, High: 2 };
const bump = (p) => (p === 'Low' ? 'Medium' : 'High');
const AMAN = { id: 'aman', name: { bn: 'আমন ধান', en: 'Aman rice' } };

export default function Help() {
  const { s, dispatch, T, L, toast, farmer, chosen, today, myAdvisories, markSeen, upazila, activeParcel, water, weather, liveWeather, stage, daysAfter } = useStore();
  const lang = s.lang;
  // Before the Rabi crop is sown in Bhadra–Kartik the field still holds the Aman, so that is what a problem is
  // usually about; the farmer can switch to the coming Rabi crop (its seedbed or the land being readied).
  const amanNow = daysAfter < 0 && requestSeason(today) === 'aman';
  const [which, setWhich] = useState(amanNow ? 'now' : 'plan');
  const onAman = amanNow && which === 'now';
  const crop = onAman ? AMAN : chosen.crop;
  const [type, setType] = useState('disease');
  const [problem, setProblem] = useState(null); // a CROP_PROBLEMS key, or null = not sure
  const [spread, setSpread] = useState('few');
  const [since, setSince] = useState('days');
  const [text, setText] = useState('');
  const [img, setImg] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef();
  const myReqs = s.requests.filter((r) => r.farmerId === farmer.id).sort((a, b) => b.created - a.created);
  useEffect(() => { if (myAdvisories.length) markSeen(); }, [myAdvisories.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setProblem(null); }, [type, crop.id]);

  const t = TYPES[type];
  const choices = (CROP_PROBLEMS[crop.id] ?? []).filter((p) => t.kinds.includes(p.kind));
  const picked = choices.find((p) => p.key === problem) ?? null;
  // What the field itself says, sent with the request so the officer starts from evidence.
  const fw = useFieldWatch(activeParcel);
  const sat = useMemo(() => (fw.watch ? readField(fw.watch, { today }) : null), [fw.watch, today]);
  const context = {
    field: activeParcel ? { name: activeParcel.name, area_dec: farmer.area_dec } : { name: null, area_dec: farmer.area_dec },
    dAfter: daysAfter, stage: { bn: stage.bn, en: stage.en },
    water: water.fw && water.fw.mode !== 'before' ? water.color : null,
    sat: sat ? { d: sat.last.d, ndvi: sat.last.ndvi, ndmi: sat.last.ndmi, level: sat.level, finding: sat.findings.find((f) => f.tone !== 'ok') ?? null } : null,
    weather: liveWeather ? { rain7: weather.rain7, rainNext3: weather.rainNext3, tmax: weather.tmax } : null,
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr({ bn: 'শুধু ছবি দেওয়া যাবে।', en: 'Please choose a photo.' }); return; }
    setErr(null);
    const r = new FileReader();
    r.onload = () => setImg(r.result);
    r.readAsDataURL(f);
  };
  // Priority: the problem's own urgency, how far it has spread, and how long it has gone on.
  let priority = t.priority;
  if (picked?.urgent) priority = 'High';
  if (t.kinds.length && spread === 'whole') priority = 'High';
  else if (t.kinds.length && spread === 'part' && since === 'week' && RANK[priority] < 2) priority = bump(priority);
  const submit = (e) => {
    e.preventDefault();
    if (type === 'question' && !text.trim()) { setErr({ bn: 'আপনার প্রশ্নটা লিখুন।', en: 'Please write your question.' }); return; }
    const head = picked ? L(picked) : L(t);
    const extra = t.kinds.length ? T(` ${SPREAD[spread].bn}, ${SINCE[since].bn}।`, ` ${SPREAD[spread].en}, ${SINCE[since].en.toLowerCase()}.`) : '';
    const body = (text.trim() || head) + extra;
    dispatch({ type: 'addRequest', req: {
      id: `H-${farmer.id}-${Date.now().toString(36)}`, farmerId: farmer.id, union: farmer.union, village: farmer.village, villageBn: farmer.villageBn, lat: farmer.lat, lon: farmer.lon,
      crop: crop.id, symptom: picked?.key ?? t.symptom, type: 'help', text: { bn: body, en: body }, ai: null, image: img, created: today, status: 'open', priority,
      spread: t.kinds.length ? spread : null, since: t.kinds.length ? since : null, context, mine: true } });
    setText(''); setImg(null); setErr(null); setProblem(null);
    toast('অনুরোধ পাঠানো হয়েছে; জমির তথ্যও সঙ্গে গেছে', 'Request sent, with your field’s details');
  };

  return (
    <div>
      <PageHeader eyebrow={T('সাহায্য', 'Help')} title={T('কৃষি কর্মকর্তার কাছে জানান', 'Ask your agriculture officer')}
        subtitle={T(`সমস্যাটা বেছে নিন; আপনার জমি, ${bnOf(crop.name.bn)} অবস্থা, উপগ্রহের ছবি আর আবহাওয়া নিজে থেকেই সঙ্গে যাবে।`, `Pick the problem; your field, the state of your ${crop.name.en.toLowerCase()}, the satellite reading and the weather go with it.`)} />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="p-5 sm:p-6">
          <form onSubmit={submit} noValidate>
            {amanNow && (
              <fieldset className="mb-5">
                <legend className="text-[15px] font-semibold">{T('কোন ফসলের সমস্যা?', 'Which crop is it about?')}</legend>
                <Segmented className="mt-2" value={which} onChange={setWhich} options={[
                  { value: 'now', label: T('আমন ধান · এখন জমিতে', 'Aman rice · in the field now') },
                  { value: 'plan', label: T(`${chosen.crop.name.bn} · লাগানো হবে ${fmtDate(chosen.t0, 'bn')}`, `${chosen.crop.name.en} · to plant ${fmtDate(chosen.t0, 'en')}`) },
                ]} />
              </fieldset>
            )}
            <fieldset>
              <legend className="text-[15px] font-semibold">{T('কী হয়েছে?', 'What is wrong?')}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(TYPES).map(([k, x]) => (
                  <label key={k} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-3 text-[15px] font-semibold transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary-100 ${type === k ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-border hover:bg-canvas'}`}>
                    <input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k)} className="sr-only" />
                    <x.icon size={18} className={type === k ? 'text-primary-700' : 'text-muted'} />{L(x)}
                  </label>
                ))}
              </div>
            </fieldset>

            {choices.length > 0 && (
              <fieldset className="mt-5">
                <legend className="text-[15px] font-semibold">{T(`${bnIn(crop.name.bn)} কোনটার মতো দেখাচ্ছে?`, `Which does your ${crop.name.en.toLowerCase()} look like?`)} <span className="font-normal text-muted">{T('(নিশ্চিত না হলে "বুঝতে পারছি না")', '(pick "not sure" if unsure)')}</span></legend>
                <div className="mt-2 space-y-1.5">
                  {[...choices, null].map((p) => {
                    const on = (p?.key ?? null) === problem;
                    return (
                      <label key={p?.key ?? 'unsure'} className={`flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary-100 ${on ? 'border-primary-600 bg-primary-50' : 'border-border hover:bg-canvas'}`}>
                        <input type="radio" name="problem" checked={on} onChange={() => setProblem(p?.key ?? null)} className="mt-1.5 accent-primary-700" />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-semibold">{p ? L(p) : T('বুঝতে পারছি না', 'Not sure')}{p?.urgent && <span className="chip bg-red-50 text-red-700 ring-1 ring-red-200">{T('দ্রুত ছড়ায়', 'spreads fast')}</span>}</span>
                          <span className="block text-[13px] leading-5 text-muted">{p ? L(p.look) : T('ছবি দিন আর খুলে লিখুন, কর্মকর্তা দেখে বলবেন।', 'Add a photo and describe it; the officer will tell you.')}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {t.kinds.length > 0 && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div><div className="mb-1.5 text-[14px] font-semibold">{T('কতটা জমিতে?', 'How much of the field?')}</div>
                  <Segmented value={spread} onChange={setSpread} className="grid w-full grid-cols-3 whitespace-nowrap text-center" options={Object.entries(SPREAD).map(([k, v]) => ({ value: k, label: L(v.short) }))} /></div>
                <div><div className="mb-1.5 text-[14px] font-semibold">{T('কবে থেকে?', 'Since when?')}</div>
                  <Segmented value={since} onChange={setSince} className="grid w-full grid-cols-3 whitespace-nowrap text-center" options={Object.entries(SINCE).map(([k, v]) => ({ value: k, label: L(v.short) }))} /></div>
              </div>
            )}

            <label className="mt-5 block" htmlFor="help-text">
              <span className="text-[15px] font-semibold">{T('একটু খুলে বলুন', 'Tell us a little more')} <span className="font-normal text-muted">{type === 'question' ? '' : T('(না লিখলেও চলবে)', '(optional)')}</span></span>
              <textarea id="help-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} className="mt-2 w-full rounded-xl border border-border p-3 text-[15.5px] leading-7 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50"
                placeholder={type === 'water' ? T('যেমন: সেচ পাম্প তিন দিন বন্ধ, বিদ্যুৎ নেই', 'For example: the irrigation pump has been off for three days, no power') : type === 'question' ? T('যেমন: সরিষা কাটার পর কত দিনের মধ্যে বোরো রোপণ করলে ভালো?', 'For example: how soon after the mustard should I transplant Boro?') : picked ? T(`যেমন: ${L(picked.look)}`, `For example: ${L(picked.look)}`) : T('যেমন: নিচের পাতায় বাদামি দাগ, তিন দিন ধরে বাড়ছে', 'For example: brown spots on the lower leaves, spreading for three days')} />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              <Button variant="secondary" onClick={() => fileRef.current?.click()}><Camera size={16} />{img ? T('ছবি বদলান', 'Change photo') : T('ছবি দিন', 'Add a photo')}</Button>
              {img && <span className="relative"><img src={img} alt={T('যুক্ত করা ছবি', 'Attached photo')} className="h-11 w-11 rounded-lg object-cover" /><button type="button" onClick={() => setImg(null)} className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-ink text-white" aria-label={T('ছবি সরান', 'Remove photo')}><X size={12} /></button></span>}
              {t.kinds.length > 0 && !img && <Link to="/farmer/doctor" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold text-primary-700 hover:bg-primary-50"><ScanLine size={15} />{T('আগে ফসলের ডাক্তারে ছবি দেখান', 'Try the crop doctor first')}</Link>}
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-canvas/70 p-4">
              <div className="flex items-center justify-between gap-2"><div className="text-[14px] font-semibold">{T('অনুরোধের সঙ্গে নিজে থেকে যাবে', 'Goes with your request')}</div><Tags list={['REAL']} /></div>
              <ul className="mt-2 space-y-1.5 text-[13.5px] leading-5 text-ink/80">
                <li className="flex gap-2"><MapPin size={15} className="mt-0.5 shrink-0 text-primary-600" />{context.field.name ? `${L(context.field.name)}, ` : ''}{T(`${bnDigits(farmer.area_dec)} শতক`, `${farmer.area_dec} decimal`)}, {lang === 'bn' ? farmer.villageBn : farmer.village}, {L(demo.unions.find((u) => u.id === farmer.union))}</li>
                <li className="flex gap-2"><Sprout size={15} className="mt-0.5 shrink-0 text-primary-600" />{onAman ? T(`আমন ধান, এখন জমিতে; এরপর ${chosen.crop.name.bn}, লাগানো হবে ${fmtDate(chosen.t0, 'bn')}`, `Aman rice, in the field now; then ${chosen.crop.name.en.toLowerCase()}, to plant ${fmtDate(chosen.t0, 'en')}`) : daysAfter >= 0 ? T(`${crop.name.bn}, লাগানোর ${bnDigits(daysAfter)} দিন পর: ${stage.bn}`, `${crop.name.en}, ${daysAfter} days after planting: ${stage.en.toLowerCase()}`) : T(`${crop.name.bn}, লাগানো হবে ${fmtDate(chosen.t0, 'bn')}`, `${crop.name.en}, to be planted ${fmtDate(chosen.t0, 'en')}`)}</li>
                {context.water && <li className="flex gap-2"><Droplets size={15} className="mt-0.5 shrink-0 text-primary-600" />{T('আজকের মাটির পানি: ', 'Soil water today: ')}{L(WATER_STYLE[context.water])} ({L(WATER_COLORS[context.water])})</li>}
                {sat && <li className="flex gap-2"><Satellite size={15} className="mt-0.5 shrink-0 text-primary-600" />{T(`উপগ্রহ ${fmtDate(parseISO(sat.last.d), 'bn')}: সবুজ ${num(sat.last.ndvi, 'bn', { dp: 2 })}, আর্দ্রতা ${num(sat.last.ndmi, 'bn', { dp: 2 })}`, `Satellite ${fmtDate(parseISO(sat.last.d), 'en')}: green ${num(sat.last.ndvi, 'en', { dp: 2 })}, moisture ${num(sat.last.ndmi, 'en', { dp: 2 })}`)}{context.sat.finding ? ` · ${L(context.sat.finding)}` : ''}</li>}
                {context.weather && <li className="flex gap-2"><CloudRain size={15} className="mt-0.5 shrink-0 text-primary-600" />{T(`বৃষ্টি গত ৭ দিনে ${num(weather.rain7, 'bn')} মিমি, আগামী ৩ দিনে ${num(weather.rainNext3, 'bn')} মিমি; আজ সর্বোচ্চ ${num(weather.tmax, 'bn')}°`, `Rain ${num(weather.rain7, 'en')} mm in the last 7 days, ${num(weather.rainNext3, 'en')} mm forecast for 3; high ${num(weather.tmax, 'en')}° today`)}</li>}
              </ul>
            </div>
            {err && <Note tone="warn" className="mt-3">{L(err)}</Note>}
            <div className="mt-5 flex items-center gap-3">
              <Button type="submit" className="flex-1 py-3"><Send size={16} />{T('পাঠিয়ে দিন', 'Send')}</Button>
              <Badge tone={priority === 'High' ? 'red' : priority === 'Medium' ? 'amber' : 'slate'}>{priority === 'High' ? T('জরুরি', 'Urgent') : priority === 'Medium' ? T('মাঝারি', 'Medium') : T('সাধারণ', 'Routine')}</Badge>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary-50 text-primary-700"><UserRoundCheck size={23} /></div>
              <div><h2 className="text-[17px] font-bold">{L(upazila.officer)}</h2><p className="text-[13.5px] text-muted">{T(`উপজেলা কৃষি অফিসার, ${upazila.name.bn} উপজেলা কৃষি অফিস, ${upazila.district.bn}`, `Upazila agriculture officer, ${upazila.name.en} upazila agriculture office, ${upazila.district.en}`)}</p></div>
            </div>
            <a href="tel:16123" className="mt-4 flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-3.5 py-3 hover:bg-primary-100">
              <Phone size={18} className="shrink-0 text-primary-700" />
              <span className="min-w-0 text-[13.5px] leading-5"><b className="text-[15px] text-primary-900">{T('কৃষি কল সেন্টার ১৬১২৩', 'Krishi Call Centre 16123')}</b><span className="block text-muted">{T('জরুরি হলে এখনই ফোন করুন: কৃষি তথ্য সার্ভিসের বিশেষজ্ঞ, যেকোনো মোবাইল থেকে।', 'Urgent? Call now: Agriculture Information Service experts, from any mobile.')}</span></span>
            </a>
            <h3 className="mt-5 flex items-center gap-2 text-[15px] font-bold"><MessageSquareText size={17} className="text-primary-600" />{T('কর্মকর্তার বার্তা', 'Messages from officers')}</h3>
            <div className="mt-2 space-y-2.5">
              {myAdvisories.filter((a) => !a.request).length === 0 && <p className="text-[14px] text-muted">{T('এলাকার জন্য কোনো সাধারণ বার্তা নেই। আপনার অনুরোধের উত্তর নিচে অনুরোধের সঙ্গেই দেখবেন।', 'No area-wide messages. Replies to your requests show under each request below.')}</p>}
              {myAdvisories.filter((a) => !a.request).map((a) => (
                <div key={a.id} className="rounded-xl bg-primary-50 p-3.5">
                  <div className="text-[12.5px] font-semibold text-primary-700">{a.upazila ? T('উপজেলা কৃষি অফিস থেকে', 'From the upazila agriculture office') : T('আপনার এলাকার সবার জন্য পরামর্শ', 'Advice for everyone in your area')}, {fmtDate(a.at, lang)}</div>
                  <div className="mt-1 whitespace-pre-line text-[15px] leading-7">{a.text}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <h3 className="text-[15px] font-bold">{T('আমার পাঠানো অনুরোধ', 'Requests I have sent')}</h3>
            {myReqs.length === 0 ? <div className="mt-3"><EmptyState icon={Clock} title={T('কোনো অনুরোধ পাঠাননি', 'No requests yet')} text={T('সমস্যা হলে পাশের ফর্ম থেকে পাঠান।', 'Use the form to send one when you need help.')} /></div> : (
              <ul className="mt-2 divide-y divide-border">
                {myReqs.map((r) => {
                  const d = Math.max(0, daysBetween(r.created, today));
                  const replies = myAdvisories.filter((a) => a.request === r.id);
                  // A reply that came through the message store answers the request even before the office's status reaches this phone.
                  const status = replies.length && r.status === 'open' ? 'answered' : r.status;
                  return (
                    <li key={r.id} className="py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          {r.image && <img src={r.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                          <div className="min-w-0">
                            <div className="text-[15px] font-semibold">{L(SYMPTOMS[r.symptom] ?? SYMPTOMS.question)}</div>
                            <div className="text-[13.5px] leading-5 text-muted">{L(r.text)}</div>
                            <div className="mt-0.5 flex flex-wrap gap-1.5 text-[12.5px] text-muted">
                              <span>{d === 0 ? T('আজ', 'Today') : T(`${num(d, 'bn')} দিন আগে`, `${d} days ago`)}</span>
                              {r.priority === 'High' && <span className="chip bg-red-50 text-red-700 ring-1 ring-red-200">{T('জরুরি', 'Urgent')}</span>}
                              {r.context && <span className="chip bg-sky-50 text-sky-800 ring-1 ring-sky-200">{T('জমির তথ্য সঙ্গে', 'Field details attached')}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge tone={STATUS[status].tone}>{L(STATUS[status])}</Badge>
                      </div>
                      {replies.map((a) => (
                        <div key={a.id} className="ml-0 mt-2.5 rounded-xl bg-primary-50 p-3 sm:ml-4">
                          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700"><CheckCircle2 size={13} />{T('কর্মকর্তার উত্তর', 'Officer’s reply')}, {fmtDate(a.at, lang)}</div>
                          <div className="mt-1 whitespace-pre-line text-[14.5px] leading-6">{a.text}</div>
                        </div>
                      ))}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export { STATUS as REQUEST_STATUS };
