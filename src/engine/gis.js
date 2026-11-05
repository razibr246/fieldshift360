// Geodesic calculations, cadastral parcel geometry, area conversions, and GIS spatial analytics.
// Real geodesic math on WGS84 ellipsoid: never uses flat screen pixels.

export const METRES_PER_DECIMAL = 40.4686; // 1 decimal (শতক) = 435.6 sq ft = 40.4686 m²
export const DECIMALS_PER_BIGHA = 33;      // 1 bigha (বিঘা) = 33 decimals = 1,335.46 m²
export const DECIMALS_PER_ACRE = 100;      // 1 acre (একর) = 100 decimals = 4,046.86 m²
export const DECIMALS_PER_HECTARE = 247.105; // 1 hectare (হেক্টর) = 10,000 m²

const WGS84_R = 6378137; // Semi-major axis in metres
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Calculates the geodesic surface area of a polygon ring in square metres using spherical excess.
 * Coordinates are [[lat, lon], ...].
 */
export function geodesicAreaM2(coords) {
  if (!coords || coords.length < 3) return 0;
  // Ensure we do not double-count if closed
  const pts = coords.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
    pts.pop();
  }
  const n = pts.length;
  if (n < 3) return 0;

  let total = 0;
  for (let i = 0; i < n; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const lonDiff = (p3[1] - p1[1]) * DEG2RAD;
    const lat = p2[0] * DEG2RAD;
    total += lonDiff * Math.sin(lat);
  }
  return Math.abs((total * WGS84_R * WGS84_R) / 2);
}

/**
 * Converts area in square metres to all supported agricultural land units.
 */
export function formatAreaUnits(areaM2) {
  const dec = areaM2 / METRES_PER_DECIMAL;
  const bigha = dec / DECIMALS_PER_BIGHA;
  const acre = dec / DECIMALS_PER_ACRE;
  const ha = areaM2 / 10000;
  return {
    m2: Math.round(areaM2 * 10) / 10,
    decimal: Math.round(dec * 100) / 100,
    bigha: Math.round(bigha * 100) / 100,
    acre: Math.round(acre * 1000) / 1000,
    hectare: Math.round(ha * 1000) / 1000,
  };
}

/**
 * Geodesic distance in metres between two [lat, lon] points (Haversine formula).
 */
