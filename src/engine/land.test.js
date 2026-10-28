// The land from space (MODIS, MERRA-2), the fields' SRTM terrain, and the strategy briefs Field Future shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landSummary, rabiGreenness } from './landsat.js';
import { fieldTerrain, terrainRisk, strategyBrief } from './briefs.js';

test('every upazila has 25 years of MODIS greenness, ground heat and MERRA-2 evaporation that look like Bangladesh', () => {
  for (const id of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) {
    const d = landSummary(id);
    assert.ok(d.years[0] <= 2001 && d.years[1] >= 2025, `${id}: record ${d.years}`);
    assert.ok(d.green.cycle.every((v) => v > 0.1 && v < 0.9), `${id}: NDVI out of range`);
    assert.ok(d.green.lean.length >= 2 && d.green.lean.length <= 5);
    assert.ok(d.heat.now > 20 && d.heat.now < 45, `${id}: ground heat ${d.heat.now}`);
    assert.ok(d.evapYear > 500 && d.evapYear < 2000, `${id}: evaporation ${d.evapYear}`);
    assert.ok(d.stressYears.length <= 7, `${id}: too many stress years`);
  }
});

test('stress years are measured against the trend, so a steadily greening area is not called stressed', () => {
  const ndvi = {};
  for (let y = 2001; y <= 2025; y++) for (const m of [1, 2, 3, 12]) ndvi[`${y}-${String(m).padStart(2, '0')}`] = 0.3 + (y - 2001) * 0.01;
  const r = rabiGreenness(ndvi);
  assert.equal(r.filter((x) => x.stress).length, 0);
  assert.ok(Math.abs(r.perDecade - 0.1) < 1e-6);
});

test('every registered field has SRTM terrain, and low coastal land is named', () => {
  assert.equal(terrainRisk(fieldTerrain('DAC-TI-0201')).wet, 'coast');
  assert.ok(fieldTerrain('GDG-DP-0311').elev > 10);
  assert.equal(fieldTerrain('nope'), null);
});

test('a strategy brief always says why, what evidence, what is unknown and what to check locally', () => {
  const base = { waterMm: 600, money: 8000, risk: 0.4, pest: 50, dSoc: 0, nFix: 0, health: { legume: false }, unpriced: [] };
  const best = { waterMm: 300, money: 9000, risk: 0.2, pest: 20, dSoc: 3, nFix: 40, health: { legume: true }, unpriced: ['mungbean'] };
  const rot = { cycle: [{ rabi: 'mustard', k1: 'mungbean' }], residue: 'retain' };
  const b = strategyBrief({ s: best, b: base, rot, kind: 'best', terrain: fieldTerrain('DAC-TI-0201') });
  for (const k of ['why', 'evidence', 'benefits', 'gaps', 'risks']) assert.ok(b[k].length > 0 && b[k].every((x) => x.bn && x.en), k);
  assert.ok(b.why.some((x) => /nitrogen/.test(x.en)), 'the legume is named');
  assert.ok(b.risks.some((x) => /fodder/.test(x.en)), 'keeping straw in the soil costs fodder');
  assert.ok(b.risks.some((x) => /waterlogging/.test(x.en)), 'low coastal land and a crop that hates waterlogging');
  assert.ok(b.gaps.some((x) => /Mungbean/.test(x.en)), 'unpriced crop named');
});

test('asking for fodder or for covered soil changes which rotation comes first', async () => {
  const { rank } = await import('./soilfuture.js');
  const mk = (id, o) => ({ id, sNow: { health: { score: 60 }, waterMm: 400, money: 8000, risk: 0.2, pest: 30, fodder: 1, cover: 250, ...o } });
  const evals = () => [mk('grazing', { fodder: 3, cover: 240, money: 7900 }), mk('covered', { fodder: 1, cover: 330, money: 7900 }), mk('cash', { money: 9000 })];
  assert.equal(rank(evals(), []).evals[0].id, 'cash');
  assert.equal(rank(evals(), ['fodder']).evals[0].id, 'grazing');
  assert.equal(rank(evals(), ['cover']).evals[0].id, 'covered');
});

test('a crop the farmer cannot grow is left out of the season advice', async () => {
  const { readFileSync } = await import('node:fs');
  const { makeClimate } = await import('./climate.js');
  const { decide } = await import('./decision.js');
  const { buildDemo } = await import('../data/demo.js');
  const { makeUnion } = await import('./world.js');
  const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
  const clim = makeClimate(read('../data/climate/climate_godagari.json'));
  const demo = buildDemo(), plot = demo.farmers.find((f) => f.id === 'RAHIM');
  const args = { clim, soil: read('../data/soil/soil_godagari.json').unions[plot.union], plot, union: makeUnion(clim, demo, plot.union) };
  const free = decide(args);
  const without = decide({ ...args, exclude: [free.rec.crop.id] });
  assert.notEqual(without.rec.crop.id, free.rec.crop.id);
  assert.ok(without.options.every((o) => o.crop.id !== free.rec.crop.id));
  const noHabit = decide({ ...args, exclude: [plot.last_crop] });
  assert.notEqual(noHabit.rec.crop.id, plot.last_crop, 'the crop grown now is not advised once ruled out');
  assert.equal(noHabit.label, 'SHIFT');
});

test('the what-if sliders replay the same seasons warmer and wetter or drier', async () => {
  const { parseWhatIf, whatIf, makeClimate } = await import('./climate.js');
  const { readFileSync } = await import('node:fs');
  assert.deepEqual(parseWhatIf('c:1.5:0.8'), { dT: 1.5, rain: 0.8 });
  assert.equal(parseWhatIf('hot2').dT, 2);
  const c = makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_godagari.json', import.meta.url))));
  const w = whatIf(c, 'c:2:0.5'), t = c.start + 200 * 86400000;
  assert.equal(w.val('tmax', t), c.val('tmax', t) + 2);
  assert.equal(w.val('prec', t), c.val('prec', t) * 0.5);
});
