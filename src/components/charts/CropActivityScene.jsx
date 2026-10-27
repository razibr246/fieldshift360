import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Wind } from 'lucide-react';
import { clampProgress, dateAtProgress, stageAtProgress, MUNGBEAN_SOWING_STAGES, AMAN_TRANSPLANT_STAGES } from '../../engine/farmTimeline';
import { fmtBangla, fmtDate, num } from '../../engine/dates';

const DURATION = 16000;
const ACTIVITIES = {
  mungbean: {
    title: { bn: 'মুগ ডাল বোনা', en: 'Sowing mung dal' },
    action: { bn: 'মুগ ডাল বোনার পালা', en: 'Mung-dal sowing, step by step' },
    range: { bn: 'বপনের দিন', en: 'Sowing date' },
    stages: MUNGBEAN_SOWING_STAGES,
    motions: {
      clouds: [{ transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }],
      sowArm: [{ transform: 'rotate(7deg)' }, { transform: 'rotate(-24deg)' }, { transform: 'rotate(7deg)' }],
      seeds: [
        { opacity: 0, transform: 'translate(0, 0)' },
        { opacity: 0, transform: 'translate(0, 0)', offset: 0.2 },
        { opacity: 1, transform: 'translate(-10px, 20px)', offset: 0.34 },
        { opacity: 0, transform: 'translate(-20px, 43px)', offset: 0.48 },
        { opacity: 0, transform: 'translate(-20px, 43px)', offset: 1 },
      ],
      sprouts: [
        { opacity: 0, transform: 'scaleY(.2)', offset: 0 },
        { opacity: 0, transform: 'scaleY(.2)', offset: 0.64 },
        { opacity: 1, transform: 'scaleY(1)', offset: 0.82 },
        { opacity: 1, transform: 'scaleY(1)', offset: 0.96 },
        { opacity: 0, transform: 'scaleY(.2)', offset: 1 },
      ],
    },
  },
  aman: {
    title: { bn: 'রোপা আমন লাগানো', en: 'Transplanting Ropa Aman' },
    action: { bn: 'আমন চারা রোপণের পালা', en: 'Aman transplanting, step by step' },
    range: { bn: 'রোপণের দিন', en: 'Transplanting date' },
    stages: AMAN_TRANSPLANT_STAGES,
    motions: {
      clouds: [{ transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }],
      water: [{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-8px)' }],
      plantArm: [{ transform: 'rotate(6deg)' }, { transform: 'rotate(-28deg)' }, { transform: 'rotate(6deg)' }],
      seedling: [{ transform: 'rotate(-2deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(-2deg)' }],
      rain: [{ opacity: 0.1 }, { opacity: 0.45 }, { opacity: 0.1 }],
    },
  },
};

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

function ActivityIllustration({ kind, sceneRef, lang }) {
  const mungbean = kind === 'mungbean';
  return (
    <svg ref={sceneRef} viewBox="0 0 920 310" className="block h-auto w-full" role="img"
      aria-label={lang === 'bn'
        ? (mungbean ? 'মাঠে কৃষকের মুগ ডাল বোনার দৃশ্য' : 'পানিভরা ধানক্ষেতে কৃষকের রোপা আমন লাগানোর দৃশ্য')
        : (mungbean ? 'A farmer sowing mung dal in a field' : 'A farmer transplanting Ropa Aman in a flooded paddy')}>
      <defs>
        <linearGradient id={`${kind}-sky`} x2="0" y2="1"><stop stopColor={mungbean ? '#dceff0' : '#c9e9f1'} /><stop offset="1" stopColor={mungbean ? '#f8f3dd' : '#eef4df'} /></linearGradient>
        <linearGradient id={`${kind}-soil`} x2="0" y2="1"><stop stopColor={mungbean ? '#aa8051' : '#91b8a2'} /><stop offset="1" stopColor={mungbean ? '#735238' : '#527f72'} /></linearGradient>
        <linearGradient id={`${kind}-shirt`} x2="0" y2="1"><stop stopColor="#f4d39a" /><stop offset="1" stopColor="#dfa45d" /></linearGradient>
      </defs>
      <rect width="920" height="310" rx="22" fill={`url(#${kind}-sky)`} />
      <circle cx="790" cy="48" r="24" fill="#f2cc70" opacity=".8" />
      <g fill="#fff" opacity=".72" data-motion="cloud">
        <path d="M100 83c-15 0-18-19-5-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path d="M654 91c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <path d="M0 167c127-40 221-14 323 4 117 20 203-24 316-7 96 14 184 13 281-7v82H0Z" fill="#93b67e" opacity=".65" />
      <path d="M0 193c127-32 251-8 357 8 128 19 261-20 366-10 81 8 145 7 197-8v70H0Z" fill="#608c5e" opacity=".6" />
      <g fill="#426f49" opacity=".78">
        <path d="M72 197v-54h8v54Zm-13-51q17-37 34 0-17-8-34 0Zm751 49v-67h9v67Zm-16-61q20-41 39 0-20-9-39 0Z" />
      </g>
      {mungbean ? (
        <>
          <path d="M0 231c166-20 314-8 459-2 170 8 301-17 461-4v85H0Z" fill={`url(#${kind}-soil)`} />
          <path d="M0 242c177-19 294-4 460 2 176 7 311-17 460-3" fill="none" stroke="#d5ae72" strokeWidth="4" opacity=".65" />
          <g fill="none" stroke="#513d2d" strokeWidth="4" opacity=".48">
            <path d="M20 267q220-34 442-2t435 0" /><path d="M8 293q220-34 442-2t435 0" />
          </g>
          <g data-motion="sprouts" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }} fill="#4d914c" stroke="#347543" strokeWidth="2">
            <path d="M132 242v-22m0 12q-17-17-25-5 10 0 14 10m11-2q14-17 23-6-9 1-15 10" />
            <path d="M218 237v-24m0 13q-16-17-25-6 10 1 15 11m10-2q15-16 23-5-10 0-16 10" />
            <path d="M705 238v-21m0 12q-15-16-24-5 9 0 14 10m11-2q13-15 22-5-9 0-14 9" />
            <path d="M784 237v-22m0 12q-14-16-23-5 9 0 14 10m10-2q14-15 22-5-9 0-14 9" />
          </g>
          <ellipse cx="426" cy="259" rx="51" ry="8" fill="#493728" opacity=".25" />
          <path d="M325 214q39-30 79-2l-3 13q-42-17-78 4Z" fill="#c48e4c" stroke="#805a36" strokeWidth="3" />
          <path d="M338 210q25-17 51 0" fill="none" stroke="#805a36" strokeWidth="4" />
          <g fill="#e7d09d"><circle cx="348" cy="213" r="5" /><circle cx="364" cy="210" r="5" /><circle cx="379" cy="214" r="5" /></g>
          <g data-motion="sowArm" transform="translate(402 155)" style={{ transformBox: 'view-box', transformOrigin: '0px 0px' }}>
            <path d="M0 0q-20 8-37 29l-30 18q-8 5-4 13 5 7 13 2l39-16q21-9 37-26Z" fill="#d7964f" stroke="#8b5d39" strokeWidth="3" />
            <path d="M-72 55q-10 4-10 12 6 7 14 1l8-7Z" fill="#9d6747" />
          </g>
          <g data-motion="seeds" fill="#ead5a3">
            <ellipse cx="323" cy="210" rx="4" ry="2.5" /><ellipse cx="315" cy="218" rx="3.5" ry="2.5" /><ellipse cx="307" cy="224" rx="3" ry="2" />
          </g>
          <g>
            <path d="M392 136q-14-15-12-31 2-18 18-22 18 1 21 19l-4 26Z" fill="#a96647" stroke="#7e4936" strokeWidth="2" />
            <path d="M376 109q-1-25 22-31 22 3 27 25-23-9-49 7Z" fill="#33443b" />
            <path d="M375 105q27-16 53-4l3 8q-25-9-54 5Z" fill="#f0d18a" stroke="#b17b43" strokeWidth="2" />
            <path d="M390 137q20-11 39 3l24 29-21 17-28-22-23-11Z" fill={`url(#${kind}-shirt)`} stroke="#ad763c" strokeWidth="3" />
            <path d="M414 174q25 0 46 20l-10 18q-35-7-58-20Z" fill="#397c78" stroke="#285d5b" strokeWidth="3" />
            <path d="M442 195q-22 11-42 28l-24 14q-7 5-2 12 6 5 13 0l35-15q23-11 35-25Z" fill="#a86647" stroke="#754735" strokeWidth="3" />
            <path d="M455 206q27 5 36 25l-11 14q-22-7-38-20Z" fill="#dfa45d" stroke="#ad763c" strokeWidth="3" />
            <path d="M387 224q26 8 55-4l7 20q-22 17-57 11l-17-12Z" fill="#397c78" stroke="#285d5b" strokeWidth="3" />
            <path d="M389 246q-12 14-22 24l-16 5q-4 5 1 9 18 3 34-7l20-20m42-10q-2 13 7 24l22 7q4 5-1 8-21 1-37-10l-16-19" fill="none" stroke="#8e6043" strokeWidth="9" strokeLinecap="round" />
            <path d="M393 119q5-3 10 0m13 0q4-3 8 0m-20 9q9 5 17-1" fill="none" stroke="#53372d" strokeWidth="2" strokeLinecap="round" />
          </g>
        </>
      ) : (
        <>
          <path d="M0 218c137-17 270-6 399 1 175 10 324-19 521-2v93H0Z" fill="#86b7a0" />
          <path d="M0 250c154-12 290 1 438 7 179 8 316-15 482-4v57H0Z" fill={`url(#${kind}-soil)`} />
          <g fill="none" stroke="#d9eee0" strokeWidth="4" opacity=".8" data-motion="water">
            <path d="M0 240q55-8 110 0t110 0 110 0 110 0 110 0 110 0 110 0 110 0 110 0" />
            <path d="M14 273q48-7 96 0t96 0 96 0 96 0 96 0 96 0 96 0 96 0 96 0" />
          </g>
          <g data-motion="seedling" style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }} fill="#43864b" stroke="#2d6d3c" strokeWidth="2">
            <path d="M150 251v-36m0 25q-24-23-35-9 12 1 20 14m15-7q17-25 31-12-13 2-21 16" />
            <path d="M234 254v-39m0 27q-23-23-35-9 12 1 20 14m14-8q18-23 32-11-13 2-22 16" />
            <path d="M720 252v-37m0 25q-23-23-35-9 12 1 20 14m14-7q17-24 31-12-13 2-21 16" />
            <path d="M807 252v-37m0 25q-22-23-34-9 12 1 19 14m14-7q17-24 31-12-13 2-21 16" />
          </g>
          <g data-motion="rain" stroke="#73bad1" strokeWidth="3" strokeLinecap="round">
            <path d="m510 130-8 17m28-25-8 17m28-8-8 17m28-27-8 17m28-7-8 17m28-27-8 17m28-7-8 17" />
          </g>
          <g data-motion="plantArm" transform="translate(415 154)" style={{ transformBox: 'view-box', transformOrigin: '0px 0px' }}>
            <path d="M0 0q-17 11-22 34l-10 35q-2 9 7 11 8 0 10-9l17-34q10-16 24-24Z" fill="#d7964f" stroke="#8b5d39" strokeWidth="3" />
            <path d="M-32 77q-4 9 3 13 9 0 11-8l-1-9Z" fill="#a96647" />
          </g>
          <g>
            <path d="M398 136q-15-17-11-34 3-18 20-20 19 3 21 22l-5 27Z" fill="#a96647" stroke="#7e4936" strokeWidth="2" />
            <path d="M378 106q2-25 27-29 25 4 29 25-27-8-56 8Z" fill="#473a31" />
            <path d="M374 105q31-15 62-3l1 9q-31-10-62 5Z" fill="#c74338" stroke="#842f2c" strokeWidth="2" />
            <path d="M394 137q24-10 42 6l15 42-25 14-28-30-21-14Z" fill={`url(#${kind}-shirt)`} stroke="#ad763c" strokeWidth="3" />
            <path d="M408 185q26 3 49-9l10 40q-31 22-62 5l-15-20Z" fill="#397c78" stroke="#285d5b" strokeWidth="3" />
            <path d="M418 218q-12 21-17 33m51-28q-5 22 7 38" fill="none" stroke="#a96647" strokeWidth="10" strokeLinecap="round" />
            <path d="M422 261q-13 4-25 0m63-1q-13 4-24 0" fill="none" stroke="#654632" strokeWidth="7" strokeLinecap="round" />
            <path d="M409 119q5-3 10 0m13 0q4-3 8 0m-22 10q8 5 16-2" fill="none" stroke="#53372d" strokeWidth="2" strokeLinecap="round" />
          </g>
          <path d="M414 248v-24m0 13q-15-14-23-4 9 1 14 9m9-5q12-15 21-7-9 1-15 10" fill="none" stroke="#387b43" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      <path d="M0 0h920v310H0Z" fill="none" stroke="#fff" strokeWidth="4" opacity=".38" />
    </svg>
  );
}

