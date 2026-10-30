// "দশ বছরের উত্তরাধিকার": the story campaign of মাঠের মানুষ (story, choices and real-year weather in src/game/saga.js).
// Each chapter plays as cinematic scenes (the 3D figure of whoever speaks, over a real photo, the line spoken in
// Bangla), the father's notebook, family and village choices that move four meters, and a season played in the 3D
// field with that year's real Dhamrai heat and storms, or run quickly from the choices made. Then 2045.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CloudLightning, Coins, Droplets, Gamepad2, Heart, Layers, Mic, MicOff, RotateCcw, Sun, Sprout, Telescope, Thermometer, Users, FastForward, CloudRain } from 'lucide-react';
import Photo from '../../components/Photo';
import { Tags } from '../../components/ui';
import { useStore, loadClimate } from '../../store';
import { num } from '../../engine/dates';
import { REGIONS } from '../../game/regions';
import { createPreview } from '../../game/three/stage';
import { speak, stopSpeaking, ttsSupported } from '../../voice/speech';
import { GameStage } from './FarmGame';
import { CAST, CHAPTERS, START, METERS, NOTEBOOK, ENDINGS, SAGA_KEY, applyFx, seasonOf, seasonFx, quickSeason, ending, letter, future } from '../../game/saga';

const VOICE_KEY = 'fs360.saga.voice';
const lookOf = (who) => (who === 'razib' ? REGIONS.razib.farmer.look : CAST[who]?.look);
const fresh = () => ({ k: 0, i: -1, meters: START, choices: {}, picked: null, seasons: {} });
const read = () => { try { return JSON.parse(localStorage.getItem(SAGA_KEY) || 'null'); } catch { return null; } };
const NOTE_YEAR = { heat: 2023, rain: 2024, storm: 2025 };

