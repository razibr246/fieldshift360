// Interactive NASA Earth Observation Fleet & Orbital Constellation Explorer.
// Details orbital mechanics, payloads, swath widths, and exact biophysical applications of the 7 satellite systems.
import { useState } from 'react';
import { Satellite, Radio, Compass, Clock, Eye, Layers, CheckCircle2, ChevronRight, Activity, Globe } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num } from '../../engine/dates';

const MISSIONS = [
  {
    id: 'gpm',
    name: 'GPM Core Observatory',
    agency: 'NASA / JAXA',
    altitudeKm: 407,
    inclination: '65° Non-Sun-Synchronous',
    payload: 'DPR (Ku/Ka-band Radar) & GMI (13-Channel Radiometer)',
    swathKm: 245,
    revisit: '2–3 hours (constellation combined)',
    paramMeasured: 'বৃষ্টিপাত, বর্ষা শুরুর তারিখ ও ভারী বর্ষণ',
    paramMeasuredEn: 'Precipitation, monsoon onset dates, storm extremes',
    appUsage: 'Ropon Radar বর্ষা শুরুর নিশ্চিতকরণ এবং ধান রোপণের তারিখ নির্ধারণে ব্যবহৃত হয়।',
    appUsageEn: 'Powers Ropon Radar onset rule, checking rain bursts against 25-season station normals.',
    color: '#0284c7',
  },
  {
    id: 'smap',
    name: 'NASA-USDA SMAP',
    agency: 'NASA JPL',
    altitudeKm: 685,
    inclination: '98.1° Sun-Synchronous (6 AM / 6 PM)',
    payload: 'L-band Radiometer (1.41 GHz) with 6m Conical Reflector',
    swathKm: 1000,
    revisit: '2–3 days',
    paramMeasured: 'মাটির ওপরের ৫ সেমি আর্দ্রতা ও বরফ/গলন স্থিতি',
    paramMeasuredEn: 'Topsoil (0–5 cm) volumetric moisture and freeze/thaw',
    appUsage: 'বোরো ধানের AWD সেচ নিরীক্ষণ এবং রবি ফসলের শিকড় অঞ্চলের আর্দ্রতা ঘাটতি যাচাই।',
    appUsageEn: 'Verifies AWD aerobic dry-down compliance and tracks root-zone soil wetness.',
    color: '#16a34a',
  },
  {
    id: 'grace',
    name: 'GRACE-FO Tandem Satellites',
    agency: 'NASA JPL / GFZ Germany',
    altitudeKm: 490,
    inclination: '89.0° Polar Orbit (Twin spacecraft 220 km apart)',
    payload: 'K-band Ranging (KBR) & Laser Ranging Interferometer (LRI)',
    swathKm: 300,
    revisit: '30 days (Monthly gravity anomaly field)',
    paramMeasured: 'মাটির তলদেশের গভীর পানির ভর ও মাধ্যাকর্ষণ পরিবর্তন',
    paramMeasuredEn: 'Terrestrial groundwater mass changes via gravity anomalies',
    appUsage: 'বরেন্দ্র অঞ্চলের ভূগর্ভস্থ পানির পতন (−৮.৯ সেমি/দশক) পর্যবেক্ষণ ও সেচ সাশ্রয় প্রক্ষেপণ।',
    appUsageEn: 'Measures Barind Tract aquifer deficit (-8.9 cm/decade) to gauge upazila recharge offsets.',
    color: '#0d9488',
  },
  {
    id: 'modis',
    name: 'Terra & Aqua (MODIS)',
    agency: 'NASA GSFC',
    altitudeKm: 705,
    inclination: '98.2° Sun-Synchronous (10:30 AM / 1:30 PM)',
    payload: '36-Band Cross-Track Scanning Imaging Spectroradiometer',
    swathKm: 2330,
    revisit: '1–2 days',
    paramMeasured: 'NDVI সবুজ সূচক এবং মাটির উপরিতলের দিনের তাপ (LST)',
    paramMeasuredEn: 'NDVI greenness cycles and daytime Land Surface Temperature',
    appUsage: '২০০১ থেকে প্রতি মাসের এলাকাভিত্তিক ফসলের চাপ ও গরমের তীব্রতা নিরূপণ।',
    appUsageEn: 'Supplies 24-year historical NDVI stress cycles and March–May ground heat records.',
    color: '#ea580c',
  },
  {
    id: 'landsat',
    name: 'Landsat 8 & 9',
    agency: 'NASA / USGS',
    altitudeKm: 705,
    inclination: '98.2° Sun-Synchronous',
    payload: 'OLI-2 (Operational Land Imager) & TIRS-2 (Thermal Infrared)',
    swathKm: 185,
    revisit: '8 days (combined constellation)',
    paramMeasured: '৩০ মিটার দৃশ্যমান, ইনফ্রারেড ও থার্মাল প্রতিফলন',
    paramMeasuredEn: '30 m multispectral VNIR, SWIR, and thermal radiometry',
    appUsage: 'পার্সেল সীমানায় ফসলের স্বাস্থ্য ও HLS সমন্বিত বায়োমাস পর্যবেক্ষণ।',
    appUsageEn: 'Validates parcel-level crop canopy vigor and Harmonized Landsat-Sentinel vegetation curves.',
    color: '#8b5cf6',
  },
  {
    id: 'sentinel',
    name: 'Copernicus Sentinel-1 & 2',
    agency: 'ESA / European Union',
    altitudeKm: 693,
    inclination: '98.2° Polar Sun-Synchronous',
    payload: 'C-SAR Radar (10m) & Multi-Spectral Instrument MSI (13 Bands, 10–20m)',
    swathKm: 250,
    revisit: '5 days (combined)',
    paramMeasured: 'সিন্থেটিক অ্যাপারচার রাডার ব্যাকস্ক্যাটার এবং ১০ মিটার মাল্টি-স্পেকট্রাল আলো',
    paramMeasuredEn: 'Synthetic Aperture Radar backscatter and 10 m multispectral VNIR/SWIR',
    appUsage: 'মেঘের মধ্য দিয়ে আমন রোপণ পর্যবেক্ষণ এবং ফসলের ধরন শনাক্তকরণ।',
    appUsageEn: 'Pierces monsoon clouds to track Aman transplanting dates and identify crop types.',
    color: '#2563eb',
  },
  {
    id: 'ecostress',
    name: 'ECOSTRESS (on ISS)',
    agency: 'NASA JPL / Space Station',
    altitudeKm: 415,
    inclination: '51.6° Precessing Space Station Orbit',
    payload: 'High-Resolution Multispectral Thermal Infrared Radiometer',
    swathKm: 400,
    revisit: 'Variable diurnal cycles (captures morning to evening flux)',
    paramMeasured: 'উদ্ভিদের পাতার প্রস্বেদন ও বাষ্পীভবন চাপ (Evapotranspiration)',
    paramMeasuredEn: 'Plant canopy evapotranspiration and water stress indices',
    appUsage: 'দিনের বিভিন্ন সময়ে ফসলের পানি সংকটের লক্ষণ ও সূক্ষ্ম বাষ্পীভবন পর্যবেক্ষণ।',
    appUsageEn: 'Detects diurnal crop water stress and thermal anomalies before visible wilt occurs.',
    color: '#d97706',
  },
];

