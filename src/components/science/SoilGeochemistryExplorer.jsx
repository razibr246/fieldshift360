import { useState, useMemo } from 'react';
import { FlaskConical, Atom, Droplets, Fuel, Sparkles, Layers, ShieldCheck, ChevronRight, Info, AlertTriangle, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import {
  calculateCEC,
  calculateBaseSaturation,
  calculateCarbonPools,
  calculateFossilDieselOffset,
  calculateNetEnvironmentalFootprint,
} from '../../engine/soilChemistry';

export default function SoilGeochemistryExplorer() {
  const { T, s } = useStore();
  const lang = s.lang;

  // Interactive state parameters
  const [clayPct, setClayPct] = useState(28); // %
  const [omPct, setOmPct] = useState(1.4);    // %
  const [pH, setPH] = useState(6.2);          // pH units
  const [isBarind, setIsBarind] = useState(false); // Pleistocene terrace vs active alluvium
  const [bighas, setBighas] = useState(3);     // bigha land area
  const [cropType, setCropType] = useState('mustard'); // 'mustard' | 'lentil' | 'boro'

  // Computed Geochemical & Physical Dynamics
  const cec = useMemo(
    () => calculateCEC({ clayPct, omPct, ph: pH }),
    [clayPct, omPct, pH]
  );

  const landform = isBarind ? 'barind' : 'alluvium';

  const bsResult = useMemo(
    () => calculateBaseSaturation({ cec, ph: pH, landform }),
    [cec, pH, landform]
  );

  // Bulk density estimate based on organic matter and clay
  const bulkDensityGcm3 = (1.55 - 0.05 * omPct - 0.002 * clayPct).toFixed(2);
  // Estimate total SOC in 0-30cm (t C/ha) = (OM / 1.724) * bulkDensity * 30
  const totalSOC_t_ha = Math.max(10, Math.round((omPct / 1.724) * parseFloat(bulkDensityGcm3) * 30));

  const carbonPools = useMemo(
    () => calculateCarbonPools({ totalCarbonTHa: totalSOC_t_ha, landform, clayPct }),
    [totalSOC_t_ha, landform, clayPct]
  );

  // Water savings relative to flooded Boro (approx mm saved per bigha)
  // Mustard: 180 mm saved
  // Lentil: 220 mm saved
  // Boro AWD: 70 mm saved
  const waterSavedMm = cropType === 'mustard' ? 180 : cropType === 'lentil' ? 220 : 70;

  const dieselOffset = useMemo(
    () => calculateFossilDieselOffset({ waterSavedMm, areaBigha: bighas }),
    [waterSavedMm, bighas]
  );

  const netFootprint = useMemo(
    () =>
      calculateNetEnvironmentalFootprint({
        icbmDeltaC: cropType === 'lentil' ? 0.65 : cropType === 'mustard' ? 0.45 : 0.15,
        ch4AvoidedKg: cropType === 'boro' ? 6 : 22,
        waterSavedMm,
        areaBigha: bighas,
      }),
    [cropType, waterSavedMm, bighas]
  );

  return (
    <section className="mt-12 overflow-hidden rounded-[30px] border border-primary-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-9">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-800 shadow-xs">
            <FlaskConical size={22} className="text-primary-700" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
                {T('মাটির ভূ-রসায়ন, প্রাচীন জীবাশ্ম কার্বন ও ডিজেল সাশ্রয় সিমুলেটর',
                   'Soil Geochemistry, Paleosol Fossil Carbon & Diesel Offset Simulator')}
              </h2>
              <Tags list={['MODEL', 'RULE']} />
            </div>
            <p className="text-[13px] text-muted">
              {T('ক্যাটায়ন বিনিময় ক্ষমতা (CEC), বেস স্যাচুরেশন, প্লাইস্টোসিন প্রাচীন কার্বন স্তর ও ভূগর্ভস্থ পানি পাম্পিং জ্বালানি সাশ্রয় হিসাব',
                 'Cation Exchange Capacity (CEC), Base Saturation %, 3-pool Pleistocene paleosol carbon dynamics, and STW avoided diesel emissions')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Real-time Computation Results on Right */}
      <div className="mt-7 grid gap-8 lg:grid-cols-[1.1fr_1.3fr]">
        {/* Left Column: Interactive Geochemical & Agronomic Sliders */}
        <div className="flex flex-col gap-5 rounded-[24px] border border-border/80 bg-slate-50/60 p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <Atom size={17} className="text-primary-700" />
            {T('রাসায়নিক ও ভৌত প্যারামিটার নির্বাচন করুন', 'Adjust Geochemical & Physical Inputs')}
          </h3>

          {/* Crop Mode Switch */}
          <div>
            <label className="text-[12.5px] font-bold text-ink block mb-1.5">
              {T('ফসল নির্বাচন (Crop Choice vs Continuous Boro)', 'Target Rabi Crop')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'mustard', bn: 'সরিষা (Mustard)', en: 'Mustard' },
                { id: 'lentil', bn: 'মসুর ডাল (Lentil)', en: 'Lentil' },
                { id: 'boro', bn: 'বোরো AWD (Rice)', en: 'Boro AWD' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCropType(c.id)}
                  className={`rounded-xl py-2 px-1 text-center text-[12px] font-bold transition-all ${
                    cropType === c.id
                      ? 'border border-primary-600 bg-primary-600 text-white shadow-xs'
                      : 'border border-border bg-white text-ink hover:border-primary-300'
                  }`}
                >
                  {T(c.bn, c.en)}
                </button>
              ))}
            </div>
          </div>

          {/* Landform Switch: Barind Pleistocene vs Active Floodplain */}
          <div>
            <label className="text-[12.5px] font-bold text-ink block mb-1.5">
              {T('ভূমির ভূতাত্ত্বিক গঠন (Landform Geology)', 'Geological Formation')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsBarind(false)}
                className={`rounded-xl py-2 px-2.5 text-left text-[12px] font-bold transition-all ${
                  !isBarind
                    ? 'border border-primary-600 bg-primary-50 text-primary-900 shadow-xs ring-1 ring-primary-500/30'
                    : 'border border-border bg-white text-muted hover:border-primary-300'
                }`}
              >
                <span>{T('সক্রিয় প্লাবনভূমি পলি', 'Active Alluvial Plain')}</span>
                <span className="block text-[10.5px] font-normal text-muted">{T('ইল্লাইট ও স্মেকটাইট কাদা', 'Illite / Smectite rich')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBarind(true)}
                className={`rounded-xl py-2 px-2.5 text-left text-[12px] font-bold transition-all ${
                  isBarind
                    ? 'border border-amber-600 bg-amber-50 text-amber-950 shadow-xs ring-1 ring-amber-500/30'
                    : 'border border-border bg-white text-muted hover:border-amber-300'
                }`}
              >
                <span>{T('বরেন্দ্র প্রাচীন লাল মাটি', 'Barind Paleosol')}</span>
                <span className="block text-[10.5px] font-normal text-muted">{T('প্লাইস্টোসিন প্রাচীন মৃত্তিকা', 'Pleistocene weathered')}</span>
              </button>
            </div>
          </div>

          {/* Clay Content Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('মাটির এঁটেল বা কাদার ভাগ (Clay %)', 'Clay Fraction')}</span>
              <span className="text-primary-700 tabular">{T(`${bnDigits(clayPct)}%`, `${clayPct}%`)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="65"
              step="1"
              value={clayPct}
              onChange={(e) => setClayPct(parseInt(e.target.value, 10))}
              className="mt-1.5 w-full accent-primary-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10.5px] text-muted">
              <span>{T('বেলে দোআঁশ (৫%)', 'Sandy (5%)')}</span>
              <span>{T('পলি দোআঁশ (২৮%)', 'Loam (28%)')}</span>
              <span>{T('বরেন্দ্র ভারী এঁটেল (৬৫%)', 'Barind Heavy Clay (65%)')}</span>
            </div>
          </div>

          {/* Soil Organic Matter Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('জৈব পদার্থ (Soil Organic Matter %)', 'Organic Matter (OM %)')}</span>
              <span className="text-emerald-700 tabular">{T(`${bnDigits(omPct.toFixed(1))}%`, `${omPct.toFixed(1)}%`)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.5"
              step="0.1"
              value={omPct}
              onChange={(e) => setOmPct(parseFloat(e.target.value))}
              className="mt-1.5 w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10.5px] text-muted">
              <span>{T('অবনমিত মাটি (০.৫%)', 'Degraded (0.5%)')}</span>
              <span>{T('জাতীয় গড় (১.৪%)', 'National Avg (1.4%)')}</span>
              <span>{T('উর্বর আদর্শ মাটি (৪.৫%)', 'High Tilth (4.5%)')}</span>
            </div>
          </div>

          {/* Soil pH Slider */}
          <div>
            <div className="flex items-center justify-between text-[12.5px] font-bold text-ink">
              <span>{T('মাটির অম্লত্ব / ক্ষারত্ব (pH)', 'Soil pH Level')}</span>
              <span className="text-amber-800 tabular">{T(bnDigits(pH.toFixed(1)), pH.toFixed(1))}</span>
            </div>
            <input
              type="range"
              min="4.5"
              max="8.5"
              step="0.1"
              value={pH}
              onChange={(e) => setPH(parseFloat(e.target.value))}
              className="mt-1.5 w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10.5px] text-muted">
              <span>{T('তীব্র অম্লীয় (৪.৫)', 'Acidic (4.5)')}</span>
              <span>{T('নিরপেক্ষ আদর্শ (৬.৫–৭.০)', 'Neutral (6.5–7.0)')}</span>
              <span>{T('ক্ষারীয় (৮.৫)', 'Alkaline (8.5)')}</span>
            </div>
          </div>

          {/* Land Area Slider */}
          <div className="pt-1 border-t border-border/60">
            <div className="flex items-center justify-between text-[12px] font-bold text-ink">
              <span>{T('জমির পরিমাণ (Land Area)', 'Field Size')}</span>
              <span className="text-primary-800 tabular">{T(`${bnDigits(bighas)} বিঘা`, `${bighas} bigha`)}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={bighas}
              onChange={(e) => setBighas(parseInt(e.target.value, 10))}
              className="mt-1 w-full accent-primary-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Real-time Geochemical & Environmental Results */}
        <div className="flex flex-col gap-5">
          {/* 1. CEC & Base Saturation Section */}
          <div className="rounded-[24px] border border-border bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-muted block">
                  {T('ক্যাটায়ন বিনিময় ক্ষমতা (CEC)', 'Cation Exchange Capacity (CEC)')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[26px] font-bold text-primary-950 tabular">
                    {T(bnDigits(cec.toFixed(1)), cec.toFixed(1))}
                  </span>
                  <span className="text-[13px] font-semibold text-muted">cmol(+)/kg</span>
                </div>
              </div>

              {/* Base Saturation Pill */}
              <div className="text-right">
                <span className="text-[11px] font-semibold text-muted block">{T('বেস স্যাচুরেশন', 'Base Saturation')}</span>
                <span className="font-display text-[20px] font-bold text-emerald-800 tabular">
                  {T(`${bnDigits(bsResult.baseSaturationPct.toFixed(0))}%`, `${bsResult.baseSaturationPct.toFixed(0)}%`)}
                </span>
              </div>
            </div>

            {/* Base Saturation Progress Bar */}
            <div className="mt-3">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, bsResult.baseSaturationPct)}%` }}
                  title="Exchangeable Base Cations (Ca2+, Mg2+, K+, Na+)"
                />
                <div
                  className="bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, 100 - bsResult.baseSaturationPct)}%` }}
                  title="Exchangeable Acid Cations (H+, Al3+)"
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted">
                <span className="text-emerald-700 font-medium">
                  {T(`ক্ষারীয় পুষ্টি ক্যাটায়ন (Ca²⁺, Mg²⁺, K⁺): ${bnDigits(bsResult.totalBasesCmol.toFixed(1))} cmol`,
                     `Base cations (Ca, Mg, K): ${bsResult.totalBasesCmol.toFixed(1)} cmol`)}
                </span>
                <span className="text-amber-700 font-medium">
                  {T(`অম্লীয় ক্যাটায়ন (H⁺/Al³⁺): ${bnDigits(bsResult.acidityCmol.toFixed(1))} cmol`,
                     `Acid cations (H/Al): ${bsResult.acidityCmol.toFixed(1)} cmol`)}
                </span>
              </div>
            </div>

            <p className="mt-3 text-[12px] leading-relaxed text-ink/75 border-t border-border/60 pt-2.5">
              {T(
                `মাটির বাফারিং ক্ষমতা: ${bsResult.baseSaturationPct > 70 ? 'শক্তিশালী — ইউরিয়া সারের অম্লীয় প্রভাব সহজে প্রশমিত হয়।' : 'মাঝারি — অম্লত্ব রোধে জৈব সার ও ডলোমাইট প্রয়োগ উপকারী।'} পেডোট্রান্সফার সূত্র: CEC = ০.৪২×কাদা% + ২.১×জৈবপদার্থ% + pH-নির্ভর চার্জ।`,
                `Buffering capacity: ${bsResult.baseSaturationPct > 70 ? 'High — effectively neutralizes nitrification acidity from urea.' : 'Moderate — organic amendments or agricultural lime beneficial.'} Pedotransfer: CEC = 0.42×Clay% + 2.1×OM% + pH-dependent charge.`
              )}
            </p>
          </div>

          {/* 2. Three-Pool Soil Carbon & Ancient Paleosol Stratum */}
          <div className="rounded-[24px] border border-amber-200/90 bg-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-amber-900 block">
                  {T('মাটির কার্বন ভাণ্ডার ও প্রাচীন জীবাশ্ম কার্বন স্তর', '3-Pool Soil Organic Carbon & Paleosol Storage')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[24px] font-bold text-amber-950 tabular">
                    {T(`${bnDigits(totalSOC_t_ha)} টন C/হেক্টর`, `${totalSOC_t_ha} t C/ha`)}
                  </span>
                  <span className="text-[12px] text-muted">{T('(০-৩০ সেমি স্তর)', '(0-30 cm stratum)')}</span>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/70 px-2.5 py-1 text-[11.5px] font-bold text-amber-900">
                {T('ICBM ৩-পুল মডেল', 'ICBM 3-Pool')}
              </span>
            </div>

            {/* 3-Pool Visual Partition */}
            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-emerald-200 bg-white p-2.5">
                <span className="block text-[11px] font-bold text-emerald-800">{T('লেবাইল পুল (সক্রিয়)', 'Labile Pool')}</span>
                <span className="font-display block text-[16px] font-bold text-emerald-950 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.labile.tHa.toFixed(1))} টন`, `${carbonPools.labile.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[10px] text-muted">{T('স্থায়িত্ব: ১-২ বছর', '1-2 yr turnover')}</span>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white p-2.5">
                <span className="block text-[11px] font-bold text-sky-800">{T('হিউমাস পুল (ধীর)', 'Humus Pool')}</span>
                <span className="font-display block text-[16px] font-bold text-sky-950 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.humus.tHa.toFixed(1))} টন`, `${carbonPools.humus.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[10px] text-muted">{T('স্থায়িত্ব: ২০-৫০ বছর', '20-50 yr turnover')}</span>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-100/60 p-2.5">
                <span className="block text-[11px] font-bold text-amber-900">{T('প্লাইস্টোসিন জীবাশ্ম কার্বন', 'Fossil Paleosol')}</span>
                <span className="font-display block text-[16px] font-bold text-amber-950 tabular mt-0.5">
                  {T(`${bnDigits(carbonPools.fossilPaleosol.tHa.toFixed(1))} টন`, `${carbonPools.fossilPaleosol.tHa.toFixed(1)} t`)}
                </span>
                <span className="block text-[10px] text-amber-800 font-semibold">{T('স্থায়িত্ব: ৫০০-২০০০+ বছর', '500-2,000+ yr')}</span>
              </div>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-amber-950/80">
              {T(
                `বরেন্দ্র ও মধুপুরের প্রাচীন লাল মাটিতে নিষ্ক্রিয় খনিজ-আবদ্ধ জীবাশ্ম কার্বন সঞ্চিত থাকে (${bnDigits(carbonPools.fossilPaleosol.pct)}%) যা হাজার বছর ধরে স্থিতিশীল। রবিতে কম সেচের ডাল ও তৈলবীজ চাষ করলে এই গভীর কার্বন সুরক্ষিত থাকে।`,
                `Ancient Pleistocene red clays of Barind and Madhupur hold organo-mineral recalcitrant paleosol carbon (${carbonPools.fossilPaleosol.pct}%) stable for millennia. Low-water Rabi rotations protect this deep carbon.`
              )}
            </p>
          </div>

          {/* 3. Avoided Fossil Fuel Diesel Pumping Displacement */}
          <div className="rounded-[24px] border border-sky-200/90 bg-sky-50/50 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11.5px] font-bold uppercase tracking-wider text-sky-900 block">
                  {T('জীবাশ্ম ডিজেল সাশ্রয় ও বায়ুমণ্ডলীয় কার্বন নিঃসরণ হ্রাস', 'Avoided Fossil Diesel & Pumping Emission Offset')}
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[26px] font-bold text-sky-950 tabular">
                    {T(`${bnDigits(dieselOffset.dieselLitersSaved.toFixed(1))} লিটার ডিজেল`, `${dieselOffset.dieselLitersSaved.toFixed(1)} L Diesel`)}
                  </span>
                </div>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-200/80 text-sky-900">
                <Fuel size={20} />
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-xl bg-white p-2.5 border border-sky-100">
                <span className="text-muted block text-[11px]">{T('সরাসরি CO₂ নিঃসরণ রোধ', 'Fossil CO₂ Avoided')}</span>
                <span className="font-display text-[17px] font-bold text-sky-950 tabular">
                  {T(`${bnDigits(dieselOffset.avoidedCo2Kg.toFixed(1))} কেজি`, `${dieselOffset.avoidedCo2Kg.toFixed(1)} kg`)}
                </span>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-sky-100">
                <span className="text-muted block text-[11px]">{T('জ্বালানি খরচ সাশ্রয়', 'Fuel Cost Saved')}</span>
                <span className="font-display text-[17px] font-bold text-sky-950 tabular">
                  {T(`৳${bnDigits(dieselOffset.dieselCostSavedBdt.toLocaleString())}`, `BDT ${dieselOffset.dieselCostSavedBdt.toLocaleString()}`)}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11.5px] text-sky-950 font-medium">
              <span>{T('মোট সার্বিক জলবায়ু প্রশমন (মিথেন + মাটি কার্বন + ডিজেল):', 'Net Climate Mitigation (CH₄ + SOC + Diesel):')}</span>
              <span className="font-bold text-emerald-800 tabular">
                {T(`${bnDigits(netFootprint.netClimateMitigationCo2eKg.toLocaleString())} কেজি CO₂e`, `${netFootprint.netClimateMitigationCo2eKg.toLocaleString()} kg CO₂e`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