export default function Saga() {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const [st, setSt] = useState(() => read() ?? fresh());
  const [clim, setClim] = useState(null);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem(VOICE_KEY) !== '0'; } catch { return true; } });
  const [playing, setPlaying] = useState(null); // year being played in 3D
  useEffect(() => { loadClimate('dhamrai').then(setClim, () => setClim(null)); }, []);
  useEffect(() => { try { localStorage.setItem(SAGA_KEY, JSON.stringify(st)); } catch { /* storage blocked */ } }, [st]);
  useEffect(() => { try { localStorage.setItem(VOICE_KEY, voice ? '1' : '0'); } catch { /* storage blocked */ } if (!voice) stopSpeaking(); }, [voice]);
  useEffect(() => () => stopSpeaking(), []);
  const seasons = useMemo(() => (clim ? Object.fromEntries([2023, 2024, 2025].map((y) => [y, seasonOf(clim, y)])) : {}), [clim]);

  const ch = CHAPTERS[st.k];
  const step = st.i < 0 ? null : ch.steps[st.i];
  const next = useCallback(() => setSt((p) => {
    const c = CHAPTERS[p.k];
    if (p.i + 1 < c.steps.length) return { ...p, i: p.i + 1, picked: null };
    if (p.k + 1 < CHAPTERS.length) return { ...p, k: p.k + 1, i: -1, picked: null };
    return p;
  }), []);
  const restart = () => { stopSpeaking(); setSt(fresh()); };
  useEffect(() => { window.scrollTo({ top: 0 }); }, [st.k, st.i]);

  if (playing) {
    return (
      <div className="page-shell pb-24 pt-[100px] sm:pt-[112px]" data-no-reveal>
        <GameStage who="razib" mods={seasons[playing]?.mods}
          onEnd={(r) => { setSt((p) => ({ ...p, seasons: { ...p.seasons, [playing]: r }, meters: applyFx(p.meters, seasonFx(r)) })); setPlaying(null); }}
          onRestart={() => { setPlaying(null); setTimeout(() => setPlaying(playing), 0); }}
          onQuit={() => setPlaying(null)} />
      </div>
    );
  }

  return (
    <div className="page-shell pb-24 pt-[100px] sm:pt-[112px]" data-no-reveal>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Meters m={st.meters} />
        <div className="flex items-center gap-2">
          {ttsSupported() && <button type="button" onClick={() => setVoice(!voice)} aria-pressed={voice} className="glass-pill inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold">{voice ? <Mic size={15} /> : <MicOff size={15} />}{voice ? T('কণ্ঠ চালু', 'Voice on') : T('কণ্ঠ বন্ধ', 'Voice off')}</button>}
          {(st.k > 0 || st.i >= 0) && <button type="button" onClick={restart} className="glass-pill inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold"><RotateCcw size={15} />{T('নতুন করে শুরু', 'Start over')}</button>}
        </div>
      </div>
      {st.i < 0 && <TitleCard ch={ch} first={st.k === 0} onGo={next} />}
      {step?.scene && <Scene key={`${st.k}-${st.i}`} scene={step.scene} voice={voice} onDone={next} />}
      {step?.notebook && <Notebook key={`${st.k}-${st.i}`} upTo={step.notebook} seasons={seasons} onDone={next} />}
      {step?.choice && <Choice key={`${st.k}-${st.i}`} c={step.choice} picked={st.picked}
        onPick={(o) => setSt((p) => ({ ...p, picked: o.id, choices: { ...p.choices, [step.choice.id]: o.id }, meters: applyFx(p.meters, o.fx) }))} onDone={next} />}
      {step?.season && <Season key={`${st.k}-${st.i}`} year={step.season} info={seasons[step.season]} result={st.seasons[step.season]}
        onPlay={() => setPlaying(step.season)}
        onQuick={() => { const r = quickSeason(seasons[step.season].mods, st.choices); setSt((p) => ({ ...p, seasons: { ...p.seasons, [step.season]: r }, meters: applyFx(p.meters, seasonFx(r)) })); }}
        onDone={next} />}
      {step?.ending && <Ending st={st} voice={voice} onReplay={restart} />}
      <p className="mt-6 text-center text-[12.5px] text-muted">{T('মানুষ আর ঘটনা বানানো; প্রতিটি মৌসুমের গরম, বৃষ্টি আর ঝড় ধামরাইয়ের আসল নাসা POWER তথ্য, ২০৪৫ নাসার CMIP6 জলবায়ু মডেলে।', 'The people and events are invented; each season’s heat, rain and storms are Dhamrai’s real NASA POWER data, and 2045 is in NASA’s CMIP6 climate models.')}</p>
    </div>
  );
}

function Meters({ m }) {
  const { T, L, s } = useStore();
  const icon = { soil: Layers, water: Droplets, family: Heart, village: Users };
  return (
    <div className="grid grow grid-cols-2 gap-2 sm:flex sm:grow-0">
      {METERS.map((x) => { const I = icon[x.k]; return (
        <div key={x.k} className="glass flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2 sm:min-w-[130px]">
          <I size={16} className="shrink-0 text-primary-700" />
          <div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-[11.5px] font-semibold text-muted"><span className="truncate">{L(x)}</span><b className="tabular text-ink">{num(m[x.k], s.lang)}</b></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[.07]"><div className="h-full rounded-full bg-primary-500 transition-[width] duration-700" style={{ width: `${m[x.k]}%` }} /></div></div>
        </div>
      ); })}
      <div className="glass col-span-2 flex items-center gap-2 rounded-2xl px-3 py-2 sm:col-span-1"><Coins size={16} className="text-paddy-600" /><span className="text-[11.5px] font-semibold text-muted">{T('সঞ্চয়', 'Savings')}</span><b className="ml-auto tabular text-[14px]">{T(`${num(m.savings, 'bn')} টাকা`, `Tk ${num(m.savings, 'en')}`)}</b></div>
    </div>
  );
}

