// The one map frame every map in the app uses: Google-Maps-style map types (Default / Satellite / Terrain),
// live "blue dot" location with an accuracy ring, a scale bar, full screen, and wheel zoom once the map is tapped.
// The default tile sources are free and keyless (OpenStreetMap, Esri, OpenTopoMap); sharper Google / Mapbox
// satellite appears when their keys are set (see hdSatellite.jsx).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import StopOnLeave from './StopOnLeave';
import 'leaflet/dist/leaflet.css';
import { Layers, X, LocateFixed, Locate, Maximize2, Minimize2, ZoomIn, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { num, fmtBangla, fmtDate, parseISO, bnDigits, todayDhaka } from '../../engine/dates';
import { GOOGLE_KEY, MAPBOX_TOKEN, mapboxLayer, GoogleSatelliteLayer } from './hdSatellite';
import VectorBasemap from './VectorBasemap';
import { Sentinel2Layer, s2Windows, s2Tile } from './sentinelMosaic';
import AiSharpen from './AiSharpen';
import { esriTile } from '../../ai/superres';
import { UPAZILAS, upazilaAt } from '../../data/upazilas';

export const MAX_ZOOM = 22; // the scale bar reaches 5 m
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

// Roads and place names drawn over a satellite photo, like a hybrid view.
const ESRI_LABELS = [
  { url: `${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 19 },
  { url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, maxNativeZoom: 19 },
];
// Thumbnails are real tiles of Godagari town at zoom 14.
const ESRI_THUMB = `${ESRI}/World_Imagery/MapServer/tile/14/7043/12212`;
const GIBS_HLS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default';
// Each upazila's own dates, checked over a 3×3 grid of tiles covering it: NASA has a full picture there that day and
// the Sentinel-2 pass behind it is (nearly) cloud-free. HLS passes differ by place, so one list cannot serve both:
// Godagari's dates are blank over Dhamrai.
export const NASA_DATES_BY = {
  godagari: ['2026-01-03', '2026-02-02', '2026-03-04', '2026-04-03', '2026-05-03', '2026-09-10'],
  dhamrai: ['2025-11-16', '2025-12-16', '2026-01-20', '2026-02-14', '2026-03-11', '2026-04-07', '2026-05-05'],
  // The five story upazilas: Sentinel-2 L2A passes under 3% cloud at the upazila centre (Planetary Computer STAC),
  // one a month, each checked to have a NASA GIBS HLS tile that day.
  sitakunda: ['2025-11-08', '2025-12-05', '2026-01-10', '2026-02-06', '2026-03-06'],
  dacope: ['2025-11-06', '2025-12-06', '2026-01-07', '2026-02-09'],
  bakerganj: ['2025-11-08', '2025-12-11', '2026-01-10', '2026-02-09', '2026-03-06'],
  gangachara: ['2025-11-09', '2025-12-04', '2026-01-13', '2026-02-07', '2026-03-04'],
  gowainghat: ['2025-11-08', '2025-12-06', '2026-01-20', '2026-02-09', '2026-03-06'],
};
export const NASA_DATES = NASA_DATES_BY.godagari;

export const BASEMAPS = {
  // Vector map: drawn by the browser, sharp at every zoom and screen density. Falls back to OSM image tiles.
  map: {
    bn: 'সাধারণ', en: 'Default', hd: true,
    vector: 'https://tiles.openfreemap.org/styles/liberty',
    vectorAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    layers: [{ url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxNativeZoom: 19, attribution: '&copy; OpenStreetMap contributors' }],
    thumb: 'https://tile.openstreetmap.org/14/12212/7043.png',
  },
  satellite: {
    bn: 'উপগ্রহ', en: 'Satellite',
    // How deep Esri's photos go changes from place to place (zoom 18, about 0.6 m per pixel, over most of rural
    // Bangladesh). The real depth is looked up for the area in view (EsriDepth); closer than that is enlarged.
    // blankTile=false: a missing tile fails instead of painting Esri's grey "Map data not yet available" square.
    layers: [{ url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}?blankTile=false`, maxNativeZoom: 18, esriDepth: true, retina: true, attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics' }],
    labels: ESRI_LABELS,
    thumb: ESRI_THUMB,
  },
  terrain: {
    bn: 'ভূমিরূপ', en: 'Terrain',
    layers: [{ url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', subdomains: 'abc', maxNativeZoom: 17, attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)' }],
    thumb: 'https://a.tile.opentopomap.org/14/12212/7043.png',
  },
  // NASA's own imagery: Harmonized Landsat-Sentinel (HLS, 30 m) from NASA GIBS, on clear passes through the
  // 2025-26 season (each date checked cloud-free over Godagari), so the fields can be watched from Rabi to Aman.
  // Copernicus Sentinel-2 at 10 m, the clearest pass of a chosen month (up to last week): sharper than NASA HLS and
  // newer than the Esri photo mosaic, which can be years old. See sentinelMosaic.jsx.
  sentinel: {
    bn: 'সেন্টিনেল-২ (১০ মি)', en: 'Sentinel-2 (10 m)', s2: true, hd: true,
    labels: ESRI_LABELS,
    thumb: 'https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/14/12292/7027.png?collection=sentinel-2-l2a&item=S2B_MSIL2A_20261017T042749_R133_T46QBM_20261017T081241&assets=visual&color_formula=sigmoidal%20RGB%204%200.35%20saturation%201.15',
  },
  nasa: {
    bn: 'নাসা উপগ্রহ', en: 'NASA satellite', nasaDates: true,
    layers: [{ url: `${GIBS_HLS}/{time}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`, maxNativeZoom: 12, attribution: 'Imagery: NASA EOSDIS GIBS · HLS (Landsat 8/9, Sentinel-2)' }],
    labels: ESRI_LABELS,
    thumb: `${GIBS_HLS}/2026-02-07/GoogleMapsCompatible_Level12/9/220/381.png`,
  },
  ...(GOOGLE_KEY ? { google: { bn: 'গুগল HD', en: 'Google HD', google: true, labels: true, hd: true, thumb: ESRI_THUMB } } : {}),
  ...(MAPBOX_TOKEN ? { mapbox: { bn: 'Mapbox HD', en: 'Mapbox HD', layers: [mapboxLayer()], labels: ESRI_LABELS, hd: true, thumb: ESRI_THUMB } } : {}),
};
// "Satellite" anywhere in the app means the sharpest source that is switched on.
export const BEST_SATELLITE = GOOGLE_KEY ? 'google' : MAPBOX_TOKEN ? 'mapbox' : 'satellite';
const resolveType = (t) => (t === 'satellite' ? BEST_SATELLITE : t);

// On high-density (phone) screens, ask for tiles one zoom level deeper so each screen pixel gets a real image
// pixel instead of a stretched one. Applied to photo layers only; label tiles would come out too small to read.
const SMOOTH = { keepBuffer: 4, updateWhenZooming: false };
const layerProps = ({ retina, esriDepth, ...l }) => (retina && L.Browser.retina
  ? { ...l, ...SMOOTH, detectRetina: true, maxNativeZoom: l.maxNativeZoom - 1, maxZoom: MAX_ZOOM + 1 }
  : { ...l, ...SMOOTH, maxZoom: MAX_ZOOM });
const nativeZoomOf = (b) => b.layers?.[0]?.maxNativeZoom ?? MAX_ZOOM;

// ---- how deep Esri's photos really go here ----
// Esri's tilemap service says, tile by tile, whether a photo exists at a zoom level. Starting from the deepest
// level, the first level where every tile in view has a photo is the one to enlarge from, so no grey squares.
const depthCache = new Map();
const tileOf = (lat, lon, z) => {
  const n = 2 ** z, r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n)];
};
async function coveredAt(z, b) {
  const [x0, y0] = tileOf(b.getNorth(), b.getWest(), z), [x1, y1] = tileOf(b.getSouth(), b.getEast(), z);
  const cx = (x0 + x1) >> 1, cy = (y0 + y1) >> 1;
  const w = Math.min(x1 - x0 + 1, 16), h = Math.min(y1 - y0 + 1, 16); // the middle of the view, at most 16 × 16 tiles
  const left = cx - (w >> 1), top = cy - (h >> 1);
  const key = `${z}/${top}/${left}/${w}/${h}`;
  if (!depthCache.has(key)) {
    depthCache.set(key, fetch(`${ESRI}/World_Imagery/MapServer/tilemap/${key}`).then((r) => r.json())
      .then((j) => j.valid !== false && Array.isArray(j.data) && j.data.every((v) => v === 1))
      .catch(() => { depthCache.delete(key); return null; }));
  }
  return depthCache.get(key);
}
function EsriDepth({ onDepth }) {
  const map = useMap();
  useEffect(() => {
    let t, run = 0;
    const check = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const me = ++run, b = map.getBounds();
        for (let z = 20; z >= 15; z--) {
          const ok = await coveredAt(z, b);
          if (me !== run) return; // the map moved on
          if (ok === null) return; // no answer: keep the last depth
          if (ok) { onDepth(z); return; }
        }
        onDepth(15);
      }, 250);
    };
    check();
    map.on('moveend', check);
    return () => { clearTimeout(t); run++; map.off('moveend', check); };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ---- live location ----
