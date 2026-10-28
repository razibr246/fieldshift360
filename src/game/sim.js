// The simulation for "মাঠের মানুষ": the farmer walking and running about the farm, the 18 plots, the season's
// challenges with FieldShift's warnings, the storm's safe zone and the market. No drawing here; the 3D stage reads
// the state every frame and turns the events in `g.out` into sound, particles and HUD messages.
import { DAY, PLOT, GAP, FCOLS, FROWS, FIELD_W, FIELD_D, REGIONS, QUESTS } from './regions.js';
import { layoutFor, resolve, inWater } from './layout.js';
import { PLACES, spot } from './places.js';

const CELL = PLOT + GAP;
export const plotCenter = (c, r) => [-FIELD_W / 2 + PLOT / 2 + c * CELL, -FIELD_D / 2 + PLOT / 2 + r * CELL];
export const STATIONS = ['shed', 'water', 'market', 'kiosk'];
const ACT_TIME = { plant: 0.7, water: 0.9, harvest: 0.8, spray: 1, clear: 0.6, pump: 1.1, sell: 0.9, wipe: 2.4, phone: 2.8, adjust: 2.2 };
const rand = (a, b) => a + Math.random() * (b - a);

// Bangla genitive: পোকা → পোকার, শূকর → শূকরের.
export const gen = (w) => (/[ািীুূৃেৈোৌঅআইঈউঊএঐওঔ]$/.test(w) ? `${w}র` : `${w}ের`);
const cap = (w) => w[0].toUpperCase() + w.slice(1);
// FieldShift phone alerts, worded for the region's storm and pest.
const ALERT = (R) => ({
  heatSoon: { tone: 'warn', title: { bn: 'তাপপ্রবাহের সতর্কতা', en: 'Heatwave warning' }, body: { bn: 'নাসার তথ্য বলছে কয়েক সেকেন্ডের মধ্যে কড়া গরম। এখনই সব চারায় পানি দিন।', en: 'NASA data shows strong heat within seconds. Water every seedling now.' } },
  heatOn: { tone: 'hot', title: { bn: 'তাপপ্রবাহ চলছে', en: 'Heatwave on' }, body: { bn: 'মাটি দ্বিগুণ দ্রুত শুকাচ্ছে। শুকনো জমি খুঁজতে উপগ্রহের চোখ খুলুন (N)।', en: 'Soil is drying twice as fast. Open the satellite view (N) to spot dry plots.' } },
  heatOff: { tone: 'ok', title: { bn: 'গরম কমেছে', en: 'The heat has passed' }, body: { bn: 'ভালো সামলেছেন।', en: 'Well handled.' } },
  pestSoon: { tone: 'warn', title: { bn: `${gen(R.pestWord.bn)} খবর`, en: `${cap(R.pestWord.en)} report` }, body: { bn: `পাশের গ্রামে ${R.pestWord.bn} দেখা গেছে। জমিতে নজর রাখুন।`, en: `${cap(R.pestWord.en)} seen in the next village. Watch your plots.` } },
  pestOn: { tone: 'hot', title: { bn: `জমিতে ${R.pestWord.bn}!`, en: `${cap(R.pestWord.en)} in the field!` }, body: { bn: 'আক্রান্ত জমিতে দাঁড়িয়ে ব্যবস্থা নিন — দেরি হলে পাশের জমিতে ছড়াবে।', en: 'Stand on each affected plot to deal with it — it spreads if you wait.' } },
  stormSoon: { tone: 'hot', title: { bn: `${R.storm.bn} আসছে`, en: `${R.storm.en} coming` }, body: { bn: `পাকা ফসল তুলে মানচিত্রের নিরাপদ বৃত্তে যান: ${R.names.safe.bn}।`, en: `Bring in the ripe crop, then get inside the safe circle on the map: ${R.names.safe.en}.` } },
  stormOn: { tone: 'hot', title: { bn: `${R.storm.bn} শুরু`, en: `The ${R.storm.en.toLowerCase()} is here` }, body: { bn: R.storm.kind === 'flood' ? 'ঢলের পানি মাঠে ঢুকছে — না কাটা ফসল ডুবে যাবে।' : 'বৃষ্টি সব জমিতে পানি দিচ্ছে — কিন্তু পাকা ফসল মাঠে থাকলে নষ্ট হবে।', en: R.storm.kind === 'flood' ? 'The flood water is pouring into the field — uncut crop will drown.' : 'The rain waters every plot — but ripe crop left out will spoil.' } },
  stormOff: { tone: 'ok', title: { bn: `${R.storm.bn} থেমেছে`, en: `The ${R.storm.en.toLowerCase()} is over` }, body: { bn: R.storm.kind === 'flood' ? 'পানি নেমে যাচ্ছে।' : 'আকাশ পরিষ্কার হচ্ছে।', en: R.storm.kind === 'flood' ? 'The water is going down.' : 'The sky is clearing.' } },
  glutSoon: { tone: 'warn', title: { bn: 'বাজারের খবর', en: 'Market news' }, body: { bn: `সবাই একসঙ্গে ${R.crops[R.glut].bn} তুলছে — দাম পড়ছে। কিছুক্ষণ ধরে রাখুন, অন্য ফসল আগে বেচুন।`, en: `Everyone is bringing in ${R.crops[R.glut].en.toLowerCase()} at once — the price is falling. Hold it a while and sell other crops first.` } },
  glutOff: { tone: 'ok', title: { bn: `${gen(R.crops[R.glut].bn)} দাম ফিরেছে`, en: `${R.crops[R.glut].en} prices are back` }, body: { bn: 'এখন বেচতে পারেন।', en: 'You can sell now.' } },
});

