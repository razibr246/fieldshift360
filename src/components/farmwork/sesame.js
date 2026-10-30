// Sesame sowing in Chaitra: sesame wants a fine, crumbly bed, so he breaks the clods with a wooden maul (মুগুর),
// three strokes, inching forward; the seed is tiny, so he squats by a bowl of dry sand, pours the seed in from the bag
// at his waist and stirs it through (the sand spreads it evenly); stands and broadcasts the mix in three throws with
// the bowl on his hip; covers it by walking the bed dragging a leafy branch behind him; and, days later, crouches to
// see the seedlings. Days pass between sowing and sprouting, so the loop dissolves into the next (FarmworkScene's seam).
import { play, sheet, stride, solve, inHand } from './rig.js';
import { blink, clamp, hash, lerp, smooth, wobble } from '../../engine/motion.js';
import { bakeCamera, figureBox } from './camera.js';

export const T = 18;
export const G = 262;
export const SEAM = 0.7;
export const BACK_GRIP = -24; // the maul is keyed by where his front hand holds it; the back hand is this far up the handle
export const CLODS = [[1.0, 420], [2.05, 438], [3.1, 456]]; // when each clod is struck, and where it lies
export const BOWL = [488, 262]; // the bowl of sand, a few steps on along the bed
export const POUR = [4.85, 5.4], STIR = [5.55, 6.35];
export const THROWS = [7.55, 8.75, 9.95];
export const BRANCH = { pick: 12.12, drop: 14.65, rest0: [586, 259], len: 110 }; // the leafy branch: picked up, dropped; where its cut end lies; how long
export const SPROUTS = [562, 573, 584, 596, 607, 618, 629, 641, 652, 662];
const STAND = G - 100, SQUAT = G - 50;
const BOWL_DOWN = [520, 262]; // where he sets the bowl down after sowing

