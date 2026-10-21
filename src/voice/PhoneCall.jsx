// The field assistant as a phone call: call and hang up, talk hands-free, or press keys like a phone menu (the same
// 1–9 menu the phone line in services/voice-agent offers). It drives the same voice agent as the chat view, so the
// conversation carries over between the two. Key presses play the real DTMF tone pair for that key.
import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, PhoneCall as PhoneCallIcon } from 'lucide-react';
import { useStore } from '../store';
import { LogoGlyph } from '../components/brand/BrandMark';
import { bnDigits } from '../engine/dates';
import { KEY_MENU } from './keymenu.js';

export { KEY_MENU };

// ITU-T Q.23 keypad frequencies: one low (row) and one high (column) tone per key.
const ROW = { 1: 697, 2: 697, 3: 697, 4: 770, 5: 770, 6: 770, 7: 852, 8: 852, 9: 852, '*': 941, 0: 941, '#': 941 };
const COL = { 1: 1209, 4: 1209, 7: 1209, '*': 1209, 2: 1336, 5: 1336, 8: 1336, 0: 1336, 3: 1477, 6: 1477, 9: 1477, '#': 1477 };
let audio = null;
function dtmf(key) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    g.connect(audio.destination);
    for (const f of [ROW[key], COL[key]]) { const o = audio.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.17); }
  } catch { /* no audio: the key still works */ }
}

const LETTERS = { 2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL', 6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ', 0: '+' };

