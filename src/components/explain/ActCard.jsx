// The recommendation's first practical step (which crop, when), what to check on the ground before acting, and ways
// to keep the comparison or talk it over: save it on this phone, share it with family, or send it to the officer.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Footprints, CheckSquare, Square, Share2, Save, UserRoundCheck, Copy, CalendarClock, Compass, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Button } from '../ui';
import { beforeYouAct, seasonColumns, compareText, margin } from '../../engine/explain';
import { fieldRisks } from '../../engine/risks';
import { fieldTerrain } from '../../engine/briefs';
import { landSummary, fieldGreen } from '../../engine/landsat';
import { fmtDate, fmtBangla, fmtRange, num } from '../../engine/dates';

const DAY = 864e5;

const SOP_PHASES = [
  {
    phaseBn: 'T-৩০ দিন: প্রাক-মৌসুম প্রস্তুতি',
    phaseEn: 'T-30 Days: Pre-Season Diagnostic',
    tagBn: 'মাটি ও বীজ',
    tagEn: 'Soil & Seed',
    actionBn: 'এসআরডিআই কিট বা সয়েলগ্রিডস দিয়ে জমির অম্লতা (pH) যাচাই; বারি/বিএডিসির প্রত্যয়িত বীজ সংগ্রহ এবং সেচ নালা পরিষ্কার।',
    actionEn: 'Calibrate pH via SRDI test kit or SoilGrids; secure certified seeds; desilt field channels.',
  },
  {
    phaseBn: 'T-০ দিন: বোনা ও রোপণ উইন্ডো',
    phaseEn: 'T-0 Days: Sowing Launch Window',
    tagBn: 'GPM স্যাটেলাইট',
    tagEn: 'GPM IMERG',
    actionBn: 'নাসা GPM IMERG বৃষ্টি-শুরুর সম্ভাব্য উইন্ডোর সঙ্গে মিলিয়ে সঠিক দিনে বীজ বপন। অতিরিক্ত আর্দ্রতা এড়াতে হালকা জো-অবস্থায় বীজ দেওয়া।',
    actionEn: 'Sow strictly aligned with GPM IMERG onset probability window; ensure proper soil moisture tilth.',
  },
  {
    phaseBn: 'T+৩০ থেকে ৬০ দিন: শিকড় ও পানি ব্যবস্থাপনা',
    phaseEn: 'T+30 to 60 Days: AWD & Root-Zone',
    tagBn: 'SMAP আর্দ্রতা',
    tagEn: 'SMAP Wetness',
    actionBn: 'নাসা SMAP রুট-জোন আর্দ্রতা পর্যবেক্ষণ; ব্রি এডাব্লিউডি (AWD) পাইপ বসিয়ে সেচের পানি ২৫-৩০% সাশ্রয় করা।',
    actionEn: 'Monitor SMAP root-zone moisture; deploy BRRI Alternate Wetting & Drying (AWD) perforated pipes.',
  },
  {
    phaseBn: 'T+৯০ থেকে ১২০ দিন: তাপদাহ ও ফসল তোলা',
    phaseEn: 'T+90 to 120 Days: Terminal Heat Guard',
    tagBn: 'POWER তাপসীমা',
    tagEn: 'POWER 35°C',
    actionBn: 'নাসা পাওয়ার ৩৫° সেলসিয়াস তাপসীমা নজরদারি; ফুল ফোটার সময় তাপজনিত ক্ষতি এড়াতে আগেভাগে তোলা ও দাম পড়ার আগে বিক্রি।',
    actionEn: 'Track NASA POWER 35 °C flowering threshold; harvest timely before peak regional market glut.',
  },
  {
    phaseBn: 'T+পোস্ট: মাটির কার্বন চক্র সমাপ্তি',
    phaseEn: 'T+Post: Carbon Loop Closure',
    tagBn: 'ICBM কার্বন',
    tagEn: 'ICBM Soil Carbon',
    actionBn: 'জমির খড় ও ফসলের অবশিষ্টাংশ পুড়িয়ে না ফেলে জমিতে মিশিয়ে দেওয়া (ICBM মডেলে আগামী ১০ বছরে কার্বন সঞ্চয়)।',
    actionEn: 'Retain crop residues and incorporate stubble; close the ICBM organic carbon loop with zero burning.',
  },
];

