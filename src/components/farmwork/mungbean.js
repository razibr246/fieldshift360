// Mung-bean sowing after the Rabi harvest: he loosens the bed with a kodal (two full strokes: lift, chop, pull) and
// leaves it standing in the soil, squats to drop seeds into a shallow line from the pouch at his waist, stands to
// broadcast two handfuls, covers the seed with the flat of his hand, lifts the watering can with his legs and wets
// the bed, then crouches to see the first sprouts. Days pass between sowing and sprouting, so the loop dissolves into
// the next instead of running straight through (FarmworkScene's `seam`).
import { play, sheet, stride, solve, inHand } from './rig.js';
import { blink, clamp, hash, lerp, smooth, wobble } from '../../engine/motion.js';
import { bakeCamera, figureBox } from './camera.js';

export const T = 18;
export const G = 262;
export const SEAM = 0.7;
// The kodal is keyed by where his front hand holds it (x, y) and its angle; the back hand holds 32 units up the handle.
export const BACK_GRIP = -32;
export const STUCK = { x: 384, y: 206, a: 42 }; // the kodal left standing in the loosened soil
export const CAN = { x: 600, y: 223 }; // the watering can's handle, standing by the bed
export const DROPS = [[5.12, 490], [5.8, 506], [6.46, 522]]; // seeds dropped into the line: time and place
export const THROWS = [8.25, 9.9]; // handfuls broadcast
export const CHOPS = [[1.0, 413], [2.42, 417], [3.02, 415]];
export const SPROUTS = [490, 506, 522, 548, 572, 597, 621, 646];
const STEPS = [[3.8, 408], [4.26, 468], [4.55, 436], [8.34, 506], [10.55, 478], [14.85, 540], [15.3, 570]]; // heel strikes
const GRIP_CAN = 15.62, POUR = [16.05, 16.85];

const STAND = G - 100;
const DEEP = G - 46; // a deep, flat-footed squat close to the soil

