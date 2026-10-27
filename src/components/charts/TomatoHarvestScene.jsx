import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Wind } from 'lucide-react';
import { clampProgress, dateAtProgress, stageAtProgress, TOMATO_HARVEST_STAGES } from '../../engine/farmTimeline';
import { fmtBangla, fmtDate, num } from '../../engine/dates';

const DURATION = 16000;
const MOTIONS = {
  walker: [
    { transform: 'translate(254px, 0px)', offset: 0 },
    { transform: 'translate(286px, 0px)', offset: 0.14 },
    { transform: 'translate(286px, 0px)', offset: 1 },
  ],
  torso: [
    { transform: 'rotate(0deg)', offset: 0 },
    { transform: 'rotate(-2deg)', offset: 0.16 },
    { transform: 'rotate(-10deg)', offset: 0.36, easing: 'ease-in-out' },
    { transform: 'rotate(-12deg)', offset: 0.5 },
    { transform: 'rotate(-5deg)', offset: 0.68, easing: 'ease-out' },
    { transform: 'rotate(1deg)', offset: 0.8 },
    { transform: 'rotate(0deg)', offset: 1 },
  ],
  head: [
    { transform: 'translate(0px, 78px) rotate(0deg)', offset: 0 },
    { transform: 'translate(0px, 78px) rotate(5deg)', offset: 0.19 },
    { transform: 'translate(0px, 78px) rotate(11deg)', offset: 0.32 },
    { transform: 'translate(0px, 78px) rotate(8deg)', offset: 0.51 },
    { transform: 'translate(0px, 78px) rotate(-9deg)', offset: 0.72 },
    { transform: 'translate(0px, 78px) rotate(0deg)', offset: 0.9 },
    { transform: 'translate(0px, 78px) rotate(0deg)', offset: 1 },
  ],
  rightArm: [
    { transform: 'translate(22px, 126px) rotate(0deg)', offset: 0 },
    { transform: 'translate(22px, 126px) rotate(-5deg)', offset: 0.2 },
    { transform: 'translate(22px, 126px) rotate(-45deg)', offset: 0.38, easing: 'ease-in-out' },
    { transform: 'translate(22px, 126px) rotate(-48deg)', offset: 0.5 },
    { transform: 'translate(22px, 126px) rotate(-27deg)', offset: 0.64, easing: 'ease-in-out' },
    { transform: 'translate(22px, 126px) rotate(22deg)', offset: 0.78 },
    { transform: 'translate(22px, 126px) rotate(9deg)', offset: 0.86 },
    { transform: 'translate(22px, 126px) rotate(0deg)', offset: 1 },
  ],
  rightForearm: [
    { transform: 'translate(44px, 49px) rotate(0deg)', offset: 0 },
    { transform: 'translate(44px, 49px) rotate(-12deg)', offset: 0.32 },
    { transform: 'translate(44px, 49px) rotate(-22deg)', offset: 0.43 },
    { transform: 'translate(44px, 49px) rotate(-7deg)', offset: 0.53 },
    { transform: 'translate(44px, 49px) rotate(-37deg)', offset: 0.69 },
    { transform: 'translate(44px, 49px) rotate(9deg)', offset: 0.78 },
    { transform: 'translate(44px, 49px) rotate(0deg)', offset: 0.9 },
    { transform: 'translate(44px, 49px) rotate(0deg)', offset: 1 },
  ],
  leftArm: [
    { transform: 'translate(-22px, 126px) rotate(0deg)', offset: 0 },
    { transform: 'translate(-22px, 126px) rotate(15deg)', offset: 0.12 },
    { transform: 'translate(-22px, 126px) rotate(-4deg)', offset: 0.2 },
    { transform: 'translate(-22px, 126px) rotate(18deg)', offset: 0.42 },
    { transform: 'translate(-22px, 126px) rotate(20deg)', offset: 0.55 },
    { transform: 'translate(-22px, 126px) rotate(4deg)', offset: 0.82 },
    { transform: 'translate(-22px, 126px) rotate(0deg)', offset: 1 },
  ],
  leftLeg: [
    { transform: 'translate(-7px, 189px) rotate(-12deg)', offset: 0 },
    { transform: 'translate(-7px, 189px) rotate(12deg)', offset: 0.07 },
    { transform: 'translate(-7px, 189px) rotate(0deg)', offset: 0.14 },
    { transform: 'translate(-7px, 189px) rotate(0deg)', offset: 1 },
  ],
  rightLeg: [
    { transform: 'translate(12px, 189px) rotate(12deg)', offset: 0 },
    { transform: 'translate(12px, 189px) rotate(-12deg)', offset: 0.07 },
    { transform: 'translate(12px, 189px) rotate(0deg)', offset: 0.14 },
    { transform: 'translate(12px, 189px) rotate(0deg)', offset: 1 },
  ],
  plant: [
    { transform: 'rotate(0deg)', offset: 0 },
    { transform: 'rotate(2deg)', offset: 0.2 },
    { transform: 'rotate(-3deg)', offset: 0.39 },
    { transform: 'rotate(-1deg)', offset: 0.5 },
    { transform: 'rotate(3deg)', offset: 0.72 },
    { transform: 'rotate(-1deg)', offset: 0.9 },
    { transform: 'rotate(0deg)', offset: 1 },
  ],
  pickedTomato: [
    { opacity: 0, transform: 'translate(450px, 169px) scale(.75)', offset: 0 },
    { opacity: 0, transform: 'translate(450px, 169px) scale(.75)', offset: 0.46 },
    { opacity: 1, transform: 'translate(450px, 169px) scale(1)', offset: 0.5 },
    { opacity: 1, transform: 'translate(430px, 190px) scale(.96)', offset: 0.63, easing: 'ease-in-out' },
    { opacity: 1, transform: 'translate(416px, 228px) scale(.9)', offset: 0.75, easing: 'ease-in' },
    { opacity: 0, transform: 'translate(416px, 228px) scale(.6)', offset: 0.79 },
    { opacity: 0, transform: 'translate(416px, 228px) scale(.6)', offset: 1 },
  ],
  sourceTomato: [
    { opacity: 1, transform: 'scale(1)', offset: 0 },
    { opacity: 1, transform: 'scale(1)', offset: 0.46 },
    { opacity: 0, transform: 'scale(.55)', offset: 0.49 },
    { opacity: 0, transform: 'scale(.55)', offset: 0.97 },
    { opacity: 1, transform: 'scale(1)', offset: 1 },
  ],
  basket: [
    { transform: 'translate(391px, 211px) rotate(0deg) translateY(0px)', offset: 0 },
    { transform: 'translate(391px, 211px) rotate(0deg) translateY(0px)', offset: 0.73 },
    { transform: 'translate(391px, 211px) rotate(-3deg) translateY(-2px)', offset: 0.77 },
    { transform: 'translate(391px, 211px) rotate(2deg) translateY(0px)', offset: 0.81 },
    { transform: 'translate(391px, 211px) rotate(0deg) translateY(0px)', offset: 0.9 },
    { transform: 'translate(391px, 211px) rotate(0deg) translateY(0px)', offset: 1 },
  ],
  basketTomato: [
    { opacity: 0, transform: 'scale(.45)', offset: 0 },
    { opacity: 0, transform: 'scale(.45)', offset: 0.75 },
    { opacity: 1, transform: 'scale(1.08)', offset: 0.79 },
    { opacity: 1, transform: 'scale(1)', offset: 0.84 },
    { opacity: 1, transform: 'scale(1)', offset: 1 },
  ],
  cloud: [
    { transform: 'translateX(-12px)', offset: 0 },
    { transform: 'translateX(12px)', offset: 0.5 },
    { transform: 'translateX(-12px)', offset: 1 },
  ],
};

