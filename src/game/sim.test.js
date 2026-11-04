// Plays a full season of "মাঠের মানুষ" for every one of the twelve farmers with a simple bot, on the simulation alone,
// to make sure each season can be finished: buy, sow, water, harvest, sell, every question, the heatwave, the pests,
// the storm's safe zone and the price crash. Run with `node --test src/game/sim.test.js`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update, act, buy, note, answerQuiz, ripeAt, canMax, plotAt } from './sim.js';
import { REGIONS, FARMER_IDS, QUESTS } from './regions.js';
import { layoutFor, WORLD_IDS, inWater, resolve } from './layout.js';
import { PLACES, spot } from './places.js';

const DT = 1 / 20;
function play(id, budget = 60 * 40) {
  const g = createGame(id);
  const go = (x, z) => { const dx = x - g.me.x, dz = z - g.me.z, d = Math.hypot(dx, dz); return d < 0.5 ? null : { mx: dx / d, mz: dz / d, run: d > 6 }; };
  let t = 0, stuck = 0, lastX = 0, lastZ = 0, lastBuy = null;
  while (!g.won && t < budget) {
    t += DT;
    // a player who uses FieldShift: looks from space, checks the kiosk, opens the water-stress layer when asked
    const need = QUESTS[g.quest]?.need ?? {};
    for (const k of ['satViews', 'advised', 'waterLayer']) if (need[k] && !g.count[k]) note(g, k);
    for (const e of g.out.splice(0)) if (e.type === 'open') {
      if (e.panel === 'quiz') { const q = QUESTS[g.quest]; const Q = g.R.quiz[q.quiz]; answerQuiz(g, !!Q); }
      else g.paused = false;
    }
    if (g.paused) { g.paused = false; continue; }
    const me = g.me;
    let target = null, doAct = false;
    const ripe = g.plots.filter((p) => p.crop && !p.dead && p.g >= ripeAt(g));
    const near = (list) => list.sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
    const seeds = Object.values(g.seeds).reduce((a, b) => a + b, 0), basket = Object.values(g.basket).reduce((a, b) => a + b, 0);
    const z = g.ev.zone;
    if (z && z.left > 0 && z.left < 14) target = [z.x, z.z];
    else if (g.ev.storm > 0 && z) target = [z.x, z.z];
    else if (g.plots.some((p) => p.pests)) { const p = near(g.plots.filter((q) => q.pests)); target = [p.x, p.z]; doAct = true; }
    else if (ripe.length) { const p = near(ripe); target = [p.x, p.z]; doAct = true; }
    else if (basket >= 3 || (basket && !g.plots.some((p) => p.crop && !p.dead))) { target = [g.S.market.x, g.S.market.z]; doAct = true; }
    else if (g.can === 0 && g.plots.some((p) => p.crop && !p.dead)) { target = [g.S.water.x, g.S.water.z]; doAct = true; }
    else if (g.plots.some((p) => p.dead)) { const p = near(g.plots.filter((q) => q.dead)); target = [p.x, p.z]; doAct = true; }
    else if (g.plots.some((p) => p.crop && !p.dead && p.moist < 0.45 && p.g < ripeAt(g))) { const p = near(g.plots.filter((q) => q.crop && !q.dead && q.moist < 0.45 && q.g < ripeAt(g))); target = [p.x, p.z]; doAct = true; }
    else if (seeds && g.plots.some((p) => !p.crop)) {
      const p = near(g.plots.filter((q) => !q.crop)); target = [p.x, p.z]; doAct = true;
      const alt = Object.keys(g.seeds).find((k) => g.seeds[k] > 0 && k !== p.last); if (alt) g.sel = alt; // rotate where it can
    }
    else if (!seeds && g.money >= 30 && g.plots.filter((p) => !p.crop).length >= 3) {
      const d = Math.hypot(g.S.shed.x - me.x, g.S.shed.z - me.z);
      if (d < 3.4) { const k = Object.keys(g.R.crops).filter((c) => c !== g.R.glut || !g.ev.glut).sort((a, b) => (a === lastBuy) - (b === lastBuy) || (g.R.crops[b].price - g.R.crops[b].cost) - (g.R.crops[a].price - g.R.crops[a].cost)).find((c) => g.money >= g.R.crops[c].cost * 6) ?? Object.keys(g.R.crops).find((c) => g.money >= g.R.crops[c].cost * 3); if (k) { buy(g, k, g.money >= g.R.crops[k].cost * 6 ? 6 : 3); lastBuy = k; } }
      else target = [g.S.shed.x, g.S.shed.z];
    }
    let inp = target ? go(...target) : null;
    if (target && (!inp || Math.hypot(target[0] - me.x, target[1] - me.z) < (plotAt(target[0], target[1]) !== null ? 0.9 : 3))) { inp = null; if (doAct) act(g); }
    update(g, DT, inp ?? {});
    if (Math.hypot(me.x - lastX, me.z - lastZ) < 0.001 && inp) stuck++; else stuck = 0;
    lastX = me.x; lastZ = me.z;
    if (stuck > 200) { me.x += (Math.random() - 0.5) * 2; me.z += (Math.random() - 0.5) * 2; stuck = 0; }
  }
  return { g, t };
}

