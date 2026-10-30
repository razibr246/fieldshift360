// Transplanting T. Aman in the monsoon: he patches a leak in the bund with mud scooped from the field (so the water
// stays in), picks up a bundle of seedlings lying in the water and unties it, wades backward to the row, and plants
// hill after hill — two or three seedlings pinched from the bundle and pushed a few centimetres into the mud — bent
// nearly flat at the hips, as transplanting is done. He firms the mud round the last hills, straightens with a hand on
// his aching back to look down the row, and wipes his brow. The next loop is the next stretch, so it dissolves.
import { play, sheet, solve, inHand } from './rig.js';
import { blink, clamp, hash, lerp, ring, smooth, wobble } from '../../engine/motion.js';
import { bakeCamera, figureBox } from './camera.js';

export const SHIFT = -150; // the field is drawn this far left of its own coordinates, to sit in the middle of the frame

export const T = 18;
export const G = 268; // his soles, sunk in the mud
export const MUD = 258;
export const WATER = 248;
export const SEAM = 0.7;
export const GAP = [710, 247]; // the leak in the bund
export const BUNDLE = [684, 250]; // the seedling bundle lying in the water
export const HILLS = [[7.9, 646], [9.25, 620], [10.6, 594], [11.95, 568]]; // when and where each hill goes in
export const PRESSES = [[12.45, 568], [13.05, 594]];
const SCOOP = 0.75, SLAPS = [1.82, 2.22], PICK = 3.85;

const STAND = G - 100;
const BENT = G - 70; // knees bent, back nearly flat: the transplanting stoop

