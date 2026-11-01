// Crop doctor: the farmer photographs a crop and Gemini (vision, api/doctor.js; Claude if only that key is set) gives a careful first look, weighed
// against the field's live context (crop and stage, the week's weather, the latest satellite reading, the soil) and
// checked against current DAE/BARI/BRRI guidance by a restricted web search. It is a first look, not a diagnosis:
// every result says how sure it is and can go straight to the agriculture officer with the photo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, ScanLine, ShieldAlert, CheckCircle2, Send, X, Loader2, AlertTriangle, ExternalLink, Sparkles, FlaskConical, PhoneCall, RefreshCw, CloudSun, Satellite, Layers, Sprout } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Button, Tags, Note, Badge, Input } from '../../components/ui';
import { CROP_PROBLEMS } from '../../data/crop_problems';
import { CROP_SAMPLES } from '../../data/crop_samples';
import { localCropAssessment } from '../../engine/cropDoctor';
import { extractLeafMetrics, classifyLeafPixels } from '../../engine/offlineVision';
import { RABI_CROPS } from '../../engine/crops';
import { requestSeason } from '../../data/demo';
import { useFieldWatch } from '../../components/fields/useFieldWatch';
import { readField } from '../../engine/fieldwatch';
import { num, bnDigits, fmtDate } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { clockText } from '../../engine/forecast';

