// Run with: npm test   (Node built-in test runner)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate, backtest, timeMachine, SEASONS, rainAgrees } from './climate.js';
import { RABI_CROPS, BORO_HEAT_SENSITIVITIES, withBoroHeat } from './crops.js';
import { decide, weightsFor } from './decision.js';
import { recommendRotation } from './rotation.js';
import { waterAdvice, cropStage } from './water.js';
import { dbscan, findHotspots } from './cluster.js';
import { buildDemo } from '../data/demo.js';
import { makeUnion } from './world.js';

const climJson = JSON.parse(readFileSync(new URL('../data/climate/climate_godagari.json', import.meta.url)));
const soilJson = JSON.parse(readFileSync(new URL('../data/soil/soil_godagari.json', import.meta.url)));
const clim = makeClimate(climJson);

test('25 seasons, backtest covers them all', () => {
  assert.equal(SEASONS.length, 25);
  const bt = backtest(clim, RABI_CROPS.tomato, 0);
  assert.equal(bt.then.n + bt.now.n, 25);
});

test('weights always sum to 1', () => {
  for (const p of [[], ['water'], ['soil', 'early'], ['income', 'risk']]) {
    const s = Object.values(weightsFor(p)).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-9);
  }
});

test('decision returns a label and ranked options', () => {
  const demo = buildDemo();
  const plot = demo.farmers.find((f) => f.id === 'RAHIM');
  const union = makeUnion(clim, demo, plot.union);
  const d = decide({ clim, soil: soilJson.unions[plot.union], plot, union, priorities: ['water'] });
  assert.ok(['KEEP', 'ADJUST', 'SHIFT'].includes(d.label));
  assert.equal(d.options.length, 5);
  const rot = recommendRotation({ clim, soil: soilJson.unions[plot.union], plot, chosen: d.rec, priorities: ['water'] });
  assert.ok(rot.best || rot.directAman);
  console.log('label', d.label, 'rec', d.rec.crop.id, d.rec.shift, 'scores', d.options.map((o) => `${o.crop.id}:${o.score.toFixed(0)}`).join(' '));
  console.log('rotation', rot.best?.crop.id, rot.directAman);
});

test('Boro heat sensitivities leave the default rule intact and only relax the exploratory copy', () => {
  const rule = RABI_CROPS.boro.rules.find((r) => r.id === 'boro_heat');
  const relaxed = withBoroHeat(RABI_CROPS.boro, BORO_HEAT_SENSITIVITIES.find((x) => x.id === '37c'));
  assert.deepEqual([rule.thr, rule.min], [35, 3]);
  assert.deepEqual([relaxed.rules.find((r) => r.id === 'boro_heat').thr, relaxed.rules.find((r) => r.id === 'boro_heat').min], [37, 3]);
  assert.deepEqual([RABI_CROPS.boro.rules[0].thr, RABI_CROPS.boro.rules[0].min], [35, 3]);
});

test('priorities change the ranking weights', () => {
  const demo = buildDemo();
  const plot = demo.farmers.find((f) => f.id === 'RAHIM');
  const union = makeUnion(clim, demo, plot.union);
  const a = decide({ clim, soil: soilJson.unions[plot.union], plot, union, priorities: ['income'] });
  const b = decide({ clim, soil: soilJson.unions[plot.union], plot, union, priorities: ['water'] });
  console.log('income→', a.options[0].crop.id, ' water→', b.options[0].crop.id);
  assert.notDeepEqual(a.weights, b.weights);
});

test('water advice colours', () => {
  const c = RABI_CROPS.tomato;
  const st = cropStage(c, 50);
  assert.equal(waterAdvice({ crop: c, stage: st, rain7: 0, rainNext3: 0, tmax: 27, fieldCheck: 'wet' }).color, 'GREEN');
  assert.equal(waterAdvice({ crop: c, stage: st, rain7: 0, rainNext3: 0, tmax: 36, fieldCheck: 'dry' }).color, 'RED');
  assert.equal(waterAdvice({ crop: c, stage: st, rain7: 0, rainNext3: 0, tmax: 26, fieldCheck: null }).color, 'YELLOW');
});

