// National Edible Oil & Foreign Exchange Import Substitution Simulator.
// Aligned with Bangladesh Ministry of Agriculture 3-Year Edible Oil Self-Sufficiency Roadmap.
// Computes local mustard/sunflower yield, domestic oil extraction, import substitution in USD/BDT, and cattle feed byproduct.
import { useState, useMemo } from 'react';
import { Sparkles, Coins, DollarSign, ShieldCheck, TrendingUp, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tags, Badge } from '../ui';
import { num, bnDigits } from '../../engine/dates';

const USD_TO_BDT = 122; // Current exchange rate
const OIL_PRICE_USD_PER_TONNE = 1150; // International edible oil import parity price (CIF Chattogram)

const OILSEEDS = [
  { id: 'mustard', name: { bn: 'উন্নত সরিষা (বারি-১৪/১৭/১৮)', en: 'High-Yield Mustard (BARI-14/17)' }, yieldTHa: 1.6, oilPct: 0.40, cakePct: 0.58, days: 75, ureaSavedKgHa: 45 },
  { id: 'sunflower', name: { bn: 'সূর্যমুখী (হাইসান-৩৩ / বারি-৩)', en: 'Hybrid Sunflower (Hysun-33)' }, yieldTHa: 2.2, oilPct: 0.44, cakePct: 0.52, days: 95, ureaSavedKgHa: 30 },
  { id: 'sesame', name: { bn: 'তিল (বারি তিল-৪)', en: 'High-Yield Sesame (BARI-4)' }, yieldTHa: 1.2, oilPct: 0.45, cakePct: 0.53, days: 85, ureaSavedKgHa: 25 },
];

export default function EdibleOilDividend({ switchedHa, upazilaName }) {
  const { s, T, L } = useStore();
  const lang = s.lang;
  const [selectedCropId, setSelectedCropId] = useState('mustard');

  const crop = OILSEEDS.find((c) => c.id === selectedCropId) ?? OILSEEDS[0];
  const ha = Math.max(1, switchedHa || 500);

  // Calculations
  const seedProductionTonnes = Math.round(ha * crop.yieldTHa);
  const oilProductionTonnes = Math.round(seedProductionTonnes * crop.oilPct);
  const cakeProductionTonnes = Math.round(seedProductionTonnes * crop.cakePct);

  // Import substitution financials
  const importSavedUsd = oilProductionTonnes * OIL_PRICE_USD_PER_TONNE;
  const importSavedBdtCrore = (importSavedUsd * USD_TO_BDT) / 10000000; // in Crore BDT
  const ureaSavedTonnes = Math.round((ha * crop.ureaSavedKgHa) / 1000);

  return (
    <div className="mt-5 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-100/40 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-200 text-amber-900 shadow-xs">
              <Coins size={18} />
            </span>
            <h3 className="text-[18px] font-bold text-ink">
              {T('জাতীয় ভোজ্য তেল আমদানি সাশ্রয় ও বৈদেশিক মুদ্রা সঞ্চয়', 'National Edible Oil & Foreign Exchange Dividend')}
            </h3>
          </div>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            {T(
              'বাংলাদেশ বছরে প্রায় ২২ হাজার কোটি টাকার ($২.২ বিলিয়ন) ভোজ্যতেল আমদানি করে। বোরো ধান থেকে সরে সরিষা বা তেলবীজ চাষ করলে সরাসরি জাতীয় আমদানি বিল ও ডলারের রিজার্ভ বাঁচে। কৃষি মন্ত্রণালয়ের তেলবীজ রোডম্যাপের সাথে সরাসরি সঙ্গতিপূর্ণ।',
              'Bangladesh spends ~$2.2B USD annually importing 90%+ of its edible oil. Transitioning groundwater-depleted Boro to short-duration mustard/sunflower directly substitutes imports, saves central bank foreign exchange, and produces organic oilcake.'
            )}
          </p>
        </div>
        <Badge tone="gold">{T('জাতীয় খাদ্য নিরাপত্তা', 'Macro Food Security')}</Badge>
      </div>

      {/* Crop Selector Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {OILSEEDS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedCropId(item.id)}
            className={`rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition ${
              selectedCropId === item.id
                ? 'bg-amber-700 text-white shadow-sm'
                : 'border border-amber-200 bg-white text-ink/80 hover:bg-amber-100/60'
            }`}
          >
            {L(item.name)}
          </button>
        ))}
      </div>

      {/* Macro Yield Metrics */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Edible Oil Output */}
        <div className="rounded-xl border border-amber-200/80 bg-white p-3.5 shadow-xs">
          <div className="text-[12px] font-semibold text-amber-800">
            {T('স্থানীয় ভোজ্য তেল উৎপাদন', 'Domestic Edible Oil Produced')}
          </div>
          <div className="mt-1 font-display text-[22px] font-bold text-ink">
            {num(oilProductionTonnes, lang)} <span className="text-[13px] font-normal text-muted">{T('মেট্রিক টন', 'tonnes')}</span>
          </div>
          <div className="text-[11.5px] text-muted">
            {num(seedProductionTonnes, lang)} {T('টন বীজ থেকে (৪০% তেল নিষ্কাশন)', 'tonnes seed at 40% oil')}
          </div>
        </div>

        {/* Forex Import Bill Saved */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-800">
            <DollarSign size={14} />
            {T('আমদানি বিল সাশ্রয় (ডলার ও টাকা)', 'Forex Import Bill Saved')}
          </div>
          <div className="mt-1 font-display text-[22px] font-bold text-emerald-900">
            ৳{num(importSavedBdtCrore.toFixed(2), lang)} <span className="text-[15px] font-normal">{T('কোটি', 'Cr BDT')}</span>
          </div>
          <div className="text-[11.5px] text-emerald-800/80">
            ${num(Math.round(importSavedUsd / 1000), lang)}k USD {T('রিজার্ভ সরাসরি সাশ্রয়', 'forex reserves conserved')}
          </div>
        </div>

        {/* High-Protein Cattle Feed / Oilcake */}
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 p-3.5 shadow-xs">
          <div className="text-[12px] font-semibold text-sky-800">
            {T('উচ্চ প্রোটিন খৈল ও জৈব সার', 'Oilcake Feed & Urea Offset')}
          </div>
          <div className="mt-1 font-display text-[22px] font-bold text-sky-950">
            {num(cakeProductionTonnes, lang)} <span className="text-[13px] font-normal text-muted">{T('টন খৈল', 't cake')}</span>
          </div>
          <div className="text-[11.5px] text-sky-900/80">
            {T(`প্রায় ${num(ureaSavedTonnes, lang)} টন রাসায়নিক ইউরিয়া সার সাশ্রয়`, `Replaces ~${ureaSavedTonnes} tonnes synthetic urea`)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-amber-900/90">
        <CheckCircle2 size={15} className="shrink-0 text-amber-700" />
        <span>
          {T(
            `${upazilaName?.bn || 'উপজেলার'} রূপান্তরকৃত ${num(ha, lang)} হেক্টরে সরিষা চাষ আমন কাটার পর মাত্র ৭৫–৮০ দিনে সম্পন্ন হয়, যা বোরোর পানি সমস্যা কাটায় এবং জমির উর্বরতা বৃদ্ধি করে।`,
            `On ${num(ha, 'en')} ha transitioned in ${upazilaName?.en || 'the upazila'}, a 75-80 day mustard cycle fits between Aman and Aus/Mungbean, conserving aquifer reserves while boosting domestic oil security.`
          )}
        </span>
      </div>
    </div>
  );
}
