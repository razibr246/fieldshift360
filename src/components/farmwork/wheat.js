// Wheat harvest by hand in Chaitra, one swath at a time: he picks an ear, rubs it between his palms and blows the
// chaff away to see the grain has gone hard; squats into the crop with his sickle (কাস্তে); gathers a fistful of
// stalks and cuts them low in one pulling stroke, twice; lays the bundle down, twists a few stalks into a band and
// ties the sheaf (আঁটি); tosses it onto the row of sheaves behind him and moves up to the new edge of the crop.
// Every loop is the next stretch of the swath (the camera follows him, PAN units a loop), so there is no seam.
import { play, sheet, stride, solve, inHand } from './rig.js';
import { blink, clamp, hash, lerp, panCurve, smooth, wobble } from '../../engine/motion.js';
import { bakeCamera, figureBox } from './camera.js';

export const T = 16;
export const G = 262;
export const PAN = 44; // two fistfuls of the swath
export const E0 = 560; // the edge of the standing crop when the loop begins
export const SPACING = 4.4; // stalks along the front row: ten to a loop
export const PLUCK = 0.62, SICKLE_UP = 2.86, GATHER1 = 3.75, CUT1 = 4.55, GATHER2 = 5.95, CUT2 = 6.65, LAID = 8.3, SICKLE_DOWN = 8.72, TIED = 12.9, LIFT = 13.45, TOSS = 14.45, LAND = 14.9;
export const SICKLE_REST = [E0 + 14, G + 5]; // where the sickle lies when a loop begins (he put it down last loop)
export const BUNDLE_AT = [E0 + 30, G + 1]; // where the cut stalks are laid and tied
export const SHEAF_AT = [500, G + 3]; // where this loop's sheaf lands; the earlier ones lie PAN apart behind it

const STAND = G - 100;
const SQUAT = G - 46;
const cam = panCurve({ peak: 15.4 / T, width: 0.05, rest: 0.5 });
export const camera = (t) => PAN * cam(t / T);
export const edgeAt = (t) => E0 + (t >= CUT2 ? 44 : t >= CUT1 ? 22 : 0);