// mods: a season's strength (1 = as designed), e.g. from a real year's weather in the story campaign (src/game/saga.js).
export function createGame(id, mods = {}) {
  const R = REGIONS[id], F = R.farmer, L = layoutFor(R.world);
  const plots = [];
  for (let r = 0; r < FROWS; r++) for (let c = 0; c < FCOLS; c++) {
    const [x, z] = plotCenter(c, r);
    plots.push({ i: plots.length, c, r, x, z, crop: null, g: 0, moist: 0.35, health: 1, wilt: 0, dead: false, pests: 0, pestT: 0, fert: 0, mulch: false });
  }
  const seeds = Object.fromEntries(Object.keys(R.crops).map((k) => [k, 0]));
  const g = {
    id, R, F, L, S: L.S, t: 0, paused: false, ndvi: false,
    me: { x: L.S.start.x, z: L.S.start.z, yaw: 0.6, vx: 0, vz: 0, speed: 0, act: null, stamina: 1, down: 0, idle: -5, run: false },
    can: F.can, seeds, sel: Object.keys(R.crops)[0], basket: { ...seeds }, money: 150,
    count: { bought: 0, planted: 0, watered: 0, harvested: 0, sold: 0, earned: 0, pestsCleared: 0, lost: 0, hurt: 0 },
    quest: 0, questStarted: false, nextQuestAt: 1.5, perks: {}, answers: [], ev: { heat: 0, storm: 0, glut: 0, done: {}, zone: null, flood: 0 },
    waitFor: null, timers: [], plots, out: [], won: false, broke: false, alerts: ALERT(R),
    home: PLACES[id], seen: [], phase: 0.06,
    mods: { heat: 1, storm: 1, pests: 1, ...mods },
  };
  g.out.push({ type: 'say', text: R.lines.hello });
  return g;
}

const emit = (g, e) => g.out.push(e);
const say = (g, k) => emit(g, { type: 'say', text: g.R.lines[k] });
const sound = (g, s) => emit(g, { type: 'sound', s });
const fx = (g, kind, x, z) => emit(g, { type: 'fx', kind, x, z });
const at = (g, delay, fn) => g.timers.push({ at: g.t + delay, fn });
const floater = (g, text, x, z, tone) => emit(g, { type: 'float', text, x, z, tone });
export const canMax = (g) => g.F.can + (g.perks.pond ? 2 : 0);
export const priceOf = (g, k) => Math.round(g.R.crops[k].price * (1 + g.F.sellBonus) * (g.ev.glut > 0 && k === g.R.glut ? 0.35 : 1));
export const ripeAt = (g) => (g.perks.early ? 0.8 : 1);
const growing = (g) => g.plots.filter((p) => p.crop && !p.dead);

