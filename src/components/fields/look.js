// How a field looks from space, as a status: colour, icon and words together (never colour alone).
import { CheckCircle2, Eye, AlertTriangle, Loader2 } from 'lucide-react';

export const LEVEL_LOOK = {
  ok: { color: '#2f6e2f', tone: 'green', icon: CheckCircle2, bn: 'ভালো আছে', en: 'Looks fine' },
  watch: { color: '#c98a1b', tone: 'amber', icon: Eye, bn: 'নজর রাখুন', en: 'Keep an eye on it' },
  warn: { color: '#b42318', tone: 'red', icon: AlertTriangle, bn: 'জমি দেখা দরকার', en: 'Needs a look' },
  none: { color: '#6b7c72', tone: 'slate', icon: Loader2, bn: 'উপগ্রহের হিসাব চলছে', en: 'Satellite reading pending' },
};
