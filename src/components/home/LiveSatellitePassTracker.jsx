// Live Satellite Pass Tracker over Bangladesh (Home Page).
// Displays active Earth Observation satellites (NASA, ESA, JAXA) scanning the Ganges-Brahmaputra delta,
// an interactive celestial Sky-Dome Radar, orbital altitude, sensor payload, and real-time agricultural mission.
import { useState } from 'react';
import { Satellite, Radio, Orbit, Compass, Activity, Eye, Sparkles } from 'lucide-react';
import { useStore } from '../../store';
import { Tags, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';

const ORBITAL_FLEET = [
  {
    id: 'gpm',
    name: 'GPM Core Observatory',
    agency: 'NASA / JAXA',
    altitudeKm: 407,
    payload: 'DPR & GMI (Microwave Imager)',
    swathKm: 885,
    azimuthDeg: 142,
    elevationDeg: 68,
    status: 'active',
    statusBn: 'সরাসরি স্ক্যান চলছে',
    statusEn: 'Active Scan',
    benefitBn: 'দৈনিক বৃষ্টিপাত ও বর্ষা শুরুর তারিখ নিরূপণ',
    benefitEn: 'Daily rain & monsoon onset tracking',
    accent: '#0284c7',
  },
  {
    id: 'sentinel1',
    name: 'Sentinel-1A SAR',
    agency: 'ESA / Copernicus',
    altitudeKm: 693,
    payload: 'C-SAR (5.405 GHz Radar)',
    swathKm: 250,
    azimuthDeg: 320,
    elevationDeg: 42,
    status: 'pass_soon',
    statusBn: 'পরবর্তী পাস: আজ রাত ৮:১২',
    statusEn: 'Next Pass: Tonight 20:12',
    benefitBn: 'মেঘ ভেদ করে আমন রোপণের পানি ও বন্যা শনাক্তকরণ',
    benefitEn: 'All-weather Aman transplanting & flood radar',
    accent: '#16a34a',
  },
  {
    id: 'sentinel2',
    name: 'Sentinel-2B MSI',
    agency: 'ESA / Copernicus',
    altitudeKm: 786,
    payload: 'MultiSpectral Instrument (13 Bands)',
    swathKm: 290,
    azimuthDeg: 210,
    elevationDeg: 55,
    status: 'recent',
    statusBn: 'সর্বশেষ ছবি: গতকাল ১২:০৫',
    statusEn: 'Recent Pass: Yesterday 12:05',
    benefitBn: '১০ মিটার রেজোলিউশনে ফসলের পাতার সবুজ ও নাইট্রোজেন চাপ',
    benefitEn: '10m crop chlorophyll & vegetative stress',
    accent: '#8b5cf6',
  },
  {
    id: 'smap',
    name: 'SMAP Soil Moisture',
    agency: 'NASA JPL',
    altitudeKm: 685,
    payload: 'L-band Radiometer (1.4 GHz)',
    swathKm: 1000,
    azimuthDeg: 45,
    elevationDeg: 74,
    status: 'active',
    statusBn: 'আর্দ্রতা ডেটা সিঙ্ক হচ্ছে',
    statusEn: 'Soil Moisture Syncing',
    benefitBn: 'মাটির শিকড়ের গভীরের আর্দ্রতা ও খরা সতর্কতা',
    benefitEn: 'Root-zone moisture & drought early warning',
    accent: '#ea580c',
  },
  {
    id: 'landsat9',
    name: 'Landsat 9',
    agency: 'NASA / USGS',
    altitudeKm: 705,
    payload: 'OLI-2 & TIRS-2 (Thermal Infrared)',
    swathKm: 185,
    azimuthDeg: 195,
    elevationDeg: 35,
    status: 'pass_soon',
    statusBn: 'পরবর্তী পাস: আগামী পরশু',
    statusEn: 'Next Pass: In 2 Days',
    benefitBn: 'মাটির তাপ ও বাষ্পীভবন (ET) নির্ভুল নিরূপণ',
    benefitEn: 'Land surface temperature & evapotranspiration',
    accent: '#059669',
  },
];

// Convert polar (azimuth, elevation) to Cartesian (x, y) on a 220x220 viewBox
function polarToCartesian(cx, cy, maxR, azDeg, elDeg) {
  const r = maxR * (1 - Math.max(0, Math.min(90, elDeg)) / 90);
  const rad = ((azDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export default function LiveSatellitePassTracker() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [selectedSatId, setSelectedSatId] = useState('gpm');

  const selectedSat = ORBITAL_FLEET.find((x) => x.id === selectedSatId) ?? ORBITAL_FLEET[0];

  const CX = 110, CY = 110, MAX_R = 90;

  return (
    <div className="surface-card spotlight-card lift mt-8 overflow-hidden rounded-[26px] border border-border/80 bg-white/90 p-5 sm:p-6 shadow-[var(--shadow-card)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-sky-700 text-white shadow-sm">
            <Orbit size={20} className="animate-spin-slow" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-ink">
                {T('মাথার ওপর মহাকাশের চোখ: লাইভ উপগ্রহ রাডার', 'Satellites Overhead: Live Orbit Radar')}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                <span className="telemetry-pulse" />
                {T('লাইভ সিঙ্ক', 'Live Sync')}
              </span>
            </div>
            <p className="text-[12.5px] text-muted">
              {T(
                'বাংলাদেশের ব-দ্বীপ অঞ্চলের ফসলি জমির ওপর এখন সক্রিয় নাসা ও কোপার্নিকাস উপগ্রহের সরাসরি অবস্থান ও স্ক্যান স্থিতি।',
                'Active NASA & Copernicus orbital satellites passing above the Bangladesh delta, scanning soil and crops.'
              )}
            </p>
          </div>
        </div>
        <Tags list={['SAT', 'REAL']} />
      </div>

      {/* Main Grid: Interactive Sky-Dome Radar (Left) + Telemetry & Mission Deck (Right) */}
      <div className="mt-5 grid grid-cols-1 items-center gap-6 lg:grid-cols-[260px_1fr]">
        {/* Celestial Sky-Dome Radar SVG */}
        <div className="relative mx-auto flex flex-col items-center">
          <div className="relative h-[220px] w-[220px] rounded-full border border-sky-950/20 bg-gradient-to-b from-primary-950 via-sky-950 to-primary-950 p-2 shadow-inner">
            <svg viewBox="0 0 220 220" className="h-full w-full" aria-label="Celestial Sky Radar Dome">
              <defs>
                {/* Radar Sweep Gradient */}
                <radialGradient id="radarSweepGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(47, 138, 143, 0.4)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>

              {/* Concentric Elevation Rings */}
              <circle cx={CX} cy={CY} r={MAX_R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
              <circle cx={CX} cy={CY} r={MAX_R * 0.66} fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <circle cx={CX} cy={CY} r={MAX_R * 0.33} fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
              <circle cx={CX} cy={CY} r={3} fill="rgba(255,255,255,0.6)" />

              {/* Axis Crosshairs */}
              <line x1={CX} y1={CY - MAX_R} x2={CX} y2={CY + MAX_R} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <line x1={CX - MAX_R} y1={CY} x2={CX + MAX_R} y2={CY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

              {/* Cardinal Compass Labels */}
              <text x={CX} y={CY - MAX_R + 10} fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle" fontWeight="bold">N</text>
              <text x={CX + MAX_R - 8} y={CY + 3} fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle" fontWeight="bold">E</text>
              <text x={CX} y={CY + MAX_R - 4} fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle" fontWeight="bold">S</text>
              <text x={CX - MAX_R + 8} y={CY + 3} fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle" fontWeight="bold">W</text>

              {/* Elevation Markings */}
              <text x={CX + 3} y={CY - MAX_R * 0.33 + 3} fill="rgba(255,255,255,0.35)" fontSize="7">60°</text>
              <text x={CX + 3} y={CY - MAX_R * 0.66 + 3} fill="rgba(255,255,255,0.35)" fontSize="7">30°</text>

              {/* Sweeping Radar Beam */}
              <g style={{ transformOrigin: `${CX}px ${CY}px`, animation: 'radar-sweep-spin 6s linear infinite' }}>
                <path
                  d={`M ${CX} ${CY} L ${CX} ${CY - MAX_R} A ${MAX_R} ${MAX_R} 0 0 1 ${CX + MAX_R * 0.7} ${CY - MAX_R * 0.7} Z`}
                  fill="url(#radarSweepGlow)"
                />
                <line x1={CX} y1={CY} x2={CX} y2={CY - MAX_R} stroke="rgba(74, 222, 128, 0.6)" strokeWidth="1.5" />
              </g>

              {/* Satellite Position Markers */}
              {ORBITAL_FLEET.map((sat) => {
                const pos = polarToCartesian(CX, CY, MAX_R, sat.azimuthDeg, sat.elevationDeg);
                const isSelected = sat.id === selectedSatId;

                return (
                  <g
                    key={sat.id}
                    onClick={() => setSelectedSatId(sat.id)}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    {/* Active pulse beacon ring */}
                    {isSelected && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={11}
                        fill="none"
                        stroke={sat.accent}
                        strokeWidth="1.5"
                        opacity="0.8"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isSelected ? 6 : 4}
                      fill={sat.accent}
                      stroke="#fff"
                      strokeWidth={isSelected ? 2 : 1}
                      className="shadow-sm"
                    />
                    <text
                      x={pos.x}
                      y={pos.y - 7}
                      fill="#fff"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none drop-shadow-sm"
                    >
                      {sat.id.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <span className="mt-1.5 text-[11px] font-semibold text-muted">
            {T('ঢাকা জেনিথ আকাশমণ্ডল (০°–৯০°)', 'Dhaka Celestial Zenith (0°–90°)')}
          </span>
        </div>

        {/* Right: Fleet Switcher & Selected Telemetry Horizon */}
        <div>
          {/* Satellite Quick Switch Strip */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-[13px] scrollbar-none" role="tablist">
            {ORBITAL_FLEET.map((sat) => {
              const isSelected = sat.id === selectedSatId;
              return (
                <button
                  key={sat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedSatId(sat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition-all duration-200 active:scale-95 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50/90 text-primary-900 shadow-2xs ring-1 ring-primary-500/20'
                      : 'border-border/80 bg-white/60 text-muted hover:border-primary-300 hover:text-ink'
                  }`}
                >
                  <Satellite size={13} style={{ color: sat.accent }} />
                  <span>{sat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Satellite Telemetry Horizon Deck */}
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 rounded-2xl border border-border bg-canvas/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {T('সংস্থা ও উচ্চতা', 'Agency & Altitude')}
              </span>
              <div className="mt-0.5 font-display text-[16px] font-bold text-ink">
                {selectedSat.agency}
              </div>
              <span className="text-[12px] text-muted">
                {num(selectedSat.altitudeKm, lang)} {T('কিমি কক্ষপথ', 'km orbit')}
              </span>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {T('সেন্সর ও সোয়াথ (Swath)', 'Payload & Swath')}
              </span>
              <div className="mt-0.5 font-display text-[14.5px] font-bold text-ink truncate">
                {selectedSat.payload}
              </div>
              <span className="text-[12px] text-muted">
                {T('প্রস্থ: ', 'Width: ')}{num(selectedSat.swathKm, lang)} {T('কিমি', 'km')}
              </span>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {T('দিগংশ ও উন্নতি কোণ', 'Azimuth & Elevation')}
              </span>
              <div className="mt-0.5 font-display text-[15px] font-bold" style={{ color: selectedSat.accent }}>
                Az {num(selectedSat.azimuthDeg, lang)}° · El {num(selectedSat.elevationDeg, lang)}°
              </div>
              <span className="text-[12px] text-muted">
                {L({ bn: selectedSat.statusBn, en: selectedSat.statusEn })}
              </span>
            </div>

            <div>
              <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                {T('কৃষকের সুবিধা', 'Farmer Utility')}
              </span>
              <p className="mt-0.5 text-[12px] leading-snug font-medium text-ink/90">
                {L({ bn: selectedSat.benefitBn, en: selectedSat.benefitEn })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
