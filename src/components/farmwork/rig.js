// The farmer's skeleton for the farm-work scenes, and the dope sheet his poses are keyed on.
// A 200-unit-tall adult (about 6.5 heads) facing right. The spine and head are posed by angle (forward kinematics);
// the arms and legs reach for hand and foot targets (two-bone IK), so a planted foot stays exactly where it stands and
// a hand lands exactly on a fruit, a handle or a seedling. If the legs cannot reach the ground the hips sink until they
// can, so a knee never locks straight and a foot never floats.
// Angles are degrees from straight up, clockwise on screen (a positive spine angle leans toward the work in front).
import { curve, steps, reach, rad, deg, lerp } from '../../engine/motion.js';

export const BONE = { thigh: 48, shin: 47, heel: 15, ankle: 8, lumbar: 23, chest: 33, neck: 8, upper: 35, fore: 30 };

const rot = (x, y, a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [x * c - y * s, x * s + y * c]; };
const along = ([x, y], a, len) => [x + Math.sin(rad(a)) * len, y - Math.cos(rad(a)) * len];

// A dope sheet: key(t, { channel: value, ... }) sets values at a time; play() turns the keys into a pose function.
// Channels that hold numbers are eased by monotone curves; anything else (a hand shape, a face) switches at its key.
export function sheet(period) {
  const tracks = {};
  const api = {
    period, tracks,
    key(t, chans) { for (const [c, v] of Object.entries(chans)) if (v !== undefined) (tracks[c] ||= new Map()).set(+t.toFixed(4), v); return api; },
  };
  return api;
}

// play(sheet, { lag, advance }) → (t) => pose for t in [0, period). `lag` delays a channel (seconds): positive trails
// the body (hands, cloth), negative leads it (the eyes and head turn first) — the overlapping action that keeps a body
// from moving as a block. `advance` names channels that move on by a distance every loop (a walk down a row): the
// keys are repeated a loop either side, shifted by that distance, so the curve runs on through the seam instead of
// snapping back, and a held foot stays exactly where it is.
// With `wrap: false` (a scene that dissolves into its next loop) nothing runs through the seam: each channel holds its
// first key before it and its last key after it.
export function play(sh, { lag = {}, advance = {}, wrap = true } = {}) {
  const f = {};
  for (const [c, m] of Object.entries(sh.tracks)) {
    const keys = [...m.entries()];
    if (typeof keys[0][1] !== 'number') { f[c] = steps(keys, wrap ? { period: sh.period } : {}); continue; }
    const by = advance[c] ?? 0;
    const around = wrap ? [...keys.map(([t, v]) => [t - sh.period, v - by]), ...keys, ...keys.map(([t, v]) => [t + sh.period, v + by])] : keys;
    f[c] = curve(around);
  }
  return (t) => { const o = {}; for (const c in f) o[c] = f[c](t - (lag[c] ?? 0)); return o; };
}

// One step of one foot (`side` 'n' near or 'f' far). The heel starts to peel while the body is still passing over
// the foot (so the hips never have to drop to keep a flat back foot on the ground), the toe pushes off at t0, the foot
// swings through in an arc, the heel strikes at t1 with the toes up, then the sole rolls flat. lift is the swing height.
export function stride(sh, side, { t0, t1, from, to, lift = 9 }) {
  const X = `${side}fX`, L = `${side}fLift`, R = `${side}fRoll`, d = t1 - t0;
  sh.key(t0 - 0.5 * d, { [X]: from, [L]: 0, [R]: 0 });
  sh.key(t0 - 0.2 * d, { [X]: from, [L]: 0, [R]: 11 });
  sh.key(t0, { [X]: from, [L]: 0, [R]: 25 });
  sh.key(t0 + 0.3 * d, { [X]: lerp(from, to, 0.24), [L]: lift * 0.85, [R]: 14 });
  sh.key(t0 + 0.58 * d, { [X]: lerp(from, to, 0.66), [L]: lift, [R]: -3 });
  sh.key(t0 + 0.86 * d, { [X]: lerp(from, to, 0.95), [L]: lift * 0.35, [R]: -14 });
  sh.key(t1, { [X]: to, [L]: 3.2, [R]: -12 });
  sh.key(t1 + 0.16 * d, { [X]: to, [L]: 0, [R]: 0 });
}

