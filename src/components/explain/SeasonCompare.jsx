// The crop grown now, the recommendation and at least two alternatives, side by side on the same measures and the
// same seasons (2013–2025, this field, these prices), each with why it ranks where it does. Crops the farmer left out
// are named under the table, with a way back to change that.
import { Link } from 'react-router-dom';
import { Columns3, Ban, ArrowRight } from 'lucide-react';
import { useStore } from '../../store';
import { Card, ScoreRing, RISK_STYLE, Tags } from '../ui';
import { seasonColumns, margin, calibrationFlags } from '../../engine/explain';
import { cropName } from '../../engine/crops';
import { num, fmtDate } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import CropPhoto from '../CropPhoto';
import WhyBar, { FACTOR } from './WhyBar';

export default function SeasonCompare() {
  const { s, T, L, decision: d, farmer, dispatch } = useStore();
  const lang = s.lang;
  const cols = seasonColumns(d, farmer.last_crop);
  const m = margin(d.options);
  const ROLE = { now: T('এখন যা করেন', 'What you grow now'), rec: T('পরামর্শ', 'Recommended'), alt: T('বিকল্প', 'Alternative') };
  const best = (f, dir = 1) => { const v = cols.map((c) => f(c.o)).filter((x) => x != null); return v.length ? (dir > 0 ? Math.max(...v) : Math.min(...v)) : null; };
  const rows = [
    { k: T('মোট নম্বর', 'Total score'), f: (o) => o.score, show: (o) => num(o.score, lang, { dp: 0 }), dir: 1 },
    { k: T('ঠিকঠাক মৌসুম, ২০১৩–২০২৫', 'Good seasons, 2013–2025'), f: (o) => o.bt.now.safe / Math.max(1, o.bt.now.n), show: (o) => `${num(o.bt.now.safe, lang)}/${num(o.bt.now.n, lang)}`, dir: 1 },
    { k: T('সেচের পানি', 'Irrigation water'), f: (o) => o.water?.mm, show: (o) => (o.water ? `${num(o.water.mm, lang)} ${T('মিমি', 'mm')}` : '–'), dir: -1 },
    { k: T('লাভ/বিঘা', 'Profit/bigha'), f: (o) => o.money?.net, show: (o) => (o.money ? `৳${num(o.money.net, lang)}` : '–'), dir: 1 },
    { k: T('মাটির সঙ্গে মিল', 'Soil match'), f: (o) => o.comp.S, show: (o) => num(o.comp.S, lang, { dp: 0 }), dir: 1 },
    { k: T('ফসলচক্রে মিল', 'Rotation fit'), f: (o) => o.comp.R, show: (o) => num(o.comp.R, lang, { dp: 0 }), dir: 1 },
    { k: T('দাম পড়ার ঝুঁকি', 'Price-drop risk'), f: null, show: (o) => <span className={`chip ${RISK_STYLE[o.glut.level].cls}`}>{L(RISK_STYLE[o.glut.level])}</span> },
  ];
  const out = s.exclude ?? [];
  const suspect = calibrationFlags(d.options, farmer.last_crop);
  return (
    <Card id="season-compare" data-tour="season-compare" className="mt-4 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 max-w-2xl">
          <h3 className="flex items-center gap-2 text-[18px] font-bold"><Columns3 size={18} className="text-primary-700" />{T('এখনকার ফসল আর বিকল্প, পাশাপাশি', 'What you grow now and the alternatives, side by side')}</h3>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('সবগুলো একই জমিতে, একই ২০১৩–২০২৫-এর মৌসুমে, একই দামে হিসাব। রঙিন দাগে দেখা যায় কোন বিষয় নম্বরে কত যোগ করল।', 'All on the same field, the same 2013–2025 seasons and the same prices. The coloured bar shows what each factor added to the score.')}</p>
        </div>
        <Tags list={['MODEL', 'RECORD', 'RULE']} />
      </div>
      {m.close && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[13.5px] leading-6 text-amber-900 ring-1 ring-amber-200">{T(`প্রথম দুটির ব্যবধান মাত্র ${num(m.gap, 'bn', { dp: 0 })} নম্বর: তথ্য এত সূক্ষ্ম নয় যে এদের আলাদা করা যায়। নিজের অভিজ্ঞতা আর বাজার দেখে বাছুন।`, `The first two are only ${num(m.gap, 'en', { dp: 0 })} points apart: the data is not precise enough to split them. Choose by your own experience and the market.`)}</p>}
      {suspect.map((f) => (
        <p key={f.crop.id} className="mt-3 rounded-xl bg-sky-50 px-3 py-2 text-[13.5px] leading-6 text-sky-950 ring-1 ring-sky-200">
          {T(`সাবধানে পড়ুন: ${f.crop.name.bn} এখানে প্রতি বছর হয়, অথচ এর তাপ-বৃষ্টির সীমা ${num(f.n, 'bn')}টির মধ্যে ${num(f.n - f.safe, 'bn')}টি মৌসুমে পেরিয়েছে। সীমাটা স্থানীয় জাতের জন্য সম্ভবত বেশি কড়া, তাই ${bnOf(f.crop.name.bn)} আবহাওয়ার নম্বর আসলের চেয়ে কম দেখাতে পারে। কৃষিবিদের যাচাই না হওয়া পর্যন্ত এটা মাথায় রাখুন।`, `Read with care: ${f.crop.name.en.toLowerCase()} is grown here every year, yet its heat or rain limit was crossed in ${f.n - f.safe} of ${f.n} seasons. The limit is probably too strict for local varieties, so its weather score may be too low. Keep this in mind until an agronomist reviews it.`)}
        </p>
      ))}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-x-1.5 text-[13.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] w-[150px] bg-white" />
              {cols.map(({ role, o }) => (
                <th key={o.crop.id} className={`rounded-t-xl px-2.5 pb-2 pt-2.5 text-left align-top font-normal ${role === 'rec' ? 'bg-primary-50' : 'bg-canvas'}`}>
                  <div className="flex items-center gap-2">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"><CropPhoto crop={o.crop} width={120} sizes="40px" thumb /></span>
                    <div className="min-w-0">
                      <div className={`text-[11.5px] font-bold uppercase tracking-wide ${role === 'rec' ? 'text-primary-800' : 'text-muted'}`}>{ROLE[role]}</div>
                      <div className="font-display text-[16px] font-bold leading-tight">{L(o.crop.name)}</div>
                    </div>
                    <span className="ml-auto"><ScoreRing value={o.score} size={34} /></span>
                  </div>
                  <div className="mt-1 text-[12px] text-muted">{L(o.crop.action)} {fmtDate(o.t0, lang)}</div>
                  <WhyBar o={o} weights={d.weights} legend={false} className="mt-2" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const top = r.f && best(r.f, r.dir);
              return (
                <tr key={r.k}>
                  <td className="sticky left-0 z-[1] bg-white py-1.5 pr-2 font-semibold text-ink/75">{r.k}</td>
                  {cols.map(({ role, o }) => {
                    const lead = r.f && r.f(o) != null && r.f(o) === top && cols.length > 1;
                    return <td key={o.crop.id} className={`px-2.5 py-1.5 tabular ${role === 'rec' ? 'bg-primary-50' : 'bg-canvas'} ${lead ? 'font-bold text-primary-800' : ''}`}>{r.show(o)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <WhyLegend />
      {out.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-muted"><Ban size={14} className="text-red-700" />{T('আপনি বাদ দিয়েছেন:', 'Left out by you:')} <b className="text-ink/80">{out.map((id) => cropName(id, lang)).join(', ')}</b>
          <button type="button" onClick={() => dispatch({ type: 'set', patch: { step: 3 } })} className="font-semibold text-primary-800 underline-offset-2 hover:underline">{T('বদলান', 'Change')}</button></p>
      )}
      <Link to="/farmer/future" onClick={() => setTimeout(() => document.getElementById('ff-strategies')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 900)}
        className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-primary-50 px-4 py-3 text-[14.5px] font-semibold text-primary-900 ring-1 ring-primary-200 hover:bg-primary-100">
        <span>{T('এটা শুধু এই মৌসুম। দশ বছরের ফসলচক্র পাশাপাশি দেখুন: এখনকার চাষ, সেরা আর পরের বিকল্প, কেন আর কী ঝুঁকি', 'This is one season only. See ten-year rotations side by side: as now, the best and the next alternative, why and with what risks')}</span>
        <ArrowRight size={17} className="shrink-0" />
      </Link>
      <p className="mt-2 text-[12.5px] text-muted">{T('গাঢ় সবুজ: সেই সারিতে সবচেয়ে ভালো। অন্য চাওয়া বাছলে বা ফসল বাদ দিলে (ধাপ ৪) ক্রম সঙ্গে সঙ্গে বদলায়।', 'Bold green: the best in that row. Picking other priorities or leaving crops out (step 4) re-orders this at once.')}</p>
    </Card>
  );
}

function WhyLegend() {
  const { T, L, decision: d } = useStore();
  const ks = Object.entries(d.weights).filter(([, w]) => w > 0).map(([k]) => k);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink/70">
      <span className="font-semibold text-muted">{T('রঙিন দাগ:', 'The bar:')}</span>
      {ks.map((k) => <span key={k} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: FACTOR[k].c }} />{L(FACTOR[k])}</span>)}
    </p>
  );
}
