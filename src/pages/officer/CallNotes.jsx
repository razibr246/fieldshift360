import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Upload, Volume2, ShieldCheck, ShieldAlert, Trash2, Send, CheckCircle2, XCircle, RotateCcw, Save } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Badge, Button, Tags, Note, Select, Textarea, EmptyState } from '../../components/ui';
import { SYMPTOMS } from '../../data/demo';
import { cropName } from '../../engine/crops';
import { num, iso, todayDhaka, bnDigits } from '../../engine/dates';
import { speakNatural, stopSpeaking } from '../../voice/speech';
import {
  CONSENT_NOTICE, MAX_RECORD_SECONDS, MAX_AUDIO_B64, AUDIO_TYPES, makeConsent, canRecord, normalizeCallNote,
  normalizeTranscript, sealCallNote, verifyCallNote, callNoteToRequest, sha256Hex,
} from '../../engine/callnote';

// Officer call notes: ask the farmer's consent and log it, record (or load) the call, have it transcribed and noted
// by api/transcribe.js, review what the AI heard against the transcript, then seal the note and, if needed, open it as
// a request. Logic lives in engine/callnote.js; the audio is sent once for transcription and never kept.
const KIND = {
  price_heard: { bn: 'শোনা বাজারদর', en: 'Market price heard' }, input_cost: { bn: 'খরচ', en: 'Input cost' },
  sale: { bn: 'বিক্রি', en: 'Sale' }, loan: { bn: 'ঋণ', en: 'Loan' }, other: { bn: 'অন্যান্য', en: 'Other' },
};
const UNIT = { kg: ['কেজি', 'kg'], maund: ['মণ', 'maund'], quintal: ['কুইন্টাল', 'quintal'], decimal: ['শতক', 'decimal'], bigha: ['বিঘা', 'bigha'], acre: ['একর', 'acre'], litre: ['লিটার', 'litre'], bag: ['বস্তা', 'bag'], piece: ['টি', 'piece'] };
const WHO = { officer: ['কর্মকর্তা', 'Officer'], farmer: ['কৃষক', 'Farmer'], other: ['কথা', 'Speaker'] };
const RULE_TEXT = {
  CN1_UNQUOTED: ['লেখায় এই কথা পাওয়া যায়নি', 'These words are not in the transcript'],
  CN2_AMOUNT_NOT_SAID: ['এই অঙ্কটা বলা হয়নি', 'This amount was not said'],
  CN3_AREA_NOT_SAID: ['জমির মাপ বলা হয়নি', 'The land size was not said'],
};
const FAIL = {
  'transcription not configured': ['লেখায় রূপান্তর চালু নেই (GEMINI_API_KEY বা GROQ_API_KEY দরকার)।', 'Transcription is not switched on (needs GEMINI_API_KEY or GROQ_API_KEY).'],
  'transcription busy, try again in a minute': ['এআই এখন ব্যস্ত, এক মিনিট পরে আবার চেষ্টা করুন।', 'The AI is busy; try again in a minute.'],
  'audio too long': ['রেকর্ডটা বেশি লম্বা। ৫ মিনিটের মধ্যে রাখুন।', 'The recording is too long. Keep it under 5 minutes.'],
};
const recorderType = () => (typeof MediaRecorder === 'undefined' ? null : ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '');
const toBase64 = (blob) => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result).replace(/^data:[^,]*,/, '')); r.onerror = () => bad(r.error); r.readAsDataURL(blob); });
const clock = (sec, lang) => { const t = `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`; return lang === 'bn' ? bnDigits(t) : t; };

