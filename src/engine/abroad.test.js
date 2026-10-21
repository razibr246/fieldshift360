// The neighbouring countries: data files, the zone rules, today's call, the season water and the local alerts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zoneFlags, zoneLevel, todaysCall, PLANS, seasonWater, localAlerts } from './abroad.js';

const IDS = ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar'];
const load = (id) => JSON.parse(readFileSync(new URL(`../data/abroad/${id}.json`, import.meta.url)));

test('abroad: every country has a real farm and six zones, ERA5 to within a week of the build', () => {
  for (const id of IDS) {
    const d = load(id);
    assert.equal(d.provenance.status, 'REAL');
    assert.equal(Object.keys(d.points).length, 7, id);
    const farm = d.points.farm;
    assert.ok(farm.years.length >= 24, `${id} years`);
    assert.ok(Date.parse(d.provenance.built) - Date.parse(farm.last) <= 7 * 864e5, `${id} last day ${farm.last}`);
    assert.equal(farm.normals.length, 12);
    assert.ok(d.field.series.length >= 30, `${id} clear Sentinel-2 passes`);
  }
});

test('abroad: where the rain record moves unlike the satellite, the normal comes from the consistent years only', () => {
  for (const id of IDS) {
    const farm = load(id).points.farm;
    if (farm.base[0] >= 2017) continue; // the build found a break here and compares within 2017–2025
    const ys = farm.years.filter((y) => y.rainImerg != null);
    const early = ys.filter((y) => y.y <= 2007), late = ys.filter((y) => y.y >= 2016);
    const avg = (xs, k) => xs.reduce((a, y) => a + y[k], 0) / xs.length;
    // ERA5 and IMERG move together: the late/early ratio of one is within a factor 1.6 of the other.
    const r1 = avg(late, 'rain') / avg(early, 'rain'), r2 = avg(late, 'rainImerg') / avg(early, 'rainImerg');
    assert.ok(r1 / r2 < 1.6 && r2 / r1 < 1.6, `${id}: ERA5 x${r1.toFixed(2)} vs IMERG x${r2.toFixed(2)}`);
  }
});

test('abroad: past events read as the disasters they were', () => {
  const pk = load('pakistan').points.farm.events.flood2022;
  assert.ok(pk.rainImerg > 5 * pk.rainImergNormal, 'Dadu, August 2022');
  const np = load('nepal').points.farm.events.rain2021;
  assert.ok(np.rainImerg > 5 * np.rainImergNormal, 'Kailali, 17–20 Oct 2021');
  const ind = load('india').points.farm.events.heat2022;
  assert.ok(ind.tmax - ind.tmaxNormal > 2, 'Sangrur, March 2022 heat');
  assert.equal(load('myanmar').points.farm.records.hot.d.slice(0, 7), '2024-04', 'the Dry Zone’s hottest day is in April 2024');
});

test('abroad: zone rules', () => {
  const p = (rain, normal, tmax, tmaxNormal, km50 = 0) => ({ rain30: { rain, normal, pct: Math.round((100 * rain) / normal), tmax, tmaxNormal }, fires: { km50 } });
  assert.equal(zoneLevel(zoneFlags(p(50, 50, 30, 30))), 'ok');
  assert.deepEqual(zoneFlags(p(300, 100, 30, 30)).map((f) => f.key), ['wet']);
  assert.equal(zoneLevel(zoneFlags(p(10, 100, 33, 30))), 'high'); // dry and hot
  assert.deepEqual(zoneFlags(p(0, 3, 30, 30)).map((f) => f.key), []); // no rain in a dry month is not a drought
  assert.equal(zoneFlags(p(50, 50, 30, 30, 80))[0].level, 'high');
});

test('abroad: today’s call follows the forecast and the calendar', () => {
  const np = load('nepal');
  const day = (rain, pop) => ({ date: '2026-10-20', rain, pop, max: 30, min: 18 });
  assert.equal(todaysCall('nepal', np, { days: [day(12, 70), day(5, 40), day(0, 10)] }, '2026-10-19').tone, 'wait');
  assert.equal(todaysCall('nepal', np, { days: [day(0, 10), day(0, 10), day(0, 5)] }, '2026-10-19').tone, 'go');
  const ind = load('india');
  assert.equal(todaysCall('india', ind, null, '2026-10-19').tone, 'go');
  assert.equal(todaysCall('india', ind, null, '2026-11-25').tone, 'warn');
});

test('abroad: season water is FAO-56 plausible', () => {
  const w = seasonWater(PLANS.india, load('india').points.farm.normals, 2026);
  assert.equal(w.days, 155);
  assert.ok(w.need > 250 && w.need < 550, `wheat need ${w.need} mm`);
  assert.ok(w.gap > 0 && w.gap < w.need);
  assert.equal(seasonWater(PLANS.bhutan, load('bhutan').points.farm.normals, 2026), null);
});

test('abroad: local alerts carry an SMS in the farmers’ language', () => {
  const np = load('nepal');
  const a = localAlerts('nepal', np, { days: [{ rain: 30, pop: 90, max: 30 }, { rain: 5, pop: 50, max: 30 }, { rain: 0, pop: 10, max: 30 }] }, '2026-10-19', 'ne');
  const rain = a.find((x) => x.key === 'rain');
  assert.equal(rain.level, 'high');
  assert.match(rain.sms, /वर्षा/);
  assert.match(rain.sms, /३५/); // 35 mm in Devanagari digits
  const pk = localAlerts('pakistan', load('pakistan'), null, '2026-11-05', 'ur');
  assert.match(pk.find((x) => x.key === 'sow').sms, /گندم/);
});
