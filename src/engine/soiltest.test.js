// The farmer's soil test replaces the estimate, catches typing slips, and keeps the estimate for comparison.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTest, applyTest, testVsEstimate, isStale, testAgeYears } from './soiltest.js';
import { soilFit } from './decision.js';
import { RABI_CROPS } from './crops.js';

const TODAY = Date.parse('2026-11-04');
const est = { ph: 7.0, om_pct: 2.07, n_total_pct: 0.109, clay: 41, drainage: 'imperfect', scope: 'field' };

test('a good report passes and is cleaned', () => {
  const r = checkTest({ date: '2026-03-10', lab: ' SRDI Rajshahi ', ph: '5.4', om: '1.2', n: '', land: 'medium_high' }, TODAY);
  assert.equal(r.ok, true);
  assert.deepEqual(r.test, { date: '2026-03-10', lab: 'SRDI Rajshahi', land: 'medium_high', ph: 5.4, om: 1.2, n: null });
});

test('typing slips, a missing pH and a future date are caught, in both languages', () => {
  const r = checkTest({ date: '2027-01-01', ph: '65', om: '1.2' }, TODAY);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors.map((e) => e.k).sort(), ['date', 'ph']);
  assert.ok(r.errors.every((e) => e.bn && e.en));
  assert.deepEqual(checkTest({ date: '2026-01-01' }, TODAY).errors.map((e) => e.k), ['ph']);
  assert.equal(checkTest({ date: '2026-01-01', ph: 6, land: 'swamp' }, TODAY).test.land, null);
});

test('the test overrides the estimate and the estimate is kept', () => {
  const s = applyTest(est, { date: '2026-03-10', ph: 5.4, om: 1.2, n: null, land: 'high', lab: 'SRDI' });
  assert.equal(s.ph, 5.4);
  assert.equal(s.om_pct, 1.2);
  assert.equal(s.n_total_pct, 0.109); // not on the report: estimate stays
  assert.equal(s.clay, 41);
  assert.deepEqual(s.tested.estimate, { ph: 7.0, ph_range: null, om_pct: 2.07, n_total_pct: 0.109 });
  assert.equal(applyTest({ ...est, ph_range: [5.2, 8.2] }, { date: '2026-03-10', ph: 5.4 }).ph_range, null);
  assert.equal(applyTest(est, null), est);
  const rows = testVsEstimate(s);
  assert.deepEqual(rows.map((r) => [r.k, r.diff]), [['ph', -1.6], ['om', -0.87]]);
});

test('a measured acid soil changes the crop fit', () => {
  const lentil = RABI_CROPS.lentil;
  const before = soilFit(lentil, est).score;
  const after = soilFit(lentil, applyTest(est, { date: '2026-03-10', ph: 4.6 })).score;
  assert.ok(after < before, `${after} < ${before}`);
});

test('a test older than three years asks for a new one', () => {
  assert.equal(isStale('2022-01-01', TODAY), true);
  assert.equal(isStale('2025-01-01', TODAY), false);
  assert.ok(Math.abs(testAgeYears('2025-11-04', TODAY) - 1) < 0.01);
});
