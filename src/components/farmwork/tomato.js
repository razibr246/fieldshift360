// Tomato harvest, one plant per loop: he walks the row with his basket, sets it down, lifts a leaf to look, reaches
// in, steadies the truss with one hand and twists the ripe fruit off with the other (the stalk snaps above the calyx
// and the branch springs back), looks at it, lowers it into the basket, and lifts the basket with his legs to walk on.
// The camera follows him down the row, PAN units a loop, so the loop has no seam: each loop is the next plant.
// Times are seconds in a T-second loop; the stages (engine/farmTimeline.js) split the same loop.
import { play, sheet, stride, solve, inHand } from './rig.js';
import { blink, clamp, panCurve, ring, smooth, wobble, lerp } from '../../engine/motion.js';
import { bakeCamera, figureBox } from './camera.js';

export const T = 16;
export const G = 262; // where his feet stand
export const PAN = 300; // one plant spacing; the farmer and the camera move this far each loop
export const PLANT_X = 789; // this loop's plant (the next is PAN further on)
export const PLANT_Y = 247;
export const FRUIT = [750, 185]; // the ripe tomato, hanging on the truss on his side of the plant
export const TRUSS = [756, 163]; // where its stalk joins the truss
export const VINE = [762, 157]; // where his other hand steadies the truss
export const LEAF = { pivot: [785, 157], tip: [747, 168] }; // the leaf over the fruit, which he lifts to look underneath
export const BASKET = [724, 210.5]; // the basket's handle top while it stands on the ground, where his hand sets it down
const HOLD = [721, 204]; // his wrist when his fingers are round that handle
export const GRAB = 7.15, SNAP = 8.35, RELEASE = 13.15, SET_DOWN = 2.95, PICK_UP = 14.75, LEAF_ON = 4.0, LEAF_OFF = 4.62;

const STAND = G - 100;
const SQUAT = G - 64;
const cam = panCurve({ peak: 1.25 / T, width: 0.042, rest: 0.1 });
export const camera = (t) => PAN * cam(t / T);

// ---- the body: hips, spine, head, feet and face ----
const B = sheet(T);
// Walk to the plant: four strides and a closing step, the hips bobbing low after each heel strike.
B.key(0, { hipX: 390, hipY: STAND, lumbar: 3, chest: 8, neck: 12, head: 6, eye: 0.6, eyeY: 0, brow: 0, mouth: 'calm' });
stride(B, 'f', { t0: 0.12, t1: 0.62, from: 368, to: 478 });
stride(B, 'n', { t0: 0.64, t1: 1.14, from: 402, to: 552 });
stride(B, 'f', { t0: 1.16, t1: 1.66, from: 478, to: 628 });
stride(B, 'n', { t0: 1.68, t1: 2.18, from: 552, to: 702 });
stride(B, 'f', { t0: 2.24, t1: 2.56, from: 628, to: 668, lift: 5 });
for (const [t, x, y] of [[0.3, 404, STAND - 0.5], [0.62, 438, STAND + 3.6], [0.9, 478, STAND - 0.6], [1.14, 515, STAND + 3.6], [1.42, 552, STAND - 0.6],
  [1.66, 590, STAND + 3.6], [1.94, 628, STAND - 0.6], [2.18, 664, STAND + 3.2], [2.42, 681, STAND + 2]]) B.key(t, { hipX: x, hipY: y });
