// One field's satellite series: the saved copy (field_watch.json) plus any newer passes fetched live, or a full
// live read for a field that was marked or moved after the saved copy was made. Live passes are kept in this
// browser only (a convenience; losing them just means fetching again).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { savedWatch } from '../../data/parcels';
import { readPasses, pictureUrls, WATCH_START } from '../../engine/sentinel';
import { addDays, iso, parseISO, todayDhaka } from '../../engine/dates';
import { STORAGE_PREFIX } from '../../config/brand';

const RECHECK_MS = 6 * 3600e3; // look for new passes at most every six hours
const keyOf = (p) => `${STORAGE_PREFIX}.fw.${p.id}|${p.lat.toFixed(5)}|${p.lon.toFixed(5)}|${p.area_dec}`;
const readCache = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeCache = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };

const NONE = { id: 'none', lat: 0, lon: 0, area_dec: 0 };

// `parcel` may be null (no field marked yet): then there is nothing to read and nothing is fetched.
export function useFieldWatch(parcel) {
  const off = !parcel;
  const { id, lat, lon, area_dec: area } = parcel ?? NONE;
  const field = useMemo(() => ({ id, lat, lon, area_dec: area }), [id, lat, lon, area]);
  const saved = useMemo(() => savedWatch(field), [field]);
  const key = keyOf(field);
  const [live, setLive] = useState(() => readCache(key));
  const [status, setStatus] = useState('idle'); // idle | loading | done | error | offline
  const [progress, setProgress] = useState(null);
  const ctl = useRef(null);
  useEffect(() => { setLive(readCache(key)); setStatus('idle'); setProgress(null); }, [key]);

  const series = useMemo(() => {
    const byDay = new Map();
    for (const o of saved?.series ?? []) byDay.set(o.d, o);
    for (const o of live?.series ?? []) byDay.set(o.d, o);
    return [...byDay.values()].sort((a, b) => a.d.localeCompare(b.d));
  }, [saved, live]);

  const refresh = useCallback(async (force = false) => {
    if (off) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    const cached = readCache(key);
    if (!force && cached?.checked && Date.now() - cached.checked < RECHECK_MS) return;
    const have = [...(saved?.series ?? []), ...(cached?.series ?? [])].map((o) => o.d).sort();
    const from = have.length ? iso(addDays(parseISO(have[have.length - 1]), 1)) : WATCH_START;
    const to = iso(todayDhaka());
    if (from > to) return;
    ctl.current?.abort();
    const ac = new AbortController();
    ctl.current = ac;
    setStatus('loading');
    try {
      const fresh = await readPasses(field, { from, to, signal: ac.signal, onProgress: (done, total) => setProgress({ done, total }) });
      const next = { series: [...(cached?.series ?? []), ...fresh], checked: Date.now() };
      writeCache(key, next);
      setLive(next);
      setStatus('done');
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('error');
    } finally {
      setProgress(null);
    }
  }, [key, field, saved, off]);

  // Look for newer passes when the field is opened (and read a new field in full).
  useEffect(() => { refresh(); return () => ctl.current?.abort(); }, [refresh]);

  // One object per change of the series, so readings built from it are not redone on every render.
  const watch = useMemo(() => {
    const latest = series[series.length - 1];
    if (off || !latest) return null;
    const pictures = latest.item ? { ...pictureUrls(latest, field), date: latest.d, live: true, fallback: saved?.pictures } : saved?.pictures ?? null;
    return { series, latest: latest.d, pictures, fromSaved: !!saved };
  }, [series, field, saved, off]);
  return {
    watch,
    status, progress, refresh: () => refresh(true), checked: live?.checked ?? null, saved: !!saved,
  };
}

// The series as it stands right now, without fetching: for lists and maps that show every field at once.
export function seriesNow(p) {
  const byDay = new Map();
  for (const o of savedWatch(p)?.series ?? []) byDay.set(o.d, o);
  for (const o of readCache(keyOf(p))?.series ?? []) byDay.set(o.d, o);
  return [...byDay.values()].sort((a, b) => a.d.localeCompare(b.d));
}
