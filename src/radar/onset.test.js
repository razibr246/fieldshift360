// Rain onset: the rule on made-up rain where the answer is known, and the shipped files for both regions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onsetIndex, threshold, trend, RULE } from '../../pipeline/onset/onset.mjs';
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

test('both regions have their own real onset series from IMERG, 2001 to 2025 final', () => {
  for (const u of ['godagari', 'dhamrai']) {
    const f = JSON.parse(readFileSync(new URL(`../data/onset_${u}.json`, import.meta.url)));
    assert.equal(f.provenance.status, 'REAL');
    assert.equal(f.provenance.primary, 'imerg');
    const ref = f.years.filter((r) => r.year >= 2001 && r.year <= 2025);
    assert.equal(ref.length, 25);
    assert.ok(ref.every((r) => r.imerg.complete && r.imerg.doy >= 105 && r.imerg.doy <= 274), `${u}: every final year has an onset between 15 April and 30 September`);
    const o = onsetSummary(u);
    assert.ok(o.usual > 120 && o.usual < 180, `${u}: usual onset in May or June`);
  }
  assert.notDeepEqual(ONSET.godagari.years.map((r) => r.imerg.date), ONSET.dhamrai.years.map((r) => r.imerg.date));
  assert.equal(onsetSummary('rangpur'), null);
});

