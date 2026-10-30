// The camera of the farm-work scenes. It frames the farmer the way a camera operator would: close when he stoops to
// plant or squats over the soil, wider when he stands up or swings a kodal over his head, so the work always fills
// the card. Each scene bakes its camera track once (bakeCamera); the track looks a little behind and ahead in time,
// which keeps it steady (no pumping with every stroke) and lets it make room before he rises.
import { inHand } from './rig.js';

export const ASPECT = 920 / 310;
const rot = (x, y, deg) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };

// figureBox(sk, { hat, brim, dx, extra }) → [x0, y0, x1, y1]: the farmer's outline (head and headwear, hands with their
// fingers, feet with their toes) in scene units, shifted by dx, together with any `extra` points (a tool he holds).
export function figureBox(sk, { hat = 37, brim = 0, dx = 0, extra = [] } = {}) {
  const p = [sk.hip, sk.waist, sk.nape, sk.atlas, sk.elbowN, sk.elbowF, sk.wristN, sk.wristF, sk.kneeN, sk.kneeF, inHand(sk, 'n', 18, 0), inHand(sk, 'f', 18, 0), ...extra];
  for (const [a, r] of [[sk.ankleN, sk.rollN], [sk.ankleF, sk.rollF]]) { const [ox, oy] = rot(26, 9, r); p.push([a[0] + ox, a[1] + oy], [a[0] - 7, a[1] + 9]); }
  for (const [hx, hy] of [[0, -hat], [-15 - brim, -26], [21 + brim, -14], [12, 2]]) { const [ox, oy] = rot(hx, hy, sk.head); p.push([sk.atlas[0] + ox, sk.atlas[1] + oy]); }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0 + dx, y0, x1 + dx, y1];
}

// frameView([[box, weight], ...]) → { x, y, w, h }, a viewBox. Its edges are a soft maximum of the boxes' edges
// (nearly their union, but smooth, so the view glides), padded by `pad`; its centre leans `lead` of its width the way
// he faces; it is kept between minW and maxW wide at the scene's aspect, and inside the scene.
export function frameView(boxes, { pad = 1.22, minW = 430, maxW = 920, lead = 0.04, bounds = [0, 0, 920, 310] } = {}) {
  const total = boxes.reduce((s, [, w]) => s + w, 0);
  const soft = (i, sign) => {
    const m = Math.max(...boxes.map(([b]) => sign * b[i])), tau = 7;
    return sign * (m + tau * Math.log(boxes.reduce((s, [b, w]) => s + w * Math.exp((sign * b[i] - m) / tau), 0) / total));
  };
  const x0 = soft(0, -1), y0 = soft(1, -1), x1 = soft(2, 1), y1 = soft(3, 1);
  const w = Math.min(maxW, Math.max(minW, (x1 - x0) * pad, (y1 - y0) * pad * ASPECT)), h = w / ASPECT;
  const cx = (x0 + x1) / 2 + lead * w, cy = (y0 + y1) / 2;
  const x = Math.min(bounds[2] - w, Math.max(bounds[0], cx - w / 2)), y = Math.min(bounds[3] - h, Math.max(bounds[1], cy - h / 2));
  return { x, y, w, h };
}

// bakeCamera(T, boxAt, opts) → (t) => view: the camera track of a whole loop, worked out once. The farmer's outline is
// sampled 30 times a second; each moment keeps everything he covers in the 0.6 s either side of it (so the camera
// is already wide before he stands up, and does not pump with every stroke of a tool), then the track is blurred and
// framed, and read back with a smooth spline. A looping scene (wrap) has a seamless track.
export function bakeCamera(T, boxAt, { wrap = false, hold = 0.6, blur = 0.35, rate = 30, ...frameOpts } = {}) {
  const N = Math.round(T * rate), dt = T / N;
  const idx = (i) => (wrap ? ((i % N) + N) % N : Math.min(N - 1, Math.max(0, i)));
  const raw = Array.from({ length: N }, (_, i) => boxAt(i * dt));
  const W = Math.round(hold / dt);
  const held = [0, 1, 2, 3].map((k) => raw.map((_, i) => {
    let v = k < 2 ? Infinity : -Infinity;
    for (let j = -W; j <= W; j++) { const b = raw[idx(i + j)][k]; v = k < 2 ? Math.min(v, b) : Math.max(v, b); }
    return v;
  }));
  const gauss = (arr, sigma) => {
    const S = sigma / dt, R = Math.ceil(3 * S), ker = Array.from({ length: 2 * R + 1 }, (_, j) => Math.exp(-((j - R) ** 2) / (2 * S * S)));
    const sum = ker.reduce((a, b) => a + b, 0);
    return arr.map((_, i) => ker.reduce((acc, k, j) => acc + k * arr[idx(i + j - R)], 0) / sum);
  };
  const [x0, y0, x1, y1] = held.map((a) => gauss(a, blur));
  const views = x0.map((_, i) => frameView([[[x0[i], y0[i], x1[i], y1[i]], 1]], frameOpts));
  const track = ['x', 'y', 'w'].map((k) => gauss(views.map((v) => v[k]), 0.2));
  return (t) => {
    const u = t / dt, i = Math.floor(u), f = u - i;
    const [x, y, w] = track.map((a) => {
      const p0 = a[idx(i - 1)], p1 = a[idx(i)], p2 = a[idx(i + 1)], p3 = a[idx(i + 2)];
      return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
    });
    return { x, y, w, h: w / ASPECT };
  };
}

export const viewBox = (v) => `${v.x.toFixed(1)} ${v.y.toFixed(1)} ${v.w.toFixed(1)} ${v.h.toFixed(1)}`;