for (const id of FARMER_IDS) {
  test(`a full season can be won with ${REGIONS[id].farmer.en}`, () => {
    const { g, t } = play(id);
    if (process.env.SIMLOG) console.log(id, Math.round(t), "s", JSON.stringify(g.count), "hurt", g.count.hurt, "answers", g.answers.length);
    assert.ok(g.won, `${id} stuck at mission ${g.quest + 1} (${QUESTS[g.quest]?.id}) after ${Math.round(t)} s; money ${g.money}`);
    assert.ok(g.count.earned >= 1000);
  });
}

test('every farmer has every question their season asks, and every crop has a shape and a price', () => {
  for (const id of FARMER_IDS) {
    const R = REGIONS[id];
    for (const k of ['water', 'heat', 'pests', 'storm', 'profit']) {
      const Q = R.quiz[k];
      assert.ok(Q, `${id} lacks the ${k} question`);
      assert.equal(Q.options.filter((o) => o.ok).length, 1, `${id} ${k}: exactly one right answer`);
      assert.ok(Q.perk && Q.why.bn && Q.why.en);
    }
    assert.equal(Object.keys(R.crops).length, 4);
    assert.ok(R.crops[R.glut], `${id}: the crop whose price crashes is one of theirs`);
    assert.ok(WORLD_IDS.includes(R.world), `${id}: world ${R.world} exists`);
    assert.ok(R.intro.length === 5 && R.farmer.look && R.names.safe && R.dinner && R.cur);
  }
});

test('the stations and the safe ground are reachable on dry land in every world', () => {
  for (const w of WORLD_IDS) {
    const L = layoutFor(w);
    for (const k of ['shed', 'water', 'market', 'kiosk', 'safe']) {
      const s = L.S[k];
      const free = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0]].some(([dx, dz]) => !L.water.some((wt) => (wt.r ? Math.hypot(s.x + dx - wt.cx, s.z + dz - wt.cz) < wt.r : s.x + dx > wt.x0 && s.x + dx < wt.x1 && s.z + dz > wt.z0 && s.z + dz < wt.z1)));
      assert.ok(free, `${w}: ${k} is under water`);
    }
  }
});

test('every farmer’s village has named places, neighbours and signs, all on dry walkable ground', () => {
  for (const id of FARMER_IDS) {
    const H = PLACES[id], L = layoutFor(REGIONS[id].world);
    assert.ok(H, `${id} has a village`);
    assert.ok(H.places.length >= 5 && H.folk.length >= 3 && H.dawn && H.dusk, `${id}: places, neighbours, dawn and dusk`);
    for (const k of ['shed', 'market', 'kiosk', 'safe']) assert.ok(H.signs[k]?.t, `${id}: a ${k} sign`);
    const at = (p) => spot(L.S, p);
    const spots = [...H.places.map((p) => [...at(p.at), `place ${p.id}`]), ...H.folk.flatMap((f) => (f.at ? [f.at] : f.route).map((p) => [...at(p), `${f.id}`]))];
    for (const [x, z, what] of spots) {
      assert.ok(Math.hypot(x, z) < 43.5, `${id}: ${what} is inside the walkable circle`);
      assert.ok(!inWater(L, x, z), `${id}: ${what} is not in the water`);
      const [rx, rz] = resolve(L, x, z, 0.3);
      assert.ok(Math.hypot(rx - x, rz - z) < 0.6, `${id}: ${what} is not inside a building or tree`);
    }
    for (const p of H.places) assert.ok(p.name.bn && p.name.en && p.line.bn && p.line.en, `${id}: ${p.id} is named and told in both languages`);
  }
});

