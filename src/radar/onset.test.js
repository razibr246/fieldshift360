// Rain onset: the rule on made-up rain where the answer is known, and the shipped files for both regions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onsetIndex, threshold, trend, RULE, isCyclonicDepression } from '../../scripts/onset/onset.mjs';
import { onsetSummary, ONSET } from './onset.js';

const DAY = 864e5;
// one year of rain from 1 Jan 2020: dry, a pre-monsoon storm on 20 April, dry again, the monsoon from 10 June
function year() {
  const v = Array(366).fill(0);
  const i = (m, d) => Math.round((Date.UTC(2020, m - 1, d) - Date.UTC(2020, 0, 1)) / DAY);
  for (let k = 0; k < 5; k++) v[i(4, 20) + k] = 15;
  for (let k = i(6, 10); k < i(9, 30); k++) v[k] = 12;
  return { t0: Date.UTC(2020, 0, 1), v, i };
}

test('dynamic cyclonic filter distinguishes pre-monsoon tropical depression spikes from the true ITCZ monsoon trough', () => {
  // Test pure cyclonic detector function
  const cyclonicPentad = [65, 3, 2, 0, 0]; // 70 mm total, 65 mm on day 1 (92.8% concentration)
  assert.equal(isCyclonicDepression(cyclonicPentad, 5), true, 'Anomalous May cyclone spike with post-storm dry hiatus detected');
  
  const monsoonalPentad = [12, 14, 11, 10, 13]; // 60 mm total, max 14 mm (23.3% concentration)
  assert.equal(isCyclonicDepression(monsoonalPentad, 50), false, 'Steady ITCZ monsoonal inflow is not classified as cyclone');

  // Synthesize weather series with a May 18 cyclonic depression, followed by post-storm subsidence, then true June 10 monsoon
  const s = year();
  const may18 = s.i(5, 18);
  s.v[may18] = 65;
  s.v[may18 + 1] = 3;
  s.v[may18 + 2] = 2;
  // Without cyclonic filter, the anomalous spike could skew onset to mid-May
  const filteredOnset = onsetIndex(s, 2020, 40, { ...RULE, cyclonicFilter: true });
  assert.equal(filteredOnset, s.i(6, 9), 'Cyclonic filter skips anomalous pre-monsoon cyclone and identifies true June ITCZ monsoon');
});

test('a single pre-monsoon storm followed by a dry spell is a false start, not the onset', () => {
  const s = year();
  // 9 June starts the first five days with 40 mm (four days of 12 mm); the April storm is followed by a dry spell
  assert.equal(onsetIndex(s, 2020, 40), s.i(6, 9));
});

test('the wet-spell threshold is the site’s own mean June–September 5-day rain', () => {
  const s = year();
  // 12 mm on 112 of the 122 days from 1 June to 30 September
  assert.ok(Math.abs(threshold(s, [2020, 2020]) - (12 * 112 / 122) * RULE.wetDays) < 1e-9);
});

test('Mann–Kendall and Sen’s slope: a steady rise is significant, noise is not', () => {
  const xs = Array.from({ length: 25 }, (_, k) => 2001 + k);
  const up = trend(xs, xs.map((x) => 150 + (x - 2001)));
  assert.equal(up.perDecade, 10); assert.ok(up.significant);
  const flat = trend(xs, xs.map((x, k) => 150 + ((k * 7) % 5) - 2));
  assert.ok(!flat.significant);
});

test('every app upazila has its own real onset series from IMERG, 2001 to 2025 final', () => {
  for (const u of ['godagari', 'dhamrai', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat']) {
    const f = JSON.parse(readFileSync(new URL(`../data/radar/onset_${u}.json`, import.meta.url)));
    assert.equal(f.provenance.status, 'REAL');
    assert.equal(f.provenance.primary, 'imerg');
    const ref = f.years.filter((r) => r.year >= 2001 && r.year <= 2025);
    assert.equal(ref.length, 25);
    assert.ok(ref.every((r) => r.imerg.complete && r.imerg.doy >= 135 && r.imerg.doy <= 274), `${u}: every final year has an onset between 15 May and 30 September`);
    const o = onsetSummary(u);
    assert.ok(o.usual >= 135 && o.usual < 180, `${u}: usual onset between mid-May and June`);
  }
  assert.notDeepEqual(ONSET.godagari.years.map((r) => r.imerg.date), ONSET.dhamrai.years.map((r) => r.imerg.date));
  assert.equal(onsetSummary('rangpur'), null);
});


test('the onset rule agrees with BMD station-based onsets within a week (scripts/onset/compare_bmd.mjs)', () => {
  const v = JSON.parse(readFileSync(new URL('../data/radar/onset_validation.json', import.meta.url)));
  assert.equal(v.rows.length, 3);
  for (const r of v.rows) {
    assert.ok(Math.abs(r.diffD1) <= 7, `${r.station}: IMERG against BMD gauges, same rule, within a week`);
    assert.ok(Math.abs(r.diffOurs) <= 7, `${r.station}: this app's rule within a week of the BMD-based mean`);
  }
});

test('radar brief: hazards most frequent first, the next Aman around the radar day, a message with its dates', async () => {
  const { hazardGroups, amanCalendar, farmerMessage, FIT } = await import('./brief.js');
  const g = hazardGroups('godagari');
  assert.equal(g.length, 4);
  for (let i = 1; i < g.length; i++) assert.ok(g[i - 1].share >= g[i].share, 'sorted by how often');
  assert.equal(hazardGroups('nowhere'), null);
  const cal = amanCalendar(209, 2027, 7);
  const doy = (t) => Math.round((t - Date.UTC(2027, 0, 1)) / 864e5) + 1;
  assert.deepEqual(cal.seedbed.map(doy), [179, 184]);
  assert.deepEqual(cal.transplant.map(doy), [202, 216]);
  assert.ok(cal.harvest[0] > cal.flowering[1]);
  assert.equal(amanCalendar(null, 2027), null);
  const fmt = (t) => new Date(t).toISOString().slice(5, 10);
  const m = farmerMessage({ cal, groups: g, place: { bn: 'গোদাগাড়ী', en: 'Godagari' }, fmt });
  assert.ok(m.en.includes('06-28') && m.en.includes('07-21'), 'seedbed and transplant dates in the message');
  const top = g.find((x) => x.level > 0);
  if (top) assert.ok(m.en.includes(FIT[top.key].en[0]), 'the first fix for the most frequent hazard');
  const { smsParts } = await import('../engine/text.js');
  assert.ok(smsParts(m.bn).parts <= 3, `three Bangla SMS at most (${smsParts(m.bn).parts})`);
});
