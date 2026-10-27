// The farmer's complete guided tour (steps in src/data/farmer_tour.js): it opens each page of the farmer section in
// turn, lights up one part at a time with a soft window over the dimmed page (clicks still pass through, so the farmer
// can try things as they go) and says what it is, how it helps and what to try. A chapter list jumps anywhere; → ←
// and Esc work from the keyboard. Start it with startFarmerTour() (the compass button in the farmer header) or from
// the invitation on the farmer's home page the first time. Where it was is kept in this browser.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronDown, Compass, HeartHandshake, MousePointerClick, X } from 'lucide-react';
import { useStore } from '../store';
import { num } from '../engine/dates';
import { FARMER_TOUR as STEPS, FARMER_CHAPTERS as CHAPTERS } from '../data/farmer_tour';
import { TourModePicker, TourPlayback, QUICK_TOUR_STEP_SECONDS, TOUR_STEP_SECONDS } from './TourPlayback';

const KEY = 'fs-farmer-tour';
const SEEN = 'fs-farmer-tour-seen';
export const startFarmerTour = (at = 0) => window.dispatchEvent(new CustomEvent('fs-farmer-tour', { detail: at }));

const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && getComputedStyle(el).visibility !== 'hidden'; };
function findTarget(at) {
  if (!at) return null;
  const byId = document.getElementById(at);
  if (byId && visible(byId)) return byId;
  return [...document.querySelectorAll(`[data-tour="${at}"]`)].find(visible) ?? null;
}
const chapterOf = (k) => CHAPTERS.findIndex((c) => c.key === STEPS[k].chapter);
const firstOf = (key) => STEPS.findIndex((x) => x.chapter === key);
const QUICK_STEPS = ['home', 'farm', 'plan', 'today', 'harvest'].map((chapter) => STEPS.findIndex((step) => step.chapter === chapter));

