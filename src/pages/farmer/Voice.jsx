// The farmer's field assistant, two ways: as a phone call (call button, hands-free talk, keypad menu) or as a chat
// (mic and typing). One voice agent serves both, so switching keeps the conversation.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessagesSquare, MapPin, Sprout, Droplets, Wheat, Send, ListChecks } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Note, Segmented, LABEL_STYLE, WATER_STYLE } from '../../components/ui';
import { VoiceChat } from '../../voice/VoiceAssistant';
import PhoneCall, { KEY_MENU } from '../../voice/PhoneCall';
import { useVoiceAgent } from '../../voice/useVoiceAgent';
import { WATER_COLORS } from '../../engine/water';
import { fmtRange, bnDigits } from '../../engine/dates';
import { STORAGE_PREFIX } from '../../config/brand';

const MODE_KEY = `${STORAGE_PREFIX}.voiceMode`;
const savedMode = () => { try { return localStorage.getItem(MODE_KEY) || 'phone'; } catch { return 'phone'; } };

// What the call is about, from the farmer's own plan, field and today's water, plus what was asked on this call.
function CallSummary({ v }) {
  const { T, L, farmer, chosen, decision, water, activeParcel, s } = useStore();
  const asked = v.messages.filter((m) => m.who === 'user');
  const sent = v.messages.filter((m) => m.who === 'bot' && m.effects > 0).length;
  const mine = s.requests.filter((r) => r.farmerId === farmer.id && r.status === 'open').length;
  const rows = [
    [MapPin, T('জমি', 'Field'), `${activeParcel ? `${L(activeParcel.name)}, ` : ''}${T(`${bnDigits(farmer.area_dec)} শতক`, `${farmer.area_dec} decimal`)}`],
    [Sprout, T('এই রবির পরামর্শ', 'This Rabi’s advice'), `${L(LABEL_STYLE[decision.label].short)}: ${L(chosen.crop.name)}`],
    [Droplets, T('আজকের সেচ', 'Water today'), `${L(WATER_STYLE[water.color])}, ${L(WATER_COLORS[water.color])}`],
    [Wheat, T('ফসল তোলা', 'Harvest'), fmtRange(chosen.hw.start, chosen.hw.end, s.lang)],
    [Send, T('খোলা অনুরোধ', 'Open requests'), T(`${bnDigits(mine)}টি${sent ? `, এই কলে পাঠানো ${bnDigits(sent)}টি` : ''}`, `${mine}${sent ? `, ${sent} sent on this call` : ''}`)],
  ];
  return (
    <Card className="p-5">
      <h2 className="text-[17px] font-bold">{T(`${L(farmer.name)}-এর কলের সারাংশ`, `Call summary for ${L(farmer.name)}`)}</h2>
      <p className="text-[13px] text-muted">{T('সহকারী এই তথ্য দেখেই উত্তর দেয়, নিজে কিছু বানায় না।', 'The assistant answers from exactly this; it makes nothing up.')}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(([Icon, k, val]) => (
          <div key={k} className="rounded-xl bg-canvas px-3 py-2.5"><dt className="flex items-center gap-1.5 text-[12.5px] text-muted"><Icon size={14} className="text-primary-600" />{k}</dt><dd className="mt-0.5 text-[14.5px] font-semibold leading-5">{val}</dd></div>
        ))}
      </dl>
      <h3 className="mt-4 flex items-center gap-1.5 text-[14px] font-bold"><ListChecks size={15} className="text-primary-600" />{T('এই কলে যা জিজ্ঞেস করেছেন', 'Asked on this call')}</h3>
      {asked.length ? <ol className="mt-1.5 space-y-0.5 pl-5 text-[14px] text-ink/80" style={{ listStyleType: s.lang === 'bn' ? 'bengali' : 'decimal' }}>{asked.slice(-6).map((m) => <li key={m.id}>{m.text}</li>)}</ol>
        : <p className="mt-1 text-[13.5px] text-muted">{T('এখনো কিছু না। কল শুরু করে বলুন বা নম্বর চাপুন।', 'Nothing yet. Start the call and speak or press a key.')}</p>}
    </Card>
  );
}

