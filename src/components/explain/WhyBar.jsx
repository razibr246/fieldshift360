// Why an option ranks where it does, at a glance: one bar, a segment per factor sized by what it added to the score
// (weight × the option's score on it), with a labelled legend so nothing is told by colour alone.
// engine/explain.js contributions() does the arithmetic.
import { useStore } from '../../store';
import { contributions } from '../../engine/explain';
import { num } from '../../engine/dates';

export const FACTOR = {
  C: { bn: 'আবহাওয়া', en: 'Weather', c: '#3b6fb6' },
  W: { bn: 'পানি', en: 'Water', c: '#2a9d8f' },
  S: { bn: 'মাটি', en: 'Soil', c: '#8a5a2b' },
  P: { bn: 'আয়', en: 'Income', c: '#d4a017' },
  R: { bn: 'ফসলচক্র', en: 'Rotation', c: '#4f8a2b' },
  G: { bn: 'দাম পড়া', en: 'Price drop', c: '#c0392b' },
  E: { bn: 'আগাম', en: 'Early', c: '#7b5ea7' },
  F: { bn: 'গোখাদ্য', en: 'Fodder', c: '#7f8c2a' },
};

export default function WhyBar({ o, weights, legend = true, className = '' }) {
  const { L, s } = useStore();
  const parts = contributions(o, weights);
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/5" role="img"
        aria-label={parts.map((p) => `${L(FACTOR[p.k])} ${num(p.add, s.lang, { dp: 0 })}`).join(', ')}>
        {parts.map((p) => <span key={p.k} style={{ width: `${p.add}%`, background: FACTOR[p.k].c }} className="h-full border-r-2 border-white last:border-r-0" />)}
      </div>
      {legend && (
        <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] leading-4 text-ink/70">
          {parts.map((p) => (
            <li key={p.k} className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: FACTOR[p.k].c }} />
              {L(FACTOR[p.k])} <b className="tabular font-semibold text-ink/85">{num(p.add, s.lang, { dp: 0 })}</b>
              <span className="text-ink/45">/{num(p.w * 100, s.lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
