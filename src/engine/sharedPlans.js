// The shared plan board (api/plans.js): every user's confirmed plan, so a union's harvest weeks add up across
// farmers, not just in one browser. When the board cannot be reached (no server, offline, or not configured) the
// app says so and keeps working from this browser's own plans.
import { PLAN_SEASON } from './climate.js';

const BASE = `${import.meta.env?.BASE_URL || './'}api/plans`;

// → { status: 'live', plans, at } or { status: 'offline', reason }
export async function loadSharedPlans(season = PLAN_SEASON) {
  try {
    const r = await fetch(`${BASE}?season=${season}`, { cache: 'no-store' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.includes('json')) return { status: 'offline', reason: r.status === 503 ? 'unconfigured' : 'unreachable' };
    const j = await r.json();
    return { status: 'live', plans: Array.isArray(j.plans) ? j.plans : [], at: j.at ?? Date.now() };
  } catch {
    return { status: 'offline', reason: 'unreachable' };
  }
}

export async function sendSharedPlan(plan, season = PLAN_SEASON) {
  try {
    const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ season, plan }) });
    return r.ok;
  } catch {
    return false;
  }
}