B.key(0.25, { lumbar: 5, chest: 11, head: 7 });
B.key(1.4, { lumbar: 4, chest: 9, head: 5 });
B.key(2.3, { lumbar: 4, chest: 10, head: 9, eye: 0.4, eyeY: 0.6 });
// Squat to set the basket down beside his front foot, then rise and look the plant over.
B.key(2.62, { hipX: 686, hipY: STAND + 6, lumbar: 10, chest: 20, neck: 26, head: 24 });
B.key(2.95, { hipX: 683, hipY: SQUAT, lumbar: 30, chest: 46, neck: 52, head: 44, eyeY: 1, mouth: 'effort' });
B.key(3.12, { hipX: 683, hipY: SQUAT + 1, lumbar: 31, chest: 47, neck: 53, head: 45 });
B.key(3.5, { hipX: 686, hipY: STAND + 12, lumbar: 16, chest: 26, neck: 30, head: 20, eye: 0.8, eyeY: -0.6, mouth: 'calm' });
B.key(3.85, { hipX: 689, hipY: STAND + 1, lumbar: 7, chest: 15, neck: 20, head: 16 });
B.key(4.25, { hipX: 690, hipY: STAND + 1.5, lumbar: 8, chest: 17, neck: 22, head: 22, eye: 0.9, eyeY: 0.2, brow: 0.2 });
B.key(4.6, { hipX: 690, hipY: STAND + 1, lumbar: 8, chest: 16, neck: 20, head: 15, eye: 1, eyeY: 0.4, brow: 1 });
// Reach: a small pull back first (anticipation), then the weight rolls onto the front foot and he leans in.
B.key(5.05, { hipX: 688, hipY: STAND + 1, lumbar: 6, chest: 13, neck: 18, head: 18, brow: 0.6 });
B.key(5.5, { hipX: 687, hipY: STAND + 1.5, lumbar: 6, chest: 12, neck: 19, head: 22 });
B.key(6.4, { hipX: 697, hipY: STAND + 3, lumbar: 13, chest: 30, neck: 37, head: 36, eye: 1, eyeY: 1, brow: 0.3 });
B.key(7.15, { hipX: 701, hipY: STAND + 4, lumbar: 15, chest: 35, neck: 41, head: 38 });
// Pick: twist, the stalk snaps, he looks at the fruit (a small smile), then turns to the basket.
B.key(8.2, { hipX: 700, hipY: STAND + 3, lumbar: 13, chest: 31, neck: 37, head: 31, mouth: 'effort' });
B.key(8.42, { hipX: 695, hipY: STAND + 2, lumbar: 10, chest: 25, neck: 31, head: 27, brow: 0.8, mouth: 'calm' });
B.key(9.2, { hipX: 693, hipY: STAND + 1.5, lumbar: 9, chest: 21, neck: 27, head: 30, eye: 0.3, eyeY: 0.9, brow: 0.4, mouth: 'smile' });
B.key(9.85, { hipX: 693, hipY: STAND + 1.5, lumbar: 9, chest: 21, neck: 27, head: 31, eyeY: 1 });
B.key(10.15, { eye: 0.7, eyeY: 1.2, mouth: 'calm', brow: 0 });
B.key(10.4, { hipX: 691, hipY: STAND + 6, lumbar: 13, chest: 27, neck: 36, head: 42 });
B.key(11.5, { hipX: 684, hipY: SQUAT + 2, lumbar: 33, chest: 52, neck: 58, head: 50 });
// Place: lower it gently, let go, a nod; then take the handle.
B.key(12.4, { hipX: 683, hipY: SQUAT + 3, lumbar: 35, chest: 56, neck: 62, head: 54 });
B.key(13.1, { hipX: 683, hipY: SQUAT + 4, lumbar: 36, chest: 58, neck: 64, head: 56 });
B.key(13.6, { hipX: 683, hipY: SQUAT + 3, lumbar: 34, chest: 54, neck: 60, head: 50, mouth: 'smile' });
B.key(14.3, { hipX: 683, hipY: SQUAT + 2, lumbar: 32, chest: 50, neck: 56, head: 48, mouth: 'calm' });
// Lift with the legs: dip, rise, the head comes up first and finds the next plant.
B.key(14.7, { hipX: 683, hipY: SQUAT + 4, lumbar: 33, chest: 51, neck: 57, head: 46, mouth: 'effort', eyeY: -0.2 });
B.key(15.3, { hipX: 686, hipY: STAND + 8, lumbar: 10, chest: 18, neck: 18, head: 12, eye: 0.6, eyeY: -0.3 });
B.key(15.7, { hipX: 688, hipY: STAND + 0.5, lumbar: 3, chest: 8, neck: 12, head: 6, mouth: 'calm', eyeY: 0 });
// Feet stand still between the walk and the next loop's first step (keyed at the top of the loop).
// In the squats the back heel comes up onto the ball of the foot and the back knee drops: a half-kneel.
B.key(2.8, { nfX: 702, nfLift: 0, nfRoll: 0, ffX: 668, ffLift: 0, ffRoll: 0 });
B.key(2.95, { ffRoll: 24 });
B.key(3.15, { ffRoll: 24 });
B.key(3.6, { ffRoll: 0 });
B.key(5.6, { ffRoll: 0 });
B.key(6.6, { ffX: 668, ffRoll: 9, ffLift: 0 });
B.key(8.3, { ffRoll: 9 });
B.key(8.9, { ffRoll: 0 });
B.key(10.4, { ffRoll: 0 });
B.key(11.5, { ffRoll: 24 });
B.key(14.7, { ffRoll: 24 });
B.key(15.35, { ffRoll: 0 });
B.key(15.9, { ffX: 668, ffRoll: 0, ffLift: 0, nfX: 702 });