const B = sheet(T);
// A step backward in the mud: the heel comes up first as the foot pulls free, then it sets down flat behind.
const back = (side, t0, t1, from, to, lift = 5) => {
  const [X, L, R] = [`${side}fX`, `${side}fLift`, `${side}fRoll`];
  B.key(t0, { [X]: from, [L]: 0, [R]: 0 });
  B.key(t0 + (t1 - t0) * 0.3, { [X]: lerp(from, to, 0.15), [L]: lift * 0.6, [R]: 14 });
  B.key(t0 + (t1 - t0) * 0.65, { [X]: lerp(from, to, 0.7), [L]: lift, [R]: 2 });
  B.key(t1, { [X]: to, [L]: 0, [R]: 0 });
};
B.key(0, { hipX: 648, hipY: STAND, lumbar: 8, chest: 16, neck: 22, head: 30, eye: 1, eyeY: 0.6, brow: 0.3, mouth: 'calm', ffX: 630, ffLift: 0, ffRoll: 0, nfX: 664, nfLift: 0, nfRoll: 0 });
B.key(0.12, { hipX: 648, hipY: STAND, lumbar: 8, chest: 16, neck: 22, head: 30 });
// Patch the bund: stoop, scoop mud from under the water, press it into the leak, pat it down twice.
B.key(0.45, { hipX: 651, hipY: G - 76, lumbar: 54, chest: 88, neck: 92, head: 70, eyeY: 1 });
B.key(SCOOP, { hipX: 652, hipY: G - 70, lumbar: 60, chest: 98, neck: 100, head: 76 });
B.key(1.0, { hipX: 652, hipY: G - 72, lumbar: 58, chest: 94 });
B.key(1.4, { hipX: 656, hipY: G - 74, lumbar: 55, chest: 89, neck: 92, head: 66, eye: 1, eyeY: 0.6 });
for (const s of SLAPS) {
  B.key(s - 0.14, { hipX: 656, hipY: G - 76, lumbar: 53, chest: 85, mouth: 'effort' });
  B.key(s, { hipX: 657, hipY: G - 73, lumbar: 56, chest: 91 });
}
B.key(2.7, { hipX: 650, hipY: STAND + 2, lumbar: 14, chest: 22, neck: 26, head: 30, mouth: 'calm', brow: 0.6 });
B.key(3.1, { hipX: 649, hipY: STAND + 1, lumbar: 12, chest: 20, neck: 24, head: 34, eye: 0.6, eyeY: 1 });
// Take up the seedling bundle from the water, stand, untie it.
B.key(PICK, { hipX: 651, hipY: G - 71, lumbar: 60, chest: 96, neck: 98, head: 74 });
B.key(4.2, { hipX: 649, hipY: STAND + 1, lumbar: 12, chest: 22, neck: 30, head: 46, eye: 0.3, eyeY: 1 });
B.key(4.7, { hipX: 648, hipY: STAND + 1, lumbar: 12, chest: 22, neck: 30, head: 44 });
// Wade backward to the row: slow steps, the feet sucking out of the mud.
back('n', 4.86, 5.3, 664, 626, 8);
back('f', 5.36, 5.8, 630, 592, 8);
for (const [t, x] of [[5.1, 638], [5.3, 628], [5.6, 616], [5.85, 610]]) B.key(t, { hipX: x, hipY: STAND + 2 });
B.key(5.4, { lumbar: 10, chest: 18, head: 36, eye: 0.8, eyeY: 0.8 });
B.key(6.6, { hipX: 606, hipY: BENT, lumbar: 62, chest: 98, neck: 102, head: 80, eyeY: 1 });
// Plant: each hill, then a shuffle back one hill's width (the planted seedlings stay in front of him).
for (const [i, [rel, x]] of HILLS.entries()) {
  const hip = x - 40;
  B.key(rel - 0.95, { hipX: hip, hipY: BENT, lumbar: 62, chest: 98 });
  B.key(rel - 0.15, { hipX: hip + 2, hipY: BENT - 1, lumbar: 61, chest: 96 });
  B.key(rel, { hipX: hip + 3, hipY: BENT + 1.5, lumbar: 64, chest: 101, mouth: i === 3 ? 'calm' : 'effort' });
  B.key(rel + 0.12, { mouth: 'calm' });
  if (i < 3) {
    back('n', rel + 0.08, rel + 0.36, x - 20, x - 46, 4);
    back('f', rel + 0.32, rel + 0.6, x - 54, x - 80, 4);
    B.key(rel + 0.5, { hipX: hip - 24, hipY: BENT });
  }
}
// Firm the mud round the last two hills with the fingers.
for (const [p] of PRESSES) { B.key(p - 0.2, { hipX: 529, chest: 98 }); B.key(p, { hipX: 530, hipY: BENT + 1, chest: 101 }); }
B.key(13.6, { hipX: 528, hipY: BENT, lumbar: 62, chest: 98, neck: 102, head: 80 });
// Straighten, slowly, a hand to the small of the back; lean back; then look down the row and nod.
B.key(14.4, { hipX: 528, hipY: BENT, lumbar: 60, chest: 94, neck: 98, head: 78 });
B.key(15.3, { hipX: 527, hipY: STAND + 2, lumbar: 10, chest: 10, neck: 12, head: 8, eye: 0.4, eyeY: -0.4, mouth: 'effort' });
B.key(15.75, { hipX: 525, hipY: STAND + 1, lumbar: -8, chest: -14, neck: -16, head: -18, eyeY: -1, brow: 0.8, mouth: 'open' });
B.key(16.2, { hipX: 527, hipY: STAND + 1, lumbar: 4, chest: 8, neck: 16, head: 30, eye: 1, eyeY: 0.7, mouth: 'calm', brow: 0.2 });
B.key(16.5, { head: 36 });
B.key(16.75, { head: 30, mouth: 'smile' });
// Wipe the brow with the back of the wrist.
B.key(17.3, { hipX: 527, hipY: STAND + 1, lumbar: 4, chest: 8, neck: 10, head: 4, eye: 0.6, eyeY: -0.2 });
B.key(T, { hipX: 527, hipY: STAND + 1, head: 6 });
const LAG = { head: -0.07, neck: -0.04, chest: 0.025, eye: -0.15, eyeY: -0.15 };
export const body = play(B, { lag: LAG, wrap: false });

