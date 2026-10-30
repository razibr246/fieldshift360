import test from 'node:test';
import assert from 'node:assert/strict';
import { curve, steps, reach, ring, blink, panCurve } from './motion.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test('a curve passes through its keys and never overshoots between them', () => {
  const c = curve([[0, 0], [1, 10], [2, 10], [3, -4]]);
  assert.ok(near(c(0), 0) && near(c(1), 10) && near(c(2), 10) && near(c(3), -4));
  for (let t = 0; t <= 3; t += 0.01) assert.ok(c(t) <= 10 + 1e-9 && c(t) >= -4 - 1e-9, `overshoot at ${t}`);
  for (let t = 1; t <= 2; t += 0.05) assert.ok(near(c(t), 10), 'two equal keys hold still');
});

test('a looping curve flows through its seam without a jump or a kink', () => {
  const c = curve([[0.5, 2], [4, 9], [7, 1]], { period: 10 });
  assert.ok(near(c(0), c(10), 1e-9) && near(c(-3), c(7), 1e-9));
  const slope = (t) => (c(t + 1e-4) - c(t - 1e-4)) / 2e-4;
  assert.ok(near(slope(10 - 1e-3), slope(1e-3), 1e-2));
});

test('steps hold each value until the next key, around a loop', () => {
  const s = steps([[1, 'a'], [3, 'b']], { period: 5 });
  assert.equal(s(0.5), 'b');
  assert.equal(s(2), 'a');
  assert.equal(s(4.9), 'b');
});

test('two-bone IK lands on a reachable target with both bones their own length', () => {
  const r = reach(0, 0, 30, 40, 34, 28, 1);
  assert.ok(near(r.ex, 30, 1e-6) && near(r.ey, 40, 1e-6));
  assert.ok(near(Math.hypot(r.jx, r.jy), 34, 1e-6));
  assert.ok(near(Math.hypot(r.ex - r.jx, r.ey - r.jy), 28, 1e-6));
});

test('IK bends the joint to the asked side and eases off an out-of-reach target', () => {
  assert.ok(reach(0, 0, 50, 0, 34, 28, 1).jy > 0, 'side 1: elbow below a forward reach');
  assert.ok(reach(0, 0, 0, 80, 48, 47, -1).jx > 0, 'side -1: knee in front of a downward leg');
  const far = reach(0, 0, 200, 0, 34, 28, 1);
  assert.ok(far.ex <= 62 && far.ex > 58 && far.short > 0);
  const soft = reach(0, 0, 61, 0, 34, 28, 1);
  assert.ok(soft.ex < 61 && soft.jy > 0, 'just short of full stretch the limb keeps a little bend instead of popping');
});

test('a released spring starts at its displacement, at rest, and dies away', () => {
  assert.ok(near(ring(0, 5, 2, 0.3), 5));
  assert.ok(near((ring(1e-5, 5, 2, 0.3) - ring(0, 5, 2, 0.3)) / 1e-5, 0, 1e-2));
  assert.ok(Math.abs(ring(3, 5, 2, 0.3)) < 0.01);
  assert.equal(ring(-1, 5), 0);
});

test('eyes blink briefly and stay open most of the time', () => {
  let shut = 0;
  for (let t = 0; t < 60; t += 0.01) if (blink(t) > 0.5) shut += 1;
  assert.ok(shut > 0 && shut < 6000 * 0.06);
});

test('the looping pan covers the whole distance once per loop at a speed continuous across the seam', () => {
  const c = panCurve({ peak: 0.08, width: 0.05, rest: 0.15 });
  assert.ok(near(c(0), 0, 1e-9) && near(c(0.999999), 1, 1e-4));
  const v = (u) => (c(u + 1e-4) - c(u - 1e-4)) / 2e-4;
  assert.ok(near(v(0.0002), v(0.9998), 0.05));
  assert.ok(v(0.08) > 5 * v(0.6), 'fastest at its peak');
});