const ADVANCE = { hipX: PAN, nfX: PAN, ffX: PAN, nhX: PAN, fhX: PAN };
const LAG = { head: -0.07, neck: -0.04, chest: 0.025, eye: -0.15, eyeY: -0.15 };
export const body = play(B, { lag: LAG, advance: ADVANCE });

// ---- the hands, keyed against the body so a carried basket rides with the hips ----
const H = sheet(T);
const at = (t, dx, dy) => { const b = body(t); return [b.hipX + dx, b.hipY + dy]; };
const hand = (side, t, [x, y], extra = {}) => H.key(t, { [`${side}hX`]: x, [`${side}hY`]: y, ...extra });
// A hand resting on top of the front thigh, two thirds of the way to the knee (where it lands when he squats).
const thighAt = (t) => { const s = solve({ ...body(t), nhX: 0, nhY: 0, fhX: 0, fhY: 0 }, G); return [s.hipN[0] + (s.kneeN[0] - s.hipN[0]) * 0.62 - 2, s.hipN[1] + (s.kneeN[1] - s.hipN[1]) * 0.62 - 9]; };
// Walking, the right hand carries the basket (swaying a little with each step); the left swings against the legs.
for (let t = 0; t <= 2.62; t += 0.13) hand('n', t, at(t, 9 + 2.5 * Math.sin(((t - 0.2) / 1.04) * Math.PI * 2), 17), { nhWrist: 4, nhShape: 'grip' });
for (const [t, dx, dy] of [[0, 2, 15], [0.66, -13, 13], [1.18, 15, 12], [1.7, -13, 13], [2.22, 13, 13], [2.5, 4, 15]]) hand('f', t, at(t, dx, dy), { fhWrist: 8, fhShape: 'relax' });
// Down to the ground with the basket, let go, a hand on the knee for the squat.
hand('n', 2.92, HOLD, { nhWrist: 30 });
hand('n', 3.04, HOLD, { nhShape: 'open' });
hand('n', 3.45, at(3.45, 15, 6), { nhWrist: 10 });
hand('n', 3.95, at(3.95, 8, 16), { nhShape: 'relax', nhWrist: 4 });
hand('f', 2.8, thighAt(2.95), { fhShape: 'flat', fhWrist: 0 });
hand('f', 3.12, thighAt(3.12));
// Inspect: lift a leaf with the left hand, look, let it spring back.
hand('f', 3.55, at(3.55, 14, 0), { fhShape: 'relax' });
hand('f', 3.98, LEAF.tip, { fhShape: 'open', fhWrist: -20 });
hand('f', 4.3, [LEAF.tip[0] + 2, LEAF.tip[1] - 10], { fhShape: 'pinch' });
hand('f', LEAF_OFF, [LEAF.tip[0] + 3, LEAF.tip[1] - 11], { fhShape: 'open' });
hand('f', 5.1, [742, 154], { fhShape: 'relax', fhWrist: -10 });
for (const t of [4.4, 4.96]) hand('n', t, at(t, 8, 17), { nhWrist: 4 });
// Reach: pull back a touch, then up and forward in an arc, opening the hand as it nears the fruit.
hand('n', 5.4, at(5.4, 3, 19), { nhWrist: 0 });
hand('n', 6.0, [712, 166], { nhShape: 'relax', nhWrist: -6 });
hand('n', 6.55, [731, 173], { nhShape: 'open', nhWrist: -12 });
hand('n', 7.05, [FRUIT[0] - 9, FRUIT[1] - 3], { nhWrist: -16 });
hand('n', GRAB, [FRUIT[0] - 9, FRUIT[1] - 3], { nhShape: 'grip' });
hand('f', 6.1, [VINE[0] - 10, VINE[1] - 2], { fhShape: 'open', fhWrist: -24 });
hand('f', 6.65, [VINE[0] - 6, VINE[1]], { fhShape: 'grip', fhWrist: -24 });
// Pick: twist and draw it back until the stalk gives, a small recoil, then bring it close to look.
hand('n', 7.6, [FRUIT[0] - 10, FRUIT[1] - 4], { nhWrist: -20 });
hand('n', 8.3, [FRUIT[0] - 14, FRUIT[1] - 8], { nhWrist: -52 });
hand('n', 8.46, [FRUIT[0] - 22, FRUIT[1] - 13], { nhWrist: -46 });
hand('n', 8.7, [FRUIT[0] - 21, FRUIT[1] - 12], { nhWrist: -40 });
hand('n', 9.25, [711, 149], { nhWrist: -16 });
hand('n', 9.85, [710, 147], { nhWrist: -12 });
hand('f', 8.5, [VINE[0] - 6, VINE[1]], { fhShape: 'grip' });
hand('f', 8.66, [VINE[0] - 9, VINE[1] + 4], { fhShape: 'open' });
hand('f', 9.4, at(9.4, 5, 15), { fhShape: 'relax', fhWrist: 8 });
// Carry it down in an arc to just over the basket, the left hand on the knee as he squats.
hand('n', 10.6, [716, 171], { nhWrist: 4 });
hand('n', 11.3, [724, 199], { nhWrist: 24 });
hand('n', 11.95, [729, 214], { nhWrist: 34 });
hand('f', 10.3, at(10.3, 6, 14));
hand('f', 11.5, thighAt(11.5), { fhShape: 'flat', fhWrist: 0 });
for (const t of [12.4, 13.1, 14.3, 14.7]) hand('f', t, thighAt(t));
// Place it slowly, open the hand, lift away, take the handle.
hand('n', 12.45, [730, 217], { nhWrist: 38 });
hand('n', 12.85, [731, 221]);
hand('n', RELEASE, [731, 223], { nhShape: 'grip' });
hand('n', RELEASE + 0.05, [731, 223], { nhShape: 'open', nhWrist: 38 });
hand('n', 13.55, [728, 211], { nhWrist: 24 });
hand('n', 14.0, [723, 206], { nhShape: 'relax' });
hand('n', 14.5, HOLD, { nhWrist: 30, nhShape: 'open' });
hand('n', 14.62, HOLD, { nhShape: 'grip' });
hand('n', PICK_UP, HOLD);
// Lift: the basket comes up a beat after the body (it is heavy), and settles at his side for the next walk.
hand('n', 15.25, at(15.25, 10, 20), { nhWrist: 10 });
hand('n', 15.75, at(15.75, 9, 17), { nhWrist: 4 });
hand('f', 15.1, at(15.1, 8, 10), { fhShape: 'relax', fhWrist: 8 });
hand('f', 15.7, at(15.7, 2, 15));
const hands = play(H, { advance: ADVANCE });