// ---- the body ----
const B = sheet(T);
// Small steps in a squat: the heel lifts, the foot slides forward a hand's width, sets down flat.
const inch = (side, t0, t1, from, to, lift = 3) => {
  const [X, L, R] = [`${side}fX`, `${side}fLift`, `${side}fRoll`];
  B.key(t0, { [X]: from, [L]: 0, [R]: side === 'f' ? 14 : 0 });
  B.key(lerp(t0, t1, 0.4), { [X]: lerp(from, to, 0.3), [L]: lift, [R]: 18 });
  B.key(t1, { [X]: to, [L]: 0, [R]: side === 'f' ? 14 : 0 });
};
// Check the grain: pluck an ear at the edge of the crop, rub it in his palms, blow the chaff, look, nod.
B.key(0, { hipX: 516, hipY: STAND + 1, lumbar: 4, chest: 10, neck: 14, head: 16, eye: 0.8, eyeY: 0.3, brow: 0, mouth: 'calm', ffX: 500, ffLift: 0, ffRoll: 0, nfX: 534, nfLift: 0, nfRoll: 0 });
B.key(0.38, { hipX: 519, hipY: STAND + 2, lumbar: 8, chest: 18, neck: 20, head: 18, eye: 1, eyeY: -0.6, brow: 0.4 });
B.key(PLUCK, { hipX: 519, hipY: STAND + 2, lumbar: 8, chest: 17 });
B.key(0.95, { hipX: 517, hipY: STAND + 1, lumbar: 4, chest: 10, neck: 18, head: 32, eye: 0.6, eyeY: 1, brow: 0 });
B.key(1.6, { hipX: 517, lumbar: 5, chest: 11, head: 33 });
B.key(1.72, { head: 36, mouth: 'open' });
B.key(1.95, { head: 33, mouth: 'calm' });
B.key(2.1, { head: 40, brow: 0.6 });
B.key(2.24, { hipX: 517, hipY: STAND + 2, lumbar: 6, chest: 12, neck: 22, head: 32, mouth: 'smile' });
// Down into the crop, taking up the sickle on the way; the back heel comes up as he settles into the squat.
B.key(2.5, { hipX: 518, hipY: STAND + 10, lumbar: 20, chest: 38, neck: 42, head: 46 });
B.key(SICKLE_UP, { hipX: 523, hipY: SQUAT - 2, lumbar: 46, chest: 84, neck: 86, head: 74, eyeY: 1, mouth: 'calm', ffRoll: 6 });
B.key(3.28, { hipX: 526, hipY: SQUAT, lumbar: 34, chest: 58, neck: 62, head: 52, eye: 1, eyeY: 0.6, ffRoll: 14 });
B.key(GATHER1, { hipX: 526, hipY: SQUAT, lumbar: 36, chest: 62, head: 56 });
// First fistful: hook the sickle behind the stalks low down, and draw it through toward himself.
B.key(4.3, { hipX: 527, hipY: SQUAT + 1, lumbar: 40, chest: 68, neck: 70, head: 62, eyeY: 1, mouth: 'effort' });
B.key(CUT1, { hipX: 524, hipY: SQUAT, lumbar: 38, chest: 64, mouth: 'calm' });
B.key(4.8, { hipX: 525, chest: 60 });
// Inch forward in the squat to the next fistful.
inch('n', 5.0, 5.26, 534, 556);
inch('f', 5.24, 5.5, 500, 522);
for (const [t, x, y] of [[5.12, 534, SQUAT - 2], [5.36, 543, SQUAT - 2], [5.55, 548, SQUAT]]) B.key(t, { hipX: x, hipY: y });
B.key(GATHER2, { hipX: 548, hipY: SQUAT, lumbar: 36, chest: 62, head: 56 });
B.key(6.35, { hipX: 549, hipY: SQUAT + 1, lumbar: 40, chest: 68, neck: 70, head: 62, mouth: 'effort' });
B.key(CUT2, { hipX: 546, hipY: SQUAT, lumbar: 38, chest: 64, mouth: 'calm' });
B.key(6.9, { hipX: 548, chest: 60 });
// Lay the bundle down in front of him on the fresh stubble, and the sickle beside it.
B.key(7.5, { hipX: 549, hipY: SQUAT + 1, lumbar: 42, chest: 72, neck: 74, head: 64 });
B.key(LAID, { hipX: 549, lumbar: 42, chest: 72 });
B.key(SICKLE_DOWN, { hipX: 551, lumbar: 46, chest: 82, head: 72 });
B.key(9.2, { hipX: 548, lumbar: 38, chest: 64, head: 62 });
// Tie the sheaf: pull a few stalks for a band, wrap it round, twist the ends, tuck the knot under.
B.key(9.85, { hipX: 548, hipY: SQUAT + 1, lumbar: 42, chest: 72, neck: 76, head: 70 });
B.key(10.8, { hipX: 550, lumbar: 46, chest: 80 });
B.key(11.5, { hipX: 548, lumbar: 42, chest: 72, mouth: 'effort' });
B.key(12.2, { hipX: 549, chest: 73 });
B.key(12.65, { hipX: 549, lumbar: 44, chest: 76, mouth: 'calm' });
B.key(TIED, { hipX: 548, lumbar: 42, chest: 70, mouth: 'smile' });
B.key(13.25, { hipX: 549, hipY: SQUAT + 1, lumbar: 44, chest: 76, head: 66 });
// Up with the sheaf, a swing forward to load the throw, and it goes back onto the row; then on to the new edge.
B.key(14.0, { hipX: 548, hipY: STAND + 4, lumbar: 8, chest: 14, neck: 18, head: 18, eyeY: 0.2, mouth: 'effort', ffRoll: 0 });
B.key(14.18, { hipX: 550, hipY: STAND + 5, lumbar: 12, chest: 22, head: 22 });
B.key(TOSS, { hipX: 545, hipY: STAND + 4, lumbar: -2, chest: -8, neck: -4, head: 4, mouth: 'calm' });
B.key(14.75, { hipX: 547, hipY: STAND + 2, lumbar: 4, chest: 8, neck: 12, head: 12 });
stride(B, 'f', { t0: 14.95, t1: 15.35, from: 522, to: 544, lift: 6 });
stride(B, 'n', { t0: 15.45, t1: 15.85, from: 556, to: 578, lift: 6 });
for (const [t, x] of [[15.2, 552], [15.6, 557], [15.92, 560]]) B.key(t, { hipX: x, hipY: STAND + 1 });
B.key(15.95, { lumbar: 4, chest: 10, neck: 14, head: 16, eye: 0.8, eyeY: 0.3 });

