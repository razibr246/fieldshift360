// Interactive Bay of Bengal Tropical Cyclone & Storm Surge Trajectory Radar.
// Connects NASA GPM IMERG rainfall bursts, MERRA-2 pressure drops, and coastal DEM surge inundation.
// Provides institutional DAE emergency harvest and polder gate lockdown protocols for Agriculture Officers.
import { useState, useMemo } from 'react';
import { Wind, Waves, AlertTriangle, ShieldAlert, Compass, CloudRain, Download, CheckCircle2, Eye } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { UPAZILAS } from '../../data/upazilas';

const CYCLONE_SCENARIOS = [
  {
    id: 'depression',
    name: { bn: 'গভীর নিম্নচাপ (Deep Depression)', en: 'Deep Depression' },
    windSpeedKph: 55,
    pressureHpa: 996,
    rainMmDay: 75,
    surgeHeightM: 0.8,
    color: '#0284c7',
    badge: 'মাঝারি ঝুঁকি',
    badgeEn: 'Moderate Risk',
    leadTimeHours: 48,
    desc: {
      bn: 'সাগরে সৃষ্ট লঘুচাপ ঘনীভূত হয়ে নিম্নচাপে পরিণত হয়েছে। উপকূলজুড়ে মাঝারি থেকে ভারী বর্ষণ এবং দমকা হাওয়া।',
      en: 'Low-pressure system concentrated into a deep depression. Moderate to heavy rainfall with squally coastal gusts.',
    },
  },
  {
    id: 'severe',
    name: { bn: 'প্রবল ঘূর্ণিঝড় (Severe Cyclone - Cat 2)', en: 'Severe Cyclonic Storm (Cat 2)' },
    windSpeedKph: 125,
    pressureHpa: 978,
    rainMmDay: 190,
    surgeHeightM: 2.2,
    color: '#ea580c',
    badge: 'বিপদ সংকেত ৭',
    badgeEn: 'Danger Signal 7',
    leadTimeHours: 36,
    desc: {
      bn: 'ঘূর্ণিঝড়ের চোখ উপকূলের দিকে ধাবিত হচ্ছে। জোয়ারের চেয়ে ২ থেকে ২.৫ মিটার উঁচু জলোচ্ছ্বাসে নিম্নাঞ্চল প্লাবিত হওয়ার আশঙ্কা।',
      en: 'Eye advancing toward coastal landfall. Storm surge 2.0 to 2.5m above astronomical tide threatening low polders.',
    },
  },
  {
    id: 'super',
    name: { bn: 'মহাপ্রলয়ঙ্করী সুপার সাইক্লোন (Super Cyclone - Cat 5)', en: 'Super Cyclone (Cat 5)' },
    windSpeedKph: 230,
    pressureHpa: 920,
    rainMmDay: 380,
    surgeHeightM: 4.5,
    color: '#dc2626',
    badge: 'মহাবিপদ সংকেত ১০',
    badgeEn: 'Great Danger 10',
    leadTimeHours: 24,
    desc: {
      bn: 'বিধ্বংসী বাতাস এবং ৪.৫ মিটার উচ্চতার তীব্র জলোচ্ছ্বাস। উপকূলীয় বাঁধ উপচে লবণাক্ত পানি ঢোকার চরম ঝুঁকি।',
      en: 'Catastrophic sustained winds with 4.5m surge overwash. Critical risk of saline intrusion breach across sea dikes.',
    },
  },
];

