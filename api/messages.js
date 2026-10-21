// Officer → farmer messages (replies to requests, area advice, weather warnings, upazila notices), so a message sent
// from the office reaches the farmer's own phone. Same Upstash Redis store as api/plans.js (KV_REST_API_URL /
// KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* names); without it the endpoint answers 503 and the app keeps
// messages in the officer's browser only.
//   GET  /api/messages?to=<farmerId>   → { messages: [...newest first], at }
//   POST /api/messages  { adv: {...} } → { ok: true, n }   (one copy per recipient; a resend replaces the old one)
// Before real use, posting must require an officer sign-in; this prototype has no accounts.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const MAX_TO = 2000, MAX_TEXT = 1200, KEEP = 60;

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

const ID = /^[A-Za-z0-9_.:-]{1,80}$/;
// A message as the app sends it, checked field by field.
export function cleanAdv(a) {
  if (!a || typeof a !== 'object') return null;
  const id = String(a.id ?? ''), text = String(a.text ?? '').trim();
  const to = Array.isArray(a.to) ? [...new Set(a.to.map(String))].filter((x) => ID.test(x)) : [];
  if (!ID.test(id) || !text || text.length > MAX_TEXT || !to.length || to.length > MAX_TO) return null;
  const at = Number(a.at);
  const opt = (k) => (a[k] != null && ID.test(String(a[k])) ? String(a[k]) : undefined);
  return { id, text, to, at: Number.isFinite(at) ? at : Date.now(), sent: Date.now(), request: opt('request'), cluster: opt('cluster'), upazila: opt('upazila'), weather: opt('weather'), from: a.from ? String(a.from).slice(0, 120) : undefined };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'message store not configured' });
  try {
    if (req.method === 'GET') {
      const to = String(req.query?.to ?? '');
      if (!ID.test(to)) return res.status(400).json({ error: 'bad recipient' });
      const flat = (await redis('HGETALL', `fs360:msgs:${to}`)) ?? [];
      const messages = [];
      for (let i = 1; i < flat.length; i += 2) { try { const m = JSON.parse(flat[i]); messages.push({ ...m, to: [to] }); } catch { /* skip */ } }
      messages.sort((a, b) => b.sent - a.sent);
      return res.status(200).json({ messages: messages.slice(0, KEEP), at: Date.now() });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
      const adv = cleanAdv(body.adv);
      if (!adv) return res.status(400).json({ error: 'invalid message' });
      const { to, ...rest } = adv;
      const copy = JSON.stringify(rest);
      for (const f of to) await redis('HSET', `fs360:msgs:${f}`, adv.id, copy);
      return res.status(200).json({ ok: true, n: to.length });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch {
    return res.status(502).json({ error: 'message store unreachable' });
  }
}
