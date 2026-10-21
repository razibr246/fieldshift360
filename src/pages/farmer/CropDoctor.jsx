import { clockText } from '../../engine/forecast';
// Crop doctor: the farmer photographs a crop and Claude (vision, api/doctor.js) gives a careful first look, weighed
// against the field's live context (crop and stage, the week's weather, the latest satellite reading, the soil) and
// checked against current DAE/BARI/BRRI guidance by a restricted web search. It is a first look, not a diagnosis:
// every result says how sure it is and can go straight to the agriculture officer with the photo.
import { useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldAlert, CheckCircle2, Send, X, Loader2, AlertTriangle, ExternalLink, Sparkles, FlaskConical, PhoneCall, RefreshCw } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, Tags, Note, Badge } from '../../components/ui';
import { CROP_PROBLEMS } from '../../data/crop_problems';
import { RABI_CROPS } from '../../engine/crops';
import { requestSeason } from '../../data/demo';
import { useFieldWatch } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { num, bnDigits, fmtDate } from '../../engine/dates';
import { bnOf } from '../../engine/text';

const THRESHOLD = 0.7;
const MAX_SIDE = 1568; // Claude reads images up to about this long edge at full detail
const URGENCY = { low: { tone: 'green', bn: 'তাড়া নেই', en: 'Not urgent' }, medium: { tone: 'amber', bn: 'কয়েক দিনের মধ্যে দেখুন', en: 'Act within days' }, high: { tone: 'red', bn: 'জরুরি', en: 'Urgent' } };

// Shrink and re-encode in the browser: a small JPEG uploads fast on a rural connection, and re-encoding drops the
// phone's EXIF data (including GPS) from the photo itself.
async function shrink(dataUrl) {
  const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = dataUrl; });
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}

const AMAN = { id: 'aman', name: { bn: 'আমন ধান', en: 'Aman rice' } };

