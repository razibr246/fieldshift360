// Season planner step 4: what matters most to the farmer. Each choice shows, before it is picked, which crop it would
// put first; below, every crop's real numbers side by side (water from FAO-56 on local weather, value from FAOSTAT
// yields and DAM prices, fertiliser from SRDI, weather safety from 25 NASA seasons), re-ordered live as the weights change.
import { useLayoutEffect, useRef } from 'react';
import { Droplets, Coins, Shield, Sprout, Timer, ExternalLink, CheckCircle2, Beef, Layers, Ban } from 'lucide-react';
import { useStore } from '../../../store';
import { StepHeader, Card, MiniBar, ScoreRing, Tags, RISK_STYLE } from '../../../components/ui';
import { PRIORITIES, weightsFor } from '../../../engine/decision.js';
import { WATER_SOURCES } from '../../../engine/cropwater.js';
import { ECON_SOURCES } from '../../../engine/economics.js';
import { num, fmtDate } from '../../../engine/dates.js';
import { cropName } from '../../../engine/crops.js';
import cropEconomics from '../../../data/market/crop_economics.json';

const ICONS = { droplets: Droplets, coins: Coins, shield: Shield, sprout: Sprout, timer: Timer, cow: Beef, layers: Layers };
export const W_LABEL = { C: { bn: 'আবহাওয়ার ঝুঁকি', en: 'Weather safety' }, W: { bn: 'সেচের পানি', en: 'Water' }, S: { bn: 'মাটির সঙ্গে মিল', en: 'Soil match' }, P: { bn: 'ফসলের দাম', en: 'Harvest value' }, R: { bn: 'ফসলচক্র', en: 'Rotation' }, G: { bn: 'দাম পড়ার ঝুঁকি', en: 'Price-drop risk' }, E: { bn: 'আগাম ফসল', en: 'Early harvest' } };
// Which measures each choice leans on (highlighted in the comparison).
const LEANS = { water: ['water'], income: ['value', 'fert'], risk: ['safe', 'glut'], soil: ['soil'], early: ['harvest'] };

// Rows slide to their new place instead of jumping (FLIP: measure, invert, play).
function useFlip(keys) {
  const refs = useRef(new Map()), prev = useRef(new Map());
  useLayoutEffect(() => {
    const now = new Map();
    for (const [k, el] of refs.current) if (el) now.set(k, el.getBoundingClientRect().top);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const [k, top] of now) {
        const before = prev.current.get(k), el = refs.current.get(k);
        if (before == null || !el || Math.abs(before - top) < 1) continue;
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' });
      }
    }
    prev.current = now;
  }, [keys.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  return (k) => (el) => refs.current.set(k, el);
}

