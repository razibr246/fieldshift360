// Music and sounds for the children's dream, made in the browser with Web Audio (no files). Each mood (game/dream.js
// MOODS[].music) has its own slow chord and a little tune; effects mark a caught cloud, a sprout, a splash, a goat,
// a cheer. Everything is quiet by default and can be muted.
const MUSIC = {
  soft: { chord: [220, 277.2, 329.6], tune: [440, 392, 349.2, 329.6], tempo: 1.1, wave: 'sine', vol: 0.05 },
  wonder: { chord: [261.6, 329.6, 392, 493.9], tune: [523.3, 659.3, 784, 659.3, 587.3], tempo: 0.7, wave: 'triangle', vol: 0.05 },
  play: { chord: [293.7, 370, 440], tune: [587.3, 659.3, 740, 880, 740, 659.3], tempo: 0.32, wave: 'triangle', vol: 0.055 },
  sad: { chord: [196, 233.1, 293.7], tune: [392, 349.2, 311.1, 293.7], tempo: 1.4, wave: 'sine', vol: 0.05 },
  joy: { chord: [261.6, 329.6, 392], tune: [523.3, 659.3, 784, 1046.5, 784, 880, 1046.5], tempo: 0.26, wave: 'square', vol: 0.03 },
};

export function createDreamSound() {
  let ctx = null, master = null, timer = null, pad = [], muted = false, mood = null;
  const ensure = () => {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const note = (f, start, dur, { wave = 'sine', vol = 0.05 } = {}) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(vol, start + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(master); o.start(start); o.stop(start + dur + 0.05);
  };
  function stopMusic() { clearInterval(timer); timer = null; pad.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } }); pad = []; }
  function music(name) {
    if (name === mood) return;
    mood = name; stopMusic();
    const m = MUSIC[name];
    if (!m || muted) return;
    ensure();
    pad = m.chord.map((f) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f / 2; g.gain.value = m.vol * 0.5; o.connect(g); g.connect(master); o.start(); return o; });
    let i = 0;
    timer = setInterval(() => { if (!muted) note(m.tune[i++ % m.tune.length], ctx.currentTime, m.tempo * 1.6, { wave: m.wave, vol: m.vol }); }, m.tempo * 1000);
  }
  const FX = {
    pop: () => { note(880, ctx.currentTime, 0.15, { wave: 'triangle', vol: 0.12 }); note(1320, ctx.currentTime + 0.06, 0.15, { wave: 'triangle', vol: 0.1 }); },
    sprout: () => [523.3, 659.3, 784].forEach((f, i) => note(f, ctx.currentTime + i * 0.07, 0.25, { wave: 'sine', vol: 0.1 })),
    splash: () => note(180, ctx.currentTime, 0.4, { wave: 'sawtooth', vol: 0.05 }),
    goat: () => { for (let i = 0; i < 5; i++) note(420 + (i % 2) * 40, ctx.currentTime + i * 0.06, 0.08, { wave: 'sawtooth', vol: 0.06 }); },
    cheer: () => [523.3, 659.3, 784, 1046.5].forEach((f, i) => note(f, ctx.currentTime + i * 0.1, 0.4, { wave: 'square', vol: 0.05 })),
    sad: () => [392, 349.2, 293.7].forEach((f, i) => note(f, ctx.currentTime + i * 0.3, 0.6, { wave: 'sine', vol: 0.08 })),
    ting: () => note(1567.98, ctx.currentTime, 0.5, { wave: 'sine', vol: 0.08 }),
  };
  return {
    music,
    fx(name) { if (muted) return; ensure(); FX[name]?.(); },
    setMuted(v) { muted = v; if (v) stopMusic(); else { const m = mood; mood = null; if (m) music(m); } },
    dispose() { stopMusic(); ctx?.close(); },
  };
}
