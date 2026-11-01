import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBody } from './body.js';

test('parseBody accepts parsed objects and raw JSON', () => {
  const body = { plan: { crop: 'boro' } };
  assert.deepEqual(parseBody(body), { ok: true, value: body });
  assert.deepEqual(parseBody('{"ok":true}'), { ok: true, value: { ok: true } });
});

test('parseBody treats empty request bodies as empty objects', () => {
  assert.deepEqual(parseBody(undefined), { ok: true, value: {} });
  assert.deepEqual(parseBody(''), { ok: true, value: {} });
  assert.deepEqual(parseBody('null'), { ok: true, value: {} });
});

test('parseBody reports malformed JSON without throwing', () => {
  assert.deepEqual(parseBody('{broken'), { ok: false, value: null });
});
