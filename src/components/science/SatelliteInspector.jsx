// Science Page: Interactive NASA Satellite Constellation & Sensor Telemetry Inspector.
// Provides engineering-level transparency into the 8 orbital missions powering FieldShift 360,
// detailing sensor payloads, orbital dynamics, spatial-temporal resolutions, and their role in the in-browser decision engine.
import { useState } from 'react';
import { Satellite, Radio, Layers, Orbit, Globe2, ExternalLink, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Tags } from '../ui';

const CONSTELLATION = [
  {
    id: 'power',
    name: 'NASA POWER',
    org: 'NASA Langley Research Center (LaRC)',
    orbit: 'GMAO MERRA-2 Assimilation + CERES Satellites',
    altitude: 'Low-Earth Orbit / Global Reanalysis',
    payload: 'CERES Radiometers + Atmospheric Sounders',
    bands: 'All-sky surface solar irradiance, T2M min/max, RH2M, Precipitation',
    resolution: '0.5° × 0.5° (~50 km) point API · Daily, 1981–present',
    roleBn: '২৫ বছরের দৈনিক আবহাওয়া ইতিহাস, বাষ্পীভবন (ET₀) এবং বোরো ধানের ৩৫° তাপসীমা পরীক্ষা।',
    roleEn: '25-season daily meteorological backtesting, Penman-Monteith ET₀, and Boro 35 °C heat stress accumulation.',
    portal: 'https://power.larc.nasa.gov',
    tone: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    id: 'gpm',
    name: 'GPM Core Observatory',
    org: 'NASA GSFC / JAXA (Japan)',
    orbit: 'Non-sun-synchronous, 65° inclination, 407 km altitude',
    payload: 'DPR (Dual-frequency Radar) + GMI (10–183 GHz Microwave Imager)',
    bands: 'Ku-band (13.6 GHz) & Ka-band (35.5 GHz) + 13 GMI channels',
    resolution: '0.1° × 0.1° (~10 km) IMERG · Daily & 30-minute intervals',
    roleBn: 'বাংলাদেশের বর্ষা শুরু (Rain Onset) নির্ধারণ এবং খরা/বন্যা সূচক পরিমাপ।',
    roleEn: 'Monsoon onset date detection and extreme precipitation hazard indexing.',
    portal: 'https://gpm.nasa.gov/data/imerg',
    tone: 'text-sky-700 bg-sky-50 border-sky-200',
  },
  {
    id: 'smap',
    name: 'NASA SMAP',
    org: 'NASA Jet Propulsion Laboratory (JPL)',
    orbit: 'Sun-synchronous, 685 km altitude, 6:00 AM/PM equator crossing',
    payload: 'L-band Radiometer (1.413 GHz)',
    bands: '1.4 GHz passive microwave brightness temperature',
    resolution: '9 km passive / 1 km GMAO Level-4 root-zone wetness (0–100 cm)',
    roleBn: 'জমির শিকড়ের গভীরতায় বাস্তব পানির আর্দ্রতা এবং খরা প্রতিরোধ ক্ষমতা যাচাই।',
    roleEn: 'Calibrates root-zone volumetric moisture (0–100 cm) against FAO-56 balance.',
    portal: 'https://smap.jpl.nasa.gov',
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'grace',
    name: 'GRACE & GRACE-FO',
    org: 'NASA JPL / GFZ (Germany)',
    orbit: 'Twin satellites in tandem (220 km apart), 490 km altitude, 89° polar',
    payload: 'K/Ka-band Microwave Ranging (MWRI) + Laser Interferometer (LRI)',
    bands: 'Sub-micron inter-satellite distance variation tracking Earth gravity',
    resolution: '300 km regional mascons (JPL RL06) · Monthly, 2002–present',
    roleBn: 'বরেন্দ্র অঞ্চলের মাটির নিচে গভীর পানির স্তর পতন (-৮.৯ সেমি/দশক) পর্যবেক্ষণ।',
    roleEn: 'Detects Bengal aquifer depletion trend (-8.9 cm/decade under the Barind).',
    portal: 'https://grace.jpl.nasa.gov',
    tone: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'modis',
    name: 'Terra & Aqua MODIS',
    org: 'NASA Goddard Space Flight Center (GSFC)',
    orbit: 'Sun-synchronous, 705 km altitude, 10:30 AM (Terra) / 1:30 PM (Aqua)',
    payload: 'Moderate Resolution Imaging Spectroradiometer (36 spectral bands)',
    bands: 'Red (620–670 nm), NIR (841–876 nm), Thermal IR (11–12 µm)',
    resolution: '250 m 16-day composite (MOD13Q1 NDVI / EVI) + 1 km LST',
    roleBn: 'রেজিস্ট্রার্ড ১৯টি জমির দীর্ঘমেয়াদি সবুজ ভাব ও শুষ্ক মৌসুমের ফসলি চাপ নির্ণয়।',
    roleEn: 'Tracks parcel vegetative vigor, green-cover anomalies, and winter crop stress.',
    portal: 'https://modis.gsfc.nasa.gov',
    tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'landsat',
    name: 'Landsat 8 & 9 (LDCM)',
    org: 'NASA GSFC / USGS EROS',
    orbit: 'Sun-synchronous, 705 km altitude, 16-day offset repeat cycle',
    payload: 'OLI-2 (9 bands) + TIRS-2 (2 thermal bands)',
    bands: 'Visible, NIR, SWIR-1, SWIR-2, Coastal, Cirrus, Thermal',
    resolution: '30 m multispectral / 15 m panchromatic · Historical 1988–2026',
    roleBn: '৪০ বছরের ঐতিহাসিক তুলনামূলক বেসলাইন (১৯৮৮–৯১ বনাম ১৯৯৮–০১ বনাম আজ)।',
    roleEn: 'Provides 40-year multi-decadal historical baseline for field parcel greenness.',
    portal: 'https://landsat.gsfc.nasa.gov',
    tone: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    id: 'dem',
    name: 'NASA SRTM & ASTER GDEM',
    org: 'NASA JPL / METI (Japan) / NGA',
    orbit: 'Space Shuttle Endeavour (STS-99) & Terra Spacecraft',
    payload: 'C-band Radar Interferometer + Optical Stereoscopic Sensor',
    bands: '5.3 GHz radar interferometry & Nadir/Backward visible stereoscopy',
    resolution: '30 m (1 arc-second) global digital elevation',
    roleBn: 'জমির ঢাল, ক্ষয়ঝুঁকি এবং বর্ষার পানি নিষ্কাশন গতিশীলতা নির্ণয়।',
    roleEn: 'Determines slope erosion risk and low-lying waterlogging drainage dynamics.',
    portal: 'https://www.earthdata.nasa.gov/sensors/srtm',
    tone: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'sentinel',
    name: 'Copernicus Sentinel-1 & 2',
    org: 'ESA (European Space Agency) in NASA Earthdata Harmony',
    orbit: 'Sun-synchronous, 180° phased orbital constellation',
    payload: 'C-band Synthetic Aperture Radar (SAR) + 13-band MSI Optical',
    bands: 'SAR C-band (5.405 GHz, VH/VV) + 10m Optical (B2, B3, B4, B8)',
    resolution: '10 m spatial resolution · 5-day constellation revisit',
    roleBn: 'মেঘ ভেদ করে আমন রোপণের দিন পরিমাপ (রাডার) এবং ১০ মিটার জমির সীমানা পরীক্ষণ।',
    roleEn: 'C-band radar penetrates monsoon clouds for Aman planting; 10m pixel extraction.',
    portal: 'https://sentinels.copernicus.eu',
    tone: 'text-blue-700 bg-blue-50 border-blue-200',
  },
];

