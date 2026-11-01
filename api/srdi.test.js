import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidateLabReport } from './srdi.js';

test('soil-test values: validates ranges and marks the source unverified', () => {
  const raw = {
    labId: 'SRDI-RAJ-2026-G84',
    station: 'SRDI Rajshahi Regional Laboratory',
    date: '2026-10-15',
    ph: 6.8,
    om_pct: 1.724, // exactly 1.724% OM => 10.0 g/kg SOC
    ec_ds_m: 0.35,
    n_kg_ha: 140,
    p_ppm: 14.5,
    k_meq: 0.22,
  };

  const report = parseAndValidateLabReport(raw);
  assert.equal(report.lab_id, 'SRDI-RAJ-2026-G84');
  assert.equal(report.ph, 6.8);
  assert.equal(report.om_pct, 1.72);
  assert.equal(report.soc_g_kg, 10.0);
  assert.equal(report.ec_ds_m, 0.35);
  assert.equal(report.verified, false);
});

test('soil-test values without metadata do not receive a fabricated SRDI ID or report date', () => {
  const report = parseAndValidateLabReport({ ph: 6.5 });
  assert.equal(report.lab_id, 'USER-ENTERED');
  assert.equal(report.date, null);
  assert.equal(report.verified, false);
});

test('srdi: rejects impossible agronomic pH or OM% values', () => {
  assert.equal(parseAndValidateLabReport({ ph: 14.5 }), null, 'pH > 10 is impossible in natural agricultural soil');
  assert.equal(parseAndValidateLabReport({ om_pct: 25.0 }), null, 'OM > 15% out of mineral soil bounds');
  assert.equal(parseAndValidateLabReport(null), null);
});
