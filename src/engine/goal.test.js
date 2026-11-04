import test from 'node:test';
import assert from 'node:assert/strict';
import { runGoal, understand, GOAL_BUDGET } from './goal.js';
import { gateFor, authorize } from './chakra.js';

const opt = (id, net, mm, safe, glut = 'Low', shift = 0) => ({ crop: { id, name: { bn: id, en: id } }, shift, money: { net }, water: { mm }, bt: { now: { safe, n: 13 } }, glut: { level: glut } });
const options = [opt('boro', 9000, 900, 12), opt('mustard', 12000, 150, 11), opt('tomato', 30000, 400, 6, 'High')];

test('the goal is understood from everyday Bangla', () => {
  assert.equal(understand('এবার বেশি লাভ চাই').id, 'income');
  assert.equal(understand('পানি কম লাগুক').id, 'water');
  assert.equal(understand('ঝুঁকি কম চাই').id, 'risk');
  assert.equal(understand('আজ বৃষ্টি হবে?'), null);
});

test('it finds the best option for the goal, judges its own answer, and asks before changing the plan', () => {
  const r = runGoal('বেশি লাভ চাই', { options, chosen: options[1], priorities: [] });
  assert.equal(r.best.crop.en, 'tomato');
  assert.equal(r.risky, true); // 6 of 13 seasons
  assert.equal(r.crowded, true);
  assert.deepEqual(r.proposal, { type: 'setPriority', id: 'income' });
  assert.match(r.say.bn, /সাবধান/);
  assert.equal(gateFor('farmer', 'agent', { effects: [r.proposal] }), 'confirm');
  assert.equal(authorize('farmer', r.proposal, { farmerId: 'RAZIB' }).ok, true);
  assert.equal(authorize('farmer', { type: 'setPriority', id: 'everything' }, { farmerId: 'RAZIB' }).ok, false);
});

test('when the plan already fits, it says so and proposes nothing', () => {
  const r = runGoal('কম পানি', { options, chosen: options[1], priorities: [] });
  assert.equal(r.best.crop.en, 'mustard');
  assert.equal(r.proposal, null);
  assert.match(r.say.en, /already the best/);
});

test('it stays within its step budget and reports when it has no figures', () => {
  const r = runGoal('বেশি লাভ চাই', { options, chosen: options[0] }, { budget: 3 });
  assert.equal(r.steps.length, 3);
  assert.ok(runGoal('বেশি লাভ চাই', { options }).steps.length <= GOAL_BUDGET);
  const none = runGoal('বেশি লাভ চাই', { options: [{ crop: { id: 'x' } }] });
  assert.equal(none.best, null);
  assert.equal(none.steps.at(-1).ok, false);
});