export default function FarmerTour() {
  const { s, T, L, dispatch, farmer } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [k, setK] = useState(() => { try { const v = localStorage.getItem(KEY); return v == null ? null : Math.min(+v, STEPS.length - 1); } catch { return null; } });
  const [rect, setRect] = useState(null);
  const [menu, setMenu] = useState(false);
  const [invite, setInvite] = useState(() => { try { return !localStorage.getItem(SEEN); } catch { return false; } });
  const [chooser, setChooser] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const target = useRef(null);
  const panel = useRef(null);

  const set = useCallback((n) => {
    setK(n); setMenu(false); setInvite(false);
    try { if (n == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(n)); localStorage.setItem(SEEN, '1'); } catch { /* storage blocked */ }
  }, []);
  useEffect(() => {
    const on = () => {
      set(null);
      setChooser(true);
    };
    window.addEventListener('fs-farmer-tour', on);
    return () => window.removeEventListener('fs-farmer-tour', on);
  }, [set]);
  const startTour = (mode) => {
    setChooser(false);
    setAutoMode(mode !== 'manual');
    setQuickMode(mode === 'quick');
    setPaused(false);
    setCompleted(false);
    setElapsed(0);
    set(mode === 'quick' ? QUICK_STEPS[0] : 0);
  };
  const closeTour = () => {
    setChooser(false);
    setAutoMode(false);
    setQuickMode(false);
    setPaused(false);
    setCompleted(false);
    set(null);
  };

  useEffect(() => {
    if (k == null || !autoMode || paused || completed) return undefined;
    const steps = quickMode ? QUICK_STEPS : STEPS.map((_, index) => index);
    const position = steps.indexOf(k);
    const timer = setTimeout(() => {
      if (position >= steps.length - 1) setCompleted(true);
      else set(steps[position + 1]);
    }, (quickMode ? QUICK_TOUR_STEP_SECONDS : TOUR_STEP_SECONDS) * 1000);
    return () => clearTimeout(timer);
  }, [k, autoMode, quickMode, paused, completed, set]);
  useEffect(() => {
    if (k == null || !autoMode || paused || completed) return undefined;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [k, autoMode, paused, completed]);

  const step = k == null ? null : STEPS[k];

  // Open the step's page (and the planner's step), then find its part, bring it into view and keep the window on it.
  useEffect(() => {
    if (!step) return;
    if (step.step != null && s.step !== step.step) dispatch({ type: 'set', patch: { step: step.step } });
    if (pathname !== step.path) navigate(step.path);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    target.current = null; setRect(null);
    if (!step || pathname !== step.path || !step.at) return undefined;
    let tries = 0, aimed = 0, t = 0;
    const aim = () => {
      const el = findTarget(step.at);
      if (!el) { if (++tries < 16) t = setTimeout(aim, 350); return; }
      target.current = el;
      // Above the panel and below the header: centre a short part there, put the top of a tall one just under the header.
      const r = el.getBoundingClientRect();
      const head = window.innerWidth >= 1024 ? 128 : 76;
      // the panel sits under the part on a phone, beside it at the bottom right on a wide screen
      const room = window.innerHeight - head - (window.innerWidth >= 1024 ? 0 : (panel.current?.offsetHeight ?? 220)) - 24;
      const want = r.height < room ? head + (room - r.height) / 2 : head;
      const dy = r.top - want;
      if (Math.abs(dy) > 12) window.scrollTo({ top: window.scrollY + dy, behavior: 'smooth' });
      // parts further up may still mount (LazyMount) and push it down: look again after the glide
      if (Math.abs(dy) > 12 && ++aimed < 4) t = setTimeout(aim, 900);
    };
    t = setTimeout(aim, 450);
    return () => clearTimeout(t);
  }, [step, pathname]);
  useLayoutEffect(() => {
    if (!step) return undefined;
    let raf = 0;
    const place = () => {
      const el = target.current;
      if (!el || !el.isConnected) { setRect((p) => (p ? null : p)); return; }
      const r = el.getBoundingClientRect(), pad = 8;
      const top = Math.max(4, r.top - pad), bottom = Math.min(window.innerHeight - 4, r.bottom + pad);
      const next = { top, left: Math.max(4, r.left - pad), width: Math.min(window.innerWidth - 8, r.width + pad * 2), height: Math.max(0, bottom - top) };
      setRect((p) => (p && Math.abs(p.top - next.top) < 1 && Math.abs(p.left - next.left) < 1 && Math.abs(p.width - next.width) < 1 && Math.abs(p.height - next.height) < 1 ? p : next));
    };
    const loop = () => { place(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // keyboard: → next, ← back, Esc closes (not while typing)
  useEffect(() => {
    if (!step) return undefined;
    const on = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'Escape') { if (menu) setMenu(false); else closeTour(); }
      else if (e.key === 'ArrowRight') changeStep(1);
      else if (e.key === 'ArrowLeft') changeStep(-1);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [step, k, menu, set]);

  const home = pathname === '/farmer';
  const sequence = quickMode ? QUICK_STEPS : STEPS.map((_, index) => index);
  const sequencePosition = Math.max(0, sequence.indexOf(k));
  const changeStep = (direction) => {
    const nextPosition = sequencePosition + direction;
    if (nextPosition < 0) return;
    if (nextPosition >= sequence.length) { setCompleted(true); return; }
    set(sequence[nextPosition]);
  };
  const selectChapter = (chapter) => {
    setQuickMode(false);
    setAutoMode(false);
    set(firstOf(chapter));
  };
  if (!step) {
    if (!chooser && (!invite || !home)) return null;
    return <TourModePicker T={T} title={T(`${farmer.name.bn}, কৃষক অংশের গাইড`, `${farmer.name.en}, farmer section guide`)}
      steps={STEPS.length} quickSteps={QUICK_STEPS.length} onStart={startTour} onClose={closeTour} />;
  }

  const ch = chapterOf(k);
  const inCh = STEPS.filter((x) => x.chapter === step.chapter);
  const at = inCh.indexOf(step);
  const n = (v) => num(v, s.lang);
  return (
    <>
      {rect && <div aria-hidden="true" className="pointer-events-none fixed z-[55] rounded-[18px] transition-[top,left,width,height] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none"
        style={{ ...rect, boxShadow: '0 0 0 9999px rgba(13,38,20,.42), 0 0 0 2px rgba(237,192,103,.95), 0 0 28px 6px rgba(141,190,88,.55)' }} />}
      <aside ref={panel} role="dialog" aria-label={T('অ্যাপের সফর', 'App tour')} aria-live="polite"
        className="fixed inset-x-3 bottom-[88px] z-[60] mx-auto flex max-h-[min(52vh,460px)] max-w-[580px] flex-col rounded-[22px] border border-black/10 bg-white/95 shadow-[0_18px_44px_-14px_rgba(0,0,0,.5)] backdrop-blur lg:bottom-5 lg:left-auto lg:right-5 lg:mx-0 lg:w-[430px] lg:max-h-[min(60vh,520px)]">
        <div className="flex items-center gap-2 border-b border-black/[.06] px-4 pb-2 pt-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-700 text-white"><Compass size={17} /></span>
          <div className="relative min-w-0 flex-1">
            <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu"
              className="flex max-w-full items-center gap-1 rounded-lg px-1.5 py-0.5 text-left hover:bg-black/5">
              <span className="truncate text-[12.5px] font-bold uppercase tracking-[.08em] text-primary-700">{T(`অধ্যায় ${n(ch + 1)}/${n(CHAPTERS.length)} · ${CHAPTERS[ch].bn}`, `Chapter ${ch + 1}/${CHAPTERS.length} · ${CHAPTERS[ch].en}`)}</span>
              <ChevronDown size={15} className={`shrink-0 text-primary-700 transition-transform ${menu ? 'rotate-180' : ''}`} />
            </button>
            {menu && (
              <ol role="menu" className="menu-pop absolute bottom-full left-0 z-10 mb-2 max-h-[50vh] w-[270px] overflow-y-auto rounded-2xl border border-border bg-white p-1.5 shadow-[var(--shadow-lift)]">
                {CHAPTERS.map((c, i) => (
                  <li key={c.key}><button type="button" role="menuitem" onClick={() => selectChapter(c.key)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] font-semibold ${i === ch ? 'bg-primary-50 text-primary-800' : 'text-ink/80 hover:bg-black/5'}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold ${i < ch ? 'bg-primary-600 text-white' : i === ch ? 'bg-primary-800 text-white' : 'bg-black/[.06] text-ink/60'}`}>{n(i + 1)}</span>{L(c)}
                  </button></li>
                ))}
              </ol>
            )}
          </div>
          <span className="shrink-0 text-[12px] font-semibold tabular text-muted">{n(sequencePosition + 1)}/{n(sequence.length)}</span>
          <button type="button" onClick={closeTour} aria-label={T('সফর বন্ধ করুন', 'Close the tour')} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
        </div>
        {autoMode && <TourPlayback T={T} lang={s.lang} mode={quickMode ? 'quick' : 'auto'} step={sequencePosition + 1} total={sequence.length} elapsed={elapsed} paused={paused} complete={completed} onToggle={() => setPaused((value) => !value)} />}
        <div className="h-1 bg-black/[.05]" aria-hidden="true"><div className="h-full bg-gradient-to-r from-primary-500 to-paddy-400 transition-[width] duration-500" style={{ width: `${((sequencePosition + 1) / sequence.length) * 100}%` }} /></div>

        <div key={k} className="swap-in min-h-0 overflow-y-auto px-4 py-3">
          <p className="text-[17px] font-bold leading-snug">{L(step.title)}</p>
          <p className="mt-1.5 text-[14px] leading-6 text-ink/80">{L(step.say)}</p>
          {step.why && <p className="mt-2 flex gap-2 rounded-xl bg-primary-50/80 px-3 py-2 text-[13.5px] leading-6 text-primary-900"><HeartHandshake size={16} className="mt-1 shrink-0 text-primary-700" /><span><b>{T('আপনার কী কাজে লাগে: ', 'How it helps you: ')}</b>{L(step.why)}</span></p>}
          {step.try && <p className="mt-2 flex gap-2 rounded-xl bg-paddy-50 px-3 py-2 text-[13.5px] leading-6 text-paddy-800"><MousePointerClick size={16} className="mt-1 shrink-0" /><span><b>{T('করে দেখুন: ', 'Try it: ')}</b>{L(step.try)}</span></p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-black/[.06] px-3 py-2.5">
          <button type="button" disabled={sequencePosition === 0} onClick={() => changeStep(-1)} className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-ink/70 hover:bg-black/5 disabled:opacity-40"><ArrowLeft size={16} />{T('আগে', 'Back')}</button>
          <div className="flex gap-1" aria-hidden="true">{inCh.map((_, i) => <i key={i} className={`h-1.5 rounded-full transition-all ${i === at ? 'w-4 bg-primary-700' : 'w-1.5 bg-black/15'}`} />)}</div>
          {sequencePosition < sequence.length - 1
            ? <button type="button" onClick={() => changeStep(1)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('পরের ধাপ', 'Next')}<ArrowRight size={16} /></button>
            : <button type="button" onClick={closeTour} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary-700 px-4 text-[14px] font-semibold text-white hover:bg-primary-800">{T('শেষ', 'Done')}</button>}
        </div>
      </aside>
    </>
  );
}
