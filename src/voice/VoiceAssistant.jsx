import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, Square, Volume2, VolumeX, Send, RotateCcw, ExternalLink, AudioLines } from 'lucide-react';
import { useStore } from '../store';
import { Card, Note } from '../components/ui';
import { useVoiceAgent } from './useVoiceAgent';

const ERR = {
  'no-stt': { bn: 'এই ব্রাউজারে কথা শোনা চলে না। Chrome বা Edge ব্যবহার করুন, অথবা নিচে লিখে জিজ্ঞেস করুন।', en: 'This browser cannot listen. Use Chrome or Edge, or type below.' },
  'mic-denied': { bn: 'মাইক্রোফোনের অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানার পাশে মাইক চালু করুন।', en: 'Microphone permission was denied. Allow the mic next to the address bar.' },
  'no-speech': { bn: 'কিছু শুনতে পাইনি। মাইক চেপে আবার বলুন।', en: 'I heard nothing. Tap the mic and try again.' },
  'lang-unsupported': { bn: 'এই ডিভাইসে বাংলা শোনা চলছে না। লিখে জিজ্ঞেস করুন।', en: 'Bangla listening is not available on this device. Type instead.' },
  'stt-error': { bn: 'শুনতে সমস্যা হয়েছে, আবার চেষ্টা করুন বা লিখে জিজ্ঞেস করুন।', en: 'Listening failed. Try again or type.' },
  'net-needed': { bn: 'কথা শুনতে ইন্টারনেট লাগে। সংযোগ দেখে আবার চেষ্টা করুন, অথবা নিচে লিখে জিজ্ঞেস করুন।', en: 'Listening needs the internet. Check the connection and try again, or type below.' },
};
// Shown before the mic is tapped, so nobody waits for a mic that cannot work here. Typing always works.
export function supportNote(sp) {
  if (!sp.secure) return { bn: 'এই পাতায় মাইক চালু হয় না (নিরাপদ https ঠিকানা লাগে)। লিখে জিজ্ঞেস করুন।', en: 'The mic cannot work on this page (it needs a secure https address). Type instead.' };
  if (!sp.stt) return sp.ios ? { bn: 'আইফোনে বাংলায় কথা শোনা চলে না। নিচে লিখে জিজ্ঞেস করুন।', en: 'Bangla listening does not work on iPhone. Type your question below.' } : ERR['no-stt'];
  if (sp.ios) return { bn: 'আইফোনে বাংলায় কথা শোনা নির্ভরযোগ্য নয়; লিখে জিজ্ঞেস করাই ভালো।', en: 'Bangla listening on iPhone is unreliable; typing works better.' };
  if (!sp.online) return { bn: 'এখন ইন্টারনেট নেই: কথা শোনা চলবে না, কিন্তু লিখে জিজ্ঞেস করলে উত্তর পাবেন।', en: 'No internet right now: listening will not work, but typed questions still get answers.' };
  return null;
}

export default function VoiceAssistant({ role }) {
  const v = useVoiceAgent(role);
  return <VoiceChat v={v} />;
}

