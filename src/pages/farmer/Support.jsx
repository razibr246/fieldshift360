// Government support for this farmer: input aid, credit, insurance, machines, the government paddy price, soil
// tests and advice, matched to the field's real size, this year's crops (the season plan's Rabi crop and the next
// one), its water source and its upazila. Each programme says why it fits or not, what to bring, where to go, its
// source and the day it was checked. A small question box searches the same list offline, and the page prints as a
// one-page sheet to carry to the union office. Matching: engine/support.js; programmes: data/support/bd_support.js.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HandCoins, Search, Printer, ExternalLink, FileText, MapPin, CheckCircle2, HelpCircle, XCircle, ArrowRight, Send, ListChecks } from 'lucide-react';
import { useStore } from '../../store';
import { PageHeader, Card, Note, Tags, Tag } from '../../components/ui';
import { IRRIGATION } from '../../engine/crops';
import { bnOf } from '../../engine/text';
import { num, fmtDate, parseISO } from '../../engine/dates';
import { supportProfile, matchSupport, askSupport, firstSteps, countFits, evalAsk, KINDS, STATUS, FIT } from '../../engine/support';
import { ASK_EVAL } from '../../data/support/ask_eval';
import { BD_SUPPORT, AREA_TYPE, CHECKED } from '../../data/support/bd_support';

const ASK_SCORE = evalAsk(ASK_EVAL, BD_SUPPORT); // measured once, on questions it was not tuned to
const AMAN = { id: 'aman', name: { bn: 'আমন ধান', en: 'Aman rice' } };
const FIT_STYLE = {
  yes: { icon: CheckCircle2, ring: 'ring-primary-200', chip: 'bg-primary-100 text-primary-800' },
  maybe: { icon: HelpCircle, ring: 'ring-amber-200', chip: 'bg-amber-100 text-amber-900' },
  no: { icon: XCircle, ring: 'ring-border', chip: 'bg-black/[.05] text-ink/70' },
};

