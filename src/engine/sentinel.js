// Live Sentinel-2 readings for one field, straight from the browser. The same steps and rules as
// scripts/data/build_field_watch.py (which makes the saved copy in field_watch.json): Microsoft Planetary Computer's
// public STAC and data APIs (no key; they allow browser requests), one statistics call per pass over the field's
// square, clear share at least 90%, hazy passes dropped. Used to add passes newer than the saved copy, and to read
// a field the farmer has just marked or moved. Every function here only fetches; nothing is sent about the farmer.
import { plotSquare } from './world.js';

const STAC = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const DATA = 'https://planetarycomputer.microsoft.com/api/data/v1/item';
export const WATCH_START = '2025-06-01';
const KEYS = ['clear', 'water', 'ndvi', 'ndmi', 'ndwi', 'blue', 'red'];
const exprFor = (baseline) => {
  const e = ['where((SCL==4)|(SCL==5)|(SCL==6),1,0)', 'where(SCL==6,1,0)', '(B08-B04)/(B08+B04-2000)', '(B08-B11)/(B08+B11-2000)', '(B03-B08)/(B03+B08-2000)', '(B02-1000)/10000', '(B04-1000)/10000'].join(';');
  return Number(baseline) >= 4 ? e : e.replaceAll('-2000)', ')').replace('(B02-1000)', 'B02').replace('(B04-1000)', 'B04');
};

async function post(url, body, signal) {
  for (let i = 0; ; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && i < 3) { await new Promise((ok) => setTimeout(ok, 1500 * (i + 1))); continue; }
    throw new Error(`Sentinel-2 ${r.status}`);
  }
}

// Passes over a point between two ISO dates (inclusive), newest first, one per day.
export async function searchPasses(lat, lon, from, to, signal) {
  let body = {
    collections: ['sentinel-2-l2a'], intersects: { type: 'Point', coordinates: [lon, lat] }, datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
    limit: 200, query: { 'eo:cloud_cover': { lt: 80 } }, sortby: [{ field: 'datetime', direction: 'desc' }],
  };
  const out = [], seen = new Set();
  while (body) {
    const j = await post(STAC, body, signal);
    for (const f of j.features) {
      const d = f.properties.datetime.slice(0, 10);
      if (seen.has(d)) continue;
      seen.add(d);
      out.push({ id: f.id, date: d, baseline: f.properties['s2:processing_baseline'] ?? '05.00' });
    }
    const next = j.links?.find((l) => l.rel === 'next' && l.method === 'POST');
    body = next?.body ?? null;
  }
  return out;
}

const ringOf = (field) => {
  const sq = plotSquare(field.lat, field.lon, field.area_dec).map(([la, lo]) => [lo, la]);
  return [...sq, sq[0]];
};

// One pass over the field -> an observation, or null when it is cloudy or hazy there.
export async function passReading(item, field, signal) {
  const q = new URLSearchParams({ collection: 'sentinel-2-l2a', item: item.id, expression: exprFor(item.baseline), asset_as_band: 'true' });
  const j = await post(`${DATA}/statistics?${q}`, { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ringOf(field)] } }, signal);
  const st = Object.fromEntries(Object.values(j.properties.statistics).map((v, i) => [KEYS[i], v]));
  if (st.clear.count < 4 || st.clear.mean < 0.9) return null;
  if (st.blue.mean >= 0.1 && st.blue.mean >= 1.1 * st.red.mean) return null; // haze the scene classification missed
  const r = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;
  return { d: item.date, ndvi: r(st.ndvi.mean), sd: r(st.ndvi.std), ndmi: r(st.ndmi.mean), ndwi: r(st.ndwi.mean), water: r(st.water.mean, 2), px: st.clear.count, item: item.id, baseline: item.baseline };
}

// Every clear pass for a field between `from` and `to`, a few requests at a time. onProgress(done, total).
export async function readPasses(field, { from = WATCH_START, to, signal, onProgress } = {}) {
  const items = await searchPasses(field.lat, field.lon, from, to, signal);
  const out = [];
  let done = 0;
  onProgress?.(0, items.length);
  const queue = [...items];
  const worker = async () => {
    while (queue.length) {
      const it = queue.shift();
      try { const o = await passReading(it, field, signal); if (o) out.push(o); } catch (e) { if (e.name === 'AbortError') throw e; }
      onProgress?.(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return out.sort((a, b) => a.d.localeCompare(b.d));
}

// The square the field pictures cover (same as picture_box() in the build script): at least 480 m across.
export function pictureBox(field) {
  const side = Math.max(480, 6 * Math.sqrt(field.area_dec * 40.4686));
  const dLat = side / 2 / 111320, dLon = side / 2 / (111320 * Math.cos((field.lat * Math.PI) / 180));
  return [[field.lat - dLat, field.lon - dLon], [field.lat + dLat, field.lon + dLon]];
}

// Live picture addresses for one pass (true colour and green cover), drawn by the data API.
export function pictureUrls(obs, field) {
  const [[s, w], [n, e]] = pictureBox(field);
  const base = `${DATA}/bbox/${w},${s},${e},${n}/320x320`;
  const common = { collection: 'sentinel-2-l2a', item: obs.item, reproject: 'cubic' }; // smooth, not 10 m squares
  const off = Number(obs.baseline ?? 5) >= 4 ? 2000 : 0;
  return {
    tc: `${base}.jpg?${new URLSearchParams({ ...common, assets: 'visual', color_formula: 'sigmoidal RGB 4 0.35 saturation 1.15' })}`,
    ndvi: `${base}.png?${new URLSearchParams({ ...common, expression: `(B08-B04)/(B08+B04-${off})`, asset_as_band: 'true', rescale: '0,0.9', colormap_name: 'rdylgn' })}`,
  };
}
