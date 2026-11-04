// The spray check: drift, drying and wash-off rules on each daylight hour, and the windows it finds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wetBulb, deltaT, sprayHour, sprayPlan, SPRAY } from './spray.js';

const H = (date, hour, o = {}) => ({ time: `${date}T${String(hour).padStart(2, '0')}:00`, date, hour, day: hour >= 6 && hour <= 17, temp: 26, rh: 65, wind: 8, pop: 0, ...o });

test('wet-bulb follows Stull 2011 (20 °C at 50% is about 13.7 °C)', () => {
  assert.ok(Math.abs(wetBulb(20, 50) - 13.7) < 0.2);
  assert.ok(deltaT(26, 65) > 2 && deltaT(26, 65) < 8);
  assert.ok(deltaT(36, 30) > SPRAY.dtMax);
  assert.ok(deltaT(22, 98) < SPRAY.dtLow);
});

test('an hour is stopped by strong wind, heavy rain ahead or very dry air', () => {
  assert.equal(sprayHour(H('2026-11-05', 9)).ok, 'go');
  assert.equal(sprayHour(H('2026-11-05', 9, { wind: 22 })).ok, 'no');
  assert.equal(sprayHour(H('2026-11-05', 9, { wind: 1 })).ok, 'risk');
  assert.equal(sprayHour(H('2026-11-05', 9), [H('2026-11-05', 10), H('2026-11-05', 11, { pop: 70 })]).ok, 'no');
  assert.equal(sprayHour(H('2026-11-05', 9), [H('2026-11-05', 10, { pop: 35 })]).ok, 'risk');
  assert.equal(sprayHour(H('2026-11-05', 9), [1, 2, 3, 4].map((i) => H('2026-11-05', 9 + i, { pop: i === 4 ? 0 : 0 })).concat(H('2026-11-05', 14, { pop: 90 }))).ok, 'go'); // rain after 4 h does not count
  assert.equal(sprayHour(H('2026-11-05', 13, { temp: 36, rh: 30 })).ok, 'no');
  const r = sprayHour(H('2026-11-05', 9, { wind: 22, pop: 80 }));
  assert.deepEqual(r.why.map((w) => w.k).sort(), ['rain', 'wind']);
  assert.ok(r.why.every((w) => w.bn && w.en));
});

test('the plan keeps daylight hours of two days and finds the longest good window', () => {
  const hours = [];
  for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) for (let h = 0; h < 24; h++) hours.push(H(d, h));
  // Day 1: windy 10–14; day 2: calm all morning, good 13–17.
  hours.forEach((h) => { if (h.date === '2026-11-05' && h.hour >= 10 && h.hour <= 14) h.wind = 25; if (h.date === '2026-11-06' && h.hour < 13) h.wind = 1; });
  const p = sprayPlan(hours, { fromTime: '2026-11-05T07:00' });
  assert.ok(p.hours.every((h) => h.hour >= 7 || h.date !== '2026-11-05'));
  assert.ok(p.hours.every((h) => h.date !== '2026-11-07'));
  assert.ok(p.hours.every((h) => h.day));
  assert.deepEqual(p.windows.map((w) => [w.date, w.from, w.to]), [['2026-11-05', 7, 10], ['2026-11-05', 15, 18], ['2026-11-06', 13, 18]]);
  assert.deepEqual([p.best.date, p.best.from, p.best.to], ['2026-11-06', 13, 18]);
  assert.equal(p.nowOk.ok, 'go');
});

test('after dark, the plan covers the next two days that still have daylight', () => {
  const hours = [];
  for (const d of ['2026-11-05', '2026-11-06', '2026-11-07']) for (let h = 0; h < 24; h++) hours.push(H(d, h));
  const p = sprayPlan(hours, { fromTime: '2026-11-05T19:00' });
  assert.deepEqual([...new Set(p.hours.map((h) => h.date))], ['2026-11-06', '2026-11-07']);
  assert.equal(p.nowOk, null);
});

test('no forecast, no plan', () => {
  assert.deepEqual(sprayPlan([], {}), { hours: [], windows: [], best: null, nowOk: null });
});
