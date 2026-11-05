// Call notes: an officer's phone or field conversation with a farmer, recorded only after the farmer agrees, turned
// into a transcript and a short structured note (crop, problem, area, every taka amount said), checked against the
// transcript, and sealed with SHA-256 so a later edit shows. Pure functions, no network and no React; api/transcribe.js
// runs the AI and calls normalizeTranscript / normalizeCallNote on its answer, src/pages/officer/CallNotes.jsx does
// the rest. [AI] for what the model heard, [RULE] for the checks.
//
// The idea comes from Recordio (Shoaib Ibna Omar, 2026): consent logged before recording, Gemini transcription with
// a Groq Whisper fallback, every line item pulled out of a call, a SHA-256 evidence bundle. Rewritten for this app,
// with three of its gaps closed:
//   - Recordio only asks the model not to invent amounts. Here an item is kept only when its quoted words are in the
//     transcript and its amount is one of the numbers in that quote (CN1_UNQUOTED, CN2_AMOUNT_NOT_SAID).
//   - Recordio hashed a bundle (with a fresh timestamp) that was never stored, so the hash could not be checked again.
//     Here the sealed record itself is kept and verifyCallNote recomputes it.
//   - Recordio's server downloaded audio from any URL it was given; api/transcribe.js accepts inline audio only.

import { RABI_CROPS, ROTATION_CROPS } from './crops.js';

export const MAX_RECORD_SECONDS = 300; // five minutes: a farmer's call, and inside the serverless request size
export const MAX_AUDIO_B64 = 3_400_000; // ~2.5 MB of audio; Vercel refuses request bodies over 4.5 MB
export const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'audio/x-m4a'];
export const CROP_KEYS = [...Object.keys(RABI_CROPS), ...Object.keys(ROTATION_CROPS), 'aman'];
export const SYMPTOM_KEYS = ['leaf_spot', 'aphid', 'water', 'wilt', 'cold', 'waste', 'question'];
export const ITEM_KINDS = ['price_heard', 'input_cost', 'sale', 'loan', 'other'];
export const UNITS = ['kg', 'maund', 'quintal', 'decimal', 'bigha', 'acre', 'litre', 'bag', 'piece'];
export const URGENCY = ['low', 'medium', 'high'];

// What the officer reads out (or plays) before pressing record. Saved word for word with the consent.
export const CONSENT_NOTICE = {
  bn: 'আপনার সমস্যা ঠিকমতো লিখে রাখতে আমি এই কথাটা রেকর্ড করতে চাই। রেকর্ডটা লেখায় রূপান্তর করা হবে, শুধু কৃষি অফিসের কাজে লাগবে, আর অডিও রাখা হবে না। আপনি রাজি থাকলে হ্যাঁ বলুন; না বললেও আপনার সাহায্য একই থাকবে।',
  en: 'To note your problem correctly I would like to record this conversation. It will be turned into text, used only by the agriculture office, and the audio will not be kept. Say yes if you agree; if you say no, you get the same help.',
};

const BN_TO_ASCII = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
export const toAsciiDigits = (s) => String(s ?? '').replace(/[০-৯]/g, (d) => BN_TO_ASCII[d]);

const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

export function asNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const cleaned = toAsciiDigits(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return cleaned ? Number(cleaned[0]) : null;
}

// The JSON object in a model's answer: fenced or not, with prose around it, trailing commas or curly quotes.
export function extractJson(text) {
  if (text && typeof text === 'object') return text;
  if (typeof text !== 'string' || !text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const c = fenced ? fenced[1] : text;
  const a = c.indexOf('{'), b = c.lastIndexOf('}');
  if (a === -1 || b <= a) return null;
  const slice = c.slice(a, b + 1);
  for (const t of [slice, slice.replace(/,\s*([}\]])/g, '$1').replace(/[“”]/g, '"')]) {
    try { const j = JSON.parse(t); if (j && typeof j === 'object' && !Array.isArray(j)) return j; } catch { /* try the cleaned copy */ }
  }
  return null;
}

