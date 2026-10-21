import { useEffect, useRef } from 'react';
import { CircleMarker, Tooltip, Circle, useMap } from 'react-leaflet';
import MapFrame from './MapFrame';
import UpazilaBoundary from './UpazilaBoundary';
import { AreaFocus, areaInfo } from './UpazilaLayers';
import { upazilaAt } from '../../data/upazilas';
import { useStore } from '../../store';

export { BASEMAPS } from './MapFrame';

// MapContainer only reads `center` on mount; this keeps the view in step when the selected farm or union changes.
// With `bounds`, the view fits that area instead (straight away on first show, with a glide after that).
export function Recenter({ center, zoom, bounds }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (bounds) map[first.current ? 'fitBounds' : 'flyToBounds'](bounds, { padding: [24, 24], duration: 0.9 });
    else if (first.current) map.setView(center, zoom ?? map.getZoom());
    else map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.9 });
    first.current = false;
  }, [center[0], center[1], zoom, bounds]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// points: [{id, lat, lon, color, r, label, onClick, ring}]
// upazila: draw the dashed upazila boundary (true = the upazila under `center`, or an upazila id).
// bounds: fit the view to this area instead of center/zoom.
// focus: a union or municipality id; the map fits to it, outlines it, dims everything else and names its villages.
export default function MapView({ center, zoom = 13, bounds, upazila = true, focus, focusLabels = true, points = [], circles = [], height = 260, className = '', basemap = 'map', label, overlay, children }) {
  const { s } = useStore();
  const area = focus ? areaInfo(focus) : null;
  const upz = typeof upazila === 'string' ? upazila : upazilaAt(center[0], center[1]);
  return (
    <MapFrame center={center} zoom={zoom} height={height} className={className} basemap={basemap} label={label} locateZoom={15} overlay={overlay}>
      <Recenter center={center} zoom={zoom} bounds={bounds ?? area?.bounds} />
      {upazila && <UpazilaBoundary upazila={upz} mask={!area} />}
      {area && <AreaFocus id={focus} lang={s.lang} labels={focusLabels} />}
      {children}
      {circles.map((c) => (
        <Circle key={c.id} center={[c.lat, c.lon]} radius={c.radius} pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: 0.12, weight: 2, dashArray: '6 4' }} />
      ))}
      {points.map((p) => (
        <CircleMarker key={p.id} center={[p.lat, p.lon]} radius={p.r ?? 6}
          pathOptions={{ color: p.ring ?? '#ffffff', weight: p.ring ? 3 : 1.5, fillColor: p.color, fillOpacity: 0.95 }}
          eventHandlers={p.onClick ? { click: p.onClick } : undefined}>
          {p.label && <Tooltip direction="top" offset={[0, -6]}>{p.label}</Tooltip>}
        </CircleMarker>
      ))}
    </MapFrame>
  );
}
