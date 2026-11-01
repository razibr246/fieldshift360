import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeRateLimit, rateLimitResponse } from './rateLimit.js';

const env = { NODE_ENV: 'production', KV_REST_API_URL: 'https://redis.invalid', KV_REST_API_TOKEN: 'test-token' };
const request = { headers: { 'x-vercel-forwarded-for': '203.0.113.7' } };

test('fails closed when the durable rate-limit store is not configured', async () => {
  const result = await consumeRateLimit(request, { scope: 'doctor', limit: 12, windowSeconds: 3600 }, { NODE_ENV: 'production' });
  assert.deepEqual(result, { ok: false, status: 503, error: 'rate limiter unavailable' });
});

test('fails closed in a hosted preview even if NODE_ENV is not production', async () => {
  const result = await consumeRateLimit(request, { scope: 'doctor', limit: 12, windowSeconds: 3600 }, { NODE_ENV: 'development', VERCEL: '1' });
  assert.deepEqual(result, { ok: false, status: 503, error: 'rate limiter unavailable' });
});

test('atomically counts requests by a hashed Vercel client IP', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body);
    calls.push(command);
    return { ok: true, json: async () => ({ result: [1, 3600] }) };
  };
  try {
    const result = await consumeRateLimit(request, { scope: 'doctor', limit: 12, windowSeconds: 3600 }, env);
    assert.deepEqual(result, { ok: true, remaining: 11 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].slice(0, 1), ['EVAL']);
    assert.match(calls[0][3], /^fs360:rate:doctor:[a-f0-9]{32}$/);
    assert.match(calls[0][1], /redis\.call\('EXPIRE', KEYS\[1\], ARGV\[1\]\)/);
    assert.equal(calls[0][3].includes('203.0.113.7'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns a bounded retry delay when the request limit is reached', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body);
    return { ok: true, json: async () => ({ result: [13, 73] }) };
  };
  try {
    assert.deepEqual(
      await consumeRateLimit(request, { scope: 'doctor', limit: 12, windowSeconds: 3600 }, env),
      { ok: false, status: 429, retryAfter: 73, error: 'request limit reached' },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sets an HTTP retry delay when the server rejects an over-limit request', async () => {
  const previous = Object.fromEntries(['NODE_ENV', 'VERCEL', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'].map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, { NODE_ENV: 'production', VERCEL: '1', KV_REST_API_URL: env.KV_REST_API_URL, KV_REST_API_TOKEN: env.KV_REST_API_TOKEN });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ result: [13, 42] }) });
  const res = {
    code: 200, headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  try {
    await rateLimitResponse(request, res, { scope: 'doctor', limit: 12, windowSeconds: 3600 });
    assert.equal(res.code, 429);
    assert.equal(res.headers['Retry-After'], '42');
    assert.deepEqual(res.body, { error: 'request limit reached', retry_after_seconds: 42 });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    globalThis.fetch = originalFetch;
  }
});

test('fails closed if a deployed request has no trusted client IP', async () => {
  const result = await consumeRateLimit({ headers: {} }, { scope: 'agent', limit: 60, windowSeconds: 3600 }, env);
  assert.deepEqual(result, { ok: false, status: 503, error: 'rate limiter unavailable' });
});

test('uses a local-only bucket for Vite development requests without proxy headers', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const command = JSON.parse(options.body);
    assert.match(command[3], /^fs360:rate:tts:/);
    return { ok: true, json: async () => ({ result: [1, 3600] }) };
  };
  try {
    const result = await consumeRateLimit({ headers: {} }, { scope: 'tts', limit: 120, windowSeconds: 3600 }, { ...env, NODE_ENV: 'development' });
    assert.deepEqual(result, { ok: true, remaining: 119 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
