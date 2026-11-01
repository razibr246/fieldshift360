import test from 'node:test';
import assert from 'node:assert/strict';

const oldUrl = process.env.KV_REST_API_URL;
const oldToken = process.env.KV_REST_API_TOKEN;
process.env.KV_REST_API_URL = 'https://redis.invalid';
process.env.KV_REST_API_TOKEN = 'test-token';
const [{ default: plans }, { default: messages }, { default: abroad }] = await Promise.all([
  import('./plans.js?storage-test'),
  import('./messages.js?storage-test'),
  import('./abroad.js?storage-test'),
]);
if (oldUrl == null) delete process.env.KV_REST_API_URL;
else process.env.KV_REST_API_URL = oldUrl;
if (oldToken == null) delete process.env.KV_REST_API_TOKEN;
else process.env.KV_REST_API_TOKEN = oldToken;

function response() {
  return {
    code: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

for (const [name, handler, query] of [
  ['plans', plans, { season: '2027' }],
  ['messages', messages, {}],
  ['abroad', abroad, {}],
]) {
  test(`${name} handler rejects malformed JSON as a client error`, async () => {
    const res = response();
    await handler({ method: 'POST', query, body: '{broken' }, res);
    assert.equal(res.code, 400);
    assert.deepEqual(res.body, { error: 'bad json' });
  });
}