// ---- hands ----
const H = sheet(T);
const at = (t, dx, dy) => { const b = body(t); return [b.hipX + dx, b.hipY + dy]; };
const hand = (side, t, [x, y], extra = {}) => H.key(t, { [`${side}hX`]: x, [`${side}hY`]: y, ...extra });
const solved = (t) => solve({ ...body(t), nhX: 0, nhY: 0, fhX: 0, fhY: 0 }, G);
// Where he holds the bundle while planting: low in front of his knees, the forearm on the thigh.
const holdAt = (t) => { const s = solved(t); return [s.kneeN[0] + 8, s.kneeN[1] - 4]; };
hand('n', 0, at(0, 6, 14), { nhShape: 'relax', nhWrist: 6 });
hand('f', 0, at(0, 0, 14), { fhShape: 'relax', fhWrist: 8 });
hand('n', SCOOP - 0.2, [690, 244], { nhShape: 'cup', nhWrist: 70 });
hand('f', SCOOP - 0.2, [683, 245], { fhShape: 'cup', fhWrist: 70 });
hand('n', SCOOP, [692, 256], {});
hand('f', SCOOP, [686, 256], {});
hand('n', 1.0, [690, 251], { nhWrist: 60 });
hand('f', 1.0, [684, 251], { fhWrist: 60 });
hand('n', 1.45, [704, 243], { nhWrist: 40 });
hand('f', 1.45, [698, 245], { fhWrist: 40 });
hand('f', 1.62, [698, 240], { fhShape: 'flat', fhWrist: 20 });
for (const s of SLAPS) {
  hand('n', s - 0.16, [GAP[0] - 2, GAP[1] - 13], { nhShape: 'flat', nhWrist: 30 });
  hand('n', s, [GAP[0] - 1, GAP[1] - 4], { nhWrist: 46 });
}
hand('f', 2.3, [698, 240]);
hand('n', 2.55, at(2.55, 18, -2), { nhShape: 'flat', nhWrist: 20 });
hand('f', 2.6, at(2.6, 10, 8), { fhShape: 'relax', fhWrist: 10 });
// muddy hands wiped down the front of the thigh
hand('n', 2.85, at(2.85, 16, 8), { nhShape: 'flat', nhWrist: 70 });
hand('n', 3.15, at(3.15, 16, 30), { nhWrist: 76 });
hand('n', 3.4, at(3.4, 8, 16), { nhShape: 'relax', nhWrist: 6 });
hand('f', 3.4, at(3.4, 6, 12));
hand('f', PICK - 0.2, [BUNDLE[0] - 4, BUNDLE[1] - 8], { fhShape: 'open', fhWrist: 60 });
hand('f', PICK, [BUNDLE[0] - 3, BUNDLE[1] - 4], { fhShape: 'grip', fhWrist: 60 });
hand('n', PICK, at(PICK, 20, 22), { nhWrist: 20 });
hand('f', 4.2, at(4.2, 22, 0), { fhWrist: 10 });
// untie: the free hand works the binding at the top of the bundle
for (const [t, dx, dy] of [[4.3, 26, -14], [4.45, 30, -10], [4.6, 25, -15], [4.75, 32, -6]]) hand('n', t, at(t, dx, dy), { nhShape: 'pinch', nhWrist: -10 });
hand('n', 5.0, at(5.0, 12, 12), { nhShape: 'relax', nhWrist: 6 });
for (const t of [4.75, 5.3, 5.8]) hand('f', t, at(t, 18, 2), { fhWrist: 12 });
hand('n', 5.6, at(5.6, 10, 14));
hand('f', 6.6, holdAt(6.6), { fhWrist: 70 });
hand('n', 6.6, holdAt(6.6).map((v, i) => v + [8, -6][i]), { nhShape: 'relax', nhWrist: 70 });
// each hill: pinch two or three seedlings from the bundle, draw them out, down to the spot, push in, let go
for (const [rel, x] of HILLS) {
  const b0 = holdAt(rel - 0.95), b1 = holdAt(rel + 0.35);
  hand('f', rel - 0.95, b0); hand('f', rel + 0.35, b1);
  hand('n', rel - 0.95, [b0[0] + 6, b0[1] - 6], { nhShape: 'pinch', nhWrist: 70 });
  hand('n', rel - 0.7, [b0[0] + 14, b0[1] - 3], { nhWrist: 64 });
  hand('n', rel - 0.32, [x - 7, MUD - 18], { nhWrist: 80 });
  hand('n', rel - 0.14, [x - 7, MUD - 21], { nhWrist: 84 });
  hand('n', rel, [x - 6, MUD - 5], { nhShape: 'pinch', nhWrist: 88 });
  hand('n', rel + 0.05, [x - 6, MUD - 5], { nhShape: 'open' });
  hand('n', rel + 0.3, [x - 12, MUD - 18], { nhWrist: 70 });
}
for (const [p, x] of PRESSES) {
  hand('n', p - 0.2, [x - 4, MUD - 16], { nhShape: 'flat', nhWrist: 84 });
  hand('n', p, [x - 4, MUD - 4], { nhWrist: 90 });
  hand('n', p + 0.2, [x - 4, MUD - 12]);
}
hand('f', 13.0, holdAt(13.0)); hand('f', 14.4, holdAt(14.4));
hand('n', 13.6, holdAt(13.6).map((v, i) => v + [8, -6][i]), { nhShape: 'relax', nhWrist: 70 });
hand('n', 14.4, holdAt(14.4).map((v, i) => v + [8, -6][i]));
// up with a hand on the small of the back, the bundle hanging at his side
const backOf = (t) => { const s = solved(t); const a = (s.lumbar * Math.PI) / 180; return [s.waist[0] - Math.cos(a) * 16, s.waist[1] - Math.sin(a) * 16 + 6]; };
hand('n', 15.0, backOf(15.0), { nhShape: 'flat', nhWrist: 100 });
for (const t of [15.75, 16.1]) hand('n', t, backOf(t));
hand('n', 16.42, at(16.42, 8, 12), { nhShape: 'relax', nhWrist: 6 });
hand('f', 15.3, at(15.3, 16, 4), { fhWrist: 14 });
hand('f', T, at(T, 16, 4));
// the back of the wrist across the brow, then down
const browOf = (t) => { const s = solved(t); return [s.atlas[0] + 16, s.atlas[1] - 26]; };
// the hand comes up in front of him, well clear of the shoulder, then turns to bring the wrist across the brow
hand('n', 16.62, at(16.62, 34, -18), { nhWrist: -30 });
hand('n', 16.84, [browOf(16.84)[0] + 22, browOf(16.84)[1] + 14], { nhWrist: -110 });
hand('n', 16.98, browOf(16.98), { nhShape: 'relax', nhWrist: -150 });
hand('n', 17.26, [browOf(17.26)[0] - 12, browOf(17.26)[1] + 1], { nhWrist: -170 });
// and down again in front of him, clear of the shoulder
hand('n', 17.5, [browOf(17.5)[0] + 18, browOf(17.5)[1] + 22], { nhWrist: -90 });
hand('n', 17.75, at(17.75, 30, -6), { nhWrist: -10 });
hand('n', T, at(T, 12, 12), { nhWrist: 6 });
const hands = play(H, { wrap: false });

