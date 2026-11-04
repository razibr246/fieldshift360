import test from 'node:test';
import assert from 'node:assert/strict';
import { runCrew, route, FARMER_CREW, SPOKEN_POINTS } from './crew.js';

const DAY = 86400000;
const today = Date.UTC(2026, 10, 4);
const crop = { id: 'mustard', bn: 'সরিষা', en: 'Mustard' };
const base = {
  farmer: { id: 'RAZIB', union: 'Chauhat', name: { bn: 'রাজিব', en: 'Razib' } }, today, officer: { bn: 'করিম', en: 'Karim' },
  water: { color: 'GREEN' }, weather: { rain7: 0, rainNext3: 0, tmax: 30 }, requests: [], unread: 0,
};

test('members read each other: dry soil with rain coming says wait, not water now', () => {
  const r = runCrew('farmer', { ...base, water: { color: 'RED' }, weather: { rainNext3: 30, tmax: 30 } });
  const keys = r.notes.map((n) => n.key);
  assert.ok(keys.includes('water-wait'));
  assert.ok(!keys.includes('water-now'));
  assert.equal(r.facts.rainSoon, true);
});

test('the market friend uses the weather watch: harvest before the rain', () => {
  const r = runCrew('farmer', { ...base, weather: { rainNext3: 25, tmax: 29 }, harvest: { daysTo: 3, glut: 'High', hold: { gain: 0.12 }, crop } });
  assert.equal(r.top[0].key, 'harvest-before-rain');
  assert.match(r.say.bn, /বৃষ্টির আগে/);
});

test('a question goes to the members it is about, and the weather watch still feeds them', () => {
  assert.deepEqual(route(FARMER_CREW, 'সরিষার দাম কেমন যাবে?').map((m) => m.id), ['market']);
  assert.equal(route(FARMER_CREW, '').length, FARMER_CREW.length);
  const r = runCrew('farmer', { ...base, weather: { rainNext3: 25, tmax: 29 }, harvest: { daysTo: 3, glut: 'Low', crop } }, { question: 'কবে বেচব? দাম কেমন?' });
  assert.deepEqual(r.members.map((m) => m.id), ['market']);
  assert.ok(r.trace.some((t) => t.member === 'weather' && !t.asked && t.notes === 0)); // ran for its facts, said nothing
  assert.ok(r.notes.every((n) => n.member === 'market'));
});

test('the spoken answer keeps to three points, most important first, in Bangla order words', () => {
  const r = runCrew('farmer', {
    ...base, water: { color: 'RED' }, weather: { rainNext3: 45, tmax: 36 }, unread: 2,
    requests: [{ id: 'R1', status: 'open', symptom: 'aphid', created: today - DAY }],
    harvest: { daysTo: 2, glut: 'High', crop }, plan: { crop, confirmed: false, daysToPlant: 4 },
  });
  assert.ok(r.notes.length > SPOKEN_POINTS);
  assert.equal(r.top.length, SPOKEN_POINTS);
  assert.ok(r.top[0].weight >= r.top[1].weight && r.top[1].weight >= r.top[2].weight);
  assert.match(r.say.bn, /^প্রথম কথা,.*এরপর,.*আর শেষে,/);
});

test('notes only point at চক্র এজেন্ট tasks; the crew itself carries no effects', () => {
  const tasks = [{ id: 'reply-A', kind: 'reply', risk: 'high', title: { bn: 'রহিমকে উত্তর', en: 'Reply to Rahim' }, effects: [{ type: 'addAdvisory' }] }];
  const r = runCrew('officer', { today }, { tasks });
  assert.equal(r.top[0].taskId, 'reply-A');
  assert.ok(r.notes.every((n) => !('effects' in n)));
});

test('a quiet day says so, and a member that fails is reported, not fatal', () => {
  assert.match(runCrew('farmer', base).say.bn, /চিন্তার কিছু/);
  const r = runCrew('farmer', { ...base, requests: null, plan: { get crop() { throw new Error('boom'); }, confirmed: false, daysToPlant: 2 } });
  assert.ok(r.trace.some((t) => t.member === 'planner' && t.error));
});
