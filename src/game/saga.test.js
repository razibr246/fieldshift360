// The story campaign holds together: every speaker exists, every choice moves the meters, the real seasons come
// from the data, and every ending is reachable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeClimate } from '../engine/climate.js';
import { CAST, CHAPTERS, START, ENDINGS, NOTEBOOK, SEASON_YEARS, applyFx, seasonOf, quickSeason, seasonFx, ending, letter, future } from './saga.js';

test('every line has a known speaker in both languages, and every choice has effects', () => {
  for (const ch of CHAPTERS) for (const st of ch.steps) {
    for (const l of st.scene?.lines ?? []) { assert.ok(CAST[l[0]], `unknown speaker ${l[0]}`); assert.ok(l[1] && l[2], 'bn and en'); }
    for (const o of st.choice?.options ?? []) assert.ok(Object.keys(o.fx).length && o.after.bn && o.after.en, `${st.choice.id}.${o.id}`);
    if (typeof st.notebook === 'string') assert.ok(NOTEBOOK.some((x) => x.id === st.notebook));
  }
  for (const e of Object.values(ENDINGS)) for (const l of e.lines) assert.ok(CAST[l[0]]);
});

test('each season’s strength comes from that real Dhamrai year', () => {
  const c = makeClimate(JSON.parse(readFileSync(new URL('../data/climate/climate_dhamrai.json', import.meta.url))));
  for (const y of SEASON_YEARS) {
    const s = seasonOf(c, y);
    for (const k of ['heat', 'storm', 'pests']) assert.ok(s.mods[k] >= 0.7 && s.mods[k] <= 1.7);
    assert.ok(s.now.storm >= 0 && s.usual.hot > 0);
    const r = quickSeason(s.mods, { plan: 'data' });
    assert.ok(r.count.earned > 0 && Object.keys(seasonFx(r)).length);
  }
  const f = future('dhamrai');
  assert.ok(f.models >= 4 && f.dTmax > 0 && f.dTmax < 4);
});

test('the choices lead to every ending, and the letter follows them', () => {
  const run = (choices) => {
    let m = START;
    for (const ch of CHAPTERS) for (const st of ch.steps) if (st.choice) m = applyFx(m, st.choice.options.find((o) => o.id === choices[st.choice.id]).fx);
    return ending(m, choices);
  };
  assert.equal(run({ plan: 'data', kiln: 'refuse', mitu: 'data', pump: 'join', dhaka: 'stay', delta: 'share' }), 'golden');
  assert.equal(run({ plan: 'notebook', kiln: 'sell', mitu: 'home', pump: 'alone', dhaka: 'stay', delta: 'mine' }), 'tired');
  assert.equal(run({ plan: 'data', kiln: 'refuse', mitu: 'home', pump: 'alone', dhaka: 'stay', delta: 'mine' }), 'alone');
  assert.equal(run({ plan: 'data', kiln: 'refuse', mitu: 'school', pump: 'join', dhaka: 'go', delta: 'share' }), 'city');
  assert.equal(letter({ plan: 'data', kiln: 'pond', mitu: 'data', pump: 'join', dhaka: 'stay', delta: 'share' }).length, 6);
});
