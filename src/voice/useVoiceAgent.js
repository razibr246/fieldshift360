import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore, soilData, demo } from '../store';
import { createSession, greeting, respond } from './brain.js';
import { farmerSnapshot, officerSnapshot } from './snapshot.js';
import { createRecognizer, sttSupported, ttsSupported, speakNatural, stopSpeaking, loadVoices, pickVoice, voiceSupport } from './speech.js';
import { replyTemplate as template, advisoryText } from '../engine/advice.js';
import { useRadar } from '../radar/useRadar';
import { districtOf } from '../radar/aman';

let uid = 0;
const mk = (who, text, extra = {}) => ({ id: `m${++uid}`, who, text, ...extra });

// Ties the pure brain to the app: snapshot in, effects out (applied through the same reducer actions the buttons use),
// and browser speech in both directions.
export function useVoiceAgent(role) {
  const store = useStore();
  const ref = useRef(store);
  ref.current = store;
  const radar = useRadar(role !== 'farmer', districtOf(store.officerUpazila.id), store.officerUpazila.id);
  const radarRef = useRef(radar);
  radarRef.current = radar;

  const sessionRef = useRef(null);
  if (!sessionRef.current || sessionRef.current.role !== role) sessionRef.current = createSession({ role, lang: store.s.lang });

  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [handsFree, setHandsFree] = useState(false);
  const [bnVoice, setBnVoice] = useState(null); // null = unknown yet
  const recRef = useRef(null);
  const flags = useRef({});
  flags.current = { autoSpeak, handsFree };

  const snapNow = useCallback(() => {
    const c = ref.current;
    return role === 'farmer'
      ? farmerSnapshot(c, { clim: c.clim, soilData, unions: demo.unions })
      : officerSnapshot(c, role, { clim: c.officerClim, soilData, templateFn: template, advisoryFn: advisoryText, radar: radarRef.current.summary });
  }, [role]);

  useEffect(() => { loadVoices().then((v) => setBnVoice(!!pickVoice(v, 'bn'))); }, []);

  const apply = useCallback((effects) => {
    const c = ref.current;
    for (const e of effects) {
      if (e.type === 'addRequest') { c.dispatch({ type: 'addRequest', req: e.req }); c.toast('অনুরোধ পাঠানো হয়েছে', 'Request sent'); }
      else if (e.type === 'addAdvisory') c.dispatch({ type: 'addAdvisory', adv: e.adv });
      else if (e.type === 'updateRequest') c.dispatch({ type: 'updateRequest', ids: e.ids, patch: e.patch });
      else if (e.type === 'escalate') c.dispatch({ type: 'escalate', esc: e.esc });
      else if (e.type === 'setLang') c.dispatch({ type: 'set', patch: { lang: e.lang } });
      else if (e.type === 'stop') { stopSpeaking(); setSpeaking(false); }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!sttSupported()) { setError('no-stt'); return; }
    stopSpeaking(); setSpeaking(false); setError(null); setInterim('');
    const rec = createRecognizer({
      lang: sessionRef.current.lang,
      onStart: () => setListening(true),
      onInterim: (t) => setInterim(t),
      onFinal: (t) => { setInterim(''); sendRef.current(t); },
      onEnd: () => { setListening(false); setInterim(''); },
      onError: (code) => { setListening(false); setError(code === 'not-allowed' || code === 'service-not-allowed' ? 'mic-denied' : code === 'no-speech' ? 'no-speech' : code === 'language-not-supported' ? 'lang-unsupported' : code === 'network' ? 'net-needed' : 'stt-error'); },
    });
    recRef.current = rec;
    try { rec.start(); } catch { setListening(false); }
  }, []);

  const say = useCallback(async (text) => {
    if (!flags.current.autoSpeak || !ttsSupported()) return { ok: false, reason: 'unsupported' };
    setSpeaking(true);
    const r = await speakNatural(text, sessionRef.current.lang, { onEnd: () => { setSpeaking(false); if (flags.current.handsFree) startListening(); } });
    if (sessionRef.current.lang === 'bn') setBnVoice(!!r.voice);
    if (!r.ok) {
      setSpeaking(false);
      if (r.reason === 'no-bangla-voice') setBnVoice(false);
      if (flags.current.handsFree) startListening();
    }
    return r;
  }, [startListening]);

  const send = useCallback((text, opts = {}) => {
    const clean = String(text ?? '').trim();
    if (!clean) return;
    const c = ref.current;
    const session = sessionRef.current;
    session.lang = c.s.lang;
    setMessages((m) => [...m, mk('user', clean, { spoken: !!opts.spoken })]);
    const res = respond(clean, snapNow(), session);
    apply(res.effects);
    setMessages((m) => [...m, mk('bot', res.say, { rows: res.rows, chips: res.chips, nav: res.nav, effects: res.effects.filter((e) => e.type !== 'stop' && e.type !== 'setLang').length })]);
    say(res.say);
  }, [apply, say, snapNow]);
  const sendRef = useRef(send);
  sendRef.current = send;

  const stopListening = useCallback(() => { try { recRef.current?.stop(); } catch { /* not started */ } setListening(false); }, []);
  const toggleListen = useCallback(() => { if (listening) stopListening(); else startListening(); }, [listening, startListening, stopListening]);

  const replay = useCallback((text) => say(text), [say]);
  const silence = useCallback(() => { stopSpeaking(); setSpeaking(false); }, []);

  // Greeting appears as text immediately; it is only spoken after the person's first tap (browsers block autoplay audio).
  const reset = useCallback(() => {
    stopSpeaking(); stopListening();
    const session = createSession({ role, lang: ref.current.s.lang });
    sessionRef.current = session;
    const g = greeting(snapNow(), session);
    setMessages([mk('bot', g.say, { chips: g.chips })]);
    return g.say;
  }, [role, snapNow, stopListening]);
  useEffect(() => { reset(); return () => { stopSpeaking(); try { recRef.current?.abort(); } catch { /* idle */ } }; }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages, listening, speaking, interim, error, autoSpeak, setAutoSpeak, handsFree, setHandsFree, send, toggleListen, replay, silence, reset,
    support: { ...voiceSupport(), bnVoice }, radarStatus: radar.status,
    // What the brain is waiting for (a yes/no, or dictation), so the phone keypad can answer 1 = yes, 2 = no.
    pending: sessionRef.current.state?.kind ?? null, startListening, stopListening,
  };
}
