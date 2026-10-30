import test from 'node:test';
import assert from 'node:assert/strict';
import * as tomato from './tomato.js';
import * as mung from './mungbean.js';
import * as aman from './aman.js';
import * as wheat from './wheat.js';
import * as sesame from './sesame.js';
import { inHand, solve } from './rig.js';
import { figureBox } from './camera.js';

const SCENES = { tomato, mung, aman, wheat, sesame };
const each = (m, fn, step = 0.02) => { for (let t = 0; t < m.T; t += step) fn(t, m.frame(t, t)); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('every frame of every scene is a real pose', () => {
  for (const [name, m] of Object.entries(SCENES)) each(m, (t, fr) => {
    for (const k of ['hip', 'nape', 'atlas', 'wristN', 'wristF', 'ankleN', 'ankleF', 'kneeN', 'kneeF']) {
      assert.ok(fr.sk[k].every(Number.isFinite), `${name} ${k} at ${t.toFixed(2)}`);
    }
  });
});

test('a planted foot never slides, and the legs always reach the ground', () => {
  for (const [name, m] of Object.entries(SCENES)) {
    let prev = null;
    each(m, (t, fr) => {
      const p = fr.sk.p;
      for (const s of ['n', 'f']) {
        const planted = (q) => (q[`${s}fLift`] ?? 0) < 0.05 && Math.abs(q[`${s}fRoll`] ?? 0) < 0.3;
        if (prev && planted(p) && planted(prev)) assert.ok(Math.abs(p[`${s}fX`] - prev[`${s}fX`]) < 0.05, `${name}: ${s} foot slides at ${t.toFixed(2)}`);
      }
      assert.ok(Math.max(fr.sk.legShortN, fr.sk.legShortF) < 1, `${name}: a leg is stretched past its length at ${t.toFixed(2)}`);
      prev = p;
    });
  }
});

test('hands reach what they work with (only brief in-betweens may fall a little short)', () => {
  for (const [name, m] of Object.entries(SCENES)) {
    let worst = 0;
    each(m, (t, fr) => { worst = Math.max(worst, fr.sk.reachN, fr.sk.reachF); });
    assert.ok(worst < 18, `${name}: a hand misses its target by ${worst.toFixed(1)}`);
  }
});

test('tomato: the hand closes on the fruit, the basket is set down and lifted where it stands, the fruit lands in it', () => {
  const { frame, GRAB, FRUIT, SET_DOWN, PICK_UP, BASKET, RELEASE } = tomato;
  const g = inHand(frame(GRAB).sk, 'n', 10, 1.5);
  assert.ok(dist(g, FRUIT) < 4, `grip ${g} vs fruit ${FRUIT}`);
  for (const t of [SET_DOWN, PICK_UP]) assert.ok(dist(inHand(frame(t).sk, 'n', 7, 1.5), BASKET) < 4, `basket handle at ${t}`);
  const f = frame(RELEASE - 0.01).fruit;
  assert.ok(Math.abs(f[0] - BASKET[0]) < 24 && f[1] > BASKET[1] + 20 && f[1] < BASKET[1] + 40, `fruit ${f} over the basket`);
});

test('tomato: the loop runs on to the next plant without a seam', () => {
  const { frame, PAN, T, camera } = tomato;
  const a = frame(T - 1e-3, 0).sk, b = frame(0, 0).sk;
  assert.ok(Math.abs(a.hip[0] - PAN - b.hip[0]) < 0.6 && Math.abs(a.hip[1] - b.hip[1]) < 0.6);
  assert.ok(Math.abs(a.wristN[0] - PAN - b.wristN[0]) < 0.6 && Math.abs(a.wristN[1] - b.wristN[1]) < 0.6);
  assert.ok(Math.abs(camera(T - 1e-6) - PAN) < 0.01 && camera(0) === 0);
});

test('mung: both hands stay on the kodal, and each chop bites the soil', () => {
  const { frame, CHOPS, onHandle, BACK_GRIP } = mung;
  for (let t = 0; t < 3.1; t += 0.05) {
    const fr = frame(t, t);
    assert.ok(dist(fr.sk.wristN, onHandle(fr.hoe, 0)) < 3, `front hand off the handle at ${t.toFixed(2)}`);
    assert.ok(dist(fr.sk.wristF, onHandle(fr.hoe, BACK_GRIP)) < 3, `back hand off the handle at ${t.toFixed(2)}`);
  }
  for (const [c] of CHOPS) {
    const h = frame(c, c).hoe, a = (h.a * Math.PI) / 180;
    const bladeY = h.y + Math.sin(a) * 62 + Math.cos(a) * 24;
    assert.ok(bladeY > 254 && bladeY < 272, `blade at ${bladeY.toFixed(1)} when it chops at ${c}`);
  }
});

test('aman: each seedling is pushed into the mud where its hill stands', () => {
  const { frame, HILLS, MUD } = aman;
  for (const [rel, x] of HILLS) {
    const w = frame(rel, rel).sk.wristN;
    assert.ok(Math.abs(w[0] - (x - 6)) < 3 && w[1] > MUD - 9, `hill at ${x}: wrist ${w.map((v) => v.toFixed(1))}`);
  }
});

test('the camera glides — no jump from one frame to the next, even across a loop seam', () => {
  for (const [name, m] of Object.entries(SCENES)) {
    let prev = null;
    const end = m.PAN ? m.T * 2 : m.T - 0.01;
    for (let t = 0; t < end; t += 1 / 60) {
      const v = m.viewAt(t % m.T);
      if (prev) assert.ok(Math.max(Math.abs(v.x - prev.x), Math.abs(v.y - prev.y), Math.abs(v.w - prev.w)) < 8, `${name}: the view jumps at ${t.toFixed(3)}`);
      prev = v;
    }
  }
});

test('the camera keeps the whole farmer in the card, and comes in close for the work', () => {
  const opts = { tomato: { hat: 39, dx: (t) => -tomato.camera(t) }, mung: { hat: 50, brim: 14, dx: () => 0 }, aman: { hat: 34, dx: () => aman.SHIFT },
    wheat: { hat: 38, dx: (t) => -wheat.camera(t) }, sesame: { hat: 34, dx: () => 0 } };
  for (const [name, m] of Object.entries(SCENES)) {
    let closest = 920;
    for (let t = 0; t < m.T - 0.01; t += 0.05) {
      const v = m.viewAt(t), o = opts[name];
      const b = figureBox(solve({ ...m.body(t), ...m.pose(t, 0) }, m.G), { hat: o.hat, brim: o.brim, dx: o.dx(t) });
      const slack = 6;
      assert.ok(b[0] > v.x - slack && b[2] < v.x + v.w + slack && b[1] > v.y - slack && b[3] < v.y + v.h + slack, `${name}: he is cut off at ${t.toFixed(2)}`);
      closest = Math.min(closest, v.w);
    }
    assert.ok(closest < 560, `${name}: the camera never comes in closer than ${closest.toFixed(0)}`);
  }
});

test('no elbow or knee ever flips: a joint never races far ahead of both ends of its limb', () => {
  for (const [name, m] of Object.entries(SCENES)) {
    const dt = 1 / 120;
    let prev = m.frame(0, 0).sk;
    for (let t = dt; t < m.T - 0.01; t += dt) {
      const s = m.frame(t, 0).sk;
      for (const [mid, a, b] of [['elbowN', 'shN', 'wristN'], ['elbowF', 'shF', 'wristF'], ['kneeN', 'hipN', 'ankleN'], ['kneeF', 'hipF', 'ankleF']]) {
        const v = (j) => dist(s[j], prev[j]) / dt;
        assert.ok(v(mid) < 2.5 * Math.max(v(a), v(b)) + 250, `${name}: ${mid} flips at ${t.toFixed(3)}`);
      }
      prev = s;
    }
  }
});

test('wheat: the fist closes on the stalks, the sickle cuts at their foot, and the loop runs on to the next stretch', () => {
  const { frame, GATHER1, GATHER2, CUT1, CUT2, E0, G, PAN, T } = wheat;
  for (const [g, x0] of [[GATHER1, E0], [GATHER2, E0 + 22]]) {
    const f = frame(g, g).fist;
    assert.ok(Math.abs(f[0] - (x0 + 13)) < 8 && Math.abs(f[1] - (G - 58)) < 10, `fist at ${f.map((v) => v.toFixed(0))}`);
  }
  for (const [c, x0] of [[CUT1, E0], [CUT2, E0 + 22]]) {
    const w = frame(c, c).sk.wristN;
    assert.ok(w[1] > G - 20 && w[0] > x0 - 10 && w[0] < x0 + 6, `sickle hand at ${w.map((v) => v.toFixed(0))}`);
  }
  const a = frame(T - 1e-3, 0).sk, b = frame(0, 0).sk;
  assert.ok(Math.abs(a.hip[0] - PAN - b.hip[0]) < 0.6 && Math.abs(a.hip[1] - b.hip[1]) < 0.6);
});

test('sesame: both hands stay on the maul, each stroke lands on its clod, and the branch covers all the seed', () => {
  const { frame, CLODS, onHandle, BACK_GRIP, T } = sesame;
  for (let t = 0; t < 3.4; t += 0.05) {
    const fr = frame(t, t);
    assert.ok(dist(fr.sk.wristN, onHandle(fr.maul, 0)) < 3, `the front hand slips off the maul at ${t.toFixed(2)}`);
    if (t <= 3.2) assert.ok(dist(fr.sk.wristF, onHandle(fr.maul, BACK_GRIP)) < 3, `the back hand slips off the maul at ${t.toFixed(2)}`);
  }
  for (const [hit, x] of CLODS) {
    const m = frame(hit, hit).maul, a = (m.a * Math.PI) / 180;
    const face = [m.x + Math.cos(a) * 34 - Math.sin(a) * 13, m.y + Math.sin(a) * 34 + Math.cos(a) * 13];
    assert.ok(Math.abs(face[0] - x) < 12 && face[1] > 248, `maul face at ${face.map((v) => v.toFixed(0))} for the clod at ${x}`);
  }
  const left = frame(T - 0.8, T - 0.8).seeds.filter((s) => s.landed && s.o > 0.1);
  assert.ok(left.length <= 3, `${left.length} seeds left uncovered`);
});
