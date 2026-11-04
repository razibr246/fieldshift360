// Field signals on Godagari's real records: six signals with honest levels, rotation trade-offs, the uncertainty
// scenarios moving the way the weather does, and "what comes next".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate, timeMachine } from './climate.js';
import { rabiWetness, graceRecord, smapNow } from './soilwater.js';
import { landSummary } from './landsat.js';
import { fieldContext, fieldFuture, climateChange } from './soilfuture.js';
import { RABI_CROPS } from './crops.js';
import { fieldSignals, monsoonRain, tradeoffs, bestOn, heatShare, uncertainty, scenarioRun, whatNext, nutrientPath } from './signals.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const clim = makeClimate(read('../data/climate/climate_godagari.json'));
const tm = timeMachine(clim);
const ws = read('../data/water/water_sat.json'), sw = read('../data/water/soil_wetness.json');
const econ = { prices: read('../data/market/price_seasons.json'), costs: read('../data/market/crop_economics.json') };
const soil = { ph: 6.2, soc_g_kg: 12, bulk_density: 1.32, drainage: 'imperfect' };
const ctx = fieldContext({ clim, change: climateChange(read('../data/climate/cmip6_deltas.json'), 'godagari'), soil, plot: { irrigation: 'dtw' }, amanT: null, econ });
const ff = fieldFuture({ ctx, lastCrop: 'boro', plan: { rabi: 'wheat', k1: 'mungbean' }, priorities: [] });

test('six signals from the real records, each tagged and with a series', () => {
  const drain = ff.all.reduce((a, e) => (e.sNow.dSoc < a.sNow.dSoc ? e : a), ff.all[0]);
  const sig = fieldSignals({ tm, clim, wet: rabiWetness(sw, 'godagari'), smap: smapNow(ws, 'godagari'), grace: graceRecord(ws, 'godagari'), land: landSummary('godagari'), field: null, habit: ff.habit, best: ff.best, drain, soil: ctx.soil });
  const nut = sig.find((s) => s.id === 'nutrient');
  assert.ok(nut.drain && nut.drain.at(-1).y < nut.series[0].y, 'the most draining rotation ends below today');
  assert.ok(nut.compare.at(-1).y >= nut.series[0].y, 'the best rotation does not run the soil down');
  assert.deepEqual(sig.map((s) => s.id), ['rain', 'soil', 'heat', 'ndvi', 'water', 'nutrient']);
  for (const s of sig) {
    assert.ok([0, 1, 2].includes(s.level), s.id);
    assert.ok(s.tags.length && s.source && s.title.bn && s.value.en, s.id);
    assert.ok(s.series.length >= 8, `${s.id} has a record`);
    assert.doesNotMatch(s.value.bn, /[0-9]/, `${s.id}: Bangla text uses Bangla digits`);
  }
  // Godagari's water store is falling, and surely (README: −8.9 cm a decade, p < 0.01)
  assert.equal(sig.find((s) => s.id === 'water').level, 2);
});

test('monsoon rain: every season with a full record, then and now', () => {
  const m = monsoonRain(clim);
  assert.equal(m.series.length, 25);
  assert.ok(m.then > 600 && m.then < 2500 && m.now > 600 && m.now < 2500);
});

test('nutrients: the usual rotation holds its carbon, so organic matter starts and ends close', () => {
  const p = nutrientPath(ff.habit, ctx.soil);
  assert.equal(p.length, 11);
  assert.ok(Math.abs(p[p.length - 1].om - p[0].om) < 0.15);
});

test('trade-offs: Boro uses the most water and has the heat risk; a pulse rotation builds soil', () => {
  const rows = tradeoffs([{ id: 'habit', name: 'as now', e: ff.habit }, { id: 'best', name: 'best', e: ff.best }], ctx);
  const [habit, best] = rows;
  assert.ok(habit.water.now > best.water.now);
  assert.ok(best.soil.now >= habit.soil.now);
  assert.ok(habit.heat.now > 0 && habit.heat.now <= 1);
  assert.ok(habit.heat.fut >= habit.heat.now, 'the 2040s are not cooler at Boro flowering');
  assert.ok(habit.yield > 4 && habit.yield < 15);
  assert.deepEqual(bestOn(rows).water, 'best');
  assert.equal(heatShare(clim, RABI_CROPS.lentil, ctx.rabi.lentil.t0), 0); // lentil has no heat rule
});

test('uncertainty: drought needs more water and heavy rain less; hotter is not safer', () => {
  const crop = RABI_CROPS.boro, t0 = ctx.rabi.boro.t0;
  const u = uncertainty(clim, crop, t0, { dT: 1.5, rain: 0.8 });
  const by = Object.fromEntries(u.map((r) => [r.key, r]));
  assert.ok(by.normal.p10 <= by.normal.p50 && by.normal.p50 <= by.normal.p90);
  assert.ok(by.drought.p50 > by.normal.p50);
  assert.ok(by.wet.p50 < by.normal.p50);
  assert.ok(by.hot.safe <= by.normal.safe);
  assert.ok(by.custom, 'a slider setting is added as its own row');
  assert.deepEqual(scenarioRun(clim, crop, t0).p50, by.normal.p50);
});

test('what next: the week, the season, the years, and the worst signal', () => {
  const rows = tradeoffs([{ id: 'habit', e: ff.habit }, { id: 'best', e: ff.best }], ctx);
  const sig = fieldSignals({ tm, clim, grace: graceRecord(ws, 'godagari'), habit: ff.habit, best: ff.best, soil: ctx.soil });
  const steps = whatNext({ water: { color: 'ORANGE', reasons: [{ bn: 'ক', en: 'a' }] }, plan: { crop: RABI_CROPS.wheat, t0: ctx.rabi.wheat.t0 }, unc: uncertainty(clim, RABI_CROPS.wheat, ctx.rabi.wheat.t0), trade: rows, signals: sig });
  assert.deepEqual(steps.map((s) => s.id), ['week', 'season', 'years', 'watch']);
  assert.equal(steps[0].tone, 2);
  assert.match(steps[1].text.en, /of 13 recent seasons/);
});