const B = sheet(T);
const maul = (t, x, y, a, body) => B.key(t, { mX: x, mY: y, mA: a, ...body });
// Break the clods: raise the maul overhead, bring it down flat on the clod, let it bounce, recover; inch forward.
maul(0, 366, 200, 30, { hipX: 350, hipY: STAND + 14, lumbar: 24, chest: 44, neck: 46, head: 40, eye: 0.8, eyeY: 0.8, brow: 0, mouth: 'calm', ffX: 334, ffLift: 0, ffRoll: 0, nfX: 368, nfLift: 0, nfRoll: 0 });
for (const [i, [hit, x]] of CLODS.entries()) {
  const dx = i * 18;
  // up in front with the arms long, over the head, and down again in front at arm's length (never folding the arms
  // in close to the shoulders, which is where a real swing would lose its power)
  maul(hit - 0.62, 358 + dx, 150, -20, { hipX: 348 + dx, hipY: STAND + 6, lumbar: 10, chest: 16, neck: 20, head: 28 });
  maul(hit - 0.46, 384 + dx, 108, -58, { hipX: 347 + dx, hipY: STAND + 4, lumbar: 6, chest: 8, neck: 14, head: 24 });
  maul(hit - 0.3, 340 + dx, 70, -100, { hipX: 346 + dx, hipY: STAND + 1, lumbar: 0, chest: -6, neck: 2, head: 22, mouth: 'effort', eyeY: 0.7 });
  maul(hit - 0.2, 339 + dx, 68, -104, { hipX: 346 + dx, hipY: STAND + 0.5 });
  maul(hit - 0.08, 400 + dx, 128, -20, { hipX: 349 + dx, hipY: STAND + 8, lumbar: 16, chest: 28, neck: 32, head: 38 });
  // the face of the block meets the clod: the front hand is where that puts the handle
  maul(hit, x - 20, 224, 35, { hipX: 357 + dx, hipY: STAND + 28, lumbar: 36, chest: 66, neck: 66, head: 56, eyeY: 1 });
  maul(hit + 0.08, x - 19, 219, 30, { hipX: 357 + dx, hipY: STAND + 28, chest: 65 });
  maul(hit + 0.3, x - 20, 210, 24, { hipX: 354 + dx, hipY: STAND + 18, lumbar: 28, chest: 50, mouth: 'calm' });
}
// inch forward between strokes: the near foot, then the far
for (const [i, t0] of [1.38, 2.43].entries()) {
  stride(B, 'n', { t0, t1: t0 + 0.22, from: 368 + i * 18, to: 386 + i * 18, lift: 4 });
  stride(B, 'f', { t0: t0 + 0.2, t1: t0 + 0.42, from: 334 + i * 18, to: 352 + i * 18, lift: 4 });
}
// Let the maul down (he lets go a little above the ground and it drops flat with a thud), then walk on to the bowl.
maul(3.4, 400, 226, 12, { hipX: 386, hipY: STAND + 20, lumbar: 32, chest: 58, neck: 60, head: 54 });
maul(T, 400, 226, 12, {});
B.key(3.7, { hipX: 388, hipY: STAND + 4, lumbar: 8, chest: 14, neck: 18, head: 22, eyeY: 0.6 });
stride(B, 'n', { t0: 3.72, t1: 4.0, from: 404, to: 446, lift: 7 });
stride(B, 'f', { t0: 3.98, t1: 4.26, from: 370, to: 430, lift: 7 });
B.key(4.0, { hipX: 412, hipY: STAND + 3 });
// Squat by the bowl, take the seed bag from his waist, pour, stir.
B.key(4.35, { hipX: 432, hipY: SQUAT, lumbar: 30, chest: 50, neck: 54, head: 50, ffRoll: 16 });
B.key(4.6, { hipX: 433, hipY: SQUAT, lumbar: 26, chest: 40, neck: 46, head: 46, eye: 0.6, eyeY: 1 });
B.key(POUR[0], { hipX: 434, hipY: SQUAT, lumbar: 32, chest: 52, neck: 58, head: 56 });
B.key(STIR[0], { hipX: 435, hipY: SQUAT, lumbar: 36, chest: 60, neck: 64, head: 60 });
B.key(STIR[1], { hipX: 436, hipY: SQUAT, lumbar: 36, chest: 60 });
// Up with the bowl on his hip; three throws, a step into each.
B.key(6.7, { hipX: 436, hipY: SQUAT, lumbar: 40, chest: 66, head: 60 });
B.key(7.15, { hipX: 438, hipY: STAND + 1, lumbar: 6, chest: 10, neck: 14, head: 14, eyeY: 0, ffRoll: 0 });
for (const [i, r] of THROWS.entries()) {
  const dx = i * 24;
  B.key(r - 0.42, { hipX: 438 + dx, hipY: STAND + 1, lumbar: 8, chest: 16, neck: 22, head: 26, eye: 0.2, eyeY: 1 });
  B.key(r - 0.2, { hipX: 435 + dx, hipY: STAND + 1.5, lumbar: -2, chest: -6, neck: 0, head: 6, eye: 1, eyeY: -0.3 });
  B.key(r, { hipX: 444 + dx, hipY: STAND + 2.5, lumbar: 12, chest: 22, neck: 18, head: 8, eyeY: 0 });
  B.key(r + 0.35, { hipX: 452 + dx, hipY: STAND + 1.5, lumbar: 8, chest: 14, neck: 14, head: 10 });
}
stride(B, 'n', { t0: 7.6, t1: 7.96, from: 446, to: 470, lift: 7 });
stride(B, 'f', { t0: 8.1, t1: 8.46, from: 430, to: 458, lift: 7 });
stride(B, 'n', { t0: 8.8, t1: 9.16, from: 470, to: 494, lift: 7 });
stride(B, 'f', { t0: 9.3, t1: 9.66, from: 458, to: 482, lift: 7 });
stride(B, 'n', { t0: 10.0, t1: 10.36, from: 494, to: 518, lift: 7 });
stride(B, 'f', { t0: 10.5, t1: 10.86, from: 482, to: 506, lift: 7 });
// Down into a squat to set the bowl on the ground; two steps on to the branch lying ahead; down again to take it up.
B.key(10.9, { hipX: 508, hipY: G - 56, lumbar: 40, chest: 68, neck: 70, head: 58, ffRoll: 12 });
B.key(11.08, { hipX: 509, hipY: G - 55, lumbar: 38, chest: 64 });
B.key(11.32, { hipX: 512, hipY: STAND + 6, lumbar: 12, chest: 22, neck: 26, head: 30, ffRoll: 0 });
stride(B, 'n', { t0: 11.35, t1: 11.65, from: 518, to: 562, lift: 7 });
stride(B, 'f', { t0: 11.62, t1: 11.92, from: 506, to: 548, lift: 7 });
for (const [t, x] of [[11.65, 534], [11.92, 550]]) B.key(t, { hipX: x, hipY: STAND + 3 });
B.key(12.0, { hipX: 556, hipY: G - 70, lumbar: 30, chest: 54, neck: 58, head: 54 });
B.key(BRANCH.pick, { hipX: 560, hipY: G - 54, lumbar: 42, chest: 72, neck: 74, head: 62, eyeY: 1, ffRoll: 12 });
B.key(12.42, { hipX: 556, hipY: STAND + 6, lumbar: 14, chest: 26, neck: 30, head: 34, eyeY: 1, ffRoll: 0 });
// Rake the seed under: holding the cut end in front of him, the leafy end on the bed ahead, he backs slowly across
// the sown strip and the leaves sweep a thin cover of soil over it.
const back = (side, t0, t1, from, to) => {
  const [X, L, R] = [`${side}fX`, `${side}fLift`, `${side}fRoll`];
  B.key(t0, { [X]: from, [L]: 0, [R]: 0 });
  B.key(lerp(t0, t1, 0.35), { [X]: lerp(from, to, 0.2), [L]: 3, [R]: -8 });
  B.key(lerp(t0, t1, 0.7), { [X]: lerp(from, to, 0.75), [L]: 4, [R]: 4 });
  B.key(t1, { [X]: to, [L]: 0, [R]: 0 });
};
for (const [t0, s, from, to] of [[12.5, 'n', 562, 538], [12.78, 'f', 548, 524], [13.15, 'n', 538, 514], [13.45, 'f', 524, 500], [13.85, 'n', 514, 490], [14.15, 'f', 500, 476]]) back(s, t0, t0 + 0.3, from, to);
for (const [t, x] of [[12.75, 545], [13.05, 535], [13.45, 522], [13.75, 511], [14.15, 498], [14.45, 487]]) B.key(t, { hipX: x, hipY: STAND + 5, lumbar: 16, chest: 28, neck: 32, head: 36, mouth: 'effort' });
// Let it fall, step up to the strip, and, days later, crouch to look at the seedlings in front of him.
B.key(BRANCH.drop, { hipX: 485, hipY: STAND + 3, lumbar: 10, chest: 16, head: 26, mouth: 'calm' });
stride(B, 'n', { t0: 14.85, t1: 15.2, from: 490, to: 514, lift: 6 });
B.key(15.2, { hipX: 498, hipY: STAND + 2 });
B.key(15.6, { hipX: 500, hipY: G - 64, lumbar: 30, chest: 46, neck: 52, head: 50, eyeY: 1, ffRoll: 12 });
B.key(16.6, { hipX: 501, hipY: G - 64, lumbar: 30, chest: 46, head: 52, mouth: 'smile', brow: 0.6 });
B.key(T, { hipX: 501, hipY: G - 64, head: 48 });
const LAG = { head: -0.07, neck: -0.04, chest: 0.025, eye: -0.15, eyeY: -0.15 };
export const body = play(B, { lag: LAG, wrap: false });

