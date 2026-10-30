// The farmer of the farm-work scenes, drawn as joints that a skeleton (rig.js) moves every frame. React draws the parts
// once; paintFarmer() then only sets attributes, so a frame costs a few dozen attribute writes.
// Drawing: each arm and leg is one tapered shape with a single outline (outlines first, fills over them, so an elbow
// or a knee has no seam), with a calf and a hamstring on the side they really are; the spine is a curve, so a bent
// back rounds instead of folding at one hinge. The sun stands high on the right in every field, so whichever side of a
// limb or of the body is turned away from it is shaded — the back when he stands, the belly when he stoops. The lungi
// drapes from the knees and trails when he moves, a gamchha's tail swings after the head, the eyes blink.
import { useId } from 'react';
import { lerp } from '../../engine/motion';

// Outfits: the season's clothes and headwear (a gamchha against winter sun, a palm-leaf mathal in Falgun heat, a
// headband and a lungi tucked up for the flooded Aman field).
export const LOOKS = {
  tomato: { skin: '#a8693f', hair: '#2b2420', stubble: '#6d5f55', shirt: '#e8b54f', shirtLine: '#a8792c', sleeve: true,
    lungi: '#2f6f73', check: '#8fc2bd', hat: 'gamcha', hatColor: '#f4efe2', hatLine: '#c4473a', mustache: '#3b302a', sandals: true },
  mungbean: { skin: '#9a5f3c', hair: '#1f1a17', vest: '#f3efe6', vestLine: '#cfc6b5', lungi: '#4e7b3c', check: '#b8d39a',
    hat: 'mathal', hatColor: '#d9b46a', hatLine: '#a07a37' },
  aman: { skin: '#8f5636', hair: '#1c1714', vest: '#c9d6dc', vestLine: '#8ea3ad', lungi: '#34557e', check: '#9db7d8', tuck: true,
    hat: 'band', hatColor: '#c23d34', hatLine: '#8c2621', mustache: '#231c18' },
  wheat: { skin: '#9d6340', hair: '#221b17', shirt: '#e4e8e1', shirtLine: '#aab1a6', sleeve: true, lungi: '#7a3833', check: '#d6a08f',
    hat: 'gamcha', hatColor: '#eef3e4', hatLine: '#3d7a46', mustache: '#2a221d', stubble: '#5f5650' },
  sesame: { skin: '#a46a45', hair: '#1d1814', vest: '#efe2c0', vestLine: '#c6b385', lungi: '#4a4f86', check: '#aab0dc',
    hat: 'band', hatColor: '#2f7fa8', hatLine: '#1d5b78' },
};

const shade = (hex, k) => `#${hex.slice(1).match(/../g).map((h) => Math.max(0, Math.min(255, Math.round(parseInt(h, 16) * k))).toString(16).padStart(2, '0')).join('')}`;