export function plotAt(x, z) {
  const c = Math.floor((x + FIELD_W / 2 + GAP / 2) / CELL), r = Math.floor((z + FIELD_D / 2 + GAP / 2) / CELL);
  if (c < 0 || r < 0 || c >= FCOLS || r >= FROWS) return null;
  return r * FCOLS + c;
}
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// What the action button would do right now, for the on-screen prompt.
export function target(g) {
  const me = g.me;
  const pi = plotAt(me.x, me.z);
  if (pi !== null) {
    const p = g.plots[pi];
    const C = g.R.crops;
    let what;
    if (p.pests > 0) what = 'spray';
    else if (p.dead) what = 'clear';
    else if (!p.crop) what = g.seeds[g.sel] > 0 || Object.values(g.seeds).some(Boolean) ? 'plant' : 'noseed';
    else if (p.g >= ripeAt(g)) what = 'harvest';
    else if (g.can <= 0) what = 'nowater';
    else if (p.moist > 0.9) what = 'wet';
    else what = 'water';
    return { kind: 'plot', p, what, crop: p.crop ? C[p.crop] : C[g.sel] };
  }
  let best = null;
  for (const id of STATIONS) { const s = g.S[id], d = dist(me, s); if (d < s.r + 1.4 && (!best || d < best.d)) best = { kind: 'station', id, d }; }
  return best;
}

// The one action button: does whatever makes sense where the farmer stands.
export function act(g) {
  const me = g.me;
  if (me.act || me.down > 0 || g.won || g.paused) return;
  const t = target(g);
  if (!t) { emit(g, { type: 'toast', text: { bn: 'এখানে করার কিছু নেই — জমি, দোকান, পানি বা হাটের কাছে যান।', en: 'Nothing to do here — go to a plot, the shop, the water or the market.' } }); return; }
  if (t.kind === 'plot') return plotAction(g, t.p);
  const s = g.S[t.id];
  me.yaw = Math.atan2(s.x - me.x, s.z - me.z);
  return useStation(g, t.id);
}

function startAct(g, type) { g.me.act = { type, p: 0, dur: ACT_TIME[type] ?? 0.7 }; g.me.idle = 0; g.me.vx = g.me.vz = 0; g.me.speed = 0; }

function plotAction(g, p) {
  const C = g.R.crops;
  if (p.pests > 0) {
    p.pests = 0; p.pestT = 0; g.count.pestsCleared++; startAct(g, 'spray'); fx(g, 'spray', p.x, p.z); sound(g, 'spray');
    floater(g, { bn: 'সারিয়ে তোলা হলো', en: 'Treated' }, p.x, p.z, 'ok'); return;
  }
  if (p.dead) { Object.assign(p, { crop: null, g: 0, dead: false, health: 1, wilt: 0 }); startAct(g, 'clear'); fx(g, 'dust', p.x, p.z); sound(g, 'clear'); return; }
  if (!p.crop) {
    if (g.seeds[g.sel] <= 0) { const alt = Object.keys(g.seeds).find((k) => g.seeds[k] > 0); if (alt) g.sel = alt; else { say(g, 'seeds'); emit(g, { type: 'hint', what: 'shed' }); return; } }
    g.seeds[g.sel]--; Object.assign(p, { crop: g.sel, g: 0, health: 1, wilt: 0, dead: false, mulch: !!g.perks.mulch });
    g.count.planted++; startAct(g, 'plant'); fx(g, 'plant', p.x, p.z); sound(g, 'plant');
    floater(g, { bn: `${C[p.crop].bn} বোনা হলো`, en: `${C[p.crop].en} sown` }, p.x, p.z, 'info'); return;
  }
  if (p.g >= ripeAt(g)) {
    const k = p.crop; g.basket[k]++; g.count.harvested++;
    p.fert = C[k].soil ? Math.min(0.6, p.fert + 0.35) : Math.max(0, p.fert - (g.F.soilKeeper ? 0 : 0.1));
    Object.assign(p, { crop: null, g: 0, health: 1, wilt: 0 });
    startAct(g, 'harvest'); fx(g, 'harvest', p.x, p.z); sound(g, 'harvest');
    floater(g, { bn: `+১ ${C[k].bn}${C[k].soil ? ' · মাটি উর্বর হলো' : ''}`, en: `+1 ${C[k].en}${C[k].soil ? ' · soil enriched' : ''}` }, p.x, p.z, 'good');
    if (Math.random() < 0.35) say(g, 'harvest');
    return;
  }
  if (g.can <= 0) { say(g, 'dry'); emit(g, { type: 'hint', what: 'water' }); return; }
  if (p.moist > 0.9) { floater(g, { bn: 'মাটি এখনো ভেজা', en: 'Soil is still wet' }, p.x, p.z, 'info'); return; }
  g.can--; p.moist = 1; g.count.watered++; startAct(g, 'water'); fx(g, 'water', p.x, p.z); sound(g, 'water');
}

