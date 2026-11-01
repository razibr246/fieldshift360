// চক্র এজেন্ট in the farmer and officer headers: the button, the floating orb, the assistant panel (talk, tasks,
// security) and, for the officer, the pop-up where a person approves what the agent drafted before it goes out.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Maximize2, Minimize2, Volume2, VolumeX, Keyboard, SendHorizontal, ShieldCheck, ShieldAlert, ListChecks, MessageCircle, CheckCircle2, ChevronRight, Smartphone, Gavel } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { smsSplit } from '../../engine/text';
import { AGENT_NAME, POLICY, DAILY_AUTO_LIMIT, autoCountToday } from '../../engine/chakra';
import { useChakra } from './useChakra';
import ChakraLogo from './ChakraLogo';
import './chakra.css';

export function ChakraOrb({ phase = 'idle', size = 64, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="chakra-orb shrink-0 outline-none focus-visible:ring-4 focus-visible:ring-primary-300/60 active:scale-95" data-phase={phase} style={{ width: size, height: size }}>
      <span className="chakra-orb-band" /><span className="chakra-orb-gloss" />
    </button>
  );
}

const GATE = {
  auto: { bn: 'এজেন্ট নিজে করবে', en: 'Agent does it' },
  confirm: { bn: 'আপনার হ্যাঁ লাগবে', en: 'Needs your yes' },
  verdict: { bn: 'কর্মকর্তার অনুমোদন লাগবে', en: 'Needs officer approval' },
};
const ACTION = { notify: ['জানানো', 'Told you'], addRequest: ['অফিসে সমস্যা পাঠানো', 'Problem sent to office'], followUp: ['অফিসকে মনে করানো', 'Office reminded'], addAdvisory: ['কৃষককে বার্তা', 'Message to farmer'], updateRequest: ['অনুরোধের অবস্থা', 'Request status'], escalate: ['উপজেলায় জানানো', 'Raised to upazila'], reject: ['বাতিল', 'Rejected'], dismiss: ['দেখা হয়েছে', 'Seen'], decline: ['পাঠানো হয়নি', 'Not sent'] };

// No SMS gateway is connected, so the message opens in the phone's own SMS app, filled in, for one tap on Send.
const smsHref = (mobile, text) => `sms:+88${mobile}?&body=${encodeURIComponent(text)}`;