const B = sheet(T);
// Loosen the bed: two strokes of the kodal, then a last chop that leaves it standing in the soil.
const hoe = (t, x, y, a, body) => B.key(t, { hoeX: x, hoeY: y, hoeA: a, ...body });
hoe(0, 378, 204, 40, { hipX: 333, hipY: STAND + 19, lumbar: 30, chest: 55, neck: 56, head: 48, eye: 0.8, eyeY: 0.8, brow: 0, mouth: 'calm' });
hoe(0.15, 377, 203, 39, { hipX: 333, hipY: STAND + 18, chest: 54 });
for (const [d, dx] of [[0, 0], [1.42, 4]]) {
  hoe(0.42 + d, 360 + dx, 150, -20, { hipX: 329, hipY: STAND + 6, lumbar: 12, chest: 18, neck: 22, head: 28 });
  hoe(0.75 + d, 334 + dx, 82, -100, { hipX: 326, hipY: STAND + 1, lumbar: 1, chest: -4, neck: 4, head: 20, mouth: 'effort', eyeY: 0.6 });
  hoe(0.85 + d, 333 + dx, 80, -103, { hipX: 326, hipY: STAND + 0.5 });
  // coming down in front at arm's length, so the arms never fold in at the shoulders
  hoe(0.93 + d, 386 + dx, 132, -22, { hipX: 330, hipY: STAND + 8, lumbar: 16, chest: 28, neck: 32, head: 38 });
  hoe(1.0 + d, 380 + dx, 204, 40, { hipX: 334, hipY: STAND + 18, lumbar: 30, chest: 56, neck: 58, head: 50, eyeY: 1 });
  hoe(1.08 + d, 381 + dx, 206, 41, { hipX: 335, hipY: STAND + 20, chest: 58 });
  hoe(1.3 + d, 370 + dx, 207, 46, { hipX: 331, hipY: STAND + 17, lumbar: 28, chest: 52, neck: 54, head: 46 });
  hoe(1.48 + d, 372 + dx, 196, 30, { hipX: 330, hipY: STAND + 12, lumbar: 22, chest: 40, neck: 42, head: 38, mouth: 'calm' });
}
hoe(2.86, 376, 178, 8, { hipX: 331, hipY: STAND + 10, lumbar: 18, chest: 32 });
B.key(2.94, { hipX: 332, hipY: STAND + 15, lumbar: 25, chest: 45, neck: 48, head: 43 });
hoe(3.02, STUCK.x, STUCK.y, STUCK.a, { hipX: 335, hipY: STAND + 18, lumbar: 30, chest: 54, neck: 56, head: 48 });
hoe(T, STUCK.x, STUCK.y, STUCK.a, {});
// Two steps to the end of the bed, down into a deep squat over the line.
B.key(3.3, { hipX: 334, hipY: STAND + 6, lumbar: 10, chest: 16, neck: 20, head: 20, eyeY: 0.4 });
B.key(0, { ffX: 314, ffLift: 0, ffRoll: 0, nfX: 348, nfLift: 0, nfRoll: 0 });
stride(B, 'f', { t0: 3.36, t1: 3.8, from: 314, to: 408 });
stride(B, 'n', { t0: 3.82, t1: 4.26, from: 348, to: 468 });
stride(B, 'f', { t0: 4.3, t1: 4.55, from: 408, to: 436, lift: 5 });
for (const [t, x, y] of [[3.55, 348, STAND + 1], [3.8, 378, STAND + 4], [4.04, 410, STAND], [4.27, 440, STAND + 4], [4.55, 449, STAND + 10]]) B.key(t, { hipX: x, hipY: y });
B.key(4.0, { lumbar: 6, chest: 12, neck: 16, head: 16, eye: 0.7, eyeY: 0.6 });
B.key(4.85, { hipX: 452, hipY: DEEP, lumbar: 38, chest: 60, neck: 64, head: 56, eyeY: 1, ffRoll: 18 });
// Seeds dropped one pinch at a time; he leans further for each.
B.key(5.6, { hipX: 456, hipY: DEEP, lumbar: 40, chest: 62, head: 58 });
B.key(6.4, { hipX: 461, hipY: DEEP + 1, lumbar: 42, chest: 64, neck: 66, head: 60 });
// Up, and broadcast two handfuls: a dip into the pouch, the weight rocks back, then the arm sweeps through and the
// front foot steps in with the throw.
B.key(6.9, { hipX: 461, hipY: DEEP, lumbar: 40, chest: 60 });
B.key(7.4, { hipX: 462, hipY: STAND, lumbar: 6, chest: 10, neck: 14, head: 12, eyeY: 0, ffRoll: 0 });
for (const [d, step] of [[0, 0], [1.65, 1]]) {
  B.key(7.62 + d, { hipX: 463 + step * 12, hipY: STAND + 1, lumbar: 8, chest: 16, neck: 22, head: 28, eye: 0.2, eyeY: 1 });
  B.key(7.92 + d, { hipX: 459 + step * 12, hipY: STAND + 1.5, lumbar: -2, chest: -6, neck: 0, head: 6, eye: 1, eyeY: -0.3, mouth: 'calm' });
  B.key(8.25 + d, { hipX: 468 + step * 14, hipY: STAND + 2.5, lumbar: 12, chest: 22, neck: 18, head: 8, eyeY: 0 });
  B.key(8.6 + d, { hipX: 475 + step * 12, hipY: STAND + 1.5, lumbar: 10, chest: 17, neck: 15, head: 10 });
  B.key(9.0 + d, { hipX: 476 + step * 12, hipY: STAND + 0.5, lumbar: 6, chest: 10, neck: 14, head: 14 });
}
stride(B, 'n', { t0: 7.98, t1: 8.34, from: 468, to: 506, lift: 7 });
stride(B, 'f', { t0: 10.15, t1: 10.55, from: 436, to: 478, lift: 7 });
B.key(10.98, { hipX: 489, hipY: STAND });
// Cover the seed: down again, the flat hand pulls soil over the line twice.
B.key(11.6, { hipX: 490, hipY: DEEP, lumbar: 38, chest: 60, neck: 64, head: 56, eyeY: 1, ffRoll: 16 });
for (const [t, x] of [[12.2, 494], [12.6, 490], [13.0, 494], [13.55, 491]]) B.key(t, { hipX: x, hipY: DEEP });
B.key(14.3, { hipX: 492, hipY: STAND, lumbar: 6, chest: 10, neck: 14, head: 16, eyeY: 0.4, ffRoll: 0 });
// Two steps on to the watering can; squat, lift it with the legs, wet the bed.
stride(B, 'f', { t0: 14.45, t1: 14.85, from: 478, to: 540, lift: 8 });
stride(B, 'n', { t0: 14.9, t1: 15.3, from: 506, to: 570, lift: 8 });
for (const [t, x, y] of [[14.85, 530, STAND + 3], [15.3, 556, STAND + 2]]) B.key(t, { hipX: x, hipY: y });
B.key(15.6, { hipX: 562, hipY: G - 58, lumbar: 30, chest: 48, neck: 50, head: 44, eyeY: 1, ffRoll: 18, mouth: 'effort' });
B.key(16.0, { hipX: 561, hipY: STAND + 1, lumbar: 8, chest: 12, neck: 18, head: 30, ffRoll: 0, mouth: 'calm' });
B.key(16.4, { hipX: 563, lumbar: 10, chest: 18, neck: 24, head: 34 });
B.key(16.85, { hipX: 564, hipY: STAND + 1, lumbar: 10, chest: 18 });
// Crouch to look: the first sprouts (days later).
B.key(17.4, { hipX: 560, hipY: G - 70, lumbar: 26, chest: 40, neck: 46, head: 48, mouth: 'smile', brow: 0.6 });
B.key(T, { hipX: 560, hipY: G - 70 });
const LAG = { head: -0.07, neck: -0.04, chest: 0.025, eye: -0.15, eyeY: -0.15 };
export const body = play(B, { lag: LAG, wrap: false });

