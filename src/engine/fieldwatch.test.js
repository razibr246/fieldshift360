// Field watch: the land registry, the saved Sentinel-2 readings and what the engine reads from them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readField, matchSeason, despike, looksLikeField, seasonOf } from './fieldwatch.js';
import { buildDemo } from '../data/demo.js';

const json = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const registry = json('../data/parcels.json');
const watch = json('../data/field_watch.json');
const inside = (lat, lon, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [y1, x1] = r[i], [y2, x2] = r[j];
    if ((y1 > lat) !== (y2 > lat) && lon < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
};

test('registry: Rahim and Razib each have 3–4 fields in different places, inside their real unions', () => {
  const demo = buildDemo();
  for (const owner of ['RAHIM', 'RAZIB']) {
    const mine = registry.parcels.filter((p) => p.owner === owner);
    assert.ok(mine.length >= 3 && mine.length <= 4, owner);
    assert.ok(new Set(mine.map((p) => p.union)).size >= 3, `${owner}: fields in at least three unions`);
    const main = mine.filter((p) => p.main);
    assert.equal(main.length, 1);
    // The story farmer works on the main field of the register.
    const hero = demo.farmers.find((f) => f.id === owner);
    assert.deepEqual([hero.lat, hero.lon, hero.area_dec, hero.union], [main[0].lat, main[0].lon, main[0].area_dec, main[0].union]);
    for (const p of mine) {
      const places = json(`../data/geo/${p.upazila}_places.json`);
      assert.ok(inside(p.lat, p.lon, places.unions.find((u) => u.en === p.union).ring), `${p.id} inside ${p.union}`);
    }
  }
});

test('registry: the five division story farmers work real fields inside their own unions', () => {
  const demo = buildDemo();
  for (const owner of ['DIDARUL', 'PRAHLAD', 'KADER', 'MOFIZUL', 'RAHIMA']) {
    const mine = registry.parcels.filter((p) => p.owner === owner);
    assert.ok(mine.length >= 2 && mine.length <= 3, owner);
    const main = mine.filter((p) => p.main);
    assert.equal(main.length, 1, owner);
    const hero = demo.farmers.find((f) => f.id === owner);
    assert.deepEqual([hero.lat, hero.lon, hero.area_dec, hero.union], [main[0].lat, main[0].lon, main[0].area_dec, main[0].union]);
    for (const p of mine) {
      const places = json(`../data/geo/${p.upazila}_places.json`);
      assert.ok(inside(p.lat, p.lon, places.unions.find((u) => u.en === p.union).ring), `${p.id} inside ${p.union}`);
    }
  }
});

test('saved Sentinel-2 readings: real, recent and clear for every registered field', () => {
  assert.equal(watch.provenance.status, 'REAL');
  for (const p of registry.parcels) {
    const w = watch.parcels[p.id];
    assert.ok(w, p.id);
    assert.ok(w.series.length >= 20, `${p.id}: ${w.series.length} clear passes`);
    assert.ok(w.series.every((o) => o.ndvi >= -1 && o.ndvi <= 1));
    assert.ok(w.latest >= '2026-10-01', `${p.id} latest ${w.latest}`);
  }
});

test('every registered field is read as a field, rice fields as Aman rice in October', () => {
  const today = Date.parse('2026-10-18');
  for (const p of registry.parcels) {
    const r = readField(watch.parcels[p.id], { today });
    assert.ok(!r.top?.pattern.notField, `${p.id} looks like a field`);
    assert.ok(['ok', 'watch', 'warn'].includes(r.level));
    assert.ok(r.findings.length > 0);
  }
  const rice = ['DHM-CH-0142', 'DHM-CH-0377', 'DHM-BL-0218', 'GDG-DP-0587', 'GDG-GG-0144'];
  for (const id of rice) {
    const r = readField(watch.parcels[id], { today });
    assert.equal(r.top.id, 'aman', id);
    assert.ok(r.top.p > 0.6, `${id} ${r.top.p}`);
  }
  // Razib's main field: mustard then Boro last Rabi, as the office record says.
  assert.equal(readField(watch.parcels['DHM-CH-0142'], { today }).lastRabi[0].id, 'mustard_boro');
});

test('engine rules: despike, trees are not a field, sudden drop is flagged', () => {
  const s = [{ d: '2026-01-01', ndvi: 0.6 }, { d: '2026-01-06', ndvi: 0.2 }, { d: '2026-01-11', ndvi: 0.62 }];
  assert.equal(despike(s).length, 2);
  const trees = Array.from({ length: 24 }, (_, i) => ({ d: new Date(Date.UTC(2025, 10, 1) + i * 15 * 864e5).toISOString().slice(0, 10), ndvi: 0.7, sd: 0.03, ndmi: 0.3, ndwi: -0.6, water: 0 }));
  assert.equal(looksLikeField(trees, Date.UTC(2026, 9, 1)), false);
  assert.equal(readField({ series: trees }).top.pattern.notField, true);
  assert.equal(readField({ series: trees }).level, 'warn');
  // Aman at full green, then a fall of 0.3 in 5 days in early October (not harvest time).
  const aman = [['2026-08-20', 0.4], ['2026-09-10', 0.62], ['2026-09-30', 0.8], ['2026-10-05', 0.79], ['2026-10-10', 0.48]]
    .map(([d, ndvi]) => ({ d, ndvi, sd: 0.03, ndmi: 0.3, ndwi: -0.6, water: 0 }));
  const r = readField({ series: aman });
  assert.ok(r.findings.some((f) => f.kind === 'drop'));
  assert.equal(r.level, 'warn');
  assert.equal(seasonOf(Date.UTC(2026, 9, 10)).key, 'aman');
  assert.deepEqual(matchSeason(aman.slice(0, 1), seasonOf(Date.UTC(2026, 9, 10))), []);
});

// ---- Weather step: station correction and trend statistics ----
import { makeClimate, stationCorrect } from './climate.js';
import { mannKendall, agroClimate, rabiWarming, hargreaves } from './agroclimate.js';

test('station correction brings NASA April maximum to the station normal, rain untouched', () => {
  const normals = json('../data/station_normals.json');
  for (const k of ['godagari', 'dhamrai']) {
    const raw = json(`../data/climate_${k}.json`), st = normals.stations[k];
    const fixed = stationCorrect(raw, st);
    const aprMean = (arr) => { let s = 0, n = 0; arr.forEach((x, i) => { const d = new Date(Date.parse(raw.start) + i * 864e5); if (x != null && d.getUTCMonth() === 3 && d.getUTCFullYear() >= 2001 && d.getUTCFullYear() <= 2020) { s += x; n++; } }); return s / n; };
    assert.ok(aprMean(raw.tmax) - st.tmax[3] > 2, `${k}: NASA April runs hot`);
    assert.ok(Math.abs(aprMean(fixed.tmax) - st.tmax[3]) < 0.4, `${k}: corrected April near the station`);
    assert.deepEqual(fixed.prec, raw.prec);
    assert.equal(fixed.tmin === raw.tmin, st.urban); // city station: nights left alone
  }
});

test('Mann–Kendall and Sen’s slope on known series; indicators cover 26 seasons', () => {
  const xs = Array.from({ length: 20 }, (_, i) => 2001 + i);
  const up = mannKendall(xs.map((x) => 2 * x + (x % 3)), xs);
  assert.ok(up.p < 0.001 && Math.abs(up.slope - 2) < 0.2);
  const flat = mannKendall(xs.map((x) => (x % 2 ? 5 : 6)), xs);
  assert.ok(flat.p > 0.2);
  const normals = json('../data/station_normals.json');
  const clim = makeClimate(stationCorrect(json('../data/climate_dhamrai.json'), normals.stations.dhamrai));
  const ac = agroClimate(clim);
  for (const a of Object.values(ac)) assert.equal(a.n, 26, a.id);
  assert.ok(ac.rabiRain.trend.perDecade > 0 && ac.rabiRain.trend.sure === 'sure', 'Dhamrai Rabi rain has risen');
  const w = rabiWarming(clim);
  assert.ok(Math.abs(w.tmax.perDecade) < 1 && Math.abs(w.tmin.perDecade) < 1);
  // Hargreaves ET0 in April at 24°N, 36/24 °C: a few mm a day.
  const et = hargreaves(36, 24, 24, Date.UTC(2025, 3, 15));
  assert.ok(et > 4 && et < 7, `ET0 ${et}`);
});

// ---- Soil step: real SoilGrids and SRDI data only ----
import { fertilizerPlan, FERT_PRICE, phWord, has, srdiUnionOf } from './soil.js';

test('soil: every union and registered field has real SoilGrids values with ranges', () => {
  for (const k of ['godagari', 'dhamrai']) {
    const s = json(`../data/soil_${k}.json`);
    assert.equal(s.provenance.status, 'REAL');
    for (const [id, u] of Object.entries(s.unions)) {
      assert.ok(u.ph > 3.5 && u.ph < 9, `${id} pH ${u.ph}`);
      assert.ok(u.ph_range[0] <= u.ph && u.ph <= u.ph_range[1]);
      assert.ok(u.clay + u.silt + u.sand > 95 && u.clay + u.silt + u.sand < 105);
      for (const fake of ['n_level', 'p_level', 'k_level', 'calcareous']) assert.equal(u[fake], undefined, `${id} has no invented ${fake}`);
    }
  }
  const f = json('../data/soil_fields.json').fields;
  for (const p of registry.parcels) assert.ok(f[p.id], `${p.id} soil`);
});

test('SRDI doses: read from SRDI’s own words, scaled to the field, costed at official prices', () => {
  const frs = json('../data/srdi_frs.json');
  const ch = srdiUnionOf(frs, 'Chauhat');
  assert.ok(ch, 'Chauhat collected');
  const plan = fertilizerPlan(ch, 'mustard', { land: 'medium_high', areaDec: 66 });
  const urea = plan.items.find((i) => has(i.fertilizer, 'ইউরিয়া'));
  assert.ok(Math.abs(urea.kgPerBigha - 21.89) < 0.01, 'SRDI: 21 kg 890 g urea per bigha for mustard in Chauhat');
  assert.ok(Math.abs(urea.kg - 43.78) < 0.02 && urea.cost === Math.round(urea.kg * FERT_PRICE.urea));
  assert.ok(plan.items.some((i) => i.notNeeded), 'boron is not needed there');
  for (const id of Object.keys(frs.unions)) for (const byLand of Object.values(srdiUnionOf(frs, id).recs)) for (const byCrop of Object.values(byLand))
    for (const r of Object.values(byCrop)) for (const it of r.items) assert.ok(it.options[0].kg != null || it.options[0].text.length > 0, 'a number, or SRDI’s own words');
  assert.equal(phWord(5.2).tone, 'watch');
});

// ---- Priorities step: real water need and real profit ----
import { cropWaterNeed } from './cropwater.js';
import { cropMoney } from './economics.js';
import { RABI_CROPS } from './crops.js';

test('crop water need from FAO-56 on local weather; profit from published prices and costs', () => {
  const normals = json('../data/station_normals.json');
  const clim = makeClimate(stationCorrect(json('../data/climate_dhamrai.json'), normals.stations.dhamrai));
  const boro = cropWaterNeed(clim, RABI_CROPS.boro, Date.UTC(2027, 0, 15));
  const mustard = cropWaterNeed(clim, RABI_CROPS.mustard, Date.UTC(2026, 10, 1));
  assert.ok(boro.mm > 400 && boro.mm < 1300, `Boro ${boro.mm} mm`);
  assert.ok(mustard.mm > 50 && mustard.mm < boro.mm / 2, `mustard ${mustard.mm} mm`);
  const econ = { prices: json('../data/price_seasons.json'), costs: json('../data/crop_economics.json'), srdiUnion: null };
  for (const c of Object.values(RABI_CROPS)) {
    const m = cropMoney(econ, c);
    assert.ok(m, c.id);
    assert.equal(m.net, m.value - m.cost);
    assert.ok(m.price.url.startsWith('http') && m.costSrc.url.startsWith('http'), `${c.id} has sources`);
  }
});
