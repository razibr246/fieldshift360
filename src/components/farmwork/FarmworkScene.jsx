// A farm job, animated step by step (season ribbon on the farmer's plan): the tomato harvest, mung-bean sowing or
// Aman transplanting. Each scene is a pure function of loop time (tomato.js, mungbean.js, aman.js), so the slider,
// the stage buttons, pause and speed all just move one clock; the frame is painted straight into the SVG without a
// React render. It runs only while it is on screen, and holds still for "reduced motion".
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Wind } from 'lucide-react';
import { clampProgress, dateAtProgress, stageAtProgress } from '../../engine/farmTimeline';
import { fmtBangla, fmtDate, num } from '../../engine/dates';
import { smooth } from '../../engine/motion';
import { SCENES } from './scenes';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReduced(media.matches);
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return [reduced, setReduced];
}

export default function FarmworkScene({ kind, from, to, lang, T, onDateChange }) {
  const sc = SCENES[kind];
  const { Art } = sc;
  const boxRef = useRef(null), artRef = useRef(null), seamRef = useRef(null), seamBox = useRef(null);
  const paint = useRef(null), paintSeam = useRef(null);
  const [reduced, setReduced] = useReducedMotion();
  const clock = useRef({ t: reduced ? sc.poster : 0, w: 0, loops: 0 });
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(clock.current.t / sc.T);
  const stages = sc.stages;
  const stageIndex = stageAtProgress(progress, stages);
  const stage = stages[stageIndex];
  const selectedDate = dateAtProgress(from, to, progress);
  const date = lang === 'bn' ? fmtBangla(selectedDate, 'bn') : fmtDate(selectedDate, 'en');

  const draw = () => {
    const c = clock.current;
    paint.current?.(c.t, c.w, c.loops);
    // Scenes that cannot run on into their next loop (days pass between sowing and sprouting) dissolve into it.
    if (sc.seam && seamBox.current) {
      const k = smooth((c.t - (sc.T - sc.seam)) / sc.seam);
      seamBox.current.style.opacity = k.toFixed(3);
      if (k > 0) paintSeam.current?.(0, c.w, c.loops + 1);
    }
  };

  useEffect(() => {
    paint.current = sc.painter(artRef.current);
    paintSeam.current = sc.seam ? sc.painter(seamRef.current) : null;
    draw();
    if (import.meta.env.DEV) {
      (window.__fsFarmwork ||= {})[kind] = { T: sc.T, svg: () => artRef.current, seek: (t, w = t) => { clock.current.t = t; clock.current.w = w; draw(); } };
    }
    return () => { if (import.meta.env.DEV && window.__fsFarmwork) delete window.__fsFarmwork[kind]; };
  }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !('IntersectionObserver' in window)) { setVisible(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(box);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduced || !visible) return undefined;
    let raf = 0, prev = performance.now(), lastUi = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - prev) / 1000) * speed;
      prev = now;
      const c = clock.current;
      c.t += dt; c.w += dt;
      if (c.t >= sc.T) { c.t -= sc.T; c.loops += 1; }
      draw();
      if (now - lastUi > 100) { lastUi = now; setProgress((old) => { const p = clampProgress(c.t / sc.T); return Math.abs(old - p) > 0.004 ? p : old; }); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced, visible, speed, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onDateChange?.(selectedDate); }, [onDateChange, selectedDate]);

  const seek = (p) => {
    const next = clampProgress(p);
    clock.current.t = Math.min(next, 0.9999) * sc.T;
    draw();
    setProgress(next);
  };
  const moveStage = (delta) => seek(stages[(stageIndex + delta + stages.length) % stages.length].at);
  const togglePlaying = () => {
    if (reduced) { setReduced(false); setPlaying(true); return; }
    setPlaying((was) => !was);
  };
  const replay = () => { seek(0); setPlaying(true); };
  const moving = playing && !reduced;

  return (
    <section ref={boxRef} className="overflow-hidden rounded-[22px] border border-primary-100 bg-[#f6f8ef]" aria-label={T(sc.title.bn, sc.title.en)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-primary-950"><Wind size={17} className="text-primary-700" />{T(sc.action.bn, sc.action.en)}</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">{T(`আজকের কাজ · ${stage.label.bn} · ${date}`, `Today’s action · ${stage.label.en} · ${date}`)}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] font-medium text-muted">
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} className="accent-primary-700" />
          {T('কম নড়াচড়া', 'Reduced motion')}
        </label>
      </div>
      <div className="relative mx-3 overflow-hidden rounded-[17px] border border-white/80 bg-white shadow-inner sm:mx-4">
        <Art lang={lang} svgRef={artRef} />
        {sc.seam ? <div ref={seamBox} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 0 }}><Art lang={lang} svgRef={seamRef} /></div> : null}
      </div>
      <div className="px-4 pb-4 pt-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => moveStage(-1)} aria-label={T('আগের ধাপ', 'Previous stage')} className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><SkipBack size={15} /></button>
            <button type="button" onClick={togglePlaying} aria-label={moving ? T('থামান', 'Pause') : T('চালান', 'Resume')} className="grid h-11 w-11 place-items-center rounded-full bg-primary-700 text-white shadow-sm hover:bg-primary-800">
              {moving ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button type="button" onClick={replay} aria-label={T('আবার চালান', 'Replay')} className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><RotateCcw size={14} /></button>
            <button type="button" onClick={() => moveStage(1)} aria-label={T('পরের ধাপ', 'Next stage')} className="grid h-11 w-11 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><SkipForward size={15} /></button>
          </div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-muted">
            <span className="sr-only">{T('গতি', 'Speed')}</span>
            <select aria-label={T('গতি', 'Speed')} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-11 rounded-full border border-primary-100 bg-white px-2 text-ink outline-none focus:ring-2 focus:ring-primary-300">
              <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
            </select>
          </label>
        </div>
        <input type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} onChange={(e) => seek(Number(e.target.value) / 1000)}
          aria-label={T(sc.slider.bn, sc.slider.en)} className="mt-3 h-2 w-full cursor-pointer accent-primary-700" />
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 text-[10.5px] text-muted">
          <span className="truncate">{T(`${sc.range.bn} · ${fmtBangla(from, 'bn')}`, `${sc.range.en} · ${fmtDate(from, 'en')}`)}</span>
          <span className="font-semibold text-primary-800">{T(stage.label.bn, stage.label.en)} · {num(stageIndex + 1, lang)}/{num(stages.length, lang)}</span>
          <span className="truncate text-right">{from === to ? '' : lang === 'bn' ? fmtBangla(to, 'bn') : fmtDate(to, 'en')}</span>
        </div>
      </div>
    </section>
  );
}
