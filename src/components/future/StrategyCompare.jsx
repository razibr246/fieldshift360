// Field Future: the rotation strategies side by side, the field's current rotation always first: for each, the
// ten-year numbers and, in plain words, why it is here, what it may offer, what is not known, its risks and what
// needs local review before acting. The words come from engine/briefs.js; "All the details" opens the full brief.
import { useEffect } from 'react';
import { Lightbulb, ThumbsUp, HelpCircle, ShieldAlert, ClipboardCheck, ArrowDown, Columns3 } from 'lucide-react';
import { useStore } from '../../store';
import { Card, ScoreRing, Tags } from '../ui';
import { strategyBrief } from '../../engine/briefs';
import { num } from '../../engine/dates';
import { WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';

const ROWS = [
  { k: 'why', icon: Lightbulb, bn: 'কেন এই পথ', en: 'Why it is here', tone: 'text-primary-700', n: 1 },
  { k: 'benefits', icon: ThumbsUp, bn: 'কী পেতে পারেন', en: 'What it may offer', tone: 'text-primary-800', n: 2 },
  { k: 'gaps', icon: HelpCircle, bn: 'যা জানা নেই', en: 'Not known yet', tone: 'text-paddy-700', n: 2 },
  { k: 'risks', icon: ShieldAlert, bn: 'ঝুঁকি', en: 'Risks', tone: 'text-red-700', n: 2 },
  { k: 'review', icon: ClipboardCheck, bn: 'মাঠে যাচাই দরকার', en: 'Needs local review', tone: 'text-amber-800', n: 3 },
];
const signed = (x, lang, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${num(Math.abs(r), lang, { dp })}`; };

// list: [{ id, kind, e, name, tone }] with the habit first; onDetails(id) opens the full brief for that strategy.
export default function StrategyCompare({ list, sumOf, world, terrain, rotName, onDetails }) {
  const { s, T, L, dispatch } = useStore();
  const lang = s.lang;
  // the farmer home's four-step path counts this step as done once the comparison has been seen
  useEffect(() => { if (!s.sawStrategies) dispatch({ type: 'set', patch: { sawStrategies: true } }); }, [s.sawStrategies, dispatch]);
  const base = list.find((x) => x.kind === 'habit');
  const cols = list.map((c) => {
    const sm = sumOf(c.e), b = strategyBrief({ s: sm, b: sumOf(base.e), rot: c.e.rot, kind: c.kind, world, terrain });
    // the closing "model estimates" line is said once under the table, not in every column
    return { ...c, sm, b: { ...b, why: c.kind === 'habit' ? b.why : b.why.slice(1).concat(b.why.slice(0, 1)), risks: b.risks.slice(0, -1) } };
  });
  return (
    <Card id="ff-strategies" data-tour="ff-strategies" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-3xl">
          <h2 className="flex items-center gap-2 text-[20px] font-bold"><Columns3 size={20} className="text-primary-700" />{T(`${num(cols.length, 'bn')}টি ফসলচক্র পাশাপাশি: এখনকারটা সহ`, `${cols.length} rotations side by side, starting with yours`)}</h2>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('একই জমি, একই দশ বছরের আবহাওয়া, একই দাম। প্রতিটির কারণ, লাভ, অজানা কথা, ঝুঁকি আর কী মাঠে যাচাই করতে হবে।', 'The same field, the same ten years of weather, the same prices. For each: the reason, what it may offer, what is unknown, the risks, and what has to be checked on the ground.')}</p>
        </div>
        <Tags list={['MODEL', 'SAT', 'RULE']} />
      </div>
      {/* stacked on a phone, two across on a tablet, all side by side on a wide screen */}
      <div className="mt-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:[grid-template-columns:var(--cols)]" style={{ '--cols': `repeat(${cols.length}, minmax(0, 1fr))` }}>
          {cols.map((c) => (
            <section key={c.id} aria-label={c.name} className="flex flex-col rounded-2xl border border-border bg-white p-3.5" style={{ boxShadow: `inset 0 3px 0 ${c.tone}` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[15.5px] font-bold" style={{ color: c.tone }}>{c.name}</div>
                  <div className="mt-0.5 whitespace-pre-line text-[12px] leading-4 text-muted">{rotName(c.e.rot)}</div>
                </div>
                {c.e.score != null && <ScoreRing value={c.e.score} size={38} />}
              </div>
              <dl className="mt-2.5 grid grid-cols-2 gap-1.5 text-[12.5px]">
                <div className="rounded-lg bg-canvas px-2 py-1.5"><dt className="text-muted">{T('মাটির কার্বন, ১০ বছর', 'Soil carbon, 10 yrs')}</dt><dd className="font-bold tabular">{signed(c.sm.dSoc, lang)}%</dd></div>
                <div className="rounded-lg bg-canvas px-2 py-1.5"><dt className="text-muted">{T('সেচ/বিঘা/বছর', 'Water/bigha/yr')}</dt><dd className="font-bold tabular">{num(c.sm.waterMm * WATER_M3_PER_MM_BIGHA, lang)} {T('ঘনমিটার', 'm³')}</dd></div>
                <div className="rounded-lg bg-canvas px-2 py-1.5"><dt className="text-muted">{T('লাভ/বিঘা/বছর', 'Profit/bigha/yr')}</dt><dd className="font-bold tabular">৳{num(c.sm.money, lang)}</dd></div>
                <div className="rounded-lg bg-canvas px-2 py-1.5"><dt className="text-muted">{T('সীমা পেরোনো মৌসুম', 'Seasons over a limit')}</dt><dd className="font-bold tabular">{num(c.sm.risk * 100, lang)}%</dd></div>
              </dl>
              {ROWS.map((r) => c.b[r.k].length > 0 && (
                <div key={r.k} className="mt-2.5">
                  <h3 className={`flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wide ${r.tone}`}><r.icon size={14} />{L(r)}</h3>
                  <ul className="mt-1 space-y-1 text-[13px] leading-5 text-ink/85">
                    {c.b[r.k].slice(0, r.n).map((x) => <li key={x.en} className="flex gap-1.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/40" />{L(x)}</li>)}
                  </ul>
                </div>
              ))}
              <button type="button" onClick={() => onDetails(c.id)} className="mt-auto inline-flex items-center gap-1 self-start pt-3 text-[13px] font-semibold text-primary-800 hover:underline">{T('সব খুঁটিনাটি ও তথ্যসূত্র', 'All the details and evidence')}<ArrowDown size={14} /></button>
            </section>
          ))}
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-[13px] leading-6 text-ink/80">{T('এগুলো মডেলের হিসাব, পূর্বাভাস নয়। ফসল বদলানোর সিদ্ধান্ত আপনার; উপসহকারী কৃষি কর্মকর্তা আর অভিজ্ঞ কৃষকের সঙ্গে মিলিয়ে নিন।', 'These are model estimates, not forecasts. The decision to change crops is yours; check it with your sub-assistant agriculture officer and experienced farmers.')}</p>
    </Card>
  );
}
