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
  assert.ok(b.review.some((x) => /no local agronomist/.test(x.en)) && b.review.some((x) => /soil test/.test(x.en)), 'local review is its own list');
  assert.ok(b.review.some((x) => /water stands/.test(x.en)), 'low land: look for standing water');
  assert.ok(!b.evidence.some((x) => /your field’s ISRIC SoilGrids carbon/.test(x.en)), 'the soil is not called the field’s own');
  const alt = strategyBrief({ s: best, b: base, rot, kind: 'alt', terrain: null });
  assert.match(alt.why[0].en, /real alternative/);
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

test('a field’s risk card names water, erosion, heat, cold, a dry Rabi and stressed years, each with its level', async () => {
  const { fieldRisks } = await import('./risks.js');
  const { makeClimate, timeMachine } = await import('./climate.js');
  const { readFileSync } = await import('node:fs');
  const tm = timeMachine(makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_dacope.json', import.meta.url)))));
  const r = fieldRisks({ terrain: fieldTerrain('DAC-TI-0201'), tm, land: landSummary('dacope') });
  assert.deepEqual(r.map((x) => x.k), ['wet', 'erosion', 'heat', 'cold', 'dry', 'stress']);
  assert.equal(r[0].level, 2, 'low coastal land');
  assert.ok(r.every((x) => [0, 1, 2].includes(x.level) && x.title.bn && x.value.en && x.note.en));
  assert.equal(fieldRisks({ terrain: null, tm: null, land: null }).length, 0);
});

test('registered fields have their own 250 m MODIS Rabi record since 2001, compared with their area', async () => {
  const { fieldGreen } = await import('./landsat.js');
  const { readFileSync } = await import('node:fs');
  const { parcels } = JSON.parse(readFileSync(new URL('../data/fields/parcels.json', import.meta.url)));
  const have = parcels.map((p) => fieldGreen(p.id, p.upazila)).filter(Boolean);
  assert.ok(have.length >= 18, `only ${have.length} fields have a record`);
  for (const g of have) {
    assert.ok(g.years[0] <= 2002 && g.years[1] >= 2025);
    assert.ok(g.rabiNdvi > 0.1 && g.rabiNdvi < 0.9 && g.areaNdvi > 0.1);
    assert.ok(g.stressYears.length <= 8);
  }
});

test('three statistical methods name a field’s stressed seasons, and where they agree is shown', async () => {
  const { stressMethods, fieldGreen, landRecord } = await import('./landsat.js');
  const f = fieldGreen('GDG-DP-0311', 'godagari');
  const m = stressMethods(f, landRecord('godagari').ndvi);
  assert.ok(m.n >= 12 && m.k >= 1);
  assert.deepEqual(Object.keys(m.sets), ['trend', 'low', 'area']);
  assert.equal(m.sets.low.length, m.k, 'the lowest fifth');
  assert.deepEqual(m.sets.trend, f.stressYears, 'the app’s own method is the first');
  assert.ok(m.all.every((y) => m.sets.trend.includes(y) && m.sets.low.includes(y) && m.sets.area.includes(y)));
  assert.ok(m.agreeTrendLow >= 0 && m.agreeTrendLow <= 1);
  assert.equal(stressMethods(null), null);
});

test('each field’s Rabi greenness a generation ago (Landsat) sits beside today’s (MODIS), with only clear changes called', async () => {
  const { landsatThenNow } = await import('./landsat.js');
  const r = landsatThenNow('DAC-TI-0201', 'dacope');
  assert.deepEqual(r.then.map((e) => e.label), ['1988–91', '1998–2001'], 'no clear 1984–86 pixels here');
  assert.ok(r.then.every((e) => e.ndvi > 0 && e.ndvi < 1 && e.n >= 2));
  assert.ok(['greener', 'browner', 'similar'].includes(r.direction));
  assert.equal(r.direction, Math.abs(r.change) <= 0.05 ? 'similar' : r.change > 0 ? 'greener' : 'browner');
  assert.equal(landsatThenNow('nope', 'dacope'), null);
});