export default function OrbitConstellation() {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [activeId, setActiveId] = useState('gpm');

  const mission = MISSIONS.find((m) => m.id === activeId) ?? MISSIONS[0];

  return (
    <Card className="mt-8 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <Satellite size={18} />
            </span>
            <h2 className="text-[20px] font-bold text-ink">
              {T('নাসা ও আন্তর্জাতিক উপগ্রহ বহর ও কক্ষপথ নিরীক্ষক', 'NASA & International Orbital Constellation Explorer')}
            </h2>
          </div>
          <p className="mt-1 text-[13.5px] leading-6 text-muted">
            {T(
              'বাংলাদেশের মাঠপর্যায়ের সিদ্ধান্ত তৈরি করতে মহাকাশে চব্বিশ ঘণ্টা প্রদক্ষিণরত ৭টি প্রধান উপগ্রহ মিশন: কক্ষপথের উচ্চতা, সেন্সর পেলোড, কাভারেজ এলাকা এবং ফিল্ডশিফ্ট ৩৬০-এর গাণিতিক মডেলে তাদের সরাসরি ব্যবহার।',
              'The 7 premier Earth observation missions continuously surveying Bangladesh: orbital mechanics, instrument payloads, swath widths, and their direct mathematical integration into FieldShift 360.'
            )}
          </p>
        </div>
        <Tags list={['SAT', 'MODEL']} />
      </div>

      {/* Satellite Selector Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {MISSIONS.map((m) => {
          const isSelected = m.id === activeId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition ${
                isSelected
                  ? 'border-sky-600 bg-sky-50 shadow-xs ring-2 ring-sky-500/20'
                  : 'border-border bg-white hover:border-sky-300'
              }`}
            >
              <Satellite size={18} style={{ color: m.color }} />
              <span className="mt-1.5 text-[12px] font-bold text-ink leading-tight line-clamp-1">{m.name.split(' ')[0]}</span>
              <span className="text-[10px] text-muted">{m.agency.split('/')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Mission Detailed Blueprint Card */}
      <div className="mt-5 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-slate-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 pb-3">
          <div>
            <span className="text-[12px] font-bold uppercase tracking-wider text-sky-800">{mission.agency}</span>
            <h3 className="font-display text-[22px] font-bold text-ink">{mission.name}</h3>
          </div>
          <Badge tone="ok">{mission.inclination.split(' ')[0]}</Badge>
        </div>

        {/* Orbit Mechanics & Sensor Specifications */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-[13px]">
          <div className="rounded-xl border border-border bg-white p-3">
            <div className="text-[11.5px] font-semibold text-muted flex items-center gap-1">
              <Compass size={13} className="text-sky-700" />
              {T('কক্ষপথের উচ্চতা', 'Orbital Altitude')}
            </div>
            <div className="mt-0.5 font-display text-[18px] font-bold text-ink">
              {num(mission.altitudeKm, lang)} <span className="text-[12px] font-normal text-muted">কিমি (km)</span>
            </div>
            <div className="text-[11px] text-muted">{T('লো আর্থ অরবিট (LEO)', 'Low Earth Orbit')}</div>
          </div>

          <div className="rounded-xl border border-border bg-white p-3">
            <div className="text-[11.5px] font-semibold text-muted flex items-center gap-1">
              <Eye size={13} className="text-sky-700" />
              {T('সোয়াথ প্রস্থ (Swath)', 'Swath Width')}
            </div>
            <div className="mt-0.5 font-display text-[18px] font-bold text-ink">
              {num(mission.swathKm, lang)} <span className="text-[12px] font-normal text-muted">কিমি (km)</span>
            </div>
            <div className="text-[11px] text-muted">{T('এক পাসে কাভারেজ', 'Single pass coverage')}</div>
          </div>

          <div className="rounded-xl border border-border bg-white p-3">
            <div className="text-[11.5px] font-semibold text-muted flex items-center gap-1">
              <Clock size={13} className="text-sky-700" />
              {T('পুনরাবৃত্তি (Revisit)', 'Revisit Frequency')}
            </div>
            <div className="mt-0.5 font-bold text-ink text-[14px]">
              {mission.revisit}
            </div>
            <div className="text-[11px] text-muted">{T('বাংলাদেশ অঞ্চলে পাস', 'Overpass rate')}</div>
          </div>

          <div className="rounded-xl border border-border bg-white p-3">
            <div className="text-[11.5px] font-semibold text-muted flex items-center gap-1">
              <Radio size={13} className="text-sky-700" />
              {T('কক্ষপথের ধরন', 'Orbit Profile')}
            </div>
            <div className="mt-0.5 font-bold text-ink text-[13px] line-clamp-1">
              {mission.inclination}
            </div>
            <div className="text-[11px] text-muted">{T('সূর্য-সমন্বিত বা ইনক্লাইনড', 'Sun-synch / inclined')}</div>
          </div>
        </div>

        {/* Payload & Parameters */}
        <div className="mt-4 rounded-xl border border-border bg-white p-3.5">
          <div className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
            <Layers size={15} className="text-sky-700" />
            {T('সেন্সর পেলোড ও পরিমাপ পদ্ধতি:', 'Scientific Payload & Detection Principle:')}
          </div>
          <p className="mt-1 font-mono text-[13px] text-slate-800 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-200">
            {mission.payload}
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
            <div className="p-2.5 rounded-lg bg-sky-50/80 border border-sky-100">
              <span className="font-semibold text-sky-950 block">{T('প্রধান পরিমাপ্য বিষয়:', 'Measured Parameter:')}</span>
              <span className="text-sky-900/90 mt-0.5 block">{lang === 'bn' ? mission.paramMeasured : mission.paramMeasuredEn}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-100">
              <span className="font-semibold text-emerald-950 block">{T('ফিল্ডশিফ্ট ৩৬০-এ বাস্তব প্রয়োগ:', 'Application in FieldShift 360:')}</span>
              <span className="text-emerald-900/90 mt-0.5 block">{lang === 'bn' ? mission.appUsage : mission.appUsageEn}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
