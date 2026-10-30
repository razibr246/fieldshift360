// "স্বপ্নের মাঠ": the children's version of মাঠের মানুষ. Pick a farmer's child, then play the dream: a worried night,
// Tara the NASA satellite, three mini-games on real NASA records (GPM rain, MODIS bare months, SMAP soil water), two
// doors (the season without the data and with it), and the morning. Story and rules: game/dream.js; the 3D world,
// people and VR/AR: game/three/dreamScene.js. Lines can be read aloud for children who do not read yet.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Volume2, VolumeX, Mic, Star, Heart, Glasses, Smartphone, RotateCcw, Sparkles, Droplets } from 'lucide-react';
import { useStore } from '../../store';
import { REGIONS } from '../../game/regions';
import { CHILDREN, CHILD_IDS, MOODS, BADGES, dreamFor, cloudStars, blanketStars, waterResult, WATER_BAND, badgesFor, totalStars } from '../../game/dream';
import { landSummary } from '../../engine/landsat';
import { createDreamSound } from '../../game/dreamSound';

const WHO = {
  parent: { bg: 'bg-amber-100', ring: 'ring-amber-300' },
  child: { bg: 'bg-sky-100', ring: 'ring-sky-300' },
  tara: { bg: 'bg-yellow-100', ring: 'ring-yellow-300' },
  frog: { bg: 'bg-green-100', ring: 'ring-green-300' },
};
const FACE = { tara: '🛰️', frog: '🐸' };
const GAME_SECONDS = { clouds: 26, blanket: 30 };

export default function KidsDream() {
  const [params] = useSearchParams(); // /kids?who=rahimu opens that child's dream straight away
  const [who, setWho] = useState(() => (CHILDREN[params.get('who')] ? params.get('who') : null));
  return who ? <Dream id={who} onExit={() => setWho(null)} /> : <Picker onPick={setWho} />;
}