test('walking the village finds every place, once each', () => {
  const g = createGame('razib');
  for (const p of g.home.places) { [g.me.x, g.me.z] = spot(g.S, p.at); update(g, DT, {}); }
  [g.me.x, g.me.z] = spot(g.S, g.home.places[0].at); update(g, DT, {});
  assert.equal(g.seen.length, g.home.places.length);
  assert.equal(g.out.filter((e) => e.type === 'place').length, g.home.places.length);
});

test('the walkable land reaches the outer villages, and nothing out there stands in water or a field', async () => {
  const { layoutFor, WORLD_IDS, inWater, resolve } = await import('./layout.js');
  const { WORLD_R } = await import('./regions.js');
  for (const w of WORLD_IDS) {
    const L = layoutFor(w), outer = L.props.filter((p) => p.outer);
    assert.ok(outer.length >= 30, `${w}: only ${outer.length} things beyond the farm`);
    for (const p of outer) assert.ok(!inWater(L, p.x, p.z), `${w}: ${p.type} in the water`);
    const [x, z] = resolve(L, 500, 0);
    assert.ok(Math.hypot(x, z) <= WORLD_R + 1e-6);
  }
});

test('running into a wall stops the farmer with a thud', async () => {
  const { createGame, update } = await import('./sim.js');
  const g = createGame('razib');
  const b = g.L.blockers.find((x) => x.r && x.r > 0.3);
  g.me.x = b.x - b.r - 1.2; g.me.z = b.z; g.me.vx = 4; g.me.vz = 0; g.nextQuestAt = 1e9;
  for (let k = 0; k < 30; k++) update(g, 1 / 30, { mx: 1, mz: 0, run: true });
  assert.ok(g.out.some((e) => e.type === 'sound' && e.s === 'bump'), 'a thud');
  assert.ok(Math.hypot(g.me.x - b.x, g.me.z - b.z) >= b.r + 0.34, 'not inside the tree');
});

// ── FieldShift's rotation lessons, and the station's real data for every farmer's place ──
const onPlot = (g, p) => { g.me.x = p.x; g.me.z = p.z; g.me.act = null; };
const sowHarvest = (g, p, k) => { g.seeds[k] = 1; g.sel = k; onPlot(g, p); act(g); p.g = 1; g.me.act = null; act(g); };

test('the same crop twice on a plot is a repeat and the pest wave finds it; a different crop is a rotation', () => {
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const [a, b] = g.plots;
  sowHarvest(g, a, 'wheat'); sowHarvest(g, b, 'wheat');
  g.seeds.wheat = 1; g.sel = 'wheat'; onPlot(g, a); act(g);
  g.seeds.lentil = 1; g.sel = 'lentil'; g.me.act = null; onPlot(g, b); act(g);
  assert.equal(g.count.repeats, 1); assert.equal(g.count.rotated, 1);
  assert.ok(a.repeat && !b.repeat);
  g.quest = QUESTS.findIndex((q) => q.event === 'pests'); g.mods.pests = 0.01;
  answerQuiz(g, false); g.waitFor.then();
  for (let k = 0; k < 400; k++) update(g, DT, {});
  assert.ok(a.pests > 0, 'the repeated plot is struck');
});

