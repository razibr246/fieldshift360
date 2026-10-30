// The field-test kit, for whoever runs a session with a farmer or officer (protocol: docs/USER_TESTING.md). Read the
// consent aloud, note who is testing (never a name), time the four tasks of the first path, ask the three questions,
// note what went wrong, and save. Sessions stay on this device; export them as CSV or as rows to paste into
// docs/USER_TESTING.md. Logic: engine/testkit.js.
import { useState } from 'react';
import { ClipboardCheck, Play, Square, Check, Download, Copy, Trash2, Plus, ExternalLink } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Segmented } from '../../components/ui';
import { TASKS, QUESTIONS, newSession, summarise, overview, toCsv, toMarkdownRows } from '../../engine/testkit';
import { num, fmtDate } from '../../engine/dates';
import { STORAGE_PREFIX } from '../../config/brand';

const KEY = `${STORAGE_PREFIX}.testkit.sessions`;
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked: export before leaving */ } };

export default function TestKit() {
  const { T, L, s: st, toast } = useStore();
  const lang = st.lang;
  const [sessions, setSessions] = useState(load);
  const [cur, setCur] = useState(null);
  const [timer, setTimer] = useState(null); // { k, t0 }
  const o = overview(sessions);
  const upd = (patch) => setCur((c) => ({ ...c, ...patch }));
  const task = (k, patch) => setCur((c) => ({ ...c, tasks: { ...c.tasks, [k]: { ...c.tasks[k], ...patch } } }));
  const startStop = (k) => {
    if (timer?.k === k) { task(k, { done: true, secs: Math.round((Date.now() - timer.t0) / 1000) }); setTimer(null); }
    else setTimer({ k, t0: Date.now() });
  };
  const finish = () => { const next = [...sessions, cur]; setSessions(next); save(next); setCur(null); setTimer(null); toast('সেশন রাখা হলো', 'Session saved'); };
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCsv(sessions)], { type: 'text/csv' })); a.download = `fieldshift-user-tests-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };
  const copyRows = async () => { try { await navigator.clipboard.writeText(toMarkdownRows(sessions)); toast('docs/USER_TESTING.md-এর জন্য সারি কপি হয়েছে', 'Rows for docs/USER_TESTING.md copied'); } catch { /* clipboard blocked */ } };
  const pill = (on) => `rounded-full px-3.5 py-2 text-[14px] font-semibold ring-1 transition ${on ? 'bg-primary-700 text-white ring-primary-700' : 'bg-white text-ink/80 ring-border hover:ring-primary-300'}`;

  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><ClipboardCheck size={15} />{T('মাঠে পরীক্ষার কিট', 'Field-test kit')}</p>
      <h1 className="mt-4 text-[34px] font-semibold leading-tight sm:text-[46px]">{T('কৃষক আর কর্মকর্তার সঙ্গে পরীক্ষা', 'Testing with farmers and officers')}</h1>
      <p className="mt-2 max-w-2xl text-[16px] leading-7 text-ink/75">{T('যিনি পরীক্ষা চালাবেন তাঁর জন্য। প্রতিটি সেশনে চারটি কাজ, তিনটি প্রশ্ন, আর কী সমস্যা হলো। কারও নাম বা ফোন নম্বর রাখা হয় না; সব এই যন্ত্রেই থাকে, পরে CSV বা docs/USER_TESTING.md-এর সারি হিসেবে বের করুন।', 'For whoever runs the test. Each session: four tasks, three questions, and what went wrong. No names or phone numbers are kept; everything stays on this device until you export it as CSV or as rows for docs/USER_TESTING.md.')}</p>

      {/* so far */}
      <Card className="mt-6 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[19px] font-bold">{T(`এ পর্যন্ত ${num(o.n, 'bn')}টি সেশন`, `${o.n} sessions so far`)}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={download} disabled={!o.n} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-semibold ring-1 ring-border disabled:opacity-40"><Download size={16} />CSV</button>
            <button type="button" onClick={copyRows} disabled={!o.n} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[14px] font-semibold ring-1 ring-border disabled:opacity-40"><Copy size={16} />{T('ফলাফলের সারি', 'Results rows')}</button>
            {!cur && <button type="button" onClick={() => setCur(newSession())} className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-4 py-2 text-[14px] font-bold text-white"><Plus size={16} />{T('নতুন সেশন', 'New session')}</button>}
          </div>
        </div>
        {o.n > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-[13.5px] sm:grid-cols-4">
            <div className="rounded-xl bg-canvas p-3"><dt className="text-muted">{T('তিন প্রশ্নই বুঝেছেন', 'Understood all three')}</dt><dd className="text-[20px] font-bold">{num(o.passed, lang)}/{num(o.n, lang)}</dd></div>
            {QUESTIONS.map((q) => <div key={q.k} className="rounded-xl bg-canvas p-3"><dt className="text-muted">{L(q)}</dt><dd className="text-[20px] font-bold">{num(Math.round(o.byQuestion[q.k] * 100), lang)}%</dd></div>)}
            <div className="col-span-2 rounded-xl bg-canvas p-3 sm:col-span-4"><dt className="text-muted">{T('কারা ছিলেন', 'Who took part')}</dt><dd>{T(`${num(o.women, 'bn')} জন নারী · ${num(o.lowLiteracy, 'bn')} জন কম পড়তে পারেন · ${num(o.lowPhone, 'bn')} জনের সাধারণ বা কম দামি ফোন`, `${o.women} women · ${o.lowLiteracy} read little or no Bangla · ${o.lowPhone} on a basic or low-end phone`)}</dd></div>
          </dl>
        )}
        {sessions.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-[13.5px]">
            {sessions.map((x, i) => { const m = summarise(x); return (
              <li key={x.at} className="flex items-center justify-between gap-2 py-2">
                <span>{fmtDate(x.at, lang)} · {x.place || '—'} · {x.role === 'officer' ? T('কর্মকর্তা', 'officer') : T('কৃষক', 'farmer')} · {T(`${num(m.done, 'bn')}/৪ কাজ নিজে`, `${m.done}/4 tasks unaided`)} · {m.pass ? '✅' : '⚠️'}</span>
                <button type="button" onClick={() => { const next = sessions.filter((_, k) => k !== i); setSessions(next); save(next); }} aria-label={T('সেশন মুছুন', 'Delete session')} className="grid h-9 w-9 place-items-center rounded-full hover:bg-red-50"><Trash2 size={15} className="text-red-700" /></button>
              </li>
            ); })}
          </ul>
        )}
      </Card>

      {cur && (
        <div className="mt-5 space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="text-[18px] font-bold">১. {T('সম্মতি (জোরে পড়ে শোনান)', 'Consent (read aloud)')}</h2>
            <p className="mt-2 rounded-xl bg-paddy-50 p-3 text-[15px] leading-7">{T('আমরা একটা ফোনের অ্যাপ পরীক্ষা করছি, আপনাকে নয়। কোনো উত্তর ভুল নয়। আপনার নাম বা ফোন নম্বর লেখা হবে না। যেকোনো সময় থামতে পারেন। রাজি থাকলে শুরু করি?', 'We are testing a phone app, not you. No answer is wrong. Your name and phone number will not be written down. You may stop at any time. Shall we begin, if you agree?')}</p>
            <h2 className="mt-4 text-[18px] font-bold">২. {T('কে পরীক্ষা করছেন (নাম নয়)', 'Who is testing (no names)')}</h2>
            <label className="mt-2 block text-[13.5px] font-semibold">{T('জায়গা (ইউনিয়ন, উপজেলা)', 'Place (union, upazila)')}
              <input value={cur.place} onChange={(e) => upd({ place: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-border px-3 text-[15px]" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {[['farmer', T('কৃষক', 'Farmer')], ['officer', T('কর্মকর্তা', 'Officer')]].map(([k, l]) => <button key={k} type="button" className={pill(cur.role === k)} onClick={() => upd({ role: k })}>{l}</button>)}
              <button type="button" className={pill(cur.woman)} aria-pressed={cur.woman} onClick={() => upd({ woman: !cur.woman })}>{T('নারী', 'Woman')}</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[['reads', T('পড়তে পারেন', 'Reads Bangla')], ['some', T('কিছুটা পড়েন', 'Reads a little')], ['none', T('পড়তে পারেন না', 'Does not read')]].map(([k, l]) => <button key={k} type="button" className={pill(cur.reading === k)} onClick={() => upd({ reading: k })}>{l}</button>)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[['smart', T('স্মার্টফোন', 'Smartphone')], ['low', T('কম দামি অ্যান্ড্রয়েড', 'Low-end Android')], ['feature', T('সাধারণ ফোন (এসএমএস)', 'Basic phone (SMS)')]].map(([k, l]) => <button key={k} type="button" className={pill(cur.phone === k)} onClick={() => upd({ phone: k, mode: k === 'feature' ? 'sms' : cur.mode })}>{l}</button>)}
            </div>
            <Segmented className="mt-3" value={cur.mode} onChange={(v) => upd({ mode: v })} options={[{ value: 'app', label: T('অ্যাপে', 'In the app') }, { value: 'voice', label: T('কথা বলে', 'By voice') }, { value: 'sms', label: T('এসএমএসে', 'By SMS') }]} />
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-[18px] font-bold">৩. {T('চারটি কাজ, সাহায্য ছাড়া', 'Four tasks, unaided')}</h2>
            <p className="text-[13.5px] text-muted">{T('কাজ শুরুতে ঘড়ি চালু করুন, শেষ হলে থামান। সাহায্য লাগলে "সাহায্য লেগেছে" চাপুন।', 'Start the clock when the task begins and stop it when it is done. Tap “needed help” if you had to step in.')}</p>
            <ul className="mt-3 space-y-2">
              {TASKS.map((t, i) => { const v = cur.tasks[t.k] ?? {}, running = timer?.k === t.k; return (
                <li key={t.k} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-3">
                  <span className="min-w-[160px] flex-1 text-[15px] font-bold">{num(i + 1, lang)}. {L(t)}</span>
                  <a href={`#${t.path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-800"><ExternalLink size={14} />{T('খুলুন', 'Open')}</a>
                  <button type="button" onClick={() => startStop(t.k)} className={`inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-bold ${running ? 'bg-red-600 text-white' : 'bg-primary-700 text-white'}`}>{running ? <><Square size={15} />{T('থামান', 'Stop')}</> : <><Play size={15} />{v.done ? T('আবার', 'Again') : T('শুরু', 'Start')}</>}</button>
                  {v.done && <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-primary-800"><Check size={15} />{num(v.secs, lang)} {T('সেকেন্ড', 's')}</span>}
                  <button type="button" aria-pressed={!!v.helped} onClick={() => task(t.k, { helped: !v.helped })} className={pill(!!v.helped)}>{T('সাহায্য লেগেছে', 'Needed help')}</button>
                </li>
              ); })}
            </ul>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-[18px] font-bold">৪. {T('তিনটি প্রশ্ন (পর্দা না দেখিয়ে)', 'Three questions (screen hidden)')}</h2>
            <ul className="mt-3 space-y-3">
              {QUESTIONS.map((q) => (
                <li key={q.k} className="rounded-2xl border border-border p-3">
                  <p className="text-[16px] font-bold">“{L(q)}”</p>
                  <p className="text-[12.5px] text-muted">{T('বোঝা গেছে ধরা হবে যখন: ', 'Counts as understood when: ')}{L(q.ok)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[['yes', T('বুঝেছেন', 'Understood')], ['partly', T('কিছুটা', 'Partly')], ['no', T('বোঝেননি', 'Not understood')]].map(([k, l]) => <button key={k} type="button" className={pill(cur.answers[q.k] === k)} onClick={() => setCur((c) => ({ ...c, answers: { ...c.answers, [q.k]: k } }))}>{l}</button>)}
                  </div>
                  <input aria-label={T('তাঁর নিজের কথায় উত্তর', 'Their answer in their own words')} placeholder={T('তাঁর নিজের কথায় উত্তর', 'Their answer in their own words')} value={cur.notes[q.k] ?? ''} onChange={(e) => setCur((c) => ({ ...c, notes: { ...c.notes, [q.k]: e.target.value } }))} className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-[15px]" />
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-[18px] font-bold">৫. {T('কী সমস্যা দেখলেন, আর কেমন লাগল', 'What went wrong, and how it felt')}</h2>
            <textarea aria-label={T('দেখা সমস্যা', 'Problems seen')} rows={3} value={cur.problems} onChange={(e) => upd({ problems: e.target.value })} placeholder={T('শব্দ যা বোঝেননি, চাপতে না পারা বোতাম, ধীর পাতা…', 'Words they did not understand, buttons they could not tap, slow pages…')} className="mt-2 w-full rounded-xl border border-border p-3 text-[15px]" />
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label={T('কেমন লাগল', 'How it felt')}>
              {['😟', '🙁', '😐', '🙂', '😄'].map((e, i) => <button key={e} type="button" role="radio" aria-checked={cur.rating === i + 1} onClick={() => upd({ rating: i + 1 })} className={`grid h-12 w-12 place-items-center rounded-full text-[24px] ring-2 ${cur.rating === i + 1 ? 'bg-paddy-50 ring-paddy-400' : 'ring-transparent'}`}>{e}</button>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={finish} className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-5 py-3 text-[15px] font-bold text-white"><Check size={17} />{T('সেশন রাখুন', 'Save session')}</button>
              <button type="button" onClick={() => { setCur(null); setTimer(null); }} className="rounded-full bg-white px-5 py-3 text-[15px] font-semibold ring-1 ring-border">{T('বাতিল', 'Cancel')}</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
