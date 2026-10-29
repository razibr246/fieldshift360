// How a recommendation is explained: the score parts, how firm the ranking is, what to check before acting, the
// soil verdict, and the dataset register with its coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contributions, margin, weightStability, climateStability, firmness, beforeYouAct, soilVerdict, runnerUp, soilChanges, seasonColumns, compareText, calibrationFlags, OVERWARN, CLOSE } from './explain.js';
import { DATASETS, coverage, KINDS } from './provenance.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
async function season() {
  const { makeClimate } = await import('./climate.js');
  const { decide } = await import('./decision.js');
  const { buildDemo } = await import('../data/demo.js');
  const { makeUnion } = await import('./world.js');
  const clim = makeClimate(read('../data/climate/climate_godagari.json'));
  const demo = buildDemo(), plot = demo.farmers.find((f) => f.id === 'RAHIM');
  const args = { clim, soil: read('../data/soil/soil_godagari.json').unions[plot.union], plot, union: makeUnion(clim, demo, plot.union) };
  return { args, d: decide(args) };
}

test('an option’s score is the sum of its weighted factor scores, and the gap to the next decides a close call', async () => {
  const { d } = await season();
  for (const o of d.options) {
    const parts = contributions(o, d.weights);
    assert.ok(Math.abs(parts.reduce((a, p) => a + p.add, 0) - o.score) < 0.01, `${o.crop.id}: parts add up to the score`);
    assert.ok(parts.every((p) => p.add >= 0 && p.add + p.lost - p.w * 100 < 1e-9));
  }
  const m = margin(d.options);
  assert.equal(m.first.score, Math.max(...d.options.map((o) => o.score)));
  assert.equal(m.close, m.gap < CLOSE);
  const tie = margin([{ score: 70 }, { score: 68 }]);
  assert.ok(tie.close && tie.gap === 2);
});

test('the ranking is tested against other weights and other climates', async () => {
  const { args, d } = await season();
  const ws = weightStability(d.options, d.weights);
  assert.ok(ws.trials >= 10 && ws.same <= ws.trials && ws.pct >= 0 && ws.pct <= 1);
  const cs = climateStability(args);
  assert.deepEqual(cs.runs.map((r) => r.key), ['normal', 'dry', 'hot1', 'hot2']);
  assert.equal(cs.runs[0].crop, d.rec.crop.id, 'the as-measured run is the plan’s own answer');
  assert.equal(firmness({ gap: 2, weightPct: 1, climateHolds: true }), 'close');
  assert.equal(firmness({ gap: 20, weightPct: 1, climateHolds: true }), 'firm');
  assert.equal(firmness({ gap: 20, weightPct: 1, climateHolds: false }), 'fair');
});

test('before acting, the farmer is told to test the soil, check seed, date and the officer, and more when the field needs it', async () => {
  const { d } = await season();
  const base = beforeYouAct({ rec: d.rec }).map((x) => x.k);
  assert.ok(['soil', 'seed', 'date', 'officer'].every((k) => base.includes(k)));
  const lentil = { crop: { id: 'lentil', name: { bn: 'মসুর', en: 'Lentil' } } };
  const wet = beforeYouAct({ rec: lentil, risks: [{ k: 'wet', level: 2 }], glutLevel: 'High' }).map((x) => x.k);
  assert.ok(wet.includes('drain') && wet.includes('market'));
  assert.match(beforeYouAct({ rec: lentil, soilScope: 'union' })[0].en, /union centre/);
});

test('the soil verdict says when no rotation clearly does better than farming as now', () => {
  const h = (score) => ({ score });
  assert.equal(soilVerdict({ best: { dSoc: 0.4, health: h(51) }, habit: { dSoc: 0, health: h(50) } }).kind, 'none');
  assert.equal(soilVerdict({ best: { dSoc: 4, health: h(60) }, habit: { dSoc: -1, health: h(50) } }).kind, 'better');
  assert.equal(soilVerdict({ best: { dSoc: -1, health: h(60) }, habit: { dSoc: -5, health: h(40) } }).kind, 'slower');
  assert.equal(soilVerdict({ best: { dSoc: 4, health: h(60) }, habit: { dSoc: 0, health: h(50) }, pBeat: 0.9 }).robust, 'robust');
  assert.equal(soilVerdict({ best: { dSoc: 4, health: h(60) }, habit: { dSoc: 0, health: h(50) }, pBeat: 0.3 }).robust, 'sensitive');
  const e = (crops, residue = 'habit') => ({ rot: { cycle: crops.map(([rabi, k1]) => ({ rabi, k1 })), residue } });
  const best = e([['lentil', 'jute']]), same = e([['lentil', 'jute']], 'retain'), other = e([['mustard', 'mungbean']]);
  assert.equal(runnerUp([best, same, other], best), other, 'the runner-up grows different crops');
  const s = (o) => ({ dSoc: 0, nFix: 0, waterMm: 500, cover: 200, fodder: 1, ...o });
  const lines = soilChanges(s({ dSoc: 3, nFix: 40, waterMm: 300, cover: 260, fodder: 0.5 }), s({}), 'retain');
  assert.deepEqual(lines.map((l) => [l.k, l.sign]), [['carbon', 1], ['nitrogen', 1], ['water', 1], ['cover', 1], ['fodder', -1]]);
});

