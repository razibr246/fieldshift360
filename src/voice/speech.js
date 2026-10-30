// Speech I/O for the voice assistant: try the configured natural voice service, then fall back to installed browser
// voices. The Soniox pipeline in services/voice-agent remains the production phone-line path.

const w = typeof window !== 'undefined' ? window : {};
export const sttSupported = () => !!(w.SpeechRecognition || w.webkitSpeechRecognition);
const browserTtsSupported = () => !!w.speechSynthesis;
export const ttsSupported = () => browserTtsSupported() || (!!w.fetch && !!w.Audio);
// What this device can do before the farmer taps anything. Chrome's listening sends the sound to Google's speech
// service, so it needs the internet; the microphone needs an https page; Bangla listening on iPhone and iPad is not
// reliable, so they are told to type.
export function voiceSupport(nav = w.navigator ?? {}) {
  const ua = nav.userAgent ?? '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  return { stt: sttSupported(), tts: ttsSupported(), online: nav.onLine !== false, secure: w.isSecureContext !== false, ios };
}

// Keep recognition tuned to the caller, and speech tuned to the voice the user asked for.
const RECOGNITION_LANG = { bn: 'bn-BD', en: 'en-US' };
const SPEECH_LANG = { bn: 'bn-BD', en: 'en-GB' };

export function createRecognizer({ lang, onInterim, onFinal, onStart, onEnd, onError }) {
  const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Rec) return null;
  const rec = new Rec();
  rec.lang = RECOGNITION_LANG[lang] ?? 'bn-BD';
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
  if (!browserTtsSupported()) return Promise.resolve([]);
  const synthesis = w.speechSynthesis;
  const available = synthesis.getVoices();
  if (available.length) return Promise.resolve(available);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    let timer;
    const finish = (timedOut = false) => {
      const voices = synthesis.getVoices();
      if (!voices.length && !timedOut) return;
      synthesis.removeEventListener?.('voiceschanged', changed);
      clearTimeout(timer);
      voicesPromise = null; // An empty timeout must not poison later attempts after the browser loads voices.
      resolve(voices);
    };
    const changed = () => finish();
    synthesis.addEventListener?.('voiceschanged', changed);
    timer = setTimeout(() => finish(true), 2000);
    finish();
  });
  return voicesPromise;
}

// The most human-sounding voice for the language: within the preferred locales (Bangladeshi Bangla first), a neural
// voice beats the old concatenative ones. Browsers name them: Edge "… Online (Natural)", Chrome "Google …", Apple
// "… (Enhanced)" or "(Premium)" once downloaded in Settings.
const NATURAL = /natural|neural|online|enhanced|premium|google/i;
export function pickVoice(voices, lang) {
  const want = lang === 'bn' ? ['bn-bd', 'bn', 'bn-in'] : ['en-gb', 'en', 'en-us', 'en-in'];
  const code = (x) => x.lang.toLowerCase().replace('_', '-');
  // Edge's Bangla women are Nabanita (Bangladesh) and Tanishaa (India), bn-BD first so Nabanita wins; its British women Sonia, Libby, Maisie.
  const feminine = /\b(female|woman|nabanita|tanishaa|sonia|libby|maisie|samantha|karen|moira|victoria|zira|susan|hazel|sara|tessa|serena)\b/i;
  for (const c of want) {
    const here = voices.filter((x) => c.length === 2 ? code(x) === c : code(x) === c || code(x).startsWith(`${c}-`));
    if (here.length) return here.find((x) => feminine.test(x.name) && NATURAL.test(x.name))
      ?? here.find((x) => feminine.test(x.name))
      ?? here.find((x) => NATURAL.test(x.name))
      ?? here.find((x) => x.default)
      ?? here[0];
  }
  return null;
}
export const isNaturalVoice = (v) => !!v && NATURAL.test(v.name);

// Chrome cuts long utterances off after ~15 s, so speak sentence by sentence; "…" marks a longer, deliberate pause.
const chunks = (text) => text.split(/(?<=[।.?!…])\s+/).map((s) => s.trim()).filter(Boolean);

// gap: a breath between sentences, in ms (0 queues them back to back, as the voice assistant wants); a sentence
// ending in "…" is followed by twice that, like a speaker letting a point land.
let run = 0;
export async function speak(text, lang, { rate = 0.97, pitch = 1, gap = 130, onEnd } = {}) {
  if (!browserTtsSupported()) return { ok: false, reason: 'unsupported' };
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);
  w.speechSynthesis.cancel();
  if (!voice && lang === 'bn') return { ok: false, reason: 'no-bangla-voice' };
  const parts = chunks(text);
  const me = ++run;
  const say = (p, last, next) => {
    const u = new SpeechSynthesisUtterance(p.replace(/…$/, '।'));
    u.lang = voice?.lang ?? SPEECH_LANG[lang];
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

// The natural voice: Gemini text-to-speech through api/tts.js (warm Bangladeshi Bangla, fluent British English), played
// as audio. Any failure (no key, offline, slow) falls back to the browser's own voice above, so speech never stops.
// The same words are not fetched twice; after a missing-key or quota response, the server is not asked again this visit.
let audio = null;
let ttsOff = false;
// Replays (the children's "Dream again", a repeated briefing) should not wait for the network again: up to 64 clips,
// and at most ~16 MB of audio text in all, the oldest dropped first.
const clips = new Map();
const MAX_CLIPS = 64, MAX_CHARS = 16_000_000;
let clipChars = 0;
const keepClip = (key, src) => {
  clips.set(key, src); clipChars += src.length;
  while (clips.size > MAX_CLIPS || (clipChars > MAX_CHARS && clips.size > 1)) {
    const [k, v] = clips.entries().next().value;
    clips.delete(k); clipChars -= v.length;
  }
};
export async function speakNatural(text, lang, opts = {}) {
  const t = String(text ?? '').trim();
  if (!t) { opts.onEnd?.(); return { ok: false, reason: 'empty' }; }
  if (!ttsOff && typeof Audio !== 'undefined' && w.navigator?.onLine !== false) {
    stopSpeaking();
    const me = run;
    try {
      const key = `${lang}|${t}`;
      let src = clips.get(key);
      if (!src) {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 12000);
        const r = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: t, lang }), signal: ctl.signal });
        clearTimeout(timer);
        if (r.status === 503 || r.status === 404 || r.status === 429) ttsOff = true;
        if (r.ok) {
          const j = await r.json();
          src = `data:${j.mime};base64,${j.audio}`;
          keepClip(key, src);
        }
      }
      if (me !== run) return { ok: false, reason: 'stopped' };
      if (src) {
        const a = new Audio(src);
        audio = a;
        a.onended = () => { if (audio === a) audio = null; opts.onEnd?.(); };
        a.onerror = () => { if (audio === a) audio = null; opts.onEnd?.(); };
        await a.play();
        return { ok: true, voice: 'gemini', natural: true };
      }
    } catch { /* autoplay blocked, timeout or offline: the browser voice speaks instead */ }
  }
  return speak(t, lang, opts);
}

export const stopSpeaking = () => {
  run++;
  try { audio?.pause(); } catch { /* not playing */ }
  audio = null;
  try { w.speechSynthesis?.cancel(); } catch { /* nothing playing */ }
};