// ---- hands ----
const H = sheet(T);
const at = (t, dx, dy) => { const b = body(t); return [b.hipX + dx, b.hipY + dy]; };
const hand = (side, t, [x, y], extra = {}) => H.key(t, { [`${side}hX`]: x, [`${side}hY`]: y, ...extra });
const solved = (t) => solve({ ...body(t), nhX: 0, nhY: 0, fhX: 0, fhY: 0 }, G);
const thighAt = (t) => { const s = solved(t); return [s.hipN[0] + (s.kneeN[0] - s.hipN[0]) * 0.62 - 2, s.hipN[1] + (s.kneeN[1] - s.hipN[1]) * 0.62 - 9]; };
// the seed bag hangs at the front of his waist until he takes it
export const bagOf = (s) => { const k = 0.45; return [lerp(s.hip[0], s.waist[0], k) + Math.cos((s.lumbar * Math.PI) / 180) * 15, lerp(s.hip[1], s.waist[1], k) + Math.sin((s.lumbar * Math.PI) / 180) * 15 + 4]; };
const [bx, by] = BOWL;
// (while he holds the maul its handle sets both hands; these keys take over as he lets it go)
hand('n', 3.5, at(3.5, 16, 10), { nhShape: 'relax', nhWrist: 20 });
hand('f', 3.5, at(3.5, 8, 12), { fhShape: 'relax', fhWrist: 8 });
hand('f', 3.95, thighAt(3.95), { fhShape: 'flat', fhWrist: 0 });
hand('n', 4.25, bagOf(solved(4.25)).map((v, i) => v + [-2, -2][i]), { nhShape: 'pinch', nhWrist: 30 });
hand('n', 4.55, at(4.55, 30, -4), { nhWrist: 10 });
hand('n', POUR[0], [bx - 4, by - 30], { nhShape: 'grip', nhWrist: 40 });
hand('n', POUR[1], [bx - 2, by - 28], { nhWrist: 120 });
hand('n', POUR[1] + 0.1, [bx - 1, by - 24], { nhShape: 'open', nhWrist: 100 });
hand('f', 4.6, thighAt(4.6)); hand('f', STIR[1], thighAt(STIR[1]));
// stir: the flat of the hand turns the sand over in small circles
for (let i = 0; i <= 8; i++) { const t = STIR[0] + i * 0.1, a = i * 2.2; hand('n', t, [bx + Math.cos(a) * 6, by - 15 + Math.sin(a) * 2], { nhShape: 'cup', nhWrist: 70 }); }
// take up the bowl in the left hand and hold it on the hip
hand('f', 6.55, [bx - 18, by - 10], { fhShape: 'open', fhWrist: 60 });
hand('f', 6.7, [bx - 16, by - 8], { fhShape: 'grip', fhWrist: 60 });
hand('n', 6.7, at(6.7, 30, 6), { nhShape: 'relax', nhWrist: 30 });
for (const t of [7.15, 7.6, 8.1, 8.6, 9.1, 9.6, 10.1]) hand('f', t, at(t, 14, -2), { fhWrist: -10 });
// each throw: a handful from the bowl, the arm drawn back low, swept forward and up, the hand opening
for (const r of THROWS) {
  hand('n', r - 0.6, at(r - 0.6, 16, -6), { nhShape: 'cup', nhWrist: 40 });
  hand('n', r - 0.3, at(r - 0.3, -16, 16), { nhWrist: 40 });
  hand('n', r - 0.1, at(r - 0.1, 32, 2), { nhWrist: 0 });
  hand('n', r, at(r, 58, -14), { nhShape: 'open', nhWrist: -14 });
  hand('n', r + 0.25, at(r + 0.25, 56, -10), { nhWrist: -10 });
}
// down: the bowl to the ground, the branch up
hand('f', 10.95, [BOWL_DOWN[0] - 14, 246], { fhShape: 'grip', fhWrist: 70 });
hand('f', 11.02, [BOWL_DOWN[0] - 14, 246], { fhShape: 'open' });
hand('f', 11.12, [BOWL_DOWN[0] - 16, 238], {});
hand('n', 10.6, at(10.6, 20, 8), { nhShape: 'relax', nhWrist: 30 });
for (const [t, s] of [[11.35, 1], [11.65, -1], [11.92, 1]]) { hand('n', t, at(t, 8 + 8 * s, 14), { nhShape: 'relax', nhWrist: 6 }); hand('f', t, at(t, 2 - 8 * s, 14), { fhShape: 'relax', fhWrist: 8 }); }
hand('n', BRANCH.pick - 0.07, [BRANCH.rest0[0] - 6, BRANCH.rest0[1] - 14], { nhShape: 'open', nhWrist: 60 });
hand('n', BRANCH.pick, [BRANCH.rest0[0] - 5, BRANCH.rest0[1] - 10], { nhShape: 'grip', nhWrist: 60 });
hand('f', BRANCH.pick, thighAt(BRANCH.pick), { fhShape: 'flat', fhWrist: 0 });
// both hands on the cut end, low in front of him, as he backs across the strip
for (const t of [12.42, 12.78, 13.08, 13.45, 13.75, 14.15, 14.45]) { hand('n', t, at(t, 26, 4), { nhShape: 'grip', nhWrist: 40 }); hand('f', t, at(t, 18, 8), { fhShape: 'grip', fhWrist: 44 }); }
hand('n', BRANCH.drop, at(BRANCH.drop, 26, 8), { nhShape: 'open', nhWrist: 50 });
hand('f', BRANCH.drop, at(BRANCH.drop, 18, 10), { fhShape: 'open', fhWrist: 50 });
hand('n', 15.0, at(15.0, 10, 14), { nhShape: 'relax', nhWrist: 6 });
hand('f', 15.0, at(15.0, 2, 14), { fhShape: 'relax', fhWrist: 8 });
hand('n', 15.6, thighAt(15.6).map((v, i) => v + [10, 2][i]), { nhShape: 'relax', nhWrist: 30 });
hand('f', 15.6, thighAt(15.6), { fhShape: 'flat', fhWrist: 0 });
hand('n', T, thighAt(T).map((v, i) => v + [10, 2][i])); hand('f', T, thighAt(T));
const hands = play(H, { wrap: false });