export default function StepPriorities() {
  const { s, dispatch, T, L, decision } = useStore();
  const lang = s.lang;
  const w = weightsFor(s.priorities);
  // What each choice would put first, given what is already picked (two at most, the newest replaces the oldest).
  const rows = decision.options;
  const by = (f, dir = 1) => [...rows].filter((o) => f(o) != null).sort((a, b) => dir * (f(a) - f(b)))[0];
  const best = {
    water: (() => { const o = by((x) => x.water?.mm); return o && { o, v: T(`${num(o.water.mm, 'bn')} মিমি পানি`, `${o.water.mm} mm of water`) }; })(),
    income: (() => { const o = by((x) => x.money?.net, -1); return o && { o, v: T(`লাভ ৳${num(o.money.net, 'bn')}/বিঘা`, `profit ৳${num(o.money.net, 'en')}/bigha`) }; })(),
    risk: (() => { const o = by((x) => x.bt.now.safe / Math.max(1, x.bt.now.n), -1); return o && { o, v: T(`${num(o.bt.now.n, 'bn')}টির মধ্যে ${num(o.bt.now.safe, 'bn')}টি মৌসুম ঠিকঠাক`, `${o.bt.now.safe} of ${o.bt.now.n} seasons fine`) }; })(),
    soil: (() => { const o = by((x) => x.comp.S + x.comp.R, -1); return o && { o, v: o.crop.legume ? T('ডাল, মাটিতে নাইট্রোজেন দেয়', 'a pulse: adds nitrogen') : T('মাটি আর ফসলচক্রে সবচেয়ে মানানসই', 'best fit for soil and rotation') }; })(),
    early: (() => { const o = by((x) => x.hw.start); return o && { o, v: T(`কাটা শুরু ${fmtDate(o.hw.start, 'bn')}`, `harvest from ${fmtDate(o.hw.start, 'en')}`) }; })(),
  };
  const flip = useFlip(rows.map((o) => o.crop.id));
  const lean = new Set(s.priorities.flatMap((p) => LEANS[p]));
  const hl = (k) => (lean.has(k) ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-canvas');
  const hl2 = (a, b) => (lean.has(a) || lean.has(b) ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-canvas');
  const maxVal = Math.max(1, ...rows.map((o) => o.money?.net ?? 0));
  const maxMm = Math.max(...rows.map((o) => o.water?.mm ?? 0));

  return (
    <div>
      <StepHeader kicker={T('ধাপ ৪, আপনার চাওয়া', 'Step 4, what matters')} title={T('এই মৌসুমে আপনার কাছে কোনটা বড়?', 'What matters most to you this season?')}
        sub={T('দুটো পর্যন্ত বেছে নিন। প্রতিটি কার্ডে লেখা আছে বাছলে কোন ফসল এগিয়ে যাবে; নিচের তালিকা সঙ্গে সঙ্গে নতুন করে সাজবে।', 'Pick up to two. Each card shows which crop it would put first; the list below re-orders straight away.')} tags={['REAL', 'RULE']} />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {Object.entries(PRIORITIES).map(([id, p]) => {
          const on = s.priorities.includes(id);
          const Icon = ICONS[p.icon];
          const top = best[id];
          return (
            <button key={id} type="button" onClick={() => dispatch({ type: 'togglePriority', id })} aria-pressed={on}
              className={`lift group flex flex-col rounded-2xl border p-3 text-left transition-colors duration-300 ${on ? 'border-primary-700 bg-primary-700 text-white shadow-[var(--shadow-card)]' : 'border-border bg-white hover:border-primary-300'}`}>
              <div className="flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${on ? 'bg-white/15' : 'bg-primary-50 text-primary-700'}`}>{Icon && <Icon size={19} />}</span>
                {on && <CheckCircle2 size={18} className="text-white/90" />}
              </div>
              <div className="font-display mt-2 text-[16px] font-bold leading-tight">{L(p)}</div>
              <div className={`mt-0.5 text-[12.5px] leading-snug ${on ? 'text-white/80' : 'text-muted'}`}>{L(p.hint)}</div>
              {top && (
                <div className={`mt-auto rounded-xl px-2.5 py-1.5 text-[12px] leading-snug ${on ? 'bg-white/12 text-white' : 'bg-canvas text-ink/80'}`} style={{ marginTop: 10 }}>
                  <span className={on ? 'text-white/70' : 'text-muted'}>{T('এই দিকে সেরা', 'Best on this')}: </span>
                  <b>{L(top.o.crop.name)}</b><span className="block">{top.v}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* The farmer's constraints: crops they cannot grow, whatever the numbers say. */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-4">
        <h3 className="flex items-center gap-2 text-[15.5px] font-bold"><Ban size={17} className="text-red-700" />{T('যে ফসল আপনার পক্ষে সম্ভব নয়', 'Crops you cannot grow')}</h3>
        <p className="mt-0.5 text-[13px] leading-5 text-muted">{T('কাছে বাজার নেই, যন্ত্র নেই, বীজ পাওয়া যায় না বা শ্রমিক নেই: চেপে বাদ দিন। এই মৌসুমের পরামর্শ আর জমির ভবিষ্যতের সেরা ফসলচক্র এগুলো ছাড়াই বাছবে।', 'No market nearby, no machine, no seed or no labour: tap to leave them out. This season’s advice and Field Future’s best rotation will be chosen without them.')}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {['boro', 'wheat', 'lentil', 'mustard', 'tomato', 'mungbean', 'sesame', 'jute', 'aus'].map((id) => {
            const off = (s.exclude ?? []).includes(id);
            return (
              <button key={id} type="button" onClick={() => dispatch({ type: 'toggleExclude', id })} aria-pressed={off}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition ${off ? 'border-red-300 bg-red-50 text-red-800 line-through decoration-2' : 'border-border bg-canvas text-ink/80 hover:border-primary-300'}`}>
                {off && <Ban size={14} />}{cropName(id, lang)}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[17px] font-bold">{T('আপনার জমিতে ফসলগুলো, পাশাপাশি', 'The crops on your land, side by side')}</h3>
          <span className="text-[12.5px] text-muted">{T('হলুদ ঘর: আপনার বাছাইয়ে যেগুলোর ওজন বেশি', 'Yellow: what your choices weigh most')}</span>
        </div>
        <ol className="mt-3 space-y-2.5">
          {rows.map((o, i) => (
            <li key={o.crop.id} ref={flip(o.crop.id)} className={`rounded-2xl border p-3 ${i === 0 ? 'border-primary-300 bg-primary-50/50' : 'border-border bg-white'}`}>
              <div className="flex items-center gap-3">
                <span className="font-display w-5 text-center text-[15px] font-bold text-muted">{num(i + 1, lang)}</span>
                <ScoreRing value={o.score} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[17px] font-bold leading-tight">{L(o.crop.name)}</div>
                  <div className="text-[12.5px] text-muted">{L(o.crop.action)} {fmtDate(o.t0, lang)} · {T('কাটা শুরু', 'harvest from')} {fmtDate(o.hw.start, lang)}</div>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[12.5px] sm:grid-cols-5">
                <Cell cls={hl('water')} k={T('পানি লাগবে', 'Water needed')} v={o.water ? `${num(o.water.mm, lang)} ${T('মিমি', 'mm')}` : '–'}>
                  {o.water && <MiniBar value={(o.water.mm / maxMm) * 100} color="bg-sky-500" className="mt-1" />}
                </Cell>
                <Cell cls={hl('safe')} k={T('আবহাওয়ায় ঠিকঠাক', 'Weather went fine')} v={T(`${num(o.bt.now.safe, 'bn')}/${num(o.bt.now.n, 'bn')} মৌসুম`, `${o.bt.now.safe}/${o.bt.now.n} seasons`)} />
                <Cell cls={hl('value')} k={T('লাভ/বিঘা', 'Profit/bigha')} v={o.money ? `৳${num(o.money.net, lang)}` : '–'}
                  sub={o.money && T(`বিক্রি ৳${num(o.money.value, 'bn')} − খরচ ৳${num(o.money.cost, 'bn')}`, `sale ৳${num(o.money.value, 'en')} − cost ৳${num(o.money.cost, 'en')}`)}>
                  {o.money && <MiniBar value={Math.max(2, (o.money.net / maxVal) * 100)} color={o.money.net < 0 ? 'bg-red-500' : 'bg-primary-500'} className="mt-1" />}
                </Cell>
                <Cell cls={hl('fert')} k={T('সার/বিঘা (SRDI)', 'Fertiliser/bigha (SRDI)')} v={o.money?.fert != null ? `৳${num(o.money.fert, lang)}` : '–'} sub={T('খরচের ভেতরেই ধরা', 'already in the cost')} />
                <Cell cls={hl2('soil', 'glut')} k={T('মাটি · দাম পড়া', 'Soil · price drop')} v={<span className="inline-flex items-center gap-1">{num(o.comp.S, lang)} · <span className={`chip ${RISK_STYLE[o.glut.level].cls}`}>{L(RISK_STYLE[o.glut.level])}</span></span>} />
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12.5px] leading-5 text-muted">{T('লাভ = FAOSTAT-এর দেশের গড় ফলন × (কেজিপ্রতি দাম − কেজিপ্রতি সব খরচ)। দাম ও খরচ সরকারি সংগ্রহ মূল্য, কৃষি বিপণন অধিদপ্তর, মন্ত্রণালয় আর মাঠ গবেষণা থেকে; প্রতিটির বছর আলাদা, নিচে লেখা আছে। খরচে বীজ, চাষ, শ্রম, সার, সেচ সব আছে। পানি = FAO-র ফসল-সহগ × এই এলাকার ১৩ মৌসুমের বাষ্পীভবন − কাজে লাগা বৃষ্টি (ধানে জমি কাদা করার ২০০ মিমি সহ)। দাম পড়ার ঝুঁকি পাশের নমুনা কৃষকদের পরিকল্পনা থেকে।', 'Profit = FAOSTAT national average yield × (price per kg − full cost per kg). Prices and costs come from government procurement prices, DAM, the ministries and field studies, each from its own year (listed below). The cost covers seed, ploughing, labour, fertiliser and irrigation. Water = FAO crop coefficients × 13 seasons of local evaporation − usable rain (plus 200 mm to puddle rice). Price-drop risk comes from the sample neighbours’ plans.')} <Tags list={['DEMO']} /></p>
        <ul className="mt-2 grid gap-x-4 gap-y-0.5 text-[12px] leading-5 text-muted sm:grid-cols-2">
          {Object.entries(cropEconomics.crops).map(([id, c]) => (
            <li key={id}><b className="text-ink/70">{cropName(id, lang)}</b>: {T('দাম', 'price')} ৳{num(c.price.tk, lang, { dp: 2 })} (<a href={c.price.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">{L(c.price.what)}</a>), {T('খরচ', 'cost')} ৳{num(c.cost.tk, lang, { dp: 2 })} (<a href={c.cost.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2">{L(c.cost.what)}</a>)</li>
          ))}
        </ul>
        <div className="mt-2 text-[12px] leading-5 text-muted">
          {[...ECON_SOURCES, ...WATER_SOURCES].map((src, i) => <span key={src.url}>{i > 0 && ' · '}<a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-primary-700">{src.label}<ExternalLink size={10} /></a></span>)}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <div className="mb-2 text-[15px] font-semibold">{T('হিসাবে কোন বিষয়ের কতটা ওজন', 'How much each factor counts')}</div>
        <div className="space-y-2">
          {Object.entries(w).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_1fr_44px] items-center gap-2 text-[13.5px]">
              <span className="text-ink/75">{L(W_LABEL[k])}</span>
              <MiniBar value={v * 250} />
              <span className="text-right font-semibold tabular">{num(v * 100, lang)}%</span>
            </div>
          ))}
        </div>
      </Card>
      <p className="mt-3 text-[13px] text-muted">{T('পরের ধাপে গিয়ে এখানে ফিরে চাওয়া বদলালে সুপারিশ সঙ্গে সঙ্গে বদলে যাবে।', 'Come back and change these any time — the recommendation updates straight away.')}</p>
    </div>
  );
}

const Cell = ({ k, v, sub, cls, children }) => (
  <div className={`rounded-lg px-2.5 py-1.5 transition-colors duration-300 ${cls}`}>
    <div className="text-[11.5px] text-muted">{k}</div>
    <div className="font-semibold tabular">{v}</div>
    {sub && <div className="text-[11px] leading-4 text-muted">{sub}</div>}
    {children}
  </div>
);
