// What lies inside an upazila, drawn over the map: union outlines and names, every village and station (names appear
// as you zoom in), and what the land is used for, coloured from the yearly Sentinel-2 land-cover map.
// Sources are in the provenance blocks of the data files.
import { Fragment, useMemo, useState } from 'react';
import L from 'leaflet';
import { ImageOverlay, Marker, Pane, Polygon, useMap, useMapEvents } from 'react-leaflet';
import { GEO } from '../../data/geo';

export const placesOf = (upazila = 'godagari') => GEO[upazila].places;
// Land cover for every upazila that has it built (scripts/data/build_godagari_landcover.py <upazila>): the class table
// in src/data/geo/<upazila>_landcover.json and one image per year. Classes under 0.5 km² are left out.
const LC_JSON = import.meta.glob('../../data/geo/*_landcover.json', { eager: true, import: 'default' });
const LC_PNG = import.meta.glob('../../assets/maps/*-landcover-*.png', { eager: true, import: 'default' });
const LC = Object.fromEntries(Object.entries(LC_JSON).map(([path, data]) => {
  const id = path.match(/([a-z]+)_landcover\.json$/)[1];
  const images = Object.fromEntries(data.years.map((y) => [y, LC_PNG[`../../assets/maps/${id}-landcover-${y}.png`]]));
  return [id, { data, images, classes: data.classes.filter((c) => Math.max(c.km2['2017'], c.km2['2025']) >= 0.5) }];
}));
export const landcoverOf = (upazila = 'godagari') => LC[upazila] ?? null;
const ALL_UNIONS = Object.values(GEO).flatMap((g) => g.places.unions.map((u) => ({ u, places: g.places.places })));

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icons = new Map(); // one icon per label, so panning does not rebuild every marker
const label = (cls, html) => {
  const k = cls + html;
  if (!icons.has(k)) icons.set(k, L.divIcon({ className: `fs-place ${cls}`, html, iconSize: [0, 0] }));
  return icons.get(k);
};

export function LandCoverLayer({ upazila = 'godagari', year = 2025, opacity = 0.6 }) {
  const lc = LC[upazila];
  if (!lc) return null;
  // Its own pane under the vector layer, so the dots, circles and boundary stay on top of the colours.
  return (
    <Pane name="landcover" style={{ zIndex: 350 }}>
      <ImageOverlay key={upazila} url={lc.images[year]} bounds={lc.data.bounds} opacity={opacity} className="fs-landcover" interactive={false} />
    </Pane>
  );
}

// Union and municipality outlines with their Bangla names; `highlight` (English union name) gets a filled tag.
export function UnionLayer({ upazila = 'godagari', lang, highlight }) {
  return GEO[upazila].places.unions.map((u) => {
    const on = u.en === highlight;
    const name = lang === 'bn' ? u.bn : u.en;
    return (
      <Fragment key={u.en}>
        <Polygon positions={u.ring} interactive={false} pathOptions={{ color: '#ffffff', weight: on ? 2.5 : 1.3, opacity: on ? 0.95 : 0.75, fill: false, dashArray: u.town ? '4 4' : undefined }} />
        <Marker position={u.label} interactive={false} keyboard={false} zIndexOffset={500}
          icon={label(`fs-union${u.town ? ' fs-town' : ''}${on ? ' fs-mine' : ''}`, `<span>${esc(name)}</span>`)} />
      </Fragment>
    );
  });
}

// Villages from zoom 13, stations, beels and localities from zoom 12; only those on screen are drawn.
export function VillageLayer({ upazila = 'godagari' }) {
  const map = useMap();
  const [view, setView] = useState(() => ({ z: map.getZoom(), b: map.getBounds() }));
  useMapEvents({ moveend: () => setView({ z: map.getZoom(), b: map.getBounds().pad(0.15) }), zoomend: () => setView({ z: map.getZoom(), b: map.getBounds().pad(0.15) }) });
  const shown = useMemo(() => GEO[upazila].places.places.filter((p) => (p.k === 'village' ? view.z >= 13 : view.z >= 12) && view.b.contains(p.p)), [view, upazila]);
  return shown.map((p) => (
    <Marker key={`${p.n}-${p.p[0]}-${p.p[1]}`} position={p.p} interactive={false} keyboard={false}
      icon={label(`fs-${p.k}`, `<i></i><span>${esc(p.n)}</span>`)} />
  ));
}

// ---- One union or municipality in focus: its outline, the rest dimmed, its name and every village labelled ----
const WORLD = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
const ringKm2 = (ring) => {
  const R = 6371.0088, rad = Math.PI / 180;
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [y1, x1] = ring[j], [y2, x2] = ring[i];
    a += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((a * R * R) / 2);
};
const INFO = new Map();
// Boundary, bounds, villages and area of a union or municipality, by its id (the English name in the data).
export function areaInfo(id) {
  if (!INFO.has(id)) {
    const hit = ALL_UNIONS.find((x) => x.u.en === id);
    const u = hit?.u;
    INFO.set(id, u ? { ...u, bounds: L.latLngBounds(u.ring), km2: ringKm2(u.ring), villages: hit.places.filter((p) => p.u === id) } : null);
  }
  return INFO.get(id);
}

export function AreaFocus({ id, lang, labels = true }) {
  const a = areaInfo(id);
  if (!a) return null;
  return (
    <>
      <Polygon positions={[WORLD, a.ring]} interactive={false} pathOptions={{ stroke: false, fillColor: '#0d2614', fillOpacity: 0.42 }} />
      <Polygon positions={a.ring} interactive={false} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.85, fill: false, lineJoin: 'round' }} />
      <Polygon positions={a.ring} interactive={false} pathOptions={{ color: '#e0a12b', weight: 3, fill: false, lineJoin: 'round' }} />
      {labels && <FocusVillages villages={a.villages} />}
      <Marker position={a.label} interactive={false} keyboard={false} zIndexOffset={800}
        icon={label('fs-union fs-mine fs-focus', `<span>${esc(lang === 'bn' ? a.bn : a.en)}</span>`)} />
    </>
  );
}

// Village names inside the focused area. Names that would overlap one already placed are hidden at this zoom (their
// dot stays), so the map never turns into a pile of text; zooming in brings them back.
function FocusVillages({ villages }) {
  const map = useMap();
  const [z, setZ] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZ(map.getZoom()) });
  const shown = useMemo(() => {
    const kept = [];
    const order = [...villages].sort((p, q) => (p.k === 'village' ? 0 : 1) - (q.k === 'village' ? 0 : 1) || p.n.length - q.n.length);
    return new Set(order.filter((p) => {
      const pt = map.project(p.p, z);
      const box = { x0: pt.x - 4, y0: pt.y - 9, x1: pt.x + 10 + p.n.length * 6.6, y1: pt.y + 9 };
      if (kept.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) return false;
      kept.push(box);
      return true;
    }));
  }, [villages, z, map]);
  return villages.map((p) => (
    <Marker key={`${p.n}-${p.p[0]}`} position={p.p} interactive={false} keyboard={false}
      icon={label(`fs-${p.k} fs-in`, shown.has(p) ? `<i></i><span>${esc(p.n)}</span>` : '<i></i>')} />
  ));
}
