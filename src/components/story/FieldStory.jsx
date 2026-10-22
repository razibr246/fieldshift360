// "My field's ten years": a 30-second story of the farmer's own Field Future numbers, drawn on a canvas. In the app
// it plays with Bangla narration (the phone's own voice); "Save video" records the same animation, with its words
// on screen, as a file to share on WhatsApp or Facebook. Every number comes from the page's engine (soilfuture.js).
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Download, Loader2 } from 'lucide-react';
import { useStore } from '../../store';
import { num, bnDigits } from '../../engine/dates';
import { cropOf, omPctOf, climateLedger, co2PerBigha, WATER_M3_PER_MM_BIGHA } from '../../engine/soilfuture';
import { BIGHA_HA } from '../../engine/crops';
import { speak, stopSpeaking, ttsSupported } from '../../voice/speech';

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
  const { s, T, L, farmer, upazila } = useStore();
  const lang = s.lang;
  const canvas = useRef(null);
  const [state, setState] = useState('idle'); // idle | playing | recording
  const raf = useRef(0);
  const d = useMemo(() => {
    const h = ff.habit, b = ff.best, om = (soc) => omPctOf(soc, fctx.soil);
    const lh = climateLedger(fctx, h.rot, h.now), lb = climateLedger(fctx, b.rot, b.now);
    const names = (rot) => rot.cycle.map((y) => [y.rabi, y.k1, 'aman'].filter((id) => id !== 'fallow').map((id) => L(cropOf(id).name)).join(' → ')).join(T(' | পরের বছর ', ' | next year '));
    return {
      habitName: names(h.rot), bestName: names(b.rot) + (b.rot.residue === 'retain' ? T(', খড় জমিতে', ', straw kept') : ''),
      om0: om(fctx.soc0), habitOm: [om(fctx.soc0), ...h.now.map((r) => om(r.soc))], bestOm: [om(fctx.soc0), ...b.now.map((r) => om(r.soc))],
      habitD: h.sNow.dSoc, bestD: b.sNow.dSoc, habitF: h.sFut?.dSoc ?? null, bestF: b.sFut?.dSoc ?? null,
      water: (h.sNow.waterMm - b.sNow.waterMm) * WATER_M3_PER_MM_BIGHA, co2: co2PerBigha(b.sNow.socEnd - fctx.soc0),
      ghgCut: lh.net > 0 ? (1 - lb.net / lh.net) * 100 : null,
    };
  }, [ff, fctx, L, T]);
  const n = (x, dp = 0) => num(x, lang, { dp });
  const sg = (x, dp = 1) => { const r = Math.round(x * 10 ** dp) / 10 ** dp; return `${r > 0 ? '+' : r < 0 ? '−' : ''}${n(Math.abs(r), dp)}`; };
  const who = L(farmer.name), place = T(`${farmer.villageBn}, ${upazila.name.bn}`, `${farmer.village}, ${upazila.name.en}`);
  const officer = L(upazila.officer);
  const lo = Math.min(...d.habitOm, ...d.bestOm) - 0.05, hi = Math.max(...d.habitOm, ...d.bestOm) + 0.05;

  // Each scene: how long, what is said, and how it is drawn at t from 0 to 1.
  const scenes = [
    { ms: 4000, say: T(`${who}-এর জমি। নাসার পঁচিশ বছরের আবহাওয়া আর জমির নিজের মাটিতে, আগামী দশ বছর।`, `${who}'s field. Ten years ahead, on twenty-five years of NASA weather and the field's own soil.`),
      draw: (g, t) => {
        g.fillStyle = C.green; g.font = `700 54px ${FONT}`; g.globalAlpha = ease(t * 2); g.fillText(T('আমার জমির ১০ বছর', 'My field’s ten years'), 90, 420);
        g.fillStyle = C.ink; g.font = `800 92px ${FONT}`; wrap(g, who, 90, 540, 900, 110);
        g.fillStyle = C.muted; g.font = `500 46px ${FONT}`; g.fillText(place, 90, 680);
        g.font = `500 38px ${FONT}`; wrap(g, T('নাসার ২৫ বছরের আবহাওয়া · জমির নিজের মাটি · নাসার জলবায়ু মডেল', '25 years of NASA weather · the field’s own soil · NASA climate models'), 90, 800, 900, 56);
        g.globalAlpha = 1;
      } },
    { ms: 5000, say: T(`এখনকার চাষ: ${d.habitName}। দশ বছরে মাটির জৈব পদার্থ ${sg(d.habitD)} শতাংশ।`, `Farming as now: ${d.habitName}. Soil organic matter ${sg(d.habitD)} per cent in ten years.`),
      draw: (g, t) => {
        g.fillStyle = C.slate; g.font = `700 50px ${FONT}`; g.fillText(T('এখনকার মতো চাষ', 'Farming as now'), 90, 300);
        g.fillStyle = C.ink; g.font = `600 44px ${FONT}`; wrap(g, d.habitName, 90, 380, 900, 60);
        round(g, 90, 520, 900, 460, 36, '#ffffff');
        line(g, d.habitOm, 150, 580, 780, 340, lo, hi, C.slate, ease(t * 1.3));
        g.fillStyle = C.muted; g.font = `500 34px ${FONT}`; g.fillText(T('মাটির জৈব পদার্থ, ১০ বছর', 'Soil organic matter, 10 years'), 150, 1040);
        g.fillStyle = d.habitD < 0 ? C.red : C.slate; g.font = `800 88px ${FONT}`; g.fillText(`${sg(d.habitD)}%`, 90, 1180);
      } },
    { ms: 5500, say: T(`সেরা ফসলচক্র: ${d.bestName}। দশ বছরে মাটির জৈব পদার্থ ${sg(d.bestD)} শতাংশ।`, `The best rotation: ${d.bestName}. Soil organic matter ${sg(d.bestD)} per cent in ten years.`),
      draw: (g, t) => {
        g.fillStyle = C.green; g.font = `700 50px ${FONT}`; g.fillText(T('সেরা ফসলচক্র', 'The best rotation'), 90, 300);
        g.fillStyle = C.ink; g.font = `600 40px ${FONT}`; wrap(g, d.bestName, 90, 380, 900, 56);
        round(g, 90, 520, 900, 460, 36, '#ffffff');
        line(g, d.habitOm, 150, 580, 780, 340, lo, hi, '#c3ccc6', 1);
        line(g, d.bestOm, 150, 580, 780, 340, lo, hi, C.green, ease(t * 1.3));
        g.fillStyle = C.muted; g.font = `500 34px ${FONT}`; g.fillText(T('ধূসর: এখনকার মতো · সবুজ: সেরা ফসলচক্র', 'Grey: as now · Green: the best rotation'), 150, 1040);
        g.fillStyle = C.green; g.font = `800 88px ${FONT}`; g.fillText(`${sg(d.bestD)}%`, 90, 1180);
      } },
    { ms: 5000, say: T(`প্রতি বিঘায় বছরে ${n(d.water)} ঘনমিটার সেচের পানি কম লাগে${d.ghgCut != null ? `, আর জমির নিট গ্রিনহাউস গ্যাস ${n(d.ghgCut)} শতাংশ কমে` : ''}।`, `${n(d.water)} cubic metres less irrigation per bigha a year${d.ghgCut != null ? `, and ${n(d.ghgCut)} per cent less net greenhouse gas from the field` : ''}.`),
      draw: (g, t) => {
        const a = ease(t * 1.5);
        g.fillStyle = C.sky; g.font = `700 50px ${FONT}`; g.fillText(T('পানি আর জলবায়ু', 'Water and climate'), 90, 300);
        round(g, 90, 380, 900, 330, 36, '#ffffff');
        g.fillStyle = C.sky; g.font = `800 120px ${FONT}`; g.fillText(n(d.water * a), 140, 560);
        g.fillStyle = C.muted; g.font = `500 38px ${FONT}`; g.fillText(T('ঘনমিটার সেচ কম, বিঘায় বছরে', 'cubic metres less irrigation, per bigha a year'), 140, 650);
        if (d.ghgCut != null) {
          round(g, 90, 760, 900, 330, 36, '#ffffff');
          g.fillStyle = C.green; g.font = `800 120px ${FONT}`; g.fillText(`${n(d.ghgCut * a)}%`, 140, 940);
          g.fillStyle = C.muted; g.font = `500 38px ${FONT}`; g.fillText(T('কম নিট গ্রিনহাউস গ্যাস (মিথেন বনাম মাটির কার্বন)', 'less net greenhouse gas (methane against soil carbon)'), 140, 1030);
        }
      } },
    { ms: 5000, say: d.bestF != null ? T(`২০৪০-এর দশকের গরমেও সেরা ফসলচক্রে মাটি ${sg(d.bestF)} শতাংশ, এখনকার চাষে ${sg(d.habitF)} শতাংশ।`, `Even in the warmer 2040s the soil goes ${sg(d.bestF)} per cent with the best rotation, ${sg(d.habitF)} per cent farming as now.`) : T('জলবায়ু বদলালেও সেরা ফসলচক্র মাটি ধরে রাখে।', 'The best rotation holds the soil as the climate changes.'),
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
    { ms: 4500, say: T(`সিদ্ধান্ত আপনার। উপজেলা কৃষি অফিসার ${officer}-এর সঙ্গে কথা বলুন।`, `The decision is yours. Talk to your upazila agriculture officer, ${officer}.`),
      draw: (g, t) => {
        g.globalAlpha = ease(t * 2);
        g.fillStyle = C.ink; g.font = `800 80px ${FONT}`; wrap(g, T('সিদ্ধান্ত আপনার।', 'The decision is yours.'), 90, 480, 900, 96);
        g.fillStyle = C.muted; g.font = `500 44px ${FONT}`; wrap(g, T(`উপজেলা কৃষি অফিসার ${officer}-এর সঙ্গে কথা বলুন`, `Talk to your upazila agriculture officer, ${officer}`), 90, 620, 900, 62);
        g.fillStyle = C.green; g.font = `800 60px ${FONT}`; g.fillText('FieldShift 360', 90, 900);
        g.fillStyle = C.muted; g.font = `500 30px ${FONT}`; wrap(g, T('নাসা POWER · GPM IMERG · NEX-GDDP-CMIP6 · ISRIC SoilGrids · FAOSTAT। নমুনা কৃষক; মডেলের হিসাব, ভবিষ্যদ্বাণী নয়।', 'NASA POWER · GPM IMERG · NEX-GDDP-CMIP6 · ISRIC SoilGrids · FAOSTAT. A sample farmer; model estimates, not forecasts.'), 90, 980, 900, 44);
        g.globalAlpha = 1;
      } },
  ];
  const total = scenes.reduce((a, x) => a + x.ms, 0);

  const frame = (ms) => {
    const g = canvas.current?.getContext('2d');
    if (!g) return;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f3f8ef'); bg.addColorStop(1, '#dfeedd');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    let acc = 0, k = 0;
    while (k < scenes.length - 1 && ms >= acc + scenes[k].ms) acc += scenes[k++].ms;
    scenes[k].draw(g, (ms - acc) / scenes[k].ms);
    // progress dots and the brand line on every frame
    scenes.forEach((_, i) => { g.beginPath(); g.arc(90 + i * 34, 1270, 9, 0, 7); g.fillStyle = i <= k ? C.green : '#c9d6c6'; g.fill(); });
    g.fillStyle = C.muted; g.font = `600 30px ${FONT}`; g.textAlign = 'right'; g.fillText('FieldShift 360 · NASA Space Apps 2026', W - 90, 1280); g.textAlign = 'left';
    return k;
  };
  useEffect(() => { document.fonts?.load(`700 40px ${FONT}`).finally(() => frame(2000)); return () => { cancelAnimationFrame(raf.current); stopSpeaking(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (onDone, voice) => {
    const t0 = performance.now();
    let said = -1;
    const tick = () => {
      const ms = performance.now() - t0, k = frame(Math.min(ms, total));
      if (voice && k !== said) { said = k; speak(scenes[k].say, lang, { rate: 1 }); }
      if (ms < total) raf.current = requestAnimationFrame(tick); else onDone();
    };
    tick();
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
        <p className="mt-2 px-1 text-[11.5px] leading-4 text-muted">{T(`প্রায় ${bnDigits(Math.round(total / 1000))} সেকেন্ড। ভিডিওতে লেখাগুলো থাকে; কণ্ঠ শুধু অ্যাপে চালালে শোনা যায়।`, `About ${Math.round(total / 1000)} seconds. The video carries the words on screen; the voice plays in the app.`)}</p>
      </div>
    </div>
  );
}
