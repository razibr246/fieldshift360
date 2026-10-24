// Crop doctor: the farmer photographs a crop and Claude (vision, api/doctor.js) gives a careful first look, weighed
// against the field's live context (crop and stage, the week's weather, the latest satellite reading, the soil) and
// checked against current DAE/BARI/BRRI guidance by a restricted web search. It is a first look, not a diagnosis:
// every result says how sure it is and can go straight to the agriculture officer with the photo.
import { useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldAlert, CheckCircle2, Send, X, Loader2, AlertTriangle, ExternalLink, Sparkles, FlaskConical, PhoneCall, RefreshCw, CloudSun, Satellite, Layers, Sprout } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, Tags, Note, Badge, Input } from '../../components/ui';
import { CROP_PROBLEMS } from '../../data/crop_problems';
import { RABI_CROPS } from '../../engine/crops';
import { requestSeason } from '../../data/demo';
import { useFieldWatch } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { num, bnDigits, fmtDate } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { clockText } from '../../engine/forecast';

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
  const [dragOver, setDragOver] = useState(false);
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

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr({ bn: 'শুধু ছবি দেওয়া যাবে (jpg, png)।', en: 'Please choose a photo (jpg or png).' }); return; }
    if (f.size > 25 * 1024 * 1024) { setErr({ bn: 'ছবিটা খুব বড় (২৫ মেগাবাইটের বেশি)।', en: 'That photo is too large (over 25 MB).' }); return; }
    setErr(null);
    const reader = new FileReader();
    reader.onload = async () => { try { setImg(await shrink(reader.result)); } catch { setImg(reader.result); } setSt({ phase: 'idle' }); setSentId(null); };
    reader.readAsDataURL(f);
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    handleFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
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
      <PageHeader
        eyebrow={T('ফসলের ডাক্তার', 'Crop doctor')}
        title={T('ফসলের ছবি দেখে প্রথম ধারণা', 'A first look from a crop photo')}
        subtitle={T('পাতা বা গাছের একটা পরিষ্কার ছবি তুলুন। AI ছবিটা আপনার জমির এই সপ্তাহের আবহাওয়া, উপগ্রহের ছবি আর মাটির সঙ্গে মিলিয়ে বলে কী হতে পারে, আর কৃষি সম্প্রসারণ অধিদপ্তর, বারি ও ব্রির সুপারিশ অনুযায়ী এখন কী করবেন। এটা প্রথম ধারণা, চূড়ান্ত রোগ নির্ণয় নয় — সন্দেহ থাকলে ছবিটা কৃষি কর্মকর্তাকে পাঠান।', 'Take a clear photo of a leaf or plant. The AI reads it alongside your field’s weather this week, the satellite picture and the soil, then tells you what it could be and what DAE, BARI and BRRI advise doing now. It is a first look, not a final diagnosis — if in doubt, send the photo to your officer.')}
        tags={['AI', 'REAL']}
      />

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card data-tour="doc-photo" className="spotlight-card lift p-5 sm:p-6">
          <div className="mb-4">
            <span className="block text-[13.5px] font-semibold text-muted">{T('কোন ফসলের ছবি?', 'Which crop is this?')}</span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[...(amanNow ? [AMAN] : []), ...Object.values(RABI_CROPS)].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCrop(c.id)}
                  aria-pressed={crop === c.id}
                  className={`rounded-full border px-3.5 py-1 text-[13.5px] font-semibold transition-all duration-200 active:scale-95 ${crop === c.id ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-border bg-white text-ink hover:border-primary-200 hover:bg-canvas'}`}
                >
                  {L(c.name)}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`viewfinder-frame relative grid min-h-76 place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${dragOver ? 'border-primary-500 bg-primary-100/70 scale-[1.01]' : 'border-primary-300/80 bg-primary-50/50 hover:bg-primary-50/80'}`}
          >
            <span className="viewfinder-corner viewfinder-corner-tl" />
            <span className="viewfinder-corner viewfinder-corner-tr" />
            <span className="viewfinder-corner viewfinder-corner-bl" />
            <span className="viewfinder-corner viewfinder-corner-br" />

            <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

            {img ? (
              <div className="w-full">
                <div className="relative mx-auto max-h-76 w-max overflow-hidden rounded-xl shadow-md">
                  <img src={img} alt={T('আপনার তোলা ফসলের ছবি', 'Your crop photo')} className="mx-auto max-h-76 rounded-xl object-contain" />
                  {st.phase === 'checking' && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      <div className="scan-laser-beam" />
                      <div className="absolute inset-0 bg-violet-600/15 backdrop-contrast-[1.1] animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  {st.phase !== 'checking' && st.phase !== 'done' && (
                    <Button onClick={check} className="btn-gloss shadow-sm"><ScanLine size={17} />{T('ডাক্তারকে দেখান', 'Ask the doctor')}</Button>
                  )}
                  {st.phase === 'checking' && (
                    <Button disabled loading={true}>{T('খুঁটিয়ে দেখছে…', 'Looking closely…')}</Button>
                  )}
                  <Button variant="secondary" onClick={reset}><X size={16} />{T('অন্য ছবি', 'Another photo')}</Button>
                </div>
              </div>
            ) : (
              <div className="py-3">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-primary-700 shadow-sm transition-transform duration-300 hover:scale-110">
                  <Camera size={30} />
                </div>
                <h2 className="mt-4 text-[21px] font-bold text-ink">
                  {T(`${bnOf(cropObj.name.bn)} পরিষ্কার একটা ছবি দিন`, `Add a clear photo of the ${cropObj.name.en.toLowerCase()}`)}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-[14.5px] leading-6 text-muted">
                  {T('দিনের আলোয়, কাছ থেকে, দাগ বা পোকা যেন স্পষ্ট দেখা যায়। সম্ভব হলে পাতার নিচের দিকেরও একটা।', 'In daylight, up close, with spots or insects clearly visible; the underside of a leaf too if you can.')}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Button onClick={() => camRef.current?.click()} className="btn-gloss"><Camera size={17} />{T('ছবি তুলুন', 'Take a photo')}</Button>
                  <Button variant="secondary" onClick={() => fileRef.current?.click()}><ImagePlus size={17} />{T('গ্যালারি থেকে দিন', 'Choose from gallery')}</Button>
                </div>
              </div>
            )}
          </div>

          <label className="mt-4 block" htmlFor="cd-note">
            <span className="text-[14px] font-semibold text-ink">
              {T('কী লক্ষণ দেখছেন?', 'What symptoms are you seeing?')} <span className="font-normal text-muted">{T('(না লিখলেও চলবে)', '(optional)')}</span>
            </span>
            <Input
              id="cd-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5"
              placeholder={T('যেমন: তিন দিন ধরে নিচের পাতা হলুদ হচ্ছে', 'e.g. lower leaves yellowing for three days')}
            />
          </label>

          {err && <Note tone="warn" className="mt-3">{L(err)}</Note>}

          <div className="mt-5 rounded-2xl border border-border/80 bg-canvas/70 p-4 text-[13px] leading-5 text-ink/80">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-ink">
              <Sparkles size={15} className="text-primary-700" />
              <span>{T('ছবির সঙ্গে ডাক্তার যা যাচাই করবে', 'What the doctor also checks')}</span>
            </div>
            <div data-tour="doc-context" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-white/70 p-2.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted"><Sprout size={13} className="text-primary-700" />{T('বয়স ও স্তর', 'Stage')}</span>
                <span className="mt-1 block truncate font-bold text-ink">{crop !== chosen.crop.id ? '—' : daysAfter >= 0 ? T(`${bnDigits(daysAfter)} দিন`, `Day ${daysAfter}`) : T('লাগানো হয়নি', 'Not sown yet')}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-white/70 p-2.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted"><CloudSun size={13} className="text-amber-600" />{T('৭ দিনের বৃষ্টি', 'Rain, 7 days')}</span>
                <span className="mt-1 block truncate font-bold text-ink">{w ? T(`${num(Math.round(w.rain7), 'bn')} মিমি`, `${Math.round(w.rain7)} mm`) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-white/70 p-2.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted"><Satellite size={13} className="text-sky-700" />{T('উপগ্রহে সবুজ', 'Satellite green')}</span>
                <span className="mt-1 block truncate font-bold text-ink">{sat ? num(sat.last.ndvi, lang, { dp: 2 }) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
              <div className="rounded-xl border border-border/60 bg-white/70 p-2.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted"><Layers size={13} className="text-clay-500" />{T('মাটি pH', 'Soil pH')}</span>
                <span className="mt-1 block truncate font-bold text-ink">{context.soil ? num(soil.ph, lang, { dp: 1 }) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-muted">
              {T('ছবি ছোট করে পাঠানো হয়, ছবির ভেতরের জায়গার তথ্য (জিপিএস) মুছে যায়। AI-কে আপনার নাম পাঠানো হয় না।', 'The photo is made smaller before it is sent, which also removes its location (GPS) data. Your name is not sent to the AI.')}
            </p>
          </div>
        </Card>

        <Card data-tour="doc-result" className="spotlight-card lift p-5 sm:p-6">
          <div key={st.phase} className="swap-in">
            {st.phase === 'idle' && (
              <div className="grid h-full min-h-76 place-items-center text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-50 text-violet-700 shadow-sm transition-transform duration-300 hover:scale-105">
                    <ScanLine size={30} />
                  </div>
                  <h3 className="mt-3.5 text-[18px] font-bold text-ink">{T('ফলাফল এখানে আসবে', 'The result will show here')}</h3>
                  <p className="mx-auto mt-1.5 max-w-sm text-[14px] leading-6 text-muted">
                    {T('সম্ভাব্য কারণসমূহ, লক্ষণের মিলের শতকরা হার, কতটা জরুরি, আর এখনই ওষুধ ছাড়া কী করতে পারেন।', 'What it could be and how sure, how urgent it is, and what you can do now without chemicals.')}
                  </p>
                </div>
              </div>
            )}

            {st.phase === 'checking' && (
              <div className="grid h-full min-h-76 place-items-center text-center">
                <div>
                  <Loader2 size={36} className="mx-auto animate-spin text-violet-600" />
                  <h3 className="mt-3.5 text-[18px] font-bold text-ink">{T('ডাক্তার ছবিটা খুঁটিয়ে দেখছে…', 'The doctor is looking closely…')}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-[14px] leading-6 text-muted">
                    {T('দাগের ধরন, রং, পোকা যাচাই করছে; আবহাওয়া আর উপগ্রহের সঙ্গে মেলাচ্ছে; দরকার হলে সরকারি কৃষি সুপারিশ যাচাই করছে।', 'Looking at the spots, colours and insects, checking them against the weather and the satellite, and against official guidance where needed.')}
                  </p>
                </div>
              </div>
            )}

            {(st.phase === 'off' || st.phase === 'error') && (
              <div className="space-y-4">
                <Note tone="gold">
                  {st.phase === 'off'
                    ? T('AI ডাক্তার এই মুহূর্তে চালু নেই। ছবিটা সরাসরি কৃষি কর্মকর্তাকে পাঠাতে পারেন, তিনি দেখে উত্তর দেবেন।', 'The AI doctor is not available right now. You can send the photo straight to your officer, who will reply.')
                    : st.status === 429 ? T('ডাক্তার এখন ব্যস্ত, এক মিনিট পরে আবার চেষ্টা করুন।', 'The doctor is busy; try again in a minute.')
                      : st.status === 422 ? T('এই ছবির উত্তর দেওয়া গেল না। কৃষি কর্মকর্তাকে পাঠান।', 'No answer could be given for this photo. Send it to your officer.')
                        : st.msg === 'offline' ? T('ইন্টারনেট পাওয়া যাচ্ছে না। সংযোগ দেখে আবার চেষ্টা করুন।', 'No internet connection. Check it and try again.')
                          : T('ডাক্তারের কাছ থেকে উত্তর আসেনি। আবার চেষ্টা করুন, বা কর্মকর্তাকে পাঠান।', 'No answer came back. Try again, or send it to your officer.')}
                </Note>
                <div className="flex flex-wrap gap-2.5">
                  {st.phase === 'error' && (
                    <Button variant="secondary" onClick={check}><RefreshCw size={16} />{T('আবার চেষ্টা', 'Try again')}</Button>
                  )}
                  <Button disabled={!!sent || !img} onClick={send} className="btn-gloss"><Send size={16} />{sent ? T('পাঠানো হয়েছে', 'Sent') : T('কৃষি কর্মকর্তাকে পাঠান', 'Send to my officer')}</Button>
                </div>
              </div>
            )}

            {rep && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-700">
                      <Sparkles size={14} />{T('ডাক্তারের প্রথম ধারণা', 'The doctor’s first look')}
                    </p>
                    <h2 className="mt-1 text-[23px] font-bold leading-tight text-ink">
                      {!rep.is_crop_photo
                        ? T('ফসলের ছবি মনে হচ্ছে না', 'This does not look like a crop photo')
                        : top ? (lang === 'bn' ? top.name_bn : top.name_en) : T('স্পষ্ট কিছু পাওয়া যায়নি', 'Nothing clear found')}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted">{T('ছবিতে দেখা যাচ্ছে: ', 'Seen in the photo: ')}<b>{rep.crop_seen}</b></p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Tags list={['AI']} />
                    <Badge tone={URGENCY[rep.urgency].tone} dot={rep.urgency === 'high'}>
                      {rep.urgency === 'high' && <AlertTriangle size={12} />}
                      {L(URGENCY[rep.urgency])}
                    </Badge>
                  </div>
                </div>

                {rep.image_quality !== 'good' && (
                  <Note tone="gold" className="mt-4">
                    <b>{rep.image_quality === 'unusable' ? T('ছবি থেকে বোঝা যাচ্ছে না। ', 'The photo cannot be read. ') : T('ছবি আরও পরিষ্কার হলে ভালো হতো। ', 'A clearer photo would help. ')}</b>
                    {rep.retake_tip}
                  </Note>
                )}

                <p className="mt-3.5 text-[15px] leading-7 text-ink/90">{rep.summary}</p>

                {rep.findings.length > 0 && (
                  <div className="mt-5 space-y-3.5">
                    <h3 className="text-[14px] font-bold text-muted">{T('কী হতে পারে, আর কতটা নিশ্চিত', 'What it could be, and how sure')}</h3>
                    {rep.findings.map((f, i) => {
                      const pct = Math.round(f.likelihood * 100);
                      const barGrad = pct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-primary-600' : pct >= 50 ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-amber-400 to-orange-500';
                      return (
                        <div key={`${f.key}-${i}`} className="rounded-xl border border-border/70 bg-canvas/40 p-3">
                          <div className="flex justify-between gap-3 text-[14.5px]">
                            <span className={i === 0 ? 'font-bold text-ink' : 'font-medium text-ink/80'}>{lang === 'bn' ? f.name_bn : f.name_en}</span>
                            <b className="tabular text-primary-950 font-bold">{num(pct, lang)}%</b>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[.08]">
                            <div className={`h-full rounded-full transition-all duration-700 ease-out ${barGrad}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1.5 text-[13px] leading-5 text-muted">{f.evidence}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {low ? (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/90 p-4">
                    <div className="flex items-center gap-2 font-bold text-amber-900"><ShieldAlert size={18} />{T('নিশ্চিত হওয়া যাচ্ছে না', 'Not fully certain')}</div>
                    <p className="mt-1.5 text-[14px] leading-6 text-amber-900/90">{T('সম্ভাবনা ৭০ শতাংশের কম, তাই এটাকে নিশ্চিত ধরবেন না। ছবিটা কৃষি কর্মকর্তাকে পাঠান।', 'The top match is under 70%, so do not treat it as certain. Send the photo to your officer.')}</p>
                  </div>
                ) : (
                  <Note tone="ok" className="mt-5">{T('লক্ষণগুলো বেশ স্পষ্ট, তবুও কোনো ওষুধের আগে কৃষি কর্মকর্তার পরামর্শ নিন।', 'The signs are fairly clear, but ask your officer before using any chemical.')}</Note>
                )}

                {rep.actions_now.length > 0 && (
                  <div className="mt-5">
                    <h3 className="text-[15.5px] font-bold text-ink">{T('এখনই যা করতে পারেন (ওষুধ ছাড়া)', 'What you can do right now (without chemicals)')}</h3>
                    <ul className="mt-2.5 space-y-2 text-[14px] leading-6">
                      {rep.actions_now.map((x, i) => (
                        <li key={i} className="flex gap-2.5 rounded-lg bg-primary-50/50 p-2 text-ink/90">
                          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary-700" />
                          <span>{x}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rep.treatment_note && (
                  <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-[14px] leading-6 text-amber-950">
                    <FlaskConical size={18} className="mt-0.5 shrink-0 text-amber-700" />
                    <div><b>{T('ওষুধ লাগলে', 'If a chemical is needed')}: </b>{rep.treatment_note}</div>
                  </div>
                )}

                {rep.call_officer_if && (
                  <p className="mt-3.5 flex items-center gap-2 text-[14px] leading-6 text-ink/80">
                    <PhoneCall size={16} className="shrink-0 text-primary-600" />
                    <span>{rep.call_officer_if}</span>
                  </p>
                )}

                <div className="mt-6 border-t border-border pt-4">
                  <Button disabled={!!sent} onClick={send} className="w-full py-3 text-[16px]">
                    <Send size={17} />
                    {sent ? T('কৃষি কর্মকর্তার কাছে পাঠানো হয়েছে', 'Sent to your officer') : T('ছবি আর এই ফলাফল কর্মকর্তাকে পাঠান', 'Send photo and result to my officer')}
                  </Button>
                  {sent && (
                    <div className="mt-2.5 text-center">
                      <Badge tone={sent.status === 'open' ? 'amber' : 'green'} dot={true}>
                        {sent.status === 'open' ? T('উত্তরের অপেক্ষায়', 'Waiting for officer reply') : T('উত্তর এসেছে, সাহায্য পাতায় দেখুন', 'Answered: see Help page')}
                      </Badge>
                    </div>
                  )}
                </div>

                {st.sources?.length > 0 && (
                  <div className="mt-5 border-t border-border pt-3">
                    <div className="text-[12.5px] font-semibold text-muted">{T('যে সূত্র দেখে মিলিয়েছে', 'Sources it checked')}</div>
                    <ul className="mt-1.5 space-y-1 text-[13px]">
                      {st.sources.map((x) => (
                        <li key={x.url}>
                          <a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary-700 hover:underline">
                            <ExternalLink size={12} />{x.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-[11.5px] text-muted">
                  {T(`AI ডাক্তারের উত্তর, ${clockText(st.at, 'bn')}। AI ভুল করতে পারে, তাই জমিতে গিয়ে মিলিয়ে দেখুন।`, `The AI doctor’s answer, ${clockText(st.at, 'en')}. AI can be wrong, so check it in the field.`)}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