// "12.5", 12.5, "00:12" or "1:02:03" -> seconds.
export function parseTime(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
  if (typeof v === 'string' && v.includes(':')) {
    const parts = toAsciiDigits(v).trim().split(':').map(Number);
    if (parts.every(Number.isFinite)) return parts.reduce((t, p) => t * 60 + p, 0);
  }
  return Math.max(0, asNumber(v) ?? 0);
}

const SPEAKER = { officer: 'officer', farmer: 'farmer' };
// Whatever transcript shape came back -> { text, lang, segments: [{ who, text, start, end }] }. Never throws.
export function normalizeTranscript(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const segs = (Array.isArray(r.segments) ? r.segments : []).slice(0, 400).map((x) => {
    const s = x && typeof x === 'object' ? x : {};
    const start = parseTime(s.start ?? s.start_time ?? s.from);
    const end = parseTime(s.end ?? s.end_time ?? s.to);
    const who = SPEAKER[str(s.speaker ?? s.who, 40).toLowerCase()] ?? 'other';
    return { who, text: str(s.text ?? s.content, 2000), start, end: Math.max(start, end) };
  }).filter((s) => s.text);
  const text = (str(r.text ?? r.full_text ?? r.transcript, 40_000) || segs.map((s) => s.text).join(' ')).trim();
  const lang = /^(bn|en)$/.test(str(r.language ?? r.lang, 10)) ? str(r.language ?? r.lang, 10) : /[ঀ-৿]/.test(text) ? 'bn' : 'en';
  return { text, lang, segments: segs.length ? segs : text ? [{ who: 'other', text, start: 0, end: 0 }] : [] };
}

// Text as compared for quotes: digits in Latin, no punctuation, single spaces, lower case.
export const comparable = (s) => toAsciiDigits(s).toLowerCase().replace(/(\d),(?=\d)/g, '$1').replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
const numbersIn = (s) => (toAsciiDigits(s).replace(/(\d),(?=\d)/g, '$1').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

const pick = (v, list, fallback = null) => { const k = str(v, 40).toLowerCase(); return list.includes(k) ? k : fallback; };
const UNIT_ALIASES = { 'মণ': 'maund', mon: 'maund', mound: 'maund', 'কেজি': 'kg', kilo: 'kg', 'শতক': 'decimal', 'শতাংশ': 'decimal', 'বিঘা': 'bigha', 'একর': 'acre', 'লিটার': 'litre', liter: 'litre', 'বস্তা': 'bag', sack: 'bag', 'পিস': 'piece', 'টি': 'piece', 'কুইন্টাল': 'quintal' };
const unitOf = (v) => { const k = str(v, 30).toLowerCase(); return UNITS.includes(k) ? k : UNIT_ALIASES[k] ?? null; };

// The model's note, checked against the transcript it came from. Items whose words or amount are not in the
// transcript are dropped and counted, with the rule that dropped them.
export function normalizeCallNote(raw, transcriptText) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const said = comparable(transcriptText);
  const quoted = (q) => { const c = comparable(q); return c.length >= 2 && said.includes(c); };
  const dropped = [];
  const items = [];
  for (const x of (Array.isArray(r.items) ? r.items : []).slice(0, 40)) {
    const it = x && typeof x === 'object' ? x : {};
    const quote = str(it.quote, 300);
    const amount = asNumber(it.taka ?? it.amount);
    const what = str(it.what ?? it.description ?? it.item, 120);
    if (!quoted(quote)) { dropped.push({ rule: 'CN1_UNQUOTED', what, quote }); continue; }
    if (amount != null && !numbersIn(quote).includes(amount)) { dropped.push({ rule: 'CN2_AMOUNT_NOT_SAID', what, quote }); continue; }
    const qty = asNumber(it.qty ?? it.quantity);
    const conf = asNumber(it.confidence);
    items.push({
      what: what || quote.slice(0, 60),
      kind: pick(it.kind, ITEM_KINDS, 'other'),
      taka: amount != null && amount >= 0 ? amount : null,
      qty: qty != null && qty > 0 ? qty : null,
      unit: unitOf(it.unit),
      quote,
      confidence: conf == null ? 0.6 : Math.min(1, Math.max(0, conf > 1 ? conf / 100 : conf)),
    });
  }
  let area = null;
  if (r.area && typeof r.area === 'object') {
    const v = asNumber(r.area.value), unit = unitOf(r.area.unit), quote = str(r.area.quote, 200);
    if (v != null && v > 0 && ['decimal', 'bigha', 'acre'].includes(unit) && quoted(quote) && numbersIn(quote).includes(v)) area = { value: v, unit, quote };
    else if (v != null) dropped.push({ rule: 'CN3_AREA_NOT_SAID', what: 'area', quote });
  }
  const summary = { bn: str(r.summary_bn ?? r.summary?.bn, 600), en: str(r.summary_en ?? r.summary?.en, 600) };
  return {
    summary,
    crop: pick(r.crop, CROP_KEYS),
    symptom: pick(r.symptom ?? r.problem, SYMPTOM_KEYS, 'question'),
    urgency: pick(r.urgency, URGENCY, 'medium'),
    area,
    items,
    asks: (Array.isArray(r.asks) ? r.asks : []).map((a) => str(a, 200)).filter(Boolean).slice(0, 6),
    dropped,
  };
}

