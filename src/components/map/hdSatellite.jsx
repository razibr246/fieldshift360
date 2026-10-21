// Optional high-detail satellite sources. Each one switches on only when its key is set in `.env.local`:
//   VITE_GOOGLE_MAPS_KEY=...   Google Map Tiles API (2D satellite, often the sharpest imagery in Bangladesh)
//   VITE_MAPBOX_TOKEN=...      Mapbox Satellite
// Without keys the app keeps using the free Esri imagery.
import { useEffect, useRef, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

export const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const mapboxLayer = () => ({
  // @2x gives 512px tiles drawn into 256px slots: crisp on phone screens.
  url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${MAPBOX_TOKEN}`,
  maxNativeZoom: 22,
  attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; Maxar &copy; OpenStreetMap',
});

// ---- Google Map Tiles API: a session token is created once and reused until it expires (about two weeks). ----
const SESSION_KEY = 'fs360.gmapSession.v1';
async function googleSession(labels) {
  const id = labels ? 'hybrid' : 'satellite';
  try {
    const cached = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}')[id];
    if (cached && cached.expiry * 1000 > Date.now() + 3600e3) return cached.session;
  } catch { /* storage unavailable */ }
  const body = { mapType: 'satellite', language: 'bn-BD', region: 'BD', scale: 'scaleFactor2x', highDpi: true, ...(labels ? { layerTypes: ['layerRoadmap'] } : {}) };
  const r = await fetch(`https://tile.googleapis.com/v1/createSession?key=${GOOGLE_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Google session ${r.status}`);
  const j = await r.json();
  try {
    const all = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
    all[id] = { session: j.session, expiry: +j.expiry };
    localStorage.setItem(SESSION_KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
  return j.session;
}

// Google satellite (with Google's own road/place labels when `labels` is on). Shows the copyright Google
// returns for the current view, and reports how far the imagery really goes here through onMaxZoom.
export function GoogleSatelliteLayer({ labels, maxZoom, nativeZoom = 22, onMaxZoom, onError }) {
  const map = useMap();
  const [session, setSession] = useState(null);
  const shown = useRef('');
  useEffect(() => {
    let alive = true;
    setSession(null);
    googleSession(labels).then((s) => alive && setSession(s)).catch(() => alive && onError?.());
    return () => { alive = false; };
  }, [labels]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return undefined;
    let t;
    const update = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const b = map.getBounds();
        const q = `session=${session}&key=${GOOGLE_KEY}&zoom=${Math.round(map.getZoom())}&north=${b.getNorth()}&south=${b.getSouth()}&east=${b.getEast()}&west=${b.getWest()}`;
        try {
          const j = await (await fetch(`https://tile.googleapis.com/tile/v1/viewport?${q}`)).json();
          const text = `Imagery &copy; Google${j.copyright ? `, ${j.copyright}` : ''}`;
          if (shown.current) map.attributionControl?.removeAttribution(shown.current);
          map.attributionControl?.addAttribution(text);
          shown.current = text;
          if (j.maxZoom) onMaxZoom?.(j.maxZoom);
        } catch { /* keep the last attribution */ }
      }, 400);
    };
    update();
    map.on('moveend', update);
    return () => {
      clearTimeout(t);
      map.off('moveend', update);
      if (shown.current) map.attributionControl?.removeAttribution(shown.current);
      shown.current = '';
    };
  }, [session, map]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null;
  // Google's tiles past its deepest photo here fail, so the deepest one is enlarged instead (nativeZoom from onMaxZoom).
  return <TileLayer key={session} url={`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${session}&key=${GOOGLE_KEY}`} maxNativeZoom={Math.min(22, nativeZoom)} maxZoom={maxZoom} />;
}
