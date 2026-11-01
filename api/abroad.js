import { parseBody } from './body.js';
import { isHostedRuntime } from './runtime.js';

// The neighbouring countries' board: the sample farmer's requests to the local agriculture office, the officer's
// replies, and the advisories (SMS drafts) the officer sends. One board per country, in the same Upstash Redis store
// as api/plans.js and api/messages.js (KV_REST_API_URL / KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* names);
// without it the endpoint answers 503 and the app keeps the board in the browser only.
//   GET  /api/abroad?cc=<country>                     → { requests: [...], notices: [...], at }
//   POST /api/abroad { cc, op: 'request', topic, text } → { ok, item }
//   POST /api/abroad { cc, op: 'reply', id, text }      → { ok, item }
//   POST /api/abroad { cc, op: 'seen' }                 → { ok }        (the farmer has read the replies)
//   POST /api/abroad { cc, op: 'notice', key, text }    → { ok, item }
// Before real use, replies and notices must require an officer sign-in; this prototype has no accounts.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const COUNTRIES = ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar'];
const TOPICS = ['pest', 'seed', 'water', 'machine', 'loss', 'other'];
const KEY = /^[a-z]{2,20}$/;
const MAX_TEXT = 1000, KEEP = 40;

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

const text = (t) => { const s = String(t ?? '').trim(); return s && s.length <= MAX_TEXT ? s : null; };
const newId = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// One write, checked field by field. `board` is { requests: {id: item}, notices: {id: item} } and is changed in place;
// returns { item } or { error }.
export function applyOp(board, body) {
  const op = body?.op;
  if (op === 'request') {
    const t = text(body.text);
    if (!t || !TOPICS.includes(body.topic)) return { error: 'invalid request' };
    const item = { id: newId('R'), t: new Date().toISOString(), topic: body.topic, text: t, reply: null };
    board.requests[item.id] = item;
    return { item };
  }
  if (op === 'reply') {
    const t = text(body.text), r = board.requests[String(body.id ?? '')];
    if (!t || !r) return { error: 'invalid reply' };
    r.reply = { text: t, t: new Date().toISOString() };
    r.seen = false;
    return { item: r };
  }
  if (op === 'seen') {
    for (const r of Object.values(board.requests)) if (r.reply) r.seen = true;
    return { item: null };
  }
  if (op === 'notice') {
    const t = text(body.text);
    if (!t || !KEY.test(String(body.key ?? ''))) return { error: 'invalid notice' };
    const item = { id: newId('N'), t: new Date().toISOString(), key: body.key, text: t };
    board.notices[item.id] = item;
    return { item };
  }
  return { error: 'unknown op' };
}
export const validCountry = (cc) => COUNTRIES.includes(cc);
export const listBoard = (board) => ({
  requests: Object.values(board.requests).sort((a, b) => b.t.localeCompare(a.t)).slice(0, KEEP),
  notices: Object.values(board.notices).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 20),
  at: Date.now(),
});

async function load(cc) {
  const raw = await redis('GET', `fs360:abroad:${cc}`);
  try { return raw ? JSON.parse(raw) : { requests: {}, notices: {} }; } catch { return { requests: {}, notices: {} }; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (isHostedRuntime()) return res.status(503).json({ error: 'persistent board storage is disabled until authenticated access exists' });
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'board store not configured' });
  try {
    if (req.method === 'GET') {
      const cc = String(req.query?.cc ?? '');
      if (!validCountry(cc)) return res.status(400).json({ error: 'bad country' });
      return res.status(200).json(listBoard(await load(cc)));
    }
    if (req.method === 'POST') {
      const parsed = parseBody(req.body);
      if (!parsed.ok) return res.status(400).json({ error: 'bad json' });
      const body = parsed.value;
      if (!validCountry(body.cc)) return res.status(400).json({ error: 'bad country' });
      const board = await load(body.cc);
      const out = applyOp(board, body);
      if (out.error) return res.status(400).json({ error: out.error });
      await redis('SET', `fs360:abroad:${body.cc}`, JSON.stringify(board));
      return res.status(200).json({ ok: true, item: out.item });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(502).json({ error: 'board store unreachable' });
  }
}
