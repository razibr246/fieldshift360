// Builds union objects (plans + total area) from the demo data and any farmer-confirmed plans.
import { harvestWindow } from './harvest.js';
import { RABI_CROPS } from './crops.js';
import { PLAN_SEASON } from './climate.js';

// One cache per climate record, so two upazilas' harvest windows never mix.
const hwCaches = new WeakMap();
export function planHW(clim, p) {
  if (!hwCaches.has(clim)) hwCaches.set(clim, new Map());
  const hwCache = hwCaches.get(clim);
  const key = `${p.crop}|${p.date}`;
  if (!hwCache.has(key)) hwCache.set(key, harvestWindow(clim, RABI_CROPS[p.crop], p.date, PLAN_SEASON));
  return hwCache.get(key);
}

export function makeUnion(clim, demo, unionId, confirmed = []) {
  const farmers = demo.farmers.filter((f) => f.union === unionId);
  // A confirmed plan replaces that plot's sample plan, so no field is counted twice.
  const real = confirmed.filter((p) => p.union === unionId && RABI_CROPS[p.crop]);
  const ids = new Set(real.map((p) => p.plot_id));
  const plans = [...demo.plans.filter((p) => p.union === unionId && !ids.has(p.plot_id)).map((p) => ({ ...p, src: 'demo' })), ...real]
    .map((p) => ({ ...p, _hw: planHW(clim, p) }));
  const area_dec = farmers.reduce((a, f) => a + f.area_dec, 0);
  const meta = demo.unions.find((u) => u.id === unionId);
  return { id: unionId, meta, farmers, plans, area_dec };
}

// ---- Location helpers for the land picker ----
export function distanceKm(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const insideBounds = (lat, lon, bounds) => lat >= bounds[0][0] && lat <= bounds[1][0] && lon >= bounds[0][1] && lon <= bounds[1][1];

// Nearest demo village (and so union) to a point. Returns null for an empty list.
export function locate(lat, lon, places) {
  let best = null;
  for (const p of places) {
    if (p.kind !== 'village') continue;
    const d = distanceKm({ lat, lon }, p);
    if (!best || d < best.km) best = { place: p, km: d };
  }
  return best && { union: best.place.union, village: best.place.village, villageBn: best.place.villageBn, km: best.km };
}

// Square outline (in lat/lon) for a plot of `areaDec` decimal centred on a point — a rough visual guide only.
export function plotSquare(lat, lon, areaDec) {
  const side = Math.sqrt(areaDec * 40.4686); // metres
  const dLat = side / 2 / 111320;
  const dLon = side / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [[lat - dLat, lon - dLon], [lat - dLat, lon + dLon], [lat + dLat, lon + dLon], [lat + dLat, lon - dLon]];
}
