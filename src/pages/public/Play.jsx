// "মাঠের লড়াই" — learn FieldShift 360 by playing one season as Rahim. Each chapter brings a real problem; the player
// answers with the old habit or with one of FieldShift's tools (হাতিয়ার) and sees what happens to crop, profit and water.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, TrendingDown, ScanLine, Droplets, CloudSun, LifeBuoy, History, Coins, Swords, Star, RotateCcw, ArrowRight, Check, X, Sparkles, ExternalLink, Lightbulb, Satellite, Trophy } from 'lucide-react';
import Photo from '../../components/Photo';
import { useStore, clim as godagariClim } from '../../store';
import { Tags } from '../../components/ui';
import { chapterFacts, seasonTotals } from '../../engine/play';
import { scrollToEl } from '../../components/Motion';
import { num } from '../../engine/dates';
import { START, WRONG_TOOL, TOOLS, SCENES } from '../../data/story';

const TOOL_ICON = { plan: Sprout, glut: TrendingDown, doctor: ScanLine, today: Droplets, weather: CloudSun, help: LifeBuoy };
const TOOL_TINT = {
  plan: 'from-primary-400 to-primary-700', glut: 'from-paddy-300 to-clay-500', doctor: 'from-violet-400 to-violet-700',
  today: 'from-sky-300 to-sky-700', weather: 'from-amber-300 to-orange-500', help: 'from-rose-400 to-red-600',
};
const clamp = (v) => Math.max(0, Math.min(100, v));
// Money in words a farmer reads at a glance: "−৬,০০০ টাকা" (৳ beside a Bangla digit is easy to misread as ৬).
const taka = (v, lang) => (lang === 'bn' ? `${v < 0 ? '−' : ''}${num(Math.abs(v), 'bn')} টাকা` : `${v < 0 ? '−' : ''}Tk ${num(Math.abs(v), 'en')}`);
const BEST = 'fs-play-best';
const readBest = () => { try { return JSON.parse(localStorage.getItem(BEST) || 'null'); } catch { return null; } };