function TitleCard({ ch, first, onGo }) {
  const { T, L } = useStore();
  const photo = { prologue: 'dhamraiBridge', y2023: 'landParcels', y2024: 'seedlings', y2025: 'sunsetFields', epilogue: 'heroDawn' }[ch.id];
  return (
    <section className="scene-in relative isolate flex min-h-[70svh] items-end overflow-hidden rounded-[30px] bg-primary-950 text-white shadow-[var(--shadow-lift)]">
      <div className="kenburns absolute inset-0 -z-10" style={{ '--kb-from': 'scale(1.15)', '--kb-to': 'scale(1.02)' }}><Photo name={photo} fill sizes="100vw" decorative /></div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,20,12,.25),rgba(8,20,12,.92))]" />
      <div className="max-w-3xl p-7 sm:p-12">
        {first && <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur"><Gamepad2 size={15} />{T('মাঠের মানুষ · গল্পের অভিযান', 'Field Folk · story campaign')}</p>}
        <p className="text-[14px] font-semibold uppercase tracking-[.22em] text-paddy-300">{L(ch.title)}</p>
        <h1 className="font-display mt-2 text-[44px] font-bold leading-[1.05] sm:text-[72px]">{first ? T('দশ বছরের উত্তরাধিকার', 'The Ten-Year Inheritance') : L(ch.heading)}</h1>
        {first && <p className="mt-4 max-w-2xl text-[17px] leading-8 text-white/85">{T('বাবা অসুস্থ। দুই বিঘা জমি আর চল্লিশ বছরের পুরোনো একটা খাতা এখন আপনার। কিন্তু খাতার আবহাওয়া আর আসে না। তিনটি আসল মৌসুম, তিনটি কঠিন সিদ্ধান্ত, আর ২০৪৫ সালে আপনার মেয়ে পাবে যা আপনি রেখে যাবেন।', 'Your father is ill. Two bigha and a forty-year-old notebook are yours now. But the notebook’s weather no longer comes. Three real seasons, hard choices, and in 2045 your daughter inherits whatever you leave.')}</p>}
        {!first && <p className="mt-2 text-[20px] text-white/80">{L(ch.heading)}</p>}
        <button type="button" onClick={onGo} autoFocus className="btn-gloss mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[17px] font-semibold">{first ? T('গল্প শুরু করুন', 'Begin the story') : T('চলুন', 'Continue')}<ArrowRight size={18} /></button>
      </div>
    </section>
  );
}

// A turning 3D figure of whoever is speaking.
function Figure({ who }) {
  const ref = useRef(null), pv = useRef(null);
  useEffect(() => {
    try { pv.current = createPreview(ref.current, lookOf(who)); } catch { pv.current = null; }
    return () => pv.current?.dispose();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const lk = lookOf(who); if (lk) pv.current?.set(lk); }, [who]);
  return <canvas ref={ref} className="block h-full w-full" aria-hidden="true" />;
}