function Programme({ m, onAsk }) {
  const { T, L, s } = useStore();
  const { p, fit, why } = m;
  const st = FIT_STYLE[fit];
  const I = st.icon;
  return (
    <article id={`sp-${p.id}`} className={`rounded-[20px] bg-white p-4 ring-1 ${st.ring} break-inside-avoid sm:p-5`}>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${st.chip}`}><I size={13} aria-hidden="true" />{L(FIT[fit])}</span>
        <span className="rounded-full bg-canvas px-2.5 py-1 text-ink/75">{L(KINDS[p.kind])}</span>
        {p.status !== 'running' && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">{L(STATUS[p.status])}</span>}
        <Tag t="RECORD" />
      </div>
      <h3 className="mt-2 text-[17px] font-bold leading-6 text-ink">{L(p.name)}</h3>
      <p className="text-[13px] text-muted">{L(p.by)}</p>
      <p className="mt-2 text-[14.5px] leading-7 text-ink/85">{L(p.benefit)}</p>
      <ul className="mt-2 space-y-1 text-[13.5px] leading-6">
        {why.map((w, i) => <li key={i} className="flex gap-1.5"><ArrowRight size={14} className="mt-1 shrink-0 text-primary-600" aria-hidden="true" /><span>{L(w)}</span></li>)}
      </ul>
      {p.note && <p className="mt-2 rounded-xl bg-amber-50/80 px-3 py-2 text-[13px] leading-6 text-amber-950">{L(p.note)}</p>}
      {fit !== 'no' && (
        <dl className="mt-3 grid gap-2 text-[13.5px] leading-6 sm:grid-cols-2">
          {p.docs.length > 0 && <div><dt className="flex items-center gap-1 font-semibold text-ink"><FileText size={14} aria-hidden="true" />{T('সঙ্গে নিন', 'Bring')}</dt><dd className="text-ink/80">{p.docs.map((d) => L(d)).join(' · ')}</dd></div>}
          <div><dt className="flex items-center gap-1 font-semibold text-ink"><MapPin size={14} aria-hidden="true" />{T('কোথায়', 'Where')}</dt><dd className="text-ink/80">{L(p.where)}</dd></div>
        </dl>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-muted">
        <a href={p.src} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary-700 hover:text-primary-900 sm:min-h-0">{T('উৎস', 'Source')}<ExternalLink size={12} aria-hidden="true" /></a>
        <span>{T('দেখা হয়েছে', 'Checked')} {fmtDate(parseISO(CHECKED), s.lang)}</span>
        {fit !== 'no' && <button type="button" onClick={() => onAsk(p)} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary-700 hover:text-primary-900 print:hidden sm:min-h-0"><Send size={12} aria-hidden="true" />{T('কর্মকর্তাকে জিজ্ঞেস করুন', 'Ask my officer')}</button>}
      </div>
    </article>
  );
}

export default function Support() {
  const { s, T, L, farmer, chosen, rotation, upazila } = useStore();
  const lang = s.lang;
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const crops = useMemo(() => [chosen.crop, rotation?.best?.crop, AMAN].filter(Boolean), [chosen.crop, rotation?.best?.crop]);
  const area = AREA_TYPE[upazila.id] ?? null;
  const prof = useMemo(() => supportProfile({ area_dec: farmer.area_dec, crops, irrigation: farmer.irrigation, area, district: upazila.district.en }), [farmer.area_dec, crops, farmer.irrigation, area, upazila.district.en]);
  const ms = useMemo(() => matchSupport(BD_SUPPORT, prof), [prof]);
  const c = countFits(ms);
  const first = firstSteps(ms);
  const hits = useMemo(() => askSupport(q, BD_SUPPORT), [q]);
  const ask = (p) => nav('/farmer/help', { state: { ask: T(`"${p.name.bn}" সম্পর্কে জানতে চাই: আমি কি পাব, কবে আর কোথায় আবেদন করব?`, `I would like to know about "${p.name.en}": do I qualify, and when and where do I apply?`) } });
  
  const filteredMs = useMemo(() => {
    if (cat === 'all') return ms;
    if (cat === 'input') return ms.filter((m) => m.p.kind === 'input');
    if (cat === 'credit') return ms.filter((m) => m.p.kind === 'credit' || m.p.kind === 'insurance');
    if (cat === 'machinery') return ms.filter((m) => m.p.kind === 'machinery' || m.p.kind === 'irrigation');
    if (cat === 'price') return ms.filter((m) => m.p.kind === 'price');
    if (cat === 'soil_advice') return ms.filter((m) => m.p.kind === 'soil' || m.p.kind === 'advice');
    if (cat === 'register') return ms.filter((m) => m.p.kind === 'register' || m.p.kind === 'cash');
    return ms;
  }, [ms, cat]);

  const group = (f) => filteredMs.filter((m) => m.fit === f);

  const categories = [
    { id: 'all', label: T('সব', 'All'), count: ms.length },
    { id: 'input', label: T('বীজ ও সার', 'Seed & fertiliser'), count: ms.filter((m) => m.p.kind === 'input').length },
    { id: 'credit', label: T('ঋণ ও বিমা', 'Credit & insurance'), count: ms.filter((m) => m.p.kind === 'credit' || m.p.kind === 'insurance').length },
    { id: 'machinery', label: T('যন্ত্রপাতি', 'Machinery'), count: ms.filter((m) => m.p.kind === 'machinery' || m.p.kind === 'irrigation').length },
    { id: 'price', label: T('ধানের সরকারি দাম', 'Crop price'), count: ms.filter((m) => m.p.kind === 'price').length },
    { id: 'soil_advice', label: T('মাটি ও পরামর্শ', 'Soil & advice'), count: ms.filter((m) => m.p.kind === 'soil' || m.p.kind === 'advice').length },
  ];

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={T('সরকারি সহায়তা', 'Government support')}
        title={T('আপনার জন্য কোন সহায়তা আছে', 'Support you can ask for')}
        subtitle={T('বীজ-সার, ঋণ, বিমা, যন্ত্র, ধানের সরকারি দাম আর মাটি পরীক্ষা—আপনার জমি, ফসল আর এলাকা মিলিয়ে বাছা। কে পাবেন তা শেষে ইউনিয়ন কমিটি বা ব্যাংক ঠিক করে।', 'Seed and fertiliser, credit, insurance, machines, the government paddy price and soil tests, matched to your field, crops and area. The union committee or the bank makes the final decision.')}
        tags={['RECORD', 'RULE']}
        action={<button type="button" onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-full bg-primary-700 px-5 text-[14.5px] font-semibold text-white hover:bg-primary-800"><Printer size={16} aria-hidden="true" />{T('প্রিন্ট বা PDF', 'Print or PDF')}</button>}
      />

      <div className="poster-sheet space-y-5">
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[16px] font-bold"><HandCoins size={18} className="text-primary-700" aria-hidden="true" />{T(`${bnOf(farmer.name.bn)} জন্য যা ধরা হয়েছে`, `What this is based on, for ${L(farmer.name)}`)}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-4">
            <div><dt className="text-[12.5px] text-muted">{T('জমি', 'Land')}</dt><dd className="font-semibold">{T(`${num(prof.dec, 'bn')} শতক · ${prof.holding.name.bn}`, `${prof.dec} decimals · ${prof.holding.name.en}`)}</dd></div>
            <div><dt className="text-[12.5px] text-muted">{T('এ বছরের ফসল', 'Crops this year')}</dt><dd className="font-semibold">{crops.map((x) => L(x.name)).join(', ')}</dd></div>
            <div><dt className="text-[12.5px] text-muted">{T('সেচ', 'Water')}</dt><dd className="font-semibold">{L(IRRIGATION[farmer.irrigation] ?? { bn: 'জানা নেই', en: 'Not known' })}</dd></div>
            <div><dt className="text-[12.5px] text-muted">{T('এলাকা', 'Area')}</dt><dd className="font-semibold">{L(upazila.name)}, {L(upazila.district)}</dd></div>
          </dl>
          <p className="mt-3 text-[13.5px] leading-6 text-ink/75">
            {T(`${num(BD_SUPPORT.length, 'bn')}টির মধ্যে ${num(c.yes, 'bn')}টি সম্ভবত পাবেন, ${num(c.maybe, 'bn')}টি জেনে দেখার মতো। ফসল বদলালে (মৌসুমের পরিকল্পনায়) এই তালিকাও বদলায়।`, `Of ${BD_SUPPORT.length}, ${c.yes} likely fit you and ${c.maybe} are worth asking about. Change the crop in the season plan and this list changes too.`)}
          </p>
        </Card>

        {first.length > 0 && (
          <Card className="p-4 sm:p-5">
            <h2 className="flex items-center gap-2 text-[16px] font-bold"><ListChecks size={18} className="text-primary-700" aria-hidden="true" />{T('প্রথমে এগুলো', 'Do these first')}</h2>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2">
              {first.map((p, i) => <li key={p.id} className="flex gap-2 rounded-xl bg-primary-50/70 p-3 text-[14px] leading-6"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-700 text-[12.5px] font-bold text-white">{num(i + 1, lang)}</span><span><b>{L(p.name)}</b> · {L(p.where)}</span></li>)}
            </ol>
            <p className="mt-2 text-[13px] text-muted">{T('অনেক সহায়তা এই দুটি ছাড়া মেলে না।', 'Much of the support below needs these two.')}</p>
          </Card>
        )}

        <Card className="p-4 sm:p-5 print:hidden">
          <label htmlFor="support-q" className="flex items-center gap-2 text-[16px] font-bold"><Search size={18} className="text-primary-700" aria-hidden="true" />{T('নিজের প্রশ্ন লিখুন', 'Type your own question')}</label>
          <input id="support-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('যেমন: সারের দাম, কম সুদের ঋণ, ধান বিক্রি', 'For example: fertiliser price, cheap loan, sell paddy')} className="mt-2 h-11 w-full rounded-xl border border-border bg-white px-3.5 text-[15px] outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/12" />
          {q.trim() && (
            <div className="mt-2" aria-live="polite">
              {hits.length ? (
                <ul className="space-y-1.5">
                  {hits.map(({ p }) => <li key={p.id}><a href={`#sp-${p.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sp-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-[14.5px] font-semibold text-primary-800 hover:bg-primary-50"><ArrowRight size={14} aria-hidden="true" />{L(p.name)}</a></li>)}
                </ul>
              ) : <p className="text-[14px] text-muted">{T('এই তালিকায় মিল পাওয়া গেল না। কৃষি কল সেন্টার ১৬১২৩-এ ফোন করুন, বা কর্মকর্তাকে জিজ্ঞেস করুন।', 'Nothing in this list matches. Call the Krishi Call Centre on 16123, or ask your officer.')}</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted"><Tags list={['RULE']} />{T(`শব্দ মিলিয়ে খোঁজা, ইন্টারনেট ছাড়াই। কৃষকের ভাষায় লেখা ${num(ASK_SCORE.n, 'bn')}টি প্রশ্নে পরীক্ষা: ${num(Math.round(ASK_SCORE.hit1 * ASK_SCORE.n), 'bn')}টিতে ঠিক উত্তর প্রথমে, ${num(Math.round(ASK_SCORE.hit3 * ASK_SCORE.n), 'bn')}টিতে প্রথম তিনের মধ্যে।`, `Word matching, works offline. Tested on ${ASK_SCORE.n} questions in farmers' words: right answer first in ${Math.round(ASK_SCORE.hit1 * ASK_SCORE.n)}, in the top three in ${Math.round(ASK_SCORE.hit3 * ASK_SCORE.n)}.`)}</p>
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-2 print:hidden" role="tablist" aria-label={T('সহায়তার ধরন ছাঁকা', 'Filter support category')}>
          {categories.map((cTab) => (
            <button
              key={cTab.id}
              type="button"
              role="tab"
              aria-selected={cat === cTab.id}
              onClick={() => setCat(cTab.id)}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-95 ${
                cat === cTab.id
                  ? 'bg-primary-700 text-white shadow-sm ring-2 ring-primary-700/20'
                  : 'border border-border bg-white text-ink/75 hover:border-primary-300 hover:bg-canvas'
              }`}
            >
              <span>{cTab.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[11px] font-bold ${cat === cTab.id ? 'bg-white/25 text-white' : 'bg-black/5 text-muted'}`}>
                {num(cTab.count, lang)}
              </span>
            </button>
          ))}
        </div>

        {['yes', 'maybe'].map((f) => group(f).length > 0 && (
          <section key={f} aria-labelledby={`sp-h-${f}`}>
            <h2 id={`sp-h-${f}`} className="mb-2.5 text-[18px] font-bold">{f === 'yes' ? T('সম্ভবত আপনার জন্য', 'Likely for you') : T('জেনে দেখার মতো', 'Worth asking about')} <span className="text-muted">({num(group(f).length, lang)})</span></h2>
            <div className="grid gap-3 lg:grid-cols-2">{group(f).map((m) => <Programme key={m.p.id} m={m} onAsk={ask} />)}</div>
          </section>
        ))}

        {group('no').length > 0 && (
          <details className="rounded-[20px] bg-white/70 p-4 ring-1 ring-border print:hidden">
            <summary className="min-h-[44px] cursor-pointer content-center text-[15px] font-semibold">{T(`এখন খাটে না (${num(group('no').length, 'bn')}টি), কেন তা দেখুন`, `Not for you now (${group('no').length}), and why`)}</summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">{group('no').map((m) => <Programme key={m.p.id} m={m} onAsk={ask} />)}</div>
          </details>
        )}

        <Note tone="gold">
          {T(`এটি সরকারি ঘোষণা আর খবর থেকে ${fmtDate(parseISO(CHECKED), 'bn')} তারিখে তৈরি তালিকা, নিশ্চয়তা নয়। দাম, তারিখ আর নিয়ম মৌসুমে মৌসুমে বদলায়; আবেদনের আগে ইউনিয়নের কৃষি কর্মকর্তা বা ব্যাংকে জেনে নিন।`, `This list was made on ${fmtDate(parseISO(CHECKED), 'en')} from government notices and news; it is not a promise. Prices, dates and rules change each season, so check with the union agriculture officer or the bank before you apply.`)}
        </Note>
      </div>
    </div>
  );
}
