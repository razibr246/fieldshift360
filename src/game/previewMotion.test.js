import test from 'node:test';
import assert from 'node:assert/strict';
import { previewFrame } from './previewMotion.js';

test('reduced motion holds the turntable and ambient effects still', () => {
  assert.deepEqual(previewFrame({ dt: 1 / 60, t: 4, angle: 1.2, spin: -0.6, reduced: true }), {
    angle: 1.2,
    spin: 0,
    cameraY: 1.45,
    ringIntensity: 2,
    dustDelta: 0,
    animateCharacters: false,
  });
});

test('normal motion advances the orbit and keeps the small ambient effects bounded', () => {
  const frame = previewFrame({ dt: 1 / 60, t: 4, angle: 1.2, spin: -0.6 });
  assert.ok(frame.angle < 1.2);
  assert.ok(frame.cameraY >= 1.37 && frame.cameraY <= 1.53);
  assert.ok(frame.ringIntensity >= 1.4 && frame.ringIntensity <= 2.6);
  assert.ok(frame.dustDelta > 0);
  assert.equal(frame.animateCharacters, true);
});
