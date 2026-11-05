import { parseBody } from './body.js';
import { rateLimitResponse } from './rateLimit.js';
import { AUDIO_TYPES, MAX_AUDIO_B64, CROP_KEYS, SYMPTOM_KEYS, ITEM_KINDS, UNITS, extractJson, normalizeTranscript, normalizeCallNote } from '../src/engine/callnote.js';

// Call notes (src/pages/officer/CallNotes.jsx): one recorded officer–farmer conversation, sent here only after the
// farmer's consent is logged in the browser, comes back as a transcript and a short structured note. Vercel
// serverless function. Google Gemini hears the audio and writes both in one request (GEMINI_API_KEY; GEMINI_MODEL
// optionally picks the model, and a lighter model takes over when it is busy). Without Gemini, or when every Gemini
// model is busy, Groq Whisper (GROQ_API_KEY) writes the transcript alone and the officer writes the note. With neither
// key the endpoint answers 503 and the page says transcription is off. Keys never reach the browser.
//   POST /api/transcribe  { audio: <base64>, mime, lang: 'bn'|'en', crop? }
//   → { transcript: { text, lang, segments }, note | null, engine: 'gemini'|'groq', model, at }
// Audio is accepted inline only (never a URL to fetch) and is not stored. The browser checks the note's items against
// the transcript again with the same engine code before it is sealed.
const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_API = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_MODEL = 'whisper-large-v3-turbo';
const TIMEOUT = 60_000;
const models = () => [...new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.1-flash-lite'])];

export function prompt(lang, crop) {
  return `You are the note-taker for an agriculture officer of Bangladesh's Department of Agricultural Extension. The audio is a phone or field conversation between the officer and a smallholder farmer, usually in Bangla (often a regional dialect), sometimes with English words. The farmer agreed to the recording.

1. Transcribe exactly what was said, in the language spoken (Bangla in Bangla script). Do not translate the transcript. Write every number that is spoken as digits (for example "পাঁচশো" as "৫০০", "two hundred" as "200"), keeping the unit words as spoken. Audio may be noisy or held close to the mouth: reconstruct the likely words from context, but never invent words, names or amounts; write "[অস্পষ্ট]" for a part that cannot be heard. Split segments at turns; speaker is "officer", "farmer" or "other"; start and end are seconds.
2. Then write the note, using only what was said:
- summary_bn and summary_en: two or three plain sentences each on the farmer's problem or question and what was agreed.
- crop: one of ${CROP_KEYS.join(', ')}, or null if none is clear.${crop ? ` The farmer's current crop in the app is ${crop}; use another only if the conversation says so.` : ''}
- symptom: one of ${SYMPTOM_KEYS.join(', ')} ("question" when the farmer only asks for advice).
- urgency: high if the crop could be lost within days, low for a general question, else medium.
- area: the farmer's land size if it was said: { value, unit: decimal | bigha | acre, quote }, else null.
- items: every amount of money, quantity or price that was said, one entry each: what (short, in ${lang === 'en' ? 'English' : 'Bangla'}), kind (price_heard = a market price the farmer heard; input_cost = seed, fertiliser, pesticide, irrigation, labour or rent paid; sale = crop sold; loan; other), taka (number or null), qty (number or null), unit (${UNITS.join(', ')} or null), quote (the exact words from your transcript that contain it, copied character for character), confidence 0 to 1.
- asks: what the farmer asked the office for, short phrases.

Return only JSON: { "language": "bn"|"en", "text": "...", "segments": [{ "speaker", "text", "start", "end" }], "note": { "summary_bn", "summary_en", "crop", "symptom", "urgency", "area", "items": [...], "asks": [...] } }
Item kinds allowed: ${ITEM_KINDS.join(', ')}.`;
}

async function timed(url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try { return await fetch(url, { ...init, signal: ctl.signal }); } finally { clearTimeout(t); }
}

// Gemini: the first model that answers; a busy (429/503) or timed-out model hands over to the next one.
async function geminiHear({ audio, mime, lang, crop }) {
  let last = null;
  for (const model of models()) {
    let r;
    try {
      r = await timed(`${GEMINI_API}/${model}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: mime, data: audio } }, { text: prompt(lang, crop) }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }),
      });
    } catch { last = { busy: true }; continue; }
    if (r.status === 401 || r.status === 403) return { auth: true };
    if (r.status === 429 || r.status >= 500) { last = { busy: true }; continue; }
    if (!r.ok) return { error: `gemini ${r.status}` };
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p?.text).filter((p) => typeof p === 'string').join('\n');
    const j = extractJson(text);
    const transcript = normalizeTranscript(j);
    if (!transcript.text) { last = { error: 'empty transcript' }; continue; }
    return { transcript, note: normalizeCallNote(j?.note, transcript.text), model };
  }
  return last ?? { error: 'no model' };
}

