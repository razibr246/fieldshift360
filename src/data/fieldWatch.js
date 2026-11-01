// Saved Sentinel-2 readings are loaded only by the field, radar and science routes that display them.
import watch from './fields/field_watch.json';
import { PARCELS } from './parcels.js';
import { distanceKm } from '../engine/world.js';

export const WATCH = watch;
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