function useStation(g, id) {
  const s = g.S[id];
  if (id === 'shed') { emit(g, { type: 'open', panel: 'shop' }); sound(g, 'tap'); return; }
  if (id === 'kiosk') { emit(g, { type: 'open', panel: 'kiosk' }); sound(g, 'tap'); return; }
  if (id === 'water') {
    g.can = canMax(g); startAct(g, 'pump'); sound(g, 'pump'); fx(g, 'pump', s.x, s.z);
    floater(g, { bn: 'বালতি ভরা হলো', en: 'Can refilled' }, s.x, s.z, 'info'); return;
  }
  if (id === 'market') {
    const total = Object.entries(g.basket).reduce((a, [k, n]) => a + n * priceOf(g, k), 0);
    if (!total) { emit(g, { type: 'toast', text: { bn: 'ঝুড়ি খালি — আগে পাকা ফসল তুলুন।', en: 'The basket is empty — harvest something ripe first.' } }); return; }
    g.money += total; g.count.earned += total; g.count.sold++;
    for (const k in g.basket) g.basket[k] = 0;
    startAct(g, 'sell'); sound(g, 'coin'); fx(g, 'coin', s.x, s.z);
    floater(g, { bn: `+${g.R.cur}${total}`, en: `+${g.R.cur}${total}` }, s.x, s.z, 'money');
  }
}

export function buy(g, k, n) {
  const cost = g.R.crops[k].cost * n;
  if (g.money < cost) { emit(g, { type: 'toast', text: { bn: 'টাকা কম — আগে ফসল বিক্রি করুন।', en: 'Not enough money — sell some crop first.' } }); return false; }
  g.money -= cost; g.seeds[k] += n; g.sel = k; g.count.bought += n; sound(g, 'coin'); return true;
}

export const quizOf = (g, i = g.quest) => { const q = QUESTS[i]; return (q?.quiz && g.R.quiz[q.quiz]) || null; };

// Called by the question panel. A right answer unlocks its perk; either way the challenge then begins.
export function answerQuiz(g, ok) {
  const q = QUESTS[g.quest], Q = quizOf(g);
  g.answers.push({ id: q.id, ok });
  if (ok && Q?.perk) {
    g.perks[Q.perk] = true;
    if (Q.perk === 'mulch') for (const p of g.plots) p.mulch = true;
    if (Q.perk === 'pond') g.can = Math.min(canMax(g), g.can + 2);
  }
  g.paused = false;
  sound(g, ok ? 'good' : 'bad');
  beginEvent(g, q);
}

function startQuest(g) {
  const q = QUESTS[g.quest];
  if (!q) return;
  g.questStarted = true;
  emit(g, { type: 'quest', index: g.quest });
  if (quizOf(g)) { g.paused = true; emit(g, { type: 'open', panel: 'quiz' }); }
  else beginEvent(g, q);
}