export default function CropActivityScene({ kind, from, to, lang, T, onDateChange }) {
  const activity = ACTIVITIES[kind];
  const sceneRef = useRef(null);
  const animationsRef = useRef([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useReducedMotion();
  const stageIndex = stageAtProgress(progress, activity.stages);
  const stage = activity.stages[stageIndex];
  const selectedDate = dateAtProgress(from, to, progress);
  const date = lang === 'bn' ? fmtBangla(selectedDate, 'bn') : fmtDate(selectedDate, 'en');
  const readClock = () => ((animationsRef.current[0]?.currentTime ?? 0) % DURATION) / DURATION;

  useEffect(() => {
    const svg = sceneRef.current;
    if (!svg) return undefined;
    animationsRef.current = Array.from(svg.querySelectorAll('[data-motion]')).flatMap((el) => {
      const frames = activity.motions[el.dataset.motion];
      if (!frames || typeof el.animate !== 'function') return [];
      const animation = el.animate(frames, { duration: DURATION, iterations: Infinity, fill: 'both', easing: 'ease-in-out' });
      animation.pause();
      return [animation];
    });
    animationsRef.current.forEach((animation) => { animation.currentTime = 0; });
    return () => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
    };
  }, [activity]);

  useEffect(() => {
    animationsRef.current.forEach((animation) => {
      animation.playbackRate = speed;
      if (playing && !reduced) animation.play();
      else animation.pause();
    });
  }, [playing, speed, reduced]);

  useEffect(() => {
    if (!playing || reduced) return undefined;
    let raf = 0, last = 0;
    const tick = (now) => {
      if (now - last >= 100) {
        const p = clampProgress(readClock());
        setProgress((old) => (Math.abs(old - p) > 0.004 ? p : old));
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  useEffect(() => { onDateChange?.(selectedDate); }, [onDateChange, selectedDate]);

  const seek = (p) => {
    const next = clampProgress(p);
    animationsRef.current.forEach((animation) => { animation.currentTime = next * DURATION; });
    setProgress(next);
  };
  const moveStage = (delta) => {
    const next = (stageIndex + delta + activity.stages.length) % activity.stages.length;
    seek(activity.stages[next].at);
  };
  const togglePlaying = () => {
    if (reduced) {
      setReduced(false);
      setPlaying(true);
      return;
    }
    setPlaying((wasPlaying) => !wasPlaying);
  };
  const replay = () => { seek(0); setPlaying(true); };

  return (
    <section className="overflow-hidden rounded-[22px] border border-primary-100 bg-[#f6f8ef]" aria-label={T(activity.title.bn, activity.title.en)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-primary-950"><Wind size={17} className="text-primary-700" />{T(activity.action.bn, activity.action.en)}</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">{T(`আজকের কাজ · ${stage.label.bn} · ${date}`, `Today’s action · ${stage.label.en} · ${date}`)}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] font-medium text-muted">
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} className="accent-primary-700" />
          {T('কম নড়াচড়া', 'Reduced motion')}
        </label>
      </div>
      <div className="mx-3 overflow-hidden rounded-[17px] border border-white/80 bg-white shadow-inner sm:mx-4">
        <ActivityIllustration kind={kind} sceneRef={sceneRef} lang={lang} />
      </div>
      <div className="px-4 pb-4 pt-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => moveStage(-1)} aria-label={T('আগের ধাপ', 'Previous stage')} className="grid h-8 w-8 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><SkipBack size={15} /></button>
            <button type="button" onClick={togglePlaying} aria-label={playing && !reduced ? T('থামান', 'Pause') : T('চালান', 'Resume')} className="grid h-8 w-8 place-items-center rounded-full bg-primary-700 text-white shadow-sm hover:bg-primary-800">
              {playing && !reduced ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button type="button" onClick={replay} aria-label={T('আবার চালান', 'Replay')} className="grid h-8 w-8 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><RotateCcw size={14} /></button>
            <button type="button" onClick={() => moveStage(1)} aria-label={T('পরের ধাপ', 'Next stage')} className="grid h-8 w-8 place-items-center rounded-full bg-white text-primary-800 shadow-sm ring-1 ring-black/5 hover:bg-primary-50"><SkipForward size={15} /></button>
          </div>
          <label className="flex items-center gap-1 text-[11px] font-semibold text-muted">
            <span className="sr-only">{T('গতি', 'Speed')}</span>
            <select aria-label={T('গতি', 'Speed')} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-8 rounded-full border border-primary-100 bg-white px-2 text-ink outline-none focus:ring-2 focus:ring-primary-300">
              <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
            </select>
          </label>
        </div>
        <input type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} onChange={(e) => seek(Number(e.target.value) / 1000)}
          aria-label={T('কাজের ধাপ', 'Activity stage')} className="mt-3 h-2 w-full cursor-pointer accent-primary-700" />
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 text-[10.5px] text-muted">
          <span className="truncate">{T(`${activity.range.bn} · ${fmtBangla(from, 'bn')}`, `${activity.range.en} · ${fmtDate(from, 'en')}`)}</span>
          <span className="font-semibold text-primary-800">{T(stage.label.bn, stage.label.en)} · {num(stageIndex + 1, lang)}/{num(activity.stages.length, lang)}</span>
          <span className="truncate text-right">{from === to ? '' : lang === 'bn' ? fmtBangla(to, 'bn') : fmtDate(to, 'en')}</span>
        </div>
      </div>
    </section>
  );
}
