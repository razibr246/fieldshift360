// Soil Chemistry, Environmental Physics & Fossil Carbon Balance Engine.
// Models:
//   1. Soil Chemistry & Cation Exchange Capacity (CEC in cmol_c/kg) and Base Saturation (BS%).
//   2. Three-pool Soil Organic Carbon (SOC) fractionation:
//        - Labile / Active biological carbon (turnover 1-2 years)
//        - Slow Humus / Humic aggregate carbon (turnover 20-50 years)
//        - Fossilized / Recalcitrant Mineral-Associated Paleosol carbon (turnover 500-2,000+ years)
//   3. Environmental fossil-fuel diesel displacement from reduced groundwater pumping.
//   4. Net multi-gas Global Warming Potential (GWP_100 in kg CO2e/bigha).

import { BIGHA_HA } from './crops.js';

// Diesel fuel emission factor: 2.68 kg CO2 per liter diesel (IPCC 2006 guidelines, mobile combustion)
export const DIESEL_EMISSION_FACTOR = 2.68;
// Pumping energy requirement for smallholder shallow tube wells (STW): ~0.085 liters diesel per m3 water lifted
export const DIESEL_PER_M3_WATER = 0.085;
// 1 mm of water depth over 1 bigha (1,333 m2) = 1.333 m3 water
export const M3_PER_MM_BIGHA = 1.333;

// Cation Exchange Capacity (CEC) estimation using ISRIC / FAO pedotransfer function:
// CEC (cmol_c/kg) = (0.42 * clay%) + (2.1 * OM%) + pH buffer term
export function calculateCEC({ clayPct = 25, omPct = 1.5, ph = 6.0 }) {
  const c = Math.max(0, Math.min(100, clayPct));
  const om = Math.max(0.1, Math.min(15, omPct));
  const pH = Math.max(3.5, Math.min(9.5, ph));

  // Variable pH-dependent charge component (organic matter carboxyl & phenolic hydroxyl ionization)
  const phCharge = Math.max(0, (pH - 4.5) * 0.85);
  const cec = 0.42 * c + 2.1 * om + phCharge;
  return Math.round(cec * 10) / 10;
}

// Base Saturation percentage (BS%):
// Proportion of CEC occupied by basic cations (Ca2+, Mg2+, K+, Na+) vs acidic cations (H+, Al3+)
export function calculateBaseSaturation({ cec, ph, landform = 'alluvium' }) {
  const pH = Math.max(3.5, Math.min(9.5, ph));
  // Empirical sigmoid curve relating soil pH to base saturation in subtropical soils
  // pH 5.5 is ~50% base saturation, pH 7.0 is ~85-90%
  const bs = 100 / (1 + Math.exp(-1.4 * (pH - 5.5)));
  const boundedBs = Math.max(10, Math.min(98, Math.round(bs * 10) / 10));

  // Partition cations according to typical Bengal delta mineralogy
  // Barind terrace (kaolinite/iron-rich) has lower Ca/Mg ratio than active floodplains (illite/smectite)
  const totalBases = (boundedBs / 100) * cec;
  const isBarind = landform === 'barind';

  const caRatio = isBarind ? 0.60 : 0.68;
  const mgRatio = isBarind ? 0.25 : 0.22;
  const kRatio = 0.07;
  const naRatio = Math.max(0.01, 1 - (caRatio + mgRatio + kRatio));

  return {
    baseSaturationPct: boundedBs,
    totalBasesCmol: Math.round(totalBases * 10) / 10,
    caCmol: Math.round(totalBases * caRatio * 10) / 10,
    mgCmol: Math.round(totalBases * mgRatio * 10) / 10,
    kCmol: Math.round(totalBases * kRatio * 10) / 10,
    naCmol: Math.round(totalBases * naRatio * 10) / 10,
    acidityCmol: Math.round(Math.max(0, cec - totalBases) * 10) / 10,
  };
}