function beginEvent(g, q) {
  const lead = g.F.alertLead, A = g.alerts;
  if (q.event === 'heat') g.waitFor = { n: 3, then: () => {
    emit(g, { type: 'alert', ...A.heatSoon }); say(g, 'heat');
    at(g, 10 + lead, () => { g.ev.heat = Math.round(30 * g.mods.heat); emit(g, { type: 'alert', ...A.heatOn }); sound(g, 'alarm'); });
  } };
  if (q.event === 'pests') g.waitFor = { n: 3, then: () => {
    emit(g, { type: 'alert', ...A.pestSoon });
    at(g, 8 + lead, () => {
      growing(g).filter((p) => !p.pests).sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.round(3 * g.mods.pests))).forEach((p) => { p.pests = 1; p.pestT = 0; });
      g.ev.pestsLeft = true; emit(g, { type: 'alert', ...A.pestOn }); say(g, 'pest'); sound(g, 'alarm');
    });
  } };
  // The storm: a safe circle appears on the map with a countdown, like a closing zone. Be inside when it strikes.
  if (q.event === 'storm') g.waitFor = { n: 3, then: () => {
    const s = g.S.safe;
    g.ev.zone = { x: s.x, z: s.z, r: s.r, left: 30 + lead + (g.perks.warn ? 10 : 0), total: 30 + lead + (g.perks.warn ? 10 : 0) };
    emit(g, { type: 'alert', ...A.stormSoon }); say(g, 'storm'); sound(g, 'alarm');
  } };
  if (q.event === 'glut') at(g, 14, () => {
    emit(g, { type: 'alert', ...A.glutSoon });
    at(g, 4 + lead, () => { g.ev.glut = g.perks.market ? 20 : 40; });
  });
}

function questDone(g) {
  const q = QUESTS[g.quest];
  if (!q || !g.questStarted) return false;
  if (q.need) return Object.entries(q.need).every(([k, v]) => g.count[k] >= v);
  return !!g.ev.done[q.event];
}

// ---- the simulation step ----
export function update(g, dt, input) {
  if (g.paused) return;
  g.t += dt;
  if (!g.questStarted && !g.won && g.t >= g.nextQuestAt) startQuest(g);
  for (const tm of [...g.timers]) if (g.t >= tm.at) { g.timers.splice(g.timers.indexOf(tm), 1); tm.fn(); }
  if (g.waitFor && growing(g).length >= g.waitFor.n) { const w = g.waitFor; g.waitFor = null; w.then(); }
  else if (g.waitFor && !g.waitFor.told) { g.waitFor.told = true; emit(g, { type: 'toast', text: { bn: 'আগে অন্তত ৩টি জমিতে ফসল লাগান।', en: 'First get crops growing on at least 3 plots.' } }); }

  stepFarmer(g, dt, input);
  stepPlots(g, dt);
  stepEvents(g, dt);
  stepPlaces(g);

  if (questDone(g)) {
    emit(g, { type: 'questDone', index: g.quest }); sound(g, 'good');
    g.quest++; g.questStarted = false;
    if (g.quest >= QUESTS.length) { g.won = true; g.me.act = { type: 'cheer', p: 0, dur: 1e9 }; say(g, 'win'); emit(g, { type: 'win' }); }
    else g.nextQuestAt = g.t + 1.5;
  }
  const nothing = !growing(g).length && !Object.values(g.seeds).some(Boolean) && !Object.values(g.basket).some(Boolean) && g.money < 6;
  if (nothing && !g.broke) { g.broke = true; emit(g, { type: 'broke' }); }
}

