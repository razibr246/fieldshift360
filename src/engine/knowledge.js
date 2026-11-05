// What চক্র এজেন্ট's AI is given to think with: the app's own data, gathered into short named sections so a large model
// can weigh everything at once (every season option with its numbers, soil and fertiliser, price seasons, the crop's
// known problems, government programmes the farmer fits, each problem's path), within a size budget. Pure functions.
//
//   knowledgePack(input, { budget }) -> { sections: { name: value }, size, dropped: [names] }
//
// Every value is a figure the app already shows, with the source it came from, so the model can quote and not guess.
import { PRICE_SEASONS } from './glut.js';
import { CROP_PROBLEMS } from '../data/crop_problems.js';
import { matchSupport, supportProfile } from './support.js';
import { BD_SUPPORT, AREA_TYPE } from '../data/support/bd_support.js';

export const KNOWLEDGE_BUDGET = 48_000; // characters of JSON; the server accepts more, but a short pack answers faster
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (t) => (Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null);
const round = (v, d = 0) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

// Every crop and planting date the season plan weighed, as numbers.
export function optionsSection(options = [], chosen = null) {
  return options.slice(0, 16).map((o) => ({
    crop: o.crop?.id, name: o.crop?.name, shiftDays: o.shift ?? 0, plant: iso(o.t0), score: round(o.score),
    chosen: !!chosen && o.crop?.id === chosen.crop?.id && o.shift === chosen.shift,
    profitTkPerBigha: round(o.money?.net), costTkPerBigha: round(o.money?.cost), irrigationMm: round(o.water?.mm),
    weatherSafe: o.bt?.now?.n ? `${o.bt.now.safe}/${o.bt.now.n} seasons` : null,
    priceDropRisk: o.glut?.level ?? null, harvest: o.hw ? { start: iso(o.hw.start), end: iso(o.hw.end) } : null,
    source: 'season plan (decision.js): NASA POWER weather backtest of past seasons, FAOSTAT yield, published costs, DAM prices',
  }));
}

// When each crop's price is usually high or low in the year (DAM monthly grower prices, scaled by each year's median).
export function pricesSection(cropIds = []) {
  const out = {};
  for (const id of new Set(cropIds)) {
    const c = PRICE_SEASONS.crops?.[id];
    if (!c?.index) continue;
    const months = c.index.map((v, i) => [MONTHS[i], v]).filter(([, v]) => v != null);
    const sorted = [...months].sort((a, b) => b[1] - a[1]);
    out[id] = { highMonths: sorted.slice(0, 3).map(([m]) => m), lowMonths: sorted.slice(-3).map(([m]) => m), dipMonths: (c.dipMonths ?? []).map((m) => MONTHS[m - 1]), priceType: c.priceType, source: 'DAM monthly prices 2008–2023' };
  }
  return out;
}

// The crop's known problems in Bangladesh, so the model names them as farmers and officers do.
export function problemsSection(cropIds = []) {
  const out = {};
  for (const id of new Set(cropIds)) {
    const list = CROP_PROBLEMS[id];
    if (list) out[id] = list.map((p) => ({ key: p.key, kind: p.kind, urgent: !!p.urgent, name: { bn: p.bn, en: p.en }, looksLike: p.look?.bn }));
  }
  return out;
}

// Government programmes, matched to this farmer as the Support page does; a pilot or announcement is never a plain yes.
export function supportSection({ farmer, crops = [], upazila }) {
  if (!farmer) return [];
  const prof = supportProfile({ area_dec: farmer.area_dec, crops, irrigation: farmer.irrigation, area: AREA_TYPE[upazila?.id] ?? null, district: upazila?.district?.en });
  return matchSupport(BD_SUPPORT, prof).filter((m) => m.fit !== 'no').slice(0, 8)
    .map((m) => ({ name: m.p.name, fit: m.fit, status: m.p.status, why: m.why.map((w) => w.bn), where: m.p.where?.bn, source: m.p.src }));
}

export function casesSection(list = []) {
  return list.slice(0, 8).map((k) => ({ id: k.id, crop: k.crop, words: k.text?.bn, reported: iso(k.created), done: !!k.done, at: k.at, waitingFor: k.waiting?.who ?? null, waitingNote: k.waiting?.ask?.bn ?? null }));
}

export function soilSection(soil, chosen) {
  if (!soil) return null;
  return {
    ph: round(soil.ph, 1), organicMatterPct: round(soil.om_pct, 2), texture: soil.texture ?? null, drainage: soil.drainage ?? null,
    landform: soil.landform ?? null, scope: soil.scope ?? null, measured: !!soil.tested,
    notes: (chosen?.soilNotes ?? []).map((n) => n.bn).slice(0, 4),
    source: soil.tested ? 'the farmer’s own soil test' : 'ISRIC SoilGrids model estimate, not a soil test',
  };
}

// The pack: the most useful sections first; if it runs over the budget, the last ones are dropped and named.
export function knowledgePack(input, { budget = KNOWLEDGE_BUDGET } = {}) {
  const cropIds = [...(input.options ?? []).map((o) => o.crop?.id), input.cropNow].filter(Boolean);
  const order = [
    ['season_options', () => optionsSection(input.options, input.chosen)],
    ['soil_detail', () => soilSection(input.soil, input.chosen)],
    ['price_seasons', () => pricesSection(cropIds)],
    ['crop_problems', () => problemsSection(cropIds)],
    ['problem_cases', () => casesSection(input.cases)],
    ['government_support', () => supportSection(input)],
  ];
  const sections = {};
  const dropped = [];
  let size = 2;
  for (const [name, make] of order) {
    let v;
    try { v = make(); } catch { dropped.push(name); continue; }
    if (v == null || (Array.isArray(v) && !v.length) || (typeof v === 'object' && !Object.keys(v).length)) continue;
    const len = JSON.stringify(v).length + name.length + 4;
    if (size + len > budget) { dropped.push(name); continue; }
    sections[name] = v;
    size += len;
  }
  return { sections, size, dropped };
}
