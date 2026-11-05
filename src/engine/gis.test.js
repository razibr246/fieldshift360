import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  geodesicAreaM2,
  formatAreaUnits,
  distanceMetres,
  perimeterMetres,
  createCadastralPolygon,
  subdividePolygon,
  classifyNdvi,
  calculateVraZones,
  sampleElevationProfile,
  METRES_PER_DECIMAL,
} from './gis.js';

describe('GIS Geodesic and Precision Agriculture Engine', () => {
  it('geodesicAreaM2 calculates accurate area for 50 decimal plot', () => {
    // Generate a 50-decimal cadastral polygon at Dhamrai (lat: 24.02, lon: 90.08)
    const poly = createCadastralPolygon(24.02, 90.08, 50);
    assert.equal(poly.length, 4);
    const areaM2 = geodesicAreaM2(poly);
    const expectedM2 = 50 * METRES_PER_DECIMAL; // ~2023.43 m²
    // Error margin under 1% due to spherical conversion
    const errorPct = Math.abs(areaM2 - expectedM2) / expectedM2;
    assert.ok(errorPct < 0.01, `Area error ${errorPct} should be under 1%`);
  });

  it('formatAreaUnits converts correctly between decimal, bigha, acre, ha', () => {
    const areaM2 = 33 * METRES_PER_DECIMAL; // 1 bigha
    const units = formatAreaUnits(areaM2);
    assert.equal(units.decimal, 33);
    assert.equal(units.bigha, 1);
    assert.equal(units.acre, 0.33);
  });

  it('distanceMetres computes known distance correctly', () => {
    // 1 arcminute of latitude is ~1852 metres (nautical mile)
    const d = distanceMetres([24.0, 90.0], [24.0 + 1 / 60, 90.0]);
    assert.ok(Math.abs(d - 1852) < 20);
  });

  it('subdividePolygon splits field into two plots', () => {
    const poly = createCadastralPolygon(24.02, 90.08, 100);
    const [p1, p2] = subdividePolygon(poly, 0.5);
    assert.equal(p1.length, 4);
    assert.equal(p2.length, 4);
    const a1 = geodesicAreaM2(p1);
    const a2 = geodesicAreaM2(p2);
    const total = geodesicAreaM2(poly);
    assert.ok(Math.abs(a1 + a2 - total) < 5);
  });

  it('classifyNdvi identifies health categories correctly', () => {
    assert.equal(classifyNdvi(0.82).level, 'excellent');
    assert.equal(classifyNdvi(0.68).level, 'good');
    assert.equal(classifyNdvi(0.48).level, 'moderate');
    assert.equal(classifyNdvi(0.25).level, 'stressed');
    assert.equal(classifyNdvi(0.05).level, 'bare');
  });

  it('calculateVraZones partitions land into VRA management areas', () => {
    const zones = calculateVraZones(100, 0.75);
    assert.equal(zones.length, 3);
    const sumPct = zones.reduce((a, z) => a + z.pct, 0);
    assert.ok(sumPct >= 98 && sumPct <= 102);
  });

  it('sampleElevationProfile generates profile with elevations along transect', () => {
    const prof = sampleElevationProfile([24.02, 90.08], [24.03, 90.09], 12, -0.4, 0.25, 10);
    assert.equal(prof.length, 11);
    assert.equal(prof[0].distM, 0);
    assert.ok(prof[10].distM > 1000);
  });
});
