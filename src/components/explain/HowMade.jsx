// "How this recommendation was made", in one panel on the season plan: what went into the calculation and what is only
// context, the rules and their review status, the assumptions, and how firm the answer is (its lead over the next
// option, whether it survives other weights and other climates). The arithmetic is engine/explain.js.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Eye, Scale, ListChecks, AlertTriangle, CheckCircle2, Gauge, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Tag } from '../ui';
import { margin, weightStability, climateStability, firmness, calibrationFlags, DECISION_INPUTS } from '../../engine/explain';
import { WHAT_IFS } from '../../engine/climate';
import { cropName } from '../../engine/crops';
import { num } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import WhyBar from './WhyBar';

const FIRM = {
  firm: { bn: 'স্পষ্ট', en: 'Clear', cls: 'bg-primary-50 text-primary-800 ring-primary-200', icon: CheckCircle2 },
  fair: { bn: 'মোটামুটি স্পষ্ট', en: 'Fairly clear', cls: 'bg-paddy-50 text-paddy-800 ring-paddy-200', icon: Gauge },
  close: { bn: 'কাছাকাছি, নিশ্চিত নয়', en: 'A close call', cls: 'bg-amber-50 text-amber-900 ring-amber-300', icon: AlertTriangle },
};

export default function HowMade() {
  const { s, T, L, decision: d, decisionArgs, farmer } = useStore();
  const suspect = calibrationFlags(d.options, farmer.last_crop);
  const lang = s.lang;
  const m = margin(d.options);
  const ws = useMemo(() => weightStability(d.options, d.weights), [d]);
  const cs = useMemo(() => climateStability(decisionArgs), [decisionArgs]);
  const kind = firmness({ gap: m.gap, weightPct: ws.pct, climateHolds: cs.holds });
  const F = FIRM[kind];
  const rec = d.rec, nRules = rec.crop.rules.length;
  return (
    <Card id="how-made" data-tour="how-made" className="mt-4 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-2xl">
          <h3 className="flex items-center gap-2 text-[18px] font-bold"><Calculator size={18} className="text-primary-700" />{T('এই পরামর্শ কীভাবে তৈরি হলো', 'How this recommendation was made')}</h3>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('কোন তথ্য হিসাবে ঢুকেছে, কোনটা শুধু পাশে দেখানো, কোন নিয়ম আর ধরে নেওয়া কথা, আর উত্তরটা কতটা পাকা।', 'What went into the calculation, what is only shown beside it, the rules and assumptions, and how firm the answer is.')}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold ring-1 ${F.cls}`}><F.icon size={14} />{L(F)}</span>
      </div>

      {/* how firm */}
      <div className="mt-4 rounded-2xl bg-canvas p-3.5">
        <h4 className="flex items-center gap-1.5 text-[14.5px] font-bold"><Scale size={15} className="text-primary-700" />{T('উত্তরটা কতটা পাকা', 'How firm the answer is')}</h4>
        <ul className="mt-2 space-y-1.5 text-[13.5px] leading-6">
          {m.second && <li>{T(`পরের ফসল ${bnOf(m.second.crop.name.bn)} চেয়ে ${num(m.gap, 'bn', { dp: 0 })} নম্বর এগিয়ে (১০০-র মধ্যে)।`, `${num(m.gap, 'en', { dp: 0 })} points (of 100) ahead of the next, ${m.second.crop.name.en.toLowerCase()}.`)} {m.close ? <b className="text-amber-900">{T('৫-এর কম ব্যবধান মানে কার্যত সমান: দুটোই ভেবে দেখুন।', 'Under 5 points is practically a tie: weigh both.')}</b> : null}</li>}
          <li>{T(`কোনো একটা বিষয়ের ওজন অর্ধেক বা দেড় গুণ করলে ${num(ws.trials, 'bn')}টি পরীক্ষার ${num(ws.same, 'bn')}টিতে একই ফসল প্রথম থাকে।`, `With any one factor weighted half or one and a half times as much, the same crop stays first in ${ws.same} of ${ws.trials} trials.`)}{ws.rivals.length > 0 && T(` না থাকলে প্রথম হয়: ${ws.rivals.map((id) => cropName(id, 'bn')).join(', ')}।`, ` Otherwise first: ${ws.rivals.map((id) => cropName(id, 'en').toLowerCase()).join(', ')}.`)}</li>
          <li>{T('একই হিসাব অন্য আবহাওয়ায়: ', 'The same working in other weather: ')}
            {cs.runs.map((r, i) => <span key={r.key}>{i > 0 && ' · '}{L(WHAT_IFS[r.key])}: <b className={r.crop === cs.runs[0].crop ? '' : 'text-amber-900'}>{cropName(r.crop, lang)}</b></span>)}
          </li>
        </ul>
        <div className="mt-3">
          <div className="text-[12.5px] font-semibold text-muted">{T(`${bnOf(rec.crop.name.bn)} নম্বর কোথা থেকে এল (প্রতিটি বিষয় কত যোগ করল / সর্বোচ্চ কত পারত)`, `Where ${rec.crop.name.en.toLowerCase()}’s score comes from (what each factor added / the most it could add)`)}</div>
          <WhyBar o={rec} weights={d.weights} className="mt-1.5" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-[14.5px] font-bold"><Calculator size={15} className="text-primary-700" />{T('হিসাবে যা ঢুকেছে', 'Used in the calculation')}</h4>
          <ul className="mt-2 space-y-2 text-[13.5px] leading-5">
            {DECISION_INPUTS.used.map((x) => <li key={x.k} className="flex items-start justify-between gap-2"><span className="text-ink/85">{L(x)}</span><Tag t={x.kind} /></li>)}
          </ul>
        </div>
        <div>
          <h4 className="flex items-center gap-1.5 text-[14.5px] font-bold"><Eye size={15} className="text-sky-700" />{T('শুধু পাশে দেখানো, হিসাবে নয়', 'Shown as context, not in the calculation')}</h4>
          <ul className="mt-2 space-y-2 text-[13.5px] leading-5">
            {DECISION_INPUTS.context.map((x) => <li key={x.k} className="flex items-start justify-between gap-2"><span className="text-ink/85">{L(x)}</span><Tag t={x.kind} /></li>)}
          </ul>
          <h4 className="mt-4 flex items-center gap-1.5 text-[14.5px] font-bold"><ListChecks size={15} className="text-primary-700" />{T('নিয়ম আর ধরে নেওয়া কথা', 'Rules and assumptions')}</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13.5px] leading-5 text-ink/85">
            <li>{T(`${bnOf(rec.crop.name.bn)} ${num(nRules, 'bn')}টি আবহাওয়ার নিয়ম (তাপ, বৃষ্টি): প্রকাশিত গবেষণা থেকে শুরুর মান। স্থানীয় কৃষিবিদের যাচাই এখনো হয়নি; যাচাইয়ের খাতা docs/REVIEW_LOG.md।`, `${nRules} weather rules for ${rec.crop.name.en.toLowerCase()} (heat, rain): starting values from published research. Not yet reviewed by local agronomists; the review log is docs/REVIEW_LOG.md.`)}</li>
            {suspect.map((f) => <li key={f.crop.id} className="font-semibold text-sky-900">{T(`${bnOf(f.crop.name.bn)} সীমা ${num(f.n, 'bn')}টির মধ্যে ${num(f.n - f.safe, 'bn')}টি মৌসুমে পেরিয়েছে, যদিও ফসলটা এখানে প্রতি বছর হয়: সীমাটা সম্ভবত বেশি কড়া, তাই এর আবহাওয়ার নম্বর কম দেখাতে পারে। এটা স্থানীয় যাচাইয়ের প্রথম বিষয়।`, `${f.crop.name.en}’s limit was crossed in ${f.n - f.safe} of ${f.n} seasons although it is grown here every year: the limit is probably too strict, so its weather score may read too low. This is the first thing for local review.`)}</li>)}
            <li>{T('আবহাওয়া উপজেলার (প্রায় ৫০ কিমি ঘর), জমির নয়।', 'The weather is the upazila’s (a cell of about 50 km), not the field’s.')}</li>
            <li>{T('ফলন দেশের গড়; আপনার জমির ফলন বেশি বা কম হতে পারে।', 'Yields are national averages; yours may be higher or lower.')}</li>
            <li>{T('মাটি SoilGrids-এর ২৫০ মিটারের আনুমানিক হিসাব, মাটি পরীক্ষা নয়।', 'The soil is SoilGrids’ 250 m estimate, not a soil test.')}</li>
            <li>{T('অতীতের ২৫ মৌসুম সামনের মৌসুমের মতোই হবে, এমন নয়: তাই অন্য আবহাওয়াতেও চালিয়ে দেখা।', 'The next season will not repeat the last 25: hence the runs in other weather above.')}</li>
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] font-semibold">
        <Link to="/science#coverage" className="inline-flex items-center gap-1 text-primary-800 hover:underline">{T('কোন তথ্য আছে, কোনটা নেই বা পুরোনো', 'Which data is present, missing or out of date')}<ArrowRight size={14} /></Link>
        <Link to="/science#disagree" className="inline-flex items-center gap-1 text-primary-800 hover:underline">{T('যেখানে উৎসগুলো মেলে না', 'Where the sources disagree')}<ArrowRight size={14} /></Link>
      </div>
    </Card>
  );
}
