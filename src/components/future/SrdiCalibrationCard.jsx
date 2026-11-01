import { useState } from 'react';
import { FlaskConical, CheckCircle2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Tags, Button, Badge } from '../ui';
import { num } from '../../engine/dates';
import { socStock } from '../../engine/soilfuture';

export default function SrdiCalibrationCard({
  baseSoil,
  calibratedSoil,
  soilTestValues,
  onApplyValues,
  onReset,
  lang = 'bn',
  T,
  L,
}) {
  const [openCustom, setOpenCustom] = useState(false);
  const [phInput, setPhInput] = useState('');
  const [omInput, setOmInput] = useState('');
  const [ecInput, setEcInput] = useState('');
  const [reportIdInput, setReportIdInput] = useState('');
  const [reportDateInput, setReportDateInput] = useState('');

  const isCalibrated = !!soilTestValues;
  const currentSoil = calibratedSoil || baseSoil;

  const handleApplyCustom = (e) => {
    e.preventDefault();
    onApplyValues({
      lab_id: reportIdInput.trim() || null,
      date: reportDateInput || null,
      input_source: 'user-entered-unverified',
      verified: false,
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
              ? T('আপনার দেওয়া মাটি পরীক্ষার মান', 'User-entered soil-test values')
                : T('মাটির রেজোলিউশন: SoilGrids ২৫০মি. স্যাটেলাইট মডেল', 'Soil Baseline: SoilGrids 250m Satellite Model')}
            </h2>
          </div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink/85">
            {isCalibrated
              ? T(
                  `আপনি মাটি পরীক্ষার যে মান দিয়েছেন, তা SoilGrids-এর এলাকার মডেল অনুমান সমন্বয়ে ব্যবহার হয়েছে। ${soilTestValues.lab_id ? `রিপোর্ট আইডি: ${soilTestValues.lab_id}। ` : ''}${soilTestValues.date ? `রিপোর্টের তারিখ: ${soilTestValues.date}। ` : ''}অ্যাপ রিপোর্টের উৎস বা নমুনার অবস্থান যাচাই করেনি; এটি পরীক্ষাগারের মাপের বিকল্প নয়।`,
                  `The soil-test values you entered adjust the SoilGrids area estimate. ${soilTestValues.lab_id ? `Report ID: ${soilTestValues.lab_id}. ` : ''}${soilTestValues.date ? `Report date: ${soilTestValues.date}. ` : ''}The app has not verified the issuer or sample location; this does not replace a laboratory measurement.`
                )
              : T(
                  'SoilGrids ২.০-এর ২৫০ মিটার মডেলে এলাকার মাটির আনুমানিক মান দেখানো হচ্ছে। নিজের মাটি পরীক্ষার মান দিলে এই অনুমান সমন্বয় হবে; অ্যাপ রিপোর্টের সত্যতা বা নমুনার অবস্থান যাচাই করতে পারে না।',
                  'This shows an area estimate from SoilGrids 2.0 at 250 m resolution. Entering soil-test values adjusts the estimate; the app cannot verify the report or where its sample came from.'
                )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Tags list={isCalibrated ? ['RULE', 'MODEL'] : ['MODEL']} />
          <Badge tone={isCalibrated ? 'amber' : 'slate'} dot={false}>
            {isCalibrated ? T('দেওয়া মান · যাচাই হয়নি', 'Entered values · unverified') : T('মডেল অনুমান', 'Satellite estimate')}
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
              variant="secondary"
              onClick={() => setOpenCustom(!openCustom)}
              className="inline-flex items-center gap-1.5"
            >
              {openCustom ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {T('মাটি পরীক্ষার রিপোর্ট থেকে মান লিখুন', 'Enter values from a soil-test report')}
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
            {T('রিপোর্টে লেখা মান হুবহু লিখুন · অ্যাপ এগুলো যাচাই করে না', 'Enter the values as printed · the app does not verify them')}
          </h4>
          <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-[12px] font-medium text-ink">
              {T('রিপোর্ট আইডি (ঐচ্ছিক)', 'Report ID (optional)')}
              <input type="text" value={reportIdInput} onChange={(e) => setReportIdInput(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border px-2.5 text-[13px] font-bold" />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('রিপোর্টের তারিখ (ঐচ্ছিক)', 'Report date (optional)')}
              <input type="date" value={reportDateInput} onChange={(e) => setReportDateInput(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-border px-2.5 text-[13px] font-bold" />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('মাটির পিএইচ (pH)', 'Soil pH')}
              <input
                type="number"
                step="0.1"
                min="3.5"
                max="9.5"
                required
                value={phInput}
                onChange={(e) => setPhInput(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-border px-2.5 text-[13px] font-bold"
              />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('জৈব পদার্থ (OM %)', 'Organic Matter (%)')}
              <input
                type="number"
                step="0.05"
                min="0.2"
                max="8.0"
                required
                value={omInput}
                onChange={(e) => setOmInput(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-border px-2.5 text-[13px] font-bold"
              />
            </label>
            <label className="block text-[12px] font-medium text-ink">
              {T('লবণাক্ততা (EC dS/m)', 'Electrical Conductivity (EC dS/m)')}
              <input
                type="number"
                step="0.05"
                min="0.0"
                max="20.0"
                required
                value={ecInput}
                onChange={(e) => setEcInput(e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-border px-2.5 text-[13px] font-bold"
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