export default function CallNotes() {
  const navigate = useNavigate();
  const { s, T, L, dispatch, toast, unionsAll } = useStore();
  const lang = s.lang;
  const union = unionsAll[s.officerUnion];
  const farmers = useMemo(() => (union?.farmers ?? []).map((f) => ({ ...f, crop: union.plans.find((p) => p.plot_id === f.id)?.crop ?? null })), [union]);
  const [farmerId, setFarmerId] = useState('');
  const farmer = farmers.find((f) => f.id === farmerId) ?? null;

  const [consent, setConsent] = useState(null); // makeConsent(...) once the farmer has answered
  const [rec, setRec] = useState(null); // { recorder, stream, chunks, started }
  const [secs, setSecs] = useState(0);
  const [audio, setAudio] = useState(null); // { blob, url, mime, seconds }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { transcript, note, engine, model }
  const [keep, setKeep] = useState([]); // which items the officer keeps
  const [summary, setSummary] = useState('');
  const fileRef = useRef(null);

  // Stop the microphone, the timer and any spoken notice when leaving the page.
  const recRef = useRef(rec); recRef.current = rec;
  const urlRef = useRef(null); urlRef.current = audio?.url;
  useEffect(() => () => { recRef.current?.stream.getTracks().forEach((t) => t.stop()); if (urlRef.current) URL.revokeObjectURL(urlRef.current); stopSpeaking(); }, []);
  useEffect(() => {
    if (!rec) return undefined;
    const id = setInterval(() => {
      const n = (Date.now() - rec.started) / 1000;
      setSecs(n);
      if (n >= MAX_RECORD_SECONDS) rec.recorder.stop();
    }, 250);
    return () => clearInterval(id);
  }, [rec]);

  const reset = () => {
    rec?.stream.getTracks().forEach((t) => t.stop());
    if (audio?.url) URL.revokeObjectURL(audio.url);
    setConsent(null); setRec(null); setSecs(0); setAudio(null); setResult(null); setError(null); setKeep([]); setSummary('');
  };
  const answer = (given) => {
    stopSpeaking();
    const c = makeConsent({ given, lang });
    setConsent(c);
    if (!given) toast('কৃষক রাজি নন: কিছুই রেকর্ড হয়নি', 'The farmer said no: nothing was recorded');
  };

  const start = async () => {
    if (!canRecord(consent)) return;
    setError(null);
    const type = recorderType();
    if (type == null || !navigator.mediaDevices?.getUserMedia) { setError(T('এই ব্রাউজারে রেকর্ড করা যায় না। অডিও ফাইল দিন।', 'This browser cannot record. Load an audio file instead.')); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
      const chunks = [];
      const started = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = (recorder.mimeType || type || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks, { type: mime });
        setAudio({ blob, url: URL.createObjectURL(blob), mime, seconds: (Date.now() - started) / 1000 });
        setRec(null);
      };
      recorder.start(1000);
      setSecs(0);
      setRec({ recorder, stream, started });
    } catch {
      setError(T('মাইক্রোফোন চালু করা যায়নি। ব্রাউজারে মাইকের অনুমতি দিন।', 'Could not open the microphone. Allow microphone access in the browser.'));
    }
  };
  const loadFile = (file) => {
    if (!file || !canRecord(consent)) return;
    const mime = file.type.split(';')[0];
    if (!AUDIO_TYPES.includes(mime)) { setError(T('এই ধরনের অডিও চলে না (webm, ogg, m4a, mp3, wav দিন)।', 'This audio type is not supported (use webm, ogg, m4a, mp3 or wav).')); return; }
    if (file.size > (MAX_AUDIO_B64 * 3) / 4) { setError(L({ bn: FAIL['audio too long'][0], en: FAIL['audio too long'][1] })); return; }
    setError(null);
    const url = URL.createObjectURL(file);
    const a = new Audio(url);
    a.onloadedmetadata = () => setAudio((x) => (x?.url === url ? { ...x, seconds: Number.isFinite(a.duration) ? a.duration : 0 } : x));
    setAudio({ blob: file, url, mime, seconds: 0 });
  };

  const send = async () => {
    if (!audio || !canRecord(consent)) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audio: await toBase64(audio.blob), mime: audio.mime, lang, crop: farmer?.crop }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const m = FAIL[j.error]; setError(m ? T(m[0], m[1]) : T('লেখায় রূপান্তর হয়নি। আবার চেষ্টা করুন।', 'Transcription failed. Try again.')); return; }
      // The server checked the note already; check it again here with the same rules before anything is saved.
      const transcript = normalizeTranscript(j.transcript);
      const note = normalizeCallNote(j.note ?? {}, transcript.text);
      note.dropped = [...(j.note?.dropped ?? []), ...note.dropped];
      setResult({ transcript, note, engine: j.engine === 'groq' ? 'groq' : 'gemini', model: String(j.model ?? ''), noteFromAi: !!j.note });
      setKeep(note.items.map(() => true));
      setSummary(note.summary[lang] || note.summary[lang === 'bn' ? 'en' : 'bn'] || '');
    } catch {
      setError(T('সার্ভারে পৌঁছানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।', 'Could not reach the server. Check the connection and try again.'));
    } finally { setBusy(false); }
  };

  const save = async (asRequest) => {
    if (!result || !farmer) return;
    const note = { ...result.note, items: result.note.items.filter((_, i) => keep[i]), summary: { ...result.note.summary, [lang]: summary.trim() }, reviewedBy: 'officer' };
    const id = `${farmer.id}-${Date.now().toString(36)}`;
    const sealed = await sealCallNote({
      id, farmer: { id: farmer.id, name: L(farmer.name) }, consent,
      audio: { sha256: await sha256Hex(await audio.blob.arrayBuffer()), bytes: audio.blob.size, mime: audio.mime, seconds: audio.seconds },
      transcript: result.transcript, note, engine: result.engine, model: result.model,
    });
    dispatch({ type: 'addCallNote', note: sealed });
    if (asRequest) {
      const req = callNoteToRequest(sealed, farmer, iso(todayDhaka()));
      dispatch({ type: 'addRequest', req });
      dispatch({ type: 'linkCallNote', id: sealed.id, requestId: req.id });
      reset();
      navigate(`/officer/requests/${req.id}`);
    } else {
      toast('নোট সিল করে রাখা হয়েছে', 'Note sealed and saved');
      reset();
    }
  };

  const step = !farmer ? 1 : !consent ? 2 : !consent.given ? 2 : !result ? 3 : 4;
  return (
    <div>
      <PageHeader eyebrow={T('আজকের কাজ', 'Today’s work')} title={T('কৃষকের সাথে কথার নোট', 'Call notes')}
        subtitle={T('কৃষকের অনুমতি নিয়ে ফোন বা মাঠের কথা রেকর্ড করুন। এআই লেখে আর ফসল, সমস্যা, জমি ও টাকার অঙ্ক তুলে আনে; লেখায় যা নেই তা বাদ পড়ে। আপনি দেখে নিলে নোটটা সিল হয়, চাইলে অনুরোধ হিসেবেও খোলে।', 'Record a phone or field conversation with the farmer’s consent. The AI writes it down and picks out the crop, problem, land and every taka amount; anything not in the transcript is dropped. Once you check it the note is sealed, and can open as a request.')}
        tags={['AI', 'RULE']} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[17px] font-bold">{num(1, lang)}. {T('কোন কৃষক?', 'Which farmer?')}</h2>
            <Select className="mt-3 w-full" value={farmerId} disabled={!!consent} onChange={(e) => setFarmerId(e.target.value)}>
              <option value="">{T('কৃষক বেছে নিন', 'Choose a farmer')}</option>
              {farmers.map((f) => <option key={f.id} value={f.id}>{L(f.name)} · {lang === 'bn' ? f.villageBn : f.village}{f.crop ? ` · ${cropName(f.crop, lang)}` : ''}</option>)}
            </Select>
            <p className="mt-2 text-[13px] text-muted">{T('এই তালিকার কৃষকেরা নমুনা।', 'The farmers in this list are sample farmers.')} <Tags list={['DEMO']} /></p>
          </Card>

          {farmer && (
            <Card className="p-5">
              <h2 className="text-[17px] font-bold">{num(2, lang)}. {T('রেকর্ডের আগে অনুমতি', 'Consent before recording')}</h2>
              <blockquote className="mt-3 rounded-xl bg-primary-50 p-4 text-[15px] leading-7 text-ink/85">{L(CONSENT_NOTICE)}</blockquote>
              {!consent ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => speakNatural(L(CONSENT_NOTICE), lang)}><Volume2 size={16} />{T('পড়ে শোনান', 'Read it aloud')}</Button>
                  <Button onClick={() => answer(true)}><CheckCircle2 size={16} />{T('কৃষক রাজি', 'Farmer agreed')}</Button>
                  <Button variant="ghost" onClick={() => answer(false)}><XCircle size={16} />{T('কৃষক রাজি নন', 'Farmer declined')}</Button>
                </div>
              ) : consent.given ? (
                <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-primary-700"><ShieldCheck size={16} />{T('অনুমতি নেওয়া হয়েছে', 'Consent logged')} · {new Date(consent.at).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              ) : (
                <div className="mt-3"><Note tone="gold">{T('কৃষক রাজি হননি, তাই কিছু রেকর্ড হয়নি। সাধারণভাবে অনুরোধ লিখে রাখুন।', 'The farmer declined, so nothing was recorded. Write the request down as usual.')}</Note><Button variant="ghost" className="mt-3" onClick={reset}><RotateCcw size={16} />{T('আবার শুরু', 'Start again')}</Button></div>
              )}
            </Card>
          )}

          {step >= 3 && !result && (
            <Card className="p-5">
              <h2 className="text-[17px] font-bold">{num(3, lang)}. {T('রেকর্ড করুন বা ফাইল দিন', 'Record, or load a recording')}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {!rec ? <Button onClick={start} disabled={busy}><Mic size={16} />{audio ? T('আবার রেকর্ড', 'Record again') : T('রেকর্ড শুরু', 'Start recording')}</Button>
                  : <Button onClick={() => rec.recorder.stop()}><Square size={16} />{T('থামান', 'Stop')} · {clock(secs, lang)}</Button>}
                {!rec && <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}><Upload size={16} />{T('অডিও ফাইল', 'Audio file')}</Button>}
                <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
                {rec && <span className="text-[13px] text-muted">{T(`সর্বোচ্চ ${num(MAX_RECORD_SECONDS / 60, 'bn')} মিনিট`, `Up to ${MAX_RECORD_SECONDS / 60} minutes`)}</span>}
              </div>
              {audio && !rec && (
                <div className="mt-4 space-y-3">
                  <audio controls src={audio.url} className="w-full" />
                  <Button onClick={send} loading={busy}><Send size={16} />{T('লেখায় রূপান্তর করুন', 'Transcribe')}</Button>
                  <p className="text-[13px] text-muted">{T('অডিওটা একবার এআই-এর কাছে যায়, কোথাও রাখা হয় না। নোটে শুধু তার আঙুলের ছাপ (SHA-256) থাকে।', 'The audio goes to the AI once and is not stored anywhere. The note keeps only its fingerprint (SHA-256).')}</p>
                </div>
              )}
              {error && <Note tone="warn" className="mt-3">{error}</Note>}
            </Card>
          )}

          {result && (
            <Review result={result} keep={keep} setKeep={setKeep} summary={summary} setSummary={setSummary} lang={lang} T={T} L={L}
              onSave={() => save(false)} onRequest={() => save(true)} onDiscard={reset} />
          )}
        </div>

        <SavedNotes notes={s.callNotes} lang={lang} T={T} L={L} dispatch={dispatch} navigate={navigate} />
      </div>
    </div>
  );
}

