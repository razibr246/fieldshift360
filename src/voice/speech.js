// Browser speech I/O for the voice assistant (Web Speech API). It needs no key and no server, so the demo works
// offline-first on Chrome / Edge / Android. Production telephony and higher-quality Bangla speech go through the
// Soniox pipeline in services/voice-agent (see docs/VOICE.md); this file is the zero-setup path.

const w = typeof window !== 'undefined' ? window : {};
export const sttSupported = () => !!(w.SpeechRecognition || w.webkitSpeechRecognition);
export const ttsSupported = () => !!w.speechSynthesis;
// What this device can do before the farmer taps anything. Chrome's listening sends the sound to Google's speech
// service, so it needs the internet; the microphone needs an https page; Bangla listening on iPhone and iPad is not
// reliable, so they are told to type.
export function voiceSupport(nav = w.navigator ?? {}) {
  const ua = nav.userAgent ?? '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  return { stt: sttSupported(), tts: ttsSupported(), online: nav.onLine !== false, secure: w.isSecureContext !== false, ios };
}

const LANG = { bn: 'bn-BD', en: 'en-US' };

export function createRecognizer({ lang, onInterim, onFinal, onStart, onEnd, onError }) {
  const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Rec) return null;
  const rec = new Rec();
  rec.lang = LANG[lang] ?? 'bn-BD';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onstart = () => onStart?.();
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim) onInterim?.(interim);
  };
  rec.onerror = (e) => onError?.(e.error || 'error');
  rec.onend = () => { const t = finalText.trim(); finalText = ''; if (t) onFinal?.(t); onEnd?.(!!t); };
  return rec;
}

// Voices load asynchronously in most browsers.
let voicesPromise = null;
export function loadVoices() {
  if (!ttsSupported()) return Promise.resolve([]);
  if (!voicesPromise) {
    voicesPromise = new Promise((resolve) => {
      const have = w.speechSynthesis.getVoices();
      if (have.length) return resolve(have);
      const done = () => resolve(w.speechSynthesis.getVoices());
      w.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
      return undefined;
    });
  }
  return voicesPromise;
}

export function pickVoice(voices, lang) {
  const want = lang === 'bn' ? ['bn-bd', 'bn-in', 'bn'] : ['en-in', 'en-us', 'en'];
  for (const code of want) {
    const v = voices.find((x) => x.lang.toLowerCase().replace('_', '-') === code) || voices.find((x) => x.lang.toLowerCase().replace('_', '-').startsWith(code));
    if (v) return v;
  }
  return null;
}

// Chrome cuts long utterances off after ~15 s, so speak sentence by sentence.
const chunks = (text) => text.split(/(?<=[।.?!])\s+/).map((s) => s.trim()).filter(Boolean);

export async function speak(text, lang, { rate = 0.95, onEnd } = {}) {
  if (!ttsSupported()) return { ok: false, reason: 'unsupported' };
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);
  w.speechSynthesis.cancel();
  if (!voice && lang === 'bn') { onEnd?.(); return { ok: false, reason: 'no-bangla-voice' }; }
  const parts = chunks(text);
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p);
    u.lang = voice?.lang ?? LANG[lang];
    if (voice) u.voice = voice;
    u.rate = rate;
    if (i === parts.length - 1) u.onend = () => onEnd?.();
    u.onerror = () => { if (i === parts.length - 1) onEnd?.(); };
    w.speechSynthesis.speak(u);
  });
  return { ok: true };
}

export const stopSpeaking = () => { try { w.speechSynthesis?.cancel(); } catch { /* nothing playing */ } };
