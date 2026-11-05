import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { cleanRequest, prompt } from './transcribe.js';

function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function withEnv(values, run) {
  const saved = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  const originalFetch = globalThis.fetch;
  for (const [k, v] of Object.entries(values)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { return await run(); } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    globalThis.fetch = originalFetch;
  }
}

const NO_STORE = { KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined, VERCEL: undefined, VERCEL_ENV: undefined, NODE_ENV: 'test' };
const AUDIO = Buffer.from('fake audio bytes').toString('base64');
const call = (body) => ({ method: 'POST', body, headers: {} });
const geminiAnswer = (j) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '```json\n' + JSON.stringify(j) + '\n```' }] } }] }) });

test('only inline audio of a known type and size is accepted', () => {
  assert.equal(cleanRequest({ audio: AUDIO, mime: 'audio/webm;codecs=opus' }).mime, 'audio/webm');
  assert.equal(cleanRequest({ audio: `data:audio/webm;base64,${AUDIO}`, mime: 'audio/webm' }).audio, AUDIO);
  assert.equal(cleanRequest({ audio: AUDIO, mime: 'text/html' }).error, 'unsupported audio type');
  assert.equal(cleanRequest({ url: 'http://169.254.169.254/', mime: 'audio/webm' }).error, 'no audio');
  assert.equal(cleanRequest({ audio: 'not base64!!', mime: 'audio/webm' }).error, 'bad audio encoding');
  assert.equal(cleanRequest({ audio: 'A'.repeat(3_400_004), mime: 'audio/webm' }).error, 'audio too long');
  assert.equal(cleanRequest({ audio: AUDIO, mime: 'audio/webm', crop: 'banana' }).crop, null);
});

test('the prompt asks for digits and exact quotes, and names the current crop', () => {
  const p = prompt('bn', 'tomato');
  assert.match(p, /as digits/);
  assert.match(p, /character for character/);
  assert.match(p, /current crop in the app is tomato/);
});

test('without any key the endpoint says transcription is off', () => withEnv({ ...NO_STORE, GEMINI_API_KEY: undefined, GROQ_API_KEY: undefined }, async () => {
  const res = response();
  await handler(call({ audio: AUDIO, mime: 'audio/webm' }), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'transcription not configured');
}));

test('a GET is refused and bad audio is a 400 before any AI call', () => withEnv({ ...NO_STORE, GEMINI_API_KEY: 'k' }, async () => {
  globalThis.fetch = async () => { throw new Error('must not be called'); };
  const get = response();
  await handler({ method: 'GET', headers: {} }, get);
  assert.equal(get.statusCode, 405);
  const bad = response();
  await handler(call({ audio: AUDIO, mime: 'video/mp4' }), bad);
  assert.equal(bad.statusCode, 400);
}));

test('Gemini answer comes back as a checked transcript and note', () => withEnv({ ...NO_STORE, GEMINI_API_KEY: 'k', GROQ_API_KEY: undefined }, async () => {
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return geminiAnswer({ language: 'bn', text: 'টমেটোর বীজ ৫০০ টাকা', segments: [{ speaker: 'farmer', text: 'টমেটোর বীজ ৫০০ টাকা', start: 0, end: 3 }],
      note: { crop: 'tomato', symptom: 'question', items: [{ what: 'বীজ', kind: 'input_cost', taka: 500, quote: 'বীজ ৫০০ টাকা' }, { what: 'সার', taka: 800, quote: 'সার ৮০০' }] } });
  };
  const res = response();
  await handler(call({ audio: AUDIO, mime: 'audio/webm', lang: 'bn' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.engine, 'gemini');
  assert.equal(sent.body.contents[0].parts[0].inline_data.data, AUDIO);
  assert.equal(res.body.transcript.segments[0].who, 'farmer');
  assert.deepEqual(res.body.note.items.map((i) => i.taka), [500]);
  assert.equal(res.body.note.dropped[0].rule, 'CN1_UNQUOTED');
}));

test('a busy Gemini hands over to the lighter model, then to Groq Whisper', () => withEnv({ ...NO_STORE, GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g', GEMINI_MODEL: undefined }, async () => {
  const urls = [];
  globalThis.fetch = async (url) => {
    urls.push(url);
    if (String(url).includes('groq')) return { ok: true, status: 200, json: async () => ({ text: 'আমার ধানে পোকা', language: 'bengali', segments: [{ text: 'আমার ধানে পোকা', start: 0, end: 2 }] }) };
    return { ok: false, status: 429, json: async () => ({}) };
  };
  const res = response();
  await handler(call({ audio: AUDIO, mime: 'audio/mp4' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.engine, 'groq');
  assert.equal(res.body.note, null);
  assert.equal(res.body.transcript.lang, 'bn');
  assert.equal(urls.length, 3);
}));

test('a rejected key reads as not configured, not as a crash', () => withEnv({ ...NO_STORE, GEMINI_API_KEY: 'bad', GROQ_API_KEY: undefined }, async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const res = response();
  await handler(call({ audio: AUDIO, mime: 'audio/webm' }), res);
  assert.equal(res.statusCode, 503);
}));
