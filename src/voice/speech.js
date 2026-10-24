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

// The most human-sounding voice for the language: within the preferred locales (Bangladeshi Bangla first), a neural
// voice beats the old concatenative ones. Browsers name them: Edge "… Online (Natural)", Chrome "Google …", Apple
// "… (Enhanced)" or "(Premium)" once downloaded in Settings.
const NATURAL = /natural|neural|online|enhanced|premium|google/i;
export function pickVoice(voices, lang) {
  const want = lang === 'bn' ? ['bn-bd', 'bn-in', 'bn'] : ['en-in', 'en-gb', 'en-us', 'en'];
  const code = (x) => x.lang.toLowerCase().replace('_', '-');
  for (const c of want) {
    const here = voices.filter((x) => code(x) === c || (c.length === 2 && code(x).startsWith(c)));
    if (here.length) return here.find((x) => NATURAL.test(x.name)) ?? here[0];
  }
  return null;
}
export const isNaturalVoice = (v) => !!v && NATURAL.test(v.name);

// Chrome cuts long utterances off after ~15 s, so speak sentence by sentence; "…" marks a longer, deliberate pause.
const chunks = (text) => text.split(/(?<=[।.?!…])\s+/).map((s) => s.trim()).filter(Boolean);

// gap: a breath between sentences, in ms (0 queues them back to back, as the voice assistant wants); a sentence
// ending in "…" is followed by twice that, like a speaker letting a point land.
let run = 0;
export async function speak(text, lang, { rate = 0.95, pitch = 1, gap = 0, onEnd } = {}) {
  if (!ttsSupported()) return { ok: false, reason: 'unsupported' };
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);
  w.speechSynthesis.cancel();
  if (!voice && lang === 'bn') { onEnd?.(); return { ok: false, reason: 'no-bangla-voice' }; }
  const parts = chunks(text);
  const me = ++run;
  const say = (p, last, next) => {
    const u = new SpeechSynthesisUtterance(p.replace(/…$/, '।'));
    u.lang = voice?.lang ?? LANG[lang];
    if (voice) u.voice = voice;
    u.rate = rate; u.pitch = pitch;
    u.onend = () => (last ? onEnd?.() : next?.());
    u.onerror = () => (last ? onEnd?.() : next?.());
    w.speechSynthesis.speak(u);
  };
  if (!gap) parts.forEach((p, i) => say(p, i === parts.length - 1));
  else {
    const step = (i) => { if (me !== run) return; say(parts[i], i === parts.length - 1, () => setTimeout(() => step(i + 1), parts[i].endsWith('…') ? gap * 2 : gap)); };
    step(0);
  }
  return { ok: true, voice: voice?.name ?? null };
}

export const stopSpeaking = () => { run++; try { w.speechSynthesis?.cancel(); } catch { /* nothing playing */ } };