export function pose(t, w = t) {
  const p = { ...body(t), ...hands(t) };
  p.chest += 0.9 * Math.sin((w / (t > 14.4 && t < 16 ? 2.4 : 3.5)) * Math.PI * 2);
  p.head += 1.1 * wobble(w * 0.7, 4);
  p.hipX += 0.4 * wobble(w * 0.45, 9);
  return p;
}

// Water running off his hands (and the bundle's roots) after they come up out of the field: where each drop leaves.
const DRIPS = [
  ...[1.06, 1.18, 1.32].flatMap((at, i) => { const s = solve({ ...body(at), ...hands(at) }, G); return [[at, s.wristN[0] + 4, s.wristN[1] + 6 + i], [at + 0.05, s.wristF[0] + 3, s.wristF[1] + 6]]; }),
  ...[4.0, 4.14, 4.3].map((at) => { const s = solve({ ...body(at), ...hands(at) }, G), [x, y] = inHand(s, 'f', 9, 0); return [at, x + 1, y + 12]; }),
  ...HILLS.flatMap(([rel]) => [0.3, 0.44].map((d) => { const s = solve({ ...body(rel + d), ...hands(rel + d) }, G); return [rel + d, s.wristN[0] + 8, s.wristN[1] + 4]; })),
];
const DRIP_RINGS = DRIPS.map(([at, x, y]) => [at + Math.sqrt((2 * Math.max(0, WATER - y)) / 620), x, 0.35]);

// The camera: close on him while he stoops over the row, wider when he stands (screen units: the field is shifted).
export const viewAt = bakeCamera(T, (s) => figureBox(solve({ ...body(s), ...hands(s) }, G), { hat: 34, dx: SHIFT }), { minW: 430 });

// Water thrown up where a hand or a seedling goes in hard.
const SPLASHES = [[SCOOP, 689], [SLAPS[0], GAP[0] - 3], [SLAPS[1], GAP[0] - 3], ...HILLS.map(([rel, x]) => [rel, x - 5])];

const ripples = (t, list) => list.map(([at, x, size = 1]) => ({ x, k: (t - at) / 1.1, size })).filter((r) => r.k > 0 && r.k < 1);