// ---- consent -------------------------------------------------------------------------------------------------------
// A decision logged before anything is recorded. Recording is allowed only on a logged yes from this session.
export function makeConsent({ given, lang = 'bn', by = 'officer', at = new Date().toISOString() }) {
  return { given: given === true, at, lang: lang === 'en' ? 'en' : 'bn', notice: CONSENT_NOTICE[lang === 'en' ? 'en' : 'bn'], by: str(by, 80) || 'officer' };
}
export const canRecord = (consent) => !!consent && consent.given === true && !Number.isNaN(Date.parse(consent.at));

// ---- sealing -------------------------------------------------------------------------------------------------------
// Deterministic JSON: object keys sorted at every depth, arrays kept in order (Recordio's fix for JSON.stringify's
// replacer array, which drops nested keys).
export function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, canonical(v[k])]));
  return v;
}
export const canonicalJson = (v) => JSON.stringify(canonical(v));

export async function sha256Hex(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const buf = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The record that is sealed: who, the consent, a fingerprint of the audio (the audio itself is not kept), the
// transcript, the checked note, and which engine heard it. Later links (a request made from it) live outside it.
export async function sealCallNote({ id, farmer, consent, audio, transcript, note, engine, model, created = new Date().toISOString() }) {
  if (!canRecord(consent)) throw new Error('no recorded consent');
  const record = {
    v: 1, id: str(id, 80), created,
    farmer: farmer ? { id: str(farmer.id, 80), name: str(farmer.name, 120) } : null,
    consent,
    audio: audio ? { sha256: str(audio.sha256, 64), bytes: Number(audio.bytes) || 0, mime: str(audio.mime, 40), seconds: Math.round(Number(audio.seconds) || 0) } : null,
    transcript, note, engine: str(engine, 20), model: str(model, 60),
  };
  return { id: record.id, record, hash: await sha256Hex(canonicalJson(record)) };
}
export async function verifyCallNote(sealed) {
  if (!sealed?.record || !/^[0-9a-f]{64}$/.test(sealed.hash ?? '')) return false;
  return (await sha256Hex(canonicalJson(sealed.record))) === sealed.hash;
}

// A request for the officer's queue, in the shape the rest of the app uses (see FieldSatellite's tellOffice).
export function callNoteToRequest(sealed, farmer, today) {
  const { record } = sealed;
  const n = record.note;
  const fallback = record.transcript.text.slice(0, 280);
  const text = { bn: n.summary.bn || n.summary.en || fallback, en: n.summary.en || n.summary.bn || fallback };
  return {
    id: `C-${record.id}`, farmerId: farmer.id, union: farmer.union, village: farmer.village, villageBn: farmer.villageBn, lat: farmer.lat, lon: farmer.lon,
    crop: n.crop ?? farmer.crop ?? null, symptom: n.symptom, type: 'call', callNote: record.id,
    text, ai: null, created: today, status: 'open', priority: { high: 'High', medium: 'Medium', low: 'Low' }[n.urgency] ?? 'Medium', mine: true,
  };
}