test('DBSCAN finds the seeded Deopara leaf-spot cluster', () => {
  const demo = buildDemo();
  const hs = findHotspots(demo.requests);
  assert.ok(hs.length >= 1, 'expected at least one hotspot');
  assert.ok(hs[0].members.length >= 5);
  assert.equal(dbscan([{ id: 1, lat: 0, lon: 0 }], 1, 2).length, 0);
});

test('time machine produces then/now means', () => {
  const tm = timeMachine(clim);
  for (const m of Object.values(tm)) assert.ok(m.then !== null && m.now !== null);
});

test('Dhamrai: real NASA climate, every demo farm inside its real union outline, and a plan for Razib', () => {
  const dClim = makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_dhamrai.json', import.meta.url))));
  assert.equal(dClim.prov.status, 'REAL');
  const demo = buildDemo();
  const places = JSON.parse(readFileSync(new URL('../data/geo/dhamrai_places.json', import.meta.url)));
  const inside = (lat, lon, r) => {
    let c = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [y1, x1] = r[i], [y2, x2] = r[j];
      if ((y1 > lat) !== (y2 > lat) && lon < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) c = !c;
    }
    return c;
  };
  const dh = demo.farmers.filter((f) => demo.unions.find((u) => u.id === f.union).upazila === 'dhamrai');
  assert.ok(dh.length > 300);
  for (const f of dh) assert.ok(inside(f.lat, f.lon, places.unions.find((u) => u.en === f.union).ring), `${f.id} in ${f.union}`);
  const razib = demo.farmers.find((f) => f.id === 'RAZIB');
  assert.equal(razib.union, 'Chauhat');
  const soil = JSON.parse(readFileSync(new URL('../data/soil/soil_dhamrai.json', import.meta.url))).unions.Chauhat;
  const d = decide({ clim: dClim, soil, plot: razib, union: makeUnion(dClim, demo, 'Chauhat'), priorities: [] });
  assert.ok(d.rec && d.rec.bt.now.n > 0);
  assert.ok(!d.rec.soilNotes.some((n) => n.en.includes('Barind')), 'no Barind wording on Dhamrai land');
});

// ---- District harvest outlook and crop switch (engine/outlook.js) ----
import { districtOutlook, cropSwitch, harvestState, weeklyHarvest, rabiMoney, ringKm2, AMAN_YIELD } from './outlook.js';

test('outlook: the BBS district Aman area is shared out exactly, and tonnes follow the yield', () => {
  const o = districtOutlook('dhaka');
  assert.equal(o.rows.length, 5);
  const ha = o.rows.reduce((a, r) => a + r.ha, 0);
  assert.ok(Math.abs(ha - o.bbsHa) < 1e-6, 'upazila shares add up to the district total');
  assert.ok(Math.abs(o.tonnes - o.bbsHa * AMAN_YIELD.tHa) < 1e-6);
  for (const r of o.rows) assert.equal(r.end - r.start, 25, 'harvest window is 95–120 days after transplanting');
  const wk = weeklyHarvest(o);
  const t = wk.reduce((a, w) => a + o.rows.reduce((b, r) => b + (w[r.id] ?? 0), 0), 0);
  assert.ok(Math.abs(t - o.tonnes) < 1e-6, 'weekly bins hold every tonne');
});

test('outlook: an upazila without a reliable radar date this year falls back to its usual day', () => {
  const o = districtOutlook('dhaka');
  const k = o.rows.find((r) => r.id === 'keraniganj');
  assert.equal(k.fromRadar, false);
  assert.equal(k.T, k.u.transplantNormal);
});

test('outlook: harvest state before, during and after the window', () => {
  const r = { start: 300, end: 325 };
  assert.deepEqual(harvestState(r, 290), { k: 'soon', days: 10 });
  assert.equal(harvestState(r, 310).k, 'now');
  assert.equal(harvestState(r, 330).k, 'done');
});

