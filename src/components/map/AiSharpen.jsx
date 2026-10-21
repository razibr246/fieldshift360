// "AI clear-up" for a satellite photo shown past its deepest real zoom: the real photo pixels under the view are
// stitched at their own resolution, made 4× sharper by the in-browser Real-ESRGAN model (src/ai/superres.js), and
// laid over the map exactly where they came from. Redone when the map stops moving. Held in memory only.
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { stitch, upscale4 } from '../../ai/superres';

const PANE = 'fs-ai';

// source: { url(z, x, y), z } — the photo tiles and their deepest real zoom. onState({ phase, progress, error }).
export default function AiSharpen({ source, onState }) {
  const map = useMap();
  const layer = useRef(null);
  useEffect(() => {
    if (!map.getPane(PANE)) { const p = map.createPane(PANE); p.style.zIndex = 250; p.style.pointerEvents = 'none'; }
    let ctl = null, t = null, url = null;
    const run = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        ctl?.abort();
        const ac = new AbortController();
        ctl = ac;
        if (map.getZoom() <= source.z) { onState?.({ phase: 'idle' }); return; }
        const b = map.getBounds().pad(0.12);
        try {
          onState?.({ phase: 'work', progress: 0 });
          const { canvas, bounds } = await stitch(source.url, source.z, [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]], { signal: ac.signal, maxPx: 640 });
          const big = await upscale4(canvas, { signal: ac.signal, onProgress: (p) => onState?.({ phase: 'work', progress: p }) });
          const blob = await new Promise((ok) => big.toBlob(ok, 'image/jpeg', 0.92));
          if (ac.signal.aborted) return;
          const next = URL.createObjectURL(blob);
          const ov = L.imageOverlay(next, bounds, { pane: PANE, interactive: false, className: 'fs-ai-img' }).addTo(map);
          if (layer.current) layer.current.remove();
          if (url) URL.revokeObjectURL(url);
          layer.current = ov; url = next;
          onState?.({ phase: 'done' });
        } catch (e) {
          if (e.name !== 'AbortError') onState?.({ phase: 'error', error: String(e.message || e) });
        }
      }, 350);
    };
    run();
    map.on('moveend', run);
    return () => {
      clearTimeout(t); ctl?.abort(); map.off('moveend', run);
      layer.current?.remove(); layer.current = null;
      if (url) URL.revokeObjectURL(url);
    };
  }, [map, source.z, source.key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
