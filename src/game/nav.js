// Navigation for মাঠের মানুষ: a walkable surface baked from each village's layout, and paths across it. The ideas
// follow NavMeshPlus (h8man/navmeshplus, MIT), the 2D navigation package for Unity, rebuilt for this game's world:
//   surface   baked from the layout's own sources: buildings and trees (L.blockers), water (L.water) and the edge of
//             the walkable land (WORLD_R), each grown by the agent's radius, so a route never brushes a wall
//   areas     like NavMeshPlus's modifiers, ground carries a walking cost: village paths cheapest, then grass, the
//             farm's own plots, and the neighbours' crops dearest, so a route keeps to the paths and off their fields
//   query     A* over the 8-connected cells (no corner cutting), snapping an unreachable end to the nearest
//             walkable cell, then string-pulled so the route runs straight wherever the straight line costs no more
// The sim's own movement rules decide what is walkable (layout.js inWater and resolve), so the route and the
// farmer's feet agree. Pure: no drawing here; stage.js shows the route and walks the farmer along it.
import { inWater } from './layout.js';
import { FIELD_W, FIELD_D, WORLD_R } from './regions.js';

export const AREA = { path: 1, grass: 1.7, plots: 2.4, crops: 4 };
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

// Bake the surface: one cost per cell, Infinity where the agent can't stand.
export function bakeNav(L, { cell = 0.8, radius = 0.45 } = {}) {
  const R = WORLD_R, n = Math.ceil((2 * R) / cell), cost = new Float32Array(n * n);
  const fx = FIELD_W / 2, fz = FIELD_D / 2;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = -R + (i + 0.5) * cell, z = -R + (j + 0.5) * cell;
      let c = AREA.grass;
      if (Math.hypot(x, z) > R - radius || inWater(L, x, z)) c = Infinity;
      else {
        for (const b of L.blockers) {
          if (b.r) { if (Math.hypot(x - b.x, z - b.z) < b.r + radius) { c = Infinity; break; } }
          else { const dx = x - b.x, dz = z - b.z, u = dx * b.c - dz * b.s, v = dx * b.s + dz * b.c; if (Math.abs(u) < b.hw + radius && Math.abs(v) < b.hd + radius) { c = Infinity; break; } }
        }
      }
      if (c !== Infinity) {
        if (Math.abs(x) < fx && Math.abs(z) < fz) c = AREA.plots;
        else if (L.patches?.some(([x0, x1, z0, z1, k]) => k !== 'bare' && x > x0 && x < x1 && z > z0 && z < z1)) c = AREA.crops;
        for (const p of L.paths) for (let k = 1; k < p.length && c !== AREA.path; k++) if (segDist(x, z, p[k - 1], p[k]) < 1.3) c = AREA.path;
      }
      cost[j * n + i] = c;
    }
  }
  return { cell, n, R, cost };
}

const toCell = (nav, x, z) => [Math.floor((x + nav.R) / nav.cell), Math.floor((z + nav.R) / nav.cell)];
const toWorld = (nav, i, j) => [-nav.R + (i + 0.5) * nav.cell, -nav.R + (j + 0.5) * nav.cell];
export const costAt = (nav, x, z) => { const [i, j] = toCell(nav, x, z); return i < 0 || j < 0 || i >= nav.n || j >= nav.n ? Infinity : nav.cost[j * nav.n + i]; };

// the nearest walkable cell to (i, j), searching outwards ring by ring
function nearestOpen(nav, i, j, max = 14) {
  const { n, cost } = nav;
  for (let r = 0; r <= max; r++) {
    let best = null, bd = Infinity;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n || cost[b * n + a] === Infinity) continue;
      const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, b]; }
    }
    if (best) return best;
  }
  return null;
}

// the cost of walking the straight line a→b, or Infinity if it crosses a blocked cell
function lineCost(nav, [ax, az], [bx, bz]) {
  const d = Math.hypot(bx - ax, bz - az), steps = Math.max(1, Math.ceil(d / (nav.cell * 0.4)));
  let sum = 0;
  for (let k = 0; k <= steps; k++) { const c = costAt(nav, ax + ((bx - ax) * k) / steps, az + ((bz - az) * k) / steps); if (c === Infinity) return Infinity; sum += c; }
  return (sum / (steps + 1)) * d;
}
const polyCost = (nav, pts, a, b) => { let s = 0; for (let k = a; k < b; k++) s += lineCost(nav, pts[k], pts[k + 1]); return s; };

// A route from (ax, az) to (bx, bz): a list of [x, z] points, or null when there is none.
export function findPath(nav, ax, az, bx, bz) {
  const { n, cost } = nav;
  const s = nearestOpen(nav, ...toCell(nav, ax, az)), t = nearestOpen(nav, ...toCell(nav, bx, bz));
  if (!s || !t) return null;
  const start = s[1] * n + s[0], goal = t[1] * n + t[0];
  const g = new Float32Array(n * n).fill(Infinity), from = new Int32Array(n * n).fill(-1), closed = new Uint8Array(n * n);
  const h = (k) => { const dx = Math.abs((k % n) - t[0]), dz = Math.abs(Math.floor(k / n) - t[1]); return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * AREA.path; };
  // a binary heap of [f, cell]
  const heap = []; const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  g[start] = 0; push(h(start), start);
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (heap.length) {
    const [, k] = pop();
    if (closed[k]) continue; closed[k] = 1;
    if (k === goal) break;
    const i = k % n, j = Math.floor(k / n);
    for (const [di, dj, len] of DIRS) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= n || b >= n) continue;
      const kk = b * n + a, c = cost[kk];
      if (c === Infinity || closed[kk]) continue;
      if (di && dj && (cost[j * n + a] === Infinity || cost[b * n + i] === Infinity)) continue; // no cutting a corner
      const ng = g[k] + len * (c + cost[k]) / 2;
      if (ng < g[kk]) { g[kk] = ng; from[kk] = k; push(ng + h(kk), kk); }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const cells = []; for (let k = goal; k !== -1; k = from[k]) cells.push(toWorld(nav, k % n, Math.floor(k / n)));
  cells.reverse();
  cells[0] = costAt(nav, ax, az) !== Infinity ? [ax, az] : cells[0];
  cells[cells.length - 1] = costAt(nav, bx, bz) !== Infinity ? [bx, bz] : cells[cells.length - 1];
  return smooth(nav, cells);
}

// String pulling: from each corner, jump to the furthest later point the straight line reaches for no more cost.
export function smooth(nav, pts) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && lineCost(nav, pts[a], pts[b]) > polyCost(nav, pts, a, b) * 1.02) b--;
    out.push(pts[b]); a = b;
  }
  return out;
}

export const pathLength = (pts) => pts.reduce((s, p, k) => (k ? s + Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]) : 0), 0);