// Hands in wrist space (fingers along +x), with a line or two for the fingers and knuckles.
const HANDS = {
  relax: ['M-1.5 -4.6C3.5 -5.8 9.5 -5.2 13 -3C15.6 -1.4 15.4 1.8 13 3.2C10 4.8 5.6 5.4 2.2 5C-.4 4.6-2 2.8-2 .6Z', 'M5 2.6C8 2.8 10.6 2.2 12.4 1'],
  open: ['M-1.5 -4.4C4 -5.6 11 -5.4 17.5 -3.6C19.8 -2.8 19.8 .4 17.6 1.4C12 3.4 6 5 1.4 5C-.8 4.8-2 2.6-2 .4ZM2.5 -4.2C4.5 -8.6 8.6 -10 10.4 -8.2C9 -6.8 7.4 -5.4 6.4 -4Z', 'M5 1.8C9.6 1.4 13.4 .6 17.2 -.6'],
  grip: ['M-1.5 -5C3.5 -6.6 9.6 -6.4 11.6 -3C13 .2 11.4 4.4 7.6 5.4C4 6.2 .4 5.4-1.6 2.6Z', 'M7.6 -4.8C9.8 -2.6 10.2 .8 8.6 3.4'],
  pinch: ['M-1.5 -4.6C3.5 -5.8 9.6 -5.6 12.8 -3.4C14.8 -2 14.4 .4 12.6 .6L10 .8C8.6 3.4 4.8 5.4 1.6 5C-.6 4.6-2 2.6-2 .4Z', 'M5.6 2.8C8 2.2 9.4 1.4 10.2 .8'],
  cup: ['M-1.5 -3.4C3 -1.4 9 -.6 13.2 -3C15.2 -1.4 14.6 2.6 11.6 4.6C7.4 6.8 2.2 6-1.2 3.4C-2.2 1.6-2.2-.6-1.5 -3.4Z', 'M3 1.6C7 3.2 10.6 2.8 12.6 .8'],
  flat: ['M-1.5 -4C4 -4.6 11 -4.2 17 -2.6C19 -2 19 1 17 1.6C11 3 5 3.6 .6 3.6C-1.2 3.4-2 1.6-1.5 -4Z', 'M3 1C9 .6 13 0 17 -1'],
};
const MOUTHS = {
  calm: 'M13.6 -4.5Q15.5 -3.9 17.2 -4.7',
  smile: 'M13.2 -4.9Q15.4 -2.6 17.6 -4.6',
  effort: 'M13.8 -4.3L17.3 -4.6',
  open: 'M14 -4.8Q15.6 -2.9 17.2 -4.8Q15.6 -4.1 14 -4.8Z',
};
// Foot in ankle space, flat: heel under the ankle, ball 15 units ahead, sole 8 below.
const FOOT = 'M-5.5 1.5C-7.5 4.5-6.5 8.6-2.5 9L21 9C25.5 9 27.2 7 25.6 5.4C23.6 3.6 18 3 13.5 1.6C9.5 .3 5.5-1.9 2.5-3.9C-.8-3.6-3.8-1.4-5.5 1.5Z';
// Half-widths of each limb at its two joints, and how much its muscle swells.
const W = { upper: [6.6, 5.2, 0.7], fore: [5.2, 3.8, 0.9], thigh: [9.8, 6.4, 1.2], shin: [6.3, 4, 2.6], neck: [5.6, 5] };
const LIGHT = [0.55, -0.83]; // toward the sun: high on the right

