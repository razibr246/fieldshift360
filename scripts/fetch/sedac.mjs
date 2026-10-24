#!/usr/bin/env node
// Read three NASA SEDAC data sets (through NASA GIBS, no login needed) over each of the app's seven upazilas and
// write src/data/region/sedac.json:
//
//   node scripts/fetch/sedac.mjs
//
// GPW_Population_Density_2020: Gridded Population of the World v4.11 (CIESIN / NASA SEDAC), people per km², 2020.
//   GIBS classes it in steps up to "1000 and more", so the result is the share of the upazila at 1000+ people/km²
//   and the median class; it is not used to count people (the census does that).
// LECZ_Urban_Rural_Extents_Below_10m: Low Elevation Coastal Zones v3 (NASA SEDAC), land in the coastal zone that
//   lies below 10 m: the land that storm surges, tidal floods and salt water reach first.
// Agricultural_Lands_Croplands_2000: Global Agricultural Lands (Ramankutty et al. 2008, NASA SEDAC), share of each
//   cell under crops around 2000.
// Each upazila's own boundary (src/data/geo/<id>_boundary.json, BBS/OCHA via geoBoundaries) picks the pixels,
// 0.005° (about 550 m) across, that count.
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { colourMap, getMap } from '../lib/gibs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IDS = ['dhamrai', 'godagari', 'bakerganj', 'sitakunda', 'dacope', 'gangachara', 'gowainghat'];
const RES = 0.005;
const LAYERS = {
  density: { id: 'GPW_Population_Density_2020', dataset: 'Gridded Population of the World (GPW) v4.11, population density 2020, CIESIN / NASA SEDAC', url: 'https://sedac.ciesin.columbia.edu/data/collection/gpw-v4' },
  lecz: { id: 'LECZ_Urban_Rural_Extents_Below_10m', dataset: 'Low Elevation Coastal Zones (LECZ) v3, urban and rural land below 10 m, CIESIN / NASA SEDAC', url: 'https://sedac.ciesin.columbia.edu/data/set/lecz-low-elevation-coastal-zones' },
  cropland: { id: 'Agricultural_Lands_Croplands_2000', dataset: 'Global Agricultural Lands: Croplands, 2000 (Ramankutty et al. 2008), NASA SEDAC', url: 'https://sedac.ciesin.columbia.edu/data/set/aglands-croplands-2000' },
};

// Ray casting: is (lat, lon) inside the ring of [lat, lon] points?
function inside(ring, lat, lon) {
  let yes = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ya, xa] = ring[i], [yb, xb] = ring[j];
    if ((ya > lat) !== (yb > lat) && lon < ((xb - xa) * (lat - ya)) / (yb - ya) + xa) yes = !yes;
  }
  return yes;
}

const maps = {
  density: await colourMap(LAYERS.density.id, { classes: true }),
  lecz: await colourMap(LAYERS.lecz.id, { classes: true }),
  cropland: await colourMap(LAYERS.cropland.id),
};
const out = {
  provenance: {
    status: 'REAL', service: 'NASA GIBS WMS (EPSG:4326), the layers NASA SEDAC publishes there', url: 'https://nasa-gibs.github.io/gibs-api-docs/',
    layers: Object.fromEntries(Object.entries(LAYERS).map(([k, v]) => [k, { layer: v.id, dataset: v.dataset, url: v.url }])),
    method: `pixels of ${RES}° (about 550 m) inside each upazila's BBS/OCHA boundary; colours turned back into values with each layer's GIBS colour map`,
    retrieved: new Date().toISOString().slice(0, 10),
  },
  upazilas: {},
};

for (const id of IDS) {
  const b = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'geo', `${id}_boundary.json`), 'utf8'));
  const lats = b.ring.map((p) => p[0]), lons = b.ring.map((p) => p[1]);
  const box = { s: Math.min(...lats) - RES, w: Math.min(...lons) - RES, n: Math.max(...lats) + RES, e: Math.max(...lons) + RES };
  const W = Math.round((box.e - box.w) / RES), H = Math.round((box.n - box.s) / RES);
  const img = {};
  for (const k of Object.keys(LAYERS)) {
    img[k] = await getMap(LAYERS[k].id, box, W, H);
    if (!img[k]) throw new Error(`${LAYERS[k].id}: no image for ${id}`);
  }
  let cells = 0, dense = 0, low = 0, cropSum = 0, cropN = 0;
  const classes = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lat = box.n - (y + 0.5) * RES, lon = box.w + (x + 0.5) * RES;
    if (!inside(b.ring, lat, lon)) continue;
    cells++;
    const o = (y * W + x) * 4;
    const at = (k) => (img[k].px[o + 3] < 128 ? null : maps[k].get(`${img[k].px[o]},${img[k].px[o + 1]},${img[k].px[o + 2]}`) ?? null);
    const d = at('density');
    if (d) { classes.push(d); if (d[0] >= 1000) dense++; }
    if (at('lecz')) low++; // drawn only where the land is below 10 m
    const c = at('cropland');
    if (c != null) { cropSum += c; cropN++; }
  }
  classes.sort((p, q) => p[0] - q[0]);
  const mid = classes[classes.length >> 1];
  out.upazilas[id] = {
    cells,
    density: { share1000Plus: Math.round((dense / Math.max(1, classes.length)) * 1000) / 1000, medianClass: mid, cells: classes.length },
    leczShare: Math.round((low / cells) * 1000) / 1000,
    croplandShare: cropN ? Math.round((cropSum / cropN) * 1000) / 1000 : null,
  };
  const u = out.upazilas[id];
  console.log(`${id.padEnd(11)} ${cells} cells · 1000+/km²: ${(u.density.share1000Plus * 100).toFixed(0)}% (median class ${mid}) · below 10 m: ${(u.leczShare * 100).toFixed(0)}% · cropland: ${u.croplandShare == null ? '–' : (u.croplandShare * 100).toFixed(0) + '%'}`);
}
await writeFile(path.join(ROOT, 'src', 'data', 'region', 'sedac.json'), JSON.stringify(out));
