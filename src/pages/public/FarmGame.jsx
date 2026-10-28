// "মাঠের মানুষ" — a 3D third-person farm game. Pick one of the five neighbouring-country farmers from the app
// (India, Pakistan, Nepal, Bhutan, Myanmar), hear their story, drop from satellite height onto their own land, and
// farm a season through heat, pests, a storm with a closing safe zone, and a price crash — with FieldShift's
// warnings on the phone. The 3D world lives in src/game/three; the rules in src/game/sim.js.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Gauge, Coins, Droplets, ShoppingBasket, Satellite, Smartphone, Volume2, VolumeX, Hand, Sun, Moon, CloudLightning, Bug, TrendingDown, Star, RotateCcw, Users, Sprout, Check, X, ArrowRight, Sparkles, Info, Pause, Play, LogOut, MapPin, ShieldAlert, Footprints, Keyboard, Globe2, Glasses, View } from 'lucide-react';
import { useStore } from '../../store';
import { scrollToTop } from '../../components/Motion';
import { num } from '../../engine/dates';
import { bnOf } from '../../engine/text';
import { REGIONS, FARMER_IDS, BD_IDS, ABROAD_IDS, QUESTS, NDVI_LEGEND } from '../../game/regions';
import { PLACES } from '../../game/places';
import { createGame, buy, answerQuiz, priceOf, dayOf, isNight, clock, quizOf, canMax, target, ripeAt } from '../../game/sim';
import { createStage, createPreview, portraits, xrModes, QUALITY_KEY } from '../../game/three/stage';
import { play, setMuted, startAmbience, stopAmbience, setScene, setMusic } from '../../game/sound';

const MUTE_KEY = 'fs360.game.muted';
const MUSIC_KEY = 'fs360.game.music';
const BEST_KEY = 'fs360.game.best';
const readBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch { return {}; } };
export const starsOf = (r) => { const lost = r?.count.lost ?? 0, hurt = r?.count.hurt ?? 0; return lost <= 1 && !hurt ? 3 : lost <= 4 ? 2 : 1; };
const fill = (s, R) => s.replace('{cur}', R.cur);
// The compass strip: a mark every 15°, letters at the eight points (Bangla উ পূ দ প, or N E S W).
const POINTS = { 0: ['উ', 'N'], 45: ['উপূ', 'NE'], 90: ['পূ', 'E'], 135: ['দপূ', 'SE'], 180: ['দ', 'S'], 225: ['দপ', 'SW'], 270: ['প', 'W'], 315: ['উপ', 'NW'] };
const COMPASS = Array.from({ length: 49 }, (_, k) => { const d = -360 + k * 15; return [d, POINTS[((d % 360) + 360) % 360] ?? null]; });

export default function FarmGame() {
  const [screen, setScreen] = useState('select'); // select | brief | play | end
  const [who, setWho] = useState(FARMER_IDS[0]);
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);
  useEffect(() => { scrollToTop(true); }, [screen]);
  return (
    <div className="page-shell pb-24 pt-[100px] sm:pt-[112px]" data-no-reveal>
      {screen === 'select' && <SelectScreen who={who} setWho={setWho} onGo={() => setScreen('brief')} />}
      {screen === 'brief' && <BriefScreen who={who} onBack={() => setScreen('select')} onDone={() => { setRun((r) => r + 1); setScreen('play'); }} />}
      {screen === 'play' && <GameStage key={run} who={who} onEnd={(r) => { setResult(r); setScreen('end'); }} onRestart={() => setRun((r) => r + 1)} onQuit={() => setScreen('select')} />}
      {screen === 'end' && <EndScreen who={who} r={result} onReplay={() => { setRun((r) => r + 1); setScreen('play'); }} onPick={() => setScreen('select')} />}
    </div>
  );
}

// A turning 3D figure of the farmer.
function Preview({ id, mood = 'idle', className = '' }) {
  const ref = useRef(null), pv = useRef(null);
  useEffect(() => {
    try { pv.current = createPreview(ref.current, REGIONS[id].farmer.look); } catch { pv.current = null; }
    return () => pv.current?.dispose();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pv.current?.set(REGIONS[id].farmer.look); }, [id]);
  useEffect(() => { pv.current?.mode(mood); }, [mood]);
  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}
let portraitCache = null;
function usePortraits() {
  const [pics, setPics] = useState(portraitCache);
  useEffect(() => {
    if (portraitCache) return;
    // drawn when the browser is idle, so the picker opens first
    const ric = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 60));
    const t = ric(() => { try { portraitCache = portraits(FARMER_IDS.map((id) => REGIONS[id].farmer.look)); setPics(portraitCache); } catch { /* no WebGL */ } }, { timeout: 1200 });
    return () => (window.cancelIdleCallback ?? clearTimeout)(t);
  }, []);
  return pics;
}
const TONE = { bangladesh: ['#2e9d5a', '#0f3d26'], india: ['#f4a23a', '#1f7a3a'], pakistan: ['#1f7a4a', '#0f3d26'], nepal: ['#c8283a', '#23407a'], bhutan: ['#f2b23a', '#d0572a'], myanmar: ['#f2c21b', '#2e8b57'] };
const stage = (cc) => `radial-gradient(110% 80% at 50% 85%, ${TONE[cc][0]}55, transparent 60%), linear-gradient(180deg, #0f2418 0%, #163a26 55%, ${TONE[cc][1]} 140%)`;