const THRESHOLD = 0.7;
const MAX_SIDE = 1568; // cap upload size before the server-side image review
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
  const [selectedSample, setSelectedSample] = useState(null);
  const [cloudConsent, setCloudConsent] = useState(false);
  const [note, setNote] = useState('');
  const [st, setSt] = useState({ phase: 'idle' }); // idle | checking | done | off | error
  const [err, setErr] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const camRef = useRef();
  const workRef = useRef(0);
  const timerRef = useRef(null);
  const requestRef = useRef(null);
  const langRef = useRef(lang);
  const [sentId, setSentId] = useState(null);
  const sent = sentId ? s.requests.find((r) => r.id === sentId) : null;
  const cropObj = crop === 'aman' ? AMAN : RABI_CROPS[crop] ?? chosen.crop;
  const fw = useFieldWatch(activeParcel); // the same latest pass the Today page shows
  const sat = useMemo(() => (fw.watch ? readField(fw.watch, { today }) : null), [fw.watch, today]);
  const w = liveWeather ? s.live : null;
  const context = {
    place: `${farmer.village}, ${union.meta.en} union, ${upazila.name.en} upazila, Bangladesh`,
    daysAfter: crop === chosen.crop.id ? daysAfter : null, stage: crop === chosen.crop.id ? stage.en : null,
    weather: w ? { rain7: w.rain7 != null ? Math.round(w.rain7) : null, rainNext3: w.rainNext3 != null ? Math.round(w.rainNext3) : null, tmax: w.tmax ?? null, tmin: w.days?.[w.today]?.tmin ?? null } : null,
    sat: sat ? { d: sat.last.d, ndvi: sat.last.ndvi, ndmi: sat.last.ndmi, finding: sat.findings.find((f) => f.tone !== 'ok')?.en ?? null } : null,
    soil: soil?.ph != null ? { ph: soil.ph, om_pct: soil.om_pct, texture: soil.texture, drainage: soil.drainage } : null,
    note: note.trim() || null,
  };

  useEffect(() => () => {
    workRef.current += 1;
    clearTimeout(timerRef.current);
    requestRef.current?.abort();
  }, []);

  const invalidateWork = () => {
    workRef.current += 1;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    requestRef.current?.abort();
    requestRef.current = null;
    return workRef.current;
  };

  const clearResult = () => {
    invalidateWork();
    setSt({ phase: 'idle' });
    setSentId(null);
    setErr(null);
  };

  useEffect(() => {
    if (langRef.current === lang) return;
    langRef.current = lang;
    clearResult();
    const sample = CROP_SAMPLES.find((item) => item.id === selectedSample);
    if (sample && [sample.note.bn, sample.note.en].includes(note.trim())) setNote(sample.note[lang] || sample.note.bn);
  }, [lang]);

  const chooseCrop = (id) => {
    if (id === crop) return;
    clearResult();
    setCloudConsent(false);
    setCrop(id);
    if (selectedSample) {
      setSelectedSample(null);
      setImg(null);
      setNote('');
    }
  };

  const changeNote = (value) => {
    if (value === note) return;
    clearResult();
    setCloudConsent(false);
    setNote(value);
  };

  const pickSample = async (smp) => {
    const id = invalidateWork();
    setSelectedSample(smp.id);
    setCloudConsent(false);
    setCrop(smp.crop);
    setImg(null);
    setNote(smp.note[lang] || smp.note.bn);
    setSt({ phase: 'idle' });
    setSentId(null);
    setErr(null);
    try {
      const image = await shrink(smp.image);
      if (id === workRef.current) setImg(image);
    } catch {
      if (id === workRef.current) setErr({ bn: 'নমুনা ছবিটি খোলা যায়নি। আবার চেষ্টা করুন।', en: 'Could not prepare the sample image. Please try again.' });
    }
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErr({ bn: 'শুধু ছবি দেওয়া যাবে (jpg, png)।', en: 'Please choose a photo (jpg or png).' }); return; }
    if (f.size > 25 * 1024 * 1024) { setErr({ bn: 'ছবিটা খুব বড় (২৫ মেগাবাইটের বেশি)।', en: 'That photo is too large (over 25 MB).' }); return; }
    const id = invalidateWork();
    setErr(null);
    setSelectedSample(null);
    setCloudConsent(false);
    const reader = new FileReader();
    setImg(null);
    setSt({ phase: 'idle' });
    setSentId(null);
    reader.onload = async () => {
      if (id !== workRef.current) return;
      try {
        const image = await shrink(reader.result);
        if (id === workRef.current) setImg(image);
      } catch {
        if (id === workRef.current) setErr({ bn: 'ছবিটি খোলা যাচ্ছে না। JPG বা PNG ছবি দিয়ে আবার চেষ্টা করুন।', en: 'Could not read that image. Please try a JPG or PNG photo.' });
      }
    };
    reader.onerror = () => { if (id === workRef.current) setErr({ bn: 'ছবিটি পড়া যায়নি। আবার চেষ্টা করুন।', en: 'Could not read the photo. Please try again.' }); };
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

  const extractCanvasPixels = async (dataUrl) => {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const w = 128, h = 128;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(image, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        resolve({ data: imgData.data, width: w, height: h });
      };
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  };

  const runOfflineAssessment = async (ownerId = null) => {
    const id = ownerId ?? invalidateWork();
    clearTimeout(timerRef.current);
    setSt({ phase: 'checking' });

    let visionReport = null;
    if (img) {
      try {
        const pixels = await extractCanvasPixels(img);
        if (pixels) {
          const metrics = extractLeafMetrics(pixels);
          visionReport = classifyLeafPixels({ metrics, lang });
        }
      } catch {
        visionReport = null;
      }
    }

    timerRef.current = setTimeout(() => {
      if (id !== workRef.current) return;
      timerRef.current = null;
      const sample = CROP_SAMPLES.find((item) => item.id === selectedSample);
      const fallback = visionReport ?? localCropAssessment({
        crop,
        symptomKey: sample && [sample.note.bn, sample.note.en].includes(note.trim()) ? sample.symptomKey : null,
        context,
        lang,
      });
      setSt({
        phase: 'done',
        report: fallback,
        model: visionReport ? 'Offline RGB colour heuristic' : 'Offline symptom reference',
        at: Date.now(),
        sources: fallback.sources || [],
        offlineFallback: true,
      });
    }, 400);
  };

  const check = async () => {
    if (!img || !cloudConsent || st.phase === 'checking') return;
    const id = invalidateWork();
    const controller = new AbortController();
    requestRef.current = controller;
    setSt({ phase: 'checking' }); setErr(null);
    try {
      const b64 = img?.includes(',') ? img.split(',')[1] : img;
      const r = await fetch(`${import.meta.env.BASE_URL || './'}api/doctor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, crop, lang, context, known: (CROP_PROBLEMS[crop] ?? []).map((p) => ({ key: p.key, en: p.en })) }),
        signal: controller.signal,
      });
      const type = r.headers.get('content-type') || '';
      const j = type.includes('json') ? await r.json() : null;
      if (id !== workRef.current) return;
      requestRef.current = null;
      if (r.status === 503 || (!j && r.status === 404)) {
        runOfflineAssessment(id);
        return;
      }
      if (!r.ok || !j?.report) {
        setSt({ phase: 'error', status: r.status, msg: j?.error });
        return;
      }
      setSt({ phase: 'done', ...j });
    } catch {
      if (id !== workRef.current) return;
      requestRef.current = null;
      runOfflineAssessment(id);
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
      crop, symptom: top && top.key !== 'other' && top.key !== 'healthy' ? top.key : 'question', type: 'crop_doctor', text: { bn: text, en: text },
      ai: !st.offlineFallback && rep?.findings?.length ? rep.findings.map((f) => ({ k: f.key, p: f.likelihood, bn: f.name_bn, en: f.name_en })) : null,
      doctor: rep && !st.offlineFallback ? { report: rep, model: st.model, at: st.at, sources: st.sources } : null,
      image: img, created: today, status: 'open', priority: rep?.urgency === 'high' ? 'High' : rep?.urgency === 'low' ? 'Low' : 'Medium', mine: true } });
    setSentId(id);
    toast('ছবি কৃষি কর্মকর্তার কাছে পাঠানো হয়েছে', 'Photo sent to your officer');
  };
  const reset = () => { invalidateWork(); setImg(null); setSelectedSample(null); setCloudConsent(false); setSt({ phase: 'idle' }); setSentId(null); setNote(''); setErr(null); };

  return (
    <div>
      <PageHeader
        eyebrow={T('ফসলের ডাক্তার', 'Crop doctor')}
        title={T('ফসলের ছবি দেখে প্রথম ধারণা', 'A first look from a crop photo')}
        subtitle={T('পাতা বা গাছের পরিষ্কার ছবি দিন। ক্লাউড AI চালু থাকলে লক্ষণগুলো দেখে; না থাকলে অফলাইন রঙ-পরীক্ষা শুধু পিক্সেলের রং মাপে, রোগ শনাক্ত করে না। ফল প্রাথমিক ধারণা—নিশ্চিত হতে কৃষি কর্মকর্তাকে দেখান।', 'Add a clear photo of a leaf or plant. If cloud AI is configured, it reviews the visible symptoms; otherwise the offline colour check only measures pixel colours and cannot identify a disease. Treat any result as a first look and ask your agriculture officer to confirm.')}
        tags={['AI', 'REAL']}
      />

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card data-tour="doc-photo" className="spotlight-card lift p-5 sm:p-6">
          <div className="mb-4">
            <span className="block text-[13.5px] font-semibold text-muted">{T('কোন ফসলের ছবি?', 'Which crop is this?')}</span>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {[...(amanNow ? [AMAN] : []), ...Object.values(RABI_CROPS)].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => chooseCrop(c.id)}
                  aria-pressed={crop === c.id}
                  className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-2 text-[14px] font-semibold transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                    crop === c.id
                      ? 'border-primary-600 bg-primary-600 text-white shadow-sm ring-2 ring-primary-600/30'
                      : 'border-border bg-white text-ink hover:border-primary-300 hover:bg-canvas'
                  }`}
                >
                  {crop === c.id && <span className="h-2 w-2 rounded-full bg-white shadow-xs" />}
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
                {st.phase !== 'done' && (
                  <label className="mx-auto mt-3 flex min-h-11 max-w-xl cursor-pointer items-start gap-2 rounded-xl border border-border bg-white/80 p-3 text-left text-[12.5px] leading-5 text-ink/80">
                    <input
                      type="checkbox"
                      checked={cloudConsent}
                      onChange={(e) => setCloudConsent(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-primary-700"
                    />
                    <span>{T('অনলাইন AI যাচাই বেছে নিলে ছবি, গ্রাম/ইউনিয়ন/উপজেলা, ফসলের স্তর, আবহাওয়া, উপগ্রহ ও মাটির তথ্য এবং আমার লেখা কনফিগার করা ক্লাউড AI সেবায় পাঠাতে সম্মতি দিচ্ছি। ছবির GPS মুছে যায়; আমার নাম পাঠানো হয় না।', 'I agree that online AI review may send the photo, village/union/upazila, crop stage, weather, satellite and soil details, and my note to the configured cloud AI service. Photo GPS is removed; my name is not included.')}</span>
                  </label>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  {st.phase !== 'checking' && st.phase !== 'done' && (
                    <>
                      <Button disabled={!cloudConsent} onClick={check} className="btn-gloss shadow-sm"><ScanLine size={17} />{T('ক্লাউড AI-তে দেখান', 'Ask cloud AI')}</Button>
                      <Button variant="secondary" onClick={runOfflineAssessment}><Sparkles size={16} />{T('অফলাইনে দেখুন', 'Check offline')}</Button>
                    </>
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

          <div className="mt-4 rounded-2xl border border-primary-200/80 bg-primary-50/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-primary-950 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary-700" />
                {T('নমুনা ছবি দিয়ে ফর্মটি দেখে নিন:', 'Try the form with a sample illustration:')}
              </span>
              <span className="text-[11.5px] text-muted">{T('এক ক্লিকে যাচাই', 'One-tap check')}</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CROP_SAMPLES.map((smp) => {
                const active = selectedSample === smp.id;
                return (
                  <button
                    key={smp.id}
                    type="button"
                    onClick={() => pickSample(smp)}
                    className={`group relative flex min-h-[44px] flex-col items-start rounded-xl border p-2 text-left transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none ${
                      active
                        ? 'border-primary-600 bg-white shadow-sm ring-2 ring-primary-500/30'
                        : 'border-border/80 bg-white/70 hover:border-primary-300 hover:bg-white'
                    }`}
                  >
                    <div className="relative h-14 w-full overflow-hidden rounded-lg bg-black/5">
                      <img src={smp.image} alt={L(smp.name)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {active && (
                        <span className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-primary-600 text-white shadow-xs">
                          <CheckCircle2 size={12} />
                        </span>
                      )}
                    </div>
                    <span className="mt-1.5 line-clamp-1 text-[12.5px] font-bold text-ink">{L(smp.name)}</span>
                    <span className="line-clamp-1 text-[11px] text-muted">{L(smp.desc)}</span>
                    <span className="mt-0.5 text-[10.5px] font-medium text-amber-800">{T('নমুনা আঁকা ছবি', 'Illustration, not a field photo')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-4 block" htmlFor="cd-note">
            <span className="text-[14px] font-semibold text-ink">
              {T('কী লক্ষণ দেখছেন?', 'What symptoms are you seeing?')} <span className="font-normal text-muted">{T('(না লিখলেও চলবে)', '(optional)')}</span>
            </span>
            <Input
              id="cd-note"
              value={note}
              onChange={(e) => changeNote(e.target.value)}
              className="mt-1.5"
              placeholder={T('যেমন: তিন দিন ধরে নিচের পাতা হলুদ হচ্ছে', 'e.g. lower leaves yellowing for three days')}
            />
          </label>

          {err && <Note tone="warn" className="mt-3">{L(err)}</Note>}

          <div className="mt-5 rounded-2xl border border-border/80 bg-canvas/70 p-4 text-[13px] leading-5 text-ink/80 shadow-2xs">
            <div className="mb-2.5 flex items-center gap-1.5 font-bold text-ink">
              <Sparkles size={15} className="text-primary-700" />
              <span>{T('ছবির সঙ্গে ডাক্তার যা যাচাই করবে', 'What the doctor also checks')}</span>
            </div>
            <div data-tour="doc-context" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="lift rounded-xl border border-border/70 bg-white/85 p-2.5 shadow-2xs transition-all hover:border-primary-300">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><Sprout size={13} className="text-primary-700" />{T('বয়স ও স্তর', 'Stage')}</span>
                <span className="mt-1 block truncate font-display font-bold tabular text-ink">{crop !== chosen.crop.id ? '—' : daysAfter >= 0 ? T(`${bnDigits(daysAfter)} দিন`, `Day ${daysAfter}`) : T('লাগানো হয়নি', 'Not sown yet')}</span>
              </div>
              <div className="lift rounded-xl border border-border/70 bg-white/85 p-2.5 shadow-2xs transition-all hover:border-amber-300">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><CloudSun size={13} className="text-amber-600" />{T('৭ দিনের বৃষ্টি', 'Rain, 7 days')}</span>
                <span className="mt-1 block truncate font-display font-bold tabular text-ink">{w && w.rain7 != null ? T(`${num(Math.round(w.rain7), 'bn')} মিমি`, `${Math.round(w.rain7)} mm`) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
              <div className="lift rounded-xl border border-border/70 bg-white/85 p-2.5 shadow-2xs transition-all hover:border-sky-300">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><Satellite size={13} className="text-sky-700" />{T('উপগ্রহে সবুজ', 'Satellite green')}</span>
                <span className="mt-1 block truncate font-display font-bold tabular text-ink">{sat ? num(sat.last.ndvi, lang, { dp: 2 }) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
              <div className="lift rounded-xl border border-border/70 bg-white/85 p-2.5 shadow-2xs transition-all hover:border-clay-300">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted"><Layers size={13} className="text-clay-500" />{T('মাটি pH', 'Soil pH')}</span>
                <span className="mt-1 block truncate font-display font-bold tabular text-ink">{context.soil ? num(soil.ph, lang, { dp: 1 }) : T('পাওয়া যায়নি', 'Not available')}</span>
              </div>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
              {T('অনলাইন AI-তে ছবির সঙ্গে এখানে দেখানো জমির তথ্য ও আপনার লেখা যেতে পারে; ছবি ছোট করে GPS মুছে পাঠানো হয়। অফলাইন পরীক্ষা এই যন্ত্রেই থাকে।', 'Online AI may receive the field details shown here and your note with the photo; the image is resized and its GPS metadata removed. The offline check stays on this device.')}
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
                    {T('দাগের ধরন, রং, পোকা যাচাই করছে; আবহাওয়া আর উপগ্রহের সঙ্গে মেলাচ্ছে; দরকার হলে সরকারি কৃষি সুপারিশ যাচাই করছে। এক-দুই মিনিট লাগতে পারে।', 'Looking at the spots, colours and insects, checking them against the weather and the satellite, and against official guidance where needed. This can take a minute or two.')}
                  </p>
                </div>
              </div>
            )}

            {(st.phase === 'off' || st.phase === 'error') && (
              <div className="space-y-4">
                <Note tone="gold">
                  {st.phase === 'off'
                    ? T('ক্লাউড AI ডাক্তার এই মুহূর্তে সংযুক্ত নয়। তবে আপনি অফলাইন প্রাক-মূল্যায়ন দেখতে পারেন বা সরাসরি কৃষি কর্মকর্তাকে পাঠাতে পারেন।', 'The cloud AI doctor is not connected right now. You can view an offline assessment or send the photo straight to your officer.')
                    : st.status === 429 ? T('অনেকবার অনুরোধ করা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।', 'The request limit was reached. Please try again later.')
                      : st.status === 422 ? T('এই ছবির উত্তর দেওয়া গেল না। কৃষি কর্মকর্তাকে পাঠান।', 'No answer could be given for this photo. Send it to your officer.')
                        : st.msg === 'offline' ? T('ইন্টারনেট পাওয়া যাচ্ছে না। সংযোগ দেখে আবার চেষ্টা করুন।', 'No internet connection. Check it and try again.')
                          : T('ডাক্তারের কাছ থেকে উত্তর আসেনি। আবার চেষ্টা করুন, বা কর্মকর্তাকে পাঠান।', 'No answer came back. Try again, or send it to your officer.')}
                </Note>
                <div className="flex flex-wrap gap-2.5">
                  <Button onClick={runOfflineAssessment} className="btn-gloss"><Sparkles size={16} />{T('অফলাইন প্রাক-মূল্যায়ন দেখুন', 'See offline assessment')}</Button>
                  {st.phase === 'error' && (
                    <Button variant="secondary" onClick={check}><RefreshCw size={16} />{T('আবার চেষ্টা', 'Try again')}</Button>
                  )}
                  <Button disabled={!!sent || !img} onClick={send} variant="secondary"><Send size={16} />{sent ? T('পাঠানো হয়েছে', 'Sent') : T('কৃষি কর্মকর্তাকে পাঠান', 'Send to my officer')}</Button>
                </div>
              </div>
            )}

            {rep && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-700">
                      <Sparkles size={14} />{T(st.offlineFallback ? 'অফলাইন লক্ষণ-তথ্য' : 'ডাক্তারের প্রথম ধারণা', st.offlineFallback ? 'Offline symptom reference' : 'The doctor’s first look')}
                    </p>
                    <h2 className="mt-1 text-[23px] font-bold leading-tight text-ink">
                      {st.offlineFallback
                        ? rep.on_device_pixel_check
                          ? T('ছবির রঙের ইঙ্গিত, রোগ নির্ণয় নয়', 'Photo colour cues, not a diagnosis')
                          : top ? T(`লেখা লক্ষণের মিল: ${top.name_bn}`, `Text symptom match: ${top.name_en}`) : T('অফলাইনে ছবি বিশ্লেষণ করা যায়নি', 'Photo not analyzed offline')
                        : !rep.is_crop_photo
                          ? T('ফসলের ছবি মনে হচ্ছে না', 'This does not look like a crop photo')
                          : top ? (lang === 'bn' ? top.name_bn : top.name_en) : T('স্পষ্ট কিছু পাওয়া যায়নি', 'Nothing clear found')}
                    </h2>
                    <p className="mt-0.5 text-[13px] text-muted">{st.offlineFallback && !rep.on_device_pixel_check
                      ? T('আপনি যে ফসল বেছেছেন: ', 'Crop selected: ')
                      : T('ছবিতে বাছা ফসল: ', 'Selected crop for this photo: ')}<b>{L(cropObj.name)}</b></p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Tags list={st.offlineFallback ? ['RULE'] : ['AI']} />
                    <Badge tone={URGENCY[rep.urgency].tone} dot={rep.urgency === 'high'}>
                      {rep.urgency === 'high' && <AlertTriangle size={12} />}
                      {L(URGENCY[rep.urgency])}
                    </Badge>
                  </div>
                </div>

                {st.offlineFallback && !rep.on_device_pixel_check && (
                  <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50/70 p-3 text-[12.5px] leading-5 text-primary-950 shadow-2xs">
                    <Sparkles size={16} className="shrink-0 text-primary-700" />
                    <span>{T('অফলাইনে ছবির ভেতর দেখা যায় না। এই ফল শুধু আপনার বাছাই করা নমুনা বা লেখা লক্ষণের সঙ্গে ফসলের সমস্যা-তালিকা মিলিয়ে দেখায়; রোগ নির্ণয় বা সম্ভাবনার শতাংশ নয়।', 'Offline mode cannot inspect image pixels. This only matches your selected sample or written symptom against a crop reference list; it is not a diagnosis or a probability score.')}</span>
                  </div>
                )}

                {rep.on_device_pixel_check && rep.vision_metrics && (
                  <div className="mt-3.5 rounded-xl border border-primary-200 bg-primary-50/70 p-3 text-[12.5px] leading-5 text-primary-950 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-primary-900">
                      <Sparkles size={15} className="text-primary-700" />
                      <span>{T('অফলাইন পিক্সেল রঙ-পরীক্ষা · রোগ নির্ণয় নয়', 'Offline pixel-colour check · not a diagnosis')}</span>
                    </div>
                    <p className="mt-1 text-primary-900/90">
                      {T(
                        `ছবির রঙের মান থেকে সবুজ সূচক (GLI) ${num(rep.vision_metrics.gli, lang, { dp: 2 })}, হলুদ-লাল অনুপাত ${num(rep.vision_metrics.chlorosis, lang, { dp: 2 })}, আর গাঢ় বাদামি পিক্সেলের ভাগ ${num(rep.vision_metrics.necroticPct, lang, { dp: 1 })}% হিসাব করা হয়েছে। আলো ও পেছনের রং ফল বদলাতে পারে।`,
                        `RGB pixel values only: green index (GLI) ${num(rep.vision_metrics.gli, lang, { dp: 2 })}, yellow-red ratio ${num(rep.vision_metrics.chlorosis, lang, { dp: 2 })}, and dark-brown pixel share ${num(rep.vision_metrics.necroticPct, lang, { dp: 1 })}%. Lighting and background can change these values.`
                      )}
                    </p>
                  </div>
                )}

                {!st.offlineFallback && rep.image_quality !== 'good' && (
                  <Note tone="gold" className="mt-4">
                    <b>{rep.image_quality === 'unusable' ? T('ছবি থেকে বোঝা যাচ্ছে না। ', 'The photo cannot be read. ') : T('ছবি আরও পরিষ্কার হলে ভালো হতো। ', 'A clearer photo would help. ')}</b>
                    {rep.retake_tip}
                  </Note>
                )}

                <p className="mt-3.5 text-[15px] leading-7 text-ink/90">{rep.summary}</p>

                {rep.findings.length > 0 && (
                  <div className="mt-5 space-y-3.5">
                    <h3 className="text-[14px] font-bold text-muted">{T(st.offlineFallback ? 'লেখা লক্ষণের সঙ্গে কোন নাম মেলে' : 'কী হতে পারে, আর কতটা নিশ্চিত', st.offlineFallback ? 'Which label matches the text' : 'What it could be, and how sure')}</h3>
                    {rep.findings.map((f, i) => {
                      const pct = f.likelihood == null ? null : Math.round(f.likelihood * 100);
                      const barGrad = pct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-primary-600' : pct >= 50 ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-amber-400 to-orange-500';
                      return (
                        <div key={`${f.key}-${i}`} className="surface-card rounded-xl border border-border/80 bg-white/80 p-3.5 shadow-2xs transition-all duration-200 hover:border-primary-300 hover:shadow-sm">
                          <div className="flex justify-between gap-3 text-[14.5px]">
                            <span className={i === 0 ? 'font-bold text-ink' : 'font-medium text-ink/80'}>{lang === 'bn' ? f.name_bn : f.name_en}</span>
                            {pct == null
                              ? <b className="text-[12px] font-semibold text-muted">{T('শুধু লেখা মেলেছে', 'Text match only')}</b>
                              : <b className="font-display tabular text-primary-950 font-bold">{num(pct, lang)}%</b>}
                          </div>
                          {pct != null && <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/[.06] shadow-inner">
                            <div className={`progress-sheen h-full rounded-full transition-all duration-700 ease-[var(--ease-spring)] ${barGrad}`} style={{ width: `${pct}%` }} />
                          </div>}
                          <p className="mt-2 text-[13px] leading-5 text-muted">{f.evidence}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {st.offlineFallback ? (
                  <Note tone="gold" className="mt-5">{rep.on_device_pixel_check
                    ? T('এটি কেবল রঙের হিসাব; রোগ বা পুষ্টির সমস্যা শনাক্ত করে না। লক্ষণ থাকলে কৃষি কর্মকর্তাকে দেখান।', 'This only measures colour. It does not identify disease or nutrient problems. Show symptomatic plants to an agriculture officer.')
                    : T('এই ফল ছবি দেখে তৈরি হয়নি। নিশ্চিত হতে ইন্টারনেট সংযোগে আবার পরীক্ষা করুন বা ছবিটি কৃষি কর্মকর্তাকে পাঠান।', 'This result did not come from image analysis. Recheck when online or send the photo to your agriculture officer.')}</Note>
                ) : low ? (
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
                  {st.offlineFallback
                    ? T(`অফলাইন ${rep.on_device_pixel_check ? 'রঙের হিসাব' : 'লক্ষণ-তথ্য'}, ${clockText(st.at, 'bn')}। এটি রোগ নির্ণয় নয়।`, `Offline ${rep.on_device_pixel_check ? 'colour check' : 'symptom reference'}, ${clockText(st.at, 'en')}. This is not a diagnosis.`)
                    : T(`AI ডাক্তারের উত্তর, ${clockText(st.at, 'bn')}। AI ভুল করতে পারে, তাই জমিতে গিয়ে মিলিয়ে দেখুন।`, `The AI doctor’s answer, ${clockText(st.at, 'en')}. AI can be wrong, so check it in the field.`)}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