const STAGE_BOUNDARIES = TOMATO_HARVEST_STAGES.map((stage) => stage.at);

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

function FieldScene({ sceneRef, lang }) {
  return (
    <svg ref={sceneRef} viewBox="0 0 920 310" className="block h-auto w-full" role="img" aria-label={lang === 'bn' ? 'বাংলাদেশের বাগানে টমেটো তোলার দৃশ্য' : 'Illustrated tomato harvest in a Bangladeshi garden'}>
      <defs>
        <linearGradient id="tomato-sky" x2="0" y2="1"><stop stopColor="#d7eff0" /><stop offset="1" stopColor="#f6f5df" /></linearGradient>
        <linearGradient id="tomato-soil" x2="0" y2="1"><stop stopColor="#8e6240" /><stop offset="1" stopColor="#63452f" /></linearGradient>
        <linearGradient id="tomato-shirt" x2="0" y2="1"><stop stopColor="#f2c46f" /><stop offset="1" stopColor="#d48c39" /></linearGradient>
        <linearGradient id="tomato-leaf" x2="0" y2="1"><stop stopColor="#6da85a" /><stop offset="1" stopColor="#317343" /></linearGradient>
        <linearGradient id="tomato-basket" x2="0" y2="1"><stop stopColor="#d7a75f" /><stop offset="1" stopColor="#98642d" /></linearGradient>
        <filter id="tomato-shadow" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>
      <rect width="920" height="310" rx="22" fill="url(#tomato-sky)" />
      <circle cx="790" cy="49" r="25" fill="#f3c963" opacity=".8" />
      <g fill="#fff" opacity=".65" data-motion="cloud" style={{ transformBox: 'view-box', transformOrigin: '0px 0px' }}>
        <path d="M92 76c-14 0-18-19-4-25 5-19 31-19 39-2 16-4 25 18 11 27Z" />
        <path d="M654 93c-12 0-17-16-5-23 4-16 28-16 34-1 14-3 22 16 9 24Z" />
      </g>
      <path d="M0 155c118-40 187-20 278 5 109 30 191-28 296-7s222 26 346-8v89H0Z" fill="#9bb77f" opacity=".6" />
      <path d="M0 180c132-38 235-12 348 7 128 22 253-34 365-13 75 14 144 12 207-4v73H0Z" fill="#5f8b56" opacity=".56" />
      <g fill="#315f3a" opacity=".72">
        <path d="M55 186v-56h9v56Zm-13-53q16-35 32 0-16-8-32 0Zm5-18q12-29 25 0-12-7-25 0Z" />
        <path d="M834 185v-71h10v71Zm-17-64q20-42 39 0-19-9-39 0Zm5-22q14-32 29 0-15-8-29 0Z" />
        <path d="M739 181v-44h7v44Zm-12-41q15-30 29 0-14-7-29 0Z" />
      </g>
      <path d="M0 233c175-24 299-10 466-3 175 8 299-21 454-3v83H0Z" fill="url(#tomato-soil)" />
      <path d="M0 240c177-19 304-5 466 2 176 7 298-17 454-3" fill="none" stroke="#b88b5d" strokeWidth="3" opacity=".6" />
      <path d="M0 281c184-9 360 6 514 0s281-13 406-3" fill="none" stroke="#4e3a2d" strokeWidth="3" opacity=".45" />
      <g fill="#77954f" opacity=".6">
        {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${25 + i * 61} 241l-5-13 8 10 4-14 2 17Z`} />)}
      </g>
      <ellipse cx="286" cy="255" rx="48" ry="8" fill="#342d25" opacity=".25" filter="url(#tomato-shadow)" />
      <ellipse cx="450" cy="242" rx="62" ry="8" fill="#342d25" opacity=".24" filter="url(#tomato-shadow)" />
      <g transform="translate(450 0)">
        <path d="M0 240Q-8 182 2 109M0 176Q-30 142-55 135M1 161Q37 131 53 126M0 194Q-37 174-70 176M1 194Q35 175 69 173" fill="none" stroke="#397443" strokeWidth="7" strokeLinecap="round" />
        <g data-motion="plant" style={{ transformBox: 'view-box', transformOrigin: '0px 192px' }} fill="url(#tomato-leaf)" stroke="#2d683b" strokeWidth="1.6">
          <path d="M-1 133q-29-35-52-17 13 4 19 16-14-4-23 5 25 15 53-4Zm52-8q23-31 43-15-13 2-20 15 14-3 20 8-21 13-43-8ZM-18 174q-35-27-53-4 14 1 22 12-13-1-19 11 23 9 50-19Zm84-3q33-25 49-3-14 1-22 11 15-1 21 10-22 9-48-18Z" />
          <path d="M-20 136l20 5 31-11M42 132l12 1 24-7M-31 177l31 5 35-14M38 177l27-3 22-8" fill="none" stroke="#a4c37c" strokeWidth="1.5" opacity=".8" />
        </g>
        <g fill="#e6b95c"><circle cx="-60" cy="134" r="5" /><circle cx="60" cy="128" r="5" /><circle cx="-70" cy="175" r="4" /></g>
        <g data-motion="sourceTomato">
          <path d="M-2 159l-7-7 8 2 4-8 3 8 8-1-6 7 2 7-8-4-7 4Z" fill="#477a3d" />
          <circle cx="0" cy="169" r="13" fill="#d94835" /><path d="M-7 162q5-5 9-2" fill="none" stroke="#ffb19b" strokeWidth="3" strokeLinecap="round" opacity=".8" />
        </g>
        <circle cx="-54" cy="139" r="8" fill="#d94935" /><circle cx="56" cy="132" r="9" fill="#c93e31" />
      </g>
      <g data-motion="basket" transform="translate(391 211)" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
        <ellipse cx="44" cy="38" rx="42" ry="9" fill="#59452e" opacity=".3" />
        <path d="M5 0h78l-8 49q-31 12-62 0Z" fill="url(#tomato-basket)" stroke="#845823" strokeWidth="3" />
        <path d="M12 13h64M10 25h65M8 37h63M25 4l-3 43m20-45v47m19-47 4 45" fill="none" stroke="#f1cb83" strokeWidth="2" opacity=".75" />
        <path d="M16 1q29-39 58 0" fill="none" stroke="#8b5c2a" strokeWidth="5" />
        <circle cx="32" cy="4" r="9" fill="#d74d37" /><circle cx="51" cy="2" r="10" fill="#bf3e30" />
        <circle data-motion="basketTomato" cx="42" cy="-4" r="8" fill="#eb6650" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }} />
      </g>
      <g data-motion="pickedTomato" transform="translate(450 169)" style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
        <path d="M-2-10l-6-6 7 1 3-7 3 7 7-1-5 6 2 6-7-3-6 3Z" fill="#45783b" />
        <circle r="12" fill="#df4934" /><path d="M-5-5q4-5 8-2" fill="none" stroke="#ffb59c" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g data-motion="walker" transform="translate(286 0)" style={{ transformBox: 'view-box', transformOrigin: '0px 0px' }}>
        <g>
          <g data-motion="leftLeg" transform="translate(-7 189)" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
            <path d="M-8 0q22 2 24 14l-2 31-4 19-17 1 1-27-5-23Z" fill="#518078" stroke="#315d58" strokeWidth="2" />
            <path d="M-6 60l11 1-2 11q-13 4-27 0-3-2 0-6Z" fill="#664633" stroke="#493729" strokeWidth="2" />
          </g>
          <g data-motion="rightLeg" transform="translate(12 189)" style={{ transformBox: 'fill-box', transformOrigin: '50% 0%' }}>
            <path d="M-8 0q20 1 23 14l-5 30-2 20-17 1 1-30-6-21Z" fill="#42746f" stroke="#315d58" strokeWidth="2" />
            <path d="M-8 61l11 0-1 11q-13 4-28 0-2-3 2-6Z" fill="#715039" stroke="#493729" strokeWidth="2" />
          </g>
          <g data-motion="torso" transform="translate(0 0)" style={{ transformBox: 'fill-box', transformOrigin: '50% 84%' }}>
          <path d="M-28 119q8-15 28-15t29 15l-7 66q-22 11-44 0l-7-63Z" fill="url(#tomato-shirt)" stroke="#9d682f" strokeWidth="2" />
          <path d="M-12 112q12 14 25 0l7 15q-20 13-40 0Z" fill="#f7d486" stroke="#b67d36" strokeWidth="2" />
          <path d="M0 129v48m-14-36 7 2m20-2-7 2m-17 20 6 2m21-2-6 2" fill="none" stroke="#b97836" strokeWidth="2" opacity=".75" />
          <path d="M-32 178q32 14 64 0l-4 42q-27 15-54 0Z" fill="#3f7d78" stroke="#285a58" strokeWidth="2" />
          <path d="M-23 184l-3 32m13-30-1 37m15-37v39m13-42 3 35m11-38 4 31" fill="none" stroke="#8fc1ad" strokeWidth="2" opacity=".65" />
          <path d="M-27 186q26 7 54 0" fill="none" stroke="#d5b271" strokeWidth="4" />
          <g data-motion="leftArm" transform="translate(-22 126)" style={{ transformBox: 'fill-box', transformOrigin: '70% 8%' }}>
            <path d="M0 0q-17 5-23 26l-6 24q3 8 10 4l13-25 16-14Z" fill="#d58b3f" stroke="#9d682f" strokeWidth="3" strokeLinejoin="round" />
            <path d="M-20 49q-8 4-7 11 4 6 11 0l5-8Z" fill="#a76443" />
            <path d="M-5 4q-10 8-13 19l16 8 12-13Z" fill="#efbd68" />
          </g>
          <g data-motion="rightArm" transform="translate(22 126)" style={{ transformBox: 'fill-box', transformOrigin: '4% 4%' }}>
            <path d="M0 0q20 7 29 24l23 27q4 8-4 12-7 2-12-5L10 38Q-5 29-13 15Z" fill="#d58b3f" stroke="#9d682f" strokeWidth="3" strokeLinejoin="round" />
            <path d="M-1 3q16 4 25 19l-14 13q-17-9-23-22Z" fill="#efbd68" />
            <g data-motion="rightForearm" transform="translate(44 49)" style={{ transformBox: 'fill-box', transformOrigin: '8% 8%' }}>
              <path d="M0 0q19 7 37 19l33 16q8 5 3 12-5 6-13 2L27 34Q7 27-8 18Z" fill="#d58b3f" stroke="#9d682f" strokeWidth="3" strokeLinejoin="round" />
              <path d="M4 1q18 5 28 16l-8 14Q8 29-4 18Z" fill="#efbd68" />
              <path d="M68 34q11-8 17 1l-3 9q-7 5-14 0-5-3 0-10Z" fill="#a76443" stroke="#7d4a37" strokeWidth="2" />
              <path d="M76 34q4-5 8-4m-7 9 10-1" fill="none" stroke="#e6b295" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>
          <g data-motion="head" transform="translate(0 78)" style={{ transformBox: 'fill-box', transformOrigin: '50% 80%' }}>
            <path d="M-23 0q0-31 23-32 26 2 25 30l-4 24Q15 43 0 44q-18-2-23-22Z" fill="#a96443" stroke="#774334" strokeWidth="2" />
            <path d="M-28-20q1-27 28-29 24 2 30 25-12-6-25-5-17 1-33 9Z" fill="#262b26" />
            <path d="M-30-18q28-20 61-6l4 8q-29-10-65 6Z" fill="#f4f0df" stroke="#d5cfbb" strokeWidth="2" />
            <path d="M-22-12q21-13 49-5l2 5q-28-6-50 7Z" fill="#f6f4eb" />
            <path d="M-13 4q4-3 8 0m16 0q4-3 8 0" fill="none" stroke="#302b27" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="-7" cy="6" r="1.5" fill="#241f1c" /><circle cx="15" cy="6" r="1.5" fill="#241f1c" />
            <path d="M3 7l-2 10 7 1m-13 8q10 6 20-1" fill="none" stroke="#6b3c31" strokeWidth="2" strokeLinecap="round" />
            <path d="M-23 4q-8-4-8 6 2 8 9 5m46-11q8-3 8 7-2 7-9 4" fill="#a96443" stroke="#774334" strokeWidth="2" />
            <path d="M-32 10q-12 4-18 14l12 8q11-9 22-7" fill="#e7ad54" stroke="#a87331" strokeWidth="2" />
            <path d="M-42 24q12 5 21 0" fill="none" stroke="#fff2cf" strokeWidth="2" opacity=".8" />
          </g>
          </g>
        </g>
      </g>
      <path d="M0 0h920v310H0Z" fill="none" stroke="#fff" strokeWidth="4" opacity=".4" />
    </svg>
  );
}

export default function TomatoHarvestScene({ from, to, lang, T, onDateChange }) {
  const sceneRef = useRef(null);
  const animationsRef = useRef([]);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useReducedMotion();
  const stageIndex = stageAtProgress(progress);
  const stage = TOMATO_HARVEST_STAGES[stageIndex];
  const selectedDate = dateAtProgress(from, to, progress);
  const date = lang === 'bn' ? fmtBangla(selectedDate, 'bn') : fmtDate(selectedDate, 'en');
  const readClock = () => ((animationsRef.current[0]?.currentTime ?? 0) % DURATION) / DURATION;

  useEffect(() => {
    const svg = sceneRef.current;
    if (!svg) return undefined;
    animationsRef.current = Array.from(svg.querySelectorAll('[data-motion]')).flatMap((el) => {
      const frames = MOTIONS[el.dataset.motion];
      if (!frames || typeof el.animate !== 'function') return [];
      const animation = el.animate(frames, { duration: DURATION, iterations: Infinity, fill: 'both', easing: 'linear' });
      animation.pause();
      return [animation];
    });
    animationsRef.current.forEach((animation) => { animation.currentTime = 0; });
    if (!reduced) animationsRef.current.forEach((animation) => animation.play());
    return () => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current = [];
    };
  }, []);

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
    const next = (stageIndex + delta + TOMATO_HARVEST_STAGES.length) % TOMATO_HARVEST_STAGES.length;
    seek(STAGE_BOUNDARIES[next]);
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
    <section className="overflow-hidden rounded-[22px] border border-primary-100 bg-[#f6f8ef]" aria-label={T('টমেটো তোলার অ্যানিমেশন', 'Tomato harvest animation')}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-[16px] font-bold text-primary-950"><Wind size={17} className="text-primary-700" />{T('টমেটো তোলার পালা', 'Tomato harvest, step by step')}</h3>
          <p className="mt-0.5 text-[12.5px] text-muted">{T(`আজকের কাজ · ${stage.label.bn} · ${date}`, `Today’s action · ${stage.label.en} · ${date}`)}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] font-medium text-muted">
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} className="accent-primary-700" />
          {T('কম নড়াচড়া', 'Reduced motion')}
        </label>
      </div>
      <div className="mx-3 overflow-hidden rounded-[17px] border border-white/80 bg-white shadow-inner sm:mx-4">
        <FieldScene sceneRef={sceneRef} lang={lang} />
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
          aria-label={T('ফসল তোলার তারিখ', 'Harvest date')} className="mt-3 h-2 w-full cursor-pointer accent-primary-700" />
        <div className="grid grid-cols-[1fr_auto_1fr] gap-1 text-[10.5px] text-muted">
          <span className="truncate">{T(`তোলার সময় · ${fmtBangla(from, 'bn')}`, `Harvest · ${fmtDate(from, 'en')}`)}</span>
          <span className="font-semibold text-primary-800">{T(stage.label.bn, stage.label.en)} · {num(stageIndex + 1, lang)}/{num(TOMATO_HARVEST_STAGES.length, lang)}</span>
          <span className="truncate text-right">{T(fmtBangla(to, 'bn'), fmtDate(to, 'en'))}</span>
        </div>
      </div>
    </section>
  );
}