const f1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${f1(p[0])} ${f1(p[1])}`;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const unit = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// A smooth closed outline through points (Catmull-Rom turned into cubic Béziers).
function loop(ps) {
  const n = ps.length;
  let d = `M${pt(ps[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = ps[(i - 1 + n) % n], p1 = ps[i], p2 = ps[(i + 1) % n], p3 = ps[(i + 2) % n];
    d += `C${pt(add(p1, mul([p2[0] - p0[0], p2[1] - p0[1]], 1 / 6)))} ${pt(add(p2, mul([p1[0] - p3[0], p1[1] - p3[1]], 1 / 6)))} ${pt(p2)}`;
  }
  return `${d}Z`;
}

// A tapered limb from joint a (half-width ra) to joint b (rb), round at both ends; it swells by `bulge` a third of the
// way down on the side facing `toward` (the calf faces the hip, the hamstring the ankle).
function limb(a, b, ra, rb, bulge = 0, toward = null) {
  const u = unit([b[0] - a[0], b[1] - a[1]]), n = [-u[1], u[0]];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const onN = toward ? dot([toward[0] - a[0], toward[1] - a[1]], n) >= 0 : true;
  const m = add(a, mul(u, len * 0.36)), rm = lerp(ra, rb, 0.36);
  const aN = add(a, mul(n, ra)), bN = add(b, mul(n, rb)), aP = add(a, mul(n, -ra)), bP = add(b, mul(n, -rb));
  const mN = add(m, mul(n, rm + (onN ? bulge : 0))), mP = add(m, mul(n, -(rm + (onN ? 0 : bulge))));
  const cN = [2 * mN[0] - (aN[0] + bN[0]) / 2, 2 * mN[1] - (aN[1] + bN[1]) / 2];
  const cP = [2 * mP[0] - (aP[0] + bP[0]) / 2, 2 * mP[1] - (aP[1] + bP[1]) / 2];
  return `M${pt(aN)}Q${pt(cN)} ${pt(bN)}A${f1(rb)} ${f1(rb)} 0 0 0 ${pt(bP)}Q${pt(cP)} ${pt(aP)}A${f1(ra)} ${f1(ra)} 0 0 0 ${pt(aN)}Z`;
}

// The shaded strip along the side of a limb turned away from the sun, and how strongly it shows (it fades out as the
// limb turns to point at the sun, so it never jumps sides).
function limbShade(a, b, ra, rb) {
  const u = unit([b[0] - a[0], b[1] - a[1]]), n = [-u[1], u[0]];
  const k = dot(n, LIGHT), s = k > 0 ? -1 : 1;
  return { d: limb(add(a, mul(n, s * ra * 0.46)), add(b, mul(n, s * rb * 0.46)), ra * 0.5, rb * 0.5), o: Math.min(1, Math.abs(k) * 2.2) };
}

// The spine as one curve through hip, waist and nape: a point at s (0 hip … 1 nape), its upward tangent and the
// normal toward the front of the body.
function spine(sk, s) {
  const [h, w, n] = [sk.hip, sk.waist, sk.nape];
  const c = [2 * w[0] - (h[0] + n[0]) / 2, 2 * w[1] - (h[1] + n[1]) / 2];
  const u = 1 - s;
  const p = [u * u * h[0] + 2 * u * s * c[0] + s * s * n[0], u * u * h[1] + 2 * u * s * c[1] + s * s * n[1]];
  const t = unit([2 * u * (c[0] - h[0]) + 2 * s * (n[0] - c[0]), 2 * u * (c[1] - h[1]) + 2 * s * (n[1] - c[1])]);
  return { p, t, n: [-t[1], t[0]] };
}

// Body outline from stations along the spine: [s, depth behind, depth in front].
const SHIRT = [[0.03, 15, 14], [0.27, 13, 14.4], [0.5, 12.6, 15.2], [0.72, 14.2, 17], [0.88, 13.6, 14.6], [0.99, 9.4, 8.6]];
const BARE = [[0.03, 14.5, 13.6], [0.27, 12.6, 14], [0.5, 12.2, 14.8], [0.72, 13.8, 16.6], [0.88, 13.2, 14.2], [0.99, 9, 8.2]];
const VEST = [[0.03, 15.2, 14.2], [0.27, 13.2, 14.6], [0.5, 12.8, 15.4], [0.7, 14, 17], [0.8, 12.4, 11], [0.9, 7.6, 4]];
function body(sk, stations, top = true) {
  const back = [], front = [];
  for (const [s, b, f] of stations) { const g = spine(sk, s); back.push(add(g.p, mul(g.n, -b))); front.push(add(g.p, mul(g.n, f))); }
  const end = spine(sk, 1);
  return loop([...back, ...(top ? [add(end.p, mul(end.t, 3.6))] : []), ...front.reverse()]);
}
// The shade on the body: a band down its back when he stands, down his chest and belly when he bends toward the
// ground, cross-faded through the lean where both face the sun about equally.
function bodyShade(sk, stations) {
  const back = [], backIn = [], front = [], frontIn = [];
  for (const [s, b, f] of stations.slice(0, -1)) {
    const g = spine(sk, s);
    back.push(add(g.p, mul(g.n, -b + 0.6))); backIn.push(add(g.p, mul(g.n, -b * 0.28)));
    front.push(add(g.p, mul(g.n, f - 0.6))); frontIn.push(add(g.p, mul(g.n, f * 0.3)));
  }
  const k = dot(spine(sk, 0.7).n, LIGHT); // > 0: the chest faces the sun
  return { back: loop([...back, ...backIn.reverse()]), front: loop([...front, ...frontIn.reverse()]), ob: clamp01(0.5 + k * 1.6), of: clamp01(0.5 - k * 1.6) };
}

function lungiShape(sk, look, drag) {
  const Wst = spine(sk, look.tuck ? 0.36 : 0.38);
  const wb = add(Wst.p, mul(Wst.n, -12.6)), wf = add(Wst.p, mul(Wst.n, 13.8));
  const frame = (h, k) => { const u = unit([k[0] - h[0], k[1] - h[1]]); return { u, n: [u[1], -u[0]] }; };
  const N = frame(sk.hipN, sk.kneeN), F = frame(sk.hipF, sk.kneeF);
  const reach = look.tuck ? 0.62 : 1.02;
  const kn = mix(sk.hipN, sk.kneeN, reach), kf = mix(sk.hipF, sk.kneeF, reach);
  const hang = (fr) => unit([fr.u[0] * 0.45 - drag * 0.02, fr.u[1] * 0.45 + 0.55]);
  const drop = look.tuck ? 3 : 8;
  const hn = add(add(kn, mul(N.n, 9.6)), mul(hang(N), drop));
  const hf = add(add(kf, mul(F.n, -9.6)), mul(hang(F), drop));
  const mid = [(hn[0] + hf[0]) / 2 - drag * 0.5, (hn[1] + hf[1]) / 2 + 2.4];
  const frontHip = add(sk.hipN, mul(N.n, 12.2)), backHip = add(sk.hipF, mul(F.n, -13.6));
  // Folds: from the knot toward the front knee, and down the middle where the cloth hangs between the knees.
  const knee = add(kn, mul(N.n, 4));
  const folds = `M${pt(wf)}Q${pt(add(frontHip, mul(N.n, -5)))} ${pt(mix(knee, hn, 0.6))}M${pt(Wst.p)}Q${pt(mix(sk.hipN, sk.hipF, 0.5))} ${pt(mix(mid, hn, 0.25))}`;
  return { d: loop([wb, wf, frontHip, hn, mid, hf, backHip]), band: `M${pt(wb)}L${pt(wf)}`, folds, knot: wf };
}

// The cloth tail of a gamchha knot, in head space: it hangs from the knot along `angle` (degrees from straight down,
// already turned into head space) and curls more toward its tip.
function tail(angle, bend, len = 17) {
  const k = [-13.5, -20.5];
  let a = angle, p = k;
  const c = [k], w = [3.2, 2.9, 2.4, 1.6];
  for (let i = 0; i < 3; i++) { a += bend; p = add(p, mul([-Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)], len / 3)); c.push(p); }
  const side = c.map((q, i) => { const nx = i < 3 ? unit([c[i + 1][1] - q[1], q[0] - c[i + 1][0]]) : unit([q[1] - c[i - 1][1], c[i - 1][0] - q[0]]); return [add(q, mul(nx, w[i])), add(q, mul(nx, -w[i]))]; });
  return loop([...side.map((s) => s[0]), ...side.map((s) => s[1]).reverse()]);
}

