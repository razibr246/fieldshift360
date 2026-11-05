// Multi-Spectral Satellite Band Inspector for field parcels.
// Powered by Copernicus Sentinel-2 MSI (10m/20m) & Landsat-9 OLI-2.
// Visualizes True Color RGB, Color Infrared (CIR), Agriculture SWIR, and NDWI water indices with live spectral signature curves.
import { useState, useMemo } from 'react';
import { Eye, Layers, Sparkles, Droplets, Leaf, Activity, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';

const COMPOSITES = [
  {
    id: 'rgb',
    name: { bn: 'প্রাকৃতিক রঙ (True Color RGB)', en: 'True Color (Natural RGB)' },
    bands: 'B4 (লাল), B3 (সবুজ), B2 (নীল)',
    bandsEn: 'B4 (Red), B3 (Green), B2 (Blue)',
    desc: {
      bn: 'মানুষের চোখ মহাকাশ থেকে জমি যেমন দেখবে: ফসল, মাটি আর বাড়িঘরের স্বাভাবিক দৃশ্য।',
      en: 'Natural human vision perspective: displays crops, bare soil, and field boundaries as seen by eye.',
    },
    filterStyle: 'contrast(1.05) saturate(1.1)',
    badge: 'স্বাভাবিক দৃশ্য',
    badgeEn: 'Visual',
  },
  {
    id: 'cir',
    name: { bn: 'ইনফ্রারেড সবুজের সতেজতা (Color Infrared)', en: 'Color Infrared (CIR - Chlorophyll)' },
    bands: 'B8 (নিয়ার ইনফ্রারেড), B4 (লাল), B3 (সবুজ)',
    bandsEn: 'B8 (NIR), B4 (Red), B3 (Green)',
    desc: {
      bn: 'ক্লোরোফিল ইনফ্রারেড আলো প্রতিফলিত করে, তাই সুস্থ ও ঘন ফসল উজ্জ্বল গাঢ় লাল/ক্রিমসন দেখায়; দুর্বল বা আক্রান্ত ফসল ফিকে গোলাপি।',
      en: 'Chlorophyll reflects near-infrared; vigorous dense crops appear vivid crimson, while stressed plants show pale pink.',
    },
    filterStyle: 'sepia(0.3) saturate(2.4) hue-rotate(-50deg)',
    badge: 'সবুজের তেজ',
    badgeEn: 'Vigor',
  },
  {
    id: 'agri',
    name: { bn: 'কৃষি ও মাটির আর্দ্রতা (SWIR Composite)', en: 'Agriculture (SWIR Moisture)' },
    bands: 'B11 (শর্ট-ওয়েভ ইনফ্রারেড), B8 (NIR), B2 (নীল)',
    bandsEn: 'B11 (SWIR-1), B8 (NIR), B2 (Blue)',
    desc: {
      bn: 'কুয়াশা ও ধোঁয়াশা ভেদ করে মাটির নিচের আর্দ্রতা এবং ফসলের আসল পাতার পানি পরিমাপ করে। ভেজা মাটি গাঢ়, শুকনো মাটি হালকা।',
      en: 'Penetrates atmospheric haze to isolate canopy water content from bare soil moisture saturation.',
    },
    filterStyle: 'contrast(1.25) saturate(1.8) hue-rotate(45deg)',
    badge: 'মাটির রস',
    badgeEn: 'Moisture',
  },
  {
    id: 'ndwi',
    name: { bn: 'জলাবদ্ধতা ও সেচ সূচক (NDWI Water)', en: 'Water Index (NDWI Ponding)' },
    bands: '(B3 সবুজ − B8 NIR) / (B3 + B8)',
    bandsEn: '(B3 Green − B8 NIR) / (B3 + B8)',
    desc: {
      bn: 'জমিতে সেচের পানি জমে থাকা বা বর্ষার প্লাবন স্পষ্টভাবে নীল রঙে ফুটিয়ে তোলে। ধানের কাদায় পানি নিশ্চিত করার নির্ভরযোগ্য উপায়।',
      en: 'Isolates open water, standing irrigation ponding, and flash-flood submergence in bright fluorescent blue.',
    },
    filterStyle: 'invert(0.15) saturate(2.2) hue-rotate(160deg)',
    badge: 'পানির স্তর',
    badgeEn: 'Water Index',
  },
];

// 13 Spectral Bands of Sentinel-2 MSI with typical reflectance (%)
const SPECTRAL_BANDS = [
  { band: 'B1', nm: 443, name: 'Coastal', cropRef: 4, wetSoilRef: 6, drySoilRef: 12 },
  { band: 'B2', nm: 490, name: 'Blue', cropRef: 5, wetSoilRef: 8, drySoilRef: 16 },
  { band: 'B3', nm: 560, name: 'Green', cropRef: 12, wetSoilRef: 12, drySoilRef: 22 },
  { band: 'B4', nm: 665, name: 'Red', cropRef: 6, wetSoilRef: 14, drySoilRef: 28 },
  { band: 'B5', nm: 705, name: 'RedEdge1', cropRef: 18, wetSoilRef: 16, drySoilRef: 30 },
  { band: 'B6', nm: 740, name: 'RedEdge2', cropRef: 38, wetSoilRef: 18, drySoilRef: 32 },
  { band: 'B7', nm: 783, name: 'RedEdge3', cropRef: 46, wetSoilRef: 19, drySoilRef: 33 },
  { band: 'B8', nm: 842, name: 'NIR', cropRef: 52, wetSoilRef: 20, drySoilRef: 34 },
  { band: 'B8A', nm: 865, name: 'Narrow NIR', cropRef: 53, wetSoilRef: 20, drySoilRef: 34 },
  { band: 'B9', nm: 945, name: 'Vapor', cropRef: 22, wetSoilRef: 15, drySoilRef: 26 },
  { band: 'B11', nm: 1610, name: 'SWIR-1', cropRef: 24, wetSoilRef: 14, drySoilRef: 38 },
  { band: 'B12', nm: 2190, name: 'SWIR-2', cropRef: 12, wetSoilRef: 10, drySoilRef: 36 },
];

export default function MultiSpectralInspector({ parcel }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [activeCompositeId, setActiveCompositeId] = useState('rgb');
  const [showSpectralCurve, setShowSpectralCurve] = useState(true);

  const activeComp = COMPOSITES.find((c) => c.id === activeCompositeId) ?? COMPOSITES[0];

  return (
    <Card className="mt-5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
              <Layers size={18} />
            </span>
            <h3 className="text-[18px] font-bold text-ink">
              {T('মাল্টি-স্পেকট্রাল উপগ্রহ ব্যান্ড বিশ্লেষক', 'Multi-Spectral Satellite Band Inspector')}
            </h3>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            {T(
              'ইউরোপীয় স্পেস এজেন্সির সেন্টিনেল-২ এবং নাসার ল্যান্ডস্যাটের ১৩টি স্পেকট্রাল ব্যান্ডের আলো: অদৃশ্য ইনফ্রারেড ও শর্ট-ওয়েভ তরঙ্গদৈর্ঘ্য ব্যবহার করে ফসলের ক্লোরোফিল ঘনত্ব, মাটির রস এবং জলাবদ্ধতার প্রকৃত চিত্র উদ্ঘাটন করুন।',
              'Copernicus Sentinel-2 & Landsat 13-band surface reflectance: utilizes invisible near-infrared and short-wave infrared spectra to diagnose chlorophyll vigor, internal canopy hydration, and field standing water.'
            )}
          </p>
        </div>
        <Tags list={['SAT', 'MODEL']} />
      </div>

      {/* Composite Selector Buttons */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COMPOSITES.map((comp) => {
          const isSelected = comp.id === activeCompositeId;
          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => setActiveCompositeId(comp.id)}
              className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                isSelected
                  ? 'border-violet-600 bg-violet-50/90 shadow-xs ring-2 ring-violet-500/20'
                  : 'border-border bg-white hover:border-violet-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-ink">{L(comp.name)}</span>
                {isSelected && <CheckCircle2 size={14} className="text-violet-700" />}
              </div>
              <span className="mt-1 text-[11px] text-muted line-clamp-1">{comp.bands}</span>
            </button>
          );
        })}
      </div>

      {/* Active Composite Description Banner */}
      <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="mt-0.5 shrink-0 text-violet-700" />
          <div className="text-[12.5px] leading-5 text-ink/85">
            <span className="font-semibold text-violet-950">{L(activeComp.name)} ({activeComp.bands}):</span>{' '}
            {L(activeComp.desc)}
          </div>
        </div>
      </div>

      {/* Spectral Reflectance Profile Graph */}
      <div className="mt-4 rounded-xl border border-border bg-white p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <Activity size={15} className="text-violet-700" />
            {T('জমির বর্ণালী প্রতিফলন বক্ররেখা (Spectral Signature Curve)', 'Parcel Spectral Reflectance Signature')}
          </div>
          <div className="flex items-center gap-3 text-[11.5px]">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {T('সতেজ সবুজ ফসল', 'Healthy Crop')}
            </span>
            <span className="flex items-center gap-1 text-sky-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-sky-600" />
              {T('ভেজামাটি / পানি', 'Wet Soil / Water')}
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-semibold">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              {T('শুকনো খোলা মাটি', 'Dry Soil')}
            </span>
          </div>
        </div>

        {/* SVG Spectral Graph */}
        <div className="mt-3 overflow-x-auto">
          <svg viewBox="0 0 540 160" className="w-full min-w-[500px]" role="img" aria-label="Spectral Signature Curve">
            <defs>
              <linearGradient id="cropGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[20, 50, 80, 110, 140].map((y) => (
              <line key={y} x1="40" y1={y} x2="520" y2={y} stroke="#f1f5f9" strokeWidth="1" />
            ))}

            {/* Y Axis Labels (Reflectance 0% to 60%) */}
            <text x="32" y="24" textAnchor="end" fontSize="9" fill="#94a3b8">60%</text>
            <text x="32" y="64" textAnchor="end" fontSize="9" fill="#94a3b8">40%</text>
            <text x="32" y="104" textAnchor="end" fontSize="9" fill="#94a3b8">20%</text>
            <text x="32" y="144" textAnchor="end" fontSize="9" fill="#94a3b8">0%</text>

            {/* Spectral Points & Curve for Crop (Green) */}
            <path
              d={SPECTRAL_BANDS.map((b, i) => {
                const x = 50 + i * 39;
                const y = 140 - (b.cropRef / 60) * 120;
                return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
            />

            {/* Wet Soil / Water Curve (Sky Blue) */}
            <path
              d={SPECTRAL_BANDS.map((b, i) => {
                const x = 50 + i * 39;
                const y = 140 - (b.wetSoilRef / 60) * 120;
                return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="4 2"
            />

            {/* Dry Soil Curve (Amber) */}
            <path
              d={SPECTRAL_BANDS.map((b, i) => {
                const x = 50 + i * 39;
                const y = 140 - (b.drySoilRef / 60) * 120;
                return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#d97706"
              strokeWidth="1.8"
              strokeDasharray="2 2"
            />

            {/* Individual Band Markers & X Labels */}
            {SPECTRAL_BANDS.map((b, i) => {
              const x = 50 + i * 39;
              const y = 140 - (b.cropRef / 60) * 120;
              return (
                <g key={b.band}>
                  <circle cx={x} cy={y} r="3.5" fill="#16a34a" stroke="#ffffff" strokeWidth="1" />
                  <text x={x} y="152" textAnchor="middle" fontSize="8.5" fill="#64748b" fontWeight="600">
                    {b.band}
                  </text>
                  <text x={x} y="160" textAnchor="middle" fontSize="7" fill="#94a3b8">
                    {b.nm}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-2 text-[11px] text-muted text-center">
          {T(
            'তরঙ্গদৈর্ঘ্য (ন্যানোমিটার): দৃশ্যমান নীল (৪90nm) ও লাল (৬৬৫nm) শোষণ করে উদ্ভিদ ক্লোরোফিল তৈরি করে, আর নিয়ার-ইনফ্রারেড (B8: ৮৪২nm) জোরালোভাবে প্রতিফলিত করে।',
            'Wavelength (nm): Healthy plants absorb Blue (490nm) & Red (665nm) for photosynthesis while intensely scattering Near-Infrared (B8: 842nm).'
          )}
        </div>
      </div>
    </Card>
  );
}