// ---- hands ----
const H = sheet(T);
const at = (t, dx, dy) => { const b = body(t); return [b.hipX + dx, b.hipY + dy]; };
const hand = (side, t, [x, y], extra = {}) => H.key(t, { [`${side}hX`]: x, [`${side}hY`]: y, ...extra });
const solved = (t) => solve({ ...body(t), nhX: 0, nhY: 0, fhX: 0, fhY: 0 }, G);
const thighAt = (t) => { const s = solved(t); return [s.hipN[0] + (s.kneeN[0] - s.hipN[0]) * 0.62 - 2, s.hipN[1] + (s.kneeN[1] - s.hipN[1]) * 0.62 - 9]; };
// The seed pouch hangs at the front of his waist.
export const pouchOf = (s) => { const k = 0.45; return [lerp(s.hip[0], s.waist[0], k) + Math.cos(((s.lumbar) * Math.PI) / 180) * 15, lerp(s.hip[1], s.waist[1], k) + Math.sin(((s.lumbar) * Math.PI) / 180) * 15 + 4]; };
const pouchAt = (t) => pouchOf(solved(t));
// While he holds the kodal its handle sets both hands (see pose); these keys take over as he lets go.
hand('n', 3.3, at(3.3, 16, 4), { nhShape: 'relax', nhWrist: 4 });
hand('f', 3.3, at(3.3, 8, 6), { fhShape: 'relax', fhWrist: 8 });
for (const [t, s] of [[3.6, -1], [3.9, 1], [4.2, -1]]) { hand('n', t, at(t, 8 + 12 * s, 14)); hand('f', t, at(t, 2 - 12 * s, 14)); }
hand('f', 4.85, thighAt(4.85), { fhShape: 'flat', fhWrist: 0 });
for (const t of [5.6, 6.4, 6.9]) hand('f', t, thighAt(t));
// Pinch from the pouch, out over the line, open the fingers.
for (const [i, [t, x]] of DROPS.entries()) {
  hand('n', t - 0.42, pouchAt(t - 0.42), { nhShape: 'pinch', nhWrist: 20 });
  hand('n', t - 0.12, [x - 9, 247], { nhShape: 'pinch', nhWrist: 60 });
  hand('n', t, [x - 9, 248], { nhShape: 'open' });
  if (i === DROPS.length - 1) hand('n', t + 0.3, [x - 14, 238], { nhShape: 'relax', nhWrist: 30 });
}
hand('n', 4.5, at(4.5, 14, 6), { nhShape: 'relax', nhWrist: 10 });
hand('n', 7.3, at(7.3, 12, 8), { nhWrist: 6 });
hand('f', 7.3, at(7.3, 4, 14), { fhShape: 'relax', fhWrist: 8 });
// Broadcast: a handful from the pouch, the arm drawn back low, then swept forward and up, the hand opening at the top.
for (const r of THROWS) {
  hand('n', r - 0.65, pouchAt(r - 0.65), { nhShape: 'cup', nhWrist: 30 });
  hand('n', r - 0.36, at(r - 0.36, -16, 18), { nhWrist: 40 });
  hand('n', r - 0.12, at(r - 0.12, 34, 0), { nhWrist: 0 });
  hand('n', r, at(r, 60, -16), { nhShape: 'open', nhWrist: -16 });
  hand('n', r + 0.25, at(r + 0.25, 58, -12), { nhWrist: -12 });
  hand('n', r + 0.6, at(r + 0.6, 18, 6), { nhShape: 'relax', nhWrist: 4 });
  hand('f', r - 0.36, at(r - 0.36, 18, 2));
  hand('f', r, at(r, -12, 12));
  hand('f', r + 0.6, at(r + 0.6, 4, 14));
}
// Cover: flat hand, palm down, pulling soil back over the line; the other hand on the knee.
hand('n', 11.3, at(11.3, 20, 10), { nhShape: 'relax', nhWrist: 20 });
for (const [a, b] of [[11.85, 12.55], [12.85, 13.5]]) {
  hand('n', a, [528, 246], { nhShape: 'flat', nhWrist: 70 });
  hand('n', b, [500, 248], { nhWrist: 64 });
}
hand('n', 13.8, at(13.8, 22, -4), { nhShape: 'relax', nhWrist: 20 });
hand('f', 11.6, thighAt(11.6), { fhShape: 'flat', fhWrist: 0 });
for (const t of [12.6, 13.55]) hand('f', t, thighAt(t));
hand('f', 14.2, at(14.2, 4, 14), { fhShape: 'relax', fhWrist: 8 });
hand('n', 14.3, at(14.3, 10, 14), { nhWrist: 4 });
for (const [t, s] of [[14.65, 1], [15.05, -1]]) { hand('n', t, at(t, 8 + 10 * s, 14)); hand('f', t, at(t, 2 - 10 * s, 14)); }
// The can: grip, lift (it comes up a beat after the body), tip it over the bed.
hand('n', 15.45, [CAN.x - 6, CAN.y - 4], { nhShape: 'open', nhWrist: 40 });
hand('n', GRIP_CAN, [CAN.x - 6, CAN.y - 1], { nhShape: 'grip', nhWrist: 40 });
hand('n', 16.0, at(16.0, 24, 2), { nhWrist: 20 });
hand('n', POUR[1], at(POUR[1], 28, 0), { nhWrist: 20 });
hand('n', 17.4, at(17.4, 26, 10), { nhWrist: 30 });
hand('f', 15.6, thighAt(15.6), { fhShape: 'flat', fhWrist: 0 });
hand('f', 16.05, at(16.05, 6, 12), { fhShape: 'relax', fhWrist: 8 });
hand('f', 17.4, thighAt(17.4), { fhShape: 'flat', fhWrist: 0 });
hand('n', T, at(T, 26, 10));
hand('f', T, thighAt(T));
const hands = play(H, { wrap: false });

