// Tiny synthesized sound effects (Web Audio, no files). Muted until the player has interacted, as browsers require.
let ctx = null;
let muted = false;
export const setMuted = (m) => { muted = m; setScene({}); };
const tone = (f, d, type = 'square', v = 0.06, at = 0, slide = 0) => {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + d + 0.02);
};
const noise = (d, v = 0.05, freq = 1200) => {
  const t0 = ctx.currentTime, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * d), ctx.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = v; src.buffer = buf; src.connect(f).connect(g).connect(ctx.destination); src.start(t0);
};
let stepAlt = 0;
function playStep(surf = 'grass', isRun = false) {
  stepAlt = 1 - stepAlt;
  const pitchVar = 0.94 + Math.random() * 0.12 + (stepAlt ? 0.03 : -0.03);
  const volScale = isRun ? 1.4 : 1.0;
  switch (surf) {
    case 'water':
      // viscous water splash & fluid droplets
      noise(isRun ? 0.08 : 0.05, 0.038 * volScale, 1500 * pitchVar);
      tone(1400 * pitchVar, 0.04, 'sine', 0.016 * volScale, 0.01, -300);
      break;
    case 'mud':
      // deep squishy suction & low damp thud
      noise(0.06, 0.035 * volScale, 420 * pitchVar);
      tone(95 * pitchVar, 0.05, 'triangle', 0.032 * volScale, 0.01, -35);
      break;
    case 'path':
      // crisp granular earth crunch & fine stone grit
      noise(0.04, 0.026 * volScale, 1900 * pitchVar);
      noise(0.02, 0.014 * volScale, 3600 * pitchVar);
      break;
    case 'wood':
      // hollow resonant timber tap
      tone(230 * pitchVar, 0.06, 'triangle', 0.04 * volScale, 0, -50);
      noise(0.03, 0.018 * volScale, 1200 * pitchVar);
      break;
    case 'grass':
    default:
      // soft foliage blade rustle
      noise(0.045, 0.02 * volScale, 920 * pitchVar);
      break;
  }
}

const FX = {
  tap: () => tone(660, 0.06, 'square', 0.03),
  plant: () => { tone(320, 0.08, 'triangle', 0.08); tone(480, 0.08, 'triangle', 0.06, 0.06); },
  water: () => noise(0.35, 0.06, 2200),
  harvest: () => [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, i * 0.06)),
  coin: () => { tone(988, 0.08, 'square', 0.04); tone(1319, 0.16, 'square', 0.04, 0.07); },
  pump: () => { noise(0.25, 0.05, 900); tone(140, 0.2, 'sine', 0.08, 0, -40); },
  spray: () => noise(0.4, 0.05, 4000),
  clear: () => tone(200, 0.12, 'sawtooth', 0.04, 0, -80),
  good: () => [659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.07, i * 0.08)),
  bad: () => tone(260, 0.3, 'sawtooth', 0.05, 0, -140),
  alarm: () => { tone(880, 0.12, 'square', 0.04); tone(880, 0.12, 'square', 0.04, 0.18); },
  thunder: () => noise(1.2, 0.12, 300),
  bump: () => { noise(0.12, 0.09, 380); tone(110, 0.14, 'sine', 0.09, 0, -50); },
  chime: () => [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.22, 'sine', 0.05, i * 0.05)),
  levelUp: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.25, 'triangle', 0.06, i * 0.07)),
  step: (opts) => playStep(opts?.surface ?? 'grass', !!opts?.run),
  step_water: (opts) => playStep('water', !!opts?.run),
  step_mud: (opts) => playStep('mud', !!opts?.run),
  step_path: (opts) => playStep('path', !!opts?.run),
  step_wood: (opts) => playStep('wood', !!opts?.run),
  step_grass: (opts) => playStep('grass', !!opts?.run),
  hoe: () => { noise(0.08, 0.04, 800); tone(180, 0.09, 'sine', 0.05, 0, -60); },
  // Living fauna sound effects
  chicken_cluck: () => { tone(720, 0.05, 'triangle', 0.025); tone(610, 0.06, 'triangle', 0.022, 0.04); },
  chicken_flutter: () => { noise(0.09, 0.035, 650); noise(0.08, 0.03, 800); },
  cow_low: () => { tone(115, 0.45, 'sine', 0.028, 0, -20); tone(82, 0.4, 'triangle', 0.018, 0.08, -12); },
  goat_bleat: () => { tone(330, 0.16, 'sawtooth', 0.024, 0, -30); tone(310, 0.13, 'sawtooth', 0.02, 0.08, -20); },
  duck_quack: () => { tone(410, 0.11, 'sawtooth', 0.03, 0, -70); },
  splash: () => { noise(0.2, 0.06, 1100); tone(320, 0.1, 'sine', 0.035, 0.02, -160); },
};
export function play(s, opts = {}) {
  if (muted || !s) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (s === 'step' || s.startsWith('step_')) {
      const surf = opts.surface || (s.startsWith('step_') ? s.slice(5) : 'grass');
      playStep(surf, opts.run);
      return;
    }
    if (FX[s]) FX[s](opts);
  } catch { /* audio unavailable */ }
}