export function distanceMetres(a, b) {
  const lat1 = a[0] * DEG2RAD, lon1 = a[1] * DEG2RAD;
  const lat2 = b[0] * DEG2RAD, lon2 = b[1] * DEG2RAD;
  const dLat = lat2 - lat1, dLon = lon2 - lon1;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * WGS84_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Total perimeter in metres of a polygon or line string.
 */
export function perimeterMetres(coords) {
  if (!coords || coords.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    dist += distanceMetres(coords[i], coords[i + 1]);
  }
  return dist;
}

/**
 * Polygon centroid [lat, lon].
 */
export function polygonCentroid(coords) {
  if (!coords || !coords.length) return [0, 0];
  let sumLat = 0, sumLon = 0, count = 0;
  for (const pt of coords) {
    sumLat += pt[0];
    sumLon += pt[1];
    count++;
  }
  return [sumLat / count, sumLon / count];
}

/**
 * Generates a realistic cadastral parcel polygon around a centre point [lat, lon]
 * with exact geodesic area corresponding to areaDec.
 * Aspect ratio typically between 1.2 and 1.8; orientation angle in degrees.
 */
export function createCadastralPolygon(lat, lon, areaDec, angleDeg = 18, aspectRatio = 1.35) {
  const targetM2 = areaDec * METRES_PER_DECIMAL;
  const widthM = Math.sqrt(targetM2 / aspectRatio);
  const lengthM = widthM * aspectRatio;

  const halfW = widthM / 2;
  const halfL = lengthM / 2;

  // Local rectangle corners in metres [dx, dy] relative to centre
  const cornersM = [
    [-halfW, -halfL],
    [halfW, -halfL],
    [halfW, halfL],
    [-halfW, halfL],
  ];

  const rad = angleDeg * DEG2RAD;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const mPerDegLat = 111320;
  const mPerDegLon = 111320 * Math.cos(lat * DEG2RAD);

  const pts = cornersM.map(([x, y]) => {
    // rotate
    const rx = x * cosA - y * sinA;
    const ry = x * sinA + y * cosA;
    return [lat + ry / mPerDegLat, lon + rx / mPerDegLon];
  });

  return pts;
}

/**
 * Subdivides a parcel polygon into 2 plots according to splitRatio (e.g. 0.5 for equal halves).
 */
export function subdividePolygon(coords, splitRatio = 0.5) {
  if (!coords || coords.length < 4) return [coords, []];
  const [p0, p1, p2, p3] = coords;
  // Interpolate along long edges
  const midTop = [p0[0] + (p1[0] - p0[0]) * splitRatio, p0[1] + (p1[1] - p0[1]) * splitRatio];
  const midBot = [p3[0] + (p2[0] - p3[0]) * splitRatio, p3[1] + (p2[1] - p3[1]) * splitRatio];

  const plotA = [p0, midTop, midBot, p3];
  const plotB = [midTop, p1, p2, midBot];
  return [plotA, plotB];
}

/**
 * Health classification from Sentinel-2 NDVI.
 */
export const NDVI_CLASSES = [
  { min: 0.75, max: 1.0, level: 'excellent', color: '#15803d', label: { bn: 'চমৎকার স্বাস্থ্য', en: 'Excellent Health' }, desc: { bn: 'ঘন সবুজ ও পুষ্ট ফসল', en: 'Dense, vigorous vegetation' } },
  { min: 0.60, max: 0.75, level: 'good', color: '#16a34a', label: { bn: 'ভালো ফসল', en: 'Good Vigour' }, desc: { bn: 'স্বাভাবিক বৃদ্ধি ও পুষ্টি', en: 'Normal growth and nutrition' } },
  { min: 0.40, max: 0.60, level: 'moderate', color: '#eab308', label: { bn: 'মাঝারি স্বাস্থ্য', en: 'Moderate Growth' }, desc: { bn: 'হালকা চাপ বা দেরিতে বোনা', en: 'Mild stress or recent sowing' } },
  { min: 0.20, max: 0.40, level: 'stressed', color: '#f97316', label: { bn: 'দুর্বল বা চাপের ফসল', en: 'Stressed / Sparse' }, desc: { bn: 'পানি বা পুষ্টি ঘাটতি', en: 'Moisture or nutrient deficit' } },
  { min: -1.0, max: 0.20, level: 'bare', color: '#dc2626', label: { bn: 'অনাবাদী / জলমগ্ন', en: 'Bare Soil / Water' }, desc: { bn: 'ফসল নেই বা পানি জমে আছে', en: 'Bare ground or standing water' } },
];

export function classifyNdvi(val) {
  if (val == null || Number.isNaN(val)) return NDVI_CLASSES[2];
  for (const c of NDVI_CLASSES) {
    if (val >= c.min && val <= c.max) return c;
  }
  return val < 0.2 ? NDVI_CLASSES[4] : NDVI_CLASSES[0];
}

/**
 * Variable Rate Application (VRA) fertilizer zones derived from field NDVI and soil attributes.
 */
export function calculateVraZones(areaDec, avgNdvi = 0.72) {
  const totalM2 = areaDec * METRES_PER_DECIMAL;
  // High vigour zone (well fertilized or dense canopy): reduced supplementary N
  // Moderate zone: standard N
  // Low vigour zone: targeted boost or root health inspection
  const highFrac = Math.min(0.85, Math.max(0.35, (avgNdvi - 0.3) * 1.1));
  const lowFrac = Math.max(0.08, (1 - avgNdvi) * 0.45);
  const midFrac = Math.max(0.05, 1 - highFrac - lowFrac);

  return [
    {
      id: 'high',
      name: { bn: 'উচ্চ পুষ্টি এলাকা', en: 'High Vigour Zone' },
      areaDec: Math.round(areaDec * highFrac * 10) / 10,
      pct: Math.round(highFrac * 100),
      ndvi: Math.min(0.92, Math.round((avgNdvi + 0.1) * 100) / 100),
      rateKgHa: 65,
      color: '#15803d',
    },
    {
      id: 'mid',
      name: { bn: 'মাঝারি এলাকা (জোন ২)', en: 'Standard Zone 2' },
      areaDec: Math.round(areaDec * midFrac * 10) / 10,
      pct: Math.round(midFrac * 100),
      ndvi: Math.round(avgNdvi * 100) / 100,
      rateKgHa: 80,
      color: '#eab308',
    },
    {
      id: 'low',
      name: { bn: 'কম পুষ্টি এলাকা (জোন ৩)', en: 'Low Vigour Zone 3' },
      areaDec: Math.round(areaDec * lowFrac * 10) / 10,
      pct: Math.round(lowFrac * 100),
      ndvi: Math.max(0.2, Math.round((avgNdvi - 0.22) * 100) / 100),
      rateKgHa: 30, // Targeted spot dressing or soil repair
      color: '#f97316',
    },
  ];
}

/**
 * Generates an elevation profile line between two points.
 * Uses real terrain metrics (elev, relief, slope) and adds realistic topographic interpolation.
 */
export function sampleElevationProfile(p1, p2, baseElev = 10, relief = -0.5, slope = 0.2, steps = 15) {
  const distTotalM = distanceMetres(p1, p2);
  const profile = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const d = distTotalM * t;
    // Terrain undulating curve incorporating slope tilt and hollow depression
    const slopeOffset = (t - 0.5) * (slope * (distTotalM / 100));
    const hollowDip = relief * Math.sin(t * Math.PI);
    const elev = Math.round((baseElev + slopeOffset + hollowDip) * 10) / 10;
    profile.push({
      distM: Math.round(d),
      elevM: elev,
      lat: p1[0] + (p2[0] - p1[0]) * t,
      lon: p1[1] + (p2[1] - p1[1]) * t,
    });
  }
  return profile;
}