export default function Play() {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const [phase, setPhase] = useState('start'); // start | play | end
  const [i, setI] = useState(0);
  const [stage, setStage] = useState('choose'); // choose | habit | win
  const [m, setM] = useState(START);
  const [delta, setDelta] = useState(null);
  const [shake, setShake] = useState(null);
  const [hint, setHint] = useState(null);
  const [tries, setTries] = useState([]); // per scene: 'first' | 'later' | 'habit'
  const [missed, setMissed] = useState(0);
  const top = useRef(null);
  const sc = SCENES[i];

  const apply = (fx) => {
    setM((p) => ({ crop: clamp(p.crop + (fx.crop || 0)), money: p.money + (fx.money || 0), water: clamp(p.water + (fx.water || 0)) }));
    setDelta({ ...fx, k: Date.now() });
  };
  const start = () => { setPhase('play'); setI(0); setStage('choose'); setM(START); setTries([]); setMissed(0); setHint(null); setDelta(null); };
  const pickHabit = () => { apply(sc.habit.fx); setTries((t) => [...t, 'habit']); setStage('habit'); setHint(null); };
  const pickTool = (k) => {
    if (k === sc.tool) {
      apply(sc.win.fx); setTries((t) => [...t, missed ? 'later' : 'first']); setStage('win'); setHint(null);
    } else {
      apply(WRONG_TOOL); setMissed((n) => n + 1); setShake(`${k}-${Date.now()}`); setHint(sc.hint);
    }
  };
  const next = () => {
    if (i + 1 >= SCENES.length) { setPhase('end'); return; }
    setI(i + 1); setStage('choose'); setMissed(0); setHint(null);
    scrollToEl(top.current, -112);
  };
  useEffect(() => { scrollToEl(top.current, -112); }, [phase]);

  return (
    <div className="page-shell pb-24 pt-[104px] sm:pt-[118px]" data-no-reveal>
      <div ref={top} className="scroll-mt-28" />
      {phase === 'start' && <StartScreen onStart={start} />}
      {phase === 'play' && (
        <div key="play" className="scene-in">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <MonthTrail i={i} tries={tries} />
            <Meters m={m} delta={delta} />
          </div>

          {/* The scene: photo, weather effect, and the problem told word by word. */}
          <section key={sc.id} className="scene-in relative mt-4 isolate overflow-hidden rounded-[30px] bg-primary-950 shadow-[var(--shadow-lift)]">
            <div className="absolute inset-0 -z-10">
              <div className="kenburns absolute inset-0" style={{ '--kb-from': 'scale(1.12)', '--kb-to': 'scale(1.02)' }}><Photo name={sc.photo} fill focus={sc.focus} sizes="(min-width: 1200px) 1200px, 100vw" decorative /></div>
              <SceneFx fx={sc.fx} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,14,.25)_0%,rgba(8,26,14,.35)_40%,rgba(8,26,14,.88)_100%)]" />
            </div>
            <div className="flex min-h-[380px] flex-col justify-end p-6 text-white sm:min-h-[440px] sm:p-10">
              <span className="glass-pill inline-flex w-fit items-center gap-2 rounded-full !bg-white/15 px-3.5 py-1.5 text-[13.5px] font-semibold !text-white">
                {T(`অধ্যায় ${num(i + 1, 'bn')} · ${sc.month.bn}`, `Chapter ${i + 1} · ${sc.month.en}`)}
              </span>
              <h1 className="mt-4 max-w-3xl text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[48px]"><Words text={L(sc.title)} /></h1>
              <p className="mt-3 max-w-2xl text-[17px] leading-[1.7] text-white/85 sm:text-[19px]"><Words text={L(sc.story)} delay={350} step={28} /></p>
            </div>
          </section>

          {stage === 'choose' && (
            <div key={`c-${i}`} className="scene-in mt-6">
              <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">{T('রহিম ভাই এখন কী করবেন?', 'What should Rahim do now?')}</p>
              <button type="button" onClick={pickHabit} className="lift glass flat mt-3 flex w-full items-center gap-4 rounded-[22px] p-4 text-left transition-all duration-200 hover:border-ink/20 hover:-translate-y-0.5 active:scale-[0.99]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink/[.07] text-ink/70"><History size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold uppercase tracking-wide text-muted">{T('আগের অভ্যাস', 'The old habit')}</span>
                  <span className="block text-[17px] font-semibold">{L(sc.habit.label)}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-muted" />
              </button>
              <div className="mt-6 flex items-center gap-2">
                <Swords size={18} className="text-primary-700" />
                <p className="text-[15px] font-semibold text-primary-800">{T('অথবা FieldShift-এর একটা হাতিয়ার বেছে নিন', 'Or pick one of FieldShift\'s tools')}</p>
              </div>
              {hint && (
                <p key={shake} className="hint-in mt-3 flex items-start gap-2 rounded-2xl bg-paddy-50/90 px-4 py-3 text-[14.5px] leading-6 text-paddy-700 ring-1 ring-paddy-300/50">
                  <Lightbulb size={18} className="mt-0.5 shrink-0" /><span><b>{T('এটা নয়।', 'Not this one.')}</b> {L(hint)}</span>
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                {Object.entries(TOOLS).map(([k, t], n) => (
                  <ToolCard key={k} id={k} tool={t} n={n} shaking={shake?.startsWith(`${k}-`) ? shake : null} onPick={() => pickTool(k)} />
                ))}
              </div>
            </div>
          )}

          {stage !== 'choose' && <Outcome key={`o-${i}`} sc={sc} stage={stage} last={i + 1 >= SCENES.length} onNext={next} />}
        </div>
      )}
      {phase === 'end' && <EndScreen m={m} tries={tries} onReplay={start} />}
    </div>
  );
}

