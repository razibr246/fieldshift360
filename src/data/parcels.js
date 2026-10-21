// The upazila offices' land registry (parcels.json) and the saved satellite readings for each field
// (field_watch.json, built by scripts/data/build_field_watch.py), with the bundled pictures of each field.
import registry from './parcels.json';
import watch from './field_watch.json';
import { distanceKm } from '../engine/world.js';

export const PARCELS = registry.parcels;
export const WATCH_PROV = watch.provenance;

const pics = import.meta.glob('../assets/fields/*.{jpg,png}', { eager: true, query: '?url', import: 'default' });
const picOf = (id, kind) => pics[`../assets/fields/${id}-${kind}`];

// The saved reading for a parcel, only while the parcel is still where (and as big as) it was when it was read.
export function savedWatch(p) {
  const base = PARCELS.find((x) => x.id === p.id);
  const w = watch.parcels[p.id];
  if (!base || !w || base.area_dec !== p.area_dec || distanceKm(base, p) > 0.015) return null;
  return { ...w, pictures: { tc: picOf(p.id, 'tc.jpg'), ndvi: picOf(p.id, 'ndvi.png'), date: w.latest } };
}

export const decToBigha = (dec) => dec / 33;
