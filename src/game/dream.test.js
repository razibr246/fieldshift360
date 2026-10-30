// The children's dream: every farmer has a child, the story is whole in both languages, Tara's facts come from the
// place's NASA record, and the mini-games never fail a child.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHILDREN, CHILD_IDS, MOODS, dreamFor, tarasFacts, cloudStars, blanketStars, waterResult, WATER_BAND, badgesFor, totalStars } from './dream.js';
import { REGIONS } from './regions.js';
import { landSummary } from '../engine/landsat.js';

test('every one of the twelve farmers has a child with a dream in Bangla and English', () => {
  assert.deepEqual([...CHILD_IDS].sort(), Object.keys(REGIONS).sort());
  for (const id of CHILD_IDS) {
    const d = dreamFor(id, REGIONS[id], landSummary(CHILDREN[id].land));
    assert.ok(d, id);
    assert.deepEqual(d.scenes.map((s) => s.id), ['night', 'tara', 'clouds', 'blanket', 'water', 'without', 'with', 'morning']);
    for (const s of d.scenes) {
      assert.ok(MOODS[s.mood], `${id}/${s.id} mood`);
      assert.ok(s.title.bn && s.title.en);
      for (const l of s.lines) {
        assert.ok(l.bn && l.en && MOODS[l.mood] && ['parent', 'child', 'tara', 'frog'].includes(l.who), `${id}/${s.id}`);
        assert.ok(!/undefined|null|NaN/.test(l.bn + l.en), `${id}/${s.id}: ${l.en}`);
      }
    }
    assert.ok(d.scenes.find((s) => s.id === 'night').lines[0].en.toLowerCase().includes(REGIONS[id].storm.en.toLowerCase()), 'the worry names the place’s own storm');
  }
});

test('Tara’s facts are the place’s NASA record, in Bangla digits for Bangla', () => {
  const land = landSummary('dhamrai');
  const f = tarasFacts(land);
  assert.deepEqual(f.lean, land.green.lean);
  assert.ok(f.bare.en.includes('January'), 'Dhamrai’s bare months include January');
  if (land.stressYears.length) assert.ok(f.stressed.en.includes(String(land.stressYears.at(-1))) && !/[0-9]/.test(f.stressed.bn));
  const none = tarasFacts(null);
  assert.ok(none.bare.bn && none.stressed.en && none.hot.en, 'a place without a record still gets a story');
});

test('the two doors carry the emotion: grief without the data, joy with it, and the family still decides', () => {
  const d = dreamFor('rahimu', REGIONS.rahimu, null);
  const without = d.scenes.find((s) => s.id === 'without'), withIt = d.scenes.find((s) => s.id === 'with');
  assert.equal(MOODS[without.mood].anim, 'Defeat');
  assert.equal(MOODS[withIt.mood].anim, 'Victory');
  assert.ok(withIt.lines.some((l) => /decision is still your family’s/.test(l.en)), 'the tool does not decide');
  assert.ok(withIt.lines.some((l) => /agriculture officer/.test(l.en)));
});

test('nobody fails a dream: every game gives at least one star, and the water meter has a green band', () => {
  assert.equal(cloudStars(10, 5, 5), 3);
  assert.equal(cloudStars(2, 0, 5), 1);
  assert.equal(blanketStars(9, 10, 0), 3);
  assert.equal(blanketStars(8, 10, 2), 2, 'the goat ate two');
  assert.equal(blanketStars(0, 10), 1);
  assert.equal(waterResult((WATER_BAND[0] + WATER_BAND[1]) / 2).kind, 'just');
  assert.equal(waterResult(95).kind, 'flood');
  assert.equal(waterResult(5).kind, 'dry');
  assert.ok([0, 30, 50, 80, 100].every((v) => waterResult(v).stars >= 1));
  const stars = { clouds: 3, blanket: 1, water: 2 };
  assert.deepEqual(badgesFor(stars), ['clouds', 'water', 'heart']);
  assert.equal(totalStars(stars), 6);
});