function Scene({ scene, voice, onDone }) {
  const { T, L, s } = useStore();
  const [n, setN] = useState(0);
  const [who, text] = (() => { const l = scene.lines[n]; return [l[0], s.lang === 'bn' ? l[1] : l[2]]; })();
  const person = who !== 'narrator';
  useEffect(() => { if (voice) speak(text, s.lang, { rate: 0.95 }); return () => stopSpeaking(); }, [text, voice, s.lang]);
  const go = useCallback(() => { if (n + 1 < scene.lines.length) setN(n + 1); else onDone(); }, [n, scene.lines.length, onDone]);
  useEffect(() => {
    const k = (e) => {
      if (e.target instanceof Element && e.target.closest('button, a, input, textarea, select, [role="tab"], [role="menuitem"], [contenteditable="true"]')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); go(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [go]);
  return (
    <section className="scene-in relative isolate min-h-[74svh] overflow-hidden rounded-[30px] bg-primary-950 text-white shadow-[var(--shadow-lift)]" onClick={go} role="button" tabIndex={0} aria-label={T('পরের কথা', 'Next line')}>
      <div className="kenburns absolute inset-0 -z-10" style={{ '--kb-from': 'scale(1.12)', '--kb-to': 'scale(1.02)' }}><Photo name={scene.photo} fill sizes="100vw" decorative /></div>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,20,12,.15)_0%,rgba(8,20,12,.4)_50%,rgba(8,20,12,.94)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-8 bg-black sm:h-12" aria-hidden="true" />
      {person && <div className="pointer-events-none absolute bottom-[150px] right-0 h-[58%] w-[62%] sm:bottom-6 sm:right-6 sm:h-[86%] sm:w-[40%]"><Figure who={who} /></div>}
      <div className={`absolute inset-x-0 bottom-0 p-5 sm:p-9 ${person ? 'sm:pr-[42%]' : ''}`}>
        {person && <p className="mb-2 inline-flex items-baseline gap-2 rounded-full bg-paddy-300 px-3.5 py-1 text-primary-950"><b className="text-[15px]">{L(CAST[who].name)}</b><span className="text-[12px] font-semibold opacity-75">{L(CAST[who].role)}</span></p>}
        <p key={n} className={`max-w-3xl leading-[1.6] ${person ? 'text-[19px] sm:text-[24px]' : 'text-[18px] italic text-white/90 sm:text-[22px]'}`}>
          {text.split(' ').map((w, i) => <span key={i}><span className="word" style={{ '--wd': `${i * 32}ms` }}>{w}</span>{' '}</span>)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-[12.5px] text-white/70">
          <span className="flex gap-1" aria-hidden="true">{scene.lines.map((_, i) => <i key={i} className={`h-1.5 rounded-full ${i === n ? 'w-5 bg-paddy-300' : 'w-1.5 bg-white/40'}`} />)}</span>
          <span className="inline-flex items-center gap-1">{T('চাপুন বা Enter', 'Tap or press Enter')}<ArrowRight size={14} /></span>
        </div>
      </div>
    </section>
  );
}

function Notebook({ upTo, seasons, onDone }) {
  const { T, L, s } = useStore();
  const n = (v) => num(v, s.lang);
  const shown = upTo === true ? [] : NOTEBOOK.slice(0, NOTEBOOK.findIndex((x) => x.id === upTo) + 1);
  const fix = (id) => {
    const y = NOTE_YEAR[id], x = seasons[y];
    if (!x) return null;
    if (id === 'heat') return T(`${n(y)}: মার্চ-এপ্রিলে ${n(x.now.hot)} দিন ৩৫°-এর বেশি (বাবার সময়ের মতো বছরে সাধারণত ${n(x.usual.hot)} দিন)। বোরোর ফুল আসে ঠিক এই সপ্তাহগুলোয়: গরম ফুলে লাগে।`, `${y}: ${x.now.hot} days above 35 °C in March–April (usually ${x.usual.hot}). Boro flowers in exactly these weeks: the heat does reach the flowers.`);
    if (id === 'rain') return T(`${n(y)}: রবিতে (নভেম্বর-ফেব্রুয়ারি) ${n(x.now.rabiRain)} মিমি বৃষ্টি, সাধারণত ${n(x.usual.rabiRain)} মিমি। রবির আকাশ আর নিশ্চিত শুকনো নয়।`, `${y}: ${x.now.rabiRain} mm of rain in the Rabi (November–February), usually ${x.usual.rabiRain} mm. The Rabi sky is no longer sure to stay dry.`);
    return T(`${n(y)}: মার্চ থেকে মে-র মধ্যে টানা তিন দিনে ${n(x.now.storm)} মিমি বৃষ্টি, সাধারণত ${n(x.usual.storm)} মিমি। ঝড় এখন বৈশাখের আগেই আসে।`, `${y}: ${x.now.storm} mm in three days between March and May, usually ${x.usual.storm} mm. The storms now come before Boishakh.`);
  };
  return (
    <section className="scene-in mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-[22px] bg-[#f6efdc] p-6 text-[#3b2f20] shadow-[var(--shadow-lift)] ring-1 ring-[#d9c9a3] sm:p-9" style={{ backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 33px, rgba(120,90,40,.16) 33px 34px)' }}>
        <span className="absolute inset-y-0 left-10 w-px bg-red-300/70" aria-hidden="true" />
        <p className="flex items-center gap-2 pl-6 text-[13px] font-bold uppercase tracking-[.18em] text-[#8a6a3a]"><BookOpen size={16} />{T('বাবার খাতা', 'Father’s notebook')}</p>
        <ol className="mt-4 space-y-5 pl-6">
          {NOTEBOOK.map((x) => {
            const open = shown.some((v) => v.id === x.id);
            return (
              <li key={x.id}>
                <p className={`font-display text-[19px] italic leading-8 ${open ? 'line-through decoration-red-500/70 decoration-2' : ''}`}>“{L(x.baba)}”</p>
                {open && <p className="outcome-in mt-1 flex gap-2 text-[15.5px] leading-7 text-[#1f5a2a]"><Sprout size={17} className="mt-1.5 shrink-0" /><span><b>{T('রাজিবের লেখা: ', 'Razib adds: ')}</b>{fix(x.id) ?? '…'}</span></p>}
              </li>
            );
          })}
        </ol>
        {shown.length > 0 && <div className="mt-4 pl-6"><Tags list={['REAL']} /></div>}
      </div>
      <p className="mt-3 text-center text-[14px] text-muted">{upTo === true ? T('খাতার প্রতিটি কথা এই তিন বছরে আসল আবহাওয়ার সামনে দাঁড়াবে।', 'Over three years each line of the notebook will meet the real weather.') : T('ধামরাইয়ের আসল নাসা POWER তথ্য, ২০০১–২০২৫-এর সাধারণ বছরের সঙ্গে তুলনা।', 'Dhamrai’s real NASA POWER data, against the usual year of 2001–2025.')}</p>
      <div className="mt-5 text-center"><button type="button" onClick={onDone} autoFocus className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold">{T('চলুন', 'Continue')}<ArrowRight size={17} /></button></div>
    </section>
  );
}

function Choice({ c, picked, onPick, onDone }) {
  const { T, L, s } = useStore();
  const opt = c.options.find((o) => o.id === picked);
  return (
    <section className="scene-in mx-auto max-w-3xl">
      <p className="font-display text-center text-[30px] font-bold sm:text-[40px]">{L(c.ask)}</p>
      <div className="mt-6 space-y-3">
        {c.options.map((o, i) => (
          <button key={o.id} type="button" disabled={!!picked} onClick={() => onPick(o)}
            className={`tool-card tool-deal glass flat flex w-full items-center gap-4 rounded-[22px] p-5 text-left transition-all ${picked ? (o.id === picked ? 'ring-2 ring-primary-500' : 'opacity-40') : 'hover:-translate-y-0.5 hover:shadow-lg'}`} style={{ '--n': i }}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-700 text-[15px] font-bold text-white">{T(['ক', 'খ', 'গ'][i], 'ABC'[i])}</span>
            <span className="text-[17px] font-semibold leading-snug">{L(o.label)}</span>
          </button>
        ))}
      </div>
      {opt && (
        <div className="outcome-in mt-5 rounded-[22px] bg-primary-950 p-5 text-white">
          <p className="text-[17px] leading-8">{L(opt.after)}</p>
          <div className="mt-3 flex flex-wrap gap-2">{Object.entries(opt.fx).map(([k, v]) => (
            <span key={k} className={`rounded-full px-3 py-1 text-[13px] font-bold ${v > 0 ? 'bg-primary-500/30 text-primary-100' : 'bg-red-500/30 text-red-100'}`}>{L(METERS.find((m) => m.k === k) ?? { bn: 'সঞ্চয়', en: 'Savings' })} {v > 0 ? '+' : '−'}{num(Math.abs(v), s.lang)}{k === 'savings' ? T(' টাকা', ' Tk') : ''}</span>
          ))}</div>
          <button type="button" onClick={onDone} autoFocus className="btn-gloss mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold">{T('চলুন', 'Continue')}<ArrowRight size={17} /></button>
        </div>
      )}
    </section>
  );
}

function Season({ year, info, result, onPlay, onQuick, onDone }) {
  const { T, s } = useStore();
  const n = (v, o) => num(v, s.lang, o);
  if (!info) return <div className="glass h-64 animate-pulse rounded-[30px]" />;
  const x = info.now, u = info.usual;
  const facts = [
    [Thermometer, T('মার্চ-এপ্রিলে ৩৫°+ দিন', 'Days of 35 °C+ in Mar–Apr'), x.hot, u.hot, info.mods.heat],
    [CloudRain, T('রবির বৃষ্টি (মিমি)', 'Rabi rain (mm)'), x.rabiRain, u.rabiRain, info.mods.pests],
    [CloudLightning, T('বৈশাখের আগের ঝড়, ৩ দিনে (মিমি)', 'Pre-monsoon storm, 3 days (mm)'), x.storm, u.storm, info.mods.storm],
  ];
  const fmtX = (m) => `×${n(m, { dp: 1 })}`;
  return (
    <section className="scene-in mx-auto max-w-4xl">
      <div className="relative isolate overflow-hidden rounded-[30px] bg-primary-950 p-6 text-white shadow-[var(--shadow-lift)] sm:p-9">
        <div className="absolute inset-0 -z-10 opacity-45"><Photo name="droughtFlood" fill sizes="100vw" decorative /></div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,20,12,.6),rgba(8,20,12,.92))]" />
        <p className="text-[13px] font-bold uppercase tracking-[.2em] text-paddy-300">{T(`মৌসুম · রবি ${n(year - 1).replace(',', '')}–${n(year % 100)}`, `Season · Rabi ${year - 1}–${year % 100}`)}</p>
        <h2 className="font-display mt-1 text-[32px] font-bold sm:text-[44px]">{T(`ধামরাইয়ের আসল ${n(year).replace(',', '')}`, `Dhamrai’s real ${year}`)}</h2>
        <p className="mt-2 max-w-2xl text-[15.5px] leading-7 text-white/80">{T('এই মৌসুমের মাঠে গরম, ঝড় আর পোকা ঠিক ততটা কড়া, যতটা সেই বছর আসলে ছিল।', 'In this season’s field the heat, storm and pests are exactly as strong as that year really was.')}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {facts.map(([I, l, a, b, m]) => (
            <div key={l} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
              <I size={18} className="text-paddy-300" />
              <p className="mt-2 text-[12.5px] text-white/75">{l}</p>
              <p className="font-display text-[26px] font-bold tabular">{n(a)} <span className="text-[14px] font-semibold text-white/60">{T(`সাধারণত ${n(b)}`, `usually ${b}`)}</span></p>
              <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-bold ${m > 1.05 ? 'bg-red-500/40' : m < 0.95 ? 'bg-primary-500/40' : 'bg-white/20'}`}>{T('খেলায় শক্তি ', 'Strength in play ')}{fmtX(m)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3"><Tags list={['REAL', 'RULE']} /></div>
        {!result ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={onPlay} autoFocus className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[16px] font-semibold"><Gamepad2 size={18} />{T('৩D মাঠে মৌসুমটা খেলুন', 'Play the season in the 3D field')}</button>
            <button type="button" onClick={onQuick} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3.5 text-[16px] font-semibold hover:bg-white/25"><FastForward size={18} />{T('সংক্ষেপে চালান (১ মিনিট)', 'Run it quickly (1 minute)')}</button>
          </div>
        ) : (
          <div className="outcome-in mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-[16px] font-semibold">{result.quick ? T('মৌসুম পার হলো (সংক্ষেপে, আপনার সিদ্ধান্ত ধরে)।', 'The season is over (run quickly, from your choices).') : T('মৌসুম পার হলো, নিজের হাতে।', 'The season is over, by your own hand.')}</p>
            <p className="mt-1 text-[14.5px] text-white/80">{T(`বিক্রি ${n(result.count.earned)}, নষ্ট হওয়া ফসল ${n(result.count.lost)}টি জমিতে।`, `Sold ${result.count.earned}, crop lost on ${result.count.lost} plots.`)}</p>
            <button type="button" onClick={onDone} autoFocus className="btn-gloss mt-3 inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold">{T('চলুন', 'Continue')}<ArrowRight size={17} /></button>
          </div>
        )}
      </div>
    </section>
  );
}

function Ending({ st, voice, onReplay }) {
  const { T, L, s } = useStore();
  const n = (v, o) => num(v, s.lang, o);
  const key = ending(st.meters, st.choices);
  const E = ENDINGS[key];
  const f = useMemo(() => future('dhamrai'), []);
  const [shown, setShown] = useState(false);
  const lines = letter(st.choices);
  return (
    <section className="scene-in">
      {!shown ? <Scene scene={{ photo: key === 'tired' ? 'droughtFlood' : key === 'city' ? 'dhamraiBridge' : 'riceHarvest', lines: E.lines }} voice={voice} onDone={() => setShown(true)} /> : (
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[13px] font-bold uppercase tracking-[.22em] text-primary-700">{T('আপনার উত্তরাধিকার', 'Your inheritance')}</p>
          <h1 className="font-display mt-2 text-[44px] font-bold sm:text-[60px]">{L(E.title)}</h1>
          {f && (
            <div className="glass mt-5 flex items-start gap-3 rounded-[22px] p-4 text-left">
              <Telescope size={20} className="mt-1 shrink-0 text-sky-700" />
              <p className="text-[15px] leading-7">{T(`নাসার ${n(f.models)}টি জলবায়ু মডেলে (NEX-GDDP-CMIP6, মাঝারি পথ) ২০৪০-এর দশকে ধামরাইয়ের দিন গড়ে ${n(f.dTmax, { dp: 1 })}° বেশি গরম, বছরের বৃষ্টি ${n(Math.abs(f.rainPct), { dp: 0 })}% ${f.rainPct < 0 ? 'কম' : 'বেশি'}।`, `In NASA’s ${f.models} climate models (NEX-GDDP-CMIP6, middle pathway), Dhamrai’s days in the 2040s are ${f.dTmax.toFixed(1)}° hotter on average, and a year’s rain ${Math.abs(f.rainPct).toFixed(0)}% ${f.rainPct < 0 ? 'less' : 'more'}.`)} <Tags list={['REAL']} /></p>
            </div>
          )}
          <div className="mt-6 rounded-[22px] bg-[#f6efdc] p-6 text-left text-[#3b2f20] shadow-[var(--shadow-card)] ring-1 ring-[#d9c9a3]">
            <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.18em] text-[#8a6a3a]"><BookOpen size={16} />{T('খাতার শেষ পাতা: নদীর জন্য', 'The notebook’s last page: for Nodi')}</p>
            <p className="font-display mt-3 text-[18px] italic">{T('মা নদী,', 'Nodi, my girl,')}</p>
            <ul className="mt-2 space-y-2 font-display text-[17px] italic leading-8">{lines.map((l) => <li key={l.en}>{L(l)}</li>)}</ul>
            <p className="font-display mt-3 text-[18px] italic">{T('তোর বাবা', 'Your father')}</p>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onReplay} className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold"><RotateCcw size={17} />{T('অন্য পথে আবার খেলুন', 'Play again another way')}</button>
            <Link to="/farmer/future" className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold"><Sun size={17} />{T('আসল জমির ১০ বছর দেখুন', 'See a real field’s ten years')}</Link>
          </div>
        </div>
      )}
    </section>
  );
}
