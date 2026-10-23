// The first thing a farmer sees when the agriculture office has written to them: the unread messages, newest first,
// with "seen" and a way to the Help page, and an offer to turn on phone notifications for the next one.
// "Later" hides it until the app is opened again; "Seen" marks the messages read (the bell count drops too).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareText, X, BellRing, CheckCircle2, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { Button } from './ui';
import { fmtDate, bnDigits } from '../engine/dates';
import { STORAGE_PREFIX } from '../config/brand';

const LATER = `${STORAGE_PREFIX}.msgLater`;
const laterSet = () => { try { return new Set(JSON.parse(sessionStorage.getItem(LATER) || '[]')); } catch { return new Set(); } };

export default function MessagePopup() {
  const { s, T, unreadMsgs, markSeen, upazila, farmer } = useStore();
  const lang = s.lang;
  const navigate = useNavigate();
  const [later, setLater] = useState(laterSet);
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const show = unreadMsgs.filter((m) => !later.has(m.id));
  const box = useRef(null);
  useEffect(() => { if (show.length) box.current?.focus(); }, [show.length]);
  if (!show.length) return null;
  const close = () => {
    const next = new Set([...later, ...show.map((m) => m.id)]);
    try { sessionStorage.setItem(LATER, JSON.stringify([...next])); } catch { /* fine */ }
    setLater(next);
  };
  const seen = () => markSeen(show.map((m) => m.id));
  const kind = (m) => (m.request ? T('আপনার অনুরোধের উত্তর', 'Reply to your request') : m.weather ? T('আবহাওয়ার সতর্কতা', 'Weather warning') : m.cluster ? T('আপনার এলাকার সবার জন্য পরামর্শ', 'Advice for your area') : m.upazila ? T('উপজেলা কৃষি অফিসের বার্তা', 'From the upazila office') : T('কৃষি কর্মকর্তার বার্তা', 'From your officer'));
  return (
    <div className="fixed inset-0 z-[1600] flex items-end justify-center p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="msg-pop-title" onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet-fade absolute inset-0 bg-primary-950/55 backdrop-blur-[4px]" onClick={close} />
      <div ref={box} tabIndex={-1} className="sheet-up relative max-h-[86vh] w-full max-w-lg overflow-hidden rounded-[26px] border border-white/60 bg-white shadow-[0_24px_64px_-16px_rgba(13,38,20,0.5)] outline-none will-change-transform">
        <div className="flex items-start gap-3 bg-gradient-to-r from-primary-800 to-primary-700 px-5 py-4 text-white">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/20 shadow-inner"><MessageSquareText size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="msg-pop-title" className="text-[18px] font-bold leading-tight">{T(`কৃষি কর্মকর্তার ${bnDigits(show.length)}টি নতুন বার্তা`, `${show.length} new message${show.length > 1 ? 's' : ''} from your officer`)}</h2>
            <p className="text-[13px] text-white/80">{T(`${upazila.name.bn} উপজেলা কৃষি অফিস থেকে, ${farmer.name.bn}-এর জন্য`, `From the ${upazila.name.en} upazila agriculture office, for ${farmer.name.en}`)}</p>
          </div>
          <button type="button" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 transition-transform hover:scale-105 hover:bg-white/25 active:scale-95" aria-label={T('পরে দেখব', 'Later')}><X size={18} /></button>
        </div>
        <ul className="max-h-[48vh] space-y-2.5 overflow-y-auto p-4">
          {show.map((m, i) => (
            <li key={m.id} style={{ animation: 'page-in 0.4s var(--ease-spring) both', animationDelay: `${i * 65}ms` }} className="rounded-2xl border border-primary-100 bg-primary-50/70 p-3.5 transition-all duration-200 hover:border-primary-200 hover:shadow-sm">
              <div className="text-[12.5px] font-semibold text-primary-700">{kind(m)} · {fmtDate(m.at ?? m.sent, lang)}</div>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-7 text-ink">{m.text}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-border p-4">
          {perm === 'default' && (
            <button type="button" onClick={async () => { try { setPerm(await Notification.requestPermission()); } catch { /* blocked */ } }}
              className="flex w-full items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-left text-[13.5px] font-semibold text-sky-900 transition hover:bg-sky-100 hover:shadow-sm active:scale-[0.98]">
              <BellRing size={17} className="shrink-0 text-sky-700" />{T('পরের বার্তা এলেই ফোনে জানাতে নোটিফিকেশন চালু করুন', 'Turn on notifications to hear about the next message at once')}
            </button>
          )}
          {perm === 'granted' && <p className="flex items-center gap-1.5 text-[12.5px] text-muted"><CheckCircle2 size={14} className="text-primary-600" />{T('নোটিফিকেশন চালু আছে', 'Notifications are on')}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={seen} className="py-3"><CheckCircle2 size={17} />{T('দেখেছি', 'Got it')}</Button>
            <Button variant="secondary" onClick={() => { seen(); navigate('/farmer/help'); }} className="py-3">{T('সাহায্য পাতায়', 'Open Help')}<ChevronRight size={16} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
