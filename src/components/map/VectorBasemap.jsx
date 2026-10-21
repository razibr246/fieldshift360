// A vector basemap drawn on the GPU (MapLibre inside Leaflet), so roads, rivers and labels stay razor-sharp at any
// zoom and on any screen density, instead of stretched 256 px image tiles. Tiles: OpenFreeMap (OpenStreetMap data,
// free, no key). MapLibre is loaded only when this layer is shown, and any failure (no WebGL, offline) calls onError
// so the frame falls back to ordinary image tiles.
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
// MapLibre's tile worker, bundled by Vite into one file (its own imports included) and handed over by URL.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// MapLibre cannot shape Bangla script (conjuncts break), so its own labels stay Latin; Bangla names come from the
// app's HTML label layers, which the browser shapes properly.
const latinOnly = (style) => {
  style.layers.forEach((l) => {
    const tf = l.layout?.['text-field'];
    if (tf && JSON.stringify(tf).includes('name')) l.layout['text-field'] = ['coalesce', ['get', 'name:latin'], ['get', 'name_en'], ['get', 'name:en']];
  });
  return style;
};

export default function VectorBasemap({ styleUrl, attribution, onError }) {
  const map = useMap();
  useEffect(() => {
    let layer = null;
    let gone = false;
    (async () => {
      try {
        const [ml, { maplibreGL }, style] = await Promise.all([
          import('maplibre-gl'),
          import('@maplibre/maplibre-gl-leaflet'),
          fetch(styleUrl).then((r) => { if (!r.ok) throw new Error(`style ${r.status}`); return r.json(); }),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ]);
        if (gone) return;
        ml.setWorkerUrl(workerUrl);
        layer = maplibreGL({
          style: latinOnly(style), attribution, interactive: false,
          // Render at least at 2× even on ordinary screens: crisper lines and text, like a supersampled image.
          pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
          fadeDuration: 150,
        }).addTo(map); // throws here when WebGL is unavailable
      } catch {
        if (!gone) onError?.();
      }
    })();
    return () => {
      gone = true;
      if (!layer) return;
      // The bridge adds the style's credit line after the style loads and never takes it back; remove it with the layer.
      const credit = layer.getAttribution?.();
      map.removeLayer(layer);
      if (credit) map.attributionControl?.removeAttribution(credit);
    };
  }, [map, styleUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
