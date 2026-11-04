// Save and continue a season of মাঠের মানুষ, as farming games keep a season between sittings (AgriSim's save and
// load, Lands' background saves). Only plain state is kept: money, seeds, basket, every plot, the counts, the
// mission reached, the season's XP and soil scores, the market and fertiliser, and where the farmer stands. Timers
// and half-finished events (a storm on its way, a heatwave) are not: on restore the mission reached starts again
// cleanly, so nothing resumes in a broken state. Pure; FarmGame.jsx keeps one save per farmer in localStorage.
export const SAVE_KEY = 'fs360.game.save';
export const SAVE_VERSION = 1;
const clone = (x) => JSON.parse(JSON.stringify(x ?? null));

export function saveState(g) {
  return clone({
    v: SAVE_VERSION, id: g.id, at: Date.now(),
    t: g.t, money: g.money, seeds: g.seeds, basket: g.basket, sel: g.sel, can: g.can,
    plots: g.plots.map(({ crop, g: grown, moist, health, wilt, dead, pests, fert, mulch, last, repeat, fed, feed }) => ({ crop, g: grown, moist, health, wilt, dead, pests, fert, mulch, last, repeat, fed, feed })),
    count: g.count, quest: g.quest, perks: g.perks, answers: g.answers, seen: g.seen,
    xp: g.xp, level: g.level, soilHealth: g.soilHealth, carbonScore: g.carbonScore,
    done: g.ev?.done ?? {}, market: g.market, fertilizer: g.fertilizer,
    me: { x: g.me.x, z: g.me.z, yaw: g.me.yaw },
  });
}

// Put a saved season back into a freshly created game of the same farmer. Returns false if the save doesn't fit.
export function restoreState(g, s) {
  if (!s || s.v !== SAVE_VERSION || s.id !== g.id || !Array.isArray(s.plots) || s.plots.length !== g.plots.length || s.won) return false;
  Object.assign(g, { t: s.t, money: s.money, sel: s.sel, can: s.can, quest: s.quest, answers: s.answers ?? [], seen: s.seen ?? [] });
  for (const k of ['seeds', 'basket', 'count', 'perks']) Object.assign(g[k], s[k] ?? {});
  for (const k of ['xp', 'level', 'soilHealth', 'carbonScore']) if (s[k] != null) g[k] = s[k];
  s.plots.forEach((p, i) => Object.assign(g.plots[i], p, { pests: 0 })); // pests belonged to an event that isn't resumed
  g.ev.done = { ...(s.done ?? {}) };
  if (s.market && g.market) Object.assign(g.market, s.market);
  if (s.fertilizer && g.fertilizer) Object.assign(g.fertilizer, s.fertilizer);
  if (s.me) Object.assign(g.me, s.me);
  g.questStarted = false; g.nextQuestAt = g.t + 2; g.waitFor = null; g.timers = [];
  return true;
}
