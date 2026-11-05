// A soft river sound for the home hero, made in the browser (Web Audio): no file to download. Brown noise through a
// low band-pass gives the body of moving water, its loudness rising and falling slowly like small waves reaching the
// bank; a faint, quicker high layer gives the trickle over stones. Starts only from a click (browsers block sound
// otherwise), fades in and out, and goes quiet while the tab is hidden.
let ctx = null, master = null, nodes = [];
const LEVEL = 0.16;

function noise(c, seconds = 4, brown = true) {
  const len = c.sampleRate * seconds, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * white) / 1.02; d[i] = last * 3.5; } else d[i] = white;
  }
  // Fade the loop's ends into each other so it never clicks.
  for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] *= k; d[len - 1 - i] *= k; }
  return b;
}

function layer(c, { buffer, type, freq, q, gain, lfoRate, lfoDepth }) {
  const src = c.createBufferSource(); src.buffer = buffer; src.loop = true; src.playbackRate.value = 0.97 + Math.random() * 0.06;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  const lfo = c.createOscillator(); lfo.frequency.value = lfoRate;
  const depth = c.createGain(); depth.gain.value = lfoDepth;
  lfo.connect(depth).connect(g.gain);
  src.connect(f).connect(g).connect(master);
  src.start(); lfo.start();
  return [src, lfo];
}

export function riverSoundSupported() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export async function startRiver() {
  if (!riverSoundSupported()) return false;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    master.connect(lp).connect(ctx.destination);
    const brown = noise(ctx, 6, true), white = noise(ctx, 3, false);
    nodes = [
      ...layer(ctx, { buffer: brown, type: 'bandpass', freq: 420, q: 0.7, gain: 0.55, lfoRate: 0.11, lfoDepth: 0.22 }), // the body, slow swells
      ...layer(ctx, { buffer: brown, type: 'bandpass', freq: 900, q: 1.1, gain: 0.22, lfoRate: 0.23, lfoDepth: 0.12 }), // small waves lapping
      ...layer(ctx, { buffer: white, type: 'highpass', freq: 3200, q: 0.5, gain: 0.025, lfoRate: 0.7, lfoDepth: 0.015 }), // trickle
    ];
    document.addEventListener('visibilitychange', onVisibility);
  }
  await ctx.resume();
  setRiverLevel(1);
  return true;
}

let level = 1;
// 1 while a photo with water is on screen, lower over the other photos.
export function setRiverLevel(k) {
  level = k;
  if (!ctx || ctx.state !== 'running' || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(LEVEL * k, now, 0.9);
}

export function stopRiver() {
  if (!ctx || !master) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(0, now, 0.35);
  const c = ctx;
  setTimeout(() => { if (c === ctx && master.gain.value < 0.01) c.suspend(); }, 1600);
}

// Leaving the page: stop the sound and free the audio device.
export function closeRiver() {
  if (!ctx) return;
  document.removeEventListener('visibilitychange', onVisibility);
  nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
  ctx.close().catch(() => {});
  ctx = null; master = null; nodes = [];
}

function onVisibility() {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else if (master && master.gain.value > 0.001) { ctx.resume(); setRiverLevel(level); }
}