export function useLiveLocation() {
  const [st, setSt] = useState({ on: false, fix: null, error: null });
  const watch = useRef(null);
  const clear = () => { if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  const stop = useCallback(() => { clear(); setSt((p) => ({ ...p, on: false })); }, []);
  const start = useCallback(() => {
    if (!('geolocation' in navigator)) { setSt({ on: false, fix: null, error: 'unsupported' }); return; }
    if (!window.isSecureContext) { setSt({ on: false, fix: null, error: 'insecure' }); return; }
    if (watch.current != null) return;
    setSt((p) => ({ ...p, on: true, error: null }));
    watch.current = navigator.geolocation.watchPosition(
      (g) => setSt((p) => {
        const fix = { lat: g.coords.latitude, lon: g.coords.longitude, acc: g.coords.accuracy, heading: g.coords.heading, at: g.timestamp };
        // A much rougher reading right after a good one, inside the good one's circle, is noise: keep the good one.
        const prev = p.fix;
        if (prev && fix.acc > prev.acc * 1.8 && fix.at - prev.at < 15000 && metres(prev, fix) < prev.acc) return p;
        return { ...p, error: null, fix };
      }),
      (e) => { if (e.code === 1) clear(); setSt((p) => ({ ...p, on: e.code === 1 ? false : p.on, error: e.code === 1 ? 'denied' : 'unavailable' })); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);
  useEffect(() => clear, []);
  return { ...st, start, stop };
}

const metres = (a, b) => {
  const r = Math.PI / 180, x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.hypot(x, y) * 6371000;
};

const meIcon = (heading) => L.divIcon({
  className: 'fs-me',
  html: `${heading != null && !Number.isNaN(heading) ? `<span class="fs-me-cone" style="transform:rotate(${heading}deg)"></span>` : ''}<span class="fs-me-pulse"></span><span class="fs-me-dot"></span>`,
  iconSize: [22, 22], iconAnchor: [11, 11],
});

export const accuracyLevel = (acc) => (acc <= 20 ? 'high' : acc <= 60 ? 'medium' : 'low');

function LiveDot({ fix }) {
  return (
    <>
      <Circle center={[fix.lat, fix.lon]} radius={fix.acc} interactive={false} pathOptions={{ color: '#1a73e8', weight: 1, opacity: 0.4, fillColor: '#1a73e8', fillOpacity: 0.12 }} />
      <Marker position={[fix.lat, fix.lon]} icon={meIcon(fix.heading)} interactive={false} keyboard={false} zIndexOffset={1000} />
    </>
  );
}

// Keeps the blue dot in view while following; any drag by the user stops following.
function Follow({ fix, follow, onStop, firstZoom }) {
  const map = useMap();
  const first = useRef(true);
  useMapEvents({ dragstart: onStop });
  useEffect(() => {
    if (!fix || !follow) return;
    if (first.current) { map.flyTo([fix.lat, fix.lon], Math.max(map.getZoom(), firstZoom), { duration: 0.8 }); first.current = false; }
    else map.panTo([fix.lat, fix.lon], { animate: true });
  }, [fix, follow]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!follow) first.current = true; }, [follow]);
  return null;
}

// Scale bar, wheel zoom only after the map is tapped (so the page still scrolls), and a resize after full screen.
function Extras({ full }) {
  const map = useMap();
  useEffect(() => {
    const scale = L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    const on = () => map.scrollWheelZoom.enable();
    const off = () => map.scrollWheelZoom.disable();
    map.on('click focus', on); map.on('mouseout blur', off);
    return () => { scale.remove(); map.off('click focus', on); map.off('mouseout blur', off); };
  }, [map]);
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 60); return () => clearTimeout(t); }, [full, map]);
  return null;
}

