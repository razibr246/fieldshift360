// FieldShift by SMS, for farmers with a feature phone: a keyword or an everyday Bangla question in, the same answer
// as the voice assistant out (voice/brain.js on the same snapshot), cut into SMS parts the way phones count Bangla
// (70 characters, 67 a part when it runs over). "চক্র" (ROT) answers from Field Future: the best ten-year rotation
// for the field. This page simulates the phone; a real service puts an SMS gateway on a short code in front of the
// same functions.
import { useMemo, useRef, useState } from 'react';
import { Send, MessageSquareText, Smartphone, Server, Repeat } from 'lucide-react';
import { useStore, soilData, demo } from '../../store';
import { PageHeader, Card, Tags, Note } from '../../components/ui';
import { num } from '../../engine/dates';
import { smsSplit } from '../../engine/text';
import { createSession, respond } from '../../voice/brain';
import { farmerSnapshot } from '../../voice/snapshot';
import { useSeenRotation } from '../../components/fields/useSeenRotation';
import deltas from '../../data/climate/cmip6_deltas.json';
import { climateChange, fieldContext, fieldFuture, cropOf, WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';

const KEYS = [
  { k: 'পরিকল্পনা', en: 'PLAN', ask: 'এই রবিতে কী লাগাব' },
  { k: 'চক্র', en: 'ROT', rot: true },
  { k: 'পানি', en: 'WATER', ask: 'আজ সেচ দেব কি' },
  { k: 'বৃষ্টি', en: 'RAIN', ask: 'বৃষ্টি হবে কি' },
  { k: 'দাম', en: 'PRICE', ask: 'দাম কবে পড়ে' },
  { k: 'সাহায্য', en: 'HELP', help: true },
];

export default function SmsMode() {
  const store = useStore();
  const { s, T, L, farmer, soil, clim, econ, chosen, rotation, upazila, activeParcel } = store;
  const lang = s.lang;
  const session = useRef(createSession({ role: 'farmer', lang }));
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const seen = useSeenRotation(activeParcel);
  const lastCrop = seen?.usable ? seen.rabiCrop : farmer.last_crop;
  // Field Future for the ROT keyword, worked out once for this field.
  const ff = useMemo(() => {
    const ctx = fieldContext({ clim, change: climateChange(deltas, upazila.id), soil, plot: farmer, amanT: rotation.amanMeasured ? rotation.amanT : null, econ });
    return fieldFuture({ ctx, lastCrop, plan: { rabi: chosen.crop.id, k1: rotation.best?.crop.id ?? 'fallow' }, priorities: s.priorities });
  }, [clim, upazila.id, soil, farmer, rotation, econ, lastCrop, chosen.crop.id, s.priorities]);

  const rotReply = () => {
    const b = ff.best, h = ff.habit;
    const crops = b.rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name)).join('-')).join(T(', পরের বছর ', ', next year '));
    const water = (h.sNow.waterMm - b.sNow.waterMm) * WATER_M3_PER_MM_BIGHA;
    const d = Math.round(b.sNow.dSoc * 10) / 10;
    return T(`এবার রবিতে: ${chosen.crop.name.bn}। দশ বছরের সেরা ফসলচক্র: ${crops}${b.rot.residue === 'retain' ? ', খড় জমিতে রাখুন' : ''}। ১০ বছরে মাটির জৈব পদার্থ ${d >= 0 ? '+' : ''}${num(d, 'bn', { dp: 1 })}%, সেচ বিঘায় বছরে ${num(water, 'bn')} ঘনমিটার কম। বিস্তারিত: কৃষি অফিস।`,
      `This Rabi: ${chosen.crop.name.en}. Best ten-year rotation: ${crops}${b.rot.residue === 'retain' ? ', keep the straw' : ''}. Soil organic matter ${d >= 0 ? '+' : ''}${d}% in 10 years, ${num(water, 'en')} m³ less irrigation a bigha a year. More: the agriculture office.`);
  };
  const helpReply = () => T(`লিখে পাঠান: ${KEYS.filter((x) => !x.help).map((x) => x.k).join(', ')}। অথবা নিজের ভাষায় প্রশ্ন।`, `Send: ${KEYS.filter((x) => !x.help).map((x) => x.en).join(', ')}. Or ask in your own words.`);

  const send = (raw) => {
    const q = raw.trim();
    if (!q) return;
    const key = KEYS.find((x) => q === x.k || q.toUpperCase() === x.en);
    let reply;
    if (key?.help) reply = helpReply();
    else if (key?.rot) reply = rotReply();
    else {
      const snap = farmerSnapshot(store, { clim, soilData, unions: demo.unions });
      const r = respond(key?.ask ?? q, snap, session.current);
      session.current = r.session;
      for (const e of r.effects) if (e.type === 'addRequest') { store.dispatch({ type: 'addRequest', req: e.req }); store.toast('অনুরোধ পাঠানো হয়েছে', 'Request sent'); }
      reply = r.say;
    }
    const parts = smsSplit(reply);
    setMsgs((m) => [...m, { who: 'farmer', text: q }, ...parts.map((p, i) => ({ who: 'fs', text: parts.length > 1 ? `${p} (${num(i + 1, lang)}/${num(parts.length, lang)})` : p }))]);
    setText('');
  };
  const replies = msgs.filter((m) => m.who === 'fs').length;

  return (
    <div>
      <PageHeader eyebrow={T('ফিচার ফোনেও', 'On a feature phone too')} title={T('এসএমএসে FieldShift', 'FieldShift by SMS')}
        subtitle={T('স্মার্টফোন বা ইন্টারনেট ছাড়াই: একটি শব্দ বা নিজের ভাষায় প্রশ্ন লিখে পাঠালে একই হিসাবের উত্তর আসে, বাংলায়, এসএমএসের মাপে।', 'No smartphone or internet needed: send a word, or a question in your own words, and the same working answers in Bangla, cut to SMS size.')} tags={['RULE']} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        {/* The phone */}
        <div className="mx-auto w-full max-w-[380px] rounded-[42px] bg-[#1c2420] p-3 shadow-2xl">
          <div className="rounded-[32px] bg-[#eef2ec] p-3">
            <div className="flex items-center gap-2 border-b border-black/10 pb-2 text-[13px] font-semibold"><MessageSquareText size={15} className="text-primary-700" />FS360 · {L(farmer.name)}</div>
            <div className="h-[420px] space-y-2 overflow-y-auto py-3 pr-1" aria-live="polite">
              {!msgs.length && <p className="px-2 text-center text-[13px] text-muted">{T('নিচের একটি শব্দে চাপুন, বা লিখে পাঠান।', 'Tap a word below, or type and send.')}</p>}
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.who === 'farmer' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[85%] rounded-2xl px-3 py-2 text-[14px] leading-5 ${m.who === 'farmer' ? 'rounded-br-md bg-primary-700 text-white' : 'rounded-bl-md bg-white text-ink shadow-sm'}`}>{m.text}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {KEYS.map((x) => <button key={x.k} type="button" onClick={() => send(lang === 'bn' ? x.k : x.en)} className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold text-primary-800 shadow-sm">{lang === 'bn' ? x.k : x.en}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2">
              <input aria-label={T('এসএমএস লিখুন', 'Type an SMS')} value={text} onChange={(e) => setText(e.target.value)} placeholder={T('যেমন: এই ধান কাটার পর কী লাগামু', 'e.g. what do I plant after this rice')} className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-3 py-2 text-[14px]" />
              <button type="submit" aria-label={T('পাঠান', 'Send')} className="grid h-10 w-10 place-items-center rounded-full bg-primary-700 text-white"><Send size={16} /></button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-bold"><Smartphone size={18} className="text-primary-700" />{T('কী কী লেখা যায়', 'What you can send')}</h2>
            <ul className="mt-2 space-y-1.5 text-[14.5px] leading-6">
              <li><b>{T('পরিকল্পনা', 'PLAN')}</b>: {T('এই রবিতে কোন ফসল, কবে লাগাবেন', 'which crop this Rabi, and when')}</li>
              <li><b>{T('চক্র', 'ROT')}</b>: {T('দশ বছরের সেরা ফসলচক্র, মাটি আর পানির হিসাব', 'the best ten-year rotation, with soil and water')}</li>
              <li><b>{T('পানি', 'WATER')}</b>: {T('আজ সেচ দেবেন কি না', 'whether to irrigate today')}</li>
              <li><b>{T('বৃষ্টি', 'RAIN')}</b>: {T('সামনের দিনের বৃষ্টি', 'rain in the coming days')}</li>
              <li><b>{T('দাম', 'PRICE')}</b>: {T('কবে দাম পড়ে', 'when prices dip')}</li>
              <li>{T('অথবা নিজের ভাষায়, যেমন "জমিতে পোকা লাগছে" (কৃষি অফিসে অনুরোধ যায়, "হ্যাঁ" লিখলে)।', 'Or in your own words, such as "pests in my field" (a request goes to the agriculture office once you reply "yes").')}</li>
            </ul>
            <Tags list={['RULE']} />
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-bold"><Repeat size={18} className="text-primary-700" />{T('এই কথোপকথনে', 'In this conversation')}</h2>
            <p className="mt-1 text-[14.5px]">{T(`${num(replies, 'bn')}টি এসএমএস উত্তর। প্রতিটি বাংলা এসএমএস ৭০ অক্ষরের, লম্বা হলে ৬৭ অক্ষরের ভাগে।`, `${replies} SMS replies. A Bangla SMS holds 70 characters, or 67 a part when it runs longer.`)}</p>
          </Card>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[18px] font-bold"><Server size={18} className="text-primary-700" />{T('আসল ব্যবস্থায়', 'In a real service')}</h2>
            <p className="mt-1 text-[14px] leading-6 text-muted">{T('একটি শর্টকোডে আসা এসএমএস একটি এসএমএস গেটওয়ে থেকে এই একই উত্তর-যন্ত্রে যায় (ভয়েস সহকারীর মতোই), কৃষকের নিবন্ধিত মোবাইল নম্বর দিয়ে তাঁর জমি চেনা যায়, আর উত্তর এসএমএসে ফেরে। এই পাতা সেই ফোনের অনুকরণ; এখানে কোনো এসএমএস পাঠানো হয় না।', 'An SMS to a short code goes through an SMS gateway into these same answer functions (as the voice assistant uses), the farmer’s registered mobile number finds their field, and the answer goes back by SMS. This page simulates that phone; no SMS is sent from here.')}</p>
          </Card>
          <Note tone="info">{T('উত্তরগুলো নমুনা কৃষকের জমির হিসাব থেকে। চূড়ান্ত সিদ্ধান্তের আগে কৃষি কর্মকর্তার সঙ্গে কথা বলুন।', 'The answers come from the sample farmer’s field. Talk to the agriculture officer before a final decision.')}</Note>
        </div>
      </div>
    </div>
  );
}
