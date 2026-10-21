// A whole upazila outlined as a dashed line, with everything outside it gently dimmed so the upazila reads as one
// area. Boundaries: Bangladesh Bureau of Statistics via geoBoundaries (see the data files).
import L from 'leaflet';
import { Polygon, Tooltip } from 'react-leaflet';
import { useStore } from '../../store';
import { num } from '../../engine/dates';
import { GEO } from '../../data/geo';

export const upazilaBoundary = (id = 'godagari') => GEO[id].boundary;
const BOUNDS = new Map();
export const upazilaBounds = (id = 'godagari') => {
  if (!BOUNDS.has(id)) BOUNDS.set(id, L.latLngBounds(GEO[id].boundary.ring));
  return BOUNDS.get(id);
};
const WORLD = [[-85, -180], [-85, 180], [85, 180], [85, -180]];

// Is this point inside the upazila? (ray casting on the boundary ring)
export function insideUpazila(lat, lon, id = 'godagari') {
  const r = GEO[id].boundary.ring;
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [y1, x1] = r[i], [y2, x2] = r[j];
    if ((y1 > lat) !== (y2 > lat) && lon < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) c = !c;
  }
  return c;
}

export default function UpazilaBoundary({ upazila = 'godagari', mask = true }) {
  const { T, s } = useStore();
  const B = GEO[upazila].boundary;
  return (
    <>
      {mask && <Polygon positions={[WORLD, B.ring]} interactive={false} pathOptions={{ stroke: false, fillColor: '#0d2614', fillOpacity: 0.2 }} />}
      {/* A soft white halo under the dashes keeps the line readable on both the street map and the satellite photo. */}
      <Polygon positions={B.ring} interactive={false} pathOptions={{ color: '#ffffff', weight: 6, opacity: 0.7, fill: false, lineJoin: 'round' }} />
      <Polygon positions={B.ring} pathOptions={{ color: '#13261b', weight: 2.5, dashArray: '10 8', fill: false, lineCap: 'round', lineJoin: 'round' }}>
        <Tooltip sticky>
          {T(`${B.name.bn} উপজেলার সীমানা · আয়তন ${num(B.areaOfficialKm2, s.lang, { dp: 2 })} বর্গ কিমি (সরকারি)`, `${B.name.en} upazila boundary · ${B.areaOfficialKm2} km² (official)`)}
        </Tooltip>
      </Polygon>
    </>
  );
}