test('every dataset says what kind of evidence it is, its years, scale and limits; coverage marks what a field lacks', () => {
  for (const d of DATASETS) {
    assert.ok(KINDS[d.kind], `${d.id}: kind`);
    assert.ok(['calc', 'context'].includes(d.use) && d.name.bn && d.scale && d.limit.en && d.what.en, d.id);
  }
  assert.match(DATASETS.find((d) => d.id === 'soilgrids').limit.en, /not a test/);
  assert.match(DATASETS.find((d) => d.id === 'grace').limit.en, /not a measurement of your field/);
  const today = Date.parse('2026-10-29');
  const full = Object.fromEntries(coverage({ today, climEnd: '2026-10-15', soilScope: 'field', terrain: true, fieldNdvi: true, watch: true, watchEnd: '2026-10-18', cmip6: true, priceYearMin: 2025, radarThrough: '2026-10-17', srdi: true, liveWeather: true }).map((r) => [r.id, r.status]));
  assert.equal(full.soilgrids, 'ok');
  assert.equal(full.power, 'coarse');
  assert.equal(full.neighbours, 'sample');
  assert.equal(full.rules, 'unreviewed');
  const bare = Object.fromEntries(coverage({ today, climEnd: '2026-06-01', soilScope: 'union', priceYearMin: 2021 }).map((r) => [r.id, r.status]));
  assert.equal(bare.power, 'stale');
  assert.equal(bare.soilgrids, 'coarse');
  assert.equal(bare.terrain, 'missing');
  assert.equal(bare.prices, 'stale');
});

test('the season comparison puts the current crop beside the advice and at least two alternatives, and reads as text', async () => {
  const { args, d } = await season();
  const cols = seasonColumns(d, args.plot.last_crop);
  assert.ok(cols.filter((c) => c.role !== 'now').length >= 2, 'two alternatives at least');
  assert.equal(new Set(cols.map((c) => c.o.crop.id)).size, cols.length, 'each crop once');
  if (d.options.some((o) => o.crop.id === args.plot.last_crop)) assert.equal(cols[0].role, 'now');
  const txt = compareText({ cols, lang: 'bn', field: 'রহিমের জমি', firm: 'close' });
  assert.match(txt, /রহিমের জমি/);
  assert.ok(!/[0-9]/.test(txt.replace(/FieldShift 360/, '')), 'Bangla digits only');
  assert.equal(txt.split('\n').length, cols.length + 2);
});

test('where sources disagree: rain against rain, one elevation model against another, the field against its area, the climate models', async () => {
  const { disagreements, modelSpread } = await import('./provenance.js');
  const deltas = read('../data/climate/cmip6_deltas.json');
  const sp = modelSpread(deltas, 'godagari');
  assert.equal(sp.n, 8);
  assert.ok(sp.rainMax > sp.rainMin && sp.heatMax >= sp.heatMin);
  const d = disagreements({ cross: { rabi: { power: 120, imerg: 80, r: 0.8 } }, terrain: { spread: 6, relief: -1 }, field: { rabiNdvi: 0.25, areaNdvi: 0.48, vsArea: -0.23 }, spread: sp });
  assert.deepEqual(d.map((x) => [x.k, x.level]), [['rain', 'big'], ['terrain', 'big'], ['green', 'big'], ['models', sp.rainMax - sp.rainMin > 30 ? 'big' : 'some']]);
  assert.equal(Math.round(d[0].pct), 50);
  assert.equal(disagreements({}).length, 0);
});

test('a crop grown here every year whose limit is crossed in nearly every season is flagged as a suspect limit', async () => {
  const { args, d } = await season();
  const flags = calibrationFlags(d.options, args.plot.last_crop);
  const cur = d.options.find((o) => o.crop.id === args.plot.last_crop);
  assert.equal(flags.length, cur && cur.bt.now.safe / cur.bt.now.n <= OVERWARN ? 1 : 0);
  const mk = (id, safe, n) => ({ crop: { id }, bt: { now: { safe, n } } });
  assert.deepEqual(calibrationFlags([mk('boro', 0, 13), mk('wheat', 0, 13)], 'boro').map((f) => f.crop.id), ['boro'], 'only the crop already grown');
  assert.equal(calibrationFlags([mk('boro', 9, 13)], 'boro').length, 0);
});