// The kodal's pose (handle end, angle) and the point a hand holds on it.
const hoePose = (t) => { const b = body(t); return { x: b.hoeX, y: b.hoeY, a: b.hoeA }; };
export const onHandle = (h, u) => [h.x + Math.cos((h.a * Math.PI) / 180) * u, h.y + Math.sin((h.a * Math.PI) / 180) * u];
const holding = (t) => (t <= 3.12 ? 1 : 1 - smooth((t - 3.12) / 0.2));

export function pose(t, w = t) {
  const p = { ...body(t), ...hands(t) };
  const k = holding(t);
  if (k > 0) {
    const h = hoePose(t);
    const [nx, ny] = onHandle(h, 0), [fx, fy] = onHandle(h, BACK_GRIP);
    p.nhX = lerp(p.nhX, nx, k); p.nhY = lerp(p.nhY, ny, k); p.fhX = lerp(p.fhX, fx, k); p.fhY = lerp(p.fhY, fy, k);
    if (t <= 3.12) { p.nhShape = 'grip'; p.fhShape = 'grip'; p.nhWrist = 0; p.fhWrist = 0; }
  }
  p.chest += 0.9 * Math.sin((w / 3.4) * Math.PI * 2);
  p.head += 1.1 * wobble(w * 0.7, 3);
  p.hipX += 0.4 * wobble(w * 0.45, 8);
  return p;
}

