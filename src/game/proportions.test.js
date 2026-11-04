// The semi-chibi body: a big head (about five heads tall, not a realistic 7.5), sturdy legs, feet on the ground,
// and the hands-in-pockets pose only for clothes that have somewhere to put them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STYLE, HIP_Y, SHIN_POS, POCKET, ARM, figure, hasPockets } from './proportions.js';
import { REGIONS } from './regions.js';

test('stylised semi-chibi: about five heads tall, large head, sturdy short legs', () => {
  const f = figure();
  assert.ok(f.heads >= 4.5 && f.heads <= 5.5, `${f.heads.toFixed(2)} heads`);
  assert.ok(f.height > 1.55 && f.height < 1.85, `height ${f.height.toFixed(2)} m keeps the game's doors, carts and camera`);
  assert.ok(f.legShare > 0.38 && f.legShare < 0.48, `legs ${(f.legShare * 100).toFixed(0)}% of height (realistic ≈ 51%)`);
  assert.ok(f.neckGap > 0.02, 'the larger head still leaves a visible neck');
  assert.ok(STYLE.hand > 1 && STYLE.foot > 1 && STYLE.legThick > 1 && STYLE.shoulder > 1, 'big hands and feet, thick legs, broad shoulders');
});

test('the shoes stand on the ground: hip height is the leg plus the scaled sole', () => {
  assert.ok(Math.abs(HIP_Y - (STYLE.thigh + SHIN_POS + 0.05 * STYLE.foot)) <= 0.011);
});

test('hands go in pockets (or the lungi fold) only where the clothes allow', () => {
  for (const [id, r] of Object.entries(REGIONS)) {
    const l = r.farmer.look, p = hasPockets(l);
    if (['ghagra', 'kira', 'longyi', 'sari'].includes(l.lower)) assert.equal(p, false, `${id} in a ${l.lower} rests the hands at the sides`);
    if (['pyjama', 'shalwar', 'cargo', 'lungi', 'dhoti'].includes(l.lower)) assert.equal(p, true, `${id} in ${l.lower}`);
  }
});

test('the pocket pose puts the wrist on the pocket: forward kinematics of the arm chain', () => {
  // shoulder rotation order XYZ (three.js default), then the elbow about x
  const { shoulderX: ax, shoulderZ: az, elbowX: ex, at } = POCKET;
  const rot = ([x, y, z], rx, rz) => {
    const [x1, y1] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)]; // Rz first (intrinsic XYZ = Rx·Ry·Rz)
    return [x1, y1 * Math.cos(rx) - z * Math.sin(rx), y1 * Math.sin(rx) + z * Math.cos(rx)];
  };
  // right arm (side +1): z rotation −shoulderZ turns the hand inward
  const fore = rot([0, -ARM.fore, 0], ex, 0);
  const local = [fore[0], fore[1] - ARM.upper, fore[2]];
  const w = rot(local, ax, -az);
  const wrist = [0.205 * STYLE.shoulder + w[0], ARM.shoulderUp + w[1], w[2]];
  const d = Math.hypot(wrist[0] - at[0], wrist[1] - at[1], wrist[2] - at[2]);
  assert.ok(d < 0.012, `wrist ${wrist.map((v) => v.toFixed(3))} is ${(d * 100).toFixed(1)} cm from the pocket`);
});