function stepFarmer(g, dt, input) {
  const me = g.me, F = g.F;
  if (me.down > 0) { me.down -= dt; me.speed = 0; return; }
  if (me.act) { me.act.p += dt; if (me.act.p >= me.act.dur) me.act = null; return; }
  const ix = input?.mx ?? 0, iz = input?.mz ?? 0, l = Math.min(1, Math.hypot(ix, iz));
  const wantRun = !!input?.run && l > 0.3;
  me.run = wantRun && me.stamina > 0.04;
  me.stamina = Math.max(0, Math.min(1, me.stamina + (me.run ? -0.16 : 0.1) * dt));
  // the storm wind slows anyone still out in it
  const z = g.ev.zone, outside = g.ev.storm > 0 && z && Math.hypot(me.x - z.x, me.z - z.z) > z.r;
  const top = (me.run ? F.run : F.speed) * (outside ? 0.65 : 1) * (g.ev.flood > 0.3 && Math.abs(me.x) < 16 && Math.abs(me.z) < 10 ? 0.55 : 1);
  const tx = l > 0.05 ? (ix / Math.max(l, 1e-6)) * top * l : 0, tz = l > 0.05 ? (iz / Math.max(l, 1e-6)) * top * l : 0;
  const k = Math.min(1, dt * (l > 0.05 ? 9 : 12));
  me.vx += (tx - me.vx) * k; me.vz += (tz - me.vz) * k;
  me.speed = Math.hypot(me.vx, me.vz);
  if (me.speed > 0.15) {
    const want = Math.atan2(me.vx, me.vz);
    let d = want - me.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    me.yaw += d * Math.min(1, dt * 12);
    me.idle = 0;
    let nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
    if (inWater(g.L, nx, nz)) { if (!inWater(g.L, nx, me.z)) nz = me.z; else if (!inWater(g.L, me.x, nz)) nx = me.x; else { nx = me.x; nz = me.z; } }
    [me.x, me.z] = resolve(g.L, nx, nz);
    return;
  }
  // a habit of their own when left alone
  me.idle += dt;
  if (me.idle > 8) { me.idle = -10; startAct(g, F.idle); if (Math.random() < 0.6) say(g, 'idle'); }
}

const STORM_LOSS = {
  flood: { bn: 'বন্যায় ডুবে গেল', en: 'Drowned by the flood' },
  hail: { bn: 'শিলায় ঝরে গেল', en: 'Stripped by the hail' },
  rain: { bn: 'বৃষ্টিতে ভিজে গজিয়ে গেল', en: 'Soaked and sprouted in the rain' },
  fog: { bn: 'কুয়াশা আর ঠান্ডায় পচে গেল', en: 'Rotted in the fog and cold' },
};
function kill(g, p, why) {
  p.dead = true; p.pests = 0; g.count.lost++;
  floater(g, why === 'storm' ? STORM_LOSS[g.R.storm.kind] : why === 'pests' ? { bn: `${gen(g.R.pestWord.bn)} কারণে নষ্ট`, en: `Lost to ${g.R.pestWord.en}` } : { bn: 'পানির অভাবে মরে গেল', en: 'Died of thirst' }, p.x, p.z, 'bad');
  sound(g, 'bad');
}

function stepPlots(g, dt) {
  const heat = g.ev.heat > 0, wet = g.ev.storm > 0;
  for (const p of g.plots) {
    if (!p.crop || p.dead) { p.moist = wet ? 1 : Math.max(0.2, p.moist - dt * 0.01); continue; }
    const c = g.R.crops[p.crop];
    const rate = 0.03 * c.thirst * (heat ? ((p.mulch || g.perks.cool) ? 1.4 : 2.6) * (g.F.heatHardy ? 0.75 : 1) : 1) * (g.perks.drip ? 0.7 : 1);
    p.moist = wet ? 1 : Math.max(0, p.moist - rate * dt);
    if (p.moist > 0.12) {
      p.wilt = Math.max(0, p.wilt - dt * 2);
      if (!p.pests && p.g < 1) p.g = Math.min(1, p.g + dt / (c.grow * (1 - p.fert * 0.5)) * (heat ? 0.8 : 1));
      if (!p.pests) p.health = Math.min(1, p.health + dt * 0.05);
    } else {
      p.wilt += dt; p.health = Math.max(0, p.health - dt * 0.03);
      if (p.wilt > 16) { kill(g, p, 'dry'); continue; }
    }
    if (p.pests) {
      p.health -= dt * 0.045 * p.pests; p.pestT += dt;
      if (p.pestT > (g.perks.neem ? 22 : 13)) {
        p.pestT = 0;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => (p.c + dc >= 0 && p.c + dc < FCOLS && p.r + dr >= 0 && p.r + dr < FROWS ? g.plots[(p.r + dr) * FCOLS + p.c + dc] : null)).filter((q) => q && q.crop && !q.dead && !q.pests);
        if (n.length) n[Math.floor(Math.random() * n.length)].pests = 1;
      }
      if (p.health <= 0) kill(g, p, 'pests');
    }
  }
  if (g.ev.pestsLeft && !g.plots.some((p) => p.pests)) { g.ev.pestsLeft = false; g.ev.done.pests = true; emit(g, { type: 'alert', tone: 'ok', title: { bn: 'জমি আবার নিরাপদ', en: 'The field is safe again' }, body: { bn: 'ঠিক সময়ে ঠিক ব্যবস্থা।', en: 'The right step at the right time.' } }); }
}