async function groqHear({ audio, mime, lang }) {
  const form = new FormData();
  const ext = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac', 'audio/flac': 'flac' }[mime] ?? 'webm';
  form.append('file', new Blob([Buffer.from(audio, 'base64')], { type: mime }), `call.${ext}`);
  form.append('model', GROQ_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  form.append('language', lang === 'en' ? 'en' : 'bn');
  let r;
  try { r = await timed(GROQ_API, { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form }); } catch { return { busy: true }; }
  if (r.status === 401 || r.status === 403) return { auth: true };
  if (!r.ok) return { busy: r.status === 429 || r.status >= 500, error: `groq ${r.status}` };
  const d = await r.json();
  const transcript = normalizeTranscript({ text: d.text, language: d.language === 'english' ? 'en' : d.language === 'bengali' ? 'bn' : undefined, segments: (d.segments ?? []).map((s) => ({ speaker: 'other', text: s.text, start: s.start, end: s.end })) });
  return transcript.text ? { transcript, note: null, model: GROQ_MODEL } : { error: 'empty transcript' };
}

export function cleanRequest(body) {
  const b = body && typeof body === 'object' ? body : {};
  const mime = String(b.mime ?? '').split(';')[0].trim().toLowerCase();
  const audio = typeof b.audio === 'string' ? b.audio.replace(/^data:[^,]*,/, '') : '';
  if (!AUDIO_TYPES.includes(mime)) return { error: 'unsupported audio type' };
  if (!audio || audio.length > MAX_AUDIO_B64) return { error: audio ? 'audio too long' : 'no audio' };
  if (audio.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) return { error: 'bad audio encoding' };
  return { audio, mime, lang: b.lang === 'en' ? 'en' : 'bn', crop: CROP_KEYS.includes(b.crop) ? b.crop : null };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method not allowed' }); }
  const gemini = !!process.env.GEMINI_API_KEY, groq = !!process.env.GROQ_API_KEY;
  if (!gemini && !groq) return res.status(503).json({ error: 'transcription not configured' });
  const parsed = parseBody(req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'bad json' });
  const input = cleanRequest(parsed.value);
  if (input.error) return res.status(input.error === 'audio too long' ? 413 : 400).json({ error: input.error });
  const blocked = await rateLimitResponse(req, res, { scope: 'transcribe', limit: 30, windowSeconds: 3600 });
  if (blocked) return blocked;

  try {
    let out = gemini ? await geminiHear(input) : null;
    let engine = 'gemini';
    if (!out?.transcript && groq) { out = await groqHear(input); engine = 'groq'; }
    if (out?.transcript) return res.status(200).json({ transcript: out.transcript, note: out.note, engine, model: out.model, at: Date.now() });
    if (out?.auth) return res.status(503).json({ error: 'transcription not configured' });
    if (out?.busy) return res.status(503).json({ error: 'transcription busy, try again in a minute' });
    return res.status(502).json({ error: 'transcription failed' });
  } catch {
    return res.status(502).json({ error: 'transcription failed' });
  }
}
