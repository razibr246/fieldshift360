// "My field's ten years": a one-minute story of the farmer's own Field Future numbers, drawn on a canvas. In the app
// it plays with spoken narration in the most natural voice the device has, written to be said aloud (short
// sentences, changes said as words, a breath between sentences), and each scene waits for its words to finish.
// "Save video" records the same animation, with its words on screen, as a file to share on WhatsApp or Facebook;
// "Copy the script" hands the narration to a voice tool. Every number comes from the page's engine (soilfuture.js).
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Download, Loader2, Copy } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { cropOf, omPctOf, climateLedger, co2PerBigha, WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';
import { BIGHA_HA } from '../../engine/crops';
import { bnOf } from '../../engine/text';
import { speak, stopSpeaking, ttsSupported, loadVoices, pickVoice, isNaturalVoice } from '../../voice/speech';

const W = 1080, H = 1350;
const FONT = '"Noto Sans Bengali Variable", "Kohinoor Bangla", "Inter Variable", sans-serif';
const C = { ink: '#13261b', muted: '#5d6a63', green: '#2f6e2f', light: '#e8f1e4', gold: '#b8761b', slate: '#6b7a72', sky: '#2f7fa8', red: '#b3261e' };
const ease = (t) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy + lh;
}
function round(ctx, x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }

// One line of organic matter over ten years, drawn up to `t`.
function line(ctx, pts, x, y, w, h, lo, hi, color, t) {
  const n = Math.max(2, Math.ceil(pts.length * t));
  ctx.beginPath();
  pts.slice(0, n).forEach((v, i) => { const px = x + (i / (pts.length - 1)) * w, py = y + h - ((v - lo) / (hi - lo)) * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
}

export default function FieldStory({ ff, ctx: fctx, onClose }) {
  const { s, T, L, farmer, upazila, toast } = useStore();
  const lang = s.lang;
  const canvas = useRef(null);
  const [state, setState] = useState('idle'); // idle | playing | recording
  const raf = useRef(0);
  const d = useMemo(() => {
    const h = ff.habit, b = ff.best, om = (soc) => omPctOf(soc, fctx.soil);
    const lh = climateLedger(fctx, h.rot, h.now), lb = climateLedger(fctx, b.rot, b.now);
    const crops = (y) => [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name));
    const names = (rot) => rot.cycle.map((y) => crops(y).join(' → ')).join(T(' | পরের বছর ', ' | next year '));
    // the same, as it is said: "mustard, jute and Aman; the next year …"
    const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')}${T(' আর ', ' and ')}${xs[xs.length - 1]}` : xs[0]);
    const spoken = (rot) => rot.cycle.map((y) => list(crops(y))).join(T('; পরের বছর ', '; the next year, '));
    return {
      habitName: names(h.rot), bestName: names(b.rot) + (b.rot.residue === 'retain' ? T(', খড় জমিতে', ', straw kept') : ''),
      habitSaid: spoken(h.rot), bestSaid: spoken(b.rot), straw: b.rot.residue === 'retain',
      om0: om(fctx.soc0), habitOm: [om(fctx.soc0), ...h.now.map((r) => om(r.soc))], bestOm: [om(fctx.soc0), ...b.now.map((r) => om(r.soc))],
      habitD: h.sNow.dSoc, bestD: b.sNow.dSoc, habitF: h.sFut?.dSoc ?? null, bestF: b.sFut?.dSoc ?? null,
      water: (h.sNow.waterMm - b.sNow.waterMm) * WATER_M3_PER_MM_BIGHA, co2: co2PerBigha(b.sNow.socEnd - fctx.soc0),
      ghgCut: lh.net > 0 ? (1 - lb.net / lh.net) * 100 : null,
    };
  }, [ff, fctx, L, T]);
  const n = (x, dp = 0) => num(x, lang, { dp });
  const sg = (x, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n(Math.abs(r), dp)}`; };
  // A change as it is said: "rises by 2.3 per cent", never "+2.3".
  const change = (x, dp = 1) => {
    const r = Math.round(x * 10 ** dp) / 10 ** dp, v = n(Math.abs(r), dp);
    return Math.abs(r) < 0.05 ? T('প্রায় একই থাকে', 'stays about the same') : r > 0 ? T(`${v} শতাংশ বাড়ে`, `rises by ${v} per cent`) : T(`${v} শতাংশ কমে`, `falls by ${v} per cent`);
  };
  const who = L(farmer.name), place = T(`${farmer.villageBn}, ${upazila.name.bn}`, `${farmer.village}, ${upazila.name.en}`);
  const placeSaid = T(`${bnOf(upazila.name.bn)} ${farmer.villageBn}`, `${farmer.village}, ${upazila.name.en}`);
  const less = d.water > 20, more = d.water < -20;
  const officer = L(upazila.officer);
  const lo = Math.min(...d.habitOm, ...d.bestOm) - 0.05, hi = Math.max(...d.habitOm, ...d.bestOm) + 0.05;

  // Each scene: how long, what is said, and how it is drawn at t from 0 to 1.
  const scenes = [
    { ms: 4000, say: T(`এটা ${s.lang === 'bn' ? bnOf(who) : who} জমি, ${placeSaid}। … নাসার পঁচিশ বছরের আবহাওয়া আর জমির নিজের মাটি দিয়ে দেখি, আগামী দশ বছরে এর মাটির কী হয়।`, `This is ${who}'s field, in ${placeSaid}. … With twenty-five years of NASA weather and the field's own soil, let's see what happens to it over the next ten years.`),
      draw: (g, t) => {
        g.fillStyle = C.green; g.font = `700 54px ${FONT}`; g.globalAlpha = ease(t * 2); g.fillText(T('আমার জমির ১০ বছর', 'My field’s ten years'), 90, 420);
        g.fillStyle = C.ink; g.font = `800 92px ${FONT}`; wrap(g, who, 90, 540, 900, 110);
        g.fillStyle = C.muted; g.font = `500 46px ${FONT}`; g.fillText(place, 90, 680);
        g.font = `500 38px ${FONT}`; wrap(g, T('নাসার ২৫ বছরের আবহাওয়া · জমির নিজের মাটি · নাসার জলবায়ু মডেল', '25 years of NASA weather · the field’s own soil · NASA climate models'), 90, 800, 900, 56);
        g.globalAlpha = 1;
      } },
    { ms: 5000, say: T(`আগে দেখি এখনকার চাষ: ${d.habitSaid}। এভাবে চললে, দশ বছরে মাটির জৈব পদার্থ ${change(d.habitD)}।`, `First, farming as now: ${d.habitSaid}. Carry on like this, and in ten years the soil's organic matter ${change(d.habitD)}.`),
      draw: (g, t) => {
        g.fillStyle = C.slate; g.font = `700 50px ${FONT}`; g.fillText(T('এখনকার মতো চাষ', 'Farming as now'), 90, 300);
        g.fillStyle = C.ink; g.font = `600 44px ${FONT}`; wrap(g, d.habitName, 90, 380, 900, 60);
        round(g, 90, 520, 900, 460, 36, '#ffffff');
        line(g, d.habitOm, 150, 580, 780, 340, lo, hi, C.slate, ease(t * 1.3));
        g.fillStyle = C.muted; g.font = `500 34px ${FONT}`; g.fillText(T('মাটির জৈব পদার্থ, ১০ বছর', 'Soil organic matter, 10 years'), 150, 1040);
        g.fillStyle = d.habitD < 0 ? C.red : C.slate; g.font = `800 88px ${FONT}`; g.fillText(`${sg(d.habitD)}%`, 90, 1180);
      } },
    { ms: 5500, say: T(`এবার সেরা ফসলচক্র: ${d.bestSaid}${d.straw ? '; আর খড় জমিতেই মিশিয়ে দেওয়া' : ''}। এতে দশ বছরে জৈব পদার্থ ${change(d.bestD)}${d.bestD > 0.05 && d.bestD > d.habitD ? '… মানে মাটি ধীরে ধীরে আরও উর্বর হয়।' : '।'}`, `Now the best rotation: ${d.bestSaid}${d.straw ? ', with the straw ploughed back in' : ''}. With this, in ten years organic matter ${change(d.bestD)}${d.bestD > 0.05 && d.bestD > d.habitD ? '… so the soil slowly grows richer.' : '.'}`),
      draw: (g, t) => {
        g.fillStyle = C.green; g.font = `700 50px ${FONT}`; g.fillText(T('সেরা ফসলচক্র', 'The best rotation'), 90, 300);
        g.fillStyle = C.ink; g.font = `600 40px ${FONT}`; wrap(g, d.bestName, 90, 380, 900, 56);
        round(g, 90, 520, 900, 460, 36, '#ffffff');
        line(g, d.habitOm, 150, 580, 780, 340, lo, hi, '#c3ccc6', 1);
        line(g, d.bestOm, 150, 580, 780, 340, lo, hi, C.green, ease(t * 1.3));
        g.fillStyle = C.muted; g.font = `500 34px ${FONT}`; g.fillText(T('ধূসর: এখনকার মতো · সবুজ: সেরা ফসলচক্র', 'Grey: as now · Green: the best rotation'), 150, 1040);
        g.fillStyle = C.green; g.font = `800 88px ${FONT}`; g.fillText(`${sg(d.bestD)}%`, 90, 1180);
      } },
    { ms: 5000, say: T(`${less ? `শুধু মাটি নয়, পানিও বাঁচে। প্রতি বিঘায় বছরে প্রায় ${n(d.water)} ঘনমিটার কম সেচ লাগে।` : more ? `সেচ অবশ্য একটু বেশি লাগে: প্রতি বিঘায় বছরে প্রায় ${n(-d.water)} ঘনমিটার।` : 'সেচের পানি প্রায় একই লাগে।'}${d.ghgCut != null && d.ghgCut > 0.5 ? ` আর জমি থেকে নিট গ্রিনহাউস গ্যাস কমে ${n(d.ghgCut)} শতাংশ।` : ''}`,
      `${less ? `It saves water as well as soil: about ${n(d.water)} cubic metres less irrigation per bigha, every year.` : more ? `It does take a little more irrigation: about ${n(-d.water)} cubic metres per bigha a year.` : 'It takes about the same irrigation water.'}${d.ghgCut != null && d.ghgCut > 0.5 ? ` And the field's net greenhouse gas falls by ${n(d.ghgCut)} per cent.` : ''}`),
      draw: (g, t) => {
        const a = ease(t * 1.5);
        g.fillStyle = C.sky; g.font = `700 50px ${FONT}`; g.fillText(T('পানি আর জলবায়ু', 'Water and climate'), 90, 300);
        round(g, 90, 380, 900, 330, 36, '#ffffff');
        g.fillStyle = C.sky; g.font = `800 120px ${FONT}`; g.fillText(n(Math.abs(d.water) * a), 140, 560);
        g.fillStyle = C.muted; g.font = `500 38px ${FONT}`; g.fillText(more ? T('ঘনমিটার সেচ বেশি, বিঘায় বছরে', 'cubic metres more irrigation, per bigha a year') : T('ঘনমিটার সেচ কম, বিঘায় বছরে', 'cubic metres less irrigation, per bigha a year'), 140, 650);
        if (d.ghgCut != null) {
          round(g, 90, 760, 900, 330, 36, '#ffffff');
          g.fillStyle = C.green; g.font = `800 120px ${FONT}`; g.fillText(`${n(d.ghgCut * a)}%`, 140, 940);
          g.fillStyle = C.muted; g.font = `500 38px ${FONT}`; g.fillText(T('কম নিট গ্রিনহাউস গ্যাস (মিথেন বনাম মাটির কার্বন)', 'less net greenhouse gas (methane against soil carbon)'), 140, 1030);
        }
      } },
    { ms: 5000, say: d.bestF != null ? T(`আবহাওয়া আরও গরম হলে কী হবে? নাসার জলবায়ু মডেলে, দুই হাজার চল্লিশের দশকে… সেরা ফসলচক্রে মাটির জৈব পদার্থ ${change(d.bestF)}, আর এখনকার চাষে ${change(d.habitF)}।`, `And if it gets hotter? In NASA's climate models, in the twenty-forties… with the best rotation, the soil's organic matter ${change(d.bestF)}; farming as now, it ${change(d.habitF)}.`) : T('জলবায়ু বদলালেও সেরা ফসলচক্র মাটি ধরে রাখে।', 'The best rotation holds the soil as the climate changes.'),
      draw: (g, t) => {
        g.fillStyle = C.gold; g.font = `700 50px ${FONT}`; g.fillText(T('২০৪০-এর দশকে, নাসার জলবায়ু মডেলে', 'In the 2040s, in NASA’s climate models'), 90, 300);
        const bars = [[T('এখনকার মতো', 'As now'), d.habitF, C.slate], [T('সেরা ফসলচক্র', 'Best rotation'), d.bestF, C.green]];
        bars.forEach(([lab, v, col], i) => {
          if (v == null) return;
          const top = Math.max(0.1, Math.abs(d.habitF ?? 0), Math.abs(d.bestF ?? 0)), y = 460 + i * 300, wv = (Math.abs(v) / top) * 400 * ease(t * 1.4);
          g.fillStyle = C.ink; g.font = `600 44px ${FONT}`; g.fillText(lab, 90, y);
          round(g, 560 - (v < 0 ? wv : 0), y + 30, Math.max(8, wv), 70, 18, col);
          g.fillStyle = '#9aa59f'; g.fillRect(558, y + 14, 4, 102);
          g.fillStyle = col; g.font = `800 64px ${FONT}`; g.fillText(`${sg(v)}%`, 90, y + 100);
        });
        g.fillStyle = C.muted; g.font = `500 34px ${FONT}`; wrap(g, T('মাটির জৈব পদার্থের বদল, দশ বছরে; নাসা NEX-GDDP-CMIP6, মাঝারি পথ', 'Change in soil organic matter over ten years; NASA NEX-GDDP-CMIP6, middle road'), 90, 1100, 900, 48);
      } },
    { ms: 4500, say: T(`সিদ্ধান্ত অবশ্যই আপনার। … শুরু করার আগে একবার উপজেলা কৃষি অফিসার ${s.lang === 'bn' ? bnOf(officer) : officer} সঙ্গে কথা বলে নিন।`, `The decision is, of course, yours. … Before you start, have a word with your upazila agriculture officer, ${officer}.`),
      draw: (g, t) => {
        g.globalAlpha = ease(t * 2);
        g.fillStyle = C.ink; g.font = `800 80px ${FONT}`; wrap(g, T('সিদ্ধান্ত আপনার।', 'The decision is yours.'), 90, 480, 900, 96);
        g.fillStyle = C.muted; g.font = `500 44px ${FONT}`; wrap(g, T(`উপজেলা কৃষি অফিসার ${officer}-এর সঙ্গে কথা বলুন`, `Talk to your upazila agriculture officer, ${officer}`), 90, 620, 900, 62);
        g.fillStyle = C.green; g.font = `800 60px ${FONT}`; g.fillText('FieldShift 360', 90, 900);
        g.fillStyle = C.muted; g.font = `500 30px ${FONT}`; wrap(g, T('নাসা POWER · GPM IMERG · NEX-GDDP-CMIP6 · ISRIC SoilGrids · FAOSTAT। নমুনা কৃষক; মডেলের হিসাব, ভবিষ্যদ্বাণী নয়।', 'NASA POWER · GPM IMERG · NEX-GDDP-CMIP6 · ISRIC SoilGrids · FAOSTAT. A sample farmer; model estimates, not forecasts.'), 90, 980, 900, 44);
        g.globalAlpha = 1;
      } },
  ];
  // Every scene lasts at least as long as its words take at a natural pace (about 14 characters a second in Bangla,
  // 16 in English, and a held breath at each "…"), so the saved video and a voice made for it line up.
  for (const x of scenes) x.ms = Math.max(x.ms, Math.round((x.say.length / (lang === 'bn' ? 14 : 16)) * 1000 + (x.say.match(/…/g)?.length ?? 0) * 700 + 600));
  const total = scenes.reduce((a, x) => a + x.ms, 0);

  // Draw scene k at t (0–1); frame(ms) finds the scene on the fixed timeline the recording uses.
  const draw = (k, t) => {
    const g = canvas.current?.getContext('2d');
    if (!g) return;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f3f8ef'); bg.addColorStop(1, '#dfeedd');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    scenes[k].draw(g, t);
    // progress dots and the brand line on every frame
    scenes.forEach((_, i) => { g.beginPath(); g.arc(90 + i * 34, 1270, 9, 0, 7); g.fillStyle = i <= k ? C.green : '#c9d6c6'; g.fill(); });
    g.fillStyle = C.muted; g.font = `600 30px ${FONT}`; g.textAlign = 'right'; g.fillText('FieldShift 360 · NASA Space Apps 2026', W - 90, 1280); g.textAlign = 'left';
  };
  const frame = (ms) => {
    let acc = 0, k = 0;
    while (k < scenes.length - 1 && ms >= acc + scenes[k].ms) acc += scenes[k++].ms;
    draw(k, (ms - acc) / scenes[k].ms);
    return k;
  };
  useEffect(() => { document.fonts?.load(`700 40px ${FONT}`).finally(() => frame(2000)); return () => { cancelAnimationFrame(raf.current); stopSpeaking(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (onDone, voice) => {
    if (!voice) { // the recording: the fixed timeline
      const t0 = performance.now();
      const tick = () => { const ms = performance.now() - t0; frame(Math.min(ms, total)); if (ms < total) raf.current = requestAnimationFrame(tick); else onDone(); };
      tick();
      return;
    }
    // With the voice, a scene moves on once its words have been said and have had a moment to land (or, if the voice
    // stalls, after three times its length).
    let k = 0, start = performance.now(), saidAt = null;
    const say = () => speak(scenes[k].say, lang, { rate: 0.92, gap: 380, onEnd: () => { saidAt = performance.now(); } });
    say();
    const tick = () => {
      const now = performance.now(), t = (now - start) / scenes[k].ms;
      draw(k, Math.min(1, t));
      const done = (t >= 1 && saidAt !== null && now - saidAt > 550) || now - start > scenes[k].ms * 3;
      if (done) {
        if (++k >= scenes.length) { onDone(); return; }
        start = now; saidAt = null; say();
      }
      raf.current = requestAnimationFrame(tick);
    };
    tick();
  };
  // Which voice the device will use, shown under the player with a tip when it is not a natural one.
  const [voice, setVoice] = useState(undefined);
  useEffect(() => { if (ttsSupported()) loadVoices().then((v) => setVoice(pickVoice(v, lang))); else setVoice(null); }, [lang]);
  const copyScript = () => {
    const text = scenes.map((x, i) => `${i + 1}. ${x.say}`).join('\n\n');
    navigator.clipboard?.writeText(text).then(() => toast('গল্পের লেখা কপি হয়েছে', 'Script copied'), () => {});
  };
  const play = () => { stopSpeaking(); cancelAnimationFrame(raf.current); setState('playing'); run(() => setState('idle'), ttsSupported()); };
  const save = () => {
    const types = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'];
    const type = types.find((x) => window.MediaRecorder?.isTypeSupported?.(x));
    if (!type || !canvas.current.captureStream) return;
    stopSpeaking(); cancelAnimationFrame(raf.current);
    const rec = new MediaRecorder(canvas.current.captureStream(30), { mimeType: type, videoBitsPerSecond: 4e6 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(chunks, { type }));
      a.download = `fieldshift-${farmer.id.toLowerCase()}-10-years.${type.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); setState('idle');
    };
    setState('recording'); rec.start(); run(() => rec.stop(), false);
  };
  const canRecord = typeof window !== 'undefined' && !!window.MediaRecorder;

  return (
    <div role="dialog" aria-modal="true" aria-label={T('আমার জমির ১০ বছর', 'My field’s ten years')} className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[440px] rounded-[26px] bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-1">
          <b className="text-[15px]">{T('আমার জমির ১০ বছর', 'My field’s ten years')}</b>
          <button type="button" onClick={onClose} aria-label={T('বন্ধ করুন', 'Close')} className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5"><X size={17} /></button>
        </div>
        <canvas ref={canvas} width={W} height={H} className="block w-full rounded-2xl" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={state !== 'idle'} onClick={play} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-700 px-4 py-2.5 text-[14.5px] font-semibold text-white disabled:opacity-60"><Play size={16} />{state === 'playing' ? T('চলছে…', 'Playing…') : T('কণ্ঠসহ চালান', 'Play with voice')}</button>
          {canRecord && <button type="button" disabled={state !== 'idle'} onClick={save} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-[14.5px] font-semibold disabled:opacity-60">{state === 'recording' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{state === 'recording' ? T('ভিডিও বানানো হচ্ছে…', 'Making the video…') : T('ভিডিও নামান', 'Save video')}</button>}
        </div>
        <div className="mt-2 space-y-1 px-1 text-[11.5px] leading-4 text-muted">
          <p>{T(`প্রায় ${bnDigits(Math.round(total / 1000))} সেকেন্ড, কণ্ঠসহ একটু বেশি। ভিডিওতে লেখাগুলো থাকে; কণ্ঠ শুধু অ্যাপে চালালে শোনা যায়।`, `About ${Math.round(total / 1000)} seconds, a little longer with the voice. The video carries the words on screen; the voice plays in the app.`)}</p>
          {voice !== undefined && (voice
            ? <p>{T(`কণ্ঠ: ${voice.name}`, `Voice: ${voice.name}`)}{isNaturalVoice(voice) ? '' : T('। আরও মানুষের মতো কণ্ঠের জন্য Microsoft Edge-এ খুলুন (বাংলা "Nabanita" বা "Pradeep" কণ্ঠ), বা ফোনের সেটিংসে উন্নত বাংলা কণ্ঠ নামিয়ে নিন।', '. For a more human voice, open this in Microsoft Edge (its natural voices), or download an enhanced voice in the phone’s settings.')}</p>
            : <p>{T('এই ডিভাইসে বাংলা কণ্ঠ নেই; Microsoft Edge বা Chrome-এ খুলুন।', 'This device has no voice for this language; open it in Microsoft Edge or Chrome.')}</p>)}
          <button type="button" onClick={copyScript} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline"><Copy size={12} />{T('গল্পের লেখা কপি করুন (অন্য কণ্ঠ-টুলে বসাতে)', 'Copy the script (for a voice tool)')}</button>
        </div>
      </div>
    </div>
  );
}