test('a legume enriches the soil and bare plots lose topsoil in the storm', async () => {
  const { seasonReport } = await import('./fieldshift.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const p = g.plots[0];
  sowHarvest(g, p, 'lentil');
  assert.equal(g.count.legumes, 1); assert.ok(p.fert > 0.3);
  const before = p.fert;
  g.ev.storm = DT; update(g, DT, {});
  assert.ok(p.fert < before, 'the bare plot lost soil');
  assert.equal(g.count.eroded, 18);
  const r = seasonReport(g);
  assert.equal(r.legumes, 1); assert.ok(r.tips.length >= 1 && r.tips[0].bn && r.tips[0].en);
});

test('every farmer’s FieldShift station has real NASA cards for their own place', async () => {
  const { placeOf, spaceFacts } = await import('./fieldshift.js');
  const { readFileSync } = await import('node:fs');
  for (const id of FARMER_IDS) {
    const pl = placeOf(REGIONS[id], id);
    const normals = pl.kind === 'abroad' ? JSON.parse(readFileSync(new URL(`../data/abroad/${pl.id}.json`, import.meta.url))).points.farm.normals : null;
    const cards = spaceFacts(pl, normals), ids = cards.map((c) => c.id);
    for (const k of ['bare', 'heat', 'et', 'soil', 'grace', 'rain', 'frost', 'truth']) assert.ok(ids.includes(k), `${id}: no ${k} card`);
    for (const c of cards) for (const f of ['title', 'value', 'detail', 'term']) assert.ok(c[f].bn && c[f].en && !/NaN|undefined/.test(c[f].en + c[f].bn), `${id} ${c.id}.${f}`);
  }
});

test('the what-if sliders reach both rotation engines, and the season gets hotter and drier', async () => {
  const { sliderChange, sliderMods } = await import('./fieldshift.js');
  const { abroadRotations } = await import('../engine/rotationAbroad.js');
  const { readFileSync } = await import('node:fs');
  assert.equal(sliderChange(0, 0), null);
  const ch = sliderChange(2, -20);
  assert.deepEqual([ch.dTmax[5], ch.rain[5]], [2, 0.8]);
  const sy = JSON.parse(readFileSync(new URL('../data/soil/abroad_soil_yields.json', import.meta.url))).countries.india;
  const normals = JSON.parse(readFileSync(new URL('../data/abroad/india.json', import.meta.url))).points.farm.normals;
  const res = abroadRotations({ country: 'india', soil: sy.soil, yields: sy.yields, normals, change: ch });
  assert.ok(res.options.length >= 3 && res.options.every((o) => Number.isFinite(o.dSocFut)));
  const m = sliderMods(2, -20);
  assert.ok(m.heat > 1 && m.dry > 1);
  const g = createGame('razib', m), h = createGame('razib');
  for (const x of [g, h]) { x.nextQuestAt = 1e9; Object.assign(x.plots[0], { crop: 'mustard', moist: 1 }); for (let k = 0; k < 100; k++) update(x, DT, {}); }
  assert.ok(g.plots[0].moist < h.plots[0].moist, 'less rain dries the soil faster');
});

test('every neighbour’s rotation option has its irrigation water and harvest value, and the brief names old prices', async () => {
  const { abroadRotations, cropAbroad } = await import('../engine/rotationAbroad.js');
  const { climateChange } = await import('../engine/soilfuture.js');
  const { abroadBrief } = await import('./fieldshift.js');
  const { readFileSync } = await import('node:fs');
  const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
  const SY = read('../data/soil/abroad_soil_yields.json').countries, PR = read('../data/market/abroad_prices.json').countries, deltas = read('../data/climate/cmip6_deltas.json');
  for (const c of ['india', 'pakistan', 'nepal', 'bhutan', 'myanmar']) {
    const normals = read(`../data/abroad/${c}.json`).points.farm.normals;
    const r = abroadRotations({ country: c, soil: SY[c].soil, yields: SY[c].yields, normals, change: climateChange(deltas, `abroad_${c}`), prices: PR[c] });
    const habit = r.options.find((o) => o.habit);
    for (const o of r.options) {
      assert.ok(Number.isFinite(o.waterMm) && o.waterMm >= 0 && Number.isFinite(o.waterFut), `${c}: water`);
      assert.ok(o.gross > 0 && o.unpriced.length === 0, `${c}: every crop priced`);
      const b = abroadBrief(o, habit, (k) => cropAbroad(k).name, true, PR[c]);
      assert.ok(b.evidence.some((x) => /FAO-56/.test(x.en)) && b.gaps.some((x) => /costs/.test(x.en)));
    }
  }
});

test('every mission names its farming problem and the NASA record that answers it; the data must be used', () => {
  for (const q of QUESTS) for (const f of ['bn', 'en']) assert.ok(q.problem?.[f] && q.how?.[f], `${q.id}: ${f}`);
  const g = createGame('razib'); g.nextQuestAt = 0;
  for (let k = 0; k < 40; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'scan', 'looking at the field is not enough');
  note(g, 'satViews'); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'buy');
  buy(g, 'mustard', 3); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'buy', 'seed bought without checking FieldShift does not count');
  note(g, 'advised'); for (let k = 0; k < 60; k++) update(g, DT, {});
  assert.equal(QUESTS[g.quest].id, 'plant');
});

