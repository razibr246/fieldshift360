import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MISSIONS, history } from './missions.js';
import { slimStoriesClimate } from './storyClimate.js';

const source = JSON.parse(readFileSync(new URL('../data/climate/stories_climate.json', import.meta.url)));

test('the production story-data projection keeps every mission result unchanged and cuts its payload', () => {
  const slim = slimStoriesClimate(source);
  for (const mission of Object.values(MISSIONS)) {
    const inputs = Object.fromEntries(Object.entries(mission.inputs ?? {}).map(([key, value]) => [key, value.value]));
    for (const choice of [mission.best, mission.start]) {
      const completeRun = history({ ...mission }, source, choice, inputs);
      const slimRun = history({ ...mission }, slim, choice, inputs);
      assert.deepEqual(slimRun, completeRun, `${mission.id}: ${JSON.stringify(choice)}`);
    }
  }

  const fullBytes = Buffer.byteLength(JSON.stringify(source));
  const slimBytes = Buffer.byteLength(JSON.stringify(slim));
  assert.ok(slimBytes < fullBytes * 0.65, `expected less than 65% of source bytes; ${slimBytes}/${fullBytes}`);
});