function Picker({ onPick }) {
  const { T, L } = useStore();
  return (
    <div className="page-shell pb-24 pt-[110px] sm:pt-[124px]">
      <p className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold text-primary-800"><Sparkles size={15} />{T('ছোটদের জন্য', 'For children')}</p>
      <h1 className="mt-4 text-[38px] font-semibold leading-tight sm:text-[52px]">{T('স্বপ্নের মাঠ', 'The Dream Field')}</h1>
      <p className="mt-2 max-w-2xl text-[17px] leading-8 text-ink/75">{T('এক রাতে বাবা-মায়ের চিন্তা শুনে ঘুমিয়ে পড়ো। স্বপ্নে নাসার উপগ্রহ "তারা" তোমাকে আকাশে নিয়ে যাবে, তোমাদের মাঠ বাঁচাতে খেলবে, আর দেখাবে আগে জানলে কী বদলায়। কার ছেলে বা মেয়ে হয়ে খেলবে?', 'One night you fall asleep hearing your family worry. In your dream Tara, a NASA satellite, flies you into the sky, you play to save your field, and you see what changes when people know in time. Whose child will you be?')}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHILD_IDS.map((id) => {
          const c = CHILDREN[id], r = REGIONS[id];
          return (
            <li key={id}>
              <button type="button" onClick={() => onPick(id)} className="lift flex w-full items-center gap-3 rounded-[22px] border border-border bg-white p-4 text-left shadow-[var(--shadow-card)] transition hover:border-primary-300">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-50 text-[30px]" aria-hidden="true">{c.girl ? '👧🏽' : '👦🏽'}</span>
                <span className="min-w-0">
                  <span className="block text-[18px] font-bold">{L(c.name)}, {T(`${c.age} বছর`, `${c.age}`)}</span>
                  <span className="block text-[13.5px] text-ink/70">{L(c.rel)}</span>
                  <span className="block text-[12.5px] text-muted">{r.flag ?? '🇧🇩'} {L(r.place)} · {L(r.storm)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 max-w-2xl text-[13px] leading-6 text-muted">{T('গল্পের মানুষেরা বানানো, কিন্তু তারা যা বলে (কোন মাসে মাঠ খালি থাকে, কোন বছর ফসল কষ্টে ছিল, মাটি কতটা গরম হয়েছে) তা ওই জায়গার আসল নাসা উপগ্রহের তথ্য। বড়দের জন্য পুরো খেলা "মাঠের মানুষ"।', 'The people in the story are made up, but what Tara says (which months the fields lie bare, which year the crops struggled, how much hotter the ground has become) is that place’s real NASA satellite record. The full game for grown-ups is “মাঠের মানুষ”.')} <Link to="/farm" className="font-semibold text-primary-800 underline-offset-2 hover:underline">{T('বড়দের খেলা', 'The grown-ups’ game')}</Link></p>
    </div>
  );
}

function Dream({ id, onExit }) {
  const { T, L, s } = useStore();
  const lang = s.lang;
  const dream = useMemo(() => dreamFor(id, REGIONS[id], landSummary(CHILDREN[id].land)), [id]);
  const host = useRef(null), overlay = useRef(null), world = useRef({ tap: () => {} }), sound = useRef(null), pumpTimer = useRef(null), hudRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [k, setK] = useState(0); // scene
  const [n, setN] = useState(0); // line within the scene
  const [phase, setPhase] = useState('lines'); // lines | action | game | won
  const [stars, setStars] = useState({});
  const [hud, setHud] = useState({ time: 0, caught: 0, dark: 0, covered: 0, eaten: 0, water: 20 });
  const [winLine, setWinLine] = useState(null);
  const [muted, setMuted] = useState(false);
  const [read, setRead] = useState(true);
  const [xr, setXr] = useState({ vr: false, ar: false });
  const [done, setDone] = useState(false);
  hudRef.current = hud; // the game timer reads the latest score, not the one from when it started
  const scene = dream.scenes[k];
  const line = phase === 'won' ? winLine : scene.lines[Math.min(n, scene.lines.length - 1)];
  const moodName = line?.mood ?? scene.mood;

  // the world
  useEffect(() => {
    const snd = createDreamSound(); sound.current = snd;
    const w = world.current;
    let alive = true;
    import('../../game/three/dreamScene').then(async ({ createDreamScene, bodyFor, kidBody }) => {
      if (!alive) return;
      const sc = createDreamScene(host.current, { onTap: (e) => w.tap(e) });
      w.scene = sc;
      window.__fsDream = sc; // lets a script or headless browser drive the dream, like window.__fsGame
      await sc.cast(bodyFor(id, REGIONS[id]), kidBody(CHILDREN[id], REGIONS[id]));
      if (!alive) return;
      sc.setScene(dream.scenes[0].id, dream.scenes[0].mood);
      setReady(true);
      if (navigator.xr) {
        const [vr, ar] = await Promise.all([navigator.xr.isSessionSupported('immersive-vr').catch(() => false), navigator.xr.isSessionSupported('immersive-ar').catch(() => false)]);
        if (alive) setXr({ vr, ar });
      }
    });
    return () => { alive = false; clearInterval(pumpTimer.current); w.scene?.dispose(); w.scene = null; snd.dispose(); if (speech.current?.stopSpeaking) speech.current.stopSpeaking(); else window.speechSynthesis?.cancel(); };
  }, [id, dream]);

  // music and the people follow the mood
  useEffect(() => { sound.current?.music(MOODS[moodName]?.music); }, [moodName]);
  useEffect(() => { sound.current?.setMuted(muted); }, [muted]);
  useEffect(() => { if (ready) world.current.scene?.setScene(scene.id, scene.mood); }, [k, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // each line: the 3D bubble (for VR), a close-up when it matters, and the feeling made visible
  useEffect(() => {
    const sc = world.current.scene;
    if (!sc || !line) return;
    sc.say({ text: L(line), who: line.who });
    const strong = (line.mood === 'sad' || line.mood === 'joy') && (line.who === 'parent' || line.who === 'child');
    if (strong) sc.closeUp(line.who); else sc.wide();
    if (line.mood === 'sad' && line.who === 'child') sc.burst('tears', 'child');
    if (line.mood === 'sad' && line.who === 'parent') sc.burst('tears', 'parent');
    if (line.mood === 'joy' && line.who === 'child') sc.burst('confetti', 'child');
  }, [line, ready, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // read each line aloud: the natural Gemini voice from voice/speech.js when that version is there (it falls back to
  // the browser's voice by itself), otherwise the browser's voice directly
  const speech = useRef(null);
  useEffect(() => { import('../../voice/speech').then((m) => { speech.current = m; }).catch(() => {}); }, []);
  const hush = () => { if (speech.current?.stopSpeaking) speech.current.stopSpeaking(); else window.speechSynthesis?.cancel(); };
  const [noVoice, setNoVoice] = useState(false);
  useEffect(() => {
    const check = () => { const v = window.speechSynthesis?.getVoices() ?? []; setNoVoice(lang === 'bn' && v.length > 0 && !v.some((x) => /^bn/i.test(x.lang))); };
    check(); window.speechSynthesis?.addEventListener?.('voiceschanged', check);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', check);
  }, [lang]);
  useEffect(() => {
    if (!read || !line) return;
    hush();
    const pitch = line.who === 'child' ? 1.35 : line.who === 'tara' ? 1.2 : line.who === 'frog' ? 1.6 : 0.95;
    if (speech.current?.speakNatural) { speech.current.speakNatural(L(line), lang, { rate: 0.92, pitch }); return; }
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(L(line));
    u.lang = lang === 'bn' ? 'bn-BD' : 'en-GB';
    u.rate = 0.92; u.pitch = pitch;
    window.speechSynthesis.speak(u);
  }, [line, read, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // taps in the world
  useEffect(() => {
    const w = world.current;
    w.tap = (e) => {
      const snd = sound.current;
      if (e.kind === 'home' && phase === 'action') { snd.fx('ting'); w.scene?.holdEarth(false); next(); }
      if (e.kind === 'cloud') { snd.fx('pop'); setHud((h) => ({ ...h, caught: h.caught + 1, dark: h.dark + (e.dark ? 1 : 0) })); }
      if (e.kind === 'plant') { snd.fx('sprout'); setHud((h) => ({ ...h, covered: h.covered + 1 })); }
      if (e.kind === 'goat') { snd.fx('goat'); w.scene?.shooGoat(); }
      if (e.kind === 'eaten') { snd.fx('goat'); setHud((h) => ({ ...h, eaten: h.eaten + 1 })); }
      if (e.kind === 'next') next();
    };
  });

  // game timers
  useEffect(() => {
    if (phase !== 'game' || scene.game === 'water') return undefined;
    const end = Date.now() + GAME_SECONDS[scene.game] * 1000;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setHud((h) => ({ ...h, time: left }));
      if (left === 0) finishGame();
    }, 250);
    return () => clearInterval(iv);
  }, [phase, k]); // eslint-disable-line react-hooks/exhaustive-deps

  function finishGame() {
    clearInterval(pumpTimer.current);
    const hud = hudRef.current, sc = world.current.scene;
    let st = 1, say = scene.win;
    if (scene.game === 'clouds') st = cloudStars(hud.caught, hud.dark, 5);
    if (scene.game === 'blanket') { const b = sc?.blanketState(); st = blanketStars(b?.covered ?? 0, b?.total ?? 12, 0); }
    if (scene.game === 'water') { const r = waterResult(hud.water); st = r.stars; if (r.kind !== 'just') say = { who: r.kind === 'flood' ? 'frog' : 'tara', mood: 'play', ...r.say }; }
    sc?.stopGame();
    setStars((x) => ({ ...x, [scene.game]: st }));
    sound.current.fx('cheer');
    sc?.burst(st >= 3 ? 'stars' : 'sparkle', 'child');
    setWinLine(say); setPhase('won');
  }

  function next() {
    hush();
    if (phase === 'lines' && n < scene.lines.length - 1) { setN(n + 1); return; }
    if (phase === 'lines' && scene.action) { if (scene.action.kind === 'find') world.current.scene?.holdEarth(true); setPhase('action'); return; }
    if (phase === 'lines' && scene.kind === 'game') {
      setHud({ time: GAME_SECONDS[scene.game] ?? 0, caught: 0, dark: 0, covered: 0, eaten: 0, water: 20 });
      world.current.scene?.startGame(scene.game); setPhase('game'); return;
    }
    if (k < dream.scenes.length - 1) { setK(k + 1); setN(0); setPhase('lines'); setWinLine(null); return; }
    setDone(true); sound.current.fx('cheer');
  }
  function act() {
    const a = scene.action, sc = world.current.scene;
    if (a.kind === 'hug') { sc?.burst('hearts', 'child'); sc?.burst('hearts', 'parent'); sc?.play('child', 'Walk'); setTimeout(() => sc?.play('parent', 'StandUp', { once: true }), 300); sound.current.fx('ting'); setWinLine(a.after); setPhase('won'); return; }
    if (a.kind === 'comfort') { sc?.play('child', 'PickUp', { once: true }); sc?.burst('hearts', 'parent'); sound.current.fx('sad'); }
    if (a.kind === 'dance') { sc?.burst('confetti', 'parent'); sc?.burst('stars', 'child'); sc?.play('child', 'Jump'); sc?.play('parent', 'Victory'); sound.current.fx('cheer'); }
    if (a.kind === 'run') { sc?.burst('hearts', 'parent'); sc?.play('child', 'Run'); setTimeout(() => sc?.play('parent', 'Victory'), 600); sound.current.fx('cheer'); }
    if (a.kind === 'find') { sound.current.fx('ting'); world.current.scene?.holdEarth(false); next(); return; } // or taps the Earth itself
    setTimeout(next, 1400);
  }
  function pump(on) {
    const sc = world.current.scene;
    clearInterval(pumpTimer.current);
    if (!on) return;
    sound.current.fx('splash');
    pumpTimer.current = setInterval(() => setHud((h) => { const water = Math.min(100, h.water + 2); sc?.setWater(water); return { ...h, water }; }), 90);
  }

  const vrEnter = async (mode) => {
    const r = world.current.scene?.renderer;
    if (!r || !navigator.xr) return;
    const opts = mode === 'immersive-ar' ? { optionalFeatures: ['dom-overlay', 'local-floor'], domOverlay: { root: overlay.current } } : { optionalFeatures: ['local-floor'] };
    try { const session = await navigator.xr.requestSession(mode, opts); r.xr.setReferenceSpaceType('local-floor'); await r.xr.setSession(session); setRead(true); } catch { /* the device said no */ }
  };

  const grey = moodName === 'sad';
  return (
    <div className="fixed inset-0 z-[70] bg-black">
      <div ref={host} className={`absolute inset-0 transition-[filter] duration-1000 ${grey ? 'saturate-[.35]' : ''}`} />
      <div ref={overlay} className="pointer-events-none absolute inset-0 flex flex-col">
        {/* top bar */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 p-3">
          <button type="button" onClick={onExit} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('বেরিয়ে যাও', 'Leave the dream')}><ArrowLeft size={20} /></button>
          <div className="rounded-full bg-white/90 px-4 py-2 text-[15px] font-bold shadow">{L(dream.child.name)} · {L(scene.title)}</div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-white/90 px-3 py-2 text-[15px] font-bold shadow"><Star size={17} className="fill-yellow-400 text-yellow-500" />{lang === 'bn' ? String(totalStars(stars)).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[d]) : totalStars(stars)}</span>
            <button type="button" onClick={() => setRead(!read)} aria-pressed={read} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('পড়ে শোনাও', 'Read aloud')} title={noVoice ? T('এই যন্ত্রে বাংলা কণ্ঠ নেই; বড়দের পড়ে শোনাতে বলো', 'This device has no Bangla voice; ask a grown-up to read aloud') : undefined}>{read ? <Mic size={19} /> : <Mic size={19} className="opacity-40" />}</button>
            <button type="button" onClick={() => setMuted(!muted)} aria-pressed={muted} className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow" aria-label={T('গান বন্ধ/চালু', 'Music on or off')}>{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
            {xr.vr && <button type="button" onClick={() => vrEnter('immersive-vr')} className="flex h-11 items-center gap-1.5 rounded-full bg-primary-700 px-4 font-bold text-white shadow"><Glasses size={18} />VR</button>}
            {xr.ar && <button type="button" onClick={() => vrEnter('immersive-ar')} className="flex h-11 items-center gap-1.5 rounded-full bg-primary-700 px-4 font-bold text-white shadow"><Smartphone size={18} />AR</button>}
          </div>
        </div>

        {!ready && <div className="m-auto rounded-2xl bg-white/90 px-6 py-4 text-[17px] font-semibold">{T('স্বপ্ন শুরু হচ্ছে…', 'The dream is starting…')}</div>}

        {/* game HUD */}
        {ready && phase === 'game' && (
          <div className="pointer-events-auto mx-auto mt-2 rounded-2xl bg-white/95 px-5 py-3 text-center shadow-lg">
            {scene.game === 'clouds' && <p className="text-[17px] font-bold">☁️ {T('কালো মেঘে চাপো!', 'Tap the dark clouds!')} · ⛈️ {hud.dark}/5 · ⏱ {hud.time}</p>}
            {scene.game === 'blanket' && <p className="text-[17px] font-bold">🌱 {T('বাদামি জমিতে চাপো, ছাগলটাকে তাড়াও!', 'Tap the brown plots, shoo the goat!')} · 🐐 {hud.eaten} · ⏱ {hud.time}</p>}
            {scene.game === 'water' && (
              <div className="w-[280px]">
                <p className="text-[17px] font-bold">💧 {T('সবুজ দাগে থামো', 'Stop in the green')}</p>
                <div className="relative mt-2 h-5 overflow-hidden rounded-full bg-amber-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.water} aria-label={T('মাটির পানি', 'Soil water')}>
                  <div className="absolute inset-y-0 bg-primary-200" style={{ left: `${WATER_BAND[0]}%`, width: `${WATER_BAND[1] - WATER_BAND[0]}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-sky-500/80 transition-[width]" style={{ width: `${hud.water}%` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" onPointerDown={() => pump(true)} onPointerUp={() => pump(false)} onPointerLeave={() => pump(false)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-[16px] font-bold text-white active:scale-95"><Droplets size={18} />{T('চেপে ধরে পাম্প', 'Hold to pump')}</button>
                  <button type="button" onClick={finishGame} className="rounded-xl bg-primary-700 px-4 py-3 text-[16px] font-bold text-white">{T('থামো!', 'Stop!')}</button>
                </div>
              </div>
            )}
            {scene.game !== 'water' && <button type="button" onClick={finishGame} className="mt-1 text-[13px] font-semibold text-primary-800 underline">{T('শেষ করো', 'Finish')}</button>}
          </div>
        )}

        {/* the dialogue */}
        {ready && !done && line && phase !== 'game' && (
          <div className="pointer-events-auto mx-auto mb-4 mt-auto w-[min(720px,calc(100%-24px))]">
            <div className={`flex items-start gap-3 rounded-[26px] p-4 shadow-2xl ring-2 ${WHO[line.who].bg} ${WHO[line.who].ring} ${moodName === 'joy' ? 'animate-[pulse_1.6s_ease-in-out_2]' : ''}`}>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[30px]" aria-hidden="true">{FACE[line.who] ?? (line.who === 'child' ? (dream.child.girl ? '👧🏽' : '👦🏽') : dream.parent.woman ? '👩🏽‍🌾' : '👨🏽‍🌾')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold uppercase tracking-wide text-ink/60">{line.who === 'tara' ? T('তারা', 'Tara') : line.who === 'frog' ? T('ব্যাঙ', 'Frog') : line.who === 'child' ? L(dream.child.name) : L(dream.parent.name)}</p>
                <p className="mt-0.5 text-[19px] font-semibold leading-8 text-ink sm:text-[21px]">{L(line)}</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              {phase === 'action'
                ? <button type="button" onClick={act} className="flex items-center gap-2 rounded-full bg-pink-600 px-6 py-3.5 text-[18px] font-bold text-white shadow-xl active:scale-95"><Heart size={20} className="fill-white" />{L(scene.action.prompt)}</button>
                : <button type="button" onClick={next} className="flex items-center gap-2 rounded-full bg-primary-700 px-6 py-3.5 text-[18px] font-bold text-white shadow-xl active:scale-95">{scene.kind === 'game' && phase === 'lines' && n >= scene.lines.length - 1 ? T('খেলা শুরু!', 'Let’s play!') : T('এরপর', 'Next')}<ArrowRight size={20} /></button>}
            </div>
          </div>
        )}

        {done && (
          <div className="pointer-events-auto m-auto w-[min(560px,calc(100%-24px))] rounded-[28px] bg-white p-6 text-center shadow-2xl">
            <p className="text-[40px]" aria-hidden="true">🌅</p>
            <h2 className="text-[26px] font-bold">{T(`শুভ সকাল, ${L(dream.child.name)}!`, `Good morning, ${L(dream.child.name)}!`)}</h2>
            <p className="mt-1 text-[16px] leading-7 text-ink/75">{T('স্বপ্নে তুমি যা শিখলে:', 'What you learned in your dream:')}</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {badgesFor(stars).map((b) => <li key={b} className="rounded-full bg-yellow-100 px-4 py-2 text-[15px] font-bold text-yellow-900 ring-1 ring-yellow-300">🏅 {L(BADGES[b])}</li>)}
            </ul>
            <p className="mt-4 rounded-2xl bg-primary-50 p-3 text-[15px] leading-7 text-primary-900">{T('বাবা-মা বা বড়দের সঙ্গে ফিল্ডশিফট ৩৬০ খুলে দেখো: তোমাদের মাঠের জন্য নাসার উপগ্রহ কী বলছে। আর কৃষি কর্মকর্তার সঙ্গে কথা বলতে বলো।', 'Open FieldShift 360 with your parents or grown-ups: see what NASA’s satellites say about your field. And ask them to talk to the agriculture officer.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link to="/farmer" className="rounded-full bg-primary-700 px-5 py-3 text-[16px] font-bold text-white">{T('বড়দের অ্যাপ খোলো', 'Open the grown-ups’ app')}</Link>
              <button type="button" onClick={() => { setDone(false); setK(0); setN(0); setPhase('lines'); setStars({}); }} className="flex items-center gap-1.5 rounded-full bg-white px-5 py-3 text-[16px] font-bold ring-1 ring-border"><RotateCcw size={17} />{T('আবার স্বপ্ন দেখো', 'Dream again')}</button>
              <button type="button" onClick={onExit} className="rounded-full bg-white px-5 py-3 text-[16px] font-bold ring-1 ring-border">{T('অন্য শিশু', 'Another child')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
