import { useState } from 'react';
import { FlaskConical, CheckCircle2, RotateCcw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Tags, Button, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';
import { socStock } from '../../engine/soilfuture';

const SAMPLE_REPORTS = {
  godagari: {
    lab_id: 'SRDI-RAJ-2026-G84',
    station: 'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) রাজশাহী আঞ্চলিক গবেষণাগার',
    stationEn: 'SRDI Rajshahi Regional Laboratory',
    date: '2026-09-18',
    ph: 6.8,
    om_pct: 1.45,
    ec_ds_m: 0.35,
    n_kg_ha: 140,
    p_ppm: 14,
    k_meq: 0.22,
  },
  dhamrai: {
    lab_id: 'SRDI-DHK-2026-D12',
    station: 'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) কেন্দ্রীয় গবেষণাগার, ঢাকা',
    stationEn: 'SRDI Central Laboratory, Dhaka',
    date: '2026-10-04',
    ph: 6.5,
    om_pct: 1.80,
    ec_ds_m: 0.28,
    n_kg_ha: 165,
    p_ppm: 19,
    k_meq: 0.28,
  },
  dacope: {
    lab_id: 'SRDI-KHU-2026-K09',
    station: 'মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) খুলনা গবেষণাগার',
    stationEn: 'SRDI Khulna Regional Laboratory',
    date: '2026-08-22',
    ph: 7.4,
    om_pct: 1.60,
    ec_ds_m: 4.20,
    n_kg_ha: 130,
    p_ppm: 16,
    k_meq: 0.45,
  },
};

export default function SrdiCalibrationCard({
  baseSoil,
  calibratedSoil,
  labReport,
  onApplyReport,
  onReset,
  upazilaId,
  lang = 'bn',
  T,
  L,
}) {
  const [openCustom, setOpenCustom] = useState(false);
  const [phInput, setPhInput] = useState(baseSoil.ph ?? 6.5);
  const [omInput, setOmInput] = useState(baseSoil.om_pct ?? 1.2);
  const [ecInput, setEcInput] = useState(baseSoil.ec_ds_m ?? 0.3);

  const sample = SAMPLE_REPORTS[upazilaId] || SAMPLE_REPORTS.dhamrai;
  const isCalibrated = !!labReport;
  const currentSoil = calibratedSoil || baseSoil;

  const handleApplyCustom = (e) => {
    e.preventDefault();
    onApplyReport({
      lab_id: 'SRDI-FARMER-CARD',
      station: lang === 'bn' ? 'কৃষকের নিজস্ব মৃত্তিকা পরীক্ষা রিপোর্ট' : 'Farmer Soil Test Card',
      stationEn: 'Farmer Soil Test Card',
      date: new Date().toISOString().slice(0, 10),
      ph: Number(phInput),
      om_pct: Number(omInput),
      ec_ds_m: Number(ecInput),
    });
    setOpenCustom(false);
  };

  return (
    <Card className="mb-4 border-primary-200/80 bg-linear-to-r from-emerald-50/50 via-white to-primary-50/30 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-100 text-primary-800">
              <FlaskConical size={18} />
            </span>
            <h2 className="text-[17.5px] font-bold text-ink">
              {isCalibrated
                ? T('SRDI ল্যাব গ্রাউন্ড-ক্যালিব্রেটেড মাটি', 'SRDI Physical Lab Calibrated Soil')
                : T('মাটির রেজোলিউশন: SoilGrids ২৫০মি. স্যাটেলাইট মডেল', 'Soil Baseline: SoilGrids 250m Satellite Model')}
            </h2>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/85">
            {isCalibrated
              ? T(
                  `সরকারি মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI)-এর ল্যাব টেস্ট রিপোর্ট দিয়ে স্যাটেলাইট মডেল ক্যালিব্রেট করা হয়েছে। ল্যাব আইডি: ${labReport.lab_id} (${labReport.date})। ১০ বছরের কার্বন ও পুষ্টি মজুদ এই বাস্তব তথ্যের ভিত্তিতে নতুন করে হিসাব করা হয়েছে।`,
                  `Modeled 250m SoilGrids data has been ground-calibrated with an official SRDI physical lab test report (${labReport.lab_id}, ${labReport.date}). 10-year carbon stock and trajectory reflect physical field measurements.`
                )
              : T(
                  'SoilGrids ২.০-এর ২৫০ মিটার মডেলের মাধ্যমে আঞ্চলিক মাটির গঠন দেখানো হচ্ছে। আপনার কাছে সরকারি SRDI ল্যাব টেস্ট কার্ড থাকলে তা যুক্ত করে জমির পিএইচ (pH) ও জৈব পদার্থের হিসাব মাঠের বাস্তবতার সঙ্গে পুরোপুরি মিলিয়ে নিন।',
                  'Currently using SoilGrids 2.0 at 250m resolution. Ground-calibrate this baseline with an official SRDI soil test card to accurately capture field-level pH and organic matter.'
                )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Tags list={isCalibrated ? ['RECORD', 'LAB', 'MODEL'] : ['MODEL']} />
          <Badge tone={isCalibrated ? 'green' : 'slate'} dot={isCalibrated}>
            {isCalibrated ? T('বাস্তব ল্যাব টেস্ট যুক্ত', 'Lab Calibrated') : T('মডেল অনুমান', 'Satellite Modeled')}
          </Badge>
        </div>
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-white/90 p-2.5 shadow-2xs">
          <span className="block text-[11px] font-semibold text-muted">{T('মাটির পিএইচ (pH)', 'Soil pH')}</span>
          <span className="mt-0.5 block font-display text-[15px] font-bold text-ink">
            {num(currentSoil.ph, lang, { dp: 1 })}
            {isCalibrated && baseSoil.ph !== currentSoil.ph && (
              <span className="ml-1 text-[11px] font-normal text-muted">
                ({T('মডেল ছিল: ', 'was ')}{num(baseSoil.ph, lang, { dp: 1 })})
              </span>
            )}
          </span>
        </div>
        <div className="rounded-xl border border-border/80 bg-white/90 p-2.5 shadow-2xs">
          <span className="block text-[11px] font-semibold text-muted">{T('জৈব পদার্থ (OM %)', 'Organic Matter')}</span>
          <span className="mt-0.5 block font-display text-[15px] font-bold text-ink">
            {num(currentSoil.om_pct ?? 1.2, lang, { dp: 2 })}%
            {isCalibrated && baseSoil.om_pct !== currentSoil.om_pct && (
              <span className="ml-1 text-[11px] font-normal text-emerald-700">
                ({T('মডেল ছিল: ', 'was ')}{num(baseSoil.om_pct ?? 1.2, lang, { dp: 2 })}%)
              </span>
            )}
          </span>
        </div>
        <div className="rounded-xl border border-border/80 bg-white/90 p-2.5 shadow-2xs">
          <span className="block text-[11px] font-semibold text-muted">{T('লবণাক্ততা (EC)', 'Salinity (EC)')}</span>
          <span className="mt-0.5 block font-display text-[15px] font-bold text-ink">
            {currentSoil.ec_ds_m != null ? `${num(currentSoil.ec_ds_m, lang, { dp: 2 })} dS/m` : T('স্বাভাবিক (<২)', 'Normal (<2)')}
          </span>
        </div>
        <div className="rounded-xl border border-border/80 bg-white/90 p-2.5 shadow-2xs">
          <span className="block text-[11px] font-semibold text-muted">{T('টপসয়েল কার্বন মজুদ', 'Topsoil SOC Stock')}</span>
          <span className="mt-0.5 block font-display text-[15px] font-bold text-primary-800">
            {num(socStock(currentSoil), lang, { dp: 1 })} {T('টন/হেক্টর', 't C/ha')}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
        {!isCalibrated ? (
          <>
            <Button
              onClick={() => onApplyReport(sample)}
              className="btn-gloss inline-flex items-center gap-1.5"
            >
              <FlaskConical size={14} />
              {T(`সরকারি SRDI রিপোর্ট লোড করুন (${sample.lab_id})`, `Load Upazila SRDI Lab Card (${sample.lab_id})`)}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setOpenCustom(!openCustom)}
              className="inline-flex items-center gap-1.5"
            >
              {openCustom ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {T('নিজের ল্যাব কার্ডের মান লিখুন', 'Enter Custom Lab Report')}
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-ink/80 hover:text-ink"
          >
            <RotateCcw size={14} />
            {T('মডেল অনুমানে ফিরে যান (SoilGrids)', 'Reset to SoilGrids Model')}
          </Button>
        )}
      </div>

      {openCustom && !isCalibrated && (
        <form onSubmit={handleApplyCustom} className="mt-3 rounded-xl border border-primary-200 bg-white p-3.5 shadow-xs">
          <h4 className="text-[13px] font-bold text-ink">
            {T('মৃত্তিকা সম্পদ উন্নয়ন ইনস্টিটিউট (SRDI) ল্যাব কার্ডের মান:', 'SRDI Laboratory Soil Card Values:')}
          </h4>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <label className="block text-[12px] font-medium text-ink">
              {T('মাটির পিএইচ (pH)', 'Soil pH')}
              <input
                type="number"
                step="0.1"
                min="3.5"
                max="9.5"
                value={phInput}
                onChange={(e) => setPhInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-bold"
              />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('জৈব পদার্থ (OM %)', 'Organic Matter (%)')}
              <input
                type="number"
                step="0.05"
                min="0.2"
                max="8.0"
                value={omInput}
                onChange={(e) => setOmInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-bold"
              />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('লবণাক্ততা (EC dS/m)', 'Electrical Conductivity (EC dS/m)')}
              <input
                type="number"
                step="0.05"
                min="0.0"
                max="20.0"
                value={ecInput}
                onChange={(e) => setEcInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 text-[13px] font-bold"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenCustom(false)}>
              {T('বাতিল', 'Cancel')}
            </Button>
            <Button type="submit" className="btn-gloss">
              <CheckCircle2 size={14} className="mr-1" />
              {T('ক্যালিব্রেট করুন', 'Apply Calibration')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