// ---- the living soundscape: wind, birds by day, crickets at night, rain in a storm, and a quiet tune ----
// All made here with Web Audio (no files). setScene() is called a few times a second with the weather and the hour;
// each layer fades to its new level. The tune is a bamboo-flute line in raga Bhupali (Sa Re Ga Pa Dha) over a
// tanpura-like drone, sparse enough to sit under the game.
let amb = null;
const SA = 220; // A3
const BHUPALI = [0, 2, 4, 7, 9, 12, 14, 16]; // semitones above Sa
const hz = (s) => SA * Math.pow(2, s / 12);
function loopNoise(c, color = 'white') {
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), ch = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = color === 'brown' ? (last + 0.02 * w) / 1.02 : w; ch[i] = color === 'brown' ? last * 3.5 : w; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true; return src;
}
function layer(c, out, src, type, freq, q = 0.7) {
  const f = c.createBiquadFilter(), g = c.createGain();
  f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = 0;
  src.connect(f).connect(g).connect(out); src.start();
  return { g, f };
}
const fade = (p, v, s = 1.2) => { if (!amb) return; p.cancelScheduledValues(amb.c.currentTime); p.setTargetAtTime(v, amb.c.currentTime, s / 3); };
export function startAmbience() {
  if (amb) return;
  try {
    const c = ctx || new (window.AudioContext || window.webkitAudioContext)(); ctx = c;
    if (c.state === 'suspended') c.resume();
    const master = c.createGain(); master.gain.value = muted ? 0 : 1; master.connect(c.destination);
    const music = c.createGain(); music.gain.value = 0; music.connect(master);
    amb = { c, master, music, musicOn: true,
      wind: layer(c, master, loopNoise(c, 'brown'), 'lowpass', 500),
      rain: layer(c, master, loopNoise(c), 'bandpass', 2600, 0.4),
      rumble: layer(c, master, loopNoise(c, 'brown'), 'lowpass', 140),
      scene: { day: true, storm: 0, heat: 0, wind: 0.8 }, timers: [] };
    // tanpura drone: Sa and Pa, softly beating
    for (const [f, v] of [[hz(0) / 2, 0.018], [hz(7) / 2, 0.012], [hz(0) / 4, 0.016], [hz(0) / 2 * 1.003, 0.01]]) {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      lfo.frequency.value = 0.07 + Math.random() * 0.08; lg.gain.value = v * 0.5; lfo.connect(lg).connect(g.gain);
      g.gain.value = v; o.connect(lp).connect(g).connect(music); o.start(); lfo.start();
    }
    const tick = () => { if (!amb) return; birdsOrCrickets(); amb.timers.push(setTimeout(tick, 600 + Math.random() * 1400)); };
    const phrase = () => { if (!amb) return; flutePhrase(); amb.timers.push(setTimeout(phrase, 7000 + Math.random() * 9000)); };
    tick(); amb.timers.push(setTimeout(phrase, 2500));
    fade(music.gain, 1, 4);
  } catch { amb = null; }
}
export function stopAmbience() {
  if (!amb) return;
  const a = amb; amb = null;
  a.timers.forEach(clearTimeout);
  try { a.master.gain.setTargetAtTime(0, a.c.currentTime, 0.3); setTimeout(() => a.master.disconnect(), 1500); } catch { /* gone */ }
}
// scene: { day (bool), storm (0–1), heat (0–1), wind (m/s-ish) }
export function setScene(s) {
  if (!amb) return;
  amb.scene = { ...amb.scene, ...s };
  const { storm, wind } = amb.scene;
  fade(amb.master.gain, muted ? 0 : 1, 0.4);
  fade(amb.wind.g.gain, 0.05 + Math.min(1, wind / 3) * 0.12 + storm * 0.1);
  fade(amb.wind.f.frequency, 380 + wind * 160 + storm * 500);
  fade(amb.rain.g.gain, storm * 0.16);
  fade(amb.rumble.g.gain, storm * 0.1);
  fade(amb.music.gain, amb.musicOn ? 1 - storm * 0.7 : 0, 2);
}
export function setMusic(on) { if (!amb) return; amb.musicOn = on; setScene({}); }
function birdsOrCrickets() {
  if (muted || !amb) return;
  const { c, master, scene } = amb;
  if (scene.storm > 0.3) return;
  const t0 = c.currentTime;
  if (scene.day) {
    // a bird: a few quick downward whistles (a bulbul or a doel)
    const base = 2200 + Math.random() * 1800, n = 2 + Math.floor(Math.random() * 4), pan = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(master); }
    for (let k = 0; k < n; k++) {
      const o = c.createOscillator(), g = c.createGain(), at = t0 + k * (0.09 + Math.random() * 0.06);
      o.type = 'sine'; o.frequency.setValueAtTime(base * (1 + Math.random() * 0.15), at); o.frequency.exponentialRampToValueAtTime(base * 0.6, at + 0.08);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.025 * (1 - scene.heat * 0.5), at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      o.connect(g).connect(pan ?? master); o.start(at); o.stop(at + 0.12);
    }
  } else {
    // crickets: a rapid chirp train
    const o = c.createOscillator(), g = c.createGain(), am = c.createOscillator(), ag = c.createGain();
    o.type = 'sine'; o.frequency.value = 4300 + Math.random() * 500; am.frequency.value = 28; ag.gain.value = 0.012;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.012, t0 + 0.05); g.gain.linearRampToValueAtTime(0.0001, t0 + 0.45);
    am.connect(ag).connect(g.gain); o.connect(g).connect(master); o.start(t0); am.start(t0); o.stop(t0 + 0.5); am.stop(t0 + 0.5);
  }
}
function flutePhrase() {
  if (muted || !amb || !amb.musicOn || amb.scene.storm > 0.5) return;
  const { c, music } = amb;
  let t = c.currentTime + 0.1, i = Math.floor(Math.random() * 5);
  const len = 4 + Math.floor(Math.random() * 4);
  for (let k = 0; k < len; k++) {
    i = Math.max(0, Math.min(BHUPALI.length - 1, i + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
    const d = [0.45, 0.6, 0.9, 1.3][Math.floor(Math.random() * 4)] * (k === len - 1 ? 2 : 1);
    const o = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain(), breath = c.createBiquadFilter();
    const f = hz(BHUPALI[i]) * 2;
    o.type = 'triangle'; o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); // a little meend into the note
    vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg).connect(o.frequency);
    breath.type = 'lowpass'; breath.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 0.09); g.gain.setTargetAtTime(0.022, t + 0.12, 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(breath).connect(g).connect(music); o.start(t); vib.start(t); o.stop(t + d + 0.05); vib.stop(t + d + 0.05);
    t += d * 0.92;
  }
}