const maulPose = (t) => { const b = body(t); return { x: b.mX, y: b.mY, a: b.mA }; };
export const onHandle = (h, u) => [h.x + Math.cos((h.a * Math.PI) / 180) * u, h.y + Math.sin((h.a * Math.PI) / 180) * u];
const holding = (t) => (t <= DROP ? 1 : 0);
// lowering it, he lets go with the back hand first and sets it down with the front one
const holdingBack = (t) => (t <= 3.22 ? 1 : 1 - smooth((t - 3.22) / 0.12));
// The maul let go at DROP falls flat onto the soil by LANDED, a small bounce, then lies there.
const DROP = 3.4, LANDED = 3.62, MAUL_REST = { x: 404, y: 250, a: 0 };

export function pose(t, w = t) {
  const p = { ...body(t), ...hands(t) };
  const k = holding(t);
  if (k > 0) {
    const h = maulPose(t), [nx, ny] = onHandle(h, 0), [fx, fy] = onHandle(h, BACK_GRIP), kb = holdingBack(t);
    p.nhX = lerp(p.nhX, nx, k); p.nhY = lerp(p.nhY, ny, k); p.fhX = lerp(p.fhX, fx, kb); p.fhY = lerp(p.fhY, fy, kb);
    if (t <= DROP) { p.nhShape = 'grip'; p.nhWrist = 0; }
    if (kb > 0.5) { p.fhShape = 'grip'; p.fhWrist = 0; }
  }
  p.chest += 0.9 * Math.sin((w / 3.4) * Math.PI * 2);
  p.head += 1.1 * wobble(w * 0.7, 6);
  p.hipX += 0.4 * wobble(w * 0.45, 12);
  return p;
}

