// The voice of চক্র এজেন্ট: natural speech from Google Gemini's text-to-speech model, a young Bangladeshi woman's Bangla
// or fluent British English. Vercel serverless function; needs GEMINI_API_KEY. GEMINI_TTS_VOICE_BN / _EN / GEMINI_TTS_VOICE
// and GEMINI_TTS_MODEL override the choices below. Without a key, or once the day's quota is used, it answers an error
// and the browser speaks with its own voice (src/voice/speech.js).
//   POST /api/tts  { text, lang: 'bn'|'en' }  → { audio: <base64 WAV>, mime: 'audio/wav', voice, model }
const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_TEXT = 900;

const STYLE = {
  bn: 'A naturally warm, expressive adult Bangladeshi woman speaking clear, everyday standard Bangla from Bangladesh. Use native Bangladeshi pronunciation, gentle local intonation, flowing speech, naturally varied pitch, soft sentence endings, realistic rhythm and short breaths. Sound like a kind, confident woman talking to one person, not a newsreader, announcer, advertisement, synthetic assistant, or West Bengali speaker. Keep the delivery relaxed, clear, and human; do not exaggerate the accent.',
  en: 'Warm, friendly British English with relaxed, conversational pacing.',
};
const FALLBACK_STYLE = {
  bn: 'A warm, natural Bangladeshi female voice speaking clear, everyday Bangladeshi Bangla at a relaxed conversational pace.',
  en: 'Warm, fluent British English, spoken naturally with relaxed pacing.',
};
// Google's guidance: a designed voice carries its accent and age itself, so its style stays empty for Bangla (tested so).
const DESIGNED_VOICE_STYLE = {
  bn: '',
  en: 'Warm, conversational and gently expressive, with natural pauses.',
};
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const INTERACTIONS_API = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const DEFAULT_VOICE = 'Aoede';
const regionalVoices = new Map();

// The Bangla voice was designed for this app with Gemini voice design (language bn-BD), because Google's catalogue has
// only West Bengal (Kolkata) Bangla voices. Its description: "A cheerful, expressive young Bangladeshi woman of
// twenty-four, a university graduate from Dhaka, speaking natural modern Bangladeshi Bangla with a gentle smile in her
// voice and lively, flowing rhythm." Six Bangladeshi women's voices were designed and read the same farmer message; a
// panel of Gemini audio judges asked to listen as native Dhaka listeners rated this one most Bangladeshi and most human
// (9–10 of 10 in every round, no Kolkata or robotic features heard) (Oct 2026). A designed voice lives in the API key's
// Google project and expires on 2027-10-30; with another key, or after that, the prebuilt fallback speaks instead.
const BN_DESIGNED = 'voice_zajpkutxwrdt';
const BN_FALLBACK = 'Sulafat'; // a warm prebuilt voice, steered towards Bangladeshi Bangla by the style line
// The full model first; the free tier allows each TTS model 10 requests a day, so the Lite model takes over when it is used.
const models = () => [...new Set([process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])];

function spokenTranscript(text, lang) {
  if (lang !== 'bn') return text;
  return text
    .replace(/\bNASA\s+POWER\b/gi, 'নাসা পাওয়ার')
    .replace(/\bNASA\s+IMERG\b/gi, 'নাসা আইমার্জ')
    .replace(/\bNASA\b/gi, 'নাসা')
    .replace(/\bSentinel[-\s]?1\b/gi, 'সেন্টিনেল এক')
    .replace(/\bMODIS\b/gi, 'মোডিস')
    .replace(/\bSoilGrids?\b/gi, 'সয়েলগ্রিডস')
    .replace(/\bBMD\b/gi, 'আবহাওয়া অধিদপ্তর')
    .replace(/\bBRRI\b/gi, 'ব্রি')
    .replace(/\bDAE\b/gi, 'কৃষি সম্প্রসারণ অধিদপ্তর')
    .replace(/\bDAM\b/gi, 'কৃষি বিপণন অধিদপ্তর')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '$1 শতাংশ')
    .replace(/[0-9]/g, (digit) => BN_DIGITS[Number(digit)]);
}

