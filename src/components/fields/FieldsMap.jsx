// Every field a farmer works, on one satellite map: it opens fitted to all of them (they can be far apart), each
// numbered and coloured by how it looks from space; picking one flies to it.
import { useMemo } from 'react';
import L from 'leaflet';
import { Marker, Polygon, Tooltip } from 'react-leaflet';
import { Maximize } from 'lucide-react';
import { LEVEL_LOOK } from './look';
import { useStore } from '../../store';
import MapFrame from '../map/MapFrame';
import { Recenter } from '../map/MapView';
import UpazilaBoundary from '../map/UpazilaBoundary';
import { plotSquare } from '../../engine/world';
import { bnDigits } from '../../engine/dates';

export { LEVEL_LOOK } from './look';

const numIcon = (n, color, selected, lang) => L.divIcon({
  className: 'fs-field-num',
  html: `<span style="display:grid;place-items:center;width:${selected ? 34 : 28}px;height:${selected ? 34 : 28}px;border-radius:999px;background:${color};color:#fff;font:700 ${selected ? 15 : 13}px/1 system-ui,sans-serif;border:3px solid ${selected ? '#edc067' : '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.35)">${lang === 'bn' ? bnDigits(n) : n}</span>`,
  iconSize: [selected ? 34 : 28, selected ? 34 : 28], iconAnchor: [selected ? 17 : 14, selected ? 17 : 14],
});

export default function FieldsMap({ parcels, levels, selectedId, focusAll, onSelect, onShowAll, height = 420, upazila }) {
  const { s, T, L: tr } = useStore();
  const squares = useMemo(() => Object.fromEntries(parcels.map((p) => [p.id, plotSquare(p.lat, p.lon, p.area_dec)])), [parcels]);
  const sel = parcels.find((p) => p.id === selectedId);
  const bounds = useMemo(() => {
    const pts = focusAll || !sel ? parcels.flatMap((p) => squares[p.id]) : squares[sel.id];
    if (!pts.length) return null;
    const b = L.latLngBounds(pts);
    return focusAll || !sel ? b.pad(0.25) : b.pad(2.2);
  }, [parcels, squares, sel, focusAll]);
  const c = parcels[0] ? [parcels[0].lat, parcels[0].lon] : [24, 90];
  return (
    <MapFrame center={c} zoom={13} height={height} basemap="satellite" label={T('আমার সব জমির মানচিত্র', 'Map of all my fields')} locateZoom={16}
      overlay={!focusAll && sel && parcels.length > 1 ? (
        <button type="button" onClick={onShowAll} className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-[13px] font-semibold shadow-md hover:bg-white"><Maximize size={15} />{T('সব জমি একসাথে', 'All fields')}</button>
      ) : null}>
      {bounds && <Recenter center={c} bounds={bounds} />}
      {upazila && <UpazilaBoundary upazila={upazila} mask={false} />}
      {parcels.map((p, i) => {
        const look = LEVEL_LOOK[levels[p.id] ?? 'none'];
        const on = p.id === selectedId;
        return (
          <Polygon key={p.id} positions={squares[p.id]} eventHandlers={{ click: () => onSelect(p.id) }}
            pathOptions={{ color: on ? '#edc067' : '#ffffff', weight: on ? 3.5 : 2.5, dashArray: p.pending ? '6 5' : undefined, fillColor: look.color, fillOpacity: 0.3 }}>
            <Tooltip direction="top">{`${i + 1}. ${tr(p.name)}`}</Tooltip>
          </Polygon>
        );
      })}
      {parcels.map((p, i) => (
        <Marker key={`n-${p.id}`} position={[p.lat, p.lon]} icon={numIcon(i + 1, LEVEL_LOOK[levels[p.id] ?? 'none'].color, p.id === selectedId, s.lang)}
          eventHandlers={{ click: () => onSelect(p.id) }} keyboard title={`${i + 1}. ${tr(p.name)}`} zIndexOffset={p.id === selectedId ? 500 : 0} />
      ))}
    </MapFrame>
  );
}