// Text that arrives one word at a time, each word lifting out of a soft blur.
function Words({ text, delay = 0, step = 55 }) {
  const words = text.split(' ');
  return words.map((w, k) => (
    <span key={`${text}-${k}`}>
      <span className="word" style={{ '--wd': `${delay + k * step}ms` }}>{w}</span>{k < words.length - 1 ? ' ' : ''}
    </span>
  ));
}

// A number that rolls to its new value.
function useCountUp(value, ms = 900) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current, b = value, t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 4);
      setShown(Math.round(a + (b - a) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value, ms]);
  return shown;
}

function Meters({ m, delta }) {
  const { T, s } = useStore();
  const lang = s.lang;
  const crop = useCountUp(m.crop), money = useCountUp(m.money), water = useCountUp(m.water);
  const money$ = taka(money, lang);
  const items = [
    { k: 'crop', icon: Sprout, label: T('ফসল', 'Crop'), value: num(crop, lang), bar: crop, color: 'bg-primary-500' },
    { k: 'money', icon: Coins, label: T('লাভ', 'Profit'), value: money$, tone: m.money < 0 ? 'text-red-700' : 'text-primary-800' },
    { k: 'water', icon: Droplets, label: T('পানি', 'Water'), value: num(water, lang), bar: water, color: 'bg-sky-500' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:flex">
      {items.map((it) => {
        const d = delta?.[it.k];
        return (
          <div key={it.k} className="glass relative flex min-w-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 sm:min-w-[155px] border border-white/80 shadow-xs">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-100/80 text-primary-800 shadow-2xs">
              <it.icon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2"><span className="text-[12px] font-semibold text-muted">{it.label}</span><span className={`font-display text-[16px] font-bold tabular ${it.tone ?? ''}`}>{it.value}</span></div>
              {it.bar !== undefined && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.07]"><div className={`progress-sheen h-full rounded-full ${it.color} transition-[width] duration-700 ease-[var(--ease-spring)]`} style={{ width: `${it.bar}%` }} /></div>}
            </div>
            {d ? <span key={delta.k} className={`delta-float absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-sm ${d > 0 ? 'bg-primary-600' : 'bg-red-600'}`}>{d > 0 ? '+' : '−'}{num(Math.abs(d), lang)}{it.k === 'money' ? T(' টাকা', '') : ''}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function MonthTrail({ i, tries }) {
  const { L } = useStore();
  return (
    <ol className="glass flex items-center gap-1.5 overflow-x-auto rounded-full p-2 hide-scrollbar border border-white/70 shadow-xs">
      {SCENES.map((sc, k) => {
        const r = tries[k];
        return (
          <li key={sc.id} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-300 ${k === i ? 'bg-primary-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.3)] scale-105' : r ? 'text-ink/80 hover:bg-white/40' : 'text-ink/40'}`}>
            {r && k !== i && (r === 'habit' ? <X size={13} className="text-red-600" /> : <Check size={13} className="text-primary-600" />)}
            {L(sc.month)}
          </li>
        );
      })}
    </ol>
  );
}

function ToolCard({ id, tool, n, shaking, onPick }) {
  const { L } = useStore();
  const Icon = TOOL_ICON[id];
  return (
    <button key={shaking ?? id} type="button" onClick={onPick} style={{ '--n': n }}
      className={`tool-card glass flat group flex flex-col items-start gap-2.5 rounded-[22px] p-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl active:scale-95 border border-white/80 bg-white/85 hover:border-primary-300 cursor-pointer ${shaking ? 'tool-shake' : 'tool-deal'}`}>
      <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${TOOL_TINT[id]} text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_8px_18px_-8px_rgba(0,0,0,.45)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6`}><Icon size={22} /></span>
      <span className="font-display text-[16.5px] font-bold leading-snug text-ink group-hover:text-primary-800 transition-colors">{L(tool)}</span>
      <span className="hidden text-[13px] leading-5 text-muted sm:block">{L(tool.note)}</span>
    </button>
  );
}

function Outcome({ sc, stage, last, onNext }) {
  const { T, L } = useStore();
  const win = stage === 'win';
  const tool = TOOLS[sc.tool];
  const Icon = TOOL_ICON[sc.tool];
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]" aria-live="polite">
      {!win && (
        <div className="outcome-in glass rounded-[24px] !bg-red-50/80 p-5 ring-1 ring-red-200/70">
          <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-red-700"><History size={15} />{T('আগের অভ্যাসে যা হলো', 'What the old habit cost')}</p>
          <p className="mt-2 text-[17px] leading-[1.65] text-red-950"><Words text={L(sc.habit.result)} step={35} /></p>
        </div>
      )}
      <div className={`outcome-in relative overflow-hidden rounded-[24px] p-5 ${win ? 'glass win-glow lg:col-span-2' : 'glass'}`} style={{ animationDelay: win ? '0ms' : '450ms' }}>
        {win && <Confetti />}
        <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-primary-700">
          {win ? <><Sparkles size={15} />{T('ঠিক হাতিয়ার!', 'The right tool!')}</> : <><Lightbulb size={15} />{T('FieldShift থাকলে যা হতো', 'What FieldShift would have done')}</>}
        </p>
        <div className="mt-3 flex items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${TOOL_TINT[sc.tool]} text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4)] ${win ? 'pop-in' : ''}`}><Icon size={23} /></span>
          <div className="min-w-0">
            <p className="font-display text-[19px] font-semibold tracking-[-0.015em]">{L(tool)}</p>
            <p className="mt-1 text-[16.5px] leading-[1.7] text-ink/80"><Words text={L(sc.win.text)} delay={win ? 200 : 650} step={30} /></p>
            <Link to={tool.to} className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-700 underline-offset-4 hover:underline">{T('আসল অ্যাপে এই হাতিয়ারটা দেখুন', 'See this tool in the real app')}<ExternalLink size={14} /></Link>
          </div>
        </div>
      </div>
      <RealFact id={sc.id} />
      <div className="lg:col-span-2">
        <button type="button" onClick={onNext} className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white shadow-md active:scale-95 transition-all">
          {last ? T('মৌসুমের ফলাফল দেখুন', 'See the season result') : T('পরের মাসে চলুন', 'On to next month')}<ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// Weather and story effects drawn over each scene photo.
function SceneFx({ fx }) {
  const { T } = useStore();
  const rnd = useMemo(() => Array.from({ length: 70 }, (_, k) => ({ x: (k * 37.7) % 100, d: ((k * 13) % 10) / 10, t: 0.55 + ((k * 7) % 5) / 10, y: (k * 53.3) % 100 })), []);
  if (fx === 'rain') return (
    <div className="fx-rain absolute inset-0 overflow-hidden" aria-hidden="true">
      {rnd.map((r, k) => <span key={k} className="drop" style={{ left: `${r.x}%`, animationDelay: `${r.d}s`, animationDuration: `${r.t}s` }} />)}
      <span className="flash absolute inset-0" />
    </div>
  );
  if (fx === 'fog') return <div className="fx-fog absolute inset-0" aria-hidden="true"><span /><span /><span /></div>;
  if (fx === 'heat') return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="sun-pulse absolute -right-16 -top-16 h-72 w-72 rounded-full" />
      <span className="heat-wave absolute inset-x-0 bottom-0 h-1/2" />
    </div>
  );
  if (fx === 'bugs') return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {rnd.slice(0, 16).map((r, k) => <span key={k} className="bug" style={{ left: `${r.x}%`, top: `${20 + (r.y % 60)}%`, animationDelay: `${r.d * 3}s`, '--bx': `${(k % 2 ? 1 : -1) * (30 + (k * 11) % 60)}px`, '--by': `${(k % 3 ? -1 : 1) * (20 + (k * 7) % 40)}px` }} />)}
    </div>
  );
  if (fx === 'crash') return (
    <div className="absolute right-4 top-4 w-[min(260px,60%)] sm:right-8 sm:top-8" aria-hidden="true">
      <div className="glass rounded-2xl !bg-white/20 p-3 text-white">
        <svg viewBox="0 0 200 80" className="w-full overflow-visible">
          <path className="price-line" d="M0 60 C 30 52, 50 30, 80 24 S 120 18, 135 22 L 150 40 L 165 64 L 200 74" fill="none" stroke="#ff8a7a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="price-dot" cx="200" cy="74" r="4.5" fill="#ff8a7a" />
        </svg>
        <div className="mt-1 flex items-baseline justify-between text-[12px] font-semibold"><span className="opacity-80">{T('টমেটো, ৳/কেজি', 'Tomato, ৳/kg')}</span><span className="price-drop text-[18px]">৳{T('৫', '5')}</span></div>
      </div>
    </div>
  );
  // 'dry': the well's water level sinking.
  return (
    <div className="absolute right-5 top-5 sm:right-10 sm:top-8" aria-hidden="true">
      <div className="glass flex h-36 w-14 items-end overflow-hidden rounded-full !bg-white/20 p-1.5 sm:h-44 sm:w-16">
        <span className="well-water block w-full rounded-full bg-gradient-to-t from-sky-500 to-sky-300" />
      </div>
      <p className="mt-2 text-center text-[11.5px] font-semibold leading-tight text-white drop-shadow">{T('নলকূপের', 'Well')}<br />{T('পানি', 'water')}</p>
    </div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 30 }, (_, k) => ({ a: (k / 30) * 360 + (k % 3) * 7, r: 90 + (k * 23) % 120, c: ['#43863a', '#edc067', '#2f8a8f', '#d99a73', '#8dbe78'][k % 5], d: (k % 6) * 25 })), []);
  return (
    <span className="pointer-events-none absolute left-10 top-12" aria-hidden="true">
      {bits.map((b, k) => <i key={k} className="confetti" style={{ '--a': `${b.a}deg`, '--r': `${b.r}px`, background: b.c, animationDelay: `${b.d}ms` }} />)}
    </span>
  );
}

function StartScreen({ onStart }) {
  const { T, L } = useStore();
  const best = useMemo(readBest, []);
  return (
    <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <div className="hero-rise">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Swords size={15} />{T('খেলে শিখুন', 'Learn by playing')}</p>
        <h1 className="mt-5 text-[46px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[64px]">
          <span className="block">{T('মাঠের লড়াই', 'Field Fight')}</span>
          <span className="block bg-[linear-gradient(100deg,#245a28_0%,#43863a_45%,#237479_100%)] bg-clip-text pb-2 text-transparent">{T('এক মৌসুমের গল্প', 'One season\'s story')}</span>
        </h1>
        <p className="mt-4 max-w-[34rem] text-[18px] leading-[1.65] text-ink/70 sm:text-[20px]">
          {T('রহিম ভাইয়ের সঙ্গে একটা রবি মৌসুম পার করুন। প্রতি মাসে আসবে একটা সত্যিকারের সমস্যা — খরা, কুয়াশা, পোকা, দাম পড়া। আগের অভ্যাসে চলবেন, নাকি FieldShift-এর হাতিয়ার কাজে লাগাবেন?',
            'Live one Rabi season with Rahim. Every month brings a real problem — drought, fog, pests, a price crash. Will you follow the old habit, or reach for a FieldShift tool?')}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button type="button" onClick={onStart} className="btn-gloss inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[17px] font-semibold text-white"><Swords size={19} />{T('খেলা শুরু করুন', 'Start the game')}</button>
          <span className="text-[14px] text-muted">{T('৬টি অধ্যায় · প্রায় ৩ মিনিট', '6 chapters · about 3 minutes')}</span>
        </div>
        {best && <p className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-paddy-700"><Trophy size={16} />{T(`আপনার সেরা: ${num(best.stars, 'bn')}টি তারা, ${taka(best.money, 'bn')}`, `Your best: ${best.stars} star${best.stars === 1 ? '' : 's'}, ${taka(best.money, 'en')}`)}</p>}
      </div>
      {/* The six tools as a loose, slightly tilted hand of cards, each floating on its own rhythm. */}
      <div className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3" aria-hidden="true">
        {Object.entries(TOOLS).map(([k, t], n) => {
          const Icon = TOOL_ICON[k];
          return (
            <div key={k} className="hand-card" style={{ '--n': n, '--rot': `${[-4, 2.5, -1.5, 3.5, -3, 1.5][n]}deg` }}>
              <div className="glass rounded-[22px] p-4">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${TOOL_TINT[k]} text-white shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_8px_18px_-8px_rgba(0,0,0,.45)]`}><Icon size={21} /></span>
                <p className="mt-3 text-[15px] font-semibold leading-snug">{L(t)}</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted">{L(t.note)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* The season ahead: six months, six real problems, each met by one tool. */}
      <ol className="lg:col-span-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6" aria-label={T('মৌসুমের ছয় অধ্যায়', 'The six chapters of the season')}>
        {SCENES.map((sc, k) => {
          const Icon = TOOL_ICON[sc.tool];
          return (
            <li key={sc.id} className="hand-card relative isolate overflow-hidden rounded-[20px] bg-primary-950 p-3.5 text-white" style={{ '--n': k, '--rot': '0deg' }}>
              <div className="absolute inset-0 -z-10 opacity-60"><Photo name={sc.photo} fill focus={sc.focus} sizes="220px" decorative /></div>
              <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,26,14,.2),rgba(8,26,14,.88))]" />
              <span className="flex items-center justify-between text-[12px] font-semibold text-white/80">{T(`অধ্যায় ${num(k + 1, 'bn')}`, `Chapter ${k + 1}`)}<Icon size={15} className="text-paddy-300" /></span>
              <span className="mt-6 block text-[13px] font-semibold text-paddy-300">{L(sc.month)}</span>
              <span className="block text-[14.5px] font-bold leading-snug">{L(sc.title)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EndScreen({ m, tries, onReplay }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const first = tries.filter((t) => t === 'first').length;
  const stars = first >= 6 ? 3 : first >= 4 ? 2 : first >= 2 ? 1 : 0;
  const title = stars === 3 ? T('মাঠের চ্যাম্পিয়ন!', 'Field champion!') : stars === 2 ? T('দক্ষ কৃষক!', 'Skilled farmer!') : T('শিখছেন — আবার খেলুন', 'Still learning — play again');
  const money = taka(m.money, lang);
  // The same season played all on old habits, and all with the right tool first time.
  const paths = useMemo(() => [
    { k: 'habit', label: T('সব সময় আগের অভ্যাসে', 'Old habits all season'), v: seasonTotals(SCENES, START, SCENES.map(() => 'habit')).money, tone: 'bg-red-500' },
    { k: 'you', label: T('আপনি', 'You'), v: m.money, tone: 'bg-paddy-400' },
    { k: 'tool', label: T('প্রতিবার ঠিক হাতিয়ারে', 'The right tool every time'), v: seasonTotals(SCENES, START, SCENES.map(() => 'tool')).money, tone: 'bg-primary-600' },
  ], [T, m.money]);
  const span = Math.max(...paths.map((p) => Math.abs(p.v)), 1);
  useEffect(() => {
    const b = readBest();
    if (!b || stars > b.stars || (stars === b.stars && m.money > b.money)) { try { localStorage.setItem(BEST, JSON.stringify({ stars, money: m.money })); } catch { /* storage blocked */ } }
  }, [stars, m.money]);
  return (
    <section className="scene-in mx-auto max-w-3xl text-center">
      <div className="flex justify-center gap-3">
        {[0, 1, 2].map((k) => <Star key={k} size={54} className={`star-pop ${k < stars ? 'fill-paddy-300 text-paddy-500' : 'text-ink/15'}`} style={{ animationDelay: `${200 + k * 220}ms` }} />)}
      </div>
      <h1 className="mt-5 text-[40px] font-semibold tracking-[-0.03em] sm:text-[56px]"><Words text={title} delay={700} /></h1>
      <p className="mt-2 text-[18px] text-ink/70">{T(`৬টির মধ্যে ${num(first, 'bn')}টি সমস্যায় প্রথমবারেই ঠিক হাতিয়ার বেছেছেন।`, `You picked the right tool first time in ${first} of 6 problems.`)}</p>
      <div className="mt-7 grid grid-cols-3 gap-3">
        {[[Sprout, T('ফসলের স্বাস্থ্য', 'Crop health'), num(m.crop, lang)], [Coins, T('মৌসুমের লাভ', 'Season profit'), money], [Droplets, T('বাঁচানো পানি', 'Water kept'), num(m.water, lang)]].map(([Icon, l, v], k) => (
          <div key={l} className="outcome-in glass rounded-[22px] p-4" style={{ animationDelay: `${900 + k * 120}ms` }}>
            <Icon size={22} className="mx-auto text-primary-700" />
            <p className="font-display mt-2 text-[26px] font-semibold tabular">{v}</p>
            <p className="text-[13px] text-muted">{l}</p>
          </div>
        ))}
      </div>
      <div className="outcome-in glass mt-6 rounded-[24px] p-5 text-left" style={{ animationDelay: '1150ms' }}>
        <p className="text-[15px] font-bold">{T('একই মৌসুম, তিন রকম পথে: মৌসুমের লাভ', 'The same season, three ways: season profit')}</p>
        <div className="mt-3 space-y-2.5">
          {paths.map((p) => (
            <div key={p.k} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-[13.5px] sm:grid-cols-[11rem_1fr_7rem]">
              <span className={`truncate ${p.k === 'you' ? 'font-bold' : 'text-ink/75'}`}>{p.label}</span>
              <b className="tabular text-right sm:order-last">{taka(p.v, lang)}</b>
              <span className="relative col-span-2 h-4 rounded-full bg-black/[.04] sm:col-span-1">
                <span className="absolute left-1/2 top-0 h-4 w-px bg-black/20" aria-hidden="true" />
                <span className={`absolute top-0.5 h-3 rounded-full ${p.tone} transition-all duration-700`} style={{ [p.v < 0 ? 'right' : 'left']: '50%', width: `${(Math.abs(p.v) / span) * 50}%` }} aria-hidden="true" />
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-muted">{T('খেলার টাকা শেখানোর জন্য, আসল হিসাব নয়; শুধু দিক আর আন্দাজ বোঝায়।', 'Game money is for learning, not a real estimate; it shows the direction and rough size.')}</p>
      </div>
      <ol className="glass mt-6 divide-y divide-black/[.06] rounded-[24px] text-left">
        {SCENES.map((sc, k) => (
          <li key={sc.id} className="outcome-in flex items-center gap-3 px-5 py-3" style={{ animationDelay: `${1200 + k * 90}ms` }}>
            {tries[k] === 'habit' ? <X size={18} className="shrink-0 text-red-600" /> : <Check size={18} className="shrink-0 text-primary-600" />}
            <span className="min-w-0 flex-1"><span className="font-semibold">{L(sc.month)}:</span> {L(sc.title)}</span>
            <span className="hidden text-[13.5px] text-muted sm:inline">{L(TOOLS[sc.tool])}</span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/farmer/plan" className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white"><Sprout size={18} />{T('এবার আসল জমিতে চেষ্টা করুন', 'Now try it on a real field')}</Link>
        <button type="button" onClick={onReplay} className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold"><RotateCcw size={17} />{T('আবার খেলুন', 'Play again')}</button>
      </div>
    </section>
  );
}

// What is real behind the chapter: one number from Godagari's own NASA record, DAM prices or the officer's rule.
function RealFact({ id }) {
  const { T, s } = useStore();
  const f = useMemo(() => (godagariClim ? chapterFacts(godagariClim)[id] : null), [id]);
  if (!f) return null;
  const n = (v, o) => num(v, s.lang, o);
  const text = {
    choose: () => T(`নাসা POWER-এর গোদাগাড়ীর আবহাওয়ায় (FAO-56): বোরোতে লাগে প্রায় ${n(f.boro)} মিমি পানি, সরিষায় ${n(f.mustard)} মিমি, চার ভাগের এক ভাগের মতো। ১ নভেম্বর মানে ১৬ কার্তিক।`, `In Godagari’s NASA POWER weather (FAO-56): Boro needs about ${f.boro} mm of water, mustard ${f.mustard} mm, roughly a quarter. 1 November is 16 Kartik.`),
    glut: () => T(`কৃষি বিপণন অধিদপ্তরের দামে টমেটো ফেব্রুয়ারি-মার্চে বছরের স্বাভাবিকের প্রায় অর্ধেকে নামে, আর সবচেয়ে দামি মাসের চেয়ে ${n(f.ratio, { dp: 1 })} গুণ সস্তা।`, `In DAM prices, tomatoes fall to about half the year’s usual price in February–March, ${f.ratio.toFixed(1)} times cheaper than the dearest month.`),
    blight: () => T(`নাসা POWER: ২৫ বছরে গোদাগাড়ীর পৌষে সাধারণত ${n(f.coldNights)} রাত ১০° বা তার চেয়ে ঠান্ডা; ঠান্ডা, ভেজা ভোরে পাতার ছত্রাক-রোগ ছড়ায়।`, `NASA POWER: in 25 years Godagari’s Poush usually has ${f.coldNights} nights at 10° or colder; cold, damp mornings spread leaf fungus.`),
    dry: () => T(`নাসা POWER: ২৫ বছরের ${n(f.dryYears)} বছরে গোদাগাড়ীর মাঘে ৫ মিমি-র কম বৃষ্টি; সাধারণত টানা ${n(f.dryRun)} দিন এক ফোঁটাও না।`, `NASA POWER: in ${f.dryYears} of 25 years Godagari’s Magh had under 5 mm of rain; usually ${f.dryRun} days in a row without a drop.`),
    storm: () => T(`নাসা POWER: ২৫ বছরের ${n(f.wetYears)} বছরে গোদাগাড়ীর ফাল্গুনে অন্তত একদিন ৫ মিমি-র বেশি বৃষ্টি, ঠিক যখন সরিষা কাটার সময়।`, `NASA POWER: in ${f.wetYears} of 25 years Godagari’s Falgun had at least one day over 5 mm of rain, just when mustard is cut.`),
    pests: () => T(`নিয়ম: ${n(f.days)} দিনের মধ্যে ${n(f.km, { dp: 1 })} কিলোমিটারের ভেতরে ${n(f.reports)}টি একই রকম খবর এলে কর্মকর্তার পাতায় এলাকার সতর্কতা ওঠে।`, `The rule: ${f.reports} similar reports within ${f.km} km in ${f.days} days raise an area alert on the officer’s screen.`),
  }[id]?.();
  if (!text) return null;
  return (
    <div className="outcome-in glass flex items-start gap-3 rounded-[22px] p-4 lg:col-span-2" style={{ animationDelay: '700ms' }}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800"><Satellite size={19} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold uppercase tracking-wide text-sky-800">{T('এটা কি সত্যি? আসল তথ্য', 'Is this real? The real data')}</p><Tags list={[f.kind]} /></div>
        <p className="mt-1 text-[15px] leading-7 text-ink/85">{text}</p>
      </div>
    </div>
  );
}