test('before sowing, the prompt knows a rotation from a repeat; the season ends with strategies to try next', async () => {
  const { seasonReport, nextTry } = await import('./fieldshift.js');
  const { target } = await import('./sim.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  const p = g.plots[0];
  sowHarvest(g, p, 'wheat');
  g.seeds.wheat = 1; g.sel = 'wheat'; onPlot(g, p);
  assert.equal(target(g).rot, 'repeat');
  g.seeds.lentil = 1; g.sel = 'lentil';
  assert.equal(target(g).rot, 'rotate');
  g.count.repeats = 2; g.count.eroded = 4;
  const tries = nextTry(seasonReport(g), g.R);
  assert.ok(tries.length >= 2 && tries.length <= 3);
  assert.equal(tries.at(-1).id, 'heat'); assert.deepEqual(tries.at(-1).whatIf, { dT: 2, rain: -10 });
  assert.ok(tries.some((x) => x.id === 'rotate'));
  for (const x of tries) assert.ok(x.title.bn && x.title.en && x.why.bn && x.why.en && !/NaN|undefined/.test(x.why.en));
});

test('agronomic progression: XP, leveling, soil health, and agriScorecard work accurately', async () => {
  const { agriScorecard, gainXp, LEVELS } = await import('./sim.js');
  const g = createGame('razib');
  assert.equal(g.xp, 0);
  assert.equal(g.level, 1);
  assert.equal(g.soilHealth, 50);
  assert.equal(g.carbonScore, 25);
  assert.equal(LEVELS.length, 4);

  // Gain XP and level up
  gainXp(g, 90, { bn: 'পরীক্ষা', en: 'Test' });
  assert.equal(g.xp, 90);
  assert.equal(g.level, 2);

  // Scorecard evaluation
  g.count.rotated = 3;
  g.count.legumes = 2;
  g.count.repeats = 0;
  g.count.watered = 5;
  g.count.earned = 1200;
  const sc = agriScorecard(g);
  assert.ok(sc.rotScore >= 80);
  assert.ok(sc.waterScore >= 50);
  assert.ok(sc.diversityScore >= 50);
  assert.ok(sc.econScore >= 70);
  assert.ok(sc.overall >= 70);
  assert.ok([1, 2, 3].includes(sc.stars));
  assert.ok(sc.takeaways.length > 0);
  for (const t of sc.takeaways) {
    assert.ok(t.bn && t.en);
  }
});

test('a career grows across seasons: XP for farming well, ranks, achievements once each, equipment unlocked', async () => {
  const { recordSeason, rankOf, startPerks, seasonXp, emptyCareer, ACHIEVEMENTS, RANKS, UNLOCKS } = await import('./career.js');
  const report = { rotated: 3, repeats: 0, legumes: 2, enriched: 6, eroded: 0 };
  const res = (who, country, extra = {}) => ({ who, country, stars: 3, count: { earned: 2100, satViews: 1, waterLayer: 1, advised: 2 }, report, whatIf: null, ...extra });
  const good = seasonXp(res('razib', 'bangladesh')), poor = seasonXp({ ...res('razib', 'bangladesh'), stars: 1, report: { rotated: 0, repeats: 5, legumes: 0, enriched: 0, eroded: 4 }, count: {} });
  assert.ok(good.total > poor.total && poor.total >= 50, 'farming well is worth more, and every win is worth something');
  for (const p of good.parts) assert.ok(p.label.bn && p.label.en);
  let c = emptyCareer(), out;
  out = recordSeason(c, res('razib', 'bangladesh'));
  assert.deepEqual(c, emptyCareer(), 'never mutates');
  c = out.career;
  for (const id of ['first', 'stars3', 'rotator', 'norepeat', 'legume', 'soil', 'covered', 'data', 'harvest']) assert.ok(c.achievements[id], id);
  assert.equal(recordSeason(c, res('razib', 'bangladesh')).newAchievements.length, 0, 'each achievement once');
  for (const [who, country] of [['harjinder', 'india'], ['ghulam', 'pakistan'], ['rampyari', 'nepal'], ['kinley', 'bhutan'], ['kyawwin', 'myanmar']]) c = recordSeason(c, res(who, country, { whatIf: { dT: 2, rain: -10 } })).career;
  assert.ok(c.achievements.world && c.achievements.three && c.achievements.heat);
  assert.ok(!c.achievements.bangladesh);
  assert.equal(rankOf(0).index, 0); assert.equal(rankOf(RANKS.at(-1).xp + 1).next, null);
  assert.deepEqual(startPerks({ xp: 0 }), []);
  assert.deepEqual(startPerks({ xp: RANKS.at(-1).xp }), UNLOCKS.map((u) => u.perk));
  for (const a of ACHIEVEMENTS) assert.ok(a.title.bn && a.title.en && a.what.bn && a.what.en && a.icon, a.id);
});

test('navigation: in every village a route reaches every station on walkable ground, keeps off the crops, and is smooth', async () => {
  const { bakeNav, findPath, costAt, smooth, pathLength, AREA } = await import('./nav.js');
  const { layoutFor, WORLD_IDS } = await import('./layout.js');
  for (const w of WORLD_IDS) {
    const L = layoutFor(w), t0 = performance.now(), nav = bakeNav(L), ms = performance.now() - t0;
    assert.ok(ms < 1500, `${w}: baking took ${Math.round(ms)} ms`);
    for (const [id, s] of Object.entries(L.S)) {
      if (!s || id === 'start') continue;
      const p = findPath(nav, L.S.start.x, L.S.start.z, s.x, s.z);
      assert.ok(p && p.length >= 2, `${w}: no route to ${id}`);
      for (let k = 1; k < p.length; k++) {
        const [ax, az] = p[k - 1], [bx, bz] = p[k], d = Math.hypot(bx - ax, bz - az);
        for (let u = 0; u <= d; u += 0.25) assert.ok(costAt(nav, ax + ((bx - ax) * u) / (d || 1), az + ((bz - az) * u) / (d || 1)) < Infinity, `${w} → ${id}: the route crosses a wall or water`);
      }
      assert.ok(pathLength(p) < 3 * Math.hypot(s.x - L.S.start.x, s.z - L.S.start.z) + 20, `${w} → ${id}: a long way round`);
    }
  }
  // the area costs steer a route: a patch of neighbours' crops costs more than the grass beside it
  const L = layoutFor('dhamrai'), nav = bakeNav(L);
  const patch = L.patches.find(([x0, x1, z0, z1, k]) => k !== 'bare' && Math.hypot((x0 + x1) / 2, (z0 + z1) / 2) < 70);
  if (patch) assert.ok(costAt(nav, (patch[0] + patch[1]) / 2, (patch[2] + patch[3]) / 2) === AREA.crops || costAt(nav, (patch[0] + patch[1]) / 2, (patch[2] + patch[3]) / 2) === Infinity);
  const zig = [[-5, 30], [-4, 31], [-3, 30], [-2, 31], [-1, 30]];
  assert.ok(smooth(nav, zig).length <= zig.length);
});

test('the village: haat prices move and recover, a forecast shower waters every plot, compost builds soil, urea speeds a crop, orders pay', async () => {
  const V = await import('./village.js');
  const { priceOf } = await import('./sim.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9; g.nextOrder = 1e9;
  // market days
  for (let k = 0; k < 6; k++) { g.market.next = 0; update(g, DT, {}); }
  for (const m of Object.values(g.market.mult)) assert.ok(m >= 0.78 && m <= 1.5);
  assert.ok(g.out.some((e) => e.type === 'alert' && /Market day/.test(e.title.en)));
  assert.equal(priceOf(g, 'wheat'), Math.round(g.R.crops.wheat.price * (1 + g.F.sellBonus) * g.market.mult.wheat));
  // a shower: forecast, then every plot wet; water poured just before it is called out
  g.nextShower = 0; update(g, DT, {});
  assert.ok(g.ev.showerSoon > 0, 'forecast first');
  const p = g.plots[0]; Object.assign(p, { crop: 'wheat', g: 0.2, moist: 0.3 }); g.me.x = p.x; g.me.z = p.z; g.me.act = null; act(g);
  assert.equal(g.count.wasted, 1);
  g.plots[1].crop = 'wheat'; g.plots[1].moist = 0.1;
  for (let k = 0; k < (V.SHOWER.warn + 1) / DT; k++) update(g, DT, {});
  assert.ok(g.ev.shower > 0 && g.plots[1].moist === 1, 'the rain waters the field');
  // fertiliser: compost builds the soil, urea speeds this crop and costs soil
  g.money = 500; assert.ok(V.buyFertilizer(g, 'compost', 1) && V.buyFertilizer(g, 'urea', 1));
  const a = g.plots[2], b = g.plots[3]; Object.assign(a, { crop: 'wheat', g: 0, moist: 1, fert: 0.1 }); Object.assign(b, { crop: 'wheat', g: 0, moist: 1, fert: 0.1 });
  const soil0 = g.soilHealth;
  assert.ok(V.fertilize(g, 'compost', a) && a.fert > 0.1 && g.soilHealth > soil0);
  assert.ok(V.fertilize(g, 'urea', b) && b.fert < 0.1 && b.feed > a.feed);
  assert.equal(V.fertilize(g, 'urea', b), false, 'once per crop');
  // an order: met at the market when the basket holds enough
  g.order = { crop: 'wheat', n: 2, bonus: 40, who: { bn: 'চাচি', en: 'Auntie' }, left: 50, total: 50 };
  g.basket.wheat = 2; const m0 = g.money;
  assert.equal(V.fillOrder(g), 40); assert.equal(g.money, m0 + 40); assert.equal(g.count.orders, 1); assert.equal(g.order, null);
});

test('a season saves and continues: money, plots, counts, the mission reached and the market come back; events restart cleanly', async () => {
  const { saveState, restoreState } = await import('./savegame.js');
  const g = createGame('rahimu'); g.nextQuestAt = 1e9;
  sowHarvest(g, g.plots[0], 'lentil'); g.money = 321; g.quest = 4; g.market.mult.wheat = 1.27; g.fertilizer.compost = 2;
  Object.assign(g.plots[5], { crop: 'wheat', g: 0.6, pests: 1 }); g.ev.storm = 5; g.ev.done.heat = true;
  const s = JSON.parse(JSON.stringify(saveState(g)));
  const h = createGame('rahimu');
  assert.ok(restoreState(h, s));
  assert.equal(h.money, 321); assert.equal(h.quest, 4); assert.equal(h.count.legumes, 1); assert.equal(h.plots[0].last, 'lentil');
  assert.equal(h.plots[5].crop, 'wheat'); assert.equal(h.plots[5].pests, 0); assert.equal(h.market.mult.wheat, 1.27); assert.equal(h.fertilizer.compost, 2);
  assert.ok(h.ev.done.heat && !(h.ev.storm > 0) && !h.questStarted && h.timers.length === 0, 'events restart cleanly');
  assert.equal(restoreState(createGame('razib'), s), false, 'a save belongs to its own farmer');
  for (let k = 0; k < 200; k++) update(h, DT, {});
  assert.ok(h.questStarted, 'the mission reached starts again');
});