function ZoomWatch({ onZoom }) {
  useMapEvents({ zoomend: (e) => onZoom(e.target.getZoom()) });
  return null;
}

function TypePicker({ type, setType, labels, setLabels }) {
  const { T, L: tr } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={box} className="pointer-events-auto relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={T('মানচিত্রের ধরন', 'Map type')}
        className="grid h-11 w-11 place-items-center rounded-full bg-primary-800 text-white shadow-lg ring-2 ring-white/70 hover:bg-primary-700">
        <Layers size={20} />
      </button>
      {open && (
        <div className="absolute right-0 top-[52px] w-[min(300px,calc(100vw-48px))] rounded-2xl bg-white p-4 shadow-[var(--shadow-lift)]">
          <div className="flex items-center justify-between">
            <p className="font-display text-[17px] font-bold">{T('মানচিত্রের ধরন', 'Map type')}</p>
            <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-black/5" aria-label={T('বন্ধ করুন', 'Close')}><X size={18} /></button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(BASEMAPS).map(([k, b]) => (
              <button key={k} type="button" onClick={() => setType(k)} aria-pressed={type === k} className="flex flex-col items-center gap-1.5">
                <span className={`block h-[70px] w-[70px] overflow-hidden rounded-2xl p-[3px] ${type === k ? 'ring-[3px] ring-primary-600' : 'ring-1 ring-border'}`}>
                  <img src={b.thumb} alt="" loading="lazy" className="h-full w-full rounded-[13px] object-cover" />
                </span>
                {b.hd && <span className="-mt-4 rounded-full bg-[#1a73e8] px-1.5 text-[10.5px] font-bold leading-4 text-white">HD</span>}
                <span className={`text-[13.5px] ${type === k ? 'font-semibold text-primary-700' : 'text-ink'}`}>{tr(b)}</span>
              </button>
            ))}
          </div>
          {BASEMAPS[type].labels && (
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-2 border-t border-border pt-3 text-[14px]">
              {T('রাস্তা ও জায়গার নাম', 'Roads and place names')}
              <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} className="h-4 w-4 accent-primary-700" />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

const LOC_ERR = {
  denied: { bn: 'অবস্থান দেখার অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানার পাশে তালার চিহ্নে চাপ দিয়ে লোকেশন চালু করুন।', en: 'Location permission was blocked. Allow location from the lock icon next to the address bar.' },
  unavailable: { bn: 'এখন অবস্থান পাওয়া যাচ্ছে না। ফোনের লোকেশন (GPS) চালু আছে কিনা দেখুন।', en: 'Cannot get a location right now. Check that location (GPS) is on.' },
  unsupported: { bn: 'এই ব্রাউজারে অবস্থান জানা যায় না।', en: 'This browser cannot share location.' },
  insecure: { bn: 'লাইভ অবস্থান শুধু https ঠিকানায় (বা localhost-এ) কাজ করে।', en: 'Live location only works on an https address (or localhost).' },
};

// children: anything that goes inside the Leaflet map. overlay: extra buttons drawn over the map (bottom-left).
// onLocate(fix): called with each new live position.
export default function MapFrame({ center, zoom = 15, height = 400, className = '', basemap = 'map', label, children, overlay, onLocate, locateZoom = 17 }) {
  const { T, L: tr, s } = useStore();
  const [type, setType] = useState(resolveType(basemap));
  const [zoomNow, setZoomNow] = useState(zoom);
  const [googleMax, setGoogleMax] = useState(21);
  const [esriMax, setEsriMax] = useState(18);
  const [labels, setLabels] = useState(true);
  const [full, setFull] = useState(false);
  const [vectorFailed, setVectorFailed] = useState(false);
  // Dates and picture area follow the upazila the map was opened on.
  const upz = upazilaAt(center[0], center[1]);
  const nasaDates = NASA_DATES_BY[upz] ?? NASA_DATES;
  const [nasaDate, setNasaDate] = useState(nasaDates[1]);
  useEffect(() => { if (!nasaDates.includes(nasaDate)) setNasaDate(nasaDates[1]); }, [upz]); // eslint-disable-line react-hooks/exhaustive-deps
  const s2Wins = useMemo(() => s2Windows(todayDhaka()), []);
  const [s2Win, setS2Win] = useState(0);
  const [s2Sid, setS2Sid] = useState(null);
  const [ai, setAi] = useState(false); // AI clear-up of an enlarged photo (AiSharpen)
  const [aiState, setAiState] = useState({ phase: 'idle' });
  useEffect(() => { setAi(false); setAiState({ phase: 'idle' }); }, [type]);
  const s2Box = useMemo(() => { const [[a, b], [c, d]] = UPAZILAS[upz].bounds; return [b - 0.1, a - 0.1, d + 0.1, c + 0.1]; }, [upz]);
  const [follow, setFollow] = useState(false);
  const live = useLiveLocation();
  useEffect(() => { setType(resolveType(basemap)); }, [basemap]);
  useEffect(() => { if (live.fix) onLocate?.(live.fix); }, [live.fix]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!full) return undefined;
    const esc = (e) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [full]);

  const base = BASEMAPS[type] ?? BASEMAPS.map;
  const esri = !base.google && !(base.vector && !vectorFailed) && base.layers?.[0]?.esriDepth;
  const native = base.google ? googleMax : esri ? esriMax : base.s2 ? 15 : nativeZoomOf(base);
  const overZoom = (base.google || type === 'satellite' || type === 'mapbox' || type === 'nasa' || base.s2) && zoomNow > native;
  // Photos the AI clear-up may work on: Esri (deepest real zoom here) and Sentinel-2 (10 m ≈ zoom 14).
  const aiSource = esri ? { url: esriTile, z: esriMax, key: `esri${esriMax}` } : base.s2 && s2Sid ? { url: s2Tile(s2Sid), z: 14, key: s2Sid } : null;
  const locate = () => {
    if (!live.on) { live.start(); setFollow(true); }
    else if (!follow) setFollow(true);
    else { live.stop(); setFollow(false); }
  };
  const acc = live.fix && accuracyLevel(live.fix.acc);
  // Past the deepest real photo the picture is enlarged; an unsharp mask sized to the enlargement keeps field edges
  // and bunds readable. It sharpens what is there; it cannot add detail the photo does not have.
  const sharpId = `fs-sharp-${useId().replace(/:/g, '')}`;
  const enlarge = overZoom ? 2 ** (zoomNow - native) : 1;
  const sharpBlur = Math.min(6, 0.55 * enlarge);
  const btn = 'pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white shadow-lg hover:bg-primary-50';

  return (
    <div className={`${full ? 'fixed inset-0 z-[1500] bg-black' : `relative isolate overflow-hidden rounded-2xl border border-black/10 ${className}`}${overZoom ? ' fs-enhance' : ''}`} style={{ ...(full ? {} : { height }), '--fs-sharp': `url(#${sharpId})` }} role="region" aria-label={label}>
      {overZoom && (
        <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
          <filter id={sharpId} colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={sharpBlur} result="soft" />
            <feComposite in="SourceGraphic" in2="soft" operator="arithmetic" k1="0" k2="1.75" k3="-0.75" k4="0" />
          </filter>
        </svg>
      )}
      <MapContainer center={center} zoom={zoom} maxZoom={MAX_ZOOM} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} attributionControl
        wheelPxPerZoomLevel={90} wheelDebounceTime={25} inertiaDeceleration={2600} easeLinearity={0.2} zoomAnimationThreshold={6}>
        <StopOnLeave />
        {base.google
          ? <GoogleSatelliteLayer labels={labels} maxZoom={MAX_ZOOM} nativeZoom={googleMax} onMaxZoom={setGoogleMax} onError={() => setType('satellite')} />
          : base.s2 ? <Sentinel2Layer bbox={s2Box} win={s2Wins[s2Win]} onError={() => setType('satellite')} onSearch={setS2Sid} />
          : base.vector && !vectorFailed
            ? <VectorBasemap key={type} styleUrl={base.vector} attribution={base.vectorAttribution} onError={() => setVectorFailed(true)} />
            : base.layers.map((l, i) => <TileLayer key={`${type}-${i}${L.Browser.retina ? 'r' : ''}${base.nasaDates ? nasaDate : ''}${l.esriDepth ? esriMax : ''}`} {...layerProps(l.esriDepth ? { ...l, maxNativeZoom: esriMax } : l)} {...(base.nasaDates ? { time: nasaDate, className: 'swap-in' } : {})} />)}
        {esri && <EsriDepth onDepth={setEsriMax} />}
        {labels && Array.isArray(base.labels) && base.labels.map((l, i) => <TileLayer key={`${type}-l${i}`} {...l} maxZoom={MAX_ZOOM} zIndex={5} />)}
        <ZoomWatch onZoom={setZoomNow} />
        {ai && overZoom && aiSource && <AiSharpen source={aiSource} onState={setAiState} />}
        {children}
        {live.fix && <LiveDot fix={live.fix} />}
        <Follow fix={live.fix} follow={follow} onStop={() => setFollow(false)} firstZoom={locateZoom} />
        <Extras full={full} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-16 top-3 z-[500] flex flex-col items-center gap-1.5 text-center">
        {live.on && (live.fix || !live.error) && (
          <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-md ${acc === 'high' ? 'bg-primary-700' : acc === 'medium' ? 'bg-[#1a73e8]' : acc === 'low' ? 'bg-clay-500' : 'bg-ink/80'}`}>
            {live.fix
              ? `${T('নির্ভুলতা', 'Accuracy')}: ${{ high: T('ভালো', 'high'), medium: T('মাঝারি', 'medium'), low: T('কম', 'low') }[acc]} · ±${num(Math.round(live.fix.acc), s.lang)} ${T('মিটার', 'm')}`
              : T('অবস্থান খোঁজা হচ্ছে…', 'Finding your location…')}
          </span>
        )}
        {live.on && live.fix && acc !== 'high' && (
          <span className="max-w-xs rounded-xl bg-white/95 px-3 py-1.5 text-[12px] leading-[1.45] text-ink shadow-md">
            {T('আরও ঠিক করতে: ফোনে GPS / Precise location চালু রাখুন, খোলা আকাশের নিচে এক মিনিট দাঁড়ান। ফোনের GPS সাধারণত ±৫–১০ মিটারে নামে।', 'For a closer fix: keep GPS / precise location on and stand under open sky for a minute. Phone GPS usually gets to ±5–10 m.')}
          </span>
        )}
        {overZoom && (
          <span className="inline-flex max-w-xs items-center gap-1.5 rounded-xl bg-ink/80 px-3 py-1.5 text-[12px] leading-[1.45] text-white shadow-md">
            <ZoomIn size={14} className="shrink-0" />
            {ai && aiState.phase === 'done' ? T('AI দিয়ে পরিষ্কার করা ছবি। জমির কিনারা আসল, খুঁটিনাটি AI-এর অনুমান।', 'Cleared up by AI. Field edges are real; fine detail is the AI’s estimate.')
              : T('এখানে এর চেয়ে কাছের উপগ্রহ ছবি নেই — ছবিটা বড় আর ধারালো করে দেখানো হচ্ছে।', 'There is no closer satellite photo here — this one is enlarged and sharpened.')}
          </span>
        )}
        {overZoom && aiSource && (
          <button type="button" onClick={() => setAi((v) => !v)} aria-pressed={ai}
            className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-md ${ai ? 'bg-violet-700 text-white' : 'bg-white text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50'}`}>
            {ai && aiState.phase === 'work' ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {!ai ? T('AI দিয়ে পরিষ্কার করুন', 'Clear up with AI')
              : aiState.phase === 'work' ? T(`AI কাজ করছে… ${num(Math.round((aiState.progress ?? 0) * 100), s.lang)}%`, `AI working… ${Math.round((aiState.progress ?? 0) * 100)}%`)
                : aiState.phase === 'error' ? T('AI চালানো গেল না · আবার চাপুন', 'AI could not run · tap to retry')
                  : T('AI চালু · বন্ধ করুন', 'AI on · turn off')}
          </button>
        )}
      </div>
      {live.error && (
        <div className="absolute inset-x-3 top-3 z-[500] mx-auto max-w-md rounded-xl bg-white/95 px-3.5 py-2.5 text-[13px] leading-5 text-clay-700 shadow-md">{tr(LOC_ERR[live.error])}</div>
      )}

      <div className="pointer-events-none absolute right-3 top-3 z-[600]">
        <TypePicker type={type} setType={setType} labels={labels} setLabels={setLabels} />
      </div>
      <div className="pointer-events-none absolute bottom-8 right-3 z-[500] flex flex-col gap-2.5">
        <button type="button" onClick={() => setFull((f) => !f)} className={btn} aria-label={full ? T('ছোট করুন', 'Exit full screen') : T('পুরো পর্দায় দেখুন', 'Full screen')}>
          {full ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
        </button>
        <button type="button" onClick={locate} aria-pressed={live.on}
          className={btn} aria-label={live.on ? (follow ? T('লাইভ অবস্থান বন্ধ করুন', 'Stop live location') : T('আমার অবস্থানে ফিরুন', 'Back to my location')) : T('আমার লাইভ অবস্থান', 'My live location')}
          title={live.on ? (follow ? T('আবার চাপলে লাইভ অবস্থান বন্ধ হবে', 'Tap again to stop live location') : T('আমার অবস্থানে ফিরুন', 'Back to my location')) : T('আমার লাইভ অবস্থান', 'My live location')}>
          {live.on && follow ? <LocateFixed size={20} className="text-[#1a73e8]" /> : <Locate size={20} className={live.on ? 'text-[#1a73e8]' : 'text-ink'} />}
        </button>
      </div>
      {base.google && <img src="https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png" alt="Google" className="pointer-events-none absolute bottom-[12px] left-[124px] z-[450] h-[18px]" />}
      {overlay && <div className="pointer-events-none absolute bottom-10 left-3 right-20 z-[500] flex flex-wrap gap-2">{overlay}</div>}
      {base.s2 && (
        <div className="pointer-events-none absolute bottom-9 left-3 right-16 z-[520] flex flex-col items-start gap-1.5">
          <span className="rounded-full bg-ink/75 px-2.5 py-1 text-[11.5px] font-semibold text-white shadow">{T('সেন্টিনেল-২, ১০ মিটার · মাসের সবচেয়ে পরিষ্কার ছবি', 'Sentinel-2, 10 m · clearest picture of the month')}</span>
          <div className="pointer-events-auto flex flex-wrap gap-1 rounded-2xl bg-white/90 p-1 shadow-lg backdrop-blur" role="group" aria-label={T('ছবির মাস', 'Picture month')}>
            {s2Wins.map((w, i) => (
              <button key={w.id} type="button" onClick={() => setS2Win(i)} aria-pressed={s2Win === i}
                className={`rounded-xl px-2.5 py-1.5 text-left text-[11.5px] leading-tight transition-colors duration-300 ${s2Win === i ? 'bg-primary-700 text-white' : 'text-ink hover:bg-primary-50'}`}>
                <span className="block font-semibold">{w.recent ? T('সাম্প্রতিক', 'Latest') : fmtBangla(w.mid, s.lang).replace(/^\S+\s/, '')}</span>
                <span className={`block ${s2Win === i ? 'text-white/80' : 'text-muted'}`}>{w.recent ? T('গত ৩০ দিন', 'last 30 days') : `${fmtDate(w.mid, s.lang).replace(/^\S+\s/, '')} ${s.lang === 'bn' ? bnDigits(new Date(w.mid).getUTCFullYear()) : new Date(w.mid).getUTCFullYear()}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {base.nasaDates && (
        <div className="pointer-events-none absolute bottom-9 left-3 right-16 z-[520] flex flex-col items-start gap-1.5">
          <span className="rounded-full bg-ink/75 px-2.5 py-1 text-[11.5px] font-semibold text-white shadow">{T('নাসা উপগ্রহের ছবি · তারিখ বাছুন', 'NASA satellite photo · pick a date')}</span>
          <div className="pointer-events-auto flex flex-wrap gap-1 rounded-2xl bg-white/90 p-1 shadow-lg backdrop-blur" role="group" aria-label={T('ছবির তারিখ', 'Photo date')}>
            {nasaDates.map((d) => (
              <button key={d} type="button" onClick={() => setNasaDate(d)} aria-pressed={nasaDate === d}
                className={`rounded-xl px-2.5 py-1.5 text-left text-[11.5px] leading-tight transition-colors duration-300 ${nasaDate === d ? 'bg-primary-700 text-white' : 'text-ink hover:bg-primary-50'}`}>
                <span className="block font-semibold">{fmtBangla(parseISO(d), s.lang).replace(/^\S+\s/, '')}</span>
                <span className={`block ${nasaDate === d ? 'text-white/80' : 'text-muted'}`}>{fmtDate(parseISO(d), s.lang)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
