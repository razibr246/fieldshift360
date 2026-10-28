// Plays a full season of "মাঠের মানুষ" for every one of the twelve farmers with a simple bot, on the simulation alone,
// to make sure each season can be finished: buy, sow, water, harvest, sell, every question, the heatwave, the pests,
// the storm's safe zone and the price crash. Run with `node --test src/game/sim.test.js`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, update, act, buy, answerQuiz, ripeAt, canMax, plotAt } from './sim.js';
import { REGIONS, FARMER_IDS, QUESTS } from './regions.js';
import { layoutFor, WORLD_IDS, inWater, resolve } from './layout.js';
import { PLACES, spot } from './places.js';

const DT = 1 / 20;
function play(id, budget = 60 * 40) {
  const g = createGame(id);
  const go = (x, z) => { const dx = x - g.me.x, dz = z - g.me.z, d = Math.hypot(dx, dz); return d < 0.5 ? null : { mx: dx / d, mz: dz / d, run: d > 6 }; };
  let t = 0, stuck = 0, lastX = 0, lastZ = 0;
  while (!g.won && t < budget) {
    t += DT;
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
    else if (seeds && g.plots.some((p) => !p.crop)) { const p = near(g.plots.filter((q) => !q.crop)); target = [p.x, p.z]; doAct = true; }
    else if (!seeds && g.money >= 30 && g.plots.filter((p) => !p.crop).length >= 3) {
      const d = Math.hypot(g.S.shed.x - me.x, g.S.shed.z - me.z);
      if (d < 3.4) { const k = Object.keys(g.R.crops).filter((c) => c !== g.R.glut || !g.ev.glut).sort((a, b) => (g.R.crops[b].price - g.R.crops[b].cost) - (g.R.crops[a].price - g.R.crops[a].cost)).find((c) => g.money >= g.R.crops[c].cost * 6) ?? Object.keys(g.R.crops).find((c) => g.money >= g.R.crops[c].cost * 3); if (k) buy(g, k, g.money >= g.R.crops[k].cost * 6 ? 6 : 3); }
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