export default function Farmer({ look, slots = {} }) {
  const uid = useId().replace(/:/g, '');
  const L = look;
  const skinF = shade(L.skin, 0.84), line = shade(L.skin, 0.6), lineF = shade(L.skin, 0.52);
  const dark = shade(L.skin, 0.72), darkF = shade(L.skin, 0.62);
  const cloth = L.vest ?? L.shirt, clothLine = L.vestLine ?? L.shirtLine;
  // One limb: its outline (the limb and its hand or foot), then its fill and shade over that, so the joints are seamless.
  const arm = (s, skin, ln, dk, shirt, shirtLn) => (
    <>
      <path data-k={`${s}ArmLine`} fill={ln} stroke={ln} strokeWidth="2.6" strokeLinejoin="round" />
      <path data-k={`${s}ArmFill`} fill={skin} />
      <path data-k={`${s}ArmShade`} fill={dk} />
      {L.sleeve && <path data-k={`${s}Sleeve`} fill={shirt} stroke={shirtLn} strokeWidth="1.4" strokeLinejoin="round" />}
      {L.sleeve && <path data-k={`${s}SleeveShade`} fill={shade(shirt, 0.84)} />}
    </>
  );
  const hand = (s, skin, ln) => (
    <g data-k={`${s}HandG`}>
      <path data-k={`${s}Hand`} fill={skin} stroke={ln} strokeWidth="1.3" strokeLinejoin="round" />
      <path data-k={`${s}HandLine`} fill="none" stroke={ln} strokeWidth=".9" strokeLinecap="round" opacity=".7" />
    </g>
  );
  const leg = (s, skin, ln, dk) => (
    <>
      <path data-k={`${s}LegLine`} fill={ln} stroke={ln} strokeWidth="2.6" strokeLinejoin="round" />
      <path data-k={`${s}FootLine`} d={FOOT} fill={ln} stroke={ln} strokeWidth="2.6" strokeLinejoin="round" />
      <path data-k={`${s}LegFill`} fill={skin} />
      <path data-k={`${s}LegShade`} fill={dk} />
      <path data-k={`${s}Foot`} d={FOOT} fill={skin} />
      <path data-k={`${s}Toes`} d="M15 6.6C17 7.6 19.6 7.8 22 7.2" fill="none" stroke={ln} strokeWidth=".9" strokeLinecap="round" opacity=".7" />
      {L.sandals && <path data-k={`${s}Sole`} d="M-6.5 9.6L26 9.6" stroke="#4b3a2c" strokeWidth="2.6" strokeLinecap="round" />}
    </>
  );
  return (
    <g data-farmer={uid}>
      <defs>
        <pattern id={`lungi-${uid}`} data-k="check" width="9" height="9" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill={L.lungi} />
          <path d="M0 .8H9M.8 0V9" stroke={L.check} strokeWidth="1.3" opacity=".55" />
          <path d="M0 5H9M5 0V9" stroke={shade(L.lungi, 0.7)} strokeWidth="1" opacity=".5" />
        </pattern>
      </defs>
      <ellipse data-k="shadow" rx="30" ry="5.5" fill="#2c241b" opacity=".22" />
      {slots.back}
      {/* far side, a step darker for depth */}
      {arm('f', skinF, lineF, darkF, shade(L.shirt ?? '#888888', 0.82), shade(L.shirtLine ?? '#666666', 0.8))}
      {hand('f', skinF, lineF)}
      {slots.farHand}
      {leg('f', skinF, lineF, darkF)}
      {leg('n', L.skin, line, dark)}
      {/* lungi, then the shirt or vest over its waist */}
      <path data-k="lungi" fill={`url(#lungi-${uid})`} stroke={shade(L.lungi, 0.62)} strokeWidth="1.6" strokeLinejoin="round" />
      <path data-k="folds" fill="none" stroke={shade(L.lungi, 0.55)} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
      <path data-k="band" stroke={shade(L.lungi, 0.7)} strokeWidth="4.2" strokeLinecap="round" />
      {L.vest && <path data-k="skinBody" fill={L.skin} stroke={line} strokeWidth="1.5" />}
      <path data-k="body" fill={cloth} stroke={clothLine} strokeWidth="1.6" strokeLinejoin="round" />
      <path data-k="bodyShadeB" fill={shade(cloth, 0.8)} />
      <path data-k="bodyShadeF" fill={shade(cloth, 0.8)} />
      <path data-k="seam" fill="none" stroke={clothLine} strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
      <path data-k="neckLine" fill={line} stroke={line} strokeWidth="2.4" />
      <path data-k="neck" fill={L.skin} />
      <path data-k="neckShade" fill={dark} opacity=".55" />
      {/* head, drawn facing right around the top of the neck */}
      <g data-k="head">
        {L.hat === 'band' && <path d="M-11.5 -16C-12.5 -26.5-5 -32.5 3 -32C11.5 -31.5 16.5 -25.5 16.5 -19C10 -24-2 -24.5-11.5 -16Z" fill={L.hair} />}
        <path d="M-11.6 -13.6C-13.6 -8.8-11 -4.8-6.4 -3.4L-5 -10Z" fill={L.hair} />
        <path d="M-11.5 -16C-12.5 -26.5-5 -32.5 3 -32C11.5 -31.5 16.5 -25.5 16.5 -19L17.6 -15.2C20.4 -12.6 21 -10.3 19 -9.2C18.6 -7.2 17.7 -5.6 16.3 -4.6C15.6 -1.2 13.3 1.2 9.6 1.4C4.3 1.6.3 -.6-3.6 -3.8C-7.6 -7-11 -10-11.5 -16Z"
          fill={L.skin} stroke={line} strokeWidth="1.4" strokeLinejoin="round" />
        {/* the back of the skull and under the jaw are away from the sun */}
        <path d="M-11.5 -16C-12.6 -24.5-7.5 -30.5-1 -31.8C-6.6 -27.6-8.6 -21.4-7.6 -15C-6.8 -10.2-4.8 -6.6-2.4 -4.3C-7.4 -6.4-11 -10.4-11.5 -16Z" fill={dark} opacity=".5" />
        <path d="M1.6 -1.4C5 .9 9.6 1.6 13 .4C11.6 1.4 9.6 1.5 7.6 1.3C5.4 1 3.4 .2 1.6 -1.4Z" fill={dark} opacity=".6" />
        {L.stubble && <path d="M4 -1.2C8 1.2 12.8 1.4 15.6 -1.6C16.2 -3.4 15 -3.6 13.4 -2.6C10.6 -1.2 7.4 -1.2 4 -3.6Z" fill={L.stubble} opacity=".55" />}
        <path d="M-3.8 -17.8C-6.8 -18.6-8 -14.8-6.6 -12.6C-5.6 -11-3.6 -11.3-2.8 -12.4Z" fill={L.skin} stroke={line} strokeWidth="1.1" />
        <path d="M-4.6 -16.4C-5.8 -15.6-5.6 -13.8-4.4 -13.2" fill="none" stroke={line} strokeWidth=".8" strokeLinecap="round" />
        <path d="M17.6 -13.6C18.6 -12.2 18.6 -10.9 17.5 -10.3" fill="none" stroke={line} strokeWidth="1.1" strokeLinecap="round" />
        <path d="M12.4 -11.6C13.6 -9.8 15.6 -9.2 17.2 -9.6" fill="none" stroke={line} strokeWidth=".8" strokeLinecap="round" opacity=".6" />
        <g data-k="eye">
          <path d="M9.4 -16.6C10.5 -18 12.9 -18 13.8 -16.6C12.7 -15.5 10.5 -15.4 9.4 -16.6Z" fill="#f6efe6" />
          <circle data-k="pupil" cx="12" cy="-16.7" r="1.3" fill="#1e1814" />
        </g>
        <path d="M9.2 -16.8C10.4 -18.3 13 -18.3 14 -16.8" fill="none" stroke={line} strokeWidth="1.1" strokeLinecap="round" />
        <path data-k="brow" d="M8.6 -20.6Q11.6 -22.4 15.2 -20.8" fill="none" stroke={L.hair} strokeWidth="1.9" strokeLinecap="round" />
        {L.mustache && <path d="M13.2 -7.4C15.3 -8.8 17.9 -8.6 19.1 -7.2C17.6 -6.1 15.3 -6 13.2 -7.4Z" fill={L.mustache} />}
        <path data-k="mouth" fill="none" stroke="#6a382c" strokeWidth="1.3" strokeLinecap="round" />
        {L.hat === 'gamcha' && (
          <>
            <path data-k="tail" fill={L.hatColor} stroke={L.hatLine} strokeWidth="1.1" />
            <path d="M-13.6 -17.6C-14.4 -30.6-3.6 -37.4 5 -36.6C14.4 -35.6 19.4 -29 18.8 -20.6C12.4 -24.8 1.4 -25-13.6 -17.6Z" fill={L.hatColor} stroke="#cfc7b4" strokeWidth="1.2" />
            <path d="M-13.6 -17.6C-14.4 -30.6-3.6 -37.4 5 -36.6C-2.6 -33.6-7.6 -27.6-8 -19.6C-10 -19-11.8 -18.4-13.6 -17.6Z" fill="#d9d1bd" opacity=".7" />
            <path d="M-13.8 -18.4C-2.6 -24.4 8.4 -25 18.8 -21.2" fill="none" stroke={L.hatLine} strokeWidth="1.5" strokeDasharray="3 2.2" />
            <path d="M-9 -27.6C-1.6 -31.6 8 -32 14.6 -28.6" fill="none" stroke={L.hatLine} strokeWidth="1.1" opacity=".55" />
            <circle cx="-13.4" cy="-21" r="3.6" fill={L.hatColor} stroke="#cfc7b4" strokeWidth="1.1" />
          </>
        )}
        {L.hat === 'band' && (
          <>
            <path data-k="tail" fill={L.hatColor} stroke={L.hatLine} strokeWidth="1.1" />
            <path d="M-12.4 -19.6C-2.6 -26 8.6 -26.6 17.4 -22.4L17.2 -18.4C8.6 -22.2-2.4 -21.8-12 -15.4Z" fill={L.hatColor} stroke={L.hatLine} strokeWidth="1.1" />
            <path d="M-12.2 -17.4C-3 -23.4 8 -24 17.3 -20.4" fill="none" stroke={L.hatLine} strokeWidth=".9" opacity=".6" />
            <circle cx="-13" cy="-19.4" r="3.4" fill={L.hatColor} stroke={L.hatLine} strokeWidth="1.1" />
          </>
        )}
        {L.hat === 'mathal' && (
          <>
            <ellipse cx="4.5" cy="-30.4" rx="27" ry="5.4" fill="#2a2018" opacity=".18" />
            <path d="M-11 -24C-4 -27.6 9 -28 17.6 -24.4C10 -25.6-2 -25.4-11 -24Z" fill="#2a2018" opacity=".22" />
            <path d="M-27 -30.6C-17 -37.6 25 -37.6 36 -30.6C26 -26.2-17 -26.2-27 -30.6Z" fill={L.hatColor} stroke={L.hatLine} strokeWidth="1.4" />
            <path d="M-9.6 -34.4L4.6 -49.4L19 -34.4C10 -32.8-.6 -32.8-9.6 -34.4Z" fill={shade(L.hatColor, 1.06)} stroke={L.hatLine} strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M-9.6 -34.4L4.6 -49.4L2 -33.4C-2.6 -33.4-6.4 -33.8-9.6 -34.4Z" fill={shade(L.hatColor, 0.86)} opacity=".7" />
            <path d="M-20 -31.4C-8 -34.2 20 -34.2 30 -31.4M-1.6 -36.6L4.6 -45.4M10.6 -36.6L4.6 -45.4" fill="none" stroke={L.hatLine} strokeWidth="1" opacity=".6" />
          </>
        )}
      </g>
      {slots.mid}
      {/* near arm, in front of everything */}
      {arm('n', L.skin, line, dark, L.shirt ?? '#888888', L.shirtLine ?? '#666666')}
      {slots.nearHand}
      {hand('n', L.skin, line)}
      {slots.front}
    </g>
  );
}

