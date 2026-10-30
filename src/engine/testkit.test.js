// The field-test kit records sessions honestly: nothing personal, the protocol's bar applied as written, and exports
// that match docs/USER_TESTING.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newSession, summarise, overview, toCsv, toMarkdownRows, TASKS, QUESTIONS } from './testkit.js';

const s1 = () => ({ ...newSession(Date.parse('2026-11-02')), place: 'Deopara, Godagari', woman: true, reading: 'some', phone: 'low',
  tasks: { field: { done: true, secs: 40 }, prio: { done: true, secs: 25 }, compare: { done: true, helped: true, secs: 120 }, officer: { done: true, secs: 30 } },
  answers: { q1: 'yes', q2: 'partly', q3: 'yes' }, notes: { q2: 'said "less water", missed weather' }, problems: 'small text on the compare table', rating: 4 });

test('a session is summarised by the protocol: tasks unaided, questions understood, pass when all three are at least partly', () => {
  const s = summarise(s1());
  assert.equal(s.done, 3, 'compare needed help');
  assert.equal(s.understood, 5);
  assert.equal(s.pass, true);
  assert.equal(summarise({ ...s1(), answers: { q1: 'yes', q2: 'no', q3: 'yes' } }).pass, false);
  assert.equal(summarise(newSession()).pass, false, 'a blank session never passes');
});

test('the overview counts people, passes, low literacy, low-end phones and women, and median times', () => {
  const o = overview([s1(), { ...s1(), woman: false, reading: 'reads', phone: 'smart', answers: { q1: 'no', q2: 'no', q3: 'no' } }]);
  assert.deepEqual([o.n, o.passed, o.lowLiteracy, o.lowPhone, o.women], [2, 1, 1, 1, 1]);
  assert.equal(o.byQuestion.q1, 0.5);
  assert.equal(o.medianSecs.compare, 120);
});

test('exports: a CSV with one row per session and rows for docs/USER_TESTING.md, with no names anywhere', () => {
  const csv = toCsv([s1()]).split('\n');
  assert.equal(csv.length, 2);
  assert.equal(csv[0].split(',').length, 7 + TASKS.length * 3 + QUESTIONS.length * 2 + 2);
  assert.match(csv[1], /"said ""less water"", missed weather"/, 'quotes are escaped');
  const md = toMarkdownRows([s1()]);
  assert.match(md, /^\| 2026-11-02 \| Deopara, Godagari \| farmer, woman, reads a little Bangla \| low-end Android \| yes \|/);
  assert.equal(md.split('|').length - 2, 9, 'nine columns, as in the results table');
  assert.ok(!('name' in newSession()) && !('phoneNumber' in newSession()));
});