function Review({ result, keep, setKeep, summary, setSummary, lang, T, L, onSave, onRequest, onDiscard }) {
  const { transcript, note, engine, noteFromAi } = result;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-bold">{num(4, lang)}. {T('দেখে নিন', 'Check it')}</h2>
        <span className="flex items-center gap-2 text-[13px] text-muted">{engine === 'groq' ? 'Groq Whisper' : 'Google Gemini'} <Tags list={['AI']} /></span>
      </div>
      {!noteFromAi && <Note tone="gold" className="mt-3">{T('এবার শুধু লেখা পাওয়া গেছে (জেমিনি ব্যস্ত বা বন্ধ)। সারাংশটা নিজে লিখুন।', 'Only the transcript came back this time (Gemini busy or off). Write the summary yourself.')}</Note>}

      <h3 className="mt-4 text-[14px] font-bold text-muted">{T('সারাংশ (আপনি বদলাতে পারেন)', 'Summary (you can edit it)')}</h3>
      <Textarea className="mt-1 w-full" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
      <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
        {note.crop && <Badge>{cropName(note.crop, lang)}</Badge>}
        <Badge tone="blue">{L(SYMPTOMS[note.symptom] ?? SYMPTOMS.question)}</Badge>
        <Badge tone={note.urgency === 'high' ? 'red' : note.urgency === 'low' ? 'green' : 'amber'}>{T({ high: 'জরুরি', medium: 'মাঝারি', low: 'সাধারণ' }[note.urgency], { high: 'Urgent', medium: 'Medium', low: 'Low' }[note.urgency])}</Badge>
        {note.area && <Badge tone="green">{num(note.area.value, lang)} {UNIT[note.area.unit][lang === 'bn' ? 0 : 1]}</Badge>}
      </div>

      {note.items.length > 0 && (
        <>
          <h3 className="mt-4 text-[14px] font-bold text-muted">{T('কথায় আসা অঙ্ক', 'Amounts said in the call')}</h3>
          <ul className="mt-1 divide-y divide-border rounded-xl border border-border">
            {note.items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 p-3">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={!!keep[i]} onChange={(e) => setKeep(keep.map((k, j) => (j === i ? e.target.checked : k)))} aria-label={T('রাখুন', 'Keep')} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{it.what} · <span className="text-muted">{L(KIND[it.kind])}</span></p>
                  <p className="text-[15px]">{it.taka != null ? `৳ ${num(it.taka, lang)}` : '—'}{it.qty != null ? ` · ${num(it.qty, lang)}` : ''}{it.unit ? ` ${UNIT[it.unit][lang === 'bn' ? 0 : 1]}` : ''}</p>
                  <p className="mt-0.5 text-[13px] text-muted">“{it.quote}”</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {note.dropped.length > 0 && (
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer text-muted">{T(`${num(note.dropped.length, 'bn')}টি অঙ্ক বাদ পড়েছে: লেখায় পাওয়া যায়নি`, `${note.dropped.length} dropped: not found in the transcript`)} <Tags list={['RULE']} /></summary>
          <ul className="mt-1 space-y-1">{note.dropped.map((d, i) => <li key={i}>{d.what || '—'}: {L({ bn: RULE_TEXT[d.rule]?.[0], en: RULE_TEXT[d.rule]?.[1] })} <code className="text-[11px]">{d.rule}</code></li>)}</ul>
        </details>
      )}

      <details className="mt-4" open={transcript.segments.length <= 6}>
        <summary className="cursor-pointer text-[14px] font-bold text-muted">{T('পুরো লেখা', 'Full transcript')}</summary>
        <div className="mt-2 max-h-80 space-y-2 overflow-y-auto text-[15px] leading-7">
          {transcript.segments.map((g, i) => <p key={i}><span className="font-semibold">{WHO[g.who][lang === 'bn' ? 0 : 1]}:</span> {g.text}</p>)}
        </div>
      </details>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={onRequest} disabled={!summary.trim()}><Send size={16} />{T('সিল করে অনুরোধ খুলুন', 'Seal and open as a request')}</Button>
        <Button variant="ghost" onClick={onSave} disabled={!summary.trim()}><Save size={16} />{T('শুধু সিল করে রাখুন', 'Seal and save only')}</Button>
        <Button variant="ghost" onClick={onDiscard}><Trash2 size={16} />{T('বাদ দিন', 'Discard')}</Button>
      </div>
    </Card>
  );
}

// Saved notes, newest first, each with its seal checked again on screen.
function SavedNotes({ notes, lang, T, L, dispatch, navigate }) {
  const [ok, setOk] = useState({});
  useEffect(() => {
    let alive = true;
    Promise.all(notes.map(async (n) => [n.id, await verifyCallNote(n).catch(() => false)])).then((r) => { if (alive) setOk(Object.fromEntries(r)); });
    return () => { alive = false; };
  }, [notes]);
  return (
    <div className="space-y-3">
      <h2 className="text-[17px] font-bold">{T('রাখা নোট', 'Saved notes')}</h2>
      {!notes.length && <EmptyState icon={Mic} title={T('এখনো কোনো নোট নেই', 'No notes yet')} text={T('কৃষকের সাথে কথা শেষে এখানে নোট জমা হবে।', 'Notes appear here after a call with a farmer.')} />}
      {notes.map((n) => {
        const r = n.record;
        return (
          <Card key={n.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{r.farmer?.name}</p>
                <p className="text-[13px] text-muted">{new Date(r.created).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {clock(r.audio?.seconds ?? 0, lang)}</p>
              </div>
              {ok[n.id] === undefined ? null : ok[n.id]
                ? <span className="flex items-center gap-1 text-[12px] font-semibold text-primary-700" title={n.hash}><ShieldCheck size={14} />{T('অপরিবর্তিত', 'Unchanged')}</span>
                : <span className="flex items-center gap-1 text-[12px] font-semibold text-red-700"><ShieldAlert size={14} />{T('বদলানো হয়েছে', 'Altered')}</span>}
            </div>
            <p className="mt-2 text-[14px] leading-6">{L(r.note.summary) || r.transcript.text.slice(0, 160)}</p>
            <p className="mt-1 text-[12px] text-muted">{T(`${num(r.note.items.length, 'bn')}টি অঙ্ক`, `${r.note.items.length} amounts`)} · SHA-256 {n.hash.slice(0, 12)}…</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {n.requestId && <Button variant="ghost" className="!px-2 !py-1" onClick={() => navigate(`/officer/requests/${n.requestId}`)}>{T('অনুরোধ দেখুন', 'Open request')}</Button>}
              <Button variant="ghost" className="!px-2 !py-1" onClick={() => { if (window.confirm(T('এই নোটটি মুছবেন?', 'Delete this note?'))) dispatch({ type: 'removeCallNote', id: n.id }); }}><Trash2 size={14} />{T('মুছুন', 'Delete')}</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
