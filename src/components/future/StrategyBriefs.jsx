// Field Future: for each strategy compared (farming as now, this season's plan every year, the best rotation found,
// the farmer's own), why it was suggested, the evidence behind it, what it may offer, where information is missing,
// and the risks a farmer or officer should review locally (engine/briefs.js).
import { useState } from 'react';
import { Lightbulb, FileSearch, ThumbsUp, HelpCircle, ShieldAlert } from 'lucide-react';
import { useStore } from '../../store';
import { Card, Segmented, Tags } from '../ui';
import { strategyBrief } from '../../engine/briefs';

const PARTS = [
  { k: 'why', icon: Lightbulb, bn: 'কেন এই পথ', en: 'Why this one', tone: 'text-primary-700 bg-primary-50' },
  { k: 'evidence', icon: FileSearch, bn: 'কোন তথ্যে', en: 'The evidence', tone: 'text-sky-800 bg-sky-50' },
  { k: 'benefits', icon: ThumbsUp, bn: 'কী পেতে পারেন', en: 'What it may offer', tone: 'text-primary-800 bg-primary-50' },
  { k: 'gaps', icon: HelpCircle, bn: 'যা এখনো জানা নেই', en: 'What is not known yet', tone: 'text-paddy-700 bg-paddy-50' },
  { k: 'risks', icon: ShieldAlert, bn: 'স্থানীয়ভাবে যাচাই করুন', en: 'Check locally', tone: 'text-red-700 bg-red-50' },
];

// list: [{ id, kind, e, name, tone }]; sumOf picks today's or the 2040s summary; terrain: the field's SRTM row or null
export default function StrategyBriefs({ list, sumOf, world, terrain, rotName }) {
  const { T, L } = useStore();
  const [at, setAt] = useState(list.find((c) => c.kind === 'best')?.id ?? list[0].id);
  const c = list.find((x) => x.id === at) ?? list[0];
  const base = list.find((x) => x.kind === 'habit');
  const b = strategyBrief({ s: sumOf(c.e), b: sumOf(base.e), rot: c.e.rot, kind: c.kind, world, terrain });
  return (
    <Card id="ff-why" className="mt-5 scroll-mt-40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="max-w-2xl">
          <h2 className="text-[20px] font-bold">{T('প্রতিটি পথ: কেন, কোন তথ্যে, কী ঝুঁকি', 'Each strategy: why, on what evidence, with what risks')}</h2>
          <p className="mt-0.5 text-[13.5px] leading-6 text-muted">{T('প্রতিটি ফসলচক্র কেন এসেছে, কোন তথ্য তা বলছে, কী লাভ হতে পারে, কোথায় তথ্যের ঘাটতি, আর কোন ঝুঁকি আপনার কৃষি কর্মকর্তা বা অভিজ্ঞ কৃষকের সঙ্গে মিলিয়ে নেওয়া দরকার।', 'Why each rotation came up, what evidence supports it, what it may offer, where information is missing, and which risks to review with your agriculture officer or experienced farmers.')}</p>
        </div>
        <Tags list={['REAL', 'RULE']} />
      </div>
      <Segmented className="mt-3" value={c.id} onChange={setAt} options={list.map((x) => ({ value: x.id, label: x.name }))} />
      <p className="mt-2 text-[13px] text-muted">{rotName(c.e.rot)}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {PARTS.map((p) => b[p.k].length > 0 && (
          <section key={p.k} className={`rounded-2xl border border-border bg-white p-4 ${p.k === 'risks' ? 'md:col-span-2' : ''}`}>
            <h3 className="flex items-center gap-2 text-[15px] font-bold"><span className={`grid h-7 w-7 place-items-center rounded-lg ${p.tone}`}><p.icon size={15} /></span>{L(p)}</h3>
            <ul className="mt-2 space-y-1.5 text-[14px] leading-6 text-ink/85">
              {b[p.k].map((x) => <li key={x.en} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/30" />{L(x)}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