function SelectScreen({ who, setWho, onGo }) {
  const { T, L } = useStore();
  const pics = usePortraits();
  const best = readBest();
  const won = FARMER_IDS.filter((id) => best[id]).length;
  const [light, setLight] = useState(() => { try { return localStorage.getItem(QUALITY_KEY) === 'light'; } catch { return false; } });
  const setQuality = (v) => { setLight(v); try { localStorage.setItem(QUALITY_KEY, v ? 'light' : 'full'); } catch { /* storage unavailable */ } };
  const R = REGIONS[who], F = R.farmer;
  return (
    <section className="scene-in">
      <div className="max-w-3xl">
        <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Globe2 size={15} />{T('খামারের খেলা · ১২ জন কৃষক, ৬ দেশ', 'The farm game · 12 farmers, 6 countries')}</p>
        <h1 className="mt-4 text-[40px] font-semibold leading-[1.12] tracking-[-0.03em] sm:text-[56px]">{T('মাঠের মানুষ', 'Field Folk')} <span className="bg-[linear-gradient(100deg,#1e5c22_0%,#3d8c34_40%,#1d717a_100%)] bg-clip-text text-transparent">3D</span></h1>
        <p className="mt-3 max-w-2xl text-[17px] leading-[1.65] text-ink/70">{T('বাংলাদেশের সাত বিভাগের সাতজন আর প্রতিবেশী পাঁচ দেশের পাঁচজন কৃষক — অ্যাপে যাঁদের অ্যাকাউন্ট আছে। প্রত্যেকের নিজের মাটি, নিজের পোশাক, নিজের ফসল আর নিজের বিপদ। একজনকে বেছে নিন, উপগ্রহ থেকে তাঁর মাঠে নামুন, আর পুরো একটা মৌসুম পার করুন।', 'Seven farmers from Bangladesh\u2019s seven divisions and five from the neighbouring countries \u2014 the ones with accounts in the app. Each has their own soil, their own clothes, their own crops and their own dangers. Pick one, drop from orbit onto their field, and see a whole season through.')}</p>
      </div>
      <Link to="/saga" className="mt-5 flex items-center gap-3 rounded-2xl border border-paddy-300/70 bg-paddy-50 p-4 text-[15px] font-semibold text-primary-950 transition hover:-translate-y-0.5 hover:shadow-md">
        <Sparkles size={20} className="shrink-0 text-paddy-600" />
        <span className="min-w-0 flex-1">{T('গল্পের অভিযান: রাজিবের "দশ বছরের উত্তরাধিকার", ধামরাইয়ের আসল তিন মৌসুমে', 'Story campaign: Razib’s “Ten-Year Inheritance”, in three real Dhamrai seasons')}</span>
        <ArrowRight size={18} className="shrink-0" />
      </Link>
      <div className="mt-7 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        {/* the chosen farmer, standing on their own ground */}
        <div className="relative min-h-[500px] overflow-hidden rounded-[30px] text-white shadow-[var(--shadow-lift)] lg:sticky lg:top-24 lg:self-start lg:h-[min(680px,calc(100svh-120px))]" style={{ background: stage(R.country) }}>
          {/* subtle animated radial glow behind the character */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(55% 55% at 50% 90%, ${TONE[R.country][0]}55 0%, transparent 70%)`, animation: 'fade-in 1.2s ease both' }} />
          <div className="absolute inset-x-0 bottom-0 top-8"><Preview id={who} mood="idle" /></div>
          <div className="relative p-5 sm:p-6">
            <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[.12em] text-white/70"><span className="text-[20px]">{R.flag}</span>{L(R.place)}</p>
            <p className="font-display mt-1 text-[34px] font-bold leading-tight sm:text-[40px]">{L(F)}</p>
            <p className="text-[15px] text-white/75 mt-0.5">{F.local ? `${F.local} · ` : ''}{L(F.trait)}</p>
          </div>
          {/* bottom info strip */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-5 pt-20 sm:p-6 sm:pt-24">
            <div className="flex flex-wrap gap-1.5">{F.dress.map((d) => <span key={d.en} className="rounded-full bg-white/15 px-2.5 py-1 text-[12.5px] font-semibold ring-1 ring-white/20 backdrop-blur">{L(d)}</span>)}</div>
            <p className="mt-2.5 flex items-start gap-2 text-[14px] leading-6 text-white/85"><ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-300" />{L(R.place.hazard)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {[[BD_IDS, T('বাংলাদেশ · সাত বিভাগ', 'Bangladesh · seven divisions')], [ABROAD_IDS, T('প্রতিবেশী দেশ', 'Neighbouring countries')]].map(([ids, title]) => (
            <div key={title}>
              <p className="mb-1.5 mt-1 text-[12.5px] font-bold uppercase tracking-[.12em] text-primary-700">{title}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ids.map((id) => {
                  const r = REGIONS[id], on = id === who, n = FARMER_IDS.indexOf(id);
                  return (
                    <button key={id} type="button" onClick={() => { setWho(id); play('tap'); }} aria-pressed={on} style={{ '--n': n }}
                      className={`surface-card lift group flex items-center gap-2.5 rounded-[20px] p-2.5 pr-3 text-left transition-all duration-200 active:scale-[0.97] ${on ? 'ring-2 ring-primary-600 !bg-white shadow-lg' : 'border border-border/70 bg-white/75 hover:bg-white hover:border-primary-300 hover:shadow-sm'}`}>
                      <span className="relative grid h-[64px] w-[56px] shrink-0 place-items-end overflow-hidden rounded-[14px] shadow-sm" style={{ background: stage(r.country) }}>
                        {pics ? <img src={pics[n]} alt="" className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-110" /> : <span className="m-auto text-[26px]">{r.flag}</span>}
                        {on && <span className="absolute inset-0 rounded-[14px] ring-2 ring-primary-500" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 truncate text-[11.5px] font-semibold text-muted"><span>{r.flag}</span>{r.division ? L(r.division) : L(r.place)}</span>
                        <span className="font-display block truncate text-[16px] font-bold leading-tight text-ink group-hover:text-primary-900 transition-colors">{L(r.farmer)}</span>
                        <span className="block truncate text-[12px] font-medium text-primary-700">{L(r.storm)}</span>
                      </span>
                      {best[id] && <span className="flex shrink-0 gap-0.5" aria-label={T(`সেরা ${num(best[id].stars, 'bn')} তারা`, `Best ${best[id].stars} stars`)}>{[0, 1, 2].map((k) => <Star key={k} size={12} className={k < best[id].stars ? 'fill-amber-300 text-amber-500' : 'text-ink/15'} />)}</span>}
                      {on && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-600 text-white shadow-2xs"><Check size={14} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-white/80 px-4 py-3 text-[13.5px]">
            <span className="flex items-center gap-1.5 font-semibold text-ink"><Star size={15} className="fill-amber-300 text-amber-500" />{T(`${num(won, 'bn')}/${num(FARMER_IDS.length, 'bn')} জনের মাঠে মৌসুম জয়`, `Season won on ${won} of ${FARMER_IDS.length} fields`)}</span>
            <button type="button" onClick={() => setQuality(!light)} aria-pressed={light} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 font-semibold text-ink/80 hover:bg-primary-50"><Gauge size={15} />{light ? T('গ্রাফিক্স: হালকা (দুর্বল ফোনে দ্রুত)', 'Graphics: light (fast on weak phones)') : T('গ্রাফিক্স: পূর্ণ', 'Graphics: full')}</button>
          </div>
          <button type="button" onClick={() => { play('tap'); onGo(); }} className="btn-gloss mt-3 inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-[17px] font-semibold text-white shadow-lg shadow-primary-950/25 hover:scale-[1.025] active:scale-[0.975] transition-transform duration-200">{T(`${bnOf(F.bn)} মাঠে চলুন`, `To ${F.en}'s field`)}<ArrowRight size={19} /></button>
          <p className="text-center text-[12.5px] text-muted">{T('এঁরা নমুনা মানুষ; জায়গা, ফসল আর বিপদের তথ্য সত্যি।', 'These are sample people; the places, crops and dangers are real.')}</p>
        </div>
      </div>
    </section>
  );
}

function Words({ text, step = 45 }) {
  const words = text.split(' ');
  return words.map((w, k) => <span key={`${text}-${k}`}><span className="word" style={{ '--wd': `${k * step}ms` }}>{w}</span>{k < words.length - 1 ? ' ' : ''}</span>);
}

function BriefScreen({ who, onDone, onBack }) {
  const { T, L, s } = useStore();
  const [i, setI] = useState(0);
  const R = REGIONS[who], F = R.farmer;
  const line = L(R.intro[i]).replace('{name}', s.lang === 'bn' ? F.bn : F.en);
  const last = i === R.intro.length - 1;
  return (
    <section className="scene-in mx-auto max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[400px] overflow-hidden rounded-[30px] shadow-[var(--shadow-lift)]" style={{ background: stage(R.country) }}>
          <div className="absolute inset-0"><Preview id={who} mood={last ? 'cheer' : 'idle'} /></div>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 50%)' }} />
          <p className="absolute left-5 top-4 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[.14em] text-white/80"><span className="text-[18px]">{R.flag}</span>{L(R.place.area)}</p>
          <p className="absolute bottom-4 left-5 right-5 text-[22px] font-bold text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,.5)]">{L(R.farmer)}</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="glass rounded-[26px] !bg-white/90 p-5 sm:p-6" aria-live="polite">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-primary-700">{L(F)} · {T(`${num(i + 1, 'bn')}/${num(R.intro.length, 'bn')}`, `${i + 1}/${R.intro.length}`)}</p>
            <p key={`${who}${i}`} className="mt-2 min-h-[100px] text-[20px] leading-[1.7] text-ink sm:text-[22px]"><Words text={line} /></p>
            <div className="mt-3 flex gap-1.5">{R.intro.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${k <= i ? 'bg-primary-600' : 'bg-black/10'}`} />)}</div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3"><button type="button" onClick={onBack} className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">{T('← অন্য কৃষক', '← Another farmer')}</button><button type="button" onClick={onDone} className="text-[14px] font-semibold text-muted hover:text-ink transition-colors">{T('গল্প বাদ দিন', 'Skip story')}</button></div>
              <button type="button" onClick={() => { play('tap'); last ? onDone() : setI(i + 1); }} className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 text-[16px] font-semibold text-white">
                {last ? T('উপগ্রহ থেকে নামুন!', 'Drop in from orbit!') : T('তারপর?', 'And then?')}<ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass rounded-[22px] p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-700"><MapPin size={14} />{T('এই মাঠে যা দেখবেন', 'On this land')}</p>
              <ul className="mt-2 space-y-1 text-[14px] text-ink/80">{R.place.local.map((x) => <li key={x.en}>· {L(x)}</li>)}</ul>
            </div>
            <div className="glass rounded-[22px] p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-primary-700"><Sprout size={14} />{T('ফসল', 'Crops')}</p>
              <ul className="mt-2 space-y-1 text-[14px] text-ink/80">{Object.values(R.crops).map((c) => <li key={c.en}>· {L(c)} <span className="text-muted">— {R.cur}{c.cost} → {R.cur}{c.price}</span></li>)}</ul>
              <p className="mt-2 flex items-start gap-1.5 text-[13px] text-red-700"><ShieldAlert size={14} className="mt-0.5 shrink-0" />{L(R.storm)}</p>
            </div>
          </div>
          <div className="glass flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[22px] px-4 py-3 text-[13px] text-ink/75">
            <span className="flex items-center gap-1.5 font-semibold text-ink"><Keyboard size={14} />{T('নিয়ন্ত্রণ', 'Controls')}</span>
            <span>WASD / ↑↓←→ {T('হাঁটা', 'walk')}</span><span>Shift {T('দৌড়', 'run')}</span><span>E / Space {T('কাজ', 'act')}</span><span>{T('মাউস টেনে চারপাশ দেখা', 'drag to look')}</span><span>1–4 {T('বীজ', 'seed')}</span><span>N {T('উপগ্রহ', 'satellite')}</span><span>Esc {T('বিরতি', 'pause')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- the game ----
const snapshot = (g) => ({
  money: g.money, can: g.can, canMax: canMax(g), seeds: { ...g.seeds }, sel: g.sel, basketN: Object.values(g.basket).reduce((a, b) => a + b, 0),
  quest: g.quest, count: { ...g.count }, ev: { heat: g.ev.heat, storm: g.ev.storm, glut: g.ev.glut, zone: g.ev.zone && { ...g.ev.zone }, flood: g.ev.flood }, day: dayOf(g), night: isNight(g), clock: clock(g), perks: { ...g.perks },
  pests: g.plots.filter((p) => p.pests).length, stamina: g.me.stamina, down: g.me.down, target: target(g), won: g.won, ripe: ripeAt(g),
  inZone: g.ev.zone ? Math.hypot(g.me.x - g.ev.zone.x, g.me.z - g.ev.zone.z) <= g.ev.zone.r : false,
});

export function GameStage({ who, mods, onEnd, onRestart, onQuit }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const R = REGIONS[who];
  const cv = useRef(null), overlay = useRef(null), mapRef = useRef(null), compassRef = useRef(null), rootRef = useRef(null);
  const gRef = useRef(null), st = useRef(null);
  if (!gRef.current) gRef.current = createGame(who, mods);
  const g = gRef.current;
  const [hud, setHud] = useState(() => snapshot(g));
  const [panel, setPanel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [toast, setToast] = useState(null);
  const [intro, setIntro] = useState(true);
  const [paused, setPaused] = useState(false);
  const [broke, setBroke] = useState(false);
  const [banner, setBanner] = useState(null);
  const [placeCard, setPlaceCard] = useState(null);
  const [sat, setSat] = useState(false);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [modes, setModes] = useState([]); // AR and VR this device can play
  const [xr, setXr] = useState(null);
  const [muted, setMute] = useState(() => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; } });
  const [music, setMusicOn] = useState(() => { try { return localStorage.getItem(MUSIC_KEY) !== '0'; } catch { return true; } });
  useEffect(() => { setMusic(music); try { localStorage.setItem(MUSIC_KEY, music ? '1' : '0'); } catch { /* storage unavailable */ } }, [music]);
  useEffect(() => { setMuted(muted); try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* storage unavailable */ } }, [muted]);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  if (import.meta.env.DEV) window.__fsGame = { g, buy, answerQuiz, stage: () => st.current };

  // full screen while playing: no page scroll behind
  useEffect(() => { const o = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; return () => { document.documentElement.style.overflow = o; }; }, []);

  useEffect(() => {
    let stage;
    try {
      stage = createStage({
        canvas: cv.current, overlay: overlay.current, minimap: mapRef.current, compass: compassRef.current, g, lang,
        onEvent: (e) => {
          if (e.type === 'sound') play(e.s);
          else if (e.type === 'toast') setToast({ text: e.text, k: Math.random() });
          else if (e.type === 'alert') { const id = Math.random(); setAlerts((a) => [{ ...e, id }, ...a].slice(0, 4)); setTimeout(() => setAlerts((a) => a.filter((x) => x.id !== id)), 9000); }
          else if (e.type === 'open') { setPanel(e.panel); g.paused = true; }
          else if (e.type === 'introDone') setIntro(false);
          else if (e.type === 'xr') setXr(e.mode);
          else if (e.type === 'quest') setBanner({ kind: 'quest', i: e.index, k: Math.random() });
          else if (e.type === 'questDone') setBanner({ kind: 'done', i: e.index, k: Math.random() });
          else if (e.type === 'hurt') setBanner({ kind: 'hurt', fine: e.fine, k: Math.random() });
          else if (e.type === 'safe') setBanner({ kind: 'safe', k: Math.random() });
          else if (e.type === 'place') setPlaceCard({ p: e.place, n: e.n, total: e.total, k: Math.random() });
          else if (e.type === 'win') { setBanner({ kind: 'win', k: Math.random() }); setTimeout(() => endRef.current({ count: { ...g.count }, answers: [...g.answers], day: dayOf(g), money: g.money, seen: [...g.seen] }), 4200); }
          else if (e.type === 'broke') setBroke(true);
        },
      });
      st.current = stage;
    } catch { setFailed(true); return undefined; }
    startAmbience();
    let tick = 0;
    const iv = setInterval(() => {
      setHud(snapshot(g));
      if (++tick % 5 === 0) setScene({ day: !isNight(g), storm: g.ev.storm > 0 ? 1 : g.ev.zone ? Math.min(0.6, 1 - g.ev.zone.left / g.ev.zone.total) : 0, heat: g.ev.heat > 0 ? 1 : 0, wind: g.ev.storm > 0 ? 2.4 : 0.8 });
    }, 110);
    return () => { clearInterval(iv); stage.dispose(); stopAmbience(); };
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { st.current?.setLang(lang); }, [lang]);
  useEffect(() => { let on = true; xrModes().then((m) => on && setModes(m)); return () => { on = false; }; }, []);
  const goXR = (mode) => st.current?.enterXR(mode, rootRef.current).catch(() => setToast({ text: { bn: 'এই যন্ত্রে AR/VR চালু করা গেল না', en: 'AR/VR could not start on this device' }, k: Math.random() }));
  const xrBtns = (size) => modes.map((m) => <RoundBtn key={m} onClick={() => goXR(m)} label={m === 'ar' ? T('AR: ঘরের মেঝেতে বা টেবিলে খামার', 'AR: the farm on your table') : T('VR: হেডসেটে নিজের মাঠে দাঁড়ান', 'VR: stand in the field in a headset')}>{m === 'ar' ? <View size={size} /> : <Glasses size={size} />}</RoundBtn>);
  useEffect(() => { st.current?.setPaused(paused || !!panel); g.paused = paused || !!panel; }, [paused, panel, g]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (!placeCard) return undefined; const t = setTimeout(() => setPlaceCard(null), 4600); return () => clearTimeout(t); }, [placeCard]);
  useEffect(() => { if (!banner || banner.kind === 'win') return undefined; const t = setTimeout(() => setBanner(null), banner.kind === 'quest' ? 3200 : 2600); return () => clearTimeout(t); }, [banner]);

  const closePanel = useCallback(() => { setPanel(null); g.paused = false; play('tap'); }, [g]);
  // keys the stage does not own: pause, seeds, satellite
  useEffect(() => {
    const down = (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.code === 'Escape') { if (panel && panel !== 'quiz') closePanel(); else if (!panel) setPaused((p) => !p); return; }
      if (panel || paused) return;
      if (/^Digit[1-4]$/.test(e.code)) { g.sel = Object.keys(R.crops)[+e.code.slice(5) - 1]; play('tap'); }
      else if (e.code === 'KeyN') setSat(st.current?.toggleSat() ?? false);
      else if (e.code === 'KeyR') setRunning((r) => { st.current?.setRun(!r); return !r; });
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [g, panel, paused, closePanel, R]);

  const q = QUESTS[hud.quest];
  const qNeed = q?.need && Object.entries(q.need)[0];
  const zone = hud.ev.zone;
  const tg = hud.target;
  const prompt = promptText(tg, R, T, L, hud);
  const [h, m] = hud.clock;
  const fmtClock = lang === 'bn' ? `${num(h % 12 || 12, 'bn')}:${num(String(m).padStart(2, '0'), 'bn')} ${h < 12 ? 'সকাল' : h < 17 ? 'দুপুর' : h < 19 ? 'বিকেল' : 'রাত'}` : `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  const money = `${R.cur}${num(hud.money, lang)}`;

  if (failed) return (
    <div className="glass mx-auto max-w-lg rounded-[26px] p-6 text-center">
      <p className="font-display text-[22px] font-semibold">{T('এই ব্রাউজারে 3D চলছে না', '3D does not run in this browser')}</p>
      <p className="mt-2 text-[15px] text-ink/70">{T('WebGL চালু আছে এমন ব্রাউজারে (Chrome, Edge, Safari, Firefox) আবার চেষ্টা করুন।', 'Try again in a browser with WebGL turned on (Chrome, Edge, Safari, Firefox).')}</p>
      <button type="button" onClick={onQuit} className="btn-gloss mt-4 rounded-full px-5 py-2.5 font-semibold text-white">{T('ফিরে যান', 'Go back')}</button>
    </div>
  );

  return (
    <div ref={rootRef} className={`g3 fixed inset-0 z-[3000] select-none overflow-hidden text-white ${xr === 'ar' ? 'bg-transparent' : 'bg-[#0d1a12]'}`}>
      {/* in AR this whole layer is the dom-overlay over the camera; the canvas's last flat frame must not cover it */}
      <canvas ref={cv} className={`absolute inset-0 h-full w-full touch-none ${xr === 'ar' ? 'invisible' : ''}`} aria-label={T(`${R.farmer.bn}-এর মাঠ — ত্রিমাত্রিক খেলা`, `${R.farmer.en}’s field — 3D game`)} />
      <div ref={overlay} className="pointer-events-none absolute inset-0 overflow-hidden" />
      {/* vignettes for heat, storm and being caught out */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${hud.ev.heat > 0 ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(255,120,30,.35))' }} />
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${hud.down > 0 ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'radial-gradient(100% 80% at 50% 50%, rgba(120,0,0,.1), rgba(150,0,0,.55))' }} />

      {/* top left: the farmer, the day, the money */}
      <div className={`g3-hud absolute left-3 top-3 flex max-w-[calc(58vw-22px)] items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-3.5 transition-opacity sm:max-w-none ${intro ? 'opacity-0' : ''}`}>
        <span className="grid h-11 w-11 place-items-center rounded-xl text-[22px]" style={{ background: stage(R.country) }}>{R.flag}</span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[14.5px] font-semibold">{L(R.farmer)}</span>
          <span className="flex items-center gap-1.5 truncate text-[12px] text-white/70">{hud.night ? <Moon size={12} /> : <Sun size={12} />}{T(`দিন ${num(hud.day, 'bn')}`, `Day ${hud.day}`)}<span className="hidden sm:inline"> · {fmtClock}</span><b className="font-semibold text-amber-200 sm:hidden">· {money}</b></span>
        </span>
        <span className="ml-1 hidden border-l border-white/15 pl-3 leading-tight sm:block"><span className="block text-[11px] font-semibold uppercase tracking-wider text-white/55">{T('টাকা', 'Cash')}</span><span className="font-display flex items-center gap-1 text-[17px] font-semibold tabular text-amber-200"><Coins size={14} />{money}</span></span>
      </div>

      {/* top centre: the compass strip */}
      <div className={`absolute left-1/2 top-3 hidden -translate-x-1/2 transition-opacity md:block ${intro ? 'opacity-0' : ''}`}>
        <div ref={compassRef} className="g3-compass" aria-hidden="true">
          {COMPASS.map(([d, t]) => <span key={d} className={t ? 'g3-cl' : 'g3-ct'} style={{ '--d': d }}>{t ? t[lang === 'bn' ? 0 : 1] : ''}</span>)}
          <span className="g3-compass-pin" />
        </div>
      </div>

      {/* top right: minimap, the zone timer, FieldShift alerts */}
      <div className={`absolute right-3 top-3 flex w-[min(42vw,184px)] flex-col items-end gap-2 transition-opacity sm:w-[200px] ${intro ? 'opacity-0' : ''}`}>
        <div className="g3-hud relative w-full overflow-hidden rounded-2xl p-1">
          <canvas ref={mapRef} width={360} height={360} className="block aspect-square w-full rounded-xl" aria-label={T('মানচিত্র', 'Map')} />
          <span className="absolute left-2 top-1.5 text-[10px] font-bold text-white/80">{T('উ', 'N')}↑</span>
        </div>
        {zone && zone.left > 0 && (
          <div className={`g3-hud w-full rounded-xl px-2.5 py-1.5 text-center ${zone.left < 30 ? 'g3-zone-urgent' : zone.left < 60 ? 'ring-2 ring-red-400/80' : 'ring-1 ring-sky-300/60'}`}>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-sky-200">{L(R.storm)}</p>
            <p className="font-display text-[22px] font-bold tabular">{num(Math.floor(zone.left / 60), lang)}:{num(String(Math.ceil(zone.left % 60) % 60).padStart(2, '0'), lang)}</p>
            <p className="text-[11px] text-white/75">{hud.inZone ? T('নিরাপদ বৃত্তে আছেন ✓', 'Inside the safe circle ✓') : T('নিরাপদ বৃত্তে যান!', 'Get inside the safe circle!')}</p>
          </div>
        )}
        <div className="pointer-events-none flex w-[min(78vw,300px)] flex-col gap-1.5">
          {alerts.map((a) => (
            <div key={a.id} className={`alert-in g3-hud rounded-xl px-3 py-2 ${a.tone === 'hot' ? 'ring-1 ring-red-400/70' : a.tone === 'ok' ? 'ring-1 ring-emerald-300/60' : 'ring-1 ring-amber-300/60'}`}>
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-emerald-300"><Smartphone size={11} />FieldShift</p>
              <p className="text-[13.5px] font-semibold leading-snug">{L(a.title)}</p>
              <p className="text-[12px] leading-5 text-white/75">{L(a.body)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* left: the mission */}
      {q && !intro && (
        <div key={hud.quest} className="g3-hud outcome-in absolute left-3 top-[76px] w-[min(calc(58vw-22px),290px)] rounded-2xl px-3.5 py-2.5">
          <p className="text-[10.5px] font-bold uppercase tracking-[.14em] text-amber-200">{T(`মিশন ${num(hud.quest + 1, 'bn')}/${num(QUESTS.length, 'bn')}`, `Mission ${hud.quest + 1}/${QUESTS.length}`)}</p>
          <p className="mt-0.5 text-[14.5px] font-semibold leading-snug">{fill(L(q), R)}</p>
          {qNeed && <div className="mt-1.5 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><span className="block h-full rounded-full bg-amber-300 transition-[width] duration-500" style={{ width: `${Math.min(1, hud.count[qNeed[0]] / qNeed[1]) * 100}%` }} /></span><span className="text-[12px] font-semibold tabular text-white/80">{num(Math.min(hud.count[qNeed[0]], qNeed[1]), lang)}/{num(qNeed[1], lang)}</span></div>}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {hud.ev.heat > 0 && <Chip icon={Sun} cls="bg-orange-500/90" text={T('তাপপ্রবাহ', 'Heatwave')} />}
            {hud.ev.storm > 0 && <Chip icon={CloudLightning} cls="bg-slate-600/90" text={L(R.storm)} />}
            {hud.pests > 0 && <Chip icon={Bug} cls="bg-red-600/90" text={T(`${num(hud.pests, 'bn')} জমিতে ${R.pestWord.bn}`, `${R.pestWord.en} on ${hud.pests}`)} />}
            {hud.ev.glut > 0 && <Chip icon={TrendingDown} cls="bg-rose-700/90" text={T(`${R.crops[R.glut].bn}র দাম পড়েছে`, `${R.crops[R.glut].en} price down`)} />}
          </div>
        </div>
      )}

      {/* a named place of the village, as the farmer walks into it */}
      {placeCard && (
        <div key={placeCard.k} className="g3-place pointer-events-none absolute inset-x-0 bottom-[244px] flex justify-center px-4 md:bottom-auto md:top-[64px]">
          <div className="text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[.22em] text-amber-200"><MapPin size={12} />{L(R.place)}</p>
            <p className="font-display mt-0.5 text-[24px] font-extrabold leading-tight sm:text-[32px]">{L(placeCard.p.name)}</p>
            <p className="mt-0.5 text-[11.5px] font-semibold text-white/70">{T(`চেনা জায়গা ${num(placeCard.n, 'bn')}/${num(placeCard.total, 'bn')}`, `Places found ${placeCard.n}/${placeCard.total}`)}</p>
          </div>
        </div>
      )}

      {/* centre banners: new mission, mission done, caught in the storm, safe, the win */}
      {banner && (
        <div key={banner.k} className="pointer-events-none absolute inset-x-0 top-[24%] flex justify-center px-4">
          <div className="g3-banner text-center">
            {banner.kind === 'quest' && <><p className="text-[12px] font-bold uppercase tracking-[.3em] text-amber-200">{T('নতুন মিশন', 'New mission')}</p><p className="font-display mt-1 text-[26px] font-bold sm:text-[34px]">{fill(L(QUESTS[banner.i]), R)}</p></>}
            {banner.kind === 'done' && <p className="font-display text-[30px] font-bold text-emerald-300 sm:text-[40px]">✓ {T('মিশন সম্পন্ন', 'Mission complete')}</p>}
            {banner.kind === 'hurt' && <><p className="font-display text-[30px] font-bold text-red-300 sm:text-[40px]">{T('খোলা জায়গায় আটকে গেলেন!', 'Caught out in the open!')}</p><p className="mt-1 text-[15px] text-white/85">{T(`চিকিৎসায় খরচ ${R.cur}${num(banner.fine, 'bn')} · পরের বার আগেই নিরাপদ বৃত্তে`, `Treatment cost ${R.cur}${banner.fine} · next time, reach the safe circle sooner`)}</p></>}
            {banner.kind === 'safe' && <p className="font-display text-[30px] font-bold text-sky-200 sm:text-[40px]">{T('আপনি নিরাপদ!', 'You are safe!')}</p>}
            {banner.kind === 'win' && <><p className="text-[13px] font-bold uppercase tracking-[.32em] text-amber-200">{T('মৌসুম জয়', 'Season won')}</p><p className="font-display g3-win mt-1 text-[34px] font-extrabold leading-tight sm:text-[52px]">{T(`জয় জয়! আজ রাতে ${R.dinner.bn}!`, `Winner winner, ${R.dinner.en} dinner!`)}</p></>}
          </div>
        </div>
      )}

      {/* bottom: the prompt, the stamina bar, and the inventory */}
      {!intro && (
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-2 px-3">
          {prompt && !touch && <div className="g3-hud flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold shadow-lg backdrop-blur-xl"><kbd className="grid h-6 min-w-6 place-items-center rounded-md bg-white px-1.5 text-[12px] font-bold text-ink shadow-2xs">E</kbd>{prompt}</div>}
          <div className="h-1.5 w-[min(60vw,300px)] overflow-hidden rounded-full bg-white/20 shadow-inner" title={T('দম', 'Stamina')}><span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-amber-300 transition-[width] duration-200 shadow-sm" style={{ width: `${hud.stamina * 100}%` }} /></div>
          <div className={`g3-hud flex items-stretch gap-1.5 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl ${touch ? 'mb-[118px] sm:mb-0' : ''}`}>
            {Object.entries(R.crops).map(([k, c], n) => (
              <button key={k} type="button" onClick={() => { g.sel = k; play('tap'); }} aria-pressed={hud.sel === k} title={`${L(c)} (${n + 1})`}
                className={`relative flex min-w-[56px] flex-col items-center rounded-xl px-2.5 pb-1.5 pt-2 text-[11px] font-semibold transition-all duration-200 sm:min-w-[76px] ${hud.sel === k ? 'scale-105 bg-white/95 text-ink shadow-[0_0_0_2px_#ffd24a,0_8px_20px_rgba(255,210,74,0.35)]' : 'bg-white/[.08] text-white/90 hover:bg-white/20 active:scale-95'}`}>
                <span className="absolute left-1.5 top-0.5 text-[9.5px] font-bold opacity-60">{n + 1}</span>
                <Sprout size={17} className={hud.sel === k ? 'text-primary-700' : 'text-lime-200'} />
                <span className="mt-0.5 max-w-[64px] truncate font-medium">{L(c)}</span>
                <span className="font-display text-[13.5px] font-bold tabular">×{num(hud.seeds[k], lang)}</span>
              </button>
            ))}
            <span className="mx-0.5 w-px bg-white/20" />
            <div className="flex min-w-[62px] flex-col items-center justify-center rounded-xl bg-white/[.08] px-2 text-[11px] font-semibold" title={T('বালতির পানি', 'Water can')}>
              <Droplets size={16} className="text-sky-300" /><span className="font-display text-[13px] font-bold tabular">{num(hud.can, lang)}/{num(hud.canMax, lang)}</span>
              <span className="mt-1 h-1.5 w-11 overflow-hidden rounded-full bg-white/20"><span className="block h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-200 transition-[width]" style={{ width: `${(hud.can / hud.canMax) * 100}%` }} /></span>
            </div>
            <div className="flex min-w-[58px] flex-col items-center justify-center rounded-xl bg-white/[.08] px-2 text-[11px] font-semibold" title={T('ঝুড়ি', 'Basket')}>
              <ShoppingBasket size={16} className="text-amber-200" /><span className="font-display text-[13px] font-bold tabular">{num(hud.basketN, lang)}</span>
            </div>
          </div>
        </div>
      )}

      {/* touch controls: joystick left, action and run right */}
      {touch && !intro && <TouchControls stage={st} prompt={prompt} running={running} setRunning={setRunning} />}

      <div className={`absolute bottom-3 right-3 hidden flex-col gap-1.5 sm:flex ${intro ? 'opacity-0' : ''} ${touch ? '!hidden' : ''}`}>
        {xrBtns(18)}
        <RoundBtn onClick={() => setSat(st.current?.toggleSat() ?? false)} on={sat} label={T('উপগ্রহের চোখ (N)', 'Satellite view (N)')}><Satellite size={18} /></RoundBtn>
        <RoundBtn onClick={() => { setPanel('kiosk'); g.paused = true; }} label="FieldShift"><Smartphone size={18} /></RoundBtn>
        <RoundBtn onClick={() => setMute(!muted)} label={muted ? T('শব্দ চালু', 'Sound on') : T('শব্দ বন্ধ', 'Sound off')}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</RoundBtn>
        <RoundBtn onClick={() => setMusicOn(!music)} on={music} label={music ? T('সুর বন্ধ', 'Music off') : T('সুর চালু', 'Music on')}><Music size={18} /></RoundBtn>
        <RoundBtn onClick={() => setPaused(true)} label={T('বিরতি (Esc)', 'Pause (Esc)')}><Pause size={18} /></RoundBtn>
      </div>
      {touch && !intro && (
        <div className="absolute left-3 top-[76px] mt-[130px] flex flex-col gap-1.5">
          <RoundBtn onClick={() => setPaused(true)} label={T('বিরতি', 'Pause')}><Pause size={17} /></RoundBtn>
          <RoundBtn onClick={() => setSat(st.current?.toggleSat() ?? false)} on={sat} label={T('উপগ্রহ', 'Satellite')}><Satellite size={17} /></RoundBtn>
          <RoundBtn onClick={() => { setPanel('kiosk'); g.paused = true; }} label="FieldShift"><Smartphone size={17} /></RoundBtn>
          {xrBtns(17)}
        </div>
      )}
      {sat && !intro && (
        <div className="g3-hud absolute bottom-[132px] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full px-3.5 py-1.5 text-[12px] font-semibold">
          <Satellite size={13} className="text-emerald-300" />{NDVI_LEGEND.map((l) => <span key={l.c} className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full" style={{ background: l.c }} />{L(l)}</span>)}
        </div>
      )}

      {toast && <div key={toast.k} className="hint-in g3-hud absolute bottom-[150px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-medium">{L(toast.text)}</div>}

      {/* the drop from orbit */}
      {intro && (
        <div className="absolute inset-0 flex flex-col items-center justify-between p-6">
          <div className="g3-drop mt-[13vh] text-center">
            <p className="flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[.38em] text-emerald-300"><Satellite size={14} className="animate-pulse" />{T('FieldShift উপগ্রহ থেকে নামছেন', 'Dropping in from the FieldShift satellite')}</p>
            <p className="font-display mt-2 text-[36px] font-extrabold leading-tight drop-shadow-[0_4px_22px_rgba(0,0,0,.55)] sm:text-[54px]">{R.flag} {L(R.place)}</p>
            <p className="mt-1 text-[16px] font-semibold text-white/85">{L(R.place.area)}</p>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-white/50"><MapPin size={11} />{L(R.farmer)} · {L(R.farmer.trait)}</p>
          </div>
          <button type="button" onClick={() => st.current?.skipIntro()} className="g3-hud rounded-full px-5 py-2 text-[14px] font-semibold hover:scale-105 transition-transform">{T('এড়িয়ে যান', 'Skip')} →</button>
        </div>
      )}

      {panel && <Panel kind={panel} g={g} hud={hud} R={R} onClose={closePanel} onQuizDone={(ok) => { answerQuiz(g, ok); setPanel(null); }} />}
      {paused && !panel && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="g3-panel w-full max-w-sm rounded-[26px] p-6 text-center">
            <p className="font-display text-[26px] font-bold">{T('বিরতি', 'Paused')}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => setPaused(false)} className="btn-gloss inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white"><Play size={17} />{T('চালিয়ে যান', 'Resume')}</button>
              <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 font-semibold ring-1 ring-white/15 hover:bg-white/15"><RotateCcw size={16} />{T('আবার শুরু', 'Restart')}</button>
              <button type="button" onClick={() => setMute(!muted)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 font-semibold ring-1 ring-white/15 hover:bg-white/15">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{muted ? T('শব্দ চালু করুন', 'Turn sound on') : T('শব্দ বন্ধ করুন', 'Turn sound off')}</button>
              <button type="button" onClick={onQuit} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-white/70 hover:text-white"><LogOut size={16} />{T('খেলা ছেড়ে বের হন', 'Quit the game')}</button>
            </div>
            <p className="mt-4 text-[12.5px] leading-5 text-white/60">{touch ? T('বাঁয়ের চাকা দিয়ে হাঁটুন, ডানে টেনে চারপাশ দেখুন, দুই আঙুলে জুম।', 'Walk with the left stick, drag on the right to look, pinch to zoom.') : T('WASD হাঁটা · Shift দৌড় · E কাজ · মাউস টেনে দেখা · চাকা জুম · 1–4 বীজ · N উপগ্রহ', 'WASD walk · Shift run · E act · drag to look · wheel zoom · 1–4 seed · N satellite')}</p>
          </div>
        </div>
      )}
      {broke && (
        <div className="absolute inset-0 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="g3-panel max-w-sm rounded-[24px] p-6 text-center">
            <p className="font-display text-[22px] font-semibold">{T('টাকা আর বীজ — দুটোই শেষ', 'Out of money and seed')}</p>
            <p className="mt-2 text-[15px] text-white/75">{T('খরচের আগে হিসাব — এটাই FieldShift-এর মূল কথা। আবার চেষ্টা করুন!', 'Plan before you spend — that is the heart of FieldShift. Try again!')}</p>
            <button type="button" onClick={onRestart} className="btn-gloss mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white"><RotateCcw size={16} />{T('আবার শুরু', 'Restart')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function promptText(tg, R, T, L, hud) {
  if (!tg) return null;
  if (tg.kind === 'station') return { shed: T('বীজ কিনুন', 'Buy seed'), water: T('বালতি ভরুন', 'Fill the can'), market: hud.basketN ? T('ফসল বিক্রি করুন', 'Sell the crop') : T('ঝুড়ি খালি', 'Basket empty'), kiosk: T('FieldShift খুলুন', 'Open FieldShift') }[tg.id] + ` · ${L(R.names[tg.id])}`;
  const c = tg.crop ? L(tg.crop) : '';
  return {
    spray: R.pestWord.en === 'wild boar' ? T('শূকর তাড়ান', 'Chase off the boar') : T('ব্যবস্থা নিন', 'Treat the plot'), clear: T('মরা গাছ সরান', 'Clear the dead plants'),
    plant: T(`${c} বুনুন`, `Sow ${c}`), noseed: T('বীজ নেই — দোকানে যান', 'No seed — go to the shop'), harvest: T(`${c} তুলুন`, `Harvest the ${c}`),
    nowater: T('বালতি খালি — পানি আনুন', 'Can empty — fetch water'), wet: T(`${c} বাড়ছে · মাটি ভেজা`, `${c} growing · soil wet`), water: T(`${c}-এ পানি দিন`, `Water the ${c}`),
  }[tg.what];
}

function Chip({ icon: Icon, cls, text }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold text-white ${cls}`}><Icon size={12} className="animate-pulse" />{text}</span>;
}
function RoundBtn({ children, onClick, label, on }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={on} className={`g3-hud grid h-11 w-11 place-items-center rounded-full transition active:scale-90 ${on ? '!bg-emerald-500/90' : 'hover:!bg-white/20'}`}>{children}</button>;
}

// A thumb stick on the left half; the action and run buttons on the right, like a mobile shooter.
function TouchControls({ stage, prompt, running, setRunning }) {
  const { T } = useStore();
  const base = useRef(null), knob = useRef(null), id = useRef(null);
  const move = (e) => {
    if (id.current !== e.pointerId) return;
    const r = base.current.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    knob.current.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
    stage.current?.setJoy(dx, -dy);
  };
  const end = (e) => { if (id.current !== e.pointerId) return; id.current = null; knob.current.style.transform = ''; stage.current?.setJoy(0, 0); };
  return (
    <>
      <div ref={base} className="g3-stick absolute bottom-6 left-6 grid h-[124px] w-[124px] place-items-center rounded-full touch-none"
        onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <span ref={knob} className="pointer-events-none h-[54px] w-[54px] rounded-full bg-white/80 shadow-lg transition-transform duration-75" />
      </div>
      <div className="absolute bottom-6 right-5 flex items-end gap-3">
        <button type="button" onClick={() => setRunning((r) => { stage.current?.setRun(!r); return !r; })} aria-pressed={running} className={`g3-hud grid h-14 w-14 place-items-center rounded-full ${running ? '!bg-emerald-500/90' : ''}`} aria-label={T('দৌড়', 'Run')}><Footprints size={22} /></button>
        <button type="button" onPointerDown={(e) => { e.preventDefault(); stage.current?.act(); }} className="g3-act grid h-[88px] w-[88px] place-items-center rounded-full text-center" aria-label={prompt ?? T('কাজ', 'Act')}>
          <span className="flex flex-col items-center gap-0.5 px-1 text-[10.5px] font-bold leading-tight"><Hand size={26} />{prompt ? prompt.split(' · ')[0] : T('কাজ', 'Act')}</span>
        </button>
      </div>
    </>
  );
}

function Panel({ kind, g, hud, R, onClose, onQuizDone }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const [pick, setPick] = useState(null);
  const Q = quizOf(g);
  const next = QUESTS[g.quest];
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-black/45 p-3 backdrop-blur-[3px]">
      <div className="outcome-in g3-panel w-full max-w-xl rounded-[26px] p-5 sm:p-6">
        {kind === 'shop' && (<>
          <div className="flex items-center justify-between"><p className="font-display text-[22px] font-semibold">{L(R.names.shed)}</p><span className="text-[15px] font-semibold text-amber-200">{R.cur}{num(hud.money, lang)}</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(R.crops).map(([k, c]) => (
              <div key={k} className="rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10">
                <p className="flex items-center gap-2 text-[16px] font-semibold"><Sprout size={17} className="text-lime-300" />{L(c)}</p>
                <p className="mt-1 text-[12.5px] leading-5 text-white/65">{T(`বীজ ${R.cur}${num(c.cost, 'bn')} · বিক্রি ${R.cur}${num(priceOf(g, k), 'bn')} · পাকে ~${num(c.grow, 'bn')} সে.`, `Seed ${R.cur}${c.cost} · sells ${R.cur}${priceOf(g, k)} · ripens ~${c.grow}s`)}</p>
                <p className="flex items-center gap-0.5 text-[12.5px] text-white/65">{T('পানি', 'Water')}: {Array.from({ length: Math.max(1, Math.round(c.thirst * 2)) }, (_, i) => <Droplets key={i} size={12} className="text-sky-300" />)}{c.soil ? T(' · মাটি উর্বর করে', ' · enriches soil') : ''}{k === R.glut ? T(' · দাম ওঠানামা করে', ' · price swings') : ''}</p>
                <div className="mt-2 flex gap-1.5">{[3, 6].map((n) => <button key={n} type="button" disabled={hud.money < c.cost * n} onClick={() => buy(g, k, n)} className="rounded-full bg-emerald-500 px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-35">{T(`${num(n, 'bn')}টি · ${R.cur}${num(c.cost * n, 'bn')}`, `${n} · ${R.cur}${c.cost * n}`)}</button>)}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={onClose} className="btn-gloss mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white">{T('মাঠে ফিরি', 'Back to the field')}<ArrowRight size={16} /></button>
        </>)}
        {kind === 'kiosk' && (<>
          <p className="flex items-center gap-2 font-display text-[22px] font-semibold"><Smartphone size={20} className="text-emerald-300" />FieldShift · {L(R.names.kiosk)}</p>
          <div className="mt-3 rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10">
            <p className="text-[13px] font-semibold text-white/60">{T('এখনকার আবহাওয়া', 'Weather now')}</p>
            <p className="text-[15.5px] font-semibold">{hud.ev.heat > 0 ? T('তাপপ্রবাহ — ঘন ঘন পানি দিন', 'Heatwave — water often') : hud.ev.storm > 0 ? L(R.storm) : hud.ev.zone ? T(`${R.storm.bn} আসছে — নিরাপদ বৃত্তে যান`, `${R.storm.en} coming — get to the safe circle`) : T('স্বাভাবিক, পরিষ্কার আকাশ', 'Normal, clear sky')}</p>
          </div>
          <div className="mt-2 rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10">
            <p className="text-[13px] font-semibold text-white/60">{T('আজকের বাজারদর', "Today's prices")}</p>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[14.5px]">{Object.keys(R.crops).map((k) => <span key={k} className="flex justify-between"><span>{L(R.crops[k])}</span><b className={hud.ev.glut > 0 && k === R.glut ? 'text-red-300' : ''}>{R.cur}{num(priceOf(g, k), lang)}</b></span>)}</div>
          </div>
          {next && <p className="mt-2 flex items-start gap-2 rounded-2xl bg-emerald-400/10 p-3 text-[14px] leading-6 text-emerald-100"><Info size={16} className="mt-1 shrink-0" />{fill(L(next), R)}</p>}
          {Object.keys(hud.perks).length > 0 && <p className="mt-2 text-[13.5px] text-white/65">{T('আপনার অর্জন', 'Earned')}: {Object.values(R.quiz).filter((x) => hud.perks[x.perk]).map((x) => L(x.perkText)).join(' · ')}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={R.account ?? `/abroad/${R.country}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 font-semibold ring-1 ring-white/15">{T(`${R.farmer.bn}-এর আসল অ্যাকাউন্ট`, `${R.farmer.en}’s real account`)}<ArrowRight size={15} /></Link>
            <button type="button" onClick={onClose} className="btn-gloss inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white">{T('মাঠে ফিরি', 'Back to the field')}</button>
          </div>
        </>)}
        {kind === 'quiz' && Q && (<>
          <p className="flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-wider text-emerald-300"><Smartphone size={14} />{T('FieldShift-এর প্রশ্ন', 'A question from FieldShift')}</p>
          <p className="font-display mt-2 text-[20px] font-semibold leading-snug tracking-[-0.015em]"><Words text={L(Q.q)} step={30} /></p>
          <div className="mt-4 space-y-2">
            {Q.options.map((o, k) => {
              const chosen = pick === k, show = pick !== null;
              return (
                <button key={k} type="button" disabled={show} onClick={() => { setPick(k); play(o.ok ? 'good' : 'bad'); }} style={{ '--n': k }}
                  className={`tool-deal flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-[15px] font-medium ring-1 transition ${show && o.ok ? 'bg-emerald-400/20 ring-emerald-300' : chosen ? 'tool-shake bg-red-500/20 ring-red-300' : 'bg-white/[.07] ring-white/10 hover:bg-white/[.12]'}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${show && o.ok ? 'bg-emerald-500 text-white' : chosen ? 'bg-red-600 text-white' : 'bg-white/10'}`}>{show && o.ok ? <Check size={15} /> : chosen ? <X size={15} /> : num(k + 1, lang)}</span>{L(o)}
                </button>
              );
            })}
          </div>
          {pick !== null && (
            <div className="outcome-in mt-4">
              <p className="text-[14.5px] leading-6 text-white/80">{L(Q.why)}</p>
              {Q.options[pick].ok && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[13px] font-semibold text-white"><Sparkles size={14} />{L(Q.perkText)}</p>}
              <div><button type="button" onClick={() => onQuizDone(!!Q.options[pick].ok)} className="btn-gloss mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold text-white">{T('মাঠে ফিরি', 'Back to the field')}<ArrowRight size={16} /></button></div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

function EndScreen({ who, r, onReplay, onPick }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const R = REGIONS[who];
  const lost = r?.count.lost ?? 0, hurt = r?.count.hurt ?? 0;
  const stars = starsOf(r);
  useEffect(() => {
    const b = readBest(), was = b[who];
    if (!was || stars > was.stars || (stars === was.stars && (r?.count.earned ?? 0) > was.earned)) { b[who] = { stars, earned: r?.count.earned ?? 0 }; try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* storage unavailable */ } }
  }, [who, stars, r]);
  const quizzes = QUESTS.map((q) => q.quiz && R.quiz[q.quiz] && { id: q.id, Q: R.quiz[q.quiz] }).filter(Boolean);
  return (
    <section className="scene-in mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-[30px] text-white shadow-[var(--shadow-lift)]" style={{ background: stage(R.country) }}>
        {/* decorative ambient overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.2) 0%, transparent 40%, rgba(0,0,0,.5) 100%)' }} />
        <div className="relative grid items-center sm:grid-cols-[0.8fr_1.2fr]">
          <div className="h-[320px] sm:h-[360px]"><Preview id={who} mood="cheer" /></div>
          <div className="p-6 text-center sm:text-left">
            <div className="flex justify-center gap-2 sm:justify-start">{[0, 1, 2].map((k) => <Star key={k} size={44} className={`star-pop ${k < stars ? 'fill-amber-300 text-amber-300' : 'text-white/20'}`} style={{ animationDelay: `${220 + k * 240}ms` }} />)}</div>
            <p className="mt-3 text-[12px] font-bold uppercase tracking-[.3em] text-amber-200">{T('মৌসুম জয়', 'Season won')}</p>
            <h1 className="font-display mt-1 text-[32px] font-extrabold leading-tight sm:text-[42px]"><Words text={T(`জয় জয়! আজ রাতে ${R.dinner.bn}!`, `Winner winner, ${R.dinner.en} dinner!`)} /></h1>
            <p className="mt-2 text-[16px] text-white/80">{L(R.lines.win)} — {L(R.farmer)}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[[Coins, T('মোট বিক্রি', 'Sold'), `${R.cur}${num(r?.count.earned ?? 0, lang)}`], [ShoppingBasket, T('ফসল তোলা', 'Harvested'), num(r?.count.harvested ?? 0, lang)], [Sprout, T('হারানো গাছ', 'Plants lost'), num(lost, lang)], [Sun, T('দিন লেগেছে', 'Days'), num(r?.day ?? 1, lang)]].map(([Icon, l, v], k) => (
          <div key={l} className="outcome-in glass rounded-[22px] p-4 text-center" style={{ animationDelay: `${700 + k * 110}ms` }}><Icon size={20} className="mx-auto text-primary-700" /><p className="font-display mt-1.5 text-[24px] font-semibold tabular">{v}</p><p className="text-[13px] text-muted">{l}</p></div>
        ))}
      </div>
      <div className="glass mt-5 rounded-[24px] p-5">
        <p className="font-display text-[19px] font-semibold">{T(`${bnOf(R.farmer.bn)} মাঠ থেকে যা শিখলেন`, `What ${R.farmer.en}’s field taught`)}</p>
        <ul className="mt-3 space-y-3">
          {quizzes.map(({ id, Q }, k) => {
            const a = r?.answers.find((x) => x.id === id);
            return (
              <li key={id} className="outcome-in flex gap-3" style={{ animationDelay: `${1100 + k * 100}ms` }}>
                {a?.ok ? <Check size={18} className="mt-1 shrink-0 text-primary-600" /> : <X size={18} className="mt-1 shrink-0 text-red-500" />}
                <span className="text-[14.5px] leading-6"><b>{L(Q.options.find((o) => o.ok))}</b> — <span className="text-ink/70">{L(Q.why)}</span></span>
              </li>
            );
          })}
        </ul>
      </div>
      {PLACES[who] && (
        <div className="glass mt-5 rounded-[24px] p-5">
          <p className="font-display text-[19px] font-semibold">{T(`${L(R.place)} — যেসব জায়গা চিনলেন`, `${L(R.place)} — the places you found`)}</p>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {PLACES[who].places.map((p) => {
              const found = r?.seen?.includes(p.id);
              return (
                <li key={p.id} className={`rounded-2xl border border-line/70 p-3 ${found ? 'bg-white/60' : 'opacity-60'}`}>
                  <p className="flex items-center gap-1.5 text-[14.5px] font-semibold"><MapPin size={14} className={found ? 'text-primary-700' : 'text-muted'} />{found ? L(p.name) : T('অচেনা জায়গা', 'Not found yet')}</p>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{found ? `“${L(p.line)}”` : T('পরের বার গ্রামটা আরেকটু ঘুরে দেখুন।', 'Walk a little further round the village next time.')}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onReplay} className="btn-gloss inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white"><RotateCcw size={17} />{T('আবার খেলুন', 'Play again')}</button>
        <button type="button" onClick={onPick} className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"><Users size={17} />{T('অন্য কৃষক বেছে নিন', 'Pick another farmer')}</button>
        <Link to={R.account ?? `/abroad/${R.country}`} className="glass-pill inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold"><Sprout size={17} />{T(`${R.farmer.bn}-এর আসল অ্যাকাউন্ট`, `${R.farmer.en}’s real account`)}</Link>
      </div>
    </section>
  );
}