// Three-Pool Soil Organic Carbon (SOC) Fractionation:
// Separates soil carbon into biological labile, humus aggregate, and fossilized/recalcitrant mineral fractions.
export function calculateCarbonPools({ totalCarbonTHa = 28, landform = 'alluvium', clayPct = 25 }) {
  const cTot = Math.max(5, totalCarbonTHa);
  const isBarind = landform === 'barind';

  // Barind Pleistocene red paleosol has higher mineral-bound fossilized recalcitrant carbon (up to 32%)
  // Active floodplains have more recent alluvial labile carbon
  const fossilShare = isBarind ? 0.32 : Math.min(0.28, 0.16 + (clayPct / 100) * 0.18);
  const labileShare = isBarind ? 0.14 : 0.20;
  const humusShare = Math.max(0.40, 1 - (fossilShare + labileShare));

  const labileTHa = Math.round(cTot * labileShare * 100) / 100;
  const humusTHa = Math.round(cTot * humusShare * 100) / 100;
  const fossilTHa = Math.round(cTot * fossilShare * 100) / 100;

  return {
    totalTHa: cTot,
    labile: { tHa: labileTHa, pct: Math.round(labileShare * 100), turnoverYears: '১–২ বছর (Labile active)' },
    humus: { tHa: humusTHa, pct: Math.round(humusShare * 100), turnoverYears: '২০–৫০ বছর (Stable humus)' },
    fossilPaleosol: { tHa: fossilTHa, pct: Math.round(fossilShare * 100), turnoverYears: '৫০০–২,০০০+ বছর (Recalcitrant mineral-fossil)' },
  };
}

// Environmental Fossil Fuel (Diesel) Offset from Reduced Groundwater Pumping:
// Pumping 1 mm water over 1 bigha requires ~1.333 m3 water = ~0.113 liters diesel in a shallow tube well.
export function calculateFossilDieselOffset({ waterSavedMm = 120, areaBigha = 1 }) {
  const savedMm = Math.max(0, waterSavedMm);
  const bigha = Math.max(0.1, areaBigha);

  const m3Saved = savedMm * M3_PER_MM_BIGHA * bigha;
  const dieselLitersSaved = Math.round(m3Saved * DIESEL_PER_M3_WATER * 10) / 10;
  const avoidedCo2Kg = Math.round(dieselLitersSaved * DIESEL_EMISSION_FACTOR * 10) / 10;

  return {
    waterSavedMm: savedMm,
    m3Saved: Math.round(m3Saved),
    dieselLitersSaved,
    avoidedCo2Kg,
    dieselCostSavedBdt: Math.round(dieselLitersSaved * 105), // ~105 BDT/liter diesel in Bangladesh
  };
}

// Comprehensive Net Multi-Gas Environmental Footprint:
// Fuses:
//   - ICBM soil organic carbon change (t CO2 sequestered)
//   - Avoided paddy methane emissions (CH4 has 28x GWP100 of CO2)
//   - Avoided diesel burning emissions (fossil fuel CO2)
export function calculateNetEnvironmentalFootprint({
  icbmDeltaC = 0.45,       // t C/ha sequestered
  ch4AvoidedKg = 18,       // kg CH4 avoided per bigha
  waterSavedMm = 140,      // mm irrigation water saved
  areaBigha = 1,
}) {
  const bigha = Math.max(0.1, areaBigha);
  const ha = bigha * BIGHA_HA;

  // 1 t C sequestered = 3.667 t CO2e
  const soilCo2eKg = Math.round(icbmDeltaC * 3667 * ha);

  // CH4 GWP100 = 28 (IPCC AR6)
  const ch4Co2eKg = Math.round(ch4AvoidedKg * 28 * bigha);

  // Avoided fossil fuel diesel
  const dieselOffset = calculateFossilDieselOffset({ waterSavedMm, areaBigha: bigha });
  const dieselCo2eKg = Math.round(dieselOffset.avoidedCo2Kg);

  const netClimateMitigationCo2eKg = soilCo2eKg + ch4Co2eKg + dieselCo2eKg;

  return {
    areaBigha: bigha,
    soilCo2eKg,
    ch4Co2eKg,
    dieselCo2eKg,
    dieselLitersSaved: dieselOffset.dieselLitersSaved,
    dieselCostSavedBdt: dieselOffset.dieselCostSavedBdt,
    netClimateMitigationCo2eKg,
    netTonnesCo2e: Math.round((netClimateMitigationCo2eKg / 1000) * 100) / 100,
  };
}