// How far the branch is drawn toward the farmer by the fruit in his hand (degrees), and how far it is at the snap.
const bend = (fruit) => clamp((FRUIT[0] - fruit[0]) * 0.5 + (FRUIT[1] - fruit[1]) * 0.3, -2, 9);
const SNAP_BEND = bend(inHand(solve({ ...body(SNAP - 0.01), ...hands(SNAP - 0.01) }, G), 'n', 10, 1.5));
// How far the leaf is lifted (degrees) at the moment he lets it go.
const LEAF_LET_GO = (() => {
  const h = inHand(solve({ ...body(LEAF_OFF), ...hands(LEAF_OFF) }, G), 'f', 12, 0);
  const rest = Math.atan2(LEAF.tip[1] - LEAF.pivot[1], LEAF.tip[0] - LEAF.pivot[0]);
  return ((Math.atan2(h[1] - LEAF.pivot[1], h[0] - LEAF.pivot[0]) - rest) * 180) / Math.PI;
})();

// The camera: him framed close or wide as he works, on top of the follow pan (screen units, so it runs on through the
// loop's seam like everything else).
export const viewAt = bakeCamera(T, (s) => figureBox(solve({ ...body(s), ...hands(s) }, G), { hat: 39, dx: -camera(s) }), { wrap: true, minW: 480 });

// pose(t, w): the keyed pose at loop time t, with the life that is not keyed — breathing and a slow sway — read
// from the running clock w, so a long hold never freezes and no two loops look exactly alike.
export function pose(t, w = t) {
  const p = { ...body(t), ...hands(t) };
  p.chest += 0.9 * Math.sin((w / 3.7) * Math.PI * 2);
  p.head += 1.1 * wobble(w * 0.7, 2);
  p.hipX += 0.5 * wobble(w * 0.45, 7);
  return p;
}