const ADVANCE = { hipX: PAN, nfX: PAN, ffX: PAN, nhX: PAN, fhX: PAN };
const LAG = { head: -0.07, neck: -0.04, chest: 0.025, eye: -0.15, eyeY: -0.15 };
export const body = play(B, { lag: LAG, advance: ADVANCE });

// ---- the hands ----
const H = sheet(T);
const at = (t, dx, dy) => { const b = body(t); return [b.hipX + dx, b.hipY + dy]; };
const hand = (side, t, [x, y], extra = {}) => H.key(t, { [`${side}hX`]: x, [`${side}hY`]: y, ...extra });
const solved = (t) => solve({ ...body(t), nhX: 0, nhY: 0, fhX: 0, fhY: 0 }, G);
const thighAt = (t) => { const s = solved(t); return [s.hipN[0] + (s.kneeN[0] - s.hipN[0]) * 0.62 - 2, s.hipN[1] + (s.kneeN[1] - s.hipN[1]) * 0.62 - 9]; };
const EAR = [E0 + 4, G - 108]; // the ripe ear he checks, at the edge of the crop
// Check: pinch the ear off, rub it between both palms, cup it, blow, look.
hand('n', 0, at(0, 8, 16), { nhShape: 'relax', nhWrist: 4 });
hand('f', 0, at(0, 2, 15), { fhShape: 'relax', fhWrist: 8 });
hand('f', 0.4, [EAR[0] - 10, EAR[1] + 4], { fhShape: 'open', fhWrist: -30 });
hand('f', 0.55, [EAR[0] - 8, EAR[1] + 3], { fhShape: 'pinch', fhWrist: -34 });
hand('f', PLUCK, [EAR[0] - 8, EAR[1] + 3], {});
hand('f', 0.78, [EAR[0] - 16, EAR[1] + 10], {});
hand('n', 0.5, at(0.5, 12, 4), { nhWrist: -10 });
for (const [i, t] of [0.95, 1.07, 1.19, 1.31, 1.43, 1.55].entries()) {
  const s = i % 2 ? 1 : -1;
  hand('n', t, at(t, 24 + s * 2.5, -26 - s), { nhShape: 'flat', nhWrist: -80 });
  hand('f', t, at(t, 24 - s * 2.5, -22 + s), { fhShape: 'flat', fhWrist: -100 });
}
hand('n', 1.64, at(1.64, 26, -34), { nhShape: 'cup', nhWrist: -20 });
hand('f', 1.64, at(1.64, 14, -24), { fhShape: 'relax', fhWrist: 20 });
hand('n', 1.82, at(1.82, 26, -52), {});
hand('n', 2.12, at(2.12, 24, -40), {});
hand('f', 2.12, at(2.12, 6, 10), {});
// Take up the sickle from the ground as he goes down.
hand('n', 2.5, at(2.5, 24, 16), { nhShape: 'relax', nhWrist: 30 });
hand('f', 2.5, at(2.5, 8, 14), {});
hand('n', SICKLE_UP - 0.1, [SICKLE_REST[0] - 7, SICKLE_REST[1] - 10], { nhShape: 'open', nhWrist: 20 });
hand('n', SICKLE_UP, [SICKLE_REST[0] - 7, SICKLE_REST[1] - 6], { nhShape: 'grip', nhWrist: 10 });
hand('n', 3.28, at(3.28, 34, 8), { nhWrist: -20 });
hand('f', 2.86, thighAt(2.86), { fhShape: 'flat', fhWrist: 0 });
// Gather a fistful (the stalks lean in to his hand), hook the sickle behind them low down, draw it through.
const fistful = (x0) => [x0 + 9, G - 58];
for (const [g, c, x0] of [[GATHER1, CUT1, E0], [GATHER2, CUT2, E0 + 22]]) {
  hand('f', g - 0.45, [x0 + 4, G - 64], { fhShape: 'open', fhWrist: -10 });
  hand('f', g, fistful(x0), { fhShape: 'grip', fhWrist: -14 });
  hand('n', c - 0.42, [x0 + 24, G - 16], { nhWrist: 30 });
  hand('n', c - 0.25, [x0 + 22, G - 14], { nhWrist: 26 });
  hand('n', c, [x0 - 4, G - 12], { nhWrist: 8 });
  hand('n', c + 0.22, [x0 + 6, G - 26], { nhWrist: -10 });
  hand('f', c + 0.2, [x0 + 8, G - 62], {});
}
// between the fistfuls the full hand rides with him as he inches forward
for (const t of [5.05, 5.3, 5.5]) hand('f', t, at(t, 42, -12));
hand('n', 5.25, at(5.25, 30, 4), { nhWrist: -10 });
// Lay the bundle: lift it clear, swing it down flat in front of him, let go; set the sickle beside it.
hand('f', 7.0, [E0 + 30, G - 72], { fhWrist: -10 });
hand('f', 7.7, [E0 + 26, G - 24], { fhWrist: -70 });
hand('f', LAID, [E0 + 24, G - 9], { fhWrist: -84, fhShape: 'grip' });
hand('f', LAID + 0.06, [E0 + 24, G - 9], { fhShape: 'open' });
hand('n', 7.6, at(7.6, 30, 16), { nhWrist: 20 }); // the sickle kept low, blade away from him
hand('n', SICKLE_DOWN - 0.2, [SICKLE_REST[0] + PAN - 9, SICKLE_REST[1] - 12], { nhWrist: 14 });
hand('n', SICKLE_DOWN, [SICKLE_REST[0] + PAN - 7, SICKLE_REST[1] - 6], { nhShape: 'grip', nhWrist: 10 });
hand('n', SICKLE_DOWN + 0.05, [SICKLE_REST[0] + PAN - 7, SICKLE_REST[1] - 6], { nhShape: 'open' });
hand('f', 8.9, thighAt(8.9), { fhShape: 'flat', fhWrist: 0 });
hand('n', 9.25, at(9.25, 36, -6), { nhShape: 'relax', nhWrist: 30 });
// Tie: pull a few stalks for the band, wrap it round the middle, twist the ends together, tuck the knot.
const [bx, by] = BUNDLE_AT;
hand('f', 9.85, [bx - 10, by - 9], { fhShape: 'grip', fhWrist: 60 });
hand('n', 9.85, [bx + 6, by - 9], { nhShape: 'pinch', nhWrist: 60 });
hand('n', 10.3, [bx + 8, by - 22], { nhWrist: 40 });
hand('n', 10.6, [bx + 2, by - 2], { nhWrist: 90 });
hand('n', 10.9, [bx - 4, by - 1], { nhWrist: 120 });
hand('n', 11.2, [bx - 1, by - 13], { nhWrist: 60 });
for (const [i, t] of [11.4, 11.56, 11.72, 11.88, 12.04, 12.2, 12.36].entries()) {
  const s = i % 2 ? 1 : -1;
  hand('n', t, [bx + 1 + s * 2, by - 14 - s * 1.5], { nhShape: 'pinch', nhWrist: 50 + s * 22 });
  hand('f', t, [bx - 6 - s * 1.5, by - 13 + s], { fhShape: 'pinch', fhWrist: 70 - s * 20 });
}
hand('n', 12.65, [bx + 1, by - 5], { nhShape: 'flat', nhWrist: 80 });
hand('f', 12.65, [bx - 9, by - 8], { fhShape: 'grip', fhWrist: 60 });
hand('n', TIED, [bx + 2, by - 13], { nhShape: 'relax', nhWrist: 60 });
// Lift by the band (the other hand under it), swing it forward, then back and let it fly onto the row.
hand('n', 13.3, [bx - 1, by - 11], { nhShape: 'grip', nhWrist: 70 });
hand('f', 13.3, [bx + 10, by - 8], { fhShape: 'flat', fhWrist: 40 });
hand('n', 14.0, at(14.0, 30, -2), { nhWrist: 30 });
hand('f', 14.0, at(14.0, 42, 0), { fhWrist: 20 });
hand('n', 14.18, at(14.18, 42, -10), { nhWrist: 10 });
hand('f', 14.18, at(14.18, 52, -8), { fhWrist: 0 });
hand('n', TOSS, at(TOSS, -8, 6), { nhWrist: 40 });
hand('f', TOSS, at(TOSS, 0, 10), { fhWrist: 40 });
hand('n', TOSS + 0.04, at(TOSS + 0.04, -9, 7), { nhShape: 'open' });
hand('f', TOSS + 0.04, at(TOSS + 0.04, -1, 11), { fhShape: 'open' });
hand('n', 14.85, at(14.85, 8, 16), { nhShape: 'relax', nhWrist: 4 });
hand('f', 14.85, at(14.85, 2, 15), { fhShape: 'relax', fhWrist: 8 });
for (const [t, s] of [[15.2, 1], [15.65, -1]]) { hand('n', t, at(t, 8 - 10 * s, 15)); hand('f', t, at(t, 2 + 10 * s, 14)); }
hand('n', 15.95, at(15.95, 8, 16)); hand('f', 15.95, at(15.95, 2, 15));
export const hands = play(H, { advance: ADVANCE });