// The camera: the maul while he swings it and the branch while he drags it count as part of him.
export const viewAt = bakeCamera(T, (s) => {
  const sk = solve({ ...body(s), ...hands(s) }, G), h = maulPose(s), k = holding(s);
  const toward = (q, p) => [lerp(sk.hip[0], p[0], q), lerp(sk.hip[1], p[1], q)];
  const dragging = s >= BRANCH.pick && s < BRANCH.drop ? 1 : 0;
  return figureBox(sk, { hat: 34, extra: [toward(k, onHandle(h, BACK_GRIP)), toward(k, onHandle(h, 34)), toward(dragging, [sk.hip[0] + 100, G])] });
}, { minW: 470 });

const fly = (t, at, x, y, vx, vy, ground) => {
  const s = t - at;
  if (s < 0) return null;
  const land = (-vy + Math.sqrt(vy * vy + 2 * 620 * (ground - y))) / 620, u = Math.min(s, land);
  return { x: x + vx * u, y: y + vy * u + 310 * u * u, landed: s >= land };
};
const THROWN_FROM = THROWS.map((r) => inHand(solve({ ...body(r), ...hands(r) }, G), 'n', 12, 0));
// where the maul is, in his hands, at the moment he lets it go
const RELEASED = (() => { const sk = solve(pose(DROP, DROP), G), h = maulPose(DROP), g = onHandle(h, 0); return { ...h, x: h.x + sk.wristN[0] - g[0], y: h.y + sk.wristN[1] - g[1] }; })();