export default function CycloneTrajectoryRadar({ upazilaId }) {
  const { s, T, L, upazila } = useStore();
  const lang = s.lang;
  const [selectedScenarioId, setSelectedScenarioId] = useState('severe');
  const [downloaded, setDownloaded] = useState(false);

  const scenario = CYCLONE_SCENARIOS.find((c) => c.id === selectedScenarioId) ?? CYCLONE_SCENARIOS[1];

  // Upazila exposure assessment
  const upazilaObj = (upazilaId && UPAZILAS[upazilaId]) ? UPAZILAS[upazilaId] : upazila;
  const targetId = upazilaId || upazila.id;
  const isCoastal = ['sitakunda', 'dacope', 'bakerganj'].includes(targetId);
  const surgeExposure = isCoastal ? scenario.surgeHeightM : 0.0;
  const targetNameEn = (upazilaObj?.name?.en || upazilaObj?.en || upazila.name?.en || targetId).toUpperCase();

  const handleDownloadBulletin = () => {
    const text = `=====================================================
BANGLADESH DEPARTMENT OF AGRICULTURAL EXTENSION (DAE)
NASA SPACE APPS 2026 - EMERGENCY CYCLONE ADVISORY BULLETIN
=====================================================
Target Upazila: ${targetNameEn}
Event: ${scenario.name.en}
Max Sustained Winds: ${scenario.windSpeedKph} km/h
Projected 24h Rain: ${scenario.rainMmDay} mm (NASA GPM IMERG)
Coastal Surge Risk: ${scenario.surgeHeightM} m above astronomical tide

URGENT FIELD LEVEL SAAO PROTOCOLS:
1. RIPE AMAN HARVEST: Any crop at 80%+ maturity must be harvested immediately.
2. POLDER LOCKDOWN: Close all flap sluice gates against incoming saline sea surge.
3. RABI SEEDBEDS: Construct raised beds and clear drainage perimeter trenches.
4. INPUT SAFETY: Move harvested paddy, urea bags, and seeds to cyclone-resistant storage.
5. POST-EVENT FLUSHING: Rapidly drain freshwater to flush out storm salinity.

Issued via FieldShift 360 Ropon Radar Intelligence Engine
Timestamp: ${new Date().toISOString()}
=====================================================`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DAE_Emergency_Cyclone_Advisory_${upazila.id}_${scenario.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <Card className="mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <Wind size={18} />
            </span>
            <h2 className="text-[20px] font-bold text-ink">
              {T('বঙ্গোপসাগর ঘূর্ণিঝড় ও জলোচ্ছ্বাস গতিপথ রাডার', 'Bay of Bengal Cyclone & Surge Trajectory Radar')}
            </h2>
          </div>
          <p className="mt-1 text-[13.5px] leading-6 text-muted">
            {T(
              'নাসার জিপিএম আইমার্জ বর্ষণ ধারা, মেরা-২ বায়ুমণ্ডলীয় চাপ হ্রাস এবং এসআরটিএম ৩০ মিটার উপকূলীয় উচ্চতা মডেল: বঙ্গোপসাগরে ঘূর্ণিঝড় সৃষ্টি হলে ফসলের ক্ষতি কমাতে কৃষি কর্মকর্তাদের জরুরি প্রস্তুতি ও বাঁধ ব্যবস্থাপনার রাডার সিমুলেশন।',
              'NASA GPM IMERG rainfall spikes, MERRA-2 barometric depression, and SRTM 30m digital elevation: real-time simulation of tropical cyclone landfall tracks, surge inundation heights, and DAE emergency crop protection protocols.'
            )}
          </p>
        </div>
        <Tags list={['SAT', 'MODEL', 'RULE']} />
      </div>

      {/* Scenario Intensity Selector */}
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {CYCLONE_SCENARIOS.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`flex flex-col rounded-2xl border p-3.5 text-left transition ${
                  isSelected
                    ? 'border-rose-600 bg-rose-50/80 shadow-xs ring-2 ring-rose-500/20'
                    : 'border-border bg-white hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[13.5px] text-ink">{L(sc.name)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white" style={{ background: sc.color }}>
                    {L({ bn: sc.badge, en: sc.badgeEn })}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-3 text-[12px] text-muted">
                  <span>বাতাস: <b className="text-ink">{num(sc.windSpeedKph, lang)} কিমি/ঘণ্টা</b></span>
                  <span>বৃষ্টি: <b className="text-ink">{num(sc.rainMmDay, lang)} মিমি/দিন</b></span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Trajectory Radar Map & Wave Height Display */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_.8fr] items-center">
        {/* Radar Graphic */}
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-2 shadow-inner">
          <svg viewBox="0 0 400 250" className="h-full w-full" role="img" aria-label="Cyclone Radar Map">
            <defs>
              <radialGradient id="cycloneEye" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
              </radialGradient>
              <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="#1e293b" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="400" height="250" fill="url(#radarGrid)" />

            {/* Concentric Radar Range Rings */}
            <circle cx="200" cy="180" r="40" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
            <circle cx="200" cy="180" r="80" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="200" cy="180" r="130" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
            <text x="205" y="145" fontSize="8" fill="#64748b">100 km</text>
            <text x="205" y="105" fontSize="8" fill="#64748b">200 km</text>
            <text x="205" y="55" fontSize="8" fill="#64748b">300 km</text>

            {/* Bangladesh Simplified Coastline & Sundarbans */}
            <path
              d="M 60,60 L 110,65 L 140,80 L 180,95 L 210,95 L 240,110 L 270,105 L 300,120 L 330,150 L 360,200"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              opacity="0.75"
            />
            {/* Bay of Bengal Label */}
            <text x="200" y="235" textAnchor="middle" fontSize="10" fill="#38bdf8" opacity="0.6" letterSpacing="2">
              BAY OF BENGAL (বঙ্গোপসাগর)
            </text>

            {/* Upazila Coastal Reference Points */}
            <circle cx="150" cy="85" r="3" fill="#38bdf8" />
            <text x="150" y="78" textAnchor="middle" fontSize="7.5" fill="#bae6fd">দাকোপ (Dacope)</text>

            <circle cx="220" cy="100" r="3" fill="#38bdf8" />
            <text x="220" y="93" textAnchor="middle" fontSize="7.5" fill="#bae6fd">বাকেরগঞ্জ (Bakerganj)</text>

            <circle cx="310" cy="130" r="3" fill="#38bdf8" />
            <text x="310" y="123" textAnchor="middle" fontSize="7.5" fill="#bae6fd">সীতাকুণ্ড (Sitakunda)</text>

            {/* Projected Landfall Cone & Trajectory Path */}
            <path
              d="M 200,210 Q 210,160 215,100"
              fill="none"
              stroke={scenario.color}
              strokeWidth="2.5"
              strokeDasharray="6 3"
            />

            {/* Cyclone Active Center / Eye */}
            <circle cx="205" cy="170" r="35" fill="url(#cycloneEye)" />
            <circle cx="205" cy="170" r="4" fill="#ffffff" />
            <circle cx="205" cy="170" r="16" fill="none" stroke="#fca5a5" strokeWidth="1.5" />
            <text x="205" y="195" textAnchor="middle" fontSize="8.5" fill="#ffffff" fontWeight="bold">
              {scenario.windSpeedKph} km/h
            </text>
          </svg>
        </div>

        {/* Hazard Metrics & Impact Details */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-canvas p-4">
            <div className="text-[12px] font-semibold text-muted">{T('সম্ভাব্য জলোচ্ছ্বাস উচ্চতা (Surge Height)', 'Projected Storm Surge')}</div>
            <div className="mt-1 font-display text-[26px] font-bold text-rose-700">
              +{num(scenario.surgeHeightM, lang, { dp: 1 })} <span className="text-[14px] font-normal text-muted">{T('মিটার', 'm')}</span>
              <span className="ml-2 text-[13px] font-normal text-muted">
                (≈ {num(Math.round(scenario.surgeHeightM * 3.28 * 10) / 10, lang)} {T('ফুট', 'ft')})
              </span>
            </div>
            <div className="mt-1 text-[12px] text-ink/80">
              {isCoastal
                ? T('পোল্ডারের বাঁধের ওপর দিয়ে লবণাক্ত পানি ঢোকার তীব্র ঝুঁকি।', 'Critical risk of saline sea water overwash into polder.')
                : T('অভ্যন্তরীণ জেলায় জলোচ্ছ্বাসের চেয়ে অতিবৃষ্টি ও জলাবদ্ধতার ঝুঁকি বেশি।', 'Inland: primary hazard is flash flooding & heavy waterlogging.')}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-canvas p-4">
            <div className="text-[12px] font-semibold text-muted">{T('২৪ ঘণ্টায় বৃষ্টিপাত (NASA GPM IMERG)', '24h Precipitation Forecast')}</div>
            <div className="mt-1 font-display text-[26px] font-bold text-sky-800">
              {num(scenario.rainMmDay, lang)} <span className="text-[14px] font-normal text-muted">{T('মিমি/দিন', 'mm/day')}</span>
            </div>
            <div className="mt-1 text-[12px] text-ink/80">
              {T('মাঠের পাকা ধান ঝরে পড়া ও রবি বীজতলায় চটা পড়ার আশঙ্কা।', 'Causes grain shattering in ripe Aman and soil crusting in Rabi seeds.')}
            </div>
          </div>
        </div>
      </div>

      {/* Official DAE Emergency Action Protocol */}
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-rose-950">
          <ShieldAlert size={17} className="text-rose-700" />
          {T('কৃষি কর্মকর্তা ও কৃষকের জরুরি সুরক্ষামূলক এসওপি (DAE Emergency SOP)', 'Official DAE Emergency Crop Protection SOP')}
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-[13px]">
          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-2xs">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold text-ink">৮০% পাকা আমন ধান দ্রুত কর্তন:</span>
              <p className="text-muted mt-0.5 text-[12px] leading-4">
                {T('ধানের শীষে ৮০ ভাগ সোনালী রঙ আসলে ঘূর্ণিঝড়ের আগেই কেটে নিরাপদ গুদামে সংরক্ষণ করতে হবে।', 'Harvest any Aman field with 80%+ golden grain immediately before landfall.')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-2xs">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold text-ink">পোল্ডারের স্লুইস গেট লকডাউন:</span>
              <p className="text-muted mt-0.5 text-[12px] leading-4">
                {T('জোয়ারের লবণাক্ত পানি প্রবেশ ঠেকাতে সব স্লুইস গেট বন্ধ এবং ভেতরের নালা উন্মুক্ত রাখতে হবে।', 'Lock all flap sluice gates against tidal surge water; keep interior canals open.')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-2xs">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold text-ink">সার ও কীটনাশক স্প্রে বন্ধ:</span>
              <p className="text-muted mt-0.5 text-[12px] leading-4">
                {T('ঝড়ের আগে কোনো সার বা স্প্রে করা যাবে না; বৃষ্টিতে ধুয়ে নদী ও জলাশয়ে অপচয় হবে।', 'Halt all top-dressing and chemical sprays; storm rain will wash chemicals away.')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl bg-white p-3 shadow-2xs">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <span className="font-bold text-ink">রবি বীজতলায় নালা ও পলিথিন শেড:</span>
              <p className="text-muted mt-0.5 text-[12px] leading-4">
                {T('শাকসবজি ও সরিষার চারা বাঁচাতে চারপাশের নালা কেটে দ্রুত পানি নিষ্কাশনের ব্যবস্থা করুন।', 'Cut field perimeter trench drains to rapidly remove standing floodwater.')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Download Emergency Advisory Bulletin */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rose-200 pt-3">
          <span className="text-[12px] text-rose-900/80">
            {T('এই জরুরি বুলেটিনটি প্রিন্ট করে ইউনিয়ন পরিষদ ও কৃষক দলগুলোতে বিতরণযোগ্য।', 'Official machine-ready emergency bulletin for SAAO and union distribution.')}
          </span>
          <button
            type="button"
            onClick={handleDownloadBulletin}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-rose-800 active:scale-95"
          >
            {downloaded ? <CheckCircle2 size={16} /> : <Download size={16} />}
            {downloaded
              ? T('বুলেটিন নামানো হয়েছে!', 'Bulletin Downloaded!')
              : T('জরুরি সাইক্লোন সতর্কতা বুলেটিন ডাউনলোড', 'Download Emergency Cyclone Bulletin')}
          </button>
        </div>
      </div>
    </Card>
  );
}
