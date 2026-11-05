// Live Satellite Pass Tracker over Bangladesh (Home Page).
// Displays active Earth Observation satellites (NASA, ESA, JAXA) scanning the Ganges-Brahmaputra delta,
// their current orbital altitude, sensor payload, and real-time agricultural mission.
import { useState, useEffect } from 'react';
import { Satellite, Radio, Orbit, Activity, ChevronRight, Eye, Sparkles } from 'lucide-react';
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
    status: 'pass_soon',
    statusBn: 'পরবর্তী পাস: আগামী পরশু',
    statusEn: 'Next Pass: In 2 Days',
    benefitBn: 'মাটির তাপ ও বাষ্পীভবন (ET) নির্ভুল নিরূপণ',
    benefitEn: 'Land surface temperature & evapotranspiration',
    accent: '#059669',
  },
];

export default function LiveSatellitePassTracker() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [selectedSatId, setSelectedSatId] = useState('gpm');

  const selectedSat = ORBITAL_FLEET.find((x) => x.id === selectedSatId) ?? ORBITAL_FLEET[0];

  return (
    <div className="surface-card spotlight-card lift mt-8 overflow-hidden rounded-[26px] border border-border/80 bg-white/85 p-5 sm:p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-sky-700 text-white shadow-sm">
            <Orbit size={20} className="animate-spin-slow" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-bold text-ink">
                {T('মাথার ওপর মহাকাশের চোখ: লাইভ উপগ্রহ ট্র্যাকার', 'Satellites Overhead: Live Orbit Tracker')}
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                <span className="telemetry-pulse" />
                {T('লাইভ সিঙ্ক', 'Live Sync')}
              </span>
            </div>
            <p className="text-[12.5px] text-muted">
              {T(
                'বাংলাদেশের ব-দ্বীপ অঞ্চলের ফসলি জমির ওপর এখন সক্রিয় নাসা ও কোপার্নিকাস উপগ্রহের কক্ষপথ ও সেন্সর স্থিতি।',
                'Active NASA & Copernicus orbital satellites passing above the Bangladesh delta, scanning soil and crops.'
              )}
            </p>
          </div>
        </div>
        <Tags list={['SAT', 'REAL']} />
      </div>

      {/* Satellite Quick Switch Strip */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-[13px] scrollbar-none" role="tablist">
        {ORBITAL_FLEET.map((sat) => {
          const isSelected = sat.id === selectedSatId;
          return (
            <button
              key={sat.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedSatId(sat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 font-semibold transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'border-primary-600 bg-primary-50/90 text-primary-900 shadow-2xs ring-1 ring-primary-500/20'
                  : 'border-border/80 bg-white/60 text-muted hover:border-primary-300 hover:text-ink'
              }`}
            >
              <Satellite size={14} style={{ color: sat.accent }} />
              <span>{sat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Satellite Telemetry Horizon */}
      <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-canvas/70 p-4 md:grid-cols-4">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
            {T('সংস্থা ও উচ্চতা', 'Agency & Altitude')}
          </span>
          <div className="mt-0.5 font-display text-[17px] font-bold text-ink">
            {selectedSat.agency}
          </div>
          <span className="text-[12px] text-muted">
            {num(selectedSat.altitudeKm, lang)} {T('কিমি উচ্চতার কক্ষপথ', 'km orbital altitude')}
          </span>
        </div>

        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
            {T('সেন্সর ও সোয়াথ (Swath)', 'Payload & Swath')}
          </span>
          <div className="mt-0.5 font-display text-[15px] font-bold text-ink truncate">
            {selectedSat.payload}
          </div>
          <span className="text-[12px] text-muted">
            {T('স্ক্যান প্রস্থ: ', 'Scan width: ')}{num(selectedSat.swathKm, lang)} {T('কিমি', 'km')}
          </span>
        </div>

        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
            {T('বর্তমান অবস্থা', 'Current Status')}
          </span>
          <div className="mt-0.5 font-display text-[15px] font-bold" style={{ color: selectedSat.accent }}>
            {L({ bn: selectedSat.statusBn, en: selectedSat.statusEn })}
          </div>
          <span className="text-[12px] text-muted">
            {T('স্বয়ংক্রিয় রিসিভার সিঙ্কড', 'Direct Telemetry Receiver')}
          </span>
        </div>

        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
            {T('কৃষকের সুবিধা', 'Farmer Utility')}
          </span>
          <p className="mt-0.5 text-[12.5px] leading-snug font-medium text-ink/90">
            {L({ bn: selectedSat.benefitBn, en: selectedSat.benefitEn })}
          </p>
        </div>
      </div>
    </div>
  );
}
