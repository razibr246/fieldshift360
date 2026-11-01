import { createHash } from 'node:crypto';
import { isHostedRuntime } from './runtime.js';

const unavailable = () => ({ ok: false, status: 503, error: 'rate limiter unavailable' });

function clientIp(req, env) {
  const headers = req.headers ?? {};
  const value = headers['x-vercel-forwarded-for'] ?? headers['x-real-ip'] ?? headers['x-forwarded-for'];
  const ip = String(value ?? '').split(',')[0].trim();
  if (ip && ip.length <= 100) return ip;
  // Non-production runs are local/test tooling. Vercel production must supply its trusted IP header.
  return isHostedRuntime(env) ? null : 'non-production';
}

export async function consumeRateLimit(req, { scope, limit, windowSeconds }, env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!/^[a-z0-9_-]{1,32}$/.test(scope ?? '') || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) return unavailable();
  if (!url || !token) return isHostedRuntime(env) ? unavailable() : { ok: true, remaining: limit };

  const ip = clientIp(req, env);
  if (!ip) return unavailable();
  const digest = createHash('sha256').update(ip).digest('hex').slice(0, 32);
  const key = `fs360:rate:${scope}:${digest}`;

  try {
    const command = async (...parts) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(parts),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error('rate store unavailable');
      return data.result;
    };

    const [rawCount, rawTtl] = await command(
      'EVAL',
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return {n, redis.call('TTL', KEYS[1])}",
      1,
      key,
      windowSeconds,
    );
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 1) return unavailable();
    if (count <= limit) return { ok: true, remaining: limit - count };
    const ttl = Number(rawTtl);
    return { ok: false, status: 429, retryAfter: Number.isFinite(ttl) && ttl > 0 ? ttl : windowSeconds, error: 'request limit reached' };
  } catch {
    // Fail closed: provider keys must not be used when abuse protection is unavailable.
    return unavailable();
  }
}

export async function rateLimitResponse(req, res, options) {
  const result = await consumeRateLimit(req, options);
  if (result.ok) return null;
  if (result.retryAfter) res.setHeader('Retry-After', String(result.retryAfter));
  return res.status(result.status).json({ error: result.error, ...(result.retryAfter ? { retry_after_seconds: result.retryAfter } : {}) });
}
