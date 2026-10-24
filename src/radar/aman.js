// Real Aman data (scripts/build/build_aman_radar.mjs): NASA GPM IMERG June–July rain and Sentinel-1 radar transplanting
// dates for every rural upazila of Rajshahi and Dhaka districts. The district summary ships with the app; one
// upazila's season curves and radar frames are fetched from public/aman/ when that upazila is opened.
import { useEffect, useState } from 'react';
import AMAN from '../data/radar/aman_radar.json';

export { AMAN };
export const SHIFT_DAYS = AMAN.shiftDays; // a transplanting date within ±7 days of the upazila's own normal is normal
export const MIN_FIELDS = AMAN.minFields; // a season's date counts only when at least this many sample fields show it
export const RAIN_FINAL_TO = AMAN.rainFinalTo; // IMERG after this year is the provisional run
export const THROUGH = AMAN.provenance.through;
export const LATEST = AMAN.years.radar[1];
export const RADAR_YEARS = Array.from({ length: AMAN.years.radar[1] - AMAN.years.radar[0] + 1 }, (_, i) => AMAN.years.radar[0] + i);

// The app's upazilas map onto the district files by name.
export const DISTRICT_OF = { godagari: 'rajshahi', dhamrai: 'dhaka' };
export const districtOf = (upazilaId) => DISTRICT_OF[upazilaId] ?? Object.keys(AMAN.districts).find((d) => AMAN.districts[d].upazilas.some((u) => u.id === upazilaId));
export const upazilaRow = (id) => Object.values(AMAN.districts).flatMap((d) => d.upazilas).find((u) => u.id === id);

// Status of a season: its radar transplanting date against the same upazila's 2017–2025 median.
export const CAT = {
  early: { tone: 'blue', color: '#2f8a8f', bn: 'আগে রোপণ', en: 'Earlier than usual' },
  'on track': { tone: 'green', color: '#43863a', bn: 'স্বাভাবিক সময়ে', en: 'Usual time' },
  late: { tone: 'red', color: '#a8552a', bn: 'দেরিতে রোপণ', en: 'Later than usual' },
  none: { tone: 'slate', color: '#9aa79f', bn: 'হিসাব নেই', en: 'No estimate' },
};
export const catOf = (shift) => (shift === null || shift === undefined ? 'none' : shift < -SHIFT_DAYS ? 'early' : shift > SHIFT_DAYS ? 'late' : 'on track');

// Day of year → UTC ms, and back.
export const doyToMs = (year, doy) => Date.UTC(year, 0, doy);
export const msToDoy = (t) => Math.round((t - Date.UTC(new Date(t).getUTCFullYear(), 0, 1)) / 864e5) + 1;

const detailCache = new Map();
export function useAmanDetail(id) {
  const [st, setSt] = useState(() => (detailCache.has(id) ? { status: 'ready', data: detailCache.get(id) } : { status: 'loading', data: null }));
  useEffect(() => {
    if (!id) return undefined;
    if (detailCache.has(id)) { setSt({ status: 'ready', data: detailCache.get(id) }); return undefined; }
    let alive = true;
    setSt({ status: 'loading', data: null });
    fetch(`${import.meta.env.BASE_URL || './'}aman/${id}.json`)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { detailCache.set(id, d); if (alive) setSt({ status: 'ready', data: d }); })
      .catch(() => { if (alive) setSt({ status: 'error', data: null }); });
    return () => { alive = false; };
  }, [id]);
  return st;
}
export const frameUrl = (file) => `${import.meta.env.BASE_URL || './'}aman/${file}`;