test('crop switch: timing decides what fits; money is yield x (price - cost)', () => {
  const m = rabiMoney('mustard');
  assert.equal(m.net, Math.round(m.kg * (m.priceKg - m.costKg)));
  const early = cropSwitch({ start: 270, end: 290 }, 2026); // Aman off by mid-October
  const late = cropSwitch({ start: 330, end: 350 }, 2026); // Aman off in December
  assert.equal(early.crops.find((c) => c.id === 'mustard').fit, 'all');
  assert.equal(late.crops.find((c) => c.id === 'mustard').fit, 'late');
  assert.equal(early.relay.fit, 'all');
  assert.equal(late.relay.fit, 'late');
  assert.equal(late.crops.find((c) => c.id === 'boro').fit, 'all', 'Boro still fits after a late Aman');
});

test('ringKm2: a 0.1-degree square near Dhaka is about 113 km²', () => {
  const a = ringKm2([[90, 23.7], [90.1, 23.7], [90.1, 23.8], [90, 23.8]]);
  assert.ok(a > 110 && a < 116, `got ${a}`);
});

// Weather warnings from a synthetic forecast: the published thresholds, and the Hutton late-blight criteria.
import { weatherWarnings } from './weatherRisk.js';
const fakeForecast = (days) => ({
  days: days.map((d, i) => ({ date: `2026-12-${String(10 + i).padStart(2, '0')}`, max: d.max ?? 25, min: d.min ?? 14, rain: d.rain ?? 0 })),
  hours: days.flatMap((d, i) => Array.from({ length: 24 }, (_, h) => ({ date: `2026-12-${String(10 + i).padStart(2, '0')}`, hour: h, temp: d.temp ?? 18, rh: h < (d.wetHours ?? 0) ? 95 : 70 }))),
});
test('weather warnings follow BMD classes and the Hutton criteria', () => {
  const ids = (fc, crops) => weatherWarnings(fc, { crops: new Set(crops), month: 12 }).map((w) => `${w.id}:${w.level}`);
  assert.deepEqual(ids(fakeForecast([{ rain: 50 }, {}]), []), ['rain:medium']);
  assert.deepEqual(ids(fakeForecast([{ rain: 95 }]), []), ['rain:high']);
  assert.deepEqual(ids(fakeForecast([{ min: 9 }]), ['boro']), ['cold:medium']);
  assert.deepEqual(ids(fakeForecast([{ min: 9 }]), ['mustard']), []); // a cold wave alone only matters for Boro seedbeds and tomato
  // Hutton: two consecutive days, min >= 10 and >= 6 humid hours; one such day is not enough
  assert.deepEqual(ids(fakeForecast([{ wetHours: 8 }, { wetHours: 7 }]), ['tomato']), ['late_blight:high']);
  assert.deepEqual(ids(fakeForecast([{ wetHours: 8 }, { wetHours: 2 }, { wetHours: 8 }]), ['tomato']), []);
  assert.deepEqual(ids(fakeForecast([{ wetHours: 8, min: 8 }, { wetHours: 8, min: 8 }]), ['tomato']), ['cold:medium']);
});

// ---- Field Future (soilfuture.js) ----
import { fieldContext, fieldFuture, cropCarbon, socStock, futureClimate, climateChange, feasible, rankBoroSensitivity } from './soilfuture.js';

const ffEcon = { prices: JSON.parse(readFileSync(new URL('../data/market/price_seasons.json', import.meta.url))), costs: JSON.parse(readFileSync(new URL('../data/market/crop_economics.json', import.meta.url))) };
const ffSoil = { ph: 6.2, soc_g_kg: 12, bulk_density: 1.32, drainage: 'imperfect' };

test('field future: the usual rotation holds today’s carbon, and Boro leaves no room for a Kharif-1 crop', () => {
  const ctx = fieldContext({ clim, change: null, soil: ffSoil, plot: { irrigation: 'dtw' }, amanT: null, econ: ffEcon });
  assert.equal(feasible(ctx, { rabi: 'boro', k1: 'mungbean' }), false);
  assert.equal(feasible(ctx, { rabi: 'wheat', k1: 'mungbean' }), true);
  const ff = fieldFuture({ ctx, lastCrop: 'boro', plan: { rabi: 'wheat', k1: 'mungbean' }, priorities: [] });
  const socs = ff.habit.now.map((r) => r.soc);
  for (const x of socs) assert.ok(Math.abs(x - ctx.soc0) < 0.05, `habit drifts: ${x} vs ${ctx.soc0}`);
  assert.ok(ff.best.sNow.dSoc >= 0, 'the best rotation never runs the soil down when one exists');
  assert.ok(ff.count > 100);
});

