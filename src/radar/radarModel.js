// Plain-JSON summary of the real Aman data (src/data/aman_radar.json) for one district, for the voice assistant:
// one row per upazila. Pure, so Node tests can call it with the file they read themselves.
// `onset` (src/radar/onset.js onsetSummary) adds when the rains set in, for Godagari and Dhamrai.
export function radarSummary(aman, districtId = 'rajshahi', onset = null) {
  const d = aman.districts[districtId] ?? aman.districts.rajshahi;
  const year = aman.years.radar[1];
  return {
    synthetic: false,
    through: aman.provenance.through,
    year,
    shiftDays: aman.shiftDays,
    district: { bn: d.bn, en: d.en },
    onset: onset && { upazila: onset.upazila, usual: onset.usual, latest: onset.latest, current: onset.current, perDecade: onset.trend.perDecade, p: onset.trend.p, significant: onset.trend.significant },
    units: d.upazilas.map((u) => ({
      id: u.id,
      name: { bn: u.bn, en: u.en },
      category: u.category, shift: u.shift, transplantNormal: u.transplantNormal, rainNormal: u.rainNormal,
      rainTrendPerDecade: u.rainTrend.perDecade, p: u.rainTrend.p, significant: u.rainTrend.significant,
      latest: u.seasons[year] ?? null,
    })),
  };
}
