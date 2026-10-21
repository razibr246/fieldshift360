#!/usr/bin/env node
// Real Aman rain and transplanting data for every rural upazila of Rajshahi and Dhaka districts.
//
//   node scripts/data/build_aman_radar.mjs              # everything (resumes from .cache/data/aman)
//   node scripts/data/build_aman_radar.mjs --end 2026-10-17
//
// Sources (all public, no login):
//   * Upazila outlines: geoBoundaries gbOpen BGD ADM2/ADM3 (BBS / OCHA ROAP 2020), the files the other build scripts cache.
//   * Rain: NASA/JAXA GPM IMERG daily precipitation, served at native resolution by the NASA POWER API (UTC days).
//   * Cropland sample: Esri | Impact Observatory | Microsoft Sentinel-2 10 m land cover (getSamples), cropland in both
//     2017 and 2025, 36 points spread over each upazila.
//   * Radar: Sentinel-1 RTC gamma-nought VH (Microsoft Planetary Computer, collection sentinel-1-rtc), every pass from
//     15 April to 31 October, 2017 to now, averaged to about 40 m and read at each cropland point.
// The analysis is the radar's own code (public/radar/js/detect.js and stats.js), unchanged: detectTransplant on each
// point's VH series; Mann-Kendall + Sen's slope with Benjamini-Hochberg across a district on June–July rain.
//
// What is reported, and why. Each upazila's transplanting date is compared with its OWN 2017–2025 radar normal, and
// a shift counts only beyond SHIFT_DAYS (about one radar revisit, the smallest change the passes can resolve). The
// radar prototype's "usable-rain onset" (≥20 mm in 3 days from 1 June, no 7-day dry spell) and its 15–30 day
// onset-to-transplant band are NOT used: on real IMERG rain the rule fires on 1 June itself in most years (the rains
// have already started) or on pre-monsoon storms when started earlier, so it measures the search date, not the monsoon.
// Rain is instead given as the June–July total (seedbed and land-preparation months) against its 2001–2025 normal.
//
// Writes src/data/aman_radar.json (district summary, read by the app) and public/aman/<upazila>.json (one upazila's
// season curves, loaded when that upazila is opened), plus public/aman/<upazila>/<date>.webp radar frames of the
// latest season for Godagari and every Dhaka district upazila (union outlines from src/data/geo/<upazila>_places.json).
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { inflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectTransplant, doyOf, TRANSPLANT_RULE } from '../../public/radar/js/detect.js';
import { mannKendall, senSlope, benjaminiHochberg, median, quantile } from '../../public/radar/js/stats.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = path.join(REPO, '.cache', 'data', 'aman');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const END = arg('end', new Date(Date.now() - 864e5).toISOString().slice(0, 10)); // yesterday, UTC
const END_YEAR = +END.slice(0, 4);
const RAIN_FROM = 2001;
const VH_FROM = 2017;
const VH_SPAN = [105, 304]; // 15 Apr – 31 Oct: 60 days before the earliest window opens to 45 days after it closes
const N_FIELDS = 36;
const SHIFT_DAYS = 7; // a transplanting date within ±7 days of its normal counts as normal
const NORMAL_TO = 2025; // normals: radar 2017–2025, rain 2001–2025
const MIN_FIELDS = 6; // a season's date (and its shift) is reported only when at least 6 of the 36 fields show transplanting
// IMERG's latest months come from its provisional satellite-only run (the gauge-calibrated Final follows 3–4 months
// later). For 2026 that run gives about half of NASA POWER's other estimate (PRECTOTCORR) at Godagari and Dhamrai,
// while 2017–2025 agree within ~15%. So rain after RAIN_FINAL_TO is shown as provisional and left out of normals and
// trends.
const RAIN_FINAL_TO = 2025;
const FRAMES_FOR = ['godagari', 'dhamrai', 'savar', 'keraniganj', 'dohar', 'nawabganj', 'sitakunda', 'dacope', 'bakerganj', 'gangachara', 'gowainghat'];
const PC = 'https://planetarycomputer.microsoft.com/api';
const LC = 'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer';

