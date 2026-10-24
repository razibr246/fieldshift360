// Shared by the scripts that read NASA GIBS layers back into numbers (fetch-gibs-water.mjs, fetch-sedac.mjs).
// GIBS serves each layer as a colour-mapped PNG; decodePng reads the pixels and colourMap turns each colour back into
// the value class it stands for, using the layer's own published GIBS colour map.
// Docs: https://nasa-gibs.github.io/gibs-api-docs/
import { inflateSync } from 'node:zlib';

export const WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

// ---- PNG (8-bit RGBA, RGB or palette) ----
export function decodePng(buf) {
  let p = 8, w, h, type, pal = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), kind = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8) throw new Error('bit depth'); type = data[9]; }
    else if (kind === 'PLTE') pal = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const bpp = { 2: 3, 3: 1, 6: 4 }[type];
  if (!bpp) throw new Error(`colour type ${type}`);
  const raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = new Uint8Array(w * h * 4), prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= bpp ? cur[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      const pr = () => { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
      cur[x] = (v + [0, a, b, (a + b) >> 1, pr()][f]) & 255;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (type === 3) { const i = cur[x]; out[o] = pal[i * 3]; out[o + 1] = pal[i * 3 + 1]; out[o + 2] = pal[i * 3 + 2]; out[o + 3] = trns && i < trns.length ? trns[i] : 255; }
      else { out[o] = cur[x * bpp]; out[o + 1] = cur[x * bpp + 1]; out[o + 2] = cur[x * bpp + 2]; out[o + 3] = bpp === 4 ? cur[x * bpp + 3] : 255; }
    }
    prev.set(cur);
  }
  return { w, h, px: out };
}

// ---- GIBS colour map: rgb → the middle of its value class ----
// Classes come as ranges ("[lo,hi)") or single values ("[v]", for category layers). With `{ classes: true }` the map
// gives [lo, hi] instead of the middle, so an open-ended top class ("1000 and more") can be counted as "at least".
export async function colourMap(name, { classes = false } = {}) {
  const xml = await (await fetch(`https://gibs.earthdata.nasa.gov/colormaps/v1.3/${name}.xml`)).text();
  const map = new Map();
  for (const m of xml.matchAll(/<ColorMapEntry rgb="(\d+),(\d+),(\d+)" transparent="(true|false)"[^>]*?value="\[([^,\]]+)(?:,([^)\]]+))?[)\]]"/g)) {
    if (m[4] === 'true') continue;
    let lo = Number(m[5]), hi = m[6] === undefined ? lo : Number(m[6]);
    if (!Number.isFinite(lo)) lo = hi; if (!Number.isFinite(hi)) hi = lo; // open-ended end classes: their finite edge
    map.set(`${m[1]},${m[2]},${m[3]}`, classes ? [lo, hi] : (lo + hi) / 2);
  }
  if (!map.size) throw new Error(`no colour map for ${name}`);
  return map;
}

// One GetMap image of a layer over a box (EPSG:4326, south/west/north/east in degrees), decoded; retried a few times.
export async function getMap(layer, { s, w, n, e }, width, height, time) {
  const q = new URLSearchParams({ SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', LAYERS: layer, CRS: 'EPSG:4326', BBOX: `${s},${w},${n},${e}`, WIDTH: width, HEIGHT: height, FORMAT: 'image/png', ...(time ? { TIME: time } : {}) });
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(`${WMS}?${q}`, { signal: AbortSignal.timeout(60_000) });
      if (r.ok && r.headers.get('content-type')?.includes('png')) return decodePng(Buffer.from(await r.arrayBuffer()));
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1500 * (k + 1)));
  }
  return null;
}
