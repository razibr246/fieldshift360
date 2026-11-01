import { parseBody } from './body.js';

// Shared plan board: every farmer's confirmed season plan, so each union's harvest weeks add up across all users.
// Vercel serverless function backed by Upstash Redis over its REST API (no SDK). Connect an Upstash Redis store to
// the Vercel project (Storage → Upstash → Redis) and it injects KV_REST_API_URL / KV_REST_API_TOKEN; the plain
// UPSTASH_REDIS_REST_URL / _TOKEN names work too. Without them the endpoint answers 503 and the app stays local.
//   GET  /api/plans?season=2027            → { plans: [...], at }
//   POST /api/plans  { plan: {...} }       → { ok: true, plan }   (one plan per plot; a new one replaces the old)
// Only what the harvest-week sum needs is stored: plot id, union, crop, planting day, area. No names or phones.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CROPS = new Set(['boro', 'tomato', 'wheat', 'lentil', 'mustard']);
const SEASONS = new Set([2027]);
const MAX_PLANS = 20000; // per season, so a runaway script cannot fill the store
const DAY = 864e5;

async function redis(...cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`);
  return j.result;
}

// A plan as the app sends it, checked field by field; anything else is refused.
export function clean(p, season) {
  if (!p || typeof p !== 'object') return null;
  const plot = String(p.plot_id ?? ''), union = String(p.union ?? ''), crop = String(p.crop ?? '');
  const date = Number(p.date), area = Number(p.area_dec);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(plot) || !/^[A-Za-z][A-Za-z .'-]{1,48}$/.test(union) || !CROPS.has(crop)) return null;
  // Rabi planting runs from early October of the year before the harvest season to the end of February.
  if (!Number.isFinite(date) || date < Date.UTC(season - 1, 8, 1) || date > Date.UTC(season, 2, 1) || date % DAY !== 0) return null;
  if (!Number.isFinite(area) || area < 1 || area > 5000) return null;
  return { plot_id: plot, union, crop, date, area_dec: Math.round(area * 10) / 10, at: Date.now() };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOKEN) return res.status(503).json({ error: 'shared store not configured' });
  const season = Number(req.query?.season ?? req.body?.season ?? 2027);
  if (!SEASONS.has(season)) return res.status(400).json({ error: 'unknown season' });
  const key = `fs360:plans:${season}`;
  try {
    if (req.method === 'GET') {
      const flat = (await redis('HGETALL', key)) ?? [];
      const plans = [];
      for (let i = 1; i < flat.length; i += 2) { try { plans.push(JSON.parse(flat[i])); } catch { /* skip a damaged entry */ } }
      return res.status(200).json({ plans, at: Date.now() });
    }
    if (req.method === 'POST') {
      const parsed = parseBody(req.body);
      if (!parsed.ok) return res.status(400).json({ error: 'bad json' });
      const body = parsed.value;
      const plan = clean(body.plan, season);
      if (!plan) return res.status(400).json({ error: 'invalid plan' });
      const exists = await redis('HEXISTS', key, plan.plot_id);
      if (!exists && (await redis('HLEN', key)) >= MAX_PLANS) return res.status(507).json({ error: 'store full' });
      await redis('HSET', key, plan.plot_id, JSON.stringify(plan));
      return res.status(200).json({ ok: true, plan });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(502).json({ error: 'shared store unreachable' });
  }
}