// Everything else in the frame: camera, cloth, the plant, the fruit and the basket.
export function frame(t, w = t) {
  const p = pose(t, w);
  const sk = solve(p, G);
  const dt = 1 / 30;
  const a = solve({ ...body(t - dt), ...hands(t - dt) }, G), b = solve({ ...body(t - 2 * dt), ...hands(t - 2 * dt) }, G);
  const shift = (u) => (u < 0 ? -PAN : 0); // samples before the loop's start are in the last loop's coordinates
  const vx = (sk.atlas[0] - (a.atlas[0] + shift(t - dt))) / dt;
  const ax = (sk.atlas[0] - 2 * (a.atlas[0] + shift(t - dt)) + (b.atlas[0] + shift(t - 2 * dt))) / (dt * dt);
  const hv = (sk.hip[0] - (a.hip[0] + shift(t - dt))) / dt;
  const extra = {
    blink: Math.max(blink(w, 1), t > SNAP && t < SNAP + 0.16 ? 1 - Math.abs(t - SNAP - 0.08) / 0.08 : 0),
    tail: clamp(vx * 0.11 + ax * 0.0035 + 4 * wobble(w * 1.4, 5), -40, 45),
    tailBend: clamp(ax * 0.002, -8, 8) + 2 * wobble(w * 2.1, 9),
    drag: clamp(hv * 0.06, -7, 7),
  };
  // The fruit: on the plant, then in the hand (the fingers close round it over a quarter second), then in the basket.
  const grip = inHand(sk, 'n', 10, 1.5);
  let fruit = null, fruitAngle = 0;
  if (t >= GRAB - 0.25 && t < RELEASE) {
    const k = smooth((t - (GRAB - 0.25)) / 0.25);
    fruit = [lerp(FRUIT[0], grip[0], k), lerp(FRUIT[1], grip[1], k)];
    fruitAngle = t > GRAB ? (p.nhWrist ?? 0) + 16 : 0;
  }
  // The branch bends toward the pull until the stalk snaps, then rings back.
  const branch = t < SNAP ? (fruit ? bend(fruit) : 0) : ring(t - SNAP, SNAP_BEND, 2.3, 0.14);
  // The leaf he lifts follows his fingers, then rings back when let go.
  let leaf = 0;
  if (t >= LEAF_ON && t < LEAF_OFF) {
    const g = inHand(sk, 'f', 12, 0);
    const k = smooth((t - LEAF_ON) / 0.15);
    const rest = Math.atan2(LEAF.tip[1] - LEAF.pivot[1], LEAF.tip[0] - LEAF.pivot[0]);
    const now = Math.atan2(g[1] - LEAF.pivot[1], g[0] - LEAF.pivot[0]);
    leaf = k * ((now - rest) * 180) / Math.PI;
  } else if (t >= LEAF_OFF) leaf = ring(t - LEAF_OFF, LEAF_LET_GO, 2.8, 0.2);
  // The basket hangs from his hand from PICK_UP to SET_DOWN (through the loop's top), and swings a little.
  // Handed over across 0.15 s, so the last few units between his fingers and the handle read as the basket settling.
  const handle = inHand(sk, 'n', 7, 1.5);
  const inHandK = t >= PICK_UP ? smooth((t - PICK_UP) / 0.15) : t < SET_DOWN ? 1 - smooth((t - (SET_DOWN - 0.15)) / 0.15) : 0;
  const swing = clamp(-hv * 0.035 - ax * 0.0015, -12, 12) * smooth(Math.min(t < SET_DOWN ? (SET_DOWN - t) / 0.3 : (t - PICK_UP) / 0.35, 1));
  const basket = { x: lerp(BASKET[0], handle[0], inHandK), y: lerp(BASKET[1], handle[1], inHandK), a: swing * inHandK };
  // The tomato placed last loop sinks into the pile as the basket is carried; this loop's lands on top at RELEASE.
  const top = t >= RELEASE ? { y: Math.min(0, -3 + (t - RELEASE) * 30), on: true } : t < 2.4 ? { y: 6 * smooth((t - 0.3) / 2), on: true } : { on: false };
  // Dust where a heel strikes the dry soil.
  const dust = [[0.62, 478], [1.14, 552], [1.66, 628], [2.18, 702], [2.56, 668]].map(([at, x]) => ({ x: x - 12, k: (t - at) / 0.55 })).filter((d) => d.k > 0 && d.k < 1);
  return { t, w, sk, extra, cam: camera(t), view: viewAt(t), fruit, fruitAngle, branch, leaf, basket, top, dust, picked: t >= GRAB };
}
