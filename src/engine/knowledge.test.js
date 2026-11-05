import test from 'node:test';
import assert from 'node:assert/strict';
import { knowledgePack, optionsSection, pricesSection, supportSection } from './knowledge.js';

const opt = (id, net, mm, shift = 0) => ({ crop: { id, name: { bn: id, en: id } }, shift, t0: Date.UTC(2026, 10, 20), score: 71.4, money: { net, cost: 9000 }, water: { mm }, bt: { now: { safe: 11, n: 13 } }, glut: { level: 'Low' }, hw: { start: Date.UTC(2027, 1, 1), end: Date.UTC(2027, 1, 20) } });
const options = [opt('mustard', 12000, 150), opt('boro', 9000, 900)];
const farmer = { id: 'RAZIB', area_dec: 50, irrigation: 'stw' };
const upazila = { id: 'dhamrai', district: { en: 'Dhaka' } };

test('every option goes in as numbers with its source, and the chosen one is marked', () => {
  const s = optionsSection(options, options[0]);
  assert.equal(s[0].profitTkPerBigha, 12000);
  assert.equal(s[0].weatherSafe, '11/13 seasons');
  assert.equal(s[0].chosen, true);
  assert.equal(s[1].chosen, false);
  assert.match(s[0].source, /NASA POWER/);
});

test('price seasons come from the DAM data for each crop', () => {
  const p = pricesSection(['mustard', 'boro', 'nothing']);
  assert.ok(p.mustard.highMonths.length === 3);
  assert.equal(p.nothing, undefined);
});

test('government programmes are matched to the farmer and never include a plain no', () => {
  const s = supportSection({ farmer, crops: [{ id: 'mustard', name: { bn: 'সরিষা', en: 'Mustard' } }], upazila });
  assert.ok(s.length > 0);
  assert.ok(s.every((m) => m.fit === 'yes' || m.fit === 'maybe'));
  assert.ok(s.every((m) => m.status === 'running' || m.fit === 'maybe'));
});

test('the pack keeps the most useful sections and names what it drops to stay in budget', () => {
  const full = knowledgePack({ options, chosen: options[0], cropNow: 'aman', farmer, upazila, soil: { ph: 6.1, om_pct: 1.4, tested: false } });
  assert.deepEqual(Object.keys(full.sections).slice(0, 2), ['season_options', 'soil_detail']);
  assert.ok(full.sections.crop_problems.aman.length > 0);
  assert.match(full.sections.soil_detail.source, /not a soil test/);
  const small = knowledgePack({ options, chosen: options[0], cropNow: 'aman', farmer, upazila }, { budget: 1500 });
  assert.ok(small.size <= 1500);
  assert.ok(small.dropped.length > 0);
});