export default function SatelliteInspector() {
  const { s, T, L } = useStore();
  const [selectedId, setSelectedId] = useState(CONSTELLATION[0].id);

  const active = CONSTELLATION.find((c) => c.id === selectedId) || CONSTELLATION[0];

  return (
    <section id="sat-inspector" className="mt-12 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-0.5 text-[12px] font-bold text-sky-900">
            <Orbit size={13} className="text-sky-700 animate-spin-slow" />
            {T('অরবিটাল কনস্টেলেশন স্পেকট্রাম', 'Orbital Constellation Telemetry')}
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-[24px] font-bold text-ink">
            <Satellite size={22} className="text-primary-700" />
            {T('নাসার ৮টি উপগ্রহ মিশন: মহাকাশ থেকে জমির ডেটা ফিউশন', 'NASA Satellite Constellation & Ingest Telemetry')}
          </h2>
        </div>
        <Tags list={['SAT', 'MODEL']} />
      </div>

      <p className="mt-2 max-w-3xl text-[15px] leading-7 text-ink/75">
        {T(
          'ফিল্ডশিফ্ট ৩৬০ সরাসরি নাসার বৈজ্ঞানিক স্যাটেলাইট ফ্লিটের কাঁচা ডেটাস্ট্রিম গ্রহণ করে। নিচে ক্লিক করে প্রতিটি উপগ্রহের অরবিটাল উচ্চতা, সেন্সর ব্যান্ড এবং সিদ্ধান্ত ইঞ্জিনে তার নিখুঁত প্রয়োগ দেখুন:',
          'FieldShift 360 directly ingests and harmonizes orbital telemetry from NASA and partner missions. Inspect the exact sensor payloads, orbital altitudes, frequency bands, and deterministic roles below:'
        )}
      </p>

      {/* Satellite Selector Pills */}
      <div className="mt-5 flex flex-wrap gap-2">
        {CONSTELLATION.map((sat) => (
          <button
            key={sat.id}
            type="button"
            onClick={() => setSelectedId(sat.id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all ${
              selectedId === sat.id
                ? 'bg-primary-800 text-white shadow-sm ring-2 ring-primary-300'
                : 'border border-border bg-white text-ink/80 hover:bg-canvas hover:text-ink'
            }`}
          >
            <Satellite size={14} className={selectedId === sat.id ? 'text-paddy-300' : 'text-primary-600'} />
            <span>{sat.name}</span>
          </button>
        ))}
      </div>

      {/* Active Satellite Deep Dive Card */}
      <div className="mt-4 rounded-3xl border border-border bg-white p-5 shadow-xs sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-lg border px-2.5 py-0.5 text-[12px] font-bold ${active.tone}`}>
                {active.org}
              </span>
              <span className="flex items-center gap-1 text-[12px] font-medium text-emerald-700">
                <CheckCircle2 size={13} />
                {T('সক্রিয় ডেটাস্ট্রিম', 'Active Telemetry Ingest')}
              </span>
            </div>
            <h3 className="mt-2 text-[22px] font-bold text-ink">{active.name}</h3>
            <p className="mt-0.5 text-[14px] text-muted">{active.orbit}</p>
          </div>
          <a
            href={active.portal}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-canvas px-3.5 py-2 text-[13px] font-semibold text-primary-800 hover:bg-primary-50 hover:border-primary-300 transition"
          >
            {T('নাসা ক্যাটালগ দেখুন', 'NASA Earthdata Catalog')}
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Technical Specs Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-canvas p-4 border border-border/60">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wider text-muted">
              <Radio size={14} className="text-primary-700" />
              {T('সেন্সর পেলোড', 'Sensor Payload')}
            </div>
            <div className="mt-2 text-[14px] font-semibold text-ink">{active.payload}</div>
          </div>

          <div className="rounded-2xl bg-canvas p-4 border border-border/60">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wider text-muted">
              <Layers size={14} className="text-sky-700" />
              {T('স্পেকট্রাল ব্যান্ড / ফ্রিকোয়েন্সি', 'Spectral Bands & Frequencies')}
            </div>
            <div className="mt-2 text-[14px] font-semibold text-ink">{active.bands}</div>
          </div>

          <div className="rounded-2xl bg-canvas p-4 border border-border/60 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wider text-muted">
              <Activity size={14} className="text-emerald-700" />
              {T('রেজোলিউশন ও পরিধি', 'Spatial / Temporal Resolution')}
            </div>
            <div className="mt-2 text-[14px] font-semibold text-ink">{active.resolution}</div>
          </div>
        </div>

        {/* In-Browser Engine Application Banner */}
        <div className="mt-4 rounded-2xl border border-primary-200 bg-primary-50/70 p-4">
          <div className="text-[12.5px] font-bold uppercase tracking-wider text-primary-900">
            {T('ফিল্ডশিফ্ট ৩৬০ ইঞ্জিনে সুনির্দিষ্ট প্রয়োগ:', 'Deterministic Application in FieldShift 360:')}
          </div>
          <p className="mt-1 text-[14px] leading-6 font-medium text-primary-950">
            {T(active.roleBn, active.roleEn)}
          </p>
        </div>
      </div>
    </section>
  );
}
