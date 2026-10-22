// The rotation Sentinel-2 saw on the active field: last Rabi's crop pattern and this monsoon's, matched from the
// field's green-cover curve (engine/fieldwatch.js), and that Rabi pattern as the model's Rabi crop. Field Future and
// the home page's rotation teaser both start the ten years from it, so they agree.
import { useMemo } from 'react';
import { useFieldWatch } from './useFieldWatch';
import { readField } from '../../engine/fieldwatch';

// Mustard-then-Boro counts as Boro: the model's Rabi slot holds one crop, and Boro decides the water and puddling.
export const SAT_RABI = { mustard_boro: 'boro', boro: 'boro', wheat: 'wheat', lentil: 'lentil', vegetables: 'tomato', rabi_fallow: 'fallow' };
export const MIN_MATCH = 0.3;

export function useSeenRotation(parcel) {
  const fw = useFieldWatch(parcel);
  return useMemo(() => {
    if (!fw.watch) return null;
    const r = readField(fw.watch);
    const rabi = r.lastRabi?.[0], now = r.guess?.[0];
    if (!rabi || rabi.pattern?.notField) return null;
    const rabiCrop = SAT_RABI[rabi.id] ?? null;
    return { rabi, now, rabiCrop, usable: !!rabiCrop && rabi.p >= MIN_MATCH };
  }, [fw.watch]);
}