export default function PhoneCall({ v }) {
  const { T, L, s } = useStore();
  const [live, setLive] = useState(false);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [pressed, setPressed] = useState(null);
  const started = useRef(0);
  useEffect(() => {
    if (!live) return undefined;
    started.current = Date.now();
    const t = setInterval(() => setSecs(Math.floor((Date.now() - started.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [live]);
  useEffect(() => () => { v.setHandsFree(false); v.silence(); v.stopListening(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const last = [...v.messages].reverse().find((m) => m.who === 'bot');
  const lastUser = [...v.messages].reverse().find((m) => m.who === 'user');
  const confirm = v.pending?.startsWith('confirm');
  const dictate = v.pending?.startsWith('dictate');

  const start = () => {
    const g = v.reset();
    setLive(true); setSecs(0); setMuted(false);
    v.setAutoSpeak(true); v.setHandsFree(true);
    // The greeting is spoken now that the person has tapped (browsers allow audio after a tap); hands-free listening
    // starts when it ends. A device that cannot speak starts listening at once.
    setTimeout(() => { if (v.support.tts) v.replay(g); else v.startListening(); }, 60);
  };
  const end = () => { setLive(false); v.setHandsFree(false); v.silence(); v.stopListening(); };
  const toggleMute = () => { if (muted) { setMuted(false); v.setHandsFree(true); v.startListening(); } else { setMuted(true); v.setHandsFree(false); v.stopListening(); } };
  const press = (k) => {
    dtmf(k);
    setPressed(k); setTimeout(() => setPressed(null), 160);
    if (!live) return;
    v.silence(); v.stopListening();
    if (confirm && (k === 1 || k === 2)) { v.send(k === 1 ? T('হ্যাঁ', 'Yes') : T('না', 'No')); return; }
    if (k === '*') { end(); return; }
    v.send(L(KEY_MENU[k].ask));
  };

  const state = !live ? { dot: 'bg-slate-500', label: T('প্রস্তুত', 'STANDBY') }
    : v.listening ? { dot: 'bg-red-500 animate-pulse', label: T('শুনছি… বলুন', 'LISTENING') }
      : v.speaking ? { dot: 'bg-emerald-400 animate-pulse', label: T('সহকারী বলছে', 'SPEAKING') }
        : { dot: 'bg-emerald-500', label: muted ? T('মাইক বন্ধ', 'MUTED') : T('কল চলছে', 'ON CALL') };
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  const activeKey = (k) => (confirm ? k === 1 || k === 2 : typeof k === 'number' && k >= 1 && k <= 9);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[24px] bg-[#101828] p-5 text-white shadow-[var(--shadow-card)] sm:p-6" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span className={`flex items-center gap-2 text-[13px] text-white/70 ${s.lang === 'bn' ? 'font-semibold' : 'font-mono tracking-wider'}`}><span className={`h-2.5 w-2.5 rounded-full ${state.dot}`} />{state.label}</span>
          <span className="flex items-center gap-2 text-[12.5px] text-white/60"><LogoGlyph size={22} inverse />{T('মাঠের সহকারী', 'Field assistant')}</span>
        </div>
        <div className="mt-4 text-center">
          <div className={`text-[44px] font-bold leading-none text-emerald-400 tabular sm:text-[52px] ${live ? 'font-mono' : 'font-display'}`}>{live ? (s.lang === 'bn' ? bnDigits(clock) : clock) : T('কল করুন', 'Call')}</div>
          <p className="mx-auto mt-4 min-h-[48px] max-w-[46ch] text-[15px] leading-6 text-white/85">
            {!live ? T('কল শুরু করতে নিচের সবুজ বোতাম চাপুন। তারপর মুখে বলুন, অথবা নম্বর চাপুন।', 'Press the green button to start, then speak or press a key.')
              : v.interim ? <span className="text-red-200">“{v.interim}…”</span>
                : last ? <span>{last.text.length > 220 ? `${last.text.slice(0, 219)}…` : last.text}</span> : null}
          </p>
          {live && lastUser && !v.interim && <p className="mt-1 text-[12.5px] text-white/50">{T('আপনি', 'You')}: “{lastUser.text}”</p>}
        </div>
        <div className="mt-4 flex h-6 items-end justify-center gap-1" aria-hidden="true">
          {Array.from({ length: 13 }, (_, i) => (
            <span key={i} className={`w-1.5 rounded-full ${live && (v.speaking || v.listening) ? (v.listening ? 'bg-red-400' : 'bg-emerald-400') : 'bg-white/20'}`}
              style={{ height: live && (v.speaking || v.listening) ? `${30 + ((i * 37) % 70)}%` : '25%', animation: live && (v.speaking || v.listening) ? `pulse ${0.6 + (i % 4) * 0.15}s ease-in-out infinite alternate` : 'none' }} />
          ))}
        </div>
      </div>

      {!live ? (
        <button type="button" onClick={start} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-600 py-4 text-[19px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(5,150,105,.7)] hover:bg-emerald-700">
          <Phone size={22} />{T('কল শুরু করুন', 'Start the call')}
        </button>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button type="button" onClick={end} className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-4 text-[18px] font-bold text-white hover:bg-red-700"><PhoneOff size={21} />{T('কল শেষ', 'Hang up')}</button>
          <button type="button" onClick={toggleMute} aria-pressed={muted} className={`grid w-16 place-items-center rounded-2xl border ${muted ? 'border-red-300 bg-red-50 text-red-700' : 'border-border bg-white text-ink'}`} aria-label={muted ? T('মাইক চালু', 'Unmute') : T('মাইক বন্ধ', 'Mute')}>{muted ? <MicOff size={21} /> : <Mic size={21} />}</button>
          <button type="button" onClick={() => v.setAutoSpeak(!v.autoSpeak)} aria-pressed={!v.autoSpeak} className="grid w-16 place-items-center rounded-2xl border border-border bg-white" aria-label={v.autoSpeak ? T('কণ্ঠ বন্ধ', 'Voice off') : T('কণ্ঠ চালু', 'Voice on')}>{v.autoSpeak ? <Volume2 size={21} /> : <VolumeX size={21} />}</button>
        </div>
      )}

      <div className="rounded-[24px] border border-border bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-semibold text-muted">{T('ফোনের মতো নম্বর চাপুন', 'Press keys like a phone menu')}</span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12.5px] font-semibold text-emerald-800">{confirm ? T('১ = হ্যাঁ, ২ = না', '1 = yes, 2 = no') : dictate ? T('এখন মুখে বলুন', 'Speak now') : T('মুখে বলুন বা চাপুন', 'Speak or press')}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((k) => (
            <button key={k} type="button" onClick={() => press(k)}
              aria-label={`${k}${KEY_MENU[k] ? `: ${L(KEY_MENU[k])}` : ''}`}
              className={`flex h-[64px] flex-col items-center justify-center rounded-2xl border text-center transition active:scale-95 sm:h-[72px] ${pressed === k ? 'scale-95' : ''} ${live && activeKey(k) ? 'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700' : 'border-border bg-canvas text-ink hover:bg-white'}`}>
              <span className="text-[22px] font-bold leading-none">{s.lang === 'bn' && typeof k === 'number' ? bnDigits(k) : k}</span>
              <span className={`mt-1 text-[10.5px] font-semibold leading-none ${live && activeKey(k) ? 'text-white/80' : 'text-muted'}`}>{confirm && (k === 1 || k === 2) ? (k === 1 ? T('হ্যাঁ', 'Yes') : T('না', 'No')) : KEY_MENU[k] ? L(KEY_MENU[k]) : LETTERS[k]}</span>
            </button>
          ))}
        </div>
        <a href="tel:16123" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 hover:bg-primary-100">
          <PhoneCallIcon size={19} className="shrink-0 text-primary-700" />
          <span className="text-[13.5px] leading-5"><b className="text-[15px] text-primary-900">{T('মানুষের সঙ্গে কথা বলতে: কৃষি কল সেন্টার ১৬১২৩', 'Talk to a person: Krishi Call Centre 16123')}</b><span className="block text-muted">{T('আসল ফোন কল, কৃষি তথ্য সার্ভিসের বিশেষজ্ঞ', 'A real phone call to Agriculture Information Service experts')}</span></span>
        </a>
      </div>
    </div>
  );
}
