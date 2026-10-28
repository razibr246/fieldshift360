// "মাঠের লড়াই" (the story game, src/data/story.js): the real numbers behind each chapter, and the season's totals
// along any path of choices. The story is set in Deopara, Godagari, so the facts come from Godagari's NASA POWER
// record (2001–2025 seasons), the FAO-56 crop water model, DAM tomato prices and the officer's hotspot rule.
// Pure (no React), so Node tests can run it. [REAL data in, RULE logic]
import { banglaMonthStart, ymd, addDays } from './dates.js';
import { cropWaterNeed } from './cropwater.js';
import { RABI_CROPS } from './crops.js';
import PRICES from '../data/market/price_seasons.json' with { type: 'json' };

const YEARS = Array.from({ length: 25 }, (_, i) => 2001 + i);
const MONTH = { poush: 8, magh: 9, falgun: 10 }; // Bangla month index (0 = Boishakh)
export const HOTSPOT_RULE = { reports: 5, km: 1.5, days: 7 }; // findHotspots defaults in engine/cluster.js

// Daily values of one Bangla month in each of the 25 seasons (Poush to Falgun fall in the Gregorian year y).
function monthDays(clim, m, y) {
  const out = [];
  for (let t = banglaMonthStart(y - 1, m), end = banglaMonthStart(y - 1, m + 1); t < end; t = addDays(t, 1)) {
    out.push({ p: clim.val('prec', t), n: clim.val('tmin', t) });
  }
  return out.filter((d) => d.p != null);
}
const median = (v) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const longestDry = (days) => { let best = 0, run = 0; for (const d of days) { run = d.p < 1 ? run + 1 : 0; best = Math.max(best, run); } return best; };

// One fact per chapter id, each { kind: 'REAL' | 'RULE', ...numbers }.
export function chapterFacts(clim) {
  const seasons = (m) => YEARS.map((y) => monthDays(clim, m, y)).filter((d) => d.length > 25);
  const boro = cropWaterNeed(clim, RABI_CROPS.boro, ymd(2026, 1, 15));
  const mustard = cropWaterNeed(clim, RABI_CROPS.mustard, ymd(2025, 11, 1));
  const tom = PRICES.crops.tomato.index;
  const low = Math.min(tom[1], tom[2]), high = Math.max(...tom.filter((x) => x != null));
  const poush = seasons(MONTH.poush), magh = seasons(MONTH.magh), falgun = seasons(MONTH.falgun);
  return {
    choose: boro && mustard ? { kind: 'REAL', boro: boro.mm, mustard: mustard.mm, share: mustard.mm / boro.mm } : null,
    glut: { kind: 'REAL', low, high, ratio: high / low },
    blight: { kind: 'REAL', n: poush.length, coldNights: median(poush.map((d) => d.filter((x) => x.n != null && x.n <= 10).length)) },
    dry: { kind: 'REAL', n: magh.length, dryYears: magh.filter((d) => d.reduce((a, x) => a + x.p, 0) < 5).length, dryRun: median(magh.map(longestDry)) },
    storm: { kind: 'REAL', n: falgun.length, wetYears: falgun.filter((d) => d.some((x) => x.p >= 5)).length },
    pests: { kind: 'RULE', ...HOTSPOT_RULE },
  };
}

// The meters after a whole season along a path: 'habit' or 'tool' for each scene (a tool found first time).
export function seasonTotals(scenes, start, path) {
  const clamp = (v) => Math.max(0, Math.min(100, v));
  return scenes.reduce((m, sc, i) => {
    const fx = path[i] === 'habit' ? sc.habit.fx : sc.win.fx;
    return { crop: clamp(m.crop + (fx.crop || 0)), money: m.money + (fx.money || 0), water: clamp(m.water + (fx.water || 0)) };
  }, { ...start });
}