async function voiceFor(lang) {
  const override = lang === 'bn' ? process.env.GEMINI_TTS_VOICE_BN : process.env.GEMINI_TTS_VOICE_EN;
  if (override || process.env.GEMINI_TTS_VOICE) {
    const name = override || process.env.GEMINI_TTS_VOICE;
    return { name, regional: false, designed: /^voice_[\w-]+$/i.test(name) };
  }
  if (lang === 'bn') return { name: BN_DESIGNED, designed: true };
  if (regionalVoices.has(lang)) return regionalVoices.get(lang);

  const pending = (async () => {
    try {
      const params = new URLSearchParams({ type: 'prebuilt', gender: 'female', page_size: '100' });
      const locales = lang === 'bn' ? ['bn-BD', 'bn-IN', 'bn'] : ['en-GB'];
      for (const locale of locales) params.append('language_code', locale);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/voices?${params}`, {
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(1800),
      });
      if (!response.ok) return { name: DEFAULT_VOICE, regional: false };
      const { voices = [] } = await response.json();
      const locale = lang === 'bn' ? /^bn(?:-|$)/i : /^en-GB$/i;
      const femaleVoices = voices.filter((voice) => voice.id && (!voice.gender || /^female$/i.test(voice.gender)));
      const matches = femaleVoices.filter((voice) => locale.test(voice.language_code ?? ''));
      const preferredPersona = (voice) => /warm|friendly|gentle|casual|easy-going|breezy|companion|assistant/i.test(`${voice.persona ?? ''} ${voice.description ?? ''}`);
      const preferredRegion = (voice) => lang === 'bn'
        ? /^bd$/i.test(voice.region_code ?? '') || /^bn-bd$/i.test(voice.language_code ?? '')
        : /^gb$/i.test(voice.region_code ?? '') || /british/i.test(voice.accent ?? '');
      const voice = matches.find((item) => preferredRegion(item) && preferredPersona(item))
        ?? matches.find(preferredRegion)
        ?? matches.find(preferredPersona)
        ?? matches[0];
      return voice?.id ? { name: voice.id, regional: true } : { name: DEFAULT_VOICE, regional: false };
    } catch {
      return { name: DEFAULT_VOICE, regional: false };
    }
  })();
  regionalVoices.set(lang, pending);
  return pending;
}

// Gemini 3.8 returns WAV; older configurable models may return headerless PCM.
export function wav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// The audio in an Interactions response sits in a model_output step (the SDKs surface it as output_audio).
function findAudio(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.output_audio?.data) return o.output_audio;
  if (o.type === 'audio' && o.data) return o;
  if (o.inlineData?.data) return o.inlineData;
  for (const v of Object.values(o)) { const f = findAudio(v); if (f) return f; }
  return null;
}

// One attempt: a designed voice goes through the Interactions API, a prebuilt or catalogue voice through generateContent.
async function synthesize({ model, voice, designed, transcript, style }) {
  const body = designed
    ? {
        model,
        input: [{ type: 'user_input', content: [{ type: 'text', text: transcript, ...(style ? { annotations: [{ type: 'speech_metadata', style }] } : {}) }] }],
        response_format: { type: 'audio' },
        generation_config: { speech_config: [{ voice }] },
      }
    : {
        contents: [{ role: 'user', parts: [model === 'gemini-3.1-flash-tts-preview' ? { text: `${style}: ${transcript}` } : { text: transcript, ...(style ? { speech_metadata: { style } } : {}) }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice } } },
      };
  const r = await fetch(designed ? INTERACTIONS_API : `${API}/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  if (!r.ok) return { status: r.status };
  const j = await r.json();
  const part = findAudio(j);
  if (!part?.data) return { status: 502 };
  const audio = Buffer.from(part.data, 'base64');
  const mime = part.mime_type ?? part.mimeType ?? '';
  const out = /wav/i.test(mime) || audio.toString('ascii', 0, 4) === 'RIFF' ? audio : wav(audio, Number(/rate=(\d+)/i.exec(mime)?.[1]) || 24000);
  return { status: 200, audio: out, model: j.modelVersion || j.model || model };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'voice not configured' });
  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body || '{}'); } catch { return res.status(400).json({ error: 'bad json' }); }
  const lang = body?.lang === 'en' ? 'en' : 'bn';
  const text = String(body?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  if (!text) return res.status(400).json({ error: 'empty text' });
  try {
    const chosen = await voiceFor(lang);
    const transcript = spokenTranscript(text, lang);
    // The chosen voice on each model in turn; a designed voice that is missing (another key) or expired falls back to the
    // prebuilt voice. A quota (429) or overload (503) moves on to the next model.
    const tries = [chosen, ...(chosen.designed ? [{ name: lang === 'bn' ? BN_FALLBACK : DEFAULT_VOICE, designed: false, regional: false }] : [])];
    let last = 502;
    for (const v of tries) {
      const style = v.designed ? DESIGNED_VOICE_STYLE[lang] : v.regional ? STYLE[lang] : FALLBACK_STYLE[lang];
      for (const model of models()) {
        const r = await synthesize({ model, voice: v.name, designed: v.designed, transcript, style });
        if (r.status === 200) return res.status(200).json({ audio: r.audio.toString('base64'), mime: 'audio/wav', voice: v.name, model: r.model });
        last = r.status;
        if (r.status === 400 || r.status === 404) break; // this voice is not available here: try the next voice
        if (r.status === 401 || r.status === 403) return res.status(503).json({ error: 'voice not configured' });
      }
    }
    return res.status(last === 429 ? 429 : 502).json({ error: last === 429 ? 'voice quota used for today' : `voice service error ${last}` });
  } catch (e) {
    return res.status(e?.name === 'TimeoutError' ? 504 : 502).json({ error: 'voice service unreachable' });
  }
}
