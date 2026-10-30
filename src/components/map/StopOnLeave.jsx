// Leaving a page while its map is still flying or zooming made Leaflet throw ("reading '_leaflet_pos'"): the zoom
// animation finishes on a timer about 250 ms later, after the map's panes are gone. Placed inside a MapContainer, this
// stops any running animation and marks the map as not zooming as it is taken down, so the late timer does nothing.
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function StopOnLeave() {
  const map = useMap();
  useEffect(() => () => {
    try { map.stop(); } catch { /* already removed */ }
    map._animatingZoom = false; // Leaflet's own check in _onZoomTransitionEnd
  }, [map]);
  return null;
}