const DISTRICTS = {
  rajshahi: {
    shape: 'Rajshahi', bn: 'রাজশাহী', en: 'Rajshahi', division: { bn: 'রাজশাহী', en: 'Rajshahi' },
    upazilas: { Bagha: 'বাঘা', Baghmara: 'বাগমারা', Charghat: 'চারঘাট', Durgapur: 'দুর্গাপুর', Godagari: 'গোদাগাড়ী', Mohanpur: 'মোহনপুর', Paba: 'পবা', Puthia: 'পুঠিয়া', Tanore: 'তানোর' },
  },
  dhaka: {
    shape: 'Dhaka', bn: 'ঢাকা', en: 'Dhaka', division: { bn: 'ঢাকা', en: 'Dhaka' },
    upazilas: { Dhamrai: 'ধামরাই', Dohar: 'দোহার', Keraniganj: 'কেরানীগঞ্জ', Nawabganj: 'নবাবগঞ্জ', Savar: 'সাভার' },
  },
  // The five division story upazilas, one per district so far.
  chattogram: { shape: 'Chittagong', bn: 'চট্টগ্রাম', en: 'Chattogram', division: { bn: 'চট্টগ্রাম', en: 'Chattogram' }, upazilas: { Sitakunda: 'সীতাকুণ্ড' } },
  khulna: { shape: 'Khulna', bn: 'খুলনা', en: 'Khulna', division: { bn: 'খুলনা', en: 'Khulna' }, upazilas: { Dacope: 'দাকোপ' } },
  barishal: { shape: 'Barisal', bn: 'বরিশাল', en: 'Barishal', division: { bn: 'বরিশাল', en: 'Barishal' }, upazilas: { Bakerganj: 'বাকেরগঞ্জ' } },
  rangpur: { shape: 'Rangpur', bn: 'রংপুর', en: 'Rangpur', division: { bn: 'রংপুর', en: 'Rangpur' }, upazilas: { Gangachara: 'গঙ্গাচড়া' } },
  sylhet: { shape: 'Sylhet', bn: 'সিলেট', en: 'Sylhet', division: { bn: 'সিলেট', en: 'Sylhet' }, upazilas: { Gowainghat: 'গোয়াইনঘাট' } },
};

// ───────────── small helpers ─────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, { json = true, body, tries = 5, timeout = 180_000 } = {}) {
  for (let k = 1; ; k++) {
    try {
      const res = await fetch(url, { method: body ? 'POST' : 'GET', body, headers: body ? { 'Content-Type': typeof body === 'string' && body.startsWith('{') ? 'application/json' : 'application/x-www-form-urlencoded' } : {}, signal: AbortSignal.timeout(timeout) });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
      return json ? await res.json() : Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (k >= tries) throw new Error(`${url.slice(0, 140)} → ${e.message}`);
      await sleep(1500 * k * k);
    }
  }
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); } }));
  return out;
}
const cached = async (file, make) => {
  if (existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  const v = await make();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(v));
  return v;
};
const isoDoy = (y, doy) => new Date(Date.UTC(y, 0, doy)).toISOString().slice(0, 10);
const round = (v, d = 2) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

// ───────────── geometry ─────────────
const outer = (g) => (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []));
function inside(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[j];
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}
function centroid(r) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i], [x2, y2] = r[(i + 1) % r.length];
    const k = x1 * y2 - x2 * y1; a += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