export function frame(t, w = t) {
  const p = pose(t, w);
  const sk = solve(p, G);
  const a = solve({ ...body(t - 1 / 30), ...hands(t - 1 / 30) }, G), b = solve({ ...body(t - 2 / 30), ...hands(t - 2 / 30) }, G);
  const vx = (sk.atlas[0] - a.atlas[0]) * 30, ax = (sk.atlas[0] - 2 * a.atlas[0] + b.atlas[0]) * 900;
  const extra = {
    blink: blink(w, 3),
    tail: clamp(vx * 0.1 + ax * 0.003 + 4 * wobble(w * 1.3, 6), -40, 45),
    tailBend: 2 * wobble(w * 2, 7),
    drag: 0,
  };
  // the mud carried between his hands, and the patch it makes in the bund
  const mud = t > SCOOP + 0.12 && t < 1.55 ? { x: (sk.wristN[0] + sk.wristF[0]) / 2 + 6, y: (sk.wristN[1] + sk.wristF[1]) / 2 + 4 } : null;
  const patch = smooth((t - 1.5) / 0.15) * (1 - 0) + SLAPS.reduce((s, at) => s + 0.12 * smooth((t - at) / 0.1), 0);
  const leak = 1 - smooth((t - 1.45) / 0.5);
  // the bundle: lying in the water, then in his left hand, thinning as he plants
  const taken = HILLS.filter(([rel]) => t >= rel - 0.7).length;
  // Held across the palm, roots forward (where his other hand pulls seedlings from) and blades back toward him; it
  // turns into his grip over a quarter second as he lifts it out of the water.
  const lying = { x: BUNDLE[0], y: BUNDLE[1], a: -70, s: 1 };
  const bundle = t < PICK ? lying : (() => {
    const [x, y, ang] = inHand(sk, 'f', 9, 0), k = smooth((t - PICK) / 0.25);
    return { x: lerp(lying.x, x, k), y: lerp(lying.y, y, k), a: lerp(lying.a, ang - 145, k), s: 1 - taken * 0.06 };
  })();
  const tie = t > 4.62 ? (() => { const s = t - 4.62; return s < 0.6 ? { x: bundle.x + 6 + s * 12, y: Math.min(WATER - 1, bundle.y - 18 + 300 * s * s), o: 1 - smooth((s - 0.45) / 0.15) } : null; })() : null;
  // seedlings between his fingers from the pinch until they are pushed in; planted hills spring upright
  const pinchOf = HILLS.find(([rel]) => t >= rel - 0.7 && t < rel + 0.05);
  const sprig = pinchOf ? (() => { const [x, y, ang] = inHand(sk, 'n', 11, 1); return { x, y, a: ang + 90 }; })() : null;
  const hills = HILLS.map(([rel, x], i) => {
    if (t < rel + 0.05) return null;
    const firm = PRESSES.find(([, px]) => px === x);
    return { x, a: ring(t - rel - 0.05, 9 + hash(i) * 6, 2.6, 0.22) + (firm ? ring(t - firm[0], -5, 3, 0.3) : 0) + 1.5 * wobble(w * 1.1, i + 2) };
  });
  // rings on the water: steps, hands going in, seedlings planted, mud pressed
  const ring_ = ripples(t, [
    [SCOOP, 689, 1.2], [SLAPS[0], GAP[0] - 4, 0.6], [SLAPS[1], GAP[0] - 4, 0.6], [PICK, BUNDLE[0], 0.9],
    [5.3, 626 - 8, 0.8], [5.8, 592 - 8, 0.8],
    ...HILLS.flatMap(([rel, x], i) => [[rel, x], ...(i < 3 ? [[rel + 0.24, x - 16, 0.6], [rel + 0.38, x - 50, 0.6]] : [])]),
    ...PRESSES.map(([at, x]) => [at, x, 0.7]),
    ...DRIP_RINGS,
  ]);
  const drips = DRIPS.map(([at, x, y]) => { const s = t - at; return s > 0 && y + 310 * s * s < WATER ? { x, y: y + 310 * s * s } : null; }).filter(Boolean);
  const splash = [];
  for (const [i, [at, x]] of SPLASHES.entries()) {
    const s = t - at;
    if (s < 0 || s > 0.5) continue;
    for (let j = 0; j < 5; j++) {
      const vx = (hash(i * 11 + j) - 0.5) * 70, vy = -40 - hash(i * 7 + j + 3) * 55, y = WATER - 1 + vy * s + 310 * s * s;
      if (y < WATER) splash.push({ x: x + vx * s, y, o: 1 - s / 0.5 });
    }
  }
  return { t, w, sk, extra, view: viewAt(t), mud, patch: clamp(patch, 0, 1), leak, bundle, tie, sprig, hills, ripples: ring_, drips, splash };
}