test('field future Boro heat scenarios reduce or hold the Boro weather-risk share without changing the baseline', () => {
  const base = fieldContext({ clim, change: null, soil: ffSoil, plot: { irrigation: 'dtw' }, amanT: null, econ: ffEcon });
  const warmerLimit = fieldContext({ clim, change: null, soil: ffSoil, plot: { irrigation: 'dtw' }, amanT: null, econ: ffEcon,
    boroHeat: BORO_HEAT_SENSITIVITIES.find((x) => x.id === '37c') });
  assert.ok(warmerLimit.rabi.boro.risk.now <= base.rabi.boro.risk.now);
  assert.equal(RABI_CROPS.boro.rules[0].thr, 35);
  const ff = fieldFuture({ ctx: base, lastCrop: 'boro', plan: null, priorities: [] });
  const same = rankBoroSensitivity(ff, base, [], []);
  const alternate = rankBoroSensitivity(ff, warmerLimit, [], []);
  assert.deepEqual(same.top.map((x) => x.rot), ff.top.map((x) => x.rot));
  assert.ok(alternate.all.find((x) => x.rot.cycle.some((y) => y.rabi === 'boro')).sNow.risk <=
    ff.all.find((x) => x.rot.cycle.some((y) => y.rabi === 'boro')).sNow.risk);
});

test('field future: straw kept and roots put more carbon in; no irrigation means no Boro', () => {
  assert.ok(cropCarbon('aman', 3.8, 'retain').total > cropCarbon('aman', 3.8, 'habit').total);
  assert.ok(cropCarbon('mungbean', 0.8, 'retain').root > 0);
  assert.ok(Math.abs(socStock({ soc_g_kg: 10, bulk_density: 1.5 }) - 45) < 1e-9);
  const ctx = fieldContext({ clim, change: null, soil: ffSoil, plot: { irrigation: 'none' }, amanT: null, econ: ffEcon });
  assert.equal(ctx.rabi.boro.blocked, 'water');
});

test('field future: a uniform +2 °C change warms every day by 2 °C and speeds decay', () => {
  const change = { scenario: 'test', dTmax: new Array(12).fill(2), dTmin: new Array(12).fill(2), rain: new Array(12).fill(1) };
  const f = futureClimate(clim, change);
  const t = Date.UTC(2020, 3, 10);
  assert.ok(Math.abs(f.val('tmax', t) - clim.val('tmax', t) - 2) < 1e-9);
  const ctx = fieldContext({ clim, change, soil: ffSoil, plot: { irrigation: 'dtw' }, amanT: null, econ: ffEcon });
  assert.ok(ctx.temp.fut > 1.05 && ctx.temp.fut < 1.25);
  const ff = fieldFuture({ ctx, lastCrop: 'boro', plan: null, priorities: [] });
  assert.ok(ff.habit.sFut.dSoc < 0, 'the same farming loses carbon in a warmer world');
  assert.equal(climateChange(null, 'godagari'), null);
});

// ---- Seven Divisions missions (missions.js) ----
import { MISSIONS, history, relYield, limeDose, isKotal, moonAge } from './missions.js';
const storiesData = JSON.parse(readFileSync(new URL('../data/climate/stories_climate.json', import.meta.url)));

test('missions: the Sohra IMERG rule finds the four big haor flash floods on their days', () => {
  const s = MISSIONS.sylhet;
  const day = (y) => { const f = s.hazard(storiesData, y).flood; return f && new Date(Date.UTC(2001, 0, 1) + f.i * 864e5).toISOString().slice(0, 10); };
  assert.equal(day(2004), '2004-04-14');
  assert.equal(day(2010), '2010-03-30');
  assert.equal(day(2017), '2017-03-31');
  assert.equal(day(2022), '2022-04-15');
});