export default function Voice() {
  const { T, L } = useStore();
  const v = useVoiceAgent('farmer');
  const [mode, setModeState] = useState(savedMode);
  const setMode = (m) => { setModeState(m); try { localStorage.setItem(MODE_KEY, m); } catch { /* fine */ } v.setHandsFree(false); v.silence(); };
  const ex = [
    T('এই রবিতে কী লাগাব?', 'What should I plant this Rabi?'), T('আজ সেচ লাগবে?', 'Do I need to water today?'), T('ফসল কবে উঠবে, কত মণ হবে?', 'When is my harvest and how many maund?'),
    T('সবাই একসঙ্গে লাগালে দাম পড়বে?', 'Will prices fall if everyone plants together?'), T('এরপর কোন ফসল করব?', 'What comes after this crop?'), T('টমেটোর পাতায় দাগ পড়ছে', 'Brown spots on my tomato leaves'), T('এই হিসাব কোথা থেকে এল?', 'Where do these numbers come from?'),
  ];
  return (
    <div>
      <PageHeader eyebrow={T('কথা বলে জানুন', 'Ask by voice')} title={T('মাঠের সহকারী', 'Field assistant')}
        subtitle={T('ফোনের মতো কল করে কথা বলুন বা নম্বর চাপুন, অথবা চ্যাটে মাইক চেপে বা লিখে জিজ্ঞেস করুন। উত্তর আসে আপনার জমি আর ২৫ বছরের নাসা আবহাওয়ার হিসাব থেকে; কিছু পাঠানোর আগে আমি আপনার অনুমতি নিই।', 'Call it like a phone and talk or press keys, or use the chat with the mic or typing. Answers come from your field and 25 years of NASA weather; I always ask before sending anything.')} tags={['RULE']} />
      <Segmented value={mode} onChange={setMode} className="mb-5 grid w-full max-w-md grid-cols-2"
        options={[{ value: 'phone', icon: Phone, label: T('ফোনে কল', 'Phone call') }, { value: 'chat', icon: MessagesSquare, label: T('চ্যাট (ফোন ছাড়া)', 'Chat (no phone)') }]} />
      {mode === 'phone' ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <PhoneCall v={v} />
          <div className="space-y-4">
            <CallSummary v={v} />
            <Card className="p-5">
              <h2 className="text-[16px] font-bold">{T('নম্বরের মেনু', 'Key menu')}</h2>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[14px] text-ink/80">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '#', '*'].map((k) => <li key={k}><b className="inline-block w-5 text-primary-700">{typeof k === 'number' ? T(bnDigits(k), String(k)) : k}</b> {L(KEY_MENU[k])}</li>)}
              </ul>
              <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('সাধারণ ফোন থেকে কল করার লাইনেও একই মেনু ও একই সহকারী চলে (services/voice-agent); এখানে সেটাই ব্রাউজারে।', 'The phone line for ordinary phones runs the same menu and the same assistant (services/voice-agent); this is it in the browser.')}</p>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <VoiceChat v={v} />
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="text-[17px] font-bold">{T('যেমন বলতে পারেন', 'Things you can say')}</h2>
              <ul className="mt-2 space-y-1.5 text-[15px] text-ink/80">{ex.map((e) => <li key={e}><button type="button" onClick={() => v.send(e)} className="text-left hover:text-primary-700">“{e}”</button></li>)}</ul>
            </Card>
            <Note>{T('ফোন ছাড়া: মাইক চেপে বলুন বা লিখুন। ফোনের মতো চালাতে ওপরে "ফোনে কল" বেছে নিন।', 'Without a phone: tap the mic or type. To use it like a phone, pick "Phone call" above.')}</Note>
            <Link to="/farmer/help" className="inline-block text-[14px] font-semibold text-primary-700">{T('লিখে জানাতে চান? সাহায্য পাতা', 'Prefer to write? Help page')}</Link>
          </div>
        </div>
      )}
    </div>
  );
}
