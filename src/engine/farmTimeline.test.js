import test from 'node:test';
import assert from 'node:assert/strict';
import { clampProgress, dateAtProgress, stageAtProgress, TOMATO_HARVEST_STAGES, MUNGBEAN_SOWING_STAGES, AMAN_TRANSPLANT_STAGES, WHEAT_HARVEST_STAGES, SESAME_SOWING_STAGES, MUSTARD_HARVEST_STAGES } from './farmTimeline.js';

test('tomato harvest stages are ordered across one complete loop', () => {
  assert.equal(TOMATO_HARVEST_STAGES[0].at, 0);
  assert.equal(TOMATO_HARVEST_STAGES.at(-1).at < 1, true);
  assert.equal(TOMATO_HARVEST_STAGES.every((stage, i, all) => i === 0 || stage.at > all[i - 1].at), true);
});

test('mungbean, sesame, wheat and Aman stages are chronological and complete', () => {
  for (const stages of [MUNGBEAN_SOWING_STAGES, AMAN_TRANSPLANT_STAGES, WHEAT_HARVEST_STAGES, SESAME_SOWING_STAGES, MUSTARD_HARVEST_STAGES]) {
    assert.equal(stages[0].at, 0);
    assert.equal(stages.at(-1).at < 1, true);
    assert.equal(stages.every((stage, i) => i === 0 || stage.at > stages[i - 1].at), true);
    assert.equal(stageAtProgress(stages[1].at, stages), 1);
  }
});

test('progress clamps to the harvest timeline and selects its current stage', () => {
  assert.equal(clampProgress(-0.2), 0);
  assert.equal(clampProgress(1.2), 1);
  assert.equal(stageAtProgress(0.5), 3);
  assert.equal(stageAtProgress(0.95), 6);
});

test('timeline progress maps to inclusive crop dates', () => {
  assert.equal(dateAtProgress(100, 200, 0), 100);
  assert.equal(dateAtProgress(100, 200, 0.5), 150);
  assert.equal(dateAtProgress(100, 200, 1), 200);
  assert.equal(dateAtProgress(100, 200, 3), 200);
  assert.equal(dateAtProgress(100, 100, 0.5), 100);
});