// Where each handful leaves his hand.
const THROWN_FROM = THROWS.map((r) => inHand(solve({ ...body(r), ...hands(r) }, G), 'n', 12, 0));

// The camera: him framed close or wide as he works; the kodal while he swings it and the can while he carries it
// count as part of him, so the camera never cuts them off.
export const viewAt = bakeCamera(T, (s) => {
    const sk = solve({ ...body(s), ...hands(s) }, G);
    // Each tool counts as much as he is holding it, fading toward his body as he lets go (so the view never jumps).
    const h = hoePose(s), hoeK = holding(s), canK = smooth((s - GRIP_CAN + 0.15) / 0.3);
    const toward = (k, p) => [lerp(sk.hip[0], p[0], k), lerp(sk.hip[1], p[1], k)];
    const extra = [
      toward(hoeK, onHandle(h, -42)),
      toward(hoeK, onHandle({ ...h, x: h.x - Math.sin((h.a * Math.PI) / 180) * 24, y: h.y + Math.cos((h.a * Math.PI) / 180) * 24 }, 66)),
      toward(canK, [sk.wristN[0] + 48, sk.wristN[1] + 8]), toward(canK, [sk.wristN[0] - 16, sk.wristN[1] + 46]),
    ];
    return figureBox(sk, { hat: 50, brim: 14, extra });
}, { minW: 470 });

// A seed in flight: launched at `at` from (x, y) with velocity (vx, vy), falling until it lands at `ground`.
const fly = (t, at, x, y, vx, vy, ground) => {
  const s = t - at;
  if (s < 0) return null;
  const land = (-vy + Math.sqrt(vy * vy + 2 * 620 * (ground - y))) / 620;
  const u = Math.min(s, land);
  return { x: x + vx * u, y: y + vy * u + 310 * u * u, landed: s >= land };
};

