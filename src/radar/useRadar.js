import { useMemo } from 'react';
import { radarSummary } from './radarModel.js';
import { AMAN } from './aman.js';
import { onsetSummary } from './onset.js';

// { status: 'ready', summary } for a district (the data ships with the app, so it is always ready).
export function useRadar(enabled = true, districtId = 'rajshahi', upazilaId = null) {
  const summary = useMemo(() => (enabled ? radarSummary(AMAN, districtId, onsetSummary(upazilaId)) : null), [enabled, districtId, upazilaId]);
  return { status: enabled ? 'ready' : 'idle', summary };
}
