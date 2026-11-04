import test from 'node:test';
import assert from 'node:assert/strict';
import { walk, cases, checkBackTasks, PROBLEM_PATH, CHECK_BACK_DAYS } from './path.js';
import { authorize, gateFor } from './chakra.js';

const DAY = 86400000;
const today = Date.UTC(2026, 10, 4);
const farmer = { id: 'RAZIB', union: 'Chauhat', name: { bn: 'রাজিব', en: 'Razib' } };
const req = (over) => ({ id: 'R1', farmerId: 'RAZIB', union: 'Chauhat', crop: 'mustard', symptom: 'aphid', created: today - 6 * DAY, status: 'open', ai: [{ k: 'aphid', p: 0.6 }], ...over });

test('a new report waits for the officer, with the first look on its trail', () => {
  const [c] = cases([req()], { today });
  assert.deepEqual(c.trail.map((t) => t.node), ['reported', 'first_look']);
  assert.equal(c.waiting.who, 'officer');
  assert.equal(c.done, false);
});

test('without a photo the first look is passed by, not invented', () => {
  const [c] = cases([req({ ai: null })], { today });
  assert.deepEqual(c.trail.map((t) => t.node), ['reported']);
  assert.equal(c.waiting.node, 'officer');
});

test('after the answer the case waits for the farmer, and asks only once the check-back day has come', () => {
  const early = cases([req({ status: 'answered' })], { today, advisories: [{ request: 'R1', at: today - DAY }] });
  assert.equal(early[0].waiting.node, 'check_back');
  assert.equal(checkBackTasks(early, { farmer, today }).length, 0);
  const due = cases([req({ status: 'answered' })], { today, advisories: [{ request: 'R1', at: today - CHECK_BACK_DAYS * DAY }] });
  const t = checkBackTasks(due, { farmer, today });
  assert.deepEqual(t.map((x) => x.effects[0].type), ['closeRequest', 'followUp']);
});

test('"solved" is always the farmer\'s own yes, and only for their own request', () => {
  const close = { effects: [{ type: 'closeRequest', id: 'R1' }] };
  assert.equal(gateFor('farmer', 'agent', close), 'confirm'); // even in agent mode
  const scope = { farmerId: 'RAZIB', requestOf: (id) => (id === 'R1' ? req() : { ...req(), id, farmerId: 'KARIM' }) };
  assert.equal(authorize('farmer', { type: 'closeRequest', id: 'R1' }, scope).ok, true);
  assert.equal(authorize('farmer', { type: 'closeRequest', id: 'R9' }, scope).ok, false);
  assert.equal(authorize('officer', { type: 'closeRequest', id: 'R1' }, { unions: ['Chauhat'] }).ok, false);
});

test('a solved case ends; more photos wait for the farmer; a raise to the upazila shows on the trail', () => {
  const solved = cases([req({ status: 'resolved', resolvedAt: today })], { today, advisories: [{ request: 'R1', at: today - 2 * DAY }] })[0];
  assert.equal(solved.done, true);
  assert.equal(solved.at, 'solved');
  const info = cases([req({ status: 'need_info' })], { today, advisories: [{ request: 'R1', at: today - DAY }] })[0];
  assert.equal(info.waiting.node, 'more_info');
  const raised = cases([req()], { today, escalations: [{ id: 'REQ-R1', at: today - DAY }] })[0];
  assert.match(raised.waiting.ask.en, /raised to the upazila/);
});

test('the runner stops on a missing step or a loop instead of hanging', () => {
  assert.ok(walk({ start: 'x', nodes: {} }, {}).error);
  const loop = { start: 'a', nodes: { a: { kind: 'step', passed: () => 1, next: () => 'a' } } };
  assert.equal(walk(loop, {}, 5).error, 'path too long');
  assert.equal(PROBLEM_PATH.nodes.check_back.who, 'farmer');
});
