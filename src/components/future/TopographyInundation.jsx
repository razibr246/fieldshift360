// Interactive Micro-Topography & Monsoon Flood Inundation Simulator.
// Powered by NASA SRTM 30m (SRTMGL1) and NASA/METI ASTER GDEM v3 elevation consensus.
// Analyzes field parcel elevation, slope, hollow dips, and flood submergence risk for crop rotation feasibility.
import { useState, useMemo } from 'react';
import { Mountain, Waves, AlertTriangle, ShieldCheck, Info, CheckCircle2, ArrowUpDown } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge, Note } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { fieldTerrain, terrainRisk } from '../../engine/briefs';

export default function TopographyInundation({ parcelId }) {
  const { s, T, L, activeParcel, upazila } = useStore();
  const lang = s.lang;
  const currentParcelId = parcelId || activeParcel?.id;
  const terrain = useMemo(() => fieldTerrain(currentParcelId), [currentParcelId]);
  const trRisk = useMemo(() => terrainRisk(terrain), [terrain]);

  // Inundation water level slider in metres (0.0m to 2.5m)
  const [waterLevelM, setWaterLevelM] = useState(0.4);

  if (!terrain) {
    return (
      <Card id="ff-topo" className="mt-5 scroll-mt-40 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-primary-700" />
          <h2 className="text-[18px] font-bold">{T('জমির ভূ-প্রকৃতি ও উচ্চতা', 'Parcel Micro-Topography & Elevation')}</h2>
        </div>
        <p className="mt-2 text-[13.5px] text-muted">
          {T('এই নির্দিষ্ট প্লটের জন্য নাসা SRTM ও ASTER উচ্চতা উপাত্ত এখনো নিবন্ধিত হয়নি।', 'NASA SRTM and ASTER DEM elevation profiles have not been registered for this parcel.')}
        </p>
      </Card>
    );
  }

  const elev = terrain.elev;
  const relief = terrain.relief;
  const slope = terrain.slope;
  const spread = terrain.spread;

  // Hydrological land class definition
  const landClass = elev <= 7
    ? { bn: 'উপকূলীয় / অতি নিচু জমি (Lowland/Tidal)', en: 'Coastal / Lowland', tone: 'text-sky-700', bg: 'bg-sky-50' }
    : relief <= -1.2
    ? { bn: 'মাঝারি নিচু জমি / গর্ত (Depression/Hollow)', en: 'Depression / Hollow', tone: 'text-amber-700', bg: 'bg-amber-50' }
    : relief >= 1.0
    ? { bn: 'উঁচু জমি / চালা জমি (Ridge/Highland)', en: 'Highland / Ridge', tone: 'text-emerald-700', bg: 'bg-emerald-50' }
    : { bn: 'মাঝারি উঁচু জমি (Medium Highland)', en: 'Medium Highland', tone: 'text-teal-700', bg: 'bg-teal-50' };

  // Determine crop impact based on simulated water depth
  const floodAdvisory = useMemo(() => {
    if (waterLevelM <= 0.15) {
      return {
        status: 'safe',
        title: { bn: 'নিরাপদ নিষ্কাশিত অবস্থা (স্বাভাবিক)', en: 'Free-Drained / Safe' },
        desc: {
          bn: 'রবি ডাল, তেলবীজ (সরিষা), গম ও ভুট্টার জন্য আদর্শ। শিকড়ে পর্যাপ্ত বাতাস পৌঁছায় এবং জলাবদ্ধতার ঝুঁকি নেই।',
          en: 'Optimal for Rabi pulses, oilseeds (mustard), wheat, and maize. Adequate root aeration with zero waterlogging risk.',
        },
        badge: 'ok',
      };
    } else if (waterLevelM <= 0.6) {
      return {
        status: 'moderate',
        title: { bn: 'অগভীর পানি (আমন ধানের উপযোগী)', en: 'Shallow Standing Water (Optimal Aman)' },
        desc: {
          bn: 'রোপা আমন ধানের স্বাভাবিক বৃদ্ধির জন্য চমৎকার। তবে সরিষা, আলু বা ডাল ফসলে এই পানি জমলে শিকড় পচে নষ্ট হবে।',
          en: 'Excellent for transplanted Aman rice. However, mustard, potato, or pulse crops will suffer severe root rot.',
        },
        badge: 'gold',
      };
    } else if (waterLevelM <= 1.3) {
      return {
        status: 'warning',
        title: { bn: 'মাঝারি আকস্মিক বন্যা (সাবমার্জেন্স ঝুঁকি)', en: 'Moderate Flash Flood (Submergence Risk)' },
        desc: {
          bn: 'সাধারণ আমন ধান তলিয়ে মারা যেতে পারে। ব্রি ধান৫১ বা ব্রি ধান৫২ (Sub1 জিনযুক্ত) প্রয়োজন যা ১৪ দিন পানির নিচে বাঁচে।',
          en: 'Standard Aman will drown. Requires flash-flood tolerant varieties like BRRI dhan51/52 (Sub1 gene, survives 14 days submerged).',
        },
        badge: 'warn',
      };
    } else {
      return {
        status: 'danger',
        title: { bn: 'গভীর প্লাবন / জলমগ্নতা (জলাভূমি দশা)', en: 'Deep Inundation (Haor/Marsh Condition)' },
        desc: {
          bn: 'বোনা আমন বা গভীর পানির ধান (জল-আমন) ছাড়া বর্ষায় কোনো ফসল সম্ভব নয়। জমিতে রবি মৌসুমে বোরো বা মাছ চাষের ফসলচক্র মানানসই।',
          en: 'Only deepwater floating Aman or fish-rice rotation is viable during monsoon. Land is best optimized for winter Boro.',
        },
        badge: 'bad',
      };
    }
  }, [waterLevelM]);

  // Cross section SVG calculations
  // Base SVG viewBox: 0 0 500 200
  // Ground surface: y = 140
  // Water surface: y = 140 - (waterLevelM * 40)
  const groundY = 140;
  const waterH = Math.min(100, Math.max(0, waterLevelM * 40));
  const waterY = groundY - waterH;

  return (
    <Card id="ff-topo" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-800">
              <Mountain size={18} />
            </span>
            <h2 className="text-[20px] font-bold text-ink">
              {T('জমির ভূ-প্রকৃতি ও বর্ষার প্লাবনঝুঁকি সিমুলেটর', 'Micro-Topography & Flood Inundation Simulator')}
            </h2>
          </div>
          <p className="mt-1 text-[13.5px] leading-6 text-muted">
            {T(
              'নাসার SRTM এবং জাপানের ASTER GDEM উপগ্রহের ৩০ মিটার যৌথ ডিজিটাল এলিভেশন মডেল (DEM): চারপাশের ৫০০ মিটারের তুলনায় আপনার জমির সঠিক ঢাল, রিলেফ ও বর্ষায় প্লাবনের গভীরতা অনুকরণ করে ফসল নির্বাচন যাচাই করুন।',
              'Consensus of NASA SRTM and METI ASTER GDEM 30m elevation models: simulates parcel relief, micro-slope, and simulated monsoon inundation depth to validate crop submergence resilience.'
            )}
          </p>
        </div>
        <Tags list={['SAT', 'MODEL']} />
      </div>

      {/* Topographic Metrics Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-3">
          <div className="text-[12px] font-medium text-muted">{T('সমুদ্রপৃষ্ঠ থেকে উচ্চতা', 'Elevation ASL')}</div>
          <div className="mt-1 font-display text-[20px] font-bold text-ink">
            {num(elev, lang, { dp: 1 })} <span className="text-[12px] font-normal text-muted">{T('মিটার', 'm')}</span>
          </div>
          <div className="text-[11px] text-muted">
            {T(`মডেল ফারাক: ±${num(spread, lang, { dp: 1 })} মি`, `Model spread: ±${spread}m`)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-3">
          <div className="text-[12px] font-medium text-muted">{T('আপেক্ষিক রিলেফ (৫০০ মি)', 'Relative Relief (500m)')}</div>
          <div className={`mt-1 font-display text-[20px] font-bold ${relief < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {relief > 0 ? '+' : ''}{num(relief, lang, { dp: 1 })} <span className="text-[12px] font-normal text-muted">{T('মিটার', 'm')}</span>
          </div>
          <div className="text-[11px] text-muted">
            {relief < -1 ? T('চারপাশ থেকে নিচু', 'Lower than surroundings') : T('উঁচু বা সমতল', 'Ridge or plateau')}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-3">
          <div className="text-[12px] font-medium text-muted">{T('জমির ঢাল (Slope)', 'Surface Slope')}</div>
          <div className="mt-1 font-display text-[20px] font-bold text-ink">
            {num(slope, lang, { dp: 2 })}%
          </div>
          <div className="text-[11px] text-muted">
            {slope < 1 ? T('সমান জমি (নিষ্কাশন ধীর)', 'Flat plain (slow runoff)') : T('ঢালু জমি (পানি নামে)', 'Sloped (quick drainage)')}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-3">
          <div className="text-[12px] font-medium text-muted">{T('মাটির হাইড্রোলজিক্যাল স্তর', 'Hydrological Class')}</div>
          <div className={`mt-1 text-[13.5px] font-bold ${landClass.tone}`}>
            {L(landClass)}
          </div>
          <div className="text-[11px] text-muted">
            {L(upazila.name)} · {T('পার্সেল', 'Parcel')} {currentParcelId}
          </div>
        </div>
      </div>

      {/* Interactive Water Surge / Inundation Depth Slider */}
      <div className="mt-5 rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Waves size={18} className="text-teal-700" />
            <span className="font-bold text-[14.5px] text-teal-950">
              {T('বর্ষার পানি বৃদ্ধির মাত্রা সিমুলেশন:', 'Simulate Monsoon Water Table Rise:')}
            </span>
          </div>
          <div className="font-display text-[17px] font-bold text-teal-800">
            {num(waterLevelM, lang, { dp: 2 })} {T('মিটার প্লাবন', 'm depth')} ({num(Math.round(waterLevelM * 3.28084 * 10) / 10, lang)} {T('ফুট', 'ft')})
          </div>
        </div>

        <input
          type="range"
          min="0.0"
          max="2.5"
          step="0.05"
          value={waterLevelM}
          onChange={(e) => setWaterLevelM(parseFloat(e.target.value))}
          className="mt-3 h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-teal-200 accent-teal-700"
        />

        <div className="mt-2 flex justify-between text-[11px] text-teal-800/80">
          <span>{T('০.০ মি (শুকনো/নিষ্কাশিত)', '0.0m (Dry/Drained)')}</span>
          <span>{T('০.৫ মি (আমন ধানের পানি)', '0.5m (Standard Aman)')}</span>
          <span>{T('১.২ মি (আকস্মিক বন্যা - Sub1)', '1.2m (Flash Flood - Sub1)')}</span>
          <span>{T('২.৫ মি (গভীর প্লাবন)', '2.5m (Deep Flood)')}</span>
        </div>
      </div>

      {/* Dynamic 2D Parcel Cross-Section Graphic */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-sky-50 to-amber-50/30 p-2">
        <svg viewBox="0 0 500 180" className="w-full" role="img" aria-label="Parcel Topographic Inundation Cross Section">
          <defs>
            <linearGradient id="soilGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8d6e4f" />
              <stop offset="30%" stopColor="#6e5033" />
              <stop offset="100%" stopColor="#4a3520" />
            </linearGradient>
            <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
            </linearGradient>
            <pattern id="soilTexture" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1" fill="#422e1b" opacity="0.4" />
              <circle cx="15" cy="12" r="1.5" fill="#382614" opacity="0.3" />
            </pattern>
          </defs>

          {/* Sky background */}
          <rect x="0" y="0" width="500" height={groundY} fill="none" />

          {/* Surrounding terrain dip profile showing relative relief */}
          <path
            d={`M 0,${groundY - relief * 4} Q 150,${groundY - relief * 3} 250,${groundY} T 500,${groundY + relief * 2}`}
            fill="none"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />

          {/* Soil Layer (Ground) */}
          <rect x="0" y={groundY} width="500" height="40" fill="url(#soilGradient)" />
          <rect x="0" y={groundY} width="500" height="40" fill="url(#soilTexture)" />

          {/* Plough Pan Layer (কাদার স্তর) */}
          <line x1="0" y1={groundY + 12} x2="500" y2={groundY + 12} stroke="#382614" strokeWidth="2.5" strokeDasharray="6 3" />
          <text x="490" y={groundY + 24} textAnchor="end" fontSize="8.5" fill="#ffffff" opacity="0.8">
            {T('প্লাও প্যান (১৫–২০ সেমি কাদার শক্ত স্তর)', 'Plough pan (15–20cm hard layer)')}
          </text>

          {/* Field Bunds (আইল) */}
          <path d="M 40,140 L 50,132 L 60,140 Z" fill="#785536" />
          <path d="M 440,140 L 450,132 L 460,140 Z" fill="#785536" />
          <text x="50" y="128" textAnchor="middle" fontSize="8" fill="#5c4028">{T('আইল', 'Bund')}</text>
          <text x="450" y="128" textAnchor="middle" fontSize="8" fill="#5c4028">{T('আইল', 'Bund')}</text>

          {/* Plant Stems (Rice hills across the parcel) */}
          {[100, 150, 200, 250, 300, 350, 400].map((x) => (
            <g key={x}>
              {/* Roots into topsoil */}
              <line x1={x} y1="140" x2={x - 4} y2="148" stroke="#fef08a" strokeWidth="1" />
              <line x1={x} y1="140" x2={x + 4} y2="149" stroke="#fef08a" strokeWidth="1" />
              <line x1={x} y1="140" x2={x} y2="151" stroke="#fef08a" strokeWidth="1.2" />

              {/* Plant canopy */}
              <line x1={x} y1="140" x2={x} y2="105" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
              <line x1={x} y1="125" x2={x - 12} y2="108" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
              <line x1={x} y1="120" x2={x + 12} y2="104" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
              {/* Rice panicle head */}
              <circle cx={x + 2} cy="103" r="2.5" fill="#ca8a04" />
            </g>
          ))}

          {/* Dynamic Water Layer */}
          {waterH > 0 && (
            <g>
              <rect x="0" y={waterY} width="500" height={waterH} fill="url(#waterGradient)" />
              {/* Animated wave surface line */}
              <path
                d={`M 0,${waterY} Q 30,${waterY - 2} 60,${waterY} T 120,${waterY} T 180,${waterY} T 240,${waterY} T 300,${waterY} T 360,${waterY} T 420,${waterY} T 500,${waterY}`}
                fill="none"
                stroke="#e0f2fe"
                strokeWidth="1.5"
              />
              <text x="15" y={waterY + 14} fontSize="9.5" fontWeight="bold" fill="#0369a1">
                {T(`প্লাবন গভীরতা: ${num(waterLevelM, lang, { dp: 2 })} মি`, `Inundation depth: ${waterLevelM.toFixed(2)}m`)}
              </text>
            </g>
          )}

          {/* Elevation Datum Marker */}
          <line x1="20" y1="20" x2="20" y2="140" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
          <text x="25" y="30" fontSize="9" fill="#475569" fontWeight="bold">
            SRTM {num(elev, lang, { dp: 1 })}m ASL
          </text>
        </svg>
      </div>

      {/* Flood Impact & Agronomic Recommendation Note */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {floodAdvisory.status === 'safe' && <CheckCircle2 size={18} className="text-emerald-600" />}
            {floodAdvisory.status === 'moderate' && <Info size={18} className="text-teal-600" />}
            {floodAdvisory.status === 'warning' && <AlertTriangle size={18} className="text-amber-600" />}
            {floodAdvisory.status === 'danger' && <AlertTriangle size={18} className="text-red-600" />}
            <span className="font-bold text-[14px] text-ink">{L(floodAdvisory.title)}</span>
          </div>
          <Badge tone={floodAdvisory.badge}>{L(floodAdvisory.title)}</Badge>
        </div>
        <p className="mt-1.5 text-[13px] leading-5 text-ink/80">
          {L(floodAdvisory.desc)}
        </p>
      </div>
    </Card>
  );
}