export function pose(t, w = t) {
  const p = { ...body(t), ...hands(t) };
  p.chest += 0.9 * Math.sin((w / (t > 13.4 && t < 15.5 ? 2.6 : 3.6)) * Math.PI * 2);
  p.head += 1.1 * wobble(w * 0.7, 5);
  p.hipX += 0.4 * wobble(w * 0.45, 11);
  return p;
}

// The camera, on top of the follow pan (screen units, so it runs on through the loop's seam).
export const viewAt = bakeCamera(T, (s) => figureBox(solve({ ...body(s), ...hands(s) }, G), { hat: 38, dx: -camera(s) }), { wrap: true, minW: 470 });

// The sheaf's flight: from his hands at TOSS to SHEAF_AT at LAND, turning as it goes.
const THROW = (() => {
  const s = solve({ ...body(TOSS), ...hands(TOSS) }, G), [x0, y0] = inHand(s, 'n', 6, 2), tau = LAND - TOSS;
  return { x0, y0, vx: (SHEAF_AT[0] - x0) / tau, vy: (SHEAF_AT[1] - y0 - 310 * tau * tau) / tau };
})();
// Where his palm is when he blows the chaff off it, and how his fist is turned when it first closes on the stalks.
const PALM = inHand(solve({ ...body(1.74), ...hands(1.74) }, G), 'n', 10, -3);
const FIST0 = solve({ ...body(GATHER1), ...hands(GATHER1) }, G).handF;
const flight = (t) => { const s = t - TOSS; return { x: THROW.x0 + THROW.vx * s, y: THROW.y0 + THROW.vy * s + 310 * s * s, a: -40 * s / (LAND - TOSS) }; };