export default function ActCard() {
  const { s, T, L, dispatch, toast, decision: d, chosen, farmer, soil, tm, upazila, activeParcel } = useStore();
  const lang = s.lang;
  const nav = useNavigate();
  const rec = chosen;
  const risks = useMemo(() => fieldRisks({ terrain: fieldTerrain(activeParcel?.id), tm, land: landSummary(upazila.id), field: fieldGreen(activeParcel?.id, upazila.id) }), [activeParcel?.id, tm, upazila.id]);
  const checks = beforeYouAct({ rec, soilScope: soil.scope, soilTested: soil.tested?.date, risks, irrigation: farmer.irrigation, glutLevel: rec.glut.level });
  const [done, setDone] = useState({});
  const [showSop, setShowSop] = useState(false);
  const field = activeParcel ? L(activeParcel.name) : T('আমার জমি', 'My field');
  const text = compareText({ cols: seasonColumns(d, farmer.last_crop), lang, field, firm: margin(d.options).close ? 'close' : 'fair' });
  const saved = (s.savedCompares ?? []).filter((x) => x.farmerId === farmer.id);

  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: 'FieldShift 360', text }); return; }
      await navigator.clipboard.writeText(text);
      toast('লেখাটা কপি হয়েছে: যেকোনো জায়গায় পেস্ট করে পাঠান', 'Copied: paste it anywhere to send');
    } catch { /* the farmer closed the share sheet */ }
  };
  const save = () => {
    const entry = { farmerId: farmer.id, at: Date.now(), text, rec: rec.crop.id };
    dispatch({ type: 'set', patch: { savedCompares: [entry, ...(s.savedCompares ?? [])].slice(0, 10) } });
    toast('তুলনাটা এই ফোনে রাখা হলো', 'Comparison saved on this phone');
  };

  return (
    <Card id="first-step" data-tour="first-step" className="mt-4 scroll-mt-40 p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-[18px] font-bold"><Footprints size={18} className="text-primary-700" />{T('প্রথম কাজ, আর তার আগে যা দেখে নেবেন', 'The first step, and what to check before it')}</h3>
      <div className="mt-3 rounded-2xl bg-primary-50 p-3.5 ring-1 ring-primary-200">
        <p className="text-[16px] font-semibold leading-7 text-primary-900">
          {T(`${rec.crop.name.bn}: ${L(rec.crop.action)} ${fmtRange(rec.t0 - 7 * DAY, rec.t0 + 7 * DAY, 'bn')}-এর মধ্যে, ভালো হয় ${fmtDate(rec.t0, 'bn')} (${fmtBangla(rec.t0, 'bn')})।`, `${rec.crop.name.en}: ${L(rec.crop.action).toLowerCase()} between ${fmtRange(rec.t0 - 7 * DAY, rec.t0 + 7 * DAY, 'en')}, best around ${fmtDate(rec.t0, 'en')} (${fmtBangla(rec.t0, 'en')}).`)}
        </p>
        <p className="mt-0.5 text-[13px] text-primary-900/75">{T(`ফসল তোলা আনুমানিক ${fmtRange(rec.hw.start, rec.hw.end, 'bn')}।`, `Harvest roughly ${fmtRange(rec.hw.start, rec.hw.end, 'en')}.`)}</p>
      </div>
      <h4 className="mt-4 text-[14.5px] font-bold">{T('কাজের আগে মাঠে যাচাই করুন', 'Check on the ground before you act')}</h4>
      <ul className="mt-2 space-y-1.5">
        {checks.map((c) => {
          const on = !!done[c.k];
          const I = on ? CheckSquare : Square;
          return (
            <li key={c.k}>
              <button type="button" onClick={() => setDone((x) => ({ ...x, [c.k]: !on }))} aria-pressed={on}
                className="flex min-h-[44px] w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left text-[14px] leading-6 hover:bg-canvas">
                <I size={19} className={`mt-0.5 shrink-0 ${on ? 'text-primary-700' : 'text-ink/40'}`} />
                <span className={on ? 'text-ink/50 line-through' : 'text-ink/85'}>{L(c)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1 text-[12.5px] text-muted">{T(`${num(checks.length, 'bn')}টির মধ্যে ${num(Object.values(done).filter(Boolean).length, 'bn')}টি দেখা হয়েছে`, `${Object.values(done).filter(Boolean).length} of ${checks.length} checked`)}</p>

      {/* NASA Mission-Grade Standard Operating Procedure (SOP) */}
      <div className="mt-4 rounded-2xl border border-primary-200/90 bg-white p-3.5 shadow-xs">
        <button
          type="button"
          onClick={() => setShowSop(!showSop)}
          className="flex w-full items-center justify-between text-left text-[14px] font-bold text-primary-950"
        >
          <span className="flex items-center gap-2">
            <Compass size={16} className="text-primary-700" />
            {T('মাঠের এসওপি: সিজন ফ্লাইট প্ল্যান (Standard Operating Procedure)', 'Field SOP: Seasonal Flight Plan (Standard Operating Procedure)')}
          </span>
          {showSop ? <ChevronUp size={16} className="text-primary-700" /> : <ChevronDown size={16} className="text-primary-700" />}
        </button>
        {showSop && (
          <div className="mt-3 space-y-2 border-t border-primary-100 pt-3">
            <p className="text-[12.5px] text-muted leading-5">
              {T(
                'নাসার মিশন অপারেশন প্রটোকল অনুসারে বীজ বপনের ৩০ দিন পূর্ব থেকে ফসল তোলা পর্যন্ত ৫ ধাপের অ্যাকশন মাইলস্টোন:',
                'NASA mission operation protocol: 5 sequenced agronomic milestones from T-30 days to post-harvest closure:'
              )}
            </p>
            <ol className="space-y-2.5 pt-1">
              {SOP_PHASES.map((p, idx) => (
                <li key={idx} className="rounded-xl bg-canvas p-2.5 text-[13px] border border-border/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-primary-900">{T(p.phaseBn, p.phaseEn)}</span>
                    <span className="rounded-md bg-primary-100 px-2 py-0.5 text-[11px] font-bold text-primary-800">
                      {T(p.tagBn, p.tagEn)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-5 text-ink/80">{T(p.actionBn, p.actionEn)}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => nav('/farmer/help', { state: { ask: text } })}><UserRoundCheck size={16} />{T('কর্মকর্তার সঙ্গে আলোচনা', 'Discuss with my officer')}</Button>
        <Button variant="secondary" onClick={share}>{navigator.share ? <Share2 size={16} /> : <Copy size={16} />}{T('পরিবারকে পাঠান', 'Share with family')}</Button>
        <Button variant="secondary" onClick={save}><Save size={16} />{T('তুলনা রাখুন', 'Save comparison')}</Button>
      </div>
      {saved.length > 0 && (
        <details className="mt-3 text-[13px]">
          <summary className="cursor-pointer font-semibold text-primary-800">{T(`রাখা তুলনা (${num(saved.length, 'bn')}টি)`, `Saved comparisons (${saved.length})`)}</summary>
          <ul className="mt-2 space-y-2">
            {saved.map((x) => <li key={x.at} className="rounded-xl bg-canvas p-2.5"><div className="text-[12px] font-semibold text-muted">{fmtDate(x.at, lang)}</div><pre className="mt-1 whitespace-pre-wrap font-sans text-[13px] leading-5 text-ink/80">{x.text}</pre></li>)}
          </ul>
        </details>
      )}
    </Card>
  );
}