test('missions: the officer’s advice beats the old habits in every division, over every year', () => {
  for (const m of Object.values(MISSIONS)) {
    const inp = Object.fromEntries(Object.entries(m.inputs ?? {}).map(([k, v]) => [k, v.value]));
    const best = history(m, storiesData, m.best, inp), old = history(m, storiesData, m.start, inp);
    assert.ok(best.avg > old.avg + 40, `${m.id}: ${best.avg} vs ${old.avg}`);
    assert.ok(best.dangers <= old.dangers, m.id);
  }
});

test('missions: Maas–Hoffman, lime and moon helpers', () => {
  assert.equal(relYield('boro', 3), 100);
  assert.equal(relYield('boro', 8), 40); // 100 − 12 × (8 − 3)
  assert.equal(limeDose(6.0), 0);
  assert.equal(limeDose(4.3, 35), 3);
  assert.ok(moonAge(Date.UTC(2000, 0, 6, 18, 14)) < 0.01);
  assert.ok(isKotal(Date.UTC(2000, 0, 8)));
});

test('Godagari and Dhamrai each run on their own real NASA POWER file, 25 seasons, backtest for both', () => {
  const read = (u) => JSON.parse(readFileSync(new URL(`../data/climate/climate_${u}.json`, import.meta.url)));
  const g = read('godagari'), d = read('dhamrai');
  for (const [name, j] of [['godagari', g], ['dhamrai', d]]) {
    assert.equal(j.provenance.status, 'REAL', `${name} is real`);
    assert.match(j.provenance.url, /power\.larc\.nasa\.gov/);
    for (const k of ['tmax', 'tmin', 'prec', 'rh', 'srad']) assert.equal(j[k].length, j.tmax.length, `${name} has ${k} for every day`);
    const c = makeClimate(j), bt = backtest(c, RABI_CROPS.tomato, 0);
    assert.equal(bt.then.n + bt.now.n, 25, `${name}: backtest covers 25 seasons`);
  }
  assert.notDeepEqual(g.prec, d.prec, 'Dhamrai must not reuse Godagari rainfall');
  assert.notDeepEqual(g.tmax, d.tmax, 'Dhamrai must not reuse Godagari temperatures');
  assert.notEqual(`${g.provenance.lat},${g.provenance.lon}`, `${d.provenance.lat},${d.provenance.lon}`);
});

test('in Kartik the sample inbox is about the standing Aman, dated up to today', async () => {
  const { ymd } = await import('./dates.js');
  const today = ymd(2026, 10, 21);
  const { requests } = buildDemo({ today });
  assert.ok(requests.every((r) => r.season === 'aman' && r.created <= today), 'all Aman-season and none in the future');
  assert.ok(!requests.some((r) => r.symptom === 'aphid' || r.symptom === 'cold'), 'no January mustard aphids or cold waves');
  const spots = findHotspots(requests);
  assert.ok(spots.some((h) => h.crop === 'aman' && h.symptom === 'bph' && h.members.length >= 5), 'Deopara planthopper alert');
  assert.ok(spots.some((h) => h.crop === 'aman' && h.symptom === 'blast' && h.members.length >= 7), 'Chauhat neck-blast alert, with Razib');
  assert.equal(buildDemo().requests[0].season, 'rabi', 'the default (test) date keeps the January demo');
});