function segDist(px, py, [x1, y1], [x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1e-12;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / L));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function interiorPoint(ring) { // pole of inaccessibility on a 60×60 grid
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  let best = [-1, null];
  for (let i = 0; i < 60; i++) for (let j = 0; j < 60; j++) {
    const x = Math.min(...xs) + ((Math.max(...xs) - Math.min(...xs)) * (i + 0.5)) / 60, y = Math.min(...ys) + ((Math.max(...ys) - Math.min(...ys)) * (j + 0.5)) / 60;
    if (!inside(x, y, ring)) continue;
    let d = Infinity;
    for (let k = 0; k < ring.length; k++) d = Math.min(d, segDist(x, y, ring[k], ring[(k + 1) % ring.length]));
    if (d > best[0]) best = [d, [x, y]];
  }
  return best[1];
}
function simplify(pts, tol) { // Douglas-Peucker on an open line
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = 0, idx = -1;
    for (let i = a + 1; i < b; i++) { const d = segDist(pts[i][0], pts[i][1], pts[a], pts[b]); if (d > best) { best = d; idx = i; } }
    if (idx > -1 && best > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const simplifyRing = (ring, tol) => { const h = ring.length >> 1; return [...simplify(ring.slice(0, h + 1), tol).slice(0, -1), ...simplify(ring.slice(h), tol)]; };

// ───────────── PNG (8-bit grey + alpha) ─────────────
function decodePng(buf) {
  let p = 8, w = 0, h = 0, ct = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8) throw new Error('bit depth'); }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), row = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[row + x - ch] : 0, b = y ? out[row - stride + x] : 0, c = x >= ch && y ? out[row - stride + x - ch] : 0;
      let v = src[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[row + x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

// ───────────── sources ─────────────
async function loadUpazilas() {
  const adm2 = JSON.parse(await readFile(path.join(REPO, '.cache/data/geoBoundaries-BGD-ADM2_simplified.geojson'), 'utf8'));
  const adm3 = JSON.parse(await readFile(path.join(REPO, '.cache/data/geoBoundaries-BGD-ADM3.geojson'), 'utf8'));
  const out = [];
  for (const [did, d] of Object.entries(DISTRICTS)) {
    const dring = outer(adm2.features.find((f) => f.properties.shapeName === d.shape).geometry);
    for (const f of adm3.features) {
      const name = f.properties.shapeName;
      if (!d.upazilas[name]) continue;
      const ring = outer(f.geometry);
      if (!inside(...centroid(ring), dring)) continue; // names repeat across districts (e.g. Mohanpur, Nawabganj)
      out.push({ id: name.toLowerCase(), en: name, bn: d.upazilas[name], district: did, ring, map: simplifyRing(ring, 0.0015), point: interiorPoint(simplifyRing(ring, 0.0005)) });
    }
  }
  for (const [did, d] of Object.entries(DISTRICTS)) {
    const got = out.filter((u) => u.district === did).length;
    if (got !== Object.keys(d.upazilas).length) throw new Error(`${did}: found ${got} of ${Object.keys(d.upazilas).length} upazilas`);
  }
  return out;
}

async function rainFor(u) {
  return cached(path.join(CACHE, 'rain', `${u.id}-${END}.json`), async () => {
    const [lon, lat] = u.point;
    const q = new URLSearchParams({ parameters: 'IMERG_PRECTOT', community: 'AG', latitude: lat.toFixed(4), longitude: lon.toFixed(4), start: `${RAIN_FROM}0101`, end: END.replaceAll('-', ''), format: 'JSON', 'time-standard': 'UTC' });
    const js = await get(`https://power.larc.nasa.gov/api/temporal/daily/point?${q}`, { timeout: 300_000 });
    const fill = js.header?.fill_value ?? -999;
    const series = {};
    for (const [k, v] of Object.entries(js.properties.parameter.IMERG_PRECTOT)) series[k] = v == null || v === fill || v <= -998 ? null : v;
    return { sources: js.header?.sources, version: js.header?.api?.version, lat, lon, series };
  });
}

async function croplandPoints(u) {
  return cached(path.join(CACHE, 'fields', `${u.id}.json`), async () => {
    const xs = u.ring.map((p) => p[0]), ys = u.ring.map((p) => p[1]);
    const step = Math.sqrt(((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / 900);
    const cand = [];
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) for (let y = Math.min(...ys) + step / 2; y < Math.max(...ys); y += step) if (inside(x, y, u.ring)) cand.push([round(x, 5), round(y, 5)]);
    const year = async (y) => {
      const t = (m, d) => Date.UTC(y, m - 1, d);
      const body = new URLSearchParams({ f: 'json', geometry: JSON.stringify({ points: cand, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryMultipoint', returnFirstValueOnly: 'true', interpolation: 'RSP_NearestNeighbor', time: `${t(1, 1)},${t(12, 31)}`, renderingRule: JSON.stringify({ rasterFunction: 'None' }) }).toString();
      const js = await get(`${LC}/getSamples`, { body, timeout: 600_000 });
      if (js.error) throw new Error(JSON.stringify(js.error));
      return new Map(js.samples.map((s) => [s.locationId, Number(s.value)]));
    };
    const [a, b] = [await year(2017), await year(2025)];
    const crop = cand.filter((_, i) => a.get(i) === 5 && b.get(i) === 5);
    // Farthest-point sampling from the point nearest the interior point: spread evenly over the upazila's farmland.
    const pick = [crop.reduce((m, p) => (Math.hypot(p[0] - u.point[0], p[1] - u.point[1]) < Math.hypot(m[0] - u.point[0], m[1] - u.point[1]) ? p : m))];
    while (pick.length < Math.min(N_FIELDS, crop.length)) {
      let best = null, bd = -1;
      for (const p of crop) { const d = Math.min(...pick.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))); if (d > bd) { bd = d; best = p; } }
      pick.push(best);
    }
    return { candidates: cand.length, cropland: crop.length, points: pick };
  });
}

async function s1Items(u, year) {
  const until = year === END_YEAR ? END : isoDoy(year, VH_SPAN[1]);
  return cached(path.join(CACHE, 'items', `${u.id}-${year}-${until}.json`), async () => {
    const body = JSON.stringify({ collections: ['sentinel-1-rtc'], intersects: { type: 'Polygon', coordinates: [[...u.map, u.map[0]]] }, datetime: `${isoDoy(year, VH_SPAN[0])}T00:00:00Z/${until}T23:59:59Z`, limit: 250 });
    const js = await get(`${PC}/stac/v1/search`, { body });
    return js.features.map((f) => ({ id: f.id, dt: f.properties.datetime, orbit: f.properties['sat:orbit_state'], rel: f.properties['sat:relative_orbit'], platform: String(f.properties.platform).toLowerCase() }));
  });
}

function bboxOf(u) {
  const xs = u.ring.map((p) => p[0]), ys = u.ring.map((p) => p[1]);
  const b = [Math.min(...xs) - 0.003, Math.min(...ys) - 0.003, Math.max(...xs) + 0.003, Math.max(...ys) + 0.003].map((v) => round(v, 4));
  const kmX = (b[2] - b[0]) * 111.32 * Math.cos(((b[1] + b[3]) / 2) * Math.PI / 180), kmY = (b[3] - b[1]) * 110.57;
  return { b, w: Math.round((kmX * 1000) / 40), h: Math.round((kmY * 1000) / 40) }; // ~40 m pixels
}

// One radar pass: VH in dB at every field point (null where the pass does not cover it), kept in the cache.
async function sampleItem(u, item, fields, box, keepPng) {
  const file = path.join(CACHE, 'vh', u.id, `${item.id}.json`);
  const pngFile = path.join(CACHE, 'png', u.id, `${item.id}.png`);
  if (existsSync(file) && (!keepPng || existsSync(pngFile))) return JSON.parse(await readFile(file, 'utf8'));
  const q = new URLSearchParams({ collection: 'sentinel-1-rtc', item: item.id, expression: '10*log10(vh)', asset_as_band: 'true', rescale: '-30,0', resampling: 'average' });
  const buf = await get(`${PC}/data/v1/item/bbox/${box.b.join(',')}/${box.w}x${box.h}.png?${q}`, { json: false });
  const img = decodePng(buf);
  const vals = fields.map(([lon, lat]) => {
    const x = Math.min(img.w - 1, Math.floor(((lon - box.b[0]) / (box.b[2] - box.b[0])) * img.w));
    const y = Math.min(img.h - 1, Math.floor(((box.b[3] - lat) / (box.b[3] - box.b[1])) * img.h));
    const o = (y * img.w + x) * img.ch;
    if (img.ch === 2 && img.data[o + 1] === 0) return null;
    return round(-30 + (img.data[o] / 255) * 30, 2);
  });
  let cover = 0, n = 0;
  for (let y = 0; y < img.h; y += 6) for (let x = 0; x < img.w; x += 6) {
    const lon = box.b[0] + ((x + 0.5) / img.w) * (box.b[2] - box.b[0]), lat = box.b[3] - ((y + 0.5) / img.h) * (box.b[3] - box.b[1]);
    if (!inside(lon, lat, u.map)) continue;
    n++; if (img.ch !== 2 || img.data[(y * img.w + x) * 2 + 1]) cover++;
  }
  const out = { vals, cover: n ? round(cover / n, 3) : 0 };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(out));
  if (keepPng) { await mkdir(path.dirname(pngFile), { recursive: true }); await writeFile(pngFile, buf); }
  return out;
}

// ───────────── main ─────────────
const ONLY = arg('only', null); // e.g. --only dhamrai: quick check of one upazila (writes nothing)
const ups = (await loadUpazilas()).filter((u) => !ONLY || u.id === ONLY);
console.log(`upazilas: ${ups.map((u) => u.en).join(', ')}; data to ${END}`);
const details = {};
for (const u of ups) {
  const t0 = Date.now();
  const [rain, fields] = await Promise.all([rainFor(u), croplandPoints(u)]);
  const box = bboxOf(u);
  const pts = fields.points;

  // June–July rain per year (null when any day is missing), and the daily series of each radar season for the charts.
  const rainJJ = {}, rainSeason = {}, rainJS = {};
  let rainThrough = null;
  for (const [k, v] of Object.entries(rain.series)) if (v !== null && (!rainThrough || k > rainThrough)) rainThrough = k;
  for (let y = RAIN_FROM; y <= END_YEAR; y++) {
    const day = (doy) => rain.series[isoDoy(y, doy).replaceAll('-', '')] ?? null;
    const jj = Array.from({ length: doyOf(y, 7, 31) - doyOf(y, 6, 1) + 1 }, (_, i) => day(doyOf(y, 6, 1) + i));
    rainJJ[y] = jj.some((v) => v === null) ? null : Math.round(jj.reduce((a, b) => a + b, 0));
    rainJS[y] = Array.from({ length: doyOf(y, 9, 30) - doyOf(y, 6, 1) + 1 }, (_, i) => round(day(doyOf(y, 6, 1) + i), 1));
    if (y >= VH_FROM) rainSeason[y] = Array.from({ length: VH_SPAN[1] - VH_SPAN[0] + 1 }, (_, i) => round(day(VH_SPAN[0] + i), 1));
  }

  // Sentinel-1 passes per season, sampled at the cropland points; passes on the same day and orbit are merged.
  const seasons = {};
  for (let y = VH_FROM; y <= END_YEAR; y++) {
    const items = await s1Items(u, y);
    const keep = FRAMES_FOR.includes(u.id) && y === END_YEAR;
    const samples = await pool(items, 8, (it) => sampleItem(u, it, pts, box, keep));
    const byPass = new Map();
    items.forEach((it, i) => {
      const k = `${it.dt.slice(0, 10)}|${it.rel}`;
      const s = samples[i];
      const prev = byPass.get(k);
      if (!prev) byPass.set(k, { date: it.dt.slice(0, 10), doy: doyOf(y, +it.dt.slice(5, 7), +it.dt.slice(8, 10)), orbit: it.orbit, rel: it.rel, platform: it.platform, vals: [...s.vals], best: { id: it.id, cover: s.cover } });
      else { prev.vals = prev.vals.map((v, j) => v ?? s.vals[j]); if (s.cover > prev.best.cover) prev.best = { id: it.id, cover: s.cover }; }
    });
    const passes = [...byPass.values()].sort((a, b) => a.doy - b.doy);
    // Ascending and descending orbits see the ground at different angles, which offsets VH by a dB or two. For each
    // field, shift each orbit's values so its season median matches the field's overall median: the offset goes, every
    // change over time stays.
    for (let j = 0; j < pts.length; j++) {
      const all = median(passes.map((p) => p.vals[j]));
      if (all === null) continue;
      for (const rel of new Set(passes.map((p) => p.rel))) {
        const m = median(passes.filter((p) => p.rel === rel).map((p) => p.vals[j]));
        if (m === null) continue;
        for (const p of passes) if (p.rel === rel && p.vals[j] !== null) p.vals[j] = round(p.vals[j] - m + all, 2);
      }
    }
    const dets = pts.map((_, j) => detectTransplant(passes.map((p) => ({ doy: p.doy, vh: p.vals[j] })), y));
    const found = dets.filter((d) => d.status === 'detected').map((d) => d.doy);
    const med = median(found);
    const curve = passes.map((p) => {
      const v = p.vals.filter((x) => x !== null);
      return { date: p.date, doy: p.doy, platform: p.platform, orbit: p.orbit, n: v.length, med: round(median(v), 2), p25: round(quantile(v, 0.25), 2), p75: round(quantile(v, 0.75), 2) };
    }).filter((c) => c.n >= N_FIELDS / 3);
    seasons[y] = {
      passes: passes.length, platforms: [...new Set(passes.map((p) => p.platform))].sort(),
      nFields: pts.length, nDetected: found.length, transplantDoy: med === null ? null : Math.round(med),
      iqr: found.length ? [Math.round(quantile(found, 0.25)), Math.round(quantile(found, 0.75))] : null,
      rainJJ: rainJJ[y], rainProvisional: y > RAIN_FINAL_TO,
      reliable: found.length >= MIN_FIELDS,
      fields: dets.map((d) => (d.status === 'detected' ? d.doy : null)), curve,
      complete: y < END_YEAR || END >= isoDoy(y, VH_SPAN[1]),
      passList: passes.map((p) => ({ date: p.date, doy: p.doy, platform: p.platform, orbit: p.orbit })),
      fieldVh: pts.map((_, j) => passes.map((p) => p.vals[j])),
      frames: keep ? passes.filter((p) => p.best.cover >= 0.97).map((p) => ({ date: p.date, id: p.best.id, platform: p.platform, orbit: p.orbit })) : undefined,
    };
  }

  const ys = Object.entries(rainJJ).filter(([y, v]) => v !== null && +y <= RAIN_FINAL_TO);
  const mk = mannKendall(ys.map(([, v]) => v));
  const sen = senSlope(ys.map(([y]) => +y), ys.map(([, v]) => v));
  const good = Object.entries(seasons).filter(([y, s]) => +y <= NORMAL_TO && s.reliable).map(([, s]) => s.transplantDoy);
  const transplantNormal = good.length >= 4 ? median(good) : null; // needs at least 4 reliable seasons
  const rainNormal = median(Object.entries(rainJJ).filter(([y, v]) => +y <= NORMAL_TO && v !== null).map(([, v]) => v));
  details[u.id] = { u, box, fields, rain: { sources: rain.sources, version: rain.version, lat: rain.lat, lon: rain.lon, through: rainThrough }, rainJJ, rainSeason, rainJS, seasons, mk, sen, transplantNormal, rainNormal };
  console.log(`  ${u.en}: ${fields.cropland}/${fields.candidates} cropland points → ${pts.length} fields; ` +
    `${Object.values(seasons).reduce((a, s) => a + s.passes, 0)} passes; transplant normal ${transplantNormal && isoDoy(2025, Math.round(transplantNormal))}; ` +
    `Jun–Jul rain normal ${rainNormal} mm; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

if (ONLY) {
  const x = details[ONLY];
  for (const [y, s] of Object.entries(x.seasons)) console.log(y, 'transplant', s.transplantDoy && isoDoy(+y, s.transplantDoy), `${s.nDetected}/${s.nFields}`, 'passes', s.passes, 'Jun–Jul rain', s.rainJJ, s.platforms.join(' '));
  console.log('Jun–Jul rain trend', x.sen.slope * 10, 'mm/decade p', x.mk.p, 'rain through', x.rain.through);
  process.exit(0);
}

// District-level multiple testing, then the files.
const outDir = path.join(REPO, 'public', 'aman');
await mkdir(outDir, { recursive: true });
const summary = {
  provenance: {
    status: 'REAL',
    generated: new Date().toISOString().slice(0, 19) + 'Z', through: END,
    rain: 'NASA/JAXA GPM IMERG daily precipitation (IMERG_PRECTOT) via the NASA POWER API, native resolution, UTC days, at each upazila’s interior point',
    radar: 'Copernicus Sentinel-1 RTC gamma0 VH (Microsoft Planetary Computer, sentinel-1-rtc), every pass 15 Apr – 31 Oct, averaged to ~40 m; per field and season, each relative orbit shifted to a common median',
    fields: 'Esri | Impact Observatory | Microsoft Sentinel-2 10 m land cover: points that are cropland in both 2017 and 2025',
    boundaries: 'geoBoundaries gbOpen BGD ADM2/ADM3 (BBS / OCHA ROAP 2020), CC BY 3.0 IGO',
    method: 'public/radar/js/detect.js (detectTransplant) and stats.js (mannKendall, senSlope, benjaminiHochberg), unchanged; each upazila compared with its own 2017–2025 radar normal',
    licence: 'Sentinel-1: Copernicus open data; IMERG: NASA/JAXA open data; land cover: CC BY 4.0',
  },
  shiftDays: SHIFT_DAYS, normalTo: NORMAL_TO, minFields: MIN_FIELDS, rainFinalTo: RAIN_FINAL_TO, transplantRule: TRANSPLANT_RULE, years: { rain: [RAIN_FROM, END_YEAR], radar: [VH_FROM, END_YEAR] },
  districts: {},
};
for (const [did, d] of Object.entries(DISTRICTS)) {
  const list = Object.values(details).filter((x) => x.u.district === did);
  const bh = benjaminiHochberg(list.map((x) => x.mk.p), 0.1);
  summary.districts[did] = {
    bn: d.bn, en: d.en, division: d.division,
    upazilas: list.map((x, i) => {
      const tn = x.transplantNormal === null ? null : Math.round(x.transplantNormal);
      const shift = (s) => (!s.reliable || s.transplantDoy === null || tn === null ? null : s.transplantDoy - tn);
      const latest = x.seasons[END_YEAR];
      const d = latest ? shift(latest) : null;
      return {
        id: x.u.id, bn: x.u.bn, en: x.u.en, point: x.u.point.map((v) => round(v, 4)), ring: x.u.map.map(([a, b]) => [round(a, 4), round(b, 4)]),
        fields: x.fields.points.length, croplandShare: round(x.fields.cropland / x.fields.candidates, 3),
        transplantNormal: tn, rainNormal: x.rainNormal === null ? null : Math.round(x.rainNormal), rainThrough: x.rain.through,
        rainJJ: x.rainJJ,
        rainTrend: { slope: round(x.sen.slope, 3), intercept: round(x.sen.intercept, 1), perDecade: round(x.sen.slope * 10, 0), ci: [round(x.sen.lo * 10, 0), round(x.sen.hi * 10, 0)], p: round(x.mk.p, 4), S: x.mk.S, q: round(bh.adjusted[i], 4), significant: !!bh.significant[i] },
        seasons: Object.fromEntries(Object.entries(x.seasons).map(([y, s]) => [y, { transplantDoy: s.transplantDoy, iqr: s.iqr, nDetected: s.nDetected, nFields: s.nFields, reliable: s.reliable, passes: s.passes, rainJJ: s.rainJJ, rainProvisional: s.rainProvisional, shift: shift(s), complete: s.complete }])),
        shift: d,
        category: d === null ? 'none' : d < -SHIFT_DAYS ? 'early' : d > SHIFT_DAYS ? 'late' : 'on track',
      };
    }),
  };
}
await writeFile(path.join(REPO, 'src', 'data', 'aman_radar.json'), JSON.stringify(summary));

const unionRings = {};
for (const id of FRAMES_FOR) {
  const places = JSON.parse(await readFile(path.join(REPO, 'src', 'data', 'geo', `${id}_places.json`), 'utf8'));
  unionRings[id] = places.unions.map((u) => ({ en: u.en, bn: u.bn, ring: u.ring.map(([lat, lon]) => [lon, lat]) }));
}
for (const x of Object.values(details)) {
  const frames = [];
  const last = x.seasons[END_YEAR];
  for (const f of last?.frames ?? []) {
    const src = path.join(CACHE, 'png', x.u.id, `${f.id}.png`);
    const dst = path.join(outDir, x.u.id, `${f.date}.webp`);
    await mkdir(path.dirname(dst), { recursive: true });
    if (!existsSync(dst)) execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '480', '0', '-alpha_q', '60', src, '-o', dst]);
    frames.push({ date: f.date, platform: f.platform, orbit: f.orbit, file: `${x.u.id}/${f.date}.webp` });
  }
  await writeFile(path.join(outDir, `${x.u.id}.json`), JSON.stringify({
    id: x.u.id, through: END, box: x.box.b, fields: x.fields.points, croplandShare: round(x.fields.cropland / x.fields.candidates, 3),
    fieldUnion: unionRings[x.u.id] ? x.fields.points.map(([lon, lat]) => unionRings[x.u.id].find((u) => inside(lon, lat, u.ring))?.en ?? null) : null,
    unions: unionRings[x.u.id]?.map((u) => ({ en: u.en, bn: u.bn })) ?? null,
    rain: { ...x.rain, from: VH_SPAN[0], seasons: x.rainSeason, junSep: x.rainJS, rainFinalTo: RAIN_FINAL_TO },
    seasons: Object.fromEntries(Object.entries(x.seasons).map(([y, s]) => [y, { curve: s.curve, fields: s.fields, platforms: s.platforms, passes: s.passList, fieldVh: s.fieldVh }])),
    frames: { year: END_YEAR, list: frames },
  }));
}
const size = (await stat(path.join(REPO, 'src', 'data', 'aman_radar.json'))).size;
console.log(`wrote src/data/aman_radar.json (${Math.round(size / 1024)} KB) and public/aman/*.json`);