function TaskCard({ c, task, compact }) {
  const { T, L, s, profile } = useStore();
  const phone = profile.mobile;
  const sms = c.role === 'farmer' ? smsSplit(`${L(task.title)}: ${L(task.body)}`) : null;
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[.06] p-3.5">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.risk === 'high' ? 'bg-red-400' : task.risk === 'medium' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold leading-snug">{L(task.title)}</div>
          <p className="mt-1 text-[13.5px] leading-6 text-white/80">{L(task.body)}</p>
          {!compact && <p className="mt-1 text-[12px] text-white/50">{T('কেন: ', 'Why: ')}{L(task.why)}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11.5px] font-semibold text-white/85">{L(GATE[task.gate])}</span>
            <span className="[&_*]:!text-[11px]"><Tags list={task.tags} /></span>
          </div>
          {sms && !compact && (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-white/50"><Smartphone size={13} />{T(`বাটন ফোনে এসএমএস: ${num(sms.length, 'bn')} ভাগ`, `To a button phone by SMS: ${sms.length} part(s)`)}
              {phone ? <> → {s.lang === 'bn' ? bnDigits(phone) : phone} <a href={smsHref(phone, sms.join(' '))} className="chakra-chip rounded-full px-2 py-0.5 font-semibold text-white/85">{T('ফোন থেকে পাঠান', 'Send from phone')}</a></> : T(' (মোবাইল নম্বর দেওয়া নেই)', ' (no mobile number yet)')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {task.gate === 'verdict' && <button type="button" onClick={() => c.openVerdict(task)} className="inline-flex items-center gap-1.5 rounded-full bg-paddy-300 px-3.5 py-1.5 text-[13px] font-bold text-primary-950"><Gavel size={14} />{T('দেখে অনুমোদন দিন', 'Review & approve')}</button>}
        {task.gate === 'confirm' && task.effects.some((e) => e.type !== 'notify') && <button type="button" onClick={() => c.act(task)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold text-primary-950"><SendHorizontal size={14} />{T('হ্যাঁ, পাঠান', 'Yes, send')}</button>}
        {task.nav && <Link to={task.nav} onClick={c.close} className="chakra-chip inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold">{T('দেখুন', 'Open')}<ChevronRight size={14} /></Link>}
        {!s.chakra.handled.includes(task.id) && <button type="button" onClick={() => (task.gate === 'verdict' ? c.reject(task) : c.dismiss(task))} className="chakra-chip rounded-full px-3 py-1.5 text-[13px] font-semibold text-white/75">{task.gate === 'verdict' ? T('বাতিল', 'Reject') : T('দেখেছি', 'Got it')}</button>}
      </div>
    </div>
  );
}

function Panel({ c, onClose }) {
  const { s, T, L, today } = useStore();
  const [tab, setTab] = useState('talk');
  const [big, setBig] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const end = useRef(null);
  const box = useRef(null);
  useEffect(() => { c.start(); box.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [c.messages.length, c.interim, tab]);
  const submit = (e) => { e.preventDefault(); c.send(text); setText(''); };
  const talk = () => (c.phase === 'listening' || c.phase === 'speaking' ? c.stopAll() : c.listen());
  const used = autoCountToday(c.audit, c.role, today);
  const tabs = [['talk', MessageCircle, T('কথা', 'Talk')], ['tasks', ListChecks, T(`কাজ ${c.tasks.length ? num(c.tasks.length, s.lang) : ''}`, `Tasks ${c.tasks.length || ''}`)], ['safe', ShieldCheck, T('নিরাপত্তা', 'Security')]];
  return (
    <div className="fixed inset-0 z-[1700]" role="dialog" aria-modal="true" aria-label={L(AGENT_NAME)} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="sheet-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <div ref={box} tabIndex={-1} className={`chakra-panel chakra-pop absolute inset-x-2 bottom-2 top-[6vh] flex flex-col overflow-hidden rounded-[34px] outline-none sm:inset-x-auto sm:right-5 sm:bottom-5 sm:top-auto sm:h-[min(760px,88vh)] ${big ? 'sm:w-[min(820px,94vw)]' : 'sm:w-[430px]'}`}>
        <div className="flex items-center gap-2 px-4 pt-4">
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={T('বন্ধ করুন', 'Close')}><X size={20} /></button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <ChakraLogo size={30} spin={c.phase === 'thinking'} />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[16px] font-bold">{L(AGENT_NAME)}</div>
              <div className="truncate text-[11.5px] text-white/55">{c.role === 'farmer' ? T('আপনার জমির সহকারী', 'Your field assistant') : T('অফিসের সহকারী', 'Office assistant')}{c.ai === 'on' ? ' · Claude' : ''}</div>
            </div>
          </div>
          <button type="button" onClick={() => setBig(!big)} className="hidden h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid" aria-label={big ? T('ছোট করুন', 'Smaller') : T('বড় করুন', 'Larger')}>{big ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
        </div>

        {/* Manual or agent: who acts. */}
        <div className="mx-4 mt-3 grid grid-cols-2 rounded-full bg-white/8 p-1 text-[13.5px] font-bold" role="radiogroup" aria-label={T('কাজের ধরন', 'Mode')}>
          {[['manual', T('ম্যানুয়াল', 'Manual')], ['agent', T('এজেন্ট', 'Agent')]].map(([m, label]) => (
            <button key={m} type="button" role="radio" aria-checked={c.mode === m} onClick={() => c.setMode(m)} className={`rounded-full py-2 transition-colors ${c.mode === m ? 'bg-white text-primary-950 shadow' : 'text-white/70 hover:text-white'}`}>{label}</button>
          ))}
        </div>
        <p className="mx-5 mt-1.5 text-center text-[11.5px] leading-5 text-white/55">
          {c.mode === 'agent'
            ? (c.role === 'farmer' ? T('এজেন্ট নিজে থেকে আপনার সমস্যা অফিসে পাঠাবে, উত্তর না এলে মনে করাবে আর পরামর্শ জানাবে।', 'The agent reports your problems to the office, chases late replies and tells you what to do, on its own.') : T('এজেন্ট উত্তর আর পরামর্শের খসড়া করবে; পাঠানোর আগে আপনার অনুমোদন চাইবে।', 'The agent drafts replies and advice, and asks your approval before anything goes out.'))
            : T('এজেন্ট শুধু পরামর্শ দেবে; প্রতিটি কাজ আপনি নিজে করবেন।', 'The agent only suggests; you do every step yourself.')}
        </p>

        <div className="mx-4 mt-2 flex gap-1 border-b border-white/10">
          {tabs.map(([id, Icon, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 text-[13px] font-semibold ${tab === id ? 'border-paddy-300 text-white' : 'border-transparent text-white/55 hover:text-white/80'}`}><Icon size={15} />{label}</button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
          {tab === 'talk' && (
            <div className="space-y-4">
              {c.messages.map((m) => (m.who === 'user' ? (
                <div key={m.id} className="flex justify-end"><span className="chakra-bubble-user max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-[15px]">{m.text}</span></div>
              ) : m.who === 'task' ? (
                <TaskCard key={m.id} c={c} task={m.task} compact />
              ) : (
                <div key={m.id}>
                  <p className="text-[17px] leading-8 text-white/95">{m.text}</p>
                  {m.tags && <span className="mt-1 inline-block [&_*]:!text-[11px]"><Tags list={m.tags} /></span>}
                  {!!m.sources?.length && <div className="mt-1.5 flex flex-wrap gap-1.5">{m.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="chakra-chip max-w-[220px] truncate rounded-full px-2.5 py-1 text-[11.5px] text-white/70">{x.title}</a>)}</div>}
                  {(m.chips?.length || m.nav) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.nav && <Link to={m.nav} onClick={onClose} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-primary-950">{T('পাতাটি খুলুন', 'Open the page')}<ChevronRight size={14} /></Link>}
                      {m.chips?.map((ch) => <button key={ch} type="button" onClick={() => c.send(ch)} className="chakra-chip rounded-full px-3 py-1.5 text-[13px] font-semibold">{ch}</button>)}
                    </div>
                  )}
                </div>
              )))}
              {c.interim && <p className="text-[17px] italic text-white/50">{c.interim}…</p>}
              {c.phase === 'thinking' && <p className="text-[14px] text-white/50">{T('ভাবছি…', 'Thinking…')}</p>}
            </div>
          )}
          {tab === 'tasks' && (
            <div className="space-y-3">
              {!c.tasks.length && <p className="py-10 text-center text-[14px] text-white/55"><CheckCircle2 className="mx-auto mb-2 text-emerald-300" />{T('এখন কোনো কাজ বাকি নেই।', 'Nothing waiting right now.')}</p>}
              {c.tasks.map((t) => <TaskCard key={t.id} c={c} task={t} />)}
            </div>
          )}
          {tab === 'safe' && (
            <div className="space-y-4 text-[13.5px] leading-6">
              <div className={`flex items-center gap-2 rounded-2xl p-3 ${c.auditOk.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/15 text-red-200'}`}>
                {c.auditOk.ok ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                <span>{c.auditOk.ok ? T(`কাজের খাতা অক্ষত: ${num(c.audit.length, 'bn')}টি লেখা, প্রতিটি আগেরটির সঙ্গে হ্যাশে বাঁধা।`, `Activity log intact: ${c.audit.length} entries, each hash-linked to the one before.`) : T(`কাজের খাতায় ${num(c.auditOk.brokenAt, 'bn')} নম্বরে পরিবর্তন ধরা পড়েছে।`, `The log was changed at entry ${c.auditOk.brokenAt}.`)}</span>
              </div>
              <div>
                <div className="font-bold">{T('এজেন্ট নিজে যা পারে', 'What the agent may do alone')}</div>
                <p className="text-white/70">{POLICY[c.role].auto.map((a) => T(ACTION[a][0], ACTION[a][1])).join(', ')}. {T(`দিনে সর্বোচ্চ ${num(DAILY_AUTO_LIMIT, 'bn')}টি (আজ ${num(used, 'bn')}টি)।`, `At most ${DAILY_AUTO_LIMIT} a day (${used} today).`)}</p>
                {!!POLICY[c.role].verdict.length && <><div className="mt-2 font-bold">{T('মানুষের অনুমোদন ছাড়া কখনো নয়', 'Never without a person’s approval')}</div><p className="text-white/70">{POLICY[c.role].verdict.map((a) => T(ACTION[a][0], ACTION[a][1])).join(', ')}.</p></>}
                <p className="mt-2 text-white/55">{c.role === 'farmer' ? T('শুধু আপনার নিজের জমি আর অনুরোধ নিয়েই কাজ করে।', 'It acts only on your own field and requests.') : T('শুধু আপনার উপজেলার ইউনিয়নের অনুরোধ নিয়েই কাজ করে।', 'It acts only on requests from your own upazila’s unions.')} {T('AI শুধু প্রস্তাব দেয়, নিজে কিছু পাঠাতে পারে না; চাবি সার্ভারে থাকে, ব্রাউজারে আসে না।', 'The AI can only propose, never send; its key stays on the server, never in the browser.')}</p>
              </div>
              <div>
                <div className="mb-1 font-bold">{T('সাম্প্রতিক কাজ', 'Recent activity')}</div>
                {!c.audit.length && <p className="text-white/55">{T('এখনো কিছু হয়নি।', 'Nothing yet.')}</p>}
                <ol className="space-y-1">
                  {c.audit.filter((e) => e.role === c.role).slice(-14).reverse().map((e) => (
                    <li key={e.seq} className="flex gap-2 text-[12.5px] text-white/70">
                      <span className="w-12 shrink-0 text-white/40">#{num(e.seq, s.lang)}</span>
                      <span className="min-w-0 flex-1 truncate">{e.action.split('+').map((a) => (ACTION[a] ? T(ACTION[a][0], ACTION[a][1]) : a)).join(' + ')} · {e.gate === 'auto' ? T('এজেন্ট', 'agent') : T('মানুষ', 'person')} · {e.result}</span>
                      <code className="shrink-0 text-white/30">{e.hash.slice(0, 6)}</code>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          <div ref={end} />
        </div>

        {typing && tab === 'talk' && (
          <form onSubmit={submit} className="mx-4 mb-2 flex items-center gap-2 rounded-full bg-white/10 pl-4 pr-1.5">
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={600} className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40" placeholder={c.role === 'farmer' ? T('যেমন: ধানে পোকা লেগেছে', 'e.g. insects on my rice') : T('যেমন: আজকের অবস্থা', 'e.g. today’s briefing')} aria-label={T('লিখে বলুন', 'Type to the agent')} />
            <button type="submit" className="grid h-9 w-9 place-items-center rounded-full bg-white text-primary-950" aria-label={T('পাঠান', 'Send')}><SendHorizontal size={17} /></button>
          </form>
        )}
        <div className="relative z-10 flex items-center justify-between px-6 pb-5 pt-1">
          <button type="button" onClick={() => { c.setVoiceOn(!c.voiceOn); if (c.voiceOn) c.stopAll(); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-pressed={c.voiceOn} aria-label={c.voiceOn ? T('কথা বলা বন্ধ', 'Mute voice') : T('কথা বলা চালু', 'Turn voice on')}>{c.voiceOn ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          <div className="flex flex-col items-center gap-1">
            <ChakraOrb phase={c.phase} size={76} onClick={talk} label={c.phase === 'listening' ? T('শোনা থামান', 'Stop listening') : T('কথা বলুন', 'Talk')} />
            <span className="text-[11.5px] text-white/50">{{ listening: T('শুনছি…', 'Listening…'), thinking: T('ভাবছি…', 'Thinking…'), speaking: T('বলছি… থামাতে ছুঁয়ে দিন', 'Speaking… tap to stop') }[c.phase] ?? T('ছুঁয়ে কথা বলুন', 'Tap and speak')}</span>
            {c.voiceNote && <span className="max-w-[200px] text-center text-[10.5px] leading-4 text-amber-200/80">{c.voiceNote === 'quota' ? T('আজকের স্বাভাবিক কণ্ঠের সীমা শেষ; কাল আবার ফিরবে। এখন ডিভাইসের কণ্ঠ।', 'Today’s natural-voice limit is used; it is back tomorrow. Device voice for now.') : T('স্বাভাবিক কণ্ঠ চালু নেই; ডিভাইসের কণ্ঠ বলছে।', 'Natural voice is off; the device voice speaks.')}</span>}
          </div>
          <button type="button" onClick={() => { setTyping(!typing); setTab('talk'); }} className={`grid h-12 w-12 place-items-center rounded-full ${typing ? 'bg-white text-primary-950' : 'bg-white/10 hover:bg-white/20'}`} aria-pressed={typing} aria-label={T('লিখে বলুন', 'Type instead')}><Keyboard size={20} /></button>
        </div>
      </div>
    </div>
  );
}

// The officer's verdict: what the agent drafted, the request and the crop doctor's first look, editable, then approve
// or reject. Nothing is sent in the office's name without this.
function Verdict({ c, task, onClose }) {
  const { s, T, L, farmerOf } = useStore();
  const adv = task.effects.find((e) => e.type === 'addAdvisory')?.adv;
  const one = adv?.to.length === 1 ? farmerOf(adv.to[0]) : null; // a reply to one farmer can also go to their phone
  const oneMobile = one && (s.profiles[one.id]?.mobile || one.mobile);
  const [text, setText] = useState(adv?.text ?? '');
  const req = task.request ? s.requests.find((r) => r.id === task.request) : null;
  const top = task.look?.findings?.[0];
  return (
    <div className="fixed inset-0 z-[1750] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="chakra-verdict" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="sheet-fade absolute inset-0 bg-primary-950/55 backdrop-blur-[4px]" onClick={() => onClose()} />
      <div className="sheet-up relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[26px] bg-white shadow-[0_24px_64px_-16px_rgba(13,38,20,0.5)]">
        <div className="flex items-center gap-3 bg-primary-950 px-5 py-4 text-white">
          <ChakraLogo size={40} />
          <div className="min-w-0 flex-1">
            <h2 id="chakra-verdict" className="text-[17px] font-bold leading-tight">{T('চক্র এজেন্ট আপনার অনুমোদন চাইছে', 'Chakra Agent needs your approval')}</h2>
            <p className="text-[12.5px] text-white/70">{L(task.title)}{c.verdicts.length > 1 ? T(` · আরও ${num(c.verdicts.length - 1, 'bn')}টি`, ` · ${c.verdicts.length - 1} more`) : ''}</p>
          </div>
          <button type="button" onClick={() => onClose()} className="grid h-9 w-9 place-items-center rounded-full bg-white/10" aria-label={T('পরে দেখব', 'Later')}><X size={18} /></button>
        </div>
        <div className="space-y-3 p-5 text-[14px]">
          <p className="text-muted">{T('কেন: ', 'Why: ')}{L(task.why)} <Tags list={task.tags} /></p>
          {req && <div className="rounded-xl bg-primary-50 p-3"><div className="text-[12px] font-semibold text-primary-800">{T('কৃষকের কথা', 'The farmer wrote')}</div><p className="mt-0.5">{L(req.text)}</p></div>}
          {top && <div className="rounded-xl border border-border p-3"><div className="text-[12px] font-semibold text-muted">{T('কৃষকের কথার সঙ্গে ফসলের সমস্যা-তালিকার মিল (ছবির পরীক্ষা নয়)', 'Match from the farmer’s words to the crop problem list (no photo checked)')}</div><p className="mt-0.5 font-semibold">{T(top.name_bn, top.name_en)}</p><p className="text-muted">{task.look.actions_now?.[0]}</p></div>}
          {adv ? (
            <label className="block">
              <span className="text-[12.5px] font-semibold">{T(`যা পাঠানো হবে (${num(adv.to.length, 'bn')} জন কৃষককে)`, `What will be sent (to ${adv.to.length} farmer(s))`)}</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={600} className="mt-1 w-full rounded-xl border border-border p-3 text-[14.5px] leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
            </label>
          ) : <p className="rounded-xl bg-amber-50 p-3">{L(task.body)}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => { c.approve(task, adv ? text.trim() : undefined); onClose(true); }} disabled={adv && !text.trim()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 py-3 font-bold text-white hover:bg-primary-800 disabled:opacity-40"><CheckCircle2 size={18} />{T('অনুমোদন দিয়ে পাঠান', 'Approve and send')}</button>
            <button type="button" onClick={() => { c.reject(task); onClose(true); }} className="rounded-xl border border-border px-4 py-3 font-semibold text-ink hover:bg-red-50 hover:text-red-700">{T('বাতিল', 'Reject')}</button>
          </div>
          {oneMobile && adv && (
            <a href={smsHref(oneMobile, text.trim())} onClick={() => { c.approve(task, text.trim()); setTimeout(() => onClose(true), 300); }}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-[14px] font-semibold text-primary-800 hover:bg-primary-100">
              <Smartphone size={17} />{T(`অনুমোদন দিন ও ${L(one.name)}-এর ফোনে এসএমএস করুন (${bnDigits(oneMobile)})`, `Approve and SMS ${L(one.name)}’s phone (${oneMobile})`)}
            </a>
          )}
          <p className="text-[12px] text-muted">{T('সিদ্ধান্তটি আপনার নামে কাজের খাতায় লেখা থাকবে।', 'Your decision is recorded in the activity log under your name.')}</p>
        </div>
      </div>
    </div>
  );
}

export default function ChakraAgent({ role }) {
  const { T, L } = useStore();
  const c = useChakra(role);
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [later, setLater] = useState(() => new Set()); // verdicts the officer put off this visit
  c.openVerdict = (t) => setVerdict(t);
  c.close = () => setOpen(false);
  // Agent mode on the officer side: the next draft pops up for a verdict by itself.
  const next = c.mode === 'agent' && !open ? c.verdicts.find((t) => !later.has(t.id)) : null;
  const shown = verdict ?? next;
  const closeVerdict = (decided) => { if (!decided && shown) setLater((x) => new Set([...x, shown.id])); setVerdict(null); };
  const badge = role === 'officer' ? c.verdicts.length : c.tasks.filter((t) => t.gate !== 'auto' || t.kind === 'water' || t.kind === 'weather').length;
  // Ctrl/⌘ + K opens the agent from anywhere.
  useEffect(() => {
    const k = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k' || e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-tour="chakra"
        className={`relative hidden h-10 items-center gap-1.5 rounded-xl border px-1.5 text-[14px] font-semibold shadow-2xs transition-all duration-200 hover:scale-105 active:scale-95 sm:inline-flex sm:px-2.5 ${c.mode === 'agent' ? 'border-primary-700 bg-primary-950 text-white' : 'border-border bg-white text-ink hover:bg-primary-50'}`}
        aria-label={`${L(AGENT_NAME)}, ${c.mode === 'agent' ? T('এজেন্ট চালু', 'agent on') : T('ম্যানুয়াল', 'manual')}`} title={`${L(AGENT_NAME)} (Ctrl+K)`}>
        <ChakraLogo size={26} spin={c.phase === 'thinking'} />
        <span className="hidden md:inline">{T('চক্র', 'Chakra')}</span>
        {c.mode === 'agent' && <span className="hidden rounded-md bg-paddy-300 px-1 text-[10.5px] font-bold uppercase text-primary-950 md:inline">{T('চালু', 'on')}</span>}
        {badge > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">{T(num(badge, 'bn'), String(badge))}</span>}
      </button>
      {/* In a portal: the header's backdrop-filter would otherwise make it the box these fixed layers sit in. */}
      {createPortal(<>
      {!open && (
        <div className={`fixed right-4 z-40 ${role === 'farmer' ? 'bottom-[6.6rem] lg:bottom-6' : 'bottom-6 lg:right-20'}`}>
          <ChakraOrb phase={c.phase} size={58} onClick={() => setOpen(true)} label={`${L(AGENT_NAME)}: ${T('কথা বলুন', 'talk')}`} />
        </div>
      )}
      {open && <Panel c={c} onClose={() => { c.stopAll(); setOpen(false); }} />}
      {shown && <Verdict key={shown.id} c={c} task={shown} onClose={closeVerdict} />}
      </>, document.body)}
    </>
  );
}