// Walking into a named place of the village shows its name, and the farmer tells what it means to them. Dawn and dusk
// get a line of their own. Neither talks over a storm.
function stepPlaces(g) {
  const H = g.home, me = g.me;
  if (!H) return;
  const busy = !!g.ev.zone || g.ev.storm > 0;
  for (const p of H.places) {
    const [px, pz] = spot(g.S, p.at);
    if (g.seen.includes(p.id) || Math.hypot(me.x - px, me.z - pz) > p.r) continue;
    g.seen.push(p.id);
    emit(g, { type: 'place', place: p, n: g.seen.length, total: H.places.length });
    if (!busy) emit(g, { type: 'say', text: p.line, long: true });
  }
  const ph = dayPhase(g), was = g.phase; g.phase = ph;
  if (busy || g.won) return;
  if (ph < was && g.t > DAY * 0.5) emit(g, { type: 'say', text: H.dawn });
  else if (was < 0.71 && ph >= 0.71) emit(g, { type: 'say', text: H.dusk });
}

function stepEvents(g, dt) {
  const A = g.alerts, me = g.me;
  if (g.ev.heat > 0) { g.ev.heat -= dt; if (g.ev.heat <= 0) { g.ev.done.heat = true; emit(g, { type: 'alert', ...A.heatOff }); } }
  const z = g.ev.zone;
  if (z && z.left > 0) {
    z.left -= dt;
    if (z.left <= 0) {
      g.ev.storm = Math.round(16 * g.mods.storm); emit(g, { type: 'alert', ...A.stormOn }); sound(g, 'thunder');
      if (Math.hypot(me.x - z.x, me.z - z.z) > z.r) {
        me.down = 3.2; me.act = null; g.count.hurt++;
        const fine = Math.min(g.money, 60); g.money -= fine;
        say(g, 'hurt'); emit(g, { type: 'hurt', fine }); sound(g, 'bad');
      } else { emit(g, { type: 'safe' }); sound(g, 'good'); }
    }
  }
  if (g.ev.storm > 0) {
    g.ev.storm -= dt;
    if (g.R.storm.kind === 'flood') g.ev.flood = Math.min(1, g.ev.flood + dt / 5);
    if (Math.random() < dt * 0.4) { emit(g, { type: 'flash' }); sound(g, 'thunder'); }
    if (g.ev.storm <= 0) {
      // ripe crop left in the field is lost; a flood also takes what was nearly ripe
      const lim = g.R.storm.kind === 'flood' ? 0.8 : 1;
      let k = 0;
      for (const p of g.plots) if (p.crop && !p.dead && p.g >= lim && !(g.perks.drains && k++ % 2 === 0)) kill(g, p, 'storm');
      g.ev.done.storm = true; g.ev.zone = null; emit(g, { type: 'alert', ...A.stormOff });
    }
  } else if (g.ev.flood > 0) g.ev.flood = Math.max(0, g.ev.flood - dt / 8);
  if (g.ev.glut > 0) { g.ev.glut -= dt; if (g.ev.glut <= 0) emit(g, { type: 'alert', ...A.glutOff }); }
}

// The day: 0 is sunrise; the sun sets at 0.75 and the short night runs to 1.
export const dayPhase = (g) => ((g.t / DAY) + 0.06) % 1;
export const dayOf = (g) => Math.floor(g.t / DAY + 0.06) + 1;
export const isNight = (g) => dayPhase(g) > 0.75;
export const clock = (g) => { const p = dayPhase(g), h = p < 0.75 ? 6 + (p / 0.75) * 12 : 18 + ((p - 0.75) / 0.25) * 12; return [Math.floor(h) % 24, Math.floor((h % 1) * 60)]; };
export { rand };
