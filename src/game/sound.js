// Tiny synthesized sound effects (Web Audio, no files). Muted until the player has interacted, as browsers require.
let ctx = null;
let muted = false;
export const setMuted = (m) => { muted = m; };
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
};
export function play(s) {
  if (muted || !FX[s]) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    FX[s]();
  } catch { /* audio unavailable */ }
}
