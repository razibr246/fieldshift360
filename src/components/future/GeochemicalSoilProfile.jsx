// Geochemical Soil Profile & Fossil Carbon Stratigraphy (Field Future & Science).
// Explores soil physics, soil chemistry (CEC, Base Saturation, pH buffering),
// three-tier carbon pools (Labile active vs Stable Humus vs Recalcitrant Paleosol Fossil Carbon),
// and fossil-fuel diesel displacement from reduced tube well irrigation pumping.
import { useState, useMemo } from 'react';
import { Layers, FlaskConical, Flame, Droplets, ShieldCheck, Sparkles, SlidersHorizontal, Info, Award } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge, ScoreRing } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import {
  calculateCEC,
  calculateBaseSaturation,
  calculateCarbonPools,
  calculateFossilDieselOffset,
  calculateNetEnvironmentalFootprint,
} from '../../engine/soilChemistry';

const HORIZONS = [
  {
    id: 'ap',
    depthRange: '০–১৫ সেমি (0–15 cm)',
    nameBn: 'Ap কর্ষিত স্তর (Cultivated Topsoil)',
    nameEn: 'Ap Cultivated Topsoil',
    clayPct: 24,
    omPct: 1.8,
    ph: 6.1,
    descBn: 'জৈব পদার্থ সমৃদ্ধ ঝুরঝুরে গঠন, সক্রিয় অণুজীব ও মূলমণ্ডলের প্রধান বিস্তার।',
    descEn: 'Biologically active crumb structure with dense fine roots and high labile carbon turnover.',
    color: '#5a3d28',
    bg: 'bg-amber-950/20',
  },
  {
    id: 'pan',
    depthRange: '১৫–২২ সেমি (15–22 cm)',
    nameBn: 'লাঙলের তলা / হার্ডপ্যান (Plough Pan)',
    nameEn: 'Plough Hardpan',
    clayPct: 34,
    omPct: 0.9,
    ph: 5.8,
    descBn: 'ধানের কাদা তৈরির চাপে জমাট শক্ত স্তর; পানি চুইয়ে যাওয়া আটকায় তবে গভীর মূলের চলাচলে বাধা দেয়।',
    descEn: 'Dense compacted barrier formed by rice puddling; restricts percolation and deep taproots.',
    color: '#784c28',
    bg: 'bg-amber-900/25',
  },
  {
    id: 'b',
    depthRange: '২২–৪৫ সেমি (22–45 cm)',
    nameBn: 'B অন্তর্মৃত্তিকা স্তর (Subsoil Horizon)',
    nameEn: 'B Subsoil Horizon',
    clayPct: 38,
    omPct: 0.6,
    ph: 5.6,
    descBn: 'ধৌত এঁটেল কণার সঞ্চয় ও লোহার মরিচাধরা ছোপ (Mottles); উচ্চ ক্যাটায়ন বিনিময় ক্ষমতা (CEC)।',
    descEn: 'Illuvial clay accumulation with redoximorphic iron mottles and high mineral CEC capacity.',
    color: '#8c532b',
    bg: 'bg-orange-950/20',
  },
  {
    id: 'c',
    depthRange: '৪৫–৬০+ সেমি (45–60+ cm)',
    nameBn: 'C জীবাশ্ম স্তর ও প্রাচীন বরেন্দ্র কাদামাটি (Paleosol & Fossil Carbon)',
    nameEn: 'C Paleosol & Fossilized Carbon',
    clayPct: 42,
    omPct: 0.4,
    ph: 5.3,
    descBn: 'প্লাইস্টোসিন যুগের প্রাচীন লালচে বরেন্দ্র মৃত্তিকা; খনিজ কণার সাথে ৫০০–২,০০০ বছরের পুরোনো স্থায়ী জীবাশ্ম কার্বন আবদ্ধ।',
    descEn: 'Pleistocene ancient red paleosol with recalcitrant mineral-associated fossil carbon stabilized over 500–2,000+ years.',
    color: '#9e4222',
    bg: 'bg-rose-950/25',
  },
];