test('climate account: Boro-Aman paddy gives off methane, AWD cuts it, and a rotation without Boro less again', async () => {
  const sf = await import('./soilfuture.js');
  const deltas = JSON.parse(readFileSync(new URL('../data/climate/cmip6_deltas.json', import.meta.url)));
  const clim = makeClimate(climJson);
  const soil = Object.values(soilJson.unions)[0];
  const ctx = sf.fieldContext({ clim, change: sf.climateChange(deltas, 'godagari'), soil, plot: { irrigation: 'dtw' }, amanT: null, econ: null });
  const ff = sf.fieldFuture({ ctx, lastCrop: 'boro', plan: { rabi: 'mustard', k1: 'fallow' }, priorities: [] });
  const flood = sf.climateLedger(ctx, ff.habit.rot, ff.habit.now), awd = sf.climateLedger(ctx, ff.habit.rot, ff.habit.now, { awd: true });
  // Boro 115 d at 0.85 kg/ha/d flooded, Aman 120 d rainfed (×0.54), with stubble straw: 100–250 kg CH₄/ha a year.
  assert.ok(flood.ch4 > 100 && flood.ch4 < 250, `methane ${flood.ch4}`);
  assert.ok(awd.ch4 < flood.ch4 * 0.8, 'AWD on the Boro cuts the yearly methane');
  assert.ok(Math.abs(flood.soilCo2) < 1e-6, 'the usual rotation holds today’s soil carbon (calibrated steady state)');
  const noBoro = sf.climateLedger(ctx, { cycle: [{ rabi: 'mustard', k1: 'fallow' }], residue: 'habit' }, ff.habit.now);
  assert.ok(noBoro.ch4 < flood.ch4 / 2, 'only the Aman is flooded without Boro');
});

test('eight-model test: each rotation counted once, every count within the number of models', async () => {
  const sf = await import('./soilfuture.js');
  const deltas = JSON.parse(readFileSync(new URL('../data/climate/cmip6_deltas.json', import.meta.url)));
  const base = { clim: makeClimate(climJson), soil: Object.values(soilJson.unions)[0], plot: { irrigation: 'dtw' }, amanT: null, econ: null };
  const ctx = sf.fieldContext({ ...base, change: sf.climateChange(deltas, 'godagari') });
  const ff = sf.fieldFuture({ ctx, lastCrop: 'boro', plan: { rabi: 'mustard', k1: 'fallow' }, priorities: [] });
  const mt = sf.modelTest({ base, deltas, upazilaId: 'godagari', scenario: 'ssp245', rots: [ff.best.rot, ...ff.top.map((e) => e.rot), ff.habit.rot], habit: ff.habit.rot, cal: ff.cal, priorities: [], range: ff.range });
  assert.equal(mt.n, 8);
  assert.equal(new Set(mt.list.map((x) => JSON.stringify(x.rot))).size, mt.list.length);
  assert.equal(mt.list.reduce((a, x) => a + x.wins, 0), 8, 'one winner per model');
  for (const x of mt.list) assert.ok(x.keepsSoil <= 8 && x.safer <= 8 && x.wins <= 8);
  assert.ok(mt.robust.keepsSoil >= mt.list.find((x) => JSON.stringify(x.rot) === JSON.stringify(ff.habit.rot)).keepsSoil);
});

test('Rabi soil wetness: NASA POWER GWETROOT for all seven upazilas, Nov–Mar seasons from 2002, with a trend', async () => {
  const { rabiWetness } = await import('./soilwater.js');
  const sw = JSON.parse(readFileSync(new URL('../data/water/soil_wetness.json', import.meta.url)));
  for (const id of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) {
    const r = rabiWetness(sw, id);
    assert.equal(r.first, 2002, `${id}: the first full Rabi season`);
    assert.equal(r.series.length, 24, `${id}: 2002–2025`);
    assert.ok(r.series.every((x) => x.root > 0 && x.root <= 1), `${id}: wetness is a fraction`);
    assert.ok(r.trend && r.trend.p >= 0 && r.trend.p <= 1);
  }
  assert.equal(rabiWetness(sw, 'nowhere'), null);
});

