import { useStore } from '../../store';
import { num } from '../../engine/dates';

// Compare exploratory Boro heat limits without changing the recommendation's active rule.
export default function BoroSensitivity({ rows }) {
  const { s, T } = useStore();
  const lang = s.lang;
  return (
    <details className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <summary className="cursor-pointer list-none font-semibold text-amber-950 marker:hidden">
        <span className="mr-2 inline-flex rounded-full bg-amber-200/80 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-amber-950">{T('পরীক্ষা হয়নি', 'UNTESTED')}</span>
        {T('বোরোর তাপসীমা বদলালে ক্রম', 'Boro heat-limit sensitivity')}
      </summary>
      <p className="mt-2 text-[13.5px] leading-6 text-amber-950/80">
        {T('এগুলো শুধু কী-হতো হিসাব। বর্তমান ৩৫° সেলসিয়াস ও ৩ দিনের সীমাই মূল পরামর্শে আছে; বিকল্পগুলো স্থানীয় কৃষিবিদের পর্যালোচনা পায়নি।',
          'These are what-if calculations only. The main advice still uses 35 °C and 3 days; an agronomist has not reviewed these alternatives.')}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className={`rounded-xl border p-3 ${row.baseline ? 'border-amber-300 bg-white' : 'border-amber-200/80 bg-white/70'}`}>
            <div className="text-[13px] font-semibold text-ink">{row.label}</div>
            <ol className="mt-1.5 space-y-1 text-[13px] text-ink/80">
              {row.ranks.slice(0, 3).map((item, i) => (
                <li key={item.id} className="flex items-baseline justify-between gap-2">
                  <span><span className="mr-1.5 tabular text-muted">{num(i + 1, lang)}.</span>{item.name}</span>
                  <span className="shrink-0 tabular text-muted">{num(item.score, lang, { dp: 1 })}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
}
