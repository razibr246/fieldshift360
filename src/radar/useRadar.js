import { useMemo } from 'react';
import { radarSummary } from './radarModel.js';
import { AMAN } from './aman.js';

// { status: 'ready', summary } for a district (the data ships with the app, so it is always ready).
export function useRadar(enabled = true, districtId = 'rajshahi') {
  const summary = useMemo(() => (enabled ? radarSummary(AMAN, districtId) : null), [enabled, districtId]);
  return { status: enabled ? 'ready' : 'idle', summary };
}