export function frame(t, w = t) {
  const p = pose(t, w);
  let sk = solve(p, G);
  // The maul goes where his hands go (if an arm falls short in the fast stroke, the tool moves, not the grip).
  let maul = t <= DROP ? maulPose(t) : t < LANDED ? (() => { const f = smooth((t - DROP) / (LANDED - DROP)) ** 1.6, r = RELEASED; return { x: lerp(r.x, MAUL_REST.x, f), y: lerp(r.y, MAUL_REST.y, f), a: lerp(r.a, MAUL_REST.a, f) }; })()
    : { ...MAUL_REST, y: MAUL_REST.y - Math.max(0, Math.sin((t - LANDED) * 22) * 2.4 * Math.exp(-(t - LANDED) * 10)) };
  const k = holding(t);
  if (k > 0) {
    const g = onHandle(maul, 0), dx = (sk.wristN[0] - g[0]) * k, dy = (sk.wristN[1] - g[1]) * k;
    if (Math.abs(dx) + Math.abs(dy) > 0.3) { maul = { ...maul, x: maul.x + dx, y: maul.y + dy }; const kb = holdingBack(t); sk = solve({ ...p, fhX: p.fhX + dx * kb, fhY: p.fhY + dy * kb }, G); }
  }
  const a = solve({ ...body(t - 1 / 30), ...hands(t - 1 / 30) }, G);
  const hv = (sk.hip[0] - a.hip[0]) * 30, vx = (sk.atlas[0] - a.atlas[0]) * 30;
  const extra = { blink: blink(w, 5), tail: clamp(vx * 0.1 + 4 * wobble(w * 1.3, 8), -40, 45), tailBend: 2 * wobble(w * 2, 9), drag: clamp(hv * 0.06, -7, 7) };
  // Clods: whole until struck, then a spray of crumbs and a patch of fine soil.
  const clods = CLODS.map(([hit, x]) => ({ x, broken: t >= hit }));
  const crumbs = [];
  for (const [i, [hit, x]] of CLODS.entries()) for (let j = 0; j < 8; j++) {
    const f = fly(t, hit, x + (hash(i * 9 + j) - 0.5) * 6, 254, (hash(i * 9 + j + 1) - 0.5) * 120, -40 - hash(i * 9 + j + 2) * 90, 262 + hash(j) * 6);
    if (f && t - hit < 0.8) crumbs.push({ ...f, r: 1.2 + hash(i * 5 + j) * 1.8, o: 1 - (t - hit) / 0.8 });
  }
  // The seed bag: at his waist, in his hand while he pours (a thin stream of seed into the sand), then dropped by the bowl.
  const bagAt = bagOf(sk);
  const bag = t < 4.25 ? { x: bagAt[0], y: bagAt[1], a: sk.lumbar * 0.4, held: false }
    : t < POUR[1] + 0.12 ? (() => { const g = inHand(sk, 'n', 9, 1); return { x: g[0], y: g[1], a: g[2] - 90, held: true }; })()
      : { x: BOWL[0] + 22, y: BOWL[1] - 2, a: 70, held: false };
  const stream = t > POUR[0] + 0.08 && t < POUR[1] ? Array.from({ length: 9 }, (_, j) => ({ x: bag.x + 3 + hash(j) * 2, y: bag.y + 6 + ((t * 90 + j * 4) % 24) })) : [];
  // The bowl: on the ground until he takes it up, on his hip while he sows, then set down.
  const fg = inHand(sk, 'f', 9, 2);
  const bowl = t >= 6.7 && t < 11.02 ? { x: fg[0], y: fg[1] + 10, held: true } : { x: t < 6.7 ? BOWL[0] : BOWL_DOWN[0], y: G, held: false };
  const swirl = t > STIR[0] && t < STIR[1] + 0.2 ? (t - STIR[0]) * 9 : 0;
  // The broadcast: a fan of sand and tiny seed from each throw, settling on the bed.
  // the leaves sweep from right to left: everything right of them is covered, and what lies under them (they spread
  // about ten units either side of the tip)
  const sweep = t > BRANCH.pick + 0.3 ? branchSweep(t) : Infinity;
  const covered = (x) => smooth((x - sweep + 10) / 10);
  const seeds = [];
  for (const [i, r] of THROWS.entries()) {
    const [hx, hy] = THROWN_FROM[i];
    for (let j = 0; j < 26; j++) {
      const f = fly(t, r + hash(i * 31 + j) * 0.05, hx, hy, 70 + hash(i * 17 + j) * 80, -150 + hash(i * 13 + j + 1) * 120, 262 + hash(i * 7 + j) * 8);
      if (f) seeds.push({ ...f, sand: j % 3 !== 0, o: f.landed ? 1 - covered(f.x) : 1 });
    }
  }
  // The branch: lying ahead, then dragged behind him (its leafy end sweeping the soil), then let go.
  const dragging = t >= BRANCH.pick && t < BRANCH.drop;
  const grip = inHand(sk, 'n', 6, 0);
  // held by the cut end low in front of him, the leafy end lying on the bed ahead; let go, it falls flat
  const branch = dragging ? { x: grip[0], y: grip[1], a: trail(grip) }
    : t < BRANCH.pick ? { x: BRANCH.rest0[0], y: BRANCH.rest0[1], a: 0 }
      : (() => { const k = smooth((t - BRANCH.drop) / 0.25); return { x: dropAt[0], y: lerp(dropAt[1], G - 2, k), a: lerp(dropAt[2], 0, k) }; })();
  const dust = dragging && hv < -5 ? Array.from({ length: 4 }, (_, j) => ({ x: sweep - 4 - j * 5 - hash(j) * 4, y: 258 - ((t * 20 + j * 3) % 8), o: 0.35 })) : [];
  const sprout = smooth((t - 15.95) / 0.6);
  const night = t > 15.45 && t < 16.15 ? Math.sin(((t - 15.45) / 0.7) * Math.PI) : 0;
  return { t, w, sk, extra, view: viewAt(t), maul, held: k > 0.5, clods, crumbs, bag, stream, bowl, swirl, seeds, branch, sweep, dust, sprout, night };
}

// The branch's angle (degrees) when its cut end is in his hand at `grip` and its leafy end lies on the soil ahead.
function trail(grip) {
  const dy = Math.min(BRANCH.len * 0.95, Math.max(0, G - 4 - grip[1]));
  return (Math.atan2(dy, Math.sqrt(BRANCH.len ** 2 - dy * dy)) * 180) / Math.PI;
}
// Where the leafy end of the branch has swept to.
function branchSweep(t) {
  const u = Math.min(t, BRANCH.drop);
  const g = inHand(solve({ ...body(u), ...hands(u) }, G), 'n', 6, 0), a = (trail(g) * Math.PI) / 180;
  return g[0] + Math.cos(a) * BRANCH.len * 0.75;
}
const dropAt = (() => { const g = inHand(solve({ ...body(BRANCH.drop), ...hands(BRANCH.drop) }, G), 'n', 6, 0); return [g[0], g[1], trail(g)]; })();
export const SWEEP_FROM = (() => branchSweep(BRANCH.pick + 0.3))(); // where the leaves first lie when he starts to rake