export default function CropDoctor() {
  const { s, dispatch, T, L, toast, farmer, chosen, today, daysAfter, stage, liveWeather, soil, activeParcel, union, upazila } = useStore();
  const lang = s.lang;
  // In Bhadra–Kartik, before the Rabi is sown, the crop in the field is the Aman, so the doctor starts there.
  const amanNow = daysAfter < 0 && requestSeason(today) === 'aman';
  const [crop, setCrop] = useState(amanNow ? 'aman' : chosen.crop.id);
  const [img, setImg] = useState(null);
  const [note, setNote] = useState('');
  const [st, setSt] = useState({ phase: 'idle' }); // idle | checking | done | off | error
  const [err, setErr] = useState(null);
  const fileRef = useRef();
  const camRef = useRef();
  const [sentId, setSentId] = useState(null);
  const sent = sentId ? s.requests.find((r) => r.id === sentId) : null;
  const cropObj = crop === 'aman' ? AMAN : RABI_CROPS[crop] ?? chosen.crop;
  const fw = useFieldWatch(activeParcel); // the same latest pass the Today page shows
  const sat = useMemo(() => (fw.watch ? readField(fw.watch, { today }) : null), [fw.watch, today]);
  const w = liveWeather ? s.live : null;
  const context = {
    place: `${farmer.village}, ${union.meta.en} union, ${upazila.name.en} upazila, Bangladesh`,
    daysAfter: crop === chosen.crop.id ? daysAfter : null, stage: crop === chosen.crop.id ? stage.en : null,
    weather: w ? { rain7: Math.round(w.rain7), rainNext3: Math.round(w.rainNext3), tmax: w.tmax, tmin: w.days?.[w.today]?.tmin } : null,
    sat: sat ? { d: sat.last.d, ndvi: sat.last.ndvi, ndmi: sat.last.ndmi, finding: sat.findings.find((f) => f.tone !== 'ok')?.en ?? null } : null,
    soil: soil?.ph != null ? { ph: soil.ph, om_pct: soil.om_pct, texture: soil.texture, drainage: soil.drainage } : null,
    note: note.trim() || null,
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr({ bn: 'শুধু ছবি দেওয়া যাবে (jpg, png)।', en: 'Please choose a photo (jpg or png).' }); return; }
    if (f.size > 25 * 1024 * 1024) { setErr({ bn: 'ছবিটা খুব বড় (২৫ মেগাবাইটের বেশি)।', en: 'That photo is too large (over 25 MB).' }); return; }
    setErr(null);
    const reader = new FileReader();
    reader.onload = async () => { try { setImg(await shrink(reader.result)); } catch { setImg(reader.result); } setSt({ phase: 'idle' }); setSentId(null); };
    reader.readAsDataURL(f);
  };

  const check = async () => {
    setSt({ phase: 'checking' }); setErr(null);
    try {
      const r = await fetch(`${import.meta.env.BASE_URL || './'}api/doctor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img.split(',')[1], crop, lang, context, known: (CROP_PROBLEMS[crop] ?? []).map((p) => ({ key: p.key, en: p.en })) }),
      });
      const type = r.headers.get('content-type') || '';
      const j = type.includes('json') ? await r.json() : null;
      if (r.status === 503 || (!j && r.status === 404)) { setSt({ phase: 'off' }); return; }
      if (!r.ok || !j?.report) { setSt({ phase: 'error', status: r.status, msg: j?.error }); return; }
      setSt({ phase: 'done', ...j });
    } catch {
      setSt({ phase: 'error', msg: 'offline' });
    }
  };

  const rep = st.phase === 'done' ? st.report : null;
  const top = rep?.findings?.[0];
  const low = rep && (!top || top.likelihood < THRESHOLD);
  const send = () => {
    const id = `CD-${farmer.id}-${Date.now().toString(36)}`;
    const text = rep ? `${rep.summary}${note.trim() ? ` (${note.trim()})` : ''}` : note.trim() || T('ফসলের ছবি পাঠালাম, দেখে বলবেন।', 'I sent a photo of my crop; please take a look.');
    dispatch({ type: 'addRequest', req: {
      id, farmerId: farmer.id, union: farmer.union, village: farmer.village, villageBn: farmer.villageBn, lat: farmer.lat, lon: farmer.lon,
      crop, symptom: top && top.key !== 'other' && top.key !== 'healthy' ? top.key : 'leaf_spot', type: 'crop_doctor', text: { bn: text, en: text },
      ai: rep?.findings?.length ? rep.findings.map((f) => ({ k: f.key, p: f.likelihood, bn: f.name_bn, en: f.name_en })) : null,
      doctor: rep ? { report: rep, model: st.model, at: st.at, sources: st.sources } : null,
      image: img, created: today, status: 'open', priority: rep?.urgency === 'high' ? 'High' : rep?.urgency === 'low' ? 'Low' : 'Medium', mine: true } });
    setSentId(id);
    toast('ছবি কৃষি কর্মকর্তার কাছে পাঠানো হয়েছে', 'Photo sent to your officer');
  };
  const reset = () => { setImg(null); setSt({ phase: 'idle' }); setSentId(null); setNote(''); };

  return (
    <div>
      <PageHeader eyebrow={T('ফসলের ডাক্তার', 'Crop doctor')} title={T('ফসলের ছবি দেখে প্রথম ধারণা', 'A first look from a crop photo')}
        subtitle={T('Claude AI ছবিটা খুঁটিয়ে দেখে, আপনার জমির এই সপ্তাহের আবহাওয়া, উপগ্রহের ছবি আর মাটির সঙ্গে মিলিয়ে, কৃষি সম্প্রসারণ অধিদপ্তর ও বারি-ব্রির এখনকার সুপারিশ দেখে বলে। এটা নিশ্চিত রোগ নির্ণয় নয়; সন্দেহ থাকলে কৃষি কর্মকর্তাকে পাঠান।', 'Claude AI studies the photo against your field’s weather this week, the satellite picture and the soil, and checks current DAE, BARI and BRRI guidance. It is not a diagnosis; if in doubt, send it to your officer.')}
        tags={['AI', 'REAL']} />
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[14px]">
            <span className="font-semibold">{T('কোন ফসলের ছবি?', 'Which crop is this?')}</span>
            {[...(amanNow ? [AMAN] : []), ...Object.values(RABI_CROPS)].map((c) => (
              <button key={c.id} type="button" onClick={() => setCrop(c.id)} aria-pressed={crop === c.id}
                className={`rounded-full border px-3 py-1 text-[13.5px] font-semibold ${crop === c.id ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-border hover:bg-canvas'}`}>{L(c.name)}</button>
            ))}
          </div>
          <div className="grid min-h-72 place-items-center rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/60 p-6 text-center">
            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {img ? (
              <div className="w-full">
                <img src={img} alt={T('আপনার তোলা ফসলের ছবি', 'Your crop photo')} className="mx-auto max-h-72 rounded-xl object-contain" />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {st.phase !== 'checking' && st.phase !== 'done' && <Button onClick={check}><ScanLine size={17} />{T('ডাক্তারকে দেখান', 'Ask the doctor')}</Button>}
                  {st.phase === 'checking' && <Button disabled><Loader2 size={17} className="animate-spin" />{T('খুঁটিয়ে দেখছে…', 'Looking closely…')}</Button>}
                  <Button variant="secondary" onClick={reset}><X size={16} />{T('অন্য ছবি', 'Another photo')}</Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-primary-700 shadow-sm"><Camera size={30} /></div>
                <h2 className="mt-4 text-[21px] font-bold">{T(`${bnOf(cropObj.name.bn)} পরিষ্কার একটা ছবি দিন`, `Add a clear photo of the ${cropObj.name.en.toLowerCase()}`)}</h2>
                <p className="mx-auto mt-2 max-w-sm text-[15px] leading-7 text-muted">{T('দিনের আলোয়, কাছ থেকে, দাগ বা পোকা যেন স্পষ্ট দেখা যায়। সম্ভব হলে পাতার নিচের দিকেরও একটা।', 'In daylight, up close, with spots or insects clearly visible; the underside of a leaf too if you can.')}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button onClick={() => camRef.current?.click()}><Camera size={17} />{T('ছবি তুলুন', 'Take a photo')}</Button>
                  <Button variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={17} />{T('গ্যালারি থেকে দিন', 'Choose from gallery')}</Button>
                </div>
              </div>
            )}
          </div>
          <label className="mt-4 block" htmlFor="cd-note"><span className="text-[14.5px] font-semibold">{T('কী দেখছেন?', 'What are you seeing?')} <span className="font-normal text-muted">{T('(না লিখলেও চলবে)', '(optional)')}</span></span>
            <input id="cd-note" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border px-3 text-[15px] outline-none focus:border-primary-400" placeholder={T('যেমন: তিন দিন ধরে নিচের পাতা হলুদ হচ্ছে', 'e.g. lower leaves yellowing for three days')} />
          </label>
          {err && <Note tone="warn" className="mt-3">{L(err)}</Note>}
          <div className="mt-4 rounded-xl bg-canvas p-3.5 text-[13px] leading-5 text-ink/75">
            <div className="mb-1 font-semibold text-ink">{T('ছবির সঙ্গে ডাক্তার যা দেখবে', 'What the doctor also sees')}</div>
            <ul className="space-y-0.5">
              {crop === chosen.crop.id && <li>{daysAfter >= 0 ? T(`লাগানোর ${bnDigits(daysAfter)} দিন পর, ${stage.bn}`, `${daysAfter} days after planting, ${stage.en.toLowerCase()}`) : T(`লাগানো হবে আর ${bnDigits(-daysAfter)} দিন পরে`, `Planting in ${-daysAfter} days`)}</li>}
              {w && <li>{T(`বৃষ্টি গত ৭ দিনে ${num(w.rain7, 'bn')} মিমি, পরের ৩ দিনে ${num(w.rainNext3, 'bn')} মিমি; আজ সর্বোচ্চ ${num(w.tmax, 'bn')}°`, `Rain ${num(w.rain7, 'en')} mm last 7 days, ${num(w.rainNext3, 'en')} mm next 3; high ${num(w.tmax, 'en')}° today`)}</li>}
              {sat && <li>{T(`উপগ্রহ ${fmtDate(Date.parse(sat.last.d), 'bn')}: সবুজ ${num(sat.last.ndvi, 'bn', { dp: 2 })}, আর্দ্রতা ${num(sat.last.ndmi, 'bn', { dp: 2 })}`, `Satellite ${fmtDate(Date.parse(sat.last.d), 'en')}: NDVI ${num(sat.last.ndvi, 'en', { dp: 2 })}, NDMI ${num(sat.last.ndmi, 'en', { dp: 2 })}`)}</li>}
              {context.soil && <li>{T(`মাটি pH ${num(soil.ph, 'bn', { dp: 1 })}, জৈব পদার্থ ${num(soil.om_pct, 'bn', { dp: 1 })}%`, `Soil pH ${num(soil.ph, 'en', { dp: 1 })}, organic matter ${num(soil.om_pct, 'en', { dp: 1 })}%`)}</li>}
            </ul>
            <p className="mt-1.5 text-muted">{T('ছবি ছোট করে পাঠানো হয়, ছবির ভেতরের জায়গার তথ্য (জিপিএস) মুছে যায়। আপনার নাম যায় না।', 'The photo is shrunk before sending and its embedded location (GPS) is removed. Your name is not sent.')}</p>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          {st.phase === 'idle' && (
            <div className="grid h-full min-h-72 place-items-center text-center">
              <div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-violet-700"><ScanLine size={26} /></div><div className="mt-3 text-[17px] font-bold">{T('ফলাফল এখানে আসবে', 'The result will show here')}</div><p className="mt-1 text-[14.5px] text-muted">{T('কী কী হতে পারে, কেন মনে হচ্ছে, কতটা জরুরি, আর এখনই কী করবেন।', 'What it might be, why, how urgent, and what to do now.')}</p></div>
            </div>
          )}
          {st.phase === 'checking' && (
            <div className="grid h-full min-h-72 place-items-center text-center">
              <div><Loader2 size={30} className="mx-auto animate-spin text-violet-600" /><div className="mt-3 text-[17px] font-bold">{T('ডাক্তার ছবিটা খুঁটিয়ে দেখছে', 'The doctor is looking closely')}</div><p className="mx-auto mt-1 max-w-xs text-[14px] text-muted">{T('দাগের ধরন, রং, পোকা দেখছে; আবহাওয়া আর উপগ্রহের সঙ্গে মেলাচ্ছে; দরকার হলে সরকারি সুপারিশ দেখছে। আধা মিনিট থেকে এক মিনিট লাগতে পারে।', 'Spot patterns, colour, insects; matching them with the weather and satellite; checking official guidance if needed. This can take half a minute to a minute.')}</p></div>
            </div>
          )}
          {(st.phase === 'off' || st.phase === 'error') && (
            <div className="space-y-4">
              <Note tone="gold">{st.phase === 'off'
                ? T('AI ডাক্তার এখনো চালু করা হয়নি (সার্ভারে Anthropic API চাবি বসানো নেই)। ছবিটা সরাসরি কৃষি কর্মকর্তাকে পাঠাতে পারেন।', 'The AI doctor is not switched on yet (no Anthropic API key on the server). You can send the photo straight to your officer.')
                : st.status === 429 ? T('ডাক্তার এখন ব্যস্ত, এক মিনিট পরে আবার চেষ্টা করুন।', 'The doctor is busy; try again in a minute.')
                  : st.status === 422 ? T('এই ছবির উত্তর দেওয়া গেল না। কৃষি কর্মকর্তাকে পাঠান।', 'No answer could be given for this photo. Send it to your officer.')
                    : st.msg === 'offline' ? T('ইন্টারনেট পাওয়া যাচ্ছে না। সংযোগ দেখে আবার চেষ্টা করুন।', 'No internet connection. Check it and try again.')
                      : T('ডাক্তারের কাছ থেকে উত্তর আসেনি। আবার চেষ্টা করুন, বা কর্মকর্তাকে পাঠান।', 'No answer came back. Try again, or send it to your officer.')}</Note>
              <div className="flex flex-wrap gap-2">
                {st.phase === 'error' && <Button variant="secondary" onClick={check}><RefreshCw size={16} />{T('আবার চেষ্টা', 'Try again')}</Button>}
                <Button disabled={!!sent || !img} onClick={send}><Send size={16} />{sent ? T('পাঠানো হয়েছে', 'Sent') : T('কৃষি কর্মকর্তাকে পাঠান', 'Send to my officer')}</Button>
              </div>
            </div>
          )}
          {rep && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-violet-700"><Sparkles size={14} />{T('ডাক্তারের প্রথম ধারণা', 'The doctor’s first look')}</p>
                  <h2 className="mt-0.5 text-[22px] font-bold leading-tight">{!rep.is_crop_photo ? T('ফসলের ছবি মনে হচ্ছে না', 'This does not look like a crop photo') : top ? (lang === 'bn' ? top.name_bn : top.name_en) : T('স্পষ্ট কিছু পাওয়া যায়নি', 'Nothing clear found')}</h2>
                  <p className="text-[13px] text-muted">{T('ছবিতে দেখা যাচ্ছে: ', 'Seen in the photo: ')}{rep.crop_seen}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5"><Tags list={['AI']} /><Badge tone={URGENCY[rep.urgency].tone}>{rep.urgency === 'high' && <AlertTriangle size={12} />}{L(URGENCY[rep.urgency])}</Badge></div>
              </div>
              {rep.image_quality !== 'good' && <Note tone="gold" className="mt-3"><b>{rep.image_quality === 'unusable' ? T('ছবি থেকে বোঝা যাচ্ছে না। ', 'The photo cannot be read. ') : T('ছবি আরও পরিষ্কার হলে ভালো হতো। ', 'A clearer photo would help. ')}</b>{rep.retake_tip}</Note>}
              <p className="mt-3 text-[15.5px] leading-7">{rep.summary}</p>
              {rep.findings.length > 0 && (
                <div className="mt-4 space-y-3">
                  {rep.findings.map((f, i) => (
                    <div key={`${f.key}-${i}`}>
                      <div className="flex justify-between gap-3 text-[14.5px]"><span className={i === 0 ? 'font-semibold' : 'text-ink/80'}>{lang === 'bn' ? f.name_bn : f.name_en}</span><b className="tabular">{num(Math.round(f.likelihood * 100), lang)}%</b></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/[.06]"><div className={`h-full rounded-full ${i === 0 ? 'bg-violet-600' : 'bg-violet-300'}`} style={{ width: `${f.likelihood * 100}%` }} /></div>
                      <p className="mt-1 text-[13px] leading-5 text-muted">{f.evidence}</p>
                    </div>
                  ))}
                </div>
              )}
              {low ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 font-bold text-amber-900"><ShieldAlert size={18} />{T('নিশ্চিত হওয়া যাচ্ছে না', 'Not certain')}</div>
                  <p className="mt-1.5 text-[14px] leading-6 text-amber-900/85">{T('সম্ভাবনা ৭০ শতাংশের কম, তাই এটাকে নিশ্চিত ধরবেন না। ছবিটা কৃষি কর্মকর্তাকে পাঠান।', 'The top match is under 70%, so do not treat it as certain. Send the photo to your officer.')}</p>
                </div>
              ) : <Note tone="ok" className="mt-5">{T('লক্ষণগুলো বেশ স্পষ্ট, তবুও কোনো ওষুধের আগে কৃষি কর্মকর্তার পরামর্শ নিন।', 'The signs are fairly clear, but ask your officer before using any chemical.')}</Note>}
              {rep.actions_now.length > 0 && (
                <>
                  <h3 className="mt-5 text-[16px] font-bold">{T('এখনই যা করতে পারেন (ওষুধ ছাড়া)', 'What you can do now, without chemicals')}</h3>
                  <ul className="mt-2 space-y-2 text-[14.5px] leading-6">{rep.actions_now.map((x, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={17} className="mt-1 shrink-0 text-primary-600" />{x}</li>)}</ul>
                </>
              )}
              {rep.treatment_note && <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-[14px] leading-6 text-amber-950"><FlaskConical size={17} className="mt-1 shrink-0" /><div><b>{T('ওষুধ লাগলে', 'If a chemical is needed')}: </b>{rep.treatment_note}</div></div>}
              {rep.call_officer_if && <p className="mt-3 flex gap-2 text-[14px] leading-6 text-ink/80"><PhoneCall size={16} className="mt-1 shrink-0 text-primary-600" />{rep.call_officer_if}</p>}
              <Button disabled={!!sent} onClick={send} className="mt-5 w-full py-3"><Send size={16} />{sent ? T('কৃষি কর্মকর্তার কাছে পাঠানো হয়েছে', 'Sent to your officer') : T('ছবি আর এই ফলাফল কর্মকর্তাকে পাঠান', 'Send photo and result to my officer')}</Button>
              {sent && <div className="mt-2 text-center"><Badge tone={sent.status === 'open' ? 'amber' : 'green'}>{sent.status === 'open' ? T('উত্তরের অপেক্ষায়', 'Waiting for a reply') : T('উত্তর এসেছে, সাহায্য পাতায় দেখুন', 'Answered: see the Help page')}</Badge></div>}
              {st.sources?.length > 0 && (
                <div className="mt-5 border-t border-border pt-3">
                  <div className="text-[13px] font-semibold text-muted">{T('যে সূত্র দেখে মিলিয়েছে', 'Sources it checked')}</div>
                  <ul className="mt-1 space-y-0.5 text-[13px]">{st.sources.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-700 hover:underline"><ExternalLink size={12} />{x.title}</a></li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-[12px] text-muted">{T(`উত্তর দিয়েছে ${st.model ?? 'Claude'} (Anthropic), ${clockText(st.at, 'bn')}। AI ভুল করতে পারে।`, `Answered by ${st.model ?? 'Claude'} (Anthropic) at ${clockText(st.at, 'en')}. AI can be wrong.`)}</p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