// solve(pose, ground) → every joint of the figure in scene units, plus the angles the drawing needs.
export function solve(p, ground) {
  const foot = (x, lift = 0, roll = 0) => { const [dx, dy] = rot(-BONE.heel, -BONE.ankle, roll); return [x + dx, ground - lift + dy]; };
  const ankN = foot(p.nfX, p.nfLift, p.nfRoll), ankF = foot(p.ffX, p.ffLift, p.ffRoll);
  const lumbar = p.lumbar ?? 0, chest = p.chest ?? 0, neck = p.neck ?? chest, head = p.head ?? 0;
  const pelvis = lumbar * 0.72 + (p.pelvis ?? 0);
  const hipAt = (hx, hy, dx, dy) => { const [rx, ry] = rot(dx, dy, pelvis); return [hx + rx, hy + ry]; };
  // Sink the hips, softly, until both legs can reach their feet.
  const L = (BONE.thigh + BONE.shin) * 0.965;
  const need = (ank, hip) => { const dx = ank[0] - hip[0]; return ank[1] - Math.sqrt(Math.max(0, L * L - dx * dx)); };
  const hx = p.hipX;
  const req = Math.max(need(ankN, hipAt(hx, 0, 2, 2)) - rot(2, 2, pelvis)[1], need(ankF, hipAt(hx, 0, -3, 2)) - rot(-3, 2, pelvis)[1]);
  const hy = p.hipY + 1.6 * Math.log1p(Math.exp((req - p.hipY) / 1.6));
  const hip = [hx, hy];
  const waist = along(hip, lumbar, BONE.lumbar);
  const nape = along(waist, chest, BONE.chest);
  const atlas = along(nape, neck, BONE.neck);
  const shoulder = (dx, dy) => { const [rx, ry] = rot(dx, dy, chest); return [nape[0] + rx, nape[1] + ry]; };
  const shN = shoulder(0, 7), shF = shoulder(-5, 8);
  const hipN = hipAt(hx, hy, 2, 2), hipF = hipAt(hx, hy, -3, 2);
  const leg = (h, a) => reach(h[0], h[1], a[0], a[1], BONE.thigh, BONE.shin, -1);
  const arm = (s, x, y, side) => reach(s[0], s[1], x, y, BONE.upper, BONE.fore, side ?? 1);
  const legN = leg(hipN, ankN), legF = leg(hipF, ankF);
  const armN = arm(shN, p.nhX, p.nhY, p.nhSide), armF = arm(shF, p.fhX, p.fhY, p.fhSide);
  const handAngle = (a, wrist) => deg(Math.atan2(a.ey - a.jy, a.ex - a.jx)) + (wrist ?? 0);
  return {
    p, ground, hip, waist, nape, atlas, lumbar, chest, neck, head, pelvis,
    shN, shF, hipN, hipF,
    elbowN: [armN.jx, armN.jy], wristN: [armN.ex, armN.ey], handN: handAngle(armN, p.nhWrist), reachN: armN.short,
    elbowF: [armF.jx, armF.jy], wristF: [armF.ex, armF.ey], handF: handAngle(armF, p.fhWrist), reachF: armF.short,
    kneeN: [legN.jx, legN.jy], ankleN: [legN.ex, legN.ey], rollN: p.nfRoll ?? 0, legShortN: legN.short,
    kneeF: [legF.jx, legF.jy], ankleF: [legF.ex, legF.ey], rollF: p.ffRoll ?? 0, legShortF: legF.short,
  };
}

// Where a point held in a hand is, in the scene: the hand's wrist and angle carry an offset (x along the fingers).
export function inHand(sk, side, dx = 9, dy = 1) {
  const w = side === 'n' ? sk.wristN : sk.wristF, a = side === 'n' ? sk.handN : sk.handF;
  const [rx, ry] = rot(dx, dy, a);
  return [w[0] + rx, w[1] + ry, a];
}
