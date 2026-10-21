// "Sentinel-2" map type: the clearest Copernicus Sentinel-2 picture (10 m, three times sharper than NASA HLS's 30 m)
// for a chosen month, mosaicked by Microsoft Planetary Computer (public, no key). Drawn as 512-pixel retina tiles
// so it stays crisp on phone screens. A month's picture is the least cloudy pass of that month over the area.
import { useEffect, useState } from 'react';
import { TileLayer } from 'react-leaflet';

const PC = 'https://planetarycomputer.microsoft.com/api/data/v1/mosaic';
const searches = new Map();

// The months to offer: the last 30 days, then the five most recent months outside the cloudy monsoon (Jun–Aug).
export function s2Windows(today) {
  const d = new Date(today);
  const iso = (t) => new Date(t).toISOString().slice(0, 10);
  const out = [{ id: 'recent', from: iso(today - 30 * 864e5), to: iso(today), mid: today, recent: true }];
  for (let k = 1; out.length < 6 && k < 14; k++) {
    const y = d.getUTCFullYear(), m = d.getUTCMonth() - k;
    const start = Date.UTC(y, m, 1), end = Date.UTC(y, m + 1, 0);
    const mm = new Date(start).getUTCMonth();
    if (mm >= 5 && mm <= 7) continue;
    out.push({ id: iso(start).slice(0, 7), from: iso(start), to: iso(end), mid: start + 14 * 864e5 });
  }
  return out;
}

async function register(bbox, from, to) {
  const key = `${bbox.join(',')}|${from}|${to}`;
  if (!searches.has(key)) {
    const [w, s, e, n] = bbox;
    const body = {
      collections: ['sentinel-2-l2a'], 'filter-lang': 'cql2-json',
      filter: { op: 'and', args: [
        { op: 's_intersects', args: [{ property: 'geometry' }, { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] }] },
        { op: 'anyinteracts', args: [{ property: 'datetime' }, { interval: [`${from}T00:00:00Z`, `${to}T23:59:59Z`] }] },
        { op: '<=', args: [{ property: 'eo:cloud_cover' }, 40] },
      ] },
      sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
    };
    searches.set(key, fetch(`${PC}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`register ${r.status}`)))).then((j) => j.searchid)
      .catch((e) => { searches.delete(key); throw e; }));
  }
  return searches.get(key);
}

const S2_LOOK = { collection: 'sentinel-2-l2a', assets: 'visual', color_formula: 'sigmoidal RGB 4 0.35 saturation 1.15' };
// Plain 256-pixel tiles at a given zoom, for the AI clear-up (it wants the real pixels, not smoothed ones).
export const s2Tile = (sid) => (z, x, y) => `${PC}/${sid}/tiles/WebMercatorQuad/${z}/${x}/${y}.png?${new URLSearchParams({ ...S2_LOOK, nodata: '0' })}`;

export function Sentinel2Layer({ bbox, win, onError, onSearch }) {
  const [sid, setSid] = useState(null);
  const bkey = bbox.join(',');
  useEffect(() => {
    let alive = true;
    setSid(null);
    register(bbox, win.from, win.to).then((x) => { if (alive) { setSid(x); onSearch?.(x); } }).catch(() => alive && onError?.());
    return () => { alive = false; };
  }, [bkey, win.from, win.to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!sid) return null;
  const q = new URLSearchParams({ ...S2_LOOK, reproject: 'cubic', nodata: '0' });
  return (
    <TileLayer key={sid} url={`${PC}/${sid}/tiles/WebMercatorQuad/{z}/{x}/{y}@2x.png?${q}`} tileSize={512} zoomOffset={-1} minZoom={3} maxNativeZoom={18} maxZoom={21}
      keepBuffer={4} className="swap-in" attribution={`Contains modified Copernicus Sentinel data ${win.to.slice(0, 4)} · Microsoft Planetary Computer`} />
  );
}