// The chat view of a voice agent; the farmer's voice page also shows the same agent as a phone call.
export function VoiceChat({ v }) {
  const { T, L } = useStore();
  const [text, setText] = useState('');
  const endRef = useRef();
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [v.messages.length, v.interim]);
  const submit = (e) => { e.preventDefault(); v.send(text); setText(''); };
  const status = v.listening ? T('শুনছি… বলুন', 'Listening… speak now') : v.speaking ? T('বলছি…', 'Speaking…') : T('মাইক চেপে বলুন', 'Tap the mic and speak');
  const last = v.messages[v.messages.length - 1];

  return (
    <Card className="flex h-[min(78vh,720px)] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[15px] font-bold"><AudioLines size={18} className="text-primary-600" />{T('ভয়েস সহকারী', 'Voice assistant')}</div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => v.setAutoSpeak(!v.autoSpeak)} aria-pressed={v.autoSpeak} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-primary-50" aria-label={v.autoSpeak ? T('উত্তর পড়ে শোনানো বন্ধ করুন', 'Turn spoken replies off') : T('উত্তর পড়ে শোনান', 'Turn spoken replies on')}>{v.autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}</button>
          <button type="button" onClick={v.reset} className="grid h-9 w-9 place-items-center rounded-lg border border-border hover:bg-primary-50" aria-label={T('নতুন করে শুরু', 'Start over')}><RotateCcw size={16} /></button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4" role="log" aria-live="polite" aria-label={T('কথোপকথন', 'Conversation')}>
        {v.messages.map((m) => (
          <div key={m.id} className={`flex ${m.who === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-[16px] leading-7 ${m.who === 'user' ? 'bg-primary-600 text-white' : 'border border-border bg-white'}`}>
              <div className="whitespace-pre-line">{m.text}</div>
              {m.rows?.length > 0 && <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[14px] text-muted">{m.rows.map((r, i) => <li key={i}>{r}</li>)}</ul>}
              {m.who === 'bot' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => v.replay(m.text)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-700" aria-label={T('আবার শুনুন', 'Hear again')}><Volume2 size={14} />{T('শুনুন', 'Hear')}</button>
                  {m.nav && <Link to={m.nav} className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary-700"><ExternalLink size={14} />{T('পাতাটি খুলুন', 'Open the page')}</Link>}
                </div>
              )}
            </div>
          </div>
        ))}
        {v.interim && <div className="flex justify-end"><div className="max-w-[88%] rounded-2xl bg-primary-100 px-4 py-3 text-[16px] text-primary-900">{v.interim}…</div></div>}
        <div ref={endRef} />
      </div>

      {last?.who === 'bot' && last.chips?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border bg-white px-3 py-2" aria-label={T('বলার উদাহরণ', 'Suggestions')}>
          {last.chips.map((c) => <button key={c} type="button" onClick={() => v.send(c)} className="shrink-0 rounded-full border border-primary-200 bg-primary-50 px-3.5 py-2 text-[14px] font-semibold text-primary-800 hover:bg-primary-100">{c}</button>)}
        </div>
      )}

      <div className="border-t border-border bg-white p-3">
        {v.error ? <Note tone="warn" className="mb-2">{L(ERR[v.error] ?? ERR['stt-error'])}</Note> : supportNote(v.support) && <Note className="mb-2">{L(supportNote(v.support))}</Note>}
        {v.support.bnVoice === false && v.autoSpeak && <Note className="mb-2">{T('এই ডিভাইসে বাংলা কণ্ঠ নেই। আগে স্বাভাবিক অনলাইন বাংলা কণ্ঠের চেষ্টা হবে; সেটি না চললে ডিভাইসের সেটিংসে বাংলা কণ্ঠ নামিয়ে নিন।', 'This device has no built-in Bangla voice. The assistant first tries natural online speech; if that is unavailable, install a Bengali voice in your device settings.')}</Note>}
        {v.autoSpeak && v.support.tts && <p className="mb-2 px-1 text-[12px] leading-5 text-muted">{T('আগে স্বাভাবিক বাংলাদেশি বাংলা ও ব্রিটিশ ইংরেজি কণ্ঠ ব্যবহার করি; অনলাইন কণ্ঠ না চললে ডিভাইসের কণ্ঠে ফিরে যাই।', 'The assistant tries natural Bangladeshi Bangla and British English first, then falls back to your device’s voice if online speech is unavailable.')}</p>}
        <div className="flex items-center gap-3">
          <button type="button" onClick={v.listening ? v.toggleListen : v.speaking ? v.silence : v.toggleListen} aria-pressed={v.listening}
            className={`relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full text-white shadow-lg transition ${v.listening ? 'bg-red-600' : 'bg-primary-600 hover:bg-primary-700'}`}
            aria-label={v.listening ? T('শোনা থামান', 'Stop listening') : v.speaking ? T('বলা থামান', 'Stop speaking') : T('বলতে মাইক চাপুন', 'Tap to speak')}>
            {v.listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />}
            {v.listening || v.speaking ? <Square size={26} className="relative" /> : <Mic size={30} className="relative" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold text-muted" aria-live="polite">{status}</div>
            <form onSubmit={submit} className="mt-1 flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-border px-3 text-[16px] outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50" placeholder={T('অথবা এখানে লিখুন', 'Or type here')} aria-label={T('প্রশ্ন লিখুন', 'Type your question')} />
              <button type="submit" className="grid h-11 w-11 place-items-center rounded-xl bg-primary-600 text-white hover:bg-primary-700" aria-label={T('পাঠান', 'Send')}><Send size={17} /></button>
            </form>
          </div>
        </div>
        <label className="mt-2 flex items-center gap-2 text-[13px] text-muted"><input type="checkbox" checked={v.handsFree} onChange={(e) => v.setHandsFree(e.target.checked)} />{T('উত্তরের পর নিজে থেকে আবার শুনুক (ফোনে হাত খালি না থাকলে)', 'Keep listening after each reply (hands-free)')}</label>
      </div>
    </Card>
  );
}