test('satellite water and abroad rotations: GRACE, SMAP and ten-year soil options for every farm', async () => {
  const w = await import('./soilwater.js');
  const ra = await import('./rotationAbroad.js');
  const sf = await import('./soilfuture.js');
  const ws = JSON.parse(readFileSync(new URL('../data/water/water_sat.json', import.meta.url)));
  const sw = JSON.parse(readFileSync(new URL('../data/water/soil_wetness.json', import.meta.url)));
  const sy = JSON.parse(readFileSync(new URL('../data/soil/abroad_soil_yields.json', import.meta.url)));
  const deltas = JSON.parse(readFileSync(new URL('../data/climate/cmip6_deltas.json', import.meta.url)));
  const g = w.graceRecord(ws, 'godagari');
  assert.ok(g.years.length >= 15 && g.trend.perDecade < 0, 'GRACE: water under the Barind is falling');
  assert.ok(w.smapVsPower(ws, sw, 'godagari').r > 0.7, 'SMAP and POWER root-zone wetness agree');
  assert.ok(w.smapNow(ws, 'dhamrai').normal > 0);
  for (const c of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar']) {
    const d = JSON.parse(readFileSync(new URL(`../data/abroad/${c}.json`, import.meta.url)));
    const r = ra.abroadRotations({ country: c, soil: sy.countries[c].soil, yields: sy.countries[c].yields, normals: d.points.farm.normals, change: sf.climateChange(deltas, `abroad_${c}`) });
    const habit = r.options.find((o) => o.habit);
    assert.ok(Math.abs(habit.dSoc) < 1e-6, `${c}: the current cycle holds today's carbon`);
    const kept = r.options.find((o) => o.residue === 'retain' && JSON.stringify(o.cycle) === JSON.stringify(habit.cycle));
    if (kept) assert.ok(kept.dSoc > 0, `${c}: keeping the straw builds carbon`);
    assert.ok(r.options.every((o) => Number.isFinite(o.net)));
  }
});

test('robustness ensemble: every climate model with every FAOSTAT yield year, chances between 0 and 1', async () => {
  const sf = await import('./soilfuture.js');
  const deltas = JSON.parse(readFileSync(new URL('../data/climate/cmip6_deltas.json', import.meta.url)));
  const base = { clim: makeClimate(climJson), soil: Object.values(soilJson.unions)[0], plot: { irrigation: 'dtw' }, amanT: null, econ: null };
  const ctx = sf.fieldContext({ ...base, change: sf.climateChange(deltas, 'godagari') });
  const ff = sf.fieldFuture({ ctx, lastCrop: 'boro', plan: { rabi: 'mustard', k1: 'fallow' }, priorities: [] });
  const mt = sf.modelTest({ base, deltas, upazilaId: 'godagari', scenario: 'ssp245', rots: [ff.best.rot, ff.habit.rot], habit: ff.habit.rot, cal: ff.cal, priorities: [], range: ff.range });
  assert.equal(mt.runs, 8 * sf.yieldYears().length);
  for (const x of mt.list) for (const k of ['pKeep', 'pBeat', 'pWin']) assert.ok(x[k] >= 0 && x[k] <= 1);
  const habit = mt.list.find((x) => JSON.stringify(x.rot) === JSON.stringify(ff.habit.rot));
  assert.equal(habit.pBeat, 0, 'the usual rotation never beats itself');
});

test('SEDAC and census: every upazila measured, shares between 0 and 1, and the coast where the map says', () => {
  const sedac = JSON.parse(readFileSync(new URL('../data/region/sedac.json', import.meta.url)));
  const census = JSON.parse(readFileSync(new URL('../data/region/census.json', import.meta.url)));
  const ids = ['dhamrai', 'godagari', 'bakerganj', 'sitakunda', 'dacope', 'gangachara', 'gowainghat'];
  for (const id of ids) {
    const u = sedac.upazilas[id];
    assert.ok(u && u.cells > 500, `${id}: measured over its boundary`);
    for (const x of [u.leczShare, u.croplandShare, u.density.share1000Plus]) assert.ok(x >= 0 && x <= 1, `${id}: a share`);
    assert.ok(census.upazilas[id] > 100000, `${id}: census population`);
  }
  // The Barind and the Teesta plain stand above 10 m; Barishal and the Khulna coast lie below it.
  assert.equal(sedac.upazilas.godagari.leczShare, 0);
  assert.equal(sedac.upazilas.gangachara.leczShare, 0);
  assert.ok(sedac.upazilas.bakerganj.leczShare > 0.9 && sedac.upazilas.dacope.leczShare > 0.8);
  // Dacope, half rivers and shrimp ponds by the Sundarbans, is the least crowded.
  const dens = (id) => sedac.upazilas[id].density.medianClass[0];
  assert.ok(ids.every((id) => id === 'dacope' || dens(id) > dens('dacope')));
  assert.equal(Object.values(census.upazilas).reduce((a, b) => a + b, 0), 2509017);
});

