// Pure helpers for the farm-work animations (components/farmwork/): keyframe curves that ease the way an animator's
// graph editor does, two-bone IK for arms and legs, closed-form springs and steady noise. Every frame is a function of
// time alone, so a scene can be scrubbed, paused, stepped and tested without keeping any state.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (x) => { const k = clamp(x); return k * k * (3 - 2 * k); };
export const rad = (d) => (d * Math.PI) / 180;
export const deg = (r) => (r * 180) / Math.PI;
// A repeatable pseudo-random number in [0, 1) for an integer.
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// curve([[t, v], ...], { period }) → (t) => v. Monotone cubic (Fritsch–Carlson): it passes through every key, never
// overshoots between two of them (so two equal keys make a hold that eases in and out) and keeps the velocity smooth
// through a key. With `period` the curve loops: the last key flows into the first. Without, it comes to rest at its
// first and last keys (it holds their values beyond them, so it must not arrive moving).
export function curve(keys, { period } = {}) {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  if (k.length === 1) return () => k[0][1];
  const p = period ? [[k.at(-1)[0] - period, k.at(-1)[1]], ...k, [k[0][0] + period, k[0][1]]] : k;
  const n = p.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1][1] - p[i][1]) / Math.max(1e-9, p[i + 1][0] - p[i][0]));
  const m = [period ? d[0] : 0, ...d.slice(1).map((s, i) => (s * d[i] <= 0 ? 0 : (s + d[i]) / 2)), period ? d.at(-1) : 0];
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const r = 3 / Math.sqrt(s); m[i] = r * a * d[i]; m[i + 1] = r * b * d[i]; }
  }
  const t0 = k[0][0];
  return (t) => {
    let x = t;
    if (period) x = x - period * Math.floor((x - t0) / period);
    if (x <= p[0][0]) return p[0][1];
    if (x >= p[n - 1][0]) return p[n - 1][1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (p[mid][0] <= x) lo = mid; else hi = mid; }
    const h = p[lo + 1][0] - p[lo][0], s = (x - p[lo][0]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p[lo][1] + (s3 - 2 * s2 + s) * h * m[lo] + (3 * s2 - 2 * s3) * p[lo + 1][1] + (s3 - s2) * h * m[lo + 1];
  };
}

// steps([[t, value], ...], { period }) → (t) => the value of the last key at or before t (a hand shape, an expression).
export function steps(keys, { period } = {}) {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  return (t) => {
    const x = period ? t - period * Math.floor(t / period) : t;
    let v = period ? k.at(-1)[1] : k[0][1];
    for (const [at, val] of k) { if (at <= x) v = val; else break; }
    return v;
  };
}

// reach(ax, ay, tx, ty, l1, l2, side) → the middle joint (j) and the end (e) of a two-bone limb from (ax, ay) toward
// (tx, ty). side = 1 bends the joint clockwise on screen from the line to the target (an elbow down and back on a
// figure facing right), -1 the other way (a knee forward). Near full stretch the reach eases off ("soft IK") instead
// of locking straight, which is what makes a knee or elbow pop in cheap rigs.
export function reach(ax, ay, tx, ty, l1, l2, side = 1) {
  const dx = tx - ax, dy = ty - ay, dist = Math.hypot(dx, dy) || 1e-6;
  const max = l1 + l2, soft = 0.035 * max, min = Math.abs(l1 - l2) + 1e-3;
  let r = dist;
  if (r > max - soft) r = max - soft * Math.exp(-(r - (max - soft)) / soft);
  r = Math.max(min, r);
  const ux = dx / dist, uy = dy / dist;
  const a = Math.acos(clamp((l1 * l1 + r * r - l2 * l2) / (2 * l1 * r), -1, 1));
  const base = Math.atan2(uy, ux) + side * a;
  return { jx: ax + l1 * Math.cos(base), jy: ay + l1 * Math.sin(base), ex: ax + ux * r, ey: ay + uy * r, short: dist - r };
}

// ring(t, a, f, z): a damped spring let go at t = 0 from a displacement a (a branch released, a basket set down),
// at f hertz with damping ratio z. Zero before it starts.
export function ring(t, a, f = 2, z = 0.25) {
  if (t < 0) return 0;
  const w = 2 * Math.PI * f, wd = w * Math.sqrt(Math.max(1e-4, 1 - z * z));
  return a * Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// wobble(t, seed) → a smooth, never-repeating drift in about [-1, 1]: three sines at unrelated rates. For the small
// sways that keep a still figure alive (a "moving hold") and for leaves and cloth in the wind.
export const wobble = (t, seed = 0) =>
  0.5 * Math.sin(t * 1.31 + seed * 12.9898) + 0.3 * Math.sin(t * 2.17 + seed * 78.233) + 0.2 * Math.sin(t * 0.53 + seed * 37.719);

// blink(t, seed) → how closed the eyes are (0 open, 1 shut): a quick close and a slower open every 2.5–5 seconds.
export function blink(t, seed = 0) {
  const period = 3.4, i = Math.floor(t / period);
  for (const j of [i - 1, i]) {
    const d = t - (j * period + hash(j + seed * 97) * 1.9);
    if (d >= 0 && d < 0.2) return d < 0.07 ? d / 0.07 : 1 - (d - 0.07) / 0.13;
  }
  return 0;
}

// The arc-length-free camera of a looping pan: `bump` returns, for u in [0, 1), the share of the loop's pan done so far,
// moving fastest around `peak` (also as a loop share) and never stopping, so the speed is the same either side of the
// loop's seam. `rest` is the share of the pan spread evenly over the loop.
export function panCurve({ peak = 0, width = 0.06, rest = 0.15 } = {}) {
  const N = 2000, cum = new Float64Array(N + 1);
  const speed = (u) => {
    let d = Math.abs(u - peak) % 1; d = Math.min(d, 1 - d);
    return Math.exp(-((d / width) ** 2));
  };
  for (let i = 0; i < N; i++) cum[i + 1] = cum[i] + speed((i + 0.5) / N);
  const total = cum[N];
  return (u) => {
    const x = u - Math.floor(u), f = x * N, i = Math.min(N - 1, Math.floor(f)); // (u % 1 + 1) % 1 rounds 1 - 1e-16 up to 0
    const bumped = (cum[i] + (cum[i + 1] - cum[i]) * (f - i)) / total;
    return rest * x + (1 - rest) * bumped;
  };
}