export function frame(t, w = t) {
  const p = pose(t, w);
  let sk = solve(p, G);
  // While he holds the kodal it goes where his hands go: if an arm falls a little short in a fast swing, the tool
  // moves with the hand (and the other hand with it) instead of the hand slipping off the handle.
  let hoe = hoePose(t);
  const k = holding(t);
  if (k > 0) {
    const g = onHandle(hoe, 0), dx = (sk.wristN[0] - g[0]) * k, dy = (sk.wristN[1] - g[1]) * k;
    if (Math.abs(dx) + Math.abs(dy) > 0.3) {
      hoe = { ...hoe, x: hoe.x + dx, y: hoe.y + dy };
      sk = solve({ ...p, fhX: p.fhX + dx, fhY: p.fhY + dy }, G);
    }
  }
  const a = solve({ ...body(t - 1 / 30), ...hands(t - 1 / 30) }, G);
  const hv = (sk.hip[0] - a.hip[0]) * 30, vx = (sk.atlas[0] - a.atlas[0]) * 30;
  const extra = {
    blink: blink(w, 2),
    drag: clamp(hv * 0.06, -7, 7),
  };
  // Clods thrown up where the blade bites, and the bed going darker and crumbly behind it.
  const clods = [];
  for (const [i, [c, x]] of CHOPS.entries()) for (let j = 0; j < 5; j++) {
    const f = fly(t, c, x + 4, 258, (hash(i * 9 + j) - 0.25) * 140, -60 - hash(i * 9 + j + 3) * 110, 262 + hash(j) * 6);
    if (f && t - c < 0.9) clods.push({ ...f, r: 1.6 + hash(i * 5 + j) * 1.8, o: 1 - (t - c) / 0.9 });
  }
  const loose = CHOPS.map(([c]) => smooth((t - c) / 0.4));
  // Seeds: dropped into the line, or broadcast in a fan from the hand; they lie on the soil until covered.
  const covered = (x) => smooth((t - (x < 515 ? 12.1 : 12.9)) / 0.5);
  const seeds = [];
  for (const [i, [d, x]] of DROPS.entries()) for (let j = 0; j < 3; j++) {
    const f = fly(t, d + j * 0.04, x - 1 + j * 2.4, 250, (hash(i * 3 + j) - 0.5) * 10, 10, 266);
    if (f) seeds.push({ ...f, o: 1 - covered(x) });
  }
  for (const [i, r] of THROWS.entries()) {
    const [hx, hy] = THROWN_FROM[i];
    for (let j = 0; j < 16; j++) {
      const f = fly(t, r + hash(i * 31 + j) * 0.06, hx, hy, 110 + hash(i * 17 + j) * 170, -150 + hash(i * 13 + j + 1) * 120, 262 + hash(i * 7 + j) * 9);
      if (f) seeds.push({ ...f, o: f.landed ? 1 - covered(f.x) : 1 });
    }
  }
  // The can stands by the bed until he lifts it; it tips forward to pour.
  const held = t >= GRIP_CAN;
  const g = inHand(sk, 'n', 8, 2);
  const tilt = held ? 34 * smooth((t - POUR[0]) / 0.3) * (1 - smooth((t - POUR[1]) / 0.3)) : 0;
  const can = held ? { x: g[0], y: g[1], a: tilt + clamp(-hv * 0.03, -8, 8) } : { x: CAN.x, y: CAN.y, a: 0 };
  // Water from the rose while it is tipped, and the bed darkening where it lands.
  const drops = [];
  if (held) {
    const rad = (can.a * Math.PI) / 180, rose = [can.x + Math.cos(rad) * 44 - Math.sin(rad) * 6, can.y + Math.sin(rad) * 44 + Math.cos(rad) * 6];
    for (let j = 0; j < 40; j++) {
      const at = POUR[0] + 0.15 + j * 0.018;
      if (at > POUR[1] || t < at || t - at > 0.7) continue;
      const f = fly(t, at, rose[0], rose[1], 70 + hash(j) * 60, 10 + hash(j + 50) * 30, 262 + hash(j + 9) * 8);
      if (f && !f.landed) drops.push(f);
    }
  }
  const wet = smooth((t - POUR[0] - 0.2) / 0.7);
  // A smear behind the blade on the downswing, so a fast chop reads as one stroke instead of strobing.
  const tip = (u) => { const h = hoePose(u), r = (h.a * Math.PI) / 180; return [h.x + Math.cos(r) * 66 - Math.sin(r) * 10, h.y + Math.sin(r) * 66 + Math.cos(r) * 10]; };
  const speed = t < 3.12 ? Math.hypot(...[0, 1].map((i) => tip(t)[i] - tip(t - 0.03)[i])) / 0.03 : 0;
  const smear = speed > 420 ? { pts: [0, 0.015, 0.03, 0.045, 0.06].map((d) => tip(t - d)), o: clamp((speed - 420) / 900, 0, 0.55) } : null;
  const dust = STEPS.map(([at, x]) => ({ x: x - 12, k: (t - at) / 0.55 })).filter((d) => d.k > 0 && d.k < 1);
  const sprout = smooth((t - 16.95) / 0.55);
  const night = t > 16.95 && t < 17.5 ? Math.sin(((t - 16.95) / 0.55) * Math.PI) : 0;
  return { t, w, sk, extra, view: viewAt(t), hoe, held: holding(t) > 0.5, clods, loose, seeds, can, drops, wet, sprout, night, pouch: pouchOf(sk), vx, smear, dust };
}