export function frame(t, w = t) {
  const p = pose(t, w);
  const sk = solve(p, G);
  const a = solve({ ...body(t - 1 / 30), ...hands(t - 1 / 30) }, G), b = solve({ ...body(t - 2 / 30), ...hands(t - 2 / 30) }, G);
  const shift = (u) => (u < 0 ? -PAN : 0);
  const vx = (sk.atlas[0] - (a.atlas[0] + shift(t - 1 / 30))) * 30, ax = (sk.atlas[0] - 2 * (a.atlas[0] + shift(t - 1 / 30)) + (b.atlas[0] + shift(t - 2 / 30))) * 900;
  const hv = (sk.hip[0] - (a.hip[0] + shift(t - 1 / 30))) * 30;
  const extra = {
    blink: Math.max(blink(w, 4), t > 1.72 && t < 1.88 ? 1 - Math.abs(t - 1.8) / 0.08 : 0), // eyes shut against the chaff
    tail: clamp(vx * 0.11 + ax * 0.0035 + 4 * wobble(w * 1.4, 7), -40, 45),
    tailBend: clamp(ax * 0.002, -8, 8) + 2 * wobble(w * 2.1, 8),
    drag: clamp(hv * 0.06, -7, 7),
  };
  // How far the stalks of each fistful lean in to his hand, and where his fist is.
  const fist = inHand(sk, 'f', 8, 0);
  const lean = [[GATHER1, CUT1], [GATHER2, CUT2]].map(([g, c]) => (t < c ? smooth((t - (g - 0.4)) / 0.45) : 0));
  // The fistfuls in his left hand from the cut until he lays them down, upright as they stood and turning with his hand.
  const fistAngle = sk.handF - FIST0;
  const held = t >= CUT1 && t < LAID ? { x: fist[0], y: fist[1], a: fistAngle, n: t >= CUT2 ? 2 : 1 } : null;
  // The laid bundle, then the tied sheaf: lying where he put it, lifted by the band, flying back, lying on the row.
  let bundle = null;
  if (t >= LAID && t < LIFT) bundle = { x: BUNDLE_AT[0], y: BUNDLE_AT[1], a: 0, tied: smooth((t - 10.3) / 0.9), knot: t >= 12.4 };
  else if (t >= LIFT && t < TOSS) { const g = inHand(sk, 'n', 6, 2), k = smooth((t - LIFT) / 0.2); bundle = { x: lerp(BUNDLE_AT[0], g[0], k), y: lerp(BUNDLE_AT[1], g[1] + 8, k), a: clamp(-hv * 0.05, -12, 12), tied: 1, knot: true }; }
  else if (t >= TOSS && t < LAND) { const f = flight(t); bundle = { ...f, tied: 1, knot: true }; }
  else if (t >= LAND) bundle = { x: SHEAF_AT[0], y: SHEAF_AT[1] - Math.max(0, Math.sin((t - LAND) * 18) * 3 * Math.exp(-(t - LAND) * 8)), a: -40, tied: 1, knot: true };
  // The band being pulled and wrapped: it shows from the pull until it is round the bundle.
  const band = t >= 9.85 && t < 11.2 ? smooth((t - 10.3) / 0.9) : t >= 11.2 && t < LIFT ? 1 : 0;
  // The sickle: lying where he left it last loop, in his hand from SICKLE_UP to SICKLE_DOWN, then lying again.
  const grip = inHand(sk, 'n', 4, 0);
  const sickle = t >= SICKLE_UP && t < SICKLE_DOWN ? { x: grip[0], y: grip[1], a: grip[2] - 8, held: true }
    : { x: t < SICKLE_UP ? SICKLE_REST[0] : SICKLE_REST[0] + PAN, y: SICKLE_REST[1], a: -6, held: false };
  // The ear he checks: on its stalk, then pinched, then rubbed to grain and chaff.
  const ear = t >= PLUCK && t < 1.64 ? (() => { const g = inHand(sk, 'f', 9, 0); return { x: g[0], y: g[1], a: g[2] }; })() : null;
  const grains = t >= 1.64 && t < 2.4 ? inHand(sk, 'n', 8, -2) : null;
  const chaff = [];
  if (t > 1.74 && t < 2.6) for (let j = 0; j < 12; j++) {
    const s = t - 1.74 - hash(j) * 0.08;
    if (s <= 0) continue;
    chaff.push({ x: PALM[0] + (60 + hash(j + 3) * 90) * s + 8 * Math.sin(s * 9 + j), y: PALM[1] - (40 + hash(j + 7) * 50) * s + 30 * s * s, o: Math.max(0, 1 - s / 0.8), r: 1 + hash(j + 1) * 1.3 });
  }
  // Dust and straw where the stalks are cut, the sheaf lands and his feet step.
  const puffs = [[CUT1, E0 + 2], [CUT2, E0 + 24], [LAND, SHEAF_AT[0] + 10], [15.35, 532], [15.85, 566]].map(([at, x]) => ({ x, k: (t - at) / 0.6 })).filter((d) => d.k > 0 && d.k < 1);
  return { t, w, sk, extra, cam: camera(t), view: viewAt(t), edge: edgeAt(t), lean, fist, held, bundle, band, sickle, ear, grains, chaff, puffs, plucked: t >= PLUCK };
}
