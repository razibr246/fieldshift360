// The farmer tour stays true to the app: every step names a known chapter and a farmer page, speaks both languages,
// and every part it lights up is marked somewhere in the code (data-tour="…" or id="…").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FARMER_TOUR, FARMER_CHAPTERS } from './farmer_tour.js';

const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.jsx') ? [p] : []; });
const code = files(new URL('..', import.meta.url).pathname).map((p) => readFileSync(p, 'utf8')).join('\n');
const PAGES = ['/farmer', '/farmer/farm', '/farmer/plan', '/farmer/future', '/farmer/today', '/farmer/voice', '/farmer/sms', '/farmer/doctor', '/farmer/help', '/farmer/harvest', '/farmer/profile'];

test('every farmer tour step is complete and bilingual', () => {
  const keys = FARMER_CHAPTERS.map((c) => c.key);
  for (const [i, st] of FARMER_TOUR.entries()) {
    assert.ok(keys.includes(st.chapter), `step ${i}: unknown chapter ${st.chapter}`);
    assert.ok(PAGES.includes(st.path), `step ${i}: ${st.path} is not a farmer page`);
    for (const k of ['title', 'say', 'why', 'try']) if (st[k] || k === 'title' || k === 'say') assert.ok(st[k]?.bn && st[k]?.en, `step ${i}: ${k} needs bn and en`);
  }
});

test('the tour visits every farmer page and every chapter', () => {
  for (const p of PAGES) assert.ok(FARMER_TOUR.some((st) => st.path === p), `no step on ${p}`);
  for (const c of FARMER_CHAPTERS) assert.ok(FARMER_TOUR.some((st) => st.chapter === c.key), `chapter ${c.key} is empty`);
  for (let n = 0; n <= 6; n++) assert.ok(FARMER_TOUR.some((st) => st.path === '/farmer/plan' && st.step === n), `planner step ${n + 1} is not explained`);
});

test('every part the tour lights up exists in the code', () => {
  for (const st of FARMER_TOUR.filter((x) => x.at)) {
    assert.ok(code.includes(`data-tour="${st.at}"`) || code.includes(`id="${st.at}"`), `nothing is marked ${st.at}`);
  }
});