test('decision with today: a sowing day already gone is never offered, and a crop with none left ranks last', () => {
  const demo = buildDemo();
  const plot = demo.farmers.find((f) => f.id === 'RAHIM');
  const args = { clim, soil: soilJson.unions[plot.union], plot, union: makeUnion(clim, demo, plot.union), priorities: [] };
  const free = decide(args);
  const day = Math.min(...free.all.map((r) => r.t0)) + 20 * 864e5; // after the earliest sowing days
  const d = decide({ ...args, today: day });
  for (const r of d.all) assert.ok(r.t0 >= day || r.late, `${r.crop.id} ${r.shift}: gone but offered`);
  assert.equal(d.options.length, 5, 'every crop still listed');
  assert.ok(d.rec.t0 >= day || d.options.every((o) => o.late), 'the recommendation can still be sown');
  const lateIdx = d.options.findIndex((o) => o.late);
  if (lateIdx >= 0) assert.ok(d.options.slice(lateIdx).every((o) => o.late), 'late crops after the on-time ones');
});

test('Bangla possessive and locative read naturally', async () => {
  const { bnOf, bnIn } = await import('./text.js');
  assert.equal(bnOf('রাজিব মিয়া'), 'রাজিব মিয়ার');
  assert.equal(bnOf('ধামরাই'), 'ধামরাইয়ের');
  assert.equal(bnOf('মোঃ ওমর ফারুক'), 'মোঃ ওমর ফারুকের');
  assert.equal(bnOf('গোদাগাড়ী'), 'গোদাগাড়ীর');
  assert.equal(bnIn('ধামরাই'), 'ধামরাইয়ে');
  assert.equal(bnIn('ধান'), 'ধানে');
});

test('every upazila’s POWER rainfall agrees with GPM IMERG (no 24-times rainfall)', () => {
  for (const u of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) {
    const j = JSON.parse(readFileSync(new URL(`../data/climate/climate_${u}.json`, import.meta.url)));
    let p = 0, q = 0;
    j.prec.forEach((x, i) => { if (x != null && j.prec_imerg[i] != null) { p += x; q += j.prec_imerg[i]; } });
    const years = j.prec.length / 365.25, ratio = p / q;
    assert.ok(ratio > 0.5 && ratio < 2, `${u}: POWER is ${ratio.toFixed(2)} times IMERG`);
    assert.ok(p / years > 900 && p / years < 6000, `${u}: ${Math.round(p / years)} mm a year is not Bangladesh rainfall`);
  }
});

test('a live rain series 24 times too large is not taken for the saved one', () => {
  const j = JSON.parse(readFileSync(new URL('../data/climate/climate_godagari.json', import.meta.url)));
  const c = makeClimate(j), from = j.prec.length - 90;
  const series = { start: c.start + from * 86400000, prec: j.prec.slice(from), tmax: j.tmax.slice(from) };
  assert.equal(rainAgrees(c, series), true);
  assert.equal(rainAgrees(c, { ...series, prec: series.prec.map((x) => (x == null ? x : x * 24)) }), false);
});

test('user-reported soil-test values adjust SoilGrids estimates without claiming verification', async () => {
  const { adjustSoilWithReportedValues, socStock } = await import('./soilfuture.js');
  const modeledSoil = { ph: 6.2, om_pct: 1.2, bulk_density: 1.4 };
  const modeledStock = socStock(modeledSoil);

  const soilTestValues = { ph: 7.1, om_pct: 2.1, date: '2026-10-15', verified: false };
  const adjusted = adjustSoilWithReportedValues(modeledSoil, soilTestValues);
  const adjustedStock = socStock(adjusted);

  assert.equal(adjusted.adjustedWithReportedValues, true);
  assert.equal(adjusted.ph, 7.1);
  assert.equal(adjusted.om_pct, 2.1);
  assert.equal(adjusted.verified, undefined);
  assert.ok(adjustedStock > modeledStock, 'Higher reported OM% increases the adjusted starting soil-carbon estimate');
});