// paintFarmer(root, look) → paint(sk, extra): moves the drawn figure to a solved skeleton. `extra` carries what the
// skeleton does not: the face (blink), the gamchha tail swing and the lungi drag.
export function farmerPainter(root, look) {
  const q = (k) => root.querySelector(`[data-k="${k}"]`);
  const el = {};
  for (const s of ['n', 'f']) for (const k of ['ArmLine', 'ArmFill', 'ArmShade', 'Sleeve', 'SleeveShade', 'HandG', 'Hand', 'HandLine', 'LegLine', 'FootLine', 'LegFill', 'LegShade', 'Foot', 'Toes', 'Sole']) el[s + k] = q(s + k);
  for (const k of ['shadow', 'lungi', 'folds', 'band', 'skinBody', 'body', 'bodyShadeB', 'bodyShadeF', 'seam', 'neckLine', 'neck', 'neckShade', 'head', 'eye', 'pupil', 'brow', 'mouth', 'tail', 'check']) el[k] = q(k);
  const set = (node, k, v) => node?.setAttribute(k, v);
  const place = (node, p, a = 0, s = 1) => set(node, 'transform', `translate(${pt(p)}) rotate(${f1(a)})${s === 1 ? '' : ` scale(${s})`}`);
  const shapes = { n: null, f: null, mouth: null };
  const W2 = (w, k = 1) => [w[0] * k, w[1] * k, (w[2] ?? 0) * k];
  return (sk, x = {}) => {
    const p = sk.p;
    const gy = sk.ground, mid = (sk.ankleN[0] + sk.ankleF[0]) / 2 + 5;
    const lowness = clamp01((sk.hip[1] - (gy - 101)) / 50);
    set(el.shadow, 'cx', f1(mid)); set(el.shadow, 'cy', f1(gy + 2));
    set(el.shadow, 'rx', f1(26 + Math.abs(sk.ankleN[0] - sk.ankleF[0]) / 2 + lowness * 10));
    set(el.shadow, 'opacity', (0.18 + lowness * 0.1).toFixed(2));
    for (const s of ['n', 'f']) {
      const k = s === 'f' ? 0.95 : 1;
      const [sh, el1, wr] = s === 'n' ? [sk.shN, sk.elbowN, sk.wristN] : [sk.shF, sk.elbowF, sk.wristF];
      const [hp, kn, an] = s === 'n' ? [sk.hipN, sk.kneeN, sk.ankleN] : [sk.hipF, sk.kneeF, sk.ankleF];
      const [u0, u1, ub] = W2(W.upper, k), [f0, ff, fb] = W2(W.fore, k), [t0, t1, tb] = W2(W.thigh, k), [s0, s1, sb] = W2(W.shin, k);
      // arm: the biceps swells toward the hand, the forearm toward the thumb side
      const armD = limb(sh, el1, u0, u1, ub, wr) + limb(el1, wr, f0, ff, fb, sh);
      set(el[`${s}ArmLine`], 'd', armD); set(el[`${s}ArmFill`], 'd', armD);
      const as1 = limbShade(sh, el1, u0, u1), as2 = limbShade(el1, wr, f0, ff);
      set(el[`${s}ArmShade`], 'd', as1.d + as2.d); set(el[`${s}ArmShade`], 'opacity', (0.55 * Math.max(as1.o, as2.o)).toFixed(2));
      if (el[`${s}Sleeve`]) {
        const end = mix(sh, el1, 0.58);
        set(el[`${s}Sleeve`], 'd', limb(sh, end, u0 + 2.6, u1 + 2.6));
        const ss = limbShade(sh, end, u0 + 2.6, u1 + 2.6);
        set(el[`${s}SleeveShade`], 'd', ss.d); set(el[`${s}SleeveShade`], 'opacity', (0.7 * ss.o).toFixed(2));
      }
      const shape = (s === 'n' ? p.nhShape : p.fhShape) ?? 'relax';
      if (shapes[s] !== shape) { const h = HANDS[shape] ?? HANDS.relax; set(el[`${s}Hand`], 'd', h[0]); set(el[`${s}HandLine`], 'd', h[1]); shapes[s] = shape; }
      place(el[`${s}HandG`], wr, s === 'n' ? sk.handN : sk.handF, 1.18);
      // leg: the hamstring swells toward the heel, the calf toward the hip
      const legD = limb(hp, kn, t0, t1, tb, an) + limb(kn, an, s0, s1, sb, hp);
      set(el[`${s}LegLine`], 'd', legD); set(el[`${s}LegFill`], 'd', legD);
      const ls1 = limbShade(hp, kn, t0, t1), ls2 = limbShade(kn, an, s0, s1);
      set(el[`${s}LegShade`], 'd', ls1.d + ls2.d); set(el[`${s}LegShade`], 'opacity', (0.5 * Math.max(ls1.o, ls2.o)).toFixed(2));
      const roll = s === 'n' ? sk.rollN : sk.rollF;
      for (const part of ['FootLine', 'Foot', 'Toes', 'Sole']) place(el[`${s}${part}`], an, roll);
    }
    const lg = lungiShape(sk, look, x.drag ?? 0);
    set(el.lungi, 'd', lg.d); set(el.band, 'd', lg.band); set(el.folds, 'd', lg.folds);
    set(el.check, 'patternTransform', `translate(${pt(sk.hip)}) rotate(${f1(sk.pelvis)})`);
    const st = look.vest ? VEST : SHIRT;
    set(el.body, 'd', body(sk, st));
    if (el.skinBody) set(el.skinBody, 'd', body(sk, BARE));
    const bs = bodyShade(sk, st);
    set(el.bodyShadeB, 'd', bs.back); set(el.bodyShadeB, 'opacity', (0.6 * bs.ob).toFixed(2));
    set(el.bodyShadeF, 'd', bs.front); set(el.bodyShadeF, 'opacity', (0.6 * bs.of).toFixed(2));
    const s0 = spine(sk, 0.93), s1 = spine(sk, 0.12);
    set(el.seam, 'd', look.vest
      ? `M${pt(add(spine(sk, 0.8).p, mul(spine(sk, 0.8).n, 9)))}Q${pt(add(spine(sk, 0.86).p, mul(spine(sk, 0.86).n, 3)))} ${pt(add(spine(sk, 0.9).p, mul(spine(sk, 0.9).n, -3)))}`
      : `M${pt(add(s0.p, mul(s0.n, 9.5)))}L${pt(add(s1.p, mul(s1.n, 10.5)))}`);
    const n0 = mix(sk.nape, sk.atlas, 0.15), n1 = mix(sk.nape, sk.atlas, 1.1);
    const neckD = limb(n0, n1, W.neck[0], W.neck[1]);
    set(el.neckLine, 'd', neckD); set(el.neck, 'd', neckD);
    const ns = limbShade(n0, n1, W.neck[0], W.neck[1]);
    set(el.neckShade, 'd', ns.d); set(el.neckShade, 'opacity', (0.55 * ns.o).toFixed(2));
    place(el.head, sk.atlas, sk.head);
    // eyes: the blink squashes the eye toward its lid; `eye` slides the pupil toward what he is about to do
    const shut = clamp01(x.blink ?? 0);
    set(el.eye, 'transform', `translate(11.6 -16.7) scale(1 ${f1(1 - 0.9 * shut)}) translate(-11.6 16.7)`);
    set(el.pupil, 'cx', f1(12 + (p.eye ?? 0) * 1.1));
    set(el.pupil, 'cy', f1(-16.7 + (p.eyeY ?? 0) * 0.8));
    set(el.brow, 'transform', `translate(0 ${f1(-(p.brow ?? 0) * 1.4)})`);
    const mouth = p.mouth ?? 'calm';
    if (shapes.mouth !== mouth) { set(el.mouth, 'd', MOUTHS[mouth] ?? MOUTHS.calm); set(el.mouth, 'fill', mouth === 'open' ? '#5a2e25' : 'none'); shapes.mouth = mouth; }
    if (el.tail) set(el.tail, 'd', tail((x.tail ?? 0) - sk.head + 18, (x.tailBend ?? 0) + 6));
  };
}