export default function GeochemicalSoilProfile({ soil, farmer, waterSavedMm = 135 }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [tab, setTab] = useState('pools'); // 'chem' | 'pools' | 'fossil'
  const [selectedHorizonId, setSelectedHorizonId] = useState('ap');

  const landform = soil?.landform ?? (farmer?.id === 'RAHIM' ? 'barind' : 'alluvium');
  const horizon = HORIZONS.find((h) => h.id === selectedHorizonId) ?? HORIZONS[0];

  // Geochemical calculations
  const cec = useMemo(
    () => calculateCEC({ clayPct: horizon.clayPct, omPct: horizon.omPct, ph: horizon.ph }),
    [horizon]
  );

  const baseSat = useMemo(
    () => calculateBaseSaturation({ cec, ph: horizon.ph, landform }),
    [cec, horizon.ph, landform]
  );

  const carbonPools = useMemo(
    () => calculateCarbonPools({ totalCarbonTHa: 28.5, landform, clayPct: horizon.clayPct }),
    [landform, horizon.clayPct]
  );

  const dieselOffset = useMemo(
    () => calculateFossilDieselOffset({ waterSavedMm, areaBigha: 1 }),
    [waterSavedMm]
  );

  const netEnv = useMemo(
    () =>
      calculateNetEnvironmentalFootprint({
        icbmDeltaC: 0.48,
        ch4AvoidedKg: 19.5,
        waterSavedMm,
        areaBigha: 1,
      }),
    [waterSavedMm]
  );

  return (
    <Card className="surface-card spotlight-card lift mt-8 overflow-hidden rounded-[28px] border border-clay-300/60 bg-white/95 p-5 sm:p-7 shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-clay-600 to-amber-700 text-white shadow-sm">
            <FlaskConical size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[19px] font-bold text-ink">
                {T('মৃত্তিকা রসায়ন, ভূ-প্রকৃতি ও জীবাশ্ম কার্বন প্রোফাইল', 'Geochemical Soil & Paleosol Fossil Carbon Profile')}
              </h2>
              <span className="rounded-full bg-clay-50 px-2.5 py-0.5 text-[11px] font-bold text-clay-800 ring-1 ring-clay-200">
                {T('৬০ সেমি উলম্ব স্তরচ্ছেদ', '60cm Depth Slice')}
              </span>
            </div>
            <p className="text-[12.5px] text-muted">
              {T(
                'আইএসআরআইসি সয়েলগ্রিডস ও এসআরডিআই তথ্যে মাটির ক্যাটায়ন বিনিময় (CEC), পিএইচ বাফার এবং শতাব্দীর প্রাচীন জীবাশ্ম কার্বনের স্তরবিন্যাস।',
                'ISRIC SoilGrids & SRDI cation exchange capacity (CEC), pH buffering, and century-old mineral-associated fossil carbon.'
              )}
            </p>
          </div>
        </div>
        <Tags list={['MODEL', 'RECORD', 'REAL']} />
      </div>

      {/* Analytical Tab Navigation */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist">
        {[
          { id: 'pools', icon: Layers, labelBn: 'কার্বন ভান্ডার ও জীবাশ্ম স্তর', labelEn: 'Carbon Pools & Fossil Paleosol' },
          { id: 'chem', icon: FlaskConical, labelBn: 'মৃত্তিকা রসায়ন ও ক্যাটায়ন (CEC)', labelEn: 'Soil Chemistry & Cations (CEC)' },
          { id: 'fossil', icon: Flame, labelBn: 'জীবাশ্ম জ্বালানি (ডিজেল) সাশ্রয়', labelEn: 'Fossil Diesel Offset' },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-clay-700 text-white shadow-xs'
                  : 'bg-canvas text-muted hover:bg-border/60 hover:text-ink'
              }`}
            >
              <Icon size={14} />
              <span>{L({ bn: t.labelBn, en: t.labelEn })}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Depth Stratigraphy (Left) + Geochemical Analysis Deck (Right) */}
      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        {/* Soil Horizon Stratigraphy Cut */}
        <div className="space-y-1.5 rounded-2xl border border-border/80 bg-canvas/60 p-2.5">
          <span className="block px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {T('মাটির স্তর বাছাই করুন:', 'Select Soil Horizon:')}
          </span>
          {HORIZONS.map((h) => {
            const isSelected = h.id === selectedHorizonId;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setSelectedHorizonId(h.id)}
                className={`w-full rounded-xl border p-2.5 text-left transition-all duration-150 active:scale-95 ${
                  isSelected
                    ? 'border-clay-600 bg-white shadow-xs ring-2 ring-clay-600/30'
                    : 'border-transparent bg-white/50 text-muted hover:border-border hover:bg-white/80'
                }`}
              >
                <div className="flex items-center justify-between text-[11.5px] font-bold">
                  <span style={{ color: h.color }}>{h.depthRange}</span>
                  <span className="text-[10.5px] font-medium text-muted">pH {num(h.ph, lang)}</span>
                </div>
                <div className="mt-0.5 text-[12px] font-bold text-ink truncate">
                  {L({ bn: h.nameBn, en: h.nameEn })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Analytical Mode Display */}
        <div className="rounded-2xl border border-border bg-canvas/40 p-5">
          {/* Horizon Context Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-wider text-clay-700">
                {horizon.depthRange} · {L({ bn: horizon.nameBn, en: horizon.nameEn })}
              </span>
              <p className="mt-0.5 text-[13px] text-muted">
                {L({ bn: horizon.descBn, en: horizon.descEn })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-bold text-ink shadow-2xs">
                {T('এঁটেল কণা (Clay): ', 'Clay: ')}{num(horizon.clayPct, lang)}%
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-bold text-ink shadow-2xs">
                {T('জৈব পদার্থ (OM): ', 'OM: ')}{num(horizon.omPct, lang)}%
              </span>
            </div>
          </div>

          {/* TAB 1: Carbon Pools & Fossil Paleosol Stratum */}
          {tab === 'pools' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-emerald-800">
                      {T('সক্রিয় জৈব কার্বন (Labile)', 'Active Labile Carbon')}
                    </span>
                    <span className="rounded-full bg-emerald-200/60 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                      {num(carbonPools.labile.pct, lang)}%
                    </span>
                  </div>
                  <div className="mt-2 font-display text-[20px] font-bold text-emerald-950">
                    {num(carbonPools.labile.tHa, lang)} {T('টন/হেক্টর', 't/ha')}
                  </div>
                  <span className="text-[11px] text-emerald-700">
                    {carbonPools.labile.turnoverYears}
                  </span>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-amber-800">
                      {T('স্থায়ী হিউমাস (Humus)', 'Stable Humus Pool')}
                    </span>
                    <span className="rounded-full bg-amber-200/60 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      {num(carbonPools.humus.pct, lang)}%
                    </span>
                  </div>
                  <div className="mt-2 font-display text-[20px] font-bold text-amber-950">
                    {num(carbonPools.humus.tHa, lang)} {T('টন/হেক্টর', 't/ha')}
                  </div>
                  <span className="text-[11px] text-amber-700">
                    {carbonPools.humus.turnoverYears}
                  </span>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-bold text-rose-800">
                      {T('প্রাচীন জীবাশ্ম কার্বন (Paleosol)', 'Fossil Paleosol Carbon')}
                    </span>
                    <span className="rounded-full bg-rose-200/60 px-2 py-0.5 text-[11px] font-bold text-rose-900">
                      {num(carbonPools.fossilPaleosol.pct, lang)}%
                    </span>
                  </div>
                  <div className="mt-2 font-display text-[20px] font-bold text-rose-950">
                    {num(carbonPools.fossilPaleosol.tHa, lang)} {T('টন/হেক্টর', 't/ha')}
                  </div>
                  <span className="text-[11px] text-rose-700">
                    {carbonPools.fossilPaleosol.turnoverYears}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-3.5 text-[12.5px] leading-relaxed text-ink/80">
                <p>
                  <b>{T('বরেন্দ্র অঞ্চলের ভূতাত্ত্বিক গুরুত্ব:', 'Geological Importance of Barind Paleosol:')}</b>{' '}
                  {T(
                    'বরেন্দ্র অঞ্চলের লাল মাটিতে থাকা প্রায় ৩২% কার্বন প্লাইস্টোসিন যুগের খনিজের সাথে শক্তভাবে আবদ্ধ জীবাশ্ম-সদৃশ কার্বন। এই গভীর কার্বন সহজে বাতাসে ওড়ে না; তবে গভীর চাষ বা অতিরিক্ত নালা কাটলে জারণ (oxidation) ঘটে কার্বন হারিয়ে যায়। সঠিক ফসলচক্র এই প্রাচীন কার্বন সংরক্ষণ করে।',
                    'Around 32% of soil carbon in Barind laterite soils is recalcitrant organo-mineral fossilized carbon formed during the Pleistocene era. It resists oxidation unless damaged by aggressive deep ploughing or excessive erosion.'
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: Soil Chemistry & Cation Exchange Capacity (CEC) */}
          {tab === 'chem' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-white p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {T('CEC ধারণক্ষমতা', 'CEC Capacity')}
                  </span>
                  <div className="mt-1 font-display text-[20px] font-bold text-primary-950">
                    {num(cec, lang)} <span className="text-[12px] font-normal text-muted">cmol(+)/kg</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {T('উচ্চ পুষ্টি ধারণক্ষমতা', 'High nutrient holding')}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-white p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {T('ক্ষারীয় সম্পৃক্তি (BS%)', 'Base Saturation')}
                  </span>
                  <div className="mt-1 font-display text-[20px] font-bold text-sky-950">
                    {num(baseSat.baseSaturationPct, lang)}%
                  </div>
                  <span className="text-[11px] text-sky-700 font-medium">
                    {T('ক্যাটায়ন ভারসাম্যে ভালো', 'Balanced base cations')}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-white p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {T('ক্যালসিয়াম (Ca²⁺)', 'Calcium (Ca²⁺)')}
                  </span>
                  <div className="mt-1 font-display text-[18px] font-bold text-ink">
                    {num(baseSat.caCmol, lang)} <span className="text-[11px] font-normal text-muted">cmol/kg</span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {T('প্রধান বিনিময়যোগ্য ক্ষার', 'Dominant base ion')}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-white p-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {T('ম্যাগনেসিয়াম (Mg²⁺)', 'Magnesium (Mg²⁺)')}
                  </span>
                  <div className="mt-1 font-display text-[18px] font-bold text-ink">
                    {num(baseSat.mgCmol, lang)} <span className="text-[11px] font-normal text-muted">cmol/kg</span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {T('ক্লোরোফিলের কেন্দ্রবিন্দু', 'Chlorophyll core')}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-3.5 text-[12.5px] leading-relaxed text-ink/80">
                <p>
                  <b>{T('রাসায়নিক পুষ্টি বাফারিং:', 'Chemical Nutrient Buffering:')}</b>{' '}
                  {T(
                    `বর্তমান স্তরের pH ${num(horizon.ph, lang)} এবং CEC ${num(cec, lang)} cmol/kg নির্দেশ করে যে জমিটি সার ও আর্দ্রতা দীর্ঘক্ষণ ধরে রাখতে সক্ষম। ডাল ও সরিষার শিকড় থেকে নিঃসৃত জৈব এসিড (Organic acids) অদ্রবণীয় ফসফরাসকে মুক্ত করে গাছের গ্রহণ উপযোগী করে।`,
                    `Current horizon pH ${horizon.ph} and CEC ${cec} cmol/kg indicate healthy cation retention. Pulse and mustard root exudates release organic acids that solubilize fixed phosphorus for crop uptake.`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Fossil Diesel Fuel Offset & Multi-Gas Environmental Mitigation */}
          {tab === 'fossil' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <span className="text-[11.5px] font-bold text-amber-900">
                    {T('সাশ্রয়কৃত ডিজেল জ্বালানি', 'Fossil Diesel Saved')}
                  </span>
                  <div className="mt-1 font-display text-[22px] font-bold text-amber-950">
                    {num(dieselOffset.dieselLitersSaved, lang)} {T('লিটার / বিঘা', 'L / bigha')}
                  </div>
                  <span className="text-[11px] text-amber-800">
                    {T('পাম্পিং খরচ সাশ্রয়: ৳', 'Pumping cost saved: ৳')}{num(dieselOffset.dieselCostSavedBdt, lang)}
                  </span>
                </div>

                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5">
                  <span className="text-[11.5px] font-bold text-sky-900">
                    {T('ডিজেলের ধোঁয়া প্রতিরোধ (CO₂)', 'Avoided Diesel Emissions')}
                  </span>
                  <div className="mt-1 font-display text-[22px] font-bold text-sky-950">
                    {num(dieselOffset.avoidedCo2Kg, lang)} {T('কেজি CO₂', 'kg CO₂')}
                  </div>
                  <span className="text-[11px] text-sky-800">
                    {T('বোরোর বদলে কম সেচের রবি ফসল', 'Replacing thirsty Boro with Rabi')}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <span className="text-[11.5px] font-bold text-emerald-900">
                    {T('মোট সার্বিক জলবায়ু সুরক্ষা', 'Net Multi-Gas Mitigation')}
                  </span>
                  <div className="mt-1 font-display text-[22px] font-bold text-emerald-950">
                    {num(netEnv.netClimateMitigationCo2eKg, lang)} {T('কেজি CO₂e', 'kg CO₂e')}
                  </div>
                  <span className="text-[11px] text-emerald-800">
                    {T('মাটি কার্বন + মিথেন হ্রাস + ডিজেল সাশ্রয়', 'Soil C + Methane avoided + Diesel saved')}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-3.5 text-[12.5px] leading-relaxed text-ink/80">
                <p>
                  <b>{T('জলবায়ু ও পরিবেশগত প্রভাব:', 'Environmental & Climate Impact:')}</b>{' '}
                  {T(
                    'ভূগর্ভস্থ গভীর ও অগভীর নলকূপে এক বিঘা জমিতে বোরো ধান চাষ করতে প্রায় ১৫০–২০০ লিটার ডিজেল বা সমমানের বিদ্যুৎ পোড়ে। সরিষা, মসুর বা গমে শিফট করলে প্রায় ১৩৫ মিমি সেচের পানি কম লাগে—যা সরাসরি বায়ুমণ্ডলে ডিজেল পোড়ানো কার্বন ও ভূগর্ভস্থ পানির অপচয় কমায়।',
                    'Irrigating one bigha of Boro paddy consumes 150–200 liters of diesel in tube wells. Shifting to mustard, lentils, or wheat saves ~135 mm of water, directly avoiding fossil fuel combustion and groundwater depletion.'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
